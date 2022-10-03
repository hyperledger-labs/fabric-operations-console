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

import { Button, CodeSnippet, SkeletonText, Tab, Tabs } from 'carbon-components-react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { promisify } from 'util';
import RequiresAttentionImage from '../../assets/images/requires_attention.svg';
import RequiresAttentionImage2 from '../../assets/images/requires_attention_2.svg';
import { clearNotifications, showBreadcrumb, showError, showSuccess, showWarning, updateBreadcrumb, updateState } from '../../redux/commonActions';
import ChannelApi from '../../rest/ChannelApi';
import { ChannelParticipationApi } from '../../rest/ChannelParticipationApi';
import ComponentApi from '../../rest/ComponentApi';
import IdentityApi from '../../rest/IdentityApi';
import { MspRestApi } from '../../rest/MspRestApi';
import { NodeRestApi } from '../../rest/NodeRestApi';
import { OrdererRestApi } from '../../rest/OrdererRestApi';
import ActionsHelper from '../../utils/actionsHelper';
import ChannelUtils from '../../utils/channel';
import Clipboard from '../../utils/clipboard';
import * as constants from '../../utils/constants';
import Helper from '../../utils/helper';
import NodeStatus from '../../utils/status';
import CertificateList from '../CertificateList/CertificateList';
import FocusComponent from '../FocusComponent/FocusComponent';
import ImportOrdererModal from '../ImportOrdererModal/ImportOrdererModal';
import ItemContainer from '../ItemContainer/ItemContainer';
import ItemTileLabels from '../ItemContainerTile/ItemTileLabels/ItemTileLabels';
import Logger from '../Log/Logger';
import NodeDetails from '../NodeDetails/NodeDetails';
import OrdererAdmins from '../OrdererAdmins/OrdererAdmins';
import OrdererConsenterModal from '../OrdererConsenterModal/OrdererConsenterModal';
import OrdererMembers from '../OrdererMembers/OrdererMembers';
import OrdererModal from '../OrdererModal/OrdererModal';
import PageContainer from '../PageContainer/PageContainer';
import PageHeader from '../PageHeader/PageHeader';
import ReallocateModal from '../ReallocateModal/ReallocateModal';
import SidePanelError from '../SidePanelError/SidePanelError';
import SidePanelWarning from '../SidePanelWarning/SidePanelWarning';
import StickySection from '../StickySection/StickySection';
import SVGs from '../Svgs/Svgs';
import TranslateLink from '../TranslateLink/TranslateLink';
import ChannelParticipationDetails from './ChannelParticipationDetails';

const SCOPE = 'ordererDetails';
const Log = new Logger(SCOPE);
const semver = require('semver');

class OrdererDetails extends Component {
	async componentDidMount() {
		this.pathname = this.props.history.location.pathname;
		this.props.showBreadcrumb(null, null, this.pathname);
		this.props.updateState(SCOPE, {
			members: [],
			admins: [],
			details: {},
			selected: null,
			nodes: [],
			usageModal: false,
			systemChannel: true,
			disabled: true,
			nodeStatus: {},
			notAvailable: false,
			capabilities: {},
			exportInProgress: false,
			selectedNode: null,
			selectedTab: 0,
			showAddNode: false,
			addToSystemChannelInProgress: false,
			error: null,
			usageInfo: {},
			consenters: [],
			deleteConsenter: null,
			updateConsenter: null,
			setFocus: false,
			missingEndorsementOrgs: [],
		});
		await this.refresh();
	}

	async componentDidUpdate(prevProps) {
		if (this.props.selectedNode && !this.props.match.params.nodeId) {
			this.closeNodeDetails();
		}
		if (prevProps.match.params.nodeId !== this.props.match.params.nodeId) {
			await this.refresh();
		}
	}

	componentWillUnmount() {
		this.props.clearNotifications(SCOPE);
		NodeStatus.cancel();
		this.props.updateState(SCOPE, {
			details: {},
		});
	}

	async refresh(skipStatusCache) {
		NodeStatus.cancel();
		this.props.clearNotifications(SCOPE);
		this.props.updateState(SCOPE, {
			loading: true,
			channelsLoading: true,
			sysChLoading: true,
			members: [],
			admins: [],
			systemChannel: true,
			capabilities: {},
			usageInfo: {},
			consenters: [],
		});
		let nodes = await MspRestApi.getAllMsps();
		this.props.updateState(SCOPE, { nodes });

		const ordererDetails = await this.getDetails(skipStatusCache);
		if (this.channelParticipationEnabled(ordererDetails)) {
			await this.getCPChannelList();
		};
		this.props.updateState(SCOPE, {
			loading: false,
			channelsLoading: false,
		});
	};

	// detect if channel participation features are enabled (this doesn't mean they should be shown!)
	channelParticipationEnabled(obj) {
		const has_osnadmin_url = (obj && typeof obj.osnadmin_url === 'string') ? true : false;
		const osnadmin_feats_enabled = this.props.feature_flags && this.props.feature_flags.osnadmin_feats_enabled === true;
		return osnadmin_feats_enabled && has_osnadmin_url;
	}

	// detect if channel participation features should be shown, based on osnadmin_url availability and a feature flag && system channel should not exist
	isSystemLess(obj) {
		return this.channelParticipationEnabled(obj) && !this.props.systemChannel;
	}

	/* get channel list from channel participation api */
	getCPChannelList = async () => {
		let useNodes = this.props.selectedNode ? [this.props.selectedNode] : this.props.details.raft;
		let channelList = {};

		// if we cannot get the channels b/c of an network error, perm error, etc, default to the using the "systemless" field
		let systemChannel = (this.props.details && this.props.details.systemless) ? false : true;

		let orderer_tls_identity = await IdentityApi.getTLSIdentity(this.props.selectedNode || this.props.details);
		if (!orderer_tls_identity) {
			// if we don't have a tls identity, we cannot load the system channel details via the channel participation apis...
			// so assume we do (or do not) have a system channel based on the "systemless" field
			// if we do have the identity it will be more robust to just look up the system channel details via channel participation apis
		} else {
			try {
				let all_identity = await IdentityApi.getIdentities();
				const resp = await ChannelParticipationApi.mapChannels(all_identity, useNodes);

				// TODO: consolidate error handling
				if (_.get(resp, 'code') === 'ECONNREFUSED') {
					this.props.showError('orderer_not_available_title', SCOPE);
				}
				if (_.get(resp, 'code') === 'ECONNRESET') {
					this.props.showError('orderer_not_available_title', SCOPE);
				}

				if (resp) {
					channelList = resp;
					if (_.get(channelList, 'systemChannel.name')) {					// system channel does exist
						systemChannel = true;
						channelList.systemChannel.type = 'system_channel';
						if (channelList.channels === null) {
							channelList.channels = [];
						}
						channelList.channels.push(channelList.systemChannel);
						await this.getSystemChannelConfig();
					} else {														// system channel does not exist
						systemChannel = false;
					}
				}
			} catch (error) {
				Log.error('Unable to get channel list:', error);
				this.props.showError('orderer_not_available_title', SCOPE);
			}
		}

		this.props.updateState(SCOPE, {
			channelList,
			systemChannel,
			orderer_tls_identity,
		});
	};

