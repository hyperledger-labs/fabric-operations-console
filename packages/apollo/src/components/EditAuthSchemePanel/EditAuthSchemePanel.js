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
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { clearNotifications, showError, updateState } from '../../redux/commonActions';
import SettingsApi from '../../rest/SettingsApi';
import Helper from '../../utils/helper';
import Form from '../Form/Form';
import Logger from '../Log/Logger';
import Wizard from '../Wizard/Wizard';
import WizardStep from '../WizardStep/WizardStep';
import { ToggleSmall } from 'carbon-components-react';
import SidePanelWarning from '../SidePanelWarning/SidePanelWarning';

const SCOPE = 'editSettings';
const Log = new Logger(SCOPE);

class EditAuthSchemePanel extends Component {
	cName = 'EditAuthSchemePanel';

	async componentDidMount() {
		this.props.updateState(SCOPE, {
			submitting: false,
			loading: true,
			settings: {},
		});

		const settings = await SettingsApi.getSettings();
		const privateSettings = await SettingsApi.getPrivateSettings();
		console.log('dsh99 settings', settings);
		this.props.updateState(SCOPE, {
			settings: settings,
			privateSettings: privateSettings,
			loading: false,
			debug: 'off',
		});
	}

	// submit the new settings using settings api
	onSubmit = async () => {
		const newAuthScheme = this.props.auth_scheme ? this.props.auth_scheme.value : null;
		console.log('dsh99 sub newAuthScheme:', newAuthScheme);
		if (newAuthScheme === 'oauth') {
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
			console.log('dsh99 sub newSettings:', newSettings);
			try {
				//await SettingsApi.updateSettings(newSettings);
			} catch (e) {
				console.error('unable to submit oauth settings, e:', e);
			}
		} else if (newAuthScheme === 'couchdb') {
			try {
				await SettingsApi.updateSettings({ auth_scheme: newAuthScheme });
			} catch (e) {
				console.error('unable to submit couchdb settings, e:', e);
			}
		}
	};

	// the auth scheme dropdown selection changed
	/*onChangeFormFields = (data) => {
		console.log('dsh99 scheme change detected', data);
		if (data && data.auth_scheme) {
			this.props.updateState(SCOPE, {
				selectedScheme: data.auth_scheme.value,
			});
		}
	}*/

	// an oauth input field was changed
	/*onChangeOauthFields = (data) => {
		console.log('dsh99 authorization_url', this.props.authorization_url);
	}*/

	// detect if any changes have been made to auth settings
	oauthSettingsAreSame = () => {
		let existingOauthSettings, newOauthSettings;
		if (this.props.privateSettings && this.props.privateSettings.OAUTH) {
			existingOauthSettings = {
				authorization_url: this.props.privateSettings.OAUTH.AUTHORIZATION_URL,
				token_url: this.props.privateSettings.OAUTH.TOKEN_URL,
				client_id: this.props.privateSettings.OAUTH.CLIENT_ID,
				client_secret: this.props.privateSettings.OAUTH.CLIENT_SECRET,
				scope: this.props.privateSettings.OAUTH.SCOPE,
			};
			newOauthSettings = {
				authorization_url: this.props.authorization_url,
				token_url: this.props.token_url,
				client_id: this.props.client_id,
				client_secret: this.props.client_secret,
				scope: this.props.scope2,
			};
		}

		// if oauth was selected, check oauth settings
		if (this.props.auth_scheme && this.props.settings) {
			console.log('dsh99 current', this.props.settings.AUTH_SCHEME, 'selected', this.props.auth_scheme);
			if (this.props.auth_scheme.value === 'oauth') {
				return (JSON.stringify(newOauthSettings) === JSON.stringify(existingOauthSettings) && this.props.settings.AUTH_SCHEME === this.props.auth_scheme.value);
			} else {
				return (this.props.settings.AUTH_SCHEME === this.props.auth_scheme.value);
			}
		}
	}

