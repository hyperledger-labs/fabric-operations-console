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
		try {
			let resp = await getOSNChannels(opts);
			return resp ? resp.data : resp;
		} catch (error) {
			return (error && error.http_resp) ? error.http_resp : error;
		}
	}

	static async getOSNChannel(opts) {
		const getOSNChannel = promisify(window.stitch.getOSNChannel);
		try {
			let resp = await getOSNChannel(opts);
			return resp ? resp.data : resp;
		} catch (error) {
			return (error && error.http_resp) ? error.http_resp : error;
		}
	}

	static async joinOSNChannel(opts) {
		const joinOSNChannel = promisify(window.stitch.joinOSNChannel);
		try {
			let resp = await joinOSNChannel(opts);
			return resp ? resp.data : resp;
		} catch (error) {
			return (error && error.http_resp) ? error.http_resp : error;
		}
	}

	static async unjoinOSNChannel(opts) {
		const unjoinOSNChannel = promisify(window.stitch.unjoinOSNChannel);
		try {
			let resp = await unjoinOSNChannel(opts);
			return resp ? resp.data : resp;
		} catch (error) {
			return (error && error.http_resp) ? error.http_resp : error;
		}
	}
}

export default StitchApi;
