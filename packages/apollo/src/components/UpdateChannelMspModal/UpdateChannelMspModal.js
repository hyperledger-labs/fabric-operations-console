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
import { WarningFilled16 } from '@carbon/icons-react/es';
import { Checkbox } from 'carbon-components-react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import ChannelApi from '../../rest/ChannelApi';
import IdentityApi from '../../rest/IdentityApi';
import { MspRestApi } from '../../rest/MspRestApi';
import { OrdererRestApi } from '../../rest/OrdererRestApi';
import StitchApi from '../../rest/StitchApi';
import * as constants from '../../utils/constants';
import Helper from '../../utils/helper';
import CertificateList from '../CertificateList/CertificateList';
import Form from '../Form/Form';
import Logger from '../Log/Logger';
import Wizard from '../Wizard/Wizard';
import WizardStep from '../WizardStep/WizardStep';

const SCOPE = 'updateChannelMspModal';
const Log = new Logger(SCOPE);

class UpdateChannelMspModal extends React.Component {
	componentDidMount() {
		this.getMsps();
		this.resetState();
	}

	componentWillUnmount() {
		this.resetState();
	}

	resetState() {
		this.props.updateState(SCOPE, {
			loading: false,
			orderers: [],
			disableSubmit: true,
			enableOU: !this.props.msp.node_ou,
			error: null,
			selectedOrderer: null,
			showCertDetails: false,
		});
	}

	getMsps = () => {
		let msps = [];
		this.props.updateState(SCOPE, { loading: true });
		MspRestApi.getAllMsps()
			.then(nodes => {
				nodes.forEach(node => {
					//Check if same mspid
					if (node.msp_id === this.props.msp.msp_id) {
						msps.push({ ...node });
					}
				});
				this.props.updateState(SCOPE, {
					msps,
				});
				if (!this.props.orderer) {
					// No orderer associated to channel
					this.getAvailableOrderers();
				}
			})
			.catch(error => {
				Log.error(error);
				this.props.updateState(SCOPE, { msps, loading: false });
				if (!this.props.orderer) {
					this.getAvailableOrderers();
				}
			});
	};

	getAvailableOrderers() {
		OrdererRestApi.getOrderers()
			.then(orderers => {
				this.props.updateState(SCOPE, {
					orderers,
					loading: false,
				});
			})
			.catch(error => {
				Log.error(error);
				this.setError({
					title: 'error_orderers',
					details: error,
				});
				this.props.updateState(SCOPE, { orderers: [], loading: false });
			});
	}

	onUpload = (data, valid) => {
		Log.debug('Uploaded json: ', data, valid);
		this.setError('');

		let json = data && data.length ? data[0] : null;
		let isSameMsp = true;
		if (json && json.msp_id) {
			// if updating msp definition, verify if msp id matches
			if (this.props.msp.msp_id !== json.msp_id) {
				this.setError('edit_msp_mspid_error');
				isSameMsp = false;
			}
		}

		valid = valid && isSameMsp;

		if (json) {
			this.props.updateState(SCOPE, {
				msp_id: json.msp_id,
				msp_name: json.name || json.display_name,
				rootCerts: json.root_certs ? json.root_certs.map(x => {
					return { cert: x };
				}) : [] /* prettier-ignore */,
				intermediate_certs: json.intermediate_certs,
				admins: json.admins ? json.admins.map(x => {
					return { cert: x };
				}) : [] /* prettier-ignore */,
				tls_root_certs: json.tls_root_certs,
				tls_intermediate_certs: json.tls_intermediate_certs,
				host_url: json.host_url,
				revocation_list: json.revocation_list,
				organizational_unit_identifiers: json.organizational_unit_identifiers,
				fabric_node_ous: json.fabric_node_ous,
				disableSubmit: !valid,
			});
		} else {
			this.props.updateState(SCOPE, {
				disableSubmit: true,
			});
		}
	};

