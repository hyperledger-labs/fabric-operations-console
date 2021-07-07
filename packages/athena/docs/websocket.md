# Websocket
- Athena -> Apollo communication

Websockets are bi-directional, but we don't have a ws use case for apollo -> athena, yet.

### Background:

I would like the user to have two different ways of seeing notifications.
The first method is some panel where they can see historic notifications that they can paginate through.
They can go back many days and see the outcome of different webhook transactions for last week or w/e.
The user may restart their browser or athena and would still have the ability to see the same notifications.

The second method is a live notification that pops up on the UI informing the user that some transaction completed successfully *right now*.
If the user is not currently connected to athena (ie they closed their browser) they will miss the popup notification.
However the notification will be copied into the historic method and the user can discover the notification there.
Athena will **not** be tracking which live notifications were viewed or not.
I'm proposing this limitation to keep things manageable.
*I think adding this feature will be quite complicated when you get into the nitty gritty.*

**So this all boils down to two methods for notifications for apollo:**
1. Pull - use this for notifications that happened in the past
1. Push - use this for notifications that happen in real time


The pull notifications are outlined in the [notifications api](notifications_apis.md)

The push will be done with this websocket structure below:

## 1. Send webhook statuses
This type of message will be sent when a webhook is edited.
Typically this means it has progressed a step or completed.
- **Communication** - `websocket`
- **Scope** - message will be sent to all connected clients
- **Message Contents**:
```js
{
  "type": "webhook_tx", //
  "sub_type": null || "template", // indicates what type of websocket message this is
  "id": "<transactionId>", // notification id
  "status": "pending" || "error" || "success" || "undoing" // status of the transaction
  "message": "short message of the tx description + outcome", // message to show user
  "ts_display": 0,   // unix timestamp to display for the notification. integer, UTC
  "ts_started": 0,   // unix timestamp of start of webhook. integer, UTC
  "ts_completed": 0, // (provided if available) unix timestamp of webhook completion.
  "on_step": 1,      // (provided if available) what step the tx is on
  "total_steps": 3,  // (provided if available) how many steps this tx will take to complete
  "by": "d******a@us.ibm.com",  // the user that initiated the request
}
```

Initial libs under consideration: `websocket`, `socket.io`, `sockjs`, `ws` and `faye-websocket`.
`websocket` - large - 13MB, not that popular
`socket.io` - large, popular
`sockjs` - small, no updates in 1 year, has fallbacks, popular
`ws` - tiny, recent updates, no fallbacks, extremely popular
`faye-websocket` - small, no updates in 2 years, very popular
