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

// Libs built by us
import { logger } from './misc';
import { _sto } from '../stitch';

// exports [these functions all require Fabric 2.4.1++]
export { getOSNChannels, getOSNChannel, joinOSNChannel, unjoinOSNChannel };

// ----------------------------------------------------------------
// Get some JSON data via Fetch - expects json response
// ----------------------------------------------------------------
/*
	opts: {
		host: 'https://example.com',		// http endpoint to a thing, include protocol and port
	}
*/
function proxy_fetch_get_json(opts: IntOsn) {
	return fetch('/proxy/' + opts.url, {	// Default options are marked with *
		method: 'GET',
		mode: 'cors', 						// cors, *same-origin
		cache: 'no-cache', 					// *default, no-cache, reload, force-cache, only-if-cached
		credentials: 'same-origin', 		// include, same-origin, *omit
		headers: {
			'x-certificate-b64pem': opts.certificate_b64pem,
			'x-private-key-b64pem': opts.private_key_b64pem,
			'x-root-cert-b64pem': opts.root_cert_b64pem,
		},
		redirect: 'follow', 				// manual, *follow, error
		referrer: 'no-referrer', 			// no-referrer, *client
	}).then(response => {					// try to parse the response
		if (!response.ok) {
			throw response;					// whoops something broke
		}
		return response.json();				// parse it as a json
	}).catch(err => {
		if (err.json) {
			return err.json();				// parse it as a json
		} else {
			return err.message;
		}
	});
}

// ----------------------------------------------------------------
// Post some FormData via Fetch - expects json response
// ----------------------------------------------------------------
/*
	opts: {
		host: 'https://example.com:8122',	// http endpoint to something, include protocol and port
		body_obj: {}
	}
*/
function proxy_fetch_post_form(opts: IntOsn2) {
	let formData = new FormData();
	const blob = new Blob([opts.b_config_block], { type: 'application/octet-stream' });
	formData.append('config-block', blob, 'blah');	// 3rd param is the filename, fabric doesn't care
	return fetch('/proxy/' + opts.url, {	// Default options are marked with *
		method: 'POST',
		mode: 'cors', 						// cors, *same-origin
		cache: 'no-cache', 					// *default, no-cache, reload, force-cache, only-if-cached
		credentials: 'same-origin', 		// include, same-origin, *omit
		headers: {
			//'Content-Type': 'multipart/form-data',	// don't set, fetch will add it and add the boundary
			'x-certificate-b64pem': opts.certificate_b64pem,
			'x-private-key-b64pem': opts.private_key_b64pem,
			'x-root-cert-b64pem': opts.root_cert_b64pem,
		},
		redirect: 'follow', 				// manual, *follow, error
		referrer: 'no-referrer', 			// no-referrer, *client
		body: formData,						// body data type must match 'Content-Type' header
	}).then(response => {					// try to parse the response
		if (!response.ok) {
			throw response;					// whoops something broke
		}
		return response.json();				// parse it as a text
	}).catch(err => {
		if (err.json) {
			return err.json();				// parse it as a json
		} else {
			return err.message;
		}
	});
}

// ----------------------------------------------------------------
// Delete some JSON data via Fetch - expects json response
// ----------------------------------------------------------------
/*
	opts: {
		host: 'https://example.com:8122',	// http endpoint to something, include protocol and port
	}
*/
function proxy_fetch_delete_text(opts: IntOsn) {
	return fetch('/proxy/' + opts.url, {	// Default options are marked with *
		method: 'DELETE',
		mode: 'cors', 						// cors, *same-origin
		cache: 'no-cache', 					// *default, no-cache, reload, force-cache, only-if-cached
		credentials: 'same-origin', 		// include, same-origin, *omit
		headers: {
			'x-certificate-b64pem': opts.certificate_b64pem,
			'x-private-key-b64pem': opts.private_key_b64pem,
			'x-root-cert-b64pem': opts.root_cert_b64pem,
		},
		redirect: 'follow', 				// manual, *follow, error
		referrer: 'no-referrer', 			// no-referrer, *client
	}).then(response => {					// try to parse the response
		if (!response.ok) {
			throw response;					// whoops something broke
		}
		if (get_code(response) === 204) {	// a no-content code
			return 'success';
		} else {
			return response.text();			// parse happy as text
		}
	}).catch(err => {
		if (err.json) {
			return err.json();				// parse error as a json
		} else {
			return err.message;
		}
	});
}

