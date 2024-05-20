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
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { showBreadcrumb, updateState } from '../../redux/commonActions';
import { SkeletonText } from 'carbon-components-react';
import Helper from '../../utils/helper';
import PageContainer from '../PageContainer/PageContainer';
//import Logger from '../Log/Logger';
import PageHeader from '../PageHeader/PageHeader';
import { EventsRestApi } from '../../rest/EventsRestApi';
import ItemContainer from '../ItemContainer/ItemContainer';
import emptyImage from '../../assets/images/empty_nodes.svg';
import SidePanel from '../SidePanel/SidePanel';
import Clipboard from '../../utils/clipboard';
import SVGs from '../Svgs/Svgs';
import BlockchainTooltip from '../BlockchainTooltip/BlockchainTooltip';
import { Checkbox } from 'carbon-components-react';
import ActionsHelper from '../../utils/actionsHelper';
import withRouter from '../../hoc/withRouter';

const SCOPE = 'AuditLogs';
//const Log = new Logger(SCOPE);

class AuditLogs extends Component {
	PAGE_SIZE = 50;
	debounce = null;

	async componentDidMount() {
		this.props.showBreadcrumb('settings', {}, this.props.history.location.pathname, true);
		this.props.updateState(SCOPE, {
			loading: true,
			logsLoading: true,
			showTableColumns: {
				date: true,
				log: true,
				by: false,
				api: true,
				code: true,
				outcome: true,
				tx_id: false,
			},
			isManager: ActionsHelper.canManageUsers(this.props.userInfo),
		});

		await this.getLogs();
		this.props.updateState(SCOPE, {
			loading: false,
		});
	}

	// get logs - no search/filters
	async getLogs() {
		try {
			const logs = await EventsRestApi.getLogs({ limit: this.PAGE_SIZE, skip: 0 });
			this.props.updateState(SCOPE, {
				logs: logs ? logs.notifications : [],
				displayLogCount: logs ? logs.total : 0,			// the total number to display in the table (w/filters)
				logsLoading: false,
				showingPage: 1,
				showDetails: null,
				copyFlash: false,
				allLogsCount: logs ? logs.total : 0,			// the actual number of all logs w/o filters
			});
		} catch (e) {
			console.error('e', e);
		}
	}

	// open log and show all details
	showLogDetails = log => {
		this.props.updateState(SCOPE, {
			showDetails: log,
		});
	};

	// get the total number of logs (regardless of how many are on the current page)
	numberOfTotalLogs = () => {
		return this.props.allLogsCount || 100000;
	}

	// download ALL audit logs as a text file
	downloadAllLogs = async log => {
		try {
			const logs = await EventsRestApi.getLogs({ limit: this.numberOfTotalLogs(), skip: 0 });
			this.props.updateState(SCOPE, {
				logs: logs ? logs.notifications : [],
			});
			this.downloadFile(0, this.numberOfTotalLogs());
		} catch (e) {
			console.error('unable to get logs to download them', e);
		}
	};

	// download audit log as a text file
	downloadLogs = log => {
		const start = (this.props.showingPage - 1) * this.PAGE_SIZE;
		const end = start + this.PAGE_SIZE;
		this.downloadFile(start, end);
	};

	// download x logs as a text file
	downloadFile(start, end) {
		let filename = 'audit_logs.' + Date.now() + '.json';
		let data_str = JSON.stringify(this.format_logs_for_export(this.props.logs.slice(start, end)), null, '\t');
		const createTarget = document.body;
		let link = document.createElement('a');
		if (link.download !== undefined) {
			let blob = new Blob([data_str], { type: 'application/json' });
			let url = URL.createObjectURL(blob);
			link.setAttribute('download', filename);
			link.setAttribute('href', url);
			link.style.visibility = 'hidden';
			createTarget.appendChild(link);
			link.click();
			createTarget.removeChild(link);
		}
	}

	// make the buttons for the table
	getButtons() {
		const buttons = [];
		buttons.push({
			text: 'download_page_button_txt',
			fn: this.downloadLogs,
			icon: 'download',
		});
		buttons.push({
			text: 'download_all_button_txt',
			fn: this.downloadAllLogs,
			icon: 'download',
		});
		return buttons;
	}

