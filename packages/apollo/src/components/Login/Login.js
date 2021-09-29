/*
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
import { Button } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import { updateState } from '../../redux/commonActions';
import LoginApi from '../../rest/LoginApi';
import Helper from '../../utils/helper';
import Form from '../Form/Form';
import Logger from '../Log/Logger';
import TitleBar from '../TitleBar/TitleBar';

const SCOPE = 'login';
const Log = new Logger(SCOPE);

export class Login extends Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			email: '',
			login_password: '',
			currentPassword: '',
			newPassword: '',
			loginError: '',
			currentPasswordError: '',
			newPasswordError: '',
			confirmPasswordError: '',
		});
	}

	componentWillUnmount() {}

	async onLogin(e) {
		try {
			Log.info(`Logging in as ${this.props.email}`);
			const resp = await LoginApi.login(this.props.email, this.props.login_password);
			Log.debug(`Logged in as ${this.props.email}:`, resp);
			window.location.href = `${this.props.hostUrl}/nodes`;
		} catch (error) {
			Log.error(`Failed to log in as ${this.props.email}: ${error}`);
			this.props.updateState(SCOPE, {
				loginError: error.translation && error.translation.message,
			});
		}
	}

	async onChangePassword(e) {
		try {
			Log.info('Changing password');
			const resp = await LoginApi.changePassword(this.props.currentPassword, this.props.newPassword);
			Log.info('Changed password:', resp);
			window.location.href = `${this.props.hostUrl}/auth/logout`;
		} catch (error) {
			Log.error(`Password was not changed: ${error}`);
			let error_current_password =
				error.current_password_errors && error.current_password_errors.length ? error.current_password_errors[0].translation.message : '';
			let error_new_password = error.new_password_errors && error.new_password_errors.length ? error.new_password_errors[0].translation.message : '';

			this.props.updateState(SCOPE, {
				currentPasswordError: error_current_password,
				newPasswordError: error_new_password,
			});
		}
	}

	onLoginFormChange(value) {
		if (value.login_password) {
			this.props.updateState(SCOPE, {
				loginError: '',
			});
		}
	}

	onPasswordChangeFormChange(value) {
		if (value.currentPassword) {
			this.props.updateState(SCOPE, {
				currentPasswordError: '',
			});
		} else if (value.newPassword) {
			this.validateNewPassword(value.newPassword);
		} else if (value.confirmPassword) {
			this.validateConfirmPassword(null, value.confirmPassword);
		}
	}

	validateConfirmPassword(newPassword, confirmPassword) {
		newPassword = newPassword ? newPassword : this.props.newPassword;
		confirmPassword = confirmPassword ? confirmPassword : this.props.confirmPassword;
		let isSame = newPassword && confirmPassword ? newPassword === confirmPassword : true;
		this.props.updateState(SCOPE, {
			confirmPasswordError: !isSame ? 'passwords_do_not_match' : '',
		});
	}

	validateNewPassword(newPassword) {
		let isLengthOk = newPassword && newPassword.length >= 8;
		this.props.updateState(SCOPE, {
			newPasswordError: !isLengthOk ? 'password_character_limit_error_message' : '',
		});
		this.validateConfirmPassword(newPassword, null);
	}

	render() {
		let disableSubmit = false;
		if (
			(this.props.changePassword &&
				(!this.props.currentPassword ||
					!this.props.newPassword ||
					!this.props.confirmPassword ||
					this.props.newPassword !== this.props.confirmPassword ||
					this.props.newPassword.length < 8)) ||
			(!this.props.changePassword && (!this.props.email || !this.props.login_password))
		) {
			disableSubmit = true;
		}
		const translate = this.props.translate;
		return (
			<Router>
				<>
					<TitleBar hideButtons />
					<div className="ibp-login-main">
						<div className={`ibp-login-content ${this.props.changePassword ? 'ibp-change-password' : 'ibp-user-login'} `}>
							<p className="ibp-login-content-title ibm-type-light">
								{translate(this.props.changePassword ? 'change_your_password' : this.props.productLabelLogin)}
							</p>
							<form
								onSubmit={e => {
									e.preventDefault();
									if (disableSubmit) return;

									this.props.changePassword ? this.onChangePassword(e) : this.onLogin(e);
								}}
							>
								<div className="ibp-login-form">
									{!this.props.changePassword && (
										<Form
											scope={SCOPE}
											id={SCOPE + '-form'}
											fields={[
												{
													name: 'email',
													label: 'login_email',
													placeholder: 'login_email_placeholder',
													required: true,
													specialRules: Helper.SPECIAL_RULES_LOGIN_EMAIL,
												},
												{
													name: 'login_password',
													label: 'login_password',
													type: 'password',
													placeholder: 'login_password_placeholder',
													errorMsg: this.props.loginError ? this.props.loginError : '',
													required: true,
												},
											]}
											onChange={value => this.onLoginFormChange(value)}
										/>
									)}
									{this.props.changePassword && (
										<Form
											scope={SCOPE}
											id={SCOPE + '-form'}
											fields={[
												{
													name: 'currentPassword',
													label: 'current_password',
													type: 'password',
													placeholder: 'current_password_placeholder',
													errorMsg: this.props.currentPasswordError,
													required: true,
												},
												{
													name: 'newPassword',
													label: 'new_password',
													type: 'password',
													errorMsg: this.props.newPasswordError,
													placeholder: 'new_password_placeholder',
													required: true,
												},
												{
													name: 'confirmPassword',
													label: 'confirm_password_label',
													type: 'password',
													errorMsg: this.props.confirmPasswordError,
													disabled: !this.props.newPassword,
													placeholder: 'confirm_password_placeholder',
													required: true,
												},
											]}
											onChange={value => this.onPasswordChangeFormChange(value)}
										/>
									)}
								</div>
								<div className="ibp-login-button">
									<Button id="login"
										kind="primary"
										className="login-button"
										type="submit"
										disabled={disableSubmit}
									>
										{translate(this.props.changePassword ? 'change_your_password' : 'login')}
									</Button>
								</div>
							</form>
						</div>
					</div>
				</>
			</Router>
		);
	}
}

const dataProps = {
	email: PropTypes.string,
	login_password: PropTypes.string,
	currentPassword: PropTypes.string,
	newPassword: PropTypes.string,
	confirmPassword: PropTypes.string,
	loginError: PropTypes.string,
	currentPasswordError: PropTypes.string,
	newPasswordError: PropTypes.string,
	confirmPasswordError: PropTypes.string,
};

Login.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
	productLabelLogin: PropTypes.string,
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
	}
)(withLocalize(Login));
