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
import { Checkbox, Loading, RadioTile, TileGroup, ToggleSmall } from 'carbon-components-react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { showError, updateState } from '../../redux/commonActions';
import { CertificateAuthorityRestApi } from '../../rest/CertificateAuthorityRestApi';
import IdentityApi from '../../rest/IdentityApi';
import { MspRestApi } from '../../rest/MspRestApi';
import { NodeRestApi } from '../../rest/NodeRestApi';
import { OrdererRestApi } from '../../rest/OrdererRestApi';
import ActionsHelper from '../../utils/actionsHelper';
import Helper from '../../utils/helper';
import BlockchainTooltip from '../BlockchainTooltip/BlockchainTooltip';
import ConfigOverride from '../ConfigOverride/ConfigOverride';
import Form from '../Form/Form';
import HSMConfig from '../HSMConfig/HSMConfig';
import ImportantBox from '../ImportantBox/ImportantBox';
import JsonInput from '../JsonInput/JsonInput';
import Logger from '../Log/Logger';
import SidePanelWarning from '../SidePanelWarning/SidePanelWarning';
import TranslateLink from '../TranslateLink/TranslateLink';
import UsageForm from '../UsageForm/UsageForm';
import Wizard from '../Wizard/Wizard';
import WizardStep from '../WizardStep/WizardStep';
import * as constants from '../../utils/constants';

const SCOPE = 'importOrdererModal';
const Log = new Logger(SCOPE);
const semver = require('semver');

class ImportOrdererModal extends React.Component {
	componentDidMount() {
		let usageDefaults = UsageForm.getUsageDefaults();
		this.props.updateState(SCOPE, {
			data: [],
			disableSubmit: true,
			loading: false,
			loadingUsers: false,
			error: null,
			cas: [],
			msps: [],
			display_name: null,
			saas_ca: null,
			users: [],
			enroll_id: null,
			enroll_secret: null,
			admin_msp: null,
			saasCAValid: false,
			tls_csr_hostname: null,
			tls_saasCAValid: false,
			identity: null,
			identityValid: false,
			third_party_ca: false,
			tls_clientValid: false,
			saas_ca_cert: null,
			saas_ca_private_key: null,
			tls_ca_cert: null,
			tls_ca_private_key: null,
			filenames: {},
			usage: {
				orderer: {
					...usageDefaults.orderer,
					valid: true,
				},
				proxy: {
					...usageDefaults.proxy,
					valid: true,
				},
			},
			usageValid: true,
			raft_nodes: 1,
			raft_third_party_ca: null,
			raft_third_party_ca_valid: false,
			raft_third_party_ca_error: null,
			orderers: [],
			append_list: [],
			ignore_list: [],
			zones: [],
			advanced_config: {
				zone: false,
				resource_allocation: false,
				hsm: false,
			},
			systemless: null,
			hsm: null,
			config_override: null,
			editedConfigOverride: null,
			duplicateMsp: false,
			mspError: '',
			caError: '',
			version: null,

			// default to selecting the deploying component option (if the user has that perm), else default select the import component option
			add_type: ActionsHelper.canCreateComponent(this.props.userInfo, this.props.feature_flags) ? constants.DEPLOYING : constants.IMPORTING,
		});
		this.getOrderers();
		this.calculateUsageTotals(usageDefaults, 1);
		if (!this.props.feature_flags.import_only_enabled) {
			this.getVersions();
		}
	}

	getVersions() {
		NodeRestApi.getAvailableVersions()
			.then(all_versions => {
				let versions = all_versions.orderer;
				if (versions) {
					const withoutSystem = this.props.systemless || (this.props.appendingNode && !this.props.systemChannel);
					const filtered = versions.filter(i => this.validVersion(i, withoutSystem));
					this.props.updateState(SCOPE, {
						origVersions: versions,
						versions: filtered,
					});
				}
			})
			.catch(error => {
				Log.error(error);
			});
	}

	// if systemless is checked omit versions less than 2.4
	validVersion(i, systemless) {
		return (!systemless || semver.gte(semver.coerce(i.version), semver.coerce('2.4')));
	}

	onComplete() {
		if (typeof this.props.onComplete === 'function') return this.props.onComplete(...arguments);
		Log.warn(`${SCOPE}: onComplete() is not set`);
	}

	getOrderers() {
		OrdererRestApi.getOrderers()
			.then(orderers => {
				this.props.updateState(SCOPE, { orderers });
				this.getCAWithUsers();
			})
			.catch(error => {
				Log.error(error);
				this.props.showError('error_orderers', {}, this.props.parentScope);
				this.getCAWithUsers();
			});
	}

	calculateUsageTotal(usage, category) {
		let total = 0;
		try {
			total =
				(usage.orderer[category] && !isNaN(usage.orderer[category]) ? Number(usage.orderer[category]) : 0) +
				(usage.proxy[category] && !isNaN(usage.proxy[category]) ? Number(usage.proxy[category]) : 0);
		} catch (error) {
			total = 0;
		}
		if (category === 'cpu') {
			total = Math.floor(total * 1000) / 1000;
		}
		return total;
	}

	calculateUsageTotals(usage, node_count) {
		const nodes = node_count || this.props.raft_nodes || 1;
		this.props.updateState(SCOPE, {
			usage_total_cpu: '' + nodes * this.calculateUsageTotal(usage, 'cpu'),
			usage_total_memory: '' + nodes * this.calculateUsageTotal(usage, 'memory'),
			usage_total_storage: '' + nodes * this.calculateUsageTotal(usage, 'storage'),
		});
	}

	getIdentities() {
		this.identities = [];
		IdentityApi.getIdentities()
			.then(identities => {
				this.identities = identities;
				this.getMsps();
			})
			.catch(error => {
				Log.error(error);
				if (!this.props.third_party_ca) {
					this.props.showError('error_identities', {}, this.props.parentScope);
				}
				this.props.updateState(SCOPE, { loading: false });
			});
	}