	async populateMSP(new_msp_definition) {
		let submit_identity_options = [];
		try {
			submit_identity_options = await IdentityApi.getIdentitiesForMsp(new_msp_definition);
		} catch (e) {
			submit_identity_options = await IdentityApi.getIdentities();
		}
		this.props.updateState(SCOPE, {
			selected_msp: new_msp_definition,
			msp_id: new_msp_definition.msp_id,
			msp_name: new_msp_definition.name,
			rootCerts: new_msp_definition.root_certs ? new_msp_definition.root_certs.map(x => {
				return { cert: x };
			}) : [] /* prettier-ignore */,
			intermediate_certs: new_msp_definition.intermediate_certs,
			admins: new_msp_definition.admins ? new_msp_definition.admins.map(x => {
				return { cert: x };
			}) : [] /* prettier-ignore */,
			tls_root_certs: new_msp_definition.tls_root_certs,
			tls_intermediate_certs: new_msp_definition.tls_intermediate_certs,
			host_url: new_msp_definition.host_url,
			revocation_list: new_msp_definition.revocation_list,
			organizational_unit_identifiers: new_msp_definition.organizational_unit_identifiers,
			fabric_node_ous: new_msp_definition.fabric_node_ous,
			submit_identity_options,
			submit_identity: null,
			disableSubmit: !this.props.isOrdererMSP,
		});
	}

	async onSelectMSP(event) {
		await this.populateMSPAdmins();
		if (event.selectedMsp) {
			this.populateMSP(event.selectedMsp);
		}
		if (event.submit_identity) {
			this.props.updateState(SCOPE, {
				disableSubmit: false,
			});
		}
	}

	onError = error => {
		this.setError(error);
	};

	setError(error) {
		this.props.updateState(SCOPE, { error });
		this.props.updateState('wizard', { error });
	}

	onCancel = () => {
		this.props.updateState(SCOPE, {
			submit_identity_options: null,
		});
		this.props.onClose();
	}

	onSubmit = () => {
		this.props.updateState(SCOPE, {
			loading: true,
			disableSubmit: true,
			error: null,
		});
		if (!this.props.msp_id || !this.props.msp_name || this.props.rootCerts.length === 0 || this.props.admins.length === 0) {
			// required fields
			this.props.updateState(SCOPE, {
				loading: false,
			});
			this.setError('error_required_fields');
		} else {
			const new_msp_definition = {
				type: 'msp',
				msp_id: this.props.msp_id,
				display_name: this.props.msp_name,
				root_certs: this.props.rootCerts.filter(x => x.cert !== '').map(x => x.cert),
				admins: this.props.admins.filter(x => x.cert !== '').map(x => x.cert),
				intermediate_certs: this.props.intermediate_certs,
				certificate: this.props.certificate,
				tls_root_certs: this.props.tls_root_certs,
				tls_intermediate_certs: this.props.tls_intermediate_certs,
				revocation_list: this.props.revocation_list,
				organizational_unit_identifiers: this.props.organizational_unit_identifiers,
				fabric_node_ous: this.props.fabric_node_ous,
			};

			if (!_.get(new_msp_definition, 'fabric_node_ous.enable', false) && this.props.enableOU) {
				new_msp_definition.fabric_node_ous = ChannelApi.getNodeOUIdentifier(new_msp_definition.root_certs[0]);
			}
			let consenterUrl;
			let orderer = this.props.orderer ? this.props.orderer : this.props.selectedOrderer;
			if (_.has(orderer, 'raft') && this.props.consenters) {
				// Use the orderer node that is in the channel consenter set
				const consenter_addresses = this.props.consenters.map(x => x.host + ':' + x.port);
				const consenter = orderer.raft.find(x => consenter_addresses.includes(_.toLower(x.backend_addr)));
				consenterUrl = consenter.url2use;
			}

			let options = {
				channel_id: this.props.channelId,
				msp_id: this.props.msp.id || this.props.msp.msp_id,
				orderer_host: consenterUrl ? consenterUrl : orderer.url2use,
				cluster_id: orderer.cluster_id,
				client_cert_b64pem: this.props.submit_identity ? this.props.submit_identity.cert : this.props.cert,
				client_prv_key_b64pem: this.props.submit_identity ? this.props.submit_identity.private_key : this.props.privateKey,
				configtxlator_url: this.props.configtxlator_url,
				payload: new_msp_definition,
			};

			if (this.props.isOrdererMSP) {
				options.msp_id = this.props.peer.msp_id;
				options.host_url = this.props.host_url;
			}
			Log.info('Updating MSP definition of channel: ', this.props.channelId, options);
			return new Promise((resolve, reject) => {
				this.props.updateState(SCOPE, {
					loading: true,
					disableSubmit: true,
					error: null,
				});
				ChannelApi.updateChannelMSPDefinition(options, this.props.isOrdererMSP, this.props.ordererAdmin)
					.then(resp => {
						Log.info('Channel was updated successfully: ', resp);
						this.props.onComplete(this.props.msp.id || this.props.msp.msp_id, this.props.isOrdererMSP);
						resolve();
						this.props.updateState(SCOPE, {
							submit_identity_options: null,
						});
					})
					.catch(error => {
						Log.error(error);
						let error_msg = 'error_update_channel';
						if (error && typeof error === 'string' && error.indexOf('no differences detected between original and updated config') >= 0) {
							error_msg = 'no_msp_changes';
						}
						if (
							error &&
							error.grpc_resp &&
							error.grpc_resp.statusMessage &&
							error.grpc_resp.statusMessage.indexOf('signature set did not satisfy policy') >= 0
						) {
							error_msg = 'error_sync_channel';
						}
						this.props.updateState(SCOPE, {
							loading: false,
							disableSubmit: false,
							submit_identity_options: null,
						});
						reject({
							title: error_msg,
							details: error,
						});
					});
			});
		}
	};

