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
//declare const window: any;

// Libs from protoc
import { SignaturePolicyEnvelope as Policy_SignaturePolicyEnvelope } from '../../protoc/output/common/policies_pb';
import { ImplicitMetaPolicy as Policies_ImplicitMetaPolicy } from '../../protoc/output/common/policies_pb';
import { MSPPrincipal as MSP_Principle_MSPPrincipal } from '../../protoc/output/msp/msp_principal_pb';
import { SignaturePolicy as Policy_SignaturePolicy } from '../../protoc/output/common/policies_pb';
import { MSPRole as MSP_Principle_MSPRole } from '../../protoc/output/msp/msp_principal_pb';

// Libs built by us
import { logger, pp, __pb_root } from '../misc';

export { rules_map, roles_map, Bse, find_role };
export class PolicyLib {

	// --------------------------------------------------------------------------------
	// make a signature policy envelope protobuf
	// --------------------------------------------------------------------------------
	/*
		opts:{
			version: <number>
			p_rule: <protobuf SignaturePolicy>
			p_identities: [<protobuf MSPPrincipal>]
		}
	*/
	p_build_signature_policy_envelope(opts: Bse) {
		const p_signaturePolicyEnvelope = new Policy_SignaturePolicyEnvelope();
		p_signaturePolicyEnvelope.setVersion(opts.version);
		p_signaturePolicyEnvelope.setRule(opts.p_rule);
		p_signaturePolicyEnvelope.setIdentitiesList(opts.p_identities);
		return p_signaturePolicyEnvelope;
	}

	// --------------------------------------------------------------------------------
	// make a signature policy protobuf
	// --------------------------------------------------------------------------------
	/*
		opts: {
			n_out_of: <protobuf>,		// only one of these should be set! else use `null`
			signed_by: <number>			// only one of these should be set! else use `null`
		}
	*/
	p_build_signature_policy(opts: Bsp) {
		const p_signaturePolicy = new Policy_SignaturePolicy();
		if (opts.n_out_of !== null) {
			p_signaturePolicy.setNOutOf(opts.n_out_of);
		} else if (opts.signed_by !== null) {					// remember this is a number, so 0 is possible/valid
			p_signaturePolicy.setSignedBy(opts.signed_by);
		}

		logger.debug('[stitch] policy - has n_out_of:', p_signaturePolicy.hasNOutOf(), 'has signed_by:', p_signaturePolicy.hasSignedBy(), opts.signed_by);
		return p_signaturePolicy;
	}

	// --------------------------------------------------------------------------------
	// make a n out of any protobuf
	// --------------------------------------------------------------------------------
	/*
		opts: {
			n: <number>;							// number of signatures
			rules_list: Policy_SignaturePolicy[];	// array of rule lists...
		}
	*/
	p_build_n_out_of(opts: B1o) {
		const p_n_out_of = new Policy_SignaturePolicy.NOutOf();		// this is how to create a nested message, nested protoc
		if (isNaN(opts.n)) {
			logger.error('cannot build "n-of" policy b/c "n" is not a number', opts.n);
		} else {
			p_n_out_of.setN(opts.n);
			p_n_out_of.setRulesList(opts.rules_list);
		}
		return p_n_out_of;
	}

	// --------------------------------------------------------------------------------
	// build a default endorsement policy - any 1 member may sign (msp ids must be provided)
	// --------------------------------------------------------------------------------
	/*
		opts: {
			msp_ids: [ "PeerOrg1"]
		}
	*/
	p_build_default_e_policy_envelope(opts: Bdp) {
		const signed_by_list = [], principal_list = [];
		for (let i in opts.msp_ids) {

			const p_MSPRole = new MSP_Principle_MSPRole();
			p_MSPRole.setRole(MSP_Principle_MSPRole.MSPRoleType.MEMBER);
			p_MSPRole.setMspIdentifier(opts.msp_ids[i]);

			const p_MSPPrincipal = new MSP_Principle_MSPPrincipal();
			p_MSPPrincipal.setPrincipalClassification(MSP_Principle_MSPPrincipal.Classification.ROLE);
			p_MSPPrincipal.setPrincipal(p_MSPRole.serializeBinary());

			const p_signaturePolicy = this.p_build_signature_policy({ signed_by: Number(i), n_out_of: null });
			signed_by_list.push(p_signaturePolicy);		// its import that these two arrays get built together
			principal_list.push(p_MSPPrincipal);		// position x of each array should refer to the same msp
		}

		const p_oneOfAny = this.p_build_n_out_of({ n: 1, rules_list: signed_by_list });
		const p_signaturePolicy2 = this.p_build_signature_policy({ signed_by: null, n_out_of: p_oneOfAny });
		const bsp_opts = {
			version: 0,
			p_rule: p_signaturePolicy2,
			p_identities: principal_list
		};
		const p_signaturePolicyEnvelope = this.p_build_signature_policy_envelope(bsp_opts);
		return p_signaturePolicyEnvelope;
	}

