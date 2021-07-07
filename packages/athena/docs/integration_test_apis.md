# Integration Test APIS

## 1. Open UI To Start Test
- **Method**: GET
- **Route**: `/ak/api/v1/integration_test`
- **Auth**: n/a
- **Body**: n/a
- **Response**: UI opens

- To open the UI the settings variable `integration_test_enabled` must be enabled. 

## 2. Run Integration Test
- **Method**: POST
- **Route**: `/ak/api/v1/integration_test`
- **Auth**: must have action `blockchain.components.create`
- **Body**:
```js
{
    "path": "env/test_dev.json",
    "print_docs": "y"
}
```
- **Response**:
```js
{
    "statusCode": 200,
    "msg": "finished running integration test",
    "errs": [{"err": "error object"}],
    "log_file_content": "string containing logs from all tests"
}
```
- `errs` array of error objects
- `log_file_content` each test appends its logs to the existing logfile(s)
