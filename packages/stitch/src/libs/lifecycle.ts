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
const async = require('async');

// Libs from protoc
import { ChaincodeSpec } from '../protoc/output/peer/chaincode_pb';

// Libs built by us
import { ProposalLib } from './proto_handlers/proposal_pb_lib';
import { ProposalResponseLib } from './proto_handlers/proposal_response_pb_lib';
import { fmt_err, fmt_ok, Fmt, OrderFmt, GrpcData } from './validation';
import { __pb_root, load_pb, logger, uint8ArrayToStr, url_join } from './misc';
import { UnaryReqResponse, send_proposal_req_timed, LIFECYCLE, _sto, orderTransaction } from '../stitch';
import { LifecycleLib, HiLvl } from './proto_handlers/lifecycle_pb_lib';

// exports [these functions all require Fabric 2.x]
export {
	lc_installChaincode, lc_getInstalledChaincodeData, lc_getInstalledChaincodePackage, lc_getAllInstalledChaincodeData, lc_approveChaincodeDefinition,
	lc_checkChaincodeDefinitionReadiness, lc_commitChaincodeDefinition, lc_getChaincodeDefinitionOnChannel, lc_getAllChaincodeDefinitionsOnChannel,
	gather_endorsements,
};

const lifecycleLib = new LifecycleLib();
const proposalLib = new ProposalLib();
const proposalResponseLib = new ProposalResponseLib();

// dsh todo increase max file size on grpcwp route b/c chaincode is much larger now

// notes:
// - the double underscore before functions indicates that load_pb() should be called before calling said function.
// - the _b prefix on a function indicates it returns a serialized protobuf message as binary.
// - I cannot find argument structure for lifecycle scc functions: `QueryOrgApprovals()` or `QueryNamespaceDefinitions()`.

// ------------------------------------------
// generic endorse tx - returns stitch formatted errors and responses
// ------------------------------------------
function endorseTx(o_opts: any, p_opts: any, st_opts: StitchOpts, cb: Function) {

	// first build the proposal - this is complicated
	proposalLib.p_build_abstracted_signed_proposal_endorser(p_opts, (_: any, p_signed_proposal: any) => {		// build the signed proposal protobuf
		if (!p_signed_proposal) {
			logger.error('[stitch] ' + o_opts.funk + ' error creating a signed proposal protobuf');
			return cb(fmt_err(o_opts, null, 'could not create proposal'), null);
		} else if (p_signed_proposal.errors) {
			logger.error('[stitch] ' + o_opts.funk + ' input error creating a signed proposal protobuf');
			return cb(fmt_err(o_opts, null, p_signed_proposal.errors), null);
		} else {

			// next send the proposal - using the "timed" wrapper to timeout manually (grpc web client doesn't support custom timeouts atm)
			const pOpts = { p_signed_proposal: p_signed_proposal, host: o_opts.host, timeout_ms: st_opts.timeout_ms };
			send_proposal_req_timed(pOpts, (eMessage: string, obj: UnaryReqResponse) => {							// send it to the peer
				if (eMessage) {																						// grpc req had errors
					logger.error('[stitch] ' + o_opts.funk + ' was not successful');
					return cb(fmt_err(o_opts, obj.grpc_data, eMessage), null);
				} else {																							// grpc req is successful
					if ((!obj || !obj.b_payload)) {
						if (st_opts.empty_resp === null) {															// if empty resp fmt not given, resp is err
							logger.error('[stitch] ' + o_opts.funk + ' was expecting data in payload, but response is empty');
							return cb(fmt_err(o_opts, obj.grpc_data, 'grpc payload is empty'), null);
						} else {																					// if an empty resp format is given, use it
							logger.debug('[stitch] ' + o_opts.funk + ' received empty payload, formatting an empty response');
							return cb(null, fmt_ok(o_opts, obj.grpc_data, st_opts.empty_resp));
						}
					} else {																						// format the data before returning
						logger.info('[stitch] ' + o_opts.funk + ' was successful');
						const response = st_opts.payload_decoder ? st_opts.payload_decoder(obj.b_payload) : null;
						return cb(null, fmt_ok(o_opts, obj.grpc_data, response));
					}
				}
			});
		}
	});
}