	// render the auth scheme side panel wizard
	renderUpdateConfiguration(translate) {
		if (this.props.loading || !this.props.settings) {
			return;
		}
		let settings = this.props.settings || {};
		let private_settings = this.props.privateSettings || {};
		let currentAuthScheme = settings.AUTH_SCHEME || 'couchdb';

		let fields = [
			{
				name: 'auth_scheme',
				label: 'auth_scheme_label',
				required: true,
				//tooltip: 'admin_contact_email_tooltip',
				default: currentAuthScheme,
				type: 'dropdown',
				options: [{
					name: 'CouchDB' + ((currentAuthScheme === 'couchdb') ? ' (current)' : ''),
					value: 'couchdb'
				},
				{
					name: 'OAuth2.0' + ((currentAuthScheme === 'oauth') ? ' (current)' : ''),
					value: 'oauth'
				}]
			},
		];

		let descriptionMap = {
			'oauth': 'The OAuth2.0 authentication method requires an external OAuth2 service. Users can be managed (such as adding & removing) by contacting your administrator of the OAuth2 service. User roles (permissions) can be managed by using the `Access` tab of your console and the `Authorized users` table.',
			'couchdb': 'The CouchDB authentication method will securely store usernames and passwords in the console\'s CouchDB database. Users can be managed (such as adding & removing) by using the `Access` tab of your console and the `Authorized users` table.',
		};
		let warningMap = {
			'oauth': 'This authentication method requires the following settings. These settings can be obtained from your specific OAuth2.0 service. <help>',
			'couchdb': 'This authentication method does not require any other information or any external services.'
		};
		let nameMap = {
			'oauth': 'OAuth2.0 Settings:',
			'couchdb': 'CouchDB Settings:'
		};
		return (
			<WizardStep type="WizardStep"
				disableSubmit={this.oauthSettingsAreSame()}
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
								{descriptionMap[this.props.auth_scheme.value]}
							</p>

							{this.props.auth_scheme && this.props.auth_scheme.value === 'oauth' &&
								<div>
									<SidePanelWarning title="callback_warning_title"
										subtitle="callback_warning_desc"
										data={{ CALLBACK: settings.HOST_URL + settings.LOGIN_URI }}
									/>

									<SidePanelWarning title="oauth_warning_title"
										subtitle="oauth_warning_desc"
									/>
								</div>}
							<br />
							<br />
							<h4>
								{nameMap[this.props.auth_scheme.value]}
							</h4>
							<p className='tinyText'>
								{warningMap[this.props.auth_scheme.value]}
							</p>
							<br/>
						</div>}

						{this.props.auth_scheme && this.props.auth_scheme.value === 'oauth' &&
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
								<p className="settings-toggle-label">{translate('debug_label')}</p>
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
				disableSubmit={
					false//!this.props.adminContactEmail
				}
			>
				<div>
					{Helper.renderFieldSummary(translate, this.props.auth_scheme, 'authentication_services', 'value')}

					{this.props.auth_scheme && this.props.auth_scheme.value === 'oauth' && <div>
						{Helper.renderFieldSummary(translate, this.props, 'authorization_url_label', 'authorization_url')}
						{Helper.renderFieldSummary(translate, this.props, 'token_url_label', 'token_url')}
						{Helper.renderFieldSummary(translate, this.props, 'client_id_label', 'client_id')}
						{Helper.renderFieldSummary(translate, this.props, 'client_secret_label', 'client_secret', true)}
						{Helper.renderFieldSummary(translate, this.props, 'scope_label', 'scope2')}
						{Helper.renderFieldSummary(translate, this.props, 'debug_label', 'debug')}
					</div>}
				</div>
			</WizardStep>
		);
	}

	// dsh todo protect this panel from only opening if user is manager
	// dsh remove theses translation strings couch_edit_authentication_settings_desc, edit_authentication_settings_desc, administrator_contact_desc
	render() {
		const translate = this.props.translate;
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
};

EditAuthSchemePanel.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
	showError: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
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
)(withLocalize(EditAuthSchemePanel));