	// --------------------------------------------------------------------------------
	// build a "MSPRole" protobuf - returns message
	// --------------------------------------------------------------------------------
	p_build_msp_role(opts: Bmr) {
		const role_name = (opts && opts.role) ? opts.role.toUpperCase() : null;
		if (!role_name || roles_map[role_name] === undefined) {
			logger.error('[stitch] cannot find or invalid "role". cannot build MSPRole for signature policy. role:', role_name);
			return null;
		} else if (!opts.msp_identifier) {
			logger.error('[stitch] undefined msp id. cannot build MSPRole for signature policy');
			return null;
		} else {
			const p_MSPRole = new MSP_Principle_MSPRole();
			p_MSPRole.setRole(roles_map[role_name]);
			p_MSPRole.setMspIdentifier(opts.msp_identifier);
			return p_MSPRole;
		}
	}

	// --------------------------------------------------------------------------------
	// build a MSPRole msg - returns binary - [call load_pb() before calling this function]
	// --------------------------------------------------------------------------------
	__b_build_msp_role(opts: { mspIdentifier: string, role: string }) {
		const role_name = (opts && opts.role) ? opts.role.toUpperCase() : null;
		const MSPRole = __pb_root.lookupType('common.MSPRole');

		if (!role_name || roles_map[role_name] === undefined) {
			logger.error('[stitch] cannot find or invalid "role". cannot build MSPRole for signature policy. role:', role_name);
			return null;
		} else if (!opts.mspIdentifier) {
			logger.error('[stitch] undefined msp id. cannot build MSPRole for signature policy');
			return null;
		}

		// use fromObject instead of create b/c role_name will be a string, not enum
		let message = MSPRole.fromObject({ role: role_name, mspIdentifier: opts.mspIdentifier });		// remember this protobufjs expects camelCase keys
		const b_MSPRole = <Uint8Array>MSPRole.encode(message).finish();
		return b_MSPRole;
	}

	// --------------------------------------------------------------------------------
	// build a MSPPrincipal msg - returns message - [call load_pb() before calling this function]
	// --------------------------------------------------------------------------------
	__build_msp_principal(opts: { principal_classification: number, b_principal: Uint8Array }) {
		const MSPPrincipal = __pb_root.lookupType('common.MSPPrincipal');
		const p_opts = {
			principalClassification: opts.principal_classification,			// remember this protobufjs expects camelCase keys
			principal: opts.b_principal
		};
		let message = MSPPrincipal.fromObject(p_opts);
		return message;
	}

