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
import async from 'async';
import _ from 'lodash';
import { promisify } from 'util';
import Logger from '../components/Log/Logger';
import ChannelUtils from '../utils/channel';
import * as constants from '../utils/constants';
import Helper from '../utils/helper';
import ChannelApi from './ChannelApi';
import { NodeRestApi } from './NodeRestApi';
import { RestApi } from './RestApi';
const bytes = require('bytes');
const org_template = require('../utils/configtx/org_template.json');
const urlParser = require('url');
const naturalSort = require('javascript-natural-sort');
const Log = new Logger('OrdererRestApi');

const ORDERER_TYPE = 'fabric-orderer';
const LEGACY_ORDERER_TYPE = 'orderer';

class OrdererRestApi {
	static systemChannel = 'testchainid';
	static async getOrderers(skip_cache) {
		return NodeRestApi.getNodes('fabric-orderer', skip_cache);
	}

	/**
	 * If the component was imported, the record is cleaned up.  If the component was created, the associated k8s resources and the component will both be
	 * removed.
	 * @param {FabricOrderer} orderer The orderer (solo or cluster) to be removed.
	 * @param {boolean} [force] If true, the records will be removed regardless of whether the k8s resources were successfully removed.
	 * @return {Promise<DeleteComponentResponse[]|RestApiError>} A promise that resolves with the deleted components or rejects with an
	 * error.
	 */
	static async removeOrderer(orderer, force) {
		if (NodeRestApi.isCreatedComponent(orderer)) {
			if (orderer.raft) {
				return NodeRestApi.removeTaggedComponents(orderer.cluster_id, force);
			} else {
				return NodeRestApi.deleteComponent(orderer.id, force);
			}
		} else {
			const all = [];
			if (orderer.raft) {
				orderer.raft.forEach(node => {
					if (NodeRestApi.isCreatedComponent(node)) {
						all.push(NodeRestApi.deleteComponent(node.id, force));
					} else {
						all.push(NodeRestApi.removeComponent(node.id));
					}
				});
				orderer.pending.forEach(node2 => {
					all.push(NodeRestApi.deleteComponent(node2.id, force));
				});
			} else {
				all.push(NodeRestApi.removeComponent(orderer.id));
			}
			return Promise.all(all);
		}
	}

	static generateUniqueClusterId(id) {
		const timestamp = new Date().getTime();
		return id + '_' + timestamp.toString(16);
	}

	static async getOrderersFromCluster(url) {
		const allOrderers = await this.getOrderers();
		let srcNode = {};
		for (let orderer of allOrderers) {
			if (orderer.url2use === url) {
				srcNode = orderer;
				break;
			}
		}

		let orderers = null;
		if (srcNode.cluster_id) {
			orderers = await OrdererRestApi.getClusterDetails(srcNode.cluster_id);
		} else {
			orderers = await OrdererRestApi.getNodeDetails(srcNode.ordererId);
		}
		return orderers.raft ? orderers.raft : [orderers];
	}

	/**
	 * Imports the given Orderers.
	 * @param {ExportedOrderer[]|FabricOrderer[]} data A list of Orderers to be imported.
	 * @return {Promise<FabricOrderer[]>} A Promise that resolves with the list of imported Orderer records.
	 */
	static async importOrderer(data) {
		const cluster_ids = [];
		const raft = {};
		const result = [];

		for (let i in data) {
			const json = data[i];
			const nodes = json.raft ? json.raft : [json];

			for (let x in nodes) {
				const node = nodes[x];
				const newOrderer = {
					type: 'fabric-orderer',
					display_name: node.display_name,
					api_url: node.api_url,
					operations_url: node.operations_url,
					osnadmin_url: node.osnadmin_url,
					location: node.location,
					grpcwp_url: Helper.normalizeHttpURL(node.grpcwp_url),
					msp_id: node.msp_id,
					system_channel_id: node.system_channel_id || '',
					systemless: node.systemless ? true: false,
					cluster_id: node.cluster_id,
					cluster_name: node.cluster_name,
					msp: node.msp,
				};
				if (!_.get(newOrderer, 'msp.component.tls_cert')) {
					_.set(newOrderer, 'msp.component.tls_cert', node.tls_cert || node.server_tls_cert);
				}
				if (!_.get(newOrderer, 'msp.tlsca.root_certs')) {
					_.set(newOrderer, 'msp.tlsca.root_certs', [node.tls_ca_root_cert || node.pem]);
				}
				if (node.raft_action) {
					if (cluster_ids.indexOf(node.cluster_id) === -1) {
						cluster_ids.push(node.cluster_id);
					}
					if (node.raft_action === 'append') {
						const resp = await NodeRestApi.importComponent(newOrderer);
						store_resp(resp);
					}
				} else {
					const resp = await NodeRestApi.importComponent(newOrderer);
					store_resp(resp);
				}
			}
		}

		return result;

		function store_resp(resp) {
			if (cluster_ids.indexOf(resp.cluster_id) === -1) {
				if (raft[resp.cluster_id]) {
					raft[resp.cluster_id].raft.push(resp);
				} else {
					raft[resp.cluster_id] = {
						...resp,
						display_name: resp.cluster_name,
						raft: [resp],
					};
					result.push(raft[resp.cluster_id]);
				}
			}
		}
	}

