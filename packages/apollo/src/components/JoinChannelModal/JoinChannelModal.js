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
import { ToggleSmall } from 'carbon-components-react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import { withTranslation, Trans } from 'react-i18next';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import ChannelApi from '../../rest/ChannelApi';
import { EventsRestApi } from '../../rest/EventsRestApi';
import { MspRestApi } from '../../rest/MspRestApi';
import { OrdererRestApi } from '../../rest/OrdererRestApi';
import { PeerRestApi } from '../../rest/PeerRestApi';
import Helper from '../../utils/helper';
import NodeStatus from '../../utils/status';
import ConfigOverride from '../ConfigOverride/ConfigOverride';
import Form from '../Form/Form';
import ImportantBox from '../ImportantBox/ImportantBox';
import Logger from '../Log/Logger';
import SidePanelWarning from '../SidePanelWarning/SidePanelWarning';
import Wizard from '../Wizard/Wizard';
import WizardStep from '../WizardStep/WizardStep';

const SCOPE = 'joinChannelModal';
const Log = new Logger(SCOPE);

class JoinChannelModal extends React.Component {
	async componentDidMount() {
		this.mounted = true;
		const orderers = await OrdererRestApi.getOrderers(true);
		let channel = this.props.isPending ? this.props.pendingChannelName : this.props.isAddingNode ? this.props.existingChannel : '';
		this.props.updateState(SCOPE, {
			orderers,
			channel,
			disableSubmit: true,
			submitting: false,
			peerValid: false,
			filteredPeers: this.props.peers,
			peerList: [],
			make_anchor_peer: true,
			consenterMappingRequired: false,
			consenterMappingPeers: [],
			addressOverrides: [],
			channel_warning_20_details: [],
			channel_warning_20: false,
			loading: false
		});
		let orderer = this.props.orderer;
		if (this.props.isAddingNode && this.props.existingOrderer) {
			orderer = this.props.existingOrderer;
			this.props.updateState(SCOPE, {
				orderer,
			});
		}
		if (!this.props.peer && orderer) {
			try {
				await this.filterPeers(channel, orderer);
			} catch (error) {
				Log.error(error);
			}
		}
	}
	componentWillUnmount() {
		this.mounted = false;
		if (!this.props.isPending) {
			this.props.updateState(SCOPE, {
				channel: '',
				filteredPeers: null,
				peerValid: false,
			});
		}
	}

	async calculateCapabilityWarning(channel_config, orderer, selectedPeers, channel) {
		let all_warning_20 = false;
		let all_warning_20_details = [];

		try {
			const applicationCapabilities = _.get(channel_config, 'channel_group.groups.Application.values.Capabilities.value.capabilities', '');
			const channelCapabilities = _.get(channel_config, 'channel_group.values.Capabilities.value.capabilities', '');
			const applicationCapability = Helper.getCapabilityHighestVersion(applicationCapabilities);
			const channelCapability = Helper.getCapabilityHighestVersion(channelCapabilities);
			if (applicationCapability.indexOf('V2') === 0 || channelCapability.indexOf('V2') === 0) {
				// Block from proceeding if updating capability to 2.0 but peer binaries are not at version 2.0
				selectedPeers.forEach(peer => {
					const { channel_warning_20, channel_warning_20_details } = Helper.validateCapability20Update(
						applicationCapability,
						null,
						channelCapability,
						[peer],
						null
					);
					all_warning_20 = all_warning_20 || channel_warning_20;
					channel_warning_20_details.forEach(details => {
						if (details.type === 'application') {
							details.channelVersion = applicationCapability;
						} else if (details.type === 'channel') {
							details.channelVersion = channelCapability;
						}
					});
					all_warning_20_details = all_warning_20_details.concat(channel_warning_20_details);
				});
			}
			this.props.updateState(SCOPE, {
				channel_warning_20: all_warning_20,
				channel_warning_20_details: all_warning_20_details,
			});
		} catch (e) {
			Log.error('An error occurred comparing peer with channel capability levels', e);
		}
	}

