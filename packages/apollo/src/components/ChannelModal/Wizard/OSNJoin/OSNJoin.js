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
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { updateState } from '../../../../redux/commonActions';
import Helper from '../../../../utils/helper';
import Form from '../../../Form/Form';
import StitchApi from '../../../../rest/StitchApi';
import SVGs from '../../../Svgs/Svgs';
import IdentityApi from '../../../../rest/IdentityApi';

const SCOPE = 'channelModal';

// This is step "osn_join_channel"
//
// panel allows the user to fire the join-channel api (which uses the osn admin endpoint on an orderer node)
class OSNJoin extends Component {
	async componentDidMount() {
		console.log('dsh99 OSNJoin mounted');

		const {
			use_osnadmin,
			buildCreateChannelOpts,
		} = this.props;
		let joinOsnMap = {};

		console.log('dsh99 rendering the osn join step',);
		const options = buildCreateChannelOpts();						// get all the input data together
		console.log('dsh99 options: ', options);

		// double check for osnadmin... probably not needed
		if (use_osnadmin) {
			const my_block = StitchApi.buildGenesisBlockOSNadmin(options);
			console.log('dsh99 new block: ', my_block);
			joinOsnMap = await this.organize_osns(options);
			console.log('dsh99 joinOsnMap:', joinOsnMap);
			this.setupDownloadGenesisLink(my_block, options.channel_id);
			this.props.updateState(SCOPE, {
				config_block_options: options,
				joinOsnMap: joinOsnMap,	// dsh todo rename this
				count: this.countOrgs(joinOsnMap),
				genesis_block: my_block,
			});
		}
		// dsh todo store the genesis block and send to other consoles if needed...
		// dsh todo, the initial order should show selectable orgs first

		// dsh todo is this doing anything?
		this.props.updateState(SCOPE, {
			joinOsnWarning: !this.props.joinOsnWarning,
		});
	}

	// dsh todo dropdown to add followers

