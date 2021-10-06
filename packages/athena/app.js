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
//------------------------------------------------------------
// app.js - the main starting file for Athena
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
	os: require('os'),
	NodeCache: require('node-cache'),
	winston: require('winston'),
	selfsigned: require('selfsigned'),
};

const bodyParser = require('body-parser');
const http = require('http');
const https = require('https');
const passport = require('passport');
const session = require('express-session');
const cors = require('cors');
const compression = require('compression');
const RateLimit = require('express-rate-limit');
const OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
const LDAPStrategy = require('passport-ldapauth');
const OpenIDConnectStrategy = require('passport-idaas-openidconnect').IDaaSOIDCStrategy;
const WebSocket = require('ws');
const protobufjs = require('protobufjs');
const js_rsa = require('jsrsasign');
const elliptic = require('elliptic');
const httpProxy = require('http-proxy');
const app = tools.express();
const proxy = httpProxy.createProxy();
let httpServer = null;
let useHTTPS = false;
let tls_pem_debounce = null;
let config_debounce = null;
const EC = elliptic.ec;
const _ecdsaCurve = elliptic.curves['p256'];
let server_settings = {};
let sessionMiddleware = null;
let couch_interval = null;
const http_metrics_route = '/api/v[123]/http_metrics/:days?';
const healthcheck_route = '/api/v3/healthcheck';
const metric_opts = {
	ignore_routes: {
		get: [
			http_metrics_route,
			'/ak' + http_metrics_route,
			healthcheck_route,
			'/ak' + healthcheck_route,
		]
	},
	healthcheck_route: healthcheck_route
};
const maxSize = '25mb';
let load_cache_interval = null;

//---------------------
// Load Config Setup - loads from either local file system or env variables
//---------------------
process.env.SETTINGS_DOC_ID = '00_settings_athena';
process.env.APP_NAME = 'athena';
process.env.DESIGN_DOC = process.env.APP_NAME + '-v1';				// make sure design docs also have this version number in the id
let defaultEnvFile = 'dev.json';
if (!process.env.DB_CONNECTION_STRING) {							// if there is no db string... load up local.json
	console.log('\n\nWe have no DB_CONNECTION_STRING...');			// we don't have a logger yet, use console

	if (process.env.DEFAULT_ENV) {
		defaultEnvFile = process.env.DEFAULT_ENV;					// allow someone to override the default file name
	}

	console.log('Loading env variables from env folder', defaultEnvFile);
	const tmp = require(tools.path.join(__dirname, '/env/' + defaultEnvFile));
	for (const i in tmp) { process.env[i] = tmp[i]; }
} else {
	console.log('\n\nApp is starting');
	console.log('Detected DB_CONNECTION_STRING.  Getting settings from db...', process.env.DB_SYSTEM, '\n\n');
}

// get the configure file or bust - this code must be below the env setting code
if (!process.env.CONFIGURE_FILE) {
	console.warn('config file not provided, skipping');
} else {
	let file_name = process.env.CONFIGURE_FILE;
	if (process.env.CONFIGURE_FILE.indexOf('./') === 0) {
		file_name = tools.path.join(__dirname, file_name);			// make it an absolute file path if its a relative one
		process.env.CONFIGURE_FILE = file_name;
	}
	load_config(file_name);
}

// setup Logger
tools.log_lib = require('./libs/log_lib.js')(tools);
process.env.ATHENA_ID = tools.log_lib.simpleRandomStringLC(5);		// unique id to see which instance we were load balanced to
let logger = tools.log_lib.build_server_logger();					// this builds a winston logger
// (if a lib consumes this logger, rebuild the lib once we get the db settings. this will pass the right log level to the lib)

// setup base libs (only the libs we need to get settings from the db - the rest come later
tools.ot_misc = require('./libs/ot_misc.js')(logger, tools);
tools.couch_lib = require('./libs/couchdb.js')(logger, tools, process.env.DB_CONNECTION_STRING);
const ev = require('./libs/settings.js')(logger, tools, null);

//--------------------------------------------------------
// Setup ad start our app
//--------------------------------------------------------
app.use(bodyParser.text({ type: 'text/html', limit: maxSize }));
app.use(['/api/', '/ak/'], bodyParser.text({ type: 'text/plain', limit: maxSize }));
app.use(bodyParser.json({ limit: maxSize }));
app.use(bodyParser.urlencoded({ extended: true, limit: maxSize }));
app.use(bodyParser.raw({ type: 'application/grpc-web+proto', limit: maxSize }));
app.use(compression());
look_for_couchdb(() => {
	get_db_settings(() => {
		setup_routes_and_start();
	});
});

// load the config file (yaml or json) and store it
function load_config(file_name) {
	console.log('reading config file:', file_name);					// we don't have a logger yet, use console
	const temp = _load_config(file_name);
	if (temp) {
		tools.config_file = temp;
	} else {
		process.exit();
	}
}

// get the config file (yaml or json)
function _load_config(file_name) {
	if (file_name.indexOf('.json') >= 0) {
		try {
			return JSON.parse(tools.fs.readFileSync(file_name));
		} catch (e) {												// we don't have a logger yet, use console
			console.error('Error - Unable to load json configuration file', file_name);
			console.error(e);
		}
	} else {
		try {														// use yaml ib if its not json
			return tools.yaml.safeLoad(tools.fs.readFileSync(file_name, 'utf8'));
		} catch (e) {
			console.error('Error - Unable to load yaml configuration file', file_name);
			console.error(e);
		}
	}
	return null;
}

//--------------------------------------------------------
// Make sure CouchDB is running/reachable - gives CouchDB one minute to be found, otherwise terminates the process
//--------------------------------------------------------
function look_for_couchdb(cb) {
	let startTime = new Date().getTime();
	tools.couch_lib.checkIfCouchIsRunning((err) => {								// check for couchdb once before starting the interval
		if (err) {
			logger.debug('[couchdb loop] Pinging CouchDB. Will start server when we get a response from couchdb');
			couch_interval = setInterval(() => {
				if (new Date().getTime() - startTime > 1 * 60 * 1000) {
					clearInterval(couch_interval);
					logger.error('[couchdb loop] CouchDB was never found to be running');
					process.exit();
				}
				tools.couch_lib.checkIfCouchIsRunning((err) => {					// couchdb wasn't found on the primer check. checking on interval
					if (err) {
						logger.debug('[couchdb loop] Pinging CouchDB. Will start server when we get a response from couchdb');
					} else {
						clearInterval(couch_interval);
						logger.debug('[couchdb loop] CouchDB was found! Proceeding');
						create_databases(() => {
							return cb();
						});
					}
				});
			}, 3000);
		} else {
			logger.debug('[couchdb loop] CouchDB was found! Proceeding');
			create_databases(() => {
				return cb();
			});
		}
	});
}

// set headers to not cache this response
function no_cache_headers(res) {
	res.setHeader('Cache-Control', 'no-store');
	res.setHeader('Pragma', 'no-cache');
}

//---------------------
// Create Databases
//---------------------
function create_databases(cb) {
	tools.misc = require('./libs/misc.js')(logger, tools);			// need it here for couchdb.js
	const db = require('./scripts/create_databases.js')(logger, tools);
	db.createDatabasesAndDesignDocs((errs) => {
		if (errs) {
			if (Array.isArray(errs)) {
				for (const err of errs) {
					logger.error(`[db] problem creating databases - ${JSON.stringify(err)}`);
				}
			} else {
				logger.error(`[db] problem creating databases - ${JSON.stringify(errs)}`);
			}
		} else {
			logger.info('[db] successfully created databases');
		}
		return cb();
	});
}

//---------------------
// Get ENV settings
//---------------------
function get_db_settings(cb) {
	ev.update({ exitIfError: true, url: ev.DB_CONNECTION_STRING }, () => {
		return cb();
	});
}

