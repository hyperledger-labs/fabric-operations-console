# Changes from v0 to v1

1. `sign()` is removed. Use `scSign()` instead. now async.
	- not in use by apollo
	- why? - changed signature gen to use subtle crypto. their interface is different.
1. `verifySignature()` is removed. Use scVerifySignature instead.
	- not in use by apollo
	- why? - changed signature validation to use subtle crypto. their interface is different.
1. `buildSigCollectionAuthHeader()` is now async.
	- **in use by apollo**
	- why? - changed signature generation to use subtle crypto. their signature method is async.
1. `encrypt()` is *being removed*. Use `scEncrypt()` instead. now async.
	- **in use by apollo**
	- why? cryptojs is going to be removed at some point, switching to web subtle crypto
1. `decrypt()` is *being removed*. Use `scDecrypt()` instead. now async.
	- **in use by apollo**
	- why? cryptojs is going to be removed at some point, switching to web subtle crypto
1. `isTrustedCertificate()` is now async.
	- **in use by apollo**
	- why? jsrsasign is gone, using web subtle crypto
1. `genKeyPair()` is removed. Use `scGenEcdsaKeys` instead. now async.
	- not in use by apollo