	// --------------------------------------------------------------------------------
	// build a custom cc policy - using Fabric SDK's format - :( (alt format in __build_signature_policy_envelope)
	// --------------------------------------------------------------------------------
	/*
		opts: {
			identities: [					// put all identities that will have the ability to sign here, 1 for each
				{							// first identity that could sign
					role: {
						name: 'member',		// should match roles in channel, typically 'member' or 'admin'
						mspId: 'PeerOrg1'
					}
				},
				{							// second identity that could sign
					role: {
						name: 'member',		// should match roles in channel, typically 'member' or 'admin'
						mspId: 'PeerOrg2'
					}
				}
			],
			policy: {
				"<number>-of" : [			// <number> is the amount of signatures to get. eg "2-of" for 2 signatures
					{ 'signed-by': 0 },		// this is the array position of the identity in "identities" that can sign
					{ 'signed-by': 1 },		// this is the array position of the identity in "identities" that can sign
				]
			}
		}
	*/
	/* removed 05/04/2020 - use __b_build_signature_policy_envelope instead
	p_build_custom_e_policy_envelope_fabricSDK(opts: Bcp) {
		const principal_list = [];
		if (!opts || !opts.identities || !opts.policy) {			// basic input check
			logger.error('[stitch] cannot find "identities" or "policy" field in endorsement policy. :', opts);
			return null;
		}

		for (let i in opts.identities) {							// create principal list from identities
			const role_name = (opts.identities[i].role && opts.identities[i].role.name) ? opts.identities[i].role.name.toLowerCase() : null;
			const msp_id = (opts.identities[i].role) ? opts.identities[i].role.mspId : null;
			const p_MSPRole = this.p_build_msp_role({ role: role_name, msp_identifier: msp_id });

			if (p_MSPRole) {
				const p_MSPPrincipal = new MSP_Principle_MSPPrincipal();
				p_MSPPrincipal.setPrincipalClassification(MSP_Principle_MSPPrincipal.Classification.ROLE);
				p_MSPPrincipal.setPrincipal(p_MSPRole.serializeBinary());
				principal_list.push(p_MSPPrincipal);
			}
		}

		const p_signaturePolicy = this.p_build_policy(opts.policy, 0);	// create signature policy from policy
		if (!p_signaturePolicy) {
			logger.error('[stitch] policy field could not be built. the provided endorsement policy is not understood.');
			return null;
		} else {
			const bsp_opts = {
				version: 0,
				p_rule: p_signaturePolicy,
				p_identities: principal_list
			};
			const p_signaturePolicyEnvelope = this.p_build_signature_policy_envelope(bsp_opts);
			logger.debug('[stitch] p_signaturePolicyEnvelope?:', p_signaturePolicyEnvelope.toObject());
			return p_signaturePolicyEnvelope;
		}
	}*/

	// recursive function to format a policy
	p_build_policy(policy: any, depth: number) {
		if (depth >= 10000) {
			logger.error('[stitch] policy - field is too deeply nested, might be circular? aborting', depth);
			return null;
		} else if (!policy || Object.keys(policy).length === 0) {
			return null;						// sub policy does not exist - this is okay
		} else {

			// "signed-by" type of policy
			if (policy['signed-by'] >= 0) {
				const bsp_opts2 = {
					signed_by: Number(policy['signed-by']),
					n_out_of: null
				};
				logger.debug('[stitch] policy - making a signed_by', bsp_opts2);
				const p_signaturePolicy = this.p_build_signature_policy(bsp_opts2);
				return p_signaturePolicy;
			} else {

				// "n-of" type of policy
				const policy_name = Object.keys(policy)[0];
				const matches = policy_name.match(/^(\d+)\-of/);								// parse "<number>-of" and get <number> out
				const signature_number = (matches && matches[1]) ? Number(matches[1]) : 1;		// make it a number

				const subPolicies = [];
				for (let i in policy[policy_name]) {											// build each sub policy
					const sub_policy = this.p_build_policy(policy[policy_name][i], ++depth);	// recursive!
					if (sub_policy) {
						subPolicies.push(sub_policy);
					}
				}

				const p_outOfAny = this.p_build_n_out_of({ n: signature_number, rules_list: subPolicies });
				logger.debug('[stitch] policy - signature_number', signature_number, 'p_outOfAny: ', (p_outOfAny) ? pp(p_outOfAny.toObject()) : null);

				// final step, build the signature policy
				const bsp_opts2 = {
					signed_by: null,
					n_out_of: p_outOfAny
				};
				logger.debug('[stitch] policy - making a n_out_of', bsp_opts2);
				const p_signaturePolicy = this.p_build_signature_policy(bsp_opts2);
				return p_signaturePolicy;
			}
		}
	}

	// --------------------------------------------------------------------------------
	// build a implicit meta policy protobuf
	// --------------------------------------------------------------------------------
	p_build_implicit_meta_policy(opts: Bmp) {
		let rule = rules_map.MAJORITY;					// default rule
		const rule_name = (opts && opts.rule) ? opts.rule.toUpperCase() : null;
		if (!rule_name || rules_map[rule_name] === undefined) {
			logger.error('[stitch] cannot find or invalid "rule". cannot build implicitMetaPolicy for signature policy. rule:', rule_name);
			return null;
		} else {
			rule = rules_map[rule_name];
		}

		const p_implicitMetaPolicy = new Policies_ImplicitMetaPolicy();
		p_implicitMetaPolicy.setRule(rule);
		if (opts.sub_policy) {
			p_implicitMetaPolicy.setSubPolicy(opts.sub_policy);
		} else if (opts.subPolicy) {
			p_implicitMetaPolicy.setSubPolicy(opts.subPolicy);
		} else {
			logger.warn('[stitch] there is no "subPolicy" field set for your implicit meta policy');
		}

		return p_implicitMetaPolicy;
	}

