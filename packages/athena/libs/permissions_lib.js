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
// permissions_lib.js - Library functions for auth scheme apis
//------------------------------------------------------------
module.exports = function (logger, ev, t) {
	const exports = {};
	const owasp = require('owasp-password-strength-test');
	owasp.config({
		allowPassphrases: true,
		maxLength: ev.MAX_PASSWORD_LEN,
		minLength: ev.MIN_PASSWORD_LEN,
		minPhraseLength: ev.MIN_PASSPHRASE_LEN,
		minOptionalTestsToPass: 4,
	});

	//--------------------------------------------------
	// Get users
	//--------------------------------------------------
	exports.get_users = (req, cb) => {
		const ret = { users: {} };
		for (let email in ev.ACCESS_LIST) {
			const uuid = ev.ACCESS_LIST[email].uuid;
			ret.users[uuid] = {
				email: email.toLowerCase(),
				roles: ev.ACCESS_LIST[email].roles,
				created: ev.ACCESS_LIST[email].created,
			};
		}
		return cb(null, ret);
	};

	//--------------------------------------------------
	// Adds users - this only works on software (saas uses IAM)
	//--------------------------------------------------
	exports.add_users = (req, cb) => {

		// get the Athena settings doc first
		t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, (err, settings_doc) => {
			if (err || !settings_doc) {
				logger.error('could not get settings doc to add users', err);
				return cb(err);
			} else {
				let input_errors = [];
				let added_someone = false;
				if (!settings_doc.access_list) {
					settings_doc.access_list = {};									// init
				}

				// iter on each user in the body
				for (let email in req.body.users) {
					const lc_email = email.toLowerCase();
					const lc_roles = validate_roles(req.body.users[email].roles);	// check the roles

					if (lc_roles === false) {
						input_errors.push('invalid role for username: ' + encodeURI(lc_email));
					} else if (lc_roles.length === 0) {
						input_errors.push('must have at least 1 role for username: ' + encodeURI(lc_email));
					}

					if (lc_email === ev.SUPPORT_KEY) {								// can't be same as the support key
						input_errors.push('username cannot be "' + lc_email + '"');
					} else if (settings_doc.access_list[lc_email]) {				// check if it already exists
						input_errors.push('username already exists: ' + encodeURI(lc_email));
					} else if (lc_email.includes(':')) {							// never allow a colon (it would be an invalid basic auth username)
						input_errors.push('username cannot contain a colon: ' + encodeURI(lc_email));
					} else if (lc_email.includes('<') || lc_email.includes('>')) {	// bad b/c security...
						input_errors.push('username cannot contain a "<" or ">" character: ' + encodeURI(lc_email));
					} else if (lc_email.length < ev.MIN_USERNAME_LEN) {				// too short
						input_errors.push('username cannot be less than ' + ev.MIN_USERNAME_LEN + ' characters: ' + encodeURI(lc_email));
					} else if (lc_email.length > ev.MAX_USERNAME_LEN) {				// too long
						input_errors.push('username cannot be greater than ' + ev.MAX_USERNAME_LEN +
							' characters: ' + encodeURI(lc_email.substring(0, 16) + '...'));
					} else {
						settings_doc.access_list[lc_email] = {						// create the user object
							created: Date.now(),
							roles: lc_roles,
							uuid: t.uuidv4()
						};
						added_someone = true;
					}
				}

				if (added_someone === false) {
					input_errors.push('no users were added.');
				}

				if (input_errors.length >= 1) {
					logger.error('[permissions] cannot add these users. bad input:', input_errors);
					cb({ statusCode: 400, msg: input_errors, }, null);
				} else {

					// update the settings doc
					const wr_opts = {
						db_name: ev.DB_SYSTEM,
						doc: settings_doc
					};
					t.otcc.repeatWriteSafe(wr_opts, (doc) => {
						settings_doc._rev = doc._rev;
						return { doc: settings_doc };
					}, (err_writeDoc) => {
						if (err_writeDoc) {
							logger.error('[permissions] cannot edit settings doc to add users:', err_writeDoc);
							cb({ statusCode: 500, msg: 'could not update settings doc', details: err_writeDoc }, null);
						} else {
							logger.info('[permissions] adding users - success');

							ev.update(null, err => {								// reload ev settings
								if (err) {
									return cb({ statusCode: 500, msg: 'could not update config settings' }, null);
								} else {
									cb(null, { message: 'ok' });					// all good
								}
							});
						}
					});
				}
			}
		});
	};

	//--------------------------------------------------
	// Edit users - this only works on software (saas uses IAM)
	//--------------------------------------------------
	exports.edit_users = (req, cb) => {

		// get the Athena settings doc first
		t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, (err, settings_doc) => {
			if (err || !settings_doc) {
				logger.error('[permissions] could not get settings doc to edit users', err);
				return cb(err);
			} else {
				let input_errors = [];
				if (!settings_doc.access_list) {
					settings_doc.access_list = {};									// init
				}
				let ret_uuids = [];

				// iter on each user in the body
				const uuids = req.body ? (req.body.uuids || req.body.users) : null;	// uuids is correct, users is legacy
				for (let uuid in uuids) {
					ret_uuids.push(encodeURI(uuid));

					const lc_roles = validate_roles(uuids[uuid].roles);				// check the roles
					if (lc_roles === false) {
						input_errors.push('invalid roles for uuid: ' + encodeURI(uuid));
					} else if (lc_roles.length === 0) {
						input_errors.push('must have at least 1 role for uuid: ' + encodeURI(uuid));
					}

					const email = find_users_email(uuid, settings_doc);
					if (!email) {
						input_errors.push('uuid does not exist: ' + encodeURI(uuid));
					} else {
						settings_doc.access_list[email].roles = lc_roles; 			// edit the user object
					}
				}

				if (input_errors.length >= 1) {
					logger.error('[permissions] cannot edit these users. bad input:', input_errors);
					cb({ statusCode: 400, msg: input_errors, }, null);
				} else {

					// update the settings doc
					const wr_opts = {
						db_name: ev.DB_SYSTEM,
						doc: settings_doc
					};
					t.otcc.repeatWriteSafe(wr_opts, (doc) => {
						doc.access_list = settings_doc.access_list;
						return { doc: doc };
					}, (err_writeDoc) => {
						if (err_writeDoc) {
							logger.error('[permissions] cannot edit settings doc to edit users:', err_writeDoc);
							cb({ statusCode: 500, msg: 'could not update settings doc', details: err_writeDoc }, null);
						} else {
							logger.info('[permissions] editing users - success');

							ev.update(null, err => {								// reload ev settings
								if (err) {
									logger.error('[permissions] error updating config settings', err);
									return cb({ statusCode: 500, msg: 'could not update config settings' }, null);
								} else {
									cb(null, { message: 'ok', uuids: ret_uuids });			// all good
								}
							});
						}
					});
				}
			}
		});
	};

	//--------------------------------------------------
	// Delete users - this only works on software (saas uses IAM)
	//--------------------------------------------------
	exports.delete_users = (req, cb) => {

		// get the Athena settings doc first
		t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, (err, settings_doc) => {
			if (err || !settings_doc) {
				logger.error('[permissions] could not get settings doc to delete users', err);
				return cb(err);
			} else {
				let input_errors = [];
				if (!settings_doc.access_list) {
					settings_doc.access_list = {};									// init
				}

				let uuids = t.misc.fmt_arr_of_strings_query_param(req, 'uuids');	// uuids are expected in a query parameter
				if (!uuids) {
					uuids = req.body ? (req.body.uuids || req.body.users) : null;	// uuids in body is legacy...
				}

				// iter on each user in the body
				for (let i in uuids) {
					const uuid = uuids[i];
					const email = find_users_email(uuid, settings_doc);
					if (!email) {
						input_errors.push('uuid does not exist: ' + encodeURI(uuid));
					} else if (uuid === t.middleware.getUuid(req)) {
						input_errors.push('cannot delete self: ' + encodeURI(uuid));
					} else {
						delete settings_doc.access_list[email];
					}
				}

				if (input_errors.length >= 1) {
					logger.error('[permissions] unable to delete some users. errors:', input_errors);
					cb({ statusCode: 400, msg: input_errors, }, null);
				} else {

					// update the settings doc
					const wr_opts = {
						db_name: ev.DB_SYSTEM,
						doc: settings_doc
					};
					t.otcc.repeatWriteSafe(wr_opts, (doc) => {
						doc.access_list = settings_doc.access_list;
						return { doc: doc };
					}, (err_writeDoc) => {
						if (err_writeDoc) {
							logger.error('[permissions] cannot edit settings doc to delete users:', err_writeDoc);
							cb({ statusCode: 500, msg: 'could not update settings doc', details: err_writeDoc }, null);
						} else {
							logger.info('[permissions] deleting users - success');

							ev.update(null, err => {										// reload ev settings
								if (err) {
									logger.error('[permissions] error updating config settings', err);
									return cb({ statusCode: 500, msg: 'could not update config settings' }, null);
								} else {
									cb(null, { message: 'ok', uuids: encodeURI(uuids) });	// all good
								}
							});
						}
					});
				}
			}
		});
	};

	// see if the roles are good - returns false if not valid
	function validate_roles(roles) {
		const valid_roles = Object.keys(ev.ROLES_TO_ACTIONS);
		const ret = [];

		for (let i in roles) {
			const lc_role = roles[i].toLowerCase();
			ret.push(lc_role);								// make an array w/all lower case
			if (!valid_roles.includes(lc_role)) {
				return false;
			}
		}
		return ret;											// return lower case array
	}

	// return the user's email from a uuid
	function find_users_email(uuid, doc) {
		if (doc && doc.access_list) {
			for (let email in doc.access_list) {
				if (doc.access_list[email].uuid === uuid) {
					return email;
				}
			}
		}
		return null;
	}

	//--------------------------------------------------
	// Create an api key in the database
	//--------------------------------------------------
	/*
		req: {
			body: {
				roles: ["manager"],
				description: "batman's key"
			}
		}
	*/
	exports.create_api_key = (req, cb) => {
		let input_errors = [];
		const lc_roles = validate_roles(req.body.roles);				// check the roles
		if (lc_roles === false) {
			input_errors.push('invalid roles for api key. valid roles: ' + JSON.stringify(Object.keys(ev.ROLES_TO_ACTIONS)));
		} else if (lc_roles.length === 0) {
			input_errors.push('must have at least 1 role for key.');
		}

		if (input_errors.length >= 1) {
			logger.error('[permissions] cannot create api key. bad input:', input_errors);
			cb({ statusCode: 400, msg: input_errors, }, null);
		} else {

			const secret = t.misc.generateRandomString(32);		// this is the api secret
			const secret_details = t.misc.salt_secret(secret);
			const doc_to_write = {
				_id: 'k' + t.misc.generateRandomString(15),		// this is the api key, must start with a letter
				roles: lc_roles,
				description: t.misc.safe_str(req.body.description) || '-',
				//debug_api_secret_plain_text: secret,			// do not uncomment unless testing
				salt: secret_details.salt,
				hashed_secret: secret_details.hashed_secret,
				timestamp: Date.now(),							// add timestamp
				type: 'api_key_doc',							// add doc type
			};

			// it shouldn't be possible for generateRandomString to make an id with a colon but just in case.. remove it
			doc_to_write._id.replace(/:/g, '');					// never allow a colon (it would be an invalid basic auth username)

			// build a notification doc
			const notice = {
				message: 'creating api key ' + doc_to_write._id.substring(0, 4) + '***',
			};
			t.notifications.procrastinate(req, notice);

			// write the api key doc
			const wr_opts = {
				db_name: ev.DB_SYSTEM,
				doc: doc_to_write
			};
			t.otcc.createNewDoc(wr_opts, doc_to_write, (err_writeDoc, resp_writeDoc) => {
				if (err_writeDoc) {
					logger.error('[permissions] unable to write new api key doc', err_writeDoc);
					return cb(err_writeDoc);
				} else {
					logger.info('[permissions]  creating the api key doc - success');
					const ret = {
						api_key: resp_writeDoc._id,
						api_secret: secret,					// the secret is never to be seen again
						roles: resp_writeDoc.roles,
						message: 'ok'
					};
					return cb(null, ret);
				}
			});
		}
	};

	//--------------------------------------------------
	// Get all API keys in the database
	//--------------------------------------------------
	exports.get_api_keys = (req, cb) => {

		// get all the docs for the current user
		const opts = {
			db_name: ev.DB_SYSTEM,			// db for storing things
			_id: '_design/athena-v1',		// name of design doc
			view: '_doc_types',
			query: 'key="api_key_doc"&reduce=false&include_docs=true',
			SKIP_CACHE: (req.query.skip_cache === 'yes')
		};
		t.otcc.getDesignDocView(opts, (err, resp) => {
			if (err) {
				logger.error('[permissions] unable to get api key docs from db', err);
				return cb(err);
			} else {
				logger.info('[permissions] got api key docs - success');

				// build response body
				const ret = {
					message: 'ok',
					keys: []
				};
				for (let i in resp.rows) {
					ret.keys.push({
						api_key: resp.rows[i].doc._id,
						roles: resp.rows[i].doc.roles,
						ts_created: resp.rows[i].doc.timestamp,
						description: resp.rows[i].doc.description
					});
				}
				return cb(null, ret);
			}
		});
	};

	//--------------------------------------------------
	// Delete an api key in the database
	//--------------------------------------------------
	/*
		req: {
			params: {
				key_id: "<api key id here>"
			}
		}
	*/
	exports.delete_api_key = (req, cb) => {

		// build a notification doc
		const notice = { message: 'deleting api key ' + req.params.key_id.substring(0, 4) + '***' };
		t.notifications.procrastinate(req, notice);

		// delete the doc
		const get_opts = {
			db_name: ev.DB_SYSTEM,		// db for storing things
			_id: req.params.key_id,
			SKIP_CACHE: true
		};
		t.otcc.repeatDelete(get_opts, 1, (err_getDoc, resp) => {
			if (err_getDoc) {
				logger.error('[permissions] unable to delete api key doc', err_getDoc);
				return cb(err_getDoc);
			} else {
				logger.info('[permissions] successfully deleted the api key doc');
				return cb(null, { message: 'ok', deleted: req.params.key_id });
			}
		});
	};

	//--------------------------------------------------
	// Change my own password
	//--------------------------------------------------
	exports.change_password = (req, cb) => {
		if (ev.AUTH_SCHEME !== 'couchdb' && !req._dry_run) {
			logger.error('[pass] cannot edit passwords when auth scheme is ', ev.AUTH_SCHEME);
			return cb({ statusCode: 400, msg: 'cannot edit passwords when auth scheme is ' + ev.AUTH_SCHEME });
		} else {

			// get the Athena settings doc first
			t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, (err, settings_doc) => {
				if (err || !settings_doc) {
					logger.error('[pass] could not get settings doc to edit users', err);
					return cb(err);
				} else {
					let input_errors = [];
					if (!settings_doc.access_list) {
						settings_doc.access_list = {};									// init
					}

					// validate the new password
					const uuid = t.middleware.getUuid(req);
					const email = find_users_email(uuid, settings_doc);
					if (!email && !req._dry_run) {
						input_errors.push('user by uuid does not exist: ' + encodeURI(uuid));
					} else {
						req.body.desired_pass = typeof req.body.desired_pass === 'string' ? req.body.desired_pass.trim() : '';	// protect user from whitespace

						const result = owasp.test(req.body.desired_pass);
						if (result && Array.isArray(result.errors) && result.errors.length > 0) {
							input_errors = input_errors.concat(result.errors);
						}
					}

					// check results of the password
					if (input_errors.length >= 1) {
						logger.error('[pass] not a viable password. rule failures');
						return cb({ statusCode: 400, msg: input_errors, }, null);
					} else if (req._dry_run === true) {
						logger.info('[pass] detected dry-run password change. password would be valid.');	// dry run doesn't edit the pass or check existing
						return cb(null, { message: 'ok', details: 'password would be valid' });
					}

					// check if the current password was entered correctly
					else {
						let salt = ev.ACCESS_LIST[email].salt;
						let known_hashed_secret = ev.ACCESS_LIST[email].hashed_secret;
						if (!known_hashed_secret && ev.DEFAULT_USER_PASSWORD) {			// if DEFAULT_USER_PASSWORD is null, don't do use this fallback
							logger.warn('[pass] no password set for user', t.misc.censorEmail(email), '. will use default password');
							const secret_details = t.misc.salt_secret(ev.DEFAULT_USER_PASSWORD);
							salt = secret_details.salt;
							known_hashed_secret = secret_details.hashed_secret;
						}

						const valid_password = t.misc.verify_secret(req.body.pass, salt, known_hashed_secret);	// check if input is correct
						if (!valid_password) {
							input_errors.push('old password is invalid');
						} else {

							// update with the new password
							const secret_details = t.misc.salt_secret(req.body.desired_pass);
							settings_doc.access_list[email].salt = secret_details.salt;
							settings_doc.access_list[email].hashed_secret = secret_details.hashed_secret;
							settings_doc.access_list[email].ts_changed_password = Date.now();
						}

						// last minute escape
						if (input_errors.length >= 1) {
							logger.error('[pass] cannot change password. old password was wrong:', input_errors);
							return cb({ statusCode: 400, msg: input_errors, }, null);
						} else {

							// update the settings doc user password
							const wr_opts = {
								db_name: ev.DB_SYSTEM,
								doc: settings_doc
							};
							t.otcc.repeatWriteSafe(wr_opts, (doc) => {
								doc.access_list = settings_doc.access_list;
								return { doc: doc };
							}, (err_writeDoc) => {
								if (err_writeDoc) {
									logger.error('[pass] cannot edit settings doc to change password:', err_writeDoc);
									return cb({ statusCode: 500, msg: 'could not update settings doc', details: err_writeDoc }, null);
								} else {
									logger.info('[pass] changing password - success');

									ev.update(null, err => {												// reload ev settings
										if (err) {
											logger.error('error updating config settings', err);
											return cb({ statusCode: 500, msg: 'could not update config settings' }, null);
										} else {
											//req.session.destroy(() => {			// important to call destroy so express ask for new sid
											return cb(null, { message: 'ok', details: 'password updated' });	// all good
											//});
										}
									});
								}
							});
						}
					}
				}
			});
		}
	};

	//--------------------------------------------------
	// Reset some user's password
	//--------------------------------------------------
	exports.reset_password = (req, cb) => {
		if (ev.AUTH_SCHEME !== 'couchdb') {
			logger.error('cannot reset passwords when auth scheme is ', ev.AUTH_SCHEME);
			return cb({ statusCode: 400, msg: 'cannot reset passwords when auth scheme is ' + ev.AUTH_SCHEME });
		} else {

			// get the Athena settings doc first
			t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, (err, settings_doc) => {
				if (err || !settings_doc) {
					logger.error('could not get settings doc to reset user password', err);
					return cb(err);
				} else {
					let input_errors = [];
					if (!settings_doc.access_list) {
						settings_doc.access_list = {};									// init
					}

					// validate the input
					const uuids = req.body ? (req.body.uuids || req.body.users) : null;	// uuids is correct, users is legacy
					if (!uuids || !Array.isArray(uuids) || uuids.length === 0) {
						logger.error('the field "users" is missing or not an array or empty', uuids);
						input_errors.push('the field "users" is missing or not an array or empty');
					}
					for (let i in uuids) {
						const uuid = uuids[i];
						const email = find_users_email(uuid, settings_doc);
						if (!email) {
							input_errors.push('user does not exist: ' + uuid);
						} else {

							// update with nothing so that default gets used
							settings_doc.access_list[email].salt = null;
							settings_doc.access_list[email].hashed_secret = null;
							settings_doc.access_list[email].ts_changed_password = Date.now();
						}
					}

					if (input_errors.length >= 1) {
						logger.error('cannot reset password. bad input:', input_errors);
						cb({ statusCode: 400, msg: input_errors, }, null);
					} else {

						// update the settings doc
						const wr_opts = {
							db_name: ev.DB_SYSTEM,
							doc: settings_doc
						};
						t.otcc.repeatWriteSafe(wr_opts, (doc) => {
							doc.access_list = settings_doc.access_list;
							return { doc: doc };
						}, (err_writeDoc) => {
							if (err_writeDoc) {
								logger.error('cannot edit settings doc to change password:', err_writeDoc);
								cb({ statusCode: 500, msg: 'could not update settings doc', details: err_writeDoc }, null);
							} else {
								logger.info('[permissions] reset password - success');

								ev.update(null, err => {											// reload ev settings
									if (err) {
										logger.error('error updating config settings', err);
										return cb({ statusCode: 500, msg: 'could not update config settings' }, null);
									} else {
										cb(null, { message: 'ok', uuids: uuids });			// all good
									}
								});
							}
						});
					}
				}
			});
		}
	};

	// ------------------------------------------
	//  get user information - not async
	// ------------------------------------------
	exports.get_user_info = function (req) {
		const email = t.middleware.getEmail(req);
		let code = 200;
		if (!t.middleware.isAuthenticated(req)) {
			code = 202;
		}
		const ret = {
			statusCode: code,
			logged: t.middleware.isAuthenticated(req),				// true if user has logged in with auth scheme
			authorized_actions: t.middleware.getActions(req),		// true if user has permissions on service
			loggedInAs: {
				name: t.middleware.getName(req),
				email: email,
			},
			censoredEmail: t.misc.censorEmail(email),				// to see what it looks like in the logs
			uuid: t.middleware.getUuid(req),
			session_id: t.middleware.getPartialSessionId(req),
			crn_string: ev.CRN_STRING || '?',
			crn: ev.CRN || {},
			session_expiration_ts: req.session ? req.session.backend_expires : '?',
			session_expires_in_ms: req.session ? (req.session.backend_expires - Date.now()) : '?',
		};
		if (ev.AUTH_SCHEME === 'couchdb') {
			ret.password_type = t.middleware.getPasswordType(req);
		}
		return t.misc.sortKeys(ret);
	};

	//--------------------------------------------------
	// Store a new access token
	//--------------------------------------------------
	exports.create_access_token = (req, cb) => {
		let input_errors = [];
		let roles = (req && req.body && req.body.roles) ? req.body.roles : null;
		let expiration_secs = (req && req.body && !isNaN(req.body.expiration_secs)) ? req.body.expiration_secs : 3600;
		const parsed_auth = t.auth_header_lib.parse_auth(req);
		const lc_username = (parsed_auth && parsed_auth.name) ? parsed_auth.name.toLowerCase() : null;
		const MAX_EXPIRATION_SECS = 60 * 60 * 24 * 15;

		// init roles from user
		if (!Array.isArray(roles) || roles.length === 0) {
			roles = ev.ACCESS_LIST[lc_username].roles;
		}

		const lc_roles = validate_roles(roles);		// check the input roles
		if (lc_roles === false) {
			input_errors.push('invalid roles for api key. valid roles:' + JSON.stringify(Object.keys(ev.ROLES_TO_ACTIONS)));
		} else if (lc_roles.length === 0) {
			input_errors.push('must have at least 1 role for key.');
		}

		// check if user has these roles (this is overly protective, to even create a token the user needs "manager" which is the highest)
		if (input_errors.length === 0) {
			for (let i in roles) {
				const role = roles[i];
				if (!ev.ACCESS_LIST[lc_username].roles.includes(role)) {
					logger.warn('[permissions] user doe not have role. roles:', ev.ACCESS_LIST[lc_username].roles);
					input_errors.push('invalid roles, cannot set a role that the creating user does not have.');
					break;
				}
			}
		}

		// check expiration
		if (expiration_secs < 0 || expiration_secs > MAX_EXPIRATION_SECS) {
			input_errors.push('invalid expiration. must be between 0 and ' + MAX_EXPIRATION_SECS + ' seconds.');
		}

		if (input_errors.length >= 1) {
			logger.error('[permissions] cannot create access token. bad input:', input_errors);
			cb({ statusCode: 400, msg: input_errors, }, null);
		} else {

			const access_token_doc = exports.generate_access_token(lc_username, roles, expiration_secs);

			// build a notification doc
			const notice = {
				message: 'creating access token ' + access_token_doc._id.substring(0, 4) + '***',
			};
			t.notifications.procrastinate(req, notice);

			// write the access token doc
			const wr_opts = {
				db_name: ev.DB_SYSTEM,
				doc: access_token_doc
			};
			t.otcc.createNewDoc(wr_opts, access_token_doc, (err_writeDoc, resp_writeDoc) => {
				if (err_writeDoc) {
					logger.error('[permissions] unable to write new access token doc', err_writeDoc);
					return cb(err_writeDoc);
				} else {
					logger.info('[permissions]  creating the access token doc - success');
					const ret = {
						access_token: resp_writeDoc._id,		// the id is the token!
						refresh_token: 'not_supported',
						token_type: 'Bearer',
						expires_in: resp_writeDoc.expires_in,
						expiration: resp_writeDoc.expiration,
						scope: 'ibp bearer',

						roles: resp_writeDoc.roles,
						message: 'ok'
					};
					return cb(null, ret);
				}
			});
		}
	};

	//--------------------------------------------------
	// Generate access token for exchange
	//--------------------------------------------------
	exports.generate_access_token = (lc_name, roles, expires_in) => {
		const token = t.misc.generateRandomString(32);		// this is the token, its a secret
		const secret_details = t.misc.salt_secret(token);
		const now = Date.now();

		const lc_roles = [];
		for (let i in roles) {
			lc_roles.push(roles[i].toLowerCase());			// make an array w/all lower case
		}

		const payload = {
			typ: ev.STR.IBP_TOKEN,							// use this to identify our internal access tokens from IAM's
			user: lc_name ? lc_name.substring(0, 32) : '',
		};

		const token_doc = {
			_id: 't.' + t.misc.b64(JSON.stringify(payload)) + '.' + t.misc.generateRandomString(63),	// must start with a letter
			roles: lc_roles,
			salt: secret_details.salt,
			hashed_secret: secret_details.hashed_secret,
			timestamp: now,									// add timestamp
			expiration: now + expires_in * 1000,
			expires_in: expires_in,
			created_by: lc_name,
			type: 'access_token_doc',						// add doc type
		};

		// it shouldn't be possible for generateRandomString to make an id with a colon but just in case.. remove it
		token_doc._id.replace(/:/g, '');					// never allow a colon (it would be an invalid basic auth username)
		return token_doc;
	};

	//--------------------------------------------------
	// Delete an access token from the database
	//--------------------------------------------------
	/*
		req: {
			params: {
				id: "<api key id here>"
			}
		}
	*/
	exports.delete_access_token = (req, cb) => {

		// build a notification doc
		const notice = { message: 'deleting access token ' + req.params.id.substring(0, 4) + '***' };
		t.notifications.procrastinate(req, notice);

		// delete the doc
		const get_opts = {
			db_name: ev.DB_SYSTEM,		// db for storing things
			_id: req.params.id,
			SKIP_CACHE: true
		};
		t.otcc.repeatDelete(get_opts, 1, (err_getDoc, resp) => {
			if (err_getDoc) {
				logger.error('[permissions] unable to delete access token doc', err_getDoc);
				return cb(err_getDoc);
			} else {
				logger.info('[permissions] successfully deleted the access token doc:', req.params.id.substring(0, 4));
				return cb(null, { message: 'ok', deleted: req.params.id });
			}
		});
	};

	//--------------------------------------------------
	// Get access token details
	//--------------------------------------------------
	exports.get_access_token = (id, cb) => {
		t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: id }, (err, access_token_doc) => {
			if (err || !access_token_doc) {
				logger.error('[permissions] could not get access token doc for id:', id, err);
				return cb(err);
			} else {
				const ret = {
					access_token: access_token_doc._id,				// the id is the token
					roles: access_token_doc.roles,
					creation: access_token_doc.timestamp,
					expiration: access_token_doc.expiration,
					time_left: t.misc.friendly_ms(access_token_doc.expiration - Date.now()),
					created_by: access_token_doc.created_by,
				};
				return cb(null, ret);

			}
		});
	};

	//--------------------------------------------------
	// Parse a JWT (access token) - returns payload as parsed JSON
	//--------------------------------------------------
	exports.parse_ibp_token = (token) => {
		try {
			if (typeof token === 'string') {
				const parts = token.split('.');						// its a jwk, split it
				if (parts && parts[1]) {							// payload is in the middle one
					return JSON.parse(t.misc.decodeb64(parts[1]));	// JSON should be here
				}
			}
		} catch (e) { }												// oh well it wasn't
		return null;
	};

	// dsh todo - auto remove expired docs

	//--------------------------------------------------
	// Get a valid iam token doc for current user (an expired token will not be returned)
	//--------------------------------------------------
	exports.get_valid_iam_token_doc = (req, cb) => {
		const session_user_id = t.middleware.getUuid(req);
		if (!session_user_id) {
			logger.error('[migration] unable to get iam token b/c unable to find uuid for user in session');
			return cb({ message: 'unable to get an iam token b/c unable to find the uuid for user in session' });
		} else {

			// first get the doc
			t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: session_user_id, SKIP_CACHE: true }, (err, access_token_doc) => {
				if (err || !access_token_doc) {
					logger.warn('[migration] could not get IAM access token doc for id:', session_user_id, err);

					// backup method - try using a view and grab the first iam token (this is only for dev!)
					const opts = {
						db_name: ev.DB_SYSTEM,
						_id: '_design/athena-v1',
						view: '_doc_types',
						query: t.misc.formatObjAsQueryParams({ include_docs: true, key: 'iam_token', group: false, reduce: false }),
					};
					t.couch_lib.getDesignDocView(opts, (err2, resp) => {
						let doc = null;
						if (resp && resp.rows && resp.rows[0]) {
							doc = resp.rows[0].doc;
						}

						if (doc) {
							logger.debug('[migration] was able to get IAM access token from backup method');
							return proceed(doc);
						} else {
							logger.error('[migration] could not get IAM access token via view');
							return cb(err);
						}
					});
				} else {
					return proceed(access_token_doc);
				}
			});
		}

		function proceed(access_token_doc) {
			// parse the access token
			let found_valid_token = false;
			const parsed_access_token = exports.parse_ibp_token(access_token_doc.accessToken);
			if (!parsed_access_token) {
				logger.error('[migration] unable to parse meta data of IAM access token for id:', session_user_id);
			} else {
				if (access_token_doc.testing === true) {								// a debug token will allow us to return an old token for testing
					found_valid_token = true;
				}

				// check if its expired
				const time_left_ms = (parsed_access_token.exp * 1000) - Date.now();		// exp is in seconds, make it ms
				if (time_left_ms < 0) {
					logger.error('[migration] IAM access token has expired for id:', session_user_id, Date.now(), parsed_access_token.exp);
				} else {
					found_valid_token = true;
					logger.debug('[migration] IAM access token is still valid for id:', session_user_id,
						'time left:', t.misc.friendly_ms(time_left_ms));
				}
			}

			// return the whole doc we found if valid
			if (!found_valid_token) {
				logger.warn('[migration] did not find valid IAM access token for id:', session_user_id);
				return cb({ message: 'user\'s iam token is invalid' });
			} else {
				logger.debug('[migration] found valid IAM access token for id:', session_user_id);
				return cb(null, access_token_doc);
			}
		}
	};

	// ------------------------------------------
	//  get user's IAM information - is async
	// ------------------------------------------
	exports.get_users_iam_info = function (req, cb) {
		const ret = exports.get_user_info(req);
		exports.get_valid_iam_token_doc(req, (err, iam_token_doc) => {
			if (iam_token_doc) {
				ret.iamId = iam_token_doc ? iam_token_doc._id : '';
				ret.iamAccessToken = iam_token_doc ? iam_token_doc.accessToken : '';
				ret.iamRefreshToken = iam_token_doc ? iam_token_doc.refreshToken : '';
				ret.iamParsedMetaData = exports.parse_ibp_token(ret.iamAccessToken);
			}
			return cb(null, t.misc.sortKeys(ret));
		});
	};

	return exports;
};
