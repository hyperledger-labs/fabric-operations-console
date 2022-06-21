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
import _ from 'lodash';
import { promisify } from 'util';
import Logger from '../components/Log/Logger';
import IdentityApi from './IdentityApi';
const Log = new Logger('StitchApi');

class StitchApi {
	static async encrypt(data) {
		const temp = JSON.stringify(data);
		let passphrase = 'anonymous';
		if (IdentityApi.userInfo && IdentityApi.userInfo.logged) {
			passphrase = IdentityApi.userInfo.loggedInAs.email;
		}

		let encrypted = null;
		try {
			const scEncrypt = promisify(window.stitch.scEncrypt);
			encrypted = await scEncrypt({ msg: temp, user: passphrase });
		} catch (error) {
			Log.error(error);
			throw error;
		}
		return encrypted;
	}

	static async decrypt(data) {
		let passphrase = 'anonymous';
		if (IdentityApi.userInfo && IdentityApi.userInfo.logged) {
			passphrase = IdentityApi.userInfo.loggedInAs.email;
		}

		let decrypted = null;
		try {
			const scDecrypt = promisify(window.stitch.scDecrypt);
			decrypted = await scDecrypt({ data: data, user: passphrase });
			decrypted = JSON.parse(decrypted);
		} catch (error) {
			Log.error(error);
			throw error;
		}
		return decrypted;
	}

	/*
	   data = {
			certificate_b64pem: cert,
			root_certs_b64pems: root_certs,
	   }
	*/
	static async isIdentityFromRootCert(data) {
		if (data) {
			const isTrustedCertificate = promisify(window.stitch.isTrustedCertificate);
			const originatedFromRootCert = await isTrustedCertificate(data);
			return originatedFromRootCert;
		}
		return;
	}

	static setTimeouts(timeouts) {
		if (timeouts) {
			return window.stitch.setTimeouts(timeouts);
		}
		return;
	}

	static parseCertificate(cert) {
		if (cert) {
			return window.stitch.parseCertificate(cert);
		}
		return;
	}

	static async buildSigCollectionAuthHeader(req_body, prv_key) {
		const buildSigCollectionAuthHeader = promisify(window.stitch.buildSigCollectionAuthHeader);
		const authHeader = await buildSigCollectionAuthHeader(req_body, prv_key);
		return authHeader;
	}

	static async submitWithRetry(opts, orderers) {
		const submitConfigUpdate = promisify(window.stitch.submitConfigUpdate);
		let opts_copy = _.cloneDeep(opts);
		try {
			let resp = await submitConfigUpdate(opts);
			return resp;
		} catch (error) {
			Log.error('submitWithRetry error', error);
			if (_.includes(error.stitch_msg, 'no Raft leader')) {
				throw Error('no Raft leader');
			}
			const orderer = orderers.pop();
			if (orderer && orderer.url2use) {
				opts_copy.orderer_host = orderer.url2use;
				return StitchApi.submitWithRetry(opts_copy, orderers);
			} else {
				throw error;
			}
		}
	}

	// get config, retry multiple orderers
	static async getChannelConfigWithRetry(opts, orderers) {
		opts.include_bin = true;
		const getChannelConfigBlockFromOrderer = promisify(window.stitch.getChannelConfigBlockFromOrderer);
		let opts_copy = _.cloneDeep(opts);
		try {
			let resp = await getChannelConfigBlockFromOrderer(opts);
			return resp;
		} catch (error) {
			Log.error('getChannelConfigWithRetry error', error);
			if (_.includes(error.stitch_msg, 'no Raft leader')) {
				throw Error('no Raft leader');
			}
			const orderer = orderers.pop();
			if (orderer && orderer.url2use) {
				opts_copy.orderer_host = orderer.url2use;
				return StitchApi.getChannelConfigWithRetry(opts_copy, orderers);
			} else {
				throw error;
			}
		}
	}

	static async getInstalledChaincode(opts) {
		const getInstalledChaincode = promisify(window.stitch.getInstalledChaincode);
		return getInstalledChaincode(opts);
	}

	static async lc_installChaincode(opts) {
		const lc_installChaincode = promisify(window.stitch.lc_installChaincode);
		return lc_installChaincode(opts);
	}

	static async lc_getInstalledChaincodeData(opts) {
		const lc_getInstalledChaincodeData = promisify(window.stitch.lc_getInstalledChaincodeData);
		return lc_getInstalledChaincodeData(opts);
	}

	static async lc_getAllInstalledChaincodeData(opts) {
		const lc_getAllInstalledChaincodeData = promisify(window.stitch.lc_getAllInstalledChaincodeData);
		return lc_getAllInstalledChaincodeData(opts);
	}

	static async lc_getInstalledChaincodePackage(opts) {
		const lc_getInstalledChaincodePackage = promisify(window.stitch.lc_getInstalledChaincodePackage);
		return lc_getInstalledChaincodePackage(opts);
	}

