# How to Use Stitch

### Usage
Add these three files to your webserver: `stitch-dependencies.min.js`, `stitch-main-min.js`, and `v2.0-protobuf-bundle.json`.
Include/link these two js files in your html: `stitch-dependencies.min.js` and `stitch-main-min.js` (example below).
These files can be found in the [dist](../dist/) folder.

_Optionally use the un-minified version `stitch-main.js` instead of `stitch-main-min.js` for verbose debugging._
```js
<script type="text/javascript" src="/dist/stitch-dependencies.min.js"></script>
<script type="text/javascript" src="/dist/stitch-main-min.js">
```
Access stitch javascript methods from the keyword `stitch` or `window.stitch`.
See examples below.

***
### Async Callback Notes:
All async callbacks will have this format:
```js
stitch.someStitchFunction(options, callback(error_object, response_object)=> {
	// On success: The first argument will be `null` and the second will be a response object.
	// On error: The first argument will be an error object and the second will be `null`.

	// The format of the error and response object is specific to each stitch function
});
```

### A - Misc Methods
1. [window.log.setLevel()](#window.log.setLevel)
2. [getLogger()](#getLogger)
3. [sortObjectOut()](#sortObjectOut)
4. [uint8ArrayToHexStr()](#uint8ArrayToHexStr)
5. [uint8ArrayToBase64()](#uint8ArrayToBase64)
6. [camelCase_2_underscores()](#camelCase_2_underscores)
7. [underscores_2_camelCase()](#underscores_2_camelCase)
8. [setTimeouts()](#setTimeouts)
9. [getTimeouts()](#getTimeouts)

### B - Crypto Misc Methods
1. [encrypt()](#encrypt) - *legacy*
2. [decrypt()](#decrypt) - *legacy*
3. [scEncrypt()](#scEncrypt)
4. [scDecrypt()](#scDecrypt)
5. [genKeyPair()](#genKeyPair) - *removed*
6. [sign()](#sign) - *removed*
7. [verifySignature()](#verifySignature) - *legacy*
8. [genCSR()](#genCSR) - *legacy*
9. [parseCertificate()](#parseCertificate)
10. [isTrustedCertificate()](#isTrustedCertificate)
11. [mapCertificatesToRoots()](#mapCertificatesToRoots)
12. [scGenEcdsaKeys()](#scGenEcdsaKeys)
13. [scSign()](#scSign)
14. [scSignPemRaw()](#scSignPemRaw)
15. [scVerifySignature()](#scVerifySignature)
16. [scGenCSR()](#scGenCSR)
17. [validatePrivateKey()](#validatePrivateKey)
18. [validatePublicKey()](#validatePublicKey)
19. [validateCertificate()](#validateCertificate)

### C - Fabric lscc Methods (Fabric v1.x)
1. [getInstalledChaincode()](#getInstalledChaincode)
2. [installChaincode()](#installChaincode)
3. [getInstantiatedChaincode()](#getInstantiatedChaincode)
4. [getChaincodeDetailsFromPeer()](#getChaincodeDetailsFromPeer)
5. [checkIfChaincodeExists()](#checkIfChaincodeExists)
6. [instantiateChaincode()](#instantiateChaincode)
7. [upgradeChaincode()](#upgradeChaincode)

### D - Fabric _lifecycle Methods (Fabric v2.x)
1. [lc_installChaincode()](#lc_installChaincode)
2. [lc_getInstalledChaincodeData()](#lc_getInstalledChaincodeData)
3. [lc_getAllInstalledChaincodeData()](#lc_getAllInstalledChaincodeData)
4. [lc_getInstalledChaincodePackage()](#lc_getInstalledChaincodePackage)
5. [lc_approveChaincodeDefinition()](#lc_approveChaincodeDefinition)
6. [lc_checkChaincodeDefinitionReadiness()](#lc_checkChaincodeDefinitionReadiness)
7. [lc_commitChaincodeDefinition()](#lc_commitChaincodeDefinition)
8. [lc_getChaincodeDefinitionOnChannel()](#lc_getChaincodeDefinitionOnChannel)
9. [lc_getAllChaincodeDefinitionsOnChannel()](#lc_getAllChaincodeDefinitionsOnChannel)

### E - Fabric CA Methods
1. [getCaIdentities()](#getCaIdentities)
2. [getCaAffiliations()](#getCaAffiliations)
3. [registerCaIdentity()](#registerCaIdentity)
4. [enrollCaIdentity()](#enrollCaIdentity)
5. [reenrollCaIdentity()](#reenrollCaIdentity)
6. [deleteCaIdentity()](#deleteCaIdentity)

### F - Other Fabric Methods
1. [getChannelsOnPeer()](#getChannelsOnPeer)
2. [getChannelConfigFromPeer()](#getChannelConfigFromPeer)
3. [getChannelConfigBlockFromOrderer()](#getChannelConfigBlockFromOrderer)
4. [getChannelInfoFromPeer()](#getChannelInfoFromPeer)
5. [getChannelsGenesisFromOrderer()](#getChannelsGenesisFromOrderer)
6. [joinPeerToChannel()](#joinPeerToChannel)
7. [getChannelBlockFromPeer()](#getChannelBlockFromPeer)
8. [parseChaincodePackage()](#parseChaincodePackage)
9. [pbToJson()](#pbToJson)
10. [getTransactionById()](#getTransactionById)
11. [buildConfigUpdateTemplateNewChannel()](#buildConfigUpdateTemplateNewChannel)
12. [configUpdateJsonToBinary()](#configUpdateJsonToBinary)
13. [configUpdateBinaryToJson()](#configUpdateBinaryToJson)
14. [signConfigUpdate()](#signConfigUpdate)
15. [submitConfigUpdate()](#submitConfigUpdate)
16. [buildSigCollectionAuthHeader()](#buildSigCollectionAuthHeader)
17. [calculateConfigUpdatePb()](#calculateConfigUpdatePb)
18. [getChannelBlockFromOrderer()](#getChannelBlockFromOrderer)
19. [conformPolicySyntax()](#conformPolicySyntax)
20. [convertPolicy2PeerCliSyntax()](#convertPolicy2PeerCliSyntax)
21. [policyIsMet()](#policyIsMet)
22. [decodeBlockV2()](#decodeBlockV2)

### G - Fabric Ordering Service Node Admin Methods - aka osnadmin
1. [getOSNChannels()](#getOSNChannels)
2. [getOSNChannel()](#getOSNChannel)
3. [joinOSNChannel()](#joinOSNChannel)
4. [unjoinOSNChannel()](#unjoinOSNChannel)

### Common Flows
1. [Create a channel](#createChannel)
2. [Create a channel w/osnadmin](#createChannelOSN)
3. [Add orderer consenter](https://github.ibm.com/IBM-Blockchain/athena/blob/master/docs/raft_append_notes.md)


***
# A - Misc Methods


<a name="window.log.setLevel"></a>

### A1. window.log.setLevel()
Change the log level via [loglevel](https://github.com/pimterry/loglevel).
When set to `debug` it will degrade performance.
It expects an integer which represents a level, see list below.
The set number and higher numbers will be able to log.
- error -   `4`
- warning - `3`
- info  -   `2` (recommended)
- debug -   `1`
- trace -   `0`

**Syntax**:
```js
window.log.setLevel(1); // turns on debug, info, warning, and error logs
window.log.setLevel(2); // turns on info, warning, and error logs
```

**Response Format**: `null`


<a name="getLogger"></a>

### A2. getLogger()
This will return a [loglevel](https://github.com/pimterry/loglevel) logger if available.
Else it will return the standard console as a fallback.

**Syntax**:
```js
const logger = stitch.getLogger();
logger.info('oh. an information message');
logger.debug('look! a debug message');
logger.warn('uh oh, a warning message');
logger.error('shit. an error message');
```

**Response Format**: `<logger object>`


<a name="sortObjectOut"></a>

### A3. sortObjectOut()
Recursively sort an object's keys.
Uppercase is first.

**Syntax**:
```js
const a_mess = {
	aaa: 'first',
	ccc: 'third',
	bbb: 'second',
	d: {
		g: 'sixth',
		f: 'fifth',
		e: 'fourth',
	},
	AA: ['arrays', 'are', 'left', 'alone', 'batman']
};
const ordered = stitch.sortObjectOut(a_mess);
console.log(ordered);
/* prints:
 {
  "AA": ["arrays", "are", "left", "alone", "batman"],
  "aaa": "first",
  "bbb": "second",
  "ccc": "third",
  "d": {
    "e": "fourth",
    "f": "fifth",
    "g": "sixth"
  }
}
*/
```

**Returns**:
`<ordered object>`


<a name="uint8ArrayToHexStr"></a>

### A4. uint8ArrayToHexStr()
Convert binary (Uint8Array) to a hex string.

**Syntax**:
```js

// [required] raw/binary data
const bin = new Uint8Array([104, 101, 108, 108, 111]);

// [optional] defaults false. if false every 2 characters of hex will have a space
const noWhiteSpace = false;

const hex_string = stitch.uint8ArrayToHexStr(bin, noWhiteSpace);
```

**Returns**:
`"68 65 6C 6C 6F"`


<a name="uint8ArrayToBase64"></a>

### A5. uint8ArrayToBase64()
Convert binary (Uint8Array) to a base 64 string.

**Syntax**:
```js
const bin = new Uint8Array(
	[100,97,118,105,100,32,119,97,115,32,104,101,114,101]
);
const b64 = stitch.uint8ArrayToBase64(bin);
```

**Returns**:
`"ZGF2aWQgd2FzIGhlcmU="`


<a name="camelCase_2_underscores"></a>

### A6. camelCase_2_underscores()
Convert an object that uses camelCase fields to underscore fields.
This will help convert fabric block data stitch uses internally to a format configtxlator understands.
PascalCase is left alone b/c that's how fabric wants it.

**Syntax**:
```js
const fmt = stitch.camelCase_2_underscores({thisIsJustATest: { meToo: false, PascalCaseLeftAlone: true}});
```

**Returns**:
`{this_is_just_a_test: { me_too: false, PascalCaseLeftAlone: true}`


<a name="underscores_2_camelCase"></a>

### A7. underscores_2_camelCase()
Convert an object that uses underscores back to camelCase fields.

**Syntax**:
```js
const fmt = stitch.underscores_2_camelCase({this_is_just_a_test: { me_too: false, PascalCaseLeftAlone: true);
```

**Returns**:
`{thisIsJustATest: { meToo: false, PascalCaseLeftAlone: true}}`


<a name="setTimeouts"></a>

### A8. setTimeouts()
Take control over default client side timeout values for Fabric transactions.
Set the values you want to change, the existing timeouts will be left as is.

The response contains the complete list of timeout values.

*Note that all Stitch Fabric methods take a "timeout_ms" parameter allowing you to override the timeout in each call.*
*This function provides a way to set a timeout once (which will work for all future calls in the session).*

**Syntax**:
```js
// keys in options are not case sensitive
// so `fabric_get_block_timeout_ms` & `FABRIC_GET_BLOCK_TIMEOUT_MS` will work
const options = {
	// change the default timeout for a get-block fabric request
	// defaults 10 sec
	fabric_get_block_timeout_ms: 10000,

	// change the default timeout for a instantiate fabric request	(Fabric 1.x)
	// defaults 5 min
	fabric_instantiate_timeout_ms: 300000,

	// change the default timeout for the join channel fabric request
	// defaults 25 sec
	fabric_join_channel_timeout_ms: 25000,

	// change the default timeout for the install chaincode fabric request (Fabric 1.x)
	// defaults 1.5 min
	fabric_install_cc_timeout_ms: 90000,

	// change the default timeout for the install chaincode fabric request (Fabric 2.x)
	// defaults 3 min
	fabric_lc_install_cc_timeout_ms: 180000

	// change the default timeout for a get chaincode package fabric request (Fabric 2.x)
	// defaults 3 min
	fabric_lc_get_cc_timeout_ms: 180000

	// change the default timeout for all other fabric requests not described above
	// defaults 10 sec
	fabric_general_timeout_ms: 10000
};
const timeouts = stitch.setTimeouts(options);
```

**Returns**:
```js
// all times are in milliseconds
{
	"fabric_get_block_timeout_ms": 10000,
	"fabric_instantiate_timeout_ms": 300000,
	"fabric_join_channel_timeout_ms": 25000,
	"fabric_install_cc_timeout_ms": 90000,
	"fabric_general_timeout_ms": 10000
}
```


<a name="getTimeouts"></a>

### A9. getTimeouts()
Returns the current default client side timeout values for Fabric transactions.

**Syntax**:
```js
const timeouts = stitch.getTimeouts();
```

**Returns**:
```js
// all times are in milliseconds
{
	"fabric_get_block_timeout_ms": 10000,
	"fabric_instantiate_timeout_ms": 300000,
	"fabric_join_channel_timeout_ms": 25000,
	"fabric_install_cc_timeout_ms": 90000,
	"fabric_lc_install_cc_timeout_ms": 180000,
	"fabric_general_timeout_ms": 10000,
	"fabric_lc_get_cc_timeout_ms": 180000
}
```





***
### B - Crypto Misc Methods


<a name="encrypt"></a>

### B1. encrypt()
Performs AES encryption on a string.
Mode: `CBC`, Padding: `PKCS7`.
Returns a hex string.

**This function is replaced by [scEncrypt](#scEncrypt)**

**Syntax**:
```js
const encrypted = stitch.encrypt('bombs away buddy', 'i am a secret');
```

**Returns**:
`"410b4f2b914d3459bb6fb058d6063887139cb4897aaea10a20654dc528161a92"`


<a name="decrypt"></a>

### B2. decrypt()
Performs AES decryption on a string. Mode: `CBC`, Padding: `PKCS7`.

**This function is replaced by [scDecrypt](#scDecrypt)**

**Syntax**:
```js
const decrypted = stitch.decrypt('410b4f2b914d3459bb6fb058d6063887139cb4897aaea10a20654dc528161a92', 'i am a secret');
console.log(decrypted);
// prints: "bombs away buddy"

```

**Returns**:
`<decrypted string>`


<a name="scEncrypt"></a>

### B3. scEncrypt()
Performs AES encryption on a string.
Returns a hex string.
Uses SubtleCrypto https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt.

The move to subtle crypto made this aes function async.
Also the actual encryption key is no longer passed in.
This function will use or generate an encryption key for the user.
The key is stored in local storage as `ibp_aes_key_<user>`.
It is not necessary for anyone to access the aes key except stitch.

**Syntax**:
```js
/*
	`msg` - is the string to encrypt
	`user` - is usually an email, its used to lookup or create an aes key
*/
stitch.scEncrypt({ msg: 'bombs away buddy', user: 'me@ibm.com' }, (error, encrypted) => {
	// your callback code here - see format of `encrypted` below
});
```

**Response**:
```js
// error
error = `DOMException`
encrypted = null;

// success - hex string with a "v2." prefix
encrypted = "v2.43ECB1EF1A966D7CE279D351CF3EA21FA9C980DF50D8E0B8DD1F88940F308EDE";
```


<a name="scDecrypt"></a>

### B4. scDecrypt()
Performs AES decryption on a string.
Returns original string.
Uses SubtleCrypto https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/decrypt.

The move to subtle crypto made this aes function async.
Also the actual encryption key is no longer passed in.
This function will use or generate an encryption key for the user.
The key is stored in local storage as `ibp_aes_key_<user>`.
It is not necessary for anyone to access the aes key except stitch.

If the decryption fails, the [legacy decryption](#decrypt) will be tried.

**Syntax**:
```js
const opts = {
	data: 'v2.43ECB1EF1A966D7CE279D351CF3EA21FA9C980DF50D8E0B8DD1F88940F308EDE',
	user: 'me@ibm.com'
};
stitch.scDecrypt(opts, (error, decrypted) => {
	// your callback code here - see format of `decrypted` below
});
```

**Response**:
```js
// error
error = `DOMException`
decrypted = null;

// success
decrypted = "bombs away buddy";
```


<a name="genKeyPair"></a>

### B5. genKeyPair()
`removed in v1.0.1` - use [scGenEcdsaKeys](#scGenEcdsaKeys) instead.<br/>
See [v1 changes](./v1_changes.md) for more details.


<a name="sign"></a>

### B6. sign()
`removed in v1.0` - use [scSign](#scSign) instead.<br/>
See [v1 changes](./v1_changes.md) for more details.


<a name="verifySignature"></a>

### B7. verifySignature()
`removed in v1.0` - use [scVerifySignature](#scVerifySignature) instead.<br/>
See [v1 changes](./v1_changes.md) for more details.


<a name="genCSR"></a>

### B8. genCSR()
`removed in v1.1.0` - use [scGenCSR](#scGenCSR) instead.<br/>
See [v1 changes](./v1_changes.md) for more details.

**Syntax**:
```js
const opts: {
	client_prv_key_b64pem: "string",      // base 64 encoded PEM
	client_pub_key_b64pem: "string",      // base 64 encoded PEM
	subject_dn: "O=Test,C=US,CN=example.com",  // the subject distinguished name
	sans_arr: [          // [optional] array of Subject Alt Names in the format [{ <type>: <value> }]
		{ dns: "example.com" },    // type is commonly "dns"
		{ dns: "ibm.com" }
	]
}
stitch.genCSR(opts);
```

**Returns**:
```
-----BEGIN CERTIFICATE REQUEST-----
MIG5MGICAQAwADBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABOD5uIXD6zEbnfqO
3qyBdBAe3CpjQxbpTk0kItAD+zq7PW9E8MCwQow5/28gREsXvXIxfhx4JpFlnY+X
NclrNC+gADAKBggqhkjOPQQDAgNHADBEAiBoXKnHhH+sBztNa+13esuETb88FKSL
aqXSK7Llj5AStgIgUbsMkXfkeqb9SaT9xbij51u4ddqmP3nntdTUAhhH2vA=
-----END CERTIFICATE REQUEST-----
```



<a name="parseCertificate"></a>

### B9. parseCertificate()
Parse a PEM or base 64 encoded PEM certificate. Returns the certificate's info such as the subject string, expiration, issuer, etc.

**Syntax**:
```js
const pubCertPEMb64 = 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tDQpNSUlCNnpDQ0FaS2dBd0lCQWdJVVVacTIrbjgyWTZUaFNHdnFkNHpkSFJabHh0Z3dDZ1lJS29aSXpqMEVBd0l3DQphREVMTUFrR0ExVUVCaE1DVlZNeEZ6QVZCZ05WQkFnVERrNXZjblJvSUVOaGNtOXNhVzVoTVJRd0VnWURWUVFLDQpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVJrd0Z3WURWUVFERXhCbVlXSnlhV010DQpZMkV0YzJWeWRtVnlNQjRYRFRFNU1EWXlOakU1TVRrd01Gb1hEVEl3TURZeU5URTVNalF3TUZvd0lqRVBNQTBHDQpBMVVFQ3hNR1kyeHBaVzUwTVE4d0RRWURWUVFEREFadmNtZGZhV1F3V1RBVEJnY3Foa2pPUFFJQkJnZ3Foa2pPDQpQUU1CQndOQ0FBUzBtQmZwUG1GSC9JUmV4enJoRVRWcFhnQ08yOU1lM1JKa3ZzTE43OG54b0VQYUM1ODhLWFQ5DQpDUmllcU1SR3JLenduWDkrWkdqQmtUbGZKRlVEVkJpcG8yQXdYakFPQmdOVkhROEJBZjhFQkFNQ0I0QXdEQVlEDQpWUjBUQVFIL0JBSXdBREFkQmdOVkhRNEVGZ1FVVC9iL3JFczJ5WUR2eGNCb0Z1eHZkUW5UMHkwd0h3WURWUjBqDQpCQmd3Rm9BVW13ckpEKytHendrMTg1M0JaelBuUlRMazNra3dDZ1lJS29aSXpqMEVBd0lEUndBd1JBSWdib1QrDQpRWm9RcWFXSmdxQmhrTDA4WUJJWU9DSFVkUUdwckp0TXpnWXB1cXdDSUVjZ3hHRGRyUlU4UytWU0xGak4zQ0lJDQpqTnVSUzZjazhiNHBxL3Z3UUQyOA0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQ0K';
const parsed = stitch.parseCertificate(pubCertPEMb64);  // pass a string
```

**Returns**:
```js
// [Error]
// will return null on invalid certs or any parsing error
parsed = null;

// [Success]
parsed = {
  // this pem field is always base 64 encoded regardless of what was passed in
  // it is also made safe by enforcing a new line at the end and by removing empty new lines throughout
  "base_64_pem": "<base 64 encoded pem - would be here, removed to keep readme short>",

  // issuer name as string
  "issuer": "/C=US/ST=North Carolina/O=Hyperledger/OU=Fabric/CN=fabric-ca-server",

  // utc unix timestamp of expiration (ms)
  "not_after_ts": 1593113040000,

   // utc unix timestamp of valid start ts (ms)
  "not_before_ts": 1561576740000,

  // a unique number per cert per issuer (assigned by CA)
  "serial_number_hex": "519ab6fa7f3663a4e1486bea778cdd1d1665c6d8",

  // the alg the PEM is signed with
  "signature_algorithm": "SHA256withECDSA",

  // subject string provided as is
  "subject": "/OU=client/CN=org_id",

  // subject string parsed into object, exists if available
  "subject_parts": {
    "CN": "org_id",
    "OU": "client"
  },

  // subject alt names listed as array of strings, exists if available
   "subject_alt_names": [
      "-"
  ],

  // friendly version of the remaining time this cert is still valid
  // time_left = (not_after_ts - Date.now())
  "time_left": "273.2 days",

  // the X.509 version/format of the PEM
  "X509_version": 3
}
```





<a name="isTrustedCertificate"></a>

### B10. isTrustedCertificate()
Callback contains `true` if the certificate provided was signed by one of the provided root certs.
Each root certificate can be a certificate chain or individual cert.

**Syntax**:
```js
let trust_opts = {

	// the identity's certificate, base 64 encoded PEM
	certificate_b64pem: my_identity_cert,

	// array of root certificates, each are base 64 encoded PEM
	// if there is only 1 root cert, the `root_certs_b64pems` parameter still expects an array of 1.
	root_certs_b64pems: [my_ca_root_cert1, my_ca_root_cert2],
}
const matches = stitch.isTrustedCertificate(trust_opts ,(_, validity)=>{
	// your callback code here - see format of `keys` below
});
```

**Response**:
```js
// error
validity = false;

// success
validity = true;
```


<a name="mapCertificatesToRoots"></a>

### B11. mapCertificatesToRoots()

Figure out who signed what.
Takes in "regular" certificates (like from a CA identity) and root certificates (like the CA's root cert).
Returns an object with an array of the regular certs objects.
Inside each regular cert object contains the serial of the root that signed this certificate.

**Syntax**:
```js
const match_opts = {

	// required
	// array of "regular" certificates to work
	certificate_b64pems: [
		'<base 64 pem of a cert - serial aaa>',
		'<base 64 pem of a cert - serial bbb>',
		'<base 64 pem of a cert - serial ccc>',
	],

	// required
	// array of root certificates to check against
	root_certs_b64pems: [
		'<base 64 pem of a cert - serial 111>',
		'<base 64 pem of a cert - serial 222>',
		'<base 64 pem of a cert - serial 333>',
	]
};
stitch.mapCertificatesToRoots(match_opts, (_, results)=>{

});
```

**Returns**:
```js
 {
  "certificate_results": [

      // example when the cert aaa was signed by root cert 111
      {
        "cert_serial": "aaa",
        "signed_by_root_serial": "111"
      }

      // example when the cert bbb was not signed by any provided certs
      {
        "cert_serial": "bbb",
        "signed_by_root_serial": "no-matches"
      },

      // example when the cert ccc was signed by root cert 333
      {
        "cert_serial": "ccc",
        "signed_by_root_serial": "333"
      }
  ]
}
```


<a name="scGenEcdsaKeys"></a>

### B12. scGenEcdsaKeys()
Create a cryptographic private & public key pair using subtle crypto.
Uses algorithm `ECDSA` and format `#PKCS8` PEM.
Curve parameter is optional.
Returns base 64 encoded PEMs as well as the native PEM format.
Uses SubtleCrypto https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/generateKey.

**Syntax**:
```js
/*
	curve - [optional] curve name parameter, defaults to 'P-256'
*/
const keys = stitch.scGenEcdsaKeys(curve, (_, keys) => {
	// your callback code here - see format of `keys` below
});
```

**Response**:
```js
keys = {
	"pubKeyPEM": "<PEM format>",
	"prvKeyPEM": "<PEM format>",
	"pubKeyPEMb64": "<base 64 encoded PEM, public key>",
	"prvKeyPEMb64": "<base 64 encoded PEM, private key>",
}
```


<a name="scSign"></a>

### B13. scSign()
Sign a binary (Uint8Array) with a base 64 encoded private key (PEM).
Returns a signature in **DER format** (array of integers).
Uses SubtleCrypto https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/sign.

**Syntax**:
```js
/*
	prvKeyPEM - base 64 encoded PEM private key (un-encoded PEM also supported)
	data - the data/payload to sign
*/
const data = new Uint8Array([0, 1, 2, 3, 4, 5, 6 , 7]);
stitch.scGenEcdsaKeys(null, (_, keys) => {
	stitch.scSign({prvKeyPEM: keys.prvKeyPEMb64, data: data}, (_, signature) => {
		// your callback code here - see format of `signature` below
	});
});
```

**Response**:
```js
// error
signature = null;

// success
signature = Array(71) [ 48, 69, 2, 33, 0, 141, 105, 77, 86, 50, … ] // (DER)
```


<a name="scSignPemRaw"></a>

### B14. scSignPemRaw()
Sign a binary (Uint8Array) with a private key (PEM).
Returns the raw signature, which is R + S.
This is **not** the same as DER.
Uses SubtleCrypto https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/sign.

This signing method is **not** recommended. Use [scSign](#scSign) instead which will provide a DER encoded format.

**Syntax**:
```js
/*
	pubKeyPEMb64 - base 64 encoded PEM public key
	data - the data/payload to sign
*/
const data = new Uint8Array([0, 1, 2, 3, 4, 5, 6 , 7]);
stitch.scGenEcdsaKeys(null, (_, keys) => {
	stitch.scSignPemRaw(keys.pubKeyPEMb64, data, null, (_, signature) => {
		// your callback code here - see format of `signature` below
	});
});
```

**Response**:
```js
// error
signature = null;

// success
signature = Array(68) [ 141, 105, 77, 86, 50, … ] // (raw)
```


<a name="scVerifySignature"></a>

### B15. scVerifySignature()
Verify a signature came from the pub/private key pair.
The signature must be provided in the DER format (the raw signature is not supported).
Async response is `true` if signature is valid.
Uses SubtleCrypto https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/verify.

**Syntax**:
```js
/*
	certificate_b64pem - base 64 encoded PEM cert, or regular cert
	der_sig - the signature in the DER format
	b_msg - the data/payload that was signed as a typed array
*/
const data = 'the cloud people will rule us all';
const raw_msg = stitch.utf8StrToUint8Array(data);

// generate keys
stitch.scGenEcdsaKeys(null, (_, key_pair) => {

	// make a signature
	stitch.scSign({prvKeyPEM: key_pair.prvKeyPEMb64, data: raw_msg}, (_, der_signature) => {

		// verify DER signature
		const opts = {
			certificate_b64pem: key_pair.pubKeyPEMb64,
			der_sig: der_signature,
			b_msg: raw_msg
		};
		stitch.scVerifySignature(opts, (_, valid) => {
			// your callback code here - see format of `valid` below
		});
	});
});
```

**Response**:
```js
// error
valid = false;

// success
valid = true;
```


<a name="scGenCSR"></a>

### B16. scGenCSR()
Create a Certificate Signing Request using subtle crypto for the signature.
Async response is the CSR PEM as a string.
Uses `scSign()` for the CSR signature.

**Syntax**:
```js
const opts: {

	// base 64 encoded PEM
	client_prv_key_b64pem: "string",

	 // base 64 encoded PEM
	client_pub_key_b64pem: "string",

	// the subject distinguished name
	// format: <flag1>=<value1>,<flag2=<value2>
	// list of supported subject flags is extensive...
	// check code in `asn1_lib.ts` around fmtCsrData(), line 530ish, keys in object OID_MAP
	// use of unsupported flags will return error
	subject: "O=Test,C=US,CN=example.com",

	 // [optional] - the only supported extension is subject alt name
	ext: {

		// array of SANs aka "Subject Alt Names"
		// format [{ <type>: <value> }]
		// supported types: "dns", "rfc822", "dn", "uri", "ip", "rid"
		subjectAltName: [
			{ dns: 'example.com' },
			{ dns: 'ibm.com' }
		]
	}
}
stitch.scGenCSR(opts, (_, csrPEM) => {
	// your callback code here - see format of `csrPEM` below
});
```

**Response**:
```js
// error
csrPEM = null;

// success
csrPEM = `
-----BEGIN CERTIFICATE REQUEST-----
MIG5MGICAQAwADBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABOD5uIXD6zEbnfqO
3qyBdBAe3CpjQxbpTk0kItAD+zq7PW9E8MCwQow5/28gREsXvXIxfhx4JpFlnY+X
NclrNC+gADAKBggqhkjOPQQDAgNHADBEAiBoXKnHhH+sBztNa+13esuETb88FKSL
aqXSK7Llj5AStgIgUbsMkXfkeqb9SaT9xbij51u4ddqmP3nntdTUAhhH2vA=
-----END CERTIFICATE REQU`EST-----`;
```


<a name="validatePrivateKey"></a>

### B17. validatePrivateKey()
Validates a private key PEM string by parsing its DER data.

**Syntax**:
```js
/*
	private_key_b64pem = "<PEM or Base 64 encoded PEM>"
*/
const valid = stitch.validatePrivateKey(private_key_b64pem);
```

**Returns**:
```js
valid = true || false
```


<a name="validatePublicKey"></a>

### B18. validatePublicKey()
Validates a public key PEM string by parsing its DER data.

**Syntax**:
```js
/*
	public_key_base64_pem = "<PEM or Base 64 encoded PEM>"
*/
const valid = stitch.validatePublicKey(public_key_base64_pem);
```

**Returns**:
```js
valid = true || false
```


<a name="validateCertificate"></a>

### B19. validateCertificate()
Validates a public certificate PEM string by parsing its DER data.

**Syntax**:
```js
/*
	cert_base64_pem = "<PEM or Base 64 encoded PEM>"
*/
const valid = stitch.validateCertificate(cert_base64_pem);
```

**Returns**:
```js
valid = true || false
```





***

# C - Fabric lscc Methods (Fabric v1.x)

<a name="getInstalledChaincode"></a>

### C1. getInstalledChaincode()
This method will return a list of installed chaincode.

**Syntax**:
```js
const opts = {
	msp_id: "PeerOrg1",	   //  msp id to use
	client_cert_b64pem: "string", // the org's signed cert in a base 64 encoded PEM format
	client_prv_key_b64pem: "string", // the orgs private key in a base 64 encoded PEM format
	host: "http://peer_url.com:8080", // *grpc-web* url to peer. include proto & port
	timeout_ms: 10000,     // [optional] client timeout override for this request, defaults 10sec
};
stitch.getInstalledChaincode(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	    // true if the call encountered an error, else false
	msp_id: "PeerOrg1",    // same msp id provide in input args
	host: "http://peer_url.com:8080", // the "host" used for this call
	data: {	            // the response, not available if "error" is true
		chaincodesList: [{  // decoded "ChaincodeQueryResponse"
			escc: "",     // name of the endorsement system cc
			id: ""​​​​,       // internal chaincode id
			input: ""​​​​,    // ?
			name: "",​​​     // chaincode id
			path: "",     // chaincode path
			version: ""​​,​  // chaincode version
			vscc: "",     // name of verification system cc to be used
		}],
	},
	stitch_msg: "ok"       // error/success message for your req
	grpc_resp: {
		status: 0,   // status code from the grpc call
		statusMessage: "", // status message from the grpc call
		headers: {},  // headers in the grpc response
		message: {},  // "ChaincodeQueryResponse" protobuf
		trailers: {}  // trailers in the grpc response
	},
}
```


<a name="installChaincode"></a>

### C2. installChaincode()
This method will return install chaincode on a peer.
The certificate used must be installed on the peer.

**Syntax**:
```js
const opts = {
	msp_id: "PeerOrg1",	   //  msp id to use
	client_cert_b64pem: "string", // the org's signed cert in a base 64 encoded PEM format
	client_prv_key_b64pem: "string", // the orgs private key in a base 64 encoded PEM format
	host: "http://peer_url.com:8080", // *grpc-web* url to peer. include proto & port

	 // binary data of the chaincode package. use the peer's cli to <Uint8Array>
	chaincode_package: cdp
	// example command to build cc package:
	// >    peer chaincode package -l golang -n marbles -p github.com/ibm-blockchain/marbles/chaincode/src/marbles -v 5.0.0 package.out
	// notes: "marbles" is inside the $GOPATH and "package.out" is the name of the output file.

	timeout_ms: 90000,     // [optional] client timeout override for this request, defaults 90sec
};
stitch.installChaincode(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	    // true if the call encountered an error, else false
	msp_id: "PeerOrg1",    // same msp id provide in input args
	host: "http://peer_url.com:8080", // the "host" used for this call
	data: {	            // the response, not available if "error" is true
		chaincode_details: {
			name: "",    // chaincode id
			version: "", // chaincode version
			path: "",    // chaincode path
			type: "",    // chaincode type, ex "golang"
			timeout: 0,
			input: []
		}
	},
	stitch_msg: "ok"       // error/success message for your req
	grpc_resp: {
		status: 0,   // status code from the grpc call
		statusMessage: "", // status message from the grpc call
		headers: {},  // headers in the grpc response
		message: {},  // "ProposalResponse" protobuf
		trailers: {}  // trailers in the grpc response
	},
}
```


<a name="getInstantiatedChaincode"></a>

### C3. getInstantiatedChaincode()
This method will return instantiated chaincode on a channel.
The peer must have already joined the channel.

**Syntax**:
```js
const opts = {
	msp_id: "PeerOrg1",   //  msp id to use
	client_cert_b64pem: "string", // the org's signed cert in a base 64 encoded PEM format
	client_prv_key_b64pem: "string", // the orgs private key in a base 64 encoded PEM format
	host: "http://peer_url.com:8080", // *grpc-web* url to peer. include proto & port
	channel_id: "defaultchannel",   // id of the channel
	timeout_ms: 10000,     // [optional] client timeout override for this request, defaults 10sec
};
stitch.getInstantiatedChaincode(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	    // true if the call encountered an error, else false
	msp_id: "PeerOrg1",    // same msp id provide in input args
	host: "http://peer_url.com:8080", // the "host" used for this call
	data: {	            // the response, not available if "error" is true
		chaincodesList: [{  // decoded "ChaincodeQueryResponse"
			escc: "",     // name of the endorsement system cc
			id: ""​​​​,       // internal chaincode id
			input: ""​​​​,    // ?
			name: "",​​​     // chaincode id
			path: "",     // chaincode path
			version: ""​​,​  // chaincode version
			vscc: "",     // name of verification system cc to be used
		}],
	stitch_msg: "ok"       // error/success message for your req
	grpc_resp: {
		status: 0,   // status code from the grpc call
		statusMessage: "", // status message from the grpc call
		headers: {},  // headers in the grpc response
		message: {},  // "ProposalResponse" protobuf
		trailers: {}  // trailers in the grpc response
	},
}
```


<a name="getChaincodeDetailsFromPeer"></a>

### C4. getChaincodeDetailsFromPeer()
This method will return the so called "ChaincodeData" about a particular instantiated chaincode.
This data contains the msp's that can upgrade the chaincode.
It will be returned decoded.

**Syntax**:
```js
const opts11 = {
	msp_id: "PeerOrg1",	   //  msp id to use
	client_cert_b64pem: "string", // the org's signed cert in a base 64 encoded PEM format
	client_prv_key_b64pem: "string", // the orgs private key in a base 64 encoded PEM format
	host: "http://peer_url.com:8080", // *grpc-web* url to peer. include proto & port
	timeout_ms: 90000,     // [optional] client timeout override for this request, defaults 10sec

	// id of the channel
	channel_id: 'marbles',

	// id of the chaincode
	chaincode_id: 'marbles1',
};
stitch.getChaincodeDetailsFromPeer(opts11, (e3, resp3) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	    // true if the call encountered an error, else false
	msp_id: "PeerOrg1",    // same msp id provide in input args
	host: "http://peer_url.com:8080", // the "host" used for this call
	data: {	    // the response, not available if "error" was true. decoded "ChaincodeData"
		data: "",     // unknown field
		escc: "",     // name of the endorsement system cc
		id: ""​​​​,       // internal chaincode id (hash)
		instantiationPolicy: {​  // decoded "Policy" for instantiations
			type: 1,
			value: {
				identitiesList: [{}]
			},
			rule: {},
			version: 0
		},
		name: "",​​​     // chaincode id
		policy: {​     // decoded "Policy" for chaincode
			type: 1,
			value: {
				identitiesList: [{}]
			},
			rule: {},
			version: 0
		},
		version: ""​​,​  // chaincode version
		vscc: "",     // name of verification system cc to be used
	},
	stitch_msg: "ok"  // error/success message for your req
	grpc_resp: {
		status: 0,   // status code from the grpc call
		statusMessage: "", // status message from the grpc call
		headers: {},  // headers in the grpc response
		message: {},  // "ProposalResponse" protobuf
		trailers: {}  // trailers in the grpc response
	}
}
```


<a name="checkIfChaincodeExists"></a>

### C5. checkIfChaincodeExists()
This method will return basic info about a particular instantiated chaincode.

**Syntax**:
```js
const opts11 = {
	msp_id: "PeerOrg1",	   //  msp id to use
	client_cert_b64pem: "string", // the org's signed cert in a base 64 encoded PEM format
	client_prv_key_b64pem: "string", // the orgs private key in a base 64 encoded PEM format
	host: "http://peer_url.com:8080", // *grpc-web* url to peer. include proto & port
	orderer_host: "http://orderer_url.com:8081", // *grpc-web* url to orderer. include proto & port
	timeout_ms: 90000,     // [optional] client timeout override for this request, defaults 10sec

	// id of the channel
	channel_id: 'marbles',

	// id of the chaincode
	chaincode_id: 'marbles1',
};
stitch.checkIfChaincodeExists(opts11, (e3, resp3) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	    // true if the call encountered an error, else false
	msp_id: "PeerOrg1",    // same msp id provide in input args
	host: "http://peer_url.com:8080", // the "host" used for this call
	data: {	   // the response, not available if "error" was true. decoded "ChaincodeData"
		data: "",     // unknown field
		escc: "",     // name of the endorsement system cc
		id: ""​​​​,       // internal chaincode id (hash)
		name: "",​​​     // chaincode id,
		version: ""​​,​  // chaincode version
		vscc: "",     // name of verification system cc to be used
	},
	stitch_msg: "ok"  // error/success message for your req
	grpc_resp: {
		status: 0,   // status code from the grpc call
		statusMessage: "", // status message from the grpc call
		headers: {},  // headers in the grpc response
		message: {},  // "ProposalResponse" protobuf
		trailers: {}  // trailers in the grpc response
	}
}
```


<a name="instantiateChaincode"></a>

### C6. instantiateChaincode()
This method will instantiate chaincode on a channel.
The peer must have already joined the channel.
The peer must have this chaincode id/version installed.
The **certificate used must be an admin cert** that the **channel** recognizes.

**Syntax**:
```js
const opts = {
	msp_id: "PeerOrg1",	   //  msp id to use
	client_cert_b64pem: "string", // the org's signed cert in a base 64 encoded PEM format
	client_prv_key_b64pem: "string", // the orgs private key in a base 64 encoded PEM format
	host: "http://peer_url.com:8080", // *grpc-web* url to peer. include proto & port
	orderer_host: "http://orderer_url.com:8081", // *grpc-web* url to orderer. include proto & port
	channel_id: "defaultchannel",   // id of the channel
	timeout_ms: 300000,     // [optional] client timeout override for this request, defaults 5min

	// chaincode name/id, must be unique (string)
	chaincode_id: "marbles",

	// chaincode version (string)
	chaincode_version: "1.0.1",

	// chaincode language type (string) - one of the following
	// defaults "golang"
	chaincode_type: "golang" || "node" || "java" || "car"

	// name of chaincode function to call to start (string)
	chaincode_function: "init_marble",

	// chaincode string arguments to pass to the chaincode function
	chaincode_args: ["m999999999", "blue", "35", "o9999999999999", "united marbles"],

	// [optional]
	// if null the endorsement policy will only allow this msp id
	// if it is not null it should match the fabric-sdk-node policy format:
	// - https://hyperledger.github.io/fabric-sdk-node/release-1.4/global.html#ChaincodeInstantiateUpgradeRequest
	// - see examples in url above
	// - alternative format supported: https://github.com/hyperledger/fabric/blob/release-1.4/protos/common/policies.proto#L40
	endorsement_policy: {} || null

	// [optional]
	// if static_collection_configs is not null it should match the fabric-sdk-node policy format:
	// - https://fabric-sdk-node.github.io/tutorial-private-data.html
	// - see examples in url above
	static_collection_configs: [{

		// name of your collection
		name: "myCollection",

		// follow an endorsement policy format: (aka "SignaturePolicyEnvelope")
		// - fabric sdk format supported - https://hyperledger.github.io/fabric-sdk-node/release-1.4/global.html#ChaincodeInstantiateUpgradeRequest
		// - alternative format supported - https://github.com/hyperledger/fabric/blob/release-1.4/protos/common/policies.proto#L40
		// note this field can be named "member_orgs_policy" (fabric's version) or "policy" (fabric sdk's version)
		member_orgs_policy: {},

		// min number of peers that must get the private data to successfully endorse
		required_peer_count: 1,

		// max number of peers the endorsing peer can try to send private data to
		maximum_peer_count: 2,

		// when to expire private data, after this number of blocks the private data is deleted, 0 = unlimited
		block_to_live: 0
	}] || null
};
stitch.instantiateChaincode(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	    // true if the call encountered an error, else false
	msp_id: "PeerOrg1",    // same msp id provide in input args
	host: "http://peer_url.com:8080", // the "host" used for this call
	orderer_host: "http://orderer_url.com:8081", // the "orderer_host" used for this call
	data: {	            // the response, not available if "error" is true
		channel_id: "defaultchannel",
		chaincode_id: "marbles", // same "chaincode_id" in input args
		chaincode_version: "1.0.1", // "same chaincode_version" in input args
	},
	stitch_msg: "ok"       // error/success message for your req
	grpc_resp: {
		status: 0,   // status code from the grpc call
		statusMessage: "", // status message from the grpc call
		headers: {},  // headers in the grpc response
		message: {},  // "ProposalResponse" protobuf
		trailers: {}  // trailers in the grpc response
	},
}
```


<a name="upgradeChaincode"></a>

### C7. upgradeChaincode()
This method will upgrade an instantiated chaincode on a channel.
The peer must have already joined the channel.
The peer must have this chaincode id/version installed.
The chaincode must already be instantiated (with a different version).
The **certificate used must be an admin cert** that the **channel** recognizes.

**Syntax**:
```js
const opts = {
	msp_id: "PeerOrg1",	   //  msp id to use
	client_cert_b64pem: "string", // the org's signed cert in a base 64 encoded PEM format
	client_prv_key_b64pem: "string", // the orgs private key in a base 64 encoded PEM format
	host: "http://peer_url.com:8080", // *grpc-web* url to peer. include proto & port
	orderer_host: "http://orderer_url.com:8081", // *grpc-web* url to orderer. include proto & port
	channel_id: "defaultchannel",   // id of the channel
	timeout_ms: 90000,     // [optional] client timeout override for this request, defaults 90sec

	// chaincode name/id, must match existing chaincode (string)
	chaincode_id: "marbles",

	// chaincode version (string)
	chaincode_version: "2.0.5",

	// chaincode language type (string) - one of the following
	// defaults "golang"
	chaincode_type: "golang" || "node" || "java" || "car"

	// name of chaincode function to call to start (string)
	chaincode_function: "init_marble",

	// chaincode string arguments to pass to the chaincode function
	chaincode_args: ["m999999999", "blue", "35", "o9999999999999", "united marbles"],
};
stitch.upgradeChaincode(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	    // true if the call encountered an error, else false
	msp_id: "PeerOrg1",    // same msp id provide in input args
	host: "http://peer_url.com:8080", // the "host" used for this call
	orderer_host: "http://orderer_url.com:8081", // the "orderer_host" used for this call
	data: {	            // the response, not available if "error" is true
		channel_id: "defaultchannel",
		chaincode_id: "marbles", // same "chaincode_id" in input args
		chaincode_version: "1.0.1", // "same chaincode_version" in input args
	},
	stitch_msg: "ok"       // error/success message for your req
	grpc_resp: {
		status: 0,   // status code from the grpc call
		statusMessage: "", // status message from the grpc call
		headers: {},  // headers in the grpc response
		message: {},  // "ProposalResponse" protobuf
		trailers: {}  // trailers in the grpc response
	},
}
```





***

# D - Fabric _lifecycle Methods (Fabric v2.x)

<a name="lc_installChaincode"></a>

### D1. lc_installChaincode()
Install chaincode on peer from a tar.gz file.
- Requires Fabric 2.0 system chaincode `_lifecycle`
- This method serves the same purpose as the peer CLI command `peer lifecycle chaincode install`

Use this peer CLI command to create the chaincode package file:
> peer lifecycle chaincode package marbles.tar.gz --path ./chaincode/src/marbles --lang golang --label marbles_1
- note that the marbles' cc is using golang modules and is vendored
- note that "marbles.tar.gz" in the command above is the name of the output file, which gets dropped at $PWD

**Syntax**:
```js
const opts: {

	// string - msp id. example: PeerOrg1
	msp_id: "Org1MSP",

	// string - the org's signed cert in a base 64 encoded PEM format
	client_cert_b64pem: "<b64 pem string>",

	// string - the orgs private key in a base 64 encoded PEM format
	client_prv_key_b64pem: "<b64 pem string>",

	// string - http/https **grpc-web** endpoint to reach your peer
	host: "http://peer_url.com:port",

	// [optional] integer - client side timeout of this request (milliseconds)
	// defaults 180000 = (3 minutes)
	timeout_ms: 240000

	// - - - - - - - - - - - - - - - - - - - - - - - - - - -

	// binary data of the chaincode LIFECYCLE package. use the peer's cli to create this.
	// data should be a typed-array, like a Uint8Array
	chaincode_lifecycle_package: <Uint8Array>  // (yes, this is literally a tar.gz file)
}
stitch.lc_installChaincode(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	      // true if the call encountered an error, else false
	msp_id: "PeerOrg1",    // same msp id provide in input args
	host: "http://peer_url.com:8080", // the "host" used for this call
	data: {	              // the response, not available if "error" is true

		// the "label" the peer found in the cc's zip file
		label: "marbles_1",

		 // the peer generated this id for this install
		packageId: "marbles_1:92321c359d1efcd65dc34c6ee334e37870a4a2130889473173fad3ddf7c02249"
	},
	stitch_msg: "ok"       // error/success message for your req
	grpc_resp: {
		status: 0,     // status code from the grpc call
		statusMessage: "", // status message from the grpc call
		headers: {},   // headers in the grpc response
		message: {},   // "ConfigEnvelope" protobuf
		trailers: {}   // trailers in the grpc response
	},
}
```


<a name="lc_getInstalledChaincodeData"></a>

### D2. lc_getInstalledChaincodeData()
Get metadata about a single installed chaincode package from a peer.
Channel names will be listed if the chaincode package matches a definition that was been committed to 1 or more channels *(I believe the peer must also be joined to said channel, so this is not the complete list)*.
- Requires Fabric 2.0 system chaincode `_lifecycle`
- This method serves the same purpose as the peer CLI command `peer lifecycle chaincode queryinstalled --name marbles`

**Syntax**:
```js
const opts: {

	// string - msp id. example: PeerOrg1
	msp_id: "Org1MSP",

	// string - the org's signed cert in a base 64 encoded PEM format
	client_cert_b64pem: "<b64 pem string>",

	// string - the orgs private key in a base 64 encoded PEM format
	client_prv_key_b64pem: "<b64 pem string>",

	// string - http/https **grpc-web** endpoint to reach your peer
	host: "http://peer_url.com:port",

	// [optional] integer - client side timeout of this request (milliseconds)
	// defaults 10000 = (10 seconds)
	timeout_ms: 1234

	// - - - - - - - - - - - - - - - - - - - - - - - - - - -

	// string - id of the chaincode package (id is in the resp of cc install)
	package_id: "marbles_1:92321c359d1efcd65dc34c6ee334e37870a4a2130889473173fad3ddf7c02249"
}
stitch.lc_getInstalledChaincodeData(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	      // true if the call encountered an error, else false
	msp_id: "PeerOrg1",    // same msp id provide in input args
	host: "http://peer_url.com:8080", // the "host" used for this call
	data: {	              // the response, not available if "error" is true
		label: "marbles_1" // chaincode package label
		packageId: "marbles_1:92321c359d1efcd65dc34c6ee334e37870a4a2130889473173fad3ddf7c02249"

		// if committed the "references" will be set, else omitted
		references: {
			mychannel: {  // channel name/id with committed chaincode
				chaincodes: [{
					name: "fabcar",  // chaincode id/name
					version: "1"  // chaincode version
				}]
			}
		}
	},
	stitch_msg: "ok"       // error/success message for your req
	grpc_resp: {
		status: 0,     // status code from the grpc call
		statusMessage: "", // status message from the grpc call
		headers: {},   // headers in the grpc response
		message: {},   // "ConfigEnvelope" protobuf
		trailers: {}   // trailers in the grpc response
	},
}
```


<a name="lc_getAllInstalledChaincodeData"></a>

### D3. lc_getAllInstalledChaincodeData()
Get metadata about a all installed chaincode packages on a peer.
Channel names will be listed if the chaincode package matches a definition that was been committed to 1 or more channels *(I believe the peer must also be joined to said channel, so this is not the complete list)*.
- Requires Fabric 2.0 system chaincode `_lifecycle`
- This method serves the same purpose as the peer CLI command `peer lifecycle chaincode queryinstalled`

**Syntax**:
```js
const opts: {

	// string - msp id. example: PeerOrg1
	msp_id: "Org1MSP",

	// string - the org's signed cert in a base 64 encoded PEM format
	client_cert_b64pem: "<b64 pem string>",

	// string - the orgs private key in a base 64 encoded PEM format
	client_prv_key_b64pem: "<b64 pem string>",

	// string - http/https **grpc-web** endpoint to reach your peer
	host: "http://peer_url.com:port",

	// [optional] integer - client side timeout of this request (milliseconds)
	// defaults 10000 = (10 seconds)
	timeout_ms: 1234
}
stitch.lc_getAllInstalledChaincodeData(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	      // true if the call encountered an error, else false
	msp_id: "PeerOrg1",    // same msp id provide in input args
	host: "http://peer_url.com:8080", // the "host" used for this call
	data: {	              // the response, not available if "error" is true
		installedChaincodes: [{
			label: "marbles_1" // chaincode package label
			packageId: "marbles_1:92321c359d1efcd65dc34c6ee334e37870a4a2130889473173fad3ddf7c02249"

			// if def is committed the "references" field will be set, else it's omitted
			references: {
				mychannel: {  // channel name/id with committed chaincode
					chaincodes: [{
						name: "fabcar",  // chaincode id/name
						version: "1"  // chaincode version
					}]
				}
			}
		}]
	},
	stitch_msg: "ok"       // error/success message for your req
	grpc_resp: {
		status: 0,     // status code from the grpc call
		statusMessage: "", // status message from the grpc call
		headers: {},   // headers in the grpc response
		message: {},   // "ConfigEnvelope" protobuf
		trailers: {}   // trailers in the grpc response
	},
}
```


<a name="lc_getInstalledChaincodePackage"></a>

### D4. lc_getInstalledChaincodePackage()
Get the installed chaincode package from a peer.
The raw chaincode package file will be base 64 encoded.
- Requires Fabric 2.0 system chaincode `_lifecycle`
- This method serves the same purpose as the peer CLI command `peer lifecycle chaincode getinstalledpackage`

**Syntax**:
```js
const opts: {

	// string - msp id. example: PeerOrg1
	msp_id: "Org1MSP",

	// string - the org's signed cert in a base 64 encoded PEM format
	client_cert_b64pem: "<b64 pem string>",

	// string - the orgs private key in a base 64 encoded PEM format
	client_prv_key_b64pem: "<b64 pem string>",

	// string - http/https **grpc-web** endpoint to reach your peer
	host: "http://peer_url.com:port",

	// [optional] integer - client side timeout of this request (milliseconds)
	// defaults 180000 = (3 minutes)
	timeout_ms: 1234

	// - - - - - - - - - - - - - - - - - - - - - - - - - - -

	// string - id of the chaincode package (id is in the resp of cc install)
	package_id: "marbles_1:92321c359d1efcd65dc34c6ee334e37870a4a2130889473173fad3ddf7c02249"
}
stitch.lc_getInstalledChaincodePackage(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	      // true if the call encountered an error, else false
	msp_id: "PeerOrg1",    // same msp id provide in input args
	host: "http://peer_url.com:8080", // the "host" used for this call
	data: {	              // the response, not available if "error" is true
		chaincodeInstallPackage: "<base 64 encoded tar.gz file>" // this can be huge
	},
	stitch_msg: "ok"       // error/success message for your req
	grpc_resp: {
		status: 0,     // status code from the grpc call
		statusMessage: "", // status message from the grpc call
		headers: {},   // headers in the grpc response
		message: {},   // "ConfigEnvelope" protobuf
		trailers: {}   // trailers in the grpc response
	},
}
```


<a name="lc_approveChaincodeDefinition"></a>

### D5. lc_approveChaincodeDefinition()
Approve/create a chaincode definition on a channel for 1 org.
After the definition is approved by enough members it can be committed with [lc_commitChaincodeDefinition()](#lc_commitChaincodeDefinition)
- Requires Fabric 2.0 system chaincode `_lifecycle`
- This method serves the same purpose as the peer CLI command `peer lifecycle chaincode approveformyorg`
- See [signature policy syntax doc](https://github.ibm.com/IBM-Blockchain/stitch/blob/master/docs/sig_policy_syntax.md) for help on writing a signature policy

**Syntax**:
```js
const opts: {

	// string - msp id. example: PeerOrg1
	msp_id: "Org1MSP",

	// string - the org's signed cert in a base 64 encoded PEM format
	client_cert_b64pem: "<b64 pem string>",

	// string - the orgs private key in a base 64 encoded PEM format
	client_prv_key_b64pem: "<b64 pem string>",

	// string - http/https **grpc-web** endpoint to reach your peer
	host: "http://peer_url.com:port",

	// [optional] integer - client side timeout of this request (milliseconds)
	// defaults 10000 = (10 seconds)
	timeout_ms: 1234

	// - - - - - - - - - - - - - - - - - - - - - - - - - - -

	// string - http/https **grpc-web** endpoint to reach your orderer
	orderer_host: "http://orderer_url.com:port"

	// string - id of the channel
	channel_id: "first"

	// [optional] string - id of the chaincode package (id is in the resp of cc install)
	// field can be absent or null if the org does not yet have a cc installed
	package_id: "marbles_1:92321c359d1efcd65dc34c6ee334e37870a4a2130889473173fad3ddf7c02249"

	// --------------- Begin Chaincode Definition Spec --------------- //
	// Note: the next few fields form the "chaincode definition". it is very important
	// that the values set during this call exactly match subsequent methods calls. this is b/c
	// cc definitions do not have a ID... they are identified by these parameters themselves.
	// Any deviation signifies a different cc definition.

	// integer - tracks the number of times a chaincode def has been defined or updated
	chaincode_sequence: 1,

	// string - chaincode id/name
	chaincode_id: "marbles",

	// string - chaincode version
	chaincode_version: "v1",

	// [optional] string - system chaincode name to use to check endorsements
	endorsement_plugin: "escc",

	// [optional] string - system chaincode name to use to validate
	validation_plugin: "vscc",

	// [optional] (two choices)
	// [1] ChannelConfigPolicyReference (string):
	//		- name of a channel's signature policy to use for the cc's endorsement policy.
	//		- must start with '/'
	//		- defaults "/Channel/Application/Endorsement"
	// [2] SignaturePolicyEnvelope (multiple types):
	// 		- the signature policy to use for the cc's endorsement policy.
	// 		- multiple syntaxes are supported. (peer-cli, sdk, and fabric syntax)
	// 		- syntax details see: https://github.ibm.com/IBM-Blockchain/stitch/blob/master/docs/sig_policy_syntax.md
	validation_parameter: `AND('Org1.admin', 'Org2.member')`

	// [optional] array - array of static collection config (Scc), conforms to peer/collection.proto
	collections_obj: [{

		// [required] string - name of the StaticCollectionConfig message
		name: 'myCollection-v1',

		// [optional] number - minimum number of peers that must get the private data to successfully endorse
		required_peer_count: 1,

		// [optional] number - max number of peers the endorsing peer can try to send private data to
		// (an alt name for this field is supported b/c node-sdk: "maxPeerCount")
		maximum_peer_count: 5,

		// [optional] multiple types - signature policy controlling which orgs must endorse private data changes
		// multiple syntaxes are supported. (peer-cli, sdk, and fabric syntax)
		// syntax details see: https://github.ibm.com/IBM-Blockchain/stitch/blob/master/docs/sig_policy_syntax.md
		// (an alt name for this field is supported b/c node-sdk: "policy")
		member_orgs_policy: `AND('Org1.admin', 'Org2.member')`,

		// [optional] number - when to expire private data.
		// after this number of blocks the private data is deleted. 0 = unlimited
		block_to_live: 1,

		// [optional] boolean - if true, only collection member clients can read private data
		member_only_read: true,

		// [optional] boolean - if true, only collection member clients can write private data
		member_only_write: false,

		// [optional]
		// [1] ChannelConfigPolicyReference (string):
		//		- name of a channel's signature policy to use for the cc's endorsement policy.
		//		- must start with '/'
		//		- defaults "/Channel/Application/Endorsement"
		// [2] SignaturePolicyEnvelope (multiple types):
		// 		- the signature policy to use for the cc's endorsement policy.
		// 		- multiple syntaxes are supported. (peer-cli, sdk, and fabric syntax)
		// 		- syntax details see: https://github.ibm.com/IBM-Blockchain/stitch/blob/master/docs/sig_policy_syntax.md
		endorsement_policy: null
	}],

	// [optional] boolean - controls if the first invoke should be "init" or not
	init_required: true,

	// --------------- End Chaincode Definition Spec --------------- //
}
stitch.lc_approveChaincodeDefinition(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	      // true if the call encountered an error, else false
	msp_id: "PeerOrg1",    // same msp id provide in input args
	host: "http://peer_url.com:8080", // the "host" used for this call
	data: {	              // the response, not available if "error" is true
		tx_endorsed: true,
		tx_submitted: true,
		channel_id: "first",
		chaincode_id: "marbles,
		chaincode_version: "v1",
		package_id: "marbles_1:92321c359d1efcd65dc34c6ee334e37870a4a2130889473173fad3ddf7c02249",
	},
	stitch_msg: "ok"       // error/success message for your req
	grpc_resp: {
		status: 0,     // status code from the grpc call
		statusMessage: "", // status message from the grpc call
		headers: {},   // headers in the grpc response
		message: {},   // "ConfigEnvelope" protobuf
		trailers: {}   // trailers in the grpc response
	},
}
```


<a name="lc_checkChaincodeDefinitionReadiness"></a>

### D6. lc_checkChaincodeDefinitionReadiness()
Check chaincode definition's commit-readiness on a specific channel.
After the definition is approved it can be committed with [lc_commitChaincodeDefinition()](#lc_commitChaincodeDefinition).
Checkout [policyIsMet()](#policyIsMet) to determine if there are enough approvals (you will need to get and provide the policy).
- Requires Fabric 2.0 system chaincode `_lifecycle`
- This method serves the same purpose as the peer CLI command `peer lifecycle chaincode checkcommitreadiness`

**Syntax**:
```js
const opts: {

	// string - msp id. example: PeerOrg1
	msp_id: "Org1MSP",

	// string - the org's signed cert in a base 64 encoded PEM format
	client_cert_b64pem: "<b64 pem string>",

	// string - the orgs private key in a base 64 encoded PEM format
	client_prv_key_b64pem: "<b64 pem string>",

	// string - http/https **grpc-web** endpoint to reach your peer
	host: "http://peer_url.com:port",

	// [optional] integer - client side timeout of this request (milliseconds)
	// defaults 10000 = (10 seconds)
	timeout_ms: 1234

	// - - - - - - - - - - - - - - - - - - - - - - - - - - -

	// string - id of the channel
	channel_id: "first"

	// --------------- Begin Chaincode Definition Spec --------------- //
	// Note: the next few fields form the "chaincode definition". it is very important
	// that the values set during this call exactly match subsequent methods calls. this is b/c
	// cc definitions do not have a ID... they are identified by these parameters themselves.
	// Any deviation signifies a different cc definition.

	// integer - tracks the number of times a chaincode def has been defined or updated
	chaincode_sequence: 1,

	// string - chaincode id/name
	chaincode_id: "marbles",

	// string - chaincode version
	chaincode_version: "v1",

	// [optional] string - system chaincode name to use to check endorsements
	endorsement_plugin: "escc",

	// [optional] string - system chaincode name to use to validate
	validation_plugin: "vscc",

	// [optional] (two choices)
	// [1] ChannelConfigPolicyReference (string):
	//		- name of a channel's signature policy to use for the cc's endorsement policy.
	//		- must start with '/'
	//		- defaults "/Channel/Application/Endorsement"
	// [2] SignaturePolicyEnvelope (multiple types):
	// 		- the signature policy to use for the cc's endorsement policy.
	// 		- multiple syntaxes are supported. (peer-cli, sdk, and fabric syntax)
	// 		- syntax details see: https://github.ibm.com/IBM-Blockchain/stitch/blob/master/docs/sig_policy_syntax.md
	validation_parameter: `AND('Org1.admin', 'Org2.member')`

	// [optional] array - array of static collection config (Scc), conforms to peer/collection.proto
	collections_obj: [{

		// [required] string - name of the StaticCollectionConfig message
		name: 'myCollection-v1',

		// [optional] number - minimum number of peers that must get the private data to successfully endorse
		required_peer_count: 1,

		// [optional] number - max number of peers the endorsing peer can try to send private data to
		// (an alt name for this field is supported b/c node-sdk: "maxPeerCount")
		maximum_peer_count: 5,

		// [optional] multiple types - signature policy controlling which orgs must endorse private data changes
		// multiple syntaxes are supported. (peer-cli, sdk, and fabric syntax)
		// syntax details see: https://github.ibm.com/IBM-Blockchain/stitch/blob/master/docs/sig_policy_syntax.md
		// (an alt name for this field is supported b/c node-sdk: "policy")
		member_orgs_policy: `AND('Org1.admin', 'Org2.member')`,

		// [optional] number - when to expire private data.
		// after this number of blocks the private data is deleted. 0 = unlimited
		block_to_live: 1,

		// [optional] boolean - if true, only collection member clients can read private data
		member_only_read: true,

		// [optional] boolean - if true, only collection member clients can write private data
		member_only_write: false,

		// [optional]
		// [1] ChannelConfigPolicyReference (string):
		//		- name of a channel's signature policy to use for the cc's endorsement policy.
		//		- must start with '/'
		//		- defaults "/Channel/Application/Endorsement"
		// [2] SignaturePolicyEnvelope (multiple types):
		// 		- the signature policy to use for the cc's endorsement policy.
		// 		- multiple syntaxes are supported. (peer-cli, sdk, and fabric syntax)
		// 		- syntax details see: https://github.ibm.com/IBM-Blockchain/stitch/blob/master/docs/sig_policy_syntax.md
		endorsement_policy: null
	}],

	// [optional] boolean - controls if the first invoke should be "init" or not
	init_required: true,

	// --------------- End Chaincode Definition Spec --------------- //
}
stitch.lc_checkChaincodeDefinitionReadiness(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	      // true if the call encountered an error, else false
	msp_id: "PeerOrg1",    // same msp id provide in input args
	host: "http://peer_url.com:8080", // the "host" used for this call
	data: {	              // the response, not available if "error" is true
		approvals: {  // the keys are members of the channel (I think)
			Org1MSP: false  // the values are the state of this org's approval
			Org2MSP: false  // the values are the state of this org's approval
		}
	},
	stitch_msg: "ok"       // error/success message for your req
	grpc_resp: {
		status: 0,     // status code from the grpc call
		statusMessage: "", // status message from the grpc call
		headers: {},   // headers in the grpc response
		message: {},   // "ConfigEnvelope" protobuf
		trailers: {}   // trailers in the grpc response
	},
}
```


<a name="lc_commitChaincodeDefinition"></a>

### D7. lc_commitChaincodeDefinition()
Commit a chaincode definition on a specific channel.
This is analogous to Fabric v1.x's `instantiate` chaincode method.
- Tip - check the orgs that have signed before committing by using [lc_checkChaincodeDefinitionReadiness()](#lc_checkChaincodeDefinitionReadiness)
- Requires Fabric 2.0 system chaincode `_lifecycle`
- This method serves the same purpose as the peer CLI command `peer lifecycle chaincode commit`

**Syntax**:
```js
const opts: {

	// string - msp id. example: PeerOrg1
	msp_id: "Org1MSP",

	// string - the org's signed cert in a base 64 encoded PEM format
	client_cert_b64pem: "<b64 pem string>",

	// string - the orgs private key in a base 64 encoded PEM format
	client_prv_key_b64pem: "<b64 pem string>",

	// array of strings - http/https **grpc-web** peer endpoints to use for endorsements
	// these urls should NOT be a optools proxy route, might result in CORS issues
	hosts: ["http://peer_url.com:port"],

	// [optional] string - url to a proxy route to use (include the protocol)
	// if this field is missing or blank the literal peer urls in "hosts" will be used,
	// else this proxy route will be used to reach each peer
	// (has no effect on reaching orderers, aka orderer_host)
	proxy_route: "https://ibpconsole.blockchain.cloud.ibm.com/grpcwp",

	// [optional] integer - client side timeout of this request (milliseconds)
	// defaults 10000 = (10 seconds)
	timeout_ms: 1234

	// - - - - - - - - - - - - - - - - - - - - - - - - - - -

	// string - http/https **grpc-web** endpoint to reach your orderer
	// (this url can include a optools proxy route if applicable)
	orderer_host: "http://orderer_url.com:port"

	// string - id of the channel
	channel_id: "first"

	// --------------- Begin Chaincode Definition Spec --------------- //
	// Note: the next few fields form the "chaincode definition". it is very important
	// that the values set during this call exactly match subsequent methods calls. this is b/c
	// cc definitions do not have a ID... they are identified by these parameters themselves.
	// Any deviation signifies a different cc definition.

	// integer - tracks the number of times a chaincode def has been defined or updated
	chaincode_sequence: 1,

	// string - chaincode id/name
	chaincode_id: "marbles",

	// string - chaincode version
	chaincode_version: "v1",

	// [optional] string - system chaincode name to use to check endorsements
	endorsement_plugin: "escc",

	// [optional] string - system chaincode name to use to validate
	validation_plugin: "vscc",

	// [optional] (two choices)
	// [1] ChannelConfigPolicyReference (string):
	//		- name of a channel's signature policy to use for the cc's endorsement policy.
	//		- must start with '/'
	//		- defaults "/Channel/Application/Endorsement"
	// [2] SignaturePolicyEnvelope (multiple types):
	// 		- the signature policy to use for the cc's endorsement policy.
	// 		- multiple syntaxes are supported. (peer-cli, sdk, and fabric syntax)
	// 		- syntax details see: https://github.ibm.com/IBM-Blockchain/stitch/blob/master/docs/sig_policy_syntax.md
	validation_parameter: `AND('Org1.admin', 'Org2.member')`

	// [optional] array - array of static collection config (Scc), conforms to peer/collection.proto
	collections_obj: [{

		// [required] string - name of the StaticCollectionConfig message
		name: 'myCollection-v1',

		// [optional] number - minimum number of peers that must get the private data to successfully endorse
		required_peer_count: 1,

		// [optional] number - max number of peers the endorsing peer can try to send private data to
		// (an alt name for this field is supported b/c node-sdk: "maxPeerCount")
		maximum_peer_count: 5,

		// [optional] multiple types - signature policy controlling which orgs must endorse private data changes
		// multiple syntaxes are supported. (peer-cli, sdk, and fabric syntax)
		// syntax details see: https://github.ibm.com/IBM-Blockchain/stitch/blob/master/docs/sig_policy_syntax.md
		// (an alt name for this field is supported b/c node-sdk: "policy")
		member_orgs_policy: `AND('Org1.admin', 'Org2.member')`,

		// [optional] number - when to expire private data.
		// after this number of blocks the private data is deleted. 0 = unlimited
		block_to_live: 1,

		// [optional] boolean - if true, only collection member clients can read private data
		member_only_read: true,

		// [optional] boolean - if true, only collection member clients can write private data
		member_only_write: false,

		// [optional]
		// [1] ChannelConfigPolicyReference (string):
		//		- name of a channel's signature policy to use for the cc's endorsement policy.
		//		- must start with '/'
		//		- defaults "/Channel/Application/Endorsement"
		// [2] SignaturePolicyEnvelope (multiple types):
		// 		- the signature policy to use for the cc's endorsement policy.
		// 		- multiple syntaxes are supported. (peer-cli, sdk, and fabric syntax)
		// 		- syntax details see: https://github.ibm.com/IBM-Blockchain/stitch/blob/master/docs/sig_policy_syntax.md
		endorsement_policy: null
	}],

	// [optional] boolean - controls if the first invoke should be "init" or not
	init_required: true,

	// --------------- End Chaincode Definition Spec --------------- //
}
stitch.lc_commitChaincodeDefinition(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	      // true if the call encountered an error, else false
	msp_id: "PeerOrg1",    // same msp id provide in input args
	hosts: ["http://peer_url.com:8080"], // the "hosts" used during this call
	data: {	              // the response, not available if "error" is true
		tx_endorsed: true,
		tx_submitted: true,
		channel_id: "first",
		chaincode_id: "marbles,
		chaincode_version: "v1",
		package_id: "marbles_1:92321c359d1efcd65dc34c6ee334e37870a4a2130889473173fad3ddf7c02249",
	},
	stitch_msg: "ok"       // error/success message for your req
	grpc_resps: [{
		status: 0,     // status code from the grpc call
		statusMessage: "", // status message from the grpc call
		headers: {},   // headers in the grpc response
		message: {},   // "ConfigEnvelope" protobuf
		trailers: {}   // trailers in the grpc response
	}],
}
```


<a name="lc_getChaincodeDefinitionOnChannel"></a>

### D8. lc_getChaincodeDefinitionOnChannel()
Get a single chaincode definition committed to a specific channel.
- Requires Fabric 2.0 system chaincode `_lifecycle`
- This method serves the same purpose as the peer CLI command `peer lifecycle chaincode querycommitted --name marbles`

**Syntax**:
```js
const opts: {

	// string - msp id. example: PeerOrg1
	msp_id: "Org1MSP",

	// string - the org's signed cert in a base 64 encoded PEM format
	client_cert_b64pem: "<b64 pem string>",

	// string - the orgs private key in a base 64 encoded PEM format
	client_prv_key_b64pem: "<b64 pem string>",

	// string - http/https **grpc-web** endpoint to reach your peer
	host: "http://peer_url.com:port",

	// [optional] integer - client side timeout of this request (milliseconds)
	// defaults 10000 = (10 seconds)
	timeout_ms: 1234

	// - - - - - - - - - - - - - - - - - - - - - - - - - - -

	// string - id of the channel
	channel_id: "first"

	// string - id of the channel
	chaincode_id: "marbles"
}
stitch.lc_getChaincodeDefinitionOnChannel(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	      // true if the call encountered an error, else false
	msp_id: "PeerOrg1",    // same msp id provide in input args
	host: "http://peer_url.com:8080", // the "host" used for this call
	data: {	              // the response, not available if "error" is true
		approvals: {  // the keys are members of the channel (I think)
			Org1MSP: true  // the values are the state of this org's approval
			Org2MSP: true  // the values are the state of this org's approval
		},
		collections: {
			config: [{
				static_collection_config: {
					name: "myCollection-v1",
					member_orgs_policy: {
						// signatures are parsed to peer cli syntax (string) if possible,
						// else fabric syntax (object)
						signature_policy: "OR('Org1MSP.ADMIN', 'Org2MSP.MEMBER')"
					},
					required_peer_count: 1,
					maximum_peer_count: 5,
					block_to_live: 1,
					member_only_read: true,
					member_only_write: false,
					endorsement_policy: {
						// signatures are parsed to peer cli syntax (string) if possible,
						// else fabric syntax (object)
						signature_policy: "OR('Org1MSP.ADMIN', 'Org2MSP.MEMBER')"
					},
				}
			}]
		},
		endorsementPlugin: "escc",
		initRequired: true,
		name: "marbles",
		sequence: 1,
		validationParameter: "/Channel/Application/Endorsement",
		validationPlugin: "vscc"
		version: "1"
	},
	stitch_msg: "ok"       // error/success message for your req
	grpc_resp: {
		status: 0,     // status code from the grpc call
		statusMessage: "", // status message from the grpc call
		headers: {},   // headers in the grpc response
		message: {},   // "ConfigEnvelope" protobuf
		trailers: {}   // trailers in the grpc response
	},
}
```


<a name="lc_getAllChaincodeDefinitionsOnChannel"></a>

### D9. lc_getAllChaincodeDefinitionsOnChannel()
Get all chaincode definitions committed to a specific channel.
- Requires Fabric 2.0 system chaincode `_lifecycle`
- This method serves the same purpose as the peer CLI command `peer lifecycle chaincode querycommitted`

**Syntax**:
```js
const opts: {

	// string - msp id. example: PeerOrg1
	msp_id: "Org1MSP",

	// string - the org's signed cert in a base 64 encoded PEM format
	client_cert_b64pem: "<b64 pem string>",

	// string - the orgs private key in a base 64 encoded PEM format
	client_prv_key_b64pem: "<b64 pem string>",

	// string - http/https **grpc-web** endpoint to reach your peer
	host: "http://peer_url.com:port",

	// [optional] integer - client side timeout of this request (milliseconds)
	// defaults 10000 = (10 seconds)
	timeout_ms: 1234

	// - - - - - - - - - - - - - - - - - - - - - - - - - - -

	// string - id of the channel
	channel_id: "first"
}
stitch.lc_getAllChaincodeDefinitionsOnChannel(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	      // true if the call encountered an error, else false
	msp_id: "PeerOrg1",    // same msp id provide in input args
	host: "http://peer_url.com:8080", // the "host" used for this call
	data: {	              // the response, not available if "error" is true
		chaincodeDefinitions: [{
			collections: {},
			endorsementPlugin: "escc",
			initRequired: true,
			name: "marbles",
			sequence: 1,
			validationParameter: "/Channel/Application/Endorsement",
			validationPlugin: "vscc"
			version: "1"
		}]
	},
	stitch_msg: "ok"       // error/success message for your req
	grpc_resp: {
		status: 0,     // status code from the grpc call
		statusMessage: "", // status message from the grpc call
		headers: {},   // headers in the grpc response
		message: {},   // "ConfigEnvelope" protobuf
		trailers: {}   // trailers in the grpc response
	},
}
```





***
# E - Fabric CA Methods

<a name="getCaIdentities"></a>

### E1. getCaIdentities()
This method will return enroll ids aka identities that have been registered on a Fabric CA.

**Syntax**:
```js
const opts = {
	client_cert_b64pem: "string", // the org's signed cert in a base 64 encoded PEM format
	client_prv_key_b64pem: "string", // the orgs private key in a base 64 encoded PEM format
	host: "http://ca_url.com:8080", // url to ca. include proto & port
	ca_name: 'ca', // name of the CA within the server
};
stitch.getCaIdentities(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	function_name: "getCaIdentities",
	error: false,	    // true if the call encountered an error, else false
	host: "http://ca_url.com:8080", // the "host" used for this call
	stitch_msg: "ok",  // error/success message for your req
	data: {	             // the CA's response, not available if "error" was true
		ca_name: 'ca',
		identities: [{
			affiliation: "",
			attrs: [{
				name: "hf.Revoker", value: "1"
			}],
			id: "org_id",
			max_enrollments: -1,
			type: "client"
		}]
	},

	// only exist if "error" is true or log level is debug
	// returned as is from the CA's response
	http_resp: {
		errors: [],   // array of errors,
		messages:[],  // array of messages
		result: {},  // typically the relevant data for the api
		success: false,  // bool
	}
}
```


<a name="getCaAffiliations"></a>

### E2. getCaAffiliations()
This method will return affiliations that have exist on a Fabric CA.

**Syntax**:
```js
const opts = {
	client_cert_b64pem: "string", // the org's signed cert in a base 64 encoded PEM format
	client_prv_key_b64pem: "string", // the orgs private key in a base 64 encoded PEM format
	host: "http://ca_url.com:8080", // url to ca. include proto & port
	ca_name: 'ca', // name of the CA within the server
};
stitch.getCaAffiliations(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	function_name: "getCaAffiliations",
	error: false,	    // true if the call encountered an error, else false
	host: "http://ca_url.com:8080", // the "host" used for this call
	stitch_msg: "ok",  // error/success message for your req
	data: {	             // the CA's response, not available if "error" was true
		ca_name: 'ca',
		affiliations: [{
			affiliations: [{
				name: "org2.department1"
			}],
			name: "org2"
		}]
	},

	// only exist if "error" is true or log level is debug
	// returned as is from the CA's response
	http_resp: {
		errors: [],   // array of errors,
		messages:[],  // array of messages
		result: {},  // typically the relevant data for the api
		success: false,  // bool
	}
}
```


<a name="registerCaIdentity"></a>

### E3. registerCaIdentity()
This method will return register an enroll id aka identity on a Fabric CA.
Use this to initially "create" the identity.

**Syntax**:
```js
const opts = {
	client_cert_b64pem: "string", // the org's signed cert in a base 64 encoded PEM format
	client_prv_key_b64pem: "string", // the orgs private key in a base 64 encoded PEM format
	host: "http://ca_url.com:8080", // url to ca. include proto & port
	ca_name: 'ca', // name of the CA within the server

	new_identity: {
		enroll_id: "some_guy",
		enroll_secret: "password",
		ca_name: "ca",
		affiliation: null,
		attrs: null,
		type: null,
		max_enrollments: 0
	}
};
stitch.registerCaIdentity(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	function_name: "registerCaIdentity",
	error: false,	    // true if the call encountered an error, else false
	host: "http://ca_url.com:8080", // the "host" used for this call
	stitch_msg: "ok",  // error/success message for your req
	data: {	             // the CA's response, not available if "error" was true
		ca_name: 'ca',
		affiliations: [{
			affiliations: [{
				name: "org2.department1"
			}],
			name: "org2"
		}]
	},

	// only exist if "error" is true or log level is debug
	// returned as is from the CA's response
	http_resp: {
		errors: [],   // array of errors,
		messages:[],  // array of messages
		result: {},  // typically the relevant data for the api
		success: false,  // bool
	}
}
```


<a name="enrollCaIdentity"></a>

### E4. enrollCaIdentity()
This method will enroll an identity on a Fabric CA given an enroll id and secret.
It will generate and return a private key and signed cert.
Use this to create useable crypto material for an identity.

**Syntax**:
```js
const opts = {
	host: "http://ca_url.com:8080", // url to ca. include proto & port
	ca_name: 'ca', // name of the CA within the server

	enroll_id: "some_guy",
	enroll_secret: "password",

	// [optional] array of SANs aka "Subject Alt Names"
	// format [{ <type>: <value> }]
	// supported types: "dns", "rfc822", "dn", "uri", "ip"
	// (if ip, only ipv4 is supported)
	ext:  {
		subjectAltName: [
			{ dns: 'example.com' },
			{ dns: 'ibm.com' }
		]
	}

	// [optional] if you want control over the subject, use this to set your own
	// normally this should not be set and the subject will default to:
	// 'CN=' + opts.enroll_id
	manual_subject: "CN=batman,C=USA,O=IBM,ST=NorthCarolina"
};
stitch.enrollCaIdentity(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	function_name: "enrollCaIdentity",
	error: false,	    // true if the call encountered an error, else false
	host: "http://ca_url.com:8080", // the "host" used for this call
	stitch_msg: "ok",  // error/success message for your req
	data: {	             // the CA's response, not available if "error" was true
		Cert: "<base 64 encoded PEM cert>", // this is the signed cert! (signed pub key)
		ServerInfo: {
			CAName: "ca",
			CAChain: "<base 64 encoded PEM cert>",
			IssuerPublicKey: "<base 64 encoded PEM cert>",
			IssuerRevocationPublicKey: "<base 64 encoded PEM cert>",
			Version: "",
		},
		generated:{
			client_pub_key_b64pem: "<base 64 encoded PEM cert>",
			client_prv_key_b64pem: "<base 64 encoded PEM cert>",
			subject_dn: "CN=some_guy"
		}
	},

	// only exist if "error" is true or log level is debug
	// returned as is from the CA's response
	http_resp: {
		errors: [],   // array of errors,
		messages:[],  // array of messages
		result: {},  // typically the relevant data for the api
		success: false,  // bool
	}
}
```


<a name="reenrollCaIdentity"></a>

### E5. reenrollCaIdentity()
This method will enroll an identity on a Fabric CA given a public cert and private key.
Use this to create useable crypto material for an identity.

**Syntax**:
```js
const opts = {
	client_cert_b64pem: "string", // the org's signed cert in a base 64 encoded PEM format
	client_prv_key_b64pem: "string", // the orgs private key in a base 64 encoded PEM format
	host: "http://ca_url.com:8080", // url to ca. include proto & port
	ca_name: 'ca', // name of the CA within the server
};
stitch.reenrollCaIdentity(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	function_name: "reenrollCaIdentity",
	error: false,	    // true if the call encountered an error, else false
	host: "http://ca_url.com:8080", // the "host" used for this call
	stitch_msg: "ok",  // error/success message for your req
	data: {	             // the CA's response, not available if "error" was true
		Cert: "<base 64 encoded PEM cert>", // this is the signed cert! (signed pub key)
		ServerInfo: {
			CAName: "ca",
			CAChain: "<base 64 encoded PEM cert>",
			IssuerPublicKey: "<base 64 encoded PEM cert>",
			IssuerRevocationPublicKey: "<base 64 encoded PEM cert>",
			Version: "",
		},
		generated:{
			client_cert_b64pem: "<base 64 encoded PEM cert>",
			client_prv_key_b64pem: "<base 64 encoded PEM cert>",
			subject_dn: "CN=some_guy"
		}
	},

	// only exist if "error" is true or log level is debug
	// returned as is from the CA's response
	http_resp: {
		errors: [],   // array of errors,
		messages:[],  // array of messages
		result: {},  // typically the relevant data for the api
		success: false,  // bool
	}
}
```


<a name="deleteCaIdentity"></a>

### E6. deleteCaIdentity()
This method will delete an identity on a Fabric CA.
The calling identity (the one described by `client_cert_b64pem`) must have the attribute **hf.Registrar**.

**Syntax**:
```js
const opts = {
	enroll_id: 'some_guy',  // [optional] the identity to delete, else pulled form the client_cert_b64pem
	client_cert_b64pem: "string", // the org's signed cert in a base 64 encoded PEM format
	client_prv_key_b64pem: "string", // the orgs private key in a base 64 encoded PEM format
	host: "http://ca_url.com:8080", // url to ca. include proto & port
	ca_name: 'ca', // name of the CA within the server
};
stitch.deleteCaIdentity(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	function_name: "deleteCaIdentity",
	error: false,	    // true if the call encountered an error, else false
	host: "http://ca_url.com:8080", // the "host" used for this call
	stitch_msg: "ok",  // error/success message for your req
	data: {	             // the CA's response, not available if "error" was true
		// ? format unknown, id removal is disabled on CA's i've tried - dsh todo
	},

	// only exist if "error" is true or log level is debug
	// returned as is from the CA's response
	http_resp: {
		errors: [],   // array of errors,
		messages:[],  // array of messages
		result: {},  // typically the relevant data for the api
		success: false,  // bool
	}
}
```





***

# F - Other Fabric Methods

<a name="getChannelsOnPeer"></a>

### F1. getChannelsOnPeer()
This method will list the channels that a **peer has joined.**

**Syntax**:
```js
const opts = {
	msp_id: "PeerOrg1",	   //  msp id to use
	client_cert_b64pem: "string", // the org's signed cert in a base 64 encoded PEM format
	client_prv_key_b64pem: "string", // the orgs private key in a base 64 encoded PEM format
	host: "http://peer_url.com:8080", // *grpc-web* url to peer. include proto & port
	timeout_ms: 10000,     // [optional] client timeout override for this request, defaults 10sec
};
stitch.getChannelsOnPeer(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	    // true if the call encountered an error, else false
	msp_id: "PeerOrg1",    // same msp id provide in input args
	host: "http://peer_url.com:8080", // the "host" used for this call
	data: {	            // the response, not available if "error" is true
		channelsList: [{
			channelId: "" // name of the channel
		}]
	},
	stitch_msg: "ok",     // error/success message for your req
	grpc_resp: {  // only exist if "error" is true or log level is debug
		status: 0,  // status code from the grpc call
		statusMessage: "", // status message from the grpc call
		headers: {},  // headers in the grpc response
		message: {},  // "ChannelQueryResponse" protobuf
		trailers: {}  // trailers in the grpc response
	},
}
```


<a name="getChannelConfigFromPeer"></a>

### F2. getChannelConfigFromPeer()
This method will get the latest config block of a channel.
The peer must have already joined the channel.

**Syntax**:
```js
const opts = {
	msp_id: "PeerOrg1",	   //  msp id to use
	client_cert_b64pem: "string", // the org's signed cert in a base 64 encoded PEM format
	client_prv_key_b64pem: "string", // the orgs private key in a base 64 encoded PEM format
	host: "http://peer_url.com:8080", // *grpc-web* url to peer. include proto & port
	channel_id: "defaultchannel",   // id of the channel
	timeout_ms: 10000,     // [optional] client timeout override for this request, defaults 10sec

	// [optional] type of block decoder to use.
	// defaults "v1"
	// "v1" - legacy protoc decoder. key names get suffixes like "groups_map" and "metadata_list"
	// "v2" - protobuf.js decoder. key names are normal (camelCase)
	// "v3" - protobuf.js decoder. key names are normal (underscores) [configtxlator format]
	// "none" - will not decode.
	decoder: 'v3',
};
stitch.getChannelConfigFromPeer(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	      // true if the call encountered an error, else false
	msp_id: "PeerOrg1",    // same msp id provide in input args
	host: "http://peer_url.com:8080", // the "host" used for this call
	data: {	              // the response, not available if "error" is true
		channel_id: "defaultchannel",   // id of the channel
		config_block: {}, // decoded config "Block"
	},
	stitch_msg: "ok"       // error/success message for your req
	grpc_resp: {         // only exist if "error" is true or log level is debug
		status: 0,     // status code from the grpc call
		statusMessage: "", // status message from the grpc call
		headers: {},   // headers in the grpc response
		message: {},   // "ConfigEnvelope" protobuf
		trailers: {},   // trailers in the grpc response
	},
}
```


<a name="getChannelConfigBlockFromOrderer"></a>

### F3. getChannelConfigBlockFromOrderer()
This method will get the latest config block of a channel from **an orderer**.
Your MSP must already be a member of the channel.

**Syntax**:
```js
const opts = {
	msp_id: "PeerOrg1",	   //  msp id to use
	client_cert_b64pem: "string", // the org's signed cert in a base 64 encoded PEM format
	client_prv_key_b64pem: "string", // the orgs private key in a base 64 encoded PEM format
	orderer_host: "http://orderer_url.com:8081", // *grpc-web* url to orderer. include proto & port
	channel_id: "defaultchannel",   // id of the channel
	include_bin: false, // [optional] defaults false, if true response will include protobuf

	// [optional] type of block decoder to use.
	// defaults "v1"
	// "v1" - legacy protoc decoder. key names get suffixes like "groups_map" and "metadata_list"
	// "v2" - protobuf.js decoder. key names are normal (camelCase)
	// "v3" - protobuf.js decoder. key names are normal (underscores) [configtxlator format]
	// "none" - will not decode.
	decoder: 'v3',
};
stitch.getChannelConfigBlockFromOrderer(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	    // true if the call encountered an error, else false
	msp_id: "PeerOrg1",    // same msp id provide in input args
	orderer_host: "http://orderer_url.com:8081", // the "orderer_host" used for this call
	data: {	            // the response, not available if "error" is true
		channel_id: "defaultchannel",   // id of the channel
		config_block: {}, // decoded config "Block"
	},
	stitch_msg: "ok"       // error/success message for your req
	grpc_resp: {   // only exist if "error" is true or log level is debug
		status: 0,  // status code from the grpc call
		statusMessage: "", // status message from the grpc call
		headers: {},  // headers in the grpc response
		message: {},  // "ConfigEnvelope" protobuf
		trailers: {},  // trailers in the grpc response
	},
	grpc_message: [],  // pb(binary) message. only exists if "include_bin" is true
}
```


<a name="getChannelInfoFromPeer"></a>

### F4. getChannelInfoFromPeer()
This method will get "channelInfo" (fabric term not mine).
The peer must have already joined the channel.
Typically this api is used for block height.

**Syntax**:
```js
const opts = {
	msp_id: "PeerOrg1",	   //  msp id to use
	client_cert_b64pem: "string", // the org's signed cert in a base 64 encoded PEM format
	client_prv_key_b64pem: "string", // the orgs private key in a base 64 encoded PEM format
	host: "http://peer_url.com:8080", // *grpc-web* url to peer. include proto & port
	channel_id: "defaultchannel",   // id of the channel
	include_bin: false, // [optional] defaults false, if true response will include protobuf
	timeout_ms: 10000,     // [optional] client timeout override for this request, defaults 10sec
};
stitch.getChannelInfoFromPeer(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	    // true if the call encountered an error, else false
	msp_id: "PeerOrg1",    // same msp id provide in input args
	host: "http://peer_url.com:8080", // the "host" used for this call
	data: {	            // the response, not available if "error" is true
		channel_id: "defaultchannel",   // id of the channel
		currentblockhash: "",
		height: 0,        // block height
		previousblockhash: ""
	},
	stitch_msg: "ok"       // error/success message for your req
	grpc_resp: {   // only exist if "error" is true or log level is debug
		status: 0,   // status code from the grpc call
		statusMessage: "", // status message from the grpc call
		headers: {},  // headers in the grpc response
		message: {},  // "BlockchainInfo" protobuf
		trailers: {}  // trailers in the grpc response
	},
	grpc_message: [],  // pb(binary) message. only exists if "include_bin" is true
}
```


<a name="getChannelsGenesisFromOrderer"></a>

### F5. getChannelsGenesisFromOrderer()
This method will get the genesis block **from an orderer**.

**Syntax**:
```js
const opts = {
	msp_id: "PeerOrg1",	   //  msp id to use
	client_cert_b64pem: "string", // the org's signed cert in a base 64 encoded PEM format
	client_prv_key_b64pem: "string", // the orgs private key in a base 64 encoded PEM format
	orderer_host: "http://orderer_url.com:8081", // *grpc-web* url to orderer. include proto & port
	channel_id: "defaultchannel",   // id of the channel
	include_bin: false, // [optional] defaults false, if true response will include protobuf
};
stitch.getChannelsGenesisFromOrderer(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	    // true if the call encountered an error, else false
	msp_id: "PeerOrg1",    // same msp id provide in input args
	host: "http://peer_url.com:8080", // the "host" used for this call
	data: {	            // the response, not available if "error" is true
		channel_id: "defaultchannel",   // id of the channel
		block: {},   // decoded genesis "Block"
	},
	stitch_msg: "ok"       // error/success message for your req
	grpc_resp: {
		status: 0,   // status code from the grpc call
		statusMessage: "", // status message from the grpc call
		headers: {},  // headers in the grpc response
		message: {},  // "DeliverResponse" protobuf
		trailers: {}  // trailers in the grpc response
	},
}
```


<a name="joinPeerToChannel"></a>

### F6. joinPeerToChannel()
This method will join your peer to a channel. It requires a peer and orderer endpoint.
The **certificate used must be an admin cert** that the peer recognizes.

**Syntax**:
```js
const opts = {
	msp_id: "PeerOrg1",	   //  msp id to use
	client_cert_b64pem: "string", // the org's signed cert in a base 64 encoded PEM format (admin cert)
	client_prv_key_b64pem: "string", // the orgs private key in a base 64 encoded PEM format (admin cert)
	host: "http://peer_url.com:8080", // *grpc-web* url to peer. include proto & port
	batch_hosts: ["http://peer_url.com:8080"],  // array of http/https **grpc-web** endpoint to reach your peer (if present "host" is ignored)
	orderer_host: "http://orderer_url.com:8081", // *grpc-web* url to orderer. include proto & port
	channel_id: "defaultchannel",   // id of the channel
	timeout_ms: 25000,     // [optional] client timeout override for this request, defaults 25sec
};
stitch.joinPeerToChannel(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format** (for non-batch mode):
```js
{
	error: false,	    // true if the call encountered an error, else false
	msp_id: "PeerOrg1",    // same msp id provide in input args
	host: "http://peer_url.com:8080", // the "host" used for this call
	orderer_host: "http://orderer_url.com:8081", // the "orderer_host" used for this call
	data: {	            // the response, not available if "error" is true
		channel_id: "defaultchannel",   // id of the channel
	},
	stitch_msg: "ok"       // error/success message for your req
	grpc_resp: { // only exist if "error" is true or log level is debug
		status: 0,   // status code from the grpc call
		statusMessage: "", // status message from the grpc call
		headers: {},  // headers in the grpc response
		message: {},  // "ProposalResponse" protobuf
		trailers: {}  // trailers in the grpc response
	},
}
```

**Response/Error Format** (for batch mode):
Same as above, but its an array of those objects. 1 per entry of `batch_hosts`.


<a name="getChannelBlockFromPeer"></a>

### F7. getChannelBlockFromPeer()
This method will return a block from the **peer's** ledger.
The peer must have already joined the channel.


**Syntax**:
```js
const opts = {
	msp_id: "PeerOrg1",	   //  msp id to use
	client_cert_b64pem: "string", // the org's signed cert in a base 64 encoded PEM format
	client_prv_key_b64pem: "string", // the orgs private key in a base 64 encoded PEM format
	host: "http://peer_url.com:8080", // *grpc-web* url to peer. include proto & port
	channel_id: "defaultchannel",   // id of the channel
	block_number: 4,              // integer of the block to get, blocks start at 0
	include_bin: false, // [optional] defaults false, if true response will include protobuf
	timeout_ms: 10000,     // [optional] client timeout override for this request, defaults 10sec

	// [optional] type of block decoder to use.
	// defaults "v1"
	// "v1" - legacy protoc decoder. key names get suffixes like "groups_map" and "metadata_list"
	// "v2" - protobuf.js decoder. key names are normal (camelCase)
	// "v3" - protobuf.js decoder. key names are normal (underscores) [configtxlator format]
	// "none" - will not decode.
	decoder: 'v3',
stitch.getChannelBlockFromPeer(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	    // true if the call encountered an error, else false
	msp_id: "PeerOrg1",    // same msp id provide in input args
	host: "http://peer_url.com:8080", // the "host" used for this call
	data: {	            // the response, not available if "error" is true
		channel_id: "defaultchannel",   // id of the channel
		block: {},   // decoded "Block"
	},
	stitch_msg: "ok"       // error/success message for your req
	grpc_resp: { // only exist if "error" is true or log level is debug
		status: 0,   // status code from the grpc call
		statusMessage: "", // status message from the grpc call
		headers: {},  // headers in the grpc response
		message: {},  // "Block" protobuf
		trailers: {},  // trailers in the grpc response,
	},
	grpc_message: [],  // pb(binary) message. only exists if "include_bin" is true
}
```


<a name="parseChaincodePackage"></a>

### F8. parseChaincodePackage()
This method will parse and decode a chaincode package.

**Syntax**:
```js
const parsed = stitch.parseChaincodePackage(chaincode_package);
```

**Returns**:
```js
{

	name: "",    // chaincode id
	version: "", // chaincode version
	path: "",    // chaincode path
	type: "",    // chaincode type, ex "golang"
	timeout: 0,
	input: []
}
```


<a name="pbToJson"></a>

### F9. pbToJson()
Convert a protobuf to json with configtxlator.

**Syntax**:
```js
const opts = {
  // http endpoint to a configtxlator, include protocol and port
  cfxl_host: 'https://configtxlator.com:8122',

  // protobuf - <Uint8Array>
  data: pb,

  // name of protobuf to transform. should match msg found in fabric's common.proto
  message_type: 'Block' || 'Config' || 'Envelope' // etc..
};
stitch.pbToJson(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
// json here.  will match the format of your protobuf
}
```


<a name="getTransactionById"></a>

### F10. getTransactionById()
This method will get transaction data for a transaction ID.
The peer must have already joined the channel.

**Syntax**:
```js
const opts = {
	msp_id: "PeerOrg1",	   //  msp id to use
	client_cert_b64pem: "string", // the org's signed cert in a base 64 encoded PEM format
	client_prv_key_b64pem: "string", // the orgs private key in a base 64 encoded PEM format
	host: "http://peer_url.com:8080", // *grpc-web* url to peer. include proto & port
	channel_id: "defaultchannel",   // id of the channel
	tx_id: 'cf76cbdbc79a567cd2e19536e37d3801a9fd0af5bd655e8ab8267f450bcb9cea',  // transaction id
	timeout_ms: 10000,     // [optional] client timeout override for this request, defaults 10sec
};
stitch.getTransactionById(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	    // true if the call encountered an error, else false
	msp_id: "PeerOrg1",    // same msp id provide in input args
	host: "http://peer_url.com:8080", // the "host" used for this call
	data: {	            // the response, not available if "error" is true
		channel_id: "defaultchannel",
		tx_id: "cf76cbdbc79a567cd2e19536e37d3801a9fd0af5bd655e8ab8267f450bcb9cea", // same "tx_id" in input args
		transaction: {}, // transaction data in here as an object
	},
	stitch_msg: "ok"       // error/success message for your req
	grpc_resp: { // only exist if "error" is true or log level is debug
		status: 0,   // status code from the grpc call
		statusMessage: "", // status message from the grpc call
		headers: {},  // headers in the grpc response
		message: {},  // "ProposalResponse" protobuf
		trailers: {}  // trailers in the grpc response
	},
}
```


<a name="buildConfigUpdateTemplateNewChannel"></a>

### F11. buildConfigUpdateTemplateNewChannel()
This method will return a template of a config update message for a new channel.
It will return JSON.
This is a **template**, it is intended to be modified to describe your channel.

**Syntax**:
```js
const opts: {

	// id of the channel
	channel_id: "defaultchannel",

	// id of the consortium, must match existing consortium, case sensitive
	consortium_id: "SampleConsortium"

	// array of MSP IDs that will belong to the channel
	application_msp_ids: ["PeerOrg1"],

	// fabric version, ("1.0" || "1.2" || "1.3")
	fabric_version: "1.1",
};
const config_update = stitch.buildConfigUpdateTemplateNewChannel(b_opts);
```

**Return Format**:
```js
{
	// JSON is too large to show, just try it
}
```


<a name="configUpdateJsonToBinary"></a>

### F12. configUpdateJsonToBinary()
This method will convert a config update message from json to binary (Uint8Array).
This is a precursor to signing the config update.
The format of this JSON is the camelCase version of Fabric's ["ConfigUpdate"](https://github.com/hyperledger/fabric/blob/release-1.3/protos/common/configtx.proto#L78) message.


**Syntax**:
```js
stitch.configUpdateJsonToBinary(config_update, (err, binary) => {
	// your callback code here
});
```

**Response/Error Format**:
```js
[
	// Uint8Array is too large to show
]
```


<a name="configUpdateBinaryToJson"></a>

### F13. configUpdateBinaryToJson()
This method will convert a config update message from binary to json.
The format of this JSON is the camelCase version of Fabric's ["ConfigUpdate"](https://github.com/hyperledger/fabric/blob/release-1.3/protos/common/configtx.proto#L78) message.

**Syntax**:
```js
stitch.configUpdateBinaryToJson(config_update, (err, json) => {
	// your callback code here
});
```

**Response/Error Format**:
```js
{
	// JSON is too large to show
}
```


<a name="signConfigUpdate"></a>

### F14. signConfigUpdate()
This method will sign a ["ConfigUpdate"](https://github.com/hyperledger/fabric/blob/release-1.3/protos/common/configtx.proto#L78) protobuf.
It returns a ["ConfigSignature"](https://github.com/hyperledger/fabric/blob/release-1.3/protos/common/configtx.proto#L111) protobuf that has been encoded to a base 64 string.

**Syntax**:
```js
const opts = {
	msp_id: "PeerOrg1",	   //  msp id to use
	client_cert_b64pem: "string", // the org's signed cert in a base 64 encoded PEM format
	client_prv_key_b64pem: "string", // the orgs private key in a base 64 encoded PEM format
	protobuf: binary, // a config update message in binary (Uint8Array) or a base 64 string
};
stitch.signConfigUpdate(opts, (_, config_signature_as_b64) => {
	// your callback code here
});
```

**Response Format**:
```js
"bG9sLCBnb29kIGpvYg=="
```


<a name="submitConfigUpdate"></a>

### F15. submitConfigUpdate()
This method will submit a config update message to the orderer.
Use this method to create and edit channels.
The format of config update message is defined by Fabric's ["ConfigUpdate"](https://github.com/hyperledger/fabric/blob/release-1.3/protos/common/configtx.proto#L78) message.

**Syntax**:
```js
const opts = {
	msp_id: "PeerOrg1",	   //  msp id to use
	client_cert_b64pem: "string", // the org's signed cert in a base 64 encoded PEM format
	client_prv_key_b64pem: "string", // the orgs private key in a base 64 encoded PEM format
	orderer_host: "http://orderer_url.com:8081", // *grpc-web* url to orderer. include proto & port
	config_update: message,   // a config update message in binary (Uint8Array) OR a base 64 string
	config_update_signatures: [config_signature_as_b64], // array of base64 string signatures
};
stitch.submitConfigUpdate(opts, (err, resp) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	    // true if the call encountered an error, else false
	msp_id: "PeerOrg1",    // same msp id provide in input args
	orderer_host: "http://orderer_url.com:8081", // the "orderer_host" used for this call
	data: {	            // the response, not available if "error" is true
		channel_id: "myNewChannel",   // id of the channel
	},
	stitch_msg: "ok"       // error/success message for your req
	grpc_resp: { // only exist if "error" is true or log level is debug
		status: 0,   // status code from the grpc call
		statusMessage: "", // status message from the grpc call
		headers: {},  // headers in the grpc response
		message: {},  // "ProposalResponse" protobuf
		trailers: {}  // trailers in the grpc response
	},
}
```


<a name="buildSigCollectionAuthHeader"></a>

### F16. buildSigCollectionAuthHeader()
This method will create the needed header to authenticate to athena signature collection APIs.
The callback response is the value to set for the `Authorization` header.
You are signing over your signature collection request body.
See the [athena sig collection apis](https://github.ibm.com/IBM-Blockchain/athena/blob/master/docs/signature_collection_apis.md#3-store-signature-collection-tx) for more details.

**Syntax**:
```js
const reqBody = {               // set the exact body you are going to send to athena
	tx_id: "abcd",
	proposal: "<protobuf as base 64>",
	distribute: "all",
	channel: "first",
	orderers: ["192.168.1.0:1000"],
	orgs2sign: [
		{
			msp_id: "org1",
			optools_url: "http://some.athena.ibm.com:443/api/v1",
			timeout_ms: 10000,
			signature: "dummy",
			timestamp: 0,
			admin: false
		}
	],
	orderers2sign: [{}],
	authorize: {
		msp_id: 'org1',
		certificate:            // make sure this field is set! its part of the auth
		'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUI1VENDQVl1Z0F3SUJBZ0lVQlV3dDM4TExmWkpoVTNwV1M3MUVEVG5Samd3d0NnWUlLb1pJemowRUF3SXcKUlRFb01Ba0dBMVVFQ3hNQ1kyRXdDZ1lEVlFRTEV3TnBZbkF3RHdZRFZRUUxFd2hRWldWeVQzSm5NVEVaTUJjRwpBMVVFQXhNUVlXUnRhVzVRWldWeVQzSm5NVU5CTVRBZUZ3MHhPVEF6TVRJeE16STFNREJhRncweU1EQXpNVEV4Ck16TXdNREJhTUQ0eExEQU5CZ05WQkFzVEJtTnNhV1Z1ZERBS0JnTlZCQXNUQTJsaWNEQVBCZ05WQkFzVENGQmwKWlhKUGNtY3hNUTR3REFZRFZRUURFd1ZoWkcxcGJqQlpNQk1HQnlxR1NNNDlBZ0VHQ0NxR1NNNDlBd0VIQTBJQQpCQUVybXluNGFBKzM1MHYwMnlZYlFrQmdhWU05bHlPUUdwYXNkbmxnMFdvU21HWHJhV3NWbi82S2tmUWVDSEs0ClBjSk9MWnAwa2NlZFB4OG12ZTdoMDgrallEQmVNQTRHQTFVZER3RUIvd1FFQXdJSGdEQU1CZ05WSFJNQkFmOEUKQWpBQU1CMEdBMVVkRGdRV0JCUURTTTNWYmVCOHVhd29aajUrWjZsQ2ZSdEpXakFmQmdOVkhTTUVHREFXZ0JSbwpPVTM4c1p6SkZYd1VYdTR4T01aVkJ6c3EzREFLQmdncWhrak9QUVFEQWdOSUFEQkZBaUVBNTA0VERBaDQwK3VICld0dDBRMVhkdGZhcVo2VmFzbnBQZ3lTS0g3T0lPQXNDSUYxeU9IS3NmYld2WTByZW0wdjliZk9DYUlNakFDaTcKWm4zdG1pU2c0dk1UCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0KCg==',
	},
	originator_msp: "org1",
	json_diff: {},
	current_policy: {
		number_of_signatures: 1
	}
};
stitch.buildSigCollectionAuthHeader(reqBody, client_prv_key_b64pem, (_, header) => {

});
```

**Response Format**:
The callback returns the header in the 2nd argument, example:
`"Signature MEUCIQD5C/SdOXIh9ZRJOj2AtRCkmo40KjIESeLFWJTa3NfPNwIgDGPuaNRZeYcHX3hvVVUnDNCIFHtkTEUZApPzylY9YjI="`


<a name="calculateConfigUpdatePb"></a>

### F17. calculateConfigUpdatePb()
This method will create a delta between two config blocks.
It will return the delta as binary.
This is used to ultimately build a proposal that will change the config block fields such as policies, and consenters.

**Syntax**:
```js
const opts = {
	cfxl_host: 'https://example.com',  // configtxlator url includes proto + host + port

	// do not send the entire block. just the config part.
	// configtxlator expects underscores instead of camel case
	original_json: stitch.camelCase_2_underscores(block.data.data[0].payload.data.config),
	updated_json: stitch.camelCase_2_underscores(updated.data.data[0].payload.data.config),
	channel_id: 'testchainid',  // system channel id
};
stitch.calculateConfigUpdatePb(opts, (err, b_configUpdate) => {
	// your callback code here
});
```

**Response/Error Format**:
```js
// config update in binary
```


<a name="getChannelBlockFromOrderer"></a>

### F18. getChannelBlockFromOrderer()
This method will return a range of blocks from the **orderer**.

**Syntax**:
```js
const opts = {
	msp_id: "OrdererOrg",	   //  msp id to use
	client_cert_b64pem: "string", // the org's signed cert in a base 64 encoded PEM format
	client_prv_key_b64pem: "string", // the orgs private key in a base 64 encoded PEM format
	orderer_host: "http://orderer_url.com:8080", // *grpc-web* url to orderer. include proto & port
	channel_id: "testchainid",   // id of the channel

	// if the start and stop block are the same, 1 block is returned
	// if they are both null, the latest block (highest) is returned
	// if stop block is null, the block starting from start_block and up to the latest are returned
	start_block: 4,   // integer of the first block to get (blocks start at 0)
	stop_block: 5,    // integer of the last block to get (the stop block is included in response)

	include_bin: false, // [optional] defaults false, if true response will include protobuf as bin

	// [optional] type of block decoder to use.
	// defaults "v1"
	// "v1" - legacy protoc decoder. key names get suffixes like "groups_map" and "metadata_list"
	// "v2" - protobuf.js decoder. key names are normal (camelCase)
	// "v3" - protobuf.js decoder. key names are normal (underscores) [configtxlator format]
	// "none" - will not decode.
	decoder: 'v1',
};
stitch.getChannelBlockFromOrderer(opts, (err, data) => {
	const c_opts = {
		cfxl_host: 'https://configtxlator-example.dev.blockchain.test.cloud.ibm.com',
		data: data.grpc_message,
		message_type: 'Block'
	};
	stitch.pbToJson(c_opts, (error, json) => {
		console.log('block error', error);
		console.log('block json', json);
	});
});
```

**Response/Error Format**:
```js
[{  // note this is an array! 1 entry per block that was requested
	error: false,	    // true if the call encountered an error, else false
	msp_id: "OrdererOrg",    // same msp id provide in input args
	orderer_host: "http://orderer_url.com:8080", // the "host" used for this call
	data: {	            // the response, not available if "error" is true
		channel_id: "defaultchannel",   // id of the channel
		block: {},   // decoded "Block"
	},
	stitch_msg: "ok"       // error/success message for your req
	grpc_resp: { // only exist if "error" is true or log level is debug
		status: 0,   // status code from the grpc call
		statusMessage: "", // status message from the grpc call
		headers: {},  // headers in the grpc response
		message: {},  // "Block" protobuf
		trailers: {},  // trailers in the grpc response
	},
	grpc_message: [],  // pb(binary) message. only exists if "include_bin" is true
}]
```


<a name="conformPolicySyntax"></a>

### F19. conformPolicySyntax()
Build or check a Fabric signature policy from some other syntax.
If the format was parsable it will return the policy as an object in the format of a Fabric `SignaturePolicyEnvelope`, else it returns `null`.
The response follows the Fabric structure of a [SignaturePolicyEnvelope](https://github.com/hyperledger/fabric-protos/blob/release-2.1/common/policies.proto#L28) (but as a JS object).

See the [signature policy syntax doc](./sig_policy_syntax.md) for more syntax details.

**Syntax**:
```js
// send the policy in 1 of the approved syntaxes
let policy = stitch.conformPolicySyntax(`AND('Org1.admin', 'Org2.member'))`);
```

**Returns**:
```js
// on error
policy = null

// on success
policy = {
	'version': 1,
	'rule': {
		'nOutOf': {
			'n': 2,
			'rules': [
				{
					'signedBy': 0
				},
				{
					'signedBy': 1
				},
			]
		}
	},
	'identities': [
		{
			'principalClassification': 'ROLE'
			'principal': {
				'mspIdentifier': 'Org1',
				'role': 'ADMIN'
			}
		},
		{
			'principalClassification': 'ROLE'
			'principal': {
				'mspIdentifier': 'Org2',
				'role': 'MEMBER'
			}
		}
	]
}
```


<a name="convertPolicy2PeerCliSyntax"></a>

### F20. convertPolicy2PeerCliSyntax()
Convert a Fabric signature policy to the Peer CLI syntax (string).
The input should be the JSON version of a Fabric `SignaturePolicyEnvelope` protobuf.

See the [signature policy syntax doc](./sig_policy_syntax.md) for more syntax details.

**Syntax**:
```js
const policy = {
	'version': 0,
	'rule': {
		'nOutOf': {
			'n': 2,
			'rules': [
				{'signedBy': 0},
				{
					'nOutOf': {
						'n': 1,
						'rules': [
							{'signedBy': 1},
							{
								'nOutOf': {
									'n': 2,
									'rules': [
										{'signedBy': 2},
										{'signedBy': 3}
									]
								}
							},
							{'signedBy': 3}
						]
					}
				}
			]
		}
	},
	'identities': [
		{
			'principalClassification': 'ROLE'
			'principal': {
				'mspIdentifier': 'Org1',
				'role': 'ADMIN'
			}
		},
		{
			'principalClassification': 'ROLE'
			'principal': {
				'mspIdentifier': 'Org2',
				'role': 'MEMBER'
			}
		},
		{
			'principalClassification': 'ROLE'
			'principal': {
				'mspIdentifier': 'Org1',
				'role': 'MEMBER'
			}
		},
		{
			'principalClassification': 'ROLE'
			'principal': {
				'mspIdentifier': 'Org3',
				'role': 'MEMBER'
			}
		}
	]
};
let policy_str = stitch.convertPolicy2PeerCliSyntax(policy);
```

**Returns**:
```js
// on error
policy_str = null

// on success
policy_str = "AND('Org1.ADMIN', OR('Org2.MEMBER', AND('Org1.MEMBER', 'Org3.MEMBER'), 'Org3.MEMBER'))"
```

<a name="policyIsMet"></a>

### F21. policyIsMet()
Test if a policy is met.
The `policy` input should be the JSON version of a Fabric `SignaturePolicyEnvelope` protobuf.
The `approvals` input should be a dictionary of approvals.

**Important note:** the `approvals` dictionary must include the correct roles (see example below for syntax).
Otherwise default roles of `PEER` will be used when evaluating these approvals against the provided policy.

Multiple roles per approval are not supported, but you can duplicate the key for each role to get around this limitation.
It is already understood that a policy with a role of `MEMBER` is satisfied with an approval of `ADMIN`, `PEER` or `MEMBER`.

See the [signature policy syntax doc](./sig_policy_syntax.md) for more syntax details.

**Syntax**:
```js
const policy = {
	'version': 0,
	'rule': {
		'nOutOf': {
			'n': 2,
			'rules': [
				{'signedBy': 0},
				{
					'nOutOf': {
						'n': 1,
						'rules': [
							{'signedBy': 1},
							{
								'nOutOf': {
									'n': 2,
									'rules': [
										{'signedBy': 2},
										{'signedBy': 3}
									]
								}
							},
							{'signedBy': 3}
						]
					}
				}
			]
		}
	},
	'identities': [
		{
			'principalClassification': 'ROLE'
			'principal': {
				'mspIdentifier': 'Org1',
				'role': 'PEER'
			}
		},
		{
			'principalClassification': 'ROLE'
			'principal': {
				'mspIdentifier': 'Org2',
				'role': 'PEER'
			}
		},
		{
			'principalClassification': 'ROLE'
			'principal': {
				'mspIdentifier': 'Org3',
				'role': 'PEER'
			}
		},
		{
			'principalClassification': 'ROLE'
			'principal': {
				'mspIdentifier': 'Org4',
				'role': 'PEER'
			}
		}
	]
};
// [example 1] - roles are provided
const approvals = {  // keys follow the format of "mspId.role"
	'Org1.PEER': true,
	'Org2.MEMBER': false,
	'Org3.MEMBER': true,
	'Org4.PEER': false,
}
let is_met = stitch.policyIsMet(policy, approvals);

// [example 2] - roles are not provided, will default each missing role to "PEER"
const approvals = {  // keys follow the format of "mspId"
	'Org1': true,
	'Org2': false,
	'Org3': true,
	'Org4': false,
}
let is_met = stitch.policyIsMet(policy, approvals);
```

**Returns**:
```js
// on error
is_met = null

// on success
is_met = true
```

<a name="decodeBlockV2"></a>

### F22. decodeBlockV2()
Decode a block using the v2 method (this v2 is unrelated to fabric v2).
This is an alternate block decoder.

**Syntax**:
```js
// convert the camelcase field names to underscores if you want a configtxlator like output
const block_json = camelCase_2_underscores(decodeBlockV2(b_payload), null));
```

**Returns**:
```js
{
	"data": {
		"data": [{
			"payload": {
				"data": {
					"config": {
						"channel_group": {
							// removed for brevity
						},
						"sequence": 3
					},
					"last_update": {
						// removed for brevity
					}
				}
			}
		}],
		"header": {},
		"metadata": {}
	}
}
```

<a name="getOSNChannels"></a>

### G1. getOSNChannels()
Get list of channels from a OSN using the Fabric's osnadmin http request.
Uses the athena proxy route to handle mutual tls.
Requires fabric 2.4.1+.

**Syntax**:
```js
const opts = {

	// *https* osnadmin url to the orderer. include proto & port
	host: "https://osn_url.com:7053",

	// the identity's certificate & private key, base 64 encoded PEM
	// used for mutual tls as the client's auth
	certificate_b64pem: my_identity_cert,
	private_key_b64pem: my_identityprivate_key,

	//root certificates, each are base 64 encoded PEM
	// dsh todo not used atm
	root_cert_b64pem: my_ca_root_cert1,

	// timeout for this request (the proxy route will use this to time request to node)
	// dsh todo
	timeout_ms: 10000
};

stitch.getOSNChannels(opts, (err, data) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	    // true if the call encountered an error, else false
	proxy_url: "http://peer_url.com:8080/participation/v1/channels", // the final destination url used for this call
	data: {	            // the response, not available if "error" is true
		channels: [
			name: "mychannel", // channel name
			url: "/participation/v1/channels/mychannel",
		],
		systemChannel: {   // is null if no systemChannel
			name: "system", // the system channel name
			url: "/participation/v1/channels/mychannel",
		}
	},
	stitch_msg: "ok"       // error/success message for your req
}
```

<a name="getOSNChannel"></a>

### G2. getOSNChannel()
Get channel details from a OSN using the Fabric's osnadmin http request.
Uses the athena proxy route to handle mutual tls.
Requires fabric 2.4.1+.

**Syntax**:
```js
const opts = {

	// the channel name to look up
	channel: "mychannel",

	// *https* osnadmin url to the orderer. include proto & port
	host: "https://osn_url.com:7053",

	// the identity's certificate & private key, base 64 encoded PEM
	// used for mutual tls as the client's auth
	certificate_b64pem: my_identity_cert,
	private_key_b64pem: my_identityprivate_key,

	//root certificates, each are base 64 encoded PEM
	// dsh todo not used atm
	root_cert_b64pem: my_ca_root_cert1,

	// timeout for this request (the proxy route will use this to time request to node)
	// dsh todo
	timeout_ms: 10000
};

stitch.getOSNChannel(opts, (err, data) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	    // true if the call encountered an error, else false
	proxy_url: "http://peer_url.com:8080/participation/v1/channels", // the final destination url used for this call
	data: {	            // the response, not available if "error" is true
		name: "mychannel", // channel name
		url: "/participation/v1/channels/mychannel",
		status: "active", // "active" or "inactive" or "onboarding" or "failed"
		consensusRelation: "consenter" // "consenter" or "follower" or "config-tracker" or "other"
		height: 0,  // block height of the channel
	},
	stitch_msg: "ok"       // error/success message for your req
}
/* below is pulled from fabric:
// "active" - The orderer is active in the channel's consensus protocol, or following the cluster,
// with block height > the join-block number. (Height is last block number +1).

// "onboarding" - The orderer is catching up with the cluster by pulling blocks from other orderers,
// with block height <= the join-block number.

// "inactive" - The orderer is not storing any blocks for this channel.

// "failed" - The last orderer operation against the channel failed.

for more info on response:
	https://github.com/hyperledger/fabric/blob/main/orderer/common/types/channelinfo.go
*/
```

<a name="joinOSNChannel"></a>

### G3. joinOSNChannel()
Join a OSN using the Fabric's osnadmin http request.
Uses the athena proxy route to handle mutual tls.
Requires fabric 2.4.1+.

**Syntax**:
```js
const opts = {

	// binary data of genesis block for the channel
	// <Uint8Array>
	b_config_block: bin,

	// *https* osnadmin url to the orderer. include proto & port
	host: "https://osn_url.com:7053",

	// the identity's certificate & private key, base 64 encoded PEM
	// used for mutual tls as the client's auth
	certificate_b64pem: my_identity_cert,
	private_key_b64pem: my_identityprivate_key,

	//root certificates, each are base 64 encoded PEM
	// dsh todo not used atm
	root_cert_b64pem: my_ca_root_cert1,

	// timeout for this request (the proxy route will use this to time request to node)
	// dsh todo
	timeout_ms: 10000
};

stitch.joinOSNChannel(opts, (err, data) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	    // true if the call encountered an error, else false
	proxy_url: "http://peer_url.com:8080/participation/v1/channels", // the final destination url used for this call
	data: {	            // the response, not available if "error" is true
		name: "mychannel", // channel name
		url: "/participation/v1/channels/mychannel",
		status: "active", // "active" or "inactive" or "onboarding" or "failed"
		consensusRelation: "consenter" // "consenter" or "follower" or "config-tracker" or "other"
		height: 0,  // block height of the channel
	},
	stitch_msg: "ok"       // error/success message for your req
}
```

<a name="unjoinOSNChannel"></a>

### G4. unjoinOSNChannel()
Remove a OSN using the Fabric's osnadmin http request.
Uses the athena proxy route to handle mutual tls.
Requires fabric 2.4.1+.

**Syntax**:
```js
const opts = {

	// the channel name to leave
	channel: "mychannel",

	// *https* osnadmin url to the orderer. include proto & port
	host: "https://osn_url.com:7053",

	// the identity's certificate & private key, base 64 encoded PEM
	// used for mutual tls as the client's auth
	certificate_b64pem: my_identity_cert,
	private_key_b64pem: my_identityprivate_key,

	//root certificates, each are base 64 encoded PEM
	// dsh todo not used atm
	root_cert_b64pem: my_ca_root_cert1,

	// timeout for this request (the proxy route will use this to time request to node)
	// dsh todo
	timeout_ms: 10000
};

stitch.unjoinOSNChannel(opts, (err, data) => {
	// your callback code here - see format of "err" & "resp" below
});
```

**Response/Error Format**:
```js
{
	error: false,	    // true if the call encountered an error, else false
	proxy_url: "http://peer_url.com:8080/participation/v1/channels", // the final destination url used for this call
	data: {},  // no data is passed...
	stitch_msg: "ok"       // error/success message for your req
}
```



***
# Common Flows

<a name="createChannel"></a>

### 1. Create a channel
Creating a new application channel is 5 steps.
1. Create your config update json (this contains your policies/ACLs/capabilities/block cutting params/etc)
2. Convert your config update json to a protobuf (binary/Uint8Array)
3. _[Optional]_ Convert the config update protobuf to a base 64 string. _(Do this step if you need to save the config update as text, ie to some database.)_
4. Sign your config update _(input can be base 64 string or binary)_
5. Submit the config update to the orderer _(input can be base 64 string or binary)_

**Syntax**:
```js
// 1. build channel update json
const opts = {
	// fabric channel ids can only contain lower case alphanumeric characters + dots and dashes
	channel_id: 'first',
	consortium_id: 'SampleConsortium',
	application_msp_ids: ['PeerOrg1'],
	fabric_version: '1.1',
};
const config_update = stitch.buildConfigUpdateTemplateNewChannel(opts);

// add a custom SignaturePolicy (this is an example)
config_update.writeSet.groups.Application.policies.Admins.policy = {
	type: 1, // 1 for SignaturePolicy, 3 for ImplicitMetaPolicy
	value: {
		identities: [{
			principal: {
				mspIdentifier: 'PeerOrg1',
				role: 'ADMIN'
			}
		}],
		rule: {
			nOutOf: {
				n: 1,
				rules: [{
					signedBy: 0
				}]
			}
		}
	}
};

// the format of the config update JSON is the same as Fabric

// 2. convert channel update json to protobuf
stitch.configUpdateJsonToBinary(config_update, (err, bin) => {

	// 3. convert protobuf to base 64 to make it portable (ex we can save b64 to a database)
	const b64_string = stitch.uint8ArrayToBase64(bin);

	// 4. sign channel update string
	const s_opts = {
		client_cert_b64pem: org1_cert,  // this is my cert in base 64 encoded PEM
		client_prv_key_b64pem: org1_private_key,  // this is my private key in base 64 encoded PEM
		protobuf: b64_string,
		msp_id: 'PeerOrg1',
	};
	stitch.signConfigUpdate(s_opts, (err, config_signature_as_b64) => {

		// 5. submit channel update protobuf
		const c_opts = {
			msp_id: 'PeerOrg1',
			client_cert_b64pem: org1_cert,
			client_prv_key_b64pem: org1_private_key,
			orderer_host: orderer_url,  // this is a url to a grpc-web proxy for my orderer
			config_update: b64_string,
			config_update_signatures: [config_signature_as_b64],
		};
		stitch.submitConfigUpdate(c_opts, (err, resp) => {
			if (err || !resp || !resp.data) {

				// error
				console.error(err, resp);
			} else {

				// success
				console.log('new channel resp:', resp, JSON.stringify(resp.data, null, 2));
			}
		});
	});
});
```

<a name="createChannelOSN"></a>

### 2. Create a channel w/OSNadmin
Creating a new application channel on with the osnadmin feature is 3 steps.
1. Create a config block
2. Convert your config block json to a protobuf (binary/Uint8Array)
3. Submit the config block to the join channel api on the OSN

DSH this does not work yet 2022-02-18 - dsh todo

**Syntax**:
```js
// 1. build channel update json
const opts = {
	// fabric channel ids can only contain lower case alphanumeric characters + dots and dashes
	channel_id: 'first',
	consortium_id: 'SampleConsortium',
	application_msp_ids: ['PeerOrg1'],
	fabric_version: '2.0',		// channel capabilities - dsh todo rename
};
const config_update = stitch.buildConfigUpdateTemplateNewChannel(opts);

// add a custom SignaturePolicy (this is an example)
config_update.writeSet.groups.Application.policies.Admins.policy = {
	type: 1, // 1 for SignaturePolicy, 3 for ImplicitMetaPolicy
	value: {
		identities: [{
			principal: {
				mspIdentifier: 'Org1MSP',
				role: 'ADMIN'
			}
		}],
		rule: {
			nOutOf: {
				n: 1,
				rules: [{
					signedBy: 0
				}]
			}
		}
	}
};

// the format of the config update JSON is the same as Fabric

// 2. convert channel update json to protobuf
stitch.configUpdateJsonToBinary(config_update, (err, bin) => {

	// 3. submit join channel api (aka create channel)
	const c_opts = {
		host: orderer_url,
		certificate_b64pem: identity_cert,
		private_key_b64pem: identity_private_key,
		root_cert_b64pem: tls_root_cert,
		b_config_block: bin,
	};
	stitch.joinOSNChannel(c_opts, (err, resp) => {
		if (err || !resp || !resp.data) {

			// error
			console.error(err, resp);
		} else {

			// success
			console.log('new channel resp:', resp, JSON.stringify(resp.data, null, 2));
		}
	});

});
```
