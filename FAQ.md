# FAQ

1. What is [apollo](https://github.com/hyperledger-labs/fabric-operations-console/tree/main/packages/apollo)?
	- **apollo** is the name of the UI (front end) component of Fabric Operations Console *(js + react/redux)*

1. What is [athena](https://github.com/hyperledger-labs/fabric-operations-console/tree/main/packages/athena)?
	- **athena** is the name of the webserver (backend) of Fabric Operations Console *(node.js)*

1. What is [stitch](https://github.com/hyperledger-labs/fabric-operations-console/tree/main/packages/stitch)?
	- **stitch** is the name of our in-browser fabric-sdk (runs w/the frontend) *(typescript)*

1. How to setup self signed TLS.
	- the webserver will try to load a cert/key based on the env variables `PEM_FILE_PATH` `KEY_FILE_PATH`. If these variables are set but no such file exist, the webserver will create a self signed TLS cert for you on startup. Check out the [env file readme](./packages/athena/env/README.md) for more details on all env variables.

1. What APIs does the console offer?
	- See our [API page](./docs/apis.md) for details.

1. Can I skip the password change after first login?
	- Normally users are forced to change their password after the first login. If you are creating a developer setup often this can be a hassle. If you would like to disable this behavior, set the field `allow_default_password` as `true` in your [config.yaml](https://github.com/hyperledger-labs/fabric-operations-console/blob/main/docker/console/env/config.yaml).

1. What's the deal with system channel removal?
	- See our [System Channel Removal page](./docs/system_channel_removal.md) for details.

## Error Help:

- Crypto.subtle errors look like:
	- `Unable to add identity` - pop up error in Fabric Ops Console

	- `Cannot read properties of undefined (reading 'generateKey')` - error message in the browser's console

	- **Fix** - These errors occur when the browser is not using **https** & the webserver is not hosted on `localhost`. To fix this either access the server with `https` or use a hostname of `localhost`.

	- **Cause** - This error is from our use of Crypto.subtle, which most browsers only enable in "secure contexts" (chrome/firefox/edge). See [MDN article](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/subtle) for more details, also [Secure Context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts#when_is_a_context_considered_secure).

## Need Help?
- Create a [GitHub issue](https://github.com/hyperledger-labs/fabric-operations-console/issues) to ask questions and report bugs!
	- For a bug, please include:
		- Your browser + version.
		- What you did.
		- What you expected.
