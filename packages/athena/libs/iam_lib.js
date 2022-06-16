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
// IAM Library - w/cache on results from the IBM Cloud IAM server. Handles browser authorization and API authorization
//=======================================================================================================

module.exports = (logger, ev, t, nodejsCache) => {
	const iam = {};
	const IAM_KEY_ROOT = 'iam_public_key';							// iam public cert cache key
	const ENTRY_DESCRIPTION = ['all_ibp_instances', 'specific_ibp_instance'];

	// --------------------------------------------------------------------------------------------
	/* Middleware for IAM authorization with the IBP service -  (Used for api authorization)
	req: {
		actions: ['blockchain.optools.view'],						// IAM_service_name.noun.verb
		headers: {
			authorization: "<users base 64 jwt token>",				// aka iam identity token
		},
		query:{
			skip_cache: "yes",										// [optional]
		}
	}
	// --------------------------------------------------------------------------------------------*/
	iam.isAuthorizedWithIBP = (req, res, next) => {
		const errors = [];
		const lc_headers = {};									// make a copy of all headers in lowercase
		for (let i in req.headers) {
			lc_headers[i.toLowerCase()] = req.headers[i].toLowerCase();
		}

		// --- 1. sanity checks --- //
		if (!lc_headers['authorization']) {
			errors.push('Missing header "Authorization"');
		}
		const pos = lc_headers['authorization'] ? lc_headers['authorization'].indexOf('bearer ') : -1;
		if (pos === -1) {
			errors.push('Header "Authorization" does not contain "Bearer <token>"');
		}
		if (!ev.IAM_API_KEY) {
			errors.push('Internal setup error, the settings variable "iam_api_key" is missing');
		}
		if (errors.length > 0) {
			return res.status(400).json({ statusCode: 400, errors: errors });
		}

		// --- 2. Get our identity access token so we can talk to IAM --- //
		const opts = {
			url: ev.IAM.URL,
			api_key: ev.IAM_API_KEY,
		};
		iam.getAccessToken(opts, (err, service_body) => {			// get our identity access token (uses cache)

			// --- 3. Ask IAM if the user's token is valid for this action --- //
			const tx_id = t.misc.simpleRandomString(32);
			logger.debug('[iam lib] need authorization on actions:', req.actions, tx_id);	// log actions for debugging

			const options = {
				tx_id: tx_id,
				url: ev.IAM.URL,
				services_iam_token: service_body ? service_body.access_token : null,
				users_iam_token: req.headers['authorization'].substring(pos + 7),
				authorizations: [],			// set below
				SKIP_CACHE: req.query.skip_cache === 'yes' ? true : false,
			};
			req.using_api_key = options.users_iam_token;

			for (let i in req.actions) {
				options.authorizations.push({
					id: t.misc.simpleRandomString(8),				// [optional]
					action: req.actions[i],
				});
			}
			iam.isAuthorized(options, (err, ret) => {				// check if this request is authorized with IAM
				if (err) {
					return res.status(t.ot_misc.get_code(err)).json(err);
				} else {
					logger.debug('[iam lib] authorization granted on actions:', req.actions, tx_id);
					req.permitted_actions = ret ? ret.permitted_actions : [];
					return next();
				}
			});
		});
	};

	// --------------------------------------------------------------------------------------------
	/* Exchange your api key for an identity access token - [cache will be used if available]
	opts: {
		url: "https://hostname.com:port"
		api_key: "<base 64 jwt here>",
		SKIP_CACHE: true,							// [optional]
	}
	// --------------------------------------------------------------------------------------------*/
	iam.getAccessToken = (opts, cb) => {
		if (!ev.IAM_CACHE_ENABLED) {
			iam.getAccessTokenHttp(opts, (err, resp) => {
				return cb(err, resp);
			});
		} else {
			const cache_key = t.misc.hash_str(opts.api_key);		// make a hash on the api key
			if (opts.SKIP_CACHE === true) {
				logger.debug('[iam lib] getAccessToken *skipping cache*');
				askIAM(cache_key, (error, ret) => {
					return cb(error, ret);
				});
			} else {
				const cache_resp = nodejsCache.get(cache_key);
				if (!cache_resp) {
					logger.debug('[iam lib] getAccessToken *cache miss*');
					askIAM(cache_key, (error, ret) => {
						return cb(error, ret);
					});
				} else {
					logger.debug('[iam lib] getAccessToken *cache hit*');
					return cb(null, cache_resp);
				}
			}
		}

		function askIAM(key, cb2) {
			iam.getAccessTokenHttp(opts, (err, resp) => {
				if (!err) {								// if we only cache success we don't have to check the type on a cache hit
					iam.write2cache(key, resp, 1800);	// set expiration lower than the jwt's expiration of 1 hour
				}
				return cb2(err, resp);
			});
		}
	};

	// --------------------------------------------------------------------------------------------
	/* Exchange your api key for an identity access token - [http only, no cache]
	opts: {
		url: "https://hostname.com:port"
		api_key: "<base 64 jwt here>",
	}
	// --------------------------------------------------------------------------------------------*/
	iam.getAccessTokenHttp = (opts, cb) => {
		const options = {
			baseUrl: opts.url,
			url: '/identity/token',
			body: 'grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=' + opts.api_key,
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			timeout: ev.HTTP_TIMEOUT / 2,
			_name: 'iam lib',												// name to use in logs
		};
		t.misc.retry_req(options, (err, resp) => {							// adding retry b/c intermittent dns issues
			let ret = format_body('iam_access_token', resp);
			const code = t.ot_misc.get_code(resp);
			if (t.ot_misc.is_error_code(code) || !ret) {
				logger.error('[iam lib] req error getting access token. http error:', err, ', http resp:', (resp ? resp.body : null));
				return cb(err, ret);
			} else {
				return cb(err, ret);
			}
		});
	};

	// --------------------------------------------------------------------------------------------
	/* Ask IAM if this token is authorized for this action - [cache will be used if available]
	opts: {
		tx_id: "random id to track this request", 							// [optional]
		url: 'https://iam.cloud.ibm.com:443',
		services_iam_token: "<service's base 64 jwt token here>",
		users_iam_token: "<users base 64 jwt token here>",
		authorizations: [{
			id: "some random id, string",									// [optional]
			action: "blockchain.optools.view",								// IAM_service_name.noun.verb
		}],
		SKIP_CACHE: true,													// [optional]
	}
	// --------------------------------------------------------------------------------------------*/
	iam.isAuthorized = (opts, cb) => {
		iam.verifyToken(opts.users_iam_token, (validationError) => {			// first lets validate the signature and the jwt expiration
			if (validationError) {
				return cb(validationError, null);								// error is already logged
			} else {
				if (!ev.IAM_CACHE_ENABLED) {
					iam.isAuthorizedHttp(opts, (error, resp) => {				// if no cache, just go now
						return cb(error, resp);
					});
				} else {
					const cache_key = build_cache_key(opts);					// make a hash on the body data
					if (opts.SKIP_CACHE === true || cache_key === null) {
						logger.debug('[iam lib] isAuthorized *skipping cache*', cache_key);
						askIAM(cache_key, (iam_error, ret) => {
							return cb(iam_error, ret);
						});
					} else {
						const cache_resp = nodejsCache.get(cache_key);
						if (!cache_resp) {
							logger.debug('[iam lib] isAuthorized *cache miss*');
							askIAM(cache_key, (iam_error, ret) => {
								return cb(iam_error, ret);
							});
						} else {
							logger.debug('[iam lib] isAuthorized *cache hit*');
							return cb(null, cache_resp);
						}
					}
				}
			}
		});
		function build_cache_key(opts) {
			const data = make_iam_body(opts);							// make body now to build cache key of it
			if (data === null) {
				return null;
			}
			for (let i in data) {
				delete data[i].requestId;								// remove so it doesn't make the key mismatch
			}
			return t.misc.hash_str(JSON.stringify(data));				// make a hash on the body data
		}

		function askIAM(key, cb2) {
			iam.isAuthorizedHttp(opts, (err, resp) => {
				if (!err) {								// if we only cache success we don't have to check the type on a cache hit
					iam.write2cache(key, resp, ret_expiration_s(opts));
				}
				return cb2(err, resp);
			});
		}

		// get the expiration in seconds - expiration of key in ms (note reading the key does NOT bump the expiration)
		function ret_expiration_s(options) {
			let expiration_s = 120;								// default xx sec
			if (options && !isNaN(options.expires)) {
				expiration_s = (options.expires / 1000).toFixed(2);
			}
			return expiration_s;
		}
	};

	// --------------------------------------------------------------------------------------------
	/* Ask IAM if this token is authorized for this action - [http only, no cache]
	opts: {
		tx_id: "random id to track this request", 							// [optional]
		url: 'https://iam.cloud.ibm.com:443',
		services_iam_token: "<service's base 64 jwt token here>",
		users_iam_token: "<users base 64 jwt token here>",
		authorizations: [{
			id: "some random id, string",									// [optional]
			action: "blockchain.optools.view",								// IAM_service_name.noun.verb
		}],
	}
	// - [ WARNING ]
	//		- IAM's API will give you a 403 response even if your auth is correct but the instance you requesting dne.
	// 		- this can easily happen if a dev forgets to use **staging** iam with a **staging** crn string (same with prod)
	// --------------------------------------------------------------------------------------------*/
	iam.isAuthorizedHttp = (opts, cb) => {
		const body_data = make_iam_body(opts);
		if (body_data === null) {
			logger.error('[iam lib] cannot auth. unable to build body for iam request', body_data);
			return cb({ statusCode: 401, authorized: false, error: 'cannot parse bearer token. cannot authorize your request with iam' }, null);
		}

		const tx_id = opts.tx_id || t.misc.simpleRandomString(12);
		const options = {
			baseUrl: opts.url,
			url: '/v2/authz',
			body: JSON.stringify(body_data),
			method: 'POST',
			headers: {
				'Authorization': opts.services_iam_token,
				'Accept': 'application/vnd.authz.v2+json',
				'Transaction-ID': tx_id,
				'Content-Type': 'application/json'
			},
			timeout: ev.HTTP_TIMEOUT / 2,
			_name: 'iam lib - ak',								// name to use in logs
			_max_attempts: 3,
			_tx_id: tx_id,
		};
		const debug_actions = [];
		for (let i in body_data) {
			debug_actions.push(body_data[i].action);
			logger.debug('[iam lib - ak] asking iam about resource:', ENTRY_DESCRIPTION[i % 2], 'action:', body_data[i].action, body_data[i].requestId);
		}
		t.misc.retry_req(options, (error, resp) => {
			const code = t.ot_misc.get_code(resp);
			if (t.ot_misc.is_error_code(code) && code !== 403) {		// 403 errors can be handled lower, not here
				logger.error('[iam lib - ak] received error response:', tx_id, code, (resp ? resp.body : null));
				return cb({ statusCode: code, error: 'problem authenticating user with IAM. check logs for details.' });
			} else {
				const body = format_body(tx_id, resp);
				logger.debug('[iam lib - ak] iam response (for /v2/authz):', tx_id, JSON.stringify(body, null, 2));
				const permitted_actions = get_permitted_actions(tx_id, body);
				const not_permitted = is_not_permitted(tx_id, body);

				if (not_permitted === -1) {				// error already logged
					const ret = {
						statusCode: 500,
						authorized: false,
						error: 'parse error. could not understand iam',
						iid: ev.CRN.instance_id,
						tx_id: tx_id,
					};
					return cb(ret, null);
				} else if (not_permitted === true) {	// error already logged
					const ret = {
						statusCode: 403,
						authorized: false,
						error: 'token is not authorized for these action(s)',
						attempted_actions: debug_actions,
						iid: ev.CRN.instance_id,
						tx_id: tx_id,
					};
					return cb(ret, null);
				} else {
					return cb(null, { authorized: true, permitted_actions: permitted_actions });
				}
			}
		});
	};

	// return null if we cannot parse response
	function format_body(tx_id, resp) {
		let body = null;
		if (resp && resp.body) {					// parse body to JSON
			body = resp.body;
			try { body = JSON.parse(resp.body); }
			catch (e) {
				logger.error('[iam lib] could not format response body as JSON', tx_id, e);
				return null;
			}
		}
		return body;
	}

	// return all actions subject is permitted to - [this function is for the iam api /v2/authz]
	function get_permitted_actions(tx_id, body) {
		if (!body || !body.responses || body.responses.length === 0) {
			logger.error('[iam lib] response looks malformed', tx_id, body);
			return null;
		} else {
			const all_actions = {};					// store it as object so we avoid duplicates
			for (let i in body.responses) {			// test if all responses are permitted
				if (body.responses[i].authorizationDecision && body.responses[i].authorizationDecision.obligation &&
					body.responses[i].authorizationDecision.obligation.actions) {
					for (let x in body.responses[i].authorizationDecision.obligation.actions) { // we need to aggregate all actions
						all_actions[body.responses[i].authorizationDecision.obligation.actions[x]] = true;
					}
				}
			}
			return Object.keys(all_actions);		// need to return an array of the actions
		}
	}

	// see if the desired action is allowed - [this function is for the iam api /v2/authz]
	// return -1 if we cannot parse response, return true if we are NOT authorized, return false if we are permitted
	// all action permissions are asked twice. the first (even) is for the service as a whole, the second (odd) is for the a service instance
	// a user needs permission on 1 of these pairs, for every action
	function is_not_permitted(tx_id, body) {
		if (!body || !body.responses || body.responses.length === 0) {
			logger.error('[iam lib] response looks malformed', tx_id, body);
			return -1;
		} else {
			//logger.debug('[iam lib] iam permissions:', tx_id, JSON.stringify(body, null, 2));		// dsh todo remove stringify after we have confidence

			let action_index = 0;																	// this is cosmetic for logs, ignore
			for (let i = 0; i < body.responses.length; i++) {										// iter though the iam decisions, loop increments i twice!
				let decision = body.responses[i].authorizationDecision;
				if (!decision || !decision.permitted) {
					logger.debug('[iam lib] iam permission not granted to action:', action_index, ENTRY_DESCRIPTION[i % 2], tx_id);
					if (!body.responses[i + 1]) {
						logger.warn('[iam lib] iam permission NOT granted to service and instance section is missing', action_index, tx_id);// this is 4 test
						return true;
					}
					decision = body.responses[++i].authorizationDecision;
					if (!decision || !decision.permitted) { 									// no access to service, no access to instance
						logger.debug('[iam lib] iam permission not granted to action:', action_index, ENTRY_DESCRIPTION[i % 2], tx_id);
						logger.warn('[iam lib] iam permission NOT granted to service nor instance on action', action_index, tx_id);
						return true;
					} else {																	// no access to service, has access to instance
						logger.debug('[iam lib] iam permission is granted to action:', action_index, ENTRY_DESCRIPTION[i % 2], tx_id);
						action_index++;
					}
				} else {																		// has access to service, don't care about instance
					logger.debug('[iam lib] iam permission is granted to action:', action_index, ENTRY_DESCRIPTION[i % 2], tx_id);
					i++;																		// need to move to next action, which is 2 from here
					action_index++;
				}
			}
			logger.info('[iam lib] iam permission IS granted to service or instance on all actions', tx_id);
			return false;
		}
	}

	// return all actions subject is permitted to - [this function is for the iam api /v2/authz/roles]
	// return -1 if we cannot parse response
	function get_permitted_actions_from_roles(tx_id, body) {
		if (!body || !body.responses || body.responses.length === 0) {
			logger.error('[iam lib] response looks malformed', tx_id, body);
			return null;
		} else {
			try {
				const all_actions = {};														// store it as object so we avoid duplicates
				for (let i in body.responses) {												// test if all responses are permitted
					const sub = body.responses[i].subjectId ? body.responses[i].subjectId.userId : null;

					for (let x in body.responses[i].roleActions) {							// this is an array of objects
						const role_name = body.responses[i].roleActions[x].role ? body.responses[i].roleActions[x].role.displayName : null;
						logger.debug('[iam lib] subject', sub, 'has role:', role_name, 'on', ENTRY_DESCRIPTION[i % 2], tx_id);

						for (let y in body.responses[i].roleActions[x].actions) {			// finally loop over actions
							const action_obj = body.responses[i].roleActions[x].actions[y];	// rename for sanity
							if (action_obj.action && typeof action_obj.action === 'string') {
								all_actions[action_obj.action.toLowerCase()] = true;		// we need to aggregate all actions
							}
						}
					}
				}
				const actions_array = Object.keys(all_actions).sort();
				logger.debug('[iam lib] aggregated permitted actions:', JSON.stringify(actions_array, null, 2), tx_id);
				return actions_array;														// need to return an array of the actions
			} catch (e) {
				logger.error('[iam lib] unexpected response, malformed?', tx_id, body);
				logger.error(e);
				return -1;
			}
		}
	}

	// see if the desired action is allowed - [this function is for the iam api /v2/authz/roles]
	// return -1 if we cannot parse response, return false if we are NOT authorized, return true if we are permitted
	function is_permitted_action(lc_permitted_actions, desired_action, tx_id) {
		if (!Array.isArray(lc_permitted_actions)) {
			logger.error('[iam lib] iam actions look malformed. iam permission NOT granted for action:', desired_action, tx_id);
			return -1;
		} else {
			if (!lc_permitted_actions.includes(desired_action.toLowerCase())) {
				logger.warn('[iam lib] iam permission NOT granted for action:', desired_action, tx_id);
				return false;
			} else {
				logger.debug('[iam lib] iam permission is granted for action:', desired_action, tx_id);
				return true;
			}
		}
	}

	// --------------------------------------------------------------------------------------------
	/* format a body for the IAM api `/v2/authz` - given iam token
	opts: {
		users_iam_token: "<users base 64 jwt token here>",
		authorizations: [{
			id: "some random id, string",									// [optional]
			action: "blockchain.optools.view",								// IAM_service_name.noun.verb
		}],
	}
	// --------------------------------------------------------------------------------------------*/
	function make_iam_body(opts) {
		const body = [];
		const parts = opts.users_iam_token.split('.');
		let decoded = null;
		try {
			decoded = JSON.parse(t.misc.decodeb64(parts[1]));
		} catch (e) { }
		if (decoded === null) {
			logger.error('[iam lib] cannot parse IAM jwt. has null parts');
			return null;
		}
		/* example of what is inside the jwt data layer:
		{
			"iam_id": "iam-ServiceId-64b55530-7531-4ead-90ee-399c266d71a6",
			"id": "iam-ServiceId-64b55530-7531-4ead-90ee-399c266d71a6",
			"realmid": "iam",
			"identifier": "ServiceId-64b55530-7531-4ead-90ee-399c266d71a6",
			"sub": "ServiceId-64b55530-7531-4ead-90ee-399c266d71a6",
			"sub_type": "ServiceId",
			"account": {
				"valid": true,
				"bss": "a5961025ca5e3cc926cf5930ec0642fb"
			},
			"iat": 1550785141,
			"exp": 1550788741,
			"iss": "https://iam.cloud.ibm.com/identity",
			"grant_type": "urn:ibm:params:oauth:grant-type:apikey",
			"scope": "ibm openid",
			"client_id": "default",
			"acr": 1,
			"amr": ["pwd"]
		}*/
		for (let i in opts.authorizations) {						// iter on each authorization, we will build 2 entries per
			// even entries in body are for the whole blockchain service
			body.push({
				subject: {
					attributes: {
						accountId: (decoded && decoded.account) ? decoded.account.bss : null,	// this field seems optional!... weird
						id: decoded ? (decoded.iam_id || decoded.id) : null, 	// something like iam-ServiceId-64b55530-7531-4ead-90ee-399c266d71a6
						scope: 'ibm openid blockchain'							// field seems optional
					}
				},
				action: opts.authorizations[i].action,
				resource: {
					crn: 'crn:' + ev.CRN.version +								// build the crn without the iid
						':' + ev.CRN.c_name +
						':' + ev.CRN.c_type +
						':' + ev.CRN.service_name +
						':' + ev.CRN.location +
						':' + ev.CRN.account_id +
						':::',
				},
				environment: {},												// field seems optional
				requestId: opts.authorizations[i].id || t.misc.simpleRandomString(8)
			});

			// odd entries in body are for this specific service instance
			body.push({
				subject: {
					attributes: {
						accountId: (decoded && decoded.account) ? decoded.account.bss : null,	// this field seems optional!... weird
						id: decoded ? (decoded.iam_id || decoded.id) : null, 	// something like iam-ServiceId-64b55530-7531-4ead-90ee-399c266d71a6
						scope: 'ibm openid blockchain'							// field seems optional
					}
				},
				action: opts.authorizations[i].action,
				resource: {
					crn: ev.CRN_STRING,											// build the crn with the iid
				},
				environment: {},												// field seems optional
				requestId: opts.authorizations[i].id || t.misc.simpleRandomString(8)
			});
		}
		return body;
	}

	// --------------------------------------------------------------------------------------------
	// refresh/load ALL IAM public certificates (they are used to validate jwt tokens) - returns the one matching the "kid"
	// --------------------------------------------------------------------------------------------
	iam.getIAMPublicCertsHttp = (kid, cb) => {
		const options = {
			baseUrl: encodeURI(ev.IAM.URL),
			url: '/oidc/jwks',
			method: 'GET',
			headers: {
				'Accept': 'application/json',
			}
		};
		t.request(options, (err, resp) => {
			let data = format_body('iam_pub_certs', resp);
			const publicCerts = {};

			for (let i in data) {
				const keySet = data[i];
				if (keySet) {
					publicCerts[keySet.kid] = {
						'publicKey': x5cToPublicPEM(keySet.x5c),								// export it in PEM format
						'alg': keySet.alg,
						'x5c': keySet.x5c,														// x5c is the "X.509 Certificate Chain"
					};
					iam.write2cache(IAM_KEY_ROOT + keySet.kid, publicCerts[keySet.kid], 28800);	// add each cert to cache by its "kid", ibm recommends 1 hour...
				}
			}
			if (kid && cb) {
				if (!publicCerts[kid]) {
					logger.error('IAM public cert for this "kid" is not found "' + kid + '", possible:', Object.keys(publicCerts));
				}
				return cb(null, publicCerts[kid] || null);										// return the one we need
			}
		});

		function x5cToPublicPEM(cert) {
			if (typeof cert === 'string') {
				cert = cert.match(/.{1,64}/g).join('\n');									// add new line every 64 characters
				cert = `-----BEGIN PUBLIC KEY-----\n${cert}\n-----END PUBLIC KEY-----\n`;
			}
			return cert;
		}
	};

	// --------------------------------------------------------------------------------------------
	// get the IAM certificate we need to verify the identity access token - uses cache or http
	// --------------------------------------------------------------------------------------------
	iam.getIAMCertificate = (kid, cb) => {
		const cache_resp = nodejsCache.get(IAM_KEY_ROOT + kid);
		if (!cache_resp) {
			logger.debug('[iam lib] getIAMCertificate *cache miss*');
			iam.getIAMPublicCertsHttp(kid, (error, ret) => {							// go load all certs
				return cb(error, ret);
			});
		} else {
			logger.debug('[iam lib] getIAMCertificate *cache hit*');
			return cb(null, cache_resp);
		}
	};

	// --------------------------------------------------------------------------------------------
	// check if this IAM identity access token/bearer token is any good (access tokens and bearer tokens are the same thing)
	// --------------------------------------------------------------------------------------------
	iam._check_expiration = true;																	// flag for test-suite
	iam.verifyToken = (jwt_access_token, cb) => {
		if (!jwt_access_token) {
			logger.error('[iam lib] the identity access/bearer token is missing', jwt_access_token);
			return cb({ statusCode: 401, error: 'identity access/bearer token is missing' });
		} else {
			const parts = jwt_access_token.split('.');
			const tokenParts = [];
			for (let i in parts) {
				const decoded = t.misc.decodeb64(parts[i]);
				try {
					tokenParts.push(JSON.parse(decoded));
				} catch (e) { }
			}
			if (!tokenParts || tokenParts.length < 2 || !tokenParts[0] || !tokenParts[0].kid) {		// tokens should have 2 readable parts (3 total)
				logger.error('[iam lib] the identity access/bearer token is malformed', tokenParts);
				return cb({ statusCode: 400, error: 'identity access/bearer token is malformed' });
			}

			// convert to ms, add 2 minutes of clock fuzz
			else if (iam._check_expiration && (!tokenParts[1] || tokenParts[1].exp * 1000 < Date.now() - 1000 * 60 * 2)) {
				logger.error('[iam lib] user\'s identity access/bearer token has expired');
				return cb({ statusCode: 403, error: 'identity access/bearer token is expired' });
			} else {
				iam.getIAMCertificate(tokenParts[0].kid, (err, cert) => {							// get the iam public cert, hopefully from cache
					if (err) {
						logger.error('[iam lib] unable to get IAM cert from IAM to verify identity access/bearer token (bearer token). error:', err);
						return cb({ statusCode: 500, error: 'unable to get IAM cert from IAM to validate bearer token [1]' });
					} else if (!cert) {
						logger.error('[iam lib] unable to get IAM cert to verify identity access/bearer token. cert is null.');
						return cb({ statusCode: 500, error: 'unable to get IAM cert from IAM to validate bearer token [2]' });
					} else {
						const valid_signature = valid_proposal_sig(jwt_access_token, cert.alg, cert.publicKey);
						if (!valid_signature) {
							logger.error('[iam lib] verification failure, signature on access/bearer is no good');
							return cb({ statusCode: 401, error: 'identity access/bearer token is invalid' });
						} else {
							logger.info('[iam lib] signature on identity access/bearer token is valid');
							return cb(null, null);												// its valid!
						}
					}
				});
			}
		}

		// check if the jwt's signature is valid
		// this function has the same parameters and response as jws.verify()
		// https://github.com/brianloveswords/node-jws/blob/master/lib/verify-stream.js#L44
		// so far mine works with IAM perfectly, but if it breaks, replace with t.jws.verify(jwt_access_token, cert.alg, cert.publicKey)
		function valid_proposal_sig(jwt, alg, public_key) {
			let valid = false;
			try {
				const pubKeyObj = t.KEYUTIL.getKey(public_key);						// load the IAM public key
				const signature = jwt.split('.')[2];								// grab the signature from the 3rd pos in the jwt
				const payload = jwt.split('.', 2).join('.');						// grab the payload, first two positions.
				valid = pubKeyObj.verify(payload, (Buffer.from(signature, 'base64').toString('hex')));	// verify signature against payload
			} catch (e) {
				logger.error('[iam lib] thrown error when checking jwt signature', e);
			}
			return valid;
		}
	};

	// --------------------------------------------------------------------------------------------
	// Ask IAM for all permitted actions to this resource  - [http only, no cache] - (Used for browser authorization)
	// - subject is aka user
	// - the iam cache is not used to remember actions. the actions get stored in our session, so the actions will be cached by the session cache
	// - users must invalidate their session to refresh iam actions
	// - [ WARNING ]
	//		- IAM's API will give you a 403 response even if your auth is correct but the instance you requesting dne.
	// 		- this can easily happen if a dev forgets to use **staging** iam with a **staging** crn string (same with prod)
	// --------------------------------------------------------------------------------------------
	iam.getPermittedActionsHttp = (profile, cb) => {
		const opts = {
			url: ev.IAM.URL,
			api_key: ev.IAM_API_KEY,
		};
		iam.getAccessToken(opts, (err, service_body) => {		// get our identity access token (uses cache)
			if (err || !service_body) {
				logger.error(`[iam lib] error - problem getting access token. IAM_API_KEY: ${opts.api_key}. ${err}`);
				return cb({ statusCode: 500, error: 'problem getting access token' });
			}

			// -------- Make body for the IAM api `/v2/authz/roles` --------
			// first entry in body is for the subject against account for all blockchain services
			// 2nd entry in body is for the subject against a specific service instance
			const body = [{
				subject: {
					attributes: {
						id: profile ? profile.iam_id : null, 	// something like 'IBMid-2700072P13',
						scope: 'ibm openid blockchain'			// field seems optional
					}
				},
				resource: {
					crn: 'crn:' + ev.CRN.version +				// build the crn without the iid
						':' + ev.CRN.c_name +
						':' + ev.CRN.c_type +
						':' + ev.CRN.service_name +
						':' + ev.CRN.location +
						':' + ev.CRN.account_id +
						':::',
				},
				environment: {},								// field seems optional
				requestId: t.misc.simpleRandomString(8)
			}, {
				subject: {
					attributes: {
						id: profile ? profile.iam_id : null, 	// something like 'IBMid-2700072P13',
						scope: 'ibm openid blockchain'			// field seems optional
					}
				},
				resource: {
					crn: ev.CRN_STRING,							// build the crn with the iid
				},
				environment: {},								// field seems optional
				requestId: t.misc.simpleRandomString(8)
			}];
			logger.debug('[iam lib] asking iam for subject\'s roles on acc:', ev.CRN.account_id, 'and iid:', ev.CRN.instance_id, body[1].requestId);

			const tx_id = t.misc.simpleRandomString(12);
			const options = {
				baseUrl: ev.IAM.URL,
				url: '/v2/authz/roles',
				body: JSON.stringify(body),
				method: 'POST',
				headers: {
					'Authorization': service_body.access_token,
					'Accept': 'application/vnd.authzroles.v2+json',
					'Transaction-ID': tx_id,
					'Content-Type': 'application/json'
				},
				timeout: ev.HTTP_TIMEOUT / 2,
				_name: 'iam lib',								// name to use in logs
				_max_attempts: 3,
				_tx_id: tx_id,
			};
			const start_time = Date.now();
			t.misc.retry_req(options, (error, resp) => {		// retry on 429's and such
				const code = t.ot_misc.get_code(resp);
				if (t.ot_misc.is_error_code(code)) {
					logger.error('[iam lib] received error response:', tx_id, code, (resp ? resp.body : null));
					return cb({ statusCode: code, error: 'problem authenticating user with IAM. check logs for details.' });
				} else {
					const end_time = Date.now();
					const elapsed_ms = end_time - start_time;
					logger.debug('[iam lib] elapsed time', t.misc.friendly_ms(elapsed_ms), tx_id);				// keep an eye on how long

					const body = format_body(tx_id, resp);
					logger.debug('[iam lib] iam response (for /v2/authz/roles):', tx_id, JSON.stringify(delete_noise(body)));
					const lc_permitted_actions = get_permitted_actions_from_roles(tx_id, body);
					const is_permitted = is_permitted_action(lc_permitted_actions, ev.STR.VIEW_ACTION, tx_id);	// need reader role

					if (is_permitted === -1) {					// error already logged
						const ret = {
							statusCode: 500,
							error: 'parse error. could not understand iam',
							iid: ev.CRN.instance_id,
							tx_id: tx_id,
						};
						return cb(ret, null);
					} else if (is_permitted === false) {		// error already logged
						const ret = {
							statusCode: 401,
							error: 'the user was not authorized for this action',
							iid: ev.CRN.instance_id,
							tx_id: tx_id,
						};
						return cb(ret, null);
					} else {
						return cb(null, { permitted_actions: lc_permitted_actions });
					}
				}
			});
		});
	};

	// the iam response has a huge payload, a lot of it is junk, remove it so it doesn't clutter the logs as much... its still bad though
	function delete_noise(iam_body) {
		try {
			const clone_body = JSON.parse(JSON.stringify(iam_body));
			for (let i in clone_body.responses) {
				delete clone_body.responses[i].platformExtensions;
			}
			return clone_body;
		} catch (e) { }
		return iam_body;					// if we can't make it smaller at least nobody can say we didn't try
	}

	// --------------------------------------------------------------------------------------------
	// convert an IAM api key for an IAM access token
	// --------------------------------------------------------------------------------------------
	iam.exchange_api_key = (iam_api_key, cb) => {
		const opts = {
			url: ev.IAM.URL,
			api_key: iam_api_key,
		};
		iam.getAccessToken(opts, (err, service_body) => {
			// error already logged
			return cb(err, service_body ? service_body.access_token : null);
		});
	};

	//=======================================================================================================
	// Cache Functions
	//=======================================================================================================
	// write "value" to the cache under "key"
	iam.write2cache = (key, value, expires_s, cb) => {
		if (!ev.IAM_CACHE_ENABLED) {
			if (cb) { return cb(null, value); }
		} else if (!key) {
			logger.warn('[iam-lib] missing key to write 2 cache...');
			if (cb) { return cb(500, value); }
		} else {
			nodejsCache.set(key, value, expires_s);
			if (cb) { return cb(null, value); }
		}
	};

	// evict a key based on options
	iam.evict = (key, cb) => {
		if (ev.IAM_CACHE_ENABLED) {
			const resp = nodejsCache.del(key);
			if (cb) { return cb(null, resp); }
		} else {
			if (cb) { return cb(null, null); }
		}
	};

	// evict all keys
	iam.flush_cache = () => {
		if (ev.IAM_CACHE_ENABLED) {
			nodejsCache.flushAll();
		}
	};

	// get stats
	iam.get_stats = () => {
		if (!ev.IAM_CACHE_ENABLED) {
			return null;
		} else {
			return nodejsCache.getStats();
		}
	};

	return iam;
};
