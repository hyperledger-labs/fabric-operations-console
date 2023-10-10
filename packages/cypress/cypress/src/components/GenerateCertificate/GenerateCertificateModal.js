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
import { Button } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import { CertificateAuthorityRestApi } from '../../rest/CertificateAuthorityRestApi';
import IdentityApi from '../../rest/IdentityApi';
import Helper from '../../utils/helper';
import Form from '../Form/Form';
import Logger from '../Log/Logger';
import SVGs from '../Svgs/Svgs';
import Wizard from '../Wizard/Wizard';
import WizardStep from '../WizardStep/WizardStep';

const SCOPE = 'generateCertificate';
const Log = new Logger(SCOPE);

class GenerateCertificateModal extends Component {
	constructor(props) {
		super(props);
		this.sidePanel = React.createRef();
	}

	componentDidMount() {
		this.props.updateState(SCOPE, {
			name: null,
			cert: null,
			private_key: null,
			error: null,
			loading: !this.props.selectedUser,
			valid: false,
			userValid: false,
			enroll_id: '',
			enroll_secret: '',
			ca_name: null,
		});
		if (this.props.selectedUser) {
			this.props.updateState(SCOPE, {
				enroll_id: this.props.selectedUser.id,
				enroll_secret: '',
				userValid: false,
			});
		} else {
			this.generateCertificate()
				.then(() => {
					this.props.updateState(SCOPE, {
						loading: false,
					});
				})
				.catch(error => {
					this.props.updateState(SCOPE, {
						loading: false,
						error: error,
					});
				});
		}
	}

	onNext = () => {
		return this.generateCertificate();
	};

	generateCertificate() {
		return new Promise((resolve, reject) => {
			let opts = { ...this.props.ca };
			const ca_name = this.props.ca_name;
			if (this.props.enroll_id) {
				CertificateAuthorityRestApi.generateCertificate(opts, ca_name, this.props.enroll_id, this.props.enroll_secret, this.props.csr_host)
					.then(certificate => {
						this.props.updateState(SCOPE, {
							cert: certificate.certificate,
							private_key: certificate.private_key,
						});
						resolve();
					})
					.catch(error => {
						Log.error(error);
						reject({
							title: 'error_generate_cert',
							details: error,
						});
					});
			} else {
				CertificateAuthorityRestApi.reEnroll(opts)
					.then(certificate => {
						this.props.updateState(SCOPE, {
							cert: certificate.certificate,
							private_key: certificate.private_key,
						});
						resolve();
					})
					.catch(error => {
						Log.error(error);
						reject({
							title: 'error_generate_cert',
							details: error,
						});
					});
			}
		});
	}

	componentWillUnmount() {
		this.props.updateState(SCOPE, {
			cert: null,
			private_key: null,
			ca_name: null,
		});
	}

	onSubmit = () => {
		return new Promise((resolve, reject) => {
			IdentityApi.createIdentity([
				{
					name: this.props.name,
					cert: this.props.cert,
					private_key: this.props.private_key,
				},
			])
				.then(() => {
					resolve(this.props.name);
				})
				.catch(error => {
					Log.error(error);
					reject(error);
				});
		});
	};

	exportIdentity = () => {
		Helper.exportNode({
			name: this.props.name,
			cert: this.props.cert,
			private_key: this.props.private_key,
			type: 'identity',
		});
	};

