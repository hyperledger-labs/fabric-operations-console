# Deployer APIs
Deployer is the app Optools uses to build components in kubernetes.
Deployer APIs will be accomplished by athena (instead of apollo) to prevent needing to passing auth/credentials to the client.

Highly technical architecture diagram:

```
  Apollo <--> Athena <-----> Deployer <--> K8s
```

See deployer's own documentation for more info...
- [Deployer's API documentation](https://github.ibm.com/IBM-Blockchain/blockchain-deployer/blob/master/docs/ibp2.0_apis.md)

***

<a name="dep_proxy"></a>

## 1a. Proxy request to deployer
Send an API request to deployer.
aka proxy to deployer.
The hostname and auth for deployer is picked up via `deployer_url` in the settings doc.

**Use the other apis in this doc before using this one.**
This is a "catch-all" route, and should be used when the others in this page do not accomplished what you want.
There are purpose-built APIs lower in this doc for creating components, editing, deleting, etc.

To date (10/25/2019) this api is used for:
1. get fabric versions - `deployer/api/v2/instance/$iid/type/all/versions`
2. to get cluster info & status - `/deployer/api/v2/instance/$iid/status`

Details:
- **Method**: Any (GET/POST/HEAD/DELETE/PUT/PATCH/OPTIONS)
- **Route**: `/deployer/api/v*/*`
  - if the placeholder `$iid` is found in the route it will be replaced with the user's service `instance_id`
  - if the path matches a regex of `/components\/([^/]+)/`. then the 2nd word in the regex is treated as the athena id of the component. the component doc will be looked up. **the athena id in the route will be switched with the the deployer id from the doc**. thus deployer will get a call with their ID in the route (which is what they expect)
- **Auth**: must have action `blockchain.components.create`
- **Body**: body optional, JSON is likely, but its whatever deployer expects for the API you are calling
- **Response** route dependent

<a name="immediate2"></a>

## 1b. Provision a component
Create a component via deployer.
The body for each component type is different.
Find your body below.
This API will create a OpTools` doc of the component, unlike the proxy deployer api (#1a).

The hostname and auth for deployer is picked up via `deployer_url` in the settings doc.

### OpTools ID Notes:
The OpTools id of a component can be provided with the param `_id`, but it is more commonly derived from the cosmetic field `display_name`. Only letters, numbers, dashes and underscores will be used to build the component id (other characters are discarded). The id is then brought to lowercase. Next the id is checked for **uniqueness**. If this id is already in use, it will be changed. If the id contains a number at the end it will be incremented. If there is no number at the end, the string `"_0"` will be appended. The process repeats until the new id is unique. If after excessive cycles no unique id can be generated the id will be left for couchdb to choose. Couchdb will choose a guaranteed unique id that is typically 32 character gibberish.

The process above describes the OpTools ID. However there is another ID for the kubernetes component used by Deployer. The deployer id generation is done by Optools and follows the same logic above, but their ids can only contain letters and numbers.

- **Method**: `"POST"`
- **Routes**:
	- `/api/saas/v[123]/components`
		- session auth based api used by UI, `type` must be in body
	- `/ak/api/v[123]/kubernetes/components`
		- api key auth based api, `type` must be in body
	- `/ak/api/v1/kubernetes/components/ca` || `/ak/api/v[123]/kubernetes/components/fabric-ca`
		- api key auth based api, `type` in body will be overridden with `"fabric-ca"`
	- `/ak/api/v1/kubernetes/components/peer` || `/ak/api/v[123]/kubernetes/components/fabric-peer`
		- api key auth based api, `type` in body will be overridden with `"fabric-peer"`
	- `/ak/api/v1/kubernetes/components/orderer` || `/ak/api/v[123]/kubernetes/components/fabric-orderer`
		- api key auth based api, `type` in body will be overridden with `"fabric-orderer"`
- **Auth**: must have action `blockchain.components.create`
- **Body**:
```js
// ---- Body for a CA ---- //
{
	// [sometimes optional] - only optional if the route does not include the type
	"type": "fabric-ca",

	// the Fabric CA's config override yaml
	// (this whole object is required, CA's must have at least 1 enroll id/secret)
	"config_override":{

		"ca":{

			"registry":{

				// -1 -> unlimited enrollments, else its the number of enrollments before the id is locked out
				"maxenrollments": -1,

				// add 1 entry per enrollment you want the CA to have
				"identities": [{

					// the root admin's id for the ca, aka enroll id
					"name": "admin",

					// the root admin's secret for the ca, aka enroll secret
					"pass": "admin",

					// the type of enrollment, options: "client", "peer", "orderer", "user", "admin"
					"type": "client"
				}]
			}
		}
	},

	// display name of tile, legacy "name" also accepted. (cosmetic)
	"display_name": "My Ca",

	// [optional] - kubernetes zone to use for component
	"zone": "dal10",

	// [optional] - k8s worker architecture to use for component (x or z)
	"arch": "?",

	// [optional] - set if you do not want default cpu/memory values
	// find current defaults in /json_docs/default_settings_doc.json `the_default_resources_map.ca`
	"resources": {
		"ca": {
			"requests": {
				"cpu": "100m",
				"memory": "256M"
			}
		}
	},

	// [optional] - set if you do not want default disk values
	// find current defaults in /json_docs/default_settings_doc.json `the_default_resources_map.ca`
	"storage": {
		"ca": {
			"size": "1G",
			"class": "default"
		}
	},

	// [optional] - user defined array of strings to group/tag components
	"tags": ["abcde"]
}


// ---- Body for a CA w/Postgres ---- //
{
	// !
	// Set the same fields in the normal CA API above ^^
	// Also set these fields:

	// number of replicas
	"replicas": 2,

	// required for postgres
	"configoverride": {
		"ca": {
			"db": {
				// build up this string:
				// host=<hostname> port=<port> user=<username> password=<password> dbname=<db name> sslmode=verify-full
				"datasource": "host=fake.databases.appdomain.cloud port=31941 user=ibm_cloud password=password dbname=ibmclouddb sslmode=verify-full",
				"tls": {
					"certfiles": ["<base64 encoded pem>"],
					"enabled": true  // if tls is to be used between the ca and its db
				},
				"type": "postgres"
			}
		},
		"tlsca": {
			"db": {
				"datasource": "host=fake.databases.appdomain.cloud port=31941 user=ibm_cloud password=password dbname=ibmclouddb sslmode=verify-full",
				"tls": {
					"certfiles": ["<base64 encoded pem>"],
					"enabled": true
				},
				"type": "postgres"
			}
		}
	}
}


// ---- Body for a Peer ---- //
{
	// [sometimes optional] - only optional if the route does not include the type
	"type": "fabric-peer",

	"msp_id": "org2",

	// the fabric crypto for this peer
	// (/v2/ routes use `config` instead of `crypto`)
	"crypto": {

		// "crypto.enrollment" is used more often, but "crypto.msp" can work if you provide the certs.
		// see _v2_to_v3_changes.md doc for the "crypto.msp" format.
		// !! this is the v3 body !!
		"enrollment": {
			"ca": {
				"host": "example.com:7054",
				"port": "7054",
				"name": "ca",
				"tls_cert": "<base 64 encoded tls cert>"
				"enroll_id": "myPeer",  // the id should be of type "peer" (not "admin")
				"enroll_secret": "myPeer",
			},
			"tls": {
				"host": "example.com:7054",
				"port": "7054",
				"name": "tlsca",
				"tls_cert": "<base 64 encoded tls cert>"
				"enroll_id": "peer",
				"enroll_secret": "peer",
				"csr_hosts": []
			},
			"component": {
				"admin_certs": ["<base 64 encoded identity admin cert>"]
			}
		}
	},

	// display name of tile, legacy "name" also accepted. (cosmetic)
	"display_name": "My Peer",

	// [optional] - kubernetes zone to use for component
	"zone": "dal10",

	// [optional] - k8s worker architecture to use for component (x or z)
	"arch": "?",

	// [optional] - set if you do not want default cpu/memory values
	// find current defaults in /json_docs/default_settings_doc.json `the_default_resources_map`
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

	// [optional] - set if you do not want default disk values
	// find current defaults in /json_docs/default_settings_doc.json `the_default_resources_map`
	"storage": {
		"peer": {
			"size": "5G",
			"class": "default"
		}
	},

	// [optional] - user defined array of strings to group/tag components
	"tags": ["abcde"]

	// [optional] - use field to override the auto ca root cert lookup
	"tls_cert": "<base 64 encoded root cert of your tls CA>"
}


// ---- Body for a NEW Ordering Service - solo ---- //
// this is the **legacy** body that created a SOLO orderer, it does NOT create a raft cluster.
{
	// [sometimes optional] - only optional if the route does not include the type
	"type": "fabric-peer",

	"msp_id": "org2",

	// [optional] indicates we are creating a new solo node.
	// defaults "solo"
	"orderer_type": "solo",

	// the fabric crypto for this orderer
	// (/v2/ routes use `config` instead of `crypto`)
	"crypto": {
		// for the full list of options "crypto" can take see the deployer doc:
		// https://github.ibm.com/IBM-Blockchain/fabric_images/blob/v1.2/v1/fabric/alpine/msp_structure.md
	},

	"display_name": "My Orderer"
	"zone": "dal10",
	"arch": "?",
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
	"storage": {
		"orderer": {
			"size": "5G",
			"class": "default"
		}
	},
}


// ---- Body for a NEW Ordering Service - raft ---- //
// send this body when you want to CREATE a new ordering service cluster
{
	// [sometimes optional] - only optional if the route does not include the type
	"type": "fabric-peer",

	"msp_id": "org2",

	// [required for raft] indicates we are creating a raft orderer.
	// defaults "solo"
	"orderer_type": "raft",

	 // 1 entry in array per ordering node you want. (1 or 5 typical)
	 // even numbers are not recommended unless you are expanding existing orderers
	 // (/v2/ routes use `config` instead of `crypto`)
	"crypto": [
		{
			// defines orderer #1

			// "crypto.enrollment" is used more often, but "crypto.msp" can work if you provide the certs.
			// see _v2_to_v3_changes.md doc for the "crypto.msp" format.
			// !! this is the v3 body !!
			"enrollment": {
				"ca": {
					"host": "example.com:7054",
					"port": "7054",
					"name": "ca",
					"tls_cert": "<base 64 encoded tls cert>"
					"enroll_id": "myPeer",  // the id should be of type "peer" (not "admin")
					"enroll_secret": "myPeer",
				},
				"tls": {
					"host": "example.com:7054",
					"port": "7054",
					"name": "tlsca",
					"tls_cert": "<base 64 encoded tls cert>"
					"enroll_id": "peer",
					"enroll_secret": "peer",
					"csr_hosts": []
				},
				"component": {
					"admin_certs": ["<base 64 encoded identity admin cert>"]
				}
			}
		},
		{
			// same as above, defines orderer #2
		},
		{
			// same as above, defines orderer #3
		},
		{
			// same as above, defines orderer #4
		},
		{
			// same as above, defines orderer #5
		}
	],

	// the name displayed on the tile that groups the cluster
	// defaults to "My OS"
	"cluster_name": "My Raft Orderers",

	// the base str displayed for 1 orderer, numbers get appended
	"display_name": "A Raft Orderer",

	// [optional] kubernetes zone to use for component, string ok if 1 node
	// array size should match "crypto" array size, else last entry will be copied for each missing entry
	"zone": ["dal10"],

	// [optional] kubernetes region to use for component, string ok if 1 node
	// array size should match "crypto" array size, else last entry will be copied for each missing entry
	"region": ["?"],

	// [optional] - kubernetes zone to use for component
	"zone": "dal10",

	// [optional] - k8s worker architecture to use for component (x or z)
	"arch": "?",

	// [optional] the resource settings per individual node
	// meaning *each* orderer gets these cpu/memory settings:
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

	// [optional] the storage settings per individual node
	// meaning *each* orderer gets these storage settings:
	"storage": {
		"orderer": {
			"size": "5G",
			"class": "default"
		}
	},

	// [optional]  desired system channel id [01/10/2020 this is place holder, dne]
	"system_channel_id": "testchainid"

	// [optional] - user defined array of strings to group/tag components
	"tags": ["abcde"]

	// [optional] - use field to override the auto ca root cert lookup
	"tls_cert": "<base 64 encoded root cert of your tls CA>"
}


// ---- Body for appending to an Orderer Service - raft ---- // (aka pre-create, precreate)
// send this body when you want to APPEND a new orderer to an EXISTING cluster
// cluster can be internal or external (meaning its known or not known to the UI, see [Note 2])
//
// [Note 1] - this api will NOT start the raft node since the api does not send a genesis block.
//          thus this orderer is not a valid consenter until you do that work. see /docs/raft_append.md
{
	// [sometimes optional] - only optional if the route does not include the type
	"type": "fabric-orderer",

	"msp_id": "org1",

	// [required for raft] indicates we are creating a raft orderer.
	// defaults "solo"
	"orderer_type": "raft",

	// the fabric crypto for this orderer
	// - the crypto field can also be an object, but array of 1 object is probably easier
	// - if array - can only be 1 element long
	// (/v2/ routes use `config` instead of `crypto`)
	"crypto": [{
		// same object as in the normal new-ordering-service body
	}],

	// [critically important] use the SAME cluster id of the existing raft cluster.
	// if you are appending to a cluster that was created externally (and its
	// not known ot the UI yet), set a custom/random id. see [Note 2].
	"cluster_id": "abcde",

	// display name of tile, legacy "name" also accepted. (cosmetic)
	"display_name": "A Raft Orderer",

	// [optional] - kubernetes zone to use for component
	"zone": "dal10",

	// [optional] - k8s worker architecture to use for component (x or z)
	"arch": "?",

	// [optional] memory/cpu settings for this orderer
	// see the raft cluster orderer example above for details
	"resources": {},

	// [optional] storage settings for this orderer
	// see the raft cluster orderer example above for details
	"storage": {},

	// [optional] - user defined array of strings to group/tag components
	"tags": ["abcde"],

	// [optional] - use field to override the auto ca root cert lookup
	"tls_cert": "<base 64 encoded root cert of your tls CA>",

	// [Note 2]
	// under "normal" circumstances you should not send "cluster_name", or "append".
	// we will pick up the name from the existing cluster based on the cluster_id.
	// *however* if you are joining an **external cluster** (one that the UI does NOT know)...
	// you will need to set these fields: "external_append", "cluster_name".

	// ONLY SET THIS IF NOTE 2 IS TRUE
	"external_append": true, // alt name "append" also supported

	// ONLY SET THIS IF NOTE 2 IS TRUE
	// the name displayed on the tile that groups the cluster
	"cluster_name": "My Raft Orderers"
}
```
- **Response** (OpTools response is sent after deployer responds):
```js
{
	// unique id of the component for OpTools
	"id": "test-with-requests-set",

	// provided on CAs - url of the ca for Fabric operations
	"api_url": "https://example.com:7054",

	// provided on CAs - name of the CA for the ca process
	"ca_name": "ca",

	// provided on raft ordering clusters, random unique id
	"cluster_id": "abcde"

	// provided on raft ordering clusters, tile name of the cluster (cosmetic)
	"cluster_name": "abcde"

	// provided on on orderers, indicates if orderer is a valid consenter anywhere
	"consenter_proposal_fin": true

	// unique id of the component for Deployer
	"dep_component_id": "testwithrequestsset",

	// display name of tile, legacy "name" also accepted. (cosmetic)
	"display_name": "test-with-requests-set",

	// the type of fabric component
	"type": "fabric-peer" || "fabric-ca" || "fabric-orderer",

	// indicates where node resides
	"location": "ibm_sass",

	// provided on peers/orderers
	"msp_id": "org1",

 	// the components' "metrics/health" url
	"operations_url": "https://169.46.223.99:30001",

	// provided on peers and orderers
	// grpc web proxy url for fabric operations
	"grpcwp_url": "https://169.46.223.99:30002",

	"region": "us-south",

	// node ou settings
	"node_ou": {
		"enabled": true
	},

	// enrollment cert
	"ecert": {
		"cert": "",
		"cacert": "",
	},

	// provided if available
	"resources": {
		"requests": {
			"cpu": "",
			"memory": ""
		},
		"limits": {
			"cpu": "",
			"memory": ""
		}
	},

	// provided if available
	"storage": {},

	// [optional] - user defined array of strings to group/tag components
	// raft ordering clusters will have a tag that is their cluster_id
	"tags": ["something", "bank_a"],

	// unix timestamp of creation, UTC, ms
	"timestamp": 1549490200312,

	// fabric version, provided if available
	"version": "1.4.0"
}

// response for raft orderers will be an array of the above
```

## 1c. Delete a provisioned component
Delete a component via deployer.
This API will delete the OpTools` doc of the component, unlike the proxy deployer api (#1a).

- **Method**: `"DELETE"`
- **Route**:
	- `/api/saas/v[123]/components/:athena_component_id?force=yes`
	- `/ak/api/v[123]/kubernetes/components/:athena_component_id?force=yes`
- **Auth**: must have action `blockchain.components.delete`
- **Query Params**
	- `force` - if `"yes"` the deployer response will be ignored and the comp doc will be deleted regardless of deployer errors. defaults `"no"`
- **Body**: `n/a`
- **Response** (response is sent when request deployer r):
```js
{
	"message": "deleted",
	"type": "fabric-peer",   // node type
	"id": "orderer1Jf",    // athena component id
	"display_name": "my peer"
}
```

## 1d. Update a provisioned component
Update/edit a component via deployer.
This api can change the cpu/memory settings, Fabric version of the component and more!

- **Method**: `"PUT"`
- **Route**: `/api/saas/v1/components/:athena_component_id`
- **Auth**: must have action `blockchain.components.create`
- **Body**:
```js
{
	// [optional] - hyperledger fabric version to use
	"version": "2.0.0",

	//  [optional] - example changing resources for a peer
	"resources": {
		"peer": {
			"requests": {
				"cpu": "201m",
				"memory": "401Mi"
			}
		}
	},

	// [optional] - crypto update
	"crypto" : {},

	// [optional] - replica count update
	"replicas" : 1,

	// [optional] - enable/disable node ou
	"node_ou" : {
		"enabled": true
	},

	// [optional] - overrides
	"config_override": {}
}
```
- **Response** (OpTools response is sent after deployer responds):
```js
{
	// !
	// the response contains the same data as seen in the GET component response (./component_apis.md API #4)

	// reflects the new resources changes if applicable
	"resources": {},

	// reflects the new Fabric version changes if applicable
	"version": "1.4.0"
}
```

## 1e. Bulk delete components
Delete many component via deployer.
This api will delete the OpTools` doc of each component and the actual components.
**It finds and deletes all components with the matching tag.**
Tags are not case sensitive.

The `tags` field is an array of strings in all component docs.
Thus all components with a matching entry will get deleted.

While built for deleting "orderer-raft-clusters" by `cluster_id` this api will work on any component tag.

Expect a http status code of **207** when mixed results occur.

- **Method**: `"DELETE"`
- **Route**: ]
	- `/api/saas/v[123]/components/tags/:tag?force=yes`
	- `/ak/api/v[123]/kubernetes/components/tags/:tag?force=yes`
- **Auth**: must have action `blockchain.components.delete`
- **Query Params**
	- `force` - if `"yes"` the deployer response will be ignored and the comp doc will be deleted regardless of deployer errors. defaults `"no"`
- **Body**: `n/a`
- **Response** (OpTools response is sent after deployer responds):
```js

// success response:
{
	// an array of components that were deleted successfully and not
	"deleted": [
		{
			"message": "deleted",
			"type": "fabric-peer",   // node type
			"id": "orderer1Jf",    // athena component id
			"display_name": "my peer"
		}
	]
}

// error response:
{
	// an array of components that were deleted successfully and not
	"deleted": [
		{
			"message": "deleted",
			"type": "fabric-peer",   // node type
			"id": "orderer1Jf", // athena component id
			"tx_id": "abcd1",   // random id to debug the delete in the logs
			"display_name": "my peer"
		},
		{
			"statusCode": 500,  // error status code for this 1 delete action
			"message": "some descriptive error",  // error message
			"type": "fabric-peer",   // node type
			"id": "orderer2Jf", // athena component id
			"tx_id": "abcd2",   // random id to debug the delete in the logs
			"display_name": "my peer"
		}
	]
}
```

## 1f. Bulk update components
Updates/edits many components via deployer.
This api can change the cpu/memory settings, and Fabric version of the components.
This api will update the OpTools` doc of each component and the actual components.
**It finds and updates all components with the matching tag.**
Tags are not case sensitive.

The `tags` field is an array of strings in all component docs.
Thus all components with a matching entry will get updated.

Expect a http status code of **207** when mixed results occur.

- **Method**: `"PUT"`
- **Route**: `/api/saas/v1/components/tags/:tag` || `/ak/api/v1/kubernetes/components/tags/:tag`
- **Auth**: must have action `blockchain.components.create`
- **Body**:
```js
{
	// [optional] - hyperledger fabric version to use
	"version": "2.0.0",

	//  [optional] - example changing resources for a peer
	"resources": {
		"peer": {
			"requests": {
				"cpu": "201m",
				"memory": "401Mi"
			}
		}
	}
}
```
- **Response** (OpTools response is sent after deployer responds):
```js

// success response:
{
	// the tag that was used to filter components
	"tag": "abcd",

	// an array of components that were upgraded successfully and not
	"updated_components": [
		{
			"statusCode": 200,  // status code for this 1 upgrade action
			"message": "ok",
			"id": "orderer1Jf", // athena component id
			"tx_id": "abcd1",   // random id to debug the upgrade in the logs
		},
		{
			"statusCode": 200,  // status code for this 1 upgrade action
			"message": "ok",
			"id": "orderer2wq", // athena component id
			"tx_id": "abcd2",   // random id to debug the upgrade in the logs
		},
		{
			"statusCode": 200,  // status code for this 1 upgrade action
			"message": "ok",
			"id": "orderer3ue", // athena component id
			"tx_id": "abcd3",   // random id to debug the upgrade in the logs
		}
	]
}
```

<a name="get_deployer_data"></a>

## 2. Get kubernetes component data
This api will get various data from deployer on a component.
**Its main use is to get the certificate secrets from k8s for a pre-created raft orderer node.**
This is the 2nd api in the the raft appending node process.
However, it can be called on any component.

**this api is removed in v2**
- if using v2, use the [get-a-component #4](./component_apis.md#get) api w/query parameters `deployment_attrs=include`.

- **Method**: `"GET"`
- **Route**: `/api/saas/v1/components/:component_id` || `/ak/api/v1/kubernetes/components/:component_id`
- **Auth**: must have action `blockchain.optools.view`
- **Body**: n/a
- **Response**:
```js
{
	// !
	// the response contains the same data as seen in the GET component response (./component_apis.md API #4)
	// plus it has these fields:

	// list of admin certs on the file system
	"admin_certs": [
		{
			// the certificate...
			"base_64_pem": "<base 64 encoded PEM here>",

			// the issuer string in the certificate
			"issuer": "/C=US/ST=North Carolina/O=Hyperledger/OU=Fabric/CN=fabric-ca-server",

			// utc timestamp of the last ms the certificate is valid
			"not_after_ts": 1597770420000,

			// utc timestamp of the earliest ms the certificate is valid
			"not_before_ts": 1566234120000,

			// "unique" id of the certificate (not guaranteed, but good enough)
			"serial_number_hex": "649a1206fd0bc8be994886dd715cecb0a7a21276",

			// the alg that signed the public key in the certificate
			"signature_algorithm": "SHA256withECDSA",

			// the subject string in the certificate
			"subject": "/OU=client/CN=admin",

			// the X.509 version/format
			"X509_version": 3,

			// friendly time till "not_after_ts"
			"time_left": "4 days"
		}
	],

	// this is the tls cert you are after for the raft orderer append flow (this is from dep_data.tls.cert)
	"tls_cert": "<base64 encoded pem>",

	// resource settings that k8s is currently using
	"resources": {},

	// storage settings that k8s is currently using
	"storage": {}

}
```

<a name="submit"></a>

## 3. Send config block to pre-created orderer
This api will send a config block (or genesis block) to a pre-created raft orderer node.
This is for finishing the append-raft-flow.

- **Method**: `"PUT"`
- **Route**: `/api/saas/v[123]/components/:component_id/config` || `/ak/api/v[123]/kubernetes/components/:component_id/config`
- **Auth**: must have action `blockchain.components.create`
- **Body**:
```js
{
	"b64_block": "<base 64 encoded latest config block of the system channel>"
}
```
- **Response**:
```js
{
	// deployer response
	// should be the same as the response in the GET kubernetes data, API #2
}
```

<a name="prepare"></a>

## 4. Provision a new raft node
Pre-create a raft orderer && send it an old config block at the same time.

**Removed. The raft-append-flow should use api [1b](#immediate2) instead.**

- **Method**: `"POST"`
- **Route**: `/api/saas/v1/components/raft_clusters/:cluster_id/orderer` || `/ak/api/v1/kubernetes/components/raft_clusters/:cluster_id/orderer`
	- [important] use the SAME cluster id of the existing raft cluster in the path!
- **Auth**: must have action `blockchain.components.create`
- **Body**: _removed_

<a name="get_all_deployer_data"></a>

## 5. Get ALL kubernetes components data
This api will get various data from Kubernetes on all components.
Same as API #2 (get kubernetes data), but for all known components.

- **Method**: `"GET"`
- **Route**: `/api/saas/v[123]/components` || `/ak/api/v[123]/kubernetes/components`
- **Auth**: must have action `blockchain.optools.view`
- **Body**: n/a
- **Response**:
```js
{
	// 1 entry per component
	"components":[{
		// see format in the "Get kubernetes component data" API #2 (its the same)
	}]
}
```

<a name="edit_admin_certs"></a>

## 6. Edit admin certs
This api will append or remove admin certs to the components' file system.
Certificates will be parsed.
If invalid they will be skipped.
Duplicate certificates will also be skipped.

Note: the list of current certificates can be retrieved with [API #2 (get deployer data)](#get_deployer_data).

- **Method**: `"PUT"`
- **Route**: `/api/saas/v[123]/components/:athena_component_id/certs` || `/ak/api/v[123]/kubernetes/components/:athena_component_id/certs`
- **Auth**: must have action `blockchain.components.create`
- **Body**:
```js
{
	"append_admin_certs": ["<base 64 encoded PEM here>"],		// [optional]
	"remove_admin_certs": ["<base 64 encoded PEM here>"]		// [optional]
}
```
- **Response**:
```js
{
	// this is the final list of admin certs on the file system
	"set_admin_certs": [
		{
			// the certificate...
			"base_64_pem": "<base 64 encoded PEM here>",

			// the issuer string in the certificate
			"issuer": "/C=US/ST=North Carolina/O=Hyperledger/OU=Fabric/CN=fabric-ca-server",

			// utc timestamp of the last ms the certificate is valid
			"not_after_ts": 1597770420000,

			// utc timestamp of the earliest ms the certificate is valid
			"not_before_ts": 1566234120000,

			// "unique" id of the certificate (not guaranteed, but good enough)
			"serial_number_hex": "649a1206fd0bc8be994886dd715cecb0a7a21276",

			// the alg that signed the public key in the certificate
			"signature_algorithm": "SHA256withECDSA",

			// the subject string in the certificate
			"subject": "/OU=client/CN=admin",

			// the X.509 version/format
			"X509_version": 3,

			// a friendly (human readable) duration until certificate expiration
			"time_left": "4 days"
		}
	],

	// the number of certs that were added + removed
	"changes_made": 1
}
```

## 7. Delete all components
This will delete the UI's record of **all** imported and provisioned components known to the UI.
It will also destroy the _known_ provisioned components in Kubernetes.

This api can be used to returned the UI to a clean-ish state.
Though system information like notifications, users, and api keys will remain.

- **Method**: DELETE
- **Route**: `/saas/api/v1/components/purge?force=yes` || `ak/api/v1/kubernetes/components/purge?force=yes`
- **Auth**: must have action `blockchain.components.delete`
- **Query Params**
	- `force` - if `"yes"` the deployer response will be ignored and the comp doc will be deleted regardless of deployer errors. defaults `"no"`
- **Body**: n/a```
- **Response**:
```js
{
	"deleted": [ // details of what components were destroyed
		{
			"message": "deleted",
			"type": "fabric-peer",   // node type
			"id": "orderer1Jf",    // athena component id
			"display_name": "my peer"
		}
	]
}
```

## 8. Get supported Fabric versions
This will get the list of supported Fabric versions on deployer.
You can use the versions listed in this response in the create or update component API calls.

- **Method**: GET
- **Route**: `/api/saas/v[123]/fabric/versions` || `/ak/api/v[123]/kubernetes/fabric/versions`
- **Auth**: must have action `blockchain.optools.view`
- **Query Params**
	- `cache=skip` - set to `skip` if you do not want to use the cached data
- **Body**: n/a```
- **Response**:
```js
 {
	"versions": {
		"ca": {
			"1.4.6-2": {
				"default": true,
				"version": "1.4.6-2",
				"image": {}
			}
		},
		"peer": {
			"1.4.6-2": {
				"default": true,
				"version": "1.4.6-2",
				"image": {}
			},
			"2.1.0-0": {
				"default": true,
				"version": "2.1.0-0",
				"image": {}
			}
		},
		"orderer": {
			"1.4.6-2": {
				"default": true,
				"version": "1.4.6-2",
				"image": {}
			},
			"2.1.0-0": {
				"default": false,
				"version": "2.1.0-0",
				"image": {}
			}
		}
	}
}
```

## 9. Component Actions
Submit an action to a specific component.
Multiple actions at once allowed.
[Deployer docs](https://github.ibm.com/ibp/deployer/blob/master/docs/v3_apis.md#actions)

- **Method**: POST
- **Route**:
	- `/api/saas/v[3]/components/fabric-ca/:athena_component_id/actions`
	- `/api/saas/v[3]/components/fabric-orderer/:athena_component_id/actions`
	- `/api/saas/v[3]/components/fabric-peer/:athena_component_id/actions`
	- `/ak/api/v[3]/kubernetes/components/fabric-ca/:athena_component_id/actions`
	- `/ak/api/v[3]/kubernetes/components/fabric-orderer/:athena_component_id/actions`
	- `/ak/api/v[3]/kubernetes/components/fabric-peer/:athena_component_id/actions`
- **Auth**: must have action `blockchain.components.manage`
- **Body**:
```js
// ca's have these action options:
{
	"restart": true,
	"renew": {
		"tls_cert": true,
	}
}

// orderer's have these action options:
{
	"restart": true,
	"reenroll": {
		"tls_cert": true,
		"ecert": true,
	},
	"enroll": {
		"ecert": true,
		"tls_cert": true
	}
}

// peer's have these action options:
{
	"restart": true,
	"reenroll": {
		"tls_cert": true,
		"ecert": true,
	},
	"enroll": {
		"ecert": true,
		"tls_cert": true
	},

	// if set to true, will start peer's db migration job
	"upgrade_dbs": true
}
```
- **Response**:
```js
{
	"message": "accepted",
	"id": "<component id>",
	"actions": ["restart"]
}
```
