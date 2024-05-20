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
import Add20 from '@carbon/icons-react/lib/add/20';
import Upload20 from '@carbon/icons-react/lib/upload/20';
import { Checkbox, RadioTile, TileGroup } from 'carbon-components-react';
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
import Helper from '../../utils/helper';
import BlockchainTooltip from '../BlockchainTooltip/BlockchainTooltip';
import ConfigOverride from '../ConfigOverride/ConfigOverride';
import Form from '../Form/Form';
import HSMConfig from '../HSMConfig/HSMConfig';
import ImportantBox from '../ImportantBox/ImportantBox';
import JsonInput from '../JsonInput/JsonInput';
import Logger from '../Log/Logger';
import TranslateLink from '../TranslateLink/TranslateLink';
import UsageForm from '../UsageForm/UsageForm';
import Wizard from '../Wizard/Wizard';
import WizardStep from '../WizardStep/WizardStep';
import * as constants from '../../utils/constants';

const SCOPE = 'importCAModal';
const Log = new Logger(SCOPE);

class ImportCAModal extends React.Component {
	componentDidMount() {
		let usageDefaults = UsageForm.getUsageDefaults();
		this.props.updateState(SCOPE, {
			data: [],
			disableSubmit: true,
			loading: false,
			admin_id: null,
			admin_secret: null,
			enroll_id: null,
			enroll_secret: null,
			advancedValid: false,
			usage: {
				ca: {
					...usageDefaults.ca,
					valid: true,
				},
			},
			usageValid: true,
			ca_database: 'sqlite3',
			db_host: null,
			db_port: null,
			db_name: null,
			db_user: null,
			db_password: null,
			db_sslmode: 'disable',
			db_valid: false,
			db_tls_enabled: false,
			db_server_certs: [],
			db_client_cert: null,
			db_client_private_key: null,
			replica_set_cnt: 1,
			advanced_ca_config: {
				database: false,
				zone: false,
				resource_allocation: false,
				hsm: false,
			},
			db_json_name: null,
			db_json_error: null,
			db_json_error_opts: {},
			hsm: null,
			zone: 'default',
			config_override: null,
			editedConfigOverride: null,
			display_name: null,
			version: null,

			// default to selecting the deploying component option (if the user has that perm), else default select the import component option
			add_type: ActionsHelper.canCreateComponent(this.props.userInfo, this.props.feature_flags) ? constants.DEPLOYING : constants.IMPORTING,
		});
		this.calculateUsageTotals(usageDefaults);
		if (!this.props.feature_flags.import_only_enabled) {
			this.getVersions();
		}
	}

	getVersions() {
		NodeRestApi.getAvailableVersions()
			.then(all_versions => {
				let versions = all_versions.ca;
				if (versions) {
					this.props.updateState(SCOPE, {
						versions,
					});
				}
			})
			.catch(error => {
				Log.error(error);
			});
	}

	onComplete() {
		if (typeof this.props.onComplete === 'function') return this.props.onComplete(...arguments);
		Log.warn(`${SCOPE}: onComplete() is not set`);
	}

	calculateUsageTotal(usage, category) {
		let total = 0;
		try {
			total = usage.ca[category] && !isNaN(usage.ca[category]) ? Number(usage.ca[category]) : 0;
		} catch (error) {
			total = 0;
		}
		if (category === 'cpu') {
			total = Math.floor(total * 1000) / 1000;
		}
		return total;
	}

	calculateUsageTotals(usage) {
		const ca_database = _.get(this.props, 'advanced_ca_config.database') ? this.props.ca_database : 'sqlite3';
		const cnt = ca_database === 'sqlite3' ? 1 : this.props.replica_set_cnt;
		this.props.updateState(SCOPE, {
			usage_total_cpu: cnt * this.calculateUsageTotal(usage, 'cpu'),
			usage_total_memory: cnt * this.calculateUsageTotal(usage, 'memory'),
			usage_total_storage: ca_database === 'sqlite3' ? this.calculateUsageTotal(usage, 'storage') : 0,
		});
	}

	onChange = (data, valid) => {
		this.props.updateState(SCOPE, {
			data,
			disableSubmit: !valid,
		});
	};

	async onSubmit() {
		if (this.props.add_type !== constants.DEPLOYING) {
			return this.onImportSubmit();
		}
		return this.onCreateSubmit();
	}

