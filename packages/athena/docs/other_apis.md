# Other APIS

## 1. Get athena settings
See public Optools configuration settings.
- **Method**: GET
- **Route**: `/api/v[123]/settings` || `/ak/api/v[123]/settings`
- **Auth**: `n/a`
- **Body**: `n/a`
- **Response**:
```js

// 07/17/2019 - this response is grossly out of date (doc is missing fields)
// call api to see full response

{
	"ATHENA_ID": "17v7e",   // random/unique id for an instance of athena
	"AUTH_SCHEME": "appid", // either "appid" or "ibmid" or "iam"
	"COMMIT": "?",  // git commit of athena, "?" if unavailable
	"CONFIGTXLATOR_URL_ORIGINAL": "https://example.com", // url to reach a configtxlator
	"CLUSTER_DATA": {
		"type": "paid"
	},
	"DB_SYSTEM": "athena_system", // name of settings/tx database
	"DEPLOYER_TIMEOUT": 90000, // deployer http timeout in ms
	"DEPLOYER_URL": "something",
	"DOMAIN": null, // domain athena is using for cookies, should match url in browser
	"ENVIRONMENT": "dev",
	"FABRIC_CAPABILITIES": {
		"application": [],
		"channel": [
			"V1_3"
		],
		"orderer": [
			"V1_1"
		]
	},
	"FEATURE_FLAGS":{	// copy of "FEATURE_FLAGS" key in the settings doc
		"remote_peer_config_enabled": true  // example feature flag
	},
	"FILE_LOGGING": { // file logging settings
		"server": { // athena logs
			"path": "./logs", // directory of log files
			"file_name": "athena.log", // name of log file
			"enabled": true, // if true historic logs will be saved to the file system
			"level": "silly" // this logging level and above will be stored
		},
		"client": { // apollo logs
			"path": "./logs", // directory for log files
			"file_name": "athena_client.log", // name of log file
			"enabled": true, // if true historic logs will be saved to the file system
			"level": "silly" // this logging level and above will be stored
		}
	},
	"CSP_HEADER_VALUES": [
		"'none'"
	],
	"GRPCWPP_TIMEOUT": 300000, // grpc web proxy (http) timeout in ms
	"HOST_URL": "http://localhost:3000", // home url
	"HTTP_TIMEOUT": 120000,  // http timeout for athena to respond, ms
	"LANDING_URL": "http://localhost:3000",
	"PORT": "3000",  // port athena is running on
	"REGION": "local",  // if its "local" we disable things like https
	"TIMESTAMPS": {
		"now": 1542746836056,  // the current unix timestamp, ms
		"born": 1542745101975, // the timestamp athena started, ms
		"next_settings_update": "1.1 mins", // the next db settings refresh
		"up_time": "28.9 mins" // how long this athena process has been up
	}
}
```

## 2a. Restart Athena - Normal
Restart all OpTool processes connected to couch db.
If multiple processes are behind a load balancer, this api will restart all.
- **Method**: POST
- **Route**: `/api/v[123]/restart` || `/ak/api/v[123]/restart`
- **Auth**: need `blockchain.optools.restart` action
- **Body**: `n/a`
- **Response**:
```js
{
	"message": "restarting - give me 10 seconds",
}
```

Restart is accomplished with a `nodemon` like script `server_watcher.js` and `couchdb`.
Thus running app.js via `server_watcher.js` is required.

The restart takes about 5-10 seconds depending on hardware.
This api _should_ respond before the restart occurs.
A log with the date of the last restart, via this API, can be found in `./logs/athena_restart.log`.

## 2b. Restart Athena - Single
Restart 1 OpTool process (the instance that received this requests).
If multiple processes are behind a load balancer, this api will only restart 1.
- **Method**: POST
- **Route**: `/ak/api/v[123]/restart/force`
- **Auth**: need `blockchain.optools.restart` action
- **Body**: `n/a`
- **Response**:
```js
{
	"message": "you got it",
}
```

