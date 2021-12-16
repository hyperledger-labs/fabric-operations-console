
# Certificates Are Confusing

This page is a work in progress. Trying to get a better handle on what cert is what by providing examples.


### CA Root-Cert
- aka `ca_root_cert` (if its an array name `ca_root_certs`)
- not for tls
- not the tls ca root cert
- can be found in the /cainfo route on a ca (with `?ca=ca`)
- all identities from this CA can be validated against this cert (their public cert should be signed by this cert)
- deployer calls this `msp.component.cacerts` (an array of strings)

```js
	ca_root_cert = {
		base_64_pem: 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNDVENDQWErZ0F3SUJBZ0lVSDBhWERYVHlPN1pBeEoxeEVFODhDV3RscCtBd0NnWUlLb1pJemowRUF3SXcKV2pFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRSwpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVFzd0NRWURWUVFERXdKallUQWVGdzB5Ck1EQXpNVGt4TXpFME1EQmFGdzB6TlRBek1UWXhNekUwTURCYU1Gb3hDekFKQmdOVkJBWVRBbFZUTVJjd0ZRWUQKVlFRSUV3NU9iM0owYUNCRFlYSnZiR2x1WVRFVU1CSUdBMVVFQ2hNTFNIbHdaWEpzWldSblpYSXhEekFOQmdOVgpCQXNUQmtaaFluSnBZekVMTUFrR0ExVUVBeE1DWTJFd1dUQVRCZ2NxaGtqT1BRSUJCZ2dxaGtqT1BRTUJCd05DCkFBUW9OODU2aGZISjZjWGl3Y3RNMFJFc1V5ZTVwNElRbEdPSjhZN1BURzZjZWlHbEROamNOYWpla01GajlRUzcKU2lrbjN5aTNJemY3MVdSR0xmbWszcHZmbzFNd1VUQU9CZ05WSFE4QkFmOEVCQU1DQVFZd0R3WURWUjBUQVFILwpCQVV3QXdFQi96QWRCZ05WSFE0RUZnUVVZWXYzcUtBZjdLY3BLaFppbis1NVpoa0lhT2d3RHdZRFZSMFJCQWd3CkJvY0Vmd0FBQVRBS0JnZ3Foa2pPUFFRREFnTklBREJGQWlFQTlCVDNmb0ErMFlhbFBrNEZ3eFBlYlJyaGJWa24KaHd4aTl5cm1zQjlpb3pVQ0lEMC8rYUloQkt2S0FIaWExaTFMZE1UalU2bEZLbUY1TnYrZkNxRmYzNFVDCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K',
		issuer: '/C=US/ST=North Carolina/O=Hyperledger/OU=Fabric/CN=ca',
		not_after_ts: 2057663640000,
		not_before_ts: 1584623640000,
		serial_number_hex: '1f46970d74f23bb640c49d71104f3c096b65a7e0',
		signature_algorithm: 'SHA256withECDSA',
		subject: '/C=US/ST=North Carolina/O=Hyperledger/OU=Fabric/CN=ca',
		subject_alt_names: ['IP', '127.0.0.1'],
		subject_parts: {
			C: 'US',
			CN: 'ca',    //   <---- saas will usually set "ca"
			O: 'Hyperledger',
			OU: 'Fabric',
			ST: 'North Carolina'
		},
		time_left: '5473.9 days',
		X509_version: 3,
		issuer: 'ordererorgca-ca, Hyperledger', // <- issuer name usually has "-ca"
	}
```

### TLS-CA Root-Cert
- aka `tls_ca_root_cert` (if its an array name `tls_ca_root_certs`)
- bubbles up to the field `tlsCACerts` in a "connection profile"
- this is not the same TLS cert used on the /cainfo endpoint...
- its important for fabric operations for reasons (I *think* this cert could validate all tls certs issued by this ca that are being used by other components, like peers and orderers)
- can be found in the /cainfo route on a ca (with `?ca=tlsca`)
- deployer calls this `msp.tls.cacerts` (an array of strings)

