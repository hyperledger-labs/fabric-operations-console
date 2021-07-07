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
// list_cert_expirations.js
//
// Find all SaaS components (in region) with expired tls certs (in our siid component dbs)
//
// Expects a service credential file as 1st argument to script (service cred must be json in the ./env folder)
// > node list_cert_expirations.js prod_ap_north.json
// > node list_cert_expirations.js prod_ap_south.json
// > node list_cert_expirations.js prod_eu_central.json
// > node list_cert_expirations.js prod_uk_south.json
// > node list_cert_expirations.js prod_us_east.json
// > node list_cert_expirations.js prod_us_south.json
//------------------------------------------------------------

// ------------ set these fields before running ------------ //
const READ_ONLY = true;
const SCAN_FIELD = 'tls_cert';
const SCAN_COMPONENTS = ['fabric-orderer'];
//------------------------------------------------------------

// --- Report --- //
const report = {
	scanned_region: '',
	scanned_components: 0,
	field_scanned: SCAN_FIELD,
	scanned_component_types: SCAN_COMPONENTS,
	dbs_with_design_doc_error: [],
	missing_cert_field: [],
	invalid_cert_field: [],
	quick_summary_NOT_cumulative: {
		already_expired: 0,
		expiring_in_1_week: 0,
		expiring_in_2_weeks: 0,
		expiring_in_3_weeks: 0,
		expiring_in_1_month: 0,
		expiring_in_3_months: 0,
		expiring_in_6_months: 0,
		expiring_in_1_year: 0,
		expiring_in_5_years: 0,
		expiring_in_10_years: 0,
		expiring_in_15_years: 0,
	},
	expirations: []
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
const js_rsa = require('jsrsasign');
const ev = {
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
		RAFT: 'etcdraft',
		ATHENA_RAFT: 'raft',
		CREATE_ACTION: 'blockchain.components.create',
		DELETE_ACTION: 'blockchain.components.delete',
		REMOVE_ACTION: 'blockchain.components.remove',
		IMPORT_ACTION: 'blockchain.components.import',
		EXPORT_ACTION: 'blockchain.components.export',
		RESTART_ACTION: 'blockchain.optools.restart',
		LOGS_ACTION: 'blockchain.optools.logs',
		VIEW_ACTION: 'blockchain.optools.view',
		SETTINGS_ACTION: 'blockchain.optools.settings',
		USERS_ACTION: 'blockchain.users.manage',
		API_KEY_ACTION: 'blockchain.apikeys.manage',
		NOTIFICATIONS_ACTION: 'blockchain.notifications.manage',
		SIG_COLLECTION_ACTION: 'blockchain.signaturecollection.manage',
		C_MANAGE_ACTION: 'blockchain.components.manage',
		SUFFIX_DELIMITER: '_',
		TX_ARCHIVE: 'archive',
		TX_INBOX: 'inbox',
		LEVEL_DB: 'leveldb',
		COUCH_DB: 'couchdb',
		SQL_DB: 'sqlite3',
		STATUS_ALL_GOOD: 'ok',
		STATUS_NOT_GREAT: 'not ok',
		ARCHIVED_VIEW: 'active_notifications_by_ts',
		ALL_NOTICES_VIEW: 'all_notifications_by_ts',
		LOCATION_IBP_SAAS: 'ibm_saas',
		INFRA_IBP_SAAS: 'ibmcloud',
		PAID_K8S: 'paid',
		GET_ALL_COMPONENTS_KEY: 'GET /api/vx/instance/iid/type/all',
		GET_FAB_VERSIONS_KEY: 'GET /api/vx/instance/iid/type/all/versions',
		EVENT_COMP_DEL: 'component_delete',
		EVENT_COMP_RMV: 'component_remove',
		EVENT_COMP_ADD: 'component_onboard',
		EVENT_COMP_EDT: 'component_edit',
		SERVICE_NAME: 'blockchain',
		TX_CCD: 'ccd',
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
		TLS_CERT_ORG: 'ibp2-auto-gen'
	}
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
check_cli_arguments();
tools.misc = require('../../libs/misc.js')(logger, tools);
tools.ot_misc = require('../../libs/ot_misc.js')(logger, tools);
tools.couch_lib = require('../../libs/couchdb.js')(logger, tools, service_credential.url);
tools.asn1 = js_rsa.asn1;
tools.KEYUTIL = js_rsa.KEYUTIL;
tools.ECDSA = js_rsa.ECDSA;
tools.js_rsa = js_rsa;
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
	get_dbs('-components', (err, dbs) => {
		if (err || !dbs) {
			logger.error('[5] fin.');													// step 5
		} else {
			logger.debug('total dbs:', dbs.length, '\n');

			tools.async.eachLimit(dbs, 8, (db_name, a_cb) => {

				logger.info('[3] getting components for db', db_name);					// step 3
				get_all_components(db_name, (error, comp_docs) => {
					if (error || !comp_docs) {
						return a_cb();
					} else {
						logger.debug('db:', db_name, 'components:', comp_docs.length);
						for (let i in comp_docs) {
							if (SCAN_COMPONENTS.includes(comp_docs[i].type)) {
								record_component(db_name, comp_docs[i]);
							}
						}
						setTimeout(() => {												// slow it down, to avoid lots of 429s
							return a_cb();
						}, 1800);
					}
				});
			}, (err) => {
				logger.debug('----------------------------------------------------------------------- :)');
				//logger.debug('results:', JSON.stringify(report, null, 2));

				// prune the empty array entries
				const temp = [];
				for (let i in report.expirations) {
					if (report.expirations[i]) {
						temp.push(report.expirations[i]);
					}
				}
				report.expirations = temp;

				tools.fs.writeFileSync('expirations_' + report.scanned_region, JSON.stringify(report, null, 2));
				logger.info('[5] fin.');												// step 5
			});
		}
	});
}