	// Check consenters for possibly issues
	async checkConsenters(genesis_config, current_config, orderer) {
		// raft based orderers... we could look at OrdererAddresses for raft also, but not sure how reliable that is...
		let genesis_consenters = _.get(genesis_config, 'channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters');
		if (!genesis_consenters) {
			// look for kafka based orderers
			genesis_consenters = [];
			const l_genesis_consenters = _.get(genesis_config, 'channel_group.values.OrdererAddresses.value.addresses', []);
			l_genesis_consenters.forEach(lcs => {
				const lcsArray = lcs.split(':');
				genesis_consenters.push({ host: lcsArray[0], port: lcsArray[1] });
			});
		}
		const current_consenters = _.get(current_config, 'channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters');
		const channel_orderer_addresses = _.get(current_config, 'channel_group.values.OrdererAddresses.value.addresses');
		const selectedOrderer = orderer ? orderer : this.props.orderer;
		this.props.updateState(SCOPE, {
			channel_orderer_addresses,
		});
		let consenterMappingRequired = true;
		genesis_consenters.forEach(gc => {
			current_consenters.forEach(cc => {
				if (gc.host === cc.host && gc.port === cc.port) {
					consenterMappingRequired = false;
				}
			});
		});
		let l_addressOverrides = null;
		if (consenterMappingRequired) {
			const msps = await MspRestApi.getAllMsps();
			if (selectedOrderer.raft) {
				selectedOrderer.raft.forEach(node => {
					if (l_addressOverrides) {
						return;
					}
					current_consenters.forEach(cc => {
						const addr = cc.host + ':' + cc.port;
						if (l_addressOverrides === null && node.backend_addr === addr) {
							msps.forEach(msp => {
								if (msp.msp_id === node.msp_id) {
									let caCertsFile = '';
									msp.tls_root_certs.forEach(cert => {
										caCertsFile = caCertsFile.concat(atob(cert));
									});
									msp.tls_intermediate_certs &&
										msp.tls_intermediate_certs.forEach(cert => {
											caCertsFile = caCertsFile.concat(atob(cert));
										});
									l_addressOverrides = [
										{
											from: genesis_consenters[0].host + ':' + genesis_consenters[0].port,
											to: cc.host + ':' + cc.port,
											caCertsFile: btoa(caCertsFile),
										},
									];
								}
							});
						}
					});
				});
			}
		}
		if (l_addressOverrides === null) {
			l_addressOverrides = [
				{
					from: genesis_consenters[0].host + ':' + genesis_consenters[0].port,
					to: current_consenters[0].host + ':' + current_consenters[0].port,
					caCertsFile: '',
				},
			];
		}
		let addressOverrides = {};
		_.set(addressOverrides, 'peer.deliveryclient.addressOverrides', l_addressOverrides);
		this.props.updateState(SCOPE, {
			consenterMappingRequired,
			addressOverrides,
		});
	}

