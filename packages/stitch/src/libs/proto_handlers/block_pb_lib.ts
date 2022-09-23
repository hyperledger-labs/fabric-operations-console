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
import { Block as Common_Block } from '../../protoc/output/common/common_pb';
import { Payload as Common_Payload } from '../../protoc/output/common/common_pb';
import { Envelope as Common_Envelope } from '../../protoc/output/common/common_pb';
import { Metadata as Common_Metadata } from '../../protoc/output/common/common_pb';
import { ACLs as Configuration_ACLs } from '../../protoc/output/peer/configuration_pb';
import { LastConfig as Common_LastConfig } from '../../protoc/output/common/common_pb';
import { MSPRole as MSP_Principal_MSPRole } from '../../protoc/output/msp/msp_principal_pb';
import { MSPConfig as Configuration_MSPConfig } from '../../protoc/output/msp/msp_config_pb';
import { ChannelHeader as Common_ChannelHeader } from '../../protoc/output/common/common_pb';
import { ConfigUpdate as Configtx_ConfigUpdate } from '../../protoc/output/common/configtx_pb';
import { SignatureHeader as Common_SignatureHeader } from '../../protoc/output/common/common_pb';
import { Transaction as Transaction_Transaction } from '../../protoc/output/peer/transaction_pb';
import { ChaincodeAction as Proposal_ChaincodeAction } from '../../protoc/output/peer/proposal_pb';
import { TxReadWriteSet as RwSet_TxReadWriteSet } from '../../protoc/output/ledger/rwset/rwset_pb';
import { KVRWSet as Kv_RwSet_KVRWSet } from '../../protoc/output/ledger/rwset/kvrwset/kv_rwset_pb';
import { ConfigEnvelope as Configtx_ConfigEnvelope } from '../../protoc/output/common/configtx_pb';
import { BatchSize as Configuration_BatchSize } from '../../protoc/output/orderer/configuration_pb';
import { Consortium as Configuration_Consortium } from '../../protoc/output/common/configuration_pb';
import { AnchorPeers as Configuration_AnchorPeers } from '../../protoc/output/peer/configuration_pb';
import { FabricMSPConfig as Configuration_FabricMSPConfig } from '../../protoc/output/msp/msp_config_pb';
import { Capabilities as Configuration_Capabilities } from '../../protoc/output/common/configuration_pb';
import { BatchTimeout as Configuration_BatchTimeout } from '../../protoc/output/orderer/configuration_pb';
import { KafkaBrokers as Configuration_KafkaBrokers } from '../../protoc/output/orderer/configuration_pb';
import { ImplicitMetaPolicy as Policies_ImplicitMetaPolicy } from '../../protoc/output/common/policies_pb';
import { ConsensusType as Configuration_ConsensusType } from '../../protoc/output/orderer/configuration_pb';
import { SerializedIdentity as Identities_SerializedIdentity } from '../../protoc/output/msp/identities_pb';
import { ChaincodeQueryResponse as Query_Pb_ChaincodeQueryResponse } from '../../protoc/output/peer/query_pb';
import { ChaincodeEvent as Chaincode_Event_ChaincodeEvent } from '../../protoc/output/peer/chaincode_event_pb';
import { ConfigUpdateEnvelope as Configtx_ConfigUpdateEnvelope } from '../../protoc/output/common/configtx_pb';
import { HashingAlgorithm as Configuration_HashingAlgorithm } from '../../protoc/output/common/configuration_pb';
import { OrdererAddresses as Configuration_OrdererAddresses } from '../../protoc/output/common/configuration_pb';
import { SignaturePolicyEnvelope as Policy_SignaturePolicyEnvelope } from '../../protoc/output/common/policies_pb';
import { ProcessedTransaction as Transactions_ProcessedTransaction } from '../../protoc/output/peer/transaction_pb';
import { ChaincodeDeploymentSpec as Chaincode_ChaincodeDeploymentSpec } from '../../protoc/output/peer/chaincode_pb';
import { ChaincodeProposalPayload as Proposal_ChaincodeProposalPayload } from '../../protoc/output/peer/proposal_pb';
import { ChaincodeInvocationSpec as Chaincode_ChaincodeInvocationSpec } from '../../protoc/output/peer/chaincode_pb';
import { ChaincodeActionPayload as Transactions_ChaincodeActionPayload } from '../../protoc/output/peer/transaction_pb';
import { ChannelRestrictions as Configuration_ChannelRestrictions } from '../../protoc/output/orderer/configuration_pb';
import { BlockDataHashingStructure as Configuration_BlockDataHashingStructure } from '../../protoc/output/common/configuration_pb';
import { ProposalResponsePayload as Proposal_Response_ProposalResponsePayload } from '../../protoc/output/peer/proposal_response_pb';

// decode a map field - case sensitive!
const massDecodeMap = <any>{	// this is only possible with maps (aka dictionaries) b/c the key needs to be in binary
	'ACLs': (d: any) => { return Configuration_ACLs.deserializeBinary(d).toObject(); },
	'Capabilities': (d: any) => { return Configuration_Capabilities.deserializeBinary(d).toObject(); },
	'Consortium': (d: any) => { return Configuration_Consortium.deserializeBinary(d).toObject(); },
	'BlockDataHashingStructure': (d: any) => { return Configuration_BlockDataHashingStructure.deserializeBinary(d).toObject(); },
	'HashingAlgorithm': (d: any) => { return Configuration_HashingAlgorithm.deserializeBinary(d).toObject(); },
	'OrdererAddresses': (d: any) => { return Configuration_OrdererAddresses.deserializeBinary(d).toObject(); },
	'BatchSize': (d: any) => { return Configuration_BatchSize.deserializeBinary(d).toObject(); },
	'BatchTimeout': (d: any) => { return Configuration_BatchTimeout.deserializeBinary(d).toObject(); },
	'ChannelRestrictions': (d: any) => { return Configuration_ChannelRestrictions.deserializeBinary(d).toObject(); },
	'KafkaBrokers': (d: any) => { return Configuration_KafkaBrokers.deserializeBinary(d).toObject(); },
	'AnchorPeers': (d: any) => { return Configuration_AnchorPeers.deserializeBinary(d).toObject(); },
	'MSP': (d: any) => {
		const b_config = Configuration_MSPConfig.deserializeBinary(d).getConfig();
		return Configuration_FabricMSPConfig.deserializeBinary(<Uint8Array>b_config).toObject();
	},
	'ConsensusType': (d: any) => { return Configuration_ConsensusType.deserializeBinary(d); },
	'ChannelCreationPolicy': (d: any) => {
		try {
			return Policy_SignaturePolicyEnvelope.deserializeBinary(d).toObject(); 	// this is a guess...
		} catch (e) {
			return Policies_ImplicitMetaPolicy.deserializeBinary(d).toObject(); 	// this is a bigger guess...
		}
	},
	'Endpoints': (d: any) => {
		// use new lib to decode
		return deserialize_binary(base64ToUint8Array(d), 'common.OrdererAddresses');	// for unknown reasons decoding Endpoints should really use OrdererAddresses
	}
};

