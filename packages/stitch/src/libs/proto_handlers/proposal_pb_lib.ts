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
// Libs from protoc
import { ChaincodeHeaderExtension as Proposal_ChaincodeHeaderExtension } from '../../protoc/output/peer/proposal_pb';
import { ChaincodeProposalPayload as Proposal_ChaincodeProposalPayload } from '../../protoc/output/peer/proposal_pb';
import { ChaincodeInvocationSpec as Chaincode_ChaincodeInvocationSpec } from '../../protoc/output/peer/chaincode_pb';
import { SignedProposal as Proposal_SignedProposal } from '../../protoc/output/peer/proposal_pb';
import { HeaderType as Common_HeaderType } from '../../protoc/output/common/common_pb';
import { Proposal as Proposal_Proposal } from '../../protoc/output/peer/proposal_pb';
import { Header as Common_Header } from '../../protoc/output/common/common_pb';
import { ProposalResponse as ProposalResponse_ProposalResponse } from '../../protoc/output/peer/proposal_response_pb';

// Libs built by us
import { arrToUint8Array, generate_tx_id, logger, pp, load_pb } from '../misc';
import { build_nonce, scSign, decode_b64_pem, pem2DER } from '../crypto_misc';
import { validate_proposal_options } from '../validation';
import { TransactionLib } from './transaction_pb_lib';
import { ChaincodeLib } from './chaincode_pb_lib';
import { scGetHashAsHex } from '../subtle_crypto';
import { ConfigTxLib } from './configtx_pb_lib';
import { CommonLib } from './common_pb_lib';
import { ABLib } from './ab_pb_lib';

export class ProposalLib {
	// --------------------------------------------------------------------------------
	// make a chaincode header extension protobuf
	// --------------------------------------------------------------------------------
	p_build_chaincode_header_extension(chaincode_id: string) {
		const p_chaincodeID = (new ChaincodeLib).p_build_chaincode_ID({ chaincode_id: chaincode_id });
		const p_chaincodeHeaderExtension = new Proposal_ChaincodeHeaderExtension();
		p_chaincodeHeaderExtension.setChaincodeId(p_chaincodeID);
		return p_chaincodeHeaderExtension;
	}

	// --------------------------------------------------------------------------------
	// build a proposal protobuf
	// --------------------------------------------------------------------------------
	/*
		opts: {
			p_chaincodeSpec: <protobuf ChaincodeSpec>,
			p_header: <protobuf Header>,
			transientMap: <object>,
		}
	*/
	p_build_proposal(opts: any) {
		const p_chaincode_proposal_payload = this.p_build_chaincode_proposal_payload(opts);
		const p_proposal = new Proposal_Proposal();									// put it all together for the proposal
		p_proposal.setHeader(opts.p_header.serializeBinary());
		p_proposal.setPayload(p_chaincode_proposal_payload.serializeBinary());
		return p_proposal;
	}

	// --------------------------------------------------------------------------------
	// build a chaincode proposal payload protobuf
	// --------------------------------------------------------------------------------
	/*
		opts: {
			p_chaincodeSpec: <protobuf ChaincodeSpec>,
			transientMap: <object>,
		}
	*/
	p_build_chaincode_proposal_payload(opts: any) {
		const p_chaincode_invocation_spec = new Chaincode_ChaincodeInvocationSpec();	// convert cc spec to cc invoke spec
		p_chaincode_invocation_spec.setChaincodeSpec(opts.p_chaincodeSpec);

		const p_chaincode_proposal_payload = new Proposal_ChaincodeProposalPayload();	// next create cc proposal payload
		p_chaincode_proposal_payload.setInput(p_chaincode_invocation_spec.serializeBinary());

		// dsh todo - this thing has no setter function, so guessing you "get it" and use the map methods?
		if (opts.transientMap && typeof opts.transientMap === 'object') {
			logger.error('[warning] i\'m not sure how to set "TransientmapMap" yet, but I took a stab at it. good luck');
			const tMap = p_chaincode_proposal_payload.getTransientmapMap();
			for (let field in opts.transientMap) {
				tMap.set(field, opts.transientMap[field]);							// hopefully its no longer empty
			}
		}

		return p_chaincode_proposal_payload;
	}