```js
	tls_ca_root_cert = {
		"base_64_pem": "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUIvakNDQWFTZ0F3SUJBZ0lVUVA0bUNkS3M5Mkx6R1RJSGVJRVFTdlZHT0hjd0NnWUlLb1pJemowRUF3SXcKWFRFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRSwpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVE0d0RBWURWUVFERXdWMGJITmpZVEFlCkZ3MHlNREF6TVRreE16RTBNREJhRncwek5UQXpNVFl4TXpFME1EQmFNRjB4Q3pBSkJnTlZCQVlUQWxWVE1SY3cKRlFZRFZRUUlFdzVPYjNKMGFDQkRZWEp2YkdsdVlURVVNQklHQTFVRUNoTUxTSGx3WlhKc1pXUm5aWEl4RHpBTgpCZ05WQkFzVEJrWmhZbkpwWXpFT01Bd0dBMVVFQXhNRmRHeHpZMkV3V1RBVEJnY3Foa2pPUFFJQkJnZ3Foa2pPClBRTUJCd05DQUFTRk45cEdhRm9nbldEU3dVQVNvUy82SXcwT2dDS3hFMFBqTGhpYUFweFkwaVNJRng2UkcycTUKcHJNZFc4Zk9LMkJKZUJoYU1iR3BTTm4vNFZFaCtNanZvMEl3UURBT0JnTlZIUThCQWY4RUJBTUNBUVl3RHdZRApWUjBUQVFIL0JBVXdBd0VCL3pBZEJnTlZIUTRFRmdRVUljdUduVVFlamRralBOdWNhK0RDT0Z4TXhPd3dDZ1lJCktvWkl6ajBFQXdJRFNBQXdSUUloQU8vTGlhKzMrYkdGU2VGUjZweEJQMlIyd3BqUkxBZDNzY2thcklEa2gwK2IKQWlBRHhQNW9BeEFabVJjY09TMG9kZmxVNXJCa0JuU0JZK053cis2OFdadXc4dz09Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K",
		"issuer": "/C=US/ST=North Carolina/O=Hyperledger/OU=Fabric/CN=tlsca",
		"not_after_ts": 2057663640000,
		"not_before_ts": 1584623640000,
		"serial_number_hex": "40fe2609d2acf762f31932077881104af5463877",
		"signature_algorithm": "SHA256withECDSA",
		"subject": "/C=US/ST=North Carolina/O=Hyperledger/OU=Fabric/CN=tlsca",
		"subject_alt_names": null,  // <--- usually does not have SANs
		"subject_parts": {
			"C": "US",
			"CN": "tlsca",    //   <---- saas will usually set or append "tlsca"
			"O": "Hyperledger",
			"OU": "Fabric",   //   <---- saas will usually set "Fabric"
			"ST": "North Carolina"
		},
		"time_left": "5473.9 days",
		"X509_version": 3,
		"issuer": "ordererorgca-tlsca, Hyperledger", // <- issuer name usually has "-tlsca"
	}
```

### CA's TLS Cert
- aka `tls_cert`
- is used for tls (including the /cainfo endpoint)
- can be found in deployer's get-component-api response
- deployer calls this `msp.tls.signcerts` (a string)

