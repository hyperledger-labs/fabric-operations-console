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
import _ from 'lodash';
import PropTypes, { array } from 'prop-types';
import React from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { updateState, showSuccess } from '../../redux/commonActions';
import { OrdererRestApi } from '../../rest/OrdererRestApi';
import Helper from '../../utils/helper';
import Form from '../Form/Form';
import Logger from '../Log/Logger';
import Wizard from '../Wizard/Wizard';
import WizardStep from '../WizardStep/WizardStep';
import IdentityApi from '../../rest/IdentityApi';
import { ChannelParticipationApi } from '../../rest/ChannelParticipationApi';
import StitchApi from '../../rest/StitchApi';
import { Loading } from 'carbon-components-react';
import { InlineNotification } from 'carbon-components-react';
import { Toggle } from 'carbon-components-react';
import * as constants from '../../utils/constants';
import { WarningFilled16, CheckmarkFilled16, ProgressBarRound16, CircleDash16 } from '@carbon/icons-react/es';
import { NodeRestApi } from '../../rest/NodeRestApi';
import async from 'async';
import { promisify } from 'util';
import ConfigBlockApi from '../../rest/ConfigBlockApi';
import { EventsRestApi } from '../../rest/EventsRestApi';
import SidePanelWarning from '../SidePanelWarning/SidePanelWarning';

const SCOPE = 'joinOSNChannelModal';
const Log = new Logger(SCOPE);
const url = require('url');

class JoinOSNChannelModal extends React.Component {
	async componentDidMount() {

		// [Flows 1 & 4] - joining via the pending channel tile OR came from the create-channel wizard
		if (this.props.selectedConfigBlockDoc) {
			this.props.updateState(SCOPE, {
				orderers: null,									// setting null here skips the first step
				configtxlator_url: this.props.configtxlator_url,
				block_error: '',
				show_channels_nav_link: false,
			});
			await this.setupForJoinViaPendingTile();
		}

		// [Flow 2] - joining via the join-channel blue button, the channel is not yet selected, show step to select a node and channel name
		else if (!this.props.joinChannelDetails) {
			// if we need to get orderers....
			const oss = await OrdererRestApi.getOrderers(true);

			// build individual orderer node options
			const orderers = [];
			for (let i in oss) {
				for (let x in oss[i].raft) {
					const temp = JSON.parse(JSON.stringify(oss[i].raft[x]));
					temp.display_name = `[${oss[i].raft[x].cluster_name}] ${oss[i].raft[x].display_name}`;
					orderers.push(temp);
				}
			};

			this.props.updateState(SCOPE, {
				orderers,
				channels: [],
				disableSubmit: true,
				submitting: false,								// submitting controls the wizard spinner after submit is clicked
				configtxlator_url: this.props.configtxlator_url,
				block_error: '',
				show_channels_nav_link: false,
			});
		}

		// [Flow 3] - joining via the channel tile, skip to step to select joining osns
		else {
			this.props.updateState(SCOPE, {
				orderers: null,									// setting null here skips the first step
				configtxlator_url: this.props.configtxlator_url,
				block_error: '',
				show_channels_nav_link: false,
			});
			await this.setupForJoinViaChannelTile(this.props.joinChannelDetails.name);
		}
	}

	componentWillUnmount() {
		this.props.updateState(SCOPE, {
			config_block_b64: null,
			selected_osn: null,
			joinChannelDetails: null,
			joinOsnMap: null,
			missingOSOrgIdentities: []
		});
	}

	// get all the channels for selected orderer node
	loadChannels = async (orderer) => {
		if (!orderer || !orderer.osnadmin_url) { return; }
		let orderer_tls_identity = await IdentityApi.getTLSIdentity(orderer);

		if (orderer_tls_identity) {
			try {
				let all_identities = await IdentityApi.getIdentities();
				const channels = await ChannelParticipationApi.getChannels(all_identities, orderer);
				return channels;
			} catch (e) {
				Log.error(e);
				const code = (e && !isNaN(e.status_code)) ? '(' + e.status_code + ') ' : '';
				const details = (e && typeof e.stitch_msg === 'string') ? (code + e.stitch_msg) : '';
				this.props.updateState(SCOPE, {
					block_error_title: '[Error] Could not load channels. Resolve error to continue:',
					block_error: details ? details : e.toString(),
				});
				return [];
			}
		}
	};

	// get config block for the selected channel via the selected orderer
	getChannelConfigBlock = async (channel) => {
		let osn_to_use = this.props.selected_osn;							// default to the one selected in the drop down
		if (this.props.joinChannelDetails && this.props.joinChannelDetails.nodes) {
			for (let i in this.props.joinChannelDetails.nodes) {
				if (this.props.joinChannelDetails.nodes[i]._channel_resp &&
					this.props.joinChannelDetails.nodes[i]._channel_resp.consensusRelation === 'consenter') {
					osn_to_use = this.props.joinChannelDetails.nodes[i];	// use the first node that knows this channel if available
					break;
				}
			}
		}
		let identity = await IdentityApi.getAssociatedOrdererIdentities(osn_to_use);

		const opts = {
			msp_id: osn_to_use.msp_id,
			client_cert_b64pem: identity[0].cert,
			client_prv_key_b64pem: identity[0].private_key,
			orderer_host: osn_to_use.url2use,
			channel_id: channel,
			include_bin: true,
		};
		const resp = await StitchApi.getChannelConfigWithRetry(opts, [osn_to_use]);
		const config = window.stitch.uint8ArrayToBase64(resp.grpc_message);
		return config;
	};

