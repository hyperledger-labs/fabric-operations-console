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

import TrashCan20 from '@carbon/icons-react/lib/trash-can/20';
import { Button, Checkbox } from 'carbon-components-react';
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

export class Organizations extends Component {
	checkOperatorCount() {
		let hasOperator = false;
		const { orgs } = this.props;
		if (orgs) {
			orgs.forEach(org => {
				if (org.msp !== '' && org.roles.includes('admin')) {
					hasOperator = true;
				}
			});
		}
		if (!hasOperator) {
			this.props.updateState(SCOPE, {
				noOperatorError: 'no_operator_error',
			});
		} else {
			this.props.updateState(SCOPE, {
				noOperatorError: null,
			});
		}
	}

	onAddOrg = option => {
		const { selectedOrg, orgs, updatePolicyDropdown, updateState, availableACLPolicies } = this.props;
		let msp = selectedOrg;
		let new_org = {
			msp: msp.msp_id,
			roles: ['reader'],
			admins: msp.admins,
			host_url: msp.host_url,
			root_certs: msp.root_certs,
			node_ou: msp.fabric_node_ous && msp.fabric_node_ous.enable,
		};
		let updated_orgs = orgs ? [...orgs, new_org] : [new_org];
		this.checkDuplicateMSP(new_org, updated_orgs);
		this.checkNodeOUWarning(updated_orgs);
		updatePolicyDropdown(updated_orgs, false);
		updateState(SCOPE, {
			orgs: updated_orgs,
			availableACLPolicies: [...availableACLPolicies, msp.msp_id],
			selectedOrg: null,
		});
	};

	checkNodeOUWarning(orgs) {
		let applicationCapability = this.props.selectedApplicationCapability;
		let ordererCapability = this.props.selectedOrdererCapability;
		let channelCapability = this.props.selectedChannelCapability;
		const applicationCapabilityFormatted = _.get(applicationCapability, 'id', '');
		const ordererCapabilityFormatted = _.get(ordererCapability, 'id', '');
		const channelCapabilityFormatted = _.get(channelCapability, 'id', '');

		let show_warning = false;
		if (
			applicationCapabilityFormatted.indexOf('V2') === 0 ||
			ordererCapabilityFormatted.indexOf('V2') === 0 ||
			channelCapabilityFormatted.indexOf('V2') === 0
		) {
			const nodeOUDisabled = orgs && orgs.find(x => x.node_ou !== true);
			if (nodeOUDisabled) {
				show_warning = true;
			}
		}
		this.props.updateState(SCOPE, {
			nodeou_warning: show_warning,
		});
	}

	checkDuplicateMSP = (new_org, added_orgs) => {
		let count = 0;
		added_orgs.forEach(org => {
			if (new_org.msp === org.msp) {
				count++;
			}
		});
		this.props.updateState(SCOPE, {
			duplicateMSPError: count > 1 ? 'duplicate_msp_error' : null,
		});
	};

	onDeleteOrg = (index, org) => {
		Log.debug('Deleting org: ', index);
		const { orgs, updateState, availableACLPolicies, updatePolicyDropdown, verifyACLPolicyValidity } = this.props;
		let updated_orgs = orgs.filter((c, i) => i !== index);
		this.checkDuplicateMSP(orgs[index], updated_orgs);
		this.checkNodeOUWarning(updated_orgs);
		updateState(SCOPE, {
			orgs: updated_orgs,
			availableACLPolicies: availableACLPolicies.filter(x => x !== org),
		});
		updatePolicyDropdown(updated_orgs, false);
		verifyACLPolicyValidity(updated_orgs, null); //Show error if any acl(added) refers to this deleted org
	};

	onChangeOrgRole = (index, role, event) => {
		Log.debug('Updating org role: ', index, role, event.target.checked);
		const { orgs, updatePolicyDropdown, updateState } = this.props;
		let org = orgs[index];
		if (event.target.checked) {
			org.roles = role === 'admin' ? ['admin', 'writer', 'reader'] : role === 'writer' ? ['writer', 'reader'] : ['reader'];
		} else {
			org.roles = org.roles.filter(r => r !== role);
		}
		Log.debug('Updating org to: ', org);
		let updated_orgs = Object.assign([...orgs], { i: org });
		updatePolicyDropdown(updated_orgs, false);
		updateState(SCOPE, {
			orgs: updated_orgs,
		});
	};

