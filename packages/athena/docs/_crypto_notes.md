# Crypto Notes

Our crypto dependency breakdown as we transition to new modules/libs.
Last updated 05/15/2020.

### Libs for v2.1.3-x:

1. "Crypto" (node.js `v8`) - https://nodejs.org/api/crypto.html (FIPS complaint if nodejs image is FIPS)
	- [back end] used to generate api key secrets (only applies to IBP Software)
	- [back end] used to create hashes over signature collection tasks

2. "jsrsasign" `v8.0.12` (node.js & browser) [this lib also includes CryptoJs v3.1.2] - https://www.npmjs.com/package/jsrsasign
	- [back end] used to parse PEM certificates
	- [back end] used to help validate signatures on signature collection tasks
	- [front end] used to encrypt/decrypt wallet data for browser local storage
	- [front end] used to generate public/private keys
	- [front end] used to generate signatures for Fabric proposals
	- [front end] used to generate CSRs
	- [front end] used to generate hash for a Fabric CA task
	- [front end] used to parse PEM certificates & pub/private keys
	- [back end] used to help validate IAM signatures on IAM access tokens for IBM Cloud (only applies to IBP SaaS)

3. "elliptic.js" `v6.4.1` (node.js & browser) - https://www.npmjs.com/package/elliptic
	- [back end] used to help validate Fabric (identity) signatures on signature collection tasks
	- [front end] used to generate signatures for Fabric proposals

4. "jsSHA.js" `v2.3.1` (browser)
	- [front end] used to generate hashes on Fabric proposals


### Libs for v2.5.x:

1. "Crypto"  (node.js `v8`) - https://nodejs.org/api/crypto.html (FIPS complaint if nodejs image is FIPS)
	- [back end] used to generate api key secrets (only applies to IBP Software)
	- [back end] used to create hashes over signature collection tasks

2. "jsrsasign" `v8.0.15` (node.js) [this lib also includes CryptoJs v4.0.0] - https://www.npmjs.com/package/jsrsasign
	- [back end] used to parse PEM certificates
	- [back end] used to help validate signatures on signature collection tasks
	- [back end] used to help validate IAM signatures on IAM access tokens for IBM Cloud (only applies to IBP SaaS)
	- (potentially we can get rid of this module, tbd)

3. "jsSHA.js" `v2.3.1` (browser) - https://www.npmjs.com/package/jssha
	- [front end] used to generate hashes on Fabric proposals

4. "Web SubtleCrypto" (browser) - https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto (this "lib" is implemented in the browser itself, thus no version)
	- [front end] used to encrypt/decrypt wallet data for browser storage
	- [front end] used to generate public/private keys
	- [front end] used to generate signatures for Fabric proposals
	- [front end] used to generate CSRs
	- [front end] used to generate hash for a Fabric CA task

5. "CryptoJs" `v4.0.0` (browser) - https://www.npmjs.com/package/crypto-js
	- [front end] used to decrypt legacy wallet data for browser local storage
	- (this is being phased out, so we will eventually remove this, many releases from now)

6. "asn1.js" `v5.3.0` (browser) - https://www.npmjs.com/package/asn1.js
	- [front end] used to parse PEM certificates, pub/private keys, and signatures