//-------------------------------------------------
// Setup the routes and start the webserver
//-------------------------------------------------
function setup_routes_and_start() {
	logger = tools.log_lib.build_server_logger(ev);
	tools.client_logger = tools.log_lib.build_client_logger(ev);	// rebuild loggers using db settings

	// rebuild tools with the log level from settings db (this logger will have the client's log level instead of the default log level)
	tools.ot_misc = require('./libs/ot_misc.js')(logger, tools);
	tools.couch_lib = require('./libs/couchdb.js')(logger, tools, process.env.DB_CONNECTION_STRING);
	tools.http_metrics = require('./libs/http_metrics.js')(logger, tools, metric_opts);

	// http_metrics needs to be one of the first app.use() instances, as soon as possible after ev.update()
	app.use(tools.http_metrics.start);
	app.use(setHeaders);

	// --- Graceful Shutoff --- // - this route should be right after http_metrics
	app.use((req, res, next) => {
		if (req.path.includes('/requests/start')) {					// let this route go regardless of state, else we can't ever start it again...
			return next();
		} else if (tools.ot_misc.server_is_closed()) {				// server is performing a graceful shutoff, reject request
			logger.warn('[http] server is shutting off gracefully, rejecting new request');
			res.status(503).json({ message: 'not accepting requests at this time. process is in graceful shutoff. ' + process.env.ATHENA_ID });
		} else {
			return next();
		}
	});

	// browser cache constants
	const DAYS_CACHE_STAGING = 7;						// number of days to have the browser cache static content in a staging env
	const DAYS_CACHE_PROD = 30;							// number of days to have the browser cache static content in a production env
	const DAY_SECS = 60 * 60 * 24;						// number of seconds in a day
	const cache_max_age_secs = (ev.ENVIRONMENT === 'prod') ? (DAYS_CACHE_PROD * DAY_SECS) : (DAYS_CACHE_STAGING * DAY_SECS);
	const cache_max_age_str = (ev.ENVIRONMENT === 'prod') ? (DAYS_CACHE_PROD + 'd') : (DAYS_CACHE_STAGING + 'd');

	if (!ev.DISABLED_COMPACTION) {
		const comp_delay = Math.round(1000 * DAY_SECS - (1000 * 60 * 60 * Math.random()));
		logger.debug('[db] compaction will run in', tools.misc.friendly_ms(comp_delay));
		setTimeout(() => {
			ev.compact_all_dbs();												// compact dbs after running for 24ish hours (23-24hrs)
		}, comp_delay);
	}

	if (ev.TRUST_PROXY) {
		logger.debug('[startup] setting trust proxy to:', JSON.stringify(ev.TRUST_PROXY));
		app.set('trust proxy', ev.TRUST_PROXY);								// trust first local proxy
	}

	// function that serves our react app (this is apollo)
	function serve_index(req, res, next) {
		res.setHeader('Cache-Control', 'public, max-age=' + cache_max_age_secs);
		res.sendFile(tools.path.join(__dirname, '..', 'apollo', 'build', 'index.html'));
	}

	//---------------------
	// API Rate Limiters
	//---------------------
	const rate_limiter_reqs_low = make_rate_limiter('[Session Requests] exceeded the low volume rate limit', ev.MAX_REQ_PER_MIN);
	const rate_limiter_reqs_high = make_rate_limiter('[Session Requests] exceeded the high volume rate limit', ev.MAX_REQ_PER_MIN * 16);
	const rate_limiter_ak_reqs_low = make_rate_limiter('[AK Requests] exceeded the low volume rate limit', ev.MAX_REQ_PER_MIN_AK);
	const rate_limiter_ak_reqs_high = make_rate_limiter('[AK Requests] exceeded the high volume rate limit', ev.MAX_REQ_PER_MIN_AK * 4);

	// add rate limit middleware
	app.use((req, res, next) => {
		const route_exceptions = [				// some routes should be given the higher rate limit
			'^/api/v[123]/proxy', 				// proxy route used for getting node status, method is POST but give it the high rate-limit
			'^/grpcwp/',						// proxy route used to talk to peers, like get blocks/txs, method is POST but give it the high rate-limit
			'^/configtxlator/',					// not positive we need this route, but I think we are decoding txs using a POST
			'^/api/v[123]/components/status', 	// bulk status route, method is POST but give it the high rate limit
		];
		let is_high_volume_route = false;

		if (req.method === 'GET') {
			is_high_volume_route = true;
		} else {
			for (let i in route_exceptions) {
				if (RegExp(route_exceptions[i]).test(req.path)) {
					is_high_volume_route = true;
					break;
				}
			}
		}

		if (req.path.indexOf('/ak/') === 0) {						// /ak/api/v1 routes
			if (is_high_volume_route === true) {
				return rate_limiter_ak_reqs_high(req, res, next);
			} else {
				return rate_limiter_ak_reqs_low(req, res, next);
			}
		} else {													// all other routes
			if (is_high_volume_route === true) {
				return rate_limiter_reqs_high(req, res, next);
			} else {
				return rate_limiter_reqs_low(req, res, next);
			}
		}
	});

	app.options('/ak/', cors());									// enable pre-flight cors OPTIONS res
	app.use('/ak/', cors());										// cors * only on api routes

	// routes that do not need to be protected nor need user context go before setup_session()
	app.get(['/version.txt', '/releaseNotes.json'], (req, res) => {								// list files in public folder that should not be cached
		no_cache_headers(res);
		if (req.path && req.path.includes('.txt')) {
			res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
		} else if (req.path && req.path.includes('.json')) {
			res.setHeader('Content-Type', 'application/json; charset=UTF-8');
		}
		res.send(tools.fs.readFileSync(tools.path.join(__dirname + '/public/', req.path)));
	});

	app.use('/data/', tools.express.static(__dirname + '/../apollo/build/data', { maxAge: cache_max_age_str })); 		// apollo dir
	app.use('/static/', tools.express.static(__dirname + '/../apollo/build/static', { maxAge: cache_max_age_str })); 	// apollo dir
	app.use(tools.express.static(__dirname + '/../stitch/dist', { maxAge: cache_max_age_str })); 						// serve stitch's directory
	app.use(tools.express.static(__dirname + '/public', { maxAge: cache_max_age_str })); 							// setup athena's static directory
	app.get('/favicon.ico', (req, res) => {
		res.setHeader('Cache-Control', 'public, max-age=' + cache_max_age_secs);
		res.sendFile(tools.path.join(__dirname, '..', 'apollo', 'build', 'favicon.ico'));
	});
	app.head('/', function (req, res) {
		res.status(204).end();
	});

	setup_session();
	setup_debug_log();
	setup_passport();

	// parse ace_config on homepage route, its not served here though - this might be legacy...
	app.get('/', function (req, res, next) {
		const url_parts = tools.url.parse(req.url, true);
		if (url_parts.query && url_parts.query['ace_config']) {
			logger.debug('[startup] parsed ace_config params:', url_parts.query);
			try {
				req.session.ace_config = JSON.parse(url_parts.query['ace_config']);
			} catch (e) { }
		}
		next();
	});

	// ---------------
	// Add other libs to tools
	// ---------------
	tools.caches = require('./app_setup/cache.js')(logger, ev, tools);
	tools.ca_lib = require('./libs/ca_lib.js')(logger, ev, tools);
	tools.proxy_lib = require('./libs/proxy_lib.js')(logger, ev, tools);
	tools.component_lib = require('./libs/component_lib.js')(logger, ev, tools);
	tools.event_tracker = require('./libs/event_tracker.js')(logger, ev, tools);
	tools.middleware = require('./libs/middleware/middleware.js')(logger, ev, tools);
	tools.cryptoSuite = require('./libs/fabric_ca_services/create_crypto_suite.js')(logger, ev, tools).createCryptoSuite();
	tools.enroll_lib = require('./libs/fabric_ca_services/enroll_lib.js')(logger, ev, tools);
	tools.signing_lib = require('./libs/fabric_ca_services/signing_lib.js')(logger, ev, tools);
	tools.fabric_utils = require('./libs/fabric_ca_services/fabric_utils.js')(logger, ev, tools);
	tools.key_lib = require('./libs/fabric_ca_services/key_lib.js')(logger, ev, tools);
	tools.asn1 = js_rsa.asn1;
	tools.KEYUTIL = js_rsa.KEYUTIL;
	tools.ECDSA = js_rsa.ECDSA;
	tools.js_rsa = js_rsa;
	tools._ecdsa = new EC(_ecdsaCurve);
	tools.pillow = require('./libs/pillow_talk.js')(logger, ev, tools, { db_name: ev.DB_SYSTEM });
	tools.notifications = require('./libs/notifications_lib.js')(logger, ev, tools);
	tools.deployer = require('./libs/deployer_lib.js')(logger, ev, tools);
	tools.comp_fmt = require('./libs/comp_formatting_lib.js')(logger, ev, tools);
	tools.webhook = require('./libs/webhook_lib.js')(logger, ev, tools);
	tools.user_preferences = require('./libs/user_preferences_lib.js')(logger, ev, tools);
	tools.auth_scheme = require('./libs/auth_scheme_lib.js')(logger, ev, tools);
	tools.keys_lib = require('./libs/keys_lib.js')(logger, ev, tools);
	tools.logging_apis_lib = require('./libs/logging_apis_lib.js')(logger, ev, tools);
	tools.notification_apis_lib = require('./libs/notification_apis_lib.js')(logger, ev, tools);
	tools.other_apis_lib = require('./libs/other_apis_lib.js')(logger, ev, tools);
	tools.permissions_lib = require('./libs/permissions_lib.js')(logger, ev, tools);
	tools.signature_collection_lib = require('./libs/signature_collection_lib.js')(logger, ev, tools);
	tools.auth_lib = require('./libs/authentication_lib.js')(logger, ev, tools);
	tools.auth_header_lib = require('./libs/auth_header_lib.js')(logger, ev, tools);
	tools.validate = require('./libs/validation_lib.js')(logger, ev, tools, { files: ev.OPEN_API_DOCS });
	tools.patch_lib = require('./libs/patch_lib')(logger, ev, tools);
	tools.perf = require('./libs/performance_lib')(logger, ev, tools);
	tools.segment_lib = require('./libs/segment_lib.js')(logger, ev, tools);
	tools.activity_tracker = require('./libs/activity_tracker.js')(logger, ev, tools);
	tools.dbs = require('./libs/db_backup.js')(logger, ev, tools);
	tools.lock_lib = require('./libs/lochness.js')(logger, ev, tools);
	tools.lockout = require('./libs/lockout.js')(logger, ev, tools);

	update_settings_doc(() => {
		setup_pillow_talk();
	});

	// Used to update the passport when the URL changes
	tools.update_passport = () => {
		setup_passport();
	};

	// run any db patches
	// delay call on start to scatter calls from multiple athenas starting at once (though that won't matter, 409 conflicts are harmless here)
	setTimeout(() => {
		tools.patch_lib.apply();
	}, 1000 * Math.random() * 10);

	//---------------------------------------------------------------------------------------------
	// Most routes here (routes that need a session/user context)
	//---------------------------------------------------------------------------------------------
	app.get(['/', '/index.html'], (req, res, next) => {								// serve apollo's output file
		return serve_index(req, res, next);
	});
	app.get(['/package-lock.json', '/package.json', '/npm_ls_prod.txt'], tools.middleware.verify_settings_action_session, (req, res) => {
		const content_type = (req.path.includes('.json')) ? 'application/json; charset=utf-8' : 'text/plain; charset=UTF-8';
		no_cache_headers(res);
		res.setHeader('Content-Type', content_type);
		res.send(tools.fs.readFileSync(tools.path.join(__dirname, req.path)));		// used to debug versions, only logged in users
	});

	// json parsing error
	app.use((error, req, res, next) => {
		if (error && error.toString().includes('Unexpected token')) {				// body parser creates this error if given malformed json
			logger.error('[body-parser.js] invalid json', error.toString());
			return res.status(400).json({ statusCode: 400, msg: 'invalid json', details: error.toString() });
		} else {
			return next();
		}
	});

	// lockout
	app.use((req, res, next) => {
		return tools.lockout.reject_if_exceeded(req, res, next);
	});

	// valid routes
	ev.HEALTHCHECK_ROUTE = healthcheck_route;		// pass route to lib
	app.use('/', require('./routes/authentication.js')(logger, ev, tools, passport));
	app.use('/', require('./routes/auth_scheme_apis.js')(logger, ev, tools));
	app.use('/', require('./routes/ca_apis.js')(logger, ev, tools));
	app.use('/', require('./routes/user_preferences_apis.js')(logger, ev, tools));
	app.use('/', require('./routes/keys_apis.js')(logger, ev, tools));
	app.use('/', require('./routes/logging_apis.js')(logger, ev, tools));
	app.use('/', require('./routes/other_apis.js')(logger, ev, tools));
	app.use('/', require('./routes/component_apis.js')(logger, ev, tools));
	app.use('/', require('./routes/legacy/component_apis_v1.js')(logger, ev, tools));
	app.use('/', require('./routes/proxy_apis.js')(logger, ev, tools));
	app.use('/', require('./routes/deployer_apis.js')(logger, ev, tools));
	app.use('/', require('./routes/legacy/deployer_apis_v1.js')(logger, ev, tools));
	app.use('/', require('./routes/notification_apis.js')(logger, ev, tools));
	app.use('/', require('./routes/permission_apis.js')(logger, ev, tools));
	app.use('/', require('./routes/signature_collection_apis.js')(logger, ev, tools));
	app.use('/', require('./routes/webhook_apis.js')(logger, ev, tools));
	app.use('/', require('./routes/performance_apis.js')(logger, ev, tools));
	app.use('/', require('./routes/db_backups_apis.js')(logger, ev, tools));

	// setup http metrics and build metrics route
	tools.http_metrics.set_wildcard_routes(build_wildcard_routes(app));
	tools.http_metrics.enable_http_metrics(ev.HTTP_METRICS_ENABLED);
	ev.HTTP_METRICS_ROUTE = http_metrics_route.replace(/\/:[^/]+\?/, '');		// pass it into ev so we can grab it outside of app.js
	app.get(http_metrics_route, tools.middleware.verify_logs_action_session, (req, res, next) => {
		get_metrics_via_pillow_talk(req, res, next);
	});
	app.get('/ak' + http_metrics_route, tools.middleware.verify_logs_action_ak, (req, res, next) => {
		get_metrics_via_pillow_talk(req, res, next);
	});
	let clear_metrics_timer = null;
	function get_metrics_via_pillow_talk(req, res, next) {
		if (ev.HTTP_METRICS_ENABLED !== true) {
			return next();
		} else {
			logger.debug('[metrics] using pillow talk to ask for access logs');
			const msg = {
				message_type: 'req_http_metrics',
				message: 'asking for all athena processes to send their access logs',
				by: tools.misc.censorEmail(tools.middleware.getEmail(req)),
				uuid: tools.middleware.getUuid(req),
				tx_id: Date.now(),												// the tx_id  must always increase, else we may overwrite the wrong data
			};
			tools.pillow.broadcast(msg);

			clearTimeout(clear_metrics_timer);									// only need one of these active at a time, clear to prevent duplicates
			clear_metrics_timer = setTimeout(() => {							// delay long enough to aggregate data, its a setting, use your best guess
				res.status(200).json(tools.http_metrics.get_aggregated_metrics(req.params.days));	// send the data we have
				tools.http_metrics.clear_aggregated_metrics();					// clear data so we don't infinitely append
			}, ev.HTTP_METRICS_WAIT);
		}
	}

	// 404 on api routes
	app.use(['/ak/api', '/api'], function (req, res, next) {					// any other API request gets caught here...
		logger.debug('I can\'t do that dave - api route unknown');
		return res.status(404).json({ statusCode: 404, msg: 'route not found' });
	});

	// 404 on GET reqs - have apollo handle it
	app.get('*', function (req, res, next) {									// any other request gets caught here... apollo will deal with it
		const file_extensions = ['.js', '.html', '.css', '.map', '.png', '.svg', '.ico', '.jpg', '.jpeg', '.txt', '.json', '.scss', '.woff2'];
		for (let i in file_extensions) {
			if (req.path.indexOf(file_extensions[i]) >= 0) {					// if its a file request and we made it this far..
				return next();													// send these req to the 404 page
			}
		}
		return serve_index(req, res, next);
	});

	// 404 generic req - 404 GET reqs are handled above, all other methods handled here
	app.use(function (req, res, next) {
		logger.debug('I can\'t do that dave - route unknown');
		return res.status(404).send('404 Route Not Found :(');
	});

	// load protobuf files, needed for signature validation
	protobufjs.load('../stitch/dist/v2.0-protobuf-bundle.json', (pb_error, pb_root) => {
		if (pb_error) {
			logger.error('[startup] could not load pb files, error:', pb_error);
		} else {
			tools.protobufjs = pb_root;
		}
		setup_tls_and_start_app(1);
	});
	setTimeout(() => {
		try {
			logger.debug('[startup] version.txt file:\n' + tools.fs.readFileSync('./public/version.txt', 'utf8'));
		} catch (e) {
			logger.debug('[startup] unable to load version file, (this is fine) file error:', e);
		}
	}, 500);

	// on startup get the list of deployer components - this preheats the cache
	setTimeout(() => {
		load_component_cache();
	}, 1000 * Math.random() * 60 * 2);								// delay call on start, to scatter calls from multiple athenas starting at once

	clearInterval(load_cache_interval);
	load_cache_interval = setInterval(() => {
		load_component_cache();
		tools.patch_lib.auto_upgrade_orderers();
	}, (1000 * 60 * 60 * 24) + (1000 * Math.random() * 60 * 2));	// once per day + scatter calls from multi athenas
}

