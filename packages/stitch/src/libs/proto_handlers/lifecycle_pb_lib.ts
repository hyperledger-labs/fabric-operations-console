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
import { __pb_root, logger, base64ToUint8Array, base64ToUtf8, camelCase_2_underscores } from '../misc';
import { conformPolicySyntax } from '../sig_policy_syntax_lib';
import { MixedPolicySyntax } from '../proto_handlers/collection_pb_lib';
import { convertPolicy2PeerCliSyntax } from '../sig_policy_syntax_reverse_lib';
import { CollectionLib, Scc } from './collection_pb_lib';
import { PolicyLib } from './policy_pb_lib';

// notes:
// - the double underscore before functions indicates that load_pb() should be called before calling said function.
// - the _b prefix on a function indicates it returns a serialized protobuf message as binary.
// - TIL protobufjs prefers create() over fromObject()

export { HiLvl, decode_validationParameter, __b_build_application_policy };

const policyLib = new PolicyLib;

export class LifecycleLib {

	// -------------------------------------------------
	// build a QueryInstalledChaincodeArgs message - returns bin - [call load_pb() before calling this function]
	// -------------------------------------------------
	__b_build_query_installed_chaincode_args(package_id: string) {
		const QueryInstalledChaincodeArgs = __pb_root.lookupType('lifecycle.QueryInstalledChaincodeArgs');
		let message = QueryInstalledChaincodeArgs.create({ packageId: package_id });							// remember protobufjs expects camelCase keys
		const b_queryInstalledChaincodeArgs = <Uint8Array>QueryInstalledChaincodeArgs.encode(message).finish();
		return b_queryInstalledChaincodeArgs;
	}

	// -------------------------------------------------
	// build a GetInstalledChaincodePackageArgs message - returns bin - [call load_pb() before calling this function]
	// -------------------------------------------------
	__b_build_get_installed_chaincode_package_args(package_id: string) {
		const QueryInstalledChaincodeArgs = __pb_root.lookupType('lifecycle.GetInstalledChaincodePackageArgs');
		let message = QueryInstalledChaincodeArgs.create({ packageId: package_id });							// remember protobufjs expects camelCase keys
		const b_queryInstalledChaincodeArgs = <Uint8Array>QueryInstalledChaincodeArgs.encode(message).finish();
		return b_queryInstalledChaincodeArgs;
	}

	// -------------------------------------------------
	// build a InstallChaincodeArgs message - returns bin - [call load_pb() before calling this function]
	// -------------------------------------------------
	__b_build_install_chaincode_args(b_lifecycle_chaincode_package: Uint8Array) {
		const InstallChaincodeArgs = __pb_root.lookupType('lifecycle.InstallChaincodeArgs');
		let message = InstallChaincodeArgs.create({ chaincodeInstallPackage: b_lifecycle_chaincode_package });	// remember protobufjs expects camelCase keys
		const b_installChaincodeArgs = <Uint8Array>InstallChaincodeArgs.encode(message).finish();
		return b_installChaincodeArgs;
	}

	// -------------------------------------------------
	// build a QueryChaincodeDefinitionArgs message - returns bin - [call load_pb() before calling this function] - not plural
	// -------------------------------------------------
	__b_build_query_chaincode_definition_args(chaincode_id: string) {
		const QueryChaincodeDefinitionArgs = __pb_root.lookupType('lifecycle.QueryChaincodeDefinitionArgs');
		let message = QueryChaincodeDefinitionArgs.create({ name: chaincode_id });	// remember protobufjs expects camelCase keys
		const b_queryChaincodeDefinitionArgs = <Uint8Array>QueryChaincodeDefinitionArgs.encode(message).finish();
		return b_queryChaincodeDefinitionArgs;
	}

