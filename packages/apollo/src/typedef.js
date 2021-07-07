/**
 * Describes a message that can be translated into multiple languages.  Allows various errors and events to be more easily rendered and displayed to users.
 * @typedef TranslationInfo
 * @param {string} [title] The translation key for the title of the message (ex. 'request_failed_title')
 * @param {string} [message] A translation key for a string describing more about the error/event/etc. (ex. 'request_failed')
 * @param {object} [params] Parameters to be passed into the translated strings (ex. { requestURL: 'api/v2/settings' })
 */

/**
 * Extends the regular Javascript error with translation information to make it easier to describe an error to an end user in a UI.
 * @typedef TranslatedError
 * @extends {Error}
 * @param {TranslationInfo} translation Translation information for rendering the error to a user.
 */
