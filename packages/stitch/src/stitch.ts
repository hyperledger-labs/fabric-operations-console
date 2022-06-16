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
//------------------------------------------------------------
// Stitch - a Hyperledger Fabric BROWSER based sdk
//
//		Uses gRPC-Web to allow a modern browser to talk to Fabric nodes.
//		https://github.com/grpc/grpc-web
//
//		Typical usage requires Envoy to translate grpc-web to grpc.
//		Thus this sdk would hit the envoy proxy which would forward it to a Fabric node.
//		Envoy is not needed if the grpc endpoint also supports grpc-web.
//
//------------------------------------------------------------
const async = require('async');

// System chaincode IDs
const CSCC = 'cscc';
const LSCC = 'lscc';
const QSCC = 'qscc';
const LIFECYCLE = '_lifecycle';
//const SYSTEM_CHANNEL_NAME = 'testchainid';

// @ts-ignore
window.async = async;		// elevate scope so others can use it

// Libs from protoc
import { grpc } from '@improbable-eng/grpc-web';
import { Endorser } from './protoc/output/peer/peer_pb_service';
import { ChaincodeSpec } from './protoc/output/peer/chaincode_pb';
import { AtomicBroadcast } from './protoc/output/orderer/ab_pb_service';
import { BlockchainInfo as Ledger_BlockchainInfo } from './protoc/output/common/ledger_pb';
import { SignedProposal as Proposal_SignedProposal } from './protoc/output/peer/proposal_pb';
import { ChannelQueryResponse as Query_ChannelQueryResponse } from './protoc/output/peer/query_pb';
import { ProposalResponse as ProposalResponse_ProposalResponse } from './protoc/output/peer/proposal_response_pb';

// Libs built by us
import { DEFAULT_ERROR_MSG } from './libs/validation';
import { DER_signAndPackCsrPem, DER_parsePem } from './libs/asn1_lib';
import { PolicyLib, } from './libs/proto_handlers/policy_pb_lib';
import { ConfigTxLib } from './libs/proto_handlers/configtx_pb_lib';
import { ProposalLib } from './libs/proto_handlers/proposal_pb_lib';
import { conformPolicySyntax } from './libs/sig_policy_syntax_lib';
import { ChaincodeLib } from './libs/proto_handlers/chaincode_pb_lib';
import { CollectionLib } from './libs/proto_handlers/collection_pb_lib';
import { subtleVerifySignatureDer, scGetHashAsHex } from './libs/subtle_crypto';
import { ProposalResponseLib } from './libs/proto_handlers/proposal_response_pb_lib';
import { pbToJson, jsonToPb, calculateConfigUpdatePb } from './libs/configtxlator_lib';
import { buildConfigUpdateTemplateNewChannel } from './libs/proto_handlers/configtx_pb_lib';
import { convertPolicy2PeerCliSyntax, policyIsMet } from './libs/sig_policy_syntax_reverse_lib';
import { lc_getChaincodeDefinitionOnChannel, lc_getAllChaincodeDefinitionsOnChannel } from './libs/lifecycle';
import { decodeBlock, decodeBlockV2, __decode_chaincode_data_full } from './libs/proto_handlers/block_pb_lib';
import { validateCertificate, scGenCSR, scDecrypt, scEncrypt, switchEncryption, getOrGenAesKey } from './libs/crypto_misc';
import { scSign, scVerifySignature, generateCaAuthToken, parseCertificate, isTrustedCertificate } from './libs/crypto_misc';
import { encrypt, decrypt, signConfigUpdate, buildSigCollectionAuthHeader, mapCertificatesToRoots, safer_hex_str } from './libs/crypto_misc';
import { lc_approveChaincodeDefinition, lc_checkChaincodeDefinitionReadiness, lc_commitChaincodeDefinition } from './libs/lifecycle';
import { getCaIdentities, getCaAffiliations, registerCaIdentity, enrollCaIdentity, deleteCaIdentity, reenrollCaIdentity } from './libs/ca_lib';
import { subtleGenEncryptionKey, subtleEncrypt, subtleDecrypt, subtleSignMsg, subtleGenEcdsaKey, importHexEcdsaKey } from './libs/subtle_crypto';
import { uint8ArrayToBase64, base64ToUint8Array, underscores_2_camelCase, friendly_ms, camelCase_2_underscores, base64toHexStr, url_join, __pb_root } from './libs/misc';
import { pem2jwks, importJwkEcdsaKey, pem2raw, exportJwkKey, exportHexKey, subtleVerifySignature, jwk2pem, exportPemKey } from './libs/subtle_crypto';
import { scSignPemRaw, scGenEcdsaKeys, build_sig_collection_for_hash, scSignJwkRaw, validatePrivateKey, validatePublicKey } from './libs/crypto_misc';
import { decode_chaincode_query_response, decode_chaincode_deployment_spec, decode_processed_transaction, } from './libs/proto_handlers/block_pb_lib';
import { lc_installChaincode, lc_getInstalledChaincodeData, lc_getAllInstalledChaincodeData, lc_getInstalledChaincodePackage } from './libs/lifecycle';
import { load_pb, uint8ArrayToStr, logger, getLogger, pp, sortObjectOut, uint8ArrayToHexStr, hexStrToUint8Array, utf8StrToUint8Array, base64ToUtf8 } from './libs/misc';
import { GrpcData, fmt_err, fmt_ok, find_alternative_status_message, is_error_code, Fmt, OrderFmt, OrderFmtBlock, fill_in_missing } from './libs/validation';
import { LifecycleLib } from './libs/proto_handlers/lifecycle_pb_lib';
import { getOSNChannels, getOSNChannel, joinOSNChannel, unjoinOSNChannel } from './libs/fabric_rest';
import { buildTemplateConfigBlock } from './libs/config_block';

switchEncryption();										// covert to new aes encryption. always run first, at some later date we will remove this. dsh todo.
load_pb(null);											// load the protobuf.js json bundle

// Export Stitch Functions for public use
export {
	setDebug, getChannelsOnPeer, getChannelConfigFromPeer, getChannelInfoFromPeer, getChannelsGenesisFromOrderer, joinPeerToChannel, signConfigUpdate,
	sortObjectOut, hexStrToUint8Array, uint8ArrayToHexStr, base64ToUint8Array, uint8ArrayToBase64, generateCaAuthToken,
	pbToJson, instantiateChaincode, upgradeChaincode, getChannelConfigBlockFromOrderer, getTransactionById, checkIfChaincodeExists,
	getBlockByTransactionId, getLogger, submitConfigUpdate, buildConfigUpdateTemplateNewChannel, configUpdateJsonToBinary, configUpdateBinaryToJson,
	underscores_2_camelCase, buildSigCollectionAuthHeader, camelCase_2_underscores, scSign,
	getCaIdentities, getCaAffiliations, registerCaIdentity, enrollCaIdentity, deleteCaIdentity, reenrollCaIdentity, decodeBlockV2, jsonToPb,
	getChannelBlockFromPeer, getInstalledChaincode, installChaincode, parseChaincodePackage, getInstantiatedChaincode, isTrustedCertificate, parseCertificate,
	getChaincodeDetailsFromPeer, uint8ArrayToStr, getChannelBlockFromOrderer, getTimeouts, setTimeouts, calculateConfigUpdatePb,
	scSignPemRaw, scGenEcdsaKeys, utf8StrToUint8Array, subtleVerifySignatureDer, scVerifySignature, validatePrivateKey, validatePublicKey, validateCertificate,
	lc_installChaincode, lc_getInstalledChaincodeData, lc_getAllInstalledChaincodeData, lc_getInstalledChaincodePackage, UnaryReqResponse, send_proposal_req_timed,
	LIFECYCLE, _sto, lc_approveChaincodeDefinition, lc_checkChaincodeDefinitionReadiness, lc_commitChaincodeDefinition, lc_getChaincodeDefinitionOnChannel,
	lc_getAllChaincodeDefinitionsOnChannel, orderTransaction, scDecrypt, scEncrypt, conformPolicySyntax, scGetHashAsHex, mapCertificatesToRoots,
	getOSNChannels, getOSNChannel, joinOSNChannel, unjoinOSNChannel, buildTemplateConfigBlock
};

// Exported Stitch Functions for testing
export {
	fmtChaincodeProposalOpts, find_alternative_status_message, fill_in_missing, fmt_err, fmt_ok, base64toHexStr, /*asn1_test, /*sigTest,*/
	subtleGenEncryptionKey, subtleEncrypt, subtleDecrypt, subtleSignMsg, subtleGenEcdsaKey, importHexEcdsaKey, pem2jwks, importJwkEcdsaKey,
	pem2raw, exportJwkKey, exportHexKey, subtleVerifySignature, jwk2pem, exportPemKey, build_sig_collection_for_hash, scSignJwkRaw, scGenCSR,
	test_encodeDecode_collection_config_packaged, load_pb, switchEncryption, encrypt, decrypt, DER_signAndPackCsrPem, DER_parsePem, getOrGenAesKey,
	convertPolicy2PeerCliSyntax, policyIsMet, safer_hex_str, url_join, lifecycleLib, decode_chaincode_query_response, Query_ChannelQueryResponse,
	Ledger_BlockchainInfo, policyLib, base64ToUtf8
};

// proto handlers
const proposalResponseLib = new ProposalResponseLib();
const policyLib = new PolicyLib;
const configTxLib = new ConfigTxLib;
const proposalLib = new ProposalLib;
const chaincodeLib = new ChaincodeLib;
const collectionLib = new CollectionLib;
const lifecycleLib = new LifecycleLib;

// --------------------------------------------------------------------------------
// legacy - dsh todo - remove after apollo removes it in Logger.js
// --------------------------------------------------------------------------------
function setDebug() {
	return null;
}

// a test uses this
function test_encodeDecode_collection_config_packaged(input: any, cb: Function) {

	load_pb(() => {
		const ret = {
			bin: collectionLib.__b_build_collection_config_package(input),
			decoded: null,
		};
		if (ret.bin) {
			ret.decoded = collectionLib.__decode_collection_config_package(ret.bin, true);
		}
		return cb(null, ret);
	});
}


// --------------------------------------------------------------------------------
// load timeout settings for various transactions
// --------------------------------------------------------------------------------
let _sto = <any>{											// stitch time out values on fabric req
	fabric_get_block_timeout_ms: 1000 * 10,					// defaults
	fabric_instantiate_timeout_ms: 1000 * 60 * 5,
	fabric_join_channel_timeout_ms: 1000 * 25,
	fabric_install_cc_timeout_ms: 1000 * 60 * 5,
	fabric_lc_install_cc_timeout_ms: 1000 * 60 * 5,			// lc packages are large, longer than regular install
	fabric_general_timeout_ms: 1000 * 10,
	fabric_lc_get_cc_timeout_ms: 1000 * 60 * 3,				// lc packages are large
};
function setTimeouts(opts: any) {
	const lc_opts = <any>{};
	if (opts && opts.constructor.name === 'Object') {		// bring all keys in input to lowercase so we are case-insensitive
		for (let key in opts) {
			if (typeof key === 'string') {
				lc_opts[key.toLowerCase()] = opts[key];
			}
		}
	}
	for (let field in _sto) {
		if (lc_opts[field] && !isNaN(lc_opts[field])) {
			_sto[field] = Number(lc_opts[field]);
		}
	}
	return _sto;
}
function getTimeouts() {
	return JSON.parse(JSON.stringify(_sto));			// return clone so it can't be tampered with
}

