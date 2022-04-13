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
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import emptyImage from '../../assets/images/empty_channels.svg';
import { clearNotifications, showBreadcrumb, showError, showInfo, showSuccess, showWarning, updateState } from '../../redux/commonActions';
import ChannelApi from '../../rest/ChannelApi';
import { OrdererRestApi } from '../../rest/OrdererRestApi';
import { PeerRestApi } from '../../rest/PeerRestApi';
import SignatureRestApi from '../../rest/SignatureRestApi';
import Helper from '../../utils/helper';
import ChannelModal from '../ChannelModal/ChannelModal';
import ImportOrdererModal from '../ImportOrdererModal/ImportOrdererModal';
import ImportPeerModal from '../ImportPeerModal/ImportPeerModal';
import ItemContainer from '../ItemContainer/ItemContainer';
import ItemTileLabels from '../ItemContainerTile/ItemTileLabels/ItemTileLabels';
import JoinChannelModal from '../JoinChannelModal/JoinChannelModal';
import Logger from '../Log/Logger';
import PageContainer from '../PageContainer/PageContainer';
import PageHeader from '../PageHeader/PageHeader';
import SVGs from '../Svgs/Svgs';
import ConfigBlockApi from '../../rest/ConfigBlockApi';
import { TrashCan20 } from '@carbon/icons-react/es';

const SCOPE = 'channels';
const Log = new Logger(SCOPE);
const RETRY_LIMIT = 40000;
let loading_peers = [];

class ChannelComponent extends Component {
	constructor(props) {
		super(props);
		this.props.updateState(SCOPE, {
			allChannels: [],
			filteredChannels: [],
		});
	}

	componentDidMount() {
		this.mounted = true;
		this.props.showBreadcrumb('channels', {}, this.props.history.location.pathname, true);
		this.getAllPeerChannels();
		this.getAllPeers();
		this.getAllOrderers();
		this.getAllOrdererChannels();
		this.props.updateState(SCOPE, {
			channelName: '',
			loadingPeers: [],
			feature_flags: this.props.feature_flags,
			selectedConfigBlock: null,
		});
	}

	isVisibleCreateRequest(req) {
		if (!req.ccd && !req.json_diff && req.status === 'closed' && req.visibility !== 'archive') {
			return true;
		}
		return false;
	}

	componentDidUpdate(prevProps) {
		if (this.props.channelList) {
			let changed = false;
			// get list of previous pending channels
			const previous_tx_ids = {};
			if (prevProps.signature_requests) {
				prevProps.signature_requests.forEach(prevReq => {
					if (this.isVisibleCreateRequest(prevReq)) {
						previous_tx_ids[prevReq.tx_id] = true;
					}
				});
			}
			for (let i = 0; i < _.size(this.props.signature_requests) && !changed; i++) {
				const current = this.props.signature_requests[i];
				if (this.isVisibleCreateRequest(current)) {
					if (!previous_tx_ids[current.tx_id]) {
						// new request is visible
						changed = true;
					}
				} else {
					if (previous_tx_ids[current.tx_id]) {
						// request is no longer visible
						changed = true;
					}
				}
			}
			if (changed) {
				this.populatePendingChannels(this.props.channelList);
			}
		}
	}

	componentWillUnmount() {
		this.mounted = false;
		this.props.clearNotifications(SCOPE);
		this.props.updateState(SCOPE, {
			allChannels: [],
			filteredChannels: [],
		});
		for (let p in loading_peers) {
			this.props.clearNotifications(loading_peers[p].id);
		}
		clearTimeout(this.successTimeout);
		clearTimeout(this.errorTimeout);
	}

	async getCreateChannelRequests() {
		let requests = [];
		if (this.props.signature_requests && this.props.signature_requests.length) {
			this.props.signature_requests.forEach(req => {
				if (this.isVisibleCreateRequest(req)) {
					requests.push(req);
				}
			});
		} else {
			requests = await SignatureRestApi.getCreateChannelRequests();
		}
		return requests;
	}

