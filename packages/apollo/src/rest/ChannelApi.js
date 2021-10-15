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
import async from 'async';
import _ from 'lodash';
import { promisify } from 'util';
import Logger from '../components/Log/Logger';
import * as constants from '../utils/constants';
import Helper from '../utils/helper';
import { EventsRestApi } from './EventsRestApi';
import IdentityApi from './IdentityApi';
import { MspRestApi } from './MspRestApi';
import { NodeRestApi } from './NodeRestApi';
import { OrdererRestApi } from './OrdererRestApi';
import { PeerRestApi } from './PeerRestApi';
import SignatureRestApi from './SignatureRestApi';
import StitchApi from './StitchApi';
const naturalSort = require('javascript-natural-sort');
const channel_template = require('../utils/configtx/channel_template.json');
const org_template = require('../utils/configtx/org_template.json');
const url = require('url');
const bytes = require('bytes');
const diff = require('deep-diff');
const urlParser = require('url');

const Log = new Logger('ChannelApi');

class ChannelApi {
	static async getAllChannels() {
		return ChannelApi.getChannel(null);
	}

	static async getChannel(id, peerId) {
		const nodes = await NodeRestApi.getNodes();
		const peers = await PeerRestApi.getPeersWithCerts();
		let o_channelList = [];
		let errors = [];

		try {
			await async.eachLimit(
				peers,
				6,
				// asyncify to get around babel converting these functions to non-async: https://caolan.github.io/async/v2/docs.html#asyncify
				async.asyncify(async peer => {
					const opts = {
						msp_id: peer.msp_id,
						client_cert_b64pem: peer.cert,
						client_prv_key_b64pem: peer.private_key,
						host: peer.url2use,
					};
					const certAvailable = Helper.isCertAvailable(opts);
					if (!certAvailable) {
						let peerError = {};
						peerError.id = peer.id;
						peerError.name = peer.name;
						peerError.message_key = 'missing_cert';
						errors.push(peerError);
						return;
					}

					let resp;
					try {
						const getChannelsOnPeer = promisify(window.stitch.getChannelsOnPeer);
						resp = await getChannelsOnPeer(opts);
					} catch (error) {
						error.id = peer.id;
						error.name = peer.name;
						errors.push(error);
						return;
					}

					try {
						await async.eachLimit(
							resp.data.channelsList,
							6,
							async.asyncify(async channel => {
								let channelId = channel.channelId;
								opts.channel_id = channelId;

								let channel_resp;
								try {
									const getChannelConfigFromPeer = promisify(window.stitch.getChannelConfigFromPeer);
									channel_resp = await getChannelConfigFromPeer(opts);
								} catch (error) {
									Log.error(error);
									let existingChannel = o_channelList.length ? o_channelList.find(channel => channel.id === channelId) : null;
									// Log.debug('getChannel: processing channel: '+channelId+' on peer '+ peer.id);
									if (!id || id === channelId) {
										if (!existingChannel) {
											o_channelList.push({
												id: channelId,
												name: channelId,
												peers: [peer],
												orderers: [],
											});
										} else {
											//already got channel info
											existingChannel.peers.push(peer);
											Log.debug('getChannel: already got channel info: ' + channelId);
										}
									}
									return;
								}

								let config_envelop = channel_resp.data.block.data.data_list[0].envelope.payload.data;
								const l_orderers = this.getOrdererAddresses(config_envelop.config);
								let orderers = [];
								l_orderers.forEach(orderer => {
									nodes.forEach(node => {
										// Also check the raft nodes within
										let matchingRaftNode = false;
										if (node.raft && node.raft.length > 0) {
											matchingRaftNode = node.raft.find(x => _.toLower(x.backend_addr) === _.toLower(orderer));
										}
										if (_.toLower(node.backend_addr) === _.toLower(orderer) || matchingRaftNode) {
											if (!orderers.find(x => x.id === node.id)) {
												orderers.push(node);
											}
										}
									});
								});
								let existingChannel = o_channelList.length
									? o_channelList.find(channel => channel.id === channelId && _.xor(channel.ordererAddresses, l_orderers).length === 0)
									: null;
								// Log.debug('getChannel: processing channel: '+channelId+' on peer '+ peer.id);
								let cert_warning = false;
								const endorsement_policies = {};
								const app_groups = _.get(config_envelop.config, 'channel_group.groups_map.Application.groups_map');
								const orderer_groups = _.get(config_envelop.config, 'channel_group.groups_map.Orderer.groups_map');
								const application_capability = _.get(
									config_envelop.config,
									'channel_group.groups_map.Application.values_map.Capabilities.value.capabilities_map'
								);
								for (let app in app_groups) {
									const admins = app_groups[app].values_map.MSP.value.admins_list;
									const node_ou = _.get(app_groups[app], 'values_map.MSP.value.fabric_node_ous.enable', false);
									if (Helper.getLongestExpiry(admins) < constants.CERTIFICATE_WARNING_DAYS && !node_ou) {
										cert_warning = true;
									}
									endorsement_policies[app] = !!_.get(app_groups[app], 'policies_map.Endorsement');
								}
								for (let app in orderer_groups) {
									const admins = orderer_groups[app].values_map.MSP.value.admins_list;
									const node_ou = _.get(orderer_groups[app], 'values_map.MSP.value.fabric_node_ous.enable', false);
									if (Helper.getLongestExpiry(admins) < constants.CERTIFICATE_WARNING_DAYS && !node_ou) {
										cert_warning = true;
									}
								}
								if (!id || id === channelId) {
									if (!existingChannel) {
										o_channelList.push({
											id: channelId,
											name: channelId,
											capability: {
												application: Helper.getCapabilityHighestVersion(application_capability),
											},
											peers: [peer],
											cert_warning,
											orderers: orderers,
											ordererAddresses: l_orderers,
											endorsement_policies,
										});
									} else {
										//already got channel info
										existingChannel.peers.push(peer);
										Log.debug('getChannel: already got channel info: ' + channelId);
									}
								}
							})
						);
					} catch (error) {
						// eachLimit's functions should push errors on the errors list instead of throwing, so this shouldn't be called.
						if (error) Log.error(error);

						let channels = o_channelList.length ? o_channelList.map(channel => channel.id) : null;
						Log.info('getChannels: finished channels on ' + peer.id + ' ' + channels ? JSON.stringify(channels, null, 2) : '');
					}
				})
			);
		} catch (error) {
			// eachLimit's functions should push errors on the errors list instead of throwing, so this shouldn't be called.
			if (error) Log.error(error);

			if (errors.length > 0) {
				Log.error(errors);
				//TODO: Display back in UI
			}
		}

		Log.info('getChannels: finished peers');
		if (id) {
			let channel = o_channelList
				? o_channelList.find(channel => {
					let channelPeers = channel.peers.map(peer => peer.id);
					if (peerId) return channel.id === id && channelPeers.includes(peerId);
					else return channel.id === id;
				  })
				: null;
			if (channel) {
				return channel;
			} else {
				throw String('channel not found');
			}
		} else {
			let channelList = o_channelList;
			channelList.forEach(channel => {
				if (!channel.orderers.length) {
					// If no orderer mapping found, and two channels with same name exist, then show the orderer address to distinguish between the two tiles
					let sameNameChannel = channelList.find(x => x.name === channel.name);
					if (sameNameChannel && channel.ordererAddresses) {
						channel.orderers = channel.ordererAddresses.map(orderer => {
							let ordererName = '';
							if (orderer.includes(':')) {
								ordererName = orderer.split(':')[0];
							} else {
								ordererName = orderer;
							}
							return { name: ordererName, backend_addr: orderer };
						});
					}
				}
			});
			Log.debug('Channel list:', channelList);
			// sort peer list in channel so that we query the first peer for consistency for blockheight, etc
			channelList.forEach(channel => {
				channel.peers.sort((a, b) => {
					return naturalSort(a.id, b.id);
				});
			});
			channelList.sort((a, b) => {
				return naturalSort(a.id, b.id);
			});
			const channelResp = {
				channels: channelList,
				errors,
			};
			return channelResp;
		}
	}

