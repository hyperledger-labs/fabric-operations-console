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
import Logger from '../components/Log/Logger';
import IdentityApi from './IdentityApi';
import { FormattedRestApi, RestApi, REST_API_ERRORS } from './RestApi';
import SettingsApi from './SettingsApi';
import { ValidatedRestApi } from './ValidatedRestApi';
const naturalSort = require('javascript-natural-sort');
const semver = require('semver');
const Log = new Logger('NodeRestApi');

// The location parameter reserved for component records that were created by _this_ IBP console instance
const CREATED_COMPONENT_LOCATION = 'ibm_saas';

// Expiration time for cached node list
const CACHE_TIMEOUT = 500;

/**
 * A helper so we don't repeat `blah.location === 'ibm_saas'` all over the code.
 * @param {string} location The location string to check.
 * @return {boolean} True if the location is associated with created components, false otherwise.
 */
function isCreatedComponentLocation(location) {
	return location === CREATED_COMPONENT_LOCATION;
}

require('./NodeTypes');

class NodeRestApi {
	static skip_cache = false;

	/**
	 * Check if a component is created (instead of imported)
	 * @param {Component} c The component to check.
	 * @return {boolean} True if the component is created, false otherwise.
	 */
	static isCreatedComponent(c) {
		let created = isCreatedComponentLocation(c.location);
		if (created && c.raft) {
			c.raft.forEach(raftNode => {
				if (!isCreatedComponentLocation(raftNode.location)) {
					created = false;
				}
			});
		}
		return created;
	}

	static siid = '$iid'; // use $iid placeholder so that the proxy can fill in the correct id
	static versions = {}; // holder for component type version information
	static pending = null; // current REST request to get all nodes
	static node_cache = {
		nodes: null, // most recent list of all nodes
		expires: 0, // expiration time for most recent list
	};

	static host_url = null;
	static setDefaultHostUrl(host_url) {
		NodeRestApi.host_url = host_url;
	}

	static async getNodeDataFromAthena() {
		const skip_cache = NodeRestApi.skip_cache;
		try {
			let url = '/api/v3/components?deployment_attrs=included';
			if (skip_cache) {
				url = url + '&skip_cache=yes';
				NodeRestApi.skip_cache = false;
			}
			const results = await RestApi.get(url);
			return results;
		} catch (error) {
			if (skip_cache && error.statusCode === 503) {
				return RestApi.get('/api/v3/components?deployment_attrs=included');
			} else {
				throw error;
			}
		}
	}

	/**
	 * Get a sorted list of all the components in the system
	 * @param {boolean} skip_cache True if we need to force a new REST call
	 * @returns {Promise<Component[]>} Sorted list of all components
	 */
	static async getAllNodes(skip_cache) {
		// Check if we have cached data that we can just return
		const now = new Date().getTime();
		if (!skip_cache && NodeRestApi.node_cache.nodes && NodeRestApi.node_cache.expires > now) {
			return Promise.resolve(NodeRestApi.node_cache.nodes);
		}
		// Check if we have a request still pending
		if (NodeRestApi.pending) {
			return NodeRestApi.pending;
		}
		// We need to make a new API call
		const pending = new Promise((resolve, reject) => {
			NodeRestApi.getNodeDataFromAthena()
				.then(results => {
					let nodes = results.components;
					// Sort results based on display name
					nodes.sort((a, b) => {
						const a_name = a.cluster_name ? a.cluster_name + '.' + a.display_name : a.display_name;
						const b_name = b.cluster_name ? b.cluster_name + '.' + b.display_name : b.display_name;
						return naturalSort(a_name, b_name);
					});
					// Ensure that all msps have a host_url value
					nodes.forEach(node => {
						if (node.type === 'msp' || node.type === 'msp-external') {
							if (!node.host_url) {
								node.host_url = NodeRestApi.host_url;
							}
						}
					});
					// Save results in cache
					NodeRestApi.node_cache = {
						nodes,
						expires: new Date().getTime() + CACHE_TIMEOUT,
					};
					// Return list of nodes
					resolve(nodes);
				})
				.catch(error => {
					reject(error);
				})
				.finally(() => {
					// If this is the last request made, then clear it
					if (NodeRestApi.pending === pending) {
						NodeRestApi.pending = null;
					}
				});
		});
		// Track request so we can reuse it if needed
		NodeRestApi.pending = pending;
		return NodeRestApi.pending;
	}