	setFocus = () => {
		// set focus to first item on step
		this.props.updateState(SCOPE, { setFocus: false });
		window.setTimeout(() => {
			this.props.updateState(SCOPE, { setFocus: true });
		}, 100);
	};

	async getDetails(skipStatusCache) {
		let orderer = await OrdererRestApi.getOrdererDetails(this.props.match.params.ordererId, false);
		try {
			// Get complete config from deployer because the value stored in database stores only the latest config override json
			const latest_config = await NodeRestApi.getCurrentNodeConfig(orderer);
			if (!_.isEmpty(latest_config)) {
				_.set(orderer, 'config_override.General', latest_config.general);
			}
		} catch (error) {
			Log.error(error);
		}
		this.props.updateState(SCOPE, { details: orderer });

		this.props.showBreadcrumb('orderer_details_title', { ordererName: orderer.cluster_name }, this.pathname);
		this.timestamp = new Date().getTime();
		setTimeout(() => {
			// after 30 seconds, if we still do not have a response, show
			// the not available message
			if (this.timestamp) {
				this.props.updateState(SCOPE, { notAvailable: true });
			}
		}, 30000);
		this.checkHealth(orderer, skipStatusCache);

		if (orderer.raft) {
			orderer.raft.forEach(node => {
				ComponentApi.getUsageInformation(node)
					.then(nodeUsageInfo => {
						const usageInfo = this.props.usageInfo;
						usageInfo[node.id] = nodeUsageInfo;
						this.props.updateState(SCOPE, { usageInfo });
					})
					.catch(error => {
						Log.error(error);
					});
			});
		}
		if (orderer.pending) {
			orderer.pending.forEach(node => {
				ComponentApi.getUsageInformation(node)
					.then(nodeUsageInfo => {
						const usageInfo = this.props.usageInfo;
						usageInfo[node.id] = nodeUsageInfo;
						this.props.updateState(SCOPE, { usageInfo });
					})
					.catch(error => {
						Log.error(error);
					});
			});
		}

		if (this.props.match.params.nodeId && orderer.raft) {
			let nodeToOpen = null;
			orderer.raft.forEach(node => {
				if (node.id === this.props.match.params.nodeId) {
					nodeToOpen = node;
				}
			});
			if (!nodeToOpen && orderer.pending) {
				orderer.forEach(node => {
					if (node.id === this.props.match.params.nodeId) {
						nodeToOpen = node;
					}
				});
			}
			if (nodeToOpen) {
				this.openNodeDetails(nodeToOpen);
			}
		}
		return orderer;
		//this.props.updateState(SCOPE, { loading: false });
	}

	checkHealth(orderer, skipStatusCache) {
		NodeStatus.getStatus(
			{
				...orderer,
				skip_cache: skipStatusCache,
			},
			SCOPE,
			'details',
			(id, status) => {
				const nodeStatus = { ...this.props.nodeStatus };
				nodeStatus[id] = status;
				this.props.updateState(SCOPE, { nodeStatus });
				if (this.timestamp) {
					this.timestamp = 0;
					this.props.updateState(SCOPE, { notAvailable: false });
					if (!this.isSystemLess(this.props.details)) {
						this.getSystemChannelConfig();
					}
				}
			}
		);
	}

	getMsps(groups) {
		const msps = [];
		if (groups) {
			const keys = Object.keys(groups);
			keys.forEach(msp_id => {
				const msp = { ...groups[msp_id] };
				const config = _.get(msp, 'values.MSP.value.config');
				if (config) {
					this.props.nodes.forEach(node => {
						if (node.msp_id === msp_id) {
							if (node.admins && config.admins && node.admins.length === config.admins.length) {
								let match = true;
								node.admins.forEach(admin => {
									if (config.admins.indexOf(admin) === -1) {
										match = false;
									}
								});
								if (match) {
									msp.name = node.name;
									msp.display_name = node.display_name;
								}
							}
						}
					});
					msps.push({
						...config,
						display_name: msp.display_name || msp_id,
						name: msp.name || msp_id,
						msp_id,
					});
				}
			});
		}
		return msps;
	}

	// Get the channel and orderer capability levels for the system channel
	getCapabilities(channelGroup) {
		const channelCapabilityNode = _.get(channelGroup, 'values.Capabilities.value.capabilities', {});
		const channelCapability = Object.keys(channelCapabilityNode)[0];

		const ordererCapabilityNode = _.get(channelGroup, 'groups.Orderer.values.Capabilities.value.capabilities', {});
		const ordererCapability = Object.keys(ordererCapabilityNode)[0];

		const capabilities = {
			channel: channelCapability,
			orderer: ordererCapability,
		};
		return capabilities;
	}

	getNode(consenter) {
		const host = consenter.host;
		const port = '' + consenter.port;
		let found = null;
		if (this.props.details.raft) {
			this.props.details.raft.forEach(node => {
				const url = node.api_url;
				if (url) {
					if (host === Helper.getHostname(url) && port === Helper.getPort(url)) {
						found = node;
					}
				}
			});
		}
		if (this.props.details.pending) {
			this.props.details.pending.forEach(node => {
				const url = node.api_url;
				if (url) {
					if (host === Helper.getHostname(url) && port === Helper.getPort(url)) {
						found = node;
					}
				}
			});
		}
		return found;
	}

	getConsenterNodeInfo(consenter) {
		const node = this.getNode(consenter);
		return {
			...consenter,
			url: consenter.host + ':' + consenter.port,
			id: node ? node.id : consenter.host + ':' + consenter.port,
			display_name: node ? node.display_name : null,
			tls_cert_mismatch: node ? Helper.isTLSCertMismatch(consenter, node) : false,
			node: node,
		};
	}

