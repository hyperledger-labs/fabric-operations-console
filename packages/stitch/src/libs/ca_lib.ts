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

// Libs built by us
import { generateCaAuthToken, scGenCSR, scGenEcdsaKeys, parseCertificate } from './crypto_misc';
import { fmt_ca_err, fmt_ca_ok } from './validation';
import { Ext } from './asn1_lib';
import { logger } from './misc';

// exports
export { getCaIdentities, scGenCSR, getCaAffiliations, registerCaIdentity, enrollCaIdentity, reenrollCaIdentity, deleteCaIdentity, Ext };

// --------------------------------------------------------------------------------
// Get registered users on a CA aka enroll ids - this ca api takes token auth
// --------------------------------------------------------------------------------
/*
	opts: {
		host: 'https://184.172.241.139:30148?ca=ca',
		ca_name: 'ca',
		client_prv_key_b64pem: "",
		client_cert_b64pem: "",
	}
*/
function getCaIdentities(opts: CaInput, cb: Function) {
	const options = JSON.parse(JSON.stringify(opts));
	options.body_obj = null;						// set null for token gen

	let called_cb = false;
	generateCaAuthToken(options, (_: any, token: string) => {
		const fetch_options = {
			host: build_ca_url(options, '/api/v1/identities'),
			authorization: token,
			funk: 'getCaIdentities',
		};
		fetch_get_json(fetch_options).then(response => {
			called_cb = true;
			if (!response || !response.success) {		// errors get sent in a `errors` array
				return cb(fmt_ca_err(fetch_options, response, 'Failed to get identities'), response);
			} else {
				return cb(null, fmt_ca_ok(fetch_options, response, null));
			}
		}).catch(error => {								// likely isn't possible to get here
			if (called_cb) {
				throw error;							// if we already sent our callback, this must be an apollo js error, throw it away
			} else {
				called_cb = true;
				logger.error('[stitch] getCaIdentities - caught js error:', error);
				return cb(fmt_ca_err(fetch_options, error, 'Caught JS error when getting the CA identities'), null);
			}
		});
	});
}

// --------------------------------------------------------------------------------
// Get affiliations on a CA - this ca api takes token auth
// --------------------------------------------------------------------------------
/*
	opts: {
		host: 'https://184.172.241.139:30148?ca=ca',
		ca_name: 'ca',
		client_prv_key_b64pem: "",
		client_cert_b64pem: "",
	}
*/
function getCaAffiliations(opts: CaInput, cb: Function) {
	const options = JSON.parse(JSON.stringify(opts));
	options.body_obj = null;						// set null for token gen

	let called_cb = false;
	generateCaAuthToken(options, (_: any, token: string) => {
		const fetch_options = {
			host: build_ca_url(options, '/api/v1/affiliations'),
			authorization: token,
			funk: 'getCaAffiliations',
		};
		fetch_get_json(fetch_options).then(response => {
			called_cb = true;
			if (!response || !response.success) {		// errors get sent in a `errors` array
				return cb(fmt_ca_err(fetch_options, response, 'Failed to get affiliations'), response);
			} else {
				return cb(null, fmt_ca_ok(fetch_options, response, null));
			}
		}).catch(error => {								// likely isn't possible to get here
			if (called_cb) {
				throw error;							// if we already sent our callback, this must be an apollo js error, throw it away
			} else {
				called_cb = true;
				logger.error('[stitch] getCaAffiliations - caught js error:', error);
				return cb(fmt_ca_err(fetch_options, error, 'Caught JS error when getting CA affiliations '), null);
			}
		});
	});
}

