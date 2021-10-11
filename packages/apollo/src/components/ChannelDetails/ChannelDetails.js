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
import { InlineNotification, Tab, Tabs } from 'carbon-components-react';
import SkeletonPlaceholder from 'carbon-components-react/lib/components/SkeletonPlaceholder';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import emptySmartContractImage from '../../assets/images/empty_installed.svg';
import { clearNotifications, showBreadcrumb, showError, showSuccess, updateState } from '../../redux/commonActions';
import ChannelApi from '../../rest/ChannelApi';
import { MspRestApi } from '../../rest/MspRestApi';
import { NodeRestApi } from '../../rest/NodeRestApi';
import { OrdererRestApi } from '../../rest/OrdererRestApi';
import { PeerRestApi } from '../../rest/PeerRestApi';
import Helper from '../../utils/helper';
import NodeStatus from '../../utils/status';
import AddAnchorPeerModal from '../AddAnchorPeerModal/AddAnchorPeerModal';
import ChannelACLs from '../ChannelACLs/ChannelACLs';
import ChannelAnchorPeers from '../ChannelAnchorPeers/ChannelAnchorPeers';
import ChannelChaincode from '../ChannelChaincode/ChannelChaincode';
import ChannelConsenterModal from '../ChannelConsenterModal/ChannelConsenterModal';
import ChannelMembers from '../ChannelMembers/ChannelMembers';
import ChannelModal from '../ChannelModal/ChannelModal';
import ItemContainer from '../ItemContainer/ItemContainer';
import ItemTileLabels from '../ItemContainerTile/ItemTileLabels/ItemTileLabels';
import JoinChannelModal from '../JoinChannelModal/JoinChannelModal';
import Logger from '../Log/Logger';
import PageContainer from '../PageContainer/PageContainer';
import PageHeader from '../PageHeader/PageHeader';
import StickySection from '../StickySection/StickySection';

const SCOPE = 'channelDetails';
const Log = new Logger(SCOPE);
const semver = require('semver');

class ChannelDetails extends Component {
	constructor(props) {
		super(props);
		this.initialized = false;
		this.channel = {};
		this.orderers = [];
		this.allOrderers = [];
		this.allPeers = [];
		this.msp_id = null;
		this.acls = [];
		this.anchorPeers = [];
		this.chaincode = [];
		this.nOutOf = {
			n: 1,
			outOf: 1,
		};
		this.blockParams = {
			absolute_max_bytes: null,
			max_message_count: null,
			preferred_max_bytes: null,
			timeout: null,
		};
		this.raftParams = {
			tick_interval: null,
			election_tick: null,
			heartbeat_tick: null,
			max_inflight_blocks: null,
			snapshot_interval_size: null,
		};
		this.existingLifecyclePolicy = {
			type: 'MAJORITY',
			members: [],
			n: '',
		};
		this.existingEndorsementPolicy = {
			type: 'MAJORITY',
			members: [],
			n: '',
		};
		this.props.updateState(SCOPE, {
			members: [],
			ordererMembers: [],
			anchorPeersLoading: false,
			peerList: [],
			ordererList: [],
			joinChannelModal: false,
			deleteConsenter: null,
			updateConsenter: null,
			ordererMSPs: [],
		});
		this.capabilities = {};
		this.consenters = [];
		this.ordererHost = '';
	}

	componentDidMount() {
		this.refresh();
		this.props.showBreadcrumb('breadcrumb_name', { name: this.props.match.params.channelId }, this.props.history.location.pathname);
		this.initialized = true;
	}

	refresh = () => {
		this.props.updateState(SCOPE, {
			blocks: [],
			loading: true,
			updatedChannel: null,
			tooManyRequests: false,
		});
		this.getChannel(() => {
			this.getChannelDetails(() => {
				this.getInstantiatedChaincode();
			});
		});
	};

	componentWillUnmount() {
		this.initialized = false;
		this.props.clearNotifications(SCOPE);
		NodeStatus.cancel();
		this.props.updateState(SCOPE, {
			capabilities: null,
		});
	}

	getChannel(cb) {
		const peerId = this.props.match.params.peerId || this.channel.peers[0].id;
		ChannelApi.getChannel(this.props.match.params.channelId, peerId)
			.then(channel => {
				this.channel = channel;
				PeerRestApi.getChannelInfoFromPeer(peerId, channel.id)
					.then(resp => {
						this.channel.height = resp.height;
						this.getBlocksForPage(0, 10);
						let peers = [];
						if (this.channel && this.channel.peers) {
							this.channel.peers.forEach(peer => {
								peer.type = 'peer';
								peers.push(peer);
								//peer.certificateWarning = Helper.getLongestExpiry(peer.admin_certs);
							});
							this.props.updateState(SCOPE, {
								peerList: peers,
							});
							NodeStatus.getStatus(peers, SCOPE, 'peerList');
						}
						cb();
					})
					.catch(error => {
						channel.height = null;
						cb();
					});
			})
			.catch(error => {
				this.props.updateState(SCOPE, { loading: false });
				this.props.showError(
					'error_channel_not_found',
					{
						channelId: this.props.match.params.channelId,
					},
					SCOPE
				);
			});
	}

	getHighestVersionFromCapabilities(capabilities_map) {
		const versions = Object.keys(capabilities_map);
		let highest = '';
		versions.forEach(version => {
			const revised = version.replace(/_/g, '.');
			if (highest) {
				try {
					if (semver.lt(semver.coerce(highest), semver.coerce(revised))) {
						highest = revised;
					}
				} catch (err) {
					console.error(err);
				}
			} else {
				highest = revised;
			}
		});
		return highest;
	}

