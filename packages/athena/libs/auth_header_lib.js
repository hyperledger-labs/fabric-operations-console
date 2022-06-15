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
// auth_header_lib.js - module to decode the "Authentication" header
//------------------------------------------------------------

module.exports = function (logger, ev, t) {
	const auth_header_lib = {};

	// --------------------------
	// parse the auth - accepts basic auth, bearer token, signature auth, api key auth, or session
	// --------------------------
	/*
		req: {
			headers: {
				'Authentication' : 'xxxxx'  						// "Authentication" is not case sensitive
			}
		}
	*/
	auth_header_lib.parse_auth = (req) => {
		const headers2use = req ? (req._orig_headers || req.headers) : null;	// prefer original headers in case we overwrote them
		if (headers2use) {
			let temp = null;
			const lc_headers = {};									// make a copy of all headers with lowercase keys, easier parsing
			for (let key in headers2use) {
				lc_headers[key.toLowerCase()] = headers2use[key];
			}

			let auth_str = null;
			if (typeof lc_headers.authorization === 'string') {		// get the auth header
				auth_str = lc_headers.authorization.trim();
			}

			// basic auth (used for OpTools api key)
			temp = auth_header_lib.parse_basic_auth(auth_str);
			if (temp.type) {
				return temp;
			}

			// bearer token (used for IAM access/bearer token)
			temp = auth_header_lib.parse_bearer_token(req, auth_str);
			if (temp.type) {
				return temp;
			}

			// signature
			temp = auth_header_lib.parse_signature_auth(auth_str);
			if (temp.type) {
				return temp;
			}

			// api key (used for IAM api key)
			temp = auth_header_lib.parse_api_key(auth_str);
			if (temp.type) {
				return temp;
			}

			// session (used for browser requests)
			temp = auth_header_lib.parse_session(req);
			if (temp.type) {
				return temp;
			}

			// see if its an api doing an apikey to access token exchange (this is not a bearer token, yet)
			temp = auth_header_lib.parse_access_token_exchange(req, lc_headers);
			if (temp.type) {
				return temp;
			}
		}

		return null;
	};

	// --------------------------
	// parse a basic authorization string
	// --------------------------
	/*
		"Basic xxxxx"
		or
		"basic xxxxx"
	*/
	auth_header_lib.parse_basic_auth = (auth_str) => {
		const ret = {
			name: null,
			pass: null,
			type: null
		};
		if (typeof auth_str === 'string') {
			let pos = auth_str.indexOf('Basic ');					// get the position of the auth type
			if (pos === -1) {
				pos = auth_str.indexOf('basic ');
			}

			if (pos === 0) {
				const auth_value = auth_str.substring(6);			// remove the "Basic " part
				const decoded = t.misc.decodeb64(auth_value);
				const parts = decoded.split(':');					// fyi - usernames cannot contain colons
				if (Array.isArray(parts) && parts.length >= 2) {
					ret.name = parts[0];							// grab the username, its always in position 0
					parts.splice(0, 1);								// remove the username from array
					ret.pass = parts.join(':');						// rebuild the password with array (need to do this incase the pass contains colons)
				}
				ret.type = ev.STR.BASIC;
			}
		}

		return ret;
	};

	// --------------------------
	// parse a bearer token authorization string
	// --------------------------
	/*
		"Bearer xxxxx"
		or
		"bearer xxxxx"
	*/
	auth_header_lib.parse_bearer_token = (req, auth_str) => {
		const ret = {
			token: null,
			type: null,
			sub_type: null,
		};
		if (typeof auth_str === 'string') {
			let pos = auth_str.indexOf('Bearer ');					// get the position of the auth type
			if (pos === -1) {
				pos = auth_str.indexOf('bearer ');
			}

			if (pos === 0) {
				ret.token = auth_str.substring(7);					// remove the "Bearer " part;
				ret.type = ev.STR.BEARER;
				ret.sub_type = ev.STR.IAM_TOKEN;

				const payload = t.permissions_lib.parse_ibp_token(ret.token);
				if (payload && payload.typ === ev.STR.IBP_TOKEN) {
					ret.sub_type = ev.STR.IBP_TOKEN;
					req._email = payload ? payload.user : null;
				}
			}
		}

		return ret;
	};

	// --------------------------
	// parse a signature authorization string
	// --------------------------
	/*
		"Signature xxxxx"
		or
		"signature xxxxx"
	*/
	auth_header_lib.parse_signature_auth = (auth_str) => {
		const ret = {
			signature: null,
			type: null
		};
		if (typeof auth_str === 'string') {
			let pos = auth_str.indexOf('Signature ');					// get the position of the auth type
			if (pos === -1) {
				pos = auth_str.indexOf('signature ');
			}

			if (pos === 0) {
				ret.signature = auth_str.substring(10);					// remove the "Signature " part;
				ret.type = ev.STR.SIG;
			}
		}

		return ret;
	};

	// --------------------------
	// parse an api key authorization string
	// --------------------------
	/*
		"ApiKey xxxxx"
		or
		"apikey xxxxx"
	*/
	auth_header_lib.parse_api_key = (auth_str) => {
		const ret = {
			api_key: null,
			type: null
		};
		if (typeof auth_str === 'string') {
			let pos = auth_str.indexOf('ApiKey ');					// get the position of the auth type
			if (pos === -1) {
				pos = auth_str.indexOf('apikey ');
			}

			if (pos === 0) {
				ret.api_key = auth_str.substring(7);				// remove the "ApiKey " part
				ret.type = ev.STR.KEY;
			}
		}

		return ret;
	};

	// --------------------------
	// parse an session based request
	// --------------------------
	/*
		session id
	*/
	auth_header_lib.parse_session = (req) => {
		const ret = {
			sid: null,
			type: null
		};
		let sid = (req.session && req.session.sid) ? req.session.sid : null;
		if (sid && typeof sid === 'string') {
			ret.sid = t.session_store._safe_sid(sid);
			ret.type = 'session';
		}
		return ret;
	};


	// --------------------------
	// parse the apikey out of the access token exchange body
	// --------------------------
	/*
		body: {
			apikey: username + ':' + password,
		}
	*/
	auth_header_lib.parse_access_token_exchange = (req, lc_headers) => {
		const ret = {
			name: null,
			pass: null,
			type: null
		};
		if (req && req.body && req.body.apikey && typeof req.body.apikey === 'string') {
			const parts = req.body.apikey.split(':');			// fyi - usernames cannot contain colons
			if (Array.isArray(parts) && parts.length >= 2) {
				ret.name = parts[0];							// grab the username, its always in position 0
				parts.splice(0, 1);								// remove the username from array
				ret.pass = parts.join(':');						// rebuild the password with array (need to do this incase the pass contains colons)
			}
			ret.type = ev.STR.BASIC;
		}
		return ret;
	};

	return auth_header_lib;
};
