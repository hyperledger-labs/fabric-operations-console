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
const ASN1 = require('asn1.js');
const Buffer = require('safer-buffer').Buffer;

const PUBLIC_LABEL = 'PUBLIC KEY';							// do not add the 5 dashes, the ans1 lib won't take it
const PRIVATE_LABEL = 'PRIVATE KEY';						// do not add the 5 dashes, the ans1 lib won't take it
const CERTIFICATE_LABEL = 'CERTIFICATE';					// ^^ ditto

const OID_FAMILY = '1.2.840.10045.2.1';						// encodes to hex 2A8648CE3D0201 Elliptic Curve Cryptography (ECC)
const OID_P256 = '1.2.840.10045.3.1.7';						// encodes to hex 2A8648CE3D030107 aka 256-bit Elliptic Curve Cryptography (ECC) aka P-256
const OID_P384 = '1.3.132.0.34';							// encodes to hex 2B81040022 aka 384-bit Elliptic Curve Cryptography (ECC) secp384r1 aka P-384
const OID_P521 = '1.3.132.0.35';							// encodes to hex 2B81040023 aka 521-bit Elliptic Curve Cryptography (ECC) secp521r1 aka P-521

const CURVES_BY_OID: StringObj = {};						// the keys are OID ans1 values for curves, the value is the simple curve name
CURVES_BY_OID[OID_P256] = 'P-256';
CURVES_BY_OID[OID_P384] = 'P-384';
CURVES_BY_OID[OID_P521] = 'P-521';

// these are the types that we support for subject alt names
const P_TYPES: StringObj = {
	rfc822: '81',
	dns: '82',			// dns -> hex 0xA4
	dn: 'a4',
	uri: '86',
	ip: '87',
	rid: '88'
};

// almost all of these are pulled from jsrsasign - https://github.com/kjur/jsrsasign/blob/c141b95f0519894bbdaab729c537febe5bef4db2/src/asn1x509-1.0.js
const OID_MAP: StringObj = {
	// rfc4514 AttributeType - short form
	'C': '2.5.4.6',									// countryName
	'O': '2.5.4.10',								// organizationName
	'L': '2.5.4.7',									// localityName
	'CN': '2.5.4.3',								// commonName
	'ST': '2.5.4.8',								// stateOrProvinceName
	'OU': '2.5.4.11',								// organizationalUnitName
	'STREET': '2.5.4.9',							// streetAddress
	'DC': '0.9.2342.19200300.100.1.25',				// domainComponent
	'UID': '0.9.2342.19200300.100.1.1',				// userId

	// other AttributeType - short form
	'E': '1.2.840.113549.1.9.1', 					// emailAddress
	'T': '2.5.4.12', 								// title
	'SN': '2.5.4.4', 								// surname
	'DN': '2.5.4.49', 								// distinguishedName

	// other AttributeType - long form
	'description': '2.5.4.13',
	'businessCategory': '2.5.4.15',
	'postalCode': '2.5.4.17',
	'serialNumber': '2.5.4.5',
	'uniqueIdentifier': '2.5.4.45',
	'organizationIdentifier': '2.5.4.97',
	'surname': '2.5.4.4',
	'title': '2.5.4.12',
	'distinguishedName': '2.5.4.49',
	'emailAddress': '1.2.840.113549.1.9.1',

	// rfc4514 AttributeType - long form
	'commonName': '2.5.4.3',
	'countryName': '2.5.4.6',
	'localityName': '2.5.4.7',
	'stateOrProvinceName': '2.5.4.8',
	'streetAddress': '2.5.4.9',
	'organizationName': '2.5.4.10',
	'organizationalUnitName': '2.5.4.11',
	'domainComponent': '0.9.2342.19200300.100.1.25',
	'userId': '0.9.2342.19200300.100.1.1',

	// other - long form
	'subjectKeyIdentifier': '2.5.29.14',
	'keyUsage': '2.5.29.15',
	'subjectAltName': '2.5.29.17',
	'issuerAltName': '2.5.29.18',
	'basicConstraints': '2.5.29.19',
	'nameConstraints': '2.5.29.30',
	'caIssuers': '1.3.6.1.5.5.7.48.2',
	'extensionRequest': '1.2.840.113549.1.9.14',		// CSR extensionRequest
	'authorityKeyIdentifer': '2.5.29.35',

	// crypto families
	'SHA256withECDSA': '1.2.840.10045.4.3.2',
	'SHA256withRSA': '1.2.840.113549.1.1.11'
};
let OID_REVERSE_MAP: StringObj = {};
let lc_map_temp: StringObj = {};
for (let oid_name in OID_MAP) {
	let key = OID_MAP[oid_name].split('.').join(' ');
	if (!OID_REVERSE_MAP[key]) {
		OID_REVERSE_MAP[key] = oid_name;
	} else {
		const prev_name = OID_REVERSE_MAP[key];
		if (oid_name.length < prev_name.length) {	// use the shorter name
			OID_REVERSE_MAP[key] = oid_name;
		}
	}

	let lc_oid = oid_name.toLowerCase();
	lc_map_temp[lc_oid] = OID_MAP[oid_name];
}

// now build lc keys to make object case-insensitive
for (let lc_oid_name in lc_map_temp) {				// copy lc keys we don't have in the original to original obj
	if (!OID_MAP[lc_oid_name]) {
		OID_MAP[lc_oid_name] = lc_map_temp[lc_oid_name];
	}
}

// Libs built by us
import { scSignPemRaw /*scSignJwkRaw*/ } from './crypto_misc';
import { logger, uint8ArrayToHexStr, hexStrToUint8Array, uint8ArrayToBase64 } from './misc';
import { PRIVATE, PUBLIC, remove_leading_00s, DEFAULT_CURVE, /*pem2jwks, importJwkEcdsaKey, subtleVerifySignature*/ } from './subtle_crypto';

