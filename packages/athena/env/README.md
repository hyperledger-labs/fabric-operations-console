# Configuration Options
There are 4 places where athena will pick up settings. In order of hierarchy:
1. [Environment Variable File](#env) - JSON file that will load all keys as env variables on startup. Not required if env variables are already set.
1. Environment Variables - Existing env variables will override the config file & default settings file.
1. [Configuration File](#config) - YAML/JSON file will overwrite default settings. Not required if default settings are fine.
1. [Default Settings File](#default) - Internal JSON file for default values. Users should not modify this file. Changes to defaults can be accomplished with the configuration file.


<a name="env"></a>

# Environment Variable File
When deploying athena an environmental JSON file should live in this folder `./en/dev.json`.
*If these env variables are already set by some other means then this file can be omitted.*
This file has the minimum settings to reach couch db.
Once athena reaches couch db it will load the rest of the settings via the default settings doc `00_settings_athena` doc or the config yaml.

**The file dne**, it must be created if the required fields are not already set.

**Every variable in this JSON will become an environmental variable during startup.**
- The file name to use can be changed with env variable `DEFAULT_ENV` (defaults `dev.json`).

***

Note to devs: Only add fields to this file for one of these reasons:
- it is needed to connect to couch and get the rest of the settings
- it should not be in the db. ie to hide sensitive passwords.

__Example:__
```js
{
// ****** Required Fields ******

// Url to use to connect to couch db. Include the protocol, port, and basic auth.
"DB_CONNECTION_STRING": "https://username:password@localhost:5984", // required

// The name of the database that contains the settings doc
"DB_SYSTEM": "athena_system",     // required unless "db_custom_names" is used in config file


// ****** Optional Fields ******

// Path and file name to load configuration settings during first startup
// Relative paths are relative from the root athena folder
"CONFIGURE_FILE": "./json_docs/example_configure.yaml",

// Internal port this node js process should bind to.
// note the environmental variable "PORT" will do the same thing and override this one
"APP_PORT": 3000,

// see "host_url" in the next section (below) for description
"HOST_URL": "http://localhost:3000",

// see "region" in the next section (below) for description
"REGION": "local",

// The external URL to a Fabric Configtxlator. Including the protocol and port.
// If you don't have one you can use a dummy url to get athena started.
"CONFIGTXLATOR_URL_ORIGINAL": "http://example.com:123",

// see "auth_scheme" in the next section (below) for description
// examples: 'iam', 'odic', 'ldap', 'oauth', 'ibmid'
"AUTH_SCHEME": "iam",

// name of the log file to use for server logs
"SERVER_LOG_FILE_NAME": "server.log",

// name of the log file to use for client side logs
"CLIENT_LOG_FILE_NAME": "client.log",

// location of the log files relative to athena's root folder
"LOG_PATH": "./logs",

// Path to a tls private key to use for the web server
// - file should be in pem format
// - if env var dne or empty string, will use http web server
// - if env var exist but file dne will generate & write to fs a key
"KEY_FILE_PATH": "./tls.key",

// Path to a tls cert to use for the web server
// - file should be in pem format
// - if env var dne or empty string, will use http web server
// - if env var exist but file dne will generate & write to fs a tls cert
// - a fs watch is on this file. if it changes athena will restart to take the new tls settings
"PEM_FILE_PATH": "./tls.pem",

// Either:
// 1. IAM Auth - IAM configuration url [preferred]
//		ex: "https://iam.cloud.ibm.com/identity/.well-known/openid-configuration"
// 2. Old IBM ID Auth - The IBM ID SSO server url [legacy 03/2019]
//		ex: "https://mccp.ng.bluemix.net"
"IBM_ID_URL": "https://mccp.us-south.cf.test.cloud.ibm.com",

// The "Client ID" for the IBM ID SSO account.
"IBM_ID_CLIENT_ID": "something",

// The "Client Secret" for the IBM ID SSO account.
"IBM_ID_CLIENT_SECRET": "somethingElse",

// the iam api key for the ibp service
"IAM_API_KEY": "something.else",

// see "default_user_password_initial" in the next section (below) for description
"DEFAULT_USER_PASSWORD_INITIAL": "ohnoididnotchangethepassword",

// What should optools do if it crashes?
// valid option: "restart" or "die"
// defaults to "die"
// unlike the other fields, this setting **must** be set as an env variable and not in the env file
"OPTOOLS_CRASH_POLICY": "restart"

}
```


<a name="config"></a>

# Configuration File
This YAML/JSON file will **overwrite any variable** in the default settings doc.
On startup this file will be checked against the settings doc in the databases.
Any missing fields will be populated, and any fields with a different value will be replaced.

Note to devs: Add variables to this file when the end user will not be able to change it via the UI.
Because during restarts the value in these fields will replace any writes to the settings doc.

**The config file to use can be set with the env variable `CONFIGURE_FILE`.** If not set or empty, no file will be loaded.

*All fields in the config file and the file itself is optional.*

__Example File:__
```yaml
---
# this is an **example** config file. it does not showcase every field.
# see default_settings_doc for all possible settings.

# the username of the initial manager/writer/reader user to create
initial_admin: ibm@us.ibm.com

# IBM ID SSO information
# "ibmid.url" is either:
# 1. IAM Auth - IAM configuration url [preferred]
#		ex: "https://iam.cloud.ibm.com/identity/.well-known/openid-configuration"
# 2. Old IBM ID Auth - The IBM ID SSO server url [legacy 03/2019]
#		ex: "https://mccp.ng.bluemix.net"
# the env variable "IBM_ID_URL" will override this
# (omit field if auth_scheme is "appid" or "couchdb")
ibmid:
  url: https://iam.cloud.ibm.com:443/identity/.well-known/openid-configuration
  client_id: something
  client_secret: somethingElse

# service's api key for IAM authentication
iam_api_key: null

# what auth scheme to use.
# the env variable "AUTH_SCHEME" will override this
# see below for "Auth Schemes Explained"
auth_scheme: iam

# IBM Cloud Resource Names String - used for IAM authorizations
# (only used for IBM IBP SaaS or oidc)
crn_string: 'something:something:something:something...'

# default configtxlator to use
# the env variable "CONFIGTXLATOR_URL_ORIGINAL" will override this
configtxlator_url_original: http://example.com:80

# deployer url. including basic auth
deployer_url: http://test:this@localhost:3000

# use this field to use custom names for the databases
db_custom_names:
  DB_COMPONENTS: asdf_components
  DB_SESSIONS: asdf_sessions
  DB_SYSTEM: asdf_system # the env var "DB_SYSTEM" will override this

# if TLS cert checking should be enforced (for external domains)
enforce_backend_ssl: false

# see "environment" in the next section (below) for description
environment: prod

# see "host_url" in the next section (below) for description
host_url: http://localhost:3000

# see "region" in the next section (below) for description
region: local
```

An example file with dummy values can be found at `./env/example_config.yaml`.


<a name="default"></a>

# Default Settings File
The default file gets written to the SETTINGS database whenever it does not exist (during startup).
The db's doc also gets checked during each startup for any missing keys.
Missing keys will be populated from this file (if they are not overwritten by the config file)

This file can be found at `./json_docs/default_settings_doc.json`.

__default_settings_doc.json:__
```js
{
// doc name of the settings field. do not modify
"_id": "00_settings_athena",

// the access list is an object where email addresses are the keys
// NOTE: this field should be a blank object in the settings doc
// but I will document what a normal user entry looks like for documentation sake:
"access_list": {

  // email address of valid user
  "dshuffma@us.ibm.com": {

    // roles define what actions a user can do
    "roles": ["manager"],

    // book keeping unix timestamp, not very important
    "created": 1546528815377,

    // unique id. must be unique per user per athena. uuid will appear in logs
    "uuid": "0aa7f690-617c-432a-a281-bf2b115ed007"
  }
},

// path to the folder for IBM Activity Tracker event files
// if null activity tracker is disabled
// files will rotated by winston
// defaults null (disabled)
"activity_tracker_path": '/var/log/act_track'

// email address on the UI to surface to users for help
"admin_contact_email": "ibm@us.ibm.com",

// legacy! - ignore me
// app id settings go here, leave it as is if using ibm id
// (not used if auth_scheme is not "appid")
"app_id": {

  // data from your app id service instance:
  "client_id": "-",
  "oauth_url": "http://example.com",
  "secret": "-",
  "tenant_id": "-"
},

// the **internal** port to use for athena http and ws traffic
// the env variable "APP_PORT" or "PORT" will override this
"app_port": 3000,

// what auth scheme to use.
// the env variable "AUTH_SCHEME" will override this
// see below for "Auth Schemes Explained"
// changes to this field require a restart.
// examples: 'iam', 'odic', 'ldap', 'oauth', 'ibmid'
"auth_scheme": "initial",

// how much time in ms to contact the grpcwp. retrieves the backend address
// defaults 3000
"backend_address_timeout_ms": 3000,

// CA proxy route's timeout in ms
// defaults 10000
"ca_proxy_timeout": 10000,

// IBM Cloud Resource Names details
// (only used for IBM IBP SaaS or IBP on IBM bedrock/oidc)
"crn": {},
"crn_string": "long:string:with:colons",

// the external URL to a Fabric Configtxlator. Including the protocol and port.
// this is always the real url of the configtxlator, no athena proxy madness.
// the env variable "CONFIGTXLATOR_URL_ORIGINAL" will override this
"configtxlator_url_original": "http://varadvm2.rtp.raleigh.ibm.com:8083",

// calculated external URL to a Fabric Configtxlator Including the protocol and port.
// field is automatically set, do not attempt to override.
// [!] this field IS NOT intended to be edited by the env or config file [!]
// only including it here for doc purposes.
// notes to self:
// - this field will sometimes be a route based proxy to athena.
// - this is done to allow a http configtxlator to work with a https athena.
// - apollo will send an https call to athena, athena will proxy the call as http to configtxlator.
// - if NO invalid mixed mode, the call will be sent from browser to configtxlator, skipping athena.
"configtxlator_url": "http://varadvm2.rtp.raleigh.ibm.com:8083",

// the max time athena will wait on configtxlator proxy request
// not applicable if configtxlator calls are made from the browser
// defaults to 90 secs or -1 if not applicable
"configtxlator_timeout": 90000,

// fabric versioned configtxlator.  (not implemented! - todo 01/07/2019)
"configtxlators": {
  "1.1.0": "http://varadvm2.rtp.raleigh.ibm.com:8083",
  "1.2.0": "http://varadvm2.rtp.raleigh.ibm.com:8080"
},

// our browser session cookie name
// for IBM IBP SaaS - ibm cloud wants it named w/the format: "com.ibm.cloud.console.<YOUR_PLUGIN_ROOT>.<COOKIE_NAME>"
// for IBM IBP Software - set it to w/e unique name you want.
// changes to this field require a restart.
// defaults to "com.ibm.cloud.console.blockchain.optools"
"cookie_name": "com.ibm.cloud.console.blockchain.optools",

// bookkeeping info on the kubernetes cluster, it must be an object
"cluster_data":{

  // indicates if the IBP service instance is using a free or paid plan
  // either "free", "paid", or null
  "type": "free",

  // the available k8s zones that a component could use
  "zones": [
    "dal10"
  ],

  // *ANY* data can be set in this "cluster_data" object via the config yaml
  // note it will be publicly exposed on the /v1/api/settings api
  // (intent is to allow deployer team to pass info that I haven't thought of yet - dsh)
},

// set custom databases names if the defaults are not okay
"db_custom_names": {
  "DB_COMPONENTS": "athena_components",
  "DB_SESSIONS": "athena_sessions",
  "DB_SYSTEM": "athena_system"
},

// default database configuration - do not modify
// (use the "db_custom_names" field to control database names)
"db_defaults": {
	// the internal variable name. do not modify.
	"DB_COMPONENTS": {

		// book keeping description. not important.
		"description": "db for peers/cas/orderers/collections/msps docs",

		// what docs to check/load on startup
		"design_docs": [
			"../json_docs/components_design_doc.json"
		],

		// actual name of the database
		"name": "athena_components"
	},
	"DB_SESSIONS": {
		"description": "db for browser sessions",
		"design_docs": [],
		"name": "athena_sessions"
	},
	"DB_SYSTEM": {
		"description": "db to store internal settings and internal transactions",
		"design_docs": [
			"../json_docs/default_settings_doc.json",
					"../json_docs/system_design_doc.json"
		],
		"name": "athena_system"
	}
},

// the default password for initial user(s) and initial_admin/initial_admin
// only applies if AUTH_SCHEME is "couchdb"
// if null this password is useless and users w/o passwords cannot be logged in
// [!] this field IS NOT intended to be edited by the config file [!]
// change value via the ui or use "default_user_password_initial" to override.
// defaults: null
"default_user_password": null,

// this field contains the pre-baked value for the "default_user_password".
// [!] this field IS intended to be edited via env var or config file [!]
// this field allows users to edit the default field via ui AND to set
// it (initially) via env or config.
// it only works if "default_user_password" is null.
// the env variable "DEFAULT_USER_PASSWORD_INITIAL" will override this.
// defaults: ohnoididnotchangethepassword
// note to self:
// - w/o this field will overwrite default_user_password on restart, loosing UI set value
"default_user_password_initial": "ohnoididnotchangethepassword",

// maximum time to wait for a deployer request (ms).
// defaults 105 seconds
// (its little more than 1.5 minutes to be longer than deployer's internal timeout)
"deployer_timeout": 105000,

// deployer url. including basic auth
"deployer_url": "http://username:password@localhost:3000",

// if true athena will not ask couchdb to perform db compaction
// defaults false
"disabled_compaction": false,

// if true the tls cert file will be watched and if touched will restart the server
// changes to this field require a restart.
// defaults true
"dynamic_tls": true,

// if true the config yaml/json file file will be watched and if touched will restart the server
// changes to this field require a restart.
// defaults true
"dynamic_config": true,

// if TLS cert checking should be enforced (for external domains)
// changes to this field require a restart.
"enforce_backend_ssl": false,

// what type of host athena is running in
// if "prod" some apis/security settings will have stricter behavior
// example values: "prod", "staging", "dev"
// defaults: prod
"environment": "prod",

// the valid "fabric capability" values for channel config blocks
// obj will have three fields: `application`, `channel` and `orderer`
// each is an array of strings
// defaults with empty arrays
"fabric_capabilities": {
	"application": [
		"V1_1",
		"V1_2",
		"V1_3"
	],
	"channel": [
		"V1_3"
	],
	"orderer": [
		"V1_1"
	]
},

// amount of time for OpTools to wait on a Fabric get-block transaction (milliseconds)
// defaults 10 sec
"fabric_get_block_timeout_ms": 10000,

// amount of time for OpTools to wait on a Fabric instantiate-chaincode transaction (milliseconds)
// defaults 5 min
"fabric_instantiate_timeout_ms": 300000,

// amount of time for OpTools to wait on a Fabric join-channel transaction (milliseconds)
// defaults 25 sec
"fabric_join_channel_timeout_ms": 25000,

// amount of time for OpTools to wait on a Fabric install chaincode transaction (milliseconds)
// defaults 5 min
"fabric_install_cc_timeout_ms": 300000,		// fab 1.x lifecycle
"fabric_lc_install_cc_timeout_ms": 300000,	// fab 2.x lifecycle

// amount of time for OpTools to wait on a get chaincode tx (milliseconds)
// defaults 3 min
"fabric_lc_get_cc_timeout_ms": 180000		// fab 2.x lifecycle

// amount of time for OpTools to wait on any Fabric transaction not described above (milliseconds)
// defaults 10 sec
"fabric_general_timeout_ms": 10000,

// feature flags for the UI. do not modify unless you know the impact.
"feature_flags": {
  "capabilities_enabled": true,
  "create_channel_enabled": true,
  "enable_ou_identifier": true,
  "high_availability": true,
  "hsm_enabled": true,
  "lifecycle2_0_enabled": true,
  "patch_1_4to2_x_enabled": true,
  "remote_peer_config_enabled": true,
  "saas_enabled": true,
  "scale_raft_nodes_enabled": true,
  "templates_enabled": false
},

// file logging settings
"file_logging": {

  // client side logs
  "client": {

     // if false, no logs will be stored
    "enabled": false,

    // logging level for file logging
    // valid values 'error', 'warn', 'info', 'debug'
    "level": "info",

    // if logging files should have unique names (athena instance id gets appended)
    "unique_name": false
  },

  // server side logs
  "server": {

    // if false, no logs will be stored
    "enabled": true,

    // logging level for file logging
    // valid values 'error', 'warn', 'info', 'verbose', 'debug', 'silly'
    "level": "silly",

    // if logging files should have unique names (athena instance id gets appended)
    "unique_name": false
  }
},

// array of Content-Security-Policy header values
// wildcards (*) allowed. eg: ["*.ibm.com"]
// see https://content-security-policy.com
// see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors
// defaults ["default-src 'self'"]
"csp_header_values": ["default-src \'self\'"],

// maximum time to wait for a grpc wp proxy request (ms).
// (only works if the fabric proxy route is enabled, see "proxy_tls_fabric_reqs")
// defaults 5min
"grpcwpp_timeout": 300000,

// the **external** url + port to reach this application (backend).
// Including the protocol and port.
// if contains https:// a tls webserver will be created else http
// this is also used to form the redirect url during the IBM ID sso dance
// the env variable "HOST_URL" will override this
// this is also used when building self-signed certs.
// changes to this field require a restart.
"host_url": "http://localhost:3000",

// array of hostnames that athena can proxy http requests to
// regex supported
// defaults to any host, eg: [".*"]
// **note** this field overwrites itself as components are added, thus
// it is not intended to be manually customized
"host_white_list": [],

// HSM image settings (hardware security module).
// opaque field to athena. apollo consumes it.
// do not set any secrets here, it is exposed in the public settings api.
"hsm": null,

// max time in ms for athena to respond to a http request.
// !except! for the '/grpcwp/*' proxy route... the timeout to respond to this request is
// set by"grpcwpp_timeout".
// changes to this field require a restart.
// defaults to 2 minutes
"http_timeout": 120000,

// max time in ms for athena to respond to a node status request
// defaults to 1 second
"http_status_timeout": 1000,

// if basic http metrics should be recorded or not
// metrics are only stored in memory
// if enabled route to view metrics: '/api/v1/http_metrics'
// defaults true
"http_metrics_enabled": true,

// how much time to wait for http metrics to be shared across different athenas
// increase the wait for athenas with low CPU resources or athenas with many access logs
// defaults 2.5 seconds
"http_metrics_wait": 2500,

// the IBP service's api key for IAM authentication.
// the server uses this to generate access tokens for itself.
// (only used for IBM IBP SaaS or IBP on IBM bedrock/oidc)
// the env variable "IAM_API_KEY" will override this.
"iam_api_key": null,

// if a in-memory cache for iam calls should be used or not
// (only used for IBM IBP SaaS or IBP on IBM bedrock/oidc)
// defaults true
"iam_cache_enabled": true,

// ibm id auth settings go here, can be null or dne if using another scheme
// env variables "IBM_ID_CLIENT_ID", "IBM_ID_CLIENT_SECRET" will override these
// "ibmid.url" is either:
// 1. IAM Auth - IAM configuration url [preferred]
//		ex: "https://iam.cloud.ibm.com/identity/.well-known/openid-configuration"
// 2. Old IBM ID Auth - The IBM ID SSO server url [legacy 03/2019]
//		ex: "https://mccp.ng.bluemix.net"
// (not used if auth_scheme is not "ibmid" or "iam")
"ibmid": {
  "url": "https://example.com",
  "client_id": "username",
  "client_secret": "secret",
},

// normally the configuration yaml file will overwrite values in the the settings doc (in couch)
// change this in the SETTINGS DOC to true if you no longer want this behavior
// defaults false
"ignore_config_file": false,

// if users sits on the UI for too long without doing anything, you can have their browsers
// log them out automatically using these settings.  Set `enabled: true` to activate the feature.
// `max_idle_time` is how long the user can go without any activity before their browser
// kicks them out.
"inactivity_timeouts": {
    "enabled": false,
    "max_idle_time": 900000
},

// the username of the initial manager/writer/reader user to create
// no effect on IBM IBP SaaS
"initial_admin": "ibm@us.ibm.com",

// a 1 word description of the host that is running athena
// example values: "ibmcloud", "icp", "azure", etc
"infrastructure": "ibmcloud",

// ldap auth settings go here.
// can be null or dne if using another scheme.
"ldap": {

  // the ldap endpoint to use, include the port
  "url": "ldap://istillneedthisvm.rtp.raleigh.ibm.com:389",

  // a ldap user that can perform binding and search operations
  "bind_dn": "cn=admin,dc=rtp,dc=raleigh,dc=ibm,dc=com",
  "bind_credential": "password",

  // the starting level for uid searches.
  // used to build user profile data during login. always used.
  "search_base": "dc=rtp,dc=raleigh,dc=ibm,dc=com",

  // [optional]
  // the starting level for group searches.
  // used to assign user permissions via groups. not always used.
  "group_search_base": "dc=rtp,dc=raleigh,dc=ibm,dc=com",

  // [optional]
  // member uid's that are found in each groups will receive the corresponding IBP role.
  // if blank "ldap_attribute_map" will be used instead.
  // if both are blank then all users that can login will get the "MANAGER" role.
  // ex: a user that belongs to the ldap group `solidDevs` will get the IBP role "MANAGER"
  "ldap_group_map": {
    "MANAGER": ['solidDevs'],
    "WRITER": ['okDevs'],
    "READER": ['sketchyDevs'],
  },

  // [optional]
  // uid's that have said attribute will receive the corresponding IBP role.
  // if blank "ldap_group_map" will be used instead.
  // if both are blank then all users that can login will get the "MANAGER" role.
  // ex: a user that has the attribute `title` set to `attr2` will get the IBP role "WRITER"
  "ldap_attribute_map": {
    "MANAGER": 'title=attr1',
    "WRITER": 'title=attr2',
    "READER": 'title=attr3',
  }
},

// once a client gets this many failed auth requests, any further requests will be rejected.
// lockout uses a rolling window. wait for the older requests to age out. up to 2 minutes.
// a 402 error code will be sent once the client is locked out.
// defaults to 4 failures per athena process per client.
// a value of -1 will disable this feature
"lockout_limit" 4

// if true, GET request such as node status calls (via proxy route) and a few
// GET deployer calls (via deployer proxy route) will be cached
// defaults true
"proxy_cache_enabled": true,

// IBM's SRE api key
// used as basic auth for ak apis
// if null will be generated randomly
// defaults null
// (this is not intended for end users)
"support_key": "ibpsupport",
"support_password": null,

// http rate limit for the webserver on general apis. xxx requests per minute
// if exceeded a 429 code will be returned.
// the limit for GET requests will be higher. 16x this value.
// defaults 25/min
"max_req_per_min": 25,

// http rate limit for the webserver on api key apis. xxx requests per minute
// if exceeded a 429 code will be returned.
// the limit for GET /ak/ requests will be higher. 4x this value.
// defaults 25/min
"max_req_per_min_ak": 25,

// minimum character length of a user's password
// no effect on IBM IBP SaaS - defaults 8
"min_password_len": 8,

// maximum character length of a user's password
// no effect on IBM IBP SaaS - defaults 128
"max_password_len": 128,

// minimum character length of a user's username
// no effect on IBM IBP SaaS - defaults 6
"min_username_len": 6,

// maximum character length of a user's username
// no effect on IBM IBP SaaS - defaults 64
"max_username_len": 64,

// maximum number of components. after this point errors will occur if a new component is onboarded.
// defaults 250
"max_components": 250,

// if a in-memory cache for couch db calls should be enabled or not
// defaults true
"memory_cache_enabled": true,

// internal flag for ws message. do not modify
"message_type": "settings_doc_update",

// generic-oauth auth settings go here.
// can be null or dne if using another scheme.
// (these are standard passport oauth 2.0 settings)
"oauth": {

  // the url to send a user to for login
  "authorization_url": "https://example.com/identity/authorize",

  // the url to exchange the code for a token
  "token_url": "https://example.com/identity/token",

  // the credentials to use to talk to the oauth2 server
  "client_id": "username",
  "client_secret": "secret",

  // oauth2 settings
  "response_type": "code",
  "grant_type": "authorization_code",
},

// oidc auth settings go here. (bedrock iam)
// can be null or dne if using another scheme.
"oidc": {

  // the url to send a user to for login
  "authorization_url": "https://example.com/identity/authorize",

  // the url to exchange the code for a token
  "token_url": "https://example.com/identity/token",

  // the credentials to use to talk to the oidc server
  "client_id": "username",
  "client_secret": "secret",

  // the issuer ID must match the iss in the ID token.
  "issuer_id": "?"
},

// enable this setting to get over self-signed cert issues w/the browser
// if true will use athena to proxy most 'ip based TLS Hyperledger Fabric http/websocket traffic**'
// applies to peer & orderer traffic (not CAs)
// ** = the url of the node must have "https://" and be IPv4 (no hostname) to be proxied
// "proxy_tls_ws_url" must also be set to proxy websocket traffic (orderer)
// if enabled latency will be added
// a value of "always" will bypass the tls && IPv4 checks and will proxy all reqs
// defaults true
"proxy_tls_fabric_reqs": true,

// Update 02/25/2020
//		- this field still works, but its utility is questionable w/current code
// 		- do not set, let it default
// the **external** url + port to proxy Hyperledger Fabric http traffic
// applies to peer traffic
// only takes effect if "proxy_tls_fabric_reqs" is true or "always"
// defaults to variable "host_url" **default is recommended**
//"proxy_tls_http_url": "http://localhost:3000", // DEPRECATED field 02/25/2020

// Update 02/25/2020
//		- this field still works, but its utility is questionable w/current code
// 		- do not set, let it default
// the **external** url + port to use to proxy Hyperledger Fabric websocket traffic
// only applies to orderer traffic
// only takes effect if "proxy_tls_fabric_reqs" is true or "always"
// this is also used as an alt subject when building self-signed certs, used by our http server
// setting `null` will disable the websocket proxy
// defaults to variable "host_url" **default is recommended**
//"proxy_tls_ws_url": "http://localhost:3000", // DEPRECATED field 02/25/2020

// Update 09/24/2019
// 		- field was removed, do not set
// the **internal** port to use to proxy Hyperledger Fabric websocket traffic
// "proxy_tls_ws_internal_port": 3001,  // REMOVED 09/24/2019 - dne, no effect if set

// A geo location  description for athena
// Mainly this is used to indicate if the app is running locally for development or not.
// Valid values `"local"`, or <literally anything else>.
// Functions as a flag for different code execution.
// the env variable "REGION" will override this
"region": "local",

// if a memory cache for session should be used or not
// defaults true
"session_cache_enabled": true,

// secret for the session store
// derived from  "host_url" if null/empty
// changes to this field require a restart.
"session_secret": "ohnoididnotchangethepassword",

// the "write key" for segment.io
// if present it will call segment on most component APIs to track usage
// if null disables segment metric tracking
// if this key is edited, a restart is needed to take effect
"segment_write_key": "password",

// fabric's system channel id
"system_channel_id": "testchainid",

// toggle ability to hide transactions details on ui (for everyone)
// details unknown, its an apollo setting, see brian
"transaction_visibility": ?,

// dictionary of default resources and storage for each component type or "sub component"
// see default json file for example/starting values
// contains default values for: cpu, memory, storage
// cpu & memory fields are required, storage is optional
// byte values should be in base 2, such as Gi/Mi, or GiB/MiB.
"the_default_resources_map": {}

// use this to control if the web server should parse the X-Forwarded-* headers
// for data, like the client's ip address.
// see https://expressjs.com/en/guide/behind-proxies.html
// changes to this field require a restart.
// defaults "loopback, linklocal, uniquelocal"
"trust_proxy": "loopback, linklocal, uniquelocal",

// if true signatures submitted during signature collection apis can be
// verified with an untrusted certificate.
// defaults false
"trust_unknown_certs": false,

// internal field. do not modify
"type": "settings"

// max time in ms for athena to respond to a websocket request
// changes to this field require a restart.
// defaults to the same value as http_timeout
"ws_timeout": 120000,

}
```

# Auth Schemes Explained
An auth scheme is a scheme that controls how your users will login to the IBP console UI.
There are a few different versions.
Choose one option.

All IBM IBP SaaS  services will use `iam`.
We recommend everyone else to use either `oidc`, or `ldap` or `oauth`, or `couchdb` (and in that order).

All schemes have 3 roles to assign varying abilities to users: `manager`, `writer`, `reader`.
See the [_permissions doc](../docs/_permissions.md) for role/action details.

### 0. Initial
- a `auth_scheme` value of `initial` will not perform authentication. only a limited number of APIs work with this scheme. this is a "temporary" scheme that should be used as you setup another scheme.
	- no other settings are needed

### 1. IAM (IBM Cloud SaaS)
- a `auth_scheme` value of `iam` will use IBM Cloud's IAM to login with IBM IDs. Can only be setup by IBMers. Is used by all IBP v2 service instances. this is an OAuth 2 based scheme.
- required setting fields: (find field in default_settings_doc above for details)
	- `auth_scheme` (string)
	- `ibmid` (object)
	- `iam_api_key` (string)

### 2. OIDC (IBM Bedrock IAM)
- a `auth_scheme` value of `oidc` (Open ID Connect) will use IBM Bedrock's IAM to login. only available if IBP is deployed on IBM bedrock. this is an OAuth 2 based scheme.
- required setting fields: (find field in default_settings_doc above for details)
	- `auth_scheme` (string)
	- `oidc` (object)
	- `iam_api_key` (string)

### 3. LDAP
- a `auth_scheme` value of `ldap` will directly talk to an LDAP server for auth.
- required setting fields: (find field in default_settings_doc above for details)
	- `auth_scheme` (string)
	- `ldap` (object)
- [optional] assign IBP roles via LDAP groups example:
	```js
	// ex: a user that belongs to the ldap group `solidDevs` will get the IBP role "MANAGER"
	"ldap_group_map": {
		"MANAGER": ['solidDevs'],
		"WRITER": ['okDevs'],
		"READER": ['sketchyDevs'],
	}
	```
- [optional] assign IBP roles via LDAP attributes example example:
	```js
	// ex: a user that has the attribute `title` set to `attr2` will get the IBP role "WRITER"
	"ldap_attribute_map": {
		"MANAGER": 'title=attr1',
		"WRITER": 'title=attr2',
		"READER": 'title=attr3',
	}
	```

### 4. Generic Oauth
- a `auth_scheme` value of `oauth` will use a generic passport OAuth 2 strategy for login.
- required setting fields: (find field in default_settings_doc above for details)
	- `auth_scheme` (string)
	- `oauth` (object)

### 5. CouchDB (local)
- a `auth_scheme` value of `couchdb` will use the same CouchDB for optools data as your user data. the settings doc in the system db will contain your valid users. this is the "poor man's" solution and should only be used if you cannot use another scheme.
- required setting fields: (find field in default_settings_doc above for details)
	- `auth_scheme` (string)
	- `initial_admin` (string)
	- `default_user_password_initial` (string)

### 6. AppID (discontinued)
- a `auth_scheme` value of `appid` will use the IBM Cloud service [App ID](https://console.bluemix.net/catalog/services/app-id). which is a service that can integrate with many SSO providers or implement a custom email/pass store. no longer supported, **do not use**.
- required setting fields: (find field in default_settings_doc above for details)
	- `auth_scheme` (string)
	- `app_id` (object)

### 7. IBM ID (discontinued)
- a `auth_scheme` value of `ibmid` will use the **legacy** IAM for logging in users with IBM IDs. this is currently only used for **dev IBP** on IBM Cloud. this is an OAuth 2 based scheme. no longer supported, **do not use**.
	- `auth_scheme` (string)
	- `ibmid` (object)
