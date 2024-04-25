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
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { updateState } from '../../../../redux/commonActions';
import Helper from '../../../../utils/helper';
import Form from '../../../Form/Form';
import ImportantBox from '../../../ImportantBox/ImportantBox';

const SCOPE = 'channelModal';

// This is step "capabilities"
//
// this panel allow selecting what Fabric application and/or orderer capabilities to set for the channel
class Capabilities extends Component {
	calculateCapabilityWarning(data) {
		let applicationCapability = data.selectedApplicationCapability || this.props.selectedApplicationCapability;
		let ordererCapability = data.selectedOrdererCapability || this.props.selectedOrdererCapability;
		let channelCapability = data.selectedChannelCapability || this.props.selectedChannelCapability;

		const applicationCapabilityFormatted = _.get(applicationCapability, 'id', '');
		const ordererCapabilityFormatted = _.get(ordererCapability, 'id', '');
		const channelCapabilityFormatted = _.get(channelCapability, 'id', '');

		if (
			applicationCapabilityFormatted.indexOf('V2') === 0 ||
			ordererCapabilityFormatted.indexOf('V2') === 0 ||
			channelCapabilityFormatted.indexOf('V2') === 0
		) {
			// Block from proceeding if updating capability to 2.0 but node binaries are not at version 2.0
			const { channel_warning_20, channel_warning_20_details } = Helper.validateCapability20Update(
				applicationCapabilityFormatted,
				ordererCapabilityFormatted,
				channelCapabilityFormatted,
				this.props.channelPeers,
				this.props.selectedOrderer.raft
			);
			this.props.updateState(SCOPE, {
				channel_warning_20,
				channel_warning_20_details,
				nodeou_warning: this.props.orgs && this.props.orgs.some(x => x.node_ou !== true),
			});
		} else {
			this.props.updateState(SCOPE, {
				channel_warning_20: false,
				channel_warning_20_details: [],
				nodeou_warning: false,
			});
		}
	}

	// change the steps based on the selected "application" capability of a channel
	updateTimelineSteps = (data) => {
		let updatedSteps = [];

		let applicationCapability = data.selectedApplicationCapability || this.props.selectedApplicationCapability;
		const applicationCapabilityFormatted = _.get(applicationCapability, 'id', '');
		const isChannel2_0 = (applicationCapabilityFormatted.indexOf('V2') === 0);

		this.props.timelineSteps.forEach(group => {
			group.forEach(subGroup => {
				if (subGroup.groupTitle === 'advanced_configuration') {
					if (isChannel2_0) {
						subGroup.groupSteps.forEach(step => {
							if (step.label === 'channel_lifecycle_policy') {
								step.disabled = !isChannel2_0;
							} else if (step.label === 'channel_endorsement_policy') {
								step.disabled = !isChannel2_0;
							} else if (step.label === 'ordering_service_organization') {
								step.disabled = !this.props.isOrdererSignatureNeeded;
							}
						});
					} else {
						subGroup.groupSteps.forEach(step => {
							if (step.label === 'channel_lifecycle_policy') {
								step.disabled = true;
							} else if (step.label === 'channel_endorsement_policy') {
								step.disabled = true;
							} else if (step.label === 'ordering_service_organization') {
								step.disabled = true;
							}
						});
					}
				}
			});
			updatedSteps.push(group);
		});

		this.props.updateState(SCOPE, {
			timelineSteps: updatedSteps,
		});
	};