	/**
	 * Helper function to get copy of a node without restricted fields (i.e. fields that should not be
	 * used from the server or not passed to the server
	 * @param {Component} node Component to be copied
	 * @returns {Component} Copy of node with restricted fields removed
	 */
	static sanitizeNode(node) {
		let newNode = { ...node };
		if (newNode.enroll_id) {
			delete newNode.enroll_id;
		}
		if (newNode.enroll_secret) {
			delete newNode.enroll_secret;
		}
		if (newNode.tls_enroll_id) {
			delete newNode.tls_enroll_id;
		}
		if (newNode.tls_enroll_secret) {
			delete newNode.tls_enroll_secret;
		}
		if (newNode.status) {
			delete newNode.status;
		}
		if (newNode.associatedIdentity) {
			delete newNode.associatedIdentity;
		}
		if (newNode.private_key) {
			delete newNode.private_key;
		}
		if (newNode.cert) {
			delete newNode.cert;
		}
		return newNode;
	}

	/**
	 * Get a sorted list of all the components of a given type
	 * @param {string} type The type of nodes to return
	 * @param {boolean} skip_cache True if we need to force a new REST call
	 * @returns {Promise<Component[]>} Sorted list of all components of a given type
	 */
	static async getNodes(type, skip_cache) {
		// Attaching available versions to nodes allows us to show users that updated are available to a given node.
		const upgradeVersions = await NodeRestApi.getAvailableVersions();
		let nodes;
		try {
			nodes = await NodeRestApi.getAllNodes(skip_cache);
			// NOTE: the nodes list is already sorted at this point
		} catch (error) {
			if (error.statusCode === 404 && error.msg === 'no components exist') {
				nodes = [];
			} else {
				// todo page reload logic shouldn't be in this library.
				if (error && error.error === 'login to use this api') {
					// session has expired, reload page to force login
					window.location.reload();
				}
				throw error;
			}
		}
		const filteredNodes = type ? nodes.filter(n => n.type === type) : nodes;
		const newNodes = [];
		const clusters = {};
		const ff = await SettingsApi.getFeatureFlags();
		const patch_1_4to2_x_enabled = ff.patch_1_4to2_x_enabled;
		filteredNodes.forEach(originalNode => {
			// Get santitized copy of node
			const node = NodeRestApi.sanitizeNode(originalNode);
			if (node.backend_addr) {
				let l_backend_addr = node.backend_addr;
				if (l_backend_addr.indexOf('://') !== -1) {
					node.backend_addr = l_backend_addr.slice(l_backend_addr.indexOf('://') + 3);
				}
			}
			// todo MSPS never have upgrade info.  Determining what versions are available for a peer or orderer should be in a helper function in those libs.
			node.upgradable_versions = [];
			let l_type = node.type === 'fabric-ca' ? 'ca' : node.type === 'fabric-peer' ? 'peer' : 'orderer';
			let availableVersions = upgradeVersions ? upgradeVersions[l_type] : {};
			let isUpgradeAvailable = false;
			if (node.version) {
				if (node.version === 'unsupported') {
					node.isUnsupported = true;
					node.version = '1.4.3';
				} else {
					node.isUnsupported = false;
				}
				for (let i in availableVersions) {
					try {
						const is14Node = semver.lt(semver.coerce(node.version), semver.coerce('2.0'));
						const isNew20 = semver.gte(semver.coerce(availableVersions[i].version), semver.coerce('2.0'));
						if (semver.gt(availableVersions[i].version, node.version)) {
							if ((is14Node && !isNew20) || !is14Node || (is14Node && patch_1_4to2_x_enabled)) {
								isUpgradeAvailable = true;
								node.upgradable_versions.push(availableVersions[i].version);
							}
						}
					} catch (e) {
						isUpgradeAvailable = false;
					}
				}
			}
			if (node.type === 'fabric-orderer') {
				if (!_.has(node, 'client_tls_cert') && !_.has(node, 'server_tls_cert') && _.has(node, 'msp.component.tls_cert')) {
					node.client_tls_cert = node.msp.component.tls_cert;
					node.server_tls_cert = node.msp.component.tls_cert;
				} else if (_.has(node, 'server_tls_cert') && !_.has(node, 'msp.component.tls_cert')) {
					_.set(node, 'msp.component.tls_cert', node.server_tls_cert);
				}
			}
			node.isUpgradeAvailable = isUpgradeAvailable;
			// Check if this is a RAFT node that is part of an ordering service cluster
			if (node.cluster_id) {
				let cluster = clusters[node.cluster_id];
				if (!cluster) {
					cluster = {
						...node,
						display_name: node.cluster_name,
						raft: [],
						pending: [],
					};
					clusters[node.cluster_id] = cluster;
					// Put the cluster in the returned list (the node will be inside the cluster)
					newNodes.push(cluster);
				}
				if (node.consenter_proposal_fin) {
					cluster.raft.push(node);
				} else {
					cluster.pending.push(node);
				}
			} else {
				// Not a RAFT node, so just add it to the list
				newNodes.push(node);
			}
		});
		newNodes.forEach(async node => {
			await NodeRestApi.updateNodeVersion(node);
		});
		return newNodes;
	}

