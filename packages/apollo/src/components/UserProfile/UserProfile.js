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
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withTranslation } from 'react-i18next';
import Helper from '../../utils/helper';
import ChangePasswordModal from '../ChangePasswordModal/ChangePasswordModal';
import { connect } from 'react-redux';
import { updateState, showSuccess, showError } from '../../redux/commonActions';
import LoginApi from '../../rest/LoginApi';
import { Modal } from 'carbon-components-react';
import Logger from '../Log/Logger';
import { NodeRestApi } from '../../rest/NodeRestApi';
import RenderHTML from "../RenderHTML/RenderHTML";

const SCOPE = 'userProfile';
const Log = new Logger(SCOPE);

class UserProfile extends Component {
	componentWillMount() {
		document.addEventListener('mouseup', event => this.handleClick(event), false);
	}

	componentWillUnmount() {
		document.removeEventListener('mouseup', event => this.handleClick(event), false);
	}

	handleClick(e) {
		const userProfileButton = document.querySelector('#ibp-header-user-profile-icon');
		const userProfile = document.getElementById('ibp-user-profile');
		const modalPortal = document.getElementById('ibp-portal-container');
		if (
			(userProfileButton && userProfileButton.contains(e.target)) ||
			(userProfile && userProfile.contains(e.target)) ||
			(modalPortal && modalPortal.contains(e.target))
		) {
			return;
		}
		this.handleClickOutside();
	}

	handleClickOutside() {
		this.props.closeUserProfile();
	}

	openChangePasswordModal() {
		this.props.updateState(SCOPE, {
			showChangePasswordModal: true,
		});
	}

	closeChangePasswordModal() {
		this.props.updateState(SCOPE, {
			showChangePasswordModal: false,
		});
	}

	async handleClickLogout() {
		try {
			Log.info('Logging out');
			const resp = await LoginApi.logout('no_redirect');
			Log.info('Logout successful:', resp);
			this.props.updateState(SCOPE, {
				showLogoutModal: true,
			});
		} catch (error) {
			Log.error(`Logout Failed: ${error}`);
		}
	}

	async handleRefreshCerts() {
		try {
			const resp = await NodeRestApi.getUnCachedDataWithDeployerAttrs();
			Log.debug('Refresh cert response:', resp);
			this.props.closeUserProfile();
			this.props.showSuccess('all_cert_refresh_successful', {}, SCOPE);
		} catch (error) {
			Log.error(`Refresh Failed: ${error}`);
			this.props.closeUserProfile();
			this.props.showError('cert_refresh_error', {}, SCOPE);
		}
	}

	render() {
		const { name, email, logout_url, canLogout, canChangePassword, t:translate } = this.props;
		return (
			<div id="ibp-user-profile"
				className={`ibp-user-info-detail-container ${canLogout ? 'ibp-user-info-detail-container-longer' : ''}`}
			>
				<div className="ibp-user-info-detail-content">
					<p className="ibp-user-info-username"
						id="username"
					>
						{name}
					</p>
					{name !== email && (
						<p className="ibp-header-user-info-subtext"
							id="email"
						>
							{email}
						</p>
					)}
					<p className="ibp-header-user-info-subtext">{this.props.role}</p>
				</div>
				{/* As discussed with brian and david, removing top level for now
				<button className="ibp-header-user-info-logout ibp-profile-button"
					id="refresh"
					onClick={() => this.handleRefreshCerts()}
				>
					{translate('refresh_certs')}
				</button> */}
				{canLogout && (
					<button className="ibp-header-user-info-logout ibp-profile-button"
						id="logout"
						onClick={() => this.handleClickLogout()}
					>
						{translate('logout')}
					</button>
				)}
				{canChangePassword && (
					<button className="ibp-header-user-info-logout ibp-profile-button"
						id="change-password"
						onClick={() => this.openChangePasswordModal()}
					>
						{translate('change_password')}
					</button>
				)}
				{this.props.showChangePasswordModal && (
					<ChangePasswordModal
						username={name}
						onClose={() => this.closeChangePasswordModal()}
						onComplete={() => {
							this.props.closeUserProfile();
							this.props.showSuccess('change_password_successful', {}, SCOPE);
							setTimeout(() => {
								window.location.href = logout_url;
							}, 1000);
						}}
					/>
				)}
				{this.props.showLogoutModal && (
					<Modal className="ibp-logout-successful"
						passiveModal
						modalHeading={translate('logout_successful')}
						danger
						open
					>
						<p><RenderHTML value={translate('logout_modal', { bust: Date.now() })}/></p>
					</Modal>
				)}
			</div>
		);
	}
}

const dataProps = {
	closeUserProfile: PropTypes.func,
	email: PropTypes.string,
	isAdmin: PropTypes.bool,
	canLogout: PropTypes.bool,
	canChangePassword: PropTypes.bool,
	logout_url: PropTypes.string,
	name: PropTypes.string,
	showChangePasswordModal: PropTypes.bool,
	showLogoutModal: PropTypes.bool,
};

UserProfile.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	showSuccess: PropTypes.func,
	showError: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
		showSuccess,
		showError,
	}
)(withTranslation()(UserProfile));
