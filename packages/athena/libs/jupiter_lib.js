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
// jupiter.js - Functions to call the jupiter component
//------------------------------------------------------------
module.exports = function (logger, ev, t) {
	const exports = {};

	// copy some headers
	exports.copy_headers = (headers, response) => {
		const skip = [				// don't copy these headers
			'accept-encoding',		// can't parse response
			'host',					// causes 404s
			'content-length',		// freaks out apps (gets rebuilt)
			'transfer-encoding',	// freaks out react proxy (cannot be used with content-length)
			'cookie',				// don't send the UI cookie data to a component
		];
		if (!headers) {
			return {};
		} else {
			const ret = {};
			if (response === true) {
				// don't copy this header into our response. the pen test flags CORS * (can happen when proxying to a CA)
				ret['access-control-allow-origin'] = ev.HOST_URL;	// overwrite our CORS related response header with athena's external url
			}
			for (let name in headers) {
				const lc_name = name.toLowerCase();
				if (skip.indexOf(lc_name) === -1) {
					ret[name] = headers[name];
				}
			}
			return ret;
		}
	};

	// return object as something the request module can take (string or buffer)
	function sanitize_object(obj) {
		if (obj && obj.constructor && obj.constructor.name === 'Buffer') {
			return obj;									// leave buffers alone!
		} else if (typeof obj === 'object') {
			if (Object.keys(obj).length === 0) {		// its empty, return nothing
				return null;
			} else {
				return JSON.stringify(obj);				// its an object return as string
			}
		} else {
			return obj;									// return as is
		}
	}

	//--------------------------------------------------
	// Send a request to jupiter
	//--------------------------------------------------
	/*
	{
		method: "GET",
		path: "/api/v3/...",
		body: {},
		headers: {},
	}
	*/
	exports.request = (opts, cb) => {
		const jupiter_url = t.misc.format_url(ev.JUPITER_URL);

		if (!jupiter_url) {
			logger.error('[jupiter req] - invalid settings. will not send jupiter request to url:', ev.JUPITER_URL);
			return cb({ statusCode: 400, response: 'invalid jupiter setting. will not send request' });
		} else {
			opts.path = opts.path.replace(/\$iid/gi, (ev.CRN.instance_id || 'iid-not-set'));	// replace placeholder iid with the real iid
			opts.path = opts.path.replace(/\$account/gi, (strip_account_prefix(ev.CRN.account_id) || 'iid-not-set'));	// replace placeholder
			logger.info('[jupiter req] - attempting a jupiter request', opts.method, t.misc.get_host(ev.JUPITER_URL), opts.path);

			const options = {
				method: opts.method,
				baseUrl: encodeURI(jupiter_url),								// url to use
				uri: encodeURI(opts.path),
				body: (opts.method === 'POST' || opts.method === 'PUT') ? sanitize_object(opts.body) : null,	// body for req (send plain text)
				headers: exports.copy_headers(opts.headers),
				timeout: ev.DEPLOYER_TIMEOUT,
			};

			// debug code
			//return cb({ statusCode: 500 });
			//return cb({ statusCode: 200, response: { url: 'http://localhost:3000' } });

			t.request(options, (err, resp) => {
				let response = resp ? resp.body : null;
				let code = t.ot_misc.get_code(resp);

				if (!t.ot_misc.is_error_code(code)) {
					logger.debug('[jupiter req] - successful response code:', code);
				}

				if (!response) {
					return cb({ statusCode: code });
				} else {
					try {
						response = JSON.parse(response);			// format as json object if its json, else leave it
					} catch (e) {
						// do nothing
					}
					return cb({ statusCode: code, response: response });
				}
			});
		}

		function strip_account_prefix(account_id) {
			if (typeof account_id === 'string') {
				account_id = account_id.trim();
				if (account_id.indexOf('a/') === 0) {
					return account_id.substring(2);
				}
			}
			return account_id;
		}
	};

	//--------------------------------------------------
	// Pass jupiter error along if present
	//--------------------------------------------------
	exports.make_jupiter_msg = (resp) => {
		let jupiter_msg = '';
		if (resp && resp.response && resp.response.message && typeof resp.response.message === 'string') {
			jupiter_msg = '. Details - "' + resp.response.message + '"';
		} else if (resp && resp.message && typeof resp.message === 'string') {
			jupiter_msg = '. Details - "' + resp.message + '"';
		} else if (resp && resp.response && typeof resp.response === 'string') {
			jupiter_msg = '. Details - "' + resp.response + '"';
		}
		return jupiter_msg;
	};

	return exports;
};
