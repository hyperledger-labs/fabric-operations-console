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
import { Link, Modal } from 'carbon-components-react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withIdleTimer } from 'react-idle-timer';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { showError, showSuccess, updateState } from '../../redux/commonActions';
import LoginApi from '../../rest/LoginApi';
import SettingsApi from '../../rest/SettingsApi';
import Helper from '../../utils/helper';
import WebSockets from '../../utils/websockets';
import CADetails from '../CADetails/CADetails';
import ChaincodesPage from '../ChaincodesPage/ChaincodesPage';
import ChannelBlock from '../ChannelBlock/ChannelBlock';
import ChannelDetails from '../ChannelDetails/ChannelDetails';
import Channels from '../Channels/Channels';
import Identities from '../Identities/Identities';
import LeftNav from '../LeftNav/LeftNav';
import Logger from '../Log/Logger';
import Access from '../Access/Access';
import Msps from '../Msps/Msps';
import Nodes from '../Nodes/Nodes';
import NotFound from '../NotFound/NotFound';
import Notifications from '../Notifications/Notifications';
import OrdererDetails from '../OrdererDetails/OrdererDetails';
import OrganizationDetails from '../OrganizationDetails/OrganizationDetails';
import PeerDetails from '../PeerDetails/PeerDetails';
import ScrollToTop from '../ScrollToTop/ScrollToTop';
import Settings from '../Settings/Settings';
import Support from '../Support/Support';
import TitleBar from '../TitleBar/TitleBar';
import MigrationPage from '../MigrationPage/MigrationPage';
import AuditLogs from '../AuditLogs/AuditLogs';

const SCOPE = 'main';
const Log = new Logger(SCOPE);

class Main extends Component {
	constructor(props) {
		super(props);

		this.idleTimer = null;
		this.onActive = this._onActive.bind(this);
		this.onIdle = this._onIdle.bind(this);

		this.idleWarningTimer = null;
		this.onWarningIdle = this._onWarningIdle.bind(this);
		this.warningInterval = null;
	}

	componentDidMount() {
		WebSockets.connect();
		SettingsApi.getSettings()
			.then(settings => {
				const inactivity_timeouts_enabled = !!_.get(settings, 'INACTIVITY_TIMEOUTS.enabled');
				const max_idle_time = _.get(settings, 'INACTIVITY_TIMEOUTS.max_idle_time');
				const max_idle_warning_time = max_idle_time - Math.min(2 * 60 * 1000, Math.floor(max_idle_time * 0.2));
				const in_read_only_mode = _.get(settings, 'FEATURE_FLAGS.read_only_enabled') ? true : false;
				const enabled = inactivity_timeouts_enabled && max_idle_time >= Math.floor(30 * 1000);
				Log.info(`Inactivity timeouts are ${enabled ? 'enabled' : 'disabled'} at ${max_idle_time} ms.`);
				this.props.updateState(SCOPE, {
					inactivity_timeouts_enabled: enabled,
					max_idle_time: max_idle_time,
					max_idle_warning_time: max_idle_warning_time,
					in_read_only_mode: in_read_only_mode,
					audit_logging_enabled: _.get(settings, 'FEATURE_FLAGS.audit_logging_enabled') ? true : false,
				});
			})
			.catch(error => {
				console.error(error);
				this.props.updateState(SCOPE, {
					in_read_only_mode: false,
					audit_logging_enabled: false
				});
			});
	}

	componentWillUnmount() {
		WebSockets.disconnect();
	}

	_onActive = e => {
		this.props.updateState(SCOPE, {
			session_times_out_soon: false,
		});
		if (this.warningInterval) {
			clearInterval(this.warningInterval);
		}
	};

	_onIdle = e => {
		if (this.idleWarningTimer) this.idleWarningTimer.pause();
		this.idleTimer.pause();
		this.props.updateState(SCOPE, {
			session_times_out_soon: false,
			session_timed_out: true,
		});
		if (this.warningInterval) {
			clearInterval(this.warningInterval);
		}
		LoginApi.logout('no_redirect')
			.then(result => {
				Log.info(`Killed user session.  User must refresh the page: ${JSON.stringify(result)}`);
			})
			.catch(error => {
				Log.error(`Could not kill user session: ${error}`);
			});
	};

	_onWarningIdle = e => {
		this.props.updateState(SCOPE, {
			idle_time_remaining: this.idleTimer.getRemainingTime(),
		});
		this.warningInterval = setInterval(() => {
			this.props.updateState(SCOPE, {
				idle_time_remaining: Math.max(this.idleTimer.getRemainingTime(), 1001), // Don't display ms
			});
		}, 1000);

		this.props.updateState(SCOPE, {
			session_times_out_soon: true,
		});
	};

