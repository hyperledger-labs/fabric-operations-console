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

// Libs built by us
import { logger, base64ToUint8Array, pp, __pb_root, sortObjectOut } from '../misc';
import { PolicyLib, roles_map, rules_map } from './policy_pb_lib';

// exports
export { buildConfigUpdateTemplateNewChannel };
export class ConfigTxLib {

	// --------------------------------------------------------------------------------
	// make a config signature pb from a signature and sig header - [call load_pb() before calling this function]
	// --------------------------------------------------------------------------------
	__b_build_config_signature(opts: Bcs) {
		const ConfigSignature = __pb_root.lookupType('common.ConfigSignature');
		let message = ConfigSignature.fromObject({ signatureHeader: opts.b_signature_header, signature: opts.b_signature });
		return <Uint8Array>ConfigSignature.encode(message).finish();
	}

	// --------------------------------------------------------------------------------
	// make a config update envelope - [call load_pb() before calling this function]
	// --------------------------------------------------------------------------------
	__b_build_config_update_envelope(opts: Bce) {
		const config_update_signatures = [];
		for (let i in opts.b64_config_update_signatures) {
			const b_config_update_signature = base64ToUint8Array(opts.b64_config_update_signatures[i]);
			const ConfigSignature = __pb_root.lookupType('common.ConfigSignature');
			const message = ConfigSignature.decode(b_config_update_signature);
			const p_config_update_signature = <{ name: string }>ConfigSignature.toObject(message, { defaults: false });
			config_update_signatures.push(p_config_update_signature);
		}

		const ConfigUpdateEnvelope = __pb_root.lookupType('common.ConfigUpdateEnvelope');
		let message2 = ConfigUpdateEnvelope.fromObject({ configUpdate: opts.b_config_update, signatures: config_update_signatures });
		const b_configUpdateEnvelope = <Uint8Array>ConfigUpdateEnvelope.encode(message2).finish();

		if (window.log && window.log.getLevel && window.log.getLevel() <= 1) {
			const message3 = ConfigUpdateEnvelope.decode(b_configUpdateEnvelope);
			const obj2 = ConfigUpdateEnvelope.toObject(message3, { defaults: false, bytes: String });
			logger.debug('config update - ConfigUpdateEnvelope as obj', pp(obj2));
		}

		return b_configUpdateEnvelope;
	}

	// --------------------------------------------------------------------------------
	// make a config update - [call load_pb() before calling this function]
	// --------------------------------------------------------------------------------
	__b_build_config_update(config_update: object) {
		const config_update_clone = JSON.parse(JSON.stringify(config_update));
		const formatted_config_update = this.__format_config_update_json(config_update_clone, { to: 'binary' });
		const ConfigUpdate = __pb_root.lookupType('common.ConfigUpdate');
		let message = ConfigUpdate.fromObject(formatted_config_update);
		return <Uint8Array>ConfigUpdate.encode(message).finish();
	}

	//--------------------------------------------------------------------------------
	// format the policy field in a config update blob (handles json -> binary AND binary -> json with the "opts.to" argument)
	//--------------------------------------------------------------------------------
	private __format_config_update_json(obj: any, opts: { to: string }) {

		// format application "policies" field (ImplicitMetaPolicy && SignaturePolicyEnvelope)
		if (obj && obj.writeSet && obj.writeSet.groups && obj.writeSet.groups.Application && obj.writeSet.groups.Application.policies) {
			this.find_and_format_policy(obj.writeSet.groups.Application.policies, opts);
		}

		// format "Consortium" field
		if (obj && obj.writeSet && obj.writeSet.values && obj.writeSet.values.Consortium && obj.writeSet.values.Consortium.value) {
			if (opts.to === 'binary') {				// convert json to binary
				obj.writeSet.values.Consortium.value = this.__b_build_consortium(obj.writeSet.values.Consortium.value.name);
				obj.readSet.values.Consortium.value = obj.writeSet.values.Consortium.value;					// copy it here too
			} else if (opts.to === 'json') {		// convert binary to json
				const consortium = this.__decode_consortium(obj.writeSet.values.Consortium.value);
				if (consortium) {
					obj.writeSet.values.Consortium.value = consortium;
					obj.readSet.values.Consortium.value = obj.writeSet.values.Consortium.value;				// copy it here too
				}
			}
		}

		// more fields
		if (obj && obj.writeSet && obj.writeSet.groups && obj.writeSet.groups.Application && obj.writeSet.groups.Application.values) {
			logger.debug('config update - found Application.values', pp(obj.writeSet.groups.Application.values));

			// --------  application "Capabilities" field --------
			if (obj.writeSet.groups.Application.values.Capabilities && obj.writeSet.groups.Application.values.Capabilities.value) {
				const ConfigCapabilities = __pb_root.lookupType('common.Capabilities');
				if (opts.to === 'binary') {
					let message = ConfigCapabilities.fromObject(obj.writeSet.groups.Application.values.Capabilities.value);
					let pb = <Uint8Array>ConfigCapabilities.encode(message).finish();
					obj.writeSet.groups.Application.values.Capabilities.value = pb;

					// only for debug
					if (window.log && window.log.getLevel && window.log.getLevel() <= 1) {
						const message2 = ConfigCapabilities.decode(pb);
						const obj2 = ConfigCapabilities.toObject(message2, { defaults: false });
						logger.debug('config update - ConfigCapabilities as obj', pp(obj2));
					}
				} else if (opts.to === 'json') {
					const message = ConfigCapabilities.decode(obj.writeSet.groups.Application.values.Capabilities.value);
					obj.writeSet.groups.Application.values.Capabilities.value = ConfigCapabilities.toObject(message, { defaults: false });
				}
			}

			// -------- application "ACLs" field --------
			if (obj.writeSet.groups.Application.values.ACLs && obj.writeSet.groups.Application.values.ACLs.value) {
				const ACLs = __pb_root.lookupType('protos.ACLs');
				if (opts.to === 'binary') {
					let message = ACLs.fromObject(obj.writeSet.groups.Application.values.ACLs.value);
					let pb = <Uint8Array>ACLs.encode(message).finish();
					obj.writeSet.groups.Application.values.ACLs.value = pb;

					// only for debug
					if (window.log && window.log.getLevel && window.log.getLevel() <= 1) {
						const message2 = ACLs.decode(pb);
						const obj2 = ACLs.toObject(message2, { defaults: false });
						logger.debug('config update - ACLs as obj', pp(obj2));
					}
				} else if (opts.to === 'json') {
					const message = ACLs.decode(obj.writeSet.groups.Application.values.ACLs.value);
					obj.writeSet.groups.Application.values.ACLs.value = ACLs.toObject(message, { defaults: false });
				}
			}
		}

		return obj;
	}

