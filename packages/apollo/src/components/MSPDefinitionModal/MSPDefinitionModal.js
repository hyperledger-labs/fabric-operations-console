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
import { Checkbox, CodeSnippet } from 'carbon-components-react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import ChannelApi from '../../rest/ChannelApi';
import { MspRestApi, MSP_TYPE } from '../../rest/MspRestApi';
import { NodeRestApi } from '../../rest/NodeRestApi';
import StitchApi from '../../rest/StitchApi';
import Clipboard from '../../utils/clipboard';
import Helper from '../../utils/helper';
import Form from '../Form/Form';
import ImportantBox from '../ImportantBox/ImportantBox';
import JsonInput from '../JsonInput/JsonInput';
import Logger from '../Log/Logger';
import SidePanel from '../SidePanel/SidePanel';
import SidePanelWarning from '../SidePanelWarning/SidePanelWarning';
import RenderParamHTML from '../RenderHTML/RenderParamHTML';

const SCOPE = 'MSPDefinitionModal';
const Log = new Logger(SCOPE);

// updated to export the unconnected version of the component for testing
// the version connected to the redux store is still the default export so this won't affect usage of the component elsewhere in the code
export class MSPDefinitionModal extends Component {
	componentDidMount() {
		let disableSubmit = _.get(this.props.msp, 'fabric_node_ous.enable', false) && this.props.enableOU;
		// Updating the msp in the console it was created
		const sameConsoleUpdate = this.props.msp && _.get(this.props.msp, 'host_url') === this.props.setting_host_url;
		this.props.updateState(SCOPE, {
			data: [],
			disableSubmit,
			disableRemove: true,
			enableOU: sameConsoleUpdate ? !_.get(this.props.msp, 'fabric_node_ous.enable', false) : false,
			loading: false,
			submitting: false,
			error: null,
			isUpdate: this.props.msp ? true : false,
			remove: this.props.mspModalType === 'delete' ? true : false,
			upgrade: this.props.mspModalType === 'upgrade' ? true : false,
			duplicateMspError: false,
		});

		if (this.props.msp && !_.get(this.props.msp, 'fabric_node_ous.enable', false)) {
			this.props.updateState(SCOPE, {
				msp_id: this.props.msp.msp_id,
				msp_name: this.props.msp.name || this.props.msp.display_name,
				rootCerts: this.props.msp.root_certs ? this.props.msp.root_certs.map(x => {
					return { cert: x };
				}) : [] /* prettier-ignore */,
				intermediate_certs: this.props.msp.intermediate_certs,
				admins: this.props.msp.admins ? this.props.msp.admins.map(x => {
					return { cert: x };
				}) : [] /* prettier-ignore */,
				tls_root_certs: this.props.msp.tls_root_certs,
				tls_intermediate_certs: this.props.msp.tls_intermediate_certs,
				revocation_list: this.props.msp.revocation_list,
				organizational_unit_identifiers: this.props.msp.organizational_unit_identifiers,
				fabric_node_ous: this.props.msp.fabric_node_ous,
				host_url: this.props.msp.host_url,
			});
		}
	}

	componentWillUnmount() {
		this.props.updateState(SCOPE, {
			data: [],
			isUpdate: false,
			host_url: '',
			enableOU: false,
		});
	}

	onComplete() {
		if (typeof this.props.onComplete === 'function') return this.props.onComplete(...arguments);
		Log.warn(`${SCOPE} ${this.props.mspModalType}: onComplete() is not set`);
	}

	validateMspid = mspid => {
		if (mspid) {
			let invalidCharacters = false;
			let isEmpty = false;
			Log.debug('Validating mspid: ', mspid);
			if (mspid.trim() !== '') {
				// Restrictions on MSPID
				//1. Contain only ASCII alphanumerics, dots '.', dashes '-'
				if (/[^a-zA-Z\d-.]/g.test(mspid)) {
					//check for invalid characters
					invalidCharacters = true;
				}
				//2. Are shorter than 250 characters.
				if (mspid.length > 250) {
					invalidCharacters = true;
				}
				//3. Are not the strings "." or "..".
				if (mspid === '.' || mspid === '..') {
					invalidCharacters = true;
				}
				Log.debug('Mspid has invalid characters: ', invalidCharacters);
			} else {
				isEmpty = true;
				Log.debug('Mspid is empty');
			}
			if (invalidCharacters || isEmpty) {
				return false;
			}
		}
		return true;
	};

