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

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation, Trans } from 'react-i18next';
import { connect } from 'react-redux';
import { showBreadcrumb, updateState } from '../../redux/commonActions';
import { MigrationApi } from '../../rest/MigrationApi';
import { Accordion, AccordionItem, SkeletonText } from 'carbon-components-react';
import Helper from '../../utils/helper';
import PageContainer from '../PageContainer/PageContainer';
import Logger from '../Log/Logger';
import PageHeader from '../PageHeader/PageHeader';
import UserSettingsRestApi from '../../rest/UserSettingsRestApi';
import { Button, Checkbox, Loading } from 'carbon-components-react';
import BlockchainTooltip from '../BlockchainTooltip/BlockchainTooltip';
import SidePanel from '../SidePanel/SidePanel';
import Form from '../Form/Form';
import LoginApi from '../../rest/LoginApi';
import { RestApi } from '../../rest/RestApi';
import TranslateLink from '../TranslateLink/TranslateLink';
import * as constants from '../../utils/constants';
import SVGs from '../Svgs/Svgs';
import withRouter from '../../hoc/withRouter';
const SCOPE = 'MigrationPage';
const Log = new Logger(SCOPE);

class MigrationPage extends Component {
	debounce = null;
	monitorInterval = null;

	async componentDidMount() {
		this.props.showBreadcrumb('settings', {}, this.props.history.location.pathname, true);
		this.props.updateState(SCOPE, {
			loading: true,
			openSidePanel: false,
			migFeatureFlagEnabled: false,
			submitting: false,
			showInfo: false,
			readOnly: true,
		});
		try {
			await this.getMigrationStatus();
			console.log('[migration] received overall migration status', this.props.overallMigrationStatus);
		} catch (e) {
			console.error('[migration] error getting data from status api:');
			console.error(e);
		}

		try {
			const userData = await UserSettingsRestApi.getUsersIAMInfo();
			console.log('[migration] userData:', userData);
			this.props.updateState(SCOPE, {
				userData: userData,
			});
		} catch (e) {
			console.error('[migration] error getting data from user api:');
			console.error(e);
			this.props.updateState(SCOPE, {
				userData: null,
			});
		}

		try {
			const settings = await UserSettingsRestApi.getApplicationSettings();
			this.props.updateState(SCOPE, {
				settings: settings,
				loading: false,
			});
		} catch (e) {
			console.error('[migration] error getting data from settings api:');
			console.error(e);
			this.props.updateState(SCOPE, {
				settings: null,
				loading: false,
			});
		}

		if (this.props.overallMigrationStatus === constants.STATUS_IN_PROGRESS) {
			this.createPoll();
		}
	}

	// get data about the migration status
	async getMigrationStatus() {
		let res = null;
		try {
			res = await MigrationApi.getStatus();
			console.log('[migration] received migration data', res);
		} catch (e) {
			Log.error(e);
			this.props.updateState(SCOPE, {
				componentList: [],
			});
		}

		let migrationStatusStr = res ? res.migration_status : '';
		let migrationAttempted =
			migrationStatusStr === constants.STATUS_IN_PROGRESS ||
			migrationStatusStr === constants.STATUS_DONE ||
			migrationStatusStr === constants.STATUS_FAILED ||
			migrationStatusStr === constants.STATUS_TIMEOUT;

		this.props.updateState(SCOPE, {
			componentList: res ? res.components : [],
			overallMigrationStatus: migrationStatusStr,
			migFeatureFlagEnabled: res ? res.migration_enabled : false,
			migrationAttempted: migrationAttempted,
			showInfo: !migrationAttempted,
			estimateInMins: res ? res.estimate_mins : 15,
			elapsedMs: res ? res.elapsed_ms : 0,
			errorMsg: res ? res.error_msg : '',
			steps: this.buildStepProgressData(res.steps),
			newConsoleURL: res ? res.migrated_console_url : '',
			exportedWallets: res ? res.wallets : [],
		});

		if (migrationStatusStr !== constants.STATUS_IN_PROGRESS) {	// if we aren't in progress, kill the interval
			clearInterval(this.monitorInterval);
		}
	}

	// start migration button is clicked
	open_migration = async () => {
		this.props.updateState(SCOPE, {
			openSidePanel: true,
			migration_check_loader: true,
		});

		await this.validateFabricVersions();
		await this.validateKubernetesVersion();
		console.log('[migration] done checking');
		this.props.updateState(SCOPE, {
			migration_check_loader: false,
		});
	}

