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
import { createTheme, ThemeProvider } from '@mui/material/styles';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import { showError } from '../../redux/commonActions';
import ConfigureAuthApi from '../../rest/ConfigureAuthApi';
import AuthSetupAddUsers from '../AuthSetupAddUsers/AuthSetupAddUsers';
import AuthSetupAuthentication from '../AuthSetupAuthentication/AuthSetupAuthentication';
import AuthSetupConfiguration from '../AuthSetupConfiguration/AuthSetupConfiguration';
import AuthSetupSuccess from '../AuthSetupSuccess/AuthSetupSuccess';
import Stepper from '../Stepper/Stepper';
import TitleBar from '../TitleBar/TitleBar';

const theme = createTheme({
	typography: {
		useNextVariants: true,
	},
});

const SCOPE = 'authSetup';

export class AuthSetup extends Component {
	cName = 'AuthSetupComponent';
	steps = [
		{
			stepName: 'Authentication',
			stepId: 1,
		},
		{
			stepName: 'Configuration',
			stepId: 2,
		},
		{
			stepName: 'Administrator details',
			stepId: 3,
		},
	];

	constructor(props) {
		super(props);
		this.state = {
			currentStep: 1,
		};
	}

	onNext = () => {
		this.setState({
			currentStep: this.state.currentStep + 1,
		});
	};

	onBack = () => {
		this.setState({
			currentStep: this.state.currentStep - 1,
		});
	};

	submitAndContinue = () => {
		let body = {
			auth_scheme: 'appid',
			oauth_url: this.props.oauthServerUrl,
			secret: this.props.secret,
			tenant_id: this.props.tenantId,
			client_id: this.props.clientId,
			admin_contact_email: this.props.adminContactEmail,
		};
		ConfigureAuthApi.configureAuthScheme(body).then(resp => {
			if (resp.message === 'ok') {
				let opts = {
					users: {
						[this.props.adminContactEmail]: {
							roles: ['reader', 'writer', 'manager'],
						},
					},
				};
				ConfigureAuthApi.addUsers(opts).then(resp => {
					if (resp.message === 'ok') {
						this.setState({ isUpdated: true });
						this.onNext();
					} else {
						this.props.showError('error_auth_setup', {}, SCOPE);
					}
				});
			} else {
				this.props.showError('error_auth_setup', {}, SCOPE);
			}
		});
	};

	onProceedToLogin = () => {
		window.location.reload();
	};

	render = () => {
		const translate = this.props.t;
		return (
			<ThemeProvider theme={theme}>
				<div>
					<Router>
						<TitleBar hideButtons />
					</Router>
					<div className="ibp__auth">
						<p className="ibp__auth-welcome-message">{translate('welcome_to_optools')}</p>

						{this.state.currentStep < 4 && (
							<div>
								<p className="ibp__auth-outline">{translate('setup_otline')}</p>
								<Stepper stepItems={this.steps}
									currentStep={this.state.currentStep}
								/>
							</div>
						)}

						{this.state.currentStep === 1 && <AuthSetupAuthentication onNext={this.onNext} />}

						{this.state.currentStep === 2 && <AuthSetupConfiguration onBack={this.onBack}
							onNext={this.onNext}
						/>}

						{this.state.currentStep === 3 && <AuthSetupAddUsers onBack={this.onBack}
							onNext={this.submitAndContinue}
						/>}

						{this.state.currentStep === 4 && <AuthSetupSuccess onBack={this.onBack}
							onProceed={this.onProceedToLogin}
						/>}
					</div>
				</div>
			</ThemeProvider>
		);
	};
}

AuthSetup.propTypes = {
	adminContactEmail: PropTypes.array,
	clientId: PropTypes.string,
	oauthServerUrl: PropTypes.string,
	secret: PropTypes.string,
	tenantId: PropTypes.string,
	showError: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		return {
			clientId: state.authConfiguration ? state.authConfiguration.clientId : '',
			oauthServerUrl: state.authConfiguration ? state.authConfiguration.oauthServerUrl : '',
			secret: state.authConfiguration ? state.authConfiguration.secret : '',
			tenantId: state.authConfiguration ? state.authConfiguration.tenantId : '',
			adminContactEmail: state.authUsers ? state.authUsers.adminContactEmail : '',
		};
	},
	{
		showError,
	}
)(withTranslation()(AuthSetup));