```js
	ca_tls_cert = {
		"base_64_pem": "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNvRENDQWthZ0F3SUJBZ0lSQUxuM2FuUEZyT2k2enlKWS9PZ3dRQ3d3Q2dZSUtvWkl6ajBFQXdJd2dhY3gKQ3pBSkJnTlZCQVlUQWxWVE1SY3dGUVlEVlFRSUV3NU9iM0owYUNCRFlYSnZiR2x1WVRFUE1BMEdBMVVFQnhNRwpSSFZ5YUdGdE1Rd3dDZ1lEVlFRS0V3TkpRazB4RXpBUkJnTlZCQXNUQ2tKc2IyTnJZMmhoYVc0eFN6QkpCZ05WCkJBTVRRbTQ1TmpRd056QXRZMkV4TG1saWNIWXlMWFJsYzNRdFkyeDFjM1JsY2k1MWN5MXpiM1YwYUM1amIyNTAKWVdsdVpYSnpMbUZ3Y0dSdmJXRnBiaTVqYkc5MVpEQWVGdzB5TURBek1Ua3hNekU1TURoYUZ3MHpNREF6TVRjeApNekU1TURoYU1JR25NUXN3Q1FZRFZRUUdFd0pWVXpFWE1CVUdBMVVFQ0JNT1RtOXlkR2dnUTJGeWIyeHBibUV4CkR6QU5CZ05WQkFjVEJrUjFjbWhoYlRFTU1Bb0dBMVVFQ2hNRFNVSk5NUk13RVFZRFZRUUxFd3BDYkc5amEyTm8KWVdsdU1Vc3dTUVlEVlFRREUwSnVPVFkwTURjd0xXTmhNUzVwWW5CMk1pMTBaWE4wTFdOc2RYTjBaWEl1ZFhNdApjMjkxZEdndVkyOXVkR0ZwYm1WeWN5NWhjSEJrYjIxaGFXNHVZMnh2ZFdRd1dUQVRCZ2NxaGtqT1BRSUJCZ2dxCmhrak9QUU1CQndOQ0FBUnJUdzAzMHFvekZBU0wwcWhMUC83SDRRUDRaS2FHc2l3R2xZZjhmWU9lMllUd3BxUjYKZnZIc0lUUUIrTTFZT0p2NGNCL0N0cmN2N3VieWFFRXN4OEI3bzFFd1R6Qk5CZ05WSFJFRVJqQkVna0p1T1RZMApNRGN3TFdOaE1TNXBZbkIyTWkxMFpYTjBMV05zZFhOMFpYSXVkWE10YzI5MWRHZ3VZMjl1ZEdGcGJtVnljeTVoCmNIQmtiMjFoYVc0dVkyeHZkV1F3Q2dZSUtvWkl6ajBFQXdJRFNBQXdSUUloQU02SkFpNE9jQUJ2OWo1TEZVaDEKN1NleE83STNOMFhIb0tqdlFFaFo2VFFQQWlBRlVIUWtjL1pZV0FSTU1aNzdJTlB4K1RxSWdLd0E5TkVLUzNmTgp3RW5EcEE9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==",
		"issuer": "/C=US/ST=North Carolina/L=Durham/O=IBM/OU=Blockchain/CN=n964070-ca1.ibpv2-test-cluster.us-south.containers.appdomain.cloud",
		"not_after_ts": 1899983948000,
		"not_before_ts": 1584623948000,
		"serial_number_hex": "00b9f76a73c5ace8bacf2258fce830402c",
		"signature_algorithm": "SHA256withECDSA",
		"subject": "/C=US/ST=North Carolina/L=Durham/O=IBM/OU=Blockchain/CN=n964070-ca1.ibpv2-test-cluster.us-south.containers.appdomain.cloud",
		"subject_alt_names": [   // <--- usually has a few SANs
			"DNS",
			"n964070-ca1.ibpv2-test-cluster.us-south.containers.appdomain.cloud"
		],
		"subject_parts": {
			"C": "US",
			"CN": "n964070-ca1.ibpv2-test-cluster.us-south.containers.appdomain.cloud", // <- seems to match the domain
			"L": "Durham",
			"O": "IBM",
			"OU": "Blockchain",
			"ST": "North Carolina"
		},
		"time_left": "3648.9 days",
		"X509_version": 3,
		"issuer": "ordererorgca-tlsca, Hyperledger", // <- issuer name usually has "-tlsca"
	}
```

### Orderer's TLS Cert
- aka `tls_cert`
- is used for tls
- it also seems to identify the orderer in fabric operations - *maybe*
- can be found in deployer's get-component-api response
- deployer calls this `msp.tls.signcerts` (a string)

