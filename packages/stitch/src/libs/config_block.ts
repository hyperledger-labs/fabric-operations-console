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

// Libs built by us
import { logger, camelCase_2_underscores } from './misc';
import { conformPolicySyntax } from './sig_policy_syntax_lib';

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
																"fabric_node_ous": null,
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


										"mod_policy": "Admins",

										// dsh todo allow setting policies here
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
											"Endorsement": {
												"mod_policy": "Admins",
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
										}, // end of "policies" key

										"values": {
											"Capabilities": {
												"mod_policy": "Admins",
												"value": {
													"capabilities": {

														// capabilities key is replaced with application_capabilities from input
														"V2_0": {}
													}
												},
												"version": "0"
											}
										},
										"version": "0"
									}, // end of "Application" key


									"Orderer": {
										"groups": {
											"OrdererOrg": {
												"groups": {},
												"mod_policy": "Admins",
												"policies": {

													"Admins": {
														"mod_policy": "Admins",
														"policy": {
															"type": 1,

															// must be replaced with signature based policy from input
															"value": {}
														},
														"version": "0"
													},
													"Readers": {
														"mod_policy": "Admins",
														"policy": {
															"type": 1,

															// must be replaced with signature based policy from input
															"value": {}
														},
														"version": "0"
													},
													"Writers": {
														"mod_policy": "Admins",
														"policy": {
															"type": 1,

															// must be replaced with signature based policy from input
															"value": {}
														},
														"version": "0"
													}
												}, // end of "policies" key

												"values": {
													"Endpoints": {
														"mod_policy": "Admins",
														"value": {

															// whole array replaced below with orderer_msps.OrdererOrg.addresses from input
															"addresses": [
																"orderer.example.com:7050"
															]
														},
														"version": "0"
													},
													"MSP": {
														"mod_policy": "Admins",
														"value": {
															"config": {
																"admins": [],
																"crypto_config": {
																	"identity_identifier_hash_function": "SHA256",
																	"signature_hash_family": "SHA2"
																},
																"fabric_node_ous": null,
																"intermediate_certs": [],

																// field replace below with orderer_msps.OrdererOrg.MSP.name from input
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
											} // end of "OrdererOrg" key
										}, // end of "groups" key

										"mod_policy": "Admins",
										"policies": {

											// dsh todo allow setting this
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

											// dsh todo allow setting this
											"BlockValidation": {
												"mod_policy": "Admins",
												"policy": {
													"type": 3,
													"value": {
														"rule": "ANY",
														"sub_policy": "Writers"
													}
												},
												"version": "0"
											},

											// dsh todo allow setting this
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

											// dsh todo allow setting this
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

														// whole array replaced below with consensus_type.consenters from input
														"consenters": [
															{
																"client_tls_cert": "",
																"host": "orderer.example.com",
																"port": 7050,
																"server_tls_cert": ""
															}
														],

														// whole obj replaced below with consensus_type.options from input
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
											"addresses": []
										},
										"version": "0"
									}
								},
								"version": "0"
							},
							"sequence": "0"
						},

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

							// replace this - dsh todo
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
			"CgIKAA==",
			"",
			"",
			"",
			""
		]
	}
}


