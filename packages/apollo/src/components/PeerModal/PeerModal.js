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
import { CodeSnippet, SkeletonText, ToggleSmall } from 'carbon-components-react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import { CertificateAuthorityRestApi } from '../../rest/CertificateAuthorityRestApi';
import IdentityApi from '../../rest/IdentityApi';
import { MspRestApi } from '../../rest/MspRestApi';
import { NodeRestApi } from '../../rest/NodeRestApi';
import { PeerRestApi } from '../../rest/PeerRestApi';
import StitchApi from '../../rest/StitchApi';
import ActionsHelper from '../../utils/actionsHelper';
import Clipboard from '../../utils/clipboard';
import * as constants from '../../utils/constants';
import Helper from '../../utils/helper';
import BlockchainTooltip from '../BlockchainTooltip/BlockchainTooltip';
import ConfigOverride from '../ConfigOverride/ConfigOverride';
import Form from '../Form/Form';
import HSMConfig from '../HSMConfig/HSMConfig';
import Logger from '../Log/Logger';
import LogSettings from '../LogSettings/LogSettings';
import SidePanelWarning from '../SidePanelWarning/SidePanelWarning';
import SidePanelError from '../SidePanelError/SidePanelError';
import TranslateLink from '../TranslateLink/TranslateLink';
import Wizard from '../Wizard/Wizard';
import WizardStep from '../WizardStep/WizardStep';
import { Checkbox } from 'carbon-components-react';
import RenderParamHTML from '../RenderHTML/RenderParamHTML';

const SCOPE = 'peerModal';
const Log = new Logger(SCOPE);
const semver = require('semver');

