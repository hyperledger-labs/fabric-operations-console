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
import ConfigureAuthApi from '../../rest/ConfigureAuthApi';
import SettingsApi from '../../rest/SettingsApi';
import UserSettingsRestApi from '../../rest/UserSettingsRestApi';
import Helper from '../../utils/helper';
import AuthDetails from '../AuthDetails/AuthDetails';
import Form from '../Form/Form';
import Logger from '../Log/Logger';
import Wizard from '../Wizard/Wizard';
import WizardStep from '../WizardStep/WizardStep';

const SCOPE = 'editSettings';
const Log = new Logger(SCOPE);

class EditAuthSettingsModal extends Component {
	cName = 'EditAuthSettingsModal';

	componentDidMount() {
		let adminContactEmail = this.props.adminContactEmail;
		if (adminContactEmail && adminContactEmail.email) {
			adminContactEmail = adminContactEmail.email;
		}
		this.props.updateState(SCOPE, {
			clientId: this.props.clientId,
			oauthServerUrl: this.props.oauthServerUrl,
			secret: this.props.secret,
			tenantId: this.props.tenantId,
			adminContactEmail,
			submitting: false,
			adminContactEmailError: null,
			newPasswordError: null,
			confirmPasswordError: null,
		});
		if (this.props.authScheme === 'couchdb' && this.props.isManager) {
			this.getDefaultPassword();
		}
	}

	componentWillUnmount() {
		this.props.updateState(SCOPE, {
			defaultPassword: '',
		});
	}

	getDefaultPassword = () => {
		this.props.updateState(SCOPE, {
			loading: true,
		});
		UserSettingsRestApi.getDefaultPassword()
			.then(resp => {
				this.props.updateState(SCOPE, {
					loading: false,
					defaultPassword: resp ? resp.DEFAULT_USER_PASSWORD : null,
				});
			})
			.catch(error => {
				Log.error(error);
				this.props.updateState(SCOPE, {
					loading: false,
				});
			});
	};

	handleInputChange = event => {
		this.props.updateState(SCOPE, {
			[event.target.id]: event.target.value,
		});
	};

	onSubmit = () => {
		if (this.props.authScheme === 'appid') {
			return this.updateAppIdSettings();
		} else {
			return this.updateSettings();
		}
	};

	updateAppIdSettings = () => {
		return new Promise((resolve, reject) => {
			this.props.updateState(SCOPE, { submitting: true });
			let body = {
				auth_scheme: 'appid',
				oauth_url: this.props.oauthServerUrl,
				secret: this.props.secret,
				tenant_id: this.props.tenantId,
				client_id: this.props.clientId,
				admin_contact_email: this.props.adminContactEmail,
			};
			ConfigureAuthApi.configureAuthScheme(body)
				.then(resp => {
					this.props.updateState(SCOPE, { submitting: false });
					if (resp.message === 'ok') {
						resolve();
					} else {
						reject({
							title: 'error_auth_settings_edit',
						});
					}
				})
				.catch(error => {
					Log.error(error);
					reject({
						title: 'error_auth_settings_edit',
						details: error,
					});
				});
		});
	};

	updateSettings = () => {
		this.props.updateState(SCOPE, { submitting: true });
		let body = {
			admin_contact_email: this.props.adminContactEmail,
		};
		if (this.props.authScheme === 'couchdb' && this.props.newPassword === this.props.confirmPassword) {
			body.default_user_password = this.props.newPassword;
		}

		return new Promise((resolve, reject) => {
			SettingsApi.updateSettings(body)
				.then(resp => {
					this.props.updateState(SCOPE, { submitting: false });
					resolve();
				})
				.catch(error => {
					this.props.updateState(SCOPE, { submitting: false });
					Log.error('Error occurred while updating settings ', error);
					let msg = error;
					if (error && error.msgs) {
						msg = error.msgs.join(',');
					}
					reject({
						title: 'error_console_settings_edit',
						details: msg,
					});
				});
		});
	};

	validateConfirmPassword = (newPassword, confirmPassword) => {
		newPassword = newPassword ? newPassword : this.props.newPassword;
		confirmPassword = confirmPassword ? confirmPassword : this.props.confirmPassword;
		let isSame = newPassword && confirmPassword ? newPassword === confirmPassword : true;
		this.props.updateState(SCOPE, {
			confirmPasswordError: !isSame ? 'passwords_do_not_match' : '',
		});
	};

	validateNewPassword = newPassword => {
		let err = '';
		if (newPassword.length < 10) {
			err = 'password_invalid';
		}
		if (newPassword.length > 128) {
			err = 'password_invalid';
		}

		this.props.updateState(SCOPE, {
			newPasswordError: err,
		});

		if (newPassword && newPassword !== this.props.defaultPassword) {
			this.validateConfirmPassword(newPassword, null);
		} else {
			this.props.updateState(SCOPE, {
				confirmPasswordError: '',
				confirmPassword: '',
			});
		}
	};