// Libs built by us
import { logger, uint8ArrayToBase64, base64ToUint8Array, base64ToUtf8, __pb_root, sort_keys } from '../misc';
import { ChaincodeLib } from './chaincode_pb_lib';

// exports
export {
	decodeBlock, decode_payload_data, decode_signature_header, decode_signature_list, decode_chaincode_query_response, decode_policy_map,
	decode_chaincode_deployment_spec, decode_processed_transaction, format_protoc_to_pbjs, __decode_chaincode_data_full, decodeBlockV2,
};

// Block Decoding Notes:
// - * means if you decode this field's parent then this field will be bytes...
// - fields that have the name "list" added as a suffix are arrays.  the matching proto buf message will not have "list" in its name
// - all fields in this block are camelCase
//
// block: {											// behold! the. block. format.
// 		header: {
//			number: <string>
//			previous_hash: <string>
//			data_hash: <string>
//		}
// 		metadata: {
//				*metadataList: [
//					{   // meta data signature section
//						value: <bytes>,
//						signaturesList: [
//							{
//								*signatureHeader:{
//									*creator: {
//										mspid: <string>
//										*idBytes: <bytes>
//									}
//									*nonce: <bytes>
//								}
//								*signature: <bytes>
//							}
//						]
//					},
//					{   // last config section
//						value: {
//							*index: <number>
//						}
//						signaturesList:[
//							{
//								*signatureHeader:{
//									*creator: {
//										mspid: <string but looks weird>
//										*idBytes: <bytes>
//									}
//									*nonce: <bytes>
//								}
//								*signature: <bytes>
//							}
//						]
//					},
//					{  // transaction filter section - is not tested! 10/02/2018
//						<?> (dsh todo)
//					},
//				]
//		}
// 		data: {
//			 dataList: [
//				 envelope: {
//				 	*signature: <bytes>
//				 	*payload: {
//				 		header: {
//							*channelHeader: {
//								type: <number>
//								version: <number>
//								timestamp: {
//									seconds: <number>
//									nanos: <number>
//								}
//								channelId: <string>
//								txId: <string>
//								epoch: <number>
//								*fabricExtension: <bytes>
//								*tlsCertHash: <bytes>
//							}
//							*signatureHeader:{
//								*creator: {
//									mspid: <string>
//									*idBytes: <bytes>
//								}
//								*nonce: <bytes>
//							}
//						}
//						data: {
//							< --- There are 3 block types. a block will only have one of these fields: --- >
//
//							< --- 1. A Genesis block has "configEnvelope" --- >
//							* (Configtx_ConfigEnvelope) ConfigEnvelope: {
//								(Configtx_Config) config: {
//									sequence: <number>
//									(Configtx_ConfigGroup) channelGroup: {
//										version: <number>
//										groupsMap: [[ "nameOfMap", <ConfigGroup> ]]
//										valuesMap: [[ "nameOfMap", {
//											version: <number>
//											*value: <bytes>
//											modPolicy: <string>
//										}]]
//										policiesMap: [[ "nameOfMap", {
//											version: <number>
//											policy: <policy ?>
//											modPolicy: <string>
//										}]]
//										modPolicy: <string>
//									}
//								}
//								(Configtx_Envelope) lastUpdate: {
//				 					*signature: <bytes>
//				 					*payload: {
//																						// dsh todo
//									}
//								}
//							}
//
//							< ---  2. A TX block has "actionList"  --- >
//							* (Transaction_Transaction) transaction: {
//								actionList: [
//									(Transaction_TransactionAction) {
//										* header: {
//											* (Common_SignatureHeader) signatureHeader:{
//												* (Identities_SerializedIdentity) creator: {
//													mspid: <string>
//													*idBytes: <bytes>
//												}
//												*nonce: <bytes>
//											}
//											* (Common_ChannelHeader) channelHeader: {
//												type: <number>
//												version: <number>
//												timestamp: {
//													seconds: <number>
//													nanos: <number>
//												}
//												channelId: <string>
//												txId: <string>
//												epoch: <number>
//												*fabricExtension: <bytes>
//												*tlsCertHash: <bytes>
//											}
//										},
//										*payload: {
//											(Transaction_ChaincodeActionPayload) chaincodeActionPayload: {
//												*chaincodeProposalPayload: {
//													*input: {
//														chaincodeInvocationSpec: {
//															chaincodeId: {
//																path: <string>
//																name: <string>
//																version: <string>
//															}
//															input: {
//																argsList: [
//																	<string>
//																]
//																decorationsMap: {
//																	<?>
//																}
//																timeout: <number>
//																type: <number>
//															}
//														}
//													}
//													transientMap: <?>
//												}
//												action: {
//													*proposalResponsePayload:{
//														proposalHash: <string>
//														extension:{
//															*results: {
//																dataModel: <number>
//																nsRwSet: [
//																	{
//																		collectionHashedRwsetList: []
//																		namespace: <string>
//																		rwset: {
//																			metadataWritesList: []
//																			rangeQueriesInfoList: []
//																			readsList: []
//																			writesList: [
//																				{
//																					key: <string>
//																					value: <string>
//																					isDelete: <boolean>
//																				}
//																			]
//																		}
//																	}
//																]
//															}
//															*events: {
//																chaincodeId: <string>
//																txId: <string>
//																eventName: <string>
//																payload: <bytes>
//															}
//															*response: {
//																status: <number>
//																message: <string>
//																payload: <bytes>
//															}
//															chaincodeId: {
//																path: <string>
//																name: <string>
//																version: <string>
//															}
//														}
//													}
//													endorsementsList:[
//														{
//															endorser: {
//																mspid: <string>
//																*idBytes: <bytes>
//															}
//															signature: <bytes>
//														}
//													]
//												}
//											}
//										}
//									}
//								]
//							}
//						}
//					}
//				}
//			]
//		}
// }

