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
import React from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import Helper from '../../utils/helper';

const SCOPE = 'signatureAuditLogModal';

class SignatureAuditLogModal extends React.Component {
	componentDidMount() {
		const log = [];
		if (this.props.request) {
			this.props.request.orgs2sign.forEach(entry => {
				if (entry.signature) {
					log.push({
						type: 'signature',
						msp_id: entry.msp_id,
						timestamp: entry.timestamp,
					});
				}
			});
			if (!_.isArray(this.props.request.distribution_responses)) {
				this.props.request.distribution_responses = [this.props.request.distribution_responses];
			}
			this.props.request.distribution_responses.forEach(distribution_response => {
				distribution_response.successes.forEach(success => {
					log.push({
						type: 'sent',
						msp_id: success.msp_id,
						timestamp: distribution_response.timestamp,
					});
				});
				distribution_response.errors.forEach(error => {
					log.push({
						type: 'error',
						msp_id: error.msp_id,
						timestamp: distribution_response.timestamp,
					});
				});
			});
		}
		log.sort((a, b) => b.timestamp - a.timestamp);
		this.props.updateState(SCOPE, { log });
	}

	componentWillUnmount() {}

	render() {
		const translate = this.props.translate;
		return (
			<>
				<div className="ibp-wizard-title">
					<h1>{translate('audit_log')}</h1>
				</div>
				<p>{translate('audit_log_desc')}</p>
				<div className="ibp-audit-log-table">
					<div className="ibp-audit-log-row">
						<div className="ibp-audit-log-header">{translate('event')}</div>
						<div className="ibp-audit-log-header">{translate('date_time')}</div>
					</div>
					{this.props.log && this.props.log.length && (
						<div className="ibp-audit-log-row">
							<div>{translate('audit_log_submitted', { org: this.props.request.originator_msp })}</div>
							<div>
								{new Date(this.props.log[0].timestamp).toLocaleString(undefined, {
									month: 'short',
									day: 'numeric',
									year: 'numeric',
									hour: 'numeric',
									minute: '2-digit',
								})}
							</div>
						</div>
					)}
					{this.props.log &&
						this.props.log.map((entry, index) => {
							return (
								<div className="ibp-audit-log-row"
									key={index}
								>
									<div>{translate('audit_log_' + entry.type, { org: entry.msp_id })}</div>
									<div>
										{new Date(entry.timestamp).toLocaleString(undefined, {
											month: 'short',
											day: 'numeric',
											year: 'numeric',
											hour: 'numeric',
											minute: '2-digit',
										})}
									</div>
								</div>
							);
						})}
				</div>
			</>
		);
	}
}

const dataProps = {
	log: PropTypes.array,
};

SignatureAuditLogModal.propTypes = {
	...dataProps,
	request: PropTypes.object,
	onClose: PropTypes.func,
	updateState: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['host_url'] = state['settings'] ? state['settings']['host_url'] : null;
		return newProps;
	},
	{
		updateState,
	}
)(withLocalize(SignatureAuditLogModal));
