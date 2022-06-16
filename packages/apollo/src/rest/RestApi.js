/*
 * Copyright contributors to the Hyperledger Fabric Operations Console project
 *
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
const Log = new Logger('RestApi');

const simulatedNetworkDelay = 0;

/**
 * Wraps common fetch operations with logging, response translation, and basic error handling.
 */
class RestApi {
	/**
	 * A wrapper for callbacks that adds an artificial delay before the callback is sent the result.  Used across the app for Promise `resolve()` and `reject()`
	 * calls.
	 * @param {function} resolve The callback function to be called.
	 * @param {*} result The value to be passed to the callback.
	 * @returns {void}
	 */
	static sendResult(resolve, result) {
		if (simulatedNetworkDelay > 0) {
			Log.warn(`Inserting artificial delay of ${simulatedNetworkDelay} ms before callback`);
			setTimeout(() => {
				resolve(result);
			}, simulatedNetworkDelay);
			return;
		}

		resolve(result);
	}

	/**
	 * A developer tool to inject a delay between a request and a response.  An async version of `sendResult()`.  This delay should always be 0 in production.
	 * @return {Promise<void>} A Promise that resolves after the simulated network delay interval.
	 */
	static async simulateNetworkDelay() {
		if (simulatedNetworkDelay > 0) {
			Log.warn(`Inserting artificial delay of ${simulatedNetworkDelay} ms before resolving`);
			await new Promise(resolve => {
				setTimeout(resolve, simulatedNetworkDelay);
			});
		}
	}

	/**
	 * An error describing why a fetch request failed.  Includes the fetch response object and the parsed response from the server, if available.  The fetch
	 * response object has the status code, headers, and other fields that error handlers might find useful.
	 * @typedef RestApiError
	 * @extends TranslatedError
	 * @param {object} [fetch_res] The fetch response object.  Only included if the request was completed.
	 * @param {object} [response] The response from the server, if it could be parsed.
	 */

	/**
	 * Sends the request and resolves with the response from the server.  If something goes wrong, a nice {@see RestApiError} is thrown.
	 * @param {string} url The request URL.
	 * @param {string} method The request method.
	 * @param {object} [body] The body for the request.
	 * @param {object.<string, string>} [headers] Headers to attach to the request.
	 * @return {Promise<object|string>} A promise that resolves with the response from the server as an object or text, in order of preference.
	 */
	static async httpSend(url, method, body, headers) {
		if (!headers) {
			headers = {};
		}
		const opts = {
			method,
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				...headers,
			},
		};
		if (body) {
			opts.body = JSON.stringify(body);
		}
		const prefix = `${method} ${url}`;

		let res;
		try {
			Log.info(`${prefix} sending request`);
			res = await fetch(url, opts);
		} catch (error) {
			error.name = REST_API_ERRORS.REQUEST_NOT_COMPLETED;
			error.translation = {
				title: 'rest_api_error_not_completed_title',
				params: { url, method },
				message: 'rest_api_error_not_completed_details',
			};
			Log.error(`${prefix} could not be completed: ${error}`);
			await RestApi.simulateNetworkDelay();
			throw error;
		}