// -------------------------------------------------
// Deserialize a block! - version 1 (protoc)
// -------------------------------------------------
function decodeBlock(b_payload: Uint8Array) {
	// it all starts here
	const p_block = Common_Block.deserializeBinary(b_payload);
	logger.debug('^[stitch] decode - p_block?', p_block.toObject());

	const p_header = p_block.getHeader();
	const p_metadata = p_block.getMetadata();
	const p_data = p_block.getData();
	const dataList = [];
	const metaDataList = [];
	let header = null;

	// Decode "data" field of a block --------------------------------------------
	if (!p_data) {
		return -1;
	} else {
		//logger.debug('[stitch] p_data?', p_data.toObject());
		const b_dataList = p_data.getDataList();

		for (const i in b_dataList) {
			dataList.push(decode_common_envelope(<Uint8Array>b_dataList[i]));			// most of the decoding is done in here...
		}
	}

	// Decode "metadata" field of a block --------------------------------------------
	if (p_metadata) {
		const b_metadata_list = p_metadata.getMetadataList();
		if (b_metadata_list && b_metadata_list[0]) {			// signatures are here
			const p_metadata2 = Common_Metadata.deserializeBinary(<Uint8Array>b_metadata_list[0]);
			const p_signaturesList = p_metadata2.getSignaturesList();
			const b_value = p_metadata2.getValue();
			metaDataList.push({
				value: b_value,
				signaturesList: decode_signature_list(p_signaturesList),
			});
		}
		if (b_metadata_list && b_metadata_list[1]) {			// last config is here
			const p_metadata2 = Common_Metadata.deserializeBinary(<Uint8Array>b_metadata_list[1]);
			const p_signaturesList = p_metadata2.getSignaturesList();
			const b_value = p_metadata2.getValue();
			const p_last_config = Common_LastConfig.deserializeBinary(<Uint8Array>b_value);
			metaDataList.push({
				value: {
					index: p_last_config.getIndex()
				},
				signaturesList: decode_signature_list(p_signaturesList),
			});
		}
		/*if (b_metadata_list && b_metadata_list[2]) {			// transaction filter? is here - dsh todo
			const p_metadata2 = Common_Metadata.deserializeBinary(<Uint8Array>b_metadata_list[2]);
			metaDataList.push(p_metadata2.toObject());
		}*/
	}

	// Decode "header" field of a block --------------------------------------------
	if (p_header) {
		header = p_header.toObject();
	}

	const block_resp = {
		header: header,
		metadata: {
			metadataList: metaDataList,
		},
		data: {
			dataList: dataList,
		}
	};
	return format_protoc_structure(decode_map_value_keys(block_resp, 0), 0);
}

// -------------------------------------------------
// Decode a block's envelope
// -------------------------------------------------
function decode_common_envelope(b_envelope: Uint8Array) {
	const p_envelope = Common_Envelope.deserializeBinary(b_envelope);
	const b_payload2 = p_envelope.getPayload();
	const b_signature = p_envelope.getSignature_asB64();
	const p_payload2 = Common_Payload.deserializeBinary(<Uint8Array>b_payload2);
	const b_data2 = p_payload2.getData();
	const p_header2 = p_payload2.getHeader();

	if (p_header2) {
		const b_channel_header = p_header2.getChannelHeader();
		const p_channel_header = Common_ChannelHeader.deserializeBinary(<Uint8Array>b_channel_header);
		const channel_header = p_channel_header.toObject();
		//logger.debug('[stitch] channel_header?', channel_header);

		const p_signature_header = p_header2.getSignatureHeader();
		const signature_header = decode_signature_header(p_signature_header);

		const data = decode_payload_data(b_data2, channel_header.type);
		logger.debug('[stitch] data?', data);

		return {
			envelope: {
				signature: b_signature,
				payload: {
					header: {
						channelHeader: channel_header,
						signatureHeader: signature_header
					},
					data: data
				}
			}
		};
	}
	return null;

}

// -------------------------------------------------
// find "value" keys we can decode. - they always live in a map. hunt those down first.
// -------------------------------------------------
function decode_map_value_keys(obj: any, depth: number) {
	if (depth >= 10000) {
		logger.error('Oh boy, we dug the well too deep, won\'t parse object for maps any further', depth);
	} else {
		for (let key in obj) {										// begin the hunt, question everyone
			const mPos = key.indexOf('Map');
			if (mPos >= 1 && mPos === key.length - 3) {				// got'm

				for (let map in obj[key]) {							// iter over map contents
					if (obj[key][map] && obj[key][map][0] && obj[key][map][1]) {	// position 0 is name of map, 1 is value
						const mapKey = obj[key][map][0];
						const mapValue = obj[key][map][1];

						if (mapValue && mapValue.value) {			// here's the value field we should decode
							if (mapKey === 'ConsensusType') {
								try {								// try the new way
									const bin = base64ToUint8Array(mapValue.value);
									const ConsensusType = __pb_root.lookupType('orderer.ConsensusType');
									const p_consensus_type = ConsensusType.decode(bin);
									const consensus_type = ConsensusType.toObject(p_consensus_type, { defaults: false });

									const ConfigMetadata = __pb_root.lookupType('etcdraft.ConfigMetadata');
									const p_config_metadata = ConfigMetadata.decode(consensus_type.metadata);
									consensus_type.metadata = ConfigMetadata.toObject(p_config_metadata, { defaults: false, bytes: String });

									obj[key][map][1].value = consensus_type;
								} catch (e) {
									try {							// else try the old way
										obj[key][map][1].value = massDecodeMap[mapKey](mapValue.value);
									} catch (e) {
										logger.warn('[stitch] decode error [1] - decoding map key:', mapKey, e);
									}
								}
							}
							else if (!massDecodeMap[mapKey]) {		// check for a decoder in the old lib
								let pb_message_name = find_matching_message_name_basic(mapKey);	// check if the new lib has a decoder
								if (!pb_message_name) {
									logger.warn('[stitch] decode error - there is no known decoder for this map key', mapKey);
								} else {
									// try to use the new lib to decode unknown keys
									const bin = base64ToUint8Array(obj[key][map][1].value);
									obj[key][map][1].value = deserialize_binary(bin, pb_message_name); // only replace the inner value with the decoded object
								}
							} else {

								// Decoding happens here
								try {
									obj[key][map][1].value = massDecodeMap[mapKey](mapValue.value); // only replace the inner value with the decoded object
								} catch (e) {
									logger.warn('[stitch] decode error [2] - decoding map key:', mapKey, e);
								}
							}
						}

						// Decoding happens here too..
						if (mapValue && mapValue.policy && mapValue.policy.value) {		// here's the value field we should decode
							try {
								obj[key][map][1].policy.value = decode_policy_map(mapValue.policy.type, mapValue.policy.value);
							} catch (e) {
								logger.warn('[stitch] decode error - decoding policy map key:', mapKey, e);
							}
						}
						decode_map_value_keys(mapValue, ++depth);		// recursive!
					}
				}
			} else if (obj[key] && (obj[key].constructor.name === 'Object' || obj[key].constructor.name === 'Array')) {
				decode_map_value_keys(obj[key], ++depth);				// recursive!
			}
		}
	}
	return obj;
}