	getChannelDetails = cb => {
		this.props.updateState(SCOPE, { anchorPeersLoading: true });
		const peerId = this.props.match.params.peerId || this.channel.peers[0].id;
		NodeRestApi.getNodes().then(nodes => {
			ChannelApi.getChannelConfig(peerId, this.props.match.params.channelId)
				.then(config_envelop => {
					let config = config_envelop.config;
					let members = [];
					let ordererMembers = [];
					let acls = [];
					let anchorPeers = [];

					let policies_map = _.get(config, 'channel_group.groups_map.Application.policies_map');
					let groups_map = _.get(config, 'channel_group.groups_map');
					let values_map = _.get(config, 'channel_group.values_map');
					const capabilities = {
						application:
							groups_map && groups_map.Application.values_map.Capabilities
								? this.getHighestVersionFromCapabilities(groups_map.Application.values_map.Capabilities.value.capabilities_map)
								: '',
						orderer:
							groups_map && groups_map.Orderer.values_map.Capabilities
								? this.getHighestVersionFromCapabilities(groups_map.Orderer.values_map.Capabilities.value.capabilities_map)
								: '',
						channel: values_map && values_map.Capabilities ? this.getHighestVersionFromCapabilities(values_map.Capabilities.value.capabilities_map) : '',
					};
					let update_obj = { capabilities };
					const pathname = _.get(this.props, 'history.location.pathname');
					if (pathname && pathname.indexOf('/debug/') !== -1) {
						update_obj = { capabilities, debug_block: config_envelop };
					}
					this.props.updateState(SCOPE, {
						...update_obj,
					});
					let { readers, writers, admins } = this.getRoles(policies_map);

					const orgNodes = _.get(config, 'channel_group.groups_map.Application.groups_map');
					const orgs = Object.keys(orgNodes);
					for (let i in orgs) {
						const admin_list = _.get(orgNodes[orgs[i]], 'values_map.MSP.value.admins_list');
						const node_ou = _.get(orgNodes[orgs[i]], 'values_map.MSP.value.fabric_node_ous.enable', false);
						const certificateWarning = Helper.getLongestExpiry(node_ou ? [] : admin_list);
						members.push({
							id: orgs[i],
							org: orgs[i],
							node_ou: _.get(orgNodes[orgs[i]], 'values_map.MSP.value.fabric_node_ous.enable', false),
							roles: admins.includes(orgs[i])
								? ['admin', 'writer', 'reader']
								: writers.includes(orgs[i])
									? ['writer', 'reader']
									: readers.includes(orgs[i])
										? ['reader']
										: ['reader'],
							admins: admin_list,
							certificateWarning,
							root_certs: _.get(orgNodes[orgs[i]], 'values_map.MSP.value.root_certs_list'),
						});
					}

					const ordererNodes = _.get(config, 'channel_group.groups_map.Orderer.groups_map');
					const orderers = Object.keys(ordererNodes);
					for (let i in orderers) {
						const admin_list = _.get(ordererNodes[orderers[i]], 'values_map.MSP.value.admins_list');
						const node_ou = _.get(ordererNodes[orderers[i]], 'values_map.MSP.value.fabric_node_ous.enable', false);
						const certificateWarning = Helper.getLongestExpiry(node_ou ? [] : admin_list);
						ordererMembers.push({
							id: orderers[i],
							org: orderers[i],
							node_ou: _.get(ordererNodes[orderers[i]], 'values_map.MSP.value.fabric_node_ous.enable', false),
							msp_id: orderers[i],
							admins: admin_list,
							certificateWarning,
							root_certs: _.get(ordererNodes[orderers[i]], 'values_map.MSP.value.root_certs_list'),
							isOrdererMSP: true,
						});
					}

					const acl_definitions = _.get(config, 'channel_group.groups_map.Application.values_map.ACLs.value.acls_map');
					for (const acl in acl_definitions) {
						const acl_def = {
							id: acl,
							resource: acl,
							policy_ref: acl_definitions[acl].policy_ref,
						};
						acls.push(acl_def);
					}

					for (let node in orgNodes) {
						const peers = _.get(orgNodes[node], 'values_map.AnchorPeers.value.anchor_peers_list');
						for (let peer in peers) {
							anchorPeers.push({
								id: peers[peer].host + ':' + peers[peer].port,
								msp_id: node,
								host: peers[peer].host,
								port: peers[peer].port,
								grpcwp_url: peers[peer].host + ':' + peers[peer].port,
							});
						}
					}

					this.acls = acls;
					this.anchorPeers = anchorPeers;
					nodes.forEach(node => {
						this.anchorPeers.forEach(anchorPeer => {
							if (node.type === 'fabric-peer' && anchorPeer.grpcwp_url.toLowerCase() === node.backend_addr.toLowerCase()) {
								anchorPeer.display_name = node.name;
								anchorPeer.id = node.id;
							}
						});
					});

					const policy = _.get(config, 'channel_group.groups_map.Application.policies_map.Admins.policy.value.rule.n_out_of');
					if (policy) {
						this.nOutOf.n = policy.n;
						this.nOutOf.outOf = policy.rules_list ? policy.rules_list.length : 1;
					}

					const blockParams = _.get(config, 'channel_group.groups_map.Orderer.values_map');
					if (blockParams && blockParams.BatchSize) {
						this.blockParams.absolute_max_bytes = blockParams.BatchSize.value.absolute_max_bytes;
						this.blockParams.preferred_max_bytes = blockParams.BatchSize.value.preferred_max_bytes;
						this.blockParams.max_message_count = blockParams.BatchSize.value.max_message_count;
					}
					if (blockParams && blockParams.BatchTimeout) {
						this.blockParams.timeout = blockParams.BatchTimeout.value.timeout;
					}

					const raftParams = _.get(config, 'channel_group.groups_map.Orderer.values_map.ConsensusType.value.metadata.options', null);
					if (raftParams) {
						this.raftParams.tick_interval = raftParams.tick_interval;
						this.raftParams.election_tick = raftParams.election_tick;
						this.raftParams.heartbeat_tick = raftParams.heartbeat_tick;
						this.raftParams.max_inflight_blocks = raftParams.max_inflight_blocks;
						this.raftParams.snapshot_interval_size = raftParams.snapshot_interval_size;
					}

					this.capabilities = this.getCapabilities(config);

					const lifecyclePolicyType = _.get(config, 'channel_group.groups_map.Application.policies_map.LifecycleEndorsement.policy.type', null);
					const lifecyclePolicyValue = _.get(config, 'channel_group.groups_map.Application.policies_map.LifecycleEndorsement.policy.value', null);
					if (lifecyclePolicyType === 3) {
						this.existingLifecyclePolicy.type = lifecyclePolicyValue.rule;
						this.existingLifecyclePolicy.n = '';
						this.existingLifecyclePolicy.members = [];
					} else if (!_.isEmpty(lifecyclePolicyValue)) {
						this.existingLifecyclePolicy.type = 'SPECIFIC';
						this.existingLifecyclePolicy.n = _.get(lifecyclePolicyValue, 'rule.n_out_of.n', null);
						this.existingLifecyclePolicy.members = lifecyclePolicyValue.identities_list.map(x => x.principal.msp_identifier);
					}

					const endorsementPolicyType = _.get(config, 'channel_group.groups_map.Application.policies_map.Endorsement.policy.type', null);
					const endorsementPolicyValue = _.get(config, 'channel_group.groups_map.Application.policies_map.Endorsement.policy.value', null);
					if (endorsementPolicyType === 3) {
						this.existingEndorsementPolicy.type = endorsementPolicyValue.rule;
						this.existingEndorsementPolicy.n = '';
						this.existingEndorsementPolicy.members = [];
					} else if (!_.isEmpty(endorsementPolicyValue)) {
						this.existingEndorsementPolicy.type = 'SPECIFIC';
						this.existingEndorsementPolicy.n = _.get(endorsementPolicyValue, 'rule.n_out_of.n', null);
						this.existingEndorsementPolicy.members = endorsementPolicyValue.identities_list.map(x => x.principal.msp_identifier);
					}

					this.props.updateState(SCOPE, {
						members,
						ordererMembers,
						anchorPeersLoading: false,
					});
					return config;
				})
				.then(config => {
					const l_orderers = ChannelApi.getOrdererAddresses(config);
					const l_consenters = _.get(config, 'channel_group.groups_map.Orderer.values_map.ConsensusType.value.metadata.consenters', []);
					OrdererRestApi.getOrderers(true)
						.then(orderers => {
							let isTLSCertMismatchFound = false;
							l_orderers.forEach(orderer => {
								orderers.forEach(node => {
									// Also check the raft nodes within
									let matchingRaftNode = false;
									if (node.raft && node.raft.length > 0) {
										matchingRaftNode = node.raft.find(x => _.toLower(x.backend_addr) === _.toLower(orderer));
									}
									if (_.toLower(node.backend_addr) === _.toLower(orderer) || matchingRaftNode) {
										if (!this.orderers.find(x => x.id === node.id)) {
											this.orderers.push(node);
										}
									}
									let orderers = [];
									if (this.channel && this.channel.orderers) {
										this.channel.orderers.forEach(orderer => {
											orderer.type = 'orderer';
											//orderer.certificateWarning = Helper.getLongestExpiry(orderer.admin_certs);
											orderers.push(orderer);
										});
										this.props.updateState(SCOPE, {
											ordererList: orderers,
										});
										NodeStatus.getStatus(orderers, SCOPE, 'ordererList');
									}
								});
							});
							let raft_nodes = orderers ? orderers.filter(node => node.raft && node.raft.length > 0).map(node => node.raft) : [];
							raft_nodes = _.flatten(raft_nodes);
							l_consenters.forEach(orderer => {
								orderer.tls_cert_mismatch = false;
								raft_nodes.forEach(node => {
									if (_.toLower(node.backend_addr).includes(_.toLower(orderer.host) + ':' + _.toLower(orderer.port))) {
										orderer.name = node.name;
										orderer.display_name = node.display_name;
										orderer.url = node.backend_addr;
										const tls_cert_mismatch = Helper.isTLSCertMismatch(orderer, node);
										if (tls_cert_mismatch) {
											isTLSCertMismatchFound = true;
											orderer.tls_cert_mismatch = true;
											orderer.tls_new_cert = node.client_tls_cert;
										}
									}
								});
							});
							l_consenters.forEach(orderer => {
								if (!_.has(orderer, 'url')) {
									orderer.url = orderer.host + ':' + orderer.port;
								}
							});
							this.allOrderers = orderers;
							this.consenters = l_consenters;
							return isTLSCertMismatchFound;
						})
						.then(isTLSCertMismatchFound => {
							if (isTLSCertMismatchFound) {
								// Populate the orderer host url and orderer msps to send the update cert request to
								MspRestApi.getAllMsps()
									.then(async all_msps => {
										let msps = [];
										all_msps.forEach(msp => {
											msps.push({ ...msp, display_name: msp.display_name + ' (' + msp.msp_id + ')' });
										});

										if (_.size(this.channel.orderers) > 0) {
											const orderer_msp_ids = [];
											this.channel.orderers.forEach(x =>
												_.has(x, 'raft') ? x.raft.forEach(y => orderer_msp_ids.push(y.msp_id)) : orderer_msp_ids.push(x.msp_id)
											);
											msps = msps.filter(msp => orderer_msp_ids.includes(msp.msp_id));
										}
										this.props.updateState(SCOPE, {
											ordererMSPs: msps,
										});
										const channelOrderer = this.orderers && this.orderers.length ? this.orderers[0] : null;
										this.ordererHost = await OrdererRestApi.getOrdererURL(channelOrderer, this.consenters);
										if (cb) cb();
									})
									.catch(error => {
										Log.error(error);
										this.props.updateState(SCOPE, { ordererMSPs: [] });
									});
							} else if (cb) cb();
						});
				})
				.catch(error => {
					this.acls = [];
					this.anchorPeers = [];
					this.props.updateState(SCOPE, { loading: false, members: [], ordererMembers: [], anchorPeersLoading: false });
					Log.error(error);
					this.props.showError(
						'error_channel_details_not_found',
						{
							peerId: this.props.match.params.peerId,
							channelId: this.props.match.params.channelId,
						},
						SCOPE
					);
					if (cb) cb();
				});
		});
	};