	static async lc_approveChaincodeDefinition(opts) {
		const lc_approveChaincodeDefinition = promisify(window.stitch.lc_approveChaincodeDefinition);
		return lc_approveChaincodeDefinition(opts);
	}

	static async lc_checkChaincodeDefinitionReadiness(opts) {
		const lc_checkChaincodeDefinitionReadiness = promisify(window.stitch.lc_checkChaincodeDefinitionReadiness);
		return lc_checkChaincodeDefinitionReadiness(opts);
	}

	static async lc_commitChaincodeDefinition(opts) {
		const lc_commitChaincodeDefinition = promisify(window.stitch.lc_commitChaincodeDefinition);
		return lc_commitChaincodeDefinition(opts);
	}

	static async lc_getChaincodeDefinitionOnChannel(opts) {
		const lc_getChaincodeDefinitionOnChannel = promisify(window.stitch.lc_getChaincodeDefinitionOnChannel);
		return lc_getChaincodeDefinitionOnChannel(opts);
	}

	static async lc_getAllChaincodeDefinitionsOnChannel(opts) {
		const lc_getAllChaincodeDefinitionsOnChannel = promisify(window.stitch.lc_getAllChaincodeDefinitionsOnChannel);
		return lc_getAllChaincodeDefinitionsOnChannel(opts);
	}

	static async configUpdateJsonToBinary(opts) {
		const configUpdateJsonToBinary = promisify(window.stitch.configUpdateJsonToBinary);
		return configUpdateJsonToBinary(opts);
	}

	static async getOSNChannels(opts) {
		const getOSNChannels = promisify(window.stitch.getOSNChannels);
		let resp = await getOSNChannels(opts);
		return resp ? resp.data : resp;
	}

	static async getOSNChannel(opts) {
		const getOSNChannel = promisify(window.stitch.getOSNChannel);
		let resp = await getOSNChannel(opts);
		return resp ? resp.data : resp;
	}

	static async joinOSNChannel(opts) {
		const joinOSNChannel = promisify(window.stitch.joinOSNChannel);
		return await joinOSNChannel(opts);
	}

	static async unjoinOSNChannel(opts) {
		const unjoinOSNChannel = promisify(window.stitch.unjoinOSNChannel);
		let resp = await unjoinOSNChannel(opts);
		return resp ? resp.data : resp;
	}

	static async jsonToPb(opts) {
		const jsonToPb = promisify(window.stitch.jsonToPb);
		return await jsonToPb(opts);
	}

	static async pbToJson(opts) {
		const pbToJson = promisify(window.stitch.pbToJson);
		return await pbToJson(opts);
	}

