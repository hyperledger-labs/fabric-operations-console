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
declare const window: any;

// Libs from protoc
import { grpc } from '@improbable-eng/grpc-web';
import { ProtobufMessage } from '@improbable-eng/grpc-web/dist/typings/message';

// Libs built by us
import { logger } from './misc';

// exports
export { validate_proposal_options, fmt_err, fmt_ok, Fmt, OrderFmt, OrderFmtBlock, GrpcData, find_alternative_status_message };
export { fill_in_missing, is_error_code, fmt_ca_err, fmt_ca_ok, DEFAULT_ERROR_MSG };

const DEFAULT_ERROR_MSG = 'grpc response contains an error code';		// default error msg when given a error grpc error code

// ------------------------------------------------------------------------------------
// Check if required proposal options are set
// ------------------------------------------------------------------------------------
function validate_proposal_options(opts: any) {
	const errors: any = [];
	if (!opts || !opts.client_cert_b64pem) {
		errors.push('Missing an argument - client certificate ("client_cert_b64pem"). Provide a ECDSA signed certificate that is a base 64 encoded PEM file.');
	}
	if (!opts || !opts.client_prv_key_b64pem) {
		errors.push('Missing an argument - client private key ("client_prv_key_b64pem"). Provide a ECDSA private key that is a base 64 encoded PEM file.');
	}
	if (!opts || !opts.msp_id) {
		errors.push('Missing an argument - MSP ID ("msp_id"). Provide a string such as "org1".');
	}
	if (errors && errors.length >= 1) {
		logger.error('Detected input errors. The following errors need to be fixed:');
		logger.error(errors);
		return errors;
	}
	return null;
}

// ------------------------------------------------------------------------------------
// detect missing codes or messages and fill in the gaps
// ------------------------------------------------------------------------------------
function fill_in_missing(grpc_data: GrpcData) {
	if (grpc_data && grpc_data.status === null) {								// if missing find a code, (note: status of 0 === success)
		grpc_data.status = find_alternative_status(grpc_data);					// run this before catch_bullshit to set the code
	}

	if (grpc_data && !grpc_data.statusMessage) {								// if we are missing the message find an alt message
		grpc_data.statusMessage = find_alternative_status_message(grpc_data);	// run this before catch_bullshit to set the msg
	}

	return catch_bullshit(grpc_data);											// check for liar status codes
}

// ------------------------------------------------------------------------------------
// sometimes we get a status code of 0 but there really was an error. check for that
// ------------------------------------------------------------------------------------
function catch_bullshit(data: GrpcData) {
	const known_bullshit_map = <any>{
		'identity is not an admin': '7',
		'existing config does not contain element': '16',
		'error installing chaincode code': '6',
		'invalid number of arguments': '3',
		'transaction not found': '5',
		'could not find chaincode': '5',
		'timeout expired while starting chaincode': '4',
	};
	if (data && data.status === 0) {										// we are only concerned about liar success responses
		if (data.statusMessage) {
			for (let str in known_bullshit_map) {
				const error_code = known_bullshit_map[str];
				if (data.statusMessage.indexOf(str) >= 0) {
					logger.debug('[stitch] the success code is a lie, error message found, replacing status code', data.status, 'w/', error_code);
					data.status = Number(error_code);						// replace the code
					data.statusMessage = '[bs] ' + data.statusMessage;		// found an error message masking in a success resp
					return data;
				}
			}
		}
	}
	return data;
}

// ------------------------------------------------------------------------------------
// look for status code somewhere
// ------------------------------------------------------------------------------------
function find_alternative_status(data: GrpcData) {
	if (data.status !== null) {
		return Number(data.status);
	}
	if (data.trailers && data.trailers.headersMap) {
		if (data.trailers.headersMap['grpc-status'] && data.trailers.headersMap['grpc-status'].length >= 0) {
			return Number(data.trailers.headersMap['grpc-status'][0]);			// first one's fine
		}
	}
	return null;
}