// exports
export {
	/*asn1_test,*/ InPubFmt, InPrvFmt, OID_FAMILY, CURVES_BY_OID, DER_parsePem, DER_packPem, DER_parseSignature, DER_packSignature,
	PRIVATE_LABEL, PUBLIC_LABEL, CERTIFICATE_LABEL, DER_signAndPackCsrPem, Ext, DER_parseCertificate
};

// ------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------- Private Key Work ---------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------------
const DerPrvKeyWrap = ASN1.define('keyWrap', function () {

	// this is type 48 = 0x30
	this.seq().obj(

		// this is type 2, no idea what this is, always 1
		this.key('integer').int(),

		// this is type 4, aka "d"
		this.key('privateKey').octstr(),

		// the wrap part is type 161 = 0xA1
		// the bitstr part is type 3, its value is ("04" + x + y) [the  0x04 in position 0 indicates a compressed xy format]
		this.key('publicKey').explicit(1).bitstr().optional()
	);
});
const DerEcdsaPrivateKey = ASN1.define('EcdsaPrivateKey', function () {

	// this is type 48 = 0x30
	this.seq().obj(

		// this is type 2, version of the format, always 0
		this.key('version').int(),

		this.key('paramWrap').seq().obj(

			// this is type 6, family curve, Elliptic curve public key cryptography
			this.key('curveFamilyOid').objid().optional(),

			// this is type 6, indicates the exact ECDSA curve, like P-256, P-384, P-521
			this.key('curveOid').objid().optional(),
		),

		this.key('keyWrap').octstr().contains(DerPrvKeyWrap)
	);
});

/*
// build a private key object that ans1 lib can ingest from raw data
function buildPrvKeyObject(rawPrivateKey: string, hex_xy: string, curve: string) {
	const OIDS: any = {};			// the keys are the curve name, the values are arrays OID ans1 property
	OIDS['P-256'] = [1, 2, 840, 10045, 3, 1, 7];
	OIDS['P-384'] = [1, 3, 132, 0, 34];
	OIDS['P-521'] = [1, 3, 132, 0, 35];

	const privateKeyObj: Prk = {
		version: new BN(0),									// version is always 0 from what I can tell
		paramWrap: {
			curveFamilyOid: [1, 2, 840, 10045, 2, 1],		// always this for ECDSA
			curveOid: OIDS[curve]
		},
		keyWrap: {
			integer: new BN(1),								// this field, wtf is it, is always 1
			privateKey: Buffer.from(rawPrivateKey, 'hex'),
			publicKey: {
				data: Buffer.from(hex_xy, 'hex')
			}
		}
	};

	return privateKeyObj;
}
*/

// dsh todo the comment "leading 00s caused issues in DER packing" might only apply to the older ASN1 lib... that I removed
// retest keys + signatures with leading single 0s and double 0s and the new lib (asn1.js)!!

// convert asn1 lib output format to one a human can read (use hex strings instead of buffers)
function fmtDecodedPrvKey(obj: Prk) {
	const ret: InPrvFmt = {
		type: PRIVATE,										// what type of key the hex data describes
		cert_label: PRIVATE_LABEL,							// the label of the original PEM, such as -----BEGIN CERTIFICATE-----
		curve_family_oid: obj.paramWrap.curveFamilyOid.join('.'),
		curve_oid: '',										// these fields are populated below, all of them
		curve: '',
		pub_hex_xy: '',
		pub_hex_x: '',
		pub_hex_y: '',
		prv_hex_d: '',
	};

	const curve_oid = obj.paramWrap.curveOid.join('.');
	ret.curve_oid = curve_oid;
	ret.curve = CURVES_BY_OID[curve_oid];

	let xy = obj.keyWrap.publicKey.data.toString('hex');
	xy = remove_leading_00s(xy);							// leading 00s caused issues in DER packing, they must be removed
	const xy_len = Math.floor((xy.length - 2) / 2);			// should always be divisible by 2, but just in case use floor

	ret.pub_hex_xy = xy;
	ret.pub_hex_x = xy.substring(2, xy_len + 2);			// x is the first half of xy, skip the first 2 characters its just the 0x04 prefix
	ret.pub_hex_y = xy.substring(xy_len + 2);				// y is in the 2nd half of xy (go figure?)

	let d_hex = obj.keyWrap.privateKey.toString('hex');
	d_hex = remove_leading_00s(d_hex);						// leading 00s caused issues in DER packing, they must be removed
	ret.prv_hex_d = d_hex;

	return ret;
}

// convert the internal private key format back to one asn1 lib can ingest
function unfmtDecodedPrvKey(obj: InPrvFmt) {
	const ret: Prk = {
		version: new BN(0),									// version is always 0 from what I can tell
		paramWrap: {
			curveFamilyOid: splitOidStr(obj.curve_family_oid),
			curveOid: splitOidStr(obj.curve_oid),
		},
		keyWrap: {
			integer: new BN(1),								// this field is always 1 from what I can tell
			privateKey: Buffer.from(obj.prv_hex_d, 'hex'),
			publicKey: {
				data: build_raw_xy(obj),					// xy aka public key data is a bit string, so it has this nested "data" field, unlike privateKey
			}
		}
	};
	return ret;
}


// ------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------- Public Key Work ---------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------------
const DerEcdsaPublicKey = ASN1.define('EcdsaPrivateKey', function () {

	// this is type 48 = 0x30
	this.seq().obj(

		// this is type 48 = 0x30
		this.key('paramWrap').seq().obj(

			// this is type 6, family curve, Elliptic curve public key cryptography
			this.key('curveFamilyOid').objid().optional(),

			// this is type 6, indicates the exact ECDSA curve, like P-256, P-384, P-521
			this.key('curveOid').objid().optional(),
		),

		// this is type 3, its value is ("04" + x + y) [the  0x04 in position 0 indicates a compressed xy format]
		this.key('publicKey').bitstr()
	);
});