// decode a policy map by its type
function decode_policy_map(type: number, value: any) {
	if (type === 0) {					// type is "UNKNOWN"
		logger.error('[stitch] decode error - policy map is of type UNKNOWN');
	} else if (type === 1) {			// type is "SIGNATURE"
		let temp = <any>Policy_SignaturePolicyEnvelope.deserializeBinary(value);
		temp = temp.toObject();
		if (temp && temp.identitiesList) {
			for (let i in temp.identitiesList) {
				temp.identitiesList[i].principal = MSP_Principal_MSPRole.deserializeBinary(temp.identitiesList[i].principal).toObject();
			}
		}
		return JSON.parse(JSON.stringify(temp));	// make a deep copy to remove undefined nOutOf fields
	} else if (type === 2) {						// type is "MSP"
		logger.error('[stitch] decode error - dsh todo decode type MSP in policy map');
	} else if (type === 3) {						// type is "IMPLICIT_META"
		/* old lib decoding
		let temp = <any>Policies_ImplicitMetaPolicy.deserializeBinary(value);
		const obj = temp.toObject();
		if (obj) {									// flip rule from enum number to string representation
			if (obj.rule === 0) {
				obj.rule = 'ANY';
			} else if (obj.rule === 1) {
				obj.rule = 'ALL';
			} else if (obj.rule === 2) {
				obj.rule = 'MAJORITY';
			}
		}
		return obj;*/

		// new lib decoding
		const bin = base64ToUint8Array(value);
		const Message = __pb_root.lookupType('common.ImplicitMetaPolicy');
		const p_message = Message.decode(bin);
		return Message.toObject(p_message, { defaults: true, enums: String });
	}
	return null;
}

// -------------------------------------------------
// Decode the payload data of a block
// -------------------------------------------------
function decode_payload_data(b_data: any, type: number) {
	let ret: any = {};
	let proposalResponsePayload = null;
	let endorsementsList = [];
	logger.debug('[stitch] decode - payload type of block is', type);

	// types are defined in common.proto HeaderType (0 - 7)
	/*
	MESSAGE = 0;                   // Used for messages which are signed but opaque
	CONFIG = 1;                    // Used for messages which express the channel config
	CONFIG_UPDATE = 2;             // Used for transactions which update the channel config
	ENDORSER_TRANSACTION = 3;      // Used by the SDK to submit endorser based transactions
	ORDERER_TRANSACTION = 4;       // Used internally by the orderer for management
	DELIVER_SEEK_INFO = 5;         // Used as the type for Envelope messages submitted to instruct the Deliver API to seek
	CHAINCODE_PACKAGE = 6;         // Used for packaging chaincode artifacts for install
	PEER_RESOURCE_UPDATE = 7;      // Used for encoding updates to the peer resource configuration
	*/
	if (type === 1) {						// config envelope
		const p_config_envelope = Configtx_ConfigEnvelope.deserializeBinary(<Uint8Array>b_data);
		//logger.debug('[stitch] p_config_envelope?', p_config_envelope.toObject());

		let sequence = null, channelGroup = null;
		const p_config = p_config_envelope.getConfig();
		if (p_config) {
			sequence = p_config.getSequence();
			const p_channel_group = p_config.getChannelGroup();
			if (p_channel_group) {
				channelGroup = p_channel_group.toObject();
			}
		}

		let channel_header = null, signature = null, signature_header = null, config_update = null;
		let signatures = <any>[];
		const p_last_update = p_config_envelope.getLastUpdate();
		if (p_last_update) {
			const b_payload = p_last_update.getPayload();
			const p_payload = Common_Payload.deserializeBinary(<Uint8Array>b_payload);
			const b_data2 = p_payload.getData();
			const p_header = p_payload.getHeader();
			signature = p_last_update.getSignature_asB64();

			if (p_header) {
				const b_channel_header = p_header.getChannelHeader();
				const p_channel_header = Common_ChannelHeader.deserializeBinary(<Uint8Array>b_channel_header);
				channel_header = p_channel_header.toObject();
				logger.debug('[stitch] channel_header?', channel_header);

				const p_signature_header = p_header.getSignatureHeader();
				signature_header = decode_signature_header(p_signature_header);
			}

			if (b_data2) {
				const p_config_update_envelope = Configtx_ConfigUpdateEnvelope.deserializeBinary(<Uint8Array>b_data2);
				const b_config_update = p_config_update_envelope.getConfigUpdate();
				const p_config_update = Configtx_ConfigUpdate.deserializeBinary(<Uint8Array>b_config_update);
				config_update = p_config_update.toObject();

				const p_signature_list = p_config_update_envelope.getSignaturesList();
				for (let i in p_signature_list) {
					const p_signature_header = p_signature_list[i].getSignatureHeader();
					signatures.push({
						signatureHeader: decode_signature_header(p_signature_header),
						signature: p_signature_list[i].getSignature_asB64(),
					});
				}
			}
		}

		const config_envelope = {
			config: {
				sequence: sequence,
				channelGroup: channelGroup,
			},
			lastUpdate: {
				payload: {
					header: {
						signatureHeader: signature_header,
						channelHeader: channel_header
					},
					data: {
						configUpdate: config_update,
						signatures: signatures
					},
				},
				signatureHeader: signature
			}
		};
		//logger.debug('[stitch] config_envelope?', config_envelope);

		return config_envelope;

	} else if (type === 2) {				// config update envelope
		logger.error('[stitch] not implemented - dsh todo - decode this block type:', type);
	} else if (type === 3) {				// endorsed tx block
		const actionList = [];

		const p_transaction = Transaction_Transaction.deserializeBinary(<Uint8Array>b_data);
		logger.debug('[stitch] transaction?', p_transaction.toObject());

		const actions_list = p_transaction.getActionsList();
		for (let i in actions_list) {
			const b_header = actions_list[i].getHeader();
			const b_payload = actions_list[i].getPayload();

			// payload stuff --------------------------------------------------
			const p_chaincode_action_payload = Transactions_ChaincodeActionPayload.deserializeBinary(<Uint8Array>b_payload);
			const b_chaincode_proposal_payload = p_chaincode_action_payload.getChaincodeProposalPayload();
			const p_action = p_chaincode_action_payload.getAction();
			if (p_action) {
				const b_proposal_response_payload = p_action.getProposalResponsePayload();
				const p_proposal_response = Proposal_Response_ProposalResponsePayload.deserializeBinary(<Uint8Array>b_proposal_response_payload);
				const b_extension = p_proposal_response.getFabricExtension();
				const b_proposal_hash = p_proposal_response.getProposalHash_asB64();
				const p_chaincode_action = Proposal_ChaincodeAction.deserializeBinary(<Uint8Array>b_extension);
				const p_response = p_chaincode_action.getResponse();
				const b_results = p_chaincode_action.getResults();
				const b_events = p_chaincode_action.getEvents();
				const p_chaincode_id = p_chaincode_action.getChaincodeId();
				const p_tx_read_write_set = RwSet_TxReadWriteSet.deserializeBinary(<Uint8Array>b_results);
				const p_ns_rw_set_list = p_tx_read_write_set.getNsRwsetList();
				const p_dataModel = p_tx_read_write_set.getDataModel();
				const p_events = Chaincode_Event_ChaincodeEvent.deserializeBinary(<Uint8Array>b_events);

				const nsRwSet = [];
				for (let x in p_ns_rw_set_list) {							// iter over the read/write set array and decode each
					const b_rw_set = p_ns_rw_set_list[x].getRwset();
					const p_kv_rwset = Kv_RwSet_KVRWSet.deserializeBinary(<Uint8Array>b_rw_set);
					const kv_rwset = <any>p_kv_rwset.toObject();
					for (let z in kv_rwset.writesList) {
						if (kv_rwset.writesList[z].value) {
							try {
								kv_rwset.writesList[z].value = base64ToUtf8(kv_rwset.writesList[z].value);	// decode "value", might break so don't kill yourself trying
							} catch (e) {
							}
						}
					}
					nsRwSet.push({
						collectionHashedRwsetList: p_ns_rw_set_list[i].getCollectionHashedRwsetList(),
						namespace: p_ns_rw_set_list[i].getNamespace(),
						rwset: kv_rwset,
					});
				}

				proposalResponsePayload = {
					proposalHash: b_proposal_hash,
					extension: {
						results: {
							dataModel: p_dataModel,
							nsRwSet: nsRwSet
						},
						response: (p_response) ? p_response.toObject() : null,
						events: p_events.toObject(),
						chaincodeId: (p_chaincode_id) ? p_chaincode_id.toObject() : null
					},
				};
				logger.debug('[stitch] proposalResponsePayload?', proposalResponsePayload);

				const p_endorsementsList = p_action.getEndorsementsList();
				for (let x in p_endorsementsList) {							// iter over the endorsement array and decode each identity
					const b_endorser = p_endorsementsList[x].getEndorser();
					const p_serialized_identity = Identities_SerializedIdentity.deserializeBinary(<Uint8Array>b_endorser);
					const serialized_identity = p_serialized_identity.toObject();
					endorsementsList.push({
						endorser: serialized_identity,
						signature: p_endorsementsList[x].getSignature_asB64()
					});
				}
			}
			const p_chaincode_proposal_payload = Proposal_ChaincodeProposalPayload.deserializeBinary(<Uint8Array>b_chaincode_proposal_payload);
			const b_input = p_chaincode_proposal_payload.getInput();
			const p_input = Chaincode_ChaincodeInvocationSpec.deserializeBinary(<Uint8Array>b_input);
			const input = p_input.toObject();

			if (input && input.chaincodeSpec && input.chaincodeSpec.input) {			// base64 decode the input strings
				for (let x in input.chaincodeSpec.input.argsList) {
					try {
						input.chaincodeSpec.input.argsList[x] = base64ToUtf8(<string>input.chaincodeSpec.input.argsList[x]);
					} catch (e) { }
				}
			}

			// this block type has an action list, build the final format
			actionList.push({
				header: {
					signatureHeader: decode_signature_header(b_header),
				},
				payload: {
					chaincodeActionPayload: {
						chaincodeProposalPayload: {
							input: input,
							transientMap: p_chaincode_proposal_payload.getTransientmapMap(),
						}
					},
					action: {
						proposalResponsePayload: proposalResponsePayload,
						endorsementsList: endorsementsList
					}
				},
			});
			logger.debug('[stitch] actionList?', actionList);

			const transaction = {
				actionList: actionList,
			};
			return transaction;
		}
	} else {									// ?
		logger.error('[stitch] cannot decode, this block contains an unsupported payload type:', type);
	}

	return ret;
}

