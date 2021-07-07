# v1 to v2

There are many breaking changes from `/api/v1/` apis to `/api/v2/` apis.
The `/api/v1/` routes are still around, but will be removed once/if `v3` is created.
However there are no plans to make `v3` atm.

- Our [external api-docs](https://cloud.ibm.com/apidocs/blockchain) are updated showing the `/v2/` parameters
- Our [internal readme docs](./) are also updated.

**All known changes are below. Changes in bold are breaking changes that I think are common errors.**

### v2 Changes:

- **The main change is input validation. All v2 apis have swagger based input validation (body & query):**
	- type validation
	- min, max on numbers
	- min, max on string lengths
	- certs are inspected for base 64 encoded PEM formats
	- cpu, memory, storage unit validation and min/max value validation
	- illegal keys (keys that should not be set by the user)
	- illegal edit keys (keys that should not be edited by a user)
	- illegal values (values that are unacceptable for a field)
	- no extra fields (this means some requests with unknown body fields will be rejected)
	- check the [swagger doc](https://github.ibm.com/cloud-api-docs/ibp/blob/master/ibp.yaml) for specifics on what is valid for each input field...
- changed the input validation error format:
	- was `{"statusCode": 400, msg: "error"}`
	- now `{"statusCode": 400, msgs: ["error"]}`
	- these routes are affected:
		- import-a-component `POST /api/v2/components`
		- edit-a-component `PUT /api/v2/components/:id`
		- create-a-k8s-component `POST /api/saas/v2/components`
		- edit-a-k8s-component `PUT /api/saas/v2/components/:id`
- **the Get-all-components api response changed:**
	- was an array of docs: `[ {json_doc_here} ]`
	- now its an object with an array of docs: `{"components": [ {json_doc_here} ] }`
- **the short-hand typed routes when creating and editing a component are gone. only the long form remains:**
	- removed '/ak/api/v2/components/**ca**', use '/ak/api/v[12]/components/**fabric-ca**'
	- removed '/ak/api/v2/components/**orderer**', use '/ak/api/v[12]/components/**fabric-orderer**'
	- removed '/ak/api/v2/components/**peer**', use '/ak/api/v[12]/components/**fabric-peer**'
	- note however this route `'/ak/api/v2/components'` remains
- the edit-components api response changed.
	- was: the edited component doc, plus the field `"message": "ok"`.
	- now: the edited component doc.
- the delete-a-component api response changed:
	- was: `{"message": "ok", "id": "abc" }`
	- now: `{"message": "deleted", "id": "abc", "display_name": "a b c", "type": "fabric-peer" }`
- the get-all-settings api responses changed:
	- the `CONFIGTXLATOR_URL_ORIGINAL` field was removed
- appended field to error response if component doc had been deleted (to mimic input error format):
	- was `{"statusCode": 404, "reason": "deleted"}`
	- now `{"statusCode": 404, "msg": "no components by this id exist", "reason": "deleted"}`
- changed response if the get-all-components, get-components-by-tag, get-components-by-type, apis have 0 components:
	- was `[]`
	- now a `{"components": [], "msg": "no components exist", "reason": "missing"}`
	- now b `{"components": [], "msg": "no components by tag exist", "reason": "missing"}`
	- now c `{"components": [], "msg": "no components by type exist", "reason": "missing"}`
- the get-a-kubernetes-component api is removed
	- instead use the get-a-component api with query parameter deployment_attrs=included
- the get-a-component and get-all-components and get-components-by-tag APIs support new query parameters:
	- `?cache=skip` - can be set to `skip` if you do not want a cached response. default response will use the cache.
		- the legacy `?skip_cache=yes` - parameter still works.
	- `?deployment_attrs=included` - can be set to `included` if you want the response to include k8s deployment fields such as `resources, storage, zone, etc.`  default responses will not include these fields.
	- `?parsed_certs=included` - can be set to `included` if you want the response to include parsed certificate fields instead of the base 64 pem string.
		- the certs in the `admin_certs` field get parsed and the output is in the field `admin_certs_parsed`
		- the cert in the `tls_cert` field gets parsed and the output is in the field `tls_cert_parsed`
	- `?ca_attrs=included` - can be set to `included` if you want the response to include extra ca data, see [component_apis.md](./component_apis.md#get) or swagger.
- the bulk-delete-component response changed a little (this api is used to delete a whole raft cluster):
	- was: `{"statusCode": 200, "tag": "fabric-peer", "deleted_components": [{}] }`
	- now: `{"statusCode": 200, "deleted": [{}] }`
- the bulk-remove-component response changed a little:
	- was: `{"statusCode": 200, "tag": "fabric-peer", "deleted_components": [{}] }`
	- now: `{"statusCode": 200, "removed": [{}] }`
- the get-sig-collections api has new optional query parameters:
	- `?filter_orderers=["something"]` - set to an array of orderer hostnames if you only want sig collection transactions that involve certain orderers. the default response will show all transactions.
		- example: `filter_orderers=["n98af1c-ordererc.ibpv2-test-cluster.us-south.containers.appdomain.cloud:3010"]`
	- `?full_details` - set to `omitted` if you only want a summary of the tx and not the full sig collection doc. summary includes the channel name, tx_id, creation timestamp, status and list of orderers. default responses will include all the details.
	- `?group_by=channels` - set to `channels` if you want an alternative format where the transaction docs are bucketed by channel names (a dictionary of channel names is created). use this to get an easier to parse list of channels. default responses will not use this channel dictionary format.
	- `?status=all` - set to `all` or `closed` or `open` to get transactions of only this state. default responses will include all.
- **the input to the create-a-ca api changed. the enroll_id and enroll_secret field moved to be inside `config_override`**
	- was `{"enroll_id": "admin", "enroll_id": "password", <etc>}`
	- now `config_override.ca.registry.identities[0].name` (see [deployer_apis.md](./deployer_apis.md#immediate2) for full details)
- the delete-ibp-user api changed from passing the array of uuids in the body to a query parameter
- the edit-ibp-user-roles api renamed the `users` object to `uuids`. the contents of this object is unchanged, it always expected uuid keys.
- **the send-config-block api input changed**
	- was `{ "b64_genesis_block": "<base 64 encoded config block>" }`
	- now `{ "b64_block": "<base 64 encoded config block>"}`
- the send-config-block api response changed
	- was `{ "data": { <component data object> }, "tx_id": "12345"}`
	- now `{ <component data object> }`


***

## v2 Validation Usage
If you want to know how to use the new validator:

1. All v2 routes that are to be validated, must be documented in our [swagger/openapi spec yaml](../json_docs/json_validation/ibp_openapi_v3.yaml) file.
The validation lib ingests this file and loads all the `paths`. For simplicity, only the `/ak/` (api key) routes are documented in swagger. However, we will use the same validation on session based routes too (routes called via apollo). We can do this by explicitly telling the validator what swagger path to use (this will make more sense next).

2. When a request comes in the first thing a developer must do is set the field `_validate_path` to a route from the `paths` section of the swagger file on the incoming request object. Said another way, the `req._validate_path` must be set to a matching path in the openapi spec file. Then send the request and response object to the `validate` library's `request()` method, like:
```js
// this is my express route
app.put('/ak/api/v[23]/kubernetes/components/fabric-ca/:athena_component_id', middleware, (req, res) => {

	// this is my swagger route
	// this matches a swagger path in the file, its the entry we want to validate against
	// (notice the wildcard parameter syntax difference between openapi and express)
	req._validate_path = '/ak/api/v2/kubernetes/components/fabric-ca/{id}';

	// do the validation
	t.validate.request(req, res, null, () => {
		// if validation passes we end up in the callback

		// carry out the action
		t.deployer.update_component(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				res.status(200).json(ret.athena_fmt);
			}
		});
	});
});
```
3. The validation lib will handle the response if the input fails. If not it will call the callback (this is the same syntax as any express middleware).
4. If the lib detects some invalid input and the incoming request is NOT from apollo it will respond with this format:
	```js
	// v2 Input Error Format: (normal)
	{
		"msgs": [
			"Parameter '_id' is not editable via this api.",
			"Parameter 'type' is not editable via this api."
		],
		"statusCode": 400
	}
	```
5. If the lib detects some invalid input and the incoming request is from apollo it will respond with the same format above, but with an additional `raw` field. The intent of the `raw` field is to allow for translated errors. The field `key` in the response matches up with a string in the swagger file, under the field `x-validate_error_messages`.
	```js
	// v2 Input Error Format: (extended)
	{
		"msgs": [
			"Parameter '_id' is not editable via this api.",
			"Parameter 'type' is not editable via this api."
		],
		"raw": [
			{
				"key": "illegal_key_edit", // the name of the translation string to use for error #1
				"symbols": {
					"$PROPERTY_NAME": "_id" // the key/value pairs to substitute in the translated string
				}
			},
			{
				"key": "illegal_key_edit", // the name of the translation string to use for error #2
				"symbols": {
					"$PROPERTY_NAME": "type" // the key/value pairs to substitute in the translated string
				}
			}
		],
		"statusCode": 400
	}
	```

***

### Other Notes:
 - The detection to decide if the route "came from apollo" is done by looking for `/ak/` in the beginning of the route.
 - The validator returns all errors in the input at once
	- Except the validator does not drill **deeper** into an object key if that key already had an error... (not an important detail, don't worry about it)
 - If the validator only finds 1 error, it still returns an array of 1.
