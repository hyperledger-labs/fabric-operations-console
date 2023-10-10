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
import _ from 'lodash';

const SCOPE = 'channelModal';

// This is step "review_channel_info"
//
// panel shows summary of the selected settings during a channel-create OR channel-update
// edit review to show selected orderer orgs
class Review extends Component {
	render() {
		const {
			channelName,
			selectedOrderer,
			orgs,
			customPolicy,
			selectedChannelCreator,
			selectedIdentity,
			selectedApplicationCapability,
			selectedChannelCapability,
			selectedOrdererCapability,
			selectedOrdererMsp,
			absolute_max_bytes,
			max_message_count,
			preferred_max_bytes,
			timeout,
			snapshot_interval_size,
			consenters,
			orderer_orgs,
			acls,
			consenterUpdateCount,
			canModifyConsenters,
			isChannelUpdate,
			advanced,
			overrideDefaults,
			overrideRaftDefaults,
			isOrdererSignatureNeeded,
			isOrdererUnavailable,
			checkingOrdererStatus,
			channelNameError,
			noOperatorError,
			duplicateMSPError,
			missingDefinitionError,
			aclErrors,
			translate,
			invalid_consenter,
			use_default_consenters,
			lifecycle_policy,
			endorsement_policy,
			getDefaultCap,
			use_osnadmin,
			ordering_orgs,
		} = this.props;

		const showBlockParamSummary = isChannelUpdate || overrideDefaults || use_osnadmin;
		const showRaftParamSummary = isChannelUpdate || overrideRaftDefaults || use_osnadmin;
		const absolute_max_bytes_mb = absolute_max_bytes ? Math.floor(absolute_max_bytes / (1024 * 1024)) : '';
		const selectedAppCapability = _.has(selectedApplicationCapability, 'name') ? selectedApplicationCapability.value : selectedApplicationCapability;
		const ordererCapability = _.has(selectedOrdererCapability, 'name') ? selectedOrdererCapability.value : selectedOrdererCapability;
		const channelCapability = _.has(selectedChannelCapability, 'name') ? selectedChannelCapability.value : selectedChannelCapability;
		const lifecyclePolicy =
			lifecycle_policy.type === 'SPECIFIC'
				? translate('chaincode_specific_policy', { n: lifecycle_policy.n, members: lifecycle_policy.members })
				: lifecycle_policy.type || 'MAJORITY';
		const endorsementPolicy =
			endorsement_policy.type === 'SPECIFIC'
				? translate('chaincode_specific_policy', { n: endorsement_policy.n, members: endorsement_policy.members })
				: endorsement_policy.type || 'MAJORITY';

		const selected_ordering_orgs = (ordering_orgs && typeof ordering_orgs === 'object') ? Object.keys(ordering_orgs) : null;
		const using_default_app_cap = !selectedAppCapability || selectedAppCapability === 'use_default';
		const using_default_ord_cap = !ordererCapability || ordererCapability === 'use_default';
		const using_default_ch_cap = !channelCapability || channelCapability === 'use_default';
		const using_app_cap = Helper.prettyPrintPolicy(using_default_app_cap ? getDefaultCap('application') : selectedAppCapability);
		const using_2_plus_app_cap = typeof using_app_cap === 'string' && using_app_cap.startsWith('v2.');

		const using_ord_cap = Helper.prettyPrintPolicy(using_default_ord_cap ? getDefaultCap('orderer') : ordererCapability);
		const using_ch_cap = Helper.prettyPrintPolicy(using_default_ch_cap ? getDefaultCap('channel') : channelCapability);

		const nameError = !channelName || channelNameError ? 'review_channel_name_error' : null;
		const ordererError = !_.has(selectedOrderer, 'name') || isOrdererUnavailable || checkingOrdererStatus ? 'review_orderer_error' : null;
		const organizationError =
			!orgs || _.size(orgs) < 1 || orgs.find(org => org.msp === '') || noOperatorError || duplicateMSPError || missingDefinitionError ? 'review_organization_error' : null;
		const policyError = !_.has(customPolicy, 'name') ? 'review_policy_error' : null;
		const missingOrgMspError = !_.has(selectedChannelCreator, 'name') ? 'review_creator_error' : null;
		const missingOrgIdentityError = !_.has(selectedIdentity, 'name') || !selectedIdentity.private_key ? 'review_identity_error' : null;
		const consenterError = isChannelUpdate && (consenterUpdateCount() > 1 || invalid_consenter) ? 'review_consenter_error' : null;
		const ordererOrgsError = isChannelUpdate && _.size(orderer_orgs) < 1 ? 'review_orderer_admin_error' : null;
		const aclError = _.size(aclErrors) > 0 ? 'review_acl_error' : null;
		const missingOrdererMspError = isOrdererSignatureNeeded && !_.has(selectedOrdererMsp, 'name') ? 'review_orderer_msp_error' : null;
		const missingApplicationCapabilityError = isChannelUpdate && (using_default_app_cap ? 'review_application_capability_error' : null);
		const missingOrdererCapabilityError = isChannelUpdate && (using_default_ord_cap ? 'review_orderer_capability_error' : null);
		const missingChannelCapabilityError = isChannelUpdate && (using_default_ch_cap ? 'review_channel_capability_error' : null);
		const missingLifecycleSpecificPolicyError =
			lifecycle_policy.type === 'SPECIFIC' && !(_.size(lifecycle_policy.members) > 0 && lifecycle_policy.n > 0) ? 'review_lifecycle_policy_error' : null;
		const missingEndorsementSpecificPolicyError =
			endorsement_policy.type === 'SPECIFIC' && !(_.size(endorsement_policy.members) > 0 && endorsement_policy.n > 0)
				? 'review_endorsement_policy_error'
				: null;

		const osn_options = this.props.buildCreateChannelOpts();
		const consenterError2 = (!osn_options || !Array.isArray(osn_options.consenters) || osn_options.consenters.length === 0) ? 'review_consenter_error' : null;

		return (
			<div className="ibp-channel-review">
				<p className="ibp-channel-section-title">{translate('review_channel_info')}</p>
				<p className="ibp-channel-section-desc">{translate(isChannelUpdate ? 'review_update_channel_info_desc' : 'review_create_channel_info_desc')}</p>

				<div className="ibp-summary-details">
					{this.renderSection(translate, 'channel_name', channelName, nameError)}
					{this.renderSection(translate, 'ordering_service_title', selectedOrderer ? selectedOrderer.name : null, ordererError)}
					{this.renderSection(
						translate,
						'channel_organizations',
						_.size(orgs) > 0
							? orgs.map(org => {
								return { value: org.msp };
							})
							: [],
						organizationError
					)}
					{this.renderSection(translate, 'policy', customPolicy ? customPolicy.name : null, policyError)}
					{this.renderSection(translate, 'orderer_type', use_osnadmin ? translate('systemless_config') : translate('system_config'))}
					{(Array.isArray(selected_ordering_orgs) && selected_ordering_orgs.length > 0) &&
						this.renderSection(translate, 'review_orderers', selected_ordering_orgs.join(','))}
					{!use_osnadmin &&
						this.renderSection(
							translate,
							isChannelUpdate ? 'organization_updating_channel' : 'organization_creating_channel',
							selectedChannelCreator ? selectedChannelCreator.name : null,
							missingOrgMspError
						)
					}
					{!use_osnadmin &&
						this.renderSection(
							translate,
							isChannelUpdate ? 'channel_updator_identity' : 'channel_creator_identity',
							selectedIdentity ? selectedIdentity.name : null,
							missingOrgIdentityError
						)
					}
					{!(isChannelUpdate || use_osnadmin || !using_default_app_cap) &&
						this.renderSection(translate, 'application_channel_capability_version', using_app_cap)}
				</div>

				{(advanced || use_osnadmin) && (
					<>
						<div className="ibp-summary-section-separator">
							<hr />
						</div>
						<div className="ibp-summary-details">
							{(isChannelUpdate || use_osnadmin || !using_default_app_cap) &&
								this.renderSection(translate, 'application_channel_capability_version', using_app_cap, missingApplicationCapabilityError)}
							{(isChannelUpdate || use_osnadmin || !using_default_ord_cap) &&
								this.renderSection(translate, 'orderer_channel_capability_version', using_ord_cap, missingOrdererCapabilityError)}
							{(isChannelUpdate || use_osnadmin || !using_default_ch_cap) &&
								this.renderSection(translate, 'channel_capability_version', using_ch_cap, missingChannelCapabilityError)}
							{using_2_plus_app_cap && this.renderSection(translate, 'channel_lifecycle_policy', lifecyclePolicy, missingLifecycleSpecificPolicyError)}
							{using_2_plus_app_cap && this.renderSection(translate, 'channel_endorsement_policy', endorsementPolicy, missingEndorsementSpecificPolicyError)}
							{showBlockParamSummary &&
								absolute_max_bytes_mb &&
								this.renderSection(translate, 'absolute_max_bytes', absolute_max_bytes_mb + ' ' + translate('megabyte'))}
							{showBlockParamSummary && max_message_count && this.renderSection(translate, 'max_message_count', max_message_count)}
							{showBlockParamSummary &&
								preferred_max_bytes &&
								this.renderSection(translate, 'preferred_max_bytes', preferred_max_bytes + ' ' + translate('bytes'))}
							{showBlockParamSummary && timeout && this.renderSection(translate, 'timeout', timeout)}

							{showRaftParamSummary && snapshot_interval_size && this.renderSection(translate, 'snapshot_interval_size', snapshot_interval_size)}

							{canModifyConsenters &&
								orderer_orgs &&
								this.renderSection(
									translate,
									'orderer_admin_set',
									orderer_orgs.map(org => {
										return { value: org.msp_id };
									}),
									ordererOrgsError
								)}

							{!use_osnadmin && canModifyConsenters &&
								(_.size(consenters) > 0 || use_default_consenters) &&
								this.renderSection(
									translate,
									'consenter_set',
									use_default_consenters
										? translate(use_osnadmin ? 'use_default_consenters2' : 'use_default_consenters')
										: consenters.map(consenter => {
											return { value: consenter.name };
										}),
									consenterError
								)}

							{use_osnadmin && !isChannelUpdate &&
								this.renderSection(
									translate,
									'consenter_set',
									(osn_options && Array.isArray(osn_options.consenters)) ? osn_options.consenters.map(consenter => {
										return { value: consenter.name };
									}) : '',
									consenterError2
								)}

							{isOrdererSignatureNeeded &&
								this.renderSection(translate, 'ordering_service_organization', selectedOrdererMsp ? selectedOrdererMsp.name : null, missingOrdererMspError)}
							{_.size(acls) > 0 &&
								this.renderSection(
									translate,
									'channel_acls',
									acls.map(acl => {
										return { value: acl.resource + ' : ' + acl.definition };
									}),
									aclError
								)}
						</div>
					</>
				)}
			</div>
		);
	}

