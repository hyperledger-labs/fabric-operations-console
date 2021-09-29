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
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import './app.scss';
import AuthSetup from './components/AuthSetup/AuthSetup';
import LoadingWithContent from './components/LoadingWithContent/LoadingWithContent';
import Logger from './components/Log/Logger';
import Login from './components/Login/Login';
import Main from './components/Main/Main';
import RequestAccess from './components/RequestAccess/RequestAccess';
import { updateState } from './redux/commonActions';
import ConfigureAuthApi from './rest/ConfigureAuthApi';
import { NodeRestApi } from './rest/NodeRestApi';
import SignatureRestApi from './rest/SignatureRestApi';
import StitchApi from './rest/StitchApi';
import UserSettingsRestApi from './rest/UserSettingsRestApi';
import ActionsHelper from './utils/actionsHelper';
import Helper from './utils/helper';
import localization from './utils/localization';
import NodeStatus from './utils/status';
import { setupMedallia } from './utils/medallia';

const SCOPE = 'app';
const Log = new Logger('App');
Log.setLogLevel('warn');

class App extends Component {
	disableAuth = false;
	cName = 'App';
	constructor(props) {
		super(props);
		localization.init(props);

		this.state = {
			authScheme: null,
			productLabelLogin: 'product_label_login', // default translation key
		};
	}

	async componentDidMount() {
		NodeStatus.initialize(this.props.dispatch);

		let userInfo;
		try {
			userInfo = await this.getUserInfo();
			await this.isAuthConfigured();
		} catch (error) {
			Log.error(`Failed to get user info: ${error}`);
		}

		let settings;
		try {
			settings = await this.getApplicationSettings();
		} catch (error) {
			Log.error(`Failed to get application settings: ${error}`);
			return;
		}

		try {
			await this.getSignatureCollectionRequests(settings.HOST_URL);
		} catch (error) {
			Log.error(`Failed to get signature collection requests: ${error}`);
		}

		if (settings.INFRASTRUCTURE === 'ibmcloud' && !_.get(settings, 'FEATURE_FLAGS.import_only_enabled')) {
			try {
				const isDev = settings.CRN.c_name === 'staging';
				setupMedallia(userInfo, this.props.activeLanguage, isDev);
			} catch (error) {
				Log.error(`Failed to setup Medallia surveys: ${error}`);
			}
		}
	}

	initializeSegment(segment_key) {
		const varScript = document.createElement('script');
		varScript.innerHTML = `
		var productTitle = "Blockchain Platform v2";

		window._analytics = {
			"segment_key" : '${segment_key}',
			"coremetrics" : false,
			"optimizely" : false,
			"autoPageView" : false
		};
		`;
		document.head.appendChild(varScript);

		const script = document.createElement('script');
		script.src = 'https://test.cloud.ibm.com/analytics/build/bluemix-analytics.min.js';
		document.head.appendChild(script);

		const analyticsFuncScript = document.createElement('script');
		analyticsFuncScript.innerHTML = `
			function trackEvent (event, obj) {
				obj.productTitle = productTitle;
				if (window.bluemixAnalytics) window.bluemixAnalytics.trackEvent(event, obj);
				else console.log("bluemixAnalytics not available");
			}

			function pageEvent (event, pageName, obj) {
				obj.productTitle = productTitle;
				if (window.bluemixAnalytics) window.bluemixAnalytics.pageEvent( event, name = pageName ,  obj);
				else console.log("bluemixAnalytics not available");
			}
		`;
		document.head.appendChild(analyticsFuncScript);
	}

	async isAuthConfigured() {
		let resp;
		try {
			resp = await ConfigureAuthApi.getAuthScheme();
		} catch (error) {
			Log.error(`Could not get auth scheme.  Assuming no auth is configured: ${error}`);
			this.setState({
				authScheme: {
					isAuthConfigured: false,
				},
			});
			return;
		}
		let l_authScheme = resp.auth_scheme;
		let isConfigured = true;
		if (resp.auth_scheme === 'none') {
			this.disableAuth = true;
		}
		if (l_authScheme === '' || (l_authScheme !== 'ibmid' && l_authScheme !== 'iam' && l_authScheme !== 'appid' && l_authScheme !== 'couchdb')) {
			Log.info('No auth scheme configured yet, redirecting to configure auth page', l_authScheme);
			isConfigured = false;
		}
		if (this.props.userInfo && this.props.userInfo.loggedInAs && this.props.userInfo.loggedInAs.email) {
			this.props.updateState('settings', {
				isAdmin: ActionsHelper.canRestartOpTools(this.props.userInfo),
			});
		}
		this.props.updateState('settings', {
			default_consortium: resp.default_consortium,
			configtxlator_url: resp.configtxlator_url,
			authScheme: l_authScheme,
		});
		this.setState({
			authScheme: {
				type: l_authScheme,
				isAuthConfigured: isConfigured,
				host_url: resp.host_url,
				admin_list: resp.admin_list,
				access_list: resp.access_list,
				admin_contact_email: resp.admin_contact_email,
			},
		});
		NodeRestApi.setDefaultHostUrl(resp.host_url);
	}

