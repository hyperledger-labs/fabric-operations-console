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
import { Button, Row, SkeletonPlaceholder, SkeletonText, Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import emptyImage from '../../assets/images/empty_msps.svg';
import { clearNotifications, showBreadcrumb, showError, showSuccess, updateBreadcrumb, updateState } from '../../redux/commonActions';
import { CertificateAuthorityRestApi } from '../../rest/CertificateAuthorityRestApi';
import IdentityApi from '../../rest/IdentityApi';
import { NodeRestApi } from '../../rest/NodeRestApi';
import ActionsHelper from '../../utils/actionsHelper';
import * as constants from '../../utils/constants';
import Helper from '../../utils/helper';
import NodeStatus from '../../utils/status';
import CAAddUserModal from '../CAAddUserModal/CAAddUserModal';
import CAModal from '../CAModal/CAModal';
import CertificateList from '../CertificateList/CertificateList';
import DeleteCAUserModal from '../DeleteCAUser/DeleteCAUserModal';
import GenerateCertificateModal from '../GenerateCertificate/GenerateCertificateModal';
import ItemContainer from '../ItemContainer/ItemContainer';
import Logger from '../Log/Logger';
import NodeDetails from '../NodeDetails/NodeDetails';
import PageContainer from '../PageContainer/PageContainer';
import PageHeader from '../PageHeader/PageHeader';
import ReallocateModal from '../ReallocateModal/ReallocateModal';
import SidePanelWarning from '../SidePanelWarning/SidePanelWarning';
import StickySection from '../StickySection/StickySection';
import UserDetailsModal from '../UserDetailsModal/UserDetailsModal';
import withRouter from '../../hoc/withRouter';

const SCOPE = 'caDetails';
const Log = new Logger(SCOPE);
const semver = require('semver');

export class CADetails extends Component {
	componentDidMount() {
		this.pathname = this.props.history.location.pathname;
		this.props.showBreadcrumb(null, null, this.pathname);
		this.getDetails(false);
	}

	componentWillUnmount() {
		this.props.clearNotifications(SCOPE);
	}

	getDetails = (skipStatusCache) => {
		this.props.updateState(SCOPE, {
			loading: true,
			affiliations: [],
			users: [],
			selectedTab: 'ca',
			notAvailable: false,
			details: {},
			usageModal: false,
			usageInfo: null,
		});
		CertificateAuthorityRestApi.getCADetails(this.props.match.params.caId, null, skipStatusCache)
			.then(async (details) => {
				this.props.updateBreadcrumb('breadcrumb_name', { name: details.name }, this.pathname);
				try {
					// Get complete config from deployer because the value stored in database stores only the latest config override json
					const current_config = await NodeRestApi.getCurrentNodeConfig(details);
					if (!_.isEmpty(current_config)) {
						_.set(details, 'config_override.ca', current_config.ca);
					}
				} catch (error) {
					Log.error(error);
				}
				this.props.updateState(SCOPE, {
					details,
				});
				this.timestamp = new Date().getTime();
				setTimeout(
					() => {
						// after 15 (or 5) seconds, if we do not have a response, show
						// the not available message
						if (this.timestamp) {
							this.props.updateState(SCOPE, { notAvailable: true, loading: false });
						}
					},
					details.associatedIdentity ? 15000 : 5000
				);
				NodeStatus.getStatus(
					{
						...details,
						skip_cache: !!skipStatusCache,
					},
					SCOPE,
					'details',
					() => {
						this.timestamp = 0;
						this.props.updateState(SCOPE, { notAvailable: false });
						this.getUsers(details);
					}
				);
				NodeRestApi.getCompsResources(details)
					.then((usageInfo) => {
						this.props.updateState(SCOPE, { usageInfo });
					})
					.catch((error) => {
						Log.error(error);
					});
			})
			.catch((error) => {
				Log.error(error);
				this.props.updateState(SCOPE, {
					details: null,
					users: [],
					loading: false,
					notAvailable: false,
				});
				this.props.showError('error_ca_not_found', { caId: this.props.match.params.caId }, SCOPE);
			});
	};

	getUsers(details) {
		this.props.clearNotifications(SCOPE);
		// Must have an identity
		if (!details.associatedIdentity) {
			this.props.updateState(SCOPE, {
				users: [],
				affiliations: [],
				loading: false,
			});
			return;
		}
		this.props.updateState(SCOPE, { loading: true });
		CertificateAuthorityRestApi.getUsers(details)
			.then((users) => {
				this.props.updateState(SCOPE, {
					users,
				});
				this.getAffiliations(details);
			})
			.catch((error) => {
				Log.error(error);
				this.props.updateState(SCOPE, {
					users: [],
					affiliations: [],
					loading: false,
				});
				this.props.showError('error_ca_users', { caId: this.props.match.params.caId }, SCOPE);
			});
	}

	getAffiliations(details) {
		CertificateAuthorityRestApi.getAffiliations(details)
			.then((list) => {
				const affiliations = [];
				list.forEach((org) => {
					affiliations.push({ name: org.name });
					if (org.affiliations) {
						org.affiliations.forEach((a) => {
							affiliations.push(a);
						});
					}
				});
				this.props.updateState(SCOPE, {
					affiliations,
					loading: false,
				});
			})
			.catch((error) => {
				Log.error(error);
				this.props.updateState(SCOPE, {
					affiliations: [],
					loading: false,
				});
			});
	}

	openAddUser = () => {
		this.props.updateState(SCOPE, { showAddUser: true });
	};

	closeAddUser = () => {
		this.props.updateState(SCOPE, { showAddUser: false });
	};

	generateCertificate = (selected_user) => {
		this.props.updateState(SCOPE, { showCertificate: true, selectedUser: selected_user });
	};

	closeCertificate = () => {
		this.props.updateState(SCOPE, { showCertificate: false });
	};

	showDeleteUserModal = (selected_user) => {
		this.props.updateState(SCOPE, { showDeleteUser: true, selectedUser: selected_user });
	};

	closeDeleteUser = () => {
		this.props.updateState(SCOPE, { showDeleteUser: false });
	};

	showUserDetails = (user) => {
		this.props.updateState(SCOPE, { userDetails: user });
	};

	hideUserDetails = () => {
		this.props.updateState(SCOPE, { userDetails: null });
	};

	openCASettings = (type) => {
		this.props.updateState(SCOPE, {
			showSettings: true,
			caModalType: type,
		});
	};

	hideCASettings = () => {
		this.props.updateState(SCOPE, { showSettings: false });
	};

	showGenerateCert = (user) => {
		this.generateCertificate(user);
	};

	getButtons() {
		const buttons = [];
		if (this.props.details) {
			buttons.push({
				text: 'reenroll',
				title: 'reenroll_cert_title',
				fn: () => {
					this.generateCertificate(null);
				},
				disabled: !ActionsHelper.canManageComponent(this.props.userInfo, this.props.feature_flags),
				decoupleFromLoading: true,
			});
			buttons.push({
				text: 'register_user',
				fn: this.openAddUser,
				icon: 'plus',
				disabled: !ActionsHelper.canManageComponent(this.props.userInfo, this.props.feature_flags),
				decoupleFromLoading: true,
			});
		}
		return buttons;
	}

	renderItemContainer(translate) {
		return (
			<div id="user-container" className="ibp__user--container">
				{this.props.notAvailable && this.props.loading && (
					<div className="ibp-not-available ibp-error-panel">
						<SidePanelWarning title="ca_not_available_title" subtitle="ca_not_available_text" />
					</div>
				)}
				{this.props.details && !this.props.details.associatedIdentity ? (
					<div>{this.renderNoIdentity(translate)}</div>
				) : (
					<ItemContainer
						containerDesc="register_user_title"
						emptyImage={emptyImage}
						emptyTitle="empty_ca_users_title"
						emptyMessage="empty_ca_users_text"
						containerTitle="registered_users"
						containerTooltip="registered_users_tooltip"
						id="root-ca"
						itemId="ca_users"
						loading={this.props.loading}
						items={this.props.users}
						select={this.showUserDetails}
						menuItems={(user) => [
							{
								text: 'generate_cert',
								fn: () => {
									this.showGenerateCert(user);
								},
							},
							{
								text: 'delete_user',
								fn: () => {
									this.showDeleteUserModal(user);
								},
								requireTitle: true,
								disabled: !ActionsHelper.canManageComponent(this.props.userInfo, this.props.feature_flags),
							},
						]}
						listMapping={[
							{
								header: 'enroll_id',
								attr: 'id',
							},
							{
								header: 'type',
								attr: 'type',
								translate: false,
							},
							{
								header: 'affiliation',
								attr: 'affiliation',
							},
						]}
						buttonText="register_user"
						addItems={this.props.loading && !this.props.details ? null : this.getButtons()}
						isLink={true}
					/>
				)}
			</div>
		);
	}

	generateComplete = (name) => {
		if (!this.props.details.associatedIdentity) {
			IdentityApi.associateCertificateAuthority(name, this.props.details.id)
				.then(() => {
					this.getDetails(true);
				})
				.catch((error) => {
					this.showError('error_associate_identity');
				});
		}
	};

	refreshCerts = async () => {
		try {
			const resp = await NodeRestApi.getUnCachedDataWithDeployerAttrs(this.props.details.id);
			Log.debug('Refresh cert response:', resp);
			this.getDetails(true);
			this.props.showSuccess('cert_refresh_successful', {}, SCOPE);
		} catch (error) {
			Log.error(`Refresh Failed: ${error}`);
			this.props.showError('cert_refresh_error', {}, SCOPE);
		}
	};

	renderNoIdentity(translate) {
		return (
			<div className="ibp-ca-no-identity">
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
						<p>{translate('ca_no_identity')}</p>
						<Button id="no-identity-button" onClick={() => this.openCASettings('associate')}>
							{translate('associate_identity')}
						</Button>
					</div>
				)}
			</div>
		);
	}

	exportCA = () => {
		Helper.exportNode(this.props.details);
	};

	renderNodeVersion(translate) {
		// Do not show HSM for now
		const show_hsm = false;
		if (!this.props.details || this.props.details.location !== 'ibm_saas' || !ActionsHelper.canCreateComponent(this.props.userInfo, this.props.feature_flags)) {
			return;
		}
		const isUpgradeAvailable = this.props.details.isUpgradeAvailable;
		let className = 'ibp-node-info-tab';
		let upgrade_version = null;
		if (isUpgradeAvailable) {
			className = className + ' ibp-upgrade-available';
			this.props.details.upgradable_versions.forEach((ver) => {
				if (upgrade_version === null || semver.gt(ver, upgrade_version)) {
					upgrade_version = ver;
				}
			});
		}
		const hsm = Helper.getHSMBCCSP(_.get(this.props, 'details.config_override.ca')) === 'PKCS11';
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
									<Button id="patch_node" kind="primary" className="ibp-patch-button" onClick={() => this.openCASettings('upgrade')}>
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
							onClick={() => this.openCASettings(hsm ? 'manage_hsm' : 'enable_hsm')}
						>
							{translate(hsm ? 'manage_hsm' : 'enable_hsm')}
						</Button>
					</div>
				)}
			</div>
		);
	}

	renderCAUsage(translate) {
		let count = 1;
		if (this.props.details && this.props.details.replicas) {
			count = this.props.details.replicas;
		}
		const res = {
			name: translate('ca_container'),
			cpu: '-',
			memory: '-',
			storage: '-',
		};
		if (this.props.usageInfo) {
			res.cpu = Helper.normalizeCpu(_.get(this.props, 'usageInfo.resources.ca.requests.cpu'), count);
			res.memory = Helper.normalizeMemory(_.get(this.props, 'usageInfo.resources.ca.requests.memory'), 'M', count);
			const database = _.get(this.props.details, 'config_override.ca.db.type');
			if (database !== 'postgres') {
				res.storage = Helper.normalizeMemory(_.get(this.props, 'usageInfo.storage.ca.size'), 'Gi', count);
			}
		}
		return res;
	}

	showUsageModal = () => {
		this.props.updateState(SCOPE, { usageModal: true });
	};

	hideUsageModal = () => {
		this.props.updateState(SCOPE, { usageModal: false });
	};

	renderUsage(translate) {
		let items = [this.renderCAUsage(translate)];
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
								id="ca_usage_table"
								itemId="ca_usage_table"
								pageSize={1}
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
										disabled: !ActionsHelper.canCreateComponent(this.props.userInfo, this.props.feature_flags),
									},
								]}
							/>
						)}
					</div>
				)}
			</div>
		);
	}

	getStickySectionGroups(translate, database) {
		const groups = [
			{
				label: 'node_location',
				value: this.props.details && this.props.details.location ? translate(this.props.details.location) : '',
				loadingData: this.props.details && !this.props.details.location,
			},
		];
		const hsm = Helper.getHSMBCCSP(_.get(this.props, 'details.config_override.ca')) === 'PKCS11';
		if (this.props.details && (this.props.details.location === 'ibm_saas' || this.props.details.version)) {
			groups.push({
				label: 'node_version_title',
				value: this.props.details && this.props.details.version ? Helper.prettyPrintVersion(this.props.details.version) : translate('version_not_found'),
				loadingData: this.props.details && !this.props.details.name && !this.props.details.version,
			});
		}
		if (this.props.details && this.props.details.location === 'ibm_saas') {
			if (this.props.feature_flags && this.props.feature_flags.hsm_enabled && this.props.details && this.props.details.location === 'ibm_saas') {
				groups.push({
					label: 'hsm',
					value: translate(hsm ? 'enabled' : 'not_used'),
					loadingData: this.props.details && !this.props.details.name,
				});
			}
		}
		groups.push({
			label: 'database',
			value: database === 'postgres' ? translate('postgres') : translate('sqlite3'),
			loadingData: this.props.details && !this.props.details.name,
		});
		if (
			this.props.details &&
			database !== 'postgres' &&
			this.props.workerZones &&
			this.props.workerZones.length > 1 &&
			this.props.details &&
			this.props.details.zone
		) {
			groups.push({
				label: 'ca_zone',
				value: this.props.details.zone,
				loadingData: this.props.details && !this.props.details.name,
			});
		}
		if (this.props.details) {
			const tls_cert = _.get(this.props, 'details.msp.component.tls_cert');
			if (tls_cert) {
				const expiry = Helper.getLongestExpiry(tls_cert);
				if (expiry < constants.CERTIFICATE_SHOW_YEARS) {
					groups.push({
						label: 'tls_cert_expiry',
						value: <CertificateList certs={[tls_cert]} />,
					});
				}
			}
		}
		return groups;
	}

	render() {
		const caName = this.props.details ? this.props.details.name : '';
		const caNameSkeleton = this.props.details && !this.props.details.name && (
			<SkeletonText
				style={{
					paddingTop: '.5rem',
					width: '8rem',
					height: '2.5rem',
				}}
			/>
		);
		const database = _.get(this.props, 'details.config_override.ca.db.type');
		const translate = this.props.t;
		return (
			<PageContainer>
				<Row>
					<PageHeader history={this.props.history} headerName={caName ? translate('ca_details_title', { caName: caName }) : ''} />
				</Row>

				<Row className='ibp-ca-details'>
					{caNameSkeleton}
					<div className="ibp-column width-25">
						<div className="ibp-node-details-panel">
							<div className="ibp-node-tags" />
							<div className="ibp-node-details-header">
								<StickySection
									openSettings={this.openCASettings}
									details={this.props.details}
									title="certificate_Authority_node_title"
									exportNode={this.exportCA}
									associateIdentityLabel="ca_identity_root"
									loading={this.props.loading}
									identityNotAssociatedLabel="identity_not_associated_ca"
									groups={this.getStickySectionGroups(translate, database)}
									refreshCerts={this.refreshCerts}
									hideRefreshCerts={this.props.details && this.props.details.location !== 'ibm_saas'}
									feature_flags={this.props.feature_flags}
									userInfo={this.props.userInfo}
								/>
							</div>
						</div>
					</div>
					<div className="ibp-column width-75 p-lr-10">
						<Tabs className="ibp-tabs-container" aria-label="sub-navigation">
							<TabList contained>
								<Tab id="ibp-ca-detail-tab-root-ca">{translate('details')}</Tab>
								{this.props.details && (
									<Tab
										id="ibp-ca-usage"
										className={
											this.props.details &&
											this.props.details.isUpgradeAvailable &&
											this.props.details.location === 'ibm_saas' &&
											ActionsHelper.canCreateComponent(this.props.userInfo, this.props.feature_flags)
												? 'ibp-patch-available-tab'
												: ''
										}
									>
										{translate('usage_info')}
										{this.props.details &&
										this.props.details.isUpgradeAvailable &&
										this.props.details.location === 'ibm_saas' &&
										ActionsHelper.canCreateComponent(this.props.userInfo, this.props.feature_flags) ? (
												<div className="ibp-details-patch-container">
													<div className="ibp-patch-available-tag ibp-node-details" onClick={() => this.openCASettings('upgrade')}>
														{translate('patch_available')}
													</div>
												</div>
											) : (
												''
											)}
									</Tab>
								)}
							</TabList>

							<TabPanels>
								<TabPanel>
									<div className="ibp-tab-content">
										<p className="ibp-ca-detail-subtext">{translate('root_ca_subtext')}</p>
										{this.renderItemContainer(translate)}
									</div>
								</TabPanel>
								{this.props.details && <TabPanel>{this.renderUsage(translate)}</TabPanel>}
							</TabPanels>
						</Tabs>
					</div>

					<div>
						{this.props.showCertificate && (
							<GenerateCertificateModal
								ca={this.props.details}
								selectedUser={this.props.selectedUser}
								users={this.props.users}
								closed={this.closeCertificate}
								onComplete={this.generateComplete}
							/>
						)}
					</div>
					<div>
						{this.props.showDeleteUser && (
							<DeleteCAUserModal
								ca={this.props.details}
								selectedUser={this.props.selectedUser}
								onClose={this.closeDeleteUser}
								onComplete={() => {
									this.getDetails(true);
								}}
							/>
						)}
					</div>
					<div>
						{this.props.showAddUser && (
							<CAAddUserModal
								ca={this.props.details}
								onClose={this.closeAddUser}
								onComplete={() => {
									this.getDetails(true);
								}}
								affiliations={this.props.affiliations ? this.props.affiliations : []}
								affiliation={this.props.affiliations ? this.props.affiliations[0] : null}
							/>
						)}
						{this.props.usageModal && (
							<ReallocateModal
								details={this.props.details}
								usageInfo={this.props.usageInfo}
								onClose={this.hideUsageModal}
								onComplete={() => {
									this.props.updateState(SCOPE, { usageInfo: null });
									NodeRestApi.getCompsResources(this.props.details)
										.then((usageInfo) => {
											this.props.updateState(SCOPE, { usageInfo });
										})
										.catch((error) => {
											Log.error(error);
										});
								}}
							/>
						)}
						{!!this.props.userDetails && <UserDetailsModal user={this.props.userDetails} onClose={this.hideUserDetails} />}
						{this.props.showSettings && (
							<CAModal
								associatedIdentity={this.props.details.associatedIdentity}
								ca={this.props.details}
								onClose={this.hideCASettings}
								caModalType={this.props.caModalType}
								onComplete={(details, noRefresh) => {
									if (details) {
										if (!noRefresh) {
											this.getDetails(true);
										}
										this.props.showBreadcrumb('breadcrumb_name', { name: details.name }, this.props.history.location.pathname);
									} else {
										this.props.history.goBack();
									}
								}}
							/>
						)}
					</div>
				</Row>
			</PageContainer>
		);
	}
}

