# Performance (debug host machine)

Use these apis to figure out if there are performance issues on the host machine.
They require the `reader` role to prevent spam/dos.

The tests use a `GET` method so they can be _manually_ triggered from a browser (I'm breaking restful conventions on purpose).

## 1. Static String
Return a small static string.
Minimal cpu/memory.
This does not stress anything, more of a sanity check.

- **Method**: GET
- **Route**: `/api/v[23]/performance/1` || `/ak/api/v[23]/performance/1`
- **Auth**: Must have action `blockchain.optools.view`
- **Body**: n/a
- **Response**:
```js
{
	"test": "Static string",
	"start": 1585769479894,
	"text": "<latin>",
	"end": 1585769479894,
	"backend_elapsed_ms": 0  // expected duration is 0-1ms
}
```

## 2. Random String
Return a random crypto string of desired size.
Stresses cpu/memory & network if size is large enough.

- **Method**: GET
- **Route**: `/api/v[23]/performance/2/:char_len?` || `/ak/api/v[23]/performance/2/:char_len?`
- **Auth**: Must have action `blockchain.optools.view`
- **Body**: n/a
- **Parameters**:
	- `char_len` in url is optional. defaults to 256,000 characters
- **Response**:
```js
{
	"test": "Random string",
	"start": 1585769612278,
	"char_len": 256000,
	"text": "<random string of length char_len>",
	"end": 1585769612278,
	"backend_elapsed_ms": 0   // expected duration is 0-10ms for 256,000 characters
}
```

## 3. Random Sorted String
Return a random crypto string of desired size that is alpha sorted.
Stresses cpu/memory much more than the network.

Because the string is random, the sort operation may take more or less time depending on luck.
Thus this api should be repeated and the duration averaged to get a sense of what is going on.

- **Method**: GET
- **Route**: `/api/v[23]/performance/3/:char_len?` || `/ak/api/v[23]/performance/3/:char_len?`
- **Auth**: Must have action `blockchain.optools.view`
- **Body**: n/a
- **Parameters**:
	- `char_len` in url is optional. defaults to 256,000 characters
- **Response**:
```js
{
	"test": "Random string",
	"start": 1585769612278,
	"char_len": 256000,
	"text": "<sorted random string of length char_len>",
	"end": 1585769612278,
	"backend_elapsed_ms": 179   // expected duration is 100-300ms for 256,000 characters
}
```

## 4. Disk Write
Write a random string to the disk.
String is not returned, so it won't stress the network
Stresses disk if string is long enough (this is a wimpy test but w/e).

- **Method**: GET
- **Route**: `/api/v[23]/performance/4/:char_len?` || `/ak/api/v[23]/performance/4/:char_len?`
- **Auth**: Must have action `blockchain.optools.view`
- **Body**: n/a
- **Parameters**:
	- `char_len` in url is optional. defaults to 256,000 characters
- **Response**:
```js
{
	"test": "Write disk",
	"start": 1585769807685,
	"char_len": 256000,
	"end": 1585769807700,
	"backend_elapsed_ms": 15   // expected duration is 10-30ms for 256,000 characters
}
```

## 5. Disk Read
Reads the file that was written with api #4 (which is a random string).
String is not returned, so it won't stress the network.
Stresses disk if string was long enough (this is a wimpy test but w/e).

- **Method**: GET
- **Route**: `/api/v[23]/performance/5` || `/ak/api/v[23]/performance/5`
- **Auth**: Must have action `blockchain.optools.view`
- **Body**: n/a
- **Response**:
```js
{
	"test": "Read disk",
	"start": 1585769881390,
	"char_len": 256000,
	"end": 1585769881391,
	"backend_elapsed_ms": 1    // expected duration is 0-1ms for 256,000 characters
}
```

## 6. Clean Up Disk
Deletes the test file that was was written with api #4..
Not really a test.

- **Method**: DELETE
- **Route**: `/api/v[23]/performance/4` || `/api/v[23]/performance/4`
- **Auth**: Must have action `blockchain.optools.view`
- **Body**: n/a
- **Response**:
```js
{
    "test": "Delete disk test file",
    "start": 1585769963447,
    "end": 1585769963447,
    "backend_elapsed_ms": 0
}
```
