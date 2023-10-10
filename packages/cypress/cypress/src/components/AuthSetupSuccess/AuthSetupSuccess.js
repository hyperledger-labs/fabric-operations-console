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
import Helper from '../../utils/helper';

const SCOPE = 'authUsers';

class AuthSetupSuccess extends Component {
	cName = 'AuthSetupSuccess';

	render = () => {
		const contactEmail = this.props.adminContactEmail ? this.props.adminContactEmail : '';
		const translate = this.props.translate;
		return (
			<div>
				<p className="ibp__auth-title">{translate('success')}</p>
				<div>
					<p className="ibp__auth-success-desc ibp__auth-success-bold">{translate('auth_setup_success_1')}</p>
					<p className="ibp__auth-success-desc">{translate('auth_setup_success_3')}</p>
					<p className="ibp__auth-success-desc">{translate('auth_setup_success_4', { adminContactEmail: contactEmail })}</p>
				</div>

				<div className="ibp__auth-configuration--buttons-container">
					<button
						onClick={this.props.onProceed}
						id="ibp__proceed_to_login_btn"
						className="ibp__auth-configuration--buttons ibp__auth-configuration--continue-button"
					>
						{translate('proceed_to_login')}
					</button>
				</div>
			</div>
		);
	};
}

const dataProps = {
	adminContactEmail: PropTypes.array,
};

AuthSetupSuccess.propTypes = {
	...dataProps,
	onBack: PropTypes.func,
	onProceed: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{}
)(withLocalize(AuthSetupSuccess));
