# User Preferences APIS

**None of these apis are in use today** - 06/27/2019 these were intended to manage user settings which we do not have atm.

## 1. Get user preferences
- **Method**: GET
- **Route**: `/api/v1/user/:user_id/preferences`
- **Auth**: tbd, no auth for now
- **Body**: n/a
- **Response**:
```js
// should return an object containing the user's preferences
{
    "_id": "someone@mail.com",
    "_rev": "12-e8a99f31f0926fb7f884b06e86df1da8",
    "email_notifications": "enabled",
    "auto_logout_interval": 2000,
    "preferences": {
        "color": "red",
        "car": "toyota",
        "phone": "iphone"
    },
    "timestamp": 1537560798462
}
```
- `user_id` is the db key and should be an email address
- `user_id` maps directly to `_id`
- `preferences` is an object of user defined preferences

## 2. Create or update user preferences
- **Method**: POST
- **Route**: `/api/v1/:user_id/preferences`
- **Auth**: tbd, no auth for now
- **Body**:
```js
// `_id` is the db key and should be an email address
{
	"_id": "someone_2@mail.com",
	"email_notifications": "enabled",
	"auto_logout_interval": 2000,
	"preferences": {
		"color": "green",
		"car": "toyota",
		"phone": "iphone"
	}
}
```
- `user_id` is the db key and should be an email address
- `user_id` maps directly to `_id`
- `preferences` is an object of user defined preferences

- **Response**:
```js
// The doc that was sent in is returned
{
    "_id": "someone_2@mail.com",
    "_rev": "29-f26a54ec4ff751981c4b25ad111b63e6",
    "email_notifications": "enabled",
    "timestamp": 1537620210898,
    "auto_logout_interval": 2000,
    "preferences": {
        "color": "green",
        "car": "toyota",
        "phone": "iphone"
    }
}
```
