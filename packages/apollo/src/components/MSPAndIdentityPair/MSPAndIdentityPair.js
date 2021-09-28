/*
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
import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import Helper from '../../utils/helper';
import MspHelper from '../../utils/msp';
import Form from '../Form/Form';

const SCOPE = 'msp_and_identity';

class MSPAndIdentityPair extends React.Component {
	componentDidMount() {
		this.getIdentitiesForMsps();
	}

	componentDidUpdate(prevProps) {
		if (prevProps.msps !== this.props.msps) {
			this.getIdentitiesForMsps();
			return;
		}
	}

	componentWillUnmount() {
		this.updateState({
			msps_with_identities: null,
			selected_msp: null,
			selected_identity: null,
		});
	}

	updateState(update) {
		const scope = SCOPE + '_' + this.props.id;
		this.props.updateState(scope, update);
	}

	async getIdentitiesForMsps() {
		this.updateState({ loading: true });
		const msps_with_identities = await MspHelper.getIdentitiesForMsps(this.props.msps);
		this.updateState({
			msps_with_identities,
			selected_msp: null,
			selected_identity: null,
			loading: false,
		});
	}

	render() {
		const msp_field = this.props.msp_field || {};
		const identity_field = this.props.identity_field || {};
		const msp_options = this.props.msps_with_identities || [];
		const identity_options = this.props.selected_msp && this.props.selected_msp.identities ? this.props.selected_msp.identities : [];
		return (
			<Form
				id={this.props.id}
				scope={SCOPE + '_' + this.props.id}
				fields={[
					{
						label: 'org',
						...msp_field,
						name: 'selected_msp',
						type: 'dropdown',
						options: msp_options,
						loading: this.props.loading,
						default: msp_field.default || 'select_org',
					},
					{
						label: 'identity',
						default: 'select_identity',
						...identity_field,
						name: 'selected_identity',
						type: 'dropdown',
						options: identity_options,
						disabled: !identity_options.length,
						loading: this.props.loading,
					},
				]}
				onChange={change => {
					let selected_msp = change.selected_msp || this.props.selected_msp;
					let selected_identity = change.selected_identity || this.props.selected_identity;
					if (!_.isObject(selected_msp)) selected_msp = null;
					if (!_.isObject(selected_identity)) selected_identity = null;
					if (change.selected_msp) {
						selected_identity = null;
						this.updateState({ selected_identity });
					}
					let msp_name = msp_field.name || 'selected_msp';
					let identity_name = identity_field.name || 'selected_identity';
					let data = {};
					data[msp_name] = selected_msp;
					data[identity_name] = selected_identity;
					if (this.props.scope) {
						this.props.updateState(this.props.scope, data);
					}
					if (this.props.onChange) {
						let valid = !!(selected_msp && selected_identity);
						this.props.onChange(data, valid);
					}
				}}
			/>
		);
	}
}

const dataProps = {
	loading: PropTypes.bool,
	msps_with_identities: PropTypes.array,
	selected_msp: PropTypes.any,
	selected_identity: PropTypes.any,
};

MSPAndIdentityPair.propTypes = {
	...dataProps,
	msps: PropTypes.array,
	msp_field: PropTypes.object,
	identity_field: PropTypes.object,
	onChange: PropTypes.func,
	scope: PropTypes.string,
	updateState: PropTypes.func,
};

export default connect(
	(state, props) => {
		const scope = SCOPE + '_' + props.id;
		return Helper.mapStateToProps(state[scope], dataProps);
	},
	{
		updateState,
	}
)(MSPAndIdentityPair);
