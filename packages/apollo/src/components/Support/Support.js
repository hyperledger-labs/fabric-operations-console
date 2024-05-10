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
import { Button, SkeletonText } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { clearNotifications, showBreadcrumb, showError, updateState } from '../../redux/commonActions';
import SettingsApi from '../../rest/SettingsApi';
import Helper from '../../utils/helper';
import Logger from '../Log/Logger';
import Mustgather from '../Mustgather/Mustgather';
import PageContainer from '../PageContainer/PageContainer';
import PageHeader from '../PageHeader/PageHeader';
import ReleaseNotes from '../ReleaseNotes/ReleaseNotes';
import SVGs from '../Svgs/Svgs';
import TranslateLink from '../TranslateLink/TranslateLink';
import ActionsHelper from '../../utils/actionsHelper';
import withRouter from '../../hoc/withRouter';

const SCOPE = 'comp_settings';
const Log = new Logger(SCOPE);

class Support extends Component {
	componentDidMount() {
		this.props.showBreadcrumb('settings', {}, this.props.history.location.pathname, true);
		this.props.updateState(SCOPE, { loading: true });
		this.getVersionInformation();
	}

	getVersionInformation() {
		SettingsApi.getVersionInformation()
			.then(versions => {
				this.props.updateState(SCOPE, { versions });
				this.getReleaseNotes();
			})
			.catch(error => {
				Log.error(error);
				this.getReleaseNotes();
			});
	}

	getReleaseNotes() {
		SettingsApi.getReleaseNotes()
			.then(releaseNotes => {
				this.props.updateState(SCOPE, { releaseNotes });
				this.getSettings();
			})
			.catch(error => {
				Log.error(error);
				this.getSettings();
			});
	}

	getSettings() {
		SettingsApi.getSettings()
			.then(settings => {
				const hide_transaction_input = settings.FEATURE_FLAGS.hide_transaction_input;
				const hide_transaction_output = settings.FEATURE_FLAGS.hide_transaction_output;
				const mustgather_enabled = settings.FEATURE_FLAGS.mustgather_enabled;
				const auth_scheme = settings.AUTH_SCHEME;
				this.props.updateState(SCOPE, {
					loading: false,
					settings,
					hide_transaction_input,
					hide_transaction_output,
					mustgather_enabled,
					auth_scheme,
				});
			})
			.catch(error => {
				Log.error(error);
				this.props.showError('error_getting_settings', {}, SCOPE);
				this.props.updateState(SCOPE, { loading: false });
			});
	}

	componentWillUnmount() {
		this.props.clearNotifications(SCOPE);
	}

	renderVersionInformation(translate) {
		if (!this.props.versions) {
			return;
		}
		let tag = null;
		if (!this.props.loading) {
			tag = this.props.versions['tag'];
			if (tag && tag.charAt(0) === 'v') {
				tag = tag.substring(1);
			}
		}
		return (
			<div>
				{translate('product_label_version')}
				{this.props.loading && <SkeletonText />}
				<div id="version_id"
					className="support-versions-section"
				>
					<strong>{!this.props.loading && tag}</strong>
				</div>
			</div>
		);
	}

	// create the support link for the type of console build this is
	getSupportURL() {
		let supportUrl = 'https://www.ibm.com/docs/en/hlf-support/1.0.0?topic=help-getting-support';

		if (this.props.console_type === 'hlfoc') {
			supportUrl = 'https://github.com/hyperledger-labs/fabric-operations-console/issues';
		}
		return supportUrl;
	}

	renderSupportSection(translate) {
		return (
			<div className="support-contact-section">
				<Button className="ibp__add--item--button-with-text"
					href={this.getSupportURL()}
					rel="noopener noreferrer"
					target="_blank"
					kind="secondary"
					role="link"
				>
					<div className="support-button-label">{translate('contact_support')}</div>
					<SVGs extendClass={{ 'ibp-container-list-add-button-img': true }}
						type={'launch'}
					/>
				</Button>
			</div>
		);
	}

	render = () => {
		const translate = this.props.t;
		return (
			<PageContainer>
				<PageHeader
					history={this.props.history}
					headerName="support"
					staticHeader
				/>
				<div className="bx--row">
					<div className="bx--col-lg-4">
						<div className="support-left-section">
							<div className="ibp-support">{this.renderVersionInformation(translate)}</div>
							<div>
								{(this.props.console_type !== 'hlfoc') && <TranslateLink className="ibp-support2"
									text="contact_support_2"
								/>}
								{(this.props.console_type === 'hlfoc') && <TranslateLink className="ibp-support2"
									text="contact_support_3"
								/>}
							</div>
							{this.renderSupportSection(translate)}
							{this.props.mustgather_enabled && ActionsHelper.canManageUsers(this.props.userInfo) && <Mustgather />}
						</div>
					</div>
					<div className="bx--col-lg-12">
						<ReleaseNotes loading={this.props.loading}
							releaseNotes={this.props.releaseNotes}
						/>
					</div>
				</div>
			</PageContainer>
		);
	};
}

const dataProps = {
	loading: PropTypes.bool,
	versions: PropTypes.object,
	releaseNotes: PropTypes.object,
	hide_transaction_input: PropTypes.bool,
	hide_transaction_output: PropTypes.bool,
	mustgather_enabled: PropTypes.bool,
	settings: PropTypes.object,
	userInfo: PropTypes.object,
	auth_scheme: PropTypes.string,
};

Support.propTypes = {
	...dataProps,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['isAdmin'] = state['settings'].isAdmin;
		newProps['console_type'] = state['settings'].console_type;
		newProps['userInfo'] = state['userInfo'] ? state['userInfo'] : null;
		return newProps;
	},
	{
		clearNotifications,
		showBreadcrumb,
		showError,
		updateState,
	}
)(withTranslation()(withRouter(Support)));