	getSystemChannelConfig() {
		OrdererRestApi.getSystemChannelConfig(this.props.match.params.ordererId, this.props.configtxlator_url)
			.then(resp => {
				// we usually pick "SampleConsortium" but if that is missing, grab the first one. we don't support multiple atm.
				const first_consortium = ChannelUtils.getSampleConsortiumOrFirstKey(resp.channel_group.groups.Consortiums.groups);
				if (!first_consortium) {
					throw Error('zero consortiums were found in block data. thus cannot grab consortium member data.');
				}

				const is2xOrderer = this.props.details.raft.some(node => {
					if (node.version && semver.gte(semver.coerce(node.version), semver.coerce('2.0'))) {
						return true;
					}
					return false;
				});
				const missingEndorsementOrgs = [];
				if (is2xOrderer) {
					// Make sure 2.x orderer has Endorsement policy set for each org
					for (let org in first_consortium.groups) {
						if (!_.has(first_consortium.groups[org].policies, 'Endorsement')) {
							missingEndorsementOrgs.push(org);
						}
					}
				}
				this.props.updateState(SCOPE, {
					missingEndorsementOrgs,
				});

				const l_consenters = _.get(resp, 'channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters', []);
				this.props.updateState(SCOPE, {
					members: this.getMsps(first_consortium.groups),
					admins: this.getMsps(resp.channel_group.groups.Orderer.groups),
					capabilities: this.getCapabilities(resp.channel_group),
					sysChLoading: false,
					disabled: false,
					consenters: l_consenters.map(consenter => this.getConsenterNodeInfo(consenter)),
				});
			})
			.catch(error => {
				if (this.isSystemLess(this.props.details) || this.props.channelsLoading) {
					// node's without system channel are expected to fail, don't show a warning.
					// ideally this function wouldn't be called, but the timing is tricky and this might get called before we know the configuration by checkHealth()
					return null;
				}

				Log.error(error);
				this.props.updateState(SCOPE, {
					disabled: true,
					sysChLoading: false,
				});
				if (error.message_key) {
					this.props.showError(error.message_key, { nodeName: error.nodeName }, SCOPE);
				} else {
					if (this.props.details.associatedIdentity) {
						this.props.showError('system_channel_error', { ordererId: this.props.match.params.ordererId }, SCOPE);
					} else {
						this.props.showError('orderer_not_available_title', {}, SCOPE);
					}
				}
			});
	}

	openOrdererSettings = type => {
		this.props.updateState(SCOPE, {
			selected: this.props.selectedNode || this.props.details,
			ordererModalType: type,
		});
	};

	closeOrdererSettings = () => {
		this.props.updateState(SCOPE, { selected: null });
	};

	onClose = () => {
		this.refresh();
	};

	buildCustomTile(msp) {
		const translate = this.props.translate;
		return (
			<div>
				<p className="bx--type-zeta ibp-node-orderer-tile-name">{msp.msp}</p>
				<p className="bx--type-zeta ibp-node-orderer-tile-name">{translate('org')}</p>
			</div>
		);
	}

	exportOrderer = () => {
		this.props.updateState(SCOPE, {
			exportInProgress: true,
		});
		let node = this.props.selectedNode || this.props.details;
		const isParentNode = node && node.raft ? true : false;
		const needCertsFromDeployer = isParentNode ? node.raft.find(x => !_.has(x, 'client_tls_cert')) : !_.has(node, 'client_tls_cert');
		if (!this.props.disabled && node.location === 'ibm_saas' && needCertsFromDeployer) {
			let nodes = isParentNode ? node.raft : [node];
			NodeRestApi.getTLSSignedCertFromDeployer(nodes)
				.then(nodesWithCerts => {
					Log.debug('Signed certs for Raft nodes from deployer', nodesWithCerts);
					if (isParentNode) {
						node.raft = nodesWithCerts;
					} else {
						node = nodesWithCerts[0];
					}
					let show_warning = false;
					nodesWithCerts.forEach(node2 => {
						if (!node2.client_tls_cert) {
							show_warning = true;
						} else {
							// Now add signed certs in the database
							// V2 API does not support the client_tls_cert and server_tls_cert
							// properties yet, so do not try to save until it is updated
							// this.updateOrderer(node2);
						}
					});
					if (show_warning) {
						this.props.showWarning('warning_tls_certs');
					}
					this.exportNode(node);
				})
				.catch(error => {
					Log.debug('An error occurred when getting signed certs from deployer', error);
					this.props.showWarning('warning_tls_certs');
					this.exportNode(node);
				});
		} else {
			this.exportNode(node);
		}
	};

	exportNode = node => {
		Helper.exportNode(node);
		this.props.updateState(SCOPE, {
			exportInProgress: false,
		});
	};

	refreshCerts = async () => {
		try {
			const resp = await NodeRestApi.getUnCachedDataWithDeployerAttrs(this.props.selectedNode.id);
			Log.debug('Refresh cert response:', resp);
			this.refresh();
			this.props.showSuccess('cert_refresh_successful', {}, SCOPE);
		} catch (error) {
			Log.error(`Refresh Failed: ${error}`);
			this.props.showError('cert_refresh_error', {}, SCOPE);
		}
	};

	updateOrderer = orderer => {
		OrdererRestApi.updateOrderer({
			id: orderer.id,
			client_tls_cert: orderer.client_tls_cert,
			server_tls_cert: orderer.server_tls_cert,
		})
			.then(details => {
				Log.info('Updated raft nodes with signed certs from deployer:', details);
				if (this.props.selectedNode) {
					const raft = [];
					this.props.details.raft.forEach(node => {
						if (node.id && node.id === details.id) {
							raft.push(details);
						} else {
							raft.push(node);
						}
					});
					this.props.updateState(SCOPE, {
						selectedNode: details,
						details: {
							...this.props.details,
							raft,
						},
					});
				} else {
					this.props.updateState(SCOPE, {
						details,
					});
				}
			})
			.catch(error => {
				Log.error('An error occured when updating raft nodes with signed certs from deployer:', error);
			});
	};

