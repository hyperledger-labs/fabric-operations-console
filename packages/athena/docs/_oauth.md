# OAuth2.0

## Overview

By default the console will login users using local (couchdb) usernames/passwords.
However this can be changed to use an external OAuth2.0 service.
When an OAuth2.0 service is used, the list of users than can access the console will be controlled by your OAuth2.0 administrator.
Any users that can login to your external service will be able to login to the console.

- What a user can do (permissions) will still be controlled by the console.
- It is possible to switch back to using local usernames/passwords if a OAuth login is no longer needed.
	- When this is done, all usernames will revert to using the `default password` for their first login. Once logged in, they will need to choose a new password.

## Setting up OAuth
**Super important - Read instructions 1-9 once before starting.**

1. First login to your console and browse to the "Access" tab found on the left side of the screen.
1. If you are a user with the `Manager` role you will see a tile showing you the currently configured authentication method and a table listing the current usernames. **Before we switch to the OAuth method** make sure the username (email) you plan on logging in with on your OAuth2.0 service is listed in the `Users` table. If the username (email) is not yet listed, click the `Add new users` button and follow the prompts to create a user with a `Manager` role. Enter your email address as the username.
	- If you ignore this step, you will be unable to login to your console after switching to OAuth!
1. Next click the gear icon located on the authentication tile which is above the `Users` table.
1. On the right panel that just opened, find the `Authentication method` dropdown, and select `OAuth2.0`
1. Typically applications that integrate into a OAuth service have to register their URLs to successfully interact with the service. The URL to register is listed in the first warning dialog box. Copy the URL near the text `Callback URL: <your-url-here>` and have your OAuth2.0 administrator add this as the callback url for the console. This will be done on some dashboard offered by your OAuth service (this is not a step you can perform on the console UI).
1. On the console UI, in the right panel, below the OAuth warning boxes, enter the setting fields exactly as they appear from your OAuth2.0 service. These settings will be shown on some dashboard offered by your OAuth service. Contact your OAuth administrator for help if needed.
	- `Authorization URL` - this is the url where the console will redirect a user to for login
	- `Token URL` - this is a url the console will use to exchange auth codes for access tokens
	- `Client ID` - this is needed to authenticate to the console with your Oauth service
	- `Client secret` - this is needed to authenticate to the console with your Oauth service
	- `Scope` - set this field as `openid email profile` unless these scopes are incompatible with your OAuth service
	- `Grant` - this field is not editable. the console must use a grant type of `authorization_code`
	- `Response type` - this field is not editable. the console must use a response type of `code`
	- If you had issues during a previous attempt with OAuth, you may wish to turn on the setting `User login debug logs`. This setting will log responses, including user profile data, to the server logs. This can help identity OAuth related login errors. Its recommended to have this setting off, to increase user privacy.
1. Next click the blue `Next` button
1. Review the settings you are about to make, and click `Submit` when ready
1. Once submitted you will see a countdown informing you to logout and login within 2 minutes. This behavior is only for the first login when turning OAuth on. The timer is created to let the console revert itself to the local usernames/passwords if the OAuth2.0 based login is unsuccessful (to prevent everyone from being locked out of the console).
	- Click the button to logout and immediately try to login
		- If successful, congrats!
		- If you encounter errors, try a private/incognito window. If that didn't help wait for 2 minutes, and the console will revert to the local username/password auth you had before this change. If you have waited for 2 minutes and still see login errors, try another private/incognito window. Once you are able to login with your local username/password go back to the `Access` tab, double check the  settings with your OAuth administrator, make some changes, and try again.
1. Lastly, take a look at the usernames listed in the `Users` table. If some usernames were only for the local username/password login and they will not be used by your OAuth login, they should be deleted. Otherwise if someone were to register this username with your OAuth service, they will be able to gain access to your console.

## Permissions
The permissions of what a user can do on the console are listed/controlled on the `Access` tab under the `Users` table.
- Users with a `Manager` role can edit the `Users` table and reassign user permissions.
- When using the OAuth2 authentication method, a username (email) with no permissions can request permissions by first logging into the console. A successful login with the OAuth service will show the user a mostly empty page with a button to request permission. After they click this button, their username (email) will appear in the `Users` table. Another user (one with a `Manager` role) can then assign that username permissions. If a username is already known it can be added and given permission without making that user go through the request step (use the `Add new users` button, on the `Access` tab).
- Usernames listed in the table that were only added for local username/password login and are not currently used by the OAuth login should be deleted. Otherwise once someone registers this username with your OAuth service, they would have gained access to your console (which seems unintended if this username was thought to be defunct).
- Check the [console permissions](./_permissions.md) doc for more details on the `Manager`, `Writer`, and `Reader` username roles.


## Help

- If you have issues during login (for either local usernames/passwords or Oauth), try using a private/incognito window.