class PeerModal extends React.Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			display_name: this.props.peer.display_name,
			tls_ca_root_certs: this.props.peer.msp.tlsca.root_certs,
			update: false,
			loading: true,
			disableAssociate: true,
			disableRemove: true,
			disableUpgrade: true,
			update_certs: false,
			third_party_ca: false,
			hsm: null,
			cas: [],
			saas_ca: null,
			enroll_id: null,
			enroll_secret: null,
			loadingUsers: false,
			users: [],
			saas_ca_valid: false,
			third_party_ca_valid: false,
			saas_ca_cert: null,
			saas_ca_private_key: null,
			filenames: {},
			action_in_progress: null,
			peerModalType: undefined,
			config_override: null,
			editedConfigOverride: null,
			current_config: null,
			maxBlockHeight: 0,
			manage_ecert: null,
			manage_tls_cert: null,
			manage_ekey: null,
			manage_tls_key: null,
			log_loading: false,
			log_level_identity: null,
			log_spec: null,
			new_log_spec: null,
			ignore_breaking: false,
		});
		this.identities = null;
		this.tls_identities = [];
		this.initData();
	}

	async initData() {
		await this.getMaxBlockHeight();
		await this.testVersion(this.props.new_version);
		this.getCAWithUsers();
	}

	onComplete() {
		if (typeof this.props.onComplete === 'function') return this.props.onComplete(...arguments);
		Log.warn(`${SCOPE} ${this.props.peerModalType}: onComplete() is not set`);
	}

	async getIdentities() {
		let root_certs = _.get(this.props, 'peer.msp.ca.root_certs');
		let tls_root_certs = _.get(this.props, 'peer.msp.tlsca.root_certs');
		let intermediate_certs = [];
		let tls_intermediate_certs = [];
		let node_msp = _.get(this.props, 'peer.msp_id');
		let all_msps = await MspRestApi.getAllMsps();
		all_msps.forEach(msp => {
			if (node_msp === msp.msp_id && _.isEqual(root_certs, msp.root_certs)) {
				intermediate_certs = msp.intermediate_certs;
				tls_intermediate_certs = msp.tls_intermediate_certs;
			}
		});

		let matched_identities = [];
		let matched_tls_identities = [];
		IdentityApi.getIdentities()
			.then(async identities => {
				if (identities.length) {
					for (let l_identity of identities) {
						let opts = {
							certificate_b64pem: l_identity.cert,
							root_certs_b64pems: Helper.safer_concat(root_certs, intermediate_certs),
						};
						let match = await StitchApi.isIdentityFromRootCert(opts);
						if (match) {
							matched_identities.push(l_identity);
						}

						let tls_opts = {
							certificate_b64pem: l_identity.cert,
							root_certs_b64pems: Helper.safer_concat(tls_root_certs, tls_intermediate_certs),
						};
						let tls_match = await StitchApi.isIdentityFromRootCert(tls_opts);
						if (tls_match) {
							matched_tls_identities.push(l_identity);
						}
					}
					this.identities = matched_identities;
					this.tls_identities = matched_tls_identities;
					const identity = this.getDefaultIdentity();
					this.props.updateState(SCOPE, {
						identity,
						disableAssociate: !identity,
					});
				}
			})
			.catch(error => {
				Log.error(error);
			})
			.finally(() => {
				this.props.updateState(SCOPE, { loading: false });
			});
	}

	componentWillUnmount() {
		this.props.updateState(SCOPE, { identity: null });
	}

	async getMaxBlockHeight() {
		let maxBlockHeight = 0;
		try {
			const data = await PeerRestApi.getChannels(this.props.peer.id);
			if (data.channelList) {
				data.channelList.forEach(channel => {
					maxBlockHeight = Math.max(maxBlockHeight, channel.block_height);
				});
			}
		} catch (error) {
			Log.error(error);
		}
		this.props.updateState(SCOPE, { maxBlockHeight });
	}

	getCAList() {
		return new Promise((resolve, reject) => {
			if (this.props.cas && this.props.cas.length > 0) {
				Log.debug('CAs from store:', this.props.cas);
				resolve(this.props.cas);
			} else {
				CertificateAuthorityRestApi.getCAs()
					.then(cas => {
						Log.debug('CAs from backend:', cas);
						resolve(cas);
					})
					.catch(error => {
						Log.error('An error occurred when getting list of available CAs: ', error);
						reject(error);
					});
			}
		});
	}

	getCAWithUsers() {
		this.getCAList()
			.then(cas => {
				this.props.updateState(SCOPE, {
					cas,
				});
				if (cas.length) {
					return this.loadUsersFromCA(cas[0]);
				}
			})
			.catch(error => {
				Log.error(error);
			})
			.finally(() => {
				this.getIdentities();
			});
	}

	loadUsersFromCA(ca) {
		this.props.updateState(SCOPE, { loadingUsers: true });
		return CertificateAuthorityRestApi.getUsers(ca)
			.then(users => {
				if (users && users.length) {
					this.props.updateState(SCOPE, {
						enroll_id: users[0].id,
						enroll_secret: undefined,
						users,
						loadingUsers: false,
						saasCAValid: false,
					});
				} else {
					this.props.updateState(SCOPE, {
						enroll_id: undefined,
						users: [],
						loadingUsers: false,
						saasCAValid: false,
					});
				}
			})
			.catch(error => {
				Log.error(error);
				this.props.updateState(SCOPE, {
					enroll_id: undefined,
					users: [],
					loadingUsers: false,
					saasCAValid: false,
				});
			});
	}

	updatePeer(resolve, reject) {
		const peer = {
			id: this.props.peer.id,
		};
		Helper.checkPropertyForUpdate(peer, this.props, 'display_name', this.props.peer);
		Helper.checkPropertyForUpdate(peer, this.props, 'tls_ca_root_certs', this.props.peer, 'msp.tlsca.root_certs');
		PeerRestApi.updatePeer(peer)
			.then(peer => {
				this.props.onComplete(peer);
				resolve();
			})
			.catch(error => {
				Log.error(error);
				reject({
					title: 'error_update_peer',
					details: error,
				});
			});
	}

	updateHSM(resolve, reject) {
		const peer = {
			...this.props.peer,
		};
		switch (this.props.peerModalType) {
			case 'enable_hsm':
			case 'update_hsm':
				peer.config_override = {};
				peer.config_override.peer = {
					BCCSP: {
						Default: 'PKCS11',
						PKCS11: {
							Label: this.props.hsm.label,
							Pin: this.props.hsm.pin,
						},
					},
				};
				if (this.props.hsm.pkcs11endpoint) {
					peer.hsm = {
						pkcs11endpoint: this.props.hsm.pkcs11endpoint,
					};
				}
				break;
			case 'remove_hsm':
				peer.config_override = {};
				peer.config_override.peer = {
					BCCSP: {
						// Not sure what to set here yet
					},
				};
				peer.hsm = null;
				break;
			default:
				/* update_certs */
				break;
		}
		PeerRestApi.updateConfigOverride(peer)
			.then(peer => {
				this.props.onComplete(peer);
				resolve();
			})
			.catch(error => {
				Log.error(error);
				reject({
					title: 'error_update_peer',
					details: error,
				});
			});
	}

	async removePeer() {
		const prefix = 'Removing Peer:';
		try {
			await PeerRestApi.removePeer(this.props.peer);
		} catch (error) {
			Log.error(`${prefix} failed: ${error}`);
			throw error;
		}

		this.onComplete();
	}

	upgradeNode(resolve, reject) {
		let opts = {
			id: this.props.peer.id,
			version: this.props.new_version,
			ignore_warnings: this.props.ignore_breaking
		};
		NodeRestApi.applyPatch(opts)
			.then(resp => {
				Log.debug('Upgrade peer response: ', resp);
				if ((resp && resp.message && resp.message === 'ok') || (resp && resp.status && resp.status === 'created')) {
					this.props.onComplete(resp);
					resolve();
				} else {
					reject({
						title: 'error_occurred_during_upgrade',
						details: resp,
					});
				}
			})
			.catch(error => {
				Log.error('Error occurred while applying patch ', error.msg);
				reject({
					title: 'error_occurred_during_upgrade',
					details: error,
				});
			});
	}

	associateIdentityWithPeer(resolve, reject) {
		IdentityApi.associatePeer(this.props.identity.name, this.props.peer.id)
			.then(() => {
				const peer = {
					...this.props.peer,
					associatedIdentity: this.props.identity.name,
				};
				this.props.onComplete(peer);
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
		let id = undefined;
		if (this.identities && this.props.peer.associatedIdentity) {
			this.identities.forEach(identity => {
				if (identity.name === this.props.peer.associatedIdentity) {
					id = identity;
				}
			});
		}
		return id;
	}

	onIdentityChange = (data, valid) => {
		this.props.updateState(SCOPE, {
			identity: data[0],
			disableAssociate: !valid,
		});
	};

	renderAssociatePeer(translate) {
		if (this.props.loading) {
			return;
		}
		return (
			<WizardStep type="WizardStep"
				title="associate_identity"
				disableSubmit={this.props.disableAssociate}
			>
				<div>
					<p className="ibp-modal-desc">{translate('associate_identity_desc')}</p>
				</div>
				<div>
					{(!this.identities || !this.identities.length) && <p className="ibp-no-identities">{translate('no_peer_identities')}</p>}
					<Form
						scope={SCOPE}
						id={SCOPE + '-associate'}
						fields={[
							{
								name: 'identity',
								type: 'dropdown',
								tooltip: 'existing_identity_dropdown_tooltip',
								options: this.identities,
								required: true,
								label: 'peer_admin_identity',
								default:
									!this.identities || !this.identities.length
										? translate('no_identities')
										: this.props.identity
											? this.props.identity
											: 'select_wallet_identity',
							},
						]}
						onChange={(data, valid) => {
							this.props.updateState(SCOPE, {
								disableAssociate: !valid,
							});
						}}
					/>
				</div>
			</WizardStep>
		);
	}

	showAction(action) {
		if (action === 'log_settings') {
			this.getLogSettings();
		}
		this.props.updateState(SCOPE, {
			action_in_progress: this.props.peerModalType,
			peerModalType: action,
		});
	}

	hideAction = () => {
		this.props.updateState(SCOPE, {
			action_in_progress: null,
			peerModalType: this.props.action_in_progress,
		});
		this.props.updateState('wizard', { error: null });
	};

	selectedVersion = async (evt) => {
		this.testVersion(evt.new_version);
	}

	// test if upgrading to this version is a breaking change or not
	testVersion = async (new_version) => {
		this.props.updateState(SCOPE, { loading: true, breaking_upgrade: false });
		let breaking_upgrade = false;
		let breaking_details = '';
		let breaking_msg = 'peer_breaking_upgrade';

		// call dry run to validate the request, if it fails set the broken upgrade flag
		try {
			await NodeRestApi.applyPatch({ id: this.props.peer.id, version: new_version }, true);
		} catch (e) {
			if (e && e.msgs && e.msgs[0] && e.msgs[0].includes('Invalid \'version\' value')) {
				breaking_upgrade = true;
				breaking_details = (e && e.msgs) ? e.msgs[0] : '';
				if (breaking_details.includes('Upgrading Fabric from \'2.2')) {
					breaking_msg = 'peer_breaking_upgrade_2';
				} else if (breaking_details.includes('Upgrading Fabric from \'1.4')) {	// use a better error message
					breaking_msg = 'peer_breaking_upgrade';
				} else if (breaking_details.includes('Upgrading Fabric from \'2.4')) {	// use a better error message
					breaking_upgrade = false;
				} else {
					breaking_details = removeLastSentence(breaking_details);
				}
			}
		}

		this.props.updateState(SCOPE, {
			loading: false,
			breaking_upgrade: breaking_upgrade,
			breaking_details: breaking_details,
			breaking_msg: breaking_msg,
		});

		// remove the last sentence of the error msg, its the "ignore_warnings" part
		function removeLastSentence(str) {
			if (typeof str === 'string' && str.includes('ignore_warnings')) {
				const parts = str.split('.');
				parts.splice(parts.length - 1, 1);		// remove the last one
				return parts.join('.');
			}
		}
	}

	renderActionButtons(translate) {
		if (!this.props.peer) {
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
		const saas = this.props.peer.location === 'ibm_saas' && ActionsHelper.canCreateComponent(this.props.userInfo, this.props.feature_flags);
		if (saas) {
			if (this.props.clusterType !== 'free') {
				buttons.push({
					id: 'edit_config_override',
					onClick: this.showConfigOverride,
				});
			}
			// Do not allow HSM enable, disable, or update for now
			// if (this.props.feature_flags && this.props.feature_flags.hsm_enabled) {
			// 	const hsm = Helper.getHSMBCCSP(_.get(this.props, 'peer.config_override.General')) === 'PKCS11';
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
			if (_.get(this.props.peer, 'crypto.enrollment') || _.get(this.props.peer, 'crypto.msp')) {
				buttons.push({
					id: 'manage_certs',
					label: 'update_certs',
				});
			}
			buttons.push({
				id: 'restart',
			});
		}
		if (this.props.peer.operations_url) {
			buttons.push({
				id: 'log_settings',
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

	renderDetails(translate) {
		const fields = [
			{
				name: 'display_name',
				label: 'name',
				placeholder: 'name_placeholder',
				required: true,
				default: this.props.display_name,
				tooltip: 'edit_tooltip_peer_name',
				tooltipDirection: 'bottom',
				specialRules: Helper.SPECIAL_RULES_DISPLAY_NAME,
			},
			{
				name: 'tls_ca_root_certs',
				alias: 'pem',
				label: 'pem',
				placeholder: 'pem_placeholder',
				type: 'certificates',
				required: true,
				validate: Helper.isCertificate,
				tooltip: 'pem_tooltip',
				readonly: this.props.peer.location === 'ibm_saas',
				default: _.get(this.props, 'peer.msp.tlsca.root_certs'),
			},
		];
		return (
			<WizardStep
				type="WizardStep"
				title="peer_settings"
				disableSubmit={!this.props.update || (this.props.config_override && !this.props.editedConfigOverride)}
			>
				<Form
					scope={SCOPE}
					id={SCOPE}
					fields={fields}
					onChange={(data, valid) => {
						let changed = Helper.isChanged(fields, data, this.props, this.props.peer);
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
			<WizardStep type="WizardStep"
				title={this.props.peer.location === 'ibm_saas' ? 'delete_peer' : 'remove_peer'}
				disableSubmit={this.props.disableRemove}
			>
				<div className="ibp-remove-peer-desc">
					<p>
						{this.props.peer.location === 'ibm_saas'
							? RenderParamHTML(translate, 'delete_peer_desc', {
								name: (
									<CodeSnippet
										type="inline"
										ariaLabel={translate('copy_text', { copyText: this.props.peer.display_name })}
										onClick={() => Clipboard.copyToClipboard(this.props.peer.display_name)}
										light={false}
									>
										{this.props.peer.display_name}
									</CodeSnippet>
								),
							})
							: RenderParamHTML(translate, 'remove_peer_desc', {
								name: (
									<CodeSnippet
										type="inline"
										ariaLabel={translate('copy_text', { copyText: this.props.peer.display_name })}
										onClick={() => Clipboard.copyToClipboard(this.props.peer.display_name)}
										light={false}
									>
										{this.props.peer.display_name}
									</CodeSnippet>
								),
							})}
					</p>
				</div>
				<div>
					<div className="ibp-remove-peer-confirm">{translate('remove_peer_confirm')}</div>
					<Form
						scope={SCOPE}
						id={SCOPE + '-remove'}
						fields={[
							{
								name: 'confirm_peer_name',
								tooltip: 'remove_peer_name_tooltip',
							},
						]}
						onChange={data => {
							this.props.updateState(SCOPE, {
								disableRemove: data.confirm_peer_name !== this.props.peer.display_name,
							});
						}}
					/>
				</div>
			</WizardStep>
		);
	}

	onChangeIgnoreErrorCheckbox = event => {
		this.props.updateState(SCOPE, {
			ignore_breaking: event.target.checked,
		});
	};

	renderUpgrade(translate) {
		let upgrade_v1_to_v2 =
			this.props.new_version &&
			this.props.peer &&
			this.props.peer.version &&
			semver.lt(semver.coerce(this.props.peer.version), semver.coerce('2.0')) &&
			semver.gte(semver.coerce(this.props.new_version), semver.coerce('2.0'));
		let versionLabel = this.props.peer.version ? this.props.peer.version : translate('version_not_found');
		if (this.props.peer && this.props.peer.isUnsupported) {
			versionLabel = translate('unsupported');
		}
		return (
			<WizardStep type="WizardStep"
				title="patch_fabric_version"
				disableSubmit={this.props.breaking_upgrade && this.props.ignore_breaking === false}
			>
				<div className="ibp-remove-peer-desc">
					<p>
						{RenderParamHTML(translate, 'upgrade_node_desc', {
							name: (
								<CodeSnippet
									type="inline"
									ariaLabel={translate('copy_text', { copyText: this.props.peer.display_name })}
									light={false}
									onClick={() => Clipboard.copyToClipboard(this.props.peer.display_name)}
								>
									{this.props.peer.display_name}
								</CodeSnippet>
							),
						})}
					</p>
				</div>
				<div className={this.props.loading ? 'ibp-hidden' : ''}>
					<div className="ibp-node-current-version">
						<div className="ibp-node-current-version-label">{translate('fabric_node_to_be_updated')}</div>
						<div className="ibp-node-name-version">
							<span className="ibp-node-name">{this.props.peer.display_name}</span>
							<span className="ibp-node-version">{versionLabel}</span>
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
											options: this.props.peer.upgradable_versions,
										},
									]}
									onChange={this.selectedVersion}
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
						{this.props.breaking_upgrade && (
							<SidePanelError
								error={{
									title: 'peer_breaking_upgrade_title',
									subtitle: this.props.breaking_msg,
									details: this.props.breaking_details,
									link: {
										name: 'breaking_link_text',
										href: 'https://hyperledger-fabric.readthedocs.io/en/latest/upgrade_to_newest_version.html#nodejs-v1-4-chaincode'
									}
								}}
							/>
						)}
						{this.props.breaking_upgrade && (
							<Checkbox
								id={'ignore_breaking'}
								labelText={translate('ignore_breaking_txt')}
								checked={this.props.ignore_breaking}
								onClick={event => {
									this.onChangeIgnoreErrorCheckbox(event);
								}}
							/>
						)}
						{!this.props.breaking_upgrade && (
							<SidePanelWarning title="node_unavailable_during_upgrade_title"
								subtitle="node_unavailable_during_upgrade_desc"
							/>
						)}
						{!this.props.breaking_upgrade && upgrade_v1_to_v2 && (
							<SidePanelWarning
								title="peer_v1_v2_upgrade_title"
								subtitle={this.props.maxBlockHeight > constants.BLOCK_HEIGHT_UPGRADE_THRESHOLD ? 'peer_v1_v2_upgrade_long' : 'peer_v1_v2_upgrade'}
							/>
						)}
						{!this.props.breaking_upgrade && upgrade_v1_to_v2 && (
							<SidePanelWarning
								title="peer_v1_v2_chaincode_title"
								subtitle={
									<div>
										{translate('peer_v1_v2_chaincode_desc')}
										<p>
											<a
												href={translate('peer_v1_v2_chaincode_link', { DOC_PREFIX: this.props.docPrefix })}
												target="_blank"
												rel="noopener noreferrer"
												className="tl-link ibp-important-link"
											>
												{translate('find_out_more')}
											</a>
										</p>
									</div>
								}
							/>
						)}
					</div>
				</div>
			</WizardStep>
		);
	}

	renderConfirmUpgrade(translate) {
		return (
			<WizardStep type="WizardStep"
				title="patch_fabric_version"
				disableSubmit={this.props.disableUpgrade}
			>
				<div className="ibp-remove-peer-desc">
					<p>
						{RenderParamHTML(translate, 'confirm_patch_desc', {
							name: (
								<CodeSnippet
									type="inline"
									ariaLabel={translate('copy_text', { copyText: this.props.peer.display_name })}
									light={false}
									onClick={() => Clipboard.copyToClipboard(this.props.peer.display_name)}
								>
									{this.props.peer.display_name}
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
							),
						})}
					</p>
				</div>
				<div className={this.props.loading ? 'ibp-hidden' : ''}>
					<div className="ibp-remove-peer-confirm">{translate('remove_peer_confirm')}</div>
					<Form
						scope={SCOPE}
						id={SCOPE + '-remove'}
						fields={[
							{
								name: 'confirm_upgrade_node_name',
								tooltip: 'remove_peer_name_tooltip',
								required: true,
							},
						]}
						onChange={data => {
							this.props.updateState(SCOPE, {
								disableUpgrade: data.confirm_upgrade_node_name !== this.props.peer.display_name,
							});
						}}
					/>
				</div>
			</WizardStep>
		);
	}

	renderUpdateCertificates(translate) {
		const fields = this.props.third_party_ca
			? [
				{
					name: 'saas_ca_cert',
					required: true,
					type: 'certificate',
					tooltip: 'third_party_peer_cert_tooltip',
					validate: Helper.isCertificate,
					label: 'certificate',
					placeholder: 'certificate_placeholder',
				},
				{
					name: 'saas_ca_private_key',
					required: true,
					tooltip: 'third_party_peer_private_key_tooltip',
					type: 'private_key',
					validate: Helper.isPrivateKey,
					label: 'private_key',
					placeholder: 'private_key_placeholder',
				},
				{
					name: 'tls_ca_cert',
					required: true,
					type: 'certificate',
					tooltip: 'third_party_peer_tls_cert_tooltip',
					validate: Helper.isCertificate,
					label: 'tls_certificate',
					placeholder: 'certificate_placeholder',
				},
				{
					name: 'tls_ca_private_key',
					required: true,
					tooltip: 'third_party_peer_tls_private_key_tooltip',
					type: 'private_key',
					validate: Helper.isPrivateKey,
					label: 'tls_private_key',
					placeholder: 'private_key_placeholder',
					tooltipDirection: 'bottom',
				},
			]
			: [
				{
					name: 'saas_ca',
					type: 'dropdown',
					tooltip: 'saas_peer_certificate_auth_tooltip',
					options: this.props.cas,
					required: true,
				},
				{
					name: 'enroll_id',
					tooltip: 'saas_peer_enroll_id_tooltip',
					type: this.props.users && this.props.users.length ? 'dropdown' : undefined,
					options: this.props.users && this.props.users.length ? this.props.users.map(user => user.id) : undefined,
					required: true,
					specialRules: Helper.SPECIAL_RULES_ENROLL_ID,
					label: 'peer_enroll_id',
					placeholder: 'peer_enroll_id_placeholder',
					loading: this.props.loading ? true : false,
				},
				{
					name: 'enroll_secret',
					type: 'password',
					tooltip: 'saas_peer_enroll_secret_tooltip',
					required: true,
					specialRules: Helper.SPECIAL_RULES_ENROLL_SECRET,
					label: 'peer_enroll_secret',
					placeholder: 'peer_enroll_secret_placeholder',
				},
			];
		const show_hsm = this.props.peerModalType === 'enable_hsm' || this.props.peerModalType === 'update_hsm';
		let valid = this.props.third_party_ca ? this.props.third_party_ca_valid : this.props.saas_ca_valid;
		if (show_hsm) {
			valid = this.props.saas_ca_valid && this.props.hsm;
		}
		return (
			<WizardStep
				type="WizardStep"
				title={this.props.peerModalType}
				disableSubmit={!valid}
				onCancel={
					this.props.action_in_progress
						? () => {
							this.props.updateState(SCOPE, {
								action_in_progress: null,
								peerModalType: this.props.action_in_progress,
							});
						}
						: null
				}
			>
				{show_hsm ? (
					<div>
						<p>{translate('hsm_peer_desc')}</p>
						<HSMConfig scope={SCOPE} />
					</div>
				) : (
					<div className="ibp-form">
						<label className="ibp-form-label">{translate('third_party_ca')}</label>
						<div className="ibp-form-input">
							<ToggleSmall
								id="toggle-third-party-ca"
								toggled={this.props.third_party_ca}
								onToggle={() => {
									this.props.updateState(SCOPE, {
										third_party_ca: !this.props.third_party_ca,
									});
								}}
								onChange={() => { }}
								aria-label={translate('third_party_ca')}
								labelA={translate('no')}
								labelB={translate('yes')}
							/>
						</div>
						<hr />
					</div>
				)}
				<Form
					scope={SCOPE}
					id={SCOPE + '-update-certs'}
					fields={fields}
					onChange={(data, valid, field, formProps) => {
						const update = {};
						if (this.props.third_party_ca) {
							update.third_party_ca_valid = valid;
							let filenames = { ...this.props.filenames };
							fields.forEach(field => {
								filenames[field.name] = _.get(formProps, field.name + '.file.name');
							});
							update.filenames = filenames;
						} else {
							update.saas_ca_valid = valid;
						}
						this.props.updateState(SCOPE, update);
					}}
				/>
			</WizardStep>
		);
	}

	renderUpdateSummary(translate) {
		const show_hsm = this.props.peerModalType === 'enable_hsm' || this.props.peerModalType === 'update_hsm';
		return (
			<WizardStep type="WizardStep"
				title="summary"
			>
				{show_hsm && Helper.renderHSMSummary(translate, this.props.hsm)}
				{this.props.third_party_ca ? (
					<div>
						{Helper.renderFieldSummary(translate, this.props, 'certificate', 'saas_ca_cert')}
						{Helper.renderFieldSummary(translate, this.props, 'private_key', 'saas_ca_private_key')}
					</div>
				) : (
					<div>
						{Helper.renderFieldSummary(translate, this.props, 'saas_ca')}
						{Helper.renderFieldSummary(translate, this.props, 'peer_enroll_id', 'enroll_id')}
						{Helper.renderFieldSummary(translate, this.props, 'peer_enroll_secret', 'enroll_secret', true)}
					</div>
				)}
			</WizardStep>
		);
	}

	renderManageHSM(translate) {
		return (
			<WizardStep type="WizardStep"
				title="manage_hsm"
			>
				<div className="ibp-peer-hsm-desc">
					<p>{translate('hsm_peer_desc')}</p>
				</div>
				<div>
					<button
						id="update_hsm_action"
						className="ibp-peer-action bx--btn bx--btn--tertiary bx--btn--sm"
						onClick={() => {
							this.showAction('update_hsm');
						}}
					>
						{translate('update_hsm')}
					</button>
					<button
						id="remove_hsm_action"
						className="ibp-peer-action bx--btn bx--btn--sm bx--btn--danger"
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

	async onSubmit() {
		const prefix = `${this.props.peerModalType} onSubmit:`;
		try {
			Log.info(`${prefix} submitting`);

			switch (this.props.peerModalType) {
				case 'delete':
					await this.removePeer();
					break;
				case 'upgrade':
					await new Promise((resolve, reject) => this.upgradeNode(resolve, reject));
					break;
				case 'associate':
					await new Promise((resolve, reject) => this.associateIdentityWithPeer(resolve, reject));
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
				case 'restart':
					await NodeRestApi.restartNode(this.props.peer);
					this.props.onComplete();
					break;
				case 'manage_certs':
					await this.manageCertificates();
					this.props.onComplete();
					break;
				case 'log_settings':
					await this.updateLogSettings();
					this.props.onComplete();
					break;
				default:
					await new Promise((resolve, reject) => this.updatePeer(resolve, reject));
					break;
			}
		} catch (error) {
			Log.error(`${prefix} failed: ${error}`);
			// Errors thrown will be caught in the Wizard's onSubmit function, where they will be stored.  Errors on the Wizard are rendered as SidePanelErrors
			throw error;
		}
	}

	async manageCertificates() {
		if (_.get(this.props, 'peer.crypto.enrollment')) {
			const manage_ecert = _.get(this.props, 'manage_ecert.id');
			const manage_tls_cert = _.get(this.props, 'manage_tls_cert.id');
			const actions = {
				restart: true,
			};
			if (manage_ecert === 'enroll') {
				_.set(actions, 'enroll.ecert', true);
			}
			if (manage_ecert === 'reenroll') {
				_.set(actions, 'reenroll.ecert', true);
			}
			if (manage_tls_cert === 'enroll') {
				_.set(actions, 'enroll.tls_cert', true);
			}
			if (manage_tls_cert === 'reenroll') {
				_.set(actions, 'reenroll.tls_cert', true);
			}
			return NodeRestApi.performActions(this.props.peer, actions);
		}
		if (_.get(this.props, 'peer.crypto.msp')) {
			const ecert = _.get(this.props, 'manage_ecert');
			const ekey = _.get(this.props, 'manage_ekey');
			const tls_cert = _.get(this.props, 'manage_tls_cert');
			const tls_key = _.get(this.props, 'manage_tls_key');
			return NodeRestApi.updateThirdPartyCertificates(this.props.peer, ecert, ekey, tls_cert, tls_key);
		}
	}

	updateConfigOverride = (resolve, reject) => {
		const peer = {
			...this.props.peer,
			config_override: this.props.editedConfigOverride ? this.props.editedConfigOverride : this.props.config_override,
		};
		PeerRestApi.updateConfigOverride(peer)
			.then(peer => {
				this.props.onComplete(peer);
				resolve();
			})
			.catch(error => {
				Log.error(error);
				reject({
					title: 'error_update_peer',
					details: error,
				});
			});
	};

	getSubmitButtonLabel(translate) {
		let label = 'update_peer';
		switch (this.props.peerModalType) {
			case 'delete':
				label = this.props.peer.location === 'ibm_saas' ? 'delete_peer' : 'remove_peer';
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
			case 'restart':
				label = this.props.peerModalType;
				break;
			case 'manage_certs':
				label = 'update_certs';
				break;
			case 'log_settings':
				label = 'update';
				break;
			default:
				break;
		}
		return translate(label);
	}

	getSubmitButtonId() {
		let id = 'update_peer';
		switch (this.props.peerModalType) {
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
			case 'restart':
			case 'manage_certs':
				id = this.props.peerModalType;
				break;
			case 'log_settings':
				id = 'update_log_settings';
				break;
			default:
				break;
		}
		return id;
	}

	showConfigOverride = () => {
		this.props.updateState(SCOPE, {
			current_config: null,
			current_config_json: null,
			config_override: {},
			editedConfigOverride: {},
			peerModalType: 'config_override',
		});
		NodeRestApi.getCurrentNodeConfig(this.props.peer)
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
			peerModalType: null,
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
							<TranslateLink text="config_override_update_peer"
								className="ibp-peer-config-override-desc-with-link"
							/>
						</div>
						<div className="ibp-form-input">
							<ConfigOverride
								id="ibp-config-override"
								config_override={this.props.config_override}
								onChange={editedConfigOverride => {
									this.props.updateState(SCOPE, {
										editedConfigOverride,
									});
								}}
							/>
						</div>
					</div>
				</div>
			</WizardStep>
		);
	}

	renderRestart(translate) {
		return (
			<WizardStep type="WizardStep"
				title="restart"
				onCancel={this.hideAction}
			>
				<div>
					<p>{translate('restart_peer_desc')}</p>
				</div>
			</WizardStep>
		);
	}

	disableManageCertificatesSubmit() {
		if (_.get(this.props, 'peer.crypto.enrollment')) {
			const manage_ecert = _.get(this.props, 'manage_ecert.id') || 'none';
			const manage_tls_cert = _.get(this.props, 'manage_tls_cert.id') || 'none';
			if (manage_ecert !== 'none' || manage_tls_cert !== 'none') {
				return false;
			}
		}
		if (_.get(this.props, 'peer.crypto.msp')) {
			const manage_ecert = _.get(this.props, 'manage_ecert');
			const manage_ekey = _.get(this.props, 'manage_ekey');
			const manage_tls_cert = _.get(this.props, 'manage_tls_cert');
			const manage_tls_key = _.get(this.props, 'manage_tls_key');
			if (manage_ecert && manage_ekey && manage_tls_cert && manage_tls_key) {
				return false;
			}
			if (manage_ecert && manage_ekey && !manage_tls_cert && !manage_tls_key) {
				return false;
			}
			if (!manage_ecert && !manage_ekey && manage_tls_cert && manage_tls_key) {
				return false;
			}
		}
		return true;
	}

	renderManageCertificates(translate) {
		const fields = [];
		if (_.get(this.props, 'peer.crypto.enrollment')) {
			fields.push({
				name: 'manage_ecert',
				label: 'ecert',
				type: 'dropdown',
				tooltip: 'tooltip_manage_ecert',
				options: [
					{
						id: 'none',
						display_name: translate('do_not_update'),
					},
					{
						id: 'enroll',
						display_name: translate('enroll_cert'),
					},
					{
						id: 'reenroll',
						display_name: translate('reenroll_cert'),
					},
				],
				required: true,
				default: translate('do_not_update'),
			});
			fields.push({
				name: 'manage_tls_cert',
				label: 'tls_certificate',
				type: 'dropdown',
				tooltip: 'tooltip_manage_tls_cert',
				options: [
					{
						id: 'none',
						display_name: translate('do_not_update'),
					},
					{
						id: 'enroll',
						display_name: translate('enroll_cert'),
					},
					{
						id: 'reenroll',
						display_name: translate('reenroll_cert'),
					},
				],
				required: true,
				default: translate('do_not_update'),
			});
		}
		if (_.get(this.props, 'peer.crypto.msp')) {
			fields.push({
				name: 'manage_ecert',
				type: 'certificate',
				validate: Helper.isCertificate,
				label: 'ecert',
				placeholder: 'certificate_placeholder',
			});
			fields.push({
				name: 'manage_ekey',
				type: 'private_key',
				validate: Helper.isPrivateKey,
				label: 'ekey',
				placeholder: 'private_key_placeholder',
			});
			fields.push({
				name: 'manage_tls_cert',
				type: 'certificate',
				validate: Helper.isCertificate,
				label: 'tls_certificate',
				placeholder: 'certificate_placeholder',
			});
			fields.push({
				name: 'manage_tls_key',
				type: 'private_key',
				validate: Helper.isPrivateKey,
				label: 'tls_private_key',
				placeholder: 'private_key_placeholder',
			});
		}
		return (
			<WizardStep type="WizardStep"
				title="update_certs"
				onCancel={this.hideAction}
				disableSubmit={this.disableManageCertificatesSubmit()}
			>
				{!!_.get(this.props, 'peer.crypto.enrollment') && (
					<div className="ibp-manage-peer-certs">
						<p>{translate('manage_peer_certs_desc')}</p>
					</div>
				)}
				<Form scope={SCOPE}
					id="manage_certs"
					fields={fields}
				/>
			</WizardStep>
		);
	}

	async getLogSettings() {
		this.props.updateState(SCOPE, {
			log_loading: true,
		});
		let log_level_identity = null;
		let log_spec = null;
		for (let i = 0; i < this.tls_identities.length && !log_level_identity; i++) {
			const match = await StitchApi.isIdentityFromRootCert({
				certificate_b64pem: this.tls_identities[i].cert,
				root_certs_b64pems: _.get(this.props.peer, 'msp.tlsca.root_certs'),
			});
			if (match) {
				log_level_identity = this.tls_identities[i];
			}
		}
		if (log_level_identity) {
			try {
				log_spec = await NodeRestApi.getLogSettings(this.props.peer, log_level_identity);
			} catch (error) {
				Log.error('Unable to get log settings:', error);
			}
		}
		this.props.updateState(SCOPE, {
			log_loading: false,
			log_level_identity,
			log_spec,
			new_log_spec: log_spec,
		});
	}

	async updateLogSettings() {
		return NodeRestApi.setLogSettings(this.props.peer, this.props.log_level_identity, this.props.new_log_spec);
	}

	renderLogSettings(translate) {
		return (
			<WizardStep type="WizardStep"
				title="log_settings"
				onCancel={this.hideAction}
				disableSubmit={this.props.log_loading || !this.props.new_log_spec}
			>
				{this.props.platform !== 'openshift' && <TranslateLink className="ibp-peer-log-settings"
					text="log_settings_desc"
				/>}
				{this.props.platform === 'openshift' && <TranslateLink className="ibp-peer-log-settings"
					text="log_settings_desc_openshift"
				/>}
				{this.props.log_loading ? (
					<SkeletonText />
				) : !this.props.log_level_identity ? (
					<SidePanelWarning title="tls_identity_not_found"
						subtitle="peer_tls_identity_not_found"
					/>
				) : !this.props.log_spec ? (
					<SidePanelWarning title="error_get_log_settings"
						subtitle="peer_error_get_log_settings"
						kind="error"
					/>
				) : (
					<LogSettings
						log_spec={this.props.log_spec}
						onChange={new_log_spec => {
							this.props.updateState(SCOPE, { new_log_spec });
						}}
					/>
				)}
			</WizardStep>
		);
	}

	renderPages(translate) {
		switch (this.props.peerModalType) {
			case 'delete':
				return this.renderRemove(translate);
			case 'upgrade':
				return [this.renderUpgrade(translate), this.renderConfirmUpgrade(translate)];
			case 'associate':
				return this.renderAssociatePeer(translate);
			case 'enable_hsm':
			case 'update_hsm':
			case 'remove_hsm':
			case 'update_certs':
				return [this.renderUpdateCertificates(translate), this.renderUpdateSummary(translate)];
			case 'manage_hsm':
				return this.renderManageHSM(translate);
			case 'config_override':
				return this.renderConfigOverride(translate);
			case 'restart':
				return this.renderRestart(translate);
			case 'manage_certs':
				return this.renderManageCertificates(translate);
			case 'log_settings':
				return this.renderLogSettings(translate);
			default:
				return this.renderDetails(translate);
		}
	}

	render() {
		const translate = this.props.t;
		return (
			<Wizard
				onClose={this.props.onClose}
				onSubmit={this.props.peerModalType === 'manage_hsm' ? undefined : () => this.onSubmit()}
				submitButtonLabel={this.getSubmitButtonLabel(translate)}
				submitButtonId={this.getSubmitButtonId()}
				error={this.props.error}
				loading={this.props.loading}
			>
				{this.renderPages(translate)}
			</Wizard>
		);
	}
}

const dataProps = {
	display_name: PropTypes.string,
	msp_id: PropTypes.string,
	grpcwp_url: PropTypes.string,
	tls_ca_root_certs: PropTypes.array,
	update: PropTypes.bool,
	loading: PropTypes.bool,
	disableRemove: PropTypes.bool,
	confirm_peer_name: PropTypes.string,
	disableAssociate: PropTypes.bool,
	identity: PropTypes.object,
	disableUpgrade: PropTypes.bool,
	confirm_upgrade_node_name: PropTypes.string,
	new_version: PropTypes.string,
	update_certs: PropTypes.bool,
	third_party_ca: PropTypes.bool,
	hsm: PropTypes.object,
	saas_ca: PropTypes.object,
	enroll_id: PropTypes.string,
	enroll_secret: PropTypes.string,
	cas: PropTypes.array,
	users: PropTypes.array,
	loadingUsers: PropTypes.bool,
	saas_ca_valid: PropTypes.bool,
	third_party_ca_valid: PropTypes.bool,
	saas_ca_private_key: PropTypes.string,
	saas_ca_cert: PropTypes.string,
	filenames: PropTypes.object,
	peerModalType: PropTypes.string,
	action_in_progress: PropTypes.string,
	current_config: PropTypes.object,
	config_override: PropTypes.object,
	editedConfigOverride: PropTypes.object,
	maxBlockHeight: PropTypes.number,
	manage_ecert: PropTypes.any,
	manage_tls_cert: PropTypes.any,
	manage_ekey: PropTypes.string,
	manage_tls_key: PropTypes.string,
	log_loading: PropTypes.bool,
	log_level_identity: PropTypes.object,
	log_spec: PropTypes.string,
	new_log_spec: PropTypes.string,
	breaking_upgrade: PropTypes.bool,
	breaking_details: PropTypes.string,
	breaking_msg: PropTypes.string,
	ignore_breaking: PropTypes.bool,
};

PeerModal.propTypes = {
	...dataProps,
	peer: PropTypes.object,
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
		newProps['platform'] = state['settings'] ? state['settings']['platform'] : null;
		newProps['feature_flags'] = state['settings'] ? state['settings']['feature_flags'] : null;
		newProps['crn_string'] = state['settings'] ? state['settings']['crn_string'] : null;
		return newProps;
	},
	{
		updateState,
	}
)(withTranslation()(PeerModal));