	onUpload = async (data, valid) => {
		Log.debug('Uploaded json: ', data, valid);

		let json = data && data.length ? data[0] : null;
		let isMspIdValid = true;
		let isSameMsp = true;
		if (json && json.msp_id && this.props.isUpdate) {
			// if updating msp definition, verify if msp id matches
			if (this.props.msp.msp_id !== json.msp_id) {
				this.props.updateState(SCOPE, {
					error: {
						title: 'edit_msp_mspid_error',
					},
				});
				isSameMsp = false;
			} else {
				this.props.updateState(SCOPE, { error: null });
			}
		} else if (json && json.msp_id) {
			isMspIdValid = this.validateMspid(json.msp_id);
			if (!isMspIdValid) {
				this.props.updateState(SCOPE, {
					error: {
						title: 'validation_mspid_invalid',
					},
				});
			} else {
				this.props.updateState(SCOPE, { error: null });
			}
		}

		valid = valid && isSameMsp && isMspIdValid;

		if (json) {
			let duplicateMSPExists = false;
			if (!this.props.isUpdate) {
				duplicateMSPExists = await MspRestApi.checkIfMSPExists(json.msp_id, json.root_certs, json.intermediate_certs);
			}

			let admin_certs = [];
			if (json.admins) {
				for (const x of json.admins) {
					let parsedCert = StitchApi.parseCertificate(x);
					if (!parsedCert) {
						valid = false;
						this.props.updateState(SCOPE, {
							error: {
								title: 'invalid_admin_certificate',
							},
						});
						break;
					}
					admin_certs.push({ cert: parsedCert && parsedCert.base_64_pem ? parsedCert.base_64_pem : '' });

					// check if the admin cert is from one of the root certs. Otherwise peer would crash.
					let roots = (json && Array.isArray(json.root_certs)) ? json.root_certs : [];
					if (json && Array.isArray(json.intermediate_certs)) {
						roots = roots.concat(json.intermediate_certs);
					}
					let isFromRoot = await StitchApi.isIdentityFromRootCert({
						certificate_b64pem: x,
						root_certs_b64pems: roots,
					});
					if (!isFromRoot) {
						valid = false;
						this.props.updateState(SCOPE, {
							error: {
								title: 'is_not_from_root',
							},
							disableSubmit: true,
						});
						break;
					}
				}
			}

			this.props.updateState(SCOPE, {
				msp_id: json.msp_id,
				msp_name: json.name || json.display_name,
				rootCerts: json.root_certs ? json.root_certs.map(x => {
					return { cert: x };
				}) : [] /* prettier-ignore */,
				intermediate_certs: json.intermediate_certs,
				admins: admin_certs,
				tls_root_certs: json.tls_root_certs,
				tls_intermediate_certs: json.tls_intermediate_certs,
				revocation_list: json.revocation_list,
				organizational_unit_identifiers: json.organizational_unit_identifiers,
				fabric_node_ous: json.fabric_node_ous,
				host_url: json.host_url,
				disableSubmit: !valid,
				duplicateMspError: duplicateMSPExists ? true : false,
			});
		}

		// Importing the msp in the console it was created
		const sameConsoleImport = !this.props.isUpdate && _.get(json, 'host_url') === this.props.setting_host_url;
		if (sameConsoleImport) {
			this.props.updateState(SCOPE, {
				enableOU: !_.get(json, 'fabric_node_ous.enable', false),
			});
		}
	};

	onError = error => {
		this.props.updateState(SCOPE, {
			error: {
				title: error,
			},
		});
	};