	/**
	 * Get details of a node from deployer [todo consider renaming b/c this does not ask deployer, this gets data from athena...]
	 * @param {string} id Id of node to get details for
	 * @returns {object} Node details
	 */
	static async getNodeDetailsFromDeployer(id) {
		// skip cache so that we get the uncached certs
		const resp = await RestApi.get(`/api/v3/components/${id}?cache=skip`);
		return resp;
	}

	/**
	 * Onboard a component to the UI. This means the component is already running somewhere, and
	 * you are registering it with the UI. This is different than creating a component from scratch,
	 * which is done with the deployer apis.
	 * @param {Component} component An previously exported component.
	 * @return {Promise<Component|ValidationError|TranslatedError>} A Promise
	 * that resolves with the new component record or rejects with an error describing what went wrong.
	 */
	static async importComponent(component) {
		const prefix = `Import ${component.display_name}:`;
		try {
			Log.info(`${prefix} sending request`);
			const result = await ValidatedRestApi.post('/api/v3/components', component);
			NodeRestApi.node_cache.expires = 0;
			NodeRestApi.skip_cache = true;
			return NodeRestApi.sanitizeNode(result);
		} catch (error) {
			Log.error(`${prefix} failed: ${error}`);
			if (error.name === REST_API_ERRORS.REQUEST_ERROR_IN_RESPONSE)
				error.translation = {
					title: 'error_component_import_title',
					message: 'error_component_import',
					params: { component: component.display_name },
				};
			throw error;
		}
	}

	/**
	 * Create a new component from scratch.
	 * @param {Component} node New component data.
	 * @return {Promise<Component|ValidationError|TranslatedError>} A Promise
	 * that resolves with the new component record or rejects with an error describing what went wrong.
	 */
	static async createSaasNode(node) {
		const prefix = `Create ${node.display_name}:`;
		try {
			Log.info(`${prefix} sending request`);
			const result = await ValidatedRestApi.post('/api/saas/v3/components', node);
			NodeRestApi.node_cache.expires = 0;
			NodeRestApi.skip_cache = true;
			if (result && result.created && _.isArray(result.created)) {
				const cluster = {
					...result.created[0],
					display_name: node.cluster_name,
					raft: [],
					pending: [],
				};
				result.created.forEach(raftNode => {
					cluster.raft.push(NodeRestApi.sanitizeNode(raftNode));
				});
				return cluster;
			} else {
				return NodeRestApi.sanitizeNode(result);
			}
		} catch (error) {
			Log.error(`${prefix} failed: ${error}`);
			if (error.name === REST_API_ERRORS.REQUEST_ERROR_IN_RESPONSE)
				error.translation = {
					title: 'error_component_create_title',
					message: 'error_component_create',
					params: {
						component: node.display_name,
					},
				};
			throw error;
		}
	}

	/**
	 * Get a node from the identifier
	 * @param {string} id Idenifier for the node to find
	 * @return {Promise<Component|Error>} A Promise that resolves with the new
	 * component record or rejects with an error if the node could not be found
	 */
	static async getNodeById(id) {
		const nodes = await NodeRestApi.getNodes();
		let node = null;
		nodes.forEach(test => {
			if (!node) {
				if (test.id === id) {
					node = test;
				} else if (test.cluster_id === id) {
					node = test;
				} else if (test.raft) {
					// todo move this into the orderer lib
					test.raft.forEach(raftNode => {
						if (raftNode.id === id) {
							node = raftNode;
						}
					});
					test.pending.forEach(pendingNode => {
						if (pendingNode.id === id) {
							node = pendingNode;
						}
					});
				}
			}
		});
		if (!node) {
			throw new Error('Node not found');
		}
		return node;
	}

