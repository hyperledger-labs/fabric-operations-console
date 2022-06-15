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
//=======================================================================================================
// OpTools Cached  version of the couchdb crud library
//=======================================================================================================
module.exports = (logger, ev, t, couch, nodeCache) => {
	const cache_couch = {};

	// write "value" to the cache under "key"
	cache_couch.write2cache = (key, value, expires_s, cb) => {
		if (!ev.MEMORY_CACHE_ENABLED) {
			if (cb) { return cb(null, value); }
		} else if (!key) {
			logger.warn('[c-couch] missing key to write 2 cache...');
			if (cb) { return cb(500, value); }
		} else {
			// key sometimes contains email address, do not uncomment for prod
			//logger.debug('[c-couch] writing to cache the key: ' + key + ', expires: ' + expires_s + 'secs');
			if (expires_s > 300) {
				logger.error('\n\n[c-couch] WOA! the cl cache expiration is too long', expires_s);
			}
			nodeCache.set(key, value, expires_s);
			if (cb) { return cb(null, value); }
		}
	};

	// get the expiration in seconds
	/*
		options: {
			expires: 1000 * 60 * 1, 	// expiration of key in ms (note reading the key does NOT bump the expiration)
		}
	*/
	function ret_expiration_s(options) {
		let expiration_s = 30;								// default xx sec, very volatile cache
		if (options && !isNaN(options.expires)) {
			expiration_s = (options.expires / 1000).toFixed(2);
		}
		return expiration_s;
	}

	//=======================================================================================================
	// Create/Write Doc Functions
	//=======================================================================================================
	/*
		options: {
			expires: 10000,					// time in ms to evict doc from cache (note reading the key again does NOT bump the expiration)
			DO_NOT_WRITE_THROUGH: false,	// if we should NOT write the doc back to couchdb, keep it in memory only
			EXCLUDE_CACHE: false,			// [optional] if we should NOT write the doc into cache
		}
	*/
	cache_couch.createNewDoc = (opts, doc, options, cb) => {
		if (typeof options === 'function') {
			cb = options;
			options = {};
		}
		if (options && options.DO_NOT_WRITE_THROUGH) {
			if (options && options.EXCLUDE_CACHE === true) {				// if we should write to cache, do
				logger.debug('[c-couch] NOT writing to cache b/c opt to exclude is set');
			} else {
				const key = build_key({ db_name: opts.db_name, _id: doc._id });
				cache_couch.write2cache(key, doc, ret_expiration_s(options));
			}
			if (cb) { return cb(null, doc); }
		} else {
			couch.createNewDoc(opts, doc, (errCode, resp) => {
				if (!errCode) {
					if (options && options.EXCLUDE_CACHE === true) {		// if we should write to cache, do
						logger.debug('[c-couch] NOT writing to cache b/c opt to exclude is set');
					} else {
						const key = build_key({ db_name: opts.db_name, _id: doc._id });
						cache_couch.write2cache(key, doc, ret_expiration_s(options));
					}
				}
				if (cb) { return cb(errCode, resp); }
			});
		}
	};
	/*
		options: {
			expires: 10000,					// time in ms to evict doc from cache (note reading the key again does NOT bump the expiration)
			DO_NOT_WRITE_THROUGH: false,	// if we should NOT write the doc back to couchdb, keep it in memory only
			EXCLUDE_CACHE: false,			// [optional] if we should NOT write the doc into cache
		}
	*/
	cache_couch.writeDoc = (opts, doc, options, cb) => {
		if (typeof options === 'function') {
			cb = options;
			options = {};
		}

		if (options && options.DO_NOT_WRITE_THROUGH) {
			if (options && options.EXCLUDE_CACHE === true) {				// if we should write to cache, do
				logger.debug('[c-couch] NOT writing to cache b/c opt to exclude is set');
			} else {
				const key = build_key({ db_name: opts.db_name, _id: doc._id });
				cache_couch.write2cache(key, doc, ret_expiration_s(options));
			}
			if (cb) { return cb(null, doc); }
		} else {
			couch.writeDoc(opts, doc, (errCode, resp) => {
				if (!errCode) {
					if (options && options.EXCLUDE_CACHE === true) {		// if we should write to cache, do
						logger.debug('[c-couch] NOT writing to cache b/c opt to exclude is set');
					} else {
						const key = build_key({ db_name: opts.db_name, _id: doc._id });
						cache_couch.write2cache(key, doc, ret_expiration_s(options));
					}
				}
				if (cb) { return cb(errCode, resp); }
			});
		}
	};

	// write doc safely, repeats if write had doc update conflict (409)
	cache_couch.repeatWriteSafe = (opts, modify_doc_logic_sync, cb) => {
		couch.repeatWriteSafe(opts, modify_doc_logic_sync, (errCode, resp) => {
			if (errCode != null) {
				if (cb) { return cb(errCode, resp); }
			} else {
				const key = build_key({ db_name: opts.db_name, _id: opts._id, doc: opts.doc });
				cache_couch.write2cache(key, resp, ret_expiration_s(null), () => {
					if (cb) { return cb(errCode, resp); }
				});
			}
		});
	};

	cache_couch.repeatDelete = (opts, attempt, cb) => {
		couch.repeatDelete(opts, attempt, (errCode, resp) => {
			if (errCode) {
				if (cb) { return cb(errCode, resp); }
			} else {
				const key = build_key({ db_name: opts.db_name, _id: opts._id, doc: opts.doc });
				cache_couch.write2cache(key, resp, ret_expiration_s(null), () => {
					if (cb) { return cb(errCode, resp); }
				});
			}
		});
	};

	//=======================================================================================================
	// Read Functions
	//=======================================================================================================
	// Look up a doc in the cache first, if its a miss try couchdb
	/*
		opts: {
			expires: 10000,					// time in ms to evict doc from cache
			SKIP_CACHE: false,				// if we should NOT read from cache, only couchdb
			EXCLUDE_CACHE: false,			// if we should NOT write the doc into cache
		}
	*/
	cache_couch.getDoc = (opts, cb) => {
		readCache(opts, cb);
	};

	// Query a view in the cache first, if its a miss try couchdb
	/*
		opts: {
			expires: 10000,					// time in ms to evict doc from cache
			SKIP_CACHE: false,				// if we should NOT read from cache, only couchdb
			EXCLUDE_CACHE: false,			// if we should NOT write the doc into cache
		}
	*/
	cache_couch.getDesignDocView = (opts, cb) => {
		readCache(opts, cb);
	};

	// Pass through for getting db info
	cache_couch.getDatabase = (opts, cb) => {
		couch.getDatabase(opts, (errCode, resp) => {
			if (cb) { return cb(errCode, resp); }
		});
	};

	// design doc views and regular get docs look the same
	function readCache(opts, cb) {
		if (ev.MEMORY_CACHE_ENABLED) {
			const log_name = '"' + opts._id + '"' + (opts.view ? (' view: "' + opts.view + '"') : '');
			if (opts.SKIP_CACHE === true) {
				logger.debug('[c-couch] skipping cache b/c opt to skip is set', log_name);
				read_from_couchdb((cl_err, cl_resp) => {
					return cb(cl_err, cl_resp);
				});
			} else {
				const key = build_key(opts);
				if (!key) {
					logger.error('[c-couch] *cache error* unable to build key for', log_name);
					return cb(404, { error: 'unable to build key' });
				} else {
					const cache_resp = nodeCache.get(key);
					if (!cache_resp) {
						logger.debug('[c-couch] *cache miss* for doc:', log_name);	// do not print "key", may contain email
						read_from_couchdb((cl_err, cl_resp) => {
							return cb(cl_err, cl_resp);
						});
					} else {
						logger.debug('[c-couch] *cache hit* for doc:', log_name);	// do not print "key", may contain email
						return cb(null, cache_resp);
					}
				}
			}
		} else {
			read_from_couchdb((cl_err, cl_resp) => {
				return cb(cl_err, cl_resp);
			});
		}

		// read the doc from couchdb
		function read_from_couchdb(cl_cb) {
			let read_op = couch.getDoc;
			if (opts.view) {										// if its a view, use this function
				read_op = couch.getDesignDocView;
			}

			read_op(opts, (err_cl, resp_cl) => {
				const key = build_key(opts);
				if (err_cl != null) {
					logger.error('[c-couch] error getting data from couchdb. doc id:', opts._id, err_cl, resp_cl);
				} else {
					if (opts.EXCLUDE_CACHE == null) {				// update cache
						cache_couch.write2cache(key, resp_cl, ret_expiration_s(opts));
					}
				}
				return cl_cb(err_cl, resp_cl);
			});
		}
	}

	//=======================================================================================================
	// Clear Keys in Cache
	//=======================================================================================================
	// evict a key based on options
	cache_couch.evict = (options, cb) => {
		if (ev.MEMORY_CACHE_ENABLED) {
			nodeCache.del(build_key(options));
		}
		if (cb) { return cb(null, null); }
	};

	// evict this exact key
	cache_couch.evict_manual = (key, cb) => {
		if (ev.MEMORY_CACHE_ENABLED) {
			nodeCache.del(key);
		}
		if (cb) { return cb(null, null); }
	};

	// evict all keys
	cache_couch.flush_cache = () => {
		if (ev.MEMORY_CACHE_ENABLED) {
			nodeCache.flushAll();
		}
	};

	//=======================================================================================================
	// Misc. Functions
	//=======================================================================================================
	// get stats
	cache_couch.get_stats = () => {
		if (!ev.MEMORY_CACHE_ENABLED) {
			return null;
		} else {
			return nodeCache.getStats();
		}
	};

	// get all the current keys
	cache_couch.keys = () => {
		if (!ev.MEMORY_CACHE_ENABLED) {
			return null;
		} else {
			return nodeCache.keys();
		}
	};

	// get all the current keys
	cache_couch.get_keys = cb => {
		if (!ev.MEMORY_CACHE_ENABLED) {
			if (cb) { return cb(null, null); }
		} else {
			const keys = nodeCache.keys();
			if (cb) { return cb(null, keys); }
		}
	};

	// build the key to use for the cache
	function build_key(options) {
		let ret = '';
		if (!options) {
			logger.error('[c-couch] missing "options" field in build key');
			return null;
		} else if (!options.db_name) {
			logger.error('[c-couch] missing "db_name" option in build key');
			return null;
		} else if (!options._id && !options.query && !options.view) {
			if (!options.doc || !options.doc._id) {	// only required if either options._id, options.query, or options.view is missing
				logger.error('[c-couch] missing an option to build the cache key');
				return null;
			}
		} else {
			ret = options.db_name;															// this should always be found

			// its important to use a delimiter here, else its possible for two different sets of keys to look the same
			if (options.doc && options.doc._id) { ret += ':' + options.doc._id; }
			if (options.view) { ret += ':' + options.view; }								// this will only be found if it is a couchdb view query
			if (options._id) { ret += ':' + options._id; }									// this will only be found if its a simple doc query
			if (options.query) { ret += ':' + options.query; }								// this is for views
		}

		//logger.debug('\n\n[c-couch] built key', ret);
		return ret;
	}

	return cache_couch;
};
