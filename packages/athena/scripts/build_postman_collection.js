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
*/
//------------------------------------------------------------
// build_postman_collection.js - Edit the master postman collection and write to file
//------------------------------------------------------------
const tools = {
	fs: require('fs'),
	url: require('url'),
};
tools.misc = require('../libs/misc.js')(console, tools);
tools.ot_misc = require('../libs/ot_misc.js')(console, tools);

// ---------------------------------------------
// set these values before running script
/*
const options = {
	input_collection_file: '../json_docs/OpTools.original.postman_collection.json',
	auth_type: 'basic',
	debug: true,
	username: 'test',				// basic auth username to use in all routes
	password: '1234',				// basic auth password to use in all routes
	url: 'https://ibm.com:3000'		// the url to use for all routes, include proto, hostname and port
};
*/
const options = {
	input_collection_file: '../json_docs/OpTools.original.postman_collection.json',
	auth_type: 'bearer',
	debug: true,
	token: 'bearer.token.here',		// bearer aka access token to use in all routes
	url: 'https://ibm.com:3000'		// the url to use for all routes, include proto, hostname and port
};
/*
const options = {
	input_collection_file: '../json_docs/OpTools.original.postman_collection.json',
	auth_type: 'api_key',
	debug: true,
	api_key: 'test1234',			// api key to use in all routes
	url: 'https://ibm.com:3000'		// the url to use for all routes, include proto, hostname and port
};
*/
// ---------------------------------------------

const collection = tools.ot_misc.build_postman_collection(options);
tools.fs.writeFileSync('../json_docs/OpTools.postman.collection.' + options.auth_type + '.json', JSON.stringify(collection, null, 2));

console.log('fin.');