// ------------------------------------------
// Send a gRPC Unary request - "ProcessProposal"
// ------------------------------------------
/*
	opts: {
		p_signed_proposal: <protobuf>,			// the protobuf
		host: "http://peer_url.com:port"		// http/https **grpc-web** endpoint to reach your peer
		fmt_payload: <Function()>				// [optional] the function to deserialize the payload
	}
*/
function send_process_proposal_req(opts: { p_signed_proposal: any, host: string | undefined, fmt_payload?: Function }, cb: Function) {
	logger.debug('[stitch] sending the signed proposal - ProcessProposal to:', opts.host);

	/* 11/26/2019 - removed unary high level method. now using lower level "client".
		the unary method mixes/merges errors between the browser and the proxy and errors between the proxy and the component.
		this version does not. specifically i'm doing this to tell when we have tls issues between the browser and the proxy.

	// don't add log statements inside the grpc onEnd - add it to "cb_proper()"
	grpc.unary(Endorser.ProcessProposal, {													// send the grpc-web request
		request: opts.p_signed_proposal,
		host: opts.host,																	// must be a http endpoint
		onEnd: res => {
			const { status, statusMessage, headers, message, trailers } = res;
			let grpc_data: GrpcData = {														// collect the data here
				status: status,
				statusMessage: statusMessage,
				headers: headers,
				message: message,
				trailers: trailers,
				_proxy_resp: null
			};

			// Error - response
			grpc_data = fill_in_missing(grpc_data, null);									// do our best to fill in missing status codes or messages
			if (grpc_data.status !== grpc.Code.OK || !message) {							// error with request
				return cb('grpc response error', { grpc_data: grpc_data });					// don't log here, use timed_*
			} else {

				// Success - response
				const b_payload = proposalResponseLib.b_deserialize_payload(message);							// try to get the payload from "message"
				if (b_payload === -1) {
					return cb('grpc payload formatting error 1', { grpc_data: grpc_data });
				} else {
					return cb(null, { b_payload: b_payload, grpc_data: grpc_data });		// all good
				}
			}
		}
	});
	*/

	// ------------------------ Build the GRPC Web Client ------------------------ //
	// don't add log statements inside the grpc onEnd/onHeaders/onMessage - add it to "cb_proper()"
	let grpc_data: GrpcData = {							// organize the response object here, it will arrive piece wise
		status: null,
		statusMessage: null,
		headers: null,
		message: null,
		trailers: null,
		_proxy_resp: {									// this holds details about the grpc req between the browser and the grpcweb proxy
			code: undefined,							// it does not hold details about the grpc req between the grpcweb proxy and the component
			status_message: ''
		},
		_b64_payload: ''
	};
	const client = grpc.client(Endorser.ProcessProposal, {
		host: <string>opts.host,
	});
	client.onHeaders((headers: grpc.Metadata) => {
		grpc_data.headers = headers;
	});
	client.onMessage((p_message: ProposalResponse_ProposalResponse) => {
		grpc_data.message = p_message;												// store it for onEnd

		const message = p_message.toObject();
		if (message && message.response) {
			grpc_data.status = message.response.status;								// copy status code from component
			grpc_data.statusMessage = message.response.message;						// copy status message from component
		}
	});
	client.onEnd((proxy_status_code: grpc.Code, proxy_status_msg: string, trailers: grpc.Metadata) => {	// all done
		grpc_data.trailers = trailers;												// component field
		grpc_data._proxy_resp.code = proxy_status_code;								// proxy field
		grpc_data._proxy_resp.status_message = proxy_status_msg;					// proxy field
		grpc_data = fill_in_missing(grpc_data);

		// Error - response
		if (is_error_code(grpc_data.status)) {										// an error happened if status is not 200 nor 0
			return cb(DEFAULT_ERROR_MSG, { grpc_data: grpc_data });
		}

		// Success - response
		else {
			const fmt_function = opts.fmt_payload || proposalResponseLib.b_deserialize_payload;
			const b_payload = fmt_function(<any>grpc_data.message);					// try to get the payload from "message"
			if (b_payload === -1) {
				return cb('grpc payload formatting error 1', { grpc_data: grpc_data });
			} else {
				grpc_data._b64_payload = b_payload ? uint8ArrayToBase64(b_payload) : '';
				return cb(null, { b_payload: b_payload, grpc_data: grpc_data });	// all good
			}
		}
	});

	client.start();													// start the web-client
	client.send(opts.p_signed_proposal);							// send this proposal to the server
	client.finishSend();											// tell the server we are done
}

// ------------------------------------------
// timeout the proposal after xxx milliseconds - this is just a wrapper on "send_process_proposal_req()"
/*
	opts: {
		p_signed_proposal: <protobuf>,			// the protobuf
		host: "http://peer_url.com:port",		// http/https **grpc-web** endpoint to reach your peer
		timeout_ms: 1000,						// [optional] client timeout of this request, defaults 10sec
		fmt_payload: <Function()>				// [optional] the function to deserialize the payload
	}
*/
// ------------------------------------------
const send_proposal_req_timed = (opts: Spr, cb: Function) => {
	let cb_called = false;
	const timeout_ms = (opts.timeout_ms && !isNaN(opts.timeout_ms)) ? Number(opts.timeout_ms) : _sto.fabric_general_timeout_ms;	// default timeout

	function cb_proper(e: any, r: { grpc_data: GrpcData }) {
		clearTimeout(timer);
		if (cb_called === false) {															// only call callback once
			cb_called = true;

			const code = r.grpc_data.status || r.grpc_data._proxy_resp.code;
			logger.debug('[stitch] grpc request status code:', code, 'status message:', r.grpc_data.statusMessage);
			return cb(e, r);
		}
	}

	const cb_timeout = (err: any, r: any) => {												// timeout will call this function
		clearTimeout(timer);
		err = 'the grpc web client timed out the proposal after ' + friendly_ms(timeout_ms);
		const stitch_timeout_msg = '(stitch) timeout waiting for grpc web proxy response';
		const stitch_timeout_code = 99;
		const data: GrpcData = {
			status: stitch_timeout_code,
			statusMessage: stitch_timeout_msg,
			headers: null,
			message: null,
			trailers: null,
			_proxy_resp: {
				code: stitch_timeout_code,
				status_message: stitch_timeout_msg,
			},
			_b64_payload: ''
		};
		return cb_proper(err, { grpc_data: data });
	};

	const timer = setTimeout(cb_timeout, timeout_ms);
	send_process_proposal_req(opts, cb_proper);
};

// ------------------------------------------
// Get Channels on a Peer
// ------------------------------------------
/*
	opts: {
		msp_id: "string",						// ex PeerOrg1
		client_cert_b64pem: "string",			// the org's signed cert in a base 64 encoded PEM format
		client_prv_key_b64pem: "string",		// the orgs private key in a base 64 encoded PEM format
		host: "http://peer_url.com:port"		// http/https **grpc-web** endpoint to reach your peer
	}
*/
function getChannelsOnPeer(opts: Fmt, cb: Function) {
	logger.info('*[stitch] building a proposal for getChannelsOnPeer');
	opts.funk = 'getChannelsOnPeer';
	const p_opts = {
		msp_id: opts.msp_id,
		client_cert_b64pem: opts.client_cert_b64pem,
		client_prv_key_b64pem: opts.client_prv_key_b64pem,
		client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
		channel_id: null,						// this is null on purpose
		chaincode_id: CSCC,
		chaincode_type: ChaincodeSpec.Type.GOLANG,
		chaincode_function: 'GetChannels',
		chaincode_args: [],
		transientMap: null,
	};
	proposalLib.p_build_abstracted_signed_proposal_endorser(p_opts, (_: any, p_signed_proposal: any) => {	// build the signed proposal protobuf
		if (!p_signed_proposal) {
			logger.error('[stitch] unknown error creating a signed proposal protobuf');
			return cb(fmt_err(opts, null, 'could not create proposal'), null);
		} else if (p_signed_proposal.errors) {
			logger.error('[stitch] input error creating a signed proposal protobuf');
			return cb(fmt_err(opts, null, p_signed_proposal.errors), null);
		} else {
			const pOpts = { p_signed_proposal: p_signed_proposal, host: opts.host, timeout_ms: opts.timeout_ms };
			send_proposal_req_timed(pOpts, (eMessage: string, obj: UnaryReqResponse) => {
				if (eMessage) {																				// grpc req had errors
					logger.error('[stitch] getChannelsOnPeer was not successful');
					return cb(fmt_err(opts, obj.grpc_data, eMessage), null);
				} else {																					// grpc req is successful
					if (!obj.b_payload) {
						logger.warn('[stitch] getChannelsOnPeer was expecting data in payload, response is empty');
						const data = { channelsList: [], details: 'grpc payload is empty' };
						return cb(null, fmt_ok(opts, obj.grpc_data, data));
					} else {																				// format the data before returning
						logger.info('[stitch] getChannelsOnPeer was successful');
						const p_channel_query_response = Query_ChannelQueryResponse.deserializeBinary(obj.b_payload);
						const ret = <any>p_channel_query_response.toObject();
						return cb(null, fmt_ok(opts, obj.grpc_data, ret));
					}
				}
			});
		}
	});
}

