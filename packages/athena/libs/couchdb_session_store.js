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

//-----------------------------------------------------------------------------------
// Cloudant/CouchDB session store + in memory cache + auto cleanup on expiration + auto design doc setup on startup
//-----------------------------------------------------------------------------------
/*
Created by IBM 09/19/2016 - dshuffma
Last Updated 06/18/2019 - dshuffma

Requires:
	- [x] express-session
	- [x] node-cache - pass it inside "tools" via name "NodeCache"
	- [x] misc.js - pass it inside "tools"

Usage:
	const CouchdbStore = require('./libs/couchdb-store.js')(session, tools, logger);
	const store = new CouchdbStore({
									name: 'uniqueNameHere',
									DB_CONNECTION_STRING: 'https://basic:auth@cloudant.com',
									DB_SESSIONS: 'sessions',
									expire_ms: 10 * 60 * 60 * 1000,
									enable_session_cache: true,
								});
	sessionMiddleware = session({
		store: store,
		// more fields, see express-session
	});
*/

module.exports = function (session, tools, logger) {
	const Store = session.Store;

	function couchSessionStore(opts) {
		opts = opts || {};
		Store.call(this, opts);
		if (!opts.DB_SESSIONS && !opts.DB_CONNECTION_STRING) {								// throw input error
			throw '[session store] Options Error - You must define "DB_SESSIONS" and "DB_CONNECTION_STRING"';
		} else if (!opts.name) {
			throw '[session store] Options Error - You must define "name"';
		}

		this.DB_SESSIONS = opts.DB_SESSIONS;												// remember a bunch of settings
		this.couch_lib = require('./couchdb.js')(logger, tools, opts.DB_CONNECTION_STRING); // uses its own couch lib to avoid the other couch cache
		this.destroy_expired_ms = opts.destroy_expired_ms || (10 * 60 * 60 * 1000);			// server side clean up, default 10 hours
		this.throttle_ms = opts.throttle_ms || 10 * 60 * 1000;								// throttle how often we resave sessions to db, default 10 minutes
		this.expire_ms = opts.expire_ms || (24 * 60 * 60 * 1000);							// how long a session should last, default 24 hours
		this.design_doc_name = '_design/' + build_name(opts.name);
		this.doc_type = build_name(opts.name);
		this.enable_session_cache = (opts.enable_session_cache === false) ? false : true;
		this.session_docs_path_to_username = opts.session_docs_path_to_username;			// optional doc path to the username in the session doc
		this.session_docs_path_to_uuid = opts.session_docs_path_to_uuid;
		this.version = 'v2';									// hard code this, change when we edit the session's design doc

		const session_cache_opts = {							// [in memory cache options]
			stdTTL: opts.cache_expiration || 120,				// the default cache expiration in seconds
			checkperiod: opts.cache_check_period || 500,		// the period in seconds for the delete check interval
			deleteOnExpire: true								// if true cached values will be deleted automatically when they expire
		};
		if (this.enable_session_cache) {
			logger.debug('[session store] enabling memory cache');
			this.cache = new tools.NodeCache(session_cache_opts);
		} else {
			logger.debug('[session store] disabling memory cache');
		}

		if (this.destroy_expired_ms > 0) {						// clean up session doc interval
			this.destroyExpiredInterval = setInterval(this._destroyExpiredSessions.bind(this), this.destroy_expired_ms);
		}

		if (opts.skip_auto_startup !== true) {					// don't self startup if running from test
			this._checkSetup(opts, (err, resp) => {				// check the session setup and expire old session docs right now
				this._destroyExpiredSessions();
			});
		}
	}

	// make a uri safe session id
	// prepend an 's' to prevent couchdb doc _id errors
	couchSessionStore.prototype._safe_sid = function (id) {
		return 's' + encodeURIComponent(decodeURIComponent(id)); // decode first just incase, it won't do anything if its not encoded
	};

	// abbreviate the string
	couchSessionStore.prototype._abb = function (str) {
		if (typeof str === 'string') {
			return str.substring(0, 5);							// 5 will show 4 unique characters (first character is always "s")
		} else {
			return null;
		}
	};

	// build a tag for the log
	function log_tag(sid) {
		return '[session store - ' + couchSessionStore.prototype._abb(sid) + ']';
	}

	// construct doc "type" field, also used to build the view name
	function build_name(name) {
		return 'session_' + name;
	}

	couchSessionStore.prototype.__proto__ = Store.prototype;		// inherit from session store

	// setup design doc, used to delete expired docs
	couchSessionStore.prototype._setupDesignDoc = function (opts, cb) {
		const g_opts = {
			db_name: this.DB_SESSIONS,
			_id: '_design/' + this.doc_type,
		};
		this.couch_lib.getDoc(g_opts, (err, resp) => {
			if (err) {
				this._writeDesignDoc(opts, (err) => {
					return cb(err);
				});
			} else {
				if (resp && resp.version !== this.version) {		// update the design doc, new version
					opts.old_doc = resp;
					this._writeDesignDoc(opts, (err) => {
						return cb(err);
					});
				} else {
					logger.debug('[session store] found session design doc in place');
					return cb(err);
				}
			}
		});
	};

	// create the design doc for sessions database
	couchSessionStore.prototype._writeDesignDoc = function (opts, cb_write) {
		const designDoc = {
			_id: '_design/' + this.doc_type,
			version: this.version,
			views: {
				by_expiration: {
					map: 'function(doc){' +
						'if(doc.type && doc.type === "' + this.doc_type + '" && doc.expires){' +
						'emit(doc.expires, doc._id);}}'
				},
				_conflicts: {
					map: 'function (doc) { if (doc._conflicts) {emit(null, [doc._rev].concat(doc._conflicts));}}'
				}
			}
		};

		if (opts.old_doc && opts.old_doc._rev) {
			designDoc._rev = opts.old_doc._rev;
		}

		if (this.session_docs_path_to_username && typeof this.session_docs_path_to_username === 'string') {
			designDoc.views.by_username = {
				map:
					`function(doc){
						try{
							if(doc.type && doc.type === "` + this.doc_type + '" && ' + this.session_docs_path_to_username + `){
								emit(` + this.session_docs_path_to_username + `, doc._id);
							}
						}catch(e){}
					}`
			};
		}
		if (this.session_docs_path_to_uuid && typeof this.session_docs_path_to_uuid === 'string') {
			designDoc.views.by_uuid = {
				map:
					`function(doc){
						try{
							if(doc.type && doc.type === "` + this.doc_type + '" && ' + this.session_docs_path_to_uuid + `){
								emit(` + this.session_docs_path_to_uuid + `, doc._id);
							}
						}catch(e){}
					}`
			};
		}

		this.couch_lib.createNewDoc({ db_name: this.DB_SESSIONS }, designDoc, (err, resp) => {
			if (err) {
				logger.error('[session store] session design doc was NOT created', err, resp);
				cb_write(err);
			} else {
				logger.debug('[session store] session design doc created/edited', err);
				setTimeout(() => { cb_write(err); }, 1000);				// delay callback to allow session doc to build view
			}
		});
	};

	// check if db sessions exists
	couchSessionStore.prototype._checkDatabase = function (cb) {
		this.couch_lib.getDatabase({ db_name: this.DB_SESSIONS }, (err, resp) => {
			if (err) {
				logger.error(err);
				throw '[session store] error - session database not found: ' + this.DB_SESSIONS;
			} else {
				logger.debug('[session store] session database found: ' + this.DB_SESSIONS);
			}
			return cb(err);
		});
	};

	// check initial setup
	couchSessionStore.prototype._checkSetup = function (opts, cb) {
		this._checkDatabase((err) => {
			if (err) {
				return cb(err);
			} else {
				this._setupDesignDoc(opts, (err) => {
					return cb(err);
				});
			}
		});
	};

	// get session for memory if we can, then try couchdb
	couchSessionStore.prototype._get_session = function (safe_sid, skip_cache, cb) {
		const ask_couch = (couch_cb) => {
			const g_opts = {
				db_name: this.DB_SESSIONS,
				_id: safe_sid,
			};
			this.couch_lib.getDoc(g_opts, (err, doc) => {			// now try couchdb
				if (err || !doc) {
					return couch_cb(err, doc);						// return couch's error response
				} else {
					if (this.enable_session_cache) {
						this.cache.set(safe_sid, doc);
					}
					return couch_cb(err, doc);						// return couch's resp, all good
				}
			});
		};

		// work starts here
		if (this.enable_session_cache && skip_cache === false) {
			const cache_resp = this.cache.get(safe_sid);		// first try the cache
			if (!cache_resp) {									// cache miss
				ask_couch((couch_err, couch_resp) => {
					return cb(couch_err, couch_resp);
				});
			} else {
				return cb(null, cache_resp);					// cache hit, return it
			}
		} else {
			ask_couch((couch_err, couch_resp) => {
				return cb(couch_err, couch_resp);
			});
		}
	};

	// delete many docs at once
	couchSessionStore.prototype._bulkDelete = function (docs, cb) {
		const deleted_docs = [];
		for (let i in docs) {		// prepare couch bulk delete options
			const obj = docs[i];
			deleted_docs.push({ _id: obj.doc._id, _rev: obj.doc._rev, _deleted: true });

			// delete it from the cache too
			if (obj.doc && obj.doc.sess && obj.doc.sess.sid) {
				const safe_sid = couchSessionStore.prototype._safe_sid(obj.doc.sess.sid);
				if (this.enable_session_cache) {
					this.cache.del(safe_sid);
				}
			}
		}

		if (deleted_docs.length > 0) {
			logger.debug('[session store] deleting bulk sessions', deleted_docs.length);
			this.couch_lib.bulkDatabase({ db_name: this.DB_SESSIONS }, { docs: deleted_docs }, (err, resp) => {
				if (err) {
					logger.warn('[session store] could not delete ' + docs.length + ' session docs', err);
				} else {
					logger.debug('[session store] deleted ' + docs.length + ' session docs');
				}
				return cb();
			});
		} else {
			logger.debug('[session store] nothing to delete', deleted_docs.length);
			return cb();
		}
	};

	// remove expired session docs
	couchSessionStore.prototype._destroyExpiredSessions = function (cb) {
		cb = cb || function () { };
		if (tools.ot_misc.server_is_closed()) {				// don't run during graceful shutoff
			return cb();
		} else {
			const options = {
				db_name: this.DB_SESSIONS,
				_id: this.design_doc_name,
				view: 'by_expiration',
				query: tools.misc.formatObjAsQueryParams({ endkey: Date.now(), include_docs: true }),		// only get expired ones
			};
			this.couch_lib.getDesignDocView(options, (err, docs) => {
				if (err || !docs || !docs.rows) {
					logger.debug('[session store] 0 expired sessions');
					return cb(err);
				} else {
					logger.debug('[session store] deleting expired sessions via bulk delete');
					this._bulkDelete(docs.rows, (err2, resp2) => {
						return cb(err2, resp2);
					});
				}
			});
		}
	};

	// expose cache stats
	couchSessionStore.prototype._cache_stats = function () {
		if (this.enable_session_cache) {
			return this.cache.getStats();
		} else {
			return null;
		}
	};

	// expose cache keys
	couchSessionStore.prototype._cache_keys = function () {
		if (this.enable_session_cache) {
			return this.cache.keys();
		} else {
			return null;
		}
	};

	// expose flush
	couchSessionStore.prototype._flush_cache = function () {
		if (this.enable_session_cache) {
			this.cache.flushAll();
		}
	};

	// remove all sessions with this uuid session docs
	couchSessionStore.prototype._destroySessionByUuid = function (uuid, cb) {
		cb = cb || function () { };
		if (!uuid || typeof uuid !== 'string') {
			logger.debug('[session store] cannot delete sessions for unknown uuid');
			return cb({ statusCode: 400, error: 'cannot delete sessions for unknown uuid' });
		} else {
			const options = {
				db_name: this.DB_SESSIONS,
				_id: this.design_doc_name,
				view: 'by_uuid',
				query: tools.misc.formatObjAsQueryParams({ key: uuid, include_docs: true }),
			};
			this.couch_lib.getDesignDocView(options, (err, docs) => {
				if (err || !docs) {
					logger.warn('[session store] could not find docs to delete:', err, docs);
					return cb(err);
				} else if (!docs.rows || docs.rows.length === 0) {
					logger.debug('[session store] 0 session docs found for uuid:', uuid);
					return cb(err);
				} else {
					logger.debug('[session store] deleting sessions for uuid via bulk delete:', uuid);
					this._bulkDelete(docs.rows, cb);
				}
			});
		}
	};

	//------------------------------------------------------------------------------------------------------------
	// Session Store Spec. Functions
	//------------------------------------------------------------------------------------------------------------

	// ------------------------------------------------------------
	// Get - get a session doc from db/memory
	// ------------------------------------------------------------
	couchSessionStore.prototype.get = function (sid, cb) {
		const safe_sid = couchSessionStore.prototype._safe_sid(sid);
		this._get_session(safe_sid, false, (err, doc) => {
			if (err || !doc) {
				if (err && err.statusCode) {
					logger.warn(log_tag(safe_sid) + ' session doc not found, error code ' + err.statusCode);
					return cb({ code: 'ENOENT' });
				} else {																						// error getting session
					logger.warn(log_tag(safe_sid) + ' session doc not found, unknown error', err);
					return cb({ code: 'ENOENT' });
				}
			} else {
				const now = Date.now();
				if (doc.sess && doc.sess.cookie && doc.sess.cookie.expires && now >= doc.sess.cookie.expires) {	// expired session
					logger.warn(log_tag(safe_sid) + ' session doc found but its expired');
					return cb(null, null);
				} else {
					const ret = doc.sess;
					ret.sid = sid;
					return cb(null, ret);																		// all good
				}
			}
		});
	};

	// ------------------------------------------------------------
	// Destroy a session doc
	// ------------------------------------------------------------
	couchSessionStore.prototype.destroy = function (sid, cb) {
		const safe_sid = couchSessionStore.prototype._safe_sid(sid);
		this._get_session(safe_sid, true, (err, doc) => {
			if (err) {
				return cb(err);
			} else {
				this.couch_lib.deleteDoc({ db_name: this.DB_SESSIONS, _id: doc._id, _rev: doc._rev }, (err2, resp) => {
					if (err2) {
						logger.error(log_tag(safe_sid) + ' could not destroy session...', err2, resp);
						return cb(err2);
					} else {
						logger.debug(log_tag(safe_sid) + ' destroyed session');
						if (this.enable_session_cache) {
							this.cache.del(safe_sid);
						}
						return cb(null);
					}
				});
			}
		});
	};

	// ------------------------------------------------------------
	// Touch - do nothing
	// ------------------------------------------------------------
	couchSessionStore.prototype.touch = function (sid, sess, cb) {
		return cb(null);
	};

	// ------------------------------------------------------------
	// Set - edit or create a session doc
	// ------------------------------------------------------------
	couchSessionStore.prototype.set = function (sid, sess, cb) {
		const safe_sid = couchSessionStore.prototype._safe_sid(sid);
		const now = Date.now();
		const expires = now + this.expire_ms;

		const create_session = (doc, cb_create) => {
			sess.cookie.expires = null;										// if cookie.expires is not set cookie will self-destruct when browser closes
			sess.last_access = Date.now();
			doc = {
				_id: safe_sid,
				type: this.doc_type,
				sess: sess,
				expires: new Date(expires).getTime()						// backend expiration of cookie
			};
			sess.backend_expires = doc.expires;								// don't use logic to change! is a copy of doc.expires for the client side
			delete doc.sess.save;											// clear this junk, not sure where its coming from

			this.couch_lib.createNewDoc({ db_name: this.DB_SESSIONS }, doc, (err, wrote_doc) => {
				if (err) {
					logger.warn(log_tag(safe_sid) + ' could not create session doc', err.statusCode);
					if (this.enable_session_cache) {
						this.cache.del(safe_sid);							// there might be something wrong with cache's val, synchronous del, safe on dne
					}
					return cb_create(err);									// error passed doesn't seem to do anything
				} else {
					logger.debug(log_tag(safe_sid) + ' created session doc');
					if (this.enable_session_cache) {
						this.cache.set(safe_sid, wrote_doc);				// set the doc we wrote, b/c it has the latest _rev!
					}
					return cb_create();
				}
			});
		};

		const update_session = (doc, cb_update) => {
			let accessGap = now - doc.sess.last_access;
			doc.expires = null;
			delete doc.sess.save;											// clear this junk, not sure where its coming from

			sess.cookie.expires = null;										// checking if anything changed -> clear fields that screw up comparison
			doc.sess.cookie.expires = null;
			doc.sess.backend_expires = null;								// clear for compare, repopulated below
			sess.backend_expires = null;
			doc.sess.last_access = null;									// clear for compare, repopulated below
			sess.last_access = null;

			// if the only thing that has changed is expires/backend_expires then skip saving the doc
			const different_json = tools.misc.is_different(doc.sess, sess);
			if (different_json || accessGap > this.throttle_ms) {
				if (different_json) {
					logger.debug(log_tag(safe_sid) + ' updating session doc, something is different. accessGap: ' + tools.misc.friendly_ms(accessGap));
				} else {
					logger.debug(log_tag(safe_sid) + ' updating session doc, update last activity. accessGap: ' + tools.misc.friendly_ms(accessGap));
				}

				if (doc.sess.passport_profile && !sess.passport_profile) {	// prevent an update from clearing the passport data
					logger.warn(log_tag(safe_sid) + ' skipping session update.');
					return cb_update();
				}

				sess.last_access = Date.now();								// remember when this latest save occurred
				doc.expires = new Date(expires).getTime();					// plan for our demise
				sess.backend_expires = doc.expires;							// duplicate field

				doc.sess = sess;											// copy new obj over
				delete doc.sess.save;										// clear this junk, not sure where its coming from
				this.couch_lib.writeDoc({ db_name: this.DB_SESSIONS }, doc, (err, wrote_doc) => {
					if (err) {												// warn if error is not update conflict, update conflict is fine
						if (this.enable_session_cache) {
							this.cache.del(safe_sid);						// there might be something wrong with cache's val, synchronous  del
						}
						logger.warn(log_tag(safe_sid) + ' could not update session doc', JSON.stringify(err));	// log errors
						return cb_update();									// don't pass any errors, not worth it
					} else {
						logger.debug(log_tag(safe_sid) + ' updated session doc');
						if (this.enable_session_cache) {
							this.cache.set(safe_sid, wrote_doc);			// set the doc we wrote, b/c it has the latest _rev!
						}
						return cb_update();
					}
				});
			} else {														// skipping session doc update, too soon
				return cb_update();
			}
		};

		// work starts here
		this._get_session(safe_sid, true, (err, session_doc) => {
			if (err) {
				if (err.reason === 'deleted') {
					logger.error(log_tag(safe_sid) + ' session was deleted. cannot get sid:', safe_sid, err);
					return cb({ code: 'ENOENT' });
				} else {
					logger.debug(log_tag(safe_sid) + ' no session doc making a new one', safe_sid, err.statusCode);
					create_session(session_doc, (error, response) => {			// create new session doc
						return cb(error, response);
					});
				}
			} else {
				update_session(session_doc, (error, response) => {				// update existing session doc
					return cb(error, response);
				});
			}
		});
	};

	// ------------------------------------------------------------
	// Clear - remove all session docs
	// ------------------------------------------------------------
	couchSessionStore.prototype.clear = function (cb) {
		if (this.enable_session_cache) {
			this.cache.flushAll();												// sync.
		}

		setTimeout(() => {
			const options = {
				db_name: this.DB_SESSIONS,
				_id: this.design_doc_name,
				view: 'by_expiration',
				query: tools.misc.formatObjAsQueryParams({ include_docs: true }),	// get all docs
			};
			this.couch_lib.getDesignDocView(options, (err, docs) => {
				if (err) {
					return cb(err);
				} else {
					logger.debug('[session store] deleting all sessions via bulk delete');
					this._bulkDelete(docs.rows, () => {
						return cb(null, docs.rows.length);
					});
				}
			});
		}, (Math.random() * 1000).toFixed(0)); 		// small delay, little randomness to stagger reqs across instances
	};

	return couchSessionStore;
};