// ------------------------------------------
// Install Chaincode on a Peer
// same as peer cli `peer lifecycle chaincode install`
// ------------------------------------------
/*
	opts: {
		// string - msp id. example: PeerOrg1
		"msp_id": "Org1MSP",

		// string - the org's signed cert in a base 64 encoded PEM format
		"client_cert_b64pem": "<b64 pem string>",

		// string - the orgs private key in a base 64 encoded PEM format
		"client_prv_key_b64pem": "<b64 pem string>",

		// string - http/https **grpc-web** endpoint to reach your peer
		"host": "http://peer_url.com:port",

		// binary data of the chaincode LIFECYCLE package. use the peer's cli to create this.
		// example commands to build package:
		// > peer lifecycle chaincode package marbles.tar.gz --path ./go/src/github.com/ibm-blockchain/marbles/chaincode/src/marbles --lang golang --label marbles_1
		// notes that the marbles' repo is inside $GOPATH and "marbles.tar.gz" is the name of the output file, which is dropped at $PWD
		"chaincode_lifecycle_package": <Uint8Array>		// (yes, this is literally a tar.gz file)

		// [optional] integer - client side timeout of this request (milliseconds)
		"timeout_ms": 240000
	}
*/
function lc_installChaincode(opts: Fmt4, cb: Function) {
	load_pb(() => {
		logger.info('*[stitch] building a proposal for lc_installChaincode');
		opts.funk = 'lc_installChaincode';

		// dsh todo test chaincode package by parsing it first...
		if (!opts.chaincode_lifecycle_package) {
			logger.error('[stitch] "chaincode_lifecycle_package" is missing, cannot install');
			return cb(fmt_err(opts, null, 'missing chaincode package'), null);
		} else {
			// proposal time
			const p_opts = {
				msp_id: opts.msp_id,
				client_cert_b64pem: opts.client_cert_b64pem,
				client_prv_key_b64pem: opts.client_prv_key_b64pem,
				client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
				channel_id: null,											// this is null on purpose
				chaincode_id: LIFECYCLE,
				chaincode_type: ChaincodeSpec.Type.GOLANG, 					// this is not the type of chaincode we are installing, its the type of life cycle chaincode
				chaincode_function: 'InstallChaincode',
				chaincode_args: [uint8ArrayToStr(lifecycleLib.__b_build_install_chaincode_args(opts.chaincode_lifecycle_package))],
				transientMap: null,
			};
			const stitch_opts = {
				timeout_ms: (opts.timeout_ms && !isNaN(opts.timeout_ms)) ? Number(opts.timeout_ms) : _sto.fabric_lc_install_cc_timeout_ms,	// cc can take a bit
				payload_decoder: lifecycleLib.__decode_install_chaincode_result,
				empty_resp: null,
			};
			endorseTx(opts, p_opts, stitch_opts, (stitch_error: any, stitch_resp: any) => {
				// fabric's response:
				// {
				//		"label": "fabcar_1"
				//		"packageId": "fabcar_1:92321c359d1efcd65dc34c6ee334e37870a4a2130889473173fad3ddf7c02249"
				// }
				return cb(stitch_error, stitch_resp);
			});
		}
	});
}

// ------------------------------------------
// Get installed chaincode's metadata from a Peer - [single cc]
// This api is worthless if the chaincode definition is NOT committed (you won't get back anything you don't already know)
// same as peer cli `peer lifecycle chaincode queryinstalled --name marbles`
// ------------------------------------------
/*
	opts: {
		msp_id: "Org1MSP",											// string - msp id. example: PeerOrg1
		client_cert_b64pem: "<b64 pem string>",						// string - the org's signed cert in a base 64 encoded PEM format
		client_prv_key_b64pem: "<b64 pem string>",					// string - the orgs private key in a base 64 encoded PEM format
		host: "http://peer_url.com:port",							// string - http/https **grpc-web** endpoint to reach your peer

		package_id: "marbles_1:92321c35..."							// string - id of the chaincode package (id is in the resp of cc install)

		timeout_ms: 240000											// [optional] integer - client side timeout of this request (milliseconds)
	}
*/
function lc_getInstalledChaincodeData(opts: Fmt2, cb: Function) {
	load_pb(() => {
		logger.info('*[stitch] building a proposal for lc_getInstalledChaincodeData');
		opts.funk = 'lc_getInstalledChaincodeData';
		if (!opts.package_id) {
			logger.error('[stitch] "package_id" is missing, cannot query installed cc');
			return cb(fmt_err(opts, null, 'missing package id'), null);
		} else {
			const p_opts = {
				msp_id: opts.msp_id,
				client_cert_b64pem: opts.client_cert_b64pem,
				client_prv_key_b64pem: opts.client_prv_key_b64pem,
				client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
				channel_id: null,										// this is null on purpose
				chaincode_id: LIFECYCLE,
				chaincode_type: ChaincodeSpec.Type.GOLANG,
				chaincode_function: 'QueryInstalledChaincode',
				chaincode_args: [uint8ArrayToStr(lifecycleLib.__b_build_query_installed_chaincode_args(opts.package_id))],
				transientMap: null,
			};
			const stitch_opts = {
				timeout_ms: opts.timeout_ms,
				payload_decoder: lifecycleLib.__decode_query_installed_chaincode_result,
				empty_resp: null,
			};
			endorseTx(opts, p_opts, stitch_opts, (stitch_error: any, stitch_resp: any) => {
				// fabric's response:
				// {
				//		"label": "fabcar_1"
				//		"packageId": "fabcar_1:92321c359d1efcd65dc34c6ee334e37870a4a2130889473173fad3ddf7c02249"
				//
				//		// if committed it will have this field:
				//		"references": {
				//			"mychannel": {							// channel names
				//				"chaincodes": [{
				//					"name": "fabcar",
				//					"version": "1"
				//				}]
				//			}
				//		}
				// }
				return cb(stitch_error, stitch_resp);
			});
		}
	});
}