		if (res.ok) {
			Log.info(`${prefix} succeeded with ${res.status}: ${res.statusText}`);
			const contentType = res.headers.get('content-type');
			let ret;
			try {
				if (contentType && contentType.indexOf('application/json') >= 0) {
					ret = await res.json();
				} else {
					ret = await res.text();
				}
				// Log.debug(`${prefix} response:`, ret);
				await RestApi.simulateNetworkDelay();
				return ret;
			} catch (error) {
				error.name = REST_API_ERRORS.INVALID_RESPONSE_FORMAT;
				error.translation = {
					title: 'rest_api_error_invalid_response_title',
					params: { url, method },
					message: 'rest_api_error_invalid_response_details',
				};

				// Error handling logic in a higher library might need status codes or something
				error.fetch_res = res;

				Log.error(`${prefix} successful response could not be parsed: ${error}`);
				await RestApi.simulateNetworkDelay();
				throw error;
			}
		} else {
			// This part of the code throws strings and objects, not Errors.  Can't risk touching/changing this behavior and breaking one of the many libraries
			// that depend on that behavior.  We'll have to decorate httpSend() instead.
			const message = `${prefix} failed with ${res.status}: ${res.statusText}`;
			Log.error(message);
			const error = new Error(message);
			error.name = REST_API_ERRORS.REQUEST_ERROR_IN_RESPONSE;
			error.fetch_res = res;
			error.translation = {
				title: 'rest_api_error_error_in_response_title',
				params: { url, method },
				message: 'rest_api_error_error_in_response_details',
			};
			let json;
			try {
				json = await res.json();
				Log.error(`${prefix} response:`, json);
				error.response = json;
			} catch (error) {
				Log.warn(`${prefix} response could not be parsed`);
				error.name = REST_API_ERRORS.REQUEST_ERROR_IN_RESPONSE_UNPARSEABLE;
			}
			Log.error(`${prefix} Formatted RestApi error into: ${error}`);

			await RestApi.simulateNetworkDelay();
			throw error;
		}
	}
	/**
	 * Existing usages of the RestApi module expect Error instances, object literals, and string literals to be thrown when something goes wrong, depending on
	 * the response from the server.  I've updated this module to only throw Error instances, creating this wrapper for the new logic to convert these errors
	 * back to object literals and string literals where appropriate.  Switch to {@see FormattedRestApi} to use this new error handling style.
	 * @param {string} url The request URL.
	 * @param {string} method The request method.
	 * @param {object} [body] The body for the request.
	 * @param {object.<string, string>} [headers] Headers to attach to the request.
	 * @return {Promise<object|string>} A promise that resolves with the response from the server as an object or text, in that order.
	 */
	static async httpSendOld(url, method, body, headers) {
		const prefix = `${method} ${url} old-style`;
		try {
			return await this.httpSend(url, method, body, headers);
		} catch (error) {
			Log.error(`${prefix} Translating error back to old-style throws: ${error}`);
			if (error.name === REST_API_ERRORS.REQUEST_ERROR_IN_RESPONSE) throw error.response;
			else if (error.name === REST_API_ERRORS.REQUEST_ERROR_IN_RESPONSE_UNPARSEABLE) throw error.fetch_res.statusText;
			else throw error;
		}
	}

	static async get(url, headers) {
		return this.httpSendOld(url, 'GET', undefined, headers);
	}

	static async post(url, body, headers) {
		return this.httpSendOld(url, 'POST', body, headers);
	}

	static async put(url, body, headers) {
		return this.httpSendOld(url, 'PUT', body, headers);
	}

	static async delete(url, body, headers) {
		return this.httpSendOld(url, 'DELETE', body, headers);
	}
}

const REST_API_ERRORS = {
	REQUEST_NOT_COMPLETED: 'REQUEST_NOT_COMPLETED',
	REQUEST_ERROR_IN_RESPONSE: 'REQUEST_ERROR_IN_RESPONSE',
	REQUEST_ERROR_IN_RESPONSE_UNPARSEABLE: 'REQUEST_ERROR_IN_RESPONSE_UNPARSEABLE',
	INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
};

/**
 * Wraps the {@see RestApi} calls with {@see RestApi.httpSendErrorDecorator} calls so consumers of this module don't have to change their function
 * signatures.
 */
class FormattedRestApi {
	static async httpSend(url, method, body, headers) {
		return RestApi.httpSend(...arguments);
	}

	static async get(url, headers) {
		return RestApi.httpSend(url, 'GET', undefined, headers);
	}

	static async post(url, body, headers) {
		return RestApi.httpSend(url, 'POST', body, headers);
	}

	static async put(url, body, headers) {
		return RestApi.httpSend(url, 'PUT', body, headers);
	}

	static async delete(url, body, headers) {
		return RestApi.httpSend(url, 'DELETE', body, headers);
	}
}

export { RestApi, FormattedRestApi, REST_API_ERRORS };