	populatePendingChannels = joinedChannels => {
		OrdererRestApi.getOrderers(false).then(async orderers => {
			if (!this.mounted) {
				return;
			}
			// Build list that includes all raft nodes from all the console ordering services
			let all_nodes = [];
			orderers.forEach(orderer => {
				if (_.has(orderer, 'raft')) {
					orderer.raft.forEach(x => all_nodes.push(x));
				} else {
					all_nodes.push(orderer);
				}
			});

			const pendingChannels = [];
			// Get pending channels from notifications instead of local storage
			let signature_requests = await this.getCreateChannelRequests();
			signature_requests.forEach(notification => {
				let notification_orderers = [];
				if (_.has(notification, 'consenters')) {
					notification.consenters.forEach(url => {
						let orderer_details = all_nodes.find(x => _.toLower(x.backend_addr) === _.toLower(url));
						if (orderer_details) {
							notification_orderers.push(orderer_details);
						} else {
							notification_orderers.push({ backend_addr: url, name: url });
						}
					});
				} else {
					// If there were pending tiles before migrating to 2.1.3, handle them the old way so that we dont loose the tile after migration
					notification.orderers.forEach(url => {
						let orderer_details = all_nodes.find(x => {
							const url1 = x.url2use.substring(x.url2use.indexOf('/grpcwp/') + 8); // Proxy ports have changed, so compare only url after /grpcwp/
							const url2 = url.indexOf('/grpcwp/') > 0 ? url.substring(url.indexOf('/grpcwp/') + 8) : url;
							return _.toLower(decodeURIComponent(url1)) === _.toLower(decodeURIComponent(url2));
						});
						if (orderer_details) {
							notification_orderers.push(orderer_details);
						} else {
							notification_orderers.push({ backend_addr: url, name: url });
						}
					});
				}
				let matchingJoinedChannel =
					joinedChannels && joinedChannels.length
						? joinedChannels.find(channel => {
							let allChannelOrderers = [];
							if (channel.orderers) {
								channel.orderers.forEach(orderer => {
									if (_.has(orderer, 'raft')) {
										orderer.raft.forEach(y => allChannelOrderers.push(y));
									} else {
										allChannelOrderers.push(orderer);
									}
								});
							}
							let joinedChannelOrderers = allChannelOrderers.map(orderer => (orderer.backend_addr ? orderer.backend_addr : orderer.name));
							let pendingChannelOrderers = notification_orderers
								? notification_orderers.map(orderer => (orderer ? (orderer.backend_addr ? orderer.backend_addr : orderer.name) : ''))
								: [];
							let match = channel.name === notification.channel && _.intersection(pendingChannelOrderers, joinedChannelOrderers).length > 0;
							return match;
						})
						: null;
				if (!matchingJoinedChannel) {
					pendingChannels.push({
						id: notification.channel,
						name: notification.channel,
						orderers: notification_orderers,
						pending: true,
					});
				}
			});

			let allChannels = _.size(joinedChannels) > 0 ? joinedChannels.concat(pendingChannels) : pendingChannels;
			// Filter out the pending channels whose orderers are not imported in this console
			let filteredChannels = [];
			if (_.size(all_nodes) > 0) {
				const all_nodes_grpcurls = all_nodes.map(x => x.grpcwp_url); // To support older notifications that dont have consenters data
				const all_nodes_backendaddr = all_nodes.map(x => x.backend_addr);
				const all_nodes_url2use = all_nodes.map(x => x.url2use);
				const consoleOrdererAddresses = all_nodes_backendaddr.concat(all_nodes_grpcurls).concat(all_nodes_url2use);

				filteredChannels = allChannels.filter(channel => {
					let channelOrdererAddresses = channel.orderers.map(x => x.backend_addr);
					return channel.pending ? _.intersection(consoleOrdererAddresses, channelOrdererAddresses).length > 0 : channel;
				});
			} else {
				filteredChannels = allChannels.filter(channel => {
					return channel.pending ? false : channel;
				});
			}
			// Pending tile should show only one associated orderer(which includes all the raft nodes)
			pendingChannels.forEach(pc => {
				let pc_cluster_ids = pc.orderers.map(x => x.cluster_id);
				orderers.forEach(orderer => {
					if (pc_cluster_ids.includes(orderer.cluster_id)) {
						pc.orderers = [orderer];
					}
				});
			});

			this.props.updateState(SCOPE, {
				allChannels,
				filteredChannels,
				loading: false,
			});
			Log.debug('All channels:', allChannels);
			Log.debug('Filtered channels:', filteredChannels);
		});
	};