	// -------------------------------------------------
	// build a ApproveChaincodeDefinitionForMyOrgArgs msg from LOW level fields - returns bin - [call load_pb() before calling this function]
	// -------------------------------------------------
	__b_build_approve_chaincode_definition_for_my_org_args_low(opts: LoLvl2) {
		const ApproveChaincodeDefinitionForMyOrgArgs = __pb_root.lookupType('lifecycle.ApproveChaincodeDefinitionForMyOrgArgs');
		const b_opts = {
			sequence: opts.chaincode_sequence,
			name: opts.chaincode_id,
			version: opts.chaincode_version,
			endorsementPlugin: opts.endorsement_plugin,
			validationPlugin: opts.validation_plugin,
			validationParameter: opts.validation_parameter,
			collections: opts.collections,
			initRequired: opts.init_required,
			source: opts.source,
		};
		let message = ApproveChaincodeDefinitionForMyOrgArgs.create(b_opts);	// remember protobufjs expects camelCase keys
		const b_approveChaincodeDefinitionForMyOrgArgs = <Uint8Array>ApproveChaincodeDefinitionForMyOrgArgs.encode(message).finish();

		// debug
		//const p_test = ApproveChaincodeDefinitionForMyOrgArgs.decode(b_approveChaincodeDefinitionForMyOrgArgs);
		//const test = ApproveChaincodeDefinitionForMyOrgArgs.toObject(p_test, { defaults: false, bytes: String });
		//console.log('2 app back?', test, JSON.stringify(test));

		return b_approveChaincodeDefinitionForMyOrgArgs;
	}

	// -------------------------------------------------
	// build a ApproveChaincodeDefinitionForMyOrgArgs msg from HIGH level fields - returns bin - [call load_pb() before calling this function]
	// -------------------------------------------------
	__b_build_approve_chaincode_definition_for_my_org_args_high(opts: HiLvl) {
		const p_source = this.__build_chaincode_source(opts.package_id);			// first build the inner message "source" aka ChaincodeSource
		const options = common_ccd_args(opts);
		if (!options) {
			return null;
		} else {
			options.source = p_source;													// append source, ChaincodeSource
			const bin = this.__b_build_approve_chaincode_definition_for_my_org_args_low(options);
			return bin;
		}
	}

	// -------------------------------------------------
	// build a ChaincodeSource msg - returns message - [call load_pb() before calling this function]
	// -------------------------------------------------
	__build_chaincode_source(package_id: string) {
		const ChaincodeSource = __pb_root.lookupType('lifecycle.ChaincodeSource');
		let message = null;
		if (package_id && typeof package_id === 'string') {
			message = ChaincodeSource.create({ localPackage: { packageId: package_id } });			// remember this protobufjs expects camelCase keys
		} else {
			message = ChaincodeSource.create({ unavailable: {} });
		}
		return message;
	}

	// -------------------------------------------------
	// build a CheckCommitReadinessArgs msg from LOW level fields - returns bin - [call load_pb() before calling this function]
	// -------------------------------------------------
	__b_build_check_commit_readiness_args_low(opts: LoLvl1) {
		const CheckCommitReadinessArgs = __pb_root.lookupType('lifecycle.CheckCommitReadinessArgs');
		const b_opts = {
			sequence: opts.chaincode_sequence,
			name: opts.chaincode_id,
			version: opts.chaincode_version,
			endorsementPlugin: opts.endorsement_plugin,
			validationPlugin: opts.validation_plugin,
			validationParameter: opts.validation_parameter,
			collections: opts.collections,
			initRequired: opts.init_required,
		};
		let message = CheckCommitReadinessArgs.create(b_opts);	// remember protobufjs expects camelCase keys
		const b_checkCommitReadinessArg = <Uint8Array>CheckCommitReadinessArgs.encode(message).finish();

		// debug
		//const p_test = CheckCommitReadinessArgs.decode(b_checkCommitReadinessArg);
		//const test = CheckCommitReadinessArgs.toObject(p_test, { defaults: false, bytes: String });
		//console.log('3 app back?', test, JSON.stringify(test));

		return b_checkCommitReadinessArg;
	}

	// -------------------------------------------------
	// build a ApproveChaincodeDefinitionForMyOrgArgs msg from HIGH level fields - returns bin - [call load_pb() before calling this function]
	// -------------------------------------------------
	__b_build_check_commit_readiness_args_high(opts: HiLvl) {
		const options = common_ccd_args(opts);
		if (!options) {
			return null;
		} else {
			const bin = this.__b_build_check_commit_readiness_args_low(options);
			return bin;
		}
	}

