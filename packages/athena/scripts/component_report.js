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
// component_report.js
//
// Build report of all components in SaaS
//
// main report format:
/*
	{
		"<region-here>": {
			"<siid-here>":[{
				"name": "<deployer-component-id>",			// absent if imported is true
				"imported": false,
				athena_id": "<athena-component-id>",
				"version": "1.4.2
			}]
		}
	}
*/
// version report format:
/*
	{
		"<region-here>": {
			"cas":{
				"count": 2,
				"summary":{
					"2.2": 1,
					"1.4": 1,
				},
				"versions": {
					"1.4.2": "1"
					"2.2.2": "1",
				}
			},
			"orderers":{
				"count": 2,
				"summary":{
					"2.2": 1,
					"1.4": 1,
				},
				"versions": {
					"1.4.2": "1"
					"2.2.2": "1",
				}
			},
			"peers":{
				"count": 2,
				"summary":{
					"2.2": 1,
					"1.4": 1,
				},
				"versions": {
					"1.4.2": "1"
					"2.2.2": "1",
				}
			}
		}
	}
*/
//
// Expects a service credential file as 1st argument to script (service cred must be json in the ./env folder)
// Iters over all env files provided, must have 1, no max
// > node component_report.js prod_ap_north.json prod_ap_south.json prod_eu_central.json prod_uk_south.json prod_us_east.json prod_us_south.json
// > node component_report.js prod_ap_south.json
//------------------------------------------------------------

// ------------ set these fields before running ------------ //
const READ_ONLY = true;		// no effect
//------------------------------------------------------------

// --- Report --- //
const report = {};
const dates = {};