	renderSelectOrderer(translate) {
		if (this.props.orderer) {
			return;
		} else {
			return (
				<WizardStep
					type="WizardStep"
					headerDesc={translate('update_channel_msp_desc')}
					title={translate('select_orderer')}
					desc={translate('select_orderer_description')}
					tooltip={translate('select_orderer_tooltip')}
					disableSubmit={!this.props.selectedOrderer}
				>
					<Form
						scope={SCOPE}
						id={SCOPE + '-orderer'}
						fields={[
							{
								name: 'selectedOrderer',
								type: 'dropdown',
								options: this.props.orderers,
								default: 'select_orderer_2',
							},
						]}
					/>
				</WizardStep>
			);
		}
	}

	getMSPUpdateFields() {
		let fields = [
			{
				name: 'selectedMsp',
				type: 'dropdown',
				required: true,
				options: this.props.msps,
				default: 'select_msp_id',
			},
		];
		if (this.props.submit_identity_options && !this.props.isOrdererMSP && this.props.adminIdentites) {
			fields.push({
				label: 'msp_admin_type_label',
				name: 'admin_identity',
				type: 'component',
				default:
					this.props.adminIdentites.map((val, idx) =>
						<div key={idx}>
							<p className='admin-identity-name'>{val}</p>
						</div>),
				readonly: true,
				tooltip: 'msp_admin_type_tooltip',
				tooltipDirection: 'top',
			});
		}
		if (!this.props.isOrdererMSP) {
			fields.push({
				name: 'submit_identity',
				type: 'dropdown',
				options: this.props.submit_identity_options,
				label: 'signature_for_submit_identity',
				default: 'select_identity',
			});
		}
		return fields;
	}

	populateMSPAdmins() {
		const mspCerts = [];
		const admin_identites = [];
		if (this.props.orgNodes && this.props.orgNodes[this.props.msp.id]) {
			mspCerts.root_certs = this.props.orgNodes[this.props.msp.id].values_map.MSP.value.root_certs_list;
			mspCerts.intermediate_certs = this.props.orgNodes[this.props.msp.id].values_map.MSP.value.intermediate_certs_list;
			IdentityApi.getIdentitiesForMsp(mspCerts).then(mspIdentities => {
				mspIdentities.forEach(value => {
					const parsed_msp_cert = StitchApi.parseCertificate(value.cert);
					if (admin_identites.length < 6) {
						if (parsed_msp_cert.subject_parts.OU === 'admin') {
							admin_identites.push(value.name);
						}
					}
					this.props.updateState(SCOPE, {
						adminIdentites: admin_identites,
					});
				});
			});
		}
	}

	renderUploadMSPDefinition(translate) {
		return (
			<WizardStep
				type="WizardStep"
				headerDesc={translate('update_channel_msp_desc')}
				title={translate('select_new_def')}
				desc={translate('select_new_def_desc')}
				tooltip={translate('json_upload_tooltip')}
				disableSubmit={this.props.disableSubmit}
			>
				<div className={this.props.loading ? 'hidden_section' : 'ibp-import-msp'}>
					<div id="update-msp-dropdown">
						<Form scope={SCOPE}
							id={SCOPE + '-msp'}
							fields={this.getMSPUpdateFields()}
							onChange={event => this.onSelectMSP(event)}
						/>
					</div>
				</div>
			</WizardStep>
		);
	}