	// has migration permission
	has_migration_permission = () => {
		if (this.props.userData && this.props.userData.authorized_actions) {
			if (this.props.userData.authorized_actions.includes('blockchain.components.manage')) {
				return true;
			}
		}
		return false;
	}

	// debounce the new-password input field as it is entered
	onPassChange(value) {
		clearTimeout(this.debounce);
		this.debounce = setTimeout(() => {
			this.onPasswordChangeFormChangeDebounced(value);
		}, 250);
	}

	// test new password's strength as it is entered
	async onPasswordChangeFormChangeDebounced(value) {
		if (value.new_console_pass) {
			this.props.updateState(SCOPE, {
				newConsolePassword: value.new_console_pass,
			});

			try {
				await LoginApi.testPasswordStr(value.new_console_pass);
				this.props.updateState(SCOPE, {
					newPasswordError: '',
				});
				this.validate_confirm();
			} catch (e) {
				const msg = e ? e.msg : 'Password was not updated';
				this.props.updateState(SCOPE, {
					newPasswordError: (Array.isArray(msg) && typeof msg[0] === 'string') ? msg.join('<br/>') : msg,
				});
			}
		} else if (value.new_console_pass_confirm) {
			this.props.updateState(SCOPE, {
				newConsolePasswordConfirm: value.new_console_pass_confirm,
			});
			this.validate_confirm();
		}
	}

	// check if confirmation password input matches new password input
	validate_confirm = () => {
		const newPassword = this.props.newConsolePassword;
		const confirmPassword = this.props.newConsolePasswordConfirm;
		this.props.updateState(SCOPE, {
			confirmPasswordError: (newPassword && newPassword === confirmPassword) ? '' : 'passwords_do_not_match',
		});
	}

	// check if each node is at migratable fabric version
	async validateFabricVersions() {
		let results = null;
		try {
			results = await RestApi.get('/api/v3/migration/fabric/versions');
		} catch (e) {
			console.error('[migration] fabric check http error', e);
		}
		console.log('[migration] fabric versions', results);
		this.props.updateState(SCOPE, {
			components: results ? results.components : [],
			hasValidFabricVersions: results && results.all_valid
		});
	}

	// check if their kubernetes cluster is using a migratable version
	async validateKubernetesVersion() {
		let result = null;
		try {
			result = await RestApi.get('/api/v3/migration/kubernetes/versions');
		} catch (e) {
			console.error('[migration] kubernetes version check - http error', e);
		}
		this.props.updateState(SCOPE, {
			hasValidK8s: result && result.k8s && result.k8s.migratable,
			kubernetes: result ? result.k8s : null,
		});
		if (!result || !result.k8s || !result.k8s.version || result.k8s.version === 'unknown') {
			console.error('[migration] unable to read kubernetes version', result);
		} else {
			console.log('[migration] kubernetes version', result.k8s.version);
		}
	}

	// migration button is clicked
	onSubmit = async () => {
		let result = null;
		this.props.updateState(SCOPE, {
			submitting: true,
			overallMigrationStatus: '',
			errorMsg: '',
			showInfo: false,
			steps: this.buildStepProgressData(),				// reset local steps
		});

		let error = null;
		try {
			const headers = {
				'x-iam-token': this.props.userData ? this.props.userData.iamAccessToken : '',
				'x-refresh-token': this.props.userData ? this.props.userData.iamRefreshToken : '',
			};
			const body = {
				//migration_api_key: 'populated-later',			// filled in later
				login_username: this.props.userData ? this.props.userData.loggedInAs.email : '',
				login_password: this.props.newConsolePassword
			};
			result = await RestApi.post('/api/v3/migration/start', body, headers);
			console.log('[migration] start migration response', result);
		}
		catch (e) {
			console.error('[migration] start migration error', e);
			error = e;
		}

		this.props.updateState(SCOPE, {
			submitting: error ? true : false,		// keep spinner on if we errored, wait for error message to be in migrationStatus api
			openSidePanel: error ? true : false,
			overallMigrationStatus: error ? constants.STATUS_FAILED : constants.STATUS_IN_PROGRESS,
			migrationAttempted: true,
		});

		if (error) {								// get error message from migration status api, wait for error to be set
			setTimeout(async () => {
				await this.getMigrationStatus();
				this.props.updateState(SCOPE, {
					submitting: false,
					openSidePanel: false,
				});
			}, 3 * 1000);
		}


		// if no error, reload the page to reflect the read-only setting that should now be on
		if (!error) {
			this.reloadPage();
		} else {
			this.createPoll();				// if there was an error setup the poll so we can get the official error and surface it on ui
			setTimeout(async () => {
				await this.getMigrationStatus();
			}, 5 * 1000);
		}
	}