	// parse given config block
	parseConfigBlock = async (config_block_b64) => {
		let joinOsnMap = {};

		// config block was passed in - load it
		if (config_block_b64) {
			const allOrderers = await this.getAllOrderers();
			const all_identities = await IdentityApi.getIdentities();

			const json_block = await this.parseProto(config_block_b64);
			const channel_id = _.get(json_block, 'data.data[0].payload.header.channel_header.channel_id');
			const channel_map = await ChannelParticipationApi.map1Channel(all_identities, allOrderers, channel_id);

			const consenters = _.get(json_block, 'data.data[0].payload.data.config.channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters');
			joinOsnMap = await this.organize_osns(consenters, allOrderers, json_block, channel_map);

			const possibleNodes = this.countPossibleNodes(joinOsnMap);
			const selectedNodes = this.countSelectedOrderers(joinOsnMap);
			const missingONTLSIdentities = [];
			const missingOSOrgIdentities = [];
			if (selectedNodes) {
				// Verify TLS Cert is missing from selected cluster
				for (const cluster in joinOsnMap) {
					if (joinOsnMap[cluster].selected && !joinOsnMap[cluster].tls_identity) {
						missingONTLSIdentities.push(joinOsnMap[cluster].cluster_name);
					}
				}
			}
			this.props.updateState(SCOPE, {
				channel_id: channel_id,
				joinOsnMap: joinOsnMap,
				count: selectedNodes,
				possible_nodes: possibleNodes,
				follower_count: this.countFollowers(joinOsnMap),		// this isn't used anymore... remove?
				b_genesis_block: window.stitch.base64ToUint8Array(config_block_b64),
				json_genesis_block: json_block,
				select_all_toggle: possibleNodes === selectedNodes,
				block_error: '',
				block_error_title: '',
				submitting: false,
				loading: false,
				missingONTLSIdentities,
				missingOSOrgIdentities
			});

			return json_block;
		}
	}

	// get all known orderers and filter them to down to ones that *could* be a consenter (we just need the bare minimal fields, tls cert, hostname, & port)
	async getAllOrderers() {
		let orderers = null;
		let possible_consenters = [];

		try {
			const resp = await NodeRestApi.getComponentsByTag('fabric-orderer');
			orderers = resp ? resp.components : null;
		} catch (e) {
			Log.error(e);
		}

		for (let i in orderers) {
			const node = orderers[i];
			let urlObj = (typeof node.backend_addr === 'string') ? url.parse(node.backend_addr.toLowerCase()) : null;
			const tls_cert = _.get(node, 'msp.component.tls_cert');

			// consenters must have a tls certificate, host/port data and no system channel
			if (urlObj && urlObj.hostname && urlObj.port && tls_cert && node.systemless) {
				possible_consenters.push({				// leading underscores denote field is not used by fabric
					name: node.display_name,
					msp_id: node.msp_id,
					_consenter: false,					// defaults false, flips to true once selected
					_cluster_id: node.cluster_id,		// pass data for the OSNJoin panel
					_cluster_name: node.cluster_name,	// pass data for the OSNJoin panel
					_id: node.id,
					id: node.id,
					host: urlObj.hostname,
					port: urlObj.port,
					client_tls_cert: tls_cert,			// dsh todo is this used?
					server_tls_cert: tls_cert,			// dsh todo is this used?
					osnadmin_url: node.osnadmin_url,	// needed for ChannelParticipationApis
					msp: node.msp,						// needed for ChannelParticipationApis
				});
			}
		}
		return possible_consenters;
	}

	// convert config block binary to json or show error
	async parseProto(config_block) {
		const c_opts = {
			cfxl_host: this.props.configtxlator_url,
			data: config_block,
			message_type: 'Block'
		};
		try {
			return await StitchApi.pbToJson(c_opts);
		} catch (e) {
			Log.error(e);
			const code = (e && !isNaN(e.status_code)) ? '(' + e.status_code + ') ' : '';
			const details = (e && typeof e.stitch_msg === 'string') ? (code + e.stitch_msg) : '';
			this.props.updateState(SCOPE, {
				block_error_title: '[Error] Could not parse config-block. Resolve error to continue:',
				block_error: details ? details : e.toString(),
				joinOsnMap: {},
				count: 0,
				follower_count: 0,
			});
			return null;
		}
	}

	// download genesis block as JSON - for debug and what not
	setupDownloadGenesisLink = (block, channel_name) => {
		let link = document.getElementById('ibp-download-genesis-link2');
		if (link) {
			const d = new Date();
			const dateStr = d.toLocaleDateString().replace(/[/_]/g, '-') + '-' + d.toLocaleTimeString().replace(/[:\sAPM]/g, '');
			let name = 'FOC.' + channel_name + '_genesis_' + dateStr + '.json';
			const blob = new Blob([JSON.stringify(block, null, '\t')], { type: 'text/plain' });
			let url = URL.createObjectURL(blob);
			link.setAttribute('href', url);
			link.setAttribute('download', name);
		}
	}

	// count the selected orderers
	countSelectedOrderers(useMap) {
		let updateCount = 0;
		for (let id in useMap) {
			for (let i in useMap[id].nodes) {
				// don't count nodes that are already joined
				if (useMap[id].nodes[i]._selected && useMap[id].nodes[i]._status !== constants.OSN_JOIN_SUCCESS) {
					updateCount++;
				}
			}
		}
		return updateCount;
	}

	// count the selected orderers
	countPossibleNodes(useMap) {
		let updateCount = 0;
		for (let id in useMap) {
			if (useMap[id].selected === true) {
				for (let i in useMap[id].nodes) {
					// don't count nodes that are already joined
					if (useMap[id].nodes[i]._status !== constants.OSN_JOIN_SUCCESS) {
						updateCount++;
					}
				}
			}
		}
		return updateCount;
	}

	// count the orderers that are not consenters
	// (they do not need to be selected nodes, but they do need to be selected clusters)
	countFollowers(useMap) {
		let updateCount = 0;
		for (let id in useMap) {
			if (useMap[id].selected === true) {
				for (let i in useMap[id].nodes) {
					if (!useMap[id].nodes[i]._consenter) {
						updateCount++;
					}
				}
			}
		}
		return updateCount;
	}

