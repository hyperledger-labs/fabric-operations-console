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
import { updateState } from '../../redux/commonActions';
import Helper from '../../utils/helper';
import Form from '../Form/Form';
import Logger from '../Log/Logger';
import SidePanel from '../SidePanel/SidePanel';
import LoginApi from '../../rest/LoginApi';

const SCOPE = 'resetPasswordModal';
const Log = new Logger(SCOPE);

export class ResetPasswordModal extends Component {
	cName = 'ResetPasswordModal';

	async componentDidMount() {
		// nothing to do
	}

	async onReset() {
		try {
			Log.info('Resetting password for', this.props.user.uuid);
			const resp = await LoginApi.resetPassword(this.props.user.uuid);
			Log.info('Password reset successfully:', resp);
			this.sidePanel.closeSidePanel();
		} catch (error) {
			Log.error(`Could not reset password: ${error}`);
		}
	}

	render() {
		const translate = this.props.t;
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
						<p className="ibp-modal-desc">{translate('default_password_desc')}</p>
						<Form
							scope={SCOPE}
							id={SCOPE + '-reset-password'}
							fields={[
								{
									name: 'username_label',
									default: this.props.user.email,
									disabled: true,
								}
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
	//loading: PropTypes.bool,
};

ResetPasswordModal.propTypes = {
	...dataProps,
	onClose: PropTypes.func,
	onComplete: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
	}
)(withTranslation()(ResetPasswordModal));
