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
//------------------------------------------------------------
// common-test-framework.js - test runner for all exported functions
//------------------------------------------------------------
const tools = {										// stateless util libs should go here, ~8% faster startup
	express: require('express'),
	url: require('url'),
	fs: require('fs'),
	path: require('path'),
	async: require('async'),
	request: require('request'),
	crypto: require('crypto'),
	uuidv4: require('uuid/v4'),
	yaml: require('js-yaml'),
	js_rsa: require('jsrsasign'),
	passport: require('passport'),
	os: require('os'),
	NodeCache: require('node-cache'),
	winston: require('winston'),
};
tools.log_lib = require('../../libs/log_lib.js')(tools);

// create logger objects but keep the test logs free of clutter
let logger = {
	info: () => { },
	log: () => { },
	debug: () => { },
	silly: () => { },
	warn: () => { },
	error: () => { },
	TypeError: () => { }
};

// uncomment to find the bug
//logger = tools.log_lib.build_server_logger();

// required npm modules
const path = tools.path;
const async = tools.async;
const bodyParser = require('body-parser');
const NodeCache = require('node-cache');
const protobufjs = require('protobufjs');
const DB_CONNECTION_STRING = process.env.DB_CONNECTION_STRING || require('../../env/dev.json').DB_CONNECTION_STRING;
const DESIGN_DOC = process.env.DESIGN_DOC = 'athena-v1';				// make sure design docs also have this version number in the id
const DB_SYSTEM = process.env.DB_SYSTEM;
const default_settings = require('../../json_docs/default_settings_doc.json');

const ev = {
	DB_COMPONENTS: 'athena_components',
	DB_SYSTEM: DB_SYSTEM,
	DB_CONNECTION_STRING: DB_CONNECTION_STRING,
	DESIGN_DOC: DESIGN_DOC,
	AUTH_SCHEME: 'appid',
	HOST_URL: 'http://localhost:3000',
	URL_SAFE_LIST: ['.*'],
	SESSION_CACHE_ENABLED: true,
	CONFIGTXLATOR_URL_ORIGINAL: 'http://localhost:3000',
	STR: {
		MSP: 'msp',
		MSP_EXTERNAL: 'msp-external',
		CA: 'fabric-ca',
		PEER: 'fabric-peer',
		ORDERER: 'fabric-orderer',
		'FABRIC-CA': 'fabric-ca',
		'FABRIC-PEER': 'fabric-peer',
		'FABRIC-ORDERER': 'fabric-orderer',
		'MSP-EXTERNAL': 'msp-external',
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
		DELETE_ACTION: 'blockchain.components.delete',		// delete is for saas/created
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
		INFRA_IBP_SAAS: 'ibmcloud',							// indicates that this siid is being hosted by the IBP saas service
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
		TX_CHANNEL: 'channel',
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
	},
	CRN: {
		version: 'v1',
		c_name: 'bluemix',
		c_type: 'public',
		service_name: 'blockchain',
		location: 'us-south',
		account_id: null,
		instance_id: null,
		resource_type: null,
		resource_id: null,
	},
	ACCESS_LIST: {
		'someone_else@us.ibm.com': { 'roles': ['manager'], }
	},
	MIN_SHORT_NAME_LENGTH: 8,
	MAX_SHORT_NAME_LENGTH: 32,
	THE_DEFAULT_RESOURCES_MAP: {
		'ca': {
			'cpu': '100m',
			'memory': '200Mi',
			'storage': '20Gi'
		},
		'couchdb': {
			'cpu': '200m',
			'memory': '400Mi',
			'storage': '100Gi'
		},
		'dind': {
			'cpu': '500m',
			'memory': '1000Mi'
		},
		'fluentd': {
			'cpu': '100m',
			'memory': '200Mi'
		},
		'leveldb': {
			'cpu': '100m',
			'memory': '200Mi',
			'storage': '100Gi'
		},
		'orderer': {
			'cpu': '250m',
			'memory': '500Mi',
			'storage': '100Gi'
		},
		'peer': {
			'cpu': '200m',
			'memory': '400Mi',
			'storage': '100Gi'
		},
		'proxy': {
			'cpu': '100m',
			'memory': '200Mi'
		}
	},
	MIN_IDLE: 1 * 60 * 1000,
	MAX_IDLE: (Math.pow(2, 31) - 1),
	MIN_PASSWORD_LEN: 10,
	MAX_PASSWORD_LEN: 128,
	MIN_PASSPHRASE_LEN: 20,
	MIN_USERNAME_LEN: 6,
	MAX_USERNAME_LEN: 64,
	REGEX: default_settings.regex,
	GRPCWPP_TIMEOUT: 300000,
	ACTIVITY_TRACKER_FILENAME: './logs',
	LOCKOUT_LIMIT: 4,
	HTTP_METRICS_ROUTE: '/api/v[123]/http_metrics',
	HEALTHCHECK_ROUTE: '/api/v3/healthcheck',
	LDAP: {},
	MAX_COMPONENTS: 250,
	IMPORT_ONLY: false
};