	getAllPeerChannels = () => {
		this.props.updateState(SCOPE, { loading: true, orderer_loading: true });
		ChannelApi.getAllChannels()
			.then(channelResp => {
				if (!this.mounted) {
					return;
				}
				let channelList = channelResp.channels;
				if (channelResp.errors) {
					channelResp.errors.forEach(error => {
						if (error.grpc_resp && error.grpc_resp.statusMessage && error.grpc_resp.statusMessage.indexOf('access denied') > -1) {
							this.props.showError('error_peer_channels', { peerName: error.name }, SCOPE, 'error_peer_channels_access');
						} else if (error.message_key) {
							this.props.showError(error.message_key, { peerName: error.name }, SCOPE);
						} else {
							//This is where the error occurs

							//Check health?
							this.timestamp = new Date().getTime();
							let peer;
							for (let p in this.props.peers) {
								if (this.props.peers[p].id === error.id) {
									peer = this.props.peers[p];
								}
							}
							loading_peers.push(peer.id);
							let loading = this.props.loadingPeers;
							if (window.location.pathname === '/channels') {
								this.props.showInfo('still_loading_peer', { peerName: error.name }, error.id, undefined, undefined, true);
							}

							loading.push(peer.id);

							this.errorTimeout = setTimeout(() => {
								// after 30 seconds, if we still do not have a response, show
								// the not available message
								this.props.clearNotifications(error.id);
								if (this.mounted && this.timestamp) {
									this.props.showError('error_peer_channels', { peerName: error.name }, error.name);
								}
							}, 45000);

							this.checkHealth(peer);
						}
					});
				}
				// load block height
				if (channelList.length > 0) {
					async.eachLimit(
						channelList,
						6,
						(channel, cb_info) => {
							PeerRestApi.getChannelInfoFromPeer(channel.peers[0].id, channel.id).then(resp => {
								if (!this.mounted) {
									return;
								}
								if (resp && resp.height) {
									channel.height = resp.height;
								}
								cb_info();
							});
						},
						error => {
							if (!this.mounted) {
								return;
							}
							//complete
							this.props.updateState(SCOPE, { channelList });
							this.populatePendingChannels(channelList);
						}
					);
				} else {
					// no channels, so just get the pending list
					this.props.updateState(SCOPE, { channelList });
					this.populatePendingChannels(channelList);
				}
			})
			.catch(error => {
				Log.error(error);
				this.props.updateState(SCOPE, { loading: false });
			});
	};

	checkHealth(peer) {
		PeerRestApi.checkHealth(peer)
			.then(() => {
				this.timestamp = 0;
				if (!this.mounted) {
					return;
				}
				let loadingP = this.props.loadingPeers;
				if (loadingP.indexOf(peer.id) >= 0) loadingP.splice(loadingP.indexOf(peer.id), 1);
				this.props.updateState({
					loadingPeers: loadingP,
				});
				this.props.clearNotifications(peer.id);
				if (window.location.pathname === '/channels') {
					this.props.showSuccess('success_loading_peer', { peerName: peer.name }, SCOPE);
				}
			})
			.catch(error => {
				Log.error(error);
				if (!this.mounted) {
					return;
				}
				const timestamp = new Date().getTime();
				if (timestamp - this.timestamp < RETRY_LIMIT) {
					this.props.updateState(SCOPE, { notAvailable: true });
					this.successTimeout = setTimeout(() => {
						this.checkHealth(peer);
					}, 1000);
					return;
				}
			});
	}

