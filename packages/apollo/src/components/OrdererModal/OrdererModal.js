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
import { Button, CodeSnippet, Loading, SkeletonText, Toggle, ToggleSmall, Checkbox } from 'carbon-components-react';
import _ from 'lodash';
import parse from 'parse-duration';
import PropTypes from 'prop-types';
import React from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
// import { withRouter } from 'react-router-dom';
import withRouter from '../../hoc/withRouter';
import { promisify } from 'util';
import { updateState } from '../../redux/commonActions';
import { CertificateAuthorityRestApi } from '../../rest/CertificateAuthorityRestApi';
import ChannelApi from '../../rest/ChannelApi';
import IdentityApi from '../../rest/IdentityApi';
import { MspRestApi } from '../../rest/MspRestApi';
import { NodeRestApi } from '../../rest/NodeRestApi';
import { OrdererRestApi } from '../../rest/OrdererRestApi';
import { RestApi } from '../../rest/RestApi';
import StitchApi from '../../rest/StitchApi';
import ActionsHelper from '../../utils/actionsHelper';
import Clipboard from '../../utils/clipboard';
import * as constants from '../../utils/constants';
import Helper from '../../utils/helper';
import BlockchainTooltip from '../BlockchainTooltip/BlockchainTooltip';
import ConfigOverride from '../ConfigOverride/ConfigOverride';
import Form from '../Form/Form';
import HSMConfig from '../HSMConfig/HSMConfig';
import ImportantBox from '../ImportantBox/ImportantBox';
import Logger from '../Log/Logger';
import LogSettings from '../LogSettings/LogSettings';
import { ChannelParticipationApi } from '../../rest/ChannelParticipationApi';
import SidePanelWarning from '../SidePanelWarning/SidePanelWarning';
import TranslateLink from '../TranslateLink/TranslateLink';
import Wizard from '../Wizard/Wizard';
import WizardStep from '../WizardStep/WizardStep';
import RenderParamHTML from '../RenderHTML/RenderParamHTML';
const naturalSort = require('javascript-natural-sort');

const bytes = require('bytes');
const semver = require('semver');

const SCOPE = 'ordererModal';
const Log = new Logger(SCOPE);

class OrdererModal extends React.Component {
	async componentDidMount() {
		this.props.updateState(SCOPE, {
			display_name: this.props.orderer.display_name,
			grpcwp_url: this.props.orderer.grpcwp_url,
			msp_id: this.props.orderer.msp_id,
			tls_ca_root_certs: this.props.orderer.msp.tlsca.root_certs,
			error: null,
			update: false,
			loading: true,
			channel_loading: false,
			users_loading: false,
			channelsWithNode: [],
			safeChannelsWithNode: [],
			submitting: false,
			channel_warning_20: false,
			maintenance_mode: false,
			disableRemove: true,
			disableUpgrade: true,
			availableChannelCapabilities: [],
			availableOrdererCapabilities: [],
			selectedChannelCapability: null,
			selectedOrdererCapability: null,
			ordererType: '',
			action_in_progress: null,
			advanced_loading: false,
			third_party_ca: false,
			down_nodes: [],
			hsm: null,
			cas: [],
			saas_ca: null,
			enroll_id: null,
			enroll_secret: null,
			users: [],
			saas_ca_valid: false,
			third_party_ca_valid: false,
			saas_ca_cert: null,
			saas_ca_private_key: null,
			filenames: {},
			ordererModalType: undefined,
			config_override: null,
			editedConfigOverride: null,
			associatedIdentities: {},
			applicableIdentities: {},
			current_config: null,
			manage_ecert: null,
			manage_tls_cert: null,
			manage_ekey: null,
			manage_tls_key: null,
			log_loading: false,
			log_level_identity: null,
			log_spec: null,
			new_log_spec: null,
			ignore_del_warning: false,
		});
		this.identities = null;

		//  ------------- do common things for all side panels here ------------- //
		let orderer_details = await OrdererRestApi.getClusterDetails(this.props.orderer.cluster_id, true);
		this.props.updateState(SCOPE, {
			orderer_details: orderer_details,
		});

		try {
			await this.checkNodeStatus();
		} catch (e) {
			this.props.updateState(SCOPE, {
				loading: false,
			});
		}
		//  ------------- ------------------------------------ ------------- //

		this.showAction(this.props.ordererModalType);
	}

	// load the channels this orderer is on - to find ones its a consenter on and block a delete...
	async loadChannelsOnOSN() {
		const orderer = this.props.orderer;
		if (!orderer || !orderer.osnadmin_url) { return; }
		this.props.updateState(SCOPE, {
			channel_loading: true,
			channelsWithNode: [],
			safeChannelsWithNode: [],
		});
		let channelMap = null;
		let channelsPreventingDelete = [];		// these channels have this node on it as a consenter, so deleting this consenter can lose quorum, dangerous

		let orderer_tls_identity = await IdentityApi.getTLSIdentity(orderer);
		if (orderer_tls_identity) {
			try {
				let all_identities = await IdentityApi.getIdentities();
				const channels = await ChannelParticipationApi.mapChannels(all_identities, [orderer]);
				channelMap = channels;
			} catch (e) {
				Log.error(e);
				const code = (e && !isNaN(e.status_code)) ? '(' + e.status_code + ') ' : '';
				const details = (e && typeof e.stitch_msg === 'string') ? (code + e.stitch_msg) : '';
				Log.error(details);
				channelMap = null;
			}
		}

		// find the channels this node is a consenter on, stop delete
		if (channelMap && channelMap.channels) {
			for (let i in channelMap.channels) {
				for (let node in channelMap.channels[i].nodes) {		// this is only ever an object with 1 key, our osn, so it doesn't really loop
					const osn = channelMap.channels[i].nodes[node];
					if (osn._channel_resp && osn._channel_resp.consensusRelation === 'consenter') {
						channelsPreventingDelete.push(channelMap.channels[i].name);
					}
				}
			}
		}

		this.props.updateState(SCOPE, {
			channel_loading: false,
			channelsWithNode: channelsPreventingDelete,
		});
	}

	async getChannelsWithNodes() {
		let nodesToDelete = [];
		//remove the imported nodes
		if (this.props.orderer.raft) {
			nodesToDelete = _.filter(this.props.orderer.raft, node => {
				return node.location === 'ibm_saas';
			});
		} else if (this.props.orderer.location === 'ibm_saas') {
			nodesToDelete = [this.props.orderer];
		}
		if (nodesToDelete.length === 0) return;
		const options = {
			ordererId: this.props.orderer.id,
			configtxlator_url: this.props.configtxlator_url,
		};

		let allChannels = null;
		this.props.updateState(SCOPE, {
			channel_loading: true,
		});

		try {
			allChannels = await OrdererRestApi.getAllChannelNamesFromOrderer(options, this.props.orderer_details);
		} catch (e) {
			Log.error('unable to load all channels from orderer', e);
		}

		if (!allChannels) {
			this.props.updateState(SCOPE, {
				channel_loading: false,
			});
		} else {
			// do NOT not use something.forEach(async !!!!
			// b/c forEach does not block each async await call, the different loops fire at the same time and race conditions occur
			for (let i in allChannels) {
				const channel_id = allChannels[i];
				let block_options = {
					ordererId: options.ordererId,
					channelId: channel_id,
					configtxlator_url: options.configtxlator_url,
				};
				this.props.updateState(SCOPE, {
					channel_loading: true,
				});
				try {
					const block = await OrdererRestApi.getChannelConfigBlock(block_options, this.props.orderer_details);
					const _block_binary2json = promisify(ChannelApi._block_binary2json);
					const resp = await _block_binary2json(block, options.configtxlator_url);
					let l_consenters = _.get(resp, 'data.data[0].payload.data.config.channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters', []);
					let orderersInConsenter = [];
					nodesToDelete.forEach(node => {
						let ordererInConsenter = _.filter(l_consenters, consenter => {
							return node.backend_addr === consenter.host + ':' + Number(consenter.port);
						});
						if (!_.isEmpty(ordererInConsenter)) orderersInConsenter.push(ordererInConsenter);
					});
					// if this is the only node in consenter, don't count the channel
					if (orderersInConsenter.length > 0 && orderersInConsenter.length !== l_consenters.length) {
						let channelsWithNode = [...this.props.channelsWithNode, channel_id];
						channelsWithNode.sort((a, b) => {
							return naturalSort(a, b);
						});
						this.props.updateState(SCOPE, {
							channelsWithNode,
						});
					} else if (orderersInConsenter.length > 0 && orderersInConsenter.length === l_consenters.length) {
						let safeChannelsWithNode = [...this.props.safeChannelsWithNode, channel_id];
						safeChannelsWithNode.sort((a, b) => {
							return naturalSort(a, b);
						});
						this.props.updateState(SCOPE, {
							safeChannelsWithNode,
						});
					}
				} catch (error) {
					this.props.updateState(SCOPE, {
						channel_loading: false,
					});
					Log.error(error);
				}

				this.props.updateState(SCOPE, {
					channel_loading: false,
				});
			}
		}
		this.props.updateState(SCOPE, {
			channel_loading: false,
		});
	}

	onComplete() {
		if (typeof this.props.onComplete === 'function') return this.props.onComplete(...arguments);
		Log.warn(`${SCOPE} ${this.props.ordererModalType}: onComplete() is not set`);
	}

	componentWillUnmount() {
		const data = {
			associatedIdentities: {},
			currentCapabilities: {},
		};
		if (this.props.associatedIdentities) {
			const keys = Object.keys(this.props.associatedIdentities);
			keys.forEach(msp_id => {
				data['identity_' + msp_id] = null;
			});
		}
		this.props.updateState(SCOPE, data);
	}

	async checkNodeStatus() {
		this.props.updateState(SCOPE, {
			loading: true,
		});
		let components = {};
		let orderer = this.props.orderer_details;

		if (_.has(orderer, 'raft')) {
			orderer.raft.forEach(x => {
				components[x.id] = {
					skip_cache: true,
				};
			});
		} else {
			components[orderer.id] = {
				skip_cache: true,
			};
		}

		let statuses = null;
		try {
			statuses = await RestApi.post('/api/v3/components/status', { components });
		} catch (e) {
			Log.error(e);
		}
		if (statuses) {
			let notOkList = _.filter(statuses, status => status.status === 'not ok');
			if (_.size(notOkList) > 0) {
				const down_nodes = notOkList.map(node => {
					if (orderer && orderer.raft) {
						const node_details = orderer.raft.find(component => component.operations_url + '/healthz' === node.status_url);
						return node_details.display_name;
					}
				});
				this.props.updateState(SCOPE, {
					down_nodes,
				});
			}
		}
		this.props.updateState(SCOPE, {
			loading: false,
		});
	}

