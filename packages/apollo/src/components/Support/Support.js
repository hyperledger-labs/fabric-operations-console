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
import { Button, SkeletonText } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
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
				this.props.updateState(SCOPE, {
					loading: false,
					settings,
					hide_transaction_input,
					hide_transaction_output,
					mustgather_enabled,
					productLabelVersion: settings.PRODUCT_LABEL_VER_KEY,
					productLabelNotes: settings.PRODUCT_LABEL_NOTES_KEY,
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
				{translate(this.props.productLabelVersion || 'product_label_version')}
				{this.props.loading && <SkeletonText />}
				<div id="version_id"
					className="support-versions-section"
				>
					<strong>{!this.props.loading && tag}</strong>
				</div>
			</div>
		);
	}

	getSupportURL() {
		let supportURL = 'https://cloud.ibm.com/unifiedsupport/supportcenter';
		if (this.props.platform && this.props.platform !== 'ibmcloud') {
			supportURL = 'https://www.ibm.com/mysupport';
		}
		return supportURL;
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
		const translate = this.props.translate;
		return (
			<PageContainer>
				<PageHeader headerName="support"
					staticHeader
				/>
				<div className="bx--row">
					<div className="bx--col-lg-4">
						<div className="support-left-section">
							<div className="ibp-support">{this.renderVersionInformation(translate)}</div>
							<div>
								<TranslateLink className="ibp-support2"
									text="contact_support_2"
								/>
							</div>
							{this.renderSupportSection(translate)}
							{this.props.mustgather_enabled && <Mustgather />}
						</div>
					</div>
					<div className="bx--col-lg-12">
						<ReleaseNotes loading={this.props.loading}
							releaseNotes={this.props.releaseNotes}
							productLabelNotes={this.props.productLabelNotes}
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
	productLabelVersion: PropTypes.string,
	productLabelNotes: PropTypes.string,
};

Support.propTypes = {
	...dataProps,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['isAdmin'] = state['settings'].isAdmin;
		newProps['platform'] = state['settings'].platform;
		return newProps;
	},
	{
		clearNotifications,
		showBreadcrumb,
		showError,
		updateState,
	}
)(withLocalize(Support));