	// this function conforms formats from the apollo create-channel wizard to the stitch config-block-generator
	// and returns a genesis block aka config block 0
	static buildGenesisBlockOSNadmin(opts) {
		const config_block_opts = {
			channel: opts.channel_id,
			application_capabilities: opts.application_capabilities,
			orderer_capabilities: opts.orderer_capabilities,
			channel_capabilities: opts.channel_capabilities,
			application_msps: build_app_msps(),
			orderer_msps: build_orderer_msps(),
			application_acls: opts.acls,
			application_policies: {

				// these policies can be null to use the default policy,
				Admins: build_policy_from_wizard2('admin', 'ADMIN'),
				Readers: build_policy_from_wizard2('reader', 'MEMBER'),
				Writers: build_policy_from_wizard2('writer', 'MEMBER'),

				// these policies can be null to use the default policy, or set an explicit policy in CLI format, or implicit policy as string
				Endorsement: build_policy_from_wizard(opts.endorsement_policy, 'Endorsement', 'PEER'),
				LifecycleEndorsement: build_policy_from_wizard(opts.lifecycle_policy, 'Endorsement', 'PEER'),
			},

			// these policies can be null to use the default policy
			orderer_policies: {
				Admins: build_orderer_policy_from_wizard2('admin', 'ADMIN'),

				// we don't currently support customizing these values in apollo
				//BlockValidation: 'ANY Writers',						// use null for default policy
				//Readers: 'ANY Readers',								// use null for default policy
				//Writers: 'ANY Writers',								// use null for default policy
			},

			batch_size: {
				absolute_max_bytes: opts.block_params ? opts.block_params.absolute_max_bytes : null,
				max_message_count: opts.block_params ? opts.block_params.max_message_count : null,
				preferred_max_bytes: opts.block_params ? opts.block_params.preferred_max_bytes : null,
			},
			batch_timeout: opts.block_params ? opts.block_params.timeout : null,
			channel_restrictions: null,
			consensus_type: {
				consenters: filter_consenters('consenters'),
				options: opts.raft_params								// use null for defaults
			}
		};
		return window.stitch.buildTemplateConfigBlock(config_block_opts);

		// build application msp input data format from the wizard data
		function build_app_msps() {
			const ret = {};
			for (let msp_id in opts.application_msps) {
				ret[msp_id] = {
					'Admins': null,			// use null for default policy (apollo doesn't let us set these atm)
					'Endorsement': null,	// use null for default policy (apollo doesn't let us set these atm)
					'Readers': null,		// use null for default policy (apollo doesn't let us set these atm)
					'Writers': null,		// use null for default policy (apollo doesn't let us set these atm)

					'MSP': {
						...opts.application_msps[msp_id]
					},
				};
			}
			return ret;
		}

		// build the orderer msp input data format from the wizard data
		function build_orderer_msps() {
			const ret = {};
			for (let i in opts.orderer_msps) {
				let msp_id = opts.orderer_msps[i].msp_id;
				ret[msp_id] = {
					'Admins': null,										// use null for default policy
					'Readers': null,									// use null for default policy
					'Writers': null,									// use null for default policy

					addresses: build_addresses(msp_id),					// required, string of addresses including port, no host

					'MSP': {
						...opts.orderer_msps[i]
					},
				};
			}
			return ret;

			// build address list for this msp
			function build_addresses(mspId) {
				const addresses = [];
				if (Array.isArray(opts.consenters)) {
					for (let i in opts.consenters) {
						const node = opts.consenters[i];
						if (node && node.msp_id === mspId) {							// filter on this msp id
							if (node.host && node.port) {								// required fields
								addresses.push(node.host + ':' + node.port);
							}
						}
					}
				}
				return addresses;
			}
		}

		// only add consenters, remove followers
		function filter_consenters(type) {
			const ret = [];
			if (Array.isArray(opts.consenters)) {
				for (let i in opts.consenters) {
					const node = opts.consenters[i];
					if (type === 'consenters') {
						if (node && node._consenter === true) {
							ret.push(opts.consenters[i]);
						}
					} else {
						if (node && node._consenter !== true) {
							ret.push(opts.consenters[i]);
						}
					}
				}
			}
			return ret;
		}

		// take apollo's weird policy format and make a implicit or explicit cli formatted policy
		function build_policy_from_wizard(weird_policy_fmt, sub_policy, role) {
			if (weird_policy_fmt) {

				// ---------------------------
				// Implicit Policies - builds something like: 'ANY Writers'
				// ---------------------------
				if (weird_policy_fmt.type === 'MAJORITY') {
					return 'MAJORITY ' + sub_policy;
				} else if (weird_policy_fmt.type === 'ANY') {
					return 'ANY ' + sub_policy;
				} else if (weird_policy_fmt.type === 'ALL') {
					return 'ALL ' + sub_policy;
				}

				// ---------------------------
				// Explicit Policies - builds something like: 'OutOf(1, "OrdererMSP.ADMIN")'
				// ---------------------------
				else {
					let member_txt = '';						// build the members string as "MEMBER1.ROLE, MEMBER2.ROLE"
					for (let i in weird_policy_fmt.members) {
						const org = weird_policy_fmt.members[i];
						member_txt += `"${org}.${role}", `;
					}
					if (member_txt.length > 2) {
						member_txt = member_txt.substring(0, member_txt.length - 2);		// remove last space & comma
						return `OutOf(${weird_policy_fmt.n}, ${member_txt})`;
					}
				}
			}
			return null;
		}

		// take apollo's application msp data and make an explicit cli formatted policy
		// note this sets "n" to 1 aka ANY org
		function build_policy_from_wizard2(apollo_perm_name, fabric_role) {
			let member_txt = '';						// build the members string as "MEMBER1.ROLE, MEMBER2.ROLE"
			const lc_perm = apollo_perm_name.toLowerCase();
			let count = 0;

			for (let org in opts.application_msps) {
				if (Array.isArray(opts.application_msps[org].roles) && opts.application_msps[org].roles.includes(lc_perm)) {
					member_txt += `"${org}.${fabric_role}", `;
					count++;
				}
			}

			if (count > 0) {
				member_txt = member_txt.substring(0, member_txt.length - 2);		// remove last space & comma
				return `OutOf(1, ${member_txt})`;									// we always set out-of 1
			}

			return null;
		}

		// take apollo's orderer msp data and make an explicit cli formatted policy
		// note this sets "n" to be 1 (aka a ANY rule)
		function build_orderer_policy_from_wizard2(apollo_perm_name, fabric_role) {
			let member_txt = '';						// build the members string as "MEMBER1.ROLE, MEMBER2.ROLE"
			const lc_perm = apollo_perm_name.toLowerCase();
			let count = 0;

			for (let i in opts.orderer_msps) {
				let org = opts.orderer_msps[i].msp_id;
				if (Array.isArray(opts.orderer_msps[i].roles) && opts.orderer_msps[i].roles.includes(lc_perm)) {
					member_txt += `"${org}.${fabric_role}", `;
					count++;
				}
			}

			if (count > 0) {
				member_txt = member_txt.substring(0, member_txt.length - 2);		// remove last space & comma
				return `OutOf(1, ${member_txt})`;									// we always set out-of 1
			}

			return null;
		}
	}
}

export default StitchApi;