// preload or update the component cache
function load_component_cache() {
	if (tools.ot_misc.server_is_closed()) {							// skip performing db operations if the server is closed
		logger.debug('[components] closed. skipping the cache update.');
	} else {
		if (ev.IMPORT_ONLY) {
			logger.debug('[components] import only mode detected');
			logger.debug('[components] loading cache... (no dep)');
			const opts = { _skip_cache: true };
			tools.component_lib.get_all_components(opts, () => { });
		} else {
			logger.debug('[components] loading cache... (w/dep)');
			const opts = { _skip_cache: true, _include_deployment_attributes: true };
			tools.deployer.get_all_components(opts, () => { });
		}
	}
}

// Set headers on all routes
function setHeaders(req, res, next) {
	res.removeHeader('X-Powered-By');													// suggestion by ibm security
	res.setHeader('Access-Control-Expose-Headers', 'Location');
	res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');	// suggestion by ibm security
	res.setHeader('X-Content-Type-Options', 'nosniff');									// suggestion by ibm security
	res.setHeader('X-XSS-Protection', '1; mode=block');									// suggestion by ibm security
	res.setHeader('X-Frame-Options', 'deny');											// suggestion by ibm security
	res.setHeader('Server', ev.ATHENA_VERSION);											// needed for ONECLOUD UX302

	let setNoCache = false;
	if (req.url.indexOf('/api/') === 0 || req.url.indexOf('/ak/api/') === 0) {			// all api routes follow the pattern /api/* and /ak/api/*
		setNoCache = true;
	} else if (req && req.headers && req.headers['content-type']) {
		if (req.headers['content-type'].toLowerCase().indexOf('json') >= 0) {
			setNoCache = true;
		}
	}
	if (setNoCache) {																	// if asking for JSON, add no cache headers
		no_cache_headers(res);
		res.setHeader('Content-Security-Policy', 'default-src \'self\'; frame-ancestors \'none\'');	// suggestion by dsh
	} else {
		if (ev && Array.isArray(ev.CSP_HEADER_VALUES)) {
			res.setHeader('Content-Security-Policy', ev.CSP_HEADER_VALUES.join(';'));	// theres a bunch of things in here for the "Braze" tool
		}
	}

	next();
}