	getAllPeers = () => {
		PeerRestApi.getPeers()
			.then(peers => {
				if (peers) {
					this.props.updateState(SCOPE, {
						peers,
					});
				}
			})
			.catch(error => {
				if (!this.mounted) {
					return;
				}
				Log.error(error);
				this.props.showError('error_peers', {}, SCOPE);
				this.props.updateState(SCOPE, { joinInProgress: false });
			});
	};

	getAllOrderers = () => {
		OrdererRestApi.getOrderers()
			.then(orderers => {
				if (orderers) {
					this.props.updateState(SCOPE, {
						orderers: orderers,
					});
				}
			})
			.catch(error => {
				if (!this.mounted) {
					return;
				}
				Log.error(error);
				this.props.showError('error_orderers', {}, SCOPE);
			});
	};

	buildCustomTile(channel) {
		const translate = this.props.translate;
		return (
			<div className="ibp-channel-tile-stats">
				<div className="ibp-channels-orderer">
					<div>{channel.orderers ? channel.orderers.map(orderer => (orderer.cluster_name ? orderer.cluster_name : orderer.name)).join(', ') : ''}</div>
				</div>
				<ItemTileLabels
					certificateWarning={channel.cert_warning}
					custom={
						<div>
							<div className="ibp-channels-blocks">
								{!channel.pending && (
									<div className="ibp-channels-block-text">
										{channel.height ? channel.height : <div className="ibp-channel-loading-item" />}{' '}
										{channel.height ? (channel.height === 1 ? translate('block') : translate('blocks')) : ''}
									</div>
								)}
							</div>
							{channel.pending && (
								<div className="ibp-pending-channel-container">
									<p className="ibp-pending-channel-label">{translate('pending_channel_message')}</p>
									<SVGs type="clock"
										extendClass={{ 'ibp-pending-tile-clock': true }}
									/>
								</div>
							)}
						</div>
					}
				/>
			</div>
		);
	}

	// build the channel tiles for orderers
	buildJoinOrdererTile(channel) {
		const translate = this.props.translate;
		// dsh todo - don't use extra_consenter_data, pull names from os data we have...
		const consenterClusterNames = channel.extra_consenter_data ? channel.extra_consenter_data.map(orderer => orderer._cluster_name).join(', ') : '';
		return (
			<div className="ibp-channel-tile-stats">
				<div className="ibp-channels-orderer">
					<div>{consenterClusterNames}</div>
					<div className="ibp-channels-del-channel"
						onClick={() => {
							this.removeConfigBlock(channel.id);
							return false;
						}}
					>
						<TrashCan20 />
					</div>
				</div>
				<ItemTileLabels
					certificateWarning={channel.cert_warning}
					custom={
						<div>
							<div className="ibp-channels-blocks">
								{!channel.pending && (
									<div className="ibp-channels-block-text">
										{channel.height ? channel.height : <div className="ibp-channel-loading-item" />}{' '}
										{channel.height ? (channel.height === 1 ? translate('block') : translate('blocks')) : ''}
									</div>
								)}
							</div>
							{channel.pending && (
								<div className="ibp-pending-channel-container">
									<SVGs type="clock"
										extendClass={{ 'ibp-pending-tile-clock': true }}
									/>
									<span className="ibp-pending-channel-label">{translate('pending_channel_message_orderer')}</span>
								</div>
							)}
						</div>
					}
				/>
			</div>
		);
	}

	showJoinChannelModal = (peers, orderers, channel, pending) => {
		this.props.updateState(SCOPE, {
			joinChannelModal: true,
			orderers,
			peers,
			channelName: channel,
			isPending: pending,
		});
	};

	hideJoinChannelModal = () => {
		this.props.updateState(SCOPE, {
			channelName: '',
			joinChannelModal: false,
			joinInProgress: false,
		});
	};

