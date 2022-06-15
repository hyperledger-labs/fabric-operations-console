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
import { __pb_root, logger, pp } from '../misc';
import { PolicyLib } from './policy_pb_lib';
import { conformPolicySyntax } from '../sig_policy_syntax_lib';

export { Scc, MixedPolicySyntax };
export class CollectionLib {
	policyLib = new PolicyLib;

	// --------------------------------------------------------------------------------
	// build a CollectionConfigPackage protobuf - returns message - [call load_pb() before calling this function]
	// --------------------------------------------------------------------------------
	__build_collection_config_package(configurations: Scc[]) {
		const configs = [];
		for (let i in configurations) {
			const static_collection_config = this.__build_static_collection_config(configurations[i]);
			if (static_collection_config) {
				//logger.debug('[stitch] static_collection_config:', pp(static_collection_config));
				const collection_config = this.__build_collection_config(static_collection_config);
				configs.push(collection_config);
			}
		}

		if (configs.length === 0) {
			logger.error('[stitch] 0 collection configs were built, cannot build collection package');
			return null;
		} else {
			const CollectionConfigPackage = __pb_root.lookupType('protos.CollectionConfigPackage');
			let message = CollectionConfigPackage.create({ config: configs });
			logger.debug('[stitch] collection config package:', CollectionConfigPackage.toObject(message, { defaults: true }));
			return message;
		}
	}

	// --------------------------------------------------------------------------------
	// build a CollectionConfigPackage protobuf - return bin - [call load_pb() before calling this function]
	// --------------------------------------------------------------------------------
	__b_build_collection_config_package(configurations: Scc[]) {
		const CollectionConfigPackage = __pb_root.lookupType('protos.CollectionConfigPackage');
		const message = this.__build_collection_config_package(configurations);
		if (!message) {
			return null;
		} else {
			return <Uint8Array>CollectionConfigPackage.encode(message).finish();
		}
	}

	// --------------------------------------------------------------------------------
	// build a CollectionConfig protobuf - returns obj - - [call load_pb() before calling this function]
	// --------------------------------------------------------------------------------
	__build_collection_config(static_collection_config: any) {
		const CollectionConfig = __pb_root.lookupType('protos.CollectionConfig');
		let message = CollectionConfig.create({ staticCollectionConfig: static_collection_config });
		return CollectionConfig.toObject(message, { defaults: true });
	}

	// --------------------------------------------------------------------------------
	// build a CollectionPolicyConfig protobuf - returns obj - [call load_pb() before calling this function]
	// --------------------------------------------------------------------------------
	__build_collection_policy_config(signature_policy: any) {
		const CollectionPolicyConfig = __pb_root.lookupType('protos.CollectionPolicyConfig');
		let message = CollectionPolicyConfig.create({ signaturePolicy: signature_policy });
		return CollectionPolicyConfig.toObject(message, { defaults: true });
	}

	// --------------------------------------------------------------------------------
	// build a StaticCollectionConfig protobuf - returns obj - [call load_pb() before calling this function]
	// --------------------------------------------------------------------------------
	__build_static_collection_config(config: Scc) {
		if (config.policy) {
			config.member_orgs_policy = JSON.parse(JSON.stringify(config.policy));					// copy sdk's field to fabric's
			delete config.policy;
		}
		if (config.maxPeerCount || config.max_peer_count) {
			config.maximum_peer_count = config.maxPeerCount || config.max_peer_count;				// copy sdk's field to fabric's
			delete config.maxPeerCount;
			delete config.max_peer_count;
		}

		// validation
		if (!config.member_orgs_policy) {
			logger.error('[stitch] collection config policy is missing "member_orgs_policy" aka "policy" field', pp(config));
			return null;
		} else {
			const private_data_fmt = conformPolicySyntax(config.member_orgs_policy);		// accepts fabric's format, sdk's format, or peer cli format
			const endorsement_fmt = (config.endorsement_policy && config.endorsement_policy.signature_policy) ?
				conformPolicySyntax(config.endorsement_policy.signature_policy) : null;

			const private_data_spe = private_data_fmt ? this.policyLib.__build_signature_policy_envelope_alt(private_data_fmt) : null;
			const endorsement_spe = endorsement_fmt ? this.policyLib.__build_signature_policy_envelope_alt(endorsement_fmt) : null;

			const StaticCollectionConfig = __pb_root.lookupType('protos.StaticCollectionConfig');
			const opts: any = {																	// remember protobufjs expects camelCase keys
				name: config.name,
				memberOrgsPolicy: this.__build_collection_policy_config(private_data_spe),	// build message for field
				requiredPeerCount: config.required_peer_count,
				maximumPeerCount: config.maximum_peer_count,
				blockToLive: config.block_to_live,
				memberOnlyRead: config.member_only_read,
				memberOnlyWrite: config.member_only_write,
				//endorsementPolicy: null									// don't set endorsementPolicy unless given
			};
			if (endorsement_spe || (config.endorsement_policy && config.endorsement_policy.channel_config_policy_reference)) {
				opts.endorsementPolicy = this.policyLib.__build_application_policy(
					endorsement_spe,										// only one of these should be set
					config.endorsement_policy ? config.endorsement_policy.channel_config_policy_reference : null
				);
			}
			let message = StaticCollectionConfig.create(opts);
			return StaticCollectionConfig.toObject(message, { defaults: true });
		}
	}

