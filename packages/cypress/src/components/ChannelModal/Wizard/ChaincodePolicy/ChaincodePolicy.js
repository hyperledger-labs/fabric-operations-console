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
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import Helper from '../../../../utils/helper';
import { updateState } from '../../../../redux/commonActions';
import TranslateLink from '../../../TranslateLink/TranslateLink';
import Form from '../../../Form/Form';

const SCOPE = 'channelModal';

class ChaincodePolicy extends Component {
	render() {
		const { translate, policy, orgs, setType, setMembers, lifecycle_policy, endorsement_policy } = this.props;
		const members = policy === 'lifecycle_policy' ? lifecycle_policy.members : endorsement_policy.members;
		const max = members ? members.length : 1;
		const options = max > 0 ? [] : [''];
		for (let i = 1; i <= max; i++) {
			options.push(String(i));
		}
		const existingPolicyType = policy === 'lifecycle_policy' ? lifecycle_policy.type : endorsement_policy.type;
		const existingPolicyMembers = policy === 'lifecycle_policy' ? lifecycle_policy.members : endorsement_policy.members;
		const existingPolicyN = policy === 'lifecycle_policy' ? lifecycle_policy.n : endorsement_policy.n;
		const showSpecificOptions =
			policy === 'lifecycle_policy' ? lifecycle_policy && lifecycle_policy.type === 'SPECIFIC' : endorsement_policy && endorsement_policy.type === 'SPECIFIC';
		return (
			<div className="ibp-channel-capabilities">
				<p className="ibp-channel-section-title">{translate(policy === 'lifecycle_policy' ? 'channel_lifecycle_policy' : 'channel_endorsement_policy')}</p>
				<TranslateLink
					text={translate(policy === 'lifecycle_policy' ? 'lifecycle_policy_desc' : 'endorsement_policy_desc')}
					className="ibp-channel-section-desc-with-link"
				/>
				<div className="ibp-chaincode-policy">
					<Form
						scope={SCOPE + policy}
						id={SCOPE + policy}
						fields={[
							{
								name: 'policyType',
								label: `channel_${policy}`,
								tooltip: `${policy}_tooltip`,
								type: 'radio',
								required: true,
								default: existingPolicyType,
								options: [
									{
										id: 'MAJORITY',
										label: translate('chaincode_policy_majority'),
									},
									{
										id: 'ALL',
										label: translate('chaincode_policy_all'),
									},
									{
										id: 'ANY',
										label: translate('chaincode_policy_any'),
									},
									{
										id: 'SPECIFIC',
										label: translate('chaincode_policy_specific'),
									},
								],
							},
						]}
						onChange={data => {
							setType(data.policyType);
						}}
					/>
					{showSpecificOptions && !!options && (
						<div className="ibp-chaincode-policy-specific">
							<Form
								scope={SCOPE + policy}
								id={SCOPE + 'specific-policy'}
								fields={[
									{
										name: 'policyMembers',
										label: 'chaincode_policy_specific_label',
										type: 'multiselect2',
										options: orgs,
										placeholder: 'select_organizations',
										required: true,
										default: existingPolicyMembers,
									},
									{
										name: 'policyN',
										label: 'num_orgs_must_endorse',
										type: 'dropdown',
										required: true,
										default: existingPolicyN || '',
										options,
									},
								]}
								onChange={data => {
									if (!data.policyMembers || data.policyMembers.length === 0) {
										this.props.updateState(SCOPE + policy, {
											policyN: '',
										});
									}
									setMembers(data);
								}}
							/>
						</div>
					)}
				</div>
			</div>
		);
	}
}

const dataProps = {
	isChannelUpdate: PropTypes.bool,
	policyType: PropTypes.string,
	policyMembers: PropTypes.array,
	policyN: PropTypes.string,
	lifecycle_policy: PropTypes.object,
	endorsement_policy: PropTypes.object,
};

ChaincodePolicy.propTypes = {
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
)(withLocalize(ChaincodePolicy));