Restart is accomplished with a `nodemon` like script `server_watcher.js` and `couchdb`.
Thus running app.js via `server_watcher.js` is required.

The restart takes about 5-10 seconds depending on hardware.
This api _should_ respond before the restart occurs.

This api differs from 2a in that it does **not** involve couch db nor pillow talk.
Thus it will not restart multiple athena instances.
Use this restart in emergencies or messed up instances.

## 3a. Delete all sessions - Normal
Delete all browser sessions for all OpTool processes connected to couch db.
Useful when debugging login issues.
All logged in users will be effectively logged out and need to login again on their next tab/window refresh.

Its important to run this api after removing users if you want them kicked out.
- **Method**: Delete
- **Route**: `/api/v[123]/sessions` || `/ak/api/v[123]/sessions`
- **Auth**: need `blockchain.optools.restart` action
- **Body**: `n/a`
- **Response**:
```js
{
	"message": "delete submitted",
}
```

## 3b. Delete all sessions - Single
Delete all browser sessions for this OpTools process.
- **Method**: Delete
- **Route**: `/api/v[123]/sessions/force` || `/ak/api/v[123]/sessions/force`
- **Auth**: need `blockchain.optools.restart` action
- **Body**: `n/a`
- **Response**:
```js
{
	"message": "ok",
	"deleted": 1000000
}
```

## 4. Get athena health stats
See memory usage and other OS stats.
- **Method**: GET
- **Route**: `/api/v[123]/health` || `/ak/api/v[123]/health`
- **Auth**: need `blockchain.optools.logs` action
- **Body**: `n/a`
- **Response**:
```js
{
	"OPTOOLS": {
		"instance_id": "p59ta", // random/unique id for an instance of athena
		"now": 1554125709422,   // the current unix timestamp, ms
		"born": 1554125691549,  // the timestamp athena started, ms
		"up_time": "17.9 secs", // how long this athena process has been up
		"memory_usage": {
			"rss": "56.1 MiB", // resident set size - total memory allocated for the process
			"heapTotal": "34.4 MiB", // memory allocated for the heap of V8
			"heapUsed": "28.4 MiB", // current heap used by V8
			"external": "369.3 KiB" // memory used by bound C++ objects
		},

		// stats on the in-memory cache for user sessions
		"session_cache_stats": {
			"hits": 51,      // number of cache hits
			"misses": 3,     // number of cache misses
			"keys": 1,       // number of entries in the cache
			"cache_size": "433.00 Bytes" // memory size of the cache
		},

		// stats on the in-memory cache for user couchdb req
		"couch_cache_stats": {
			// same cache stats as above
		},

		 // stats on the in-memory cache for iam auth related req
		"iam_cache_stats": {
			// same cache stats as above
		},
		// stats on the in-memory cache for proxy route req

		"proxy_cache": {
			// same cache stats as above
		}
	},
	"OS": {
		"arch": "x64", // CPU architecture
		"type": "Windows_NT", // operating system name
		"endian": "LE", // endianness of the CPU. LE - little endian, BE - big endian
		"loadavg": [0,0,0], // cpu load in 1, 5, & 15 minute averages. n/a on windows
		"cpus": [ // array of cpu data, 1 per core
			{
				"model": "Intel(R) Core(TM) i7-8850H CPU @ 2.60GHz", // model of cpu core
				"speed": 2592, // speed of core in MHz
				"times": {
					"idle": 131397203, // ms CPU is in idle
					"irq": 6068640,    // ms CPU is in irq
					"nice": 0,         // ms CPU is in nice
					"sys": 9652328,    // ms CPU is in sys
					"user": 4152187    // ms CPU is in user
				}
			},
		],
		"total_memory": "31.7 GB", // total memory known to the OS
		"free_memory": "21.9 GB",  // free memory on the OS
		"up_time": "4.9 days"      // time OS has been running
	}
}
```