	// build console like MSP objects from config block
	buildSimpleMspFromConfigBlock(block_json) {
		const ret = {};
		const app_grp = _.get(block_json, 'data.data[0].payload.data.config.channel_group.groups.Application.groups');
		for (let msp_id in app_grp) {
			if (!ret[msp_id]) {
				ret[msp_id] = {
					root_certs: _.get(app_grp[msp_id], 'values.MSP.value.config.root_certs'),
					intermediate_certs: _.get(app_grp[msp_id], 'values.MSP.value.config.intermediate_certs'),
					tls_root_certs: _.get(app_grp[msp_id], 'values.MSP.value.config.tls_root_certs'),
				};
			}
		}
		const ord_grp = _.get(block_json, 'data.data[0].payload.data.config.channel_group.groups.Orderer.groups');
		for (let msp_id in ord_grp) {
			if (!ret[msp_id]) {
				ret[msp_id] = {
					root_certs: _.get(ord_grp[msp_id], 'values.MSP.value.config.root_certs'),
					intermediate_certs: _.get(ord_grp[msp_id], 'values.MSP.value.config.intermediate_certs'),
					tls_root_certs: _.get(ord_grp[msp_id], 'values.MSP.value.config.tls_root_certs'),
				};
			}
		}
		return ret;
	}

	// organize all nodes by their orderer cluster aka ordering service
	async organize_osns(consentersInConfigBlock, all_orderers, config_block, channel_data) {
		const ret = {};
		const msp_data = this.buildSimpleMspFromConfigBlock(config_block);
		let all_identities = await IdentityApi.getIdentities();
		const selectedClusterId = this.props.selectedCluster ? this.props.selectedCluster.cluster_id : null;

		// first iter over nodes that are in the config block as consenters
		for (let i in consentersInConfigBlock) {
			const consenter = consentersInConfigBlock[i];
			const node_data = find_orderer_data(consenter.host, consenter.port);

			if (node_data && node_data.msp_id && node_data.osnadmin_url) {
				consenter._id = node_data._id;					// only copy what we need
				consenter.name = node_data.name;
				consenter._consenter = true;
				consenter.osnadmin_url = node_data.osnadmin_url;
				consenter.msp_id = node_data.msp_id;

				const cluster_id = node_data._cluster_id;
				if (!ret[cluster_id]) {
					if (node_data && node_data.msp_id && node_data.osnadmin_url) {
						ret[cluster_id] = await init_cluster(node_data, true);
					}
				}


				// if the first node we itered on didn't find a tls identity for some reason this could still be null, replace it now
				if (ret[cluster_id] && !ret[cluster_id].tls_identity) {

					// get tls identity for node
					const identity4tls = await ChannelParticipationApi.findMatchingIdentity({
						identities: all_identities,
						root_certs_b64pems: _.get(node_data, 'msp.tlsca.root_certs')
					});

					ret[cluster_id].tls_identity = identity4tls;
				}

				// orderer is not in map yet (this shouldn't be possible for the consenters array, but just in case)
				if (!osn_already_exist(cluster_id, node_data._id)) {

					// add some fields to each node entry, but don't propagate those fields
					ret[cluster_id].nodes.push(init_node(consenter, true));
				}
			}
		}

		// next iter over all known orderer nodes (these ones may or may not be a consenter)
		// add nodes we are missing (these will be possible followers)
		for (let i in all_orderers) {
			const cluster_id = all_orderers[i]._cluster_id;
			const msp_id = all_orderers[i].msp_id;
			const node = all_orderers[i];

			// if user has *not* entered via drill down then add nodes from all known clusters (init cluster if needed)
			if (!ret[cluster_id] && !this.props.drill_down_flow) {
				if (node && node.msp_id && node.osnadmin_url) {
					ret[cluster_id] = await init_cluster(node, false);
				}
			}

			// if user has entered via drill down then add nodes from the selected cluster (init cluster if needed)
			if (selectedClusterId && cluster_id === selectedClusterId && !ret[cluster_id] && this.props.drill_down_flow) {
				if (node && node.msp_id && node.osnadmin_url) {
					ret[cluster_id] = await init_cluster(node, false);
				}
			}

			// if this cluster id dne yet, but this msp matches one that is a consenter, init this cluster and add its nodes
			if (!ret[cluster_id] && msp_is_consenter(msp_id, consentersInConfigBlock)) {
				if (node && node.msp_id && node.osnadmin_url) {
					ret[cluster_id] = await init_cluster(node, true);
				}
			}

			// we only add orderers from clusters that are in "ret", else skip this node
			if (ret[cluster_id]) {
				if (!osn_already_exist(cluster_id, node._id)) {	// orderer is not in map yet
					if (node.osnadmin_url) {						// osn-join flow needs the osnadmin_url field
						node._consenter = false;
						ret[cluster_id].nodes.push(init_node(node, false));
					}
				}
			}
		}

		// remove clusters with no nodes (b/c it cannot be used)
		for (let clusterId in ret) {
			if (!Array.isArray(ret[clusterId].nodes) || ret[clusterId].nodes.length === 0) {
				delete ret[clusterId];
			} else {
				fancy_node_sort(ret[clusterId].nodes);
			}
		}

		return ret;

		// init the "ret" field for this node's cluster
		async function init_cluster(node_data, selected) {

			// get tls identity for node
			const identity4tls = await ChannelParticipationApi.findMatchingIdentity({
				identities: all_identities,
				root_certs_b64pems: _.get(node_data, 'msp.tlsca.root_certs')
			});

			return {
				nodes: [],					// populated later
				msp_id: node_data.msp_id,
				cluster_name: node_data._cluster_name,
				cluster_id: node_data._cluster_id,

				// the identity we think they should use
				tls_identity: identity4tls,

				// if this cluster of orderer nodes is selected to join the channel - defaults true
				selected: selected,

				// the root certs for the MSP that controls this cluster, used later in the join-channel api
				tls_root_certs: (msp_data && msp_data[node_data.msp_id]) ? msp_data[node_data.msp_id].tls_root_certs : [],
			};
		}

		// sort orderer nodes, nodes that are consenters are first
		function fancy_node_sort(arr) {
			arr.sort((a, b) => {
				if (a.name && b.name) {

					// if neither a or b is a consenter, alpha sort on the "name" field
					if (!a._consenter && !b._consenter) {
						return a.name.localeCompare(b.name, { usage: 'sort', numeric: true, caseFirst: 'upper' });

					}

					// if a entry is not a consenter but b is, set b first & a last
					if (!a._consenter) { return 1; }

					// if b entry is not a consenter but a is, set a first & b last
					if (!b._consenter) { return -1; }

					// if a and b are not consenters, alpha sort on the "name" field
					return a.name.localeCompare(b.name, { usage: 'sort', numeric: true, caseFirst: 'upper' });
				}
			});
		}

		// check if this orderer node is already in the cluster's nodes array
		function osn_already_exist(cluster_id, node_id) {
			for (let z in ret[cluster_id].nodes) {
				if (ret[cluster_id].nodes[z]._id === node_id) {
					return true;
				}
			}
			return false;
		}

		// add some fields to each node entry, but don't propagate those fields
		function init_node(node_obj, selected) {
			const clone = JSON.parse(JSON.stringify(node_obj));
			clone._status = '';				// either empty, or "pending", or "failed", or "success"
			clone._error = '';				// either empty or a error message (string)
			clone._selected = selected;

			if (node_obj && channel_data && channel_data.nodes && channel_data.nodes[node_obj._id]) {
				if (channel_data.nodes[node_obj._id]._channel_resp) {
					if (channel_data.nodes[node_obj._id]._channel_resp.status === constants.FAB_JOINED_STATUS ||
						channel_data.nodes[node_obj._id]._channel_resp.status === constants.FAB_JOINING_STATUS) {
						clone._status = constants.OSN_JOIN_SUCCESS;
						clone._selected = false;			// don't select a;ready joined nodes
					}
				}
			}

			return clone;
		}

		// find the console component data using "host" & "port" data from the consenter section of the config-block
		function find_orderer_data(host, port) {
			if (host) {
				for (let i in all_orderers) {
					if (all_orderers[i].host === host && Number(all_orderers[i].port) === Number(port)) {
						return all_orderers[i];
					}
				}
			}
			return null;
		}

		// figure out if this msp is a consenter or not
		// dsh todo use root cert
		function msp_is_consenter(msp_id, consenters) {
			for (let i in consenters) {
				if (consenters[i].msp_id === msp_id) {
					return true;
				}
			}
			return false;
		}
	}

