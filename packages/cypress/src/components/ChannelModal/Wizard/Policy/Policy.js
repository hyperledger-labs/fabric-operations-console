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
import { withLocalize } from 'react-localize-redux';
import Form from '../../../Form/Form';

const SCOPE = 'channelModal';

class Policy extends Component {
	render() {
		const { memberCounts, orgs, customPolicy, customPolicyDefault, translate } = this.props;
		return (
			<div className="ibp-channel-policy">
				<p className="ibp-channel-section-title">{translate('channel_update_policy')}</p>
				<p className="ibp-channel-section-desc">{translate('channel_update_policy_desc')}</p>
				<div>
					{!!memberCounts && !!orgs && (
						<div className="ibp-channel-policy-dropdown">
							<Form
								scope={SCOPE}
								id={SCOPE + '-custom-policy'}
								fields={[
									{
										name: 'customPolicy',
										type: 'dropdown',
										required: true,
										tooltip: 'customPolicy_tooltip',
										options: memberCounts,
										disabled: !orgs || orgs.length === 0 || orgs.filter(org => org.roles.includes('admin')).length < 1,
										default: customPolicy ? customPolicy : customPolicyDefault,
									},
								]}
							/>
						</div>
					)}
				</div>
			</div>
		);
	}
}

const dataProps = {
	customPolicy: PropTypes.object,
	orgs: PropTypes.array,
	memberCounts: PropTypes.array,
	customPolicyDefault: PropTypes.object,
};

Policy.propTypes = {
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
)(withLocalize(Policy));
