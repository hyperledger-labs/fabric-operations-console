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
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { SkeletonPlaceholder } from 'carbon-components-react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import Helper from '../../utils/helper';
import Form from '../Form/Form';
import SidePanel from '../SidePanel/SidePanel';

const SCOPE = 'ChannelParticipationModal';

class ChannelParticipationModal extends Component {

	renderCPDetails = () => {
		let nodesArray = [];
		if (this.props.channelInfo.nodes !== undefined)
			nodesArray = Object.values(this.props.channelInfo.nodes).filter(node => {
				return node && node._channel_resp && node._channel_resp.consensusRelation !== undefined;
			});
		const fields = [
			{
				name: 'nodes',
				default:
					nodesArray.map((val, idx) =>
						<div key={idx}>
							<p>{val.name} ({val && val._channel_resp ? val._channel_resp.consensusRelation : ''})</p>
						</div>
					)
				,
				readonly: true,
				type: 'component',
				tooltip: 'register_user_type_tooltip',
				tooltipDirection: 'bottom',
			},
			{
				name: 'block_height',
				default: this.props.channelInfo.height,
				readonly: true,
				tooltip: 'register_user_affiliation_tooltip',
			},
			{
				name: 'status',
				default: this.props.channelInfo.status,
				readonly: true,
				tooltip: 'add_user_max_enrollment_tooltip',
			},
		];
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
						<div className="ibp-modal-title">
							<h1 className="ibm-light">{this.props.channelInfo.name}</h1>
						</div>
						<div>
							<Form scope={SCOPE}
								id={SCOPE}
								fields={fields}
							/>
						</div>
					</div>
				)}
			</div>
		);
	}

	render() {
		const translate = this.props.t;
		return (
			<SidePanel
				id="ChannelParticipationModal"
				closed={this.props.onClose}
				buttons={[
					{
						id: 'close',
						text: translate('close'),
						onClick: this.props.onClose,
					}
				]}
				error={this.props.error}
			>
				{this.props.channelInfo && this.renderCPDetails()}
			</SidePanel>
		);
	}
}

const dataProps = {
	details: PropTypes.object,
	channelInfo: PropTypes.object,
	error: PropTypes.string,
};

ChannelParticipationModal.propTypes = {
	...dataProps,
	onClose: PropTypes.func,
	t: PropTypes.func,
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	}
)(withTranslation()(ChannelParticipationModal));