	getCreateData() {
		const data = {
			display_name: this.props.display_name,
			admin_id: this.props.admin_id,
			admin_secret: this.props.admin_secret,
			usage: _.get(this.props, 'advanced_ca_config.resource_allocation') ? this.props.usage : { ca: UsageForm.getUsageDefaults().ca },
		};
		if (this.props.version) {
			data.version = this.props.version.version;
		}
		if (_.get(this.props, 'advanced_ca_config.database') && this.props.ca_database !== 'sqlite3') {
			data.ca_database = this.props.ca_database;
			data.db_host = this.props.db_host;
			data.db_port = this.props.db_port;
			data.db_name = this.props.db_name;
			data.db_user = this.props.db_user;
			data.db_password = this.props.db_password;
			data.db_sslmode = this.props.db_sslmode;
			data.db_tls_enabled = this.props.db_tls_enabled;
			if (this.props.db_tls_enabled) {
				data.db_server_certs = this.props.db_server_certs;
				data.db_client_cert = this.props.db_client_cert;
				data.db_client_private_key = this.props.db_client_private_key;
			}
			data.replica_set_cnt = this.props.replica_set_cnt;
		}
		if (_.get(this.props, 'advanced_ca_config.zone') && this.props.zone !== 'default') {
			data.zone = this.props.zone;
		}
		if (_.get(this.props, 'advanced_ca_config.hsm')) {
			data.hsm = this.props.hsm;
		}
		if (this.props.config_override) {
			data.config_override = this.props.editedConfigOverride ? this.props.editedConfigOverride : this.props.config_override;
		}
		data.clusterType = this.props.clusterType;
		return data;
	}

	onCreateSubmit() {
		return new Promise((resolve, reject) => {
			const data = this.getCreateData();
			CertificateAuthorityRestApi.createCA(data)
				.then(ca => {
					IdentityApi.removeCertificateAuthorityAssociations(ca.id);
					this.props.onComplete([ca]);
					resolve();
				})
				.catch(error => {
					Log.error(error);
					reject({
						title: 'error_create_ca',
						details: error,
					});
				});
		});
	}

	async onImportSubmit() {
		const prefix = 'Importing CA:';
		let imported_cas;
		try {
			imported_cas = await CertificateAuthorityRestApi.importCA(this.props.data);
		} catch (error) {
			Log.error(`${prefix} failed: ${error}`);
			throw error;
		}
		imported_cas.forEach(newCA => {
			IdentityApi.removeCertificateAuthorityAssociations(newCA.id);
		});
		this.onComplete(imported_cas);
	}

	// render the correct next step based on the add CA type they selected
	renderCAInformation(translate) {
		if (this.props.add_type === constants.DEPLOYING) {
			return this.renderCreateCAInformation(translate);
		} else if (this.props.add_type === constants.IMPORTING) {
			return this.renderImportFileUpload(translate);
		}
	}

	renderAdvancedCheckboxes(translate) {
		if (this.props.clusterType === 'free') {
			return;
		}
		return (
			<div className="ibp-form">
				<div className="ibp-form-field">
					<div className="ibp-advanced-ca-checkboxes-label">
						<label className="ibp-form-label">{translate('advanced_deployment_options')}</label>
					</div>
					{this.props.feature_flags && this.props.feature_flags.high_availability && (
						<div>
							<div className="ibp-advanced-ca-checkboxes">
								<Checkbox
									id="advanced_ca_config_database"
									labelText={translate('database_and_replica_sets')}
									onChange={() => {
										this.props.updateState(SCOPE, {
											advanced_ca_config: {
												...this.props.advanced_ca_config,
												database: !this.props.advanced_ca_config.database,
											},
										});
									}}
									checked={this.props.advanced_ca_config.database}
								/>
								<BlockchainTooltip withCheckbox>{translate('ca_database_and_replica_sets_tooltip')}</BlockchainTooltip>
							</div>
							{this.props.workerZones && this.props.workerZones.length > 1 && (
								<div className="ibp-advanced-ca-checkboxes">
									<Checkbox
										id="advanced_ca_config_zone"
										labelText={translate('zone_selection')}
										onChange={() => {
											this.props.updateState(SCOPE, {
												advanced_ca_config: {
													...this.props.advanced_ca_config,
													zone: !this.props.advanced_ca_config.zone,
												},
											});
										}}
										checked={this.props.advanced_ca_config.zone}
									/>
									<BlockchainTooltip withCheckbox>{translate('ca_zone_selection_tooltip')}</BlockchainTooltip>
								</div>
							)}
						</div>
					)}
					{this.props.feature_flags && this.props.feature_flags.hsm_enabled && (
						<div className="ibp-advanced-ca-checkboxes">
							<Checkbox
								id="advanced_ca_config_hsm"
								labelText={translate('hsm_config')}
								onChange={() => {
									this.props.updateState(SCOPE, {
										advanced_ca_config: {
											...this.props.advanced_ca_config,
											hsm: !this.props.advanced_ca_config.hsm,
										},
									});
								}}
								checked={this.props.advanced_ca_config.hsm}
							/>
							<BlockchainTooltip withCheckbox>{translate('hsm_tooltip')}</BlockchainTooltip>
						</div>
					)}
					<div className="ibp-advanced-ca-checkboxes">
						<Checkbox
							id="advanced_ca_config_resource_allocation"
							labelText={translate('resource_allocation')}
							onChange={() => {
								this.props.updateState(SCOPE, {
									advanced_ca_config: {
										...this.props.advanced_ca_config,
										resource_allocation: !this.props.advanced_ca_config.resource_allocation,
									},
								});
							}}
							checked={this.props.advanced_ca_config.resource_allocation}
						/>
						<BlockchainTooltip withCheckbox>{translate('ca_resource_allocation_tooltip')}</BlockchainTooltip>
					</div>
				</div>
			</div>
		);
	}

