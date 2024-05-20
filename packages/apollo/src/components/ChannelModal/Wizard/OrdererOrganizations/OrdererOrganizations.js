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

import TrashCan20 from '@carbon/icons-react/lib/trash-can/20';
import { Button, Checkbox } from 'carbon-components-react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { updateState } from '../../../../redux/commonActions';
import Helper from '../../../../utils/helper';
import Form from '../../../Form/Form';
import SidePanelWarning from '../../../SidePanelWarning/SidePanelWarning';

const SCOPE = 'channelModal';
let hasAdmin = false;
// This is step "channel_orderer_organizations"
//
// this panel allows selecting the orderer orgs in the config-block and which one's get the admin role
// (only used for osn admin nodes)
export class OrdererOrganizations extends Component {
	componentDidMount() {
		if (!hasAdmin)
		{
			this.props.updateState(SCOPE, {
				noAdminError: 'no_admin_error',
				noOrderersError: false
			});
		}

	}

	// user added a new msp/org
	onAddOrg = option => {
		const { selectedOrg, ordering_orgs, updateState } = this.props;
		let msp = selectedOrg;
		let selected_orgs = Array.isArray(ordering_orgs) ? JSON.parse(JSON.stringify(ordering_orgs)) : [];
		let new_org = {
			msp_id: msp.msp_id,
			roles: ['writer', 'reader'],			// defaults
			admins: msp.admins,
			host_url: msp.host_url,
			root_certs: msp.root_certs,
			node_ou: msp.fabric_node_ous && msp.fabric_node_ous.enable,
			fabric_node_ous: msp.fabric_node_ous,
			tls_root_certs: msp.tls_root_certs,
			intermediate_certs: msp.tls_intermediate_certs,
			tls_intermediate_certs: msp.tls_intermediate_certs,
		};
		if (!Array.isArray(selected_orgs)) { selected_orgs = []; }
		selected_orgs.push(new_org);
		this.checkDuplicateMSP(new_org, selected_orgs);
		this.checkNodeOUWarning(selected_orgs);
		updateState(SCOPE, {
			ordering_orgs: selected_orgs,
			selectedOrg: null,
		});
		this.checkAdminCount(selected_orgs);
		this.checkOrdererCount(selected_orgs);
	};

	// user removed a selected msp/org
	onDeleteOrg = (index, org) => {
		const { ordering_orgs, updateState } = this.props;
		let updated_orgs = ordering_orgs.filter((c, i) => i !== index);
		this.checkDuplicateMSP(ordering_orgs[index], updated_orgs);
		this.checkNodeOUWarning(updated_orgs);
		updateState(SCOPE, {
			ordering_orgs: updated_orgs,
		});
		this.checkAdminCount(updated_orgs);
		this.checkOrdererCount(updated_orgs);
	};

	// user changed the role of a selected msp/org
	onChangeOrgRole = (index, role, event) => {
		const { ordering_orgs, updateState } = this.props;
		let selected_orgs = Array.isArray(ordering_orgs) ? JSON.parse(JSON.stringify(ordering_orgs)) : [];

		if (event.target.checked) {
			selected_orgs[index].roles = (role === 'admin') ? ['admin', 'writer', 'reader'] : ['writer', 'reader'];
		} else {
			selected_orgs[index].roles = ['writer', 'reader'];
		}
		updateState(SCOPE, {
			ordering_orgs: selected_orgs,
		});
		this.checkAdminCount(selected_orgs);
	};

	checkAdminCount(selected_ordering_orgs) {
		hasAdmin = false;
		if (selected_ordering_orgs) {
			selected_ordering_orgs.forEach(org => {
				if (org.msp_id !== '' && org.roles.includes('admin')) {
					hasAdmin = true;
				}
			});
		}
		if (!hasAdmin) {
			this.props.updateState(SCOPE, {
				noAdminError: 'no_admin_error',
			});
		} else {
			this.props.updateState(SCOPE, {
				noAdminError: null,
			});
		}
	}