	// -------------------------------------------------
	// build a CheckCommitReadinessArgs msg from LOW level fields - returns bin - [call load_pb() before calling this function]
	// -------------------------------------------------
	__b_build_commit_chaincode_definition_args_low(opts: LoLvl1) {
		const CommitChaincodeDefinitionArgs = __pb_root.lookupType('lifecycle.CommitChaincodeDefinitionArgs');
		const b_opts = {												// remember protobufjs expects camelCase keys
			sequence: opts.chaincode_sequence,
			name: opts.chaincode_id,
			version: opts.chaincode_version,
			endorsementPlugin: opts.endorsement_plugin,
			validationPlugin: opts.validation_plugin,
			validationParameter: opts.validation_parameter,
			collections: opts.collections,								// should be an object, not bin
			initRequired: opts.init_required,
		};
		let message = CommitChaincodeDefinitionArgs.create(b_opts);
		const b_commitChaincodeDefinitionArgs = <Uint8Array>CommitChaincodeDefinitionArgs.encode(message).finish();

		// debug
		//const p_test = CommitChaincodeDefinitionArgs.decode(b_commitChaincodeDefinitionArgs);
		//const test = CommitChaincodeDefinitionArgs.toObject(p_test, { defaults: false, bytes: String });
		//console.log('4 app back?', test);

		return b_commitChaincodeDefinitionArgs;
	}

	// -------------------------------------------------
	// build a ApproveChaincodeDefinitionForMyOrgArgs msg from HIGH level fields - returns bin - [call load_pb() before calling this function]
	// -------------------------------------------------
	__b_build_commit_chaincode_definition_args_high(opts: HiLvl) {
		const options = common_ccd_args(opts);
		if (!options) {
			return null;
		} else {
			const bin = this.__b_build_commit_chaincode_definition_args_low(options);
			return bin;
		}
	}

	// decode the install-chaincode response - fabric v2.0
	__decode_install_chaincode_result(b_response: Uint8Array) {
		const InstallChaincodeResult = __pb_root.lookupType('lifecycle.InstallChaincodeResult');
		const p_result = InstallChaincodeResult.decode(b_response);
		return InstallChaincodeResult.toObject(p_result, { defaults: false, bytes: String });
	}

	// decode the query-installed-chaincode response - fabric v2.0
	__decode_query_installed_chaincode_result(b_response: Uint8Array) {
		const QueryInstalledChaincodeResult = __pb_root.lookupType('lifecycle.QueryInstalledChaincodeResult');		// not plural
		const p_result = QueryInstalledChaincodeResult.decode(b_response);
		return QueryInstalledChaincodeResult.toObject(p_result, { defaults: false, bytes: String });
	}

	// decode the query-all-installed-chaincode response - fabric v2.0
	__decode_query_all_installed_chaincodes_result(b_response: Uint8Array) {
		const QueryInstalledChaincodesResult = __pb_root.lookupType('lifecycle.QueryInstalledChaincodesResult');	// plural
		const p_result = QueryInstalledChaincodesResult.decode(b_response);
		return QueryInstalledChaincodesResult.toObject(p_result, { defaults: false, bytes: String });
	}

	// decode the get-installed-chaincode-package response - fabric v2.0
	__decode_get_installed_chaincode_package_result(b_response: Uint8Array) {
		const GetInstalledChaincodePackageResult = __pb_root.lookupType('lifecycle.GetInstalledChaincodePackageResult');
		const p_result = GetInstalledChaincodePackageResult.decode(b_response);
		return GetInstalledChaincodePackageResult.toObject(p_result, { defaults: false, bytes: String });
	}

	// decode the check-commit-readiness response - fabric v2.0
	__decode_check_commit_readiness_result(b_response: Uint8Array) {
		const CheckCommitReadinessResult = __pb_root.lookupType('lifecycle.CheckCommitReadinessResult');
		const p_result = CheckCommitReadinessResult.decode(b_response);
		return CheckCommitReadinessResult.toObject(p_result, { defaults: false, bytes: String });
	}

	// decode the query-chaincode-definition response - fabric v2.0
	__decode_query_chaincode_definition_result(b_response: Uint8Array) {
		const QueryChaincodeDefinitionResult = __pb_root.lookupType('lifecycle.QueryChaincodeDefinitionResult');	// not plural
		const p_result = QueryChaincodeDefinitionResult.decode(b_response);
		const resp = QueryChaincodeDefinitionResult.toObject(p_result, { defaults: true, bytes: String });
		resp.validationParameter = decode_validationParameter(resp.validationParameter);
		resp.collections = decode_collections(resp.collections);
		return resp;
	}