	// --------------------------------------------------------------------------------
	// build a signed proposal protobuf
	// --------------------------------------------------------------------------------
	/*
		opts: {
			prvKeyPem: "" // not base 64 encoded, plain PEM
			p_proposal: <protobuf proposal> || <protobuf seekPayload>,
		}
	*/
	p_build_signed_proposal(opts: { prvKeyPem: string, p_proposal: any }, cb: Function) {
		const bin = opts.p_proposal.serializeBinary();

		// sign the proposal
		scSign({ prvKeyPEM: opts.prvKeyPem, b_msg: bin }, (_: any, signature: any) => {
			if (signature === null) {
				return cb(null);
			} else {
				const p_signedProposal = new Proposal_SignedProposal();
				p_signedProposal.setProposalBytes(bin);
				p_signedProposal.setSignature(arrToUint8Array(signature));
				return cb(null, p_signedProposal);
			}
		});
	}

	// if needed build a tls hash
	get_tls_hash(opts: any, cb: Function) {
		if (opts.client_tls_cert_pem) {
			const der = pem2DER(opts.client_tls_cert_pem);
			scGetHashAsHex(der, (error: any, tls_hash: string | null) => {
				return cb(error, tls_hash);
			});
		} else {
			return cb(null, null);
		}
	}

	// make hashes ahead of time - [1] the tls cert & [2] the tx id
	prebuild_hashes(opts: any, nonce: Uint8Array, cb: Function) {
		this.get_tls_hash(opts, (err1: any, tls_hash: string) => {		// [1]
			const options = {
				client_cert_pem: opts.client_cert_pem,
				msp_id: opts.msp_id,
				nonce: nonce,
			};
			generate_tx_id(options, (err2: any, tx_id: string | null) => {		// [2]
				return cb(err1 || err2, { tls_hash: tls_hash, tx_id: tx_id });
			});
		});
	}

	// --------------------------------------------------------------------------------
	// Build a signed proposal from regular primitives (no proto buff input arguments) [endorser tx message type]
	/*
		opts: {
			msp_id: "string",
			client_cert_b64pem: "string",
			client_prv_key_b64pem: "string",
			client_tls_cert_b64pem: "string",		// this is only for mutual tls, null is fine
			channel_id: "string",
			chaincode_id: ""string",
			chaincode_type: "string",
			chaincode_function: "string",			// [optional]
			chaincode_args: ["string"],				// [optional]
			transientMap: {},						// [optional]
		}
	*/
	// --------------------------------------------------------------------------------
	p_build_abstracted_signed_proposal_endorser(opts: any, cb: Function) {
		const commonLib = new CommonLib;
		const errors = validate_proposal_options(opts);
		if (errors) { return cb(null, { errors: errors }); }
		const nonce = build_nonce();

		opts.client_cert_pem = decode_b64_pem(opts.client_cert_b64pem);			// convert base64 encoded PEM to PEM
		opts.client_prv_key_pem = decode_b64_pem(opts.client_prv_key_b64pem);
		opts.client_tls_cert_pem = decode_b64_pem(opts.client_tls_cert_b64pem);	// mutual tls

		// 0. Build hash of tls cert (its for mutual tls... somehow?) & build a tx_id
		this.prebuild_hashes(opts, nonce, (hash_err: any, prebuild: { tls_hash: string | null, tx_id: string }) => {
			if (hash_err) {
				logger.error('[stitch] errors during hash generation [1]:', hash_err, prebuild);
			}

			// 1. Build Channel Header
			const ch_opts = {
				type: Common_HeaderType.ENDORSER_TRANSACTION,
				channel_id: opts.channel_id,
				tx_id: prebuild.tx_id,
				epoch: null,													// fabric sdk didn't set epoch on purpose
				chaincode_id: opts.chaincode_id,
				client_tls_cert_hash: prebuild.tls_hash,
			};
			const p_channelHeader = commonLib.p_build_channel_header(ch_opts);
			//logger.debug('p_channelHeader', p_channelHeader.toObject());

			// 2. Build Header
			const h_opts = {
				msp_id: opts.msp_id,
				client_cert_pem: opts.client_cert_pem,
				nonce: nonce,
				p_channelHeader: p_channelHeader,
			};
			const p_header = commonLib.p_build_header(h_opts);
			// logger.debug('p_header', p_header.toObject());

			// 3. Build Chaincode Spec
			const cc_opts = {
				chaincode_id: opts.chaincode_id,
				chaincode_type: opts.chaincode_type,
				chaincode_function: opts.chaincode_function,
				chaincode_args: opts.chaincode_args,
			};
			const p_chaincodeSpec = (new ChaincodeLib).p_build_chaincode_spec(cc_opts);
			//logger.debug('p_chaincodeSpec', pp(p_chaincodeSpec.toObject()));

			// 4. Build a proposal
			const pr_opts = {
				p_chaincodeSpec: p_chaincodeSpec,
				p_header: p_header,
				transientMap: opts.transientMap
			};
			const p_proposal = this.p_build_proposal(pr_opts);

			//logger.debug('p_proposal', pp(p_proposal.toObject()));
			//logger.debug('p_proposal as hex', uint8ArrayToHexStr(p_proposal.serializeBinary()));

			// 5. Build singed proposal
			const s_opts = {
				prvKeyPem: <string>opts.client_prv_key_pem,
				p_proposal: p_proposal,
			};
			this.p_build_signed_proposal(s_opts, (_: any, p_signed_proposal: any) => {
				return cb(null, p_signed_proposal);
			});
		});
	}

