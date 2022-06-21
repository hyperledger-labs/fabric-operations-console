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
import PropTypes from 'prop-types';
import React from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
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

const SCOPE = 'joinOSNChannelModal';
const Log = new Logger(SCOPE);
const url = require('url');

class JoinOSNChannelModal extends React.Component {
	async componentDidMount() {

		// [Flow 1] - the channel is not yet selected, show step to select a node and channel name
		if (!this.props.joinChannelDetails) {
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
				drill_down_flow: false,							// true if user clicked on specific cluster before coming to this panel
				block_error: '',
			});
		}

		// [Flow 2] - the channel was already chosen, skip to step to select joining osns
		else {
			this.props.updateState(SCOPE, {
				orderers: null,									// setting null here skips the first step
				configtxlator_url: this.props.configtxlator_url,
				block_error: '',
			});
			await this.setupForJoin(this.props.joinChannelDetails.name);
		}
	}

	componentWillUnmount() {
		this.props.updateState(SCOPE, {
			config_block_b64: null,
			selected_osn: null,
			joinChannelDetails: null,
		});
	}

	// get all the channels for selected orderer node
	loadChannels = async (orderer) => {
		if (!orderer || !orderer.osnadmin_url) { return; }
		let orderer_tls_identity = await IdentityApi.getTLSIdentity(orderer);

		if (orderer_tls_identity) {
			try {
				let all_identities = await IdentityApi.getIdentities();
				const channels = await ChannelParticipationApi._getChannels(all_identities, orderer);
				return channels;
			} catch (e) {
				Log.error(e);
				const code = (e && !isNaN(e.status_code)) ? '(' + e.status_code + ') ' : '';
				const details = (e && typeof e.stitch_msg === 'string') ? (code + e.stitch_msg) : '';
				this.props.updateState(SCOPE, {
					block_error_title: '[Error] Could not load channels. Resolve error to continue:',
					block_error: details,
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
				if (this.props.joinChannelDetails.nodes[i]._channel_resp) {
					osn_to_use = this.props.joinChannelDetails.nodes[i];	// use the first node that knows this channel if available
					break;
				}
			}
		}

		let all_identities = await IdentityApi.getIdentities();
		const identity4tls = await ChannelParticipationApi.findMatchingIdentity({
			identities: all_identities,
			root_certs_b64pems: _.get(osn_to_use, 'msp.tlsca.root_certs')
		});

		const opts = {
			msp_id: osn_to_use.msp_id,
			client_cert_b64pem: identity4tls.cert,
			client_prv_key_b64pem: identity4tls.private_key,
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

			this.props.updateState(SCOPE, {
				channel_id: channel_id,
				joinOsnMap: joinOsnMap,
				count: this.countOrderers(joinOsnMap),
				follower_count: this.countFollowers(joinOsnMap),
				b_genesis_block: window.stitch.base64ToUint8Array(config_block_b64),
				select_followers_toggle: false,
				block_error: '',
				block_error_title: '',
				submitting: false,
				loading: false,
			});

			return json_block;
		}
	}

	// get all known orderers and filter them to down to ones that can be a consenter
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

			// consenters must have a tls certificate and host/port data
			if (urlObj && urlObj.hostname && urlObj.port && tls_cert) {
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
				block_error: details,
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
			const dateStr = d.toLocaleDateString().split('/').join('-') + '-' + d.toLocaleTimeString().replace(/[:\s]/g, '');
			let name = 'IBP_' + channel_name + '_genesis_' + dateStr + '.json';
			const blob = new Blob([JSON.stringify(block, null, '\t')], { type: 'text/plain' });
			let url = URL.createObjectURL(blob);
			link.setAttribute('href', url);
			link.setAttribute('download', name);
		}
	}

	// count the selected orderers
	countOrderers(useMap) {
		let updateCount = 0;
		for (let id in useMap) {
			if (useMap[id].selected === true) {
				for (let i in useMap[id].nodes) {
					// dont count nodes that are already joined
					if (useMap[id].nodes[i]._selected && useMap[id].nodes[i]._status !== constants.OSN_JOIN_SUCCESS) {
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
	async organize_osns(consenters, all_orderers, config_block, channel_data) {
		const ret = {};
		const msp_data = this.buildSimpleMspFromConfigBlock(config_block);

		// first iter over nodes that were selected as consenters from wizard
		for (let i in consenters) {
			const consenter = consenters[i];
			const node_data = find_orderer_data(consenter.host, consenter.port);

			if (node_data && node_data.msp_id) {
				consenter._id = node_data._id;
				consenter.name = node_data.name;
				consenter._consenter = true;

				const cluster_id = node_data._cluster_id;
				if (!ret[cluster_id]) {
					ret[cluster_id] = {
						nodes: [],					// populated later
						msp_id: node_data.msp_id,
						cluster_name: node_data._cluster_name,
						cluster_id: node_data._cluster_id,

						// currently selected identity
						selected_identity: null,

						// the identity we think they should use - populated next
						default_identity: null,

						// all identities from msp
						identities: await IdentityApi.getIdentitiesForMsp({
							root_certs: (msp_data && msp_data[node_data.msp_id]) ? msp_data[node_data.msp_id].root_certs : [],
							intermediate_certs: (msp_data && msp_data[node_data.msp_id]) ? msp_data[node_data.msp_id].intermediate_certs : [],
						}),

						// identities associated with this orderer cluster
						associated_identities: await IdentityApi.getAssociatedOrdererIdentities({
							cluster_id: cluster_id,
							msp_id: node_data.msp_id,
						}),

						// if this cluster of orderer nodes is selected to join the channel - defaults true
						selected: true,

						// the root certs for the MSP that controls this cluster, used later in the join-channel api
						tls_root_certs: (msp_data && msp_data[node_data.msp_id]) ? msp_data[node_data.msp_id].tls_root_certs : [],
					};

					ret[cluster_id].default_identity = this.pickDefaultIdentity(ret[cluster_id]);
					ret[cluster_id].selected_identity = ret[cluster_id].default_identity ? JSON.parse(JSON.stringify(ret[cluster_id].default_identity)) : null;

					const zero_identities = (ret[cluster_id].default_identity === null);
					if (zero_identities) {
						ret[cluster_id].selected = false;
					}
					for (let z in ret[cluster_id].identities) {
						ret[cluster_id].identities[z]._cluster_id = cluster_id;		// store id here so we can link it back up
					}
				}

				// add some fields to each node entry, but don't propagate those fields
				ret[cluster_id].nodes.push(init_node(consenter, true));
			}
		}

		// next iter over all known orderer nodes (these ones may or may not be a consenter)
		// add nodes we are missing (these will be possible followers)
		for (let i in all_orderers) {
			const cluster_id = all_orderers[i]._cluster_id;
			if (ret[cluster_id]) {											// only add nodes for cluster that was selected
				if (!osn_already_exist(cluster_id, all_orderers[i]._id)) {	// orderer is not in map yet
					const node = all_orderers[i];
					node._consenter = false;
					ret[cluster_id].nodes.push(init_node(node, false));
				}
			}
		}

		// remove clusters with no nodes (b/c there is nothing to join)
		for (let clusterId in ret) {
			if (!Array.isArray(ret[clusterId].nodes) || ret[clusterId].nodes.length === 0) {
				delete ret[clusterId];
			} else {
				fancy_node_sort(ret[clusterId].nodes);
			}
		}

		// iter over joined osn to this channel and set if each osn has joined or not

		return fancy_cluster_sort(ret);

		// sort clusters, clusters that have identities are first
		function fancy_cluster_sort(ret) {
			let ordered = {};
			Object.keys(ret).sort((a, b) => {
				if (ret[a] && ret[b]) {

					// if neither a or b has a default, alpha sort on the keys a & b
					if (!ret[a].default_identity && !ret[b].default_identity) {
						return a.localeCompare(b, { usage: 'sort', numeric: true, caseFirst: 'upper' });
					}

					// if a entry doesn't have a default but b does, set b first & a last
					if (!ret[a].default_identity) { return 1; }

					// if b entry doesn't have a default but a does, set a first & b last
					if (!ret[b].default_identity) { return -1; }

					// if a and b have a default, alpha sort on the keys a & b
					return a.localeCompare(b, { usage: 'sort', numeric: true, caseFirst: 'upper' });
				}
			}).forEach(function (key) {
				ordered[key] = ret[key];							// sort all the object's keys
			});

			return ordered;
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
				if (channel_data.nodes[node_obj._id]._channel_resp && channel_data.nodes[node_obj._id]._channel_resp.name) {
					clone._status = constants.OSN_JOIN_SUCCESS;
					clone._selected = false;			// don't select a;ready joined nodes
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
	}

	// get the default identity for the dropdown
	pickDefaultIdentity(cluster_obj) {
		if (cluster_obj) {
			// return first associated id if possible
			if (Array.isArray(cluster_obj.associated_identities) && cluster_obj.associated_identities.length > 0) {
				return cluster_obj.associated_identities[0];
			}

			// return first identity from this msp
			if (Array.isArray(cluster_obj.identities) && cluster_obj.identities.length > 0) {
				cluster_obj.identities[1];
			}
		}
		return null;
	}

	// ------------------------------------------------------------------------------------------------------------------------------------
	// Actions Section
	// ------------------------------------------------------------------------------------------------------------------------------------
	// selected orderer was changed
	changeOrderer = async (change) => {
		const orderer = change.orderer_joined;
		const resp = await this.loadChannels(orderer);
		const channels = (resp && Array.isArray(resp.channels)) ? resp.channels : [];
		this.props.updateState(SCOPE, {
			channels: channels,
			selected_osn: orderer,
		});
	};

	// selected channel was changed
	changeChannel = async (change) => {
		const channelName = (change && change.channel) ? change.channel.name : '';
		await this.setupForJoin(channelName);
	};

	// get the config block and load the 2nd step
	setupForJoin = async (channelName) => {
		this.props.updateState(SCOPE, {
			config_block_b64: null,
			loading: true,
			drill_down_flow: true,
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
					block_error: details,
					config_block_b64: null,
					loading: false,
				});
			}
		} catch (e) {
			Log.error(e);
			const code = (e && !isNaN(e.status_code)) ? '(' + e.status_code + ') ' : '';
			const details = (e && typeof e.stitch_msg === 'string') ? (code + e.stitch_msg) : '';
			this.props.updateState(SCOPE, {
				block_error_title: '[Error] Could not get config-block. Resolve error to continue:',
				block_error: details,
				config_block_b64: null,
				loading: false,
			});
		}
	}

	// select or unselect the cluster
	toggleCluster = (cluster_id, evt) => {
		let { joinOsnMap } = this.props;
		if (joinOsnMap && joinOsnMap[cluster_id]) {
			joinOsnMap[cluster_id].selected = !joinOsnMap[cluster_id].selected;
			this.props.updateState(SCOPE, {
				joinOsnMap: JSON.parse(JSON.stringify(joinOsnMap)),
				count: this.countOrderers(joinOsnMap),
				follower_count: this.countFollowers(joinOsnMap),
			});
		}
	}

	// selected identity in dropdown was changed
	changeIdentity = (evt) => {
		let { joinOsnMap } = this.props;
		const keys = Object.keys(evt);
		const fieldName = keys ? keys[0] : null;			// the first key is the dropdown's unique id/name

		const cluster_id = (fieldName && evt && evt[fieldName]) ? evt[fieldName]._cluster_id : null;
		if (cluster_id) {
			if (joinOsnMap && joinOsnMap[cluster_id]) {
				joinOsnMap[cluster_id].selected_identity = evt[fieldName];
				this.props.updateState(SCOPE, {
					joinOsnMap: JSON.parse(JSON.stringify(joinOsnMap)),
				});
			}
		}
	}

	// select or unselect the node
	toggleNode = (node_id, cluster_id, evt) => {
		let { joinOsnMap } = this.props;
		if (joinOsnMap && joinOsnMap[cluster_id]) {
			for (let i in joinOsnMap[cluster_id].nodes) {
				if (joinOsnMap[cluster_id].nodes[i]._id === node_id) {
					joinOsnMap[cluster_id].nodes[i]._selected = !joinOsnMap[cluster_id].nodes[i]._selected;

					this.props.updateState(SCOPE, {
						joinOsnMap: JSON.parse(JSON.stringify(joinOsnMap)),
						count: this.countOrderers(joinOsnMap),
					});

					break;
				}
			}
		}
	}

	// select or deselect follower nodes (orderers that are not consenters)
	toggleFollowers = () => {
		let { joinOsnMap } = this.props;

		for (let cluster_id in joinOsnMap) {
			for (let i in joinOsnMap[cluster_id].nodes) {
				if (!joinOsnMap[cluster_id].nodes[i]._consenter) {		// skip consenters
					joinOsnMap[cluster_id].nodes[i]._selected = !this.props.select_followers_toggle;
				}
			}
		}

		this.props.updateState(SCOPE, {
			select_followers_toggle: !this.props.select_followers_toggle,
			joinOsnMap: JSON.parse(JSON.stringify(joinOsnMap)),
			count: this.countOrderers(joinOsnMap),
		});
	}

	// perform the osnadmin join-channel apis on the channel (config block is a genesis block)
	// dsh todo - remove async each limit and do a for loop with awaits
	async onSubmit(self, cb) {
		const {
			joinOsnMap,
			b_genesis_block,
		} = self.props;
		self.props.updateState(SCOPE, {
			submitting: true,
			joinOsnMap: JSON.parse(JSON.stringify(reset(joinOsnMap))),
		});
		let join_errors = 0;

		// iter over the selected clusters
		async.eachLimit(joinOsnMap, 1, (cluster, cluster_cb) => {
			if (!cluster.selected || !cluster.selected_identity) {
				return cluster_cb();
			}

			// iter over the selected nodes in the selected cluster
			async.eachOfLimit(cluster.nodes, 1, (node, i, node_cb) => {
				if (node._status === constants.OSN_JOIN_SUCCESS) {
					return node_cb();				// node is already done
				} else {
					perform_join(cluster, node, i, () => {
						setTimeout(() => {
							// joinOsnMap was changed, now reflect the change
							self.props.updateState(SCOPE, {
								joinOsnMap: JSON.parse(JSON.stringify(joinOsnMap)),
							});
							return node_cb();
						}, 300 + Math.random() * 2000);		// slow down
					});
				}
			}, () => {
				return cluster_cb();
			});
		}, () => {
			self.props.updateState(SCOPE, {
				submitting: false,
			});

			if (join_errors > 0) {
				return cb({ failures: true }, null);
			} else {
				return cb(null, null);
			}
		});

		// convert json to pb && then send joinOSNChannel call && reflect the status in the UI
		async function perform_join(cluster, node, i, cb) {
			const j_opts = {
				host: node.host + ':' + node.port,
				certificate_b64pem: cluster.selected_identity ? cluster.selected_identity.cert : null,
				private_key_b64pem: cluster.selected_identity ? cluster.selected_identity.private_key : null,
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
			</WizardStep>
		);
	}

	// step 2 - [select osn's to join, perform join]
	renderSelectJoiningOSNs(translate) {
		const {
			joinOsnMap,
			channel_id,
			count,
			select_followers_toggle,
			follower_count,
			block_error,
			block_error_title,
			drill_down_flow,
		} = this.props;

		return (
			<WizardStep
				type="WizardStep"
				//headerDesc={translate('osn-join-desc')}
				//title={translate('select_osn')}
				//desc={translate('select_osn_desc')}
				//tooltip={translate('select_orderer_tooltip')}
				disableSubmit={count === 0 || block_error}
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

					{!block_error && (
						<div>
							<p className="ibp-join-osn-desc">
								{drill_down_flow ? translate('osn-join-desc2') : translate('osn-join-desc')}
							</p>
						</div>
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
								id="select_followers_toggle"
								className="ibp-join-osn-select-followers"
								toggled={select_followers_toggle}
								onToggle={this.toggleFollowers}
								onChange={() => { }}
								disabled={follower_count <= 0}
								aria-label={
									drill_down_flow ?
										select_followers_toggle ? translate('unselect_all') : translate('select_all')
										:
										select_followers_toggle ? translate('unselect_followers') : translate('select_followers')
								}
								labelA={drill_down_flow ? translate('select_all') : translate('select_followers')}
								labelB={drill_down_flow ? translate('unselect_all') : translate('unselect_followers')}
							/>
						</p>
					)}

					{!this.props.loading && joinOsnMap && !_.isEmpty(Object.keys(joinOsnMap)) && (
						<div className="ibp-join-osn-msp-wrap">
							{Object.values(joinOsnMap).map((cluster, i) => {
								//	if (cluster.selected === true) {
								return (this.renderClusterSection(cluster));
								//	}
								//} else {
								//	return (this.renderClusterSection(cluster));
							})}
						</div>
					)}
				</div>
			</WizardStep>
		);
	}

	// create the cluster section (this contains each node)
	renderClusterSection(cluster) {
		const { translate, drill_down_flow } = this.props;
		const unselectedClass = (cluster.selected === true) ? '' : 'ibp-join-unselected-cluster';
		const zero_identities = (cluster.default_identity === null);

		return (
			<div key={'cluster_' + cluster.cluster_id}
				className="ibp-join-osn-wrap"
			>
				<div>
					{!drill_down_flow && <input type="checkbox"
						className="ibp-join-osn-cluster-check"
						checked={cluster.selected === true}
						name={'joinCluster' + cluster.cluster_id}
						id={'joinCluster' + cluster.cluster_id}
						onChange={event => {
							this.toggleCluster(cluster.cluster_id, event);
						}}
						disabled={zero_identities}
					/>}

					<label name={'joinCluster' + cluster.cluster_id}
						className="ibp-join-osn-cluster-wrap"
					>
						<div className="ibp-join-osn-label">{translate('cluster')}:</div>
						<div className={'ibp-join-osn-clusterid ' + unselectedClass}>{cluster.cluster_name}</div>
					</label>
					<Form
						scope={SCOPE}
						id={SCOPE + '-join-cluster-' + cluster.cluster_id}
						className="ibp-join-osn-identity-wrap"
						fields={[
							{
								name: 'selectedId-' + cluster.cluster_id,
								label: 'transaction_identity',
								type: 'dropdown',
								options: cluster.identities,
								default: zero_identities ? 'signature_for_join_placeholder_no_options' : cluster.default_identity,
								disabled: cluster.selected !== true || zero_identities
							},
						]}
						onChange={this.changeIdentity}
					/>
				</div >
				<div>{this.renderNodesSection(cluster.nodes, cluster)}</div>
			</div >
		);
	}

	// create the line for an orderer node
	renderNodesSection(nodes, cluster) {
		const { translate } = this.props;
		const unselectedClass = (cluster.selected === true) ? '' : ' ibp-join-unselected-cluster';

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
					<div className={'ibp-join-osn-node-wrap-wrap' + unselectedClass}
						key={'node-wrap-' + i}
					>
						<div className={'ibp-join-osn-node-wrap ' + statusClassBorder}
							title={translate(statusTitle)}
						>
							<input type="checkbox"
								className="ibp-join-osn-icon"
								checked={/*cluster.selected === true &&*/ (node._consenter === true || node._selected === true) && !hasJoinedChannel}
								indeterminate={hasJoinedChannel}
								name={'joinNode' + node._id}
								id={'joinNode' + node._id}
								onChange={event => {
									this.toggleNode(node._id, cluster.cluster_id, event);
								}}
								disabled={node._consenter === true || !cluster.selected || hasJoinedChannel}
								title={(hasJoinedChannel) ? translate('already_joined') : (node._consenter === true ? 'Cannot deselect individual consenters' : 'Node is a follower')}
							/>
							<span className="ibp-join-osn-node-details">
								<div className="ibp-join-osn-name">{node.name}</div>
								<div className="ibp-join-osn-host">
									{label} - {node.host}:{node.port}
								</div>
							</span>
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
		const translate = this.props.translate;
		const on_submit = promisify(this.onSubmit);

		return (
			<Wizard
				title="join_osn_channel_title"
				onClose={this.props.onClose}
				onSubmit={async () => {
					let keepSidePanelOpen = false;
					try {
						keepSidePanelOpen = await on_submit(this);
					} catch (e) {
						keepSidePanelOpen = true;
					}
					if (keepSidePanelOpen) {
						return Promise.reject({
							title: translate('general_join_fail_title'),
							details: translate('general_join_failure')
						});
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

	config_block_b64: PropTypes.object,
	b_genesis_block: PropTypes.blob,
	configtxlator_url: PropTypes.string,
	select_followers_toggle: PropTypes.bool,
	channel_id: PropTypes.string,
	block_error: PropTypes.string,
	block_error_title: PropTypes.string,
	count: PropTypes.number,
	follower_count: PropTypes.number,
	joinOsnMap: PropTypes.Object,

	consenters: PropTypes.array,
};

JoinOSNChannelModal.propTypes = {
	...dataProps,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
	updateState: PropTypes.func,
	joinChannelDetails: PropTypes.object,
	translate: PropTypes.func, // Provided by withLocalize
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
	}
)(withLocalize(JoinOSNChannelModal));