	async getCAList() {
		return new Promise((resolve, reject) => {
			if (this.props.cas && this.props.cas.length > 0) {
				Log.debug('CAs from store:', this.props.cas);
				resolve(this.props.cas);
			} else {
				CertificateAuthorityRestApi.getCAs()
					.then(cas => {
						Log.debug('CAs from backend:', cas);
						resolve(cas);
					})
					.catch(error => {
						Log.error('An error occurred when getting list of available CAs: ', error);
						reject(error);
					});
			}
		});
	}

	async getCAWithUsers() {
		this.props.updateState(SCOPE, {
			users_loading: true,
		});
		try {
			const cas = await this.getCAList();
			this.props.updateState(SCOPE, { cas });
			if (this.props.ordererModalType === 'update_certs') {
				for (let i in cas) {
					await this.loadUsersFromCA(cas[i]);
				}
			}
		} catch (error) {
			Log.error(error);
		}

		await this.loadIdentities();
		this.props.updateState(SCOPE, {
			users_loading: false,
		});
	}

	async loadUsersFromCA(ca) {
		try {
			const all_users = await CertificateAuthorityRestApi.getUsers(ca);
			const users = [];
			if (all_users && all_users.length) {
				all_users.forEach(user => {
					if (user.type === 'peer') {		// dsh why are we looking for peer on the orderer modal!?
						users.push(user);
					}
				});
			}
			this.props.updateState(SCOPE, { users });
		} catch (error) {
			Log.error(error);
			this.props.updateState(SCOPE, {
				users: [],
			});
		};
	}

	getIdentityFromName(name) {
		let id = null;
		if (this.identities) {
			this.identities.forEach(identity => {
				if (identity.name === name) {
					id = identity;
				}
			});
		}
		return id;
	}

	async getApplicableIdentities(associatedIdentities) {
		const keys = Object.keys(associatedIdentities);
		let valid_identities = {};
		const allOrderers = this.props.orderer.raft ? this.props.orderer.raft : [this.props.orderer];
		let msp_root_certs = {};
		let msp_root_certs_intermediate = {};
		for (let orderer of allOrderers) {
			msp_root_certs[orderer.msp_id] = _.get(orderer, 'msp.ca.root_certs');
			let all_msps = await MspRestApi.getAllMsps();
			all_msps.forEach(msp => {
				if (orderer && msp && msp_root_certs) {
					if (orderer.msp_id === msp.msp_id && _.isEqual(msp_root_certs[orderer.msp_id], msp.root_certs)) {
						msp_root_certs_intermediate[orderer.msp_id] = msp.intermediate_certs;
					}
				}
			});
		}
		for (const msp_id of keys) {
			let identity4msp = [];
			for (let l_identity of this.identities) {
				let opts = {
					certificate_b64pem: l_identity.cert,
					root_certs_b64pems: Helper.safer_concat(msp_root_certs[msp_id], msp_root_certs_intermediate[msp_id]),
				};
				let match = await StitchApi.isIdentityFromRootCert(opts);
				if (match) {
					identity4msp.push(l_identity);
				}
			}
			valid_identities[msp_id] = identity4msp;
		}
		return valid_identities;
	}

	async loadIdentities() {
		this.identities = null;
		let identities;
		try {
			identities = await IdentityApi.getIdentities();
		} catch (error) {
			Log.error('unable to get identities:', error);
		}
		const associatedIdentities = {};
		if (identities && identities.length) {
			this.identities = identities;
			if (this.props.orderer && this.props.orderer.raft) {
				this.props.orderer.raft.forEach(node => {
					if (associatedIdentities[node.msp_id] === undefined) {
						associatedIdentities[node.msp_id] = null;
						if (this.props.orderer.associatedIdentities) {
							this.props.orderer.associatedIdentities.forEach(identity => {
								if (identity.msp_id === node.msp_id) {
									associatedIdentities[node.msp_id] = this.getIdentityFromName(identity.name);
								}
							});
						}
					}
				});
			}
			if (this.props.orderer && this.props.orderer.pending) {
				this.props.orderer.pending.forEach(node => {
					if (associatedIdentities[node.msp_id] === undefined) {
						associatedIdentities[node.msp_id] = null;
						if (this.props.orderer.associatedIdentities) {
							this.props.orderer.associatedIdentities.forEach(identity => {
								if (identity.msp_id === node.msp_id) {
									associatedIdentities[node.msp_id] = this.getIdentityFromName(identity.name);
								}
							});
						}
					}
				});
			}
		}
		this.props.updateState(SCOPE, {
			associatedIdentities,
			applicableIdentities: await this.getApplicableIdentities(associatedIdentities),
		});
	}

	isAll20Nodes = () => {
		let isAll20 = true;
		if (this.props.orderer && this.props.orderer.raft) {
			this.props.orderer.raft.forEach(orderer => {
				if (!orderer.version || orderer.version.indexOf('2') !== 0) {
					isAll20 = false;
				}
			});
		}
		return isAll20;
	};

	getAvailableCapabilities = () => {
		if (this.props.capabilitiesEnabled) {
			let availableChannelCapabilities = this.props.capabilities ? Helper.getFormattedCapabilities(this.props.capabilities.channel) : [];
			if (this.props.currentCapabilities.channel) {
				let currentChannelCapability = semver.coerce(this.props.currentCapabilities.channel.replace(/_/g, '.')).version;
				availableChannelCapabilities = availableChannelCapabilities.filter(x => semver.gte(x.value, currentChannelCapability));
			}

			let availableOrdererCapabilities = this.props.capabilities ? Helper.getFormattedCapabilities(this.props.capabilities.orderer) : [];
			if (this.props.currentCapabilities.orderer) {
				let currentOrdererCapability = semver.coerce(this.props.currentCapabilities.orderer.replace(/_/g, '.')).version;
				availableOrdererCapabilities = availableOrdererCapabilities.filter(x => semver.gte(x.value, currentOrdererCapability));
			}
			this.props.updateState(SCOPE, {
				availableChannelCapabilities,
				availableOrdererCapabilities,
			});
		}
	};

	populateBlockParams() {
		this.props.updateState(SCOPE, { advanced_loading: true });
		OrdererRestApi.getSystemChannelConfig({ cluster_id: this.props.orderer.cluster_id }, this.props.configtxlator_url)
			.then(resp => {
				this.props.updateState(SCOPE, {
					absolute_max_bytes: _.get(resp, 'channel_group.groups.Orderer.values.BatchSize.value.absolute_max_bytes'),
					max_message_count: _.get(resp, 'channel_group.groups.Orderer.values.BatchSize.value.max_message_count'),
					preferred_max_bytes: _.get(resp, 'channel_group.groups.Orderer.values.BatchSize.value.preferred_max_bytes'),
					timeout: _.get(resp, 'channel_group.groups.Orderer.values.BatchTimeout.value.timeout'),
					tick_interval: _.get(resp, 'channel_group.groups.Orderer.values.ConsensusType.value.metadata.options.tick_interval'),
					election_tick: _.get(resp, 'channel_group.groups.Orderer.values.ConsensusType.value.metadata.options.election_tick'),
					heartbeat_tick: _.get(resp, 'channel_group.groups.Orderer.values.ConsensusType.value.metadata.options.heartbeat_tick'),
					max_inflight_blocks: _.get(resp, 'channel_group.groups.Orderer.values.ConsensusType.value.metadata.options.max_inflight_blocks'),
					snapshot_interval_size: _.get(resp, 'channel_group.groups.Orderer.values.ConsensusType.value.metadata.options.snapshot_interval_size'),
					ordererType: _.get(resp, 'channel_group.groups.Orderer.values.ConsensusType.value.type'),
					advanced_loading: false,
				});
			})
			.catch(error => {
				Log.error(error);
				this.props.updateState(SCOPE, {
					error,
				});
			});
	}

	// figure out if maintenance mode is currently on or off
	getMaintenanceModeState() {
		this.props.updateState(SCOPE, { advanced_loading: true });
		OrdererRestApi.getSystemChannelConfig({ cluster_id: this.props.orderer.cluster_id }, this.props.configtxlator_url)
			.then(resp => {
				let channel_state = _.get(resp, 'channel_group.groups.Orderer.values.ConsensusType.value.state');
				let maintenance_mode = (channel_state === 'STATE_MAINTENANCE');
				this.props.updateState(SCOPE, {
					maintenance_mode,
					advanced_loading: false,
				});
			})
			.catch(error => {
				Log.error(error);
				this.props.updateState(SCOPE, {
					error,
				});
			});
	}

	updateOrderer = (resolve, reject) => {
		const orderer = {
			id: this.props.orderer.id,
		};
		Helper.checkPropertyForUpdate(orderer, this.props, 'display_name', this.props.orderer);
		Helper.checkPropertyForUpdate(orderer, this.props, 'tls_ca_root_certs', this.props.orderer, 'msp.tlsca.root_certs');
		if (this.props.orderer.raft) {
			if (this.props.orderer.raft.length) {
				orderer.id = this.props.orderer.raft[0].id;
			} else {
				orderer.id = this.props.orderer.pending[0].id;
			}
			if (orderer.display_name) {
				orderer.cluster_name = orderer.display_name;
				delete orderer.display_name;
			}
		}
		OrdererRestApi.updateOrderer(orderer)
			.then(orderer => {
				this.props.onComplete(orderer);
				resolve();
			})
			.catch(error => {
				Log.error(error);
				reject({
					title: 'error_update_orderer',
					details: error,
				});
			});
	};

