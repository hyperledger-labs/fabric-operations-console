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
import { updateState } from '../../redux/commonActions';
import Helper from '../../utils/helper';
import Form from '../Form/Form';
import SidePanel from '../SidePanel/SidePanel';
import LoginApi from '../../rest/LoginApi';
import Logger from '../Log/Logger';

const SCOPE = 'changePasswordModal';
const Log = new Logger(SCOPE);

class ChangePasswordModal extends Component {
	cName = 'ChangePasswordModal';
	debounce = null;

	componentDidMount() {
		this.props.updateState(SCOPE, {
			submitting: false,
			error: '',
			loading: false,
			currentPassword: '',
			newPassword: '',
			confirmPassword: '',
			currentPasswordError: '',
			newPasswordError: '',
			confirmPasswordError: '',
		});
	}

	async onChangePassword() {
		this.props.updateState(SCOPE, {
			submitting: true,
		});
		try {
			Log.info('Changing password');
			const resp = await LoginApi.changePassword(this.props.currentPassword, this.props.newPassword);
			Log.info('Changed password:', resp);
			this.props.updateState(SCOPE, {
				submitting: false,
			});
			this.props.onComplete();
			this.sidePanel && this.sidePanel.closeSidePanel();
		} catch (error) {
			Log.error(`Password was not changed: ${error}: ${error.current_password_errors} ${error.new_password_errors}`);
			let error_message = '';
			if (error.current_password_errors && error.current_password_errors.length) error_message = error.current_password_errors[0].translation.message;
			else if (error.new_password_errors && error.new_password_errors.length) error_message = error.new_password_errors[0].translation.message;

			this.props.updateState(SCOPE, {
				currentPasswordError: error_message,
				submitting: false,
			});
		}
	}

	// debounce the new-password input field as it is entered
	onPasswordChangeFormChange(value) {
		clearTimeout(this.debounce);
		this.debounce = setTimeout(() => {
			this.onPasswordChangeFormChangeDebounced(value);
		}, 300);
	}

	// test new password's strength as it is entered
	async onPasswordChangeFormChangeDebounced(value) {
		if (value.currentPassword) {
			this.props.updateState(SCOPE, {
				currentPasswordError: '',
			});
		} else if (value.newPassword) {
			try {
				await LoginApi.testPasswordStr(value.newPassword);
				this.props.updateState(SCOPE, {
					newPasswordError: '',
				});
			} catch (e) {
				const msg = e ? e.msg : 'Password was not updated';
				this.props.updateState(SCOPE, {
					newPasswordError: (Array.isArray(msg) && typeof msg[0] === 'string') ? msg.join('<br/>') : msg,
				});
			}
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

	render() {
		let isSubmitDisabled =
			!this.props.currentPassword ||
			!this.props.newPassword ||
			!this.props.confirmPassword ||
			this.props.newPassword !== this.props.confirmPassword ||
			this.props.newPasswordError !== '';

		const translate = this.props.translate;
		return (
			<div>
				<SidePanel
					disable_focus_trap={true}
					id="change-password"
					closed={this.props.onClose}
					ref={sidePanel => (this.sidePanel = sidePanel)}
					buttons={[
						{
							id: 'cancel',
							text: translate('cancel'),
						},
						{
							id: 'change_password',
							text: translate('change_password'),
							onClick: () => this.onChangePassword(),
							disabled: isSubmitDisabled,
							type: 'submit',
						},
					]}
					error={this.props.error}
					submitting={this.props.submitting}
				>
					<div>
						<div className="ibp-modal-title">
							<h1 className="ibm-light">{translate('change_password')}</h1>
						</div>
						<p className="ibp-modal-desc">{translate('change_password_desc')}</p>
						<Form
							scope={SCOPE}
							id={SCOPE + '-change-password'}
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
					</div>
				</SidePanel>
			</div>
		);
	}
}

const dataProps = {
	submitting: PropTypes.bool,
	error: PropTypes.string,
	loading: PropTypes.bool,
	username: PropTypes.string,
	currentPassword: PropTypes.string,
	newPassword: PropTypes.string,
	confirmPassword: PropTypes.string,
	currentPasswordError: PropTypes.string,
	newPasswordError: PropTypes.string,
	confirmPasswordError: PropTypes.string,
};

ChangePasswordModal.propTypes = {
	...dataProps,
	onClose: PropTypes.func,
	onComplete: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
	}
)(withLocalize(ChangePasswordModal));
