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
import { Button, SkeletonPlaceholder, SkeletonText, Tab, Tabs } from 'carbon-components-react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { clearNotifications, showBreadcrumb, showError, showSuccess, updateBreadcrumb, updateState } from '../../redux/commonActions';
import ComponentApi from '../../rest/ComponentApi';
import { NodeRestApi } from '../../rest/NodeRestApi';
import { PeerRestApi } from '../../rest/PeerRestApi';
import ActionsHelper from '../../utils/actionsHelper';
import * as constants from '../../utils/constants';
import Helper from '../../utils/helper';
import NodeStatus from '../../utils/status';
import CertificateList from '../CertificateList/CertificateList';
import ItemContainer from '../ItemContainer/ItemContainer';
import Logger from '../Log/Logger';
import NodeDetails from '../NodeDetails/NodeDetails';
import PageContainer from '../PageContainer/PageContainer';
import PageHeader from '../PageHeader/PageHeader';
import PeerChaincode from '../PeerChaincode/PeerChaincode';
import PeerChannels from '../PeerChannels/PeerChannels';
import PeerModal from '../PeerModal/PeerModal';
import ReallocateModal from '../ReallocateModal/ReallocateModal';
import SidePanelWarning from '../SidePanelWarning/SidePanelWarning';
import StickySection from '../StickySection/StickySection';
import TranslateLink from '../TranslateLink/TranslateLink';

const SCOPE = 'peerDetails';
const Log = new Logger(SCOPE);
const semver = require('semver');

class PeerDetails extends Component {
	constructor(props) {
		super(props);
		this.initialized = false;
	}

	componentDidMount() {
		this.props.updateState(SCOPE, {
			details: {},
			usageModal: false,
			showSettings: false,
			usageInfo: null,
		});
		this.pathname = this.props.history.location.pathname;
		this.props.showBreadcrumb(null, null, this.pathname);
		this.refresh();
		this.initialized = true;
	}

	refresh = skipStatusCache => {
		NodeStatus.cancel();
		this.props.updateState(SCOPE, { loading: true, usageInfo: null });
		PeerRestApi.getPeerDetails(this.props.match.params.peerId, false)
			.then(async peer => {
				try {
					// Get complete config from deployer because the value stored in database stores only the latest config override json
					const current_config = await NodeRestApi.getCurrentNodeConfig(peer);
					if (!_.isEmpty(current_config)) {
						_.set(peer, 'config_override.peer', current_config.peer);
					}
				} catch (error) {
					Log.error(error);
				}
				this.props.updateState(SCOPE, { details: peer });
				this.props.updateBreadcrumb('peer_details_title', { peerName: peer.name }, this.pathname);
				if (!peer.associatedIdentity) {
					this.timestamp = 0;
					this.props.updateState(SCOPE, { loading: false });
				} else {
					this.timestamp = new Date().getTime();
					setTimeout(() => {
						// after 30 seconds, if we still do not have a response, show
						// the not available message
						if (this.timestamp) {
							this.props.updateState(SCOPE, { notAvailable: true });
						}
					}, 30000);
					this.checkHealth(peer, skipStatusCache);
				}
				ComponentApi.getUsageInformation(peer)
					.then(usageInfo => {
						this.props.updateState(SCOPE, { usageInfo });
					})
					.catch(error => {
						Log.error(error);
					});
			})
			.catch(error => {
				Log.error(error);
				this.props.updateState(SCOPE, { loading: false });
				this.props.showError('error_peer_not_found', { peerId: this.props.match.params.peerId }, SCOPE);
			});
	};

	componentWillUnmount() {
		this.initialized = false;
		this.props.clearNotifications(SCOPE);
		NodeStatus.cancel();
		this.props.updateState(SCOPE, {
			details: {},
			showSettings: false,
		});
	}

	checkHealth(peer, skipStatusCache) {
		NodeStatus.getStatus(
			{
				...peer,
				skip_cache: skipStatusCache,
			},
			SCOPE,
			'details',
			() => {
				this.timestamp = 0;
				this.props.updateState(SCOPE, {
					notAvailable: false,
					loading: false,
				});
			}
		);
	}

	getActionLink(status) {
		const translate = this.props.translate;
		if (status === 'running')
			return (
				<div className="ibp-peer-details-status-link">
					<span className="ibp-link"
						onClick={this.stopPeer}
					>
						{translate('stop_peer')}
					</span>
				</div>
			);
		if (status === 'stopped')
			return (
				<div className="ibp-peer-details-status-link">
					<span className="ibp-link"
						onClick={this.startPeer}
					>
						{translate('start_peer')}
					</span>
				</div>
			);
	}