	renderSelectVersion(translate) {
		if (!this.props.versions || this.props.versions.length < 2) {
			return;
		}
		return (
			<>
				<Form
					scope={SCOPE}
					id={SCOPE + '-version'}
					fields={[
						{
							name: 'version',
							type: 'dropdown',
							options: this.props.versions,
							default: translate('choose_a_fabric_version'),
							label: 'fabric_version',
							tooltip: 'fabric_version_ca_tooltip',
							required: true,
						},
					]}
				/>
			</>
		);
	}

	isVersionValid() {
		if (!this.props.versions || this.props.versions.length < 2) {
			return true;
		}
		if (this.props.version && this.props.version.version) {
			return true;
		}
		return false;
	}

	renderCreateCAInformation(translate) {
		return (
			<WizardStep
				type="WizardStep"
				title="add_ca"
				disableSubmit={this.props.disableSubmit || !this.isVersionValid()}
				onNext={() => {
					if (this.props.advanced_ca_config.resource_allocation) {
						this.calculateUsageTotals(this.props.usage);
					} else {
						this.calculateUsageTotals(UsageForm.getUsageDefaults());
						this.props.updateState(SCOPE, {
							usage: {
								ca: {
									...UsageForm.getUsageDefaults().ca,
									valid: true,
								},
							},
						});
					}
					if (!this.props.advanced_ca_config.database) {
						this.props.updateState(SCOPE, {
							ca_database: 'sqlite3',
							replica_set_cnt: 1,
						});
					}
					if (!this.props.advanced_ca_config.zone) {
						this.props.updateState(SCOPE, {
							zone: 'default',
						});
					}
					this.props.updateState(SCOPE, {
						config_override: null,
						editedConfigOverride: null,
					});
					return Promise.resolve();
				}}
			>
				<Form
					scope={SCOPE}
					id={SCOPE + '-create'}
					fields={[
						{
							name: 'display_name',
							tooltip: 'import_ca_name_tooltip',
							required: true,
							specialRules: Helper.SPECIAL_RULES_DISPLAY_NAME,
							label: 'ca_display_name',
							placeholder: 'ca_display_name_placeholder',
						},
						{
							name: 'admin_id',
							tooltip: 'admin_id_tootip',
							required: true,
							specialRules: Helper.SPECIAL_RULES_ENROLL_ID,
							label: 'ca_admin_enroll_id',
							placeholder: 'ca_admin_enroll_id_placeholder',
						},
						{
							name: 'admin_secret',
							tooltip: 'admin_secret_tootip',
							type: 'password',
							required: true,
							default: this.props.enroll_secret,
							specialRules: Helper.SPECIAL_RULES_ENROLL_SECRET,
							label: 'ca_admin_enroll_secret',
							placeholder: 'ca_admin_enroll_secret_placeholder',
						},
					]}
					onChange={(data, valid) => {
						this.props.updateState(SCOPE, {
							disableSubmit: !valid,
						});
					}}
				/>
				{this.renderSelectVersion(translate)}
				{this.renderAdvancedCheckboxes(translate)}
			</WizardStep>
		);
	}

