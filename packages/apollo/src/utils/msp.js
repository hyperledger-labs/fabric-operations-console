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

import { CertificateAuthorityRestApi } from '../rest/CertificateAuthorityRestApi';
import { MspRestApi } from '../rest/MspRestApi';
import IdentityApi from '../rest/IdentityApi';
import StitchApi from '../rest/StitchApi';

const MspHelper = {
	async getMsps(list) {
		const msps = [];
		const all_msps = await MspRestApi.getAllMsps();
		for (let i = 0; i < all_msps.length; i++) {
			const msp = all_msps[i];
			let valid = true;
			if (list) {
				valid = false;
				list.forEach(org => {
					let msp_id = org.msp_id || org.id;
					if (msp.msp_id === msp_id) {
						valid = true;
					}
				});
			}
			if (valid) {
				msps.push({
					...msp,
					display_name: msp.display_name + ' (' + msp.msp_id + ')',
				});
			}
		}
		return msps;
	},

	async getCAsWithRootCerts() {
		const list = [];
		const cas = await CertificateAuthorityRestApi.getCAs();
		for (let i = 0; i < cas.length; i++) {
			const ca = cas[i];
			const rootCert = await CertificateAuthorityRestApi.getRootCertificate(ca);
			list.push({
				...ca,
				rootCert,
			});
		}
		return list;
	},

	async getRootCerts(msp, cas) {
		let root_certs = null;
		for (let i = 0; i < cas.length && !root_certs; i++) {
			let ca = cas[i];
			if (msp.certificate && ca.rootCert) {
				let isIdentityFromCert = await StitchApi.isIdentityFromRootCert({
					certificate_b64pem: msp.certificate,
					root_certs_b64pems: [ca.rootCert],
				});
				if (isIdentityFromCert) {
					root_certs = [ca.rootCert];
				}
			}
		}
		return root_certs;
	},

	async getIdentitiesForMsps(list) {
		const msps_with_identities = [];
		const msps = await MspHelper.getMsps(list);
		let cas = null;
		for (let i = 0; i < msps.length; i++) {
			let msp = msps[i];
			if (!msp.root_certs && msp.certificate) {
				if (!cas) {
					cas = this.getCAsWithRootCerts();
				}
				msp.root_certs = await this.getRootCerts(msp, cas);
			}
			let identities = await IdentityApi.getIdentitiesForMsp(msp);
			if (identities && identities.length) {
				msps_with_identities.push({
					...msp,
					identities,
				});
			}
		}
		return msps_with_identities;
	},
};

export default MspHelper;
