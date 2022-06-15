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
import BlockchainTooltip from '../BlockchainTooltip/BlockchainTooltip';
import Form from '../Form/Form';

class UsageForm extends Component {
	static DEFAULT_USAGE_SAAS = {
		peer: {
			cpu: '0.2',
			memory: '1000',
			storage: '100',
		},
		orderer: {
			cpu: '0.25',
			memory: '500',
			storage: '100',
		},
		ca: {
			cpu: '0.1',
			memory: '200',
			storage: '20',
		},
		couchdb: {
			cpu: '0.2',
			memory: '400',
			storage: '100',
		},
		leveldb: {
			cpu: '0.0',
			memory: '0',
			storage: '100',
		},
		dind: {
			cpu: '0.5',
			memory: '1000',
		},
		proxy: {
			cpu: '0.1',
			memory: '200',
		},
		fluentd: {
			cpu: '0.1',
			memory: '200',
		},
		chaincodelauncher: {
			cpu: '0.2',
			memory: '400',
		},
	};

	static DEFAULT_USAGE_ICP = {
		peer: {
			cpu: '0.2',
			memory: '1000',
			storage: '100',
		},
		orderer: {
			cpu: '0.25',
			memory: '500',
			storage: '100',
		},
		ca: {
			cpu: '0.1',
			memory: '200',
			storage: '20',
		},
		couchdb: {
			cpu: '0.2',
			memory: '400',
			storage: '100',
		},
		leveldb: {
			cpu: '0.0',
			memory: '0',
			storage: '100',
		},
		dind: {
			cpu: '1',
			memory: '1000',
		},
		proxy: {
			cpu: '0.1',
			memory: '200',
		},
		fluentd: {
			cpu: '0.1',
			memory: '200',
		},
		chaincodelauncher: {
			cpu: '0.2',
			memory: '400',
		},
	};

	static getUsageDefaults() {
		const platform = Helper.getPlatform();
		if (platform && platform === 'ibmcloud') {
			return UsageForm.DEFAULT_USAGE_SAAS;
		}
		return UsageForm.DEFAULT_USAGE_ICP;
	}

	getFields(type) {
		const fields = [];
		let usageDefaults = UsageForm.getUsageDefaults();
		if (this.props.type !== 'leveldb') {
			fields.push({
				name: 'cpu',
				type: 'number',
				label: 'cpu_in_cpus',
				required: true,
				validate: Helper.isPositiveNumber,
				validationErrorMsg: 'input_error_invalid_number',
				tooltip: this.props.type === 'proxy' || this.props.type === 'fluentd' ? null : this.props.type + '_cpu_tooltip',
				default: this.props.reallocate ? this.props.reallocate.cpu : usageDefaults[this.props.type].cpu,
			});
			fields.push({
				name: 'memory',
				type: 'number',
				label: 'memory_in_mb',
				required: true,
				validate: Helper.isPositiveNumber,
				validationErrorMsg: 'input_error_invalid_number',
				tooltip: this.props.type === 'proxy' || this.props.type === 'fluentd' ? null : this.props.type + '_memory_tooltip',
				default: this.props.reallocate ? this.props.reallocate.memory : usageDefaults[this.props.type].memory,
			});
		}
		switch (this.props.type) {
			case 'peer':
			case 'orderer':
			case 'ca':
			case 'couchdb':
				if (!this.props.nostorage) {
					fields.push({
						name: 'storage',
						type: 'number',
						label: 'storage_in_gb',
						required: true,
						tooltip: this.props.type + '_storage_tooltip',
						validate: Helper.isPositiveNumber,
						validationErrorMsg: 'input_error_invalid_number',
						default: this.props.reallocate ? this.props.reallocate.storage : usageDefaults[this.props.type].storage,
						readonly: this.props.reallocate ? true : false,
					});
				}
				break;
			case 'leveldb':
				fields.push({
					name: 'storage',
					type: 'number',
					label: 'storage_in_gb',
					required: true,
					validate: Helper.isPositiveNumber,
					validationErrorMsg: 'input_error_invalid_number',
					default: this.props.reallocate ? this.props.reallocate.storage : usageDefaults[this.props.type].storage,
					readonly: this.props.reallocate ? true : false,
				});
				break;
			case 'fluentd':
			case 'proxy':
				fields.forEach(field => {
					field.readonly = this.props.reallocate ? true : false;
				});
				break;
			default:
				break;
		}
		return fields;
	}

	render() {
		const translate = this.props.translate;
		return (
			<div className="ibp-usage-form">
				{!this.props.titleTooltip ? (
					this.props.title && <h3 className="ibp-usage-title">{translate(this.props.title)}</h3>
				) : (
					<h3 className="ibp-usage-title">
						<BlockchainTooltip triggerText={translate(this.props.title ? this.props.title : '')}>{translate(this.props.titleTooltip)}</BlockchainTooltip>
					</h3>
				)}
				<Form
					id={this.props.scope}
					scope={this.props.scope}
					fields={this.getFields(this.props.type)}
					onChange={(data, valid) => {
						if (this.props.onChange) {
							this.props.onChange(
								{
									...UsageForm.getUsageDefaults()[this.props.type],
									cpu: this.props.cpu,
									memory: this.props.memory,
									storage: this.props.storage,
									...data,
								},
								valid
							);
						}
					}}
				/>
			</div>
		);
	}
}

const dataProps = {
	cpu: PropTypes.string,
	memory: PropTypes.string,
	storage: PropTypes.string,
};

UsageForm.propTypes = {
	...dataProps,
	scope: PropTypes.string,
	type: PropTypes.string,
	onChange: PropTypes.func,
	reallocate: PropTypes.object,
	nostorage: PropTypes.bool,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect((state, props) => {
	const scope = 'usage-' + props.type;
	return {
		scope,
		...Helper.mapStateToProps(state[scope], dataProps),
	};
})(withLocalize(UsageForm));
