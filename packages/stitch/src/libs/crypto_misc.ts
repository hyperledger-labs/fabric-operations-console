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
const async = require('async');
declare const CryptoJS: any;					// CryptoJS v4.0.0

//declare const KEYUTIL: any;					// jsrsasign -> KEYUTIL
//declare const X509: any;						// jsrsasign -> X509
const AES_VER_PREFIX = 'v2.';					// prefix on the key in local storage that is using subtle crypto AES encryption

// Libs built by us
import { Ext } from './asn1_lib';
import { ConfigTxLib } from './proto_handlers/configtx_pb_lib';
import { IdentitiesLib } from './proto_handlers/identities_pb_lib';
import { SignatureHeader as Common_SignatureHeader } from '../protoc/output/common/common_pb';
import {
	DER_parsePem, InPrvFmt, InPubFmt, PRIVATE_LABEL, PUBLIC_LABEL, CERTIFICATE_LABEL, DER_signAndPackCsrPem, DER_parseCertificate,

} from './asn1_lib';
import {
	subtleSignMsg, importJwkEcdsaKey, pem2jwks, subtleGenEcdsaKey, exportJwkKey, Jwk, jwk2pem, sig2der, IV, subtleVerifySignatureDer, parsePem,
	subtleGenEncryptionKey, subtleDecrypt, subtleEncrypt
} from './subtle_crypto';
import { logger, arrToUint8Array, uint8ArrayToBase64, base64ToUint8Array, load_pb, isUint8Array, sort_keys, friendly_ms, utf8StrToUint8Array } from './misc';

// exports
export {
	build_nonce, pem2DER, decode_b64_pem, parseCertificate, mapCertificatesToRoots,
	encrypt, decrypt, signConfigUpdate, buildSigCollectionAuthHeader, generateCaAuthToken, isTrustedCertificate,
	scSign, scSignPemRaw, scGenEcdsaKeys, sig2der, build_sig_collection_for_hash, scSignJwkRaw, scVerifySignature, validatePrivateKey,
	validatePublicKey, validateCertificate, scGenCSR, scDecrypt, scEncrypt, switchEncryption, getOrGenAesKey, safer_hex_str,
};

/*
// declare const jsSHA: any;						// sha256.js
// --------------------------------------------------------------------------------
// Removed 07/06/2020, use scGetHashAsHex() instead
// Hash binary - perform a hash
// --------------------------------------------------------------------------------
// alg = "SHA-256" || "SHA-512" || md5 || <more>
function hashAndReturnHex(thing: any, alg: string) {
	const shaObj = new jsSHA(alg, 'ARRAYBUFFER');
	shaObj.update(thing);
	return shaObj.getHash('HEX');
}
*/

// --------------------------------------------------------------------------------
// Build Nonce - build 24 bytes of random data
// --------------------------------------------------------------------------------
function build_nonce() {
	return window.crypto.getRandomValues(new Uint8Array(24));	// fabric wants 24 random bytes for a nonce in a proposal
}

/*
// --------------------------------------------------------------------------------
// Removed 05/14/2020, use scGenEcdsaKeys() instead
// generate a pub/private key pair and make PEM formats while you are at it
// --------------------------------------------------------------------------------
function genKeyPair(curve_name: string | null) {
	const pair = KEYUTIL.generateKeypair('EC', curve_name || 'secp256r1');
	pair.pubKeyPEM = KEYUTIL.getPEM(pair.pubKeyObj);
	pair.prvKeyPEM = KEYUTIL.getPEM(pair.prvKeyObj, 'PKCS8PRV');
	pair.pubKeyPEMb64 = btoa(pair.pubKeyPEM);
	pair.prvKeyPEMb64 = btoa(pair.prvKeyPEM);
	return pair;
}
*/

/* Removed 05/14/2020
// --------------------------------------------------------------------------------
// make a pub/private key pair obj from a PEM format
// --------------------------------------------------------------------------------
function import_key_pair(pubKeyPEM: string, prvKeyPEM: string) {
	let pair = null;
	try {
		pair = {
			pubKeyObj: KEYUTIL.getKey(pubKeyPEM),
			prvKeyObj: KEYUTIL.getKey(prvKeyPEM),
			pubKeyPEM: pubKeyPEM,
			prvKeyPEM: prvKeyPEM,
		};
	} catch (err) {
		logger.error('[stitch] unable to import key', err);
	}
	return pair;
}
*/

/*
// --------------------------------------------------------------------------------
// make a private key obj from a PEM format - these functions are stupid, dsh combine
// --------------------------------------------------------------------------------
function import_prv_key(prvKeyPEM: string) {
	let pair = null;
	try {
		pair = {
			prvKeyObj: KEYUTIL.getKey(prvKeyPEM),
			prvKeyPEM: prvKeyPEM,
			prvKeyPEMb64: btoa(prvKeyPEM),
		};
	} catch (err) {
		logger.error('[stitch] unable to import prv key', err);
	}
	return pair;
}
function import_pub_key(pubKeyPEM: string) {
	let pair = null;
	try {
		pair = {
			pubKeyObj: KEYUTIL.getKey(pubKeyPEM),
			pubKeyPEM: pubKeyPEM,
			pubKeyPEMb64: btoa(pubKeyPEM),
		};
	} catch (err) {
		logger.error('[stitch] unable to import public key', err);
	}
	return pair;
}
*/

/* legacy - no long needed with subtle crypto - 04/06/2020
// --------------------------------------------------------------------------------
// sign something - returns signature or null if error
// --------------------------------------------------------------------------------
function sign_with_privKey_obj(prvKeyObj: any, something: any, hash_function: any) {
	const signKey = _ecdsa.keyFromPrivate(prvKeyObj.prvKeyHex, 'hex');
	let hash = hashAndReturnHex(something, 'SHA-256');							// peers and orderers hash binary data
	if (hash_function && typeof hash_function === 'function') {					// ca's hash over a string
		hash = hash_function(something);
	}
	logger.debug('[stitch] signature is over this hash:', hash);
	let sig = _ecdsa.sign(hash, signKey);
	sig = preventMalleability(sig, prvKeyObj.ecparams);							// see comments below on why this is here
	return sig ? sig.toDER() : null;
}
*/

