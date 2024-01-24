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
// request_axios.js - conforms to the request.js API, but uses axios under the covers
// - this was needed because request.js is no longer maintained and has a few CVEs, but i didn't want to rewrite all the code where we use request.js.
// - the idea is this is a direct replacement, warts and all.
//------------------------------------------------------------
module.exports = function (axios) {
	const ARRAY_BUFFER_TYPE = 'arraybuffer';	// axios types: 'arraybuffer', 'document', 'json', 'text', 'stream'
	const TEXT_TYPE = 'text';					// axios types: 'arraybuffer', 'document', 'json', 'text', 'stream'
	const https = require('https');

	return async (options, cb) => {
		// ----------------------------------------------------------
		// convert axios input arguments to request module input arguments
		// ----------------------------------------------------------
		let agentOptions = {};

		// convert `body` -> `data`
		if (options && options.body) {
			options.data = options.body;
		}

		// convert `uri` -> `url`
		if (options && options.uri) {
			options.url = options.uri;
		}

		// merge `baseUrl` with `url`, axios doesn't play nice otherwise
		if (options && options.baseUrl && options.url) {
			options.url = options.baseUrl + options.url;
			delete options.baseUrl;
		}

		// the request module did not auto format/parse JSON responses to objects, so we will leave them as text/strings too
		if (options) {
			options.responseType = TEXT_TYPE;
		}

		// let grpc responses remain binary
		if (options && options.json === false) {
			options.responseType = ARRAY_BUFFER_TYPE;
		}

		//------------------------------------------------------------
		// convert request style tls options to axios style
		//------------------------------------------------------------
		if (typeof options.rejectUnauthorized === 'boolean') {
			agentOptions.rejectUnauthorized = options.rejectUnauthorized;
		}
		if (typeof options.requestCert === 'boolean') {
			agentOptions.requestCert = options.requestCert;
		}
		if (typeof options.cert === 'string') {
			agentOptions.cert = options.cert;
		}
		if (typeof options.key === 'string') {
			agentOptions.key = options.key;
		}
		if (typeof options.ca === 'string') {
			agentOptions.ca = options.ca;
		}
		if (typeof options.keepAlive === 'boolean') {
			agentOptions.keepAlive = options.keepAlive;
		}
		if (typeof options.pfx === 'string') {
			agentOptions.pfx = options.pfx;
		}
		if (typeof options.passphrase === 'string') {
			agentOptions.passphrase = options.passphrase;
		}
		if (typeof options.secureOptions === 'number') {
			agentOptions.secureOptions = options.secureOptions;
		}
		if (Object.keys(agentOptions).length > 0) {					// if we need a https agent, make one
			options.httpsAgent = new https.Agent(agentOptions);
		}


		// -------------------------------------------------------------------------------------------
		// send it
		// -------------------------------------------------------------------------------------------
		let resp = null;
		let comm_e = null;
		try {
			resp = await axios.request(options);
		}

		// ----------------------------------------------------------
		// convert axios *error* response format to "request" module *error* format
		// ----------------------------------------------------------
		catch (error) {
			delete error.config;
			delete error.request;
			delete error.cause;
			delete error.stack;										// request never gave us a stack trace, so none here too

			for (let key in error) {
				if (typeof error[key] === 'function') {				// remove the bloat they add to the error obj
					delete error[key];
				}
			}

			comm_e = error;

			if (error && error.response) {
				comm_e = null;										// if there is a response, don't send back a comm err obj
				resp = {
					statusCode: error.response.status,
					headers: error.response.headers,
					statusText: error.response.statusText,
					data: error.response.data
				};
			}
		}

		// ----------------------------------------------------------
		// convert axios response format to "request" module response format
		// ----------------------------------------------------------
		if (resp) {
			delete resp.config;
			delete resp.request;
			for (let key in resp) {
				if (typeof resp[key] === 'function') {				// remove the bloat they add to the resp obj
					delete resp[key];
				}
			}

			// convert data -> body
			if (resp.data) {
				resp.body = resp.data;
				delete resp.data;
			}

			// convert status -> statusCode
			if (resp.status) {
				resp.statusCode = resp.status;
				delete resp.status;
			}

			// undo the `body` -> `data` INPUT arg conversion
			if (options && options.data) {
				options.data = undefined;
			}

			/*if (resp.body && resp.headers['content-type'] && resp.headers['content-type'].includes('grpc-web') ||
				options.responseType === ARRAY_BUFFER_TYPE) {
				resp.body = Buffer.from(resp.body, 'utf8');
			}*/
		}

		// all done
		if (cb && typeof cb === 'function') {
			return cb(comm_e, resp);
		}
	};
};