	async getSignatureCollectionRequests(host_url) {
		if (!this.props.userInfo || !this.props.userInfo.logged) {
			Log.debug('Requests=', 'skipping signature collection api b/c not logged in');
		} else {
			const requests = await SignatureRestApi.getAllRequests('signatureCollection', this.props.dispatch, host_url + '/api/v1');
			// Log.debug('Requests=', requests);
			return requests;
		}
	}

	async getApplicationSettings() {
		const settings = await UserSettingsRestApi.getApplicationSettings();
		// set log level from database
		let log_level = settings.FILE_LOGGING['client'].level;
		if (!log_level) {
			log_level = 'warn';
		}
		let segment_key = 'non-prod'; // non-prod
		Log.setLogLevel(log_level);
		Log.info('Current debug level: ' + Log.getLogLevel());
		// Log.debug('Application settings: ', settings);
		let crn = settings.CRN;
		if (!crn.account_id) crn.account_id = 'n/a';
		let bmix_url = '';
		switch (crn.c_name) {
			case 'staging':
				bmix_url = 'https://test.cloud.ibm.com';
				break;
			case 'bluemix':
				if (crn.service_name === 'blockchain') {
					segment_key = 'prod'; //prod
				}
				bmix_url = 'https://cloud.ibm.com';
				break;
			default:
				break;
		}
		let platform = '';
		if (settings.INFRASTRUCTURE === 'openshift') {
			platform = '-sw-252';
		}
		const modifiedCrnString = settings.CRN_STRING && settings.CRN_STRING.indexOf('::') !== -1 && settings.CRN_STRING.slice(0, -1);
		const doc_prefix = bmix_url + '/docs/services/blockchain' + platform + '?topic=blockchain' + platform + '-';
		let features = {
			feature_flags: settings.FEATURE_FLAGS,
			CRN: crn,
			crn_string: modifiedCrnString,
			bmixUrl: bmix_url,
			docPrefix: doc_prefix,
			cluster_data: settings.CLUSTER_DATA,
			host_url: settings.HOST_URL,
			version: settings.VERSION,
			transaction_visibility: settings.TRANSACTION_VISIBILITY,
			capabilities: settings.FABRIC_CAPABILITIES,
			platform: settings.INFRASTRUCTURE,
			default_consortium: settings.DEFAULT_CONSORTIUM,
			hsm: settings.HSM,
		};
		this.props.updateState('settings', features);
		const client_timeouts = _.get(settings, 'TIMEOUTS.CLIENT');
		if (client_timeouts) {
			StitchApi.setTimeouts(client_timeouts);
		}
		if (_.get(settings, 'FEATURE_FLAGS.infra_import_options')) {
			Helper.setInfrastructure(settings.FEATURE_FLAGS.infra_import_options);
		}

		// use setPlatform() after setInfrastructure() to make sure "platform" is set correctly
		// b/c we trust settings.INFRASTRUCTURE and don't trust FEATURE_FLAGS.infra_import_options.platform
		if (settings.INFRASTRUCTURE) {
			Helper.setPlatform(settings.INFRASTRUCTURE);
			if (settings.INFRASTRUCTURE === 'ibmcloud' || settings.INFRASTRUCTURE === 'cloud') {
				this.initializeSegment(segment_key);
			}
		}
		if (features.cluster_data.type === null) {
			let serviceInfo = null;
			try {
				serviceInfo = await NodeRestApi.getServiceInstanceInfo();
			} catch (err) {
				serviceInfo = { info: { isPaid: false } };
			}
			features.cluster_data.type = _.get(serviceInfo, 'info.isPaid') ? 'paid' : 'free';
			this.props.updateState('settings', features);
		}
		if (features.cluster_data.type !== 'paid') {
			features.feature_flags.hsm_enabled = false;
			this.props.updateState('settings', features);
		}

		if (settings.PRODUCT_LABEL_LOGIN_KEY) {
			this.setState({
				productLabelLogin: settings.PRODUCT_LABEL_LOGIN_KEY,
			});
		}

		return settings;
	}

	async getUserInfo() {
		const userInfo = await UserSettingsRestApi.getUserInfo();
		this.props.updateState('userInfo', userInfo);
		return userInfo;
	}