// -------------------------------------------------
// Decode a signature header all the way
// -------------------------------------------------
function decode_signature_header(b_header: any) {
	const p_signature_header = Common_SignatureHeader.deserializeBinary(<Uint8Array>b_header);
	const b_creator = p_signature_header.getCreator();
	const b_nonce = p_signature_header.getNonce_asB64();
	const p_serialized_identity = Identities_SerializedIdentity.deserializeBinary(<Uint8Array>b_creator);
	const serialized_identity = p_serialized_identity.toObject();
	// logger.debug('[stitch] decode - serialized_identity?', serialized_identity);

	return {
		creator: serialized_identity,
		nonce: b_nonce
	};
}

// -------------------------------------------------
// decode signature list
// -------------------------------------------------
function decode_signature_list(p_signaturesList: any[]) {
	const ret: any = [];
	for (let i in p_signaturesList) {
		ret.push(decode_signature_header(p_signaturesList[i].serializeBinary()));
	}
	//logger.debug('[stitch] decode - signaturesList?', pp(ret));
	return ret;
}

// -------------------------------------------------
// decode chaincode query response
// -------------------------------------------------
function decode_chaincode_query_response(b_chaincode_query_response: Uint8Array) {
	const p_chaincode_query_response = Query_Pb_ChaincodeQueryResponse.deserializeBinary(<Uint8Array>b_chaincode_query_response);
	const query_chaincode_response = p_chaincode_query_response.toObject();
	logger.debug('[stitch] decode - query_chaincode_response?', query_chaincode_response);
	return query_chaincode_response;
}