	// ------------------------------------------------------------------------------------------------------------------------------------
	// Actions Section
	// ------------------------------------------------------------------------------------------------------------------------------------
	// selected orderer was changed
	changeOrderer = async (change) => {
		const orderer = change.orderer_joined;
		try {
			const resp = await this.loadChannels(orderer);
			const channels = (resp && Array.isArray(resp.channels)) ? resp.channels : [];

			let noChannelsError = '[Error] This orderer hasn\'t joined any channels:';
			let noChannelsErrorDets =
				'This join requires pulling the channel config block from one orderer and passing it to the joining orderer. Since there are no channels on this orderer it cannot be used.';

			this.props.updateState(SCOPE, {
				channels: channels,
				selected_osn: orderer,

				block_error_title: (channels.length === 0) ? noChannelsError : '',
				block_error: (channels.length === 0) ? noChannelsErrorDets : '',
			});
		} catch (e) {
			Log.error(e);
			this.props.updateState(SCOPE, {
				block_error_title: '[Error] Unable to fetch channels.',
				block_error:
					'This join requires pulling the channel config block from one orderer and passing it to the joining orderer. Since we loaded 0 channels on this orderer it cannot be used.',
			});
		}
	};

	// selected channel was changed
	changeChannel = async (change) => {
		const channelName = (change && change.channel) ? change.channel.name : '';
		await this.setupForJoinViaChannelDropDown(channelName);
	};

	// get the config block from the selected channel in drop down and load the 2nd step
	setupForJoinViaChannelDropDown = async (channelName) => {
		return this.setupForJoinChannel(channelName);
	}

	// get the config block from the selected channel tile and load the 2nd step
	setupForJoinViaChannelTile = async (channelName) => {
		return this.setupForJoinChannel(channelName);
	}

	// get the config block and load the 2nd step
	setupForJoinChannel = async (channelName) => {
		this.props.updateState(SCOPE, {
			config_block_b64: null,
			loading: true,
			drill_down_flow: true,		// true if user clicked on specific cluster before coming to this panel
		});
		try {
			const config_block_b64 = await this.getChannelConfigBlock(channelName);
			this.props.updateState(SCOPE, {
				config_block_b64: config_block_b64,
				//loading: false,		// keep loading true until parseConfigBlock is done
			});
			try {
				const json_block = await this.parseConfigBlock(config_block_b64);
				this.setupDownloadGenesisLink(json_block, channelName);
			} catch (e) {
				Log.error(e);
				const code = (e && !isNaN(e.status_code)) ? '(' + e.status_code + ') ' : '';
				const details = (e && typeof e.stitch_msg === 'string') ? (code + e.stitch_msg) : '';
				this.props.updateState(SCOPE, {
					block_error_title: '[Error] Could not parse config-block. Resolve error to continue:',
					block_error: details ? details : e.toString(),
					config_block_b64: null,
					loading: false,
				});
			}
		} catch (e) {
			Log.error(e);
			const code = (e && e.grpc_resp && !isNaN(e.grpc_resp.status)) ? e.grpc_resp.status : '';
			let details = (e && typeof e.stitch_msg === 'string') ? ('(' + code + ') ' + e.stitch_msg) : '';
			let show_channels_nav_link = false;

			if (Number(code) === 503) {
				details = '503 - Unable to retrieve the config-block because the orderer does not have quorum. ';
			}
			details = details ? details : e.toString();

			// --------------------------------------------------
			// Attempt to find config blocks from the database
			// --------------------------------------------------
			try {
				const local_config_blocks = await this.tryToFindLocalConfigBlocks(channelName);

				// if we find 1 and only 1, load it and continue as normal
				/*if (Array.isArray(local_config_blocks) && local_config_blocks.length === 1 && local_config_blocks[0].block_b64) {
					local_config_block_b64 = local_config_blocks[0].block_b64;
					Log.debug('found config block in console database: ' + channelName);
				}*/

				// if we find a couple, prompt user to pick one
				if (Array.isArray(local_config_blocks) && local_config_blocks.length > 0 && local_config_blocks[0].block_b64) {
					Log.debug('found 1+ config blocks in console database: ' + channelName);
					show_channels_nav_link = true;
					details += 'The console was unable to pull the latest config block from your ordering cluster. This is a required step. ';
					details += 'However, you may still be able to join using a previous config block stored by the console. ';
					details += 'Use the link below to browse the "Channels" tab and pick the already-joined channel tile to continue. ';
				}
			} catch (e) {
				Log.debug('was unable to use config block in console database: ' + channelName);
				Log.error(e);
			}

			// show config block retrieval error
			this.props.updateState(SCOPE, {
				block_error_title: '[Error] Could not get config-block. Resolve error to continue:',
				block_error: details,
				config_block_b64: null,
				loading: false,
				show_channels_nav_link: show_channels_nav_link,
			});
		}
	}

