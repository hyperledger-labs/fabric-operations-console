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
// migration_lib.js - Library functions for migrating from one console to another console
//------------------------------------------------------------
module.exports = function (logger, ev, t) {
	const exports = {};
	// dsh todo doc the new settings
	// dsh todo internal doc the new apis

	const MIGRATION_LOCK = 'migration';
	const CHECK_INGRESS_API_OPTS = {
		method: 'GET',
		path: '/api/v1/$iid/$account/ingress',	// $iid & $account get replaced later
	};
	const CHECK_NODE_API_OPTS = {
		method: 'GET',
		path: '/api/v1/$iid/verify/all',		// $iid gets replaced later
	};

	//-------------------------------------------------------------
	// Get the overall status from status docs in db
	//-------------------------------------------------------------
	exports.get_status = (req, cb) => {
		const ret = {
			migration_status: null, 		//'in-progress' || 'done' || null,
			migrated_console_url: null, 	//'https://something.goes.here.com' || null,
			components: [
				/*{
					"id": <id here>,
					"migration_status" : "in-progress" || "done" || null
				}*/
			],
			wallets: [
				/*{
					"email": <email here>,
					"timestamp" : "done"
				}*/
			]
		};

		t.async.parallel([

			// ---- Get settings doc ---- //
			(join) => {
				t.couch_lib.getDoc({ db_name: ev.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, function (err, athena) {
					if (err) {
						logger.error('[migration-status] an error occurred obtaining the "' + process.env.SETTINGS_DOC_ID + '" db:', ev.DB_SYSTEM, err, athena);
						join(err, athena);
					} else {
						join(null, athena);
					}
				});
			},

			// ---- Get wallet migration docs ---- //
			(join) => {
				const view_opts = {
					db_name: ev.DB_SYSTEM,
					_id: '_design/athena-v1',
					view: '_doc_types',
					SKIP_CACHE: true,
					query: t.misc.formatObjAsQueryParams({ include_docs: true, keys: [ev.STR.WALLET_MIGRATION], reduce: false }),
				};
				t.otcc.getDesignDocView(view_opts, (err_getDoc, resp) => {
					if (err_getDoc || !resp) {
						logger.error('[migration-status] unable to load wallet export records:', err_getDoc, resp);
					}
					join(null, resp ? resp.rows : []);
				});
			},

			// ---- Get component docs ---- //
			(join) => {
				const opts = {
					db_name: ev.DB_COMPONENTS,		// db for peers/cas/orderers/msps/etc docs
					_id: '_design/athena-v1',		// name of design doc
					view: '_doc_types',
					SKIP_CACHE: true,
					query: t.misc.formatObjAsQueryParams({ include_docs: true, keys: [ev.STR.CA, ev.STR.ORDERER, ev.STR.PEER] }),
				};

				t.otcc.getDesignDocView(opts, (err, resp) => {
					if (err) {
						logger.error('[migration-status] error getting all deployed components:', err);
						join(null, []);
					} else {
						join(null, resp ? resp.rows : []);
					}
				});
			},

		], (_, results) => {
			const settings_doc = results[0];
			const wallet_docs = results[1];
			const component_docs = results[2];
			const mig_status_data = settings_doc ? settings_doc.migration_status : {};
			const last_step_status = (mig_status_data && mig_status_data.db_finish_ts) ? ev.STR.STATUS_DONE : null;

			ret.migrated_console_url = settings_doc.migrated_console_url || null;
			ret.wallets = format_wallet_status_docs(wallet_docs);
			ret.components = format_comp_status_docs(component_docs);

			ret.elapsed_ms = Date.now() - mig_status_data.ingress_start_ts;
			ret.timeout_ms = mig_status_data.timeout_min * 60 * 1000;
			ret.time_left_ms = ret.timeout_ms - ret.elapsed_ms;
			ret.migration_enabled = settings_doc.feature_flags ? settings_doc.feature_flags.migration_enabled : false;
			ret.deadline = mig_status_data.deadline;

			// overall migration status
			ret.migration_status = null;
			if ((last_step_status === ev.STR.STATUS_DONE) && (ret.wallets.length > 0)) {
				ret.migration_status = ev.STR.STATUS_DONE;
			} else if (ret.time_left_ms >= 0 || last_step_status === ev.STR.STATUS_DONE) {	// still show in-progress if ran out of time on last step (wallet)
				ret.migration_status = ev.STR.STATUS_IN_PROGRESS;
			} else if (ret.time_left_ms < 0) {
				if (mig_status_data.ingress_start_ts) {
					ret.migration_status = ev.STR.STATUS_TIMEOUT;
				}
			}

			// any error message overrides the normal status conditions
			if (mig_status_data.error_msg) {
				ret.migration_status = ev.STR.STATUS_FAILED;
				ret.error_msg = t.misc.safe_str(mig_status_data.error_msg, true);
			} else {
				ret.error_msg = '';
			}

			// find the step we are on, it has a start timestamp but no finish timestamp
			let on_step = 0;
			const step_field_names = ['ingress', 'comp', 'console', 'db'];	// the prefix of the step, must match value in settings doc
			for (let i in step_field_names) {
				const startFieldName = step_field_names[i] + '_start_ts';
				const finFieldName = step_field_names[i] + '_finish_ts';
				if (mig_status_data[startFieldName]) {
					on_step = Number(i);
				}
				if (mig_status_data[finFieldName]) {
					on_step = Number(i) + 1;
				}
			}

			// steps are either not-started, in-progress, done, or failed (a timeout and error are treated the same way for the step diagram)
			ret.on_step = on_step;
			ret.steps = [];
			for (let i = 0; i <= 4; i++) {
				if (i < on_step) {
					ret.steps[i] = {
						status: ev.STR.STATUS_DONE
					};
				} else if (i === on_step) {
					ret.steps[i] = {
						status: (ret.migration_status === ev.STR.STATUS_FAILED || ret.migration_status === ev.STR.STATUS_TIMEOUT)
							? ev.STR.STATUS_FAILED : ev.STR.STATUS_IN_PROGRESS
					};
				} else {
					ret.steps[i] = {
						status: ''
					};
				}
			}

			// the wallet step is done when we are on it and we have exported at least 1 wallet recently
			if (on_step === 4 && ret.wallets.length > 0) {
				ret.steps[4] = {
					status: ev.STR.STATUS_DONE
				};
			}

			// estimate of how long migration will take
			ret.estimate_mins = calc_timeout(mig_status_data.timeout_min, ret.components);

			return cb(null, ret);
		});

		// format the wallet migration status response part
		function format_wallet_status_docs(wallet_docs) {
			const docs = {};
			for (let i in wallet_docs) {
				if (wallet_docs[i].doc) {
					const email = wallet_docs[i].doc.email;

					// if dne, make it, if we already have one, keep the most recent one
					if (!docs[email] || docs[email].timestamp < wallet_docs[i].doc.timestamp) {
						docs[email] = {
							email: email,
							uuid: wallet_docs[i].doc.uuid,
							timestamp: wallet_docs[i].doc.timestamp,
						};
					}
				}
			}

			const wallets = [];
			for (let i in docs) { wallets.push(docs[i]); }
			return wallets;
		}
	};

	// format the component migration status response part
	function format_comp_status_docs(comp_docs) {
		const docs = [];
		for (let i in comp_docs) {
			if (comp_docs[i].doc) {
				docs.push({
					id: comp_docs[i].doc._id,
					type: comp_docs[i].doc.type,
					migration_status: comp_docs[i].doc.migration_status || null,
					imported: !(comp_docs[i].doc.location === ev.STR.LOCATION_IBP_SAAS),
				});
			}
		}
		return docs;
	}

	//-------------------------------------------------------------
	// Edit settings doc to clear the migration status
	//-------------------------------------------------------------
	exports.clear_migration_status = (opts, cb) => {
		t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, (err, settings_doc) => {
			if (err || !settings_doc) {
				logger.error('[migration lib] could not get settings doc to clear migration status', err);
				return cb({ statusCode: 500, msg: 'could get settings doc to clear migration status', details: err }, null);
			} else {

				settings_doc.migration_status.ingress_start_ts = null;
				settings_doc.migration_status.ingress_finish_ts = null;
				settings_doc.migration_status.comp_start_ts = null;
				settings_doc.migration_status.comp_finish_ts = null;
				settings_doc.migration_status.console_start_ts = null;
				settings_doc.migration_status.console_finish_ts = null;
				settings_doc.migration_status.db_start_ts = null;
				settings_doc.migration_status.db_finish_ts = null;

				settings_doc.migration_status.migration_complete = false;
				settings_doc.migration_status.error_msg = '';

				if (opts) {
					settings_doc.feature_flags.read_only_enabled = opts.read_only_mode ? true : false;
				}

				// update the settings doc
				t.otcc.writeDoc({ db_name: ev.DB_SYSTEM }, settings_doc, (err_writeDoc, doc) => {
					if (err_writeDoc) {
						logger.error('[migration lib] cannot edit settings doc to clear migration status:', err_writeDoc);
						return cb({ statusCode: 500, msg: 'could not update settings doc to clear migration status', details: err_writeDoc }, null);
					} else {
						t.pillow.reconnect();					// make sure the couchdb stream is working by simply reconnecting now
						return cb(null, settings_doc);
					}
				});
			}
		});
	};

	// edit settings doc to change current step's migration status
	function change_migration_step_status(step_prefix, status, cb) {
		t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, (err, settings_doc) => {
			if (err || !settings_doc) {
				logger.error('[migration lib] could not get settings doc to update ' + step_prefix + ' migration status', err);
				return cb('Console issue - could get settings doc to update ' + step_prefix + ' migration status', null);
			} else {
				const step_field_name_start = step_prefix + '_start_ts';
				const step_field_name_finish = step_prefix + '_finish_ts';

				if (status === ev.STR.STATUS_IN_PROGRESS) {
					settings_doc.migration_status[step_field_name_start] = Date.now();
					settings_doc.migration_status[step_field_name_finish] = null;
					if (step_prefix === 'ingress') {
						settings_doc.migration_status.attempt++;
					}
				} else {
					settings_doc.migration_status[step_field_name_finish] = Date.now();
				}

				// update the settings doc
				t.otcc.writeDoc({ db_name: ev.DB_SYSTEM }, settings_doc, (err_writeDoc, doc) => {
					if (err_writeDoc) {
						logger.error('[migration lib] cannot edit settings doc to update ' + step_prefix + ' migration status:', err_writeDoc);
						return cb(null);
					} else {
						return cb(null, settings_doc.migrated_console_url);
					}
				});
			}
		});
	}

	// returns estimate of how long migration will take in minutes
	function calc_timeout(timeout_setting_minutes, components) {
		const deployed_comps = components ? components.filter(x => {
			return !x.imported;
		}) : [];
		const ingress_mins = 7;									// _min stands for minutes, not minimum....
		const component_base_mins = 0.5;						// _min stands for minutes, not minimum....
		const cost_per_component_mins = 0.5;					// _min stands for minutes, not minimum....
		const console_mins = 5;									// _min stands for minutes, not minimum....
		const db_mins = 0.5;									// _min stands for minutes, not minimum....
		let estimate_mins = Number(Math.ceil((
			ingress_mins + console_mins + db_mins + component_base_mins + (deployed_comps.length * cost_per_component_mins))));
		estimate_mins = Number(Math.ceil(estimate_mins / 5) * 5);	// round up to the closest 5 minutes
		if (estimate_mins > timeout_setting_minutes) {			// return whatever is greater, this lets us take control via a db setting if we need to
			return Number(estimate_mins);
		} else {
			return Number(timeout_setting_minutes);
		}
	}

	//-------------------------------------------------------------
	// Finish Migration - simply records the migration as finished
	//-------------------------------------------------------------
	exports.finish_migration = (cb) => {
		if (!cb) { cb = function () { }; }
		logger.debug('[migration lib] migration is finishing');
		pause_checking();

		t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, (err, settings_doc) => {
			if (err || !settings_doc) {
				logger.error('[migration lib] could not get settings doc to mark migration as done', err);
				return cb({ statusCode: 500, msg: 'could not get settings doc to mark migration as done', details: err }, null);
			} else {

				settings_doc.migration_status.migration_complete = true;
				settings_doc.feature_flags.read_only_enabled = true;

				// update the settings doc
				t.otcc.writeDoc({ db_name: ev.DB_SYSTEM }, settings_doc, (err_writeDoc, doc) => {
					if (err_writeDoc) {
						logger.error('[migration lib] cannot edit settings doc to mark migration as done:', err_writeDoc);
						return cb({ statusCode: 500, msg: 'could not update settings doc to mark migration as done', details: err_writeDoc }, null);
					} else {
						return cb(null, settings_doc);
					}
				});
			}
		});
	};

	//-------------------------------------------------------------
	// Store migration error message
	//-------------------------------------------------------------
	exports.record_error = (msg, cb) => {
		if (!cb) { cb = function () { }; }
		logger.error('[migration lib] recording migration error');
		pause_checking();

		if (typeof msg === 'object') {
			try {
				msg = JSON.stringify(msg);
			} catch (e) {
				// nothing
			}
		}

		t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, (err, settings_doc) => {
			if (err || !settings_doc) {
				logger.error('[migration lib] could not get settings doc to add migration error', err);
				return cb({ statusCode: 500, msg: 'could get settings doc to add migration error', details: err }, null);
			} else {

				settings_doc.migration_status.error_msg = t.misc.safe_str(msg, true);

				// update the settings doc
				t.otcc.writeDoc({ db_name: ev.DB_SYSTEM }, settings_doc, (err_writeDoc, doc) => {
					if (err_writeDoc) {
						logger.error('[migration lib] cannot edit settings doc to add migration error:', err_writeDoc);
						return cb({ statusCode: 500, msg: 'could not update settings doc to add migration error', details: err_writeDoc }, null);
					} else {
						t.lock_lib.release(MIGRATION_LOCK);
						return cb(null, settings_doc);
					}
				});
			}
		});
	};

	//-------------------------------------------------------------
	// Validate every node's fabric version (is it migratable?)
	//-------------------------------------------------------------
	exports.validate_fabric_versions = (req, cb) => {
		req._skip_cache = true;
		req._include_deployment_attributes = true;
		t.component_lib.get_all_runnable_components(req, (err, resp) => {
			if (err) {
				logger.error('[migration lib] error getting all runnable components:', err);
				return cb({ statusCode: 500, errors: err });
			} else {
				const ret = {
					components: [],
					all_valid: true										// default true
				};
				for (let i in resp) {
					const comp = t.comp_fmt.fmt_component_resp(req, resp[i]);
					const node_type_lc = resp[i].type ? resp[i].type.toLowerCase() : '';
					let min_version = node_type_lc ? ev.MIGRATION_MIN_VERSIONS[node_type_lc] : null;
					if (Array.isArray(min_version)) {					// if there are multiple options, find the one that matches this comp's major.minor
						min_version = find_minimum_version(min_version, comp.version);
					}
					comp._migratable = true;							// default true
					comp._imported = true;
					comp._min_version = min_version;

					if (comp.location === ev.STR.LOCATION_IBP_SAAS) {	// if its a saas component, we don't care about imported ones
						comp._imported = false;
						if (!t.misc.is_version_b_greater_than_a(min_version, comp.version, true)) {
							logger.warn('[migration] found node we cannot migrate, version is too old.', t.misc.safe_str(comp.id), 'at:',
								t.misc.safe_str(comp.version), 'needs:', min_version);
							comp._migratable = false;
							ret.all_valid = false;
						}
					}

					ret.components.push(comp);
				}
				return cb(null, t.misc.sortKeys(ret));
			}
		});

		// find the minimum version to use from the array of minimum "streams"
		// such as use "2.4.8" if comp is at 2.4.3
		// or use "2.2.10" if comp is 1.4.3, or 2.2.1, or w/e
		function find_minimum_version(min_versions, comps_version) {
			if (Array.isArray(min_versions)) {
				for (let i in min_versions) {
					let min2test = min_versions[i];
					if (min2test && comps_version) {

						// if it comes in as a number.. convert
						min2test = (typeof min2test === 'number') ? min2test.toString() : min2test;
						comps_version = (typeof comps_version === 'number') ? comps_version.toString() : comps_version;

						// strip of leading V, like v1.4.9
						min2test = (min2test[0].toLowerCase() === 'v') ? min2test.substring(1) : min2test;
						comps_version = (comps_version[0].toLowerCase() === 'v') ? comps_version.substring(1) : comps_version;

						if (get_major(min2test) === get_major(comps_version) && get_minor(min2test) === get_minor(comps_version)) {
							return min2test;					// found the matching stream
						}
					}
				}
				return min_versions[0];						// default to using the first position
			}
		}

		// get the first number off the version, the major digits
		function get_major(version) {
			const parts = (version && typeof version === 'string') ? version.split('.') : [];
			return parts.length > 0 ? Number(parts[0]) : null;
		}

		// get the second number off the version, the minor digits
		function get_minor(version) {
			const parts = (version && typeof version === 'string') ? version.split('.') : [];
			return parts.length > 1 ? Number(parts[1]) : null;
		}
	};

	//-------------------------------------------------------------
	// Validate the cluster's kubernetes version(is it migratable?)
	//-------------------------------------------------------------
	exports.validate_k8s_versions = (req, cb) => {
		req._skip_cache = true;
		t.deployer.get_k8s_version((err, resp) => {
			if (err) {
				logger.error('[migration lib] error getting kubernetes version:', err);
				return cb({ statusCode: 500, errors: err });
			} else {
				let at_k8s_version = resp ? resp._version : '';
				logger.debug('[migration lib] received kubernetes version:', at_k8s_version);

				logger.debug('[migration lib] INFRASTRUCTURE:', ev.INFRASTRUCTURE);
				if (ev.INFRASTRUCTURE === ev.STR.INFRA_OPENSHIFT) {
					at_k8s_version = getOpenShiftVersionFromK8s(at_k8s_version);
					logger.debug('[migration lib] detected openshift env, on version:', at_k8s_version);
				}

				const min_k8s_version = (ev.INFRASTRUCTURE === ev.STR.INFRA_OPENSHIFT) ?
					ev.MIGRATION_MIN_VERSIONS.openshift : ev.MIGRATION_MIN_VERSIONS.kubernetes;

				const ret = {
					k8s: {
						migratable: t.misc.is_version_b_greater_than_a(min_k8s_version, at_k8s_version, true),
						version: at_k8s_version,
						min_version: min_k8s_version.toString(),
					}
				};
				return cb(null, t.misc.sortKeys(ret));
			}
		});

		// attempt to build a redhat openshift version from the kubernetes version (this isn't great, but should work short term)
		function getOpenShiftVersionFromK8s(k8s_version) {
			if (typeof k8s_version === 'number') {
				k8s_version = k8s_version.toString();
			}
			if (typeof k8s_version === 'string') {
				const parts = k8s_version.split('.');
				if (parts && parts[1]) {
					const minor = Number(parts[1]);
					const offset = 13;	// subtract 13 from the k8s minor version number to get to a redhat number, this works so far!
					return 'v4.' + (minor - offset);
				}
			}
			return 'v4.x';
		}
	};

	//-------------------------------------------------------------
	// Check on migration status
	//-------------------------------------------------------------
	exports.check_migration_status = (pillow_doc, cb) => {
		if (!cb) { cb = function () { }; }
		logger.info('[migration watchdog] - monitoring migration status - looking for updates');

		// 1. first get the component docs
		const opts = {
			db_name: ev.DB_COMPONENTS,		// db for peers/cas/orderers/msps/etc docs
			_id: '_design/athena-v1',		// name of design doc
			view: '_doc_types',
			SKIP_CACHE: true,
			query: t.misc.formatObjAsQueryParams({ include_docs: true, keys: [ev.STR.CA, ev.STR.ORDERER, ev.STR.PEER] }),
		};
		t.otcc.getDesignDocView(opts, (err, resp) => {
			const components = format_comp_status_docs(resp ? resp.rows : []);

			// 2. next get  the settings doc
			t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, (err, settings_doc) => {
				if (err || !settings_doc) {
					logger.error('[migration watchdog] could not get settings doc to check migration status', err);
					return cb({ statusCode: 500, msg: 'could get settings doc to clear migration status', details: err }, null);
				} else {
					const timeout_minutes = calc_timeout(settings_doc.migration_status.timeout_min, components);
					const elapsed_ms = Date.now() - settings_doc.migration_status.ingress_start_ts;
					const timeout_ms = timeout_minutes * 60 * 1000;
					logger.debug('[migration watchdog] elapsed time:', t.misc.friendly_ms(elapsed_ms) + '. timeout after:', t.misc.friendly_ms(timeout_ms));

					// if its been too long, kill the migration monitor interval
					if (elapsed_ms >= timeout_ms) {
						logger.error('[migration watchdog] timeout exceeded, migration has failed');

						const msg = {
							message_type: 'monitor_migration_stop',
							message: 'migration timeout exceeded',
						};
						t.pillow.broadcast(msg);
						return cb(null);
					} else {
						const subtype = pillow_doc ? pillow_doc.sub_type : '-';
						logger.debug('[migration watchdog] migration is still progressing... checking step', subtype);

						if (subtype === 'ingress') {
							exports.check_ingress(pillow_doc);
						} else if (subtype === 'comps') {
							exports.check_components(pillow_doc);
						} else if (subtype === 'console') {
							exports.check_console(pillow_doc);
						}
						return cb(null);
					}
				}
			});
		});
	};

	//-------------------------------------------------------------
	// Set the migration_enabled feature flag in the settings doc
	//-------------------------------------------------------------
	exports.set_migration_feature_flag = (value, cb) => {
		t.couch_lib.getDoc({ db_name: ev.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, function (err, doc) {
			if (err) {
				logger.error('[migration lib] an error occurred obtaining the "' + process.env.SETTINGS_DOC_ID + '" db:', ev.DB_SYSTEM, err, doc);
				return cb({ statusCode: 500, err: err }, doc);
			} else {
				if (!doc) {
					return cb({ statusCode: 500, err: 'settings doc is missing' }, doc);	// this should be impossible
				}
				if (!doc.feature_flags) {
					doc.feature_flags = {};
				}
				doc.feature_flags.migration_enabled = value;

				t.otcc.writeDoc({ db_name: ev.DB_SYSTEM }, doc, (err_writeDoc, doc) => {
					if (err_writeDoc) {
						logger.error('[migration lib] cannot edit settings doc to edit migration_enabled:', err_writeDoc);
						return cb({ statusCode: 500, msg: 'could not update settings doc to edit migration_enabled', details: err_writeDoc }, null);
					} else {
						const ret = JSON.parse(JSON.stringify(ev.API_SUCCESS_RESPONSE));
						ret.migration_enabled = value;
						return cb(null, ret);
					}
				});
			}
		});
	};

	//-------------------------------------------------------------
	// Set the "migrated_console_url" setting in the settings doc
	//-------------------------------------------------------------
	function store_console_url(value, cb) {
		t.couch_lib.getDoc({ db_name: ev.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, function (err, doc) {
			if (err) {
				logger.error('[migration lib] an error occurred obtaining the "' + process.env.SETTINGS_DOC_ID + '" db:', ev.DB_SYSTEM, err, doc);
				return cb({ statusCode: 500, err: err }, doc);
			} else {
				if (!doc) {
					return cb({ statusCode: 500, err: 'settings doc is missing' }, doc);	// this should be impossible
				}

				// format/validate the new console url
				const parts = t.misc.break_up_url(value);
				if (parts && parts.hostname) {
					let new_console_url = parts.protocol + '//' + parts.hostname;
					if (Number(parts.port) !== 443 && Number(parts.port) !== 80) {		// if a non-standard port is used add it, else don't add the port
						new_console_url += ':' + parts.port;
					}
					value = new_console_url;
				}

				doc.migrated_console_url = value;
				ev.MIGRATED_CONSOLE_URL = value;

				t.otcc.writeDoc({ db_name: ev.DB_SYSTEM }, doc, (err_writeDoc, doc) => {
					if (err_writeDoc) {
						logger.error('[migration lib] cannot edit settings doc to store new console url:', err_writeDoc);
						return cb({ statusCode: 500, msg: 'could not update settings doc to store new console url', details: err_writeDoc }, null);
					} else {
						return cb(null);
					}
				});
			}
		});
	}

	// pause the checking interval after one step completes and before the next step starts
	function pause_checking() {
		const msg = {
			message_type: 'monitor_migration_stop',
			message: 'migration step completed',
		};
		t.pillow.broadcast(msg);
	}

	// -----------------------------------------------------
	// Migration Step 1. Migrate ingress (this is a jupiter call)
	// -----------------------------------------------------
	exports.migrate_ingress = (req, cb) => {
		// 1. get lock
		const l_opts = {
			lock: MIGRATION_LOCK,
			max_locked_sec: 4 * 60,
			force: true,
		};
		t.lock_lib.apply(l_opts, (lock_err) => {
			if (lock_err) {
				logger.error('[migration-ingress] did not get migration lock for ingress', lock_err);
				return cb('Console issue - unable to own lock to start migration', null);
			} else {

				// 2. reset/clear the migration status
				exports.clear_migration_status({ read_only_mode: true }, () => {

					// 3. mark the component migration as in progress
					change_migration_step_status('ingress', ev.STR.STATUS_IN_PROGRESS, (err) => {
						if (err) {
							return cb(err);											// error already logged
						} else {

							// 4 check if we have already migrated the ingress from a prev attempt
							t.jupiter_lib.request(CHECK_INGRESS_API_OPTS, (ret) => {
								if (!ret || t.ot_misc.is_error_code(t.ot_misc.get_code(ret))) {
									logger.debug('[migration-ingress-check] - not migrated yet');

									// 5. send ingress migration call to jupiter
									migrate_ingress_api((error, response) => {
										return cb(error, response);
									});
								} else {
									logger.info('[migration-ingress-check] - good response, ingress already migrated. skipping ingress step.');

									// 5. skip ingress migration call to jupiter, jump to monitor step which will instantly validate
									monitor_ingress_migration(true);
									return cb(null, { message: 'ingress already migrated' });
								}
							});
						}
					});
				});
			}
		});

		// call the migrate ingress api on jupiter
		function migrate_ingress_api(cb_in) {
			logger.info('[migration-ingress] sending ingress migration request');
			const opts = {
				method: 'POST',
				path: '/api/v1/$iid/$account/ingress',			// $iid & $account get replaced later
				headers: {
					'x-iam-token': req.headers['x-iam-token'],
					'x-refresh-token': req.headers['x-refresh-token'],
				}
			};
			t.jupiter_lib.request(opts, (ret) => {
				if (!ret) {
					logger.error('[jupiter-ingress] communication error, no response');
					return cb_in('Communication error, no response to the migrate ingress api');
				} else if (t.ot_misc.is_error_code(t.ot_misc.get_code(ret))) {
					logger.error('[jupiter-ingress] - error response code from jupiter', ret);
					const msg = t.jupiter_lib.make_jupiter_msg(ret);
					return cb_in('Internal issue - received an error code in response to the ingress api: ' + t.ot_misc.get_code(ret) + msg);
				} else {
					monitor_ingress_migration();
					return cb_in(null, ret.response);
				}
			});
		}

		// use pillow talk to start polling on the ingress migration status
		function monitor_ingress_migration(quick) {
			const msg = {
				message_type: 'monitor_migration',
				sub_type: 'ingress',
				message: 'ingress migration has begun',
				quick: quick ? true : false,
				login_username: req.body.login_username,
				login_password: t.misc.encrypt(req.body.login_password, ev.MIGRATION_API_KEY),
			};
			t.pillow.broadcast(msg);			// send signal to console to start looking for migration status updates
		}
	};

	// -----------------------------------------------------
	// Migration Step 1.1 Check on ingress migration (this is a jupiter call)
	// -----------------------------------------------------
	exports.check_ingress = (pillow_doc, cb) => {
		if (!cb) { cb = function () { }; }
		t.jupiter_lib.request(CHECK_INGRESS_API_OPTS, (ret) => {
			if (!ret) {
				logger.error('[jupiter-ingress-check] - communication error, no response');
				return cb('Communication error, no response to the check ingress api');
			} else if (t.ot_misc.is_error_code(t.ot_misc.get_code(ret))) {
				logger.warn('[jupiter-ingress-check] - error response code from jupiter. will try again.', ret);
				return cb(null);					// don't pass an error, it simply might not be up yet
			} else {
				logger.info('[jupiter-ingress-check] - good response, ingress migrated');
				pause_checking();

				// -------------------------------------------------------------------------
				// success - move on to step 2
				// -------------------------------------------------------------------------

				// mark the ingress migration as done
				change_migration_step_status('ingress', ev.STR.STATUS_DONE, (err) => {
					if (err) {
						return cb(err);											// error already logged
					} else {

						// release old lock
						t.lock_lib.release(MIGRATION_LOCK, (lock_err) => {
							exports.migrate_components(pillow_doc, (err2, ret) => {
								if (err2) {
									exports.record_error(err2, () => {
										return cb(err2, ret);
									});
								} else {
									return cb(err2, ret);
								}
							});
						});
					}
				});
			}
		});
	};

	// -----------------------------------------------------
	// Migration Step 2. Migrate components (this is a jupiter call)
	// -----------------------------------------------------
	exports.migrate_components = (pillow_doc, cb) => {
		// 1. get lock
		const l_opts = {
			lock: MIGRATION_LOCK,
			max_locked_sec: 2 * 60,
		};
		t.lock_lib.apply(l_opts, (lock_err) => {
			if (lock_err) {
				logger.warn('[migration-node-check] did not get migration lock for component step, the other instances must have it');
				return;								// if we didn't get the lock, don't call cb, just return
			} else {

				// 2. mark the component migration as in progress
				change_migration_step_status('comp', ev.STR.STATUS_IN_PROGRESS, (err) => {
					if (err) {
						return cb(err);										// error already logged
					} else {

						// 3. check if we have already migrated the nodes from a prev attempt
						t.jupiter_lib.request(CHECK_NODE_API_OPTS, (ret) => {
							if (!ret || t.ot_misc.is_error_code(t.ot_misc.get_code(ret))) {
								logger.debug('[migration-node-check] - not migrated yet');

								// 4. send nodes migration call to jupiter
								migrate_nodes_api((error, response) => {
									return cb(error, response);
								});
							} else {
								logger.info('[migration-node-check] - good response, nodes already migrated. skipping node step.');

								// 4. skip nodes migration call to jupiter, jump to monitor step which will instantly validate
								monitor_nodes_migration(true);
								return cb(null, { message: 'nodes already migrated' });
							}
						});
					}
				});
			}
		});

		// call the migrate nodes api on jupiter
		function migrate_nodes_api(cb_nodes) {
			logger.info('[migration-nodes] sending component migration request');
			const opts = {
				method: 'POST',
				path: '/api/v1/$iid/migrate/all',				// $iid gets replaced later
			};
			t.jupiter_lib.request(opts, (ret) => {
				if (!ret) {
					logger.error('[jupiter-nodes] communication error, no response');
					return cb_nodes('Communication error, no response to the migrate all nodes api');
				} else if (t.ot_misc.is_error_code(t.ot_misc.get_code(ret))) {
					logger.error('[jupiter-nodes] - error response code from jupiter', ret);
					const msg = t.jupiter_lib.make_jupiter_msg(ret);
					return cb_nodes('Internal issue - received an error code in response to the all components api: ' + t.ot_misc.get_code(ret) + msg);
				} else {
					monitor_nodes_migration();
					return cb_nodes(null, ret.response);
				}
			});
		}

		// use pillow talk to start polling on the ingress migration status
		function monitor_nodes_migration(quick) {
			const msg = {
				message_type: 'monitor_migration',
				sub_type: 'comps',
				message: 'node migration has begun',
				quick: quick ? true : false,
				login_username: pillow_doc.login_username,
				login_password: pillow_doc.login_password,
			};
			t.pillow.broadcast(msg);			// send signal to console to start looking for migration status updates
		}
	};

	// -----------------------------------------------------
	// Migration Step 2.1 Check on node migration (this is a jupiter call)
	// -----------------------------------------------------
	exports.check_components = (pillow_doc, cb) => {
		if (!cb) { cb = function () { }; }
		t.jupiter_lib.request(CHECK_NODE_API_OPTS, (ret) => {
			if (!ret) {
				logger.error('[jupiter-node-check] - communication error, no response');
				return cb('Communication error, no response to the check nodes api');
			} else if (t.ot_misc.is_error_code(t.ot_misc.get_code(ret))) {
				logger.warn('[jupiter-node-check] - error response code from jupiter. will try again.', ret);
				return cb(null);					// don't pass an error, it simply might not be up yet
			} else {
				logger.info('[jupiter-node-check] - good response, all nodes are migrated');
				pause_checking();

				// -------------------------------------------------------------------------
				// success - move on to step 3
				// -------------------------------------------------------------------------

				// mark the ingress migration as done
				change_migration_step_status('comp', ev.STR.STATUS_DONE, (err) => {
					if (err) {
						return cb(err);											// error already logged
					} else {

						// release old lock
						t.lock_lib.release(MIGRATION_LOCK, (lock_err) => {
							exports.deploy_console(pillow_doc, (err2, ret) => {
								if (err2) {
									exports.record_error(err2, () => {
										return cb(err2, ret);
									});
								} else {
									return cb(err2, ret);
								}
							});
						});
					}
				});
			}
		});
	};

	// -----------------------------------------------------
	// Migration Step 3. Deploy the new console (this is a jupiter call)
	// -----------------------------------------------------
	exports.deploy_console = (pillow_doc, cb) => {
		// 1. get lock
		const l_opts = {
			lock: MIGRATION_LOCK,
			max_locked_sec: 3 * 60,
		};
		t.lock_lib.apply(l_opts, (lock_err) => {
			if (lock_err) {
				logger.warn('[migration-console] did not get migration lock for console step, the other instances must have it');
				return;								// if we didn't get the lock, don't call cb, just return
			} else {

				// 2. mark the console migration as in progress
				change_migration_step_status('console', ev.STR.STATUS_IN_PROGRESS, (err) => {
					if (err) {
						return cb(err);											// error already logged
					} else {

						// 3. send console migration call to jupiter
						logger.info('[migration-console] sending console migration request');
						const opts = {
							method: 'POST',
							path: '/api/v1/$iid/console',						// $iid gets replaced later
							body: {
								migration_api_key: ev.MIGRATION_API_KEY,		// this is the key to use on the new console
								login_username: pillow_doc.login_username,
								login_password: t.misc.decrypt(pillow_doc.login_password, ev.MIGRATION_API_KEY),
							}
						};
						t.jupiter_lib.request(opts, (ret) => {
							if (!ret) {
								logger.error('[jupiter-console] communication error, no response');
								return cb('Communication error, no response to the deploy console api');
							} else if (t.ot_misc.is_error_code(t.ot_misc.get_code(ret))) {
								logger.error('[jupiter-console] - error response code from jupiter', ret);
								const msg = t.jupiter_lib.make_jupiter_msg(ret);
								return cb('Internal issue - received an error code in response to the deploy console api: ' + t.ot_misc.get_code(ret) + msg);
							} else if (!ret || !ret.response || !ret.response.url) {
								logger.error('[jupiter-console] - missing new console url from jupiter response', ret);
								return cb('Internal issue - the new console url is missing from the deploy console api response.');
							} else {
								logger.info('[jupiter-console] rec url of new console', ret.response.url);
								store_console_url(ret.response.url, () => {
									// delay console polling b/c if there was an old console (from a prev migration attempt), it needs to be
									// deleted before we poll on the next (new) console
									setTimeout(() => {
										const msg = {
											message_type: 'monitor_migration',
											sub_type: 'console',
											message: 'console migration has begun',
											login_username: pillow_doc.login_username,
											login_password: pillow_doc.login_password,
										};
										t.pillow.broadcast(msg);			// send signal to console to start looking for migration status updates
									}, 1000 * 15);
									return cb(null, ret.response);
								});
							}
						});
					}
				});
			}
		});
	};

	// -----------------------------------------------------
	// Migration Step 3.1 Check on the new console
	// -----------------------------------------------------
	exports.check_console = (pillow_doc, cb) => {
		if (!cb) { cb = function () { }; }
		const opts = {
			baseUrl: t.misc.format_url(ev.MIGRATED_CONSOLE_URL),
			method: 'GET',
			uri: '/api/v3/settings',
		};
		t.request(opts, (err, resp) => {
			let response = resp ? resp.body : null;
			let code = t.ot_misc.get_code(resp);

			if (err || !resp) {
				logger.warn('[migration-console-check] - communication error, no response. will try again. err:', err);
				return cb('Communication error, no response to the check on new console api');
			} else if (t.ot_misc.is_error_code(code)) {
				logger.warn('[migration-console-check] - error response code from other console. will try again.', response);
				return cb(null);					// don't pass an error, it simply might not be up yet
			} else {
				logger.info('[migration-console-check] - good response, new console is up');
				pause_checking();

				// -------------------------------------------------------------------------
				// success - move on to step 4
				// -------------------------------------------------------------------------

				// mark the console migration as done
				change_migration_step_status('console', ev.STR.STATUS_DONE, (err) => {
					if (err) {
						return cb(err);											// error already logged
					} else {

						// release old lock
						t.lock_lib.release(MIGRATION_LOCK, (lock_err) => {
							exports.migrate_dbs(pillow_doc, (err2, ret) => {
								if (err2) {
									exports.record_error(err2, () => {
										return cb(err2, ret);
									});
								} else {
									exports.finish_migration(() => {
										logger.info('[migration lib] migration is finished');
										return cb(null, response);
									});
								}
							});
						});
					}
				});
			}
		});
	};

	//-------------------------------------------------------------
	// Migration Steps 4 & 4.1 Migrate our databases
	//-------------------------------------------------------------
	exports.migrate_dbs = (pillow_doc, cb) => {
		migrate_dbs_inner(pillow_doc, (error, response) => {
			if (error) {
				logger.error('[migration-console-db] db migration failed, look up for details.');
				return cb(error, response);
			} else {
				change_migration_step_status('db', ev.STR.STATUS_DONE, (err) => {		// if success, mark migration as complete
					logger.info('[migration-console-db] marked db migration as successful');
					return cb(null);
				});
			}
		});
	};

	// -----------------------------------------------------
	// the actual db migration work gets done here
	// -----------------------------------------------------
	function migrate_dbs_inner(pillow_doc, cb) {
		// 1. get lock
		const l_opts = {
			lock: MIGRATION_LOCK,
			max_locked_sec: 1 * 60,
		};
		t.lock_lib.apply(l_opts, (lock_err) => {
			if (lock_err) {
				logger.warn('[migration-console-db] did not get migration lock for db step, the other instances must have it');
				return;								// if we didn't get the lock, don't call cb, just return
			} else {
				pause_checking();

				// 2. mark the database migration as in progress
				change_migration_step_status('db', ev.STR.STATUS_IN_PROGRESS, (err) => {
					const new_console_url = ev.MIGRATED_CONSOLE_URL;
					if (err) {
						// error already logged
						return cb('DB issue - unable to mark the migration db step as in progress. see server logs.');
					} else if (!new_console_url || !t.misc.format_url(new_console_url)) {
						logger.error('[migration-console-db] the new console url is not defined in settings doc, cannot migrate', new_console_url);
						return cb('Internal issue - the new console url is not defined, cannot migrate data');
					} else {

						// 3. call backup api
						t.dbs.athena_backup({}, (back_err, back_resp) => {
							if (back_err) {
								logger.error('[migration-console-db] error with backup before db migration', back_err);
								return cb('Console issue - unable to backup database prior to db migration');
							} else if (!back_resp || !back_resp.id) {
								logger.error('[migration-console-db] error with backup response for db migration. no id', back_resp);
								return cb('Console issue - unexpected backup format, cannot migrate console data');
							} else {

								// 4. wait for backup api to be done
								wait_for_backup(back_resp.id, (stalled_err, backup) => {
									if (stalled_err) {
										// error already logged
										return cb(stalled_err);
									} else {

										// edit the settings doc in the backup so the migrated console has the correct settings for IBP support
										const password = t.misc.decrypt(pillow_doc.login_password, ev.MIGRATION_API_KEY);
										backup = edit_settings_doc_in_backup(pillow_doc.login_username, password, new_console_url, backup);

										// edit component docs
										backup = edit_component_docs_in_backup(new_console_url, backup);

										// 5. call restore api on other console
										//return cb(null, null);
										send_restore(new_console_url, backup, (restore_err, rest_resp) => {
											if (restore_err) {
												logger.error('[migration-console-db] unable to send restore-database api for db migration', restore_err);
												const msg = t.jupiter_lib.make_jupiter_msg(restore_err);
												return cb('Console issue - error response when trying to copy data to the new consol: ' +
													t.ot_misc.get_code(restore_err) + msg);
											} else {

												// 6. wait for restore api to be done
												wait_for_restore(rest_resp.url, (stalled_err2) => {
													if (stalled_err2) {
														// error already logged
														return cb('Console issue - timed out waiting for console data to migrate');
													} else {

														// 7. all done!
														logger.debug('[migration-console-db] database migration via restore completed');
														return cb(null, rest_resp);
													}
												});
											}
										});
									}
								});
							}
						});
					}
				});
			}
		});

		//--------------------------------------------------
		// wait for the backup to complete
		//--------------------------------------------------
		function wait_for_backup(backup_id, cb) {
			const interval_ms = 5 * 1000;				// it wants ms
			const desired_max_ms = 5 * 60 * 1000;
			const started = Date.now();
			const attempts = Math.ceil(desired_max_ms / interval_ms);

			logger.debug('[migration-console-db] starting polling to wait for backup to complete... max attempts:', attempts);
			let on_attempt = 0;
			const CONTINUE_STR = 'backup in progress';

			// delay retry a bit for initial backup doc to be created
			setTimeout(() => {
				t.async.retry({
					times: attempts,
					interval: interval_ms,				// it wants ms
					errorFilter: (error) => {
						if (error === CONTINUE_STR) {
							return true;
						} else {
							return false;				// return false to stop retry, like on an error
						}
					}
				}, (done) => {
					const log_attempts = 'on attempt: ' + (++on_attempt) + '/' + attempts;

					t.dbs.get_backup(backup_id, (get_err, resp) => {
						if (get_err || !resp) {
							logger.error('[migration-console-db] - backup response is unexpected: ', get_err, 'resp:', resp);
							return done(CONTINUE_STR);
						} else if (resp.error) {
							logger.error('[migration-console-db] - backup doc has error set');
							return done('Console issue - backup error - ' + resp.error);
						} else if (resp.in_progress) {
							logger.debug('[migration-console-db] - backup has not completed yet...', log_attempts);
							return done(CONTINUE_STR);
						} else {
							logger.info('[migration-console-db] - backup has completed, can migrate dbs now', log_attempts);
							return done(null, resp);
						}
					});
				}, (err, backup_doc) => {
					if (err) {
						const elapsed = Date.now() - started;
						const log_attempts = 'attempt: ' + on_attempt + '/' + attempts;
						if (err === CONTINUE_STR) {
							logger.warn('[migration-console-db] - could not backup dbs prior to migration. giving up after',
								t.misc.friendly_ms(elapsed), log_attempts);
							err = 'Console issue - timed out waiting for backup to complete, cannot migrate console data';
						}
					}
					return cb(err, backup_doc);
				});
			}, 5 * 1000);
		}

		// build the basic auth for the console db migration apis
		function build_migration_auth() {
			return 'Basic ' + t.misc.b64('migration_api_key' + ':' + ev.MIGRATION_API_KEY);
		}

		//--------------------------------------------------
		// wait for the restore to complete
		//--------------------------------------------------
		function wait_for_restore(webhook_url, cb) {
			const interval_ms = 5 * 1000;				// it wants ms
			const desired_max_ms = 5 * 60 * 1000;
			const started = Date.now();
			const attempts = Math.ceil(desired_max_ms / interval_ms);

			logger.debug('[migration-console-db] starting polling to wait for restore to complete... max attempts:', attempts);
			let on_attempt = 0;

			// delay retry a bit for initial webhook doc to be created
			setTimeout(() => {
				t.async.retry({
					times: attempts,
					interval: interval_ms,				// it wants ms
				}, (done) => {
					const log_attempts = 'on attempt: ' + (++on_attempt) + '/' + attempts;

					const web_opts = {
						_name: 'migration-restore',
						_max_attempts: 1,
						method: 'GET',
						baseUrl: null,
						url: webhook_url,
						headers: {
							'Content-Type': 'application/json',
							'Authorization': build_migration_auth(),
						}
					};
					t.misc.retry_req(web_opts, (web_err, web_resp) => {
						const code = t.ot_misc.get_code(web_resp);
						if (t.ot_misc.is_error_code(code)) {
							logger.error('[migration-console-db] - restore api could not be completed');
							return done('restore error');
						} else {
							web_resp = t.ot_misc.formatResponse(web_resp);
							if (web_err || !web_resp) {
								logger.error('[migration-console-db] - restore response is unexpected: ', web_err, 'resp:', web_resp);
								return done('restore error');
							} else if (web_resp.status === 'pending') {
								logger.debug('[migration-console-db] - restore has not completed yet...', log_attempts);
								return done('restore in progress');
							} else {
								logger.info('[migration-console-db] - restore has completed, migration nearly complete', log_attempts, 'code:', code);
								return done(null, web_resp);
							}
						}
					});
				}, (err, web_resp) => {
					if (err) {
						const elapsed = Date.now() - started;
						const log_attempts = 'attempt: ' + on_attempt + '/' + attempts;
						logger.warn('[migration-console-db] - could not restore dbs during migration. giving up after',
							t.misc.friendly_ms(elapsed), log_attempts);
					}
					return cb(err, web_resp);
				});
			}, 5 * 1000);
		}

		//--------------------------------------------------
		// call restore api on the other console
		//--------------------------------------------------
		function send_restore(new_console_url, backup, cb) {
			const res_opts = {
				_name: 'migration-restore',
				_max_attempts: 1,
				method: 'PUT',
				baseUrl: null,
				url: t.misc.format_url(new_console_url) + '/ak/api/v3/backups',
				body: JSON.stringify(backup),
				headers: {
					'Content-Type': 'application/json',
					'Authorization': build_migration_auth(),
				}
			};
			t.misc.retry_req(res_opts, (restore_err, rest_resp) => {
				if (t.ot_misc.is_error_code(t.ot_misc.get_code(rest_resp))) {
					return cb(t.ot_misc.formatResponse(rest_resp), null);
				} else {
					logger.debug('[migration-console-db] restore api accepted, code', t.ot_misc.get_code(rest_resp));
					return cb(null, t.ot_misc.formatResponse(rest_resp));
				}
			});
		}
	}

	// edit docs in the backup prior to migrating them
	function edit_settings_doc_in_backup(username, password, new_console_url, backup) {
		if (backup && backup.dbs && backup.dbs['DB_SYSTEM']) {
			if (backup.dbs['DB_SYSTEM'].docs) {
				for (let i in backup.dbs['DB_SYSTEM'].docs) {
					const doc = backup.dbs['DB_SYSTEM'].docs[i];

					// edit the settings doc
					if (doc._id === process.env.SETTINGS_DOC_ID) {
						logger.info('[migration-console-db] found settings doc. editing...');
						doc.auth_scheme = 'couchdb';				// change the auth scheme, this console will use local users
						doc.allow_default_password = true;			// less painful ux
						doc.access_list = {};						// clear
						doc.crn_string = '-';						// clear
						doc.crn = { instance_id: '' };				// clear
						doc.support_key = null;						// clear
						doc.support_password = null;				// clear
						doc.jupiter_url = null;						// clear
						doc.default_user_password = null;			// clear
						doc.host_url = new_console_url;
						doc.iam_api_key = null;						// clear
						doc.migrated_console_url = null;			// clear
						doc.segment_write_key = null;				// clear

						if (doc.feature_flags) {
							doc.feature_flags.migration_enabled = false;
							doc.feature_flags.read_only_enabled = false;
							doc.feature_flags.mustgather_enabled = true;
							doc.feature_flags.osnadmin_feats_enabled = true;
						}

						// create the user login for the new console
						const secret_details = t.misc.salt_secret(password);
						doc.access_list[username] = {
							created: Date.now(),
							roles: Object.keys(ev.ROLES_TO_ACTIONS),
							uuid: t.uuidv4(),
							salt: secret_details.salt,
							hashed_secret: secret_details.hashed_secret,
							ts_changed_password: Date.now(),
						};

						// some fields we want to reset to the default settings file.
						// we don't want to copy the saas settings to the migrated console.
						let defaults = null;
						const settings_path = t.path.join(__dirname, '../json_docs/default_settings_doc.json');
						try {
							defaults = JSON.parse(t.fs.readFileSync(settings_path, 'utf8'));
						} catch (e) {
							logger.error('[migration-console-db] unable to read', settings_path, e);
						}
						if (defaults) {
							const overwrite_fields = [
								'activity_tracker_filename', 'db_custom_names', 'db_defaults', 'default_user_password_initial',
								'dynamic_tls', 'ibmid', 'migration_status', 'infrastructure', 'max_components',
								'max_req_per_min', 'max_req_per_min_ak', 'the_default_resources_map'
							];
							for (let i in overwrite_fields) {
								let field = overwrite_fields[i];
								doc[field] = defaults[field];
							}
						}

						logger.silly('built settings "db_custom_names":', JSON.stringify(doc.db_custom_names, null, 2));
						logger.silly('built settings "db_defaults":', JSON.stringify(doc.db_defaults, null, 2));
						break;
					}
				}
			}
		}
		return backup;
	}

	// edit component docs in the backup prior to migrating them
	function edit_component_docs_in_backup(new_console_url, backup) {
		if (backup && backup.dbs && backup.dbs['DB_COMPONENTS']) {
			if (backup.dbs['DB_COMPONENTS'].docs) {
				for (let i in backup.dbs['DB_COMPONENTS'].docs) {
					const doc = backup.dbs['DB_COMPONENTS'].docs[i];

					// edit a MSP doc
					if (doc.type === ev.STR.MSP) {
						logger.info('[migration-console-db] found a msp doc. editing url.', doc._id);
						doc.host_url = new_console_url;
					}

					// edit a signature collection doc
					if (doc.type === ev.STR.SIG_COLLECTION) {
						logger.info('[migration-console-db] found a signature collection doc. editing urls.');
						for (let x in doc.orgs2sign) {
							doc.orgs2sign[x].optools_url = new_console_url;
						}
					}

					// edit a component doc
					const nodes = [ev.STR.MSP, ev.STR.MSP_EXTERNAL, ev.STR.CA, ev.STR.ORDERER, ev.STR.PEER];
					if (nodes.includes(doc.type)) {
						logger.info('[migration-console-db] found a component doc. adding migration flag.', doc._id);
						doc.migrated_from = ev.STR.LOCATION_IBP_SAAS;
					}
				}
			}
		}
		return backup;
	}

	return exports;
};