	/*
			const options = {
				channel_id: options.channel_id,
				org_msp_id: options.org_msp_id,
				application_msp_ids: ['PeerOrg1'],
				orderer_url: 'orderer_url',
				client_cert_b64pem: 'client_cert_b64pem',
				client_prv_key_b64pem: 'client_prv_key_b64pem,
			};
	*/
	static async createAppChannel(options) {
		// 1. build channel update json
		// options.consortium_id = 'SampleConsortium';
		options.fabric_version = '1.1'; // todo VR: do we need to expose this?
		options.application_msp_ids = Object.keys(options.application_msps);
		const configBlock = _.cloneDeep(channel_template);
		const config_update = configBlock.payload.data.config_update;

		Log.info('Adding custom signature policies', config_update);

		const write_set = config_update.write_set;
		const read_set = config_update.read_set;

		Log.info('Check consortium', options.consortium_id);
		read_set.values.Consortium.value.name = options.consortium_id;
		write_set.values.Consortium.value.name =options.consortium_id;
		if (!write_set.groups.Application.values) {
			write_set.groups.Application.values = {};
		}
		let i_app_groups = {};
		options.application_msp_ids.forEach(msp => {
			i_app_groups[msp] = {};
		});
		write_set.groups.Application.groups = i_app_groups;
		read_set.groups.Application.groups = i_app_groups;
		if (!_.isEmpty(options.block_params) || !_.isEmpty(options.raft_params) || !_.isEmpty(options.orderer_capabilities) || !_.isEmpty(options.consenters)) {
			read_set.groups.Orderer.groups = {
				[options.orderer_msp]: {},
			};
		}

		config_update.channel_id = options.channel_id;
		let n_out_of = options.n_out_of;
		let { admins } = this.getRWA(options.application_msps);
		if (n_out_of && n_out_of > admins.length) {
			const error = String(`Incorrect explicit policy n_out_of ${n_out_of} > ${admins.length}`);
			Log.error(error);
			throw error;
		}

		// Set channel policy
		let app_policies = write_set.groups.Application.policies;
		this.setupPolicy(app_policies, options.application_msps, n_out_of);

		// Set ACLs
		if (options.acls && Object.keys(options.acls).length > 0) {
			this.setupACLs(write_set.groups.Application, options.acls);
		}

		// Set block parameters
		if (!_.isEmpty(options.block_params)) {
			let error = this.setBlockParameters(options.block_params, write_set, true);
			if (error) {
				Log.error(error);
				throw error;
			}
		} else {
			delete write_set.groups.Orderer.values.BatchSize;
			delete write_set.groups.Orderer.values.BatchTimeout;
		}

		// Set raft parameters
		if (!_.isEmpty(options.raft_params)) {
			let error = this.setRaftParameters(options.raft_params, write_set);
			if (error) {
				Log.error(error);
				throw error;
			}
		}

		/* Not supported by fabric yet
		// Set channel capabilities
		if (!_.isEmpty(options.channel_capabilities)) {
			this.setCapability(write_set, options.channel_capabilities);
		} */

		// Set application capabilities
		if (options.application_capabilities && options.application_capabilities.length > 0) {
			this.setCapability(write_set.groups.Application, options.application_capabilities);
			if (options.application_capabilities.indexOf('V2_0') !== -1) {
				// 2.0 channel, inject policies
				if (options.lifecycle_policy.type === 'SPECIFIC' && _.size(options.lifecycle_policy.members) !== 0) {
					this.set20Type1Policies(write_set.groups.Application, 'LifecycleEndorsement', options.lifecycle_policy.members, options.lifecycle_policy.n);
				} else {
					this.set20Type3Policies(write_set.groups.Application, 'LifecycleEndorsement', options.lifecycle_policy.type || 'MAJORITY');
				}

				if (options.endorsement_policy.type === 'SPECIFIC' && _.size(options.endorsement_policy.members) !== 0) {
					this.set20Type1Policies(write_set.groups.Application, 'Endorsement', options.endorsement_policy.members, options.endorsement_policy.n);
				} else {
					this.set20Type3Policies(write_set.groups.Application, 'Endorsement', options.endorsement_policy.type || 'MAJORITY');
				}
			}
		}
		// Set orderer capabilities
		if (!_.isEmpty(options.orderer_capabilities)) {
			this.setCapability(write_set.groups.Orderer, options.orderer_capabilities);
		} else {
			delete write_set.groups.Orderer.values.Capabilities;
		}

		// Set channel consenters
		if (!_.isEmpty(options.consenters)) {
			this.setupConsenters(write_set.groups.Orderer, options.consenters);
			this.setupOrdererAddresses(write_set, options.consenters);
		} else {
			delete write_set.groups.Orderer.values.ConsensusType;
			delete write_set.values.OrdererAddresses;
		}

		Log.info('After adding custom signature policies:', config_update);

		// 2. convert channel update json to protobuf
		let bin;
		try {
			const _encodeConfigUpdate = promisify(ChannelApi._encodeConfigUpdate);
			bin = await _encodeConfigUpdate(config_update, options.configtxlator_url);
		} catch (err1) {
			Log.error(err1);
			err1.source = 'configtxlator';
			err1.message_key = 'error_block_encode';
			throw err1;
		}
		// If signature was provided, sign and submit the request, else request signature
		if (options.client_cert_b64pem && options.client_prv_key_b64pem) {
			// 3.sign channel update protobuf
			const s_opts = {
				client_cert_b64pem: options.client_cert_b64pem,
				client_prv_key_b64pem: options.client_prv_key_b64pem,
				protobuf: bin,
				msp_id: options.org_msp_id,
			};

			let resp2;
			try {
				const signConfigUpdate = promisify(window.stitch.signConfigUpdate);
				resp2 = await signConfigUpdate(s_opts);
			} catch (error) {
				Log.error(error);
				throw error;
			}
			// 5. Send notification to other channel members
			const signature_request = {
				channel_name: options.channel_id,
				number_of_signatures: n_out_of,
				originator: {
					msp_id: options.org_msp_id,
					signature: resp2,
					client_cert_b64pem: options.client_cert_b64pem,
					client_prv_key_b64pem: options.client_prv_key_b64pem,
				},
				orgs: options.application_msps,
				orderers: options.orderer_msps,
				ordererUrls: [options.orderer_url],
				consenters: options.all_orderer_urls,
				protobuf: bin,
			};
			Log.info('Notify all channel members that channel was created:', JSON.stringify(signature_request, null, 2));
			const c_opts = {
				msp_id: options.org_msp_id,
				client_cert_b64pem: options.client_cert_b64pem,
				client_prv_key_b64pem: options.client_prv_key_b64pem,
				orderer_host: options.orderer_url,
				config_update: bin,
				config_update_signatures: [resp2],
			};

			const isOrdererSignatureNeeded =
				!_.isEmpty(options.block_params) ||
				!_.isEmpty(options.raft_params) ||
				!_.isEmpty(options.channel_capabilities) ||
				!_.isEmpty(options.orderer_capabilities) ||
				!_.isEmpty(options.consenters);

			if (!isOrdererSignatureNeeded) {
				let resp3;
				try {
					const submitConfigUpdate = promisify(window.stitch.submitConfigUpdate);
					resp3 = await submitConfigUpdate(c_opts);
					// send async event... don't wait
					EventsRestApi.sendCreateChannelEvent(options.channel_id, c_opts.msp_id);
				} catch (error) {
					Log.error(error);
					throw error;
				}
				Log.info('new channel signature resp:', resp3);
				let sig_resp;
				try {
					sig_resp = await SignatureRestApi.createRequest(signature_request);
					Log.info('new channel signature resp:', sig_resp);
					// 4. submit create channel protobuf
				} catch (error) {
					Log.error(error);
					throw error;
				}

				if (sig_resp) {
					let close_sig_resp;
					try {
						const signature_close_request = {
							tx_id: sig_resp.tx_id,
							client_cert_b64pem: options.client_cert_b64pem,
							client_prv_key_b64pem: options.client_prv_key_b64pem,
							msp_id: options.org_msp_id,
						};
						close_sig_resp = await SignatureRestApi.closeRequest(signature_close_request);
						return close_sig_resp;
					} catch (error) {
						Log.error(error);
						throw error;
					}
				}
			} else {
				try {
					const sig_resp = await SignatureRestApi.createRequest(signature_request);
					Log.info('new channel signature resp:', sig_resp);
					return { message: 'ok', isOrdererSignatureNeeded: true, resp: sig_resp };
				} catch (error) {
					Log.error(error);
					throw error;
				}
			}
		} else {
			// Request signature(only 1 required) from channel admins
			const signature_request = {
				channel_name: options.channel_id,
				number_of_signatures: n_out_of,
				originator: {
					msp_id: options.org_msp_id,
					client_cert_b64pem: options.client_cert_b64pem,
					client_prv_key_b64pem: options.client_prv_key_b64pem,
				},
				orgs: options.application_msps,
				orderers: options.orderer_msps, // needed to sign the request when updating block params
				ordererUrls: [options.orderer_url],
				consenters: options.all_orderer_urls,
				protobuf: bin,
			};
			Log.info('Requesting signature from channel admins for creating channel:', JSON.stringify(signature_request, null, 2));
			try {
				const resp3 = await SignatureRestApi.createRequest(signature_request);
				Log.info('new channel resp:', resp3);
				return resp3;
			} catch (err3) {
				Log.error(err3);
				throw err3;
			}
		}
	}

	static setCapability(node, channel_capabilities) {
		if (_.isEmpty(node.values)) {
			node.values = {};
			node.values.Capabilities = {};
			node.values.Capabilities.mod_policy = 'Admins';
			node.values.Capabilities.value = {};
			node.values.Capabilities.value.capabilities = {};
		}
		for (let i in channel_capabilities) {
			Log.debug('Injecting channel capability', channel_capabilities[i]);
			node.values.Capabilities.value.capabilities[channel_capabilities[i]] = {};
		}
	}

	static set20Type3Policies(node, policy, type) {
		if (_.isEmpty(node.policies)) {
			node.policies = {};
		}
		node.policies[policy] = {
			mod_policy: 'Admins',
			policy: {
				type: 3,
				value: {
					rule: type,
					sub_policy: 'Endorsement',
				},
			},
		};
	}

	static set20Type1Policies(node, policy, members, n) {
		if (_.isEmpty(node.policies)) {
			node.policies = {};
		}
		node.policies[policy] = {
			mod_policy: 'Admins',
			policy: {},
		};
		const identities = [];
		members.forEach(org => identities.push(this.getIdentity(org, 'PEER')));
		node.policies[policy].policy.type = 1;
		node.policies[policy].policy.value = {};
		node.policies[policy].policy.value.identities = identities;
		node.policies[policy].policy.value.rule = this.getOneOfPolicy(n, members.length);
	}
	static getOrdererAddresses(config) {
		let addresses = [];
		const orderer_grp = _.get(config, 'channel_group.groups_map.Orderer.groups_map');
		const l_orderers = _.get(config, 'channel_group.values_map.OrdererAddresses.value.addresses_list');
		addresses.push(...l_orderers);
		if (addresses.length === 0) {
			for (let ordererMSP in orderer_grp) {
				addresses.push(...orderer_grp[ordererMSP].values_map.Endpoints.value.addresses);
			}
		}
		return addresses;
	}

