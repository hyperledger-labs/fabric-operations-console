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

	//-------------------------------------------------------------
	// Get the overall status from status docs in db
	//-------------------------------------------------------------
	exports.get_status = (req, cb) => {
		const ret = {
			migration_status: null, 		//'in-progress' || 'done' || null,

			// dsh todo api to set these
			migrated_console_url: null, 	//'https://something.goes.here.com' || null,

			// dsh todo api to set these
			databases: null, 				//'in-progress' || 'done' || null,

			// dsh todo api to set these
			components: [
				/*{
					"id": <id here>,
					"migration_status" : "in-progress" || "done" || null
				}*/
			],

			// dsh todo api to set these
			wallets: [
				/*{
					"username": <username here>,
					"migration_status" : "done"
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
					query: t.misc.formatObjAsQueryParams({ include_docs: true, keys: [ev.STR.STATUS_IN_PROGRESS] }),
				};
				t.otcc.getDesignDocView(view_opts, (err_getDoc, resp) => {
					if (err_getDoc || !resp) {
						logger.error('[migration lib] unable to load existing component ids:', err_getDoc, resp);
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

			ret.migrated_console_url = settings_doc.migrated_console_url || null;
			ret.databases = settings_doc.migration_database_status || null;
			ret.wallets = format_wallet_status_docs(wallet_docs);
			ret.components = format_comp_status_docs(component_docs);

			// overall migration status
			ret.migration_status = null;
			if (all_comps_have_migrated(component_docs) && (ret.wallets.length > 0) && (ret.databases === ev.STR.STATUS_DONE)) {
				ret.migration_status = ev.STR.STATUS_DONE;
			} else if (some_comps_have_migrated(component_docs) || (ret.wallets.length > 0) || (ret.databases === ev.STR.STATUS_DONE)) {
				ret.migration_status = ev.STR.STATUS_IN_PROGRESS;
			}

			return cb(null, ret);
		});


		// format the wallet migration status response part
		function format_wallet_status_docs(wallet_docs) {
			const docs = [];
			for (let i in wallet_docs) {
				if (wallet_docs[i].doc) {
					docs.push({
						username: wallet_docs[i].doc.username,
						migration_status: ev.STR.STATUS_DONE,
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
					});
				}
			}
			return docs;
		}

		// returns true if every component doc has migrated
		function all_comps_have_migrated(comp_docs) {
			for (let i in comp_docs) {
				if (comp_docs[i].doc) {
					if (comp_docs[i].doc.migration_status !== ev.STR.STATUS_DONE) {
						return false;
					}
				}
			}
			return true;
		}

		// returns true if at least one component doc has migrated
		function some_comps_have_migrated(comp_docs) {
			for (let i in comp_docs) {
				if (comp_docs[i].doc) {
					if (comp_docs[i].doc.migration_status === ev.STR.STATUS_DONE) {
						return true;
					}
				}
			}
			return false;
		}
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

	// edit settings doc to change db migration status
	function change_db_migration_status(status, cb) {
		// get the Athena settings doc first
		t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, (err, settings_doc) => {
			if (err || !settings_doc) {
				logger.error('[migration lib] could not get settings doc to update db migration status', err);
				return cb({ statusCode: 500, msg: 'could get settings doc for db migration', details: err }, null);
			} else {
				settings_doc.migration_database_status = status; //ev.STR.STATUS_IN_PROGRESS;

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
			max_locked_sec: 1, //4 * 60,
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
										delete backup.dbs.athena_components;
										delete backup.dbs.athena_system;

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
												console.log('!!! restore api resp', rest_resp);
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
							'Authorization': 'Basic ' + t.misc.b64('migration_link_apikey' + ':' + 'open'),		// dsh todo replace
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
			backup.client_webhook_url = 'http://localhost:3000/api/v3/testing';							// dsh todo rethink this, placeholder
			const res_opts = {
				_name: 'migration-restore',
				_max_attempts: 1,
				method: 'PUT',
				baseUrl: null,
				url: t.misc.format_url(new_console_url) + '/ak/api/v3/backups',
				body: JSON.stringify(backup),
				headers: {
					'Content-Type': 'application/json',
					'Authorization': 'Basic ' + t.misc.b64('migration_link_apikey' + ':' + 'open'),		// dsh todo figure out migration_key
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

	return exports;
};