	startPeer = () => {
		PeerRestApi.startPeer(this.props.details.id).then(() => {
			this.refresh();
		});
	};

	stopPeer = () => {
		PeerRestApi.stopPeer(this.props.details.id).then(() => {
			this.refresh();
		});
	};

	openPeerSettings = type => {
		this.props.updateState(SCOPE, {
			showSettings: true,
			peerModalType: type,
		});
	};

	closePeerSettings = () => {
		this.props.updateState(SCOPE, { showSettings: false });
	};

	exportPeer = () => {
		Helper.exportNode(this.props.details);
	};

	refreshCerts = async() => {
		try {
			const resp = await NodeRestApi.getUnCachedDataWithDeployerAttrs(this.props.details.id);
			this.refresh();
			Log.debug('Refresh cert response:', resp);
			this.props.showSuccess('cert_refresh_successful', {}, SCOPE);
		} catch (error) {
			Log.error(`Refresh Failed: ${error}`);
			this.props.showError('cert_refresh_error', {}, SCOPE);
		}
	};

	renderNoIdentity(translate) {
		return (
			<div className="ibp-peer-no-identity">
				{this.props.loading ? (
					<SkeletonPlaceholder
						style={{
							cursor: 'pointer',
							height: '2rem',
							width: '10rem',
						}}
					/>
				) : (
					<div>
						<p>{translate('peer_no_identity')}</p>
						<Button id="no-identity-button"
							onClick={() => this.openPeerSettings('associate')}
						>
							{translate('associate_identity')}
						</Button>
					</div>
				)}
			</div>
		);
	}

	renderNodeVersion(translate) {
		if (!this.props.details || this.props.details.location !== 'ibm_saas' || !ActionsHelper.canCreateComponent(this.props.userInfo)) {
			return;
		}
		// Do not show HSM for now
		const show_hsm = false;
		const isUpgradeAvailable = this.props.details.isUpgradeAvailable;
		let className = 'ibp-node-info-tab';
		let upgrade_version = null;
		if (isUpgradeAvailable) {
			className = className + ' ibp-upgrade-available';
			this.props.details.upgradable_versions.forEach(ver => {
				if (upgrade_version === null || semver.gt(ver, upgrade_version)) {
					upgrade_version = ver;
				}
			});
		}
		const hsm = Helper.getHSMBCCSP(_.get(this.props, 'details.config_override.peer')) === 'PKCS11';
		return (
			<div className="ibp-node-version-and-hsm">
				{this.props.details && this.props.details.version && (
					<div className={className}>
						<div className="ibp-node-version-section">
							<h3>{translate('fabric_version')}</h3>
							<p className="ibp-node-version-value">{translate(isUpgradeAvailable ? 'fabric_update_available' : 'fabric_up_to_date', { upgrade_version })}</p>
							{isUpgradeAvailable && (
								<div className="ibp-new-version-actions">
									<a
										className="ibp-new-version-release-notes"
										href={translate('release_notes_docs', { DOC_PREFIX: this.props.docPrefix })}
										target="_blank"
										rel="noopener noreferrer"
									>
										{translate('view_release_notes')}
									</a>
									<Button id="patch_node"
										kind="primary"
										className="ibp-patch-button"
										onClick={() => this.openPeerSettings('upgrade')}
									>
										{translate('update_version')}
									</Button>
								</div>
							)}
						</div>
					</div>
				)}
				{show_hsm && this.props.feature_flags && this.props.feature_flags.hsm_enabled && (
					<div className="ibp-node-info-tab ibp-hsm-tab">
						<h3>{translate('hsm')}</h3>
						<p className="ibp-node-version-value">{translate('hsm_desc')}</p>
						<Button
							id={hsm ? 'manage_hsm' : 'enable_hsm'}
							kind="primary"
							className="ibp-update-hsm-button"
							onClick={() => this.openPeerSettings(hsm ? 'manage_hsm' : 'enable_hsm')}
						>
							{translate(hsm ? 'manage_hsm' : 'enable_hsm')}
						</Button>
					</div>
				)}
			</div>
		);
	}

