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
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import emptyImage from '../../assets/images/empty_instantiated.svg';
import { clearNotifications, showSuccess, updateState } from '../../redux/commonActions';
import Helper from '../../utils/helper';
import InstantiateChaincodeModal from '../InstantiateChaincodeModal/InstantiateChaincodeModal';
import ItemContainer from '../ItemContainer/ItemContainer';

const SCOPE = 'instantiatedchaincodes';

class InstantiatedChaincodes extends Component {
	componentWillUnmount() {
		this.props.clearNotifications(SCOPE);
	}

	openUpgradeChaincodeModal = instantiatedChaincode => {
		this.props.updateState(SCOPE, {
			instantiatedChaincode: instantiatedChaincode,
			showUpgradeChaincodeModal: true,
		});
	};

	closeUpgradeChaincodeModal = () => {
		this.props.updateState(SCOPE, {
			showUpgradeChaincodeModal: false,
		});
	};

	onUpgradeCompleted = (name, old_version, new_version, channel) => {
		this.props.showSuccess('upgrade_chaincode_successful', { name, old_version, new_version, channel }, SCOPE);
		this.props.reload();
	};

	buildUpgradeAvailableLabel = chaincode => {
		const translate = this.props.t;
		if (!chaincode.disabled) {
			return <span className="ibp-upgrade-available-label">{translate('upgrade_available')}</span>;
		}
	};

	buildPeers = chaincode => {
		let peers = [];
		const channel_peers = chaincode.peers;
		const cc = this.props.installedChaincodeList.filter(cc => cc.id === chaincode.name + '_' + chaincode.version);
		const cc_peers = cc && cc.length > 0 ? cc[0].peers : [];
		channel_peers.forEach(peer => {
			const isCCPeer = cc_peers.filter(cc_peer => _.toLower(cc_peer.grpcwp_url) === _.toLower(peer.grpcwp_url))[0];
			if (isCCPeer && isCCPeer.display_name) {
				peers.push(isCCPeer.display_name);
			}
		});
		return peers.join(', ');
	};

	overflowMenu = instantiated_chaincode => {
		const translate = this.props.t;
		if (instantiated_chaincode.disabled) {
			return;
		}
		let overflow = (
			<OverflowMenu
				ariaLabel={translate('actions')}
				flipped={true}
				iconDescription={translate('actions')}
				id={`overflow-instantiate-${instantiated_chaincode.id}`}
			>
				<OverflowMenuItem
					id="upgrade_modal"
					className="bx--overflow-instantiate-item-btn"
					wrapperClassName="overflow-instantiate-item"
					itemText={translate('upgrade')}
					onClick={() => {
						this.openUpgradeChaincodeModal(instantiated_chaincode);
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
				<div id="instantiated-chaincodes-container"
					className="ibp__chaincodes--container"
				>
					<ItemContainer
						id="instantiated-chaincode"
						containerTitle="instantiated_chaincode_legacy"
						containerDesc="instantiated_chaincode_tooltip"
						emptyImage={emptyImage}
						emptyTitle="empty_instantiated_title"
						emptyMessage="empty_instantiated_text"
						itemId="instantiated_chaincode"
						loading={this.props.loading}
						items={this.props.instantiated_array}
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
								header: 'channel',
								attr: 'channel',
							},
							{
								header: 'peers',
								custom: this.buildPeers,
							},
							{
								header: 'upgradable',
								custom: this.buildUpgradeAvailableLabel,
							},
							{
								header: 'empty',
								custom: this.overflowMenu,
							},
						]}
					/>
					{this.props.showUpgradeChaincodeModal && (
						<InstantiateChaincodeModal
							instantiatedChaincode={this.props.instantiatedChaincode}
							installedChaincodeList={this.props.installedChaincodeList}
							onClose={this.closeUpgradeChaincodeModal}
							onComplete={this.onUpgradeCompleted}
						/>
					)}
				</div>
			</div>
		);
	}
}

const dataProps = {
	showUpgradeChaincodeModal: PropTypes.bool,
	instantiatedChaincode: PropTypes.object,
	installedChaincodeList: PropTypes.array,
	instantiated_array: PropTypes.array,
	loading: PropTypes.bool,
};

InstantiatedChaincodes.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	showSuccess: PropTypes.func,
	reload: PropTypes.func,
	clearNotifications: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		clearNotifications,
		updateState,
		showSuccess,
	}
)(withTranslation()(InstantiatedChaincodes));
