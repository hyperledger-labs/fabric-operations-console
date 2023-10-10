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
import ItemContainer from '../ItemContainer/ItemContainer';
import emptyACLImage from '../../assets/images/empty_channels.svg';

const ChannelACLs = props => {
	return (
		<div id="channel-acls-container"
			className="ibp-channel-acls-container"
		>
			<ItemContainer
				containerTitle="channel_acls"
				containerTooltip="channel_acls_tooltip"
				emptyMessage="no_acl_for_channel"
				emptyImage={emptyACLImage}
				emptyTitle="empty_acl_title"
				id="ibp-channel-details-acls-table"
				itemId="channel_acls"
				items={props.acls}
				listMapping={[
					{
						header: 'resource',
						attr: 'resource',
					},
					{
						header: 'policy_ref',
						attr: 'policy_ref',
					},
				]}
			/>
		</div>
	);
};

ChannelACLs.propTypes = {
	acls: PropTypes.array,
};

export default ChannelACLs;
