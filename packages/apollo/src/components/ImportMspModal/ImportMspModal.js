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
import { Dropdown } from 'carbon-components-react';
import DropdownSkeleton from 'carbon-components-react/lib/components/Dropdown/Dropdown.Skeleton';
import PropTypes from 'prop-types';
import React from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { showError, updateState } from '../../redux/commonActions';
import { MspRestApi } from '../../rest/MspRestApi';
import { OrdererRestApi } from '../../rest/OrdererRestApi';
import Helper from '../../utils/helper';
import Logger from '../Log/Logger';
import SidePanel from '../SidePanel/SidePanel';
import SidePanelWarning from '../SidePanelWarning/SidePanelWarning';

const SCOPE = 'importMspModal';
const Log = new Logger(SCOPE);

class ImportMspModal extends React.Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			data: [],
			loading: true,
			submitting: false,
			disableMspName: true,
			msps: [],
			selected_msp: null,
			duplicateMSPId: null,
			error: null,
			dataValid: false,
		});
		this.getMsps();
	}

	getMsps = () => {
		let msps = [];
		const filterList = this.props.ordererAdmin ? this.props.admins : this.props.members;
		this.props.updateState(SCOPE, { loading: true });
		MspRestApi.getAllMsps()
			.then(nodes => {
				nodes.forEach(node => {
					let hideNode = false;
					//Check if exists
					for (let i in filterList) {
						if (node.msp_id === filterList[i].msp_id) {
							hideNode = true;
						}
					}

					if (!hideNode) {
						msps.push({ ...node });
					}
				});
				const l_selectedMSP = msps.length ? msps[0] : null;
				this.props.updateState(SCOPE, {
					msps: msps,
					loading: false,
					selected_msp: l_selectedMSP,
				});
				this.checkForDuplicate(l_selectedMSP);
			})
			.catch(error => {
				Log.error(error);
				this.props.updateState(SCOPE, { loading: false });
				this.props.showError('error_msps', {}, SCOPE);
			});
	};

	onChange = (data, dataValid) => {
		this.props.updateState(SCOPE, {
			data,
			dataValid,
			error: null,
		});
	};

	onSubmit = () => {
		if (this.props.submitting) {
			return;
		}
		this.props.updateState(SCOPE, { submitting: true });
		const selected_msp = this.props.selected_msp;
		const mspPayload = {
			ordererId: this.props.ordererId,
			configtxlator_url: this.props.configtxlator_url,
			type: this.props.ordererAdmin ? 'ordererAdmin' : 'ordererMember',
			operation: 'add',
			payload: { ...selected_msp },
		};

		OrdererRestApi.addMSP(mspPayload)
			.then(resp => {
				this.props.updateState(SCOPE, { submitting: false });
				this.props.onComplete();
				this.props.onClose();
			})
			.catch(error => {
				Log.error(error);
				if (error && error.stitch_msg && error.stitch_msg.indexOf('signature set did not satisfy policy') > -1) {
					this.props.updateState(SCOPE, {
						error: {
							title: 'error_add_msps',
							details: error,
						},
						submitting: false,
					});
				} else if (error && error.stitch_msg && error.stitch_msg.indexOf('Attempted to define two different versions of MSP') > -1) {
					this.props.updateState(SCOPE, {
						error: {
							title: 'error_add_msps_already_exists',
							details: error.stitch_msg,
						},
						submitting: false,
					});
				} else if (error && error.stitch_msg && error.stitch_msg.indexOf('no Raft leader') > -1) {
					this.props.updateState(SCOPE, {
						error: {
							title: 'error_no_raft_leader',
							details: error.stitch_msg,
						},
						submitting: false,
					});
				} else if (error && typeof error === 'string' && error.indexOf('no differences detected between original and updated config') > -1) {
					this.props.updateState(SCOPE, {
						error: {
							title: 'error_add_msps_already_exists',
							details: error,
						},
						submitting: false,
					});
				} else {
					this.props.updateState(SCOPE, {
						error: {
							title: 'error_add_msps',
							details: error,
						},
						submitting: false,
					});
				}
			});
	};

	onDropdownChange = event => {
		this.props.updateState(SCOPE, {
			selected_msp: event.selectedItem,
		});
		if (event.selectedItem && event.selectedItem.msp_id) {
			this.checkForDuplicate(event.selectedItem);
		}
	};

	checkForDuplicate = msp => {
		this.props.updateState(SCOPE, {
			duplicateMSPId: null,
		});
		const filterList = this.props.ordererAdmin ? this.props.members : this.props.admins;
		if (msp && msp.msp_id) {
			filterList.forEach(l_msp => {
				if (l_msp.msp_id === msp.msp_id) {
					this.props.updateState(SCOPE, {
						duplicateMSPId: msp.msp_id,
					});
				}
			});
		}
	};

	renderMSPUpload(translate) {
		const ordererAdmin = this.props.ordererAdmin;
		return (
			<div>
				<h1 className="ibp-msp-config-header">{translate(ordererAdmin ? 'add_orderer_admin' : 'add_organization')}</h1>
				<p className="ibp-modal-desc">{translate(ordererAdmin ? 'add_orderer_administrator' : 'add_orderer_organization')}</p>
				<div>
					<div id="orderer-add-msp-dropdown">
						{this.props.loading ? (
							<DropdownSkeleton />
						) : (
							<Dropdown
								id="add-msp-dropdown"
								label={translate('select_existing_msp')}
								ariaLabel="Dropdown"
								items={this.props.msps || []}
								onChange={this.onDropdownChange}
								itemToString={msp => {
									if (msp && msp.display_name) {
										return msp.display_name + ' (' + msp.msp_id + ')';
									}
								}}
								selectedItem={this.props.selected_msp}
							/>
						)}
					</div>
				</div>
			</div>
		);
	}

	render() {
		const translate = this.props.translate;
		return (
			<SidePanel
				id="add-users"
				closed={this.props.onClose}
				ref={sidePanel => (this.sidePanel = sidePanel)}
				buttons={[
					{
						id: 'cancel',
						text: translate('cancel'),
					},
					{
						id: 'submit',
						text: this.props.ordererAdmin ? translate('add_orderer_admin') : translate('add_organization'),
						onClick: this.onSubmit,
						disabled: this.props.loading || this.props.submitting || !this.props.selected_msp,
						type: 'submit',
					},
				]}
				error={this.props.error}
				submitting={this.props.submitting}
			>
				{this.renderMSPUpload(translate)}
				{!!this.props.duplicateMSPId && (
					<SidePanelWarning
						title={translate('duplicate_msp_id_warning', {
							msp_id: this.props.duplicateMSPId,
							section: this.props.ordererAdmin ? translate('orderer_members') : translate('orderer_admins'),
						})}
					/>
				)}
			</SidePanel>
		);
	}
}

const dataProps = {
	data: PropTypes.array,
	dataValid: PropTypes.bool,
	loading: PropTypes.bool,
	submitting: PropTypes.bool,
	step: PropTypes.number,
	update: PropTypes.bool,
	disableMspName: PropTypes.bool,
	ordererAdmin: PropTypes.bool,
	networkMember: PropTypes.bool,
	duplicateMSPId: PropTypes.string,
	msps: PropTypes.array,
	selected_msp: PropTypes.object,
	error: PropTypes.string,
	members: PropTypes.array,
	admins: PropTypes.array,
};

ImportMspModal.propTypes = {
	...dataProps,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
	updateState: PropTypes.func,
	showError: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		showError,
		updateState,
	}
)(withLocalize(ImportMspModal));
