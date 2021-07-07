## Webhook APIs:
Its been 10 months and 0 webhook based APIs have been created between athena and deployer.
Thus I've removed most of these apis to reduce confusion and dead code.
The only code that is remaining is used by the template functionality.

<a name="webhookStatus"></a>

## 1. Get a webhook status doc
This will show the details of a particular webhook doc.
- **Method**: GET
- **Route**: `/api/v1/webhooks/txs/:transactionId` || `/ak/api/v1/webhooks/txs/:transactionId`
- **Auth**: must have action `blockchain.optools.view`
- **Body**: n/a
- **Response**:
```js
{
	// the last message in the array is commenting on the conclusion of the previous step
	// (the current step is still in progress)
	// the ui should display the last msg in the array to the user
	"athena_messages": ["template finished successfully"],

	// username of the user who created this transaction
	"by": "d******a@us.ibm.com",

	// user id of the user who created this transaction
	"uuid": "asdf",

	// where the webhook should post to when complete
	"client_webhook_url": "http://localhost:3000",

	// (optional) brief description of the transaction
	"description": "building a template request",

	// internal, ignore - dsh todo remove this
	"notes": [],

	// the current step that is in progress, it is not done
	"on_step": 9,

	// the total steps to finish the transaction
	"total_steps": 9,

	// details of submitted template here
	// only available for a template webhook
	"original_template": {},

	// details of resolved/processed template here
	// only available for a template webhook
	"processed_template": {},

	// the current status of the transaction
	// possible values:  "pending" || "error" || "success" || "undoing"
	"status": "success",

	// what type of webhook this doc is
	"sub_type": "template",

	// what type of doc it is
	"type": "webhook_tx",

	// utc unix timestamp of when the tx completed (error or success)
	"ts_completed": 1561577057962,

	// utc unix timestamp of when the tx started
	"ts_started": 1561576971782,

	// unique id to track this transaction
	"tx_id": "tntpwrrntdca",

	// internal for template webhooks - component docs of each built thing in the template
	// only available for a template webhook
	"built": {}

	// internal - used for tracking template channel building progress
	"channel_work":{

		// array of MSP IDs that have been added to the consortium
		// (the build-template api will init this to [])
		"added2consortium": ["PeerOrg1"],

		// object that holds channel creation progress (for a template)
		// (the build-template api will init this to null)
		"channels": {

			// name of the channel that has progress
			"defaultChannel": {

				// unix timestamp, utc, ms of channel creation
				"created": 1574364127803,

				// array of peer ids that have joined the channel
				"peers_joined": ["peer1"]
			}
		},

		// status for channel work
		// "waiting" || "in-progress" || "error" || "success"
		// (the build-template api will init this to "waiting")
		"status": "success",
	}
}
```

<a name="allWebhooks"></a>

## 2. Get all webhook statuses
This will return all webhooks.
- **Method**: GET
- **Route**: `/api/v1/webhooks?limit=100&skip=100` || `/ak/api/v1/webhooks`
- **Auth**: must have action `blockchain.optools.view`
- **Body**: n/a
- **Query Parameters**:
  - `limit` - the number of webhooks to return, defaults 100
  - `skip` - the number of webhooks to skip over (they do not count against `limit`)
    - docs are sorted where pending is first then timestamp completed is newest -> oldest
- **Response**:
```js
{
  "total": 10,    // number of total docs in the view
  "matches": 3,   // number of results returned
  "webhooks": [{
    // same object described in response of api #2 Get a webhook status doc
  ]}
}
```

