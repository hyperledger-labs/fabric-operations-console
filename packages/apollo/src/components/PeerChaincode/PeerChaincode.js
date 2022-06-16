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
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import emptyImage from '../../assets/images/empty_installed.svg';
import { clearNotifications, showError, showSuccess, updateState } from '../../redux/commonActions';
import { PeerRestApi } from '../../rest/PeerRestApi';
import Helper from '../../utils/helper';
import InstallChaincodeModal from '../InstallChaincodeModal/InstallChaincodeModal';
import ItemContainer from '../ItemContainer/ItemContainer';
import Logger from '../Log/Logger';

const SCOPE = 'peerChaincode';
const Log = new Logger(SCOPE);

const STATES = {
	READY: 'READY',
	LOADING: 'LOADING',
	ERROR: 'ERROR',
};

class PeerChaincode extends Component {
	componentDidMount() {
		this.mounted = true;
		this.getInstalledChaincodes();
	}

	componentDidUpdate(prevProps) {
		if (this.props.empty !== prevProps.empty) {
			this.getInstalledChaincodes();
		} else if (this.props.peer.status !== prevProps.peer.status) {
			this.getInstalledChaincodes();
		}
	}

	componentWillUnmount() {
		this.mounted = false;
		this.props.updateState(SCOPE, { chaincodes: [] });
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

	getInstalledChaincodes = () => {
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
		this.props.updateState(SCOPE, { state: STATES.LOADING });
		PeerRestApi.getInstalledChaincode(this.props.peer.id)
			.then(chaincodes => {
				if (!this.mounted) {
					return;
				}
				let v2errordata = chaincodes && chaincodes.v2data && chaincodes.v2data.error ? chaincodes.v2data.error : null;
				if (v2errordata) {
					this.props.showError('error_getting_v2_chaincodes', { peerName: this.props.peer.name }, SCOPE, _.get(v2errordata, 'stitch_msg'));
				}

				let v1data = chaincodes && chaincodes.v1data && chaincodes.v1data.chaincodesList ? chaincodes.v1data.chaincodesList : {};
				//start with v1 data
				let chaincodesList = v1data;
				let v2data = chaincodes && chaincodes.v2data && chaincodes.v2data.installedChaincodes ? chaincodes.v2data.installedChaincodes : [];
				if (chaincodesList) {
					chaincodesList.forEach(chaincode => {
						chaincode.peers = [this.props.peer];
					});
				}
				chaincodesList.forEach(cc => {
					cc.tileTitle = `${cc.name}@${cc.version}.cds`;
					cc.legacy = true;
				});

				v2data.forEach(chaincode => {
					chaincodesList.push({
						name: chaincode.label,
						version: chaincode.packageId,
						references: chaincode.references,
						tileTitle: `${chaincode.packageId}.tar.gz`,
						legacy: false,
					});
				});
				this.props.updateState(SCOPE, {
					chaincodes: chaincodesList,
					state: STATES.READY,
					error: null,
				});
			})
			.catch(error => {
				if (!this.mounted) {
					return;
				}
				Log.error(error);
				this.props.updateState(SCOPE, {
					chaincodes: [],
					state: STATES.ERROR,
					error: error.translation,
				});
				this.props.clearNotifications(SCOPE);
				const { title, translation_opts, details } = error.translation;
				this.props.showError(title, translation_opts, SCOPE, details);
			});
	};

	onInstallCompleted = (name, version) => {
		this.getInstalledChaincodes();
		this.props.showSuccess('install_chaincode_successful', { name, version }, SCOPE);
	};

	renderCustomTile = data => {
		return <>{data.legacy && <div className="ibp-channel-chaincode-status">{this.props.translate('legacy_sc')}</div>}</>;
	};

	async downloadChaincode(cc) {
		const cc_data = await PeerRestApi.downloadChaincode(this.props.peer.id, cc.version);
		PeerRestApi.exportZip(cc.version, cc_data.chaincodeInstallPackage);
	}

	render() {
		let emptyTitle = 'empty_peer_chaincode_title';
		let emptyMessage = 'empty_peer_chaincode_message';
		let emptyTranslationOpts;
		let image = emptyImage;

		if (this.props.state === STATES.ERROR && this.props.error) {
			emptyTitle = this.props.error.title;
			emptyMessage = this.props.error.details;
			emptyTranslationOpts = this.props.error.translation_opts;
		}

		return (
			<div id="installed-chaincodes-container"
				className="ibp-peer-chaincodes"
			>
				<ItemContainer
					containerTitle="installed_chaincode"
					emptyMessage={emptyMessage}
					emptyImage={image}
					emptyTranslationOpts={emptyTranslationOpts}
					emptyTitle={emptyTitle}
					id="installed_chaincodes"
					loading={this.props.parentLoading || this.props.state === STATES.LOADING}
					items={this.props.empty ? [] : this.props.chaincodes}
					widerTiles
					menuItems={cc => {
						if (!cc.legacy) {
							return [
								{
									text: 'download_cc',
									fn: () => {
										this.downloadChaincode(cc);
									},
								},
							];
						}
					}}
					tileMapping={{
						title: 'tileTitle',
						custom: this.renderCustomTile,
					}}
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
							header: '',
							attr: 'legacy',
						},
					]}
					addItems={[
						{
							text: 'install_chaincode',
							fn: this.openInstallChaincodeModal,
							label: 'install_chaincode',
						},
					]}
					disableAddItem={this.props.empty || this.props.parentLoading || this.props.state !== STATES.READY}
				/>
				<div>
					{this.props.showInstallChaincodeModal && (
						<InstallChaincodeModal
							peers={[this.props.peer]}
							onClose={this.closeInstallChaincodeModal}
							onComplete={this.onInstallCompleted}
							installedChaincodeList={this.props.chaincodes}
						/>
					)}
				</div>
			</div>
		);
	}
}

const dataProps = {
	peer: PropTypes.object,
	chaincodes: PropTypes.array,
	error: PropTypes.object,
	showInstallChaincodeModal: PropTypes.bool,
	translate: PropTypes.func, // Provided by withLocalize
	state: PropTypes.string,
	installedChaincode: PropTypes.object,
	empty: PropTypes.bool,
};

PeerChaincode.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	showSuccess: PropTypes.func,
	showError: PropTypes.func,
	clearNotifications: PropTypes.func,
	parentLoading: PropTypes.bool,
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
		showError,
		showSuccess,
		clearNotifications,
	}
)(withLocalize(PeerChaincode));
