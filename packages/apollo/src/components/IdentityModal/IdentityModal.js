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
import IdentityApi from '../../rest/IdentityApi';
import Clipboard from '../../utils/clipboard';
import Helper from '../../utils/helper';
import Form from '../Form/Form';
import Logger from '../Log/Logger';
import SidePanel from '../SidePanel/SidePanel';
import RenderParamHTML from '../RenderHTML/RenderParamHTML';

const SCOPE = 'identityModal';
const Log = new Logger(SCOPE);

class IdentityModal extends React.Component {
	componentDidMount() {
		const parsed = this.props.identity.cert ? window.stitch.parseCertificate(this.props.identity.cert) : null;
		this.props.updateState(SCOPE, {
			name: this.props.identity.name,
			cert: this.props.identity.cert,
			private_key: this.props.identity.private_key,
			error: null,
			update: false,
			submitting: false,
			remove: false,
			parsed,
		});
	}

	componentWillUnmount() {
		this.props.updateState(SCOPE, {
			cert: null,
			private_key: null,
		});
	}

	updateIdentity = () => {
		if (this.props.identity.name === this.props.name) {
			// update cert and private key only
			this.props.updateState(SCOPE, { submitting: true });
			const identity = {
				...this.props.identity,
				name: this.props.name,
				cert: this.props.cert,
				private_key: this.props.private_key,
			};
			IdentityApi.updateIdentity(identity)
				.then(identities => {
					this.props.onComplete(identities);
					this.sidePanel.closeSidePanel();
				})
				.catch(error => {
					Log.error(error);
					this.props.updateState(SCOPE, {
						error: {
							title: 'error_update_identity',
							details: error,
						},
						submitting: false,
					});
				});
		} else {
			// name change, so create and delete
			this.props.updateState(SCOPE, { submitting: true });
			const identity = {
				...this.props.identity,
				name: this.props.name,
				cert: this.props.cert,
				private_key: this.props.private_key,
			};
			IdentityApi.createIdentity([identity])
				.then(() => {
					IdentityApi.removeIdentity(this.props.identity.name)
						.then(identities => {
							this.props.onComplete(identities);
							this.sidePanel.closeSidePanel();
						})
						.catch(error => {
							// Should we delete the newly created identity?
							Log.error(error);
							this.props.updateState(SCOPE, {
								error: {
									title: 'error_update_identity',
									details: error,
								},
								submitting: false,
							});
						});
				})
				.catch(error => {
					Log.error(error);
					this.props.updateState(SCOPE, {
						error: {
							title: 'error_update_identity',
							details: error,
						},
						submitting: false,
					});
				});
		}
	};

	exportIdentity = () => {
		Helper.exportNode({ ...this.props.identity, type: 'identity' });
	};

	showRemoveIdentity = () => {
		this.props.updateState(SCOPE, {
			remove: true,
			confirm_identity_name: '',
			disableRemove: true,
		});
	};

	hideRemoveIdentity = () => {
		this.props.updateState(SCOPE, { remove: false });
	};

	removeIdentity = () => {
		this.props.updateState(SCOPE, { submitting: true });
		IdentityApi.removeIdentity(this.props.identity.name)
			.then(identities => {
				this.props.onComplete(identities);
				this.sidePanel.closeSidePanel();
			})
			.catch(error => {
				Log.error(error);
				this.props.updateState(SCOPE, {
					error: {
						title: 'error_remove_identity',
						details: error,
					},
					submitting: false,
				});
			});
	};

	getButtons(translate) {
		if (this.props.remove) {
			return [
				{
					id: 'back',
					text: translate('back'),
					onClick: this.hideRemoveIdentity,
					disabled: this.props.submitting,
				},
				{
					id: 'confirm_remove',
					text: translate('remove_identity'),
					onClick: this.removeIdentity,
					disabled: this.props.disableRemove || this.props.submitting,
					type: 'submit',
				},
			];
		}
		return [
			{
				id: 'close',
				text: translate('close'),
			},
			{
				id: 'update_identity',
				text: translate('update_identity'),
				onClick: this.updateIdentity,
				disabled: !this.props.update,
				type: 'submit',
			},
		];
	}