// -------------------------------------------------------------
// tweak the template config block with the given options - dsh todo, lots of things to set!
// -------------------------------------------------------------
/*
	opts: {
		channel: 'my_first_channel',
		application_capabilities: 'V2_0',
		orderer_capabilities: 'V2_0',
		channel_capabilities: 'V2_0',
		application_msps: {
			Org1MSP: {
				Admins: 'default',								// can be null or 'default'
				Endorsement: 'default',							// can be null or 'default'
				Readers: 'default',								// can be null or 'default'
				Writers: 'default',								// can be null or 'default'
				MSP: {
					fabric_node_ous: {}, 						// set whole object, there are no defaults inside
					intermediate_certs: [],
					organizational_unit_identifiers: [],
					revocation_list: [],
					root_certs: [],								// required - base 64 encoded pems
					signing_identity: null,
					tls_intermediate_certs: [],
					tls_root_certs: [],							// required - base 64 encoded pems
				},
			}
		},
		orderer_msps: {
			OrdererOrg: {
				Admins: 'OutOf(1, "OrdererMSP.ADMIN")',			// required - signing policy
				Readers: 'OutOf(1, "OrdererMSP.MEMBER")',		// required - signing policy
				Writers: 'OutOf(1, "OrdererMSP.MEMBER")',		// required - signing policy
				addresses: ['orderer.example.com:7050'],		// required, string of addresses including port
				MSP: {
					fabric_node_ous: {}, 						// set whole object, there are no defaults inside
					intermediate_certs: [],
					organizational_unit_identifiers: [],
					revocation_list: [],
					root_certs: [],								// required - base 64 encoded pems
					signing_identity: null,
					tls_intermediate_certs: [],
					tls_root_certs: [],							// required - base 64 encoded pems
					name: 'OrdererMSP',							// required - msp id
				},
			}
		},
		batch_size: {
			absolute_max_bytes: 0,
			max_message_count: 0,
			preferred_max_bytes: 0,
		},
		batch_timeout: {
			timeout: 0
		},
		channel_restrictions:{
			value: {}
		},
		consensus_type: {
			consenters: [{}],									// required - object
			options: {},										// set whole object, there are no defaults inside
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

	// set tx id
	//ret.data.data[0].payload.header.channel_header.tx_id = d.toISOString();

	// set application capabilities
	if (opts.application_capabilities) {
		app_caps[opts.application_capabilities] = {};
		ret.data.data[0].payload.data.config.channel_group.groups.Application.values.Capabilities.value.capabilities = app_caps;
	}

	// set orderer capabilities
	if (opts.orderer_capabilities) {
		ord_caps[opts.orderer_capabilities] = {};
		ret.data.data[0].payload.data.config.channel_group.groups.Orderer.values.Capabilities.value.capabilities = ord_caps;
	}

	// set channel capabilities
	if (opts.channel_capabilities) {
		ch_caps[opts.channel_capabilities] = {};
		ret.data.data[0].payload.data.config.channel_group.values.Capabilities.value.capabilities = ch_caps;
	}

	// ---------------------------------------------------------------------------------
	// Application.groups Section
	// ---------------------------------------------------------------------------------

	// set groups.Application.groups
	const defaults = ret.data.data[0].payload.data.config.channel_group.groups.Application.groups.Org1MSP;		// remember defaults
	ret.data.data[0].payload.data.config.channel_group.groups.Application.groups = {};							// clear it out
	for (let msp_id in opts.application_msps) {
		ret.data.data[0].payload.data.config.channel_group.groups.Application.groups[msp_id] = buildAppGroupObj(defaults, opts.application_msps[msp_id], msp_id);
	}

	// ---------------------------------------------------------------------------------
	// Orderer.groups Section
	// ---------------------------------------------------------------------------------

	// set OrdererOrg policies
	if (!opts.orderer_msps && Object.keys(opts.orderer_msps).length === 0) {
		logger.error('[config] cannot build genesis block, missing Orderer MSP data from input');
		return null;
	}

	// set groups.Orderer.groups
	const o_defaults = ret.data.data[0].payload.data.config.channel_group.groups.Orderer.groups.OrdererOrg;		// remember defaults
	ret.data.data[0].payload.data.config.channel_group.groups.Orderer.groups = {};								// clear it out
	for (let msp_id in opts.orderer_msps) {
		ret.data.data[0].payload.data.config.channel_group.groups.Orderer.groups[msp_id] = buildOrdererGroupObj(o_defaults, opts.orderer_msps[msp_id], msp_id);
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
	if (opts.batch_timeout && !isNaN(opts.batch_timeout.timeout)) {
		ret.data.data[0].payload.data.config.channel_group.groups.Orderer.values.BatchTimeout.value.timeout = Number(opts.batch_timeout.timeout);
	}
	if (opts.channel_restrictions && opts.channel_restrictions.value) {
		ret.data.data[0].payload.data.config.channel_group.groups.Orderer.values.ChannelRestrictions.value.timeout = opts.channel_restrictions.value;
	}
	if (opts.consensus_type && Array.isArray(opts.consensus_type.consenters)) {
		ret.data.data[0].payload.data.config.channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters = opts.consensus_type.consenters;
	}
	if (opts.consensus_type && opts.consensus_type.options) {
		ret.data.data[0].payload.data.config.channel_group.groups.Orderer.values.ConsensusType.value.metadata.options = opts.consensus_type.options;
	}

	// whew... all done
	return ret;
}

// build 1 data.data[0].payload.data.config.channel_group.groups.Application.groups object up
function buildAppGroupObj(defaults: any, msp_data: any, msp_id: string) {
	const grpObj = JSON.parse(JSON.stringify(defaults));
	const policy_names = ['Admins', 'Endorsement', 'Readers', 'Writers'];
	for (let z in policy_names) {
		const policyName = policy_names[z];
		if (!msp_data[policyName] || msp_data[policyName] === 'default') {
			for (let i in grpObj.policies[policyName].policy.value.identities) {			// 'Readers' has a few entries, iter on each
				grpObj.policies[policyName].policy.value.identities[i].principal.msp_identifier = msp_id;
			}
		} else {
			logger.error('[config] cannot build config block for msp, only the default groups policy is supported atm. msp_id:', msp_id);
			return null;
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

		// the each certificate array field
		const fields = ['intermediate_certs', 'organizational_unit_identifiers', 'revocation_list', 'root_certs', 'tls_intermediate_certs', 'tls_root_certs'];
		for (let i in fields) {
			const field = fields[i];
			if (Array.isArray(msp_data.MSP[field])) {
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
		if (!msp_data[policyName]) {
			logger.error('[config] cannot build genesis block, missing orderer org\'s msp policy from input:', msp_id, policyName);
			return null;
		} else {
			grpObj.policies[policyName].policy.value =
				camelCase_2_underscores(conformPolicySyntax(msp_data[policyName]), 0);
		}
	}

	// set OrdererOrg endpoint addresses
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

		// set OrdererOrg fabric_node_ous
		if (msp_data.MSP.fabric_node_ous) {
			grpObj.values.MSP.value.config.fabric_node_ous = msp_data.MSP.fabric_node_ous;
		} else {
			delete grpObj.values.MSP.value.config.fabric_node_ous;
		}

		// the each OrdererOrg certificate array field
		const fields = ['intermediate_certs', 'organizational_unit_identifiers', 'revocation_list', 'root_certs', 'tls_intermediate_certs', 'tls_root_certs'];
		for (let i in fields) {
			const field = fields[i];
			if (Array.isArray(msp_data.MSP[field])) {
				grpObj.values.MSP.value.config[field] = msp_data.MSP[field];
			}
		}

		// set OrdererOrg signing_identity
		if (msp_data.MSP.signing_identity) {
			grpObj.values.MSP.value.config.signing_identity = msp_data.MSP.signing_identity;
		}

		// set OrdererOrg name
		grpObj.values.MSP.value.config.name = msp_id;
	}

	return grpObj;
}

/*
interface MspObj {
	fabric_node_ous: any;
	intermediate_certs: string[];
	organizational_unit_identifiers: string[];
	revocation_list: string[];
	root_certs: string[];
	signing_identity: null,
	tls_intermediate_certs: string[];
	tls_root_certs: string[];
}*/

interface ExtTemp {
	channel: string,
	application_capabilities: string | null;
	orderer_capabilities: string | null;
	channel_capabilities: string | null;
	application_msps: StringObj2;
	orderer_msps: StringObj2;
	batch_size: {
		absolute_max_bytes: number | null,
		max_message_count: number | null,
		preferred_max_bytes: number | null,
	} | null,
	batch_timeout: {
		timeout: number
	} | null,
	channel_restrictions: {
		value: object
	} | null,
	consensus_type: {
		consenters: object[],
		options: object | null,
	}
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
