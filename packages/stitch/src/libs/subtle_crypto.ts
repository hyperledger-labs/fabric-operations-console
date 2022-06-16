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


const BN = require('bn.js');								// bn.js === Big Number
const Buffer = require('safer-buffer').Buffer;

const IV = 'IBP-UzOTAwODAzND';					// semi-secret used for encryption/decryption
const ECDSA_NAME = 'ECDSA';
const HASH_NAME = 'SHA-256';
const DEFAULT_CURVE = 'P-256';
const KEY_TYPE = 'EC';
const PUBLIC = 'public';
const PRIVATE = 'private';

const OID_P256 = '2A8648CE3D030107';			// hex decodes to 1.2.840.10045.3.1.7 aka 256-bit Elliptic Curve Cryptography (ECC) aka P-256
const OID_P384 = '2B81040022';					// hex decodes to 1.3.132.0.34 aka 384-bit Elliptic Curve Cryptography (ECC) secp384r1 aka P-384
const OID_P521 = '2B81040023';					// hex decodes to 1.3.132.0.35 aka 521-bit Elliptic Curve Cryptography (ECC) secp521r1 aka P-521

const CURVES: StringObj = {};					// the keys are hex strings of the OID ans1 property, the value is the curve name
CURVES[OID_P256] = 'P-256';
CURVES[OID_P384] = 'P-384';
CURVES[OID_P521] = 'P-521';

// Libs built by us
import { logger, hexStrToUint8Array, uint8ArrayToHexStr, utf8StrToUint8Array, uint8ArrayToBase64, base64toHexStr } from './misc';
import { DER_parsePem, DER_packPem, DER_parseSignature, DER_packSignature, InPubFmt, InPrvFmt, OID_FAMILY, CURVES_BY_OID } from './asn1_lib';

// exports
export {
	subtleGenEncryptionKey, subtleEncrypt, subtleDecrypt, subtleSignMsg, subtleGenEcdsaKey, importHexEcdsaKey, pem2jwks, importJwkEcdsaKey, pem2raw,
	exportJwkKey, exportHexKey, subtleVerifySignature, Jwk, jwk2pem, exportPemKey, sig2der, subtleSignMsgStr, subtleVerifySignatureDer, IV, der2sig,
	DEFAULT_CURVE, PUBLIC, PRIVATE, remove_leading_00s, parsePem, scGetHashAsHex
};

// dsh todo handle errors better

// --------------------------------------------------------------------------------
// Web SubtleCrypto - Generate a key for AES encryption or decryption
// --------------------------------------------------------------------------------
function subtleGenEncryptionKey(cb: Function) {
	window.crypto.subtle.generateKey(
		{
			name: 'AES-CBC',
			length: 256
		},
		true,
		['encrypt', 'decrypt']
	).then((key) => {
		exportHexKey(key, (_: any, exported: string) => {
			return cb(null, exported);
		});
		// @ts-ignore
	}).catch((e) => {
		return cb(e, null);
	});
}

// --------------------------------------------------------------------------------
// Web SubtleCrypto - Generate a key for ECDSA signing or verifying
// --------------------------------------------------------------------------------
function subtleGenEcdsaKey(curve: string | null, cb: Function) {
	window.crypto.subtle.generateKey(
		{
			name: ECDSA_NAME,
			namedCurve: curve || DEFAULT_CURVE
		},
		true,
		['sign', 'verify']
	).then((keys) => {
		return cb(null, keys);
	});
}

// --------------------------------------------------------------------------------
// Web SubtleCrypto - AES Encrypt a string with a key - returns hex string
// --------------------------------------------------------------------------------
function subtleEncrypt(message: string, raw_hex_key: string, cb: Function) {
	if (typeof message !== 'string') {
		logger.error('[stitch] "message" must be a string.');
		return cb({ function_name: 'subtleEncrypt', error: true, stitch_msg: '"message" must be a string' });
	}
	if (typeof raw_hex_key !== 'string') {
		logger.error('[stitch] "raw_hex_key" must be a string.');
		return cb({ function_name: 'subtleEncrypt', error: true, stitch_msg: '"raw_hex_key" must be a string' });
	}

	importHexAesKey(raw_hex_key, (_: any, fmt_key: CryptoKey) => {
		let enc = new TextEncoder();
		window.crypto.subtle.encrypt(
			{
				name: 'AES-CBC',
				iv: utf8StrToUint8Array(IV)
			},
			fmt_key,
			enc.encode(message)
		).then((encrypted) => {
			let buffer = new Uint8Array(encrypted);
			return cb(null, uint8ArrayToHexStr(buffer, true));
			// @ts-ignore
		}).catch((e) => {
			return cb(e, null);
		});
	});
}