// --------------------------------------------------------------------------------
// Register identity on a CA - this ca api takes token auth
// --------------------------------------------------------------------------------
/*
	opts: {
		host: 'https://184.172.241.139:30148?ca=ca',
		ca_name: 'ca',
		client_prv_key_b64pem: "",		// from the id that is authorizing this new user
		client_cert_b64pem: "",
		new_identity: {
			enroll_id: "some_guy",
			enroll_secret: "password",
			ca_name: "ca",
			affiliation: ,
			attrs: ,
			type: ,
			max_enrollments: 0
		}
	}
*/
function registerCaIdentity(opts: CaReg, cb: Function) {
	const options = JSON.parse(JSON.stringify(opts));
	const errors = [];
	options.funk = 'getCaIdentities';

	if (!options.new_identity || !options.new_identity.enroll_id) {		// simple validation
		errors.push('enroll id was not provided');
	} else if (options.new_identity.enroll_id.includes(' ')) {
		errors.push('enroll ids cannot include spaces');
	} else if (options.new_identity.enroll_id.includes('"')) {
		errors.push('enroll ids cannot include double quotes');
	}
	if (!options.new_identity || !options.new_identity.enroll_secret) {
		errors.push('enroll secret was not provided');
	} else if (options.new_identity.enroll_secret.includes(' ')) {
		errors.push('enroll secrets cannot include spaces');
	} else if (options.new_identity.enroll_secret.includes('"')) {
		errors.push('enroll secrets cannot include double quotes');
	}
	if (errors.length > 0) {
		return cb({ error: errors }, null);
	}

	options.body_obj = {
		id: options.new_identity.enroll_id,
		secret: options.new_identity.enroll_secret,
		caName: options.new_identity.ca_name,
		affiliation: options.new_identity.affiliation,
		attrs: options.new_identity.attrs,
		type: options.new_identity.type,
		max_enrollments: Number(options.new_identity.max_enrollments)
	};

	let called_cb = false;
	generateCaAuthToken(options, (_: any, token: string) => {
		const fetch_options = {
			host: build_ca_url(options, '/api/v1/identities'),
			authorization: token,
			body_obj: options.body_obj,
			funk: 'registerCaIdentity'
		};
		fetch_post_json(fetch_options).then(response => {
			called_cb = true;
			if (!response || !response.success) {		// errors get sent in a `errors` array
				return cb(fmt_ca_err(fetch_options, response, 'Failed to register identity'), response);
			} else {
				return cb(null, fmt_ca_ok(fetch_options, response, null));
			}
		}).catch(error => {								// likely isn't possible to get here
			if (called_cb) {
				throw error;							// if we already sent our callback, this must be an apollo js error, throw it away
			} else {
				called_cb = true;
				logger.error('[stitch] registerCaIdentity - caught js error:', error);
				return cb(fmt_ca_err(fetch_options, error, 'Caught JS error during registration of a CA identity '), null);
			}
		});
	});
}

// --------------------------------------------------------------------------------
// Enroll identity on a CA - this ca api takes basic auth
// --------------------------------------------------------------------------------
/*
	opts: {
		host: 'https://184.172.241.139:30148?ca=ca',
		ca_name: 'ca',
		enroll_id: "",
		enroll_secret: "",
		manual_subject: "";						// [optional] provide your own subject string to pass custom params
		ext: {									// [optional] only SANs is supported (atm)
			subjectAltName: [
				{ dns: 'example.com' },
				{ dns: 'ibm.com' }
			]
		};
	}
*/
function enrollCaIdentity(opts: CaEnroll, cb: Function) {
	scGenEcdsaKeys(null, (_1: any, keys: { pubKeyPEM: string, prvKeyPEM: string, pubKeyPEMb64: string, prvKeyPEMb64: string }) => {
		const csr_opts = {								// options to make a Certificate Signing Request
			client_prv_key_b64pem: keys.prvKeyPEMb64,
			client_pub_key_b64pem: keys.pubKeyPEMb64,
			subject: opts.manual_subject ? opts.manual_subject : 'CN=' + opts.enroll_id,
			ext: opts.ext
		};

		scGenCSR(csr_opts, (_2: any, csrPEM: string) => {
			logger.debug('[stitch] built csr PEM:', csrPEM);

			let called_cb = false;
			const fetch_options = {
				host: build_ca_url(opts, '/api/v1/enroll'),
				authorization: 'Basic ' + btoa(opts.enroll_id + ':' + opts.enroll_secret),
				body_obj: {
					caName: opts.ca_name,
					certificate_request: csrPEM,
				},
				funk: 'enrollCaIdentity'
			};
			fetch_post_json(fetch_options).then(response => {
				called_cb = true;
				if (!response || !response.success) {		// errors get sent in a `errors` array
					return cb(fmt_ca_err(fetch_options, response, 'Failed to enroll identity'), response);
				} else {
					return cb(null, fmt_ca_ok(fetch_options, response, { generated: csr_opts }));	// send back the generated keys
				}
			}).catch(error => {								// likely isn't possible to get here
				if (called_cb) {
					throw error;							// if we already sent our callback, this must be an apollo js error, throw it away
				} else {
					called_cb = true;
					logger.error('[stitch] enrollCaIdentity - caught js error:', error);
					return cb(fmt_ca_err(fetch_options, error, 'Caught JS error during enrollment of a CA identity'), null);
				}
			});
		});
	});
}

