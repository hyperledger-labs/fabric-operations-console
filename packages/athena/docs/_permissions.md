# Permissions & User Login

## How do I manage users, api keys and their permissions to the console?
OK, so the console supports multiple auth schemes to allow integration into whatever specific services are available.
They are all modeled to the same spec.
Meaning they work similarly when it comes to user login and enforcing user roles/permissions.
All of the auth schemes are modeled off the IAM SaaS auth scheme that was provided to all IBM Cloud Saas service instances.

Choosing an auth scheme is dependent on the environment where the console is running and what other external services are available.
It's recommend to use either the generic OAuth scheme, or the local username (couchdb) scheme.

Once an auth scheme is setup it will be used to assign each users (or api key) 1 of 3 roles:
`MANAGER`, `WRITER`, or `READER`.
Each role has a set of [actions](#user-actions) it can perform.
If an api key/user attempts to do an action and it does not have the corresponding role, it will be denied with a `403` status code.


### 1. CouchDB (local usernames)
- **Notes** - this will use the CouchDB instance that the console normally uses for internal data. the usernames (and api keys) will be stored in the settings doc. *passwords are uniquely salted and hashed.*
- **Login** - the list of users that can login is stored in the settings doc in the console database. Adding or removing users can be accomplished on the console UI by using the `Access` tab.
- **Roles** - roles can be assigned to users via the console UI using the `Access` tab.
- **API keys** - keys can be created via the console UI using the `Access` tab.
- **How to enable** - enable this setting by using the gear icon on the `Access` tab. alternatively the setting `auth_scheme` should be set to `couchdb`.
- **Pre-reqs** - n/a.

### 2. Generic Oauth
- **Notes** - this will use a generic oauth 2 login.
- **Login** - the list of users that can login is determined by the external oauth server. Adding or removing users can be accomplished externally.
- **Roles** - roles can be assigned to users via the console UI using the `Access` tab.
- **API keys** - keys can be created via the console UI using the `Access` tab.
- **How to enable** - enable this setting by using the gear icon on the `Access` tab. alternatively the setting `auth_scheme` should be set to `oauth`. the setting field `oauth` is also required. see the [oauth readme](./_oauth.md) for details.
- **Pre-reqs** - An external OAuth 2.0 server that the console server can reach.

### 3. IAM - IBM Cloud SaaS (discontinued)
- **Notes** - this auth scheme is discontinued. used in all IBP SaaS v2 service instances. setup details cannot be changed or customized.
- **Login** - the list of users that can login is determined by the IBM IAM system. This means the users that have permissions to the specific IBP service instance (aka resource) will be able to login. This access can be assigned at a user group level or individual user level.
- **Roles** - roles in SaaS are assigned via the IBM IAM system. This is typically done in the IAM UI found on IBM Cloud.
- **API keys** - API keys can be created via the IBM Cloud IAM system.
- **How to enable** - the setting `auth_scheme` should be set to `iam`. the setting fields `ibmid` && `iam_api_key` are also required. see the [settings readme](../env/README.md#auth-schemes-explained) for details.
- **Pre-reqs** - IBM Cloud's IAM service.

### 4. OIDC (discontinued)
- **Notes** - this auth scheme is discontinued. this system is identical to IBM Cloud's IAM, its just a private IAM. setup details can be changed.
- **Login** - the list of users that can login is determined by the IBM Bedrock IAM system. This means the users that have permissions to the specific IBP service instance (aka resource) will be able to login. This access can be assigned at a user group level or individual user level.
- **Roles** - roles are assigned via the Bedrock IAM system. This is typically done in the IAM UI found.
- **API keys** - API keys can be created via the Bedrock IAM system.
- **How to enable** - the setting `auth_scheme` should be set to `oidc`. the setting fields `oidc` && `iam_api_key` are also required. see the [settings readme](../env/README.md#auth-schemes-explained) for details and examples.
- **Pre-reqs** - Bedrock's IAM service.

### 5. LDAP (discontinued)
- **Notes** - this auth scheme is discontinued. this scheme will talk directly to an external LDAP server.
- **Login** - the list of users that can login is determined by an external LDAP server. Any user that can authenticate with the ldap server will be able to login to the console. Adding or removing users must be done on the LDAP server via some other utility.
- **Roles** - roles can be assigned to ldap users via ldap group or user attribute mappings.
	- *roles via groups* - the setting `ldap_group_map` can control roles on your ldap users. any user found to be in a specified group will receive the corresponding role. see the [settings readme](../env/README.md#auth-schemes-explained) for details.
	- *roles via user attributes* - the setting `ldap_attribute_map` can control roles on your ldap users. any user found with a matching attribute will receive the corresponding role. see the [settings readme](../env/README.md#auth-schemes-explained) for details.
	- *default roles* - if the fields `ldap_attribute_map` and `ldap_group_map` are empty or null, then any user that can login will default to the `MANAGER` role.
- **API keys** - not available.
- **How to enable** - the setting `auth_scheme` should be set to `ldap`. the setting field `ldap` is also required. see the [settings readme](../env/README.md#auth-schemes-explained) for details.
- **Pre-reqs** - An external LDAP server that the console server can reach.

### 6. AppID (discontinued)
- **Notes** - this auth scheme is discontinued.
- **Login** - the list of users that can login is determined by a app id service instance.
- **Roles** - not available.
- **API keys** - not available.
- **How to enable** - the setting `auth_scheme` should be set to `appid`.
- **Pre-reqs** - IBM Cloud's App ID service instance.

## User Actions:
Below you will find a description for each user/api-key "action".
Users (and api keys) will be assigned roles, and roles will contain these actions.
Users without the needed action, will not be allowed to perform that function.
  - `blockchain.components.create`
    - can **deploy** components (creates a peer/orderer/ca kubernetes deployment)
    - can change component resources
  - `blockchain.components.delete`
    - can remove **deployed** components
  - `blockchain.components.remove`
    - can remove **imported** component
  - `blockchain.components.import`
    - can **import** components (adds a database entry about a peer/orderer/ca)
  - `blockchain.components.export`
    - can export (download) component meta data (JSON)
  - `blockchain.optools.restart`
    - can restart the console
    - can call flush cache api
  - `blockchain.optools.logs`
    - can change logging settings of the console
    - can view http metrics
  - `blockchain.optools.view`
    - can view the UI, can also use any GET api, view the console logs
  - `blockchain.optools.settings`
    - can edit the console' setting doc via api
    - can view npm files like package.json from browser/api
    - can backup and restore console databases
	- can add a new input validator file (swagger)
  - `blockchain.notifications.manage`
    - can add/remove console notifications
  - `blockchain.users.manage`
    - can add/remove users to the console
	- can change user permissions (roles)
  - `blockchain.api_keys.manage`
    - can add/remove api keys to the console
  - `blockchain.signaturecollection.manage`
    - can delete and redistribute signature collections
    - can import external msps certs & athena urls
    - note: creating and editing a signature collection is "open" to all. though all present signatures must be valid and at least 1 signature must be present to be accepted.
  - `blockchain.components.manage`
    - can enroll/reenroll/register/delete enroll ids
    - can edit admin certs on peer/orderer (file system)
    - can view ca root enroll id/secret in deployer proxy route on a get-ca-details api
    - can run the component /actions api (such as restart, re-enroll, enroll
    - can create/delete config-block docs
    - can migrate a console to another cluster
    - can install chaincode
    - can create channels
  - `blockchain.instance.link` - a hyperion action (deprecated)
    - can create a resource, associating it with a cluster
  - `blockchain.instance.view` - a hyperion action (deprecated)
    - can check whether the console is running
  - `blockchain.optools.redeploy` - a hyperion action (deprecated)
    - can refresh the console deployment for a given resource

## Roles
	- Manager
	- Writer
	- Reader

### Actions for Manager
The console roles use a hierarchy. Therefore the `MANAGER` role includes all actions found in `WRITER` and `READER` roles.
- `blockchain.components.create`
- `blockchain.components.delete`
- `blockchain.components.remove`
- `blockchain.components.import`
- `blockchain.components.export`
- `blockchain.optools.restart`
- `blockchain.optools.logs`
- `blockchain.optools.view`
- `blockchain.optools.settings`
- `blockchain.notifications.manage`
- `blockchain.users.manage`
- `blockchain.api_keys.manage`
- `blockchain.signaturecollection.manage`
- `blockchain.components.manage`

### Actions for Writer
The console roles use a hierarchy. Therefore the `WRITER` role includes all actions found in `READER` role.
- `blockchain.components.remove`
- `blockchain.components.import`
- `blockchain.components.export`
- `blockchain.optools.view`
- `blockchain.notifications.manage`
- `blockchain.signaturecollection.manage`
- `blockchain.components.manage`

### Actions for Reader
- `blockchain.components.export`
- `blockchain.optools.view`