// ------------------------------------------------------------------------------------
// look for status message somewhere
// ------------------------------------------------------------------------------------
function find_alternative_status_message(data: GrpcData) {
	if (data.statusMessage) {
		return data.statusMessage;
	}
	if (data.trailers && data.trailers.headersMap) {
		if (data.trailers.headersMap['grpc-message'] && data.trailers.headersMap['grpc-message'].length >= 0) {
			let message = '';
			if (Array.isArray(data.trailers.headersMap['grpc-message'])) {
				for (let i in data.trailers.headersMap['grpc-message']) {
					message += data.trailers.headersMap['grpc-message'][i] + ',';	// append each error
				}
			}
			message = message.substring(0, message.length - 1);						// get rid of last comma
			if (message.length > 5) {												// try not to return non-sense
				return message.trim();
			}
		}
	}

	if (data.message) {												// I think this code runs when fabric returns a 0 (success), but returned an error response
		const dMsg = <any>data.message;
		if (dMsg.wrappers_) {
			let str = '';											// add error messages here, i've only ever seen one, but... future proof something something
			for (let z in dMsg.wrappers_) {							// atm element z="4" has the error array, who knows if that is static, iter on all
				if (dMsg.wrappers_[z] && dMsg.wrappers_[z].array) {	// dear god why is it there
					for (let i in dMsg.wrappers_[z].array) {					// element i="1" has the string e msg, who knows if that is static, iter on all
						if (typeof dMsg.wrappers_[z].array[i] === 'string') {	// if we find a string, it might be our error message
							if (dMsg.wrappers_[z].array[i] !== '') {			// skip empties
								str += dMsg.wrappers_[z].array[i] + ' ';
							}
						}
					}
				}
			}
			if (str.length > 5) {									// try not to return non-sense
				return str.trim();
			}
		}
	}

	// if we are in this code we are getting desperate for an error message. hand back the meaning of their grpc status code
	const code = (data.status === null) ? null : Number(data.status).toString();	// if null use a code we don't understand
	const code2msgMap = <any>{
		'0': 'grpc code OK = (code 0) success',
		'1': 'grpc code CANCELLED = (code 01) the operation was cancelled before completion',
		'2': 'grpc code UNKNOWN = (code 02) operation encountered an unknown grpc related error',
		'3': 'grpc code INVALID_ARGUMENT = (code 03) grpc client specified an invalid argument',
		'4': 'grpc code DEADLINE_EXCEEDED = (code 04) deadline expired before the operation could complete (timeout)',
		'5': 'grpc code NOT_FOUND = (code 05) requested entity (e.g. channel, block, file, etc...) was not found',
		'6': 'grpc code ALREADY_EXISTS = (code 06) grpc client attempted to create an entity (e.g. channel) that already exists',
		'7': 'grpc code PERMISSION_DENIED = (code 07) request has known identity, but it does not have permission to do this operation',
		'8': 'grpc code RESOURCE_EXHAUSTED = code 08) resource has been exhausted (e.g. file system is out of space)',
		'9': 'grpc code FAILED_PRECONDITION = (code 09) operation was rejected because the system is not in a required state',
		'10': 'grpc code ABORTED = (code 10) operation was aborted due to concurrency conflict',
		'11': 'grpc code OUT_OF_RANGE = (code 11) operation was attempted past the valid range',
		'12': 'grpc code UNIMPLEMENTED = (code 12) operation is not implemented/supported or enabled',
		'13': 'grpc code INTERNAL = (code 13) operation encountered an internal error',
		'14': 'grpc code UNAVAILABLE = (code 14) services for this operation type are currently unavailable',
		'15': 'grpc code DATA_LOSS = (code 15) unrecoverable data loss or corruption',
		'16': 'grpc code UNAUTHENTICATED = (code 16) request does not have valid credentials (unknown or malformed identity)',

		// haven't seen this one yet, put its likely possible
		'401': 'grpc code UNAUTHORIZED = (http code 401) request does not have valid credentials (unknown or malformed identity)',

		// i've seen this when asking orderer for a block on a channel i'm not a member of
		'403': 'grpc code FORBIDDEN = (http code 403) request has known identity, but it does not have permission to do this operation',

		// i've seen this when asking orderer for a block on a channel that does not exist
		'404': 'grpc code NOT_FOUND = (http code 404) requested entity (e.g. channel, block, file, etc...) was not found',

		// i've seen this when asking orderer for system channel
		'200': 'grpc code OK = (http code 200) success',

		// i've seen this when asking orderer config block when OS does not have quorum
		'503': 'grpc code UNAVAILABLE = (http code 503) service unavailable',

		//code 02 - "Response closed without headers" - can happen from an untrusted tls self signed cert, accept cert in browser
	};
	if (code) {
		if (code2msgMap[code]) {
			return code2msgMap[code];
		} else {
			logger.warn('[stitch] grpc code is not understood. no error message to send.', code, data.status);
			return 'grpc code ? = (code "' + code + '") response contains an unknown code';
		}
	} else {
		logger.warn('[stitch] grpc code was not found. no error message to send.', code, data.status);
		return 'grpc code ??? = response contains no code or message';		// I have no idea what went wrong
	}
}

