# Auth Scheme APIs

## 1. Get the current auth scheme
- **Method**: GET
- **Route**: `/api/v1/authscheme`
- **Auth**: login session or recovery basic auth
- **Body**: n/a
- **Response**:
```js
// If "auth_scheme" is NOT "appid" it should only return the auth scheme
{
	"auth_scheme": "ibmid"
}

// If "auth_scheme" IS "appid" it should return the entire "app_id" object
{
	"auth_scheme": "appid",
	"admin_list":[   // legacy format - do not use in future
		"email" : "someone_else@email.com",
		"uuid": '67ca95d2de57f06da27be3c9fc00e865',
		"created": 1538651194801
	],
	"access_list":[  // legacy format - do not use in future
		"email" : "someone_else@email.com",
		"uuid": '67ca95d2de57f06da27be3c9fc00e865',
		"created": 1538651194801
	],
	"all_users": {
		"someone_else@email.com": {
			"uuid": '67ca95d2de57f06da27be3c9fc00e865',
			"created": 1538651194801,
			"roles": []
		}
	},
	"oauth_url": "http://oauth_url.com",
	"secret": "abcdef",
	"tenant_id": "tenant 1",
	"client_id": "client 1",
	"admin_contact_email":"some.poor.soul@us.ibm.com"
}
```

## 2. Change the current auth scheme settings
- **Method**: PUT
- **Route**: `/api/v1/authscheme`
- **Auth**: login session or recovery basic auth
- **Body**:
```js
{
	"auth_scheme": "appid",
	"oauth_url": "http://oauth_url.com",
	"secret": "abcdef",
	"tenant_id": "tenant 1",
	"client_id": "client 1",
	"admin_contact_email": "some.poor.soul@us.ibm.com"
}

// If `auth_scheme` is `reset` the auth scheme settings will reset
{
	"auth_scheme": "reset",
}
```
- **Response**:
```js
// If `auth_scheme` is `appid` the response should look like this:
{
	"message": "ok",
	"provider": "appid"
}

// If the `auth_scheme` is `ibmid` and the user tries to change it to `appid`
// the response should look like this:
"Your auth_scheme is 'ibmid'. You are not allowed to change it to 'appid'"
```

## 5. Edit a single field in the settings doc
Moved to [other_apis.md](./other_apis.md)
