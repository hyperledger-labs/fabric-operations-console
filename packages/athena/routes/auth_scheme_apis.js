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
// Auth_Scheme API Routes
// - Sets and gets the apps Auth Scheme settings
//------------------------------------------------------------
module.exports = function (logger, ev, t) {
	const app = t.express.Router();

	//***********************************************************************************************************
	// API calls with session auth
	//--------------------------------------------------
	// Change the auth scheme settings
	//--------------------------------------------------
	app.put('/api/v[123]/authscheme', t.middleware.verify_users_action_init_session, (req, res) => {
		changeAuthSchemeSettings(req, res);
	});

	//--------------------------------------------------
	// Get auth settings
	//--------------------------------------------------
	app.get('/api/v[123]/authscheme', t.middleware.public, (req, res) => {		// cannot add auth to this api, needs to be open
		const auth_scheme_settings = t.auth_scheme.get_current_auth_scheme(req);
		return res.status(200).json(auth_scheme_settings);
	});
	app.get('/ak/api/v[123]/authscheme', t.middleware.verify_view_action_ak, (req, res) => {
		const auth_settings = t.auth_scheme.get_auth_settings(req);
		return res.status(200).json(auth_settings);
	});

	//--------------------------------------------------
	// Change the auth scheme settings
	//--------------------------------------------------
	function changeAuthSchemeSettings(req, res) {
		t.auth_scheme.change_auth_scheme_settings(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	}

	return app;
};