// --------------------------------------------------------------------------------
// Legacy api - Uses SubtleCrypto to sign a raw message with a pem key - [returns DER signature]
// return signature in the der format b/c thats what fabric will consume
// --------------------------------------------------------------------------------
/*function sign(prvKeyPem: string, something: Uint8Array, hash_function: Function | null, cb: Function) {
	// this is the old way - with elliptic - pre 04/06/2020
	/*const imported_prv_key = import_prv_key(<string>prvKeyPem);
	if (!imported_prv_key) {
		logger.error('[stitch] could not import private key from b64 pem');
		return cb(null);
	} else {
		const prvKey = fmtKey(imported_prv_key, 'private');
		if (!prvKey) {
			logger.error('[stitch] could not format private key for signature');
			return cb(null);
		} else {
			const old = sign_with_privKey_obj(prvKey.prvKeyObj, something, hash_function);
			return cb(null, old);
		}
	}

	// this is the new way - with subtleCrypto - post 04/06/2020
	/*const jwks = pem2jwks({ pubKeyPEM: '', prvKeyPEM: prvKeyPem });
	if (!jwks || !jwks.private) {
		logger.error('[stitch] unable to convert pem to JWK..');
		return cb({ function_name: 'scSignPemRaw', error: true, stitch_msg: 'unable to convert pem to JWK' });
	} else {
		const curve = jwks.private.crv;
		scSignJwkRaw(jwks.private, something, (_: any, new_sig: any) => {
			const der = sig2der(new_sig, curve);
			return cb(null, der);
		});
	}
}*/

// --------------------------------------------------------------------------------
// wrapper on signing a protobuf - returns "config signature" proto message as b64 string
// --------------------------------------------------------------------------------
function signConfigUpdate(opts: Bsp, cb: Function) {
	const prvKeyPem = decode_b64_pem(opts.client_prv_key_b64pem);
	const jwks = pem2jwks({ pubKeyPEM: '', prvKeyPEM: prvKeyPem });
	if (!jwks || !jwks.private) {
		logger.error('[stitch] could not import private key, malformed?');
		const error = {
			error: true,
			stitch_msg: 'could not import private key, malformed?',
		};
		return cb(error);
	} else {

		load_pb((pb_root: any) => {

			// 1. build "signature header" proto
			const si_opts = {
				msp_id: opts.msp_id,
				client_cert_pem: decode_b64_pem(opts.client_cert_b64pem)
			};
			const p_signatureHeader = new Common_SignatureHeader();
			const p_serializedIdentity = (new IdentitiesLib).p_build_serialized_identity(si_opts);
			const nonce = build_nonce();
			p_signatureHeader.setCreator(p_serializedIdentity.serializeBinary());
			p_signatureHeader.setNonce(nonce);
			const b_signatureHeader = p_signatureHeader.serializeBinary();

			// see if protobuf is base64 or binary
			let cu_bin = <any>opts.protobuf;			// cu = config update protobuf aka the proposal
			if (typeof opts.protobuf === 'string') {
				logger.debug('[stitch] the config update is a string, converting to pb');
				cu_bin = base64ToUint8Array(opts.protobuf);
			}

			if (!isUint8Array(cu_bin)) {
				logger.error('[stitch] cannot sign this, its not a Uint8Array', typeof cu_bin);
				const error = {
					error: true,
					stitch_msg: '"protobuf" is not Uint8Array or hex string, cannot sign config update',
				};
				return cb(error);
			} else {

				// 2. sign signature header + config update
				const bin = new Uint8Array(cu_bin.length + b_signatureHeader.length);
				bin.set(b_signatureHeader);
				bin.set(cu_bin, b_signatureHeader.length);
				scSign({ prvKeyPEM: prvKeyPem, b_msg: bin }, (_: any, signature: any) => {

					// 3. build "config signature" proto
					const configTxLib = new ConfigTxLib;
					const cs_opts = {
						b_signature: arrToUint8Array(signature),
						b_signature_header: b_signatureHeader
					};
					const b_config_signature = configTxLib.__b_build_config_signature(cs_opts);
					return cb(null, uint8ArrayToBase64(b_config_signature));	// convert to b64 string so we can move it around safely
				});
			}
		});
	}
}

// --------------------------------------------------------------------------------
// Convert a PEM encoded certificate to DER format - [does NOT work with concatenated certs] - copied from the fabric sdk
// --------------------------------------------------------------------------------
function pem2DER(pem: string) {
	// PEM format is essentially a nicely formatted base64 representation of DER encoding.
	// So we need to strip "BEGIN" / "END" header/footer and string line breaks.
	// Then we simply base64 decode it.
	const contents = pem.toString().trim().split(/\r?\n/);

	// check for BEGIN and END tags
	if (!(contents[0].match(/-----\s*BEGIN ?([^-]+)?-----/) && contents[contents.length - 1].match(/-----\s*END ?([^-]+)?-----/))) {
		logger.error('[stitch] input parameter "pem" does not appear to be PEM-encoded.');
		return null;
	} else {
		contents.shift(); 			// remove "BEGIN"
		contents.pop(); 			// remove "END"

		// base64 decode and encode as hex string
		let hex = null;
		try {
			hex = atob(contents.join(''));
		} catch (e) {
			logger.error('[stitch] unable to base 64 decode "pem"');
		}
		return hex;
	}
}

/* legacy - no long needed with subtle crypto - 04/06/2020
// --------------------------------------------------------------------------------
// [Angelo De Caro] ECDSA signatures do not perfectly unique structure and this can facilitate replay attacks and more.
// In order to have a unique representation, this change-set forces generation of signatures with low-S.
// Bitcoin has also addressed this issue with the following BIP: https://github.com/bitcoin/bips/blob/master/bip-0062.mediawiki
// http://bitcoin-development.narkive.com/CUfGHkaY/new-bip-low-s-values-signatures
// --------------------------------------------------------------------------------
function preventMalleability(sig: any, curveParams: any) {
	const halfOrder = elliptic.curves['p256'].n.shrn(1);
	if (!halfOrder) {
		logger.error('[stitch] can not find the half order to make malleable resistant signature. Unsupported curve name: ' + curveParams.name);
		return null;
	}

	// see if 's' is larger than half of the order, if so, set s = CURVE_ORDER - s.
	if (sig.s.cmp(halfOrder) === 1) {
		const bigNum = new elliptic.utils.expose_bn.BN(curveParams.n.toString(16), 16);	// convert curve order from hex to BigNum
		sig.s = bigNum.sub(sig.s); 														// S is now guaranteed to fall in the lower range of the order
	}
	return sig;
}
*/

/* legacy - no long needed with subtle crypto - 04/06/2020
// --------------------------------------------------------------------------------
// verify a signature on something - returns boolean
// --------------------------------------------------------------------------------
function verify_signature_with_pubKey_obj(pubKeyObj: any, signature: any, something: any) {
	try {
		const pubKey = _ecdsa.keyFromPublic(pubKeyObj.pubKeyHex, 'hex');
		return pubKey.verify(hashAndReturnHex(something, 'SHA-256'), signature);
	} catch (e) {
		logger.error('error when trying to verify signature', e);
		return null;
	}
}
*/

