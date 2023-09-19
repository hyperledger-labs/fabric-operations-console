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
import { showBreadcrumb, updateState } from '../../redux/commonActions';
import { SkeletonText } from 'carbon-components-react';
import Helper from '../../utils/helper';
import PageContainer from '../PageContainer/PageContainer';
//import Logger from '../Log/Logger';
import PageHeader from '../PageHeader/PageHeader';
import AuditLogsApi from '../../rest/AuditLogsApi';
import ItemContainer from '../ItemContainer/ItemContainer';
import emptyImage from '../../assets/images/empty_nodes.svg';
import SidePanel from '../SidePanel/SidePanel';
import Clipboard from '../../utils/clipboard';
import SVGs from '../Svgs/Svgs';

const SCOPE = 'AuditLogs';
//const Log = new Logger(SCOPE);

class AuditLogs extends Component {
	PAGE_SIZE = 50;

	async componentDidMount() {
		this.props.showBreadcrumb('settings', {}, this.props.history.location.pathname, true);
		this.props.updateState(SCOPE, {
			loading: true,
		});

		try {
			const logs = await AuditLogsApi.getLogs({ limit: this.PAGE_SIZE, skip: 0 });
			this.props.updateState(SCOPE, {
				logs: logs ? logs.notifications : [],
				totalLogCount: logs ? logs.total : 0,
				loading: false,
				showingPage: 1,
				showDetails: null,
				copyFlash: false,
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

	// dsh todo change plain text to json file

	// download ALL audit logs as a text file
	downloadAllLogs = async log => {
		try {
			const logs = await AuditLogsApi.getLogs({ limit: this.props.totalLogCount, skip: 0 });
			this.props.updateState(SCOPE, {
				logs: logs ? logs.notifications : [],
			});
			this.downloadFile(0, this.props.totalLogCount);
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
			this.props.updateState(SCOPE, {
				showingPage: page - 1,
			});
			return;
		}

		// else go get the new page data
		try {
			const logs = await AuditLogsApi.getLogs({ limit: Number(this.PAGE_SIZE), skip: Number(skip) });
			const all_logs = this.props.logs.concat(logs.notifications);
			this.props.updateState(SCOPE, {
				logs: logs ? all_logs : [],
				totalLogCount: logs ? logs.total : 0,
				showingPage: page + 1,
			});
		} catch (e) {
			console.error('unable to get next page of logs', e);
		}
	};

	// format each log for exporting to a file
	format_logs_for_export(logs) {
		const ret = [];
		for (let i in logs) {
			ret.push({
				local_date: new Date(logs[i].ts_display).toLocaleDateString() + ' -  ' + new Date(logs[i].ts_display).toLocaleTimeString(),
				timestamp: logs[i].ts_display,
				log: logs[i].message,
				http_details: logs[i].api,
				response_code: logs[i].code,
				elapsed_ms: logs[i].elapsed_ms,
				by: logs[i].by,
				status: logs[i].status,
				tx_id: logs[i].tx_id,
				component_id: logs[i].component_id ? logs[i].component_id : undefined,
			});
		}
		return JSON.parse(JSON.stringify(ret));		// parse and string it to drop the undefined fields
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

	// --------------------------------------------------------------------------
	// Main Migration Content
	// --------------------------------------------------------------------------
	render() {
		const translate = this.props.translate;
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
								<ItemContainer
									containerTitle="audit_logs_title"
									containerTooltip="audit_table_desc"
									tooltipDirection="right"
									emptyImage={emptyImage}
									emptyTitle="audit_table_tile_empty"
									emptyMessage="audit_table_text_empty"
									id="audit-logs"
									itemId="audit_logs"
									loading={this.props.loading}
									items={this.props.logs}
									menuItems={log => [
										{
											text: 'view_details',
											fn: () => {
												this.showLogDetails(log);
											},
										}
									]}
									listMapping={[
										{
											header: 'date',
											custom: log => {
												return (
													<span title={Helper.fromNow(log.ts_display, translate)}>
														{new Date(log.ts_display).toLocaleDateString()} - {new Date(log.ts_display).toLocaleTimeString()}
													</span>
												);
											},
											width: 2
										},
										{
											header: 'log_title',
											attr: 'message',
											translate: false,
											width: 4
										},
										{
											header: 'api_title',
											attr: 'api',
											translate: false,
											width: 2
										},
										{
											header: 'response_code',
											attr: 'code',
											translate: false,
											width: 1
										},
										{
											header: 'outcome_title',
											attr: 'status',
											translate: false,
											width: 1
										},
									]}
									buttonText="register_user"
									addItems={!this.props.loading && this.getButtons()}
									isLink={true}
									pageSize={this.PAGE_SIZE}
									itemCount={this.props.totalLogCount}
									onPage={this.getLogsForPage}
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
								hideClose={true}
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
											return <div key={key}>{this.renderKey(key)} {this.renderValue(log_details[key], key === lastKey)}</div>
										})}
										<div className='logJsonBracket'>{'}'}</div>
									</div>
								</div>
							</SidePanel>
						}
					</div>
				</div >
			</PageContainer >
		);
	}
}

const dataProps = {
	loading: PropTypes.bool,
	settings: PropTypes.object,
	errorMsg: PropTypes.string,
	logs: PropTypes.array,
	totalLogCount: PropTypes.number,
	showingPage: PropTypes.number,
	showDetails: PropTypes.object,
	copyFlash: PropTypes.bool,
};

AuditLogs.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	translate: PropTypes.func,
	history: PropTypes.object,
};

export default connect(state => {
	return Helper.mapStateToProps(state[SCOPE], dataProps);
}, {
	updateState,
	showBreadcrumb
})(withLocalize(AuditLogs));