// ------------------------------------------------------------------------------------
// format http error message [http]
// ------------------------------------------------------------------------------------
function fmt_err(input_opts: any, http_resp: any, stitch_msg: string) {
	if (typeof http_resp === 'string') {
		const lc_cors_errors = [
			'Failed to fetch'.toLowerCase(), 								// chrome
			'NetworkError when attempting to fetch resource'.toLowerCase()	// firefox
		];
		if (lc_cors_errors.indexOf(http_resp.toLowerCase()) >= 0) {			// cors issues get sent here, possibly other problems too
			stitch_msg = 'Browser: "' + http_resp + '". Typically this happens when encountering CORS or TLS issues with the node.';
		}
	}

	const ret = <any>{
		function_name: input_opts.funk,
		error: true,
		proxy_url: input_opts.url,
		stitch_msg: stitch_msg,
		http_resp: http_resp,
	};

	logger.error('[stitch] formatted osnadmin error:', ret);
	return ret;
}

// ------------------------------------------------------------------------------------
// format http success message [http]
// ------------------------------------------------------------------------------------
function fmt_ok(input_opts: any, http_resp: any) {
	const ret = <any>{
		function_name: input_opts.funk,
		error: false,
		proxy_url: input_opts.url,
		stitch_msg: 'ok',
		data: http_resp,
	};

	logger.debug('[stitch] formatted osnadmin success:', ret);
	return ret;
}

// ------------------------------------------
// Fabric's osnadmin get-all-channels request by using the athena proxy route
// ------------------------------------------
function getOSNChannels(opts: ExtOsn, cb: Function) {
	let called_cb = false;

	const fetch_options = {
		url: opts.host + '/participation/v1/channels',
		timeout_ms: (opts.timeout_ms && !isNaN(opts.timeout_ms)) ? Number(opts.timeout_ms) : _sto.fabric_general_timeout_ms,	// default timeout
		certificate_b64pem: opts.certificate_b64pem,
		private_key_b64pem: opts.private_key_b64pem,
		root_cert_b64pem: opts.root_cert_b64pem,
		funk: 'getOSNChannels',						// this field is not used in athena
	};
	proxy_fetch_get_json(fetch_options).then(response => {
		called_cb = true;
		if (response && response.channels === null) {	// this can be null for some reason, make it an empty array
			response.channels = [];
		}

		if (!response || !response.channels) {
			return cb(fmt_err(fetch_options, response, 'Failed to get channels (the response was valid but empty)'), response);
		} else {
			return cb(null, fmt_ok(fetch_options, response));
		}
	}).catch(error => {								// likely isn't possible to get here
		if (called_cb) {
			throw error;							// if we already sent our callback, this must be an apollo js error, throw it away
		} else {
			called_cb = true;
			logger.error('[stitch] getOSNChannels - caught js error:', error);
			return cb(fmt_err(fetch_options, error, 'Caught JS error when performing a osnadmin request'), null);
		}
	});
}

// ------------------------------------------
// Fabric's osnadmin get-1-channel request by using the athena proxy route
// ------------------------------------------
function getOSNChannel(opts: ExtOsn2, cb: Function) {
	let called_cb = false;

	const fetch_options = {
		url: opts.host + '/participation/v1/channels/' + opts.channel,
		timeout_ms: (opts.timeout_ms && !isNaN(opts.timeout_ms)) ? Number(opts.timeout_ms) : _sto.fabric_general_timeout_ms,	// default timeout
		certificate_b64pem: opts.certificate_b64pem,
		private_key_b64pem: opts.private_key_b64pem,
		root_cert_b64pem: opts.root_cert_b64pem,
		funk: 'getOSNChannel',						// this field is not used in athena
	};
	proxy_fetch_get_json(fetch_options).then(response => {
		called_cb = true;
		if (!response || !response.name) {
			return cb(fmt_err(fetch_options, response, 'Failed to get channel details'), response);
		} else {
			return cb(null, fmt_ok(fetch_options, response));
		}
	}).catch(error => {								// likely isn't possible to get here
		if (called_cb) {
			throw error;							// if we already sent our callback, this must be an apollo js error, throw it away
		} else {
			called_cb = true;
			logger.error('[stitch] getOSNChannel - caught js error:', error);
			return cb(fmt_err(fetch_options, error, 'Caught JS error when performing a osnadmin request'), null);
		}
	});
}