// ------------------------------------------
// Get all installed chaincodes on a Peer - [multiple cc]
// same as peer cli `peer lifecycle chaincode queryinstalled`
// ------------------------------------------
/*
	opts: {
		msp_id: "Org1MSP",											// string - msp id. example: PeerOrg1
		client_cert_b64pem: "<b64 pem string>",						// string - the org's signed cert in a base 64 encoded PEM format
		client_prv_key_b64pem: "<b64 pem string>",					// string - the orgs private key in a base 64 encoded PEM format
		host: "http://peer_url.com:port",							// string - http/https **grpc-web** endpoint to reach your peer

		timeout_ms: 240000											// [optional] integer - client side timeout of this request (milliseconds)
	}
*/
function lc_getAllInstalledChaincodeData(opts: Fmt, cb: Function) {
	load_pb(() => {
		logger.info('*[stitch] building a proposal for getInstalledChaincodeV2');
		opts.funk = 'getInstalledChaincodeV2';
		const p_opts = {
			msp_id: opts.msp_id,
			client_cert_b64pem: opts.client_cert_b64pem,
			client_prv_key_b64pem: opts.client_prv_key_b64pem,
			client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
			channel_id: null,										// this is null on purpose
			chaincode_id: LIFECYCLE,
			chaincode_type: ChaincodeSpec.Type.GOLANG,
			chaincode_function: 'QueryInstalledChaincodes',
			chaincode_args: [''],									// empty string required, fabric is weird
			transientMap: null,
		};
		const stitch_opts = {
			timeout_ms: opts.timeout_ms,
			payload_decoder: lifecycleLib.__decode_query_all_installed_chaincodes_result,
			empty_resp: {
				installedChaincodes: []
			},
		};
		endorseTx(opts, p_opts, stitch_opts, (stitch_error: any, stitch_resp: any) => {
			// fabric's response:
			// {
			//		"installedChaincodes": [
			//			{
			//				"label": "fabcar_1",
			//				"packageId": "fabcar_1:92321c359d1efcd65dc34c6ee334e37870a4a2130889473173fad3ddf7c02249"
			//
			//				// if committed it will have this field:
			//				"references": {
			//					"mychannel": {							// channel names
			//						"chaincodes": [{
			//							"name": "fabcar",
			//							"version": "1"
			//						}]
			//					}
			//				}
			// 			}
			//		]
			// }
			return cb(stitch_error, stitch_resp);
		});
	});
}

// ------------------------------------------
// Get Chaincode Package (tar.gz source code) from a Peer
// same as peer cli `peer lifecycle chaincode getinstalledpackage`
// ------------------------------------------
/*
	opts: {
		msp_id: "Org1MSP",											// string - msp id. example: PeerOrg1
		client_cert_b64pem: "<b64 pem string>",						// string - the org's signed cert in a base 64 encoded PEM format
		client_prv_key_b64pem: "<b64 pem string>",					// string - the orgs private key in a base 64 encoded PEM format
		host: "http://peer_url.com:port",							// string - http/https **grpc-web** endpoint to reach your peer

		package_id: "marbles_1:92321c35..."							// string - id of the chaincode package (id is in the resp of cc install)

		timeout_ms: 240000											// [optional] integer - client side timeout of this request (milliseconds)
	}
*/
function lc_getInstalledChaincodePackage(opts: Fmt2, cb: Function) {
	load_pb(() => {
		logger.info('*[stitch] building a proposal for lc_getInstalledChaincodePackage');
		opts.funk = 'lc_getInstalledChaincodePackage';

		if (!opts.package_id) {
			logger.error('[stitch] "package_id" is missing, cannot get cc package');
			return cb(fmt_err(opts, null, 'missing package id'), null);
		} else {
			const p_opts = {
				msp_id: opts.msp_id,
				client_cert_b64pem: opts.client_cert_b64pem,
				client_prv_key_b64pem: opts.client_prv_key_b64pem,
				client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
				channel_id: null,										// this is null on purpose
				chaincode_id: LIFECYCLE,
				chaincode_type: ChaincodeSpec.Type.GOLANG,
				chaincode_function: 'GetInstalledChaincodePackage',
				chaincode_args: [uint8ArrayToStr(lifecycleLib.__b_build_get_installed_chaincode_package_args(opts.package_id))],
				transientMap: null,
			};
			const stitch_opts = {
				timeout_ms: (opts.timeout_ms && !isNaN(opts.timeout_ms)) ? Number(opts.timeout_ms) : _sto.fabric_lc_get_cc_timeout_ms,	// cc can be large
				payload_decoder: lifecycleLib.__decode_get_installed_chaincode_package_result,
				empty_resp: null,
			};
			endorseTx(opts, p_opts, stitch_opts, (stitch_error: any, stitch_resp: any) => {
				// fabric's response:
				// {
				//		"chaincodeInstallPackage": "<base 64 encoded tar.gz file>" // this can be huge, is the cc package the peer cli built
				// }
				return cb(stitch_error, stitch_resp);
			});
		}
	});
}

