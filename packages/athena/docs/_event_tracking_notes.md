# Event Tracking Notes

We have 3 types of things tracking events.
- [Notifications](#notice) - generates couch db files per event. useful for end users to debug/audit major events.
- [Segment](#seg) - metrics are sent to segment per event. useful for internal ibmers.
- [Activity Tracker](#at) - events are logged to a file. useful for end users to audit all activity.


<a name="notice"></a>

## Notifications
Notification docs are our local event tracking system for the end user.
It pre-dates the segment and activity tracker work and has sharper use case (historic debugging).

**What is tracked:**

Its tracks a smaller subset of http requests (not as vast as Activity Tracker).
It does not track events that fail input validation, but it will track other failures such as deployer or database errors.
It tracks all component, setting, user, apikey, system, and signature collection CRUD (except READ, there are no read operations that generate a notification doc as of 05/08/2020).

**How to track a new event:**

If a dev wants to generate a notification doc for a new type of event they need to use one of two methods from the `notification_lib.js`.
- `create()` - feed this function the complete notification structure and it will be created immediately
- `procrastinate()` - feed this function the initial details of a notification doc. the rest of the details will be filled in automatically when the http requests ends.

**What is in an event:**

See the response example in the [notification apis #1](./notification_apis.md) readme.

**How to view events:**

We have user level apis on OpTools to manage notifications.
See the [notification apis readme](./notification_apis.md).

<a name="seg"></a>

## Segment
Segment is tracking data for our internal metrics team.

**What is tracked:**

It gathers events from all requests related to component CRUD.
All apis that have a path that contains `/component` are tracked.

**How to track a new event:**

All http requests that fit the criteria above are automatically tracked.
A dev does not need to do anything.
The tracking lib is in our authentication scheme middleware (even for public/unprotected apis).

**What is in an event:**

Nothing good (example below is incomplete):

```js
{
	// string description of the event - "Created Object"
	"event": "<verb> Object",

	// passing our uuid
	"anonymousId": "<uuid here>",

	"properties": {
		// name of our data - hard coded
		"productTitle": 'Blockchain Platform v2',

		// IBM Cloud siid that owns this OpTools
		"tenantId": "<id>",

		// IBM Cloud account id that owns this OpTools
		"accountGuid": "<guid>",

		// the http route that was called - "/api/v2/components"
		"path": "<http path>",

		// IBM Cloud region IBP is using to host OpTools - "us-south"
		"meta.region": "<region>",

		// finer grain description of the event - "Created fabric-peer"
		"milestoneName": "<verb> <component type>"

		// component type "fabric-peer"
		"objectType": "<component type>"

		// crn string
		"object": "<crn string down to the resource>"
	},

	"context": {

		// the ip address of the client according to the http headers - "127.0.0.1"
		"ip": "<ip>",

		// details of the segment lib - hard coded values
		"library": {
			"name": 'ibp-segment',
			"version": 'v1'
		},

		"app": {

			// true if its a user api, false if its from the UI - "user-api" || "ui-api"
			"name": "<api type>",

			// the OpTools api version that was called - "v2" || "v1"
			"version": "<version>"
		}
	},

	// timestamp of the event
	"timestamp": new Date().toISOString()				// segment-> optional
}
```

**How to view events:**

Must be an ibmer, get access from our blockchain metrics team.

<a name="at"></a>

## Activity Tracker

Activity Tracker will be used to log events for the end user.
Events are http requests to the IBP console (certain ones).
The events are written to the file `activity.log` at the path specified by system setting `activity_tracker_path`.
See the [configuration options](../env/README.md#default) readme for more setting details.
The activity tracker file is rotated by athena's winston lib once it reaches 1MB.
LogDNA should pick up the file and make it available to the end user (somehow, details unclear to me).

**What is tracked:**

We have the ability to generate events for ALL http requests, but that seems excessive.
Only "important" events were chosen.
It doesn't matter if the api was successful or a failure, it will be tracked.
- All http requests that start with `/ak/api/` will generate an event. (thus all user apis)
- IBP console login and logout requests
- All IBP console requests for POST/PUT/PATCH/DELETE methods will generate an event except the ones hard coded in the `ignore_routes` variable (in `activity_tracker.js`). Which atm is these ones:
	- `'/api/v[123]/proxy'` - (general proxy route) too noisy
	- `'/grpcwp/*'` - (grpc web proxy route) too noisy
	- `'/configtxlator/*'` - the configtxlator proxy route is not very interesting
	- `'/api/v[123]/components/status'`, - too noisy
	- `'/api/v1/logs'`, - (client side logging route) too noisy

**How to track a new event:**

All http requests that fit the criteria above are automatically tracked.
A dev does not need to do anything.
The tracking lib is in our authentication scheme middleware (even for public/unprotected apis).

**What is in an event:**

The Activity Tracker structure is fixed, and pretty terrible.
There are a lot of fields in an event... and many contain duplicate information.
- [Activity Tracker Doc Spec](https://test.cloud.ibm.com/docs/services/Activity-Tracker-with-LogDNA?topic=logdnaat-ibm_event_fields)
```js
// a single example
{
	"action": "blockchain.notifications.delete",
	"correlationId": "?:UbrRh",
	"dataEvent": true,
	"id": "?:UbrRh",
	"initiator": {
		"id": "ibm@us.ibm.com",
		"name": "ibm@us.ibm.com",
		"typeURI": "service/security/account/user",
		"credential": {
			"type": "apikey"
		},
		"host": {
			"address": "169.1.1.1"
		}
	},
	"logSourceCRN": "crn:v1:bluemix:public:blockchain:us-south:a/e08f36b38fb6b618b48345054033eb22:dc6004c2-caf1-480b-a397-8ff3403e2eb4:undefined:0",
	"message": "blockchain: delete notifications",
	"requestData": {
		"originalUrl": "/ak/api/v2/notifications/purge"
	},
	"responseData": {
		"notifications": [
			{
				"message": "deleting all notifications",
				"by": "i**@us.ibm.com",
				"tx_id": "?:UbrRh",
				"api": "DELETE:/ak/api/v2/notifications/purge",
				"code": 200,
				"status": "success",
				"elapsed_ms": 468
			}
		]
	},
	"observer": {
		"name": "ActivityTracker"
	},
	"outcome": "success",
	"reason": {
		"reasonCode": 200,
		"reasonType": "OK"
	},
	"saveServiceCopy": true,
	"severity": "normal",
	"target": {
		"id": "crn:v1:bluemix:public:blockchain:us-south:a/e08f36b38fb6b618b48345054033eb22:dc6004c2-caf1-480b-a397-8ff3403e2eb4:bulk:",
		"name": "-",
		"typeURI": "blockchain/notifications"
	},
	"eventTime": "2020-05-08T19:57:35.97+0000",
	"level": "info"
}
```

**How to view events:**

Unknown atm.

**Client Side Events:**

Fabric operations that occur in the browser can be tracked by using [api #5](./logging_apis.md#client).
Athena will generate an event once the browser sends athena the details.