	renderNodeVersion(translate) {
		if (!this.props.selectedNode || this.props.selectedNode.location !== 'ibm_saas' || !ActionsHelper.canCreateComponent(this.props.userInfo)) {
			return;
		}
		// Do not show HSM for now
		const show_hsm = false;
		const isUpgradeAvailable = this.props.selectedNode.isUpgradeAvailable;
		let className = 'ibp-node-info-tab';
		let upgrade_version = null;
		if (isUpgradeAvailable) {
			className = className + ' ibp-upgrade-available';
			this.props.selectedNode.upgradable_versions.forEach(ver => {
				if (upgrade_version === null || semver.gt(ver, upgrade_version)) {
					upgrade_version = ver;
				}
			});
		}
		const hsm = Helper.getHSMBCCSP(_.get(this.props, 'selectedNode.config_override.General')) === 'PKCS11';
		return (
			<div className="ibp-node-version-and-hsm">
				{this.props.selectedNode && this.props.selectedNode.version && (
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
										onClick={() => this.openOrdererSettings('upgrade')}
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
							onClick={() => this.openOrdererSettings(hsm ? 'manage_hsm' : 'enable_hsm')}
						>
							{translate(hsm ? 'manage_hsm' : 'enable_hsm')}
						</Button>
					</div>
				)}
			</div>
		);
	}