// convert asn1 lib output format to one a human can read (use hex strings instead of buffers)
function fmtDecodedPubKey(obj: Puk) {
	const ret: InPubFmt = {
		type: PUBLIC,										// what type of key the hex data describes
		cert_label: PUBLIC_LABEL,							// the label of the original PEM, such as -----BEGIN CERTIFICATE-----
		curve_family_oid: obj.paramWrap.curveFamilyOid.join('.'),
		curve_oid: '',
		curve: '',
		pub_hex_xy: '',
		pub_hex_x: '',
		pub_hex_y: '',
	};

	const curve_oid = obj.paramWrap.curveOid.join('.');
	ret.curve_oid = curve_oid || OID_P256;
	ret.curve = CURVES_BY_OID[curve_oid] || DEFAULT_CURVE;

	let xy = obj.publicKey.data.toString('hex');
	xy = remove_leading_00s(xy);							// leading 00s caused issues in DER packing, they must be removed
	const xy_len = Math.floor((xy.length - 2) / 2);			// should always be divisible by 2, but just in case use floor

	ret.pub_hex_xy = xy;
	ret.pub_hex_x = xy.substring(2, xy_len + 2);
	ret.pub_hex_y = xy.substring(xy_len + 2);

	return ret;
}

// convert the internal private key format back to one asn1 lib can ingest
function unfmtDecodedPubKey(obj: InPubFmt) {
	const ret: Puk = {
		paramWrap: {
			curveFamilyOid: splitOidStr(obj.curve_family_oid),
			curveOid: splitOidStr(obj.curve_oid),
		},
		publicKey: {
			data: build_raw_xy(obj),						// xy aka public key data is a bit string, so it has this nested "data" field, unlike privateKey
		}
	};
	return ret;
}


// ------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------- Signature Work ---------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------------
const DerEcdsaSignature = ASN1.define('EcdsaPrivateKey', function () {

	// this is type 48 = 0x30
	this.seq().obj(

		// this is type 2 - its "r", example: '008ADAAA46E13FF0F9E941ED62D29C66B51DC9782E5683C992322AEB0A97DFF808'
		this.key('r').int(),

		// this is type 2, its "s", example:'6D7EFCC59482B3E17014AFEED29C9B76F54D7EE667E86AB3F4C57CCDC2E2300F'
		this.key('s').int(),
	);
});

// pack DER attributes into a public or private PEM
function DER_parseSignature(sig_der: Uint8Array) {
	if (!sig_der) {
		logger.error('[stitch] cannot parse signature data. bad input, missing data', sig_der);
		return null;
	} else {
		try {
			const buff = Buffer.from(sig_der);
			const decoded_sig = DerEcdsaSignature.decode(buff);
			return fmtSignature(decoded_sig);
		} catch (e) {
			logger.error('[stitch] cannot decode signature. Signature is either malformed or of an unsupported type', e, sig_der);
			return null;
		}
	}
}

// pack raw R+S signature value into a DER format - returns real DER (Uint8Array)
function DER_packSignature(sig_obj: { r: Uint8Array, s: Uint8Array }) {
	try {
		const sig_der = DerEcdsaSignature.encode(fmtSignForPacking(sig_obj));
		return sig_der;
	} catch (e) {
		logger.error('[stitch] cannot encode signature. Signature is either malformed or of an unsupported structure', e, sig_obj);
		return null;
	}
}

// create internal structure for signature - r and s as Uint8Array
function fmtSignature(obj: { r: Buffer, s: Buffer }) {
	const ret: IntSig = {
		r: hexStrToUint8Array(obj.r.toString('hex')),
		s: hexStrToUint8Array(obj.s.toString('hex')),
	};
	return ret;
}

// format raw sig data as object that asn1 can ingest for packing signature DER
function fmtSignForPacking(sig_data: IntSig) {
	let sig_hex_r = uint8ArrayToHexStr(sig_data.r, true);
	let sig_hex_s = uint8ArrayToHexStr(sig_data.s, true);
	//console.log('sig_hex_r', sig_hex_r);
	//console.log('sig_hex_s', sig_hex_s);

	const r = new BN(sig_hex_r, 16);
	const s = new BN(sig_hex_s, 16);
	//console.log('r', r);
	//console.log('s', s);

	return {
		r: r,
		s: s
	};
}


// ------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------- Certificate Key Work ---------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------------
const InnerCert = ASN1.define('InnerCert', function () {
	this.key('certificate').seq().obj(
		this.key('version').explicit(0).int({
			0: '1',
			1: '2',
			2: '3'
		}),
		this.key('serialNumber').int(),
		this.key('signature').use(algWrap),
		this.key('issuer').use(Name),
		this.key('validity').seq().obj(
			this.key('notBefore').utctime(),
			this.key('notAfter').utctime()
		),
		this.key('subject').use(Name),
		this.key('publicKeyWrap').seq().obj(
			this.key('algorithm').use(algWrap),
			this.key('publicKey').bitstr()
		),
		this.key('issuerUniqueID').optional().implicit(1).bitstr(),
		this.key('subjectUniqueID').optional().implicit(2).bitstr(),
		this.key('extensions').optional().explicit(3).seqof(Extension)
	);
});
const DerEcdsaPubCertificate = ASN1.define('Certificate', function () {
	this.seq().obj(
		this.key('certificate').seq().obj(
			this.key('version').explicit(0).int({
				0: '1',
				1: '2',
				2: '3'
			}),
			this.key('serialNumber').int(),
			this.key('signature').use(algWrap),
			this.key('issuer').use(Name),
			this.key('validity').seq().obj(
				this.key('notBefore').utctime(),
				this.key('notAfter').utctime()
			),
			this.key('subject').use(Name),
			this.key('publicKeyWrap').seq().obj(
				this.key('algorithm').use(algWrap),
				this.key('publicKey').bitstr()
			),
			this.key('issuerUniqueID').optional().implicit(1).bitstr(),
			this.key('subjectUniqueID').optional().implicit(2).bitstr(),
			this.key('extensions').optional().explicit(3).seqof(Extension)
		),
		this.key('signatureAlgorithm').use(algWrap),
		this.key('signature').bitstr()
	);
});