	// Get the channel, application and orderer capability levels for the application channel
	getCapabilities(config) {
		const channelCapabilityNode = _.get(config, 'channel_group.values_map.Capabilities.value.capabilities_map', {});
		const channelCapability = this.getHighestVersionFromCapabilities(channelCapabilityNode);

		const ordererCapabilityNode = _.get(config, 'channel_group.groups_map.Orderer.values_map.Capabilities.value.capabilities_map', {});
		const ordererCapability = this.getHighestVersionFromCapabilities(ordererCapabilityNode);

		const applicationCapabilityNode = _.get(config, 'channel_group.groups_map.Application.values_map.Capabilities.value.capabilities_map', {});
		const applicationCapability = this.getHighestVersionFromCapabilities(applicationCapabilityNode);

		const capabilities = {
			channel: channelCapability,
			orderer: ordererCapability,
			application: applicationCapability,
		};
		return capabilities;
	}

	getRoles = policies => {
		let readers = [];
		let writers = [];
		let admins = [];
		for (let pol in policies) {
			let identities = _.get(policies[pol], 'policy.value.identities_list');
			for (let i in identities) {
				let role = pol.toLowerCase();
				switch (role) {
					case 'readers':
						readers.push(identities[i].principal.msp_identifier);
						break;
					case 'writers':
						writers.push(identities[i].principal.msp_identifier);
						break;
					case 'admins':
						admins.push(identities[i].principal.msp_identifier);
						break;
					default:
						break;
				}
			}
		}
		return { readers, writers, admins };
	};

