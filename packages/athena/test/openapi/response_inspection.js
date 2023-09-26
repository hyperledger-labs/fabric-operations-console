/*
 * Copyright contributors to the Hyperledger Fabric Operations Console project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/
//=======================================================================================================
// Checks if the fields from an actual response are documented correctly in our openapi file
//=======================================================================================================
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
let errors = 0;
let successes = [];

// ------- Run ------- //
const responses_file = require('./real_responses.json');
const swagger_file = load_swagger_path(path.join(__dirname, '../../json_docs/json_validation/ibp_openapi_v3.yaml'));
const swagger = parse_to_json(swagger_file);
const flat_swagger = flatten_swagger_json(swagger);				// resolve all the refs for simpler code
parse_api_responses(flat_swagger.paths);

if (errors > 0) {												// summary
	console.log(':( - there are field type errors.\terrors:', errors);
	console.log('\t\t\t\t\tsuccesses:', successes.length);
	process.exit(1);
} else {
	console.log(':) - there are no field type errors.\terrors:', errors);
	console.log('\t\t\t\t\tsuccesses:', successes.length);
	process.exit(0);
}

//=======================================================================================================
// Helper functions
//=======================================================================================================
// recurse over the swagger file
/*
  swagger_paths['/ak/api/v3/components/{id}']['GET'].responses['200'] = {
	// object here
  }
*/
function parse_api_responses(swagger_paths) {
	for (let route in swagger_paths) {
		for (let method in swagger_paths[route]) {
			for (let status_code in swagger_paths[route][method].responses) {
				const doc_response = swagger_paths[route][method].responses[status_code];
				const opId = format_name(swagger_paths[route][method].operationId);
				//console.log('working', method, route, '(' + opId + ')', status_code);

				const actual_response = find_response(responses_file, opId, status_code);
				if (actual_response) {
					const found_errors = inspect_response(actual_response, doc_response, 0);
					if (found_errors.length > 0) {
						console.log('type errors in "' + method, route + '" (' + opId + ') -', status_code);
						console.log('  ', found_errors);
					} else {
						successes.push(opId + ':' + status_code);
					}
					errors += found_errors.length;
				}
			}
		}
	}
}

// load file
function load_swagger_path(swagger_file_path) {
	try {
		return fs.readFileSync(swagger_file_path, 'utf8');
	} catch (e) {
		console.error('unable to load file from path. e:', e);
		return null;
	}
}

// parse yaml to object
function parse_to_json(thing) {
	if (typeof thing === 'object') {
		return thing;
	} else {
		try {
			return yaml.load(thing);
		} catch (e) {
			console.error('unable to convert yaml to json. e:', e);
		}
	}
	return null;
}

// flatten the swagger json
function flatten_swagger_json(obj) {
	const temp = {
		paths: {},
		version: '-'
	};
	if (obj) {
		temp.version = obj.info ? obj.info.version : '-';							// copy version
		for (let route in obj.paths) {
			for (let method in obj.paths[route]) {
				for (let status_code in obj.paths[route][method].responses) {
					const lc_route = route ? route.toLowerCase() : null;
					const lc_method = method ? method.toLowerCase() : null;
					if (!temp.paths[lc_route]) { temp.paths[lc_route] = {}; }		// init
					if (!temp.paths[lc_route][lc_method]) {
						temp.paths[lc_route][lc_method] = {							// init
							responses: {},
							operationId: obj.paths[route][method].operationId
						};
					}
					temp.paths[lc_route][lc_method].responses[status_code] = {};	// init

					// grab/build response validation format
					if (obj.paths[route][method].responses[status_code].content) {
						if (obj.paths[route][method].responses[status_code].content['application/json']) {
							const ref = obj.paths[route][method].responses[status_code].content['application/json'].schema.$ref;
							if (ref) {											// if using reference schema syntax, dereference first
								temp.paths[lc_route][lc_method].responses[status_code] = resolve_ref(ref, obj);
							} else {
								temp.paths[lc_route][lc_method].responses[status_code] =
									obj.paths[route][method].responses[status_code].content['application/json'].schema;
							}
							flatten_obj(temp.paths[lc_route][lc_method].responses[status_code], obj, 0);
						}
					}
				}
			}
		}
	}
	return temp;
}

