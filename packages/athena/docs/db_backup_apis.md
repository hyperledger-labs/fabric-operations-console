# Database Backup APIS

## 1. Start a database backup
Start a backup of all **OpTools** databases.
This api will return before the backup is done.
Use the get-backup-doc api to see the status of a backup.
- **Method**: POST
- **Route**: `/api/v[123]/backups` || `/ak/api/v[123]/backups`
- **Auth**: need `blockchain.optools.settings` action
- **Body**: `n/a`
- **Response**:
```js
{
	// static message
	"message": "in-progress",

	// this is the id of your backup
	"id": "03_ibp_db_backup_1592924104038",

	// the api url to read the backup doc
	"url": "http://localhost:3000/ak/api/v2/backups/03_ibp_db_backup_1592924104038"
}
```

## 2. Append data to a backup
Append data to an existing backup doc.
Use this api to append apollo or deployer backup data (such as the local storage data).
Fields are attached as is, so use encryption on your end if applicable.
- **Method**: PUT
- **Route**: `/api/v[123]/backups/:backup_id/attachments/:att_name` || `/ak/api/v[123]/backups/:backup_id/attachments/:att_name`
- **Auth**: need `blockchain.optools.settings` action
- **Body**:
```js
{
	// [required] string
	"attachment": "data here, hex or base 64 encoded is recommended"
}
```
- **Response**:
```js
{
	"message": "ok",
	"att_name": "my-attachment"
}
```

## 3. Start a database restore (by providing the backup data)
Start a restore of **OpTools** databases by providing the data to restore.
This api will return before the restore is done.
Use the webhook api to see the status of the restore.
Note: normally each doc in the backup data appears only once, but if it does appear multiple times the last one in the array will be the winning doc.
Also note - after a restore the component white list will be rebuilt.
- **Method**: PUT
- **Route**: `/api/v[123]/backups` || `/ak/api/v[123]/backups`
- **Auth**: need `blockchain.optools.settings` action
- **Query Params**:
	- `skip_system` - should be an array of doc ids that will NOT be restored to the system db. example: `skip_system=["00_settings_athena"]`
	- `skip_components` - should be an array of doc ids that will NOT be restored to the components db. example: `skip_components=["abcd"]`
- **Body**:
```js
{
	// [optional] the webhook url that will be received a POST when the restore is complete
	"client_webhook_url": "http://localhost:3000/ak/api/v1/webhooks/txs/nboqur"

	// [required] entire backup data here
	...
}
```
- **Response**:
```js
{
	// static message
	"message": "in-progress",

	// the webhook tx api, use this api to checkup on the status of the restore
	"url": "http://localhost:3000/ak/api/v1/webhooks/txs/nboqur"
}
```

## 4. Start a database restore (by providing the backup doc id)
Start a restore of **OpTools** databases by providing the id of a backup.
This api will return before the restore is done.
Use the webhook api to see the status of the restore.
Also note - after a restore the component white list will be rebuilt.
- **Method**: PUT
- **Route**: `/api/v[123]/backups/:backup_id` || `/ak/api/v[123]/backups/:backup_id`
- **Auth**: need `blockchain.optools.settings` action
- **Query Params**:
	- `skip_system` - should be an array of doc ids that will NOT be restored to the system db. example: `skip_system="['00_settings_athena']"`
	- `skip_components` - should be an array of doc ids that will NOT be restored to the components db. example: `skip_components="['abcd']"`
- **Body**:
```js
{
	// [optional] the webhook url that will be received a POST when the restore is complete
	"client_webhook_url": "http://localhost:3000/ak/api/v1/webhooks/txs/nboqur"

	// [required] entire backup data here
	...
}
```
- **Response**:
```js
{
	// static message
	"message": "in-progress",

	// the webhook tx api, use this api to checkup on the status of the restore
	"url": "http://localhost:3000/ak/api/v1/webhooks/txs/nboqur"
}
```

## 5. Get backup doc
Get the contents of a backup doc including attachments.
- **Method**: GET
- **Route**: `/api/v[123]/backups/:backup_id` || `/ak/api/v[123]/backups/:backup_id`
- **Auth**: need `blockchain.optools.settings` action
- **Body**: `n/a`
- **Response**:
```js
{
	// full doc here, quite large.
	// example:

	"id": "03_ibp_db_backup_1592922855871",
	"backup_version": "1.0.0",
	"ibp_versions": {
		"tag": "2.5.0-26"
	},
	"doc_count": 0,
	"dbs": {
		"athena_components": {
			"start_timestamp": 1592922855874,
			"finish_timestamp": 1592922856926,
			"last_sequence": "...",
			"docs": []
		},
		"athena_sessions": {
			"start_timestamp": 1592922857483,
			"finish_timestamp": 1592922858237,
			"last_sequence": "...",
			"docs": []
		},
		"athena_system": {
			"start_timestamp": 1592922858740,
			"finish_timestamp": 1592922861261,
			"last_sequence": "...",
			"docs": []
		}
	},
	"in_progress": false,
	"type": "athena_backup",
	"start_timestamp": 1592922838408,
	"end_timestamp": 1592922862177,
	"elapsed": "23.8 secs",
	"_attachments": {
		"my-attachment1": "YnVi",  // couchdb base 64 encodes these fields
		"my-attachment2": "eyJ0ZXN0IjoidGVzdCJ9" // couchdb base 64 encodes these fields
	}
}
```

## 6. Get all backup ids
Get the ids of all backup docs.
- **Method**: GET
- **Route**: `/api/v[123]/backups` || `/ak/api/v[123]/backups`
- **Auth**: need `blockchain.optools.settings` action
- **Body**: `n/a`
- **Response**:
```js
{
	"ids": ["03_ibp_db_backup_1592922855871"]
}
```
