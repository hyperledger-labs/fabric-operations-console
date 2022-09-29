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
import { Button, NumberInputSkeleton, ToggleSmall } from 'carbon-components-react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { clearNotifications, showBreadcrumb, showError, updateState, showSuccess } from '../../redux/commonActions';
import SettingsApi from '../../rest/SettingsApi';
import ActionsHelper from '../../utils/actionsHelper';
import Helper from '../../utils/helper';
import BlockchainTooltip from '../BlockchainTooltip/BlockchainTooltip';
import ExportModal from '../ExportModal/ExportModal';
import Form from '../Form/Form';
import ImportModal from '../ImportModal/ImportModal';
import Logger from '../Log/Logger';
import PageContainer from '../PageContainer/PageContainer';
import PageHeader from '../PageHeader/PageHeader';
import DropdownSkeleton from 'carbon-components-react/lib/components/Dropdown/Dropdown.Skeleton';
import ToggleSmallSkeleton from 'carbon-components-react/lib/components/ToggleSmall/ToggleSmall.Skeleton';

const SCOPE = 'comp_settings';
const Log = new Logger(SCOPE);

const server_levels = ['error', 'warn', 'info', 'verbose', 'debug', 'silly'];
const client_levels = ['error', 'warn', 'info', 'debug'];

const MINIMUM_MAX_IDLE_TIME = Math.floor(30);
const MAXIMUM_MAX_IDLE_TIME = Math.floor(8 * 60 * 60);
let progressInterval = null;
let giveUpTimer = null;

export class Settings extends Component {
	componentDidMount() {
		this.props.showBreadcrumb('settings', {}, this.props.history.location.pathname, true);
		this.props.updateState(SCOPE, {
			showExportModal: window.location.pathname === '/export-identities',
			showImportModal: false,
			client_log_enabled: false,
			server_log_enabled: false,
			client_log_level: client_levels[0],
			server_log_level: server_levels[0],
			max_idle_time_enabled: false,
			max_idle_time: MAXIMUM_MAX_IDLE_TIME,
			changed: {},
			loading: true,
			saving: false,
		});
		this.getSettings();
	}

	getSettings(afterRestart) {
		SettingsApi.getSettings()
			.then(settings => {
				clearInterval(progressInterval);
				clearTimeout(giveUpTimer);
				this.props.updateState(SCOPE, {
					width: 0,							// reset progress bar
					saving: false,						// hide progress bar
				});

				const hide_transaction_input = !!_.get(settings, 'TRANSACTION_VISIBILITY.hide_input');
				const hide_transaction_output = !!_.get(settings, 'TRANSACTION_VISIBILITY.hide_output');
				const client_log_enabled = _.get(settings, 'FILE_LOGGING.client.enabled');
				const server_log_enabled = _.get(settings, 'FILE_LOGGING.server.enabled');
				const client_log_level = _.get(settings, 'FILE_LOGGING.client.level') || client_levels[0];
				const server_log_level = _.get(settings, 'FILE_LOGGING.server.level') || server_levels[0];
				const max_idle_time_enabled = _.get(settings, 'INACTIVITY_TIMEOUTS.enabled');
				const max_idle_time = _.get(settings, 'INACTIVITY_TIMEOUTS.max_idle_time') / 1000 || MAXIMUM_MAX_IDLE_TIME;
				this.props.updateState(SCOPE, {
					loading: false,
					hide_transaction_input,
					hide_transaction_output,
					client_log_enabled,
					server_log_enabled,
					client_log_level,
					server_log_level,
					max_idle_time_enabled,
					max_idle_time,
					changed: {},
				});
			})
			.catch(error => {
				if (afterRestart) {
					// keep waiting for restart
				} else {
					Log.error(error);
					this.props.showError('error_getting_settings', {}, SCOPE);
					this.props.updateState(SCOPE, { loading: false });
				}
			});
	}

	componentWillUnmount() {
		this.props.clearNotifications(SCOPE);
	}