// flatten a swagger object - "obj" is the full swagger yaml as a json object
function flatten_obj(thing, obj, depth) {
	if (depth >= 256) {
		console.error('[validate] parsing swagger has gone too deep... giving up');
		return null;
	}

	if (thing.type === 'object') {
		for (let prop in thing.properties) {
			if (thing.properties[prop].$ref) {
				thing.properties[prop] = resolve_ref(thing.properties[prop].$ref, obj);
			}
			flatten_obj(thing.properties[prop], obj, ++depth);
		}
	} else if (thing.type === 'array') {
		if (thing.items.$ref) {
			const item = resolve_ref(thing.items.$ref, obj);
			flatten_obj(item, obj, ++depth);
			thing.items = item;
		}
		if (thing.items.type === 'object') {
			flatten_obj(thing.items, obj, ++depth);
		}
	}
}

// resolve a swagger reference
function resolve_ref(ref, obj) {
	if (ref[0] === '#') {
		ref = ref.substring(2);
	}
	const parts = ref.split('/');			// path to the ref is here, as an array

	let prev = JSON.parse(JSON.stringify(obj));
	let key = null;
	for (let i in parts) {					// walk the path to this ref
		key = parts[i];
		if (prev[key]) {
			prev = prev[key];				// keep changing "prev" to let us walk the path
		}
	}

	if (prev.type || prev.name) {			// we found where the ref ends (parameters have "name" at this level, not "type")
		return prev;
	} else {
		return null;						// we did not find it
	}
}

// convert create_ca -> createCa
function format_name(str) {
	if (!str) {
		return str;
	} else {
		let parts = str.split('_');
		let ret = [];
		for (let i in parts) {
			if (i > 0) {					// don't camel case the first first one
				ret.push(parts[i][0].toUpperCase() + parts[i].substring(1));
			} else {
				ret.push(parts[i]);
			}
		}
		return ret.join('');
	}
}

// find a real responses for this api response code
function find_response(responses, op_id, status_code) {
	if (responses) {
		for (let i in responses.apis) {
			const resp = responses.apis[i];

			// don't check for exact name match b/c I append notes... so "listComponents-with-dep" should match "listComponents"
			if (resp.name.includes(op_id) && Number(resp.response.status) === Number(status_code) && resp.response.result) {
				//console.log('  - found');
				return resp.response.result;
			}
		}
	}
	return null;
}

// check if the fields in the actual response are documented correctly - recursive!
function inspect_response(actual_response, doc_response, depth) {
	let errors = [];

	if (depth >= 100) {
		console.log('too many iterations', depth);
		return errors;
	}

	// check the root key first
	const root_error = key_type_error(null, actual_response, doc_response);
	if (root_error) {
		return [root_error];
	}

	// iter of root's keys or elements
	for (let key in actual_response) {					// iter over an object keys, or elements in an array
		const value = actual_response[key];
		let root_field_errs = null;
		//console.error('on key', key, 'value:', typeof value, doc_response.type);

		if (doc_response.type === 'object') {			// if we are itering over an object, check each key's value type
			if (doc_response.properties) {				// if "properties" isn't defined you can't check, skip it
				root_field_errs = key_type_error(key, value, doc_response.properties[key]);
			}
		} else if (doc_response.type === 'array') {		// if we are itering over an array, check each elements type
			root_field_errs = key_type_error(key, value, doc_response.items);
		} else {
			console.error('what is this?', key, value, doc_response.type);
			process.exit();
		}

		if (root_field_errs) {
			errors.push(root_field_errs);				// add the errors we found in these root fields
		}

		// recursive on objects! (not doing arrays of arrays, don't think we have any of those)
		if (typeof value === 'object' && doc_response.properties && doc_response.properties[key]) {
			let nested_errs = [];

			if (Array.isArray(actual_response) && doc_response.properties[key].type === 'array') {
				nested_errs = inspect_response(value, doc_response.properties[key].items, ++depth);
			} else {
				nested_errs = inspect_response(value, doc_response.properties[key], ++depth);
			}

			if (nested_errs.length > 0) {
				errors = errors.concat(nested_errs);
			}
		}
	}
	return errors;
}

// return true if the key is the wrong type
function key_type_error(key, value, doc_key) {
	if (!doc_key) {
		return null;							// this is okay, response has undocumented field
	} else if (value.constructor.name.toLowerCase() === doc_key.type) {
		return null;
	} else {
		return { key: key, value: value, value_type: value.constructor.name.toLowerCase(), docs_value_type: doc_key.type };
	}
}