	renderImportFileUpload(translate) {
		return (
			<WizardStep type="WizardStep"
				disableSubmit={this.props.disableSubmit}
				title="add_ca"
			>
				<JsonInput
					id="importCA"
					onlyFileUpload={true}
					definition={[
						{
							name: 'display_name',
							alias: ['short_name', 'name'],
							required: true,
							specialRules: Helper.SPECIAL_RULES_DISPLAY_NAME,
						},
						{
							name: 'ca_name',
							required: false,
						},
						{
							name: 'tlsca_name',
							required: false,
						},
						{
							name: 'tls_cert',
							alias: 'pem',
							type: 'certificate',
							required: false,
							validate: Helper.isCertificate,
						},
						{
							name: 'migrated_from',
							required: false,
						},
						{
							name: 'imported',
							required: false,
						},
						{
							name: 'cluster_type',
							required: false,
						},
						{
							name: 'console_type',
							required: false,
						},
						{
							name: 'msp',
							required: false,
							validate: msp => {
								const ca_name = _.get(msp, 'ca.name');
								if (!ca_name) {
									return false;
								}
								const tlsca_name = _.get(msp, 'tlsca.name');
								if (!tlsca_name) {
									return false;
								}
								const tls_cert = _.get(msp, 'component.tls_cert');
								if (!tls_cert) {
									return false;
								}
								return Helper.isCertificate(tls_cert);
							},
						},
						{
							name: 'operations_url',
							alias: 'operations',
							type: 'url',
							required: true,
						},
						{
							name: 'api_url',
							alias: 'ca_url',
							type: 'url',
							required: true,
						},
						{
							name: 'type',
							required: false,
							validate: value => {
								if (value && value !== 'fabric-ca') {
									return false;
								}
								return true;
							},
						},
						{
							name: 'location',
							required: false,
						},
					]}
					onChange={this.onChange}
					singleInput={true}
					fileUploadTooltip="import_ca_file_tooltip"
				/>
			</WizardStep>
		);
	}

	// render the choose between importing an already running CA or deploying a new CA
	renderChooseAddType(translate) {
		return (
			<WizardStep type="WizardStep"
				title="add_ca"
				disableSubmit={!this.props.add_type}
			>
				<p className="ibp-modal-desc">{translate('import_ca_desc')}</p>
				<TileGroup
					name="add_type"
					className="ibp-ca-locations"
					onChange={(add_type) => {
						this.props.updateState(SCOPE, {
							add_type,
						});
					}}
					valueSelected={this.props.add_type}
					legend={translate('select_ca_type')}
				>
					<RadioTile value={constants.DEPLOYING}
						id="deploy-id"
						className="ibp-ca-location"
						disabled={!ActionsHelper.canCreateComponent(this.props.userInfo, this.props.feature_flags)}
					>
						<p>{translate('create_ca')}</p>
						<Add20 className="ibp-fill-color ibp-import-node-add-icon" />
					</RadioTile>

					<RadioTile value={constants.IMPORTING}
						id="import-id"
						className="ibp-ca-location"
						disabled={!ActionsHelper.canImportComponent(this.props.userInfo, this.props.feature_flags)}
					>
						<p>{translate('import_ca')}</p>
						<Upload20 className="ibp-fill-color ibp-import-node-add-icon" />
					</RadioTile>

				</TileGroup>
			</WizardStep>
		);
	}

	renderSummaryFooter(translate) {
		if (this.props.clusterType === 'free') {
			return;
		}
		const vpc = Helper.formatNumber(this.props.usage_total_cpu);
		return (
			<div className="ibp-usage-footer">
				<div className="ibp-usage-footer-column">
					<div className="ibp-usage-footer-heading">{translate('estimated_vpc')}</div>
					<div className="ibp-usage-footer-value">{translate('vpc', { vpc })}</div>
				</div>
			</div>
		);
	}