	// --------------------------------------------------------------------------------
	// build a signature policy protobuf as binary - [call load_pb() before calling this function]
	// --------------------------------------------------------------------------------
	__b_build_signature_policy_envelope(json: Bs2) {
		const SignaturePolicyEnvelope = __pb_root.lookupType('common.SignaturePolicyEnvelope');
		return <Uint8Array>SignaturePolicyEnvelope.encode(this.__build_signature_policy_envelope_alt(json)).finish();
	}

	// --------------------------------------------------------------------------------
	// build a custom cc policy - using Fabric's format - [call load_pb() before calling this function]
	// --------------------------------------------------------------------------------
	// ! see docs/sig_policy_syntax.md for more information and examples !
	/*
	json: {
		version: 0,
		identities: [{
			principalClassification: 'ROLE'
			principal: {
				mspIdentifier: 'PeerOrg1',
				role: 'ADMIN'
			}
		}],
		rule: {												// rule contains either signedBy of nOutOf
			nOutOf: {
				n: 1,
				rules: [{									// rules contains either signedBy of nOutOf (recursive)
					signedBy: 0
				}]
			}
		}
	}*/

	/* removed 05/04/2020 - use __build_signature_policy_envelope_alt instead
	__build_signature_policy_envelope(json: Bs2) {
		if (!json.rule) {
			logger.error('[stitch] "rule" field not found in signature policy envelope');
			return null;
		} else if (!json.identities) {
			logger.error('[stitch] "identities" field not found in signature policy envelope');
			return null;
		} else {

			// convert principal field to binary [MSPRole]
			for (let i in json.identities) {
				if (json.identities[i].principal) {										// convert principal fields
					const opts = {
						role: json.identities[i].principal.role,
						msp_identifier: json.identities[i].principal.mspIdentifier		// rename msp id field
					};
					const p_MSPRole = this.p_build_msp_role(opts);
					if (p_MSPRole) {
						json.identities[i].principal = p_MSPRole.serializeBinary();		// overwrite json with binary of a msp role
					}
				}
			}

			const SignaturePolicyEnvelope = __pb_root.lookupType('common.SignaturePolicyEnvelope');
			let p_signaturePolicyEnvelope = SignaturePolicyEnvelope.fromObject(json);
			logger.debug('[stitch] p_signaturePolicyEnvelope?:', SignaturePolicyEnvelope.toObject(p_signaturePolicyEnvelope));
			return p_signaturePolicyEnvelope;
		}
	}*/

	// same as above, but it only use protobuf.js to build a signature policy envelope
	__build_signature_policy_envelope_alt(json: Bs2) {
		if (!json.rule) {
			logger.error('[stitch] "rule" field not found in signature policy envelope');
			return null;
		} else if (!json.identities) {
			logger.error('[stitch] "identities" field not found in signature policy envelope');
			return null;
		} else {
			const p_mspPrincipals = [];

			// convert the principal field to binary [MSPRole]
			for (let i in json.identities) {
				if (json.identities[i].principal) {
					const b_MSPRole = this.__b_build_msp_role(json.identities[i].principal);
					if (b_MSPRole) {
						const classification = json.identities[i].principalClassification || 0;	// default to 0, for the "ROLE" classification
						const p_mspPrincipal = this.__build_msp_principal({ principal_classification: classification, b_principal: b_MSPRole });
						p_mspPrincipals.push(p_mspPrincipal);				// create array of MSPPrincipal
					}
				}
			}

			const spe = {
				version: isNaN(json.version) ? 1 : Number(json.version), 	// int32
				identities: p_mspPrincipals, 								// repeated MSPPrincipal
				rule: json.rule, 											// SignaturePolicy
			};
			const SignaturePolicyEnvelope = __pb_root.lookupType('common.SignaturePolicyEnvelope');
			let p_signaturePolicyEnvelope = SignaturePolicyEnvelope.fromObject(spe);
			logger.debug('[stitch] p_signaturePolicyEnvelope?:', SignaturePolicyEnvelope.toObject(p_signaturePolicyEnvelope));
			return p_signaturePolicyEnvelope;
		}
	}