// algorithm decoding
const algWrap = ASN1.define('algWrap', function () {
	this.seq().obj(
		this.key('curveFamilyOid').objid(OID_REVERSE_MAP),
		this.key('curveOid').optional().objid(),
		//this.key('space').optional().null_(),
	);
});

// name decoding
const Name = ASN1.define('Name', function () {
	this.choice({
		rdnSequence: this.seqof(RelativeDistinguishedName),
		any: this.any()		// fallback...
	});
});
const RelativeDistinguishedName = ASN1.define('RelativeDistinguishedName', function () {
	this.setof(Attribute);
});
const Attribute = ASN1.define('Attribute', function () {
	this.seq().obj(
		this.key('type').objid(OID_REVERSE_MAP),
		this.key('value').choice({
			utf8str: this.utf8str(),
			printstr: this.printstr(),
			any: this.any()
		}),
	);
});

// extension decoding
const Extension = ASN1.define('Extension', function () {
	this.seq().obj(
		this.key('extnID').objid(OID_REVERSE_MAP),
		this.key('critical').bool().def(false),
		this.key('extnValue').octstr().contains(function (obj: any) {
			if (obj.extnID === 'subjectAltName') {
				return SubjectAltName;
			}
			return ASN1.define('OctString', function () { this.any(); });
		})
	);
});
const SubjectAltName = ASN1.define('SubjectAltName', function () {
	this.seqof(ExtName);
});
const ExtName = ASN1.define('ExtName', function () {
	this.choice({
		rfc822: this.implicit(1).ia5str(),
		dns: this.implicit(2).ia5str(),
		dn: this.explicit(4).use(Name),
		uri: this.implicit(6).ia5str(),
		ip: this.implicit(7).octstr(),
		rid: this.implicit(8).objid()
	});
});

// convert asn1 lib output format to one a human can read (use hex strings instead of buffers)
function fmtDecodedPubCertificate(obj: { certificate: any }) {
	const ret: InPubFmt = {
		type: PUBLIC,										// what type of key the hex data describes
		cert_label: CERTIFICATE_LABEL,						// the label of the original PEM, such as -----BEGIN CERTIFICATE-----
		curve_family_oid: obj.certificate.publicKeyWrap.algorithm.curveFamilyOid.join('.'),
		curve_oid: '',
		curve: '',
		pub_hex_xy: '',
		pub_hex_x: '',
		pub_hex_y: '',
	};

	const curve_oid = obj.certificate.publicKeyWrap.algorithm.curveOid.join('.');
	ret.curve_oid = curve_oid || OID_P256;
	ret.curve = CURVES_BY_OID[curve_oid] || DEFAULT_CURVE;

	let xy = obj.certificate.publicKeyWrap.publicKey.data.toString('hex');
	xy = remove_leading_00s(xy);							// leading 00s caused issues in DER packing, they must be removed
	const xy_len = Math.floor((xy.length - 2) / 2);			// should always be divisible by 2, but just in case use floor

	ret.pub_hex_xy = xy;
	ret.pub_hex_x = xy.substring(2, xy_len + 2);
	ret.pub_hex_y = xy.substring(xy_len + 2);

	//console.log('pub key in cert:', ret);
	return ret;
}

// --------------------------------------------------------------------------------
// Other
// --------------------------------------------------------------------------------

// build a Buffer of x + y from the hex of x + y
function build_raw_xy(obj: { pub_hex_x: string, pub_hex_y: string }) {
	return Buffer.from('04' + obj.pub_hex_x + obj.pub_hex_y, 'hex');		// don't use "xy", field not always present. "x" & "y" will be
}

// take the oid string format and convert it to the  array of integers format for the asn1 lib
function splitOidStr(oid: string) {
	const parts = oid.split('.');
	const arr = [];
	for (let i in parts) {
		arr.push(Number(parts[i]));
	}
	return arr;
}

// parse a public or private PEM - returns our internal (friendly) DER object
// if given a certificate, will parse the public key out of it.
function DER_parsePem(pem: string) {
	try {
		if (pem.includes(PUBLIC_LABEL)) {
			const decoded_pub = DerEcdsaPublicKey.decode(pem, 'pem', { label: PUBLIC_LABEL });
			return fmtDecodedPubKey(decoded_pub);
		} else if (pem.includes(PRIVATE_LABEL)) {
			const decoded_prv = DerEcdsaPrivateKey.decode(pem, 'pem', { label: PRIVATE_LABEL });
			return fmtDecodedPrvKey(decoded_prv);
		} else if (pem.includes(CERTIFICATE_LABEL)) {
			const decoded_pub = DerEcdsaPubCertificate.decode(pem, 'pem', { label: CERTIFICATE_LABEL });
			return fmtDecodedPubCertificate(decoded_pub);
		} else {
			logger.error('[stitch] cannot parse. PEM is either malformed or of an unsupported type', pem);
			return null;
		}
	} catch (e) {
		logger.error('[stitch] cannot decode. PEM is either malformed or of an unsupported structure', e, pem);
		return null;
	}
}

