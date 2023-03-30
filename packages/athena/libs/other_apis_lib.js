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
// other_apis_lib.js - other apis functions
//------------------------------------------------------------
module.exports = function (logger, ev, t) {
	const exports = {};

	//--------------------------------------------------
	// Get non-sensitive settings for athena
	//--------------------------------------------------
	exports.get_ev_settings = () => {
		const now = Date.now();
		const ret = {											// compile the list of settings
			ATHENA_ID: process.env.ATHENA_ID || '?',
			AUTH_SCHEME: ev.AUTH_SCHEME || '?',
			REGION: ev.REGION || '?',
			DOMAIN: ev.DOMAIN,									// null is valid, don't make this a question mark
			PORT: Number(ev.PORT) || '?',
			DEPLOYER_URL: t.misc.redact_basic_auth(ev.DEPLOYER_URL) || '?',
			DB_SYSTEM: ev.DB_SYSTEM || '?',
			DB_COMPONENTS: ev.DB_COMPONENTS || '?',
			DB_SESSIONS: ev.DB_SESSIONS || '?',
			HOST_URL: ev.HOST_URL || '?',
			CONFIGTXLATOR_URL: ev.CONFIGTXLATOR_URL || '?',
			LANDING_URL: ev.LANDING_URL || '?',
			LOGIN_URI: ev.LOGIN_URI || '?',
			LOGOUT_URI: ev.LOGOUT_URI || '?',
			CALLBACK_URI: ev.CALLBACK_URI || '?',
			CRN_STRING: ev.CRN_STRING || '?',
			CRN: ev.CRN || {},
			ENVIRONMENT: ev.ENVIRONMENT || '?',
			TIMESTAMPS: {
				now: now,
				born: (ev.UPDATE_SCH && ev.UPDATE_SCH.born) ? ev.UPDATE_SCH.born : '?',
				next_settings_update: (ev.UPDATE_SCH && ev.UPDATE_SCH.next) ? t.misc.friendly_ms(ev.UPDATE_SCH.next - now) : '?',
				up_time: (ev.UPDATE_SCH && ev.UPDATE_SCH.born) ? t.misc.friendly_ms(now - ev.UPDATE_SCH.born) : '?',
			},
			FILE_LOGGING: {
				server: {
					path: t.log_lib.get_log_path(),
					file_name: t.log_lib.build_log_file_name(ev, t.log_lib.get_log_base_name('server'), 'server'),
					enabled: t.log_lib.is_file_logging_enabled(ev, 'server'),
					level: t.log_lib.get_logging_level(ev, 'server'),
				},
				client: {
					path: t.log_lib.get_log_path(),
					file_name: t.log_lib.build_log_file_name(ev, t.log_lib.get_log_base_name('client'), 'client'),
					enabled: t.log_lib.is_file_logging_enabled(ev, 'client'),
					level: t.log_lib.get_logging_level(ev, 'client'),
				}
			},
			FEATURE_FLAGS: ev.FEATURE_FLAGS || {},
			DEFAULT_CONSORTIUM: ev.DEFAULT_CONSORTIUM || {},
			PROXY_TLS_HTTP_URL: ev.PROXY_TLS_HTTP_URL,
			PROXY_TLS_WS_URL: ev.PROXY_TLS_WS_URL || '?',
			PROXY_TLS_FABRIC_REQS: ev.PROXY_TLS_FABRIC_REQS,	// false is valid, don't make this a question mark
			IAM_URL: ev.IAM ? (ev.IAM.URL || '?') : '?',
			IAM_CACHE_ENABLED: ev.IAM_CACHE_ENABLED,			// false is valid, don't make this a question mark
			IBM_ID_URL: ev.IBM_ID ? (ev.IBM_ID.URL || '?') : '?',
			IBM_ID_CALLBACK_URL: (ev.HOST_URL + ev.LOGIN_URI) || '?',
			INFRASTRUCTURE: ev.INFRASTRUCTURE || '?',
			MAX_REQ_PER_MIN: ev.MAX_REQ_PER_MIN || '?',
			CSP_HEADER_VALUES: ev.CSP_HEADER_VALUES || '?',
			CLUSTER_DATA: ev.CLUSTER_DATA || {},
			IGNORE_CONFIG_FILE: ev.IGNORE_CONFIG_FILE === true,	// false is valid, don't make this a question mark',
			TRUST_UNKNOWN_CERTS: ev.TRUST_UNKNOWN_CERTS === true, // false is valid, don't make this a question mark
			MAX_REQ_PER_MIN_AK: ev.MAX_REQ_PER_MIN || '?',
			VERSIONS: t.ot_misc.parse_versions(),
			MEMORY_CACHE_ENABLED: ev.MEMORY_CACHE_ENABLED,		// false is valid, don't make this a question mark
			SESSION_CACHE_ENABLED: ev.SESSION_CACHE_ENABLED,	// false is valid, don't make this a question mark
			PROXY_CACHE_ENABLED: ev.PROXY_CACHE_ENABLED,		// false is valid, don't make this a question mark
			TRANSACTION_VISIBILITY: ev.TRANSACTION_VISIBILITY || {},
			INACTIVITY_TIMEOUTS: ev.INACTIVITY_TIMEOUTS,
			FABRIC_CAPABILITIES: ev.FABRIC_CAPABILITIES,		// settings.js guarantees this field will exist
			TIMEOUTS: {
				GRPCWPP_TIMEOUT: ev.GRPCWPP_TIMEOUT || '?',
				HTTP_TIMEOUT: ev.HTTP_TIMEOUT || '?',
				WS_TIMEOUT: ev.WS_TIMEOUT || ' ?',
				DEPLOYER_TIMEOUT: ev.DEPLOYER_TIMEOUT || '?',
				BACKEND_ADDRESS_TIMEOUT: ev.BACKEND_ADDRESS_TIMEOUT_MS || '?',
				CONFIGTXLATOR_TIMEOUT: ev.CONFIGTXLATOR_TIMEOUT || '?',
				CLIENT: {
					FABRIC_GET_BLOCK_TIMEOUT_MS: ev.FABRIC_GET_BLOCK_TIMEOUT_MS || '?',
					FABRIC_INSTANTIATE_TIMEOUT_MS: ev.FABRIC_INSTANTIATE_TIMEOUT_MS || '?',
					FABRIC_JOIN_CHANNEL_TIMEOUT_MS: ev.FABRIC_JOIN_CHANNEL_TIMEOUT_MS || '?',
					FABRIC_INSTALL_CC_TIMEOUT_MS: ev.FABRIC_INSTALL_CC_TIMEOUT_MS || '?',
					FABRIC_LC_INSTALL_CC_TIMEOUT_MS: ev.FABRIC_LC_INSTALL_CC_TIMEOUT_MS || '?',
					FABRIC_GENERAL_TIMEOUT_MS: ev.FABRIC_GENERAL_TIMEOUT_MS || '?',
					FABRIC_LC_GET_CC_TIMEOUT_MS: ev.FABRIC_LC_GET_CC_TIMEOUT_MS || '?',
				}
			},
			THE_DEFAULT_RESOURCES_MAP: ev.THE_DEFAULT_RESOURCES_MAP || '?',
			TRUST_PROXY: ev.TRUST_PROXY, 						// false is valid, don't make this a question mark
			ACTIVITY_TRACKER_FILENAME: ev.ACTIVITY_TRACKER_FILENAME || '?',
			HSM: ev.HSM,										// false is valid, don't make this a question mark
			LDAP: {
				SEARCH_BASE: ev.LDAP.SEARCH_BASE || '?',
				GROUP_SEARCH_BASE: ev.LDAP.GROUP_SEARCH_BASE || '?',
				LDAP_GROUP_MAP: ev.LDAP.LDAP_GROUP_MAP || '?',
				LDAP_ATTR_MAP: ev.LDAP.LDAP_ATTR_MAP || '?',
			},
			MAX_COMPONENTS: ev.MAX_COMPONENTS,					// 0 is valid i guess, don't make it a question mark
			DISABLED_COMPACTION: ev.DISABLED_COMPACTION, 		// false is valid, don't make this a question mark
			IMPORT_ONLY: ev.IMPORT_ONLY,						// false is valid, don't make this a question mark
			READ_ONLY: ev.READ_ONLY, 							// false is valid, don't make this a question mark
			MIGRATED_CONSOLE_URL: ev.MIGRATED_CONSOLE_URL,
			MIGRATION_MIN_VERSIONS: ev.MIGRATION_MIN_VERSIONS,
			MIGRATION_STATUS: ev.MIGRATION_STATUS || {},
		};
		return t.misc.sortItOut(ret);
	};

	exports.get_health_info = () => {
		const now = Date.now();
		const memory = process.memoryUsage();
		for (let i in memory) {
			memory[i] = t.misc.friendly_bytes(memory[i]);
		}
		const ret = {											// compile the list of settings
			OPTOOLS: {
				instance_id: process.env.ATHENA_ID || '?',
				now: now,
				born: (ev.UPDATE_SCH && ev.UPDATE_SCH.born) ? ev.UPDATE_SCH.born : '?',
				up_time: (ev.UPDATE_SCH && ev.UPDATE_SCH.born) ? t.misc.friendly_ms(now - ev.UPDATE_SCH.born) : '?',
				memory_usage: memory,
				session_cache_stats: t.caches.friendly_stats(t.session_store),
				couch_cache_stats: t.caches.friendly_stats(t.otcc),
				iam_cache_stats: t.caches.friendly_stats(t.iam_lib),
				proxy_cache: t.caches.friendly_stats(t.proxy_cache),
			},
			OS: {
				arch: t.os.arch(),
				type: t.os.type(),
				endian: t.os.endianness(),
				loadavg: t.os.loadavg(),
				cpus: t.os.cpus(),
				total_memory: t.misc.friendly_bytes(t.os.totalmem()),
				free_memory: t.misc.friendly_bytes(t.os.freemem()),
				up_time: t.misc.friendly_ms(t.os.uptime() * 1000),
			}
		};
		return t.misc.sortItOut(ret);
	};

	//--------------------------------------------------
	// Get sensitive settings for athena
	//--------------------------------------------------
	exports.get_private_settings = () => {
		const ret = {											// compile the list of private settings
			DEPLOYER_URL: ev.DEPLOYER_URL || '?',				// for OpTools developers show the un-redacted url
			JUPITER_URL: ev.JUPITER_URL || '?',					// for OpTools developers show the un-redacted url
			//DEFAULT_USER_PASSWORD: ev.DEFAULT_USER_PASSWORD,	// for debug
			SESSION_SECRET: ev.SESSION_SECRET,					// for debug
			URL_SAFE_LIST: ev.URL_SAFE_LIST || [],				// for debug, moved this here from get_ev_settings so we don't leak component addresses
			CONFIGTXLATOR_URL_ORIGINAL: ev.CONFIGTXLATOR_URL_ORIGINAL || '?',
			COOKIE_NAME: ev.COOKIE_NAME || '?',
			MIGRATION_API_KEY: ev.MIGRATION_API_KEY,			// for debug
		};
		return t.misc.sortItOut(ret);
	};

	//--------------------------------------------------
	// Edit a single property from a doc
	//--------------------------------------------------
	/*
	* req: {}  // request object
	*/
	exports.edit_single_property_from_doc = (req, cb) => {

		// build a notification doc
		const notice = { message: 'editing settings doc field(s)' };
		t.notifications.procrastinate(req, notice);

		t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, (err, settings) => {
			if (err) {
				logger.error('[edit settings] unable to get doc to edit settings doc', err);
				return cb(err);
			} else {
				// Get the key of the property we're trying to change
				const key = Object.keys(req.body)[0];

				// Check if the user's auth_scheme is 'ibmid'. If so then exit the API with an error message
				if ((ev.AUTH_SCHEME === 'ibmid' || ev.AUTH_SCHEME === 'iam') && key === 'auth_scheme') {
					return cb({ statusCode: 400, msg: 'Your auth_scheme is \'ibmid\'. You are not allowed to change this' });
				}

				settings[key] = req.body[key];								// replace the property

				writeSettingsDoc(req, settings, (write_error, resp) => {	// write the updated settings back to the db
					ev.update(null, err => {								// reload ev settings
						if (err) {
							logger.error('[edit settings] error updating ev', err);
							return cb({ statusCode: 500, msg: 'unable to update settings', details: err });
						} else {
							return cb(null, resp);
						}
					});
				});
			}
		});
	};

	// actually write the revised settings doc back to the database to update Athena's settings
	function writeSettingsDoc(req, modified_doc, cb) {
		delete modified_doc.log_changes;		// don't record this meta data field in the actual doc

		t.otcc.writeDoc({ db_name: ev.DB_SYSTEM }, t.misc.sortItOut(modified_doc), (err, updated_doc) => {
			if (err) {
				logger.error('[edit settings] unable to write settings changes:', err, updated_doc);
				return cb({ statusCode: 500, err: err });
			} else {
				logger.info('[edit settings] changed settings - success');
				return cb(null, { message: 'ok' });
			}
		});
	}

	//--------------------------------------------------
	// Edit settings fields on UI
	//--------------------------------------------------
	/*
	* req: {}  // request object
	*/
	exports.edit_ui_settings = (req, cb) => {

		// build a notification doc
		const notice = { message: 'editing ui settings' };
		t.notifications.procrastinate(req, notice);

		t.logging_apis_lib.prepare_logging_setting_changes(req, (edit_err, edited_settings_doc) => {
			if (edit_err) {
				return cb(edit_err, edited_settings_doc);							// error already logged
			} else {
				let restart_changes = edited_settings_doc.log_changes;				// this gets deleted before writing doc

				// make the timeout changes
				handle_fabric_timeout_settings(req, edited_settings_doc);

				// make the inactivity changes
				if (!edited_settings_doc.inactivity_timeouts) {
					edited_settings_doc.inactivity_timeouts = {};
				}
				if (req.body.inactivity_timeouts) {
					if (typeof req.body.inactivity_timeouts.enabled === 'boolean') {
						edited_settings_doc.inactivity_timeouts.enabled = req.body.inactivity_timeouts.enabled;
					}
					if (req.body.inactivity_timeouts.max_idle_time) {
						edited_settings_doc.inactivity_timeouts.max_idle_time = req.body.inactivity_timeouts.max_idle_time;
					}
				}

				// make the rate limit changes
				if (!isNaN(req.body.max_req_per_min)) {
					edited_settings_doc.max_req_per_min = Number(req.body.max_req_per_min);
					restart_changes++;												// increment this to trigger a restart
				}
				if (!isNaN(req.body.max_req_per_min_ak)) {
					edited_settings_doc.max_req_per_min_ak = Number(req.body.max_req_per_min_ak);
					restart_changes++;												// increment this to trigger a restart
				}

				writeSettingsDoc(req, edited_settings_doc, (write_error, resp) => {	// write the updated settings back to the db
					if (write_error) {
						return cb(write_error, edited_settings_doc);				// error already logged
					} else {
						if (restart_changes > 0) {
							logger.debug('[edit settings] there were changes to log settings, will restart.');
							cb(null, exports.get_ev_settings());					// don't return because we want to broadcast restart after the cb

							const msg = {
								message_type: 'restart',
								message: 'restarting application b/c edited log settings',
								by: t.misc.censorEmail(t.middleware.getEmail(req)),
								uuid: t.middleware.getUuid(req),
							};
							t.pillow.broadcast(msg);
							return;
						} else {
							logger.debug('[edit settings] there were no changes to log settings, no need to restart.');
							ev.update(null, err => {								// reload ev settings
								if (err) {
									logger.error('[edit settings] error updating ev', err);
									return cb({ statusCode: 500, msg: 'unable to update settings', details: err });
								} else {
									return cb(null, exports.get_ev_settings());
								}
							});
						}
					}
				});
			}
		});
	};

	// validate and change the fabric timeout settings
	function handle_fabric_timeout_settings(req, edited_settings_doc) {
		const number_fields = [
			'fabric_get_block_timeout_ms',
			'fabric_instantiate_timeout_ms',
			'fabric_join_channel_timeout_ms',
			'fabric_install_cc_timeout_ms',
			'fabric_lc_install_cc_timeout_ms',
			'fabric_lc_get_cc_timeout_ms',
			'fabric_general_timeout_ms'
		];
		for (let i in number_fields) {
			const key = number_fields[i];
			if (req.body && req.body[key]) {											// only validate if it exists
				if (!isNaN(req.body[key])) {
					edited_settings_doc[key] = Number(req.body[key]);					// make the desired change
				}
			}
		}
	}

	//-------------------------------------------------------------
	// Exchange API KEY for token
	//-------------------------------------------------------------
	exports.get_token = (settings, cb) => {
		const location = '[get_token] - ';
		const parsed_url = t.url.parse(ev.IBM_ID.URL);
		const url = parsed_url.protocol + '//' + parsed_url.host;
		const options = {
			baseUrl: url,
			url: '/identity/token',
			body: 'grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=' + settings.api_key,
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		};
		logger.debug(location + 'sending request to get the access token');
		t.request(options, (err, res) => {
			if (err || !res || !res.statusCode || res.statusCode !== 200) {
				let msg_append = null;
				if (err) {
					msg_append = err.toString();
				} else if (res && res.body) {
					msg_append = JSON.stringify(res.body);
				}
				logger.error(location + 'problem getting the access token - failure - ' + msg_append);
				return cb({ statusCode: 500 });
			} else {
				logger.debug(location + 'got access token - apparent success ');
				const body = JSON.parse(res.body);
				return cb(null, body.access_token);
			}
		});
	};

	//--------------------------------------------------
	// Get advanced settings for athena and detail what file is driving each setting
	//--------------------------------------------------
	exports.get_settings_breakdown = (cb) => {
		const uc_omit_fields = [									// do not include these fields in response, private info
			'DB_CONNECTION_STRING', 'CLIENT_SECRET', 'IAM_API_KEY', 'SUPPORT_PASSWORD', 'SESSION_SECRET',
			'UPDATE_SCH', 'CRN', 'APP_ID', 'SEGMENT_WRITE_KEY',
		];

		get_setting_sources((errCode, results) => {
			const db_settings = results[0];							// rename for convenience
			const default_settings = results[1];
			const config_settings = results[2];
			const env_settings = results[3];
			const ret = {};

			for (let key in ev) {									// iter on each setting we are using and find the file that is setting it
				const value = ev[key];
				if (uc_omit_fields.includes(key.toUpperCase())) {	// don't work private settings
					continue;
				}

				// if the type is a primitive OR an array... find the file that is driving the value
				if (Array.isArray(value) || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
					const hay_stacks = {							// build the search items for this iteration, order should match hierarchy
						'env': env_settings,
						'config': config_settings,
						'db': db_settings,
						'default': default_settings,
					};

					const found = find_primitive(key, value, Array.isArray(value), hay_stacks);	// find the key's value in the "hay stack"
					if (found) {
						ret[found._lc_key.toUpperCase()] = {
							_value: found._value,
							_defined_by: found._defined_by			// remember where we found this key's source
						};
					}
				}

				// else if its an object... iter on the keys and find the file that is driving each value
				else if (typeof value === 'object') {
					const lc_key = key.toLowerCase();
					const uc_key = key.toUpperCase();

					for (let key2 in ev[key]) {
						const value2 = ev[key][key2];
						const hay_stacks = {						// build the search items for this iteration, order should match hierarchy
							'env': env_settings[lc_key] || env_settings[uc_key],
							'config': config_settings[lc_key] || config_settings[uc_key],
							'db': db_settings[lc_key] || db_settings[uc_key],
							'default': default_settings[lc_key] || default_settings[uc_key],
						};

						const found = find_primitive(key2, value2, typeof value2 === 'object', hay_stacks);	// find the key's value in the "hay stack"
						if (found) {
							if (!ret[uc_key]) {
								ret[uc_key] = {};					// init
							}
							ret[uc_key][found._key] = {				// use original case
								_value: found._value,
								_defined_by: found._defined_by		// remember where we found this key's source
							};
						}
					}
				}
			}

			return cb(null, t.misc.sortKeys(ret));
		});

		// find the the same value in a hay stack
		function find_primitive(key, value, stringify, hay_stacks) {
			const lc_key = key.toLowerCase();
			let found_in_stack = null;
			let _key = key;														// init
			if (stringify) {
				value = JSON.stringify(value);									// stringify obj/arrays before the search/compare
			}

			if (uc_omit_fields.includes(key.toUpperCase())) {					// do not work private fields
				return null;
			} else if (typeof value !== 'string' && typeof value !== 'boolean' && typeof value !== 'number') {
				return null;													// do not work objects
			} else {
				for (let pile_name in hay_stacks) {								// search for the key and value in each hay stack
					const pile = hay_stacks[pile_name];
					for (let key2 in pile) {									// iter on each key in the hay stack
						_key = key2;											// copy exact case of key from pile
						const lc_key_pile = key2.toLowerCase();
						let value_pile = pile[key2];
						if (stringify) {
							value_pile = JSON.stringify(pile[key2]);
						}

						if (lc_key === lc_key_pile && value === value_pile) {
							found_in_stack = pile_name;							// found the right "hay stack"
							break;
						}
					}
					if (found_in_stack) {										// once its found get out of loop
						break;
					}
				}

				return {
					_key: _key,													// original case of key is here
					_lc_key: lc_key,											// lowercase of this key is here
					_value: stringify ? JSON.parse(value) : value,				// value of the key
					_defined_by: found_in_stack || 'code'						// where the value was found
				};
			}
		}

		// get each setting file
		function get_setting_sources(cb_get) {
			t.async.parallel([

				// --- Get DB Settings Doc [0] --- //
				function (join) {
					t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, function (err, doc) {
						if (err) {
							logger.error('[other] an error occurred obtaining the "' + process.env.SETTINGS_DOC_ID + '" db:', ev.DB_SYSTEM, err, doc);
							join(null, null);
						} else {
							delete doc._id;
							delete doc._rev;
							join(null, doc);
						}
					});
				},

				// --- Get Default Settings Doc [1] --- //
				function (join) {
					let defaults = t.fs.readFileSync('./json_docs/default_settings_doc.json', 'utf8');
					try {
						defaults = JSON.parse(defaults);
					} catch (e) {
						logger.error('[other] could not read default settings doc', e);
					}
					join(null, defaults);
				},

				// --- Get Config Settings [2] --- //
				function (join) {
					let config_file = null;

					if (process.env.CONFIGURE_FILE) {
						try {
							config_file = t.fs.readFileSync(process.env.CONFIGURE_FILE, 'utf8');	// if we have a config file, load it
						} catch (e) {
							logger.error('[other] could not read config file', e);
						}

						try {
							if (process.env.CONFIGURE_FILE.indexOf('.json') >= 0) {					// if its json, JSON parse it
								config_file = JSON.parse(config_file);

							} else {
								config_file = t.yaml.safeLoad(config_file);							// if its yaml, load it with the yaml lib
							}
						} catch (e) {
							logger.error('[other] could not parse config file', e);
						}
					}

					join(null, config_file);
				},

				// --- Get ENV Settings [3] --- //
				function (join) {
					const env = JSON.parse(JSON.stringify(process.env));
					join(null, env);
				},

			], (errCode, results) => {
				return cb_get(errCode, results);
			});
		}
	};

	//--------------------------------------------------
	// Edit settings in the config file or db settings doc by re-writing the file(s)
	//--------------------------------------------------
	exports.edit_settings = (req, cb) => {

		// build a notification doc
		const notice = { message: 'editing settings - advanced' };
		t.notifications.procrastinate(req, notice);

		// ----- Get the settings files ----- //
		get_files((errCode, results) => {

			// ----- Make the edits in memory ----- //
			const settings = {									// build a map of all settings, will edit here
				db: {
					data: results[0],
					changes: false,
				},
				config: {
					data: results[1],
					changes: false,
				}
			};

			// iter on the inputs
			for (let key in req.body) {
				const lc_key = key.toLowerCase();				// settings & config doc keys are always lowercase, so make input lowercase
				const settings_name = req.body[key]._defined_by;

				if (!settings[settings_name]) {					// unknown setting file
					logger.error('[settings edit] invalid setting file name: "' + settings_name + '"');
				} else {
					const the_settings = settings[settings_name].data;
					const parts = lc_key.split('.');
					const first_key = parts[0];
					const second_key = parts[1];

					if (the_settings) {
						if (the_settings[first_key] === undefined) {
							the_settings[first_key] = {};			// init
						}

						if (parts.length > 1) {						// is it a nested key or not
							logger.debug('[settings edit] (nested) changing', settings_name, 'key:', lc_key);
							the_settings[first_key][second_key] = req.body[key]._value;
							settings[settings_name].changes = true;
						} else {
							logger.debug('[settings edit] changing', settings_name, 'key:', lc_key);
							the_settings[first_key] = req.body[key]._value;
							settings[settings_name].changes = true;
						}
					}
				}
			}

			// ---------- Write the files ---------- //
			write_files(settings, (write_err) => {
				if (write_err) {
					return cb(write_err);
				} else {
					t.other_apis_lib.get_settings_breakdown((err, settings) => {
						return cb(err, settings);
					});
				}
			});
		});

		// get each setting file
		function get_files(cb_get) {
			t.async.parallel([

				// --- Get DB Settings Doc [0] --- //
				function (join) {
					t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, function (err, doc) {
						if (err) {
							logger.error('[settings edit] an error occurred obtaining the "' + process.env.SETTINGS_DOC_ID + '" db:', ev.DB_SYSTEM, err, doc);
							join(null, null);
						} else {
							join(null, doc);
						}
					});
				},

				// --- Get Config Settings [1] --- //
				function (join) {
					let config_file = null;
					if (process.env.CONFIGURE_FILE) {										// check if we have a config file...
						try {
							config_file = t.fs.readFileSync(process.env.CONFIGURE_FILE, 'utf8');
						} catch (e) {
							logger.error('[settings edit] could not read config file', e);
						}

						try {
							if (process.env.CONFIGURE_FILE.indexOf('.json') >= 0) {			// json config file
								config_file = JSON.parse(config_file);
							} else {
								config_file = t.yaml.safeLoad(config_file);					// yaml config file
							}
						} catch (e) {
							logger.error('[settings edit] could not parse config file', e);
						}
					}
					join(null, config_file);
				},
			], (errCode, results) => {
				return cb_get(errCode, results);
			});
		}

		// edit the settings file on fs or db
		function write_files(settings, cb_edit) {
			t.async.parallel([

				// --- Edit Athena Settings Doc --- //
				function (join) {
					if (settings.db.changes === false) {
						return join(null);
					} else {
						logger.debug('[settings edit] writing db doc');
						writeSettingsDoc(req, settings.db.data, (write_error, resp) => {	// write the updated settings back to the db
							if (write_error) {
								logger.error('[settings edit] error writing settings doc', write_error);
							} else {
								logger.info('[settings edit] successfully wrote settings doc');
							}
							return join(null);
						});
					}
				},

				// --- Edit Config File --- //
				function (join) {
					if (settings.config.changes === false) {
						return join(null);
					} else {
						if (process.env.CONFIGURE_FILE) {										// check if we have a config file...
							logger.debug('[settings edit] writing config file');
							try {
								if (process.env.CONFIGURE_FILE.indexOf('.json') >= 0) {
									t.fs.writeFileSync(process.env.CONFIGURE_FILE, settings.config.data, 'utf8');	// if its json, simply write it
								} else {
									const yaml = t.yaml.safeDump(settings.config.data);			// if its a yaml, convert json to yaml first
									t.fs.writeFileSync(process.env.CONFIGURE_FILE, yaml, 'utf8');
								}
								logger.info('[settings edit] successfully wrote config file');
							} catch (e) {
								logger.error('[other] could not write config file', e);
							}
						}
						return join(null);
					}
				},
			], () => {
				if (settings.db.changes === false && settings.config.changes === false) {
					logger.warn('[settings edit] there are no edits to be made..');
					return cb_edit(null);
				} else {
					ev.update(null, err => {													// reload ev settings
						if (err) {
							logger.error('[edit settings] error updating settings in ev', err);
							return cb_edit({ statusCode: 500, msg: 'unable to update settings', details: err });
						} else {
							return cb_edit(err);
						}
					});
				}
			});
		}
	};

	//-----------------------------------------------------------------------------
	// Return swagger file
	//-----------------------------------------------------------------------------
	exports.get_swagger_file = (version) => {
		if (ev.OPEN_API_DOCS && ev.OPEN_API_DOCS[version]) {
			const openapi = ev.OPEN_API_DOCS[version];
			const swagger_file = {									// rebuild it to "un-alpha-sort" the object (its easier to read)
				openapi: openapi.openapi,
				info: openapi.info,
				externalDocs: openapi.externalDocs,
				servers: openapi.servers,
				security: openapi.security,
				tags: openapi.tags,
				'x-validate_error_messages': openapi['x-validate_error_messages'],
				paths: openapi.paths,
				components: openapi.components,
			};
			try {
				return t.yaml.safeDump(swagger_file);				// convert json to yaml
			} catch (e) {
				logger.error('unable to work with swagger file:', e);
			}
		}
		return null;
	};

	//-----------------------------------------------------------------------------
	// Store swagger file
	//-----------------------------------------------------------------------------
	exports.store_swagger_file = (req, cb) => {
		let json = null;
		try {
			json = t.yaml.safeLoad(req.body);
		} catch (e) {
			logger.error('[openapi] unable to covert yaml to json:', e);
		}

		if (!json) {
			return cb({ statusCode: 400, msg: 'unable to parse yaml.' });
		} else if (!json.info || !json.info.version || !json.paths || !json.components || !json.components.schemas || !json['x-validate_error_messages']) {
			return cb({
				statusCode: 400,
				msg: 'Invalid OpenApi file, missing one or more of these fields: "info.versions", "paths", "components.schemas", "x-validate_error_messages".'
			});
		} else {
			json._id = t.ot_misc.build_swagger_id(json);
			json.type = 'json_validation';
			logger.debug('[openapi] writing swagger file:', json._id);

			t.otcc.writeDoc({ db_name: ev.DB_SYSTEM }, json, (err, updated_doc) => {
				if (err) {
					const err_code = t.ot_misc.get_code(err);
					logger.error('[openapi] unable to write swagger file:', err_code, err, updated_doc);
					if (err_code === 409) {
						return cb({
							statusCode: 400,
							msg: 'An OpenApi file with version "' + json.info.version +
								'" already exists. Increment \'info.version\' if you are attempting to replace it.'
						});
					} else {
						return cb({ statusCode: 500, err: err });
					}
				} else {
					logger.info('[openapi] added swagger file - restart required to take effect');
					return cb(null, { message: 'ok', id: json._id, details: 'restart IBP to use this file' });
				}
			});
		}
	};

	//-----------------------------------------------------------------------------
	// Record that a user exported their identities/wallet - used during migration
	//-----------------------------------------------------------------------------
	exports.record_export = (req, type, cb) => {
		if (type !== 'identities') {
			return cb({ statusCode: 400, msg: 'unable to record export of this type.' });
		} else {
			const wallet_doc = {
				email: t.middleware.getEmail(req),
				uuid: t.middleware.getUuid(req),
				timestamp: Date.now(),
				type: ev.STR.WALLET_MIGRATION,
			};
			t.otcc.createNewDoc({ db_name: ev.DB_SYSTEM }, wallet_doc, (err, doc) => {
				if (err) {
					const err_code = t.ot_misc.get_code(err);
					logger.error('[export] unable to write wallet doc:', err_code, err, doc);
					return cb({ statusCode: 500, err: err });
				} else {
					logger.info('[export] recorded wallet export via wallet doc');
					return cb(null, { message: 'ok', username: wallet_doc.username, details: 'recorded export' });
				}
			});
		}
	};

	return exports;
};