	async onSubmit() {
		this.props.updateState(SCOPE, {
			submitting: true,
			disableSubmit: true,
			error: null,
		});

		let notValidAdmin = (!this.props.fabric_node_ous?.enable && this.props.admins?.length === 0) ||
			(this.props.fabric_node_ous?.enable && this.props.admins === undefined);

		if (!this.props.msp_id || !this.props.msp_name || this.props.rootCerts.length === 0 || notValidAdmin) {
			// required fields
			this.props.updateState(SCOPE, {
				error: {
					title: 'error_required_fields',
				},
				submitting: false,
			});
		} else {
			let intermediate_certs = this.props.intermediate_certs;
			let tls_root_certs = this.props.tls_root_certs;
			let tls_intermediate_certs = this.props.tls_intermediate_certs;
			let revocation_list = this.props.revocation_list;
			let organizational_unit_identifiers = this.props.organizational_unit_identifiers;
			let fabric_node_ous = this.props.fabric_node_ous;
			let root_certs = this.props.rootCerts.filter(x => x.cert !== '').map(x => x.cert);
			if (!_.get(this.props, 'fabric_node_ous.enable', false) && this.props.enableOU) {
				fabric_node_ous = ChannelApi.getNodeOUIdentifier(root_certs[0]);
			}

			if (this.props.isUpdate) {
				if (_.isEmpty(intermediate_certs) && !_.isEmpty(this.props.msp.intermediate_certs)) {
					// Removed completely during update
					intermediate_certs = [];
				}
				if (_.isEmpty(tls_root_certs) && !_.isEmpty(this.props.msp.tls_root_certs)) {
					tls_root_certs = [];
				}
				if (_.isEmpty(tls_intermediate_certs) && !_.isEmpty(this.props.msp.tls_intermediate_certs)) {
					tls_intermediate_certs = [];
				}
				if (_.isEmpty(revocation_list) && !_.isEmpty(this.props.msp.revocation_list)) {
					revocation_list = [];
				}
				if (_.isEmpty(organizational_unit_identifiers) && !_.isEmpty(this.props.msp.organizational_unit_identifiers)) {
					organizational_unit_identifiers = [];
				}
				if (_.isEmpty(fabric_node_ous) && !_.isEmpty(this.props.msp.fabric_node_ous)) {
					fabric_node_ous = {};
				}
			}
			const opts = {
				type: MSP_TYPE,
				msp_id: this.props.msp_id,
				display_name: this.props.msp_name,
				root_certs,
				admins: this.props.admins.filter(x => x.cert !== '').map(x => x.cert),
				intermediate_certs,
				certificate: this.props.certificate,
				tls_root_certs,
				tls_intermediate_certs,
				revocation_list,
				organizational_unit_identifiers,
				fabric_node_ous,
				host_url: this.props.host_url,
			};
			if (this.props.isUpdate) {
				Log.info('Request for editing msp definition: ', this.props.msp.id, JSON.stringify(opts, null, 4));

				let resp;
				try {
					opts.id = this.props.msp.id;
					resp = await MspRestApi.editMsp(opts);
				} catch (error) {
					Log.error(`Error occurred while editing msp ${error}`);
					this.props.updateState(SCOPE, {
						submitting: false,
						error: {
							title: 'error_occurred_during_msp_edit',
							details: error,
						},
					});
					return;
				}
				Log.info('Edit msp response: ', resp);
				if (resp && resp.id) {
					let nodes = [...(this.props.associatedPeers || []), ...(this.props.associatedOrderers || [])];
					if (nodes && nodes.length > 0) {
						let updatedAdminCerts = this.props.admins.map(x => x.cert);
						Log.info('Now syncing certs to all peers:', updatedAdminCerts);
						try {
							await NodeRestApi.syncAdminCerts(nodes, updatedAdminCerts, !_.get(this.props, 'fabric_node_ous.enable', false) && this.props.enableOU);
						} catch (syncCertError) {
							this.props.updateState(SCOPE, {
								error: {
									title: 'error_occurred_during_sync_certs',
									details: syncCertError,
								},
								submitting: false,
							});
							return;
						}
						Log.info('Updated admin certs on all peers successfully');
						this.onComplete(this.props.msp_name, true);
						this.sidePanel.closeSidePanel();
					} else {
						this.onComplete(this.props.msp_name, true);
						this.sidePanel.closeSidePanel();
					}
				} else {
					this.props.updateState(SCOPE, {
						error: {
							title: 'error_occurred_during_msp_edit',
							details: resp,
						},
						submitting: false,
					});
				}
			} else {
				Log.info('Request for importing new msp definition in database: ', JSON.stringify(opts, null, 4));
				let resp;
				try {
					resp = await MspRestApi.importMSP(opts);
				} catch (error) {
					Log.error(`Error occurred while importing msp ${error}`);
					this.props.updateState(SCOPE, {
						submitting: false,
						error,
					});
					return;
				}

				Log.info('Import msp response: ', resp);
				if (resp && resp.id) {
					this.onComplete(this.props.msp_name);
					this.sidePanel.closeSidePanel();
				} else {
					this.props.updateState(SCOPE, {
						submitting: false,
						error: {
							title: 'error_occurred_during_msp_import',
							details: resp,
						},
					});
				}
			}
		}
	}

