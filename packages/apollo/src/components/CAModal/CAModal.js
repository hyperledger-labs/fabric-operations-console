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
import { Checkbox, CodeSnippet, ContentSwitcher, SkeletonText, Switch } from 'carbon-components-react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import { CertificateAuthorityRestApi } from '../../rest/CertificateAuthorityRestApi';
import IdentityApi from '../../rest/IdentityApi';
import { NodeRestApi } from '../../rest/NodeRestApi';
import ActionsHelper from '../../utils/actionsHelper';
import Clipboard from '../../utils/clipboard';
import Helper from '../../utils/helper';
import BlockchainTooltip from '../BlockchainTooltip/BlockchainTooltip';
import ConfigOverride from '../ConfigOverride/ConfigOverride';
import Form from '../Form/Form';
import HSMConfig from '../HSMConfig/HSMConfig';
import Logger from '../Log/Logger';
import SidePanelError from '../SidePanelError/SidePanelError';
import SidePanelWarning from '../SidePanelWarning/SidePanelWarning';
import TranslateLink from '../TranslateLink/TranslateLink';
import Wizard from '../Wizard/Wizard';
import WizardStep from '../WizardStep/WizardStep';
import RenderParamHTML from '../RenderHTML/RenderParamHTML';

const SCOPE = 'caModal';
const Log = new Logger(SCOPE);

