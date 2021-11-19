# APIs

## Fabric Transactions

The Fabric Console does not offer APIs that would cover "Fabric transactions".
Operations like creating channels, and chaincode/smart contracts should be done directly with Fabric Peer APIs via the [Fabric SDKs](https://hyperledger.github.io/fabric-sdk-node).

The Fabric Console does not try to duplicate APIs offered by core Fabric.

## Fabric Component Operations

The Fabric Console does offer REST APIs to monitor Fabric components.
It also has APIs to monitor Fabric Console activity.

### APIs offered
- Import a peer/ca/orderer
- Get imported peer/ca/orderer data
- Remove imported peer/ca/orderer
- Get all imported components
- Get console settings
- Get console notifications (activity events, such as user login)
- Get signature collection details
- Create/Get/Delete console API keys
- Add/Get/Delete/Edit console users

### Viewing API Details
The best way to view all API information is to take our [swagger file](../packages/athena/json_docs/json_validation/ibp_openapi_v3.yaml) and copy/paste it into a [online swagger editor](https://editor.swagger.io).
The editor will provide a UI to view the rather large YAML file.
Once the file is loaded make sure to click the `Schema` text under each API request body to view the descriptions of each field.

- The swagger file is a [OpenAPI V3 spec](https://swagger.io/specification/) file.
Any OpenAPI/Swagger UI tool will allow you to view it.

### Automation Help

If you want to automate APIs on a brand new console build you will need to create an API key using the initial user.

- The `initial_admin` and `default_user_password_initial` settings should have been set in the [configuration file](../env/README.md#config) prior to starting the console. When the console starts for the first time it will create a user where the username is the value of the `initial_admin` setting and a password using the value of the `default_user_password_initial` setting. This user will be created with all roles (`manager`, `writer`, `reader`).
- All you have to do is create the key using the create-an-api-key API
	- Details:
		- **Method**: POST
		- **Route**: `/ak/api/v3/permissions/keys`
		- **Auth**: Set basic auth for `initial_admin` and `default_user_password_initial`
		- **Body**:
		```js
		{
			// [required] only these strings are allowed, at least 1 is required
			// set the roles you want for this key
			"roles": ["reader", "writer", "manager"],

			// [optional]
			"description": "spider man's key"
		}
		```
		- **Response**:
		```js
		{
			"api_key": "khnJmwqc3_xbnPp8",

			// [warning] the api_secret will be unrecoverable, save it
			"api_secret": "Y1oNEz37ZMpNlByHVN4OB5ly6VwzL43C",

			"roles": ["reader", "writer", "manager"],

			"message": "ok"
		}
		```
	- Store the response of this api in a safe place, the api secret is unrecoverable
	- Note that this is the only API that works with the default password. Other apis will not work until the user's password is changed.
- Once you have an `api_key` and `api_secret` you can authenticate to any `/ak/api/` route using basic auth where the username is the `api_key` and the password is `api_secret`. Congratulations 🎈. For those that do not want basic auth, a [similar API can be used to generate a bearer token](../packages/athena/docs/permission_apis.md#1b-create-a-access-token-aka-bearer-token). The bearer token route is more secure since they will expire.
