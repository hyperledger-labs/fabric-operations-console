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
import { connect } from 'react-redux';
import emptyImage from '../../assets/images/empty_channels.svg';
import { clearNotifications, showError, updateState } from '../../redux/commonActions';
import { OrdererRestApi } from '../../rest/OrdererRestApi';
import { PeerRestApi } from '../../rest/PeerRestApi';
import Helper from '../../utils/helper';
import ImportOrdererModal from '../ImportOrdererModal/ImportOrdererModal';
import ItemContainer from '../ItemContainer/ItemContainer';
import JoinChannelModal from '../JoinChannelModal/JoinChannelModal';
import Logger from '../Log/Logger';

const SCOPE = 'peerChannels';
const Log = new Logger(SCOPE);

class PeerChannels extends Component {
	componentDidMount() {
		this.mounted = true;
		this.props.updateState(SCOPE, { joinInProgress: false });
		this.getChannels();
	}

	componentDidUpdate(prevProps) {
		if (this.props.empty !== prevProps.empty) {
			this.getChannels();
		} else if (this.props.peer.status !== prevProps.peer.status) {
			this.getChannels();
		}
	}

	getChannels() {
		if (this.props.empty) {
			return;
		}
		if (this.props.peer.status !== 'running' && this.props.peer.status !== 'unknown') {
			return;
		}
		if (!this.mounted) {
			return;
		}
		this.props.clearNotifications(SCOPE);
		this.props.updateState(SCOPE, { loading: true });
		PeerRestApi.getChannels(this.props.match.params.peerId)
			.then(data => {
				if (!this.mounted) {
					return;
				}
				this.props.updateState(SCOPE, {
					channels: data.channelList ? data.channelList : [],
					loading: false,
				});
			})
			.catch(error => {
				if (!this.mounted) {
					return;
				}
				Log.error(error);
				this.props.updateState(SCOPE, { channels: [], loading: false });
				if (error.message_key) {
					this.props.showError(error.message_key, { nodeName: error.peerName }, SCOPE);
				} else {
					this.props.showError('error_peer_channels', { peerName: error.peerName }, SCOPE);
				}
			});
	}

	componentWillUnmount() {
		this.mounted = false;
		this.props.updateState(SCOPE, { channels: [] });
		this.props.clearNotifications(SCOPE);
	}

	getBlockHeight(channel) {
		return <span>{channel.block_height}</span>;
	}

	getOrderer(channel) {
		// Raft orderers are referred to by cluster name
		return <span>{channel.orderers && channel.orderers.map(orderer => orderer.cluster_name || orderer.display_name || orderer.name).join(', ')}</span>;
	}

	showJoinChannelModal = orderers => {
		this.props.updateState(SCOPE, {
			joinChannelModal: true,
			joinInProgress: true,
			orderers,
		});
	};

	hideJoinChannelModal = () => {
		this.props.updateState(SCOPE, {
			joinChannelModal: false,
			joinInProgress: false,
		});
	};

	showImportOrdererModal = () => {
		this.props.updateState(SCOPE, {
			importOrdererModal: true,
			joinInProgress: true,
		});
	};

	hideImportOrdererModal = () => {
		this.props.updateState(SCOPE, {
			importOrdererModal: false,
			joinInProgress: this.props.joinChannelModal,
		});
	};

	joinChannel = () => {
		this.props.updateState(SCOPE, { joinInProgress: true });
		OrdererRestApi.getOrderers()
			.then(orderers => {
				if (!this.mounted) {
					return;
				}
				if (orderers.length > 0) {
					this.showJoinChannelModal(orderers);
				} else {
					this.showImportOrdererModal();
				}
			})
			.catch(error => {
				if (!this.mounted) {
					return;
				}
				Log.error(error);
				this.props.showError('error_orderers', {}, SCOPE);
				this.props.updateState(SCOPE, { joinInProgress: true });
			});
	};

	showChannelDetails = channel => {
		this.props.history.push('/peer/' + encodeURIComponent(this.props.peer.id) + '/channel/' + encodeURIComponent(channel.id) + window.location.search);
	};

	render() {
		let items = this.props.channels ? this.props.channels : [];
		return (
			<div>
				<div id="peer-channels-container">
					<ItemContainer
						containerTitle="channels"
						emptyMessage="empty_peer_channels_message"
						emptyImage={emptyImage}
						emptyTitle="empty_peer_channels_title"
						itemId="channels"
						loading={this.props.loading || this.props.parentLoading}
						items={items}
						listMapping={[
							{ header: 'id', attr: 'id' },
							{ header: 'block_height', custom: this.getBlockHeight },
							{ header: 'orderer', custom: this.getOrderer },
						]}
						select={this.showChannelDetails}
						addItems={[
							{
								text: 'join_channel',
								fn: this.joinChannel,
							},
						]}
						disableAddItem={this.props.empty || this.props.joinInProgress}
					/>
				</div>
				{this.props.importOrdererModal && (
					<ImportOrdererModal onClose={this.hideImportOrdererModal}
						onComplete={this.showJoinChannelModal}
						joinChannel={true}
					/>
				)}
				{this.props.joinChannelModal && (
					<JoinChannelModal
						onClose={this.hideJoinChannelModal}
						onComplete={data => {
							this.hideJoinChannelModal();
							this.getChannels();
						}}
						peer={[this.props.peer]}
						orderers={this.props.orderers}
					/>
				)}
			</div>
		);
	}
}

const dataProps = {
	peer: PropTypes.object,
	channels: PropTypes.array,
	match: PropTypes.object,
	loading: PropTypes.bool,
	joinInProgress: PropTypes.bool,
	joinChannelModal: PropTypes.bool,
	importOrdererModal: PropTypes.bool,
	orderers: PropTypes.array,
	history: PropTypes.object,
	empty: PropTypes.bool,
};

PeerChannels.propTypes = {
	...dataProps,
	showError: PropTypes.func,
	updateState: PropTypes.func,
	clearNotifications: PropTypes.func,
	parentLoading: PropTypes.bool,
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		clearNotifications,
		showError,
		updateState,
	}
)(PeerChannels);
