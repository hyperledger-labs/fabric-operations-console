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
import { NodeRestApi } from '../../rest/NodeRestApi';
import ServiceInstanceRestApi from '../../rest/ServiceInstanceApi';
import Helper from '../../utils/helper';
import { getFromStorage, removeFromStorage, setInStorage } from '../../utils/localStorage';
import BlockchainTooltip from '../BlockchainTooltip/BlockchainTooltip';
import BlockchainBreadcrumb from '../Breadcrumb/Breadcrumb';
import TranslateLink from '../TranslateLink/TranslateLink';
import StitchApi from '../../rest/StitchApi';
const SCOPE = 'titleBar';
const semver = require('semver');
import * as constants from '../../utils/constants';

export class PageHeader extends Component {
	async componentDidMount() {
		await this.displayAnnouncements();
	}

	async componentDidUpdate(prevProps) {
		if (this.props.supportedVersion !== prevProps.supportedVersion) {
			await this.displayAnnouncements();
		}
	}

	async displayClusterWarning() {
		if (!this.props.supportedVersion) return false;
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
			console.log('Announcement Error displayClusterWarning', e);
		}
		return isClusterWarning;
	}

	async displayCertWarning() {
		let certs = [];
		let parsed_certs = [];
		try {
			const allNodes = await NodeRestApi.getAllNodes();
			let needToWarnCertExpiry = false;
			allNodes.forEach(node => {
				const eCert = _.get(node, 'msp.component.ecert');
				const tlsCert = _.get(node, 'msp.component.tls_cert');
				if (eCert) certs.push(eCert);
				if (tlsCert) certs.push(tlsCert);

				// if we have updated their tls cert, show the "certs can expire warning" notification
				if (node.type === 'fabric-peer' || node.type === 'fabric-orderer') {
					if (this.isTlsCertUpdated(tlsCert)) {
						gatherCerts2Warn(node);
						needToWarnCertExpiry = true;
					}
				}
			});
			decideOnCertUpdateWarning(this, needToWarnCertExpiry);
		} catch (e) {
			console.log('Announcement Error displayCertWarning', e);
		}
		const shortest = Helper.getExpiryMulti(certs);
		return shortest < constants.CERTIFICATE_WARNING_BANNER_DAYS;

		// decide if we should show the warning that certs can expire
		function decideOnCertUpdateWarning(self, warnCertExpiry) {
			if (warnCertExpiry) {
				self.props.updateState(SCOPE, {
					showCertUpdateNotice: true,
					upCompList: self.buildCertDetailsStr(parsed_certs),
				});
			} else {
				self.props.updateState(SCOPE, {
					showCertUpdateNotice: false,
					upCompList: '',
				});
			}
		}

		// gather the enrollment and admin certs for a component that had a tls cert that was updated
		// will show these cert details in the notification
		function gatherCerts2Warn(node_obj) {
			const eCert = _.get(node_obj, 'msp.component.ecert');
			const e_cert = StitchApi.parseCertificate(eCert);
			if (e_cert) {
				e_cert._comp_id = node_obj.id;
				e_cert._type = 'ecert';
				parsed_certs.push(e_cert);
			}

			if (node_obj.msp && node_obj.msp.component && node_obj.msp.component.admin_certs) {
				for (let i in node_obj.msp.component.admin_certs) {
					const admin_cert = StitchApi.parseCertificate(node_obj.msp.component.admin_certs[i]);
					if (admin_cert) {
						admin_cert._comp_id = node_obj.id;
						admin_cert._type = 'admin_cert';
						parsed_certs.push(admin_cert);
					}
				}
			}
		}
	}

	async displayAnnouncements() {
		let isClusterWarning = await this.displayClusterWarning();
		let isCertWarning = await this.displayCertWarning();
		let stateUpdate = {};
		if (isClusterWarning || isCertWarning) {
			const showAnnouncementFlag = getFromStorage('showAnnouncement');
			if (!showAnnouncementFlag || showAnnouncementFlag === null) {
				stateUpdate = {
					showAnnouncement: true,
					showAnnouncementButton: false,
				};
			} else {
				stateUpdate = {
					showAnnouncement: false,
					showAnnouncementButton: true,
				};
			}
		} else {
			stateUpdate = {
				showAnnouncement: false,
				showAnnouncementButton: false,
			};
			removeFromStorage('showAnnouncement');
		}
		stateUpdate.isClusterWarning = isClusterWarning;
		stateUpdate.isCertWarning = isCertWarning;
		this.props.updateState(SCOPE, stateUpdate);
	}

	// parse each cert in the create component response
	parseAllCompCerts(componentsArray) {
		let parsed_certs = [];
		if (Array.isArray(componentsArray)) {
			for (let i in componentsArray) {
				const component_id = componentsArray[i].id ? componentsArray[i].id : '-';
				const ecert = StitchApi.parseCertificate(componentsArray[i].msp.component.ecert);
				if (ecert) {
					ecert._comp_id = component_id;
					ecert._type = 'ecert';
					parsed_certs.push(ecert);
				}

				for (let x in componentsArray[i].msp.component.admin_certs) {
					const admin_cert = StitchApi.parseCertificate(componentsArray[i].msp.component.admin_certs[x]);
					if (admin_cert) {
						admin_cert._comp_id = component_id;
						admin_cert._type = 'admin_cert';
						parsed_certs.push(admin_cert);
					}
				}
			}
		}
		return parsed_certs;
	}

	// check if this cert has been changed by looking at its expiration and comparing to the expiration in local storage
	isTlsCertUpdated(tlsCert) {
		const LS_KEY_EXPIRATIONS = 'ibp_cert_expiry_by_serial';			// local storage key for the cert update check
		const LS_EXPIRATIONS_MAX_LEN = 256;								// max number of cert serials to store in local storage
		const recent_cert_parsed = StitchApi.parseCertificate(tlsCert);

		if (recent_cert_parsed) {
			const serial = (recent_cert_parsed && recent_cert_parsed.serial_number_hex) ? recent_cert_parsed.serial_number_hex : null;
			const stored_expiration = getCertExpirationFromLs(serial);

			if (stored_expiration) {
				// check if updated
				if (Number(stored_expiration) !== Number(recent_cert_parsed.not_after_ts)) {
					// update storage
					addCertExpirationToLs(recent_cert_parsed);
					return true;
				}
			} else {
				// add to storage
				addCertExpirationToLs(recent_cert_parsed);
			}
		}
		return false;

		// retrieve certificate expiration from local storage by its serial (hex string)
		function getCertExpirationFromLs(cert_serial) {
			const cert_expirations = getLsCertKey();
			const cert_expiration = cert_expirations[cert_serial];
			return cert_expiration;
		}

		// add or update certificate expiration to local storage by its serial (hex string)
		function addCertExpirationToLs(parsed_cert) {
			const cert_expirations = getLsCertKey();

			// make room for this key if we have too many
			const keys = Object.keys(cert_expirations);
			if (keys && keys.length > LS_EXPIRATIONS_MAX_LEN) {				// over x certs? delete 1
				const firstKey = keys[0];
				delete cert_expirations[firstKey];
			}

			// add or update this serial
			cert_expirations[parsed_cert.serial_number_hex] = parsed_cert.not_after_ts;
			localStorage.setItem(LS_KEY_EXPIRATIONS, JSON.stringify(cert_expirations));
		}

		// get the cert expiry data form local storage
		function getLsCertKey() {
			let cert_expirations = {};
			try {
				const temp = JSON.parse(localStorage.getItem(LS_KEY_EXPIRATIONS));
				if (temp) {
					cert_expirations = temp;
				}
			} catch (e) {
				console.error('unable to parse or get cert expiry data from local storage:', e);
			}
			return cert_expirations;
		}
	}

	// make line for each cert that needs to be warned.
	// this is shown in the cert warn notifications
	buildCertDetailsStr(parsed_certs) {

		// sort by expiring first
		if (parsed_certs.length > 0) {
			parsed_certs.sort(function(a, b) {
				return a.not_after_ts - b.not_after_ts;
			});
		}

		let details = '';				// string of certificate expiration details, no translation b/c its not english
		for (let i in parsed_certs) {
			details += '[' + parsed_certs[i]._comp_id + '] ' + parsed_certs[i]._type + ' - ' + parsed_certs[i].serial_number_hex + '<br/>';
			details += '<b>- ' + new Date(parsed_certs[i].not_after_ts).toLocaleString() + '</b><br/>';
		}
		return details;
	}

	render() {
		const translate = this.props.translate;
		const created_parsed_certs = this.parseAllCompCerts(this.props.createdArr);
		let details = this.buildCertDetailsStr(created_parsed_certs);

		return (
			<div className="ibp-page-header">
				{this.props.showAnnouncement && this.props.isClusterWarning && (
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
				{this.props.showAnnouncement && this.props.isCertWarning && (
					<InlineNotification
						kind="error"
						title={translate('cert_warning')}
						subtitle={translate('cert_expiry_error')}
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
				{this.props.showCertNotice && created_parsed_certs.length > 0(
					<InlineNotification
						kind="warning"
						title={translate('cert_warning')}
						subtitle={translate('certs_expire_details', { details: details })}
						hideCloseButton={false}
						onCloseButtonClick={() => {
							this.props.updateState(SCOPE, {
								showCertNotice: false,
							});
						}}
					/>
				)}
				{this.props.showCertUpdateNotice && (
					<InlineNotification
						kind="warning"
						title={translate('cert_warning')}
						subtitle={translate('cert_update_expire_warn', { upCompList: this.props.upCompList })}
						hideCloseButton={false}
						onCloseButtonClick={() => {
							this.props.updateState(SCOPE, {
								showCertUpdateNotice: false,
							});
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
	isClusterWarning: PropTypes.bool,
	isCertWarning: PropTypes.bool,
	headerTooltip: PropTypes.string,
	staticHeader: PropTypes.bool,
	subtext: PropTypes.string,
	createdArr: PropTypes.array,
	showCertNotice: PropTypes.bool,
	showCertUpdateNotice: PropTypes.bool,
	upCompList: PropTypes.string,
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
