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
// webhook_lib.js - Library functions for webhook related tasks
//------------------------------------------------------------
module.exports = function (logger, ev, t) {
	const exports = {};

	// ------------------------------------------
	// build a webhook tx doc
	// ------------------------------------------
	exports.store_webhook_doc = function (data, cb) {
		const doc = {
			_id: exports.build_webhook_id(data.tx_id),
			tx_id: data.tx_id || t.misc.simpleRandomString(12).toLowerCase(),
			type: 'webhook_tx',
			ts_started: Date.now(),
			ts_last_updated: Date.now(),
			description: data.description || 'Unknown request',
			status: 'pending',													// the initial status is pending
			by: data.by || '-',
			uuid: data.uuid || '-',
			athena_messages: (data.athena_msg && typeof data.athena_msg === 'string') ? [data.athena_msg] : [],
			timeout_ms: !isNaN(data.timeout_ms) ? Number(data.timeout_ms) : 3 * 60 * 1000,	// default
		};
		if (data.on_step) { doc.on_step = data.on_step; }
		if (data.total_steps) { doc.total_steps = data.total_steps; }
		if (data.sub_type) { doc.sub_type = data.sub_type.toLowerCase(); }
		if (data.client_webhook_url) { doc.client_webhook_url = data.client_webhook_url; }
		if (data.channel_work) { doc.channel_work = data.channel_work; }		// copy if it exists

		if (data.original_template) { doc.original_template = data.original_template; }
		if (data.note) {
			if (!doc.notes || !Array.isArray(doc.notes)) { doc.notes = []; }	// init
			doc.notes.push(data.note);
		}

		t.otcc.writeDoc({ db_name: ev.DB_SYSTEM }, t.misc.sortKeys(doc), (err, wrote_doc) => {
			if (err) {
				logger.error('[webhook lib] - could not create webhook doc', err);
			} else {
				logger.debug('[webhook lib] - created webhook doc', wrote_doc._id);
				t.wss1_athena.broadcast(build_ws_msg(wrote_doc));		// notify apollo about the start of a webhook
			}
			if (cb) { return cb(err, exports.redact_webhook_doc(wrote_doc)); }
		});
	};

	// ------------------------------------------
	// build the webhook doc id
	// ------------------------------------------
	exports.build_webhook_id = function (tx_id) {
		return tx_id;
	};

	// ------------------------------------------
	// remove information not suitable for the UI
	// ------------------------------------------
	exports.redact_webhook_doc = function (doc) {
		delete doc._id; 									// remove stuff we don't want ui seeing
		delete doc._rev;
		delete doc.type;
		delete doc.timeout_ms;
		delete doc.processed_template;
		delete doc.original_template;
		delete doc.client_webhook_url;

		const last_athena_msg = (Array.isArray(doc.athena_messages) && doc.athena_messages.length > 0) ?
			doc.athena_messages[doc.athena_messages.length - 1] : null;
		doc.message = last_athena_msg;
		delete doc.athena_msg;
		return doc;
	};

	// ------------------------------------------
	// check if webhook is expired - returns true if expired
	// ------------------------------------------
	exports.webhook_is_expired = function (doc) {
		const elapsed = Date.now() - doc.ts_last_updated;
		if (!doc.timeout_ms) {
			doc.timeout_ms = 0;			// default
		}
		if (elapsed >= doc.timeout_ms) {
			logger.warn('[webhook lib] - webhook doc is expired. elapsed:', t.misc.friendly_ms(elapsed), doc.tx_id);
			return true;
		}
		return false;
	};

	// ------------------------------------------
	// get a webhook doc from our db
	// ------------------------------------------
	/*
	options = {
		tx_id: 'transaction id',
		SKIP_CACHE: false,
	}
	*/
	exports.get_webhook_doc = function (options, cb) {
		const opts = {
			db_name: ev.DB_SYSTEM,
			_id: exports.build_webhook_id(options.tx_id),
			SKIP_CACHE: (options && options.SKIP_CACHE === true) ? true : false,
		};
		t.otcc.getDoc(opts, (err, doc) => {
			if (err) {
				return cb(err, null);
			} else {
				return cb(null, doc);
			}
		});
	};

	// get template data and format it for webhook response
	exports.format_template_wh = function (wh_doc, cb) {
		if (!wh_doc || !wh_doc.notes) {
			return cb(null, wh_doc);
		} else {
			wh_doc.built = {};										// init, create obj for apollo of built components
			t.async.eachLimit(wh_doc.notes, 8, (note, cb_doc) => {	// iter on "notes", should be an athena component id
				if (!note || !note.component_id) {
					cb_doc();
				} else {
					const id = note.component_id;
					const opts = {
						db_name: ev.DB_COMPONENTS,
						_id: id,
						SKIP_CACHE: true
					};
					t.otcc.getDoc(opts, (err, doc) => {				// get each doc and add the name details to the response
						if (err) {
							logger.error('[webhook lib] could not get component doc for id', id, err, doc);
						} else {
							wh_doc.built[id] = t.comp_fmt.fmt_component_resp({ url: '/ak' }, doc);	// always pretend its an /ak route to redact data
						}
						return cb_doc();
					});
				}
			}, () => {
				logger.debug('[webhook lib] formated template webhook response');
				return cb(null, wh_doc);
			});
		}
	};

	// ------------------------------------------
	// get a webhook formated response, also expire it if its old
	// ------------------------------------------
	exports.get_webhook = function (req, cb) {
		t.webhook.get_webhook_doc({ tx_id: req.params.tx_id, SKIP_CACHE: (req.query.skip_cache === 'yes') }, (err, doc) => {
			if (err) {
				logger.error('[webhook lib] - could not find webhook doc', t.webhook.build_webhook_id(req.params.tx_id), err);
				return cb(err, null);
			} else {
				logger.debug('[webhook lib] - found webhook doc', doc._id);

				// -- expired? -- //
				expire(doc, (error, modified_wh_doc) => {
					if (modified_wh_doc.sub_type === 'template') {				// if its a template webhook, format it
						exports.format_template_wh(modified_wh_doc, (_, template_wh) => {
							delete template_wh._rev;							// redact fields in template docs
							delete template_wh._id;
							template_wh.client_webhook_url = template_wh.client_webhook_url ? t.misc.redact_basic_auth(template_wh.client_webhook_url) : null;
							return cb(error, template_wh);
						});
					} else {
						return cb(error, exports.redact_webhook_doc(modified_wh_doc));
					}
				});
			}
		});

		// expire and format webhook doc
		function expire(doc, cb_expire) {
			const lc_status = (doc && doc.status) ? doc.status.toLowerCase() : null;
			if (lc_status === 'pending' && t.webhook.webhook_is_expired(doc)) {	// see if its expired but the doc is not updated yet
				t.webhook.expire_webhook(req.params.tx_id, (error, new_doc) => {
					if (error) {
						return cb_expire(error, null);							// could not edit the webhook for some reason
					} else {
						return cb_expire(null, new_doc);						// webhook is expired and doc is now updated
					}
				});
			} else {
				return cb_expire(null, doc);									// webhook is good
			}
		}
	};

	// ------------------------------------------
	// get all webhook docs
	// ------------------------------------------
	/*
		opts = {
			statuses: ["pending"],		// the statuses you want returned
			SKIP_CACHE: false,			// defaults false
			skip: 0,					// number of docs to skip. defaults 0
			limit: 100,					// number of docs to include in response. defaults 100
		}
	*/
	exports.get_all_webhook_docs = function (options, cb) {
		const limit = (options && options.limit && !isNaN(options.limit)) ? Number(options.limit) : 100;
		const skip = (options && options.skip && !isNaN(options.skip)) ? Number(options.skip) : 0;
		if (options && options.statuses && Array.isArray(options.statuses)) {
			for (let i in options.statuses) {
				options.statuses[i] = options.statuses[i].toLowerCase();		// conform them to lowercase
			}
		}
		const statuses = (options && options.statuses) || ['pending', 'error', 'success', 'undoing'];

		const opts = {
			db_name: ev.DB_SYSTEM,
			_id: '_design/athena-v1',
			view: 'webhooks_by_ts_completed',
			query: t.misc.formatObjAsQueryParams({ include_docs: true, reduce: false, skip: skip, limit: limit, descending: true }),
			SKIP_CACHE: (options && options.SKIP_CACHE === true) ? true : false,
		};
		logger.debug('[webhook lib] - filtering webhook docs, using query options:', opts.query, statuses);
		t.otcc.getDesignDocView(opts, (err, resp) => {
			if (err) {
				logger.error('[webhook lib] - could not find all webhook docs', err);
				return cb(err, null);
			} else {
				const filtered_docs = filter_by_status(statuses, resp);
				logger.debug('[webhook lib] - found all webhook docs: ', (resp && resp.rows) ? resp.rows.length : 0);
				const ret = { webhooks: filtered_docs };
				ret.total = (resp) ? resp.total_rows : 0;		// number of docs in the view
				ret.matches = ret.webhooks.length;				// number of results that match the request
				return cb(null, t.misc.sortKeys(ret));
			}
		});

		function filter_by_status(statuses, resp) {
			const ret = [];
			if (resp) {
				for (let i in resp.rows) {
					if (resp.rows[i].doc) {
						if (statuses.indexOf(resp.rows[i].doc.status) >= 0) {
							ret.push(resp.rows[i].doc);			// do not redact fields here, _rev is needed w/interval
						}
					}
				}
			}
			return ret;
		}
	};

	// ------------------------------------------
	// get all (formated) webhooks
	// ------------------------------------------
	exports.get_all_webhooks = function (req, cb) {
		const url_parts = typeof req.url === 'string' ? t.url.parse(req.url, true) : null;
		let opts = null;
		if (url_parts && url_parts.query) {
			opts = url_parts.query;
		}
		t.webhook.get_all_webhook_docs(opts, (err, resp) => {
			if (err) {
				return cb(err, null);		// error is logged in deployer lib
			} else {
				for (let i in resp.webhooks) {
					t.webhook.redact_webhook_doc(resp.webhooks[i]);
				}
				return cb(null, resp);
			}
		});
	};

	// ------------------------------------------
	// get all (formated) webhooks for templates
	// ------------------------------------------
	exports.get_all_template_webhooks = function (req, cb) {
		const url_parts = typeof req.url === 'string' ? t.url.parse(req.url, true) : null;
		let opts = null;
		if (url_parts && url_parts.query) {
			opts = url_parts.query;
		}
		t.webhook.get_all_webhook_docs(opts, (err, resp) => {
			if (err) {
				return cb(err, null);		// error is logged in deployer lib
			} else {
				const ret = [];
				t.async.eachLimit(resp.webhooks, 16, (w_doc, w_cb) => {
					if (w_doc.sub_type !== 'template') {
						w_cb();				// skip
					} else {
						exports.format_template_wh(w_doc, (_, template_wh) => {
							delete template_wh._rev;
							delete template_wh._id;		// redact
							template_wh.client_webhook_url = template_wh.client_webhook_url ? t.misc.redact_basic_auth(template_wh.client_webhook_url) : null;
							ret.push(template_wh);
							w_cb();
						});
					}
				}, () => {
					return cb(null, { template_webhooks: ret });
				});
			}
		});
	};

	// ------------------------------------------
	// find and expire the expired webhooks
	// ------------------------------------------
	exports.expire_old_webhooks = function () {
		exports.get_all_webhook_docs({ statuses: ['pending'], SKIP_CACHE: true, limit: 500 }, (err, resp) => {
			if (err || !resp) {
				logger.error('[webhook lib] - did not receive webhook docs to check expirations');	// the error variable is logged elsewhere
				return null;
			} else {
				t.async.eachLimit(resp.webhooks, 4, (w_doc, w_cb) => {		// try not to overwhelm deployer
					if (!w_doc.timeout_ms) {
						w_doc.timeout_ms = 0;				// default
					}

					// add more time so that the proper timeout check and this one don't have a write conflict
					w_doc.timeout_ms += 15000;
					if (!exports.webhook_is_expired(w_doc)) {								// only ask if its timed out
						return w_cb();
					} else {
						exports.fetch_webhook_status(w_doc.tx_id, (dep_err, dep_resp) => {	// ask the deployer one last time
							if (dep_err || !dep_resp || !dep_resp.status) {
								exports.expire_webhook(w_doc.tx_id);						// invalid response means we should expire it...
							} else {
								exports.edit_webhook(w_doc.tx_id, dep_resp);				// valid response, save what deployer sent
							}
							return w_cb();
						});
					}
				}, () => {
					// all webhook docs are checked
				});
			}
		});
	};

	// ------------------------------------------
	// expire a webhook
	// ------------------------------------------
	exports.expire_webhook = function (tx_id, cb) {
		exports.edit_webhook(tx_id, { status: 'error', athena_msg: 'this transaction has timed out' }, cb);
	};

	// ------------------------------------------
	// change a webhook's status/message/something ALSO notify apollo
	// ------------------------------------------
	exports.edit_webhook = function (tx_id, data, cb) {
		const valid_status = ['pending', 'error', 'success', 'undoing'];
		const lc_status = (data && data.status) ? data.status.toLowerCase() : null;
		if (valid_status.indexOf(lc_status) === -1) {							// check if state is acceptable
			const err = {
				statusCode: 400,
				error: 'not a valid value for status: "' + t.misc.safe_str(lc_status) + '"',
				valid: valid_status
			};
			if (cb) { return cb(err, null); }
			return;
		} else {
			if (lc_status === 'error' && (!data || !data.athena_msg)) {	// message is required on error states
				logger.error('[webhook lib] - "athena_msg" should not be blank when setting an error');
				if (!data) { data = {}; }										// init
				data.athena_msg = 'sorry but no error messages was given...'; 	// default error message... go yell at alex
			}

			// -- Get the doc -- //
			t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: exports.build_webhook_id(tx_id), SKIP_CACHE: true }, (err, doc) => {
				if (err) {
					logger.error('[webhook lib] - could not find webhook doc', exports.build_webhook_id(tx_id), err);
					if (cb) { return cb(err, null); }
					return;
				} else {

					// -- Update the doc -- //
					const opts = {
						db_name: ev.DB_SYSTEM,
						doc: doc
					};
					t.otcc.repeatWriteSafe(opts, (tx_doc) => {
						tx_doc.status = lc_status;
						if (data) {
							if (data.athena_msg) {
								if (!tx_doc.athena_messages || !Array.isArray(tx_doc.athena_messages)) {
									tx_doc.athena_messages = [];				// init
								}

								// add the msg at the index of the CURRENT step (b/c steps start at 1)
								// the msg at position 0 is the "starting template" msg
								// the "message" in this update req is commenting on the doc's CURRENT value of on_step (not the new value in this update)
								// thus the ui should display the the last msg in the array
								// once the doc is updated, the "message" in the doc is commenting on the doc's PREVIOUS value of on_step
								const index = tx_doc.on_step >= 0 ? Number(tx_doc.on_step) : 0;
								tx_doc.athena_messages[index] = data.athena_msg;	// add athena's message if available
							}
							if (data.total_steps && !isNaN(data.total_steps)) {
								tx_doc.total_steps = Number(data.total_steps);	// update total_steps if available
							}
							if (data.on_step && !isNaN(data.on_step)) {			// update on_step if available

								// "on_step" represents the current pending step.
								// with templates, when we are "done" on_step will be incremented and be 1 more than the total steps.
								// prevent on_step from going beyond total here.
								tx_doc.on_step = (data.on_step > tx_doc.total_steps) ? Number(tx_doc.total_steps) : Number(data.on_step);
							}
							if (data.description) {
								tx_doc.description = data.description;			// add a description of the tx if available (this is not an update msg)
							}
							if (data.by) {
								tx_doc.by = data.by;							// add who did it if available
							}
							if (data.timeout_ms) {								// edit if provided
								tx_doc.timeout_ms = data.timeout_ms;
							}
							if (data.note) {									// use this to add data to an array on each update
								if (!tx_doc.notes || !Array.isArray(tx_doc.notes)) { tx_doc.notes = []; }	// init
								tx_doc.notes.push(data.note);					// add the note if available
							}
							if (data.original_template) {
								tx_doc.original_template = data.original_template;	// add the template object if available
							}
							if (data.processed_template) {
								tx_doc.processed_template = data.processed_template; // add the template object if available
							}

							// added so Matt can track channel progress when building templates w/channels
							if (data.channel_work) {
								if (!tx_doc.channel_work) {
									tx_doc.channel_work = {};						// init doc field "channel_work"
								}
								if (data.channel_work.added2consortium) {
									tx_doc.channel_work.added2consortium = data.channel_work.added2consortium;	// copy the consortium progress array
								}
								if (data.channel_work.status) {
									tx_doc.channel_work.status = data.channel_work.status.toLowerCase();		// copy the status string
								}
								if (data.channel_work.channels) {
									if (!tx_doc.channel_work.channels) {
										tx_doc.channel_work.channels = {};			// init doc field "channels"
									}
									for (let name in data.channel_work.channels) {
										tx_doc.channel_work.channels[name] = data.channel_work.channels[name];	// copy channel progress obj
									}
								}
							}
						}

						if (lc_status === 'success' || lc_status === 'error') {		// add timestamp of completion if applicable
							tx_doc.ts_completed = Date.now();
							exports.finish_webhook(JSON.parse(JSON.stringify(tx_doc)), () => {
								// no use for callback
							});
						}

						tx_doc.ts_last_updated = Date.now();						// update the time

						return { doc: t.misc.sortKeys(tx_doc) };
					}, (err, wrote_doc) => {
						if (err) {
							logger.error('[webhook lib] unable to edit webhook doc', tx_id, err);
						} else {
							logger.info('[webhook lib] edited webhook doc', tx_id);
							if (!data.silent) {
								t.wss1_athena.broadcast(build_ws_msg(wrote_doc));			// notify apollo about the edit of a webhook
							}
						}
						if (cb) { return cb(err, doc); }
					});
				}
			});
		}
	};

	// ------------------------------------------
	// ask deployer about a webhook transaction
	// ------------------------------------------
	exports.fetch_webhook_status = function (tx_id, cb) {
		const opts = {
			baseUrl: encodeURI(t.misc.format_url(ev.DEPLOYER_URL)),						// url to deployer
			url: encodeURI('/api/v3/txs/' + tx_id),
			method: 'GET',
			headers: { 'Accept': 'application/json' }
		};

		t.request(opts, (err, resp) => {
			let obj = null;
			try {
				obj = JSON.parse(resp.body);
			} catch (e) { }														// if we can't parse it don't worry
			if (t.ot_misc.is_error_code(t.ot_misc.get_code(resp))) {
				logger.error('[webhook lib] - 1 - problem getting status of webhook from deployer', tx_id, (resp) ? resp.body : '?');
				return cb(resp ? resp.body : 'body is empty', null);
			} else if (!obj || !obj.status) {
				logger.error('[webhook lib] - 2 - problem getting status of webhook from deployer', tx_id, (resp) ? resp.body : '?');
				return cb(resp ? resp.body : 'status is missing', null);
			} else {
				logger.info('[webhook lib] - successfully received status from deployer', t.ot_misc.get_code(resp), tx_id, obj);
				return cb(null, obj);
			}
		});
	};

	// ------------------------------------------
	// verify webhook basic auth
	// ------------------------------------------
	/*exports.verify_wh_auth = function (req, res, next) {
		const provided = t.auth_header_lib.parse_auth(req);
		exports.get_webhook_doc({ tx_id: req.params.tx_id, SKIP_CACHE: true }, (err, doc) => {	// grab our doc first
			if (err || !doc) {
				logger.error('[webhook lib] - could not find webhook doc', exports.build_webhook_id(req.params.tx_id), err);
			} else {
				let obj = null;
				try {
					obj = JSON.parse(doc.sb_wh_req_opts.body);						// parse the stored body in the webhook doc
				} catch (e) { }														// if we can't parse it don't worry
				const wh_url = (obj && obj.webhook) ? obj.webhook.url : null;
				const parsed = (wh_url) ? t.url.parse(wh_url) : null;
				const wh_auth = (parsed && parsed.auth) ? parsed.auth.split(':') : null;

				if (!provided || !provided.name || !provided.pass) {
					logger.error('[webhook lib] wh basic auth was not provided to athena api');
					res.set('WWW-Authenticate', 'Basic realm=IBP' + req.params.tx_id);
					return res.status(401).send('Unauthorized');
				} else if (!wh_auth || provided.name !== wh_auth[0] || provided.pass !== wh_auth[1]) {
					logger.error('[webhook lib] provided basic auth does not match webhook doc');
					res.set('WWW-Authenticate', 'Basic realm=IBP' + req.params.tx_id);
					return res.status(401).send('Unauthorized');
				} else {
					logger.debug('[webhook lib] provided basic auth is valid');
					return next();
				}
			}
		});
	};*/

	// build a websocket message
	function build_ws_msg(webhook_doc) {
		const msg = {
			type: 'webhook_tx',
			id: webhook_doc.tx_id,
			status: webhook_doc.status,
			message: webhook_doc.description,		// build the display message
			ts_display: (webhook_doc.status === 'pending') ? webhook_doc.ts_started : webhook_doc.ts_completed,
			ts_started: webhook_doc.ts_started,
			ts_completed: null,						// dne yet
			on_step: webhook_doc.on_step,
			total_steps: webhook_doc.total_steps,
			by: webhook_doc.by,
		};
		if (webhook_doc.sub_type) { msg.sub_type = webhook_doc.sub_type; }
		const last_athena_msg = (Array.isArray(webhook_doc.athena_messages) && webhook_doc.athena_messages.length > 0) ?
			webhook_doc.athena_messages[webhook_doc.athena_messages.length - 1] : null;
		if (webhook_doc.athena_msg) {
			msg.message = webhook_doc.description + ': ' + last_athena_msg;		// build the display message
		}
		return msg;
	}

	// ------------------------------------------
	// send the webhook request to the client
	// ------------------------------------------
	exports.finish_webhook = function (wh_doc, cb) {
		const base_url = wh_doc ? t.misc.format_url(wh_doc.client_webhook_url) : null;
		if (!base_url) {
			logger.debug('[webhook lib] no url to finish web hook. url was not provided for this tx:', wh_doc.tx_id);
			return cb(null);
		} else {
			logger.debug('[webhook lib] finishing webhook. url was provided for tx, sending it now', wh_doc.tx_id);
			const body2send = exports.redact_webhook_doc(wh_doc);

			const options = {
				method: 'POST',
				baseUrl: base_url,										// url to something, could be anything (no whitelist)
				url: '/api/v1/webhooks/txs/' + wh_doc.tx_id,
				headers: {
					'Content-Type': 'application/json',
				},
				timeout: 10000,
				body: JSON.stringify(body2send),
				_name: 'webhook lib',									// name to use in logs
				_max_attempts: 3,
				_tx_id: wh_doc.tx_id,
				_retry_codes: {											// list of error codes we will try again on
					'429': '429 rate limit exceeded aka too many reqs',
					'408': '408 timeout',
					'500': '500 internal error',
					'502': '502 bad gateway',
					'503': '503 gateway timeout',
				}
			};
			t.misc.retry_req(options, (error, resp) => {
				const code = t.ot_misc.get_code(resp);
				if (t.ot_misc.is_error_code(code)) {
					logger.error('[webhook lib] got error code when sending the finished webhook request', code);
				} else {
					logger.info('[webhook lib] got success code when sending the finished webhook request', code);
				}
				return cb(null);
			});
		}
	};

	return exports;
};
