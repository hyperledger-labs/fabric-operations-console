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
import { InlineNotification } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import Helper from '../../utils/helper';
import Form from '../Form/Form';

const SCOPE = 'authUsers';

class AuthSetupAddUsers extends Component {
	cName = 'AuthSetupAddUserComponent';

	renderError(translate) {
		if (this.props.error) {
			return (
				<div className="ibp-add-users ibp-error-panel">
					<InlineNotification kind="error"
						title={translate(this.props.error)}
						subtitle=""
						hideCloseButton={true}
					/>
				</div>
			);
		}
	}

	render = () => {
		const translate = this.props.t;
		return (
			<div>
				<p className="ibp__auth-title">{translate('admin_details')}</p>
				<p className="ibp__auth-desc">{translate('add_users_desc')}</p>

				<div className="ibp-admin-contact-email">
					<Form
						scope={SCOPE}
						id={SCOPE}
						fields={[
							{
								name: 'adminContactEmail',
								label: 'admin_contact_email',
								placeholder: 'admin_contact_email_placeholder',
								required: true,
								tooltip: 'admin_contact_email_tooltip',
							},
						]}
					/>
				</div>

				{this.renderError(translate)}
				<div className="ibp__auth-configuration--buttons-container">
					<button id="auth-back-btn"
						onClick={this.props.onBack}
						className="ibp__auth-configuration--buttons ibp__auth-configuration--back-button"
					>
						{translate('back')}
					</button>
					<button
						id="auth-submit-btn"
						onClick={this.props.onNext}
						disabled={!this.props.adminContactEmail}
						className="ibp__auth-configuration--buttons ibp__auth-configuration--continue-button"
					>
						{translate('submit')}
					</button>
				</div>
			</div>
		);
	};
}

const dataProps = {
	classes: PropTypes.object,
	adminContactEmail: PropTypes.array,
	error: PropTypes.string,
};

AuthSetupAddUsers.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	onBack: PropTypes.func,
	onNext: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
	}
)(withTranslation()(AuthSetupAddUsers));