function record_component(db_name, doc) {
	report.scanned_components++;
	if (!doc[SCAN_FIELD]) {
		logger.warn('- missing ' + SCAN_FIELD + ' field for component:', doc._id);
		report.missing_cert_field.push({ db: db_name, component_id: doc._id });
	} else {
		const parsed = tools.ot_misc.parseCertificate(doc[SCAN_FIELD]);
		if (!parsed) {
			logger.warn('- unable to parse ' + SCAN_FIELD + ' field for component:', doc._id);
			report.invalid_cert_field.push({ db: db_name, component_id: doc._id });
		} else {
			const time_left = parsed.not_after_ts - Date.now();
			let days_left = Math.round(time_left / (1000 * 60 * 60 * 24));
			if (days_left <= 0) {
				days_left = 0;
			}
			if (!report.expirations[days_left]) {
				report.expirations[days_left] = {
					expires_in: days_left + '_days',
					expiration_date: tools.misc.formatDate(parsed.not_after_ts, '%M/%d/%Y'),
					components: []
				};
			}
			report.expirations[days_left].components.push({ db: db_name, component_id: doc._id, type: doc.type, location: doc.location });
			//logger.debug('found:', Object.keys(report.expirations).length);


			if (days_left <= 0) {
				report.quick_summary_NOT_cumulative.already_expired++;
			} else if (days_left <= 7) {
				report.quick_summary_NOT_cumulative.expiring_in_1_week++;
			} else if (days_left <= 14) {
				report.quick_summary_NOT_cumulative.expiring_in_2_weeks++;
			} else if (days_left <= 21) {
				report.quick_summary_NOT_cumulative.expiring_in_3_weeks++;
			} else if (days_left <= 30) {
				report.quick_summary_NOT_cumulative.expiring_in_1_month++;
			} else if (days_left <= 90) {
				report.quick_summary_NOT_cumulative.expiring_in_3_months++;
			} else if (days_left <= 180) {
				report.quick_summary_NOT_cumulative.expiring_in_6_months++;
			} else if (days_left <= 365) {
				report.quick_summary_NOT_cumulative.expiring_in_1_year++;
			} else if (days_left <= 365 * 5) {
				report.quick_summary_NOT_cumulative.expiring_in_5_years++;
			} else if (days_left <= 365 * 10) {
				report.quick_summary_NOT_cumulative.expiring_in_10_years++;
			} else if (days_left <= 365 * 15) {
				report.quick_summary_NOT_cumulative.expiring_in_15_years++;
			}
		}
	}
}

// check cli input
function check_cli_arguments() {
	if (process.argv.length !== 3) {												// not enough arguments
		logger.error('Not enough arguments');
		logger.error('Try something like: node list_cert_expirations.js prod_ap_north.json');
		logger.error('Better luck next time');
		process.exit();
	} else {
		logger.info('using creds:', process.argv[2]);
		service_credential = require('../../env/' + process.argv[2]);				// cred file looked up from env folder
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

// get all components in 1 db
function get_all_components(db_name, cb) {
	const opts = {
		db_name: db_name,				// db for peers/cas/orderers/msps/etc docs
		_id: '_design/athena-v1',		// name of design doc
		view: '_doc_types',
		query: tools.misc.formatObjAsQueryParams({ include_docs: true, keys: [ev.STR.CA, ev.STR.ORDERER, ev.STR.PEER] }),
	};

	tools.couch_lib.getDesignDocView(opts, (err, resp) => {
		if (err) {
			logger.error('error getting all component docs:', db_name, err);
			report.dbs_with_design_doc_error.push(db_name);
			return cb(err);
		} else {
			const docs = [];
			if (resp) {
				for (let i in resp.rows) {
					if (resp.rows[i] && resp.rows[i].doc) {
						docs.push(resp.rows[i].doc);
					}
				}
			}
			return cb(null, docs);
		}
	});
}