## 5. Get athena settings
See private OpTools settings.
- **Method**: GET
- **Route**: `/api/v[123]/private-settings` || `/ak/api/v[123]/private-settings`
- **Auth**: need `blockchain.optools.settings` action
- **Body**: `n/a`
- **Response**:
```js
{
	"DEPLOYER_URL": "?",     // the full un-redacted deployer url
	"DEFAULT_USER_PASSWORD": "password", // the password to use for users without a password
	"SESSION_SECRET": "?",   // secret used in express's session store
}
```

## 6. Edit a single field in the settings doc
Edit any settings doc field.
Use with caution.
You may need to restart the server for some fields to take effect (logging).

**Check out api #7 (below) before using this one.** It has input validation.
- **Method**: PUT
- **Route**: `/api/v[123]/settings/key` (legacy route: `/api/v[123]/authscheme/key`)
- **Auth**: need `blockchain.optools.settings` action
- **Body**:
```js
// If the property to used as the replacement is an object:
{
  "<prop_in_settings>":{    				// this is the name of the field to be edited
    "<value_to_overwrite_property>": ""  	// overwrite w/e is in the settings_doc.system_config
  }
}

// Else
{
	"<prop_in_settings>": <value_to_overwrite_property>
}

```
- if property passed in doesn't exist it will be created by the API and assigned the value passed in
- users with an auth_scheme of 'ibmid' cannot change the setting `auth_scheme`. all other settings are changeable.

- **Response**:
```js
// If `prop_in_settings` is `auth_scheme` and the value is `app_id`
{
    "message": "ok",
    "provider": "appid"
}

// If `prop_in_settings` is valid but not `auth_scheme`
{
    "message": "ok"
}
```

## 7. Edit UI settings
Edit the OpTools settings that are visible in the UI's Settings panel.
All settings are validated.
- **! [NOTE] ! This api will restart Optools** if logging settings were changed
- **Method**: PUT
- **Route**: `/api/v[123]/settings` || `/ak/api/v[123]/settings`
- **Auth**: need `blockchain.optools.settings` action
- **Body**:
```js
// only include the settings you want to change, the other settings will remain
{
  // [optional] log settings you want to change for the client go here, omit if no changes
  "file_logging":{
     "client": {
           "enabled": true,     // if true client side logging will be stored to file
           "level": "silly",    // 'error', 'warn', 'info', 'verbose', 'debug', or 'silly' logs will be stored
           "unique_name": false // if true log file names will have a random suffix
      },

     // [optional] log settings you want to change for the server go here, omit if no changes
     "server": {
           "enabled": true,     // if true server (node.js) logging will be stored to file
           "level": "silly",    // 'error', 'warn', 'info', 'verbose', 'debug', or 'silly' logs will be stored
           "unique_name": false // if true log file names will have a random suffix
      }
  },

  // idle/inactivity UI timeout settings
  "inactivity_timeouts": {
      "enabled": true,
      "max_idle_time": 5000000
   },

  // rate limits
  "max_req_per_min": 101,    // limits used by the UI
  "max_req_per_min_ak": 102,  // limits used by client APIs

  // set the fabric timeouts that will be passed to apollo/stitch
  "fabric_get_block_timeout_ms": 10000,
  "fabric_instantiate_timeout_ms": 11000,
  "fabric_join_channel_timeout_ms": 12000,
  "fabric_install_cc_timeout_ms": 13000,
  "fabric_general_timeout_ms": 14000,
  "fabric_lc_install_cc_timeout_ms": 15000,
  "fabric_lc_get_cc_timeout_ms": 16000,
}
```
- **Response**:
```js
// the (new) settings will be sent back
{}
```

## 8. Exchange API key for Access Token
- **Method**: POST
- **Route**: `/ak/api/v[123]/get-token`
- **Auth**: n/a
- **Body**:
```js
{
    "unimportant_string": "api key"
}
```
- **Response**:
```js
{
    "access token"
}
```

