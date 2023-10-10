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
import StitchApi from './StitchApi';
import UserSettingsRestApi from './UserSettingsRestApi';
const naturalSort = require('javascript-natural-sort');

const LOCAL_STORAGE_KEY = 'ibp_identities';

class IdentityApi {
	static userInfo = null;
	static identityData = null;

	static PEER_NODE_TYPE = 'peers';
	static CA_NODE_TYPE = 'cas';
	static ORDERER_NODE_TYPE = 'orderer';

	static async getKey() {
		const returnKey = function() {
			let key = LOCAL_STORAGE_KEY;
			if (IdentityApi.userInfo && IdentityApi.userInfo.logged) {
				key = key + '_' + IdentityApi.userInfo.loggedInAs.email;
			}
			return key;
		};
		if (IdentityApi.userInfo === null) {
			try {
				IdentityApi.userInfo = await UserSettingsRestApi.getUserInfo();
				return returnKey();
			} catch (error) {
				IdentityApi.userInfo = {};
				return returnKey();
			}
		} else {
			return returnKey();
		}
	}

	static async load() {
		const key = await IdentityApi.getKey();
		const data = localStorage.getItem(key);
		if (data) {
			IdentityApi.identityData = await StitchApi.decrypt(data);
		} else {
			IdentityApi.identityData = {};
		}
		return IdentityApi.identityData;
	}

	static async save() {
		const key = await IdentityApi.getKey();
		const encrypted = await StitchApi.encrypt(IdentityApi.identityData);
		localStorage.setItem(key, encrypted);
	}

	static getArray() {
		const ids = [];
		const keys = Object.keys(IdentityApi.identityData);
		keys.forEach(name => {
			ids.push({
				name,
				...IdentityApi.identityData[name],
			});
		});
		ids.sort((a, b) => {
			return naturalSort(a.name, b.name);
		});

		return ids;
	}

	static async getIdentities() {
		await IdentityApi.load();
		return IdentityApi.getArray();
	}

	static async getIdentity(name) {
		await IdentityApi.load();
		return IdentityApi.identityData[name];
	}

	static async createIdentity(data) {
		await IdentityApi.load();
		let error = null;
		data.forEach(json => {
			if (IdentityApi.identityData[json.name]) {
				if (error) {
					error.details.push(json.name);
				} else {
					error = {
						title: 'error_identity_exists',
						details: [json.name],
					};
				}
			}
		});
		if (error) {
			throw error;
		} else {
			const newIds = [];
			data.forEach(json => {
				IdentityApi.identityData[json.name] = {
					cert: json.cert,
					private_key: json.private_key,
					peers: json.peers,
					orderer: json.orderer,
					cas: json.cas,
					tls_cas: json.tls_cas,
				};
				newIds.push({
					name: json.name,
					cert: json.cert,
					private_key: json.private_key,
				});
			});
			await IdentityApi.save();
			return newIds;
		}
	}

	static async updateIdentity(data) {
		await IdentityApi.load();
		if (!IdentityApi.identityData[data.name]) {
			throw String('identity does not exists');
		} else {
			IdentityApi.identityData[data.name] = {
				cert: data.cert,
				private_key: data.private_key,
				peers: data.peers,
				orderer: data.orderer,
				cas: data.cas,
				tls_cas: data.tls_cas,
			};
			await IdentityApi.save();
			return IdentityApi.getArray();
		}
	}

	static async removeIdentity(name) {
		await IdentityApi.load();
		if (!IdentityApi.identityData[name]) {
			throw String('identity does not exists');
		} else {
			delete IdentityApi.identityData[name];
			await IdentityApi.save();
			return IdentityApi.getArray();
		}
	}

	static async getNodeAssociations(nodeType) {
		await IdentityApi.load();
		const associations = {};
		const keys = Object.keys(IdentityApi.identityData);
		keys.forEach(name => {
			const identity = IdentityApi.identityData[name];
			if (identity[nodeType]) {
				identity[nodeType].forEach(key => {
					if (!associations[key]) {
						associations[key] = name;
					}
				});
			}
		});
		return associations;
	}

	static async getPeerAssociations() {
		return this.getNodeAssociations(this.PEER_NODE_TYPE);
	}

	static async getOrdererAssociations() {
		return this.getNodeAssociations(this.ORDERER_NODE_TYPE);
	}

	static async getCertificateAuthorityAssociations() {
		return this.getNodeAssociations(this.CA_NODE_TYPE);
	}

	static async getAssociatedIdentity(node) {
		let nodeType = IdentityApi.PEER_NODE_TYPE;
		if (node.type === 'fabric-ca') {
			nodeType = IdentityApi.CA_NODE_TYPE;
		}
		if (node.type === 'fabric-orderer') {
			const ids = await this.getAssociatedOrdererIdentities(node);
			return ids.length > 0 ? ids[0] : null;
		}
		await IdentityApi.load();
		let id = null;
		const keys = Object.keys(IdentityApi.identityData);
		keys.forEach(name => {
			const identity = IdentityApi.identityData[name];
			if (identity[nodeType]) {
				identity[nodeType].forEach(key => {
					if (key === node.id) {
						id = {
							name,
							...identity,
						};
					}
				});
			}
		});
		return id;
	}

