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
import { logger, camelCase_2_underscores, uint8ArrayToHexStr, utf8StrToUint8Array } from './misc';
import { conformPolicySyntax, detectImplicitPolicy, buildImplicitPolicySyntax, detectSignaturePolicy } from './sig_policy_syntax_lib';

export { buildTemplateConfigBlock };

// --------------------------------------------------------------------------------
// notes to self:
// There are two types of policies.
//  - Type 1 - SignaturePolicy - there must n signatures out of all defined identities to pass this policy
//  - Type 2 - ImplicitMetaPolicy - has 3 sub types: (these types are defined by pb "ImplicitMetaPolicy")
//    - Rule 0 means ANY signature will pas
//    - Rule 1 means ALL signatures needed to pass
//    - Rule 2 means MAJORITY of signatures need to pass

// the field "policies" defines multiple policies
// the field "mod_policy" will point to one of the entires defined in "policies" (the closest policies key)
// and its that policy must be met to change the data in "value"
// --------------------------------------------------------------------------------

// DEFAULT GENESIS BLOCK (aka config block, aka "Block" binary) for a new channel.
// This is for use with the osnadmin features
const template = {
	"data": {
		"data": [
			{
				"payload": {
					"data": {
						"config": {
							"channel_group": {
								"groups": {
									"Application": {
										"groups": {

											// this is the template for MSP's at the Application.group level.
											// each MSP passed will use the policies set below, thus this is the *default* MSP section for new channels.
											// (of course the "msp_identifier" will be edited to match it's msp id)
											"Org1MSP": {
												"groups": {},
												"mod_policy": "Admins",

												"policies": {
													"Admins": {
														"mod_policy": "Admins",
														"policy": {
															"type": 1,
															"value": {
																"identities": [
																	{
																		"principal": {

																			// replace below with org's MSP id
																			"msp_identifier": "Org1MSP",
																			"role": "ADMIN"
																		},
																		"principal_classification": "ROLE"
																	}
																],
																"rule": {
																	"n_out_of": {
																		"n": 1,
																		"rules": [
																			{
																				"signed_by": 0
																			}
																		]
																	}
																},
																"version": 0
															}
														},
														"version": "0"
													},
													"Endorsement": {
														"mod_policy": "Admins",
														"policy": {
															"type": 1,
															"value": {
																"identities": [
																	{
																		"principal": {

																			// replace below with org's MSP id
																			"msp_identifier": "Org1MSP",
																			"role": "PEER"
																		},
																		"principal_classification": "ROLE"
																	}
																],
																"rule": {
																	"n_out_of": {
																		"n": 1,
																		"rules": [
																			{
																				"signed_by": 0
																			}
																		]
																	}
																},
																"version": 0
															}
														},
														"version": "0"
													},
													"Readers": {
														"mod_policy": "Admins",
														"policy": {
															"type": 1,
															"value": {
																"identities": [
																	{
																		"principal": {

																			// replace below with org's MSP id
																			"msp_identifier": "Org1MSP",
																			"role": "ADMIN"
																		},
																		"principal_classification": "ROLE"
																	},
																	{
																		"principal": {

																			// replace below with org's MSP id
																			"msp_identifier": "Org1MSP",
																			"role": "PEER"
																		},
																		"principal_classification": "ROLE"
																	},
																	{
																		"principal": {

																			// replace below with org's MSP id
																			"msp_identifier": "Org1MSP",
																			"role": "CLIENT"
																		},
																		"principal_classification": "ROLE"
																	}
																],
																"rule": {
																	"n_out_of": {
																		"n": 1,
																		"rules": [
																			{
																				"signed_by": 0
																			},
																			{
																				"signed_by": 1
																			},
																			{
																				"signed_by": 2
																			}
																		]
																	}
																},
																"version": 0
															}
														},
														"version": "0"
													},
													"Writers": {
														"mod_policy": "Admins",
														"policy": {
															"type": 1,
															"value": {
																"identities": [
																	{
																		"principal": {

																			// replace below with org's MSP id
																			"msp_identifier": "Org1MSP",
																			"role": "ADMIN"
																		},
																		"principal_classification": "ROLE"
																	},
																	{
																		"principal": {

																			// replace below with org's MSP id
																			"msp_identifier": "Org1MSP",
																			"role": "CLIENT"
																		},
																		"principal_classification": "ROLE"
																	}
																],
																"rule": {
																	"n_out_of": {
																		"n": 1,
																		"rules": [
																			{
																				"signed_by": 0
																			},
																			{
																				"signed_by": 1
																			}
																		]
																	}
																},
																"version": 0
															}
														},
														"version": "0"
													}
												}, // end of "policies" key

												"values": {		// we are still in the "Org1MSP" key
													"MSP": {
														"mod_policy": "Admins",
														"value": {
															"config": {
																"admins": [],
																"crypto_config": {
																	"identity_identifier_hash_function": "SHA256",
																	"signature_hash_family": "SHA2"
																},
																"fabric_node_ous": undefined,
																"intermediate_certs": [],

																// field replace below with org's MSP id
																"name": "Org1MSP",

																"organizational_unit_identifiers": [],
																"revocation_list": [],
																"root_certs": [],
																"signing_identity": null,
																"tls_intermediate_certs": [],
																"tls_root_certs": []
															},
															"type": 0
														},
														"version": "0"
													}
												},
												"version": "0"
											}, // end of "Org1MSP" key
										}, // end of "groups" key


										// still in "Application" key

										"mod_policy": "Admins",

										"policies": {
											"Admins": {
												"mod_policy": "Admins",

												// set with field "application_policies.Admins"
												"policy": {
													"type": 3,
													"value": {
														"rule": "MAJORITY",
														"sub_policy": "Admins"
													}
												},
												"version": "0"
											},
											"Endorsement": {
												"mod_policy": "Admins",

												// set with field "application_policies.Endorsement"
												"policy": {
													"type": 3,
													"value": {
														"rule": "MAJORITY",
														"sub_policy": "Endorsement"
													}
												},
												"version": "0"
											},
											"LifecycleEndorsement": {
												"mod_policy": "Admins",

												// set with field "application_policies.LifecycleEndorsement"
												"policy": {
													"type": 3,

													"value": {
														"rule": "MAJORITY",
														"sub_policy": "Endorsement"
													}
												},
												"version": "0"
											},
											"Readers": {
												"mod_policy": "Admins",

												// set with field "application_policies.Readers"
												"policy": {
													"type": 3,
													"value": {
														"rule": "ANY",
														"sub_policy": "Readers"
													}
												},
												"version": "0"
											},
											"Writers": {
												"mod_policy": "Admins",

												// set with field "application_policies.Writers"
												"policy": {
													"type": 3,
													"value": {
														"rule": "ANY",
														"sub_policy": "Writers"
													}
												},
												"version": "0"
											}
										}, // end of "policies" key

										"values": {
											"Capabilities": {
												"mod_policy": "Admins",
												"value": {
													"capabilities": {

														// capabilities key is replaced with "application_capabilities" from input
														"V2_0": {}
													}
												},
												"version": "0"
											},

											// ACLs would go here if sent via field "application_acls" from input
											// there are no default ACLs, the whole block would be omitted if no acls
											/*ACLs: {
												"modPolicy": "Admins",
												"value": {
													"acls": {
														"lscc/ChaincodeExists": {
															"policy_ref": "/Channel/Application/Admins"
														}
													}
												}
											}*/
										},
										"version": "0"
									}, // end of "Application" key


									"Orderer": {
										"groups": {
											"OrdererMSP": {
												"groups": {},				// this stays empty
												"mod_policy": "Admins",
												"policies": {

													"Admins": {
														"mod_policy": "Admins",
														"policy": {
															"type": 1,
															"value": {
																"identities": [
																	{
																		"principal": {

																			// replace below with org's MSP id
																			"msp_identifier": "OrdererMSP",
																			"role": "ADMIN"
																		},
																		"principal_classification": "ROLE"
																	}
																],
																"rule": {
																	"n_out_of": {
																		"n": 1,
																		"rules": [
																			{
																				"signed_by": 0
																			}
																		]
																	}
																},
																"version": 0
															}
														},
														"version": "0"
													},
													"Readers": {
														"mod_policy": "Admins",
														"policy": {
															"type": 1,
															"value": {
																"identities": [
																	{
																		"principal": {

																			// replace below with org's MSP id
																			"msp_identifier": "OrdererMSP",
																			"role": "MEMBER"
																		},
																		"principal_classification": "ROLE"
																	}
																],
																"rule": {
																	"n_out_of": {
																		"n": 1,
																		"rules": [
																			{
																				"signed_by": 0
																			}
																		]
																	}
																},
																"version": 0
															}
														},
														"version": "0"
													},
													"Writers": {
														"mod_policy": "Admins",
														"policy": {
															"type": 1,
															"value": {
																"identities": [
																	{
																		"principal": {

																			// replace below with org's MSP id
																			"msp_identifier": "OrdererMSP",
																			"role": "MEMBER"
																		},
																		"principal_classification": "ROLE"
																	}
																],
																"rule": {
																	"n_out_of": {
																		"n": 1,
																		"rules": [
																			{
																				"signed_by": 0
																			}
																		]
																	}
																},
																"version": 0
															}
														},
														"version": "0"
													}
												}, // end of "policies" key

												"values": {
													"Endpoints": {
														"mod_policy": "Admins",
														"value": {

															// whole array replaced below with orderer_msps.OrdererMSP.addresses from input
															"addresses": [
																"orderer.example.com:7050"
															]
														},
														"version": "0"
													},

													// we are still in the "OrdererMSP" key
													"MSP": {
														"mod_policy": "Admins",
														"value": {
															"config": {
																"admins": [],
																"crypto_config": {
																	"identity_identifier_hash_function": "SHA256",
																	"signature_hash_family": "SHA2"
																},
																"fabric_node_ous": undefined,
																"intermediate_certs": [],

																// field replace below with orderer_msps.OrdererMSP.MSP.name from input
																"name": "OrdererMSP",

																"organizational_unit_identifiers": [],
																"revocation_list": [],
																"root_certs": [],
																"signing_identity": null,
																"tls_intermediate_certs": [],
																"tls_root_certs": []
															},
															"type": 0
														},
														"version": "0"
													}
												},
												"version": "0"
											} // end of "OrdererMSP" key
										}, // end of "groups" key

										// still in "Orderer" key

										"mod_policy": "Admins",
										"policies": {
											"Admins": {
												"mod_policy": "Admins",

												// set with field "orderer_policies.Admins"
												"policy": {
													"type": 3,
													"value": {
														"rule": "MAJORITY",
														"sub_policy": "Admins"
													}
												},
												"version": "0"
											},
											"BlockValidation": {
												"mod_policy": "Admins",

												// set with field "orderer_policies.BlockValidation"
												"policy": {
													"type": 3,
													"value": {
														"rule": "ANY",
														"sub_policy": "Writers"
													}
												},
												"version": "0"
											},
											"Readers": {
												"mod_policy": "Admins",

												// set with field "orderer_policies.Readers"
												"policy": {
													"type": 3,
													"value": {
														"rule": "ANY",
														"sub_policy": "Readers"
													}
												},
												"version": "0"
											},

											"Writers": {
												"mod_policy": "Admins",

												// set with field "orderer_policies.Writers"
												"policy": {
													"type": 3,
													"value": {
														"rule": "ANY",
														"sub_policy": "Writers"
													}
												},
												"version": "0"
											}
										}, // end of "policies" key

										"values": {
											"BatchSize": {
												"mod_policy": "Admins",
												"value": {

													// field replaced below with batch_size.absolute_max_bytes from input
													"absolute_max_bytes": 103809024,

													// field replaced below with batch_size.max_message_count from input
													"max_message_count": 10,

													// field replaced below with batch_size.preferred_max_bytes from input
													"preferred_max_bytes": 524288
												},
												"version": "0"
											},
											"BatchTimeout": {
												"mod_policy": "Admins",
												"value": {

													// field replaced below with batch_timeout.timeout from input
													"timeout": "2s"
												},
												"version": "0"
											},
											"Capabilities": {
												"mod_policy": "Admins",
												"value": {
													"capabilities": {

														// capabilities key is replaced with orderer_capabilities from input
														"V2_0": {}
													}
												},
												"version": "0"
											},
											"ChannelRestrictions": {
												"mod_policy": "Admins",

												// whole obj replaced below with channel_restrictions.value from input
												"value": null,

												"version": "0"
											},
											"ConsensusType": {
												"mod_policy": "Admins",
												"value": {
													"metadata": {

														// whole array replaced below with "consensus_type.consenters" from input
														// (only the fields below will copy, unknown fields are removed b/c configtxlator errors on unknown fields)
														"consenters": [
															{
																"client_tls_cert": "",
																"host": "orderer.example.com",
																"port": 7050,
																"server_tls_cert": ""
															}
														],

														// incomplete object can be passed, any unset fields will use the defaults below
														// use input field "consensus_type.options", pass null to use all defaults
														"options": {
															"election_tick": 10,
															"heartbeat_tick": 1,
															"max_inflight_blocks": 5,
															"snapshot_interval_size": 16777216,
															"tick_interval": "500ms"
														}
													},
													"state": "STATE_NORMAL",
													"type": "etcdraft"
												},
												"version": "0"
											}
										},
										"version": "0"
									} // end of "Orderer"
								}, // end of outer "groups"

								// inside "channel_group"
								"mod_policy": "Admins",
								"policies": {
									"Admins": {
										"mod_policy": "Admins",
										"policy": {
											"type": 3,
											"value": {
												"rule": "MAJORITY",
												"sub_policy": "Admins"
											}
										},
										"version": "0"
									},
									"Readers": {
										"mod_policy": "Admins",
										"policy": {
											"type": 3,
											"value": {
												"rule": "ANY",
												"sub_policy": "Readers"
											}
										},
										"version": "0"
									},
									"Writers": {
										"mod_policy": "Admins",
										"policy": {
											"type": 3,
											"value": {
												"rule": "ANY",
												"sub_policy": "Writers"
											}
										},
										"version": "0"
									}
								},
								"values": {
									"BlockDataHashingStructure": {
										"mod_policy": "Admins",
										"value": {
											"width": 4294967295
										},
										"version": "0"
									},
									"Capabilities": {
										"mod_policy": "Admins",
										"value": {
											"capabilities": {

												// capabilities key is replaced with channel_capabilities from input
												"V2_0": {}
											}
										},
										"version": "0"
									},
									"HashingAlgorithm": {
										"mod_policy": "Admins",
										"value": {
											"name": "SHA256"
										},
										"version": "0"
									},
									"OrdererAddresses": {
										"mod_policy": "/Channel/Orderer/Admins",
										"value": {

											// we are leaving this blank so that fabric uses the addresses defined in each org's section
											// include port, no protocol
											"addresses": []
										},
										"version": "0"
									}
								},
								"version": "0"
							},
							"sequence": "0"
						}, // end of "config"

						// genesis blocks have no last update (unlike config blocks)
						"last_update": null
					},
					"header": {
						"channel_header": {

							// replaced below
							"channel_id": "mychannel",

							"epoch": "0",

							"extension": null,

							// replaced below
							"timestamp": "2022-02-16T19:38:24Z",

							"tls_cert_hash": null,

							// replaced below with mostly random bytes
							"tx_id": "f3483b0ad4060b5eaac082e41e8bfd7a3ecdff4553b54338f4f12999024b411b",

							// types are defined in common.proto HeaderType (0 - 7), always 1 for this use
							"type": 1,

							"version": 1
						},
						"signature_header": {
							"creator": null,
							"nonce": "FIBsoAadZu90sxyoTar5G6bteRqfgHra"
						}
					}
				},
				"signature": null
			}
		]
	},
	"header": {
		"data_hash": "JAxIp0y5lTO0XOkgJllLUJ1tf2lnYhsTFZtORwE+TG8=",
		"number": "0",
		"previous_hash": null
	},
	"metadata": {
		"metadata": [

			// I believe "CgIKAA==" decodes out to `{'value': {'index': 0}}` zero being the block height,
			// which it should be for a genesis block, not sure why configtxlator doesn't decode this fully
			"CgIKAA==",

			"",
			"",
			"",
			""
		]
	}
}