```js
	orderer_tls_cert = {
		"base_64_pem": "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNYakNDQWdXZ0F3SUJBZ0lVWmtMdkkyWCtTRkduVk4xeUdRRjRsSnVDcDI0d0NnWUlLb1pJemowRUF3SXcKWFRFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRSwpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVE0d0RBWURWUVFERXdWMGJITmpZVEFlCkZ3MHlNREF6TVRreE16SXlNREJhRncweU1UQXpNVGt4TXpJM01EQmFNQ0V4RHpBTkJnTlZCQXNUQm1Oc2FXVnUKZERFT01Bd0dBMVVFQXhNRllXUnRhVzR3V1RBVEJnY3Foa2pPUFFJQkJnZ3Foa2pPUFFNQkJ3TkNBQVEwaHFJeApobFlGbk9iNlh6Rk5qcnJQSlFVWHRGUW5KSU00Qk9TZGRBb01RWDlJTlo2QkZSSlVDMjdITEpOOFhkSFFOaVFxCmp3M3JTWDlHK0t4WWRxQjZvNEhlTUlIYk1BNEdBMVVkRHdFQi93UUVBd0lEcURBZEJnTlZIU1VFRmpBVUJnZ3IKQmdFRkJRY0RBUVlJS3dZQkJRVUhBd0l3REFZRFZSMFRBUUgvQkFJd0FEQWRCZ05WSFE0RUZnUVVVbUlYcmYydwo5YUhmcXZFaEhoYXQyZHBjTVA4d0h3WURWUjBqQkJnd0ZvQVVJY3VHblVRZWpka2pQTnVjYStEQ09GeE14T3d3ClhBWURWUjBSQkZVd1U0SkxiamsyTkRBM01DMXZjekZ0YTNOeWJtOWtaVEV1YVdKd2RqSXRkR1Z6ZEMxamJIVnoKZEdWeUxuVnpMWE52ZFhSb0xtTnZiblJoYVc1bGNuTXVZWEJ3Wkc5dFlXbHVMbU5zYjNWa2h3Ui9BQUFCTUFvRwpDQ3FHU000OUJBTUNBMGNBTUVRQ0lIR3QvVjNyYmJTRkxRVG0yVzZQU1Z4RjYrcU5TWW5XbVlDa2lzbHAybVVKCkFpQlFBaDJlMUlEVEVGdVJhbkVVZmZOQ2FQK2ZHU2RNaTkxVFdoYzNJRGhRYkE9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==",
		"issuer": "/C=US/ST=North Carolina/O=Hyperledger/OU=Fabric/CN=tlsca",
		"not_after_ts": 1616160420000,
		"not_before_ts": 1584624120000,
		"serial_number_hex": "6642ef2365fe4851a754dd72190178949b82a76e",
		"signature_algorithm": "SHA256withECDSA",
		"subject": "/OU=client/CN=admin",
		"subject_alt_names": [ // <--- will likely have a few SANs
			"DNS",
			"n964070-os1mksrnode1.ibpv2-test-cluster.us-south.containers.appdomain.cloud"
		],
		"subject_parts": {
			"CN": "admin",    // <---- this will match the enroll id used
			"OU": "client"
		},
		"time_left": "364.0 days",
		"X509_version": 3,
		"issuer": "ordererorgca-ca, Hyperledger", // <- issuer name usually has "-ca"
	}
```

### Peer's TLS Cert
- aka `tls_cert`
- is used for tls
- can be found in deployer's get-component-api response
- deployer calls this `msp.tls.signcerts` (a string)

```js
	peer_tls_cert = {
		"base_64_pem": "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNWekNDQWY2Z0F3SUJBZ0lVY2ZtdkwrZjJqM084M2RmYVhldGk0aVQyckh3d0NnWUlLb1pJemowRUF3SXcKWFRFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRSwpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVE0d0RBWURWUVFERXdWMGJITmpZVEFlCkZ3MHlNREF6TVRreE16SXhNREJhRncweU1UQXpNVGt4TXpJMk1EQmFNQ0V4RHpBTkJnTlZCQXNUQm1Oc2FXVnUKZERFT01Bd0dBMVVFQXhNRllXUnRhVzR3V1RBVEJnY3Foa2pPUFFJQkJnZ3Foa2pPUFFNQkJ3TkNBQVIrREJjNwpneXozK1dQUktMWFBnSURIckovQTNReTVYb0lFR3dJTXZ4SkEyQnZ2MUxzZGpDVXAxS24rZndmWDZ1T0RaemhmCktWRisyVEozOCtjVnZ1Q2FvNEhYTUlIVU1BNEdBMVVkRHdFQi93UUVBd0lEcURBZEJnTlZIU1VFRmpBVUJnZ3IKQmdFRkJRY0RBUVlJS3dZQkJRVUhBd0l3REFZRFZSMFRBUUgvQkFJd0FEQWRCZ05WSFE0RUZnUVVJelViUklQQQprWUNia2RlTDNWN3FJa2phNU5Rd0h3WURWUjBqQkJnd0ZvQVVJY3VHblVRZWpka2pQTnVjYStEQ09GeE14T3d3ClZRWURWUjBSQkU0d1RJSkViamsyTkRBM01DMXdaV1Z5TVM1cFluQjJNaTEwWlhOMExXTnNkWE4wWlhJdWRYTXQKYzI5MWRHZ3VZMjl1ZEdGcGJtVnljeTVoY0hCa2IyMWhhVzR1WTJ4dmRXU0hCSDhBQUFFd0NnWUlLb1pJemowRQpBd0lEUndBd1JBSWdYTUViK1RYcGlPQzNaeGFqc0xPMlZmaHdScmUrK1FxcUdoRys1S20vY1BVQ0lDV1gvV1M4CnNna21jYVdkZTdRUXVyOWp6ZDdVejRReHI3WG5OU2JSelc3bgotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCgo=",
		"issuer": "/C=US/ST=North Carolina/O=Hyperledger/OU=Fabric/CN=tlsca",
		"not_after_ts": 1616160360000,
		"not_before_ts": 1584624060000,
		"serial_number_hex": "71f9af2fe7f68f73bcddd7da5deb62e224f6ac7c",
		"signature_algorithm": "SHA256withECDSA",
		"subject": "/OU=client/CN=admin",
		"subject_alt_names": [ // <--- will likely have a few SANs
			"DNS",
			"n964070-peer1.ibpv2-test-cluster.us-south.containers.appdomain.cloud"
		],
		"subject_parts": {
			"CN": "admin", 	// <---- this will match the enroll id used
			"OU": "client"
		},
		"time_left": "363.9 days",
		"X509_version": 3,
		"issuer": "ordererorgca-ca, Hyperledger", // <- issuer name usually has "-ca"
	}
```

