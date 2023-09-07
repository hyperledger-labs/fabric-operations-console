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

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { updateState, showError, showSuccess } from '../../redux/commonActions';
import { ChannelParticipationApi } from '../../rest/ChannelParticipationApi';
import IdentityApi from '../../rest/IdentityApi';
import Helper from '../../utils/helper';
import ItemContainer from '../ItemContainer/ItemContainer';
import Logger from '../Log/Logger';
import SVGs from '../Svgs/Svgs';
import ChannelParticipationModal from './ChannelParticipationModal';
import ChannelParticipationUnjoinModal from './ChannelParticipationUnjoinModal';
import { MspRestApi } from '../../rest/MspRestApi';
import { NodeRestApi } from '../../rest/NodeRestApi';
import { OrdererRestApi } from '../../rest/OrdererRestApi';
import ChannelModal from '../ChannelModal/ChannelModal';
import ChannelApi from '../../rest/ChannelApi';
import NodeStatus from '../../utils/status';
import JoinOSNChannelModal from '../JoinOSNChannelModal/JoinOSNChannelModal';
import _ from 'lodash';
import emptyImage from '../../assets/images/empty_channels.svg';
import ActionsHelper from '../../utils/actionsHelper';


const naturalSort = require('javascript-natural-sort');
const SCOPE = 'ChannelParticipationDetails';
const Log = new Logger(SCOPE);
const semver = require('semver');

