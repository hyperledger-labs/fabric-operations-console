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
import { Button } from 'carbon-components-react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { updateState } from '../../../../redux/commonActions';
import Helper from '../../../../utils/helper';
import Form from '../../../Form/Form';
import SidePanelWarning from '../../../SidePanelWarning/SidePanelWarning';
import TranslateLink from '../../../TranslateLink/TranslateLink';

const SCOPE = 'channelModal';

// This is step "orderer_admin_set"
//
// this panel allow selecting the **orderer orgs** for a channel
class Admins extends Component {
	onAddAdmin = option => {
		const orderer_orgs = _.isEmpty(this.props.orderer_orgs) ? [this.props.selectedAdmin] : [...this.props.orderer_orgs, this.props.selectedAdmin];
		this.props.updateState(SCOPE, {
			orderer_orgs,
			selectedAdmin: 'select_admin',
		});
		this.checkForInvalidConsenter(orderer_orgs);
	};

	onDeleteAdmin = index => {
		const updatedAdminSet = this.props.orderer_orgs.filter((c, i) => i !== index);
		this.props.updateState(SCOPE, {
			orderer_orgs: updatedAdminSet,
		});
		this.checkForInvalidConsenter(updatedAdminSet);
	};

	onResetAdmin = () => {
		this.props.updateState(SCOPE, {
			orderer_orgs: this.props.existingOrdererOrgs,
		});
		this.checkForInvalidConsenter(this.props.existingOrdererOrgs);
	};

	checkForInvalidConsenter(orderer_orgs) {
		const { consenters, raftNodes } = this.props;
		// check if there are any consenters that are now invalid
		let allowed_raftNodes = raftNodes.filter(x => {
			let find = orderer_orgs.find(y => x.msp_id === y.msp_id);
			return find ? true : false;
		});
		// only nodes that are from the orderer admin msp on application channel are allowed
		let invalid_consenter = false;
		if (consenters) {
			consenters.forEach(consenter => {
				let found = allowed_raftNodes.filter(x => consenter.client_tls_cert === x.client_tls_cert && consenter.host === x.host);
				if (!found || !found.length) {
					invalid_consenter = true;
				}
			});
		}
		this.props.updateState(SCOPE, {
			invalid_consenter,
		});
	}

	render() {
		const { availableAdmins, invalid_consenter, orderer_orgs, isAdminsModified, selectedAdmin, t: translate, use_osnadmin } = this.props;
		let options = [];
		if (availableAdmins) {
			availableAdmins.forEach(admin => {
				let admin_found = false;
				if (orderer_orgs) {
					orderer_orgs.forEach(org => {
						if (org.msp_id === admin.msp_id) {
							admin_found = true;
						}
					});
				}
				if (!admin_found) {
					if (!admin.display_name) {
						admin.display_name = admin.msp_id;
					}
					options.push(admin);
				}
			});
		}
		return (
			<div className="ibp-channel-admins">
				<p className="ibp-channel-section-title">{translate('orderer_admin_set')}</p>
				<TranslateLink text={translate(use_osnadmin ? 'update_channel_admin_set_desc2' : 'update_channel_admin_set_desc')}
					className="ibp-channel-section-desc-with-link"
				/>
				<div className="ibp-add-admins">
					<div className="ibp-add-admins-select-box">
						<Form
							scope={SCOPE}
							id={SCOPE + '-admins'}
							fields={[
								{
									name: 'selectedAdmin',
									label: 'channel_admin',
									type: 'dropdown',
									options,
									default: 'select_admin',
								},
							]}
						/>
					</div>
					<Button id="btn-add-admin"
						kind="secondary"
						className="ibp-add-admin"
						onClick={this.onAddAdmin}
						disabled={selectedAdmin === 'select_admin'}
					>
						{translate('add')}
					</Button>
					{isAdminsModified && (
						<Button id="btn-reset-admin"
							kind="secondary"
							className="ibp-reset-admin"
							onClick={this.onResetAdmin}
						>
							{translate('reset')}
						</Button>
					)}
				</div>
				{!_.isEmpty(orderer_orgs) && (
					<div className="ibp-channel-table-headers">
						<div className="ibp-add-admin-table-name">{translate('name')}</div>
					</div>
				)}
				{!_.isEmpty(orderer_orgs) &&
					orderer_orgs.map((admin, i) => {
						if (!admin.display_name && availableAdmins) {
							availableAdmins.forEach(admin2 => {
								if (admin.msp_id === admin2.msp_id) {
									admin.display_name = admin2.display_name;
								}
							});
						}
						if (!admin.display_name) {
							admin.display_name = admin.msp_id;
						}
						return (
							<div key={'admin_' + i}
								className="ibp-add-channel-table"
							>
								<div className="ibp-add-admin-table-name">
									<input className="bx--text-input"
										value={admin.display_name}
										disabled={true}
										aria-label={translate('name') + ' ' + admin.display_name}
									/>
								</div>
								<Button
									hasIconOnly
									type="button"
									renderIcon={TrashCan20}
									kind="secondary"
									id={'ibp-remove-admin-' + i}
									iconDescription={translate('remove_orderer_admin')}
									tooltipAlignment="center"
									tooltipPosition="bottom"
									className="ibp-admins-remove"
									size="default"
									onClick={() => {
										this.onDeleteAdmin(i);
									}}
								/>
							</div>
						);
					})}
				{_.isEmpty(this.props.orderer_orgs) && (
					<div className="ibp-error-panel">
						<SidePanelWarning title=""
							subtitle="channel_admins_empty_error"
						/>
					</div>
				)}
				{invalid_consenter && (
					<div className="ibp-error-panel">
						<SidePanelWarning title=""
							subtitle="invalid_consenter_error"
						/>
					</div>
				)}
			</div>
		);
	}
}

const dataProps = {
	orderer_orgs: PropTypes.array,
	existingOrdererOrgs: PropTypes.array,
	selectedAdmin: PropTypes.object,
	availableAdmins: PropTypes.array,
	consenters: PropTypes.array,
	raftNodes: PropTypes.object,
	invalid_consenter: PropTypes.bool,
	use_osnadmin: PropTypes.bool,
};

Admins.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	isAdminsModified: PropTypes.bool,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
	}
)(withTranslation()(Admins));
