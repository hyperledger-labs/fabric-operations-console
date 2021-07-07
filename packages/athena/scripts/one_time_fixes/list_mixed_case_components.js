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
// list_mixed_case_components.js
//
// Find all SaaS components (in region) with mixed case component ids. - DELETES the non-lowercase duplicate component if READ_ONLY is false
// fixes issue: https://github.ibm.com/IBM-Blockchain/OpTools/issues/4343
//
// Expects a service credential file as 1st argument to script (service cred must be json in the ./env folder)
// > node list_mixed_case_components.js prod_ap_north.json
// > node list_mixed_case_components.js prod_ap_south.json
// > node list_mixed_case_components.js prod_eu_central.json
// > node list_mixed_case_components.js prod_uk_south.json
// > node list_mixed_case_components.js prod_us_east.json
// > node list_mixed_case_components.js prod_us_south.json
//------------------------------------------------------------

// ------------ set these fields before running ------------ //
const READ_ONLY = true;		// if not in read only, will delete duplicated components. the mixed case component is deleted
//------------------------------------------------------------

// --- Report --- //
const report = {
	scanned_region: '',
	scanned_components: 0,
	mixed_case_ids: 0,
	duplicate_ids: 0,
	dbs_with_design_doc_error: [],
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
tools.misc = require('../../libs/misc.js')(logger, tools);
tools.ot_misc = require('../../libs/ot_misc.js')(logger, tools);
tools.couch_lib = require('../../libs/couchdb.js')(logger, tools, service_credential.url);
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

			tools.async.eachLimit(dbs, 6, (db_name, a_cb) => {
				const lc_comps = {};

				logger.info('[3] getting components for db', db_name);					// step 3
				get_all_components(db_name, (error, comp_docs) => {
					if (error || !comp_docs) {
						return a_cb();
					} else {
						logger.debug('db:', db_name, 'components:', comp_docs.length);
						for (let i in comp_docs) {
							if (comp_docs[i].display_name) {
								record_component(lc_comps, db_name, comp_docs[i]);
							}
						}

						fix_components(db_name, lc_comps, () => {						// step 4
							setTimeout(() => {											// slow it down, to avoid lots of 429s
								return a_cb();
							}, 2000);
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

function record_component(lc_comps, db_name, doc) {
	report.scanned_components++;
	const lc_name = doc._id.toLowerCase();
	if (doc._id !== lc_name) {
		report.mixed_case_ids++;			// id contains mixed case characters
	}

	if (!lc_comps[lc_name]) {
		lc_comps[lc_name] = [doc];
	} else {
		lc_comps[lc_name].push(doc);
		report.duplicate_ids++;				// id as lowercase is already taken...
	}
}

function fix_components(db_name, duplicated, cb) {
	const bulk_del = {
		docs: []
	};
	const today = Date.now();
	for (let lc_id in duplicated) {
		if (duplicated[lc_id].length >= 2) {
			const docs = duplicated[lc_id];
			logger.silly('need to fix:', docs.length, docs[0]._id, docs[1]._id);
			let keep_id = docs[0]._id.toLowerCase();
			const pos2del = (keep_id !== docs[0]._id) ? 0 : 1;
			const pos2save = (keep_id !== docs[0]._id) ? 1 : 0;

			const path_del = './dup_fixes/' + report.scanned_region + '/' + db_name + '.' + today + '/del/' + docs[pos2del]._id + '.json';
			const path_saved = './dup_fixes/' + report.scanned_region + '/' + db_name + '.' + today + '/save/' + docs[pos2save]._id + '.json';

			tools.misc.check_dir_sync({ file_path: path_del, create: true });
			tools.fs.writeFileSync(path_del, JSON.stringify(docs[pos2del], null, '\t'));		// backup delete docs first

			tools.misc.check_dir_sync({ file_path: path_saved, create: true });
			tools.fs.writeFileSync(path_saved, JSON.stringify(docs[pos2save], null, '\t'));	// backup saved docs too, historic reasons

			if (!READ_ONLY) {
				logger.warn('will delete duplicate component:', docs[pos2del]._id);
				bulk_del.docs.push({ _id: docs[pos2del]._id, _rev: docs[pos2del]._rev, _deleted: true });
			}
		}
	}

	if (bulk_del.docs.length === 0) {
		return cb(null);							// nothing to fix
	} else {
		tools.couch_lib.bulkDatabase({ db_name: db_name, }, bulk_del, (err) => {
			if (err != null) {
				logger.error('could not del duplicated components', err);
				return cb(err);
			} else {
				logger.warn('deleted duplicated components for db:', db_name);
				return cb(null);
			}
		});
	}
}

// check cli input
function check_cli_arguments() {
	if (process.argv.length !== 3) {												// not enough arguments
		logger.error('Not enough arguments');
		logger.error('Try something like: node list_mixed_case_components.js prod_ap_north.json');
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