	// --------------------------------------------------------------------------------
	// decode a CollectionConfigPackage protobuf - returns obj - [call load_pb() before calling this function]
	// --------------------------------------------------------------------------------
	__decode_collection_config_package(bin: Uint8Array, full: boolean) {
		const CollectionConfigPackage = __pb_root.lookupType('protos.CollectionConfigPackage');
		const p_result = CollectionConfigPackage.decode(bin);
		let obj = CollectionConfigPackage.toObject(p_result, { defaults: true, bytes: Uint8Array });

		if (obj && obj.config && full === true) {				// fully decode is requested
			for (let i in obj.config) {
				if (obj.config[i].staticCollectionConfig && obj.config[i].staticCollectionConfig.memberOrgsPolicy) {
					const orgPolicy = obj.config[i].staticCollectionConfig.memberOrgsPolicy;
					if (orgPolicy.signaturePolicy && orgPolicy.signaturePolicy.identities) {
						orgPolicy.signaturePolicy.identities = this.policyLib.decode_identities(orgPolicy.signaturePolicy.identities);
					}
				}

				if (obj.config[i].staticCollectionConfig && obj.config[i].staticCollectionConfig.endorsementPolicy) {
					const orgPolicy2 = obj.config[i].staticCollectionConfig.endorsementPolicy;
					if (orgPolicy2.signaturePolicy && orgPolicy2.signaturePolicy.identities) {
						orgPolicy2.signaturePolicy.identities = this.policyLib.decode_identities(orgPolicy2.signaturePolicy.identities);
					}
				}
			}

		}
		return obj;
	}
}

interface MixedPolicySyntax {
	version: number;				// [optional] - fabric syntax uses this field
	rule: any;						// fabric syntax uses this field
	identities: any;				// fabric & fabric-sdk syntax uses this field
	policy: any;					// [legacy] "fabric-sdk syntax" format uses this field
}

interface Scc {
	name: string;						// name of your collection
	required_peer_count: number; 		// min number of peers that must get the private data to successfully endorse

	member_orgs_policy: MixedPolicySyntax | string | null; // sig policy of which orgs have access to the private data - supports peer-cli syntax using string
	policy: any | null;					// [legacy] fabric-sdk syntax uses this field... convert to "member_orgs_policy"

	maximum_peer_count: number | null | undefined;	// max number of peers the endorsing peer can try to send private data to
	maxPeerCount: number | null | undefined; 		// [legacy] fabric sdk" format uses this... convert to "maximum_peer_count"
	max_peer_count: number | null | undefined;		// [legacy 2] fabric sdk" format uses this... convert to "maximum_peer_count" - this version shouldn't exist

	block_to_live: number;				// when to expire private data, after this number of blocks the private data is deleted, 0 = unlimited
	member_only_read: boolean;			// if true, only collection member clients can read private data
	member_only_write: boolean; 		// if true, only collection member clients can write private data


	// proto file: /v2.0/peer/policy.proto
	endorsement_policy: {

		// [optional, set 1] "signature_policy" = { "version" : <number>, "rule": <SignaturePolicy>, "identities": <MSPPrincipal[]> }
		signature_policy: MixedPolicySyntax | string | null;	// peer-cli syntax uses string

		// [optional, set 1]  should identify a policy defined in the channel's configuration block
		channel_config_policy_reference: string | null;
	};
}