	static setBlockParameters(block_params, updated_json) {
		let absolute_max_bytes = block_params.absolute_max_bytes;
		if (absolute_max_bytes) {
			let calc_bytes = bytes.parse(absolute_max_bytes);
			if (calc_bytes > constants.ABSOLUTE_MAX_BYTES_MAX) {
				return 'Invalid \'absolute_max_bytes\' for block size';
			}
			_.set(updated_json, 'groups.Orderer.values.BatchSize.mod_policy', 'Admins');
			_.set(updated_json, 'groups.Orderer.values.BatchSize.value.absolute_max_bytes', calc_bytes);
		}

		let max_message_count = block_params.max_message_count;
		if (max_message_count) {
			if (max_message_count < constants.MAX_MESSAGE_COUNT_MIN || max_message_count > constants.MAX_MESSAGE_COUNT_MAX) {
				return 'Invalid \'max_message_count\' for block size';
			}
			_.set(updated_json, 'groups.Orderer.values.BatchSize.mod_policy', 'Admins');
			_.set(updated_json, 'groups.Orderer.values.BatchSize.value.max_message_count', max_message_count);
		}

		let preferred_max_bytes = block_params.preferred_max_bytes;
		if (preferred_max_bytes) {
			let calc_bytes = bytes.parse(preferred_max_bytes);
			if (calc_bytes < bytes(constants.PREFERRED_MAX_BYTES_MIN) || calc_bytes > bytes(constants.PREFERRED_MAX_BYTES_MAX)) {
				return 'Invalid \'preferred_max_bytes\' for block size';
			}
			_.set(updated_json, 'groups.Orderer.values.BatchSize.mod_policy', 'Admins');
			_.set(updated_json, 'groups.Orderer.values.BatchSize.value.preferred_max_bytes', calc_bytes);
		}

		let timeout = block_params.timeout;
		if (timeout) {
			const parse = require('parse-duration');
			let time_ms = parse(timeout);
			if (time_ms < parse(constants.TIMEOUT_MIN) || time_ms > parse(constants.TIMEOUT_MAX)) {
				return '\'BatchTimeout\' out of range';
			}
			_.set(updated_json, 'groups.Orderer.values.BatchTimeout.mod_policy', 'Admins');
			_.set(updated_json, 'groups.Orderer.values.BatchTimeout.value.timeout', timeout);
		}
		return null;
	}

	static setRaftParameters(raft_params, updated_json) {
		if (_.isEmpty(raft_params)) return;
		let snapshot_interval_size = raft_params.snapshot_interval_size;
		if (snapshot_interval_size) {
			let calc_bytes = bytes.parse(snapshot_interval_size);
			if (calc_bytes > constants.SNAPSHOT_INTERVAL_SIZE_MAX) {
				return 'Invalid \'snapshot interval size\'';
			}
			_.set(updated_json, 'groups.Orderer.values.ConsensusType.value.metadata.options.snapshot_interval_size', calc_bytes);
		}

		let election_tick = raft_params.election_tick;
		if (election_tick) {
			if (election_tick < constants.ELECTION_TICK_MIN || election_tick > constants.ELECTION_TICK_MAX) {
				return 'Invalid \'election tick\'';
			}
			_.set(updated_json, 'groups.Orderer.values.ConsensusType.value.metadata.options.election_tick', election_tick);
		}

		let heartbeat_tick = raft_params.heartbeat_tick;
		if (heartbeat_tick) {
			if (heartbeat_tick < constants.HEARTBEAT_TICK_MIN || heartbeat_tick > constants.HEARTBEAT_TICK_MAX) {
				return 'Invalid \'heartbeat tick\'';
			}
			_.set(updated_json, 'groups.Orderer.values.ConsensusType.value.metadata.options.heartbeat_tick', heartbeat_tick);
		}

		let max_inflight_blocks = raft_params.max_inflight_blocks;
		if (max_inflight_blocks) {
			if (max_inflight_blocks < constants.MAX_INFLIGHT_BLOCKS_MIN || max_inflight_blocks > constants.MAX_INFLIGHT_BLOCKS_MAX) {
				return 'Invalid \'max inflight blocks\'';
			}
			_.set(updated_json, 'groups.Orderer.values.ConsensusType.value.metadata.options.max_inflight_blocks', max_inflight_blocks);
		}

		let tick_interval = raft_params.tick_interval;
		if (tick_interval) {
			const parse = require('parse-duration');
			let time_ms = parse(tick_interval);
			if (time_ms < parse(constants.TICK_INTERVAL_MIN) || time_ms > parse(constants.TICK_INTERVAL_MAX)) {
				return '\'Tick Interval\' out of range';
			}
			_.set(updated_json, 'groups.Orderer.values.ConsensusType.value.metadata.options.tick_interval', tick_interval);
		}
		return null;
	}

	static setupACLs(app_node, acls) {
		app_node.values.ACLs = {};
		app_node.values.ACLs.modPolicy = 'Admins';
		app_node.values.ACLs.value = {};
		app_node.values.ACLs.value.acls = {};
		let acl_node = {};
		for (let acl in acls) {
			acl_node[acl] = {
				policy_ref: acls[acl],
			};
		}
		app_node.values.ACLs.value.acls = acl_node;
	}

	static setupConsenters(node, consenters) {
		if (_.isEmpty(consenters)) return;
		let formattedConsenters = consenters.map(consenter => {
			return {
				host: consenter.host,
				port: consenter.port,
				client_tls_cert: consenter.client_tls_cert,
				server_tls_cert: consenter.server_tls_cert,
			};
		});
		node.values.ConsensusType.value.metadata.consenters = formattedConsenters;
	}

	static setupOrdererAddresses(node, consenters) {
		if (_.isEmpty(consenters)) return;
		let ordererAddresses = [];
		consenters.forEach(consenter => {
			ordererAddresses.push(consenter.host + ':' + consenter.port);
		});
		node.values.OrdererAddresses.value.addresses = ordererAddresses;
	}

	static getNodeOUIdentifier(certificate) {
		let fabric_node_ous = {
			enable: true,
			admin_ou_identifier: {
				certificate,
				organizational_unit_identifier: 'admin',
			},
			client_ou_identifier: {
				certificate,
				organizational_unit_identifier: 'client',
			},
			orderer_ou_identifier: {
				certificate,
				organizational_unit_identifier: 'orderer',
			},
			peer_ou_identifier: {
				certificate,
				organizational_unit_identifier: 'peer',
			},
		};
		return fabric_node_ous;
	}

	static getRWA(members) {
		let readers = [];
		let writers = [];
		let admins = [];
		for (let org in members) {
			let member = members[org];
			for (let i in member.roles) {
				let role = member.roles[i];
				switch (role) {
					case 'reader':
						readers.push(this.getIdentity(org, 'MEMBER'));
						break;
					case 'writer':
						writers.push(this.getIdentity(org, 'MEMBER'));
						break;
					case 'admin':
						admins.push(this.getIdentity(org, 'ADMIN'));
						break;
					default:
						break;
				}
			}
		}
		return { readers, writers, admins };
	}

	static getIdentity(mspId, roleType) {
		let identity = {
			principal: {
				msp_identifier: mspId,
				role: roleType,
			},
		};
		if (roleType === 'ADMIN') {
			identity.principal.role = roleType;
		}
		return identity;
	}

	static setupPolicy(app_policies, members, n_out_of) {
		let { readers, writers, admins } = this.getRWA(members);

		app_policies.Readers.policy.value.identities = readers;
		app_policies.Writers.policy.value.identities = writers;
		app_policies.Admins.policy.value.identities = admins;

		app_policies.Readers.policy.value.rule = this.getOneOfPolicy(1, readers.length);
		app_policies.Writers.policy.value.rule = this.getOneOfPolicy(1, writers.length);
		app_policies.Admins.policy.value.rule = this.getOneOfPolicy(n_out_of, admins.length);

		app_policies.Admins.policy.type = 1;
		app_policies.Readers.policy.type = 1;
		app_policies.Writers.policy.type = 1;
	}

	static getOneOfPolicy(n, total) {
		let policies = [];
		if (n > total) n = total;
		for (let i = 0; i < total; ++i) {
			policies.push({ signed_by: i });
		}
		let policy = {
			n_out_of: {
				n: n,
				rules: policies,
			},
		};
		return policy;
	}

