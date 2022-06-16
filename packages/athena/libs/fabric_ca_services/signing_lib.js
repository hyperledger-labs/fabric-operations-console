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
// signing_lib.js - CA processing/managing signing functions
//------------------------------------------------------------
module.exports = (logger, ev, t) => {
	const exports = {};

	exports.createSigningIdEntity = (opts) => {
		const err = {};
		err.statusCode = 500;

		const signerKey = createSignerKey(opts._enrollment_key);
		if (signerKey && signerKey.statusCode === 500) {
			return (signerKey);			// singerKey is an error in this case
		}

		if (!opts.certificate) {
			err.msg = 'Missing required parameter "certificate".';
			return err;
		}

		if (!opts.public_key) {
			err.msg = 'Missing required parameter "publicKey".';
			return err;
		}

		if (!opts.msp_id) {
			err.msg = 'Missing required parameter "mspId".';
			return err;
		}

		return {
			certificate: opts.certificate,
			public_key: opts.public_key,
			msp_id: opts.msp_id,
			signer: signerKey
		};
	};


	function createSignerKey(key) {
		if (!key) {
			const err = {};
			err.statusCode = 500;
			err.msg = 'Missing required parameter "key" for private key';
			return err;
		}
		return {
			_key: key
		};
	}

	// /**
	//  * Signs digest with the private key contained inside the signer.
	//  *
	//  * @param {byte[]} msg The message to sign
	//  * @param {Object} opts Options object for the signing, contains one field 'hashFunction' that allows
	//  *   different hashing algorithms to be used. If not present, will default to the hash function
	//  *   configured for the identity's own crypto suite object
	//  */
	exports.sign = (msg, opts) => {
		// calculate the hash for the message before signing
		let hashFunction;
		if (opts && opts.hashFunction) {
			if (typeof opts.hashFunction !== 'function') {
				const err = {};
				err.statusCode = 500;
				err.msg = 'The "hashFunction" field must be a function';
				return err;
			}

			hashFunction = opts.hashFunction;
		} else {
			hashFunction = t.cryptoSuite.hash.bind(t.cryptoSuite);
		}

		const digest = hashFunction(msg);
		return t.cryptoSuite.sign(opts.signingIdentity.signer._key, Buffer.from(digest, 'hex'));
	};

	return exports;
};
