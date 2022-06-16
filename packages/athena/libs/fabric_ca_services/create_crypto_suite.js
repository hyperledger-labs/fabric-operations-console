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
// create_crypto_suite.js - Creates the cryptosuite needed
//							by CA functions
//------------------------------------------------------------
module.exports = (logger, ev, t) => {
	const exports = {};
	const elliptic = require('elliptic');
	const EC = elliptic.ec;
	const crypto = require('crypto');
	const BN = require('bn.js');

	// map for easy lookup of the "N/2" value per elliptic curve
	const halfOrdersForCurve = {
		'secp256r1': elliptic.curves['p256'].n.shrn(1),
		'secp384r1': elliptic.curves['p384'].n.shrn(1)
	};

	/*
	 * Returns a single cryptosuite instance - we only need one.
	 * This instance contains the sign and hash functions that
	 * are needed to complete some operations.
	 */
	exports.createCryptoSuite = () => {
		const ecdsaCurve = elliptic.curves['p256'];
		const keySize = 256;

		return {
			_curveName: 'secp256r1',
			_ecdsaCurve: ecdsaCurve,
			_hashOutputSize: keySize / 8,
			_ecdsa: new EC(ecdsaCurve),
			_keySize: keySize,
			_hashAlgo: 'SHA2',
			sign: sign,
			hash: hash
		};
	};

	/*
	 * This is an implementation of {@link module:api.CryptoSuite#hash}
	 * The opts argument is not supported yet.
	 */
	function hash(msg) {
		const hash = crypto.createHash('sha256');
		return hash.update(msg).digest('hex');
	}

	/*
	 * This is an implementation of {@link module:api.CryptoSuite#sign}
	 * Signs digest using key k.
	 */
	function sign(key, digest) {
		if (typeof key === 'undefined' || key === null) {
			throw new Error('A valid key is required to sign');
		}

		if (typeof digest === 'undefined' || digest === null) {
			throw new Error('A valid message is required to sign');
		}

		// Note that the statement below uses internal implementation specific to the
		// module './ecdsa/key.js'
		const signKey = this._ecdsa.keyFromPrivate(key._key.prvKeyHex, 'hex');
		let sig = this._ecdsa.sign(digest, signKey);
		sig = _preventMalleability(sig, key._key.ecparams);
		//logger.debug('ecdsa signature: ', sig);
		return sig.toDER();
	}

	function _preventMalleability(sig, curveParams) {
		let halfOrder = halfOrdersForCurve[curveParams.name];
		if (!halfOrder) {
			throw new Error('Can not find the half order needed to calculate "s" value for ' +
				'immalleable signatures. Unsupported curve name: ' + curveParams.name);
		}

		// in order to guarantee 's' falls in the lower range of the order, as explained in the above link,
		// first see if 's' is larger than half of the order, if so, it needs to be specially treated
		if (sig.s.cmp(halfOrder) === 1) { // module 'bn.js', file lib/bn.js, method cmp()
			// convert from BigInteger used by jsrsasign Key objects and bn.js used by elliptic Signature objects
			const bigNum = new BN(curveParams.n.toString(16), 16);
			sig.s = bigNum.sub(sig.s);
		}

		return sig;
	}

	return exports;
};