	// decode the query-chaincode-definitions response - fabric v2.0
	__decode_query_chaincode_definitions_result(b_response: Uint8Array) {
		const QueryChaincodeDefinitionsResult = __pb_root.lookupType('lifecycle.QueryChaincodeDefinitionsResult');	// plural
		const p_result = QueryChaincodeDefinitionsResult.decode(b_response);
		const resp = QueryChaincodeDefinitionsResult.toObject(p_result, { defaults: true, bytes: String });
		if (resp.chaincodeDefinitions) {
			for (let i in resp.chaincodeDefinitions) {
				resp.chaincodeDefinitions[i].validationParameter = decode_validationParameter(resp.chaincodeDefinitions[i].validationParameter);
				resp.chaincodeDefinitions[i].collections = decode_collections(resp.chaincodeDefinitions[i].collections);
			}
		}
		return resp;
	}
}

// decode the validation parameter manually...
function decode_validationParameter(parameter: string) {
	const ApplicationPolicy = __pb_root.lookupType('common.ApplicationPolicy');

	if (typeof parameter) {
		let temp = '';
		try {											// policy might be a simple string, or the fabric sig policy object syntax
			temp = base64ToUtf8(parameter);				// base 64 decode, look for simple string
		} catch (e) { }

		const pos = temp.indexOf('/');
		if (pos >= 0) {
			parameter = temp.substring(pos);			// strip off the encoding characters
		} else {
			let msg = ApplicationPolicy.decode(base64ToUint8Array(parameter));
			let fabric_policy_fmt = ApplicationPolicy.toObject(msg, { defaults: false, bytes: String, enums: String });
			if (fabric_policy_fmt && fabric_policy_fmt.signaturePolicy) {
				fabric_policy_fmt.signaturePolicy = __decode_MSPPrincipal_bin_inside(fabric_policy_fmt.signaturePolicy);	// decode principal from bytes to object
				const peer_cli = convertPolicy2PeerCliSyntax(fabric_policy_fmt.signaturePolicy);
				if (peer_cli) {
					parameter = peer_cli;
				} else {
					parameter = fabric_policy_fmt;
				}
			}
		}
	}
	return parameter;
}

// build cc definition parameters that are common
function common_ccd_args(opts: HiLvl) {
	const b_app_policy = __b_build_application_policy(opts);
	const collectionLib = new CollectionLib;
	if (!b_app_policy) {
		return null;
	} else {
		let collection;
		if (opts.collections_obj) {
			const CollectionConfigPackage = __pb_root.lookupType('protos.CollectionConfigPackage');
			const p_collection = collectionLib.__build_collection_config_package(opts.collections_obj);
			collection = CollectionConfigPackage.create(p_collection, { defaults: true });
		}

		return {
			chaincode_sequence: opts.chaincode_sequence,
			chaincode_id: opts.chaincode_id ? opts.chaincode_id : '',
			chaincode_version: opts.chaincode_version,
			endorsement_plugin: opts.endorsement_plugin || 'escc',			// defaults
			validation_plugin: opts.validation_plugin || 'vscc',

			// defines the endorsement signature policy for the chaincode.
			// it should be the name of a signature policy in the channel's config block.
			validation_parameter: b_app_policy,

			// build collection from peer/collection.proto, its different than common/collection.proto
			// follow https://hyperledgendary.github.io/unstable-fabric-docs/endorsement-policies.html
			collections: opts.collections_obj ? collection : new Uint8Array(0),

			init_required: opts.init_required,
			source: null,													// populated later if needed
		};
	}
}