	async removeOrderer() {
		const prefix = 'removing Orderer:';
		const feature_flags = {
			...this.props.feature_flags,
			scale_raft_nodes_enabled: this.props.ordererModalType === 'force_delete' ? false : this.props.feature_flags.scale_raft_nodes_enabled,
		};

		// todo This portion of the OrdererRestApi hasn't been updated to use translated errors.  Isolate it from the removeOrderer flow for now
		try {
			// only take out the node from consenter set if this is deployed (not imported)
			// only take out these nodes if we are using a system channel, if systemless skip this part
			if (this.props.orderer && this.props.orderer.location === 'ibm_saas' && this.props.ordererModalType !== 'force_delete' && this.props.systemChannel) {
				await OrdererRestApi.removeAllNodesFromSystemChannel(this.props.orderer, this.props.configtxlator_url, feature_flags);
			}
		} catch (error) {
			Log.error(`${prefix} Could not remove nodes from system channel before removal: ${error}:`, error);
			if (error && error.message === 'failed to retrieve system channel') {
				// todo move this error down into the library itself
				this.props.updateState(SCOPE, { ordererModalType: 'force_delete' });
				const e = new Error(`Failed to remove nodes from system channel: ${error.message}`);
				e.name = 'SYSTEM_CHANNEL_RETRIEVAL_FAILED';
				e.translation = {
					title: 'error_remove_node_from_sys_channel_title',
					message: error.stitch_msg || error,
				};
				throw e;
			} else if (error && error.message && error.message.includes('Missing an argument - client certificate')) {
				this.props.updateState(SCOPE, { ordererModalType: 'force_delete' });
				const e = new Error(`Failed to remove nodes from system channel because missing an associated OS identity: ${error && (error.message || error.stitch_msg)}`);
				e.name = 'SYSTEM_CHANNEL_NODE_REMOVAL_FAILED';
				e.translation = {
					title: 'error_remove_node_from_sys_channel_title',
					message: 'error_remove_from_sys_channel_os_identity',
				};
				throw e;
			} else {
				// todo move this error down into the library itself
				this.props.updateState(SCOPE, { ordererModalType: 'force_delete' });
				const e = new Error(`Failed to remove nodes from system channel: ${error && (error.message || error.stitch_msg)}`);
				e.name = 'SYSTEM_CHANNEL_NODE_REMOVAL_FAILED';
				e.translation = {
					title: 'error_remove_node_from_sys_channel_title',
					message: 'error_remove_node_from_sys_channel',
				};
				throw e;
			}
		}

		try {
			Log.info(`${prefix} removing the orderer`);
			const force_delete = this.props.ordererModalType === 'force_delete';
			await OrdererRestApi.removeOrderer(this.props.orderer, force_delete);
		} catch (error) {
			Log.error(`${prefix} failed to remove the orderer: ${error}`);
			throw error;
		}

		// todo This portion of the OrdererRestApi hasn't been updated to use translated errors.  Isolate it from the removeOrderer flow for now
		let ordererList;
		try {
			Log.info(`${prefix} getting the updated list of orderers`);
			ordererList = await OrdererRestApi.getOrderers(true);
		} catch (error) {
			Log.error(`${prefix} could not get orderer list after removal: ${error}:`, error);
			// todo move this error into the library itself
			const e = new Error(`Could not get orderers after orderer removal: ${error.message}`);
			e.name = 'GET_ORDERERS_FAILED_AFTER_REMOVAL';
			e.translation = {
				title: 'error_get_orderers_after_removal_title',
				message: 'error_get_orderers_after_removal',
			};
			throw e;
		}

		// todo shouldn't be this component's job.  The OrdererDetails component should already know that he should refresh his information.
		this.onComplete(ordererList);

		// todo this page-altering logic should be in the OrdererDetails component.  This component is making assumptions about where it lives
		let cluster_still_valid = false;
		if (this.props.orderer.cluster_id) {
			ordererList.forEach(test => {
				if (test.cluster_id === this.props.orderer.cluster_id) {
					cluster_still_valid = true;
				}
			});
		}
		if (cluster_still_valid) {
			this.props.history.push('/orderer/' + encodeURIComponent(this.props.orderer.cluster_id) + window.location.search);
		} else {
			this.props.history.push('/nodes' + window.location.search);
		}
	}

	upgradeNode = (resolve, reject) => {
		let opts = {
			id: this.props.orderer.id,
			version: this.props.new_version,
		};
		NodeRestApi.applyPatch(opts)
			.then(resp => {
				Log.debug('Upgrade orderer response: ', resp);
				if ((resp && resp.message && resp.message === 'ok') || (resp && resp.status && resp.status === 'created')) {
					this.props.onComplete(resp);
					resolve();
				} else {
					reject({
						title: 'error_occurred_during_upgrade',
						details: resp,
					});
				}
			})
			.catch(error => {
				Log.error('Error occurred while applying patch ', error.msg);
				reject({
					title: 'error_occurred_during_upgrade',
					details: error,
				});
			});
	};

	// show the side panel for this action
	async showAction(action) {
		this.props.updateState(SCOPE, {
			action_in_progress: this.props.ordererModalType,
			ordererModalType: action,
		});

		// only call functions we need for that specific side panel
		switch (action) {
			case 'delete':
			case 'force_delete':
				try {
					if (this.props.systemChannel) {
						await this.getChannelsWithNodes();		// legacy way
					} else {
						await this.loadChannelsOnOSN();			// osn admin way
					}
				} catch (e) {
					this.props.updateState(SCOPE, {
						channel_loading: false,
					});
				}
				break;
			case 'associate':
			case 'update_certs':
			case 'manage_certs':
				this.getCAWithUsers();
				break;
			case 'capabilities':
				this.getAvailableCapabilities();
				break;
			case 'channel_maintenance':
				this.getMaintenanceModeState();
				break;
			//case 'config_override':
			case 'advanced':
				this.populateBlockParams();
				break;
			//case 'restart':
			case 'log_settings':
				this.getLogSettings();
				break;
			//case 'upgrade':
			//case 'restart':
			//case 'manage_hsm':
			//case 'enable_hsm':
			//case 'update_hsm':
			//case 'remove_hsm':
		}
	}

	hideAction = () => {
		this.props.updateState(SCOPE, {
			action_in_progress: null,
			ordererModalType: this.props.action_in_progress,
		});
		this.props.updateState('wizard', { error: null });
	};

	renderNodeActionButtons(translate) {
		if (!this.props.orderer) {
			return;
		}
		if (this.props.loading) {
			return (
				<div>
					<SkeletonText
						style={{
							paddingTop: '.5rem',
							width: '8rem',
							height: '2.5rem',
						}}
					/>
				</div>
			);
		}
		const buttons = [];
		if (!Helper.is_imported(this.props.orderer) && ActionsHelper.canCreateComponent(this.props.userInfo, this.props.feature_flags)) {
			if (this.props.clusterType !== 'free') {
				buttons.push({
					id: 'edit_config_override',
					onClick: this.showConfigOverride,
				});
			}
			// Do not allow HSM enable, disable, or update for now
			// if (this.props.feature_flags && this.props.feature_flags.hsm_enabled) {
			// 	const hsm = Helper.getHSMBCCSP(_.get(this.props, 'orderer.config_override.General')) === 'PKCS11';
			// 	if (hsm) {
			// 		buttons.push({
			// 			id: 'update_hsm_action',
			// 			label: 'update_hsm',
			// 		});
			// 		buttons.push({
			// 			id: 'remove_hsm_action',
			// 			label: 'remove_hsm',
			// 		});
			// 	} else {
			// 		buttons.push({
			// 			id: 'enable_hsm_action',
			// 			label: 'enable_hsm',
			// 		});
			// 	}
			// }
			if (_.get(this.props.orderer, 'crypto.enrollment') || _.get(this.props.orderer, 'crypto.msp')) {
				buttons.push({
					id: 'manage_certs',
					label: 'update_certs',
				});
			}
			buttons.push({
				id: 'restart',
			});
		}
		if (this.props.orderer.operations_url) {
			buttons.push({
				id: 'log_settings',
			});
		}
		if (buttons.length === 0) {
			return;
		}
		return (
			<div>
				<p className="ibp-actions-title">{translate('actions')}</p>
				{buttons.map(button => (
					<button
						id={button.id}
						key={button.id}
						className="ibp-ca-action bx--btn bx--btn--tertiary bx--btn--sm"
						onClick={() => {
							if (button.onClick) {
								button.onClick();
							} else {
								this.showAction(button.id);
							}
						}}
					>
						{translate(button.label || button.id)}
					</button>
				))}
			</div>
		);
	}

	renderDetails(translate) {
		const isNode = this.props.orderer && !this.props.orderer.raft;
		const fields = [];
		fields.push({
			name: 'display_name',
			label: 'name',
			placeholder: 'name_placeholder',
			tooltip: 'edit_orderer_name_tooltip',
			tooltipDirection: 'bottom',
			required: true,
			default: this.props.display_name,
			specialRules: Helper.SPECIAL_RULES_DISPLAY_NAME,
		});
		if (isNode) {
			fields.push({
				name: 'tls_ca_root_certs',
				alias: 'pem',
				label: 'pem',
				placeholder: 'pem_placeholder',
				type: 'certificates',
				required: true,
				validate: Helper.isCertificate,
				tooltip: 'pem_tooltip',
				readonly: this.props.orderer.location === 'ibm_saas',
				default: _.get(this.props, 'orderer.msp.tlsca.root_certs'),
			});
		}
		return (
			<WizardStep
				type="WizardStep"
				title={isNode ? 'orderer_node_settings' : 'orderer_settings'}
				disableSubmit={!this.props.update || (this.props.config_override && !this.props.editedConfigOverride)}
			>
				<Form
					scope={SCOPE}
					id={SCOPE}
					fields={fields}
					onChange={(data, valid) => {
						const changed = Helper.isChanged(fields, data, this.props, this.props.orderer);
						this.props.updateState(SCOPE, {
							update: valid && (changed || this.props.editedConfigOverride),
						});
					}}
				/>
				{this.props.isOrdererAdmin && !isNode && (
					<div>
						<p className="ibp-actions-title">{translate('actions')}</p>
						<div>
							<Button
								id="advanced"
								kind="secondary"
								className="ibp-orderer-action"
								onClick={() => {
									this.showAction('advanced');
								}}
							>
								{translate('advanced_orderer_config')}
							</Button>
							{this.props.capabilitiesEnabled && (<Button
								id="capabilities"
								kind="secondary"
								className="ibp-orderer-action"
								onClick={() => {
									this.showAction('capabilities');
								}}
							>
								{translate('channel_capabilities')}
							</Button>)}
							<Button
								id="channel_maintenance"
								kind="secondary"
								className="ibp-orderer-action"
								onClick={() => {
									this.showAction('channel_maintenance');
								}}
							>
								{translate('advanced_channel_maintenance')}
							</Button>
						</div>
					</div>
				)}
				{!!isNode && this.renderNodeActionButtons(translate)}
			</WizardStep>
		);
	}

	showConfigOverride = () => {
		this.props.updateState(SCOPE, {
			current_config: null,
			current_config_json: null,
			config_override: {},
			editedConfigOverride: {},
			ordererModalType: 'config_override',
		});
		NodeRestApi.getCurrentNodeConfig(this.props.orderer)
			.then(config => {
				this.props.updateState(SCOPE, {
					current_config: config,
				});
			})
			.catch(error => {
				Log.error(error);
				this.props.updateState(SCOPE, {
					current_config: {},
				});
			});
	};

	hideConfigOverride = () => {
		this.props.updateState(SCOPE, {
			config_override: null,
			editedConfigOverride: null,
			ordererModalType: null,
		});
	};