	// [ ! do not use this function !]
	// dsh todo - hunt down code using this function and replace with getClusterDetails when possible
	static async getOrdererDetails(orderer_id, includePrivateKeyAndCert) {
		return NodeRestApi.getNodeDetails(orderer_id, includePrivateKeyAndCert);
	}

	static async getClusterDetails(cluster_id, includePrivateKeyAndCert) {
		return NodeRestApi.getClusterDetails(cluster_id, includePrivateKeyAndCert);
	}

	static async updateConfigOverride(node) {
		return NodeRestApi.updateConfigOverride(node);
	}

	static async updateOrderer(orderer) {
		orderer.grpcwp_url = Helper.fixURL(orderer.grpcwp_url);
		await NodeRestApi.updateNode(orderer);
		return this.getOrdererDetails(orderer.id);
	}

	static async removeOrdererNodeFromSystemChannel(options) {
		options.type = 'remove';
		return this.updateConsenterIntoSystemChannel(options);
	}

	static async addOrdererNodeToSystemChannel(options) {
		options.type = 'add';
		return this.updateConsenterIntoSystemChannel(options);
	}

	static async updateOrdererCertsOnSystemChannel(options) {
		options.type = 'update';
		return this.updateConsenterIntoSystemChannel(options);
	}

	static async getUrlForConsenterUpdate(options, consenters) {
		const orderer = await OrdererRestApi.getOrdererDetails(options.currentOrdererId || options.ordererId);
		let url2use = null;
		const parsedURL = urlParser.parse(orderer.api_url);
		consenters.forEach(consenter => {
			if (consenter.host === parsedURL.hostname && consenter.port === parsedURL.port) {
				url2use = orderer.url2use;
			}
		});
		if (url2use === null && orderer.cluster_id) {
			// If orderer is not in the consenter set, look for other nodes in the same
			// cluster that we can use to submit the update
			const cluster = await OrdererRestApi.getClusterDetails(orderer.cluster_id);
			let url = null;
			if (cluster.raft) {
				for (let i = 0; i < cluster.raft.length && !url; i++) {
					const node = cluster.raft[i];
					const parsedURL2 = urlParser.parse(node.api_url);
					for (let j = 0; j < consenters.length && !url; j++) {
						const consenter = consenters[j];
						if (consenter.host === parsedURL2.hostname && consenter.port === parsedURL2.port) {
							url = node.url2use;
						}
					}
				}
			}
			if (!url) {
				url = orderer.url2use;
			}
			return url;
		} else {
			if (!url2use) {
				url2use = orderer.url2use;
			}
			return url2use;
		}
	}

	static async updateConsenterIntoSystemChannel(options) {
		let channel_config;
		try {
			channel_config = await OrdererRestApi.getSystemChannelConfig(options.currentOrdererId || options.ordererId, options.configtxlator_url);
		} catch (error) {
			if (
				options.type === 'remove' &&
				error &&
				error.function_name === 'getChannelBlockFromOrderer' &&
				error.grpc_resp &&
				!error.grpc_resp.message &&
				!error.grpc_resp.status
			) {
				// this is what we see if the orderer has already been removed from
				// the system channel, so just return ok
				return { message: 'ok' };
			} else {
				throw error;
			}
		}
		const orderer = await OrdererRestApi.getOrdererDetails(options.ordererId, true);
		let original_json = channel_config;
		let updated_json = JSON.parse(JSON.stringify(channel_config));
		options.original_json = original_json;
		options.updated_json = updated_json;
		options.api_url = orderer.api_url;
		let identity = OrdererRestApi.getCertsAssociatedWithMsp(orderer.associatedIdentities, orderer.msp_id);
		// get the consenter section
		const original_length = _.get(updated_json, 'channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters.length');
		const channel_group = await this.modifyConsenter(options, updated_json.channel_group);
		const consenters = channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters;
		const addingOrRemoving = consenters.length !== original_length;
		const updatingCerts = options.type === 'update';
		if (consenters && consenters.length && (addingOrRemoving || updatingCerts)) {
			updated_json.channel_group = channel_group;
			options.channel_id = orderer.system_channel_id || this.systemChannel;
			options.org_msp_id = orderer.msp_id;
			options.cluster_id = orderer.cluster_id;
			options.client_cert_b64pem = identity.cert;
			options.client_prv_key_b64pem = identity.private_key;
			options.orderer_host = await OrdererRestApi.getUrlForConsenterUpdate(options, consenters);
			await ChannelApi.updateChannel(options);
			return { message: 'ok' };
		} else {
			return { message: 'ok' };
		}
	}

