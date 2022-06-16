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
// App ID, IBM ID SSO, and local login routes
// - Based on https://www.npmjs.com/package/ibmcloud-appid
//------------------------------------------------------------
module.exports = function (logger, ev, t, passport) {
	const app = t.express.Router();

	//-----------------------------------------------------------------------------
	// Handle SSO Login - iam/appid/ibmid auth schemes
	//-----------------------------------------------------------------------------
	app.get(ev.LOGIN_URI, t.middleware.public, function (req, res, next) {
		t.auth_lib.sso_login(req, res, next, passport);
	});

	//-----------------------------------------------------------------------------
	// Handle alternative logins - couchdb/ldap auth schemes
	//-----------------------------------------------------------------------------
	app.post('/api/v[123]/auth/login', t.middleware.public, function (req, res, next) {
		t.auth_lib.alt_login(req, res, next, passport);
	});

	//-----------------------------------------------------------------------------
	// App ID Redirect URL
	//-----------------------------------------------------------------------------
	//app.get(ev.CALLBACK_URI, passport.authenticate(t.AppIdWebAppStrategy.STRATEGY_NAME, { allowAnonymousLogin: true }));

	//-----------------------------------------------------------------------------
	// Logout URL
	//-----------------------------------------------------------------------------
	app.get(ev.LOGOUT_URI, t.middleware.public, function (req, res) {
		const notice = { message: 'user logging out of the IBP console' };
		t.notifications.procrastinate(req, notice);

		req.session.destroy(() => {														// important to call destroy so express ask for new sid
			if (req.query && req.query.action === 'no_redirect') {
				res.status(200).send('OK');
			} else {
				res.redirect(ev.LANDING_URL);
			}
		});
	});

	return app;
};