	// recursively look for the 'policy.value' field and convert it to a implicit meta policy as binary
	private find_and_format_policy(inner_obj: any, opts: { to: string }) {

		if (typeof inner_obj === 'object') {
			for (let key in inner_obj) {
				if (key === 'policy') {
					if (inner_obj[key].value) {

						//  ------ SignaturePolicyEnvelope ------
						if (inner_obj[key].type === 1) {
							if (opts.to === 'binary') {					// convert SignaturePolicyEnvelope to binary
								const b_signature_policy_envelope = (new PolicyLib).__b_build_signature_policy_envelope(inner_obj[key].value);
								if (b_signature_policy_envelope) {
									inner_obj[key].value = b_signature_policy_envelope;
								}
							} else if (opts.to === 'json') {			// convert SignaturePolicyEnvelope to JSON
								const signature_policy_envelope = (new PolicyLib).__decode_signature_policy_envelope(inner_obj[key].value, false); // dsh todo change to true
								if (signature_policy_envelope) {
									for (let i in signature_policy_envelope.identities) {
										if (signature_policy_envelope.identities[i].principal) {
											const bin2 = signature_policy_envelope.identities[i].principal;
											signature_policy_envelope.identities[i].principal = (new PolicyLib).__decode_msp_role(bin2);

											if (signature_policy_envelope.identities[i].principal.role !== undefined) {
												for (let role in roles_map) {
													if (roles_map[role] === signature_policy_envelope.identities[i].principal.role) {	// convert the role back to the name not the integer
														signature_policy_envelope.identities[i].principal.role = role;
														break;
													}
												}
											}
										}
									}
									inner_obj[key].value = signature_policy_envelope;
								}
							}
						}

						// ------ ImplicitMetaPolicy ------
						if (inner_obj[key].type === 3) {
							if (opts.to === 'binary') {					// convert ImplicitMetaPolicy to binary
								const implicit_meta_policy = (new PolicyLib).p_build_implicit_meta_policy(inner_obj[key].value);
								if (implicit_meta_policy) {
									inner_obj[key].value = implicit_meta_policy.serializeBinary();
								}
							} else if (opts.to === 'json') {			// convert ImplicitMetaPolicy to JSON
								const implicit_meta_policy = (new PolicyLib).__decode_implicit_policy(inner_obj[key].value);
								if (implicit_meta_policy) {
									if (implicit_meta_policy.rule !== undefined) {
										for (let rule in rules_map) {
											if (rules_map[rule] === implicit_meta_policy.rule) {	// convert the rules back to the name not the integer
												implicit_meta_policy.rule = rule;
												break;
											}
										}
									}
									inner_obj[key].value = implicit_meta_policy;
								}
							}
						}
					}
				} else if (typeof inner_obj[key] === 'object') {
					this.find_and_format_policy(inner_obj[key], opts);	// recursively look for "policy"
				}
			}
		}
	}