	getInstantiatedChaincode = () => {
		const peerId = this.props.match.params.peerId || this.channel.peers[0].id;
		ChannelApi.getInstantiatedChaincode(this.props.match.params.channelId, peerId)
			.then(resp => {
				if (resp && resp.chaincodesList) {
					this.chaincode = resp.chaincodesList;
				}
				this.props.updateState(SCOPE, { loading: false });
			})
			.catch(error => {
				this.props.updateState(SCOPE, { loading: false });
				this.props.showError(
					'error_get_instantiated',
					{
						peerName: this.props.match.params.peerId,
						channelName: this.props.match.params.channelId,
					},
					SCOPE
				);
			});
	};

	getBlocksForPage = (page, pageSize, doNotRetry) => {
		this.lastRequestedPage = page;
		const peerId = this.props.match.params.peerId || this.channel.peers[0].id;
		const blocks = this.props.blocks || [];
		const index = page * pageSize;
		const height = this.channel.height;
		const all = [];
		let id;
		for (let i = 0; i < pageSize; i++) {
			id = height - index - i - 1;
			if (id >= 0 && !blocks[index + i]) {
				blocks[index + i] = {
					id: '' + id,
					skeleton: true,
				};
				all.push(ChannelApi.getChannelBlock(peerId, this.props.match.params.channelId, id));
			} else {
				if (id >= 0 && blocks[index + i].skeleton) {
					all.push(ChannelApi.getChannelBlock(peerId, this.props.match.params.channelId, id));
				}
			}
		}
		this.props.updateState(SCOPE, { blocks: [...blocks] });
		Promise.all(all)
			.then(data => {
				data.forEach(block => {
					id = Number(block.header.number);
					const created = _.get(block, 'data.data_list[0].envelope.payload.header.channel_header.timestamp');
					const txs = [];
					if (block.data.data_list) {
						block.data.data_list.forEach(tx => {
							const tx_id = _.get(tx, 'envelope.payload.header.channel_header.tx_id');
							if (tx_id) {
								txs.push(tx);
							}
						});
					}
					blocks[this.channel.height - id - 1] = {
						id: '' + id,
						created: created ? new Date(created.seconds * 1000).toLocaleString() : '',
						txCount: txs.length,
						txs,
						hash: _.get(block, 'header.data_hash'),
					};
				});
				this.props.updateState(SCOPE, {
					blocks: [...blocks],
					tooManyRequests: false,
				});
			})
			.catch(error => {
				Log.error(error);
				this.props.updateState(SCOPE, { blocks: [...blocks] });
				if (page !== this.lastRequestedPage) {
					// we are not on the failed page anymore, so don't retry yet
					return;
				}
				let tooManyRequests = false;
				if (_.isString(error)) {
					if (error.indexOf('Too Many Requests') > -1) {
						tooManyRequests = true;
					}
				} else {
					const headersMap = _.get(error, 'grpc_resp.headers.headersMap');
					let rateLimitRemaining = headersMap ? headersMap['x-ratelimit-remaining'] : null;
					if (rateLimitRemaining && _.isArray(rateLimitRemaining)) {
						rateLimitRemaining = rateLimitRemaining[0];
					}
					if (rateLimitRemaining === '0') {
						tooManyRequests = true;
					}
				}
				if (tooManyRequests) {
					this.props.updateState(SCOPE, {
						tooManyRequests: true,
					});
					setTimeout(() => {
						if (page === this.lastRequestedPage) {
							// only get the page if it hasn't changed
							this.getBlocksForPage(page, pageSize, false);
						}
					}, 60000);
					return;
				}
				this.props.updateState(SCOPE, {
					tooManyRequests: false,
				});
				if (doNotRetry) {
					this.props.showError('error_block', {}, SCOPE);
				} else {
					this.getBlocksForPage(page, pageSize, true);
				}
			});
	};