## 3. Get all template webhooks
This will return all template webhooks. Pending and completed.
- **Method**: GET
- **Route**: `/api/v1/webhooks/templates` || `/ak/api/v1/webhooks/templates`
- **Auth**: must have action `blockchain.optools.view`
- **Body**: n/a
- **Response**:
```js
{
	"template_webhooks": [

		// object, 1 per template tx
		{
			// the last message in the array is commenting on the conclusion of the previous step
			// (the current step is still in progress)
			// the ui should display the last msg in the array to the user
			"athena_messages": ["template finished successfully"],

			// username of the user who created this transaction
			"by": "d******a@us.ibm.com",

			// user id of the user who created this transaction
			"uuid": "asdf",

			// where the webhook should post to when complete
			"client_webhook_url": "http://localhost:3000",

			// (optional) brief description of the transaction
			"description": "building a template request",

			// internal, ignore - dsh todo remove this
			"notes": [],

			// the current step that is in progress, it is not done
			"on_step": 9,

			// the total steps to finish the transaction
			"total_steps": 9,

			// details of submitted template here
			"original_template": {},

			// details of resolved/processed template here
			"processed_template": {},

			// the current status of the transaction
			// possible values:  "pending" || "error" || "success" || "undoing"
			"status": "success",

			// what type of webhook this doc is
			"sub_type": "template",

			// what type of doc it is
			"type": "webhook_tx",

			// utc unix timestamp of when the tx completed (error or success)
			"ts_completed": 1561577057962,

			// utc unix timestamp of when the tx started
			"ts_started": 1561576971782,

			// unique id to track this transaction
			"tx_id": "tntpwrrntdca",

			// internal for template webhooks - component docs of each built thing in the template
			"built": {}

			// internal - used for tracking template channel building progress
			"channel_work":{

				// array of MSP IDs that have been added to the consortium
				// (the build-template api will init this to [])
				"added2consortium": ["PeerOrg1"],

				// object that holds channel creation progress (for a template)
				// (the build-template api will init this to null)
				"channels": {

					// name of the channel that has progress
					"defaultChannel": {

						// unix timestamp, utc, ms of channel creation
						"created": 1574364127803,

						// array of peer ids that have joined the channel
						"peers_joined": ["peer1"]
					}
				},

				// status for channel work
				// "waiting" || "in-progress" || "error" || "success"
				// (the build-template api will init this to "waiting")
				"status": "success",
			}
		}
	]
}
```

## 4. Update webhook status
The template lib is the only client that uses the function behind this api.

- **Method**: PUT
- **Route**: `/api/v1/webhooks/txs/:tx_id`
- **Auth**: basic auth (auth can be found in the initiating webhook request)
- **Body**:
```js
{
  // "pending" || "error" || "success" || "undoing"
  "status": "success",

  // latest msg to display to user, should describe the CURRENT on_step
  "athena_msg": "created a peer"

  // (optional) briefly describe the transaction
  "description": "building a template",

  // (optional) provide the step that is currently in progress
  "on_step": 2,

  // (optional) provide the total steps for this transaction if available, else field dne
  "total_steps": 3,

  // (optional) username of who created this transaction
  "by": "dshuffma@us.ibm.com",

  // (optional) - the template data that was sent by the user
  "original_template": {},

  // (optional) - the template data that has been processed and formated by athena
  "processed_template": {},

  // (optional) - the amount of time in ms to give the current step
  "timeout_ms" : 60000,

   // legacy - (optional) use "note" to pass custom data into the webhook doc
   // each update with a note will be pushed into an array, "notes"
   // - dsh todo remove this
  "note": "anything can go here",

  // internal - used for tracking template channel building progress
  "channel_work":{

    // (optional) - array of MSP IDs that have been added to the consortium
    // (if provided will replace exiting array)
    "added2consortium": ["PeerOrg1"],

    // (optional) - object that holds channel creation progress (for a template)
    "channels": {

      // (optional) name of the channel that has progress
      // (if provided will replace exiting channel object)
      "defaultChannel": {}
    },

    // status for channel work
    // "waiting" || "in-progress" || "error" || "success"
    // (if provided will replace exiting value)
    "status": "success",
  }
}
```
- **Response**:
```js
{
  "message": "ok",
  "tx_id": "123456",   // echo back transaction id
}
```