	renderSection(translate, key, value, error) {
		const multipleValues = _.isArray(value);
		return (
			<div>
				{multipleValues ? (
					<div className="ibp-summary-section">
						<div className="ibp-summary-section-key">{translate(key)}</div>
						<div className="ibp-summary-section-array-value">
							{error ? (
								<span className="has-error">{translate(error)}</span>
							) : (
								value.map((item, i) => {
									return (
										<div key={'item_' + i}
											className="ibp-summary-section-value"
										>
											{item.value}
										</div>
									);
								})
							)}
						</div>
					</div>
				) : (
					<div className="ibp-summary-section">
						<div className="ibp-summary-section-key">{translate(key)}</div>
						<div className={`ibp-summary-section-value ${error ? 'has-error' : ''}`}>{error ? translate(error) : value}</div>
					</div>
				)}
			</div>
		);
	}
}

const dataProps = {
	channelName: PropTypes.string,
	orgs: PropTypes.array,
	customPolicy: PropTypes.object,
	selectedOrderer: PropTypes.any,
	selectedChannelCreator: PropTypes.any,
	selectedOrdererMsp: PropTypes.object,
	selectedIdentity: PropTypes.object,
	selectedApplicationCapability: PropTypes.object,
	selectedChannelCapability: PropTypes.object,
	selectedOrdererCapability: PropTypes.object,
	absolute_max_bytes: PropTypes.number,
	max_message_count: PropTypes.number,
	preferred_max_bytes: PropTypes.number,
	timeout: PropTypes.string,
	snapshot_interval_size: PropTypes.number,
	consenters: PropTypes.array,
	orderer_orgs: PropTypes.array,
	acls: PropTypes.array,
	aclErrors: PropTypes.array,
	noOperatorError: PropTypes.string,
	duplicateMSPError: PropTypes.string,
	missingDefinitionError: PropTypes.string,
	channelNameError: PropTypes.string,
	isChannelUpdate: PropTypes.bool,
	advanced: PropTypes.bool,
	overrideDefaults: PropTypes.bool,
	overrideRaftDefaults: PropTypes.bool,
	isOrdererUnavailable: PropTypes.bool,
	checkingOrdererStatus: PropTypes.bool,
	invalid_consenter: PropTypes.bool,
	use_default_consenters: PropTypes.bool,
	lifecycle_policy: PropTypes.string,
	endorsement_policy: PropTypes.string,
	use_osnadmin: PropTypes.bool,
};

Review.propTypes = {
	...dataProps,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
	}
)(withLocalize(Review));
