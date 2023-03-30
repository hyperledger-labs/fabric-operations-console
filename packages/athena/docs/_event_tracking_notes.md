# Event Tracking Notes
(aka Audit Logs)

We have 3 types of things tracking events.
- [Notifications](#notice) - generates couchdb entries per event. useful for end users to debug/audit major events.
- [Segment](#seg) - *legacy* metrics were sent to segment per event.
- [Activity Tracker](#at) - events are logged to a file. useful for end users to audit most activity.


<a name="notice"></a>

## Notifications
Notification docs are our local event tracking system for the end user.
It pre-dates the segment and activity tracker work and has sharper use case (historic debugging).

**What is tracked:**

Its tracks a smaller subset of http requests (not as vast as activity tracker).
It does not track events that fail input validation, but it will track other failures such as deployer or database errors.
It tracks all component, setting, user, apikey, system, and signature collection CRUD (except READ, there are no read operations that generate a notification doc as of 05/08/2020).

**How to track a new event:**

If a dev wants to generate a notification doc for a new type of event they need to use one of two methods from the `notification_lib.js`.
- `create()` - feed this function the complete notification structure and it will be created immediately
- `procrastinate()` - feed this function the initial details of a notification doc. the rest of the details will be filled in automatically when the http requests ends.

**What is in an event:**

See the response example in the [notification APIs #1](./notification_apis.md) readme.

**How to view events:**

We have user level APIs on OpTools to manage notifications.
See the [notification APIs readme](./notification_apis.md).

<a name="seg"></a>

## Segment
Segment was event tracking data for the IBM internal metrics team. **These logs were discontinued in July 2021.**

The console still has code related to segment, but no segment events are sent/recorded/logged.


<a name="at"></a>

## Activity Tracker Logs

Events are triggered from http requests to the Console (not all requests, see below).
The events are written to the file `audit.log` in the [./packages/athena/logs/](../logs) folder, the setting `activity_tracker_filename` can be used to change the filename.
See the [configuration options](../env/README.md#default) readme for more setting details.
The log file is rotated by athena's winston lib once it reaches 2MB, up to 5 files.
Meaning if 6MB of logging was generated, you would see the 3 files each with 2MB of data, named: `audit.log`, `audit1.log` and `audit2.log`.

Note that since the logging is using the pod's filesystem all activity logs are wiped/reset when a pod restarts.

You can easily see if activity tracker is enabled by finding the server side log during startup:

- `[event tracker] enabled logging for activity tracker`
- `[event tracker] disabled logging for activity tracker`

**What is tracked:**

In an effort to not overwhelm the logs, only "important" events are added to the log.
- All http requests that start with `/ak/api/` will generate an event. (this covers all APIs that used an api key, bearer token or basic auth)
- Console login and logouts
- All component creation/deletion/updates
- Http requests that access the logs
- Some Fabric operations like creating channels, joining channels, install/instantiate chaincode
	- a complete list is not available
- In general all console http requests with POST/PUT/PATCH/DELETE methods will generate an event except ones hard coded in the `ignore_routes` variable (in `activity_tracker.js`). Which as of 03/2023 is:
	- `'/api/v[123]/proxy'` - (general proxy route used for comms with Peers and CAs) - **these are opaque calls & too noisy**
	- `'/grpcwp/*'` - (grpc web proxy route used for comms with Orderers) - **these are opaque calls & too noisy**
	- `'/configtxlator/*'` - (used to transform data) - **large & not interesting**
	- `'/api/v[123]/components/status'` - component status calls are often - **too noisy**
	- `'/api/v1/logs'` - (client side logging route) - **too noisy**

**How to track a new event:**

A dev working on the console does not need to add anything to log new events from new server side http requests.
All http requests that fit the criteria above are automatically logged.
The logic for this is in our authentication scheme middleware (though it also works over public/unprotected APIs).

If you need to add events the are from front end Fabric activity, see details below and if you are not a dev open an issue.

- client side Fabric operations (ones that occur in the browser) can be tracked by using [api #5](./logging_apis.md#client).

**What is in an event:**

Below is an example, note that white space has been added here to make it easier to read.
The real logs will have each event on 1 line.

```js
// a single event - example
{
	// UTC date/time of the event
	"eventTime": "2023/03/30-13:13:34.743Z",

	// type
	"type": "http", // indicates this is an event from an http request

	// the iam action that was validated for this request
	"action": "console.general.read",

	// a random id for the tx, same id appears in the server logs
	"id": "FQcZ:jIGUB",

	// minimal auth data
	"creds": {

		// the uuid of the identity that sent the req
		"uuid": "36150104-69d8-448d-a2e5-229311e427de",

		// the identity's username
		"name": "dshuffma",

		// type of auth that was provided in the req. options:
		// token - bearer token
		// apikey - api key
		// basic - basic auth username/password
		// user - cookie auth (session)
		"type": "user"
	},

	// origin of the request, usually an ip of the client according to the http headers.
	// depending on how proxies in front of the console are configured this may only
	// show the proxy's IP and not the user. correctly configured proxies will set the client ip
	// in a header that will be available here.
	"address": "localhost",

	// minimal details of the request
	"req": {
		"method": "GET",
		"path": "/api/v1/logs/audit.log"
	},

	// minimal details of response
	"res": {
		"statusCode": 200,

		// occasionally extra details are provided, content depends on the event
		"client_details": {},
	},

	// says "success" if the http status code indicates a success (codes 0-399)
	// else "failure" (codes 400+)
	"outcome": "success",

	// all events are at "debug"
	"level": "debug"
}
```

**How to view events:**

From your console's homepage, change the path in your browser to `/api/v3/logs`.
Click the `audit.log` link to view the file in your browser.
Note that you are only viewing events from an individual console pod, if you have multiple, you will need to round robin through the other pods to get each file.