	// --------------------------------------------------------------------------------
	// Build a signed proposal from regular primitives (no proto buff input arguments) [seek message type]
	/*
		opts: {
			msp_id: "string",
			client_cert_b64pem: "string",
			client_prv_key_b64pem: "string",
			client_tls_cert_b64pem: "string",		// dsh todo - not implemented
			channel_id: "string",
			start_block: number,					// [optional] - it not present "SeekNewest" will be used
			stop_block: number,						// [optional] - it not present "SeekNewest" will be used
		}
	*/
	// --------------------------------------------------------------------------------
	p_build_abstracted_signed_proposal_seek(opts: any, cb: Function) {
		const commonLib = new CommonLib;
		const abLib = new ABLib;
		const errors = validate_proposal_options(opts);
		if (errors) { return cb(null, { errors: errors }); }
		const nonce = build_nonce();

		opts.client_cert_pem = decode_b64_pem(opts.client_cert_b64pem);			// convert base64 encoded PEM to PEM
		opts.client_prv_key_pem = decode_b64_pem(opts.client_prv_key_b64pem);
		opts.client_tls_cert_pem = decode_b64_pem(opts.client_tls_cert_b64pem);

		// 0. Build hash of tls cert (its for mutual tls... somehow?) & build a tx_id
		this.prebuild_hashes(opts, nonce, (hash_err: any, prebuild: { tls_hash: string | null, tx_id: string }) => {
			if (hash_err) {
				logger.error('[stitch] errors during hash generation [2]:', hash_err, prebuild);
			}

			// 1. Build Seek Start
			let p_seek_position_start = null;
			if (opts.start_block !== null) {				// use start block if it exists
				const p_seek_specified_start = abLib.p_build_seek_specified(opts.start_block);
				p_seek_position_start = abLib.p_build_seek_position({ set_specified: p_seek_specified_start });
			} else {										// else do "newest"
				logger.debug('using "newest" for seek start');
				const p_seek_specified_start = abLib.p_build_seek_newest();
				p_seek_position_start = abLib.p_build_seek_position({ set_newest: p_seek_specified_start });
			}
			logger.debug('p_seek_position_start', p_seek_position_start.toObject());

			// 2. Build Seek Stop
			let p_seek_position_stop = null;
			if (opts.stop_block !== null) {					// use stop block if it exists
				const p_seek_specified_stop = abLib.p_build_seek_specified(opts.stop_block);
				p_seek_position_stop = abLib.p_build_seek_position({ set_specified: p_seek_specified_stop });
			} else {										// else do "newest"
				logger.debug('using "newest" for seek stop');
				const p_seek_specified_stop = abLib.p_build_seek_newest();
				p_seek_position_stop = abLib.p_build_seek_position({ set_newest: p_seek_specified_stop });
			}
			logger.debug('p_seek_position_stop', p_seek_position_stop.toObject());

			// 3. Build Seek Info
			const s_opts = {
				seek_start: p_seek_position_start,
				seek_stop: p_seek_position_stop
			};
			const p_seek_info = abLib.p_build_seek_info(s_opts);
			logger.debug('p_seek_info', p_seek_info.toObject());

			// 4. Build Channel Header
			const ch_opts = {
				type: Common_HeaderType.DELIVER_SEEK_INFO,
				channel_id: opts.channel_id,
				tx_id: prebuild.tx_id,
				epoch: null,										// dsh this was not null in the fabric sdk...
				chaincode_id: null,
				client_tls_cert_hash: prebuild.tls_hash,
			};
			const p_channelHeader = commonLib.p_build_channel_header(ch_opts);
			//logger.debug('p_channelHeader', p_channelHeader.toObject());

			// 5. Build Header
			const h_opts = {
				msp_id: opts.msp_id,
				client_cert_pem: opts.client_cert_pem,
				nonce: nonce,
				p_channelHeader: p_channelHeader,
			};
			const p_header = commonLib.p_build_header(h_opts);
			//logger.debug('p_header', p_header.toObject());

			// 6. Build Payload
			const p_opts = {
				p_header: p_header,
				b_data: p_seek_info.serializeBinary(),
			};
			const p_payload = commonLib.p_build_payload(p_opts);

			logger.debug('p_payload', pp(p_payload.toObject()));
			//logger.debug('p_payload seek as hex', uint8ArrayToHexStr(p_payload.serializeBinary()));

			// 7. Build singed proposal
			const sp_opts = {
				prvKeyPem: <string>opts.client_prv_key_pem,
				p_proposal: p_payload,
			};
			this.p_build_signed_proposal(sp_opts, (_: any, p_signed_proposal: any) => {
				logger.debug('p_signed_proposal seek', p_signed_proposal ? p_signed_proposal.toObject() : null);
				return cb(null, p_signed_proposal);
			});
		});
	}

