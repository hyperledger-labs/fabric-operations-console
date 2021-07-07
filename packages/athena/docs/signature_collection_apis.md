# Signature Collection APIs

Note some of apis below that communicate from athena to athena are authenticated by a **signature**.
Ie we will validate the signatures themselves using the public keys of the msp.
The public certs of external msps must be imported to athena by a valid user via [API #8](#8).
All acceptable signing parties for a athena can be fetched with [API #9](#9).

## 1. Get all signature collection txs
Use this api to view all signature collection transactions (sig txs).
Filtering options are available via query parameters.
- **Method**: GET
- **Route**: `/api/v[123]/signature_collections` || `/ak/api/v[123]/signature_collections`
- **Auth**: Must have action `blockchain.optools.view`
- **Query Params**
	- `filter_orderers` - set to an array of orderer hostnames if you only want sig collection transactions that involve certain orderers. the default response will show all transactions.
		- example: `filter_orderers=["n98af1c-orderer-c.ibpv2-test-cluster.us-south.containers.appdomain.cloud:3010"]`
	- `full_details` - set to `omitted` if you only want a summary of the tx and not the full sig collection doc. summary includes the channel name, tx_id, creation timestamp, status and list of orderers. default responses will include all the details.
	- `group_by` - set to `channels` if you want an alternative format where the transaction docs are bucketed by channel names (a dictionary of channel names is created). use this to get an easier to parse list of channels. default responses will not use this channel dictionary format.
	- `status` - set to `all` or `closed` or `open` to get transactions of only this state. default responses will include all.
- **Body**: `n/a`
- **Response**:
```js
{
	"signature_collections": [
		{
			// same structure seen in api #2's response (below)
		}
	]
}
```

## 2. Get a signature collection tx
Use this api to view a single signature collection transaction.
- **Method**: GET
- **Route**: `/api/v[123]/signature_collections/:tx_id` || `/ak/api/v[123]/signature_collections/:tx_id`
- **Auth**: Must have action `blockchain.optools.view`
- **Body**: `n/a`
- **Response**:
```js
{
	// --- [Fields common [c] to channel & ccd transactions] ---- //

	// [c] the authorization header that was used to authenticate the creation of this signature request
	"auth_header": "Signature MEQCICJs9rvSsmsXI/Fc5VkKyLgVDRMOhID1fq7HNYGj8xilAiA2Wyw3XgTZbYQkG62ufL2gIp7Vqopz4qUKaIQ1y2rv8A==",

	// [c] the name of the channel that this tx applies to
	"channel": "first",

	// [c] holds the historic http response from a previous signature collection distribution operation
	"distribution_responses": [{  // 1 entry per distribution attempt
		"distribute": "all",   // w/e the distribute setting was when this was created
		"timestamp": 0,        // unix timestamp the distributions were sent, ms, utc
		"errors": [],
		"successes": [   // response
			{
				"msp_id": "org2",
				"optools_url": "http://localhost:3000",
				"message": "ok",
				"tx_id": "abcd"
			}
		]
	}],

	// [c] array of valid orderer hostname:ports to submit this transaction to
	"orderers": [
		"grpcs://localhost:3010",
	],

	// [c] list of MSPs/Orgs that should be **asked** to sign
	"orgs2sign": [
		{
			"msp_id": "org1",
			"optools_url": "http://localhost:3000",
			"timeout_ms": 10000,
			"signature": "MEUCIQDH1FjDb5TAOyLFjvwMXb7qoLQGiH33djQJeYr2trNknQIgIuIDJrvtCGG1gX8WTeUd7p4MzxyaPls4DaStbnRbnho=",
			"timestamp": 0
		}
	],

	// [c] the MSP ID who created/started this signature collection
	"originator_msp": "org1",

	// [c] either "closed" or "open"
	"status": "open",

	// [c] unix timestamp the tx was created, ms, utc
	"timestamp": 1554750385450,

	// [c] where to show this tx in the ui
	// possible values "archive" or "inbox"
	"visibility": "inbox",

	// [c] the unique id to identify the sig collection
	"tx_id": "abcd"

	// [c] indicates if this tx is for a channel config update ("channel") or a Chaincode Definition("ccd")
	"tx_type": "channel" || "ccd"




	// --- [Fields only on a channel [ch] transaction] ---- //

	// [ch] opaque object to athena - apollo field
	"current_policy": {},

	// [ch] array of current channel consenters.
	"consenters": ["192.168.5.0:3000", "192.168.6.0:3000"],

	// [ch] opaque object to athena - apollo field
	"json_diff": {},

	// [ch] list of orderer MSPs/Orgs that should be **asked** to sign
	"orderers2sign": [{}],

	// [ch] the protobuf that needs signatures as a base 64 string
	"proposal": "<protobuf as base 64>",

	// [ch] array of component ids - apollo field
	"reference_component_ids": ["abcd"],




	// --- [Fields only on a Chaincode Definition [ccd] transaction] ---- //

	// [ccd] the chaincode definition
	"ccd": {
		// large object, see format in api #3 body, field "ccd"
	}
}
```

<a name="3"></a>

## 3. Store signature collection tx
Use this api to init a signature collection transaction.
It will also be used by OpTools to receive a signature collection tx from other OpToolians.
- **Method**: POST
- **Route**: `/api/v[123]/signature_collections` || `/ak/api/v[123]/signature_collections`
- **Auth**: The header `Authorization` must be present and follow this format:
    - `Authorization: Signature <signature_b64>`
    - `Signature` - the word "Signature" followed by a single space, case sensitive
    - `<signature_b64>` - this is some identity's signature as base 64 over the body. **Use the stitch function [stitch.buildSigCollectionAuthHeader()](https://github.ibm.com/IBM-Blockchain/stitch/tree/master/docs#buildSigCollectionAuthHeader) to do all steps.** Creating it manually is a few steps:
        1. remove the `distribute` field
        1. sort the keys in the remaining body
        1. stringify the remaining body you are sending
        1. create a SHA 256 hash of the stringified body (hex string)
        1. sign this hash with a private key. (typically any identity's key will do, see next bullet)
        1. convert signature to base64. Use this value for `<signature_b64>`.
    - use the matching certificate to this private key in the body field: `authorize.certificate`. Note there are special rules on what certs will work, see comments near `authorize.certificate` field in body below.
- **Body**:
```js
{
	// Fields marked as "apollo field" are fields that athena doesn't read. they are set and used by apollo.

	// --- [Fields common [c] to channel & ccd transactions] ---- //

	// [c] [required] the unique id to identify the sig collection
	// must start with a letter (couchdb limitation on doc ids)
	tx_id: "<globally unique transaction id, uuid v4>",

	// [c] [required] the name of the channel that this tx applies to
	channel: "first",

	// [c] [optional] should this athena distribute the collection to other athenas
	// - "missing" - (default) will send this tx to all "orgs2sign" & "orderers2sign" that have not signed
	// - "all" - will send this request to all "orgs2sign"
	// - "none" - will not contact other athenas
	// - [], the array should contain custom athena urls + msp id to distribute to.
	distribute: "none" || "all" || "missing" || [{"optools_url":"https://this.athena.ibm.com:443","msp_id":"org1"}],

	// [c] [required] array of valid orderer hostname:ports to submit this transaction to
	orderers: ["192.168.1.0:3000"],

	// [c] [required] array of orgs that should sign
	orgs2sign: [
		{

			// [c] [required] the id of this org, their signature is being requested
			msp_id: "org1",

			// [c] [required] the OpTools url of this org. include protocol, port, & hostname (path is no longer needed)
			// the path to use during distribution will be decided internally (`/api/v1/*` or `/api/v2/*`) by the paths availability.
			optools_url: "http://localhost:3000",

			// [c] [optional] max time to wait (in ms) for this org's OpTools to respond. defaults 10 seconds
			// not applicable if distribute is "none"
			timeout_ms: 10000,

			// [ch] [optional] in a channel tx the signature field is the org's signature over the proposal.
			// this if what Fabric needs to accept the proposal.
			// base 64 string.
			// it cannot be fake, it will be decoded using the "ConfigSignature" protobuf
			// if the org has not signed yet, set it to `null`.

			// [ccd] [optional] in a ccd tx the signature field should be the string "approval_submitted"
			// if the org has not signed yet, set it to `""` (empty string).
			// this is this way b/c cc definition approvals are handled by fabric's _lifecycle cc.
			// we do not have the signature...
			signature: "<signature here>",

			// [c] [optional] utc timestamp in ms of when the signature was created
			// helps resolve conflicts, signatures from the same org with a more recent ts overwrite older ones
			// defaults to current utc timestamp
			timestamp: 0,

			// [ch] [optional] if true this msp is an admin on the channel
			// thus this signature counts towards the policies requirement
			// this helps the UI judge if enough signatures have been collected
			admin: false,

			// [ccd] [optional] string - id of the chaincode package (only present if the org has installed the cc)
			// apollo field
			package_id: "marbles_1:92321c359d1efcd65dc34c6ee334e37870a4a2130889473173fad3ddf7c02249",

			// [ccd] [optional] array strings - peer url + port (grpc web proxy url for a peer)
			// (opaque object to athena) - apollo/stitch field [DO NOT USE url2use, CORS issues]
			peers: ["192.168.1.0:3000"],
		}
	],

	// [c] [required] the MSP ID who created/started this signature collection
	originator_msp: "org1",

	// [c] [required] indicates if this tx is for a channel config update ("channel") or a Chaincode Definition("ccd")
	tx_type: "channel" || "ccd",

	// [c] [required] - use this field to aid authorization of your request with an OpTools.
	// this field alone is not enough. the "Authorization" header must also be built, instructions above.
	authorize: {

		// the msp id for the identity that is creating the "Authorization" header in this request
		msp_id: 'org1',

		// the cert for the identity that created the "Authorization" header in this request.
		// note that this cert must be signed by a ca root cert (or intermediate) that has been imported OR
		// registered to the UI.
		// use api #8 in this file to "register" external MSPs or use the "import" MSP (api #1) in ./components.md.
		// the "import" MSP api is preferred.
		certificate: "<base 64 pem>"

		// OpTools v2.5.x and up should set this to "v2". else omit the field or set "v1".
		// v1 works on older optools, v2 and v1 work on newer. plan is to phase out v1.
		hash_ver: "v2"
	},

	// [c] [optional] opaque object to athena - apollo field
	current_policy : {},



	// --- [Fields only on a channel [ch] transaction] ---- //

	// [ch] [required] array of current channel consenters.
	// The consenter should be specified using the api_url(sans grpcs://) for the ordering node.
	consenters: ["192.168.5.0:3000", "192.168.6.0:3000"],

	// [ch] [optional] opaque object to athena - apollo field
	json_diff: {},

	// [ch] [required] - but may be an empty array
	// array of orderer orgs that should be **asked** to sign, same format as orgs2sign
	orderers2sign: [{}],

	// [ch] [required] the protobuf that needs signatures as a base 64 string
	proposal: "<protobuf as base 64>",

	// [ch] [optional] array of strings - apollo field
	// athena component ids of the raft nodes that are being added as a consenter in this update.
	// if this update is not touching consenters, omit this field.
	//
	// note that these IDs only have meaning on the original (local) athena.
	// the field will still be sent to external athenas b/c the auth is signed over the whole body.
	// but external athenas will have no use of this field.
	reference_component_ids: ["abcd"],



	// --- [Fields only on a Chaincode Definition [ccd] transaction] ---- //

	// [ccd] [required] the chaincode definition that needs to be approved
	"ccd": {

		// [required] integer - tracks the number of times a chaincode def has been defined or updated
		"chaincode_sequence": 1,

		// [required] string - chaincode id/name
		"chaincode_id": "marbles",

		// [required] string - chaincode version
		"chaincode_version": "v1",

		// [optional] string - system chaincode name to use to check endorsements
		"endorsement_plugin": "escc",

		// [optional] boolean - controls if the first invoke should be "init" or not
		"init_required": true,

		// [!] removed/moved 06/22/2020 [!]
		// "packaged_id" should be set in the "orgs2sign" entry since it will vary org to org
		// "package_id": "marbles_1:92321c359d1efcd65dc34c6ee334e37870a4a2130889473173fad3ddf7c02249"

		// [optional] string - system chaincode name to use to validate
		"validation_plugin": "vscc",

		// [optional] string - name of a channel's signature policy to use for the cc's endorsement policy
		"validation_parameter": "/Channel/Application/Endorsement"


		// [optional] string - array of static collection config (Scc), conforms to peer/collection.proto
		"collections_obj": [{

			// [required] string - name of the StaticCollectionConfig message
			"name": 'myCollection-v1',

			// [optional] number - minimum number of peers that must get the private data to successfully endorse
			"required_peer_count": 1,

			// [optional] number - max number of peers the endorsing peer can try to send private data to
			"maximum_peer_count": 5,

			// [optional] signature policy controlling which orgs must endorse private data changes
			"member_orgs_policy": `AND('Org1.admin', 'Org2.member')`,

			// [optional] number - when to expire private data.
			"block_to_live": 1,

			// [optional] boolean - if true, only collection member clients can read private data
			"member_only_read": true,

			// [optional] boolean - if true, only collection member clients can read private data
			"member_only_write": false,

			// [optional] signature policy controlling which orgs must endorse chaincode proposals
			"endorsement_policy": `AND('Org1.admin', 'Org2.member')`
		}],
	}
}
```
- **Response**:
```js
{
	"message": "ok",
	"tx_id": "<transaction id here>",
	"distribution_responses": {

		// w/e req.body.distribute had
		"distribute": "missing",

		// unix timestamp, utc of distributions
		"timestamp": 0,

		// errors that occurred during OpTools to OpTools distribution
		"errors": [],

		// successful OpTools to OpTools distributions
		"successes": [

			// array of bodies returned + url of other athenas, if error use error format
			{
				"optools_url": "http://some.athena.ibm.com:443",
				"message": "ok",
				"tx_id": "<transaction id here>",
				"msp_id": "org1",
			}
		]
	},

	/* the rest of the config tx doc, similar to input */

}
```

<a name="4"></a>

## 4. Edit signature collection tx
Use this api to append a new signature, close a sig collection, or redistribute a sig collection.
It will also be used by OpTools to send/receive signatures from external OpTools.

This api can distribute this tx meaning it can forward this incoming edit to others Optools.
Thus it can add a new signature to the tx doc on an OpTools other than this one.
To do this you should have at least 1 signature in the `orgs2sign` or `orderers2sign` array in this body.
Also set `distribute` to `"all"`.

If you need to resend/replay a distribution tx, say b/c an OpTools was down at the time, [API #7](#7).

- **Method**: PUT
- **Route**: `/api/v[123]/signature_collections/:tx_id` || `/ak/api/v[123]/signature_collections/:tx_id`
- **Auth**: The header `Authorization` must be present. See API #3 for full details.
- **Body**:
```js
{
	// [optional] should this athena distribute the signature to other athenas
	// - "all" - (default) will send this request to all "orgs2sign"
	// - "none" - will not contact other athenas
	// - [], the array should contain custom athena urls + msp id to distribute to.
	distribute: "none" || "all" || [{"optools_url":"https://this.athena.ibm.com:443","msp_id":"org1"}],

	// [required] array of orgs who's signatures are being added. can be empty array.
	orgs2sign: [
		{

			// [required]
			msp_id: "org1",

			// [optional] athena url of said org, include protocol, port, & hostname.
			// the path to use during distribution will be decided internally (`/api/v1/*` or `/api/v2/*`) by the paths availability.
			// if field is omitted the current value in the tx doc will persist.
			optools_url: "http://some.athena.ibm.com:443",

			// [optional] max time to wait (in ms) for this org's athena to respond.
			// defaults 10 seconds.
			// not applicable if distribute is "none".
			// if field is omitted the current value in the tx doc will persist.
			timeout_ms: 10000

			// [required] this orgs "ConfigSignature" over the proposal.
			// this if what Fabric needs to accept the proposal.
			// it cannot be fake, it will be decoded using the ConfigSignature protobuf
			signature: "<signature here as base 64>",

			// [optional] utc timestamp in ms of last known activity.
			// helps resolve merge conflicts, most recent ts wins.
			// if field is omitted the current date time will be used.
			timestamp: 0,

			// [optional] if true this msp is an admin on the channel.
			// thus this signature counts towards the policies requirement.
			// this helps the UI judge if enough signatures have been collected.
			// if field is omitted the existing value in the tx doc will persist.
			admin: false
		}
	],

	// [optional] - may be empty array
	// array of orderer orgs that should sign, same format as orgs2sign
	orderers2sign: [],

	// [required sometimes] - use this field to aid in authorizing your request with athena
	authorize: {

		// its the msp id for the identity that created the "Authorization" header
		// (just use the sam msp that is add a signature or submitting)
		msp_id: 'org1',

		// the cert for the identity that created the "Authorization" header in this request.
		// note that this cert must be signed by a ca root cert (or intermediate) that has been imported OR
		// registered to the UI.
		// use api #8 in this file to "register" external MSPs or use the "import" MSP (api #1) in ./components.md.
		// the "import" MSP api is preferred.
		certificate: "<base 64 pem>",

		// OpTools v2.5.x and up should set this to "v2". else omit the field or set "v1".
		// v1 works on older optools, v2 and v1 work on newer. plan is to phase out v1.
		hash_ver: "v2"
	},

	// [optional] valid options are "open" or "closed"
	// if omitted the current status remains
	status: "closed"
}
```
- **Response**:
```js
{
	"message": "ok",
	"tx_id": "<transaction id here>",
	"distribution_responses": [{ // 1 entry per distribution attempt
		"distribute": "missing", // w/e the distribute setting was when this was created
		"timestamp": 0, // unix timestamp, utc of distributions
		"errors": [],
		"successes": [{ // array of bodies returned + url of other athenas, if error use error format
			"optools_url": "http://some.athena.ibm.com:443",
			"message": "ok",
			"msp_id": "org1"
		}],
	}],

	/* the rest of the config tx doc */

}
```
- **Details**:
	- if the `tx_id` does not exist, returns a 400 error
	- each entry in `orgs2sign` will be merged with the collection tx doc:
		- a new signature that doesn't currently exist will be added to the collection tx doc
		- a signature that already exists will be replaced only if this one's timestamp is more recent (not an error)
		- if an org does not exist in the original tx doc, athena will return a 400 error and not change the doc
	- if the `distribute` field is `all` or `missing` athena will send this request to each applicable athena listed in `orgs2sign`
		- the distribute request will always have `distribute` set to `none` to avoid a loop
		- wait for all distribution responses before responding

## 5. Delete signature collection
Use this api to remove a local signature collection && it will distribute the delete to other OpTools.
- **Method**: DELETE || PUT
- **Route**:
	- method `DELETE`: `/api/v[123]/signature_collections/:tx_id` || `/ak/api/v[123]/signature_collections/:tx_id`
	- method `PUT`: `/api/v[123]/signature_collections/:tx_id/terminate`
		- this alt route was created b/c swagger yells about a body on a DELETE method (its not restful)
- **Auth**:
	- The header `Authorization` must be present if distribute is to be used . See API #3 for full details.
	- If `distribute` is `none`, then a local session auth or api key can be used
- **Body**:
```js
	// [optional] should this athena distribute the collection to other athenas
	// - "all" - (default) will send this request to all "orgs2sign"
	// - "none" - will not contact other athenas
	// - [], the array should contain custom athena urls + msp id to distribute to.
	distribute: "none" || "all" || [{"optools_url":"https://this.athena.ibm.com:443","msp_id":"org1"}],

	// [required if "distribute" is not "none"]
	// use this field to aid authorization of your request with an OpTools.
	// this field alone is not enough. the "Authorization" header must also be built, instructions above.
	authorize: {

		// its the msp id for the identity that is creating the "Authorization" header
		// (just use the sam msp that is add a signature or submitting)
		msp_id: 'org1',

		// the cert for the identity that created the "Authorization" header in this request.
		// note that this cert must be signed by a ca root cert (or intermediate) that has been imported OR
		// registered to the UI.
		// use api #8 in this file to "register" external MSPs or use the "import" MSP (api #1) in ./components.md.
		// the "import" MSP api is preferred.
		certificate: "<base 64 pem>",

		// OpTools v2.5.x and up should set this to "v2". else omit the field or set "v1".
		// v1 works on older optools, v2 and v1 work on newer. plan is to phase out v1.
		hash_ver: "v2"
	}
```
- **Response**:
```js
{
 "message": "ok",
 "tx_id": "<transaction id here>",
 "details": "removed"
}
```

## 6. Delete signature
I don't think this api is needed. Fabric ignores signatures it doesn't need, right?

## 7. Re-send aka replay aka redistribute signature collection txs
The create and edit apis ([API #3](#3) and [API #4](#4)) will normally handle distribution according to the `distribute` setting in the body.
They can even handle redistribution by creating another auth signature.
However if a *previous* tx needs to be "re-sent", use this api (#7).
A tx may need to be "re-sent" b/c an OpTools was down during the original distribution.

This api will replay (resend) all **failed** distribution attempts in the **past**.
This api was created this way b/c of our slightly complicated auth scheme for signature collection across multiple external athenas.
Each create/edit signature collection api has a signature around the body.
We cannot generate a custom redistribution request without also generating another (valid) signature and we cannot change the body of a previous call w/o invalidating the signature.
But we can replay a previous transaction exactly as it is/was.
Thats what this api will do.

This route dos not require a new signature, so its easier to consume than #3 & #4.
The incoming api will be authenticated via IAM, but the outgoing apis will use the authorization header from a past tx.

dsh note to self:
- since the contents of the tx are signed client side, the tx contents cannot be changed by athena during redistribute. thus during a redistribute op athena can send the **same** tx to additional optoolians.

- **Method**: PUT
- **Route**: `/api/v[123]/signature_collections/:tx_id/resend` || `/ak/api/v[123]/signature_collections/:tx_id/resend`
- **Auth**: Must have action `blockchain.signaturecollection.manage`
- **Body**: `n/a`
- **Response**:
```js
// code 200 && code 207
{
	"tx_id": "<transaction id here>",
	"resend_errors": [],	// array of response objects from resend errors. empty for a 200

	/* the rest of the config tx doc */
}

// code 205 - happens if 0 re-sends were needed
{
	"tx_id": "<transaction id here>",
	"message": "there is nothing to resend. 0 tx errors."
}

// code 502 - happens if all re-sends are failures
{
	"tx_id": "<transaction id here>",
	"resend_errors": [{}],	// array of response objects from resend errors. full of errors

	/* the rest of the config tx doc */
}
```

<a name="8"></a>

## 8. Register external OpTools/MSP IDs
The UI should use this api to import external party OpTools(s)/MSPs.
This is needed to verify the signature on this MSP's future signature collection requests.
- **Method**: POST
- **Route**: `/api/v[123]/parties` || `/ak/api/v[123]/parties`
- **Auth**: Must have action `blockchain.signaturecollection.manage`
- **Body**:
```js
{
	// [required] array of external parties
	parties: [
		{
			// [required]
			msp_id: "org1",

			// [required] athena url of said org, include protocol, port, & hostname
			optools_url: "http://some.athena.ibm.com:443",

			// [optional] certificate for this msp id
			certificate: "<base 64 encoded PEM>",

			// [optional]
			// max time to wait (in ms) for this org's athena to respond to distribute.
			// defaults 10 seconds
			timeout_ms: 10000
		}
	]
}
```
- **Response**:
```js
{
	"message": "ok",
	"details": [
		"added cert in position: 0 for msp id: org2"
	]
}
```
- **Details**:
	- create/update a single external msp doc in the `DB_COMPONENTS` database
		- if the `certificate` && `msp_id` already exist, replace the details completely

<a name="9"></a>

## 9. List known OpTools & MSP ID certs
Use this api to retrieve all known MSP IDs & OpTool URLs that can be used for signature collection.
- **Method**: GET
- **Route**: `/api/v[123]/parties` || `/ak/api/v[123]/parties`
- **Auth**: Must have action `blockchain.optools.view`
- **Body**: `n/a`
- **Response**:
```js
{
	parties: [ // array of known external parties + local msps
		{
			// org's msp id
			msp_id: "org1",

			// OpTools url of said org, includes protocol, port, & hostname
			optools_url: "http://some.athena.ibm.com:443",

			// a ca root cert for this msp id
			certificate: "<base 64 encoded PEM>",

			// [optional] provided if set
			// max time to wait (in ms) for this org's athena to respond to distribute
			timeout_ms: 10000

			// [optional] provided if set
			// unix timestamp in ms the msp was imported/registered
			timestamp: 1556928271390

			// [optional] provided if set
			type: "msp"  // "msp" are local msps you manage, "msp-external" are msps from orgs you don't manage

			// [optional] provided if set
			display_name: "My Msp"  // your display name for the msp
		}
	]
}
```

## 10. Remove external OpTools
The UI should use this api to bulk remove external OpTools/MSP IDs.
Since there can be multiple certificates for the same MSP ID the body requires exact cert.
- **Method**: DELETE
- **Route**: `/api/v[123]/signature_collections/msp_ids` || `/ak/api/v[123]/signature_collections/msp_ids`
- **Auth**: Must have action `blockchain.signaturecollection.manage`
- **Body**:
```js
{
	// [required] array of external orgs
	parties: [
		{
			// [required]
			msp_id: "org1",

			// [required] cert for this msp
			certificate: "<base 64 encoded PEM>",
		}
	]
}
```
- **Response**:
```js
{
	"message": "ok",
	"details": [  // this array may be empty if the cert to remove was not found
		"removed msp_id \"org2\" from \"sampleConsortium\""
	]
}
```
- **Details**:
	- delete the entry in the external msp doc in the `DB_COMPONENTS` database

## 11. Get MSP's certificate
External OpTools should use this api to get a public key/certificate for a given MSP ID.
Since there can be multiple per MSP, the response is an array.
- **Method**: GET
- **Route**: `/api/v[123]/components/msps/:msp_id` || `/ak/api/v[123]/components/msps/:msp_id`
- **Auth**: no auth, this is public
- **Body**: `n/a`
- **Response**:
```js
{
	msps: [{
		// org's msp id
		msp_id: "org1",

		// [optional] whatever the client named this msp
		name: "msp1",

		// cert for this msp
		root_certs: ["<base 64 encoded PEM>"],

		// admins certs for this msp
		admins: ["<base 64 encoded PEM>"],  // <-- this is what you want

		// tls certs for this msp
		tls_root_certs: ["<base 64 encoded PEM>"],
	]}
}
```

## 12. Close/Open a signature collection tx
This task can be accomplished with api "Init signature collection" with a modified body.
Set an empty `orgs2sign` array, `distribute` set to `"none"` and `status` set to either `"closed"` or `"open"`.

If you want the `closed` state to propagate to external OpTools, use the `/v1/` version of api #4, build the auth header, and set `distribute` to `all`.

## 13. Edit visibility of a signature collection tx
Archive a signature collection tx, aka dismiss a signature collection tx.

This will mark a sig collection txs as `"archive"` or `"inbox"`.
This api will NOT communicate to external OpTools.
Thus it is only for the local OpTools' management.

This does **not** close a tx (see api #12 for that).
It's a cosmetic attribute to filter/divide txs that the design team wanted.
- **Method**: PUT
- **Route**: `/api/v[123]/signature_collections/bulk/visibility` || `/ak/api/v[123]/signature_collections/bulk/visibility`
- **Auth**: Must have action `blockchain.signaturecollection.manage`
- **Body**:
```js
	{
		// possible values "archive" or "inbox"
		"visibility": "archive",

		// array of tx ids to edit
		"tx_ids" : [
			"txId_1",
			"txId_2"
		]
	}
```
- **Response**:
```js
{
	"message": "ok",
	"edited": 2   // number of docs that were edited
}
```

<a name="14"></a>

## 14. Check route availability
Use this api to see if the `/v1/` or `/v2/` routes for create/edit/delete signature collection tx apis are available.
Currently all routes support v1 & v2, but older optools will not return json, since this api dne.

- **Method**: OPTIONS
- **Route**: `<same routes seen in api #3, #4, & #5>` (the version used in this route doesn't matter)
- **Auth**: Public
- **Body**: -
- **Response**:
```js
{
	"methods": {
		"get": {
			"routes": ["v2", "v1"]  // v1 and v2 will work
		},
		"post": {
			"routes": ["v2", ] // only v2 is accepted (example, in reality v1 & v2 work)
		},
		"put": {
			"routes": ["v1"] // only v1 is accepted (example, in reality v1 & v2 work)
		},
		"delete": {
			"routes": ["v2", "v1"]  // v1 and v2 will work
		}
	}
}
```

***

## Other Thoughts
- its important to register the external athena's first in its own step. do not accept this data via the signature collection distribution api. if we don't do this in its own step and combine the public key/athena registration with the signature collection distribution apis, then anyone can send us junk sig collection data. their signature would be valid, but its from an untrusted party. thus its important to import the external party athena via a user who has the right action/permission on athena.