	renderUserSelection(translate) {
		if (!this.props.selectedUser) {
			return;
		}
		const ca_options = [];
		ca_options.push({
			name: translate('root_ca'),
			value: this.props.ca.msp.ca.name,
		});
		if (this.props.ca.msp.tlsca.name) {
			ca_options.push({
				name: translate('tls_ca'),
				value: this.props.ca.msp.tlsca.name,
			});
		}
		return (
			<WizardStep type="WizardStep"
				disableSubmit={!this.props.userValid}
				onNext={this.onNext}
			>
				<div>
					<p className="ibp-modal-desc">{translate('user_selection_desc')}</p>
				</div>
				<Form
					id={SCOPE}
					scope={SCOPE}
					fields={[
						{
							name: 'selected_ca',
							label: 'ca',
							type: 'dropdown',
							required: true,
							default: ca_options[0],
							options: ca_options,
							tooltip: 'generate_cert_ca_tooltip',
						},
						{
							name: 'enroll_id',
							required: true,
							type: this.props.users && this.props.users.length ? 'dropdown' : 'text',
							tooltip: 'enroll_id_tooltip',
							options: this.props.users.map(user => user.id),
							default: this.props.selectedUser.id,
							translate: false,
						},
						{
							name: 'enroll_secret',
							type: 'password',
							required: true,
							default: '',
							tooltip: 'enroll_secret_tooltip',
						},
						{
							name: 'csr_host',
							required: false,
							default: '',
							tooltip: 'csr_host_tooltip',
						},
					]}
					onChange={(data, valid) => {
						if (data.enroll_id) {
							// new user selected from dropdown
							this.props.updateState(SCOPE, {
								enroll_secret: '',
								userValid: false,
							});
						}
						if (data.enroll_secret) {
							// password changed
							this.props.updateState(SCOPE, {
								userValid: valid,
							});
						}
						if (data.selected_ca) {
							this.props.updateState(SCOPE, {
								ca_name: data.selected_ca.value,
							});
						}
					}}
				/>
			</WizardStep>
		);
	}

	renderCertificate(translate) {
		return (
			<WizardStep type="WizardStep"
				disableSubmit={!this.props.valid || !this.props.cert}
			>
				<div className="ibp-enroll-results">
					<div>
						<p className="ibp-modal-desc">
							{translate('generate_cert_desc', {
								action: translate(this.props.selectedUser ? 'generate_cert' : 'reenroll'),
							})}
						</p>
					</div>
					<Form
						id={SCOPE + '-1'}
						scope={SCOPE}
						fields={[
							{
								name: 'cert',
								tooltip: 'enroll_identity_cert_tooltip',
								readonly: true,
								default: this.props.cert,
								type: 'certificate',
								export: 'certificate',
							},
							{
								name: 'private_key',
								tooltip: 'enroll_identity_private_key_tooltip',
								readonly: true,
								default: this.props.private_key,
								type: 'private_key',
								export: 'private_key',
							},
							{
								name: 'name',
								label: 'identity_display_name',
								tooltip: 'enroll_identity_name_tooltip',
								required: true,
								specialRules: Helper.SPECIAL_RULES_IDENTITY_NAME,
							},
						]}
						onChange={(data, valid) => {
							this.props.updateState(SCOPE, {
								valid: valid,
							});
						}}
					/>
					<div>
						<Button
							id="export"
							kind="secondary"
							className="ibp-ca-modal-enroll-button"
							onClick={this.exportIdentity}
							disabled={!this.props.valid || !this.props.cert}
						>
							<SVGs type="download"
								width="16px"
								height="16px"
								title={translate('export_certs')}
							/>
							{translate('export_certs')}
						</Button>
					</div>
				</div>
			</WizardStep>
		);
	}

	render() {
		const translate = this.props.translate;
		return (
			<Wizard
				title={this.props.selectedUser ? 'generate_cert' : 'reenroll'}
				onClose={this.props.closed}
				onSubmit={this.onSubmit}
				loading={this.props.loading}
				error={this.props.error}
				submitButtonLabel={translate('add_identity_to_wallet')}
			>
				<div />
				{this.renderUserSelection(translate)}
				{this.renderCertificate(translate)}
			</Wizard>
		);
	}
}

const dataProps = {
	name: PropTypes.string,
	cert: PropTypes.string,
	private_key: PropTypes.string,
	ca: PropTypes.object,
	enroll_id: PropTypes.string,
	enroll_secret: PropTypes.string,
	csr_host: PropTypes.string,
	selectedUser: PropTypes.object,
	error: PropTypes.string,
	loading: PropTypes.bool,
	valid: PropTypes.bool,
	userValid: PropTypes.bool,
	users: PropTypes.array,
	ca_name: PropTypes.string,
};

GenerateCertificateModal.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	closed: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
	}
)(withLocalize(GenerateCertificateModal));