	// --------------------------------------------------------------------------------
	// Build array of endorsements from multiple proposal responses
	/*
		p_proposal_responses: [<protobuf>],		// should contain array binary, each bin should contain an endorsement
	*/
	// --------------------------------------------------------------------------------
	parse_endorsements(arr_p_proposal_responses: any[]) {
		const p_endorsements = [];
		let p_payload = null;

		for (let i in arr_p_proposal_responses) {
			const p_proposal_resp = <ProposalResponse_ProposalResponse>arr_p_proposal_responses[i];
			logger.debug('[stitch] p_proposal_response:', p_proposal_resp ? p_proposal_resp.toObject() : null);

			const p_response = p_proposal_resp ? p_proposal_resp.getResponse() : null;
			if (!p_response) {
				logger.error('[stitch] could not get "response" from p_proposal_resp at pos:', i);
			} else {
				const response = p_response.toObject();						// this var is only for debug printing
				if (p_response.getStatus() !== 200) {
					logger.error('[stitch] did not get a successful endorsement in p_proposal_response at pos:', i, response);
				} else {
					logger.debug('[stitch] got a successful endorsement in p_proposal_response at pos:', i, response);
					p_payload = p_proposal_resp.getPayload();				// gather payload, keeping the last one is fine, all should be the same
					p_endorsements.push(p_proposal_resp.getEndorsement());	// gather each endorsement
				}
			}
		}

		if (p_endorsements.length === 0) {
			logger.error('[stitch] there were 0 successful endorsements');
			return null;
		} else {
			return {
				p_proposal_response_payload: p_payload,
				p_endorsements: p_endorsements,
			};
		}
	}