// see if we can hand back a custom msg from a grpc web proxy error code
function improve_proxy_error_msg(data: GrpcData | null) {
	if (!data || !data._proxy_resp) {
		return null;
	}

	// 1. try looking through known msgs
	if (data._proxy_resp.status_message) {
		const msg = 'grpc web proxy\'s message: "' + data._proxy_resp.status_message + '"';

		const proxyMsg2SuggestionMap = <any>{
			// this code happens when the proxy's tls is not trusted by the browser
			'response closed without headers': 'This can happen when encountering CORS or untrusted TLS issues with the grpc web proxy.',
		};
		for (let str in proxyMsg2SuggestionMap) {
			if (data._proxy_resp.status_message.toLowerCase().indexOf(str) >= 0) {
				return msg + '. ' + proxyMsg2SuggestionMap[str];
			}
		}
	}

	// 2. try looking through known codes
	if (data._proxy_resp.code) {
		const proxyCode2SuggestionMap = <any>{
			// this code happens when the http proxy route **on athena** 429's (rate limit exceeded) (stitch only sees code 8...)
			'8': 'This can happen if the OpTools rate limit is exceeded. Aka too many requests. Try again later.',
		};
		const code = data._proxy_resp.code;
		if (proxyCode2SuggestionMap[code]) {
			return 'grpc web proxy\'s status code: ' + code + '. ' + proxyCode2SuggestionMap[code];
		}
	}

	// 3. return what we had
	if (data._proxy_resp.status_message) {
		return data._proxy_resp.status_message;
	}

	// 4. give up
	return null;
}

// ------------------------------------------------------------------------------------
// format grpc error message
// ------------------------------------------------------------------------------------
function fmt_err(input_opts: Fmt, grpc_data_incoming: GrpcData | GrpcData[] | null, stitch_msg: string | null) {
	const message_parts = [];
	const grpc_data = Array.isArray(grpc_data_incoming) ? grpc_data_incoming[0] : grpc_data_incoming;	// this is often an object, but if array grab first
	const proxy_e_msg = improve_proxy_error_msg(grpc_data);
	const fabric_e_msg = (grpc_data && grpc_data.statusMessage) ? grpc_data.statusMessage : null;

	if (stitch_msg && typeof stitch_msg === 'object') {
		stitch_msg = JSON.stringify(stitch_msg);
	}

	if (stitch_msg && stitch_msg !== DEFAULT_ERROR_MSG) {						// 1. put stitch's error message first (unless is the default one)
		message_parts.push(stitch_msg);
	}
	if ((!grpc_data || grpc_data.status === null) && proxy_e_msg) {				// if there is no status fabric code, but proxy has something
		message_parts.push(proxy_e_msg);										// 2. add proxy's error message
	} else {
		if (fabric_e_msg) { message_parts.push(fabric_e_msg); }					// 3. add fabric's error message
	}
	if (message_parts.length === 0) {											// oh lord, this should not happen
		message_parts.push('yikes, somehow this error has no error message'); 	// 4. make sure we always have something
	}

	const ret = <any>{
		function_name: input_opts.funk,
		error: true,
		msp_id: input_opts.msp_id,
		stitch_msg: message_parts.join(': '),									// combine the message parts
	};

	if (Array.isArray(grpc_data_incoming)) {
		ret.grpc_resps = grpc_data_incoming;
	} else {
		ret.grpc_resp = grpc_data_incoming;
	}

	if (input_opts.host) {
		ret.host = input_opts.host;
	}
	if (input_opts.hosts) {
		ret.hosts = input_opts.hosts;
	}
	if (input_opts.orderer_host) {
		ret.orderer_host = input_opts.orderer_host;
	}

	delete input_opts.client_prv_key_b64pem;									// redact private data
	delete input_opts.client_prv_key_pem;
	ret._input2stitch = input_opts;												// add it last

	logger.error('![stitch] error output', ret);
	return ret;
}

// ------------------------------------------------------------------------------------
// format grpc success message
// ------------------------------------------------------------------------------------
function fmt_ok(input_opts: Fmt, grpc_data_incoming: GrpcData | GrpcData[], data: any) {
	const ret = <any>{
		function_name: input_opts.funk,
		error: false,
		msp_id: input_opts.msp_id,
		data: data,															// parsed data from the proposal response
		stitch_msg: 'ok',
	};

	if (input_opts.host) {
		ret.host = input_opts.host;
	}
	if (input_opts.orderer_host) {
		ret.orderer_host = input_opts.orderer_host;
	}
	if (window.log && window.log.getLevel && window.log.getLevel() <= 1) {	// include the whole grpc resp if debug is on
		if (Array.isArray(grpc_data_incoming)) {
			ret.grpc_resps = grpc_data_incoming;
		} else {
			ret.grpc_resp = grpc_data_incoming;								// do not convert this message to obj, leave as a protobuf class! for join channel
		}
	}
	if (input_opts.include_bin === true) {									// if the pb is asked for include it
		const grpc_data = Array.isArray(grpc_data_incoming) ? grpc_data_incoming[0] : grpc_data_incoming;	// this is often an object, but if array grab first
		if (!grpc_data.message) {
			ret.grpc_message = null;
		} else {
			ret.grpc_message = grpc_data.message.serializeBinary();			// give it as binary
		}
	}
	if (input_opts.debug) {
		delete input_opts.client_prv_key_b64pem;							// redact private data
		delete input_opts.client_prv_key_pem;
		ret._input2stitch = input_opts;
	}

	logger.debug('![stitch] success output', ret);
	return ret;
}