// update the settings doc with things we only know after starting
// this is to be used for catching ENV variables that differ from db settings doc.
// the config yaml vars are already good to go w/o this code
function update_settings_doc(cb) {
	tools.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, function (err, settings_doc) {
		if (err) {
			logger.error('[startup] an error occurred obtaining the "' + process.env.SETTINGS_DOC_ID + '"', err, settings_doc);
			return cb();
		} else {
			const field = [];
			if (settings_doc.host_url !== ev.HOST_URL) {
				field.push('host_url');
			} else if (settings_doc.region !== ev.REGION) {
				field.push('region');
			} else if (settings_doc.app_port !== ev.PORT) {
				field.push('port');
			} else if (settings_doc.auth_scheme !== ev.AUTH_SCHEME) {
				field.push('auth_scheme');
			} else if (settings_doc.support_key !== ev.SUPPORT_KEY) {
				field.push('support_key');
			} else if (settings_doc.support_password !== ev.SUPPORT_PASSWORD) {
				field.push('support_password');
			} else if (settings_doc.default_user_password !== ev.DEFAULT_USER_PASSWORD) {
				field.push('default_user_password');
			} else if (settings_doc.default_user_password_initial !== ev.DEFAULT_USER_PASSWORD_INITIAL) {
				field.push('default_user_password_initial');
			} else if (settings_doc.configtxlator_url_original !== ev.CONFIGTXLATOR_URL_ORIGINAL) {
				field.push('configtxlator_url_original');
			} else if (settings_doc.configtxlator_url !== ev.CONFIGTXLATOR_URL) {
				field.push('configtxlator_url');
			} else if (settings_doc.cookie_name !== ev.COOKIE_NAME) {
				field.push('cookie_name');
			}

			if (field.length === 0) {									// if no changes, skip update
				return cb();
			} else {
				logger.warn('[startup] updating settings doc with a new field from memory:', field);
				settings_doc.host_url = ev.HOST_URL;					// set the host_url
				settings_doc.region = ev.REGION;						// set the region
				settings_doc.app_port = ev.PORT;						// set the app_port
				settings_doc.auth_scheme = ev.AUTH_SCHEME;				// set the auth_scheme
				settings_doc.support_key = ev.SUPPORT_KEY;				// set the support_key
				settings_doc.support_password = ev.SUPPORT_PASSWORD;	// set the support_password
				settings_doc.default_user_password = ev.DEFAULT_USER_PASSWORD;
				settings_doc.default_user_password_initial = ev.DEFAULT_USER_PASSWORD_INITIAL;
				settings_doc.configtxlator_url_original = ev.CONFIGTXLATOR_URL_ORIGINAL;
				settings_doc.configtxlator_url = ev.CONFIGTXLATOR_URL;
				settings_doc.cookie_name = ev.COOKIE_NAME;

				tools.otcc.writeDoc({ db_name: ev.DB_SYSTEM }, settings_doc, (err) => {
					if (err) {
						logger.error('[startup] an error occurred updating the "' + process.env.SETTINGS_DOC_ID + '"', err, settings_doc);
					}
					return cb();
				});
			}
		}
	});
}

// listen for athena messages
function setup_pillow_talk() {
	tools.pillow.listen((_, doc) => {

		// --- Restart --- //
		if (doc.message_type === 'restart') {
			logger.debug('[pillow] - received a restart message');
			const notice = {
				status: 'success',
				message: 'restarting application via pillow talk',
				by: doc.by,
				severity: 'warning',
			};
			tools.notifications.create(notice, () => {				// send notification to clients
				tools.ot_misc.start_graceful_shutoff(() => {
					tools.ot_misc.restart_athena(doc.uuid);			// restart athena, user's uuid should be in restart doc
				});
			});
		}

		// --- Delete All Sessions (cache and couch) --- //
		if (doc.message_type === 'delete_sessions') {
			logger.debug('[pillow] - received a delete all sessions message');
			const notice = {
				status: 'success',
				message: 'deleting all sessions via pillow talk',
				by: doc.by,
				severity: 'warning',
			};
			tools.notifications.create(notice, () => {				// send notification to clients
				tools.session_store.clear((_, resp) => { });
			});
		}

		// --- Flush all caches --- //
		if (doc.message_type === 'flush_cache') {
			logger.debug('[pillow] - received a flush all caches message');
			const notice = {
				status: 'success',
				message: 'flushing all caches via pillow talk',
				by: doc.by,
				severity: 'warning',
			};
			tools.notifications.create(notice, () => {				// send notification to clients
				tools.caches.flush_all();
			});
		}

		// --- Evict cache keys --- //
		if (doc.message_type === 'evict_cache_keys') {
			logger.debug('[pillow] - received an evict cache message. event:', doc.event);
			if (doc.event === ev.STR.EVENT_COMP_DEL) {
				tools.caches.handle_comp_delete(doc.comp_doc);
			} else if (doc.event === ev.STR.EVENT_COMP_RMV) {
				tools.caches.handle_comp_remove(doc.comp_doc);
			} else if (doc.event === ev.STR.EVENT_COMP_ADD) {
				tools.caches.handle_comp_onboard();
			} else if (doc.event === ev.STR.EVENT_COMP_EDT) {
				tools.caches.handle_comp_edit(doc.comp_doc);
			}
		}

		// --- Settings Update --- //
		if (doc.message_type === 'settings_doc_update') {
			logger.debug('[pillow] - received a settings update message');
			ev.update(null);										// reload ev settings
		}

		// --- Requesting HTTP Metrics Docs --- //
		if (doc.message_type === 'req_http_metrics') {
			logger.debug('[pillow] - received an access log data request message.', doc.tx_id);

			const _id = '01_http_metrics_' + process.env.ATHENA_ID;
			tools.couch_lib.getDoc({ db_name: ev.DB_SYSTEM, _id: _id, SKIP_CACHE: true }, (err_get, m_doc) => {
				const metrics_doc = tools.http_metrics.get_raw_metrics();
				metrics_doc._id = _id;
				metrics_doc.message_type = 'rec_http_metrics';
				metrics_doc.tx_id = doc.tx_id;
				if (err_get) {
					delete metrics_doc._rev;						// if there is an error, do not copy rev, doc is likely deleted, old rev is n/a
				} else if (m_doc && m_doc._rev) {
					metrics_doc._rev = m_doc._rev;
				}

				tools.pillow.broadcast(metrics_doc, (errCode, wrote_doc) => {
					if (errCode) {
						logger.debug('[pillow] unable to write access logs to couch', errCode);
					} else {
						logger.debug('[pillow] successfully wrote access logs to couch');
					}
				});
			});
		}

		// --- Receiving HTTP Metrics Docs --- //
		if (doc.message_type === 'rec_http_metrics') {
			logger.debug('[pillow] - received access log data from process id:', (doc.process_id || '?'));
			tools.http_metrics.append_aggregated_metrics(doc);
		}
	});
}

