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
// proxy_lib.js - Node processing/managing functions
//------------------------------------------------------------
module.exports = function (logger, ev, t) {
	const exports = {};
	const httpProxy = require('http-proxy');
	const configtxlator_proxy = httpProxy.createProxyServer({});
	configtxlator_proxy.on('proxyRes', function (proxyRes, req, res) {
		const code = t.ot_misc.get_code(proxyRes);
		if (t.ot_misc.is_error_code(code)) {
			logger.error('[configtxlator proxy route] - configtxlator responded with error code:', code);
		} else {
			logger.debug('[configtxlator proxy route] - successful configtxlator response code:', code);
		}
	});

	//--------------------------------------------------
	// Generic Proxy - this proxy code kind of sucks, it requires the url & data in the body - do not use
	//--------------------------------------------------
	exports.generic_proxy_call = (req, cb) => {
		const parts = t.misc.break_up_url(req.body.url);				// break up hostname and path
		if (!parts) {
			logger.error('[old proxy] unable to parse url. will not send request to url:', encodeURI(req.body.url));
			return cb({ statusCode: 400, response: 'invalid url' });
		}

		const base_url = parts.protocol + '//' + parts.hostname + ':' + parts.port;
		const valid_url = t.ot_misc.validateUrl(base_url, ev.URL_SAFE_LIST);	// see if its in our whitelist or not
		if (!valid_url) {
			logger.error('[old proxy] - unsafe url. will not send request to url:', encodeURI(base_url));
			return cb({ statusCode: 400, response: 'unsafe url. will not send request' });
		} else {

			const opts = {
				method: req.body.method,
				baseUrl: base_url,														// url to proxy
				//baseUrl: 'https://orderer.example.com:7053',
				url: parts.path + (req.body.query ? ('?' + req.body.query) : ''),
				body: sanitize_object(req.body.body),									// body for proxy (plain text)
				headers: exports.copy_headers(req.headers),
				json: false,
				encoding: null,
				rejectUnauthorized: false,												// the whole point of this api is to not verify self signed certs
				requestCert: true,
				_name: 'proxy',
				_max_attempts: 2,
			};
			if (req.body.cert && req.body.key && req.body.ca) {							// accept mutual TLS parameters
				opts.cert = t.misc.decodeb64(req.body.cert);							// base 64 decode the *client* cert PEM before sending on
				opts.key = t.misc.decodeb64(req.body.key);								// base 64 decode the *client* key PEM before sending on
				opts.ca = t.misc.decodeb64(req.body.ca);								// base 64 decode the server TLS PEM before sending on
			}

			if (opts.url.includes('healthz') || opts.url.includes('cainfo')) {
				opts.timeout = ev.HTTP_STATUS_TIMEOUT;
				opts._retry_codes = {						// list of codes we will retry
					'429': '429 rate limit exceeded aka too many reqs',
					//'408': '408 timeout',					// status calls should not retry a timeout, takes too long
					'500': '500 internal error',
				};
			}
			t.misc.retry_req(opts, (err, resp) => {
				let response = resp ? resp.body : null;
				let code = t.ot_misc.get_code(resp);
				let headers;

				if (!t.ot_misc.is_error_code(code)) {									// errors are logged in retry req()
					logger.info('[old proxy] - successful proxy response', code);
				}

				if (resp && resp.headers) {
					headers = exports.copy_headers(resp.headers, true);					// copy headers for our response
				}
				if (!response) {
					return cb({ headers: headers, statusCode: code });
				} else {
					return cb({ headers: headers, statusCode: code, response: response });
				}
			});
		}
	};

	//--------------------------------------------------
	// GRPC Proxy Proxy (I did not stutter)
	//--------------------------------------------------
	/*
	* req: {}  // request object
	*/
	exports.grpc_proxy_proxy_call = (req, cb) => {
		const parsed = t.ot_misc.parseProxyUrl(req.originalUrl, { default_proto: 'http', prefix: '/grpcwp/' });

		const valid_url = t.ot_misc.validateUrl(parsed.base2use, ev.URL_SAFE_LIST);	// see if its in our whitelist or not
		if (!valid_url) {
			logger.error('[grpcwp] - unsafe url. will not send grpcwp request to url:', parsed.base2use);
			return cb({ statusCode: 400, response: 'unsafe url. will not send grpcwp request' });
		} else {

			//logger.info('[grpcwp] - attempting a grpc proxy proxy request', req.method, parsed.base2use + parsed.path2use);
			const opts = {
				method: req.method,
				baseUrl: parsed.base2use,												// url to proxy
				url: parsed.path2use,
				body: sanitize_object(req.body),										// body for proxy (plain text)
				headers: exports.copy_headers(req.headers),
				timeout: ev.GRPCWPP_TIMEOUT,
				json: false,
				encoding: null,
				rejectUnauthorized: false,												// the whole point of this api is to not verify self signed certs
				requestCert: true,
				_name: 'grpcwp',
				_max_attempts: 1,														// never retry (retry_req is still useful though b/c error formatting)
			};

			t.misc.retry_req(opts, (err, resp) => {
				let response = resp ? resp.body : null;
				let code = t.ot_misc.get_code(resp);
				let headers;

				if (!t.ot_misc.is_error_code(code)) {									// errors are logged in retry req()
					logger.info('[grpcwp] - successful proxy response', code);
				}

				if (resp && resp.headers) {
					headers = exports.copy_headers(resp.headers, true);							// copy headers for our response
				}
				if (!response) {
					return cb({ headers: headers, statusCode: code });
				} else {
					return cb({ headers: headers, statusCode: code, response: response });
				}
			});
		}
	};

	//--------------------------------------------------
	// Proxy a https athena request to an http configtxlator
	//--------------------------------------------------
	exports.proxy_configtxlator = (req, res) => {
		const target_url = t.misc.format_url(ev.CONFIGTXLATOR_URL_ORIGINAL);
		const url = target_url + req.path2use;
		logger.info('[configtxlator proxy route] - attempting a proxy request', req.method, url);
		req.url = req.path2use;									// overwrite
		const opts = {
			target: target_url,
			secure: false,										// flag is n/a for our use case (no tls), but adding it just b/c
			prependPath: false,									// default is already false, but w/e
			followRedirects: true,								// we might need this some day
			changeOrigin: true,									// does not work w/o flag as true
			proxyTimeout: (!ev.CONFIGTXLATOR_TIMEOUT || ev.CONFIGTXLATOR_TIMEOUT === -1) ? 60000 : ev.CONFIGTXLATOR_TIMEOUT,
		};
		configtxlator_proxy.web(req, res, opts, (error) => {	// this callback is for hard errors only, successes are handled by http-proxy
			let code = 500;
			logger.error('[configtxlator proxy route] - unable to contact configtxlator ', error);
			if (error.toString().indexOf('socket hang up') >= 0) {
				code = 408;
				logger.error('[configtxlator proxy route] - timeout:', opts.proxyTimeout);
			}
			return res.status(code).json({ statusCode: code, msg: error });
		});
	};

	//--------------------------------------------------
	// Proxy a request to athena to a ca
	//--------------------------------------------------
	exports.ca_proxy_call = (req, cb) => {
		const parsed = t.ot_misc.parseProxyUrl(req.originalUrl, { default_proto: 'http', prefix: '/caproxy/' });
		const valid_url = t.ot_misc.validateUrl(parsed.base2use, ev.URL_SAFE_LIST);	// see if its in our whitelist or not
		if (!valid_url) {
			logger.error('[ca proxy] - unsafe url. will not send ca request to url:', parsed.base2use);
			return cb({ statusCode: 400, response: 'unsafe url. will not send ca request' });
		} else {

			const opts = {
				method: req.method,
				baseUrl: parsed.base2use,												// url to proxy
				url: t.misc.safe_url(parsed.path2use),
				body: (req.method === 'POST' || req.method === 'PUT') ? sanitize_object(req.body) : null,		// body for proxy (send plain text)
				headers: exports.copy_headers(req.headers),
				timeout: ev.CA_PROXY_TIMEOUT,
				json: false,
				encoding: null,
				rejectUnauthorized: false,												// the whole point of this api is to not verify self signed certs
				requestCert: true,
				_name: 'ca proxy',
				_max_attempts: 2,
			};
			/* dsh todo, grab tls certs from docs
			if (req.body.tls_options) {													// optional tls values
				if (req.body.tls_options.trusted_roots) {
					opts.ca = req.body.tls_options.trusted_roots;
				}
				if (req.body.tls_options.reject_unauthorized) {
					opts.rejectUnauthorized = req.body.reject_unauthorized;
				}
			}*/
			t.misc.retry_req(opts, (err, resp) => {
				let response = resp ? resp.body : null;
				let code = t.ot_misc.get_code(resp);
				let headers;

				if (!t.ot_misc.is_error_code(code)) {									// errors are logged in retry req()
					logger.info('[ca proxy] - successful proxy response', code);
				}

				if (resp && resp.headers) {
					headers = exports.copy_headers(resp.headers, true);							// copy headers for our response
				}
				if (!response) {
					return cb({ headers: headers, statusCode: code });
				} else {
					return cb({ headers: headers, statusCode: code, response: response });
				}
			});
		}
	};

	//--------------------------------------------------
	// Proxy a request to athena to anything
	//--------------------------------------------------
	exports.proxy_call = (req, cb) => {
		const parsed = t.ot_misc.parseProxyUrl(req.originalUrl, { default_proto: 'https', prefix: '/proxy/' });
		const valid_url = t.ot_misc.validateUrl(parsed.base2use, ev.URL_SAFE_LIST);	// see if its in our whitelist or not
		if (!valid_url) {
			logger.error('[general proxy] - unsafe url. will not send request to url:', parsed.base2use);
			return cb({ statusCode: 400, response: 'unsafe url. will not send request' });
		} else {
			const opts = {
				method: req.method,
				baseUrl: parsed.base2use,												// url to proxy
				//baseUrl: 'https://orderer.example.com:7053',
				url: t.misc.safe_url(parsed.path2use),

				body: (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') ?
					sanitize_object(req.body) : null,		// body for proxy (send plain text)

				headers: exports.copy_headers(req.headers),
				timeout: ev.CA_PROXY_TIMEOUT,				// dsh todo change
				json: false,
				encoding: null,
				rejectUnauthorized: false,												// the whole point of this api is to not verify self signed certs
				requestCert: true,
				_name: 'general proxy',
				_max_attempts: 1,
			};
			if (req.headers && req.headers['x-certificate-b64pem'] && req.headers['x-private-key-b64pem']) {	// add mutual TLS parameters
				opts.cert = t.misc.decodeb64(req.headers['x-certificate-b64pem']);	// base 64 decode the *client* cert PEM before sending on
				opts.key = t.misc.decodeb64(req.headers['x-private-key-b64pem']);	// base 64 decode the *client* key PEM before sending on
				if (req.headers['x-root-cert-b64pem']) {
					opts.ca = t.misc.decodeb64(req.headers['x-root-cert-b64pem']);	// base 64 decode the server TLS PEM before sending on
					opts.rejectUnauthorized = true;
				}
			}
			t.misc.retry_req(opts, (err, resp) => {
				let response = resp ? resp.body : null;
				let code = t.ot_misc.get_code(resp);
				let headers;

				//console.log('resp', resp.body ? resp.body.toString() : '-');

				if (!t.ot_misc.is_error_code(code)) {									// errors are logged in retry req()
					logger.info('[general proxy] - successful proxy response', code);
				}

				if (resp && resp.headers) {
					headers = exports.copy_headers(resp.headers, true);					// copy headers for our response
				}
				if (!response) {
					return cb({ headers: headers, statusCode: code });
				} else {
					return cb({ headers: headers, statusCode: code, response: response });
				}
			});
		}
	};

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

	// check if cache has a valid result
	exports.check_cache = (req) => {
		const key_source = req.body.url + (req.body.query ? req.body.query : '');
		const ret = {
			key_src: key_source,									// the full key, string
			key: t.misc.hash_str(key_source),						// the hashed key, string, the cache data gets index by this value
			cached: false,											// the retrieved data
		};
		if (ev.PROXY_CACHE_ENABLED === true && req.body.method === 'GET') {
			const hit = t.proxy_cache.get(ret.key);
			if (hit && hit.data && hit.key_src === key_source) {	// check key_src to protect from hash collision
				ret.cached = hit;
			}
		}
		return ret;
	};

	// store new data in cache
	exports.cache_data = (key, key_src, response) => {
		if (ev.PROXY_CACHE_ENABLED === true) {
			const data2cache = {
				code: response.statusCode,
				headers: response.headers,
				data: response.response,
				key_src: key_src,
				cached_ts: Date.now(),								// remember when we stored it
			};
			t.proxy_cache.set(key, data2cache, 2 * 60);				// expiration is in sec
		}
	};


	return exports;
};