	// poll on the migration status and reflect status on the page
	async createPoll() {
		clearInterval(this.monitorInterval);
		this.monitorInterval = setInterval(async () => {
			await this.getMigrationStatus();
		}, 15 * 1000);
	}

	// reload page to reflect read-only mode
	reloadPage = () => {
		this.props.updateState(SCOPE, {
			loading: true,
		});
		setTimeout(() => {
			window.location.reload();
		}, 1500);
	}

	// add leading 'v' like '1.4.5' -> 'v1.4.5
	conform_version(ver) {
		if (typeof ver === 'string') {
			ver = ver.toLowerCase();
			if (ver === 'unknown' || ver === 'unsupported') {	// if unknown version, leave it
				return ver;
			}
			if (ver[0] === 'v') {
				return ver;
			} else {
				return 'v' + ver;
			}
		}
		return ver;
	}

	// attempt to build a redhat openshift version from the kubernetes version (this isn't great, but should work short term)
	/*getOpenShiftVersionFromK8s(k8s_version) {
		if (typeof k8s_version === 'number') {
			k8s_version = k8s_version.toString();
		}
		if (typeof k8s_version === 'string') {
			const parts = k8s_version.split('.');
			if (parts && parts[1]) {
				const minor = Number(parts[1]);
				const offset = 13;	// subtract 13 from the k8s minor version number to get to a redhat number, this works so far!
				return 'v4.' + (minor - offset);
			}
		}
		return 'v4.x';
	}*/

	// build data that helps build the step progression diagram
	buildStepProgressData(mig_steps) {
		const athena2apolloMap = {};
		athena2apolloMap[constants.STATUS_IN_PROGRESS] = constants.STEP_IN_PROGRESS;
		athena2apolloMap[constants.STATUS_DONE] = constants.STEP_COMPLETE;
		athena2apolloMap[constants.STATUS_FAILED] = constants.STEP_FAILED;
		athena2apolloMap[constants.STATUS_TIMEOUT] = constants.STEP_FAILED;

		const steps = [
			{
				css_class: constants.STEP_IN_PROGRESS,
				txt: 'Editing ingress',
			},
			{
				css_class: constants.STEP_NOT_STARTED,
				txt: 'Migrating Fabric nodes',
			},
			{
				css_class: constants.STEP_NOT_STARTED,
				txt: 'Creating new console',
			},
			{
				css_class: constants.STEP_NOT_STARTED,
				txt: 'Copying console data',
			},
			{
				css_class: constants.STEP_NOT_STARTED,
				txt: 'Migrate wallet',
			}
		];

		// build the css style for this step based on the steps status
		for (let i in mig_steps) {
			const step_status = mig_steps[i] ? mig_steps[i].status : '';
			if (step_status && steps[i]) {
				steps[i].css_class = athena2apolloMap[step_status];
			}
		}
		console.log('[migration] step status', mig_steps, steps);
		return steps;
	}

	// format the min version text from "1.2.4" to "v1.2.3+"
	formatMinVersion(version) {
		return 'needs v' + version + '+';
	}