	showImportOrdererModal = peers => {
		this.props.updateState(SCOPE, {
			importOrdererModal: true,
			peers,
		});
	};

	hideImportOrdererModal = () => {
		this.props.updateState(SCOPE, {
			importOrdererModal: false,
			joinInProgress: this.props.joinChannelModal,
		});
	};

	hideCreateChannelModal = () => {
		this.props.updateState(SCOPE, {
			createChannelModal: false,
			selectedConfigBlock: null,
		});
	};

	showImportPeerModal = orderers => {
		this.props.updateState(SCOPE, {
			importPeerModal: true,
			orderers,
		});
	};

	hideImportPeerModal = () => {
		this.props.updateState(SCOPE, {
			importPeerModal: false,
			joinInProgress: this.props.importOrdererModal || this.props.joinChannelModal,
		});
	};

	createChannel = (selectedConfigBlock) => {
		console.log('dsh99 selectedConfigBlock?', selectedConfigBlock);
		this.props.updateState(SCOPE, {
			selectedConfigBlock: selectedConfigBlock,
			createChannelModal: true,
		});
	};

	joinChannel = () => {
		this.props.updateState(SCOPE, {
			joinInProgress: true,
		});
		PeerRestApi.getPeers()
			.then(peers => {
				if (!this.mounted) {
					return;
				}
				OrdererRestApi.getOrderers()
					.then(orderers => {
						if (!this.mounted) {
							return;
						}
						if (peers.length > 0) {
							if (orderers.length > 0) {
								this.showJoinChannelModal(peers, orderers, '', false);
							} else {
								this.showImportOrdererModal(peers);
							}
						} else {
							this.showImportPeerModal(orderers);
						}
					})
					.catch(error => {
						if (!this.mounted) {
							return;
						}
						Log.error(error);
						this.props.showError('error_orderers', {}, SCOPE);
						this.props.updateState(SCOPE, { joinInProgress: false });
					});
			})
			.catch(error => {
				if (!this.mounted) {
					return;
				}
				Log.error(error);
				this.props.showError('error_peers', {}, SCOPE);
				this.props.updateState(SCOPE, { joinInProgress: false });
			});
	};

	openChannelDetails = channel => {
		if (channel && channel.name) {
			this.props.updateState(SCOPE, {
				channelName: channel.name,
			});
		}
		if (!channel.pending) {
			this.props.history.push('/peer/' + encodeURIComponent(channel.peers[0].id) + '/channel/' + encodeURIComponent(channel.id) + window.location.search);
		} else {
			this.showJoinChannelModal(this.props.peers, channel.orderers, channel.name, true);
		}
	};

	// add blue action buttons on top of tile layout
	addPeerButtons() {
		const items = [];
		items.push({
			id: 'join_channel',
			text: 'join_channel',
			fn: this.joinChannel,
		});

		const osnadminFeatsEnabled = this.props.feature_flags ? this.props.feature_flags.osnadmin_feats_enabled : false;
		if (!osnadminFeatsEnabled) {
			return items.concat(this.addOSNButtons());
		} else {
			return items;
		}
	}

	// add blue action buttons on top of tile layout
	addOSNButtons() {
		const isCreateChannelFeatureAvailable = this.props.feature_flags ? this.props.feature_flags.create_channel_enabled : false;
		const items = [];
		if (isCreateChannelFeatureAvailable) {
			items.push({
				id: 'create_channel',
				text: 'create_channel',
				fn: () => {
					this.createChannel(null);
				}
			});
		}
		return items;
	}

	// get all channels for orderers (which includes joined channels and pending joins)
	getAllOrdererChannels = async () => {
		this.props.updateState(SCOPE, { orderer_loading: true });

		const config_blocks = await ConfigBlockApi.getAll();
		if (config_blocks && Array.isArray(config_blocks.blocks)) {
			for (let i in config_blocks.blocks) {
				config_blocks.blocks[i].name = config_blocks.blocks[i].channel;
				config_blocks.blocks[i].pending = true;
			}
		}
		console.log('dsh99 getAllOrdererChannels', config_blocks.blocks);

		this.props.updateState(SCOPE, { orderer_loading: false, orderer_channels: config_blocks.blocks });
	}

