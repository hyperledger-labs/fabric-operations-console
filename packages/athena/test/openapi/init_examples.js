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
// Build JSON "examples" snippets for each API response (from the response definition data)
// - it does not rebuild existing "examples" (manually delete them to rebuild)
// - How:
//   - this script copies the `example` field defined in each response field to build the JSON example
//   - this script is pretty fragile and only meant to work on our yaml (the yaml must uses spaces and use 2 spaces per indent)
// - run with `npm run build_response_ex`
//=======================================================================================================
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
let missing_examples = 0;
let built_examples = 0;

// ------- Run ------- //
const path2openapi = path.join(__dirname, '../../json_docs/json_validation/ibp_openapi_v3.yaml');
let swagger_txt = load_swagger_path(path2openapi);
const swagger = parse_to_json(swagger_txt);

parse_swagger(swagger, '', 0);						// test schema objects

console.log('built new examples:', built_examples);
if (missing_examples > 0) {							// print summary
	console.log(':( - there are missing response examples', missing_examples);
} else {
	console.log(':) - there are no missing response examples', missing_examples);
}

//=======================================================================================================
// Helper functions
//=======================================================================================================
// parse the swagger file for a response
function parse_swagger(openapi_obj, path, depth) {
	if (depth > 100) {
		console.error('[error] too deep, stopping', depth);
		return;
	}
	const refs_to_replace = {};
	const all_paths = openapi_obj.paths;

	for (let path in all_paths) {
		for (let method in all_paths[path]) {
			if (all_paths[path][method].responses) {
				for (let code in all_paths[path][method].responses) {
					if (code >= 200 && code <= 209) {
						//console.log('[api] on', method, path, code);

						let found = has_ref(all_paths[path][method].responses[code].content);
						if (!found) {
							console.error('\t a reference was not used for this api response.');
						} else {
							const ref = all_paths[path][method].responses[code].content['application/json'].schema.$ref;
							//console.log('\tref', all_paths[path][method].responses[code].content['application/json'].schema.$ref);

							const resolved = resolve_ref(ref, swagger);		// resolve the initial reference to make it easier to parse
							flatten_obj(resolved, swagger, 0);				// flatten all references to make it easier to parse

							if (!all_paths[path][method].responses[code].content['application/json'].examples) { // if we don't have an example yet, build one
								const example = build_example(resolved, '', 0);
								refs_to_replace[ref] = example;				// store this example, will replace all occurrences later
								built_examples++;
							}
						}
					}
				}
			}
		}
	}

	// edit the response references with the example responses
	for (let ref in refs_to_replace) {
		swagger_txt = edit_swagger(ref, refs_to_replace[ref], swagger_txt);
	}
	fs.writeFileSync(path2openapi, swagger_txt);						// write new swagger file
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

// flatten a swagger object - "obj" is the full swagger yaml as a json object
function flatten_obj(thing, obj, depth) {
	if (depth >= 256) {
		console.error('[validate] parsing swagger has gone too deep 1... giving up');
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
function resolve_ref(ref, swagger) {
	if (ref[0] === '#') {
		ref = ref.substring(2);
	}
	const parts = ref.split('/');				// path to the ref is here, as an array

	let prev = JSON.parse(JSON.stringify(swagger));
	let key = null;
	for (let i in parts) {						// walk the path to this ref
		key = parts[i];
		if (prev[key]) {
			prev = prev[key];					// keep changing "prev" to let us walk the path
		}
	}

	if (prev.type || prev.name) {				// we found where the ref ends (parameters have "name" at this level, not "type")
		return prev;
	} else {
		return null;							// we did not find it
	}
}

// build a response example by walking the swagger object
function build_example(thing, field_name, depth) {
	if (depth >= 256) {
		console.error('[validate] parsing swagger has gone too deep 2... giving up');
		return null;
	}
	let ret = null;

	if (thing.type === 'object') {
		ret = {};
		for (let prop in thing.properties) {
			if (thing.properties[prop].$ref) {
				thing.properties[prop] = resolve_ref(thing.properties[prop].$ref, swagger);
			}
			ret[prop] = build_example(thing.properties[prop], prop, ++depth);
		}
	} else if (thing.type === 'array') {
		if (thing.items.$ref) {
			thing.items = resolve_ref(thing.items.$ref, swagger);
		}
		ret = [build_example(thing.items, field_name, ++depth)];
	} else {
		if (typeof thing.example === 'undefined') {
			console.error('! missing example', field_name, thing);
			missing_examples++;
		} else {
			ret = thing.example;
		}
	}

	return ret;
}

// edit the swagger file for all occurrences of  the ref
function edit_swagger(ref, example, openapi_txt) {
	const find_ref = 'schema:\n                \\$ref: \'' + ref + '\'';	// this kind of sucks but it works, fragile
	const replace_ref = 'schema:\n                $ref: \'' + ref + '\'';
	let example_yaml = '';

	try {
		example_yaml = yaml.dump({
			examples: {
				response: {
					value: example
				}
			}
		});
	} catch (e) {
		console.error('[error] unable to convert yaml to json. e:', ref, e);
		process.exit();
	}

	const regex = new RegExp(find_ref, 'g');	// use global flag to replace all examples
	return openapi_txt.replace(regex, replace_ref + '\n' + add_white_space(example_yaml, 14));	// it is always 14 spaces to indent a response example
}

// add white space to indent the "examples" field over enough
function add_white_space(text, spaces) {
	if (text) {
		const parts = text.split('\n');				// split on new lines
		let ws = '';
		for (; ws.length < spaces;) {				// build the white space characters
			ws += ' ';
		}
		for (let i in parts) {
			parts[i] = ws + parts[i];				// add white space characters to each line
		}
		parts.splice(parts.length - 1);				// remove the last empty line
		return parts.join('\n');
	}
}

// figure out if this api response has a $ref right away or not
function has_ref(content) {
	let found = false;
	if (content['application/json'] && content['application/json'].schema) {
		if (content['application/json'].schema.$ref) {
			found = true;
		}
	}
	return found;
}