	// Check selected peers for required mappings
	async checkPeerMappings(selectedPeers) {
		if (!selectedPeers || selectedPeers.length === 0) {
			this.props.updateState(SCOPE, {
				channel_warning_20: false,
				channel_warning_20_details: [],
			});
			return;
		}
		let selectedChannel = this.props.channel;
		let selectedOrderer = this.props.orderer;
		this.props.updateState(SCOPE, { submitting: true });
		// get identity from peer to get blocks from orderer (since peer org won't have orderer identity)
		const peerDetails = await PeerRestApi.getPeerDetails(selectedPeers[0].id, true);
		let identityInfo = {
			msp_id: peerDetails.msp_id,
			private_key: peerDetails.private_key,
			cert: peerDetails.cert,
		};
		let options = {
			ordererId: selectedOrderer.node_id,
			channelId: selectedChannel,
			configtxlator_url: this.props.configtxlator_url,
			identityInfo,
		};
		let current_config = null;
		let genesis_config = null;
		try {
			current_config = await OrdererRestApi.getChannelConfig(options);
			genesis_config = await OrdererRestApi.getChannelConfig({ ...options, genesis: true, altUrls: null });
			await this.checkConsenters(genesis_config, current_config, selectedOrderer);
		} catch (e) {
			Log.error('An error occurred getting config', e);
			this.props.updateState(SCOPE, { submitting: false });
			let title = null;
			if (e.message_key) {
				title = e.message_key;
			} else if (e.grpc_resp && e.grpc_resp.status === 404) {
				title = 'channel_not_found_under_orderer';
			}
			return Promise.reject({
				details: e,
				title,
				translateOptions: {
					channelId: selectedChannel,
					ordererId: selectedOrderer.node_id,
					peerName: peerDetails.display_name
				},
			});
		}
		this.props.updateState(SCOPE, { submitting: false });
		let gcs = _.get(genesis_config, 'channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters');
		if (!gcs) {
			// look for kafka based orderers
			gcs = [];
			const l_genesis_consenters = _.get(genesis_config, 'channel_group.values.OrdererAddresses.value.addresses', []);
			l_genesis_consenters.forEach(lcs => {
				const lcsArray = lcs.split(':');
				gcs.push({ host: lcsArray[0], port: lcsArray[1] });
			});
		}
		const ccs = _.get(current_config, 'channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters');
		let cmr = this.props.consenterMappingRequired;
		if (cmr) {
			let consenterMappingPeers = [];
			// check each peer for the required mapping
			selectedPeers.forEach(peer => {
				let found = false;
				let addressOverrides = _.get(peer, 'config_override.peer.deliveryclient.addressOverrides', []);
				addressOverrides.forEach(mapping => {
					gcs.forEach(gc => {
						const from_url = gc.host + ':' + gc.port;
						ccs.forEach(cc => {
							const to_url = cc.host + ':' + cc.port;
							if (mapping.from === from_url && mapping.to === to_url) {
								found = true;
							}
						});
					});
				});
				if (!found) {
					// if mapping not found, mark warning needed
					consenterMappingPeers.push(peer);
				}
			});
			this.props.updateState(SCOPE, { consenterMappingPeers });
		}
		await this.calculateCapabilityWarning(current_config, this.props.orderer, selectedPeers, this.props.channel);
	}

	async onChannelNext() {
		// fetch channel list and find out channel name and update existing member of channel into store to filter out peer selection list
		this.props.updateState(SCOPE, { loading: true });
		if (!this.props.existingChannel) {
			try {
				const { channels } = await ChannelApi.getAllChannels();
				const matchedChannel = channels.find(_channel => _channel.id === this.props.channel && _channel.orderers.some(_orderer => _orderer.node_id === this.props.orderer.node_id));

				let existingMembers = [];
				if (matchedChannel) {
					existingMembers = matchedChannel.peers;
				}

				this.props.updateState(SCOPE, { loading: false, existingMembers });
			} catch (error) {
				Log.error(error);
			}
		}
		return this.filterPeers();
	}

	// Filter out peers that do not belong to channel members
	async filterPeers(channel, orderer) {
		let selectedChannel = channel ? channel : this.props.channel;
		let selectedOrderer = orderer ? orderer : this.props.orderer;
		if (!selectedChannel || !selectedOrderer) {
			this.props.updateState(SCOPE, {
				peerList: [],
			});
			return;
		}
		this.props.updateState(SCOPE, { loading: true });
		if (this.props.peer) {
			await this.checkPeerMappings(this.props.peer);
		}
		// Find the channel members
		try {
			let options = {
				ordererId: selectedOrderer.node_id,
				channelId: selectedChannel,
				configtxlator_url: this.props.configtxlator_url
			};
			let config = await OrdererRestApi.getChannelConfig(options);
			let memberIds = this.props.existingMembers.map(x => x.id);
			let peers = this.props.peer ? this.props.peer : this.props.peers;
			peers = peers.filter(peer => !memberIds.includes(peer.id));


			if (config && config.channel_group) {
				let members = [];
				let orgNodes = config.channel_group.groups.Application.groups;
				let orgs = Object.keys(orgNodes);
				for (let i in orgs) {
					members.push(orgs[i]);
				}
				const finalPeers = members && members.length > 0 ? peers.filter(peer => members.includes(peer.msp_id)) : peers;
				return this.getNodeStatus(finalPeers);
			} else {
				const err = new Error('Channel not found in selected orderer');
				err.code = 'channel_not_found_under_orderer';

				throw err;
			}
		} catch (error) {
			this.props.updateState(SCOPE, { loading: false });
			Log.error('An error occurred when filtering peer list', error);
			return Promise.reject({
				title: error.code || 'error_join_channel_not_found',
				details: error,
				translateOptions: {
					channelId: selectedChannel,
					ordererId: selectedOrderer.node_id
				},
			});
		}
	}