	// --------------------------------------------------------------------------
	// Main Migration Content
	// --------------------------------------------------------------------------
	render() {
		const translate = this.props.t;
		const hasMigrationPerm = this.has_migration_permission();
		const migrationStatusStr = this.props.overallMigrationStatus;
		const minCaVersion = (this.props.settings && this.props.settings.MIGRATION_MIN_VERSIONS) ? this.props.settings.MIGRATION_MIN_VERSIONS['fabric-ca'] : '-';
		const minPeerVersion = (this.props.settings && this.props.settings.MIGRATION_MIN_VERSIONS) ? this.props.settings.MIGRATION_MIN_VERSIONS['fabric-peer'] : '-';
		const minOrdererVersion = (this.props.settings && this.props.settings.MIGRATION_MIN_VERSIONS) ? this.props.settings.MIGRATION_MIN_VERSIONS['fabric-orderer'] : '-';
		let minK8sVersion = (this.props.settings && this.props.settings.MIGRATION_MIN_VERSIONS) ? this.props.settings.MIGRATION_MIN_VERSIONS['kubernetes'] : '-';
		const steps = this.props.steps;
		const walletStepStatus = (steps && steps[4]) ? steps[4].css_class : '';
		const usingOpenShift = (this.props.settings && this.props.settings.INFRASTRUCTURE === constants.OPENSHIFT_NAME) ? true : false;

		if (usingOpenShift) {
			minK8sVersion = (this.props.settings && this.props.settings.MIGRATION_MIN_VERSIONS) ? this.props.settings.MIGRATION_MIN_VERSIONS['openshift'] : '-';
		}

		// split up the error message into the console part and the jupiter part if we can detect them
		let console_msg = this.props.errorMsg;
		let jupiter_msg = '';						// leave blank if we didn't get one or could not parse it
		if (typeof this.props.errorMsg === 'string') {
			const pos = this.props.errorMsg.lastIndexOf('Details -');
			if (pos >= 0) {
				console_msg = this.props.errorMsg.substring(0, pos);
				jupiter_msg = this.props.errorMsg.substring(pos);
			}
		}

		return (
			<PageContainer>
				<div className="bx--row migrationPanel">
					<div className="bx--col-lg-13">
						<PageHeader
							history={this.props.history}
							headerName="migration"
							staticHeader
						/>

						{this.props.loading &&
							<div>
								<SkeletonText
									style={{
										paddingTop: '.5rem',
										width: '8rem',
										height: '1rem',
									}}
								/>
								<SkeletonText />
							</div>
						}

						{!this.props.loading &&
							<div>
								<Accordion align='start'>
									<AccordionItem title={translate('migration_info')}
										open={this.props.showInfo}
										className='toggleHeader'
									>
										<div className="twistyContent">
											<p className="infoTitle">
												{translate('why_migrate_title')}
											</p>
											<TranslateLink text="migration_why1" />

											<p className="infoTitle">
												{translate('what_changes_title')}
											</p>
											<p>{translate('migration_what1')}</p>
											<br />
											<div className="leftParagraph">
												<p><strong>{translate('mig_details_title')}</strong></p>
												<p>- {translate('migration_details6')}</p>
												<p>- {translate('migration_details1')}</p>
												<p>- {translate('migration_details2')}</p>
												<TranslateLink text="migration_details2.1" />
												<p>- {translate('migration_details3')}</p>
												<p>- {translate('migration_details4')}</p>
												<TranslateLink text="migration_details5" />
											</div>
											<p className="infoTitle">
												{translate('mig_warnings')}
											</p>
											<p className="checking_text">{translate('mig_warning_txt')}</p>
											<br />
											<p className="checking_text">{translate('mig_warning_txt2')}</p>
											<p className="infoTitle">
												{translate('what_prereq_title')}
											</p>
											<div className="leftParagraph">
												{translate('migration_resources1')}
												&nbsp;<span className="checking_text">
													{translate('migration_resources2')}
												</span>
												<br />
												<br />
												<p>
													<strong>
														{translate('migration_console_title')}
													</strong>
													&nbsp;- {translate('migration_resources')}
												</p>
											</div>

											<br />

											<div className="leftParagraph">
												<h4>{translate('migration_min_versions_title')}</h4>
												{translate('migration_min_versions')}
												<br />
												<br />
												<p>
													<strong>
														{translate(usingOpenShift ? 'openshift_txt' : 'migration_k8s')}
													</strong>
													<p>
														&nbsp;- {this.formatMinVersion(minK8sVersion)}
													</p>
												</p>
												<p>
													<strong>
														{translate('migration_fabric_ca')}
													</strong>
													<p>
														&nbsp;- {this.formatMinVersion(minCaVersion)}
													</p>
												</p>
												<p>
													<strong>
														{translate('migration_fabric_peer')}
													</strong>
													<p>
														&nbsp;- {translate('migration_fabric_2.2')}
														&nbsp;- {this.formatMinVersion(minPeerVersion[0])}
													</p>
													<p>
														&nbsp;- {translate('migration_fabric_2.4')}
														&nbsp;- {this.formatMinVersion(minPeerVersion[1])}
													</p>
												</p>
												<p>
													<strong>
														{translate('migration_fabric_orderer')}
													</strong>
													<p>
														&nbsp;- {translate('migration_fabric_2.2')}
														&nbsp;- {this.formatMinVersion(minOrdererVersion[0])}
													</p>
													<p>
														&nbsp;- {translate('migration_fabric_2.4')}
														&nbsp;- {this.formatMinVersion(minOrdererVersion[1])}
													</p>
												</p>
											</div>

											<p className="infoTitle">
												{translate('how_migrate_title')}
											</p>
											<div className="leftParagraph">
												{translate('migration_start1', { estimate: this.props.estimateInMins })}
												&nbsp;<span className="checking_text">{translate('migration_start1.1')}</span>
												{translate('migration_start1.2')}

												<br />
												<br />
												<div className="leftParagraph">
													{translate('migration_start2')}
													<p>{translate('migration_start_details1')}</p>
													<p>{translate('migration_start_details2')}</p>
													<p>{translate('migration_start_details3')}</p>
													<p>{translate('migration_start_details4')}</p>
													<p>{translate('migration_start_details5')}</p>
												</div>
											</div>
										</div>
									</AccordionItem>
								</Accordion>

								{migrationStatusStr !== constants.STATUS_DONE &&
									<div className='migrationWizardModal'>
										<h3 className="settings-label">
											<BlockchainTooltip direction="right"
												triggerText={translate((migrationStatusStr === constants.STATUS_IN_PROGRESS) ? 'mig_header_in_progress' : 'mig_header1')}
											>
												{translate((migrationStatusStr === constants.STATUS_IN_PROGRESS) ? 'mig_tooltip_in_progress' : 'mig_tooltip1')}
											</BlockchainTooltip>
										</h3>
										{migrationStatusStr !== constants.STATUS_DONE &&
											<p>
												{
													translate(this.props.migFeatureFlagEnabled ? (
														migrationStatusStr === constants.STATUS_IN_PROGRESS ? 'mig_description_in_progress' : 'mig_description'
													) : 'mig_description_disabled')
												}
											</p>
										}
										<br />
										<br />
										<p>
											<Button
												onClick={this.open_migration}
												className="ibp-button ibm-label mig-button"
												disabled={!hasMigrationPerm || migrationStatusStr === constants.STATUS_IN_PROGRESS || !this.props.migFeatureFlagEnabled
													|| migrationStatusStr === constants.STATUS_DONE}
											>
												{translate('mig_button_text')}
												{migrationStatusStr !== constants.STATUS_IN_PROGRESS &&
													<SVGs extendClass={{ 'ibp-container-list-add-button-img': true }}
														type="arrowRight"
													/>
												}
												{migrationStatusStr === constants.STATUS_IN_PROGRESS &&
													<Loading withOverlay={false}
														small
														className="migration-progress-spinner"
													/>
												}
											</Button>
											{!hasMigrationPerm && this.props.migFeatureFlagEnabled &&
												<div className="tinyText">
													{translate('mig_missing_perms')}
												</div>
											}
										</p>
									</div>
								}

								{this.props.migrationAttempted && this.props.migFeatureFlagEnabled && !this.props.submitting &&
									<div className='progressWrap'>
										{steps.map((step, i) => {
											return (
												<span key={'step_' + i}>
													<span className={'stepBubble ' + step.css_class}>
														{Number(i) + 1}
														<div className={'stepIndicator ' + step.css_class +
															((step.css_class === constants.STEP_IN_PROGRESS) ? ' bounce ' : '')}
														>
															^
														</div>
														<div className={'stepDescription'}>{step.txt}</div>
													</span>
													{(i < steps.length - 1) &&
														<span className="stepLineWrap">
															<span className={'stepLine ' + steps[i + 1].css_class}></span>
															{steps[i + 1].css_class === constants.STEP_IN_PROGRESS &&
																<span className={'stepLineMotion'}></span>
															}
														</span>
													}
												</span>
											);
										})}

										{!this.props.submitting && <div className='statusSummary'>
											{migrationStatusStr === constants.STATUS_TIMEOUT && this.props.migFeatureFlagEnabled &&
												<div className="tinyText">
													{translate('mig_timed_out')}
												</div>
											}
											{migrationStatusStr === constants.STATUS_FAILED && this.props.migFeatureFlagEnabled &&
												<div className="tinyText">
													{translate('mig_error')}
													<p className="tinyText errorTxt">{translate('mig_error_msg', { migration_error_msg: console_msg, jupiter_error_msg: jupiter_msg })}</p>
												</div>
											}
											{migrationStatusStr === constants.STATUS_IN_PROGRESS && this.props.migFeatureFlagEnabled && walletStepStatus !== constants.STEP_IN_PROGRESS &&
												<div>
													<span
														className="tinyTextWhite"
														title={translate('mig_elapsed_msg', { time: Helper.friendly_ms(this.props.elapsedMs, translate, 0) })}
													>
														{translate('mig_in_progress', { estimate: this.props.estimateInMins })}
													</span>
												</div>
											}
											{migrationStatusStr === constants.STATUS_DONE &&
												<div>
													{translate('mig_complete')}
												</div>
											}
										</div>}

										{migrationStatusStr === constants.STATUS_IN_PROGRESS && this.props.migFeatureFlagEnabled && walletStepStatus === constants.STEP_IN_PROGRESS &&
											<div>
												{translate('mig_wallet_instructions')}
											</div>
										}
									</div>
								}

								{migrationStatusStr === constants.STATUS_IN_PROGRESS && this.props.migFeatureFlagEnabled && walletStepStatus === constants.STEP_IN_PROGRESS &&
									<div>
										<h3>{translate('mig_wallet_title')}</h3>
										<p>{translate('mig_wallet_instructions1.5')}</p>
										<br />
										<p>{translate('mig_wallet_instructions2')}</p>
										<br />
										<p><Trans>{translate('mig_wallet_instructions3')}</Trans></p>
										<div className="leftParagraph">
											<p className="leftParagraph">
												- New console: <a href={this.props.newConsoleURL}
													target="_blank"
													rel="noreferrer"
												>
													{this.props.newConsoleURL}
												</a>
											</p>
										</div>
									</div>
								}
							</div>
						}
					</div>
					{!this.props.loading && migrationStatusStr === constants.STATUS_DONE && this.props.migFeatureFlagEnabled && this.renderDeleteContent()}
				</div >
				{this.props.openSidePanel && this.renderSidePanel()}
			</PageContainer >
		);
	}

