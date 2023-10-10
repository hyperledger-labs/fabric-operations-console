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

class AuthSetupAuthentication extends Component {
	cName = 'AuthSetupAuthentication';

	render = () => {
		const translate = this.props.translate;
		return (
			<div>
				<p className="ibp__auth-title">{translate('authentication')}</p>
				<p className="ibp__auth-desc">{translate('authentication_desc1')}</p>
				<p className="ibp__auth-desc">{translate('authentication_desc2')}</p>
				<p className="ibp__auth-desc">{translate('authentication_desc3')}</p>

				<div className="ibp__auth-proceed-button-container">
					<a className="ibp__auth-proceed-button-link"
						target="_blank"
						rel="noopener noreferrer"
						href="https://www.ibm.com/cloud/app-id"
					>
						<span>{translate('proceed_to_appid')}</span>
					</a>
				</div>

				<p className="ibp__auth-proceed-to-config">{translate('proceed_to_configuration')}</p>

				<button
					className="ibp__auth-configuration--buttons ibp__auth-configuration--continue-button ibp__auth-continue-button"
					id="btn-continue"
					type="button"
					onClick={this.props.onNext}
				>
					{translate('continue')}
				</button>
			</div>
		);
	};
}

AuthSetupAuthentication.propTypes = {
	onNext: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default withLocalize(AuthSetupAuthentication);