	async getNodeStatus(peers) {
		Log.debug('Filtered peers: ', peers);
		if (peers && peers.length > 0 && peers.length <= 5) {
			// Check status only if less than 5 peers
			this.props.updateState(SCOPE, {
				peerList: peers,
			});
			await NodeStatus.getStatus(peers, SCOPE, 'peerList');
			this.props.updateState(SCOPE, { filteredPeers: peers, loading: false });
		} else {
			this.props.updateState(SCOPE, { filteredPeers: peers, loading: false });
		}
	}

	// If join fails, retry using the next orderer
	async retryJoin(peers, channel, orderers) {
		const orderer = orderers.pop();
		try {
			Log.debug('Attempting to join channel with: ', orderer);
			await PeerRestApi.joinChannel(peers, orderer, channel);
		} catch (error) {
			Log.error('Error occurred when joining channel: ', orderer, error);
			if (orderers.length > 0) {
				Log.debug('Try next orderer');
				return this.retryJoin(peers, channel, orderers);
			} else {
				throw error;
			}
		}
		return orderer; // Return orderer that worked, to be used next for adding anchor peer
	}

	async onSubmit() {
		let peers = this.props.peer ? this.props.peer : this.props.selectedPeers;
		let orderer;
		try {
			let allOrderers = [];
			if (_.has(this.props.orderer, 'raft')) {
				if (this.props.channel_orderer_addresses) {
					allOrderers = this.props.orderer.raft.filter(x => {
						return this.props.channel_orderer_addresses.includes(_.toLower(x.backend_addr));
					});
				} else {
					allOrderers = this.props.orderer.raft;
				}
			} else {
				allOrderers = [this.props.orderer];
			}

			// catch all if we don't find any orderers for some reason
			if (!Array.isArray(allOrderers) || allOrderers.length === 0) {
				allOrderers = [this.props.orderer];
			}

			orderer = await this.retryJoin(peers, this.props.channel, allOrderers);

			// send async event... don't wait
			EventsRestApi.sendJoinChannelEvent(this.props.channel, peers);
			if (this.props.make_anchor_peer) {
				try {
					await this.addAnchorPeers(peers, orderer);
					await new Promise(resolve => setTimeout(resolve, 3000));
					this.props.onComplete(this.props.channel);
				} catch (error) {
					this.props.onComplete(this.props.channel);
					return Promise.reject({
						title: 'error_add_anchor_peer_during_join',
						details: error,
					});
				}
			} else {
				this.props.onComplete(this.props.channel);
				// return after 3 seconds so that the peer has enough time to catchup
				await new Promise(resolve => setTimeout(resolve, 3000));
				return;
			}
		} catch (joinPeerError) {
			EventsRestApi.sendJoinChannelEvent(this.props.channel, peers, 'error');
			let error = joinPeerError.error;
			let peerName = joinPeerError.peer.display_name;
			Log.error(error);
			let msg = 'error_join_failed';
			// "chaincode error (status: 500, message: "JoinChain" request failed authorization check for channel
			// [varadchannel1]: [Failed verifying that proposal's creator satisfies local MSP principal during
			//  channelless check policy with policy [Admins]: [This identity is not an admin]])"
			if (
				error &&
				error.grpc_resp &&
				error.grpc_resp.statusMessage &&
				(error.grpc_resp.statusMessage.indexOf('This identity is not an admin') !== -1 ||
					error.grpc_resp.statusMessage.indexOf('Failed verifying that proposal\'s creator satisfies local MSP principal') !== -1)
			) {
				msg = 'error_join_failed1';
			}
			if (error.grpc_resp && error.grpc_resp.statusMessage && error.grpc_resp.statusMessage.indexOf('already exists') > -1) {
				msg = 'error_already_joined';
			}
			if (error.grpc_resp && error.grpc_resp.statusMessage && error.grpc_resp.statusMessage.indexOf('contains no code or message') > -1) {
				msg = 'error_join_failed_no_response';
			}
			if (error.grpc_resp && error.grpc_resp.status === 404) {
				msg = 'error_join_channel_not_found';
			}
			return Promise.reject({
				title: msg,
				details: error,
				translateOptions: {
					peerName: peerName,
					channelId: this.props.channel,
					ordererId: this.props.orderer.node_id
				},
			});
		}
	}