	renderDetails(translate) {
		const fields = [
			{
				name: 'name',
				tooltip: 'edit_identity_name_tooltip',
				tooltipDirection: 'bottom',
				required: true,
				default: this.props.name,
				specialRules: Helper.SPECIAL_RULES_IDENTITY_NAME,
			},
			{
				name: 'cert',
				required: true,
				type: 'certificate',
				tooltip: 'edit_identity_cert_tooltip',
				validate: Helper.isCertificate,
				default: this.props.cert,
				export: 'certificate',
			},
			{
				name: 'private_key',
				required: true,
				type: 'private_key',
				tooltip: 'edit_identity_private_key_tooltip',
				validate: Helper.isPrivateKey,
				default: this.props.private_key,
				export: 'private_key',
			},
		];
		return (
			<div className={this.props.remove ? 'ibp-hidden' : ''}>
				<div className="ibp-modal-title">
					<h1 className="ibm-light">{translate('identity_details')}</h1>
				</div>
				<Form
					scope={SCOPE}
					id={SCOPE}
					fields={fields}
					onChange={(data, valid, field) => {
						if (field.name === 'cert') {
							const parsed = data.cert ? window.stitch.parseCertificate(data.cert) : null;
							this.props.updateState(SCOPE, { parsed });
						}
						const changed = Helper.isChanged(fields, data, this.props, this.props.identity);
						this.props.updateState(SCOPE, {
							update: valid && changed,
						});
					}}
				/>
				{this.props.parsed && (
					<div className="ibp-form">
						<div className="ibp-form-field">
							<label className="ibp-form-label">{translate('expiration_date')}</label>
							<div className="ibp-expiration-date">{new Date(this.props.parsed.not_after_ts).toLocaleString()}</div>
						</div>
						<div className="ibp-form-field">
							<label className="ibp-form-label">{translate('subject')}</label>
							<div className="ibp-expiration-date">{this.props.parsed.subject_parsed}</div>
						</div>
					</div>
				)}
				<p className="ibp-actions-title">{translate('actions')}</p>
				<div>
					<button id="export"
						className="ibp-identity-action bx--btn bx--btn--tertiary bx--btn--sm"
						onClick={this.exportIdentity}
					>
						{translate('export_certs')}
					</button>
					<button id="remove"
						className="ibp-identity-action bx--btn bx--btn--sm bx--btn--danger"
						onClick={this.showRemoveIdentity}
					>
						{translate('remove_identity')}
					</button>
				</div>
			</div>
		);
	}

	renderRemove(translate) {
		return (
			<div className={this.props.remove ? '' : 'ibp-hidden'}>
				<div className="ibp-modal-title">
					<h1 className="ibm-light">{translate('remove_identity')}</h1>
				</div>
				<p className="ibp-remove-identity-desc">
					{RenderParamHTML(translate, 'remove_identity_desc', {
						name: (
							<CodeSnippet
								type="inline"
								ariaLabel={translate('copy_text', { copyText: this.props.identity.name })}
								light={false}
								onClick={() => Clipboard.copyToClipboard(this.props.identity.name)}
							>
								{this.props.identity.name}
							</CodeSnippet>
						),
					})}
				</p>
				<div>
					<div className="ibp-remove-identity-confirm">{translate('remove_identity_confirm')}</div>
					<Form
						scope={SCOPE}
						id={SCOPE + '-remove'}
						fields={[
							{
								name: 'confirm_identity_name',
							},
						]}
						onChange={data => {
							this.props.updateState(SCOPE, {
								disableRemove: data.confirm_identity_name !== this.props.identity.name,
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
				id="identity_Modal"
				closed={this.props.onClose}
				ref={sidePanel => (this.sidePanel = sidePanel)}
				buttons={this.getButtons(translate)}
				error={this.props.error}
				submitting={this.props.submitting}
			>
				{this.renderDetails(translate)}
				{this.renderRemove(translate)}
			</SidePanel>
		);
	}
}

const dataProps = {
	name: PropTypes.string,
	cert: PropTypes.string,
	private_key: PropTypes.string,
	error: PropTypes.string,
	update: PropTypes.bool,
	remove: PropTypes.bool,
	submitting: PropTypes.bool,
	disableRemove: PropTypes.bool,
	confirm_identity_name: PropTypes.string,
	parsed: PropTypes.object,
};

IdentityModal.propTypes = {
	...dataProps,
	identity: PropTypes.object,
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
)(withTranslation()(IdentityModal));