	renderConfigOverride(translate) {
		return (
			<WizardStep type="WizardStep"
				title="edit_config_override"
				disableSubmit={!this.props.editedConfigOverride}
				onCancel={this.hideConfigOverride}
			>
				<Form
					scope={SCOPE}
					id="config_override"
					fields={[
						{
							name: 'current_config_json',
							default: JSON.stringify(this.props.current_config || {}, null, 2),
							readonly: true,
							type: 'textarea',
							loading: !this.props.current_config,
						},
					]}
				/>
				<div className="ibp-form">
					<div className="ibp-form-field">
						<div>
							<BlockchainTooltip type="definition"
								tooltipText={translate('config_override_delta')}
							>
								{translate('config_override_json')}
							</BlockchainTooltip>
							<TranslateLink text="config_override_update_orderer"
								className="ibp-orderer-config-override-desc-with-link"
							/>
						</div>
						<p className="ibp-form-input">
							<ConfigOverride
								id="ibp-config-override"
								config_override={this.props.config_override}
								onChange={editedConfigOverride => {
									this.props.updateState(SCOPE, {
										editedConfigOverride,
									});
								}}
							/>
						</p>
					</div>
				</div>
			</WizardStep>
		);
	}

	onIdentityChange = (data, valid) => {
		this.props.updateState(SCOPE, {});
	};

	// update the orderer services block parameters
	updateBlockParams = (resolve, reject) => {
		const payload = {
			cluster_id: this.props.orderer.cluster_id,
			configtxlator_url: this.props.configtxlator_url,
			block_params: {
				absolute_max_bytes: parseInt(this.props.absolute_max_bytes),
				max_message_count: parseInt(this.props.max_message_count),
				preferred_max_bytes: parseInt(this.props.preferred_max_bytes),
				timeout: this.props.timeout,
			},
			raft_params: {
				snapshot_interval_size: parseInt(this.props.snapshot_interval_size),
				/* election_tick: parseInt(this.props.election_tick),
				heartbeat_tick: parseInt(this.props.heartbeat_tick),
				max_inflight_blocks: parseInt(this.props.max_inflight_blocks),
				tick_interval: this.props.tick_interval, */
			},
		};

		OrdererRestApi.updateAdvancedConfig(payload)
			.then(resp => {
				this.props.onComplete();
				resolve();
			})
			.catch(error => {
				Log.error(error);
				let title = 'error_updating_block_params';
				let details = error.message;
				if (_.has(error, 'stitch_msg') && _.includes(error.stitch_msg, 'no Raft leader')) {
					title = 'error_no_raft_leader';
					details = _.get(error, 'stitch_msg');
				}
				reject({
					title,
					details,
				});
			});
	};

	updateCapabilities = (resolve, reject) => {
		const payload = {
			cluster_id: this.props.orderer.cluster_id,
			configtxlator_url: this.props.configtxlator_url,
			capabilities: {
				orderer:
					this.props.selectedOrdererCapability && this.props.selectedOrdererCapability.id !== 'select_capability' ? [this.props.selectedOrdererCapability.id] : null,
				channel:
					this.props.selectedChannelCapability && this.props.selectedChannelCapability.id !== 'select_capability' ? [this.props.selectedChannelCapability.id] : null,
			},
		};
		OrdererRestApi.updateAdvancedConfig(payload)
			.then(resp => {
				Log.debug('updated capabilities, received response:', resp);
				this.props.onComplete();
				resolve();
			})
			.catch(error => {
				Log.error(error);
				let title = 'error_updating_channel_capabilities';
				let details = error;
				if (_.includes(error, 'no differences detected between original and updated config')) {
					title = 'no_capability_changes';
				}
				reject({
					title,
					details,
				});
			});
	};


	updateChannelMaintenance = (resolve, reject) => {
		const payload = {
			cluster_id: this.props.orderer.cluster_id,
			configtxlator_url: this.props.configtxlator_url,
			maintenance_mode: this.props.maintenance_mode,
		};

		OrdererRestApi.updateAdvancedConfig(payload)
			.then(resp => {
				this.props.onComplete();
				resolve();
			})
			.catch(error => {
				Log.error(error);
				let title = 'error_updating_channel_capabilities';
				let details = error;
				if (_.includes(error, 'no differences detected between original and updated config')) {
					title = 'no_capability_changes';
				}
				reject({
					title,
					details,
				});
			});
	};

	calculateCapabilityWarning(data) {
		let ordererCapability = data.selectedOrdererCapability || this.props.selectedOrdererCapability;
		let channelCapability = data.selectedChannelCapability || this.props.selectedChannelCapability;
		if (
			(_.get(ordererCapability, 'id', ordererCapability).indexOf('V2') === 0 || _.get(channelCapability, 'id', channelCapability).indexOf('V2') === 0) &&
			!this.isAll20Nodes()
		) {
			this.props.updateState(SCOPE, {
				channel_warning_20: true,
			});
		} else {
			this.props.updateState(SCOPE, {
				channel_warning_20: false,
			});
		}
	}

	async associateIdentityWithOrderer() {
		const keys = Object.keys(this.props.associatedIdentities);
		keys.reduce(async (previousPromise, msp_id) => {
			await previousPromise;
			const id = this.props.associatedIdentities[msp_id];
			try {
				if (id && id.name && id.cert) {
					return await IdentityApi.associateOrderer(id.name, this.props.orderer.cluster_id, msp_id);
				} else {
					return await IdentityApi.removeOrdererAssociations(this.props.orderer.cluster_id, msp_id);
				}
			} catch (error) {
				Log.error(error);
				let newError = new Error('Unable to associate identity');
				newError.title = 'error_associate_identity';
				newError.details = error;
				throw newError;
			}
		}, Promise.resolve());
		this.props.onComplete();
		return;
	}

	renderAssociate(translate) {
		if (!this.props.associatedIdentities) {
			return;
		}
		const do_not_associate = {
			name: translate('do_not_associate'),
		};
		const fields = [];
		const keys = Object.keys(this.props.associatedIdentities);
		keys.forEach(msp_id => {
			const msp_identity = this.props.associatedIdentities[msp_id];
			const options = this.props.applicableIdentities[msp_id] ? [do_not_associate, ...this.props.applicableIdentities[msp_id]] : [];
			fields.push({
				name: 'identity_' + msp_id,
				type: 'dropdown',
				tooltip: 'existing_identity_dropdown_tooltip',
				options,
				required: false,
				label: 'orderer_admin_identity',
				default: !this.identities || !this.identities.length ? translate('no_identities') : msp_identity ? msp_identity : do_not_associate,
			});
		});
		return (
			<WizardStep type="WizardStep"
				title="associate_identity"
				disableSubmit={!this.identities || !this.identities.length}
			>
				<div>
					<p className="ibp-modal-desc">{translate('associate_orderer_desc')}</p>
				</div>
				<div>
					{(!this.identities || !this.identities.length) && <p className="ibp-no-identities">{translate('no_orderer_identities')}</p>}
					<Form
						scope={SCOPE}
						id={SCOPE + '-associate'}
						fields={fields}
						onChange={data => {
							const changed = Object.keys(data);
							const associatedIdentities = { ...this.props.associatedIdentities };
							changed.forEach(field => {
								const msp_id = field.substring(9);
								associatedIdentities[msp_id] = data[field];
							});
							this.props.updateState(SCOPE, { associatedIdentities });
						}}
					/>
				</div>
			</WizardStep>
		);
	}

	renderRemove(translate) {
		const isNode = this.props.orderer && !this.props.orderer.raft;
		let title = 'remove_orderer';
		if (this.props.orderer.location === 'ibm_saas') {
			title = 'delete_orderer';
		}
		if (isNode) {
			title = title + '_node';
		}
		return (
			<WizardStep
				type="WizardStep"
				title={title}
				disableSubmit={this.props.disableRemove || this.props.channel_loading ||
					(this.props.channelsWithNode && this.props.channelsWithNode.length > 0 && this.props.ignore_del_warning === false)
				}
			>
				<div className="ibp-remove-orderer-desc">
					<p>
						{this.props.orderer.location === 'ibm_saas'
							? RenderParamHTML(translate, this.props.orderer.cluster_id && !this.props.orderer.raft ? 'delete_orderer_node_desc' : 'delete_orderer_desc', {
								name: (
									<CodeSnippet
										type="inline"
										ariaLabel={translate('copy_text', { copyText: this.props.orderer.display_name })}
										light={false}
										onClick={() => Clipboard.copyToClipboard(this.props.orderer.display_name)}
									>
										{this.props.orderer.display_name}
									</CodeSnippet>
								),
							})
							: RenderParamHTML(translate, 'remove_orderer_desc', {
								name: (
									<CodeSnippet
										type="inline"
										ariaLabel={translate('copy_text', { copyText: this.props.orderer.display_name })}
										light={false}
										onClick={() => Clipboard.copyToClipboard(this.props.orderer.display_name)}
									>
										{this.props.orderer.display_name}
									</CodeSnippet>
								),
							})}
					</p>
				</div>
				<div>
					<div className="ibp-remove-orderer-confirm">
						{translate(this.props.orderer.cluster_id && !this.props.orderer.raft ? 'remove_orderer_node_confirm' : 'remove_orderer_confirm')}
					</div>
					<Form
						scope={SCOPE}
						id={SCOPE + '-remove'}
						fields={[
							{
								name: 'confirm_orderer_name',
								tooltip: this.props.orderer.cluster_id && !this.props.orderer.raft ? 'confirm_orderer_node_tooltip' : 'remove_orderer_name_tooltip',
								label: this.props.orderer.cluster_id && !this.props.orderer.raft ? 'confirm_orderer_node_name' : 'confirm_orderer_name',
							},
						]}
						onChange={data => {
							this.props.updateState(SCOPE, {
								disableRemove: data.confirm_orderer_name !== this.props.orderer.display_name,
							});
						}}
					/>
				</div>
				{this.props.channelsWithNode && this.props.channelsWithNode.length > 0 && (
					<>
						<ImportantBox text={this.props.systemChannel ? 'consenter_exists_warning' : 'consenter_exists_warning_simpler'} />
						<ul>
							{this.props.channelsWithNode.map(channel => {
								return (
									<li className="ibp-note-bullet"
										key={channel}
									>
										<div className="ibp-note-bullet-point">-</div>
										<div className="ibp-note-bullet-text">
											<strong>{channel} </strong>
										</div>
									</li>
								);
							})}
						</ul>
					</>
				)}
				{this.props.safeChannelsWithNode && this.props.safeChannelsWithNode.length > 0 && (
					<>
						<ImportantBox text="safe_consenter_exists_warning" />
						<ul>
							{this.props.safeChannelsWithNode.map(channel => {
								return (
									<li className="ibp-note-bullet"
										key={channel}
									>
										<div className="ibp-note-bullet-point">-</div>
										<div className="ibp-note-bullet-text">
											<strong>{channel} </strong>
										</div>
									</li>
								);
							})}
						</ul>
					</>
				)}

				{this.props.channelsWithNode && this.props.channelsWithNode.length > 0 && (<Checkbox
					id="ignore-del-id"
					labelText={translate('ignore_del_warning')}
					onChange={() => {
						this.props.updateState(SCOPE, {
							ignore_del_warning: !this.props.ignore_del_warning,
						});
					}}
					checked={this.props.ignore_del_warning}
				/>
				)}
			</WizardStep>
		);
	}