	static async modifyConsenter(options, channel_group) {
		let consenterNode = channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters;
		let ordererAddresses = channel_group.values.OrdererAddresses.value.addresses;

		let parsedURL = urlParser.parse(options.consenter_url || options.api_url);
		const host = parsedURL.hostname;
		const port = parsedURL.port;
		if (options.type === 'remove') {
			_.remove(consenterNode, consenter => {
				return consenter.host === host && Number(consenter.port) === Number(port);
			});
			_.remove(ordererAddresses, address => {
				return address === host + ':' + port;
			});
			return channel_group;
		} else if (options.type === 'add') {
			const orderer = await NodeRestApi.getNodeDetailsFromDeployer(options.ordererId);
			const tlscert = _.get(orderer, 'msp.component.tls_cert');
			if (tlscert) {
				const nodeToAdd = {
					host,
					port,
					client_tls_cert: tlscert,
					server_tls_cert: tlscert,
				};
				let found = false;
				consenterNode.forEach(consenter => {
					if (consenter.host === host && consenter.port === port) {
						found = true;
					}
				});
				if (!found) {
					consenterNode.push(nodeToAdd);
					ordererAddresses.push(host + ':' + port);
				}
				return channel_group;
			} else {
				throw new Error('unable to get signed certs for orderer');
			}
		} else if (options.type === 'update') {
			const nodeToBeUpdated = _.find(consenterNode, consenter => {
				return consenter.host === host && Number(consenter.port) === Number(port);
			});
			nodeToBeUpdated.client_tls_cert = options.tls_new_cert;
			nodeToBeUpdated.server_tls_cert = options.tls_new_cert;
			return channel_group;
		} else {
			throw new Error('action type is required');
		}
	}

	static async getSystemChannelConfig(ordererId, configtxlator_url) {
		let orderer;
		try {
			orderer = await OrdererRestApi.getOrdererDetails(ordererId, false);
		} catch (error) {
			Log.error('Unable to get orderer', ordererId);
			return; // todo really?  Shouldn't an error be thrown here?
		}

		try {
			let options = {
				ordererId,
				channelId: orderer.system_channel_id || this.systemChannel,
				configtxlator_url,
			};
			return await OrdererRestApi.getChannelConfig(options);
		} catch (error) {
			error.message = 'failed to retrieve system channel';
			throw error;
		}
	}

	static async getAllChannelNamesFromOrderer(options) {
		let on_block_number = 0;
		let channel_names = [];
		let stopexec = false;
		await async.until(
			async.asyncify(async () => {
				return stopexec;
			}),
			async.asyncify(async () => {
				let blocks = [];
				const BLOCKS_AT_ONCE = Number(options.blocks_at_once) || 2;
				for (let i = on_block_number; i < on_block_number + BLOCKS_AT_ONCE; i++) {
					blocks.push(i);
				}
				try {
					await async.eachLimit(
						blocks,
						BLOCKS_AT_ONCE,
						async.asyncify(async block_number => {
							on_block_number++;
							let optscopy = { ...options };
							optscopy.start_block = block_number;
							optscopy.stop_block = block_number;
							const channelBlock = await OrdererRestApi.getSystemChannelBlockFromOrderer(optscopy);
							const _block_binary2json = promisify(ChannelApi._block_binary2json);
							const resp = await _block_binary2json(channelBlock, options.configtxlator_url);
							const channel_id = _.get(resp, 'data.data[0].payload.data.payload.header.channel_header.channel_id');
							if (channel_id) channel_names.push(channel_id);
						})
					);
				} catch (error2) {
					stopexec = true;
				}
			})
		);

		channel_names.sort((a, b) => {
			return naturalSort(a, b);
		});
		return channel_names;
	}

	static getCertsAssociatedWithMsp(associatedIdentities, msp_id) {
		let certs = null;
		if (associatedIdentities) {
			associatedIdentities.forEach(test => {
				if (test.msp_id === msp_id) {
					certs = {
						cert: test.cert,
						private_key: test.private_key,
					};
				}
			});
		}
		return certs;
	}

	static async getSystemChannelBlockFromOrderer(options) {
		const orderer = await OrdererRestApi.getOrdererDetails(options.ordererId, true);
		if (orderer.cluster_id && !options.altUrls) {
			const cluster = await OrdererRestApi.getClusterDetails(orderer.cluster_id, true);
			options.altUrls = [];
			if (cluster.raft) {
				cluster.raft.forEach(node => {
					const certs = OrdererRestApi.getCertsAssociatedWithMsp(cluster.associatedIdentities, node.msp_id);
					options.altUrls.push({
						url: node.url2use,
						msp_id: node.msp_id,
						cert: certs ? certs.cert : null,
						private_key: certs ? certs.private_key : null,
					});
				});
			}
		}
		const ordererCerts = OrdererRestApi.getCertsAssociatedWithMsp(orderer.associatedIdentities, orderer.msp_id);
		const test = options.altUrls
			? options.altUrls.pop()
			: {
				url: orderer.url2use,
				msp_id: orderer.msp_id,
				cert: ordererCerts ? ordererCerts.cert : null,
				private_key: ordererCerts ? ordererCerts.private_key : null,
			};

		const opts = {
			msp_id: test.msp_id,
			client_cert_b64pem: test.cert,
			client_prv_key_b64pem: test.private_key,
			include_bin: true,
			orderer_host: test.url,
			configtxlator_url: options.configtxlator_url,
			start_block: options.start_block,
			stop_block: options.stop_block,
			channel_id: options.channelId || orderer.system_channel_id || this.systemChannel,
		};
		if (!opts.orderer_host) {
			throw new Error('cannot get config block, missing orderer_host');
		}
		if (!opts.configtxlator_url) {
			throw new Error('cannot get config block, missing configtxlator_url');
		}
		let resp;
		try {
			let getChannelBlockFromOrderer = promisify(window.stitch.getChannelBlockFromOrderer);
			resp = await getChannelBlockFromOrderer(opts);
		} catch (error) {
			error.nodeName = orderer.display_name;
			Log.error(error);
			if (options.altUrls && options.altUrls.length > 0) {
				return OrdererRestApi.getSystemChannelBlockFromOrderer(options);
			} else {
				throw error;
			}
		}
		return resp.grpc_message;
	}