	/*
		const options = {
			channel_id: 'varad',
			msp_id: 'PeerOrg1',
			application_msp_ids: ['PeerOrg1'],
			configtxlator_url: 'http://varadvm2.rtp.raleigh.ibm.com:8083',
			orderer_host: 'http://varadvm2.rtp.raleigh.ibm.com:8081',
			client_cert_b64pem: 'cert',	// optional
			client_prv_key_b64pem: 'priv',	//optional
		};
	*/
	static async updateAppChannel(options) {
		let original_json;
		try {
			original_json = await ChannelApi.getChannelConfigJSON(options);
		} catch (error) {
			Log.error(error);
			throw error;
		}
		let updated_json = JSON.parse(JSON.stringify(original_json));

		for (let msp_id in options.updated_application_msps) {
			let msp_def = options.updated_application_msps[msp_id].msp_definition;
			if (_.has(msp_def, 'fabric_node_ous') && _.isEmpty(msp_def.fabric_node_ous)) {
				delete msp_def.fabric_node_ous;
			}
		}

		Log.debug('Original JSON:', original_json);
		let membersUpdated = false,
			ordererMspsUpdated = false,
			aclUpdated = false,
			policyUpdated = false,
			capabilitiesUpdated = false,
			chaincodePolicyUpdated = false,
			consenterUpdated = false;

		membersUpdated = this.hasMemberUpdates(options.existing_application_msps, options.updated_application_msps);
		ordererMspsUpdated = this.hasOrdererMspUpdates(options.existing_orderer_msps, options.updated_orderer_msps);

		// update the JSON with the new config
		updated_json = this.setGroups(updated_json, 'Application', options.existing_application_msps, options.updated_application_msps);
		updated_json = this.setGroups(updated_json, 'Orderer', options.existing_orderer_msps, options.updated_orderer_msps);

		// Update channel policy
		let n_out_of = options.n_out_of;

		// Validate
		let { admins } = this.getRWA(options.updated_application_msps);
		if (n_out_of && n_out_of > admins.length) {
			const error = String(`Incorrect explicit policy n_out_of ${n_out_of} > ${admins.length}`);
			Log.error(error);
			throw error;
		}

		// Set channel policy based on new set of members
		let app_policies = updated_json.channel_group.groups.Application.policies;
		this.setupPolicy(app_policies, options.updated_application_msps, n_out_of);

		// Set block parameters
		if (options.block_params) {
			let error = this.setBlockParameters(options.block_params, updated_json.channel_group);
			if (error) {
				Log.error(error);
				throw error;
			}
		}

		// Set raft parameters
		if (options.raft_params) {
			let error = this.setRaftParameters(options.raft_params, updated_json.channel_group);
			if (error) {
				Log.error(error);
				throw error;
			}
		}

		// Set channel capabilities
		if (options.channel_capabilities && options.channel_capabilities.length > 0) {
			capabilitiesUpdated = true;
			this.setCapability(updated_json.channel_group, options.channel_capabilities);
		}

		// Set application capabilities
		if (options.application_capabilities && options.application_capabilities.length > 0) {
			capabilitiesUpdated = true;
			this.setCapability(updated_json.channel_group.groups.Application, options.application_capabilities);
		}

		if (!_.isEmpty(options.lifecycle_policy) || !_.isEmpty(options.endorsement_policy)) {
			// make sure nodeou is enabled
			for (let msp_id in options.updated_application_msps) {
				let msp_def = options.updated_application_msps[msp_id].msp_definition;
				if (!_.has(msp_def, 'fabric_node_ous') || msp_def.fabric_node_ous.enable !== true) {
					const error = String(`Please make sure NodeOU is enabled for ${msp_id} before updating capability to 2.x`);
					Log.error(error);
					throw error;
				}
			}

			chaincodePolicyUpdated = true;
			// 2.0 channel, inject policies
			if (options.lifecycle_policy.type === 'SPECIFIC' && _.size(options.lifecycle_policy.members) !== 0) {
				this.set20Type1Policies(
					updated_json.channel_group.groups.Application,
					'LifecycleEndorsement',
					options.lifecycle_policy.members,
					options.lifecycle_policy.n
				);
			} else {
				this.set20Type3Policies(updated_json.channel_group.groups.Application, 'LifecycleEndorsement', options.lifecycle_policy.type || 'MAJORITY');
			}

			if (options.endorsement_policy.type === 'SPECIFIC' && _.size(options.endorsement_policy.members) !== 0) {
				this.set20Type1Policies(updated_json.channel_group.groups.Application, 'Endorsement', options.endorsement_policy.members, options.endorsement_policy.n);
			} else {
				this.set20Type3Policies(updated_json.channel_group.groups.Application, 'Endorsement', options.endorsement_policy.type || 'MAJORITY');
			}
		}

		// Set orderer capabilities
		if (options.orderer_capabilities && options.orderer_capabilities.length > 0) {
			this.setCapability(updated_json.channel_group.groups.Orderer, options.orderer_capabilities);
		}

		// Set ACLs
		let currentAcls = _.get(original_json, 'channel_group.groups.Application.values.ACLs.value.acls', {});
		let updatedAcls = {};
		for (let acl in options.acls) {
			updatedAcls[acl] = {
				policy_ref: options.acls[acl],
			};
		}
		if (!_.isEqual(currentAcls, updatedAcls)) {
			this.setupACLs(updated_json.channel_group.groups.Application, options.acls);
			aclUpdated = true;
		}

		// Set channel consenters
		if (!_.isEmpty(options.consenters)) {
			consenterUpdated = true;
			this.setupConsenters(updated_json.channel_group.groups.Orderer, options.consenters);
			this.setupOrdererAddresses(updated_json.channel_group, options.consenters);
		}

		// Current policy(Prior to the channel update)
		const policy = _.get(original_json, 'channel_group.groups.Application.policies.Admins.policy.value.rule.n_out_of');
		if (policy) {
			options.current_n_out_of = policy.n;
		}

		if (options.current_n_out_of !== options.n_out_of) {
			policyUpdated = true;
		}

		// NOTE: If any additional part of the channel config that is being modified needs a signature from the channel admins,
		//		 it needs to be added to the below check
		options.only_orderer_signature_required =
			!membersUpdated && !ordererMspsUpdated && !aclUpdated && !policyUpdated && !capabilitiesUpdated && !chaincodePolicyUpdated && !consenterUpdated;

		// JSON diff between current and new channel config
		let diff_details = {};
		try {
			diff_details = diff(original_json, updated_json);
		} catch (e) {
			Log.error('Error when calculating JSON diff', e);
		}
		let json_diff = {
			acl: {
				current: _.get(original_json, 'channel_group.groups.Application.values.ACLs.value.acls'),
				updated: _.get(updated_json, 'channel_group.groups.Application.values.ACLs.value.acls'),
			},
			policy: {
				current: {
					n: _.get(original_json, 'channel_group.groups.Application.policies.Admins.policy.value.rule.n_out_of.n'),
					outOf: _.get(original_json, 'channel_group.groups.Application.policies.Admins.policy.value.rule.n_out_of.rules')
						? _.get(original_json, 'channel_group.groups.Application.policies.Admins.policy.value.rule.n_out_of.rules').length
						: 0,
				},
				updated: {
					n: _.get(updated_json, 'channel_group.groups.Application.policies.Admins.policy.value.rule.n_out_of.n'),
					outOf: _.get(updated_json, 'channel_group.groups.Application.policies.Admins.policy.value.rule.n_out_of.rules')
						? _.get(updated_json, 'channel_group.groups.Application.policies.Admins.policy.value.rule.n_out_of.rules').length
						: 0,
				},
			},
			block_params: {
				current: {
					absolute_max_bytes: _.get(original_json, 'channel_group.groups.Orderer.values.BatchSize.value.absolute_max_bytes'),
					max_message_count: _.get(original_json, 'channel_group.groups.Orderer.values.BatchSize.value.max_message_count'),
					preferred_max_bytes: _.get(original_json, 'channel_group.groups.Orderer.values.BatchSize.value.preferred_max_bytes'),
					timeout: _.get(original_json, 'channel_group.groups.Orderer.values.BatchTimeout.value.timeout'),
				},
				updated: {
					absolute_max_bytes: _.get(updated_json, 'channel_group.groups.Orderer.values.BatchSize.value.absolute_max_bytes'),
					max_message_count: _.get(updated_json, 'channel_group.groups.Orderer.values.BatchSize.value.max_message_count'),
					preferred_max_bytes: _.get(updated_json, 'channel_group.groups.Orderer.values.BatchSize.value.preferred_max_bytes'),
					timeout: _.get(updated_json, 'channel_group.groups.Orderer.values.BatchTimeout.value.timeout'),
				},
			},
			raft_params: {
				current: {
					tick_interval: _.get(original_json, 'channel_group.groups.Orderer.values.ConsensusType.value.metadata.options.tick_interval'),
					election_tick: _.get(original_json, 'channel_group.groups.Orderer.values.ConsensusType.value.metadata.options.election_tick'),
					heartbeat_tick: _.get(original_json, 'channel_group.groups.Orderer.values.ConsensusType.value.metadata.options.heartbeat_tick'),
					max_inflight_blocks: _.get(original_json, 'channel_group.groups.Orderer.values.ConsensusType.value.metadata.options.max_inflight_blocks'),
					snapshot_interval_size: _.get(original_json, 'channel_group.groups.Orderer.values.ConsensusType.value.metadata.options.snapshot_interval_size'),
				},
				updated: {
					tick_interval: _.get(updated_json, 'channel_group.groups.Orderer.values.ConsensusType.value.metadata.options.tick_interval'),
					election_tick: _.get(updated_json, 'channel_group.groups.Orderer.values.ConsensusType.value.metadata.options.election_tick'),
					heartbeat_tick: _.get(updated_json, 'channel_group.groups.Orderer.values.ConsensusType.value.metadata.options.heartbeat_tick'),
					max_inflight_blocks: _.get(updated_json, 'channel_group.groups.Orderer.values.ConsensusType.value.metadata.options.max_inflight_blocks'),
					snapshot_interval_size: _.get(updated_json, 'channel_group.groups.Orderer.values.ConsensusType.value.metadata.options.snapshot_interval_size'),
				},
			},
			members: {
				current: _.get(original_json, 'channel_group.groups.Application.policies'),
				updated: _.get(updated_json, 'channel_group.groups.Application.policies'),
			},
			orderer_msps: {
				current: _.get(original_json, 'channel_group.groups.Orderer.groups'),
				updated: _.get(updated_json, 'channel_group.groups.Orderer.groups'),
			},
			capabilities: {
				current: {
					channel: _.get(original_json, 'channel_group.values.Capabilities.value.capabilities', {}),
					orderer: _.get(original_json, 'channel_group.groups.Orderer.values.Capabilities.value.capabilities', {}),
					application: _.get(original_json, 'channel_group.groups.Application.values.Capabilities.value.capabilities', {}),
				},
				updated: {
					channel: _.get(updated_json, 'channel_group.values.Capabilities.value.capabilities', {}),
					orderer: _.get(updated_json, 'channel_group.groups.Orderer.values.Capabilities.value.capabilities', {}),
					application: _.get(updated_json, 'channel_group.groups.Application.values.Capabilities.value.capabilities', {}),
				},
			},
			consenters: {
				current: _.get(original_json, 'channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters'),
				updated: _.get(updated_json, 'channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters'),
			},
			detail: diff_details,
		};
		Log.info('JSON diff:', JSON.stringify(json_diff, null, 2));
		Log.info('Updated JSON:', JSON.stringify(updated_json, null, 2));
		options.original_json = original_json;
		options.updated_json = updated_json;
		options.org_msp_id = options.msp_id;
		options.json_diff = json_diff;

		await ChannelApi.updateChannel(options, true);
		return { message: 'ok' };
	}

	static hasMemberUpdates(existing_members, updated_members) {
		let membersUpdated = false;

		// Check if member added/removed
		let removed_msp_ids = [];
		let added_msp_ids = [];
		let existing_msp_ids = Object.keys(existing_members);
		let updated_msp_ids = Object.keys(updated_members);
		existing_msp_ids.forEach(msp => {
			if (!updated_msp_ids.includes(msp)) {
				removed_msp_ids.push(msp);
			}
		});
		updated_msp_ids.forEach(msp => {
			if (!existing_msp_ids.includes(msp)) {
				added_msp_ids.push(msp);
			}
		});
		if (!_.isEmpty(added_msp_ids) || !_.isEmpty(removed_msp_ids)) {
			membersUpdated = true;
		}

		// Check if member role was modified
		let current = this.getRWA(existing_members);
		const current_readers = current.readers.map(x => x.principal.msp_identifier);
		const current_writers = current.writers.map(x => x.principal.msp_identifier);
		const current_admins = current.admins.map(x => x.principal.msp_identifier);

		let updated = this.getRWA(updated_members);
		const updated_readers = updated.readers.map(x => x.principal.msp_identifier);
		const updated_writers = updated.writers.map(x => x.principal.msp_identifier);
		const updated_admins = updated.admins.map(x => x.principal.msp_identifier);

		if (
			_.xor(current_readers, updated_readers).length > 0 ||
			_.xor(current_writers, updated_writers).length > 0 ||
			_.xor(current_admins, updated_admins).length > 0
		) {
			membersUpdated = true;
		}

		return membersUpdated;
	}