	// --------------------------------------------------------------------------
	// Migration wizard
	// --------------------------------------------------------------------------
	renderSidePanel() {
		const translate = this.props.t;
		const hasValidFabricVersions = this.props.hasValidFabricVersions;
		const hasValidK8s = this.props.hasValidK8s;
		const hasIamTokens = (this.props.userData && this.props.userData.iamAccessToken && this.props.userData.iamRefreshToken) ? true : false;
		const migration_check_loader = this.props.migration_check_loader;
		const passwords_good = this.props.newPasswordError === '' && this.props.confirmPasswordError === '';
		const freeCluster = (this.props.settings && this.props.settings.cluster_data) ? this.props.settings.cluster_data.type === 'free' : false;
		const valid_preqs = hasValidFabricVersions && hasValidK8s && hasIamTokens && !freeCluster;
		const usingOpenShift = (this.props.settings && this.props.settings.INFRASTRUCTURE === constants.OPENSHIFT_NAME) ? true : false;

		const deployed_comps = this.props.components ? this.props.components.filter(x => {
			return !x._imported;
		}) : [];

		// limit length of node display name, put full name in title
		const NAME_MAX_LEN = 28;
		for (let i in deployed_comps) {
			deployed_comps[i].full_name = deployed_comps[i].display_name;
			if (deployed_comps[i].display_name.length > NAME_MAX_LEN) {
				deployed_comps[i].display_name = deployed_comps[i].display_name.substring(0, NAME_MAX_LEN).trim() + '...';
			}
		}

		return (
			<SidePanel
				id="migration-wizard"
				closed={() => {
					this.props.updateState(SCOPE, {
						openSidePanel: false,
					});
				}}
				ref={sidePanel => (this.sidePanel = sidePanel)}
				buttons={[
					{
						id: 'cancel',
						text: translate('cancel'),
					},
					{
						id: 'open_migration',
						text: translate('start_migration_txt', { estimate: this.props.estimateInMins }),
						onClick: this.onSubmit,
						disabled: !(hasValidFabricVersions && hasValidK8s && passwords_good) || this.props.submitting,
						type: 'submit',
					},
				]}
				error={this.props.error}
				submitting={this.props.submitting}
				warningTxt={valid_preqs ? translate('migration_outage_warning') : ''}
			>
				<div>
					<div className="ibp-modal-title">
						<h1 className="ibm-light">{translate('migration_wiz_title')}</h1>
					</div>

					{migration_check_loader &&
						<p className="checking_text2">{translate('checking_txt')}</p>
					}
					{!migration_check_loader && valid_preqs &&
						<div>
							<p className="checking_text">{translate('checking_txt_valid')}</p>
							<p className="checking_text2">{translate('checking_txt_valid2')}</p>
						</div>
					}

					{migration_check_loader &&
						<Loading withOverlay={false}
							className="migration-button-loading-spinner"
						/>}

					{
						// -------------------- Migration PreReq Errors Here --------------------
					}
					{!migration_check_loader && !valid_preqs &&
						<div>
							<h3>
								{(!hasValidK8s || !hasValidFabricVersions) ? translate('invalid_mig_versions_title') :
									(freeCluster ? translate('invalid_mig_title_free') : translate('invalid_mig_title'))
								}
							</h3>
							<br />
							{!hasValidK8s &&
								<div>
									<p className="errorTxt">{translate('invalid_mig_k8s_version_txt', { type: usingOpenShift ? 'OpenShift' : 'Kubernetes' })}</p>
									<br />
									<p>{translate('invalid_mig_txt')}</p>
								</div>
							}
							{hasValidK8s && freeCluster &&
								<div>
									<p className="errorTxt">{translate('invalid_mig_k8s_free_txt')}</p>
									<br />
									<p>{translate('invalid_mig_txt')}</p>
								</div>
							}
							{!hasValidFabricVersions && hasValidK8s && !freeCluster &&
								<div>
									<p className="errorTxt">{translate('invalid_mig_fab_versions_txt')}</p>
									<br />
									<p>{translate('invalid_mig_txt')}</p>
								</div>
							}
							{!hasIamTokens && hasValidK8s && !freeCluster && hasValidFabricVersions &&
								<div>
									<TranslateLink text="invalid_iam_tokens_txt"
										className="errorTxt"
									/>
									<br />
									<p>{translate('invalid_mig_txt')}</p>
								</div>
							}
						</div>
					}

					{
						// -------------------- Migration Version Error Details here --------------------
					}
					{!migration_check_loader && (!hasValidFabricVersions || !hasValidK8s) &&
						<div className='mig_version_wrap'>
							<h4>{translate('cluster')}</h4>
							<div className='versionRowWrap'>
								<div className='mig_version_label'>
									{translate(usingOpenShift ? 'openshift_txt' : 'migration_node_k8s_version_txt')}
								</div>
								<div className={'mig_version_value ' + (hasValidK8s ? '' : 'invalidVersionText')}>
									{this.props.kubernetes ? this.conform_version(this.props.kubernetes.version) : '-'}
								</div>
								<div className='mig_min_version_value'>
									{translate('migration_required_version_txt',
										{ min: this.props.kubernetes ? this.conform_version(this.props.kubernetes.min_version) : '-' })}
								</div>
								{hasValidK8s &&
									<div className='mig_valid_txt'>
										{translate('migration_version_valid_txt')}
									</div>
								}
							</div>
							<br />

							<h4>{translate('deployed_nodes_title')}</h4>
							{deployed_comps &&
								deployed_comps.map((comp, i) => {
									return (
										<div
											key={'comp_' + i}
											className='versionRowWrap'
										>
											<div
												className='mig_version_label'
												title={comp.full_name}
											>
												{comp.display_name}
											</div>
											<div className={'mig_version_value ' + (comp._migratable ? '' : 'invalidVersionText')}>
												&nbsp;{this.conform_version(comp.version)}
											</div>
											<div className='mig_min_version_value'>
												{translate('migration_required_version_txt', { min: comp._min_version ? this.conform_version(comp._min_version) : '-' })}
											</div>
											{comp._migratable &&
												<div className='mig_valid_txt'>
													{translate('migration_version_valid_txt')}
												</div>
											}
										</div>
									);
								})
							}
							{(!deployed_comps || deployed_comps.length === 0) &&
								<div className='mig_version_label'>
									{translate('migration_nodes_not_found')}
								</div>
							}
						</div>
					}

					{
						// -------------------- Migration Input Wizard Here --------------------
					}
					{!migration_check_loader && valid_preqs &&
						<div>
							<div>
								<p className="ibp-modal-desc">
									{translate('migration_wiz_txt')}
								</p>
								<Form
									scope={SCOPE}
									id="migrationForm"
									fields={[
										{
											name: 'new_console_user',
											required: true,
											tooltip: 'new_console_user_tooltip',
											label: 'new_console_user',
											placeholder: 'new_console_user',
											default: this.props.userData && this.props.userData.loggedInAs ? this.props.userData.loggedInAs.email : '',
											disabled: true,
										},
										{
											name: 'new_console_pass',
											required: true,
											tooltip: 'new_console_pass_tooltip',
											label: 'new_console_pass',
											type: 'password',
											placeholder: 'new_console_pass_placeholder',
											errorMsg: this.props.newPasswordError,
											readonly: this.props.readOnly,	// this is a little hack to prevent browser autofill, flip to false on user click
											onFocus: () => {
												this.props.updateState(SCOPE, {
													readOnly: false,
												});
											}
										},
										{
											name: 'new_console_pass_confirm',
											required: true,
											tooltip: 'new_console_pass_tooltip',
											label: 'new_console_pass_confirm',
											type: 'password',
											placeholder: 'new_console_pass_confirm_placeholder',
											errorMsg: this.props.confirmPasswordError,
											readonly: this.props.readOnly,	// this is a little hack to prevent browser autofill, flip to false on user click
											onFocus: () => {
												this.props.updateState(SCOPE, {
													readOnly: false,
												});
											}
										},
									]}
									onChange={value => this.onPassChange(value)}
								/>

								<div className="ibp-form">
									<div className="ibp-form-field">
										<div className="ibp-advanced-peer-checkboxes-label">
											<label className="ibp-form-label">{translate('advanced_mig_options')}</label>
										</div>

										<div className="ibp-advanced-peer-checkboxes">
											<Checkbox
												id="advanced_migrate"
												key="advanced_mig"
												labelText={translate('mig_option_clean')}
												onChange={() => {
													/*do nothing*/
												}}
												checked={true}
												disabled={true}
											/>
											<BlockchainTooltip direction="top"
												withCheckbox
											>
												{translate('mig_option_clean_tooltip')}
											</BlockchainTooltip>
										</div>
									</div>
								</div>
							</div>
						</div>
					}
				</div>
			</SidePanel>
		);
	}