	/**
	 * Delete the UI's record of a component. Note this api does not destroy the component's
	 * deployment in Kubernetes (if applicable).
	 * @param {string} id The component's OpTool id. If deleting an enroll id (for template related
	 * things), use the `id` field, not `enroll_id`.
	 * @return {Promise<DeleteComponentResponse|RestApiError>} A Promise that
	 * resolves with the response from the server.
	 */
	static async removeComponent(id) {
		const prefix = `Remove component ${id}:`;
		try {
			Log.info(`${prefix} sending request`);
			const resp = await FormattedRestApi.delete(`/api/v2/components/${id}`);
			NodeRestApi.node_cache.expires = 0;
			NodeRestApi.skip_cache = true;
			return resp;
		} catch (error) {
			Log.error(`${prefix} failed: ${error}`);
			if (error.name === REST_API_ERRORS.REQUEST_ERROR_IN_RESPONSE)
				error.translation = {
					title: 'error_component_removal_title',
					message: 'error_component_removal',
					params: { id },
				};
			throw error;
		}
	}

	/**
	 * Delete the Kubernetes resources associated with the component and remove the UI's record of
	 * a Saas-deployed component.  Only applies to peers, cas, and orderers.
	 * @param {string} id The component's OpTool id.
	 * @param {boolean} [force] If true, the Deployer response will be ignored and the component record
	 * regardless of whether the k8s deployment was cleaned up. Defaults to false.
	 * @return {Promise<DeleteComponentResponse|RestApiError>} A Promise that
	 * resolves with the response from the server.
	 */
	static async deleteComponent(id, force) {
		const prefix = `Delete component ${id}${force ? ' forced' : ''}:`;
		try {
			Log.info(`${prefix} sending request`);
			const resp = await FormattedRestApi.delete(`/api/saas/v2/components/${id}${force ? '?force=yes' : ''}`);
			NodeRestApi.node_cache.expires = 0;
			NodeRestApi.skip_cache = true;
			return resp;
		} catch (error) {
			Log.error(`${prefix} failed: ${error}`);
			if (error.name === REST_API_ERRORS.REQUEST_ERROR_IN_RESPONSE)
				error.translation = {
					title: 'error_component_delete_title',
					message: 'error_component_delete',
					params: { id },
				};
			throw error;
		}
	}

	/**
	 * Finds and deletes all components with the matching tag. This logic is controlled by the tags
	 * array in the component data. Tags are not case sensitive.
	 * @param {string} tag A tag associated with one or more components.
	 * @param {boolean} [force] If true, the Deployer response will be ignored and the component record
	 * regardless of whether the k8s deployment was cleaned up. Defaults to false.
	 * @return {Promise<DeleteComponentResponse[]|RestApiError>} A Promise that
	 * resolves with the response from the server.
	 */
	static async removeTaggedComponents(tag, force) {
		const prefix = `Delete components w/ tag ${tag}${force ? ' forced' : ''}:`;
		try {
			Log.info(`${prefix} sending request`);
			const resp = await FormattedRestApi.delete(`/api/saas/v2/components/tags/${tag}${force ? '?force=yes' : ''}`);
			NodeRestApi.node_cache.expires = 0;
			NodeRestApi.skip_cache = true;
			return resp && resp.removed;
		} catch (error) {
			Log.error(`${prefix} failed: ${error}`);
			if (error.name === REST_API_ERRORS.REQUEST_ERROR_IN_RESPONSE)
				error.translation = {
					title: 'error_tagged_component_removal_title',
					message: 'error_tagged_component_removal',
					params: { tag },
				};
			throw error;
		}
	}

	/**
	 * Create a new component from scratch.
	 * @param {Component} node Updated component data.
	 * @return {Promise<Component|ValidationError|TranslatedError>} A Promise that
	 * resolves with the updated component record or rejects with an error describing what went wrong.
	 */
	static async updateNode(node) {
		let update = NodeRestApi.sanitizeNode(node);
		const prefix = `Update ${node.id}:`;
		try {
			Log.info(`${prefix} sending request`);
			const result = await ValidatedRestApi.put('/api/v3/components/' + node.id, {
				...update,
				id: undefined,
			});
			NodeRestApi.node_cache.expires = 0;
			NodeRestApi.skip_cache = true;
			return NodeRestApi.sanitizeNode(result);
		} catch (error) {
			Log.error(`${prefix} failed: ${error}`);
			if (error.name === REST_API_ERRORS.REQUEST_ERROR_IN_RESPONSE)
				error.translation = {
					title: 'error_component_update_title',
					message: 'error_component_update',
					params: { component: node.display_name },
				};
			throw error;
		}
	}

