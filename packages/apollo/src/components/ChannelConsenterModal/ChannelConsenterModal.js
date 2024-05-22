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
import ChannelApi from '../../rest/ChannelApi';
import Clipboard from '../../utils/clipboard';
import Helper from '../../utils/helper';
import Form from '../Form/Form';
import Logger from '../Log/Logger';
import Wizard from '../Wizard/Wizard';
import WizardStep from '../WizardStep/WizardStep';
import RenderParamHTML from '../RenderHTML/RenderParamHTML';

const SCOPE = 'channelConsenterModal';
const Log = new Logger(SCOPE);

class ChannelConsenterModal extends React.Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			error: null,
			confirm_consenter_url: null,
			confirm_consenter_name: null,
			selectedOrdererMsp: null,
		});
	}

	removeConsenter = async () => {
		try {
			let options = {
				channel_id: this.props.channelId,
				orderer_host: this.props.ordererHost,
				configtxlator_url: this.props.configtxlator_url,
				consenter_url: window.location.protocol + '//' + this.props.consenter.url,
				orderer_msps: this.buildOrdererMsps(),
				peerCerts: this.props.peerCerts,
				mode: 'delete',
			};
			await ChannelApi.modifyConsenters(options);
			this.props.onComplete();
		} catch (error) {
			Log.error(error);
			throw error;
		}
	};

	updateConsenter = async () => {
		try {
			let options = {
				channel_id: this.props.channelId,
				orderer_host: this.props.ordererHost,
				configtxlator_url: this.props.configtxlator_url,
				consenter_url: window.location.protocol + '//' + this.props.consenter.url,
				tls_new_cert: this.props.consenter.tls_new_cert,
				orderer_msps: this.buildOrdererMsps(),
				peerCerts: this.props.peerCerts,
				mode: 'update',
			};
			await ChannelApi.modifyConsenters(options);
			this.props.onComplete();
		} catch (error) {
			Log.error(error);
			throw error;
		}
	};

	buildOrdererMsps = () => {
		let orderer_msps = [];
		if (this.props.selectedOrdererMsp && this.props.selectedOrdererMsp.host_url) {
			orderer_msps.push({
				msp_id: this.props.selectedOrdererMsp.msp_id,
				admins: this.props.selectedOrdererMsp.admins,
				host_url: this.props.selectedOrdererMsp.host_url,
			});
		}
		return orderer_msps;
	};

	renderRemove(translate) {
		let host = this.props.consenter.display_name || this.props.consenter.url;
		const disableRemove = this.props.confirm_consenter_url !== host || !this.props.selectedOrdererMsp || this.props.selectedOrdererMsp === 'select_orderer_msp';
		return (
			<WizardStep type="WizardStep"
				title="remove_consenter"
				disableSubmit={disableRemove}
			>
				<div className="ibp-remove-consenter-desc">
					<p>
						{RenderParamHTML(translate, 'remove_consenter_application_channel_desc', {
							name: (
								<CodeSnippet
									type="inline"
									ariaLabel={translate('copy_text', { copyText: host })}
									onClick={() => Clipboard.copyToClipboard(host)}
									light={false}
									title={host}
								>
									{host}
								</CodeSnippet>
							),
							channelId: this.props.channelId,
						})}
					</p>
				</div>
				<div>
					<div className="ibp-remove-consenter-confirm">{translate('remove_consenter_confirm_channel')}</div>
					<Form
						scope={SCOPE}
						id={SCOPE + '-remove'}
						fields={[
							{
								name: 'confirm_consenter_url',
								label: this.props.consenter.display_name ? 'confirm_consenter_name' : 'confirm_consenter_url',
								placeholder: this.props.consenter.display_name ? 'confirm_remove_consenter_name_placeholder' : 'confirm_consenter_url_placeholder',
							},
							{
								name: 'selectedOrdererMsp',
								type: 'dropdown',
								required: true,
								tooltip: 'channel_consenter_orderer_msp_tooltip',
								options: this.props.ordererMSPs,
								default: 'select_orderer_msp',
							},
						]}
					/>
				</div>
			</WizardStep>
		);
	}

	renderUpdate(translate) {
		let name = this.props.consenter.display_name;
		const disableUpdate =
			this.props.confirm_consenter_name !== name || !this.props.selectedOrdererMsp || this.props.selectedOrdererMsp === 'select_orderer_msp';
		return (
			<WizardStep type="WizardStep"
				title="update_consenter"
				disableSubmit={disableUpdate}
			>
				<div>
					<p>
						{RenderParamHTML(translate, 'update_consenter_application_channel_desc', {
							name: (
								<CodeSnippet
									type="inline"
									ariaLabel={translate('copy_text', { copyText: name })}
									onClick={() => Clipboard.copyToClipboard(name)}
									light={false}
									title={name}
								>
									{name}
								</CodeSnippet>
							),
							channelId: this.props.channelId,
						})}
					</p>
				</div>
				<div className="ibp-update-consenter-cert">
					<Form
						scope={SCOPE}
						id={SCOPE + '-update'}
						fields={[
							{
								name: 'tls_root_cert',
								alias: 'pem',
								skipLabel: true,
								type: 'certificate',
								readonly: true,
								default: this.props.consenter.tls_new_cert,
							},
						]}
					/>
				</div>
				<div>
					<div className="ibp-update-consenter-confirm">{translate('update_consenter_confirm')}</div>
					<Form
						scope={SCOPE}
						id={SCOPE + '-update'}
						fields={[
							{
								name: 'confirm_consenter_name',
								placeholder: 'confirm_update_consenter_name_placeholder',
							},
							{
								name: 'selectedOrdererMsp',
								type: 'dropdown',
								required: true,
								tooltip: 'channel_consenter_orderer_msp_tooltip',
								options: this.props.ordererMSPs,
								default: 'select_orderer_msp',
							},
						]}
					/>
				</div>
			</WizardStep>
		);
	}

	render() {
		const translate = this.props.t;
		const mode = this.props.mode;
		return (
			<Wizard
				onClose={this.props.onClose}
				onSubmit={mode === 'delete' ? this.removeConsenter : this.updateConsenter}
				submitButtonLabel={translate(mode === 'delete' ? 'remove_consenter' : 'update_consenter')}
				submitButtonId="confirm_remove"
				error={this.props.error}
			>
				{mode === 'delete' && this.renderRemove(translate)}
				{mode === 'update' && this.renderUpdate(translate)}
			</Wizard>
		);
	}
}

const dataProps = {
	error: PropTypes.string,
	confirm_consenter_url: PropTypes.string,
	confirm_consenter_name: PropTypes.string,
	selectedOrdererMsp: PropTypes.object,
};

ChannelConsenterModal.propTypes = {
	...dataProps,
	consenter: PropTypes.object,
	orderer: PropTypes.object,
	channelId: PropTypes.string,
	peerCerts: PropTypes.object,
	ordererHost: PropTypes.string,
	mode: PropTypes.string,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
	updateState: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		const newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['configtxlator_url'] = state['settings']['configtxlator_url'];
		return newProps;
	},
	{
		updateState,
	}
)(withTranslation()(ChannelConsenterModal));
