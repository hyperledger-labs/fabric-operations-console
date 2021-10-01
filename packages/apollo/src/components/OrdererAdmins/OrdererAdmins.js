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
import { showError, showSuccess, updateState } from '../../redux/commonActions';
import { OrdererRestApi } from '../../rest/OrdererRestApi';
import Helper from '../../utils/helper';
import ImportMspModal from '../ImportMspModal/ImportMspModal';
import ItemContainer from '../ItemContainer/ItemContainer';
import ItemTileLabels from '../ItemContainerTile/ItemTileLabels/ItemTileLabels';
import MspDeleteModal from '../MspDeleteModal/MspDeleteModal';
import SVGs from '../Svgs/Svgs';
import UpdateChannelMspModal from '../UpdateChannelMspModal/UpdateChannelMspModal';

const SCOPE = 'ordererAdmins';

class OrdererAdmins extends Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			selectedMember: {},
			showDeleteModal: false,
			showMSPUpdateModal: false,
		});
	}

	buildCustomTile(admin) {
		const node_ou = _.get(admin, 'fabric_node_ous.enable') ? 'enabled' : 'disabled';
		const certificateWarning = node_ou === 'enabled' ? false : Helper.getLongestExpiry(admin.admins);

		return (
			<div className="ibp-orderer-admin-custom-tile">
				<p className="ibp-node-msp-tile-name-sub">{admin.msp_id}</p>
				{!this.props.loading && (
					<>
						<ItemTileLabels certificateWarning={certificateWarning}
							nodeOU={node_ou}
						/>
						<button
							className={`ibp-orderer-admin-update ${this.props.admins.length === 1 ? 'ibp-orderer-admin-single' : ''}`}
							onClick={() => this.updateMSPAdminModal(admin)}
						>
							<SVGs type="settings" />
						</button>
						<button
							className={`ibp-orderer-admin-download ${this.props.admins.length === 1 ? 'ibp-orderer-admin-single' : ''}`}
							onClick={() => this.downloadMsp(admin)}
						>
							<SVGs type="download" />
						</button>
						{this.props.admins && this.props.admins.length > 1 && (
							<button className="ibp-orderer-admin-delete"
								onClick={() => this.openDeleteAdminModal(admin)}
							>
								<SVGs type="trash" />
							</button>
						)}
					</>
				)}
			</div>
		);
	}

	openDeleteAdminModal = admin => {
		this.openDeleteMSPModal(admin);
	};

	updateMSPAdminModal = admin => {
		this.props.updateState(SCOPE, {
			showMSPUpdateModal: true,
			selectedMember: admin,
		});
	};

	downloadMsp = admin => {
		Helper.exportNode({
			...admin,
			type: 'msp',
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

	closeDeleteMSPModal = () => {
		this.props.updateState(SCOPE, {
			showDeleteModal: false,
			selectedMember: null,
		});
	};

	openDeleteMSPModal = admin => {
		this.props.updateState(SCOPE, {
			showDeleteModal: true,
			selectedMember: admin,
		});
	};
	hideMSPUpdateModal = () => {
		this.props.updateState(SCOPE, { showMSPUpdateModal: null });
	};

	onUpdateMspCompleted = (msp_name, isOrdererMSP) => {
		this.props.showSuccess('msp_def_updated', { msp_name: msp_name }, SCOPE);
		this.props.updateState(SCOPE, {
			showMSPUpdateModal: null,
		});
	};

	getMenuItems = admin => {
		let menu = [
			{
				text: 'export',
				fn: () => {
					this.downloadMsp(admin);
				},
			},
		];
		if (this.props.admins && this.props.admins.length > 1) {
			menu.push({
				text: 'delete',
				fn: () => {
					this.openDeleteAdminModal(admin);
				},
			});
		}
		return menu;
	};

	render() {
		return (
			<div className="ibp-orderer-admin-container">
				<div>
					<ItemContainer
						containerTitle="orderer_admins"
						containerTooltip="orderer_admins_tooltip"
						emptyImage={emptyImage}
						emptyTitle="empty_orderer_admins_title"
						emptyMessage="empty_msp_message"
						itemId="orderer-admins"
						id="orderer-admins-add-tile"
						loading={this.props.loading}
						items={this.props.admins}
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
						menuItems={admin => this.getMenuItems(admin)}
						addItems={[
							{
								fn: this.openAddMSPModal,
								label: 'add_orderer_admin',
								text: 'add_orderer_admin',
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
				{this.props.showAddMSPModal && (
					<ImportMspModal
						ordererId={this.props.ordererId}
						configtxlator_url={this.props.configtxlator_url}
						onClose={this.closeAddMSPModal}
						onComplete={this.props.onClose}
						members={this.props.members}
						admins={this.props.admins}
						ordererAdmin
					/>
				)}
				{this.props.showDeleteModal && (
					<MspDeleteModal
						onClose={this.closeDeleteMSPModal}
						ordererId={this.props.ordererId}
						configtxlator_url={this.props.configtxlator_url}
						selectedMember={this.props.selectedMember}
						onComplete={this.props.onClose}
						ordererAdmin={true}
					/>
				)}
				{this.props.showMSPUpdateModal && (
					<UpdateChannelMspModal
						msp={this.props.selectedMember}
						channelId={OrdererRestApi.systemChannel}
						orderer={this.props.orderer}
						configtxlator_url={this.props.configtxlator_url}
						onClose={this.hideMSPUpdateModal}
						onComplete={this.onUpdateMspCompleted}
						ordererAdmin={true}
					/>
				)}
			</div>
		);
	}
}

const dataProps = {
	loading: PropTypes.bool,
	admins: PropTypes.array,
	openAddMSPModal: PropTypes.func,
	orderer: PropTypes.object,
	selectedMember: PropTypes.object,
	showAddMSPModal: PropTypes.bool,
	showDeleteModal: PropTypes.bool,
	showMSPUpdateModal: PropTypes.bool,
	showError: PropTypes.func,
	disableAddItem: PropTypes.bool,
};

OrdererAdmins.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
		showSuccess,
		showError,
	}
)(withLocalize(OrdererAdmins));