	// parse the config block from pending channel tile and load the 2nd step
	setupForJoinViaPendingTile = async () => {
		const channelName = this.props.selectedConfigBlockDoc.channel;

		this.props.updateState(SCOPE, {
			config_block_b64: this.props.selectedConfigBlockDoc.block_b64,
			loading: true,
			drill_down_flow: false,
		});

		try {
			const json_block = await this.parseConfigBlock(this.props.selectedConfigBlockDoc.block_b64);
			this.setupDownloadGenesisLink(json_block, channelName);
		} catch (e) {
			Log.error(e);
			const code = (e && !isNaN(e.status_code)) ? '(' + e.status_code + ') ' : '';
			const details = (e && typeof e.stitch_msg === 'string') ? (code + e.stitch_msg) : '';

			this.props.updateState(SCOPE, {
				block_error_title: '[Error] Could not parse config-block. Resolve error to continue:',
				block_error: details ? details : e.toString(),
				config_block_b64: null,
				loading: false,
			});
		}
	}

	// select or unselect the node
	toggleNode = (node_id, cluster_id, evt) => {
		let { joinOsnMap, missingONTLSIdentities, json_genesis_block, missingOSOrgIdentities } = this.props;
		const mspIds = Object.keys(json_genesis_block.data.data[0].payload.data.config.channel_group.groups.Orderer.groups);

		let missingTLSCertClusters = new Set(missingONTLSIdentities);
		const missingOSOrgClusters = new Set(missingOSOrgIdentities);
		if (joinOsnMap && joinOsnMap[cluster_id]) {

			// any of the node is selected then update cluster.selected flag

			const totalSelectedAlreadyNodes = joinOsnMap[cluster_id].nodes.filter(_node => _node._selected && _node._id !== node_id);
			for (let i in joinOsnMap[cluster_id].nodes) {
				// To validate cluster does have TLS cert or not
				if (joinOsnMap[cluster_id].nodes[i]._id === node_id) {
					if (joinOsnMap[cluster_id].nodes[i]._selected && totalSelectedAlreadyNodes < 1) {
						missingTLSCertClusters.delete(joinOsnMap[cluster_id].cluster_name);
					} else {
						if (!joinOsnMap[cluster_id].tls_identity) {
							missingTLSCertClusters.add(joinOsnMap[cluster_id].cluster_name);
						}
					}

					joinOsnMap[cluster_id].nodes[i]._selected = !joinOsnMap[cluster_id].nodes[i]._selected;

					const selectedOsns = this.countSelectedOrderers(joinOsnMap);
					joinOsnMap[cluster_id].selected = this.isClusterSelected(joinOsnMap[cluster_id].nodes);

					if (joinOsnMap[cluster_id].nodes[i]._selected && !mspIds.includes(joinOsnMap[cluster_id].nodes[i].msp_id)) {
						missingOSOrgClusters.add(joinOsnMap[cluster_id].nodes[i].name);
					} else {
						missingOSOrgClusters.delete(joinOsnMap[cluster_id].nodes[i].name);
					}

					this.props.updateState(SCOPE, {
						select_all_toggle: this.props.possible_nodes === selectedOsns,
						joinOsnMap: JSON.parse(JSON.stringify(joinOsnMap)),
						count: selectedOsns,
						missingONTLSIdentities: Array.from(missingTLSCertClusters),
						missingOSOrgIdentities: Array.from(missingOSOrgClusters)
					});


					break;
				}
			}
		}
	}

	// select or deselect all nodes
	toggleSelected = () => {
		let { joinOsnMap, json_genesis_block } = this.props;

		const mspIds = Object.keys(json_genesis_block.data.data[0].payload.data.config.channel_group.groups.Orderer.groups);

		const missingOSOrgClusters = new Set([]);
		const missingTLSCertClusters = new Set([]);
		for (let cluster_id in joinOsnMap) {
			for (let i in joinOsnMap[cluster_id].nodes) {
				if (joinOsnMap[cluster_id].nodes[i]._status !== constants.OSN_JOIN_SUCCESS) {
					joinOsnMap[cluster_id].nodes[i]._selected = !this.props.select_all_toggle;
				}
				if (joinOsnMap[cluster_id].nodes[i]._status !== constants.OSN_JOIN_SUCCESS) {
					// Validate TLS cert missing for selected cluster
					if (!this.props.select_all_toggle && !joinOsnMap[cluster_id].tls_identity) {
						missingTLSCertClusters.add(joinOsnMap[cluster_id].cluster_name);
					} else {
						missingTLSCertClusters.delete(joinOsnMap[cluster_id].cluster_name);
					}

					const mspId = joinOsnMap[cluster_id].nodes[i].msp_id || joinOsnMap[cluster_id].nodes[i].msp_id;
					if (!this.props.select_all_toggle && !mspIds.includes(mspId)) {
						missingOSOrgClusters.add(joinOsnMap[cluster_id].nodes[i].name);
					} else {
						missingOSOrgClusters.delete(joinOsnMap[cluster_id].nodes[i].name);
					}
				}
			}
			joinOsnMap[cluster_id].selected = this.isClusterSelected(joinOsnMap[cluster_id].nodes);
		}

		this.props.updateState(SCOPE, {
			select_all_toggle: !this.props.select_all_toggle,
			joinOsnMap: JSON.parse(JSON.stringify(joinOsnMap)),
			count: this.countSelectedOrderers(joinOsnMap),
			missingONTLSIdentities: Array.from(missingTLSCertClusters),
			missingOSOrgIdentities: Array.from(missingOSOrgClusters)
		});
	}

