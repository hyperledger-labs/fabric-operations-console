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
// ca_lib.js - CA processing/managing functions
//------------------------------------------------------------
module.exports = (logger, ev, t) => {
	const exports = {};

	exports.commonFabricCASetup = (opts, cb) => {
		logger.debug('performing common CA tasks - create TLS options, create Fabric CA Client, enrollment, create signing identity');
		// properties created in the lib and needed to enroll the admin and get the affiliations

		const tlsOptions = t.fabric_utils.setTLSOptions(opts.ca_tls_opts.pem);			// Sets the TLS properties
		let fabricCAClient = null;

		try {
			fabricCAClient = t.fabric_utils.createFabricCAClient(opts, tlsOptions);		// All properties needed for a CA client
		} catch (e) {
			logger.error('unable to run createFabricCAClient. error:', e);
			return cb({ statusCode: 500, msg: e });
		}

		logger.debug('enrolling Fabric CA Client');
		t.enroll_lib.enroll(fabricCAClient, (err, resp) => {
			if (err) {
				logger.error('problem enrolling Fabric CA Client');
				const errMessage = 'problem with "enrollCA" function of the "commonFabricCASetup" function';
				logger.error(errMessage);			//log any error here
				err.backend_context = errMessage;	// add error message to the error to pass back to the caller
				return cb(err);
			}
			logger.info('successfully enrolled Fabric CA Client');

			// get the enrollment back from the enrollCA call - still needs some other properties
			const enrollment = resp;

			// add the private key to the enrollment
			enrollment.key = enrollment.pvtkey;

			//logger.debug('creating the signing identity');
			// now create the signing id, which will be added as a property to the fabricCAClient
			const signingIdentity_opts = {
				certificate: enrollment.certificate,
				public_key: enrollment.pubKey,
				msp_id: opts.ca_name,
				_enrollment_key: enrollment.pvtkey
			};

			// add the signing ID to the fabricCAClient before sending it back to the API
			t.signingIdentity = t.signing_lib.createSigningIdEntity(signingIdentity_opts);
			fabricCAClient.enrollment = enrollment;
			return cb(null, fabricCAClient);
		});
	};

	//--------------------------------------------------
	// List all Users - returns all enroll ids for this CA
	//--------------------------------------------------
	/*
		fabricCAClient: {
			ca_name: "",
			msp_id: "",
			protocol: "",
			hostname: "",
			port: "",
			tlsOptions: {},
			baseAPI: "",
			enrollmentID: "",
			enrollmentSecret: "",
			method: ""
		},
	 */
	exports.getUsers = (fabricCAClient, cb) => {
		logger.debug(`attempting to get all users for the ID ${fabricCAClient.enrollmentID}`);
		const err = {};
		err.statusCode = 500;

		// get the auth token
		const auth_token = t.fabric_utils.generateAuthToken(null);

		// build the request object to get all identities
		const options = {
			baseUrl: fabricCAClient.protocol + '//' + fabricCAClient.hostname + ':' + fabricCAClient.port,
			url: fabricCAClient.baseAPI + 'identities' + '?ca=' + fabricCAClient.ca_name,
			method: 'GET',
			headers: {
				Authorization: auth_token
			},
			ca: fabricCAClient.tlsOptions.trustedRoots,
			rejectUnauthorized: fabricCAClient.tlsOptions.verify
		};

		// execute the request to get users
		t.request(options, (err_getUsers, resp_getUsers) => {
			if (err_getUsers) {
				logger.error(`problem getting all users for the ID ${fabricCAClient.enrollmentID}`);
				return cb(err_getUsers);
			} else if (resp_getUsers && resp_getUsers.statusCode >= 400) {
				const msg = resp_getUsers.body;
				logger.error(`problem getting all users for the ID ${fabricCAClient.enrollmentID}`, resp_getUsers.statusCode, msg);
				return cb({ statusCode: resp_getUsers.statusCode, msg: msg });
			} else {
				if (!resp_getUsers.body) {
					logger.error(`problem getting all users for the ID ${fabricCAClient.enrollmentID}`);
					err.msg = 'problem getting all identities';
					return cb(err);
				} else {
					logger.info(`successfully got all users for the ID ${fabricCAClient.enrollmentID}`);
					const body = (typeof resp_getUsers.body === 'string') ? JSON.parse(resp_getUsers.body) : resp_getUsers.body;
					return cb(null, body);
				}
			}
		});
	};

	//-------------------------------------------------------------------
	// Register User - creates a new identity with the CA (aka a new enroll ID and secret)
	//-------------------------------------------------------------------
	/*
		fabricCAClient: {
			ca_name: "",
			msp_id: "",
			protocol: "",
			hostname: "",
			port: "",
			tlsOptions: {},
			baseAPI: "",
			enrollmentID: "",
			enrollmentSecret: "",
			method: ""
		},
		newIdentity: ""
	 */
	exports.registerUser = (fabricCAClient, newIdentity, cb) => {
		logger.debug(`attempting to register identity '${newIdentity.id}'`);

		// create an error object in case we need to return any errors
		const err = {};
		err.statusCode = 500;

		// get the auth token
		const auth_token = t.fabric_utils.generateAuthToken(newIdentity);

		// build the request object to get all identities
		const options = {
			baseUrl: fabricCAClient.protocol + '//' + fabricCAClient.hostname + ':' + fabricCAClient.port,
			url: fabricCAClient.baseAPI + 'identities',
			body: JSON.stringify(newIdentity),
			method: 'POST',
			headers: {
				Authorization: auth_token
			},
			ca: fabricCAClient.tlsOptions.trustedRoots,
			rejectUnauthorized: fabricCAClient.tlsOptions.verify
		};

		// execute the request to register the identity
		t.request(options, (err_registerIdentity, resp_registerIdentity) => {
			if (err_registerIdentity) {
				logger.error(`problem registering the identity '${newIdentity.id}'`);
				return cb(err_registerIdentity);
			} else if (resp_registerIdentity && resp_registerIdentity.statusCode >= 400) {
				const msg = resp_registerIdentity.body;
				logger.error(`problem registering identity '${newIdentity.id}'`, resp_registerIdentity.statusCode, msg);
				return cb({ statusCode: resp_registerIdentity.statusCode, msg: msg });
			} else {
				if (!resp_registerIdentity.body) {
					logger.error(`problem registering the identity '${newIdentity.id}'`);
					err.msg = 'problem enrolling identity';
					return cb(err);
				} else {
					logger.debug(`registering the identity '${newIdentity.id}'`);

					// create and return the response
					const body = (typeof resp_registerIdentity.body === 'string') ? JSON.parse(resp_registerIdentity.body) : resp_registerIdentity.body;
					if (body.errors && body.errors.length && body.errors.length > 0) {
						logger.error(`problem registering the identity '${newIdentity.id}'`);
						const errMsg = 'Error: fabric-ca request identities failed with errors ';
						const customError = t.fabric_utils.format_error_msg(body.errors, errMsg);
						return cb(customError, null);
					}
					logger.info(`successfully registered the identity '${newIdentity.id}'`);
					return cb(null, body);
				}
			}
		});
	};

	//-------------------------------------------------------------------
	// Get Affiliations
	//-------------------------------------------------------------------
	/*
		fabricCAClient: {
			ca_name: "",
			msp_id: "",
			protocol: "",
			hostname: "",
			port: "",
			tlsOptions: {},
			baseAPI: "",
			enrollmentID: "",
			enrollmentSecret: "",
			method: ""
		},
	*/
	exports.getAffiliations = (fabricCAClient, cb) => {
		logger.debug(`attempting to get all affiliations for the ID '${fabricCAClient.enrollmentID}'`);

		// create an error object in case we need to return any errors
		const err = {};
		err.statusCode = 500;

		// get the auth token
		const auth_token = t.fabric_utils.generateAuthToken(null);

		// build the request object to get all identities
		const options = {
			baseUrl: fabricCAClient.protocol + '//' + fabricCAClient.hostname + ':' + fabricCAClient.port,
			url: fabricCAClient.baseAPI + 'affiliations' + '?ca=' + fabricCAClient.ca_name,
			method: 'GET',
			headers: {
				Authorization: auth_token
			},
			ca: fabricCAClient.tlsOptions.trustedRoots,
			rejectUnauthorized: fabricCAClient.tlsOptions.verify
		};

		// execute the request to get the affiliations
		t.request(options, (err_getAffiliations, resp_getAffiliations) => {
			if (err_getAffiliations) {
				logger.error(`error getting all affiliations for the ID '${fabricCAClient.enrollmentID}'`);
				return cb(err_getAffiliations);
			} else if (resp_getAffiliations && resp_getAffiliations.statusCode >= 400) {
				const msg = resp_getAffiliations.body;
				logger.error(`error getting all affiliations for the ID '${fabricCAClient.enrollmentID}'`, resp_getAffiliations.statusCode, msg);
				return cb({ statusCode: resp_getAffiliations.statusCode, msg: msg });
			} else {
				if (!resp_getAffiliations.body) {
					logger.error(`error getting all affiliations for the ID '${fabricCAClient.enrollmentID}'`);
					err.msg = 'problem getting affiliations';
					return cb(err);
				} else {
					logger.info(`successfully got all affiliations for the ID '${fabricCAClient.enrollmentID}'`);
					const body = (typeof resp_getAffiliations.body === 'string') ? JSON.parse(resp_getAffiliations.body) : resp_getAffiliations.body;
					return cb(null, body);
				}
			}
		});
	};

	//-------------------------------------------------------------------
	// Re-enroll User - reenrolls an existing user and returns a new cert
	//-------------------------------------------------------------------
	/*
		fabricCAClient: {
			baseAPI: "",
			ca_name: "",
			certificate: {},
			enrollment: {},
			enrollmentID: "",
			enrollmentSecret: "",
			hostname: "",
			method: "",
			msp_id: "",
			port: "",
			private_key: {},
			protocol: "",
			tlsOptions: {},
		}
		Note: we first generate a new key pair because we want to register the newly generated
		private key during the re-enrollment. This new private key and the cert obtained during
		re-enrollment are returned back to the caller
	 */
	exports.reenrollUser = (fabricCAClient, cb) => {
		logger.debug(`attempting to reenroll '${fabricCAClient.ca_name}'`);

		// create an error object in case we need to return any errors
		const err = {};
		err.statusCode = 500;

		t.key_lib.generateKey((error, pair) => {
			if (error) {
				logger.error(`problem generating key pair ${error}`);
				err.msg = `problem generating key pair ${error}`;
				return cb(err);
			}

			// create re-enroll object - (use private key from the generateKey request)
			const reenrollCSR = {
				certificate_request: t.key_lib.generateCSR('CN=' + fabricCAClient.enrollmentID, pair.prvKeyObj)
			};

			// get the auth token (csr)
			const auth_token = t.fabric_utils.generateAuthToken(reenrollCSR, t.signingIdentity);

			// build the request re-enroll the user
			const options = {
				baseUrl: fabricCAClient.protocol + '//' + fabricCAClient.hostname + ':' + fabricCAClient.port,
				url: fabricCAClient.baseAPI + 'reenroll',
				body: JSON.stringify(reenrollCSR),
				method: 'POST',
				headers: {
					Authorization: auth_token
				},
				ca: fabricCAClient.tlsOptions.trustedRoots,
				rejectUnauthorized: fabricCAClient.tlsOptions.verify
			};

			// execute the request to register the identity
			t.request(options, (err_reenroll, resp_reenroll) => {
				if (err_reenroll) {
					logger.error(`problem re-enrolling the user '${fabricCAClient.ca_name}'`);
					return cb(err_reenroll);
				} else if (resp_reenroll && resp_reenroll.statusCode >= 400) {
					const msg = resp_reenroll.body;
					logger.error(`problem re-enrolling the user '${fabricCAClient.ca_name}'`, resp_reenroll.statusCode, msg);
					return cb({ statusCode: resp_reenroll.statusCode, msg: msg });
				} else {
					if (!resp_reenroll.body) {
						logger.error(`problem re-enrolling the user - no body object returned '${fabricCAClient.ca_name}'`);
						err.msg = 'problem re-enrolling user';
						return cb(err);
					} else {
						logger.debug(`re-enrolling the user '${fabricCAClient.ca_name}'`);

						// create and return the response
						const body = (typeof resp_reenroll.body === 'string') ? JSON.parse(resp_reenroll.body) : resp_reenroll.body;
						body.private_key = t.key_lib.toBytes(pair.prvKeyObj);
						if (body.errors && body.errors.length && body.errors.length > 0) {
							logger.error(`problem re-enrolling the user '${fabricCAClient.ca_name}'`);
							const errMsg = 'Error: fabric-ca re-enroll user failed with errors ';
							const customError = t.fabric_utils.format_error_msg(body.errors, errMsg);
							return cb(customError, null);
						}
						logger.info(`successfully re-enrolled the user '${fabricCAClient.ca_name}'`);
						return cb(null, body);
					}
				}
			});
		});
	};

	//-------------------------------------------------------------------
	// Delete CA Identity
	//-------------------------------------------------------------------
	/*
		fabricCAClient: {
			ca_name: "",
			msp_id: "",
			protocol: "",
			hostname: "",
			port: "",
			tlsOptions: {},
			baseAPI: "",
			enrollmentID: "",
			enrollmentSecret: "",
			method: ""
		},
		enroll_id_to_delete: "",
	*/
	exports.deleteCAIdentity = (fabricCAClient, enroll_id_to_delete, cb) => {
		logger.debug(`attempting to get delete the ID ${enroll_id_to_delete}`);
		// create an error object in case we need to return any errors
		const err = {};
		err.statusCode = 500;

		// get the auth token
		const auth_token = t.fabric_utils.generateAuthToken(null);

		// build the request object to get all identities
		const options = {
			baseUrl: fabricCAClient.protocol + '//' + fabricCAClient.hostname + ':' + fabricCAClient.port,
			url: fabricCAClient.baseAPI + 'identities/' + enroll_id_to_delete,
			method: 'DELETE',
			headers: {
				Authorization: auth_token
			},
			ca: fabricCAClient.tlsOptions.trustedRoots,
			rejectUnauthorized: fabricCAClient.tlsOptions.verify
		};

		t.request(options, (err_deleteIdentity, resp_deleteIdentity) => {
			if (err_deleteIdentity) {
				logger.error(`problem deleting ${enroll_id_to_delete}`);
				return cb(err);
			} else if (resp_deleteIdentity && resp_deleteIdentity.statusCode >= 400) {
				const msg = resp_deleteIdentity.body;
				logger.error(`problem deleting ${enroll_id_to_delete}`, resp_deleteIdentity.statusCode, msg);
				return cb({ statusCode: resp_deleteIdentity.statusCode, msg: msg });
			} else {
				if (resp_deleteIdentity.body) {
					logger.debug(`deleting ${enroll_id_to_delete}`);

					//create and return response - could include errors
					const body = (typeof resp_deleteIdentity.body === 'string') ? JSON.parse(resp_deleteIdentity.body) : resp_deleteIdentity.body;
					if (body.errors && body.errors.length && body.errors.length > 0) {
						logger.error(`problem deleting ${enroll_id_to_delete}`);
						const errMsg = 'Error: fabric-ca request identities failed with errors ';
						const customError = t.fabric_utils.format_error_msg(body.errors, errMsg);
						return cb(customError, null);
					}
					logger.info(`successfully deleted ${enroll_id_to_delete}`);
					return cb(null, body);
				} else {
					logger.error(`problem deleting ${enroll_id_to_delete}`);
					err.msg = 'problem deleting identity';
					return cb(err);
				}
			}
		});
	};

	// to bites
	exports.toBytes = (key) => {
		return t.key_lib.toBytes(key);
	};

	//-------------------------------------------------------------
	// get the enroll ID from a 64 bit PEM encoded certificate
	//-------------------------------------------------------------
	exports.getEnrollIdIfNeeded = function (options) {
		// if no enroll_id or secret was passed in then we need to check for the cert/private_key pair and then get the enroll_id from the cert
		logger.debug('checking for enroll_id and enroll_secret. If they were not passed then try to get the enroll_id from the cert');
		if (!options.enroll_id || !options.enroll_secret) { // if we find the enroll_id and the enroll_secret then we'll use those to generate a cert
			const credentials_error = {};
			credentials_error.statusCode = 400;
			if (!options.certificate || !options.private_key) { // make sure we actually have a cert and a private key or the request will fail
				credentials_error.msg = 'missing part or all of the enroll credentials';
				if (!options.certificate) {
					credentials_error.msg += ' or the certificate';
				}
				if (!options.private_key) {
					credentials_error.msg = ' and the private_key';
				}
				logger.error(credentials_error.msg);
				return credentials_error;
			}

			// get the enroll_id from the cert
			logger.debug('attempting to get the enroll id from the cert');
			const enroll_id = t.misc.getEnrollIdFromCert(options.certificate);

			// make sure the enroll_id was not actually passed back
			if (!enroll_id) {
				const err = {};
				err.statusCode = 400;
				err.msg = 'passed certificate was invalid';
				return err;
			}
			return enroll_id;
		}
	};

	//-------------------------------------------------------------
	// Register enroll id
	//-------------------------------------------------------------
	exports.register_id = function (req, cb) {
		logger.info(`post to register identity ${req.body.new_enroll_id} using the ID ${req.body.enroll_id}`);
		const opts = {
			api_url: req.body.api_url || req.body.ca_url,
			ca_name: req.body.ca_name,				//'org1CA',
			ca_tls_opts: {
				pem: null
			},
			enroll_id: req.body.enroll_id,			//'admin',
			enroll_secret: req.body.enroll_secret,	//'secret',
			certificate: req.body.certificate,
			private_key: req.body.private_key,
			method: 'POST',
		};

		// build a notification doc
		const notice = { message: 'registering CA enroll id: ' + req.body.new_enroll_id };
		t.notifications.procrastinate(req, notice);

		// if the enroll_id wasn't passed in we need to get it
		if (!opts.enroll_id || !opts.enroll_secret) {
			opts.enroll_id = exports.getEnrollIdIfNeeded(opts);
			if (opts.enroll_id && opts.enroll_id.statusCode) {	// is it an error response?
				const error = opts.enroll_id;		// rename, just b/c
				return cb(error, null);				// error already logged in ca_lib
			}
		}

		t.ca_lib.commonFabricCASetup(opts, (err, fabricCAClient) => {
			if (err) {
				logger.error('[ca lib] registering identity failure', err);
				return cb(err, null); 				// error already logged in ca_lib
			}

			const newIdentity = {
				id: req.body.new_enroll_id,
				secret: req.body.new_enroll_secret,
				caName: req.body.ca_name,
				affiliation: req.body.affiliation,
				attrs: req.body.attrs,
				type: req.body.type,
				max_enrollments: Number(req.body.max_enrollments)
			};

			if (req.body.new_enroll_id && req.body.new_enroll_secret) { // enroll_id and enroll_secret cannot have spaces
				const invalid_char_err = exports.invalidIdOrSecret(req.body.new_enroll_id, req.body.new_enroll_secret);
				if (invalid_char_err) {
					return cb(invalid_char_err, null);
				}
			}

			// actually register the new identity
			t.ca_lib.registerUser(fabricCAClient, newIdentity, (err_registerUser, resp_registerUser) => {
				if (err_registerUser) {
					logger.error('[ca lib] registering identity failure', err_registerUser);
					return cb({ statusCode: 500, msg: err_registerUser }, null); // error already logged in ca_lib
				} else {
					logger.info('[ca lib] registering identity - success');
					resp_registerUser.message = 'ok';
					return cb(null, resp_registerUser);
				}
			});
		});
	};

	//-------------------------------------------------------------
	// Enroll the enroll id
	//-------------------------------------------------------------
	exports.enroll = function (req, cb) {
		const opts = {
			api_url: req.body.api_url || req.body.ca_url,
			ca_name: req.body.ca_name,					//'org1CA',
			ca_tls_opts: {
				pem: null
			},
			enroll_id: req.body.enroll_id,				//'admin',
			enroll_secret: req.body.enroll_secret,		//'secret'
			method: 'POST',
		};

		t.ca_lib.commonFabricCASetup(opts, (err, fabricCAClient) => {
			if (err) {
				logger.error('[ca lib] failed to setup ca obj to enroll', err);
				return cb(err, null); 					// error already logged in ca_lib
			}
			logger.info('[ca lib] enrolling id - success');
			const key = t.ca_lib.toBytes(fabricCAClient.enrollment.key._key);
			const ret = {
				ca_name: opts.ca_name, 					// the ca name that was used
				enroll_id: opts.enroll_id, 				// then enroll id that was used
				certificate: t.misc.formatPEM(fabricCAClient.enrollment.certificate),	// the signed cert in PEM format
				private_key: t.misc.formatPEM(key),		// the private key in PEM format
				message: 'ok',
			};
			return cb(null, ret);
		});
	};

	//-------------------------------------------------------------
	// Get enroll ids
	//-------------------------------------------------------------
	exports.get_ids = function (req, cb) {
		const opts = {
			api_url: req.body.api_url || req.body.ca_url,
			ca_name: req.body.ca_name,				//'org1CA',
			ca_tls_opts: {
				pem: null
			},
			enroll_id: req.body.enroll_id,			//'admin',
			enroll_secret: req.body.enroll_secret,	//'secret',
			certificate: req.body.certificate,
			private_key: req.body.private_key,
			method: 'POST'
		};

		// if the enroll_id wasn't passed in we need to get it
		if (!opts.enroll_id || !opts.enroll_secret) {
			opts.enroll_id = t.ca_lib.getEnrollIdIfNeeded(opts);
			if (opts.enroll_id && opts.enroll_id.statusCode) {	// is it an error response?
				const error = opts.enroll_id;					// rename, just b/c
				return cb(error, null);							// error already logged in ca_lib
			}
		}

		t.ca_lib.commonFabricCASetup(opts, (err, fabricCAClient) => {
			if (err) {
				logger.error('[ca lib] failed to setup ca obj to get ids', err);
				return cb(err, null); 					// error already logged in ca_lib
			}
			// actually get the affiliations of the admin sending the request
			t.ca_lib.getUsers(fabricCAClient, (err_getUsers, resp_getUsers) => {
				if (err_getUsers) {
					logger.error('[ca lib] getting ids failure', err_getUsers);
					return cb(err_getUsers, null);
				}
				logger.info('[ca lib] get ids - success');
				return cb(null, resp_getUsers.result.identities);
			});
		});
	};

	//-------------------------------------------------------------
	// Get affiliations
	//-------------------------------------------------------------
	exports.get_affiliation = function (req, cb) {
		const opts = {
			api_url: req.body.api_url || req.body.ca_url,
			ca_name: req.body.ca_name,		//'org1CA',
			ca_tls_opts: {
				pem: null
			},
			enroll_id: req.body.enroll_id,				//'admin',
			enroll_secret: req.body.enroll_secret,		//'secret'
			certificate: req.body.certificate,
			private_key: req.body.private_key,
			method: 'POST',
		};

		// if the enroll_id wasn't passed in we need to get it
		if (!opts.enroll_id || !opts.enroll_secret) {
			opts.enroll_id = t.ca_lib.getEnrollIdIfNeeded(opts);
			if (opts.enroll_id && opts.enroll_id.statusCode) {	// is it an error response?
				const error = opts.enroll_id;					// rename, just b/c
				return cb(error, null);							// error already logged in ca_lib
			}
		}

		t.ca_lib.commonFabricCASetup(opts, (err, fabricCAClient) => {
			if (err) {
				logger.error('[ca lib] failed to setup ca obj to get affiliations', err);
				return cb(err, null); 					// error already logged in ca_lib
			}
			// actually get the affiliations of the admin sending the request
			t.ca_lib.getAffiliations(fabricCAClient, (err_getAffiliations, resp_getAffiliations) => {
				if (err_getAffiliations) {
					logger.error('[ca lib] getting affiliations failure', err_getAffiliations);
					return cb(err_getAffiliations, null);
				}
				logger.info('[ca lib] get affiliations - success');
				return cb(null, resp_getAffiliations.result.affiliations);
			});
		});
	};

	//-------------------------------------------------------------
	// Return an error if enroll_id or enroll_secret have invalid characters
	//-------------------------------------------------------------
	exports.invalidIdOrSecret = (enroll_id, enroll_secret) => {
		const regex_invalid_chars = new RegExp(/[\s"]/);
		const errors = [];

		// check id
		if (typeof enroll_id !== 'string') {
			errors.push('The enroll id must be a string');
		} else {
			if (regex_invalid_chars.test(enroll_id)) {
				errors.push('The enroll id cannot contain spaces or double quotes');
			}
		}

		// check secret
		if (typeof enroll_secret !== 'string') {
			errors.push('The enroll secret must be a string');
		} else {
			if (regex_invalid_chars.test(enroll_secret)) {
				errors.push('The enroll secret cannot contain spaces or double quotes');
			}
		}

		// return errors if any
		if (errors.length > 0) {
			return { statusCode: 400, msg: errors.join('. ') };
		} else {
			return false;
		}
	};

	return exports;
};