	// setup the loglevel-plugin-remote (storing client side logs on the server)
	setupRemoteLogging() {
		const remote_logging_options = {
			url: '/api/v1/logs', // http url to send logs, relative route okay
			method: 'POST', // http method to send logs
			headers: {}, // http headers to send w/logs
			timeout: 10000, // http req timeout, [ms]
			interval: 5000, // interval to post logs, [ms]
			level: 'trace', // logging level and below to send
			backoff: {
				// on req failure try again in a bit
				multiplier: 6, // multiple prev back off by this (we want to slow down quickly to avoid hitting the api lockout)
				jitter: 0.1, // 0.1 = 10% more back off
				limit: 300000, // upper limit of back off [ms]
			},
			capacity: 500, // max number of logs to buffer, overflow deletes oldest!
			stacktrace: {
				levels: ['trace', 'warn', 'error'], // logging levels that can generate stack trace
				depth: 6, // number of lines for stack traces, excess is truncated
				excess: 0, // number of additional lines plugins can generate or something strange
			},
			timestamp: () => {
				// create a utc timestamp similar to athena -> '%Y/%M/%d-%H:%m:%s.%r'
				const date = new Date();
				return (
					date.getUTCFullYear() +
					'/' +
					pad(date.getUTCMonth() + 1, 2) +
					'/' +
					pad(date.getUTCDate(), 2) +
					'-' +
					pad(date.getUTCHours(), 2) +
					':' +
					pad(date.getUTCMinutes(), 2) +
					':' +
					pad(date.getUTCSeconds(), 2) +
					'.' +
					pad(date.getUTCMilliseconds(), 3)
				);
			},
			format: log => {
				// create a log format similar to athena
				function encodeNewLines(text) {
					try {
						const temp = JSON.stringify(text).replace(/\\"/g, '"');
						return temp.substring(1, 1) + temp.substring(1, temp.length - 1);
					} catch (e) {
						return text;
					}
				}
				log.message = encodeNewLines(log.message); // remove new lines? not sure if its a good idea yet
				return log.timestamp + ' - [' + log.level.label.toLowerCase() + '] ' + log.message + (log.stacktrace ? '\n' + log.stacktrace : '');
			},
		};
		try {
			window.remote.apply(window.log, remote_logging_options);
			window.log.setLevel('debug');
		} catch (e) {
			// might already be applied
		}

		// left pad number with "0" if needed
		function pad(value, desired) {
			let str = value.toString();
			for (let i = str.length; i < desired; i++) {
				str = '0' + str;
			}
			return str;
		}
	}

	render() {
		const translate = this.props.translate;
		if (this.disableAuth) {
			Log.info('Auth is disabled!');
		}

		if (this.state.authScheme === null || this.props.userInfo === null) {
			return (
				<LoadingWithContent withOverlay
					description={translate('loading')}
				>
					<h3>{translate('loading')}</h3>
				</LoadingWithContent>
			);
		} else if (!this.disableAuth) {
			if (!this.state.authScheme.isAuthConfigured) return <AuthSetup />;
			else {
				let admin_list = this.state.authScheme.admin_list.map(x => (x.email ? x.email.toLowerCase() : x.toLowerCase()));
				let access_list = this.state.authScheme.access_list
					? this.state.authScheme.access_list.map(x => (x.email ? x.email.toLowerCase() : x.toLowerCase()))
					: [];
				const { email } = this.props.userInfo.loggedInAs;

				if (
					(this.props.userInfo.logged &&
						(this.state.authScheme.type === 'ibmid' || this.state.authScheme.type === 'iam') &&
						!ActionsHelper.canViewOpTools(this.props.userInfo)) ||
					(this.props.userInfo.logged &&
						this.state.authScheme.type === 'appid' &&
						!(admin_list.includes(email.toLowerCase()) || access_list.includes(email.toLowerCase())))
				)
					return (
						<RequestAccess adminContact={this.state.authScheme.admin_contact_email}
							userInfo={this.props.userInfo}
							host_url={this.state.authScheme.host_url}
						/>
					);
			}
		}

		Log.debug('Current auth scheme and user info:', this.state.authScheme.type, this.props.userInfo);
		if (this.state.authScheme.type === 'couchdb' && this.props.userInfo && !this.props.userInfo.logged) {
			return <Login
				hostUrl={this.state.authScheme.host_url}
				productLabelLogin={this.state.productLabelLogin}
			/>;
		}

		if (this.state.authScheme.type === 'couchdb' && this.props.userInfo && this.props.userInfo.logged && this.props.userInfo.password_type === 'default') {
			return <Login hostUrl={this.state.authScheme.host_url}
				changePassword={true}
				productLabelLogin={this.state.productLabelLogin}
			/>;
		}

		if (this.props.userInfo && !this.props.userInfo.logged && !this.disableAuth) {
			window.location.href = `${this.state.authScheme.host_url}/auth/login`;
		}

		if ((this.props && this.props.userInfo && this.props.userInfo.logged) || this.disableAuth) {
			Log.info('Starting application!');
			this.setupRemoteLogging(); // setup the remote logging after the user has logged in to avoid hitting api lockout
			return <Main userInfo={this.props.userInfo}
				host_url={this.state.authScheme.host_url}
			/>;
		} else {
			return (
				<LoadingWithContent withOverlay
					description={translate('redirecting_login')}
				>
					<h3>{translate('redirecting_login')}</h3>
				</LoadingWithContent>
			);
		}
	}
}

const dataProps = {
	updateState: PropTypes.func,
	userInfo: PropTypes.object,
	translate: PropTypes.func, // Provided by withLocalize
};

App.propTypes = {
	...dataProps,
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['userInfo'] = state['userInfo'] ? state['userInfo'] : null;
		return newProps;
	},
	dispatch => {
		return {
			dispatch,
			...bindActionCreators({ updateState }, dispatch),
		};
	}
)(withLocalize(App));
