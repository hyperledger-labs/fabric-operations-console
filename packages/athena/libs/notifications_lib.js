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
// notification_lib.js - Library functions for notification related tasks (aka activity logs, aka audit logs)
//------------------------------------------------------------
module.exports = function (logger, ev, t) {
	const exports = {};

	// ------------------------------------------
	// Archive notifications
	// ------------------------------------------
	/*
	notification_ids: []
	*/
	exports.archive_db_notifications = function (notification_ids, cb) {
		logger.debug('[notifications lib] archiving ' + notification_ids.length + ' notifications with ids');
		const options = {
			notification_ids: notification_ids,
			include_docs: true,					// use the whole doc for these. we just want to update it, not remove it
			view: ev.STR.ARCHIVED_VIEW
		};
		return bulk_archive_or_delete_notifications(options, cb);
	};

	// ------------------------------------------
	// Delete all notifications
	// ------------------------------------------
	exports.purge = function (cb) {
		logger.debug('[notifications lib] deleting all notifications');
		const options = {
			include_docs: false,
			view: ev.STR.ALL_NOTICES_VIEW
		};
		return bulk_archive_or_delete_notifications(options, cb);
	};

	// ------------------------------------------
	// Execute delete or archive notifications
	// ------------------------------------------
	/*
		options: {
			notification_ids: [],
			couch_resp: {},				// response from get all docs
			view: ""					// name of the design doc view to use
		}
	 */
	function bulk_archive_or_delete_notifications(options, cb) {
		const opts = {
			db_name: ev.DB_SYSTEM,
			_id: '_design/athena-v1',
			view: options.view,
			query: t.misc.formatObjAsQueryParams({ include_docs: options.include_docs, descending: true }),
			SKIP_CACHE: true,
		};
		t.otcc.getDesignDocView(opts, (err, resp) => {
			if (err) {
				logger.error('[notification lib] - could not find ALL notification docs', err);
				if (cb) { return cb(err, null); }
			} else {
				logger.debug('[notification lib] - found ALL notification docs: ', (resp && resp.rows) ? resp.rows.length : 0);
				options.couch_resp = resp;
				options.action = (options.view === ev.STR.ARCHIVED_VIEW) ? 'archived ' : 'deleted ';
				const deleted_or_archived_docs = build_delete_or_archive_array(options);	// create an array of docs to delete or archive
				const num_docs = deleted_or_archived_docs.length;
				if (num_docs === 0) {														// if we found docs, delete them
					logger.debug('[notification lib] 0 notifications found');
					if (cb) { return cb(null, options.action + '0 notification(s)'); }
				} else {
					t.couch_lib.bulkDatabase({ db_name: ev.DB_SYSTEM, }, { docs: deleted_or_archived_docs }, (err) => {
						if (err != null) {
							logger.warn('[notification lib] could not alter notification(s)', err);
							if (cb) { return cb(err); }
						} else {
							logger.debug('[notification lib] ' + options.action + 'successful for ' + num_docs + ' notification(s)');
							if (cb) { return cb(null, options.action + num_docs + ' notification(s)'); }
						}
					});
				}
			}
		});
	}

	// ------------------------------------------------------------------
	// Build the list of notification objects to either archive or delete
	// ------------------------------------------------------------------
	/*
		options: {
			notification_ids: [],
			couch_resp: {},				// response from get all docs
		}
	 */
	function build_delete_or_archive_array(options) {
		const ret = [];
		const archiving_notifications = options.notification_ids && Array.isArray(options.notification_ids) && options.notification_ids.length > 0;
		for (let i in options.couch_resp.rows) {										// loop through docs and build the body for a bulk delete or archive
			if (archiving_notifications) {	// if we send in specific notification ids then we'll only modify those docs - archive, not delete, on partials
				const id = options.couch_resp.rows[i].id ? options.couch_resp.rows[i].id : options.couch_resp.rows[i]._id;	// make sure we have an id
				if (options.notification_ids.includes(id)) {
					const doc = options.couch_resp.rows[i].doc ? options.couch_resp.rows[i].doc : {};
					doc.archived = true;
					ret.push(doc);
				}
			} else {
				ret.push({ _id: options.couch_resp.rows[i].id, _rev: options.couch_resp.rows[i].value, _deleted: true });	// this is a purge - don't need much
			}
		}
		return ret;
	}

	// remember details for a notification doc that we will build later (when the request ends)
	exports.procrastinate = (req, details_so_far) => {
		if (req && details_so_far) {
			if (!Array.isArray(req._notifications)) {
				req._notifications = [];													// bulk apis will set more than 1 doc
			}
			details_so_far.by = details_so_far.by || t.ot_misc.get_username_for_log(req);	// populate the username/uuid
			details_so_far.tx_id = t.ot_misc.buildTxId(req);
			if (req.method && req.path && !details_so_far.api) {
				details_so_far.api = req.method + ':' + (req._wildcard_path || req.path); 	// set the api, might be helpful
			}
			req._notifications.push(details_so_far);
		}
	};

	// create each procrastinated notification doc
	exports.end_procrastination = (req, res) => {
		if (req && res && Array.isArray(req._notifications)) {
			t.async.eachLimit(req._notifications, 4, (opts, cb_created) => {				// often there will only be 1, bulk ops will make a few
				if (!req._client_event) {													// client events tell us the code, the athena res doesn't matter
					opts.code = t.ot_misc.get_code(res);									// set response code
					if (req._start_time) {
						opts.elapsed_ms = Date.now() - req._start_time; 					// might be helpful to know elapsed time
					}
				}
				opts.status = opts.status || (t.ot_misc.is_error_code(opts.code) ? 'error' : 'success');		// set status string for doc
				opts.user_agent = req.headers['user-agent'];
				exports.create(opts, () => {
					return cb_created();
				});
			}, () => {
				logger.debug('[notification lib] finished building all notifications for request', req._notifications.length);
			});
		}
	};

	// ------------------------------------------
	// build a generic notification doc
	// ------------------------------------------
	/*
		body: {
			"status": "error" || "success"
			"message": "some string to surface to a user"
			"ts_display": 0,     // unix timestamp
			"by": "dshuffma",
			"component_id": "",
			"component_type": "",
			"component_display_name": "",
			"api": "",
			"code": 200,
			"elapsed_ms": 1234,
			"tx_id": "",
			"client_details": "",
			"action_verb": "",
		}
	*/
	exports.create = function (body, cb) {
		const valid_status = ['error', 'success'];
		const lc_status = (body && body.status) ? body.status.toLowerCase() : null;
		const msg = body.message || body.log;
		if (valid_status.indexOf(lc_status) === -1) {						// check if status is acceptable
			const err = {
				statusCode: 400,
				error: 'not a valid value for status: "' + lc_status + '"',
				valid: valid_status
			};
			if (cb) { return cb(err, null); }
		} else if (!msg || typeof msg !== 'string') {						// check if message is okay
			const err = {
				statusCode: 400,
				error: 'not a valid value for "message". message must be a string.',
			};
			if (cb) { return cb(err, null); }
		} else {

			// --- Request is good, make the doc --- //
			const doc = {
				type: 'notification',
				message: msg.substring(0, 256),										// limit length, truncate violations
				ts_display: body.ts_display || Date.now(),							// timestamp provided from input
				status: lc_status,
				by: body.by || '-',
				component_id: body.component_id || undefined,						// if undefined, it will be removed which is what i want
				component_type: body.component_type || undefined,					// if undefined, it will be removed which is what i want
				component_display_name: body.component_display_name || undefined,	// if undefined, it will be removed which is what i want
				api: body.api || undefined,											// if undefined, it will be removed which is what i want
				elapsed_ms: body.elapsed_ms || undefined,							// if undefined, it will be removed which is what i want
				code: Number(body.code) || undefined,								// if undefined, it will be removed which is what i want
				tx_id: body.tx_id || undefined,										// if undefined, it will be removed which is what i want
				client_details: body.client_details || undefined,					// if undefined, it will be removed which is what i want
				action_verb: body.action_verb || undefined,							// if undefined, it will be removed which is what i want
				user_agent: body.user_agent || undefined,
			};
			t.otcc.createNewDoc({ db_name: ev.DB_SYSTEM }, t.misc.sortKeys(doc), (err, wrote_doc) => {
				if (err) {
					logger.error('[notification lib] - could not create notification doc', err);
				} else {
					logger.debug('[notification lib] - created notification doc', wrote_doc._id);
					const ws_msg = {
						id: wrote_doc._id,
						type: 'notification',
						status: wrote_doc.status,
						message: wrote_doc.message,
						ts_display: body.ts_display,
						by: wrote_doc.by,
					};
					t.wss1_athena.broadcast(ws_msg);					// notify apollo about the new notification
				}
				if (cb) { return cb(err, wrote_doc); }
			});
		}
	};

	// alternative way of creating an activity doc
	exports.createAlt = function (req, cb) {
		const body = (req && req.body) ? req.body : {};
		body.by = body.by || t.ot_misc.get_username_for_log(req);		// populate the username/uuid
		body.tx_id = t.ot_misc.buildTxId(req);
		body.user_agent = req.headers['user-agent'];

		exports.create(body, (err, resp) => {
			if (cb) { return cb(err, resp); }
		});
	};

	// ------------------------------------------
	// get all notifications from db
	// ------------------------------------------
	/*
		opts = {
			SKIP_CACHE: false,			// defaults false
			skip: 0,					// number of docs to skip. defaults 0
			limit: 100,					// number of docs to include in response. defaults 100
			include_docs: true,			// defaults true
			component_id: "id"			// optional - only return notifications for this component
		}
	*/
	exports.get = function (options, cb) {
		const limit = (options && options.limit && !isNaN(options.limit)) ? Number(options.limit) : 100;
		const skip = (options && options.skip && !isNaN(options.skip)) ? Number(options.skip) : 0;
		const include_docs = (options && options.include_docs === false) ? false : true;

		get_notifications((err, resp) => {
			if (err) {
				logger.error('[notification lib] - could not find all notification docs', err);
				return cb(err, null);
			} else {
				const docs = filter(format(resp));
				logger.debug('[notification lib] - found all notification docs: ', (resp && resp.rows) ? resp.rows.length : 0);
				const ret = { notifications: docs };
				ret.total = (resp) ? resp.total_rows : 0;		// number of docs in the view
				ret.returning = ret.notifications.length;		// number of results that match the request
				return cb(null, ret);							// do not sort, its already done
			}
		});

		// format webhooks and other notifications to our format
		function format(resp) {
			const ret = [];
			if (resp) {
				const offset_ms = options.timezoneOffset ? options.timezoneOffset * 60 * 1000 : 0;	// convert browser local timezone offset into ms offset

				for (let i in resp.rows) {
					if (resp.rows[i].doc) {
						const doc = resp.rows[i].doc;

						// ------- Webhook ------- //
						if (doc.type === 'webhook_tx') {
							doc.ts_display = (doc.status === 'pending') ? doc.ts_started : doc.ts_completed;

							const last_athena_msg = (Array.isArray(doc.athena_messages) && doc.athena_messages.length > 0) ?
								doc.athena_messages[doc.athena_messages.length - 1] : null;
							doc.message = doc.description + ': ' + last_athena_msg;		// build the display message
						}

						// build a local date by using the browsers local time
						if (doc && doc.ts_display) {
							const tmp = doc.ts_display - offset_ms;
							doc.local_date = t.misc.formatDate(tmp, '%n/%D/%Y - %i:%m:%s %P');
						}

						ret.push({
							local_date: doc.local_date,
							timestamp: doc.ts_display,
							log: t.misc.safe_str(doc.message, true),
							http_details: doc.api,
							response_code: doc.code,
							elapsed_ms: doc.elapsed_ms,
							by: doc.by,
							status: doc.status,
							tx_id: doc.tx_id,
							id: doc._id,
							component_id: doc.component_id ? doc.component_id : undefined,
							component_display_name: doc.component_display_name ? doc.component_display_name : undefined,
							user_agent: doc.user_agent ? doc.user_agent : undefined,
						});
					}
				}
			}
			return t.misc.sortItOut(ret);
		}

		// filter the notification data down by a user search
		function filter(data) {
			let search = (options && typeof options.search === 'string') ? options.search.toLowerCase().trim() : '';
			if (!search) {
				return data;
			}
			search = search.replace(/"/g, '\\"');					// escape double quotes if found

			const ret = [];
			for (let i in data) {
				const doc = JSON.stringify(Object.values(data[i])).toLowerCase();
				if (doc.includes(search)) {
					ret.push(data[i]);
				}
			}
			return ret;
		}

		// get the notifications for the query
		function get_notifications(get_cb) {
			if (options.component_id) {
				get_component_notifications(options.component_id, (error, resp) => {
					return get_cb(error, resp);
				});
			} else {
				get_all_active_notifications((error, resp) => {
					return get_cb(error, resp);
				});
			}
		}

		// get all notifications
		function get_all_active_notifications(get_cb) {
			const opts = {
				db_name: ev.DB_SYSTEM,
				_id: '_design/athena-v1',
				view: ev.STR.ALL_NOTICES_VIEW,
				query: t.misc.formatObjAsQueryParams({ include_docs: include_docs, skip: skip, limit: limit, descending: true }),
				SKIP_CACHE: (options.SKIP_CACHE === true),
			};
			logger.debug('[notification lib] - filtering notification docs, using query options:', opts.query);
			t.otcc.getDesignDocView(opts, (err, resp) => {
				if (err) {
					logger.error('[notification lib] - could not find all notification docs', err);
					return get_cb(err, null);
				} else {
					return get_cb(null, resp);
				}
			});
		}

		// get component notifications
		function get_component_notifications(id, get_cb) {
			const opts = {
				db_name: ev.DB_SYSTEM,
				_id: '_design/athena-v1',
				view: 'component_notifications',
				query: t.misc.formatObjAsQueryParams({ key: id, include_docs: include_docs, skip: skip, limit: limit, descending: true }),
				SKIP_CACHE: (options.SKIP_CACHE === true),
			};
			logger.debug('[notification lib] - filtering notification docs, using query options:', opts.query);
			t.otcc.getDesignDocView(opts, (err, resp) => {
				if (err) {
					return get_cb(err, null);
				} else {
					return get_cb(null, resp);
				}
			});
		}
	};

	// merge notifications built onto a fake req obj w/the main req obj
	exports.merge_notices = (main_req, fake_req) => {
		if (main_req && fake_req) {
			if (!Array.isArray(main_req._notifications)) {
				main_req._notifications = [];														// init
			}
			if (Array.isArray(fake_req._notifications) && fake_req._notifications.length > 0) {
				main_req._notifications = main_req._notifications.concat(fake_req._notifications); // merge
			}
		}
	};

	//--------------------------------------------------
	// List all notifications
	//--------------------------------------------------
	/*
	* req: {}  // request object
	*/
	exports.list_all = (req, cb) => {
		const url_parts = typeof req.url === 'string' ? t.url.parse(req.url, true) : null;
		let opts = null;
		if (url_parts && url_parts.query) {
			opts = url_parts.query;					// pass all query params directly into options
		}
		opts.SKIP_CACHE = t.ot_misc.skip_cache(req);

		t.notifications.get(opts, (err, resp) => {
			if (err) {
				logger.error('[notification apis] - could not get notifications', err);
				err.statusCode = err.statusCode ? err.statusCode : 500;
				return cb(err);
			} else {
				return cb(null, resp);
			}
		});
	};

	//--------------------------------------------------
	// Delete all notifications
	//--------------------------------------------------
	/*
	* req: {}  // request object
	*/
	exports.delete_all = (req, cb) => {

		// build a notification doc
		const notice = { message: 'deleting all notifications' };
		t.notifications.procrastinate(req, notice);

		t.notifications.purge((err, resp) => {
			if (err) {
				logger.error('[notification apis] - could not delete all notifications', err);
				err.statusCode = err.statusCode ? err.statusCode : 500;
				return cb(err);
			} else {
				const ret = {
					message: 'ok',
					details: resp,
				};
				return cb(null, ret);
			}
		});
	};

	//--------------------------------------------------
	// Archive notifications
	//--------------------------------------------------
	/*
	* req: {}  // request object
	*/
	exports.archive = (req, cb) => {

		// build a notification doc
		const notice = { message: 'archiving notifications' };
		t.notifications.procrastinate(req, notice);

		t.notifications.archive_db_notifications(req.body.notification_ids, (err, res) => {
			if (err) {
				logger.error('[notification apis] - could not archive notifications', err);
				err.statusCode = err.statusCode ? err.statusCode : 500;
				return cb(err);
			} else {
				const ret = {
					message: 'ok',
					details: res,
				};
				return cb(null, ret);
			}
		});
	};

	return exports;
};