	// --------------------------------------------------------------------------------
	// decode - [call load_pb() before calling this function]
	// --------------------------------------------------------------------------------
	__decode_signature_policy_envelope(pb: Uint8Array, full: boolean) {
		const SignaturePolicyEnvelope = __pb_root.lookupType('common.SignaturePolicyEnvelope');
		const message = SignaturePolicyEnvelope.decode(pb);
		let obj = SignaturePolicyEnvelope.toObject(message, { defaults: false });

		if (obj && full === true) {				// fully decode is requested
			obj = this.decode_identities(obj.identities);
		}
		return obj;
	}

	decode_identities(identities: any) {
		if (identities) {
			for (let i in identities) {
				if (identities[i].principal) {
					const bin = identities[i].principal;
					identities[i].principal = this.__decode_msp_role(bin);

					if (identities[i].principal.role !== undefined) {
						for (let role in roles_map) {
							if (roles_map[role] === identities[i].principal.role) {	// convert the role back to the name not the integer
								identities[i].principal.role = role;
								break;
							}
						}
					}
				}
			}
		}
		return identities;
	}

	// --------------------------------------------------------------------------------
	// decode - [call load_pb() before calling this function]
	// --------------------------------------------------------------------------------
	__decode_msp_role(pb: Uint8Array) {
		const MSPRole = __pb_root.lookupType('common.MSPRole');
		const message = MSPRole.decode(pb);
		const obj = MSPRole.toObject(message, { defaults: false });
		return obj;
	}

	// --------------------------------------------------------------------------------
	// decode - [call load_pb() before calling this function]
	// --------------------------------------------------------------------------------
	__decode_implicit_policy(pb: Uint8Array) {
		const ImplicitMetaPolicy = __pb_root.lookupType('common.ImplicitMetaPolicy');
		const message = ImplicitMetaPolicy.decode(pb);
		const obj = ImplicitMetaPolicy.toObject(message, { defaults: true });		// must be true to work...
		return obj;
	}

	// -------------------------------------------------
	// build a protos.ApplicationPolicy message - returns message - [call load_pb() before calling this function]
	// -------------------------------------------------
	__build_application_policy(signature_policy: any, channel_config_policy_reference: any) {
		const ApplicationPolicy = __pb_root.lookupType('protos.ApplicationPolicy');
		const opts: any = {};
		if (signature_policy) {														// message is of type "oneof", only 1 field should be set
			opts.signaturePolicy = signature_policy;
		} else {
			opts.channelConfigPolicyReference = channel_config_policy_reference;
		}
		let message = ApplicationPolicy.create(opts);								// remember protobufjs expects camelCase keys
		return message;
	}
}

const roles_map = <any>{
	'MEMBER': MSP_Principle_MSPRole.MSPRoleType.MEMBER,	// 0
	'ADMIN': MSP_Principle_MSPRole.MSPRoleType.ADMIN,	// 1
	'CLIENT': MSP_Principle_MSPRole.MSPRoleType.CLIENT,	// 2
	'PEER': MSP_Principle_MSPRole.MSPRoleType.PEER,		// 3
	'ORDERER': 4,	// 4
};

// find a role
function find_role(role_enum: any) {
	for (let key in roles_map) {
		if (roles_map[key] === role_enum) {
			return key;
		}
	}
	return 'MEMBER';								// default
}

const rules_map = <any>{
	'ANY': Policies_ImplicitMetaPolicy.Rule.ANY,
	'ALL': Policies_ImplicitMetaPolicy.Rule.ALL,
	'MAJORITY': Policies_ImplicitMetaPolicy.Rule.MAJORITY,
};

interface Bsp {
	n_out_of: Policy_SignaturePolicy.NOutOf | null;
	signed_by: number | null;
}

interface Bdp {
	msp_ids: string[];
}

interface Bse {
	version: number;
	p_rule: Policy_SignaturePolicy;
	p_identities: MSP_Principle_MSPPrincipal[];
}

interface B1o {
	n: number;
	rules_list: Policy_SignaturePolicy[];
}

/*
interface Bcp {
	identities: [
		{
			role: {
				name: string,
				mspId: string
			}
		}
	];
	policy: any;
}
*/

interface Bmp {
	rule: string;
	sub_policy: string | undefined;
	subPolicy: string | undefined;
}

interface Bs2 {
	version: number;
	rule: any;
	identities: any;
}

interface Bmr {
	role: string | null;
	msp_identifier: string | null;
}