	// load the next page for the table
	// (this is also called for a prev page!)
	getLogsForPage = async (page, limit) => {
		const skip = page * this.PAGE_SIZE;

		// if we already have this page data, skip
		if (this.props.logs.length > page * this.PAGE_SIZE) {
			let first_log_pos = page * this.PAGE_SIZE + 1;
			if (first_log_pos < 0) { first_log_pos = 0; }
			if (this.props.logs[first_log_pos] && this.props.logs[first_log_pos].id) {
				this.props.updateState(SCOPE, {
					showingPage: page - 1,
				});
				return;
			}
		}

		// else go get the new page data
		try {
			const logs = await EventsRestApi.getLogs({ limit: Number(this.PAGE_SIZE), skip: Number(skip) });
			const start_pos = skip;
			let all_logs;
			if (logs && Array.isArray(logs.notifications)) {
				if (this.props.logs.length <= page * this.PAGE_SIZE) {
					let empty = [];
					for (let i = this.props.logs.length - 1; i < start_pos - 1; i++) {
						empty.push({});
					}
					all_logs = this.props.logs.concat(empty).concat(logs.notifications);
				} else {
					this.props.logs.splice(start_pos, 0, ...logs.notifications);
					all_logs = JSON.parse(JSON.stringify(this.props.logs));
				}
			}
			this.props.updateState(SCOPE, {
				logs: Array.isArray(all_logs) ? all_logs : [],
				displayLogCount: logs ? logs.total : 0,
				showingPage: page + 1,
			});
		} catch (e) {
			console.error('unable to get next page of logs', e);
		}
	};

	// format each log for exporting to a file
	format_logs_for_export(logs) {
		return JSON.parse(JSON.stringify(logs));
	}

	// pretty print json key
	renderKey(key) {
		return (<span className='logJsonLine'>
			<span className='logJsonQuote'>&quot;</span>
			<span className='logJsonKey'>{key}</span>
			<span className='logJsonQuote'>&quot;</span>
			<span className='logJsonColon'>:</span>
		</span>
		);
	}

	// pretty print json value
	renderValue(val, last) {
		if (typeof val === 'number' || typeof val === 'boolean') {
			return (<span>
				<span className='logJsonValSp'>{val}</span>
				<span className='logJsonComma'>{last ? '' : ','}</span>
			</span>);
		} else {
			return (<span>
				<span className='logJsonQuoteVal'>&quot;</span>
				<span className='logJsonVal'>{val}</span>
				<span className='logJsonQuoteVal'>&quot;</span>
				<span className='logJsonComma'>{last ? '' : ','}</span>
			</span>);
		}
	}

	// toggle the visibility of a column in the activity table
	onChangeTableColumn(event) {
		const showTableColumns = JSON.parse(JSON.stringify(this.props.showTableColumns));
		if (event.target && event.target.value && showTableColumns && showTableColumns[event.target.value] !== undefined) {
			showTableColumns[event.target.value] = !showTableColumns[event.target.value];	// flip it
			this.props.updateState(SCOPE, {
				showTableColumns: showTableColumns
			});
		}
	}

	// make a local timezone date string from timestamp
	/*makeDate(ts) {
		return new Date(ts).toLocaleDateString() + ' - ' + new Date(ts).toLocaleTimeString();
	}*/

	// dynamically build the columns based on the selected options
	buildTableColumns() {
		//const translate = this.props.t;
		const ret = [];
		if (this.props.showTableColumns) {
			if (this.props.showTableColumns.date) {
				ret.push({
					header: 'date',
					attr: 'local_date',
					/*custom: log => {
						return (
							<span title={Helper.fromNow(log.ts_display, translate)}>
								{this.makeDate(log.ts_display)}
							</span>
						);
					},*/
					width: 2
				});
			}
			if (this.props.showTableColumns.log) {
				ret.push({

					header: 'log_title',
					attr: 'log',
					translate: false,
					width: 4
				});
			}


			if (this.props.showTableColumns.by) {
				ret.push({

					header: 'by_title',
					attr: 'by',
					translate: false,
					width: 2
				});
			}

			if (this.props.showTableColumns.api) {
				ret.push({

					header: 'api_title',
					attr: 'http_details',
					translate: false,
					width: 2
				});
			}

			if (this.props.showTableColumns.code) {
				ret.push({

					header: 'response_code',
					attr: 'response_code',
					translate: false,
					width: 1
				});
			}

			if (this.props.showTableColumns.outcome) {
				ret.push({

					header: 'outcome_title',
					attr: 'status',
					translate: false,
					width: 1
				});
			}


			if (this.props.showTableColumns.tx_id) {
				ret.push({
					header: 'tx_id_title',
					attr: 'tx_id',
					translate: false,
					width: 1
				});
			}
		}

		return ret;
	}