	static hasOrdererMspUpdates(existing_orderer_msps, updated_orderer_msps) {
		let updated = false;
		if (existing_orderer_msps && updated_orderer_msps) {
			const existing_msp_ids = Object.keys(existing_orderer_msps);
			const updated_msp_ids = Object.keys(updated_orderer_msps);
			if (existing_msp_ids.length !== updated_msp_ids.length) {
				updated = true;
			} else {
				existing_msp_ids.forEach(msp_id => {
					if (!updated_orderer_msps[msp_id]) {
						updated = true;
					}
				});
			}
		}
		return updated;
	}

	static async getChannelConfigJSON(options) {
		options.include_bin = true;
		let ch_config_resp;
		let block_json;
		try {
			ch_config_resp = await StitchApi.getChannelConfigWithRetry(options);
		} catch (error) {
			try {
				let orderers = await OrdererRestApi.getOrderersFromCluster(options.orderer_host);
				ch_config_resp = await StitchApi.getChannelConfigWithRetry(options, orderers);
			} catch (e) {
				Log.error(error);
				throw error;
			}
		}
		// decode block
		try {
			const _block_binary2json = promisify(ChannelApi._block_binary2json);
			block_json = await _block_binary2json(ch_config_resp.grpc_message, options.configtxlator_url);
		} catch (error) {
			Log.error(error);
			throw error;
		}
		return block_json.data.data[0].payload.data.config;
	}
	/*
		const options = {
			channel_id: 'testch',
			msp_id: 'PeerOrg1',
			configtxlator_url: 'http://varadvm2.rtp.raleigh.ibm.com:8083',
			orderer_host: 'http://varadvm2.rtp.raleigh.ibm.com:8081',
			client_cert_b64pem: 'cert',
			client_prv_key_b64pem: 'priv',
			anchor_peers: ['169.46.223.25:31419'],
		};
	*/
	static async addChannelAnchorPeers(opts) {
		let options = {
			channel_id: opts.channel_id,
			msp_id: opts.msp_id,
			configtxlator_url: opts.configtxlator_url,
			orderer_host: opts.orderer_host,
			client_cert_b64pem: opts.client_cert_b64pem,
			client_prv_key_b64pem: opts.client_prv_key_b64pem,
		};
		let original_json;
		try {
			original_json = await ChannelApi.getChannelConfigJSON(options);
		} catch (error) {
			Log.error(error);
			throw error;
		}
		let updated_json = JSON.parse(JSON.stringify(original_json));

		const msp_id = opts.msp_id;

		if (!updated_json.channel_group.groups.Application.groups[msp_id].values.AnchorPeers) {
			updated_json.channel_group.groups.Application.groups[msp_id].values.AnchorPeers = {};
			updated_json.channel_group.groups.Application.groups[msp_id].values.AnchorPeers.value = {};
			updated_json.channel_group.groups.Application.groups[msp_id].values.AnchorPeers.value.anchor_peers = [];
			updated_json.channel_group.groups.Application.groups[msp_id].values.AnchorPeers.mod_policy = 'Admins';
		}
		const value_obj = updated_json.channel_group.groups.Application.groups[msp_id].values.AnchorPeers.value;
		const anchorPeers = value_obj ? value_obj.anchor_peers : null;

		const existingAnchorUrls = [];
		for (let i in anchorPeers) {
			existingAnchorUrls.push(anchorPeers[i].host + ':' + anchorPeers[i].port);
		}
		const newAnchorUrls = JSON.parse(JSON.stringify(existingAnchorUrls));
		for (let i in opts.anchor_peers) {
			if (!newAnchorUrls.includes(opts.anchor_peers[i])) newAnchorUrls.push(opts.anchor_peers[i]);
		}

		const formated = this.format_anchor_peers(newAnchorUrls);
		updated_json.channel_group.groups.Application.groups[msp_id].values.AnchorPeers.value = { anchor_peers: formated };
		Log.debug('Final anchor peers, formatted:', formated, formated.length);

		Log.debug('Updated JSON:', updated_json);
		options.original_json = original_json;
		options.updated_json = updated_json;
		options.org_msp_id = options.msp_id;

		Log.debug('Updated Anchor peers request:', options);
		await ChannelApi.updateChannel(options, false);
		return { message: 'ok' };
	}

	/*
		const options = {
			channel_id: 'testch',
			msp_id: 'PeerOrg1',
			configtxlator_url: 'http://varadvm2.rtp.raleigh.ibm.com:8083',
			orderer_host: 'http://varadvm2.rtp.raleigh.ibm.com:8081',
			client_cert_b64pem: 'cert',
			client_prv_key_b64pem: 'priv',
			anchor_peer: {host:169.46.223.25, port:31419},
		};
	*/
	static async deleteChannelAnchorPeers(opts) {
		let options = {
			channel_id: opts.channel_id,
			msp_id: opts.msp_id,
			configtxlator_url: opts.configtxlator_url,
			orderer_host: opts.orderer_host,
			client_cert_b64pem: opts.client_cert_b64pem,
			client_prv_key_b64pem: opts.client_prv_key_b64pem,
		};
		let original_json;
		try {
			original_json = await ChannelApi.getChannelConfigJSON(options);
		} catch (error) {
			Log.error(error);
			throw error;
		}
		let updated_json = JSON.parse(JSON.stringify(original_json));

		const msp_id = opts.msp_id;
		const value_obj = updated_json.channel_group.groups.Application.groups[msp_id].values.AnchorPeers.value;
		const currentAnchorPeers = value_obj ? value_obj.anchor_peers : [];
		const updatedAnchorUrls = [];
		currentAnchorPeers.forEach(current => {
			let isDeleted = opts.anchor_peer.host === current.host && current.port === opts.anchor_peer.port;
			if (!isDeleted) {
				updatedAnchorUrls.push(current.host + ':' + current.port);
			}
		});
		const formated = this.format_anchor_peers(updatedAnchorUrls);
		updated_json.channel_group.groups.Application.groups[msp_id].values.AnchorPeers.value = { anchor_peers: formated };
		Log.debug('Final anchor peers, formatted:', formated, formated.length);

		Log.debug('Updated JSON:', updated_json);
		options.original_json = original_json;
		options.updated_json = updated_json;
		options.org_msp_id = options.msp_id;

		Log.debug('Delete Anchor peers request:', options);
		await ChannelApi.updateChannel(options, false);
		return { message: 'ok' };
	}

	static format_anchor_peers(peer_urls_array) {
		const anchor_peers = [];
		for (let i in peer_urls_array) {
			if (peer_urls_array[i].indexOf('://') === -1) {
				peer_urls_array[i] = 'grpcs://' + peer_urls_array[i]; // add dummy proto if dne, will be stripped out below anyway
			}
			let url_parts = url.parse(peer_urls_array[i], true);
			if (url_parts.hostname && !isNaN(url_parts.port) && parseInt(url_parts.port) !== 0) {
				// double check we are adding a valid entry...
				let anchor_peer_obj = {
					host: url_parts.hostname,
					port: parseInt(url_parts.port),
				};
				anchor_peers.push(anchor_peer_obj);
			}
		}
		return anchor_peers;
	}

	static async modifyConsenters(opts) {
		let options = {
			channel_id: opts.channel_id,
			msp_id: opts.peerCerts.msp_id,
			org_msp_id: opts.peerCerts.msp_id,
			orderer_host: opts.orderer_host,
			client_cert_b64pem: opts.peerCerts.client_cert_b64pem,
			client_prv_key_b64pem: opts.peerCerts.client_prv_key_b64pem,
			configtxlator_url: opts.configtxlator_url,
			orderer_msps: opts.orderer_msps,
			isModifyingConsenter: true,
			only_orderer_signature_required: true,
		};
		let original_json;
		try {
			original_json = await ChannelApi.getChannelConfigJSON(options);
		} catch (error) {
			Log.error(error);
			throw error;
		}
		let updated_json = JSON.parse(JSON.stringify(original_json));

		let parsedURL = urlParser.parse(opts.consenter_url);
		const host = parsedURL.hostname;
		const port = parsedURL.port;

		let consenterNodes = updated_json.channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters;
		let ordererAddresses = updated_json.channel_group.values.OrdererAddresses.value.addresses;

		if (opts.mode === 'delete') {
			ChannelApi.deleteConsenters(consenterNodes, ordererAddresses, host, port);
		} else if (opts.mode === 'update') {
			ChannelApi.updateConsenterCerts(consenterNodes, opts.tls_new_cert, host, port);
		}

		let diff_details = {};
		try {
			diff_details = diff(original_json, updated_json);
		} catch (e) {
			Log.error('Error when calculating JSON diff', e);
		}
		let json_diff = {
			consenters: {
				current: _.get(original_json, 'channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters'),
				updated: _.get(updated_json, 'channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters'),
				mode: opts.mode,
			},
			detail: diff_details,
		};
		Log.info('JSON diff:', JSON.stringify(json_diff.consenters, null, 2));
		Log.info('Updated JSON:', JSON.stringify(updated_json, null, 2));

		options.json_diff = json_diff;
		options.original_json = original_json;
		options.updated_json = updated_json;
		options.org_msp_id = options.msp_id;

		Log.debug('Modify consenter request:', options);
		await ChannelApi.updateChannel(options, true);
		return { message: 'ok' };
	}

	static async deleteConsenters(consenterNodes, ordererAddresses, host, port) {
		_.remove(consenterNodes, consenter => {
			return consenter.host === host && Number(consenter.port) === Number(port);
		});
		_.remove(ordererAddresses, address => {
			return address === host + ':' + port;
		});
	}

	static async updateConsenterCerts(consenterNodes, tls_new_cert, host, port) {
		const nodeToBeUpdated = _.find(consenterNodes, consenter => {
			return consenter.host === host && Number(consenter.port) === Number(port);
		});
		nodeToBeUpdated.client_tls_cert = tls_new_cert;
		nodeToBeUpdated.server_tls_cert = tls_new_cert;
	}