// ------------------------------------------
// Get Channel Config Block from a Peer
// ------------------------------------------
/*
	opts: {
		msp_id: "string",						// ex PeerOrg1
		client_cert_b64pem: "string",			// the org's signed cert in a base 64 encoded PEM format
		client_prv_key_b64pem: "string",		// the orgs private key in a base 64 encoded PEM format
		host: "http://peer_url.com:port",		// http/https **grpc-web** endpoint to reach your peer
		channel_id: "string",					// id of the channel
		decoder: 'v1' || 'v2' || 'v3' || 'none'	// [optional]
	}
*/
function getChannelConfigFromPeer(opts: Fmt, cb: Function) {				// dsh todo - a lot of debug message in here that should be removed
	logger.info('*[stitch] building a proposal for getChannelConfigFromPeer:', opts.channel_id);
	opts.funk = 'getChannelConfigFromPeer';
	const p_opts = {
		msp_id: opts.msp_id,
		client_cert_b64pem: opts.client_cert_b64pem,
		client_prv_key_b64pem: opts.client_prv_key_b64pem,
		client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
		channel_id: null,						// this is null on purpose
		chaincode_id: CSCC,
		chaincode_type: ChaincodeSpec.Type.GOLANG,
		chaincode_function: 'GetConfigBlock',
		chaincode_args: [opts.channel_id],
		transientMap: null,
	};
	proposalLib.p_build_abstracted_signed_proposal_endorser(p_opts, (_: any, p_signed_proposal: any) => {	// build the signed proposal protobuf
		if (!p_signed_proposal) {
			logger.error('[stitch] error creating a signed proposal protobuf');
			return cb(fmt_err(opts, null, 'could not create proposal'), null);
		} else if (p_signed_proposal.errors) {
			logger.error('[stitch] input error creating a signed proposal protobuf');
			return cb(fmt_err(opts, null, p_signed_proposal.errors), null);
		} else {
			const timeout_ms = (opts.timeout_ms && !isNaN(opts.timeout_ms)) ? Number(opts.timeout_ms) : _sto.fabric_get_block_timeout_ms;
			const pOpts = { p_signed_proposal: p_signed_proposal, host: opts.host, timeout_ms: timeout_ms };
			send_proposal_req_timed(pOpts, (eMessage: string, obj: UnaryReqResponse) => {
				if (eMessage) {																				// grpc req had errors
					logger.error('[stitch] getChannelConfigFromPeer was not successful');
					return cb(fmt_err(opts, obj.grpc_data, eMessage), null);
				} else {																					// grpc req is successful
					if (!obj.b_payload) {
						logger.warn('[stitch] getChannelConfigFromPeer response is empty. expecting data in payload, resp empty');
						return cb(fmt_err(opts, obj.grpc_data, 'grpc payload is empty'), null);
					} else {																				// format the data before returning
						logger.info('[stitch] getChannelConfigFromPeer was successful');
						const ret = {
							block: decode_block(opts, obj.b_payload),										// decoded block goes here
							channel_id: opts.channel_id,
							_block: (opts.include_bin === true) ? obj.b_payload : undefined,
						};
						return cb(null, fmt_ok(opts, obj.grpc_data, ret));
					}
				}
			});
		}
	});
}

// ------------------------------------------
// Get Channel Info from a Peer
// ------------------------------------------
/*
	opts: {
		msp_id: "string",						// ex PeerOrg1
		client_cert_b64pem: "string",			// the org's signed cert in a base 64 encoded PEM format
		client_prv_key_b64pem: "string",		// the orgs private key in a base 64 encoded PEM format
		host: "http://peer_url.com:port",		// http/https **grpc-web** endpoint to reach your peer
		channel_id: "string",					// id of the channel
	}
*/
function getChannelInfoFromPeer(opts: Fmt, cb: Function) {
	logger.info('*[stitch] building a proposal for getChannelInfoFromPeer:', opts.channel_id);
	opts.funk = 'getChannelInfoFromPeer';
	const p_opts = {
		msp_id: opts.msp_id,
		client_cert_b64pem: opts.client_cert_b64pem,
		client_prv_key_b64pem: opts.client_prv_key_b64pem,
		client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
		channel_id: null,								// this is null on purpose
		chaincode_id: QSCC,
		chaincode_type: ChaincodeSpec.Type.GOLANG,
		chaincode_function: 'GetChainInfo',
		chaincode_args: [opts.channel_id],
		transientMap: null,
	};
	proposalLib.p_build_abstracted_signed_proposal_endorser(p_opts, (_: any, p_signed_proposal: any) => {	// build the signed proposal protobuf
		if (!p_signed_proposal) {
			logger.error('[stitch] error creating a signed proposal protobuf');
			return cb(fmt_err(opts, null, 'could not create proposal'), null);
		} else if (p_signed_proposal.errors) {
			logger.error('[stitch] input error creating a signed proposal protobuf');
			return cb(fmt_err(opts, null, p_signed_proposal.errors), null);
		} else {
			const pOpts = { p_signed_proposal: p_signed_proposal, host: opts.host, timeout_ms: opts.timeout_ms };
			send_proposal_req_timed(pOpts, (eMessage: string, obj: UnaryReqResponse) => {
				if (eMessage) {																				// grpc req had errors
					logger.error('[stitch] getChannelInfoFromPeer was not successful');
					return cb(fmt_err(opts, obj.grpc_data, eMessage), null);
				} else {																					// grpc req is successful
					if (!obj.b_payload) {
						logger.warn('[stitch] getChannelInfoFromPeer was expecting data in payload, response is empty');
						return cb(fmt_err(opts, obj.grpc_data, 'grpc payload is empty'), null);
					} else {																				// format the data before returning
						logger.info('[stitch] getChannelInfoFromPeer was successful');
						const p_blockchain_info = Ledger_BlockchainInfo.deserializeBinary(obj.b_payload);
						const ret: any = p_blockchain_info.toObject();
						ret.channel_id = opts.channel_id;
						return cb(null, fmt_ok(opts, obj.grpc_data, ret));
					}
				}
			});
		}
	});
}

// ------------------------------------------
// Get Channel Block from an Orderer
// ------------------------------------------
/*
	opts: {
		msp_id: "string",						// ex PeerOrg1
		client_cert_b64pem: "string",			// the org's signed cert in a base 64 encoded PEM format
		client_prv_key_b64pem: "string",		// the orgs private key in a base 64 encoded PEM format
		orderer_host: "http://orderer_url.com:port",	// http endpoint to a grpc-web compatible proxy
		channel_id: "string",					// id of the channel
		start_block: 0,							// set to null to get newest block
		stop_block: 0,							// set to null to get newest block
		include_bin: false,						// [optional] if the pb should be returned or not
		decoder: 'v1' || 'v2' || 'v3' || 'none'	// [optional]
		block_number: 0							// [optional] overrides start and stop block arguments
	}
*/
function getChannelBlockFromOrderer(opts: OrderFmtBlock, cb: Function) {
	let block_data: any = {};
	let error: string | null = null;					// record if there is an error
	opts.funk = 'getChannelBlockFromOrderer';
	let grpc_data: GrpcData = {							// organize the response object here, it will arrive piece wise
		status: null,
		statusMessage: null,
		headers: null,
		message: null,
		trailers: null,
		_proxy_resp: {									// this holds details about the grpc req between the browser and the grpcweb proxy
			code: undefined,							// it does not hold details about the grpc req between the grpcweb proxy and the component
			status_message: ''
		},
		_b64_payload: ''
	};

	// ------------------------ Build a seek proposal ------------------------ //
	const p_opts = {
		msp_id: opts.msp_id,
		client_cert_b64pem: opts.client_cert_b64pem,
		client_prv_key_b64pem: opts.client_prv_key_b64pem,
		client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
		channel_id: opts.channel_id,
		start_block: opts.start_block,
		stop_block: opts.stop_block,
	};
	if (typeof opts.block_number !== 'undefined') {
		p_opts.start_block = Number(opts.block_number);
		p_opts.stop_block = Number(opts.block_number);
	}
	logger.info('*[stitch] building a proposal for getChannelBlockFromOrderer:', opts.channel_id);
	proposalLib.p_build_abstracted_signed_proposal_seek(p_opts, (_: any, p_signed_proposal: any) => {		// build the signed proposal protobuf
		if (!p_signed_proposal) {
			logger.error('[stitch] error creating a signed proposal protobuf for seeking');
			return cb(fmt_err(opts, null, 'could not create proposal'), null);
		} else if (p_signed_proposal.errors) {
			logger.error('[stitch] input error creating a signed proposal protobuf for seeking');
			return cb(fmt_err(opts, null, p_signed_proposal.errors), null);
		} else {
			logger.debug('[stitch] sending the signed proposal - deliver');

			// ------------------------ Build the GRPC Web Client ------------------------ //
			const client = grpc.client(AtomicBroadcast.Deliver, {
				host: <string>opts.orderer_host || <string>opts.host,
				transport: grpc.WebsocketTransport(),
			});
			client.onHeaders((headers: grpc.Metadata) => {
				logger.debug('[stitch] received headers in streaming deliver response:', pp(headers));
				grpc_data.headers = headers;
			});
			client.onMessage((p_deliver_response: any) => {
				const deliver_response = p_deliver_response.toObject();
				logger.debug('[stitch] received msg in streaming deliver response:', pp(deliver_response));

				if (deliver_response) {
					grpc_data.status = deliver_response.status;
					grpc_data.statusMessage = deliver_response.info;		// does not always exist..
				}

				if (deliver_response && deliver_response.block) {			// store block data in ret var
					const p_block = p_deliver_response.getBlock();
					const b_payload = p_block.serializeBinary();
					grpc_data.message = p_block;							// store pb block here for now, its used again below
					block_data = {
						block: decode_block(opts, b_payload),				// decode the block first
						channel_id: opts.channel_id
					};
					grpc_data._b64_payload = uint8ArrayToBase64(b_payload);
				}
			});
			client.onEnd((proxy_status_code: grpc.Code, proxy_status_msg: string, trailers: grpc.Metadata) => {		// all done
				logger.debug('[stitch] received trailers in streaming deliver response:', proxy_status_code, proxy_status_msg, trailers);
				grpc_data.trailers = trailers;								// component field
				grpc_data._proxy_resp.code = proxy_status_code;				// proxy field
				grpc_data._proxy_resp.status_message = proxy_status_msg;	// proxy field
				grpc_data = fill_in_missing(grpc_data);

				// --- Check for Error Codes --- //
				if (is_error_code(grpc_data.status)) {						// an error happened if status is not 200 nor 0
					logger.error('[stitch] received error status in grpc streaming deliver response', pp(grpc_data));
					error = 'unable to get block';
					logger.error('[stitch] getChannelBlockFromOrderer was not successful');
					return cb(fmt_err(opts, grpc_data, error), null);
				} else {
					logger.info('[stitch] getChannelBlockFromOrderer was successful');
					block_data.channel_id = opts.channel_id;
					const ret = fmt_ok(opts, grpc_data, block_data);
					if (!ret.grpc_resp) { ret.grpc_resp = {}; }				// if debug is off it won't exist yet, init it
					ret.grpc_resp.message = grpc_data.message;				// add pb block to response, its needed for join channel
					return cb(null, ret);
				}
			});

			client.start();							// start the web-client
			client.send(p_signed_proposal);			// send this proposal to the server
			client.finishSend();					// tell the server we are done
		}
	});
}

