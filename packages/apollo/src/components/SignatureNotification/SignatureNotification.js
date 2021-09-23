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
import React, { Component } from 'react';
import { Button } from 'carbon-components-react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withLocalize } from 'react-localize-redux';
import SVGs from '../Svgs/Svgs';
import { Checkbox } from 'carbon-components-react';
import Catalog20 from '@carbon/icons-react/lib/catalog/20';
import Helper from '../../utils/helper';
import { updateState } from '../../redux/commonActions';

const SCOPE = 'signatureNotification';
class SignatureNotification extends Component {
	constructor(props) {
		super(props);
		this.auditHtmlElement = React.createRef();
	}

	componentDidMount() {
		window.setTimeout(this.resetFocus, 350);
	}

	// Sets focus to last audit icon clicked
	resetFocus = () => {
		if (this.props.request && this.props.request.tx_id === this.props.focusTxId) {
			this.auditHtmlElement.current.focus();
		}
	};

	render() {
		const {
			approved,
			last,
			received_by,
			request,
			required,
			resendRequest,
			resending,
			showAuditLog,
			showDetails,
			skeleton,
			submitter,
			translate,
			type,
		} = this.props;
		let title = '';
		let label = '';
		if (request) {
			if (request.ccd) {
				title = translate('chaincode_proposal');
				label = 'view_chaincode_proposal';
			} else {
				if (request && !request.json_diff) {
					title = translate('channel_created', {
						channel: request.channel,
						org: request.originator_msp,
					});
				} else {
					if (approved) {
						title = translate('signature_request_approved', { channel: request.channel });
					} else {
						if (submitter) {
							title = translate('signature_request_submitted_by', { org: request.originator_msp });
						} else {
							title = translate('signature_request_received_by', { org: received_by });
						}
					}
				}
				if (approved && request.status === 'open') {
					label = request.json_diff ? 'review_and_update' : 'review_and_create';
				} else {
					label = request.json_diff ? 'view_channel_update' : 'view_channel';
				}
			}
		}
		if (type === 'failedToSend') {
			title = translate('signature_request_failed');
		}
		return (
			<>
				{request && !request.resending && (
					<div className={`ibp-signature-request-notification ibp-signature-request-notification-${type}`}>
						<div className="ibp-signature-request-notification-title">{title}</div>
						<div className="ibp-signature-request-notification-text">
							{type === 'failedToSend' ? (
								<>
									{translate('signature_request_failed_list')}
									{request.distribution_responses[last].errors.map(error => (
										<div className="signature-request-failed-org"
											key={error.msp_id}
										>
											- {error.msp_id}
										</div>
									))}
								</>
							) : request && request.ccd ? (
								translate('chaincode_proposal_text', {
									id: request.ccd.chaincode_id,
									version: request.ccd.chaincode_version,
									channel: request.channel,
									org: request.originator_msp,
								})
							) : (
								translate(request.json_diff ? 'proposed_channel_update' : 'channel_created', {
									channel: request.channel,
									org: request.originator_msp,
								})
							)}
						</div>
						{request.status === 'open' && type !== 'failedToSend' && (
							<div>
								<div className="ibp-signature-request-progress-bar">
									{request.signature_count < required ? (
										<div
											className="ibp-signature-request-progress"
											style={{
												width: Math.min(request.signature_count / required, 1) * 100 + '%',
											}}
										/>
									) : (
										<div className="ibp-signature-request-progress ibp-signatures-complete" />
									)}
								</div>
								<div>{translate('signatures_received', { signed: request.signature_count, required })}</div>
								{request.orderers2sign && !!request.orderers2sign.length && (
									<div>
										<div className="ibp-signature-request-progress-bar">
											{request.orderer_signature_count < request.orderers2sign.length ? (
												<div
													className="ibp-signature-request-progress"
													style={{
														width: Math.min(request.orderer_signature_count / request.orderers2sign.length, 1) * 100 + '%',
													}}
												/>
											) : (
												<div className="ibp-signature-request-progress ibp-signatures-complete" />
											)}
										</div>
										<div>{translate('orderer_signatures_received', { signed: request.orderer_signature_count, required: request.orderers2sign.length })}</div>
									</div>
								)}
							</div>
						)}
						<div className="ibp-signature-request-icons">
							{type === 'failedToSend' ? (
								<SVGs type="error"
									extendClass={{ 'ibp-signature-request-icon': true }}
									width="16px"
									height="16px"
								/>
							) : (
								<Button
									aria-label={translate('audit_list')}
									id={'audit-button-' + request.tx_id}
									className="ibp-signature-request-audit-button"
									kind="secondary"
									size="small"
									renderIcon={Catalog20}
									iconDescription={translate('audit_list')}
									tooltipPosition="left"
									tooltipAlignment="center"
									onClick={() => {
										showAuditLog(request);
									}}
									hasIconOnly
									ref={this.auditHtmlElement}
								/>
							)}
							{type !== 'failedToSend' && (
								<Checkbox
									id={`toggle_notification-archive-status-${request.tx_id}`}
									className="ibp-notification-archive-checkbox"
									checked={this.props.toBeArchivedList && this.props.toBeArchivedList.some(item => item.tx_id === request.tx_id)}
									onClick={event => {
										this.props.updateArchiveList(request, event);
									}}
									labelText={translate('select_notification')}
									hideLabel={true}
								/>
							)}
						</div>
						<button
							className="ibp-signature-collection-notification-link"
							onClick={() => {
								type === 'failedToSend' ? resendRequest(request) : showDetails(request);
							}}
						>
							<p className="ibp-signature-collection-notification-link-text">{type === 'failedToSend' ? translate('try_again') : translate(label)}</p>
							<SVGs type={type === 'failedToSend' ? 'restart' : 'arrowRight'}
								extendClass={{ 'ibp-signature-link-icon': true }}
								width="16px"
								height="16px"
							/>
						</button>
						<div className="ibp-signature-collection-notification-time">
							{type === 'failedToSend'
								? new Date(request.distribution_responses[last].timestamp).toLocaleString(undefined, {
									hour: 'numeric',
									minute: '2-digit',
								  })
								: new Date(request.lastTimestamp).toLocaleString(undefined, {
									hour: 'numeric',
									minute: '2-digit',
								  })}
						</div>
					</div>
				)}
				{skeleton && (
					<div className="ibp-signature-request-notification-loading-skeleton">
						<div className="ibp-signature-request-loading-skeleton-title" />
						<div className="ibp-signature-request-loading-skeleton-subtitle" />
					</div>
				)}
				{resending && (
					<div className="ibp-signature-request-notification">
						<div className="ibp-signature-request-notification-title">{translate('signature_request_resending')}</div>
						<div className="signature-collection-resend-skeleton" />
					</div>
				)}
			</>
		);
	}
}

const dataProps = {
	approved: PropTypes.bool,
	archivedList: PropTypes.array,
	last: PropTypes.number,
	originator: PropTypes.object,
	showAuditLog: PropTypes.func,
	showDetails: PropTypes.func,
	skeleton: PropTypes.bool,
	submitter: PropTypes.bool,
	received_by: PropTypes.string,
	resendRequest: PropTypes.func,
	request: PropTypes.object,
	required: PropTypes.number,
	resending: PropTypes.bool,
	toBeArchivedList: PropTypes.array,
	type: PropTypes.oneOf(['open', 'closed', 'failedToSend']),
	updateArchiveList: PropTypes.func,
	focusTxId: PropTypes.string,
};

SignatureNotification.propTypes = {
	...dataProps,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['signatureCollection'] = state['signatureCollection'] ? state['userInfo'] : null;
		newProps['toBeArchivedList'] = state['signatureCollection'] ? state['signatureCollection']['toBeArchivedList'] : null;
		return newProps;
	},
	{
		updateState,
	}
)(withLocalize(SignatureNotification));
