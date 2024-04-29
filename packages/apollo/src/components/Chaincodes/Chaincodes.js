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
import { OverflowMenu, OverflowMenuItem } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import emptyImage from '../../assets/images/empty_installed.svg';
import { clearNotifications, showSuccess, updateState } from '../../redux/commonActions';
import Helper from '../../utils/helper';
import InstallChaincodeModal from '../InstallChaincodeModal/InstallChaincodeModal';
import InstantiateChaincodeModal from '../InstantiateChaincodeModal/InstantiateChaincodeModal';
import ItemContainer from '../ItemContainer/ItemContainer';
import ActionsHelper from '../../utils/actionsHelper';

const SCOPE = 'chaincodes';

class Chaincodes extends Component {
	componentWillUnmount() {
		this.props.clearNotifications(SCOPE);
	}

	openInstallChaincodeModal = () => {
		this.props.updateState(SCOPE, {
			showInstallChaincodeModal: true,
		});
	};

	closeInstallChaincodeModal = () => {
		this.props.updateState(SCOPE, {
			showInstallChaincodeModal: false,
		});
	};

	openChaincodeDetails = chaincode => {
		this.props.updateState(SCOPE, {
			showChaincodeDetails: true,
		});
	};

	closeChaincodeDetails = () => {
		this.props.updateState(SCOPE, {
			showChaincodeDetails: false,
		});
	};

	onInstallCompleted = (name, version) => {
		this.props.reload();
		this.props.showSuccess('install_chaincode_successful', { name, version }, SCOPE);
	};

	onInstantiateCompleted = (name, version, channel) => {
		this.props.showSuccess('instantiate_chaincode_successful', { name: name, version: version, channel: channel }, SCOPE);
		this.props.reload();
	};

	openInstantiateChaincodeModal = chaincode => {
		this.props.updateState(SCOPE, {
			installedChaincode: chaincode,
			showInstantiateChaincodeModal: true,
		});
	};

	closeInstantiateChaincodeModal = () => {
		this.props.updateState(SCOPE, {
			showInstantiateChaincodeModal: false,
		});
	};

	overflowMenu = installed_chaincode => {
		const translate = this.props.t;
		let overflow = (
			<OverflowMenu ariaLabel={translate('actions')}
				flipped={true}
				iconDescription={translate('actions')}
				id={`overflow-installed-${installed_chaincode.id}`}
			>
				<OverflowMenuItem
					id="instantiate_modal"
					className="bx--overflow-installed-item-btn"
					wrapperClassName="overflow-installed-item"
					itemText={translate('instantiate')}
					onClick={() => {
						this.openInstantiateChaincodeModal(installed_chaincode);
					}}
					primaryFocus={true}
				/>
			</OverflowMenu>
		);
		return overflow;
	};
	render() {
		return (
			<div>
				<div id="chaincodes-container"
					className="ibp__chaincodes--container"
				>
					<ItemContainer
						id="installed-chaincode"
						buttonText="install_chaincode"
						containerTitle="installed_chaincode_legacy"
						containerDesc="installed_chaincode_tooltip"
						emptyImage={emptyImage}
						emptyTitle="empty_installed_title"
						emptyMessage="empty_installed_text"
						itemId="chaincode"
						loading={this.props.loading}
						items={this.props.installedChaincodeList}
						select={this.openChaincodeDetails}
						listMapping={[
							{
								header: 'contract_name',
								attr: 'name',
							},
							{
								header: 'version',
								attr: 'version',
							},
							{
								header: 'peers',
								attr: 'peerDisplay',
							},
							{
								header: 'empty',
								custom: this.overflowMenu,
							},
						]}
						addItems={[
							{
								text: 'install_chaincode',
								fn: this.openInstallChaincodeModal,
								label: 'install_chaincode',
								disabled: !ActionsHelper.canManageComponent(this.props.userInfo, this.props.feature_flags)
							},
						]}
						disableAddItem={!this.props.peers || this.props.peers.length === 0}
					/>
				</div>
				<div>
					{this.props.showInstallChaincodeModal && (
						<InstallChaincodeModal
							peers={this.props.peers}
							onClose={this.closeInstallChaincodeModal}
							onComplete={this.onInstallCompleted}
							installedChaincodeList={this.props.installedChaincodeList}
						/>
					)}
					{this.props.showInstantiateChaincodeModal && (
						<InstantiateChaincodeModal
							installedChaincode={this.props.installedChaincode}
							onClose={this.closeInstantiateChaincodeModal}
							onComplete={this.onInstantiateCompleted}
							instantiatedChaincodeList={this.props.instantiatedChaincodeList}
						/>
					)}
				</div>
			</div>
		);
	}
}

const dataProps = {
	installedChaincodeList: PropTypes.array,
	instantiatedChaincodeList: PropTypes.array,
	peers: PropTypes.array,
	showInstallChaincodeModal: PropTypes.bool,
	showChaincodeDetails: PropTypes.bool,
	showInstantiateChaincodeModal: PropTypes.bool,
	installedChaincode: PropTypes.object,
	loading: PropTypes.bool,
};

Chaincodes.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	showSuccess: PropTypes.func,
	clearNotifications: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['userInfo'] = state['userInfo'] ? state['userInfo'] : null;
		newProps['feature_flags'] = state['settings'] ? state['settings']['feature_flags'] : null;
		return newProps;
	},
	{
		updateState,
		showSuccess,
		clearNotifications,
	}
)(withTranslation()(Chaincodes));
