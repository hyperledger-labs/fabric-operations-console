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
//=======================================================================================================
// Settings Module for environmental variables
//	- Get all the settings we need to run from the config database
// 	- Will not run w/o passing check_final_envs()!
//=======================================================================================================

module.exports = function (logger, t, noInterval, noAutoRun) {
	const update_min = 90;
	const update_ms = 1000 * 60 * update_min;		// time in ms to fetch new settings (note new settings will be pushed to athena under normal conditions)
	const db_names = [];
	// let update_debounce = null;
	let cbs = [];

	let settings = {											// defaults env settings
		DB_CONNECTION_STRING: 'https://example.com',			// leave as dummy url
		DB_SYSTEM: '',											// leave blank (gets replaced below)

		UPDATE_SCH: {											// time info on the next update
			born: Date.now(),									// timestamp we started
			previous: Date.now(),
			next: null,											// populated below
		}
	};

	if (!noAutoRun) {
		check_starting_envs(process.env);
	}

	// sets ev.DB_CONNECTION_STRING and ev.DB_SYSTEM (and any other env var) from the env settings
	for (const key in settings) {									// overwrite settings[key] with env[key] if env[key] exists
		if (process.env[key]) { settings[key] = process.env[key]; }	// gets replaced here
	}

	//------------------------------------------------------
	// compact all databases
	//------------------------------------------------------
	settings.compact_all_dbs = () => {
		if (settings.AUTH_SCHEME === 'couchdb') {					// saas cannot compact dbs b/c cloudant doesn't support it
			t.async.eachLimit(db_names, 4, (db_name, cb_compaction) => {
				logger.debug('running compaction on database:', db_name);
				t.couch_lib.startCompaction({ db_name: db_name }, (e, resp) => {
					cb_compaction(null);
				});
			});
		}
	};

	//------------------------------------------------------
	// Get settings from settings doc in the database
	//------------------------------------------------------
	/*
		options: {
			exitIfError: true,
		}
	*/
	settings.update = async (options, cb) => {
		// clearTimeout(update_debounce);
		//logger.debug('[settings] - debouncing settings update'); // removed - minimize logs
		if (cb) {
			cbs.push(cb);								// remember our callback
		}

		// update_debounce = setTimeout(() => {			// debounce the update function
		settings.update_settings(options, (err, resp) => {
			for (let i in cbs) {					// hit all callbacks
				cbs[i](err, resp);
			}
			cbs = [];								// clear all callbacks
		});
		// }, 200);
	};

	settings.update_settings = (options, cb) => {
		logger.debug('[settings] updating settings from doc "' + process.env.SETTINGS_DOC_ID + '" db:', settings.DB_SYSTEM);

		const original = JSON.stringify(settings);				// store in case we need to revert
		t.async.parallel([

			// --- Get Athena Settings Doc [0] --- //
			function (join) {
				t.couch_lib.getDoc({ db_name: settings.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, function (err, athena) {
					if (err) {
						logger.error('[settings] an error occurred obtaining the "' + process.env.SETTINGS_DOC_ID + '" db:', settings.DB_SYSTEM, err, athena);
						join(err, athena);
					} else {
						join(null, athena);
					}
				});
			},

			// --- Get Athena JSON Validation Docs [1] --- //
			function (join) {
				const opts = {
					db_name: settings.DB_SYSTEM,
					_id: '_design/athena-v1',
					view: 'json_validation',
					query: t.misc.formatObjAsQueryParams({ include_docs: true }),
					SKIP_CACHE: true,
				};
				t.couch_lib.getDesignDocView(opts, (err, resp) => {
					if (err) {
						logger.error('[settings] an error occurred obtaining json validation docs... db:', settings.DB_SYSTEM, err, resp);
						join(err, resp);
					} else {
						join(null, resp);
					}
				});
			},

		], (settingsError, results) => {
			if (settingsError || !results[0]) {
				logger.warn('[settings] error getting setting docs:', settingsError);
				if (options && options.exitIfError) {
					logger.error('[settings] could not update settings. Death is near.');
					process.exit();					// shut down everything
				} else {
					if (cb) { return cb({ err: settingsError, msg: results }); }
				}
			} else {
				const athena = results[0];			// rename for convenience
				settings.PORT = process.env.PORT || process.env.APP_PORT || athena.app_port || 3000;	// port to use this app should bind to
				//settings.PORT = 3000 + Math.round(Math.random() * 100);
				settings.PORT = Number(settings.PORT);
				settings.UPDATE_SCH.previous = Date.now();												// record when we updated

				// ---- pull from ATHENA settings doc ---- //
				settings.AUTH_SCHEME = process.env.AUTH_SCHEME || athena.auth_scheme;	// if we are using appid or ibmid or something else
				settings.HOST_URL = t.misc.format_url(process.env.HOST_URL || athena.host_url);	// the external url to reach this application
				settings.REGION = process.env.REGION || athena.region;
				settings.db_defaults = athena.db_defaults;
				load_database_names(athena);										// load all db names here
				settings.ENFORCE_BACKEND_SSL = athena.enforce_backend_ssl;			// should we check certs or not, server side
				settings.ACCESS_LIST = lowercase_key_values(athena.access_list);	// athena access list
				settings.INITIAL_ADMIN = athena.initial_admin;
				settings.ADMIN_CONTACT_EMAIL = athena.admin_contact_email || athena.contact_admin || athena.initial_admin; // "contact_admin" is legacy 04/2020
				settings.APP_ID = athena.app_id;									// ibm cloud app id service creds (object)
				settings.LOGIN_URI = '/auth/login';									// app id AND ibm id path to initiate sso login
				settings.LOGOUT_URI = '/auth/logout';								// app id AND ibm id path to logout
				settings.CALLBACK_URI = '/auth/cb';									// app id path of our redirect url (receive app id login)

				settings.SESSION_SECRET = athena.session_secret || t.misc.hash_str('ibp' + settings.HOST_URL + settings.REGION).toString();	// used by express
				settings.CONFIGTXLATOR_URL_ORIGINAL = process.env.CONFIGTXLATOR_URL_ORIGINAL || athena.configtxlator_url_original;	// incoming url to use
				settings.SYSTEM_CHANNEL_ID = athena.system_channel_id;				// name of the system channel in fabric
				settings.DEFAULT_CONSORTIUM = athena.default_consortium || 'SampleConsortium';				// name of the default consortium in fabric
				settings.FEATURE_FLAGS = athena.feature_flags;						// features needed conditionally, object
				settings.FILE_LOGGING = athena.file_logging;						// file logging settings are here, object
				settings.LANDING_URL = athena.landing_url || settings.HOST_URL;		// use host url if landing url dne
				settings.DEPLOYER_URL = t.misc.format_url(athena.deployer_url, { useIpv4: true });	// url to use for a the deployer
				settings.JUPITER_URL = t.misc.format_url(athena.jupiter_url, { useIpv4: true });	// url to use for a SaaS jupiter
				settings.SUPPORT_KEY = athena.support_key || 'ibpsupport';
				settings.SUPPORT_PASSWORD = athena.support_password || t.misc.generateRandomString(16).toLowerCase();
				settings.PROXY_TLS_HTTP_URL = fmt_proxy_url(athena.proxy_tls_http_url) || settings.HOST_URL; // the external url to proxy http fabric traffic to
				settings.PROXY_TLS_WS_URL = fmt_proxy_url(athena.proxy_tls_ws_url) || settings.HOST_URL;	 // the external url to proxy ws fabric traffic to
				settings.PROXY_TLS_FABRIC_REQS = athena.proxy_tls_fabric_reqs;		// if athena should proxy fabric traffic or not

				// backend timeouts (all should be in milliseconds)
				settings.HTTP_TIMEOUT = !isNaN(athena.http_timeout) ? Number(athena.http_timeout) : 2 * 60 * 1000;		// max time for athena 2 resp to any req
				settings.WS_TIMEOUT = !isNaN(athena.ws_timeout) ? Number(athena.ws_timeout) : settings.HTTP_TIMEOUT;	// defaults to http timeout
				settings.DEPLOYER_TIMEOUT = !isNaN(athena.deployer_timeout) ? Number(athena.deployer_timeout) : 105 * 1000; // max time for dep to resp
				settings.CONFIGTXLATOR_TIMEOUT = !isNaN(athena.configtxlator_timeout) ? Number(athena.configtxlator_timeout) : 1 * 60 * 1000;
				settings.HTTP_STATUS_TIMEOUT = !isNaN(athena.http_status_timeout) ? Number(athena.http_status_timeout) : 3 * 1000; // max time for status req

				settings.HTTP_METRICS_WAIT = !isNaN(athena.http_metrics_wait) ? Number(athena.http_metrics_wait) : 3 * 1000;
				settings.ENVIRONMENT = athena.environment;
				settings.INFRASTRUCTURE = athena.infrastructure || '';
				settings.TRANSACTION_VISIBILITY = athena.transaction_visibility;											// brian wanted this to toggle tx
				settings.IAM_API_KEY = process.env.IAM_API_KEY || athena.iam_api_key;										// ibp's api key for IAM
				settings.CSP_HEADER_VALUES = Array.isArray(athena.csp_header_values) ? athena.csp_header_values : ['default-src \'self\''];
				settings.MAX_REQ_PER_MIN = !isNaN(athena.max_req_per_min) ? Number(athena.max_req_per_min) : 25;			// http rate limit (general APIs)
				settings.MAX_REQ_PER_MIN_AK = !isNaN(athena.max_req_per_min_ak) ? Number(athena.max_req_per_min_ak) : 25;	// http rate limit (api key APIs)
				settings.CLUSTER_DATA = athena.cluster_data;
				settings.IGNORE_CONFIG_FILE = athena.ignore_config_file;
				settings.URL_SAFE_LIST = Array.isArray(athena.url_safe_list) ? athena.url_safe_list : ['.*'];	// regex hostnames that we can talk to
				settings.DEFAULT_USER_PASSWORD_INITIAL = process.env.DEFAULT_USER_PASSWORD_INITIAL || athena.default_user_password_initial;
				settings.FABRIC_CAPABILITIES = athena.fabric_capabilities;
				settings.MIN_PASSWORD_LEN = !isNaN(athena.min_password_len) ? Number(athena.min_password_len) : 10;
				settings.MAX_PASSWORD_LEN = !isNaN(athena.max_password_len) ? Number(athena.max_password_len) : 128;
				settings.MIN_PASSPHRASE_LEN = !isNaN(athena.min_passphrase_len) ? Number(athena.min_passphrase_len) : 20;
				settings.MIN_USERNAME_LEN = !isNaN(athena.min_username_len) ? Number(athena.min_username_len) : 6;
				settings.MAX_USERNAME_LEN = !isNaN(athena.max_username_len) ? Number(athena.max_username_len) : 64;
				settings.COOKIE_NAME = athena.cookie_name; 															// the name of the browser session cookie
				settings.TRUST_PROXY = athena.trust_proxy;
				settings.HSM = athena.hsm;
				settings.LOCKOUT_LIMIT = !isNaN(athena.lockout_limit) ? Number(athena.lockout_limit) : 4;
				settings.DISABLED_COMPACTION = athena.disabled_compaction;
				settings.DISABLE_AUTO_FAB_UP = athena.disable_auto_fab_up;

				// each key in this object is a version that is okay.
				// any less will be auto upgraded to the highest minor version for that component that deployer has available.
				settings.AUTO_FAB_UP_VERSIONS = athena.auto_fab_up_versions;
				settings.AUTO_FAB_UP_EXP_TOO_CLOSE_DAYS = athena.auto_fab_up_exp_too_close_days;

				const versions = t.ot_misc.parse_versions();
				settings.ATHENA_VERSION = (versions && versions.tag) ? versions.tag : '-';

				// important default_user_password is 1st
				settings.DEFAULT_USER_PASSWORD = athena.default_user_password || settings.DEFAULT_USER_PASSWORD_INITIAL;
				settings.MIN_SHORT_NAME_LENGTH = 8;
				settings.MAX_SHORT_NAME_LENGTH = 32;
				settings.TRUST_UNKNOWN_CERTS = athena.trust_unknown_certs === true;	// if sig in signature collection can be verified with untrusted certificate
				settings.DYNAMIC_CONFIG = athena.dynamic_config;
				settings.DYNAMIC_TLS = athena.dynamic_tls;
				settings.THE_DEFAULT_RESOURCES_MAP = athena.the_default_resources_map;
				settings.HTTP_METRICS_ENABLED = athena.http_metrics_enabled;
				settings.SEGMENT_WRITE_KEY = athena.segment_write_key;
				settings.MAX_COMPONENTS = !isNaN(athena.max_components) ? Number(athena.max_components) : 75;
				settings.IMPORT_ONLY = athena.feature_flags ? athena.feature_flags.import_only_enabled : false;
				settings.READ_ONLY = athena.feature_flags ? athena.feature_flags.read_only_enabled : false;
				settings.ALLOW_DEFAULT_PASSWORD = athena.allow_default_password ? true : false;
				settings.MIGRATED_CONSOLE_URL = athena.migrated_console_url || '';
				settings.MIGRATION_API_KEY = athena.migration_api_key || t.misc.generateRandomString(64).toLowerCase();
				settings.MIGRATION_MIN_VERSIONS = athena.migration_min_versions || {};
				settings.MIGRATION_MON_INTER_SECS = !isNaN(athena.migration_mon_inter_secs) ? Number(athena.migration_mon_inter_secs) : 25;
				settings.MIGRATION_STATUS = athena.migration_status;

				// allow integration test to be ran from the provided UI
				settings.integration_test_enabled = athena.integration_test_enabled ? athena.integration_test_enabled : false;

				// build the crn object, use defaults if we must
				settings.parse_crn_data(athena);									// call this to setup crn parsing
				settings.CRN = {													// final build of the CRN object
					version: athena.crn.version || 'v1',
					c_name: athena.crn.c_name || 'bluemix',
					c_type: athena.crn.c_type || 'public',
					service_name: athena.crn.service_name || 'blockchain',
					location: athena.crn.location || '',
					account_id: athena.crn.account_id || '',						// fairly important field
					instance_id: athena.crn.instance_id || '',						// this one's important, aka iid
					resource_type: athena.crn.resource_type || '',
					resource_id: athena.crn.resource_id || '',
				};
				// example str: 'crn:v1:bluemix:public:blockchain:us-south:' + account_id + ':' + instance_id + '::';
				settings.CRN_STRING = 'crn:' + settings.CRN.version +				// final build of CRN string
					':' + settings.CRN.c_name +
					':' + settings.CRN.c_type +
					':' + settings.CRN.service_name +
					':' + settings.CRN.location +
					':' + settings.CRN.account_id +
					':' + settings.CRN.instance_id +
					'::';															// blank these out, not useful for our purposes

				// build this safely for the safety nancy's
				const idle = t.misc.safe_dot_nav(athena, 'athena.inactivity_timeouts.max_idle_time');
				settings.MIN_IDLE = 1 * 60 * 1000;									// "large" minimum delay prevents immediate logout
				settings.MAX_IDLE = (Math.pow(2, 31) - 1);							// max delay setTimeout() can take
				settings.INACTIVITY_TIMEOUTS = {
					enabled: t.misc.safe_dot_nav(athena, 'athena.inactivity_timeouts.enabled') || false,
					max_idle_time: (!isNaN(idle) && idle <= settings.MAX_IDLE && idle >= settings.MIN_IDLE) ? Number(idle) : 2 * 60 * 1000,
				};

				// if a cache for couch calls should be enabled or not
				settings.MEMORY_CACHE_ENABLED = athena.memory_cache_enabled === false ? false : true;

				// if a cache for iam calls should be enabled or not
				settings.IAM_CACHE_ENABLED = athena.iam_cache_enabled === false ? false : true;
				if (settings.AUTH_SCHEME !== 'iam') { settings.IAM_CACHE_ENABLED = false; }		// n/a if not iam

				// if a cache for session couch store should be enabled or not
				settings.SESSION_CACHE_ENABLED = athena.session_cache_enabled === false ? false : true;

				// if a cache for node status (via proxy route) or deployer status (via proxy route) should be enabled or not
				settings.PROXY_CACHE_ENABLED = athena.proxy_cache_enabled === false ? false : true;

				// init fabric_capabilities object
				if (!settings.FABRIC_CAPABILITIES) { settings.FABRIC_CAPABILITIES = {}; }
				if (!settings.FABRIC_CAPABILITIES.application) { settings.FABRIC_CAPABILITIES.application = []; }
				if (!settings.FABRIC_CAPABILITIES.channel) { settings.FABRIC_CAPABILITIES.channel = []; }
				if (!settings.FABRIC_CAPABILITIES.orderer) { settings.FABRIC_CAPABILITIES.orderer = []; }

				// the type of console build we are in
				settings.CONSOLE_TYPE = settings.getConsoleType(settings) || 'hlfoc';	// valid options, "hlfoc", "ibp", "support", or "software"
				// the source of an ibm console image build, not always set
				settings.CONSOLE_BUILD_TYPE = athena.console_build_type || '';			// valid options, "saas", "non-saas", empty string

				// set constants here
				settings.STR = {
					MSP: 'msp',
					MSP_EXTERNAL: 'msp-external',
					CA: 'fabric-ca',
					PEER: 'fabric-peer',
					ORDERER: 'fabric-orderer',
					'FABRIC-CA': 'fabric-ca',
					'FABRIC-PEER': 'fabric-peer',
					'FABRIC-ORDERER': 'fabric-orderer',
					'MSP-EXTERNAL': 'msp-external',
					BLOCK: 'config-block',
					ENROLL_ID: 'enroll_id',
					TEMPLATE_DEBUG: 'template_debug',
					TEMPLATE: 'template',
					SIG_COLLECTION: 'signature_collection',
					EXTERNAL_PARTIES_DOC: '00_external_parties',
					SIG_OPEN: 'open',
					SIG_CLOSED: 'closed',
					MANAGER_ROLE: 'manager',
					WRITER_ROLE: 'writer',
					READER_ROLE: 'reader',
					SOLO: 'solo',
					RAFT: 'etcdraft',									// deployer uses this value for orderertype
					ATHENA_RAFT: 'raft',								// athena uses this value for orderer_type
					CREATE_ACTION: 'blockchain.components.create',
					DELETE_ACTION: 'blockchain.components.delete',		// delete is for deployed
					REMOVE_ACTION: 'blockchain.components.remove',		// remove is for imported
					IMPORT_ACTION: 'blockchain.components.import',
					EXPORT_ACTION: 'blockchain.components.export',
					RESTART_ACTION: 'blockchain.optools.restart',
					LOGS_ACTION: 'blockchain.optools.logs',
					VIEW_ACTION: 'blockchain.optools.view',
					SETTINGS_ACTION: 'blockchain.optools.settings',
					USERS_ACTION: 'blockchain.users.manage',			// not valid on SaaS
					API_KEY_ACTION: 'blockchain.apikeys.manage',		// not valid on SaaS
					NOTIFICATIONS_ACTION: 'blockchain.notifications.manage',
					SIG_COLLECTION_ACTION: 'blockchain.signaturecollection.manage',
					C_MANAGE_ACTION: 'blockchain.components.manage',
					SUFFIX_DELIMITER: '_',								// 1 character delimiter between component id increments
					TX_ARCHIVE: 'archive',
					TX_INBOX: 'inbox',
					LEVEL_DB: 'leveldb',
					COUCH_DB: 'couchdb',
					SQL_DB: 'sqlite3',
					STATUS_ALL_GOOD: 'ok',
					STATUS_NOT_GREAT: 'not ok',
					ARCHIVED_VIEW: 'active_notifications_by_ts',
					ALL_NOTICES_VIEW: 'all_notifications_by_ts',
					LOCATION_IBP_SAAS: 'ibm_saas',						// indicates this node was created via our deployer from a IBP saas OpTools
					INFRA_IBP_SAAS: 'ibmcloud',							// indicates that deployed components will be hosted by IBM cloud using IKS
					INFRA_OPENSHIFT: 'openshift',						// indicates that deployed components will be hosted by redhat openshift
					INFRA_K8S: 'k8s',									// indicates that deployed components will be hosted by generic kubernetes
					PAID_K8S: 'paid',
					GET_ALL_COMPONENTS_KEY: 'GET /api/vx/instance/iid/type/all',
					GET_FAB_VERSIONS_KEY: 'GET /api/vx/instance/iid/type/all/versions',
					EVENT_COMP_DEL: 'component_delete',					// delete event is for k8s delete
					EVENT_COMP_RMV: 'component_remove',					// remove event is for local import removal
					EVENT_COMP_ADD: 'component_onboard',				// use onboard event for k8s create and local import creation
					EVENT_COMP_EDT: 'component_edit',					// local edit event
					SERVICE_NAME: 'blockchain',							// service name defined in IBM cloud catalog
					ALT_PRODUCT_NAME: 'console',
					TX_CCD: 'ccd',										// chaincode definition
					TX_CHANNEL: 'channel',								// channel policy update
					C_CC_LAUNCHER: 'chaincodelauncher',
					C_DIND: 'dind',
					C_PROXY: 'proxy',
					C_FLUENTD: 'fluentd',
					BEARER: 'bearer',
					KEY: 'api_key',
					BASIC: 'basic',
					SIG: 'signature',
					TLS_LOCK_NAME: 'tls_generation',
					TLS_CERT_ORG: 'ibp2-auto-gen',
					IBP_TOKEN: 'ibp',
					IAM_TOKEN: 'iam',
					FAB_UP_LOCK_NAME: 'auto_fabric_upgrade',
					PASS_IS_CUSTOM: 'custom',
					PASS_IS_DEFAULT: 'default',
					STATUS_IN_PROGRESS: 'in-progress',
					STATUS_DONE: 'done',
					STATUS_TIMEOUT: 'timeout',
					STATUS_FAILED: 'failed',
					WALLET_MIGRATION: 'wallet_migration',
					MIGRATION_KEY: 'migration_api_key',
				};

				// manager - must match what is defined in RMC (this section ONLY applies to stand alone)
				settings.ROLES_TO_ACTIONS = {};
				settings.ROLES_TO_ACTIONS[settings.STR.MANAGER_ROLE] = [
					settings.STR.CREATE_ACTION, settings.STR.DELETE_ACTION, settings.STR.REMOVE_ACTION, settings.STR.IMPORT_ACTION,
					settings.STR.EXPORT_ACTION, settings.STR.RESTART_ACTION, settings.STR.LOGS_ACTION, settings.STR.VIEW_ACTION,
					settings.STR.SETTINGS_ACTION, settings.STR.NOTIFICATIONS_ACTION, settings.STR.USERS_ACTION, settings.STR.API_KEY_ACTION,
					settings.STR.SIG_COLLECTION_ACTION, settings.STR.C_MANAGE_ACTION,
				];

				// writer - must match what is defined in RMC (this section ONLY applies to stand alone)
				settings.ROLES_TO_ACTIONS[settings.STR.WRITER_ROLE] = [
					settings.STR.REMOVE_ACTION, settings.STR.IMPORT_ACTION, settings.STR.EXPORT_ACTION, settings.STR.VIEW_ACTION,
					settings.STR.NOTIFICATIONS_ACTION, settings.STR.SIG_COLLECTION_ACTION, settings.STR.C_MANAGE_ACTION,
				];

				// reader - must match what is defined in RMC (this section ONLY applies to stand alone)
				settings.ROLES_TO_ACTIONS[settings.STR.READER_ROLE] = [
					settings.STR.EXPORT_ACTION, settings.STR.VIEW_ACTION,
				];

				// IBM ID settings - pulled from env variables if present [optional]
				settings.IBM_ID = {
					STRATEGY_NAME: 'ibmcloud',
					URL: process.env.IBM_ID_URL || (athena.ibmid ? athena.ibmid.url : null),
					CLIENT_ID: process.env.IBM_ID_CLIENT_ID || (athena.ibmid ? athena.ibmid.client_id : null),
					CLIENT_SECRET: process.env.IBM_ID_CLIENT_SECRET || (athena.ibmid ? athena.ibmid.client_secret : null)
				};

				// oidc auth scheme details [optional]
				settings.OIDC = {
					STRATEGY_NAME: 'ICPOIDCStrategy',
					AUTHORIZATION_URL: athena.oidc ? athena.oidc.authorization_url : null,
					TOKEN_URL: athena.oidc ? athena.oidc.token_url : null,
					CLIENT_ID: athena.oidc ? athena.oidc.client_id : null,
					CLIENT_SECRET: athena.oidc ? athena.oidc.client_secret : null,
					ISSUER_ID: athena.oidc ? athena.oidc.issuer_id : null,
				};
				settings.IAM_CONFIG_URL = settings.IBM_ID.URL || settings.OIDC.CONFIG_URL;	// rename for IAM context

				// ldap auth scheme details [optional]
				settings.LDAP = {
					STRATEGY_NAME: 'LDAPStrategy',
					URL: athena.ldap ? athena.ldap.url : null,
					BIND_DN: athena.ldap ? athena.ldap.bind_dn : null,
					BIND_CREDENTIAL: athena.ldap ? athena.ldap.bind_credential : null,
					SEARCH_BASE: athena.ldap ? athena.ldap.search_base : null,
					GROUP_SEARCH_BASE: athena.ldap ? athena.ldap.group_search_base : null,
					LDAP_GROUP_MAP: athena.ldap ? copy_role_keys(athena.ldap.ldap_group_map) : null,
					LDAP_ATTR_MAP: athena.ldap ? copy_role_keys(athena.ldap.ldap_attribute_map) : null,
				};

				// generic oauth auth scheme details [optional]
				settings.OAUTH = {
					STRATEGY_NAME: 'GenericStrategy',
					AUTHORIZATION_URL: athena.oauth ? athena.oauth.authorization_url : null,
					TOKEN_URL: athena.oauth ? athena.oauth.token_url : null,
					CLIENT_ID: athena.oauth ? athena.oauth.client_id : null,
					CLIENT_SECRET: athena.oauth ? athena.oauth.client_secret : null,
					RESPONSE_TYPE: (athena.oauth ? athena.oauth.response_type : null) || 'code',
					GRANT_TYPE: (athena.oauth ? athena.oauth.grant_type : null) || 'authorization_code',
					SCOPE: (athena.oauth ? athena.oauth.scope : null) || 'openid email profile',
					DEBUG: athena.oauth ? (athena.oauth.debug === true) : false,
				};

				if (typeof settings.DEFAULT_USER_PASSWORD === 'string') {
					settings.DEFAULT_USER_PASSWORD = settings.DEFAULT_USER_PASSWORD.trim();	// remove things like fat thumbed tabs and new lines
				}

				// client side (fabric request) timeout settings
				settings.FABRIC_GET_BLOCK_TIMEOUT_MS
					= !isNaN(athena.fabric_get_block_timeout_ms) ? Number(athena.fabric_get_block_timeout_ms) : 10 * 1000;
				settings.FABRIC_GET_CC_TIMEOUT_MS
					= !isNaN(athena.fabric_get_cc_timeout_ms) ? Number(athena.fabric_get_cc_timeout_ms) : 20 * 1000;
				settings.FABRIC_INSTANTIATE_TIMEOUT_MS
					= !isNaN(athena.fabric_instantiate_timeout_ms) ? Number(athena.fabric_instantiate_timeout_ms) : 5 * 60 * 1000;
				settings.FABRIC_JOIN_CHANNEL_TIMEOUT_MS
					= !isNaN(athena.fabric_join_channel_timeout_ms) ? Number(athena.fabric_join_channel_timeout_ms) : 30 * 1000;
				settings.FABRIC_INSTALL_CC_TIMEOUT_MS
					= !isNaN(athena.fabric_install_cc_timeout_ms) ? Number(athena.fabric_install_cc_timeout_ms) : 5 * 60 * 1000;
				settings.FABRIC_LC_INSTALL_CC_TIMEOUT_MS
					= !isNaN(athena.fabric_lc_install_cc_timeout_ms) ? Number(athena.fabric_lc_install_cc_timeout_ms) : 5 * 60 * 1000;
				settings.FABRIC_GENERAL_TIMEOUT_MS
					= !isNaN(athena.fabric_general_timeout_ms) ? Number(athena.fabric_general_timeout_ms) : 10 * 1000;
				settings.FABRIC_LC_GET_CC_TIMEOUT_MS
					= !isNaN(athena.fabric_lc_get_cc_timeout_ms) ? Number(athena.fabric_lc_get_cc_timeout_ms) : 2 * 60 * 1000;
				settings.FABRIC_CA_TIMEOUT_MS
					= !isNaN(athena.fabric_ca_timeout_ms) ? Number(athena.fabric_ca_timeout_ms) : 5 * 1000;

				//-----------------------------
				// Set Other Settings
				//-----------------------------
				settings.API_ERROR_RESPONSE = { error: 'there was an error with your request' };
				settings.API_SUCCESS_RESPONSE = { message: 'ok' };
				const parts = t.misc.break_up_url(settings.HOST_URL);				// URL to access app, including port and protocol. don't move field 2 db
				settings.DOMAIN = parts.hostname;									// set domain for cookie
				if (settings.HOST_URL.indexOf('localhost') >= 0) {
					settings.DOMAIN = null;											// according to spec don't set domain for local (important for IE)
				}

				// actual configtxlator url to use by apollo
				settings.CONFIGTXLATOR_URL = t.ot_misc.build_configtxlator_url(settings, settings.CONFIGTXLATOR_URL_ORIGINAL);
				settings.OPEN_API_DOCS = {};											// populated below

				//-----------------------------
				// JSON Validation Docs
				//-----------------------------
				if (results[1] && results[1].rows) {
					for (let i in results[1].rows) {										// loop over all validation docs
						const doc_id = results[1].rows[i].id; 								// rename
						const doc = results[1].rows[i].doc;

						// v1 validation
						if (doc_id === '01_validation_auth_scheme') {
							settings.VALIDATION_AUTH_SCHEME = doc;
						} else if (doc_id === '01_validation_components') {
							settings.VALIDATION_COMPONENTS = doc;
						}

						// v2 & v3 validation - store the highest versioned swagger doc for each major version we find
						else if (doc_id.indexOf('01_validation_ibp_openapi_') >= 0) {
							const db_doc_version = (doc && doc.info && doc.info.version) ? doc.info.version : '0.0.0';	// grab version in this doc
							const db_doc_major = 'v' + db_doc_version.substring(0, 1);					// this line only works up to v9, but thats fine

							let mem_doc_version = '0.0.0';												// default
							if (settings.OPEN_API_DOCS[db_doc_major] && settings.OPEN_API_DOCS[db_doc_major].info) {
								mem_doc_version = settings.OPEN_API_DOCS[db_doc_major].info.version;
							}

							// test if this doc is the highest minor version for this major version
							if (t.misc.is_version_b_greater_than_a(mem_doc_version, db_doc_version)) {	// doc from db has higher version, use it
								settings.OPEN_API_DOCS[db_doc_major] = doc;								// use this api doc for this major version
							}
						}
					}

					for (let ver in settings.OPEN_API_DOCS) {
						if (settings.OPEN_API_DOCS[ver] && settings.OPEN_API_DOCS[ver].info && settings.OPEN_API_DOCS[ver].info.version) {
							if (options && options.exitIfError) {
								logger.debug('[settings] using open api (swagger) file version:', settings.OPEN_API_DOCS[ver].info.version);
							}
						}
					}
				}

				settings.REGEX = athena.regex;

				//-----------------------------
				// Get IAM URLs - [optional]
				//-----------------------------
				if (settings.AUTH_SCHEME !== 'iam') {
					settings.IAM = {};												// placeholder
					finish();
				} else {
					settings.getIAMEndpoints((error, iam_config) => {
						settings.IAM = {
							STRATEGY_NAME: 'ibmcloud_iam',
							URL: iam_config ? t.misc.format_url(iam_config.issuer) : null,
							TOKEN_URL: iam_config ? iam_config.token_endpoint : null,
							AUTHORIZATION_URL: iam_config ? iam_config.authorization_endpoint : null,
							CLIENT_ID: process.env.IBM_ID_CLIENT_ID || (athena.ibmid ? athena.ibmid.client_id : null),
							CLIENT_SECRET: process.env.IBM_ID_CLIENT_SECRET || (athena.ibmid ? athena.ibmid.client_secret : null)
						};
						finish();
					});
				}
			}
		});



		//-----------------------------
		// Check the settings one more time
		//-----------------------------
		function finish() {
			check_final_envs(settings, function (err) {
				if (err != null) {
					settings = JSON.parse(original);							// flip it back
					if (options && options.exitIfError) {
						process.exit();											// shut down everything
					} else {
						if (cb) { return cb(err); }								// all done
					}
				} else {
					if (cb) { return cb(null, { message: 'ok' }); }				// all done
				}
			});
		}

		// if user is attempting a relative/abs path of athena (no http://bla.com) then return blank (which will use the host_url instead)
		function fmt_proxy_url(url) {
			if (!url || url === '/' || url === './') {
				return '';
			} else {
				return t.misc.format_url(url);				// else leave it alone
			}
		}

		// make admin list samples NOT case sensitive
		function lowercase_key_values(obj) {
			const temp = {};
			for (let key in obj) {
				if (typeof key === 'string') {
					temp[key.toLowerCase()] = obj[key];
				}
			}
			return temp;
		}

		// load each database name
		// this sets setting fields: DB_COMPONENTS, & DB_SESSIONS
		function load_database_names(settings_doc) {
			const dbs = settings_doc.db_defaults;
			const db_custom_names = settings_doc.db_custom_names;
			if (dbs) {
				for (let db_name in dbs) {
					if (db_name !== 'DB_SYSTEM') {				// the system db should be left driven by process.env.DB_SYSTEM
						if (dbs[db_name].name) {
							let name2use = dbs[db_name].name;
							if (db_custom_names && db_custom_names[db_name] && typeof db_custom_names[db_name] === 'string') {
								name2use = db_custom_names[db_name];
							}

							if (settings[db_name] !== name2use) {	// if its changed, log it
								logger.debug('[settings] custom db name:', db_name, '->', db_custom_names[db_name]);
							}

							settings[db_name] = name2use;
							db_names.push(name2use);
						}
					}
				}
			}
		}

		// only copy specific keys in object
		function copy_role_keys(obj) {
			if (!obj || typeof obj !== 'object') {
				return null;
			} else {
				return {
					MANAGER: obj.MANAGER,
					WRITER: obj.WRITER,
					READER: obj.READER,
				};
			}
		}
	};

	//------------------------------------------------------
	// Update settings periodically
	//------------------------------------------------------
	if (noInterval === true) {
		logger.debug('[settings] will not create a update interval for settings');
	} else {
		const synchronizer_ms = find_next_synchronized_update();	// get the time till the next synchronized interval
		settings.UPDATE_SCH.next = Date.now() + synchronizer_ms;

		setTimeout(function () {									// the first update from now needs to synchronize with the other app instances
			fire_update();											// so its update delay is NOT the typical interval delay

			setInterval(function () {								// make the normal interval now
				fire_update();
			}, update_ms);

		}, synchronizer_ms);										// the first update uses a different delay
	}

	function fire_update() {
		//logger.debug('[settings] firing periodic update of ev settings'); // removed - minimize logs
		try {
			if (!t.ot_misc.server_is_closed()) {					// don't run during graceful shutoff
				settings.update(null);
			}
			settings.UPDATE_SCH.next = Date.now() + update_ms;		// record when the next one is
		} catch (e) {
			logger.error(e);										// don't let a crash keep you from updating next time
		}
	}

	function find_next_synchronized_update() {
		const d = new Date();
		let synchronizer_min = Number(update_min) - (d.getMinutes() % update_min);	// get the time till the next synchronized interval
		return (synchronizer_min * 60 * 1000) - d.getMilliseconds();				// remove noisy milliseconds to land on exact minute
	}

	//------------------------------------------------------------
	// check if starting env have everything we need
	//------------------------------------------------------------
	function check_starting_envs(env) {
		const errors = [];
		if (env.DB_CONNECTION_STRING == null || env.DB_CONNECTION_STRING === '') {
			errors.push('env error: DB_CONNECTION_STRING cannot be blank. ' + env.DB_CONNECTION_STRING);
		}
		if (env.DB_SYSTEM == null || env.DB_SYSTEM === '') {
			errors.push('env error: DB_SYSTEM cannot be blank. ' + env.DB_SYSTEM);
		}
		if (process.env.DESIGN_DOC == null || process.env.DESIGN_DOC === '') {
			errors.push('env error: process.env.DESIGN_DOC cannot be blank. ' + process.env.DESIGN_DOC);
		}
		// --- Print Errors --- //
		if (errors.length > 0) {
			logger.error('---------------------------------------------------------');
			logger.error('[settings] error with starting env variables!');
			for (const i in errors) { logger.error(errors[i]); }
			logger.error('---------------------------------------------------------\n');
			process.exit();												//shut down everything
		}
	}

	//------------------------------------------------------------
	// check if final env has everything we need
	//------------------------------------------------------------
	function check_final_envs(env, cb) {
		check_starting_envs(env);

		const errors = [];
		let tmp = null;
		const fields = ['DB_COMPONENTS', 'DB_SESSIONS', 'DB_SYSTEM',
			'ENFORCE_BACKEND_SSL', 'ACCESS_LIST', 'APP_ID', 'SESSION_SECRET', 'MEMORY_CACHE_ENABLED',
			'CONFIGTXLATOR_URL_ORIGINAL', 'SYSTEM_CHANNEL_ID', 'API_ERROR_RESPONSE',
			'API_SUCCESS_RESPONSE', 'FEATURE_FLAGS', 'AUTH_SCHEME'];
		for (const i in fields) {
			tmp = fields[i];
			if (env[tmp] === null || env[tmp] === '' || typeof env[tmp] === 'undefined') {				// false is okay
				errors.push('setup error: ' + fields[i] + ' cannot be blank. ' + env[tmp]);
			}
		}

		if (env.APP_ID) {
			const fields2 = ['tenant_id', 'client_id', 'oauth_url', 'secret'];
			for (let i in fields2) {
				const tmp = fields2[i];
				if (env.APP_ID[tmp] === null || env.APP_ID[tmp] === '' || typeof env.APP_ID[tmp] === 'undefined') {		// false is okay
					errors.push('setup error: the setting APP_ID. ' + tmp + ' cannot be blank. ');
				}
			}
		}

		if (env.AUTH_SCHEME) {									// truthy check is above, check value here
			env.AUTH_SCHEME = env.AUTH_SCHEME.toLowerCase();
			const valid = ['initial', 'iam', 'couchdb', 'ldap', 'oidc', 'oauth'];
			if (valid.indexOf(env.AUTH_SCHEME) === -1) {
				errors.push('setup error: AUTH_SCHEME is not valid: ' + env.AUTH_SCHEME);
			}
		}

		if (env.AUTH_SCHEME === 'iam') {
			const fields2 = ['STRATEGY_NAME', 'URL', 'TOKEN_URL', 'AUTHORIZATION_URL', 'CLIENT_ID', 'CLIENT_SECRET'];
			for (let i in fields2) {
				const tmp = fields2[i];
				if (env.IAM[tmp] === null || env.IAM[tmp] === '' || typeof env.IAM[tmp] === 'undefined') {		// false is okay
					errors.push('setup error: the setting IAM. ' + tmp + ' cannot be blank. ');
				}
			}

			const crn_fields = ['version', 'c_name', 'c_type', 'service_name', 'location', 'account_id', 'instance_id'];
			for (let i in crn_fields) {
				const tmp = crn_fields[i];
				if (!env.CRN[tmp]) {
					errors.push('setup error: the setting CRN_STRING looks like garbage. missing CRN sub field: ' + tmp + '\n crn: ' + env.CRN_STRING);
				}
			}
		}

		// --- Print Errors --- //
		if (errors.length > 0) {
			logger.error('---------------------------------------------------------');
			logger.error('[settings] error with final env variables!');
			for (let i in errors) { logger.error(errors[i]); }
			logger.error('---------------------------------------------------------\n');
			return cb({ error: 'missing vars', details: errors });
		} else {
			//logger.info('[settings] final env variables look good!');
			return cb(null);
		}
	}

	// --------------------------------------------------------------------------------------------
	// detect the correct console image type - returns one of "hlfoc", "ibp", "support", or "software"
	// --------------------------------------------------------------------------------------------
	settings.getConsoleType = (settings_doc) => {
		let console_type = 'hlfoc';										// default console type is hyperledger fabric operations console (our open source one)
		const siid = (settings_doc && settings_doc.crn && settings_doc.crn.instance_id) ? settings_doc.crn.instance_id : '';
		const host_url = process.env.HOST_URL || settings_doc.host_url || '';

		if (settings_doc && settings_doc.auth_scheme === 'iam') {		// if we are using iam for auth, it's ibp (probably prod or staging)
			console_type = 'ibp';
		} else if (siid) {												// if we have a service instance id, its ibp (probably dev)
			console_type = 'ibp';
		} else if (settings_doc && settings_doc.console_build_type) {	// if we have a console build type, its probably one of the ibm products:
			if (host_url.includes('hlfsupport')) {						// its an ibm support console
				console_type = 'support';
			} else {
				console_type = 'software';								// else its an ibm software console
			}
		}
		return console_type;
	};

	// --------------------------------------------------------------------------------------------
	// Get IAM endpoints - [will return defaults if iam endpoint is misbehaving]
	// --------------------------------------------------------------------------------------------
	settings.getIAMEndpoints = (cb) => {
		const defaults = {												// production defaults
			'issuer': 'https://iam.cloud.ibm.com/identity',
			'authorization_endpoint': 'https://identity-3.us-south.iam.cloud.ibm.com/identity/authorize',
			'token_endpoint': 'https://identity-3.us-south.iam.cloud.ibm.com/identity/token',
			'passcode_endpoint': 'https://identity-3.us-south.iam.cloud.ibm.com/identity/passcode',
			'userinfo_endpoint': 'https://identity-3.us-south.iam.cloud.ibm.com/identity/userinfo',
		};
		getIAMEndpointsHttp((err, resp) => {
			if (err || !resp || !resp.authorization_endpoint) {
				logger.warn('[settings] IAM warning ▼ ▼ ▼');
				logger.warn('[settings] IAM warning ▼ ▼ ▼');			// this is *usually* not good, make it very visible
				logger.warn('[settings] warning iam configuration response looks bad, using defaults', err, resp);
				logger.warn('[settings] IAM warning ▲ ▲ ▲');
				logger.warn('[settings] IAM warning ▲ ▲ ▲');
				return cb(null, defaults);
			} else {
				logger.debug('[settings] successfully got iam configuration from server');
				return cb(null, resp);
			}
		});
	};

	// --------------------------------------------------------------------------------------------
	// Get IAM endpoints - [http only]
	// --------------------------------------------------------------------------------------------
	function getIAMEndpointsHttp(cb) {
		const options = {
			baseUrl: settings.IAM_CONFIG_URL,
			url: '/',
			method: 'GET',
			timeout: 15000,
			_name: 'iam setup',
			_max_attempts: 5,
			_calc_retry_delay: (options) => {
				return (1000 * options._attempt + (Math.random() * 2000)).toFixed(0);
			}
		};
		t.misc.retry_req(options, (err, resp) => {
			let ret = '';
			if (resp && resp.body) {
				ret = resp.body;
				try { ret = JSON.parse(resp.body); }
				catch (e) { }
			}
			return cb(err, ret);
		});
	}

	// rebuild crn data from either the object or the string. whatever we have
	settings.parse_crn_data = function (athena) {
		if (!athena.crn) { athena.crn = {}; }							// init, field should be set when athena is in SaaS

		if (!athena.crn_string || athena.crn_string === '-') {			// if we don't have the crn string, but we do have crn fields
			if (athena.crn.version && athena.crn.c_name && athena.crn.c_type && athena.crn.service_name &&
				athena.crn.location && athena.crn.account_id && athena.crn.instance_id) {
				athena.crn_string = 'crn:' + athena.crn.version +		// build the crn string
					':' + athena.crn.c_name +
					':' + athena.crn.c_type +
					':' + athena.crn.service_name +
					':' + athena.crn.location +
					':' + athena.crn.account_id +
					':' + athena.crn.instance_id +
					'::';
			}
		}

		if (athena.crn_string && (!athena.crn.account_id || !athena.crn.instance_id)) {	// if we do have the crn string, but we don't have crn fields
			const parts = athena.crn_string.split(':');					// then break up the str into its parts
			if (parts && parts.length >= 8) {							// we need 8 colons
				athena.crn.version = parts[1];							// build the crn fields
				athena.crn.c_name = parts[2];
				athena.crn.c_type = parts[3];
				athena.crn.service_name = parts[4];
				athena.crn.location = parts[5];
				athena.crn.account_id = parts[6];
				athena.crn.instance_id = parts[7];
				athena.crn.resource_type = parts[8];					// optional (not in use 03/20/2019)
				athena.crn.resource_id = parts[9];						// optional (not in use 03/20/2019)
			}
		}
	};

	return settings;
};