export class CAModal extends React.Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			display_name: this.props.ca.display_name,
			tls_cert: _.get(this.props, 'ca.msp.component.tls_cert'),
			original_tls_cert: _.get(this.props, 'ca.msp.component.tls_cert'),
			error: null,
			update: false,
			loading: true,
			ca_database: _.get(this.props.ca, 'config_override.ca.db.type'),
			replica_set_cnt: this.props.ca.replicas || 1,
			hsm: null,
			action_in_progress: null,
			caModalType: undefined,
			config_override: null,
			editedConfigOverride: null,
			current_config: null,
			nodes_to_update: null,
		});
		this.loadData().then(() => {
			this.props.updateState(SCOPE, { loading: false });
		});
	}

	async loadData() {
		this.identities = null;
		try {
			this.identities = await IdentityApi.getIdentities();
			if (this.props.caModalType === 'associate') {
				this.showAssociateCA();
			}
		} catch (error) {
			Log.error(error);
		}
		if (this.props.caModalType === 'settings') {
			try {
				const ca_details = await NodeRestApi.api_getCurrentNodeDeployer(this.props.ca);
				const tls_cert = _.get(ca_details, 'msp.component.tls_cert');
				if (tls_cert && tls_cert !== _.get(this.props.ca, 'msp.component.tls_cert')) {
					this.props.updateState(SCOPE, {
						tls_cert,
						original_tls_cert: tls_cert,
					});
				}
				await this.checkUpdateTLSCert(tls_cert);
			} catch (error) {
				Log.error(error);
			}
		}
	}

	componentWillUnmount() {
		this.props.updateState(SCOPE, {
			identity: null,
			error: null,
		});
	}

	onComplete() {
		if (typeof this.props.onComplete === 'function') return this.props.onComplete(...arguments);
		Log.warn(`${SCOPE} ${this.props.caModalType}: onComplete() is not set`);
	}

	updateCA = (resolve, reject) => {
		const ca = {
			id: this.props.ca.id,
		};
		Helper.checkPropertyForUpdate(ca, this.props, 'display_name', this.props.ca);
		Helper.checkPropertyForUpdate(ca, this.props, 'tls_cert', this.props.ca, 'msp.component.tls_cert');
		if (this.props.ca_database === 'postgres') {
			Helper.checkPropertyForUpdate(ca, this.props, 'replica_set_cnt', this.props.ca, 'replicas');
		}
		CertificateAuthorityRestApi.updateCA(ca)
			.then(() => {
				this.props.onComplete({
					...this.props.ca,
					...ca,
				});
				resolve();
			})
			.catch(error => {
				Log.error(error);
				reject({
					title: 'error_update_ca',
					details: error,
				});
			});
	};

	updateConfigOverride = (resolve, reject) => {
		const ca = {
			...this.props.ca,
			config_override: this.props.editedConfigOverride ? this.props.editedConfigOverride : this.props.config_override,
		};
		CertificateAuthorityRestApi.updateConfigOverride(ca)
			.then(() => {
				this.props.onComplete(ca);
				resolve();
			})
			.catch(error => {
				Log.error(error);
				reject({
					title: 'error_update_ca',
					details: error,
				});
			});
	};

	async removeCA() {
		const prefix = 'removing CA:';
		try {
			await CertificateAuthorityRestApi.removeCA(this.props.ca);
		} catch (error) {
			Log.error(`${prefix} failed: ${error}`);
			throw error;
		}

		this.onComplete();
	}

	upgradeNode = (resolve, reject) => {
		let opts = {
			id: this.props.ca.id,
			version: this.props.new_version,
		};
		NodeRestApi.applyPatch(opts)
			.then(resp => {
				Log.debug('Upgrade CA response: ', resp);
				if ((resp && resp.message && resp.message === 'ok') || (resp && resp.status && resp.status === 'created')) {
					this.props.onComplete(resp);
					resolve();
				} else {
					this.props.updateState(SCOPE, {
						loading: false,
					});
					reject({
						title: 'error_occurred_during_upgrade',
						details: resp,
					});
				}
			})
			.catch(error => {
				Log.error('Error occurred while applying patch ', error.msg);
				this.props.updateState(SCOPE, {
					loading: false,
				});
				reject({
					title: 'error_occurred_during_upgrade',
					details: error,
				});
			});
	};

	getButtonLabel(translate) {
		let label = 'update_ca';
		switch (this.props.caModalType) {
			case 'delete':
				label = this.props.ca.location === 'ibm_saas' ? 'delete_ca' : 'remove_ca';
				break;
			case 'upgrade':
				label = 'patch_fabric_version';
				break;
			case 'associate':
				label = 'associate_identity';
				break;
			case 'enable_hsm':
			case 'update_hsm':
			case 'remove_hsm':
			case 'update_certs':
			case 'manage_hsm':
			case 'renew_tls_cert':
			case 'update_tls_cert':
			case 'restart':
				label = this.props.caModalType;
				break;
			default:
				break;
		}
		return translate(label);
	}

	getButtonId() {
		let id = 'update_ca';
		switch (this.props.caModalType) {
			case 'delete':
				id = 'confirm_remove';
				break;
			case 'associate':
				id = 'associate_identity';
				break;
			case 'upgrade':
				id = 'patch';
				break;
			case 'enable_hsm':
			case 'update_hsm':
			case 'remove_hsm':
			case 'update_certs':
			case 'manage_hsm':
			case 'renew_tls_cert':
			case 'update_tls_cert':
			case 'restart':
				id = this.props.caModalType;
				break;
			default:
				break;
		}
		return id;
	}

	getRenderFields() {
		const fields = [];
		fields.push({
			name: 'display_name',
			label: 'name',
			placeholder: 'name_placeholder',
			tooltip: this.props.ca.location === 'ibm_saas' ? 'edit_saas_ca_display_name_tooltip' : 'edit_icp_ca_display_name_tooltip',
			tooltipDirection: 'bottom',
			required: true,
			default: this.props.display_name,
			specialRules: Helper.SPECIAL_RULES_DISPLAY_NAME,
		});
		fields.push({
			name: 'tls_cert',
			label: 'pem',
			placeholder: 'pem_placeholder',
			type: 'certificate',
			tooltip: this.props.ca.location === 'ibm_saas' ? 'edit_saas_ca_pem_tooltip' : 'edit_icp_ca_pem_tooltip',
			required: true,
			default: this.props.tls_cert,
			validate: Helper.isCertificate,
			readonly: this.props.ca.location === 'ibm_saas',
		});
		if (this.props.ca_database === 'postgres' && this.props.ca.location === 'ibm_saas') {
			fields.push({
				name: 'replica_set_cnt',
				tooltip: 'replica_set_cnt_tooltip',
				default: this.props.replica_set_cnt,
				type: 'radio',
				options: [1, 2, 3],
				horizontal: true,
				description: 'replica_sets_desc',
			});
		}
		return fields;
	}

	showConfigOverride = () => {
		this.props.updateState(SCOPE, {
			current_config: null,
			current_config_json: null,
			config_override: {},
			editedConfigOverride: {},
			caModalType: 'config_override',
		});
		NodeRestApi.getCurrentNodeConfig(this.props.ca)
			.then(config => {
				this.props.updateState(SCOPE, {
					current_config: config,
				});
			})
			.catch(error => {
				Log.error(error);
				this.props.updateState(SCOPE, {
					current_config: {},
				});
			});
	};

	hideConfigOverride = () => {
		this.props.updateState(SCOPE, {
			config_override: null,
			editedConfigOverride: null,
			caModalType: null,
		});
	};

	renderConfigOverride(translate) {
		return (
			<WizardStep type="WizardStep"
				title="edit_config_override"
				disableSubmit={!this.props.editedConfigOverride}
				onCancel={this.hideConfigOverride}
			>
				<Form
					scope={SCOPE}
					id="config_override"
					fields={[
						{
							name: 'current_config_json',
							default: JSON.stringify(this.props.current_config || {}, null, 2),
							readonly: true,
							type: 'textarea',
							loading: !this.props.current_config,
						},
					]}
				/>
				<div className="ibp-form">
					<div className="ibp-form-field">
						<div>
							<BlockchainTooltip type="definition"
								tooltipText={translate('config_override_delta')}
							>
								{translate('config_override_json')}
							</BlockchainTooltip>
							<TranslateLink text="config_override_update_ca"
								className="ibp-ca-config-override-desc-with-link"
							/>
						</div>
						<p className="ibp-form-input">
							<ConfigOverride
								id="ibp-config-override"
								config_override={this.props.config_override}
								onChange={editedConfigOverride => {
									this.props.updateState(SCOPE, {
										editedConfigOverride,
									});
								}}
							/>
						</p>
					</div>
				</div>
			</WizardStep>
		);
	}

	renderActionButtons(translate) {
		if (!this.props.ca) {
			return;
		}
		if (this.props.loading) {
			return (
				<div>
					<SkeletonText
						style={{
							paddingTop: '.5rem',
							width: '8rem',
							height: '2.5rem',
						}}
					/>
				</div>
			);
		}
		const buttons = [];
		const saas = this.props.ca.location === 'ibm_saas' && ActionsHelper.canCreateComponent(this.props.userInfo, this.props.feature_flags);
		if (saas) {
			if (this.props.clusterType !== 'free') {
				buttons.push({
					id: 'edit_config_override',
					onClick: this.showConfigOverride,
				});
			}
			// Do not allow HSM enable, disable, or update for now
			// if (this.props.feature_flags && this.props.feature_flags.hsm_enabled) {
			// 	const hsm = Helper.getHSMBCCSP(_.get(this.props, 'ca.config_override.ca')) === 'PKCS11';
			// 	if (hsm) {
			// 		buttons.push({
			// 			id: 'update_hsm_action',
			// 			label: 'update_hsm',
			// 		});
			// 		buttons.push({
			// 			id: 'remove_hsm_action',
			// 			label: 'remove_hsm',
			// 		});
			// 	} else {
			// 		buttons.push({
			// 			id: 'enable_hsm_action',
			// 			label: 'enable_hsm',
			// 		});
			// 	}
			// }
			buttons.push({
				id: 'renew_tls_cert',
			});
			buttons.push({
				id: 'restart',
			});
		}
		if (this.props.nodes_to_update && this.props.nodes_to_update.length) {
			buttons.push({
				id: 'update_tls_cert',
			});
		}
		if (buttons.length === 0) {
			return;
		}
		return (
			<div>
				<p className="ibp-actions-title">{translate('actions')}</p>
				{buttons.map(button => (
					<button
						id={button.id}
						key={button.id}
						className="ibp-ca-action bx--btn bx--btn--tertiary bx--btn--sm"
						onClick={() => {
							if (button.onClick) {
								button.onClick();
							} else {
								this.showAction(button.id);
							}
						}}
					>
						{translate(button.label || button.id)}
					</button>
				))}
			</div>
		);
	}

	async checkUpdateTLSCert(tls_cert) {
		// get the CA root certificate
		this.props.updateState(SCOPE, { nodes_to_update: null });
		const ca_root_certs = _.get(this.props.ca, 'msp.ca.root_certs') || [];
		if (!ca_root_certs.length) {
			const root_cert = await CertificateAuthorityRestApi.getRootCertificate(this.props.ca);
			if (root_cert) {
				ca_root_certs.push(root_cert);
			}
		}
		// get all the peers and ordering nodes in the system
		const nodes_to_update = [];
		const all_nodes = await NodeRestApi.getNodes(['fabric-peer', 'fabric-orderer']);
		const nodes = (Array.isArray(all_nodes) && all_nodes.length > 0) ? all_nodes.filter(n => n && n.type === 'fabric-peer') : [];
		const orderers = (Array.isArray(all_nodes) && all_nodes.length > 0) ? all_nodes.filter(n => n && n.type === 'fabric-orderer') : [];

		orderers.forEach(orderer => {
			if (orderer.raft) {
				orderer.raft.forEach(raft => {
					nodes.push(raft);
				});
			} else {
				nodes.push(orderer);
			}
		});
		const ca_tls_cert = tls_cert || _.get(this.props.ca, 'msp.component.tls_cert');
		nodes.forEach(node => {
			// check if the node was created with this console (not imported) and is
			// not using third party ca certificates
			if (node.location === 'ibm_saas' && _.get(node, 'crypto.enrollment')) {
				// check if the node is from the CA by comparing the root certs
				const node_ca_root_certs = _.get(node, 'msp.ca.root_certs') || [];
				const common = _.intersection(ca_root_certs, node_ca_root_certs);
				if (common && common.length) {
					// check if the node already has the correct TLS certificate for the CA
					const comp_tls_cert = _.get(node, 'crypto.enrollment.component.catls.cacert');
					const node_tls_cert = _.get(node, 'crypto.enrollment.tls.catls.cacert');
					if (node_tls_cert !== ca_tls_cert || comp_tls_cert !== ca_tls_cert) {
						nodes_to_update.push({
							node,
							update: true,
						});
					}
				}
			}
		});
		this.props.updateState(SCOPE, { nodes_to_update });
	}

	renderDetails(translate) {
		const fields = this.getRenderFields();
		return (
			<WizardStep type="WizardStep"
				title="ca_details"
				disableSubmit={!this.props.update || (this.props.config_override && !this.props.editedConfigOverride)}
			>
				<Form
					scope={SCOPE}
					id={SCOPE}
					fields={fields}
					onChange={(data, valid) => {
						const changed = Helper.isChanged(fields, data, this.props, this.props.ca);
						this.props.updateState(SCOPE, {
							update: valid && (changed || this.props.editedConfigOverride),
						});
					}}
				/>
				{this.renderActionButtons(translate)}
			</WizardStep>
		);
	}

	renderRemove(translate) {
		return (
			<WizardStep
				type="WizardStep"
				title={this.props.ca.location === 'ibm_saas' ? 'delete_ca' : 'remove_ca'}
				disableSubmit={this.props.confirm_ca_name !== this.props.ca.display_name}
				onCancel={this.props.caModalType === 'delete' ? null : this.hideRemoveCA}
			>
				<div className="ibp-remove-ca-desc">
					<p>
						{this.props.ca.location === 'ibm_saas' ? RenderParamHTML(translate, 'delete_ca_desc', {
							name: <CodeSnippet
								type="inline"
								ariaLabel={translate('copy_text', { copyText: this.props.ca.display_name })}
								light={false}
								onClick={() => Clipboard.copyToClipboard(this.props.ca.display_name)}
							>
								{this.props.ca.display_name}
							</CodeSnippet>
						}) : RenderParamHTML(translate, 'remove_ca_desc', {
							name: <CodeSnippet
								type="inline"
								ariaLabel={translate('copy_text', { copyText: this.props.ca.display_name })}
								light={false}
								onClick={() => Clipboard.copyToClipboard(this.props.ca.display_name)}
							>
								{this.props.ca.display_name}
							</CodeSnippet>
						})}
					</p>
				</div>
				<div className="ibp-remove-ca-confirm">{translate('remove_ca_confirm')}</div>
				<Form
					scope={SCOPE}
					id={SCOPE + '-remove'}
					fields={[
						{
							name: 'confirm_ca_name',
							tooltip: 'remove_ca_name_tooltip',
						},
					]}
				/>
			</WizardStep >
		);
	}

	renderUpgrade(translate) {
		return (
			<WizardStep type="WizardStep"
				title="patch_fabric_version"
				disableSubmit={this.props.loading}
				onCancel={this.props.onClose}
			>
				<div>
					<div className="ibp-remove-peer-desc">
						<p>
							{RenderParamHTML(translate, 'upgrade_node_desc', {
								name: <CodeSnippet
									type="inline"
									ariaLabel={translate('copy_text', { copyText: this.props.ca.display_name })}
									light={false}
									onClick={() => Clipboard.copyToClipboard(this.props.ca.display_name)}
								>
									{this.props.ca.display_name}
								</CodeSnippet>
							})}
						</p>
					</div>

					<div>
						<div className="ibp-node-current-version">
							<div className="ibp-node-current-version-label">{translate('fabric_node_to_be_updated')}</div>
							<div className="ibp-node-name-version">
								<span className="ibp-node-name">{this.props.ca.display_name}</span>
								<span className="ibp-node-version">{this.props.ca.version}</span>
							</div>
						</div>
						<div className="ibp-box-connector" />
						<div className="ibp-node-new-version">
							<div>
								<div className="ibp-node-available-versions">
									<Form
										scope={SCOPE}
										id={SCOPE + '-new-version'}
										fields={[
											{
												name: 'new_version',
												type: 'dropdown',
												options: this.props.ca.upgradable_versions,
											},
										]}
									/>
									<div>
										<a
											className="ibp-new-version-release-notes"
											href={translate('release_notes_docs', { DOC_PREFIX: this.props.docPrefix })}
											target="_blank"
											rel="noopener noreferrer"
										>
											{translate('view_release_notes')}
										</a>
									</div>
								</div>
							</div>
						</div>
						<div className="ibp-error-panel">
							<SidePanelWarning title="node_unavailable_during_upgrade_title"
								subtitle="node_unavailable_during_upgrade_desc"
							/>
						</div>
					</div>
				</div>
			</WizardStep>
		);
	}

	renderConfirmUpgrade(translate) {
		return (
			<WizardStep type="WizardStep"
				title="patch_fabric_version"
				disableSubmit={this.props.confirm_upgrade_node_name !== this.props.ca.display_name}
			>
				<div>
					<div className="ibp-remove-peer-desc">
						<p>
							{RenderParamHTML(translate, 'confirm_patch_desc', {
								name: (
									<CodeSnippet
										type="inline"
										ariaLabel={translate('copy_text', { copyText: this.props.ca.display_name })}
										light={false}
										onClick={() => Clipboard.copyToClipboard(this.props.ca.display_name)}
									>
										{this.props.ca.display_name}
									</CodeSnippet>
								),
								version: (
									<CodeSnippet
										type="inline"
										ariaLabel={translate('copy_text', { copyText: this.props.new_version })}
										light={false}
										onClick={() => Clipboard.copyToClipboard(this.props.new_version)}
									>
										{this.props.new_version}
									</CodeSnippet>
								)
							})}
						</p>
					</div>
					<div className={this.props.loading ? 'ibp-hidden' : ''}>
						<div className="ibp-remove-peer-confirm">{translate('remove_ca_confirm')}</div>
						<Form
							scope={SCOPE}
							id={SCOPE + '-remove'}
							fields={[
								{
									name: 'confirm_upgrade_node_name',
									tooltip: 'remove_ca_name_tooltip',
									required: true,
								},
							]}
						/>
					</div>
				</div>
			</WizardStep>
		);
	}

	showAssociateCA = () => {
		const props = {
			associate: true,
			identityType: 'none',
			identity: null,
			enroll_id: '',
			enroll_secret: '',
			enroll_valid: false,
			enroll_in_progress: false,
			enroll_certificate: null,
			enroll_private_key: null,
			enroll_identity_name: this.props.ca.display_name + ' ' + (this.props.t ? this.props.t('admin') : 'Admin'),
			enroll_identity_valid: false,
			identityValid: false,
		};
		if (this.identities) {
			if (this.props.ca.associatedIdentity) {
				props.identityType = 'existing';
				const identity = this.getDefaultIdentity();
				if (identity && !_.isString(identity)) {
					props.identity = identity;
					props.identityValid = true;
				}
			}
		}
		this.props.updateState(SCOPE, props);
	};

	associateIdentity(resolve, reject) {
		let identityType = this.props.identityType;
		let identity = this.props.identity;
		if (identityType === 'none') {
			CertificateAuthorityRestApi.generateCertificate(this.props.ca, this.props.ca.ca_name, this.props.enroll_id, this.props.enroll_secret)
				.then(resp => {
					identity = {
						name: this.props.enroll_identity_name,
						cert: resp.certificate,
						private_key: resp.private_key,
					};
					IdentityApi.createIdentity([identity])
						.then(() => {
							this.associateIdentityWithCA(identity, resolve, reject);
						})
						.catch(error => {
							Log.error(error);
							let details = error;
							if (error.title) {
								details.error = this.props.t(error.title);
							}
							reject({
								title: 'error_add_identity',
								details,
							});
						});
				})
				.catch(error => {
					Log.error(error);
					reject({
						title: 'error_generate_cert',
						details: error,
					});
				});
		}
		if (identityType === 'existing') {
			this.associateIdentityWithCA(identity, resolve, reject);
		}
	}

	associateIdentityWithCA(identity, resolve, reject) {
		IdentityApi.associateCertificateAuthority(identity.name, this.props.ca.id)
			.then(() => {
				const ca = {
					...this.props.ca,
					associatedIdentity: identity.name,
				};
				this.props.onComplete(ca);
				resolve();
			})
			.catch(error => {
				Log.error(error);
				reject({
					title: 'error_associate_identity',
					details: error,
				});
			});
	}

	getDefaultIdentity() {
		if (this.props.identity) {
			return this.props.identity;
		}
		let id = undefined;
		if (this.identities) {
			const aid = this.props.ca.associatedIdentity;
			if (aid) {
				this.identities.forEach(identity => {
					if (identity.name === aid) {
						id = identity;
					}
				});
			}
			if (!id) {
				id = 'select_wallet_identity';
			}
		}
		return id;
	}

	renderAssociationSwitch(translate) {
		const res = [];
		res.push(<Switch kind="button"
			id="ibp-use-enroll-id"
			key="ibp-use-enroll-id"
			name="none"
			text={translate('use_enroll_id')}
		/>);
		res.push(<Switch kind="button"
			id="ibp-use-existing-identity"
			key="ibp-useexisting-identity"
			name="existing"
			text={translate('use_existing_identity')}
		/>);
		return res;
	}

	renderAssociateCA(translate) {
		const identityType = this.props.identityType;
		let selectedIndex = 0;
		if (identityType === 'existing') {
			selectedIndex = 1;
		}
		return (
			<WizardStep type="WizardStep"
				title="associate_identity"
				disableSubmit={identityType === 'none' ? !this.props.enroll_valid : !this.props.identityValid}
			>
				<div>
					<p className="ibp-modal-desc">{translate('associate_identity_ca_desc')}</p>
				</div>
				<ContentSwitcher className="ibp-identity-type-toggle"
					onChange={this.updateIdentityType}
					selectedIndex={selectedIndex}
				>
					{this.renderAssociationSwitch(translate)}
				</ContentSwitcher>
				{identityType === 'none' && (
					<div>
						<Form
							scope={SCOPE}
							id={SCOPE + '-identity'}
							fields={[
								{
									name: 'enroll_id',
									label: 'enroll_id',
									placeholder: 'enroll_id_placeholder',
									tooltip: 'edit_ca_enroll_id_tooltip',
									required: true,
									default: this.props.enroll_id,
									specialRules: Helper.SPECIAL_RULES_ENROLL_ID,
								},
								{
									name: 'enroll_secret',
									label: 'enroll_secret',
									placeholder: 'enroll_secret_placeholder',
									type: 'password',
									tooltip: 'edit_ca_enroll_secret_tooltip',
									required: true,
									default: this.props.enroll_secret,
									specialRules: Helper.SPECIAL_RULES_ENROLL_SECRET,
								},
								{
									name: 'enroll_identity_name',
									label: 'identity_display_name',
									tooltip: 'enroll_identity_name_tooltip',
									required: true,
									specialRules: Helper.SPECIAL_RULES_IDENTITY_NAME,
									placeholder: 'name_placeholder',
									default: this.props.enroll_identity_name,
								},
							]}
							onChange={(data, valid) => {
								this.props.updateState(SCOPE, {
									enroll_valid: valid,
								});
							}}
						/>
						{this.props.error && <SidePanelError error={this.props.error} />}
					</div>
				)}
				{identityType === 'existing' && !this.props.loading && (
					<div>
						{(!this.identities || !this.identities.length) && <p className="ibp-no-identities">{translate('no_ca_identities')}</p>}
						<Form
							scope={SCOPE}
							id={SCOPE + '-associate'}
							fields={[
								{
									name: 'identity',
									label: 'ca_admin_identity',
									type: 'dropdown',
									tooltip: 'ca_existing_identity_dropdown_tooltip',
									options: this.identities,
									required: true,
									default: this.identities && this.identities.length ? this.getDefaultIdentity() : translate('no_identities'),
								},
							]}
							onChange={this.onIdentityChange}
						/>
					</div>
				)}
			</WizardStep>
		);
	}

	onIdentityChange = (data, valid) => {
		this.props.updateState(SCOPE, {
			identityValid: valid,
		});
	};

	updateIdentityType = evt => {
		const identityType = this.props.identityType === 'existing' ? 'none' : 'existing';
		let identity = identityType === 'existing' ? this.getDefaultIdentity() : null;
		if (identity && _.isString(identity)) {
			identity = null;
		}
		let identityValid = identityType !== 'new';
		if (identityType === 'existing' && !identity) {
			identityValid = false;
		}
		this.props.updateState(SCOPE, {
			identityType,
			identity,
			identityValid,
		});
	};

	async onSubmit() {
		const prefix = `${this.props.caModalType} onSubmit:`;
		try {
			Log.info(`${prefix} submitting`);
			switch (this.props.caModalType) {
				case 'delete':
					await this.removeCA();
					break;
				case 'upgrade':
					await new Promise((resolve, reject) => this.upgradeNode(resolve, reject));
					break;
				case 'associate':
					await new Promise((resolve, reject) => this.associateIdentity(resolve, reject));
					break;
				case 'enable_hsm':
				case 'update_hsm':
				case 'remove_hsm':
				case 'update_certs':
					await new Promise((resolve, reject) => this.updateHSM(resolve, reject));
					break;
				case 'config_override':
					await new Promise((resolve, reject) => this.updateConfigOverride(resolve, reject));
					break;
				case 'renew_tls_cert':
					await this.renewTLSCertificate();
					break;
				case 'update_tls_cert':
					await this.updateTLSCertificate();
					break;
				case 'restart':
					await NodeRestApi.restartNode(this.props.ca);
					this.props.onComplete(this.props.ca);
					break;
				default:
					await new Promise((resolve, reject) => this.updateCA(resolve, reject));
					break;
			}
		} catch (error) {
			Log.error(`${prefix} failed: ${error}`);
			// Errors thrown will be caught in the Wizard's onSubmit function, where they will be stored.  Errors on the Wizard are rendered as SidePanelErrors
			throw error;
		}
	}

	updateHSM(resolve, reject) {
		const ca = {
			...this.props.ca,
		};
		switch (this.props.caModalType) {
			case 'enable_hsm':
			case 'update_hsm':
				ca.config_override = {
					ca: {
						BCCSP: {
							Default: 'PKCS11',
							PKCS11: {
								Label: this.props.hsm.label,
								Pin: this.props.hsm.pin,
							},
						},
					},
				};
				if (this.props.hsm.pkcs11endpoint) {
					ca.hsm = {
						pkcs11endpoint: this.props.hsm.pkcs11endpoint,
					};
				}
				break;
			case 'remove_hsm':
				ca.config_override = {
					ca: {
						BCCSP: {
							// Not sure what to set here yet
						},
					},
				};
				ca.hsm = null;
				break;
			default:
				/* update_certs */
				break;
		}
		CertificateAuthorityRestApi.updateConfigOverride(ca)
			.then(ca => {
				this.props.onComplete(ca);
				resolve();
			})
			.catch(error => {
				Log.error(error);
				reject({
					title: 'error_update_ca',
					details: error,
				});
			});
	}

	renderUpdateCertificates(translate) {
		const show_hsm = this.props.caModalType === 'enable_hsm' || this.props.caModalType === 'update_hsm';
		let valid = show_hsm ? this.props.hsm : true;
		return (
			<WizardStep type="WizardStep"
				title={this.props.caModalType}
				disableSubmit={!valid}
				onCancel={this.props.action_in_progress ? this.hideAction : null}
			>
				{show_hsm ? (
					<div>
						<p>{translate('hsm_ca_desc')}</p>
						<HSMConfig scope={SCOPE} />
					</div>
				) : (
					<div></div>
				)}
			</WizardStep>
		);
	}

	renderUpdateSummary(translate) {
		const show_hsm = this.props.caModalType === 'enable_hsm' || this.props.caModalType === 'update_hsm';
		return (
			<WizardStep type="WizardStep"
				title="summary"
			>
				{show_hsm && Helper.renderHSMSummary(translate, this.props.hsm)}
			</WizardStep>
		);
	}

	showAction(action) {
		this.props.updateState(SCOPE, {
			action_in_progress: this.props.caModalType,
			caModalType: action,
		});
	}

	hideAction = () => {
		this.props.updateState(SCOPE, {
			action_in_progress: null,
			caModalType: this.props.action_in_progress,
		});
		this.props.updateState('wizard', { error: null });
	};

	renderManageHSM(translate) {
		return (
			<WizardStep type="WizardStep"
				title="manage_hsm"
			>
				<div className="ibp-ca-hsm-desc">
					<p>{translate('hsm_ca_desc')}</p>
				</div>
				<div>
					<button
						id="update_hsm_action"
						className="ibp-ca-action bx--btn bx--btn--tertiary bx--btn--sm"
						onClick={() => {
							this.showAction('update_hsm');
						}}
					>
						{translate('update_hsm')}
					</button>
					<button
						id="remove_hsm_action"
						className="ibp-ca-action bx--btn bx--btn--sm bx--btn--danger"
						onClick={() => {
							this.showAction('remove_hsm');
						}}
					>
						{translate('remove_hsm')}
					</button>
				</div>
			</WizardStep>
		);
	}

	async renewTLSCertificate() {
		await CertificateAuthorityRestApi.renewTLSCertificate(this.props.ca);
		this.props.onComplete({
			...this.props.ca,
		});
		return;
	}

	renderRenewTLSCertificate(translate) {
		return (
			<WizardStep type="WizardStep"
				title="renew_tls_cert"
				onCancel={this.hideAction}
			>
				<div className="ibp-renew-tls-desc">
					<p>{translate('renew_ca_tls_cert_desc')}</p>
				</div>
			</WizardStep>
		);
	}

	async updateTLSCertificate() {
		const api_calls = [];
		const restart_api_calls = [];
		let last_error = null;

		this.props.nodes_to_update.forEach(item => {
			if (item.update) {
				api_calls.push(NodeRestApi.updateTLSCertificate(item.node, this.props.original_tls_cert));
				restart_api_calls.push(NodeRestApi.restartNode(item.node));
			}
		});

		if (api_calls.length) {
			try {
				// update each node with the new tls cert
				await Promise.all(api_calls);
			} catch (error) {
				Log.error(error);
				last_error = new Error();
				last_error.title = 'error_update_tls_cert';
				last_error.details = error;
				// don't throw this error yet, let the restarts occur first
			}

			try {
				// restart each node
				if (restart_api_calls.length) {
					await Promise.all(restart_api_calls);
				}
			} catch (error) {
				Log.error(error);
			}

			if (last_error) {
				throw last_error;
			}
		}

		const updated = { ...this.props.ca };
		_.set(updated, 'msp.component.tls_cert', this.props.original_tls_cert);
		this.props.onComplete(updated, true);
	}

	renderUpdateTLSCertificate(translate) {
		return (
			<WizardStep type="WizardStep"
				title="update_tls_cert"
				onCancel={this.hideAction}
			>
				<div className="ibp-update-tls-desc">
					<p>{translate('update_tls_cert_desc')}</p>
				</div>
				{this.props.nodes_to_update ? (
					<div>
						{this.props.nodes_to_update.map(item => {
							return (
								<Checkbox
									id={'checkbox_' + item.node.id}
									key={item.node.id}
									labelText={item.node.display_name}
									onChange={() => {
										item.update = !item.update;
										this.props.updateState(SCOPE, {
											nodes_to_update: [...this.props.nodes_to_update],
										});
									}}
									checked={item.update}
								/>
							);
						})}
					</div>
				) : (
					<SkeletonText
						style={{
							paddingTop: '.5rem',
							width: '8rem',
							height: '2.5rem',
						}}
					/>
				)}
			</WizardStep>
		);
	}

	renderRestart(translate) {
		return (
			<WizardStep type="WizardStep"
				title="restart"
				onCancel={this.hideAction}
			>
				<div className="ibp-restart-ca-desc">
					<p>{translate('restart_ca_desc')}</p>
				</div>
			</WizardStep>
		);
	}

	renderPages(translate) {
		switch (this.props.caModalType) {
			case 'delete':
				return this.renderRemove(translate);
			case 'upgrade':
				return [this.renderUpgrade(translate), this.renderConfirmUpgrade(translate)];
			case 'associate':
				return this.renderAssociateCA(translate);
			case 'enable_hsm':
			case 'update_hsm':
			case 'remove_hsm':
			case 'update_certs':
				return [this.renderUpdateCertificates(translate), this.renderUpdateSummary(translate)];
			case 'manage_hsm':
				return this.renderManageHSM(translate);
			case 'config_override':
				return this.renderConfigOverride(translate);
			case 'renew_tls_cert':
				return this.renderRenewTLSCertificate(translate);
			case 'update_tls_cert':
				return this.renderUpdateTLSCertificate(translate);
			case 'restart':
				return this.renderRestart(translate);
			default:
				return this.renderDetails(translate);
		}
	}

	render() {
		const translate = this.props.t;
		return (
			<Wizard
				onClose={this.props.onClose}
				onSubmit={this.props.caModalType === 'manage_hsm' ? undefined : () => this.onSubmit()}
				submitButtonLabel={this.getButtonLabel(translate)}
				submitButtonId={this.getButtonId()}
			>
				{this.renderPages(translate)}
			</Wizard>
		);
	}
}

