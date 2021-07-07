# Component APIS

### Legacy notes 02/01/2019
- `node_type` is being replaced by `type`
  - in a response you should see both fields being returned for now
  - in a request you can set either, but move to `type`
- `node_id` is being replaced by `id`.
  - in a response you should see both fields being returned for now
  - in a request you can set either, but move to `type`
- `name` is no longer a valid input field. use `display_name`.
  - its still supported, but should be avoided
- `short_name` and the doc's `_id` are now the same thing (04/22/2019)
  - `short_name` will copy `_id`

## APIs
- [1. Import a component](#1-import-a-component)
- [2. Edit a component](#2-edit-a-component)
- [3. Delete imported component](#3-delete-imported-component)
- [4. Get a component](#4-get-a-component)
- [5. Get all components](#5-get-all-components)
- [6. Import bulk components](#6-import-bulk-components)
- [7. Delete imported components by tag](#7-delete-imported-components-by-tag)
- [8. Get components by a tag](#8-get-components-by-a-tag)
- [9. Bulk component status](#9-bulk-component-status)
- [10. Get components by component type](#10-get-components-by-component-type)

### Query Parameter Notes:
You can control what source the data in a **GET** request comes from by using query params.
OpTools has two sources for component data.
In 1 set athena's database will be the reliable source (like `display_name`), and the other set deployer is the reliable source (like `resources` *[full list below]*).
If you want your request to include deployer data, include the param `deployment_attrs=included` (though it may be from a cached source).
If you want data that is as accurate as possible, regardless of where it resides, use `cache=skip`.
*The legacy param of `skip_cache=yes` works too.*

- **Requests w/query params:**
	- Regarding deployment fields:
		- `deployment_attrs=included` && `cache=skip` - athena will ask deployer for this data. if athena fails to reach deployer, a `503` error is returned.
		- `deployment_attrs=included` && `cache=use` - athena will use our in memory cache first. if that misses then our db will be used. note that the db source is not live for deployment fields, it can be out of date.
		- `deployment_attrs=omitted` (or query param dne) - athena does not return deployment fields.
	- Regarding Athena fields:
		- `cache=skip` - athena will ask the db for this data.
		- `cache=use` (or query param dne) - athena will use our in memory cache first. if that misses then our db will be used.

- List of deployment attribute/fields: *Updated 08/19/2020*
	- `admin_certs`
	- `admin_certs_parsed`
	- `resources`
	- `resource_warnings`
	- `storage`
	- `version`
	- `zone`
	- `state_db`
	- `region`
	- `dep_component_id`
	- `certs`
	- `last_k8s_sync_ts`
	- `node_ou`
	- `ecert`
	- `crypto`

## 1. Import a component
Onboard a component to the UI.
This means the component is already running somewhere, and you are registering it with the UI.
This is different than creating a component from scratch, which is done with the [deployer apis](./deployer_apis).
- **Method**: POST
- **Route**:
	- `/api/v1/components`
		- session auth based api used by UI, `type` must be in body
	- `/ak/api/v1/components`
		- api key auth based api, `type` must be in body
	- `/ak/api/v1/components/ca` || `/ak/api/v1/components/fabric-ca`
		- api key auth based api, `type` in body will be overridden with `"fabric-ca"`
	- `/ak/api/v1/components/orderer` || `/ak/api/v1/components/fabric-orderer`
		- api key auth based api, `type` in body will be overridden with `"fabric-orderer"`
	- `/ak/api/v1/components/peer` || `/ak/api/v1/components/fabric-peer`
		- api key auth based api, `type` in body will be overridden with `"fabric-peer"`
	- `/ak/api/v1/components/msp`
	- `/ak/api/v1/components/msp-external`
- **Auth**: must have action `blockchain.components.import`
- **Body**:

```js
// If `type` is `msp` the body should look like this:
{
	// component type
	"type": "msp",

	// MSP ID aka the org name
	"msp_id": "org1",

	// display name of tile, legacy "name" also accepted
	"display_name": "My First Org",

	// array of base 64 encoded PEMs
	"root_certs": ["base64_encoded_cert"],

	// [optional] - array of base 64 encoded PEMs
	"intermediate_certs": ["intermediate_cert1"],

	// array of base 64 encoded PEMs
	"admins": ["base64_encoded_cert"],

	// array of base 64 encoded PEMs
	"tls_root_certs": ["base64_encoded_cert"],

	// [optional] - user defined array of lc strings
	"tags": ["something", "bank_a"],
}

// If `type` is `fabric-ca` the body should look like this:
{
	// Fabric CA
	// [sometimes optional] - component type in the route will override this field if available
	"type": "fabric-ca",

	// [optional] - will not use the OpTools `/caproxy/` http route for CA requests.
	// thus CA request will go from browser to CA.
	// (experimental 12/02/2019)
	"disable_ca_proxy" : true,

	// display name of tile, legacy "name" also accepted. (cosmetic)
	"display_name": "my first ca",

	// [optional] - indicates where the node resides
	// if this is "ibm_saas" it would mean this component is known to deployer, thus we have a k8s link.
	// any other value means its an imported component.
	// BUT BECAUSE this is an **import** API, it is not possible to set this field to "ibm_saas".
	"location": "azure" || null,

	// the CA's url for fabric operations
	"api_url": "<url w/protocol & port>",

	// [optional] - the CA's "metrics/health" url
	"operations_url": "<url w/protocol & port>",

	// [optional] - user defined array of strings to group/tag components
	"tags": ["something", "bank_a"],

	"msp":{
		"ca": {

			// name of the normal ca process
			"name": "d",

			// [optional] root certs for the tls ca process
			"root_certs": [""]
		},
		"tlsca": {

			// name of the tls ca process
			"name": "e",

			// [optional] root certs for the tls ca process
			"root_certs": [""]
		},
		"component":{

			// normal CA's TLS cert
			"tls_cert": "f",
		}
	}
}

// If `type` is `fabric-peer` the body should look like this:
{
	// Fabric Peer
	// [sometimes optional] - component "type" in the route will override this field if available
	"type": "fabric-peer",

	// display name of tile, legacy "name" also accepted. (cosmetic)
	"display_name": "my first peer",

	// [optional] - indicates where the node resides
	// if this is "ibm_saas" it would mean this component is known to deployer, thus we have a k8s link.
	// any other value means its an imported component.
	// BUT BECAUSE this is an **import** API, it is not possible to set this field to "ibm_saas".
	"location": "aws" || null,

	"msp_id": "PeerOrg1",

	// [optional] - the peer's grpc url for fabric operations
	"api_url": "<url w/protocol & port>",

	// the peer's grpc **web proxy** url for fabric operations
	"grpcwp_url": "<url w/protocol & port>",

	// [optional] - the peer's "metrics/health" url
	"operations_url": "<url w/protocol & port>",

	// [optional] - user defined array of strings to group/tag components
	"tags": ["something", "bank_a"],

	// [optional] - required for tls, legacy "pem" is also accepted
	"tls_cert": "<base 64 encoded pem>",
}

// If `type` is `fabric-orderer` the body should look like this:
{
	// Fabric Orderer
	// [sometimes optional] - component "type" in the route will override this field if available
	"type": "fabric-orderer",

	// display name of child tile, legacy "name" also accepted. (cosmetic)
	"display_name": "my first orderer",

	// the unique id of the raft cluster
	"cluster_id": "abcd",

	// this is the parent tile name for the raft cluster. (cosmetic)
	"cluster_name": "My Raft Cluster",

	// [optional] - indicates where the node resides
	// if this is "ibm_saas" it would mean this component is known to deployer, thus we have a k8s link.
	// any other value means its an imported component.
	// BUT BECAUSE this is an **import** API, it is not possible to set this field to "ibm_saas".
	"location": "google" || null,

	"msp_id": "PeerOrg1",

	// [optional] - the orderer's grpc url for fabric operations
	"api_url": "<url w/protocol & port>",

	// the orderer's grpc **web proxy** url for fabric operations
	"grpcwp_url": "<url w/protocol & port>",

	// [optional] - the orderer's "metrics/health" url
	"operations_url": "<url w/protocol & port>",

	// [optional] - user defined array of strings to group/tag components
	"tags": ["something", "bank_a"],

	// [optional] - required for tls, legacy "pem" is also accepted
	"tls_cert": "<base 64 encoded pem>",

	// [optional] - id of the system channel
	// defaults "testchainid"
	"system_channel_id": "testchainid"
}
```
- **Response**:
```js
{
	// The data that was sent in is returned
	// plus these fields:
	"message": "ok",
	"id": "ca_node01234",       // this is your component's id
	"timestamp": 1537262855753, // unix timestamp of component importing, UTC, ms
	"scheme_version": "v1",     // the doc JSON data structure we are currently using
}
```
<a name="edit"></a>

## 2. Edit a component
Use this api to edit the doc directly.
This api will not call deployer.

Send the fields you want to edit in the body.
Omit fields you want left alone.
Use the `Get a component` API to view the current component doc.

These fields are never editable: `'type', 'cluster_id', '_id', '_rev', 'id', 'timestamp'` (if included they will error if using `/v2/` or `/v3/`).

These fields are not editable via this api `'replicas', 'resources', 'storage', 'zone', 'config_override', 'version'` (if included they will error if using `/v2/` or `/v3/`).

The field `edited_timestamp` will be added or updated when the edit is made.

- **Method**: PUT
- **Route**: `/api/v[123]/components/:component_id` || `/ak/api/v[123]/components/:component_id`
- **Auth**: must have action `blockchain.components.import`
- **Body**:
```js
{
	"display_name": "node-edited",
	"api_url": "<some url w/protocol and port here>",

	// triggers multi-doc-edit - all docs with the same cluster id get this edit
	// field was created to hold the display name of the parent tile of the orderer cluster
	"cluster_name": ""

	// triggers multi-doc-edit - all docs with the same cluster id get this edit
	// field was created to hold any results from walking the system channel
	"system_channel_data": {}

	// triggers multi-doc-edit - all docs with the same cluster id get this edit
	// field was created to hold the name of the system channel
	"system_channel_id": ""

	// etc (most fields in the doc are editable, not all are listed here)
}
```
- **Response**:
```js
{
  // the final component data is sent back (w/edits)
}
```

## 3. Delete imported component
Delete the UI's record of a component.
Note this api does **not** destroy the component's deployment in Kubernetes (if applicable).

Provide the component's OpTool id in the path to delete.
If deleting an enroll id (for template related things), use the `id` field, not `enroll_id`.

- **Method**: DELETE
- **Route**: `/api/v[23]/components/:component_id` || `/ak/api/v[23]/components/:component_id`
- **Auth**: must have action `blockchain.components.remove`
- **Body**: n/a
- **Response**:
    - `200`:
        ```js
        {
            "message": "delete",
            "id": "cf2cec3c2edffa78fac5c3ac5d5b4ce7",
            "display_name": "mypeer",
            "type": "fabric-peer"
        }
        ```
    - `404`: TODO

<a name="get"></a>

## 4. Get a component
Get component data.
- **Method**: GET
- **Route**: `/api/v[123]/components/:component_id` || `/ak/api/v[123]/components/:component_id`
- **Query Params**:
	- `deployment_attrs=included` - set to `included` if you want kubernetes deployment attributes such as resources, storage, zone and others.
	- `parsed_certs=included` - set to `included` if you want the response to include certificate attributes like serial numbers, expiration, issuer, expiration and more to be returned. if enabled look for the data in field `<field_name>_parsed`, like `tls_cert` -> `tls_cert_parsed`. Getting `admin_certs_parsed` will require setting the query parameter `deployment_attrs=included` as well as this one...
	- `ca_attrs=included` - set to `included` if you want live ca data such as `ca_name`, `root_cert`, `fabric_version`, `issuer_public_key` and `issued_known_msps`.
	- `cache=skip` - set to `skip` if you do not want to use the cached data
- **Auth**: must have action `blockchain.optools.view`
- **Body**: n/a
- **Response**:
```js
{
	// actual url of component
	"api_url": "https://url.looking.thingy.com",

	// field only appears if its a ca
	"ca_name": "org1CA",

	// field only appears if its a CA and its set.
	// will not use the OpTools `/caproxy/` http route for CA requests.
	// thus CA request will go from browser to CA.
	// (experimental 12/02/2019)
	"disable_ca_proxy" : true,

	// the cosmetic name of your component, seen on the tile
	"display_name": "My CA",

	// the unique id of this component
	"id": "myca",

	// indicates where node resides
	// if this is "ibm_saas" it means this component is known to deployer, thus we have a k8s link.
	// any other value means its an imported component.
	"location": "ibm_saas" || null,

	// provided if available, see fabric
	"operations_url": "grpcs://another.url.com",

	// field only appears if its a orderer or peer, grpc web proxy url
	"grpcwp_url": "http://example.com:3000",

	// node ou settings
	"node_ou": {
		"enabled": true
	},

	// enrollment cert
	"ecert": {
		"cert": "",
		"cacert": "",
	},

	"region": "us-south",

	// field only appears for SaaS nodes
	"resource_warnings": "none",

	// the resources settings that the UI knows.
	// might not match the settings k8s is using.
	// field only appears for SaaS nodes.
	// (only provided if deployment_attrs=included)
	"resources": {
		"ca": {
		"limits": {
				"cpu": "100m",
				"memory": "256Mi"
			},
			"requests": {
				"cpu": "100m",
				"memory": "256Mi"
			}
		}
	},

	// version of this JSON format
	"scheme_version": "v1",

	// the resources settings that the UI knows.
	// might not match the settings k8s is using.
	// field only appears for SaaS nodes.
	// (only provided if deployment_attrs=included)
	"storage": {
		"ca": {
			"class": "default",
			"size": "1Gi"
		}
	},

	// tags are like labels, cosmetic
	"tags": [
		"fabric-ca",
		"ibmcloud",
		"my_template"
	],

	// unix timestamp of component importing, UTC, ms
	"timestamp": 1571688769353,

	// base 64 encoded certificate
	"tls_cert": "<redacted>",

	// field only appears if its a ca
	"tlsca_name": "tlsca",

	// indicates if the component is a CA, Peer, or Orderer
	"type": "fabric-ca",

	// Hyperledger Fabric version on the component
	"version": "1.4.3-1.4bdaf9c",

	// k8s zone of the deployment
	// (only provided if deployment_attrs=included)
	"zone": "dal10",

	// UI uses this url to talk to the grpc web proxy.
	// it sometimes differs from the grpcwp_url or api_url when the browser needs athena to
	// proxy the request to get around self signed cert issues.
	"url2use": "https://url.looking.thingy.com"


	// parsed admin cert data (only provided if parsed_certs=included)
	// elements in array are ordered. they match positions in "admin_certs".
	// so admin_certs[2] is the same cert for admin_certs_parsed[2]
	"admin_certs_parsed": [
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

	// parsed tls cert data (only provided if parsed_certs=included)
	"tls_cert_parsed": {
		// same format as "admin_certs_parsed"
	}

	// (only provided if ca_attrs=included)
	// CA components will have these fields appended with data fetched from the `/cainfo` endpoint of a CA:
	// The field `issued_known_msps` indicates imported IBP MSPs that this CA has issued.
	// Meaning the MSP's root cert contains a signature derived from this CA's root cert.
	// if 0 MSPs were issued by this CA the field "issued_known_msps" will not exist.
	"ca_name": "ca",
	"root_cert": "<base 64 pem>"
	"fabric_version": "1.4.3",
	"issuer_public_key": "<base 64 pem>",
	"issued_known_msps":  {
		"display_name": "msp one",
		"id": "msp-one",
		"msp_id": "msp1"
	},

	// (only provided if ca_attrs=included)
	// MSP components will have the field `issued_by_ca_id` appended.
	// This field indicates the id of a IBP console CA that issued this MSP.
	// Meaning the MSP's root cert contains a signature derived from this CA's root cert.
	// if the issuing CA is not found, field will say "unknown".
	"issued_by_ca_id": "ca1"
}
```

## 5. Get all components
Get data about all known components.
- **Method**: GET
- **Route**: `/api/v[23]/components` || `/ak/api/v[23]/components`
- **Query Params**:
	- `deployment_attrs=included` - set to `included` if you want kubernetes deployment attributes such as resources, storage, zone and others.
	- `parsed_certs=included` - set to `included` if you want the response to include certificate attributes like serial numbers, expiration, issuer, expiration and more to be returned. if enabled look for the data in field `<field_name>_parsed`, like `tls_cert` -> `tls_cert_parsed`. Getting `admin_certs_parsed` will require setting the query parameter `deployment_attrs=included` as well as this one...
	- `ca_attrs=included` - set to `included` if you want live ca data such as `ca_name`, `root_cert`, `fabric_version`, `issuer_public_key` and `issued_known_msps`.
	- `cache=skip` - set to `skip` if you do not want to use the cached data
- **Auth**: must have action `blockchain.optools.view`
- **Body**: n/a
- **Response**:
```js
// should return an array of all components
"components": [
	{
		// same format as GET component by id, api #4 's response
	}
]
```

## 6. Import bulk components
Import a bunch of components at once.
- **Method**: POST
- **Route**: `/api/v1/components/bulk` || `/ak/api/v1/components/bulk`
- **Auth**: must have action `blockchain.components.import`
- **Body**:
```js
// array of components to import
[
    {
        // each component should follow the same requirements as import api #1
    }
]
```
 - **Response**:
 ```js
    // Array of docs that were sent in is returned
    [
         {
             "message": "ok",
             "id": "ca_node01234",  // this is your component's id
             "type": "fabric-ca",
             "display_name": "ca_node",
             "location": "-",
             "msp_id": "PeerOrg1",
             "api_url": "<some url w/protocol and port here>",
             "ca_name": "org1CA",
             "timestamp": 1537262855753,
             "additional_property": "some additional property"
         },
         {
             "message": "ok",
             "id": "ca_node01234",  // this is your component's id
             "type": "fabric-ca",
             "display_name": "ca_node",
             "location": "-",
             "msp_id": "PeerOrg1",
             "api_url": "<some url w/protocol and port here>",
             "ca_name": "org1CA",
             "timestamp": 1537262855753,
             "additional_property": "some additional property"
         }
    ]
]
```

## 7. Delete imported components by tag
This api will delete the UI's data about each component. Aka bulk import delete.
It finds and deletes all components with the matching tag.

This logic is controlled by the `tags` array in the component data.
Tags are not case sensitive.

This api was built for deleting entire raft orderer clusters at once, but it will work on any tag.

Expect a http status code of **207** when mixed results occur.

Note this api does not destroy the component's deployment in Kubernetes (if applicable).
It only deletes our record of the component.

- **Method**: `"DELETE"`
- **Route**: `/api/v[123]/components/tags/:tag` || `/ak/api/v[123]/components/tags/:tag`
- **Auth**: must have action `blockchain.components.remove`
- **Body**: `n/a`
- **Response**:
    - `200`: TODO
    - `207`:
        ```js
        {
            // an array of components that were deleted successfully
            "deleted": [
                {
                    "message": "deleted",
                    "type": "fabric-peer",   // node type
                    "id": "orderer1Jf",    // athena component id
                    "display_name": "my peer"
                }
            ]
        }
        ```
    - `404`: TODO

## 8. Get components by a tag
Get all components that have a specific tag. Tags are not case sensitive.
- **Method**: GET
- **Route**: `/api/v[123]/components/tags/:tag` || `/ak/api/v[123]/components/tags/:tag`
- **Auth**: must have action `blockchain.optools.view`
- **Query Params**:
	- `deployment_attrs=included` - set to `included` if you want kubernetes deployment attributes such as resources, storage, zone and others.
	- `parsed_certs=included` - set to `included` if you want the response to include certificate attributes like serial numbers, expiration, issuer, expiration and more to be returned. if enabled look for the data in field `<field_name>_parsed`, like `tls_cert` -> `tls_cert_parsed`. Getting `admin_certs_parsed` will require setting the query parameter `deployment_attrs=included` as well as this one...
	- `cache=skip` - set to `skip` if you do not want to use the cached data
- **Body**: n/a
- **Response**:
```js
{
	"components":[
		{
			// same format as GET component by id, api #4 's response
		}
	]
}
```

## 9. Bulk component status
Get the status of multiple components at a time. aka batch status API.

- For a **CA** this api will call the component's `api_url` + `"/cainfo"` rest endpoint.
- For an **Orderer** this api will call the component's `operations_url` + `"/healthz"` rest endpoint.
- For an **Peer** this api will call the component's `operations_url` + `"/healthz"` rest endpoint.

A "good" status is if the url above responds with a 2xx or 3xx http status code.
Thus this is more of a "is this component reachable from athena" check, than a "is this component healthy" check.

Note that this code will **not** verify TLS certs on the component.
Thus self signed tls certs can be used by the components w/o issue.

Note that the http status code of this response will be `207` as long as OpTools does not encounter internal issues reading the database.
The client will not be able to tell if all of the statuses are good (or bad) from the response code of this request.
The client needs to inspect the object of component statuses in the response and look at each `status` field.

- **Method**: POST
- **Route**: `/api/v1/components/status` ||  `/ak/api/v1/components/status`
- **Auth**: Must have action `blockchain.optools.view` in session
- **Body**:
```js

{
	"components": {

		// CA Status Example:
		"my_ca1": { // the component id to check, must exist in our db

			// optional - time to wait for this status req - defaults to setting HTTP_STATUS_TIMEOUT
			"timeout_ms": 2000,

			// optional - set to true if you want to see the /cainfo response - defaults false
			"include_status_resp": true,

			// optional - if the in-memory cache should **not** be used - defaults false
			"skip_cache": true
		},

		// Orderer Status Example:
		"my_orderer1": { // the component id to check, must exist in our db

			// optional - time to wait for this status req - defaults to setting HTTP_STATUS_TIMEOUT
			"timeout_ms": 2000,

			// optional - set to true if you want to see the /healthz response - defaults false
			"include_status_resp": true,

			// optional - if the in-memory cache should **not** be used - defaults false
			"skip_cache": true
		},

		// Peer Status Example:
		"my_peer1": { // the component id to check, must exist in our db

			// optional - time to wait for this status req - defaults to setting HTTP_STATUS_TIMEOUT
			"timeout_ms": 2000,

			// optional - set to true if you want to see the /healthz response - defaults false
			"include_status_resp": true,

			// optional - if the in-memory cache should **not** be used - defaults false
			"skip_cache": true
		}
	}
}
```
- **Response**:
```js
{
	"components": {

		"my_ca1": {

			// url that was called
			"status_url": "https://n3a3ec3-orderercf79c31.ibpv2-test-cluster.us-south.containers.appdomain.cloud:8443/cainfo",

			// will be "ok" if the http status code is 2xx or 3xx else "not ok"
			// status is null if the component by this id does not exist
			"status": "ok",

			// optional - contains the response of the url above - only present if "include_status_resp" === true
			"status_resp": {}

		},

		"my_orderer1": {

			// url that was called
			"status_url": "https://n3a3ec3-orderercf79c31.ibpv2-test-cluster.us-south.containers.appdomain.cloud:8443/healthz",

			// will be "ok" if the http status code is 2xx or 3xx else "not ok"
			// status is null if the component by this id does not exist
			"status": "ok",

			// optional - contains the response of the url above - only present if "include_status_resp" === true
			"status_resp": {}
		},

		"my_peer1": {

			// url that was called
			"status_url": "https://n3a3ec3-orderercf79c31.ibpv2-test-cluster.us-south.containers.appdomain.cloud:8443/healthz",

			// will be "ok" if the http status code is 2xx or 3xx else "not ok"
			// status is null if the component by this id does not exist
			"status": "ok",

			// optional - contains the response of the url above - only present if "include_status_resp" === true
			"status_resp": {}
		}
	}
}
```

## 10. Get components by component type
Get all components that have a specific component type. Valid types: `fabric-peer` , `fabric-ca` or `fabric-orderer`.
- **Method**: GET
- **Route**: `/api/v[23]/components/types/:type` || `/ak/api/v[23]/components/types/:type`
- **Auth**: must have action `blockchain.optools.view`
- **Body**: n/a
- **Query Params**:
	- `deployment_attrs=included` - set to `included` if you want kubernetes deployment attributes such as resources, storage, zone and others.
	- `parsed_certs=included` - set to `included` if you want the response to include certificate attributes like serial numbers, expiration, issuer, expiration and more to be returned. if enabled look for the data in field `<field_name>_parsed`, like `tls_cert` -> `tls_cert_parsed`. Getting `admin_certs_parsed` will require setting the query parameter `deployment_attrs=included` as well as this one...
	- `cache=skip` - set to `skip` if you do not want to use the cached data
- **Response**:
```js
{
	"components":[
		{
			// same format as GET component by id, api #4 's response
		}
	]
}
```