## 9. Flush ALL Caches
Clear out in-memory caches, all of them.
No effect on caches that are currently disabled via configuration settings.
- **Method**: DELETE
- **Route**: `/api/v[123]/cache` || `/ak/api/v[123]/cache`
- **Auth**: need `blockchain.optools.restart` action
- **Body**: n/a
- **Response**:
```js
{
  "message": "ok",
  "flushed": [    // list of caches that were flushed
    "couch_cache",
    "iam_cache",
    "proxy_cache",
    "session_cache"
  ]
}
```

## 10. Get Server Metrics
Get basic statistical data on http requests (access logs) OpTools has seen.
Note that this api is aggregating logs across multiple OpTools processes via pillow-talk.
Meaning, if you have multiple Athena processes behind a load balancer, this api will return results from all processes.
- **Method**: GET
- **Route**: `/api/v[123]/http_metrics/:days?` || `/ak/api/v[123]/http_metrics/:days?`
- **Auth**: need `blockchain.optools.logs` action
- **Parameters**:
	- `days` - [optional] - the number of days to filter on when building the summary/metrics calculation, defaults to 7 days.
- **Body**: n/a
- **Response**:
```js
{
	// number of "http_access" log entries before rolling over
	"http_access_max_logs": 10000,

	// example/legend for a "http_access" string
	// note that a hash of the "User-Agent" header was chosen to lower log lengths...
	"http_access_format": "<response_date> <process_id> <username> <method> <route> HTTP/<http_version> <status_code> <user_agent_hash> <response_ms> <ip_hash>'",

	// array of strings for all http requests
	// only contains up to "http_access_max_logs" entries in the array
	"http_access": [
		"2019/10/21-18:33:10.897Z - mr4mj GET /api/v1/users/info HTTP/1.1 202 efbd 167 localhost",
		"2019/10/21-18:33:10.897Z - mr4mj GET /api/v1/settings HTTP/1.1 200 efbd 179 localhost",
		"2019/10/21-18:33:11.083Z - mr4mj GET /api/v1/authscheme HTTP/1.1 200 efbd 154 localhost",
		"2019/10/21-18:33:11.102Z - mr4mj POST /api/v1/logs HTTP/1.1 401 efbd 156 localhost",
		"2019/10/21-18:33:11.268Z - mr4mj GET /auth/login HTTP/1.1 302 efbd 465 localhost",
		"2019/10/21-18:33:13.056Z mr4mj d******a@us.ibm.com GET /auth/login HTTP/1.1 302 efbd 1952 localhost",
	],

	// array of OpTools process IDs
	// 1 per process that responded with access logs
	"process_ids": [
		"mr4mj"
	],

	// a map of *all* browser "User-Agent" headers aggregated from all OpTools processes
	"seen_user_agents": {

		// the key is the hash of a "User-Agent" header
		// the hash can be found in a "http_access" string and in the server console logs
		"efbd": {

			// the full "User-Agent" header
			// note to others - do not attempt to read this string by yourself, you will regret existence
			// use a tool or lib like https://developers.whatismybrowser.com/useragents/parse to pinpoint the actual browser + OS
			"str": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:70.0) Gecko/20100101 Firefox/70.0",

			// the hash again
			"hash": "efbd"
		}
	},

	// basic http metrics in the last xxxx days.
	// the raw data source is the "http_access" array.
	// thus the metrics summary is built using the last xxxx days of data AND the
	// last xxxx requests that we have collected.
	// "xxxx days" defaults to the last 7 days. see route parameter details above.
	"last_x_days_metrics": {

		// access logs entries equal to or younger than this are used to build the data below
		"_days": 7,

		// the frequency of http response status codes within x days
		"codes": {
			"200": 15,
			"202": 1,
			"302": 2,
			"401": 8,
			"408": 4
		},

		// the frequency of http request methods within x days
		"methods": {
			"GET": 20,
			"POST": 10
		},

		// map of route metrics within x days
		"routes": {

			// they key is the http request route + method
			"/api/v1/authscheme GET": {

				// the average response time in ms for this route
				"avg_response_ms": 78,

				// the frequency of this route
				"count": 2
			}
		},

		// a map of browser "User-Agent" headers seen within x days
		"user_agents": {

			// the key is the hash of a "User-Agent" header
			// the hash can be found in a "http_access" string and in the server console logs
			"efbd": {

				// the frequency of this "User-Agent" header
				"count": 53,

				// the full "User-Agent" header
				// note to others - do not attempt to read this string by yourself, you will regret existence
				// use a tool or lib like https://developers.whatismybrowser.com/useragents/parse to pinpoint the actual browser + OS
				"str": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:69.0) Gecko/20100101 Firefox/69.0"

				// the hash again
				"hash": "efbd"
			}
		}
	}
}
```

