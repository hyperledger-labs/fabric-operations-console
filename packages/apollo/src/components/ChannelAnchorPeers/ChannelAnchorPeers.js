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
import React from 'react';
import emptyAnchorPeerImage from '../../assets/images/empty_nodes.svg';
import ItemContainer from '../ItemContainer/ItemContainer';
import SVGs from '../Svgs/Svgs';
import ActionsHelper from '../../utils/actionsHelper';

const ChannelAnchorPeers = props => {
	return (
		<div id="channel-anchor-peers-container"
			className="ibp-channel-anchor-peers-container"
		>
			<ItemContainer
				containerTitle="channel_anchor_peers"
				containerDesc={props.disableDelete ? 'channel_anchor_peer_no_orderer_found' : ''}
				containerTooltip="channel_anchor_peers_tooltip"
				emptyMessage="no_anchor_for_channel"
				emptyImage={emptyAnchorPeerImage}
				emptyTitle="empty_anchor_title"
				id="ibp-channel-details-anchor-peers-table"
				itemId="channel_anchor_peers"
				items={props.anchorPeers}
				loading={props.loading}
				listMapping={[
					{
						header: 'name',
						attr: 'display_name',
					},
					{
						header: 'msp_id',
						attr: 'msp_id',
					},
					{
						header: 'url',
						attr: 'grpcwp_url',
					},
				]}
				selectItem={
					(!props.disableDelete && ActionsHelper.canManageComponent(props.userInfo, props.feature_flags))
						? {
							id: 'deleteAnchorPeer',
							text: props.translate('delete_anchor_peers'),
							fn: props.onDeleteAnchorPeers,
							image: <DeleteButton />,
							multiSelect: true,
						  }
						: null
				}
				addItems={[
					{
						text: 'add_anchor_peer',
						fn: props.openAddAnchorPeerModal,
						disabled: !ActionsHelper.canManageComponent(props.userInfo, props.feature_flags),
					},
				]}
			/>
		</div>
	);
};

ChannelAnchorPeers.propTypes = {
	anchorPeers: PropTypes.array,
	openAddAnchorPeerModal: PropTypes.func,
	loading: PropTypes.bool,
	disableDelete: PropTypes.bool,
	onDeleteAnchorPeers: PropTypes.func,
	userInfo: PropTypes.object,
	feature_flags: PropTypes.object,
	t: PropTypes.func, // Provided by withTranslation()
};

export default ChannelAnchorPeers;

function DeleteButton(props) {
	return <SVGs type={'trash'}
		width="16px"
		height="18px"
	/>;
}