/*
// this is the old way - with elliptic - pre 04/06/2020
// use scVerifySignature instead
// --------------------------------------------------------------------------------
// wrapper function on sign_with_privKey_object() - formats PEM private key and signature into object
// --------------------------------------------------------------------------------
function verifySignature(pubKey: object | string, signature: any, something: any) {
	const pubKeyObj = fmtKey(pubKey, 'public');

	let signature_arr: any = signature;
	if (typeof signature === 'string') {				// if the sig is a string, convert it first
		signature_arr = base64ToUint8Array(signature);
	}

	if (!pubKeyObj || !signature_arr) {
		return null;
	} else {
		return verify_signature_with_pubKey_obj(pubKeyObj, signature_arr, something);
	}
}
*/

// --------------------------------------------------------------------------------
// decode a base 64 encoded PEM string - returns PEM
// --------------------------------------------------------------------------------
function decode_b64_pem(b64pem: string | undefined) {
	if (!b64pem) {
		return '';
	} else {
		try {
			let pem = atob(b64pem);						// decode it
			return ensure_newline(trim_lines(pem));
		} catch (e) {
			return ensure_newline(trim_lines(b64pem));	// oh well, return it as is
		}
	}

	// check if newline is at eof
	function ensure_newline(str: string) {
		if (str && typeof str === 'string' && str.lastIndexOf('\n') !== -1 && str.length > 0) {
			if (str.lastIndexOf('\n') !== str.length - 1) {		// append a new line to eof if there is not one
				str += '\n';
			}
		}
		return str;
	}

	// remove bogus white space lines in cert
	function trim_lines(str: string) {
		if (str && typeof str === 'string') {
			const parts = str.split('\n');
			const fixed = [];
			for (let i in parts) {
				parts[i] = parts[i].trim();
				if (parts[i]) {
					fixed.push(parts[i]);
				}
			}
			str = fixed.join('\n');
		}
		return str;
	}
}

// --------------------------------------------------------------------------------
// AES Encrypt a string with a passphrase - returns hex string - deprecated as of 05/12/2020
// --------------------------------------------------------------------------------
function encrypt(message: string, passphrase: string) {
	logger.error('[deprecated] this encryption method is no longer supported. use scEncrypt() instead.');

	if (typeof message !== 'string') {
		logger.error('[stitch] "message" must be a string.');
		return null;
	}
	if (typeof passphrase !== 'string') {
		logger.error('[stitch] "passphrase" must be a string.');
		return null;
	}
	const key = CryptoJS.lib.WordArray.create(passphrase);
	const opts = {
		iv: CryptoJS.lib.WordArray.create(IV),
		mode: CryptoJS.mode.CBC,
		padding: CryptoJS.pad.Pkcs7
	};
	const encrypted = CryptoJS.AES.encrypt(message, key, opts);
	return encrypted.toString();
}

// --------------------------------------------------------------------------------
// AES Encrypt a string with a passphrase - takes hex string
// --------------------------------------------------------------------------------
function decrypt(data: string, passphrase: string) {
	if (typeof data !== 'string') {
		logger.error('[stitch] "data" must be a hex string.');
		return null;
	}
	if (typeof passphrase !== 'string') {
		logger.error('[stitch] "passphrase" must be a string.');
		return null;
	}
	const key = CryptoJS.lib.WordArray.create(passphrase);
	const opts = {
		iv: CryptoJS.lib.WordArray.create(IV),
		mode: CryptoJS.mode.CBC,
		padding: CryptoJS.pad.Pkcs7
	};
	let decrypted = CryptoJS.AES.decrypt({ ciphertext: CryptoJS.enc.Hex.parse(data) }, key, opts);
	decrypted = decrypted.toString(CryptoJS.enc.Utf8);

	if (!decrypted || decrypted === '') {
		logger.error('[stitch] unable to decrypt data. "passphrase" might be wrong');
		return null;
	} else {
		return decrypted;
	}
}

/*
// --------------------------------------------------------------------------------
// take base 64 encoded key and format it to key object, if already object leave it alone
// --------------------------------------------------------------------------------
function fmtKey(key: object | string, type: string) {
	let keyObj: any = key;
	if (typeof key === 'string') {							// if the key is a string, import it first
		let temp = null;
		if (type === 'private') {
			temp = import_prv_key(decode_b64_pem(key));
			if (temp) {
				keyObj = temp.prvKeyObj;
			}
		} else {
			temp = import_pub_key(decode_b64_pem(key));
			if (temp) {
				keyObj = temp.pubKeyObj;
			}
		}
	}
	return keyObj;
}
*/

//------------------------------------------------------------------
// Generate authorization token required for accessing fabric-ca APIs
//------------------------------------------------------------------
function generateCaAuthToken(opts: { client_prv_key_b64pem: string, client_cert_b64pem: string, body_obj: any }, cb: Function) {
	let prvKeyPem = decode_b64_pem(opts.client_prv_key_b64pem);
	let client_cert_b64pem = btoa(decode_b64_pem(opts.client_cert_b64pem));	// decode and encode to catch non encoded certs
	let payload = null;

	if (opts.body_obj) {
		let reqBodyB64 = btoa(JSON.stringify(opts.body_obj));
		payload = reqBodyB64 + '.' + client_cert_b64pem;
	} else {
		payload = '.' + client_cert_b64pem;
	}

	scSign({ prvKeyPEM: prvKeyPem, b_msg: utf8StrToUint8Array(payload) }, (_: any, b_signature: any) => {	// subtle crypto method does not need the has function
		let b64Sign = uint8ArrayToBase64(b_signature);
		return cb(null, client_cert_b64pem + '.' + b64Sign);
	});
}

