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
import { showSuccess, updateState } from '../../redux/commonActions';
import { PeerRestApi } from '../../rest/PeerRestApi';
import Helper from '../../utils/helper';
import ItemContainer from '../ItemContainer/ItemContainer';
import ItemTileLabels from '../ItemContainerTile/ItemTileLabels/ItemTileLabels';
import Logger from '../Log/Logger';
import UpdateChannelMspModal from '../UpdateChannelMspModal/UpdateChannelMspModal';

const SCOPE = 'channelMembers';
const Log = new Logger(SCOPE);

class ChannelMembers extends Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			selectedOrdererMspForEdit: null,
			selectedChannelMspForEdit: null,
			loading: true,
		});
		this.getPeerDetails();
	}
	componentDidUpdate(prevProps) {
		if (this.props.peerId !== prevProps.peerId) {
			this.getPeerDetails();
		}
	}
	getPeerDetails = () => {
		PeerRestApi.getPeerDetails(this.props.peerId, true)
			.then(peer => {
				this.props.updateState(SCOPE, { peer: peer, loading: false });
			})
			.catch(error => {
				Log.error(error);
			});
	};

	editMsp = msp => {
		if (this.props.isOrdererMSP) {
			this.props.updateState(SCOPE, { selectedOrdererMspForEdit: { ...msp, msp_id: msp.id }, selectedChannelMspForEdit: null });
		} else {
			this.props.updateState(SCOPE, { selectedChannelMspForEdit: { ...msp, msp_id: msp.id }, selectedOrdererMspForEdit: null });
		}
	};

	hideUpdateMSPModal = () => {
		this.props.updateState(SCOPE, { selectedChannelMspForEdit: null, selectedOrdererMspForEdit: null });
	};

	onUpdateMspCompleted = (msp_name, isOrdererMSP) => {
		this.props.showSuccess(isOrdererMSP ? 'orderer_msp_def_update_proposed' : 'msp_def_updated', { msp_name: msp_name }, SCOPE);
		this.props.updateState(SCOPE, {
			selectedChannelMspForEdit: null,
			selectedOrdererMspForEdit: null,
		});
	};

	buildCustomTile(member) {
		return (
			<>
				<ItemTileLabels certificateWarning={member.certificateWarning}
					nodeOU={member.node_ou}
				/>
			</>
		);
	}

	render() {
		return (
			<div id={`channel-members-container-${this.props.id}`}
				className="ibp-channel-members-container"
			>
				<ItemContainer
					id={this.props.isOrdererMSP ? 'orderer_members' : 'channel_members'}
					containerTitle={this.props.isOrdererMSP ? 'orderer_msps' : 'channel_members'}
					containerTooltip={this.props.isOrdererMSP ? 'orderer_msps_tooltip' : 'channel_members_tooltip'}
					tooltipDirection="right"
					itemId="channel_members"
					items={this.props.members}
					tileMapping={{
						title: 'org',
						custom: data => {
							return this.buildCustomTile(data);
						},
					}}
					listMapping={[
						{
							header: 'org',
							attr: 'org',
						},
					]}
					isLink={true}
					loading={this.props.loading}
					select={this.editMsp}
					widerTiles
				/>
				{!this.props.isOrdererMSP && this.props.selectedChannelMspForEdit && (
					<UpdateChannelMspModal
						msp={this.props.selectedChannelMspForEdit}
						channelId={this.props.channelId}
						orderer={this.props.orderer}
						peer={this.props.peer}
						cert={this.props.peer ? this.props.peer.cert : null}
						privateKey={this.props.peer ? this.props.peer.private_key : null}
						configtxlator_url={this.props.configtxlator_url}
						consenters={this.props.consenters}
						onClose={this.hideUpdateMSPModal}
						onComplete={this.onUpdateMspCompleted}
						isOrdererMSP={this.props.selectedChannelMspForEdit.isOrdererMSP}
					/>
				)}
				{this.props.isOrdererMSP && this.props.selectedOrdererMspForEdit && (
					<UpdateChannelMspModal
						msp={this.props.selectedOrdererMspForEdit}
						channelId={this.props.channelId}
						orderer={this.props.orderer}
						peer={this.props.peer}
						cert={this.props.peer ? this.props.peer.cert : null}
						privateKey={this.props.peer ? this.props.peer.private_key : null}
						configtxlator_url={this.props.configtxlator_url}
						consenters={this.props.consenters}
						onClose={this.hideUpdateMSPModal}
						onComplete={this.onUpdateMspCompleted}
						isOrdererMSP={this.props.selectedOrdererMspForEdit.isOrdererMSP}
					/>
				)}
			</div>
		);
	}
}

const dataProps = {
	members: PropTypes.array,
	orderer: PropTypes.object,
	configtxlator_url: PropTypes.string,
	channelId: PropTypes.string,
	id: PropTypes.string,
	peerId: PropTypes.string,
	selectedChannelMspForEdit: PropTypes.object,
	selectedOrdererMspForEdit: PropTypes.object,
	peer: PropTypes.object,
	isOrdererMSP: PropTypes.bool,
};

ChannelMembers.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	showSuccess: PropTypes.func,
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
		showSuccess,
	}
)(withLocalize(ChannelMembers));
