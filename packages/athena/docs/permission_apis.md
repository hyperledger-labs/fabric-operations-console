# Permissions APIs (API Keys and Users)

## IBP Console Route Differences

The apis that start with **/api/v[123]/** expect a **login session** to authenticate (regardless of auth scheme).

The apis that start with **/ak/api/v[123]/** expect **basic auth headers** to authenticate when using an [auth scheme](./README.md#auth-schemes-explained) of `couchdb`. Otherwise they expect a **bearer token** header.

- if using **basic auth** and an **api key**: the api `key` is the `username`, and the `secret` is the `password`
  - this type of `username` is case sensitive
- if using **basic auth** and your **username**: your `username` is the `username`, and your `password` is the `password`...
  - this type of `username` is not case sensitive (which is the same behavior seen during login w/this username)
  - it is not recommended to use this method for long. users should use it once to generate an api key and then use the api key from then on. that will limit exposure of your personal credentials.
  - users cannot use a username with the default password to authenticate on these APIs. change your password via the UI first.

***

## Automation Help

If you want to automate APIs on a brand new IBP console **software** build you will need to create an IBP API key using the initial user.

- The `initial_admin` and `default_user_password_initial` settings should have been set in the [configuration file](../env/README.md#config) prior to starting IBP console. When IBP console starts for the first time it will create a user where the username is the value of the `initial_admin` setting and a password using the value of the `default_user_password_initial` setting. This user will be created with all roles (`manager`, `writer`, `reader`).
- All you have to do is create the key using the create-an-api-key API (#1 below).
	- Route: `/ak/api/v3/permissions/keys`.
	- Auth: Set basic auth for `initial_admin` and `default_user_password_initial`
	- Body: set the roles you want for this key. Details are in API #1 below.
	- Store the response of this api in a safe place, the api secret is unrecoverable
		```js
			// example response
			{
				"api_key": "khnJmwqc3_xbnPp8",
				"api_secret": "Y1oNEz37ZMpNlByHVN4OB5ly6VwzL43C",
				"roles": ["writer", "manager"],
				"message": "ok"
			}
		```
	- note that this is the only API that works with the default password (at least thats the intent...).
- ONce you have an `api_key` and `api_secret` you can authenticate to any `/ak/api/` route using basic auth where the username is the `api_key` and the password is `api_secret`. Congratulations 🎈.

***

## 1. Create an api key
This API is intended for **software** only (saas must use IAM for api keys).
It will create a new api key & secret.
These api keys can be used by end users to perform various athena APIs programmatically.

Note that the `api_secret` returned in the response will not be recoverable ever again.
Thus the end user **must** record it externally.
- **Method**: POST
- **Route**: `/api/v[123]/permissions/keys` || `/ak/api/v[123]/permissions/keys`
- **Auth**: Must have action `blockchain.api_keys.manage`
- **Body**:
```js
{
    // [required] only these strings are allowed, at least 1 is required
    "roles": ["reader", "writer", "manager"],

    // [optional]
    "description": "spider man's key"
}
```
- **Response**:
```js
{
    "api_key": "string",
    "api_secret": "string", // [warning] the api_secret will be unrecoverable, save it
    "roles": ["<role>"],
    "message": "ok"
}
```

## 1b. Create a access token (aka bearer token)
This API is intended for **software** only (saas must use IAM api keys).
It will create a bearer token from an "api key" which is actually the user's username and password concatenated with a colon.
These access tokens can be used by end users to perform various athena APIs programmatically.

Note that the `access_token` will expire in 1 hour with the default settings.

This does not currently work with an ldap login (dsh todo).
- **Method**: POST
- **Route**: `/api/v3/identity/token` || `/ak/api/v3/identity/token`
- **Auth**: Must have action `blockchain.api_keys.manage`
- **Body**:
```js
// -------------------------------------------
// [option 1] - JSON body - (see option 2 below...)
// -------------------------------------------
{
    // [required] "apikey" - set your username + colon + password
    "apikey": "username:password",

    // [optional]
    // defaults to 'urn:ibm:params:oauth:grant-type:apikey'
    // dsh this is currently unused but included to match the standard IAM signature
    "grant_type": "urn:ibm:params:oauth:grant-type:apikey",

    // [optional] only these strings are allowed
    // defaults to the same roles the user has
    "roles": ["reader", "writer", "manager"],

    // [optional] how long this key is good for (max is 1 month)
    // defaults: 3600 (which is 1 hour)
    "expiration_secs": 3600
}

// -------------------------------------------
// [option 2] - form-urlencoded body
// You can also pass a form-urlencoded body instead of json!
// (this is identical to the IBM Cloud IAM body)
// -------------------------------------------
- 'apikey=username:password',
- 'grant_type=urn:ibm:params:oauth:grant-type:apikey',
- 'expiration_secs=3600'

```
- **Response**:
```js
{
    "access_token": "string",
    "refresh_token": "not_supported",
    "token_type": "Bearer",
    "expires_in": 3600,
    "expiration": 1614282971,
    "scope": "ibp bearer",
    "roles": ["<role>"],
    "message": "ok"
}
```

## 2. Get all api keys
This API is intended for **software** only (saas must use IAM for api keys).
Return all valid api keys and their attribute data.
The `api_secret` attributes will not/cannot be returned.
- **Method**: GET
- **Route**: `/api/v[123]/permissions/keys` || `/ak/api/v[123]/permissions/keys`
- **Auth**: Must have action `blockchain.optools.view`
- **Body**: n/a
- **Response**:
```js
{
    "message": "ok"
    "keys": [
       {
           "api_key": "string",
           "roles": ["<role>"],
            "ts_created": number,
            "description": "user defined string here"
        },
        {
             "api_key": "string",
             "roles": ["<role>"],
             "ts_created": number,
             "description": "user defined string here"
        }
    ]
}
```

## 3. Delete an api key
This API is intended for **software** only (saas must use IAM for api keys).
Invalidate a key by deleting its doc in the db.
- **Method**: DELETE
- **Route**: `/api/v[123]/permissions/keys/:api_key` || `/ak/api/v[123]/permissions/keys/:api_key`
- **Auth**: Must have action `blockchain.api_keys.manage`
- **Body**: n/a
- **Response**:
```js
{
   "message": "ok",
   "deleted": "<api_key here>",
}

```

## 4. Delete an access token
This API is intended for **software** only.
Invalidate an access token by deleting its doc in the db.
- **Method**: DELETE
- **Route**: `/api/v3/identity/token/:id` || `/ak/api/v3/identity/token/:id`
- **Auth**: Must have action `blockchain.api_keys.manage`
- **Body**: n/a
- **Response**:
```js
{
   "message": "ok",
   "deleted": "<access token here>",
}

```

## 5. Get access token details
This API is intended for **software** only.
Get the details of an access token (like who made it, and how much time is left).
If the token doc in the db is deleted this will return a 404.

- **Method**: POST
- **Route**: `/api/v3/identity/token/:id` || `/ak/api/v3/identity/token/:id`
- **Auth**: Must have action `blockchain.api_keys.manage`
- **Body**: n/a
- **Response**:
```js
{
    "access_token": "string",
    "roles": ["<role>"],
    "creation": 1614282971,
    "expiration": 1614282971,
    "time_left": "0 secs",
    "created_by": "dshuffma@us.ibm.com",
}
```

***

## 4. Add users
Create a user for the UI.
The API will register a users by a **username**.
The username is often an email address but it could be any unique string.
This API is intended for software only (saas must use IAM).

- Usernames are always brought to lowercase (will not error).
- All users to add should not already exist (will error and abort the api).
- Usernames cannot contain these characters: `<`, `>`, or `:` (will error and abort the api).
	- Usernames cannot contain the colon character because it would create impossible credentials for basic auth
- Username lengths must be >= the setting `min_username_len` and <= the setting `max_username_len` (will error and abort the api).
	- Check the [configuration readme](../env/README.md#Default-Settings-File) for default values.
- If 1 username encounter an error, no usernames get created.
- The setting `default_user_password` will be the user's initial password. They will need to change their password on login.

For compatibility reasons with other auth schemes the user's `name` attribute (seen in some apis) gets derived from their `username`.
If `username` is an email then `name` is the first 20 chars before the `@` symbol.
Else `name` is the first 20 chars.

- **Method**: POST
- **Route**: `/api/v[123]/permissions/users` || `/ak/api/v[123]/permissions/users`
- **Auth**: Must have action `blockchain.users.manage`
- **Body**:
```js
{
  "users": {
    "someone@mail.com": {
          "roles": ["reader", "writer", "manager"]  // only these values are allowed, at least 1
    },
    "someone_else@mail.com":{
          "roles": ["reader", "writer"]
    }
  }
}
```
- **Response**:
```js
{
    "message": "ok"
}
```

## 5. Delete users
This API is intended for software only (saas must use IAM).
Delete users by their **uuid**.

It's recommended to run the "Delete all sessions" api after deleting a user.
It will kick out logged in users and force everyone to login, which recently removed users will be unable to do.
- **Method**: DELETE
- **Route**: `/api/v[23]/permissions/users` || `/ak/api/v[23]/permissions/users`
- **Auth**: Must have action `blockchain.users.manage`
- **Query Params**:
	- `uuids` - [required] set to an array of uuids. example:
		```
			?uuids=["b26e67a3-8f4c-40e4-b5e2-6303ad2979fc", "19bd26a0-6053-491d-ada3-ad5bb741f034"]`
		```
	- note: you cannot delete yourself via the UI. meaning if you are logged into the UI and try to delete your own user via the UI, it will fail.
- **Body**: n/a
- **Response**:
```js
{
    "message": "ok",
    "uuids": [
        "b26e67a3-8f4c-40e4-b5e2-6303ad2979fc",
        "19bd26a0-6053-491d-ada3-ad5bb741f034"
     ]
}
```

## 6. Edit users
This API is intended for software only (saas must use IAM).
Edit users' roles by providing their **uuid** and their **new set** of roles.
All users should already exist.
- **Method**: PUT
- **Route**: `/api/v[123]/permissions/users` || `/ak/api/v[123]/permissions/users`
- **Auth**: Must have action `blockchain.users.manage`
- **Body**:
```js
{
  "uuids": {

    // internal uuid for the user
    "b26e67a3-8f4c-40e4-b5e2-6303ad2979fc": {

          // set of desired roles for this user
          // must set at least 1 role
          "roles": ["reader", "writer", "manager"],
    },

    "19bd26a0-6053-491d-ada3-ad5bb741f034":{
          "roles": ["reader", "writer"],
    }
  }
}
```
- **Response**:
```js
{
    "message": "ok",
    "uuids": [
        "b26e67a3-8f4c-40e4-b5e2-6303ad2979fc",
        "19bd26a0-6053-491d-ada3-ad5bb741f034"
     ]
}
```

## 7. List users
This API is intended for software only (saas must use IAM for api keys).
List all users, their roles, username and date created.
- **Method**: GET
- **Route**: `/api/v[123]/permissions/users` || `/ak/api/v[123]/permissions/users`
- **Auth**: Must have action `blockchain.optools.view`
- **Body**: `n/a`
- **Response**:
```js
{
  "users": {

    // internal uuid for the user
    "b26e67a3-8f4c-40e4-b5e2-6303ad2979fc": {

          // for legacy issues this says 'email' instead of 'username'
          "email": "someone@ibm.com",

          // only these role values are allowed (1+ values required)
          "roles": ["reader", "writer", "manager"],

          // unix timestamp user was created
          "created": 1549399430927
    },

    "19bd26a0-6053-491d-ada3-ad5bb741f034":{
          "email": "someone_else@ibm.com",
          "roles": ["reader", "writer"],
          "created": 1549399430927
    }
  }
}
```

## 8. Change password
This API is intended for software only (saas can use IBM ID).
It only works when auth scheme is set to `couchdb`.
User must be logged in to edit their password.

The new password's length must be >= the setting `min_password_len` and <= the setting `max_password_len`.
Check the [configuration readme](../env/README.md#Default-Settings-File) for default values.

- **Method**: PUT
- **Route**: `/api/v[123]/permissions/users/password`
- **Auth**: login session, can only edit self
- **Body**:
```js
{
   // current password for email/user
  "pass": "123456789"

   // new password for email/user
   // minimum length of 8 characters
  "desired_pass": "123456789"
}

```
- **Response**:
```js
{
	"message": "ok",
	"details": "password updated"
}
```

## 9. Login via password
This API is intended for software only (saas can use IBM ID).
It only works when auth scheme is set to `couchdb`.
If a user does not have a password yet, they should enter the value of `default_user_password` setting.
- **Method**: POST
- **Route**: `/api/v[123]/auth/login`
- **Auth**: n/a
- **Body**:
```js
{
  // email address / username
  "email": "dshuffma@us.ibm.com",

  // current password for email/user
  "pass": "12345678"
}

```
- **Response**:
```js
// if success:
{
	"message": "ok",
	"name": "dshuffma",
	"email": "dshuffma@us.ibm.com"
}

// if failure:
{
	"statusCode": 401,
	"msg": "Unauthorized",
}
```

## 10. Reset password
This API is intended for software only (saas can use IBM ID).
It only works when auth scheme is set to `couchdb`.
This is intended for a user with the `manager` role to reset **another** user's password.
It is not for a user to reset their own password.
The password will reset to the value of the `default_user_password` setting.
- **Method**: PUT
- **Route**: `/api/v[123]/permissions/users/password/reset` || `/ak/api/v[123]/permissions/users/password/reset`
- **Auth**: Must have action `blockchain.users.manage`
- **Body**:
```js
{
  "uuids": [
    // internal uuid for the user
    "b26e67a3-8f4c-40e4-b5e2-6303ad2979fc",

    // internal uuid for the user
    "19bd26a0-6053-491d-ada3-ad5bb741f034",
  ]
}
```
- **Response**:
```js
{
	"message": "ok",
	"uuids": [
        "b26e67a3-8f4c-40e4-b5e2-6303ad2979fc",
        "19bd26a0-6053-491d-ada3-ad5bb741f034"
     ]
}
```

## 11. Get User Info
This api returns data about the current user based on his session and a few settings for the IBP console.
If there is no session, the user related fields will be empty.

dsh todo - we should remove fields common to the GET settings api.

- **Method**: GET
- **Route**: `/api/v[123]/users/info` || `/ak/api/v[123]/users/info`
- **Auth**: must be logged in
- **Body**: n/a
- **Response**:
```js
{
	"statusCode": 202,
	"logged": true,  // true if they have a session
	"authorized_actions": [],  // actions this account can do
	"loggedInAs": {
		"name": "David Huffman",  // user's name
		"email": "dshuffma@us.ibm.com" // users full email address (or api key)
	},
	"censoredEmail": "d******a@us.ibm.com",  // what the user's censored email address (or api key) looks like
	"uuid": "fcdf1e1d-8990-4bd2-80a0-37ed5dbb40ed",
	"session_id": "abcd", // the first 6 characters of the session's id
	"crn_string": "crn:v1:staging:public:blockchain:us-south:a/df663f1351e50279adcc6be42918ae07:92cf53bf-1e18-460e-9cd6-0028a820c024::",
	"crn": {
		"version": "v1",
		"c_name": "staging",
		"c_type": "public",
		"service_name": "blockchain",
		"location": "us-south",
		"account_id": "a/df663f1351e50279adcc6be42918ae07",
		"instance_id": "92cf53bf-1e18-460e-9cd6-0028a820c024",
		"resource_type": "",
		"resource_id": ""
	},
	"session_expiration_ts": 1556738806648, // unix timestamp of expiration, in ms, utc
	"session_expires_in_ms":2773627,  // time in ms till expiration
	"password_type": "default" || "custom" // is set to "default" if user used the default password to login
}
```