	onChangeFormFields = (value, valid) => {
		if (this.props.authScheme === 'couchdb' && this.props.isManager) {
			if (value.newPassword) {
				this.validateNewPassword(value.newPassword);
			} else if (value.confirmPassword) {
				this.validateConfirmPassword(null, value.confirmPassword);
			}
		}
		if (value.adminContactEmail) {
			this.props.updateState(SCOPE, {
				adminContactEmailError: !valid,
			});
		}
	};

	renderUpdateConfiguration(translate) {
		if (this.props.loading) {
			return;
		}

		const isAppId = this.props.authScheme === 'appid';
		const isCouchdb = this.props.authScheme === 'couchdb';
		let disableSubmit =
			this.props.submitting ||
			!this.props.adminContactEmail ||
			this.props.adminContactEmailError ||
			(isCouchdb &&
				this.props.isManager &&
				(this.props.newPasswordError ||
					this.props.confirmPasswordError ||
					(this.props.newPassword !== this.props.defaultPassword && !this.props.confirmPassword)));
		let fields = [
			{
				name: 'adminContactEmail',
				label: 'admin_contact_email',
				placeholder: 'admin_contact_email_placeholder',
				required: true,
				validate: Helper.isEmail,
				tooltip: 'admin_contact_email_tooltip',
				default: this.props.adminContactEmail,
				disabled: !this.props.isManager,
			},
		];
		if (isCouchdb && this.props.isManager) {
			fields.push({
				name: 'newPassword',
				label: 'default_password',
				type: 'password',
				placeholder: 'default_password_placeholder',
				tooltip: 'default_password_tooltip',
				loading: this.props.loading ? true : false,
				default: this.props.defaultPassword,
				errorMsg: this.props.newPasswordError,
			});
		}
		if (isCouchdb && this.props.isManager && this.props.newPassword && this.props.newPassword !== this.props.defaultPassword) {
			fields.push({
				name: 'confirmPassword',
				label: 'confirm_password_label',
				type: 'password',
				placeholder: 'confirm_password_placeholder',
				required: true,
				disabled: !this.props.newPassword,
				tooltip: 'default_password_tooltip',
				errorMsg: this.props.confirmPasswordError,
			});
		}
		return (
			<WizardStep type="WizardStep"
				disableSubmit={!this.props.isManager || disableSubmit}
			>
				<div className="ibp-edit-auth-settings">
					<div>
						{isAppId && (
							<AuthDetails
								clientId={this.props.clientId}
								oauthServerUrl={this.props.oauthServerUrl}
								secret={this.props.secret}
								tenantId={this.props.tenantId}
								configJson={this.props.configJson}
								scope={SCOPE}
							/>
						)}

						<div className="ibp-admin-contact-email">
							<Form scope={SCOPE}
								id={SCOPE}
								fields={fields}
								onChange={this.onChangeFormFields}
							/>
						</div>
					</div>
				</div>
			</WizardStep>
		);
	}

	renderUpdateSummary(translate) {
		if (this.props.authScheme !== 'couchdb' || !this.props.isManager) {
			return;
		}
		return (
			<WizardStep
				type="WizardStep"
				title={translate('summary')}
				disableSubmit={
					!this.props.adminContactEmail ||
					(this.props.newPassword && this.props.newPassword !== this.props.defaultPassword && this.props.newPassword !== this.props.confirmPassword)
				}
			>
				<div>
					{Helper.renderFieldSummary(translate, this.props, 'admin_contact_email', 'adminContactEmail')}
					{Helper.renderFieldSummary(translate, this.props, 'default_password', 'newPassword', true)}
				</div>
			</WizardStep>
		);
	}

	render() {
		const translate = this.props.translate;
		return (
			<Wizard
				title={this.props.isManager && this.props.authScheme !== 'iam' ? 'update_configuration' : 'administrator_contact'}
				onClose={this.props.onClose}
				onSubmit={this.props.isManager ? this.onSubmit : null}
			>
				<p className="ibp-modal-desc">
					{this.props.isManager
						? this.props.authScheme === 'couchdb'
							? translate('couch_edit_authentication_settings_desc')
							: translate('edit_authentication_settings_desc')
						: translate('administrator_contact_desc')}
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
	clientId: PropTypes.string,
	oauthServerUrl: PropTypes.string,
	secret: PropTypes.string,
	tenantId: PropTypes.string,
	configJson: PropTypes.string,
	adminContactEmail: PropTypes.string,
	adminContactEmailError: PropTypes.bool,
	error: PropTypes.string,
	editSettings: PropTypes.object,
	authScheme: PropTypes.string,
	defaultPassword: PropTypes.string,
	newPassword: PropTypes.string,
	confirmPassword: PropTypes.string,
	newPasswordError: PropTypes.string,
	confirmPasswordError: PropTypes.string,
};

EditAuthSettingsModal.propTypes = {
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
)(withLocalize(EditAuthSettingsModal));
