# Logging APIs
- The log files can be found in `./logs`.
- The log files are limited to xx MB. (configured in log_lib.js)
	- Each new file has the same root name plus an appended number. Higher is an older file.
- The logs files will rotate after xx files. (configured in log_lib.js)

## 1. Save client side logs to file system
Send client side logs to the server to be logged to the file system.
- **Method**: POST
- **Route**: `/api/v1/logs`
- **Auth**: login session
- **Body**:
```js
// your logs here as plain text. do not send JSON.
```
- **Response**:
```js
{
	"message": "ok"
}
```

## 2. See the available log files (serves html)
Get a UI server log file by its filename.
Response is html (not json).
- **Method**: GET
- **Route**: `/api/v1/logs`
- **Auth**: needs action `blockchain.optools.logs`
- **Body**: n/a
- **Response**:
```js
// bare bones html page that list log files
```

## 3. Get a log file
Get a UI server log file by its filename.
Response is text (not json).
- **Method**: GET
- **Route**: `/api/v1/logs/:logFileName`
- **Auth**: needs action `blockchain.optools.logs`
- **Body**: n/a
- **Response**:
```js
// your logs here as plain text.
```

## 4. Change file logging settings
Use this api to change logging settings.
- **! [NOTE] ! This api will restart athena**
- **Method**: PUT
- **Route**: `/api/v1/logs/file_settings`
- **Auth**: needs action `blockchain.optools.logs`
- **Body**:
```js
// only include the settings you want to change, the other settings will remain
{
  // [optional] settings you want to change for the client go here, omit if no changes
 "client": {
        "enabled": true,     // if true client side logging will be stored to file
        "level": "silly",    // 'error', 'warn', 'info', 'verbose', 'debug', or 'silly' logs will be stored
        "unique_name": false // if true log file names will have a random suffix
	},

  // [optional] settings you want to change for the server go here, omit if no changes
 "server": {
        "enabled": true,     // if true server (node.js) logging will be stored to file
        "level": "silly",    // 'error', 'warn', 'info', 'verbose', 'debug', or 'silly' logs will be stored
        "unique_name": false // if true log file names will have a random suffix
    }
}
```
- **Response**:
```js
// the (new) settings will be sent back
{
	"message": "ok"
}
```

<a name="client"></a>

## 5. Send client side event
Use this api to pass a client side event to the `event_tracker.js` lib on the server.
If Activity Tracker is enabled it it will be recorded in the `activity.log` file.
Activity Tracker is enabled if the `auth_scheme` setting is `"iam"` and the `activity_tracker_filename` setting is not `null`.
Only pass fabric events (fabric operations) b/c all component related events are already handled by athena.

There are only a few things that apollo can send that will bubble up to the log of an activity tracker event:
- `resource` - (in path) the type of resource for the event. becomes part of the event's `action` field (and others...). spaces or special characters will be removed.
- `resource_id` - (in path) the id of the resource. spaces or special characters will be removed. becomes part of the event's `target.id` field.
- `client_details` - (in body) this field will appear (as is) in the event's: `responseData.client_details` field. it can help describe what the event did.
- `http_code` - (in body) this field will translate to the event fields: `outcome`, `reason.reasonCode` and `reason.reasonType`. see body description below.
- `action_verb` - (in body) it will appear as the verb of the `action` in the event. activity tracker only allows certain verbs, so pick a verb that kind of matches. its not super-important if it doesn't make much sense.
- **Method**: POST
- **Route**: `/api/v[123]/events/:resource/:resource_id`
- **Auth**: needs action `blockchain.optools.view`
- **Body**:
```js
{
	// http status code that represents the success/error nature of the event
	// - the event's `reason.reasonCode` field will take this code
	// - the event's `outcome` filed will be "success" if this code is 1xx, 2xx & 3xx
	//   - else the `outcome` field will be "failure"
	// - the event's `reason.reasonType` field will be either "OK" or "NOT OK" based on the code
	"http_code": 200

	// a matching verb that describes your event.
	// must match verb in activity tracker's whitelist - https://test.cloud.ibm.com/docs/services/Activity-Tracker-with-LogDNA?topic=logdnaat-ibm_event_fields#action
	// suggestions:
	// "read", "delete", "create", "update", "configure", "monitor", "allow", "enable"
	"action_verb": "read"

	// [optional] pass any custom data you want
	// supposed to help give the user more context about the event
	"client_details": {<anything>},
}
```
- **Response**: `202` code
```js
{ "message": "ok" }
```
- **Examples**:
```js
/*
	// these are just suggested examples, pass w/e that fits.

	// create channel example:
	method: POST
	path: /api/v[123]/events/channels/MyChannel
	body: {
		"action_verb": "create",
		"http_code": 200
	}

	// edit channel policy example:
	method: POST
	path: /api/v[123]/events/channels/MyChannel
	body: {
		"action_verb": "update",
		"http_code": 200
	}

	// add org 2 consortium example:
	method: POST
	path: /api/v[123]/events/consortium/Org3
	body: {
		"action_verb": "create",
		"http_code": 200
	}

	// join peer to channel example:
	method: POST
	path: /api/v[123]/events/peer/MyChannel
	body: {
		"action_verb": "enable",
		"http_code": 200,
		"client_details": {
			"peer": 'my-peer'
		},
	}

	// install chaincode example:
	method: POST
	path: /api/v[123]/events/chaincode/marbles-v1
	body: {
		"action_verb": "create",
		"http_code": 400,
		"client_details": {
			"peer": 'my-peer'
		},
	}

	// instantiate/update chaincode example:
	method: POST
	path: /api/v[123]/events/chaincode/marbles-v2
	body: {
		"action_verb": "update",
		"http_code": 200
	}

	// approve chaincode definition example:
	method: OPTIONS
	path: /api/v[123]/events/chaincode/marbles-v2
	body: {
		"action_verb": "allow",
		"http_code": 200
	}
*/
```