	isClusterSelected(nodes) {
		const totalSelectedNodes = nodes.filter(node => node._selected);
		return totalSelectedNodes.length > 0;
	}

	// perform the osnadmin join-channel apis on the channel (config block is a genesis block)
	// dsh todo - remove async each limit and do a for loop with awaits
	async onSubmit(self, cb) {
		const {
			selectedCluster,
			joinOsnMap,
			b_genesis_block,
			json_genesis_block
		} = self.props;
		const mspIds = Object.keys(json_genesis_block.data.data[0].payload.data.config.channel_group.groups.Orderer.groups);
		self.props.updateState(SCOPE, {
			submitting: true,
			joinOsnMap: JSON.parse(JSON.stringify(reset(joinOsnMap))),
		});
		let join_errors = 0;
		let join_successes = 0;

		let orderersToBeAdd = [];
		if (selectedCluster) {
			orderersToBeAdd = joinOsnMap[selectedCluster.cluster_id].nodes.filter(_node => _node._status !== constants.OSN_JOIN_SUCCESS);

			orderersToBeAdd = orderersToBeAdd.map(_peer => {
				return {
					..._peer,
					display_name: _peer.name
				};
			});
		}

		// iter over the selected clusters
		async.eachLimit(joinOsnMap, 1, (cluster, cluster_cb) => {
			if (!cluster.tls_identity) {
				return cluster_cb();
			}
			// iter over the selected nodes in the selected cluster
			async.eachOfLimit(cluster.nodes, 1, (node, i, node_cb) => {
				if (node._status === constants.OSN_JOIN_SUCCESS) {
					return node_cb();				// node is already done
				} else if (!node._selected) {
					return node_cb();				// node is not selected
				} else {
					if (mspIds.includes(node.msp_id)) {
						perform_join(cluster, node, i, () => {
							setTimeout(() => {
								// joinOsnMap was changed, now reflect the change
								self.props.updateState(SCOPE, {
									joinOsnMap: JSON.parse(JSON.stringify(joinOsnMap)),
								});

								return node_cb();
							}, 300 + Math.random() * 2000);		// slow down
						});
					} else {
						return cluster_cb();
					}
				}
			}, () => {
				return cluster_cb();
			});
		}, async () => {

			// if at least one joined, we can delete the pending join tile if it exist
			let tx_id = self.props.selectedConfigBlockDoc ? self.props.selectedConfigBlockDoc.id : null;
			if (join_successes > 0 && tx_id) {
				try {
					await ConfigBlockApi.archive(tx_id);

					// then reload them to force cache update
					await ConfigBlockApi.getAll({ cache: 'skip' });
					await ConfigBlockApi.getAll({ cache: 'skip', visibility: 'all' });		// do both types
				} catch (e) {
					Log.error(e);
				}
			}

			self.props.updateState(SCOPE, {
				submitting: false,
			});

			let resp = null;
			let responseStatus = '';
			if (join_errors > 0) {
				resp = { failures: true };
				responseStatus = 'error';
			}

			if (orderersToBeAdd.length) {
				EventsRestApi.sendJoinChannelEvent(self.props.channel_id, orderersToBeAdd, responseStatus, 'orderer');
			}
			return cb(resp, null);
		});

		// convert json to pb && then send joinOSNChannel call && reflect the status in the UI
		async function perform_join(cluster, node, i, cb) {
			const j_opts = {
				host: node.osnadmin_url,
				certificate_b64pem: cluster.tls_identity ? cluster.tls_identity.cert : null,
				private_key_b64pem: cluster.tls_identity ? cluster.tls_identity.private_key : null,
				root_cert_b64pem: Array.isArray(cluster.tls_root_certs) ? cluster.tls_root_certs[0] : null,
				b_config_block: b_genesis_block,
			};

			try {
				await StitchApi.joinOSNChannel(j_opts);
			} catch (error) {
				const msg = (error && error.http_resp) ? error.http_resp : error;
				handle_join_outcome(cluster, i, constants.OSN_JOIN_ERROR, msg);
				return cb();
			}

			handle_join_outcome(cluster, i, constants.OSN_JOIN_SUCCESS);
			return cb();
		}

		// update the state of the node
		function handle_join_outcome(cluster, index, outcome, error_msg) {
			if (typeof error_msg === 'object') {
				error_msg = JSON.stringify(error_msg);
			}
			if (joinOsnMap[cluster.cluster_id]) {
				if (Array.isArray(joinOsnMap[cluster.cluster_id].nodes) && joinOsnMap[cluster.cluster_id].nodes[index]) {
					joinOsnMap[cluster.cluster_id].nodes[index]._status = outcome;
					joinOsnMap[cluster.cluster_id].nodes[index]._error = error_msg;
				}
			}
			if (outcome === constants.OSN_JOIN_ERROR) {
				join_errors++;
			} else if (outcome === constants.OSN_JOIN_SUCCESS) {
				join_successes++;
			}
		}

		// clear error status and error message of each node
		function reset(obj) {
			for (let cluster_id in obj) {
				for (let i in obj[cluster_id].nodes) {
					if (obj[cluster_id].nodes[i]._status === constants.OSN_JOIN_ERROR) {
						obj[cluster_id].nodes[i]._status = constants.OSN_JOIN_PENDING;
					}
					obj[cluster_id].nodes[i]._error = '';
				}
			}
			return obj;
		}
	}

