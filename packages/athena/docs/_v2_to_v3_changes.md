# v2 to v3

- breaking changes are marked with a :boom:.
- v1 and v2 apis will remain
- v3's goal is to conform to deployer changes

### v2 changes:
- [x] apis that athena receives on `/v2/` will be conformed to a v3 deployer api spec. this is being done so that an end user can use the new deployer w/o issues.
- [x] I don't know how we can doc the v2 apis on IBM Cloud ApiDocs once v3 is added - *update* we can't, have to live with it.
- [x] added fields to the automatic k8s sync logic: `tls_ca_root_certs` & `ca_root_certs` (internal names)

### v3 changes:
- [x] v3 uses a different validation file than v2 (it was copied from v2)
- [x] :boom: - the create-component-api body field `config` was renamed to `crypto`.
- [x] we were converting `resources.statedb` to `resources.couchdb` for deployer, this is no longer done since deployer can take `statedb` now
- [x] added internal doc field `ca_root_certs`
- [x] renamed internal `tls_ca_root_cert` field to `tls_ca_root_certs` and its now an array
- [x] :boom: - new response for components. added `msp` field to hold all certs. see v3 response at bottom of [cert notes](./_holy_cert.md#other).
-  *more of a note than a change* - responses containing older imported nodes will not contain ca or tlsca root certs... b/c they don't exist in the db.
- [ ] going forward exported nodes should contain the whole `msp` cert structure (apollo todo)
- [x] doc new v3 enrollment & msp format in api docs (not published to staging yet)
- [ ] doc new v3 enrollment & msp format in postman examples
- [x] added fields to the automatic k8s sync logic: `tls_ca_root_certs` & `ca_root_certs` (internal names)
- [x] :boom: `ca_name` and `tlsca_name` in a CA component response moved to under the `msp` section (`msp.ca.name` & `msp.tlsca.name`)
- [x] :boom: new v3 **msp** format when creating a component:
	```js
	// **old** body to create a peer using "config.msp"
	{
		"display_name": "My Peer",
		"msp_id": "org2",
		"config": {
			"msp":{
				"component": {
					"keystore": "a",           // moves to -> crypto.msp.component.ekey (for comp's ecert)
					"signcerts": "b",          // moves to -> crypto.msp.component.ecert
					"admincerts": ["d"],       // moves to -> crypto.msp.component.admin_certs
					"cacerts": ["c"],          // moves to -> crypto.msp.ca.root_certs
					"intermediatecerts": ["e"] // moves to -> crypto.msp.ca.intermediate_certs
				},
				"tls": {
					"keystore":"f",            // moves to -> crypto.msp.component.tls_key (for comp's tls cert)
					"signcerts":"g",           // moves to -> crypto.msp.component.tls_cert
					"cacerts": ["h"],          // moves to -> crypto.msp.tlsca.root_certs
					"intermediatecerts": ["i"] // moves to -> crypto.msp.tlsca.intermediate_certs
				},
				"clientauth": {
					"type": "noclientcert",     // moves to -> crypto.msp.component.client_auth.type
					"certfiles": ["j"]         // moves to -> crypto.msp.component.client_auth.tls_certs
				}
			}
		}
	}

	// **new** body to create a peer using "crypto.msp"
	{
		"display_name": "My Peer",
		"msp_id": "org2",
		"crypto": {
			"msp":{
				"ca": {
					"root_certs": ["c"],
					"intermediate_certs" : ["e"] // (optional)
				},
				"tlsca": {
					"root_certs": ["h"],
					"intermediate_certs" : ["i"] // (optional)
				},
				"component":{
					"ekey": "a",
					"ecert": "b",
					"admin_certs": ["d"],		// (optional)
					"tls_key": "f",
					"tls_cert": "g",
					"client_auth": {			// (optional)
						"type": "noclientcert",
						"tls_certs": ["j"]
					}
				}
			}
		}
	}
	```
- [x] :boom: new v3 **enrollment** format when creating a component:
	```js
	// **old** body to create a peer using "config.enrollment"
	{
		"display_name": "My Peer",
		"msp_id": "org2",
		"config": {
			"enrollment": {
				"component": {
					"cahost": "z",           // moves to -> crypto.enrollment.ca.host
					"caport": "x",           // moves to -> crypto.enrollment.ca.port
					"caname": "ca",          // moves to -> crypto.enrollment.ca.name
					"catls": {
						"cacert": "a"        // moves to -> crypto.enrollment.ca.tls_cert
					},
					"enrollid": "admin",     // moves to -> crypto.enrollment.ca.enroll_id
					"enrollsecret": "admin", // moves to -> crypto.enrollment.ca.enroll_secret
					"admincerts": ["b"]      // moves to -> crypto.enrollment.component.admin_certs
				},
				"tls": {
					"cahost": "y",           // moves to -> crypto.enrollment.tlsca.host
					"caport": "w",           // moves to -> crypto.enrollment.tlsca.port
					"caname": "tlsca",       // moves to -> crypto.enrollment.tlsca.name
					"catls": {
						"cacert": "c"        // moves to -> crypto.enrollment.tlsca.tls_cert
					},
					"enrollid": "admin",     // moves to -> crypto.enrollment.tlsca.enroll_id
					"enrollsecret": "admin", // moves to -> crypto.enrollment.tlsca.enroll_secret
					"admincerts": ["d"],     // dropped
					"csr": {
						"hosts": ["e"]       // moves to -> crypto.enrollment.tlsca.csr_hosts
					}
				}
			}
		}
	}

	// **new** body to create a peer using "config.enrollment"
	{
		"display_name": "My Peer",
		"msp_id": "org2",
		"crypto": {
			"enrollment":{
				"ca": {
					"host": "z",
					"port": "x",
					"name": "ca",
					"tls_cert": "a",
					"enroll_id": "admin",
					"enroll_secret": "admin",
				},
				"tlsca": {
					"host": "y",
					"port": "w",
					"name": "tlsca",
					"tls_cert": "c",
					"enroll_id": "admin",
					"enroll_secret": "admin",
					"csr_hosts": ["e"] // (optional)
				},
				"component":{
					"admin_certs": ["b"], // (optional)
				}
			}
		}
	}
	```
- [x] :boom: new v3 **msp** format when importing a component (n/a to MSPs):
	```js
	// **old** body to import a peer (similar for orderer)
	{
		"display_name": "My Peer",
		"grpcwp_url": "a",
		"api_url": "b",
		"operations_url": "c",
		"msp_id": "d",
		"tls_cert": "e",  // moves to -> msp.component.tls_cert
		"tls_ca_root_cert": "f", // moves to -> msp.tlsca.root_certs *as an array*
		"admin_certs": ["g"], // moves to -> msp.component.admin_certs
		"ecert": "h", // moves to -> msp.component.ecert
	}

	// **new** body to import a peer (similar for orderer)
	{
		"display_name": "My Peer",
		"grpcwp_url": "a",
		"api_url": "b",
		"operations_url": "c",
		"msp_id": "d",
		"msp":{
			"ca": {
				"root_certs": ["c"], // (optional)
			},
			"tlsca": {
				"root_certs": ["f"],
			},
			"component":{
				"tls_cert": "e",
				"admin_certs": ["g"],   // (optional)
				"ecert": "h",          // (optional)
			}
		}
	}
	```
	```js
	// **old** body to import a ca
	{
		"display_name": "My CA",
		"location": "a",
		"api_url": "b",
		"operations_url": "c",
		"ca_name": "d",  // moves to -> msp.ca.name
		"tlsca_name": "e",  // moves to -> msp.tlsca.name
		"tls_cert": "f", // moves to -> msp.component.tsl_cert
	}

	// **new** body to import a ca
	{
		"display_name": "My Peer",
		"location": "a",
		"api_url": "b",
		"operations_url": "c",
		"msp":{
			"ca": {
				"name": "d",
				"root_certs": [""]  // (optional)
			},
			"tlsca": {
				"name": "e",
				"root_certs": [""]  // (optional)
			},
			"component":{
				"tls_cert": "f"
			}
		}
	}
	```

### v3 deployer notes
- lots of new apis https://github.ibm.com/ibp/deployer/blob/master/docs/v3_apis.md#new-apis
- changed get component api **responses**, new formats:
	- https://github.ibm.com/ibp/deployer/tree/master/docs/components
		- [x] moved legacy `tls.cert` to `msp.tls.signcerts`
		- [x] moved legacy `ecert.cert` to `msp.component.signcerts`
		- [x] moved legacy `admincerts` to `msp.component.admincerts`
		- [x] use new field `msp.component.cacerts`
- changed create component api **inputs**, new formats:
	- [x] do the same changes in the dep response to the deployer inputs!
	- [x] do I need to format the config field in deployer response to these create apis too? yes.
- [x] move off deprecated api `Post /api/v2/instance/{serviceInstanceID}/type/orderercluster`
- [-] deprecated `hsm.pkcs11endpoint` in a create CA api. (there is no todo here...)
- [x] changed edit component api method to a `PATCH` instead of `PUT`
- [x] changed submit config block api to route `/api/v3/instance/:iid/type/orderer/component/:name/genesis`
- [x] changed edit admin certs api to route `/api/v3/instance/:iid/type/orderer/component/:name/admincerts`
- [x] changed the get orderer api route from `/api/v2/instance/:iid/precreate/type/orderer/orderer/:name` to `/api/v3/instance/:iid/type/orderer/orderer/:name`