	async addAnchorPeers(peers, orderer) {
		const orgPeer = {};
		peers.forEach(peer => {
			orgPeer[peer.msp_id] = peer;
		});

		const details = [];
		Object.keys(orgPeer).forEach(org => {
			details.push(PeerRestApi.getPeerDetails(orgPeer[org].id, true));
		});
		try {
			let peerDetails = await Promise.all(details);
			let org_anchor_peers = {};
			peers.forEach(peer => {
				let orgCerts = peerDetails.find(x => x.msp_id === peer.msp_id);
				org_anchor_peers[peer.msp_id] = {
					anchor_peers: org_anchor_peers[peer.msp_id] ? [...org_anchor_peers[peer.msp_id].anchor_peers, peer.backend_addr] : [peer.backend_addr],
					client_cert_b64pem: orgCerts.cert,
					client_prv_key_b64pem: orgCerts.private_key,
				};
			});

			const anchorPromises = [];
			for (let org in org_anchor_peers) {
				let opts = {
					channel_id: this.props.channel,
					msp_id: org,
					configtxlator_url: this.props.configtxlator_url,
					orderer_host: orderer.url2use,
					client_cert_b64pem: org_anchor_peers[org].client_cert_b64pem,
					client_prv_key_b64pem: org_anchor_peers[org].client_prv_key_b64pem,
					anchor_peers: org_anchor_peers[org].anchor_peers,
				};
				anchorPromises.push(ChannelApi.addChannelAnchorPeers(opts));
			}
			let error = false;
			let resps = await Promise.all(anchorPromises);
			resps.forEach(resp => {
				Log.debug('Add anchor peer response:', resp);
				if (resp.message !== 'ok') {
					error = true;
				}
			});
			if (error) {
				return Promise.reject(error);
			}
		} catch (error2) {
			Log.error(error2);
			return Promise.reject(error2);
		}
	}

	onPeerChange = (change, valid) => {
		this.props.updateState(SCOPE, { peerValid: valid });
		this.checkPeerMappings(change.selectedPeers);
	};

	onChannelChange = async (change, valid) => {
		this.props.updateState(SCOPE, { disableSubmit: !valid });
	};

	toggleAnchorPeer = () => {
		this.props.updateState(SCOPE, { make_anchor_peer: !this.props.make_anchor_peer });
	};

	renderPeerMappingNeeded(translate) {
		if (!this.props.consenterMappingRequired) {
			return;
		}
		if (this.props.consenterMappingPeers.length === 0) {
			return;
		}
		const saas = [];
		const imported = [];
		this.props.consenterMappingPeers.forEach(peer => {
			if (peer.location === 'ibm_saas') {
				saas.push(peer);
			} else {
				imported.push(peer);
			}
		});
		const config_override = this.props.addressOverrides;
		return (
			<WizardStep type="WizardStep">
				<ImportantBox text="consenter_mapping_required" />
				{saas.length > 0 && (
					<div className="ibp-address-override-section">
						<p>{translate('peer_mapping_saas')}</p>
						{saas.map(peer => {
							return (
								<div className="ibp-peer-mapping"
									key={peer.id}
								>
									{peer.name}
								</div>
							);
						})}
					</div>
				)}
				{imported.length > 0 && (
					<div className="ibp-address-override-section">
						<p>{translate('peer_mapping_imported')}</p>
						{imported.map(peer => {
							return (
								<div className="ibp-peer-mapping"
									key={peer.id}
								>
									{peer.name}
								</div>
							);
						})}
					</div>
				)}
				<div className="ibp-address-override-section">
					<p>{translate('address_override_example')}</p>
					<ConfigOverride id="ibp-address-override"
						config_override={config_override}
						readOnly={true}
					/>
				</div>
			</WizardStep>
		);
	}

