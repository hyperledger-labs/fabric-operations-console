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
import { showError, updateState } from '../../redux/commonActions';
import Helper from '../../utils/helper';
import AuthDetails from '../AuthDetails/AuthDetails';

const SCOPE = 'authConfiguration';

class AuthSetupConfiguration extends Component {
	cName = 'AuthSetupConfigurationComponent';

	render = () => {
		const translate = this.props.translate;
		return (
			<div>
				<p className="ibp__auth-title">{translate('configuration')}</p>
				<p className="ibp__auth-desc">{translate('configuration_desc1')}</p>
				<p className="ibp__auth-desc">{translate('configuration_desc2')}</p>

				<AuthDetails
					clientId={this.props.clientId}
					oauthServerUrl={this.props.oauthServerUrl}
					secret={this.props.secret}
					tenantId={this.props.tenantId}
					configJson={this.props.configJson}
					scope={SCOPE}
					error={this.props.error}
				/>

				<div className="ibp__auth-configuration--buttons-container">
					<button onClick={this.props.onBack}
						id="auth-back-btn"
						className="ibp__auth-configuration--buttons ibp__auth-configuration--back-button"
					>
						{translate('back')}
					</button>
					<button
						id="auth-submit-btn"
						onClick={this.props.onNext}
						disabled={!this.props.clientId || !this.props.tenantId || !this.props.secret || !this.props.oauthServerUrl}
						className="ibp__auth-configuration--buttons ibp__auth-configuration--continue-button"
					>
						{translate('next')}
					</button>
				</div>
			</div>
		);
	};
}

const dataProps = {
	clientId: PropTypes.string,
	oauthServerUrl: PropTypes.string,
	secret: PropTypes.string,
	tenantId: PropTypes.string,
	configJson: PropTypes.string,
};

AuthSetupConfiguration.propTypes = {
	...dataProps,
	onBack: PropTypes.func,
	onNext: PropTypes.func,
	updateState: PropTypes.func,
	showError: PropTypes.func,
	error: PropTypes.string,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
		showError,
	}
)(withLocalize(AuthSetupConfiguration));
