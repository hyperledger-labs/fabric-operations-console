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
import IdentityApi from '../../rest/IdentityApi';
import Helper from '../../utils/helper';
import ItemContainer from '../ItemContainer/ItemContainer';
import ItemTileLabels from '../ItemContainerTile/ItemTileLabels/ItemTileLabels';
import { ChannelParticipationModal } from './ChannelParticipationModal';
import Logger from '../Log/Logger';
import { ChannelParticipationApi } from '../../rest/ChannelParticipationApi';

const SCOPE = 'ChannelParticipationDetails';
const Log = new Logger(SCOPE);

class ChannelParticipationDetails extends Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			showCPDetailsModal: false,
		});
	}

	closeCPDetailsModal = () => {
		this.props.updateState(SCOPE, {
			showCPDetailsModal: false,
		});
	};

	openCPDetailsModal = (channel) => {
		this.loadChannelData(channel.name);
		this.props.updateState(SCOPE, {
			showCPDetailsModal: true,
		});
	};

	async loadChannelData(channelId) {
		if (this.props.details && !this.props.details.osnadmin_url) return;
		let node = this.props.selectedNode || this.props.details;
		let nodes = this.props.selectedNode ? [this.props.selectedNode]:this.props.details.raft;
		let systemChannel = true;
		let channelInfo = {};
		let orderer_tls_identity = await IdentityApi.getTLSIdentity(node);
		if (orderer_tls_identity) {
			try {
				let all_identity = await IdentityApi.getIdentities();
				channelInfo = await ChannelParticipationApi.map1Channel(all_identity, nodes, channelId);
			} catch (error) {
				Log.error('Unable to get channel list:', error);
			}
		}
		this.props.updateState(SCOPE, {
			channelInfo,
			systemChannel,
		});
	};

	buildCustomTile(channel) {
		if (channel.nodes === undefined) return;
		return (
			<div>
				<ItemTileLabels custom={`Nodes: ${channel.nodes.join(',')}`}/>
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
						select={this.openCPDetailsModal}
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
				{this.props.showCPDetailsModal && this.props.details && (
					<ChannelParticipationModal
						channelInfo= {this.props.channelInfo}
						details={this.props.details}
						onClose={this.closeCPDetailsModal}
						translate={this.props.translate}
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
};

ChannelParticipationDetails.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
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
