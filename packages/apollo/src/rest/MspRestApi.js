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
import { NodeRestApi } from './NodeRestApi';

/**
 * MSPs contain at list of certs necessary to authenticate the actions of a given organization.
 * @typedef {object} MSP
 * @extends {Component}
 * @param {string} msp_id The Fabric MSP ID corresponding to the keys listed in the MSP.
 * @param {string[]} root_certs An array that contains one or more base 64 encoded PEM root certificates for your MSP. You must provide either a CA root
 * certificate or an intermediate CA certificate, you may also provide both.
 * @param {string[]} intermediate_certs Certificates as base 64 encoded PEMs. You must provide either a CA root certificate or an intermediate CA certificate,
 * you may also provide both.
 * @param {string[]} admins Certificates represent MSP admins as base 64 encoded PEMs. Also known as the signing certificate of an organization admin.
 * @param {string[]} tls_root_certs The TLS root certificates as base 64 encoded PEMs.
 * @param {string[]} tls_intermediate_certs The TLS intermediate certificates as base 64 encoded PEMs.
 * @param {string[]} [revocation_list] Certificates as base 64 encoded PEMs. These certificates are no longer valid. For X.509-based identities, these
 * identifiers are pairs of strings known as Subject Key Identifier (SKI) and Authority Access Identifier (AKI), and are checked whenever the X.509 certificate
 * is being used to verify that the certificate has not been revoked.
 * @param {string[]} [organizational_unit_identifiers] A list of Organizational Units (OU) that members of this MSP should include in their X.509 certificate.
 * An organization is often divided up into multiple organizational units (OUs), each of which has a certain set of responsibilities. When a CA issues X.509
 * certificates, the OU field in the certificate specifies the line of business to which the identity belongs.
 * @param {string[]} [fabric_node_ous] Fabric-specific OUs that enable identity classification. NodeOUs contain information on how to distinguish clients,
 * peers, and orderers based on their OU. If the check is enforced, by setting Enabled to true, the MSP will consider an identity valid if it is an identity of
 * a client or a peer. An identity should have only one of these special OUs.
 */

import _ from 'lodash';
import Logger from '../components/Log/Logger';

const MSP_TYPE = 'msp';
const EXTERNAL_MSP_TYPE = 'msp-external';
const Log = new Logger('MspRestApi');

class MspRestApi {
	static async getAllMsps(skip_cache) {
		const msps = await NodeRestApi.getNodes(MSP_TYPE, skip_cache);
		// external msps are going away.  Let's just treat them as the same thing.
		return msps.concat(await NodeRestApi.getNodes(EXTERNAL_MSP_TYPE));
	}

	static async getMSPDetails(id) {
		return NodeRestApi.getNodeDetails(id);
	}

	static async getMsps(skip_cache) {
		return NodeRestApi.getNodes('msp', skip_cache);
	}

	/**
	 * Imports the given MSP.
	 * @param {MSP|ExportedMSP} exported_msp An MSP object
	 * @return {Promise<MSP|ValidationError|TranslatedError>} A
	 */
	static async importMSP(exported_msp) {
		// Transform component fields to their latest aliases to avoid validation errors
		const exportedMSP = {
			type: 'msp',
			display_name: exported_msp.display_name,
			msp_id: exported_msp.msp_id,
			root_certs: exported_msp.root_certs,
			intermediate_certs: exported_msp.intermediate_certs,
			admins: exported_msp.admins,
			tls_root_certs: exported_msp.tls_root_certs,
			tls_intermediate_certs: exported_msp.tls_intermediate_certs,
			revocation_list: exported_msp.revocation_list,
			organizational_unit_identifiers: exported_msp.organizational_unit_identifiers,
			fabric_node_ous: exported_msp.fabric_node_ous,
			host_url: exported_msp.host_url,
		};
		return NodeRestApi.importComponent(exportedMSP);
	}

	static async editMsp(opts) {
		return NodeRestApi.updateNode(opts);
	}

	static async checkIfMSPExists(msp_id, root_certs, intermediate_certs) {
		let duplicate = false;
		try {
			const all_msps = await MspRestApi.getAllMsps();
			all_msps.forEach(msp => {
				if (msp.msp_id.toLowerCase() === msp_id.toLowerCase()) {
					if (_.intersection(msp.root_certs, root_certs).length >= 1 || _.intersection(msp.intermediate_certs, intermediate_certs).length >= 1) {
						duplicate = true;
					}
				}
			});
		} catch (error) {
			Log.error(error);
		}
		return duplicate;
	}
}

export { MspRestApi, MSP_TYPE, EXTERNAL_MSP_TYPE };