	// since we are using osn admin features aka systemless config then make sure at leats one msp choice has a known orderer.
	// b/c we need at least 1 orderer to be a consenter in the genesis block
	checkOrdererCount(selected_ordering_orgs) {
		const raftNodes = this.props.raftNodes;
		const msps_with_orderers = (selected_ordering_orgs && raftNodes) ? selected_ordering_orgs.filter(x =>
			raftNodes.find(y => y.msp_id === x.msp_id)
		) : [];

		this.props.updateState(SCOPE, {
			noOrderersError: (!Array.isArray(msps_with_orderers) || msps_with_orderers.length === 0) ? true : false,
		});
	}

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
			if (new_org.msp_id === org.msp_id) {
				count++;
			}
		});
		this.props.updateState(SCOPE, {
			duplicateMSPError: count > 1 ? 'duplicate_msp_error' : null,
		});
	};

	render() {
		const { loading, noAdminError, noOrderersError, duplicateMSPError, msps, ordering_orgs, selectedOrg, missingDefinitionError, isChannelUpdate, t: translate } = this.props;

		// hide orgs that are already selected
		const msp_opts = msps ? msps.filter(x =>
			!ordering_orgs.find(y => y.msp_id === x.msp_id && _.intersection(x.root_certs, y.root_certs).length >= 1)
		) : [];

		return (
			<div className="ibp-channel-organizations">
				<p className="ibp-channel-section-title">{translate('channel_orderer_organizations')}</p>
				<p className="ibp-channel-section-desc">
					{isChannelUpdate ? translate('update_channel_organization_desc') : translate('create_channel_orderer_org_desc')}
				</p>
				{noAdminError && (
					<div className="ibp-error-panel">
						<SidePanelWarning title="admin_needed_simple"
							subtitle={noAdminError}
						/>
					</div>
				)}
				{noOrderersError && (
					<div className="ibp-error-panel">
						<SidePanelWarning title="orderer_needed_simple"
							subtitle="orderer_needed_error"
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
							{msp_opts && (
								<div>
									<Form
										scope={SCOPE}
										id={SCOPE + '-msps'}
										fields={[
											{
												name: 'selectedOrg',
												type: 'dropdown',
												options: msp_opts,
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
					{ordering_orgs && ordering_orgs.length > 0 && (
						<div className="ibp-add-orgs-table">
							<div className="ibp-add-orgs-msp label">{translate('selected_msps')}</div>
							<div className="ibp-add-orgs-role label">{translate('permissions')}</div>
						</div>
					)}
					{ordering_orgs &&
						ordering_orgs.map((org, i) => {
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
													name: `organization-${org.msp_id}`,
													required: true,
													disabled: true,
													hideLabel: true,
													default: ordering_orgs[i].msp_id,
												},
											]}
										/>
									</div>
									<div className="ibp-add-orgs-role">
										<Checkbox
											id={`ibp-add-orgs-msp-${org.msp_id}-role-admin`}
											key={`ibp-add-orgs-msp-${org.msp_id}-role-admin`}
											labelText={translate('administrator')}
											checked={ordering_orgs[i].roles.includes('admin')}
											onClick={event => {
												this.onChangeOrgRole(i, 'admin', event);
											}}
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
											this.onDeleteOrg(i, org.msp_id);
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
	ordering_orgs: PropTypes.array,
	selectedOrg: PropTypes.object,
	noAdminError: PropTypes.string,
	duplicateMSPError: PropTypes.string,
	missingDefinitionError: PropTypes.string,
	isChannelUpdate: PropTypes.bool,
	selectedApplicationCapability: PropTypes.object,
	selectedChannelCapability: PropTypes.object,
	selectedOrdererCapability: PropTypes.object,
	raftNodes: PropTypes.array,
	nodeou_warning: PropTypes.bool,
	noOrderersError: PropTypes.bool,
};

OrdererOrganizations.propTypes = {
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
)(withTranslation()(OrdererOrganizations));
