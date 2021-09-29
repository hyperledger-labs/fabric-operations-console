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
import Helper from '../utils/helper';
import IdentityApi from './IdentityApi';
import { NodeRestApi } from './NodeRestApi';
import { RestApi } from './RestApi';
const naturalSort = require('javascript-natural-sort');
const Log = new Logger('CertificateAuthorityRestApi');

const CA_TYPE = 'fabric-ca';
const LEGACY_CA_TYPE = 'ca';

const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

class CertificateAuthorityRestApi {
	static rootCerts = {};
	static async getCAs(skip_cache) {
		return NodeRestApi.getNodes('fabric-ca', skip_cache);
	}

	/**
	 * Imports the given CAs.
	 * @param {ExportedCA[]|FabricCA[]} exported_cas A list of CAs to be imported.
	 * @return {Promise<FabricCA[]>} A Promise that resolves with the list of the imported CA records.
	 */
	static async importCA(exported_cas) {
		const all = exported_cas.map(async some_ca_record => {
			const exported_ca = {
				display_name: some_ca_record.display_name,
				api_url: some_ca_record.api_url,
				operations_url: some_ca_record.operations_url,
				grpcwp_url: some_ca_record.grpcwp_url,
				type: 'fabric-ca',
				location: some_ca_record.location,
				msp: some_ca_record.msp || {
					ca: {
						name: some_ca_record.ca_name,
					},
					tlsca: {
						name: some_ca_record.tlsca_name,
					},
					component: {
						tls_cert: some_ca_record.tls_cert,
					},
				},
			};
			return NodeRestApi.importComponent(exported_ca);
		});
		return Promise.all(all);
	}

	/**
	 * If the component was imported, the record is cleaned up.  If the component was created, the associated k8s resources and the component will both be
	 * removed.
	 * @param {FabricCA} ca The CA to be removed.
	 * @param {boolean} [force] If true, the record will be removed regardless of whether the k8s resource was successfully removed.
	 * @return {Promise<DeleteComponentResponse|RestApiError>} A Promise the resolves with the response from the server or rejects with an error describing what
	 * went wrong.
	 */
	static async removeCA(ca, force) {
		if (NodeRestApi.isCreatedComponent(ca)) {
			return NodeRestApi.deleteComponent(ca.id, force);
		} else {
			return NodeRestApi.removeComponent(ca.id);
		}
	}

	static async getUsersFromCAId(id) {
		try {
			const ca = await CertificateAuthorityRestApi.getCADetails(id);
			return CertificateAuthorityRestApi.getUsers(ca);
		} catch (error) {
			Log.error(error);
			throw error;
		}
	}

	static async getOptions(ca) {
		const identity = await IdentityApi.getAssociatedIdentity(ca);
		return {
			client_cert_b64pem: identity ? identity.cert : null,
			client_prv_key_b64pem: identity ? identity.private_key : null,
			host: ca.url2use,
			ca_name: ca.msp.ca.name,
		};
	}

	static async getUsers(ca) {
		const opts = await CertificateAuthorityRestApi.getOptions(ca);
		let users = [];
		try {
			const getCaIdentities = promisify(window.stitch.getCaIdentities);
			const resp = await getCaIdentities(opts);
			users = resp.data.identities;
			users.sort((a, b) => {
				return naturalSort(a.id, b.id);
			});
		} catch (error) {
			Log.error(error);
			throw error;
		}
		return users;
	}

	static async generateCertificate(ca, ca_name, enroll_id, enroll_secret, csr_host) {
		const opts = {
			host: ca.url2use,
			ca_name: ca_name || ca.msp.ca.name,
			enroll_id: enroll_id || ca.enroll_id,
			enroll_secret: enroll_secret || ca.enroll_secret,
		};
		if (csr_host) {
			const csr_array = csr_host.split(',');
			let subjectAltName = [];
			for (let csr of csr_array) {
				csr = csr.trim();
				//check for ip
				if (ipRegex.test(csr)) {
					subjectAltName.push({ ip: csr });
				} else {
					subjectAltName.push({ dns: csr });
				}
			}
			opts.ext = { subjectAltName };
		}
		let result = null;
		try {
			const enrollCaIdentity = promisify(window.stitch.enrollCaIdentity);
			const resp = await enrollCaIdentity(opts);
			result = {
				certificate: resp.data.Cert,
				private_key: resp.data.generated.client_prv_key_b64pem,
			};
		} catch (error) {
			Log.error(error);
			throw error;
		}
		return result;
	}

