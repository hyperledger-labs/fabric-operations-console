/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/
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