// things we might need
const tools = {
	url: require('url'),
	fs: require('fs'),
	path: require('path'),
	async: require('async'),
	request: require('request'),
	crypto: require('crypto'),
	winston: require('winston'),
};
const ev = {				// not all of this is needed, i just copied the settings.js code
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
tools.misc = require('../libs/misc.js')(logger, tools);
tools.ot_misc = require('../libs/ot_misc.js')(logger, tools);
const date_time = tools.misc.formatDate(Date.now(), '%Y.%M.%d~%H%m');
const report_file_name = tools.path.join(__dirname, './reports/athena_components.' + date_time + '.json');
const report_file_name2 = tools.path.join(__dirname, './reports/athena_components.' + date_time + '.dates.json');
const report_file_name3 = tools.path.join(__dirname, './reports/athena_components.' + date_time + '.versions.json');
const comp_types = [ev.STR.CA, ev.STR.PEER, ev.STR.ORDERER];
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
const envs = check_cli_arguments();

tools.async.eachLimit(envs, 1, (env, a_cb) => {										// iter on each env/region, only ever 1 at a time b/c of couchdb lib
	const db_url = env.url;
	tools.couch_lib = require('../libs/couchdb.js')(logger, tools, db_url);			// reload lib for each env to change the db url
	start(env.name, () => {
		return a_cb();
	});
}, () => {
	logger.info('[6] fin.');
});

//-------------------------------------------------------------------------------------------
// start the script
//-------------------------------------------------------------------------------------------
function start(env_name, cb) {
	console.log('\n');
	logger.info('[1] starting. ', env_name);											// step 1
	if (READ_ONLY) {
		logger.debug('in read only mode', READ_ONLY);
	}
	let on = 0;

	logger.info('[2] getting dbs');														// step 2
	get_dbs('-components', (err, dbs) => {
		if (err || !dbs) {
			logger.info('[5] env "' + env_name + '" fin.');								// step 5
			return cb();
		} else {
			logger.info('total dbs:', dbs.length);
			const total = dbs.length;
			tools.async.eachLimit(dbs, 2, (db_name, a_cb) => {							// do 2 or 1 at a time to avoid missing some due to 429s

				logger.info('[3] ' + (++on) + '/' + total, env_name, 'getting components for db', db_name);	// step 3
				record_component(env_name, get_siid(db_name), null);					// leave comp_doc param empty to init siid

				get_settings_doc(db_name, (error, settings_doc) => {
					record_siid(env_name, get_siid(db_name), settings_doc);

					get_all_components(db_name, (error, comp_docs) => {
						if (error || !comp_docs) {
							return a_cb();
						} else {
							logger.debug('db:', db_name, 'components:', comp_docs.length);			// step 4
							for (let i in comp_docs) {
								if (comp_docs[i].type && comp_types.includes(comp_docs[i].type)) {	// only track fabric components
									record_component(env_name, get_siid(db_name), comp_docs[i]);
								}
							}
							setTimeout(() => {														// slow it down, to avoid lots of 429s
								return a_cb();
							}, 400);
						}
					});
				});

			}, (err) => {
				logger.debug('----------------------------------------------------------------------- :)');
				try {
					report[env_name] = tools.misc.sortKeys(report[env_name], 0, 10000);		// need a higher than usual max for watchdog, b/c its huge
					let version_report = make_simple();
					version_report._all_regions = make_version_summary(version_report);
					tools.fs.writeFileSync(report_file_name, JSON.stringify(report, null, '\t'));
					tools.fs.writeFileSync(report_file_name2, JSON.stringify(dates, null, '\t'));
					tools.fs.writeFileSync(report_file_name3, JSON.stringify(version_report, null, '\t'));
					console.log(JSON.stringify(version_report._all_regions, null, 2));
				} catch (e) {
					logger.error('unable to write report. E:', e);
				}
				logger.info('[5] env "' + env_name + '" fin.');								// step 5
				return cb();
			});
		}
	});
}

// check cli input
function check_cli_arguments() {
	if (process.argv.length <= 2) {														// not enough arguments
		logger.error('Not enough arguments');
		logger.error('Try something like: node component_report.js prod_ap_north.json');
		logger.error('Better luck next time');
		process.exit();
	} else {
		const envs = process.argv.splice(2);
		logger.info('using creds:', JSON.stringify(envs));

		const ret = {};
		for (let i in envs) {
			ret[envs[i]] = require('../env/' + envs[i]);								// cred file looked up from env folder
			ret[envs[i]].name = remove_ext(envs[i]);
		}
		return ret;
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

// add this component to the report
function record_component(env, siid, comp_doc) {
	if (!report[env]) {
		report[env] = {};
	}
	if (!report[env][siid]) {
		report[env][siid] = [];
	}
	if (comp_doc) {
		report[env][siid].push({
			name: comp_doc.dep_component_id,
			athena_id: comp_doc._id,
			imported: comp_doc.location !== ev.STR.LOCATION_IBP_SAAS,
			version: comp_doc.version,				// if version dne, probably an imported component
			type: comp_doc.type,
		});
	}
}

// add this component to the siid report
function record_siid(env, siid, settings_doc) {
	if (!dates[env]) {
		dates[env] = {};
	}
	if (settings_doc && settings_doc.access_list) {
		for (let user in settings_doc.access_list) {
			dates[env][siid] = settings_doc.access_list[user].created;
			break;						// only need the first one
		}
	}
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


// get the settings doc
function get_settings_doc(db_name, cb) {
	const opts = {
		db_name: db_name.replace('-components', '-system'),
		_id: '00_settings_athena',
	};
	tools.couch_lib.getDoc(opts, (err, doc) => {
		if (err) {
			logger.error('error getting settings doc:', db_name, err);
			return cb(err);
		} else {
			return cb(null, doc);
		}
	});
}

// make a report for the summary of the component versions in use
function make_simple() {
	const ret = {};
	for (let region in report) {
		if (!ret[region]) {												// init
			ret[region] = {};
		}

		for (let siid in report[region]) {
			for (let i in report[region][siid]) {
				const ver = report[region][siid][i].version;
				const type = report[region][siid][i].type;

				if (ver) {													// if version dne, probably an imported component
					if (!ret[region][type]) {								// init
						ret[region][type] = {
							count: 0,
							summary: {},
							versions: {}
						};
					}

					ret[region][type].count++;								// build the simple report details
					if (!ret[region][type].versions[ver]) {					// init
						ret[region][type].versions[ver] = 0;
					}
					ret[region][type].versions[ver]++;

					const summary_key = get_major_minor(ver);
					if (!ret[region][type].summary[summary_key]) {			// init
						ret[region][type].summary[summary_key] = 0;
					}
					ret[region][type].summary[summary_key]++;
				}
			}
		}
	}

	return tools.misc.sortKeys(ret);
}

function get_major_minor(str) {
	if (typeof str === 'string') {
		const parts = str.split('.');
		return parts[0] + '.' + parts[1];
	}
}

// print summary of version report
function make_version_summary(data) {
	const ret = {};
	let total = 0;

	for (let region in data) {
		for (let type in data[region]) {
			if (!ret[type]) {
				ret[type] = {
					count: 0,
					summary: {},
					versions: {}
				};
			}

			for (let ver in data[region][type].summary) {
				const ver_count = data[region][type].summary[ver];
				if (!ret[type].summary[ver]) {
					ret[type].summary[ver] = 0;
				}
				ret[type].summary[ver] += ver_count;
				ret[type].count += ver_count;
				total += ver_count;
			}

			for (let ver in data[region][type].versions) {
				if (!ret[type].versions[ver]) {
					ret[type].versions[ver] = 0;
				}
				ret[type].versions[ver] += data[region][type].versions[ver];
			}
		}
	}

	for (let type in ret) {
		ret[type].summary = add_percent_to_obj(ret[type].summary);
		ret[type].versions = add_percent_to_obj(ret[type].versions);
	}

	console.log('all components in all regions:', total);
	ret._count = total;
	return tools.misc.sortKeys(ret);
}

// count all object key values and add the percent of the count to each value
function add_percent_to_obj(data) {
	let total = 0;
	for (let key in data) {
		total += data[key];
	}

	for (let key in data) {
		data[key] = data[key] + ' (' + (data[key] / total * 100).toFixed(1) + '%' + ')';
	}
	return data;
}