// parse a certificate - returns all attributes we can currently decode
function DER_parseCertificate(pem: string, ) {
	try {
		if (pem.includes(CERTIFICATE_LABEL)) {
			const decoded_pub = DerEcdsaPubCertificate.decode(pem, 'pem', { label: CERTIFICATE_LABEL });
			return fmt(decoded_pub);
		} else {
			logger.error('[stitch] cannot parse certificate. PEM is either malformed or of an unsupported type', pem);
			return null;
		}
	} catch (e) {
		logger.error('[stitch] cannot decode certificate. PEM is either malformed or of an unsupported structure', e, pem);
		return null;
	}

	function fmt(obj: { certificate: any, signature: any, signatureAlgorithm: any, bin?: any }) {
		obj.certificate.issuer_orig = JSON.parse(JSON.stringify(obj.certificate.issuer));
		obj.certificate.subject_orig = JSON.parse(JSON.stringify(obj.certificate.subject));
		obj.certificate.extensions_orig = JSON.parse(JSON.stringify(obj.certificate.extensions));

		const bin_cert = InnerCert.encode(obj.certificate);			// we need the DER format of the inner certificate field

		obj.certificate.issuer = fmt_asn1_name('issuer', obj);
		obj.certificate.subject = fmt_asn1_name('subject', obj);
		obj.certificate.serialNumber = obj.certificate.serialNumber.toString('hex');
		obj.certificate.extensions = fmt_extn(obj);

		if (bin_cert) {
			obj.bin = {												// these fields are needed to verify the signature in the cert
				certificate: bin_cert,
				signature: obj.signature ? obj.signature.data : null,
			};
		}
		return obj;
	}

	function fmt_asn1_name(field_name: string, obj: { certificate: any }) {
		let str = '';

		if (obj.certificate[field_name]) {
			for (let i in obj.certificate[field_name].value) {
				for (let x in obj.certificate[field_name].value[i]) {
					if (obj.certificate[field_name].value[i][x] && obj.certificate[field_name].value[i][x].value) {
						const type = obj.certificate[field_name].value[i][x].type;
						let value = obj.certificate[field_name].value[i][x].value.value;
						if (obj.certificate[field_name].value[i][x].value.type === 'any') {		// fix strings we couldn't decode for some reason
							value = value.toString().substring(2);
						}
						const delim = (Number(x) === 0) ? '/' : '+';
						str += (delim + type + '=' + value);
					}
				}
			}
		}

		return str;
	}

	/* better format... will use legacy instead
	function fmt_extn(obj: { certificate: any }) {
		const ext: any = {};
		if (obj.certificate.extensions) {
			for (let i in obj.certificate.extensions) {
				if (obj.certificate.extensions[i].extnID) {
					const extnID = obj.certificate.extensions[i].extnID;
					ext[extnID] = '';						// init this extension id

					for (let x in obj.certificate.extensions[i].extnValue) {
						if (obj.certificate.extensions[i].extnValue[x]) {
							const type = obj.certificate.extensions[i].extnValue[x].type;
							const value = obj.certificate.extensions[i].extnValue[x].value;
							const delim = (Number(x) === 0) ? '/' : '+';
							ext[extnID] += (delim + type + '=' + value);
						}
					}
				}
			}
		}
		return ext;
	}*/

	// legacy format from jsrsasign
	function fmt_extn(obj: { certificate: any }) {
		const ext: any = {};
		if (obj.certificate.extensions) {
			for (let i in obj.certificate.extensions) {
				if (obj.certificate.extensions[i].extnID) {
					const extnID = obj.certificate.extensions[i].extnID;
					ext[extnID] = [];						// init this extension id

					for (let x in obj.certificate.extensions[i].extnValue) {
						if (obj.certificate.extensions[i].extnValue[x]) {
							const type = obj.certificate.extensions[i].extnValue[x].type;
							const value = obj.certificate.extensions[i].extnValue[x].value;
							if (type && value) {
								ext[extnID].push(type.toUpperCase());
								ext[extnID].push(value);
							}
						}
					}
				}
			}
		}
		return ext;
	}
}

// pack DER attributes into a public or private PEM - returns real PEM (string)
function DER_packPem(data_obj: any) {
	let pem: null | string = null;

	try {
		if (!data_obj) {
			logger.error('[stitch] cannot pack DER data. bad input. object is missing', data_obj);
		} else if (data_obj.type === PRIVATE) {
			const ans1Obj = unfmtDecodedPrvKey(data_obj);
			pem = DerEcdsaPrivateKey.encode(ans1Obj, 'pem', { label: PRIVATE_LABEL });
		} else if (data_obj.type === PUBLIC) {
			const ans1Obj = unfmtDecodedPubKey(data_obj);
			pem = DerEcdsaPublicKey.encode(ans1Obj, 'pem', { label: PUBLIC_LABEL });
		} else {
			logger.error('[stitch] cannot pack. der data is either malformed or of an unsupported type', data_obj);
		}
	} catch (e) {
		logger.error('[stitch] cannot encode. der data is either malformed or of an unsupported structure', e, data_obj);
	}

	return pem ? pem.trim() + '\n' : null;
}

// ----------------------------------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------- Certificate Signing Request Work (aka CSR) -------------------------------------------------
// ----------------------------------------------------------------------------------------------------------------------------------------------
const DerCsr = ASN1.define('DerCsr', function () {
	this.seq().obj(
		this.key('csr').seq().use(DerCri),
		this.key('signatureAlgWrap').seq().obj(
			this.key('alg').objid(),
		),
		this.key('sigDer').bitstr()
	);
});

const DerCri = ASN1.define('DerCri', function () {
	this.seq().obj(
		this.key('version').int(),
		this.key('params').seqof(paramWrap),
		this.key('publicKeyWrap').seq().obj(
			this.key('algorithm').use(algWrap),
			this.key('publicKey').bitstr()
		),
		this.key('requests').explicit(0).seq().optional().obj(
			this.key('reqOid').optional().objid(),
			this.key('reqWrap').optional().setof(extReqWrap)
		)
	);
});

const extReqWrap = ASN1.define('extReqWrap', function () {
	this.optional().seq().obj(
		this.key('extensions').seq().obj(
			this.key('extOid').objid().optional(),

			this.key('extWrap').octstr(
				this.key('extData').seqof(ExtName)
			),
		),
	);
});


const paramWrap = ASN1.define('paramWrap', function () {
	this.set(
		this.key('data').seq().obj(
			this.key('type').objid(),
			this.key('value').utf8str(),
		)
	);
});