	renderRemove = translate => {
		const mspName = this.props.selectedMsp ? this.props.selectedMsp.display_name : null;
		if (this.props.mspModalType === 'settings') {
			return;
		}
		if (this.props.mspModalType === 'delete') {
			return (
				<div>
					<div className="ibp-modal-title">
						<h1 className="ibm-light">{translate('remove_org')}</h1>
					</div>
					<p className="ibp-remove-msp-desc">
						{RenderParamHTML(translate, 'remove_msp_desc', {
							name: (
								<CodeSnippet
									type="inline"
									ariaLabel={translate('copy_text', { copyText: mspName })}
									light={false}
									onClick={() => Clipboard.copyToClipboard(mspName)}
								>
									{mspName}
								</CodeSnippet>
							),
						})}
					</p>
					<div>
						<p className="ibp-remove-msp-confirm">{translate('remove_msp_confirm')}</p>
						<Form
							scope={SCOPE}
							id={SCOPE + '-remove'}
							fields={[
								{
									name: 'confirm_msp_name',
									tooltip: 'remove_msp_name_tooltip',
									required: true,
								},
							]}
							onChange={data => {
								this.props.updateState(SCOPE, {
									disableRemove: data.confirm_msp_name !== this.props.selectedMsp.display_name,
								});
							}}
						/>
					</div>
				</div>
			);
		}
	};

	async deleteMsp() {
		const prefix = 'removing MSP:';
		this.props.updateState(SCOPE, { submitting: true });
		try {
			await NodeRestApi.removeComponent(this.props.selectedMsp.id);
		} catch (error) {
			Log.error(`${prefix} failed: ${error}`);
			this.props.updateState(SCOPE, {
				error,
				submitting: false,
			});
			return;
		}

		this.props.updateState(SCOPE, { submitting: false });
		this.onComplete(this.props.selectedMsp.name);
		this.sidePanel.closeSidePanel();
	}

	enableOU(translate) {
		let sameConsole = this.props.isUpdate
			? _.get(this.props, 'msp.host_url') === this.props.setting_host_url
			: _.get(this.props, 'host_url') === this.props.setting_host_url;
		if (!sameConsole) {
			return;
		}
		return (
			<Checkbox
				id={'enable_node_ou'}
				labelText={translate('node_ou')}
				checked={this.props.enableOU}
				onClick={event => {
					this.props.updateState(SCOPE, {
						enableOU: event.target.checked,
					});
				}}
			/>
		);
	}