// ------------------------------------------
// Approve cc definition on a channel - (this is the 1st step, use "lc_commitChaincodeDefinition()" to submit it)
// same as peer cli `peer lifecycle chaincode approveformyorg`
// ------------------------------------------
/*
	opts: {
		msp_id: "Org1MSP",											// string - msp id. example: PeerOrg1
		client_cert_b64pem: "<b64 pem string>",						// string - the org's signed cert in a base 64 encoded PEM format
		client_prv_key_b64pem: "<b64 pem string>",					// string - the orgs private key in a base 64 encoded PEM format
		host: "http://peer_url.com:port",							// string - http/https **grpc-web** endpoint to reach your peer
		orderer_host: "http://orderer_url.com:port"					// string - http/https **grpc-web** endpoint to reach your orderer
		channel_id: "first"											// string - id of the channel

		package_id: "marbles_1:92321c35..."							// [optional but usually set] string - id of the chaincode package (id is in resp of cc install)

		chaincode_sequence: 1,										// integer - tracks the number of times a chaincode def has been defined or updated
		chaincode_id: "marbles",									// string - chaincode id/name
		chaincode_version: "v1",									// string - chaincode version
		endorsement_plugin: "escc",									// [optional] string - system chaincode name to use to check endorsements
		validation_plugin: "vscc",									// [optional] string - system chaincode name to use to validate
		validation_parameter: "/Channel/Application/Endorsement"	// [optional] string - name of a channel sig policy to use for the cc's endorsement policy
		collections_obj: [{}] | null,								// [optional] string - array of static collection config (Scc), conforms to peer/collection.proto
		init_required: true,										// [optional] boolean - controls if the first invoke should be "init" or not

		timeout_ms: 240000											// [optional] integer - client side timeout of this request (milliseconds)
	}
*/
function lc_approveChaincodeDefinition(opts: Fmt3, cb: Function) {
	load_pb(() => {
		logger.info('*[stitch] building a proposal for lc_approveChaincodeDefinition');
		opts.funk = 'lc_approveChaincodeDefinition';

		const b_ccd = lifecycleLib.__b_build_approve_chaincode_definition_for_my_org_args_high(opts);
		if (!opts.package_id) {
			logger.warn('[stitch] "package_id" is missing, this is okay if it\'s on purpose');
		}

		if (!opts.orderer_host) {
			logger.error('[stitch] "orderer_host" is missing, cannot get approve cc definition');
			return cb(fmt_err(opts, null, 'orderer url is missing'), null);
		} else if (!b_ccd) {
			logger.error('[stitch] failed to build chaincode definition bin. check logs. policy might be malformed');
			return cb(fmt_err(opts, null, 'failed to build chaincode definition bin. check if policy is malformed'), null);
		} else {
			const p_opts = {
				msp_id: opts.msp_id,
				client_cert_b64pem: opts.client_cert_b64pem,
				client_prv_key_b64pem: opts.client_prv_key_b64pem,
				client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
				channel_id: opts.channel_id,
				chaincode_id: LIFECYCLE,
				chaincode_type: ChaincodeSpec.Type.GOLANG,
				chaincode_function: 'ApproveChaincodeDefinitionForMyOrg',
				chaincode_args: [uint8ArrayToStr(b_ccd)],
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

					// ---- Endorse the Transaction ---- //
					const pOpts = {
						p_signed_proposal: p_signed_proposal,
						host: opts.host,
						timeout_ms: opts.timeout_ms,
						fmt_payload: proposalResponseLib.b_alt_deserialize_payload
					};
					send_proposal_req_timed(pOpts, (eMessage: string, obj: UnaryReqResponse) => {
						if (eMessage) {														// grpc req had errors
							logger.error('[stitch] lc_approveChaincodeDefinition was not successful');
							return cb(fmt_err(opts, obj.grpc_data, eMessage), null);
						} else {															// grpc req is successful
							const msg = obj.grpc_data ? obj.grpc_data.message.toObject() : null;

							if (!msg || !msg.endorsement || !msg.endorsement.signature) {	// we don't use the "endorsement" field but it should be there
								logger.error('[stitch] lc_approveChaincodeDefinition was expecting an endorsement in the response but was not found', msg);
								return cb(fmt_err(opts, obj.grpc_data, 'peer response is missing endorsement'), null);
							} else if (!obj.b_payload) {
								logger.error('[stitch] lc_approveChaincodeDefinition was expecting data in payload, response is empty', msg);
								return cb(fmt_err(opts, obj.grpc_data, 'grpc payload is empty'), null);
							} else {
								logger.info('[stitch] endorsement for lc_approveChaincodeDefinition was successful', msg);

								// ---- Order the Transaction ---- //
								const order_opts: any = opts;								// prepare options to send tx to orderer
								order_opts.p_signed_proposal = p_signed_proposal;			// copy over the proposal we sent to the peer
								order_opts.arr_p_proposal_responses = [obj.grpc_data.message];		// actual endorsement data is in here
								orderTransaction(order_opts, (err2: any, orderer_grpc_data: any) => {
									if (err2) {
										logger.error('[stitch] error submitting lc_approveChaincodeDefinition tx for ordering');
										return cb(fmt_err(opts, obj.grpc_data, 'error during the ordering transaction submission'), null);
									} else {
										logger.info('[stitch] submitted lc_approveChaincodeDefinition tx for ordering');
										const ret = {
											tx_endorsed: true,
											tx_submitted: true,
											channel_id: opts.channel_id,
											chaincode_id: opts.chaincode_id,
											chaincode_version: opts.chaincode_version,
											package_id: opts.package_id,
										};
										return cb(null, fmt_ok(opts, obj.grpc_data, ret));
									}
								});
							}
						}
					});
				}
			});
		}
	});
}