	saveSettings = () => {
		const data = {};
		let changed = false;
		if (this.props.changed.client_log_enabled || this.props.changed.client_log_level) {
			data.file_logging = {
				client: {
					enabled: this.props.client_log_enabled,
					level: this.props.client_log_level.id,
				},
			};
			changed = true;
		}
		if (this.props.changed.server_log_enabled || this.props.changed.server_log_level) {
			if (!data.file_logging) {
				data.file_logging = {};
			}
			data.file_logging.server = {
				enabled: this.props.server_log_enabled,
				level: this.props.server_log_level.id,
			};
			changed = true;
		}
		if (this.props.changed.max_idle_time_enabled || this.props.changed.max_idle_time) {
			data.inactivity_timeouts = {
				enabled: this.props.max_idle_time_enabled,
				max_idle_time: Math.floor(this.props.max_idle_time * 1000),
			};
			changed = true;
		}
		if (this.props.changed.hide_transaction_input || this.props.changed.hide_transaction_output) {
			data.transaction_visibility = {
				hide_input: this.props.hide_transaction_input,
				hide_output: this.props.hide_transaction_output,
			};
			changed = true;
		}
		return new Promise((resolve, reject) => {
			if (changed) {
				this.props.updateState(SCOPE, {
					saving: true,							// show progress bar
					width: 10,
				});
				clearInterval(progressInterval);
				progressInterval = setInterval(() => {
					let width = isNaN(this.props.width) ? 0 : (this.props.width + (2 + Math.random() * 10));
					if (width > 95) { width = 95; }			// hang at 95 until done
					this.props.updateState(SCOPE, {
						width: Math.round(width),
					});
					this.getSettings(true);
				}, 1400);

				clearTimeout(giveUpTimer);
				giveUpTimer = setTimeout(() => {
					clearInterval(progressInterval);
					this.props.updateState(SCOPE, {
						width: 0,							// reset progress bar
						saving: false,						// hide progress bar
					});
				}, 1000 * 60 * 2);							// after 2 minutes give up

				SettingsApi.updateSettings(data)
					.then(() => {
						if (this.props.changed.client_log_level) {
							Log.setLogLevel(this.props.client_log_level.id);
						}
						this.props.updateState(SCOPE, {
							changed: {},
						});
						this.props.showSuccess('save_settings_success', {}, SCOPE, 'save_settings_details');
						resolve();
					})
					.catch(error => {
						Log.error(error);
						this.props.showError('error_updating_settings', {}, SCOPE);
						reject(error);
					});
			} else {
				this.props.showSuccess('save_settings_success', {}, SCOPE, 'save_settings_details');
				resolve();
			}
		});
	};

