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
		let nodeMap = {};

		console.log('dsh99 rendering the osn join step',);
		const options = buildCreateChannelOpts();						// get all the input data together
		console.log('dsh99 options: ', options);

		// double check for osnadmin... probably not needed
		if (use_osnadmin) {
			const my_block = StitchApi.buildGenesisBlockOSNadmin(options);
			console.log('dsh99 new block: ', my_block);
			nodeMap = await this.organize_osns(options);
			console.log('dsh99 nodeMap:', nodeMap);
			this.setupDownloadGenesisLink(my_block, options.channel_id);
			this.props.updateState(SCOPE, {
				config_block_options: options,
				nodeMap: nodeMap,	// dsh todo rename this
				count: this.countOrgs(nodeMap),
				genesis_block: my_block,
			});
		}
		// dsh todo, the initial order should show selectable orgs first
	}

	// organize all nodes by msp id
	// dsh todo the nodes_arr var is only consenters right now, it should be all nodes!
	async organize_osns(wiz_opts) {
		const ret = {};
		const nodes_arr = wiz_opts.consenters;			// this field is named poorly, some entries in here are not consenters, but followers



		// dsh todo remove this test
		const testId = 'testingOrg';
		ret[testId] = {
			nodes: [],
			msp_id: testId,
			selected_identity: null,
			identities: await IdentityApi.getIdentitiesForMsp(findMsp(testId)),
			selected: true,
		};
		const zero_identities = !Array.isArray(ret[testId].identities) || ret[testId].identities.length === 0;
		if (zero_identities) {
			ret[testId].selected = false;
		}
		// ^^ dsh todo remove this test


		for (let i in nodes_arr) {
			const node = nodes_arr[i];
			const msp_id = nodes_arr[i].msp_id;
			if (!ret[msp_id]) {
				ret[msp_id] = {
					nodes: [],
					msp_id: msp_id,
					selected_identity: null,
					identities: await IdentityApi.getIdentitiesForMsp(findMsp(msp_id)),
					selected: true,
				};

				//dsh todo if there are zero identities add some text why in the disabled dropdown box
				//dsh todo auto select one of the identities
				const zero_identities = !Array.isArray(ret[msp_id].identities) || ret[msp_id].identities.length === 0;
				if (zero_identities) {
					ret[msp_id].selected = false;
				}
				for (let z in ret[msp_id].identities) {
					ret[msp_id].identities[z]._msp_id = msp_id;		// store msp id here so we can link it back up
				}
			}
			const clone = JSON.parse(JSON.stringify(node));
			clone._status = '';				// either empty, or "pending", or "failed", or "success"
			ret[msp_id].nodes.push(clone);

			// dsh todo remove this testing stuff
			const clone2 = JSON.parse(JSON.stringify(clone));
			clone2._consenter = false;
			ret[testId].nodes.push(clone2);
			ret[testId].nodes.push(clone2);
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

	// select or unselect the org
	toggleOrg = (msp_id, evt) => {
		console.log('dsh99 clicked toggleOrg', msp_id, evt);
		let { nodeMap } = this.props;
		if (nodeMap && nodeMap[msp_id]) {
			nodeMap[msp_id].selected = !nodeMap[msp_id].selected;
			this.props.updateState(SCOPE, {
				nodeMap: nodeMap,
				count: this.countOrgs(),
			});
			this.forceUpdate();						// dsh todo see if we can remove this, test if it re-renders nodes if you cannot select any orgs...
		}
	}

	// count the selected orderers
	countOrgs(prefNodeMap) {
		let { nodeMap } = this.props;
		let updateCount = 0;
		let useMap = prefNodeMap || nodeMap;		// use provided map if it exists

		for (let id in useMap) {
			if (useMap[id].selected === true) {
				updateCount += useMap[id].nodes.length;
			}
		}
		return updateCount;
	}

	// selected identity in dropdown was changed
	changeIdentity = (evt) => {
		let { nodeMap } = this.props;
		const msp_id = (evt && evt.selectedId) ? evt.selectedId._msp_id : null;
		if (msp_id) {
			if (nodeMap && nodeMap[msp_id]) {
				nodeMap[msp_id].selected_identity = evt.selectedId;
				this.props.updateState(SCOPE, {
					nodeMap: nodeMap,
				});
				console.log('dsh99 changeIdentity nodeMap', nodeMap);
			}
		}
	}

	// download genesis block as JSON - for debug and what not
	setupDownloadGenesisLink = (block, channel_name) => {
		let link = document.getElementById('ibp-download-genesis-link');
		if (link.download !== undefined) {
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
			nodeMap,
			config_block_options,
			count,
		} = this.props;
		console.log('dsh99 OSNJoin rendering', nodeMap, config_block_options);

		return (
			<div className="ibp-channel-osn-join">
				<p className="ibp-join-osn-section-title">
					{translate('osn_join_channel')}
					<span className="ibp-join-osn-count">({count || '0'} {translate('nodes_lc')})</span>
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
					{nodeMap && !_.isEmpty(Object.keys(nodeMap)) &&
						Object.values(nodeMap).map((org, i) => {
							console.log('dsh99 rendering org: ', i, org);
							return (this.renderOrgSection(org));
						})}
				</div>
			</div>
		);
	}

	// create the org section (this contains each node)
	renderOrgSection(org) {
		const { translate } = this.props;
		const unselectedClass = (org.selected === true) ? '' : 'ibp-join-unselected-org';
		const zero_identities = !Array.isArray(org.identities) || org.identities.length === 0;
		return (
			<div key={'org_' + org.msp_id}
				className={unselectedClass + ' ibp-join-osn-wrap'}
			>
				<div>
					<input type="checkbox"
						className="ibp-join-osn-org-check"
						checked={org.selected === true}
						name={'joinOrg' + org.msp_id}
						id={'joinOrg' + org.msp_id}
						onChange={event => {
							this.toggleOrg(org.msp_id, event);
						}}
						disabled={zero_identities}
					/>

					<label name={'joinOrg' + org.msp_id}
						className="ibp-join-osn-mspid-wrap"
					>
						<div className="ibp-join-osn-label">{translate('msp_id')}</div>
						<div className="ibp-join-osn-mspid">{org.msp_id}</div>
					</label>
					<Form
						scope={SCOPE}
						id={SCOPE + '-join-org-' + org.msp_id}
						className="ibp-join-osn-identity-wrap"
						fields={[
							{
								name: 'selectedId',
								label: 'transaction_identity',
								required: true,
								type: 'dropdown',
								options: org.identities,
								default: 'signature_for_join_msp_placeholder',
								disabled: org.selected !== true || zero_identities
							},
						]}
						onChange={this.changeIdentity}
					/>
				</div>
				<div>{org.selected === true && this.renderNodesSection(org.nodes)}</div>
			</div>
		);
	}

	// create the line for an orderer node
	renderNodesSection(nodes) {
		console.log('dsh99 rendering nodes: ', nodes);
		if (Array.isArray(nodes)) {
			return (nodes.map((node, i) => {
				return (
					<div className="ibp-join-osn-node-wrap"
						key={'node-wrap-' + i}
					>
						{this.renderConsenterIcon(node._consenter)}
						<span className="ibp-join-osn-node-details">
							<div className="ibp-join-osn-name">{node.name}</div>
							<div className="ibp-join-osn-host">{node.host}:{node.port}</div>
						</span>
						<span className="ibp-join-osn-status">
							{this.renderStatusIcon(node._status)}
						</span>
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
}

const dataProps = {
	consenters: PropTypes.array,
	use_osnadmin: PropTypes.bool,
	nodeMap: PropTypes.Object,
	config_block_options: PropTypes.Object,
	count: PropTypes.number,
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