	renderSelectPeer(translate) {
		let notRunningPeers = [];
		let formattedPeers = [];
		if (this.props.filteredPeers) {
			this.props.filteredPeers.forEach(peer => {
				let matchingPeer = this.props.peerList ? this.props.peerList.find(x => x.id === peer.id) : null;
				if (matchingPeer && matchingPeer.status !== 'running') {
					notRunningPeers.push(peer.id);
				}
			});
			formattedPeers = this.props.filteredPeers.map(peer => {
				return { ...peer, name: peer.name + '(' + peer.msp_id + ')' };
			});
		}
		let isPeerContext = _.size(this.props.peer) > 0; // Join channel from peer details page
		return (
			<WizardStep
				type="WizardStep"
				headerDesc={
					<Trans>{this.props.isPending
						? translate('join_channel_step3_direct_desc', { channelName: this.props.channel })
						: this.props.isAddingNode
							? translate('add_node_to_channel_desc', { channelName: this.props.channel })
							: translate('join_channel_step3_desc', { channelName: this.props.channel })}</Trans>
				}
				headerLink={translate('_JOIN_CHANNEL_LINK', { DOC_PREFIX: this.props.docPrefix })}
				headerLinkText={translate('find_out_more')}
				tooltip={translate('select_peer_tooltip')}
				disableSubmit={
					(!isPeerContext && (!this.props.peerValid || _.size(this.props.filteredPeers) === 0)) || this.props.submitting || this.props.channel_warning_20
				}
			>
				{_.size(this.props.filteredPeers) > 0 || this.props.loading ? (
					<>
						<Form
							scope={SCOPE}
							id={SCOPE + '-peer'}
							fields={[
								{
									name: 'selectedPeers',
									type: 'multiselect',
									tooltip: 'join_channel_select_peers_tooltip',
									options: formattedPeers,
									required: true,
									loading: this.props.loading,
									disabledIds: notRunningPeers,
									disabledTooltip: 'choose_peers_tooltip',
								},
							]}
							onChange={this.onPeerChange}
						/>
						{!this.props.loading && (
							<div className="anchor-peer-toggle">
								<h4 className="settings-toggle-label">{translate('make_anchor_peers')}</h4>
								<div className="settings-toggle-inner">
									<ToggleSmall
										id="toggle-input"
										toggled={this.props.make_anchor_peer}
										onToggle={() => {
											this.toggleAnchorPeer();
										}}
										onChange={() => { }}
										aria-label={translate('make_anchor_peers')}
										labelA={translate('no')}
										labelB={translate('yes')}
									/>
								</div>
							</div>
						)}
						{!this.props.loading && !this.props.channel_warning_20 && <ImportantBox text="join_peer_imp_message"
							link="join_peer_imp_link"
						/>}
					</>
				) : (
					<ImportantBox text="no_more_peers_to_join" />
				)}
			</WizardStep>
		);
	}

	renderSelectOrderer(translate) {
		if (!this.props.orderers || this.props.isPending || (this.props.isAddingNode && this.props.existingOrderer)) {
			// skip step if orderer association exists
			return;
		}
		// dsh todo change this.props.orderer... to this.props.selectedOrderer
		return (
			<WizardStep
				type="WizardStep"
				headerDesc={translate('join_channel_step1_desc')}
				headerLink={translate('_JOIN_CHANNEL_LINK', { DOC_PREFIX: this.props.docPrefix })}
				headerLinkText={translate('find_out_more')}
				title={translate('select_orderer')}
				desc={translate('select_orderer_desc')}
				tooltip={translate('select_orderer_tooltip')}
				disableSubmit={!this.props.orderer}
			>
				<Form
					scope={SCOPE}
					id={SCOPE + '-orderer'}
					fields={[
						{
							name: 'orderer',
							type: 'dropdown',
							options: this.props.orderers,
						},
					]}
				/>
			</WizardStep>
		);
	}


