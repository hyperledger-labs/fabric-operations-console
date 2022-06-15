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
// enroll_lib.js - Enroll processing/managing functions
//------------------------------------------------------------
module.exports = (logger, ev, t) => {
	const exports = {};

	//------------------------------------------------------------------
	// Enroll a user
	//------------------------------------------------------------------
	exports.enroll = (req, cb) => {
		// create an error in case we need it
		const err = {};
		err.statusCode = 500;
		err.msg = 'Problem enrolling CA Client';

		// check for required properties first
		if (typeof req === 'undefined' || req === null) {
			err.msg += ' - req was undefined or null';
			return cb(err);
		}
		if (!req.enrollmentID) {
			err.msg += ' - req.enrollmentID was not found';
			return cb(err);
		}
		if (!req.enrollmentSecret && (!req.certificate || !req.private_key)) {
			err.msg += ' - req.enrollmentSecret was not found';
			return cb(err);
		}

		if (req.attr_reqs) {
			if (!Array.isArray(req.attr_reqs)) { 	// should be an array if it exists
				err.msg = 'Invalid enroll request, attr_reqs must be an array of AttributeRequest objects';
				return cb(err);
			} else {
				for (let i in req.attr_reqs) {		// each array member must have a name property
					if (!req.attr_reqs[i].name) {
						err.msg = 'Invalid enroll request, attr_reqs object is missing the name of the attribute';
						return cb(err);
					}
				}
			}
		}

		let privateKey, publicKey;

		if (req.certificate && req.private_key) { // if we have the certs then we can bypass enrollment
			const csr = t.key_lib.generateCSR('CN=' + req.enrollmentID, req.private_key);
			const publicKey = t.key_lib.getPublicKey(req.private_key);

			// err creating csr
			if (csr && csr.statusCode && csr.statusCode === 500) {
				return cb(csr);
			}

			return cb(null, {
				pvtkey: { _key: req.private_key },
				public_key: { _key: publicKey },
				pubKey: { _key: publicKey },
				certificate: req.certificate
			});
		} else { // no keys passed in so we'll have fabric generate them
			t.key_lib.generateKey((err, key_pair) => {
				if (err) {
					return cb(err);
				}

				// createCsrAndCallDoEnrollment(key_pair);
				// split the key pair up into public and private
				privateKey = key_pair.prvKeyObj;
				publicKey = key_pair.pubKeyObj;

				// create the csr to send to the doEnrollment
				const csr = t.key_lib.generateCSR('CN=' + req.enrollmentID, key_pair.prvKeyObj);
				// err creating csr
				if (csr && csr.statusCode && csr.statusCode === 500) {
					return cb(csr);
				}

				// actually do the enrollment
				exports.doEnrollment(req, csr, (err_enroll, resp_enroll) => {
					if (err_enroll) {
						return cb(err_enroll);
					}

					// return the enrollment object
					return cb(null, {
						pvtkey: { _key: privateKey },
						public_key: { _key: publicKey },
						pubKey: { _key: publicKey },
						certificate: resp_enroll.enrollmentCert
					});
				});
			});
		}
	};

	//------------------------------------------------------------------
	// This function actually makes the REST call to enroll the identity
	//------------------------------------------------------------------
	exports.doEnrollment = (opts, csr, cb) => {

		// create the request object body
		const enrollRequest = {
			caName: opts.ca_name,
			certificate_request: csr
		};

		// if the following properties were passed in we'll add them to the request object's body
		if (opts.profile) {
			enrollRequest.profile = opts.profile;
		}
		if (opts.attr_reqs) {
			enrollRequest.attr_reqs = opts.attr_reqs;
		}

		// prepare the options for the call
		const options = {
			baseUrl: opts.protocol + '//' + opts.hostname + ':' + opts.port,
			method: opts.method,
			url: opts.baseAPI + 'enroll',
			body: JSON.stringify(enrollRequest),
			headers: {
				Authorization: 'Basic ' + Buffer.from(opts.enrollmentID + ':' + opts.enrollmentSecret).toString('base64')
			},
			ca: opts.tlsOptions.trustedRoots,
			rejectUnauthorized: opts.tlsOptions.verify
		};
		const safe_opts_log = JSON.parse(JSON.stringify(options));				// clone options that are safe to log
		delete safe_opts_log.headers;
		logger.debug(`attempting to enroll the identity ${opts.enrollmentID}`, options.method, options.baseUrl);

		// actually do the enrollment
		t.request(options, (err, resp) => {
			// create a custom error
			const customError = {};
			customError.statusCode = 500;

			if (err) {
				logger.error(`problem making request to enroll the identity ${opts.enrollmentID}`, err);
				return cb({ statusCode: 500, msg: 'could not make request to enroll', safe_opts: safe_opts_log });
			} else if (resp && resp.statusCode >= 400) {
				const msg = resp.body;
				logger.error(`error response from request to enroll the identity ${opts.enrollmentID}`, resp.statusCode, msg);
				return cb({ statusCode: resp.statusCode, msg: msg, safe_opts: safe_opts_log });
			} else {
				if (!resp.body) {
					logger.error(`missing body in response to enroll the identity ${opts.enrollmentID}`);
					customError.msg = 'problem enrolling identity, missing response';
					return cb(customError);
				} else {
					logger.info(`successfully enrolled the identity ${opts.enrollmentID}`);

					// create and return the response
					const body = (typeof resp.body === 'string') ? JSON.parse(resp.body) : resp.body;
					//logger.debug(`result body of the enrollment request - ${resp.body}`);

					const enrollResponse = {};
					try {
						enrollResponse.enrollmentCert = Buffer.from(body.result.Cert, 'base64').toString();
					} catch (e) {
						customError.msg = 'problem trying to create a buffer from the enrollmentCert or the caCertChain.' +
							'check the faultyArgument property of the error: ' + e;
						customError.faultyArgument = { 'enrollmentCert': body.result.cert };
						return cb(customError);
					}
					try {
						enrollResponse.caCertChain = Buffer.from(body.result.ServerInfo.CAChain, 'base64').toString();
					} catch (e) {
						customError.msg = `problem trying to create a buffer from the caCertChain cert. check the faultyArgument property of the error: ${e}`;
						customError.faultyArgument = { 'enrollmentCert': body.result.ServerInfo.CAChain };
						return cb(customError);
					}
					return cb(null, enrollResponse);
				}
			}
		});
	};

	return exports;
};
