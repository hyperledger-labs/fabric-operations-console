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
import { Checkbox } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { showWarning, updateState } from '../../redux/commonActions';
import { CertificateAuthorityRestApi } from '../../rest/CertificateAuthorityRestApi';
import IdentityApi from '../../rest/IdentityApi';
import { MspRestApi } from '../../rest/MspRestApi';
import { NodeRestApi } from '../../rest/NodeRestApi';
import { OrdererRestApi } from '../../rest/OrdererRestApi';
import { PeerRestApi } from '../../rest/PeerRestApi';
import UserSettingsRestApi from '../../rest/UserSettingsRestApi';
import Helper from '../../utils/helper';
import ImportantBox from '../ImportantBox/ImportantBox';
import Logger from '../Log/Logger';
import Wizard from '../Wizard/Wizard';
import WizardStep from '../WizardStep/WizardStep';

const SCOPE = 'exportModal';
const Log = new Logger(SCOPE);
const EXPORT_IDS_NOW = 'no-prompt';

class ExportModal extends React.Component {
	componentDidMount() {
		// this is used to download identities via a direct href link
		let exportIdentitiesNow = window.location.pathname === '/export-identities';

		this.props.updateState(SCOPE, {
			exportCA: !exportIdentitiesNow,
			exportOrderer: !exportIdentitiesNow,
			exportPeer: !exportIdentitiesNow,
			exportMsp: !exportIdentitiesNow,
			exportIdentity: exportIdentitiesNow,
		});

		// download identities without export prompt if on the export identities route
		if (exportIdentitiesNow) {
			// fyi relying on updateState does not work, it does not update in time
			this.onSubmit(EXPORT_IDS_NOW);
		}
	}

	async getMspList(type) {
		let list = [];
		if (this.props.exportMsp && type !== EXPORT_IDS_NOW) {
			const msp_list = await MspRestApi.getMsps();
			list = [...msp_list];
		}
		return list;
	}

	async getPeerList(type) {
		const list = [];
		if (this.props.exportPeer && type !== EXPORT_IDS_NOW) {
			const peer_list = await PeerRestApi.getPeers();
			for (let i = 0; i < peer_list.length; i++) {
				const peer = peer_list[i];
				const identity = await IdentityApi.getAssociatedIdentity(peer);
				list.push({
					...peer,
					associatedIdentityName: identity ? identity.name : '',
				});
			}
		}
		return list;
	}

	async getOrderers() {
		const list = [];
		const orderer_list = await OrdererRestApi.getOrderers();
		let warning_tls_certs = false;
		for (let i = 0; i < orderer_list.length; i++) {
			let orderer = orderer_list[i];
			if (orderer.raft) {
				for (let j = 0; j < orderer.raft.length; j++) {
					let node = orderer.raft[j];
					if (!node.client_tls_cert && node.location === 'ibm_saas') {
						try {
							const nodes = await NodeRestApi.getTLSSignedCertFromDeployer([node]);
							node.client_tls_cert = nodes[0].client_tls_cert;
							node.server_tls_cert = nodes[0].server_tls_cert;
						} catch (err) {
							warning_tls_certs = true;
						}
					}
				}
			} else {
				if (!orderer.client_tls_cert && orderer.location === 'ibm_saas') {
					try {
						const nodes = await NodeRestApi.getTLSSignedCertFromDeployer([orderer]);
						orderer.client_tls_cert = nodes[0].client_tls_cert;
						orderer.server_tls_cert = nodes[0].server_tls_cert;
					} catch (err) {
						warning_tls_certs = true;
					}
				}
			}
			list.push(orderer);
		}
		if (warning_tls_certs) {
			this.props.showWarning('warning_tls_certs');
		}
		return list;
	}

	async getOrdererList(type) {
		const list = [];
		if (this.props.exportOrderer && type !== EXPORT_IDS_NOW) {
			const orderer_list = await this.getOrderers();
			for (let i = 0; i < orderer_list.length; i++) {
				let orderer = orderer_list[i];
				orderer.associatedIdentities = await IdentityApi.getAssociatedOrdererIdentities(orderer);
				let raft = undefined;
				if (orderer.raft) {
					raft = [];
					orderer.raft.forEach(raft_node => {
						raft.push({
							...raft_node,
						});
					});
				}
				list.push({
					...orderer,
					raft,
				});
			}
		}
		return list;
	}

