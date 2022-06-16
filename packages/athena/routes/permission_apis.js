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
// Permission API Routes
//------------------------------------------------------------
module.exports = function (logger, ev, t) {
	const app = t.express.Router();

	//--------------------------------------------------
	// Get users
	//--------------------------------------------------
	app.get('/api/v[123]/permissions/users', t.middleware.verify_view_action_session, (req, res) => {
		get_users(req, res);
	});
	app.get('/ak/api/v[123]/permissions/users', t.middleware.verify_view_action_ak, (req, res) => {
		get_users(req, res);
	});

	function get_users(req, res) {
		if (t.ot_misc.is_v2plus_route(req)) {
			req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/permissions/users';
			logger.debug('[pre-flight] setting validate route:', req._validate_path);
		}

		t.validate.request(req, res, null, () => {
			t.permissions_lib.get_users(req, (_, users) => {
				res.status(200).json(users);
			});
		});
	}

	//--------------------------------------------------
	// Adds users
	//--------------------------------------------------
	app.post('/api/v[123]/permissions/users', t.middleware.verify_users_action_init_session, (req, res) => {
		add_users(req, res);
	});
	app.post('/ak/api/v[123]/permissions/users', t.middleware.verify_users_action_init_ak, (req, res) => {
		add_users(req, res);
	});
	function add_users(req, res) {
		if (t.ot_misc.is_v2plus_route(req)) {
			req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/permissions/users';
			logger.debug('[pre-flight] setting validate route:', req._validate_path);
		}

		t.validate.request(req, res, null, () => {
			t.permissions_lib.add_users(req, (err, ret) => {
				if (err) {
					return res.status(t.ot_misc.get_code(err)).json(err);
				} else {
					return res.status(200).json(ret);
				}
			});
		});
	}

	//--------------------------------------------------
	// Edit users
	//--------------------------------------------------
	app.put('/api/v[123]/permissions/users', t.middleware.verify_users_action_session, (req, res) => {
		edit_users(req, res);
	});
	app.put('/ak/api/v[123]/permissions/users', t.middleware.verify_users_action_ak, (req, res) => {
		edit_users(req, res);
	});
	function edit_users(req, res) {
		if (t.ot_misc.is_v2plus_route(req)) {
			req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/permissions/users';
			logger.debug('[pre-flight] setting validate route:', req._validate_path);
		}

		t.validate.request(req, res, null, () => {
			t.permissions_lib.edit_users(req, (err, ret) => {
				if (err) {
					return res.status(t.ot_misc.get_code(err)).json(err);
				} else {
					return res.status(200).json(ret);
				}
			});
		});
	}

	//--------------------------------------------------
	// Deletes users
	//--------------------------------------------------
	app.delete('/api/v[123]/permissions/users', t.middleware.verify_users_action_session, (req, res) => {
		delete_users(req, res);
	});
	app.delete('/ak/api/v[123]/permissions/users', t.middleware.verify_users_action_ak, (req, res) => {
		delete_users(req, res);
	});
	function delete_users(req, res) {
		if (t.ot_misc.is_v2plus_route(req)) {
			req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/permissions/users';
			logger.debug('[pre-flight] setting validate route:', req._validate_path);
		}

		t.validate.request(req, res, null, () => {
			t.permissions_lib.delete_users(req, (err, ret) => {
				if (err) {
					return res.status(t.ot_misc.get_code(err)).json(err);
				} else {
					return res.status(200).json(ret);
				}
			});
		});
	}

	//--------------------------------------------------
	// Store an api key in the database
	//--------------------------------------------------
	app.post('/api/v[123]/permissions/keys', t.middleware.verify_apiKey_action_session, (req, res) => {
		t.permissions_lib.create_api_key(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});
	app.post('/ak/api/v[123]/permissions/keys', t.middleware.verify_apiKey_action_ak, (req, res) => {
		t.permissions_lib.create_api_key(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Get all api keys from the db
	//--------------------------------------------------
	app.get('/api/v[123]/permissions/keys', t.middleware.verify_view_action_session, (req, res) => {
		t.permissions_lib.get_api_keys(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});
	app.get('/ak/api/v[123]/permissions/keys', t.middleware.verify_view_action_ak, (req, res) => {
		t.permissions_lib.get_api_keys(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Delete an api key doc
	//--------------------------------------------------
	app.delete('/api/v[123]/permissions/keys/:key_id', t.middleware.verify_apiKey_action_session, (req, res) => {
		t.permissions_lib.delete_api_key(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});
	app.delete('/ak/api/v[123]/permissions/keys/:key_id', t.middleware.verify_apiKey_action_ak, (req, res) => {
		t.permissions_lib.delete_api_key(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Change password
	//--------------------------------------------------
	app.put('/api/v[123]/permissions/users/password', t.middleware.checkAuthentication, (req, res) => {
		t.permissions_lib.change_password(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Test/Validate a password (in terms of strength)
	//--------------------------------------------------
	app.post('/api/v[123]/permissions/users/password', t.middleware.checkAuthentication, (req, res) => {
		req._dry_run = true;
		t.permissions_lib.change_password(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Reset password
	//--------------------------------------------------
	app.put('/api/v[123]/permissions/users/password/reset', t.middleware.verify_users_action_session, (req, res) => {
		t.permissions_lib.reset_password(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});
	app.put('/ak/api/v[123]/permissions/users/password/reset', t.middleware.verify_users_action_ak, (req, res) => {
		t.permissions_lib.reset_password(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});

	//-----------------------------------------------------------------------------
	// Get user information (also applies to api keys if user has authenticated w/key)
	//-----------------------------------------------------------------------------
	app.get('/api/v[123]/users/info', t.middleware.public, function (req, res, next) {
		const data = t.permissions_lib.get_user_info(req);
		res.status(data.statusCode).json(data);
	});
	app.get('/ak/api/v[123]/users/info', t.middleware.verify_view_action_ak, function (req, res, next) {
		const data = t.permissions_lib.get_user_info(req);
		res.status(data.statusCode).json(data);
	});

	//--------------------------------------------------
	// Store/create a access token  in the database (aka bearer token)
	//--------------------------------------------------
	app.post('/api/v3/identity/token', t.middleware.verify_apiKey_action_session, (req, res) => {
		t.permissions_lib.create_access_token(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});
	app.post('/ak/api/v3/identity/token', t.middleware.verify_apiKey_action_ak, (req, res) => {
		t.permissions_lib.create_access_token(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Delete a access token  from the database (aka bearer token)
	//--------------------------------------------------
	app.delete('/api/v3/identity/token/:id', t.middleware.verify_apiKey_action_session, (req, res) => {
		t.permissions_lib.delete_access_token(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});
	app.delete('/ak/api/v3/identity/token/:id', t.middleware.verify_apiKey_action_ak, (req, res) => {
		t.permissions_lib.delete_access_token(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Get access token details from the database
	//--------------------------------------------------
	app.get('/api/v3/identity/token/:id', t.middleware.verify_apiKey_action_session, (req, res) => {
		t.permissions_lib.get_access_token(req.params.id, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});
	app.get('/ak/api/v3/identity/token/:id', t.middleware.verify_apiKey_action_ak, (req, res) => {
		t.permissions_lib.get_access_token(req.params.id, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});

	return app;
};