	getLastTransactionTime(translate) {
		if (this.props.blocks) {
			for (let i = 0; i < this.props.blocks.length; i++) {
				const txs = this.props.blocks[i].txs;
				if (txs) {
					let d = null;
					for (let j = 0; j < txs.length; j++) {
						const timestamp = _.get(txs[j], 'envelope.payload.header.channel_header.timestamp');
						const tx_id = _.get(txs[j], 'envelope.payload.header.channel_header.tx_id');
						if (timestamp && tx_id) {
							const test = new Date(timestamp.seconds * 1000);
							if (!d || d < test) {
								d = test;
							}
						}
					}
					if (d) {
						return (
							<span className="ibp-last-transaction-container">
								<span className="ibp-last-transaction-date">{d.toLocaleDateString()}</span>
								<span className="ibp-last-transaction-time"> {d.toLocaleTimeString()}</span>
							</span>
						);
					}
				}
				return <span>{translate('no_txs')}</span>;
			}
		}
	}

	debug_openChannelConfig = () => {
		let debug_block = this.props.debug_block;
		Helper.openJSONBlob(debug_block);
	};

	openBlock = block => {
		let path = '';
		if (this.props.match.params.peerId) {
			path = path + '/peer/' + encodeURIComponent(this.props.match.params.peerId);
		}
		path = path + '/channel/' + encodeURIComponent(this.props.match.params.channelId);
		path = path + '/block/' + encodeURIComponent(block.id);
		this.props.history.push(path + window.location.search);
	};

	openEditChannelModal = () => {
		this.props.updateState(SCOPE, {
			editLoading: true,
			showEditChannelModal: true,
		});
		this.getChannelDetails(() => {
			this.props.updateState(SCOPE, {
				editLoading: false,
			});
		});
	};

	hideEditChannelModal = () => {
		this.props.updateState(SCOPE, {
			showEditChannelModal: false,
		});
	};

	async updateChannelAnchorPeers(deleted_peers, consenterUrl) {
		const all = [];
		for (let org in deleted_peers) {
			let peer = deleted_peers[org];
			let opts = {
				channel_id: this.props.match.params.channelId,
				msp_id: peer.anchor_peer.msp_id,
				configtxlator_url: this.props.configtxlator_url,
				orderer_host: consenterUrl ? consenterUrl : this.channel.orderers[0].url2use,
				client_cert_b64pem: peer.client_cert_b64pem,
				client_prv_key_b64pem: peer.client_prv_key_b64pem,
				anchor_peer: peer.anchor_peer,
			};
			all.push(ChannelApi.deleteChannelAnchorPeers(opts));
		}
		return Promise.all(all);
	}

	deleteAnchorPeers = async peers => {
		let deleted_peers = {};
		peers.forEach(peer => {
			let peer_details = this.channel.peers.find(peer1 => peer1.msp_id === peer.msp_id);
			if (peer_details) {
				deleted_peers[peer.msp_id] = {
					anchor_peer: { host: peer.host, port: peer.port, msp_id: peer.msp_id },
					client_cert_b64pem: peer_details.cert,
					client_prv_key_b64pem: peer_details.private_key,
				};
			}
		});
		let consenterUrl;
		if (_.has(this.channel.orderers[0], 'raft') && this.consenters) {
			// Use the orderer node that is in the channel consenter set
			const consenter_addresses = this.consenters.map(x => x.host + ':' + x.port);
			const orderer = this.channel.orderers[0].raft.find(x => consenter_addresses.includes(_.toLower(x.backend_addr)));
			consenterUrl = orderer.url2use;
		}

		try {
			const resps = await this.updateChannelAnchorPeers(deleted_peers, consenterUrl);
			let error = false;
			resps.forEach(resp => {
				Log.debug('Delete anchor peer response:', resp);
				if (resp.message !== 'ok') {
					error = true;
				}
			});
			if (!error) {
				let timeout = 0;
				if (resps.length > 1) {
					timeout = 2000;
				}
				setTimeout(() => {
					this.props.showSuccess('channel_anchor_peer_deleted', {}, SCOPE);
				}, timeout);
			} else {
				this.props.showError('error_deleting_anchor_peers', {}, SCOPE);
			}
			this.getChannelDetails();
		} catch (error) {
			Log.error(error);
			this.props.showError('error_deleting_anchor_peers', {}, SCOPE);
		}
	};

	renderTransactionOverview(translate) {
		return (
			<div id="block-history-container">
				{this.props.tooManyRequests && <InlineNotification kind="warning"
					title={translate('too_many_requests')}
					subtitle=""
					hideCloseButton={true}
				/>}
				<ItemContainer
					containerTitle="block_history"
					id="ibp-channel-details-block-history-table"
					itemId="blocks"
					items={this.props.blocks}
					itemCount={this.channel.height}
					loading={this.props.loading}
					listMapping={[
						{
							header: 'id',
							attr: 'id',
						},
						{
							header: 'created',
							attr: 'created',
						},
						{
							header: 'transactions',
							attr: 'txCount',
						},
						{
							header: 'block_hash',
							attr: 'hash',
						},
					]}
					onPage={this.getBlocksForPage}
					select={this.openBlock}
					emptyMessage="no_blocks"
				/>
			</div>
		);
	}

