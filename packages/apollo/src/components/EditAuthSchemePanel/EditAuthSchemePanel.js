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
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { clearNotifications, showError, updateState } from '../../redux/commonActions';
import SettingsApi from '../../rest/SettingsApi';
import Helper from '../../utils/helper';
import Form from '../Form/Form';
//import Logger from '../Log/Logger';
import Wizard from '../Wizard/Wizard';
import WizardStep from '../WizardStep/WizardStep';
import { ToggleSmall } from 'carbon-components-react';
import SidePanelWarning from '../SidePanelWarning/SidePanelWarning';
import * as constants from '../../utils/constants';
import BlockchainTooltip from '../BlockchainTooltip/BlockchainTooltip';
import LoginApi from '../../rest/LoginApi';
import TranslateLink from '../TranslateLink/TranslateLink';

const SCOPE = 'editSettings';
//const Log = new Logger(SCOPE);

class EditAuthSchemePanel extends Component {
	cName = 'EditAuthSchemePanel';
	defaultAuth = constants.AUTH_COUCHDB;

	async componentDidMount() {
		this.props.updateState(SCOPE, {
			submitting: false,
			loading: true,
			settings: {},
			readOnly: true,
		});

		const settings = await SettingsApi.getSettings();
		const privateSettings = await SettingsApi.getPrivateSettings();
		this.props.updateState(SCOPE, {
			settings: settings,
			privateSettings: privateSettings,
			loading: false,
			debug: (privateSettings && privateSettings.OAUTH && privateSettings.OAUTH.DEBUG) ? 'on' : 'off',
			allowDefault: (privateSettings && privateSettings.ALLOW_DEFAULT_PASSWORD) ? true : false,
		});
	}

	// submit the new settings using settings api
	onSubmit = async () => {
		const newAuthScheme = this.props.auth_scheme ? this.props.auth_scheme.value : null;
		if (newAuthScheme === constants.AUTH_OAUTH) {
			const newSettings = {
				auth_scheme: newAuthScheme,
				oauth: {
					authorization_url: this.props.authorization_url,
					token_url: this.props.token_url,
					client_id: this.props.client_id,
					client_secret: this.props.client_secret,
					scope: this.props.scope2,
					debug: (this.props.debug === 'on') ? true : false
				}
			};
			try {
				await SettingsApi.updateSettings(newSettings);
				this.props.onComplete(constants.AUTH_OAUTH);
			} catch (e) {
				console.error('unable to submit oauth settings, e:', e);
				throw { title: 'Unable to save settings', details: (e && e.msgs) ? e.msgs.join('\n') : '' };
			}
		} else if (newAuthScheme === constants.AUTH_COUCHDB) {
			const newSettings = {
				auth_scheme: newAuthScheme,
				default_user_password: this.props.default_password,
				allow_default_password: this.props.allowDefault,
			};
			try {
				await SettingsApi.updateSettings(newSettings);
				this.props.onComplete(constants.AUTH_COUCHDB);
			} catch (e) {
				console.error('unable to submit couchdb settings, e:', e);
				throw { title: 'Unable to save settings', details: (e && e.msgs) ? e.msgs.join('\n') : '' };
			}
		}
	};

	// debounce the new-password input field as it is entered
	onPassChange(value) {
		clearTimeout(this.debounce);
		this.debounce = setTimeout(() => {
			this.onPasswordChangeFormChangeDebounced(value);
		}, 200);
	}