	static async getChannelConfigBlock(options) {
		const orderer = await OrdererRestApi.getOrdererDetails(options.ordererId, true);
		if (orderer.cluster_id && !options.altUrls) {
			const cluster = await OrdererRestApi.getClusterDetails(orderer.cluster_id, true);
			options.altUrls = [];
			if (cluster.raft) {
				cluster.raft.forEach(node => {
					let certs = OrdererRestApi.getCertsAssociatedWithMsp(cluster.associatedIdentities, node.msp_id);
					// for a pending node case, use the cert from any of the associated MSPs with the appropriate cert
					if (!certs && cluster.associatedIdentities && cluster.associatedIdentities.length > 0) {
						certs = {
							cert: cluster.associatedIdentities[0].cert,
							private_key: cluster.associatedIdentities[0].private_key,
							msp_id: cluster.associatedIdentities[0].msp_id,
						};
					}
					options.altUrls.push({
						url: node.url2use,
						msp_id: certs && certs.msp_id ? certs.msp_id : node.msp_id || null,
						cert: certs ? certs.cert : null,
						private_key: certs ? certs.private_key : null,
					});
				});
			}
		}
		const ordererCerts = OrdererRestApi.getCertsAssociatedWithMsp(orderer.associatedIdentities, orderer.msp_id);
		const test = options.altUrls
			? options.altUrls.pop()
			: {
				url: orderer.url2use,
				msp_id: orderer.msp_id,
				cert: ordererCerts ? ordererCerts.cert : null,
				private_key: ordererCerts ? ordererCerts.private_key : null,
			};
		if (!options.identityInfo) options.identityInfo = {};
		const opts = {
			msp_id: options.identityInfo.msp_id || test.msp_id,
			client_cert_b64pem: options.identityInfo.cert || test.cert,
			client_prv_key_b64pem: options.identityInfo.private_key || test.private_key,
			orderer_host: test.url,
			configtxlator_url: options.configtxlator_url,
			include_bin: true,
			channel_id: options.channelId,
		};
		let resp;
		try {
			let getChannelConfigBlockFromOrderer;
			if (options.genesis) {
				getChannelConfigBlockFromOrderer = promisify(window.stitch.getChannelsGenesisFromOrderer);
			} else {
				getChannelConfigBlockFromOrderer = promisify(window.stitch.getChannelConfigBlockFromOrderer);
			}
			resp = await getChannelConfigBlockFromOrderer(opts);
		} catch (error) {
			error.nodeName = orderer.display_name;
			Log.error(error);
			if (options.altUrls && options.altUrls.length > 0) {
				return OrdererRestApi.getChannelConfigBlock(options);
			} else {
				throw error;
			}
		}
		options.altUrls = null;
		return resp.grpc_message;
	}

	static async getChannelConfig(options) {
		let block;
		try {
			block = await OrdererRestApi.getChannelConfigBlock(options);
		} catch (error) {
			const statusMessage = _.get(error, 'grpc_resp.statusMessage');
			let thrownError = error;
			if (statusMessage && statusMessage.indexOf('FORBIDDEN') !== -1) {
				thrownError = { ...error, message_key: 'channel_forbidden' };
			}
			throw thrownError;
		}
		let resp;
		try {
			const _block_binary2json = promisify(ChannelApi._block_binary2json);
			resp = await _block_binary2json(block, options.configtxlator_url);
		} catch (error) {
			Log.error(error);
			throw error;
		}
		return resp.data.data[0].payload.data.config;
	}

	/*
	  options = {
		 ordererId: ordererId,
		 configtxlator_url: configtxlator_url,
		 msp_payload: msp_payload
	  }
	 }
	*/

