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

module.exports = function (logger, ev, t) {
	const lockLib = {};
	const MAX_APPLY_WAIT_MS = 2000;					// before applying for a lock instances will wait up to this amount (exact duration is random)
	const MIN_APPLY_WAIT_MS = 0;					// before applying for a lock instances will wait this minimal amount
	const uuid = process.env.ATHENA_ID + '-' + t.misc.generateRandomString(4);	// the unique id for this node process

	// build lock's doc id from lock name
	function build_lock_id(lock_name) {
		return '04_lock_' + lock_name;
	}

	// ----------------------------------------
	// Apply for Lock - attempt no guarantee
	// ----------------------------------------
	/*
		opts: {
			lock: "mine",					// partial id of the lock doc (full _id gets built)
			max_locked_sec: 300000 			// time in seconds to keep the lock, lock expires after this time
			meta: {}						// w.e data you want, will be stored in lock doc, think debug
		}
	*/
	lockLib.apply = function (opts, cb) {
		if (!cb) { cb = function () { }; }
		const delay = Math.round(MIN_APPLY_WAIT_MS + Math.random() * (MAX_APPLY_WAIT_MS - MIN_APPLY_WAIT_MS));
		const lock_id = build_lock_id(opts.lock);
		logger.debug('[lock] applying for lock', lock_id, uuid, delay);

		setTimeout(() => {			// wait a random number of time to space out the instances attempts
			check_lock_doc(lock_id, (e, lock_doc) => {
				if (e != null) {
					return cb(e);
				} else {
					const options = {
						doc: lock_doc,
						max_locked_sec: opts.max_locked_sec,
						meta: opts.meta
					};
					apply_for_lock(options, (e) => {
						t.couch_lib.deleteConflicts({ db_name: ev.DB_SYSTEM, _id: lock_id });		// always clean up our mess (very important!)
						return cb(e);
					});
				}
			});
		}, delay);
	};

	// get or create the lock doc
	function check_lock_doc(lock_id, cb_lock_doc) {
		t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: lock_id, SKIP_CACHE: true }, (r_err, r_doc) => {
			if (r_err || !r_doc) {
				if (t.ot_misc.get_code(r_err) !== 404) {
					logger.error('[lock] error getting lock doc', lock_id, r_err, r_doc);
					return cb_lock_doc('cannot get lock doc');
				} else {
					const new_lock_doc = {			// if its a 404 create a new lock document
						_id: lock_id,
						type: 'lock_doc',
					};
					t.otcc.writeDoc({ db_name: ev.DB_SYSTEM }, new_lock_doc, (w_err, w_doc) => {
						if (w_err) {
							logger.error('[lock] cannot create lock doc', lock_id, uuid);
							return cb_lock_doc('cannot create lock');
						} else {
							logger.info('[lock] created new lock doc', lock_id, uuid);	// all good
							return cb_lock_doc(null, w_doc);
						}
					});
				}
			} else {
				logger.debug('[lock] lock doc was found', r_doc._id, uuid);
				return cb_lock_doc(null, r_doc);										// all good
			}
		});
	}

	// attempt to get the lock
	function apply_for_lock(opts, cb_apply) {
		const doc = opts.doc;
		if (!doc.prev_owner) { doc.prev_owner = {}; }
		if (!doc.prev_owner.ts_watchdog) { doc.prev_owner.ts_watchdog = 0; }
		if (!doc.history) { doc.history = []; }

		// ---- Check if lock is taken ---- //
		const elapsed_ms = Date.now() - doc.prev_owner.ts_watchdog;
		if (elapsed_ms <= doc.prev_owner.watchdog_limit) {
			if (doc.prev_owner.ts_released === 0) {
				if (doc.prev_owner.uuid !== uuid) {
					logger.warn('[lock] lock taken and valid', doc._id, 'last activity:', t.misc.friendly_ms(elapsed_ms),
						'ago, limit:', t.misc.friendly_ms(doc.prev_owner.watchdog_limit));
					return cb_apply('do not own lock');
				} else {
					logger.warn('[lock] lock taken (be me) and valid', doc._id, uuid);
					return cb_apply('other task has lock');
				}
			}
		}

		// ---- Apply for the lock ---- //
		logger.debug('[lock] nobody owns the lock - applying for lock', doc._id, uuid);
		doc.history.push(doc.prev_owner);									// copy the last entry here
		doc.history.splice(0, doc.history.length - 8);						// keep the last 8 runs
		doc.prev_owner = {
			uuid: uuid,
			ts_awarded: Date.now(),											// be optimistic, act like we will win
			ts_watchdog: Date.now(),
			ts_released: 0,													// we set this later
			watchdog_limit: opts.max_locked_sec * 1000,
			meta: opts.meta,
		};

		t.otcc.writeDoc({ db_name: ev.DB_SYSTEM }, doc, (err) => {
			if (err) {
				logger.warn('[lock] cannot write lock doc for applying', doc._id, uuid);
				return cb_apply('cannot write lock');
			} else {
				logger.info('[lock] I got the lock! =)', doc._id, uuid);	// all good
				return cb_apply(null);
			}
		});
	}

	// ----------------------------------------
	// Release lock
	// ----------------------------------------
	lockLib.release = function (lock, cb) {
		if (!cb) { cb = function () { }; }
		const lock_id = build_lock_id(lock);
		logger.debug('[lock] releasing the lock', lock_id, uuid);

		t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: lock_id, SKIP_CACHE: true }, (err, doc) => {
			if (err || !doc) {
				logger.error('[lock] ' + lock_id + ' cannot get lock doc', err);
				return cb('cannot get lock doc');
			} else {

				// ---- Check if lock is still taken ---- //
				if (!doc.prev_owner) { doc.prev_owner = {}; }
				if (!doc.prev_owner.ts_watchdog) { doc.prev_owner.ts_watchdog = 0; }
				const elapsed_ms = Date.now() - doc.prev_owner.ts_watchdog;
				if (elapsed_ms > doc.prev_owner.watchdog_limit) {
					logger.debug('[lock] ' + lock_id + ' - releasing - lock already expired...', t.misc.friendly_ms(elapsed_ms));
				} else {
					logger.debug('[lock] ' + lock_id + ' - releasing - lock\'s watchdog is still okay', t.misc.friendly_ms(elapsed_ms));
				}

				// ---- Do we still own it? ---- //
				if (doc.prev_owner.uuid !== uuid) {
					logger.warn('[lock] ' + lock_id + ' I do not own the lock to release it');
					return cb(null);
				} else {

					// ---- Release the lock ---- //
					logger.debug('[lock] ' + lock_id + ' still have valid lock, releasing it, last activity:', t.misc.friendly_ms(elapsed_ms));
					doc.prev_owner.ts_released = Date.now();
					doc.prev_owner.elapsed = t.misc.friendly_ms(elapsed_ms);
					t.otcc.writeDoc({ db_name: ev.DB_SYSTEM }, doc, (err2, doc2) => {
						if (err2) {
							logger.warn('[lock] ' + lock_id + ' cannot write lock doc for release');	// likely don't care, someone else got the lock
							return cb('cannot write doc');
						} else {
							logger.info('[lock] ' + lock_id + ' I released the lock!');
							return cb(null);
						}
					});
				}
			}
		});
	};

	// ----------------------------------------
	// Update Lock Watchdog - keep watchdog from timing out AND double check our lock status
	// ----------------------------------------
	/*lockLib.update_watchdog = function (lock, cb) {
		if (!cb) { cb = function () { }; }
		const lock_id = build_lock_id(lock);
		logger.debug('[lock] update_watchdog()', lock_id, uuid);

		// ---- Read Lock Doc ---- //
		t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: lock_id, SKIP_CACHE: true }, function (err, doc) {
			if (err || !doc) {
				logger.error('[lock]', lock_id + ' cannot get lock doc for watchdog', err);
				return cb(err);
			} else {

				// --- Make Sure We Still Own Lock ---- //
				const elapsed_ms = Date.now() - doc.prev_owner.ts_watchdog;
				if (!doc.prev_owner.ts_watchdog) { doc.prev_owner.ts_watchdog = 0; }
				if (doc.prev_owner.uuid !== uuid) {
					return cb('do not own lock');
				} else {
					logger.debug('[lock] ' + lock_id + ' watchdog - last activity:', elapsed_ms, 'ms, limit:', doc.prev_owner.watchdog_limit);

					if (doc.prev_owner.ts_released > 0) {
						return cb('lock already released');
					} else {

						// ---- Update Watchdog Timestamp ---- //
						doc.prev_owner.ts_watchdog = Date.now();		// update watchdog timer
						t.otcc.writeDoc({ db_name: ev.DB_SYSTEM }, doc, function (err2, doc2) {
							if (err2) {				// sometimes another parallel task updated the timer before this one, ie write conflict
								logger.warn('[lock] ' + lock_id + ' could not update lock\'s watchdog ts, might already be updated, trying again');
								return setTimeout(function () {
									lockLib.update_watchdog(lock, cb);	// repeat until we can write or we lose lock
								}, (Math.random() * 1000).toFixed(0));
							} else {
								logger.debug('[lock] ' + lock_id + ' updated watchdog ts');
								return cb(null);						// all good
							}
						});
					}
				}
			}
		});
	};*/

	return lockLib;
};