//---------------------
// Create rate limiters
//---------------------
/*
	log_msg: "something"	// text to print in log and response
	max: 100,		 		// max requests per minute,
*/
function make_rate_limiter(log_msg, max_req) {
	return new RateLimit({
		windowMs: 1 * 60 * 1000, 						// xx minutes
		max: max_req, 									// limit each (IP + browser) to xxx requests per time windowMs
		onLimitReached: function (req, res, opts) {
			const ip = tools.misc.format_ip(req.ip, true);
			logger.warn(log_msg, '- initial limit breach. ip hash:', ip, 'at:', req.rateLimit.current);
		},
		keyGenerator: function (req) {
			const ip = tools.misc.format_ip(req.ip, false);
			return ip + req.headers['user-agent'];
		},
		handler: (req, res, opts) => {
			const ret = {
				error: log_msg + ' - too many requests, try again later',
				rate_limit: max_req + '/min',
			};
			if (req.url.indexOf('/ak/') === 0) {		// add some tips to ak apis responses
				ret.tips = [
					'monitor the header "X-RateLimit-Remaining" for your current rate',
					'check the header "X-RateLimit-Reset" for when to resume',
				];
			}
			logger.error(log_msg, '- limit: ' + req.rateLimit.limit + '/min, at:', req.rateLimit.current + '/min');
			res.status(429).send(ret);
		},
	});
}

//---------------------
// Debug Logs - fires on most routes
//---------------------
function setup_debug_log() {
	app.use(function (req, res, next) {
		req._tx_id = tools.ot_misc.buildTxId(req); 						// make an id that follows this requests journey, gets logged
		req._orig_headers = JSON.parse(JSON.stringify(req.headers));	// store original headers, b/c we might rewrite the authorization header
		req._notifications = [];										// create an array to store athena notifications generated by the request

		const skip = ['.js', '.map', '.svg', '.woff2', '.css'];
		let print_log = true;
		for (const i in skip) {
			if (req.url.indexOf(skip[i]) >= 0) {
				print_log = false;
				break;
			}
		}

		if (req.path.includes(healthcheck_route)) {						// avoid spamming logs with the healtcheck api
			print_log = false;
		}

		if (print_log) {
			const safe_url = req.path ? req.path : 'n/a';		// no longer need to encodeURI(path), automatically done
			logger.silly('--------------------------------- incoming request ---------------------------------');
			logger.info('[' + req._tx_id + '] New ' + req.method + ' request for url:', safe_url);
		}
		next();
	});
}

//---------------------
// Passport
//---------------------
function setup_passport() {
	if (ev.AUTH_SCHEME === 'appid') {
		logger.error('[startup] "appid" is no longer supported 08/29/2019');
	} else if (ev.AUTH_SCHEME === 'ibmid' && ev.IBM_ID.CLIENT_ID && ev.IBM_ID.CLIENT_SECRET) {
		logger.error('[startup] "ibmid" is no longer supported 05/26/2021');
	} else if (ev.AUTH_SCHEME === 'iam' && ev.IAM.CLIENT_ID && ev.IAM.CLIENT_SECRET && ev.IAM_API_KEY) {
		logger.info('[startup] setting up the ibm id (iam) auth scheme');
		passport.use(ev.IAM.STRATEGY_NAME, new OAuth2Strategy({
			authorizationURL: ev.IAM.AUTHORIZATION_URL,
			tokenURL: ev.IAM.TOKEN_URL,
			clientID: ev.IAM.CLIENT_ID,
			response_type: 'code',
			grant_type: 'authorization_code',
			clientSecret: ev.IAM.CLIENT_SECRET,
			callbackURL: ev.HOST_URL + ev.LOGIN_URI,
		}, function (accessToken, refreshToken, profile, done) {
			try {
				logger.debug('[iam] oauth dance complete, now getting iam actions');
				const parts = accessToken.split('.');
				const profile = JSON.parse(tools.misc.decodeb64(parts[1]));		// get the profile out of the token
				tools.iam_lib.getPermittedActionsHttp(profile, (err, resp) => {	// ask IAM for permitted actions
					if (err || !resp || !resp.permitted_actions) {
						profile.authorized_actions = [];						// place holder
					} else {
						profile.authorized_actions = resp.permitted_actions;	// set actions, middleware will look for it
					}
					return done(null, profile);									// send profile on to be stored in session
				});
			} catch (e) {
				logger.error('[iam] could not decode profile from iam access token', accessToken, e);
				return done(null, {
					authorized_actions: [],
					given_name: 'Unknown',
					family_name: 'User',
					name: 'Unknown User',
					email: 'whoops@ibm.com',
				});
			}
		}));
		passport.serializeUser(function (user, done) {
			return done(null, user);
		});
		passport.deserializeUser(function (obj, done) {
			return done(null, obj);
		});
	} else if (ev.AUTH_SCHEME === 'couchdb') {
		logger.info('[startup] setting up the couchdb auth scheme');
		// there really isn't anything to do...
	} else if (ev.AUTH_SCHEME === 'initial') {
		logger.warn('[startup] "initial" auth scheme provided. the app is open to all.');
		// there really isn't anything to do...
	} else if (ev.AUTH_SCHEME === 'oidc' && ev.IAM_API_KEY) {
		logger.info('[startup] setting up the OIDC (bedrock IAM) auth scheme');
		passport.use(ev.OIDC.STRATEGY_NAME, new OpenIDConnectStrategy({
			authorizationURL: ev.OIDC.AUTHORIZATION_URL,
			tokenURL: ev.OIDC.TOKEN_URL,
			clientID: ev.OIDC.CLIENT_ID,
			scope: 'openid',
			response_type: 'code',
			grant_type: 'authorization_code',
			clientSecret: ev.OIDC.CLIENT_SECRET,
			callbackURL: ev.HOST_URL + ev.LOGIN_URI,
			issuer: ev.OIDC.ISSUER_ID,
		}, function (accessToken, refreshToken, profile, done) {
			try {
				logger.debug('[oidc] oauth dance complete, now getting oidc actions');
				const parts = accessToken.split('.');
				const profile = JSON.parse(tools.misc.decodeb64(parts[1]));		// get the profile out of the token
				tools.iam_lib.getPermittedActionsHttp(profile, (err, resp) => {	// ask IAM for permitted actions
					if (err || !resp || !resp.permitted_actions) {
						profile.authorized_actions = [];						// place holder
					} else {
						profile.authorized_actions = resp.permitted_actions;	// set actions, middleware will look for it
					}
					return done(null, profile);									// send profile on to be stored in session
				});
			} catch (e) {
				logger.error('[oidc] could not decode profile from oidc access token', accessToken, e);
				return done(null, {
					authorized_actions: [],
					given_name: 'Unknown',
					family_name: 'User',
					name: 'Unknown User',
					email: 'whoops@ibm.com',
				});
			}
		}));
		passport.serializeUser(function (user, done) {
			return done(null, user);
		});
		passport.deserializeUser(function (obj, done) {
			return done(null, obj);
		});
	} else if (ev.AUTH_SCHEME === 'ldap' && ev.LDAP && ev.LDAP.URL) {
		logger.info('[startup] setting up the ldap auth scheme');
		passport.use(ev.LDAP.STRATEGY_NAME, new LDAPStrategy({
			server: {
				url: ev.LDAP.URL,
				bindDN: ev.LDAP.BIND_DN,								// the "admin" ldap user to use
				bindCredentials: ev.LDAP.BIND_CREDENTIAL,				// pass for admin ldap user
				searchBase: ev.LDAP.SEARCH_BASE,
				searchFilter: 'uid={{username}}',						// will search for users with username
				groupSearchBase: ev.LDAP.GROUP_SEARCH_BASE,
				groupSearchFilter: 'memberUid={{username}}',			// will search for groups with username
				reconnect: true,
			},
			usernameField: 'email',		// the field name apollo sends in the POST request during user login
			passwordField: 'pass',		// the field name apollo sends in the POST request during user login
		}, function (profile, done) {
			if (typeof profile === 'object') {
				const roles = tools.middleware.build_roles_from_ldap(profile);
				const username = profile.uid || profile.cn;
				const actions = tools.middleware.buildActionsFromRoles(roles, tools.misc.censorEmail(username));
				profile.authorized_actions = actions;
				profile.roles = roles;
				delete profile.userPassword;		// privacy concerns, do not store
				delete profile._groups;
			}
			return done(null, profile);
		}));

		passport.serializeUser(function (user, done) {
			return done(null, user);
		});
		passport.deserializeUser(function (obj, done) {
			return done(null, obj);
		});
	} else if (ev.AUTH_SCHEME === 'oauth' && ev.OAUTH) {
		logger.info('[startup] setting up the generic oauth 2 auth scheme');
		passport.use(ev.OAUTH.STRATEGY_NAME, new OAuth2Strategy({
			authorizationURL: ev.OAUTH.AUTHORIZATION_URL,
			tokenURL: ev.OAUTH.TOKEN_URL,
			clientID: ev.OAUTH.CLIENT_ID,
			response_type: ev.OAUTH.RESPONSE_TYPE, 			// usually 'code',
			grant_type: ev.OAUTH.GRANT_TYPE, 				// usually 'authorization_code',
			clientSecret: ev.OAUTH.CLIENT_SECRET,
			callbackURL: ev.HOST_URL + ev.LOGIN_URI,
		}, function (accessToken, refreshToken, profile, done) {
			try {
				logger.debug('[oauth] oauth dance complete');
				if (typeof profile !== 'object') {
					profile = {};
				}
				profile.authorized_actions = [				// add actions, middleware will look for it
					ev.STR.CREATE_ACTION,					// lets add all roles for generic oauth
					ev.STR.DELETE_ACTION,
					ev.STR.REMOVE_ACTION,
					ev.STR.IMPORT_ACTION,
					ev.STR.EXPORT_ACTION,
					ev.STR.RESTART_ACTION,
					ev.STR.LOGS_ACTION,
					ev.STR.VIEW_ACTION,
					ev.STR.SETTINGS_ACTION,
					ev.STR.USERS_ACTION,
					ev.STR.API_KEY_ACTION,
					ev.STR.NOTIFICATIONS_ACTION,
					ev.STR.SIG_COLLECTION_ACTION,
					ev.STR.C_MANAGE_ACTION,
				];
				return done(null, profile);						// send profile on to be stored in session
			} catch (e) {
				logger.error('[oauth] could not get profile from oauth server', e);
				return done(null, {
					authorized_actions: [],
					given_name: 'Unknown',
					family_name: 'User',
					name: 'Unknown User',
					email: 'whoops@ibm.com',
				});
			}
		}));
		passport.serializeUser(function (user, done) {
			done(null, user);
		});
		passport.deserializeUser(function (obj, done) {
			done(null, obj);
		});
	} else {
		logger.error('[startup] value for "auth_scheme" is not understood or there is incomplete data for the chosen scheme.', ev.AUTH_SCHEME);
	}
}