	// --------------------------------------------------------------------------
	// Delete service instance instructions/warnings
	// --------------------------------------------------------------------------
	renderDeleteContent() {
		const translate = this.props.t;
		return (
			<div>
				<div className="ibp-modal-title twistyContent">
					<p className="infoTitle">
						{translate('migration_cleanup')}
					</p>
					<br />
					<p>{translate('mig_complete_txt')}</p>
					<br />
					<p className="newConsoleWrap leftParagraphMore">
						{translate('mig_complete_txt2')}
						<a href={this.props.newConsoleURL}
							target="_blank"
							rel="noreferrer"
						>
							{this.props.newConsoleURL}
						</a>
					</p>
					<br />
					<p><Trans>{translate('mig_warn_txt')}</Trans></p>
					<br />
					<div className="leftParagraphMore">
						<h4>{translate('mig_exported_wallets')}</h4>
						{this.props.exportedWallets.map((wallet, i) => {
							return (
								<p
									key={'wallet_' + i}
									className="leftParagraph"
								>
									-&nbsp;<span className="checking_text">{wallet.email}</span>&nbsp;-&nbsp;
									<span className="tinyTextWhite">
										{translate('mig_exported_txt')} {new Date(wallet.timestamp).toLocaleDateString()}
									</span>
								</p>
							);
						})}
					</div>
					<br />
					<p>{translate('mig_users_text')}</p>
					<br />
					<p>{translate('mig_test_txt')}</p>
					<br />
					<TranslateLink text="mig_delete_txt" />
				</div>
			</div >
		);
	}
}

