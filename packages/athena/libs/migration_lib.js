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
	// dsh todo set migration_status.migration_complete field in settings doc when done

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
						logger.error('[migration lib] an error occurred obtaining the "' + process.env.SETTINGS_DOC_ID + '" db:', ev.DB_SYSTEM, err, athena);
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
						logger.error('[migration lib] unable to load wallet export records:', err_getDoc, resp);
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
						logger.error('[migration lib] error getting all deployed components:', err);
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
				ret.migration_status = ev.STR.STATUS_TIMEOUT;
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
			const deployed_comps = (ret && ret.components) ? ret.components.filter(x => {
				return !x.imported;
			}) : [];
			const ingress_mins = 10;
			const component_base_mins = 2;
			const cost_per_component_sec = 45;
			const console_mins = 1.5;
			ret.estimate_mins = Number(Math.ceil((ingress_mins + console_mins + component_base_mins + (deployed_comps.length * cost_per_component_sec) / 60)));
			ret.estimate_mins = Number(Math.ceil(ret.estimate_mins / 5) * 5);

			return cb(null, ret);
		});


		// format the wallet migration status response part
		function format_wallet_status_docs(wallet_docs) {
			const docs = [];
			for (let i in wallet_docs) {
				if (wallet_docs[i].doc) {
					docs.push({
						email: wallet_docs[i].doc.email,
						uuid: wallet_docs[i].doc.uuid,
						timestamp: wallet_docs[i].doc.timestamp,
					});
				}
			}
			return docs;
		}

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
	};

	// -----------------------------------------------------
	// Migrate components (this is a jupiter call)
	// -----------------------------------------------------
	exports.migrate_components = (req, cb) => {
		// 1. get lock
		const l_opts = {
			lock: 'migration',
			max_locked_sec: 5 * 60, 		// dsh todo calc decent value for lock
		};
		t.lock_lib.apply(l_opts, (lock_err) => {
			if (lock_err) {
				logger.error('[migration lib] did not get migration lock, try again later');
				return cb({ statusCode: 400, msg: 'unable to get migration lock', details: lock_err }, null);
			} else {

				// 2. reset/clear the migration status
				clear_migration_status(() => {

					// 3. mark the component migration as in progress
					change_comp_migration_status(ev.STR.STATUS_IN_PROGRESS, (err, new_console_url) => {
						if (err) {
							return cb(err);											// error already logged
						} else {

							// 4. send migration call to jupiter
							req.path2use = '/api/v1/$iid/migrate/all';				// $iid replaced later
							req.body.migration_api_key = ev.MIGRATED_API_KEY;		// this is the key to use on the new console
							t.proxy_lib.jupiter_proxy_call(req, (ret) => {
								if (!ret) {
									logger.error('[jupiter] - comm error in response', err);
									return cb({ statusCode: 500, response: 'empty' });
								} else if (t.ot_misc.is_error_code(ret.statusCode)) {
									logger.error('[jupiter] - error response code from jupiter', ret.statusCode);
									return cb(ret);
								} else {
									let json = null;
									try {
										json = JSON.parse(ret.response);
									} catch (e) {

									}

									const msg = {
										message_type: 'monitor_migration',
										message: 'migration has begun',
									};
									t.pillow.broadcast(msg);			// send signal to console to start looking for migration status updates

									return cb(null, json);
								}
							});
						}
					});
				});
			}
		});
	};


	//-------------------------------------------------------------
	// Migrate our databases
	//-------------------------------------------------------------
	exports.migrate_dbs = (req, cb) => {
		migrate_dbs_inner(req, (error, response) => {
			if (error) {
				change_db_migration_status(null, (err) => {						// if error, reset migration status
					logger.error('[migration lib] db migration failed, look up for details.');
					return cb(error, response);
				});
			} else {
				change_db_migration_status(ev.STR.STATUS_DONE, (err) => {		// if success, mark migration as complete
					logger.info('[migration lib] db migration was successful');
					return cb(error, response);
				});
			}
		});
	};

	// edit settings doc to clear the migration status
	function clear_migration_status(cb) {
		t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, (err, settings_doc) => {
			if (err || !settings_doc) {
				logger.error('[migration lib] could not get settings doc to clear migration status', err);
				return cb({ statusCode: 500, msg: 'could get settings doc to clear migration status', details: err }, null);
			} else {

				settings_doc.migration_status.ingress_start_ts = Date.now();
				settings_doc.migration_status.ingress_finish_ts = null;
				settings_doc.migration_status.comp_start_ts = null;
				settings_doc.migration_status.comp_finish_ts = null;
				settings_doc.migration_status.console_start_ts = null;
				settings_doc.migration_status.console_finish_ts = null;
				settings_doc.migration_status.db_start_ts = null;
				settings_doc.migration_status.db_finish_ts = null;

				// update the settings doc
				t.otcc.writeDoc({ db_name: ev.DB_SYSTEM }, settings_doc, (err_writeDoc, doc) => {
					if (err_writeDoc) {
						logger.error('[migration lib] cannot edit settings doc to clear migration status:', err_writeDoc);
						cb({ statusCode: 500, msg: 'could not update settings doc to clear migration status', details: err_writeDoc }, null);
					} else {
						return cb(null, settings_doc);
					}
				});
			}
		});
	}

	// edit settings doc to change component migration status
	function change_comp_migration_status(status, cb) {
		t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, (err, settings_doc) => {
			if (err || !settings_doc) {
				logger.error('[migration lib] could not get settings doc to update comp migration status', err);
				return cb({ statusCode: 500, msg: 'could get settings doc for component migration status', details: err }, null);
			} else {

				if (status === ev.STR.STATUS_IN_PROGRESS) {
					settings_doc.migration_status.comp_start_ts = Date.now();
					settings_doc.migration_status.attempt++;
				} else {
					settings_doc.migration_status.comp_finish_ts = Date.now();
				}

				// update the settings doc
				t.otcc.writeDoc({ db_name: ev.DB_SYSTEM }, settings_doc, (err_writeDoc, doc) => {
					if (err_writeDoc) {
						logger.error('[migration lib] cannot edit settings doc to update comp migration status:', err_writeDoc);
						cb({ statusCode: 500, msg: 'could not update settings doc for component migration status', details: err_writeDoc }, null);
					} else {
						return cb(null, settings_doc.migrated_console_url);
					}
				});
			}
		});
	}

	// edit settings doc to change db migration status
	function change_db_migration_status(status, cb) {
		t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, (err, settings_doc) => {
			if (err || !settings_doc) {
				logger.error('[migration lib] could not get settings doc to update db migration status', err);
				return cb({ statusCode: 500, msg: 'could get settings doc for db migration', details: err }, null);
			} else {

				if (status === ev.STR.STATUS_IN_PROGRESS) {
					settings_doc.migration_status.db_start_ts = Date.now();
				} else {
					settings_doc.migration_status.db_finish_ts = Date.now();
				}

				// update the settings doc
				t.otcc.writeDoc({ db_name: ev.DB_SYSTEM }, settings_doc, (err_writeDoc, doc) => {
					if (err_writeDoc) {
						logger.error('[migration lib] cannot edit settings doc to update db migration status:', err_writeDoc);
						cb({ statusCode: 500, msg: 'could not update settings doc for db migration', details: err_writeDoc }, null);
					} else {
						return cb(null, settings_doc.migrated_console_url);
					}
				});
			}
		});
	}

	// -----------------------------------------------------
	// the actual db migration work gets done here
	// -----------------------------------------------------
	function migrate_dbs_inner(req, cb) {
		const ret = {
			databases: {}
		};
		ret.databases[ev.DB_SYSTEM] = {
			migrated: 0,
			errors: []
		};
		ret.databases[ev.DB_COMPONENTS] = {
			migrated: 0,
			errors: []
		};

		// 1. get lock
		const l_opts = {
			lock: 'migration',
			max_locked_sec: 1 * 60,		// dsh todo calc decent value for lock
		};
		t.lock_lib.apply(l_opts, (lock_err) => {
			if (lock_err) {
				logger.error('[migration lib] did not get migration lock, try again later');
				return cb({ statusCode: 400, msg: 'unable to get migration lock', details: lock_err }, null);
			} else {

				// 2. mark the database migration as in progress
				change_db_migration_status(ev.STR.STATUS_IN_PROGRESS, (err, new_console_url) => {
					if (err) {
						return cb(err);									// error already logged
					} else if (!new_console_url || !t.misc.format_url(new_console_url)) {
						logger.error('[migration lib] the new console url is not defined in settings doc, cannot migrate');
						return cb({ statusCode: 400, msg: 'the new console url is not defined, cannot migrate', migrated_console_url: new_console_url }, null);
					} else {

						// 3. call backup api
						t.dbs.athena_backup(req, (back_err, back_resp) => {
							if (back_err) {
								logger.error('[migration lib] error with backup before db migration', back_err);
								return cb({
									statusCode: back_err.statusCode ? back_err.statusCode : 500,
									msg: 'unable to backup database prior to db migration - 1', details: back_err
								});
							} else if (!back_resp || !back_resp.id) {
								logger.error('[migration lib] error with backup response for db migration. no id', back_resp);
								return cb({
									statusCode: 500,
									msg: 'unable to backup database prior to db migration - 2', details: back_resp
								}, null);
							} else {

								// 4. wait for backup api to be done
								wait_for_backup(back_resp.id, (stalled_err, backup) => {
									if (stalled_err) {
										return cb({						// error already logged
											statusCode: 500,
											msg: 'unable to backup database prior to db migration - 3', details: back_resp
										}, null);
									} else {

										// dsh todo remove this test code
										//delete backup.dbs.athena_components;
										//delete backup.dbs.athena_system;

										// 5. call restore api on other console
										send_restore(new_console_url, backup, (restore_err, rest_resp) => {
											if (restore_err) {
												logger.error('[migration lib] unable to send restore-database api for db migration', restore_err);
												return cb({
													statusCode: 500,
													msg: 'unable to migrate database - 1', details: back_resp
												}, null);
											} else {

												// 6. wait for restore api to be done
												wait_for_restore(rest_resp.url, (stalled_err2) => {
													if (stalled_err2) {
														return cb({						// error already logged
															statusCode: 500,
															msg: 'unable to migrate database - 2', details: stalled_err2
														}, null);
													} else {

														// 7. all done!
														logger.info('[migration lib] database migration via restore completed');
														return cb(null, { testing: 'all done', ret: ret });
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
			const interval_ms = 2 * 1000;				// it wants ms
			const desired_max_ms = 5 * 60 * 1000;
			const started = Date.now();
			const attempts = Math.ceil(desired_max_ms / interval_ms);

			logger.debug('[migration lib] starting polling to wait for backup to complete... max attempts:', attempts);
			let on_attempt = 0;

			// delay retry a bit for initial backup doc to be created
			setTimeout(() => {
				t.async.retry({
					times: attempts,
					interval: interval_ms,				// it wants ms
				}, (done) => {
					const log_attempts = 'on attempt: ' + (++on_attempt) + '/' + attempts;

					t.dbs.get_backup(backup_id, (get_err, resp) => {
						if (get_err || !resp) {
							logger.debug('[migration lib] - backup response is unexpected: ', get_err, 'resp:', resp);
							return done('backup error');
						} else if (resp.in_progress) {
							logger.debug('[migration lib] - backup has not completed yet...', log_attempts);
							return done('backup in progress');
						} else {
							logger.info('[migration lib] - backup has completed, can migrate dbs now', log_attempts);
							return done(null, resp);
						}
					});
				}, (err, backup_doc) => {
					if (err) {
						const elapsed = Date.now() - started;
						const log_attempts = 'attempt: ' + on_attempt + '/' + attempts;
						logger.warn('[migration lib] - could not backup dbs prior to migration. giving up after', t.misc.friendly_ms(elapsed), log_attempts);
					}
					return cb(err, backup_doc);
				});
			}, 2 * 1000);
		}

		//--------------------------------------------------
		// wait for the restore to complete
		//--------------------------------------------------
		function wait_for_restore(webhook_url, cb) {
			const interval_ms = 2 * 1000;				// it wants ms
			const desired_max_ms = 5 * 60 * 1000;
			const started = Date.now();
			const attempts = Math.ceil(desired_max_ms / interval_ms);

			logger.debug('[migration lib] starting polling to wait for restore to complete... max attempts:', attempts);
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
							'Authorization': 'Basic ' + t.misc.b64('migration_api_key' + ':' + 'open'),		// dsh todo replace
						}
					};
					t.misc.retry_req(web_opts, (web_err, web_resp) => {
						if (t.ot_misc.is_error_code(t.ot_misc.get_code(web_resp))) {
							logger.error('[migration lib] - restore api could not be completed');
							return done('restore error');
						} else {
							web_resp = t.ot_misc.formatResponse(web_resp);
							if (web_err || !web_resp) {
								logger.error('[migration lib] - restore response is unexpected: ', web_err, 'resp:', web_resp);
								return done('restore error');
							} else if (web_resp.in_progress) {
								logger.debug('[migration lib] - restore has not completed yet...', log_attempts);
								return done('restore in progress');
							} else {
								logger.info('[migration lib] - restore has completed, migration nearly complete', log_attempts);
								return done(null, web_resp);
							}
						}
					});
				}, (err, web_resp) => {
					if (err) {
						const elapsed = Date.now() - started;
						const log_attempts = 'attempt: ' + on_attempt + '/' + attempts;
						logger.warn('[migration lib] - could not restore dbs during migration. giving up after', t.misc.friendly_ms(elapsed), log_attempts);
					}
					return cb(err, web_resp);
				});
			}, 2 * 1000);
		}

		//--------------------------------------------------
		// call restore api on the other console
		//--------------------------------------------------
		function send_restore(new_console_url, backup, cb) {
			backup.client_webhook_url = 'http://localhost:3000/api/v3/testing';						// dsh todo rethink this, placeholder
			const res_opts = {
				_name: 'migration-restore',
				_max_attempts: 1,
				method: 'PUT',
				baseUrl: null,
				url: t.misc.format_url(new_console_url) + '/ak/api/v3/backups',
				body: JSON.stringify(backup),
				headers: {
					'Content-Type': 'application/json',
					'Authorization': 'Basic ' + t.misc.b64('migration_api_key' + ':' + 'open'),		// dsh todo figure out migration_key
				}
			};

			t.misc.retry_req(res_opts, (restore_err, rest_resp) => {
				if (t.ot_misc.is_error_code(t.ot_misc.get_code(rest_resp))) {
					return cb(t.ot_misc.formatResponse(rest_resp), null);
				} else {
					return cb(null, t.ot_misc.formatResponse(rest_resp));
				}
			});
		}
	}

	//-------------------------------------------------------------
	// Validate every node's fabric version (is it migratable?)
	//-------------------------------------------------------------
	exports.validate_fabric_versions = (req, cb) => {
		req._skip_cache = true;
		req._include_deployment_attributes = true;
		t.component_lib.get_all_runnable_components(req, (err, resp) => {
			if (err) {
				logger.error('[migrate] error getting all runnable components:', err);
				return cb({ statusCode: 500, errors: err });
			} else {
				const ret = {
					components: [],
					all_valid: true										// default true
				};
				for (let i in resp) {
					const comp = t.comp_fmt.fmt_component_resp(req, resp[i]);
					const node_type_lc = resp[i].type ? resp[i].type.toLowerCase() : '';
					const min_version = node_type_lc ? ev.MIGRATION_MIN_VERSIONS[node_type_lc] : null;
					comp._migratable = true;							// default true
					comp._imported = true;
					comp._min_version = min_version;

					if (comp.location === ev.STR.LOCATION_IBP_SAAS) {	// if its a saas component, we don't care about imported ones
						comp._imported = false;
						if (!t.misc.is_version_b_greater_than_a(min_version, resp[i].version, true)) {
							comp._migratable = false;
							ret.all_valid = false;
						}
					}

					ret.components.push(comp);
				}
				return cb(null, t.misc.sortKeys(ret));
			}
		});
	};

	//-------------------------------------------------------------
	// Validate the cluster's kubernetes version(is it migratable?)
	//-------------------------------------------------------------
	exports.validate_k8s_versions = (req, cb) => {
		req._skip_cache = true;
		t.deployer.get_k8s_version((err, resp) => {
			if (err) {
				logger.error('[migrate] error getting kubernetes version:', err);
				return cb({ statusCode: 500, errors: err });
			} else {
				const k8s_version = resp ? resp._version : '';
				logger.debug('[migrate] received kubernetes version:', k8s_version);
				const ret = {
					k8s: {
						migratable: t.misc.is_version_b_greater_than_a(ev.MIGRATION_MIN_VERSIONS.kubernetes, k8s_version, true),
						version: k8s_version,
						min_version: ev.MIGRATION_MIN_VERSIONS.kubernetes.toString(),
					}
				};
				return cb(null, t.misc.sortKeys(ret));
			}
		});
	};

	//-------------------------------------------------------------
	// Check on migration status
	//-------------------------------------------------------------
	exports.check_migration_status = (cb) => {
		logger.info('[migration] - monitoring migration status - looking for updates');

		// first check if we are still within the estimated time
		t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, (err, settings_doc) => {
			if (err || !settings_doc) {
				logger.error('[migration watchdog] could not get settings doc to check migration status', err);
				return cb({ statusCode: 500, msg: 'could get settings doc to clear migration status', details: err }, null);
			} else {

				// if its been too long, kill the migration monitor interval
				const elapsed_ms = Date.now() - settings_doc.migration_status.comp_start_ts;
				const timeout_ms = settings_doc.migration_status.timeout_min * 60 * 1000;
				logger.debug('[migration watchdog] elapsed time:', t.misc.friendly_ms(elapsed_ms) +
					'. timeout after:', t.misc.friendly_ms(timeout_ms));

				if (elapsed_ms >= timeout_ms) {
					logger.error('[migration watchdog] timeout exceeded, migration has failed');

					const msg = {
						message_type: 'monitor_migration_stop',
						message: 'migration timeout exceeded',
					};
					t.pillow.broadcast(msg);
				} else {
					logger.debug('[migration watchdog] migration is still progressing');

					// dsh todo fill in the checking part
					//change_comp_migration_status(ev.STR.STATUS_DONE, (err) => {		// if success, mark migration as complete
					//	logger.info('[migration lib] comp migration was successful');
					//});
				}
			}
		});
	};

	//-------------------------------------------------------------
	// Set the migration_enabled feature flag in the settings doc
	//-------------------------------------------------------------
	exports.set_migration_feature_flag = (value, cb) => {
		t.couch_lib.getDoc({ db_name: ev.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, function (err, doc) {
			if (err) {
				logger.error('[migration lib] an error occurred obtaining the "' + process.env.SETTINGS_DOC_ID + '" db:', ev.DB_SYSTEM, err, doc);
				cb({ statusCode: 500, err: err }, doc);
			} else {
				if (!doc) {
					cb({ statusCode: 500, err: 'settings doc is missing' }, doc);	// this should be impossible
				}
				if (!doc.feature_flags) {
					doc.feature_flags = {};
				}
				doc.feature_flags.migration_enabled = value;

				t.otcc.writeDoc({ db_name: ev.DB_SYSTEM }, doc, (err_writeDoc, doc) => {
					if (err_writeDoc) {
						logger.error('[migration lib] cannot edit settings doc to edit migration_enabled:', err_writeDoc);
						cb({ statusCode: 500, msg: 'could not update settings doc to edit migration_enabled', details: err_writeDoc }, null);
					} else {
						const ret = JSON.parse(JSON.stringify(ev.API_SUCCESS_RESPONSE));
						ret.migration_enabled = value;
						cb(null, ret);
					}
				});
			}
		});
	};

	return exports;
};