	enableOU(translate) {
		if (_.get(this.props, 'msp.host_url') !== this.props.host_url) {
			return;
		}
		return (
			<Checkbox
				id={'enable_node_ou'}
				labelText={translate('node_ou')}
				checked={this.props.enableOU}
				onClick={event => {
					this.props.updateState(SCOPE, {
						enableOU: event.target.checked,
					});
				}}
			/>
		);
	}

	renderCurrentCerts(translate) {
		const admins = _.get(this.props, 'msp.admins');
		if (!admins) {
			return;
		}
		const parsed = [];
		let last = undefined;
		admins.forEach(cert => {
			const parsed_cert = StitchApi.parseCertificate(cert);
			if (last === undefined || parsed_cert.not_after_ts > last) {
				last = parsed_cert.not_after_ts;
			}
			parsed.push(parsed_cert);
		});
		const timeNow = new Date().getTime();
		let diff = last !== undefined ? last - timeNow : undefined;
		let days = diff !== undefined ? diff / (1000 * 3600 * 24) : undefined;
		return (
			<div className="ibp-modal-desc">
				{days !== undefined && days < constants.CERTIFICATE_WARNING_DAYS ? (
					<p className="ibp-msp-cert-expiry">
						<WarningFilled16 />
						{translate('admin_certs_expiry') + ': ' + Helper.fromNow(last, translate)}
					</p>
				) : (
					<p>{translate('admin_certs_expiry') + ': ' + Helper.fromNow(last, translate)}</p>
				)}
				{this.props.showCertDetails && <CertificateList parsed={parsed} />}
				<div className="ibp-toggle-cert-details">
					<button
						id="toggleCertDetails"
						className="ibp-link"
						onClick={() => {
							this.props.updateState(SCOPE, {
								showCertDetails: !this.props.showCertDetails,
							});
						}}
					>
						{translate(this.props.showCertDetails ? 'hide_cert_details' : 'show_cert_details')}
					</button>
				</div>
			</div>
		);
	}

	render() {
		const translate = this.props.t;
		return (
			<Wizard
				title="update_msp_definition"
				disable_focus_trap={true}
				loading={this.props.loading}
				onClose={this.onCancel}
				onSubmit={this.onSubmit}
				submitButtonLabel={translate('update_msp_definition')}
				error={this.props.error}
			>
				{!this.props.msp.node_ou && this.renderCurrentCerts(translate)}
				{!this.props.msp.node_ou && this.enableOU(translate)}
				{!this.props.orderer && this.renderSelectOrderer(translate)}
				{this.renderUploadMSPDefinition(translate)}
			</Wizard>
		);
	}
}

const dataProps = {
	loading: PropTypes.bool,
	adminIdentites: PropTypes.array,
	error: PropTypes.string,
	msps: PropTypes.array,
	orderers: PropTypes.array,
	selectedOrderer: PropTypes.object,
	msp_id: PropTypes.string,
	msp_name: PropTypes.string,
	rootCerts: PropTypes.array,
	admins: PropTypes.array,
	intermediate_certs: PropTypes.array,
	certificate: PropTypes.object,
	tls_root_certs: PropTypes.array,
	tls_intermediate_certs: PropTypes.array,
	host_url: PropTypes.string,
	revocation_list: PropTypes.array,
	organizational_unit_identifiers: PropTypes.array,
	fabric_node_ous: PropTypes.object,
	enableOU: PropTypes.bool,
	disableSubmit: PropTypes.bool,
	submit_identity: PropTypes.object,
	submit_identity_options: PropTypes.object,
	isOrdererAssociated: PropTypes.bool,
	selectedMsp: PropTypes.object,
	isOrdererMSP: PropTypes.bool,
	ordererAdmin: PropTypes.bool,
	showCertDetails: PropTypes.bool,
};

UpdateChannelMspModal.propTypes = {
	...dataProps,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
	updateState: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['host_url'] = state['settings'] ? state['settings']['host_url'] : null;
		return newProps;
	},
	{
		updateState,
	}
)(withTranslation()(UpdateChannelMspModal));