	static async addMSP(options) {
		const channel_config = await OrdererRestApi.getSystemChannelConfig(options.ordererId, options.configtxlator_url);
		let original_json = channel_config;
		let updated_json = JSON.parse(JSON.stringify(channel_config));

		const template_msp = { ...org_template };
		template_msp.policies.Admins.policy.value.identities[0].principal.msp_identifier = options.payload.msp_id;
		template_msp.policies.Readers.policy.value.identities[0].principal.msp_identifier = options.payload.msp_id;
		template_msp.policies.Writers.policy.value.identities[0].principal.msp_identifier = options.payload.msp_id;
		template_msp.policies.Endorsement.policy.value.identities[0].principal.msp_identifier = options.payload.msp_id;

		let msp_definition = options.payload;
		msp_definition.name = msp_definition.msp_id;
		// msp_definition = _.omit(msp_definition, ['id', 'type', 'timestamp', 'id', 'msp_id', 'error', 'key']);
		msp_definition = _.pick(msp_definition, [
			'name',
			'root_certs',
			'admins',
			'intermediate_certs',
			'tls_root_certs',
			'tls_intermediate_certs',
			'organizational_unit_identifiers',
			'fabric_node_ous',
			'revocation_list',
		]);

		if (msp_definition.fabric_node_ous && _.isEmpty(msp_definition.fabric_node_ous)) {
			delete msp_definition.fabric_node_ous;
		}

		template_msp.values.MSP.value.config = {
			...template_msp.values.MSP.value.config,
			...msp_definition,
		};
		const first_consortium = ChannelUtils.getSampleConsortiumOrFirstKey(updated_json.channel_group.groups.Consortiums.groups);

		if (options.type === 'ordererAdmin') {
			let orderer = updated_json.channel_group.groups.Orderer;
			if (orderer && !orderer.groups) {
				orderer.groups = {};
			}
			updated_json.channel_group.groups.Orderer.groups[options.payload.msp_id] = template_msp;
		} else {
			if (first_consortium && !first_consortium.groups) {
				first_consortium.groups = {};
			}
			first_consortium.groups[options.payload.msp_id] = template_msp;
		}

		const orderer = await OrdererRestApi.getOrdererDetails(options.ordererId, true);
		let identity = OrdererRestApi.getCertsAssociatedWithMsp(orderer.associatedIdentities, orderer.msp_id);
		options.original_json = original_json;
		options.updated_json = updated_json;
		options.channel_id = orderer.system_channel_id || this.systemChannel;
		options.org_msp_id = orderer.msp_id;
		options.orderer_host = orderer.url2use;
		options.client_cert_b64pem = identity.cert;
		options.client_prv_key_b64pem = identity.private_key;

		await ChannelApi.updateChannel(options);
		return {
			message: 'ok',
			orderer: orderer,
		};
	}

	static async updateAdvancedConfig(options) {
		const channel_config = await OrdererRestApi.getSystemChannelConfig(options.ordererId, options.configtxlator_url);
		let original_json = channel_config;
		let updated_json = JSON.parse(JSON.stringify(channel_config));

		let block_params = options.block_params;
		if (block_params) {
			let absolute_max_bytes = block_params.absolute_max_bytes;
			if (absolute_max_bytes) {
				let calc_bytes = bytes.parse(absolute_max_bytes);
				if (calc_bytes > constants.ABSOLUTE_MAX_BYTES_MAX) {
					throw new Error('Invalid \'absolute_max_bytes\' for block size');
				}
				_.set(updated_json, 'channel_group.groups.Orderer.values.BatchSize.mod_policy', 'Admins');
				_.set(updated_json, 'channel_group.groups.Orderer.values.BatchSize.value.absolute_max_bytes', calc_bytes);
			}

			let max_message_count = block_params.max_message_count;
			if (max_message_count) {
				if (max_message_count < constants.MAX_MESSAGE_COUNT_MIN || max_message_count > constants.MAX_MESSAGE_COUNT_MAX) {
					throw new Error('Invalid \'max_message_count\' for block size');
				}
				_.set(updated_json, 'channel_group.groups.Orderer.values.BatchSize.mod_policy', 'Admins');
				_.set(updated_json, 'channel_group.groups.Orderer.values.BatchSize.value.max_message_count', max_message_count);
			}

			let preferred_max_bytes = block_params.preferred_max_bytes;
			if (preferred_max_bytes) {
				let calc_bytes = bytes.parse(preferred_max_bytes);
				if (calc_bytes < bytes(constants.PREFERRED_MAX_BYTES_MIN) || calc_bytes > bytes(constants.PREFERRED_MAX_BYTES_MAX)) {
					throw new Error('Invalid \'preferred_max_bytes\' for block size');
				}
				_.set(updated_json, 'channel_group.groups.Orderer.values.BatchSize.mod_policy', 'Admins');
				_.set(updated_json, 'channel_group.groups.Orderer.values.BatchSize.value.preferred_max_bytes', calc_bytes);
			}

			let timeout = block_params.timeout;
			if (timeout) {
				const parse = require('parse-duration');
				let time_ms = parse(timeout);
				if (time_ms < parse(constants.TIMEOUT_MIN) || time_ms > parse(constants.TIMEOUT_MAX)) {
					throw new Error('\'BatchTimeout\' out of range');
				}
				_.set(updated_json, 'channel_group.groups.Orderer.values.BatchTimeout.mod_policy', 'Admins');
				_.set(updated_json, 'channel_group.groups.Orderer.values.BatchTimeout.value.timeout', timeout);
			}
		}

		// Set raft parameters
		if (options.raft_params) {
			try {
				this.setRaftParameters(options.raft_params, updated_json.channel_group);
			} catch (error) {
				Log.error(error);
				throw error;
			}
		}

		// Set channel capabilities
		if (options.capabilities && options.capabilities.channel && options.capabilities.channel.length > 0) {
			this.setCapability(updated_json.channel_group, options.capabilities.channel);
		}

		// Set orderer capabilities
		if (options.capabilities && options.capabilities.orderer && options.capabilities.orderer.length > 0) {
			this.setCapability(updated_json.channel_group.groups.Orderer, options.capabilities.orderer);
		}

		if (options.maintenance_mode) {
			updated_json.channel_group.groups.Orderer.values.ConsensusType.value.state = 'STATE_MAINTENANCE';
		} else {
			updated_json.channel_group.groups.Orderer.values.ConsensusType.value.state = 'STATE_NORMAL';
		}

		Log.debug('Updated orderer block parameters: ', updated_json);
		Log.debug('Updating orderer config to: ', options);

		const orderer = await OrdererRestApi.getOrdererDetails(options.ordererId, true);
		let identity = OrdererRestApi.getCertsAssociatedWithMsp(orderer.associatedIdentities, orderer.msp_id);
		options.original_json = original_json;
		options.updated_json = updated_json;
		options.channel_id = orderer.system_channel_id || this.systemChannel;
		options.org_msp_id = orderer.msp_id;
		options.orderer_host = orderer.url2use;

		options.client_cert_b64pem = identity.cert;
		options.client_prv_key_b64pem = identity.private_key;

		try {
			const resp = await ChannelApi.updateChannel(options);
			Log.debug('Updating orderer config response: ', resp);
			return { message: 'ok' };
		} catch (error) {
			Log.debug('Updating orderer config error: ', error);
			throw error;
		}
	}