	// search box event
	async searchTableEvent(event) {
		const query = event.target.value;
		clearTimeout(this.debounce);

		this.debounce = setTimeout(async () => {
			this.searchTable(query);
		}, 150);
	}

	// send search term and filter logs down before returning them
	async searchTable(query) {
		this.props.updateState(SCOPE, {
			logsLoading: true,
		});

		if (!query) {
			return await this.getLogs();							// if no search terms, do normal api
		} else {
			try {
				const logs = await EventsRestApi.getLogs({ limit: this.numberOfTotalLogs(), skip: 0, search: query });
				this.props.updateState(SCOPE, {
					logs: logs ? logs.notifications : [],
					displayLogCount: logs ? logs.returning : 0,		// in this case the total should reflect the number of logs after applying the filter
					showingPage: 1,
					logsLoading: false,
				});
			} catch (e) {
				console.error('unable to get logs for search', e);
			}
		}
	}

	// --------------------------------------------------------------------------
	// Main Migration Content
	// --------------------------------------------------------------------------
	render() {
		const translate = this.props.t;
		const tmp = this.props.showDetails ? this.format_logs_for_export([this.props.showDetails]) : null;
		const log_details = tmp ? tmp[0] : '';
		const keys = Object.keys(log_details);
		const lastKey = keys[keys.length - 1];
		return (
			<PageContainer>
				<div className="bx--row migrationPanel">
					<div className="bx--col-lg-13">
						<PageHeader
							history={this.props.history}
							headerName="audit_logs"
							staticHeader
						/>

						{!this.props.isManager &&
							<p>{translate('audit_no_access_msg')}</p>
						}

						{this.props.isManager &&
							<div>
								{this.props.loading &&
									<div>
										<SkeletonText
											style={{
												paddingTop: '.5rem',
												width: '8rem',
												height: '1rem',
											}}
										/>
										<SkeletonText />
									</div>
								}

								{!this.props.loading &&
									<div>
										<BlockchainTooltip triggerText={translate('audit_logs_title')}
											direction='right'
											className='audit-style-wrap'
										>
											{translate('audit_table_desc')}
										</BlockchainTooltip>

										<br />

										<div>
											<div className='bx--label'>{translate('log_columns_desc')}</div>
										</div>
										<Checkbox
											id={'activity-checkbox-date'}
											labelText={translate('date')}
											wrapperClassName='audit-checkboxes'
											value='date'
											checked={this.props.showTableColumns ? this.props.showTableColumns.date : false}
											onClick={event => {
												this.onChangeTableColumn(event);
											}}
										/>
										<Checkbox
											id={'activity-checkbox-log'}
											labelText={translate('log_title')}
											wrapperClassName='audit-checkboxes'
											value='log'
											checked={this.props.showTableColumns ? this.props.showTableColumns.log : false}
											onClick={event => {
												this.onChangeTableColumn(event);
											}}
										/>
										<Checkbox
											id={'activity-checkbox-by'}
											labelText={translate('by_title')}
											wrapperClassName='audit-checkboxes'
											value='by'
											checked={this.props.showTableColumns ? this.props.showTableColumns.by : false}
											onClick={event => {
												this.onChangeTableColumn(event);
											}}
										/>
										<Checkbox
											id={'activity-checkbox-api'}
											labelText={translate('api_title')}
											wrapperClassName='audit-checkboxes'
											value='api'
											checked={this.props.showTableColumns ? this.props.showTableColumns.api : false}
											onClick={event => {
												this.onChangeTableColumn(event);
											}}
										/>
										<Checkbox
											id={'activity-checkbox-code'}
											labelText={translate('response_code')}
											wrapperClassName='audit-checkboxes'
											value='code'
											checked={this.props.showTableColumns ? this.props.showTableColumns.code : false}
											onClick={event => {
												this.onChangeTableColumn(event);
											}}
										/>
										<Checkbox
											id={'activity-checkbox-outcome'}
											labelText={translate('outcome_title')}
											wrapperClassName='audit-checkboxes'
											value='outcome'
											checked={this.props.showTableColumns ? this.props.showTableColumns.outcome : false}
											onClick={event => {
												this.onChangeTableColumn(event);
											}}
										/>
										<Checkbox
											id={'activity-checkbox-tx_id'}
											labelText={translate('tx_id_title')}
											wrapperClassName='audit-checkboxes'
											value='tx_id'
											checked={this.props.showTableColumns ? this.props.showTableColumns.tx_id : false}
											onClick={event => {
												this.onChangeTableColumn(event);
											}}
										/>

										<ItemContainer
											emptyImage={emptyImage}
											emptyTitle="audit_table_tile_empty"
											emptyMessage="audit_table_text_empty"
											id="audit-logs"
											itemId="audit_logs"
											loading={this.props.loading || this.props.logsLoading}
											items={this.props.logs}
											menuItems={log => [
												{
													text: 'view_details',
													fn: () => {
														this.showLogDetails(log);
													},
												}
											]}
											listMapping={this.buildTableColumns()}
											buttonText="register_user"
											addItems={!this.props.loading && this.getButtons()}
											isLink={true}
											pageSize={this.PAGE_SIZE}
											itemCount={this.props.displayLogCount}
											onPage={this.getLogsForPage}
											searchEnabled={true}
											customSearch={(query) => {
												this.searchTable(query);
											}}
										/>
									</div>
								}

								{this.props.showDetails &&
									<SidePanel
										id="ibp--template-full-page-side-panel"
										closed={() => {
											this.props.updateState(SCOPE, {
												showDetails: null,
											});
										}}
										ref={sidePanel => (this.sidePanel = sidePanel)}
										buttons={[
											{
												id: 'close-log-button',
												text: translate('close'),
												type: 'button',
											}
										]}
										fullPageCenter
										hideClose={false}
									>
										<div className="ibp-full-page-center-panel-container">
											<h1>
												{translate('details')}
											</h1>
											<p className='logDescWrap'>{translate('log_detail_desc')}</p>
											<button className='logCopyButton'
												onClick={() => {
													this.props.updateState(SCOPE, {
														copyFlash: true
													});
													Clipboard.copyToClipboard(JSON.stringify(log_details, null, '\t'));
													setTimeout(() => {
														this.props.updateState(SCOPE, {
															copyFlash: false
														});
													}, 200);
												}}
												title={translate('copy_log_button_tooltip')}
											>
												<SVGs type="copy"
													width="20px"
													title={translate('copy_log_button_tooltip')}
												/>
											</button>
											<div className={'logDetailsWrap' + (this.props.copyFlash ? ' flashCopyButton ' : '')}>
												<div className='logJsonBracket'>{'{'}</div>
												{log_details && Object.keys(log_details).map(key => {
													return <div key={key}>{this.renderKey(key)} {this.renderValue(log_details[key], key === lastKey)}</div>;
												})}
												<div className='logJsonBracket'>{'}'}</div>
											</div>
										</div>
									</SidePanel>
								}
							</div>
						}
					</div>
				</div >
			</PageContainer >
		);
	}
}

const dataProps = {
	loading: PropTypes.bool,
	logsLoading: PropTypes.bool,
	settings: PropTypes.object,
	errorMsg: PropTypes.string,
	logs: PropTypes.array,
	displayLogCount: PropTypes.number,
	showingPage: PropTypes.number,
	showDetails: PropTypes.object,
	copyFlash: PropTypes.bool,
	showTableColumns: PropTypes.object,
	allLogsCount: PropTypes.number,
	userInfo: PropTypes.object,
	isManager: PropTypes.bool,
};

AuditLogs.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	t: PropTypes.func,
	history: PropTypes.object,
};

export default connect(state => {
	let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
	newProps['userInfo'] = state['userInfo'];
	return newProps;
}, {
	updateState,
	showBreadcrumb
})(withTranslation()(withRouter(AuditLogs)));
