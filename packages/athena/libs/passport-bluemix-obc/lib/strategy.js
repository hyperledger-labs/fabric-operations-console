/**
 * IBM Bluemix passport strategy
 */

var util = require('util')
, uri = require('url')
, Profile = require('./profile')
, OAuth2Strategy = require('passport-oauth2-bluemix');

function BlueMixOAuth2Strategy(options, verify) {
	options = options || {};
	OAuth2Strategy.call(this, options, verify);
	this.name = 'bluemix';
	this._profileURL = options.profileURL || 'https://idaas.ng.bluemix.net/idaas/resources/profile.jsp';
}

util.inherits(BlueMixOAuth2Strategy, OAuth2Strategy);

/**
 * Retrieve user profile from IBM BlueMix
 *
 * @param {String} accessToken
 * @param {Function} done
 * @api protected
 */
BlueMixOAuth2Strategy.prototype.userProfile = function(accessToken, done) {
	var url = uri.parse(this._profileURL);
	url = uri.format(url);

	this._oauth2.useAuthorizationHeaderforGET(true);
	this._oauth2.get(url, accessToken, function (err, body, res) {
	    var json;

	    if (err) {
	      if (err.data) {
	        try {
	          json = JSON.parse(err.data);
	        } catch (_) {}
	      }

	      if (json && json.error && typeof json.error == 'object') {
	        return done(json, err);
		  }
	      return done(new Error('Failed to fetch user profile', err));
	    }

	    try {
	      json = JSON.parse(body);
	    } catch (ex) {
	      return done(new Error('Failed to parse user profile'));
	    }
	    var profile = Profile.parse(json);
	    profile.provider = 'bluemix';
	    profile._raw = body;
	    profile._json = json;

	    done(null, profile);
	  });
};

/**
 * Return additional parameter used for authentication policy
 *
 * IBM Bluemix has optional authentication policy.
 *
 * @param {Object} options
 * @return {Object}
 * @api protected
 */
OAuth2Strategy.prototype.authorizationParams = function(options) {
	var params = {};
	if (options.requestedAuthnPolicy)
		params.requestedAuthnPolicy = options.requestedAuthnPolicy;
  return params;
};

OAuth2Strategy.prototype.tokenParams = function(options) {
	var params = {};
	if (options.requestedAuthnPolicy)
		params.requestedAuthnPolicy = options.requestedAuthnPolicy;
  return params;
};

/**
 *
 */

/**
 * Expose `BlueMixOAuth2Strategy`.
 */
module.exports = BlueMixOAuth2Strategy;
