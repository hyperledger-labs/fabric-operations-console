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
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import IdentityApi from '../../rest/IdentityApi';
import Helper from '../../utils/helper';
import JsonInput from '../JsonInput/JsonInput';
import Logger from '../Log/Logger';
import SidePanel from '../SidePanel/SidePanel';
import StitchApi from '../../rest/StitchApi';

const SCOPE = 'addIdentityModal';
const Log = new Logger(SCOPE);

export class AddIdentityModal extends Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			data: [],
			disableSubmit: true,
			submitting: false,
			error: null,
			parsed: null,
		});
	}

	componentWillUnmount() {
		this.props.updateState(SCOPE, {
			data: [],
		});
	}

	onChange = (data, valid) => {
		this.props.updateState(SCOPE, {
			data,
			disableSubmit: !valid,
		});
		if (this.props.error && !data.length && !valid) {
			this.props.updateState(SCOPE, {
				error: null,
			});
		}
		if (data && data.length && data[0].cert) {
			if (!this.props.parsed) {
				this.props.updateState(SCOPE, {
					parsed: StitchApi.parseCertificate(data[0].cert),
				});
			}
		} else {
			if (this.props.parsed) {
				this.props.updateState(SCOPE, {
					parsed: null,
				});
			}
		}
	};

	onError = error => {
		this.props.updateState(SCOPE, {
			error: {
				title: error,
			},
		});
	};

	onSubmit = () => {
		this.props.updateState(SCOPE, {
			submitting: true,
			disableSubmit: true,
			error: null,
		});
		IdentityApi.createIdentity(this.props.data)
			.then(ids => {
				this.props.onComplete(ids);
				this.sidePanel.closeSidePanel();
			})
			.catch(error => {
				Log.error(error);
				this.props.updateState(SCOPE, {
					submitting: false,
					disableSubmit: false,
					error: error.title
						? error
						: {
							title: 'error_add_identity',
							details: error,
						  },
				});
			});
	};

	render() {
		const translate = this.props.translate;
		return (
			<SidePanel
				id="add-identity"
				closed={this.props.onClose}
				ref={sidePanel => (this.sidePanel = sidePanel)}
				buttons={[
					{
						id: 'cancel',
						text: translate('cancel'),
					},
					{
						id: 'add_identity',
						text: translate('add_identity'),
						onClick: this.onSubmit,
						disabled: this.props.disableSubmit,
						type: 'submit',
					},
				]}
				error={this.props.error}
				submitting={this.props.submitting}
			>
				<div>
					<div className="ibp-modal-title">
						<h1 className="ibm-light">{translate('add_identity')}</h1>
					</div>
					<div>
						<div>
							<p className="ibp-modal-desc">
								{translate('add_identity_desc')}
								<a
									className="ibp-identity-modal-learn-more"
									href={translate('console_identities_docs', { DOC_PREFIX: this.props.docPrefix })}
									target="_blank"
									rel="noopener noreferrer"
								>
									{translate('find_more_here')}
								</a>
							</p>
						</div>
						<div>
							<JsonInput
								id="addIdentity"
								definition={[
									{
										name: 'name',
										tooltip: 'add_identity_name_tooltip',
										required: true,
										specialRules: Helper.SPECIAL_RULES_IDENTITY_NAME,
									},
									{
										name: 'cert',
										required: true,
										type: 'certificate',
										tooltip: 'add_identity_cert_tooltip',
										validate: Helper.isCertificate,
									},
									{
										name: 'private_key',
										required: true,
										tooltip: 'add_identity_private_key_tooltip',
										type: 'private_key',
										validate: Helper.isPrivateKey,
									},
								]}
								onChange={this.onChange}
								onError={this.onError}
								uniqueNames={true}
								singleInput={true}
							/>
						</div>
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
					</div>
				</div>
			</SidePanel>
		);
	}
}

const dataProps = {
	data: PropTypes.array,
	submitting: PropTypes.bool,
	disableSubmit: PropTypes.bool,
	error: PropTypes.any,
	parsed: PropTypes.object,
};

AddIdentityModal.propTypes = {
	...dataProps,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
	updateState: PropTypes.func,
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['docPrefix'] = state['settings'] ? state['settings']['docPrefix'] : null;
		return newProps;
	},
	{
		updateState,
	}
)(withLocalize(AddIdentityModal));