	renderUsageCategory(translate, category) {
		if (!_.get(this.props, 'usageInfo.resources.' + category) && category !== 'leveldb') {
			return null;
		}
		const res = {
			name: translate(category + '_container'),
			cpu: '-',
			memory: '-',
			storage: '-',
		};
		if (category !== 'leveldb') {
			res.cpu = Helper.normalizeCpu(_.get(this.props, 'usageInfo.resources.' + category + '.requests.cpu'));
			res.memory = Helper.normalizeMemory(_.get(this.props, 'usageInfo.resources.' + category + '.requests.memory'), 'M');
		}
		if (category === 'peer' || category === 'couchdb' || category === 'leveldb') {
			let value = '0';
			if (category === 'peer') {
				value = _.get(this.props, 'usageInfo.storage.peer.size');
			} else {
				value = _.get(this.props, 'usageInfo.storage.statedb.size');
				if (category === 'leveldb' && !value) {
					value = _.get(this.props, 'usageInfo.storage.leveldb.size');
				}
				if (!value) {
					value = _.get(this.props, 'usageInfo.storage.couchdb.size');
				}
			}
			res.storage = Helper.normalizeMemory(value, 'Gi');
		}
		return res;
	}

	showUsageModal = () => {
		this.props.updateState(SCOPE, { usageModal: true });
	};

	hideUsageModal = () => {
		this.props.updateState(SCOPE, { usageModal: false });
	};

	isPeerV2() {
		let v2 = false;
		if (this.props.details && this.props.details.version) {
			if (semver.gte(semver.coerce(this.props.details.version), semver.coerce('2.0'))) {
				v2 = true;
			}
		}
		return v2;
	}

	renderUsage(translate) {
		if (!this.props.details) {
			return;
		}
		let isCouchStateDb = !this.props.details.state_db || this.props.details.state_db === 'couchdb';
		let items = [];
		items.push(this.renderUsageCategory(translate, 'peer'));
		items.push(this.renderUsageCategory(translate, isCouchStateDb ? 'couchdb' : 'leveldb'));
		if (!this.isPeerV2()) {
			items.push(this.renderUsageCategory(translate, 'dind'));
		}
		if (this.isPeerV2()) {
			items.push(this.renderUsageCategory(translate, 'chaincodelauncher'));
		}
		items.push(this.renderUsageCategory(translate, 'proxy'));
		if (!this.isPeerV2()) {
			items.push(this.renderUsageCategory(translate, 'fluentd'));
		}
		items = items.filter(item => !!item);
		return (
			<div className="ibp-usage-div">
				<NodeDetails node={this.props.details} />
				{this.props.details.location === 'ibm_saas' && (
					<div>
						{this.renderNodeVersion(translate)}
						{this.props.clusterType === 'free' ? (
							<div>
								<p>{translate('not_available_for_free_cluster')}</p>
							</div>
						) : (
							<ItemContainer
								id="peer_usage_table"
								itemId="peer_usage_table"
								pageSize={items.length}
								items={items}
								listMapping={[
									{
										header: 'resource',
										attr: 'name',
									},
									{
										header: 'cpu',
										attr: 'cpu',
									},
									{
										header: 'memory',
										attr: 'memory',
									},
									{
										header: 'storage',
										attr: 'storage',
									},
								]}
								addItems={[
									{
										text: 'reallocate_resources',
										fn: this.showUsageModal,
									},
								]}
							/>
						)}
					</div>
				)}
			</div>
		);
	}

