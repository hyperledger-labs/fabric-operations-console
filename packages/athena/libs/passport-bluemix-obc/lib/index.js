/**
 * Module dependencies.
 */

var BlueMixOAuth2Strategy = require('./strategy');

/**
 * Expose `BlueMixOAuth2Strategy` directly from package.
 */
exports = module.exports = BlueMixOAuth2Strategy;

/**
 * Framework version.
 */
require('pkginfo')(module, 'version');

/**
 * Expose constructors.
 */
exports.BlueMixOAuth2Strategy = BlueMixOAuth2Strategy;
