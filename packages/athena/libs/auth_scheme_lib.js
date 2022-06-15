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
// auth_scheme_lib.js - Library functions for auth scheme apis
//------------------------------------------------------------
module.exports = function (logger, ev, t) {
	const exports = {};

	//--------------------------------------------------
	// Get current auth scheme
	//--------------------------------------------------
	/*
	* req: {}  // request object
	*/
	exports.get_current_auth_scheme = (req) => {
		const isAuthenticated = t.middleware.isAuthenticated(req);

		let ret = {
			authenticated: isAuthenticated,
			auth_scheme: ev.AUTH_SCHEME,
			host_url: ev.HOST_URL,
			configtxlator_url: ev.CONFIGTXLATOR_URL,
			login_uri: ev.LOGIN_URI,
			logout_uri: ev.LOGOUT_URI,
			admin_list: [],									// populated below - legacy..
			access_list: [], 								// populated below - legacy..
			all_users: [],
		};

		if (isAuthenticated) {
			ret.all_users = JSON.parse(JSON.stringify(ev.ACCESS_LIST));	// ? i guess we need this
			ret.admin_contact_email = ev.ADMIN_CONTACT_EMAIL;

			if (ev.AUTH_SCHEME === 'appid' && ev.APP_ID) {	// copy all app id fields
				for (let key in ev.APP_ID) {
					ret[key] = ev.APP_ID[key];
				}
			}

			for (let email in ret.all_users) {
				const lc_email = email.toLowerCase();
				const user = {
					email: lc_email,
					uuid: ret.all_users[email].uuid,
					created: ret.all_users[email].created,
					roles: ret.all_users[email].roles,
				};
				if (t.middleware.emailIsAdmin(lc_email)) {	// add each admin email to legacy array
					ret.admin_list.push(user);
				} else {
					ret.access_list.push(user);				// add each email to legacy array
				}
			}

			for (let email in ret.all_users) {				// iter on users and add duplicate email field, apollo logic is easier if email is inside the object
				ret.all_users[email].email = email;			// that's a lot of emails
			}
		}
		return ret; 										// return whole app_id section
	};

	//--------------------------------------------------
	// Change auth scheme settings
	//--------------------------------------------------
	/*
	* req: {}  // request object
	*/
	exports.change_auth_scheme_settings = (req, cb) => {

		// build a notification doc
		const notice = { message: 'editing auth settings' };
		t.notifications.procrastinate(req, notice);

		// get the Athena settings doc first
		t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, (err, doc_to_write) => {
			if (err) {
				logger.error('[auth scheme] failed to get doc to edit auth scheme settings', err);
				return cb(err);
			} else {
				if (ev.AUTH_SCHEME && (ev.AUTH_SCHEME === 'ibmid' || ev.AUTH_SCHEME === 'iam') && req.body.auth_scheme === 'appid') {
					return cb({ statusCode: 400, msg: 'Your auth_scheme is "ibmid". You are not allowed to change it to "appid"' });
				}

				// build access list - it is optional
				let access_list = {};
				if (req.body.users) {
					access_list = buildAccessList(doc_to_write.access_list, req.body.users);
				}

				// original doc before we merge the validated properties
				doc_to_write.auth_scheme = req.body.auth_scheme;
				if (req.body.auth_scheme === 'reset') {					// "reset" allows us to go back to the empty state
					doc_to_write.auth_scheme = 'initial';
					doc_to_write.access_list = {};
					doc_to_write.app_id = t.config_file.app_id;
				}

				// gather the properties that repeatWriteSafe needs to write the doc
				const wr_opts = {
					db_name: ev.DB_SYSTEM,
					doc: doc_to_write
				};

				// properties should be validated if the provider isn't ibmid
				if (req.body.auth_scheme === 'ibmid' || req.body.auth_scheme === 'iam' || req.body.auth_scheme === 'reset') {
					writeDoc(wr_opts, doc_to_write, req, (code, resp) => {
						return cb(null, resp);
					});
				} else {
					doc_to_write.app_id = {
						auth_scheme: req.body.auth_scheme,
						oauth_url: req.body.oauth_url,
						secret: req.body.secret,
						tenant_id: req.body.tenant_id,
						client_id: req.body.client_id,
					};
					doc_to_write.access_list = access_list;
					if (req.body.admin_contact_email) {									// write the admin contact email address
						doc_to_write.admin_contact_email = req.body.admin_contact_email.toLowerCase();
					}
					if (doc_to_write.app_id && doc_to_write.app_id.auth_scheme) {		// delete redundant field
						delete doc_to_write.app_id.auth_scheme;
					}

					writeDoc(wr_opts, doc_to_write, req, (code, resp) => {
						return cb(null, resp);
					});
				}
			}
		});
	};

	//--------------------------------------------------
	// Get auth settings
	//--------------------------------------------------
	/*
	* req: {}  // request object
	*/
	exports.get_auth_settings = () => {
		let ret = {
			auth_scheme: ev.AUTH_SCHEME,
			host_url: ev.HOST_URL,
			configtxlator_url: ev.CONFIGTXLATOR_URL,
			login_uri: ev.LOGIN_URI,
			logout_uri: ev.LOGOUT_URI,
			admin_list: [],									// populated below - legacy..
			access_list: [], 								// populated below - legacy..
			all_users: JSON.parse(JSON.stringify(ev.ACCESS_LIST)),
			admin_contact_email: ev.ADMIN_CONTACT_EMAIL
		};
		for (let email in ev.ACCESS_LIST) {
			const lc_email = email.toLowerCase();
			const user = {
				email: lc_email,
				uuid: ev.ACCESS_LIST[email].uuid,
				created: ev.ACCESS_LIST[email].created,
			};
			if (t.middleware.emailIsAdmin(lc_email)) {		// add each admin email to legacy array
				ret.admin_list.push(user);
			} else {
				ret.access_list.push(user);					// add each email to legacy array
			}
		}
		if (ev.AUTH_SCHEME === 'appid' && ev.APP_ID) {
			for (let key in ev.APP_ID) {
				ret[key] = ev.APP_ID[key];
			}
		}
		for (let email in ret.all_users) {				// iter on users and add duplicate email field, apollo logic is easier if email is inside the object
			ret.all_users[email].email = email;			// that's a lot of emails
		}
		return ret;				// return whole app_id section
	};

	/*
		Checks to see if there is an access list already in the settings doc. If so then those users are preserved and not overwritten.
	 */
	function buildAccessList(existing, incoming) {
		const sanitize_existing = {};
		for (let email in existing) {
			sanitize_existing[email.toLowerCase()] = existing[email];					// make keys lower case
		}
		for (let in_email in incoming) {
			const lc_in_email = in_email.toLowerCase();
			if (sanitize_existing[lc_in_email]) {										// user exists, copy over new admin flag
				sanitize_existing[lc_in_email].admin = (incoming[in_email].admin === true);
			} else {																	// user does not exist, make new entry
				sanitize_existing[lc_in_email] = {
					created: Date.now(),
					admin: (incoming[in_email].admin === true),
					uuid: t.uuidv4()
				};
			}
		}
		return sanitize_existing;
	}

	// actually write the revised settings doc back to the database to update Athena's settings
	function writeDoc(wr_opts, modified_doc, req, cb) {
		t.otcc.repeatWriteSafe(wr_opts, (doc) => {
			modified_doc._rev = doc._rev;
			return { doc: modified_doc };
		}, (err_writeDoc) => {
			if (err_writeDoc) {
				logger.error('[auth scheme] failed to get doc to edit auth scheme settings');
				return cb(500, err_writeDoc);
			} else {
				logger.info('[auth scheme] auth scheme settings changed');
				ev.update(null, err => {								// reload ev settings
					if (err) {
						logger.error('error updating ev', err);
						return cb(400, err);
					} else {
						t.update_passport();							// update the passport - new oauth_url

						// PUT was successful. Set the response accordingly
						const update_provider = {
							message: 'ok',
							provider: req.body.auth_scheme
						};
						return cb(200, update_provider);
					}
				});
			}
		});
	}

	return exports;
};