	renderSelectChannel(translate) {
		if (this.props.hideChannelStep || this.props.isPending) {
			return;
		}
		return (
			<WizardStep
				type="WizardStep"
				headerDesc={translate('join_channel_step2_desc')}
				headerLink={translate('_JOIN_CHANNEL_LINK', { DOC_PREFIX: this.props.docPrefix })}
				headerLinkText={translate('find_out_more')}
				title={translate('select_channel')}
				disableSubmit={this.props.disableSubmit}
				onNext={() => this.onChannelNext()}
			>
				<Form
					scope={SCOPE}
					id={SCOPE + '-channel'}
					fields={[
						{
							name: 'channel',
							specialRules: Helper.SPECIAL_RULES_CHANNEL_NAME,
							required: true,
						},
					]}
					onChange={this.onChannelChange}
				/>
			</WizardStep>
		);
	}

	render() {
		const translate = this.props.t;
		return (
			<Wizard
				title="join_channel_title"
				onClose={this.props.onClose}
				onSubmit={() => this.onSubmit()}
				showSubmitSpinner={this.props.submitting}
				submitButtonLabel={translate('join_channel')}
			>
				{this.renderSelectOrderer(translate)}
				{!this.props.isAddingNode && this.renderSelectChannel(translate)}
				{this.renderSelectPeer(translate)}
				{this.renderPeerMappingNeeded(translate)}
				{!!this.props.channel_warning_20 && (
					<div className="ibp-channel20-warning">
						{!!this.props.channel_warning_20_details &&
							this.props.channel_warning_20_details.map((x, i) => {
								return (
									<div key={'channel_warning_' + i}>
										<SidePanelWarning
											title={translate(`channel_warning_20_join_peer_${x.type}`, {
												peer: x.nodes.map(node => node.name),
												peerVersion: Helper.prettyPrintVersion(x.nodes.map(node => node.version)),
												channelVersion: x.channelVersion,
											})}
										/>
									</div>
								);
							})}
					</div>
				)}
			</Wizard>
		);
	}
}

const dataProps = {
	channel: PropTypes.string,
	pendingChannelName: PropTypes.string,
	submitting: PropTypes.bool,
	disableSubmit: PropTypes.bool,
	orderers: PropTypes.array,
	orderer: PropTypes.object,
	channel_orderer_addresses: PropTypes.array,
	hideChannelStep: PropTypes.bool,
	peer: PropTypes.any,
	selectedPeers: PropTypes.any,
	peerValid: PropTypes.bool,
	filteredPeers: PropTypes.array,
	isPending: PropTypes.bool,
	loading: PropTypes.bool,
	peerList: PropTypes.array,
	make_anchor_peer: PropTypes.bool,
	consenterMappingRequired: PropTypes.bool,
	consenterMappingPeers: PropTypes.array,
	addressOverrides: PropTypes.array,
	channel_warning_20: PropTypes.bool,
	channel_warning_20_details: PropTypes.array,
	existingMembers: PropTypes.any,
	channelList: PropTypes.array,
	selectedChannel: PropTypes.any
};

JoinChannelModal.propTypes = {
	...dataProps,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
	updateState: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['CRN'] = state['settings'] ? state['settings']['CRN'] : null;
		newProps['userInfo'] = state['userInfo'] ? state['userInfo']['loggedInAs'] : null;
		newProps['configtxlator_url'] = state['settings']['configtxlator_url'];
		newProps['docPrefix'] = state['settings'] ? state['settings']['docPrefix'] : null;
		return newProps;
	},
	{
		updateState,
	}
)(withTranslation()(JoinChannelModal));
