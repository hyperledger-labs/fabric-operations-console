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
// Basic CRUD Functions to a CouchDB Endpoint
//=======================================================================================================
module.exports = (logger, t, DB_CONNECTION_STRING) => {
	const couch = {};
	const couch_url = build_couch_base_url(DB_CONNECTION_STRING);

	// build the url to connect to couch
	function build_couch_base_url(dbConnectionString) {
		const parts = t.url.parse(dbConnectionString);
		if (!parts) {
			logger.error('[couchdb] - Could not parse dbConnectionString...', dbConnectionString);
			return null;
		} else {
			if (!parts.protocol) {
				parts.protocol = 'http:';				// no protocol, defaults to http
			}
			if (parts.protocol === 'https:') {
				if (!parts.port) {						// no port for https, defaults 443
					parts.port = 443;
				}
			} else {									// no port for http, defaults 80
				if (!parts.port) {
					parts.port = 80;
				}
			}
			const auth_str = (parts.auth) ? parts.auth + '@' : '';	// defaults to no auth

			return parts.protocol + '//' + auth_str + parts.hostname + ':' + parts.port;
		}
	}

	// wrapper function
	function retry_req(options, cb) {
		options._name = 'couchdb';
		options._max_attempts = 5;
		options._retry_codes = {									// list of codes we will retry
			'429': '429 rate limit exceeded aka too many reqs',
			'408': '408 timeout',
		};
		t.misc.retry_req(options, (req_e, resp) => {
			return cb(req_e, resp);									// return error or success
		});
	}

	//-------------------------------------------------------------
	// Check to see if Couch is running
	//-------------------------------------------------------------
	/*
		When we try to start the app we need to make sure that CouchDB
		is running. Otherwise the app won't be able to function. This
		API call reports an error if it cannot find CouchDB running and
		returns null if CouchDB is found to be running.
	 */
	couch.checkIfCouchIsRunning = (cb) => {
		const options = {
			method: 'GET',
			baseUrl: couch_url,
			url: '/_up',
			timeout: 30000,
			headers: {
				'Content-Type': 'application/json'
			}
		};
		t.request(options, (err) => {
			return cb(err);
		});
	};

	//-------------------------------------------------------------
	// Create new doc
	//-------------------------------------------------------------
	/*
		Differences from writeDoc:
		- Must be a POST request if there is no _id property
		- Headers must contain 'Content-Type' instead of 'Accepts'
		- URL does not pass any _id, since it doesn't yet exist
		- _id is added to the doc before the callback is called

		These differences could have been handled with a bit of logic
		inside of writeDoc that checks for the _id property. However,
		this function ensures that a doc with no _id gets created on purpose.

		opts: {
			db_name: "name of db",
		}
	*/
	couch.createNewDoc = (opts, doc, cb) => {
		if (!doc) {
			return cb(400, { error: 'doc not passed' });
		} else {
			const options = {
				method: 'POST',
				baseUrl: couch_url,
				url: '/' + opts.db_name,
				timeout: 30000,
				body: JSON.stringify(doc),
				headers: {
					'Content-Type': 'application/json'
				}
			};
			retry_req(options, (_, resp) => {
				if (t.ot_misc.is_error_code(t.ot_misc.get_code(resp))) {
					logger.error('[couchdb] error creating doc', opts.db_name, doc._id, t.ot_misc.get_code(resp));
					return cb(t.ot_misc.formatResponse(resp), null);
				} else {
					if (resp) {
						resp = t.ot_misc.formatResponse(resp);
						doc._id = resp.id;
						doc._rev = resp.rev;
					}
					return cb(null, doc);
				}
			});
		}
	};

	//-------------------------------------------------------------
	// Write doc
	//-------------------------------------------------------------
	/*
		opts: {
			db_name: "name of db",
		}
	*/
	couch.writeDoc = (opts, doc, cb) => {
		if (!doc || !doc._id) {
			return cb(400, { error: 'doc id not passed' });
		} else {
			const options = {
				method: 'PUT',
				baseUrl: couch_url,
				timeout: 30000,
				uri: '/' + opts.db_name + '/' + doc._id,
				body: JSON.stringify(doc),
				headers: {
					'Accept': 'application/json'
				}
			};
			retry_req(options, (_, resp) => {
				if (t.ot_misc.is_error_code(t.ot_misc.get_code(resp))) {
					logger.error('[couchdb] error writing doc', opts.db_name, doc._id, t.ot_misc.get_code(resp));
					return cb(t.ot_misc.formatResponse(resp), null);
				} else {
					if (resp) {
						resp = t.ot_misc.formatResponse(resp);
						doc._rev = resp.rev;
					}
					return cb(null, doc);
				}
			});
		}
	};

	//-------------------------------------------------------------
	// Write Doc Safely, repeats if write had doc update conflict (409)
	//-------------------------------------------------------------
	/*
		opts: {
			db_name: "name of db",
			_id: "document's _id",						// [optional] if this is not set must set doc field
			doc: {object}								// [optional] if this is not set doc will be fetched from _id field
		},
		modify_doc_logic_sync = function(document){		// <- notice the document is passed in as 1st arg
			// do logic to the document here
			return {error: null, doc: document};		// <- you must return the {doc: document}! if "error" is set it will cancel the write
		},
		callback = function(errorCode, wrote_doc){
			// standard callback here
		}
	*/
	couch.repeatWriteSafe = (opts, modify_doc_logic_sync, cb) => {
		if (!opts.attempt || isNaN(opts.attempt)) { opts.attempt = 1; }
		if (!opts.debug_id) { opts.debug_id = t.misc.simpleRandomString(3); }	// id to help debug the logs, see which call is repeating
		t.async.waterfall([

			// --- Get Document --- //
			(callback) => {
				if (opts && opts.doc && opts.doc._id) {							// if doc is already passed in, skip this
					const temp = JSON.parse(JSON.stringify(opts.doc));			// deep copy
					return callback(null, temp);
				} else {
					couch.getDoc(opts, (err_get, resp) => {						// go get the document...
						if (err_get != null) {
							logger.error('[repeat write safe ' + opts.debug_id + '] could not get doc for id:', opts._id);
							return callback(err_get, null);
						} else {
							return callback(null, resp);
						}
					});
				}
			},

			// --- Do Logic --- //
			(doc, callback) => {
				const resp = modify_doc_logic_sync(doc);						// logic for the doc goes here!!!
				if (resp.error) {
					return callback(resp.error, null);
				} else if (resp.doc) {											// must exist
					return callback(null, resp.doc);
				} else {
					logger.error('[repeat write safe ' + opts.debug_id + '] invalid use - unknown return value in logic', typeof resp);
					return callback({ error: 'invalid use of repeatWriteSafe()', statusCode: 400 }, null);
				}
			},

		], (err, the_doc) => {
			if (err != null) {
				if (cb) { return cb(err, the_doc); }								// error out
			} else {
				// --- Almost Done, Now Write The Doc --- //
				couch.writeDoc(opts, the_doc, (wr_err, resp) => {
					if (wr_err && wr_err.statusCode === 409) {	// 409's are the only code we will retry
						logger.warn('[repeat write safe ' + opts.debug_id + '] 409 could not write doc... update conflict.', opts.attempt);
						if (opts.doc) { opts._id = opts.doc._id; }				// copy id over
						delete opts.doc;										// remove it from options so we read a fresh doc it if we need to retry
						opts.attempt++;
						if (opts.attempt > 5) {									// give up
							logger.error('[repeat write safe ' + opts.debug_id + '] took too many tries to edit doc, giving up', opts.attempt);
							if (cb) { return cb(wr_err, resp); }				// error out
						} else {
							const timer = (125 * opts.attempt + (Math.random() * 500));
							logger.warn('[repeat write safe ' + opts.debug_id + '] will try again in', t.misc.friendly_ms(timer));
							setTimeout(() => {									// try again a little later
								opts.SKIP_CACHE = true;
								couch.repeatWriteSafe(opts, modify_doc_logic_sync, cb);
							}, timer);
						}
					} else if (wr_err != null) {
						if (cb) { return cb(wr_err, resp); }					// error out
					} else {
						if (opts.attempt > 1) {
							logger.debug('[repeat write safe ' + opts.debug_id + '] doc was written, 409s are resolved :)', opts.attempt);
						}
						if (cb) { return cb(null, resp); }						// all good, return to cb
					}
				});
			}
		});
	};


	//-------------------------------------------------------------
	// Get doc
	//-------------------------------------------------------------
	/*
		opts: {
			db_name: "name of db",
			_id: "document's _id",
			query: "meta=true",
		}
	*/
	couch.getDoc = (opts, cb) => {
		const options = {
			method: 'GET',
			baseUrl: couch_url,
			uri: '/' + opts.db_name + '/' + opts._id + '?' + (opts.query ? opts.query : ''),
			timeout: 30000,
			headers: {
				'Accept': 'application/json'
			}
		};
		retry_req(options, (_, resp) => {
			if (t.ot_misc.is_error_code(t.ot_misc.get_code(resp))) {
				return cb(t.ot_misc.formatResponse(resp), null);
			}
			return cb(_, t.ot_misc.formatResponse(resp));
		});
	};

	//-------------------------------------------------------------
	// Get the results for a design doc view in a database
	//-------------------------------------------------------------
	/*
		opts: {
			db_name: "name of db",
			_id: "name of the design doc",
			view: "name of the view",
			query: "query parameters for view as string",
		}
	*/
	couch.getDesignDocView = (opts, cb) => {
		const options = {
			method: 'GET',
			baseUrl: couch_url,
			url: '/' + opts.db_name + '/' + opts._id + '/_view/' + opts.view + '?' + (opts.query ? opts.query : null),
			timeout: 120000,
			headers: {
				'Accept': 'application/json'
			}
		};
		retry_req(options, (_, resp) => {
			if (t.ot_misc.is_error_code(t.ot_misc.get_code(resp))) {
				return cb(t.ot_misc.formatResponse(resp), null);
			}
			return cb(_, t.ot_misc.formatResponse(resp));
		});
	};

	//-------------------------------------------------------------
	// Get the results for a design doc index in a database
	//-------------------------------------------------------------
	couch.getDesignDocIndex = (opts, cb) => {
		const options = {
			method: 'GET',
			baseUrl: opts.url,
			url: '/' + opts.db_name + '/_index/',
			timeout: 30000,
			headers: {
				'Accept': 'application/json'
			}
		};
		retry_req(options, (_, resp) => {
			if (t.ot_misc.is_error_code(t.ot_misc.get_code(resp))) {
				return cb(t.ot_misc.formatResponse(resp), null);
			}
			return cb(_, t.ot_misc.formatResponse(resp));
		});
	};

	//-------------------------------------------------------------
	// Delete doc
	//-------------------------------------------------------------
	/*
		opts: {
			db_name: "name of db",
			_id: "doc id",
			_rev: "doc revision"
		}
	*/
	couch.deleteDoc = (opts, cb) => {
		if (!opts) {
			logger.error('[couchdb] bad input to deleteDoc, missing opts');
			if (cb) { return cb(400, { error: 'no opts provided to delete' }); }
		}
		if (!opts._id) {
			logger.error('[couchdb] bad input to deleteDoc, missing _id');
			if (cb) { return cb(400, { error: 'no _id provided to delete' }); }
		} else if (!opts._rev) {
			logger.error('[couchdb] bad input to deleteDoc, missing _rev');
			if (cb) { return cb(400, { error: 'no _rev provided to delete' }); }
		}
		const options = {
			method: 'DELETE',
			baseUrl: couch_url,
			url: '/' + opts.db_name + '/' + opts._id + '?rev=' + opts._rev,
			timeout: 30000,
			headers: {
				'Accept': 'application/json'
			}
		};
		retry_req(options, (_, resp) => {
			if (t.ot_misc.is_error_code(t.ot_misc.get_code(resp))) {
				return cb(t.ot_misc.formatResponse(resp), null);
			}
			return cb(_, t.ot_misc.formatResponse(resp));
		});
	};

	//=======================================================================================================
	// Delete Docs
	//=======================================================================================================
	// delete doc that repeats if delete had doc update conflict
	/*
		opts: {
			db_name: "name of db",
			_id: "document's _id",
			_rev: "document's _rev",		// [optional]
		}
	*/
	couch.repeatDelete = (opts, attempt, cb) => {
		let the_doc = null;
		if (!opts || !opts._id) {
			logger.error('[couchdb] hungry hippo error - repeat delete was not fed a _id');
			if (cb) { return cb(400, 'problem'); }									// failure
		} else {
			if (opts._rev && attempt === 1) {										// first time should have the rev already
				go_delete();
			} else {
				couch.getDoc({ db_name: opts.db_name, _id: opts._id }, (err, recentDoc) => {	// get doc for its rev
					if (err != null) {
						logger.error('could not read doc', err, recentDoc, opts._id);
						if (cb) { return cb(err, recentDoc); }						// failure
					} else {
						the_doc = recentDoc;
						opts._rev = recentDoc._rev;									// copy rev
						go_delete();
					}
				});
			}
		}

		function go_delete() {
			couch.deleteDoc(opts, (errCode, resp) => {
				if (errCode === 409) {
					if (attempt > 5) {											// too many attempts, stop
						logger.error('[couchdb] took too many tries to delete doc, giving up', attempt);
						if (cb) { return cb(errCode, resp); }					// failure
					} else {
						setTimeout(() => {
							couch.repeatDelete(opts, ++attempt, cb);
						}, (250 * attempt + (Math.random() * 500)));
					}
				} else if (errCode != null) {
					logger.error('[couchdb] could not delete doc', errCode, resp);
					if (cb) { return cb(errCode, resp); }						// failure
				} else {
					logger.info('[couchdb] deleted doc', attempt, opts._id);
					if (resp) { resp.doc = the_doc; }
					if (cb) { return cb(null, resp); }							// success
				}
			});
		}
	};

	//=======================================================================================================
	// Delete Database
	//=======================================================================================================
	/*
		db_name: "db name here"
	*/
	couch.deleteDatabase = (db_name, cb) => {
		const options = {
			method: 'DELETE',
			baseUrl: couch_url,
			url: '/' + db_name,
			timeout: 30000,
			headers: {
				'Accept': 'application/json'
			}
		};
		retry_req(options, (error, resp) => {
			if (t.ot_misc.is_error_code(t.ot_misc.get_code(resp))) {
				return cb(t.ot_misc.formatResponse(resp), null);
			}
			const ret = t.ot_misc.formatResponse(resp);
			ret.deleted = db_name;
			return cb(error, ret);
		});
	};

	//=======================================================================================================
	// Create Database
	//=======================================================================================================
	/*
		opts: {
			db_name: "db name here"
		}
	*/
	couch.createDatabase = (opts, cb) => {
		const options = {
			method: 'PUT',
			baseUrl: couch_url,
			url: '/' + opts.db_name,
			timeout: 30000,
			headers: {
				'Accept': 'application/json'
			}
		};
		retry_req(options, (_, resp) => {
			if (t.ot_misc.is_error_code(t.ot_misc.get_code(resp))) {
				return cb(t.ot_misc.formatResponse(resp), null);
			}
			return cb(_, t.ot_misc.formatResponse(resp));
		});
	};

	//-------------------------------------------------------------
	// Get Database Info
	//-------------------------------------------------------------
	/*
		opts: {
			db_name: "name of db",
			query: "meta=true"
		}
	*/
	couch.getDatabase = (opts, cb) => {
		const options = {
			method: 'GET',
			baseUrl: couch_url,
			url: '/' + opts.db_name + '?' + (opts.query ? opts.query : null),
			timeout: 30000,
			headers: {
				'Accept': 'application/json'
			}
		};
		retry_req(options, (_, resp) => {
			if (t.ot_misc.is_error_code(t.ot_misc.get_code(resp))) {
				return cb(t.ot_misc.formatResponse(resp), null);
			}
			return cb(_, t.ot_misc.formatResponse(resp));
		});
	};

	//-------------------------------------------------------------
	// Bulk Database Operation
	//-------------------------------------------------------------
	/*
		opts: {
			db_name: "name of db",
		}
		payload: {
			docs: []
		}
	*/
	couch.bulkDatabase = (opts, payload, cb) => {
		if (!payload || !payload.docs) {
			return cb(400, { error: '"payload" argument not passed or its missing the "docs" field' });
		} else {
			const options = {
				method: 'POST',
				baseUrl: couch_url,
				url: '/' + opts.db_name + '/_bulk_docs',
				timeout: 120000,
				body: JSON.stringify(payload),
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				}
			};
			retry_req(options, (_, resp) => {
				if (t.ot_misc.is_error_code(t.ot_misc.get_code(resp))) {
					return cb(t.ot_misc.formatResponse(resp), null);
				}
				return cb(_, t.ot_misc.formatResponse(resp));
			});
		}
	};

	//-------------------------------------------------------------
	// Compaction - compress database
	//-------------------------------------------------------------
	/*
		opts: {
			db_name: "name of db",
		}
	*/
	couch.startCompaction = (opts, cb) => {
		const options = {
			method: 'POST',
			baseUrl: couch_url,
			url: '/' + opts.db_name + '/_compact',
			timeout: 30000,
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			}
		};
		retry_req(options, (_, resp) => {
			if (t.ot_misc.is_error_code(t.ot_misc.get_code(resp))) {
				return cb(t.ot_misc.formatResponse(resp), null);
			}
			return cb(_, t.ot_misc.formatResponse(resp));
		});
	};

	//------------------------------------------------------------
	// print debug info for couchdb failures
	//------------------------------------------------------------
	/*couch.check_db_options = function (err, url) {
		const errors = [];
		if (err && err.statusCode === 403) {																// 403 is usually a bad env setup error, lets check
			logger.warn('------------------------ checking couchdb options ---------------------------------');

			// -- check db connection string -- //
			const parts = t.url.parse(url);
			if (!parts || !parts.hostname) {
				errors.push('db connection string is missing: ' + parts.hostname);							// problem, add the error
			} else {
				const username = parts.auth.substring(0, parts.auth.indexOf(':'));							// get username
				if (!username) {
					errors.push('basic auth in the db connection string is blank or null');					// problem, add the error
				} else {
					logger.warn('[check_db_options] db connection string\'s username name is: "' + username + '"');	// print username to help debug
				}

				// -- check db -- //
				const temp = parts.path.substring(1);														// skip first letter
				const db = temp.substring(0, temp.indexOf('/'));											// get db name
				if (!db) {
					errors.push('database name is missing');												// problem, add the error
				} else {
					logger.warn('[check_db_options] database name is: "' + db + '"'); 						// print db name to help debug
				}
			}
		}

		if (errors.length > 0) {
			logger.error('Error with couchdb options!');
			for (let i in errors) { logger.error('- ' + errors[i]); }
		}
	};*/

	//------------------------------------------------------------
	// Delete document conflicts
	//------------------------------------------------------------
	/*
		opts: {
			db_name: "name of db",
			_id: "document's _id",
		}
	*/
	couch.deleteConflicts = function (opts, cb) {
		opts.query = 'conflicts=true';
		couch.getDoc(opts, (err, resp) => {
			if (err) {
				if (cb) { return cb(err, resp); }						// errors
			} else if (!resp || !resp._conflicts) {
				if (cb) { return cb(null, null); }						// all good
			} else {
				const bulkDocs = { docs: [] };
				for (let i in resp._conflicts) {
					bulkDocs.docs.push({
						_id: resp._id,
						_rev: resp._conflicts[i],
						_deleted: true
					});
					if (bulkDocs.docs.length >= 50) { break; }			// limit it to 50 at a time, seems to timeout otherwise
				}
				logger.info('[couchdb] cleaning up conflicts', opts._id, bulkDocs.docs.length + '/' + resp._conflicts.length);

				couch.bulkDatabase(opts, bulkDocs, (err2, body2) => {
					if (cb) { return cb(err2, body2); }
				});
			}
		});
	};

	//------------------------------------------------------------
	// Get docs via _bulk_get
	//------------------------------------------------------------
	couch.bulk_get = (db_name, doc_ids, cb) => {
		const payload = {
			docs: []
		};
		for (let i in doc_ids) {
			payload.docs.push({ id: doc_ids[i] });
		}

		const options = {
			baseUrl: couch_url,
			url: '/' + db_name + '/_bulk_get',
			method: 'POST',
			body: JSON.stringify(payload),
			timeout: 90000,
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			},
		};

		// --------- Handle Data --------- //
		retry_req(options, (error, resp) => {
			if (t.ot_misc.is_error_code(t.ot_misc.get_code(resp))) {
				return cb(t.ot_misc.formatResponse(resp), null);
			}
			return cb(error, t.ot_misc.formatResponse(resp));
		});
	};

	//------------------------------------------------------------
	// Get _changes feed from db
	//------------------------------------------------------------
	couch.get_changes = (db_name, since, cb) => {
		const options = {
			baseUrl: couch_url,
			url: '/' + db_name + '/_changes?style=main_only' + (since ? '&since=' + since : ''),
			method: 'GET',
			timeout: 90000,
			headers: { 'Accept': 'application/json' }
		};

		// --------- Handle Data --------- //
		retry_req(options, (error, resp) => {
			if (t.ot_misc.is_error_code(t.ot_misc.get_code(resp))) {
				return cb(t.ot_misc.formatResponse(resp), null);
			}
			return cb(error, t.ot_misc.formatResponse(resp));
		});
	};

	//------------------------------------------------------------
	// Add attachment to doc
	//------------------------------------------------------------
	/*
	opts: {
		_id: "<doc id>",
		_rev: "<doc rev>",
		db_name: "<db name>",
		att_name: "<name of the attachment>",
		attachment: "<base 64 data>",				// can be anything, likely base 64 encoded data
	}
	*/
	couch.add_attachment = (opts, cb) => {
		const options = {
			baseUrl: couch_url,
			url: '/' + opts.db_name + '/' + opts._id + '/' + opts.att_name + '?rev=' + opts._rev,
			method: 'PUT',
			body: (typeof opts.attachment === 'string') ? opts.attachment : JSON.stringify(opts.attachment),
			timeout: 90000,
			headers: {
				'Accept': 'application/json',
			}
		};
		retry_req(options, (error, resp) => {
			if (t.ot_misc.is_error_code(t.ot_misc.get_code(resp))) {
				return cb(t.ot_misc.formatResponse(resp), null);
			}
			return cb(error, t.ot_misc.formatResponse(resp));
		});
	};

	return couch;
};