	static setRaftParameters(raft_params, updated_json) {
		let snapshot_interval_size = raft_params.snapshot_interval_size;
		if (snapshot_interval_size) {
			let calc_bytes = bytes.parse(snapshot_interval_size);
			if (calc_bytes > constants.SNAPSHOT_INTERVAL_SIZE_MAX) {
				throw new Error('Invalid \'snapshot interval size\'');
			}
			_.set(updated_json, 'groups.Orderer.values.ConsensusType.value.metadata.options.snapshot_interval_size', calc_bytes);
		}

		let election_tick = raft_params.election_tick;
		if (election_tick) {
			if (election_tick < constants.ELECTION_TICK_MIN || election_tick > constants.ELECTION_TICK_MAX) {
				throw new Error('Invalid \'election tick\'');
			}
			_.set(updated_json, 'groups.Orderer.values.ConsensusType.value.metadata.options.election_tick', election_tick);
		}

		let heartbeat_tick = raft_params.heartbeat_tick;
		if (heartbeat_tick) {
			if (heartbeat_tick < constants.HEARTBEAT_TICK_MIN || heartbeat_tick > constants.HEARTBEAT_TICK_MAX) {
				throw new Error('Invalid \'heartbeat tick\'');
			}
			_.set(updated_json, 'groups.Orderer.values.ConsensusType.value.metadata.options.heartbeat_tick', heartbeat_tick);
		}

		let max_inflight_blocks = raft_params.max_inflight_blocks;
		if (max_inflight_blocks) {
			if (max_inflight_blocks < constants.MAX_INFLIGHT_BLOCKS_MIN || max_inflight_blocks > constants.MAX_INFLIGHT_BLOCKS_MAX) {
				throw new Error('Invalid \'max inflight blocks\'');
			}
			_.set(updated_json, 'groups.Orderer.values.ConsensusType.value.metadata.options.max_inflight_blocks', max_inflight_blocks);
		}

		let tick_interval = raft_params.tick_interval;
		if (tick_interval) {
			const parse = require('parse-duration');
			let time_ms = parse(tick_interval);
			if (time_ms < parse(constants.TICK_INTERVAL_MIN) || time_ms > parse(constants.TICK_INTERVAL_MAX)) {
				throw new Error('\'Tick Interval\' out of range');
			}
			_.set(updated_json, 'groups.Orderer.values.ConsensusType.value.metadata.options.tick_interval', tick_interval);
		}
	}

	static setCapability(node, channel_capabilities) {
		node.values.Capabilities = {};
		node.values.Capabilities.mod_policy = 'Admins';
		node.values.Capabilities.value = {};
		node.values.Capabilities.value.capabilities = {};
		for (let i in channel_capabilities) {
			Log.debug('Injecting channel capability', channel_capabilities[i]);
			node.values.Capabilities.value.capabilities[channel_capabilities[i]] = {};
		}
	}

	static async deleteMSP(options) {
		const channel_config = await OrdererRestApi.getSystemChannelConfig(options.ordererId, options.configtxlator_url);
		let original_json = channel_config;
		let updated_json = JSON.parse(JSON.stringify(channel_config));
		const first_consortium = ChannelUtils.getSampleConsortiumOrFirstKey(updated_json.channel_group.groups.Consortiums.groups);

		if (options.type === 'ordererAdmin') {
			let i_orderer_groups = updated_json.channel_group.groups.Orderer.groups;
			delete i_orderer_groups[options.payload.msp_id];
		} else {
			let i_consort_groups = first_consortium.groups;
			delete i_consort_groups[options.payload.msp_id];
		}

		const orderer = await OrdererRestApi.getOrdererDetails(options.ordererId, true);
		let identity = OrdererRestApi.getCertsAssociatedWithMsp(orderer.associatedIdentities, orderer.msp_id);
		options.original_json = original_json;
		options.updated_json = updated_json;
		options.channel_id = orderer.system_channel_id || this.systemChannel;

		options.org_msp_id = orderer.msp_id;
		options.orderer_host = orderer.url2use;
		options.client_cert_b64pem = identity.cert;
		options.client_prv_key_b64pem = identity.private_key;

		await ChannelApi.updateChannel(options);
		return { message: 'ok' };
	}

