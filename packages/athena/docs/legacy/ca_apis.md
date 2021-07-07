# CA APIS

## 1. Get all CA enroll IDs
- **Method**: POST
- **Route**: `/api/v1/cas/users/get`
- **Auth**: tbd, no auth for now
- **Body**:
```js
// this body will cause fabric to generate certs and keys and then enroll the user
{
	"api_url": "string",	// include protocol & port
	"ca_name": "string",
	"enroll_id": "string",
	"enroll_secret": "string"
}

// this body will use the certificate and key passed and bypass ca enrollment
{
	"api_url": "string",	// include protocol & port
	"ca_name": "string",
    "certificate": "string",
    "private_key": "string"
}
```
- **Response**:
```js
// array of identities with each identity having an array of attrs
[
    {
        "id": "admin",
        "type": "client",
        "affiliation": "org1",
        "attrs": [
            {
                "name": "hf.Registrar.Roles",
                "value": "client,user,peer"
            }
        ],
        "max_enrollments": -1
    }
]
```

## 2. Register a enroll ID
- **Method**: POST
- **Route**: `/api/v1/cas/users/register`
- **Auth**: tbd, no auth for now
- **Body**:
```js
// this body will cause fabric to generate certs and keys and then enroll the user
{
	"api_url": "string",		// include protocol & port
	"ca_name": "string",
	"enroll_id": "string",		// the existing id, becomes the parent of the new id
	"enroll_secret": "string",
	"new_enroll_id": "string",	// the id we are creating
	"new_enroll_secret": "string",
	"affiliation": "string",
	"attrs": [
		{
			"name": "attributeNameHere",
			"value": "1"
		}
	],
	"type": "string",	// [optional] "client", "app", "peer", "orderer", etc
	"max_enrollments": -1	// [optional] defaults to -1 for infinity
}

// this body will use the certificate and key passed and bypass ca enrollment
{
	"api_url": "string",		// include protocol & port
	"ca_name": "string",
	"new_enroll_id": "string",	// the id we are creating
	"new_enroll_secret": "string",
	"affiliation": "string",
	"attrs": [
		{
			"name": "attributeNameHere",
			"value": "1"
		}
	],
	"type": "string",	// [optional] "client", "app", "peer", "orderer", etc
	"max_enrollments": -1	// [optional] defaults to -1 for infinity,
    "certificate": "string",
    "private_key": "string"
}
```
- **Response**:
```js
// string representing the enroll secret of the registered ID
"string"
```

## 3. Get affiliations under an enroll id
- **Method**: POST
- **Route**: `/api/v1/cas/users/affiliations/get`
- **Auth**: tbd, no auth for now
- **Body**:
```js
// this body will cause fabric to generate certs and keys and then enroll the user
{
	"api_url": "string",	// include protocol & port
	"ca_name": "string",
	"enroll_id": "string",
	"enroll_secret": "string",
}

// this body will use the certificate and key passed and bypass ca enrollment
{
	"api_url": "string",	// include protocol & port
	"ca_name": "string",
    "certificate": "string",
    "private_key": "string"
}
```
- **Response**:
```js
// array of orgs, affiliated with the requesters ID, each containing
// the org name and an array of affiliations for that org
[
    {
        "name": "org1",
        "affiliations": [
            {
                "name": "org1.department1"
            },
            {
                "name": "org1.department2"
            }
        ]
    }
]
```

## 4. Get certificate and private key from CA
- **Method**: POST
- **Route**: `/api/v1/cas/cert/get`
- **Auth**: tbd, no auth for now
- **Body**:
```js
{
	"api_url": "string",	// include protocol & port
	"ca_name": "string",
	"enroll_id": "string",
	"enroll_secret": "string",
}
```
- **Response**:
```js
// ca_name/msp_id, enroll_id, certificate in PEM format, private key in PEM format
{
    "ca_name": "org1CA",
    "enroll_id": "admin",
    "certificate": "-----BEGIN CERTIFICATE-----\nfake-cert==\n-----END CERTIFICATE-----\n",
    "private_key": "-----BEGIN PRIVATE KEY-----\r\nfake-private-key\r\n-----END PRIVATE KEY-----\r\n"
}
```

## 5. Delete an enroll ID
- **Method**: POST
- **Route**: `/api/v1/cas/users/delete`
- **Auth**: tbd, no auth for now
- **Body**:
```js
// this body will cause fabric to generate certs and keys and then enroll the user
{
	"api_url": "string",	// include protocol & port
	"ca_name": "string",
	"enroll_id": "string",
	"enroll_secret": "string",
	"enroll_id_to_delete": "string"
}

// this body will use the certificate and key passed and bypass ca enrollment
{
	"api_url": "string",	// include protocol & port
	"ca_name": "string",
	"enroll_id_to_delete": "string",
	"certificate": "string",
	"private_key": "string"
}
```
- **Response**:
```js
	`successfully deleted the ID ${enroll_id_to_delete}`
```

## 6. Re-enroll a user
- **Method**: POST
- **Route**: `/api/v1/cas/users/reenroll`
- **Auth**: login session
- **Body**:
```js
// this body will cause fabric to re-enroll the user and generate new certs
{
	"api_url": "string",		// include protocol & port
	"ca_name": "string",
    "certificate": "string",
    "private_key": "string"
}
```
- **Response**:
```js
// object containing the new cert and server information
{
    "result": {
        "Cert": "string",
        "ServerInfo": {
            "CAName": "string",
            "CAChain": "string",
            "Version": ""
        }
    },
    "errors": [],
    "messages": [],
    "success": true
}
```