	renderSummary(translate) {
		if (this.props.add_type !== constants.DEPLOYING) {
			return;
		}
		let default_cpu = this.props.usage_total_cpu;
		let default_memory = this.props.usage_total_memory;
		let default_storage = this.props.usage_total_storage;
		if (this.props.advanced_ca_config && this.props.advanced_ca_config.resource_allocation) {
			const usageDefaults = UsageForm.getUsageDefaults();
			if (Number(this.props.usage.ca.cpu) !== Number(usageDefaults.ca.cpu)) {
				default_cpu = undefined;
			}
			if (Number(this.props.usage.ca.memory) !== Number(usageDefaults.ca.memory)) {
				default_memory = undefined;
			}
			if (Number(this.props.usage.ca.storage) !== Number(usageDefaults.ca.storage)) {
				default_storage = undefined;
			}
		}
		return (
			<WizardStep
				type="WizardStep"
				title="summary"
				disableSubmit={!this.props.admin_id || !this.props.admin_secret || (this.props.config_override && !this.props.editedConfigOverride)}
				footer={this.renderSummaryFooter(translate)}
			>
				{Helper.renderFieldSummary(translate, this.props, 'ca_display_name', 'display_name')}
				{!this.props.config_override && Helper.renderFieldSummary(translate, this.props, 'ca_admin_enroll_id', 'admin_id')}
				{!this.props.config_override && Helper.renderFieldSummary(translate, this.props, 'ca_admin_enroll_secret', 'admin_secret', true)}
				{this.props.versions && this.props.versions.length && (
					<div className="summary-section">
						<p className="summary-label">{translate('fabric_version')}</p>
						<p className="summary-value">{this.props.version ? this.props.version.version : this.props.versions[0].version}</p>
					</div>
				)}
				{this.props.clusterType !== 'free' && this.props.feature_flags.high_availability && (
					<div>
						{!this.props.config_override && Helper.renderFieldSummary(translate, this.props, 'database', 'ca_database', undefined, undefined, 'sqlite3')}
						{this.props.ca_database === 'postgres' ? (
							<div>
								{!this.props.config_override && Helper.renderFieldSummary(translate, this.props, 'db_json', 'db_json_name')}
								{Helper.renderFieldSummary(translate, this.props, 'replica_set_cnt', undefined, undefined, undefined, 1)}
							</div>
						) : (
							<div>
								{this.props.zone !== 'default' && <div>{Helper.renderFieldSummary(translate, this.props, 'ca_zone', 'zone')}</div>}
								{this.props.workerZones && this.props.workerZones.length > 1 && this.props.zone === 'default' && (
									<div className="summary-section">
										<p className="summary-label">{translate('ca_zone')}</p>
										<p className="summary-value">
											{translate('default_zone')} {translate('default_value')}
										</p>
									</div>
								)}
							</div>
						)}
					</div>
				)}
				{!this.props.config_override && this.props.advanced_ca_config.hsm && Helper.renderHSMSummary(translate, this.props.hsm)}
				{this.props.config_override && this.props.advanced_ca_config.hsm && (
					<div className="hsm-summary">{Helper.renderFieldSummary(translate, this.props.hsm, 'hsm_pkcs11endpoint', 'pkcs11endpoint')}</div>
				)}
				{this.props.clusterType === 'free' ? (
					<div className="summary-section">
						<p className="summary-label">{translate('usage_not_available')}</p>
					</div>
				) : (
					<div>
						{Helper.renderFieldSummary(translate, this.props, 'cpu_usage_total', 'usage_total_cpu', false, true, default_cpu)}
						{Helper.renderFieldSummary(translate, this.props, 'memory_usage_total', 'usage_total_memory', false, true, default_memory)}
						{this.props.ca_database === 'sqlite3' &&
							Helper.renderFieldSummary(translate, this.props, 'storage_usage_total', 'usage_total_storage', false, true, default_storage)}
					</div>
				)}
				{this.props.config_override && (
					<div className="summary-section">
						<p className="summary-label">{translate('config_override')}</p>
						<p className="summary-value">
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
				)}
				{!this.props.config_override && this.props.clusterType !== 'free' && (
					<div>
						<button
							id="edit_config_override"
							className="ibp-ca-action bx--btn bx--btn--tertiary bx--btn--sm"
							onClick={() => {
								const data = this.getCreateData();
								const config_override = CertificateAuthorityRestApi.buildConfigOverride(data);
								this.props.updateState(SCOPE, {
									config_override,
									editedConfigOverride: config_override,
								});
							}}
						>
							{translate('edit_config_override')}
						</button>
					</div>
				)}
			</WizardStep>
		);
	}

	renderUsageForm(type) {
		return (
			<UsageForm
				title={type + '_container'}
				titleTooltip={type + '_container_tooltip'}
				type={type}
				onChange={(data, valid) => {
					const usage = {
						...this.props.usage,
					};
					usage[type] = {
						...data,
						valid,
					};
					const usageValid = usage.ca.valid;
					this.props.updateState(SCOPE, {
						usage,
						usageValid,
					});
					this.calculateUsageTotals(usage);
				}}
				nostorage={this.props.ca_database !== 'sqlite3'}
			/>
		);
	}