// format data for CSR encoding (conform to an input the ASN1 lib can ingest)
/*
	opts = {
		subject: "CN=admin,O=IBM",
		private_key: {
			curve_family_oid: "",
			curve_oid: "",
			pub_hex_x: "",
			pub_hex_y: "",
			prv_hex_d: "",
		},
		public_key: {						// [optional]
			curve_family_oid: "",
			curve_oid: "",
			pub_hex_x: "",
			pub_hex_y: "",
		},
		ext: {
			subjectAltName: [
				{ dns: 'example.com' },
				{ dns: 'ibm.com' }
			]
		},
		sig_data: []
	}
*/
function fmtCsrData(opts: Csr) {
	const pub_hex_x = opts.private_key.pub_hex_x || (opts.public_key ? opts.public_key.pub_hex_x : null);
	const pub_hex_y = opts.private_key.pub_hex_y || (opts.public_key ? opts.public_key.pub_hex_y : null);
	const curve_family_oid = opts.private_key.curve_family_oid || (opts.public_key ? opts.public_key.curve_family_oid : null);
	const curve_oid = opts.private_key.curve_oid || (opts.public_key ? opts.public_key.curve_oid : '');

	const signature_der = build_signature_der(opts.sig_data);
	const csrObj = {
		csr: {
			version: new BN(0),								// version seems to always be 0
			params: build_attr_type(opts.subject),
			publicKeyWrap: {
				algorithm: {
					curveFamilyOid: curve_family_oid ? curve_family_oid.split('.') : [],
					curveOid: curve_oid.split('.')
				},
				publicKey: {
					data: Buffer.from('04' + pub_hex_x + pub_hex_y, 'hex'),
				}
			},
			requests: build_extension_request(opts.ext),
		},
		signatureAlgWrap: {

			// 1.2.840.10045.4.3.2 = Elliptic Curve Digital Signature Algorithm (DSA) coupled with the Secure Hash Algorithm 256 (SHA256) algorithm
			alg: [1, 2, 840, 10045, 4, 3, 2]				// we will use subtleSignMsg() which always uses "SHA-256", this is the OID for that
		},
		sigDer: signature_der ? { data: signature_der, unused: 0 } : new BN(0)		// bitstr wants this funky "data", "unused" syntax... took forever to find it
	};

	return csrObj;

	// build a csr signature - sig_data can be empty if we haven't built a raw signature yet
	function build_signature_der(sig_data: Uint8Array | null) {
		let sig_der = null;
		if (sig_data) {
			const sig_data_r = sig_data.slice(0, 32);
			const sig_data_s = sig_data.slice(32);
			const sig_hex_r = remove_leading_00s(uint8ArrayToHexStr(sig_data_r, true));	// the remove leading 00s is most likely important, but i'm not longer sure
			const sig_hex_s = remove_leading_00s(uint8ArrayToHexStr(sig_data_s, true));

			const sig_obj = {
				r: hexStrToUint8Array(sig_hex_r),
				s: hexStrToUint8Array(sig_hex_s)
			};
			sig_der = DER_packSignature(sig_obj);				// its critical that this starts with 0x03 (which is the type of a BIT STRING), 0x23 is an lib error
		}
		return sig_der;
	}

	// build the csr subject attribute section
	/*
		subject = "CN=admin,O=IBM"
	*/
	function build_attr_type(subject: string) {
		const ret = [];
		const parts = typeof subject === 'string' ? subject.split(',') : [];	// split orig string on the delimiter between attributes

		for (let i in parts) {
			const inner_parts = parts[i].split('=');			// split the flag string on the delimiter between attributes and value
			const attr_type = inner_parts[0];
			const value = inner_parts[1];

			if (typeof attr_type === 'string' && typeof value === 'string') {
				const oid: string = OID_MAP[attr_type.trim()];
				if (!oid) {
					logger.error('[stitch] unsupported subject attribute:', attr_type);
				} else {
					ret.push({
						data: {
							type: oid.split('.'),
							value: value.trim()
						}
					});
				}
			}
		}
		return ret;
	}

	// build the csr extension request section - only SANs is supported (subject alt name)
	/*
		ext = {									// [optional]
			subjectAltName: [
				{ dns: 'example.com' },
				{ dns: 'ibm.com' }
			]
		}
	*/
	function build_extension_request(ext: Ext | null) {
		const extData = (ext && ext.subjectAltName) ? build_subject_alt_names(ext.subjectAltName) : null;
		if (!extData) {
			return {};											// return empty object if there are no SANs, its optional
		} else {
			return {
				reqOid: OID_MAP['extensionRequest'].split('.'),	// the asn1 lib takes oids as an array of integers. each entry is 1 number in the orig string
				reqWrap: [{
					extensions: {
						extOid: OID_MAP['subjectAltName'].split('.'),
						extWrap: {
							extData: extData
						}
					}
				}]
			};
		}
	}

	// build subject alt name array
	// returns array of strings
	// returns null if unsupported attr
	/*
		arr = [
			{ dns: 'example.com' },
			{ dns: 'ibm.com' }
		]
	*/
	function build_subject_alt_names(arr: any[]) {
		const alts: any = [];
		const supported_types: any = Object.keys(P_TYPES);
		if (!Array.isArray(arr)) {
			logger.error('[stitch] invalid subjectAltName format. must be an array.');
		} else {
			for (let i in arr) {
				const type_name = Object.keys(arr[i])[0];

				if (!supported_types.includes(type_name)) {		// check if its a supported type
					logger.error('[stitch] unsupported subjectAltName type:', type_name);
					return null;
				} else {
					const fmt_value = (type_name === 'ip') ? build_byte_str(arr[i][type_name]) : arr[i][type_name];
					if (!fmt_value) {
						// error already logged
						return null;
					} else {
						alts.push({ type: type_name, value: fmt_value });
					}
				}
			}
		}
		return alts;
	}

	// build a byte string from the ip string
	function build_byte_str(ip_str: any) {
		let values = ip_str.split('.');									// remove dots from ip string
		let ip_as_raw_str = '';
		if (values.length !== 4) {
			logger.error('[stitch] ip is not ipv4. unsupported SANs extension:', ip_str);
			return null;
		}

		for (let x in values) {
			ip_as_raw_str += String.fromCharCode(values[x] & 255);		// get a utf8 character that represents the dec value of this number
		}
		return ip_as_raw_str;
	}
}

