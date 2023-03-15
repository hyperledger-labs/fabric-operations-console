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
// middleware.js - Middleware for Athena
//------------------------------------------------------------

module.exports = function (logger, ev, t) {
	const exports = {};
	const schemes = {
		appid: require('./appid_middleware.js')(logger, ev, t, exports),
		ibmid: require('./ibmid_middleware.js')(logger, ev, t),
		iam: require('./ibmid_middleware.js')(logger, ev, t),
		couchdb: require('./couchdb_middleware.js')(logger, ev, t, exports),
		ldap: require('./ldap_middleware.js')(logger, ev, t, exports),
		oauth: require('./oauth_middleware.js')(logger, ev, t, exports),
	};
	const eTrack = t.event_tracker.trackViaIntercept;

	//----------------------------------------------------------------------------------------------------------------------
	// Pick the right middleware - returns array of middle functions that set required "actions" AND authentication + authorization middleware
	//----------------------------------------------------------------------------------------------------------------------

	// create a middleware that only tracks the api, no auth
	exports.public = [storeIAMTokens, eTrack];

	// create saas components
	exports.verify_create_action_session = [eTrack, blockReadOnlyMode, isDeployerConfigured, needCreateAction, checkAuthentication, permitAction];
	exports.verify_create_action_ak = [eTrack, blockReadOnlyMode, isDeployerConfigured, needCreateAction, allowAkToDoAction];

	// delete saas components
	exports.verify_delete_action_session = [eTrack, blockReadOnlyMode, isDeployerConfigured, needDeleteAction, checkAuthentication, permitAction];
	exports.verify_delete_action_ak = [eTrack, blockReadOnlyMode, isDeployerConfigured, needDeleteAction, allowAkToDoAction];

	// import component
	exports.verify_import_action_session = [eTrack, blockReadOnlyMode, needImportAction, checkAuthentication, permitAction];
	exports.verify_import_action_ak = [eTrack, blockReadOnlyMode, needImportAction, allowAkToDoAction];

	// remove imported component
	exports.verify_remove_action_session = [eTrack, blockReadOnlyMode, needRemoveAction, checkAuthentication, permitAction];
	exports.verify_remove_action_ak = [eTrack, blockReadOnlyMode, needRemoveAction, allowAkToDoAction];

	// manage a component
	exports.verify_manage_action_session = [eTrack, blockReadOnlyMode, needManageAction, checkAuthentication, permitAction];
	exports.verify_manage_action_ak = [eTrack, blockReadOnlyMode, needManageAction, allowAkToDoAction];
	exports.verify_manage_action_session_dep = [eTrack, blockReadOnlyMode, isDeployerConfigured, needManageAction, checkAuthentication, permitAction];
	exports.verify_manage_action_ak_dep = [eTrack, blockReadOnlyMode, isDeployerConfigured, needManageAction, allowAkToDoAction];

	// manage migration (these are allowed during read only mode)
	exports.verify_migration_action_session_dep = [eTrack, isDeployerConfigured, needManageAction, checkAuthentication, permitAction];
	exports.verify_migration_action_ak_dep = [eTrack, isDeployerConfigured, needManageAction, allowAkToDoAction];

	// restart athena
	exports.verify_restart_action_session = [eTrack, needRestartAction, checkAuthentication, permitAction];
	exports.verify_restart_action_ak = [eTrack, needRestartAction, allowAkToDoAction];

	// log settings
	exports.verify_logs_action_session = [eTrack, needLogsAction, checkAuthentication, permitAction];
	exports.verify_logs_action_ak = [eTrack, needLogsAction, allowAkToDoAction];

	// view ui
	exports.verify_view_action_session = [eTrack, needViewAction, checkAuthentication, permitAction];
	exports.verify_view_action_ak = [eTrack, needViewAction, allowAkToDoAction];
	exports.verify_view_action_session_dep = [eTrack, isDeployerConfigured, needViewAction, checkAuthentication, permitAction];
	exports.verify_view_action_ak_dep = [eTrack, isDeployerConfigured, needViewAction, allowAkToDoAction];

	// change athena settings
	exports.verify_settings_action_session = [eTrack, needSettingsAction, checkAuthentication, permitAction];
	exports.verify_settings_action_ak = [eTrack, needSettingsAction, allowAkToDoAction];

	// manage athena users (not valid on SaaS)
	exports.verify_users_action_session = [eTrack, blockReadOnlyMode, needUsersAction, checkAuthentication, permitAction];
	exports.verify_users_action_init_session = [eTrack, blockReadOnlyMode, needUsersAction, permitActionInit];	// special for 'initial'
	exports.verify_users_action_ak = [eTrack, blockReadOnlyMode, needUsersAction, allowAkToDoAction];
	exports.verify_users_action_init_ak = [eTrack, blockReadOnlyMode, needUsersAction, allowAkToDoActionInit];		// special for 'initial'

	// manage api keys (not valid on SaaS)
	exports.verify_apiKey_action_session = [eTrack, blockReadOnlyMode, needApiKeyAction, checkAuthentication, permitAction];
	exports.verify_apiKey_action_ak = [eTrack, blockReadOnlyMode, needApiKeyAction, allowAkToDoAction];

	// manage notifications
	exports.verify_notifications_action_session = [eTrack, needNotificationAction, checkAuthentication, permitAction];
	exports.verify_notifications_action_ak = [eTrack, needNotificationAction, allowAkToDoAction];

	// manage signature collections
	exports.verify_sigCollections_action_session = [eTrack, blockReadOnlyMode, needSigCollectionsAction, checkAuthentication, permitAction];
	exports.verify_sigCollections_action_ak = [eTrack, blockReadOnlyMode, needSigCollectionsAction, allowAkToDoAction];

	//--------------------------------------------------
	// Make a bunch of fake middleware functions to append the needed action
	//--------------------------------------------------
	function needCreateAction(req, res, next) {
		if (!req.actions) { req.actions = []; }
		if (req.method === 'GET') {						// all get methods are okay for viewers - proxy deployer APIs calls this
			req.actions.push(ev.STR.VIEW_ACTION);
		} else {
			req.actions.push(ev.STR.CREATE_ACTION);
		}
		return next();
	}
	function needDeleteAction(req, res, next) {
		if (!req.actions) { req.actions = []; }
		req.actions.push(ev.STR.DELETE_ACTION);
		return next();
	}
	function needImportAction(req, res, next) {
		if (!req.actions) { req.actions = []; }
		req.actions.push(ev.STR.IMPORT_ACTION);
		return next();
	}
	function needRemoveAction(req, res, next) {
		if (!req.actions) { req.actions = []; }
		req.actions.push(ev.STR.REMOVE_ACTION);
		return next();
	}
	function needManageAction(req, res, next) {
		if (!req.actions) { req.actions = []; }
		req.actions.push(ev.STR.C_MANAGE_ACTION);
		return next();
	}
	function needRestartAction(req, res, next) {
		if (!req.actions) { req.actions = []; }
		req.actions.push(ev.STR.RESTART_ACTION);
		return next();
	}
	function needLogsAction(req, res, next) {
		if (!req.actions) { req.actions = []; }
		req.actions.push(ev.STR.LOGS_ACTION);
		return next();
	}
	function needViewAction(req, res, next) {
		if (!req.actions) { req.actions = []; }
		req.actions.push(ev.STR.VIEW_ACTION);
		return next();
	}
	function needSettingsAction(req, res, next) {
		if (!req.actions) { req.actions = []; }
		req.actions.push(ev.STR.SETTINGS_ACTION);
		return next();
	}
	function needUsersAction(req, res, next) {
		if (!req.actions) { req.actions = []; }
		req.actions.push(ev.STR.USERS_ACTION);
		return next();
	}
	function needApiKeyAction(req, res, next) {
		if (!req.actions) { req.actions = []; }
		req.actions.push(ev.STR.API_KEY_ACTION);
		return next();
	}
	function needNotificationAction(req, res, next) {
		if (!req.actions) { req.actions = []; }
		req.actions.push(ev.STR.NOTIFICATIONS_ACTION);
		return next();
	}
	function needSigCollectionsAction(req, res, next) {
		if (!req.actions) { req.actions = []; }
		req.actions.push(ev.STR.SIG_COLLECTION_ACTION);
		return next();
	}

	//----------------------------------------------------------------------------------------------------------------------
	// Actual Middleware
	//----------------------------------------------------------------------------------------------------------------------

	//--------------------------------------------------
	// Add this middleware to routes that cannot be used during read-only-mode - (GET routes are still allowed)
	//--------------------------------------------------
	function blockReadOnlyMode(req, res, next) {
		if (ev.READ_ONLY && (req && req.method !== 'GET')) {									// if in read only mode, deny this api
			logger.debug('[middle] this api is not available when the setting "read_only_enabled" is true');
			const resp = {
				statusCode: 503,
				error: 'api is not available',
				msg: 'this api is not available to Consoles in read only mode'
			};
			return res.status(503).json(resp);
		} else {
			return next();
		}
	}

	//--------------------------------------------------
	// Check if deployer setting is set (this disables apis that need deployer)
	//--------------------------------------------------
	function isDeployerConfigured(req, res, next) {
		if (ev.IMPORT_ONLY) {
			logger.debug('[middle] this api requires deployer, but the "import_only_enabled" setting indicates there is no deployer.');
			const resp = {
				statusCode: 503,
				error: 'api is not available',
				msg: 'this api is not available to Console\'s without the "deployer" counterpart'
			};
			return res.status(503).json(resp);
		} else {
			return next();
		}
	}

	//--------------------------------------------------
	// Check basic authorization/token for valid api key - middleware
	//--------------------------------------------------
	function allowAkToDoActionInit(req, res, next) {
		if (ev.AUTH_SCHEME === 'initial') {									// if initial, allow them in
			return next();
		} else {
			return allowAkToDoAction(req, res, next);
		}
	}

	// see if the api key request is allowed to do this action (takes optools basic auth, iam bearer token, or iam api key auth)
	function allowAkToDoAction(req, res, next) {
		const parsed_auth = t.auth_header_lib.parse_auth(req);
		if (parsed_auth && parsed_auth.type === ev.STR.BEARER) {			// 1. try the bearer auth first
			req._access_token = parsed_auth.token;							// set this now so getUuid() can grab it
			if (parsed_auth.sub_type === ev.STR.IBP_TOKEN) {				// is it our bearer token or IAM's?
				logger.debug('[middle] *ibp* bearer/access token will be used to authenticate req.');

				t.permissions_lib.get_access_token(parsed_auth.token, (err, access_token_doc) => {
					if (err || !access_token_doc) {
						logger.error('[middle] malformed *ibp* bearer/access');
						return exports.unauthorized(res);
					} else if (!validIBPBearerAuth(access_token_doc, req)) {
						logger.warn('[middle] invalid *ibp* bearer/access');
						return exports.forbidden(req, res);
					} else {
						logger.debug('[middle] valid *ibp* bearer/access');
						req.using_api_key = access_token_doc ? access_token_doc.created_by : null;
						req._email = access_token_doc ? access_token_doc.created_by : null;
						return next();
					}
				});

			} else {
				logger.debug('[middle] iam bearer/access token will be used to authenticate req.');
				t.iam_lib.isAuthorizedWithIBP(req, res, () => {
					return next();
				});
			}
		} else if (parsed_auth && parsed_auth.type === ev.STR.KEY) {		// 2. now try iam api key auth
			logger.debug('[middle] iam api key detected - exchanging it for a bearer token to authenticate req');
			t.iam_lib.exchange_api_key(parsed_auth.api_key, (exchange_error, bearer_token) => {
				if (exchange_error || !bearer_token) {
					logger.error('[middle] unable to exchange iam api key for bearer token, thus unable to auth req', bearer_token);	// error already logged
					return res.status(t.ot_misc.get_code(exchange_error)).json({ error: 'unable to exchange IAM api key for a bearer token' });
				} else {
					logger.debug('[middle] able to exchange iam api key for bearer token, will use bearer token to authenticate req');
					req._access_token = bearer_token;						// set this now so getUuid() can grab it
					req.headers.authorization = 'Bearer ' + bearer_token;	// rewrite the header so we can use the same bearer token logic
					t.iam_lib.isAuthorizedWithIBP(req, res, () => {			// 2.1 try the bearer auth
						return next();
					});
				}
			});
		} else if (parsed_auth && parsed_auth.type === ev.STR.BASIC) {		// 3. okay, next look for optools basic auth
			logger.debug('[middle] optools api key will be used to authenticate req');
			verify_api_key(req, res, () => {
				return next();
			});
		} else if (parsed_auth && parsed_auth.type === ev.STR.SIG) {		// 4. okay, last chance look for sig collection signature based auth
			logger.debug('[middle] sig collection signature will be used to authenticate req');
			t.signature_collection_lib.validateApiSignature(req, res, () => {
				return next();
			});
		} else {															// 5. no valid auth, give up
			logger.error('[middle] no valid auth found in request, go fish.', parsed_auth);
			return exports.unauthorized(res);
		}

		// check if the optools api key exist and has the right "role"
		function verify_api_key(req, res, cb) {
			const user = parsed_auth;
			const lc_username = (user && user.name) ? user.name.toLowerCase() : null;
			if (!user || !user.name || !user.pass) {
				logger.error('[middle] no basic auth provided');
				return exports.unauthorized(res);
			} else {
				req.using_api_key = user.name;

				// [1] - check if using support key
				if (user.name === ev.SUPPORT_KEY) {
					if (!validSupportKey(req)) {									// check the support key first
						return exports.unauthorized(res);
					} else if (!validSupportKeyAction(req)) {						// check the support key first
						return exports.forbidden(req, res);
					} else {
						logger.debug('[middle] valid basic auth key/secret [1]');
						return cb();
					}
				}

				// [2] - check if using migration key
				else if (user.name === ev.STR.MIGRATION_KEY) {
					if (!validMigrationKey(req)) {									// check the migration key
						return exports.unauthorized(res);
					} else if (!validMigrationKeyAction(req)) {						// check the support key
						return exports.forbidden(req, res);
					} else {
						logger.debug('[middle] valid basic auth key/secret [3]');
						return cb();
					}
				}

				// [3] - check if using user's basic auth
				else if (ev.ACCESS_LIST && ev.ACCESS_LIST[lc_username]) {
					if (!validUserBasicAuth(lc_username, user.pass)) {
						return exports.unauthorized(res);
					} else if (!validUserBasicAuthAction(lc_username)) {			// check the support key first
						return exports.forbidden(req, res);
					} else {
						logger.debug('[middle] valid basic auth key/secret [2]');
						return cb();
					}
				}

				// [3] check for api key in db
				else {
					const opts = {									// find the api key, its id should be in the username field
						db_name: ev.DB_SYSTEM,
						_id: user.name,
					};
					t.otcc.getDoc(opts, (err, doc) => {
						if (err || !doc) {													// invalid username
							logger.error(`[middle] problem getting the api key doc for key id ${user.name}`);
							return exports.unauthorized(res);
						} else {
							const valid_secret = t.misc.verify_secret(user.pass, doc.salt, doc.hashed_secret);

							if (!valid_secret) {											// invalid secret
								logger.error('[middle] invalid api key secret for api key id:', user.name);
								return exports.unauthorized(res);
							} else if (!permit_actions_in_req(doc, req)) {					// not a permitted action for api key
								logger.error('[middle] invalid api key for desired actions:', req.actions, '. api key id:', user.name, 'roles:', doc.roles);
								return exports.unauthorized(res);
							} else {														// all good
								logger.debug('[middle] valid api key id/secret and role', doc.roles);
								return cb();
							}
						}
					});
				}
			}
		}

		// Check basic authorization username/password for the support api key
		function validSupportKey(req) {
			const user = parsed_auth;
			if (user && user.name && user.pass && user.name !== ev.SUPPORT_KEY || user.pass !== ev.SUPPORT_PASSWORD) {
				return false;
			} else {
				logger.error('[middle] invalid api key:', req.actions);
				return true;
			}
		}

		// Check basic authorization username/password for the migration api key
		function validMigrationKey(req) {
			const user = parsed_auth;
			if (user && user.name && user.pass && user.name === ev.STR.MIGRATION_KEY && user.pass === ev.MIGRATION_API_KEY) {
				return true;
			} else {
				logger.error('[middle] invalid migration api key:', req.actions);
				return false;
			}
		}

		// Check support api key has permissions to do these actions/roles
		function validSupportKeyAction(req) {
			let valid = true;
			const lc_actions = [				// list of actions the support key can do
				ev.STR.RESTART_ACTION, ev.STR.LOGS_ACTION, ev.STR.VIEW_ACTION, ev.STR.SETTINGS_ACTION,
				ev.STR.NOTIFICATIONS_ACTION, ev.STR.SIG_COLLECTION_ACTION, ev.STR.C_MANAGE_ACTION
			];
			for (let i in req.actions) {
				if (typeof req.actions[i] === 'string') {
					if (!lc_actions.includes(req.actions[i].toLowerCase())) {
						valid = false;
						break;
					}
				}
			}

			if (!valid) {						// not a permitted action for user
				logger.error('[middle] invalid action for api key, desired actions:', req.actions);
				return false;
			} else {
				return true;
			}
		}

		// Check support api key has permissions to do these actions/roles
		function validMigrationKeyAction(req) {
			let valid = true;
			const lc_actions = [				// list of actions the migration key can do
				ev.STR.VIEW_ACTION, ev.STR.SETTINGS_ACTION
			];
			for (let i in req.actions) {
				if (typeof req.actions[i] === 'string') {
					if (!lc_actions.includes(req.actions[i].toLowerCase())) {
						valid = false;
						break;
					}
				}
			}

			if (!valid) {						// not a permitted action for user
				logger.error('[middle] invalid action for api key, desired actions:', req.actions);
				return false;
			} else {
				return true;
			}
		}

		// check basic authorization for the user's account
		function validUserBasicAuth(username, password) {
			let salt = ev.ACCESS_LIST[username].salt;
			let known_hashed_secret = ev.ACCESS_LIST[username].hashed_secret;
			if (!known_hashed_secret) {

				// if we are a Software OpTools AND the request is for creating an API key -> let it work if request's password matches the default password
				if (ev.AUTH_SCHEME !== 'iam' && req.method === 'POST' &&
					// these routes are allowed to use the default pass
					(req.path.includes('/permissions/keys') || req.path.includes('/identity/token') || req.path.includes('/settings'))
					|| (ev.AUTH_SCHEME !== 'iam' && ev.ALLOW_DEFAULT_PASSWORD)) {
					logger.warn('[middle] no password set for user. checking against default password:', t.misc.censorEmail(username));
					const secret_details = t.misc.salt_secret(ev.DEFAULT_USER_PASSWORD);
					salt = secret_details.salt;
					known_hashed_secret = secret_details.hashed_secret;
				}

				// else let it fail, user has no password set, no go
				else {
					logger.error('[middle] user cannot authenticate. no password set for user:', t.misc.censorEmail(username));
					return false;
				}
			}

			// check hash of password
			const valid_password = t.misc.verify_secret(password, salt, known_hashed_secret);	// check if input is correct
			if (!valid_password) {
				logger.error('[middle] user cannot authenticate. invalid password for user:', t.misc.censorEmail(username));
				return false;
			} else {
				return true;
			}
		}

		// check if the username has permissions to do these actions/roles
		function validUserBasicAuthAction(username) {
			const obj = ev.ACCESS_LIST[username];
			if (!permit_actions_in_req(obj, req)) {						// not a permitted action for user
				logger.error('[middle] invalid user for desired actions:', req.actions, '. user:', t.misc.censorEmail(username),
					'roles:', obj.roles);
				return false;
			} else {
				return true;
			}
		}

		// check if all actions in request exist in api key doc
		function permit_actions_in_req(doc, req) {
			if (!doc) {
				return false;
			}

			const lc_actions = exports.buildActionsFromRoles(doc.roles, doc._id);
			req.permitted_actions = lc_actions;			// remember actions, comp lib uses this to redact if not manager
			for (let i in req.actions) {
				if (Array.isArray(lc_actions) && typeof req.actions[i] === 'string') {
					if (!lc_actions.includes(req.actions[i].toLowerCase())) {
						return false;
					}
				}
			}
			return true;
		}

		// check if the access token has permissions to do these actions/roles && that it is not expired
		function validIBPBearerAuth(doc, req) {
			const access_token = doc ? doc._id : null;
			const time_left_ms = doc ? (doc.expiration - Date.now()) : 0;
			if (!permit_actions_in_req(doc, req)) {						// not a permitted action for user
				logger.error('[middle] access token has invalid permission for desired actions:', req.actions, '. token:', access_token,
					'roles:', doc.roles);
				return false;
			} else if (time_left_ms <= 0) {
				logger.error('[middle] access token has expired. token:', access_token);
				return false;
			} else {
				return true;
			}
		}
	}

	//--------------------------------------------------
	// Check if user has logged in yet - middleware
	//--------------------------------------------------
	exports.checkAuthentication = checkAuthentication;	// function and export are needed so that the middleware helpers resolve correctly + test can reach this
	function checkAuthentication(req, res, next) {
		if (ev.AUTH_SCHEME === 'initial') {			// initial is not a valid auth scheme, user should go through UI and setup appid/ibmid
			logger.warn('[middle] Auth scheme is "initial".  Cannot authorize someone in this state');
			return res.status(401).json({ error: 'login to use this api' });
		} else {
			let scheme = schemes[ev.AUTH_SCHEME] ? schemes[ev.AUTH_SCHEME] : schemes.iam;

			if (!scheme.isAuthenticated(req)) {
				logger.warn('[middle] Could not find valid session data for user...', ev.AUTH_SCHEME, t.misc.censorEmail(exports.getEmail(req)));
				logger.warn('[middle] Session:', JSON.stringify(req.session));
				return res.status(401).json({ error: 'login to use this api' });
			} else {
				logger.debug('[middle] User is authenticated with', ev.AUTH_SCHEME, t.misc.censorEmail(exports.getEmail(req)));
				next();
			}
		}
	}

	//--------------------------------------------------
	// See if the user can do the request - middleware
	//--------------------------------------------------
	function permitAction(req, res, next) {
		if (!exports.isAuthorized(req)) {
			exports.forbidden(req, res);
		} else {
			next();
		}
	}

	//--------------------------------------------------
	// See if the user can do the request - middleware
	//--------------------------------------------------
	function permitActionInit(req, res, next) {
		if (ev.AUTH_SCHEME === 'initial') {					// anyone can edit initial
			return next();
		} else {
			return permitAction(req, res, next);
		}
	}

	// --------------------------------------------------
	// detect iam tokens for migration and store them - middleware
	// --------------------------------------------------
	function storeIAMTokens(req, res, next) {
		if (!req || !req.query || !req.query.accessToken) {
			return next();																// return to next middleware
		} else {
			logger.debug('[migration] found iam access token in request');

			const parsed_access_token = t.permissions_lib.parse_ibp_token(req.query.accessToken);
			if (!parsed_access_token) {
				return next();															// return to next middleware
			} else {
				const doc = {
					_id: parsed_access_token.iam_id,
					type: 'iam_token',
					timestamp: Date.now(),
					accessToken: req.query.accessToken,
					refreshToken: req.query.refreshToken,
					parsedMetaData: parsed_access_token
				};

				// find if we already have a token doc (we only want to store 1, reuse the doc if its already here)
				t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: doc._id, SKIP_CACHE: true }, (err, access_token_doc) => {
					if (err || !access_token_doc) {
						logger.debug('[migration] existing iam access token doc not found, will create it');
					} else {
						logger.debug('[migration] existing iam access token doc is found, will overwrite it');
						doc._rev = access_token_doc._rev;											// copy rev so we can overwrite
					}

					// create new doc or edit existing doc
					t.otcc.writeDoc({ db_name: ev.DB_SYSTEM }, t.misc.sortKeys(doc), (err, wrote_doc) => {
						if (err) {
							logger.error('[migration] - could not write iam access token doc', err);
						} else {
							logger.debug('[migration] - created/edited iam access token doc', wrote_doc._id);
						}
						return next();																// always return to next middleware
					});
				});
			}
		}
	}

	//----------------------------------------------------------------------------------------------------------------------
	// Middleware helpers
	//----------------------------------------------------------------------------------------------------------------------

	//--------------------------------------------------
	// Check if user has logged in yet
	//--------------------------------------------------
	exports.isAuthenticated = (req) => {
		if (!req) {
			logger.error('improper usage of "isAuthenticated()". req was not passed in');
			return null;
		} else {
			let scheme = schemes[ev.AUTH_SCHEME] ? schemes[ev.AUTH_SCHEME] : schemes.iam;
			return scheme.isAuthenticated(req) === true;
		}
	};

	//--------------------------------------------------
	// Check if user can actually do this operation
	//--------------------------------------------------
	exports.isAuthorized = (req) => {
		let scheme = schemes[ev.AUTH_SCHEME] ? schemes[ev.AUTH_SCHEME] : schemes.iam;
		if (!scheme.isAuthenticated(req)) {
			return null;
		} else {
			let lc_authorized_actions = exports.getActions(req);
			for (let i in req.actions) {
				if (!lc_authorized_actions.includes(req.actions[i].toLowerCase())) {	// all actions must be present
					return false;
				}
			}
			return true;
		}
	};

	//--------------------------------------------------
	// Get the user's actions
	//--------------------------------------------------
	exports.getActions = (req) => {
		if (!req) {
			logger.error('improper usage of "getActions()". req was not passed in');
			return null;
		} else {
			let scheme = schemes[ev.AUTH_SCHEME] ? schemes[ev.AUTH_SCHEME] : schemes.iam;
			const actions = scheme.getActions(req).sort();
			if (!actions || actions.length === 0 && req.permitted_actions) {
				return req.permitted_actions;			// ak routes will use this, b/c no session
			} else {
				return actions;							// sessions routes use this
			}
		}
	};

	//--------------------------------------------------
	// Get the user's name
	//--------------------------------------------------
	exports.getName = (req) => {
		if (!req) {
			logger.error('improper usage of "getName()". req was not passed in');
			return null;
		} else {
			let scheme = schemes[ev.AUTH_SCHEME] ? schemes[ev.AUTH_SCHEME] : schemes.iam;
			return scheme.getName(req);
		}
	};

	//--------------------------------------------------
	// Get the user's email address
	//--------------------------------------------------
	exports.getEmail = (req) => {
		if (!req) {
			logger.error('improper usage of "getEmail()". req was not passed in');
			return null;
		} else {
			let scheme = schemes[ev.AUTH_SCHEME] ? schemes[ev.AUTH_SCHEME] : schemes.iam;
			return scheme.getEmail(req);
		}
	};

	//--------------------------------------------------
	// Get the user's email address
	//--------------------------------------------------
	exports.getPasswordType = (req) => {
		if (!req) {
			logger.error('improper usage of "getPasswordType()". req was not passed in');
			return null;
		} else {
			let scheme = schemes[ev.AUTH_SCHEME] ? schemes[ev.AUTH_SCHEME] : schemes.iam;
			if (!scheme.getPasswordType) {
				logger.error('current auth scheme does not support "getPasswordType"');
				return null;
			} else {
				return scheme.getPasswordType(req);
			}
		}
	};

	//--------------------------------------------------
	// Get the user's ID
	//--------------------------------------------------
	exports.getUuid = (req) => {
		if (!req) {
			logger.error('improper usage of "getUuid()". req was not passed in');
			return null;
		} else {

			// first choice - session auth should end up here
			let scheme = schemes[ev.AUTH_SCHEME] ? schemes[ev.AUTH_SCHEME] : schemes.iam;
			const uuid = scheme.getUuid(req);
			if (uuid) {
				return uuid;
			}

			// second choice - bearer token/api-key auth should end up here
			// get "iam_id" from inside the access token (aka bearer token) if one was provided to the request
			if (req._access_token) {
				const parts = req._access_token.split('.');							// its a jwk, split it
				if (parts && parts[1]) {
					try {
						const profile = JSON.parse(t.misc.decodeb64(parts[1]));		// JSON should be here
						if (profile && profile.iam_id) {
							return profile.iam_id;									// activity tracker lib wants the "iam_id" field
						}
					} catch (e) { }													// oh well it wasn't
				}
			}

			// third choice - basic auth should end up here
			if (req.headers) {														// if headers don't exist, we can't find the uuid
				const details = t.auth_header_lib.parse_auth(req);					// see if its basic auth and return the username
				if (details && details.name) {
					return details.name;
				}

				if (details && details.type === ev.STR.SIG) {						// for signature, just return the string signature. there is no user
					return details.type;
				}
			}

			// fourth choice - ldap && ibp bearer tokens should end up here
			if (req._email) {
				return req._email;													// gets censored later on, by get_username_for_log()
			}

			logger.warn('[middle] could not find a user id for the request');
			return null;
		}
	};

	//--------------------------------------------------
	// Get the auth in the request
	//--------------------------------------------------
	exports.getAuthType = (req) => {
		if (!req) {
			logger.error('[middle] improper usage of "getAuthType()". req was not passed in');
			return null;
		} else {
			const details = t.auth_header_lib.parse_auth(req);
			if (details && details.type) {
				return details.type;
			} else {
				return null;
			}
		}
	};

	//--------------------------------------------------
	// Get the user's "sub" field from IAM
	//--------------------------------------------------
	exports.getIamSub = (req) => {
		if (!req) {
			logger.error('improper usage of "getIamSub()". req was not passed in');
			return null;
		} else if (ev.AUTH_SCHEME !== 'iam') {
			return null;															// IAM fields won't exist in these schemes
		} else if (exports.getAuthType(req) === ev.STR.BASIC) {
			return null;															// IAM fields won't exist in basic auth requests
		} else {

			let scheme = schemes[ev.AUTH_SCHEME] ? schemes[ev.AUTH_SCHEME] : schemes.iam;
			const sub = scheme.getIamSub(req);
			if (sub) {
				return sub;
			}

			logger.warn('[middle] could not find IAM "sub" field in profile');
			return null;
		}
	};

	//--------------------------------------------------
	// Get the user's "iam_id" field from IAM
	//--------------------------------------------------
	exports.getIamId = (req) => {
		if (!req) {
			logger.error('improper usage of "getIamId()". req was not passed in');
			return null;
		} else if (ev.AUTH_SCHEME !== 'iam') {
			return null;															// IAM fields won't exist in these schemes
		} else if (exports.getAuthType(req) === ev.STR.BASIC) {
			return null;															// IAM fields won't exist in basic auth requests
		} else {
			let scheme = schemes[ev.AUTH_SCHEME] ? schemes[ev.AUTH_SCHEME] : schemes.iam;
			return scheme.getIamId(req);
		}
	};

	//--------------------------------------------------
	// See if this email is an admin - is not auth scheme specific - [deprecated  03/28/2019] [DO NOT USE]
	//--------------------------------------------------
	exports.emailIsAdmin = (email) => {
		const lc_email = (email && typeof email === 'string') ? email.toLowerCase() : null;
		if (ev.ACCESS_LIST) {
			if (lc_email && ev.ACCESS_LIST[lc_email] && ev.ACCESS_LIST[lc_email].admin === true) {
				return true;				// is an admin
			} else if (lc_email && ev.ACCESS_LIST[lc_email] && ev.ACCESS_LIST[lc_email].roles && ev.ACCESS_LIST[lc_email].roles.includes(ev.STR.MANAGER_ROLE)) {
				return true;				// is an admin
			} else {
				return false;
			}
		}
		return false;
	};

	//--------------------------------------------------
	// build actions from array of roles
	//--------------------------------------------------
	exports.buildActionsFromRoles = (roles, context) => {
		const actionsMap = {};													// use a map so we only get each unique action once
		if (Array.isArray(roles)) {
			for (let i in roles) {
				const lc_role = roles[i].toLowerCase();
				if (!ev.ROLES_TO_ACTIONS[lc_role]) {
					logger.warn('[appid] cannot find role "' + lc_role + '" in settings', context, Object.keys(ev.ROLES_TO_ACTIONS));
				} else {
					for (let a in ev.ROLES_TO_ACTIONS[lc_role]) {
						actionsMap[ev.ROLES_TO_ACTIONS[lc_role][a]] = true;		// add each actions, once
					}
				}
			}
		}
		const lc_actions = [];
		for (let action in actionsMap) {
			lc_actions.push(action.toLowerCase());								// dummy proof it with lowercase
		}
		return lc_actions;
	};

	//--------------------------------------------------
	// Get the user's session id - only first 6 characters, all lower case
	//--------------------------------------------------
	exports.getPartialSessionId = (req) => {
		if (!req) {
			logger.error('improper usage of "getPartialSessionId()". req was not passed in');
		} else {
			let sid = (req.session && req.session.sid) ? req.session.sid : null;
			if (sid && typeof sid === 'string') {
				return t.session_store._abb(t.session_store._safe_sid(sid));	// shorten it
			}
		}
		return '-';																// always return a string
	};

	//--------------------------------------------------
	// 401 failed to validate the basic auth username/password
	//--------------------------------------------------
	exports.unauthorized = (res) => {
		res.set('WWW-Authenticate', 'Basic realm=IBP' + ev.HOST_URL);	// todo - remove the realm header to prevent basic auth dialog boxes in browsers
		return res.status(401).send('Unauthorized');
	};

	//--------------------------------------------------
	// 403 username does not have permission for api
	//--------------------------------------------------
	exports.forbidden = (req, res) => {
		let scheme = schemes[ev.AUTH_SCHEME] ? schemes[ev.AUTH_SCHEME] : schemes.iam;
		const tx_id = t.ot_misc.buildTxId(req);
		logger.error('User does not have permission for this request...', ev.AUTH_SCHEME, t.misc.censorEmail(exports.getEmail(req)), tx_id);
		logger.error(tx_id, '- request has actions', req.actions, 'permitted_actions:', scheme.getActions(req));
		const ret = {
			authorized: false,
			error: 'username/api key is not authorized for these action(s)',
			attempted_actions: req.actions,
			iid: ev.CRN.instance_id,
			tx_id: tx_id,
		};
		return res.status(403).json(ret);
	};

	//--------------------------------------------------
	// If request origin is localhost return true
	//--------------------------------------------------
	exports.ip_is_localhost = (req) => {
		const ip = t.misc.format_ip(req.ip, false);
		return (ip === 'localhost');
	};

	//--------------------------------------------------
	// Build the roles for the user from its LDAP profile
	//--------------------------------------------------
	exports.build_roles_from_ldap = (ldap_profile) => {
		const roles = [];

		/*
		// users with in these groups will get this IBP role
		// ibpRole: ['group1Name', 'group2Name']
		ev.LDAP.LDAP_GROUP_MAP = {
			MANAGER: ['solidDevs'],
			WRITER: ['okDevs'],
			READER: ['sketchyDevs'],
		};

		// users with this attribute name and value will get this IBP role
		// ibpRole: 'attributeName = attributeValue'
		ev.LDAP.LDAP_ATTR_MAP = {
			MANAGER: 'title=test1',
			WRITER: 'title=test2',
			READER: 'title=test3',
		};
		*/

		// ------------ Default ------------ //
		if (t.misc.empty_obj(ev.LDAP.LDAP_GROUP_MAP) && t.misc.empty(ev.LDAP.LDAP_ATTR_MAP)) {
			logger.debug('[ldap auth] found role:', ev.STR.MANAGER_ROLE, 'via default.');
			roles.push(ev.STR.MANAGER_ROLE);
		} else {

			// ------------ Group based ------------ //
			if (!t.misc.empty_obj(ev.LDAP.LDAP_GROUP_MAP)) {
				for (let i in ldap_profile._groups) {
					const group = ldap_profile._groups[i].cn;
					if (group) {
						for (let role in ev.LDAP.LDAP_GROUP_MAP) {
							if (Array.isArray(ev.LDAP.LDAP_GROUP_MAP[role])) {
								if (ev.LDAP.LDAP_GROUP_MAP[role].includes(group)) {
									logger.debug('[ldap auth] found role:', role, 'via group:', group);
									roles.push(role);
								}
							}
						}
					}
				}
			}

			// ------------ Attribute based ------------ //
			for (let role in ev.LDAP.LDAP_ATTR_MAP) {
				if (typeof ev.LDAP.LDAP_ATTR_MAP[role] === 'string') {
					const parts = ev.LDAP.LDAP_ATTR_MAP[role].split('=');
					if (parts[0] && parts[1]) {
						const attr_name = parts[0];
						const attr_value = parts[1];
						if (ldap_profile[attr_name] && ldap_profile[attr_name] === attr_value) {
							logger.debug('[ldap auth] found role:', role, 'via attribute:', ev.LDAP.LDAP_ATTR_MAP[role]);
							roles.push(role);
						}
					}
				}
			}
		}

		return roles;
	};

	return exports;
};