	render() {
		const {
			availableChannelCapabilities,
			availableOrdererCapabilities,
			availableApplicationCapabilities,
			selectedChannelCapability,
			selectedApplicationCapability,
			selectedOrdererCapability,
			isChannelUpdate,
			translate,
		} = this.props;
		const use_default = {
			name: translate('use_default'),
			id: 'use_default',
		};
		return (
			<div className="ibp-channel-capabilities">
				<p className="ibp-channel-section-title">{translate('capabilities')}</p>
				<p className="ibp-channel-section-desc ibp-channel-capabilities-multi-desc"> {translate('channel_capabilities_desc')} </p>
				<ImportantBox text="update_channel_capabilities_important_box"
					kind="informational"
				/>
				<div className="ibp-capabilities">
					<div className="ibp-capabilities-application">
						<Form
							scope={SCOPE}
							id={SCOPE + '-capabilities-application'}
							fields={[
								{
									name: 'selectedApplicationCapability',
									label: 'application_capability',
									type: 'dropdown',
									tooltip: 'application_capability_tooltip',
									options: isChannelUpdate ? availableApplicationCapabilities : [use_default, ...availableApplicationCapabilities],
									default: selectedApplicationCapability ? selectedApplicationCapability : 'use_default',
								},
							]}
							onChange={data => {
								this.calculateCapabilityWarning(data);
								this.updateTimelineSteps(data);
							}}
						/>
					</div>
					<div className="ibp-capabilities-orderer">
						<Form
							scope={SCOPE}
							id={SCOPE + '-capabilities-orderer'}
							fields={[
								{
									name: 'selectedOrdererCapability',
									label: 'orderer_capability',
									type: 'dropdown',
									tooltip: 'orderer_capability_tooltip',
									options: isChannelUpdate ? availableOrdererCapabilities : [use_default, ...availableOrdererCapabilities],
									default: selectedOrdererCapability ? selectedOrdererCapability : 'use_default',
								},
							]}
							onChange={data => {
								this.calculateCapabilityWarning(data);
							}}
						/>
					</div>
					{isChannelUpdate && (
						<div className="ibp-capabilities-channel">
							<Form
								scope={SCOPE}
								id={SCOPE + '-capabilities-channel'}
								fields={[
									{
										name: 'selectedChannelCapability',
										label: 'channel_capability',
										type: 'dropdown',
										tooltip: 'channel_capability_tooltip',
										options: isChannelUpdate ? availableChannelCapabilities : [use_default, ...availableChannelCapabilities],
										default: selectedChannelCapability ? selectedChannelCapability : 'use_default',
									},
								]}
								onChange={data => {
									this.calculateCapabilityWarning(data);
								}}
							/>
						</div>
					)}
				</div>
				{this.props.channel_warning_20 && (
					<>
						{!!this.props.channel_warning_20_details &&
							this.props.channel_warning_20_details.map((x, i) => {
								return (
									<div key={'channel_warning_' + i}>
										<ImportantBox
											text={translate(x.nodes.length === 1 ? `channel_warning_20_single_${x.type}` : `channel_warning_20_multi_${x.type}`, {
												nodes: x.nodes.map(node => node.name).join(', '),
											})}
										/>
									</div>
								);
							})}
					</>
				)}
				{this.props.nodeou_warning && (
					<div>
						<ImportantBox
							text={translate('channel_nodeou_warning', {
								msps: this.props.orgs.filter(x => x.node_ou !== true).map(x => x.msp),
							})}
						/>
					</div>
				)}
			</div>
		);
	}
}

const dataProps = {
	availableChannelCapabilities: PropTypes.array,
	availableApplicationCapabilities: PropTypes.array,
	availableOrdererCapabilities: PropTypes.array,
	selectedApplicationCapability: PropTypes.object,
	selectedChannelCapability: PropTypes.object,
	selectedOrdererCapability: PropTypes.object,
	selectedOrderer: PropTypes.any,
	channel_warning_20: PropTypes.bool,
	channel_warning_20_details: PropTypes.array,
	isChannelUpdate: PropTypes.bool,
	channelPeers: PropTypes.array,
	nodeou_warning: PropTypes.bool,
	orgs: PropTypes.array,
	timelineSteps: PropTypes.array,
};

Capabilities.propTypes = {
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
)(withLocalize(Capabilities));