	renderTransactionData(translate) {
		if (!_.get(this.props, 'settings.FEATURE_FLAGS.hide_transaction_data')) {
			// check if hiding transaction data is supported
			return;
		}
		if (!this.props.isAdmin) {
			// only show option if admin
			return;
		}
		return (
			<div className="settings-section">
				<h3 className="settings-label">{translate('transaction_data')}</h3>
				<div className="transaction-data">
					<div className="transaction-data-block">
						<div className="settings-toggle">
							<h4 className="settings-toggle-label">{translate('input')}</h4>
							<div className="settings-toggle-inner">
								{this.props.loading && <ToggleSmallSkeleton />}
								{!this.props.loading && (
									<ToggleSmall
										id="toggle-input"
										toggled={!this.props.hide_transaction_input}
										onToggle={() => {
											this.props.updateState(SCOPE, {
												hide_transaction_input: !this.props.hide_transaction_input,
												changed: {
													...this.props.changed,
													hide_transaction_input: true,
												},
											});
										}}
										onChange={() => { }}
										aria-label={translate('input')}
										labelA={translate('visible')}
										labelB={translate('hidden')}
									/>
								)}
							</div>
						</div>
					</div>
					<div className="transaction-data-block">
						<div className="settings-toggle">
							<h4 className="settings-toggle-label">{translate('output')}</h4>
							<div className="settings-toggle-inner">
								{this.props.loading && <ToggleSmallSkeleton />}
								{!this.props.loading && (
									<ToggleSmall
										id="toggle-output"
										toggled={!this.props.hide_transaction_output}
										onToggle={() => {
											this.props.updateState(SCOPE, {
												hide_transaction_output: !this.props.hide_transaction_output,
												changed: {
													...this.props.changed,
													hide_transaction_output: true,
												},
											});
										}}
										onChange={() => { }}
										aria-label={translate('output')}
										labelA={translate('visible')}
										labelB={translate('hidden')}
									/>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	buildLoggingLevels(levels, translate) {
		const options = [];
		levels.forEach(level => {
			options.push({
				id: level,
				name: translate(level),
			});
		});
		return options;
	}

	renderLogging(translate) {
		return (
			<div>
				<div className="settings-section">
					<h3 className="settings-label">
						<BlockchainTooltip direction="right"
							triggerText={translate('client_logging')}
						>
							{translate('client_logging_tooltip')}
						</BlockchainTooltip>
					</h3>
					<div className="settings-item-container">
						<div className="settings-toggle">
							<h4 className="settings-toggle-label">{translate('log_to_file')}</h4>
							{this.props.loading && <ToggleSmallSkeleton />}
							{!this.props.loading && (
								<div className="settings-toggle-inner">
									<ToggleSmall
										id="toggle-client-logging"
										toggled={this.props.client_log_enabled}
										onToggle={() => {
											this.props.updateState(SCOPE, {
												client_log_enabled: !this.props.client_log_enabled,
												changed: {
													...this.props.changed,
													client_log_enabled: true,
												},
											});
										}}
										onChange={() => { }}
										aria-label={translate('client_logging')}
										disabled={!this.props.isAdmin}
										labelA={translate('off')}
										labelB={translate('on')}
									/>
								</div>
							)}
						</div>
						<div className="settings-dropdown-container">
							{this.props.loading && <DropdownSkeleton style={{ height: '5.625rem' }} />}
							{!this.props.loading && (
								<Form
									scope={SCOPE}
									fields={[
										{
											name: 'client_log_level',
											type: 'dropdown',
											options: !this.props.isAdmin ? [] : this.buildLoggingLevels(client_levels, translate),
											skipLabel: true,
											default: this.props.client_log_level || client_levels[0],
											disabled: !this.props.isAdmin,
										},
									]}
									id={SCOPE + '-client'}
									onChange={() => {
										this.props.updateState(SCOPE, {
											changed: {
												...this.props.changed,
												client_log_level: true,
											},
										});
									}}
								/>
							)}
						</div>
					</div>
				</div>
				<div className="settings-section">
					<h3 className="settings-label">
						<BlockchainTooltip direction="right"
							triggerText={translate('server_logging')}
						>
							{translate('server_logging_tooltip')}
						</BlockchainTooltip>
					</h3>
					<div className="settings-item-container">
						<div className="settings-toggle">
							<h4 className="settings-toggle-label">{translate('log_to_file')}</h4>
							{this.props.loading && <ToggleSmallSkeleton />}
							{!this.props.loading && (
								<div className="settings-toggle-inner">
									<ToggleSmall
										id="toggle-server-logging"
										toggled={this.props.server_log_enabled}
										onToggle={() => {
											this.props.updateState(SCOPE, {
												server_log_enabled: !this.props.server_log_enabled,
												changed: {
													...this.props.changed,
													server_log_enabled: true,
												},
											});
										}}
										onChange={() => { }}
										aria-label={translate('server_logging')}
										disabled={!this.props.isAdmin}
										labelA={translate('off')}
										labelB={translate('on')}
									/>
								</div>
							)}
						</div>
						<div className="settings-dropdown-container">
							{this.props.loading && <DropdownSkeleton style={{ height: '5.625rem' }} />}
							{!this.props.loading && (
								<Form
									scope={SCOPE}
									fields={[
										{
											name: 'server_log_level',
											type: 'dropdown',
											options: !this.props.isAdmin ? [] : this.buildLoggingLevels(server_levels, translate),
											skipLabel: true,
											default: this.props.server_log_level || server_levels[0],
											disabled: !this.props.isAdmin,
										},
									]}
									id={SCOPE + '-server'}
									onChange={() => {
										this.props.updateState(SCOPE, {
											changed: {
												...this.props.changed,
												server_log_level: true,
											},
										});
									}}
								/>
							)}
						</div>
					</div>
				</div>
			</div>
		);
	}

	renderInactivityTimeouts(translate) {
		return (
			<div>
				<div className="settings-section">
					<h3 className="settings-label">
						<BlockchainTooltip direction="right"
							triggerText={translate('user_inactivity_settings')}
						>
							{translate('user_inactivity_tooltip')}
						</BlockchainTooltip>
					</h3>
					<div className="settings-item-container">
						<div className="settings-toggle">
							<h4 className="settings-toggle-label">{translate('inactivity_timeout')}</h4>
							{this.props.loading && <ToggleSmallSkeleton />}
							{!this.props.loading && (
								<div className="settings-toggle-inner">
									<ToggleSmall
										id="toggle-inactivity-timeouts"
										toggled={this.props.max_idle_time_enabled}
										onToggle={() => {
											this.props.updateState(SCOPE, {
												max_idle_time_enabled: !this.props.max_idle_time_enabled,
												changed: {
													...this.props.changed,
													max_idle_time_enabled: true,
												},
											});
										}}
										onChange={() => { }}
										aria-label={translate('inactivity_timeout')}
										disabled={!this.props.isAdmin}
										labelA={translate('off')}
										labelB={translate('on')}
									/>
								</div>
							)}
						</div>
						<div className="settings-dropdown-container">
							{this.props.loading && <NumberInputSkeleton style={{ height: '5.625rem' }} />}
							{!this.props.loading && (
								<Form
									scope={SCOPE}
									fields={[
										{
											name: 'max_idle_time',
											type: 'number',
											label: translate('max_idle_time'),
											default: Math.floor(this.props.max_idle_time),
											disabled: !this.props.isAdmin || !this.props.max_idle_time_enabled,
											allowEmpty: false,
											min: MINIMUM_MAX_IDLE_TIME,
											max: MAXIMUM_MAX_IDLE_TIME,
											placeholder: '  ',
											required: true,
											tooltip: 'max_idle_time_tooltip',
										},
									]}
									id={SCOPE + '-inactivity-timeout'}
									onChange={() => {
										this.props.updateState(SCOPE, {
											changed: {
												...this.props.changed,
												max_idle_time: true,
											},
										});
									}}
								/>
							)}
						</div>
					</div>
				</div>
			</div>
		);
	}

	renderDataManagement(translate) {
		return (
			<div className="ibp-settings-bulk-data-container">
				<div className="settings-section">
					<h3 className="settings-label">
						<BlockchainTooltip direction="right"
							triggerText={translate('data_management')}
						>
							{translate('data_management_tooltip')}
						</BlockchainTooltip>
					</h3>
					<div className="settings-button-container">
						<Button
							id="data_export_button"
							disabled={this.props.saving}
							onClick={() => {
								this.props.updateState(SCOPE, { showExportModal: true });
							}}
						>
							{translate('export')}
						</Button>
						{ActionsHelper.canImportComponent(this.props.userInfo) && (
							<Button
								id="data_import_button"
								disabled={this.props.saving}
								onClick={() => {
									this.props.updateState(SCOPE, { showImportModal: true });
								}}
							>
								{translate('import')}
							</Button>
						)}
					</div>
				</div>
				{this.props.showExportModal && (
					<ExportModal
						history={this.props.history}
						onComplete={() => {
							// should we tell user export is complete?
						}}
						onClose={() => {
							this.props.updateState(SCOPE, { showExportModal: false });
						}}
					/>
				)}
				{this.props.showImportModal && (
					<ImportModal
						onComplete={() => {
							// should we tell user import is complete?
						}}
						onClose={() => {
							this.props.updateState(SCOPE, { showImportModal: false });
						}}
					/>
				)}
			</div>
		);
	}

	render = () => {
		const translate = this.props.translate;
		const progress_width = isNaN(this.props.width) ? 0 : this.props.width;
		return (
			<PageContainer>
				<div className="bx--row">
					<div className="bx--col-lg-13">
						<PageHeader
							history={this.props.history}
							headerName="settings"
							staticHeader
						/>
						<div>
							{this.renderTransactionData(translate)}
							{this.renderLogging(translate)}
							{this.renderInactivityTimeouts(translate)}
							<div>
								<Button id="save_settings"
									className="ibp-save-changes"
									onClick={this.saveSettings}
									disabled={!this.props.isAdmin || this.props.saving}
								>
									{translate('save_changes')}
								</Button>
								{this.props.saving && (<div>
									{translate('restarting')}
									<div id="ibp-progress-bar-wrap">
										<div id="ibp-progress-bar"
											style={{
												width: progress_width + '%'
											}}
										/>
									</div>
								</div>)}
							</div>
							{this.renderDataManagement(translate)}
						</div>
					</div>
				</div>
			</PageContainer>
		);
	};
}

const dataProps = {
	loading: PropTypes.bool,
	saving: PropTypes.bool,
	hide_transaction_input: PropTypes.bool,
	hide_transaction_output: PropTypes.bool,
	showExportModal: PropTypes.bool,
	showImportModal: PropTypes.bool,
	client_log_enabled: PropTypes.bool,
	server_log_enabled: PropTypes.bool,
	client_log_level: PropTypes.string,
	server_log_level: PropTypes.string,
	max_idle_time_enabled: PropTypes.bool,
	max_idle_time: PropTypes.number,
	width: PropTypes.number,
	changed: PropTypes.object,
};

Settings.propTypes = {
	...dataProps,
	showSuccess: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['isAdmin'] = state['settings'].isAdmin;
		newProps['userInfo'] = state['userInfo'] ? state['userInfo'] : null;
		return newProps;
	},
	{
		clearNotifications,
		showBreadcrumb,
		showError,
		updateState,
		showSuccess,
	}
)(withLocalize(Settings));
