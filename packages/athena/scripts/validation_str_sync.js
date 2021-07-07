/*
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
*///------------------------------------------------------------
// validation_str_sync.js - Simple script to copy changes from ibp_openapi_v3.yaml to the english messages.json used by apollo
//------------------------------------------------------------
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

// load the files
const PATH_TO_APOLLO_MSGS = path.join(__dirname, '../apollo/src/assets/i18n/en/messages.json');
const ibp_json = load_swagger_path(path.join(__dirname, '../json_docs/json_validation/ibp_openapi_v3.yaml'));
console.log('loaded swagger:', typeof ibp_json, ibp_json.info.version);

const ibp_messages_json = require(PATH_TO_APOLLO_MSGS);
console.log('loaded messages:', typeof ibp_messages_json);

// edit the apollo english messages
for (let error_name in ibp_json['x-validate_error_messages']) {
	console.log('working error message:', error_name);
	const apollo_msg_name = 'in_val_' + error_name;
	ibp_messages_json[apollo_msg_name] = build_apollo_fmt(ibp_json['x-validate_error_messages'][error_name]);
}

// write the new apollo file
fs.writeFileSync(PATH_TO_APOLLO_MSGS, JSON.stringify(ibp_messages_json, null, '\t'));
console.log('FIN.');



// load ibp's swagger file
function load_swagger_path(swagger_file_path) {
	try {
		return parse_to_json(fs.readFileSync(swagger_file_path, 'utf8'));
	} catch (e) {
		console.error('unable to load swagger file from path. e:', e);
		return null;
	}
}

// parse yaml to json
function parse_to_json(thing) {
	try {
		return yaml.safeLoad(thing);
	} catch (e) {
		console.error('unable to convert swagger yaml to json. e:', e);
	}
}

// edit the error message format to one the translation team likes
function build_apollo_fmt(err_msg) {
	const matches = err_msg.match(/\$\w+/g);
	for (let i in matches) {
		const orig = matches[i];
		const apollo_fmt = '${' + matches[i].substring(1).toLowerCase() + '}';
		err_msg = err_msg.replace(orig, apollo_fmt);
	}
	//console.log('formatted msg:', err_msg);
	return err_msg;
}