	/**
	 * Update version information (if available) for the node
	 * @param {Component} node Component record to be updated
	 * @return {Promise<Component>} A Promise that resolves with the updated component record
	 */
	static async updateNodeVersion(node) {
		if (node.raft) {
			for (let i = 0; i < node.raft.length; i++) {
				await NodeRestApi.updateNodeVersion(node.raft[i]);
			}
		} else {
			if (node.operations_url && !node.version) {
				let opts = {
					url: node.operations_url + '/version',
					method: 'GET',
				};
				try {
					const resp = await RestApi.post('/api/v2/proxy/', opts);
					const version = resp ? JSON.parse(JSON.stringify(resp)) : null;
					if (version && version.Version) {
						node.version = version.Version;
					}
				} catch (err) {
					//do nothing?
				}
			}
		}
		return node;
	}

	/**
	 * Get a node details (including associated identities) from the identifier
	 * @param {string} id Idenifier for the node to find
	 * @param {boolean} includePrivateKeyAndCert True if the private key and certificate for
	 * associated identities should be included in the response
	 * @return {Promise<Component|Error>} A Promise that resolves with
	 * the new component record or rejects with an error if the node could not be found
	 */
	static async getNodeDetails(id, includePrivateKeyAndCert) {
		const node = await NodeRestApi.getNodeById(id);
		await NodeRestApi.updateNodeVersion(node);
		if (node.type === 'fabric-orderer') {
			node.associatedIdentities = [];
			const identities = await IdentityApi.getAssociatedOrdererIdentities(node);
			identities.forEach(identity => {
				const data = {
					name: identity.name,
					msp_id: identity.msp_id,
				};
				if (includePrivateKeyAndCert) {
					data.private_key = identity.private_key;
					data.cert = identity.cert;
				}
				node.associatedIdentities.push(data);
			});
		} else {
			const identity = await IdentityApi.getAssociatedIdentity(node);
			if (identity) {
				node.associatedIdentity = identity.name;
				if (includePrivateKeyAndCert) {
					node.private_key = identity.private_key;
					node.cert = identity.cert;
				}
			}
		}
		return node;
	}

	/**
	 * Get the status of a node (using health check)
	 * @param {Node} node Node to check
	 * @return {Promise<NodeStatus|Error>} A Promise that resolves with
	 * the new component record or rejects with an error if the node could not be found
	 */
	static async checkHealth(node) {
		if (node.type === 'fabric-orderer' && node.consenter_proposal_fin === false) {
			// Pending orderer nodes do not have a health check so just see if we can get
			// the details for the node
			await NodeRestApi.getNodeDetailsFromDeployer(node.id);
			return { status: 'OK' };
		}
		if (node.operations_url) {
			let opts = {
				url: node.operations_url + '/healthz',
				method: 'GET',
			};
			return RestApi.post('/api/v2/proxy/', opts);
		} else {
			// we do not have url to use for health check, so just
			// resolve it as null
			return null;
		}
	}

	static async getServiceInstanceInfo() {
		const url = `/deployer/api/v3/instance/${NodeRestApi.siid}`;
		return RestApi.get(url);
	}

	static async updateNodeResources(node, usage) {
		const data = {
			resources: {},
		};
		const categories = ['ca', 'orderer', 'peer', 'couchdb', 'leveldb', 'dind', 'chaincodelauncher', 'proxy', 'fluentd'];
		categories.forEach(cat => {
			if (usage[cat] && usage[cat].cpu) {
				data.resources[cat] = {
					requests: {
						cpu: usage[cat].cpu + '',
						memory: usage[cat].memory + 'M',
					},
					limits: {
						cpu: usage[cat].cpu + '',
						memory: usage[cat].memory + 'M',
					},
				};
			}
		});
		return RestApi.put(`/api/saas/v2/components/${node.id}`, data);
	}

