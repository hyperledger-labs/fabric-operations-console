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
import Logger from '../../../Log/Logger';
import SidePanelWarning from '../../../SidePanelWarning/SidePanelWarning';
const SCOPE = 'channelModal';

const Log = new Logger(SCOPE);

// This is step "channel_details"
//
// panel stores allows the user to select the channel name and ordering cluster to use for a create channel
class Details extends Component {
	onChangeChannelDetails = value => {
		const { checkHealth, getOrderingServiceDetails } = this.props;
		if (value.channelName) {
			this.validateChannelName(value);
		} else if (value.selectedOrderer) {
			checkHealth(value.selectedOrderer);
			getOrderingServiceDetails(value.selectedOrderer);
		}
	};

	validateChannelName = value => {
		let channelName = value.channelName;
		let invalidCharacters = false;
		let isEmpty = false;
		Log.debug('Validating channel name: ', channelName);
		if (channelName && channelName.trim() !== '') {
			// Restrictions from Orderer Code]   !!!!
			//1. Contain only lower case ASCII alphanumerics, dots '.', and dashes '-'
			//2. Are shorter than 250 characters.
			//3. Start with a letter
			if (/[^a-z\d-.]/g.test(channelName)) {
				//check for invalid characters
				invalidCharacters = true;
			}
			if (/[\d]/g.test(channelName[0])) {
				//first character cannot be a number
				invalidCharacters = true;
			}
			if (channelName === '.' || channelName === '..') {
				// Is not string "." or "..".
				invalidCharacters = true;
			}
			Log.debug('Channel name has invalid characters: ', invalidCharacters);
		} else {
			isEmpty = true;
			Log.debug('Channel name is empty');
		}

		if (invalidCharacters || isEmpty) {
			this.props.updateState(SCOPE, {
				channelNameError: invalidCharacters ? 'validation_channel_name_invalid' : 'channel_name_required',
			});
		} else {
			this.props.updateState(SCOPE, {
				channelNameError: null,
			});
		}
	};

	render() {
		const { channelOrderer, isChannelUpdate, checkingOrdererStatus, loadingConsenters, orderers, channelNameError, isOrdererUnavailable, translate } = this.props;
		const associatedOrdererNotFound = isChannelUpdate && !channelOrderer;
		const multipleOrderersAssociationsFound = isChannelUpdate && _.size(channelOrderer) > 1;
		const fields = [
			{
				name: 'channelName',
				default: this.props.channelName,
				label: 'channel_name',
				placeholder: 'channel_name_placeholder',
				required: true,
				tooltip: 'channel_name_desc',
				disabled: isChannelUpdate ? true : false,
				specialRules: Helper.SPECIAL_RULES_CHANNEL_NAME,
				errorMsg: channelNameError,
			},
		];
		if (!isChannelUpdate || associatedOrdererNotFound || multipleOrderersAssociationsFound) {
			fields.push({
				name: 'selectedOrderer',
				default: this.props.selectedOrderer ? this.props.selectedOrderer : 'select_orderer',
				type: 'dropdown',
				required: true,
				tooltip: 'channel_orderer_desc',
				options: orderers,
				inlineLoading: checkingOrdererStatus || loadingConsenters,
			});
		}
		return (
			<div className="ibp-channel-details">
				<div className="ibp-channel-section">
					<p className="ibp-channel-section-title">{translate('channel_details')}</p>
					<p className="ibp-channel-section-desc">{translate('channel_details_desc')}</p>
					<div className="ibp-split-details">
						<div className="ibp-channel-name">
							<Form scope={SCOPE}
								id={SCOPE + '-details'}
								fields={fields}
								onChange={this.onChangeChannelDetails}
							/>
						</div>
					</div>
					{!channelOrderer && _.size(orderers) === 0 && (
						<div className="ibp-error-panel">
							<SidePanelWarning title="error_orderer_needed"
								subtitle="error_add_orderer_first"
							/>
						</div>
					)}
					{isOrdererUnavailable && (
						<div className="ibp-missing-definition-error">
							<SidePanelWarning title={translate('orderer_unavailable_title')}
								subtitle={translate('orderer_unavailable_desc')}
							/>
						</div>
					)}
				</div>
			</div>
		);
	}
}

const dataProps = {
	channelName: PropTypes.string,
	isChannelUpdate: PropTypes.bool,
	orderers: PropTypes.array,
	selectedOrderer: PropTypes.any,
	channelOrderer: PropTypes.array,
	channelNameError: PropTypes.string,
	isOrdererUnavailable: PropTypes.bool,
	checkingOrdererStatus: PropTypes.bool,
	loadingConsenters: PropTypes.bool,
	advanced: PropTypes.bool,
};

Details.propTypes = {
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
)(withLocalize(Details));
