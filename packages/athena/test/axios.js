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
//------------------------------------------------------------
// axios.js - test runner for manually testing axios, our request module replacement
//------------------------------------------------------------
const tools = {										// stateless util libs should go here, ~8% faster startup
	express: require('express'),
	url: require('url'),
	fs: require('fs'),
	path: require('path'),
	async: require('async'),
	crypto: require('crypto'),
	uuidv4: require('uuid/v4'),
	yaml: require('js-yaml'),
	os: require('os'),
	NodeCache: require('node-cache'),
	winston: require('winston'),
	selfsigned: require('selfsigned'),
	zlib: require('zlib'),
	axios: require('axios'),
};

let logger = {
	info: console.log,
	log: console.log,
	debug: console.log,
	silly: console.log,
	warn: console.log,
	error: console.error,
	TypeError: console.log
};
//tools.request = require('request');
tools.request = require('../libs/request_axios.js')(tools.axios);
tools.root_misc = require('../libs/root_misc.js')(logger);
tools.misc = require('../libs/misc.js')(logger, tools);
tools.ot_misc = require('../libs/ot_misc.js')(logger, tools);

const opts = {
	method: 'GET',
	uri: 'http://localhost:3000/api/v3/settings',
	body: { 'this': 'should remain' },
};
tools.misc.retry_req(opts, (err, resp) => {
	console.log('returned to code');
	let response = resp ? resp.body : null;
	let code = tools.ot_misc.get_code(resp);
	console.log('body after:', opts.body);

	if (err) {
		console.log('comm error', err);
		console.log('testing err msg', err.toString());
		console.log('comm err\'s response', resp);
	} else if (!resp) {
		console.log('no response');
	} else if (tools.ot_misc.is_error_code(code)) {
		console.log('have response, error code', typeof response, response);
	} else {
		console.log('have response, good code', typeof response);
		//console.log('resp.headers', resp.headers);
	}
});
