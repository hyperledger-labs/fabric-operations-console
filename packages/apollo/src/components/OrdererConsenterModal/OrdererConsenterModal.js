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
import Wizard from '../Wizard/Wizard';
import WizardStep from '../WizardStep/WizardStep';
import RenderParamHTML from '../RenderHTML/RenderParamHTML';

const SCOPE = 'ordererConsenterModal';
const Log = new Logger(SCOPE);

class OrdererConsenterModal extends React.Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			disableRemove: true,
			error: null,
			confirm_consenter_url: null,
			confirm_consenter_name: null,
		});
	}

	removeConsenter = async () => {
		try {
			await OrdererRestApi.removeOrdererNodeFromSystemChannel({
				...this.props.orderer,
				ordererId: this.props.orderer.raft ? this.props.orderer.raft[0].id : this.props.orderer.id,
				cluster_id: this.props.orderer.raft ? this.props.orderer.raft[0].cluster_id : this.props.orderer.cluster_id,
				configtxlator_url: this.props.configtxlator_url,
				consenter_url: window.location.protocol + '//' + this.props.consenter.url,
			});
			this.props.onComplete();
		} catch (error) {
			Log.error(error);
			throw error;
		}
	};

	updateOrdererCerts = async () => {
		try {
			await this.retryUpdateCert(this.props.orderer.raft || [this.props.orderer]);
			this.props.onComplete();
		} catch (error) {
			Log.error(error);
			throw error;
		}
	};

	// If update fails, try using next orderer
	async retryUpdateCert(orderers) {
		const orderer = orderers.pop();
		try {
			Log.debug('Attempting to update certs with: ', orderer);
			await OrdererRestApi.updateOrdererCertsOnSystemChannel({
				...this.props.orderer,
				ordererId: orderer.id,
				cluster_id: orderer.cluster_id,
				configtxlator_url: this.props.configtxlator_url,
				consenter_url: window.location.protocol + '//' + this.props.consenter.url,
				tls_new_cert: this.props.consenter.node.client_tls_cert,
			});
		} catch (error) {
			Log.error('Error occurred when updating certs with orderer ', orderer, error);
			if (orderers.length > 0) {
				Log.debug('Try next orderer');
				return this.retryUpdateCert(orderers);
			} else {
				throw error;
			}
		}
	}

	renderRemove(translate) {
		let host = this.props.consenter.host;
		let title = '';
		if (host.length > 15 && host.indexOf('.') > -1) {
			title = host;
			host = host.substring(0, host.indexOf('.'));
		}
		return (
			<WizardStep type="WizardStep"
				title="remove_consenter"
				disableSubmit={this.props.disableRemove}
			>
				<div className="ibp-remove-consenter-desc">
					<p>
						{RenderParamHTML(translate, 'remove_consenter_system_channel_desc', {
							name: (
								<CodeSnippet
									type="inline"
									ariaLabel={translate('copy_text', { copyText: host })}
									onClick={() => Clipboard.copyToClipboard(host)}
									light={false}
									title={title}
								>
									{host}
								</CodeSnippet>
							),
						})}
					</p>
				</div>
				<div>
					<div className="ibp-remove-consenter-confirm">{translate('remove_consenter_confirm')}</div>
					<Form
						scope={SCOPE}
						id={SCOPE + '-remove'}
						fields={[
							{
								name: 'confirm_consenter_url',
								tooltip: 'remove_consenter_name_tooltip',
							},
						]}
						onChange={data => {
							this.props.updateState(SCOPE, {
								disableRemove: data.confirm_consenter_url !== host,
							});
						}}
					/>
				</div>
			</WizardStep>
		);
	}

	renderUpdate(translate) {
		let name = this.props.consenter.node.display_name;
		const disableUpdate = this.props.confirm_consenter_name !== name;
		return (
			<WizardStep type="WizardStep"
				title="update_consenter"
				disableSubmit={disableUpdate}
			>
				<div>
					<p>
						{RenderParamHTML(translate, 'update_consenter_system_channel_desc', {
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
						})}
					</p>
				</div>
				<div className="ibp-consenter-new-cert">
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
								default: this.props.consenter.node.client_tls_cert,
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
				onSubmit={mode === 'delete' ? this.removeConsenter : this.updateOrdererCerts}
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
	disableRemove: PropTypes.bool,
	confirm_consenter_url: PropTypes.string,
	confirm_consenter_name: PropTypes.string,
	mode: PropTypes.string,
};

OrdererConsenterModal.propTypes = {
	...dataProps,
	consenter: PropTypes.object,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
	orderer: PropTypes.object,
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
)(withTranslation()(OrdererConsenterModal));