// ------------------------------------------
// Get Channel's Genesis Block from an Orderer
// ------------------------------------------
/*
	opts: {
		msp_id: "string",						// ex PeerOrg1
		client_cert_b64pem: "string",			// the org's signed cert in a base 64 encoded PEM format
		client_prv_key_b64pem: "string",		// the orgs private key in a base 64 encoded PEM format
		orderer_host: "http://orderer_url.com:port",	// http endpoint to a grpc-web compatible proxy
		channel_id: "string",					// id of the channel
		include_bin: false,								// [optional] if the pb should be returned or not
	}
*/
function getChannelsGenesisFromOrderer(opts: Fmt, cb: Function) {
	logger.info('*[stitch] building a proposal for getChannelsGenesisFromOrderer:', opts.channel_id);
	const p_opts = {
		msp_id: opts.msp_id,
		client_cert_b64pem: opts.client_cert_b64pem,
		client_prv_key_b64pem: opts.client_prv_key_b64pem,
		client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
		orderer_host: <string>opts.orderer_host || <string>opts.host,
		channel_id: opts.channel_id,
		start_block: 0,
		stop_block: 0,
		include_bin: opts.include_bin,
		funk: 'getChannelsGenesisFromOrderer',
	};

	getChannelBlockFromOrderer(<any>p_opts, (err: any, resp: any) => {
		return cb(err, resp);
	});
}

// ------------------------------------------
// Join a Peer to a Channel
// ------------------------------------------
/*
	opts: {
		msp_id: "string",						// ex PeerOrg1
		client_cert_b64pem: "string",			// the org's signed cert in a base 64 encoded PEM format (admin)
		client_prv_key_b64pem: "string",		// the orgs private key in a base 64 encoded PEM format (admin)
		host: "http://peer_url.com:port",		// http/https **grpc-web** endpoint to reach your peer
		batch_hosts: ["http://peer_url.com:port"],	// array of http/https **grpc-web** endpoint to reach your peer (if present "host" is ignored)
		orderer_host: "",						// http/https **grpc-web** endpoint to reach your orderer
		channel_id: "string",					// id of the channel to join
	}
*/
function joinPeerToChannel(opts: Fmt, cb: Function) {
	logger.info('*[stitch] getting genesis block to build a proposal for joinPeerToChannel:', opts.channel_id);
	opts.funk = 'joinPeerToChannel';
	const gen_opts = <Fmt>{
		msp_id: opts.msp_id,
		client_cert_b64pem: opts.client_cert_b64pem,
		client_prv_key_b64pem: opts.client_prv_key_b64pem,
		orderer_host: opts.orderer_host,
		channel_id: opts.channel_id
	};
	getChannelsGenesisFromOrderer(gen_opts, (e1: any, resp1: any) => {
		if (e1 || !resp1 || !resp1.data) {
			return cb(e1, null);
		} else {
			logger.debug('[stitch] genesis block response:', resp1);

			const p_block = resp1.grpc_resp.message;	// message is typically a protobuf, in this case it contains a block pb
			logger.debug('[stitch] p_block?', pp(p_block.toObject()));

			let hosts = [opts.host];
			let isBatch = false;
			if (opts.batch_hosts && Array.isArray(opts.batch_hosts) && opts.batch_hosts.length >= 1) {
				hosts = opts.batch_hosts;
				isBatch = true;
			}

			let resp = <any>[];
			let errors = <any>[];
			async.eachLimit(hosts, 8, (a_host: string, cb_joined: Function) => {
				logger.info('[stitch] building a proposal for joinPeerToChannel:', opts.channel_id);
				const p_opts = {
					msp_id: opts.msp_id,
					client_cert_b64pem: opts.client_cert_b64pem,
					client_prv_key_b64pem: opts.client_prv_key_b64pem,
					client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
					channel_id: null,								// this is null on purpose
					chaincode_id: CSCC,
					chaincode_type: ChaincodeSpec.Type.GOLANG,
					chaincode_function: 'JoinChain',
					chaincode_args: [uint8ArrayToStr(p_block.serializeBinary())],
					transientMap: null,
				};
				proposalLib.p_build_abstracted_signed_proposal_endorser(p_opts, (_: any, p_signed_proposal: any) => {		// build the signed proposal protobuf
					if (!p_signed_proposal) {
						logger.error('[stitch] error creating a signed proposal protobuf');
						errors.push(fmt_err(opts, null, 'could not create proposal'));
						return cb_joined(null);
					} else if (p_signed_proposal.errors) {
						logger.error('[stitch] input error creating a signed proposal protobuf');
						errors.push(fmt_err(opts, null, p_signed_proposal.errors));
						return cb_joined(null);
					} else {
						const timeout_ms = (opts.timeout_ms && !isNaN(opts.timeout_ms)) ? Number(opts.timeout_ms) : _sto.fabric_join_channel_timeout_ms;
						const pOpts = { p_signed_proposal: p_signed_proposal, host: a_host, timeout_ms: timeout_ms };
						send_proposal_req_timed(pOpts, (eMessage: string, obj: UnaryReqResponse) => {
							if (eMessage) {																				// grpc req had errors
								logger.error('[stitch] joinPeerToChannel was not successful');
								errors.push(fmt_err(opts, obj.grpc_data, eMessage));
								return cb_joined(null);
							} else {																					// grpc req is successful
								logger.info('[stitch] joinPeerToChannel was successful');
								const ret = <any>{
									channel_id: opts.channel_id,
								};
								resp.push(fmt_ok(opts, obj.grpc_data, ret));
								return cb_joined(null);
							}
						});
					}
				});
			}, () => {
				if (errors.length === 0) {								// clear array if its empty
					errors = null;
				} else if (!isBatch) {
					errors = (errors && errors[0]) ? errors[0] : null;	// flatten array response if its not a batch operation
				}
				if (resp.length === 0) {								// clear array if its empty
					resp = null;
				} else if (!isBatch) {
					resp = (resp && resp[0]) ? resp[0] : null;			// flatten array response if its not a batch operation
				}
				return cb(errors, resp);
			});
		}
	});
}

// ------------------------------------------
// Get Block from a Peer
// ------------------------------------------
/*
	opts: {
		msp_id: "string",						// ex PeerOrg1
		client_cert_b64pem: "string",			// the org's signed cert in a base 64 encoded PEM format
		client_prv_key_b64pem: "string",		// the orgs private key in a base 64 encoded PEM format
		host: "http://peer_url.com:port",		// http/https **grpc-web** endpoint to reach your peer
		channel_id: "string",					// name of the channel
		block_number: 4,						// integer of the block to get, blocks start at 0
		include_bin: false,						// [optional] if the pb should be returned or not
		decoder: 'v1' || 'v2' || 'v3' || 'none'	// [optional]
	}
*/
function getChannelBlockFromPeer(opts: Fmt, cb: Function) {
	logger.info('*[stitch] building a proposal for getBlockFromPeer:', opts.channel_id);
	opts.funk = 'getChannelBlockFromPeer';
	let block_number_str = '0';
	if (!opts || opts.block_number === undefined || isNaN(opts.block_number)) {
		logger.warn('[stitch] block number is not numeric', (opts) ? opts.block_number : null);
	} else {
		block_number_str = opts.block_number.toString();		// must be converted to a string
	}
	const p_opts = {
		msp_id: opts.msp_id,
		client_cert_b64pem: opts.client_cert_b64pem,
		client_prv_key_b64pem: opts.client_prv_key_b64pem,
		client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
		channel_id: null,						// this is null on purpose
		chaincode_id: QSCC,
		chaincode_type: ChaincodeSpec.Type.GOLANG,
		chaincode_function: 'GetBlockByNumber',
		chaincode_args: [opts.channel_id, block_number_str],
		transientMap: null,
	};
	proposalLib.p_build_abstracted_signed_proposal_endorser(p_opts, (_: any, p_signed_proposal: any) => {		// build the signed proposal protobuf
		if (!p_signed_proposal) {
			logger.error('[stitch] error creating a signed proposal protobuf');
			return cb(fmt_err(opts, null, 'could not create proposal'), null);
		} else if (p_signed_proposal.errors) {
			logger.error('[stitch] input error creating a signed proposal protobuf');
			return cb(fmt_err(opts, null, p_signed_proposal.errors), null);
		} else {
			const timeout_ms = (opts.timeout_ms && !isNaN(opts.timeout_ms)) ? Number(opts.timeout_ms) : _sto.fabric_get_block_timeout_ms;
			const pOpts = { p_signed_proposal: p_signed_proposal, host: opts.host, timeout_ms: timeout_ms };
			send_proposal_req_timed(pOpts, (eMessage: string, obj: UnaryReqResponse) => {
				if (eMessage) {																				// grpc req had errors
					logger.error('[stitch] getChannelBlockFromPeer was not successful');
					return cb(fmt_err(opts, obj.grpc_data, eMessage), null);
				} else {																					// grpc req is successful
					if (!obj.b_payload) {
						logger.warn('[stitch] getChannelBlockFromPeer was expecting data in payload, response is empty');
						return cb(fmt_err(opts, obj.grpc_data, 'grpc payload is empty'), null);
					} else {																				// format the data before returning
						logger.info('[stitch] getChannelBlockFromPeer was successful');
						const ret = {
							block: decode_block(opts, obj.b_payload),										// decoded block goes here
							channel_id: opts.channel_id,
						};
						return cb(null, fmt_ok(opts, obj.grpc_data, ret));
					}
				}
			});
		}
	});
}

// ------------------------------------------
// Get Chaincode on a Peer
// ------------------------------------------
/*
	opts: {
		msp_id: "string",						// ex PeerOrg1
		client_cert_b64pem: "string",			// the org's signed cert in a base 64 encoded PEM format
		client_prv_key_b64pem: "string",		// the orgs private key in a base 64 encoded PEM format
		host: "http://peer_url.com:port",		// http/https **grpc-web** endpoint to reach your peer
	}
*/
function getInstalledChaincode(opts: Fmt, cb: Function) {
	logger.info('*[stitch] building a proposal for getInstalledChaincode');
	opts.funk = 'getInstalledChaincode';
	const p_opts = {
		msp_id: opts.msp_id,
		client_cert_b64pem: opts.client_cert_b64pem,
		client_prv_key_b64pem: opts.client_prv_key_b64pem,
		client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
		channel_id: null,						// this is null on purpose
		chaincode_id: LSCC,
		chaincode_type: ChaincodeSpec.Type.GOLANG,
		chaincode_function: 'getinstalledchaincodes',
		chaincode_args: [],
		transientMap: null,
	};
	proposalLib.p_build_abstracted_signed_proposal_endorser(p_opts, (_: any, p_signed_proposal: any) => {		// build the signed proposal protobuf
		if (!p_signed_proposal) {
			logger.error('[stitch] error creating a signed proposal protobuf');
			return cb(fmt_err(opts, null, 'could not create proposal'), null);
		} else if (p_signed_proposal.errors) {
			logger.error('[stitch] input error creating a signed proposal protobuf');
			return cb(fmt_err(opts, null, p_signed_proposal.errors), null);
		} else {
			const pOpts = { p_signed_proposal: p_signed_proposal, host: opts.host, timeout_ms: opts.timeout_ms };
			send_proposal_req_timed(pOpts, (eMessage: string, obj: UnaryReqResponse) => {
				if (eMessage) {												// grpc req had errors
					logger.error('[stitch] getInstalledChaincode was not successful');
					return cb(fmt_err(opts, obj.grpc_data, eMessage), null);
				} else {													// grpc req is successful
					if (!obj.b_payload) {
						logger.warn('[stitch] getInstalledChaincode was expecting data in payload, response is empty');
						const data = { chaincodesList: [], details: 'grpc payload is empty' };
						return cb(null, fmt_ok(opts, obj.grpc_data, data));
					} else {												// format the data before returning
						logger.info('[stitch] getInstalledChaincode was successful');
						const chaincode_query_response = <any>decode_chaincode_query_response(obj.b_payload);
						return cb(null, fmt_ok(opts, obj.grpc_data, chaincode_query_response));
					}
				}
			});
		}
	});
}