	renderForceDelete(translate) {
		const isNode = this.props.orderer && !this.props.orderer.raft;
		return (
			<WizardStep type="WizardStep"
				title={isNode ? 'delete_orderer_node' : 'delete_orderer'}
			>
				<div className="ibp-remove-orderer-desc">
					<p>{translate('force_delete_orderer_desc')}</p>
				</div>
				<ImportantBox text="force_delete_important_box" />
			</WizardStep>
		);
	}

	renderAdvanced(translate) {
		let absolute_max_b = this.props.absolute_max_bytes ? this.props.absolute_max_bytes : bytes(constants.ABSOLUTE_MAX_BYTES_DEFAULT);
		return (
			<WizardStep
				type="WizardStep"
				title="block_parameters"
				onCancel={() => {
					this.props.updateState(SCOPE, { ordererModalType: 'settings' });
				}}
				disableSubmit={this.props.advanced_loading}
			>
				<p className="ibp-modal-desc">
					{translate('advanced_config_desc')}
					<a href={translate('advanced_config_docs')}
						className="ibp-advanced-config-learn-more"
						target="_blank"
						rel="noopener noreferrer"
					>
						{translate('find_more_here')}
					</a>
				</p>
				{this.props.advanced_loading && <Loading withOverlay={false} />}
				{/*
					// the input sliders in this form are really picky, they only accept the default number the first time it is rendered
					// so to get that to work right, we can't render them at all until get the current values from an orderer.
				*/}
				{!this.props.advanced_loading && <div>

					<Form
						scope={SCOPE}
						id={SCOPE + '-advanced'}
						onChange={data => {
							if (data.absolute_max_bytes_mb !== undefined) {
								this.props.updateState(SCOPE, {
									absolute_max_bytes: Math.floor(data.absolute_max_bytes_mb * 1024 * 1024),
								});
							}
							if (data.timeout_ms !== undefined) {
								this.props.updateState(SCOPE, {
									timeout: data.timeout_ms + 'ms',
								});
							}
						}}
						fields={[
							{
								name: 'absolute_max_bytes_mb',
								label: 'absolute_max_bytes',
								tooltip: 'absolute_max_bytes_tooltip',
								tooltipOptions: { absolute_max_bytes_max: constants.ABSOLUTE_MAX_BYTES_MAX },
								default: Math.floor(absolute_max_b / (1024 * 1024)),
								type: 'slider',
								min: 0.01,
								max: bytes(constants.ABSOLUTE_MAX_BYTES_MAX) / (1024 * 1024),
								step: 0.01,
								unit: translate('megabyte'),
							},
							{
								name: 'max_message_count',
								default: this.props.max_message_count,
								tooltip: 'max_message_count_tooltip',
								tooltipOptions: { max_message_count_min: constants.MAX_MESSAGE_COUNT_MIN, max_message_count_max: constants.MAX_MESSAGE_COUNT_MAX },
								type: 'slider',
								min: constants.MAX_MESSAGE_COUNT_MIN,
								max: constants.MAX_MESSAGE_COUNT_MAX,
							},
							{
								name: 'preferred_max_bytes',
								default: this.props.preferred_max_bytes,
								placeholder: 'preferred_max_bytes_placeholder',
								tooltip: 'preferred_max_bytes_tooltip',
								type: 'slider',
								min: bytes(constants.PREFERRED_MAX_BYTES_MIN),
								max: bytes(constants.PREFERRED_MAX_BYTES_MAX),
							},
							{
								name: 'timeout_ms',
								label: 'timeout',
								tooltip: 'timeout_tooltip',
								tooltipOptions: { timeout_min: constants.TIMEOUT_MIN, timeout_max: constants.TIMEOUT_MAX },
								default: this.props.timeout ? parse(this.props.timeout) : undefined,
								type: 'slider',
								min: parse(constants.TIMEOUT_MIN),
								max: parse(constants.TIMEOUT_MAX),
								unit: translate('millisecond'),
							},
						]}
					/>
					<div className="ibp-error-panel">
						<SidePanelWarning title="please_note"
							subtitle="block_params_warning"
						/>
					</div>
				</div>
				}
			</WizardStep>
		);
	}

	renderAdvancedEtc(translate) {
		if (this.props.ordererType !== 'etcdraft') {
			return;
		}
		return (
			<WizardStep type="WizardStep"
				title="raft_params"
			>
				<Form
					scope={SCOPE}
					id={SCOPE + '-raft-params'}
					onChange={data => {
						if (data.snapshot_interval_size_mb !== undefined) {
							// convert from MB to bytes
							this.props.updateState(SCOPE, {
								snapshot_interval_size: Math.floor(data.snapshot_interval_size_mb * 1024 * 1024),
							});
						}
						if (data.tick_interval_ms !== undefined) {
							this.props.updateState(SCOPE, {
								tick_interval: data.tick_interval_ms + 'ms',
							});
						}
					}}
					fields={[
						/* {
							name: 'tick_interval_ms',
							label: 'tick_interval',
							placeholder: 'tick_interval_placeholder',
							tooltip: 'tick_interval_tooltip',
							tooltipOptions: { timeout_min: constants.TICK_INTERVAL_MIN, timeout_max: constants.TICK_INTERVAL_MAX },
							default: parse(this.props.tick_interval),
							type: 'slider',
							min: parse(constants.TICK_INTERVAL_MIN),
							max: parse(constants.TICK_INTERVAL_MAX),
							unit: translate('millisecond'),
						},
						{
							name: 'election_tick',
							placeholder: 'election_tick_placeholder',
							tooltip: 'election_tick_tooltip',
							tooltipOptions: { max_message_count_min: constants.ELECTION_TICK_MIN, max_message_count_max: constants.ELECTION_TICK_MAX },
							default: this.props.election_tick,
							type: 'slider',
							min: constants.ELECTION_TICK_MIN,
							max: constants.ELECTION_TICK_MAX,
						},
						{
							name: 'heartbeat_tick',
							placeholder: 'heartbeat_tick_placeholder',
							tooltip: 'heartbeat_tick_tooltip',
							tooltipOptions: { heartbeat_tick_min: constants.HEARTBEAT_TICK_MIN, heartbeat_tick_max: constants.HEARTBEAT_TICK_MAX },
							default: this.props.heartbeat_tick,
							type: 'slider',
							min: constants.HEARTBEAT_TICK_MIN,
							max: constants.HEARTBEAT_TICK_MAX,
						},
						{
							name: 'max_inflight_blocks',
							placeholder: 'max_inflight_blocks_placeholder',
							tooltip: 'max_inflight_blocks_tooltip',
							tooltipOptions: { max_inflight_blocks_min: constants.MAX_INFLIGHT_BLOCKS_MIN, max_inflight_blocks_max: nstants.MAX_INFLIGHT_BLOCKS_MAX },
							default: this.props.max_inflight_blocks,
							type: 'slider',
							min: constants.MAX_INFLIGHT_BLOCKS_MIN,
							max: constants.MAX_INFLIGHT_BLOCKS_MAX,
						}, */
						{
							name: 'snapshot_interval_size_mb',
							label: 'snapshot_interval_size',
							placeholder: 'snapshot_interval_size_placeholder',
							tooltip: 'snapshot_interval_size_tooltip',
							tooltipOptions: { snapshot_interval_size_max: constants.SNAPSHOT_INTERVAL_SIZE_MAX },
							tooltipDirection: 'bottom',
							default: this.props.snapshot_interval_size / (1024 * 1024),
							type: 'slider',
							min: bytes(constants.SNAPSHOT_INTERVAL_SIZE_MIN) / (1024 * 1024),
							max: bytes(constants.SNAPSHOT_INTERVAL_SIZE_MAX) / (1024 * 1024),
							step: 0.01,
							unit: translate('megabyte'),
						},
					]}
				/>
			</WizardStep>
		);
	}

	renderCapabilities(translate) {
		const currentOrdererCapability =
			this.props.currentCapabilities && this.props.currentCapabilities.orderer
				? semver.coerce(this.props.currentCapabilities.orderer.replace(/_/g, '.')).version
				: 'select_capability';
		const currentChannelCapability =
			this.props.currentCapabilities && this.props.currentCapabilities.channel
				? semver.coerce(this.props.currentCapabilities.channel.replace(/_/g, '.')).version
				: 'select_capability';

		const currentOrdererCapabilityOpt = {
			id: this.props.currentCapabilities && this.props.currentCapabilities.orderer
				? this.props.currentCapabilities.orderer : 'select_capability',
			name: currentOrdererCapability,
			value: currentOrdererCapability
		};
		const currentChannelCapabilityOpt = {
			id: this.props.currentCapabilities && this.props.currentCapabilities.orderer
				? this.props.currentCapabilities.channel : 'select_capability',
			name: currentChannelCapability,
			value: currentChannelCapability
		};

		return (
			<WizardStep
				type="WizardStep"
				title="system_channel_capabilities"
				disableSubmit={this.props.channel_warning_20}
				onCancel={() => {
					this.props.updateState(SCOPE, { ordererModalType: 'settings' });
				}}
			>
				<p className="ibp-modal-desc">{translate('channel_capabilities_desc1')}</p>
				<p className="ibp-modal-desc">{translate('system_channel_capabilities_desc2')}</p>
				<TranslateLink text="channel_capabilities_desc3"
					className="ibp-modal-desc"
				/>
				<div>
					{this.props.capabilitiesEnabled && this.props.availableOrdererCapabilities.length > 0 && (
						<Form
							scope={SCOPE}
							id={SCOPE + '-orderer-capability'}
							fields={[
								{
									name: 'selectedOrdererCapability',
									label: 'orderer_capability',
									type: 'dropdown',
									tooltip: 'system_channel_orderer_capability_tooltip',
									options: this.props.availableOrdererCapabilities,
									default: currentOrdererCapabilityOpt,
								},
							]}
							onChange={data => {
								this.calculateCapabilityWarning(data);
							}}
						/>
					)}
					{this.props.capabilitiesEnabled && this.props.availableChannelCapabilities.length > 0 && (
						<Form
							scope={SCOPE}
							id={SCOPE + '-channel-capability'}
							fields={[
								{
									name: 'selectedChannelCapability',
									label: 'channel_capability',
									type: 'dropdown',
									tooltip: 'system_channel_channel_capability_tooltip',
									options: this.props.availableChannelCapabilities,
									default: currentChannelCapabilityOpt,
								},
							]}
							onChange={data => {
								this.calculateCapabilityWarning(data);
							}}
						/>
					)}
					<div className="ibp-error-panel">
						<SidePanelWarning title=""
							subtitle={translate('system_channel_capabilities_warning')}
						/>
					</div>
					{this.props.channel_warning_20 && (
						<>
							<ImportantBox text="channel_warning_20" />
						</>
					)}
				</div>
			</WizardStep>
		);
	}

