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
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import emptyImage from '../../assets/images/empty_nodes.svg';
import { clearNotifications, showBreadcrumb, showError, showSuccess, updateBreadcrumb, updateState } from '../../redux/commonActions';
import { MspRestApi } from '../../rest/MspRestApi';
import { OrdererRestApi } from '../../rest/OrdererRestApi';
import { PeerRestApi } from '../../rest/PeerRestApi';
import StitchApi from '../../rest/StitchApi';
import ActionsHelper from '../../utils/actionsHelper';
import CertificateList from '../CertificateList/CertificateList';
import Helper from '../../utils/helper';
import NodeStatus from '../../utils/status';
import ConnectionProfileModal from '../ConnectionProfileModal/ConnectionProfileModal';
import ItemContainer from '../ItemContainer/ItemContainer';
import ItemTileLabels from '../ItemContainerTile/ItemTileLabels/ItemTileLabels';
import Logger from '../Log/Logger';
import MSPDefinitionModal from '../MSPDefinitionModal/MSPDefinitionModal';
import PageContainer from '../PageContainer/PageContainer';
import PageHeader from '../PageHeader/PageHeader';
import PeersComponent from '../Peers/Peers';
import StickySection from '../StickySection/StickySection';
import withRouter from '../../hoc/withRouter';

const SCOPE = 'organizationDetails';
const Log = new Logger(SCOPE);