	renderUsageCategory(translate, category) {
		const res = {
			name: translate(category + '_container'),
			cpu: '-',
			memory: '-',
			storage: '-',
		};
		if (this.props.selectedNode && this.props.usageInfo && this.props.usageInfo[this.props.selectedNode.id]) {
			res.cpu = Helper.normalizeCpu(_.get(this.props.usageInfo[this.props.selectedNode.id], 'resources.' + category + '.requests.cpu'));
			res.memory = Helper.normalizeMemory(_.get(this.props.usageInfo[this.props.selectedNode.id], 'resources.' + category + '.requests.memory'), 'M');
			if (category === 'orderer') {
				res.storage = Helper.normalizeMemory(_.get(this.props.usageInfo[this.props.selectedNode.id], 'storage.' + category + '.size'), 'Gi');
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
		if (!this.props.selectedNode || this.props.selectedNode.location !== 'ibm_saas') {
			return;
		}
		let items = [];
		items.push(this.renderUsageCategory(translate, 'orderer'));
		items.push(this.renderUsageCategory(translate, 'proxy'));
		return (
			<div className="ibp-usage-div">
				{this.renderNodeVersion(translate)}
				{this.props.clusterType === 'free' ? (
					<div>
						<p>{translate('not_available_for_free_cluster')}</p>
					</div>
				) : (
					<ItemContainer
						id="orderer_usage_table"
						itemId="orderer_usage_table"
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
		);
	}

	buildNodeTile(node) {
		const isPatchAvailable = !node.pending && node.isUpgradeAvailable && node.location === 'ibm_saas' && ActionsHelper.canCreateComponent(this.props.userInfo);
		const associatedMSP = node.msp_id;
		const tls_root_certs = _.get(node, 'msp.tlsca.root_certs') || [];
		const ecert = _.get(node, 'msp.component.ecert');
		const tls_cert = _.get(node, 'msp.component.tls_cert');
		const certificateWarning = Helper.getExpiryMulti([...tls_root_certs, ecert, tls_cert]);
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

	openAddOrdererNode = () => {
		this.props.updateState(SCOPE, { showAddNode: true });
	};

	closeAddOrdererNode = () => {
		this.props.updateState(SCOPE, { showAddNode: false });
	};

	getNodeStatus(node) {
		if (!node || !this.props.nodeStatus) {
			return;
		}
		let status = this.props.nodeStatus[node.id];
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
		const translate = this.props.translate;
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

	openNodeDetails = node => {
		const pathname = '/orderer/' + encodeURIComponent(this.props.details.cluster_id) + '/' + node.id + window.location.search;
		if (this.props.history.location.pathname !== pathname) {
			this.props.history.push(pathname);
		}
		this.props.showBreadcrumb('orderer_details_title', { ordererName: node.id }, this.props.history.location.pathname);
		const isParentNode = node && node.raft ? true : false;
		if (!isParentNode) {
			this.setFocus();
		}
		NodeRestApi.getCurrentNodeConfig(node)
			.then(latest_config => {
				if (!_.isEmpty(latest_config)) {
					_.set(node, 'config_override.General', latest_config.general);
				}
				this.props.updateState(SCOPE, {
					selectedNode: node,
					selectedTab: 0,
				});
			})
			.catch(error => {
				Log.error(error);
				this.props.updateState(SCOPE, {
					selectedNode: node,
					selectedTab: 0,
				});
			});
	};

	closeNodeDetails = () => {
		this.props.showBreadcrumb('orderer_details_title', { ordererName: this.props.details.display_name }, this.props.history.location.pathname);
		this.props.updateState(SCOPE, {
			selectedNode: null,
			selectedTab: 0,
		});
	};

	renderPendingNode(translate) {
		return (
			<div className="ibp-pending-node-drill-down">
				<div>
					<h3>{translate('node_requires_attention')}</h3>
					<p>{translate('pending_orderer_node')}</p>
					<div className="connect-node-button-div">
						{this.props.addToSystemChannelInProgress ? (
							<SkeletonText
								style={{
									paddingTop: '.5rem',
									width: '8rem',
									height: '2.5rem',
								}}
							/>
						) : (
							<Button id="connect-node-button"
								className="connect-node-button"
								onClick={() => this.addToSystemChannel()}
								disabled={this.props.disabled}
							>
								{translate('add_to_system_channel')}
								<SVGs type="arrowRight"
									width="16px"
									height="16px"
								/>
							</Button>
						)}
					</div>
					{this.props.error && <SidePanelError error={this.props.error} />}
				</div>
				<RequiresAttentionImage2
					className="ibp-requires-attention-image"
					alt=""
				/>
			</div>
		);
	}

	renderRunningPartial(translate) {
		if (!this.props.details) {
			return;
		}
		if (this.props.details.status !== 'running_partial') {
			return;
		}
		return (
			<div className="running-partial-notice">
				<div>
					<h3>{translate('running_partial')}</h3>
					<p>{translate('running_partial_desc')}</p>
				</div>
				<RequiresAttentionImage
					className="ibp-requires-attention-image"
					alt=""
				/>
			</div>
		);
	}

	renderMissingEndorsementNotice(translate) {
		if (!this.props.details) {
			return;
		}
		if (_.size(this.props.missingEndorsementOrgs) === 0) {
			return;
		}
		return (
			<div className="missing-endorsement-policy">
				<div>
					<h3>{translate('missing_endorsement_policy_title')}</h3>
					<p>{translate('missing_endorsement_policy_desc', { orgs: this.props.missingEndorsementOrgs.join(',') })}</p>
				</div>
				<RequiresAttentionImage
					className="ibp-requires-attention-image ibp-requires-attention-small-image"
					alt=""
				/>
			</div>
		);
	}

	renderPendingNotice(translate) {
		if (!this.props.details || !this.props.details.pending || !this.props.details.pending.length) {
			return;
		}
		const data = {
			name: (
				<CodeSnippet
					type="inline"
					ariaLabel={translate('copy_text', { copyText: this.props.details.pending[0].name })}
					light={false}
					onClick={() => Clipboard.copyToClipboard(this.props.details.pending[0].name)}
				>
					{this.props.details.pending[0].name}
				</CodeSnippet>
			),
		};
		return (
			<div className="pending-node-notice">
				<div>
					<h3>{translate('node_requires_attention')}</h3>
					<p>{translate('node_requires_attention_desc', data)}</p>
					<div>
						<Button
							id="go-to-node-button"
							className="go-to-node-button"
							onClick={() => {
								this.openNodeDetails(this.props.details.pending[0]);
							}}
						>
							{translate('go_to_node')}
							<SVGs type="arrowRight"
								width="16px"
								height="16px"
							/>
						</Button>
					</div>
				</div>
				<RequiresAttentionImage
					className="ibp-requires-attention-image"
					alt=""
				/>
			</div>
		);
	}

	async addToSystemChannel() {
		this.props.updateState(SCOPE, {
			addToSystemChannelInProgress: true,
			error: null,
		});
		const options = {
			currentOrdererId: this.props.details.raft[0].id,
			ordererId: this.props.selectedNode.id,
			configtxlator_url: this.props.configtxlator_url,
		};
		try {
			Log.info(`Adding orderer ${options.ordererId} to system channel via orderer ${options.currentOrdererId}`);
			await OrdererRestApi.addOrdererNodeToSystemChannel(options);
		} catch (error) {
			let duplicate_consenter = false;
			Log.error(`Could not add order ${options.ordererId} to system channel: ${error}`);
			let title = 'error_add_to_system_channel';
			let details = error && error.message ? error.message : error;
			if (_.has(error, 'stitch_msg') && _.includes(error.stitch_msg, 'no Raft leader')) {
				title = 'error_no_raft_leader';
				details = _.get(error, 'stitch_msg');
			}
			if (_.has(error, 'stitch_msg') && _.includes(error.stitch_msg, 'permission denied')) {
				title = 'add_node_error';
				details = this.props.translate('add_node_system_channel_access_denied');
			}
			if (_.has(error, 'stitch_msg') && _.includes(error.stitch_msg, 'duplicate consenter')) {
				duplicate_consenter = true;
			}
			// duplicate consenter is okay... it has been added, ignore
			if (!duplicate_consenter) {
				this.props.updateState(SCOPE, {
					addToSystemChannelInProgress: false,
					error: {
						title,
						details,
					},
				});
				return;
			}
		}

		let orderer;
		try {
			orderer = await OrdererRestApi.getOrdererDetails(options.currentOrdererId, false);
		} catch (error) {
			Log.error(`Unable to get orderer ${options.currentOrdererId}:`, error);
			return;
		}

		try {
			let block_options = {
				ordererId: options.currentOrdererId,
				channelId: orderer.system_channel || OrdererRestApi.systemChannel,
				configtxlator_url: options.configtxlator_url,
			};
			const block = await OrdererRestApi.getChannelConfigBlock(block_options);

			const b64_config_block = window.stitch.uint8ArrayToBase64(block);
			await OrdererRestApi.uploadConfigBlock(options.ordererId, b64_config_block);

			const update = {
				id: this.props.selectedNode.id,
				type: 'fabric-orderer',
				consenter_proposal_fin: true,
				pending: undefined,
			};
			await OrdererRestApi.updateOrderer(update);

			this.props.updateState(SCOPE, {
				addToSystemChannelInProgress: false,
			});
			this.refresh(true);
			this.props.showSuccess('add_to_system_channel_successful', {}, SCOPE);
		} catch (error) {
			Log.error('Could not add to system channel:', error);
			this.props.updateState(SCOPE, {
				addToSystemChannelInProgress: false,
				error: {
					title: 'error_add_to_system_channel',
					details: error,
				},
			});
		}
	}

	getQuickActions = () => {
		let quickAction = null;
		const pathname = _.get(this.props, 'history.location.pathname');
		if (pathname && pathname.indexOf('/debug/') !== -1) {
			quickAction = [
				{
					label: 'open_channel_config',
					quickAction: this.debug_openChannelConfig,
				},
			];
		}
		return quickAction;
	};

	async getChannelConfig(channelId) {
		const options = {
			ordererId: this.props.match.params.ordererId,
			configtxlator_url: this.props.configtxlator_url,
			channelId: channelId,
		};
		let block = await OrdererRestApi.getChannelConfigBlock(options);
		const _block_binary2json = promisify(ChannelApi._block_binary2json);
		const resp = await _block_binary2json(block, options.configtxlator_url);
		return resp.data.data[0].payload.data;
	};

	debug_openChannelConfig = () => {
		OrdererRestApi.getOrdererDetails(this.props.match.params.ordererId, false)
			.then(orderer => {
				let channelId = this.props.match.params.channelId || orderer.system_channel || OrdererRestApi.systemChannel;
				this.getChannelConfig(channelId).then(debug_block => {
					Helper.openJSONBlob(debug_block);
				});
			})
			.catch(error => console.log(error));
	};

	getStickySectionGroups(translate) {
		const groups = [];
		let hsm = Helper.getHSMBCCSP(_.get(this.props, 'selectedNode.config_override.General')) === 'PKCS11';
		if (!hsm) hsm = Helper.getHSMBCCSP(_.get(this.props, 'selectedNode.config_override[0].General')) === 'PKCS11';

		if (this.props.channelsLoading) {
			groups.push({
				label: 'orderer_type',
				value: translate('loading'),
			});
		} else {
			if (!this.props.selectedNode) {
				groups.push({
					label: 'orderer_type',
					value: this.isSystemLess(this.props.details) ? translate('systemless_config') : translate('system_config'),
				});
			} else {
				groups.push({
					label: 'orderer_type',
					value: this.isSystemLess(this.props.selectedNode) ? translate('systemless_config') : translate('system_config'),
				});
			}
		}

		if (this.props.selectedNode) {
			groups.push({
				label: 'node_location',
				value: this.props.selectedNode.location ? translate(this.props.selectedNode.location) : '',
			});
			let versionLabel = this.props.selectedNode.version ? this.props.selectedNode.version : translate('version_not_found');
			if (this.props.selectedNode && this.props.selectedNode.isUnsupported) {
				versionLabel = translate('unsupported');
			}
			if (this.props.selectedNode.location === 'ibm_saas' || this.props.selectedNode.version) {
				groups.push({
					label: 'node_version_title',
					value: versionLabel,
				});
			}
			if (this.props.selectedNode.location === 'ibm_saas') {
				if (this.props.feature_flags && this.props.feature_flags.hsm_enabled && this.props.selectedNode && this.props.selectedNode.location === 'ibm_saas') {
					groups.push({
						label: 'hsm',
						value: translate(hsm ? 'enabled' : 'not_used'),
						loadingData: this.props.details && !this.props.details.display_name,
					});
				}
				if (this.props.selectedNode && this.props.selectedNode.msp_id) {
					groups.push({
						label: 'msp_id',
						value: this.props.selectedNode.msp_id,
					});
				}
				if (this.props.workerZones && this.props.workerZones.length > 1 && this.props.selectedNode && this.props.selectedNode.zone) {
					groups.push({
						label: 'worker_zone',
						value: this.props.selectedNode.zone,
					});
				}
				if (this.props.selectedNode && this.props.selectedNode.msp) {
					const ecert = _.get(this.props.selectedNode, 'msp.component.ecert');
					if (ecert) {
						groups.push({
							label: 'ecert_expiry',
							value: <CertificateList certs={[ecert]} />,
						});
					}
				}
				if (this.props.selectedNode && this.props.selectedNode.msp) {
					const tls_cert = _.get(this.props.selectedNode, 'msp.component.tls_cert');
					if (tls_cert) {
						groups.push({
							label: 'tls_cert_expiry',
							value: <CertificateList certs={[tls_cert]} />,
						});
					}
				}
				if (this.props.selectedNode && this.props.selectedNode.msp) {
					const tls_ca_root_certs = _.get(this.props.selectedNode, 'msp.tlsca.root_cert');
					if (tls_ca_root_certs) {
						const expiry = Helper.getLongestExpiry(tls_ca_root_certs);
						if (expiry < constants.CERTIFICATE_SHOW_YEARS) {
							groups.push({
								label: 'tls_ca_root_cert_expiry',
								value: <CertificateList certs={[tls_ca_root_certs]} />,
							});
						}
					}
				}
			}
		}
		return groups;
	}

	renderConsenters(translate) {
		return (
			<div id="consenters-container">
				<ItemContainer
					containerTitle="ordering_service_consenters"
					containerTooltip="ordering_service_consenters_tooltip"
					id="ibp-channel-consenters-table"
					itemId="host"
					items={this.props.consenters}
					loading={this.props.loading}
					listMapping={[
						{
							header: 'name',
							attr: 'display_name',
						},
						{
							header: 'url',
							attr: 'url',
							width: 3,
						},
					]}
					menuItems={member => {
						let items;
						if (!member.node) {
							items = [
								{
									text: 'delete',
									fn: () => {
										this.openDeleteConsenterModal(member);
									},
								},
							];
						}
						if (member.tls_cert_mismatch) {
							if (!items) {
								items = [];
							}
							items.push({
								text: 'update_tls_certs',
								fn: () => {
									this.openUpdateConsenterModal(member);
								},
							});
						}
						return items;
					}}
				/>
			</div>
		);
	}

	openDeleteConsenterModal = member => {
		this.props.updateState(SCOPE, { deleteConsenter: member });
	};

	closeDeleteConsenterModal = () => {
		this.props.updateState(SCOPE, { deleteConsenter: null });
	};

	openUpdateConsenterModal = member => {
		this.props.updateState(SCOPE, { updateConsenter: member });
	};

	closeUpdateConsenterModal = () => {
		this.props.updateState(SCOPE, { updateConsenter: null });
	};

	render() {
		const free = this.props.clusterType === 'free';
		const ordererName = this.props.selectedNode ? this.props.selectedNode.display_name : this.props.details ? this.props.details.cluster_name : '';
		const ordererNameSkeleton = this.props.details && !this.props.details.display_name && (
			<SkeletonText
				style={{
					paddingTop: '.5rem',
					width: '8rem',
					height: '2.5rem',
				}}
			/>
		);
		const subnodes = this.props.details && this.props.details.raft ? [...this.props.details.raft] : [];
		if (this.props.details && this.props.details.pending) {
			this.props.details.pending.forEach(pendingNode => {
				subnodes.push({
					...pendingNode,
					pending: true,
				});
			});
		}
		const isScalingNodesAllowed = this.props.scaleRaftNodesEnabled;
		const canDeleteLegacy = (this.props.selectedNode && this.props.selectedNode.location !== 'ibm_saas') || isScalingNodesAllowed;
		const translate = this.props.translate;
		const canDeleteSystemless = !this.props.systemChannel;
		const canDelete = canDeleteLegacy || canDeleteSystemless;

		const buttonsOnTheNodesTab = [];
		if (isScalingNodesAllowed && ActionsHelper.canCreateComponent(this.props.userInfo) && !free) {
			buttonsOnTheNodesTab.push({
				text: 'add_orderer_node',
				fn: this.openAddOrdererNode,
			});
		} else if (ActionsHelper.canCreateComponent(this.props.userInfo) && this.isSystemLess(this.props.details)) {
			buttonsOnTheNodesTab.push({
				text: 'add_orderer_node',
				fn: this.openAddOrdererNode,
			});
		}
		const hasAssociatedIdentities = this.props.details && this.props.details.associatedIdentities && this.props.details.associatedIdentities.length > 0;

		return (
			<PageContainer>
				<div>
					<PageHeader history={this.props.history}
						headerName={ordererName ? translate('orderer_details_title', { ordererName: ordererName }) : ''}
					/>
					{ordererNameSkeleton}
					<div className="ibp-orderer-details bx--row">
						{this.props.showAddNode && (
							<ImportOrdererModal
								raftParent={this.props.details}
								systemChannel={this.props.systemChannel}
								appendingNode={!_.isEmpty(this.props.details)}
								onClose={this.closeAddOrdererNode}
								onComplete={() => {
									this.refresh();
								}}
							/>
						)}
						{this.props.deleteConsenter && (
							<OrdererConsenterModal
								consenter={this.props.deleteConsenter}
								onClose={this.closeDeleteConsenterModal}
								onComplete={() => {
									this.refresh();
								}}
								orderer={this.props.details}
								mode={'delete'}
							/>
						)}
						{this.props.updateConsenter && (
							<OrdererConsenterModal
								consenter={this.props.updateConsenter}
								onClose={this.closeUpdateConsenterModal}
								onComplete={() => {
									this.refresh();
								}}
								orderer={this.props.details}
								mode={'update'}
							/>
						)}
						{this.props.selected && (
							<OrdererModal
								ordererId={this.props.match.params.ordererId}
								configtxlator_url={this.props.configtxlator_url}
								orderer={this.props.selected}
								singleNodeRaft={_.get(this.props, 'details.raft.length') === 1}
								ordererModalType={this.props.ordererModalType}
								onClose={this.closeOrdererSettings}
								currentCapabilities={this.props.capabilities}
								isOrdererAdmin={!this.props.disabled}
								systemChannel={this.props.systemChannel}
								onComplete={ordererList => {
									if (this.props.selectedNode) {
										if (this.props.ordererModalType === 'upgrade') {
											const details = { ...this.props.details };
											if (details.raft) {
												details.raft.forEach(node => {
													node.status = undefined;
												});
											}
											if (details.pending) {
												details.pending.forEach(pending => {
													pending.status = undefined;
												});
											}
											this.props.updateState(SCOPE, {
												details,
												selectedNode: {
													...this.props.selectedNode,
													status: undefined,
												},
											});
											this.refresh(true);
										} else {
											this.refresh();
										}
										return;
									}
									if (!ordererList) {
										// Some actions(updating capabilities/block params) do not send the orderer details back
										ordererList = this.props.details;
									}
									if (ordererList) {
										if (_.isArray(ordererList)) {
											this.props.updateState(SCOPE, { ordererList });
										} else {
											// Clear the associated identity to force the
											// child components (channels and chaincode) to
											// be removed from the DOM.  They will be recreated
											// when we update the state with the new orderer details.
											const identity = this.props.details.associatedIdentity;
											this.props.updateState(SCOPE, {
												details: {
													...this.props.details,
													associatedIdentity: null,
												},
											});
											if (!ordererList.associatedIdentity) {
												ordererList.associatedIdentity = identity;
											}
											this.props.updateState(SCOPE, {
												details: {
													...ordererList,
													raft: this.props.details.raft,
												},
											});
											this.refresh();
											this.props.showBreadcrumb('orderer_details_title', { ordererName: ordererList.cluster_name }, this.props.history.location.pathname);
										}
									}
								}}
							/>
						)}
						<div className="bx--col-lg-4">
							<div className="ibp-node-details-panel">
								<div className="ibp-node-details-header">
									<div className="ibp-node-tags" />
									<FocusComponent setFocus={this.props.setFocus}>
										<StickySection
											openSettings={this.openOrdererSettings}
											details={this.props.selectedNode || this.props.details}
											title={this.props.selectedNode ? 'ordering_node_title' : 'ordering_service_title'}
											exportNode={this.exportOrderer}
											associateIdentityLabel="ordering_service_identity"
											loading={this.props.loading}
											exporting={this.props.exportInProgress}
											quickActions={this.getQuickActions()}
											identityNotAssociatedLabel="identity_not_associated_orderer"
											groups={this.getStickySectionGroups(translate)}
											noIdentityAssociation={!!this.props.selectedNode}
											hideDelete={this.props.selectedNode ? !canDelete : false}
											refreshCerts={this.refreshCerts}
											hideRefreshCerts={!this.props.selectedNode || (this.props.selectedNode && this.props.selectedNode.location !== 'ibm_saas')}
										/>
									</FocusComponent>
								</div>
							</div>
						</div>
						<div className="bx--col-lg-12">
							{this.props.notAvailable && (
								<div className="ibp-not-available ibp-error-panel">
									<SidePanelWarning title="orderer_not_available_title"
										subtitle="orderer_not_available_text"
									/>
								</div>
							)}
							{_.get(this.props, 'usageInfo.crstatus.type') === 'Warning' && _.get(this.props, 'usageInfo.crstatus.reason') === 'certRenewalRequired' && (
								<div className="ibp-orderer-warning ibp-error-panel">
									<SidePanelWarning title="orderer_warning_title"
										subtitle="orderer_warning_text"
									/>
									<TranslateLink className="ibp-orderer-details-cert-expiry-link"
										text="cert_renew"
									/>
								</div>
							)}
							{this.props.selectedNode && !this.props.selectedNode.consenter_proposal_fin ? (
								this.renderPendingNode(translate)
							) : (
								<div>
									{this.props.details && (
										<Tabs
											aria-label="sub-navigation"
											selected={this.props.selectedTab}
											onSelectionChange={selectedTab => {
												this.props.updateState(SCOPE, { selectedTab });
											}}
										>
											{!this.props.selectedNode && (
												<Tab id="ibp-orderer-details"
													label={translate('details')}
												>
													{!this.props.loading && this.isSystemLess(this.props.details) && !this.props.orderer_tls_identity &&
														<div>
															<SidePanelWarning title="tls_identity_not_found"
																subtitle="orderer_tls_admin_identity_not_found"
															/>
														</div>
													}
													{this.channelParticipationEnabled(this.props.details) && this.props.orderer_tls_identity &&
														<ChannelParticipationDetails
															selectedNode={this.props.selectedNode}
															channelList={this.props.channelList}
															details={this.props.details}
															unJoinComplete={this.getCPChannelList}
															loading={this.props.loading}
															isSystemLess={this.isSystemLess(this.props.details)}
															drillDown={false}
														/>
													}
													{!this.props.loading && !hasAssociatedIdentities && (
														<div className="ibp-orderer-no-identity">
															<p>{translate('orderer_no_identity')}</p>
															<Button id="no-identity-button"
																onClick={() => this.openOrdererSettings('associate')}
															>
																{translate('associate_identity')}
															</Button>
														</div>
													)}
													{!this.isSystemLess(this.props.details) && hasAssociatedIdentities && (
														<div>
															{this.renderPendingNotice(translate)}
															{this.renderRunningPartial(translate)}
															{this.renderMissingEndorsementNotice(translate)}
															<OrdererAdmins
																admins={this.props.admins}
																members={this.props.members}
																orderer={this.props.details}
																configtxlator_url={this.props.configtxlator_url}
																onClose={this.onClose}
																ordererId={this.props.match.params.ordererId}
																loading={this.props.sysChLoading}
																disableAddItem={this.props.disabled}
															/>
															<OrdererMembers
																admins={this.props.admins}
																members={this.props.members}
																configtxlator_url={this.props.configtxlator_url}
																ordererId={this.props.match.params.ordererId}
																onClose={this.onClose}
																loading={this.props.sysChLoading}
																disableAddItem={this.props.disabled}
															/>
															{this.renderConsenters(translate)}
														</div>
													)}
												</Tab>
											)}
											{!this.props.selectedNode && (
												<Tab id="ibp-orderer-nodes"
													label={translate('ordering_nodes')}
												>
													<div className="orderer-details-nodes-container">
														<ItemContainer
															containerTitle="ordering_nodes"
															itemId="ordering-nodes"
															id="ordering-nodes"
															pageSize={subnodes.length}
															isLink
															items={subnodes}
															tileMapping={{
																title: 'display_name',
																custom: data => {
																	return this.buildNodeTile(data);
																},
															}}
															select={this.openNodeDetails}
															addItems={buttonsOnTheNodesTab}
														/>
													</div>
												</Tab>
											)}
											{this.props.selectedNode && this.props.selectedNode.consenter_proposal_fin && (
												<Tab
													id="ibp-orderer-usage"
													className={
														this.props.selectedNode.isUpgradeAvailable &&
															this.props.selectedNode.location === 'ibm_saas' &&
															ActionsHelper.canCreateComponent(this.props.userInfo)
															? 'ibp-patch-available-tab'
															: ''
													}
													label={translate('usage_info', {
														patch:
															this.props.selectedNode.isUpgradeAvailable &&
																this.props.selectedNode.location === 'ibm_saas' &&
																ActionsHelper.canCreateComponent(this.props.userInfo) ?
																(
																	<div className="ibp-details-patch-container">
																		<div className="ibp-patch-available-tag ibp-node-details"
																			onClick={() => this.openOrdererSettings('upgrade')}
																		>
																			{translate('patch_available')}
																		</div>
																	</div>
																) : (
																	''
																),
													})}
												>
													<NodeDetails node={this.props.selectedNode} />
													{this.renderUsage(translate)}
												</Tab>
											)}
											{this.isSystemLess(this.props.selectedNode) && (
												<Tab
													id="ibp-orderer-channels"
													label={translate('channels')}
												>
													<ChannelParticipationDetails
														selectedNode={this.props.selectedNode}
														channelList={this.props.channelList}
														details={this.props.details}
														loading={this.props.loading}
														unJoinComplete={this.getCPChannelList}
														drillDown={true}
													/>
												</Tab>
											)}
										</Tabs>
									)}
								</div>
							)}
							{this.props.usageModal && this.props.selectedNode && (
								<ReallocateModal
									details={this.props.selectedNode}
									usageInfo={this.props.usageInfo[this.props.selectedNode.id]}
									onClose={this.hideUsageModal}
									onComplete={() => {
										const usageInfo = this.props.usageInfo;
										usageInfo[this.props.selectedNode.id] = null;
										this.props.updateState(SCOPE, { usageInfo });
										ComponentApi.getUsageInformation(this.props.selectedNode)
											.then(nodeUsageInfo => {
												usageInfo[this.props.selectedNode.id] = nodeUsageInfo;
												this.props.updateState(SCOPE, { usageInfo });
											})
											.catch(error => {
												Log.error(error);
											});
									}}
								/>
							)}
						</div>
					</div>
				</div>
			</PageContainer>
		);
	}
}

const dataProps = {
	admins: PropTypes.array,
	details: PropTypes.object,
	history: PropTypes.object,
	loading: PropTypes.bool,
	channelsLoading: PropTypes.bool,
	sysChLoading: PropTypes.bool,
	match: PropTypes.object,
	members: PropTypes.array,
	selected: PropTypes.object,
	orderer_tls_identity: PropTypes.object,
	channelList: PropTypes.object,
	systemChannel: PropTypes.bool,
	notAvailable: PropTypes.bool,
	nodes: PropTypes.array,
	disabled: PropTypes.bool,
	ordererModalType: PropTypes.string,
	usageModal: PropTypes.bool,
	nodeStatus: PropTypes.object,
	capabilities: PropTypes.object,
	exportInProgress: PropTypes.bool,
	selectedNode: PropTypes.object,
	selectedTab: PropTypes.number,
	showAddNode: PropTypes.bool,
	addToSystemChannelInProgress: PropTypes.bool,
	error: PropTypes.object,
	usageInfo: PropTypes.object,
	consenters: PropTypes.array,
	deleteConsenter: PropTypes.object,
	updateConsenter: PropTypes.object,
	setFocus: PropTypes.bool,
	missingEndorsementOrgs: PropTypes.array,
};

OrdererDetails.propTypes = {
	...dataProps,
	showBreadcrumb: PropTypes.func,
	showError: PropTypes.func,
	showWarning: PropTypes.func,
	updateBreadcrumb: PropTypes.func,
	updateState: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['configtxlator_url'] = state['settings']['configtxlator_url'];
		newProps.clusterType = _.get(state, 'settings.cluster_data.type');
		newProps['userInfo'] = state['userInfo'] ? state['userInfo'] : null;
		newProps['feature_flags'] = state['settings'] ? state['settings']['feature_flags'] : null;
		newProps['workerZones'] = _.get(state, 'settings.cluster_data.zones');
		newProps['scaleRaftNodesEnabled'] = _.get(state, 'settings.feature_flags.scale_raft_nodes_enabled');
		newProps['docPrefix'] = state['settings'] ? state['settings']['docPrefix'] : null;
		return newProps;
	},
	{
		clearNotifications,
		showBreadcrumb,
		showError,
		showSuccess,
		showWarning,
		updateBreadcrumb,
		updateState,
	}
)(withLocalize(OrdererDetails));