// ------------------------------------------
// Install Chaincode on a Peer
// ------------------------------------------
/*
	opts: {
		msp_id: "string",					// ex PeerOrg1
		client_cert_b64pem: "string",		// the org's signed cert in a base 64 encoded PEM format
		client_prv_key_b64pem: "string",	// the orgs private key in a base 64 encoded PEM format
		host: "http://peer_url.com:port",	// http/https **grpc-web** endpoint to reach your peer
		chaincode_package: <Uint8Array>		// binary data of the chaincode package. use the peer's cli to create this.
											//	example commands to build package:
											//	> peer chaincode package -l golang -n marbles -p github.com/ibm-blockchain/marbles/chaincode/src/marbles -v 5.0.0 package.out
											// 	notes: "marbles" is inside the $GOPATH and "package.out" is the name of the output file.
	}
*/
function installChaincode(opts: Fmt, cb: Function) {
	logger.info('*[stitch] building a proposal for installChaincode');
	opts.funk = 'installChaincode';

	// convert package file to a "chaincode deployment spec" protobuf
	const parsed = decode_chaincode_deployment_spec(<Uint8Array>opts.chaincode_package);
	if (parsed.error) {
		return cb(fmt_err(opts, null, parsed.error), null);
	} if (!parsed.p_chaincode_deployment_spec) {
		return cb(fmt_err(opts, null, 'could not decode chaincode package into a chaincode deployment spec [3]'), null);
	} else {

		// proposal time
		const p_opts = {
			msp_id: opts.msp_id,
			client_cert_b64pem: opts.client_cert_b64pem,
			client_prv_key_b64pem: opts.client_prv_key_b64pem,
			client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
			channel_id: null,						// this is null on purpose
			chaincode_id: LSCC,
			chaincode_type: ChaincodeSpec.Type.GOLANG,
			chaincode_function: 'install',
			chaincode_args: [uint8ArrayToStr(parsed.p_chaincode_deployment_spec.serializeBinary())],
			transientMap: null,
		};
		proposalLib.p_build_abstracted_signed_proposal_endorser(p_opts, (_: any, p_signed_proposal: any) => {		// build the signed proposal protobuf
			if (!p_signed_proposal) {
				logger.error('[stitch] error creating a signed proposal protobuf');
				return cb(fmt_err(opts, null, 'could not create proposal'), null);
			} else if (p_signed_proposal.errors) {
				logger.error('[stitch] input error creating a signed proposal protobuf');
				return cb(fmt_err(opts, null, p_signed_proposal.errors), null);
			} else {
				const timeout_ms = (opts.timeout_ms && !isNaN(opts.timeout_ms)) ? Number(opts.timeout_ms) : _sto.fabric_install_cc_timeout_ms;	// chaincode can take a bit
				const pOpts = { p_signed_proposal: p_signed_proposal, host: opts.host, timeout_ms: timeout_ms };
				send_proposal_req_timed(pOpts, (eMessage: string, obj: UnaryReqResponse) => {
					if (eMessage) {													// grpc req had errors
						logger.error('[stitch] installChaincode was not successful');
						return cb(fmt_err(opts, obj.grpc_data, eMessage), null);
					} else {														// grpc req is successful
						if (!obj.b_payload) {
							logger.warn('[stitch] installChaincode was expecting data in payload, response is empty');
							return cb(fmt_err(opts, obj.grpc_data, 'grpc payload is empty'), null);
						} else {													// format the data before returning
							logger.info('[stitch] installChaincode was successful');
							const installed_cc_resp = <any>{
								chaincode_details: parsed.chaincode_details,
							};
							return cb(null, fmt_ok(opts, obj.grpc_data, installed_cc_resp));
						}
					}
				});
			}
		});
	}
}

// ------------------------------------------
// Get Instantiated Chaincode on a Channel
// ------------------------------------------
/*
	opts: {
		msp_id: "string",					// ex PeerOrg1
		client_cert_b64pem: "string",		// the org's signed cert in a base 64 encoded PEM format
		client_prv_key_b64pem: "string",	// the orgs private key in a base 64 encoded PEM format
		host: "http://peer_url.com:port",	// http/https **grpc-web** endpoint to reach your peer
		channel_id: "string",				// id of the channel
	}
*/
function getInstantiatedChaincode(opts: Fmt, cb: Function) {
	logger.info('*[stitch] building a proposal for getInstantiatedChaincode');
	opts.funk = 'getInstantiatedChaincode';

	// proposal time
	const p_opts = {
		msp_id: opts.msp_id,
		client_cert_b64pem: opts.client_cert_b64pem,
		client_prv_key_b64pem: opts.client_prv_key_b64pem,
		client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
		channel_id: opts.channel_id,
		chaincode_id: LSCC,
		chaincode_type: ChaincodeSpec.Type.GOLANG,
		chaincode_function: 'getchaincodes',
		chaincode_args: [],
		transientMap: null,
	};
	proposalLib.p_build_abstracted_signed_proposal_endorser(p_opts, (_: any, p_signed_proposal: any) => {		// build the signed proposal protobuf
		if (!p_signed_proposal) {
			logger.error('[stitch] error creating a signed proposal protobuf');
			return cb(fmt_err(opts, null, 'could not create proposal'), null);
		} else if (p_signed_proposal.errors) {
			logger.error('[stitch] input error creating a signed proposal protobuf');
			return cb(fmt_err(opts, null, p_signed_proposal.errors), null);
		} else {
			const pOpts = { p_signed_proposal: p_signed_proposal, host: opts.host, timeout_ms: opts.timeout_ms };
			send_proposal_req_timed(pOpts, (eMessage: string, obj: UnaryReqResponse) => {
				if (eMessage) {												// grpc req had errors
					logger.error('[stitch] getInstantiatedChaincode was not successful');
					return cb(fmt_err(opts, obj.grpc_data, eMessage), null);
				} else {													// grpc req is successful
					if (!obj.b_payload) {
						logger.warn('[stitch] getInstantiatedChaincode was expecting data in payload, response is empty');
						const data = { chaincodesList: [], details: 'grpc payload is empty' };
						return cb(null, fmt_ok(opts, obj.grpc_data, data));
					} else {												// format the data before returning
						logger.info('[stitch] getInstantiatedChaincode was successful');
						const chaincode_query_response = <any>decode_chaincode_query_response(obj.b_payload);
						return cb(null, fmt_ok(opts, obj.grpc_data, chaincode_query_response));
					}
				}
			});
		}
	});
}

// ------------------------------------------
// Instantiate & Upgrade Chaincode on a Channel
// ------------------------------------------
/*
	opts: {
		msp_id: "string",					// ex PeerOrg1
		client_cert_b64pem: "string",		// the org's signed cert in a base 64 encoded PEM format (admin)
		client_prv_key_b64pem: "string",	// the orgs private key in a base 64 encoded PEM format (admin)
		host: "http://peer_url.com:port",	// http/https **grpc-web** endpoint to reach your peer
		orderer_host: "",					// http/https **grpc-web** endpoint to reach your orderer
		channel_id: "string",				// id of the channel

		chaincode_id: "string",
		chaincode_version: "string",
		chaincode_type: "golang" || "node" || "java" || "car",
		chaincode_function: "string",  		// name of chaincode function to call to start
		chaincode_args: ["string"],			// chaincode str arguments to pass to chaincode function
		static_collection_configs: [{
			name: "string",
			member_orgs_policy: {
				identities: [{
					role: {
						name: "string",
						mspId: "string"
					}
				}],
				policy: {
					'1-of': {
						{ 'signed-by': 0 }
					}
				}
			},
			required_peer_count: number,
			maximum_peer_count: number,
			block_to_live: number,
		}],
		exec_env: <?>,

		// if "endorsement_policy" is null the policy will be built to only allow this msp id
		// see example policy in: policy_pb_lib.ts
		// see sdk doc: https://fabric-sdk-node.github.io/global.html#ChaincodeInstantiateUpgradeRequest
		endorsement_policy: <policy format - see readme doc>
	}
*/
function instantiateChaincode(opts: OrderFmt, cb: Function) {
	logger.info('*[stitch] building a proposal for instantiateChaincode');
	opts.proposal_type = 'deploy';
	deployChaincode(opts, cb);
}
function upgradeChaincode(opts: OrderFmt, cb: Function) {
	logger.info('*[stitch] building a proposal for upgradeChaincode');
	opts.proposal_type = 'upgrade';
	deployChaincode(opts, cb);
}

// endorse and order a chaincode instantiation proposal
function deployChaincode(opts: OrderFmt, cb: Function) {
	opts.funk = 'deployChaincode';

	// Step 1 - endorse it
	endorseChaincodeProposal(opts, (err: any, obj: any) => {
		if (err) {
			return cb(err, null);
		} else {

			// Step 2 - orderer it
			opts.p_signed_proposal = obj.p_signed_proposal;			// copy them over
			opts.arr_p_proposal_responses = [obj.p_proposal_response];
			return orderTransaction(opts, (err2: any, grpc_data: any) => {
				if (err2) {
					logger.error('[stitch] deployChaincode was not successful');
					return cb(err2, null);
				} else {
					logger.info('[stitch] deployChaincode was successful');
					const ret = <any>{
						channel_id: opts.channel_id,
						chaincode_id: opts.chaincode_id,
						chaincode_version: opts.chaincode_version,
					};
					return cb(null, fmt_ok(opts, grpc_data, ret));
				}
			});
		}
	});
}

