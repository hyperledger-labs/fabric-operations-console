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
// Find unused swagger file objects - does not edit file, just logs unused names to console
//
// this script is far from optimal:
// - in the case of nested unused references, it will only flag the parent. after removing the parent, rerun to catch unused children.
// - the line number that gets logged is an estimate, it might find a false positive.
//=======================================================================================================
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
let errors = 0;

// ------- Run ------- //
const swagger_file = load_swagger_path(path.join(__dirname, '../../json_docs/json_validation/ibp_openapi_v3.yaml'));
const swagger = parse_to_json(swagger_file);

for (let ref_name in swagger.components.schemas) {					// test schema objects
	ref_exist(ref_name, 'schemas', swagger_file);
}

for (let ref_name in swagger.components.parameters) {				// test parameter objects
	ref_exist(ref_name, 'parameters', swagger_file);
}

if (errors > 0) {													// summary
	console.log(':( - there are unused swagger references ^^', errors);
	process.exit(1);
} else {
	console.log(':) - there are no unused swagger references');
	process.exit(0);
}


//=======================================================================================================
// Helper functions
//=======================================================================================================

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

// return true if the reference is in use anywhere
function ref_exist(ref_name, type, swagger_txt) {
	const name = '#/components/' + type + '/' + ref_name; // openapi v3 spec will use this format
	if (swagger_txt.indexOf(name) >= 0) {
		return true;
	} else {
		console.warn('did not find use for ref: "' + name + '"\tline:', find_line_number_of_str(ref_name, swagger_txt));
		errors++;
		return false;
	}
}

// find the line number for the string - [not guaranteed to find the right line]
function find_line_number_of_str(str, text) {
	const str_pos = text.lastIndexOf(str + ':');	// add the colon to eliminate some false positive hits
	if (str_pos >= 0) {
		const text_above = text.substring(0, str_pos);
		const matches = text_above.match(/\n/g);	// return the count of new lines ahead of our line
		return matches.length + 1;
	}
	return -1;
}