const dataProps = {
	showInfo: PropTypes.bool,
	migFeatureFlagEnabled: PropTypes.bool,
	componentList: PropTypes.array,
	overallMigrationStatus: PropTypes.string,
	newConsoleURL: PropTypes.string,
	loading: PropTypes.bool,
	openSidePanel: PropTypes.bool,
	userData: PropTypes.object,
	migration_check_loader: PropTypes.bool,
	newConsolePassword: PropTypes.string,
	newPasswordError: PropTypes.string,
	confirmPasswordError: PropTypes.string,
	newConsolePasswordConfirm: PropTypes.string,
	hasValidK8s: PropTypes.bool,
	hasValidFabricVersions: PropTypes.bool,
	components: PropTypes.array,
	kubernetes: PropTypes.object,
	submitting: PropTypes.bool,
	estimateInMins: PropTypes.number,
	elapsedMs: PropTypes.number,
	settings: PropTypes.object,
	readOnly: PropTypes.bool,
	errorMsg: PropTypes.string,
	steps: PropTypes.array,
	exportedWallets: PropTypes.array,
	migrationAttempted: PropTypes.bool,
};

MigrationPage.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	t: PropTypes.func,
	history: PropTypes.object,
};

export default connect(state => {
	return Helper.mapStateToProps(state[SCOPE], dataProps);
}, {
	updateState,
	showBreadcrumb
})(withTranslation()(withRouter(MigrationPage)));