// -------------------------------------------------
// decode chaincode query response
// -------------------------------------------------
function decode_chaincode_deployment_spec(chaincode_package: Uint8Array) {
	let p_chaincode_deployment_spec = null;
	let chaincode_details: any = null;
	const cc_types = ['undefined', 'golang', 'node', 'car', 'java'];

	// convert package file to a "chaincode deployment spec" protobuf
	try {
		p_chaincode_deployment_spec = Chaincode_ChaincodeDeploymentSpec.deserializeBinary(chaincode_package);
		const chaincode_deployment_spec = p_chaincode_deployment_spec.toObject();
		logger.debug('[stitch] decode p_chaincode_deployment_spec?', chaincode_deployment_spec);
		if (!chaincode_deployment_spec || !chaincode_deployment_spec.chaincodeSpec || !chaincode_deployment_spec.chaincodeSpec.chaincodeId) {
			return { error: 'could not decode chaincode package into a chaincode deployment spec [2]' };
		} else {
			if (!chaincode_deployment_spec.chaincodeSpec.chaincodeId.name) {
				return { error: 'could not find chaincode "name" in the chaincode package' };
			}
			if (!chaincode_deployment_spec.chaincodeSpec.chaincodeId.version) {
				return { error: 'could not find chaincode "version" in the chaincode package' };
			}
			if (!chaincode_deployment_spec.chaincodeSpec.chaincodeId.path) {
				return { error: 'could not find chaincode "path" in the chaincode package' };
			}
		}
		const type = chaincode_deployment_spec.chaincodeSpec.type;
		chaincode_details = chaincode_deployment_spec.chaincodeSpec.chaincodeId;
		chaincode_details.type = (type < cc_types.length) ? cc_types[type] : cc_types[0];	// get friendly cc type
		chaincode_details.timeout = chaincode_deployment_spec.chaincodeSpec.timeout;
		chaincode_details.input = chaincode_deployment_spec.chaincodeSpec.input;

		return {																			// return summary and protobuf class
			chaincode_details: chaincode_details,
			p_chaincode_deployment_spec: p_chaincode_deployment_spec
		};
	} catch (e) {
		return { error: 'could not decode chaincode package into a chaincode deployment spec [1]' };
	}
}

// -------------------------------------------------
// Decode the processed transaction protobuf
// -------------------------------------------------
function decode_processed_transaction(b_data: Uint8Array) {
	let decoded = null;
	const p_processedTransaction = Transactions_ProcessedTransaction.deserializeBinary(b_data);
	const p_transactionEnvelope = p_processedTransaction.getTransactionenvelope();
	decoded = p_processedTransaction.toObject();
	if (p_transactionEnvelope) {
		decoded.transactionenvelope = <any>decode_common_envelope(p_transactionEnvelope.serializeBinary());
	}
	return decoded;
}

// --------------------------------------------------------------------------------
// replace protoc naming convention of keys with fabric's.
// 1. remove "List" suffixes
// 2. remove "Map" suffices
// 3. copy key's value
// --------------------------------------------------------------------------------
function format_protoc_to_pbjs(json: any, depth: number | null) {
	const ret = <any>{};
	if (!depth) { depth = 1; }
	if (depth >= 10000) {
		logger.error('Rabbit hole is too deep, won\'t parse object any further', depth);
		return ret;
	} else {
		//logger.debug('parsing again...', depth);

		for (let key in json) {
			if (typeof json[key] !== 'undefined') {
				let newKey = key;
				let isMap = false;

				// Step 1
				const lPos = key.indexOf('List');
				if (lPos >= 1 && lPos === key.length - 4) {					// only if it is at the end
					newKey = key.substring(0, lPos);						// remove "List" from the key name
				}

				// Step 2
				const mPos = key.indexOf('Map');
				if (mPos >= 1 && mPos === key.length - 3) {					// only if it is at the end
					newKey = key.substring(0, mPos);						// remove "Map" from the key name
					isMap = true;
				}

				// step 4 - copy value over
				if (isMap) {
					let unMapped = <any>{};
					for (let map in json[key]) {							// iter over map contents and remove their protoc map format
						if (json[key][map] && json[key][map][0] && json[key][map][1]) {
							const mapKey = json[key][map][0];
							const mapValue = json[key][map][1];
							//logger.debug('on map', map, mapKey, mapValue);
							unMapped[mapKey] = format_protoc_to_pbjs(mapValue, ++depth);	// recursive!
						}
					}
					ret[newKey] = unMapped;
				} else if (json[key].constructor.name === 'Object') {
					ret[newKey] = format_protoc_to_pbjs(json[key], ++depth);				// recursive!
				} else if (json[key].constructor.name === 'Array') {
					const arr = [];
					for (let i in json[key]) {												// iter over array contents and re-parse
						if (typeof json[key][i] !== 'undefined') {
							if (json[key][i].constructor.name === 'Object' || json[key][i].constructor.name === 'Array') {
								arr.push(format_protoc_to_pbjs(json[key][i], ++depth));			// recursive!
							} else {
								arr.push(json[key][i]);
							}
						}
					}
					ret[newKey] = arr;
				} else {
					ret[newKey] = json[key];
				}
			}
		}
	}
	return ret;
}

// --------------------------------------------------------------------------------
// replace protoc naming convention of keys with stitch's.
// 1. camelCase -> underscores.
// 2. rewrite Maps from "someMap":["key", "value"] -> "someMap":{"key": "value"}
// --------------------------------------------------------------------------------
function format_protoc_structure(json: any, depth: number) {
	const ret = <any>{};
	if (depth >= 10000) {
		logger.error('[stitch] decode - Rabbit hole is too deep, won\'t parse object any further', depth);
		return ret;
	} else {
		//logger.debug('parsing again...', depth);

		for (let key in json) {
			let newKey = key;
			let isMap = false;
			//logger.debug('on key', key, json[key]);

			const mPos = key.indexOf('Map');
			if (mPos >= 1 && mPos === key.length - 3) {					// only if it is at the end
				isMap = true;
			}

			// Step 1
			if (/[A-Z]/.test(newKey)) {
				newKey = camel_case_to_underscore(newKey);				// change camel case strings to underscore strings
			}

			// Step 2 - copy value over
			if (json[key] === undefined || json[key] === null) {		// catch empties here
				ret[newKey] = null;
			} else if (isMap) {
				let unMapped = <any>{};
				for (let map in json[key]) {							// iter over map contents and remove their protoc map format
					if (json[key][map] && json[key][map][0] && json[key][map][1]) {
						const mapKey = json[key][map][0];		// do NOT change this key, it must rename the same, e.g. PeerOrg1 cannot become peer_org_1
						const mapValue = json[key][map][1];
						//logger.debug('on map', map, mapKey, mapValue);
						unMapped[mapKey] = format_protoc_structure(mapValue, ++depth);	// recursive!
					}
				}
				ret[newKey] = unMapped;
			} else if (json[key].constructor.name === 'Object') {
				ret[newKey] = format_protoc_structure(json[key], ++depth);			// recursive!
			} else if (json[key].constructor.name === 'Array') {
				const arr = [];
				for (let i in json[key]) {											// iter over array contents and re-parse
					if (json[key][i].constructor.name === 'Object' || json[key][i].constructor.name === 'Array') {
						arr.push(format_protoc_structure(json[key][i], ++depth));	// recursive!
					} else {
						arr.push(json[key][i]);
					}
				}
				ret[newKey] = arr;
			} else {
				ret[newKey] = json[key];
			}
		}
	}
	return ret;

	function camel_case_to_underscore(cStr: any) {
		let _str = '';
		for (let i in cStr) {
			if (Number(i) >= 1 && cStr[i].toUpperCase() === cStr[i]) {	// if original string starts w/uppercase letter, leave it uppercase. b/c probably on purpose
				_str += '_' + cStr[i].toLowerCase();
			} else {
				_str += cStr[i];
			}
		}
		return _str;
	}
}