	async getCAList(type) {
		const list = [];
		if (this.props.exportCA && type !== EXPORT_IDS_NOW) {
			const ca_list = await CertificateAuthorityRestApi.getCAs();
			for (let i = 0; i < ca_list.length; i++) {
				const ca = ca_list[i];
				const identity = await IdentityApi.getAssociatedIdentity(ca);
				list.push({
					...ca,
					associatedIdentityName: identity ? identity.name : '',
				});
			}
		}
		return list;
	}

	async getIdentityList(type) {
		const list = [];
		if (this.props.exportIdentity || type === EXPORT_IDS_NOW) {	// download identities without prompt
			const id_list = await IdentityApi.getIdentities();
			id_list.forEach(id => {
				list.push({
					...id,
					type: 'identity',
				});
			});
		}
		return list;
	}

	async getExportList(type) {
		const identities = await this.getIdentityList(type);
		const cas = await this.getCAList(type);
		const orderers = await this.getOrdererList(type);
		const peers = await this.getPeerList(type);
		const msps = await this.getMspList(type);
		return [...identities, ...cas, ...orderers, ...peers, ...msps];
	}

	// figure out if the export has identities or not
	detectIdentity(data) {
		if (Array.isArray(data)) {
			for (let i in data) {
				if (data[i].type === 'identity') {
					return true;
				}
			}
		}
		return false;
	}

	onSubmit = async (who) => {
		const submit_type = (who === EXPORT_IDS_NOW) ? EXPORT_IDS_NOW : 'regular';
		Log.trace('export submit type:', submit_type);
		return new Promise((resolve, reject) => {
			this.getExportList(submit_type)
				.then(async list => {
					if (this.detectIdentity(list) || this.props.exportIdentity) {
						await UserSettingsRestApi.recordIdentityExport();
					}
					const node = {
						name: 'data',
						raft: list,
					};
					Helper.exportNodesAsZip(node);
					if (submit_type === EXPORT_IDS_NOW) {
						this.props.history.push('/settings');		// move off this route, back to regular settings page
					}
					resolve();
				})
				.catch(error => {
					console.error(error);
					reject(error);
				});
		});
	};

	render() {
		const translate = this.props.t;
		return (
			<Wizard title="export"
				onClose={this.props.onClose}
				onSubmit={this.onSubmit}
				submitButtonLabel={translate('export')}
				submitButtonId="export_button"
			>
				<WizardStep type="WizardStep">
					<p className="ibp-export-modal-desc">{translate('export_modal_desc1')}</p>
					<p className="ibp-export-modal-desc">{translate('export_modal_desc2')}</p>
					<p className="ibp-export-modal-desc">{translate('export_modal_desc3')}</p>
					<div>
						<Checkbox
							id="export_ca_checkbox"
							labelText={translate('cas')}
							onChange={() => {
								this.props.updateState(SCOPE, {
									exportCA: !this.props.exportCA,
								});
							}}
							checked={this.props.exportCA}
						/>
					</div>
					<div>
						<Checkbox
							id="export_orderer_checkbox"
							labelText={translate('orderers')}
							onChange={() => {
								this.props.updateState(SCOPE, {
									exportOrderer: !this.props.exportOrderer,
								});
							}}
							checked={this.props.exportOrderer}
						/>
					</div>
					<div>
						<Checkbox
							id="export_peer_checkbox"
							labelText={translate('peers')}
							onChange={() => {
								this.props.updateState(SCOPE, {
									exportPeer: !this.props.exportPeer,
								});
							}}
							checked={this.props.exportPeer}
						/>
					</div>
					<div>
						<Checkbox
							id="export_msp_checkbox"
							labelText={translate('msps')}
							onChange={() => {
								this.props.updateState(SCOPE, {
									exportMsp: !this.props.exportMsp,
								});
							}}
							checked={this.props.exportMsp}
						/>
					</div>
					<div className="ibp-export-identity-section">
						<Checkbox
							id="export_id_checkbox"
							labelText={translate('identities')}
							onChange={() => {
								this.props.updateState(SCOPE, {
									exportIdentity: !this.props.exportIdentity,
								});
							}}
							checked={this.props.exportIdentity}
						/>
					</div>
					{this.props.exportIdentity && <ImportantBox text="export_identity_important" />}
				</WizardStep>
			</Wizard>
		);
	}
}

const dataProps = {
	exportCA: PropTypes.bool,
	exportOrderer: PropTypes.bool,
	exportPeer: PropTypes.bool,
	exportMsp: PropTypes.bool,
	exportIdentity: PropTypes.bool,
	history: PropTypes.object,
};

ExportModal.propTypes = {
	...dataProps,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
	showWarning: PropTypes.func,
	updateState: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		showWarning,
		updateState,
	}
)(withTranslation()(ExportModal));
