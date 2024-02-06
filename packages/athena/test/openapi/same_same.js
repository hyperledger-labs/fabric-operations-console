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
// Fields with the same description should be looked at to see if they can be combined. Find all of these leafs.
//=======================================================================================================
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
let duplicate_descriptions = 0;
let duplicate_refs = 0;
let seen_fields = {};
let seen_refs = {};

// ------- Run ------- //
const swagger_file = load_swagger_path(path.join(__dirname, '../../json_docs/json_validation/ibp_openapi_v3.yaml'));
const swagger = parse_to_json(swagger_file);

recurse_swagger(swagger.components.schemas, '', 0);				// test schema objects
recurse_swagger2(swagger.components.schemas, null, '', 0);		// test schema objects


if (duplicate_descriptions > 0) {								// summary
	console.log(':( - there are duplicate descriptions', duplicate_descriptions);
	process.exit(1);
} else {
	console.log(':) - there are no duplicate descriptions');
}

if (duplicate_refs > 0) {										// summary
	console.log(':( - there are duplicate refs', duplicate_refs);
	process.exit(1);
} else {
	console.log(':) - there are no duplicate refs');
}


//=======================================================================================================
// Helper functions
//=======================================================================================================
// recurse over the swagger file
function recurse_swagger(thing, path, depth) {
	if (depth > 100) {
		console.error('too deep, stopping', depth);
		return;
	}

	for (let field_name in thing) {
		const field = thing[field_name];
		if (field && field.description) {
			//console.log('found leaf field', field_name);
			same_same(field_name, field.description, path + '.' + field_name);
		} else if (field.items && field.items.description) {
			//console.log('found arr leaf field', field_name);
			same_same(field_name, field.items.description, path);
		} else if (field.properties) {
			recurse_swagger(field.properties, path + '.' + field_name, ++depth);
		}
	}
}

// see if this field is a duplicate
function same_same(field_name, description, path) {
	const hash = /*field_name +*/ description;
	path = path.substring(1);								// remove leading period
	if (seen_fields[hash]) {
		console.log('found potential duplicate field: "' + field_name + '"');
		console.log('\t1:', seen_fields[hash], '2:', path);
		duplicate_descriptions++;
	} else {
		seen_fields[hash] = path;
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

// recurse over the swagger file
// find if the same field name (ignore case) is pointing to a different reference
function recurse_swagger2(thing, path, depth) {
	if (depth > 200) {
		console.error('too deep, stopping', depth);
		return;
	}

	for (let key in thing) {
		const field = thing[key];
		if (field && field.$ref) {
			check_ref(key, field.$ref);
		} else if (field && field.properties) {
			recurse_swagger2(field.properties, path + '.' + key, ++depth);
		}
	}
}

// see if this field is a duplicate
function check_ref(field_name, ref) {
	const ignore_fields = [
		'ca', 'tlsca', 'peer', 'orderer', 'name', 'apiurl', 'operationsurl', 'grpcwpurl', 'id', 'server', 'client', 'crypto', 'proxy',
		'version', 'configoverride', 'keepalive', 'certfile', 'debug', 'metrics', 'keyfile', 'displayname', 'authentication', 'statedb',
		'orderers2sign', 'orgs2sign', 'limits', 'requests', 'timestamp', 'nodeou', 'general', 'msp', 'rootcerts', 'component', 'level'
	];
	const lc_field_name = field_name.toLowerCase().replace(/_/g, '');	// remove underscores and bring to lowercase to create a broader comparison

	if (!ignore_fields.includes(lc_field_name)) {
		if (seen_refs[lc_field_name] && seen_refs[lc_field_name] !== ref) {
			console.log('found potential duplicate ref: "' + field_name + '"');
			duplicate_refs++;
		} else {
			seen_refs[lc_field_name] = ref;
		}
	}
}
