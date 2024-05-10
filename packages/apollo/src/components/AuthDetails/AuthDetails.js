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
import Form from '../Form/Form';

export class AuthDetails extends Component {
	cName = 'AuthDetails';

	constructor(props) {
		super(props);
		this.state = {
			isModeManual: false,
		};
	}

	toggleMode = () => {
		this.setState({ isModeManual: !this.state.isModeManual });
	};

	componentDidMount() {
		if (!this.props.configJson && this.props.clientId && this.props.tenantId && this.props.secret && this.props.oauthServerUrl) {
			this.setState({ isModeManual: true });
		}
	}

	handleInputChange = event => {
		this.props.updateState(this.props.scope, {
			configJson: '',
		});
	};

	retrieveDataFromJson = obj => {
		try {
			let data = JSON.parse(obj.configJson);
			let error_message;
			if (!data.clientId) {
				error_message = 'error_auth_clientId';
			} else if (!data.oauthServerUrl) {
				error_message = 'error_auth_oauthServerUrl';
			} else if (!data.secret) {
				error_message = 'error_auth_secret';
			} else if (!data.tenantId) {
				error_message = 'error_auth_tenantId';
			}
			this.props.updateState(this.props.scope, {
				clientId: data.clientId,
				oauthServerUrl: data.oauthServerUrl,
				secret: data.secret,
				tenantId: data.tenantId,
				configJson: obj.configJson,
				error: error_message,
			});
		} catch (err) {
			this.props.updateState(this.props.scope, {
				error: 'error_auth_config_json',
				configJson: obj.configJson,
			});
			return;
		}
	};

	render = () => {
		const translate = this.props.t;
		return (
			<div>
				{!this.state.isModeManual && (
					<JSONDataEntry
						id="appid_json_input"
						placeholder="copy_json_placeholder"
						toolTip="json_configuration_tooltip"
						value={this.props.configJson}
						onChange={this.retrieveDataFromJson}
						scope={this.props.scope}
					/>
				)}

				{this.state.isModeManual && (
					<ManualDataEntry
						handleInputChange={this.handleInputChange}
						clientId={this.props.clientId}
						oauthServerUrl={this.props.oauthServerUrl}
						secret={this.props.secret}
						tenantId={this.props.tenantId}
						scope={this.props.scope}
					/>
				)}

				<div className="ibp__auth-configuration--manual"
					onClick={this.toggleMode}
				>
					{!this.state.isModeManual && translate('enter_manually')}
					{this.state.isModeManual && translate('enter_json')}
				</div>

				{this.props.error && !this.state.isModeManual && (
					<div className="ibp__auth-configuration--error-message">
						<InlineNotification kind="error"
							title={translate(this.props.error)}
							subtitle=""
							hideCloseButton={true}
						/>
					</div>
				)}
			</div>
		);
	};
}

AuthDetails.propTypes = {
	updateState: PropTypes.func,
	clientId: PropTypes.string,
	oauthServerUrl: PropTypes.string,
	secret: PropTypes.string,
	tenantId: PropTypes.string,
	configJson: PropTypes.string,
	scope: PropTypes.string,
	error: PropTypes.string,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		return {};
	},
	{
		updateState,
	}
)(withTranslation()(AuthDetails));

function JSONDataEntry(props) {
	return (
		<div>
			<Form
				scope={props.scope}
				id={props.scope}
				fields={[
					{
						name: 'configJson',
						label: 'config_json',
						type: 'textarea',
						placeholder: props.placeholder,
						required: true,
						tooltip: props.toolTip,
						default: props.value,
					},
				]}
				onChange={props.onChange}
			/>
		</div>
	);
}
JSONDataEntry.propTypes = {
	placeholder: PropTypes.string,
	toolTip: PropTypes.string,
	value: PropTypes.string,
	onChange: PropTypes.func,
	scope: PropTypes.string,
};

function ManualDataEntry(props) {
	return (
		<div className="ibp__auth-auth-manual">
			<Form
				scope={props.scope}
				id={props.scope}
				fields={[
					{
						name: 'clientId',
						label: 'client_id',
						placeholder: 'client_id_placeholder',
						required: true,
						default: props.clientId,
					},
					{
						name: 'oauthServerUrl',
						label: 'oauth_server_url',
						placeholder: 'oauth_server_url_placeholder',
						required: true,
						default: props.oauthServerUrl,
					},
					{
						name: 'secret',
						placeholder: 'secret_placeholder',
						required: true,
						default: props.secret,
					},
					{
						name: 'tenantId',
						label: 'tenant_id',
						placeholder: 'tenant_id_placeholder',
						required: true,
						default: props.tenantId,
					},
				]}
				onChange={props.handleInputChange}
			/>
		</div>
	);
}
ManualDataEntry.propTypes = {
	handleInputChange: PropTypes.func,
	clientId: PropTypes.string,
	oauthServerUrl: PropTypes.string,
	secret: PropTypes.string,
	tenantId: PropTypes.string,
	scope: PropTypes.string,
};