const dataProps = {
	history: PropTypes.object,
	loading: PropTypes.bool,
	users: PropTypes.array,
	showCertificate: PropTypes.bool,
	showDeleteUser: PropTypes.bool,
	showAddUser: PropTypes.bool,
	selectedTab: PropTypes.string,
	match: PropTypes.object,
	details: PropTypes.object,
	affiliations: PropTypes.array,
	userDetails: PropTypes.object,
	selectedUser: PropTypes.object,
	showSettings: PropTypes.bool,
	notAvailable: PropTypes.bool,
	caModalType: PropTypes.string,
	usageModal: PropTypes.bool,
	usageInfo: PropTypes.object,
};

CADetails.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	updateBreadcrumb: PropTypes.func,
	showBreadcrumb: PropTypes.func,
	showError: PropTypes.func,
	clearNotifications: PropTypes.func,
	showSuccess: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	(state) => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps.clusterType = _.get(state, 'settings.cluster_data.type');
		newProps['userInfo'] = state['userInfo'] ? state['userInfo'] : null;
		newProps['feature_flags'] = state['settings'] ? state['settings']['feature_flags'] : null;
		newProps['workerZones'] = _.get(state, 'settings.cluster_data.zones');
		newProps['docPrefix'] = state['settings'] ? state['settings']['docPrefix'] : null;
		return newProps;
	},
	{
		clearNotifications,
		updateState,
		updateBreadcrumb,
		showBreadcrumb,
		showError,
		showSuccess,
	}
)(withTranslation()(withRouter(CADetails)));