// -------------------------------------------------------------
// tweak the template config block with the given options
// -------------------------------------------------------------
/*
	opts: {
		channel: 'my_first_channel',
		application_capabilities: ['V2_0'],
		orderer_capabilities: ['V2_0'],
		channel_capabilities: ['V2_0'],
		application_msps: {
																// create 1 key for each msp id
			Org1MSP: {
				Admins: null,									// can be null or absent, or a signature policy string, or a implicit policy string
				Endorsement: null,								// can be null or absent, or a signature policy string, or a implicit policy string
				Readers: null,									// can be null or absent, or a signature policy string, or a implicit policy string
				Writers: null,									// can be null or absent, or a signature policy string, or a implicit policy string
				MSP: {
					admins: [],
					fabric_node_ous: {}, 						// set whole object, there are no defaults inside (see template block for values)
					intermediate_certs: [],
					organizational_unit_identifiers: [],
					revocation_list: [],
					root_certs: [],								// [required] - base 64 encoded pems
					signing_identity: null,
					tls_intermediate_certs: [],
					tls_root_certs: [],							// [required] - base 64 encoded pems
				},
			}
		},
		application_policies: {
			Admins: 'MAJORITY Admins',							// can be null or absent, or a signature policy string, or a implicit policy string
			Endorsement: 'MAJORITY Endorsement',				// can be null or absent, or a signature policy string, or a implicit policy string
			LifecycleEndorsement: 'MAJORITY Endorsement',		// can be null or absent, or a signature policy string, or a implicit policy string
			Readers: 'ANY Readers',								// can be null or absent, or a signature policy string, or a implicit policy string
			Writers: 'ANY Writers',								// can be null or absent, or a signature policy string, or a implicit policy string
		},
		application_acls: {										// can be null or absent
			<acl-name> : <acl-value>
		},
		orderer_msps: {											// create 1 key for each msp id
			OrdererMSP: {
				Admins: 'OutOf(1, "OrdererMSP.ADMIN")',			// can be null or absent, or a signature policy string, or a implicit policy string
				Readers: 'OutOf(1, "OrdererMSP.MEMBER")',		// can be null or absent, or a signature policy string, or a implicit policy string
				Writers: 'OutOf(1, "OrdererMSP.MEMBER")',		// can be null or absent, or a signature policy string, or a implicit policy string
				addresses: ['orderer.example.com:7050'],		// [required] string of addresses including port
				MSP: {
					admins: [],
					fabric_node_ous: {}, 						// [note] set whole object, there are no defaults inside (see template block for values)
					intermediate_certs: [],
					organizational_unit_identifiers: [],
					revocation_list: [],
					root_certs: [],								// [required] - base 64 encoded pems
					signing_identity: null,
					tls_intermediate_certs: [],
					tls_root_certs: [],							// [required] - base 64 encoded pems
					name: 'OrdererMSP',							// [required] - msp id
				},
			}
		},
		orderer_policies: {
			Admins: 'MAJORITY Admins',							// can be null or absent, or a signature policy string, or a implicit policy string
			BlockValidation: 'ANY Writers',						// can be null or absent, or a signature policy string, or a implicit policy string
			Readers: 'ANY Readers',								// can be null or absent, or a signature policy string, or a implicit policy string
			Writers: 'ANY Writers',								// can be null or absent, or a signature policy string, or a implicit policy string
		},
		batch_size: {
			absolute_max_bytes: 0,
			max_message_count: 0,
			preferred_max_bytes: 0,
		},
		batch_timeout: {
			timeout: '2s'
		},
		channel_restrictions:{
			value: {}											// set whole object, there are no defaults inside (see template block for values)
		},
		consensus_type: {
			consenters: [{										// [required] set the whole array and all fields. there are no defaults inside
				"host": "orderer.example.com",					// [required]
				"port": 7050,									// [required]
				"server_tls_cert": "",							// [required]
				"client_tls_cert": "",							// [required]
			}],
			options: {
				election_tick: 0,
				heartbeat_tick: 0,
				max_inflight_blocks: 0,
				snapshot_interval_size: 0,
				tick_interval: ""
			}
		}
	}
*/
function buildTemplateConfigBlock(opts: ExtTemp) {
	let app_caps: StringObj = {}, ord_caps: StringObj = {}, ch_caps: StringObj = {};
	const ret = JSON.parse(JSON.stringify(template));

	// set channel name
	ret.data.data[0].payload.header.channel_header.channel_id = opts.channel;

	// set date
	const d = new Date();
	ret.data.data[0].payload.header.channel_header.timestamp = d.toISOString();

	// set application capabilities
	if (Array.isArray(opts.application_capabilities)) {
		for (let i in opts.application_capabilities) {
			const cap = opts.application_capabilities[i];
			app_caps[cap] = {};
		}
		ret.data.data[0].payload.data.config.channel_group.groups.Application.values.Capabilities.value.capabilities = app_caps;
	}

	// set orderer capabilities
	if (Array.isArray(opts.orderer_capabilities)) {
		for (let i in opts.orderer_capabilities) {
			const cap = opts.orderer_capabilities[i];
			ord_caps[cap] = {};
		}
		ret.data.data[0].payload.data.config.channel_group.groups.Orderer.values.Capabilities.value.capabilities = ord_caps;
	}

	// set channel capabilities
	if (Array.isArray(opts.channel_capabilities)) {
		for (let i in opts.channel_capabilities) {
			const cap = opts.channel_capabilities[i];
			ch_caps[cap] = {};
		}
		ret.data.data[0].payload.data.config.channel_group.values.Capabilities.value.capabilities = ch_caps;
	}

	// set transaction id
	if (typeof opts.channel === 'string') {
		const b_channel = utf8StrToUint8Array(opts.channel.substring(0, 8));		// only use a few bytes of the channel name to avoid a duplicate tx id
		const LEN = 32;
		const nonce = window.crypto.getRandomValues(new Uint8Array(LEN - b_channel.length));
		let id_bytes = new Uint8Array(LEN);
		id_bytes.set(nonce);														// add the nonce bytes first
		id_bytes.set(b_channel, nonce.length);
		const tx_id = uint8ArrayToHexStr(id_bytes, true).toLowerCase();
		ret.data.data[0].payload.header.channel_header.tx_id = tx_id;
	}

	// clear things that seem unused
	ret.data.data[0].payload.header.signature_header.nonce = '';
	ret.header.data_hash = '';

	// ---------------------------------------------------------------------------------
	// Application.groups Section
	// ---------------------------------------------------------------------------------

	// set groups.Application.groups
	const defaults = ret.data.data[0].payload.data.config.channel_group.groups.Application.groups.Org1MSP;		// remember defaults
	ret.data.data[0].payload.data.config.channel_group.groups.Application.groups = {};							// clear it out
	for (let msp_id in opts.application_msps) {
		ret.data.data[0].payload.data.config.channel_group.groups.Application.groups[msp_id] = buildAppGroupObj(defaults, opts.application_msps[msp_id], msp_id);
	}

	// set application policies
	const policy_names = ['Admins', 'Endorsement', 'LifecycleEndorsement', 'Readers', 'Writers'];
	for (let i in policy_names) {
		const policyName = policy_names[i];
		if (opts.application_policies && detectImplicitPolicy(opts.application_policies[policyName])) {
			ret.data.data[0].payload.data.config.channel_group.groups.Application.policies[policyName].policy = buildImplicitPolicySyntax(opts.application_policies[policyName]);
		} else if (opts.application_policies && detectSignaturePolicy(opts.application_policies[policyName])) {
			// theses policies default to implicit type && conformPolicySyntax() doesn't build the policy wrapper
			// so if its a sig type we need to change the "type" field too
			ret.data.data[0].payload.data.config.channel_group.groups.Application.policies[policyName].policy = {
				type: 1,
				value: camelCase_2_underscores(conformPolicySyntax(opts.application_policies[policyName]), 0)
			}
		} else {
			// uses default policy
		}
	}

	// set application acls
	if (opts.application_acls) {
		for (let acl_name in opts.application_acls) {
			if (!ret.data.data[0].payload.data.config.channel_group.groups.Application.values.ACLs) {
				ret.data.data[0].payload.data.config.channel_group.groups.Application.values.ACLs = {				// init
					modPolicy: 'Admins',
					value: {
						acls: {}
					}
				};
			}
			ret.data.data[0].payload.data.config.channel_group.groups.Application.values.ACLs.value.acls[acl_name] = { policy_ref: opts.application_acls[acl_name] }
		}
	}

	// ---------------------------------------------------------------------------------
	// Orderer.groups Section
	// ---------------------------------------------------------------------------------

	// validate
	if (!opts.orderer_msps && Object.keys(opts.orderer_msps).length === 0) {
		logger.error('[config] cannot build genesis block, missing Orderer MSP data from input');
		return null;
	}

	// set groups.Orderer.groups
	const o_defaults = ret.data.data[0].payload.data.config.channel_group.groups.Orderer.groups.OrdererMSP;		// remember defaults
	ret.data.data[0].payload.data.config.channel_group.groups.Orderer.groups = {};								// clear it out
	for (let msp_id in opts.orderer_msps) {
		ret.data.data[0].payload.data.config.channel_group.groups.Orderer.groups[msp_id] = buildOrdererGroupObj(o_defaults, opts.orderer_msps[msp_id], msp_id);
	}

	// set orderer policies
	const orderer_policy_names = ['Admins', 'BlockValidation', 'Readers', 'Writers'];
	for (let i in orderer_policy_names) {
		const policyName = orderer_policy_names[i];
		if (opts.orderer_policies && detectImplicitPolicy(opts.orderer_policies[policyName])) {
			ret.data.data[0].payload.data.config.channel_group.groups.Orderer.policies[policyName].policy = buildImplicitPolicySyntax(opts.orderer_policies[policyName]);
		} else if (opts.orderer_policies && detectSignaturePolicy(opts.orderer_policies[policyName])) {
			// theses policies default to implicit type && conformPolicySyntax() doesn't build the policy wrapper
			// so if its a sig type we need to change the "type" field too
			ret.data.data[0].payload.data.config.channel_group.groups.Orderer.policies[policyName].policy = {
				type: 1,
				value: camelCase_2_underscores(conformPolicySyntax(opts.orderer_policies[policyName]), 0)
			}
		} else {
			// uses default policy
		}
	}

	// ---------------------------------------------------------------------------------
	// Orderer.values Section
	// ---------------------------------------------------------------------------------

	// set Orderer.values settings
	if (opts.batch_size && opts.batch_size.absolute_max_bytes && !isNaN(opts.batch_size.absolute_max_bytes)) {
		ret.data.data[0].payload.data.config.channel_group.groups.Orderer.values.BatchSize.value.absolute_max_bytes = Number(opts.batch_size.absolute_max_bytes);
	}
	if (opts.batch_size && opts.batch_size.max_message_count && !isNaN(opts.batch_size.max_message_count)) {
		ret.data.data[0].payload.data.config.channel_group.groups.Orderer.values.BatchSize.value.max_message_count = Number(opts.batch_size.max_message_count);
	}
	if (opts.batch_size && opts.batch_size.preferred_max_bytes && !isNaN(opts.batch_size.preferred_max_bytes)) {
		ret.data.data[0].payload.data.config.channel_group.groups.Orderer.values.BatchSize.value.preferred_max_bytes = Number(opts.batch_size.preferred_max_bytes);
	}
	if (opts.batch_timeout && typeof opts.batch_timeout.timeout === 'string') {
		ret.data.data[0].payload.data.config.channel_group.groups.Orderer.values.BatchTimeout.value.timeout = opts.batch_timeout.timeout;
	}
	if (opts.channel_restrictions && opts.channel_restrictions.value) {
		ret.data.data[0].payload.data.config.channel_group.groups.Orderer.values.ChannelRestrictions.value.timeout = opts.channel_restrictions.value;
	}
	if (opts.consensus_type && Array.isArray(opts.consensus_type.consenters)) {
		ret.data.data[0].payload.data.config.channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters = sanitizeConsenters(opts.consensus_type.consenters);
	}

	// set Orderer.values.ConsensusType.value.metadata.options
	if (opts.consensus_type && typeof opts.consensus_type.options === 'object' && opts.consensus_type.options) {
		if (!isNaN(opts.consensus_type.options.election_tick)) {
			ret.data.data[0].payload.data.config.channel_group.groups.Orderer.values.ConsensusType.value.metadata.options.election_tick = opts.consensus_type.options.election_tick;
		}
		if (!isNaN(opts.consensus_type.options.heartbeat_tick)) {
			ret.data.data[0].payload.data.config.channel_group.groups.Orderer.values.ConsensusType.value.metadata.options.heartbeat_tick = opts.consensus_type.options.heartbeat_tick;
		}
		if (!isNaN(opts.consensus_type.options.max_inflight_blocks)) {
			ret.data.data[0].payload.data.config.channel_group.groups.Orderer.values.ConsensusType.value.metadata.options.max_inflight_blocks = opts.consensus_type.options.max_inflight_blocks;
		}
		if (!isNaN(opts.consensus_type.options.snapshot_interval_size)) {
			ret.data.data[0].payload.data.config.channel_group.groups.Orderer.values.ConsensusType.value.metadata.options.snapshot_interval_size = opts.consensus_type.options.snapshot_interval_size;
		}
		if (typeof opts.consensus_type.options.tick_interval === 'string') {
			ret.data.data[0].payload.data.config.channel_group.groups.Orderer.values.ConsensusType.value.metadata.options.tick_interval = opts.consensus_type.options.tick_interval;
		}
	}

	// whew... all done
	return ret;
}

