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
import { updateState } from '../../redux/commonActions';
import { ChannelParticipationApi } from '../../rest/ChannelParticipationApi';
import IdentityApi from '../../rest/IdentityApi';
import Helper from '../../utils/helper';
import ItemContainer from '../ItemContainer/ItemContainer';
import Logger from '../Log/Logger';
import SVGs from '../Svgs/Svgs';
import ChannelParticipationModal from './ChannelParticipationModal';
import ChannelParticipationUnjoinModal from './ChannelParticipationUnjoinModal';
import JoinOSNChannelModal from '../JoinOSNChannelModal/JoinOSNChannelModal';
import _ from 'lodash';
import emptyImage from '../../assets/images/empty_channels.svg';

const naturalSort = require('javascript-natural-sort');
const SCOPE = 'ChannelParticipationDetails';
const Log = new Logger(SCOPE);

class ChannelParticipationDetails extends Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			showCPDetailsModal: false,
			showCPUnjoinModal: false,
			createChannelModal: false,
		});
	}

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
									}
								}]

								: []
						}
						widerTiles
					/>)
				}
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
	channelInfo: PropTypes.object,
	selectedNode: PropTypes.object,
	showCPDetailsModal: PropTypes.bool,
	showCPUnjoinModal: PropTypes.bool,
	joinChannelModal: PropTypes.bool,
	drillDown: PropTypes.bool,
	joinChannelDetails: PropTypes.object,
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
	}
)(withLocalize(ChannelParticipationDetails));