	// remove this pending join by removing the config block
	// dsh todo add confirmation box
	removeConfigBlock = async (id) => {
		console.log('dsh99 clicked removeConfigBlock', id);

		if (id && typeof id === 'string') {
			try {
				await ConfigBlockApi.delete(id);
			} catch (e) {
				return false;
			}
			await this.getAllOrdererChannels();		// refresh page after delete
			return false;
		}
	}

	render() {
		// dsh todo add feats flag and hide changes...

		let isCreateChannelFeatureAvailable = this.props.feature_flags ? this.props.feature_flags.create_channel_enabled : false;
		Log.debug('Create channel feature flag is ', isCreateChannelFeatureAvailable, this.props.feature_flags);

		const osnadminFeatsEnabled = this.props.feature_flags ? this.props.feature_flags.osnadmin_feats_enabled : false;
		return (
			<PageContainer setFocus={!this.props.loading}>
				<div className="bx--row">
					<div className="bx--col-lg-13">
						<PageHeader headerName="channels"
							staticHeader
						/>
						<div id="channels-container"
							className="ibp__channels--container"
						>
							{osnadminFeatsEnabled && (<ItemContainer
								emptyImage={emptyImage}
								emptyTitle="empty_channels_title"
								emptyMessage="empty_channels_text"
								containerTitle="osn_channels"
								containerTooltip="channels_desc_orderer"
								tooltipDirection="right"
								id="test__channels2--add--tile"
								itemId="orderer_channels"
								loading={this.props.orderer_loading}
								items={this.props.orderer_channels}
								listMapping={[
									{
										header: 'name',
										attr: 'name',
									},
									{
										header: 'block_height',
										attr: 'height',
									},
									{
										header: 'ordering_service_title',
										custom: channel => {
											return (
												<div>
													{channel.orderers.map((orderer, i) => (
														<>
															<span key={i}>{orderer.name}</span>
															{channel.orderers.length > 1 && channel.orderers.length !== i + 1 && ', '}
														</>
													))}
												</div>
											);
										},
									},
								]}
								select={(configBlockDoc) => {
									this.createChannel(configBlockDoc);
								}}
								tileMapping={{
									title: 'name',
									custom: data => {
										return this.buildJoinOrdererTile(data);
									},
								}}
								addItems={this.addOSNButtons()}
								disableAddItem={this.props.importPeerModal || this.props.importOrdererModal || this.props.joinChannelModal}
								largeTiles={true}
								splitTiles={isCreateChannelFeatureAvailable}
								isLink
								maxTilesPerPagination={10}
							/>)}

							<ItemContainer
								emptyImage={emptyImage}
								emptyTitle="empty_channels_title"
								emptyMessage="empty_channels_text"
								containerTitle="joined_channels"
								containerTooltip="channels_desc"
								tooltipDirection="right"
								id="test__channels--add--tile"
								itemId="channels"
								loading={this.props.loading}
								items={this.props.channelList && this.props.orderers ? this.props.filteredChannels : this.props.allChannels}
								listMapping={[
									{
										header: 'name',
										attr: 'name',
									},
									{
										header: 'block_height',
										attr: 'height',
									},
									{
										header: 'ordering_service_title',
										custom: channel => {
											return (
												<div>
													{channel.orderers.map((orderer, i) => (
														<>
															<span key={i}>{orderer.name}</span>
															{channel.orderers.length > 1 && channel.orderers.length !== i + 1 && ', '}
														</>
													))}
												</div>
											);
										},
									},
								]}
								select={this.openChannelDetails}
								tileMapping={{
									title: 'name',
									custom: data => {
										return this.buildCustomTile(data);
									},
								}}
								addItems={this.addPeerButtons()}
								disableAddItem={this.props.importPeerModal || this.props.importOrdererModal || this.props.joinChannelModal}
								largeTiles={true}
								splitTiles={isCreateChannelFeatureAvailable}
								isLink
								maxTilesPerPagination={10}
							/>
						</div>
						{this.props.importPeerModal && (
							<ImportPeerModal
								onClose={this.hideImportPeerModal}
								onComplete={peers => {
									if (this.props.orderers.length > 0) {
										this.showJoinChannelModal(peers, this.props.orderers, '', false);
									} else {
										this.showImportOrdererModal(peers);
									}
								}}
								parentScope={SCOPE}
								joinChannel={true}
							/>
						)}
						{this.props.importOrdererModal && (
							<ImportOrdererModal
								onClose={this.hideImportOrdererModal}
								onComplete={orderers => {
									this.showJoinChannelModal(this.props.peers, orderers, '', false);
								}}
								joinChannel={true}
							/>
						)}
						{this.props.joinChannelModal && (
							<JoinChannelModal
								onClose={this.hideJoinChannelModal}
								onComplete={channelName => {
									this.props.showSuccess('channel_join_request_submitted', { channelName }, SCOPE, null, true);
									this.props.updateState(SCOPE, { filteredChannels: [], allChannels: [] });
									this.getAllPeerChannels();
								}}
								peers={this.props.peers}
								orderers={this.props.orderers}
								orderer={(this.props.isPending && Array.isArray(this.props.orderers) && this.props.orderers.length > 0) ? this.props.orderers[0] : null}
								pendingChannelName={this.props.isPending ? this.props.channelName : ''}
								isPending={this.props.isPending}
							/>
						)}
						{this.props.createChannelModal && (
							<ChannelModal
								useConfigBlock={this.props.selectedConfigBlock}
								onClose={this.hideCreateChannelModal}
								onComplete={(channelName, isOrdererSignatureNeeded) => {
									if (isOrdererSignatureNeeded) {
										this.props.showSuccess('channel_creation_request_submitted_to_orderer', { channelName }, SCOPE, null, true);
									} else {
										this.props.showSuccess('channel_creation_request_submitted', { channelName }, SCOPE, null, true);
									}
									this.props.updateState(SCOPE, { filteredChannels: [], allChannels: [] });
									this.getAllPeerChannels();
								}}
							/>
						)}
					</div>
				</div>
			</PageContainer>
		);
	}
}