// ------------------------------------------
// Check cc definition commit readiness on a channel
// same as peer cli `peer lifecycle chaincode checkcommitreadiness`
// ------------------------------------------
/*
	opts: {
		msp_id: "Org1MSP",											// string - msp id. example: PeerOrg1
		client_cert_b64pem: "<b64 pem string>",						// string - the org's signed cert in a base 64 encoded PEM format
		client_prv_key_b64pem: "<b64 pem string>",					// string - the orgs private key in a base 64 encoded PEM format
		host: "http://peer_url.com:port",							// string - http/https **grpc-web** endpoint to reach your peer
		channel_id: "first"											// string - id of the channel

		chaincode_sequence: 1,										// integer - tracks the number of times a chaincode def has been defined or updated
		chaincode_id: "marbles",									// string - chaincode id/name
		chaincode_version: "v1",									// string - chaincode version
		endorsement_plugin: "escc",									// [optional] string - system chaincode name to use to check endorsements
		validation_plugin: "vscc",									// [optional] string - system chaincode name to use to validate
		validation_parameter: "/Channel/Application/Endorsement"	// [optional] string - name of a channel sig policy to use for the cc's endorsement policy
		collections_obj: [{}] | null,								// [optional] string - array of static collection config (Scc), conforms to peer/collection.proto
		init_required: true,										// [optional] boolean - controls if the first invoke should be "init" or not

		timeout_ms: 240000											// [optional] integer - client side timeout of this request (milliseconds)
	}
*/
function lc_checkChaincodeDefinitionReadiness(opts: Fmt3, cb: Function) {
	load_pb(() => {
		logger.info('*[stitch] building a proposal for lc_checkChaincodeDefinitionReadiness');
		opts.funk = 'lc_checkChaincodeDefinitionReadiness';

		const b_ccd = lifecycleLib.__b_build_check_commit_readiness_args_high(opts);
		if (!b_ccd) {
			logger.error('[stitch] failed to build chaincode definition bin. check logs. policy might be malformed');
			return cb(fmt_err(opts, null, 'failed to build chaincode definition bin. check if policy is malformed'), null);
		} else {
			const p_opts = {
				msp_id: opts.msp_id,
				client_cert_b64pem: opts.client_cert_b64pem,
				client_prv_key_b64pem: opts.client_prv_key_b64pem,
				client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
				channel_id: opts.channel_id,
				chaincode_id: LIFECYCLE,
				chaincode_type: ChaincodeSpec.Type.GOLANG,
				chaincode_function: 'CheckCommitReadiness',
				chaincode_args: [uint8ArrayToStr(b_ccd)],
				transientMap: null,
			};
			const stitch_opts = {
				timeout_ms: opts.timeout_ms,
				payload_decoder: lifecycleLib.__decode_check_commit_readiness_result,
				empty_resp: null,
			};
			endorseTx(opts, p_opts, stitch_opts, (stitch_error: any, stitch_resp: any) => {
				// fabric's response:
				// {
				//		"approvals": {		// the keys are members of the channel (I think), the values are the state of their approval
				//			"Org1MSP": false
				//			"Org2MSP": false
				//		}
				// }
				return cb(stitch_error, stitch_resp);
			});
		}
	});
}

