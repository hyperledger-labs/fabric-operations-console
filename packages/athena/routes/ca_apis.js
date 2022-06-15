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
// CA API Routes
//------------------------------------------------------------
module.exports = (logger, ev, t) => {
	const app = t.express.Router();

	//--------------------------------------------------
	// Get all CA users/identity
	//--------------------------------------------------
	app.post('/api/v[123]/cas/users/get', t.middleware.verify_view_action_session, (req, res) => {
		t.ca_lib.get_ids(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Register a new CA user/identity
	//--------------------------------------------------
	app.post('/api/v[123]/cas/users/register', t.middleware.verify_manage_action_session, (req, res) => {
		t.ca_lib.register_id(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Get Affiliations cert w/ca
	//--------------------------------------------------
	app.post('/api/v[123]/cas/users/affiliations/get', t.middleware.verify_view_action_session, (req, res) => {
		t.ca_lib.get_affiliation(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Get Cert and Private Key from CA (enroll an id)
	//--------------------------------------------------
	app.post('/api/v[123]/cas/cert/get', t.middleware.verify_manage_action_session, (req, res) => {
		t.ca_lib.enroll(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Delete Identity
	//--------------------------------------------------
	app.post('/api/v[123]/cas/users/delete', t.middleware.verify_manage_action_session, (req, res) => {

		// build a notification doc
		const censored = (req.body && req.body.enroll_id_to_delete) ? req.body.enroll_id_to_delete.substring(0, 3) : null;
		const notice = { message: 'deleting CA enroll id: ' + censored + '***' };
		t.notifications.procrastinate(req, notice);

		logger.info('attempting to delete an identity');
		const opts = {
			api_url: req.body.api_url || req.body.ca_url,
			ca_name: req.body.ca_name,							//'org1CA',
			ca_tls_opts: {
				pem: null
			},
			enroll_id: req.body.enroll_id,						//'admin',
			enroll_secret: req.body.enroll_secret,				//'secret'
			enroll_id_to_delete: req.body.enroll_id_to_delete,
			certificate: req.body.certificate,
			private_key: req.body.private_key,
			method: 'POST'
		};

		// if the enroll_id wasn't passed in we need to get it
		if (!opts.enroll_id || !opts.enroll_secret) {
			opts.enroll_id = t.ca_lib.getEnrollIdIfNeeded(opts);
			if (opts.enroll_id && opts.enroll_id.statusCode) {
				const error = opts.enroll_id;
				return res.status(t.ot_misc.get_code(error)).json(error);	// error already logged in ca_lib
			}
		}

		t.ca_lib.commonFabricCASetup(opts, (err, fabricCAClient) => {
			if (err) {
				logger.error('[ca apis] deleting identity - failure', err);
				return res.status(500).json(err);	// error already logged in ca_lib
			}

			// actually delete the identity
			t.ca_lib.deleteCAIdentity(fabricCAClient, opts.enroll_id_to_delete, (err_deleteCAIdentity, resp_deleteCAIdentity) => {
				if (err_deleteCAIdentity) {
					logger.error('[ca apis] deleting identity - failure', err_deleteCAIdentity);
					return res.status(500).json(err_deleteCAIdentity);
				} else {
					logger.info('[ca apis] deleting identity - success');
					return res.status(200).json(resp_deleteCAIdentity);
				}
			});
		});
	});

	//--------------------------------------------------
	// Reenroll user
	//--------------------------------------------------
	app.post('/api/v[123]/cas/users/reenroll', t.middleware.verify_manage_action_session, (req, res) => {

		// build a notification doc
		const notice = { message: 're-enrolled against CA' };
		t.notifications.procrastinate(req, notice);

		logger.info('[ca apis] attempting to reenroll a user');
		const opts = {
			api_url: req.body.api_url || req.body.ca_url,
			ca_name: req.body.ca_name,							//'org1CA',
			ca_tls_opts: {
				pem: null
			},
			certificate: req.body.certificate,
			private_key: req.body.private_key,
			method: 'POST'
		};

		// get the enroll id because it wasn't passed in
		opts.enroll_id = t.ca_lib.getEnrollIdIfNeeded(opts);
		if (opts.enroll_id && opts.enroll_id.statusCode) {
			const error = opts.enroll_id;
			return res.status(t.ot_misc.get_code(error)).json(error);	// error already logged in ca_lib
		}

		t.ca_lib.commonFabricCASetup(opts, (err, fabricCAClient) => {
			if (err) {
				logger.error('[ca apis] re-enrolling user - failure', err);
				return res.status(500).json(err);
			}

			// actually re-enroll the user
			t.ca_lib.reenrollUser(fabricCAClient, (err_reenrollUser, resp_reenrollUser) => {
				if (err_reenrollUser) {
					logger.error('[ca apis] re-enrolling user - failure', err_reenrollUser);
					return res.status(500).json(err_reenrollUser);
				} else {
					logger.info('[ca apis] re-enrolling user - success');
					const ret = {
						ca_name: opts.ca_name, 											// the ca name that was used
						enroll_id: opts.enroll_id, 										// then enroll id that was used
						certificate: resp_reenrollUser.result.Cert, 					// the signed cert in PEM format
						private_key: t.misc.formatPEM(resp_reenrollUser.private_key) 	// the private key in PEM format
					};
					return res.status(200).json(ret);
				}
			});
		});
	});

	return app;
};