	// try to find a config block doc with the same channel name
	async tryToFindLocalConfigBlocks(channel_name) {
		const ret = [];
		const config_blocks = await ConfigBlockApi.getAll({ cache: 'skip', visibility: 'all' });
		if (config_blocks && Array.isArray(config_blocks.blocks)) {
			for (let i in config_blocks.blocks) {
				if (config_blocks.blocks[i] && config_blocks.blocks[i].channel === channel_name) {
					ret.push(config_blocks.blocks[i]);
				}
			}
		}
		return ret;
	}

	// ------------------------------------------------------------------------------------------------------------------------------------
	// Rendering Section
	// ------------------------------------------------------------------------------------------------------------------------------------
	// step 1 - [select orderer, channel, get config-block]
	renderSelectOrderer(translate) {
		if (!this.props.orderers) {
			return;
		}

		return (
			<WizardStep
				type="WizardStep"
				headerDesc={translate('join_osn_desc')}
				//title={translate('select_osn')}
				desc={translate('select_osn_desc')}
				tooltip={translate('select_orderer_tooltip')}
				disableSubmit={!this.props.config_block_b64 || this.props.loading || this.props.block_error}
			>
				<Form
					scope={SCOPE}
					id={SCOPE + '-orderer'}
					fields={[
						{
							name: 'orderer_joined',
							type: 'dropdown',
							options: this.props.orderers,
							default: 'select_osn_placeholder',
							required: true,
						},
					]}
					onChange={this.changeOrderer}
				/>
				<Form
					scope={SCOPE}
					id={SCOPE + '-channels'}
					fields={[
						{
							name: 'channel',
							type: 'dropdown',
							options: this.props.channels,
							required: true,
							default: 'select_ch_placeholder',
							disabled: (!this.props.channels || this.props.channels.length === 0) ? true : false
						},
					]}
					onChange={this.changeChannel}
				/>
				{this.props.loading && <Loading withOverlay={false}
					className="ibp-wizard-loading"
				/>}

				{this.props.block_error && (
					<div className="ibp-join-osn-error-wrap">
						<InlineNotification
							kind="error"
							title={this.props.block_error_title}
							subtitle={this.props.block_error}
							hideCloseButton={true}
						/>
					</div>
				)}
			</WizardStep>
		);
	}

	// step 2 - [select osn's to join, perform join]
	renderSelectJoiningOSNs(translate) {
		const {
			joinOsnMap,
			channel_id,
			count,
			select_all_toggle,
			block_error,
			block_error_title,
			drill_down_flow,
			show_channels_nav_link,
			missingONTLSIdentities,
			missingOSOrgIdentities
		} = this.props;

		return (
			<WizardStep
				type="WizardStep"
				//headerDesc={translate('osn-join-desc')}
				//title={translate('select_osn')}
				//desc={translate('select_osn_desc')}
				//tooltip={translate('select_orderer_tooltip')}
				disableSubmit={count === 0 || block_error || (missingONTLSIdentities && missingONTLSIdentities.length === count) || (missingOSOrgIdentities && missingOSOrgIdentities.length)}
			>
				{this.props.loading && <Loading withOverlay={false}
					className="ibp-wizard-loading"
				/>}

				<div className="ibp-channel-osn-join">
					{block_error && (
						<div className="ibp-join-osn-error-wrap">
							<InlineNotification
								kind="error"
								title={block_error_title}
								subtitle={block_error}
								hideCloseButton={true}
							/>
						</div>
					)}

					{!block_error && !this.props.loading && (
						<div>
							<p className="ibp-join-osn-desc">
								{drill_down_flow ? translate('osn-join-desc2') : translate('osn-join-desc')}
							</p>
						</div>
					)}

					{!block_error && this.props.loading && (
						<div>
							<br />
							<br />
							<p className="ibp-join-osn-desc">
								{translate('osn-join-loading-desc')}
							</p>
						</div>
					)}

					{show_channels_nav_link && (
						<a href="/channels?visibility=all">{translate('browse_channels_tab')}</a>
					)}

					{!this.props.loading && joinOsnMap && !_.isEmpty(Object.keys(joinOsnMap)) && (
						<p className="ibp-join-osn-cluster-title">
							{translate('clusters_title', { channel: channel_id })}
							<span className="ibp-join-osn-count">({count || '0'} {count === 1 ? translate('node_lc') : translate('nodes_lc')})</span>
							<a href="#"
								id="ibp-download-genesis-link2"
								className="ibp-join-download"
							>
								{translate('download_gen')}
							</a>

							<Toggle
								id="select_all_toggle"
								className="ibp-join-osn-select-followers"
								toggled={select_all_toggle}
								onToggle={this.toggleSelected}
								onChange={() => { }}
								aria-label={select_all_toggle ? translate('unselect_all') : translate('select_all')}
								labelA={translate('select_all')}
								labelB={translate('unselect_all')}
							/>
						</p>
					)}

					{!this.props.loading && joinOsnMap && !_.isEmpty(Object.keys(joinOsnMap)) && (
						<div className="ibp-join-osn-msp-wrap">
							<div className="ibp-join-osn-label">{translate('clusters')}:</div>
							{Object.values(joinOsnMap).map((cluster, i) => {
								return (this.renderClusterSection(cluster));
							})}
						</div>
					)}
				</div>

				{(missingONTLSIdentities && missingONTLSIdentities.length) ? (<SidePanelWarning title="tls_identity_not_found"
					subtitle={translate('orderer_tls_admin_identity_not_found_in_selected_clusters', { clusters: `${missingONTLSIdentities.join(', ')}` })}
				/>) : null}

				{(missingOSOrgIdentities && missingOSOrgIdentities.length) ? (<SidePanelWarning title="orderer_org_not_found_in_channel"
					subtitle={translate('orderer_org_not_found_in_selected_nodes', { nodes: `${missingOSOrgIdentities.join(', ')}` })}
				/>) : null}
			</WizardStep>
		);
	}

