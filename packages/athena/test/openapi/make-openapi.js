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
// Rebuilds the OpenAPI file but removes any API with a `x-hidden: true` attribute
// - creates a new file
// - the point of this is to create a swagger file that will have less confusing stuff in it for the user (publish the file this script makes)
//=======================================================================================================
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
let removed = 0;
const path2openapi = path.join(__dirname, '../../json_docs/json_validation/ibp_openapi_v3.yaml');
const path2openapi_new = path.join(__dirname, '../../json_docs/json_validation/ibp_openapi_v3.publish.yaml');

// ------- Run ------- //
console.log('removing hidden apis...');
let swagger_txt = load_swagger_path(path2openapi);
const swagger = parse_to_json(swagger_txt);

parse_swagger(swagger, '', 0);						// test schema objects
console.log('removed hidden apis:', removed);

//=======================================================================================================
// Helper functions
//=======================================================================================================
// parse the swagger file for a response
function parse_swagger(openapi_obj, path, depth) {
	if (depth > 100) {
		console.error('[error] too deep, stopping', depth);
		return;
	}
	const all_paths = openapi_obj.paths;

	for (let path in all_paths) {
		for (let method in all_paths[path]) {
			if (all_paths[path][method]['x-hidden'] === true) {
				console.log('removed api:', method, path);
				delete all_paths[path][method];
				removed++;
			}
		}
	}

	// remove orphaned paths (they have no methods)
	for (let path in all_paths) {
		const keys = Object.keys(all_paths[path]);
		if (!keys || keys.length === 0) {
			delete all_paths[path];
		}
	}

	const swagger_txt2 = parse_to_yaml(openapi_obj);
	fs.writeFileSync(path2openapi_new, swagger_txt2);						// write new swagger file
	console.log('wrote file:', path2openapi_new);
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

// parse yaml to object
function parse_to_yaml(thing) {
	try {
		return yaml.dump(thing, { indent: 2 });
	} catch (e) {
		console.error('unable to convert json to yaml. e:', e);
		return null;
	}
}