	// --------------------------------------------------------------------------------
	// Build a signed proposal (requires proto buff input arguments) [ordering tx type]
	/*
		opts: {
			p_signed_proposal: <protobuf>,
			p_proposal_responses: [<protobuf>],		// should contain array binary, each bin should contain an endorsement
			msp_id: "string",						// ex PeerOrg1
			client_cert_b64pem: "string",			// the org's signed cert in a base 64 encoded PEM format (admin)
			client_prv_key_b64pem: "string",		// the orgs private key in a base 64 encoded PEM format (admin)
		}
	*/
	// --------------------------------------------------------------------------------
	p_build_abstracted_signed_proposal_order(opts: {
		p_signed_proposal: any,
		arr_p_proposal_responses: object[],
		msp_id: string,
		client_cert_b64pem: string | undefined,
		client_prv_key_b64pem: string | undefined,
		client_tls_cert_b64pem: string | undefined,
	}, cb: Function) {
		const transactionLib = new TransactionLib;
		const errors = validate_proposal_options(opts);
		if (errors) { return cb(null, { errors: errors }); }

		//const client_cert_pem = decode_b64_pem(opts.client_cert_b64pem);			// convert base64 encoded PEM to PEM
		const client_prv_key_pem = decode_b64_pem(opts.client_prv_key_b64pem);
		//const client_tls_cert_pem = decode_b64_pem(opts.client_tls_cert_b64pem);

		// 0. parse endorsements
		const c_opts = this.parse_endorsements(opts.arr_p_proposal_responses);
		if (!c_opts) {
			// error already logged
			return cb(null);		// do not need to pass error back, lack of proposal object indicates an error
		} else {

			// 1. build chaincode endorsed action
			const p_chaincode_endorsed_action = transactionLib.p_build_chaincode_endorsed_action(c_opts);
			logger.debug('p_chaincode_endorsed_action?', p_chaincode_endorsed_action.toObject());

			// 2. rebuild chaincode proposal payload without a "TransientMap"
			// [fabric sdk note]
			// the "TransientMap" field inside the original proposal payload is only meant for the endorsers to use from inside the chaincode.
			// this must be taken out before sending to the orderer, otherwise the transaction will be rejected by the validator when it compares the hash
			const po_signed_proposal = <Proposal_SignedProposal>opts.p_signed_proposal;
			const bo_proposal = po_signed_proposal.getProposalBytes();
			const po_proposal = Proposal_Proposal.deserializeBinary(<Uint8Array>bo_proposal);
			const bo_payload = po_proposal.getPayload();
			const po_chaincode_proposal_payload = Proposal_ChaincodeProposalPayload.deserializeBinary(<Uint8Array>bo_payload);
			const pm_chaincode_proposal_payload = new Proposal_ChaincodeProposalPayload();		// create the modified chaincode proposal payload
			pm_chaincode_proposal_payload.setInput(po_chaincode_proposal_payload.getInput());	// only set "input" field, skip "TransientMap" field
			logger.debug('pm_chaincode_proposal_payload?', pm_chaincode_proposal_payload.toObject());

			// 3. build a chaincode action payload
			const ca_opts = {
				p_action: p_chaincode_endorsed_action,							// dsh should bin arguments start with b_
				b_chaincode_proposal_payload: pm_chaincode_proposal_payload.serializeBinary(),
			};
			const p_chaincode_action_payload = transactionLib.p_build_chaincode_action_payload(ca_opts);
			logger.debug('p_chaincode_action_payload?', p_chaincode_action_payload.toObject());

			// 4. build transaction action
			const bo_header = po_proposal.getHeader();
			const p_header = Common_Header.deserializeBinary(<Uint8Array>bo_header);
			const ta_opts = {
				b_header: <Uint8Array>p_header.getSignatureHeader(),
				b_payload: p_chaincode_action_payload.serializeBinary(),
			};
			const p_transaction_action = transactionLib.p_build_transaction_action(ta_opts);
			logger.debug('p_transaction_action?', p_transaction_action.toObject());

			// 5. build transaction
			const t_opts = {
				p_actions: [p_transaction_action],
			};
			const p_transaction = transactionLib.p_build_transaction(t_opts);
			logger.debug('p_transaction?', p_transaction.toObject());

			// 6. build proposal payload
			const p_opts = {
				p_header: p_header,
				b_data: p_transaction.serializeBinary(),
			};
			const p_payload = (new CommonLib).p_build_payload(p_opts);

			logger.debug('p_payload?', pp(p_payload.toObject()));
			//logger.debug('p_payload tx as hex', uint8ArrayToHexStr(p_payload.serializeBinary()));

			// 7. Build singed proposal
			const sp_opts = {
				prvKeyPem: client_prv_key_pem,
				p_proposal: p_payload,
			};
			this.p_build_signed_proposal(sp_opts, (_: any, p_signed_proposal: any) => {
				logger.debug('p_signed_proposal ordering', p_signed_proposal ? p_signed_proposal.toObject() : null);
				return cb(null, p_signed_proposal);
			});
		}
	}