ev.ROLES_TO_ACTIONS = {};
ev.ROLES_TO_ACTIONS[ev.STR.MANAGER_ROLE] = [
	ev.STR.CREATE_ACTION, ev.STR.DELETE_ACTION, ev.STR.REMOVE_ACTION,
	ev.STR.IMPORT_ACTION, ev.STR.EXPORT_ACTION, ev.STR.RESTART_ACTION, ev.STR.LOGS_ACTION,
	ev.STR.VIEW_ACTION, ev.STR.USERS_ACTION, ev.STR.API_KEY_ACTION,
	ev.STR.API_KEY_ACTION, ev.STR.NOTIFICATIONS_ACTION,
];

// writer - must match what is defined in RMC (this section ONLY applies to stand alone)
ev.ROLES_TO_ACTIONS[ev.STR.WRITER_ROLE] = [
	ev.STR.REMOVE_ACTION, ev.STR.IMPORT_ACTION, ev.STR.EXPORT_ACTION,
	ev.STR.VIEW_ACTION, ev.STR.NOTIFICATIONS_ACTION,
];

// reader - must match what is defined in RMC (this section ONLY applies to stand alone)
ev.ROLES_TO_ACTIONS[ev.STR.READER_ROLE] = [
	ev.STR.EXPORT_ACTION, ev.STR.VIEW_ACTION,
];

ev.PROXY_TLS_HTTP_URL = ev.HOST_URL;
ev.PROXY_TLS_WS_URL = ev.HOST_URL;
ev.PROXY_TLS_FABRIC_REQS = true;

// middleware containing testing functions
const test_middleware = require('../testing-lib/test-middleware');

// middleware to create an admin
const userType = test_middleware.makeAdmin;

// ---------------
// Cache Setups
// ---------------
const opts = {
	stdTTL: 15,				// the default expiration in seconds
	checkperiod: 15,		// the period in seconds for the delete check interval
	deleteOnExpire: true	// if true variables will be deleted automatically when they expire
};
const cl_cache = new NodeCache(opts);


// Add IAM lib
const iam_opts = {
	stdTTL: 60,				// the default expiration in seconds
	checkperiod: 30,		// the period in seconds for the delete check interval
	deleteOnExpire: true	// if true variables will be deleted automatically when they expire
};
const iam_cache = new NodeCache(iam_opts);

const proxy_cache_opts = {
	stdTTL: 120,			// the default expiration in seconds
	checkperiod: 240,		// the period in seconds for the delete check interval
	deleteOnExpire: true	// if true variables will be deleted automatically when they expire
};
tools.proxy_cache = new tools.NodeCache(proxy_cache_opts);
tools.proxy_cache.get_stats = () => {
	if (ev.PROXY_CACHE_ENABLED !== true) {
		return null;
	} else {
		return tools.proxy_cache.getStats();
	}
};