	// test new password's strength as it is entered
	async onPasswordChangeFormChangeDebounced(value) {
		if (value.default_password) {
			try {
				await LoginApi.testPasswordStr(value.default_password);
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
		} else if (value.confirm_default_password) {
			this.validate_confirm();
		}
	}

	// check if confirmation password input matches new password input
	validate_confirm = () => {
		const newPassword = this.props.default_password;
		this.props.updateState(SCOPE, {
			confirmPasswordError: (newPassword && newPassword === this.props.confirm_default_password) ? '' : 'passwords_do_not_match',
		});
	}

	// detect if any changes have been made to auth settings
	authSettingsAreSame = () => {
		let existingOauthSettings, newOauthSettings;
		if (this.props.privateSettings && this.props.privateSettings.OAUTH) {
			existingOauthSettings = {
				authorization_url: this.props.privateSettings.OAUTH.AUTHORIZATION_URL,
				token_url: this.props.privateSettings.OAUTH.TOKEN_URL,
				client_id: this.props.privateSettings.OAUTH.CLIENT_ID,
				client_secret: this.props.privateSettings.OAUTH.CLIENT_SECRET,
				scope: this.props.privateSettings.OAUTH.SCOPE,
				debug: this.props.privateSettings.OAUTH.DEBUG,
			};
			newOauthSettings = {
				authorization_url: this.props.authorization_url,
				token_url: this.props.token_url,
				client_id: this.props.client_id,
				client_secret: this.props.client_secret,
				scope: this.props.scope2,
				debug: (this.props.debug === 'on') ? true : false,
			};
		}

		// if oauth was selected, check oauth settings
		if (this.props.auth_scheme && this.props.settings) {
			if (this.props.auth_scheme.value === constants.AUTH_OAUTH) {
				return (
					this.props.settings.AUTH_SCHEME === this.props.auth_scheme.value &&
					JSON.stringify(newOauthSettings) === JSON.stringify(existingOauthSettings)
				);
			} else if (this.props.auth_scheme.value === constants.AUTH_COUCHDB) {
				return false;	// return false always to let user change resubmit couchdb settings even if they are the same
			} else {
				return this.props.settings.AUTH_SCHEME === this.props.auth_scheme.value;
			}
		}
		return true;
	}

	// detect if required fields are set and valid
	requiredFieldsAreValid = () => {
		if (this.props.auth_scheme) {
			if (this.props.auth_scheme.value === constants.AUTH_OAUTH) {
				return this.props.authorization_url && this.props.token_url && this.props.client_id && this.props.client_secret && this.props.scope2;
			} else if (this.props.auth_scheme.value === constants.AUTH_COUCHDB) {
				return (
					this.props.default_password && this.props.confirm_default_password &&
					this.props.default_password === this.props.confirm_default_password &&
					this.props.newPasswordError === '' && this.props.confirmPasswordError === ''
				);
			}
		}
		return false;
	}

	// render the auth scheme side panel wizard
	renderUpdateConfiguration(translate) {
		if (this.props.loading || !this.props.settings) {
			return;
		}
		let settings = this.props.settings || {};
		let private_settings = this.props.privateSettings || {};
		let currentAuthScheme = settings.AUTH_SCHEME || this.defaultAuth;

		let fields = [
			{
				name: 'auth_scheme',
				label: 'auth_scheme_label',
				required: true,
				default: currentAuthScheme,
				type: 'dropdown',
				format: 'object',
				options: [{
					name: 'CouchDB' + ((currentAuthScheme === constants.AUTH_COUCHDB) ? ' (current)' : ''),
					value: constants.AUTH_COUCHDB
				},
				{
					name: 'OAuth2.0' + ((currentAuthScheme === constants.AUTH_OAUTH) ? ' (current)' : ''),
					value: constants.AUTH_OAUTH
				}]
			},
		];

		let descriptionMap = {
			'oauth': 'oauth_desc_txt',
			'couchdb': 'couchdb_desc_txt',
		};
		let warningMap = {
			'oauth': 'oauth_warning_txt',
			'couchdb': 'couchdb_warning_txt'
		};
		let nameMap = {
			'oauth': 'OAuth2.0 Settings:',
			'couchdb': 'CouchDB Settings:'
		};

		return (
			<WizardStep type="WizardStep"
				disableSubmit={this.authSettingsAreSame() || !this.requiredFieldsAreValid()}
			>
				<div className="ibp-edit-auth-settings">
					<div>
						<Form scope={SCOPE}
							id={SCOPE}
							fields={fields}
						/>

						{this.props.auth_scheme && this.props.auth_scheme.value && <div>
							<br />
							<p className='tinyText'>
								{translate(descriptionMap[this.props.auth_scheme.value])}
							</p>

							{this.props.auth_scheme && this.props.auth_scheme.value === constants.AUTH_OAUTH &&
								<div>
									<SidePanelWarning title="callback_warning_title"
										subtitle="callback_warning_desc"
										data={{ CALLBACK: settings.HOST_URL + settings.LOGIN_URI }}
									/>

									<SidePanelWarning title="oauth_warning_title"
										subtitle="oauth_warning_desc"
									/>

									<SidePanelWarning title="oauth_user_warning_title"
										subtitle="oauth_user_warning_desc"
									/>
								</div>}
							<br />
							<br />
							<h4>
								{nameMap[this.props.auth_scheme.value]}
							</h4>
							<p>
								<TranslateLink className='tinyText'
									text={warningMap[this.props.auth_scheme.value]}
								/>
							</p>
							<br />
						</div>}

						{/*OAuth2.0 settings here */}
						{this.props.auth_scheme && this.props.auth_scheme.value === constants.AUTH_OAUTH &&
							<div>
								<Form scope={SCOPE}
									id='oauth-form'
									fields={[
										{
											name: 'authorization_url',
											label: 'authorization_url_label',
											required: true,
											tooltip: 'authorization_url_tooltip',
											placeholder: 'authorization_url_placeholder',
											type: 'text',
											default: (private_settings && private_settings.OAUTH) ? private_settings.OAUTH.AUTHORIZATION_URL : '' || undefined
										},
										{
											name: 'token_url',
											label: 'token_url_label',
											required: true,
											tooltip: 'token_url_tooltip',
											placeholder: 'token_url_placeholder',
											type: 'text',
											default: (private_settings && private_settings.OAUTH) ? private_settings.OAUTH.TOKEN_URL : '' || undefined
										},
										{
											name: 'client_id',
											label: 'client_id_label',
											required: true,
											tooltip: 'client_id_tooltip',
											placeholder: 'client_id_placeholder',
											type: 'text',
											default: (private_settings && private_settings.OAUTH) ? private_settings.OAUTH.CLIENT_ID : '' || undefined
										},
										{
											name: 'client_secret',
											label: 'client_secret_label',
											required: true,
											tooltip: 'client_secret_tooltip',
											placeholder: 'client_secret_placeholder',
											type: 'password',
											default: (private_settings && private_settings.OAUTH) ? private_settings.OAUTH.CLIENT_SECRET : '' || undefined
										},
										{
											name: 'scope2',
											label: 'scope_label',
											required: true,
											tooltip: 'scope_tooltip',
											placeholder: 'scope_placeholder',
											type: 'text',
											default: (private_settings && private_settings.OAUTH) ? private_settings.OAUTH.SCOPE : '' || 'openid email profile'

										},
										{
											name: 'grant',
											label: 'grant_label',
											required: true,
											tooltip: 'grant_tooltip',
											placeholder: 'grant_tooltip',
											type: 'text',
											default: 'authorization_code',
											readonly: true,
										},
										{
											name: 'response_type',
											label: 'response_type_label',
											required: true,
											tooltip: 'response_type_tooltip',
											placeholder: 'response_type_tooltip',
											type: 'text',
											default: 'code',
											readonly: true,
										},
									]}
								/>
								<BlockchainTooltip direction="right"
									triggerText={translate('debug_label')}
									className='allow-default-label'
								>
									{translate('debug_logs_tooltip')}
								</BlockchainTooltip>
								<ToggleSmall
									id="toggle-debug-access-logs"
									toggled={this.props.debug === 'on'}
									onToggle={() => {
										this.props.updateState(SCOPE, {
											debug: (this.props.debug === 'on') ? 'off' : 'on',
										});
									}}
									labelA={translate('off')}
									labelB={translate('on')}
									aria-label={translate('debug_label')}
									className='allow-default-wrap'
								/>
							</div>
						}

						{/*CouchDB settings here */}
						{this.props.auth_scheme && this.props.auth_scheme.value === constants.AUTH_COUCHDB &&
							<div>
								<Form scope={SCOPE}
									id='oauth-form'
									fields={[
										{
											name: 'default_password',
											label: 'default_password_label',
											required: true,
											tooltip: 'default_password_tooltip',
											placeholder: 'default_password_placeholder',
											errorMsg: this.props.newPasswordError,
											type: 'password',
											readonly: this.props.readOnly,	// this is a little hack to prevent browser autofill, flip to false on user click
											onFocus: () => {
												this.props.updateState(SCOPE, {
													readOnly: false,
												});
											}
										},
										{
											name: 'confirm_default_password',
											label: 'confirm_default_password_label',
											required: true,
											placeholder: 'default_password_placeholder',
											errorMsg: this.props.confirmPasswordError,
											type: 'password',
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
								<BlockchainTooltip direction="right"
									triggerText={translate('allow_default_keep_label')}
									className='allow-default-label'
								>
									{translate('allow_default_keep_tooltip')}
								</BlockchainTooltip>
								<ToggleSmall
									id="toggle-allow-default-access"
									toggled={this.props.allowDefault}
									onToggle={() => {
										this.props.updateState(SCOPE, {
											allowDefault: !this.props.allowDefault,
										});
									}}
									labelA={translate('disabled')}
									labelB={translate('enabled')}
									aria-label={translate('allow_default_keep_label')}
									className='allow-default-wrap'
								/>
							</div>}
					</div>
				</div>
			</WizardStep>
		);
	}

	renderUpdateSummary(translate) {
		if (this.props.loading || !this.props.settings) {
			return;
		}

		return (
			<WizardStep
				type="WizardStep"
				title={translate('summary')}
				disableSubmit={!this.requiredFieldsAreValid()}
			>
				<div>
					{Helper.renderFieldSummary(translate, this.props.auth_scheme, 'authentication_services', 'value')}

					{this.props.auth_scheme && this.props.auth_scheme.value === constants.AUTH_OAUTH && <div>
						{Helper.renderFieldSummary(translate, this.props, 'authorization_url_label', 'authorization_url')}
						{Helper.renderFieldSummary(translate, this.props, 'token_url_label', 'token_url')}
						{Helper.renderFieldSummary(translate, this.props, 'client_id_label', 'client_id')}
						{Helper.renderFieldSummary(translate, this.props, 'client_secret_label', 'client_secret', true)}
						{Helper.renderFieldSummary(translate, this.props, 'scope_label', 'scope2')}
						{Helper.renderFieldSummary(translate, this.props, 'debug_label', 'debug')}
					</div>}

					{this.props.auth_scheme && this.props.auth_scheme.value === constants.AUTH_COUCHDB && <div>
						{Helper.renderFieldSummary(translate, this.props, 'default_password_label', 'default_password', true)}
						{Helper.renderFieldSummary(translate, this.props, 'allow_default_keep_label', 'allowDefault')}
					</div>}
				</div>
			</WizardStep>
		);
	}

	render() {
		const translate = this.props.t;
		return (
			<Wizard
				title='update_configuration'
				onClose={this.props.onClose}
				onSubmit={this.onSubmit}
				loading={this.props.loading}
			>
				<p className="ibp-modal-desc">
					{translate('edit_auth_scheme_desc')}
				</p>
				{this.renderUpdateConfiguration(translate)}
				{this.renderUpdateSummary(translate)}
			</Wizard>
		);
	}
}

const dataProps = {
	loading: PropTypes.bool,
	submitting: PropTypes.bool,
	debug: PropTypes.string,
	settings: PropTypes.object,
	privateSettings: PropTypes.object,

	auth_scheme: PropTypes.object,
	authorization_url: PropTypes.string,
	token_url: PropTypes.string,
	client_id: PropTypes.string,
	client_secret: PropTypes.string,
	scope2: PropTypes.string,

	default_password: PropTypes.string,
	confirm_default_password: PropTypes.string,
	allowDefault: PropTypes.bool,
	readOnly: PropTypes.bool,
	newPasswordError: PropTypes.string,
	confirmPasswordError: PropTypes.string,
};

EditAuthSchemePanel.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
	showError: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		clearNotifications,
		showError,
		updateState,
	}
)(withTranslation()(EditAuthSchemePanel));