	openNodeDetails = node => {
		if (node.type === 'fabric-orderer' || node.type === 'orderer') {
			this.props.history.push('/orderer/' + encodeURIComponent(node.id) + window.location.search);
		}
		if (node.type === 'fabric-peer' || node.type === 'peer') {
			this.props.history.push('/peer/' + encodeURIComponent(node.id) + window.location.search);
		}
	};

	openAddAnchorPeerModal = () => {
		this.props.updateState(SCOPE, {
			showAddAnchorPeer: true,
		});
	};

	closeAddAnchorPeerModal = () => {
		this.props.updateState(SCOPE, {
			showAddAnchorPeer: false,
		});
	};

	getNodeStatus = node => {
		let status;
		status = node.status;
		const translate = this.props.translate;
		return node && status ? (
			<div className="ibp-node-status-container">
				<span
					className={`
							ibp-node-status
							${status === 'running' ? 'ibp-node-status-running' : ''}
							${status === 'stopped' ? 'ibp-node-status-stopped' : ''}
							${status === 'unknown' ? 'ibp-node-status-unknown' : ''}
							${!node.operations_url ? 'ibp-node-status-unretrievable' : ''}
							`}
					tabIndex="0"
				/>
				<span className="ibp-node-status-label">
					{status === 'running' && translate('running')}
					{status === 'stopped' && translate('stopped')}
					{status === 'unknown' && translate('unknown')}
					{!node.operations_url && translate('status_undetected')}
				</span>
			</div>
		) : (
			<div className="ibp-node-status-container">
				<span className="ibp-node-status ibp-node-status-skeleton"
					tabIndex="0"
				/>
				<span className="ibp-node-status-label">{translate('status_pending')}</span>
			</div>
		);
	};

	buildCustomTile(node) {
		const translate = this.props.translate;
		return (
			<div>
				<p className="ibp-node-peer-tile-name">{translate(node.type)}</p>
				<p className="ibp-node-tile-msp">{node.msp_id}</p>
				<ItemTileLabels
					location={node.location}
					// certificateWarning={node.certificateWarning}
				/>
				{this.getNodeStatus(node)}
			</div>
		);
	}

	showJoinChannelModal = () => {
		PeerRestApi.getPeersWithCerts()
			.then(peers => {
				this.allPeers = peers;
				this.props.updateState(SCOPE, {
					joinChannelModal: true,
				});
			})
			.catch(error => {
				Log.error(error);
				this.props.updateState(SCOPE, {
					joinChannelModal: true,
				});
			});
	};

	hideJoinChannelModal = () => {
		this.props.updateState(SCOPE, {
			joinChannelModal: false,
		});
	};

	openDeleteConsenterModal = node => {
		this.props.updateState(SCOPE, { deleteConsenter: node });
	};

	closeDeleteConsenterModal = () => {
		this.props.updateState(SCOPE, { deleteConsenter: null });
	};

	openUpdateConsenterModal = node => {
		this.props.updateState(SCOPE, { updateConsenter: node });
	};

	closeUpdateConsenterModal = () => {
		this.props.updateState(SCOPE, { updateConsenter: null });
	};

	renderChannelNodes(translate) {
		return (
			<div id="channel-nodes-container"
				className="ibp-channel-nodes"
			>
				<ItemContainer
					id="channel_nodes"
					containerTitle="nodes"
					containerTooltip="nodes_tooltip"
					tooltipDirection="right"
					itemId="channelNodes"
					items={[...this.props.peerList, ...this.props.ordererList]}
					loading={this.props.loading}
					tileMapping={{
						title: 'display_name',
						custom: data => {
							return this.buildCustomTile(data);
						},
					}}
					select={this.openNodeDetails}
					isLink={true}
					listMapping={[
						{
							header: 'name',
							attr: 'display_name',
						},
						{
							header: 'type',
							attr: 'type',
						},
						{
							header: 'location',
							attr: 'location',
							translate: true,
						},
					]}
					addItems={[
						{
							id: 'add_node',
							text: 'add_node',
							fn: this.showJoinChannelModal,
						},
					]}
				/>
			</div>
		);
	}

	renderChannelConsenters(translate) {
		return (
			<div id="consenters-container">
				<ItemContainer
					containerTitle="ordering_service_consenters"
					containerTooltip="ordering_service_consenters_tooltip"
					id="ibp-channel-consenters-table"
					itemId="host"
					items={this.consenters}
					loading={this.props.loading}
					listMapping={[
						{
							header: 'name',
							attr: 'display_name',
						},
						{
							header: 'url',
							attr: 'url',
							width: 3,
						},
					]}
					menuItems={node => {
						const items = [
							{
								text: 'delete',
								fn: () => {
									this.openDeleteConsenterModal(node);
								},
							},
						];
						if (node.tls_cert_mismatch) {
							items.push({
								text: 'update_tls_certs',
								fn: () => {
									this.openUpdateConsenterModal(node);
								},
							});
						}
						return items;
					}}
				/>
			</div>
		);
	}

	renderInstantiatedChaincode(translate) {
		if (this.props.loading) {
			return <ItemContainer id="ibp-instantiated-smart-contracts-table"
				itemId="instantiatedChaincode"
				items={[]}
				loading={true}
				tileMapping={{}}
				widerTiles
			/>;
		}
		return (
			<div id="instantiated-chaincode-container"
				className="ibp-instantiated-chaincode"
			>
				<ItemContainer
					containerTitle="instantiated_chaincode"
					containerTooltip="instantiated_chaincode_table_tooltip"
					emptyMessage="instantiated_chaincode_empty"
					emptyImage={emptySmartContractImage}
					emptyTitle="empty_instantiated_title"
					id="ibp-instantiated-smart-contracts-table"
					itemId="instantiatedChaincode"
					items={this.chaincode}
					loading={this.props.loading}
					listMapping={[
						{
							header: 'contract_name',
							attr: 'name',
						},
						{
							header: 'version',
							attr: 'version',
						},
					]}
				/>
			</div>
		);
	}