class ChannelParticipationDetails extends Component {

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
			ordererCheck: true,
		});
		this.capabilities = {};
		this.consenters = [];
		this.ordererHost = '';
	}

	componentDidMount() {
		this.props.updateState(SCOPE, {
			showCPDetailsModal: false,
			showEditChannelModal: false,
			showCPUnjoinModal: false,
			createChannelModal: false,
			disableSubmit: true,
		});
	}

	showEditChannelModal = async (channel) => {
		this.props.updateState(SCOPE, {
			loading: true,
			editLoading: true,
		});
		var channel_details = await ChannelApi.getChannel(channel.name);
		this.props.updateState(SCOPE, {
			channelEdit: channel.name,
			peerName: channel_details.peers[0].id,
		});

		this.getChannelDetails(() => {
			this.props.updateState(SCOPE, {
				loading: false,
				editLoading: false,
			});
		});

	};

	hideEditChannelModal = () => {
		this.props.updateState(SCOPE, {
			showEditChannelModal: false,
		});
	};

	closeCPDetailsModal = () => {
		this.props.updateState(SCOPE, {
			showCPDetailsModal: false,
		});
	};

	openCPDetailsModal = async (channel) => {
		await this.loadChannelData(channel.name);
		this.props.updateState(SCOPE, {
			showCPDetailsModal: true,
		});
	};

	closeCPUnjoinModal = () => {
		this.props.updateState(SCOPE, {
			showCPUnjoinModal: false,
		});
	};

	openCPUnjoinModal = async (channel) => {
		await this.loadChannelData(channel.name);
		this.props.updateState(SCOPE, {
			showCPUnjoinModal: true,
		});
	};

	loadChannelData = async (channelId) => {
		if (this.props.details && !this.props.details.osnadmin_url) return;
		let node = this.props.selectedNode || this.props.details;
		let nodes = this.props.selectedNode ? [this.props.selectedNode] : this.props.details.raft;
		let channelInfo = {};
		let orderer_tls_identity = await IdentityApi.getTLSIdentity(node);
		if (orderer_tls_identity) {
			try {
				let all_identities = await IdentityApi.getIdentities();
				channelInfo = await ChannelParticipationApi.map1Channel(all_identities, nodes, channelId);
				channelInfo.systemChannel = _.get(this.props.channelList, 'systemChannel.name') === channelId;
			} catch (error) {
				Log.error('Unable to get channel list:', error);
			}
			if (channelInfo.nodes !== undefined) {
				let nodesArray = Object.values(channelInfo.nodes);
				channelInfo.nodes = nodesArray.sort((a, b) => {
					return naturalSort(a.name, b.name);
				});
			}
		}

		this.props.updateState(SCOPE, {
			channelInfo,
		});
	};

	// open the join channel modal
	joinChannel = (channelDetails) => {
		this.props.updateState(SCOPE, {
			joinChannelModal: true,
			joinChannelDetails: channelDetails
		});
	};

	getChannelDetails = cb => {
		this.props.updateState(SCOPE, { anchorPeersLoading: true });
		const peerId = this.props.peerName;
		NodeRestApi.getNodes().then(nodes => {
			ChannelApi.getChannelConfig(peerId, this.props.channelEdit)
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
							if (this.props.ordererList.length < 1) {
								this.props.updateState(SCOPE, {
									ordererCheck: false,
								});
							}
							return isTLSCertMismatchFound;
						})
						.then(isTLSCertMismatchFound => {

							// Populate the orderer host url and orderer msps for the update cert flow && the remove consenter flow
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
									if (cb) cb();
								});
						});
						this.props.updateState(SCOPE,{showEditChannelModal: true})
				})
				.catch(error => {
					this.acls = [];
					this.anchorPeers = [];
					this.props.updateState(SCOPE, { loading: false, members: [], ordererMembers: [], anchorPeersLoading: false });
					Log.error(error);
					this.props.showError(
						'error_channel_details_not_found',
						{
							peerId: this.props.peerName,
							channelId: this.props.channelEdit,
						},
						SCOPE
					);
					if (cb) cb();
				});
		});
	};


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

	// build the button/icons in each channel tile
	buildCustomTile = (channel) => {
		const translate = this.props.translate;
		return (
			<div>
				{channel.type === 'system_channel' && (
					<p className='ibp-orderer-channel-sub'>{translate('system_channel')}</p>
				)}
				<button className="ibp-orderer-channel-info"
					onClick={async () => await this.openCPDetailsModal(channel)}
				>
					<SVGs type="settings"
						title={translate('channel_info_title')}
					/>
				</button>
				{(this.props.isSystemLess || channel.type === 'system_channel') && (
					<button className="ibp-orderer-channel-unjoin"
						onClick={async () => await this.openCPUnjoinModal(channel)}
					>
						<SVGs type="trash"
							title={translate('unjoin_channel_title')}
						/>
					</button>
				)}
				{this.props.isSystemLess && (
					<button className="ibp-orderer-channel-join"
						onClick={() => this.joinChannel(channel)}
					>
						<SVGs type="plus"
							title={translate('join_osn_title')}
						/>
					</button>
				)}
				{this.props.isSystemLess && (
					<button className="ibp-orderer-channel-edit"
						onClick={() => this.showEditChannelModal(channel)}
					>
						<SVGs type="pencil"
							title={translate('join_osn_title')}
						/>
					</button>

				)}
			</div>
		);
	}

	render() {
		return (
			<div>
				{this.props.channelList &&
					(<ItemContainer
						containerTitle="channels"
						containerTooltip="cp_channels_tooltip"
						emptyImage={emptyImage}
						emptyTitle="empty_cp_channels_title"
						emptyMessage={this.props.drillDown ? 'empty_cp_channels_text_drilldown' : 'empty_cp_channels_text'}
						itemId="channel-list"
						id="channel-list-tile"
						items={(this.props.channelList && Array.isArray(this.props.channelList.channels)) ? this.props.channelList.channels : []}
						loading={this.props.loading}
						listMapping={[
							{
								header: 'channel',
								attr: 'name',
							}
						]}
						tileMapping={{
							title: 'name',
							custom: data => {
								return this.buildCustomTile(data);
							},
						}}
						addItems={
							this.props.isSystemLess ?
								[{
									id: 'join_channel',
									text: 'join_channel',
									fn: () => {
										this.joinChannel(null);
									},
									disabled: !ActionsHelper.canEditComponent(this.props.feature_flags)
								}]

								: []
						}
						widerTiles
					/>)
				}

				{!this.props.loading && this.props.showEditChannelModal && (
					<ChannelModal
					onClose={this.hideEditChannelModal}
					onComplete={channelName => {
						this.props.showSuccess('channel_update_request_submitted', { channelName }, SCOPE)
					}}
					channelId={this.props.channelEdit}
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
				{this.props.showCPDetailsModal && (
					<ChannelParticipationModal
						channelInfo={this.props.channelInfo}
						details={this.props.details}
						onClose={this.closeCPDetailsModal}
					/>
				)}
				{this.props.showCPUnjoinModal && (
					<ChannelParticipationUnjoinModal
						channelInfo={this.props.channelInfo}
						details={this.props.details}
						onComplete={this.props.unJoinComplete}
						onClose={this.closeCPUnjoinModal}
					/>
				)}
				{this.props.joinChannelModal && (
					<JoinOSNChannelModal
						onClose={() => {
							this.props.updateState(SCOPE, {
								joinChannelModal: false,
							});
						}}
						onComplete={() => {
							//this.hideJoinChannelModal();
							//this.props.showSuccess('nodes_added_successfully', {}, SCOPE);
							//this.getChannel(() => {
							//	this.getChannelDetails();
							//});
						}}
						selectedCluster={this.props.details}
						joinChannelDetails={this.props.joinChannelDetails}
					/>
				)}
			</div>
		);
	}
}

const dataProps = {
	channelList: PropTypes.object,
	disableSubmit: PropTypes.bool,
	channelInfo: PropTypes.object,
	selectedNode: PropTypes.object,
	loading: PropTypes.bool,
	showCPDetailsModal: PropTypes.bool,
	showEditChannelModal: PropTypes.bool,
	showCPUnjoinModal: PropTypes.bool,
	joinChannelModal: PropTypes.bool,
	drillDown: PropTypes.bool,
	joinChannelDetails: PropTypes.object,
	members: PropTypes.array,
	ordererMembers: PropTypes.array,
	editLoading: PropTypes.bool,
	peerList: PropTypes.array,
	ordererList: PropTypes.array,
	channelEdit: PropTypes.string,
	peerName: PropTypes.string,
	showError: PropTypes.func,
};

ChannelParticipationDetails.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	unJoinComplete: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
		showError,
		showSuccess,
	}
)(withLocalize(ChannelParticipationDetails));
