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
// root_misc.js - common/general miscellaneous functions that are INDEPENDENT (no tools object)
//------------------------------------------------------------

module.exports = function (logger) {
	const exports = {};
	const __url = require('url');

	// ------------------------------------------
	// return the hostname from a url
	// ------------------------------------------
	exports.get_host = function (url) {
		const parts = exports.break_up_url(url);
		if (!parts) {
			return null;					// error is logged elsewhere
		} else {
			return parts.hostname;
		}
	};

	// ------------------------------------------
	// break up url in proto, basic auth, hostname, port, etc
	// ------------------------------------------
	exports.break_up_url = function (url, opts) {
		if (url && typeof url === 'string' && !url.includes('://')) {			// if no protocol, assume https
			if (opts && opts.default && typeof opts.default === 'string') {
				url = opts.default + '//' + url;								// default protocol was passed in
			} else {
				url = 'https://' + url;											// append https so we can parse it
			}
		}

		const parts = typeof url === 'string' ? __url.parse(url) : null;
		if (!parts || !parts.hostname) {
			logger.error('[misc] cannot parse url:', encodeURI(url));
			return null;
		} else {
			let protocol = parts.protocol ? parts.protocol : 'https:';			// default protocol is https
			if (opts && opts.default && typeof opts.default === 'string' && !parts.protocol) {
				protocol = opts.default;										// default protocol was passed in
			}
			if (!parts.port) {
				parts.port = protocol === 'https:' ? '443' : '80';				// match default ports to protocol
			}
			parts.auth_str = parts.auth ? parts.auth + '@' : '';				// defaults to no auth

			return parts;
		}
	};

	// ------------------------------------------
	// parse url return proto + :basic_auth? + hostname + port
	// ------------------------------------------
	exports.format_url = function (url, opts) {
		const parts = exports.break_up_url(url, opts);
		if (!parts || !parts.hostname) {
			return null;					// error is logged elsewhere
		} else {
			if (opts && opts.useIpv4 === true) {
				parts.hostname = exports.fix_localhost(parts.hostname);
			}
			return parts.protocol + '//' + parts.auth_str + parts.hostname + ':' + parts.port;
		}
	};

	// ------------------------------------------
	// redact basic auth in url
	// ------------------------------------------
	exports.redact_basic_auth = function (url) {
		const parts = exports.break_up_url(url);
		if (!parts || !parts.hostname) {
			return null;				// error is logged elsewhere
		} else {
			return parts.protocol + '//' + parts.hostname + ':' + parts.port;
		}
	};

	// ------------------------------------------
	// return hostname + port from url (no protocol, no basic auth)
	// ------------------------------------------
	exports.fmt_url = function (url) {
		const parts = exports.break_up_url(url);
		if (!parts || !parts.hostname) {
			return null;				// error is logged elsewhere
		} else {
			return parts.hostname + ':' + parts.port;
		}
	};

	// ------------------------------------------
	// parse query parameter as array of strings
	// ------------------------------------------
	exports.fmt_arr_of_strings_query_param = function (req, field_name) {
		let ret = null;
		if (field_name && req && req.query && req.query[field_name]) {
			try {
				ret = [];
				req.query[field_name] = req.query[field_name].replace(/'/g, '"');	// allow user to input single quotes, double quotes preferred
				if (req.query[field_name]) {
					ret = JSON.parse(decodeURIComponent(req.query[field_name]));
				}
			} catch (e) {
				logger.error('[misc] unable to parse query param', field_name, e);
				ret = null;
			}
		}
		return ret;
	};

	// ---------------------------------------------
	// node 18 will translate "localhost" to ""::1" which is a IPv6 format, if the destination is not listening on IPv6 the connection will fail!
	// we need to switch "localhost" to the ip version which will keep the connection as IPv4.
	// ---------------------------------------------
	exports.fix_localhost = function (url_str) {
		if (url_str && typeof url_str === 'string' && url_str.includes('localhost')) {
			url_str = url_str.replace('localhost', '127.0.0.1');
		}
		return url_str;
	};

	return exports;
};