	// organize all nodes by their orderer cluster aka ordering service
	// dsh todo the nodes_arr var is only consenters right now, it should be all nodes!
	async organize_osns(wiz_opts) {
		const ret = {};
		const nodes_arr = wiz_opts.consenters;			// this field is named poorly, some entries in here are not consenters, but followers



		// dsh todo remove this test
		const testClusterId = 'testingCluster';
		const testMspId = 'testingOrg';
		ret[testClusterId] = {
			nodes: [],
			msp_id: testMspId,
			cluster_name: 'My Test Cluster',
			cluster_id: testClusterId,
			selected_identity: null,
			default_identity: null,
			identities: await IdentityApi.getIdentitiesForMsp(findMsp(testMspId)),
			associated_identities: await IdentityApi.getAssociatedOrdererIdentities({
				cluster_id: testClusterId,
				msp_id: testMspId,
			}),
			selected: true,
		};
		ret[testClusterId].default_identity = this.pickDefaultIdentity(ret[testClusterId]);
		const zero_identities = (ret[testClusterId].default_identity === null);
		if (zero_identities) {
			ret[testClusterId].selected = false;
		}
		// ^^ dsh todo remove this test


		for (let i in nodes_arr) {
			const node = nodes_arr[i];
			const cluster_id = nodes_arr[i]._cluster_id;
			if (!ret[cluster_id]) {
				ret[cluster_id] = {
					nodes: [],
					msp_id: nodes_arr[i].msp_id,
					cluster_name: nodes_arr[i]._cluster_name,
					cluster_id: nodes_arr[i]._cluster_id,

					// currently selected identity
					selected_identity: null,

					// the identity we think they should use - populated next
					default_identity: null,

					// all identities from msp
					identities: await IdentityApi.getIdentitiesForMsp(findMsp(nodes_arr[i].msp_id)),

					// identities associated with this orderer cluster
					associated_identities: await IdentityApi.getAssociatedOrdererIdentities({
						cluster_id: cluster_id,
						msp_id: nodes_arr[i].msp_id,
					}),

					// if this cluster or orderer nodes is selected to join the channel - defaults true
					selected: true,
				};

				//dsh todo if there are zero identities add some text why in the disabled dropdown box
				//dsh todo auto select one of the identities
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
			const clone = JSON.parse(JSON.stringify(node));
			clone._status = '';				// either empty, or "pending", or "failed", or "success"
			clone._error = '';				// either empty or a error message (string)
			ret[cluster_id].nodes.push(clone);

			// dsh todo remove this testing stuff
			const clone2 = JSON.parse(JSON.stringify(clone));
			clone2._consenter = false;
			ret[testClusterId].nodes.push(clone2);
		}

		// remove msps with no nodes (b/c there is nothing to join)
		for (let mspId in ret) {
			if (!Array.isArray(ret[mspId].nodes) || ret[mspId].nodes.length === 0) {
				delete ret[mspId];
			}
		}

		return ret;

		// from the msp id find the MSP object from the wizard input options
		function findMsp(msp_id) {
			for (let mspId in wiz_opts.application_msps) {
				if (msp_id === mspId) {
					return wiz_opts.application_msps[mspId];
				}
			}
			for (let i in wiz_opts.orderer_msps) {
				if (msp_id === wiz_opts.orderer_msps[i].msp_id) {
					return wiz_opts.orderer_msps[i];
				}
			}
			console.log('dsh99 did not find msp', msp_id);
			return null;
		}
	}

	// select or unselect the cluster
	toggleCluster = (cluster_id, evt) => {
		console.log('dsh99 clicked toggleCluster', cluster_id, evt);
		let { joinOsnMap } = this.props;
		if (joinOsnMap && joinOsnMap[cluster_id]) {
			joinOsnMap[cluster_id].selected = !joinOsnMap[cluster_id].selected;
			this.props.updateState(SCOPE, {
				joinOsnMap: joinOsnMap,
				count: this.countOrgs(),
			});
			this.forceUpdate();						// dsh todo see if we can remove this, test if it re-renders nodes if you cannot select any orgs...
		}
	}

	// count the selected orderers
	countOrgs(prefNodeMap) {
		let { joinOsnMap } = this.props;
		let updateCount = 0;
		let useMap = prefNodeMap || joinOsnMap;		// use provided map if it exists

		for (let id in useMap) {
			if (useMap[id].selected === true) {
				updateCount += useMap[id].nodes.length;
			}
		}
		return updateCount;
	}

	// selected identity in dropdown was changed
	changeIdentity = (evt) => {
		let { joinOsnMap, joinOsnWarning } = this.props;
		console.log('dsh99 changeIdentity fired', evt);
		const keys = Object.keys(evt);
		const fieldName = keys ? keys[0] : null;			// the first key is the dropdown's unique id/name

		const cluster_id = (fieldName && evt && evt[fieldName]) ? evt[fieldName]._cluster_id : null;
		if (cluster_id) {
			if (joinOsnMap && joinOsnMap[cluster_id]) {
				joinOsnMap[cluster_id].selected_identity = evt[fieldName];
				this.props.updateState(SCOPE, {
					joinOsnMap: joinOsnMap,
					joinOsnWarning: !joinOsnWarning,
				});
				console.log('dsh99 changeIdentity joinOsnMap', joinOsnMap);
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

	// main render
	render() {
		const {
			translate,
			joinOsnMap,
			config_block_options,
			count,
			test_hook,
		} = this.props;
		console.log('dsh99 OSNJoin rendering', joinOsnMap, config_block_options);
		return (
			<div className="ibp-channel-osn-join">
				<p className="ibp-join-osn-section-title">
					{translate('osn_join_channel')}
					<span className="ibp-join-osn-count">({count || '0'} {translate('nodes_lc')}) {test_hook}</span>
				</p>
				<br />
				<p className="ibp-join-osn-genesis ibp-channel-section-desc">
					The genesis block for &quot;{config_block_options ? config_block_options.channel_id : '-'}&quot; was created.

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

				<div className="ibp-join-osn-msp-wrap">
					{joinOsnMap && !_.isEmpty(Object.keys(joinOsnMap)) &&
						Object.values(joinOsnMap).map((cluster, i) => {
							console.log('dsh99 rendering cluster: ', i, cluster);
							return (this.renderClusterSection(cluster));
						})}
				</div>
			</div>
		);
	}

	// create the cluster section (this contains each node)
	renderClusterSection(cluster) {
		const { translate } = this.props;
		const unselectedClass = (cluster.selected === true) ? '' : 'ibp-join-unselected-cluster';		// dsh todo remove me if it looks okay
		const zero_identities = (cluster.default_identity === null);
		console.log('dsh99 rendering cluster', cluster.cluster_id, cluster.default_identity, cluster.identities);
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
						<div className="ibp-join-osn-label">{translate('cluster')}</div>
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
				<div>{cluster.selected === true && this.renderNodesSection(cluster.nodes)}</div>
			</div >
		);
	}

	// create the line for an orderer node
	renderNodesSection(nodes) {
		console.log('dsh99 rendering nodes: ', nodes);
		if (Array.isArray(nodes)) {
			return (nodes.map((node, i) => {
				return (
					<div className="ibp-join-osn-node-wrap-wrap"
						key={'node-wrap-' + i}
					>
						<div className="ibp-join-osn-node-wrap">
							{this.renderConsenterIcon(node._consenter)}
							<span className="ibp-join-osn-node-details">
								<div className="ibp-join-osn-name">{node.name}</div>
								<div className="ibp-join-osn-host">{node.host}:{node.port}</div>
							</span>
							<span className="ibp-join-osn-status">
								{this.renderStatusIcon(node._status)}
							</span>
						</div>
						<div className="ibp-join-osn-error">{node._error}</div>
					</div>
				);
			}));
		}
	}

	// render the icon for the node
	renderStatusIcon(status_str) {
		const width = '20px';
		const height = '20px';
		if (status_str === 'pending') {			// dsh todo animate
			return (
				<SVGs type={'clockIcon'}
					width={width}
					height={height}
				/>
			);
		}
		if (status_str === 'success') {
			return (
				<SVGs type={'stepperCurrent'}
					width={width}
					height={height}
				/>
			);
		}
		if (status_str === 'failed') {
			return (
				<SVGs type={'error'}
					width={width}
					height={height}
				/>
			);
		}

		return (
			<SVGs type={'stepperIncomplete'}
				width={width}
				height={height}
			/>
		);
	}

	// create an icon of sorts to indicate if its a follower or consenter
	renderConsenterIcon(is_consenter) {
		const iconColor = (is_consenter === true) ? 'ibp-osn-join-icon-consenter' : 'ibp-osn-join-icon-follower';
		const icon = (is_consenter === true) ? '★' : '☆';
		const iconTitle = (is_consenter === true) ? 'Node is a consenter' : 'Node is a follower';
		return (
			<span className={'ibp-join-osn-icon ' + iconColor}
				title={iconTitle}
			>
				{icon}
			</span>);
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
}

const dataProps = {
	consenters: PropTypes.array,
	use_osnadmin: PropTypes.bool,
	osnadmin_feats_enabled: PropTypes.bool,
	joinOsnMap: PropTypes.Object,
	joinOsnWarning: PropTypes.bool,
	config_block_options: PropTypes.Object,
	count: PropTypes.number,
	test_hook: PropTypes.string,
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
