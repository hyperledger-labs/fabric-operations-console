# Template APIs - v1.0
A template is a JSON description of 1 or more components.
An entire template can be built by sending it to the `/build` API.
Each component in the JSON will be built sequentially.
Progress information becomes available on the webhooks API.

The build templates api is async.

**API 3 has the details of the template format**

**Scroll to the bottom for more comments on the template engine**

## 1. Get Templates
Use this API to see templates that have been imported.
- **Method**: GET
- **Route**: `/api/v1/templates` || `/ak/api/v1/templates`
- **Auth**: Must have action `blockchain.optools.view`
- **Body**: `n/a`
- **Response**:
```js
 {
		"message": "ok",
		"templates": [{  // array, 1 element per template

			// object of components to create
			"create_components": [
				{} // details specific to each component type here
			],

			// static information to reference when building components
			"definitions": [
				{} // user defined
			],

			// object of components that are already created
			"existing_components": [
				{} // user defined
			],

			// if true all components will be deleted if any fail
			"delete_all_on_failure": true,

			// the unique id of this template
			"id": "00_template_starter_network",

			// a short name/description of the template
			"display_name": "Starter Network (lite)",

			// version of the template
			"version": "v1.0"
		}]
	}
```

## 2. Import Template
Use this API to import a template to store for posterity.
- **Method**: POST
- **Route**: `/api/v1/templates` || `/ak/api/v1/templates`
- **Auth**: Must have action `blockchain.components.create`
- **Body**: See body of API #3. Build Template (identical)
- **Response**:
```js
{
    "message": "ok",
    "stored": "00_template_starter_network", // _id of template
    "valid_template": true   // true if template was successfully validated
}
```

## 3. Build Template
Use this API to submit template JSON to be built.
This is async.
Thus the response of this api only indicates if the process is starting.

**By-Reference Notes:**

**All values that start with a dollar sign are "by-reference" fields.**
The template builder will attempt to look up the reference and resolve the field before provisioning the component.
E.g., the value of `"$ca1.enroll_id"` instructs the builder to look for another component with a `"_ref_id"` field value of `"$ca1"`.
If found it will index into that object's `"enroll_id"` field and that value will be used.
You may chain "by-reference" fields as well as reference static/user defined objects in the `"dictionary"` array.

It is advisable to use the `"only_validate": true` field to test the resolving logic to gain a deeper understanding.
The best way to understand the format is to read the commented example below:

- **Method**: POST
- **Route**: `/api/v1/templates/build` || `/ak/api/v1/templates/build`
- **Auth**: Must have action `blockchain.components.create`
- **Body**:
```js
{
	// [required field]
	// the unique id of this template (follow couch db doc ID limitations)
	"_id": "00_template_starter_network",

	// [required field]
	// version of the template format
	"api_version": "v1",

	// [required field]
	// a short name for the template
	// has no impact on the template engine (cosmetic data, user defined)
	"display_name": "Starter Network (lite)",

	// version of the template
	// has no impact on the template engine (cosmetic data, user defined)
	"version": "v1.0.0",

	// a brief description of the template
	// has no impact on the template engine (cosmetic data, user defined)
	"description": "A basic template for testing. Contains 1 msp, 1 peer, 1 ca, 1 raft ordering service with 1 node.",

	// internal doc type field (book keeping)
	// does not need to be present, but is likely already set if pulling template from couchdb
	// if present, should always be "template"
	"type": "template",

	// if true all components will be deleted if any fail
	// defaults false
	"delete_all_on_failure": true,

	// if true it will NOT build the template, only validate the JSON
	// defaults false
	"only_validate": true,

	// the base url to ping when the template tx is complete
	// request uses method: POST & path: '/api/v1/webhooks/txs/' + tx_id
	// body contains the entire template webhook status doc
	// basic auth embedded in url is supported
	// omit field if not needed
	"client_webhook_url": "https://admin:password@localhost:3000",

	// static information to reference when building components
	// this is user defined, customize it to assist your build
	// omit field if you do not understand
	"definitions": [

		// example definition, not required
		// all objects in array must have a "_ref_id" field.
		// add other fields as you need them. (can be any type. objects, arrays, strings, etc)
		{
			"_ref_id": "$example", // template unique ID for this obj. value must start with "$"
			"pass": "password"     // literally any field name and value you want
		}
	],

	// array of objects of components that are already created.
	// only list the id of the component here.
	// the rest of the fields will be pulled from doc in the db.
	// these fields will be available for referencing during the build.
	"existing_components": [
		{
			"_ref_id": "$idHere"  // this is the only field to include
		}
	],

	// [required field]
	// array of components to build
	"create_components": [

		// ca example
		// a CA is documented below, but this is just an example
		// it is not required to have a CA component
		// fields labeled [required field] are only required IF you have a CA component
		{

			// [required field]
			// template unique ID for this obj. value must start with "$"
			"_ref_id": "$ca1",

			// [required field]
			// valid types: "fabric-ca", "fabric-peer", "fabric-orderer", "enroll_id", "msp"
			"type": "fabric-ca",

			// storage info for component
			"storage": {
				"ca": {
					"size": "1G",
					"class": "default"
				}
			},

			// cpu/memory resources
			"resources": {
				"ca": {
					"requests": {
						"cpu": "100m",
						"memory": "256M"
					}
				}
			},

			// [required field]
			// enroll id to use for this component
			"enroll_id": "$org_id_1.enroll_id",

			// [required field]
			// enroll id to use for this component
			"enroll_secret": "$org_id_1.enroll_secret",

			// [required field]
			// friendly name for this component
			"display_name": "MyCA",

			// the max time to wait for this component to start.
			// if <= 0 the engine will not wait for this component to start.
			// it will immediately start the next component.
			// defaults -1
			"_max_wait_ms": 45000,

			// if true the template building will end if this component fails to build
			// failure can be from _max_wait_ms timeout, or deployer error response 2x
			// defaults false
			"_fail_build_on_error": true
		},

		// enroll id example
		// an enroll id is documented below, but this is just an example
		// it is not required to have an enroll id component
		// fields labeled [required field] are only required IF you have a enroll id component
		{

			// [required field]
			// template unique ID for this obj. value must start with "$"
			"_ref_id": "$org_id_1",

			// [required field]
			// valid types: "fabric-ca", "fabric-peer", "fabric-orderer", "enroll_id", "msp"
			"type": "enroll_id",

			// [required field]
			// the id of the enroll id to be created
			"enroll_id": "org_id",

			// [required field]
			// the secret of the enroll id to be created
			"enroll_secret": "$example.pass",

			// [required field] (can be null)
			// an existing enroll id to use to create the new ID
			// if null the new id will not be registered
			"create_using_enroll_id": null,

			// [required field] (can be null)
			// an existing enroll secret to use to create the new ID
			// if null the new id will not be registered
			"create_using_enroll_secret": null,

			// [required field]
			// the url including protocol and port of the CA to use
			"ca_url": "$ca1.url",

			// [required field]
			// the sub name of the CA to use
			"ca_name": "$ca1.ca_name",

			// the enroll id "affiliation" to set
			"affiliation": "",

			// the enroll id "type" to set
			"id_type": "client",

			// the max number of enrollments this enroll id can do
			"max_enrollments": -1
		},

		// msp example
		// a msp is documented below, but this is just an example
		// it is not required to have a msp component
		// fields labeled [required field] are only required IF you have a msp component
		{

			// [required field]
			// template unique ID for this obj. value must start with "$"
			"_ref_id": "$msp1",

			// [required field]
			// valid types: "fabric-ca", "fabric-peer", "fabric-orderer", "enroll_id", "msp"
			"type": "msp",

			// the consortium unique ID of this MSP
			"msp_id": "org1",

			// the display name of the MSP
			"display_name": "MyOrg",

			// array of base 64 encoded CA root certs
			"root_certs": [
				"$ca1.root_cert"
			],

			// array of base 64 encoded admin certs
			"admins": [
				"$org_id_1.certificate"
			],

			// array of base 64 encoded TLS CA certs
			"tls_root_certs": [
				"$ca1.tls_root_cert"
			]
		},

		// orderer example
		// an orderer is documented below, but this is just an example
		// it is not required to have an orderer component
		// fields labeled [required field] are only required IF you have a orderer component
		{

			// [required field]
			// template unique ID for this obj. value must start with "$"
			"_ref_id": "$msp1",

			// [required field]
			// valid types: "fabric-ca", "fabric-peer", "fabric-orderer", "enroll_id", "msp"
			"type": "fabric-orderer",

			// the msp id to use
			"msp_id": "$msp1.msp_id",

			// the display name of the Orderer
			"display_name": "MyOrderer",

			// storage info for component
			"storage": {
				"ca": {
					"size": "5G",
					"class": "default"
				}
			},

			// cpu/memory resources
			"resources": {
				"orderer": {
					"requests": {
						"cpu": "150m",
						"memory": "512M"
					}
				},
				"grpcweb": {
					"requests": {
						"cpu": "100m",
						"memory": "128M"
					}
				}
			},

			// the max time to wait for this component to start.
			// if <= 0 the engine will not wait for this component to start.
			// it will immediately start the next component.
			// defaults -1
			"_max_wait_ms": -1,

			// if true the template building will end if this component fails to build
			// failure can be from _max_wait_ms timeout, or deployer error response 2x
			// defaults false
			"_fail_build_on_error": false,

			// the configuration below is near the same as the deployer spec
			"crypto": {
				"enrollment": {
					"component": {
						"ca_host": "$ca1.hostname",
						"ca_port": "$ca1.port",
						"ca_name": "$ca1.ca_name",
						"ca_tls": {
							"ca_cert": "$ca1.tls_cert"
						},
						"enroll_id": "$orderer_id1.enroll_id",
						"enroll_secret": "$orderer_id1.enroll_secret",
						"admin_certs": [
							"$org_id_1.certificate"
						]
					},
					"tls": {
						"ca_host": "$ca1.hostname",
						"ca_port": "$ca1.port",
						"ca_name": "$ca1.tlsca_name",
						"ca_tls": {
							"ca_cert": "$ca1.tls_cert"
						},
						"enroll_id": "$org_id_1.enroll_id",
						"enroll_secret": "$org_id_1.enroll_secret",
						"admin_certs": [
							"$org_id_1.certificate"
						],
						"csr": {
							"hosts": []
						}
					}
				}
			}
		},

		// peer example
		// a peer is documented below, but this is just an example
		// it is not required to have a peer component
		// fields labeled [required field] are only required IF you have a peer component
		{

			// [required field]
			// template unique ID for this obj. value must start with "$"
			"_ref_id": "$msp1",

			// [required field]
			// valid types: "fabric-ca", "fabric-peer", "fabric-orderer", "enroll_id", "msp"
			"type": "fabric-peer",

			// the msp id to use
			"msp_id": "$msp1.msp_id",

			// the display name of the component
			"display_name": "MyPeer",

			// ledger database type "couchdb" or "leveldb"
			// defaults "couchdb"
			"db_type": "couchdb",

			// storage info for component
			"storage": {
				"peer": {
					"size": "5G",
					"class": "default"
				}
			},

			// cpu/memory resources
			"resources": {
				"peer": {
					"requests": {
						"cpu": "150m",
						"memory": "512M"
					}
				},
				"grpcweb": {
					"requests": {
						"cpu": "100m",
						"memory": "128M"
					}
				},
				"couchdb": {
					"requests": {
						"cpu": "100m",
						"memory": "128M"
					}
				},
				"dind": {
					"requests": {
						"cpu": "100m",
						"memory": "128M"
					}
				}
			},

			// the max time to wait for this component to start.
			// if <= 0 the engine will not wait for this component to start.
			// it will immediately start the next component.
			// defaults -1
			"_max_wait_ms": -1,

			// if true the template building will end if this component fails to build
			// failure can be from _max_wait_ms timeout, or deployer error response 2x
			// defaults false
			"_fail_build_on_error": false,

			// the configuration below is near the same as the deployer spec
			"crypto": {
				"enrollment": {
					"component": {
						"ca_host": "$ca1.hostname",
						"ca_port": "$ca1.port",
						"ca_name": "$ca1.ca_name",
						"ca_tls": {
							"ca_cert": "$ca1.tls_cert"
						},
						"enroll_id": "$peer_id1.enroll_id",
						"enroll_secret": "$peer_id1.enroll_secret",
						"admin_certs": [
							"$org_id_1.certificate"
						]
					},
					"tls": {
						"ca_host": "$ca1.hostname",
						"ca_port": "$ca1.port",
						"ca_name": "$ca1.tlsca_name",
						"ca_tls": {
							"ca_cert": "$ca1.tls_cert"
						},
						"enroll_id": "$org_id_1.enroll_id",
						"enroll_secret": "$org_id_1.enroll_secret",
						"admin_certs": [
							"$org_id_1.certificate"
						],
						"csr": {
							"hosts": []
						}
					}
				}
			}
		}
	]
}
```
- **Response**:
```js
//--------------------------------------------------
// response when only_validate == false
//--------------------------------------------------
{
    "message": "ok",

    // echo's back the value that was sent in
    "only_validate": true,

    // the HTTP method to poll on
   "poll_method": "GET",

    // the HTTP url to poll on to see progress of your build
    // auth on this url is dependent on the athena configuration:
       // same auth as all other /ak/ routes
          // if SaaS auth requires iam token bearer token
          // if OpenShift requires api key/secret basic auth
    "poll_url": "http://example.com/ak/api/v1/webhooks/tx/randomIdHere",

    // the number of "steps" the template engine calculated
    "total_steps": 7

    // some unique id for your build
    "tx_id": "randomIdHere",

    // true if template was successfully validated
    "valid_template": true
}


//--------------------------------------------------
// response when only_validate === true
//--------------------------------------------------
{
    "message": "ok",

    // echo's back the value that was sent in
    "only_validate": true,

    // contains the parsed result of what was sent in via "create_components"
    "resolved_components": {},

    // summary of resources + storage for this template
    "total_resources": {
         // total cpu, units is always CPUs
        "cpus": 0.9,

        // total memory across all components, units always bytes
        "memory_bytes": 2063892480,

        // total storage across all components, units always bytes
       "storage_bytes": 119185342464,

        // total memory across all components, human readable
        // largest appropriate base 2 unit used
        // ex: 1KiB = 1024 bytes
        "memory_friendly_units": "1.92 GiB",

        // total storage across all components, human readable
        // largest appropriate base 2 unit used
        // ex: 1KiB = 1024 bytes
        "storage_friendly_units": "111.00 GiB"
    },

    // the number of "steps" the template engine calculated
    "total_steps": 7

    // true if template was successfully validated
    "valid_template": true
}
```