// same function for upgrade and instantiate
function endorseChaincodeProposal(opts: any, cb: Function) {
	opts.funk = 'endorseChaincodeProposal';
	load_pb((pb_root: any) => {																					// make sure pbjs is loaded first, collections require it
		const p_opts = fmtChaincodeProposalOpts(opts);
		if (!p_opts) {
			logger.error('[stitch] input error creating chaincode proposal options');
			return cb(fmt_err(opts, null, 'input error creating chaincode proposal options'), null);
		} else {
			proposalLib.p_build_abstracted_signed_proposal_endorser(p_opts, (_: any, p_signed_proposal: any) => {		// build the signed proposal protobuf
				if (!p_signed_proposal) {
					logger.error('[stitch] error creating a signed proposal protobuf');
					return cb(fmt_err(opts, null, 'could not create proposal'), null);
				} else if (p_signed_proposal.errors) {
					logger.error('[stitch] input error creating a signed proposal protobuf');
					return cb(fmt_err(opts, null, p_signed_proposal.errors), null);
				} else {
					const timeout_ms = (opts.timeout_ms && !isNaN(opts.timeout_ms)) ? Number(opts.timeout_ms) : _sto.fabric_instantiate_timeout_ms;
					const pOpts = { p_signed_proposal: p_signed_proposal, host: opts.host, timeout_ms: timeout_ms };
					send_proposal_req_timed(pOpts, (eMessage: string, obj: UnaryReqResponse) => {
						if (eMessage) {										// grpc req had errors
							logger.error('[stitch] endorseChaincodeProposal was not successful');
							return cb(fmt_err(opts, obj.grpc_data, eMessage), null);
						} else {											// grpc req is successful
							if (!obj.b_payload) {
								logger.warn('[stitch] endorseChaincodeProposal was expecting data in payload, response is empty');
								return cb(fmt_err(opts, obj.grpc_data, 'grpc payload is empty'), null);
							} else {										// format the data before returning
								logger.info('[stitch] endorseChaincodeProposal was successful');
								const ret = {
									p_signed_proposal: p_signed_proposal,
									p_proposal_response: obj.grpc_data.message,
								};
								return cb(null, ret);
							}
						}
					});
				}
			});
		}
	});
}

// format chaincode proposal options
function fmtChaincodeProposalOpts(opts: any) {

	// build cc's deployment spec
	opts.chaincode_type = chaincodeLib.conform_cc_type(opts.chaincode_type);
	const p_chaincode_deployment_spec = chaincodeLib.p_build_chaincode_deployment_spec(opts);
	logger.debug('*[stitch] p_chaincode_deployment_spec?', pp(p_chaincode_deployment_spec.toObject()));

	// proposal time
	const p_opts = {
		msp_id: opts.msp_id,
		client_cert_b64pem: opts.client_cert_b64pem,
		client_prv_key_b64pem: opts.client_prv_key_b64pem,
		client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
		channel_id: opts.channel_id,
		chaincode_id: LSCC,
		chaincode_type: ChaincodeSpec.Type.GOLANG,	// dsh i think this is right, but it might need to match deploying cc type..
		chaincode_function: opts.proposal_type,		// this is actually the first cc argument in the pb, but w/e. breaking it out for clarity
		chaincode_args: [''],						// populated below
		transientMap: null,
	};

	// [0] lscc - required
	p_opts.chaincode_args[0] = opts.channel_id;

	// [1] chaincode_deployment_spec - required
	p_opts.chaincode_args[1] = uint8ArrayToStr(p_chaincode_deployment_spec.serializeBinary());

	// [2] endorsement_policy - optional
	if (!opts.endorsement_policy) {
		const p_default_policy = policyLib.p_build_default_e_policy_envelope({ msp_ids: [opts.msp_id] });	// add a policy where only this msp can sign
		logger.info('[stitch] adding default endorsement policy', pp(p_default_policy.toObject()));
		p_opts.chaincode_args[2] = uint8ArrayToStr(p_default_policy.serializeBinary());
	} else {
		const endorsement_fmt = conformPolicySyntax(opts.endorsement_policy);				// accepts fabric's format, sdk's format, or peer cli format
		const b_custom_policy = endorsement_fmt ? policyLib.__b_build_signature_policy_envelope(endorsement_fmt) : null;
		if (b_custom_policy) {
			p_opts.chaincode_args[2] = uint8ArrayToStr(b_custom_policy);
		}
	}

	// [3] escc - optional
	p_opts.chaincode_args[3] = '';

	// [4] vscc - optional
	p_opts.chaincode_args[4] = '';

	// [5] CollectionConfigPackage - optional
	if (opts.static_collection_configs) {
		const b_collection_config_package = collectionLib.__b_build_collection_config_package(opts.static_collection_configs);
		if (!b_collection_config_package) {
			return null;
		} else {
			p_opts.chaincode_args[5] = uint8ArrayToStr(b_collection_config_package);
		}
	}

	return p_opts;
}

// ------------------------------------------
// Order Transaction - send endorsed proposal to be ordered, gets committed afterward (dsh todo - this only works with 1 endorsement atm)
// ------------------------------------------
/*
	opts: {
		orderer_host: "",						// http/https **grpc-web** endpoint to reach your orderer
		p_signed_proposal: <protobuf>,
		arr_p_proposal_responses: <protobuf>,	// should contain endorsement
		msp_id: "string",						// ex PeerOrg1
		client_cert_b64pem: "string",			// the org's signed cert in a base 64 encoded PEM format (admin)
		client_prv_key_b64pem: "string",		// the orgs private key in a base 64 encoded PEM format (admin)
		include_bin: false,						// [optional] if the pb should be returned or not
	}
*/
function orderTransaction(opts: OrderFmt, cb: Function) {
	logger.info('*[stitch] building a proposal for orderTransaction');
	opts.funk = 'orderTransaction';
	proposalLib.p_build_abstracted_signed_proposal_order(opts, (_: any, p_signed_proposal: any) => {
		if (!p_signed_proposal) {
			logger.error('[stitch] error creating a signed proposal protobuf for ordering');
			return cb(fmt_err(opts, null, 'unable to build proposal for ordering'), null);
		} else if (p_signed_proposal.errors) {
			logger.error('[stitch] input error creating a signed proposal protobuf for ordering');
			return cb(fmt_err(opts, null, p_signed_proposal.errors), null);
		} else {
			logger.debug('[stitch] sending the signed proposal - broadcast');
			let error: string | null = null;					// record if there is an error
			let grpc_data: GrpcData = {							// organize the response object here, it will arrive piece wise
				status: null,
				statusMessage: null,
				headers: null,
				message: null,
				trailers: null,
				_proxy_resp: {									// this holds details about the grpc req between the browser and the grpcweb proxy
					code: undefined,							// it does not hold details about the grpc req between the grpcweb proxy and the component
					status_message: ''
				},
				_b64_payload: ''
			};

			// ------------------------ Build the GRPC Web Client ------------------------ //
			const client = grpc.client(AtomicBroadcast.Broadcast, {
				host: <string>opts.orderer_host,
				transport: grpc.WebsocketTransport(),
			});
			client.onHeaders((headers: grpc.Metadata) => {
				logger.debug('[stitch] received headers in streaming broadcast response:', pp(headers));
				grpc_data.headers = headers;
			});
			client.onMessage((p_broadcast_response: any) => {
				const broadcast_response = p_broadcast_response.toObject();
				logger.debug('[stitch] received msg in streaming broadcast response: !@#', pp(broadcast_response));

				if (broadcast_response) {
					grpc_data.status = broadcast_response.status;
					grpc_data.statusMessage = broadcast_response.info;		// does not always exist..
				}
			});
			client.onEnd((proxy_status_code: grpc.Code, proxy_status_msg: string, trailers: grpc.Metadata) => {		// all done
				logger.debug('[stitch] received trailers in streaming broadcast response:', proxy_status_code, proxy_status_msg, trailers);
				grpc_data.trailers = trailers;								// component field
				grpc_data._proxy_resp.code = proxy_status_code;				// proxy field
				grpc_data._proxy_resp.status_message = proxy_status_msg;	// proxy field
				grpc_data = fill_in_missing(grpc_data);

				// --- Check for Error Codes --- //
				if (is_error_code(grpc_data.status)) {	// an error happened if status is not 200 nor 0
					logger.error('[stitch] received error status in grpc streaming broadcast response', pp(grpc_data));
					error = 'unable to order transaction';
					return cb(fmt_err(opts, grpc_data, error), null);
				} else {
					logger.info('[stitch] orderTransaction was successful');
					return cb(null, grpc_data);
				}
			});

			client.start();							// start the web-client
			client.send(p_signed_proposal);			// send this proposal to the server
			client.finishSend();					// tell the server we are done
		}
	});
}

// ------------------------------------------
// Parse Chaincode Package
// ------------------------------------------
function parseChaincodePackage(chaincode_package: Uint8Array) {
	const parsed = decode_chaincode_deployment_spec(chaincode_package); 	// convert package file to a "chaincode deployment spec" protobuf
	if (parsed.error) {
		return {
			error: true,
			stitch_msg: parsed.error,
		};
	} else {
		return parsed.chaincode_details;
	}
}

// ------------------------------------------
// Get Channel's Latest Config Block from an Orderer
// ------------------------------------------
/*
	opts: {
		msp_id: "string",								// ex PeerOrg1
		client_cert_b64pem: "string",					// the org's signed cert in a base 64 encoded PEM format
		client_prv_key_b64pem: "string",				// the orgs private key in a base 64 encoded PEM format
		orderer_host: "http://orderer_url.com:port",	// http endpoint to a grpc-web compatible proxy
		channel_id: "string",							// id of the channel
		include_bin: false,								// [optional] if the pb should be returned or not
		decoder: 'v1' || 'v2' || 'v3' || 'none'			// [optional]
	}
*/
function getChannelConfigBlockFromOrderer(opts: Fmt, cb: Function) {
	logger.info('*[stitch] building a proposal for getChannelConfigBlockFromOrderer:', opts.channel_id);

	const n_opts = <any>{
		msp_id: opts.msp_id,
		client_cert_b64pem: opts.client_cert_b64pem,
		client_prv_key_b64pem: opts.client_prv_key_b64pem,
		client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
		orderer_host: opts.orderer_host || opts.host,
		channel_id: opts.channel_id,
		start_block: null,												// setting these to null will grab the "newest" block
		stop_block: null,
		funk: 'getChannelConfigBlockFromOrderer',
	};
	getChannelBlockFromOrderer(n_opts, (err: any, resp: any) => {		// after getting the latest block, find its config block section
		let config_block_number = null;

		// navigate using the protoc structure
		if (resp && resp.data && resp.data.block && resp.data.block.metadata && resp.data.block.metadata.metadataList) {
			if (resp.data.block.metadata.metadataList[1] && resp.data.block.metadata.metadataList[1].value.index !== 'undefined') {
				config_block_number = resp.data.block.metadata.metadataList[1].value.index;
				logger.debug('[stitch] (1) config block is in block number ', config_block_number);
			}
		}

		// still not found, navigate using the non-protoc structure - v1
		if (config_block_number === null) {
			if (resp && resp.data && resp.data.block && resp.data.block.metadata && resp.data.block.metadata.metadata_list) {
				if (resp.data.block.metadata.metadata_list[1] && resp.data.block.metadata.metadata_list[1].value.index !== 'undefined') {
					config_block_number = resp.data.block.metadata.metadata_list[1].value.index;
					logger.debug('[stitch] (2) config block is in block number', config_block_number);
				}
			}
		}

		// still not found, navigate using the non-protoc structure - v2
		if (config_block_number === null) {
			if (resp && resp.data && resp.data.block && resp.data.block.metadata && resp.data.block.metadata.metadata) {
				if (resp.data.block.metadata.metadata[1] && resp.data.block.metadata.metadata[1].value.index !== 'undefined') {
					config_block_number = resp.data.block.metadata.metadata[1].value.index;
					logger.debug('[stitch] (3) config block is in block number', config_block_number);
				}
			}
		}

		if (config_block_number === null) {
			logger.error('[stitch] could not find config block number from orderer', pp(resp));
			return cb(err, resp);
		} else {														// if we found the latest configs block number, go get it
			logger.info('[stitch] getChannelConfigBlockFromOrderer was successful');
			const c_opts = <any>{
				msp_id: opts.msp_id,
				client_cert_b64pem: opts.client_cert_b64pem,
				client_prv_key_b64pem: opts.client_prv_key_b64pem,
				client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
				orderer_host: opts.orderer_host || opts.host,
				channel_id: opts.channel_id,
				start_block: config_block_number,
				stop_block: config_block_number,
				include_bin: opts.include_bin,
				funk: 'getChannelConfigBlockFromOrderer',
				decoder: opts.decoder,
			};
			getChannelBlockFromOrderer(c_opts, (err2: any, resp2: any) => {
				return cb(err2, resp2);
			});
		}
	});
}

