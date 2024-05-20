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

import { Checkbox } from 'carbon-components-react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { updateState } from '../../../../redux/commonActions';
import Helper from '../../../../utils/helper';
import ImportantBox from '../../../ImportantBox/ImportantBox';
import TranslateLink from '../../../TranslateLink/TranslateLink';

const SCOPE = 'channelModal';

// This is step "prerequisites"
//
// this panel allow selecting if advanced Fabric options in a channel config block are editable from the defaults or not
class Prerequisites extends Component {
	onChangeAdvancedCheckbox = event => {
		this.updateTimelineSteps(event);
		const populateAvailableConsenters = event.target.checked && this.props.selectedOrderer && _.isEmpty(this.props.raftNodes);
		if (populateAvailableConsenters) {
			this.props.getOrderingServiceDetails();
		}
	};

	// change the steps based on if the advanced option is checked
	updateTimelineSteps = event => {
		let updatedSteps = [];
		this.props.timelineSteps.forEach(group => {
			group.forEach(subGroup => {
				if (subGroup.groupTitle === 'advanced_configuration') {
					if (event.target.checked) {
						subGroup.groupSteps.forEach(step => {
							if (step.label === 'capabilities') {
								step.disabled = false;
							} else if (step.label === 'channel_lifecycle_policy') {
								step.disabled = !this.props.isChannel2_0;
							} else if (step.label === 'channel_endorsement_policy') {
								step.disabled = !this.props.isChannel2_0;
							} else if (step.label === 'ordering_service_organization') {
								step.disabled = !this.props.isOrdererSignatureNeeded;
							} else if (step.label === 'block_cutting_params') {
								step.disabled = false;
							} else if (step.label === 'channel_acls') {
								step.disabled = false;
							}
						});
					} else {
						subGroup.groupSteps.forEach(step => {
							if (step.label === 'capabilities') {
								step.disabled = true;
							} else if (step.label === 'channel_lifecycle_policy') {
								step.disabled = true;
							} else if (step.label === 'channel_endorsement_policy') {
								step.disabled = true;
							} else if (step.label === 'ordering_service_organization') {
								step.disabled = true;
							} else if (step.label === 'block_cutting_params') {
								step.disabled = true;
							} else if (step.label === 'channel_acls') {
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
			advanced: event.target.checked,
		});
	};

	renderBullet = (translate, key) => {
		return (
			<li className="ibp-prerequisites-bullet">
				<div className="ibp-prerequisites-bullet-point">-</div>
				<div className="ibp-prerequisites-bullet-text">
					<span>{translate(key)}</span>
				</div>
			</li>
		);
	};

	render() {
		const { advanced, t: translate } = this.props;
		return (
			<div className="ibp-channel-prerequisites">
				<p className="ibp-channel-section-title">{translate('prerequisites')}</p>
				<TranslateLink text="prerequisites_para1"
					className="ibp-channel-section-desc-with-link"
				/>
				<TranslateLink text="prerequisites_para1.5"
					className="ibp-channel-section-desc-with-link"
				/>
				<p id="prerequisites_para2"
					className="ibp-channel-prerequisites-desc"
				>
					{translate('prerequisites_para2')}
				</p>
				<ul className="ibp-channel-prerequisites-bullets"
					aria-labelledby="prerequisites_para2"
				>
					{this.renderBullet(translate, 'prerequisites_bullet1')}
				</ul>
				<div className="ibp-prerequisites-impbox">
					<ImportantBox kind="informational"
						text="prerequisites_impbox"
					/>
				</div>
				<hr />
				<div className="ibp-advanced-checkbox">
					<Checkbox
						id={'advanced'}
						labelText={translate('advanced_config')}
						checked={advanced}
						onClick={event => {
							this.onChangeAdvancedCheckbox(event);
						}}
					/>
				</div>
				<p className="ibp-advanced-checkbox-desc">{translate('advanced_channel_config_desc')}</p>
			</div>
		);
	}
}

const dataProps = {
	advanced: PropTypes.bool,
	timelineSteps: PropTypes.array,
	isChannelUpdate: PropTypes.bool,
	raftNodes: PropTypes.array,
	selectedOrderer: PropTypes.any,
};

Prerequisites.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
	}
)(withTranslation()(Prerequisites));