	renderUsageFooter(translate) {
		const usage_total_cpu = Helper.formatNumber(this.props.usage_total_cpu);
		const usage_total_memory = Helper.formatNumber(this.props.usage_total_memory);
		const usage_total_storage = Helper.formatNumber(this.props.usage_total_storage);
		return (
			<div className="ibp-usage-footer">
				<div className="ibp-usage-footer-column">
					<div className="ibp-usage-footer-heading">{translate('cpu_usage_total')}</div>
					<div className="ibp-usage-footer-value">{usage_total_cpu}</div>
				</div>
				<div className="ibp-usage-footer-column">
					<div className="ibp-usage-footer-heading">{translate('memory_usage_total')}</div>
					<div className="ibp-usage-footer-value">{usage_total_memory} M</div>
				</div>
				{this.props.ca_database !== 'postgres' && (
					<div className="ibp-usage-footer-column">
						<div className="ibp-usage-footer-heading">{translate('storage_usage_total')}</div>
						<div className="ibp-usage-footer-value">{usage_total_storage} Gi</div>
					</div>
				)}
			</div>
		);
	}

	renderUsage(translate) {
		if (this.props.add_type !== constants.DEPLOYING) {
			return;
		}
		if (this.props.clusterType === 'free') {
			return;
		}
		if (!_.get(this.props, 'advanced_ca_config.resource_allocation')) {
			return;
		}
		return (
			<WizardStep type="WizardStep"
				title="resource_allocation"
				disableSubmit={!this.props.usageValid}
				footer={this.renderUsageFooter(translate)}
			>
				<div className="ibp-usage-wizard">
					<p className="ibp-resource-allocation-desc">{translate('resource_allocation_desc')}</p>
					<p className="ibp-resource-allocation-desc">{translate('import_resource_desc')}</p>
					<TranslateLink text="import_resource_desc_2"
						className="ibp-resource-allocation-desc"
					/>
					<ImportantBox text="vpc_warning_message" />
					{this.renderUsageForm('ca')}
				</div>
			</WizardStep>
		);
	}

	getSubmitButtonLabel() {
		let label = 'add_ca';
		if (this.props.add_type === constants.DEPLOYING && this.props.clusterType !== 'free') {
			label = label + '_cost';
		}
		return label;
	}

	isDatabaseValid() {
		if (this.props.ca_database !== 'sqlite3') {
			if (!this.props.db_valid) {
				return false;
			}
		}
		return true;
	}

	validateDBJson = json => {
		if (!json) {
			return false;
		}
		const db_host = _.get(json, 'connection.postgres.hosts[0].hostname');
		if (!db_host) {
			this.props.updateState(SCOPE, {
				db_json_error: 'error_required_field',
				db_json_error_opts: {
					field: 'hostname',
				},
			});
			return false;
		}
		const db_port = _.get(json, 'connection.postgres.hosts[0].port');
		if (!db_port) {
			this.props.updateState(SCOPE, {
				db_json_error: 'error_required_field',
				db_json_error_opts: {
					field: 'port',
				},
			});
			return false;
		}
		const db_name = _.get(json, 'connection.postgres.database');
		if (!db_name) {
			this.props.updateState(SCOPE, {
				db_json_error: 'error_required_field',
				db_json_error_opts: {
					field: 'database',
				},
			});
			return false;
		}
		const db_user = _.get(json, 'connection.postgres.authentication.username');
		if (!db_user) {
			this.props.updateState(SCOPE, {
				db_json_error: 'error_required_field',
				db_json_error_opts: {
					field: 'username',
				},
			});
			return false;
		}
		const db_password = _.get(json, 'connection.postgres.authentication.password');
		if (!db_password) {
			this.props.updateState(SCOPE, {
				db_json_error: 'error_required_field',
				db_json_error_opts: {
					field: 'password',
				},
			});
			return false;
		}
		const db_sslmode = _.get(json, 'connection.postgres.query_options.sslmode');
		if (!db_sslmode) {
			this.props.updateState(SCOPE, {
				db_json_error: 'error_required_field',
				db_json_error_opts: {
					field: 'sslmode',
				},
			});
			return false;
		}
		const db_server_cert = _.get(json, 'connection.postgres.certificate.certificate_base64');
		const db_client_cert = _.get(json, 'connection.postgres.client.certificate_base64');
		const db_client_private_key = _.get(json, 'connection.postgres.client.private_key_base64');
		const db_tls_enabled = db_server_cert ? true : false;
		const db_server_certs = db_server_cert ? [db_server_cert] : [];
		this.props.updateState(SCOPE, {
			db_name,
			db_host,
			db_port,
			db_user,
			db_password,
			db_sslmode,
			db_tls_enabled,
			db_server_certs,
			db_client_cert,
			db_client_private_key,
			db_json_error: null,
			db_json_error_opts: {},
		});
		return true;
	};

