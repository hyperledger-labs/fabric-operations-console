/*
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
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
import ItemTileLabels from '../ItemContainerTile/ItemTileLabels/ItemTileLabels';
import Logger from '../Log/Logger';
import SVGs from '../Svgs/Svgs';
import ChannelParticipationModal from './ChannelParticipationModal';
import ChannelParticipationUnjoinModal from './ChannelParticipationUnjoinModal';
import _ from 'lodash';

const naturalSort = require('javascript-natural-sort');
const SCOPE = 'ChannelParticipationDetails';
const Log = new Logger(SCOPE);

class ChannelParticipationDetails extends Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			showCPDetailsModal: false,
			showCPUnjoinModal: false,
		});
	}

	closeCPDetailsModal = () => {
		this.props.updateState(SCOPE, {
			showCPDetailsModal: false,
		});
	};

	openCPDetailsModal = async(channel) => {
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

	openCPUnjoinModal = async(channel) => {
		await this.loadChannelData(channel.name);
		this.props.updateState(SCOPE, {
			showCPUnjoinModal: true,
		});
	};

	loadChannelData = async(channelId) => {
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

	buildCustomTile = (channel) => {
		return (
			<div>
				{channel.nodes && channel.nodes.length > 1 && (
					<ItemTileLabels custom={`Nodes: ${channel.nodes.join(',')}`}/>
				)}
				<button className="ibp-orderer-channel-info"
					onClick={async() => await this.openCPDetailsModal(channel)}
				>
					<SVGs type="settings" />
				</button>
				<button className="ibp-orderer-channel-unjoin"
					onClick={async() => await this.openCPUnjoinModal(channel)}
				>
					<SVGs type="trash" />
				</button>
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
						emptyTitle="empty_cp_channels_title"
						emptyMessage="empty_cp_channels_text"
						itemId="channel-list"
						id="channel-list-tile"
						items={this.props.channelList.channels}
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
						widerTiles
					/>)
				}
				{this.props.showCPDetailsModal && (
					<ChannelParticipationModal
						channelInfo= {this.props.channelInfo}
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
			</div>
		);
	}
}

const dataProps = {
	channelList: PropTypes.object,
	channelInfo: PropTypes.object,
	selectedNode: PropTypes.object,
	showCPDetailsModal:  PropTypes.bool,
	showCPUnjoinModal:  PropTypes.bool,
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