class OrganizationDetails extends Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			details: {},
			showSettings: false,
			associatedPeers: [],
			associatedOrderers: [],
			mspModalType: '',
			showConnectionProfile: false,
		});
		this.pathname = this.props.history.location.pathname;
		this.props.showBreadcrumb(null, null, this.pathname);
		this.refresh();
	}

	componentWillUnmount() {
		this.props.clearNotifications(SCOPE);
		NodeStatus.cancel();
		this.props.updateState(SCOPE, {
			details: {},
			showSettings: false,
			showConnectionProfile: false,
		});
	}

	async refresh() {
		NodeStatus.cancel();
		this.props.updateState(SCOPE, { loading: true });
		let msp;
		try {
			msp = await MspRestApi.getMSPDetails(this.props.match.params.mspId, false);
		} catch (error) {
			Log.error(error);
			this.props.updateState(SCOPE, { loading: false });
			this.props.showError('error_msp_not_found', { mspId: this.props.match.params.mspId }, SCOPE);
			return;
		}
		this.props.updateState(SCOPE, { details: msp });
		this.props.updateBreadcrumb('msp_details_title', { mspName: msp.name }, this.pathname);

		try {
			await this.getAssociatedPeers(msp);
			await this.getAssociatedOrderers(msp);
		} catch (error) {
			Log.error('Failed to refresh organization details:', error);
		}
		this.props.updateState(SCOPE, {
			loading: false,
		});
	}

	async getAssociatedPeers(details) {
		let associatedPeers = [];
		let peers;
		try {
			Log.info(`Getting peers associated with msp: ${details.id}`);
			peers = await PeerRestApi.getPeersWithCerts();
		} catch (error) {
			this.props.updateState(SCOPE, {
				associatedPeers,
			});
			throw error;
		}
		for (const peer of peers) {
			let opts = {
				certificate_b64pem: peer.cert,
				root_certs_b64pems: details.root_certs,
				debug_tag: 'msp id: '.concat(details.id),
			};
			if (peer.msp_id === details.msp_id && _.isEqual(peer.msp.ca.root_certs, details.root_certs)) {
				opts.root_certs_b64pems = Helper.safer_concat(opts.root_certs_b64pems, details.intermediate_certs);
			}
			let isCertAssociated = await StitchApi.isIdentityFromRootCert(opts);
			isCertAssociated = isCertAssociated && peer.msp_id === details.msp_id;
			Log.debug('Peer ', peer.id, ' associated with MSP ', details.id, ' ? ', isCertAssociated);
			if (isCertAssociated) {
				associatedPeers.push(peer);
			}
		}
		this.props.updateState(SCOPE, {
			associatedPeers,
		});
	}

	async getAssociatedOrderers(details) {
		let associatedOrderers = [];
		let orderers;
		try {
			Log.info(`Getting orderers associated with msp: ${details.id}`);
			orderers = await OrdererRestApi.getOrderers();
		} catch (error) {
			Log.error(`Could not get orderers associated with msp ${details.id}:`, error);
			this.props.updateState(SCOPE, {
				associatedOrderers,
			});
			throw error;
		}
		for (const orderer of orderers) {
			const nodes = orderer.raft ? orderer.raft : [orderer];
			nodes.forEach(orderingNode => {
				if (orderingNode.location === 'ibm_saas' && orderingNode.msp_id === details.msp_id) {
					const root_certs = _.get(orderingNode, 'msp.ca.root_certs');
					if (_.intersection(root_certs, details.root_certs).length >= 1) {
						associatedOrderers.push(orderingNode);
					}
				}
			});
		}
		this.props.updateState(SCOPE, {
			associatedOrderers,
		});
		NodeStatus.getStatus(associatedOrderers, SCOPE, 'associatedOrderers');
	}

	getStickySectionGroups(translate) {
		const node_ou = _.get(this.props.details, 'fabric_node_ous.enable') ? 'enabled' : 'disabled';
		let groups = [
			{
				label: 'node_ou',
				value: translate(node_ou),
				loadingData: this.props.details && !this.props.details.location,
			},
		];
		const admin_certs = _.get(this.props.details, 'admins');
		if (admin_certs) {
			groups.push({
				label: 'admin_certs_expiry',
				value: <CertificateList certs={admin_certs} />,
				loadingData: this.props.details && !this.props.details.admins,
			});
		}
		return groups;
	}

	openMSPSettings(type) {
		this.props.updateState(SCOPE, {
			mspModalType: type,
			showSettings: true,
		});
	}

	closeMSPSettings() {
		this.props.updateState(SCOPE, { showSettings: false });
	}

	exportMSP() {
		Helper.exportNode(this.props.details);
	}

	onUpdateMspCompleted(msp_name) {
		this.props.showSuccess('msp_updated', { msp_name: msp_name }, SCOPE);
		this.refresh();
	}

	onDeleteMspCompleted() {
		this.props.history.goBack();
	}

	openConnectionProfileModal = () => {
		this.props.updateState(SCOPE, { showConnectionProfile: true });
	};

	closeConnectionProfileModal = () => {
		this.props.updateState(SCOPE, { showConnectionProfile: false });
	};

	getNodeStatus(node) {
		let status = node.status;
		if (status === false) {
			status = 'unknown';
		}
		let className = 'ibp-node-status-skeleton';
		if (status === 'running' || status === 'stopped' || status === 'unknown') {
			className = 'ibp-node-status-' + status;
		}
		if (status === 'running_partial') {
			className = 'ibp-node-status-running-partial';
		}
		if (!node.operations_url) {
			className = 'ibp-node-status-unretrievable';
		}
		const translate = this.props.t;
		return status ? (
			<div className="ibp-node-status-container">
				<span className={`ibp-node-status ${className}`}
					tabIndex="0"
				/>
				<span className="ibp-node-status-label">{translate(node.operations_url ? status : 'status_undetected')}</span>
			</div>
		) : (
			<div className="ibp-node-status-container">
				<span className="ibp-node-status ibp-node-status-skeleton"
					tabIndex="0"
				/>
				<span className="ibp-node-status-label">{translate('status_pending')}</span>
			</div>
		);
	}

	buildNodeTile(node) {
		const isPatchAvailable = !node.pending && node.isUpgradeAvailable && node.location === 'ibm_saas' && ActionsHelper.canCreateComponent(this.props.userInfo, this.props.feature_flags);
		const associatedMSP = node.msp_id;
		const tls_root_certs = _.get(node, 'msp.tlsca.root_certs') || [];
		const admin_certs = _.get(node, 'node_ou.enabled') ? [] : _.get(node, 'msp.component.admin_certs') || [];
		const ecert = _.get(node, 'msp.component.ecert');
		const tls_cert = _.get(node, 'msp.component.tls_cert');
		const certificateWarning = Helper.getExpiryMulti([...tls_root_certs, ...admin_certs, ecert, tls_cert]);
		return (
			<div className="ibp-node-orderer-tile">
				<p className="ibp-node-orderer-tile-name">{associatedMSP ? associatedMSP : ''}</p>
				<ItemTileLabels
					location={node.location}
					pending={node.pending ? node.pending : []}
					isPatchAvailable={isPatchAvailable}
					type="orderer"
					certificateWarning={certificateWarning}
				/>
				{this.getNodeStatus(node)}
			</div>
		);
	}

	render() {
		const { details } = this.props;
		const mspName = this.props.details ? this.props.details.name : '';
		const mspNameSkeleton = this.props.details && !this.props.details.name && (
			<SkeletonText
				style={{
					paddingTop: '.5rem',
					width: '8rem',
					height: '2.5rem',
				}}
			/>
		);
		const translate = this.props.t;
		return (
			<PageContainer>
				<div className="ibp-msp-details bx--row">
					<div className="bx--col-lg-4">
						<div className="ibp-node-details-panel">
							<div className="ibp-node-details-header">
								{mspName && <PageHeader history={this.props.history}
									headerName={translate('msp_details_title', { mspName: mspName })}
								/>}
								{mspNameSkeleton}
								<StickySection
									openSettings={type => this.openMSPSettings(type)}
									details={this.props.details}
									title="organization"
									exportNode={() => this.exportMSP()}
									loading={this.props.loading}
									groups={this.getStickySectionGroups(translate)}
									hideRefreshCerts
									feature_flags={this.props.feature_flags}
									userInfo={this.props.userInfo}
									custom={() => {
										return (
											<Button
												id="open-connection-profile"
												kind="primary"
												disabled={_.isEmpty(this.props.details)}
												className="ibp-open-connection-profile"
												onClick={this.openConnectionProfileModal}
											>
												{translate('create_connection_profile')}
												<span
													style={{
														position: 'absolute',
														right: '1rem',
													}}
												>
													+
												</span>
											</Button>
										);
									}}
								/>
							</div>
						</div>
					</div>

					<div className="bx--col-lg-12">
						{details && this.props.associatedPeers && this.props.associatedPeers.length > 0 && (
							<div>
								<p className="ibp-msp-joined-peers">{translate('peers')}</p>
								<PeersComponent history={this.props.history}
									filteredPeers={this.props.associatedPeers.map(peer => peer.id)}
								/>
							</div>
						)}
						{details && this.props.associatedOrderers && this.props.associatedOrderers.length > 0 && (
							<div>
								<p className="ibp-msp-joined-peers">{translate('ordering_nodes')}</p>
								<ItemContainer
									itemId="ordering-nodes"
									id="ordering-nodes"
									pageSize={this.props.associatedOrderers.length}
									isLink
									items={this.props.associatedOrderers}
									tileMapping={{
										title: 'display_name',
										custom: data => {
											return this.buildNodeTile(data);
										},
									}}
									select={node => {
										if (node.cluster_id) {
											this.props.history.push('/orderer/' + encodeURIComponent(node.cluster_id) + '/' + node.id + window.location.search);
										}
									}}
								/>
							</div>
						)}
						{details && !this.props.loading && !this.props.associatedOrderers.length && !this.props.associatedPeers.length && (
							<div className="ibp-nodes-empty-state">
								<ItemContainer
									containerTitle="nodes"
									emptyImage={emptyImage}
									emptyTitle="empty_nodes_title"
									emptyMessage="empty_nodes_text"
									widerTiles="true"
									items={null}
								/>
							</div>
						)}
						{details && this.props.showSettings && !!this.props.associatedPeers && (
							<MSPDefinitionModal
								msp={this.props.details}
								onClose={() => this.closeMSPSettings()}
								onComplete={msp_name => {
									if (this.props.mspModalType === 'settings') {
										this.onUpdateMspCompleted(msp_name);
									}
									if (this.props.mspModalType === 'delete') {
										this.onDeleteMspCompleted();
									}
								}}
								associatedPeers={
									this.props.associatedPeers && this.props.associatedPeers.length > 0
										? this.props.associatedPeers.filter(peer => peer.location === 'ibm_saas')
										: []
								}
								associatedOrderers={
									this.props.associatedOrderers && this.props.associatedOrderers.length > 0
										? this.props.associatedOrderers.filter(orderer => orderer.location === 'ibm_saas')
										: []
								}
								mspAdminCerts={this.props.details.admins}
								mspModalType={this.props.mspModalType}
								selectedMsp={this.props.details}
							/>
						)}
						{details && this.props.showConnectionProfile && <ConnectionProfileModal onClose={this.closeConnectionProfileModal}
							msp={details}
						/>}
					</div>
				</div>
			</PageContainer>
		);
	}
}

const dataProps = {
	details: PropTypes.object,
	match: PropTypes.object,
	loading: PropTypes.bool,
	history: PropTypes.object,
	showSettings: PropTypes.bool,
	associatedPeers: PropTypes.array,
	associatedOrderers: PropTypes.array,
	mspModalType: PropTypes.string,
	showConnectionProfile: PropTypes.bool,
};

OrganizationDetails.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	updateBreadcrumb: PropTypes.func,
	showBreadcrumb: PropTypes.func,
	showError: PropTypes.func,
	showSuccess: PropTypes.func,
	clearNotifications: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['feature_flags'] = state['settings'] ? state['settings']['feature_flags'] : null;
		newProps['userInfo'] = state['userInfo'] ? state['userInfo'] : null;
		return newProps;
	},
	{
		showBreadcrumb,
		showError,
		showSuccess,
		updateState,
		updateBreadcrumb,
		clearNotifications,
	}
)(withTranslation()(withRouter(OrganizationDetails)));