// --------------------------------------------------------------------------------
// Decode "chaincodeData" all the way
// --------------------------------------------------------------------------------
function __decode_chaincode_data_full(b_payload: Uint8Array) {
	const chaincodeLib = (new ChaincodeLib);
	const chaincode_data = chaincodeLib.__decode_chaincode_data(b_payload);
	try {
		chaincode_data.instantiationPolicy = {
			type: 1,
			value: decode_policy_map(1, chaincode_data.instantiationPolicy),		// this is wrong, pass its binary, dsh todo fix
		};
	} catch (e) {
	}

	try {
		chaincode_data.policy = {
			type: 1,
			value: decode_policy_map(1, chaincode_data.policy),
		};
	} catch (e) {
	}

	// https://github.com/hyperledger/fabric/blob/eca1b14b7e3453a5d32296af79cc7bad10c7673b/core/common/ccprovider/ccprovider.go#L457
	chaincode_data.id = uint8ArrayToBase64(chaincode_data.id);		// this is a hash to unique id the cc + version
	chaincode_data.data = uint8ArrayToBase64(chaincode_data.data);	// I don't know what this is
	return chaincode_data;
}

// --------------------------------------------------------------------------------
// Deserialize a block! - version 2 (protobuf.js) - not in use yet 07/15/2019 (soon)
// --------------------------------------------------------------------------------
function decodeBlockV2(b_data: Uint8Array) {
	const start = Date.now();
	//logger.debug('[decoder] start');
	const partial_decoded = deserialize_binary(b_data, 'common.Block');			// decode the first level to get our root field names set
	//logger.debug('[decoder] partial_decoded', JSON.parse(JSON.stringify(partial_decoded)));
	const fully_decoded = sort_keys(find_binary(partial_decoded, '', 0));		// now loop on fields and decode eevvvveeerrryyyooonnneeeeeeeeee
	const end = Date.now();
	logger.debug('[decoder] finish', (end - start), fully_decoded);
	return fully_decoded;
}

// recursively look for fields that are not deserialized and deserialize them with protobuf.js
function find_binary(data: any, beacon_string: string, iter: number): any {
	let json_path = JSON.parse(JSON.stringify(beacon_string));
	//logger.debug('\n[decoder]', json_path, iter);

	if (iter >= 100) {
		logger.error('[decoder] something is wrong, too deep, decode ending', iter);
		return null;
	}

	for (let key in data) {
		if (data[key] === null || typeof data[key] === 'undefined') {
			//logger.debug('[decoder] data[key] is null. key:', key, data);				// this is ok, null is valid sometimes
			continue;
		}

		//logger.debug('[decoder] on key:', key, 'datatype:', data[key].constructor.name, JSON.parse(JSON.stringify(data[key])));
		if (data[key].constructor.name === 'Object') {
			if (data[key].value && (key[0] === key[0].toUpperCase() || key === 'policy')) {		// objects that can be deserialized have a "value" field
				if (key !== 'ChannelCreationPolicy') {
					//logger.debug('[decoder] need to deserialize object:', key, data[key].constructor.name);
					data[key].value = go_deserialize(data[key].value, key);
				} else {
					data[key].value = go_deserialize(data[key].value, 'Policy');
				}
			}
			//logger.debug('[decoder] sending object 1 deeper', key);
			find_binary(data[key], update_beacon_str(json_path, key), ++iter);
		}

		else if (data[key].constructor.name === 'Array') {
			//logger.debug('[decoder] detected array ' + key, data[key].length);

			for (let i in data[key]) {
				if (data[key][i].constructor.name === 'Uint8Array') {
					//logger.debug('[decoder] need to deserialize array:', key, data[key][i].constructor.name);
					data[key][i] = go_deserialize(data[key][i], key);
					if (data[key][i] && data[key][i].constructor.name === 'Object') {
						//logger.debug('[decoder] sending array elem 1 deeper', key, i);
						find_binary(data[key][i], update_beacon_str(json_path, key) + '[' + i + ']', ++iter);
					}
				}

				else if (data[key][i] && data[key][i].constructor.name === 'Object') {
					//logger.debug('[decoder] sending array elem 2 deeper', key, i);
					find_binary(data[key][i], update_beacon_str(json_path, key) + '[' + i + ']', ++iter);
				}
			}
		}

		else if (data[key].constructor.name === 'Uint8Array') {
			//logger.debug('[decoder] need to deserialize uint8array:', key, data[key].constructor.name);
			data[key] = go_deserialize(data[key], key);
			if (data[key].constructor.name === 'Object') {
				//logger.debug('[decoder] sending object 2 deeper', key);
				find_binary(data[key], update_beacon_str(json_path, key), ++iter);
			}
		}

		if (key === 'sequence' || key === 'migrationContext') {
			data[key] = data[key].toString();				// configtxlator has these as strings
		} else if (key === 'version' && !data.rule) {
			data[key] = data[key].toString();				// configtxlator has these as strings
		}
	}

	//logger.debug('[decoder] loop finished', json_path, 'so far data:', data);
	return data;

	// update the debug string that tells us where we are in the block (json path)
	function update_beacon_str(beaconStr: string, key: string) {
		if (beaconStr === '') {
			beaconStr = key;
		} else {
			beaconStr = beaconStr + '.' + key;
		}
		return beaconStr;
	}

	// deserialize the data if we can
	function go_deserialize(b_data: Uint8Array, key_name: string) {
		const message = find_matching_message_name(key_name, data, beacon_string);			// grab the protobuf message name to use
		let ret = null;
		if (!message) {																		// if we don't have one, or null, b64 it
			if (b_data.constructor.name === 'Uint8Array') {
				ret = uint8ArrayToBase64(b_data);
				//logger.debug('[decoder] b64 encoded data:', key_name, ret);
			} else if (b_data.constructor.name === 'String') {
				// already done, nothing to do
			} else {
				logger.warn('[decoder] cannot b64 encoded data:', key_name, b_data);
			}
		} else {
			ret = deserialize_binary(b_data, message);										// here we go
			//logger.debug('deserialized data:', key_name, JSON.parse(JSON.stringify(ret, null, 2)));
		}
		return ret;
	}
}