const dataProps = {
	caModalType: PropTypes.string,
	display_name: PropTypes.string,
	url: PropTypes.string,
	error: PropTypes.object,
	update: PropTypes.bool,
	loading: PropTypes.bool,
	confirm_ca_name: PropTypes.string,
	enroll_id: PropTypes.string,
	enroll_secret: PropTypes.string,
	tls_cert: PropTypes.string,
	identity: PropTypes.object,
	identityType: PropTypes.string,
	identityValid: PropTypes.bool,
	confirm_upgrade_node_name: PropTypes.string,
	new_version: PropTypes.string,
	enroll_valid: PropTypes.bool,
	enroll_in_progress: PropTypes.bool,
	enroll_certificate: PropTypes.string,
	enroll_private_key: PropTypes.string,
	enroll_identity_name: PropTypes.string,
	enroll_identity_valid: PropTypes.bool,
	replica_set_cnt: PropTypes.number,
	ca_database: PropTypes.string,
	hsm: PropTypes.object,
	action_in_progress: PropTypes.string,
	config_override: PropTypes.object,
	editedConfigOverride: PropTypes.object,
	current_config: PropTypes.object,
	nodes_to_update: PropTypes.array,
	original_tls_cert: PropTypes.string,
};

CAModal.propTypes = {
	...dataProps,
	ca: PropTypes.object,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
	updateState: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['CRN'] = state['settings'] ? state['settings']['CRN'] : null;
		newProps['userInfo'] = state['userInfo'] ? state['userInfo'] : null;
		newProps['docPrefix'] = state['settings'] ? state['settings']['docPrefix'] : null;
		newProps['feature_flags'] = state['settings'] ? state['settings']['feature_flags'] : null;
		newProps['crn_string'] = state['settings'] ? state['settings']['crn_string'] : null;
		return newProps;
	},
	{
		updateState,
	}
)(withTranslation()(CAModal));
