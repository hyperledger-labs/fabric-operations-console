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

import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import emptyImage from '../../assets/images/empty_msps.svg';
import { showError, updateState } from '../../redux/commonActions';
import Helper from '../../utils/helper';
import ImportMspModal from '../ImportMspModal/ImportMspModal';
import ItemContainer from '../ItemContainer/ItemContainer';
import ItemTileLabels from '../ItemContainerTile/ItemTileLabels/ItemTileLabels';
import MspDeleteModal from '../MspDeleteModal/MspDeleteModal';
import SVGs from '../Svgs/Svgs';

const SCOPE = 'ordererMembers';

class OrdererMembers extends Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			selectedMember: {},
			showDeleteModal: false,
		});
	}

	buildCustomTile(member) {
		const node_ou = _.get(member, 'fabric_node_ous.enable') ? 'enabled' : 'disabled';
		const certificateWarning = node_ou === 'enabled' ? false : Helper.getLongestExpiry(member.admins);

		return (
			<div>
				<p className="ibp-node-msp-tile-name-sub">{member.msp_id}</p>
				{!this.props.loading && this.props.members && this.props.members.length > 0 && (
					<>
						<ItemTileLabels certificateWarning={certificateWarning}
							nodeOU={node_ou}
						/>
						<button
							className={`ibp-orderer-member-download ${this.props.members.length === 0 ? 'ibp-orderer-member-singe' : ''}`}
							onClick={() => this.downloadMsp(member)}
						>
							<SVGs type="download" />
						</button>
						<button className="ibp-orderer-member-delete"
							onClick={() => this.openDeleteMSPModal(member)}
						>
							<SVGs type="trash" />
						</button>
					</>
				)}
			</div>
		);
	}

	downloadMsp = member => {
		Helper.exportNode({
			...member,
			type: 'msp_info',
		});
	};

	openDeleteMSPModal = member => {
		this.openDeleteMemberModal(member);
	};

	openDeleteMemberModal = member => {
		this.props.updateState(SCOPE, {
			showDeleteModal: true,
			selectedMember: member,
		});
	};

	closeDeleteMSPModal = () => {
		this.props.updateState(SCOPE, {
			showDeleteModal: false,
		});
	};

	openAddMSPModal = () => {
		this.props.updateState(SCOPE, {
			showAddMSPModal: true,
		});
	};

	closeAddMSPModal = () => {
		this.props.updateState(SCOPE, {
			showAddMSPModal: false,
		});
	};

	render() {
		return (
			<div className="ibp-orderer-member-container">
				<div>
					<ItemContainer
						containerTitle="orderer_members"
						containerTooltip="orderer_members_tooltip"
						emptyImage={emptyImage}
						emptyTitle="empty_consortium_title"
						emptyMessage="empty_msp_message"
						id="orderer-members-add-tile"
						itemId="orderer-members"
						loading={this.props.loading}
						items={this.props.members}
						disableAddItem={this.props.disableAddItem}
						listMapping={[
							{
								header: 'msp_name',
								attr: 'display_name',
							},
							{
								header: 'msp_id',
								attr: 'msp_id',
							},
						]}
						menuItems={member => [
							{
								text: 'export',
								fn: () => {
									this.downloadMsp(member);
								},
							},
							{
								text: 'delete',
								fn: () => {
									this.openDeleteMSPModal(member);
								},
							},
						]}
						addItems={[
							{
								fn: this.openAddMSPModal,
								label: 'add_organization',
								text: 'add_organization',
							},
						]}
						tileMapping={{
							title: 'display_name',
							custom: data => {
								return this.buildCustomTile(data);
							},
						}}
						widerTiles
					/>
				</div>
				{this.props.showDeleteModal && (
					<MspDeleteModal
						onClose={this.closeDeleteMSPModal}
						ordererId={this.props.ordererId}
						configtxlator_url={this.props.configtxlator_url}
						selectedMember={this.props.selectedMember}
						onComplete={() => {
							this.props.onClose();
						}}
					/>
				)}
				{this.props.showAddMSPModal && (
					<ImportMspModal
						ordererId={this.props.ordererId}
						configtxlator_url={this.props.configtxlator_url}
						onClose={this.closeAddMSPModal}
						onComplete={() => {
							this.props.onClose();
						}}
						members={this.props.members}
						admins={this.props.admins}
						networkMember
					/>
				)}
			</div>
		);
	}
}

const dataProps = {
	loading: PropTypes.bool,
	members: PropTypes.array,
	admins: PropTypes.array,
	openAddMSPModal: PropTypes.func,
	showAddMSPModal: PropTypes.bool,
	selectedMember: PropTypes.object,
	showDeleteModal: PropTypes.bool,
	showError: PropTypes.func,
	disableAddItem: PropTypes.bool,
};

OrdererMembers.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
		showError,
	}
)(withLocalize(OrdererMembers));