	// --------------------------------------------------------------------------------
	// decode a config update from binary to json - [call load_pb() before calling this function]
	// --------------------------------------------------------------------------------
	__decode_config_update(protobuf: Uint8Array) {
		const ConfigUpdate = __pb_root.lookupType('common.ConfigUpdate');
		const message = ConfigUpdate.decode(protobuf);
		const json = ConfigUpdate.toObject(message, { defaults: false });

		// decode the SignaturePolicyEnvelope && ImplicitMetaPolicy binary parts
		const formatted_config_update = this.__format_config_update_json(json, { to: 'json' });
		return sortObjectOut(formatted_config_update);			// its important to sort it, else fields will shift and deltas not match up
	}

	// --------------------------------------------------------------------------------
	// build a configuration protobuf - [call load_pb() before calling this function]
	// --------------------------------------------------------------------------------
	__b_build_consortium(name: string) {
		const Consortium = __pb_root.lookupType('common.Consortium');
		let message = Consortium.fromObject({ name: name });
		return <Uint8Array>Consortium.encode(message).finish();
	}

	// --------------------------------------------------------------------------------
	// decode consortium message - [call load_pb() before calling this function]
	// --------------------------------------------------------------------------------
	__decode_consortium(pb: Uint8Array) {
		const Consortium = __pb_root.lookupType('common.Consortium');
		const message = Consortium.decode(pb);
		const obj = <{ name: string }>Consortium.toObject(message, { defaults: false });
		return obj;
	}
}

// --------------------------------------------------------------------------------
// get a config update JSON  for a channel update (template)
// --------------------------------------------------------------------------------
function buildConfigUpdateTemplateNewChannel(opts: Bcu) {
	const template = {
		'channelId': opts.channel_id,
		'readSet': {
			'groups': {
				'Application': {
					'groups': <any>{}
				}
			},
			'values': {
				'Consortium': {
					'value': {
						'name': opts.consortium_id					// becomes bytes
					}
				}
			}
		},
		'writeSet': {
			'groups': {
				'Application': {
					'version': 1,
					'groups': <any>{},								// msp id go here as object, populated below
					'modPolicy': 'Admins',
					'policies': {
						'Admins': {
							'modPolicy': 'Admins',
							'policy': {
								'type': 3,
								'value': {							// "value" becomes bytes [ImplicitMetaPolicy]
									'rule': 'MAJORITY',
									'subPolicy': 'Admins',
								}
							}
						},
						'Readers': {
							'modPolicy': 'Admins',
							'policy': {
								'type': 3,
								'value': {							// "value" becomes bytes [ImplicitMetaPolicy]
									'rule': 'ANY',
									'subPolicy': 'Readers',
								}
							}
						},
						'Writers': {
							'modPolicy': 'Admins',
							'policy': {
								'type': 3,
								'value': {							// "value" becomes bytes [ImplicitMetaPolicy]
									'rule': 'ANY',
									'subPolicy': 'Writers',
								}
							}
						}
					},
					'values': {									// "values" becomes bytes [Map of Configtx.ConfigValue]
						'Capabilities': {
							'modPolicy': 'Admins',
							'value': {							// "value" becomes bytes [Map of Common.Capabilities]
								'capabilities': <any>{
									'V1_2': {}					// gets replaced below
								}
							}
						},
						'ACLs': {
							'modPolicy': 'Admins',
							'value': null, 						// "value" becomes bytes [Map of Configuration.ACLs]
						}
					}
				} // orderer section would go here if we could sign as orderer
			},
			'values': {
				'Consortium': {
					'value': {
						'name': opts.consortium_id				// becomes bytes
					}
				}
			}
		}
	};

	for (let i in opts.application_msp_ids) {
		const msp_id = opts.application_msp_ids[i];
		template.writeSet.groups.Application.groups[msp_id] = {};			// add each msp id
		template.readSet.groups.Application.groups[msp_id] = {};
	}

	if (!opts.fabric_version) {
		logger.error('[stitch] fabric_version was not provided to config update template');
	} else {
		if (opts.fabric_version === '1.1' || opts.fabric_version === '1.0') {	// fabric 1.1/1.0 does not support ACLs
			delete template.writeSet.groups.Application.values.ACLs;
		}

		const parts = opts.fabric_version.split('.');
		if (parts) {
			template.writeSet.groups.Application.values.Capabilities.value.capabilities = {};					// clear it out
			const capability = 'V' + parts[0] + '_' + parts[1];					// ex: convert 1.1 to v1_1
			template.writeSet.groups.Application.values.Capabilities.value.capabilities[capability] = {};		// its a blank object
		}
	}

	return sortObjectOut(template);
}

interface Bce {
	b_config_update: Uint8Array;
	b64_config_update_signatures: string[];
}

interface Bcu {
	channel_id: string;
	consortium_id: string;
	application_msp_ids: string[];
	fabric_version: string;
}


interface Bcs {
	b_signature_header: Uint8Array;
	b_signature: Uint8Array;
}