	// create the cluster section (this contains each node)
	renderClusterSection(cluster) {
		return (
			<div key={'cluster_' + cluster.cluster_id}
				className="ibp-join-osn-wrap"
			>
				<div>
					<label name={'joinCluster' + cluster.cluster_id}
						className="ibp-join-osn-cluster-wrap"
					>
						<div className={'ibp-join-osn-clusterid'}>{cluster.cluster_name}</div>
					</label>
				</div >
				<div>{this.renderNodesSection(cluster.nodes, cluster)}</div>
			</div >
		);
	}

	// create the line for an orderer node
	renderNodesSection(nodes, cluster) {
		const { t: translate } = this.props;

		if (Array.isArray(nodes)) {
			return (nodes.map((node, i) => {
				const label = '[' + (node._consenter ? ('★ ' + translate('consenter')) : ('☆ ' + translate('follower'))) + ']';
				let statusClassBorder = '';
				let statusClassIcon = '';
				let statusTitle = 'not_joined';

				if (node._status === constants.OSN_JOIN_SUCCESS) {
					statusClassBorder = 'ibp-join-osn-node-wrap-success';
					statusTitle = 'already_joined';
				}
				if (node._status === constants.OSN_JOIN_ERROR) {
					statusClassBorder = 'ibp-join-osn-node-wrap-error';
					statusClassIcon = 'ibp-join-osn-status-error';
					statusTitle = 'failed_join';
				}
				const hasJoinedChannel = (node._status === constants.OSN_JOIN_SUCCESS);

				return (
					<div className={'ibp-join-osn-node-wrap-wrap'}
						key={'node-wrap-' + i}
					>
						<div className={'ibp-join-osn-node-wrap ' + statusClassBorder}
							title={translate(statusTitle)}
						>
							<input type="checkbox"
								className="ibp-join-osn-icon"
								checked={node._selected === true && !hasJoinedChannel}
								indeterminate={hasJoinedChannel}
								name={'joinNode' + node._id}
								id={'joinNode' + node._id}
								onChange={event => {
									this.toggleNode(node._id, cluster.cluster_id, event);
								}}
								disabled={hasJoinedChannel}
								title={(hasJoinedChannel) ? translate('already_joined') : (node._consenter === true ? 'Node is a consenter' : 'Node is a follower')}
							/>
							<div className="ibp-join-osn-name">{node.name}</div>
							<div className="ibp-join-osn-node-details">
								<div className="ibp-join-osn-host">
									{label} - {node.host}:{node.port}
								</div>
							</div>
							<span className={'ibp-join-osn-status ' + statusClassIcon}>
								{this.renderStatusIcon(node._status, hasJoinedChannel)}
							</span>
						</div>
						<div className="ibp-join-osn-error">{node._error}</div>
					</div >
				);
			}));
		}
	}

	// render the join-status icon for the node
	renderStatusIcon(status_str, joined) {
		if (status_str === constants.OSN_JOIN_PENDING) {
			return (
				<ProgressBarRound16 title="Node has not joined yet" />
			);
		}
		if (status_str === constants.OSN_JOIN_SUCCESS || joined) {
			return (
				<CheckmarkFilled16 title="Node has joined" />
			);
		}
		if (status_str === constants.OSN_JOIN_ERROR) {
			return (
				<WarningFilled16 title="Node failed to join" />
			);
		}

		return (
			<CircleDash16 />
		);
	}

	// main render
	render() {
		const translate = this.props.t;
		const on_submit = promisify(this.onSubmit);

		return (
			<Wizard
				title="join_osn_channel_title"
				onClose={this.props.onClose}
				onSubmit={async () => {
					let keepSidePanelOpen = false;
					try {
						keepSidePanelOpen = await on_submit(this);
						this.props.showSuccess('channel_join_request_submitted', { channelName: this.props.channel_id }, SCOPE, null, true);
					} catch (e) {
						keepSidePanelOpen = true;
					}
					if (keepSidePanelOpen) {
						return Promise.reject({
							title: translate('general_join_fail_title'),
							details: translate('general_join_failure')
						});
					} else {
						this.props.onComplete();
					}
				}}
				showSubmitSpinner={this.props.submitting}
				submitButtonLabel={translate('join_channel')}
				extraLargePanel={true}
			>
				{this.renderSelectOrderer(translate)}
				{this.renderSelectJoiningOSNs(translate)}
			</Wizard>
		);
	}
}

const dataProps = {
	channel: PropTypes.string,
	submitting: PropTypes.bool,
	disableSubmit: PropTypes.bool,
	orderers: PropTypes.array,
	orderer: PropTypes.object,
	loading: PropTypes.bool,
	channels: PropTypes.bool,
	selected_osn: PropTypes.object,
	drill_down_flow: PropTypes.bool,
	show_channels_nav_link: PropTypes.bool,

	config_block_b64: PropTypes.object,
	b_genesis_block: PropTypes.blob,
	json_genesis_block: PropTypes.object,
	configtxlator_url: PropTypes.string,
	select_all_toggle: PropTypes.bool,
	channel_id: PropTypes.string,
	block_error: PropTypes.string,
	block_error_title: PropTypes.string,
	count: PropTypes.number,
	follower_count: PropTypes.number,
	possible_nodes: PropTypes.number,
	joinOsnMap: PropTypes.Object,

	consenters: PropTypes.array,
	missingONTLSIdentities: array,
	missingOSOrgIdentities: array
};

JoinOSNChannelModal.propTypes = {
	...dataProps,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
	updateState: PropTypes.func,
	showSuccess: PropTypes.func,
	joinChannelDetails: PropTypes.object,
	selectedCluster: PropTypes.object,
	selectedConfigBlockDoc: PropTypes.object,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['configtxlator_url'] = _.get(state, 'settings.configtxlator_url');
		newProps['CRN'] = state['settings'] ? state['settings']['CRN'] : null;
		newProps['userInfo'] = state['userInfo'] ? state['userInfo']['loggedInAs'] : null;
		newProps['configtxlator_url'] = state['settings']['configtxlator_url'];
		newProps['docPrefix'] = state['settings'] ? state['settings']['docPrefix'] : null;
		return newProps;
	},
	{
		updateState,
		showSuccess,
	}
)(withTranslation()(JoinOSNChannelModal));