//---------------------
// Prepare the session/cookies
//---------------------
function setup_session() {
	let security = true;
	if (!tools.ot_misc.use_tls_webserver(ev)) {
		security = false;
	}

	const CouchdbStore = require('./libs/couchdb_session_store.js')(session, tools, logger);	// Session Store
	tools.session_store = new CouchdbStore({
		name: process.env.APP_NAME,
		DB_CONNECTION_STRING: ev.DB_CONNECTION_STRING,
		DB_SESSIONS: ev.DB_SESSIONS,
		expire_ms: 8 * 60 * 60 * 1000,				// sessions expire client side every xx hours
		destroy_expired_ms: 2 * 60 * 60 * 1000,		// destroy old session in db every xx hours
		throttle_ms: 5 * 60 * 1000,					// resave sessions after activity every xx minutes
		enable_session_cache: ev.SESSION_CACHE_ENABLED,
		session_docs_path_to_username: 'doc.sess.couchdb_profile.email',
		session_docs_path_to_uuid: 'doc.sess.couchdb_profile.uuid',
	});
	sessionMiddleware = session({
		secret: ev.SESSION_SECRET,
		store: tools.session_store,

		// the cookie's name/id - ibm cloud wants it named this way: "com.ibm.cloud.console.<YOUR_PLUGIN_ROOT>.<COOKIE_NAME>"
		name: ev.COOKIE_NAME, 		// typically its 'com.ibm.cloud.console.blockchain.optools'

		// if true "new but unmodified sessions" are saved to store [dsh: leave it false, helps avoid race cond]
		saveUninitialized: false,

		// if true session is saved to store after each request even if no changes
		resave: true,

		cookie: {
			// if true cookie only sent in connections that have tls
			// I'd like to have this true when region !== local
			secure: security,

			// if true it blocks client side access to cookie [dsh: leave it true, better security]
			httpOnly: true,

			// if this path is in the URL the browser will send the cookie header in its req, use caution
			path: '/',

			// if this doesn't match the url the cookie will not be set, use caution
			domain: ev.DOMAIN,

			// if "strict" the cookie cannot be sent from a browser with a different origin (including our ibm id sso)
			// if "lax" the cookie can be sent from a different origin as long as the top level nav changes (aka the url)
			sameSite: 'lax',

			// if max age is not set cookie will self-destruct when browser closes (desired)
			// maxAge: 1000 * 60 * 60 * 10
		}
	});
	app.use(sessionMiddleware);
	app.use(passport.initialize());
	app.use(passport.session());
}

//---------------------
// Setup our TLS cert (if needed)
//---------------------
function setup_tls_and_start_app(attempt) {
	logger.info('[tls] setting up tls for server (if needed), attempt:', attempt);
	if (attempt >= 5) {
		logger.error('[tls] too many attempts during tls setup, something is wrong. killing the process.');
		process.exit();
	}

	if (ev.ENFORCE_BACKEND_SSL === false) {											// allow self signed certs?
		logger.info('[tls] Not enforcing backend http requests to have valid TLS certs!');
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
	} else {
		logger.info('[tls] Enforcing backend http requests to have valid TLS certs');
	}

	// if external url has https... try loading our tls cert/key
	useHTTPS = tools.ot_misc.use_tls_webserver(ev);
	if (!useHTTPS) {
		start_app();
	} else {
		logger.debug('[tls] looking for tls private key pem in:', process.env.KEY_FILE_PATH);
		logger.debug('[tls] looking for tls cert in:', process.env.PEM_FILE_PATH);
		if (!process.env.KEY_FILE_PATH || !process.env.PEM_FILE_PATH) {
			logger.debug('[tls] ENV vars for tls cert/key paths are not set or empty. will not be able to use tls.');
			useHTTPS = false;
			start_app();
		} else {
			const hostname = tools.misc.get_host(ev.HOST_URL);
			const regen_opts = {
				common_name: hostname,
				alt_names_array: [hostname, tools.misc.get_host(ev.PROXY_TLS_WS_URL)],
				org_name: ev.STR.TLS_CERT_ORG,
				_lock_name: ev.STR.TLS_LOCK_NAME,		// only used on regen (not used in setup_self_signed_tls)
			};

			if (!tools.fs.existsSync(process.env.KEY_FILE_PATH) || !tools.fs.existsSync(process.env.PEM_FILE_PATH)) {	// generate them
				tools.lock_lib.apply({ lock: ev.STR.TLS_LOCK_NAME, max_locked_sec: 20 }, (lock_err) => {
					if (lock_err) {
						logger.debug('[tls] the tls cert and key were not found and this instance did not win the tls lock, waiting to start...');
						setTimeout(() => {
							return setup_tls_and_start_app(++attempt);				// try again in a bit
						}, 10 * 1000);
					} else {
						logger.warn('[tls] the tls cert and key were not found. will generate them now.');
						tools.ot_misc.setup_self_signed_tls(regen_opts);
						tools.lock_lib.release(ev.STR.TLS_LOCK_NAME);
						start_app();
					}
				});
			}

			// check cert, decide if we should auto-regen b/c its close to expiration
			else if (tools.ot_misc.auto_tls_cert_near_expiration(process.env.PEM_FILE_PATH, ev.STR.TLS_CERT_ORG)) {
				logger.warn('[tls] tls is expired or close to it, regenerating.');
				tools.ot_misc.regen_tls_cert(regen_opts, 1, () => {
					start_app();
				});
			}

			// check cert for invalid characters from bug 11/30/2020 (no asterisks)
			else if (tools.ot_misc.tls_cert_has_invalid_chars(process.env.PEM_FILE_PATH, ev.STR.TLS_CERT_ORG)) {
				tools.ot_misc.regen_tls_cert(regen_opts, 1, () => {
					start_app();
				});
			} else {
				start_app();
			}
		}
	}
}

