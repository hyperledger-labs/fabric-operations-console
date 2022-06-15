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
// Proxy API Routes
//------------------------------------------------------------
module.exports = (logger, ev, t) => {
	const app = t.express.Router();

	//--------------------------------------------------
	// Generic Proxy Route to manage pass through requests (self sign cert work around) - this api is the worst of the proxies, use another route if possible
	//--------------------------------------------------
	app.post('/api/v[123]/proxy', t.middleware.verify_view_action_session, (req, res) => {
		const c = t.proxy_lib.check_cache(req);
		const skip_cache = req.body ? req.body.skip_cache : false;
		if (skip_cache !== true && c && c.cached) {						// if we have a hit, send the cached data
			if (!c.cached.headers) { c.cached.headers = {}; }
			c.cached.headers['X-Cached-Timestamp'] = c.cached.cached_ts;
			c.cached.headers['X-Cache-Expires-In'] = t.misc.friendly_ms(t.proxy_cache.getTtl(c.key) - Date.now());
			res.set(t.deployer.copy_headers(c.cached.headers));
			return res.status(c.cached.code).send(c.cached.data);
		} else {														// else perform the proxy req
			t.proxy_lib.generic_proxy_call(req, (ret) => {
				if (ret.headers) {
					res.set(ret.headers);
				}
				if (!ret.response) {
					res.status(ret.statusCode).send();
				} else {
					t.proxy_lib.cache_data(c.key, c.key_src, ret);
					res.status(ret.statusCode).send(ret.response);
				}
			});
		}
	});

	//--------------------------------------------------
	// GRPC Proxy Proxy (self sign cert work around)
	//--------------------------------------------------
	app.all('/grpcwp/*', t.middleware.verify_view_action_session, (req, res) => {
		req.setTimeout(ev.GRPCWPP_TIMEOUT);
		logger.debug('[grpcwp] incoming-req-timeout:', t.misc.friendly_ms(ev.GRPCWPP_TIMEOUT));
		t.proxy_lib.grpc_proxy_proxy_call(req, (ret) => {
			if (ret.headers) {
				res.set(ret.headers);
			}
			if (!ret.response) {
				res.status(ret.statusCode).send();
			} else {
				res.status(ret.statusCode).send(ret.response);
			}
		});
	});

	//--------------------------------------------------
	// CA Proxy (cors && self sign cert work around)
	//--------------------------------------------------
	app.all('/caproxy/*', t.middleware.verify_view_action_session, (req, res) => {
		t.proxy_lib.ca_proxy_call(req, (ret) => {
			if (ret.headers) {
				res.set(ret.headers);
			}
			if (!ret.response) {
				res.status(ret.statusCode).send();
			} else {
				res.status(ret.statusCode).send(ret.response);
			}
		});
	});

	//--------------------------------------------------
	// General Proxy (cors && self sign cert work around)
	//--------------------------------------------------
	app.all('/proxy/*', t.middleware.verify_view_action_session, (req, res) => {
		t.proxy_lib.proxy_call(req, (ret) => {
			if (ret.headers) {
				res.set(ret.headers);
			}
			if (!ret.response) {
				res.status(ret.statusCode).send();
			} else {
				res.status(ret.statusCode).send(ret.response);
			}
		});
	});

	//--------------------------------------------------
	// Proxy Route for Configtxlator Requests (https vs http work around)
	//--------------------------------------------------
	app.all('/configtxlator/?*', t.middleware.verify_view_action_session, (req, res) => {
		req.path2use = req.originalUrl.substring(14);				// strip off the "/configtxlator" part
		if (!req.path2use) {
			req.path2use = '/';										// the root route will be empty, but request module expects something
		}
		return t.proxy_lib.proxy_configtxlator(req, res);
	});

	return app;
};