// --------------------------------------------------------------------------------
// Web SubtleCrypto - AES Encrypt a string with a key - returns hex string
// --------------------------------------------------------------------------------
function subtleDecrypt(encrypted: string, raw_hex_key: string, cb: Function) {
	importHexAesKey(raw_hex_key, (_: any, fmt_key: CryptoKey) => {
		window.crypto.subtle.decrypt(
			{
				name: 'AES-CBC',
				iv: utf8StrToUint8Array(IV)
			},
			fmt_key,
			hexStrToUint8Array(encrypted)
		).then((decrypted) => {
			let dec = new TextDecoder();
			return cb(null, dec.decode(decrypted));
			// @ts-ignore
		}).catch((e) => {
			return cb(e, null);
		});
	});
}

// Web SubtleCrypto sign a Uint8Array message
function subtleSignMsg(msg_bin: Uint8Array, prv_key: CryptoKey, cb: Function) {
	window.crypto.subtle.sign(
		{
			name: ECDSA_NAME,
			hash: { name: HASH_NAME },
		},
		prv_key,
		msg_bin,
	).then((signature) => {
		let uint = new Uint8Array(signature);
		return cb(null, uint);
	});
}

// Web SubtleCrypto sign a string message (not in use 04/2020)
function subtleSignMsgStr(msg_str: string, prv_key: CryptoKey, cb: Function) {
	if (typeof msg_str !== 'string') {
		logger.error('[stitch] "msg_str" must be a string.');
		return cb({ function_name: 'subtleSignMsg', error: true, stitch_msg: '"msg_str" must be a string' });
	}

	let enc = new TextEncoder();
	window.crypto.subtle.sign(
		{
			name: ECDSA_NAME,
			hash: { name: HASH_NAME },
		},
		prv_key,
		enc.encode(msg_str)
	).then((signature) => {
		let uint = new Uint8Array(signature);
		return cb(null, uint8ArrayToHexStr(uint, true));
	});
}

// export a SubtleCrypto key as hex string
function exportHexKey(key: CryptoKey, cb_export: Function) {
	window.crypto.subtle.exportKey('raw', key).then((exported) => {
		const exportedKeyBuffer = new Uint8Array(exported);
		return cb_export(null, uint8ArrayToHexStr(exportedKeyBuffer, true));
	});
}

// export a SubtleCrypto key as hex string
function exportPemKey(key: CryptoKey, cb_export: Function) {
	window.crypto.subtle.exportKey('pkcs8', key).then((exported) => {
		const exportedAsString = ab2str(exported);
		const exportedAsBase64 = window.btoa(exportedAsString);
		const b64_parts = exportedAsBase64.match(/.{1,64}/g) || [];
		const pemExported = '-----BEGIN ' + key.type.toUpperCase() + ' KEY-----\n' + b64_parts.join('\n') + '\n-----END ' + key.type.toUpperCase() + ' KEY-----';
		return cb_export(null, pemExported);
	});

	function ab2str(buf: ArrayBuffer) {
		return String.fromCharCode.apply(null, new Uint8Array(buf));
	}
}

// export a CryptoKey key as json web key object
function exportJwkKey(key: CryptoKey, cb_export: Function) {
	window.crypto.subtle.exportKey('jwk', key).then((exported) => {
		return cb_export(null, exported);
	});
}

// import a hex string SubtleCrypto key
function importHexAesKey(raw_hex_key: string, cb_import: Function) {
	const raw_key = hexStrToUint8Array(raw_hex_key);
	window.crypto.subtle.importKey(
		'raw',
		raw_key,
		'AES-CBC',
		true,
		['encrypt', 'decrypt']
	).then((key: CryptoKey) => {
		return cb_import(null, key);
	});
}