	static async reEnroll(ca) {
		const opts = await CertificateAuthorityRestApi.getOptions(ca);
		let result = null;
		try {
			const reenrollCaIdentity = promisify(window.stitch.reenrollCaIdentity);
			const resp = await reenrollCaIdentity(opts);
			result = {
				certificate: resp.data.Cert,
				private_key: resp.data.generated.client_prv_key_b64pem,
			};
		} catch (error) {
			Log.error(error);
			throw error;
		}
		return result;
	}

	static async addUser(ca, data) {
		const opts = await CertificateAuthorityRestApi.getOptions(ca);
		opts.new_identity = {
			enroll_id: data.new_enroll_id,
			enroll_secret: data.new_enroll_secret,
			ca_name: opts.ca_name,
			affiliation: data.affiliation,
			attrs: data.attrs,
			type: data.type,
			max_enrollments: data.max_enrollments,
		};
		let result = null;
		try {
			const registerCaIdentity = promisify(window.stitch.registerCaIdentity);
			const resp = await registerCaIdentity(opts);
			result = resp.data;
		} catch (error) {
			Log.error(error);
			throw error;
		}
		return result;
	}

	static async deleteUser(ca, enroll_id) {
		const opts = await CertificateAuthorityRestApi.getOptions(ca);
		opts.enroll_id = enroll_id;
		let result = null;
		try {
			const deleteCaIdentity = promisify(window.stitch.deleteCaIdentity);
			const resp = await deleteCaIdentity(opts);
			result = resp.data;
		} catch (error) {
			Log.error(error);
			throw error;
		}
		return result;
	}

	static async getCADetails(id, includePrivateKeyAndCert) {
		return NodeRestApi.getNodeDetails(id, includePrivateKeyAndCert);
	}

	static getAffiliationsFromResponseData(data) {
		let affiliations = [];
		if (data.name) {
			affiliations.push({ name: data.name });
		}
		if (data.affiliations) {
			data.affiliations.forEach(data => {
				const sub = CertificateAuthorityRestApi.getAffiliationsFromResponseData(data);
				affiliations = [...affiliations, ...sub];
			});
		}
		return affiliations;
	}

	static async getAffiliations(ca) {
		const identity = await IdentityApi.getAssociatedIdentity(ca);
		const opts = {
			client_cert_b64pem: identity.cert,
			client_prv_key_b64pem: identity.private_key,
			host: ca.url2use,
			ca_name: ca.msp.ca.name,
		};

		let resp;
		let affiliations = [];
		try {
			const getCaAffiliations = promisify(window.stitch.getCaAffiliations);
			resp = await getCaAffiliations(opts);
			if (resp && resp.data) {
				affiliations = CertificateAuthorityRestApi.getAffiliationsFromResponseData(resp.data);
				affiliations.sort((a, b) => {
					return naturalSort(a.name, b.name);
				});
			}
		} catch (error) {
			Log.error(error);
			throw error;
		}

		return affiliations;
	}

	static async updateConfigOverride(ca) {
		if (ca.config_override.ca && !ca.config_override.tlsca) {
			ca.config_override.tlsca = _.cloneDeep(ca.config_override.ca);
		}
		const cn_ca = _.get(ca, 'config_override.ca.csr.cn');
		const cn_tlsca = _.get(ca, 'config_override.tlsca.csr.cn');
		if (cn_ca && cn_tlsca && cn_ca === cn_tlsca) {
			_.set(ca, 'config_override.tlsca.csr.cn', cn_ca + 'tlsca');
		}
		return NodeRestApi.updateConfigOverride(ca);
	}

	static async updateCA(ca) {
		let updateCA = { ...ca };
		delete updateCA.replicas;
		await NodeRestApi.updateNode(updateCA);
		if (ca.replicas) {
			const data = {};
			if (ca.replicas) {
				data.replicas = ca.replicas;
			}
			const url = `/api/saas/v2/components/${ca.id}`;
			await RestApi.put(url, data);
		}
		return ca;
	}