	static setGroups(updated_json, targetGroup, existing_members, updated_members) {
		let removed_msp_ids = [];
		let added_msp_ids = [];
		let existing_msp_ids = Object.keys(existing_members);
		let updated_msp_ids = Object.keys(updated_members);

		existing_msp_ids.forEach(msp => {
			if (!updated_msp_ids.includes(msp)) {
				removed_msp_ids.push(msp);
			}
		});

		updated_msp_ids.forEach(msp => {
			if (!existing_msp_ids.includes(msp)) {
				added_msp_ids.push(msp);
			}
		});

		let i_app_groups = updated_json.channel_group.groups[targetGroup].groups;
		added_msp_ids.forEach(msp => {
			let template_msp = JSON.parse(JSON.stringify(org_template));
			template_msp.policies.Admins.policy.value.identities[0].principal.msp_identifier = msp;
			template_msp.policies.Readers.policy.value.identities[0].principal.msp_identifier = msp;
			template_msp.policies.Writers.policy.value.identities[0].principal.msp_identifier = msp;
			template_msp.policies.Endorsement.policy.value.identities[0].principal.msp_identifier = msp;
			let msp_definition = updated_members[msp].msp_definition;
			msp_definition.name = msp_definition.msp_id;
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

			template_msp.values.MSP.value.config = {
				...template_msp.values.MSP.value.config,
				...msp_definition,
			};

			i_app_groups[msp] = template_msp;
		});
		removed_msp_ids.forEach(msp => {
			delete i_app_groups[msp];
		});
		updated_json.channel_group.groups[targetGroup].groups = i_app_groups;
		return updated_json;
	}

	/*
			// Genetic API to update a channel
			const options = {
				configtxlator: 'url',
				channel_id: options.channel_id,
				org_msp_id: options.org_msp_id,
				original_json: {},
				updated_json: {},
				client_cert_b64pem: 'client_cert_b64pem',	// optional
				client_prv_key_b64pem: 'client_prv_key_b64pem,	//optional
			};
	*/
	static async updateChannel(options, isSignatureRequestNeeded) {
		// 1. calculate update
		let bin;
		try {
			const _calculateUpdate = promisify(ChannelApi._calculateUpdate);
			bin = await _calculateUpdate(options);
		} catch (error) {
			Log.error(error);
			throw error;
		}

		// If updater identity was provided, sign request
		if (options.client_cert_b64pem && options.client_prv_key_b64pem && options.isAdmin !== false) {
			// 2.sign channel update protobuf
			const s_opts = {
				client_cert_b64pem: options.client_cert_b64pem,
				client_prv_key_b64pem: options.client_prv_key_b64pem,
				protobuf: bin,
				msp_id: options.org_msp_id,
			};

			let signature;
			try {
				const signConfigUpdate = promisify(window.stitch.signConfigUpdate);
				signature = await signConfigUpdate(s_opts);
			} catch (error) {
				Log.error(error);
				throw error;
			}
			if (isSignatureRequestNeeded) {
				let resp;
				try {
					resp = await ChannelApi.createSignatureRequest(options, signature, bin);
				} catch (error) {
					Log.error('An error occurred when creating signature request:', error);
					throw error;
				}
				const isOrdererSignatureNeeded =
					!_.isEmpty(options.block_params) ||
					!_.isEmpty(options.raft_params) ||
					!_.isEmpty(options.channel_capabilities) ||
					!_.isEmpty(options.orderer_capabilities) ||
					!_.isEmpty(options.consenters) ||
					this.hasOrdererMspUpdates(options.existing_orderer_msps, options.updated_orderer_msps) ||
					options.isOrdererMSPUpdate ||
					options.isModifyingConsenter;
				if (options.current_n_out_of === 1 && !isOrdererSignatureNeeded) {
					// If only 1 admin needs to sign, go ahead and submit the channel config
					let identity = {
						cert: options.client_cert_b64pem,
						private_key: options.client_prv_key_b64pem,
					};

					try {
						const resp3 = await SignatureRestApi.submitRequest(resp, { msp_id: options.org_msp_id }, identity);
						Log.info('Request signed and submitted by channel updator:', resp3);
						return { message: 'ok' };
					} catch (err3) {
						Log.error('An error occurred when submitting update channel request:', err3);

						try {
							const resp4 = await SignatureRestApi.deleteRequest({ ...resp, client_prv_key_b64pem: options.client_prv_key_b64pem });
							Log.info('Notification was deleted as submit config update failed', resp4);
						} catch (err4) {
							Log.error('An error occurred when deleting the notification:', err4);
						}
						throw err3;
					}
				} else {
					Log.info('Request signed by channel updater, and signature request sent to other admins', resp);
					return resp;
				}
			} else {
				// 3. submit channel update protobuf
				const c_opts = {
					msp_id: options.org_msp_id,
					client_cert_b64pem: options.client_cert_b64pem,
					client_prv_key_b64pem: options.client_prv_key_b64pem,
					orderer_host: options.orderer_host,
					config_update: bin,
					config_update_signatures: [signature],
				};
				try {
					let orderers = await OrdererRestApi.getOrdererDetails(options.cluster_id || options.currentOrdererId || options.ordererId);
					orderers = orderers.raft ? orderers.raft : [orderers];
					const resp3 = await StitchApi.submitWithRetry(c_opts, orderers);
					// send async event... don't wait
					EventsRestApi.sendUpdateChannelEvent(options.channel_id, c_opts.msp_id);
					Log.info('Update channel resp:', resp3, resp3.data);
					return resp3.data;
				} catch (error) {
					Log.error(error);
					throw error;
				}
			}
		} else {
			// Request signature from required channel admins
			try {
				const resp = await ChannelApi.createSignatureRequest(options, null, bin);
				Log.info('No signatures found, requesting signature from channel admins: ', resp);
				return resp;
			} catch (error) {
				Log.error('An error occurred when requesting signature from channel admins: ', error);
				throw error;
			}
		}
	}

	static async createSignatureRequest(options, signature, bin) {
		const signature_request = {
			channel_name: options.channel_id,
			number_of_signatures: options.only_orderer_signature_required ? 1 : options.current_n_out_of,
			originator: {
				msp_id: options.org_msp_id,
				client_cert_b64pem: options.client_cert_b64pem,
				client_prv_key_b64pem: options.client_prv_key_b64pem,
				signature: signature,
			},
			orgs: options.existing_application_msps,
			orderers: options.orderer_msps, // needed to sign the request when updating block params
			ordererUrls: [options.orderer_host],
			protobuf: bin,
			json_diff: options.json_diff,
		};
		Log.info('Requesting signature from channel admins for updating channel:', JSON.stringify(signature_request, null, 2));
		try {
			const resp = await SignatureRestApi.createRequest(signature_request);
			Log.debug('Create signature resp:', resp);
			return resp;
		} catch (error) {
			Log.error(error);
			throw error && error.msgs ? { message: error.msgs, statusCode: error.statusCode } : error;
		}
	}

	/*
		const options = {
			channel_id: 'varad',
			msp_id: 'PeerOrg1',
			configtxlator_url: 'http://varadvm2.rtp.raleigh.ibm.com:8083',
			orderer_host: 'http://varadvm2.rtp.raleigh.ibm.com:8081',
			client_cert_b64pem: 'cert',
			client_prv_key_b64pem: 'priv',
			payload: {new_msp_definition}
		};
	*/
	static async updateChannelMSPDefinition(options, isOrdererMSPUpdate, ordererAdmin) {
		let original_json;
		try {
			original_json = await ChannelApi.getChannelConfigJSON(options);
		} catch (error) {
			Log.error(error);
			throw error;
		}
		let updated_json = JSON.parse(JSON.stringify(original_json));

		let msp_definition = options.payload;
		msp_definition.name = msp_definition.msp_id;
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

		Log.debug('Original channel config:', original_json);
		let isSystemChannel = options.channel_id === OrdererRestApi.systemChannel;
		let groups = {};
		if (isSystemChannel && ordererAdmin) {
			let orderer = updated_json.channel_group.groups.Orderer;
			if (orderer && !orderer.groups) {
				orderer.groups = {};
			}
			groups = updated_json.channel_group.groups.Orderer.groups;
			let msp = _.get(groups, options.payload.msp_id, null);
			msp.values.MSP.value.config = {
				...msp_definition,
			};
			groups[options.payload.msp_id] = msp;
		} else {
			// application channel
			if (!isOrdererMSPUpdate) {
				let msp = _.get(updated_json.channel_group.groups.Application.groups, options.payload.msp_id, null);
				msp.values.MSP.value.config = {
					...msp_definition,
				};
				let application = updated_json.channel_group.groups.Application;
				if (application && !application.groups) {
					application.groups = {};
				}
				updated_json.channel_group.groups.Application.groups[options.payload.msp_id] = msp;
			} else {
				Log.debug('Updating the Orderer MSP definition:');
				let msp = _.get(updated_json.channel_group.groups.Orderer.groups, options.payload.msp_id, null);
				msp.values.MSP.value.config = {
					...msp_definition,
				};
				let orderer = updated_json.channel_group.groups.Orderer;
				if (orderer && !orderer.groups) {
					orderer.groups = {};
				}
				updated_json.channel_group.groups.Orderer.groups[options.payload.msp_id] = msp;

				options.orderer_msps = [
					{
						msp_id: options.payload.msp_id,
						admins: options.payload.admins,
						host_url: options.host_url,
					},
				];
				let original_def = _.get(original_json.channel_group.groups.Orderer.groups, options.payload.msp_id, null);
				let updated_def = _.get(updated_json.channel_group.groups.Orderer.groups, options.payload.msp_id, null);
				let json_diff = {
					msp: {
						current: {
							display_name: _.get(original_def, 'values.MSP.value.config.display_name'),
							root_certs: _.get(original_def, 'values.MSP.value.config.root_certs'),
							admins: _.get(original_def, 'values.MSP.value.config.admins'),
							intermediate_certs: _.get(original_def, 'values.MSP.value.config.intermediate_certs'),
							tls_root_certs: _.get(original_def, 'values.MSP.value.config.tls_root_certs'),
							tls_intermediate_certs: _.get(original_def, 'values.MSP.value.config.tls_intermediate_certs'),
							organizational_unit_identifiers: _.get(original_def, 'values.MSP.value.config.organizational_unit_identifiers'),
							fabric_node_ous: _.get(original_def, 'values.MSP.value.config.fabric_node_ous'),
							revocation_list: _.get(original_def, 'values.MSP.value.config.revocation_list'),
						},
						updated: {
							display_name: _.get(updated_def, 'values.MSP.value.config.display_name'),
							root_certs: _.get(updated_def, 'values.MSP.value.config.root_certs'),
							admins: _.get(updated_def, 'values.MSP.value.config.admins'),
							intermediate_certs: _.get(updated_def, 'values.MSP.value.config.intermediate_certs'),
							tls_root_certs: _.get(updated_def, 'values.MSP.value.config.tls_root_certs'),
							tls_intermediate_certs: _.get(updated_def, 'values.MSP.value.config.tls_intermediate_certs'),
							organizational_unit_identifiers: _.get(updated_def, 'values.MSP.value.config.organizational_unit_identifiers'),
							fabric_node_ous: _.get(updated_def, 'values.MSP.value.config.fabric_node_ous'),
							revocation_list: _.get(updated_def, 'values.MSP.value.config.revocation_list'),
						},
					},
				};
				options.json_diff = json_diff;
				options.isOrdererMSPUpdate = true;
				options.only_orderer_signature_required = true;
			}
		}
		Log.debug('Updated channel config:', updated_json);

		options.original_json = original_json;
		options.updated_json = updated_json;
		options.org_msp_id = options.msp_id;

		const resp = await ChannelApi.updateChannel(options, isOrdererMSPUpdate);
		Log.info('MSP definition updated successfully ', resp);
		return { message: 'ok' };
	}