	renderMaintenance(translate) {
		return (
			<WizardStep
				type="WizardStep"
				title="system_channel_maintenance"
				disableSubmit={this.props.advanced_loading}
				onCancel={() => {
					this.props.updateState(SCOPE, { ordererModalType: 'settings' });
				}}
			>
				<p className="ibp-modal-desc">{translate('channel_maintenance_desc1')}</p>
				<div>
					{!this.props.advanced_loading &&
						<div className="ibp-channel-section-desc-with-link">
							<label>{translate('maintenance_mode')}</label>
							<Toggle
								id="maintenance_toggle"
								toggled={this.props.maintenance_mode}
								onToggle={() => {
									this.props.updateState(SCOPE, {
										maintenance_mode: !this.props.maintenance_mode,
									});
								}}
								onChange={() => { }}
								aria-label={translate('maintenance_mode')}
								labelA={translate('no')}
								labelB={translate('yes')}
							/>
						</div>
					}
					{this.props.maintenance_mode && (
						<div className="ibp-error-panel">
							<SidePanelWarning title=""
								subtitle={translate('system_channel_maintenance_warning')}
							/>
						</div>
					)}
				</div>
				{this.props.advanced_loading && <Loading withOverlay={false} />}
			</WizardStep>
		);
	}

	renderUpgrade(translate) {
		let versionLabel = this.props.orderer.version ? this.props.orderer.version : translate('version_not_found');
		if (this.props.orderer && this.props.orderer.isUnsupported) {
			versionLabel = translate('unsupported');
		}
		return (
			<WizardStep type="WizardStep"
				disableSubmit={this.props.loading || _.size(this.props.down_nodes) > 0}
				title="patch_fabric_version"
			>
				<div className="ibp-remove-peer-desc">
					<p>
						{RenderParamHTML(translate, 'upgrade_node_desc', {
							name: (
								<CodeSnippet
									type="inline"
									ariaLabel={translate('copy_text', { copyText: this.props.orderer.display_name })}
									light={false}
									onClick={() => Clipboard.copyToClipboard(this.props.orderer.display_name)}
								>
									{this.props.orderer.display_name}
								</CodeSnippet>
							),
						})}
					</p>
				</div>

				<div className={this.props.loading ? 'ibp-hidden' : ''}>
					<div className="ibp-node-current-version">
						<div className="ibp-node-current-version-label">{translate('fabric_node_to_be_updated')}</div>
						<div className="ibp-node-name-version">
							<span className="ibp-node-name">{this.props.orderer.display_name}</span>
							<span className="ibp-node-version">{versionLabel}</span>
						</div>
					</div>
					<div className="ibp-box-connector" />
					<div className="ibp-node-new-version">
						<div>
							<div className="ibp-node-available-versions">
								<Form
									scope={SCOPE}
									id={SCOPE + '-new-version'}
									fields={[
										{
											name: 'new_version',
											type: 'dropdown',
											options: this.props.orderer.upgradable_versions,
										},
									]}
								/>
								<div>
									<a
										className="ibp-new-version-release-notes"
										href={translate('release_notes_docs', { DOC_PREFIX: this.props.docPrefix })}
										target="_blank"
										rel="noopener noreferrer"
									>
										{translate('view_release_notes')}
									</a>
								</div>
							</div>
						</div>
					</div>
					<div className="ibp-error-panel">
						<SidePanelWarning title="node_unavailable_during_upgrade_title"
							subtitle="node_unavailable_during_upgrade_desc"
						/>
					</div>
					{_.size(this.props.down_nodes) > 0 && (
						<>
							<ImportantBox text={translate(_.size(this.props.down_nodes) === 1 ? 'down_node' : 'down_nodes', { node: this.props.down_nodes.toString() })} />
						</>
					)}
				</div>
			</WizardStep>
		);
	}

	renderConfirmUpgrade(translate) {
		return (
			<WizardStep type="WizardStep"
				title="patch_fabric_version"
				disableSubmit={this.props.disableUpgrade}
			>
				<div className="ibp-remove-peer-desc">
					<p>
						{RenderParamHTML(translate, 'confirm_patch_desc', {
							name: (
								<CodeSnippet
									type="inline"
									ariaLabel={translate('copy_text', { copyText: this.props.orderer.display_name })}
									light={false}
									onClick={() => Clipboard.copyToClipboard(this.props.orderer.display_name)}
								>
									{this.props.orderer.display_name}
								</CodeSnippet>
							),
							version: (
								<CodeSnippet
									type="inline"
									ariaLabel={translate('copy_text', { copyText: this.props.new_version })}
									light={false}
									onClick={() => Clipboard.copyToClipboard(this.props.new_version)}
								>
									{this.props.new_version}
								</CodeSnippet>
							),
						})}
					</p>
				</div>
				<div className={this.props.loading ? 'ibp-hidden' : ''}>
					<div className="ibp-remove-peer-confirm">{translate('remove_orderer_confirm')}</div>
					<Form
						scope={SCOPE}
						id={SCOPE + '-remove'}
						fields={[
							{
								name: 'confirm_upgrade_node_name',
								tooltip: 'remove_orderer_name_tooltip',
								required: true,
							},
						]}
						onChange={data => {
							this.props.updateState(SCOPE, {
								disableUpgrade: data.confirm_upgrade_node_name !== this.props.orderer.display_name,
							});
						}}
					/>
				</div>
			</WizardStep>
		);
	}

	updateHSM(resolve, reject) {
		const orderer = {
			...this.props.orderer,
		};
		switch (this.props.ordererModalType) {
			case 'enable_hsm':
			case 'update_hsm':
				orderer.config_override = {};
				orderer.config_override.General = {
					BCCSP: {
						Default: 'PKCS11',
						PKCS11: {
							Label: this.props.hsm.label,
							Pin: this.props.hsm.pin,
						},
					},
				};
				if (this.props.hsm.pkcs11endpoint) {
					orderer.hsm = {
						pkcs11endpoint: this.props.hsm.pkcs11endpoint,
					};
				}
				break;
			case 'remove_hsm':
				orderer.config_override = {
					BCCSP: {
						// Not sure what to set here yet
					},
				};
				orderer.hsm = null;
				break;
			default:
				/* update_certs */
				break;
		}
		OrdererRestApi.updateConfigOverride(orderer)
			.then(orderer => {
				this.props.onComplete(orderer);
				resolve();
			})
			.catch(error => {
				Log.error(error);
				reject({
					title: 'error_update_orderer',
					details: error,
				});
			});
	}

	renderUpdateCertificates(translate) {
		const fields = this.props.third_party_ca
			? [
				{
					name: 'saas_ca_cert',
					required: true,
					type: 'certificate',
					tooltip: 'third_party_orderer_cert_tooltip',
					validate: Helper.isCertificate,
					label: 'certificate',
					placeholder: 'certificate_placeholder',
				},
				{
					name: 'saas_ca_private_key',
					required: true,
					tooltip: 'third_party_orderer_private_key_tooltip',
					type: 'private_key',
					validate: Helper.isPrivateKey,
					label: 'private_key',
					placeholder: 'private_key_placeholder',
				},
				{
					name: 'tls_ca_cert',
					required: true,
					type: 'certificate',
					tooltip: 'third_party_orderer_tls_cert_tooltip',
					validate: Helper.isCertificate,
					label: 'tls_certificate',
					placeholder: 'certificate_placeholder',
				},
				{
					name: 'tls_ca_private_key',
					required: true,
					tooltip: 'third_party_orderer_tls_private_key_tooltip',
					type: 'private_key',
					validate: Helper.isPrivateKey,
					label: 'tls_private_key',
					placeholder: 'private_key_placeholder',
					tooltipDirection: 'bottom',
				},
			]
			: [
				{
					name: 'saas_ca',
					type: 'dropdown',
					tooltip: 'saas_orderer_ca_tooltip',
					options: this.props.cas,
					required: true,
				},
				{
					name: 'enroll_id',
					tooltip: 'saas_orderer_enroll_id_tooltip',
					type: this.props.users && this.props.users.length ? 'dropdown' : undefined,
					options: this.props.users && this.props.users.length ? this.props.users.map(user => user.id) : undefined,
					required: true,
					specialRules: Helper.SPECIAL_RULES_ENROLL_ID,
					label: 'orderer_enroll_id',
					placeholder: 'peer_enroll_id_placeholder',
					loading: this.props.loading ? true : false,
				},
				{
					name: 'enroll_secret',
					type: 'password',
					tooltip: 'saas_orderer_enroll_secret_tooltip',
					required: true,
					specialRules: Helper.SPECIAL_RULES_ENROLL_SECRET,
					label: 'orderer_enroll_secret',
					placeholder: 'peer_enroll_secret_placeholder',
				},
			];
		const show_hsm = this.props.ordererModalType === 'enable_hsm' || this.props.ordererModalType === 'update_hsm';
		let valid = this.props.third_party_ca ? this.props.third_party_ca_valid : this.props.saas_ca_valid;
		if (show_hsm) {
			valid = this.props.saas_ca_valid && this.props.hsm;
		}
		return (
			<WizardStep
				type="WizardStep"
				title={this.props.ordererModalType}
				disableSubmit={!valid}
				onCancel={
					this.props.action_in_progress
						? () => {
							this.props.updateState(SCOPE, {
								action_in_progress: null,
								ordererModalType: this.props.action_in_progress,
							});
						}
						: null
				}
			>
				{show_hsm ? (
					<div>
						<p>{translate('hsm_orderer_desc')}</p>
						<HSMConfig scope={SCOPE} />
					</div>
				) : (
					<div className="ibp-form">
						<label className="ibp-form-label">{translate('third_party_ca')}</label>
						<div className="ibp-form-input">
							<ToggleSmall
								id="toggle-third-party-ca"
								toggled={this.props.third_party_ca}
								onToggle={() => {
									this.props.updateState(SCOPE, {
										third_party_ca: !this.props.third_party_ca,
									});
								}}
								onChange={() => { }}
								aria-label={translate('third_party_ca')}
								labelA={translate('no')}
								labelB={translate('yes')}
							/>
						</div>
						<hr />
					</div>
				)}
				<Form
					scope={SCOPE}
					id={SCOPE + '-update-certs'}
					fields={fields}
					onChange={(data, valid, field, formProps) => {
						const update = {};
						if (this.props.third_party_ca) {
							update.third_party_ca_valid = valid;
							let filenames = { ...this.props.filenames };
							fields.forEach(field => {
								filenames[field.name] = _.get(formProps, field.name + '.file.name');
							});
							update.filenames = filenames;
						} else {
							update.saas_ca_valid = valid;
						}
						this.props.updateState(SCOPE, update);
					}}
				/>
			</WizardStep>
		);
	}