	render() {
		const { loading, noOperatorError, duplicateMSPError, msps, orgs, selectedOrg, missingDefinitionError, isChannelUpdate, translate } = this.props;
		return (
			<div className="ibp-channel-organizations">
				<p className="ibp-channel-section-title">{translate('channel_organizations')}</p>
				<p className="ibp-channel-section-desc">
					{isChannelUpdate ? translate('update_channel_organization_desc') : translate('create_channel_organization_desc')}
				</p>
				{this.checkOperatorCount()}
				{noOperatorError && (
					<div className="ibp-error-panel">
						<SidePanelWarning title="operator_needed"
							subtitle={noOperatorError}
						/>
					</div>
				)}
				{duplicateMSPError && (
					<div className="ibp-error-panel">
						<SidePanelWarning title="duplicate_msp"
							subtitle={duplicateMSPError}
						/>
					</div>
				)}
				{!loading && (
					<div className="ibp-add-orgs">
						<div className="ibp-add-orgs-select-box">
							{!!msps && !!orgs && (
								<div>
									<Form
										scope={SCOPE}
										id={SCOPE + '-msps'}
										fields={[
											{
												name: 'selectedOrg',
												type: 'dropdown',
												options: msps ? msps.filter(x => !orgs.find(y => y.msp === x.msp_id && _.intersection(x.root_certs, y.root_certs).length >= 1)) : [],
												default: 'select_msp_id',
											},
										]}
									/>
								</div>
							)}
						</div>
						<Button id="btn-add-org"
							kind="secondary"
							className="ibp-add-org"
							onClick={this.onAddOrg}
							disabled={selectedOrg === 'select_msp_id'}
						>
							{translate('add')}
						</Button>
					</div>
				)}
				<div className="ibp-add-added-orgs-table">
					{orgs && orgs.length > 0 && (
						<div className="ibp-add-orgs-table">
							<div className="ibp-add-orgs-msp label">{translate('organizations')}</div>
							<div className="ibp-add-orgs-role label">{translate('permissions')}</div>
						</div>
					)}
					{orgs &&
						orgs.map((org, i) => {
							return (
								<div key={'org_' + i}
									className="ibp-add-orgs-table"
								>
									<div className="ibp-add-orgs-msp">
										<Form
											scope={SCOPE}
											id={`ibp-add-orgs-msp-${i}`}
											fields={[
												{
													name: `organization-${org.msp}`,
													required: true,
													disabled: true,
													hideLabel: true,
													default: orgs[i].msp,
												},
											]}
										/>
									</div>
									<div className="ibp-add-orgs-role">
										<Checkbox
											id={`ibp-add-orgs-msp-${org.msp}-role-admin`}
											key={`ibp-add-orgs-msp-${org.msp}-role-admin`}
											labelText={translate('operator')}
											checked={orgs[i].roles.includes('admin')}
											onClick={event => {
												this.onChangeOrgRole(i, 'admin', event);
											}}
										/>
										<Checkbox
											id={`ibp-add-orgs-msp-${org.msp}-role-writer`}
											key={`ibp-add-orgs-msp-${org.msp}-role-writer`}
											labelText={translate('writer')}
											checked={orgs[i].roles.includes('writer')}
											onClick={event => {
												this.onChangeOrgRole(i, 'writer', event);
											}}
											disabled={orgs[i].roles.includes('admin')}
										/>
										<Checkbox
											id={`ibp-add-orgs-msp-${org.msp}-role-reader`}
											key={`ibp-add-orgs-msp-${org.msp}-role-reader`}
											labelText={translate('reader')}
											defaultChecked
											disabled={true}
										/>
									</div>
									<Button
										hasIconOnly
										type="button"
										renderIcon={TrashCan20}
										kind="secondary"
										id={'ibp-remove-org-' + i}
										iconDescription={translate('remove_msp')}
										tooltipAlignment="center"
										tooltipPosition="bottom"
										className="ibp-add-orgs-remove"
										size="default"
										onClick={() => {
											this.onDeleteOrg(i, org.msp);
										}}
									/>
								</div>
							);
						})}
					{missingDefinitionError && (
						<div className="ibp-missing-definition-error">
							<SidePanelWarning title={missingDefinitionError}
								subtitle={translate('missing_msp_definition_desc')}
							/>
						</div>
					)}
				</div>
			</div>
		);
	}
}

const dataProps = {
	loading: PropTypes.bool,
	existingOrgs: PropTypes.array,
	msps: PropTypes.array,
	orgs: PropTypes.array,
	selectedOrg: PropTypes.object,
	noOperatorError: PropTypes.string,
	duplicateMSPError: PropTypes.string,
	missingDefinitionError: PropTypes.string,
	availableACLPolicies: PropTypes.array,
	isChannelUpdate: PropTypes.bool,
	selectedApplicationCapability: PropTypes.object,
	selectedChannelCapability: PropTypes.object,
	selectedOrdererCapability: PropTypes.object,
	nodeou_warning: PropTypes.bool,
};

Organizations.propTypes = {
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
)(withLocalize(Organizations));