	static buildConfigOverride(data) {
		const config_override = {
			ca: {
				debug: false,
				affiliations: {
					ibp: [],
				},
			},
		};
		const registry = {
			maxenrollments: -1,
			identities: [
				{
					name: data.admin_id,
					pass: data.admin_secret,
					type: 'client',
					attrs: {
						'hf.Registrar.Roles': '*',
						'hf.Registrar.DelegateRoles': '*',
						'hf.Revoker': true,
						'hf.IntermediateCA': true,
						'hf.GenCRL': true,
						'hf.Registrar.Attributes': '*',
						'hf.AffiliationMgr': true,
					},
				},
			],
		};
		config_override.ca.registry = registry;
		if (data.ca_database) {
			const db = {
				type: data.ca_database,
				datasource:
					'host=' +
					data.db_host +
					' port=' +
					data.db_port +
					' user=' +
					data.db_user +
					' password=' +
					data.db_password +
					' dbname=' +
					data.db_name +
					' sslmode=' +
					data.db_sslmode,
				tls: {
					enabled: data.db_tls_enabled,
				},
			};
			if (data.db_tls_enabled) {
				db.tls.certfiles = data.db_server_certs;
				if (data.db_client_cert && data.db_client_private_key) {
					db.tls.client = {
						certfile: data.db_client_cert,
						keyfile: data.db_client_private_key,
					};
				}
			}
			config_override.ca.db = db;
		}
		if (data.hsm) {
			const bccsp = {
				Default: 'PKCS11',
				PKCS11: {
					Label: data.hsm.label,
					Pin: data.hsm.pin,
				},
			};
			config_override.ca.BCCSP = bccsp;
		}
		return config_override;
	}

	static async createCA(data) {
		const node = {
			display_name: data.display_name,
			type: 'fabric-ca',
		};
		if (data.clusterType === 'paid') {
			node.resources = {
				ca: {
					requests: {
						cpu: data.usage.ca.cpu,
						memory: data.usage.ca.memory + 'M',
					},
				},
			};
			node.storage = {
				ca: {
					size: data.usage.ca.storage + 'Gi',
				},
			};
		}
		if (data.hsm && data.hsm.pkcs11endpoint) {
			_.set(node, 'hsm.pkcs11endpoint', data.hsm.pkcs11endpoint);
		}
		node.config_override = data.config_override ? data.config_override : CertificateAuthorityRestApi.buildConfigOverride(data);

		//copy the override info from CA section to TLS CA if none was supplied
		if (node.config_override && node.config_override.ca && !node.config_override.tlsca) {
			node.config_override.tlsca = _.cloneDeep(node.config_override.ca);
		}
		const cn_ca = _.get(node, 'config_override.ca.csr.cn');
		const cn_tlsca = _.get(node, 'config_override.tlsca.csr.cn');
		if (cn_ca && cn_tlsca && cn_ca === cn_tlsca) {
			_.set(node, 'config_override.tlsca.csr.cn', cn_ca + 'tlsca');
		}
		if (data.ca_database && data.replica_set_cnt) {
			node.replicas = data.replica_set_cnt;
		}
		if (data.version) {
			node.version = data.version;
		}
		if (data.zone) {
			node.zone = data.zone;
		}
		return NodeRestApi.createSaasNode(node);
	}

	static async getRootCertificate(ca, tls) {
		if (ca) {
			let url = ca.url2use + '/cainfo';
			if (tls && _.get(ca, 'msp.tlsca.name')) {
				url = url + '?ca=' + _.get(ca, 'msp.tlsca.name');
			}
			const hash = Helper.hash_str(url);
			// root certs don't change... store them locally
			if (CertificateAuthorityRestApi.rootCerts[hash]) {
				return CertificateAuthorityRestApi.rootCerts[hash];
			}
			const resp = await RestApi.get(url);
			CertificateAuthorityRestApi.rootCerts[hash] = _.get(resp, 'result.CAChain');
			return CertificateAuthorityRestApi.rootCerts[hash];
		} else {
			return null;
		}
	}

	static async checkHealth(ca) {
		return NodeRestApi.checkHealth(ca);
	}

	static async renewTLSCertificate(ca) {
		return NodeRestApi.performActions(ca, {
			restart: true,
			renew: {
				tls_cert: true,
			},
		});
	}
}

export { CertificateAuthorityRestApi, CA_TYPE, LEGACY_CA_TYPE };