	static getAllAvailableVersions() {
		if (NodeRestApi.versions.promise) {
			return NodeRestApi.versions.promise;
		}
		const promise = new Promise(resolve => {
			const url = `/deployer/api/v3/instance/${NodeRestApi.siid}/type/all/versions`;
			const headers = {
				'cache-control': 'no-cache',
			};
			RestApi.get(url, headers)
				.then(resp => {
					// sort the list
					Object.keys(resp.versions).forEach(key => {
						let versions = resp.versions[key];
						if (versions) {
							versions = Object.values(versions) || [];
							try {
  							versions = versions.sort((a, b) => {
  								let result = 0;
  								try {
  									const a_ver = semver.coerce(a.version);
  									const b_ver = semver.coerce(b.version);
  									if (semver.lt(a_ver, b_ver)) {
  										result = 1;
  									}
  									if (semver.gt(a_ver, b_ver)) {
  										result = -1;
  									}
  								} catch (error) {
  									console.error(error);
  								}
  								return result;
  							});
							} catch (e) {
								//
							}
						}
						resp.versions[key] = versions;
					});
					NodeRestApi.versions = resp.versions;
				})
				.catch(error => {
					NodeRestApi.versions = {};
				})
				.finally(() => {
					resolve(NodeRestApi.versions);
				});
		});
		NodeRestApi.versions.promise = promise;
		return promise;
	}

	static async getAvailableVersions() {
		if (!_.isEmpty(NodeRestApi.versions) && !NodeRestApi.versions.promise) {
			return NodeRestApi.versions;
		} else {
			await this.getAllAvailableVersions();
			if (!NodeRestApi.versions) {
				NodeRestApi.versions = {};
			}
			return NodeRestApi.versions;
		}
	}

	/* Upgrade node version */
	static async applyPatch(node) {
		const all = [];
		const body = {
			version: node.version,
		};
		const headers = {
			'cache-control': 'no-cache',
		};
		if (node.raft) {
			// todo move this logic into the orderer lib
			node.raft.forEach(raft_node => {
				all.push(RestApi.put(`/api/saas/v2/components/${raft_node.id}`, body, headers));
			});
		} else {
			all.push(RestApi.put(`/api/saas/v2/components/${node.id}`, body, headers));
		}
		return (await Promise.all(all))[0];
	}

	static async syncAdminCerts(nodes, addAdminCerts, isNodeOUEnabled) {
		const updateCerts = nodes.map(async node => {
			if (isNodeOUEnabled) {
				// Call deployer api that will update certs and enable nodeou
				Log.debug('Enabling nodeou for ', node.id, ' and updating the admin certs to ', addAdminCerts);
				try {
					const resp = await NodeRestApi.uploadAdminCertsAndNodeOU(node.id, addAdminCerts, true);
					Log.debug('Update nodeou and admin cert response:', resp);
				} catch (error) {
					Log.error('An error occurred when updating node ou and admin cert for ', node);
					throw error;
				}
			} else {
				Log.debug('Updating admin certs for peer ', node.id, ' to ', addAdminCerts);
				try {
					const resp = await NodeRestApi.uploadAdminCerts(node.id, addAdminCerts, node.admin_certs);
					Log.debug('Update admin cert response:', resp);
				} catch (error) {
					Log.error('An error occurred when updating admin cert for peer ', node);
					throw error;
				}
			}
		});

		try {
			await Promise.all(updateCerts);
		} catch (error) {
			Log.error('An error occurred when updating admin cert for peers ', error);
			throw error;
		}
	}

	/* Upload admin certs */
	static async uploadAdminCerts(node_id, append_admin_certs, remove_admin_certs) {
		const body = {
			remove_admin_certs,
			append_admin_certs,
		};
		const headers = {
			'cache-control': 'no-cache',
		};
		return RestApi.put(`/api/saas/v2/components/${node_id}/certs`, body, headers);
	}

	/* Upload admin certs and enable node ou(single call, one restart) */
	static async uploadAdminCertsAndNodeOU(node_id, append_admin_certs, isNodeOUEnabled) {
		const body = {
			admin_certs: append_admin_certs,
			node_ou: {
				enabled: isNodeOUEnabled,
			},
		};
		const headers = {
			'cache-control': 'no-cache',
		};
		return RestApi.put(`/api/saas/v3/components/${node_id}`, body, headers);
	}