// ------------------------------------------
// Fabric's osnadmin join-channel request by using the athena proxy route (aka create channel)
// ------------------------------------------
function joinOSNChannel(opts: ExtOsn3, cb: Function) {
	let called_cb = false;

	const fetch_options = {
		url: opts.host + '/participation/v1/channels',
		timeout_ms: (opts.timeout_ms && !isNaN(opts.timeout_ms)) ? Number(opts.timeout_ms) : _sto.fabric_general_timeout_ms,	// default timeout
		certificate_b64pem: opts.certificate_b64pem,
		private_key_b64pem: opts.private_key_b64pem,
		root_cert_b64pem: opts.root_cert_b64pem,
		b_config_block: opts.b_config_block,
		funk: 'joinOSNChannel',						// this field is not used in athena
	};
	proxy_fetch_post_form(fetch_options).then(response => {
		called_cb = true;
		if (!response || !response.name) {
			return cb(fmt_err(fetch_options, response, 'Failed to get join channel'), response);
		} else {
			return cb(null, fmt_ok(fetch_options, response));
		}
	}).catch(error => {								// likely isn't possible to get here
		if (called_cb) {
			throw error;							// if we already sent our callback, this must be an apollo js error, throw it away
		} else {
			called_cb = true;
			logger.error('[stitch] joinOSNChannel - caught js error:', error);
			return cb(fmt_err(fetch_options, error, 'Caught JS error when performing a osnadmin request'), null);
		}
	});
}

// ------------------------------------------
// Fabric's osnadmin remove-node-from-channel request by using the athena proxy route
// ------------------------------------------
function unjoinOSNChannel(opts: ExtOsn2, cb: Function) {
	let called_cb = false;

	const fetch_options = {
		url: opts.host + '/participation/v1/channels/' + opts.channel,
		timeout_ms: (opts.timeout_ms && !isNaN(opts.timeout_ms)) ? Number(opts.timeout_ms) : _sto.fabric_general_timeout_ms,	// default timeout
		certificate_b64pem: opts.certificate_b64pem,
		private_key_b64pem: opts.private_key_b64pem,
		root_cert_b64pem: opts.root_cert_b64pem,
		funk: 'unjoinOSNChannel',						// this field is not used in athena
	};
	proxy_fetch_delete_text(fetch_options).then(response => {
		called_cb = true;
		if (response && response.error) {
			return cb(fmt_err(fetch_options, response, 'Failed to remove node from channel'), response);
		} else {
			const ret = {
				name: opts.channel,
				message: 'channel removed'
			};
			return cb(null, fmt_ok(fetch_options, ret));	// this api has a blank response as of 02/22/2022, so lets set something
		}
	}).catch(error => {									// likely isn't possible to get here
		if (called_cb) {
			throw error;								// if we already sent our callback, this must be an apollo js error, throw it away
		} else {
			called_cb = true;
			logger.error('[stitch] unjoinOSNChannel - caught js error:', error);
			return cb(fmt_err(fetch_options, error, 'Caught JS error when performing a osnadmin request'), null);
		}
	});
}

// pull http status code from response
function get_code(obj: { status: number }) {
	if (obj && obj.status && !isNaN(obj.status)) {
		return Number(obj.status);
	}
	return 500;
};

// is http status code in the error range
/*function is_error_code(code: number) {
	code = Number(code);
	if (!isNaN(code)) {
		if (code >= 400) {
			return true;
		}
	}
	return false;
};*/

// ------------------------------------------
// Interfaces
// ------------------------------------------
interface OsnBase {
	certificate_b64pem: string;
	private_key_b64pem: string;
	root_cert_b64pem: string;

	timeout_ms: number | null;
}

interface ExtOsn extends OsnBase {
	host: string;
}

interface IntOsn extends OsnBase {
	url: string;
}

interface ExtOsn2 extends ExtOsn {
	channel: string;
}

interface ExtOsn3 extends ExtOsn {
	b_config_block: any;
}

interface IntOsn2 extends OsnBase {
	url: string;
	b_config_block: any;
}
