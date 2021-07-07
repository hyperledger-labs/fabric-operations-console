# passport-bluemix

[Passport](http://passportjs.org/) strategy for authenticating with [Bluemix](https://ng.bluemix.net/)
using the OAuth 2.0 API.

You can use this module to authenticate users with IBM ID in your Node.js applications.
The module can also be used as middleware in [Express](http://expressjs.com/).
Manage your client configurations in [Bluemix IDaaS](https://idaas.ng.bluemix.net/idaas/index.jsp).

## Install

    $ npm install passport-bluemix

## Usage

#### Authentication Strategy

Use BlueMix as OAuth2 authentication strategy for Passport. After authenticate using IBM ID,
this strategy requires a `verify` callback which can be used to create/verify an user in your
application. Calling `done(null, profile)` will save user profile from IBM to the current passport session.
You can also write anything to the passport session, for example `user`.

	var passport = require('passport')
	, BlueMixOAuth2Strategy = require('passport-bluemix').BlueMixOAuth2Strategy;

	passport.use('bluemix', new BlueMixOAuth2Strategy({
		authorizationURL : 'https://idaas.ng.bluemix.net/sps/oauth20sp/oauth20/authorize',
		tokenURL : 'https://idaas.ng.bluemix.net/sps/oauth20sp/oauth20/token',
		clientID : 'your_app_client_id',
		scope: 'profile',
		grant_type: 'authorization_code',
		clientSecret : 'your_app_client_secret',
		callbackURL : 'your_callback_url',
		profileURL: 'https://idaas.ng.bluemix.net/idaas/resources/profile.jsp'
	}, function(accessToken, refreshToken, profile, done) {
		... //find or create new user
		return done(null, ...);
	}));

#### Authenticate Requests

Use `passport.authenticate()`, specifying the `'bluemix'` strategy, to
authenticate requests.

For example, as route middleware in an [Express](http://expressjs.com/)
application:

	app.get('/auth/ibm', passport.authenticate('bluemix', {requestedAuthnPolicy: 'http://www.ibm.com/idaas/authnpolicy/basic'}));
	app.get('/auth/ibm/callback', 
			passport.authenticate('bluemix'),
			function(req, res) {
			// Successful authentication, redirect home.
        	res.redirect('/');
	});
	
## Credits

  - [Minh Hoang](https://github.com/m1nhhoang)

## License

[The MIT License](http://opensource.org/licenses/MIT)

Copyright (c) 2014 Minh Hoang [http://minhhoang.de/](http://minhhoang.de/)