/* this is the old way - with elliptic - pre 05/13/2020
// --------------------------------------------------------------------------------
// Generate a CSR - Certificate Signing Request
// --------------------------------------------------------------------------------
function genCSR(opts: { client_prv_key_b64pem: string, client_pub_key_b64pem: string, subject_dn: string, sans_arr: object[] | null }) {
	let prvKeyObj = fmtKey(opts.client_prv_key_b64pem, 'private');
	let pubKeyObj = fmtKey(opts.client_pub_key_b64pem, 'public');
	if (!prvKeyObj) {
		logger.error('[stitch] cannot make csr, missing "client_prv_key_b64pem" field');
		return null;
	}
	if (!pubKeyObj) {
		logger.error('[stitch] cannot make csr, missing "client_pub_key_b64pem" field');
		return null;
	}
	if (!opts.subject_dn) {
		logger.error('[stitch] cannot make csr, missing "subject_dn" field');
		return null;
	}

	try {
		// dsh todo replace newCSRPEM and remove KJUR_ASN1
		const csr_opts = {
			subject: {
				str: ldapToOpenSSL(opts.subject_dn)		// subject_dn = 'CN=' + opts.enroll_id
			},
			sbjpubkey: pubKeyObj,
			sigalg: 'SHA256withECDSA',
			sbjprvkey: prvKeyObj
		};

		// https://kjur.github.io/jsrsasign/api/symbols/KJUR.asn1.csr.CSRUtil.html#.newCSRPEM
		if (Array.isArray(opts.sans_arr) && opts.sans_arr.length > 0) {
			// @ts-ignore
			csr_opts.ext = [{					// the only extension jsrsasign supports is "subjectAltName", atm
				subjectAltName: {
					array: opts.sans_arr		// sans_arr is in the format [{ <type>: <value> }] like [{ dns: 'example.com' }]
				}
			}];
		}

		const csr = KJUR_ASN1.csr.CSRUtil.newCSRPEM(csr_opts);
		return csr;
	} catch (e) {
		logger.error('[stitch] cannot make csr:', e);
		return null;
	}

	// replace commas with slashes
	// 'O=test,C=US' -> '/O=test/C=US'
	// 'O=a/a,C=US' -> '/O=a\/a/C=US'
	function ldapToOpenSSL(str: string) {
		if (typeof str === 'string') {
			str = '/' + str.replace(/\//g, '\\/').replace(/,/g, '/').trim();
		}
		return str;
	}
}
*/

//-------------------------------------------------------------
// Build a signature collection signature header - used to authorize into athena apis
//-------------------------------------------------------------
// dsh edit apollo..
function buildSigCollectionAuthHeader(body: any, id_prv_key_pem_b64: string, cb: Function) {
	build_sig_collection_signature(body, id_prv_key_pem_b64, (_: any, base64: string) => {
		return cb(null, 'Signature ' + base64);
	});
}

//-------------------------------------------------------------
// Build a signature collection signature - used to authorize into athena apis
//-------------------------------------------------------------
function build_sig_collection_signature(body: any, id_prv_key_pem_b64: string, cb: Function) {
	logger.debug('[stitch] building scs from input body and private', body);
	if (!id_prv_key_pem_b64) {
		logger.error('[stitch] missing private key, should be in b64 pem');
		return cb(null);
	} else {
		const id_prv_key_pem = decode_b64_pem(id_prv_key_pem_b64);
		const str = build_sig_collection_for_hash(body);		// hash is computed in "sign", but really in subtle crypto
		const raw = utf8StrToUint8Array(str);
		//logger.debug('[stitch] built str for hash for auth header:', str);
		scSign({ prvKeyPEM: id_prv_key_pem, b_msg: raw }, (_: any, der: Uint8Array) => {
			return cb(null, uint8ArrayToBase64(der));
		});
	}
}

//-------------------------------------------------------------
// Build a signature collection string for a hash - used to validate auth attempts into athena apis
//-------------------------------------------------------------
function build_sig_collection_for_hash(body: any) {
	let minimal = null;
	if (body.authorize && body.authorize.hash_ver === 'v2') {	// newer hash function, more future proof
		minimal = JSON.parse(JSON.stringify(body));
		delete minimal.distribute;								// hash over fields that should not change between the request in and redistribute out
	} else {
		minimal = {												// hash over fields that should not change between the request in and redistribute out
			tx_id: body.tx_id,
			proposal: body.proposal,
			channel: body.channel,
			orderers: body.orderers,
			orgs2sign: body.orgs2sign,
			orderers2sign: body.orderers2sign,
			authorize: body.authorize,
			originator_msp: body.originator_msp,
			json_diff: {},
			current_policy: body.current_policy,
			status: body.status,
		};
	}
	minimal = sort_keys(minimal);
	return JSON.stringify(minimal);
}

/* removed 05/13/2020 - use new version w/asn1 lib
//-------------------------------------------------------------
// Return info on a certificate
//-------------------------------------------------------------
function parseCertificate(client_cert_b64pem: string) {
	const c_parser = new X509();
	let cert_as_pem = decode_b64_pem(client_cert_b64pem);
	let ret = {
		serial_number_hex: <string>'',
		signature_algorithm: <string>'',
		issuer: <string>'',
		not_before_ts: <number>0,
		not_after_ts: <number>0,
		subject: <string>'',
		X509_version: <string>'',
		base_64_pem: <string>'',
		time_left: '?',
		subject_alt_names: <any>null,
		subject_parsed: <string>'',
		subject_parts: <any>null,
		recovered_json: <any>{},
	};
	try {
		c_parser.readCertPEM(cert_as_pem);
		const alt_names = c_parser.getExtSubjectAltName2();
		ret = {
			serial_number_hex: c_parser.getSerialNumberHex(),
			signature_algorithm: c_parser.getSignatureAlgorithmField(),
			issuer: c_parser.getIssuerString(),
			not_before_ts: formatDate2Ts(c_parser.getNotBefore()),
			not_after_ts: formatDate2Ts(c_parser.getNotAfter()),
			subject: c_parser.getSubjectString(),
			X509_version: c_parser.getVersion(),
			base_64_pem: btoa(cert_as_pem),
			time_left: '?',					// default, populated below
			subject_alt_names: (alt_names && alt_names[0]) ? alt_names[0] : null, // I don't know why this is nested in an array, breaking it out
			subject_parsed: '',				// default, populated below
			subject_parts: null,			// default, populated below
			recovered_json: null,			// default, populated below
		};
	} catch (e) {
		logger.error('[stitch] unable to parse cert', e);
		return null;
	}
	const parsed_sub_str = parse_subject_str(ret.subject);
	ret.time_left = friendly_ms(ret.not_after_ts - Date.now());
	ret.subject_parsed = parsed_sub_str.replace(/[\/]/g, ', ');
	ret.subject_parts = break_up_subject_str(parsed_sub_str);
	ret.recovered_json = dive_for_treasure(cert_as_pem);
	return sort_keys(ret);

	// comes in as `200814180700Z` and need to get to this format '2020-08-14T18:07:00Z' to convert to ts
	function formatDate2Ts(date_str: string) {
		let today = new Date();				// lets guess that the first 2 digits of todays year (like YYYY) is the same as the certs date...
		let todays_year = today.getFullYear();
		let fmt = todays_year.toString().substring(0, 2) + date_str[0] + date_str[1] + '-' + date_str[2] + date_str[3] + '-' + date_str[4] + date_str[5];
		fmt += 'T' + date_str[6] + date_str[7] + ':' + date_str[8] + date_str[9] + ':' + date_str.substring(10);
		return new Date(fmt).getTime();
	}

	function break_up_subject_str(subject_str: string) {
		const subject_parts = <any>{};
		try {
			const parsed_parts = subject_str.split('/');
			for (let i in parsed_parts) {
				if (parsed_parts[i] && typeof parsed_parts[i] === 'string') {
					const field = parsed_parts[i].split('=');
					if (Array.isArray(field) && field.length >= 2) {
						const name = field[0];
						const value = field[1];

						if (subject_parts[name]) {										// oh no its already taken
							if (Array.isArray(subject_parts[name])) {					// its already an array, append
								subject_parts[name].push(value);
							} else {
								subject_parts[name] = [subject_parts[name], value];		// convert it into an array
							}
						} else {
							subject_parts[name] = value;
						}
					}
				}
			}
			return subject_parts;
		} catch (e) {
			logger.warn('[stitch] unable to parse subject in cert', e);
			return null;
		}
	}

	// convert '/OU=peer+OU=org1+OU=department2/CN=myuser1' to 'OU=peer/OU=org1/OU=department2/CN=myuser1'
	function parse_subject_str(subject_str: string) {
		let temp = subject_str;
		try {
			temp = (subject_str[0] === '/') ? subject_str.substring(1) : subject_str;	// remove first slash
			temp = temp.replace(/[\+]/g, '/');
		} catch (e) { }

		if (temp && temp.length > 2) {				// make sure we actually found something
			return temp;
		} else {									// else return what was given
			return subject_str;
		}
	}

	// dirty hack to pull out the CA "attrs" json from inside cert, i'm sorry.
	// looking for this exact string '{"attrs":{<anything>}}' inside the cert
	function dive_for_treasure(cert_pem: string) {
		try {
			const begin = cert_pem.indexOf('-----BEGIN CERTIFICATE-----');
			const end = cert_as_pem.indexOf('-----END CERTIFICATE-----');
			const data = cert_pem.substring(begin + 27, end).trim();
			const decoded_blob = atob(data);

			let matches = decoded_blob.match(/{".+}}/);		// try looking for this regex first
			if (matches && matches[0]) {
				return JSON.parse(matches[0]);
			}

			matches = decoded_blob.match(/{".+}/);			// last chance, try this regex
			if (matches && matches[0]) {
				return JSON.parse(matches[0]);
			}
		} catch (e) {
			return null;
		}
	}
}
*/