### Order:
All components in the array `create_components` are built sequentially.

### Retry Logic:
There is retry logic on deployer calls.
If the deployer responds with a http error code the template engine will try it again as long as the error code is `>= 409`.
Thus codes `409 - 599` will be retried, once.
If the 2nd attempt fails, the engine will give up on this component.
It is considered a failure and the failure logic takes over.
The number of deployer retries is not adjustable atm.

### Wait for Startup Logic:
There is logic to wait for a CA, Orderer and Peer to startup.
Every peer/orderer/ca can have the field `_max_wait_ms` to control the time in milliseconds.
The component will be polled at various times in longer and longer back offs up to the desired timeout (approximately).
If the component is still not up after the timeout it is considered a failure and the failure logic takes over.
It will not be rebuilt.

If `_max_wait_ms` <= 0 the engine will not wait for this component to start.
Thus after this component's deployer requests responds, the next component will start processing/building.

### Failure/Clean up Logic:
Every peer/orderer/ca can have the field `_fail_build_on_error`.
If true the build will stop if this component does not get provisioned correctly, or start up before the timeout.

If `_fail_build_on_error` is false the engine will continue to the next component.
If any of the next components need a field resolved from a failed component, the engine is not smart enough to handle this.
It will attempt to copy the null/undefined field and provide that to the current component's build.
This will likely result in an invalid component.
Thus `"_fail_build_on_error": true` is recommended.

