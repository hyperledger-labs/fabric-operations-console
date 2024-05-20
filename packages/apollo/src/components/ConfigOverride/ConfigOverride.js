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

import { TextArea } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import Helper from '../../utils/helper';

const SCOPE = 'configOverride';

class ConfigOverride extends Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			text: this.props.config_override ? JSON.stringify(this.props.config_override, null, 4) : '',
			error: null,
		});
	}

	onChange = () => {
		const textarea = document.getElementById(this.props.id);
		const text = textarea.value;
		let error = null;
		let config_override = null;
		try {
			config_override = JSON.parse(text);
		} catch (jsonError) {
			error = 'error_config_override_json';
		}
		this.props.updateState(SCOPE, {
			text,
			error,
		});
		if (this.props.onChange) {
			this.props.onChange(config_override);
		}
	};

	render() {
		let invalidText = undefined;
		if (this.props.error) {
			if (this.props.error.error) {
				invalidText = this.props.t(this.props.error.error, this.props.error);
			} else {
				invalidText = this.props.t(this.props.error);
			}
		}
		return (
			<div className="ibp-config-override">
				<TextArea
					id={`${this.props.id}`}
					value={this.props.text}
					rows={15}
					labelText={this.props.t('edit_config_override')}
					hideLabel={true}
					onChange={this.onChange}
					invalid={!!this.props.error}
					invalidText={invalidText}
					readOnly={this.props.readOnly}
				/>
			</div>
		);
	}
}
const dataProps = {
	text: PropTypes.string,
	error: PropTypes.any,
};

ConfigOverride.propTypes = {
	...dataProps,
	config_override: PropTypes.object,
	onChange: PropTypes.func,
	readOnly: PropTypes.bool,
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
	}
)(withTranslation()(ConfigOverride));