//-------------------------------------------------------------
// Return info on a certificate
//-------------------------------------------------------------
function parseCertificate(client_cert_b64pem: string) {
	let cert_as_pem = decode_b64_pem(client_cert_b64pem);
	let parsed = DER_parseCertificate(cert_as_pem);				// use the asn1 lib to parse it
	//logger.debug('[stitch] DER parsing output of certificate:', parsed);
	let ret = null;

	if (parsed) {
		ret = {
			serial_number_hex: parsed.certificate.serialNumber,
			signature_algorithm: parsed.signatureAlgorithm.curveFamilyOid,
			issuer: parsed.certificate.issuer,
			not_before_ts: parsed.certificate.validity.notBefore,
			not_after_ts: parsed.certificate.validity.notAfter,
			subject: parsed.certificate.subject,
			X509_version: Number(parsed.certificate.version),
			base_64_pem: btoa(cert_as_pem),
			time_left: friendly_ms(parsed.certificate.validity.notAfter - Date.now()),
			subject_alt_names: parsed.certificate.extensions.subjectAltName || null,
			subject_parsed: <string>'',		// default, populated below
			subject_parts: <any>null,		// default, populated below
			recovered_json: <any>{},		// default, populated below
		};

		const parsed_sub_str = parse_subject_str(ret.subject);
		ret.subject_parsed = parsed_sub_str.replace(/[\/]/g, ', ');
		ret.subject_parts = break_up_subject_str(parsed_sub_str);
		ret.recovered_json = dive_for_treasure(cert_as_pem);
		if (!ret.recovered_json) { delete ret.recovered_json; }
	}
	return sort_keys(ret);

	// this is hear to preserve the behavior we had when jsrsasign was being used
	// convert '/OU=peer+OU=org1+OU=department2/CN=myuser1' to 'OU=peer/OU=org1/OU=department2/CN=myuser1'
	function parse_subject_str(subject_str: string) {
		let temp = subject_str;
		try {
			temp = (subject_str[0] === '/') ? subject_str.substring(1) : subject_str;	// remove first slash
			temp = temp.replace(/[\+]/g, '/');
		} catch (e) { }

		if (temp && temp.length > 2) {				// make sure we actually found something
			return temp;
		} else {									// else return what was given
			return subject_str;
		}
	}

	// this is hear to preserve the behavior we had when jsrsasign was being used
	function break_up_subject_str(subject_str: string) {
		const subject_parts = <any>{};
		try {
			const parsed_parts = subject_str.split('/');
			for (let i in parsed_parts) {
				if (parsed_parts[i] && typeof parsed_parts[i] === 'string') {
					const field = parsed_parts[i].split('=');
					if (Array.isArray(field) && field.length >= 2) {
						const name = field[0];
						const value = field[1];

						if (subject_parts[name]) {										// oh no its already taken
							if (Array.isArray(subject_parts[name])) {					// its already an array, append
								subject_parts[name].push(value);
							} else {
								subject_parts[name] = [subject_parts[name], value];		// convert it into an array
							}
						} else {
							subject_parts[name] = value;
						}
					}
				}
			}
			return subject_parts;
		} catch (e) {
			logger.warn('[stitch] unable to parse subject in cert', e);
			return null;
		}
	}

	// dsh todo - this can be better now with the asn1 lib
	// this is hear to preserve the behavior we had when jsrsasign was being used
	// dirty hack to pull out the CA "attrs" json from inside cert, i'm sorry.
	// looking for this exact string '{"attrs":{<anything>}}' inside the cert
	function dive_for_treasure(cert_pem: string) {
		try {
			const begin = cert_pem.indexOf('-----BEGIN CERTIFICATE-----');
			const end = cert_as_pem.indexOf('-----END CERTIFICATE-----');
			const data = cert_pem.substring(begin + 27, end).trim();
			const decoded_blob = atob(data);

			let matches = decoded_blob.match(/{".+}}/);		// try looking for this regex first
			if (matches && matches[0]) {
				return JSON.parse(matches[0]);
			}

			matches = decoded_blob.match(/{".+}/);			// last chance, try this regex
			if (matches && matches[0]) {
				return JSON.parse(matches[0]);
			}
		} catch (e) {
			return null;
		}
	}
}

//-------------------------------------------------------------
// return true if the certificate provided was signed by a provided root cert - cert chains are supported
//-------------------------------------------------------------
function isTrustedCertificate(opts: Itc, cb: Function) {
	async.eachLimit(opts.root_certs_b64pems, 1, (b64_root_cert: string, cb_checked_outer: Function) => {
		const certificate_pem = decode_b64_pem(opts.certificate_b64pem);
		const root_cert_pem = decode_b64_pem(b64_root_cert);
		const root_cert_parsed = parseCertificate(root_cert_pem);

		// --- loop on inner certs --- //
		let individual_root_certs = break_up_chain(root_cert_pem);
		async.eachLimit(individual_root_certs, 1, (inner_root_cert_pem: string, cb_checked_inner: Function) => {
			check_cert(inner_root_cert_pem, certificate_pem, (_: any, validity: boolean) => {
				const matching_root_obj = (validity === true) ? root_cert_parsed : null;
				return cb_checked_inner(matching_root_obj);				// return root cert in the error argument, this will stop the async loop when validity is true
			});
		}, (inner_matching_root_obj: any) => {
			return cb_checked_outer(inner_matching_root_obj);			// return root cert in the error argument, this will stop the async loop when validity is true
		});
	}, (outer_matching_rt_obj: any) => {
		if (opts.alt_response) {													// alt response puts validity in arg 1 and parsed root cert that matched in arg 2
			return cb(outer_matching_rt_obj ? true : false, outer_matching_rt_obj);
		} else {																	// normal response puts validity in arg 2
			return cb(null, outer_matching_rt_obj ? true : false);
		}
	});

	function break_up_chain(root_cert_pem: string) {
		let individual_certs = root_cert_pem.split('-----END CERTIFICATE-----');	// break up a cert chain
		if (Array.isArray(individual_certs) && individual_certs.length > 1) {		// the split makes 1 empty element, so we need 2
			individual_certs.splice(individual_certs.length - 1, 1);				// remove last one, its empty
			for (let i in individual_certs) {
				individual_certs[i] += '-----END CERTIFICATE-----';					// add this back
			}
		}
		return individual_certs;
	}

	function check_cert(root_cert_pem: string, certificate_pem: string, cb_check_cert: Function) {
		const parts = DER_parseCertificate(certificate_pem);
		if (!parts || !parts.bin) {
			return cb_check_cert(null, false);
		} else {
			scVerifySignature({ certificate_b64pem: root_cert_pem, der_sig: parts.bin.signature, b_msg: parts.bin.certificate }, (_: any, validity: boolean) => {
				return cb_check_cert(null, validity);
			});
		}
	}
}

//-------------------------------------------------------------
// return a map holding the root certs and which "regular" certificates they have signed
//-------------------------------------------------------------
function mapCertificatesToRoots(opts: Mcr, cb: Function) {
	const roots_parsed: any = {};
	for (let i in opts.root_certs_b64pems) {											// make an object of each root pem parsed
		const parsed = parseCertificate(opts.root_certs_b64pems[i]);
		roots_parsed[parsed.serial_number_hex] = parsed;
	}

	const ret = <any>{
		certificate_results: [],
	};

	async.eachLimit(opts.certificate_b64pems, 1, (cert_b64pem: string, cb_checked: Function) => {	// loop on regular certs
		const t_opts = {
			certificate_b64pem: cert_b64pem,
			root_certs_b64pems: opts.root_certs_b64pems,
			alt_response: true,
		};
		isTrustedCertificate(t_opts, (validity: boolean, parsed_root_cert: any) => {	// test each regular cert against all root certs
			const regular_cert_parsed = parseCertificate(cert_b64pem);
			const cert_result_obj = {
				cert_serial: regular_cert_parsed.serial_number_hex,
				signed_by_root_serial: (validity === true && parsed_root_cert) ? parsed_root_cert.serial_number_hex : 'no-matches',
			};
			ret.certificate_results.push(cert_result_obj);
			return cb_checked();
		});
	}, () => {
		return cb(null, ret);
	});
}

// --------------------------------------------------------------------------------
// Uses SubtleCrypto to sign a raw message with a pem key - [returns DER signature]
// return signature in the der format b/c thats what fabric will consume
// --------------------------------------------------------------------------------
function scSign(opts: { prvKeyPEM: string, b_msg: Uint8Array }, cb: Function) {
	if (typeof opts.prvKeyPEM !== 'string') {
		logger.error('[stitch] "pem_key" must be a string.');
		return cb({ function_name: 'scSign', error: true, stitch_msg: '"prvKeyPEM" must be in PEM format' });
	}

	opts.prvKeyPEM = decode_b64_pem(opts.prvKeyPEM);

	const jwks = pem2jwks({ pubKeyPEM: '', prvKeyPEM: opts.prvKeyPEM });
	if (!jwks || !jwks.private) {
		logger.error('[stitch] unable to convert pem to JWK..');
		return cb({ function_name: 'scSign', error: true, stitch_msg: 'unable to convert pem to JWK' });
	} else {
		const curve = jwks.private.crv;
		scSignJwkRaw(jwks.private, opts.b_msg, (_: any, new_sig: any) => {
			const der = sig2der(new_sig, curve);
			return cb(null, der);
		});
	}
}

// Uses SubtleCrypto to sign a raw message with a pem key - [returns raw signature (not DER)]
function scSignPemRaw(prvKeyPEM: string, message: Uint8Array, cb: Function) {
	if (typeof prvKeyPEM !== 'string') {
		logger.error('[stitch] "pem_key" must be a string.');
		return cb({ function_name: 'scSignPemRaw', error: true, stitch_msg: '"prvKeyPEM" must be in PEM format' });
	}

	prvKeyPEM = decode_b64_pem(prvKeyPEM);

	const jwks = pem2jwks({ pubKeyPEM: '', prvKeyPEM: prvKeyPEM });
	if (!jwks || !jwks.private) {
		logger.error('[stitch] unable to convert pem to JWK..');
		return cb({ function_name: 'scSignPemRaw', error: true, stitch_msg: 'unable to convert pem to JWK' });
	} else {
		scSignJwkRaw(jwks.private, message, (_: any, signed: any) => {
			return cb(null, signed);
		});
	}
}

// Uses SubtleCrypto to sign a raw message with a private JWK - [returns raw signature (not DER)]
function scSignJwkRaw(priv_jwk: Jwk, message: Uint8Array, cb: Function) {
	if (!message || message.constructor.name !== 'Uint8Array') {
		logger.error('[stitch] "message" must be a Uint8Array.', message.constructor.name);
		return cb({ function_name: 'scSignJwkRaw', error: true, stitch_msg: '"message" must be in Uint8Array format' });
	} else if (!priv_jwk) {
		logger.error('[stitch] unable to convert pem to JWK..');
		return cb({ function_name: 'scSignJwkRaw', error: true, stitch_msg: 'unable to convert pem to JWK' });
	} else {
		importJwkEcdsaKey(priv_jwk, (_: any, fmt_key: CryptoKey) => {
			subtleSignMsg(message, fmt_key, (_2: any, signed: string) => {
				return cb(_2, signed);
			});
		});
	}
}

// Create a new ECDSA key with SubtleCrypto
function scGenEcdsaKeys(curve: string | null, cb: Function) {
	subtleGenEcdsaKey(curve, (_1: any, cryptoKeys: CryptoKeyPair) => {
		exportJwkKey(cryptoKeys.privateKey, (_2: any, prv_jwk: Jwk) => {
			exportJwkKey(cryptoKeys.publicKey, (_3: any, pub_jwk: Jwk) => {
				const ret = {
					pubKeyPEM: jwk2pem(pub_jwk),
					prvKeyPEM: jwk2pem(prv_jwk),
					pubKeyPEMb64: '',
					prvKeyPEMb64: ''
				};
				ret.pubKeyPEMb64 = ret.pubKeyPEM ? btoa(ret.pubKeyPEM) : '';
				ret.prvKeyPEMb64 = ret.prvKeyPEM ? btoa(ret.prvKeyPEM) : '';
				return cb(null, ret);
			});
		});
	});
}

// verify signature with SubtleCrypto
function scVerifySignature(opts: { certificate_b64pem: string, der_sig: Uint8Array, b_msg: Uint8Array }, cb: Function) {
	if (typeof opts.certificate_b64pem !== 'string') {
		logger.error('[stitch] "certificate_b64pem" must be a string.', typeof opts.certificate_b64pem);
		return cb({ function_name: 'scVerifySignature', error: true, stitch_msg: '"certificate_b64pem" must be in PEM format' });
	}

	opts.certificate_b64pem = decode_b64_pem(opts.certificate_b64pem);

	const jwks = pem2jwks({ pubKeyPEM: opts.certificate_b64pem, prvKeyPEM: '' });
	if (!jwks || !jwks.public) {
		logger.error('[stitch] unable to convert pem to JWK..');
		return cb({ function_name: 'scVerifySignature', error: true, stitch_msg: 'unable to convert pem to JWK' });
	} else {
		importJwkEcdsaKey(jwks.public, (_1: any, pubCryptoKey: CryptoKey) => {
			subtleVerifySignatureDer(pubCryptoKey, opts.der_sig, opts.b_msg, (_2: any, valid: boolean) => {
				return cb(null, valid);
			});
		});
	}
}

// --------------------------------------------------------------------------------
// Generate a CSR - Certificate Signing Request - uses SubtleCrypto to sign the request
// --------------------------------------------------------------------------------
function scGenCSR(opts: { client_prv_key_b64pem: string, client_pub_key_b64pem: string | null, subject: string, ext: Ext | null }, cb: Function) {
	let prvKeyPEM = decode_b64_pem(opts.client_prv_key_b64pem);
	let pubKeyPEM = opts.client_pub_key_b64pem ? decode_b64_pem(opts.client_pub_key_b64pem) : '';

	const parsed = parsePem({ pubKeyPEM: pubKeyPEM, prvKeyPEM: prvKeyPEM });
	if (!parsed || !parsed.private) {
		logger.error('[stitch] unable to parse provided private pem. malformed or unsupported type.');
		return cb({ function_name: 'scGenCSR', error: true, stitch_msg: 'unable to parse private pem' });
	} else if (opts.client_pub_key_b64pem && (!parsed || !parsed.public)) {			// only an error if public is provided, its optional
		logger.error('[stitch] unable to parse provided public pem. malformed or unsupported type.');
		return cb({ function_name: 'scGenCSR', error: true, stitch_msg: 'unable to parse public pem' });
	} else {

		const csr_data = {
			subject: opts.subject,
			private_key: parsed.private,
			public_key: parsed.public,	// [optional] we can usually recover the public key from the private key (at least if stitch made the key pair)
			ext: opts.ext,				// SANs go here
			sig_data: null,
		};
		DER_signAndPackCsrPem(prvKeyPEM, csr_data, (csr_error: any, pem: string) => {
			return cb(csr_error, pem);
		});
	}
}

// build the local storage key name for this username
function fmtAesKeyName(username: string) {
	return 'ibp_aes_key_' + username;
}

// make the local storage string safe - stitch only expects hex characters (atm) plus the prefix thing so only allow those chars
function safer_hex_str(str: string | null) {
	const regex_hex = new RegExp(/[^0-9a-fv.]/gi);		// allow hex characters, dots, and "v" (any case)
	if (typeof str === 'string') {
		return str.replace(regex_hex, '');				// remove the other characters
	} else {
		return '';
	}
}

// look up user's aes key in local storage, or make a aes key and set it in local storage
function getOrGenAesKey(user: string, cb: Function) {
	const existingKey = safer_hex_str(window.localStorage.getItem(fmtAesKeyName(user)));
	if (!existingKey) {
		logger.debug('[stitch] existing AES key not found - generating encryption key for user:', user);
		subtleGenEncryptionKey((e: DOMException, newHexKey: any) => {
			if (e) {
				logger.error('[stitch] unable to generate key. e:', e);
				return cb(e, null);
			} else {
				logger.debug('[stitch] generated aes AES key for user:', user);
				window.localStorage.setItem(fmtAesKeyName(user), safer_hex_str(newHexKey));
				return cb(null, newHexKey);
			}
		});
	} else {
		//logger.debug('[stitch] found existing AES key for user:', opts.user);
		return cb(null, existingKey);
	}
}

// --------------------------------------------------------------------------------
// decrypt data using user's key in local storage, or use legacy decryption
// --------------------------------------------------------------------------------
function scDecrypt(opts: { data: string, user: string }, cb: Function) {
	let errors = [];
	if (!opts || typeof opts.data !== 'string') {
		errors.push('cannot decrypt. "data" must be a string.');
	}
	if (!opts || typeof opts.user !== 'string') {
		errors.push('cannot decrypt. "user" must be a string.');
	}
	if (errors.length > 0) {
		logger.error('[stitch]', errors);
		return cb(errors, null);
	}

	getOrGenAesKey(opts.user, (e: DOMException, hexKey: string) => {
		if (e) {
			return cb(e, null);												// error already logged
		} else {
			if (opts.data.indexOf(AES_VER_PREFIX) !== 0) {						// handle legacy aes
				logger.debug('[stitch] decryption data is missing aes version prefix. trying legacy AES decryption.');
				return cb(null, decrypt(opts.data, opts.user));
			} else {														// handle subtle crypto aes
				subtleDecrypt(opts.data.substring(AES_VER_PREFIX.length), hexKey, (e2: DOMException, str: string) => {
					if (e2) {
						logger.warn('[stitch] error using sc AES decryption, trying legacy AES decryption. e:', e2);
						return cb(null, decrypt(opts.data, opts.user));		// fall back to legacy
					} else {
						return cb(null, str);
					}
				});
			}
		}
	});
}

// --------------------------------------------------------------------------------
// encrypt data using user's aes key from local storage (key is auto found, just pass the username)
// notes:
// - this replaces the legacy function so that we can use subtleCrypto. subtleCrypto requires a key (a passphrase won't work).
// - to preserve legacy behavior a key will be automatically generated from the old "passphrase" value.
// --------------------------------------------------------------------------------
function scEncrypt(opts: { msg: string, user: string }, cb: Function) {
	let errors = [];
	if (!opts || typeof opts.msg !== 'string') {
		errors.push('cannot decrypt. "msg" must be a string.');
	}
	if (!opts || typeof opts.user !== 'string') {
		errors.push('cannot decrypt. "user" must be a string.');
	}
	if (errors.length > 0) {
		logger.error('[stitch]', errors);
		return cb(errors, null);
	}

	getOrGenAesKey(opts.user, (e2: DOMException, aes_key: string) => {
		if (e2) {
			return cb(e2, null);										// error already logged
		} else if (aes_key) {
			subtleEncrypt(opts.msg, aes_key, (e1: any, encrypted: string) => {
				if (e2) {
					logger.warn('[stitch] error using sc AES encryption. e:', e2);
					return cb(e2, null);
				} else {
					return cb(null, AES_VER_PREFIX + encrypted);			// always append the version, so we know it was encrypted using the subtle crypto
				}
			});
		}
	});
}

// return true if the private key is well formed - accepts base 64 encoded PEM or regular PEM
function validatePrivateKey(pem_b64: string) {
	const pubKeyPEM = decode_b64_pem(pem_b64);
	const priv_bin_data = <InPrvFmt>DER_parsePem(pubKeyPEM);

	if (!priv_bin_data || !priv_bin_data.prv_hex_d || !priv_bin_data.pub_hex_xy || !priv_bin_data.curve) {
		logger.error('[stitch] unable to parse private key from PEM.', priv_bin_data);
		return false;
	} else if (priv_bin_data.cert_label !== PRIVATE_LABEL) {
		logger.error('[stitch] PEM is not a private key:', priv_bin_data);
		return false;
	} else {
		return true;
	}
}

// return true if the public key is well formed - accepts base 64 encoded PEM or regular PEM
function validatePublicKey(pem_b64: string) {
	const pubKeyPEM = decode_b64_pem(pem_b64);
	const pub_bin_data = <InPubFmt>DER_parsePem(pubKeyPEM);

	if (!pub_bin_data || !pub_bin_data.pub_hex_xy || !pub_bin_data.curve) {
		logger.error('[stitch] unable to parse public key from PEM.', pub_bin_data);
		return false;
	} else if (pub_bin_data.cert_label !== PUBLIC_LABEL) {
		logger.error('[stitch] PEM is not a public key:', pub_bin_data);
		return false;
	} else {
		return true;
	}
}

// return true if the public cert is well formed - accepts base 64 encoded PEM or regular PEM
function validateCertificate(pem_b64: string) {
	const pubKeyPEM = decode_b64_pem(pem_b64);
	const pub_bin_data = <InPubFmt>DER_parsePem(pubKeyPEM);

	if (!pub_bin_data || !pub_bin_data.pub_hex_xy || !pub_bin_data.curve) {
		logger.error('[stitch] unable to parse public key from PEM.', pub_bin_data);
		return false;
	} else if (pub_bin_data.cert_label !== CERTIFICATE_LABEL) {
		logger.error('[stitch] PEM is not a certificate:', pub_bin_data);
		return false;
	} else {
		return true;
	}
}

// look at local storage and switch legacy AES identities to subtle crypto AES - leave other entries alone
// this runs on start, all the time
function switchEncryption() {
	const PREFIX = 'ibp_identities_';								// prefix that apollo is using on current identities in local storage
	for (let ls_key in localStorage) {								// iter on all keys in ls
		if (ls_key.indexOf(PREFIX) === 0) {							// this is an apollo identity, check if it needs switching
			const data = safer_hex_str(window.localStorage.getItem(ls_key));
			if (data) {
				if (data.indexOf(AES_VER_PREFIX) === 0) {				// this apollo identity does NOT need to be switched
					logger.debug('[stitch] identity is using sc aes encryption already. user:', ls_key);
				} else {											// this apollo identity needs to be switched

					// make a AES key for this user
					const user = ls_key.substring(PREFIX.length);	// grab the email/username from the ls key, this is our passphrase for legacy
					logger.debug('[stitch] switching aes encryption for user:', user);
					getOrGenAesKey(user, (_: DOMException, aes_hex_key: string) => {
						overwrite_ls(ls_key, user, data, () => { });
					});
				}
			}
		}
	}

	// overwrite the ls value
	function overwrite_ls(ls_key: string, user: string, encrypted_data: string, cb: Function) {
		const decrypted = decrypt(encrypted_data, user);						// decrypt using the legacy AES, user === passphrase
		let obj = null;
		try {
			obj = JSON.parse(decrypted);
		} catch (e) {
			logger.error('[stitch] unable to parse encrypted identity in local storage. e:', e, decrypted);
			return cb(e, null);
		}

		if (!obj || typeof obj !== 'object' || Object.keys(obj).length === 0) {	// sanity test - see if there is any data in here
			logger.warn('[stitch] the decrypted ls key does not contain an object. this should not happen:', decrypted);
			return cb(null, null);
		} else {
			scEncrypt({ msg: decrypted, user: user }, (e1: any, encrypted: string) => {
				if (e1) {
					return cb(e1, null);										// error already logged
				} else {
					logger.debug('[stitch] overwriting lc key:', ls_key);
					window.localStorage.setItem(ls_key, safer_hex_str(encrypted));
					return cb(null, encrypted);
				}
			});
		}
	}
}

interface Bsp {
	client_cert_b64pem: string;
	client_prv_key_b64pem: string;
	protobuf: Uint8Array | string;
	msp_id: string;
}

interface Itc {
	certificate_b64pem: string;
	root_certs_b64pems: string[];
	alt_response: boolean;
}

interface Mcr {
	certificate_b64pems: string[];
	root_certs_b64pems: string[];
}
