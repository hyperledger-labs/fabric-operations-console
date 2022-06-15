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
// key_lib.js - CA processing/managing key functions
//------------------------------------------------------------
module.exports = (logger, ev, t) => {
	const exports = {};
	//------------------------------------------------------------------
	// Generates a key pair object
	//------------------------------------------------------------------
	exports.generateKey = (cb) => {
		const pair = t.KEYUTIL.generateKeypair('EC');

		if (!pair || !pair.prvKeyObj || !pair.pubKeyObj) {
			const err = {};
			err.statusCode = 500;
			err.msg = 'Problem with KEYUTIL.generateKeypair';
			return cb(err);
		}
		return cb(null, pair);
	};

	//------------------------------------------------------------------
	// Generates a CSR/PKCS#10 certificate signing request for this key
	//------------------------------------------------------------------
	exports.generateCSR = (subjectDN, key) => {

		//check to see if this is a private key
		if (!exports.isPrivate(key)) {
			const err = {};
			err.statusCode = 500;
			err.msg = 'A CSR cannot be generated from a public key';
			return err;
		}

		//try {
		const subject = { str: t.asn1.x509.X500Name.ldapToOneline(subjectDN) };
		const sbjpubkey = exports.getPublicKey(key);

		return t.asn1.csr.CSRUtil.newCSRPEM({
			subject: subject,
			sbjpubkey: sbjpubkey,
			sigalg: 'SHA256withECDSA',
			sbjprvkey: key
		});
		//} catch (err) {
		//	throw err;
		//}
	};

	//------------------------------------------------------------------
	// Checks if the passed key is private or not
	//------------------------------------------------------------------
	exports.isPrivate = (key) => {
		return !(key !== 'undefined' && key === null);
	};

	//------------------------------------------------------------------
	// Returns the public key object
	//------------------------------------------------------------------
	exports.getPublicKey = (key) => {
		const f = new t.ECDSA({ curve: key.curveName });
		f.setPublicKeyHex(key.pubKeyHex);
		f.isPrivate = false;
		f.isPublic = true;
		return f;
	};

	//------------------------------------------------------------------
	// Converts passed key to a valid jsrassign PEM key
	//------------------------------------------------------------------
	exports.toBytes = (key) => {
		if (exports.isPrivate(key)) {
			return t.KEYUTIL.getPEM(key, 'PKCS8PRV');
		} else {
			return t.KEYUTIL.getPEM(key);
		}
	};

	return exports;
};
