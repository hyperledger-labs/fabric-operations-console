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
import Logger from '../components/Log/Logger';
import { FormattedRestApi as RestApi, REST_API_ERRORS } from './RestApi';
const Log = new Logger('LoginApi');

class LoginApi {
	/**
	 * Logs in the given user.
	 * @param {string} email The user's email.
	 * @param {string} password The user's password.
	 * @return {Promise<object, TranslatedError>} The response from the server or a {@see TranslatedError} explaining what went wrong.
	 */
	static async login(email, password) {
		const prefix = `login ${email}:`;
		try {
			Log.info(`${prefix} Logging in`);
			const response = await RestApi.post('/api/v2/auth/login', {
				email: email,
				pass: password,
			});
			Log.info(`${prefix} Success`);
			return response;
		} catch (e) {
			Log.error(`${prefix} Failed: ${e}`);

			// We only care about translating the problems with our passwords that the server responded with.
			if (!e.name || e.name !== REST_API_ERRORS.REQUEST_ERROR_IN_RESPONSE) {
				Log.debug(`${prefix} The error was not caused by bad passwords`);
				throw e;
			}

			// Put more targeted information to the RestApi error
			const error = e;
			error.message = `${prefix} failed`;
			error.translation = {
				message: 'login_generic_error_message',
			};

			const msg = e.response && e.response.msg;
			const status = e.response && e.response.statusCode;
			if (msg === 'Unauthorized' || status === 401) {
				error.translation.message = 'login_unauthorized_error_message';
			} else if (msg && msg.toLowerCase().indexOf('too many requests') >= 0) {
				error.translation.message = 'login_too_many_attempts_error_message';
			}
			throw error;
		}
	}

	/**
	 * Logs the user out.
	 * @param {'no_redirect'} [action] Controls the response from the server.  'no_redirect' will yield a 200 on success instead of a 304, for example.
	 * @return {Promise<object, TranslatedError>} The response from the server or a {@see TranslatedError} explaining what went wrong.
	 */
	static async logout(action) {
		const prefix = `logout${action ? ` w/ action ${action}` : ''}:`;
		let resp = null;

		try {
			Log.info(`${prefix} Logging user out`);
			resp = await RestApi.get(`/auth/logout${action ? `?action=${action}` : ''}`);
			Log.info(`${prefix} Logout succeeded:`, resp);
		} catch (error) {
			Log.error(`${prefix} Logout failed: ${error}`);
			throw error;
		}

		try {
			for (let i in window.statusApiRetries) {
				Log.debug(prefix, 'squashing status api timeout', i); // end status retries since the user has logged out
				clearTimeout(window.statusApiRetries[i]);
			}
			window.statusApiRetries = {}; // reset
			window.remote.disable(); // end remote logging
		} catch (error) {
			Log.error(`${prefix} cleanup failed: ${error}`);
		}

		return resp;
	}

	/**
	 * Organizes translation information based on which password in the change request pertains to the error.
	 * @typedef ChangePasswordError
	 * @augments {TranslatedError}
	 * @param {TranslatedError[]} [new_password_errors] Problems with the desired password.
	 * @param {TranslatedError[]} [current_password_errors] Problems with the current password.
	 * @param {TranslatedError[]} [other_errors] Problems not necessarily related to passwords.
	 */

	/**
	 * Changes the currently logged in user's password.
	 * @param {string} currentPassword The current password for the logged in user.
	 * @param {string} newPassword The desired password for the logged in user.
	 * @return {Promise<object, ChangePasswordError>} The positive response from the server, or a {@see ChangePasswordError} explaining why the change failed.
	 */
	static async changePassword(currentPassword, newPassword) {
		const prefix = 'changePassword:';
		try {
			Log.info(`${prefix} Attempting to update password`);
			const response = await RestApi.put('/api/v2/permissions/users/password', {
				pass: currentPassword,
				desired_pass: newPassword,
			});
			Log.info(`${prefix} Password update succeeded:`, response);
			return response;
		} catch (e) {
			Log.error(`${prefix} Password was not updated: ${e}`);

			// We only care about translating the problems with our passwords that the server responded with.
			if (!e.name || e.name !== REST_API_ERRORS.REQUEST_ERROR_IN_RESPONSE) {
				Log.debug(`${prefix} The error was not cause by bad passwords`);
				throw e;
			}

			// Put more targeted information to the RestApi error
			const error = e;
			error.message = 'Password was not updated';
			error.translation = {
				title: 'password_change_error_title',
				message: 'password_change_generic_error_message',
			};

			// Can't translate the problems with our passwords if the server didn't list any.
			if (!e.response || !e.response.msg || !e.response.msg.length) {
				Log.warn(`${prefix} Server didn't list any problems with the given passwords, but still didn't like them. Throwing:`, error);
				throw error;
			}

			// Organize the list of errors from the server.
			error.new_password_errors = [];
			// It seems odd to have multiple of these errors, but the API returns these in a list with all the others, so maybe more may be added.
			error.current_password_errors = [];
			error.other_errors = [];

			e.response.msg.forEach(msg => {
				const translatedError = new Error(msg);
				translatedError.name = 'PASSWORD_VALIDATION_FAILED';

				if (msg.toLowerCase().indexOf('old password is invalid') >= 0) {
					translatedError.translation = { message: 'password_change_incorrect_password_error_message' };
					return error.current_password_errors.push(translatedError);
				}

				if (msg.toLowerCase().indexOf('password is not at least 8 characters') >= 0) {
					translatedError.translation = { message: 'password_character_limit_error_message' };
				} else if (msg.toLowerCase().indexOf('password cannot be the same as the default password') >= 0) {
					translatedError.translation = { message: 'password_same_as_default_error_message' };
				} else {
					translatedError.translation = { message: 'password_change_generic_error_message' };
					return error.other_errors.push(translatedError);
				}
				error.new_password_errors.push(translatedError);
			});
			Log.error(`${prefix} Issues found with provided passwords: ${error}`);
			throw error;
		}
	}

	/**
	 * Resets the given user's password.
	 * @param {string} uuid The users's ID.
	 * @return {Promise<object, TranslatedError>} The response from the server or a {@see TranslatedError} explaining what went wrong.
	 */
	static async resetPassword(uuid) {
		const prefix = 'resetPassword';
		try {
			Log.info(`${prefix} Resetting password`);
			const resp = await RestApi.put('/api/v2/permissions/users/password/reset', {
				users: [uuid],
			});
			Log.info(`${prefix} Password reset successfully:`, resp);
			return resp;
		} catch (error) {
			Log.error(`${prefix} Failed to reset password: ${error}`);
			throw error;
		}
	}
}

export default LoginApi;
