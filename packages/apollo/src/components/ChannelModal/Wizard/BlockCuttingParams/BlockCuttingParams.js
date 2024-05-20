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

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import Helper from '../../../../utils/helper';
import { updateState } from '../../../../redux/commonActions';
import { withTranslation } from 'react-i18next';
import TranslateLink from '../../../TranslateLink/TranslateLink';
import * as constants from '../../../../utils/constants';
import { Checkbox } from 'carbon-components-react';
import parse from 'parse-duration';
import Form from '../../../Form/Form';

const bytes = require('bytes');
const SCOPE = 'channelModal';

// This is step "block_cutting_params"
//
// this panel allow configuring the ordering service block cutting parameters for a channel
class BlockCuttingParams extends Component {
	onChangeOverrideDefaults = event => {
		this.props.updateState(SCOPE, {
			overrideDefaults: event.target.checked,
			absolute_max_bytes: bytes(constants.ABSOLUTE_MAX_BYTES_DEFAULT),
			max_message_count: constants.MAX_MESSAGE_COUNT_DEFAULT,
			preferred_max_bytes: bytes(constants.PREFERRED_MAX_BYTES_DEFAULT),
			timeout: constants.TIMEOUT_DEFAULT,
		});
	};

	render() {
		const { isChannelUpdate, overrideDefaults, updateState, absolute_max_bytes, max_message_count, preferred_max_bytes, timeout, t: translate } = this.props;
		return (
			<div className="ibp-block-cutting-params">
				<p className="ibp-channel-section-title">{translate('block_cutting_params')}</p>
				<TranslateLink text="block_cutting_params_desc"
					className="ibp-channel-section-desc-with-link"
				/>
				{!isChannelUpdate && (
					<div className="ibp-override-defaults-checkbox">
						<Checkbox
							id={'override-defaults'}
							labelText={translate('override_defaults')}
							checked={overrideDefaults}
							onClick={event => {
								this.onChangeOverrideDefaults(event);
							}}
						/>
					</div>
				)}
				{(isChannelUpdate || overrideDefaults) && (
					<Form
						scope={SCOPE}
						id={SCOPE + '-block-params'}
						onChange={data => {
							if (data.absolute_max_bytes_mb !== undefined) {
								// convert from MB to bytes
								updateState(SCOPE, {
									absolute_max_bytes: Math.floor(data.absolute_max_bytes_mb * 1024 * 1024),
								});
							}
							if (data.timeout_ms !== undefined) {
								updateState(SCOPE, {
									timeout: data.timeout_ms + 'ms',
								});
							}
						}}
						fields={[
							{
								name: 'absolute_max_bytes_mb',
								label: 'absolute_max_bytes',
								placeholder: 'absolute_max_bytes_placeholder',
								tooltip: 'absolute_max_bytes_tooltip',
								tooltipOptions: { absolute_max_bytes_max: constants.ABSOLUTE_MAX_BYTES_MAX },
								default: absolute_max_bytes ? Math.floor(absolute_max_bytes / (1024 * 1024)) : bytes(constants.ABSOLUTE_MAX_BYTES_DEFAULT),
								type: 'slider',
								min: 0.01,
								max: bytes(constants.ABSOLUTE_MAX_BYTES_MAX) / (1024 * 1024),
								step: 0.01,
								unit: translate('megabyte'),
							},
							{
								name: 'max_message_count',
								placeholder: 'max_message_count_placeholder',
								tooltip: 'max_message_count_tooltip',
								tooltipOptions: { max_message_count_min: constants.MAX_MESSAGE_COUNT_MIN, max_message_count_max: constants.MAX_MESSAGE_COUNT_MAX },
								default: max_message_count ? max_message_count : constants.MAX_MESSAGE_COUNT_DEFAULT,
								type: 'slider',
								min: constants.MAX_MESSAGE_COUNT_MIN,
								max: constants.MAX_MESSAGE_COUNT_MAX,
							},
							{
								name: 'preferred_max_bytes',
								placeholder: 'preferred_max_bytes_placeholder',
								tooltip: 'preferred_max_bytes_tooltip',
								validate: this.validatePreferredMaxBytes,
								default: preferred_max_bytes ? preferred_max_bytes : bytes(constants.PREFERRED_MAX_BYTES_DEFAULT),
								type: 'slider',
								min: bytes(constants.PREFERRED_MAX_BYTES_MIN),
								max: bytes(constants.PREFERRED_MAX_BYTES_MAX),
							},
							{
								name: 'timeout_ms',
								label: 'timeout',
								placeholder: 'timeout_placeholder',
								tooltip: 'timeout_tooltip',
								tooltipOptions: { timeout_min: constants.TIMEOUT_MIN, timeout_max: constants.TIMEOUT_MAX },
								default: timeout ? parse(timeout) : parse(constants.TIMEOUT_DEFAULT),
								type: 'slider',
								min: parse(constants.TIMEOUT_MIN),
								max: parse(constants.TIMEOUT_MAX),
								unit: translate('millisecond'),
							},
						]}
					/>
				)}
			</div>
		);
	}
}

const dataProps = {
	existingBlockParams: PropTypes.object,
	absolute_max_bytes: PropTypes.number,
	max_message_count: PropTypes.number,
	preferred_max_bytes: PropTypes.number,
	timeout: PropTypes.string,
	overrideDefaults: PropTypes.bool,
	isChannelUpdate: PropTypes.bool,
};

BlockCuttingParams.propTypes = {
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
)(withTranslation()(BlockCuttingParams));