// --------------------------------------------------------------------------------
// Reenroll identity on a CA - this ca api takes token auth
// --------------------------------------------------------------------------------
/*
	opts: {
		host: 'https://184.172.241.139:30148?ca=ca',
		ca_name: 'ca',									// optional
		client_prv_key_b64pem: "",
		client_cert_b64pem: "",
		ext: {}
	}
*/
function reenrollCaIdentity(opts: CaInput, cb: Function) {
	const options = JSON.parse(JSON.stringify(opts));
	const parsed = parseCertificate(opts.client_cert_b64pem);

	if (!parsed || !parsed.subject_parts || !parsed.subject_parts.CN) {
		return cb(fmt_ca_err({ funk: 'reenrollCaIdentity' }, null, 'unable to reenroll b/c cannot find enroll id in cert'), null);
	} else {
		const enroll_id = get_CN_from_str(parsed.subject_parts.CN);
		const csr_opts = {									// options to make a Certificate Signing Request
			client_prv_key_b64pem: options.client_prv_key_b64pem,
			client_pub_key_b64pem: options.client_cert_b64pem,
			subject: opts.manual_subject ? opts.manual_subject : 'CN=' + enroll_id,
			ext: opts.ext
		};

		scGenCSR(csr_opts, (_2: any, csrPEM: string) => {
			logger.debug('[stitch] built csr PEM:', csrPEM);
			options.body_obj = {
				caName: options.ca_name,
				certificate_request: csrPEM,
			};

			let called_cb = false;
			generateCaAuthToken(options, (_: any, token: string) => {
				const fetch_options = {
					host: build_ca_url(options, '/api/v1/reenroll'),
					authorization: token,
					body_obj: options.body_obj,
					funk: 'reenrollCaIdentity'
				};
				fetch_post_json(fetch_options).then(response => {
					called_cb = true;
					if (!response || !response.success) {		// errors get sent in a `errors` array
						return cb(fmt_ca_err(fetch_options, response, 'Failed to reenroll identity'), response);
					} else {
						return cb(null, fmt_ca_ok(fetch_options, response, { generated: csr_opts }));
					}
				}).catch(error => {								// likely isn't possible to get here
					if (called_cb) {
						throw error;							// if we already sent our callback, this must be an apollo js error, throw it away
					} else {
						called_cb = true;
						logger.error('[stitch] reenrollCaIdentity - caught js error:', error);
						return cb(fmt_ca_err(fetch_options, error, 'Caught JS error during re-enrollment of a CA identity'), null);
					}
				});
			});
		});
	}
}

// the CN field can be a string if there is only 1, or an array of strings if there are many
// return first string if array
function get_CN_from_str(str: any) {
	if (Array.isArray(str) && str[0]) {
		return str[0];
	} else {
		return str;
	}
}

// --------------------------------------------------------------------------------
// Delete identity on a CA - this ca api takes token auth
// --------------------------------------------------------------------------------
/*
	opts: {
		host: 'https://184.172.241.139:30148?ca=ca',
		client_prv_key_b64pem: "",
		client_cert_b64pem: "",
		ca_name: 'ca',									// [optional]
		enroll_id: "",									// [optional]
	}
*/
function deleteCaIdentity(opts: CaInput, cb: Function) {
	const options = JSON.parse(JSON.stringify(opts));
	options.body_obj = null;							// set null for token gen

	const parsed = parseCertificate(opts.client_cert_b64pem);
	if (!parsed || !parsed.subject_parts || !parsed.subject_parts.CN) {
		return cb(fmt_ca_err({ funk: 'deleteCaIdentity' }, null, 'unable to delete id b/c cannot find enroll id in cert'), null);
	} else {
		let called_cb = false;
		generateCaAuthToken(options, (_: any, token: string) => {
			const enroll_id = opts.enroll_id || get_CN_from_str(parsed.subject_parts.CN);
			const fetch_options = {
				host: build_ca_url(options, '/api/v1/identities/' + enroll_id),
				authorization: token,
				funk: 'deleteCaIdentity'
			};
			fetch_delete_json(fetch_options).then(response => {
				called_cb = true;
				if (!response || !response.success) {			// errors get sent in a `errors` array
					return cb(fmt_ca_err(fetch_options, response, 'Failed to delete identity'), response);
				} else {
					return cb(null, fmt_ca_ok(fetch_options, response, null));
				}
			}).catch(error => {									// likely isn't possible to get here
				if (called_cb) {
					throw error;								// if we already sent our callback, this must be an apollo js error, throw it away
				} else {
					called_cb = true;
					logger.error('[stitch] deleteCaIdentity - caught js error:', error);
					return cb(fmt_ca_err(fetch_options, error, 'Caught JS error when deleting a CA identity '), null);
				}
			});
		});
	}
}