	render() {
		const translate = this.props.t;
		return (
			<BrowserRouter>
				<div className="ibm ibp-main">
					<TitleBar userInfo={this.props.userInfo}
						host_url={this.props.host_url}
						inReadOnlyMode={this.props.in_read_only_mode}
					/>
					<div role="main"
						className="ibp-main-content"
					>
						<LeftNav auditLogsEnabled={this.props.audit_logging_enabled} />
						<div className="ibp-page-content">
							<ScrollToTop>
								<Routes>
									<Route
										index
										path="/"
										element={<Navigate to="/nodes" replace={true} />}
									/>
									<Route path="/nodes"
										element={<Nodes />}
										exact
									/>
									<Route path="/peer/:peerId"
										element={<PeerDetails />}
									/>
									<Route exact
										path="/orderer/:clusterIdPath"
										element={<OrdererDetails />}
									/>
									<Route exact
										path="/orderer/:clusterIdPath/:nodeId"
										element={<OrdererDetails />}
									/>
									{/* /debug is a debugging route that exposes a link in the left pane to download the config block of the channel */}
									<Route exact
										path="/debug/orderer/:clusterIdPath/:channelId?"
										element={<OrdererDetails />}
									/>
									<Route path="/ca/:caId"
										element={<CADetails />}
									/>
									<Route path="/channels"
										element={<Channels />}
										exact
									/>
									{/* 2023/05/01 the /users route is now legacy, renamed to /access */}
									<Route path="/users"
										element={<Access />}
										exact
									/>
									<Route path="/access"
										element={<Access />}
										exact
									/>
									<Route path="/peer/:peerId/channel/:channelId"
										element={<ChannelDetails />}
										exact
									/>
									{/* /debug is a debugging route that exposes a link in the left pane to download the config block of the channel */}
									<Route path="/debug/peer/:peerId/channel/:channelId"
										element={<ChannelDetails />}
										exact
									/>
									<Route path="/peer/:peerId/channel/:channelId/block/:blockNumber"
										element={<ChannelBlock />}
										exact
									/>
									<Route path="/channel/:channelId"
										element={<ChannelDetails />}
										exact
									/>
									<Route path="/channel/:channelId/block/:blockNumber"
										element={<ChannelBlock />}
										exact
									/>
									<Route path="/smart-contracts"
										element={<ChaincodesPage />}
										exact
									/>
									<Route path="/settings"
										element={<Settings />}
										exact
									/>
									<Route path="/wallet"
										element={<Identities />}
										exact
									/>
									<Route path="/organizations"
										element={<Msps />}
										exact
									/>
									<Route exact
										path="/organization/:mspId"
										element={<OrganizationDetails />}
									/>
									<Route path="/support"
										element={<Support />}
										exact
									/>
									<Route path="/export-identities"
										element={<Settings />}
										exact
									/>
									<Route path="/migration"
										element={<MigrationPage />}
										exact
									/>
									<Route exact
										path="/audit"
										element={<AuditLogs />}
									/>
									<Route path="*"
										element={<NotFound />}
									/>
								</Routes>
							</ScrollToTop>
						</div>
					</div>
					<Notifications />

					{this.props.inactivity_timeouts_enabled && (
						<div>
							<withIdleTimer
								ref={ref => {
									this.idleWarningTimer = ref;
								}}
								element={document}
								onActive={this.onActive}
								onIdle={this.onWarningIdle}
								debounce={1000}
								timeout={this.props.max_idle_warning_time}
							/>
							<withIdleTimer
								ref={ref => {
									this.idleTimer = ref;
								}}
								element={document}
								onActive={this.onActive}
								onIdle={this.onIdle}
								debounce={1000}
								timeout={this.props.max_idle_time}
							/>
						</div>
					)}

					{this.props.session_timed_out && (
						<Modal
							className="ibp-timeout-modal"
							modalHeading={translate('session_timeout_label')}
							open
							primaryButtonText={translate('refresh')}
							onRequestSubmit={() => {
								window.location.reload();
							}}
							onRequestClose={() => {
								/* Stop the modal from closing */
							}}
						>
							<p>
								{translate('session_timeout_message', {
									timeout: Helper.friendly_ms(this.props.max_idle_time, translate, 0),
								})}
							</p>
							<div className="mt-5">
								<Link href={translate('troubleshooting_link', { DOC_PREFIX: this.props.docPrefix })}>{translate('learn_more')}</Link>
							</div>
						</Modal>
					)}

					{this.props.session_times_out_soon && (
						<Modal className="ibp-timeout-modal ibp-timeout-warning"
							modalHeading={translate('session_warning_label')}
							passiveModal
							danger
							open
						>
							<p>{translate('session_warning_message', { idle_time_remaining: Helper.friendly_ms(this.props.idle_time_remaining, translate, 0) })}</p>
						</Modal>
					)}
				</div>
			</BrowserRouter>
		);
	}
}

const dataProps = {
	session_timed_out: PropTypes.bool,
	consoleIdentities: PropTypes.array,
	session_times_out_soon: PropTypes.bool,
	idle_time_remaining: PropTypes.number,
	inactivity_timeouts_enabled: PropTypes.bool,
	max_idle_time: PropTypes.number,
	max_idle_warning_time: PropTypes.number,
	in_read_only_mode: PropTypes.bool,
	audit_logging_enabled: PropTypes.bool,
};

Main.propTypes = {
	...dataProps,
	userInfo: PropTypes.object,
	host_url: PropTypes.string,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['docPrefix'] = state['settings'] ? state['settings']['docPrefix'] : null;
		newProps['consoleIdentities'] = state['gettingStartedModal'] ? state['gettingStartedModal']['consoleIdentities'] : null;
		return newProps;
	},
	{
		showSuccess,
		showError,
		updateState,
	}
)(withTranslation()(Main));
