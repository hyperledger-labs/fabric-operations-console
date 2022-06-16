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
// db_backup.js - OpTools backup/restore - only safe on dbs w/ small doc counts (10k or less)
//------------------------------------------------------------

module.exports = function (logger, ev, t) {
	const dbs = {};
	const BACKUP_DOC_TYPE = 'athena_backup';
	let the_backup = {};
	let restore_in_progress = false;
	let restore_successes = 0;
	const MAX_DOC_ITER = 100;
	let db_interval = null;
	let DOC_ID_BASE = '03_ibp_db_backup_';			// prefix for backup doc ids
	let auto_timer = null;

	//------------------------------------------------------------
	// init backup obj
	//------------------------------------------------------------
	function build_backup_obj() {
		return {
			_id: '-',								// populated later
			backup_version: '1.0.0',
			ibp_versions: {},						// populated later
			doc_count: 0,							// populated later
			dbs: {},								// populated later
			in_progress: false,
			type: BACKUP_DOC_TYPE,
			start_timestamp: 0,						// populated later
			end_timestamp: 0,						// populated later
			elapsed: 0,								// populated later
		};
	}

	//------------------------------------------------------------
	// Automatic db backups
	//------------------------------------------------------------
	clearTimeout(auto_timer);															// there should only ever be one of these
	auto_timer = setTimeout(function () {												// next backup should run at 1am utc
		run_auto_backup();

		clearInterval(db_interval);
		db_interval = setInterval(function () {											// each backup (after the first) should run every 24 hours
			run_auto_backup();
		}, 1000 * 60 * 60 * 24);														// this interval is constant b/c random delay added to first auto backup

	}, ms_till_1am_utc());

	// run the auto backup if its needed
	function run_auto_backup() {
		if (t.ot_misc.server_is_closed()) {												// don't run during graceful shutoff
			logger.warn('[backup] server is closing or closed. auto backup will be skipped.');
			return;
		}

		recent_backup_exists((_, recent_backup) => {									// helps prevent too many as well as handle  multiple athena instances
			if (recent_backup) {
				logger.debug('[backup] recent db backup detected, skipping auto backup.', recent_backup.id, t.misc.friendly_ms(recent_backup.elapsed), 'ago');
				dbs.prune_backups();													// clean up old backups
			} else {
				const opts = {
					db_names: [ev.DB_COMPONENTS, ev.DB_SESSIONS, ev.DB_SYSTEM],
					blacklisted_doc_types: [BACKUP_DOC_TYPE, 'session_athena'],
					BATCH: 512,
				};
				dbs.async_backup(opts, null, () => {									// run the backup
					dbs.prune_backups();												// clean up old backups
				});
			}
		});

		// detect if a recent backup already exists - async
		function recent_backup_exists(cb) {
			dbs.get_backup_ids((err, data) => {
				if (!data || !Array.isArray(data.ids)) {
					return cb();														// some sort of error, assume we have no backups
				} else {
					for (let i in data.ids) {
						const backup_ts = data.ids[i].substring(DOC_ID_BASE.length);	// timestamp is after the base text
						const elapsed = Math.abs(Date.now() - backup_ts);
						if (elapsed <= 1000 * 60 * 60 * 12) {							// found a recent backup, return its id
							return cb(null, { id: data.ids[i], elapsed: elapsed });
						}
					}
					return cb();														// 0 recent backups found
				}
			});
		}
	}

	// calc milliseconds till 1am utc
	function ms_till_1am_utc() {
		const timeAt1Am = new Date();
		timeAt1Am.setHours(1, 0, 0, 0);													// build timestamp for 1am today UTC
		const timeAt1AmTomorrow = timeAt1Am.getTime() + (1000 * 60 * 60 * 24);			// add 1 day for 1am tomorrow UTC
		const ret = timeAt1AmTomorrow - Date.now();										// calc time from now till 1am tomorrow
		logger.debug('[backup] auto db backup will run in', t.misc.friendly_ms(ret));
		return ret + 10 * 60 * 1000 * Math.random();									// add some time fuzziness to spread out multiple instance attempts
	}

	//------------------------------------------------------------
	// [athena] backup dbs - cb_early is called before backup is complete
	//------------------------------------------------------------
	dbs.athena_backup = function (req, cb_early, cb_done) {
		const options = {
			req: req,
			db_names: [ev.DB_COMPONENTS, ev.DB_SESSIONS, ev.DB_SYSTEM],
			blacklisted_doc_types: [BACKUP_DOC_TYPE, 'session_athena'],					// don't backup other backups or session docs
			BATCH: 512,
		};
		dbs.async_backup(options, cb_early, cb_done);
	};

	//------------------------------------------------------------
	// [generic] backup dbs - cb_early is called before backup is complete
	//------------------------------------------------------------
	/*
	opts: {
		req: {},
		db_names: [""],							// [required] array of database names to backup
		blacklisted_doc_types: [""],			// [optional] array of strings, docs with this "type" field will not be backed up
		BATCH: 512,								// [optional] max number of full docs to pull at once (bulk get), defaults 1000
		use_fs: false							// [optional] if true the local file system will store the backup instead of the systems db (defaults false)
		service_id: ''							// [optional] cosmetic name for the service instance, only used on the local file system backup file
	}
	*/
	dbs.async_backup = function (opts, cb_early, cb_done) {
		cb_early = cb_early || function () { };						// init
		cb_done = cb_done || function () { };						// init
		opts = opts || {};

		if (t.ot_misc.server_is_closed()) {							// don't run during graceful shutoff
			logger.warn('[backup] server is closing or closed. backup will be skipped.');
			cb_early({ statusCode: 500, message: 'server is closing/closed' });
			return cb_done();
		} else if (the_backup.in_progress === true) {				// if in progress do not send another
			logger.warn('[backup] backup is already in progress, wait for backup:', the_backup._id);
			cb_early({ statusCode: 400, message: 'already_in_progress', id: the_backup._id });
			return cb_done();
		} else {													// start the backup
			the_backup = build_backup_obj();						// init
			the_backup.start_timestamp = Date.now();
			the_backup._id = DOC_ID_BASE + the_backup.start_timestamp;
			the_backup.in_progress = true;
			the_backup.ibp_versions = t.ot_misc.parse_versions();
			logger.info('[backup] starting db backup. ', the_backup._id, 'dbs:', opts.db_names);

			// build a notification doc
			t.notifications.procrastinate(opts.req, { message: 'starting db backup \'' + the_backup._id + '\'' });

			// do not return here, calling callback early so api can respond before this is done
			cb_early(null, { message: 'in-progress', id: the_backup._id, url: ev.HOST_URL + '/ak/api/v3/backups/' + the_backup._id });

			t.async.eachLimit(opts.db_names, 1, (db_name, cb_backup) => {
				backup_db(db_name, opts, () => {
					return cb_backup();
				});
			}, () => {												// backup done
				the_backup.in_progress = false;
				the_backup.end_timestamp = Date.now();
				the_backup.elapsed = t.misc.friendly_ms(the_backup.end_timestamp - the_backup.start_timestamp);
				update_backup_doc(opts, () => {					// update one more time to flip "in_progress"
					logger.info('[backup] completed backup, docs:', the_backup.doc_count, the_backup.elapsed, the_backup._id);
					return cb_done();
				});
			});
		}
	};

	//------------------------------------------------------------
	// back up all docs in this db
	//------------------------------------------------------------
	function backup_db(db_name, orig_opts, cb) {
		const db_start_timestamp = Date.now();
		outer_loop(null, 0, () => {
			return cb(null);
		});

		// backup all docs && loop on db _changes until we do not see any changes - recursive!
		// - note that if the outer loop does repeat there might be duplicate docs in the array. that will be okay since restore will use the docs in order.
		//   thus its important to never re-sort the docs array.
		function outer_loop(since, outer_iter, cb_outer) {
			if (outer_iter > 3) {			// watch dog, do not loop forever
				logger.error('[backup] too many outer loop iterations, quitting', outer_iter, db_name);
				return cb_outer(null);
			}

			// [1] get all the doc ids since the last time we looked for changes
			get_doc_ids(db_name, since, (error, resp1) => {
				if (error || !resp1 || !Array.isArray(resp1.ids2lookup)) {
					// error already logged
					return cb_outer(null);
				} else {
					logger.debug('[backup] there are', resp1.ids2lookup.length, 'docs to backup in db: "' + db_name + '"');

					// [2] get each doc's contents
					const inner_opts = {
						start: 0,
						allIds: resp1.ids2lookup,
						db_name: db_name,
						ret: [],
						iter: 0,
						blacklisted_doc_types: orig_opts.blacklisted_doc_types,
						BATCH: orig_opts.BATCH,
					};
					get_docs(inner_opts, (error2, bulk_docs) => {
						if (error2) {
							// error already logged
							return cb_outer(null);
						} else {

							// [3] write/update the backup doc
							update_backup_obj(resp1.last_sequence, bulk_docs);
							update_backup_doc(orig_opts, () => {
								//logger.debug('[backup] backed up db: "' + db_name + '" with', the_backup.dbs[db_name].docs.length, 'docs');

								// [4] check if there have been updates since we started the backup
								get_doc_ids(db_name, resp1.last_sequence, (error3, resp2) => {
									if (error || !resp2 || !Array.isArray(resp2.ids2lookup)) {
										// error already logged
										return cb_outer(null);
									} else if (resp2.ids2lookup.length > 0) {
										// keep going b/c docs were added/edited since we started backup. use last sequence so we start from where we left off
										logger.debug('[backup] there are', resp2.ids2lookup.length, 'db changes since since backup started, continuing db: "' +
											db_name + '"');
										return outer_loop(resp1.last_sequence, ++outer_iter, cb_outer);
									} else {
										//logger.debug('[backup] there are 0 db changes since backup started, finished db: "' + db_name + '"');
										return cb_outer(null);					// all done
									}
								});
							});
						}
					});
				}
			});
		}

		// update the backup object
		function update_backup_obj(last_sequence, docs_arr) {
			if (!the_backup.dbs[db_name]) {
				the_backup.dbs[db_name] = {};							// safe init
			}
			if (!Array.isArray(the_backup.dbs[db_name].docs)) {			// safe init
				the_backup.dbs[db_name].docs = [];
			}

			if (Array.isArray(docs_arr)) {
				the_backup.doc_count += docs_arr.length;				// keep count of all docs
			}
			const db_finish_timestamp = Date.now();
			the_backup.dbs[db_name] = {
				start_timestamp: db_start_timestamp,
				finish_timestamp: db_finish_timestamp,
				elapsed: t.misc.friendly_ms(db_finish_timestamp - db_start_timestamp),
				last_sequence: last_sequence,
				docs: the_backup.dbs[db_name].docs.concat(docs_arr),
			};
		}
	}

	//------------------------------------------------------------
	// write the backup to db or filesystem
	//------------------------------------------------------------
	function update_backup_doc(orig_opts, cb_write) {
		if (orig_opts && orig_opts.use_fs === true) {
			update_backup_doc_fs();
			return cb_write();
		} else {
			update_backup_doc_db(() => {
				return cb_write();
			});
		}

		// write it to the db
		function update_backup_doc_db(cb_wrote_db) {
			const options = {
				db_name: ev.DB_SYSTEM,
				doc: the_backup
			};
			t.couch_lib.repeatWriteSafe(options, (document) => {
				if (document._rev) {
					the_backup._rev = document._rev;			// copy existing rev, not merging docs on purpose
				}
				return { error: null, doc: the_backup };
			}, (errorCode, wrote_doc) => {
				if (errorCode) {
					logger.error('[backup] unable write backup doc', errorCode, wrote_doc);
				}
				return cb_wrote_db();
			});
		}

		// write it to the local filesystem
		function update_backup_doc_fs() {
			orig_opts.instance_id = orig_opts.instance_id || 'no-id';
			const file_path = t.path.join(__dirname, '../_backups/' + orig_opts.instance_id + '/' + the_backup._id + '.json');
			t.misc.check_dir_sync({ file_path: file_path, create: true });
			t.fs.writeFileSync(file_path, JSON.stringify(the_backup, null, '\t'));
		}
	}

	//------------------------------------------------------------
	// get all docs ids in the db
	//------------------------------------------------------------
	function get_doc_ids(db_name, since, cb) {
		const ret = { last_sequence: null, ids2lookup: [] };

		//logger.debug('[backup] getting changes for db: "' + db_name + '"');
		t.couch_lib.get_changes(db_name, since, (error, all_changes) => {
			if (error) {
				logger.error('[backup] error:', error);
			} else if (!all_changes || !all_changes.results) {
				logger.warn('[backup] there are no changes for db: "' + db_name + '"');
			} else {
				for (let i in all_changes.results) {
					ret.last_sequence = all_changes.results[i].seq;				// remember where we left off
					if (!all_changes.results[i].deleted && all_changes.results[i].id !== the_backup._id) {	// skip deleted and our own backup doc
						ret.ids2lookup.push(all_changes.results[i].id);
					}
				}
			}
			return cb(null, ret);
		});
	}

	//------------------------------------------------------------
	// Get all docs in array via bulk doc - recursive!
	//------------------------------------------------------------
	/*
	opts: {
		start: 0,						// array  position of doc id to start in this iteration
		allIds: ["doc id here"],		// all ids to look ultimately look up
		db_name: "db name",
		ret: [],
		iter: 0,
		blacklisted_doc_types: [""],
		BATCH: 1000,
	}
	*/
	function get_docs(opts, cb) {
		opts = opts || {};																							// init
		opts.BATCH = opts.BATCH || 1000;																			// init
		opts.blacklisted_doc_types = Array.isArray(opts.blacklisted_doc_types) ? opts.blacklisted_doc_types : [];	// init
		let stop = (opts.allIds.length <= (opts.start + opts.BATCH)) ? opts.allIds.length - 1 : (opts.start + opts.BATCH - 1);

		if (opts.iter > MAX_DOC_ITER) {									// watch dog, do not loop forever
			logger.error('[bulk get] too many iterations, quitting', opts.iter, opts.db_name);
			return cb({ statusCode: 500, msg: 'too many loop iterations' }, null);
		}

		const ids2get = opts.allIds.slice(opts.start, stop + 1);		// grab the ids for this batch
		if (ids2get.length === 0) {
			return cb(null, opts.ret);									// looks like we are done
		}

		//logger.debug('[bulk get] working docs', opts.start + '-' + stop, 'for db: "' + opts.db_name + '"');
		t.couch_lib.bulk_get(opts.db_name, ids2get, (error, resp) => {
			if (error) {
				logger.error('[bulk get] error getting bulk docs', error, resp);
				return cb({ statusCode: 500, msg: 'error getting docs' }, resp);
			} else if (!resp.results) {
				logger.warn('[bulk get] no results for bulk get docs', resp);
				return cb(null, opts.ret);
			} else {
				//logger.debug('[bulk get] bulk doc results', opts.start + '-' + stop, 'for db: "' + opts.db_name + '"');

				for (let i in resp.results) {
					if (!resp.results[i].docs || !resp.results[i].docs[0] || !resp.results[i].docs[0].ok) {
						logger.error('[bulk get] failed to get a doc:', resp.results[i].docs);
					} else {
						if (!opts.blacklisted_doc_types.includes(resp.results[i].docs[0].ok.type)) {		// skip doc w/type in blacklist
							opts.ret.push(t.misc.sortKeys(resp.results[i].docs[0].ok));
						}
					}
				}

				opts.start = ++stop;
				opts.iter++;
				return get_docs(opts, cb);
			}
		});
	}

	//------------------------------------------------------------
	// get backup doc
	//------------------------------------------------------------
	dbs.get_backup = function (backup_id, cb) {
		const opts = {
			db_name: ev.DB_SYSTEM,
			_id: backup_id,
			query: 'attachments=true',				// add this so we get the attachments too
			SKIP_CACHE: true,
		};
		t.couch_lib.getDoc(opts, (err_get, backup_doc) => {
			if (backup_doc) {
				backup_doc.id = backup_doc._id;		// format the doc for clients
				delete backup_doc._rev;
				delete backup_doc._id;
				for (let i in backup_doc._attachments) {
					backup_doc._attachments[i] = backup_doc._attachments[i].data;	// simplify the object
				}
			}
			return cb(err_get, backup_doc);
		});
	};

	//------------------------------------------------------------
	// [athena] restore athena dbs from a backup doc id - cb_early is called before backup is complete
	//------------------------------------------------------------
	dbs.athena_restore_by_doc = function (req, backup_id, cb_early, cb_done) {
		cb_early = cb_early || function () { };							// init
		cb_done = cb_done || function () { };							// init
		t.couch_lib.getDoc({ db_name: ev.DB_SYSTEM, _id: backup_id, SKIP_CACHE: true }, (err_get, backup_doc) => {
			if (err_get) {
				logger.error('[restore] cannot restore, could not load backup doc.', err_get, backup_doc);
				cb_early({ statusCode: 400, message: 'cannot restore, could not load backup doc.' });
				return cb_done();
			} else {
				return dbs.athena_restore(req, backup_doc, cb_early, cb_done);
			}
		});
	};

	//------------------------------------------------------------
	// [athena] restore athena dbs from JSON data - cb_early is called before backup is complete
	//------------------------------------------------------------
	dbs.athena_restore = function (req, backup_data, cb_early, cb_done) {
		const options = {
			req: req,
			db_names: [ev.DB_COMPONENTS, ev.DB_SESSIONS, ev.DB_SYSTEM],
			backup: backup_data,
			BATCH: 512,
		};
		return dbs.async_restore(options, cb_early, cb_done);
	};

	//------------------------------------------------------------
	// [generic] restore any dbs from JSON data - cb_early is called before restore is complete
	//------------------------------------------------------------
	/*
	opts: {
		req: {
			query: {
				skip_system: ["00_settings_athena"],	// [optional] docs that match these ids will not be restored to the system db
				skip_component: ["abcd"]				// [optional] docs that match these ids will not be restored to the components db
			}
			...
		},
		db_names: [""],							// [required] array of database names to restore
		backup: {},								// [required] the backup data to use during restore
		BATCH: 512,								// [optional] max number of full docs to write & read at once (bulk docs), defaults 1000
	}
	*/
	dbs.async_restore = function (opts, cb_early, cb_done) {
		cb_early = cb_early || function () { };							// init
		cb_done = cb_done || function () { };							// init
		let restore_start_timestamp = Date.now();
		opts = opts || {};												// init
		opts.BATCH = opts.BATCH || 1000;								// init

		if (restore_in_progress === true) {								// if in progress do not send another
			logger.warn('[restore] restore is already in progress, wait');
			cb_early({ statusCode: 400, message: 'already_in_progress' });
			return cb_done();
		} else {														// start the restore
			restore_in_progress = true;
			restore_successes = 0;
			logger.info('[restore] starting db restore. ', opts.backup._id, 'dbs:', opts.db_names);

			// create a webhook doc
			const tx_id = t.misc.simpleRandomString(32, true);
			const url = ev.HOST_URL + '/ak/api/v1/webhooks/txs/' + tx_id;
			const data = {
				tx_id: tx_id,
				url: url,												// send GET here to see status
				description: 'restoring dbs from backup',
				by: t.misc.censorEmail(t.middleware.getEmail(opts.req)),
				uuid: t.middleware.getUuid(opts.req),
				on_step: 1,
				total_steps: 1,
				client_webhook_url: opts.req.body.client_webhook_url,
				sub_type: 'backup_restore',
				timeout_ms: 1000 * 60 * 2,								// estimated timeout
			};
			t.webhook.store_webhook_doc(data, () => {

				// do not return here, calling callback early so api can respond before this is done
				cb_early(null, { message: 'in-progress', url: url });
			});

			// work over each db name
			t.async.eachLimit(opts.db_names, 1, (db_name, cb_restore) => {
				restore_db(db_name, opts, () => {
					return cb_restore();
				});
			}, () => {													// backup done
				restore_in_progress = false;
				let end_timestamp = Date.now();
				let elapsed = t.misc.friendly_ms(end_timestamp - restore_start_timestamp);
				logger.info('[restore] completed restore, docs:', restore_successes, elapsed, opts.backup._id);

				logger.debug('[restore] updating component white list');
				t.component_lib.rebuildWhiteList(opts.req, () => {
					t.webhook.edit_webhook(tx_id, { status: 'success' });	// edit webhook doc, update status
					return cb_done();
				});
			});
		}
	};

	//------------------------------------------------------------
	// restore all docs in this db
	//------------------------------------------------------------
	function restore_db(db_name, orig_opts, cb) {
		if (!orig_opts || !orig_opts.backup || !orig_opts.backup.dbs || !orig_opts.backup.dbs[db_name]) {
			logger.error('[restore] cannot restore. the restore data does not have this db:', db_name);
			return cb({ statusCode: 400, message: 'cannot restore. the restore data does not have this db: ' + db_name });
		} else {
			outer_loop(orig_opts.backup.dbs[db_name].docs, 0, 0, () => {
				logger.debug('[restore] finished restore of db: "' + db_name + '"');
				return cb(null);
			});
		}

		// loop on doc overwriting - recursive!
		// this "outer" loop handles x docs at a time
		function outer_loop(all_backup_docs, start, outer_iter, cb_outer) {
			if (outer_iter > MAX_DOC_ITER) {											// watch dog, do not loop forever
				logger.error('[restore] too many outer iterations, quitting', outer_iter, db_name);
				return cb_outer({ statusCode: 500, msg: 'too many outer loop iterations' }, null);
			}

			// get the docs for this batch
			let stop = (all_backup_docs.length <= (start + orig_opts.BATCH)) ? all_backup_docs.length - 1 : (start + orig_opts.BATCH - 1);
			const docs2overwrite = all_backup_docs.slice(start, stop + 1);
			if (docs2overwrite.length === 0) {											// looks like we are done
				return cb_outer(null);
			} else {
				bulk_doc_overwrite(docs2overwrite, 0, () => {							// overwrite these docs
					logger.debug('[restore] finished outer loop: ' + outer_iter + ', db: "' + db_name + '"', 'total doc successes:', restore_successes);
					return outer_loop(all_backup_docs, ++stop, ++outer_iter, cb_outer);	// recursive
				});
			}
		}

		// overwrite or create the docs, repeat to handle conflicts - recursive!
		// this "inner" loop handles doc write errors
		function bulk_doc_overwrite(docs_arr, iter, cb_replaced) {
			if (iter > 4) {																// watch dog, do not loop forever
				logger.error('[restore] too many inner iterations, quitting', iter, db_name);
				return cb_replaced({ statusCode: 500, msg: 'too many inner loop iterations' }, null);
			}

			// [1] bulk write a batch of docs
			const bulk_docs = { docs: filter_skip_docs(docs_arr) };						// build format for bulk couchdb operation

			if (bulk_docs.docs.length === 0) {
				logger.warn('[restore] 0 docs to restore in this iteration', iter);
				return cb_replaced(null);
			} else {
				logger.debug('[restore] inner iter: ' + iter + ', restoring ' + bulk_docs.docs.length + ' docs in db: "' + db_name + '"');

				t.couch_lib.bulkDatabase({ db_name: db_name }, bulk_docs, (err, resp) => {	// perform the bulk operation
					if (err != null) {
						logger.error('[restore] could not bulk restore docs', err, resp);
						return cb_replaced({ statusCode: 500, msg: 'error writing during bulk restore, check logs', details: err });
					} else {

						// [2] find doc update errors
						const ids_with_errors = find_errors(resp);
						if (ids_with_errors.length === 0) {
							return cb_replaced(null);									// all done
						} else {
							logger.debug('[restore] some docs had errors, will update again.', ids_with_errors.length);

							// [3] of the docs that had an error, get the current contents
							const inner_opts = {
								start: 0,
								allIds: ids_with_errors,
								db_name: db_name,
								ret: [],
								iter: 0,
								blacklisted_doc_types: [],
								BATCH: orig_opts.BATCH,
							};
							get_docs(inner_opts, (error2, get_bulk_docs) => {
								if (error2) {
									// error already logged
									return cb_replaced({ statusCode: 500, msg: 'error getting docs during bulk restore, check logs', details: err });
								} else {

									// [4] copy doc's rev and repeat
									const fixed_revs = copy_rev(orig_opts.backup.dbs[db_name].docs, get_bulk_docs);
									return bulk_doc_overwrite(fixed_revs, ++iter, cb_replaced);
								}
							});
						}
					}
				});
			}
		}

		// remove docs that have ids found in the query parameter
		function filter_skip_docs(docs_array) {
			if (db_name === ev.DB_SYSTEM) {					// if we are working the system db, look at the `skip_system` param
				if (orig_opts && orig_opts.req && orig_opts.req.query.skip_system) {
					generic_skip(orig_opts.req.query.skip_system);
				}
			} else if (db_name === ev.DB_COMPONENTS) {		// if we are working the components db, look at the `skip_components` param
				if (orig_opts && orig_opts.req && orig_opts.req.query.skip_components) {
					generic_skip(orig_opts.req.query.skip_components);
				}
			}
			return docs_array;

			// remove docs in list from docs array
			function generic_skip(skip_list) {
				if (skip_list) {
					let skip_docs = [];
					try {
						skip_docs = JSON.parse(skip_list);		// pares it, should be an array
					} catch (e) { }

					if (Array.isArray(skip_docs)) {
						for (let i in docs_array) {
							if (docs_array[i]._id && skip_docs.includes(docs_array[i]._id)) {
								logger.debug('[restore] skipping restore of this doc b/c its in the skip list:', db_name, docs_array[i]._id);
								docs_array.splice(i, 1);
							}
						}
					}
				}
			}
		}

		// get doc ids of all update errors
		function find_errors(response) {
			const ret = [];
			for (let i in response) {
				if (!response[i].ok) {
					ret.push(response[i].id);
				} else {
					restore_successes++;								// keep track of doc write successes
				}
			}
			return ret;
		}

		// get doc ids of all update errors
		function copy_rev(backup_docs, current_docs) {
			const ret = [];
			for (let i in backup_docs) {								// there will be a lot of docs here
				for (let x in current_docs) {							// there should be fewer docs here
					if (backup_docs[i]._id === current_docs[x]._id) {
						backup_docs[i]._rev = current_docs[x]._rev;		// copy rev to overwrite the existing doc w/backup
						ret.push(backup_docs[i]);
						break;
					}
				}
			}
			return ret;
		}
	}

	//------------------------------------------------------------
	// append data to a backup doc
	//------------------------------------------------------------
	dbs.append_backup_doc = function (req, cb) {
		t.couch_lib.getDoc({ db_name: ev.DB_SYSTEM, _id: req.params.backup_id, SKIP_CACHE: true }, (err_get, backup_doc) => {
			if (err_get || !backup_doc) {
				logger.error('[backup] cannot append. error getting existing backup doc:', err_get, backup_doc);
				return cb({ statusCode: 400, message: 'cannot append. error getting existing backup doc' });
			} else {

				const opts = {
					_id: backup_doc._id,
					_rev: backup_doc._rev,				// need the rev
					db_name: ev.DB_SYSTEM,
					att_name: req.params.att_name,
					attachment: req.body.attachment,
				};
				t.couch_lib.add_attachment(opts, (err, resp) => {
					if (err) {
						logger.error('[backup] unable to add attachment error:', err, resp);
						return cb(err, resp);
					} else {
						return cb(null, { message: 'ok', att_name: req.params.att_name });
					}
				});
			}
		});
	};

	//------------------------------------------------------------
	// get all backup ids
	//------------------------------------------------------------
	dbs.get_backup_ids = (cb) => {
		const opts = {
			db_name: ev.DB_SYSTEM,
			_id: '_design/athena-v1',
			view: '_doc_types',
			query: t.misc.formatObjAsQueryParams({ include_docs: false, keys: [BACKUP_DOC_TYPE], group: false, reduce: false }),
		};
		t.couch_lib.getDesignDocView(opts, (err, resp) => {
			if (err) {
				logger.error('[backup] unable to get backup ids, error:', err, resp);
				return cb(err, resp);
			} else {
				const ret = { ids: [] };
				if (resp && resp.rows) {
					for (let i in resp.rows) {
						ret.ids.push(resp.rows[i].id);
					}
				}
				return cb(null, ret);
			}
		});
	};

	//------------------------------------------------------------
	// delete old/redundant backup docs - find backups that are closest to a certain age and keep those ones
	//------------------------------------------------------------
	dbs.prune_backups = (cb) => {
		cb = cb || function () { };							// init
		let today = Date.now();
		const save_rules = [								// save backup that is closest to "days_old". goal is to save 1 @ 90, 60, 30, 20, 10 and 7-0 days
			{ days_old: 120 },								// this one is bogus, its like a buffer, added b/c it makes the alg simpler
			{ days_old: 90 },
			{ days_old: 60 },
			{ days_old: 30 },
			{ days_old: 20 },
			{ days_old: 10 },
			{ days_old: 7 },
			{ days_old: 6 },
			{ days_old: 5 },
			{ days_old: 4 },
			{ days_old: 3 },
			{ days_old: 2 },
			{ days_old: 1 },
			{ days_old: 0 },
		];

		dbs.get_backup_ids((err, data) => {													// first get the backup doc ids
			if (!data || !Array.isArray(data.ids)) {
				return cb();																// some sort of error, assume we have no backups
			} else {
				const backups = [];
				for (let i in data.ids) {													// build object that we will use to prune docs
					const backup_ts = data.ids[i].substring(DOC_ID_BASE.length);			// timestamp is after the base text in the doc id
					backups.push({ timestamp: backup_ts, saved: false, id: data.ids[i] });
				}
				prune(backups, () => {														// delete the extras
					summary(backups);														// print what was kept
					return cb();
				});
			}
		});

		// remove excessive backups
		function prune(backups, cb_prune) {
			let temp = [];
			let del = [];
			mark_backups_to_keep(backups);													// mark the ones that we will keep
			for (let i in backups) {
				if (backups[i].saved === true) {
					temp.push(backups[i]);
				} else {
					del.push({ pos: i, id: backups[i].id });
				}
			}
			logger.debug('[backup-prune] deleting', del.length, 'backups, pos:', del.length >= 1 ? del[0].pos : 'n/a');
			backups = temp;											// overwrite to delete the other backups

			t.async.eachLimit(del, 1, (del_obj, cb_deleted) => {	// delete each excessive backup, 1 at a time since they are large
				const del_opts = {
					db_name: ev.DB_SYSTEM,
					_id: del_obj.id,
				};
				t.otcc.repeatDelete(del_opts, 1, (err, resp) => {
					return cb_deleted();
				});
			}, () => {
				return cb_prune();
			});
		}

		// keep some backups according to the rules
		function mark_backups_to_keep(backups) {
			for (let i in save_rules) {							// iter through the rules, find 1 backup per rule
				const closest_pos = find_closest_backup_pos(backups, save_rules[i].days_old);
				if (closest_pos !== null) {
					backups[closest_pos].saved = true;			// mark it as saved
					//console.log('[' + save_rules[i].days_old + '] the closest is pos', closest_pos);
				} else {
					//console.log('[' + save_rules[i].days_old + '] all backups must be taken');
				}
			}
			save_all_0_day_backups();							// also save these, unlimited number of them
		}

		// save any backup under 1 day old
		function save_all_0_day_backups(backups) {
			for (let i in backups) {
				if (backups[i].saved === true) {				// if its already saved, skip it
					continue;
				} else {
					const elapsed_from_now = Math.abs(today - backups[i].timestamp);
					if (elapsed_from_now < 1000 * 60 * 60 * 24) {
						backups[i].saved = true;
					}
				}
			}
		}

		// find the backup that is the closest to the age, in days, absolute value
		function find_closest_backup_pos(backups, days_old) {
			let closest_pos = null;
			let closest_elapsed = null;
			for (let i in backups) {
				if (backups[i].saved === true) {			// if its already taken, skip it
					continue;
				}
				const elapsed_from_days_old = Math.abs(today - backups[i].timestamp - (days_old * 1000 * 60 * 60 * 24));
				if (closest_elapsed === null || elapsed_from_days_old <= closest_elapsed) {
					closest_pos = i;
					closest_elapsed = elapsed_from_days_old;
				}
			}

			return closest_pos;
		}

		// print summary of kept backup ages
		function summary(backups) {
			const days_old = [];
			for (let i in backups) {
				const elapsed_from_days_old = Math.abs(today - backups[i].timestamp);
				days_old.push(Math.round((elapsed_from_days_old / (1000 * 60 * 60 * 24))));
			}
			logger.debug('[backup-prune] kept backups ages in days:', JSON.stringify(days_old));
		}
	};

	return dbs;
};