	// Get CAs from redux state, if unavailable then query backend
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
				this.getIdentities();
				return cas;
			})
			.catch(error => {
				Log.error(error);
				this.props.updateState(SCOPE, { loading: false });
				if (!this.props.third_party_ca) {
					this.props.showError('error_cas', {}, this.props.parentScope);
				}
			});
	}

	loadUsersFromCA(ca) {
		this.props.updateState(SCOPE, { loadingUsers: true });
		return CertificateAuthorityRestApi.getUsers(ca)
			.then(all_users => {
				const users = [];
				if (all_users && all_users.length) {
					all_users.forEach(user => {
						if (user.type === 'orderer') {
							users.push(user);
						}
					});
				}
				this.props.updateState(SCOPE, {
					enroll_id: users.length ? users[0].id : undefined,
					enroll_secret: undefined,
					users,
					loadingUsers: false,
					saasCAValid: false,
				});
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

	getMsps() {
		MspRestApi.getMsps()
			.then(msps => {
				this.props.updateState(SCOPE, {
					msps,
					loading: false,
				});
			})
			.catch(error => {
				Log.error(error);
				this.props.updateState(SCOPE, { loading: false });
			});
	}

	checkForIgnoreOrAppend(node, orderer, ignore_list, append_list) {
		if (node.raft) {
			node.raft.forEach(nodeRaft => {
				this.checkForIgnoreOrAppend(nodeRaft, orderer, ignore_list, append_list);
			});
		} else {
			if (orderer.raft) {
				node.raft_action = 'append';
				orderer.raft.forEach(ordererRaft => {
					this.checkForIgnoreOrAppend(node, ordererRaft, ignore_list, append_list);
				});
				if (node.raft_action === 'ignore') {
					ignore_list.push(node);
				} else {
					append_list.push(node);
				}
			} else {
				if (node.api_url === orderer.api_url) {
					node.raft_action = 'ignore';
				}
			}
		}
	}

	onChange(data, valid) {
		const ignore_list = [];
		const append_list = [];
		if (data.length) {
			data.forEach(node => {
				if (node.cluster_id) {
					if (this.props.raftParent && node.cluster_id !== this.props.raftParent.cluster_id) {
						node.raft_action = 'ignore';
						ignore_list.push(node);
					} else {
						this.props.orderers.forEach(orderer => {
							if (orderer.cluster_id === node.cluster_id) {
								this.checkForIgnoreOrAppend(node, orderer, ignore_list, append_list);
							}
						});
					}
				}
			});
		}
		if (ignore_list.length > 0 && append_list.length === 0) {
			valid = false;
		}
		this.props.updateState(SCOPE, {
			data: data.length !== undefined ? data : null,
			disableSubmit: !valid,
			ignore_list,
			append_list,
		});
	}

	onError = error => {
		this.props.updateState(SCOPE, { error });
	};

	async onSubmit() {
		if (this.props.add_type !== constants.DEPLOYING) {
			return this.onImportSubmit();
		}
		return this.onCreateSubmit();
	}

	getCreateData() {
		let data = {
			display_name: this.props.display_name,
			admin_msp: this.props.admin_msp,
			usage: this.props.usage,
		};
		if (this.props.version) {
			data.version = this.props.version.version;
		}
		if (this.props.advanced_config.zone && this.props.zones.length) {
			data.zones = this.props.zones;
		}
		if (!this.props.third_party_ca) {
			data = {
				...data,
				saas_ca: this.props.saas_ca,
				enroll_id: this.props.enroll_id,
				enroll_secret: this.props.enroll_secret,
				tls_saas_ca: this.props.saas_ca,
				tls_enroll_id: this.props.enroll_id,
				tls_enroll_secret: this.props.enroll_secret,
				tls_csr_hostname: this.props.tls_csr_hostname,
				raft_nodes: this.props.raft_nodes,
			};
		} else {
			if (this.props.raft_nodes > 1) {
				data = {
					...data,
					raft_nodes: this.props.raft_nodes,
					raft_config_json: this.props.raft_third_party_ca,
				};
			} else {
				data = {
					...data,
					saas_ca_private_key: this.props.saas_ca_private_key,
					saas_ca_cert: this.props.saas_ca_cert,
					tls_ca_private_key: this.props.tls_ca_private_key,
					tls_ca_cert: this.props.tls_ca_cert,
				};
			}
		}
		if (this.props.raftParent) {
			data.raftParent = this.props.raftParent;
			data.configtxlator_url = this.props.configtxlator_url;
		}
		if (this.props.advanced_config.hsm) {
			data.hsm = this.props.hsm;
		}
		if (this.props.feature_flags && this.props.feature_flags.osnadmin_feats_enabled) {
			if (this.props.systemless) {
				data.systemless = true;
			}

			// if you are appending a node && don't have a system channel, this node must be w/o a system channel too
			if (this.props.appendingNode && !this.props.systemChannel) {
				data.systemless = true;
			}
		}
		if (this.props.config_override) {
			data.config_override = this.props.editedConfigOverride ? this.props.editedConfigOverride : this.props.config_override;
		}
		data.clusterType = this.props.clusterType;
		return data;
	}

	async onCreateSubmit() {
		const data = this.getCreateData();
		let orderer;
		try {
			orderer = await OrdererRestApi.createOrderer(data);
		} catch (error) {
			Log.error(`${error}`);
			let newError = new Error(this.props.t('error_create_orderer'));
			newError.title = 'error_create_orderer';
			newError.details = error;
			throw newError;
		}
		const new_orderers = [orderer];
		if (this.props.identity && this.props.identity.name) {
			this.associateNewOrderers(new_orderers);
			try {
				const associations = await IdentityApi.getOrdererAssociations();
				this.onComplete(new_orderers, associations);
			} catch (error) {
				Log.error(`Could not get orderer associations: ${error}`);
				this.onComplete(new_orderers);
			}
			return;
		} else {
			if (this.props.raftParent) {
				this.onComplete();
			} else {
				this.onComplete(new_orderers);
			}
		}
	}

	async onImportSubmit() {
		const prefix = 'Importing Orderer:';
		const importData = [];
		this.props.data.forEach(orderer => {
			if (orderer.raft_action !== 'ignore') {
				importData.push(orderer);
			}
		});

		let orderers;
		try {
			orderers = await OrdererRestApi.importOrderer(importData);
		} catch (error) {
			Log.error(`${prefix} failed: ${error}`);
			throw error;
		}
		this.onComplete(orderers);
	}

	async associateNewOrderers(new_orderers) {
		const all = new_orderers.map(async orderer => {
			return IdentityApi.associateOrderer(this.props.identity.name, orderer.cluster_id, orderer.msp_id);
		});
		try {
			return await Promise.all(all);
		} catch (error) {
			Log.error(`Could not associate identity ${this.props.identity.name} with new orderer: ${error}`);
			// Use toast to show error
			this.props.showError('error_associate_identity', {}, this.props.parentScope);
		}
	}

	// render the choose between importing an already running os or deploying a new os
	renderChooseAddType(translate) {
		return (
			<WizardStep type="WizardStep"
				title={this.props.raftParent ? 'add_orderer_node' : 'add_orderer'}
				disableSubmit={!this.props.add_type}
			>
				{this.props.joinChannel && (
					<div className="ibp-modal-desc">
						<SidePanelWarning title={translate('join_requires_orderer')} />
					</div>
				)}
				<p className="ibp-modal-desc">{translate('import_orderer_desc_1')}</p>
				{!this.props.raftParent && <ImportantBox text="import_orderer_desc_2"
					link="IMPORT_ORDERER_DESC_LINK"
				/>}
				<TileGroup
					name="add_type"
					className="ibp-orderer-locations"
					onChange={(add_type) => {
						this.props.updateState(SCOPE, {
							add_type,
						});
					}}
					valueSelected={this.props.add_type}
					legend={translate(this.props.raftParent ? 'select_orderer_node_type' : 'select_orderer_type')}
				>
					<RadioTile value={constants.DEPLOYING}
						id="deploy-id"
						className="ibp-orderer-location"
						disabled={!ActionsHelper.canCreateComponent(this.props.userInfo, this.props.feature_flags)}
					>
						<p>{translate(this.props.raftParent ? 'create_orderer_node' : 'create_orderer')}</p>
						<Add20 className="ibp-fill-color ibp-import-node-add-icon" />
					</RadioTile>

					<RadioTile value={constants.IMPORTING}
						id="import-id"
						className="ibp-orderer-location"
						disabled={!ActionsHelper.canImportComponent(this.props.userInfo, this.props.feature_flags)}
					>
						<p>{translate(this.props.raftParent ? 'import_orderer_node' : 'import_orderer')}</p>
						<Upload20 className="ibp-fill-color ibp-import-node-add-icon" />
					</RadioTile>
				</TileGroup>
			</WizardStep>
		);
	}

	checkForRequirements = () => {
		return new Promise((resolve, reject) => {
			if (this.props.add_type === constants.DEPLOYING) {
				if (!this.props.cas.length && !this.props.third_party_ca) {
					this.props.updateState(SCOPE, { caError: 'needCADesc' });
				}
				if (!this.props.msps.length) {
					this.props.updateState(SCOPE, { mspError: 'msp_required' });
				}
				if (!this.props.advanced_config.resource_allocation) {
					const usageDefaults = UsageForm.getUsageDefaults();
					this.props.updateState(SCOPE, {
						usage: {
							orderer: {
								...usageDefaults.orderer,
								valid: true,
							},
							proxy: {
								...usageDefaults.proxy,
								valid: true,
							},
						},
					});
					this.calculateUsageTotals(usageDefaults, this.props.raft_nodes);
				}
				if (!this.props.advanced_config.zone) {
					this.props.updateState(SCOPE, {
						zones: [],
						single_zone: 'default',
					});
				}
			}
			this.props.updateState(SCOPE, {
				config_override: null,
				editedConfigOverride: null,
			});
			resolve();
		});
	};

	getZoneOptions(translate) {
		const zones = this.props.workerZones
			? this.props.workerZones.map(zone => {
				return {
					id: `${zone}`,
					label: zone,
				};
			})
			: [];
		if (zones.length > 1) {
			zones.unshift({
				id: 'default',
				label: this.props.raft_nodes > 1 ? translate('default_zones') : translate('default_zone'),
			});
			zones.push({
				id: 'x-multizone',
				label: translate('across_zones'),
			});
		}
		return zones;
	}

	getMultiZoneOptions(translate) {
		const zones = this.props.workerZones
			? this.props.workerZones.map(zone => {
				return {
					id: `${zone}`,
					name: zone,
				};
			})
			: [];
		if (zones.length > 1) {
			zones.push({
				id: 'x-multizone',
				name: translate('across_zones'),
			});
		}
		return zones;
	}

	renderSingleZone(translate) {
		return (
			<>
				<Form
					className="bx--radio-button-group--vertical ibp-accordion-form"
					scope={SCOPE}
					id="importSaasOrdererZone"
					fields={[
						{
							name: 'single_zone',
							required: true,
							tooltip: 'orderer_zone_tooltip',
							label: 'orderer_zone_label',
							type: 'radio',
							options: this.getZoneOptions(translate),
							default: this.props.zones.length ? this.props.zones[0] : 'default',
						},
					]}
					onChange={value => {
						const zones = [];
						if (value.single_zone !== 'default') {
							zones.push(value.single_zone);
						}
						this.props.updateState(SCOPE, { zones });
					}}
				/>
				{this.props.single_zone && this.props.single_zone === 'x-multizone' && (
					<ImportantBox text="multizone_storage_warn"
						link="multizone_storage_warn_link"
					/>
				)}
			</>
		);
	}

	buildDefaultZones() {
		const zones = [];
		let zone = 0;
		let pass = 0;
		while (zones.length < this.props.raft_nodes) {
			zones.splice(zone * pass + zone, 0, this.props.workerZones[zone++]);
			if (zone >= this.props.workerZones.length) {
				zone = 0;
				pass++;
			}
		}
		return zones;
	}

	renderZones(translate) {
		if (this.props.add_type !== constants.DEPLOYING) {
			return;
		}
		if (!this.props.advanced_config.zone) {
			return;
		}
		if (!this.props.workerZones || this.props.workerZones.length < 2) {
			return;
		}
		return (
			<WizardStep
				type="WizardStep"
				title="zone_selection"
				onNext={() => {
					this.props.updateState(SCOPE, {
						config_override: null,
						editedConfigOverride: null,
					});
					return Promise.resolve();
				}}
			>
				<p className="ibp-orderer-zone-desc">
					{translate('zone_desc')}
					<a
						className="ibp-orderer-zone-link ibp-link"
						href={translate('zone_desc_link', { DOC_PREFIX: this.props.docPrefix })}
						target="_blank"
						rel="noopener noreferrer"
					>
						{translate('find_out_more')}
					</a>
				</p>
				<div className="ibp-orderer-zone-wizard">{this.renderOrdererZones(translate)}</div>
			</WizardStep>
		);
	}

	renderOrdererZones(translate) {
		if (this.props.raft_nodes === 1) {
			return this.renderSingleZone(translate);
		}
		return (
			<div className="ibp-form">
				<div className="ibp-form-field">
					<label className="ibp-form-label">
						<BlockchainTooltip direction="top"
							type="definition"
							tooltipText={translate('orderer_zones_tooltip')}
						>
							{translate('orderer_zones_label')}
						</BlockchainTooltip>
					</label>
					<div className="ibp-zone-selection-div">
						<div>
							<label className="ibp-form-label">{translate('default_zones')}</label>
						</div>
						<ToggleSmall
							id="toggle-default-zones"
							toggled={!this.props.zones.length}
							onToggle={() => {
								const zones = this.props.zones.length ? [] : this.buildDefaultZones();
								this.props.updateState(SCOPE, { zones });
							}}
							onChange={() => { }}
							aria-label={translate('default_zones')}
							labelA={translate('no')}
							labelB={translate('yes')}
						/>
					</div>
					{!!this.props.zones.length && (
						<div>
							{this.props.zones.map((zone, index) => {
								return (
									<Form
										key={index}
										scope={SCOPE}
										id={'selected_zone_' + index}
										fields={[
											{
												name: 'zone_' + index,
												label: 'orderer_node_name',
												labelOptions: { index: index + 1 },
												required: true,
												type: 'dropdown',
												options: this.getMultiZoneOptions(translate),
												default: zone,
											},
										]}
										onChange={data => {
											const zones = [...this.props.zones];
											zones[index] = data['zone_' + index].id;
											this.props.updateState(SCOPE, { zones });
										}}
									/>
								);
							})}
							{this.props.zones && this.props.zones.indexOf('x-multizone') !== -1 && (
								<ImportantBox text="multizone_storage_warn"
									link="multizone_storage_warn_link"
								/>
							)}
						</div>
					)}
				</div>
			</div>
		);
	}

	renderAdvancedCheckboxes(translate) {
		return (
			<div className="ibp-form">
				<div className="ibp-form-field">
					<div className="ibp-advanced-peer-checkboxes-label">
						<label className="ibp-form-label">{translate('advanced_deployment_options')}</label>
					</div>
					{this.props.workerZones && this.props.workerZones.length > 1 && (
						<div className="ibp-advanced-orderer-checkboxes">
							<Checkbox
								id="advanced_config_zone"
								labelText={translate('zone_selection')}
								onChange={() => {
									this.props.updateState(SCOPE, {
										advanced_config: {
											...this.props.advanced_config,
											zone: !this.props.advanced_config.zone,
										},
									});
								}}
								checked={this.props.advanced_config.zone}
							/>
							<BlockchainTooltip direction="top"
								withCheckbox
							>
								{translate('orderer_zone_selection_tooltip')}
							</BlockchainTooltip>
						</div>
					)}
					<div className="ibp-advanced-orderer-checkboxes">
						<Checkbox
							id="third-party-ca"
							labelText={translate('third_party_ca')}
							onChange={() => {
								this.props.updateState(SCOPE, {
									third_party_ca: !this.props.third_party_ca,
									saasCAValid: false,
									tls_saasCAValid: false,
								});
							}}
							checked={this.props.third_party_ca}
							disabled={this.props.advanced_config.hsm}
						/>
						<BlockchainTooltip direction="top"
							withCheckbox
						>
							{translate('third_party_orderer_tooltip')}
						</BlockchainTooltip>
					</div>
					{this.props.feature_flags && this.props.feature_flags.hsm_enabled && (
						<div className="ibp-advanced-orderer-checkboxes">
							<Checkbox
								id="advanced_config_hsm"
								labelText={translate('hsm_config')}
								onChange={() => {
									this.props.updateState(SCOPE, {
										advanced_config: {
											...this.props.advanced_config,
											hsm: !this.props.advanced_config.hsm,
										},
									});
								}}
								checked={this.props.advanced_config.hsm}
								disabled={this.props.third_party_ca}
							/>
							<BlockchainTooltip withCheckbox>{translate('hsm_tooltip')}</BlockchainTooltip>
						</div>
					)}
					{this.props.clusterType === 'paid' && (
						<div className="ibp-advanced-orderer-checkboxes">
							<Checkbox
								id="advanced_config_resource_allocation"
								labelText={translate('resource_allocation')}
								onChange={() => {
									this.props.updateState(SCOPE, {
										advanced_config: {
											...this.props.advanced_config,
											resource_allocation: !this.props.advanced_config.resource_allocation,
										},
									});
								}}
								checked={this.props.advanced_config.resource_allocation}
							/>
							<BlockchainTooltip direction="top"
								withCheckbox
							>
								{translate('orderer_resource_allocation_tooltip')}
							</BlockchainTooltip>
						</div>
					)}
					{this.props.third_party_ca && <ImportantBox text={translate('third_party_ca_orderer_warning')}
						link="_THIRD_PARTY_CA_LINK"
					/>}
				</div>
			</div>
		);
	}

	// create the system channel configuration radio buttons
	renderSystemChannelRadios(translate) {
		return (
			<div className="ibp-form">
				<Form
					scope={SCOPE}
					id="systemChannelConfig"
					fields={[
						{
							name: 'system_config',
							type: 'radio',
							tooltip: 'systemless_tooltip',
							required: true,
							label: 'systemless_title',
							options: [
								{
									id: 'without-system',	// this is the value of the radio...
									label: translate('systemless_config'),
								},
								{
									id: 'with-system',		// this is the value of the radio...
									label: translate('system_config'),
								},
							],
							default: 'nothing'				// select neither radio on first load, this forces the user to decide
						},
					]}
					onChange={data => {
						const systemless = !(data && data.system_config && data.system_config === 'with-system');
						const filtered = this.props.origVersions ? this.props.origVersions.filter(i => this.validVersion(i, systemless)) : [];
						this.props.updateState(SCOPE, {
							systemless: systemless,

							// if systemless is checked omit versions less than 2.4
							versions: filtered,
							version: null
						});
						return systemless;
					}}
				/>
			</div>
		);
	}

	renderHSM(translate) {
		if (this.props.add_type !== constants.DEPLOYING) {
			return;
		}
		if (this.props.clusterType === 'free') {
			return;
		}
		if (!this.props.advanced_config.hsm) {
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
				<p className="ibp-orderer-hsm-desc">{translate('hsm_orderer_desc')}</p>
				<ImportantBox text="hsm_important"
					link="hsm_important_link"
				/>
				<HSMConfig scope={SCOPE} />
			</WizardStep>
		);
	}

	renderOrdererUpload(translate) {
		const ignore_list = this.props.ignore_list ? this.props.ignore_list : [];
		const append_list = this.props.append_list ? this.props.append_list : [];
		const osnadmin_feats_enabled = (this.props.feature_flags && this.props.feature_flags.osnadmin_feats_enabled);
		const importing = (this.props.add_type !== constants.DEPLOYING);

		// if you are not appending an orderer, render the sys channel choice
		// if you are appending an orderer, only render if you do not have a system channel. otherwise forced to use systemless.
		const renderSystemChChoice = osnadmin_feats_enabled && (!this.props.appendingNode || this.props.systemChannel);

		// if its not rendered, you don't need to select it
		const needs2selectSysConfig = !importing && osnadmin_feats_enabled && typeof this.props.systemless !== 'boolean' && renderSystemChChoice;

		return (
			<WizardStep
				type="WizardStep"
				title={this.props.raftParent ? 'add_orderer_node' : 'add_orderer'}
				disableSubmit={this.props.disableSubmit || needs2selectSysConfig}
				onNext={this.checkForRequirements}
			>
				<div>
					<div>
						{this.props.loading && (
							<div style={{ position: 'relative' }}>
								<Loading withOverlay={false} />
							</div>
						)}
						{!importing && (
							<div>
								{this.props.raftParent ? (
									<div>
										<p>
											{translate('raft_node_desc')}
											<a
												className="tl-link ibp-raft-node-learn-more"
												href={translate('raft_add_node_docs', { DOC_PREFIX: this.props.docPrefix })}
												target="_blank"
												rel="noopener noreferrer"
											>
												{translate('find_more_here')}
											</a>
										</p>
									</div>
								) : (
									<p className="ibp-modal-text">{translate('raft_orderer_desc')}</p>
								)}
								<Form
									scope={SCOPE}
									id="importSaasOrderer"
									fields={[
										{
											name: 'display_name',
											tooltip: this.props.raftParent ? 'saas_orderer_node_display_name_tooltip' : 'saas_orderer_display_name_tooltip',
											required: true,
											specialRules: Helper.SPECIAL_RULES_DISPLAY_NAME,
											label: this.props.raftParent ? 'orderer_node_display_name' : 'orderer_display_name',
											placeholder: this.props.raftParent ? 'orderer_node_display_name_placeholder' : 'orderer_display_name_placeholder',
										},
									]}
									onChange={(data, valid) => this.onChange(data, valid)}
								/>
								{!this.props.raftParent && (
									<Form
										scope={SCOPE}
										id="importRaftOrderer"
										fields={[
											{
												name: 'raft_nodes',
												type: 'radio',
												tooltip: 'number_of_ordering_nodes_tooltip',
												required: true,
												label: 'number_of_ordering_nodes',
												options: [
													{
														id: 1,
														label: translate('one_ordering_node'),
													},
													{
														id: 5,
														label: translate('five_ordering_nodes'),
													},
												],
												disabled: this.props.clusterType !== 'paid',
												default: this.props.raft_nodes,
											},
										]}
										onChange={data => {
											this.calculateUsageTotals(this.props.usage, data.raft_nodes);
											this.props.updateState(SCOPE, {
												zones: { default: data.raft_nodes },
											});
										}}
									/>
								)}
								{renderSystemChChoice && this.renderSystemChannelRadios(translate)}
								{this.renderAdvancedCheckboxes(translate)}
							</div>
						)}
						{this.props.add_type !== constants.DEPLOYING && (
							<div className={this.props.loading ? 'hidden_section' : ''}>
								{this.props.raftParent && <ImportantBox text="import_orderer_node_important" />}
								<JsonInput
									id="importOrderer"
									onlyFileUpload={true}
									definition={[
										{
											name: 'display_name',
											alias: ['short_name', 'name'],
											required: true,
											specialRules: Helper.SPECIAL_RULES_DISPLAY_NAME,
										},
										{
											name: 'grpcwp_url',
											type: 'url',
											required: true,
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
											name: 'msp_id',
											required: true,
											specialRules: Helper.SPECIAL_RULES_MSP_ID,
										},
										{
											name: 'tls_ca_root_cert',
											alias: 'pem',
											type: 'certificate',
											required: false,
											validate: Helper.isCertificate,
										},
										{
											name: 'tls_cert',
											type: 'certificate',
											validate: Helper.isCertificate,
											required: false,
										},
										{
											name: 'server_tls_cert',
											type: 'certificate',
											validate: Helper.isCertificate,
											required: false,
										},
										{
											name: 'client_tls_cert',
											type: 'certificate',
											validate: Helper.isCertificate,
											required: false,
										},
										{
											name: 'msp',
											required: false,
											validate: msp => {
												let valid = true;
												const tls_cert = _.get(msp, 'component.tls_cert');
												if (!tls_cert) {
													valid = false;
												} else {
													valid = Helper.isCertificate(tls_cert);
												}
												if (valid) {
													const root_certs = _.get(msp, 'tlsca.root_certs');
													if (!root_certs || !root_certs.length) {
														valid = false;
													} else {
														root_certs.forEach(root_cert => {
															if (!Helper.isCertificate(root_cert)) {
																valid = false;
															}
														});
													}
												}
												return valid;
											},
										},
										{
											name: 'api_url',
											alias: 'url',
											type: 'url',
											required: true,
										},
										{
											name: 'operations_url',
											alias: 'operations',
											type: 'url',
											required: false,
										},
										{
											name: 'osnadmin_url',
											type: 'url',
											required: false,
										},
										{
											name: 'cluster_id',
											required: false,
											validate: value => {
												if (this.props.raftParent && value && value !== this.props.raftParent.cluster_id) {
													return false;
												}
												return true;
											},
										},
										{
											name: 'cluster_name',
											required: false,
										},
										{
											name: 'system_channel_id',
											required: false,
										},
										{
											name: 'systemless',
											required: false,
										},
										{
											name: 'type',
											required: false,
											validate: value => {
												if (value && value !== 'fabric-orderer') {
													return false;
												}
												return true;
											},
										},
										{
											name: 'location',
											required: false,
										},
										{
											name: 'client_tls_cert',
											required: false,
											hidden: true,
										},
										{
											name: 'server_tls_cert',
											required: false,
											hidden: true,
										},
									]}
									onChange={(data, valid) => this.onChange(data, valid)}
									onError={this.onError}
									singleInput={true}
									fileUploadTooltip="import_orderer_file_tooltip"
									readOnly={this.props.data && this.props.data.length > 0 && (append_list.length > 0 || ignore_list.length > 0)}
								/>
								{this.props.data && this.props.data.length > 0 && append_list.length > 0 && (
									<div>
										<p className="ibp-import-orderer-list-desc">{translate('import_raft_append')}</p>
										<ul className="ibp-import-orderer-list">
											{append_list.map(node => {
												return <li key={node.display_name ? node.display_name : node.name}>{node.display_name ? node.display_name : node.name}</li>;
											})}
										</ul>
									</div>
								)}
								{this.props.data && this.props.data.length > 0 && ignore_list.length > 0 && (
									<div>
										{append_list.length === 0 ? (
											<div>
												<p className="ibp-import-orderer-no-append">
													{translate(this.props.raftParent ? 'import_parent_no_append' : 'import_raft_no_append')}
												</p>
											</div>
										) : (
											<div>
												<p className="ibp-import-orderer-list-desc">
													{translate(this.props.raftParent ? 'import_parent_ignore' : 'import_raft_ignore')}
												</p>
												<ul className="ibp-import-orderer-list">
													{ignore_list.map(node => {
														return <li key={node.display_name ? node.display_name : node.name}>{node.display_name ? node.display_name : node.name}</li>;
													})}
												</ul>
											</div>
										)}
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</WizardStep>
		);
	}

	renderAssociateOrderer(translate) {
		if (this.props.append_list && this.props.append_list.length > 0) {
			return;
		}
		if (this.props.add_type !== constants.DEPLOYING) {
			return;
		}
		if (this.props.duplicateMsp) {
			return;
		}
		return (
			<WizardStep
				type="WizardStep"
				title={translate('import_orderer_associate')}
				disableSubmit={!this.props.identityValid}
				onNext={() => {
					this.props.updateState(SCOPE, {
						config_override: null,
						editedConfigOverride: null,
					});
					return Promise.resolve();
				}}
			>
				<p className="ibp-modal-desc">{translate('associate_identity_desc_orderer')}</p>
				{!this.identities || !this.identities.length ? (
					<div>
						<p className="ibp-no-identities">{translate('no_orderer_identities')}</p>
						<Form
							scope={SCOPE}
							id={SCOPE}
							fields={[
								{
									name: 'no_identity',
									tooltip: 'orderer_existing_identity_tooltip',
									type: 'dropdown',
									options: [],
									required: true,
									label: 'orderer_admin_identity',
									default: 'no_identities',
								},
							]}
						/>
					</div>
				) : (
					<Form
						scope={SCOPE}
						id={SCOPE}
						fields={[
							{
								name: 'identity',
								tooltip: 'orderer_existing_identity_tooltip',
								type: 'dropdown',
								options: this.identities,
								required: true,
								label: 'orderer_admin_identity',
								default: this.props.identity ? this.props.identity : 'select_wallet_identity',
							},
						]}
						onChange={(data, valid) => {
							this.props.updateState(SCOPE, {
								identityValid: valid,
							});
						}}
					/>
				)}
			</WizardStep>
		);
	}

	onIdentityChange = (data, valid) => {
		this.props.updateState(SCOPE, {
			identity: data[0],
			identityValid: valid,
		});
	};

	validateRAFTExternalCA = json => {
		if (!_.isArray(json)) {
			this.props.updateState(SCOPE, { raft_third_party_ca_error: 'error_external_ca_array' });
			return false;
		}
		if (json.length !== this.props.raft_nodes) {
			this.props.updateState(SCOPE, { raft_third_party_ca_error: 'error_external_ca_array_size' });
			return false;
		}
		this.props.updateState(SCOPE, { raft_third_party_ca_error: null });
		return true;
	};

	checkMsp(admin_msp) {
		if (!admin_msp) {
			return;
		}
		let duplicateMsp = false;
		if (this.props.raftParent) {
			if (this.props.raftParent.raft) {
				this.props.raftParent.raft.forEach(raftNode => {
					if (raftNode.msp_id === admin_msp.msp_id) {
						duplicateMsp = true;
					}
				});
			}
			if (this.props.raftParent.pending) {
				this.props.raftParent.pending.forEach(pendingNode => {
					if (pendingNode.msp_id === admin_msp.msp_id) {
						duplicateMsp = true;
					}
				});
			}
		}
		this.props.updateState(SCOPE, {
			duplicateMsp,
		});
	}

	renderRAFTThirdPartyCA(translate) {
		return (
			<WizardStep
				type="WizardStep"
				title={this.props.raftParent ? 'add_orderer_node' : 'add_orderer'}
				disableSubmit={!this.props.raft_third_party_ca_valid || !this.isVersionValid()}
				onNext={() => {
					this.props.updateState(SCOPE, {
						config_override: null,
						editedConfigOverride: null,
					});
					return Promise.resolve();
				}}
			>
				<p>{translate('multi_node_external_ca')}</p>
				<ImportantBox text="multi_node_external_important"
					link="MULTI_NODE_EXTERNAL_CA_LINK"
				/>
				<Form
					scope={SCOPE}
					id="raftThirdPartyCA"
					fields={[
						{
							name: 'raft_third_party_ca',
							required: true,
							type: 'json_file',
							//tooltip: 'upload_external_tooltip',
							label: 'upload_external',
							validate: this.validateRAFTExternalCA,
							errorMsg: this.props.raft_third_party_ca_error,
						},
						{
							name: 'admin_msp',
							tooltip: 'saas_orderer_admin_cert_tooltip',
							required: true,
							type: 'dropdown',
							options: this.props.msps,
							default: 'select_msp',
						},
					]}
					onChange={(data, valid, field, formProps) => {
						let filenames = { ...this.props.filenames };
						filenames.raft_third_party_ca = _.get(formProps, 'raft_third_party_ca.file.name');
						this.props.updateState(SCOPE, {
							raft_third_party_ca_valid: valid,
							filenames,
						});
						this.checkMsp(data.admin_msp);
					}}
				/>
				{this.renderSelectVersion(translate)}
			</WizardStep>
		);
	}

	renderThirdPartyCA(translate) {
		if (this.props.raft_nodes > 1) {
			return this.renderRAFTThirdPartyCA(translate);
		}
		return (
			<WizardStep
				type="WizardStep"
				title="third_party_ca"
				disableSubmit={!this.props.saasCAValid || !this.isVersionValid()}
				onNext={() => {
					this.props.updateState(SCOPE, {
						config_override: null,
						editedConfigOverride: null,
					});
					return Promise.resolve();
				}}
			>
				<p>
					{translate('third_party_ca_orderer_header')}
					<a
						className="ibp-third-party-ca-doc-link ibp-link"
						href={translate('third_party_ca_docs', { DOC_PREFIX: this.props.docPrefix })}
						target="_blank"
						rel="noopener noreferrer"
					>
						{translate('find_out_more')}
					</a>
				</p>
				<div>
					<Form
						scope={SCOPE}
						id="thirdPartyCA"
						fields={[
							{
								name: 'saas_ca_cert',
								required: true,
								type: 'certificate',
								tooltip: 'third_party_orderer_cert_tooltip',
								validate: Helper.isCertificate,
								label: 'certificate',
								placeholder: 'certificate_placeholder',
							},
							{
								name: 'saas_ca_private_key',
								required: true,
								tooltip: 'third_party_orderer_private_key_tooltip',
								type: 'private_key',
								validate: Helper.isPrivateKey,
								label: 'private_key',
								placeholder: 'private_key_placeholder',
							},
							{
								name: 'admin_msp',
								tooltip: 'third_party_msp_tooltip',
								required: true,
								type: 'dropdown',
								options: this.props.msps,
								default: 'select_msp',
							},
						]}
						onChange={(data, valid, field, formProps) => {
							let filenames = { ...this.props.filenames };
							filenames.saas_ca_private_key = _.get(formProps, 'saas_ca_private_key.file.name');
							filenames.saas_ca_cert = _.get(formProps, 'saas_ca_cert.file.name');
							this.props.updateState(SCOPE, {
								saasCAValid: valid,
								filenames,
							});
							this.checkMsp(data.admin_msp);
						}}
					/>
					{this.renderSelectVersion(translate)}
				</div>
			</WizardStep>
		);
	}

	renderSelectVersion(translate) {
		if (!this.props.versions) {
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
							tooltip: 'fabric_version_orderer_tooltip',
							required: true,
						},
					]}
				/>
			</>
		);
	}

	isVersionValid() {
		if (this.props.version && this.props.version.version) {
			return true;
		}
		return false;
	}

	renderSaasCA(translate) {
		if (this.props.add_type !== constants.DEPLOYING) {
			return;
		}
		if (this.props.third_party_ca) {
			return this.renderThirdPartyCA(translate);
		}
		const caDefaultLabel = this.props.caError.length ? 'no_ca_warning' : 'select_ca_default';
		const mspDefaultLabel = this.props.mspError.length ? 'no_msp_warning' : 'select_msp';
		const saasCAFormFields = [
			{
				name: this.props.caError.length ? 'saas_ca_empty' : 'saas_ca',
				label: 'saas_ca',
				tooltip: this.props.raftParent ? 'orderer_node_ca_tooltip' : 'saas_orderer_ca_tooltip',
				type: 'dropdown',
				options: this.props.cas,
				default: caDefaultLabel,
				required: true,
				errorMsg: this.props.caError,
			},
			{
				name: this.props.mspError ? 'admin_msp_empty' : 'admin_msp',
				label: 'admin_msp',
				tooltip: this.props.raftParent ? 'orderer_node_admin_msp_tooltip' : 'saas_orderer_admin_cert_tooltip',
				required: true,
				type: 'dropdown',
				options: this.props.msps,
				default: mspDefaultLabel,
				errorMsg: this.props.mspError,
			},
			{
				name: 'tls_csr_hostname',
				tooltip: 'saas_orderer_tls_csr_hostname_tooltip',
			},
		];
		if (!this.props.caError) {
			saasCAFormFields.splice(
				1,
				0,
				{
					name: 'enroll_id',
					type: this.props.users.length ? 'dropdown' : undefined,
					options: this.props.users.length ? this.props.users.map(user => user.id) : undefined,
					tooltip: this.props.raftParent ? 'orderer_node_enroll_id_tooltip' : 'saas_orderer_enroll_id_tooltip',
					tooltipDirection: 'bottom',
					required: true,
					specialRules: Helper.SPECIAL_RULES_ENROLL_ID,
					label: this.props.raftParent ? 'orderer_node_enroll_id' : 'orderer_enroll_id',
					placeholder: 'peer_enroll_id_placeholder',
					loading: this.props.loadingUsers ? true : false,
				},
				{
					name: 'enroll_secret',
					type: 'password',
					tooltip: this.props.raftParent ? 'orderer_node_enroll_secret_tooltip' : 'saas_orderer_enroll_secret_tooltip',
					required: true,
					specialRules: Helper.SPECIAL_RULES_ENROLL_SECRET,
					label: this.props.raftParent ? 'orderer_node_enroll_secret' : 'orderer_enroll_secret',
					placeholder: 'peer_enroll_secret_placeholder',
				}
			);
		}
		return (
			<WizardStep
				type="WizardStep"
				title={this.props.raftParent ? 'add_orderer_node' : 'add_orderer'}
				disableSubmit={!this.props.saasCAValid || !this.isVersionValid()}
				onNext={() => {
					this.props.updateState(SCOPE, {
						config_override: null,
						editedConfigOverride: null,
					});
					return Promise.resolve();
				}}
			>
				{this.props.cas && (
					<div>
						<Form
							scope={SCOPE}
							id="saasCA"
							fields={saasCAFormFields}
							onChange={(data, valid) => {
								this.props.updateState(SCOPE, {
									saasCAValid: valid,
								});
								if (data.saas_ca && data.saas_ca !== this.props.saas_ca) {
									this.loadUsersFromCA(data.saas_ca);
								}
								this.checkMsp(data.admin_msp);
							}}
						/>
						{this.renderSelectVersion(translate)}
					</div>
				)}
			</WizardStep>
		);
	}

	renderTLSThirdPartyCA(translate) {
		if (this.props.add_type !== constants.DEPLOYING) {
			return;
		}
		if (!this.props.third_party_ca) {
			return;
		}
		if (this.props.raft_nodes > 1) {
			return;
		}
		return (
			<WizardStep
				type="WizardStep"
				title="third_party_ca"
				disableSubmit={!this.props.tls_saasCAValid}
				onNext={() => {
					this.props.updateState(SCOPE, {
						config_override: null,
						editedConfigOverride: null,
					});
					return Promise.resolve();
				}}
			>
				<p>{translate('third_party_ca_tls_orderer_header')}</p>
				<div>
					<Form
						scope={SCOPE}
						id="thirdPartyTlsCA"
						fields={[
							{
								name: 'tls_ca_cert',
								required: true,
								type: 'certificate',
								tooltip: 'third_party_orderer_tls_cert_tooltip',
								validate: Helper.isCertificate,
								label: 'tls_certificate',
								placeholder: 'certificate_placeholder',
							},
							{
								name: 'tls_ca_private_key',
								required: true,
								tooltip: 'third_party_orderer_tls_private_key_tooltip',
								tooltipDirection: 'bottom',
								type: 'private_key',
								validate: Helper.isPrivateKey,
								label: 'tls_private_key',
								placeholder: 'private_key_placeholder',
							},
						]}
						onChange={(data, valid, field, formProps) => {
							let filenames = { ...this.props.filenames };
							filenames.tls_ca_private_key = _.get(formProps, 'tls_ca_private_key.file.name');
							filenames.tls_ca_cert = _.get(formProps, 'tls_ca_cert.file.name');
							this.props.updateState(SCOPE, {
								tls_saasCAValid: valid,
								filenames,
							});
						}}
					/>
				</div>
			</WizardStep>
		);
	}

	renderSummaryFooter(translate) {
		if (this.props.clusterType !== 'paid') {
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

	renderZonesSummary(translate) {
		if (!this.props.zones.length) {
			return (
				<p className="summary-value">
					{translate(this.props.raft_nodes < 2 ? 'default_zone' : 'default_zones')} {translate('default_value')}
				</p>
			);
		}
		if (this.props.raft_nodes === 1) {
			return <p className="summary-value">{this.props.zones[0]}</p>;
		}
		return (
			<div>
				{this.props.zones.map((zone, index) => {
					return (
						<p key={index}
							className="summary-value"
						>
							{translate('orderer_node_summary', {
								index: index + 1,
								zone,
							})}
						</p>
					);
				})}
			</div>
		);
	}

	renderSaasSummary(translate) {
		if (this.props.add_type !== constants.DEPLOYING) {
			return;
		}
		let default_cpu = this.props.usage_total_cpu;
		let default_memory = this.props.usage_total_memory;
		let default_storage = this.props.usage_total_storage;
		if (this.props.advanced_config.resource_allocation) {
			const usageDefaults = UsageForm.getUsageDefaults();
			if (Number(this.props.usage.orderer.cpu) !== Number(usageDefaults.orderer.cpu)) {
				default_cpu = undefined;
			}
			if (Number(this.props.usage.orderer.memory) !== Number(usageDefaults.orderer.memory)) {
				default_memory = undefined;
			}
			if (Number(this.props.usage.orderer.storage) !== Number(usageDefaults.orderer.storage)) {
				default_storage = undefined;
			}
			if (Number(this.props.usage.proxy.cpu) !== Number(usageDefaults.proxy.cpu)) {
				default_cpu = undefined;
			}
			if (Number(this.props.usage.proxy.memory) !== Number(usageDefaults.proxy.memory)) {
				default_memory = undefined;
			}
		}
		const data = this.getCreateData();
		return (
			<WizardStep type="WizardStep"
				title={translate('summary')}
				footer={this.renderSummaryFooter(translate)}
			>
				{Helper.renderFieldSummary(translate, this.props, this.props.raftParent ? 'orderer_node_display_name' : 'orderer_display_name', 'display_name')}
				{this.props.clusterType === 'paid' && !this.props.raftParent && (
					<div>{Helper.renderFieldSummary(translate, this.props, 'number_of_ordering_nodes', 'raft_nodes')}</div>
				)}
				{this.props.workerZones && this.props.workerZones.length > 1 && (
					<div className="summary-section">
						<p className="summary-label">{translate(this.props.raft_nodes > 1 ? 'orderer_zones' : 'orderer_zone')}</p>
						{this.renderZonesSummary(translate)}
					</div>
				)}
				{this.props.third_party_ca && this.props.raft_nodes > 1 ? (
					<div>
						{Helper.renderFieldSummary(translate, this.props, 'admin_msp')}
						{Helper.renderFieldSummary(translate, this.props, 'upload_external', 'raft_third_party_ca')}
						{this.props.versions && this.props.versions.length && (
							<div className="summary-section">
								<p className="summary-label">{translate('version')}</p>
								<p className="summary-value">{this.props.version ? this.props.version.version : this.props.versions[0].version}</p>
							</div>
						)}
					</div>
				) : (
					<div>
						{this.props.third_party_ca ? (
							<div>
								{Helper.renderFieldSummary(translate, this.props, 'certificate', 'saas_ca_cert')}
								{Helper.renderFieldSummary(translate, this.props, 'private_key', 'saas_ca_private_key')}
							</div>
						) : (
							<div>
								{Helper.renderFieldSummary(translate, this.props, 'saas_ca')}
								{Helper.renderFieldSummary(translate, this.props, this.props.raftParent ? 'orderer_node_enroll_id' : 'orderer_enroll_id', 'enroll_id')}
								{Helper.renderFieldSummary(
									translate,
									this.props,
									this.props.raftParent ? 'orderer_node_enroll_secret' : 'orderer_enroll_secret',
									'enroll_secret',
									true
								)}
								{Helper.renderFieldSummary(translate, this.props, 'tls_csr_hostname')}
							</div>
						)}
						{Helper.renderFieldSummary(translate, this.props, 'admin_msp')}
						{this.props.versions && this.props.versions.length && (
							<div className="summary-section">
								<p className="summary-label">{translate('version')}</p>
								<p className="summary-value">{this.props.version ? this.props.version.version : this.props.versions[0].version}</p>
							</div>
						)}
						{this.props.third_party_ca && (
							<div>
								{Helper.renderFieldSummary(translate, this.props, 'tls_certificate', 'tls_ca_cert')}
								{Helper.renderFieldSummary(translate, this.props, 'tls_private_key', 'tls_ca_private_key')}
							</div>
						)}
					</div>
				)}
				<div className="summary-section">
					<p className="summary-label">{translate('configuration')}</p>
					<p className="summary-value">{data.systemless ? translate('systemless_config') : translate('system_config')}</p>
				</div>
				{!this.props.config_override && this.props.advanced_config.hsm && Helper.renderHSMSummary(translate, this.props.hsm)}
				{this.props.config_override && this.props.advanced_config.hsm && (
					<div className="hsm-summary">{Helper.renderFieldSummary(translate, this.props.hsm, 'hsm_pkcs11endpoint', 'pkcs11endpoint')}</div>
				)}
				{this.props.clusterType === 'paid' ? (
					<div>
						{Helper.renderFieldSummary(translate, this.props, 'cpu_usage_total', 'usage_total_cpu', false, true, default_cpu)}
						{Helper.renderFieldSummary(translate, this.props, 'memory_usage_total', 'usage_total_memory', false, true, default_memory)}
						{Helper.renderFieldSummary(translate, this.props, 'storage_usage_total', 'usage_total_storage', false, true, default_storage)}
					</div>
				) : (
					<div className="summary-section">
						<p className="summary-label">{translate('usage_not_available')}</p>
					</div>
				)}
				{this.props.identity && Helper.renderFieldSummary(translate, this.props, 'associated_identity', 'identity.name')}
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
								const config_override = OrdererRestApi.buildConfigOverride(data);
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
					const usageValid = usage.orderer.valid;
					this.props.updateState(SCOPE, {
						usage,
						usageValid,
					});
					this.calculateUsageTotals(usage);
				}}
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
				<div className="ibp-usage-footer-column">
					<div className="ibp-usage-footer-heading">{translate('storage_usage_total')}</div>
					<div className="ibp-usage-footer-value">{usage_total_storage} Gi</div>
				</div>
			</div>
		);
	}

	renderUsage(translate) {
		if (this.props.add_type !== constants.DEPLOYING) {
			return;
		}
		if (this.props.clusterType !== 'paid') {
			return;
		}
		if (!this.props.advanced_config.resource_allocation) {
			return;
		}
		return (
			<WizardStep
				type="WizardStep"
				title={translate('resource_allocation')}
				disableSubmit={!this.props.usageValid}
				footer={this.renderUsageFooter(translate)}
				onNext={() => {
					this.props.updateState(SCOPE, {
						config_override: null,
						editedConfigOverride: null,
					});
					return Promise.resolve();
				}}
			>
				<div className="ibp-usage-wizard">
					<p className="ibp-resource-allocation-desc">{translate('resource_allocation_desc')}</p>
					<p className="ibp-resource-allocation-desc">{translate('import_resource_desc')}</p>
					<TranslateLink text="import_resource_desc_2"
						className="ibp-resource-allocation-desc"
					/>
					<ImportantBox text="vpc_warning_message" />
					{this.renderUsageForm('orderer')}
					{this.renderUsageForm('proxy')}
				</div>
			</WizardStep>
		);
	}

	getSubmitButtonLabel() {
		let label = 'add_orderer';
		if (this.props.raftParent) {
			label = 'add_orderer_node';
		} else if (this.props.add_type === constants.DEPLOYING && this.props.clusterType === 'paid') {
			label = label + '_cost';
		}
		return label;
	}

	render() {
		const translate = this.props.t;
		if (this.props.feature_flags.import_only_enabled) {
			return (
				<Wizard onClose={this.props.onClose}
					onSubmit={() => this.onSubmit()}
					submitButtonLabel={translate(this.getSubmitButtonLabel())}
				>
					{this.renderOrdererUpload(translate)}
				</Wizard>
			);
		}

		return (
			<Wizard onClose={this.props.onClose}
				onSubmit={() => this.onSubmit()}
				submitButtonLabel={translate(this.getSubmitButtonLabel())}
			>
				{this.renderChooseAddType(translate)}
				{this.renderOrdererUpload(translate)}
				{this.renderZones(translate)}
				{this.renderSaasCA(translate)}
				{this.renderTLSThirdPartyCA(translate)}
				{this.renderHSM(translate)}
				{this.renderUsage(translate)}
				{this.renderAssociateOrderer(translate)}
				{this.renderSaasSummary(translate)}
			</Wizard>
		);
	}
}

const dataProps = {
	data: PropTypes.array,
	loading: PropTypes.bool,
	loadingUsers: PropTypes.bool,
	disableSubmit: PropTypes.bool,
	error: PropTypes.string,
	identity: PropTypes.object,
	identityValid: PropTypes.bool,
	display_name: PropTypes.string,
	cas: PropTypes.array,
	msps: PropTypes.array,
	saas_ca: PropTypes.object,
	enroll_id: PropTypes.string,
	enroll_secret: PropTypes.string,
	users: PropTypes.array,
	admin_msp: PropTypes.object,
	saasCAValid: PropTypes.bool,
	tls_csr_hostname: PropTypes.string,
	tls_saasCAValid: PropTypes.bool,
	third_party_ca: PropTypes.bool,
	saas_ca_private_key: PropTypes.string,
	saas_ca_cert: PropTypes.string,
	tls_ca_cert: PropTypes.string,
	tls_ca_private_key: PropTypes.string,
	filenames: PropTypes.object,
	usage: PropTypes.object,
	usageValid: PropTypes.bool,
	usage_total_cpu: PropTypes.string,
	usage_total_memory: PropTypes.string,
	usage_total_storage: PropTypes.string,
	raft_nodes: PropTypes.number,
	raft_third_party_ca: PropTypes.object,
	raft_third_party_ca_valid: PropTypes.bool,
	raft_third_party_ca_error: PropTypes.string,
	orderers: PropTypes.array,
	append_list: PropTypes.array,
	ignore_list: PropTypes.array,
	zones: PropTypes.array,
	single_zone: PropTypes.string,
	advanced_config: PropTypes.object,
	hsm: PropTypes.object,
	config_override: PropTypes.object,
	editedConfigOverride: PropTypes.object,
	duplicateMsp: PropTypes.bool,
	mspError: PropTypes.string,
	caError: PropTypes.string,
	versions: PropTypes.array,
	origVersions: PropTypes.array,
	version: PropTypes.object,
	systemless: PropTypes.bool,
	system_config: PropTypes.string,
	add_type: PropTypes.string,
};

ImportOrdererModal.propTypes = {
	...dataProps,
	onComplete: PropTypes.func,
	showError: PropTypes.func,
	onClose: PropTypes.func,
	joinChannel: PropTypes.bool,
	updateState: PropTypes.func,
	raftParent: PropTypes.object,
	appendingNode: PropTypes.bool,
	systemChannel: PropTypes.bool,
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
		newProps['configtxlator_url'] = state['settings']['configtxlator_url'];
		newProps['workerZones'] = _.get(state, 'settings.cluster_data.zones');
		newProps['docPrefix'] = state['settings'] ? state['settings']['docPrefix'] : null;
		return newProps;
	},
	{
		showError,
		updateState,
	}
)(withTranslation()(ImportOrdererModal));