	renderChannelDetails(translate) {
		let channel_peers = this.channel.peers ? JSON.parse(JSON.stringify(this.channel.peers)) : null;
		let anchor_peer_names = this.anchorPeers.map(peer => peer.id);
		let available_peers = []; //Non anchor peers
		if (channel_peers) {
			channel_peers.forEach(peer => {
				if (!anchor_peer_names.includes(peer.id)) {
					available_peers.push(peer);
				}
			});
			available_peers.forEach(peer => {
				peer.name = peer.name + '(' + peer.msp_id + ')';
			});
			this.channel.available_peers = available_peers;
		}
		return (
			<div>
				{this.renderChannelNodes(translate)}
				<ChannelMembers
					id="member"
					members={this.props.members}
					channelId={this.props.match.params.channelId}
					peerId={this.channel.peers ? this.props.match.params.peerId || this.channel.peers[0].id : null}
					orderer={this.orderers && this.orderers.length > 0 ? this.orderers[0] : null}
					configtxlator_url={this.props.configtxlator_url}
					consenters={this.consenters}
					loading={this.props.loading}
					isOrdererMSP={false}
				/>
				<ChannelMembers
					id="orderer"
					members={this.props.ordererMembers}
					channelId={this.props.match.params.channelId}
					peerId={this.channel.peers ? this.props.match.params.peerId || this.channel.peers[0].id : null}
					orderer={this.orderers && this.orderers.length > 0 ? this.orderers[0] : null}
					configtxlator_url={this.props.configtxlator_url}
					loading={this.props.loading}
					isOrdererMSP={true}
				/>
				{this.consenters && this.consenters.length > 0 && this.renderChannelConsenters(translate)}
				<ChannelACLs key="acl"
					acls={this.acls}
				/>
				<ChannelAnchorPeers
					key="anchor"
					anchorPeers={this.anchorPeers}
					openAddAnchorPeerModal={this.openAddAnchorPeerModal}
					loading={this.props.anchorPeersLoading}
					disableDelete={!this.channel.orderers || !this.channel.orderers.length}
					onDeleteAnchorPeers={this.deleteAnchorPeers}
					translate={this.props.translate}
				/>
			</div>
		);
	}

	getStickySectionGroups(translate) {
		const groups = [
			{
				label: 'orderer',
				value: this.props.ordererList && this.props.ordererList.length ? this.props.ordererList[0].cluster_name : '',
				loadingData: this.props.ordererList && !this.props.ordererList.length,
			},
			{
				label: 'app_capability_version',
				value: this.props.capabilities && this.props.capabilities.application ? this.props.capabilities.application : '',
				loadingData: !this.props.capabilities,
			},
			{
				label: 'os_capability_version',
				value: this.props.capabilities && this.props.capabilities.orderer ? this.props.capabilities.orderer : '',
				loadingData: !this.props.capabilities,
			},
			{
				label: 'channel_capability_version',
				value: this.props.capabilities && this.props.capabilities.channel ? this.props.capabilities.channel : '',
				loadingData: !this.props.capabilities,
			},
		];
		return groups;
	}

	getStickySectionCalloutGroups(translate) {
		const calloutGroups = [
			{
				id: 'block_height',
				label: 'block_height',
				value: this.channel.height ? this.channel.height : '',
				loadingData: !this.channel.height,
			},
			{
				id: 'last_transaction',
				label: 'last_transaction',
				value: this.getLastTransactionTime(translate),
				loadingData: !this.props.blocks.length,
			},
		];
		return calloutGroups;
	}

	getQuickActions(translate) {
		let quickAction = [
			{
				label: 'add_anchor_peer',
				quickAction: this.openAddAnchorPeerModal,
				loadingData: !this.props.blocks.length && this.props.anchorPeersLoading,
			},
		];

		const pathname = _.get(this.props, 'history.location.pathname');
		if (pathname && pathname.indexOf('/debug/') !== -1) {
			quickAction.push({
				label: 'open_channel_config',
				quickAction: this.debug_openChannelConfig,
			});
		}
		return quickAction;
	}

	isV2Channel() {
		if (
			this.props.capabilities &&
			this.props.capabilities.application &&
			semver.gte(semver.coerce(this.props.capabilities.application), semver.coerce('2.0'))
		) {
			return true;
		}
		return false;
	}