	getStickySectionGroups(translate) {
		let versionLabel = this.props.details && this.props.details.version ? this.props.details.version : translate('version_not_found');
		if (this.props.details && this.props.details.isUnsupported) {
			versionLabel = translate('unsupported');
		}
		const groups = [
			{
				label: 'node_location',
				value: this.props.details && this.props.details.location ? translate(this.props.details.location) : '',
				loadingData: this.props.details && !this.props.details.location,
			},
			{
				label: 'node_version_title',
				value: versionLabel,
				loadingData: this.props.details && !this.props.details.name && !this.props.details.version,
			},
		];

		if (this.props.details && this.props.details.location === 'ibm_saas') {
			groups.push({
				label: 'peer_state_database',
				value: this.props.details && this.props.details.state_db ? this.props.details.state_db : translate('couchdb'),
				loadingData: this.props.details && !this.props.details.name,
			});
		}
		const hsm = Helper.getHSMBCCSP(_.get(this.props, 'details.config_override.peer')) === 'PKCS11';
		if (this.props.feature_flags && this.props.feature_flags.hsm_enabled && this.props.details && this.props.details.location === 'ibm_saas') {
			groups.push({
				label: 'hsm',
				value: translate(hsm ? 'enabled' : 'not_used'),
				loadingData: this.props.details && !this.props.details.name,
			});
		}
		if (
			this.props.details &&
			this.props.details.location === 'ibm_saas' &&
			this.props.workerZones &&
			this.props.workerZones.length > 1 &&
			this.props.details &&
			this.props.details.zone
		) {
			groups.push({
				label: 'worker_zone',
				value: this.props.details.zone,
				loadingData: this.props.details && !this.props.details.name,
			});
		}
		const node_ou = _.get(this.props.details, 'node_ou.enabled') ? 'enabled' : 'disabled';
		if (this.props.details && this.props.details.location === 'ibm_saas') {
			groups.push({
				label: 'node_ou',
				value: translate(node_ou),
				loadingData: this.props.details && !this.props.details.location,
			});
			if (this.props.details && this.props.details.msp && this.props.details.msp.component.admin_certs && node_ou === 'disabled') {
				const admin_certs = _.get(this.props.details, 'msp.component.admin_certs');
				if (admin_certs) {
					groups.push({
						label: 'admin_certs_expiry',
						value: <CertificateList certs={admin_certs} />,
						loadingData: this.props.details && !this.props.details.msp.component.admin_certs,
					});
				}
			}
		}

		if (this.props.details && this.props.details.msp) {
			const ecert = _.get(this.props.details, 'msp.component.ecert');
			if (ecert) {
				groups.push({
					label: 'ecert_expiry',
					value: <CertificateList certs={[ecert]} />,
					loadingData: this.props.details && !this.props.details.msp,
				});
			}
		}
		if (this.props.details && this.props.details.msp) {
			const tls_cert = _.get(this.props.details, 'msp.component.tls_cert');
			if (tls_cert) {
				groups.push({
					label: 'tls_cert_expiry',
					value: <CertificateList certs={[tls_cert]} />,
					loadingData: this.props.details && !this.props.details.msp.component.tls_cert,
				});
			}
		}
		if (this.props.details && this.props.details.msp) {
			const tls_ca_root_certs = _.get(this.props.details, 'msp.tlsca.root_certs');
			if (tls_ca_root_certs) {
				const expiry = Helper.getLongestExpiry(tls_ca_root_certs);
				if (expiry < constants.CERTIFICATE_SHOW_YEARS) {
					groups.push({
						label: 'tls_ca_root_cert_expiry',
						value: <CertificateList certs={tls_ca_root_certs} />,
						loadingData: this.props.details && !this.props.details.msp,
					});
				}
			}
		}
		return groups;
	}