const dataProps = {
	channelList: PropTypes.array,
	channelName: PropTypes.string,
	showChannelDetails: PropTypes.bool,
	history: PropTypes.object,
	loading: PropTypes.bool,
	orderer_loading: PropTypes.bool,
	orderer_channels: PropTypes.array,
	joinChannelModal: PropTypes.bool,
	importOrdererModal: PropTypes.bool,
	createChannelModal: PropTypes.bool,
	importPeerModal: PropTypes.bool,
	peers: PropTypes.array,
	orderers: PropTypes.array,
	joinInProgress: PropTypes.bool,
	isPending: PropTypes.bool,
	allChannels: PropTypes.array,
	filteredChannels: PropTypes.array,
	loadingPeers: PropTypes.array,
	selectedConfigBlock: PropTypes.object,
};

ChannelComponent.propTypes = {
	...dataProps,
	showError: PropTypes.func,
	showWarning: PropTypes.func,
	showInfo: PropTypes.func,
	updateState: PropTypes.func,
	showSuccess: PropTypes.func,
	clearNotifications: PropTypes.func,
	showBreadcrumb: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['feature_flags'] = state['settings'] ? state['settings']['feature_flags'] : null;
		newProps['signature_requests'] = state['signatureCollection'] ? state['signatureCollection']['requests'] : [];
		newProps['host_url'] = state['settings'] ? state['settings']['host_url'] : [];
		return newProps;
	},
	{
		clearNotifications,
		showBreadcrumb,
		showError,
		showWarning,
		showInfo,
		updateState,
		showSuccess,
	}
)(withLocalize(ChannelComponent));