## 11. Generate a Postman Collection
Build a [Postman](https://www.getpostman.com) API Collection (response is JSON).
The JSON contains all the APIs available in the IBP console including examples and documentation.
It can be imported to the Postman desktop application.
It will also be pre-populated with authorization credential material.
The authorization credentials must be provided to this API, see body for specifics.

### Master Collection:
Note a developer of OpTools can get the master collection (which includes session based requests) by downloading
[OpTools.master.postman_collection.json](../json_docs/OpTools.master.postman_collection.json).

The following "tags" are text that can be found in the name of some requests in the master collection.
The "tags" will not be built in the generate collection
- `(skip-me)` - an api built for internal use, should not be doc'd for an end user
- `(legacy)` - an api built for an older version of OpTools, should not be doc'd for an end user
- `(unused)` - an api built for a future version of OpTools, should not be doc'd for an end user
- `(software-only)` - an api built for Software and shouldn't be used on SaaS

### API
- **Method**: GET
- **Route**: `/api/v[23]/postman` || `/ak/api/v[23]/postman`
- **Auth**: must have action `blockchain.optools.view`
- **Body**:
```js
// --------------------------------------------------------------
// There are 3 options for 3 auth methods. Choose your situation.
// --------------------------------------------------------------

// 1. [SaaS OpTools] if a user wants a collection with auth that expires after an hour
// (recommended)
{
	// use "bearer" for IAM bearer token authorization
	"auth_type": "bearer",

	// Provide the IAM bearer token aka access token to use in all routes via field "token".
	// This must be obtained out of band by the user. Steps:
	//
	// An IAM api key that has the same permissions as your IAM user can be obtained here:
	// 		- https://cloud.ibm.com/iam/apikeys
	//
	// Use this curl command to exchange an IAM api_key for a bearer/access token
	// 		curl -X POST https://iam.cloud.ibm.com/identity/token -H "Content-Type: application/x-www-form-urlencoded"  -H "Accept: application/json" -d "grant_type=urn%3Aibm%3Aparams%3Aoauth%3Agrant-type%3Aapikey&apikey=IAM-API-KEY-HERE"
	// An IAM bearer token is good for 1 hour, thus this collection is valid for 1 hour.
	"token": "blah.blah.blah"
}

// 2. [SaaS OpTools] if the user wants a collection with auth that does not expire
// (this is not recommended)
{
	// use "api_key" for direct IAM api key authorization
	"auth_type": "api_key",

	// Provide the IAM api key to use in all routes via field "api_key".
	// This must be obtained out of band by the user. Steps:
	//
	// An IAM api key that has the same permissions as your IAM user can be obtained here:
	// 		- https://cloud.ibm.com/iam/apikeys
	//
	// An IAM api key is good until deleted. Thus this collection is good indefinitely.
	// Which is a slight security risk.
	"api_key": "blahBlahBlah"
}

// 3. [Software OpTools] only option for software, auth does not expire
{
	// use "basic" for OpTools api key authorization via basic auth
	"auth_type": "basic",

	// Provide the OpTools api key and secret to use via fields "username" and "password.
	// This must be obtained out of band by the user. Steps:
	//
	// Use the create-an-api-key API to create the key:
	//		`POST /ak/api/v1/permissions/keys`
	//
	// An OpTool api key is good until deleted. Thus this collection is good indefinitely.
	// Which is a slight security risk.
	"username": "api-key",
	"password": "api-secret"
```
- **Response**:
```js
{
	// Postman Collection - Format v2.1
}
```

## 12. Get Advanced Settings
Get advanced settings for OpTools and see what file is setting the value.
You can view most settings using this api, even ones not found in the UI "Settings" panel.

This api is intended to be used by other OpTools developers and SRE members.
It allows seeing almost all settings that run OpTools.

It is not for end user consumption and should not be offered to them.
I don't want them messing around with settings that could break the UI and thus open needless tickets.

- **Method**: GET
- **Route**: `/api/v[123]/advanced-settings` || `/ak/api/v[123]/advanced-settings`
- **Auth**: need `blockchain.optools.settings` action
- **Body**: n/a
- **Response**:
```js

{
	// [this is only a partial example]

	// (example of a root field)
	// name of a root key - all uppercase
	"CRN_STRING":{

		// what file is driving this setting
		// its either "config" or "db" or "code"
		"_defined_by": "config",

		// the value of this setting
		"_value": "crn:v1:bluemix:public:blockchain-dev:us-south:a/e08f36b38fb6b618b48345054033eb22:af143ee9-7876-4264-a1b2-9c4ce8b96608::"
	},

	// (example of a nested field)
	// name of a root key - all uppercase
	"FEATURE_FLAGS":{

		// name of inner key - case is w/e case is in file
		"capabilities_enabled": {
			"_defined_by": "db",
			"_value": true
		}
	}
}
```

## 13. Edit Advanced Settings
Edit advanced settings for OpTools.
You can edit any setting using this api, even ones not found in the UI "Settings" panel.

This api is intended to be used by other OpTools developers and SRE members.
Use it to change settings to get out of some bind.

It is not for end user consumption and should not be offered to them.
I don't want them messing around with settings that could break the UI and thus open needless tickets.

This api spec is quite ugly, but its working... sooo since its not for end users.. calling it a day.

- **Method**: PUT
- **Route**: `/api/v[123]/advanced-settings` || `/ak/api/v[123]/advanced-settings`
- **Auth**: need `blockchain.optools.settings` action
- **Body**:
```js
{
	// (example editing a root field)
	// name of the key we are going to edit - case does not matter
	"CRN_STRING":{

		// the value you want this setting to have
		"_value": "do this",

		// what file to edit for this setting
		// its either "config" or "db"
		"_defined_by": "config",
	},

	// (example editing a nested field)
	// use dot notation to get to the nested key:
	"FEATURE_FLAGS.capabilities_enabled":{
		"_defined_by": "db",
		"_value": true
	}
}
```
- **Response**:
```js
{
	// same response as the get-advanced-settings api
}
```

## 14. Head req
The OpTools server will respond to http HEAD requests.
Typical usage is to test if the server is reachable from your client.

- **Method**: HEAD
- **Route**: any route will work however `/` is recommended
- **Auth**: n/a
- **Body**: n/a
- **Response**: n/a (Since HEAD requests do not return a body, look for a `204` http status code)

## 15. Start/Stop request processing (graceful shutoff)
Stop or start processing of new http/https requests on all OpTool processes connected to couch db.
If multiple processes are behind a load balancer, this api will only effect the process that received the API.
Typically this api will be used before shuting down athena processes.
It gives time for active clients to finish their existing requests and time for database queries to terminate/settle.
_This api does **not** shutdown athena processes. It only controls if new requests will be accepted or rejected._
_Once shutoff, the process will respond to all apis with a `503` status code and an error msg_
- **Method**: POST || GET (/ak cannot use GET, only internal)
- **Route**: `/api/v[23]/requests/:action` || `/ak/api/v[123]/requests/:action`
- **Auth**:
	- if http req ip is `localhost` - no auth! (not available on route that starts with `/ak/`)
	- if http req ip is not `localhost` - need `blockchain.optools.restart` action
- **Params**:
	- the value of `action` (its in the path) should be either `stop` or `start`
- **Body**: `n/a`
- **Response**:
```js
// response for action = "stop"
{
	"message": "stopping request processing",
}

// response for action = "start"
{
	"message": "starting request processing",
}

// response for action = "start" (if it was already started)
{
	"message": "requests processing is already started'",
}
```

- **PillowTalk™ Doc**: A pillow talk doc can be used to trigger the same functionality. Write a doc to the `DB_SYSTEM` db aka `xyz_athena_system` with this format:
```js
// doc to stop
{
	"type": "pillow_talk_doc",
	"timestamp": 1597672816721,
	"process_id": "-",
	"message_type": "stop",
	"message": "stopping request processing via manual doc",
	"by": "deployer",
	"uuid": "-"
}

// doc to start
{
	"type": "pillow_talk_doc",
	"timestamp": 1597672816721,
	"process_id": "-",
	"message_type": "start",
	"message": "starting request processing via manual doc",
	"by": "deployer",
	"uuid": "-"
}
```

## 16. Get active OpenApi file
Get the active OpenApi (swagger) file for input validation.
This file validates inputs to most APIs.
The response will be **YAML** text.

- **Method**: GET
- **Route**: `/api/v[23]/openapi` || `/ak/api/v[23]/openapi`
- **Auth**: need `blockchain.optools.view` action
- **Body**: `n/a`
- **Response**:
```js
// yaml file here, full thing
```

## 17. Add a new OpenApi file
Add a new OpenApi (swagger) file for input validation.
This file validates inputs to most APIs.

The body should be **YAML** text.
The version of this swagger must be unique.
Meaning `info.version` should be incremented on each new file.

**Restart IBP to use this new file.**
*IBP will pick up and use the highest validator file (highest `info.version`) on start up*.

- **Method**: POST
- **Route**: `/api/v[23]/openapi` || `/ak/api/v[23]/openapi`
- **Auth**: need `blockchain.optools.settings` action
- **Body**:
```js
// yaml file here, full thing
```
- **Response**:
```js
{
    "message": "ok",
    "id": "01_validation_ibp_openapi_2.5.1",
    "details": "restart IBP to use this file"
}
```

## 18. Delete a database
Delete the database from couchdb

Provide the database's id in the path to delete.

- **Method**: Delete
- **Route**: `/api/v[3]/dbs/:db_name` || `/ak/api/v[3]/dbs/:db_name`
- **Auth**: need `blockchain.optools.settings` action
- **Body**: `n/a`
- **Response**:
```js
{
	"msg": "ok",
	"deleted": "<db_name>"
}
```

## 19. Debug client ip or headers
Use this requests to debug how athena is parsing the clients ip.

- **Method**: GET
- **Route**: `/api/v3/debug/ip` || `/ak/api/v3/debug/ip`
- **Auth**: need `blockchain.optools.view` action
- **Body**: n/a
- **Response**:
```js
{
	"ip_orig": "::ffff:127.0.0.1",
	"ip": "localhost",
	"ip_hash": "localhost",
	"headers": {
		"host": "localhost:3000",
		"user-agent": "Firefox/81.0",
		"accept": "*",
		"accept-language": "*",
		"accept-encoding": "gzip, deflate",
		"connection": "keep-alive",
		"cookie": "asdf",
		"upgrade-insecure-requests": "1",
		"cache-control": "max-age=0"
	}
}
```

## 20. Healthcheck
Use this requests to see if athena is running or not.
No auth.
Note, unlike other apis there will be no server logs or api events.

- **Method**: GET
- **Route**: `/api/v3/healthcheck` || `/ak/api/v3/healthcheck`
- **Auth**: no auth
- **Body**: n/a
- **Response**:
```js
{
	"message": "ok",
	"id": "asdf"  // the id of the athena instance that replied to the req
}
```