// import a hex string SubtleCrypto key
function importHexEcdsaKey(raw_hex_key: string, cb_import: Function) {
	const raw_key = hexStrToUint8Array(raw_hex_key);
	window.crypto.subtle.importKey(
		'raw',
		raw_key,
		{
			name: ECDSA_NAME,
			namedCurve: DEFAULT_CURVE,
		},
		true,
		['verify']
	).then((key: CryptoKey) => {
		return cb_import(null, key);
	});
}

/*
// import a hex string SubtleCrypto key
// cannot use b/c import of ECDSA pem is unsupported in Firefox
// https://bugzilla.mozilla.org/show_bug.cgi?id=1133698
function importPemKey(pem_key: string, cb_import: Function) {
	// fetch the part of the PEM string between header and footer
	const pemHeader = '-----BEGIN PRIVATE KEY-----';
	const pemFooter = '-----END PRIVATE KEY-----';
	const pemContents = pem_key.substring(pemHeader.length, pem_key.length - pemFooter.length);

	// base64 decode the string to get the binary data
	logger.debug('! pemContents', pemContents);
	const binaryDerString = window.atob(pemContents);

	// convert from a binary string to an ArrayBuffer
	const binaryDer = str2ab(binaryDerString);
	logger.debug('! binaryDer', binaryDer);

	window.crypto.subtle.importKey(
		'pkcs8',
		binaryDer,
		{
			name: ECDSA_NAME,
			namedCurve: DEFAULT_CURVE,
		},
		false,
		['sign']
	).then((key: CryptoKey) => {
		return cb_import(null, key);
	});
}
*/

// import a Json Web Key object w/SubtleCrypto key
// **supports P-256, P-384 & P-521**
function importJwkEcdsaKey(jwk_key: Jwk, cb_import: Function) {
	if (!jwk_key.d) {
		delete jwk_key.d;						// chrome freaks if d is present in a public key
	}
	/*{	// example jwk_key
		kty: 'EC',
		crv: 'P-256',
		x: 'zCQ5BPHPCLZYgdpo1n-x_90P2Ij52d53YVwTh3ZdiMo',
		y: 'pDfQTUx0-OiZc5ZuKMcA7v2Q7ZPKsQwzB58bft0JTko',
		ext: true,
	}*/
	window.crypto.subtle.importKey(
		'jwk',
		jwk_key,
		{
			name: ECDSA_NAME,
			namedCurve: jwk_key.crv,  			// can be P-256, P-384, or P-521
		},
		true, 									// whether the key is extractable (i.e. can be used in exportKey)
		jwk_key.d ? ['sign'] : ['verify'] 		// "verify" for public key import, "sign" for private key imports
	).then((key: CryptoKey) => {
		return cb_import(null, key);
	});
}

// verify a signature in the DER format with a ECDSA public key
function subtleVerifySignatureDer(publicKey: CryptoKey, der_sig: Uint8Array, message: Uint8Array, cb: Function) {
	const raw_sig = der2sig(der_sig);
	if (!raw_sig) {
		logger.error('[stitch] unable to unpack signature');
		return cb(null, null);
	} else {
		subtleVerifySignature(publicKey, raw_sig, message, (_: any, result: Uint8Array) => {
			return cb(null, result);
		});
	}
}

// verify a signature with a ECDSA public key
// the browser (crypto.subtle.verify) is working off of R+S, NOT DER.
// R+S is not DER format and it must have leading 0s!!! DER is a whole different deal.
function subtleVerifySignature(publicKey: CryptoKey, raw_sig: Uint8Array, message: Uint8Array, cb: Function) {
	window.crypto.subtle.verify(
		{
			name: ECDSA_NAME,
			hash: { name: HASH_NAME },
		},
		publicKey,
		raw_sig,
		message
	).then((result) => {
		return cb(null, result);
	});
}

/*
// Convert a string into an ArrayBuffer
// from https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
function str2ab(str: string) {
	const buf = new ArrayBuffer(str.length);
	const bufView = new Uint8Array(buf);
	for (let i = 0, strLen = str.length; i < strLen; i++) {
		bufView[i] = str.charCodeAt(i);
	}
	return buf;
}
*/