	renderMSPSettings = translate => {
		let nodes = [...(this.props.associatedPeers || []), ...(this.props.associatedOrderers || [])];
		if (this.props.mspModalType === 'delete') {
			return;
		}
		if (this.props.mspModalType === 'settings') {
			return (
				<div>
					<div className="ibp-modal-title">
						<h1 className="ibm-light">{this.props.isUpdate ? translate('update_msp_definition') : translate('import_msp_definition')}</h1>
					</div>
					<div>
						<div>
							<p className="ibp-modal-desc">
								{this.props.isUpdate ? translate('update_msp_definition_desc') : translate('import_msp_definition_desc')}
								<a
									className="ibp-msp-modal-learn-more"
									href={translate(this.props.isUpdate ? 'console_update_msp_docs' : 'import_msp_admin_identity_link', { DOC_PREFIX: this.props.docPrefix })}
									target="_blank"
									rel="noopener noreferrer"
								>
									{translate('find_more_here')}
								</a>
							</p>
						</div>
						{!_.get(this.props.msp, 'fabric_node_ous.enable', false) && this.enableOU(translate)}
						<div className="ibp-import-msp">
							<JsonInput
								id="msp_definition_upload"
								definition={Helper.getMSPFields()}
								onChange={this.onUpload}
								onError={this.onError}
								uniqueNames={true}
								onlyFileUpload={true}
								singleInput={true}
							/>
						</div>
						{this.props.isUpdate && nodes && nodes.length > 0 && (
							<>
								<ImportantBox text="sync_msp_def_warning" />
								<ul>
									{nodes.map(node => {
										return (
											<li className="ibp-note-bullet"
												key={node.id}
											>
												<div className="ibp-note-bullet-point">-</div>
												<div className="ibp-note-bullet-text">
													<strong>{node.display_name} </strong>
												</div>
											</li>
										);
									})}
								</ul>
							</>
						)}
						{!this.props.isUpdate && this.props.duplicateMspError && (
							<div className="ibp-dup-msp-error">
								<SidePanelWarning title="duplicate_mspid_error_title"
									subtitle={translate('duplicate_mspid_import_error_desc')}
								/>
							</div>
						)}
					</div>
				</div>
			);
		}
	};

	getButtons = translate => {
		let buttons = [];
		if (this.props.mspModalType === 'settings') {
			buttons.push(
				{
					id: 'cancel',
					text: translate('cancel'),
				},
				{
					id: 'import_msp_definition',
					text: translate(this.props.isUpdate ? 'update_msp_definition' : 'import_msp_definition'),
					onClick: () => this.onSubmit(),
					disabled: this.props.disableSubmit || (!this.props.isUpdate && this.props.duplicateMspError),
					type: 'submit',
				}
			);
		} else if (this.props.mspModalType === 'delete') {
			buttons.push(
				{
					id: 'cancel',
					text: translate('cancel'),
				},
				{
					id: 'confirm_remove',
					text: translate('remove_org'),
					onClick: () => this.deleteMsp(),
					disabled: this.props.disableRemove || this.props.submitting,
					type: 'submit',
				}
			);
		}
		return buttons;
	};

	render() {
		const translate = this.props.t;
		return (
			<SidePanel
				id="import-msp-definition"
				closed={this.props.onClose}
				ref={sidePanel => (this.sidePanel = sidePanel)}
				buttons={this.getButtons(translate)}
				error={this.props.error}
				submitting={this.props.submitting}
			>
				{this.renderMSPSettings(translate)}
				{this.renderRemove(translate)}
			</SidePanel>
		);
	}
}

const dataProps = {
	data: PropTypes.array,
	msp_id: PropTypes.string,
	msp_name: PropTypes.string,
	rootCerts: PropTypes.array,
	admins: PropTypes.array,
	intermediate_certs: PropTypes.array,
	certificate: PropTypes.object,
	tls_root_certs: PropTypes.array,
	tls_intermediate_certs: PropTypes.array,
	revocation_list: PropTypes.array,
	organizational_unit_identifiers: PropTypes.array,
	fabric_node_ous: PropTypes.object,
	host_url: PropTypes.string,
	loading: PropTypes.bool,
	enableOU: PropTypes.bool,
	submitting: PropTypes.bool,
	disableSubmit: PropTypes.bool,
	disableRemove: PropTypes.bool,
	error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
	isUpdate: PropTypes.bool,
	associatedPeers: PropTypes.array,
	associatedOrderers: PropTypes.array,
	mspModalType: PropTypes.string,
	duplicateMspError: PropTypes.bool,
};

MSPDefinitionModal.propTypes = {
	...dataProps,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
	updateState: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['docPrefix'] = state['settings'] ? state['settings']['docPrefix'] : null;
		newProps['setting_host_url'] = state['settings'] ? state['settings']['host_url'] : null;
		return newProps;
	},
	{
		updateState,
	}
)(withTranslation()(MSPDefinitionModal));