// ------------------------------------------------------------------------------------
// works on http && grpc status codes
// ------------------------------------------------------------------------------------
function is_error_code(code: any) {
	return !(code === grpc.Code.OK || (code >= 200 && code < 400));
}

// ------------------------------------------------------------------------------------
// format http error message [CA]
// ------------------------------------------------------------------------------------
function fmt_ca_err(input_opts: any, http_resp: any, stitch_msg: string | null) {
	const message_parts = [];
	if (stitch_msg && typeof stitch_msg === 'object') {
		stitch_msg = JSON.stringify(stitch_msg);
	}

	if (http_resp && http_resp.errors) {
		for (let i in http_resp.errors) { 								// then fabric's
			if (http_resp.errors[i].message) {
				message_parts.push(http_resp.errors[i].message);
			}
			if (http_resp.errors[i].code) {
				message_parts.push('Code ' + http_resp.errors[i].code);
			}
		}
	} else if (typeof http_resp === 'string') {
		const lc_cors_errors = [
			'Failed to fetch'.toLowerCase(), 								// chrome
			'NetworkError when attempting to fetch resource'.toLowerCase()	// firefox
		];
		if (lc_cors_errors.indexOf(http_resp.toLowerCase()) >= 0) {			// cors issues get sent here, possibly other problems too
			message_parts.push('Browser: "' + http_resp + '". Typically this happens when encountering CORS or TLS issues with the CA.');
		} else {
			message_parts.push(http_resp);									// unknown issues get sent here
		}
	}

	if (message_parts.length === 0) {									// oh lord, this should not happen
		if (stitch_msg) { message_parts.push(stitch_msg); }				// use stitch's msg as a default
		else { message_parts.push('yikes, somehow this error has no error message'); } 	// make sure we always have something
	}

	const ret = <any>{
		function_name: input_opts.funk,
		error: true,
		host: input_opts.host,
		stitch_msg: message_parts.join(': '),							// combine the messages
		http_resp: http_resp,
	};

	logger.error('[stitch] formatted ca error:', ret);
	return ret;
}

// ------------------------------------------------------------------------------------
// format http success message [CA]
// ------------------------------------------------------------------------------------
function fmt_ca_ok(input_opts: any, http_resp: any, append_data: any | null) {
	const ret = <any>{
		function_name: input_opts.funk,
		error: false,
		host: input_opts.host,
		stitch_msg: 'ok',
		data: http_resp ? http_resp.result : {},
	};
	for (let key in append_data) {											// append extra data
		ret.data[key] = append_data[key];
	}

	if (window.log && window.log.getLevel && window.log.getLevel() <= 1) {	// include the whole resp if debug is on
		ret.http_resp = http_resp;
	}

	logger.debug('[stitch] formatted ca success:', ret);
	return ret;
}

interface Fmt {
	msp_id: string;
	host: string | undefined;					// single host url
	hosts: string[] | undefined;				// array of host urls
	orderer_host: string | undefined;
	include_bin: boolean | undefined;
	client_cert_b64pem: string;
	client_prv_key_b64pem: string | undefined;
	client_cert_pem: string | undefined;
	client_prv_key_pem: string | undefined;
	client_tls_cert_b64pem: string | undefined; // mutual tls
	channel_id: string;
	funk: string;

	proposal_type: string | undefined;
	block_number: number | undefined;
	timeout_ms: number | undefined;
	batch_hosts: string[] | undefined;
	tx_id: string | undefined;
	config_update: Uint8Array | undefined;
	chaincode_package: Uint8Array | undefined;
	chaincode_id: string | undefined;
	decoder: string | undefined;
	debug: boolean | undefined;
}

interface OrderFmt extends Fmt {
	p_signed_proposal: any;
	arr_p_proposal_responses: object[];
	chaincode_id: string;
	chaincode_version: string;
}

interface OrderFmtBlock extends Fmt {
	start_block: number | undefined;
	stop_block: number | undefined;
}

interface GrpcData {
	status: number | null;
	statusMessage: string | null;
	headers: grpc.Metadata | null;
	message: ProtobufMessage | null;
	trailers: grpc.Metadata | null;
	_proxy_resp: ProxyResp;
	_b64_payload: string | null;
}

interface ProxyResp {
	status_message: string;
	code: number | undefined;
}

// grpc web proxy errors:
// "TLS handshake error from x.x.x.x:58340: remote error: tls: unknown certificate"
//	- this happens if browser does not trust tls cert of proxy