### Orderer's Enrollment Cert
- aka `ecert`
- is used by the component for fabric signatures (internal to fabric)
- can be found in deployer's get-component-api response
- deployer calls this `msp.component.signcerts` (a string)

### Peer's Enrollment Cert
- aka `ecert`
- is used by the component for fabric signatures (internal to fabric)
- can be found in deployer's get-component-api response
- deployer calls this `msp.component.signcerts` (a string)

### Orderer's Admin Certs
- aka `admincerts`
- this is the list of certificates that can perform elevated actions
- can be found in deployer's get-component-api response
- deployer calls this `msp.component.admincerts` (an array of strings)

### Peer's Admin Certs
- aka `admincerts`
- this is the list of certificates that can perform elevated actions
- can be found in deployer's get-component-api response
- deployer calls this `msp.component.admincerts` (an array of strings)

### Other
- Deployers response as of v3:
	```js
	// "msp" is at root of response

	"msp": {
		"tls": {
			"cacerts": [""], // aka TLS-CA root-cert
			"signcerts": "" // aka comp's TLS cert
		},
		"component": {
			"cacerts": [""], // aka CA root-cert
			"admincerts": [""], // aka comp's admin certs
			"signcerts": "", // aka comp's ecert
		}
	}

	// only ca's have this format:
	"msp": {
		"ca": {
			"signcerts": "", // aka CA root-cert
		},
		"tlsca": {
			"signcerts": "", // aka TLS-CA root-cert
		}
	}
	```

- Athena's **internal** structure as of v3:
	```js
	{
		// all fields are at root of component doc, whole doc structure is not shown

		"tls_ca_root_certs" : [""],  // aka TLS-CA root-cert
		"ca_root_certs" : [""],  // aka CA root-cert - **new in v3**
		"tls_cert": "",    // aka comp's TLS cert
		"ecert": "",     // aka comp's ecert
		"admin_certs": [""], // aka comp's admin certs

		"intermediate_certs": [""] // aka intermediate CA root-cert
		"tls_intermediate_certs": [""] // aka intermediate TLS-CA root-cert
	}
	```
- Athena's **external** (response) structure as of v3:
	```js
	{
		// [orderer, peer, ca]
		// field "msp" is at root of a component doc, whole doc structure is not shown

		"msp": {
			"ca":{
				"root_certs": [""],  // aka CA root-cert
			},
			"tlsca":{
				"root_certs": [""],  // aka TLS-CA root-cert
			},
			"component": {
				"tls_cert": "",    // aka comp's TLS cert
				"ecert": "",     // aka comp's ecert [NOT available if this comp is a CA]
				"admin_certs": [""], // aka comp's admin certs [NOT available if this comp is a CA]
			},

			// optional
			"intermediate_ca":{
				"root_certs": [""],  // aka intermediate CA root-cert
			},
			"intermediate_tlsca":{
				"root_certs": [""],  // aka intermediate TLS-CA root-cert
			},
		}
	}

	{
		// [msp]
		// fields are at root of a *MSP* component doc, whole doc structure is not shown
		"root_certs": [""],  // aka CA root-cert
		"tls_root_certs": [""],  // aka TLS-CA root-cert
		"admins": [""],       // aka comp's admin certs
	}
	```
