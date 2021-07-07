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
// backup_saas.js
//
// Find all SaaS databases (in region) and backup docs to file system. Will write to athena's root "_backups" folder.
//
// Expects a service credential file as 1st argument to script (service cred must be json in the ./env folder)
//
// > node backup_saas.js staging_us_south.json
// > node backup_saas.js prod_ap_north.json
// > node backup_saas.js prod_ap_south.json
// > node backup_saas.js prod_eu_central.json
// > node backup_saas.js prod_uk_south.json
// > node backup_saas.js prod_us_east.json
// > node backup_saas.js prod_us_south.json
//------------------------------------------------------------

// ------------ set these fields before running ------------ //
const READ_ONLY = true;		// n/a
//------------------------------------------------------------

// --- Report --- //
const report = {
	scanned_region: '',
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
tools.misc = require('../libs/misc.js')(logger, tools);
tools.ot_misc = require('../libs/ot_misc.js')(logger, tools);
tools.couch_lib = require('../libs/couchdb.js')(logger, tools, service_credential.url);
tools.db_backup = require('../libs/db_backup.js')(logger, ev, tools);
tools.notifications = {
	procrastinate: () => { }			// dummy function, we don't want notifications
};
start();

//-------------------------------------------------------------------------------------------
// start the script
//-------------------------------------------------------------------------------------------
function start() {
	logger.info('[1] starting.');														// step 1
	tools.ot_misc.open_server();
	if (READ_ONLY) {
		logger.debug('in read only mode', READ_ONLY);
	}
	report.today = tools.misc.formatDate(Date.now(), '%M/%d/%Y');
	let on = 0;

	logger.info('[2] getting dbs');														// step 2
	get_dbs('db-', (err, dbs) => {
		if (err || !dbs) {
			logger.error('[4] fin.');													// step 4 (early done)
		} else {
			logger.info('total dbs:', dbs.length);
			const grouped = group_dbs(dbs);
			const total = Object.keys(grouped).length;
			logger.info('total service instances:', total);

			tools.async.eachOfLimit(grouped, 1, (dbs, siid, a_cb) => {					// can only do 1 backup at a time, b/c backup lib limitation

				logger.silly('[3] ' + (++on) + '/' + total, remove_ext(report.scanned_region), 'backing up siid', siid, dbs.types);	// step 3
				const opts = {
					req: {},
					db_names: dbs.full_names,
					blacklisted_doc_types: ['athena_backup', 'session_athena'],
					BATCH: 256,
					use_fs: true,
					instance_id: remove_ext(report.scanned_region) + '/' + siid
				};
				tools.db_backup.async_backup(opts, null, (error, comp_docs) => {
					setTimeout(() => {													// slow it down, to avoid lots of 429s
						return a_cb();
					}, 1500);
				});

			}, (err) => {
				logger.debug('----------------------------------------------------------------------- :)');
				logger.debug('results:', JSON.stringify(report, null, 2));
				logger.info('[4] fin.');												// step 4 (all done)
				process.exit();
			});
		}
	});
}

// check cli input
function check_cli_arguments() {
	if (process.argv.length !== 3) {												// not enough arguments
		logger.error('Not enough arguments');
		logger.error('Try something like: node backup_saas.js prod_ap_north.json');
		logger.error('Better luck next time');
		process.exit();
	} else {
		logger.info('using creds:', process.argv[2]);
		service_credential = require('../env/' + process.argv[2]);					// cred file looked up from env folder
		report.scanned_region = process.argv[2];
	}
}

// remove file extension
function remove_ext(input) {
	if (typeof input === 'string') {
		const pos = input.lastIndexOf('.');
		return input.substring(0, pos);
	}
	return input;
}

// get the list of db names
function get_dbs(prefix, cb) {
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
				if (resp[i].includes(prefix)) {
					ret.push(resp[i]);
				}
			}
			return cb(e, ret);
		}
	});
}

// group db names by siid
function group_dbs(all_dbs) {
	const ret = {};
	for (let i in all_dbs) {
		const db_full_name = all_dbs[i];
		const siid = get_siid(db_full_name);
		const db_type = get_db_type(db_full_name);

		if (!ret[siid]) {							// safe init
			ret[siid] = {};
		}
		if (!ret[siid].types) {
			ret[siid].types = [];
		}
		if (!ret[siid].full_names) {
			ret[siid].full_names = [];
		}

		ret[siid].types.push(db_type);
		ret[siid].full_names.push(db_full_name);
	}
	return ret;
}

// get service instance id from db name
function get_siid(db_name) {
	if (typeof db_name === 'string') {
		if (db_name.indexOf('db-') === 0) {
			const pos = db_name.lastIndexOf('-');
			return db_name.substring(3, pos);
		}
	}
	return 'unknown-siid';
}

// get db type from the db name
function get_db_type(db_name) {
	if (typeof db_name === 'string') {
		if (db_name.indexOf('db-') === 0) {
			const pos = db_name.lastIndexOf('-');
			return db_name.substring(pos + 1);
		}
	}
	return 'unknown';
}