// ------------------------------------------
// Get Transaction by its ID
// ------------------------------------------
/*
	opts: {
		msp_id: "string",					// ex PeerOrg1
		client_cert_b64pem: "string",		// the org's signed cert in a base 64 encoded PEM format
		client_prv_key_b64pem: "string",	// the orgs private key in a base 64 encoded PEM format
		host: "http://peer_url.com:port",	// http/https **grpc-web** endpoint to reach your peer
		channel_id: "string",				// id of the channel
		tx_id: "string",					// id of the transaction to look up
	}
*/
function getTransactionById(opts: Fmt, cb: Function) {
	logger.info('*[stitch] building a proposal for getTransactionById');
	opts.funk = 'getTransactionById';

	// proposal time
	const p_opts = {
		msp_id: opts.msp_id,
		client_cert_b64pem: opts.client_cert_b64pem,
		client_prv_key_b64pem: opts.client_prv_key_b64pem,
		client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
		channel_id: null,								// this is null on purpose
		chaincode_id: QSCC,
		chaincode_type: ChaincodeSpec.Type.GOLANG,
		chaincode_function: 'GetTransactionByID',
		chaincode_args: [opts.channel_id, opts.tx_id],
		transientMap: null,
	};
	proposalLib.p_build_abstracted_signed_proposal_endorser(p_opts, (_: any, p_signed_proposal: any) => {		// build the signed proposal protobuf
		if (!p_signed_proposal) {
			logger.error('[stitch] error creating a signed proposal protobuf');
			return cb(fmt_err(opts, null, 'could not create proposal'), null);
		} else if (p_signed_proposal.errors) {
			logger.error('[stitch] input error creating a signed proposal protobuf');
			return cb(fmt_err(opts, null, p_signed_proposal.errors), null);
		} else {
			const pOpts = { p_signed_proposal: p_signed_proposal, host: opts.host, timeout_ms: opts.timeout_ms };
			send_proposal_req_timed(pOpts, (eMessage: string, obj: UnaryReqResponse) => {
				if (eMessage) {										// grpc req had errors
					logger.error('[stitch] getTransactionById was not successful');
					return cb(fmt_err(opts, obj.grpc_data, eMessage), null);
				} else {											// grpc req is successful
					logger.info('[stitch] getTransactionById was successful');
					const ret = {
						transaction: decode_processed_transaction(obj.b_payload),
						channel_id: opts.channel_id,
						tx_id: opts.tx_id,
					};
					return cb(null, fmt_ok(opts, obj.grpc_data, ret));
				}
			});
		}
	});
}

// ------------------------------------------
// Get Block by a Transaction ID
// ------------------------------------------
/*
	opts: {
		msp_id: "string",					// ex PeerOrg1
		client_cert_b64pem: "string",		// the org's signed cert in a base 64 encoded PEM format
		client_prv_key_b64pem: "string",	// the orgs private key in a base 64 encoded PEM format
		host: "http://peer_url.com:port",	// http/https **grpc-web** endpoint to reach your peer
		channel_id: "string",				// id of the channel
		tx_id: "string",					// id of the transaction to look up
		include_bin: false,								// [optional] if the pb should be returned or not
		decoder: 'v1' || 'v2' || 'v3' || 'none'	// [optional]
	}
*/
function getBlockByTransactionId(opts: Fmt, cb: Function) {
	logger.info('*[stitch] building a proposal for getBlockByTransactionId');
	opts.funk = 'getBlockByTransactionId';

	// proposal time
	const p_opts = {
		msp_id: opts.msp_id,
		client_cert_b64pem: opts.client_cert_b64pem,
		client_prv_key_b64pem: opts.client_prv_key_b64pem,
		client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
		channel_id: null,								// this is null on purpose
		chaincode_id: QSCC,
		chaincode_type: ChaincodeSpec.Type.GOLANG,
		chaincode_function: 'GetBlockByTxID',
		chaincode_args: [opts.channel_id, opts.tx_id],
		transientMap: null,
	};
	proposalLib.p_build_abstracted_signed_proposal_endorser(p_opts, (_: any, p_signed_proposal: any) => {		// build the signed proposal protobuf
		if (!p_signed_proposal) {
			logger.error('[stitch] error creating a signed proposal protobuf');
			return cb(fmt_err(opts, null, 'could not create proposal'), null);
		} else if (p_signed_proposal.errors) {
			logger.error('[stitch] input error creating a signed proposal protobuf');
			return cb(fmt_err(opts, null, p_signed_proposal.errors), null);
		} else {
			const timeout_ms = (opts.timeout_ms && !isNaN(opts.timeout_ms)) ? Number(opts.timeout_ms) : _sto.fabric_get_block_timeout_ms;
			const pOpts = { p_signed_proposal: p_signed_proposal, host: opts.host, timeout_ms: timeout_ms };
			send_proposal_req_timed(pOpts, (eMessage: string, obj: UnaryReqResponse) => {
				if (eMessage) {										// grpc req had errors
					logger.error('[stitch] getBlockByTransactionId was not successful');
					return cb(fmt_err(opts, obj.grpc_data, eMessage), null);
				} else {											// grpc req is successful
					logger.info('[stitch] getBlockByTransactionId was successful');
					const ret = {
						block: decode_block(opts, obj.b_payload),										// decoded block goes here
						channel_id: opts.channel_id,
						tx_id: opts.tx_id,
					};
					return cb(null, fmt_ok(opts, obj.grpc_data, ret));
				}
			});
		}
	});
}

// ------------------------------------------
// Submit Config Update to an Orderer
// ------------------------------------------
/*
	opts: {
		msp_id: "string",								// ex PeerOrg1
		client_cert_b64pem: "string",					// the org's signed cert in a base 64 encoded PEM format
		client_prv_key_b64pem: "string",				// the orgs private key in a base 64 encoded PEM format
		orderer_host: "http://orderer_url.com:port",	// http endpoint to a grpc-web compatible proxy
		config_update: <protobuf || "b64 string">,		// config update protobuf for this channel
		config_update_signatures: ["string"],			// array of signatures as base64 strings
	}
*/
function submitConfigUpdate(opts: Fmt, cb: Function) {
	let error: string | null = null;					// record if there is an error
	opts.funk = 'submitConfigUpdate';
	let grpc_data: GrpcData = {							// organize the response object here, it will arrive piece wise
		status: null,
		statusMessage: null,
		headers: null,
		message: null,
		trailers: null,
		_proxy_resp: {									// this holds details about the grpc req between the browser and the grpcweb proxy
			code: undefined,							// it does not hold details about the grpc req between the grpcweb proxy and the component
			status_message: ''
		},
		_b64_payload: ''
	};

	// decode config update so we can get the channel id
	load_pb((pb_root: any) => {
		if (typeof opts.config_update === 'string') {
			logger.debug('[stitch] the config update is a string, converting to pb');
			opts.config_update = base64ToUint8Array(opts.config_update);
		}

		const config_update = configTxLib.__decode_config_update(<Uint8Array>opts.config_update);
		logger.debug('[stitch] config update decoded:', pp(config_update));
		opts.channel_id = config_update.channelId;

		// ------------------------ Build a config update proposal ------------------------ //
		logger.info('*[stitch] building a proposal for submitConfigUpdate');
		proposalLib.p_build_abstracted_signed_proposal_config_update(<any>opts, (err: any, p_signed_proposal: Proposal_SignedProposal) => {
			if (err && err.errors) {
				logger.error('[stitch] input error creating a signed proposal protobuf for seeking');
				return cb(fmt_err(opts, null, err.errors), null);
			} else if (!p_signed_proposal) {
				logger.error('[stitch] error creating a signed proposal protobuf for seeking');
				return cb(fmt_err(opts, null, 'could not create proposal'), null);
			} else {
				logger.debug('[stitch] sending the signed proposal - deliver 2');

				// ------------------------ Build the GRPC Web Client ------------------------ //
				const client = grpc.client(AtomicBroadcast.Broadcast, {
					host: <string>opts.orderer_host || <string>opts.host,
					transport: grpc.WebsocketTransport(),
				});
				client.onHeaders((headers: grpc.Metadata) => {
					logger.debug('[stitch] received headers in streaming broadcast response:', pp(headers));
					grpc_data.headers = headers;
				});
				client.onMessage((p_broadcast_response: any) => {
					const broadcast_response = p_broadcast_response.toObject();
					logger.debug('[stitch] received msg in streaming broadcast response:', pp(broadcast_response));

					if (broadcast_response) {
						grpc_data.status = broadcast_response.status;
						grpc_data.statusMessage = broadcast_response.info;
					}
				});
				client.onEnd((proxy_status_code: grpc.Code, proxy_status_msg: string, trailers: grpc.Metadata) => {		// all done
					logger.debug('[stitch] received trailers in streaming broadcast response:', proxy_status_code, proxy_status_msg, trailers);
					grpc_data.trailers = trailers;										// component field
					grpc_data._proxy_resp.code = proxy_status_code;						// proxy field
					grpc_data._proxy_resp.status_message = proxy_status_msg;			// proxy field
					grpc_data = fill_in_missing(grpc_data);

					// --- Check for Error Codes --- //
					if (is_error_code(grpc_data.status)) {	// an error happened if status is not 200 nor 0
						logger.error('[stitch] received error status in grpc streaming broadcast response', pp(grpc_data));
						error = 'submit config update failed';
						logger.error('[stitch] submitConfigUpdate was not successful');
						return cb(fmt_err(opts, grpc_data, error), null);
					} else {
						logger.info('[stitch] submitConfigUpdate was successful');
						const ret = fmt_ok(opts, grpc_data, { channel_id: opts.channel_id });
						return cb(null, ret);
					}
				});

				client.start();							// start the web-client
				client.send(p_signed_proposal);			// send this proposal to the server
				client.finishSend();					// tell the server we are done
			}
		});
	});
}