// build 1 data.data[0].payload.data.config.channel_group.groups.Application.groups object up
function buildAppGroupObj(defaults: any, msp_data: any, msp_id: string) {
	const grpObj = JSON.parse(JSON.stringify(defaults));
	const policy_names = ['Admins', 'Endorsement', 'Readers', 'Writers'];

	// validate
	if (!msp_data) {
		logger.error('[config] cannot build genesis block, missing ALL application org msp data from input:', msp_id);
		return null;
	}

	// set each policy in groups.Application.groups[msp_id].policies
	for (let i in policy_names) {
		const policyName = policy_names[i];
		if (detectImplicitPolicy(msp_data[policyName])) {
			grpObj.policies[policyName].policy = buildImplicitPolicySyntax(msp_data[policyName]);
		} else if (detectSignaturePolicy(msp_data[policyName])) {
			grpObj.policies[policyName].policy.value =
				camelCase_2_underscores(conformPolicySyntax(msp_data[policyName]), 0);
		} else {
			// use default policy, but edit it for this msp id
			for (let i in grpObj.policies[policyName].policy.value.identities) {			// 'Readers' has a few entries, iter on each
				grpObj.policies[policyName].policy.value.identities[i].principal.msp_identifier = msp_id;
			}
		}
	}

	// set groups.Application.groups[msp_id].values.MSP
	if (msp_data.MSP) {

		// set fabric_node_ous
		if (msp_data.MSP.fabric_node_ous) {
			grpObj.values.MSP.value.config.fabric_node_ous = msp_data.MSP.fabric_node_ous;
		} else {
			delete grpObj.values.MSP.value.config.fabric_node_ous;
		}

		// set each certificate array field
		const fields = ['admins', 'intermediate_certs', 'organizational_unit_identifiers', 'revocation_list', 'root_certs', 'tls_intermediate_certs', 'tls_root_certs'];
		for (let i in fields) {
			const field = fields[i];
			if (Array.isArray(msp_data.MSP[field]) && msp_data.MSP[field].length > 0) {
				grpObj.values.MSP.value.config[field] = msp_data.MSP[field];
			}
		}

		// set signing_identity
		if (msp_data.MSP.signing_identity) {
			grpObj.values.MSP.value.config.signing_identity = msp_data.MSP.signing_identity;
		}

		// set name
		grpObj.values.MSP.value.config.name = msp_id;
	}

	return grpObj;
}

