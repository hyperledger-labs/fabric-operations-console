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

import _ from 'lodash';
import { InlineNotification } from 'carbon-components-react';
import PropTypes from 'prop-types';
import { Toggle } from 'carbon-components-react';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { updateState } from '../../../../redux/commonActions';
import Helper from '../../../../utils/helper';
import Form from '../../../Form/Form';
import StitchApi from '../../../../rest/StitchApi';
import IdentityApi from '../../../../rest/IdentityApi';
import { WarningFilled16, CheckmarkFilled16, ProgressBarRound16, CircleDash16 } from '@carbon/icons-react/es';
import * as constants from '../../../../utils/constants';
import ConfigBlockApi from '../../../../rest/ConfigBlockApi';
import { MspRestApi } from '../../../../rest/MspRestApi';
const SCOPE = 'channelModal';

// This is step "osn_join_channel"
//
// panel allows the user to fire the join-channel api (which uses the osn admin endpoint on an orderer node)
class OSNJoin extends Component {
	async componentDidMount() {
		const {
			buildCreateChannelOpts,
			getAllOrderers,
			use_config_block,
			raftNodes,							// contains all console orderer nodes (not to be confused with all selected consenters)
		} = this.props;
		let joinOsnMap = {};

		//const msps = await this.getMsps();

		// [Flow 1] - config block was passed in - load it
		if (use_config_block) {
			this.props.updateState(SCOPE, {
				submitting: true
			});
			const allOrderers = await getAllOrderers();
			const json_block = await this.parseProto(use_config_block.block_b64);
			this.setupDownloadGenesisLink(json_block, use_config_block.channel);
			const consenters = _.get(json_block, 'data.data[0].payload.data.config.channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters');
			joinOsnMap = await this.organize_osns(consenters, allOrderers, json_block);

			this.props.updateState(SCOPE, {
				channel_id: use_config_block.channel,
				joinOsnMap: joinOsnMap,
				count: this.countOrderers(joinOsnMap),
				follower_count: this.countFollowers(joinOsnMap),
				b_genesis_block: window.stitch.base64ToUint8Array(use_config_block.block_b64),
				select_followers_toggle: false,
				block_error: '',
				submitting: false
			});
		}

		// [Flow 2] - config block was NOT passed in - create it then load it
		else {
			const options = buildCreateChannelOpts();						// get all the input data together
			const my_block = StitchApi.buildGenesisBlockOSNadmin(options);
			const b_block = await this.createProto(my_block);
			let block_stored = false;

			if (b_block) {
				block_stored = await this.storeGenesisBlock(b_block, options.consenters, my_block);
			}

			if (b_block && block_stored) {
				joinOsnMap = await this.organize_osns(options.consenters, raftNodes, my_block);
				this.setupDownloadGenesisLink(my_block, options.channel_id);
				this.props.updateState(SCOPE, {
					channel_id: options.channel_id,
					joinOsnMap: joinOsnMap,
					count: this.countOrderers(joinOsnMap),
					follower_count: this.countFollowers(joinOsnMap),
					b_genesis_block: b_block,
					block_stored_resp: block_stored,
					select_followers_toggle: false,
					block_error: '',
				});
			}
		}
	}

	// get all msp data
	getMsps = async () => {
		let msps = [];
		try {
			msps = await MspRestApi.getAllMsps();
		} catch (e) {
			// nothing to do
		}
		return msps;
	};

