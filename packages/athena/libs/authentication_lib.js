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
// authentication_lib.js - Library auth related functions
//------------------------------------------------------------
module.exports = function (logger, ev, t) {
	const exports = {};

	// ------------------------------------------
	// Handle SSO login (OAuth 2 flows)
	// ------------------------------------------
	exports.sso_login = function (req, res, next, passport) {
		if (ev.AUTH_SCHEME === 'couchdb') {
			logger.warn('[passport] redirecting to local login');
			res.redirect('/api/v1/auth/login');
		} else if (ev.AUTH_SCHEME === 'ibmid' || ev.AUTH_SCHEME === 'iam' || ev.AUTH_SCHEME === 'oauth') {
			const url_parts = t.url.parse(req.url, true);
			let fallback = false;											// fallback is used when cookie cannot be set

			// --- Inspect query params for state/cookie status --- //
			if (!url_parts || !url_parts.query || !url_parts.query.code) {
				logger.debug('[passport] no auth code yet, so looks like the first oauth attempt');
				req.session.cookie_test = 'working';						// try to set this now, check later
			} else {
				if (!req.session || !req.session.cookie_test) {				// check if cookies are working
					logger.warn('[passport] not the first attempt and there is no prev session. lets use the fallback page');
					fallback = true;
				} else {
					logger.debug('[passport] auth code is present, we have successfully oauth-ed');
				}
			}

			// --- How is the session? --- //
			if (fallback === true) {										// handle edge case where cookie fails to set (session won't stick)
				log_notification();
				logger.error('[passport] cookies are not working!');
				res.setHeader('Access-Control-Expose-Headers', 'Location');
				res.status(500).json({ msg: 'cannot login. session is not being set or cookies are not supported.' });
			} else {

				// --- Passport --- //
				const strategy_name = ev.AUTH_SCHEME === 'iam' ? ev.IAM.STRATEGY_NAME : ev.IBM_ID.STRATEGY_NAME;
				logger.debug('[passport] using auth scheme:', strategy_name);
				passport.authenticate(strategy_name, function (e, profile) {
					if (profile) {
						req._email = profile.email || profile.name || null;
						log_notification();
					}

					if (e != null) {
						logger.error('[passport] error:', typeof e, e);

						// don't reply with the iam error details to appease the pen-testers
						if (url_parts && url_parts.query && url_parts.query.code) {
							res.status(400).json({ oauth_error: 'could not exchange oauth code for a token' });	// avoid redirect loop, show error
						} else {
							res.status(500).json({ oauth_error: 'oauth flow encountered an error' });	// avoid redirect loop, show error
						}
					} else {
						req.session.passport_profile = profile;			// store the passport data (including iam actions)
						req.session.ip = t.misc.format_ip(req.ip, false);
						req.session.ip_hash = t.misc.format_ip(req.ip, true);
						req.session.debug_remote = req.connection ? req.connection.remoteAddress : null;
						req.session.debug_headers = JSON.parse(JSON.stringify(req.headers));
						if (req.session.debug_headers) {				// remove privacy concerns
							delete req.session.debug_headers.cookie;
							delete req.session.debug_headers.referer;
						}
						logger.info('[passport] iam/oauth login - success');

						// --- Redirect to Home --- //
						req.session.save(() => {						// redirects seem tricky w/ auto session saving, lets wait for the save before returning
							logger.debug('[passport] session saved. redirecting to:', ev.LANDING_URL);
							res.setHeader('Access-Control-Expose-Headers', 'Location');
							res.redirect(ev.LANDING_URL);
						});
					}
				})(req, res, next);										// feed this login request to passport
			}
		}

		// create notification doc
		function log_notification() {
			const notice = { message: 'user logging into the IBP console - sso' };
			t.notifications.procrastinate(req, notice);
		}
	};

	// ------------------------------------------
	// Handle local and ldap logins
	// ------------------------------------------
	exports.alt_login = function (req, res, next, passport) {
		if (ev.AUTH_SCHEME === 'ldap') {
			return exports.ldap_login(req, res, next, passport);
		} else if (ev.AUTH_SCHEME === 'couchdb') {
			return exports.local_login(req, res, next, passport);
		} else {
			logger.error('[passport] bad setup, unknown auth scheme:', ev.AUTH_SCHEME);
			res.setHeader('Access-Control-Expose-Headers', 'Location');
			res.redirect(ev.LANDING_URL);
		}
	};

	// ------------------------------------------
	// Handle local login
	// ------------------------------------------
	exports.local_login = function (req, res, next, passport) {
		if (ev.AUTH_SCHEME === 'couchdb') {
			const notice = { message: 'user logging into the IBP console - local' };

			logger.debug('[passport] logging in use via couch db auth scheme');
			const lc_email = req.body.email ? req.body.email.toLowerCase() : null;
			req.session.couchdb_profile = {									// init the session data
				name: make_name(lc_email),
				email: lc_email,
				password_type: ev.STR.PASS_IS_CUSTOM,						// tells us if the login was done using a default password or not
			};
			req.session.couchdb_profile.uuid = t.middleware.getUuid(req);	// must call this after init of couchdb_profile

			req._email = lc_email || null;
			t.notifications.procrastinate(req, notice);

			// see if too many attempts
			/* [removed] - lockout lib has this covered now
			if (req.session.login_attempts.length >= 5) {
				logger.error('[auth] too many login attempts');
				req.session.couchdb_profile = null;							// reset profile data
				res.status(401).json({ statusCode: 429, msg: 'Too many requests' });
			}
			*/

			// see if user exists
			if (!ev.ACCESS_LIST[lc_email]) {
				logger.error('[auth] invalid email address');
				req.session.couchdb_profile = null;							// reset profile data
				res.status(401).json({ statusCode: 401, msg: 'Unauthorized' });
			}

			// check password
			else {
				let salt = ev.ACCESS_LIST[lc_email].salt;
				let known_hashed_secret = ev.ACCESS_LIST[lc_email].hashed_secret;
				if (!known_hashed_secret && ev.DEFAULT_USER_PASSWORD) {		// if DEFAULT_USER_PASSWORD is null, don't do use this fallback
					logger.warn('[auth] no password set for user', t.misc.censorEmail(lc_email), '. will use default password');
					req.session.couchdb_profile.password_type = (ev.ALLOW_DEFAULT_PASSWORD === true) ? ev.STR.PASS_IS_CUSTOM : ev.STR.PASS_IS_DEFAULT;
					const secret_details = t.misc.salt_secret(ev.DEFAULT_USER_PASSWORD);
					salt = secret_details.salt;
					known_hashed_secret = secret_details.hashed_secret;
				}

				if (!known_hashed_secret) {
					logger.error('[auth] invalid setup. there is no password hash to use.');
					res.status(401).json({ statusCode: 401, msg: 'Unauthorized' });
				} else {

					// check hash of password
					const valid_password = t.misc.verify_secret(req.body.pass, salt, known_hashed_secret);	// check if input is correct
					if (!valid_password) {
						logger.error('[auth] invalid password', t.misc.censorEmail(lc_email));
						req.session.couchdb_profile = null;													// reset profile data
						res.status(401).json({ statusCode: 401, msg: 'Unauthorized' });
					} else {
						req.session.save(() => {			// timing seems tricky w/ auto session saving, lets manually wait for the save before returning
							logger.info('[auth] local login success', t.misc.censorEmail(lc_email));
							const ret = {
								message: 'ok',
								name: req.session.couchdb_profile.name,
								email: lc_email,
								roles: ev.ACCESS_LIST[lc_email].roles
							};
							res.status(200).json(ret);
						});
					}
				}
			}
		}

		// make a name from email
		function make_name(email) {
			if (email && typeof email === 'string') {
				const pos = email.indexOf('@');
				const LIMIT = 20;
				if (pos !== -1) {
					return email.substring(0, pos).substring(0, LIMIT);		// cut string off after @ and limit length
				}
				return email.substring(0, LIMIT);
			}
			return null;
		}
	};

	// ------------------------------------------
	// Handle LDAP login
	// ------------------------------------------
	exports.ldap_login = function (req, res, next, passport) {
		if (ev.AUTH_SCHEME === 'ldap') {
			logger.debug('[passport] using ldap auth scheme:', ev.LDAP.STRATEGY_NAME);
			passport.authenticate(ev.LDAP.STRATEGY_NAME, {
				successRedirect: '/',
				failureRedirect: ev.LOGIN_URI,
			}, (e, profile) => {
				if (profile) {
					req._email = profile.email || profile.uid || profile.cn || null;
					log_notification();
				}

				if (e != null) {
					logger.error('[passport] ldap comm error:', typeof e, e);
					res.status(500).json({ error: 'ldap encountered an error', details: e });
				} else if (profile === false) {
					logger.error('[passport] user failed to login via ldap');
					res.status(400).json({ error: 'could not login user via ldap', details: e });
				} else {
					req.session.passport_profile = profile;			// store the passport data (including iam actions)
					req.session.ip = t.misc.format_ip(req.ip, false);
					req.session.ip_hash = t.misc.format_ip(req.ip, true);
					logger.info('[passport] ldap login - success');

					// --- Redirect to Home --- //
					req.session.save(() => {						// redirects seem tricky w/ auto session saving, lets wait for the save before returning
						const ret = {
							message: 'ok',
							name: profile.givenName,
							email: req._email,
							roles: profile.roles
						};
						res.status(200).json(ret);
					});
				}
			})(req, res, next);										// feed this login request to passport
		}

		// create notification doc
		function log_notification() {
			const notice = { message: 'user logging into the IBP console - ldap' };
			t.notifications.procrastinate(req, notice);
		}
	};

	return exports;
};