	static buildConfigOverride(data) {
		const config_override = {};
		if (data.hsm) {
			let bccsp = {
				Default: 'PKCS11',
				PKCS11: {
					Label: data.hsm.label,
					Pin: data.hsm.pin,
				},
			};
			_.set(config_override, 'General.BCCSP', bccsp);
		}
		return config_override;
	}

	static async createRaftOrderers(data) {
		const raft = {
			msp_id: data.admin_msp.msp_id,
			type: 'fabric-orderer',
			orderer_type: 'raft',
			display_name: data.display_name,
			cluster_name: data.display_name,
		};
		if (data.clusterType === 'paid') {
			raft.resources = {
				orderer: {
					requests: {
						cpu: data.usage.orderer.cpu,
						memory: data.usage.orderer.memory + 'M',
					},
				},
				proxy: {
					requests: {
						cpu: data.usage.proxy.cpu,
						memory: data.usage.proxy.memory + 'M',
					},
				},
			};
			raft.storage = {
				orderer: {
					size: data.usage.orderer.storage + 'Gi',
				},
			};
		}
		if (data.version) {
			raft.version = data.version;
		}
		if (data.zones && data.zones.length) {
			raft.zone = data.zones;
		}
		if (data.systemless) {
			raft.systemless = true;
		}
		if (data.saas_ca) {
			raft.crypto = [];
			raft.config_override = [];
			let crypto = {
				enrollment: {
					ca: {
						host: Helper.getHostname(data.saas_ca.api_url),
						port: Helper.getPort(data.saas_ca.api_url),
						name: data.saas_ca.msp.ca.name,
						tls_cert: data.saas_ca.msp.component.tls_cert,
						enroll_id: data.enroll_id,
						enroll_secret: data.enroll_secret,
					},
					tlsca: {
						host: Helper.getHostname(data.tls_saas_ca.api_url),
						port: Helper.getPort(data.tls_saas_ca.api_url),
						name: _.get(data.tls_saas_ca, 'msp.tlsca.name') || data.tls_saas_ca.msp.ca.name,
						tls_cert: data.tls_saas_ca.msp.component.tls_cert,
						enroll_id: data.tls_enroll_id,
						enroll_secret: data.tls_enroll_secret,
						csr_hosts: data.tls_csr_hostname ? [data.tls_csr_hostname] : [],
					},
					component: {
						admin_certs: data.admin_msp.admins,
					},
				},
			};
			let config_override = data.config_override ? data.config_override : OrdererRestApi.buildConfigOverride(data);
			// Hardware Security Module (HSM)
			if (data.hsm && data.hsm.pkcs11endpoint) {
				_.set(raft, 'hsm.pkcs11endpoint', data.hsm.pkcs11endpoint);
			}
			for (let i = 1; i <= data.raft_nodes; i++) {
				if (data.tls_csr_hostname) {
					crypto = {
						enrollment: {
							...crypto.enrollment,
							tls: {
								...crypto.enrollment.tls,
								csr: {
									hosts: [data.tls_csr_hostname + i],
								},
							},
						},
					};
				}
				raft.crypto.push(crypto);
				raft.config_override.push(config_override);
			}
		} else {
			raft.crypto = data.raft_config_json;
			raft.config_override = [];
			raft.config.forEach(raft_config => {
				raft.config_override.push(data.config_override ? data.config_override : OrdererRestApi.buildConfigOverride(data));
			});
		}
		if (data.hsm && data.hsm.pkcs11endpoint) {
			_.set(raft, 'hsm.pkcs11endpoint', data.hsm.pkcs11endpoint);
		}
		return NodeRestApi.createSaasNode(raft);
	}