	// --------------------------------------------------------------------------------
	// Build a signed proposal (requires proto buff input arguments) [config update (channels) message type]
	/*
		opts: {
			msp_id: "string",						// ex PeerOrg1
			client_cert_b64pem: "string",			// the org's signed cert in a base 64 encoded PEM format (admin)
			client_prv_key_b64pem: "string",		// the orgs private key in a base 64 encoded PEM format (admin)
			config_update: <protobuf>,				// config update protobuf for this channel
			config_update_signatures: ["string"],	// array of signatures as hexadecimal strings
			channel_id: "string"
		}
	*/
	// --------------------------------------------------------------------------------
	p_build_abstracted_signed_proposal_config_update(opts: Bac, cb: Function) {
		const commonLib = new CommonLib;
		const configTxLib = new ConfigTxLib;
		const errors = validate_proposal_options(opts);
		if (errors) { return cb(<any>{ errors: errors }); }
		const nonce = build_nonce();

		opts.client_cert_pem = decode_b64_pem(opts.client_cert_b64pem);			// convert base64 encoded PEM to PEM
		opts.client_prv_key_pem = decode_b64_pem(opts.client_prv_key_b64pem);
		if (opts.client_tls_cert_b64pem) {
			opts.client_tls_cert_pem = decode_b64_pem(opts.client_tls_cert_b64pem);
		}

		load_pb((pb_root: any) => {

			// 0. Build hash of tls cert (its for mutual tls... somehow?) & build a tx_id
			this.prebuild_hashes(opts, nonce, (hash_err: any, prebuild: { tls_hash: string | null, tx_id: string }) => {
				if (hash_err) {
					logger.error('[stitch] errors during hash generation [1]:', hash_err, prebuild);
				}

				// 1. Build Channel Header
				const ch_opts = {
					type: Common_HeaderType.CONFIG_UPDATE,
					channel_id: opts.channel_id,
					tx_id: prebuild.tx_id,
					epoch: null,
					chaincode_id: null,
					client_tls_cert_hash: prebuild.tls_hash,
				};
				const p_channelHeader = commonLib.p_build_channel_header(ch_opts);
				//logger.debug('p_channelHeader', p_channelHeader.toObject());

				// 2. Build Header
				const h_opts: any = {
					msp_id: opts.msp_id,
					client_cert_pem: opts.client_cert_pem,
					nonce: nonce,
					p_channelHeader: p_channelHeader,
				};
				const p_header = commonLib.p_build_header(h_opts);
				//logger.debug('p_header', p_header.toObject());


				// 3. Build Config Update Envelope
				const b_opts = {
					b_config_update: opts.config_update,
					b64_config_update_signatures: opts.config_update_signatures
				};
				const b_config_update_envelope = configTxLib.__b_build_config_update_envelope(b_opts);


				// 4. Build Payload
				const p_opts = {
					p_header: p_header,
					b_data: b_config_update_envelope,
				};
				const p_payload = commonLib.p_build_payload(p_opts);
				logger.debug('p_payload', pp(p_payload.toObject()));
				//logger.debug('p_payload seek as hex', uint8ArrayToHexStr(p_payload.serializeBinary()));

				// 5. Build singed proposal
				const sp_opts = {
					prvKeyPem: <string>opts.client_prv_key_pem,
					p_proposal: p_payload,
				};
				this.p_build_signed_proposal(sp_opts, (_: any, p_signed_proposal: any) => {
					logger.debug('p_signed_proposal ordering', p_signed_proposal ? p_signed_proposal.toObject() : null);
					return cb(null, p_signed_proposal);
				});
			});
		});
	}
}

interface Bac {
	msp_id: string;
	client_cert_b64pem: string;
	client_prv_key_b64pem: string;
	client_tls_cert_b64pem: string | undefined;
	client_cert_pem: string | undefined;
	client_prv_key_pem: string | undefined;
	client_tls_cert_pem: string | undefined;
	config_update: Uint8Array;
	config_update_signatures: string[];
	channel_id: string;
}