// convert ECDSA pem to a jwk format (Web.SubtleCrypto import/export functions cannot be used b/c ECDSA pem is unsupported in Firefox)
// https://bugzilla.mozilla.org/show_bug.cgi?id=1133698
// **supports P-256, P-384 & P-521**
function pem2jwks(opts: { pubKeyPEM: string, prvKeyPEM: string }) {
	const parsed = parsePem(opts);

	if (opts.prvKeyPEM && (!parsed || !parsed.private)) {
		return null;								// error already logged
	} else if (opts.pubKeyPEM && (!parsed || !parsed.public)) {
		return null;								// error already logged
	} else {
		return {
			public: (parsed && parsed.public) ? build_jwk(parsed.public) : null,
			private: (parsed && parsed.private) ? build_jwk(parsed.private) : null,
		};
	}

	// base 64 url encoding is used in a jwk, 3 differences from base 64
	function base64url(val: string) {
		return val.replace(/\//g, '_').replace(/\+/g, '-').replace(/=/g, '');
	}

	// build the Json Web Key format from the parsed data
	function build_jwk(data: InPubFmt | InPrvFmt) {
		//logger.debug('x back:', data.type, hexStrToUint8Array(data.x));
		//logger.debug('y back:', data.type, hexStrToUint8Array(data.y));
		//logger.debug('d back:', data.type, data.d ? hexStrToUint8Array(data.d) : null);

		// log error if something looks off
		switch (data.curve) {
			case 'P-256': { 						// 64 hex characters  -> p-256
				if (data.pub_hex_x.length !== 64) {
					logger.error('[stitch] unexpected length of "x" from DER in PEM for curve P-256');
				}
				break;
			}
			case 'P-384': { 						// 96 hex characters  -> p-384
				if (data.pub_hex_x.length !== 96) {
					logger.error('[stitch] unexpected length of "x" from DER in PEM for curve P-384');
				}
				break;
			}
			case 'P-521': { 						// 132 hex characters -> p-521
				if (data.pub_hex_x.length !== 132) {
					logger.error('[stitch] unexpected length of "x" from DER in PEM for curve P-521');
				}
				break;
			}
			default: {
				logger.error('[stitch] unable to parse curve name from key:', data);
			}
		}

		const ret: Jwk = {
			crv: data.curve || DEFAULT_CURVE,
			ext: true,						// extractable
			key_opts: data.type === PUBLIC ? ['verify'] : ['sign'],
			// @ts-ignore
			d: data.prv_hex_d ? base64url(uint8ArrayToBase64(hexStrToUint8Array(data.prv_hex_d))) : '',
			kty: KEY_TYPE,					// key type

			x: base64url(uint8ArrayToBase64(hexStrToUint8Array(data.pub_hex_x))),
			y: base64url(uint8ArrayToBase64(hexStrToUint8Array(data.pub_hex_y))),
		};

		if (data.type === PUBLIC) {
			delete ret.d;
		}
		return ret;
	}
}

// convert ECDSA pem to raw data
// **supports P-256, P-384 & P-521**
function parsePem(opts: { pubKeyPEM: string, prvKeyPEM: string }) {
	//console.log('sending pub:');
	const pub_bin_data = (opts && opts.pubKeyPEM) ? <InPubFmt>DER_parsePem(opts.pubKeyPEM) : null;
	//console.log('sending priv:');
	const priv_bin_data = (opts && opts.prvKeyPEM) ? <InPrvFmt>DER_parsePem(opts.prvKeyPEM) : null;
	//console.log('pub hex data', pub_bin_data);
	//console.log('priv hex data', priv_bin_data);

	if (opts.prvKeyPEM && (!priv_bin_data || !priv_bin_data.prv_hex_d)) {
		logger.error('[stitch] unable to parse private key. "d" not found');
		return null;
	} else if (opts.pubKeyPEM && !pub_bin_data) {
		logger.error('[stitch] unable to parse public key', opts.pubKeyPEM, pub_bin_data);
		return null;
	} else {
		return {
			public: pub_bin_data,
			private: priv_bin_data,
		};
	}
}

// convert pem format to raw as a hex string (compressed x-y format)
function pem2raw(pubKeyPEM: string) {
	const data = DER_parsePem(pubKeyPEM);
	if (!data) {
		return null;
	} else {
		return '04' + data.pub_hex_x + data.pub_hex_y;
	}
}

// convert ECDSA jwk to a pem format (Web.SubtleCrypto import/export functions cannot be used b/c ECDSA pem is unsupported in Firefox)
// https://bugzilla.mozilla.org/show_bug.cgi?id=1133698
// **supports P-256, P-384 & P-521**
function jwk2pem(jwk: Jwk) {
	const data = {												// convert the JWK format to one our PEM packer can take
		type: '',												// populated below
		curve_family_oid: OID_FAMILY,							// static for all ECDSA curves
		curve_oid: get_curve_oid(jwk.crv),
		curve: jwk.crv,
		pub_hex_x: base64toHexStr(base64urlToBase64(jwk.x)),
		pub_hex_y: base64toHexStr(base64urlToBase64(jwk.y)),
		prv_hex_d: ''											// populated below
	};

	// jwk is a private key
	if (jwk.d) {
		data.type = PRIVATE;
		data.prv_hex_d = base64toHexStr(base64urlToBase64(jwk.d));
	}

	// jwk is a public key
	else {
		data.type = PUBLIC;
		delete data.prv_hex_d;
	}

	return DER_packPem(data);

	// replace the key's Object Identifier
	function get_curve_oid(curve_name: string) {
		for (let curve_oid in CURVES_BY_OID) {
			if (CURVES_BY_OID[curve_oid] === curve_name) {
				return curve_oid;
			}
		}
		logger.error('[stitch] unsupported curve name... unlikely to convert JWK to PEM', curve_name);
		return CURVES_BY_OID[DEFAULT_CURVE];
	}

	// base 64 url encoding is used in a jwk, 3 differences from base 64
	function base64urlToBase64(val: string) {
		let str = val.replace(/_/g, '/').replace(/-/g, '+');
		const missing = str.length % 4;					// probably not needed, but for completeness add back the '==' or '='
		if (missing > 0) {
			for (let i = 0; i < 4 - missing; i++) {
				str += '=';
			}
		}
		return str;
	}
}

// convert DER signature to raw signature, R and S will be concatenated.
// dsh todo what are the lengths of r and s with 384 & 521 keys (this should still work...)
function der2sig(der_data: Uint8Array) {
	if (!der_data) {
		return null;
	}

	const der = DER_parseSignature(der_data);
	//console.log('unpacked der', der);
	const sig_data_r = der ? der.r : new Uint8Array(0);
	const sig_data_s = der ? der.s : new Uint8Array(0);
	//console.log('unpacked r', sig_data_r);
	//console.log('unpacked s', sig_data_s);

	const padded_r = padUint(sig_data_r);	// it is critical that leading SINGLE 0s are added back. this is not DER, the browser expects even r & s values
	const padded_s = padUint(sig_data_s);
	//console.log('padded_r r', padded_r);
	//console.log('padded_s s', padded_s);

	const ret = new Uint8Array(padded_r.length + padded_s.length);			// r + s = raw signature
	ret.set(padded_r);
	ret.set(padded_s, padded_r.length);

	return ret;

	// pad the typed array with empty space on the left to make it have an even length
	function padUint(arr: Uint8Array) {
		if (arr.length % 2 === 0) {				// already even, return as is
			return arr;
		} else {
			const padded = new Uint8Array(arr.length + 1);
			padded.set([0]);					// clear first byte? probably not needed...
			padded.set(arr, 1);
			return padded;
		}
	}
}

// remove leading double 00s on a hex string
function remove_leading_00s(hex: string) {
	let ret = hex.replace(/^0+/, '');		// must be 00, or 000, or 000 or etc... if its a single 0 it will be left alone
	if (ret.length % 2 === 1) {				// if its odd, make it not. this adds back a 0. so 000123 -> was 123 (odd) -> now 0123 (even)
		ret = '0' + ret;
	}
	return ret;
}

// convert raw signature to DER, R and S should be concatenated.
function sig2der(sig_data: Uint8Array, curve: string) {
	if (!sig_data) {
		return null;
	}

	const sig_data_r = sig_data.slice(0, 32);
	const sig_data_s = sig_data.slice(32);
	//console.log('sig_data', sig_data.length, sig_data);
	//console.log('sig_data_r', sig_data_r.length, sig_data_r);
	//console.log('sig_data_s', sig_data_s.length, sig_data_s);

	let sig_hex_r = remove_leading_00s(uint8ArrayToHexStr(sig_data_r, true));
	let sig_hex_s = remove_leading_00s(uint8ArrayToHexStr(sig_data_s, true));

	// feed leading-0-fix of S into prevent malleability and ah refix S afterwards
	// bn.js tends to make hex's with leading 0s and we can't feed it those values or use those outputs
	const fixed_s = preventMalleability(hexStrToUint8Array(sig_hex_s), curve);
	sig_hex_s = remove_leading_00s(uint8ArrayToHexStr(fixed_s, true));

	const sig_obj = {
		r: hexStrToUint8Array(sig_hex_r),
		s: hexStrToUint8Array(sig_hex_s),
	};
	const sig_der = DER_packSignature(sig_obj);
	//console.log('after der pack sig_obj', sig_obj);
	//console.log('after der pack sig_der', sig_der.length, sig_der);
	return sig_der;
}

// dsh - this is based on the one in Fabric. See their cryptic note:
// ECDSA signature does not have perfectly unique structure and this can facilitate replay attacks and more.
// In order to have a unique representation, this change-set forces generation of signatures with low-S.
// Bitcoin has also addressed this issue with the following BIP: https://github.com/bitcoin/bips/blob/master/bip-0062.mediawiki
// http://bitcoin-development.narkive.com/CUfGHkaY/new-bip-low-s-values-signatures
function preventMalleability(s: Uint8Array, curve: string) {
	curve = (typeof curve === 'string') ? curve.toUpperCase() : curve;			// upper case if we can

	const n_hex = get_n_hex(curve);
	const bigHalfOrder = get_half_order_bn(n_hex);								// make a "Big Number" for half n
	const bigS = new BN(uint8ArrayToHexStr(s, true).toLowerCase(), 16);

	// see if 's' is larger than half of the order, if so, set s = CURVE_ORDER - s.
	if (bigS.cmp(bigHalfOrder) === 1) {
		logger.debug('[stitch] fixing malleability b/c s is smaller than half order');
		const bigN = new BN(n_hex, 16);											// make a "Big Number" for "n"
		s = hexStrToUint8Array(bigN.sub(bigS).toString(16));
	}
	return s;

	// get the "n" value for the curve as hex
	function get_n_hex(curve_str: string) {
		// const n_hex = elliptic.curves['p256'].n.toString(16);
		const n_hex_map = <any>{												// n's are some static number describing a curve, copied values from elliptic.js
			'P-256': 'ffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551',
			'P-384': 'ffffffffffffffffffffffffffffffffffffffffffffffffc7634d81f4372ddf581a0db248b0a77aecec196accc52973',
			'P-521': '1fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffa51868783bf2f966b7fcc0148f709a5d03bb5c9b8899c47aebb6fb71e91386409'
		};
		let ret = n_hex_map[curve_str];
		if (!ret) {
			logger.error('[stitch] unknown curve, cannot find n, using default curve:', DEFAULT_CURVE);
			ret = n_hex_map[DEFAULT_CURVE];
		}
		return ret;
	}

	// get the "half order" value for the curve as a "Big Number"
	function get_half_order_bn(n_hex_str: string) {
		//const halfOrder = elliptic.curves['p256'].n.shrn(1);			// the "half order" is "n" divided by 2, so also a static number per curve
		const ret = new BN(n_hex_str, 16);								// make a "Big Number" for "n"
		return ret.shrn(1);												// shrn = shift right 1 bit to divide by 2
	}
}

// --------------------------------------------------------------------------------
// Hash binary - perform SHA-256 hash, returns hex string
// --------------------------------------------------------------------------------
function scGetHashAsHex(thing: any, cb: Function) {
	if (typeof thing === 'string') {				// not really needed since all inputs atm are bin, but w/e
		thing = utf8StrToUint8Array(thing);
	}

	window.crypto.subtle.digest('SHA-256', thing).then((hash) => {
		const buf = Buffer.from(hash);				// convert the arraybuffer to buffer so we can easily convert to hex
		return cb(null, buf.toString('hex'));
		// @ts-ignore
	}).catch((e) => {
		return cb(e, null);
	});
}

interface Jwk {
	crv: string;
	d: string;
	ext: boolean;
	key_opts: any;
	kty: string;
	x: string;
	y: string;
}

interface StringObj {
	[index: string]: string;
}