	renderUpdateSummary(translate) {
		const show_hsm = this.props.ordererModalType === 'enable_hsm' || this.props.ordererModalType === 'update_hsm';
		return (
			<WizardStep type="WizardStep"
				title="summary"
			>
				{show_hsm && Helper.renderHSMSummary(translate, this.props.hsm)}
				{this.props.third_party_ca ? (
					<div>
						{Helper.renderFieldSummary(translate, this.props, 'certificate', 'saas_ca_cert')}
						{Helper.renderFieldSummary(translate, this.props, 'private_key', 'saas_ca_private_key')}
					</div>
				) : (
					<div>
						{Helper.renderFieldSummary(translate, this.props, 'saas_ca')}
						{Helper.renderFieldSummary(translate, this.props, 'peer_enroll_id', 'enroll_id')}
						{Helper.renderFieldSummary(translate, this.props, 'peer_enroll_secret', 'enroll_secret', true)}
					</div>
				)}
			</WizardStep>
		);
	}

	renderManageHSM(translate) {
		return (
			<WizardStep type="WizardStep"
				title="manage_hsm"
			>
				<div className="ibp-orderer-hsm-desc">
					<p>{translate('hsm_orderer_desc')}</p>
				</div>
				<div>
					<button
						id="update_hsm_action"
						className="ibp-orderer-action bx--btn bx--btn--tertiary bx--btn--sm"
						onClick={() => {
							this.showAction('update_hsm');
						}}
					>
						{translate('update_hsm')}
					</button>
					<button
						id="remove_hsm_action"
						className="ibp-orderer-action bx--btn bx--btn--sm bx--btn--danger"
						onClick={() => {
							this.showAction('remove_hsm');
						}}
					>
						{translate('remove_hsm')}
					</button>
				</div>
			</WizardStep>
		);
	}

	async onSubmit() {
		const prefix = `${this.props.ordererModalType} onSubmit:`;
		try {
			Log.info(`${prefix} submitting`);
			switch (this.props.ordererModalType) {
				case 'delete':
				case 'force_delete':
					await this.removeOrderer();
					break;
				case 'upgrade':
					await new Promise((resolve, reject) => this.upgradeNode(resolve, reject));
					break;
				case 'associate':
					await this.associateIdentityWithOrderer();
					break;
				case 'enable_hsm':
				case 'update_hsm':
				case 'remove_hsm':
				case 'update_certs':
					await new Promise((resolve, reject) => this.updateHSM(resolve, reject));
					break;
				case 'advanced':
					await new Promise((resolve, reject) => this.updateBlockParams(resolve, reject));
					break;
				case 'capabilities':
					await new Promise((resolve, reject) => this.updateCapabilities(resolve, reject));
					break;
				case 'channel_maintenance':
					await new Promise((resolve, reject) => this.updateChannelMaintenance(resolve, reject));
					break;
				case 'config_override':
					await new Promise((resolve, reject) => this.updateConfigOverride(resolve, reject));
					break;
				case 'restart':
					await NodeRestApi.restartNode(this.props.orderer);
					this.props.onComplete();
					break;
				case 'manage_certs':
					await this.manageCertificates();
					this.props.onComplete();
					break;
				case 'log_settings':
					await this.updateLogSettings();
					this.props.onComplete();
					break;
				default:
					await new Promise((resolve, reject) => this.updateOrderer(resolve, reject));
					break;
			}
		} catch (error) {
			Log.error(`${prefix} failed: ${error}`);
			// Errors thrown will be caught in the Wizard's onSubmit function, where they will be stored.  Errors on the Wizard are rendered as SidePanelErrors
			throw error;
		}
	}

	async manageCertificates() {
		if (_.get(this.props, 'orderer.crypto.enrollment')) {
			const manage_ecert = _.get(this.props, 'manage_ecert.id');
			const manage_tls_cert = _.get(this.props, 'manage_tls_cert.id');
			const actions = {
				restart: true,
			};
			if (manage_ecert === 'enroll') {
				_.set(actions, 'enroll.ecert', true);
			}
			if (manage_ecert === 'reenroll') {
				_.set(actions, 'reenroll.ecert', true);
			}
			if (manage_tls_cert === 'enroll') {
				_.set(actions, 'enroll.tls_cert', true);
			}
			if (manage_tls_cert === 'reenroll') {
				_.set(actions, 'reenroll.tls_cert', true);
			}
			return NodeRestApi.performActions(this.props.orderer, actions);
		}
		if (_.get(this.props, 'orderer.crypto.msp')) {
			const ecert = _.get(this.props, 'manage_ecert');
			const ekey = _.get(this.props, 'manage_ekey');
			const tls_cert = _.get(this.props, 'manage_tls_cert');
			const tls_key = _.get(this.props, 'manage_tls_key');
			return NodeRestApi.updateThirdPartyCertificates(this.props.orderer, ecert, ekey, tls_cert, tls_key);
		}
	}

	updateConfigOverride = (resolve, reject) => {
		const node = {
			...this.props.orderer,
			config_override: this.props.editedConfigOverride ? this.props.editedConfigOverride : this.props.config_override,
		};
		OrdererRestApi.updateConfigOverride(node)
			.then(node => {
				this.props.onComplete(node);
				resolve();
			})
			.catch(error => {
				Log.error(error);
				reject({
					title: 'error_update_orderer',
					details: error,
				});
			});
	};

	getSubmitButtonLabel(translate) {
		let label = 'update_orderer';
		if (this.props.orderer.cluster_id && !this.props.orderer.raft) {
			label = label + '_node';
		}
		switch (this.props.ordererModalType) {
			case 'delete':
				label = this.props.orderer.location === 'ibm_saas' ? 'delete_orderer' : 'remove_orderer';
				if (this.props.orderer.cluster_id && !this.props.orderer.raft) {
					label = label + '_node';
				}
				break;
			case 'force_delete':
				label = this.props.orderer.location === 'ibm_saas' ? 'force_delete' : 'remove_orderer';
				if (this.props.orderer.cluster_id && !this.props.orderer.raft) {
					label = label + '_node';
				}
				break;
			case 'upgrade':
				label = 'patch_fabric_version';
				break;
			case 'associate':
				label = 'associate_identity';
				break;
			case 'capabilities':
				label = 'update_capabilities';
				break;
			case 'advanced':
				label = 'update_config';
				break;
			case 'enable_hsm':
			case 'update_hsm':
			case 'remove_hsm':
			case 'update_certs':
			case 'manage_hsm':
			case 'restart':
				label = this.props.ordererModalType;
				break;
			case 'manage_certs':
				label = 'update_certs';
				break;
			case 'log_settings':
				label = 'update';
				break;
			default:
				break;
		}
		return translate(label);
	}

	getSubmitButtonId() {
		let id = 'update_peer';
		switch (this.props.ordererModalType) {
			case 'delete':
			case 'force_delete':
				id = 'confirm_remove';
				break;
			case 'associate':
				id = 'associate_identity';
				break;
			case 'upgrade':
				id = 'patch';
				break;
			case 'capabilities':
				id = 'update_capabilities';
				break;
			case 'advanced':
				id = 'update_config';
				break;
			case 'enable_hsm':
			case 'update_hsm':
			case 'remove_hsm':
			case 'update_certs':
			case 'manage_hsm':
			case 'restart':
			case 'manage_certs':
				id = this.props.ordererModalType;
				break;
			case 'log_settings':
				id = 'update_log_settings';
				break;
			default:
				break;
		}
		return id;
	}

	renderRestart(translate) {
		return (
			<WizardStep type="WizardStep"
				title="restart"
				onCancel={this.hideAction}
			>
				<div>
					<p>{translate('restart_orderer_desc')}</p>
				</div>
			</WizardStep>
		);
	}

	disableManageCertificatesSubmit() {
		if (_.get(this.props, 'orderer.crypto.enrollment')) {
			const manage_ecert = _.get(this.props, 'manage_ecert.id') || 'none';
			const manage_tls_cert = _.get(this.props, 'manage_tls_cert.id') || 'none';
			if (manage_ecert !== 'none' || manage_tls_cert !== 'none') {
				return false;
			}
		}
		if (_.get(this.props, 'orderer.crypto.msp')) {
			const manage_ecert = _.get(this.props, 'manage_ecert');
			const manage_ekey = _.get(this.props, 'manage_ekey');
			const manage_tls_cert = _.get(this.props, 'manage_tls_cert');
			const manage_tls_key = _.get(this.props, 'manage_tls_key');
			if (manage_ecert && manage_ekey && manage_tls_cert && manage_tls_key) {
				return false;
			}
			if (manage_ecert && manage_ekey && !manage_tls_cert && !manage_tls_key) {
				return false;
			}
			if (!manage_ecert && !manage_ekey && manage_tls_cert && manage_tls_key) {
				return false;
			}
		}
		return true;
	}

