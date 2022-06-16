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

import { FormattedRestApi, REST_API_ERRORS } from './RestApi';

/**
 * A lot of Athena's APIs are using a swagger-based input validation.  This library wraps calls to {@see FormattedRestApi}, adding error parsing logic whenever
 * the response from the server includes input validation errors.
 *
 * https://github.ibm.com/IBM-Blockchain/athena/blob/master/docs/_v1_to_v2_changes.md#v2-validation-usage
 *
 * See the swagger yaml for a list of possible errors (search for `x-validate_error_messages`):
 * https://github.ibm.com/cloud-api-docs/ibp/blob/master/ibp.yaml
 */
class ValidatedRestApi {
	/**
	 * A parsed version of an API input validation error response from Athena.
	 * @typedef ValidationError
	 * @extends RestApiError
	 * @param {TranslatedError[]} validation_errors A list of {@see TranslatedError}s corresponding to the validation errors returned by the server.
	 */

	/**
	 * Wraps requests to the {@see FormattedRestApi}, adding additional error parsing to catch input validation errors from Athena, which come back with a 400
	 * status code.
	 * @param {Promise} request A request Promise returned by the {@see FormattedRestApi} module.
	 * @return {Promise<*|ValidationError>} A promise that resolves with the server response or an error describing what went wrong.  If the response was a 400,
	 * the error will be a {@see ValidationError}.
	 */
	static async formatValidationErrors(request) {
		try {
			return await request;
		} catch (error) {
			// Passthru everything that isn't a validation error
			if (error.name !== REST_API_ERRORS.REQUEST_ERROR_IN_RESPONSE || !error.fetch_res || error.fetch_res.status !== 400) throw error;

			// Indexes should line up between the msgs and raw translation objects.  ie. `raw[1]` is the translation info for `msg[1]`
			const msgs = error.response.msgs;
			const raws = error.response.raw;

			// Update the existing error with more relevant information
			error.message = 'Server-side request input validation failed.';
			error.name = VALIDATION_ERRORS.API_INPUT_VALIDATION_FAILED;
			error.translation = {
				title: 'in_val_generic_title',
				message: 'in_val_generic',
				params: { violations: msgs.length },
			};

			// Transform input validation errors into translated errors to make them easier to handle/render elsewhere
			error.validation_errors = [];
			for (const i in msgs) {
				const msg = msgs[i];
				const raw = raws[i];

				// Filter `$`s out of properties because they confuse the translation string parser.
				// Make it obvious which keys have been translated using lower case.
				if (raw.symbols) {
					for (const key of Object.keys(raw.symbols)) {
						const filtered_key = key.replace(/[$]/g, '').toLowerCase();
						raw.symbols[filtered_key] = raw.symbols[key];
					}
				}

				// Let's just reuse the input validation error key as our code for now.
				const e = new Error(msg);
				e.name = raw.key;
				e.translation = {
					title: `in_val_${raw.key}_title`,
					message: `in_val_${raw.key}`,
					params: raw.symbols || {},
				};
				error.validation_errors.push(e);
			}

			throw error;
		}
	}

	static async httpSend() {
		return ValidatedRestApi.formatValidationErrors(FormattedRestApi.httpSend(...arguments));
	}

	static async get() {
		return ValidatedRestApi.formatValidationErrors(FormattedRestApi.get(...arguments));
	}

	static async post() {
		return ValidatedRestApi.formatValidationErrors(FormattedRestApi.post(...arguments));
	}

	static async put() {
		return ValidatedRestApi.formatValidationErrors(FormattedRestApi.put(...arguments));
	}

	static async delete() {
		return ValidatedRestApi.formatValidationErrors(FormattedRestApi.delete(...arguments));
	}
}

const VALIDATION_ERRORS = {
	API_INPUT_VALIDATION_FAILED: 'API_INPUT_VALIDATION_FAILED',
};

export { ValidatedRestApi, VALIDATION_ERRORS };
