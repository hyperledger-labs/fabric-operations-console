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
import { ChevronDown16, Help20, NotificationFilled20 } from '@carbon/icons-react/es';
import { Tag } from 'carbon-components-react';
import {
	Header,
	HeaderGlobalAction,
	HeaderGlobalBar,
	HeaderMenuItem,
	HeaderName,
	HeaderNavigation,
	SkipToContent,
} from 'carbon-components-react/lib/components/UIShell';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { updateState } from '../../redux/commonActions';
import SettingsApi from '../../rest/SettingsApi';
import Helper from '../../utils/helper';
import { removeFromStorage } from '../../utils/localStorage';
import ChaincodeModal from '../ChaincodeModal/ChaincodeModal';
import SignatureCollection from '../SignatureCollection/SignatureCollection';
import SignatureDetailModal from '../SignatureDetailModal/SignatureDetailModal';
import SVGs from '../Svgs/Svgs';
import UserInfo from '../UserInfo/UserInfo';
import UserProfile from '../UserProfile/UserProfile';
import WelcomeBannerContent from '../WelcomeBanner/WelcomeBannerContent';

const SCOPE = 'titleBar';

class TitleBar extends Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			showWelcomeBanner: false,
			closeWelcome: false,
		});
		this.getSettings();
	}

	componentDidUpdate(prevProps) {
		if (this.props.location !== prevProps.location) {
			const skipToContentElement = document.querySelector('.bx--skip-to-content');
			if (skipToContentElement) {
				skipToContentElement.tabIndex = 0;
			}
		}
	}

	getSettings() {
		SettingsApi.getSettings()
			.then(settings => {
				this.props.updateState(SCOPE, {
					productLabel: settings.PRODUCT_LABEL_KEY,
				});
			})
			.catch(error => {});
	}

	openSignatureCollections = () => {
		this.props.updateState(SCOPE, {
			showSignatureCollection: true,
		});
		this.closeWelcomeBanner();
	};

	closeSignatureCollections = () => {
		this.props.updateState(SCOPE, {
			showSignatureCollection: false,
		});
	};

	onKeyPressGetStarted = (event, showWelcomeBanner) => {
		if (event.key === 'Enter') {
			return showWelcomeBanner ? this.closeWelcomeBanner() : this.showWelcomeBanner();
		}
		return;
	};

	showWelcomeBanner = () => {
		this.props.updateState(SCOPE, {
			closeWelcome: false,
			showWelcomeBanner: true,
		});
		this.props.updateState('userInfo', {
			showUserInfo: false,
		});
	};

	closeWelcomeBanner = () => {
		this.props.updateState(SCOPE, {
			closeWelcome: true,
		});
		setTimeout(() => {
			this.props.updateState(SCOPE, {
				showWelcomeBanner: false,
			});
		}, 250);
	};

	showAnnouncement = () => {
		this.props.updateState(SCOPE, {
			showAnnouncementButton: false,
			showAnnouncement: true,
		});
		removeFromStorage('showAnnouncement');
	};

	hideDetails = () => {
		this.props.updateState('signatureCollection', {
			details: null,
		});
		this.props.updateState(SCOPE, {
			showSignatureCollection: true,
		});
	};

	onComplete = refresh => {
		if (this.props.details) {
			// Check if the user is viewing the channel details
			const path = window.location.href.toLowerCase();
			if (path.indexOf('/channel/' + this.props.details.channel) > -1) {
				this.props.updateState('channelChaincode', {
					refreshNeeded: true,
				});
			}
		}
		// If signature request submitted and user in on channels page(i.e they are creating channel with advanced config),
		// refresh page to load the pending tile
		if (refresh && window.location.href.toLowerCase().indexOf('/channels') > -1) {
			window.location.href = `${this.props.host_url}/channels`;
		}
	};

	openUserInfo = () => {
		this.closeWelcomeBanner();
		this.props.updateState('userInfo', {
			showUserInfo: true,
		});
	};

	closeUserProfile = () => {
		if (this.props.showUserInfo) {
			this.props.updateState('userInfo', {
				showUserInfo: false,
			});
		}
	};

	goHome = () => {
		this.props.history.push('/nodes');
	};

	onKeyPressGoHome = event => {
		if (event.key === 'Enter') {
			return this.goHome();
		}
		return;
	};

	goToDocs = (event, translate, type) => {
		if ((event.key === 'Enter' && type === 'keypress') || type === 'click') {
			if (this.props.platform && this.props.platform === 'openshift') {
				window.open(translate('mainDocs_sw', { DOC_PREFIX: this.props.docPrefix }));
			} else {
				window.open(translate('mainDocs', { DOC_PREFIX: this.props.docPrefix }));
			}
		}
	};

	render() {
		const showHeaderButtons = !this.props.hideButtons;
		const { name, email } = this.props.logged && this.props.userInfo ? this.props.userInfo.loggedInAs : '';
		const canLogout = this.props.authScheme !== 'ibmid';
		const canChangePassword = this.props.authScheme === 'couchdb';
		const logout_url = this.props.host_url + '/auth/logout';
		const translate = this.props.translate;
		const { needsAttention } = this.props;
		const needsAttentionStrLength = needsAttention ? needsAttention.toString().length : 0;
		const productLabel = this.props.productLabel || 'product_label'; // may or may not contain "IBM"
		return (
			<div
				role="banner"
				id="title_bar"
				className={`ibp-title-bar ${showHeaderButtons ? 'ibp-user-logged-in' : 'ibp-user-logged-out'}`}
				aria-label={translate(productLabel)}
			>
				<Header aria-label={translate(productLabel)}>
					<SkipToContent />
					<HeaderName prefix=""
						onClick={this.goHome}
						onKeyPress={event => this.onKeyPressGoHome(event)}
						className="ibp-carbon-product-name"
						tabIndex="0"
					>
						{translate(productLabel)}
					</HeaderName>
					{this.props.logged && showHeaderButtons && (
						<HeaderNavigation aria-label={translate(productLabel)}>
							<HeaderMenuItem
								onKeyPress={event => this.onKeyPressGetStarted(event, this.props.showWelcomeBanner)}
								onClick={this.props.showWelcomeBanner ? this.closeWelcomeBanner : this.showWelcomeBanner}
								className={`ibp-get-started-button ${this.props.showWelcomeBanner ? 'ibp-get-started-showing' : ''}`}
								id="ibp-get-started-menu-button"
							>
								{translate('get_started')}
								<ChevronDown16 className={`ibp-getting-started-button-icon ${this.props.showWelcomeBanner ? 'ibp-getting-started-button-icon-open' : ''}`} />
							</HeaderMenuItem>
							<HeaderMenuItem
								onKeyPress={event => this.goToDocs(event, translate, 'keypress')}
								onClick={event => this.goToDocs(event, translate, 'click')}
								className="ibp-header-menu-item"
							>
								{translate('documentation')}
							</HeaderMenuItem>
							{this.props.showAnnouncementButton && (
								<HeaderMenuItem
									onKeyPress={this.showAnnouncement}
									onClick={this.showAnnouncement}
									className={`ibp-announcement-button ${this.props.showAnnouncement ? 'ibp-announcement-showing' : ''}`}
									id="ibp-announcement-button"
								>
									{translate('alert')}
								</HeaderMenuItem>
							)}
						</HeaderNavigation>
					)}
					{showHeaderButtons && (
						<HeaderGlobalBar>
							<HeaderGlobalAction aria-label={translate('help')}
								onClick={() => this.props.history.push('/support')}
							>
								<Help20 />
							</HeaderGlobalAction>
							{this.props.logged && (
								<HeaderGlobalAction
									className="ibp-header-signature-button"
									onClick={this.openSignatureCollections}
									id="ibp-header-signature-collection-icon"
									aria-label="Toggle notifications"
								>
									{needsAttention ? (
										<div className="ibp-pending-notifications-container">
											<NotificationFilled20 className="ibp-signature-header-icon"
												title={translate('notifications')}
											/>
											<Tag
												className="ibp-needs-attention-notification-icon"
												title={translate('notification_count')}
												type="red"
												style={{
													right: needsAttentionStrLength >= 3 ? '-1rem' : needsAttentionStrLength === 2 ? '-0.75rem' : '-0.25rem',
												}}
											>
												{needsAttentionStrLength >= 3 ? translate('max_notification_count') : needsAttention}
											</Tag>
										</div>
									) : (
										<SVGs type="notification"
											extendClass={{ 'ibp-signature-header-icon': true }}
											title={translate('notifications')}
										/>
									)}
								</HeaderGlobalAction>
							)}
							<HeaderGlobalAction
								aria-label={translate('user_info')}
								onClick={this.props.showUserInfo ? this.closeUserProfile : this.openUserInfo}
								className={`${this.props.showUserInfo ? 'ibp-header-active-item' : ''}`}
								id="ibp-header-user-profile-icon"
							>
								<UserInfo
									userInfo={this.props.userInfo}
									host_url={this.props.host_url}
									closeWelcome={this.props.closeWelcome}
									onWelcomeClose={this.closeWelcomeBanner}
									closeUserProfile={this.closeUserProfile}
								/>
							</HeaderGlobalAction>
						</HeaderGlobalBar>
					)}
				</Header>
				{this.props.logged && showHeaderButtons && this.props.showSignatureCollection && (
					<SignatureCollection onWelcomeClose={this.closeWelcomeBanner}
						onClose={this.closeSignatureCollections}
						showRequests
					/>
				)}
				{this.props.logged && showHeaderButtons && this.props.details && !this.props.details.ccd && (
					<SignatureDetailModal request={this.props.details}
						msps={this.props.msps}
						closed={this.hideDetails}
						onComplete={this.onComplete}
					/>
				)}
				{this.props.logged && showHeaderButtons && this.props.details && this.props.details.ccd && (
					<ChaincodeModal channelId={this.props.details.channel}
						ccd={this.props.details.ccd}
						onClose={this.hideDetails}
						onComplete={this.onComplete}
					/>
				)}
				{this.props.showWelcomeBanner && <WelcomeBannerContent onClose={this.closeWelcomeBanner}
					closeWelcome={this.props.closeWelcome}
				/>}
				{this.props.showUserInfo && (
					<UserProfile
						closeUserProfile={this.closeUserProfile}
						email={email}
						role={this.props.userInfo && this.props.userInfo.role ? translate(this.props.userInfo.role) : null}
						canLogout={canLogout}
						canChangePassword={canChangePassword}
						logout_url={logout_url}
						name={name}
					/>
				)}
			</div>
		);
	}
}