	render() {
		let details = { name: this.props.match.params.channelId };
		if (!this.initialized) {
			return <div />;
		}

		if (this.props.updatedChannel === this.props.match.params.channelId) {
			window.setTimeout(this.refresh, 1);
		}
		let peersNotJoinedYet = this.allPeers ? this.allPeers.filter(x => !this.props.peerList.find(y => y.id === x.id)) : this.allPeers;
		const { loading, match } = this.props;
		const translate = this.props.translate;
		const isV2 = this.isV2Channel();
		let peer = this.channel.peers ? this.channel.peers.find(peer => peer.cert && peer.private_key) : null;
		let peerCerts = peer
			? {
				msp_id: peer.msp_id,
				client_cert_b64pem: peer.cert,
				client_prv_key_b64pem: peer.private_key,
			  }
			: null;
		return (
			<PageContainer>
				<div className="bx--row">
					<div className="bx--col-lg-4">
						<PageHeader
							headerName={
								match.params.channelId ? (
									translate('channel_title', { channelName: this.props.match.params.channelId })
								) : (
									<SkeletonPlaceholder
										style={{
											height: '3rem',
											width: '10rem',
										}}
									/>
								)
							}
						/>
						<StickySection
							openSettings={this.openEditChannelModal}
							title="channel"
							loading={loading}
							details={details}
							groups={this.getStickySectionGroups(translate)}
							calloutGroups={this.getStickySectionCalloutGroups(translate)}
							quickActions={this.getQuickActions(translate)}
							type="channel"
							hideExport
							hideDelete
							hideRefreshCerts
						/>
					</div>
					<div className="bx--col-lg-12">
						<div className="ibp__channel--container">
							<Tabs aria-label="Tabs">
								<Tab id="ibp-channel-detail-chaincode"
									label={translate('chaincode_management')}
								>
									{this.props.capabilities && this.props.capabilities.application && isV2 ? (
										<ChannelChaincode
											channel={this.channel}
											peerList={this.props.peerList}
											members={this.props.members}
											match={this.props.match}
											ordererList={this.props.ordererList}
										/>
									) : (
										this.renderInstantiatedChaincode(translate)
									)}
								</Tab>
								<Tab id="ibp-channel-detail-tab-overview"
									label={translate('transaction_overview')}
								>
									{this.renderTransactionOverview(translate)}
								</Tab>
								<Tab id="ibp-channel-detail-tab-detail"
									label={translate('channel_details')}
								>
									{this.renderChannelDetails(translate)}
								</Tab>
							</Tabs>
						</div>
					</div>
					{!this.props.loading && this.props.showEditChannelModal && (
						<ChannelModal
							onClose={this.hideEditChannelModal}
							onComplete={channelName => {
								this.props.showSuccess('channel_update_request_submitted', { channelName }, SCOPE);
								this.getChannel(() => {
									this.getChannelDetails();
								});
							}}
							channelId={this.props.match.params.channelId}
							existingOrgs={this.props.members}
							existingOrdererOrgs={this.props.ordererMembers}
							existingAcls={this.acls}
							existingBlockParams={this.blockParams}
							existingRaftParams={this.raftParams}
							existingCapabilities={this.capabilities}
							existingConsenters={this.consenters}
							existingEndorsementPolicy={this.existingEndorsementPolicy}
							existingLifecyclePolicy={this.existingLifecyclePolicy}
							nOutOf={this.nOutOf}
							channelOrderer={this.orderers && this.orderers.length > 0 ? this.orderers : null}
							channelPeers={this.props.peerList}
							editLoading={this.props.editLoading}
						/>
					)}
					{this.props.joinChannelModal && (
						<JoinChannelModal
							onClose={this.hideJoinChannelModal}
							onComplete={() => {
								this.hideJoinChannelModal();
								this.props.showSuccess('nodes_added_successfully', {}, SCOPE);
								this.getChannel(() => {
									this.getChannelDetails();
								});
							}}
							existingOrderer={this.orderers && this.orderers.length ? this.orderers[0] : null}
							existingChannel={this.props.match.params.channelId}
							existingMembers={this.props.members}
							peers={peersNotJoinedYet}
							isAddingNode
						/>
					)}
				</div>
				{this.props.showAddAnchorPeer && (
					<AddAnchorPeerModal
						onClose={this.closeAddAnchorPeerModal}
						onComplete={this.getChannelDetails}
						channelId={this.props.match.params.channelId}
						peers={this.channel.available_peers}
						orderer={this.orderers && this.orderers.length ? this.orderers[0] : null}
						consenters={this.consenters}
					/>
				)}
				{this.props.deleteConsenter && (
					<ChannelConsenterModal
						onClose={this.closeDeleteConsenterModal}
						onComplete={() => {
							this.refresh();
						}}
						channelId={this.props.match.params.channelId}
						consenter={this.props.deleteConsenter}
						ordererMSPs={this.props.ordererMSPs}
						peerCerts={peerCerts}
						ordererHost={this.ordererHost}
						mode={'delete'}
					/>
				)}
				{this.props.updateConsenter && (
					<ChannelConsenterModal
						onClose={this.closeUpdateConsenterModal}
						onComplete={() => {
							this.refresh();
						}}
						channelId={this.props.match.params.channelId}
						consenter={this.props.updateConsenter}
						ordererMSPs={this.props.ordererMSPs}
						peerCerts={peerCerts}
						ordererHost={this.ordererHost}
						mode={'update'}
					/>
				)}
			</PageContainer>
		);
	}
}

const dataProps = {
	blocks: PropTypes.array,
	loading: PropTypes.bool,
	match: PropTypes.object,
	settings: PropTypes.object,
	history: PropTypes.object,
	debug_block: PropTypes.object,
	showEditChannelModal: PropTypes.bool,
	members: PropTypes.array,
	ordererMembers: PropTypes.array,
	ordererMSPs: PropTypes.array,
	showAddAnchorPeer: PropTypes.bool,
	anchorPeersLoading: PropTypes.bool,
	peerList: PropTypes.array,
	ordererList: PropTypes.array,
	updatedChannel: PropTypes.string,
	tooManyRequests: PropTypes.bool,
	joinChannelModal: PropTypes.bool,
	capabilities: PropTypes.object,
	editLoading: PropTypes.bool,
	deleteConsenter: PropTypes.object,
	updateConsenter: PropTypes.object,
};

ChannelDetails.propTypes = {
	...dataProps,
	showBreadcrumb: PropTypes.func,
	showError: PropTypes.func,
	clearNotifications: PropTypes.func,
	updateState: PropTypes.func,
	showSuccess: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['settings'] = state['settings'];
		newProps['configtxlator_url'] = state['settings']['configtxlator_url'];
		return newProps;
	},
	{
		showBreadcrumb,
		showError,
		clearNotifications,
		updateState,
		showSuccess,
	}
)(withLocalize(ChannelDetails));