//---------------------
// Start HTTP Server
//---------------------
function start_app() {
	logger.info('[startup] Athena Instance ID:', process.env.ATHENA_ID);
	logger.debug('[startup] server utc timestamp:', Date.now());

	if (useHTTPS) {
		try {
			server_settings = {
				key: tools.fs.readFileSync(process.env.KEY_FILE_PATH),											// attempt to load the tls cert files
				cert: tools.fs.readFileSync(process.env.PEM_FILE_PATH),
				minVersion: 'TLSv1.2',																			// disallow tls 1.0 and 1.1
				ciphers: ('TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:DHE-RSA-AES256-GCM-SHA384:' +
					'DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:' +
					'!EXPORT:!LOW:!SHA1:!SHA:!aNULL:!eNULL'),
				honorCipherOrder: true
			};

			logger.debug('[tls] https will be used. found tls key & cert.');
			tools.ot_misc.cert_expiration_warning(server_settings.cert);
		} catch (error) {
			logger.warn('[tls] unable to read TLS key or cert file. error:', error);
			logger.warn('[tls] unable to generate self signed tls cert. will use http instead.');
			useHTTPS = false;
		}
	}

	// catch errors on non-local zones //
	if (ev.ENVIRONMENT === 'prod') {
		logger.info('Going to catch errors rather than fall on face');
		process.env.NODE_ENV = 'production';
		process.on('uncaughtException', function (err) {
			logger.error('Caught exception: ' + err);
			logger.error(err.stack);
		});
	} else {
		logger.warn('[startup] will not catch errors');
	}

	// create the https server
	if (useHTTPS) {
		logger.debug('[startup] HTTP max header size:', tools.misc.friendly_bytes(https.maxHeaderSize));
		httpServer = https.createServer(server_settings, app).listen(ev.PORT, function () {
			logger.silly('-----------------------------------------------------------------------------------');
			logger.info('Starting HTTPS ' + process.env.APP_NAME.toUpperCase() + ' on Port ' + ev.PORT +
				', Env: ' + ev.ENVIRONMENT + ', DB: ' + ev.DB_SYSTEM);
			logger.silly('-----------------------------------------------------------------------------------');
		});
	} else {
		logger.debug('[startup] HTTP max header size:', tools.misc.friendly_bytes(http.maxHeaderSize));
		httpServer = http.createServer(app).listen(ev.PORT, function () {
			logger.silly('-----------------------------------------------------------------------------------');
			logger.info('Starting HTTP ' + process.env.APP_NAME.toUpperCase() + ' on Port ' + ev.PORT +
				', Env: ' + ev.ENVIRONMENT + ', DB: ' + ev.DB_SYSTEM);
			logger.silly('-----------------------------------------------------------------------------------');
		});
	}
	httpServer.timeout = ev.HTTP_TIMEOUT;
	logger.debug('[startup] using http timeout of', tools.misc.friendly_ms(httpServer.timeout));

	// --- Print logging info --- //
	const LOG_PATH = tools.log_lib.get_log_path();
	const LOG_FILE_NAME_SERVER = tools.log_lib.build_log_file_name(ev, tools.log_lib.get_log_base_name('server'), 'server');
	const LOG_FILE_NAME_CLIENT = tools.log_lib.build_log_file_name(ev, tools.log_lib.get_log_base_name('client'), 'client');
	if (tools.log_lib.is_file_logging_enabled(ev, 'server')) {
		logger.info('[startup] Storing server log files: "' + tools.path.join(LOG_PATH, LOG_FILE_NAME_SERVER) + '"',
			'level:', tools.log_lib.get_logging_level(ev, 'server'));
	} else {
		logger.info('[startup] Not storing server log files.');
	}
	if (tools.log_lib.is_file_logging_enabled(ev, 'client')) {
		logger.info('[startup] Storing client log files: "' + tools.path.join(LOG_PATH, LOG_FILE_NAME_CLIENT) + '"',
			'level:', tools.log_lib.get_logging_level(ev, 'client'));
		tools.client_logger.info('Storing client log files: "' + tools.path.join(LOG_PATH, LOG_FILE_NAME_CLIENT) + '"',
			'level:', tools.log_lib.get_logging_level(ev, 'client'));
	} else {
		logger.info('[startup] Not storing client log files');
	}
	httpServer.timeout = 5 * 60 * 1000;

	// --- Graceful Shutdown --- //
	httpServer.on('request', (req, res) => {				// inform clients this is their last request
		if (tools.ot_misc.server_is_closed() && !res.headersSent) {
			logger.warn('[req] server is shutting down gracefully');
			res.setHeader('Connection', 'close');
		}
	});

	start_ws_server();				// next run the webserver (httpServer must be defined first)
	config_watcher();
	setTimeout(() => { 				// not sure why, but cert file is getting written twice. once AFTER its generated during start up
		tls_file_watcher(); 		// delay this watch until things settle
	}, 1000 * 5);
	setInterval(() => {				// check on our tls cert periodically
		periodically_check_cert();
	}, 1000 * 60 * 60 * 24 * 10);	// check slowly to avoid spamming logs, but faster than WHEN_TO_REGENERATE
	tools.ot_misc.open_server();	// flip the env flag to open to requests
}

// change tls settings via restart
function change_tls() {
	logger.warn('[tls] changing tls key file:', process.env.KEY_FILE_PATH);
	logger.warn('[tls] changing tls cert file:', process.env.PEM_FILE_PATH);
	//httpServer._sharedCreds.context.setKey(tools.fs.readFileSync(process.env.KEY_FILE_PATH));		// this way doesn't seem to work...
	//httpServer._sharedCreds.context.setCert(tools.fs.readFileSync(process.env.PEM_FILE_PATH));
	const notice = {
		status: 'success',
		message: 'restarting application to update tls on webserver',
		by: 'system',
		severity: 'warning',
	};
	tools.notifications.create(notice, () => {						// send notification to clients
		tools.ot_misc.restart_athena('system_tls_change');			// restart athena to use the new tls files
	});
}