// the asn1 lib we are using is not the greatest, this function fixes some issues I found
// 2. fix the nested OCTECT STRING tag (when nesting a OCTECT STRING in a *unified* parent, the tag is 0x24... which is wrong. we want 0x04)
//		- this is the octstr in "extReqWrap" near "extWrap"
function fixCsr(raw: Buffer, input_opts: Csr) {
	let hex = raw.toString('hex');

	// fix 2
	hex = hex.toLowerCase().replace('0603551d1124', '0603551d1104');		// the OCTET STRING must be type 0x04, for some reason its coming in as 0x24
	return hexStrToUint8Array(hex);

	// find and replace a single type in a DER hex string
	/*
		opts = {
			orig_hex: "<hex string>",
			value: "ibm.com",			// this value's type will be replaced
			type_hex: "82"				// the type to use
		}
	*/
	/*function edit_hex(opts: { orig_hex: string, value: string, type_hex: string }) {
		let val_len = opts.value.length.toString(16);	// get the length of the value and convert the dec to hex
		if (val_len.length <= 1) {
			val_len = '0' + val_len;					// left pad a '0' if we need to
		}
		// false positives are extremely unlikely since we are looking for a specific type (OC) and an exact match on the value + length of value
		const find_hex = ('0C' + val_len + uint8ArrayToHexStr(utf8StrToUint8Array(opts.value), true)).toLowerCase();
		const fixed_hex = (opts.type_hex + val_len + uint8ArrayToHexStr(utf8StrToUint8Array(opts.value), true)).toLowerCase();
		// example:
		// opts.value = 'ibm.com' = '69626d2e636f6d'
		// opts.orig_hex = '0c0769626d2e636f6d' becomes '820769626d2e636f6d'
		return opts.orig_hex.toLowerCase().replace(find_hex, fixed_hex);
	}*/
}

// pack and sign the csr object into a PEM format - returns PEM (string)
function DER_signAndPackCsrPem(prvKeyPEM: string, csr_data: Csr, cb: Function) {
	const fmt_csr_without_sig = fmtCsrData(csr_data);
	const cri_der = DerCri.encode(fmt_csr_without_sig.csr);

	if (!cri_der) {
		logger.error('[stitch] unable to build der for csr. asn1 failure.');
		return cb({ function_name: 'DER_signAndPackCsrPem', error: true, stitch_msg: 'unable to build der for csr. asn1 failure.' });
	} else {
		let b_cri = fixCsr(cri_der, csr_data);						// fix it before we make the signature, so that we sign over the right data

		scSignPemRaw(prvKeyPEM, b_cri, (_: any, sig_data: Uint8Array) => {
			csr_data.sig_data = sig_data;

			const fmt_csr_with_sig = fmtCsrData(csr_data);
			const csr_der = DerCsr.encode(fmt_csr_with_sig);
			let b_csr = fixCsr(csr_der, csr_data);					// redo the type fix now that we have the signature (last time)
			const b64 = csr_der ? uint8ArrayToBase64(b_csr) : '';

			// wrap the der with the headers to make it a PEM
			const b64_parts = b64.match(/.{1,64}/g) || [];			// split every 64 characters
			const csr_pem = '-----BEGIN CERTIFICATE REQUEST-----\n' + b64_parts.join('\n') + '\n-----END CERTIFICATE REQUEST-----\n';
			return cb(null, csr_pem);
		});
	}
}