	renderDatabase(translate) {
		if (this.props.add_type !== constants.DEPLOYING) {
			return;
		}
		if (this.props.clusterType === 'free') {
			return;
		}
		if (!this.props.advanced_ca_config || !this.props.advanced_ca_config.database) {
			return;
		}
		if (!this.props.feature_flags.high_availability) {
			return;
		}
		return (
			<WizardStep
				type="WizardStep"
				title="database_and_replica_sets"
				disableSubmit={!this.isDatabaseValid()}
				onNext={() => {
					this.calculateUsageTotals(this.props.usage);
					this.props.updateState(SCOPE, {
						config_override: null,
						editedConfigOverride: null,
					});
					return Promise.resolve();
				}}
			>
				<div className="ibp-ca-database-wizard">
					<TranslateLink className="ibp-ca-database-desc"
						text="ca_database_desc"
					/>
					<Form
						scope={SCOPE}
						id={SCOPE + '-ca-db'}
						fields={[
							{
								name: 'ca_database',
								tooltip: 'ca_database_tooltip',
								type: 'radio',
								required: true,
								default: this.props.ca_database,
								options: [
									{
										id: 'sqlite3',
										label: translate('sqlite3'),
									},
									{
										id: 'postgres',
										label: translate('postgres'),
									},
								],
							},
						]}
						onChange={() => {
							this.props.updateState(SCOPE, {
								zone: 'default',
							});
						}}
					/>
					{this.props.ca_database === 'postgres' && (
						<Form
							scope={SCOPE}
							id={SCOPE + '-db-json'}
							fields={[
								{
									name: 'db_json',
									tooltip: 'db_json_tooltip',
									required: true,
									type: 'json_file',
									validate: this.validateDBJson,
									errorMsg: this.props.db_json_error,
									errorMsgOptions: this.props.db_json_error_opts,
								},
							]}
							onChange={(data, valid, field, formProps) => {
								const db_json_name = _.get(formProps, 'db_json.file.name');
								this.props.updateState(SCOPE, {
									db_valid: valid,
									db_json_name,
								});
							}}
						/>
					)}
					{this.props.ca_database === 'postgres' && (
						<div className="db-replica-sets">
							<Form
								scope={SCOPE}
								id={SCOPE + '-ca-replica'}
								fields={[
									{
										name: 'replica_set_cnt',
										tooltip: 'replica_set_cnt_tooltip',
										default: this.props.replica_set_cnt,
										type: 'radio',
										options: [1, 2, 3],
										horizontal: true,
										description: 'replica_sets_desc',
									},
								]}
							/>
						</div>
					)}
				</div>
			</WizardStep>
		);
	}

	renderZones(translate) {
		if (this.props.add_type !== constants.DEPLOYING) {
			return;
		}
		if (this.props.clusterType === 'free') {
			return;
		}
		if (!this.props.advanced_ca_config || !this.props.advanced_ca_config.zone) {
			return;
		}
		if (!this.props.feature_flags.high_availability) {
			return;
		}
		if (!this.props.workerZones || this.props.workerZones.length < 2) {
			return;
		}
		const zones = this.props.workerZones
			? this.props.workerZones.map(zone => {
				return {
					id: `${zone}`,
					label: zone,
				};
			})
			: [];
		zones.unshift({
			id: 'default',
			label: translate('default_zone'),
		});
		zones.push({
			id: 'x-multizone',
			label: translate('across_zones'),
		});
		return (
			<WizardStep type="WizardStep"
				title="zone_selection"
			>
				<div className="ibp-ca-zone-wizard">
					{this.props.ca_database === 'sqlite3' ? (
						<>
							<p className="ibp-ca-zone-desc">
								{translate('zone_desc')}
								<a
									className="ibp-ca-zone-link ibp-link"
									href={translate('zone_desc_link', { DOC_PREFIX: this.props.docPrefix })}
									target="_blank"
									rel="noopener noreferrer"
								>
									{translate('find_out_more')}
								</a>
							</p>
							<Form
								className="bx--radio-button-group--vertical"
								scope={SCOPE}
								id="importSaasCAZone"
								fields={[
									{
										name: 'zone',
										required: true,
										tooltip: 'ca_zone_tooltip',
										label: 'ca_zone_label',
										type: 'radio',
										options: zones,
										default: this.props.zone,
									},
								]}
								onChange={value => {
									this.props.updateState(SCOPE, {
										...value,
									});
								}}
							/>
						</>
					) : (
						<div>
							<p>{translate('zones_only_for_sqlite3')}</p>
						</div>
					)}
					{this.props.zone && this.props.zone === 'x-multizone' && <ImportantBox text="multizone_storage_warn"
						link="multizone_storage_warn_link"
					/>}
				</div>
			</WizardStep>
		);
	}

