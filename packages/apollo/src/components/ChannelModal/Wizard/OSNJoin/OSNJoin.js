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
import { Checkbox } from 'carbon-components-react';
import PropTypes, { node } from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { updateState } from '../../../../redux/commonActions';
import Helper from '../../../../utils/helper';
import Form from '../../../Form/Form';
import StitchApi from '../../../../rest/StitchApi';
import SVGs from '../../../Svgs/Svgs';

const SCOPE = 'channelModal';

// This is step "osn_join_channel"
//
// panel allows the user to fire the join-channel api (which uses the osn admin endpoint on an orderer node)
class OSNJoin extends Component {
	componentDidMount() {
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
			nodeMap = this.organize_osns(options.consenters);
			console.log('dsh99 nodeMap:', nodeMap);

			this.props.updateState(SCOPE, {
				config_block_options: options,
				nodeMap: nodeMap,			// dsh todo rename this
				test: 1,
			});
		}
	}

	// organize all nodes by msp id
	organize_osns = (nodes_arr) => {
		const ret = {};

		// dsh todo remove this test
		ret['testingOrg'] = {
			nodes: [],
			msp_id: 'testingOrg',
			identity: null,
			selected: true,
		};

		for (let i in nodes_arr) {
			const node = nodes_arr[i];
			const msp_id = nodes_arr[i].msp_id;
			if (!ret[msp_id]) {
				ret[msp_id] = {
					nodes: [],
					msp_id: msp_id,
					identity: null,
					selected: true,
				};
			}
			const clone = JSON.parse(JSON.stringify(node));
			clone._status = '';				// either empty, or "pending", or "failed", or "success"
			ret[msp_id].nodes.push(clone);

			// dsh todo remove this testing stuff
			const clone2 = JSON.parse(JSON.stringify(clone));
			clone2._consenter = false;
			ret['testingOrg'].nodes.push(clone2);
			ret['testingOrg'].nodes.push(clone2);
		}

		return ret;
	}

	// select or unselect the org
	toggleOrg = (msp_id, evt) => {
		console.log('dsh99 clicked toggleOrg', msp_id, evt);
		let { nodeMap, test } = this.props;
		if (nodeMap && nodeMap[msp_id]) {
			nodeMap[msp_id].selected = !nodeMap[msp_id].selected;
			console.log('dsh99 toggleOrg nodeMap', test, nodeMap);
			this.props.updateState(SCOPE, {
				nodeMap: nodeMap,
				test: ++test,
			});
			//this.forceUpdate();
		}
	}

	changeIdentity = (evt) => {
		console.log('dsh99 clicked changeIdentity', evt);
	}

	// main render
	render() {
		const {
			translate,
			nodeMap,
			config_block_options,
			test,
		} = this.props;
		console.log('dsh99 OSNJoin rendering', nodeMap, config_block_options);
		/*let nodeMap = {};

		console.log('dsh99 rendering the osn join step',);
		const options = buildCreateChannelOpts();

		// double check for osnadmin... probably not needed
		if (use_osnadmin) {
			console.log('dsh99 options: ', options);
			const my_block = StitchApi.buildGenesisBlockOSNadmin(options);
			console.log('dsh99 new block: ', my_block);
			nodeMap = this.organize_osns(options.consenters);
			console.log('dsh99 nodeMap:', nodeMap);
		}*/

		return (
			<div className="ibp-channel-osn-join">
				<p className="ibp-join-osn-section-title">{translate('osn_join_channel')}{test}</p>
				<br />
				<p className="ibp-join-osn-genesis ibp-channel-section-desc">
					The genesis block for &quot;{config_block_options ? config_block_options.channel_id : '-'}&quot; was created.

					<a href="#"
						className="ibp-join-download"
					>
						Download Genesis
					</a>
				</p>

				<p className="ibp-join-osn-desc">
					{translate('osn-join-desc')}
				</p>

				<div>
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
		const unselectedClass = (org.selected === true) ? '' : 'ibp-join-unselected-org';
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
					/>

					<label name={'joinOrg' + org.msp_id}
						className="ibp-join-osn-mspid-wrap"
					>
						<div className="ibp-join-osn-label">MSP Id</div>
						<div className="ibp-join-osn-mspid">{org.msp_id}</div>
					</label>
					<Form
						scope={SCOPE}
						id={SCOPE + '-join-org-' + org.msp_id}
						className="ibp-join-osn-identity-wrap"
						fields={[
							{
								name: 'selectedConsenter',
								label: 'transaction_identity',
								type: 'dropdown',
								options: [],
								default: 'signature_for_join_msp_placeholder',
							},
						]}
						onChange={this.changeIdentity}
					/>
				</div>
				<div>{this.renderNodesSection(org.nodes)}</div>
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

	renderConsenterIcon(is_consenter) {
		const icon = (is_consenter === true) ? '★' : '☆';
		const iconTitle = (is_consenter === true) ? 'Node is a consenter' : 'Node is a follower';
		return (
			<span className="ibp-join-osn-icon"
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
	test: PropTypes.number,
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