// wrapper on build config update json -> bin
function configUpdateJsonToBinary(config_update: object, cb: Function) {
	load_pb((pb_root: any) => {
		const bin = configTxLib.__b_build_config_update(config_update);
		return cb(null, bin);
	});
}

// wrapper on build config update bin -> json
function configUpdateBinaryToJson(config_update: Uint8Array, cb: Function) {
	load_pb((pb_root: any) => {
		const obj = configTxLib.__decode_config_update(config_update);
		return cb(null, obj);
	});
}

// ------------------------------------------
// Get Chaincode Details from a Peer
// ------------------------------------------
/*
	opts: {
		msp_id: "string",						// ex PeerOrg1
		client_cert_b64pem: "string",			// the org's signed cert in a base 64 encoded PEM format
		client_prv_key_b64pem: "string",		// the orgs private key in a base 64 encoded PEM format
		host: "http://peer_url.com:port",		// http/https **grpc-web** endpoint to reach your peer
		channel_id: "first",					// the channel to get cc details on
		chaincode_id: "marbles"					// the chaincode name
	}
*/
function getChaincodeDetailsFromPeer(opts: Fmt, cb: Function) {
	logger.info('*[stitch] building a proposal for getChaincodeDetailsFromPeer');
	opts.funk = 'getChaincodeDetailsFromPeer';
	const p_opts = {
		msp_id: opts.msp_id,
		client_cert_b64pem: opts.client_cert_b64pem,
		client_prv_key_b64pem: opts.client_prv_key_b64pem,
		client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
		channel_id: opts.channel_id,								// channel's name
		chaincode_id: LSCC,
		chaincode_type: ChaincodeSpec.Type.GOLANG,
		chaincode_function: 'getccdata',
		chaincode_args: [opts.channel_id, opts.chaincode_id],		// channel's name (again!?), chaincode's id
		transientMap: null,
	};
	proposalLib.p_build_abstracted_signed_proposal_endorser(p_opts, (_: any, p_signed_proposal: any) => {		// build the signed proposal protobuf
		if (!p_signed_proposal) {
			logger.error('[stitch] error creating a signed proposal protobuf');
			return cb(fmt_err(opts, null, 'could not create proposal'), null);
		} else if (p_signed_proposal.errors) {
			logger.error('[stitch] input error creating a signed proposal protobuf');
			return cb(fmt_err(opts, null, p_signed_proposal.errors), null);
		} else {
			const pOpts = { p_signed_proposal: p_signed_proposal, host: opts.host, timeout_ms: opts.timeout_ms };
			send_proposal_req_timed(pOpts, (eMessage: string, obj: UnaryReqResponse) => {
				if (eMessage) {												// grpc req had errors
					logger.error('[stitch] getChaincodeDetailsFromPeer was not successful');
					return cb(fmt_err(opts, obj.grpc_data, eMessage), null);
				} else {													// grpc req is successful
					if (!obj.b_payload) {
						logger.warn('[stitch] getChaincodeDetailsFromPeer was expecting data in payload, response is empty');
						const data = { chaincodesList: [], details: 'grpc payload is empty' };
						return cb(null, fmt_ok(opts, obj.grpc_data, data));
					} else {												// format the data before returning
						logger.info('[stitch] getChaincodeDetailsFromPeer was successful');

						const chaincode_data = __decode_chaincode_data_full(obj.b_payload);
						logger.debug('[stitch] getChaincodeDetailsFromPeer decoded data successfully', chaincode_data);
						return cb(null, fmt_ok(opts, obj.grpc_data, chaincode_data));
					}
				}
			});
		}
	});
}

// ------------------------------------------
// Check Chaincode on a channel
// ------------------------------------------
function checkIfChaincodeExists(opts: Fmt, cb: Function) {
	logger.info('*[stitch] building a proposal for checkIfChaincodeExists');
	opts.funk = 'checkIfChaincodeExists';
	const p_opts = {
		msp_id: opts.msp_id,
		client_cert_b64pem: opts.client_cert_b64pem,
		client_prv_key_b64pem: opts.client_prv_key_b64pem,
		client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
		channel_id: opts.channel_id,
		chaincode_id: LSCC,
		chaincode_type: ChaincodeSpec.Type.GOLANG,
		chaincode_function: 'getid',
		chaincode_args: [opts.channel_id, opts.chaincode_id],
		transientMap: null,
	};
	proposalLib.p_build_abstracted_signed_proposal_endorser(p_opts, (_: any, p_signed_proposal: any) => {		// build the signed proposal protobuf
		if (!p_signed_proposal) {
			logger.error('[stitch] error creating a signed proposal protobuf');
			return cb(fmt_err(opts, null, 'could not create proposal'), null);
		} else if (p_signed_proposal.errors) {
			logger.error('[stitch] input error creating a signed proposal protobuf');
			return cb(fmt_err(opts, null, p_signed_proposal.errors), null);
		} else {
			const pOpts = { p_signed_proposal: p_signed_proposal, host: opts.host, timeout_ms: opts.timeout_ms };
			send_proposal_req_timed(pOpts, (eMessage: string, obj: UnaryReqResponse) => {
				if (eMessage) {												// grpc req had errors
					logger.error('[stitch] checkIfChaincodeExists was not successful');
					return cb(fmt_err(opts, obj.grpc_data, eMessage), null);
				} else {													// grpc req is successful
					if (!obj.b_payload) {
						logger.warn('[stitch] checkIfChaincodeExists was expecting data in payload, response is empty');
						const data = { chaincodesList: [], details: 'grpc payload is empty' };
						return cb(null, fmt_ok(opts, obj.grpc_data, data));
					} else {												// format the data before returning
						logger.info('[stitch] checkIfChaincodeExists was successful');
						const resp = uint8ArrayToStr(obj.b_payload) + ' exists';
						return cb(null, fmt_ok(opts, obj.grpc_data, resp));
					}
				}
			});
		}
	});
}

// choose a block decoder
function decode_block(opts: { decoder: string | undefined }, b_payload: Uint8Array) {
	if (opts.decoder === 'v1') {
		return decodeBlock(b_payload);
	} else if (opts.decoder === 'v2') {
		return decodeBlockV2(b_payload);
	} else if (opts.decoder === 'v3') {
		return camelCase_2_underscores(decodeBlockV2(b_payload), 0);
	} else if (opts.decoder === 'none') {
		return undefined;
	} else {
		return decodeBlock(b_payload);			// default - use legacy decoder
	}
}

/*
// create a whole bunch of pub/priv keys and sign and verify signatures with subtle crypto
// used to debug validation problems and see how they are built
// helped find that trouble with leading 0x0s
function sigTest() {
	const MAX = 35;
	const repeat = [];
	for (let i = 0; i < MAX; i++) {
		repeat.push(i);
	}
	const results = {
		a_failures: 0,
		a_successes: 0,
		b_failures: 0,
		b_successes: 0,
		import_fail: 0,
	};

	async.eachLimit(repeat, 1, (i: string, cb_joined: Function) => {
		console.log('\non', i);
		genAndValidate(i + 'a', (seq: string, valid: boolean) => {
			if (valid === false) {
				if (seq === 'a') {
					console.error('FAILURE a');
					results.a_failures++;
				} else if (seq === 'b') {
					console.error('FAILURE b');
					results.b_failures++;
				} else if (seq === 'i') {
					results.import_fail++;
				}
			} else {
				if (seq === 'a') {
					results.a_successes++;
				} else if (seq === 'b') {
					results.b_successes++;
				}
			}
			return cb_joined();
		});
	}, () => {
		console.log('all done', results);
	});

	function genAndValidate(on: string, cb: Function) {
		const tag = '[' + on + ']';
		const key_pair = genKeyPair(null);
		const jwks = pem2jwks({ pubKeyPEM: key_pair.pubKeyPEM, prvKeyPEM: key_pair.prvKeyPEM });

		if (!jwks || !jwks.public) {
			console.error('failed to import key');
			return cb('i', false);
		} else {
			console.log(tag, 'jwks public', jwks.public);
			console.log(tag, 'jwks private', jwks.private);
			importJwkEcdsaKey(jwks.public, (_1: any, cryptoKey1: CryptoKey) => {
				console.log(tag, 'crypto public key', cryptoKey1);

				// test signature 2
				signAndValidate(<any>jwks.private, key_pair.prvKeyPEM, cryptoKey1, on, (valid: boolean) => {
					console.log('first attempt...', valid);
					if (valid === true) {
						return cb('a', valid);
					} else {
						console.log('trying again...');
						on += 'b';
						signAndValidate(<any>jwks.private, key_pair.prvKeyPEM, cryptoKey1, on, (valid2: boolean) => {
							return cb('b', valid2);
						});
					}
				});
			});
		}
	}

	function signAndValidate(privateJwk: Jwk, prvKeyPEM: string, pubKeyCrypto: CryptoKey, on: string, cb: Function) {
		const tag = '[' + on + ']';

		// test signature 2
		const raw_msg = new Uint8Array([0x0, 0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7]);
		//sign(prvKeyPEM, raw_msg, null, (_2: any, der: Uint8Array) => {
		scSignJwkRaw(raw_msg, privateJwk, (_: any, new_sig: any) => {
			console.log(tag, 'signature orig:', new_sig.length, new_sig);
			// 1. orig sig has -0 at position 32... weird? are we handling it, is that okay
			// 2. 0x0 is being dropped between the "before" and "after" (it went through hex transforms and sig2der der2sig)
			const before = uint8ArrayToHexStr(new_sig, true);

			const der = <any>sig2der(new_sig, 'P-256');
			const sig: Uint8Array = <Uint8Array>der2sig(<any>der);
			console.log(tag, 'signature der:', der.length, der);
			console.log(tag, 'signature after:', sig.length, sig);
			const after = uint8ArrayToHexStr(sig, true);
			console.log(tag, 'before:', before.length, before);
			console.log(tag, 'after :', after.length, after);
			if (before !== after) {
				console.log('!!! diff. sig changed. okay if preventMalleability did its job...');
			} else {
				console.log('same same');
			}

			subtleVerifySignature(pubKeyCrypto, sig, raw_msg, (_3: any, valid: boolean) => {
				if (valid === true) {
					console.log(tag, 'valid 1:', valid);
					return cb(valid);
				} else {
					console.error('failed on first sig+validate', new_sig);

					subtleVerifySignature(pubKeyCrypto, new_sig, raw_msg, (_4: any, valid2: boolean) => {
						console.log(tag, 'orig sig valid:', valid2);
						return cb(valid);		// return the first one, b/cr redoing the orig is just a test
					});
				}
			});
		});
	}
}
*/

interface UnaryReqResponse {
	grpc_data: any;
	b_payload: any;
}

interface Spr {
	p_signed_proposal: any;
	host: string | undefined;
	timeout_ms: number | undefined;
	fmt_payload?: Function;
}