	renderHSM(translate) {
		if (this.props.add_type !== constants.DEPLOYING) {
			return;
		}
		if (this.props.clusterType === 'free') {
			return;
		}
		if (!this.props.advanced_ca_config || !this.props.advanced_ca_config.hsm) {
			return;
		}
		return (
			<WizardStep
				type="WizardStep"
				title="hsm_config_short"
				disableSubmit={!this.props.hsm}
				onNext={() => {
					this.props.updateState(SCOPE, {
						config_override: null,
						editedConfigOverride: null,
					});
					return Promise.resolve();
				}}
			>
				<p className="ibp-ca-hsm-desc">{translate('hsm_ca_desc')}</p>
				<ImportantBox text="hsm_important"
					link="hsm_important_link"
				/>
				<HSMConfig scope={SCOPE} />
			</WizardStep>
		);
	}

	render() {
		const translate = this.props.t;
		if (this.props.feature_flags.import_only_enabled) {
			return (
				<Wizard onClose={this.props.onClose}
					onSubmit={() => this.onSubmit()}
					submitButtonLabel={translate(this.getSubmitButtonLabel())}
				>
					{this.renderCAInformation(translate)}
				</Wizard>
			);
		}

		return (
			<Wizard onClose={this.props.onClose}
				onSubmit={() => this.onSubmit()}
				submitButtonLabel={translate(this.getSubmitButtonLabel())}
			>
				{this.renderChooseAddType(translate)}
				{this.renderCAInformation(translate)}
				{this.renderDatabase(translate)}
				{this.renderZones(translate)}
				{this.renderHSM(translate)}
				{this.renderUsage(translate)}
				{this.renderSummary(translate)}
			</Wizard>
		);
	}
}

const dataProps = {
	data: PropTypes.array,
	disableSubmit: PropTypes.bool,
	loading: PropTypes.bool,
	admin_id: PropTypes.string,
	admin_secret: PropTypes.string,
	advancedValid: PropTypes.bool,
	display_name: PropTypes.string,
	enrollValid: PropTypes.bool,
	usage: PropTypes.object,
	usageValid: PropTypes.bool,
	usage_total_cpu: PropTypes.number,
	usage_total_memory: PropTypes.number,
	usage_total_storage: PropTypes.number,
	ca_database: PropTypes.string,
	db_host: PropTypes.string,
	db_port: PropTypes.number,
	db_name: PropTypes.string,
	db_user: PropTypes.string,
	db_password: PropTypes.string,
	db_sslmode: PropTypes.string,
	db_valid: PropTypes.bool,
	db_tls_enabled: PropTypes.bool,
	db_server_certs: PropTypes.array,
	db_client_cert: PropTypes.string,
	db_client_private_key: PropTypes.string,
	replica_set_cnt: PropTypes.number,
	advanced_ca_config: PropTypes.object,
	db_json_name: PropTypes.string,
	db_json_error: PropTypes.string,
	db_json_error_opts: PropTypes.object,
	zone: PropTypes.string,
	hsm: PropTypes.object,
	config_override: PropTypes.object,
	editedConfigOverride: PropTypes.object,
	versions: PropTypes.array,
	version: PropTypes.object,
	add_type: PropTypes.string,
};

ImportCAModal.propTypes = {
	...dataProps,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
	updateState: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['crn_string'] = state['settings'] ? state['settings']['crn_string'] : null;
		newProps['feature_flags'] = state['settings'] ? state['settings']['feature_flags'] : null;
		newProps['CRN'] = state['settings'] ? state['settings']['CRN'] : null;
		newProps['userInfo'] = state['userInfo'] ? state['userInfo'] : null;
		newProps['clusterType'] = _.get(state, 'settings.cluster_data.type');
		newProps['workerZones'] = _.get(state, 'settings.cluster_data.zones');
		return newProps;
	},
	{
		updateState,
	}
)(withTranslation()(ImportCAModal));