	// organize all nodes by their orderer cluster aka ordering service
	async organize_osns(consenters, all_orderers, config_block) {
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
			if (ret[cluster_id]) {
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

	// count the selected orderers
	countOrderers(useMap) {
		let updateCount = 0;
		for (let id in useMap) {
			if (useMap[id].selected === true) {
				for (let i in useMap[id].nodes) {
					if (useMap[id].nodes[i]._selected) {
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

	// download genesis block as JSON - for debug and what not
	setupDownloadGenesisLink = (block, channel_name) => {
		let link = document.getElementById('ibp-download-genesis-link');
		if (link && link.download !== undefined) {
			const d = new Date();
			const dateStr = d.toLocaleDateString().split('/').join('-') + '-' + d.toLocaleTimeString().replace(/[:\s]/g, '');
			let name = 'IBP_' + channel_name + '_genesis_' + dateStr + '.json';
			const blob = new Blob([JSON.stringify(block, null, '\t')], { type: 'text/plain' });
			let url = URL.createObjectURL(blob);
			link.setAttribute('href', url);
			link.setAttribute('download', name);
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

	// main render
	render() {
		const {
			translate,
			joinOsnMap,
			channel_id,
			count,
			select_followers_toggle,
			follower_count,
			block_error,
			osnjoinSubmit,
		} = this.props;
		return (
			<div className="ibp-channel-osn-join">
				<p className="ibp-join-osn-section-title">
					{translate('osn_join_channel')}
					<span className="ibp-join-osn-count">({count || '0'} {count === 1 ? translate('node_lc') : translate('nodes_lc')})</span>
				</p>
				<br />

				{block_error && (
					<div className="ibp-join-osn-error-wrap">
						<InlineNotification
							kind="error"
							title={translate('error')}
							subtitle={block_error}
							hideCloseButton={true}
						/>
					</div>
				)}

				{!block_error && (
					<div>
						<p className="ibp-join-osn-genesis ibp-channel-section-desc">
							The genesis block for &quot;{channel_id ? channel_id : '-'}&quot; was created.

							<a href="#"
								id="ibp-download-genesis-link"
								className="ibp-join-download"
							>
								{translate('download_gen')}
							</a>
						</p>

						<p className="ibp-join-osn-desc">
							{translate('osn-join-desc')}
						</p>
					</div>
				)}

				{follower_count > 0 && (<Toggle
					id="select_followers_toggle"
					className="ibp-join-osn-select-followers"
					toggled={select_followers_toggle}
					onToggle={this.toggleFollowers}
					onChange={() => { }}
					aria-label={select_followers_toggle ? translate('unselect_followers') : translate('select_followers')}
					labelA={translate('select_followers')}
					labelB={translate('unselect_followers')}
				/>)}

				{joinOsnMap && !_.isEmpty(Object.keys(joinOsnMap)) && (
					<p className="ibp-join-osn-cluster-title">
						{translate('clusters_title')}
					</p>
				)}

				{(!joinOsnMap || _.isEmpty(Object.keys(joinOsnMap))) && (
					<div>{translate('loading')}</div>
				)}

				{joinOsnMap && !_.isEmpty(Object.keys(joinOsnMap)) && (
					<div className="ibp-join-osn-msp-wrap">
						{Object.values(joinOsnMap).map((cluster, i) => {
							if (osnjoinSubmit) {
								if (cluster.selected === true) {
									return (this.renderClusterSection(cluster));
								}
							} else {
								return (this.renderClusterSection(cluster));
							}
						})}
					</div>
				)}
			</div>
		);
	}

	// create the cluster section (this contains each node)
	renderClusterSection(cluster) {
		const { translate } = this.props;
		const unselectedClass = (cluster.selected === true) ? '' : 'ibp-join-unselected-cluster';
		const zero_identities = (cluster.default_identity === null);
		return (
			<div key={'cluster_' + cluster.cluster_id}
				className="ibp-join-osn-wrap"
			>
				<div>
					<input type="checkbox"
						className="ibp-join-osn-cluster-check"
						checked={cluster.selected === true}
						name={'joinCluster' + cluster.cluster_id}
						id={'joinCluster' + cluster.cluster_id}
						onChange={event => {
							this.toggleCluster(cluster.cluster_id, event);
						}}
						disabled={zero_identities}
					/>

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
		const unselectedClass = (cluster.selected === true) ? '' : 'ibp-join-unselected-cluster';
		if (Array.isArray(nodes)) {
			return (nodes.map((node, i) => {
				const label = '[' + (node._consenter ? ('★ ' + translate('consenter')) : ('☆ ' + translate('follower'))) + ']';
				let statusClassBorder = '';
				let statusClassIcon = '';
				if (node._status === constants.OSN_JOIN_SUCCESS) {
					statusClassBorder = 'ibp-join-osn-node-wrap-success';
				}
				if (node._status === constants.OSN_JOIN_ERROR) {
					statusClassBorder = 'ibp-join-osn-node-wrap-error';
					statusClassIcon = 'ibp-join-osn-status-error';
				}

				return (
					<div className={'ibp-join-osn-node-wrap-wrap ' + unselectedClass}
						key={'node-wrap-' + i}
					>
						<div className={'ibp-join-osn-node-wrap ' + statusClassBorder}>
							<input type="checkbox"
								className="ibp-join-osn-icon"
								checked={cluster.selected === true && (node._consenter === true || node._selected === true)/* && node._status !== constants.OSN_JOIN_SUCCESS*/}
								name={'joinNode' + node._id}
								id={'joinNode' + node._id}
								onChange={event => {
									this.toggleNode(node._id, cluster.cluster_id, event);
								}}
								disabled={node._consenter === true || !cluster.selected || node._status === constants.OSN_JOIN_SUCCESS}
								title={node._consenter === true ? 'Cannot deselect individual consenters' : 'Node is a follower'}
							/>
							<span className="ibp-join-osn-node-details">
								<div className="ibp-join-osn-name">{node.name}</div>
								<div className="ibp-join-osn-host">
									{label} - {node.host}:{node.port}
								</div>
							</span>
							<span className={'ibp-join-osn-status ' + statusClassIcon}>
								{this.renderStatusIcon(node._status)}
							</span>
						</div>
						<div className="ibp-join-osn-error">{node._error}</div>
					</div>
				);
			}));
		}
	}

	// render the join-status icon for the node
	renderStatusIcon(status_str) {
		if (status_str === constants.OSN_JOIN_PENDING) {
			return (
				<ProgressBarRound16 title="Node has not joined yet" />
			);
		}
		if (status_str === constants.OSN_JOIN_SUCCESS) {
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

	// convert config block json to binary or show error
	async createProto(config_block) {
		const c_opts = {
			cfxl_host: this.props.configtxlator_url,
			data: config_block,
			message_type: 'Block'
		};
		try {
			return await StitchApi.jsonToPb(c_opts);
		} catch (e) {
			const code = (e && !isNaN(e.status_code)) ? '(' + e.status_code + ') ' : '';
			const details = (e && typeof e.stitch_msg === 'string') ? (code + e.stitch_msg) : '';
			this.props.updateState(SCOPE, {
				block_error: 'Could not build genesis-block. Resolve error to continue: ' + details,
				joinOsnMap: {},
				count: 0,
				follower_count: 0,
			});
			return null;
		}
	}

	// store the block in the console db or show error
	async storeGenesisBlock(bin_block, nodes_arr, json_block) {
		try {
			await ConfigBlockApi.store({
				channel_id: _.get(json_block, 'data.data[0].payload.header.channel_header.channel_id'),
				b_block: bin_block,
				extra_consenter_data: nodes_arr,
				tx_id: _.get(json_block, 'data.data[0].payload.header.channel_header.tx_id'),
			});
			return true;
		} catch (e) {
			const code = (e && !isNaN(e.statusCode)) ? '(' + e.statusCode + ') ' : '';
			const details = (e && typeof e.msg === 'string') ? (code + e.msg) : '';

			this.props.updateState(SCOPE, {
				block_error: 'Could not store genesis-block. Resolve error to continue: ' + details,
				joinOsnMap: {},
				count: 0,
				follower_count: 0,
			});
			return null;
		}
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
			const code = (e && !isNaN(e.status_code)) ? '(' + e.status_code + ') ' : '';
			const details = (e && typeof e.stitch_msg === 'string') ? (code + e.stitch_msg) : '';
			this.props.updateState(SCOPE, {
				block_error: 'Could not parse genesis-block. Resolve error to continue: ' + details,
				joinOsnMap: {},
				count: 0,
				follower_count: 0,
			});
			return null;
		}
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
}

const dataProps = {
	consenters: PropTypes.array,
	use_osnadmin: PropTypes.bool,
	osnjoinSubmit: PropTypes.bool,
	joinOsnMap: PropTypes.Object,
	channel_id: PropTypes.string,
	count: PropTypes.number,
	raftNodes: PropTypes.object,
	select_followers_toggle: PropTypes.bool,
	follower_count: PropTypes.number,
	configtxlator_url: PropTypes.string,
	block_error: PropTypes.string,
	use_config_block: PropTypes.object,
	b_genesis_block: PropTypes.blob,
	block_stored_resp: PropTypes.object,
};

OSNJoin.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
	}
)(withLocalize(OSNJoin));
