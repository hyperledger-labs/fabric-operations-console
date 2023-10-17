# Event Tracking Notes
(aka Audit Logs aka Activity Logs)

<a name="notice"></a>

## Activity Logs
These logs are our local event tracking system for console activity.
It covers user and api key actions in the browser or via console apis that manage CAs, peers, orderers, channels, and chaincode.
These logs are stored in the console's `system` database in couchdb, so they will persists indefinitely.

### What is tracked

- Console user login/logouts
- Component creations/deletions/updates
- Console setting changes
- User access changes
- Signature collection changes
- Channel creation
- Chaincode installation/instantiation

### How to turn it on/off

The setting `feature_flags.audit_logging_enabled` will control if these audit/activity logs are enabled or not.
If this setting is `true` it is enabled.
It is enabled by default.

This setting can be set like any other console configuration setting.
You can use an api, edit your [config file](../env/README.md#config), or change the setting in the database directly.
See the [configuration options](../env/README.md#how-to-change-a-setting) readme for general console setting details.

### What is in an event

Below is an example, note that white space has been added here to make it easier to read.

```js
// a single event - example
{
	// the date using your timezone according to your browser
	"local_date": "10/17/2023 - 9:54:20 AM",

	// unix timestamp in ms (UTC)
	"timestamp": 1697550860064,

	// the details of the event (string)
	"log": "user logging into the IBP console - local",

	// the details of the http request (if applicable)
	"http_details": "POST:/api/v2/auth/login",

	// the response to this http request (if applicable)
	"response_code": 200,

	// how long it took to process the http request
	"elapsed_ms": 604,

	// the redacted username of who did it
	"by": "d******a@something.com",

	// either "success" or "error"
	"status": "success",

	// a way to find this event when looking at the console's server logs (not unique)
	"tx_id": "asdf:RBmtK",

	// the unique id of this event
	"id": "dfe557ecf4bd3315972563629f09e72e",

	// the http header "user-agent" for this http request (if applicable)
	"user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/117.0"
}
```


### How to delete these logs

 You can't.
