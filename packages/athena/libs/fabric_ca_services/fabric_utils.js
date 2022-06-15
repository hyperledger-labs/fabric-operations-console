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
// fabric_utils.js - CA processing/managing utilities
//------------------------------------------------------------
module.exports = (logger, ev, t) => {
	const exports = {};

	//------------------------------------------------------------------
	// Create the Fabric CA Client - core object for working with Fabric
	//------------------------------------------------------------------
	exports.createFabricCAClient = (opts, tlsOptions) => {
		//logger.info('creating Fabric CA Client');
		const endpoint = {};
		opts.api_url = opts.api_url || opts.ca_url;			// legacy field
		const parsedUrl = t.misc.break_up_url(opts.api_url);
		endpoint.hostname = parsedUrl ? parsedUrl.hostname : null;
		endpoint.port = parsedUrl ? parsedUrl.port : null;
		endpoint.protocol = parsedUrl ? parsedUrl.protocol : null;

		const ret = {
			ca_name: opts.ca_name,
			msp_id: opts.ca_name,
			protocol: endpoint.protocol,
			hostname: endpoint.hostname,
			port: endpoint.port,
			tlsOptions: tlsOptions,
			baseAPI: '/api/v1/',
			enrollmentID: opts.enroll_id,
			enrollmentSecret: opts.enroll_secret,
			method: opts.method
		};

		if (opts.certificate && opts.private_key) {
			const decoded_private_key = t.misc.decodeb64(opts.private_key);
			ret.certificate = t.misc.decodeb64(opts.certificate);
			ret.private_key = t.KEYUTIL.getKey(decoded_private_key);
		}
		return ret;
	};

	//------------------------------------------------------------------
	// Generate authorization token required for accessing fabric-ca APIs
	//------------------------------------------------------------------
	exports.generateAuthToken = (reqBody) => {
		// specific signing procedure is according to:
		// https://github.com/hyperledger/fabric-ca/blob/master/util/util.go#L213
		let cert = Buffer.from(t.signingIdentity.certificate).toString('base64');
		let bodyAndCert;
		if (reqBody) {
			let body = Buffer.from(JSON.stringify(reqBody)).toString('base64');
			bodyAndCert = body + '.' + cert;
		} else {
			bodyAndCert = '.' + cert;
		}

		let sig = t.signing_lib.sign(bodyAndCert, { hashFunction: t.cryptoSuite.hash.bind(t.cryptoSuite), signingIdentity: t.signingIdentity });

		let b64Sign = Buffer.from(sig, 'hex').toString('base64');
		return cert + '.' + b64Sign;
	};

	//------------------------------------------------------------------
	// Format String Error Message
	//------------------------------------------------------------------
	exports.format_error_msg = (errors, customMessage) => {
		logger.info('formatting error message');
		let ret = errors;

		// If it's not an array then something went wrong and we'll pass back what we got
		if (Array.isArray(errors)) {
			// There should only be one error but this function is prepared for multiple errors
			if (errors.length === 1) {
				ret = {};
				ret.parsed = customMessage + prepareError(JSON.stringify(errors[0]));
				ret.raw = {};
			} else {
				ret = [];
				for (const error of errors) {
					ret.push(prepareError(error));
				}
			}
		}

		// remove junk chars from the error
		function prepareError(error) {
			error = error.replace(/[[,\],{,},"]/g, '');			// remove []{} brackets... and "
			error = error.replace(/\\/g, ' ');					// and \
			return error;
		}

		return ret;
	};

	// TLS options
	exports.setTLSOptions = (ca_tls_opts) => {
		logger.info('setting TLS options in ca_lib');
		let trustedRoots = [];
		if (ca_tls_opts && ca_tls_opts.pem) {
			trustedRoots = ca_tls_opts.pem;
		}

		return {
			trustedRoots: trustedRoots,
			verify: false
		};
	};

	return exports;
};