If the global field `delete_all_on_failure` is true and the build failed, the template engine will bulk delete every peer/orderer/ca that was created in this tx.
This cleanup delete triggers immediately, but atm (06/25/2019) there is no way to programmatically see the progress of the clean up.
The logs will indicate when it is finished.

### Debug:
A debug doc is added to the components db after a template build is completed.
It is created on failures and successes.
It contains all deployer bodies sent, all deployer responses, the original template, the processed template, and all components that were built as `resolved_components`.
ATM there is no api to fetch this doc type, they must be manually retrieved from couchdb.
They have a doc `type` field set to `template_debug` and a `tx_id` field set to the same transaction id you see in the original template build response.

### Webhook:
A webhook can be established by setting the variable `client_webhook_url` in the template JSON.
The template engine will post the result (success or failure) to this url once the template is complete.
It will always send via a POST method, and it will use the path `'/api/v1/webhooks/txs/' + tx_id`.
The body will contain the webhook status doc.
Basic auth can be provided by embedding it in the url.

If this is not needed `client_webhook_url` can be set to null or omitted.

### Random String Injection:
Use the values below in any string in the template JSON to inject randomness into that string.
Typically I used them to make a random component display names (but this is not required).
Example `"My CA $RANDOM"` will resolve to be something like `"My CA asdf"`.
Note that all instances of $RANDOM will get the same value (tbd if I like that or not).

- `$RANDOM` = random 4 character string, lowercase
- `$RANDOM8` = random 8 character string, lowercase
- `$RANDOM16` = random 16 character string, lowercase
- `$TIMESTAMP` = numeric unix timestamp, in ms