// build 1 ret.data.data[0].payload.data.config.channel_group.groups.Orderer.groups object up
function buildOrdererGroupObj(defaults: any, msp_data: any, msp_id: string) {
	const grpObj = JSON.parse(JSON.stringify(defaults));
	const policy_names = ['Admins', 'Readers', 'Writers'];

	// validate
	if (!msp_data) {
		logger.error('[config] cannot build genesis block, missing ALL orderer org msp data from input:', msp_id);
		return null;
	}

	// set each policy in groups.Orderer.groups[msp_id].policies
	for (let i in policy_names) {
		const policyName = policy_names[i];
		if (detectImplicitPolicy(msp_data[policyName])) {
			grpObj.policies[policyName].policy = buildImplicitPolicySyntax(msp_data[policyName]);
		} else if (detectSignaturePolicy(msp_data[policyName])) {
			grpObj.policies[policyName].policy.value =
				camelCase_2_underscores(conformPolicySyntax(msp_data[policyName]), 0);
		} else {
			// use default policy, but edit it for this msp id
			for (let i in grpObj.policies[policyName].policy.value.identities) {			// 'Readers' has a few entries, iter on each
				grpObj.policies[policyName].policy.value.identities[i].principal.msp_identifier = msp_id;
			}
		}
	}

	// set OrdererMSP endpoint addresses
	if (!msp_data.addresses) {
		logger.error('[config] cannot build genesis block, missing orderer org\'s addresses from input:', msp_id);
		return null;
	} else {
		grpObj.values.Endpoints.value.addresses = msp_data.addresses;
	}

	// set groups.Orderer.groups[msp_id].values.MSP
	if (!msp_data.MSP) {
		logger.error('[config] cannot build genesis block, missing orderer org\'s MSP info from input:', msp_id);
		return null;
	} else {

		// set OrdererMSP fabric_node_ous
		if (msp_data.MSP.fabric_node_ous) {
			grpObj.values.MSP.value.config.fabric_node_ous = msp_data.MSP.fabric_node_ous;
		} else {
			delete grpObj.values.MSP.value.config.fabric_node_ous;
		}

		// set each OrdererMSP certificate array field
		const fields = ['admins', 'intermediate_certs', 'organizational_unit_identifiers', 'revocation_list', 'root_certs', 'tls_intermediate_certs', 'tls_root_certs'];
		for (let i in fields) {
			const field = fields[i];
			if (Array.isArray(msp_data.MSP[field]) && msp_data.MSP[field].length > 0) {
				grpObj.values.MSP.value.config[field] = msp_data.MSP[field];
			}
		}

		// set OrdererMSP signing_identity
		if (msp_data.MSP.signing_identity) {
			grpObj.values.MSP.value.config.signing_identity = msp_data.MSP.signing_identity;
		}

		// set OrdererMSP name
		grpObj.values.MSP.value.config.name = msp_id;
	}

	return grpObj;
}

