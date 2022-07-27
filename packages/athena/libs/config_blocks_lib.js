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
// config_blocks_lib.js - config/genesis block CRUD functions
//------------------------------------------------------------
module.exports = function (logger, ev, t) {
	const exports = {};

	// format config block doc *create*
	function format_doc(the_doc) {
		the_doc._id = the_doc._id || the_doc.tx_id;
		the_doc.type = ev.STR.BLOCK;
		the_doc.timestamp = Date.now();
		the_doc.visibility = ev.STR.TX_INBOX;
		delete the_doc._rev;
		return the_doc;
	}

	// format config block doc *response*
	function format_response(the_doc) {
		the_doc.id = the_doc._id;
		if (!the_doc.visibility) { the_doc.visibility = ev.STR.TX_INBOX; }
		delete the_doc._id;
		delete the_doc._rev;
		return t.misc.sortKeys(the_doc);
	}

	//-------------------------------------------------------------
	// Get all config block docs - raw - (the query param "visibility" will control if "inbox" or "archive" status docs are returned )
	//-------------------------------------------------------------
	exports.getConfigBlockDocs = (req, cb) => {
		const opts = {
			db_name: ev.DB_COMPONENTS,			// db for peers/cas/orderers/msps/etc docs
			_id: '_design/athena-v1',			// name of design doc
			view: '_by_types_and_timestamp',
			SKIP_CACHE: t.ot_misc.skip_cache(req),
			query: t.misc.formatObjAsQueryParams({
				include_docs: true,
				startkey: [ev.STR.BLOCK + ', {}'],
				endkey: [ev.STR.BLOCK],
				descending: true
			}),
		};
		t.otcc.getDesignDocView(opts, (err, resp) => {
			if (err) {
				logger.error('[config block] error response from couch when getting block docs:', err, resp);
				return cb(err);
			} else {
				const ret = [];
				if (resp) {
					const filter_on = req.query.visibility;
					for (let i in resp.rows) {
						if (filter_on === 'all') {								// return everything
							ret.push(resp.rows[i].doc);
						} else if (filter_on === ev.STR.TX_INBOX) {				// only return "inbox" docs
							if (!resp.rows[i].doc.visibility || resp.rows[i].doc.visibility === ev.STR.TX_INBOX) {	// if field dne, treat it as inbox
								ret.push(resp.rows[i].doc);
							}
						} else if (filter_on === ev.STR.TX_ARCHIVE) {			// only return "archived" docs
							if (resp.rows[i].doc.visibility === ev.STR.TX_ARCHIVE) {
								ret.push(resp.rows[i].doc);
							}
						} else {												// default - only return "inbox" docs
							if (!resp.rows[i].doc.visibility || resp.rows[i].doc.visibility === ev.STR.TX_INBOX) {
								ret.push(resp.rows[i].doc);
							}
						}
					}
				}
				return cb(null, ret);
			}
		});
	};

	//-------------------------------------------------------------
	// Get all config blocks - formatted
	//-------------------------------------------------------------
	exports.getConfigBlocks = (req, cb) => {
		exports.getConfigBlockDocs(req, (error, docs) => {
			if (error) {
				return cb(error);
			} else {
				const ret = [];
				for (let i in docs) {
					ret.push(format_response(docs[i]));
				}
				return cb(null, ret);
			}
		});
	};

	//-------------------------------------------------------------
	// Get one config block  - formatted
	//-------------------------------------------------------------
	exports.getConfigBlockById = (id, skip_cache, cb) => {
		const get_opts = {
			db_name: ev.DB_COMPONENTS,
			_id: id,
			SKIP_CACHE: skip_cache,
		};
		t.otcc.getDoc(get_opts, (error, doc) => {
			if (error) {										// error getting doc
				logger.error('[config block] could not get the block doc', id);
				return cb(error);
			} else {
				return cb(null, format_response(doc));
			}
		});
	};

	//--------------------------------------------------
	// Create config block doc
	//--------------------------------------------------
	exports.createConfigBlockDoc = (req, cb) => {
		logger.info('[config block] attempting to create a block doc:', req.params.tx_id);

		// create a notification
		const notice = { message: 'creating a config block doc. tx_id: ' + req.params.tx_id };
		t.notifications.procrastinate(req, notice);

		const doc = format_doc(req.body);
		t.otcc.createNewDoc({ db_name: ev.DB_COMPONENTS }, doc, (err_writeDoc, resp_writeDoc) => {
			if (err_writeDoc) {
				const error_code = t.ot_misc.get_code(err_writeDoc);
				logger.error('[config block] error trying to write config block doc:', error_code, err_writeDoc);
				return cb({ statusCode: error_code, msg: 'problem creating the config-block doc. tx id: "' + req.params.tx_id + '"' });
			} else {
				logger.error('[config block] success, created block. tx_id: ' + req.params.tx_id);
				return cb(null, format_response(doc));
			}
		});
	};

	//--------------------------------------------------
	// Delete config block
	//--------------------------------------------------
	exports.deleteBlockDoc = (req, cb) => {
		logger.info('[config block] attempting to delete a block doc:', req.params.tx_id);

		// create a notification
		const notice = { message: 'deleting a config block doc. tx_id: ' + req.params.tx_id };
		t.notifications.procrastinate(req, notice);

		// ----- Get the doc first ----- //
		const get_opts = {
			db_name: ev.DB_COMPONENTS,
			_id: req.params.tx_id,
			SKIP_CACHE: true
		};
		t.otcc.getDoc(get_opts, (err_getBlockDoc, block_doc) => {
			if (err_getBlockDoc) {
				const error_code = t.ot_misc.get_code(err_getBlockDoc);
				if (error_code === 404) {
					logger.warn('[config block] block doc (to delete) does not exist:', error_code);
					return cb({ statusCode: error_code, msg: 'config-block by this tx id does not exist. tx id: "' + req.params.tx_id + '"' });
				} else {
					logger.error('[config block] error trying to find block doc to delete it:', error_code, err_getBlockDoc);
					return cb({ statusCode: error_code, msg: 'problem getting the config-block doc for deletion. tx id: "' + req.params.tx_id + '"' });
				}
			} else {
				local_delete_doc((del_err, del_resp) => {
					return cb(del_err, del_resp);
				});
			}
		});

		// delete the local doc in our db
		function local_delete_doc(loc_cb) {
			const delete_opts = {
				_id: req.params.tx_id,
				db_name: ev.DB_COMPONENTS
			};
			t.otcc.repeatDelete(delete_opts, 1, (err, resp) => {
				if (err) {
					const code = t.ot_misc.get_code(err);
					if (code === 404) {
						logger.warn('[config block] delete error, doc does not exist:', code, err);
						const ret = {
							message: 'id no longer exists. already deleted?',
							id: delete_opts._id
						};
						return loc_cb(null, ret);
					} else {
						logger.error('[config block] delete error with block doc:', code, err);
						return loc_cb(err, null);
					}
				} else {
					logger.info('[config block] deleting local block doc - success');
					const ret = {
						message: 'ok',
						tx_id: resp.id,
						details: 'removed'
					};
					return loc_cb(null, ret);
				}
			});
		}
	};

	//--------------------------------------------------
	// Archive the config block doc (changes visibility to "archive")
	//--------------------------------------------------
	exports.archiveBlockDoc = (req, cb) => {
		logger.info('[config block] attempting to archive a block doc:', req.params.tx_id);

		// create a notification
		const notice = { message: 'archiving a config block doc. tx_id: ' + req.params.tx_id };
		t.notifications.procrastinate(req, notice);

		// ----- Get the doc first ----- //
		const get_opts = {
			db_name: ev.DB_COMPONENTS,
			_id: req.params.tx_id,
			SKIP_CACHE: true
		};
		t.otcc.getDoc(get_opts, (err_getBlockDoc, block_doc) => {
			if (err_getBlockDoc) {
				const error_code = t.ot_misc.get_code(err_getBlockDoc);
				if (error_code === 404) {
					logger.warn('[config block] block doc (to archive) does not exist:', error_code);
					return cb({ statusCode: error_code, msg: 'config-block by this tx id does not exist. tx id: "' + req.params.tx_id + '"' });
				} else {
					logger.error('[config block] error trying to find block doc to archive it:', error_code, err_getBlockDoc);
					return cb({ statusCode: error_code, msg: 'problem getting the config-block doc for deletion. tx id: "' + req.params.tx_id + '"' });
				}
			} else {
				archive_doc(block_doc, (del_err, del_resp) => {
					return cb(del_err, del_resp);
				});
			}
		});

		// change visibility of the local doc in our db to "archive"
		function archive_doc(config_block_doc, loc_cb) {
			config_block_doc.visibility = ev.STR.TX_ARCHIVE;
			config_block_doc.archived_ts = Date.now();

			t.otcc.writeDoc({ db_name: ev.DB_COMPONENTS }, config_block_doc, (err_writeDoc, wroteDoc) => {
				if (err_writeDoc) {
					const error_code = t.ot_misc.get_code(err_writeDoc);
					logger.error('[config block] error trying to archive config block doc:', error_code, err_writeDoc);
					return cb({ statusCode: error_code, msg: 'problem archiving the config-block doc. tx id: "' + req.params.tx_id + '"' });
				} else {
					logger.error('[config block] success, created block. tx_id: ' + req.params.tx_id);
					return cb(null, format_response(wroteDoc));
				}
			});
		}
	};

	return exports;
};