	render() {
		const { details } = this.props;
		const peerName = this.props.details ? this.props.details.name : '';
		const peerNameSkeleton = this.props.details && !this.props.details.name && (
			<SkeletonText
				style={{
					paddingTop: '.5rem',
					width: '8rem',
					height: '2.5rem',
				}}
			/>
		);
		const translate = this.props.translate;
		const notAvailable = this.props.notAvailable || (details && details.status === 'unknown');
		return (
			<PageContainer>
				<PageHeader history={this.props.history}
					headerName={peerName ? translate('peer_details_title', { peerName: peerName }) : ''}
				/>
				{peerNameSkeleton}
				<div className="ibp-peer-details bx--row">
					<div className="bx--col-lg-4">
						<div className="ibp-node-details-panel">
							<div className="ibp-node-details-header">
								<div className="ibp-node-tags" />
								<StickySection
									openSettings={this.openPeerSettings}
									details={this.props.details}
									title="peer"
									exportNode={this.exportPeer}
									associateIdentityLabel="peer_identity"
									loading={this.props.loading}
									identityNotAssociatedLabel="identity_not_associated_peer"
									groups={this.getStickySectionGroups(translate)}
									refreshCerts={this.refreshCerts}
									hideRefreshCerts={this.props.details && this.props.details.location !== 'ibm_saas'}
								/>
							</div>
						</div>
					</div>
					<div className="bx--col-lg-12">
						{notAvailable && (
							<div className="ibp-not-available ibp-error-panel">
								<SidePanelWarning
									title="peer_not_available_title"
									subtitle={
										<>
											<p className="ibp-not-available">{translate('peer_not_available_text')}</p>
											<TranslateLink
												text="peer_not_available_logs"
												params={{
													_PEER_LOGS_LINK: this.props.platform === 'openshift' ? '_PEER_LOGS_LINK_SW' : '_PEER_LOGS_LINK',
												}}
											/>
										</>
									}
								/>
							</div>
						)}
						{_.get(this.props, 'usageInfo.crstatus.type') === 'Warning' && _.get(this.props, 'usageInfo.crstatus.reason') === 'certRenewalRequired' && (
							<div className="ibp-peer-warning ibp-error-panel">
								<SidePanelWarning title="peer_warning_title"
									subtitle="peer_warning_text"
								/>
								<TranslateLink className="ibp-peer-details-cert-expiry-link"
									text="cert_renew"
								/>
							</div>
						)}
						{details && (
							<Tabs aria-label="sub-navigation">
								<Tab id="ibp-peer-details"
									label={translate('details')}
								>
									{this.props.details && !this.props.details.associatedIdentity ? (
										<div>{this.renderNoIdentity(translate)}</div>
									) : (
										<div>
											<PeerChannels match={this.props.match}
												peer={this.props.details}
												history={this.props.history}
												parentLoading={this.props.loading}
											/>
											<PeerChaincode match={this.props.match}
												peer={this.props.details}
												parentLoading={this.props.loading}
											/>
										</div>
									)}
								</Tab>
								<Tab
									id="ibp-peer-usage"
									className={
										details.isUpgradeAvailable && details.location === 'ibm_saas' && ActionsHelper.canCreateComponent(this.props.userInfo)
											? 'ibp-patch-available-tab'
											: ''
									}
									label={translate('usage_info', {
										patch:
											details.isUpgradeAvailable && details.location === 'ibm_saas' && ActionsHelper.canCreateComponent(this.props.userInfo) ? (
												<div className="ibp-details-patch-container">
													<div className="ibp-patch-available-tag ibp-node-details"
														onClick={() => this.openPeerSettings('upgrade')}
													>
														{translate('patch_available')}
													</div>
												</div>
											) : (
												''
											),
									})}
								>
									{this.renderUsage(translate)}
								</Tab>
							</Tabs>
						)}
						{details && this.props.showSettings && (
							<PeerModal
								peer={this.props.details}
								onClose={this.closePeerSettings}
								peerModalType={this.props.peerModalType}
								onComplete={peer => {
									switch (this.props.peerModalType) {
										case 'delete':
											this.props.history.goBack();
											break;
										case 'upgrade':
											this.props.updateState(SCOPE, {
												details: {
													...this.props.details,
													...peer,
												},
											});
											this.refresh(true);
											break;
										case 'associate':
											this.props.updateState(SCOPE, {
												details: {
													...this.props.details,
													...peer,
												},
											});
											this.refresh(true);
											break;
										default:
											if (peer) {
												// Clear the associated identity to force the
												// child components (channels and chaincode) to
												// be removed from the DOM.  They will be recreated
												// when we update the state with the new peer details.
												this.props.updateState(SCOPE, {
													details: {
														...this.props.details,
														associatedIdentity: null,
													},
												});
												this.props.updateState(SCOPE, {
													details: {
														...this.props.details,
														...peer,
													},
												});
												this.props.updateBreadcrumb('peer_details_title', { peerName: peer.name }, this.pathname);
											} else {
												this.refresh(true);
											}
											break;
									}
								}}
							/>
						)}
						{this.props.usageModal && (
							<ReallocateModal
								details={this.props.details}
								usageInfo={this.props.usageInfo}
								onClose={this.hideUsageModal}
								onComplete={() => {
									this.props.updateState(SCOPE, { usageInfo: null });
									ComponentApi.getUsageInformation(this.props.details)
										.then(usageInfo => {
											this.props.updateState(SCOPE, { usageInfo });
										})
										.catch(error => {
											Log.error(error);
										});
								}}
								ignore={this.isPeerV2() ? ['dind', 'fluentd'] : ['chaincodelauncher']}
							/>
						)}
					</div>
				</div>
			</PageContainer>
		);
	}
}

const dataProps = {
	details: PropTypes.object,
	channels: PropTypes.array,
	chaincode: PropTypes.array,
	match: PropTypes.object,
	loading: PropTypes.bool,
	history: PropTypes.object,
	showSettings: PropTypes.bool,
	notAvailable: PropTypes.bool,
	peerModalType: PropTypes.string,
	usageModal: PropTypes.bool,
	usageInfo: PropTypes.object,
};

PeerDetails.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	showBreadcrumb: PropTypes.func,
	updateBreadcrumb: PropTypes.func,
	showError: PropTypes.func,
	showSuccess: PropTypes.func,
	clearNotifications: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps.clusterType = _.get(state, 'settings.cluster_data.type');
		newProps['userInfo'] = state['userInfo'] ? state['userInfo'] : null;
		newProps['workerZones'] = _.get(state, 'settings.cluster_data.zones');
		newProps['feature_flags'] = state['settings'] ? state['settings']['feature_flags'] : null;
		newProps['docPrefix'] = state['settings'] ? state['settings']['docPrefix'] : null;
		newProps['platform'] = state['settings'] ? state['settings']['platform'] : null;
		return newProps;
	},
	{
		showBreadcrumb,
		showError,
		showSuccess,
		updateBreadcrumb,
		updateState,
		clearNotifications,
	}
)(withLocalize(PeerDetails));