	static async getAssociatedOrdererIdentities(orderer) {
		let nodeType = IdentityApi.ORDERER_NODE_TYPE;
		await IdentityApi.load();
		let ids = [];
		let msps = {};
		const keys = Object.keys(IdentityApi.identityData);
		const combinedId = orderer.cluster_id + '.' + orderer.msp_id;
		let needs_save = false;
		keys.forEach(name => {
			const identity = IdentityApi.identityData[name];
			if (identity[nodeType]) {
				identity[nodeType].forEach(id => {
					if (id === orderer.cluster_id) {
						// Legacy association, update it to current format
						const index = identity[nodeType].indexOf(id);
						identity[nodeType].splice(index, 1, combinedId);
						needs_save = true;
						ids.push({
							name,
							msp_id: orderer.msp_id,
							...identity,
						});
						msps[orderer.msp_id] = true;
					} else {
						if (orderer.raft) {
							orderer.raft.forEach(raftNode => {
								const raftCombinedId = raftNode.cluster_id + '.' + raftNode.msp_id;
								if (id === raftCombinedId && !msps[raftNode.msp_id]) {
									ids.push({
										name,
										msp_id: raftNode.msp_id,
										...identity,
									});
									msps[raftNode.msp_id] = true;
								}
							});
							if (orderer.pending) {
								orderer.pending.forEach(raftNode => {
									const raftCombinedId = raftNode.cluster_id + '.' + raftNode.msp_id;
									if (id === raftCombinedId) {
										ids.push({
											name,
											msp_id: raftNode.msp_id,
											...identity,
										});
										msps[raftNode.msp_id] = true;
									}
								});
							}
						} else {
							if (id === combinedId) {
								ids.push({
									name,
									msp_id: orderer.msp_id,
									...identity,
								});
								msps[orderer.msp_id] = true;
							}
						}
					}
				});
			}
		});
		if (needs_save) {
			await this.save();
		}
		return ids;
	}

	static async associateNode(name, nodeType, id) {
		await IdentityApi.load();
		let identity = IdentityApi.identityData[name];
		if (!identity) {
			throw String('identity does not exists');
		} else {
			await IdentityApi.removeNodeAssociations(nodeType, id);
			identity = IdentityApi.identityData[name];
			if (identity[nodeType]) {
				identity[nodeType].push(id);
			} else {
				identity[nodeType] = [id];
			}
			await IdentityApi.save();
			return IdentityApi.getNodeAssociations(nodeType);
		}
	}

	static async associateComponent(name, node) {
		switch (node.type) {
			case 'fabric-peer':
				return this.associateNode(name, this.PEER_NODE_TYPE, node.id);
			case 'fabric-orderer':
				return this.associateNode(name, this.ORDERER_NODE_TYPE, node.cluster_id + '.' + node.msp_id);
			case 'fabric-ca':
				return this.associateNode(name, this.CA_NODE_TYPE, node.id);
			default:
				throw new Error('Invalid component type');
		}
	}

	static async associatePeer(name, id) {
		return this.associateNode(name, this.PEER_NODE_TYPE, id);
	}

	static async associateOrderer(name, cluster_id, msp_id) {
		return this.associateNode(name, this.ORDERER_NODE_TYPE, cluster_id + '.' + msp_id);
	}

	static async associateCertificateAuthority(name, id) {
		return this.associateNode(name, this.CA_NODE_TYPE, id);
	}

	static async removeNodeAssociations(nodeType, id) {
		await IdentityApi.load();
		const associations = {};
		const keys = Object.keys(IdentityApi.identityData);
		keys.forEach(name => {
			const identity = IdentityApi.identityData[name];
			if (identity[nodeType]) {
				const index = identity[nodeType].indexOf(id);
				if (index !== -1) {
					identity[nodeType].splice(index, 1);
				}
				identity[nodeType].forEach(id2 => {
					if (!associations[id2]) {
						associations[id2] = name;
					}
				});
			}
		});
		await IdentityApi.save();
		return associations;
	}

	static async removePeerAssociations(id) {
		return this.removeNodeAssociations(this.PEER_NODE_TYPE, id);
	}

	static async removeOrdererAssociations(cluster_id, msp_id) {
		return this.removeNodeAssociations(this.ORDERER_NODE_TYPE, cluster_id + '.' + msp_id);
	}

	static async removeCertificateAuthorityAssociations(id) {
		return this.removeNodeAssociations(this.CA_NODE_TYPE, id);
	}

	static async getIdentitiesForCerts(certs) {
		const certIdentities = [];
		const identities = await IdentityApi.getIdentities();
		for (const identity of identities) {
			let isIdentityFromCert = await StitchApi.isIdentityFromRootCert({
				certificate_b64pem: identity.cert,
				root_certs_b64pems: certs,
			});
			if (isIdentityFromCert === true) {
				certIdentities.push(identity);
			}
		}
		return certIdentities;
	}

	static async getIdentitiesForMsp(msp) {
		let mspIdentities = [];
		let certs = [];
		if (msp) {
			if (msp.root_certs) {
				certs = [...msp.root_certs];
			}
			if (msp.intermediate_certs) {
				certs = [...certs, ...msp.intermediate_certs];
			}
		}
		if (certs.length > 0) {
			mspIdentities = await IdentityApi.getIdentitiesForCerts(certs);
		}
		return mspIdentities;
	}

	static async getTLSIdentity(node) {
		const identities = await IdentityApi.getIdentities();
		for (let i=0;i<identities.length;++i) {
			const match = await StitchApi.isIdentityFromRootCert({
				certificate_b64pem: identities[i].cert,
				root_certs_b64pems: _.get(node, 'msp.tlsca.root_certs'),
			});
			if (match) {
				return identities[i];
			}
		}
		return null;
	}
}

export default IdentityApi;
