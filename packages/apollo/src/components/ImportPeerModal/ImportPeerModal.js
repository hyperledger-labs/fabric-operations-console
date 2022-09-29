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
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { showError, updateState } from '../../redux/commonActions';
import { CertificateAuthorityRestApi } from '../../rest/CertificateAuthorityRestApi';
import IdentityApi from '../../rest/IdentityApi';
import { MspRestApi } from '../../rest/MspRestApi';
import { isCreatedComponentLocation, NodeRestApi } from '../../rest/NodeRestApi';
import { PeerRestApi } from '../../rest/PeerRestApi';
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

const SCOPE = 'importPeerModal';
const Log = new Logger(SCOPE);
const semver = require('semver');

class ImportPeerModal extends React.Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			data: [],
			loading: true,
			identity: null,
			identityValid: false,
			location: this.getInitialLocation(),
			cas: [],
			msps: [],
			users: [],
			tls_users: [],
			display_name: null,
			saas_ca: null,
			enroll_id: null,
			enroll_secret: null,
			admin_msp: null,
			saasCAValid: false,
			tls_csr_hostname: null,
			tls_saasCAValid: false,
			third_party_ca: false,
			saas_ca_cert: null,
			saas_ca_private_key: null,
			tls_ca_cert: null,
			tls_ca_private_key: null,
			filenames: {},
			usage: this.getDefaultUsage(),
			zone: 'default',
			advanced_config: {
				database: false,
				zone: false,
				resource_allocation: false,
				hsm: false,
			},
			statedb: 'couchdb',
			hsm: null,
			mspError: '',
			caError: '',
			config_override: null,
			editedConfigOverride: null,
			version: null,
		});
		this.getCAWithUsers();
		if (!this.props.feature_flags.import_only_enabled) {
			this.getVersions();
		}
	}

	getDefaultUsage() {
		let usageDefaults = UsageForm.getUsageDefaults();
		this.calculateUsageTotals(usageDefaults);
		return {
			peer: {
				...usageDefaults.peer,
				valid: true,
			},
			couchdb: {
				...usageDefaults.couchdb,
				valid: true,
			},
			leveldb: {
				...usageDefaults.leveldb,
				valid: true,
			},
			dind: {
				...usageDefaults.dind,
				valid: true,
			},
			proxy: {
				...usageDefaults.proxy,
				valid: true,
			},
			fluentd: {
				...usageDefaults.fluentd,
				valid: true,
			},
			chaincodelauncher: {
				...usageDefaults.chaincodelauncher,
				valid: true,
			},
		};
	}

	getInitialLocation() {
		// check if import only is enabled first so we don't try to show any saas options to add
		if (this.props.feature_flags.import_only_enabled) {
			return Helper.getSupportedPeers()[0];
		}

		return this.props.feature_flags.saas_enabled ? 'ibm_saas' : Helper.getSupportedPeers()[0];
	}

	getVersions() {
		NodeRestApi.getAvailableVersions()
			.then(all_versions => {
				let versions = all_versions.peer;
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

	isPeerV2() {
		let v2 = false;
		let version = this.props.version;
		if (!version && this.props.versions) {
			for (let i = 0; i < this.props.versions.length; i++) {
				if (this.props.versions[i].default) {
					version = this.props.versions[i];
				}
			}
		}
		if (version && version.version) {
			if (semver.gte(semver.coerce(version.version), semver.coerce('2.0'))) {
				v2 = true;
			}
		}
		return v2;
	}

	calculateUsageTotal(usage, category, statedb) {
		let total = 0;
		let peerdb = 'couchdb';
		if (this.props.advanced_config && this.props.advanced_config.database) {
			peerdb = this.props.statedb;
		}
		if (statedb) {
			peerdb = statedb;
		}
		let usage_dind = 0;
		let usage_chaincodelauncher = 0;
		let usage_fluentd = 0;
		if (this.isPeerV2()) {
			usage_chaincodelauncher = usage.chaincodelauncher[category] && !isNaN(usage.chaincodelauncher[category]) ? Number(usage.chaincodelauncher[category]) : 0;
		} else {
			usage_dind = usage.dind[category] && !isNaN(usage.dind[category]) ? Number(usage.dind[category]) : 0;
			usage_fluentd = usage.fluentd[category] && !isNaN(usage.fluentd[category]) ? Number(usage.fluentd[category]) : 0;
		}
		try {
			total =
				(usage.peer[category] && !isNaN(usage.peer[category]) ? Number(usage.peer[category]) : 0) +
				(usage[peerdb][category] && !isNaN(usage[peerdb][category]) ? Number(usage[peerdb][category]) : 0) +
				usage_dind +
				usage_chaincodelauncher +
				(usage.proxy[category] && !isNaN(usage.proxy[category]) ? Number(usage.proxy[category]) : 0) +
				usage_fluentd;
		} catch (error) {
			total = 0;
		}
		if (category === 'cpu') {
			total = Math.floor(total * 1000) / 1000;
		}
		return total;
	}

	calculateUsageTotals(usage, statedb) {
		this.props.updateState(SCOPE, {
			usage_total_cpu: this.calculateUsageTotal(usage, 'cpu', statedb),
			usage_total_memory: this.calculateUsageTotal(usage, 'memory', statedb),
			usage_total_storage: this.calculateUsageTotal(usage, 'storage', statedb),
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
				if (!this.props.third_party_ca) {
					this.props.showError('error_cas', {}, this.props.parentScope);
				}
				this.props.updateState(SCOPE, { loading: false });
			});
	}

	loadUsersFromCA(ca) {
		this.props.updateState(SCOPE, { loadingUsers: true });
		return CertificateAuthorityRestApi.getUsers(ca)
			.then(all_users => {
				const users = [];
				if (all_users && all_users.length) {
					all_users.forEach(user => {
						if (user.type === 'peer') {
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

	componentWillUnmount() {
		this.props.updateState(SCOPE, {
			identity: null,
		});
	}

	onChange = (data, dataValid) => {
		this.props.updateState(SCOPE, {
			data: data.length !== undefined ? data : null,
			dataValid,
		});
	};

	async associateNewPeers(new_peers) {
		const all = new_peers.map(async peer => {
			return IdentityApi.associatePeer(this.props.identity.name, peer.id);
		});
		try {
			await Promise.all(all);
		} catch (error) {
			Log.error(`Could not associate identity ${this.props.identity.name} with new peer: ${error}`);
			// Use toast to show error
			this.props.showError('error_associate_identity', {}, this.props.parentScope);
		}
	}

	async onSubmit() {
		if (isCreatedComponentLocation(this.props.location)) {
			return this.onCreateSubmit();
		}
		return this.onImportSubmit();
	}

	getCreateData() {
		let data = {
			display_name: this.props.display_name,
			admin_msp: this.props.admin_msp,
			usage: this.props.usage,
			statedb: this.props.advanced_config.database ? this.props.statedb : 'couchdb',
		};
		if (this.props.version) {
			data.version = this.props.version.version;
		}
		if (this.isPeerV2()) {
			delete data.usage.dind;
			delete data.usage.fluentd;
		} else {
			delete data.usage.chaincodelauncher;
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
		if (this.props.advanced_config.zone && this.props.zone !== 'default') {
			data.zone = this.props.zone;
		}
		if (this.props.advanced_config.hsm) {
			data.hsm = this.props.hsm;
		}
		if (this.props.config_override) {
			data.config_override = this.props.editedConfigOverride ? this.props.editedConfigOverride : this.props.config_override;
		}
		data.clusterType = this.props.clusterType;
		return data;
	}

	async onCreateSubmit() {
		const data = this.getCreateData();
		let peer;
		try {
			peer = await PeerRestApi.createPeer(data);
		} catch (error) {
			Log.error(`${error}`);
			let newError = new Error(this.props.translate('error_create_peer'));
			newError.title = 'error_create_peer';
			newError.details = error;
			throw newError;
		}
		try {
			if (window.trackEvent) {
				window.trackEvent('Created Object', {
					objectType: 'Peer',
					object: this.props.crn_string && peer.id ? `${this.props.crn_string}fabric-peer:${Helper.hash_str(peer.id)}` : Helper.hash_str(data.display_name),
					tenantId: this.props.CRN.instance_id,
					accountGuid: this.props.CRN.account_id,
					milestoneName: 'Create a peer',
					category: data.statedb,
					environment: data.hsm && data.hsm.label ? 'hsm-enabled' : 'hsm-disabled',
					'meta.region': this.props.location,
					'user.email': this.props.userInfo.loggedInAs.email,
				});
			}
		} catch (error) {
			Log.warn(`event tracking failed: ${error}`);
		}

		const new_peers = [peer];
		await this.associateNewPeers(new_peers);
		try {
			const associations = await IdentityApi.getPeerAssociations();
			this.onComplete(new_peers, associations);
		} catch (error) {
			Log.error(`Could not get peer associations: ${error}`);
			this.onComplete(new_peers);
		}
	}

	onImportSubmit() {
		return new Promise((resolve, reject) => {
			this.props.data.forEach(peer => {
				if (!peer.location) {
					peer.location = this.props.location;
				}
			});
			PeerRestApi.importPeer(this.props.data)
				.then(new_peers => {
					this.props.data.forEach(json => {
						if (window.trackEvent) {
							window.trackEvent('Created Object', {
								objectType: 'Peer',
								object: this.props.crn_string
									? `${this.props.crn_string}fabric-peer:${Helper.hash_str(json.display_name)}`
									: Helper.hash_str(json.display_name),
								category: 'operational',
								tenantId: this.props.CRN.instance_id,
								accountGuid: this.props.CRN.account_id,
								milestoneName: 'Import Peers',
								'meta.region': this.props.location,
								'user.email': this.props.userInfo.loggedInAs.email,
							});
						}
					});
					this.props.onComplete(new_peers);
					resolve();
				})
				.catch(error => {
					Log.error(error);
					reject({
						title: 'error_import_peer',
						details: error,
					});
				});
		});
	}

	peerLocationChange = location => {
		this.props.updateState(SCOPE, {
			location,
		});
	};

	renderChooseLocation(translate) {
		const supported_peers = Helper.getSupportedPeers();
		if (!this.props.feature_flags.saas_enabled && supported_peers.length === 1) {
			return;
		}
		return (
			<WizardStep type="WizardStep"
				title="import_peer_config"
				disableSubmit={!this.props.location}
			>
				<p className="ibp-modal-desc">{translate('import_peer_desc_1')}</p>
				<p className="ibp-modal-desc">{translate('import_peer_desc_2')}</p>
				<TileGroup
					name="peer_locations"
					className="ibp-peer-locations"
					onChange={this.peerLocationChange}
					valueSelected={this.props.location}
					legend={translate('select_peer_type')}
				>
					{this.props.feature_flags.saas_enabled && ActionsHelper.canCreateComponent(this.props.userInfo) && (
						<RadioTile value="ibm_saas"
							id="ibm_saas"
							name="peer_location"
							className="ibp-peer-location"
						>
							<p>{translate('create_peer')}</p>
							<Add20 className="ibp-fill-color ibp-import-node-add-icon" />
						</RadioTile>
					)}
					{ActionsHelper.canImportComponent(this.props.userInfo) && (
						<RadioTile value={supported_peers[0]}
							id={supported_peers[0]}
							name="peer_location"
							className="ibp-peer-location"
						>
							<p>{translate('import_peer')}</p>
							<Upload20 className="ibp-fill-color ibp-import-node-add-icon" />
						</RadioTile>
					)}
				</TileGroup>
				{this.props.joinChannel && <SidePanelWarning title="please_note"
					subtitle="join_requires_peer"
				/>}
			</WizardStep>
		);
	}

	checkForRequirements = () => {
		return new Promise((resolve, reject) => {
			if (this.props.location === 'ibm_saas') {
				if (!this.props.cas.length && !this.props.third_party_ca) {
					this.props.updateState(SCOPE, { caError: 'needCADesc' });
				}
				if (!this.props.msps.length) {
					this.props.updateState(SCOPE, { mspError: 'msp_required' });
				}
				if (!this.props.advanced_config.resource_allocation) {
					this.props.updateState(SCOPE, {
						usage: this.getDefaultUsage(),
					});
				} else {
					this.calculateUsageTotals(this.props.usage);
				}
			}
			resolve();
		});
	};

	renderDatabase(translate) {
		if (this.props.location !== 'ibm_saas') {
			return;
		}
		if (!this.props.advanced_config.database) {
			return;
		}
		return (
			<WizardStep type="WizardStep"
				title="state_database_selection"
			>
				<div className="ibp-peer-database-wizard">
					<Form
						scope={SCOPE}
						id={SCOPE + '-state-db'}
						fields={[
							{
								name: 'statedb',
								label: 'peer_state_database',
								tooltip: 'peer_state_db_tooltip',
								tooltipDirection: 'bottom',
								type: 'radio',
								required: true,
								default: 'couchdb',
								options: [
									{
										id: 'couchdb',
										label: translate('couchdb'),
									},
									{
										id: 'leveldb',
										label: translate('leveldb'),
									},
								],
							},
						]}
						onChange={value => {
							let usageDefaults = UsageForm.getUsageDefaults();
							this.calculateUsageTotals(usageDefaults, value.statedb);
						}}
					/>
					<ImportantBox text="peer_statedb_imp_box" />
				</div>
			</WizardStep>
		);
	}

	renderZones(translate) {
		if (this.props.location !== 'ibm_saas') {
			return;
		}
		if (!this.props.advanced_config.zone) {
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
				<p className="ibp-peer-zone-desc">
					{translate('zone_desc')}
					<a
						className="ibp-peer-zone-link ibp-link"
						href={translate('zone_desc_link2', { DOC_PREFIX: this.props.docPrefix })}
						target="_blank"
						rel="noopener noreferrer"
					>
						{translate('find_out_more')}
					</a>
				</p>
				<div className="ibp-peer-zone-wizard">
					<Form
						className="bx--radio-button-group--vertical"
						scope={SCOPE}
						id="importSaasPeerZone"
						fields={[
							{
								name: 'zone',
								required: true,
								tooltip: 'worker_zone_tooltip',
								label: 'worker_zone_label',
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
					{this.props.zone && this.props.zone === 'x-multizone' && <ImportantBox text="multizone_storage_warn"
						link="multizone_storage_warn_link"
					/>}
				</div>
			</WizardStep>
		);
	}

	renderAdvancedCheckboxes(translate) {
		return (
			<div className="ibp-form">
				<div className="ibp-form-field">
					<div className="ibp-advanced-peer-checkboxes-label">
						<label className="ibp-form-label">{translate('advanced_deployment_options')}</label>
					</div>
					<div className="ibp-advanced-peer-checkboxes">
						<Checkbox
							id="advanced_config_database"
							labelText={translate('state_database_selection')}
							onChange={() => {
								this.props.updateState(SCOPE, {
									advanced_config: {
										...this.props.advanced_config,
										database: !this.props.advanced_config.database,
									},
								});
							}}
							checked={this.props.advanced_config.database}
						/>
						<BlockchainTooltip direction="top"
							withCheckbox
						>
							{translate('peer_state_db_tooltip')}
						</BlockchainTooltip>
					</div>
					{this.props.workerZones && this.props.workerZones.length > 1 && (
						<div className="ibp-advanced-peer-checkboxes">
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
								{translate('peer_zone_selection_tooltip')}
							</BlockchainTooltip>
						</div>
					)}
					<div className="ibp-advanced-peer-checkboxes">
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
							{translate('third_party_peer_tooltip')}
						</BlockchainTooltip>
					</div>
					{this.props.feature_flags && this.props.feature_flags.hsm_enabled && (
						<div className="ibp-advanced-peer-checkboxes">
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
						<div className="ibp-advanced-peer-checkboxes">
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
								{translate('peer_resource_allocation_tooltip')}
							</BlockchainTooltip>
						</div>
					)}
					{this.props.third_party_ca && <ImportantBox text={translate('third_party_ca_peer_warning')}
						link="_THIRD_PARTY_CA_LINK"
					/>}
				</div>
			</div>
		);
	}

	renderHSM(translate) {
		if (this.props.location !== 'ibm_saas') {
			return;
		}
		if (this.props.clusterType === 'free') {
			return;
		}
		if (!this.props.advanced_config.hsm) {
			return;
		}
		return (
			<WizardStep type="WizardStep"
				title="hsm_config_short"
				disableSubmit={!this.props.hsm}
			>
				<p className="ibp-peer-hsm-desc">{translate('hsm_peer_desc')}</p>
				<ImportantBox text="hsm_important"
					link="hsm_important_link"
				/>
				<HSMConfig scope={SCOPE} />
			</WizardStep>
		);
	}

	renderAddPeerInformation(translate) {
		return (
			<div>
				<Form
					scope={SCOPE}
					id="importSaasPeer"
					fields={[
						{
							name: 'display_name',
							required: true,
							tooltip: 'tooltip_peer_name',
							specialRules: Helper.SPECIAL_RULES_DISPLAY_NAME,
							label: 'peer_display_name',
							placeholder: 'peer_display_name_placeholder',
						},
					]}
					onChange={this.onChange}
				/>
				{this.renderAdvancedCheckboxes(translate)}
			</div>
		);
	}

	renderImportPeerInformation(translate) {
		const supported_peers = Helper.getSupportedPeers();
		return (
			<div>
				<p className="ibp-modal-desc">{translate('import_peer_json')}</p>
				<JsonInput
					id="importPeer"
					onlyFileUpload={true}
					definition={[
						{
							name: 'display_name',
							alias: ['short_name', 'name'],
							required: true,
							specialRules: Helper.SPECIAL_RULES_DISPLAY_NAME,
						},
						{
							name: 'msp_id',
							required: true,
							specialRules: Helper.SPECIAL_RULES_MSP_ID,
						},
						{
							name: 'grpcwp_url',
							type: 'url',
							required: true,
						},
						{
							name: 'tls_cert',
							alias: 'pem',
							type: 'certificate',
							required: false,
							validate: Helper.isCertificate,
						},
						{
							name: 'tls_ca_root_cert',
							alias: 'pem',
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
							name: 'type',
							required: false,
							validate: value => {
								if (value && value !== 'fabric-peer') {
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
					fileUploadTooltip="import_peer_file_tooltip"
				/>
				{supported_peers.length > 1 && this.props.data && this.props.data.length > 0 && !this.props.data[0].location && (
					<Form
						scope={SCOPE}
						id={SCOPE + '-location'}
						fields={[
							{
								name: 'location',
								type: 'dropdown',
								tooltip: 'import_peer_location_tooltip',
								options: supported_peers,
								translateOptions: true,
								required: true,
								label: 'import_peer_location',
							},
						]}
					/>
				)}
			</div>
		);
	}


	renderPeerInformation(translate) {
		return (
			<WizardStep type="WizardStep"
				title="import_peer_config"
				disableSubmit={!this.props.dataValid}
				onNext={this.checkForRequirements}
			>
				{this.props.feature_flags.import_only_enabled
					? this.renderImportPeerInformation(translate)
					: this.props.location === 'ibm_saas' ? this.renderAddPeerInformation(translate) : this.renderImportPeerInformation(translate)
				}
			</WizardStep>
		);
	}

	onIdentityChange = (data, valid) => {
		this.props.updateState(SCOPE, {
			identity: data[0],
			identityValid: valid,
		});
	};

	renderAssociatePeer(translate) {
		if (this.props.location !== 'ibm_saas') {
			return;
		}
		return (
			<WizardStep
				type="WizardStep"
				title="import_peer_associate"
				disableSubmit={!this.props.identityValid}
				onNext={() => {
					this.props.updateState(SCOPE, {
						config_override: null,
						editedConfigOverride: null,
					});
					return Promise.resolve();
				}}
			>
				<p className="ibp-modal-desc">{translate('associate_identity_desc')}</p>
				{!this.identities || !this.identities.length ? (
					<div>
						<p className="ibp-no-identities">{translate('no_peer_identities')}</p>
						<Form
							scope={SCOPE}
							id={SCOPE + '-noidentity'}
							fields={[
								{
									name: 'no_identity',
									tooltip: 'existing_identity_dropdown_tooltip',
									type: 'dropdown',
									options: [],
									required: true,
									label: 'peer_admin_identity',
									default: 'no_identities',
								},
							]}
						/>
					</div>
				) : (
					<Form
						scope={SCOPE}
						id={SCOPE + '-identity'}
						fields={[
							{
								name: 'identity',
								type: 'dropdown',
								tooltip: 'existing_identity_dropdown_tooltip',
								options: this.identities,
								required: true,
								label: 'peer_admin_identity',
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

	renderThirdPartyCA(translate) {
		return (
			<WizardStep type="WizardStep"
				title="third_party_ca"
				disableSubmit={!this.props.saasCAValid || !this.isVersionValid()}
			>
				<p>
					{translate('third_party_ca_peer_header')}
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
						}}
					/>
					{this.renderSelectVersion(translate)}
				</div>
			</WizardStep>
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
							tooltip: 'fabric_version_peer_tooltip',
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

	renderSaasCA(translate) {
		if (this.props.location !== 'ibm_saas') {
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
				type: 'dropdown',
				tooltip: 'saas_peer_certificate_auth_tooltip',
				options: this.props.cas,
				default: caDefaultLabel,
				required: true,
				errorMsg: this.props.caError,
			},
			{
				name: this.props.mspError ? 'admin_msp_empty' : 'admin_msp',
				label: 'admin_msp',
				tooltip: 'saas_peer_admin_cert_tooltip',
				required: true,
				type: 'dropdown',
				options: this.props.msps,
				default: mspDefaultLabel,
				errorMsg: this.props.mspError,
			},
			{
				name: 'tls_csr_hostname',
				tooltip: 'saas_peer_tls_csr_hostname_tooltip',
			},
		];
		if (!this.props.caError) {
			saasCAFormFields.splice(
				1,
				0,
				{
					name: 'enroll_id',
					tooltip: 'saas_peer_enroll_id_tooltip',
					type: this.props.users.length ? 'dropdown' : undefined,
					options: this.props.users.length ? this.props.users.map(user => user.id) : undefined,
					required: true,
					specialRules: Helper.SPECIAL_RULES_ENROLL_ID,
					label: 'peer_enroll_id',
					placeholder: 'peer_enroll_id_placeholder',
					loading: this.props.loading ? true : false,
					tooltipDirection: 'bottom',
				},
				{
					name: 'enroll_secret',
					type: 'password',
					tooltip: 'saas_peer_enroll_secret_tooltip',
					required: true,
					specialRules: Helper.SPECIAL_RULES_ENROLL_SECRET,
					label: 'peer_enroll_secret',
					placeholder: 'peer_enroll_secret_placeholder',
				}
			);
		}
		return (
			<WizardStep
				type="WizardStep"
				title="enter_peer_info"
				disableSubmit={!this.props.saasCAValid || !this.isVersionValid()}
				onNext={this.checkForRequirements}
			>
				{this.props.cas && (
					<div>
						<Form
							scope={SCOPE}
							id="saasCA"
							fields={saasCAFormFields}
							onChange={(data, valid) => {
								if (data.saas_ca) {
									this.loadUsersFromCA(data.saas_ca);
								}
								this.props.updateState(SCOPE, {
									saasCAValid: valid,
								});
							}}
						/>
						{this.renderSelectVersion(translate)}
					</div>
				)}
			</WizardStep>
		);
	}

	renderTLSThirdPartyCA(translate) {
		if (this.props.location !== 'ibm_saas') {
			return;
		}
		if (!this.props.third_party_ca) {
			return;
		}
		return (
			<WizardStep type="WizardStep"
				title="third_party_ca"
				disableSubmit={!this.props.tls_saasCAValid}
			>
				<p>{translate('third_party_ca_tls_peer_header')}</p>
				<div>
					<Form
						scope={SCOPE}
						id="thirdPartyCA"
						fields={[
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
					<p className="ibp-usage-footer-heading">{translate('estimated_vpc')}</p>
					<p className="ibp-usage-footer-value">{translate('vpc', { vpc })}</p>
				</div>
			</div>
		);
	}

	renderSaasSummary(translate) {
		if (this.props.location !== 'ibm_saas') {
			return;
		}
		let default_cpu = this.props.usage_total_cpu;
		let default_memory = this.props.usage_total_memory;
		let default_storage = this.props.usage_total_storage;
		if (this.props.advanced_config.resource_allocation) {
			const usageDefaults = UsageForm.getUsageDefaults();
			const db = this.props.advanced_config.database ? this.props.statedb : 'couchdb';
			if (Number(this.props.usage.peer.cpu) !== Number(usageDefaults.peer.cpu)) {
				default_cpu = undefined;
			}
			if (Number(this.props.usage.peer.memory) !== Number(usageDefaults.peer.memory)) {
				default_memory = undefined;
			}
			if (Number(this.props.usage.peer.storage) !== Number(usageDefaults.peer.storage)) {
				default_storage = undefined;
			}
			if (Number(this.props.usage[db].cpu) !== Number(usageDefaults[db].cpu)) {
				default_cpu = undefined;
			}
			if (Number(this.props.usage[db].memory) !== Number(usageDefaults[db].memory)) {
				default_memory = undefined;
			}
			if (Number(this.props.usage[db].storage) !== Number(usageDefaults[db].storage)) {
				default_storage = undefined;
			}
			if (this.isPeerV2()) {
				if (Number(this.props.usage.chaincodelauncher.cpu) !== Number(usageDefaults.chaincodelauncher.cpu)) {
					default_cpu = undefined;
				}
				if (Number(this.props.usage.chaincodelauncher.memory) !== Number(usageDefaults.chaincodelauncher.memory)) {
					default_memory = undefined;
				}
			} else {
				if (Number(this.props.usage.dind.cpu) !== Number(usageDefaults.dind.cpu)) {
					default_cpu = undefined;
				}
				if (Number(this.props.usage.dind.memory) !== Number(usageDefaults.dind.memory)) {
					default_memory = undefined;
				}
				if (Number(this.props.usage.fluentd.cpu) !== Number(usageDefaults.fluentd.cpu)) {
					default_cpu = undefined;
				}
				if (Number(this.props.usage.fluentd.memory) !== Number(usageDefaults.fluentd.memory)) {
					default_memory = undefined;
				}
			}
			if (Number(this.props.usage.proxy.cpu) !== Number(usageDefaults.proxy.cpu)) {
				default_cpu = undefined;
			}
			if (Number(this.props.usage.proxy.memory) !== Number(usageDefaults.proxy.memory)) {
				default_memory = undefined;
			}
		}
		return (
			<WizardStep type="WizardStep"
				title="summary"
				footer={this.renderSummaryFooter(translate)}
			>
				{Helper.renderFieldSummary(translate, this.props, 'peer_display_name', 'display_name')}
				{this.props.advanced_config.database && this.props.statedb !== 'couchdb' ? (
					<div>{Helper.renderFieldSummary(translate, this.props, 'peer_state_database', 'statedb')}</div>
				) : (
					<div className="summary-section">
						<p className="summary-label">{translate('peer_state_database')}</p>
						<p className="summary-value">
							{translate('couchdb')} {translate('default_value')}
						</p>
					</div>
				)}
				{this.props.workerZones && this.props.workerZones.length > 1 && (
					<div>
						{this.props.advanced_config.zone && this.props.zone !== 'default' ? (
							<div>{Helper.renderFieldSummary(translate, this.props, 'worker_zone', 'zone')}</div>
						) : (
							<div className="summary-section">
								<p className="summary-label">{translate('worker_zone')}</p>
								<p className="summary-value">
									{translate('default_zone')} {translate('default_value')}
								</p>
							</div>
						)}
					</div>
				)}
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
				{Helper.renderFieldSummary(translate, this.props, 'admin_msp')}
				{this.props.third_party_ca ? (
					<div>
						{Helper.renderFieldSummary(translate, this.props, 'tls_certificate', 'tls_ca_cert')}
						{Helper.renderFieldSummary(translate, this.props, 'tls_private_key', 'tls_ca_private_key')}
					</div>
				) : (
					<div>{Helper.renderFieldSummary(translate, this.props, 'tls_csr_hostname')}</div>
				)}
				{this.props.versions && this.props.versions.length && (
					<div className="summary-section">
						<p className="summary-label">{translate('version')}</p>
						<p className="summary-value">{this.props.version ? this.props.version.version : this.props.versions[0].version}</p>
					</div>
				)}
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
								const config_override = PeerRestApi.buildConfigOverride(data);
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
					this.props.updateState(SCOPE, {
						usage,
					});
					this.calculateUsageTotals(usage);
				}}
			/>
		);
	}

	isUsageValid() {
		let test = ['peer', 'proxy'];
		test.push(this.props.advanced_config.database ? this.props.statedb : 'couchdb');
		if (this.isPeerV2()) {
			test.push('chaincodelauncher');
		} else {
			test.push('dind');
			test.push('fluentd');
		}
		let usageValid = true;
		while (usageValid && test.length) {
			usageValid = this.props.usage[test.pop()].valid;
		}
		return usageValid;
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
		if (this.props.location !== 'ibm_saas') {
			return;
		}
		if (this.props.clusterType !== 'paid') {
			return;
		}
		if (!this.props.advanced_config.resource_allocation) {
			return;
		}
		const v2 = this.isPeerV2();
		return (
			<WizardStep type="WizardStep"
				title="resource_allocation"
				disableSubmit={!this.isUsageValid()}
				footer={this.renderUsageFooter(translate)}
			>
				<div className="ibp-usage-wizard">
					<p className="ibp-resource-allocation-desc">{translate('resource_allocation_desc')}</p>
					<p className="ibp-resource-allocation-desc">{translate('import_resource_desc')}</p>
					<TranslateLink text="import_resource_desc_2"
						className="ibp-resource-allocation-desc"
					/>
					<ImportantBox text="vpc_warning_message" />
					{this.renderUsageForm('peer')}
					<div className={this.props.statedb === 'couchdb' ? '' : 'hidden_section'}>{this.renderUsageForm('couchdb')}</div>
					<div className={this.props.statedb === 'leveldb' ? '' : 'hidden_section'}>{this.renderUsageForm('leveldb')}</div>
					<div className={v2 ? 'hidden_section' : ''}>{this.renderUsageForm('dind')}</div>
					<div className={v2 ? '' : 'hidden_section'}>{this.renderUsageForm('chaincodelauncher')}</div>
					{this.renderUsageForm('proxy')}
					<div className={v2 ? 'hidden_section' : ''}>{this.renderUsageForm('fluentd')}</div>
				</div>
			</WizardStep>
		);
	}

	getSubmitButtonLabel() {
		let label = 'add_peer';
		if (this.props.location === 'ibm_saas' && this.props.clusterType === 'paid') {
			label = label + '_cost';
		}
		return label;
	}

	render() {
		const translate = this.props.translate;
		if (this.props.feature_flags.import_only_enabled) {
			return (
				<Wizard onClose={this.props.onClose}
					onSubmit={() => this.onSubmit()}
					submitButtonLabel={translate(this.getSubmitButtonLabel())}
				>
					{this.renderPeerInformation(translate)}
				</Wizard>
			);
		}

		return (
			<Wizard onClose={this.props.onClose}
				onSubmit={() => this.onSubmit()}
				submitButtonLabel={translate(this.getSubmitButtonLabel())}
			>
				{this.renderChooseLocation(translate)}
				{this.renderPeerInformation(translate)}
				{this.renderDatabase(translate)}
				{this.renderZones(translate)}
				{this.renderSaasCA(translate)}
				{this.renderTLSThirdPartyCA(translate)}
				{this.renderHSM(translate)}
				{this.renderUsage(translate)}
				{this.renderAssociatePeer(translate)}
				{this.renderSaasSummary(translate)}
			</Wizard>
		);
	}
}

const dataProps = {
	data: PropTypes.array,
	dataValid: PropTypes.bool,
	loading: PropTypes.bool,
	location: PropTypes.string,
	step: PropTypes.number,
	identity: PropTypes.object,
	identityValid: PropTypes.bool,
	parentScope: PropTypes.string,
	joinChannel: PropTypes.string,
	display_name: PropTypes.string,
	cas: PropTypes.array,
	msps: PropTypes.array,
	users: PropTypes.array,
	tls_users: PropTypes.array,
	saas_ca: PropTypes.object,
	enroll_id: PropTypes.string,
	enroll_secret: PropTypes.string,
	admin_msp: PropTypes.object,
	saasCAValid: PropTypes.bool,
	tls_saasCAValid: PropTypes.bool,
	tls_csr_hostname: PropTypes.string,
	third_party_ca: PropTypes.bool,
	saas_ca_private_key: PropTypes.string,
	saas_ca_cert: PropTypes.string,
	tls_ca_cert: PropTypes.string,
	tls_ca_private_key: PropTypes.string,
	filenames: PropTypes.object,
	usage: PropTypes.object,
	usage_total_cpu: PropTypes.number,
	usage_total_memory: PropTypes.number,
	usage_total_storage: PropTypes.number,
	zone: PropTypes.string,
	statedb: PropTypes.string,
	advanced_config: PropTypes.object,
	hsm: PropTypes.object,
	mspError: PropTypes.string,
	caError: PropTypes.string,
	config_override: PropTypes.object,
	editedConfigOverride: PropTypes.object,
	versions: PropTypes.array,
	version: PropTypes.object,
};

ImportPeerModal.propTypes = {
	...dataProps,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
	updateState: PropTypes.func,
	showError: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
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
		newProps['cas'] = state['cas'] ? state['cas']['caList'] : null;
		newProps['docPrefix'] = state['settings'] ? state['settings']['docPrefix'] : null;
		return newProps;
	},
	{
		showError,
		updateState,
	}
)(withLocalize(ImportPeerModal));