let config_file_location = './env/example_config.yaml';
if (!tools.fs.existsSync(config_file_location)) {
	config_file_location = '../../env/example_config.yaml';
}

// ---------------
// Add other libs to tools
// ---------------
tools.wss1_athena = {
	broadcast: function () { }
};
tools.iam_lib = require('../../libs/iam_lib.js')(logger, ev, tools, iam_cache);
tools.asn1 = tools.js_rsa.asn1;
tools.KEYUTIL = tools.js_rsa.KEYUTIL;
tools.ECDSA = tools.js_rsa.ECDSA;
const elliptic = require('elliptic');
const EC = elliptic.ec;
const _ecdsaCurve = elliptic.curves['p256'];
tools._ecdsa = new EC(_ecdsaCurve);
tools.session_store = { clear: function () { } };
tools.misc = require('../../libs/misc.js')(logger, tools);
tools.ot_misc = require('../../libs/ot_misc.js')(logger, tools);
tools.couch_lib = require('../../libs/couchdb.js')(logger, tools, ev.DB_CONNECTION_STRING);
tools.proxy_lib = require('../../libs/proxy_lib.js')(logger, ev, tools);
tools.component_lib = require('../../libs/component_lib.js')(logger, ev, tools);
tools.event_tracker = require('../../libs/event_tracker.js')(logger, ev, tools);
tools.event_tracker.trackViaIntercept = (req, res, next) => { return next(); };		// force stub
tools.middleware = require('../../libs/middleware/middleware.js')(logger, ev, tools);
tools.notifications = require('../../libs/notifications_lib.js')(logger, ev, tools);
tools.ca_lib = require('../../libs/ca_lib.js')(logger, ev, tools);
tools.proxy_lib = require('../../libs/proxy_lib.js')(logger, ev, tools);
tools.config_file = tools.yaml.safeLoad(tools.fs.readFileSync(config_file_location, 'utf8'));
tools.notifications.create = () => { return true; };
tools.user_preferences = require('../../libs/user_preferences_lib.js')(logger, ev, tools);
tools.auth_scheme = require('../../libs/auth_scheme_lib.js')(logger, ev, tools);
tools.keys_lib = require('../../libs/keys_lib.js')(logger, ev, tools);
tools.pillow = require('../../libs/pillow_talk.js')(logger, ev, tools, { db_name: ev.DB_COMPONENTS });
tools.logging_apis_lib = require('../../libs/logging_apis_lib.js')(logger, ev, tools);
tools.log_lib = require('../../libs/log_lib.js')(tools);
tools.notification_apis_lib = require('../../libs/notification_apis_lib.js')(logger, ev, tools);
tools.other_apis_lib = require('../../libs/other_apis_lib.js')(logger, ev, tools);
tools.permissions_lib = require('../../libs/permissions_lib.js')(logger, ev, tools);
tools.signature_collection_lib = require('../../libs/signature_collection_lib.js')(logger, ev, tools);
tools.auth_lib = require('../../libs/authentication_lib.js')(logger, ev, tools);
tools.webhook = require('../../libs/webhook_lib.js')(logger, ev, tools);
tools.deployer = require('../../libs/deployer_lib.js')(logger, ev, tools);
tools.comp_fmt = require('../../libs/comp_formatting_lib.js')(logger, ev, tools);
tools.caches = require('../../app_setup/cache.js')(logger, ev, tools);
tools.auth_header_lib = require('../../libs/auth_header_lib.js')(logger, ev, tools);
tools.validate = require('../../libs/validation_lib.js')(logger, ev, tools, {
	file_names: {
		v2: './json_docs/json_validation/ibp_openapi_v2.yaml',
		v3: './json_docs/json_validation/ibp_openapi_v3.yaml'
	}
});
tools.patch_lib = require('../../libs/patch_lib')(logger, ev, tools);
tools.perf = require('../../libs/performance_lib')(logger, ev, tools);
tools.segment_lib = require('../../libs/segment_lib.js')(logger, ev, tools);
tools.activity_tracker = require('../../libs/activity_tracker.js')(logger, ev, tools);
tools.dbs = require('../../libs/db_backup.js')(logger, ev, tools);