// ------------------------------------------
// Commit a chaincode definition on a channel (this is the 2nd step, use "lc_approveChaincodeDefinition()" to create it)
// dsh - it seems you can commit over and over? is this a sign of a mistake?
// same as peer cli `peer lifecycle chaincode commit`
// ------------------------------------------
/*
	opts: {
		msp_id: "Org1MSP",											// string - msp id. example: PeerOrg1
		client_cert_b64pem: "<b64 pem string>",						// string - the org's signed cert in a base 64 encoded PEM format
		client_prv_key_b64pem: "<b64 pem string>",					// string - the orgs private key in a base 64 encoded PEM format
		hosts: ["http://peer_url.com:port"],						// array of strings - http/https **grpc-web** endpoint to reach each peer
		proxy_route: "https://ibpconsole.com/grpcwp",
		orderer_host: "http://orderer_url.com:port"					// string - http/https **grpc-web** endpoint to reach your orderer
		channel_id: "first"											// string - id of the channel

		chaincode_sequence: 1,										// integer - tracks the number of times a chaincode def has been defined or updated
		chaincode_id: "marbles",									// string - chaincode id/name
		chaincode_version: "v1",									// string - chaincode version
		endorsement_plugin: "escc",									// [optional] string - system chaincode name to use to check endorsements
		validation_plugin: "vscc",									// [optional] string - system chaincode name to use to validate
		validation_parameter: "/Channel/Application/Endorsement"	// [optional] string - name of a channel sig policy to use for the cc's endorsement policy
		collections_obj: [{}] | null,								// [optional] string - array of static collection config (Scc), conforms to peer/collection.proto
		init_required: true,										// [optional] boolean - controls if the first invoke should be "init" or not

		timeout_ms: 240000											// [optional] integer - client side timeout of this request (milliseconds)
	}
*/
function lc_commitChaincodeDefinition(opts: Fmt5, cb: Function) {
	load_pb(() => {
		logger.info('*[stitch] building a proposal for lc_commitChaincodeDefinition');
		opts.funk = 'lc_commitChaincodeDefinition';

		const b_ccd = lifecycleLib.__b_build_commit_chaincode_definition_args_high(opts);
		if (!opts.orderer_host) {
			logger.error('[stitch] "orderer_host" is missing, cannot commit cc definition');
			return cb(fmt_err(opts, null, 'orderer url is missing'), null);
		} else if (!Array.isArray(opts.hosts) || opts.hosts.length === 0) {
			logger.error('[stitch] "hosts" array is missing, cannot commit cc definition');
			return cb(fmt_err(opts, null, 'array of host urls are missing'), null);
		} else if (!b_ccd) {
			logger.error('[stitch] failed to build chaincode definition bin. check logs. policy might be malformed');
			return cb(fmt_err(opts, null, 'failed to build chaincode definition bin. check if policy is malformed'), null);
		} else {
			const p_opts = {
				msp_id: opts.msp_id,
				client_cert_b64pem: opts.client_cert_b64pem,
				client_prv_key_b64pem: opts.client_prv_key_b64pem,
				client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
				channel_id: opts.channel_id,
				chaincode_id: LIFECYCLE,
				chaincode_type: ChaincodeSpec.Type.GOLANG,
				chaincode_function: 'CommitChaincodeDefinition',
				chaincode_args: [uint8ArrayToStr(b_ccd)],
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

					// ---- Gather all Endorsements ---- //
					gather_endorsements(opts, p_signed_proposal, (endorsement_errs: string[], resps: { grpc_responses: GrpcData[], proposal_resps: any[] }) => {

						// ---- Order the Transaction ---- //
						//const order_opts = <any>opts;
						//order_opts.p_signed_proposal = p_signed_proposal;					// copy over the proposal we sent to the peer
						//order_opts.arr_p_proposal_responses = resps.proposal_resps;		// actual endorsement data is in here
						const order_opts = <OrderFmt>{										// prepare options to send tx to orderer
							orderer_host: opts.orderer_host,
							p_signed_proposal: p_signed_proposal,							// copy over the proposal we sent to the peer
							arr_p_proposal_responses: resps.proposal_resps,					// actual endorsement data is in here
							msp_id: opts.msp_id,
							client_cert_b64pem: opts.client_cert_b64pem,
							client_prv_key_b64pem: opts.client_prv_key_b64pem,
							client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
							include_bin: opts.include_bin,
						};
						orderTransaction(order_opts, (err2: any, orderer_grpc_data: any) => {
							if (err2) {
								logger.error('[stitch] error submitting lc_commitChaincodeDefinition tx for ordering');
								return cb(fmt_err(opts, resps.grpc_responses, 'error during the ordering transaction submission'), null);
							} else {
								logger.info('[stitch] submitted lc_commitChaincodeDefinition tx for ordering');
								const ret = {
									tx_endorsed: true,
									tx_submitted: true,
									channel_id: opts.channel_id,
									chaincode_id: opts.chaincode_id,
									chaincode_version: opts.chaincode_version,
									package_id: opts.package_id,
									endorsement_errs: endorsement_errs,		// stitch does not know if these errs mean the whole op is going to fail or not
								};
								return cb(null, fmt_ok(opts, resps.grpc_responses, ret));
							}
						});
					});
				}
			});
		}
	});
}