	static async getInstantiatedChaincode(channelId, id) {
		const peer = await PeerRestApi.getPeerDetails(id, true);
		const msp_id = peer.msp_id;
		const private_key = peer.private_key;
		const cert = peer.cert;
		const url = peer.url2use;

		const opts = {
			msp_id: msp_id,
			client_cert_b64pem: cert,
			client_prv_key_b64pem: private_key,
			host: url,
			channel_id: channelId,
		};
		const certAvailable = Helper.isCertAvailable(opts);
		if (!certAvailable) {
			throw Object({ message_key: 'missing_cert' });
		}
		try {
			const getInstantiatedChaincode = promisify(window.stitch.getInstantiatedChaincode);
			return (await getInstantiatedChaincode(opts)).data;
		} catch (error) {
			Log.error(error);
			throw error;
		}
	}

	static async getChannelConfig(peerId, channel_id) {
		const peer = await PeerRestApi.getPeerDetails(peerId, true);
		const opts = {
			msp_id: peer.msp_id,
			client_cert_b64pem: peer.cert,
			client_prv_key_b64pem: peer.private_key,
			host: peer.url2use,
			channel_id: channel_id,
		};

		let resp;
		try {
			const getChannelConfigFromPeer = promisify(window.stitch.getChannelConfigFromPeer);
			resp = await getChannelConfigFromPeer(opts);
		} catch (error) {
			Log.error(error);
			throw error;
		}
		return resp.data.block.data.data_list[0].envelope.payload.data;
	}

	static async getChaincodeDetailsFromPeer(peerId, orderer_host, channel_id, chaincode_id) {
		let peer;
		try {
			peer = await PeerRestApi.getPeerDetails(peerId, true);
		} catch (error) {
			Log.error('An error occurred when getting peer details:', error);
			throw error;
		}
		const opts = {
			msp_id: peer.msp_id,
			client_cert_b64pem: peer.cert,
			client_prv_key_b64pem: peer.private_key,
			host: peer.url2use,
			orderer_host,
			channel_id,
			chaincode_id,
		};

		let resp;
		try {
			const getChaincodeDetailsFromPeer = promisify(window.stitch.getChaincodeDetailsFromPeer);
			resp = await getChaincodeDetailsFromPeer(opts);
			if (resp.error) throw resp.error;
		} catch (error) {
			Log.error('An error occurred when getting chaincode details:', error, resp);
			throw error;
		}
		return resp.data;
	}

	/*
	opts = {
			orderer_host: opts.orderer_url,
			channel_id: opts.channel_id,
			chaincode_id: opts.chaincode_id,
			chaincode_version: opts.chaincode_version,
			chaincode_args: opts.chaincode_args,
			endorsement_policy: opts.endorsement_policy,
			proposal_type: opts.proposal_type
	}
	*/
	static async instantiateChaincode(opts) {
		const peer = await PeerRestApi.getPeerDetails(opts.peerId, true);
		//proposal_type: deploy|upgrade
		const instantiate_opts = {
			msp_id: peer.msp_id,
			client_cert_b64pem: peer.cert,
			client_prv_key_b64pem: peer.private_key,
			host: peer.url2use,
			orderer_host: opts.orderer_url,
			channel_id: opts.channel_id,
			chaincode_id: opts.chaincode_id,
			chaincode_version: opts.chaincode_version,
			chaincode_type: 'golang',
			chaincode_args: opts.chaincode_args,
			endorsement_policy: opts.endorsement_policy,
			static_collection_configs: opts.static_collection_configs,
			proposal_type: opts.proposal_type,
		};
		if (opts.chaincode_function) {
			instantiate_opts.chaincode_function = opts.chaincode_function;
		}
		if (opts.proposal_type === 'deploy') {
			Log.debug('Sending request to instantiate chaincode', instantiate_opts);
			try {
				const instantiateChaincode = promisify(window.stitch.instantiateChaincode);
				return await instantiateChaincode(instantiate_opts);
			} catch (error) {
				Log.error(error);
				throw error;
			}
		} else {
			Log.debug('Sending request to upgrade chaincode', instantiate_opts);
			try {
				const upgradeChaincode = promisify(window.stitch.upgradeChaincode);
				return await upgradeChaincode(instantiate_opts);
			} catch (error) {
				Log.error(error);
				throw error;
			}
		}
	}

	static async getChannelBlock(peerId, channel_id, block_number) {
		const peer = await PeerRestApi.getPeerDetails(peerId, true);
		const opts = {
			msp_id: peer.msp_id,
			client_cert_b64pem: peer.cert,
			client_prv_key_b64pem: peer.private_key,
			host: peer.url2use,
			channel_id,
			block_number: block_number,
		};
		try {
			const getChannelBlockFromPeer = promisify(window.stitch.getChannelBlockFromPeer);
			return (await getChannelBlockFromPeer(opts)).data.block;
		} catch (error) {
			Log.error(error);
			throw error;
		}
	}

	static _config_json2binary(json, configtxlator, cb) {
		fetch(configtxlator + '/protolator/encode/common.Config', {
			method: 'POST',
			body: JSON.stringify(json),
		})
			.then(res => res.blob())
			.then(response => {
				if (response.type === 'text/plain') {
					//error response
					const reader = new FileReader();
					reader.addEventListener('loadend', e => {
						const error_txt = e.srcElement.result;
						cb(error_txt, null);
					});
					reader.readAsText(response);
				} else {
					cb(null, response);
					// const reader = new FileReader();
					// reader.addEventListener('loadend', e => {
					// 	const array = e.srcElement.result;
					// 	cb(null, new Uint8Array(array));
					// });
					// reader.readAsArrayBuffer(response);
				}
			})
			.catch(error => cb(error, null));
	}

	static _config_binary2json(proto, configtxlator, cb) {
		fetch(configtxlator + '/protolator/decode/common.Config', {
			method: 'POST',
			body: proto,
		})
			.then(res => res.json())
			.then(response => cb(null, response))
			.catch(error => cb(error, null));
	}

	static _block_json2binary(json, configtxlator, cb) {
		fetch(configtxlator + '/protolator/encode/common.Block', {
			method: 'POST',
			body: JSON.stringify(json),
		})
			.then(res => res.blob())
			.then(response => {
				if (response.type === 'text/plain') {
					//error response
					const reader = new FileReader();
					reader.addEventListener('loadend', e => {
						const error_txt = e.srcElement.result;
						cb(error_txt, null);
					});
					reader.readAsText(response);
				} else {
					const reader = new FileReader();
					reader.addEventListener('loadend', e => {
						const array = e.srcElement.result;
						cb(null, new Uint8Array(array));
					});
					reader.readAsArrayBuffer(response);
				}
			})
			.catch(error => cb(error, null));
	}

	static _block_binary2json(proto, configtxlator, cb) {
		fetch(configtxlator + '/protolator/decode/common.Block', {
			method: 'POST',
			body: proto,
		})
			.then(res => res.json())
			.then(response => cb(null, response))
			.catch(error => {
				error.source = 'configtxlator';
				error.message_key = 'error_block_decode';
				return cb(error, null);
			});
	}

	static _encodeConfigUpdate(json, configtxlator, cb) {
		fetch(configtxlator + '/protolator/encode/common.ConfigUpdate', {
			method: 'POST',
			mode: 'cors',
			credentials: 'same-origin',
			body: JSON.stringify(json),
		})
			.then(res => res.blob())
			.then(response => {
				if (response.type === 'text/plain') {
					//error response
					const reader = new FileReader();
					reader.addEventListener('loadend', e => {
						const error_txt = e.srcElement.result;
						cb(error_txt, null);
					});
					reader.readAsText(response);
				} else {
					const reader = new FileReader();
					reader.addEventListener('loadend', e => {
						const array = e.srcElement.result;
						cb(null, new Uint8Array(array));
					});
					reader.readAsArrayBuffer(response);
				}
			})
			.catch(error => cb(error, null));
	}

	static _decodeConfigUpdate(proto, configtxlator, cb) {
		fetch(configtxlator + '/protolator/decode/common.ConfigUpdate', {
			method: 'POST',
			mode: 'cors',
			credentials: 'same-origin',
			body: proto,
		})
			.then(res => res.json())
			.then(response => cb(null, response))
			.catch(error => cb(error, null));
	}

