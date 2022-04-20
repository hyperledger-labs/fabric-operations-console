# Permissions & User Login

## How do I manage users, api keys and their permissions on IBP?
OK, so IBP supports multiple auth schemes to allow integration into whatever specific services are available.
They are all modeled to the same spec.
Meaning they work similarly when it comes to user login and enforcing user roles/permissions.
All of the auth schemes are modeled off the IAM SaaS auth scheme that we provide to all IBM Cloud IBP service instances.

Choosing an auth scheme is dependent on the environment where IBP is running and what other external services are available.
It's recommend to read the auth scheme blurbs 1-7 (below) before selecting one.

Once an auth scheme is setup it will be used to assign each users (or api key) 1 of 3 roles:
`MANAGER`, `WRITER`, or `READER`.
Each role has a set of [actions](#ibp-actions) it can perform.
If an api key/user attempts to do an action and it does not have the corresponding role, it will be denied with a 403 status code.
Assigning roles to users is done differently depending on what auth scheme is in place (see the blurb on the desired auth scheme below for these details).

### 1. IAM (IBM Cloud SaaS)
- **Notes** - used in all IBP v2 service instances. setup details cannot be changed or customized.
- **Login** - the list of users that can login is determined by the IBM IAM system. This means the users that have permissions to the specific IBP service instance (aka resource) will be able to login. This access can be assigned at a user group level or individual user level.
- **Roles** - roles in SaaS are assigned via the IBM IAM system. This is typically done in the IAM UI found on IBM Cloud.
- **API keys** - API keys can be created via the IBM Cloud IAM system.
- **How to enable** - the setting `auth_scheme` should be set to `iam`. the setting fields `ibmid` && `iam_api_key` are also required. see the [settings readme](../env/README.md#auth-schemes-explained) for details.
- **Pre-reqs** - IBM Cloud's IAM service.

### 2. OIDC (Bedrock IAM)
- **Notes** - this system is identical to IBM Cloud's IAM, its just a private IAM. setup details can be changed.
- **Login** - the list of users that can login is determined by the IBM Bedrock IAM system. This means the users that have permissions to the specific IBP service instance (aka resource) will be able to login. This access can be assigned at a user group level or individual user level.
- **Roles** - roles are assigned via the Bedrock IAM system. This is typically done in the IAM UI found.
- **API keys** - API keys can be created via the Bedrock IAM system.
- **How to enable** - the setting `auth_scheme` should be set to `oidc`. the setting fields `oidc` && `iam_api_key` are also required. see the [settings readme](../env/README.md#auth-schemes-explained) for details and examples.
- **Pre-reqs** - Bedrock's IAM service.

### 3. LDAP
- **Notes** - this scheme will talk directly to an external LDAP server.
- **Login** - the list of users that can login is determined by an external LDAP server. Any user that can authenticate with the ldap server will be able to login to the IBP console. Adding or removing users must be done on the LDAP server via some other utility.
- **Roles** - roles can be assigned to ldap users via ldap group or user attribute mappings.
	- *roles via groups* - the setting `ldap_group_map` can control roles on your ldap users. any user found to be in a specified group will receive the corresponding role. see the [settings readme](../env/README.md#auth-schemes-explained) for details.
	- *roles via user attributes* - the setting `ldap_attribute_map` can control roles on your ldap users. any user found with a matching attribute will receive the corresponding role. see the [settings readme](../env/README.md#auth-schemes-explained) for details.
	- *default roles* - if the fields `ldap_attribute_map` and `ldap_group_map` are empty or null, then any user that can login will default to the `MANAGER` role.
- **API keys** - not available. dsh todo maybe we can create keys with IBP console itself, like we do with couchdb?
- **How to enable** - the setting `auth_scheme` should be set to `ldap`. the setting field `ldap` is also required. see the [settings readme](../env/README.md#auth-schemes-explained) for details.
- **Pre-reqs** - An external LDAP server that the IBP console server can reach.

### 4. Generic Oauth
- **Notes** - this will use a generic oauth 2 login.
- **Login** - the list of users that can login is determined by the external oauth server. Adding or removing users can be accomplished externally.
- **Roles** - roles cannot be assigned. thus any user that can login will receive the `MANAGER` role.
- **API keys** - not available.
- **How to enable** - the setting `auth_scheme` should be set to `oauth`. the setting field `oauth` is also required. see the [settings readme](../env/README.md#auth-schemes-explained) for details.
- **Pre-reqs** - An external OAuth 2.0 server that the IBP console server can reach.

### 5. CouchDB (local)
- **Notes** - this will use the CouchDB instance that OpTools normally uses for internal data. the users (and api keys) will be stored in the settings doc. *passwords are salted and hashed.*
- **Login** - the list of users that can login is determined by the settings doc. Adding or removing users can be accomplished on the IBP console UI.
- **Roles** - roles can be assigned to users via the IBP console UI.
- **API keys** - api keys can be created via the IBP console APIs [see permission_apis.md](./permission_apis.md#1-create-an-api-key).
- **How to enable** - the setting `auth_scheme` should be set to `couchdb`.
- **Pre-reqs** - n/a.

### 6. AppID (discontinued)
- **Notes** - this auth scheme is discontinued.
- **Login** - the list of users that can login is determined by a app id service instance.
- **Roles** - not available.
- **API keys** - not available.
- **How to enable** - the setting `auth_scheme` should be set to `appid`.
- **Pre-reqs** - App ID service instance.

### 7. IBM ID [legacy IBM IAM] (discontinued)
- **Notes** - this auth scheme is discontinued. this auth scheme was only used for IBP SaaS Dev. this is the legacy IBM ID/IAM system.
- **Login** - the list of users that can login is determined by the IBM ID system. This means the users that have permissions to the specific IBP service instance (aka resource) will be able to login.
- **Roles** - all users that have access to the IBP service instance (resource) will received the role `MANAGER`.
- **API keys** -  not available.
- **How to enable** - the setting `auth_scheme` should be set to `ibmid`. the setting fields `ibmid` && `iam_api_key` are also required. see the [settings readme](../env/README.md#auth-schemes-explained) for details.
- **Pre-reqs** - The legacy IBM ID SSO service.

## IBP Actions:
All actions are defined below:
  - `blockchain.components.create` - **(n/a for standalone!)**
    - can add **saas** components (including template apis)
  - `blockchain.components.delete` - **(n/a for standalone!)**
    - can remove **saas** components
  - `blockchain.components.remove`
    - can remove **non saas** component
  - `blockchain.components.import`
    -  can import **any** component (including peers, cas, orderers, msps)
  - `blockchain.components.export`
    -  can export **any** component
  - `blockchain.optools.restart`
    - can restart optools
    - can call flush cache api
  - `blockchain.optools.logs`
    - can change logging settings of optools
    - can view http metrics
  - `blockchain.optools.view`
    - can view the UI, can also use any GET api, view optools logs
  - `blockchain.optools.settings`
    - can edit optools' setting doc via api
    - can view npm files like package.json
    - can backup and restore databases
	- can add a new validator file (swagger)
  - `blockchain.notifications.manage`
    - can add/remove notifications
  - `blockchain.users.manage`
    - can add/remove users to optools **(n/a for SaaS!)**
  - `blockchain.api_keys.manage`
    - can add/remove api keys to optools **(n/a for SaaS!)**
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
  - `blockchain.instance.link` - hyperion action
    - can create a resource, associating it with a cluster
  - `blockchain.instance.view` - hyperion action
    - can check whether optools is running
  - `blockchain.optools.redeploy` - hyperion action
    - can refresh the optools deployment for a given resource

### Actions for Manager
IBP console roles use a hierarchy. Therefore the `MANAGER` role includes all actions found in `WRITER` and `READER` roles.
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
IBP console roles use a hierarchy. Therefore the `WRITER` role includes all actions found in `READER` role.
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