// ------------------------------------------
// Get multiple endorsements, 1 from each host (peer url)
// ------------------------------------------
function gather_endorsements(o_opts: { hosts: string[], timeout_ms: number | undefined, proxy_route: string | null }, p_signed_proposal: any, cb: Function) {
	const proposal_resps: any[] = [];
	const grpc_responses: GrpcData[] = [];
	const endorsement_errors: string[] = [];

	async.eachLimit(o_opts.hosts, 4, (host: string, cb_endorsed: Function) => {	// do a few at at time
		const host_url = build_url(host);
		logger.info('[stitch] sending a proposal to peer:', host_url);

		// ---- Endorse the Transaction ---- //
		const pOpts = {
			p_signed_proposal: p_signed_proposal,
			host: host_url,
			timeout_ms: o_opts.timeout_ms,
			fmt_payload: proposalResponseLib.b_alt_deserialize_payload
		};
		send_proposal_req_timed(pOpts, (eMessage: string, obj: UnaryReqResponse) => {
			if (eMessage) {														// grpc req had errors, depending on the policy some number of errors can be okay
				const fabric_e_msg = (obj && obj.grpc_data && obj.grpc_data.statusMessage) ? obj.grpc_data.statusMessage : '';
				logger.error('[stitch] an endorsement during lc_commitChaincodeDefinition has an error. peer:', host_url, eMessage, 'fabric:', fabric_e_msg);
				endorsement_errors.push(fabric_e_msg || eMessage);				// record endorsement errors, it might be okay
				return cb_endorsed(null);
			} else {															// grpc req is successful
				const msg = obj.grpc_data ? obj.grpc_data.message.toObject() : null;

				if (!msg || !msg.endorsement || !msg.endorsement.signature) {	// we don't use the "endorsement" field but it should be there
					logger.error('[stitch] lc_commitChaincodeDefinition was expecting an endorsement in the response but was not found', host_url, msg);
					return cb_endorsed(null);
				} else if (!obj.b_payload) {
					logger.error('[stitch] lc_commitChaincodeDefinition was expecting data in payload, response is empty', host_url, msg);
					return cb_endorsed(null);
				} else {
					logger.info('[stitch] endorsement for lc_commitChaincodeDefinition was successful', host_url, msg);
					proposal_resps.push(obj.grpc_data.message);
					grpc_responses.push(obj.grpc_data);
					return cb_endorsed(null);
				}
			}
		});
	}, (_: any) => {
		logger.debug('[stitch] gathered all successful proposal responses:', proposal_resps.length);
		return cb(endorsement_errors, { grpc_responses: grpc_responses, proposal_resps: proposal_resps });
	});

	// prepend proxy route to peer url if provided, else we will directly call the peer_url
	function build_url(peer_url: string) {
		if (o_opts.proxy_route) {
			return url_join(o_opts.proxy_route, peer_url);
		} else {
			return peer_url;
		}
	}
}