	static _calculateUpdate(opts, cb) {
		ChannelApi._config_json2binary(opts.original_json, opts.configtxlator_url, (err1, original_proto) => {
			if (err1 || !original_proto) {
				Log.error(err1);
				cb(err1, null);
			} else {
				ChannelApi._config_json2binary(opts.updated_json, opts.configtxlator_url, (err2, updated_proto) => {
					if (err2 || !updated_proto) {
						Log.error(err2);
						cb(err2, null);
					} else {
						let formData = new FormData();
						formData.append('channel', opts.channel_id);
						formData.append('original', original_proto, 'original.pb');
						formData.append('updated', updated_proto, 'updated_proto.pb');
						fetch(opts.configtxlator_url + '/configtxlator/compute/update-from-configs', {
							method: 'POST',
							body: formData,
							mode: 'cors',
							cache: 'no-cache',
							credentials: 'same-origin',
							redirect: 'follow',
							referrer: 'no-referrer',
							encoding: null,
						})
							.then(res => res.blob())
							.then(response => {
								if (response.type === 'text/plain') {
									//error response
									const reader = new FileReader();
									reader.addEventListener('loadend', e => {
										const error_txt = e.srcElement.result;
										cb(error_txt, null);
									});
									reader.readAsText(response);
								} else {
									const reader = new FileReader();
									reader.addEventListener('loadend', e => {
										const array = e.srcElement.result;
										cb(null, new Uint8Array(array));
									});
									reader.readAsArrayBuffer(response);
								}
							})
							.catch(error => cb(error, null));
					}
				});
			}
		});
	}

	static async getNextAvailableChaincodeSequence(channel_id, chaincode_id) {
		const channel = await ChannelApi.getChannel(channel_id);
		const peer = channel.peers[0];
		const opts = {
			msp_id: peer.msp_id,
			client_cert_b64pem: peer.cert,
			client_prv_key_b64pem: peer.private_key,
			host: peer.url2use,
			channel_id,
		};
		let committed = await StitchApi.lc_getAllChaincodeDefinitionsOnChannel(opts);
		let sequence = 1;
		for (let j = 0; j < committed.data.chaincodeDefinitions.length; j++) {
			const def = committed.data.chaincodeDefinitions[j];
			if (def.name === chaincode_id) {
				if (def.sequence >= sequence) {
					sequence = def.sequence + 1;
				}
			}
		}
		return sequence;
	}

	static async addOrgEndorsementPolicy(opts) {
		let original_json;
		let options = {
			channel_id: opts.channel_id,
			msp_id: opts.msp_id,
			configtxlator_url: opts.configtxlator_url,
			orderer_host: opts.orderer.url2use,
			client_cert_b64pem: opts.cert,
			client_prv_key_b64pem: opts.private_key,
		};
		try {
			original_json = await ChannelApi.getChannelConfigJSON(options);
		} catch (error) {
			Log.error(error);
			throw error;
		}
		let updated_json = JSON.parse(JSON.stringify(original_json));
		_.set(updated_json, 'channel_group.groups.Application.groups.' + opts.msp_id + '.policies.Endorsement', {
			mod_policy: 'Admins',
			policy: {
				type: 1,
				value: {
					identities: [
						{
							principal: {
								msp_identifier: opts.msp_id,
								role: 3,
							},
							principal_classification: 0,
						},
					],
					rule: {
						n_out_of: {
							n: 1,
							rules: [
								{
									signed_by: 0,
								},
							],
						},
						signed_by: 0,
					},
					version: 0,
				},
			},
			version: 0,
		});

		Log.debug('Updated JSON:', updated_json);
		options.original_json = original_json;
		options.updated_json = updated_json;
		options.org_msp_id = options.msp_id;

		Log.debug('Updated org endorsement policy request:', options);
		await ChannelApi.updateChannel(options, false);
		return { message: 'ok' };
	}

	static async createOrApproveChaincodeProposal(opts) {
		const channel = await ChannelApi.getChannel(opts.channel_id);
		let orderer = null;
		for (let o = 0; o < channel.orderers.length && !orderer; o++) {
			if (channel.orderers[o].msp_id === opts.msp_id) {
				orderer = channel.orderers[o];
			}
		}
		if (!orderer) {
			orderer = channel.orderers[0];
		}
		if (!channel.endorsement_policies[opts.msp_id]) {
			await ChannelApi.addOrgEndorsementPolicy({
				...opts,
				channel,
				orderer,
			});
		}
		let chaincode_sequence = 1;
		if (opts.sequence) {
			chaincode_sequence = opts.sequence;
		} else {
			chaincode_sequence = await ChannelApi.getNextAvailableChaincodeSequence(opts.channel_id, opts.id);
		}
		let approve_opts = {
			msp_id: opts.msp_id,
			client_cert_b64pem: opts.cert,
			client_prv_key_b64pem: opts.private_key,
			host: opts.selected_peers[0].url2use,
			orderer_host: orderer.url2use,
			channel_id: opts.channel_id,
			chaincode_sequence: chaincode_sequence.toString(),
			chaincode_id: opts.id,
			chaincode_version: opts.version,
			init_required: opts.init_required,
		};
		if (opts.package_id) {
			approve_opts.package_id = opts.package_id;
		}
		if (opts.endorsement_policy) {
			approve_opts.validation_parameter = opts.endorsement_policy;
		}
		if (opts.private_data_json) {
			approve_opts.collections_obj = Helper.convertCollectionToSnake(opts.private_data_json);
		}
		try {
			const def = await StitchApi.lc_approveChaincodeDefinition(approve_opts);
			if (def.error) {
				Log.error(def);
				//throw Error(def);
			}
		} catch (error) {
			if (error.stitch_msg && error.stitch_msg.indexOf('unchanged content') === -1) {
				Log.error(error);
				throw error;
			}
		}
		if (opts.tx_id) {
			await SignatureRestApi.deleteRequest({
				tx_id: opts.tx_id,
				msp_id: opts.msp_id,
				client_cert_b64pem: opts.cert,
				client_prv_key_b64pem: opts.private_key,
			});
		}

		if (opts.signature_request) {
			if (opts.signature_request.ccd) {
				// Need to update request
				let optools_url = null;
				let package_id = null;
				let installed_peers = [];
				opts.signature_request.orgs2sign.forEach(org => {
					if (org.msp_id === opts.msp_id) {
						optools_url = org.optools_url;
						package_id = org.package_id;
						if (org.peers) {
							installed_peers = org.peers;
						}
						if (opts.selected_peers) {
							opts.selected_peers.forEach(peer => {
								if (installed_peers.indexOf(peer.grpcwp_url) === -1) {
									installed_peers.push(peer.grpcwp_url);
								}
							});
						}
					}
				});
				if (opts.package_id) {
					package_id = opts.package_id;
				}
				const signature_opts = {
					msp_id: opts.msp_id,
					certificate: opts.cert,
					private_key: opts.private_key,
					signature: 'approval_submitted',
					package_id,
					optools_url,
					installed_peers,
				};
				await SignatureRestApi.signChaincodeDefinitionRequest(opts.signature_request, signature_opts);
			}
		} else {
			// Create signature request
			const signature_request = {
				channel_name: opts.channel_id,
				originator: {
					msp_id: opts.msp_id,
					client_cert_b64pem: opts.cert,
					client_prv_key_b64pem: opts.private_key,
					signature: 'approval_submitted',
				},
				orgs: [],
				number_of_signatures: opts.number_of_signatures,
				orderers: [],
				ordererUrls: [],
				protobuf: [],
				ccd: {
					chaincode_sequence,
					chaincode_id: opts.id,
					chaincode_version: opts.version,
					package_id: opts.package_id,
					init_required: opts.init_required,
					validation_parameter: opts.endorsement_policy || '/Channel/Application/Endorsement',
					collections_obj: opts.private_data_json || undefined,
				},
				installed_peers: opts.selected_peers,
			};
			const msps = await MspRestApi.getAllMsps();
			opts.members.forEach(org => {
				const msp = msps.find(x => x.msp_id === org.id && _.intersection(x.root_certs, org.root_certs).length >= 1);
				if (msp) {
					signature_request.orgs.push(msp);
				}
			});
			try {
				const sig_resp = await SignatureRestApi.createRequest(signature_request);
				Log.info('new channel signature resp:', sig_resp);
			} catch (error) {
				Log.error(error);
				throw error;
			}
		}
		return;
	}

	static async checkChaincodeReadiness(opts) {
		let approvals = {};
		try {
			const channel = await ChannelApi.getChannel(opts.channel_id);
			let peer = channel.peers[0];
			let identity = await IdentityApi.getAssociatedIdentity(peer);
			let orderer = channel.orderers[0];
			const check_opts = {
				msp_id: peer.msp_id,
				client_cert_b64pem: identity.cert,
				client_prv_key_b64pem: identity.private_key,
				host: peer.url2use,
				orderer_host: orderer.url2use,
				channel_id: opts.channel_id,
				chaincode_id: opts.chaincode_id,
				chaincode_sequence: opts.chaincode_sequence.toString(),
				chaincode_version: opts.chaincode_version,
				validation_parameter: opts.validation_parameter,
				init_required: opts.init_required,
				collections_obj: opts.collections_obj,
			};
			const resp = await StitchApi.lc_checkChaincodeDefinitionReadiness(check_opts);
			if (!resp.error) {
				approvals = resp.data.approvals;
			}
		} catch (error) {
			Log.error(error);
		}
		return approvals;
	}

	static async getCommittedChaincodeApprovals(opts) {
		let approvals = {};
		try {
			let peer;
			if (opts.peer) {
				peer = opts.peer;
			} else {
				const channel = await ChannelApi.getChannel(opts.channel_id);
				peer = channel.peers[0];
			}
			let identity = await IdentityApi.getAssociatedIdentity(peer);
			const def_opts = {
				msp_id: peer.msp_id,
				client_cert_b64pem: identity.cert,
				client_prv_key_b64pem: identity.private_key,
				host: peer.url2use,
				channel_id: opts.channel_id,
				chaincode_id: opts.chaincode_id,
			};
			const resp = await StitchApi.lc_getChaincodeDefinitionOnChannel(def_opts);
			if (!resp.error) {
				approvals = resp.data.approvals;
			}
		} catch (error) {
			Log.error(error);
		}
		return approvals;
	}
}

export default ChannelApi;
