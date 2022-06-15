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
import Logger from '../Log/Logger';
import SidePanel from '../SidePanel/SidePanel';
import UserSettingsRestApi from '../../rest/UserSettingsRestApi';
import LoginApi from '../../rest/LoginApi';

const SCOPE = 'resetPasswordModal';
const Log = new Logger(SCOPE);

export class ResetPasswordModal extends Component {
	cName = 'ResetPasswordModal';

	async componentDidMount() {
		this.props.updateState(SCOPE, {
			loading: true,
		});

		try {
			const resp = await UserSettingsRestApi.getDefaultPassword();
			this.props.updateState(SCOPE, {
				loading: false,
				defaultPassword: resp ? resp.DEFAULT_USER_PASSWORD : null,
			});
		} catch (error) {
			Log.error('Failed to get default password:', error);
			this.props.updateState(SCOPE, {
				loading: false,
			});
		}
	}

	async onReset() {
		try {
			Log.info('Resetting password');
			const resp = await LoginApi.resetPassword(this.props.user.uuid);
			Log.info('Password reset successfully:', resp);
			this.props.onComplete({
				user: this.props.user.email,
				password: this.props.defaultPassword,
			});
			this.sidePanel.closeSidePanel();
		} catch (error) {
			Log.error(`Could not reset password: ${error}`);
		}
	}

	render() {
		const translate = this.props.translate;
		return (
			<div>
				<SidePanel
					disable_focus_trap={true}
					id="reset-password"
					closed={this.props.onClose}
					ref={sidePanel => (this.sidePanel = sidePanel)}
					buttons={[
						{
							id: 'cancel',
							text: translate('cancel'),
						},
						{
							id: 'reset_password',
							text: translate('reset_password'),
							onClick: () => this.onReset(),
							disabled: this.props.loading,
							type: 'submit',
						},
					]}
					error={this.props.error}
					submitting={this.props.submitting}
				>
					<div>
						<div className="ibp-modal-title">
							<h1 className="ibm-light">{translate('reset_password')}</h1>
						</div>
						<p className="ibp-modal-desc">{translate('reset_password_desc')}</p>
						<Form
							scope={SCOPE}
							id={SCOPE + '-reset-password'}
							fields={[
								{
									name: 'username',
									default: this.props.user.email,
									disabled: true,
								},
								{
									name: 'defaultPassword',
									placeholder: 'defaultPassword_placeholder',
									default: '',
									disabled: true,
								},
							]}
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
	defaultPassword: PropTypes.string,
};

ResetPasswordModal.propTypes = {
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
)(withLocalize(ResetPasswordModal));