// build the signature policy bin
function __b_build_application_policy(opts: HiLvl) {
	let app_policy_opts = {
		channelConfigPolicyReference: <string | undefined>'/Channel/Application/Endorsement',			// default endorsement policy name
		signaturePolicy: <any>{}
	};
	if (!opts.validation_parameter) {												// use default
		logger.debug('[stitch] ccd - using the default channel policy reference for the endorsement policy');
		delete app_policy_opts.signaturePolicy;										// delete the other option, only 1 should be set
	} else if (typeof opts.validation_parameter === 'string' && opts.validation_parameter[0] === '/') {
		logger.debug('[stitch] ccd - using the provided channel policy reference for the endorsement policy');
		app_policy_opts.channelConfigPolicyReference = opts.validation_parameter;	// set provided channel policy name
		delete app_policy_opts.signaturePolicy;
	} else {
		logger.debug('[stitch] ccd - parsing signature policy syntax for the endorsement policy');
		const endorsement_fmt = conformPolicySyntax(opts.validation_parameter);		// conform it to fabric's structure
		if (!endorsement_fmt) {
			return null;
		} else {
			app_policy_opts.signaturePolicy = __build_MSPPrincipal_bin_inside(endorsement_fmt);
			delete app_policy_opts.channelConfigPolicyReference;
		}
	}
	const ApplicationPolicy = __pb_root.lookupType('common.ApplicationPolicy');
	let message = ApplicationPolicy.create(app_policy_opts);
	const b_applicationPolicy = <Uint8Array>ApplicationPolicy.encode(message).finish();
	return b_applicationPolicy;
}

// convert each principal field of an identity to binary
function __build_MSPPrincipal_bin_inside(obj: any) {
	if (obj) {
		for (let i in obj.identities) {
			if (obj.identities[i].principal) {
				obj.identities[i].principal = policyLib.__b_build_msp_role(obj.identities[i].principal);
			}
		}
	}
	return obj;
}

// decode the base64 principal to readable object
function __decode_MSPPrincipal_bin_inside(obj: { identities: { principal: string }[] }) {
	const MSPRole = __pb_root.lookupType('common.MSPRole');
	if (obj) {
		for (let i in obj.identities) {
			if (typeof obj.identities[i].principal === 'string') {		// only decode if its base64 encoded
				const p_message = MSPRole.decode(base64ToUint8Array(obj.identities[i].principal));
				const msp_role = MSPRole.toObject(p_message, { defaults: true, bytes: String, enums: String });
				obj.identities[i].principal = msp_role;
			}
		}
	}
	return obj;
}

// decode collection fields to readable object
function decode_collections(collections: any) {
	if (collections && collections.config) {
		for (let i in collections.config) {
			const a_config = camelCase_2_underscores(collections.config[i], 0);
			collections.config[i] = a_config;												// copy field changes to parent

			if (a_config && a_config.static_collection_config && a_config.static_collection_config.member_orgs_policy) {
				let policy = a_config.static_collection_config.member_orgs_policy.signature_policy;
				if (policy) {
					policy = __decode_MSPPrincipal_bin_inside(policy);						// decode principal from bytes to object
					const peer_cli = convertPolicy2PeerCliSyntax(policy);
					if (peer_cli) {
						a_config.static_collection_config.member_orgs_policy.signature_policy = peer_cli;
					}
				}
			}
			if (a_config && a_config.static_collection_config && a_config.static_collection_config.endorsement_policy) {
				let endorse_policy = a_config.static_collection_config.endorsement_policy.signature_policy;
				if (endorse_policy) {
					endorse_policy = __decode_MSPPrincipal_bin_inside(endorse_policy);		// decode principal from bytes to object
					const peer_cli = convertPolicy2PeerCliSyntax(endorse_policy);
					if (peer_cli) {
						a_config.static_collection_config.endorsement_policy.signature_policy = peer_cli;
					}
				}
			}
		}
	}
	return collections;
}

interface LoLvl1 {
	chaincode_sequence: number;
	chaincode_id: string;
	chaincode_version: string;
	endorsement_plugin: string;
	validation_plugin: string;
	validation_parameter: Uint8Array | null;
	collections: { config: Scc[] } | null;								// protos.CollectionConfigPackage
	init_required: boolean;
}

interface LoLvl2 extends LoLvl1 {										// same as the other one.. but it has "source"
	source: any;														// ChaincodeSource
}

interface HiLvl {
	chaincode_sequence: number;
	chaincode_id: string | undefined;
	chaincode_version: string;
	endorsement_plugin: string;
	validation_plugin: string;
	validation_parameter: string | MixedPolicySyntax;					// string like "/Channel/Application/Endorsement", or peer cli, or sdk policy syntax
	collections_obj: Scc[] | null;										// becomes protos.CollectionConfigPackage
	init_required: boolean;
	package_id: string;
}