// find the protobuf message name to use for the decode/deserialize
// null means leave as bytes
function find_matching_message_name(message: string, data: any, beaconStr: string) {
	const help_map = <any>{		// this map fills in the gaps in the official fabric protobuf structures
		'Data': (data_so_far: any, beacon_str: string) => {
			//logger.debug('[decoder] deciding on data message name.', JSON.parse(JSON.stringify(beacon_str)), JSON.parse(JSON.stringify(data_so_far)));
			if (beacon_str === 'data') {
				return 'common.Envelope';
			} else if (beacon_str.includes('lastUpdate.payload')) {
				return 'common.ConfigUpdateEnvelope';
			} else {
				return 'common.ConfigEnvelope';
			}
		},
		'Metadata': (data_so_far: any, beacon_str: string) => {
			//logger.debug('[decoder] deciding on metadata! message name. b:', JSON.parse(JSON.stringify(beacon_str)), 'data:', JSON.parse(JSON.stringify(data_so_far)));
			if (beacon_str.includes('ConsensusType')) {
				return 'etcdraft.ConfigMetadata';
			} else {
				return null;									// null means leave it as bytes & do not continue search
			}
		},
		'Value': (data_so_far: any, beacon_str: string) => {
			//logger.debug('!! [decoder] deciding on value message name.', JSON.parse(JSON.stringify(beacon_str)), JSON.parse(JSON.stringify(data_so_far)));
			if (beacon_str === 'metadata.metadata[1]') {
				return 'common.LastConfig';
			} if (beacon_str.includes('metadata.metadata[')) {
				return null;									// null means leave it as bytes & do not continue search
			} else {
				if (data_so_far && data_so_far.type === 1) {	// the oddball ChannelCreationPolicy ends up here
					return 'common.SignaturePolicyEnvelope';
				} else if (data_so_far && data_so_far.type === 3) {
					return 'common.ImplicitMetaPolicy';
				} else {
					return false;								// false means continue search outside help_map
				}
			}
		},
		'Policy': (data_so_far: any, beacon_str: string) => {
			//logger.debug('!!! [decoder] deciding on policy message name.', JSON.parse(JSON.stringify(beacon_str)), JSON.parse(JSON.stringify(data_so_far)));
			if (data_so_far && data_so_far.policy && data_so_far.policy.type === 1) {
				return 'common.SignaturePolicyEnvelope';
			} else if (data_so_far && data_so_far.policy && data_so_far.policy.type === 3) {
				return 'common.ImplicitMetaPolicy';
			} else {
				return false;									// false means continue search outside help_map
			}
		},
		'Config': (data_so_far: any, beacon_str: string) => {
			//logger.debug('[decoder] deciding on config message name.', JSON.parse(JSON.stringify(beacon_str)), JSON.parse(JSON.stringify(data_so_far)));
			if (beacon_str.includes('MSP.value')) {
				return 'msp.FabricMSPConfig';
			} else {
				return 'common.Config';
			}
		},
		'Endpoints': 'common.OrdererAddresses',					// for unknown reasons decoding Endpoints should really use OrdererAddresses
		'MSP': 'msp.MSPConfig',
		'Creator': 'msp.SerializedIdentity',
		'Principal': 'common.MSPRole',
		'SigningIdentity': 'msp.SerializedIdentity',			// unsure if this is right
		'PreviousHash': null,									// null means leave it as bytes & do not continue the search for the msg name
		'DataHash': null,
		'FabricExtension': null,
		'TlsCertHash': null,
		'IdBytes': null,
		'Nonce': null,
		'RootCerts': null,
		'Admins': null,
		'TlsRootCerts': null,
		'ClientTlsCert': null,
		'ServerTlsCert': null,
		'Signature': null,
		'ChannelCreationPolicy': null,
		'Extension': null,
		'Certificate': null,
	};
	const title_case = message[0].toUpperCase() + message.substring(1);		// use title case b/c that's how the protos are ingested

	// First - if the field name/key exist on the help map, use it to decide the message to use
	if (typeof help_map[title_case] !== 'undefined') {
		if (typeof help_map[title_case] === 'function') {
			const message_name = help_map[title_case](data, beaconStr);
			if (message_name || message_name === null) {					// if its false, move on and look through __pb_root, if null give up, use bytes
				//logger.debug('[decoder] found name in helper using qualifier.', message_name, JSON.parse(JSON.stringify(data)));
				return message_name;
			}
		} else if (typeof help_map[title_case] === 'string') {
			const message_name = help_map[title_case];
			//logger.debug('[decoder] found name in helper:', message_name);
			return message_name;
		} else if (help_map[title_case] === null) {
			//logger.debug('[decoder] found name in helper. will leave as bytes.');
			return null;
		}
	}

	// Second - scan all protobuf message names for similar names
	for (let package_name in __pb_root.nested) {
		if (__pb_root.nested[package_name][title_case]) {				// if the name matches, lets use it
			const message_name = package_name + '.' + __pb_root.nested[package_name][title_case].name;
			//logger.debug('[decoder] found name in pbjs:', message_name);
			return message_name;
		}
	}

	logger.warn('[decoder] did not find message name:', title_case);	// if we don't know it yet, warn us. need to add it to help_map or update protos
	return null;
}

// deserialize the binary data with protobuf.js
function deserialize_binary(bin: any, message_name: string) {
	if (message_name[0] === '_') {
		message_name = message_name.substring(1);			// cut off leading underscore
	}

	if (bin.constructor.name === 'Uint8Array') {
		//logger.debug('[decoder] deserialize message name:', message_name, bin.constructor.name, bin);
		try {
			const Message = __pb_root.lookupType(message_name);
			const p_message = Message.decode(bin);
			return Message.toObject(p_message, { defaults: true, enums: String /*bytes: String*/ });	// important to leave bytes as uint8array
		} catch (e) {
			logger.error('[decoder] unable to deserialize message name:', message_name, e, bin);
		}
	}
	return null;
}

// find the protobuf message name to use for the decode/deserialize
function find_matching_message_name_basic(message: string) {
	const title_case = message[0].toUpperCase() + message.substring(1);		// use title case b/c that's how the protos are ingested

	for (let package_name in __pb_root.nested) {
		if (__pb_root.nested[package_name][title_case]) {					// if the name matches, lets use it
			const message_name = package_name + '.' + __pb_root.nested[package_name][title_case].name;
			//logger.debug('[decoder] config found name in pbjs:', message_name, message);
			return message_name;
		}
	}
	return null;
}