// --------------------------------------------------------------------------------
// Scratch Pad Area
// --------------------------------------------------------------------------------
/*
function asn1_test() {

	// test creating a key from raw data
	//const test_obj = buildPrvKeyObject('abcd', '0011', DEFAULT_CURVE);
	//console.log('test_obj', test_obj);
	//const test_der = DerEcdsaPrivateKey.encode(test_obj);
	//console.log('test_der !', test_der);
	//const b64 = uint8ArrayToBase64(test_der);
	//console.log('b64', b64);

	// test decoding a key from pem
	const priv_pem = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgTWrEyu35PEghRV2e
VQY+oy/zRaYWZG56PAcen3GRPaWhRANCAATe7dS9OxD2QiEVKf9AtTtsxkFKIjKM
6KkKfxF1O059EYlkJwCu7cOc1GenbFM+aWDyyup90dsGHfPsqsl+QGQw
-----END PRIVATE KEY-----`;
	const pub_pem = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE3u3UvTsQ9kIhFSn/QLU7bMZBSiIy
jOipCn8RdTtOfRGJZCcAru3DnNRnp2xTPmlg8srqfdHbBh3z7KrJfkBkMA==
-----END PUBLIC KEY-----`;

	// test private key stuff
	//const decoded = DerEcdsaPrivateKey.decode(priv_pem, 'pem', { label: PRIVATE_LABEL });
	//const fmt_decoded = fmtDecodedPrvKey(decoded);
	const fmt_decoded = <any>DER_parsePem(priv_pem);
	console.log('fmt_decoded', fmt_decoded, JSON.stringify(fmt_decoded, null, 2));

	const back = unfmtDecodedPrvKey(fmt_decoded);
	console.log('back?', back);

	// encode the json back into PEM
	//const encoded = DerEcdsaPrivateKey.encode(decoded, 'pem', { label: PRIVATE_LABEL });
	const encoded = DER_packPem(fmt_decoded);
	console.log('encoded', encoded);
	if (encoded === priv_pem) {
		console.log('same same - priv');
	} else {
		console.log('different - priv');
	}

	// test public key stuff
	console.log('\n------------------------');
	const decoded_pub = DerEcdsaPublicKey.decode(pub_pem, 'pem', { label: PUBLIC_LABEL });
	console.log('decoded_pub', decoded_pub);
	const fmt_decoded_pub = fmtDecodedPubKey(decoded_pub);
	console.log('fmt_decoded_pub', fmt_decoded_pub, JSON.stringify(fmt_decoded_pub, null, 2));

	//const back_pub = unfmtDecodedPubKey(fmt_decoded_pub);
	//console.log('back_pub?', back_pub);

	//const temp = decoded_pub.publicKey.data.toString('hex');
	//console.log('? temp', temp);
	//decoded_pub.publicKey.data = Buffer.from(temp, 'hex');
	//console.log('? buff', decoded_pub.publicKey.data);
	//let encoded_pub = DerEcdsaPublicKey.encode(decoded_pub, 'pem', { label: PUBLIC_LABEL });

	const encoded_pub = DER_packPem(fmt_decoded_pub);
	console.log('encoded_pub', encoded_pub);
	if (encoded_pub === pub_pem) {
		console.log('same same - pub');
	} else {
		console.log('different - pub');
	}

	// test signature der stuff
	console.log('\n------------------------');
	const key_pair = genKeyPair(null);
	const jwks = pem2jwks({ pubKeyPEM: key_pair.pubKeyPEM, prvKeyPEM: key_pair.prvKeyPEM });

	if (!jwks || !jwks.public) {
		console.error('failed to import key');
	} else {
		console.log('jwks public', jwks.public);
		console.log('jwks private', jwks.private);
		importJwkEcdsaKey(jwks.public, (_1: any, pubKeyCrypto: CryptoKey) => {
			console.log('crypto public key', pubKeyCrypto);

			// test signature 2
			const raw_msg = new Uint8Array([0x0, 0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7]);
			//sign(prvKeyPEM, raw, null, (_2: any, der: Uint8Array) => {
			scSignJwkRaw(<any>jwks.private, raw_msg, (_: any, new_sig: any) => {
				console.log('signature orig:', new_sig.length, new_sig);
				const pack_input = {
					r: new_sig.slice(0, 32),
					s: new_sig.slice(32),
				};
				const der = DER_packSignature(pack_input);
				//console.log('signature der:', der);
				console.log('signature b64:', uint8ArrayToBase64(der));

				const back2raw = <any>DER_parseSignature(der);
				console.log('back2raw:', back2raw);

				const raw_sig = new Uint8Array(back2raw.r.length + back2raw.s.length);
				raw_sig.set(back2raw.r);
				raw_sig.set(back2raw.s, back2raw.r.length);
				console.log('raw_sig:', raw_sig);

				subtleVerifySignature(pubKeyCrypto, raw_sig, raw_msg, (_3: any, valid: boolean) => {
					if (valid === true) {
						console.log('valid 1:', valid);
					} else {
						console.error('failed on first sig+validate', new_sig);
					}
				});
			});
		});
	}
}
*/

/*
function csr_test() {
	const csr_data = {
		subject: 'CN=admin,O=IBM,OU=client',
		private_key: {
			curve_family_oid: '1.2.840.10045.2.1',
			curve_oid: '1.2.840.10045.3.1.7',
			pub_hex_x: '1234',
			pub_hex_y: '5678',
			prv_hex_d: '901234',
		},
		ext: {
			subjectAltName: [
				{ dns: 'example.com' },
				{ dns: 'ibm.com' }
			]
		}
	};
	const test_obj2 = fmtCsrData(csr_data);
	const test_der2 = DerCsr.encode(test_obj2);
	console.log('test_der2 !', test_der2);
	const fixed = fixCsr(test_der2, csr_data);
	console.log('fixed !', fixed);
	if (fixed) {
		const b642 = uint8ArrayToBase64(fixed);
		console.log('b64 2', b642);
	}
}
*/

// Private Key format after ASN1 decoding the DER
interface Prk {
	version: number;
	paramWrap: {
		curveFamilyOid: number[];
		curveOid: number[];
	};
	keyWrap: {
		integer: number;
		privateKey: Buffer;
		publicKey: {
			data: Buffer;
		};
	};
}

// Internal Private Key Format (easier for a human to read)
interface InPrvFmt {
	type: string;
	cert_label: string;
	curve_family_oid: string;
	curve_oid: string;
	curve: string;
	pub_hex_xy?: string;
	pub_hex_x: string;
	pub_hex_y: string;
	prv_hex_d: string;
}

// Public Key format after ASN1 decoding the DER
interface Puk {
	paramWrap: {
		curveFamilyOid: number[];
		curveOid: number[];
	};
	publicKey: {
		data: Buffer;
	};
}

// Internal Private Key Format (easier for a human to read) - also used for certificates
interface InPubFmt {
	type: string;
	cert_label: string;
	curve_family_oid: string;
	curve_oid: string;
	curve: string;
	pub_hex_xy: string;
	pub_hex_x: string;
	pub_hex_y: string;
}

// Internal ECDSA Signature Format
interface IntSig {
	r: Uint8Array;
	s: Uint8Array;
}

// Internal csr format
interface Csr {
	subject: string;
	private_key: {
		curve_family_oid: string;
		curve_oid: string;
		pub_hex_x: string;
		pub_hex_y: string;
		prv_hex_d: string;
	};
	public_key: null | {			// [optional]
		curve_family_oid: string;
		curve_oid: string;
		pub_hex_x: string;
		pub_hex_y: string;
	};
	ext: Ext | null;				// [optional]
	sig_data: Uint8Array | null;
}

interface Ext {
	subjectAltName: StringObj[];
}

interface StringObj {
	[index: string]: string;
}