// ----------------------------------------------------------------
// construct the url to use for the ca
// ----------------------------------------------------------------
function build_ca_url(opts: { ca_name: string, host: string }, path: string) {
	if (opts.ca_name) {									// finding the ca name in input obj
		return opts.host + path + '?ca=' + opts.ca_name;
	} else {
		const parts = opts.host.split('?');				// finding the ca name in url as query param
		if (parts && parts.length >= 2) {
			return parts[0] + path + '?' + parts[1];	// parts[1] holds the ca name
		}
	}
	return opts.host;
}

// ----------------------------------------------------------------
// Get some JSON data via Fetch - expects json response
// ----------------------------------------------------------------
/*
	opts: {
		host: 'https://example.com',		// http endpoint to a thing, include protocol and port
	}
*/
function fetch_get_json(opts: { host: string, authorization: string }) {
	return fetch(opts.host, {				// Default options are marked with *
		method: 'GET',
		mode: 'cors', 						// cors, *same-origin
		cache: 'no-cache', 					// *default, no-cache, reload, force-cache, only-if-cached
		credentials: 'same-origin', 		// include, same-origin, *omit
		headers: {
			'Authorization': opts.authorization,
			'Content-Type': 'application/json; charset=utf-8',
		},
		redirect: 'follow', 				// manual, *follow, error
		referrer: 'no-referrer', 			// no-referrer, *client
	}).then(response => {					// try to parse the response
		if (!response.ok) {
			throw response;					// whoops something broke
		}
		return response.json();				// parse it as a json
	}).catch(err => {
		if (err.json) {
			return err.json();				// parse it as a json
		} else {
			return err.message;
		}
	});
}

// ----------------------------------------------------------------
// Post some JSON data via Fetch - expects json response
// ----------------------------------------------------------------
/*
	opts: {
		host: 'https://example.com:8122',	// http endpoint to something, include protocol and port
		body_obj: {}
	}
*/
function fetch_post_json(opts: { host: string, authorization: string, body_obj: object }) {
	return fetch(opts.host, {				// Default options are marked with *
		method: 'POST',
		mode: 'cors', 						// cors, *same-origin
		cache: 'no-cache', 					// *default, no-cache, reload, force-cache, only-if-cached
		credentials: 'same-origin', 		// include, same-origin, *omit
		headers: {
			'Authorization': opts.authorization,
			'Content-Type': 'application/json; charset=utf-8',
		},
		redirect: 'follow', 				// manual, *follow, error
		referrer: 'no-referrer', 			// no-referrer, *client
		body: JSON.stringify(opts.body_obj), // body data type must match 'Content-Type' header
	}).then(response => {					// try to parse the response
		if (!response.ok) {
			throw response;					// whoops something broke
		}
		return response.json();				// parse it as a text
	}).catch(err => {
		if (err.json) {
			return err.json();				// parse it as a json
		} else {
			return err.message;
		}
	});
}


// ----------------------------------------------------------------
// Delete some JSON data via Fetch - expects json response
// ----------------------------------------------------------------
/*
	opts: {
		host: 'https://example.com:8122',	// http endpoint to something, include protocol and port
	}
*/
function fetch_delete_json(opts: { host: string, authorization: string }) {
	return fetch(opts.host, {				// Default options are marked with *
		method: 'DELETE',
		mode: 'cors', 						// cors, *same-origin
		cache: 'no-cache', 					// *default, no-cache, reload, force-cache, only-if-cached
		credentials: 'same-origin', 		// include, same-origin, *omit
		headers: {
			'Authorization': opts.authorization,
			'Content-Type': 'application/json; charset=utf-8',
		},
		redirect: 'follow', 				// manual, *follow, error
		referrer: 'no-referrer', 			// no-referrer, *client
	}).then(response => {					// try to parse the response
		if (!response.ok) {
			throw response;					// whoops something broke
		}
		return response.json();				// parse it as a text
	}).catch(err => {
		if (err.json) {
			return err.json();				// parse it as a json
		} else {
			return err.message;
		}
	});
}

interface CaInput {
	host: string;
	ca_name: string;
	client_prv_key_b64pem: string;
	client_cert_b64pem: string;
	manual_subject: string;
	ext: Ext | null;
	enroll_id: string | null;
}

interface CaReg extends CaInput {
	new_identity: {
		enroll_id: string;
		enroll_secret: string;
		ca_name: string;
		affiliation: string;
		attrs: string;
		type: string;
		max_enrollments: number
	};
}

interface CaEnroll {
	host: string;
	ca_name: string;
	enroll_id: string;
	enroll_secret: string;
	manual_subject: string;
	ext: Ext | null;
}
