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
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import SidePanel from '../SidePanel/SidePanel';

class TransactionModal extends Component {
	constructor(props) {
		super(props);
		this.sidePanel = null;
	}

	renderInputs(action, translate) {
		if (!action.inputs.length) {
			return translate('transaction_no_inputs');
		}
		if (_.get(this.props.settings, 'transaction_visibility.hide_input')) {
			return <div id="transaction-smc-inputs">*****</div>;
		}
		return <div id="transaction-smc-inputs">{JSON.stringify(action.inputs)}</div>;
	}

	renderOutputs(action, translate) {
		if (!action.outputs.length) {
			return translate('transaction_no_outputs');
		}
		if (_.get(this.props.settings, 'transaction_visibility.hide_output')) {
			return <div id="transaction-smc-outputs">*****</div>;
		}
		let index = 0;
		return (
			<div>
				{action.outputs.map(write => {
					index++;
					return (
						<div id="transaction-output"
							key={'write_' + index}
						>
							<span id="transaction-output-operation"
								className="ibp-transaction-operation"
							>
								{translate(write.isDelete ? 'transaction_delete' : 'transaction_write')}
							</span>
							<span id="transaction-output-variable"
								className="ibp-transaction-variable"
							>
								{write.key}
							</span>
							{!write.isDelete && (
								<span id="transaction-output-assignment"
									className="ibp-transaction-assignment"
								>
									{translate('transaction_assignment')}
									<span id="transaction-output-value"
										className="ibp-transaction-value"
									>
										{write.value}
									</span>
								</span>
							)}
						</div>
					);
				})}
			</div>
		);
	}

	render() {
		const translate = this.props.translate;
		return (
			<SidePanel
				id="transaction"
				closed={this.props.closed}
				ref={sidePanel => (this.sidePanel = sidePanel)}
				buttons={[
					{
						id: 'close',
						text: translate('close'),
					},
				]}
			>
				<div className="ibp-transaction-title">
					<div className="ibp-transaction-text">{translate('transaction')}</div>
					<h1 className="ibm-light">{this.props.transaction.txId}</h1>
				</div>
				{this.props.transaction.actions.map((action, i) => {
					return (
						<div className="ibp-transaction-action"
							key={'action_' + i}
						>
							<div className="ibp-transaction-section">
								<div className="ibp-transaction-label">{translate('chaincode_id')}</div>
								<div id="transaction-smc-id">{action.chaincodeId.name + ' ' + action.chaincodeId.version}</div>
							</div>
							<div className="ibp-transaction-section">
								<div className="ibp-transaction-label">{translate('input')}</div>
								<div className="ibp-transaction-data">{this.renderInputs(action, translate)}</div>
							</div>
							<div className="ibp-transaction-section">
								<div className="ibp-transaction-label">{translate('output')}</div>
								<div className="ibp-transaction-data">{this.renderOutputs(action, translate)}</div>
							</div>
						</div>
					);
				})}
			</SidePanel>
		);
	}
}

TransactionModal.propTypes = {
	transaction: PropTypes.object,
	closed: PropTypes.func,
	settings: PropTypes.object,
	translate: PropTypes.func, // Provided by withLocalize
};

export default withLocalize(TransactionModal);
