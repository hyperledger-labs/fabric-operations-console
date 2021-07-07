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
import { InlineNotification } from 'carbon-components-react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import ServiceInstanceRestApi from '../../rest/ServiceInstanceApi';
import Helper from '../../utils/helper';
import { getFromStorage, removeFromStorage, setInStorage } from '../../utils/localStorage';
import BlockchainTooltip from '../BlockchainTooltip/BlockchainTooltip';
import BlockchainBreadcrumb from '../Breadcrumb/Breadcrumb';
import TranslateLink from '../TranslateLink/TranslateLink';
const SCOPE = 'titleBar';
const semver = require('semver');

export class PageHeader extends Component {
	async componentDidMount() {
		await this.displayAnnouncements();
	}

	async componentDidUpdate(prevProps) {
		if (this.props.supportedVersion !== prevProps.supportedVersion) {
			await this.displayAnnouncements();
		}
	}

	async displayAnnouncements() {
		if (!this.props.supportedVersion) return;
		let clusterVersion;
		let isClusterWarning = false;
		try {
			const clusterVersionResp = await ServiceInstanceRestApi.getClusterVersion();
			if (clusterVersionResp && clusterVersionResp.gitVersion) {
				let cvMatch = clusterVersionResp.gitVersion.match(/^(.*?[.].*?)[.].*/);
				if (cvMatch) {
					clusterVersion = cvMatch[1];
				}
				if (clusterVersion && clusterVersion.charAt(0) === 'v') {
					clusterVersion = clusterVersion.substring(1);
				}
				if (
					(clusterVersion && semver.lt(semver.coerce(clusterVersion), semver.coerce(this.props.supportedVersion.min))) ||
					semver.gt(semver.coerce(clusterVersion), semver.coerce(this.props.supportedVersion.max))
				) {
					isClusterWarning = true;
					let cvDisplayMatch = clusterVersionResp.gitVersion.match(/^(.*?[.].*?)[+].*/);
					if (cvDisplayMatch) {
						this.props.updateState(SCOPE, {
							clusterVersion: cvDisplayMatch[1],
						});
					}
				}
			}
		} catch (e) {
			console.log('Announcement Error', e);
		}

		if (isClusterWarning) {
			const showAnnouncementFlag = getFromStorage('showAnnouncement');
			if (!showAnnouncementFlag || showAnnouncementFlag === null) {
				this.props.updateState(SCOPE, {
					showAnnouncement: true,
					showAnnouncementButton: false,
				});
			} else {
				this.props.updateState(SCOPE, {
					showAnnouncement: false,
					showAnnouncementButton: true,
				});
			}
		} else {
			this.props.updateState(SCOPE, {
				showAnnouncement: false,
				showAnnouncementButton: false,
			});
			removeFromStorage('showAnnouncement');
		}
	}
	render() {
		const translate = this.props.translate;
		return (
			<div className="ibp-page-header">
				{this.props.showAnnouncement && (
					<InlineNotification
						kind="error"
						title={translate('unsupported_cluster')}
						subtitle={
							<TranslateLink
								text={translate('unsupported_cluster_error', {
									clusterVersion: this.props.clusterVersion,
									min: this.props.supportedVersion ? this.props.supportedVersion.min : '',
									max: this.props.supportedVersion ? this.props.supportedVersion.max : '',
								})}
								className="ibp-iks-support-with-link"
							/>
						}
						hideCloseButton={false}
						onCloseButtonClick={() => {
							this.props.updateState(SCOPE, {
								showAnnouncementButton: true,
								showAnnouncement: false,
							});
							setInStorage('showAnnouncement', true);
						}}
					/>
				)}
				<BlockchainBreadcrumb />
				<h1 id="test__page--header">
					{!this.props.headerTooltip ? (
						this.props.staticHeader ? (
							translate(this.props.headerName)
						) : (
							this.props.headerName
						)
					) : (
						<div className="ibp-page-header-tooltip">
							<BlockchainTooltip triggerText={this.props.staticHeader ? translate(this.props.headerName) : this.props.headerName}>
								{translate(this.props.headerTooltip)}
							</BlockchainTooltip>
						</div>
					)}
				</h1>
				{this.props.subtext && <TranslateLink text={this.props.subtext} />}
			</div>
		);
	}
}

const dataProps = {
	headerName: PropTypes.string,
	clusterVersion: PropTypes.string,
	showAnnouncement: PropTypes.bool,
	showAnnouncementButton: PropTypes.bool,
	headerTooltip: PropTypes.string,
	staticHeader: PropTypes.bool,
	subtext: PropTypes.string,
};

PageHeader.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['supportedVersion'] = _.get(state, 'settings.cluster_data.supported_version');
		return newProps;
	},
	{
		updateState,
	}
)(withLocalize(PageHeader));