exports.tools = tools;
exports.logger = logger;
exports.tools = tools;
exports.ev = ev;
exports.cl_cache = cl_cache;
exports.userType = userType;

exports.expressApp = (component, aux) => {
	const app = tools.express();
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(bodyParser.text());
	app.use(bodyParser.json());
	app.use(userType);
	app.use(component);
	if (aux) { app.use(aux); }
	app.use((err, req, res) => {
		return res.status(404).json({ error: 'your test did not find a route' });
	});

	// load protobuf files, needed for signature validation   /Users/lcsharp/athena/stitch/dist/protobuf-bundle.json
	const path_to_protobuf = tools.path.join(__dirname, '..', '..', '..', '/stitch/dist/v2.0-protobuf-bundle.json');
	protobufjs.load(path_to_protobuf, (pb_error, pb_root) => {
		if (pb_error) {
			logger.error('could not load pb files, error:', pb_error);
			process.exit(1);
		} else {
			tools.protobufjs = pb_root;
		}
	});

	app.set('view engine', 'pug');
	app.set('views', path.join(__dirname, '..', '..', '/views'));
	return app;
};

exports.mainTestFunction = (testCollection, path_to_current_file) => {
	let current_file;
	if (path_to_current_file) {
		current_file = tools.fs.readFileSync(path_to_current_file, 'utf8');
	}
	let fileWasChanged = false;

	// process the entire collection of tests passed in
	async.each(testCollection, (test, callback_full_collection) => {
		describe(test.suiteDescribe, () => {
			// process each suite in the collection
			async.each(test.testData, (data, callback_full_suite) => {
				describe(test.mainDescribe + (data.name || ''), () => {
					before(() => {
					});
					after(() => {
					});

					// if this is not a route test suite then there will be no array of routes.
					// in that case we need exactly one member in the array to run the test suite.
					if (!test.arrayOfRoutes && !test.executeRequest) {
						test.arrayOfRoutes = ['not a route'];
					}

					// loop through all routes in the arrayOfRoutes - useful if multiple routes hit the same API
					async.each(test.arrayOfRoutes, (route, callback_array_of_routes) => {

						// loop through every test in the current suite
						async.each(data.arrayOfInfoToTest, (routeInfo, callback_inner_array) => {
							if (route) {
								routeInfo.route = route;
							}
							// if there is no test_id= field generate one for the test - gives unique ids to every test
							if (routeInfo.itStatement.indexOf('test_id=') < 0 && current_file) {
								current_file = current_file.replace(
									new RegExp('(?!.*test_id=)' + routeInfo.itStatement),
									`${routeInfo.itStatement} test_id=${(tools.misc.simpleRandomString(6)).toLowerCase()}`
								);
								fileWasChanged = true;
							}
							it(routeInfo.itStatement, (done) => {
								if (routeInfo.callFunction) {
									routeInfo.callFunction(routeInfo);
								}
								if (test.executeRequest) {
									test.executeRequest(routeInfo, done);
								} else if (routeInfo.expectBlock) {
									routeInfo.expectBlock(done, routeInfo);
								}
								callback_inner_array();
							});
						}, () => {
							callback_array_of_routes();
						});
					}, () => {
						callback_full_suite();
					});
				});
			}, () => {
				callback_full_collection();
			});
		});
	}, () => {
		if (fileWasChanged && current_file) {
			tools.fs.writeFile(path_to_current_file, current_file, (err) => {
				if (err) {
					return console.log(err);
				}
			});
		}
	});
};