	static async createOrderer(data) {
		if (data.raft_nodes > 1) {
			return OrdererRestApi.createRaftOrderers(data);
		}
		const node = {
			display_name: data.display_name,
			cluster_id: data.raftParent ? data.raftParent.cluster_id : null,
			cluster_name: data.raftParent ? data.raftParent.cluster_name : data.display_name,
			type: 'fabric-orderer',
			orderer_type: 'raft',
			msp_id: data.admin_msp.msp_id,
			systemless: data.systemless ? true : false,
			crypto: data.saas_ca
				? [
					{
						enrollment: {
							ca: {
								host: Helper.getHostname(data.saas_ca.api_url),
								port: Helper.getPort(data.saas_ca.api_url),
								name: data.saas_ca.msp.ca.name,
								tls_cert: data.saas_ca.msp.component.tls_cert,
								enroll_id: data.enroll_id,
								enroll_secret: data.enroll_secret,
							},
							tlsca: {
								host: Helper.getHostname(data.tls_saas_ca.api_url),
								port: Helper.getPort(data.tls_saas_ca.api_url),
								name: _.get(data.tls_saas_ca, 'msp.tlsca.name') || data.tls_saas_ca.msp.ca.name,
								tls_cert: data.tls_saas_ca.msp.component.tls_cert,
								enroll_id: data.tls_enroll_id,
								enroll_secret: data.tls_enroll_secret,
								csr_hosts: data.tls_csr_hostname ? [data.tls_csr_hostname] : [],
							},
							component: {
								admin_certs: data.admin_msp.admins,
							},
						},
					},
				]
				: [
					{
						msp: {
							ca: {
								root_certs: data.admin_msp.root_certs,
								intermediate_certs: data.admin_msp.intermediate_certs ? data.admin_msp.intermediate_certs : [],
							},
							tlsca: {
								root_certs: data.admin_msp.tls_root_certs,
								intermediate_certs: data.admin_msp.tls_intermediate_certs ? data.admin_msp.tls_intermediate_certs : [],
							},
							component: {
								ekey: data.saas_ca_private_key,
								ecert: data.saas_ca_cert,
								tls_key: data.tls_ca_private_key,
								tls_cert: data.tls_ca_cert,
								admin_certs: data.admin_msp.admins,
							},
						},
					},
				],
		};
		if (data.clusterType === 'paid') {
			node.resources = {
				orderer: {
					requests: {
						cpu: data.usage.orderer.cpu,
						memory: data.usage.orderer.memory + 'M',
					},
				},
				proxy: {
					requests: {
						cpu: data.usage.proxy.cpu,
						memory: data.usage.proxy.memory + 'M',
					},
				},
			};
			node.storage = {
				orderer: {
					size: data.usage.orderer.storage + 'Gi',
				},
			};
		}
		if (data.version) {
			node.version = data.version;
		}
		if (data.zones && data.zones.length) {
			node.zone = data.zones;
		}
		_.set(node, 'config_override[0]', data.config_override ? data.config_override : OrdererRestApi.buildConfigOverride(data));
		// Hardware Security Module (HSM)
		if (data.hsm && data.hsm.pkcs11endpoint) {
			_.set(node, 'hsm.pkcs11endpoint', data.hsm.pkcs11endpoint);
		}
		if (node.cluster_id === null) {
			delete node.cluster_id;
		}
		return NodeRestApi.createSaasNode(node);
	}

	static async checkHealth(orderer) {
		return NodeRestApi.checkHealth(orderer);
	}

	static async listIncludesAllConsentersForCluster(list, cluster_id, configtxlator_url, feature_flags) {
		if (!cluster_id) return true;
		const channel_config = await OrdererRestApi.getSystemChannelConfig(cluster_id, configtxlator_url);
		let res = true;
		const json = JSON.parse(JSON.stringify(channel_config));
		const consenters = _.get(json, 'channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters');
		consenters.forEach(consenter => {
			let found = false;
			list.forEach(node => {
				const parsedURL = urlParser.parse(node.api_url);
				if (consenter.host === parsedURL.hostname && consenter.port.toString() === parsedURL.port.toString()) {
					found = true;
				}
			});
			if (!found) {
				res = false;
			}
		});
		return res;
	}

	static async removeAllNodesFromSystemChannel(orderer, configtxlator_url, feature_flags) {
		if (orderer.cluster_id) {
			const list = orderer.raft ? orderer.raft : [orderer];
			const res = await OrdererRestApi.listIncludesAllConsentersForCluster(list, orderer.cluster_id, configtxlator_url, feature_flags);
			if (res) return;

			return OrdererRestApi.removeNodesFromSystemChannel(orderer, configtxlator_url, feature_flags);
		} else {
			return OrdererRestApi.removeNodesFromSystemChannel(orderer, configtxlator_url, feature_flags);
		}
	}

	static async removeNodesFromSystemChannel(orderer, configtxlator_url, feature_flags) {
		if (feature_flags && !feature_flags.scale_raft_nodes_enabled) return;
		if (!orderer) return;

		let list = orderer;
		if (orderer.raft) list = [...orderer.raft];
		if (!_.isArray(list)) list = [orderer];
		if (list.length === 0) return;

		const current = list.pop();
		if (current.location === 'ibm_saas' && current.consenter_proposal_fin) {
			const options = {
				ordererId: current.id,
				configtxlator_url,
			};
			await OrdererRestApi.removeOrdererNodeFromSystemChannel(options);
			return OrdererRestApi.removeNodesFromSystemChannel(list, configtxlator_url);
		} else {
			return OrdererRestApi.removeNodesFromSystemChannel(list, configtxlator_url);
		}
	}

	static async uploadConfigBlock(ordererId, block) {
		let body = {};
		_.set(body, 'b64_block', block);
		const headers = {
			'cache-control': 'no-cache',
		};
		return RestApi.put(`/api/saas/v2/components/${ordererId}/config`, body, headers);
	}

	static async getOrdererURL(orderer, consenters) {
		let ordererURL = orderer.url2use;
		if (orderer.raft) {
			for (let i = 0; i < orderer.raft.length; i++) {
				const node = orderer.raft[i];
				const backend_addr = node.backend_addr.split(':');
				const finder = {
					host: backend_addr[0],
					port: Number(backend_addr[1]),
				};
				const found = _.find(consenters, finder);
				if (found) {
					try {
						await OrdererRestApi.checkHealth(node);
						return node.url2use;
					} catch (err) {
						Log.error('Orderer status unavailable:', node);
					}
				}
			}
		}
		return ordererURL;
	}
}

export { OrdererRestApi, ORDERER_TYPE, LEGACY_ORDERER_TYPE };
