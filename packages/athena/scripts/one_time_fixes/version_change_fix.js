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
// version_change_fix.js
//
// Find all components with version 1.4.1 and change it to 1.4.1-0 in components db
//
// Expects a service credential file as 1st argument to script
// > node version_change_fix.js prod_ap_north.json
//------------------------------------------------------------

// ------------ set these fields before running ------------ //
const old_version = '1.4.1';
const new_version = '1.4.1-0';
const READ_ONLY = true;
//------------------------------------------------------------

// things we might need
let service_credential = null;
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

// setup couch lib
check_cli_arguments();
tools.misc = require('../../libs/misc.js')(logger, tools);
tools.ot_misc = require('../../libs/ot_misc.js')(logger, tools);
tools.couch_lib = require('../../libs/couchdb.js')(logger, tools, service_credential.url);

//-------------------------------------------------------------------------------------------
// start the work
//-------------------------------------------------------------------------------------------
logger.info('[1] starting.');														// step 1
const results = { editing: 0, design_doc_error_dbs: [], missing_version: [] };
if (READ_ONLY) {
	logger.debug('in read only mode', READ_ONLY);
}

logger.info('[2] getting dbs');														// step 2
get_dbs('-components', (err, dbs) => {
	if (err || !dbs) {
		logger.error('[5] fin.');													// step 5
	} else {
		logger.debug('total dbs:', dbs.length, '\n');

		tools.async.eachLimit(dbs, 8, (db_name, a_cb) => {
			const edited_docs = [];

			logger.info('[3] getting components for db', db_name);					// step 3
			get_all_components(db_name, (error, comp_docs) => {
				if (error || !comp_docs) {
					return a_cb();
				} else {
					logger.debug('db:', db_name, 'components:', comp_docs.length);
					for (let i in comp_docs) {
						record_version(comp_docs[i].version);
						if (comp_docs[i].version === old_version) {
							logger.warn('- found older version', comp_docs[i].version);
							comp_docs[i].version = new_version;						// change it to the new version str
							edited_docs.push(comp_docs[i]);
							results.editing++;
						} else if (comp_docs[i].version === new_version) {			// this is the version we want
							//logger.debug('- found new version', comp_docs[i].version);
						} else if (!comp_docs[i].version) {
							logger.warn('- found missing version', comp_docs[i].type);
							results.missing_version.push(db_name + ' ' + comp_docs[i]._id + ' ' + comp_docs[i].type);
						}
					}

					logger.info('[4] editing components for db', db_name);			// step 4
					bulk_edit(db_name, edited_docs, () => {
						return a_cb();
					});
				}
			});
		}, (err) => {
			logger.debug('----------------------------------------------------------------------- :)');
			logger.debug('results:', JSON.stringify(results, null, 2));
			logger.info('[5] fin.');												// step 5
		});
	}
});

// check cli input
function check_cli_arguments() {
	if (process.argv.length !== 3) {												// not enough arguments
		logger.error('Not enough arguments');
		logger.error('Try something like: node version_change_fix.js prod_ap_north.json');
		logger.error('Better luck next time');
		process.exit();
	} else {
		logger.info('using creds:', process.argv[2]);
		service_credential = require('../../env/' + process.argv[2]);				// cred file looked up from env folder
	}
}

// get the list of db names
function get_dbs(type, cb) {
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
				if (resp[i].includes(type)) {
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
			results.design_doc_error_dbs.push(db_name);
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

// edit an array of docs at once
function bulk_edit(db_name, docs, cb) {
	if (docs && docs.length === 0) {							// if we found docs, edit them
		logger.debug('0 docs to edit for db', db_name);
		return cb();
	} else {
		if (READ_ONLY) {
			logger.info('in read only mode, will not edit docs', docs.length);
			return cb();
		} else {
			tools.couch_lib.bulkDatabase({ db_name: db_name }, { docs: docs }, (err, resp) => {
				if (err != null) {
					logger.error('could not edit ' + docs.length + ' doc(s)', err);
				} else {
					logger.debug('edited ' + docs.length + ' docs(s)');
				}
				return cb();
			});
		}
	}
}

// record the version
function record_version(version) {
	if (!results[version]) {
		results[version] = 0;
	}
	results[version]++;
}