// configtxlator will not let you send unknown fields, so only send the white listed fields
function sanitizeConsenters(arr: Cons[]) {
	let ret = [];
	if (Array.isArray(arr)) {
		for (let i in arr) {
			ret.push({
				host: arr[i].host,
				port: arr[i].port,
				server_tls_cert: arr[i].server_tls_cert,
				client_tls_cert: arr[i].client_tls_cert,
			});
		}
	}
	return ret;
}

interface ExtTemp {
	channel: string,
	application_capabilities: string[] | null;
	orderer_capabilities: string[] | null;
	channel_capabilities: string[] | null;
	application_msps: StringObj2;
	application_policies: StringObjStr;
	application_acls: StringObjStr | null;
	orderer_policies: StringObjStr;
	orderer_msps: StringObj2;
	batch_size: {
		absolute_max_bytes: number | null,
		max_message_count: number | null,
		preferred_max_bytes: number | null,
	} | null,
	batch_timeout: {
		timeout: string
	} | null,
	channel_restrictions: {
		value: object
	} | null,
	consensus_type: {
		consenters: Cons[],
		options: {
			election_tick: number,
			heartbeat_tick: number,
			max_inflight_blocks: number,
			snapshot_interval_size: number,
			tick_interval: string,
		} | null,
	}
}

interface Cons {
	host: string;
	port: string;
	server_tls_cert: string;
	client_tls_cert: string;
}

interface StringObj {
	[index: string]: object;
}

interface StringObj2 {
	[index: string]: {
		MSP: any,
		//MSP: MspObj
	};
}

interface StringObjStr {
	[index: string]: string;
}
