# Fabric Key APIS
To my knowledge these apis are unused - 10/21/2019 - dsh.

These apis were intended to allow a user to store and retrieve fabric private/public key information in the server's db.
Doing so would require trusting the host of Athena (not recommended), but it is more flexible since the key would be available to all logged in users.

If you are looking for **API KEY** related APIs... those are in the [permission_apis.md](./permission_apis.md) file.

## 1. Store a key
Store a private and pubic key doc for a user.
The `private_key` field will be encrypted as a `aes-256-ctr` hex string in the database.

- **Method**: POST
- **Route**: `/api/v1/keys?skip_cache=yes` (note `skip_cache` requires the string `yes` to bypass the cache)
- **Auth**: login session
- **Body**:
```js
{
   "name": "<user defined name for the key>", // [optional] does not need to be unique
   "private_key": "<encrypted string>",       // [required]
   "public_key": "<base 64 encoded string>",  // [optional]
}
```
- **Response**:
```js
{
 "message": "ok",
 "uuid": "<uuid here>",
 "name": "<user defined name for the key>"   // omitted if field in body was not present
}
```

## 2. Get all user keys
Get all of the user's private and pubic key docs.
Only returns keys for the current user (based on session).
The `private_key` field will be returned decrypted.

- **Method**: GET
- **Route**: `/api/v1/keys?skip_cache=yes` (note `skip_cache` requires the string `yes` to bypass the cache)
- **Auth**: login session
- **Body**: N/A
- **Response**:
```js
{
	"keys": {
		"<id1>": {
			"name": "<user defined name for the key>",
			"private_key": "<encrypted string>",
			"public_key": "<base 64 encoded string>",
		  },
		 "<id2>": {}
	}
}
```

## 3. Edit a key
Edit the name or pub/priv value of a key doc.
Only works on keys for the current user (based on session).

- **Method**: PUT
- **Route**: `/api/v1/keys/:key_id?skip_cache=yes` (note `skip_cache` requires the string `yes` to bypass the cache)
- **Auth**: login session
- **Body**:
```js
// all fields are optional on the edit
{
   "name": "<user defined name for the key>", // [optional] does not need to be unique
   "private_key": "<encrypted string>",       // [optional]
   "public_key": "<base 64 encoded string>",  // [optional]
}
```
- **Response**:
```js
{
 "message": "ok",
 "uuid": "<uuid here>",
 "name": "<user defined name for the key>"   // omitted if field in body was not present
}
```

## 4. Delete a key
Delete a user's key.doc
Only works on keys for the current user (based on session).

- **Method**: DELETE
- **Route**: `/api/v1/keys/:key_id`
- **Auth**: login session
- **Body**: n/a
- **Response**:
```js
{
    "message": "ok",
    "name": "<user defined name for the key>"
}
```
