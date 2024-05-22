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
import { CertificateAuthorityRestApi } from '../../rest/CertificateAuthorityRestApi';
import Clipboard from '../../utils/clipboard';
import Helper from '../../utils/helper';
import Form from '../Form/Form';
import Logger from '../Log/Logger';
import Wizard from '../Wizard/Wizard';
import WizardStep from '../WizardStep/WizardStep';
import RenderParamHTML from '../RenderHTML/RenderParamHTML';

const SCOPE = 'deleteCAModal';
const Log = new Logger(SCOPE);

class DeleteCAUserModal extends React.Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			disableRemove: true,
			error: null,
		});
	}

	deleteUser = async() => {
		try {
			await await CertificateAuthorityRestApi.deleteUser(this.props.ca, this.props.selectedUser.id);
			this.props.onComplete();
		} catch (error) {
			Log.error(error);
			if (error && error.stitch_msg && error.stitch_msg.indexOf('Identity removal is disabled') > -1) {
				return Promise.reject({
					title: 'identity_removal_disabled',
					details: error,
				});
			}
			throw error;
		}
	};

	renderRemove(translate) {
		return (
			<WizardStep type="WizardStep"
				title="remove_ca_user"
				disableSubmit={this.props.disableRemove}
			>
				<div className="ibp-remove-ca-user-desc">
					<p>
						{RenderParamHTML(translate, 'remove_ca_user_desc', {
							enroll_id: (
								<CodeSnippet
									type="inline"
									ariaLabel={translate('copy_text', { copyText: this.props.selectedUser.id })}
									onClick={() => Clipboard.copyToClipboard(this.props.selectedUser.id)}
									light={false}
								>
									{this.props.selectedUser.id}
								</CodeSnippet>
							),
						})}
					</p>
				</div>
				<div>
					<div className="ibp-remove-ca-user-confirm">{translate('remove_ca_user_confirm')}</div>
					<Form
						scope={SCOPE}
						id={SCOPE + '-remove'}
						fields={[
							{
								name: 'enroll_id',
								tooltip: 'remove_ca_user_tooltip',
							},
						]}
						onChange={data => {
							this.props.updateState(SCOPE, {
								disableRemove: data.enroll_id !== this.props.selectedUser.id,
							});
						}}
					/>
				</div>
			</WizardStep>
		);
	}

	render() {
		const translate = this.props.t;
		return (
			<Wizard
				onClose={this.props.onClose}
				onSubmit={this.deleteUser}
				submitButtonLabel={translate('remove_ca_user')}
				submitButtonId="confirm_remove"
				error={this.props.error}
			>
				{this.renderRemove(translate)}
			</Wizard>
		);
	}
}

const dataProps = {
	ca: PropTypes.object,
	selectedUser: PropTypes.object,
	disableRemove: PropTypes.bool,
	error: PropTypes.string,
};

DeleteCAUserModal.propTypes = {
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
)(withTranslation()(DeleteCAUserModal));