	static async getTLSSignedCertFromDeployer(nodes) {
		// todo is this called for anything but orderers?  Only orderers have tls_cert.  We should move it to that lib.
		const all = [];
		const updated = [];
		nodes.forEach(node => {
			all.push(NodeRestApi.getNodeDetailsFromDeployer(node.id));
		});
		const nodeDetails = await Promise.all(all.map(p => p.catch(e => e)));
		nodeDetails.forEach(nodeDetail => {
			let node = NodeRestApi.sanitizeNode(nodes.find(x => x.id === nodeDetail.id));
			if (_.get(nodeDetail, 'msp.component.tls_cert')) {
				node.client_tls_cert = _.get(nodeDetail, 'msp.component.tls_cert');
				node.server_tls_cert = _.get(nodeDetail, 'msp.component.tls_cert');
			}
			updated.push(node);
		});
		return updated;
	}

	static async getCurrentNodeConfig(node) {
		let config = {};
		if (node.dep_component_id) {
			let l_type = node.type === 'fabric-ca' ? 'ca' : node.type === 'fabric-peer' ? 'peer' : 'orderer';
			const headers = {
				'cache-control': 'no-cache',
			};
			const resp = await RestApi.get(`/deployer/api/v3/instance/${NodeRestApi.siid}/type/${l_type}/component/${node.id}`, headers);
			config = resp.config || resp.configs;
		}
		return config;
	}

	static async getHSMConfig() {
		return await RestApi.get(`/deployer/api/v3/instance/${NodeRestApi.siid}/hsmconfig`);
	}

	static async updateConfigOverride(node) {
		await RestApi.put(`/api/saas/v2/components/${node.id}`, {
			config_override: node.config_override,
		});
		NodeRestApi.skip_cache = true;
		return node;
	}

	static async updateTLSCertificate(node, tls_cert) {
		await RestApi.put(`/api/saas/v3/components/${node.id}`, {
			crypto: {
				enrollment: {
					ca: {
						tls_cert,
					},
					tlsca: {
						tls_cert,
					},
				},
			},
		});
		NodeRestApi.skip_cache = true;
		return node;
	}

	static async updateThirdPartyCertificates(node, ecert, ekey, tls_cert, tls_key) {
		let keys = {
			ekey,
			ecert,
		};
		if (tls_cert) {
			keys.tls_cert = tls_cert;
		}
		if (tls_key) {
			keys.tls_key = tls_key;
		}
		await RestApi.put(`/api/saas/v3/components/${node.id}`, {
			crypto: {
				msp: {
					component: keys,
				},
			},
		});
		NodeRestApi.skip_cache = true;
		return node;
	}

	static async performActions(node, actions) {
		const url = '/api/saas/v3/components/' + node.type + '/' + node.id + '/actions';
		let result = await RestApi.post(url, actions);
		NodeRestApi.skip_cache = true;
		return result;
	}

	static async restartNode(node) {
		return NodeRestApi.performActions(node, { restart: true });
	}

	static async getUnCachedDataWithDeployerAttrs(id) {
		NodeRestApi.node_cache.expires = 0;
		NodeRestApi.skip_cache = true;
		let url;
		if (id) {
			url = `/api/v3/components/${id}?deployment_attrs=included&skip_cache=yes`;
		} else {
			url = '/api/v3/components?deployment_attrs=included&skip_cache=yes';
		}
		return await RestApi.get(url);
	}

	static async getLogSettings(node, identity) {
		let opts = {
			url: node.operations_url + '/logspec',
			method: 'GET',
			cert: identity.cert,
			key: identity.private_key,
			ca: _.get(node, 'msp.tlsca.root_certs[0]'),
			skip_cache: true,
		};
		let resp = await RestApi.post('/api/v2/proxy/', opts);
		try {
			// older instances return the format in text (not JSON)
			resp = JSON.parse(resp);
		} catch (e) {
			// no op
		}
		return resp.spec;
	}

	static async setLogSettings(node, identity, log_settings) {
		let opts = {
			url: node.operations_url + '/logspec',
			method: 'PUT',
			cert: identity.cert,
			key: identity.private_key,
			ca: _.get(node, 'msp.tlsca.root_certs[0]'),
			body: { spec: log_settings },
			skip_cache: true,
		};
		return RestApi.post('/api/v2/proxy/', opts);
	}
}

export { NodeRestApi, CREATED_COMPONENT_LOCATION, isCreatedComponentLocation };
