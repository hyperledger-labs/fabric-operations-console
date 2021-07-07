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
*///------------------------------------------------------------
// start_athena_mass.js
//
// Find all SaaS instances and send the /start API
//
// Expects a service credential file as 1st argument to script (service cred must be json in the ./env folder)
// > node start_athena_mass.js prod_ap_north.json
// > node start_athena_mass.js prod_ap_south.json
// > node start_athena_mass.js prod_eu_central.json
// > node start_athena_mass.js prod_uk_south.json
// > node start_athena_mass.js prod_us_east.json
// > node start_athena_mass.js prod_us_south.json
//------------------------------------------------------------

// ------------ set these fields before running ------------ //
const READ_ONLY = true;		// no effect
//------------------------------------------------------------

// --- Report --- //
const report = {
	scanned_region: '',
	already_started: 0,
	not_started: 0,
	dbs_with_settings_doc_error: [],
	statusCodes: {},
};

// things we might need
let service_credential = null;		// populated later from env file
const tools = {
	url: require('url'),
	fs: require('fs'),
	path: require('path'),
	async: require('async'),
	request: require('request'),
	crypto: require('crypto'),
	winston: require('winston'),
};

// logger
let transports = [
	new (tools.winston.transports.Console)({
		colorize: true,
		stderrLevels: [],
		consoleWarnLevels: [],
	})
];
let logger = new (tools.winston.Logger)({
	level: 'silly',
	transports: transports
});


// setup
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
check_cli_arguments();
tools.misc = require('../libs/misc.js')(logger, tools);
tools.ot_misc = require('../libs/ot_misc.js')(logger, tools);
tools.couch_lib = require('../libs/couchdb.js')(logger, tools, service_credential.url);
start();

//-------------------------------------------------------------------------------------------
// start the script
//-------------------------------------------------------------------------------------------
function start() {
	logger.info('[1] starting.');														// step 1
	if (READ_ONLY) {
		logger.debug('in read only mode', READ_ONLY);
	}
	report.today = tools.misc.formatDate(Date.now(), '%M/%d/%Y');

	logger.info('[2] getting dbs');														// step 2
	get_dbs('-system', (err, dbs) => {
		if (err || !dbs) {
			logger.error('[5] fin.');													// step 5
		} else {
			logger.debug('total dbs:', dbs.length, '\n');
			tools.async.eachLimit(dbs, 16, (db_name, a_cb) => {

				get_settings_doc(db_name, (error, settings_doc) => {
					if (error || !settings_doc) {
						return a_cb();
					} else {

						const opts = {
							baseUrl: settings_doc.host_url,
							user: settings_doc.support_key,
							pass: settings_doc.support_password,
						};
						start_athena(opts, () => {								// send it twice to hit each instance, best effort
							start_athena(opts, () => {
								return a_cb();
							});
						});
					}
				});
			}, (err) => {
				logger.debug('----------------------------------------------------------------------- :)');
				logger.debug('results:', JSON.stringify(report, null, 2));
				logger.info('[5] fin.');												// step 5
			});
		}
	});
}

// send start api
function start_athena(opts, cb) {
	const options = {
		method: 'POST',
		baseUrl: opts.baseUrl,
		url: '/ak/api/v2/requests/start',
		headers: {
			Authorization: 'Basic ' + Buffer.from(opts.user + ':' + opts.pass).toString('base64')
		},
		_retry_codes: {
			'429': '429 rate limit exceeded aka too many reqs',
			'408': '408 timeout',
		}
	};
	tools.misc.retry_req(options, (req_e, resp) => {
		let body = null;
		try {
			body = JSON.parse(resp.body);
		} catch (e) { }

		if (body && body.message === 'requests processing is already started') {
			report.already_started++;
		}
		if (body && body.message !== 'requests processing is already started') {
			report.not_started++;
		}

		const code = tools.ot_misc.get_code(resp);			// record the status codes just b/c
		if (!report.statusCodes[code]) {
			report.statusCodes[code] = 1;
		} else {
			report.statusCodes[code]++;
		}
		return cb();
	});
}

// check cli input
function check_cli_arguments() {
	if (process.argv.length !== 3) {												// not enough arguments
		logger.error('Not enough arguments');
		logger.error('Try something like: node start_athena_mass.js prod_ap_north.json');
		logger.error('Better luck next time');
		process.exit();
	} else {
		logger.info('using creds:', process.argv[2]);
		service_credential = require('../env/' + process.argv[2]);				// cred file looked up from env folder
		report.scanned_region = process.argv[2];
	}
}

// get the list of db names
function get_dbs(suffix, cb) {
	const opts = {
		db_name: '_all_dbs',
	};
	tools.couch_lib.getDatabase(opts, (e, resp) => {
		if (e) {
			logger.error('could not contact couchdb', e);
			return cb(e, resp);
		} else {
			const ret = [];
			for (let i in resp) {
				if (resp[i].includes(suffix)) {
					ret.push(resp[i]);
				}
			}
			return cb(e, ret);
		}
	});
}

// get the settings doc
function get_settings_doc(db_name, cb) {
	const opts = {
		db_name: db_name,
		_id: '00_settings_athena',
	};

	tools.couch_lib.getDoc(opts, (err, doc) => {
		if (err) {
			logger.error('error getting settings doc:', db_name, err);
			report.dbs_with_settings_doc_error.push(db_name);
			return cb(err);
		} else {
			return cb(null, doc);
		}
	});
}
