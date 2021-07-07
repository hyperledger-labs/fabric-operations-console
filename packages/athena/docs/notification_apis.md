# Notifications
There are two types of notifications.
1. Webhooks - made with deployer webhook calls. see [deployer apis](deployer_apis.md) for details.
2. Other - generic notification. documented below.

### Notes
- notifications will not be built on input errors b/c the validation lib rejects the request before the notification is created.
	- this seems fine, activity tracker will still capture these events
- notifications will not be built if the deployer provision call fails.
	- this seems fine, for now

## 1. Get all notifications
This will return all notifications.
Use this api to paginate through notifications.
- **Method**: GET
- **Route**: `/api/v[123]/notifications?limit=100&skip=100`
- **Auth**: must have action `blockchain.optools.view`
- **Body**: n/a
- **Query Parameters**:
  - `limit` - the number of notifications to return, defaults 100
  - `skip` - the number of notifications to skip over (they do not count against `limit`)
  - `component_id` - filter notifications to only be about this component
- **Sort Order**: The order of the returned notifications:
	1. (first) Pending webhooks
		- The inner order of pending webhooks will likely be random
	2. Newest completed notifications (could be a webhook or other)
	3. (last) Oldest completed notification (could be a webhook or other)
- **Response**:
```js
{
  "total": 10,      // number of notifications in db (pre filter)
  "returning": 3,   // number of notifications returned (after filter)
  "notifications": [{  // this array is ordered, see `Sort Order` note above

    // basic fields for all notification types:
    "id": "12345",    // unique id for the notification
    "type": "webhook_tx" || "other",
    "status": "pending" || "error" || "success" // indicates the icon/color to use for the notification
    "message": "short message of the tx description + outcome", // message to show user
    "ts_display": 0,  // unix timestamp to display for the notification. integer, UTC

    // additional "webhook" fields (dne for "other" notifications):
    "on_step": 1,     // (provided if available) what step the tx is on
    "total_steps": 3, // (provided if available) how many steps this tx will take to complete
    "timeout_ms": 10000, // max time in milliseconds before athena should give up
    "ts_started": 0,      // unix timestamp of start of webhook. integer, UTC
    "ts_completed": 0,  // (provided if available) unix timestamp of webhook completion. integer, UTC

  ]}
}
```

## 2. Create a notification
This will create an "other" (generic) notification.
Note that most notifications will be generated automatically.
This API usefulness is tbd.
- **Method**: POST
- **Route**: `/api/v[123]/notifications`
- **Auth**: must have action `blockchain.notifications.manage`
- **Body**:
```js
{
	"status": "error" || "success" // indicates the icon/color to use for the notification
    "message": "some string to surface to a user", // message to pass to the user
	"ts_display": 0,     // unix timestamp to display for the notification. integer, UTC
	"by": "d******a@us.ibm.com", // string describing who did it
}
```
- **Response**:
```js
{
	"message": "ok",
	"id": "12345",    // unique id for the notification
}
```

## 3. Delete all notifications
This will delete all notifications including webhooks.
Intended for debug/admins.
- **Method**: DELETE
- **Route**: `/api/v[123]/notifications/purge`
- **Auth**: must have action `blockchain.notifications.manage`
- **Body**: `n/a`
- **Response**:
```js
{
	"message": "ok",
}
```

## 4. Archive notifications
This will archive one or many notifications from an array of notification ids.
Attempts will continue, even if something fails, so there could be only
partial success.
- **Method**: POST
- **Route**: `/api/v[23]/notifications/bulk`
- **Auth**: must have action `blockchain.notifications.manage`
- **Body**:
```js
{
    "notification_ids": []
}
```
- **Response**:
```js
{
	"message": "ok",
	"details": "archived 0 notification(s)"
}
```