//-----------------------------------------------------
// Start Websocket Servers
//-----------------------------------------------------
function start_ws_server() {

	// --- Setup the Websocket Grpc Web Proxy Server  --- //
	// --- Setup the Athena Websocket Server --- //

	const ws_opts = JSON.parse(JSON.stringify(server_settings));
	ws_opts.noServer = true;												// noServer = decouple from the http server
	tools.wss1_athena = new WebSocket.Server(ws_opts);						// store it in tools so its available elsewhere, need broadcast()
	tools.wss2_fabric = new WebSocket.Server(ws_opts);						// store it in tools to keep wss1 from being lonely, not used yet
	const athena_log_tag = useHTTPS ? '[athena wss] ' : '[athena ws] ';
	const proxy_log_tag = useHTTPS ? '[grpcwpp wss] ' : '[grpcwpp ws] ';
	logger.info(athena_log_tag + 'Starting WebSocket server on port: ' + ev.PORT);
	logger.info(proxy_log_tag + 'Starting WebSocket server on port: ' + ev.PORT);

	httpServer.on('upgrade', function upgrade(req, socket, head) {
		const pathname = tools.url.parse(req.url).pathname;					// req.path dne, thus parse the url, (b/c no express - I think)

		sessionMiddleware(req, {}, (a, b) => {
			logger.silly('--------------------------------- incoming ws ---------------------------------');
			logger.info('[' + tools.ot_misc.buildTxId(req) + '] New ' + req.method + ' request for url:', pathname);

			req.actions = [ev.STR.VIEW_ACTION];
			if (tools.ot_misc.server_is_closed()) {							// in a graceful shutdown
				logger.warn('[ws] server is shutting down gracefully, rejecting upgrade request');
				socket.destroy();
			} else if (!tools.middleware.isAuthorized(req)) {				// not authorized
				logger.warn('[ws] invalid ws request, unauthorized');
				socket.destroy();
			} else {
				logger.debug('[ws] ws request, is authorized');
				route_ws();													// is authorized, route the ws on path
			}
		});

		function route_ws() {
			if (pathname === '/') {											// req that look like this are for athena <--> apollo reqs (apollo ws traffic)
				logger.debug(proxy_log_tag + 'received upgrade - athena request');
				tools.wss1_athena.handleUpgrade(req, socket, head, function done(ws) {
					tools.wss1_athena.emit('connection', ws, req);
				});
			} else if (pathname && pathname.indexOf('/grpcwp/') === 0) {	// req that start with this are to be proxied to an orderer (stitch ws traffic)
				logger.debug(proxy_log_tag + 'received upgrade - orderer request');
				const parsed = tools.ot_misc.parseProxyUrl(req.url, { default_proto: 'ws', prefix: '/grpcwp/' });
				logger.info(proxy_log_tag + '- attempting a grpc proxy proxy request', parsed.base2use, 'path', parsed.path2use);
				req.url = parsed.path2use;

				// remove the cookie header b/c if the headers are too large it will cause 400 error codes.
				// iam cookies are so large, yet randomly sized that this will become an intermittent issue.
				// this is hard to debug and multiple developers will lose an entire day over this.
				req.headers = tools.proxy_lib.copy_headers(req.headers);

				proxy.ws(req, socket, {
					target: parsed.base2use,
					changeOrigin: true,
					secure: false,											// the whole point of this code is to not verify self signed certs
					proxyTimeout: ev.WS_TIMEOUT,							// timeout (ms) for outgoing proxy requests
					timeout: ev.WS_TIMEOUT,									// timeout (ms) for incoming requests
				}, function (e) {
					logger.error(proxy_log_tag + 'error proxying request', parsed.base2use, e);
				});
			} else {														// not a route we are supporting, close socket
				logger.warn('[ws] invalid ws request, path:', pathname);
				socket.destroy();
			}
		}
	});

	tools.wss2_fabric.on('connection', function connection(ws) {			// fabric ws would appear here, but not used yet (the ws proxy took it)
		logger.info(athena_log_tag + 'connection accepted.', ws.readyState);
	});

	tools.wss1_athena.on('connection', (ws, req) => {						// athena ws messages appear here
		let ip = ws._socket.address();
		let ip_hash = null;
		if (ip && ip.address) {
			ip_hash = tools.misc.format_ip(ip.address, true);				// ip address has some gibberish on it sometimes
		}
		logger.info(athena_log_tag + 'connection accepted. ready:', ws.readyState, 'ip hash:', ip_hash);

		ws.on('message', (message) => {
			let msg = null;
			try {
				msg = JSON.parse(message);
			} catch (e) { }
			if (msg && msg.type === 'ping') {
				// ignore pings
			} else if (msg && msg.type) {
				logger.silly(athena_log_tag + 'received msg type:', msg.type);
			}
		});

		// log web socket errors
		ws.on('error', (e) => {
			logger.debug(athena_log_tag + 'error:', e, 'ip hash:', ip_hash);
		});

		// log web socket connection disconnects (typically client closed browser)
		ws.on('close', (code) => {
			logger.debug(athena_log_tag + 'closed. code:', code, 'ip hash:', ip_hash);
		});

		// test the connection
		//tools.wss1_athena.broadcast({ message: 'a new client has connected', details: 'hello ' + ip_hash });
		//ws.send(JSON.stringify({ message: 'private message', details: 'you are the only client seeing this message' }));
	});

	// send a message to every client (browsers)
	tools.wss1_athena.broadcast = function broadcast(data) {
		logger.debug(athena_log_tag + 'broadcasting to clients...', data.msg);
		tools.wss1_athena.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				try {
					if (typeof data !== 'string') {
						data = JSON.stringify(data);
					}
					client.send(data);
				} catch (e) {
					logger.debug(athena_log_tag + 'error broadcast', e);
				}
			}
		});
	};
}

// watch config file - can't use nodemon b/c can't hard code CONFIGURE_FILE name
function config_watcher() {
	if (!tools.fs.watch) {													// fs.watch is not always available
		logger.warn('[config] fs.watch() is not supported on this system. live reloading of the config file is not possible');
	} else if (ev.DYNAMIC_CONFIG === false) {								// only enable if the config file tells us to
		logger.debug('[config] the setting "dynamic_config" is false. will not reload server on config file changes');
	} else if (process.env.CONFIGURE_FILE) {
		logger.debug('[config] watching for file system changes on config file:', process.env.CONFIGURE_FILE);

		tools.fs.watch(process.env.CONFIGURE_FILE, (eventType, filename) => {
			if (eventType === 'change') {
				clearTimeout(config_debounce);
				config_debounce = setTimeout(() => {
					const is_diff = tools.misc.is_different(tools.config_file, _load_config(process.env.CONFIGURE_FILE));
					if (is_diff) {											// only reload if something changed
						logger.info('[config] detected local fs change on config file. reloading settings...');
						load_config(process.env.CONFIGURE_FILE);
						const db = require('./scripts/create_databases.js')(logger, tools);
						db.createDatabasesAndDesignDocs(() => { });
					}
				}, 50);		// need a very short debounce here, fs cb happens several times after file is saved
			}
		});
	}
}

// watch the cert file
function tls_file_watcher() {
	if (!useHTTPS) {
		// no need to watch if we are not using tls
	} else if (!tools.fs.watch) {													// fs.watch is not always available
		logger.warn('[tls] fs.watch() is not supported on this system. reloading of the tls cert is not possible');
	} else if (!httpServer || !httpServer._sharedCreds) {							// only try it if we have the "_sharedCreds" option
		logger.warn('[tls] httpServer._sharedCreds is not supported on this system. reloading of the tls cert is not possible');
	} else if (ev.DYNAMIC_TLS === false) {											// only enable if the config file tells us to
		logger.debug('[tls] the setting "dynamic_tls" is false. will not reload server on tls cert changes');
	} else {

		// load the tls pem file - WARNING - change the PEM file LAST to avoid loading mismatching key/pem files!
		tools.fs.watch(process.env.PEM_FILE_PATH, (eventType, filename) => {
			logger.warn('[tls] detected fs event on tls cert file:', filename, eventType);
			if (eventType === 'change') {
				clearTimeout(tls_pem_debounce);
				tls_pem_debounce = setTimeout(() => {
					change_tls();
				}, 1000);	// need long debounce, fs cb happens several times after file save, and we need cert AND key writes to settle before using
			}
		});
	}
}

// build express routes that need to have user input removed - returns object of arrays
function build_wildcard_routes(express_app) {
	const paths = tools.http_metrics.get_dynamic_routes(express_app, {						// manually add these apollo routes
		get: [
			'/ca/:id',
			'/channel/:id',
			'/channel/:id/block/:id',
			'/channels/:id',
			'/orderer/:id',
			'/orderer/:id/:id',
			'/organization/:id',
			'/peer/:id',
			'/peer/:id/channel/:id',
			'/peer/:id/channel/:id/block/:id',
			'/static/css/main.:id.chunk.css',
			'/static/js/main.:id.chunk.js',
			'/static/js/:id.chunk.js',
		],
		_all: [
			'/grpcwp/:id/protos.Endorser/ProcessProposal',									// manually add wildcard replacements on fabric proxy routes
			'/caproxy/:id/api/v1/reenroll',
			'/caproxy/:id/api/v1/identities',
			'/caproxy/:id/api/v1/affiliations'
		],
	});
	const allowed_metric_routes = { _all: ['/configtxlator/?*', '/deployer/api/v*/*'] };	// remove these routes from the wildcard list
	for (let method in allowed_metric_routes) {
		for (let i in allowed_metric_routes[method]) {
			const pos = paths[method].indexOf(allowed_metric_routes[method][i]);
			if (pos >= 0) {
				paths[method].splice(pos, 1);
			}
		}
	}
	return paths;
}

// check on the server's tls cert every now and then
function periodically_check_cert() {
	if (exports.auto_tls_cert_near_expiration(process.env.PEM_FILE_PATH, ev.STR.TLS_CERT_ORG)) {	// check cert, decide if we should auto-regen
		logger.warn('[tls] tls is expired or close to it, regenerating');
		const hostname = tools.misc.get_host(ev.HOST_URL);
		const regen_opts = {
			common_name: hostname,
			alt_names_array: [hostname, tools.misc.get_host(ev.PROXY_TLS_WS_URL)],
			org_name: ev.STR.TLS_CERT_ORG,
			_lock_name: ev.STR.TLS_LOCK_NAME,
		};
		exports.regen_tls_cert(regen_opts, 1, () => { });
	}
}
