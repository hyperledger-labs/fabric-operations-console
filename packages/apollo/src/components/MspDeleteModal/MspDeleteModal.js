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
import { CodeSnippet } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import { OrdererRestApi } from '../../rest/OrdererRestApi';
import Clipboard from '../../utils/clipboard';
import Helper from '../../utils/helper';
import Form from '../Form/Form';
import Logger from '../Log/Logger';
import SidePanel from '../SidePanel/SidePanel';
import RenderParamHTML from '../RenderHTML/RenderParamHTML';

const SCOPE = 'mspDeleteModal';
const Log = new Logger(SCOPE);

export class MspDeleteModal extends React.Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			disableRemove: true,
			submitting: false,
			error: null,
		});
	}

	removeMsp = member => {
		this.props.updateState(SCOPE, { submitting: true });
		// API to remove MSP
		const mspPayload = {
			cluster_id: this.props.clusterId,
			configtxlator_url: this.props.configtxlator_url,
			type: this.props.ordererAdmin ? 'ordererAdmin' : 'ordererMember',
			operation: 'delete',
			payload: {
				msp_id: this.props.selectedMember.msp_id,
			},
		};

		OrdererRestApi.deleteMSP(mspPayload)
			.then(resp => {
				this.props.onComplete();
				this.props.onClose();
			})
			.catch(error => {
				Log.error(error);
				if (error && error.stitch_msg && error.stitch_msg.indexOf('required 1 remaining') > -1) {
					this.props.updateState(SCOPE, {
						error: {
							title: 'error_delete_msps_policy',
							translateOptions: {
								msp_id: this.props.selectedMember.name,
							},
							details: error,
						},
						submitting: false,
					});
				} else {
					this.props.updateState(SCOPE, {
						error: {
							title: 'error_delete_msps',
							translateOptions: {
								msp_id: this.props.selectedMember.name,
							},
							details: error,
						},
						submitting: false,
					});
				}
			});
	};

	renderRemove(translate) {
		return (
			<div>
				<div className="ibp-modal-title">
					<h1 className="ibm-light">{translate(this.props.ordererAdmin ? 'remove_adminmsp_from_orderer' : 'remove_msp_from_consortium')}</h1>
				</div>
				<p className="ibp-remove-msp-desc">
					{RenderParamHTML(translate, this.props.ordererAdmin ? 'remove_adminmsp_from_orderer_desc' : 'remove_msp_from_consortium_desc', {
						name: (
							<CodeSnippet
								type="inline"
								ariaLabel={translate('copy_text', { copyText: this.props.selectedMember.name })}
								light={false}
								onClick={() => Clipboard.copyToClipboard(this.props.selectedMember.name)}
							>
								{this.props.selectedMember.name}
							</CodeSnippet>
						),
					})}
				</p>
				<div>
					<p className="ibp-remove-msp-confirm">{translate('remove_msp_confirm')}</p>
					<Form
						scope={SCOPE}
						id={SCOPE + '-remove'}
						fields={[
							{
								name: 'confirm_msp_name',
								tooltip: 'remove_msp_name_tooltip',
							},
						]}
						onChange={data => {
							this.props.updateState(SCOPE, {
								disableRemove: data.confirm_msp_name !== this.props.selectedMember.name,
							});
						}}
					/>
				</div>
			</div>
		);
	}

	render() {
		const translate = this.props.t;
		return (
			<SidePanel
				id="removeMspModal"
				closed={this.props.onClose}
				ref={sidePanel => (this.sidePanel = sidePanel)}
				buttons={[
					{
						id: 'cancel',
						text: translate('cancel'),
						onClick: this.props.onClose,
						disabled: this.props.submitting,
					},
					{
						id: 'confirm_remove',
						text: translate('remove'),
						onClick: this.removeMsp,
						disabled: this.props.disableRemove || this.props.submitting,
						type: 'submit',
					},
				]}
				error={this.props.error}
				submitting={this.props.submitting}
			>
				{this.renderRemove(translate)}
			</SidePanel>
		);
	}
}

const dataProps = {
	name: PropTypes.string,
	msp_id: PropTypes.string,
	submitting: PropTypes.bool,
	disableRemove: PropTypes.bool,
	error: PropTypes.string,
};

MspDeleteModal.propTypes = {
	...dataProps,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
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
)(withTranslation()(MspDeleteModal));