	renderManageCertificates(translate) {
		let show_box = false;
		const manage_tls_cert = this.props.manage_tls_cert;
		const fields = [];
		let show_version_box = false;
		const opts = [];
		opts.push({
			id: 'none',
			display_name: translate('do_not_update'),
		});
		const version = _.get(this.props, 'orderer.version', '1.0.0');
		// const allow_enroll = (semver.gt(version, '1.4.9') && semver.lt(version, '2.0.0')) || semver.gt(version, '2.2.1');
		// if (this.props.singleNodeRaft !== true || allow_enroll) {
		// 	opts.push({
		// 		id: 'enroll',
		// 		display_name: translate('enroll_cert'),
		// 	});
		// }
		const allow_reenroll =
			(semver.gte(semver.coerce(version), semver.coerce('1.4.9')) && semver.lt(semver.coerce(version), semver.coerce('2.0.0'))) ||
			semver.gte(semver.coerce(version), semver.coerce('2.2.1'));
		if (this.props.singleNodeRaft !== true || allow_reenroll) {
			opts.push({
				id: 'reenroll',
				display_name: translate('reenroll_cert'),
			});
		}
		if (_.get(this.props, 'orderer.crypto.enrollment')) {
			if (manage_tls_cert && (manage_tls_cert.id === 'enroll' || manage_tls_cert.id === 'reenroll')) {
				show_box = true;
			}
			fields.push({
				name: 'manage_ecert',
				label: 'ecert',
				type: 'dropdown',
				tooltip: 'tooltip_manage_ecert',
				options: [
					{
						id: 'none',
						display_name: translate('do_not_update'),
					},
					{
						id: 'enroll',
						display_name: translate('enroll_cert'),
					},
					{
						id: 'reenroll',
						display_name: translate('reenroll_cert'),
					},
				],
				required: true,
				default: translate('do_not_update'),
			});
			if (opts.length > 1) {
				fields.push({
					name: 'manage_tls_cert',
					label: 'tls_certificate',
					type: 'dropdown',
					tooltip: 'tooltip_manage_tls_cert',
					options: opts,
					required: true,
					default: translate('do_not_update'),
				});
			} else {
				show_version_box = true;
			}
		}
		if (_.get(this.props, 'orderer.crypto.msp')) {
			if (manage_tls_cert) {
				show_box = true;
			}
			fields.push({
				name: 'manage_ecert',
				type: 'certificate',
				validate: Helper.isCertificate,
				label: 'ecert',
				placeholder: 'certificate_placeholder',
			});
			fields.push({
				name: 'manage_ekey',
				type: 'private_key',
				validate: Helper.isPrivateKey,
				label: 'ekey',
				placeholder: 'private_key_placeholder',
			});
			if (this.props.singleNodeRaft !== true || allow_reenroll) {
				fields.push({
					name: 'manage_tls_cert',
					type: 'certificate',
					validate: Helper.isCertificate,
					label: 'tls_certificate',
					placeholder: 'certificate_placeholder',
				});
				fields.push({
					name: 'manage_tls_key',
					type: 'private_key',
					validate: Helper.isPrivateKey,
					label: 'tls_private_key',
					placeholder: 'private_key_placeholder',
				});
			}
		}
		return (
			<WizardStep type="WizardStep"
				title="update_certs"
				onCancel={this.hideAction}
				disableSubmit={this.disableManageCertificatesSubmit()}
			>
				{!!_.get(this.props, 'orderer.crypto.enrollment') && (
					<div className="ibp-manage-orderer-certs">
						<p>{translate('manage_orderer_certs_desc')}</p>
					</div>
				)}
				<Form scope={SCOPE}
					id="manage_certs"
					fields={fields}
				/>
				{show_box && <ImportantBox text="orderer_update_tls_cert_important_box"
					link="orderer_update_tls_cert_important_link"
				/>}
				{show_version_box && <ImportantBox text="orderer_update_version_important_box" />}
			</WizardStep>
		);
	}

	async getLogSettings() {
		this.props.updateState(SCOPE, {
			log_loading: true,
		});
		let log_level_identity = null;
		let log_spec = null;
		await this.loadIdentities();
		for (let i = 0; i < this.identities.length && !log_level_identity; i++) {
			const match = await StitchApi.isIdentityFromRootCert({
				certificate_b64pem: this.identities[i].cert,
				root_certs_b64pems: _.get(this.props.orderer, 'msp.tlsca.root_certs'),
			});
			if (match) {
				log_level_identity = this.identities[i];
			}
		}
		if (log_level_identity) {
			try {
				log_spec = await NodeRestApi.getLogSettings(this.props.orderer, log_level_identity);
			} catch (error) {
				Log.error('Unable to get log settings:', error);
			}
		}
		this.props.updateState(SCOPE, {
			log_loading: false,
			log_level_identity,
			log_spec,
			new_log_spec: log_spec,
		});
	}

	async updateLogSettings() {
		return NodeRestApi.setLogSettings(this.props.orderer, this.props.log_level_identity, this.props.new_log_spec);
	}

	renderLogSettings(translate) {
		return (
			<WizardStep type="WizardStep"
				title="log_settings"
				onCancel={this.hideAction}
				disableSubmit={this.props.log_loading || !this.props.new_log_spec}
			>
				{this.props.platform !== 'openshift' && <TranslateLink className="ibp-peer-log-settings"
					text="log_settings_desc"
				/>}
				{this.props.platform === 'openshift' && <TranslateLink className="ibp-peer-log-settings"
					text="log_settings_desc_openshift"
				/>}
				{this.props.log_loading ? (
					<SkeletonText />
				) : !this.props.log_level_identity ? (
					<SidePanelWarning title="tls_identity_not_found"
						subtitle="orderer_tls_identity_not_found"
					/>
				) : !this.props.log_spec ? (
					<SidePanelWarning title="error_get_log_settings"
						subtitle="orderer_error_get_log_settings"
						kind="error"
					/>
				) : (
					<LogSettings
						log_spec={this.props.log_spec}
						onChange={new_log_spec => {
							this.props.updateState(SCOPE, { new_log_spec });
						}}
					/>
				)}
			</WizardStep>
		);
	}

	renderPages(translate) {
		switch (this.props.ordererModalType) {
			case 'delete':
				return this.renderRemove(translate);
			case 'force_delete':
				return this.renderForceDelete(translate);
			case 'upgrade':
				return [this.renderUpgrade(translate), this.renderConfirmUpgrade(translate)];
			case 'associate':
				return this.renderAssociate(translate);
			case 'enable_hsm':
			case 'update_hsm':
			case 'remove_hsm':
			case 'update_certs':
				return [this.renderUpdateCertificates(translate), this.renderUpdateSummary(translate)];
			case 'manage_hsm':
				return this.renderManageHSM(translate);
			case 'advanced':
				return [this.renderAdvanced(translate), this.renderAdvancedEtc(translate)];
			case 'capabilities':
				return this.renderCapabilities(translate);
			case 'channel_maintenance':
				return this.renderMaintenance(translate);
			case 'config_override':
				return this.renderConfigOverride(translate);
			case 'restart':
				return this.renderRestart(translate);
			case 'manage_certs':
				return this.renderManageCertificates(translate);
			case 'log_settings':
				return this.renderLogSettings(translate);
			default:
				return this.renderDetails(translate);
		}
	}

	render() {
		const translate = this.props.t;
		return (
			<Wizard
				onClose={this.props.onClose}
				onSubmit={this.props.ordererModalType === 'manage_hsm' ? undefined : () => this.onSubmit()}
				submitButtonLabel={this.getSubmitButtonLabel(translate)}
				submitButtonId={this.getSubmitButtonId()}
				error={this.props.error}
				loading={this.props.loading || this.props.channel_loading || this.props.users_loading}
			>
				{this.renderPages(translate)}
			</Wizard>
		);
	}
}

const dataProps = {
	display_name: PropTypes.string,
	grpcwp_url: PropTypes.string,
	msp_id: PropTypes.string,
	tls_ca_root_certs: PropTypes.array,
	error: PropTypes.string,
	loading: PropTypes.bool,
	maintenance_mode: PropTypes.bool,
	channel_state: PropTypes.string,
	channel_loading: PropTypes.bool,
	users_loading: PropTypes.bool,
	submitting: PropTypes.bool,
	channelsWithNode: PropTypes.array,
	safeChannelsWithNode: PropTypes.array,
	disableRemove: PropTypes.bool,
	confirm_orderer_name: PropTypes.string,
	associate: PropTypes.bool,
	associatedIdentities: PropTypes.object,
	applicableIdentities: PropTypes.object,
	absolute_max_bytes: PropTypes.number,
	max_message_count: PropTypes.number,
	preferred_max_bytes: PropTypes.number,
	timeout: PropTypes.string,
	ordererModalType: PropTypes.string,
	disableUpgrade: PropTypes.bool,
	confirm_upgrade: PropTypes.bool,
	confirm_upgrade_node_name: PropTypes.string,
	new_version: PropTypes.string,
	availableChannelCapabilities: PropTypes.array,
	availableOrdererCapabilities: PropTypes.array,
	selectedChannelCapability: PropTypes.object,
	selectedOrdererCapability: PropTypes.object,
	tick_interval: PropTypes.string,
	election_tick: PropTypes.number,
	heartbeat_tick: PropTypes.number,
	max_inflight_blocks: PropTypes.number,
	snapshot_interval_size: PropTypes.number,
	ordererType: PropTypes.string,
	action_in_progress: PropTypes.string,
	advanced_loading: PropTypes.bool,
	third_party_ca: PropTypes.bool,
	channel_warning_20: PropTypes.bool,
	down_nodes: PropTypes.array,
	hsm: PropTypes.object,
	saas_ca: PropTypes.object,
	enroll_id: PropTypes.string,
	enroll_secret: PropTypes.string,
	cas: PropTypes.array,
	users: PropTypes.array,
	saas_ca_valid: PropTypes.bool,
	third_party_ca_valid: PropTypes.bool,
	saas_ca_private_key: PropTypes.string,
	saas_ca_cert: PropTypes.string,
	filenames: PropTypes.object,
	update: PropTypes.bool,
	config_override: PropTypes.object,
	editedConfigOverride: PropTypes.object,
	orderer: PropTypes.object,
	current_config: PropTypes.object,
	manage_ecert: PropTypes.any,
	manage_tls_cert: PropTypes.any,
	manage_ekey: PropTypes.string,
	manage_tls_key: PropTypes.string,
	log_loading: PropTypes.bool,
	log_level_identity: PropTypes.object,
	log_spec: PropTypes.string,
	new_log_spec: PropTypes.string,
	ignore_del_warning: PropTypes.bool,
	orderer_details: PropTypes.object,
};

OrdererModal.propTypes = {
	...dataProps,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
	clusterId: PropTypes.string,
	singleNodeRaft: PropTypes.bool,
	systemChannel: PropTypes.bool,
	updateState: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default withRouter(
	connect(
		state => {
			let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
			newProps['crn_string'] = state['settings'] ? state['settings']['crn_string'] : null;
			newProps['CRN'] = state['settings'] ? state['settings']['CRN'] : null;
			newProps['userInfo'] = state['userInfo'] ? state['userInfo'] : null;
			newProps['docPrefix'] = state['settings'] ? state['settings']['docPrefix'] : null;
			newProps['platform'] = state['settings'] ? state['settings']['platform'] : null;
			newProps['capabilitiesEnabled'] =
				state['settings'] && state['settings']['feature_flags'] ? state['settings']['feature_flags']['capabilities_enabled'] : null;
			newProps['capabilities'] = state['settings'] && state['settings']['capabilities'] ? state['settings']['capabilities'] : [];
			newProps['channelList'] = state['ordererDetails']['channelList'];
			newProps['configtxlator_url'] = state['settings']['configtxlator_url'];
			newProps['feature_flags'] = _.get(state, 'settings.feature_flags');
			return newProps;
		},
		{
			updateState,
		}
	)(withTranslation()(OrdererModal))
);