// ------------------------------------------
// Get a chaincode definition - [single cc]
// same as peer cli `peer lifecycle chaincode querycommitted --name marbles`
// ------------------------------------------
/*
	opts: {
		msp_id: "Org1MSP",											// string - msp id. example: PeerOrg1
		client_cert_b64pem: "<b64 pem string>",						// string - the org's signed cert in a base 64 encoded PEM format
		client_prv_key_b64pem: "<b64 pem string>",					// string - the orgs private key in a base 64 encoded PEM format
		host: "http://peer_url.com:port",							// string - http/https **grpc-web** endpoint to reach your peer
		channel_id: "first"											// string - id of the channel

		chaincode_id: "marbles",									// string - chaincode id/name

		timeout_ms: 240000											// [optional] integer - client side timeout of this request (milliseconds)
	}
*/
function lc_getChaincodeDefinitionOnChannel(opts: Fmt, cb: Function) {
	load_pb(() => {
		logger.info('*[stitch] building a proposal for lc_getChaincodeDefinitionOnChannel');
		opts.funk = 'lc_getChaincodeDefinitionOnChannel';

		if (!opts.chaincode_id) {
			logger.error('[stitch] "chaincode_id" is missing, cannot get cc definition');
			return cb(fmt_err(opts, null, 'missing chaincode id'), null);
		} else {
			const p_opts = {
				msp_id: opts.msp_id,
				client_cert_b64pem: opts.client_cert_b64pem,
				client_prv_key_b64pem: opts.client_prv_key_b64pem,
				client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
				channel_id: opts.channel_id,
				chaincode_id: LIFECYCLE,
				chaincode_type: ChaincodeSpec.Type.GOLANG,
				chaincode_function: 'QueryChaincodeDefinition',
				chaincode_args: [uint8ArrayToStr(lifecycleLib.__b_build_query_chaincode_definition_args(opts.chaincode_id || ''))],
				transientMap: null,
			};
			const stitch_opts = {
				timeout_ms: opts.timeout_ms,
				payload_decoder: lifecycleLib.__decode_query_chaincode_definition_result,
				empty_resp: null,
			};
			endorseTx(opts, p_opts, stitch_opts, (stitch_error: any, stitch_resp: any) => {
				// fabric's response:
				// {
				//		"approvals": {		// the keys are members of the channel (I think), the values are the state of their approval
				//			"Org1MSP": false
				//			"Org2MSP": false
				//		},
				//		collections: {},
				//		endorsementPlugin: "escc",
				// 		initRequired: true,
				//		name: "marbles",
				//		sequence: 1,
				//		validationParameter: "EiAvQ2hhbm5lbC9BcHBsaWNhdGlvbi9FbmRvcnNlbWVudA==",
				//		validationPlugin: "vscc"
				//		version: "1"
				// }
				return cb(stitch_error, stitch_resp);
			});
		}
	});
}

// ------------------------------------------
// Get all chaincode definitions - [multiple cc]
// same as peer cli `peer lifecycle chaincode querycommitted`
// ------------------------------------------
/*
	opts: {
		msp_id: "Org1MSP",											// string - msp id. example: PeerOrg1
		client_cert_b64pem: "<b64 pem string>",						// string - the org's signed cert in a base 64 encoded PEM format
		client_prv_key_b64pem: "<b64 pem string>",					// string - the orgs private key in a base 64 encoded PEM format
		host: "http://peer_url.com:port",							// string - http/https **grpc-web** endpoint to reach your peer
		channel_id: "first"											// string - id of the channel

		timeout_ms: 240000											// [optional] integer - client side timeout of this request (milliseconds)
	}
*/
function lc_getAllChaincodeDefinitionsOnChannel(opts: Fmt, cb: Function) {
	load_pb(() => {
		logger.info('*[stitch] building a proposal for lc_getAllChaincodeDefinitionsOnChannel');
		opts.funk = 'lc_getAllChaincodeDefinitionsOnChannel';
		const p_opts = {
			msp_id: opts.msp_id,
			client_cert_b64pem: opts.client_cert_b64pem,
			client_prv_key_b64pem: opts.client_prv_key_b64pem,
			client_tls_cert_b64pem: opts.client_tls_cert_b64pem,
			channel_id: opts.channel_id,
			chaincode_id: LIFECYCLE,
			chaincode_type: ChaincodeSpec.Type.GOLANG,
			chaincode_function: 'QueryChaincodeDefinitions',
			chaincode_args: [''],									// empty string required, fabric is weird
			transientMap: null,
		};

		const stitch_opts = {
			timeout_ms: opts.timeout_ms,
			payload_decoder: lifecycleLib.__decode_query_chaincode_definitions_result,
			empty_resp: {
				chaincodeDefinitions: []
			}
		};
		endorseTx(opts, p_opts, stitch_opts, (stitch_error: any, stitch_resp: any) => {
			// fabric's response:
			// {
			//		"chaincodeDefinitions": [
			//			{
			//				collections: {},
			//				endorsementPlugin: "escc",
			// 				initRequired: true,
			//				name: "marbles",
			//				sequence: 1,
			//				validationParameter: "EiAvQ2hhbm5lbC9BcHBsaWNhdGlvbi9FbmRvcnNlbWVudA==",
			//				validationPlugin: "vscc"
			//				version: "1"
			//			}
			//		]
			// }
			return cb(stitch_error, stitch_resp);
		});
	});
}

// ------------------------------------------
// Interfaces
// ------------------------------------------
interface Fmt2 extends Fmt {
	package_id: string;
}

interface Fmt3 extends Fmt, HiLvl {

}

interface Fmt4 extends Fmt {
	chaincode_lifecycle_package: Uint8Array;
}

interface Fmt5 extends Fmt, HiLvl {
	hosts: string[];
	proxy_route: string | null;
}

interface StitchOpts {
	timeout_ms: number | undefined;
	payload_decoder: Function | null;
	empty_resp: any | undefined;
}
