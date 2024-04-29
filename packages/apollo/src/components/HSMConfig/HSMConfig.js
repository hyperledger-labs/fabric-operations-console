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

import { ToggleSmall } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import { NodeRestApi } from '../../rest/NodeRestApi';
import Helper from '../../utils/helper';
import Form from '../Form/Form';
import Logger from '../Log/Logger';
const Log = new Logger('HSMConfig');

const SCOPE = 'hsm';

class HSMConfig extends Component {
	componentDidMount() {
		this.props.updateState(this.props.scope, { hsm: null });
		this.props.updateState(SCOPE, {
			label: null,
			pin: null,
			hsm_settings: false,
			pkcs11endpoint: null,
			show_proxy: !this.props.hsm_settings,
		});
		this.getHSMConfig();
	}

	async getHSMConfig() {
		try {
			let hsmConfig = await NodeRestApi.getHSMConfig();
			this.props.updateState(SCOPE, {
				hsm_settings: hsmConfig && hsmConfig.hsmconfig ? true : false,
				show_proxy: !hsmConfig ? true : false,
			});
		} catch (e) {
			Log.error('Failed to get HSM config');
		}
	}

	render() {
		const fields = [];
		if (this.props.show_proxy) {
			fields.push({
				name: 'pkcs11endpoint',
				label: 'hsm_pkcs11endpoint',
				required: true,
				default: this.props.pkcs11endpoint,
				placeholder: 'hsm_pkcs11endpoint_placeholder',
				tooltip: 'hsm_endpoint_tooltip',
				validate: Helper.isPKCS11Proxy,
				validationErrorMsg: 'input_error_invalid_pkcs11proxy',
			});
		}
		fields.push({
			name: 'label',
			label: 'hsm_label',
			required: true,
			default: this.props.label,
			placeholder: 'hsm_label_placeholder',
			tooltip: 'hsm_label_tooltip',
		});
		fields.push({
			name: 'pin',
			label: 'hsm_pin',
			required: true,
			type: 'password',
			default: this.props.pin,
			placeholder: 'hsm_pin_placeholder',
			tooltip: 'hsm_pin_tooltip',
		});

		return (
			<div>
				{!!this.props.hsm_settings && (
					<div className="ibp-form ibp-hsm-toggle-form">
						<label className="ibp-form-label">{this.props.t('use_hsm_settings')}</label>
						<div className="ibp-form-input">
							<ToggleSmall
								id="use_hsm_settings"
								toggled={!this.props.show_proxy}
								onToggle={() => {
									const data = {
										show_proxy: !this.props.show_proxy,
										pkcs11endpoint: null,
									};
									this.props.updateState(SCOPE, data);
									let hsm = null;
									if (!data.show_proxy && this.props.label && this.props.pin) {
										hsm = {
											label: this.props.label,
											pin: this.props.pin,
											pkcs11endpoint: null,
										};
									}
									this.props.updateState(this.props.scope, { hsm });
								}}
								onChange={() => {}}
								aria-label={this.props.t('use_hsm_settings')}
								labelA={this.props.t('no')}
								labelB={this.props.t('yes')}
							/>
						</div>
					</div>
				)}
				<Form
					scope={SCOPE}
					id="hsm"
					fields={fields}
					onChange={(data, hsm_valid) => {
						let hsm = null;
						if (hsm_valid) {
							hsm = {
								label: this.props.label,
								pin: this.props.pin,
								pkcs11endpoint: this.props.pkcs11endpoint,
								...data,
							};
						}
						this.props.updateState(this.props.scope, { hsm });
					}}
				/>
			</div>
		);
	}
}

const dataProps = {
	pkcs11endpoint: PropTypes.string,
	label: PropTypes.string,
	pin: PropTypes.string,
	show_proxy: PropTypes.bool,
	hsm_settings: PropTypes.bool,
};

HSMConfig.propTypes = {
	...dataProps,
	scope: PropTypes.string,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		return newProps;
	},
	{
		updateState,
	}
)(withTranslation()(HSMConfig));