const dataProps = {
	host_url: PropTypes.string,
	userInfo: PropTypes.object,
	showWelcomeBanner: PropTypes.bool,
	showAnnouncement: PropTypes.bool,
	showAnnouncementButton: PropTypes.bool,
	closeAnnouncement: PropTypes.bool,
	showSignatureCollection: PropTypes.bool,
	closeWelcome: PropTypes.bool,
	details: PropTypes.object,
	productLabel: 'product_label',
};

TitleBar.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	onClose: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['feature_flags'] = state['settings'] ? state['settings']['feature_flags'] : null;
		newProps['platform'] = state['settings'] ? state['settings']['platform'] : null;
		newProps['opToolsVersion'] = state['settings'] ? state['settings']['version'] : null;
		newProps['needsAttention'] = state['signatureCollection'] ? state['signatureCollection']['needsAttention'] : null;
		newProps['details'] = state['signatureCollection'] ? state['signatureCollection']['details'] : null;
		newProps['msps'] = state['signatureCollection'] ? state['signatureCollection']['msps'] : null;
		newProps['logged'] = state['userInfo'] ? state['userInfo']['logged'] : false;
		newProps['showUserInfo'] = state['userInfo'] ? state['userInfo']['showUserInfo'] : false;
		newProps['host_url'] = state['settings'] ? state['settings']['host_url'] : null;
		newProps['docPrefix'] = state['settings'] ? state['settings']['docPrefix'] : null;
		return newProps;
	},
	{
		updateState,
	}
)(withRouter(withLocalize(TitleBar)));
