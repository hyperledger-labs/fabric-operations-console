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
import { Dropdown } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import NotificationEmptyImage from '../../assets/images/notification_empty.svg';
import { showError, updateState } from '../../redux/commonActions';
import { MspRestApi } from '../../rest/MspRestApi';
import SignatureRestApi from '../../rest/SignatureRestApi';
import Helper from '../../utils/helper';
import FocusComponent from '../FocusComponent/FocusComponent';
import Logger from '../Log/Logger';
import SidePanel from '../SidePanel/SidePanel';
import SidePanelInlineConfirmation from '../SidePanelInlineConfirmation/SidePanelInlineConfirmation';
import SignatureAuditLogModal from '../SignatureAuditLogModal/SignatureAuditLogModal';
import SignatureNotification from '../SignatureNotification/SignatureNotification';
import SVGs from '../Svgs/Svgs';

const SCOPE = 'signatureCollection';
const Log = new Logger(SCOPE);

class SignatureCollection extends Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			audit: null,
			batchActionBarOpening: false,
			showRequests: true,
			msps: [],
			loading: false,
			toBeArchivedList: [],
			sc_filter: {
				id: 'needs_attention',
			},
			showArchiveConfirmation: false,
			recentArchiveData: {
				notificationCount: 0,
				visibility: '',
			},
		});
		this.getMsps();
		// set focus to first item on step
		this.setFocus();
	}

	setFocus() {
		this.props.updateState(SCOPE, { setFocus: false });
		window.setTimeout(() => {
			this.props.updateState(SCOPE, { setFocus: true });
		}, 100);
	}

	componentWillUnmount() {
		this.props.updateState(SCOPE, {
			showRequests: false,
		});
	}

	refresh() {
		this.props.updateState(SCOPE, { loading: true });
		SignatureRestApi.getAllRequests(SCOPE, this.props.dispatch, this.props.host_url + '/api/v1')
			.then(requests => {
				Log.info('requests=', requests);
				this.props.updateState(SCOPE, { loading: false });
			})
			.catch(error => {
				Log.error(error);
				this.props.updateState(SCOPE, { loading: false });
			});
		this.getMsps();
	}

	getMsps() {
		MspRestApi.getAllMsps()
			.then(msps => {
				this.props.updateState(SCOPE, { msps });
			})
			.catch(error => {
				Log.error(error);
			});
	}

	needsAttention(requests) {
		return requests.length > 0;
	}

	getDateString(timestamp) {
		return new Date(timestamp).toLocaleString(undefined, {
			month: 'long',
			day: 'numeric',
			year: 'numeric',
		});
	}

	getReceivedBy(request) {
		let received = null;
		request.orgs2sign.forEach(entry => {
			if (Helper.urlsAreEqual(entry.optools_url, this.props.host_url)) {
				if (!received || (received.signature && !entry.signature)) {
					received = entry;
				}
			}
		});
		if (!received && request.orderers2sign) {
			// When only orderer needs to sign
			request.orderers2sign.forEach(entry => {
				if (Helper.urlsAreEqual(entry.optools_url, this.props.host_url)) {
					if (!received || (received.signature && !entry.signature)) {
						received = entry;
					}
				}
			});
		}
		return received ? received.msp_id : null;
	}

	getSignatureCount(request) {
		let count = 0;
		request.orgs2sign.forEach(entry => {
			if (entry.signature && entry.admin) {
				count++;
			}
		});
		return count;
	}

	showDetails = request => {
		this.props.onClose();
		this.props.updateState(SCOPE, { details: request });
	};

	hideDetails = () => {
		this.props.updateState(SCOPE, { details: null });
	};

	showAuditLog = request => {
		this.props.updateState(SCOPE, { audit: request, focusTxId: null });
	};

	hideAuditLog = () => {
		this.props.updateState(SCOPE, { focusTxId: this.props.audit.tx_id, audit: null });
		this.setFocus();
	};

	resendRequest = request => {
		request.resending = true;
		this.props.updateState(SCOPE, { requests: [...this.props.requests] });
		SignatureRestApi.redistributeRequest(request)
			.then(() => {
				window.setTimeout(() => {
					this.refresh();
				}, 5000);
			})
			.catch(error => {
				this.refresh();
			});
	};

	renderRequestFailures(request) {
		if (request.resending) {
			return;
		}
		if (!request.distribution_responses.length) {
			return;
		}
		const last = request.distribution_responses.length - 1;
		if (!request.distribution_responses[last].errors.length) {
			return;
		}
		return <SignatureNotification last={last}
			request={request}
			resendRequest={this.resendRequest}
			type="failedToSend"
		/>;
	}

	getOriginatorSignature(request) {
		let sign = null;
		request.orgs2sign.forEach(entry => {
			if (entry.msp_id === request.originator_msp) {
				sign = entry;
			}
		});
		return sign;
	}

	updateArchiveList = (request, event) => {
		if (!this.props.toBeArchivedList.length) {
			this.props.updateState(SCOPE, {
				batchActionBarOpening: true,
			});
		}
		let newNotificationArchives = [];
		if (event.target.checked) {
			newNotificationArchives.push(request);
			this.props.updateState(SCOPE, {
				toBeArchivedList: [...this.props.toBeArchivedList, ...newNotificationArchives],
			});
		} else {
			const filteredArchiveList = this.props.toBeArchivedList.filter(item => item.tx_id !== request.tx_id);
			this.props.updateState(SCOPE, {
				toBeArchivedList: filteredArchiveList,
			});
		}
		if (!this.props.toBeArchivedList.length) {
			setTimeout(() => {
				this.props.updateState(SCOPE, {
					batchActionBarOpening: false,
				});
			}, 250);
		}
	};

	selectAllNotifications = () => {
		const requests = this.filterList();
		this.props.updateState(SCOPE, {
			toBeArchivedList: requests,
		});
	};

	clearToBeArchivedList = () => {
		this.props.updateState(SCOPE, {
			toBeArchivedList: [],
		});
	};

	archiveNotifications = shouldArchive => {
		let archiveList = [];
		this.props.toBeArchivedList.map(request => {
			return archiveList.push(request.tx_id);
		});
		const requestBody = {
			visibility: shouldArchive ? 'archive' : 'inbox',
			tx_ids: archiveList,
		};
		SignatureRestApi.toggleVisibility(requestBody)
			.then(response => {
				this.props.updateState(SCOPE, {
					toBeArchivedList: [],
					showArchiveConfirmation: true,
					recentArchiveData: {
						visibility: response.visibility,
						notificationCount: response.tx_ids.length,
					},
					inlineConfirmationOpening: true,
				});
				setTimeout(() => {
					this.props.updateState(SCOPE, {
						inlineConfirmationOpening: false,
					});
				}, 250);
				setTimeout(() => {
					this.props.updateState(SCOPE, {
						showArchiveConfirmation: false,
						recentArchiveData: null,
					});
				}, 6000);
				this.refresh();
			})
			.catch(error => {
				this.props.showError('error_archiving_notification', { visibility: shouldArchive }, SCOPE);
			});
	};

	clearRecentArchiveData = () => {
		this.props.updateState(SCOPE, {
			showArchiveConfirmation: false,
			recentArchiveData: null,
		});
	};

	renderRequest(request) {
		const originator = this.getOriginatorSignature(request);
		const submitter = originator ? Helper.urlsAreEqual(originator.optools_url, this.props.host_url) : false;
		const received_by = this.getReceivedBy(request);
		const required = request.current_policy.number_of_signatures || request.orgs2sign.length;
		const approved = request.signature_count >= required && (request.orderers2sign ? request.orderer_signature_count >= request.orderers2sign.length : true);
		return (
			<>
				<SignatureNotification
					type={request.status === 'open' ? 'open' : 'closed'}
					request={request}
					showAuditLog={this.showAuditLog}
					approved={approved}
					required={required}
					received_by={received_by}
					submitter={submitter}
					originator={originator}
					showDetails={this.showDetails}
					resending={request.resending}
					updateArchiveList={this.updateArchiveList}
					focusTxId={this.props.focusTxId}
				/>
				{this.renderRequestFailures(request)}
			</>
		);
	}

	filterList() {
		const requests = [];
		const filter = this.props.sc_filter ? this.props.sc_filter.id : 'needs_attention';
		if (this.props.requests && this.props.requests.length) {
			this.props.requests.forEach(request => {
				switch (filter) {
					case 'all':
						if (request.visibility === 'inbox') {
							requests.push(request);
						}
						break;
					case 'open':
					case 'closed':
						if (request.status === filter && request.visibility === 'inbox') {
							requests.push(request);
						}
						break;
					case 'archived':
						if (request.visibility === 'archive') {
							requests.push(request);
						}
						break;
					default:
						if (request.needsAttention && request.visibility === 'inbox') {
							requests.push(request);
						}
						break;
				}
			});
		}
		return requests;
	}

	renderList(translate) {
		if (!this.props.showRequests) {
			return;
		}
		let lastDate = null;
		const requests = this.filterList();
		const items = [{ id: 'needs_attention' }, { id: 'open' }, { id: 'closed' }, { id: 'all' }, { id: 'archived' }];
		return (
			<div className="ibp-signature-container">
				<div className="ibp-signature-container-header">
					<div className="ibp-signature-count-container">
						<span className="ibp-signature-container-header-label">{translate('notifications')}</span>
						<span className="ibp-signature-container-header-value">{requests.length}</span>
					</div>
					<Dropdown
						id="sc_filter"
						name="sc_filter"
						label="sc_filter"
						items={items}
						selectedItem={this.props.sc_filter || items[0]}
						itemToString={item => {
							return translate(item.id);
						}}
						onChange={item => {
							this.props.updateState(SCOPE, { sc_filter: item.selectedItem });
						}}
						ariaLabel={translate('notifications_filter')}
					/>
					<button className="ibp-panel--close-icon-button"
						onClick={this.props.onClose}
						aria-label={translate('close')}
					>
						<SVGs type="close"
							height="16px"
							width="16px"
						/>
					</button>
				</div>
				{!!requests.length && (
					<div className="ibp-signature-collection-body">
						{requests.map(request => {
							let date = this.getDateString(request.lastTimestamp);
							let today = false;
							let yesterday = false;
							if (date === lastDate) {
								date = null;
							} else {
								lastDate = date;
								if (date === this.getDateString(new Date().getTime())) {
									today = true;
								}
								if (date === this.getDateString(new Date().getTime() - 86400000)) {
									yesterday = true;
								}
							}
							return (
								<div className="ibp-signature-request"
									key={request.tx_id}
								>
									{date && (
										<div className="ibp-signature-request-header">
											{today && <span>{translate('today')}</span>}
											{yesterday && <span>{translate('yesterday')}</span>}
											<span className="ibp-signature-request-header-date">{date}</span>
										</div>
									)}
									{this.renderRequest(request, translate)}
								</div>
							);
						})}
					</div>
				)}
				{!this.props.loading && requests.length === 0 && (
					<div className="ibp-signature-requests-empty-container">
						<NotificationEmptyImage
							alt=""
							className="ibp-signature-requests-empty-img"
						/>
						<h4>
							{this.props.sc_filter && this.props.sc_filter.id !== 'archived' ? translate('no_approval_notifications') : translate('no_archived_notifications')}
						</h4>
						<p className="ibp-signature-empty-desc">
							{this.props.sc_filter && this.props.sc_filter.id !== 'archived' ? translate('no_approvals_desc') : translate('no_archived_notifications_desc')}
						</p>
					</div>
				)}
				{this.props.loading && this.props.requests && !this.props.requests.length && (
					<>
						<SignatureNotification skeleton />
						<SignatureNotification skeleton />
						<SignatureNotification skeleton />
						<SignatureNotification skeleton />
					</>
				)}
			</div>
		);
	}

	getButtons(translate) {
		if (this.props.audit) {
			return [
				{
					id: 'back',
					text: translate('back'),
					onClick: this.hideAuditLog,
				},
			];
		}
	}

	render() {
		let actionBarClassName = '';
		let archiveConfirmationOpening = '';
		if (this.props.batchActionBarOpening) {
			actionBarClassName = 'ibp-batch-action-bar-opening';
		}
		if (this.props.inlineConfirmationOpening) {
			archiveConfirmationOpening = 'ibp-side-panel-inline-confirmation-opening';
		}
		const shouldArchive = this.props.sc_filter && this.props.sc_filter.id !== 'archived' ? true : false;
		const { showArchiveConfirmation } = this.props;
		const translate = this.props.t;
		return (
			<div>
				<SidePanel
					id="signature-collection"
					closed={this.props.onClose}
					ref={sidePanel => (this.sidePanel = sidePanel)}
					buttons={this.getButtons(translate)}
					error={this.props.error}
					clickAway
					hideClose={true}
				>
					<FocusComponent setFocus={this.props.setFocus}>
						{this.props.toBeArchivedList && this.props.toBeArchivedList.length > 0 && (
							<div className={`ibp-archive-batch-action-bar ${actionBarClassName}`}>
								<p className="ibp-archive-bar-item">
									{this.props.toBeArchivedList.length} {this.props.toBeArchivedList.length > 1 ? translate('items_selected') : translate('item_selected')}
								</p>
								<div className="ibp-archive-bar-item">
									<button className="ibp-archive-bar-button"
										onClick={this.selectAllNotifications}
									>
										{translate('select_all')}
									</button>
									<button className="ibp-archive-bar-button"
										onClick={() => this.archiveNotifications(shouldArchive)}
									>
										{this.props.sc_filter.id !== 'archived' ? translate('archive') : translate('restore')}
									</button>
									<button className="ibp-archive-bar-button"
										onClick={this.clearToBeArchivedList}
									>
										{translate('cancel')}
									</button>
								</div>
							</div>
						)}
						{!this.props.audit && <div className="ibp-title-bar-signatures">{this.renderList(translate)}</div>}
						{this.props.audit && <SignatureAuditLogModal request={this.props.audit}
							onClose={this.hideAuditLog}
						/>}
						{showArchiveConfirmation && (
							<SidePanelInlineConfirmation
								title={
									this.props.recentArchiveData.notificationCount > 1
										? this.props.recentArchiveData.visibility === 'archive'
											? translate('archive_notification_confirmation_title_archive_plural', {
												count: this.props.recentArchiveData.notificationCount,
											})
											: translate('archive_notification_confirmation_title_inbox_plural', {
												count: this.props.recentArchiveData.notificationCount,
											})
										: this.props.recentArchiveData.visibility === 'inbox'
											? translate('archive_notification_confirmation_title_inbox_single')
											: translate('archive_notification_confirmation_title_archive_single')
								}
								subtitle={
									this.props.recentArchiveData.visibility === 'inbox'
										? translate('inbox_notification_confirmation_subtitle')
										: translate('archive_notification_confirmation_subtitle')
								}
								clearNotification={this.clearRecentArchiveData}
								opening={archiveConfirmationOpening}
							/>
						)}
					</FocusComponent>
				</SidePanel>
			</div>
		);
	}
}

const dataProps = {
	batchActionBarOpening: PropTypes.bool,
	toBeArchivedList: PropTypes.array,
	showRequests: PropTypes.bool,
	requests: PropTypes.array,
	msps: PropTypes.array,
	needsAttention: PropTypes.bool,
	details: PropTypes.object,
	audit: PropTypes.object,
	onWelcomeClose: PropTypes.func,
	loading: PropTypes.bool,
	sc_filter: PropTypes.object,
	showArchiveConfirmation: PropTypes.bool,
	recentArchiveData: PropTypes.object,
	inlineConfirmationOpening: PropTypes.bool,
	setFocus: PropTypes.bool,
	focusTxId: PropTypes.string,
};

SignatureCollection.propTypes = {
	...dataProps,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		const newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['host_url'] = state['settings'] ? state['settings']['host_url'] : null;
		return newProps;
	},
	dispatch => {
		return {
			dispatch,
			...bindActionCreators({ showError, updateState }, dispatch),
		};
	}
)(withTranslation()(SignatureCollection));
