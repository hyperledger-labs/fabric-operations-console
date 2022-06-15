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
// A CouchDB simplistic pub/sub library - broadcast only - (there are no individual topics, all messages get sent to all subscribers)
//=======================================================================================================
/*
	opts: {
		"db_name": "SYSTEM_DB"						// required - subscribe to this database's changes
		"last_sequence": "abcd"  					// (optional) the last update sequence you have seen
	}
*/
module.exports = (logger, ev, t, opts) => {
	const NEW_LINE_ENCODING = '%0A';
	const pillow = {};
	pillow.https_mod = require('https');
	pillow.http_mod = require('http');
	pillow.back_off_ms = 0;							// init to 0
	pillow.cb = null;
	opts = opts ? opts : {};						// init

	//-------------------------------------------------------------
	// Listen for couch db changes (using couchdb _changes feature)
	//-------------------------------------------------------------
	/*
		opts: {
			"last_sequence": "abcd"  				// (optional) the last update sequence you have seen
		}
	*/
	function connect() {
		let http = null;
		const parts = t.url.parse(ev.DB_CONNECTION_STRING);
		const since = opts.last_sequence || 'now';
		if (!parts.protocol) {
			parts.protocol = 'http:';				// no protocol, defaults to http
		}
		if (parts.protocol === 'https:') {
			http = pillow.https_mod;
			if (!parts.port) {						// no port for https, defaults 443
				parts.port = 443;
			}
		} else {									// no port for http, defaults 80
			http = pillow.http_mod;
			if (!parts.port) {
				parts.port = 80;
			}
		}

		if (!opts.db_name) {
			logger.error('[pillow] cannot connect. missing input "db_name"');
			return null;
		}

		// see https://docs.couchdb.org/en/2.2.0/api/database/changes.html#continuous for the _changes api details
		const options = {
			host: parts.hostname,
			port: parts.port,
			path: '/' + opts.db_name + '/_changes?filter=athena-v1/broadcast&feed=continuous&heartbeat=90000&since=' + since + '&include_docs=true',
			method: 'GET',
			headers: { 'Accept': 'application/json' }
		};
		if (parts.auth) {								// add auth if its present
			options.headers.authorization = 'Basic ' + t.misc.b64(parts.auth);
		}

		// --------- Handle Data --------- //
		const request = http.request(options, function (resp) {
			let chunk_buffer = '';
			resp.setEncoding('utf8');
			resp.on('data', function (chunk) {											// receive each chunk from couch (always a string) [around 9-11KiB max]
				chunk_buffer += chunk;													// append each chunk (1 json doc might come via multiple chunks)

				if (chunk_buffer[chunk_buffer.length - 1] === '\n') {					// the last chunk for a complete json will end in a new line
					const chips = chunk_buffer.split('\n');								// chunks may contain multiple complete json objects separated w/newline
					const msg_objects = [];
					chunk_buffer = '';													// reset for next couch db msg

					// convert each chip string into a msg object
					for (let i in chips) {
						if (chips[i].trim() !== '') {									// skip empty
							try {
								const data = JSON.parse(decode_newlines(chips[i]));		// parse the data within
								msg_objects.push(data);
							} catch (e) {
								logger.error('[pillow] cannot parse chip:', i, chips[i]);
								logger.error('[pillow] cannot parse chip e:', e);
							}
						}
					}

					// send the doc in each message to the subscribers
					for (let i in msg_objects) {
						const data = msg_objects[i];
						if (data.seq) {
							pillow.back_off_ms = 0;										// reset delay on good data
							opts.last_sequence = data.seq;								// remember the last sequence

							if (data._deleted !== true) {								// skip deleted doc updates
								logger.debug('[pillow] new chatter. i:', i, 'seq:', data.seq, '_id:', data.id);
								if (typeof pillow.cb === 'function' && data.doc) {
									pillow.cb(null, data.doc); 							// send doc. do not return here, more callbacks to spawn
								}
							}
						}
					}
				}
			});

			// --------- Handle Close --------- //
			resp.on('end', function () {													// if we close, open it back up
				logger.warn('[pillow] [1] couchdb link closed. this is okay we will reopen', t.misc.friendly_ms(pillow.back_off_ms));
				return setTimeout(() => {
					bump_back_off();
					connect();																// never end
				}, pillow.back_off_ms);
			});
		});

		// --------- Handle Request Errors --------- //
		request.on('error', function (e) {													// handle error event
			logger.error('[pillow] error - unknown issue with connection: ', e);
			logger.warn('[pillow] [2] couchdb link closed. this is okay we will reopen', t.misc.friendly_ms(pillow.back_off_ms));
			return setTimeout(() => {
				bump_back_off();
				connect();																	// never end
			}, pillow.back_off_ms);
		});
		request.setTimeout(Math.pow(2, 31) - 1);											// don't let client timeouts occur

		// --- send it --- //
		request.end();																		// send the request
		logger.info('[pillow] starting couch connection. db: ' + opts.db_name + ', since:', since);

		// decode newlines - new lines in the msg were encoded during broadcast, bring them back
		function decode_newlines(encoded_str) {
			return encoded_str.replace(new RegExp(NEW_LINE_ENCODING, 'g'), '\\n');
		}
	}

	//-------------------------------------------------------------
	// Listen for athena messages - [aka subscribe]
	//-------------------------------------------------------------
	pillow.listen = (cb) => {
		if (typeof cb === 'function') {
			pillow.cb = cb;												// there's only 1 subscriber per lib, todo make array?
		}
	};

	//-------------------------------------------------------------
	// Send a message to all listeners - [aka publish]
	//-------------------------------------------------------------
	/*
		msg: {															// this object can hold any fields, complete object is sent
			message_type: "restart",  									// [optional] - commonly used
			message: "restarting application b/c edited log settings", 	// [optional] - commonly used
			by: "",														// [optional] - commonly used
			uuid: ""													// [optional] - commonly used
		}
	*/
	pillow.broadcast = (msg, cb) => {
		if (!msg) {
			logger.error('[pillow] message data for pillow doc was not provided');
			if (cb) { return cb(); }
		} else {
			msg.type = 'pillow_talk_doc';								// doc's root type is always this for a pillow talk doc, use `message_type` for sub type
			msg.timestamp = Date.now();									// the date helps w/tidy() (which is on an interval)
			msg.process_id = process.env.ATHENA_ID;						// required field for http_metrics
			t.couch_lib.createNewDoc({ db_name: opts.db_name }, encode_newlines(msg), (err, resp) => {
				if (cb) { return cb(err, resp); }
			});
		}

		// encode newlines so we can detect 1 json message from the next during on('data')
		function encode_newlines(obj) {									// cannot have newlines in msg, anywhere..
			let safe = JSON.stringify(obj).replace(/\\n/g, NEW_LINE_ENCODING);
			return JSON.parse(safe);
		}
	};

	//-------------------------------------------------------------
	// Delete older messages [garbage collect]
	//-------------------------------------------------------------
	/*
		oti: {
			older_than_ms: 1000 * 60 * 60 * 48		// (optional) defaults to 48 hours - make it a long time so we can look @ docs & figure out what happened
		}
	*/
	pillow.tidy = (oti, cb) => {
		const older_than = (oti && oti.older_than_ms && !isNaN(oti.older_than_ms)) ? Number(oti.older_than_ms) : 1000 * 60 * 60 * 48;
		const options = {
			db_name: opts.db_name,
			_id: '_design/athena-v1',
			view: 'pillow_docs',
			query: t.misc.formatObjAsQueryParams({ endkey: Date.now() - older_than, include_docs: true }),	// older than xx hours
		};
		logger.debug('[pillow] looking for old messages...');
		t.couch_lib.getDesignDocView(options, (err, resp) => {
			if (err || !resp || !resp.rows) {
				logger.error('[pillow] could not look up data from view to cleanup', err);
				if (cb) { return cb(err); }
			} else {
				const docs = resp.rows;
				const deleted_docs = [];
				for (let i in docs) {									// loop through docs and build the body for a bulk delete
					const doc = docs[i];
					deleted_docs.push({ _id: doc.doc._id, _rev: doc.doc._rev, _deleted: true });
				}
				if (deleted_docs.length > 0) {							// if we found docs, delete them
					t.couch_lib.bulkDatabase({ db_name: opts.db_name }, { docs: deleted_docs }, (err, resp) => {
						if (err != null) {
							logger.warn('[pillow] could not delete ' + deleted_docs.length + ' old message(s)', err);
						} else {
							logger.debug('[pillow] deleted ' + deleted_docs.length + ' old message(s)');
						}
						if (cb) { return cb(); }
					});
				} else {
					logger.debug('[pillow] 0 old messages found');
					if (cb) { return cb(); }
				}
			}
		});
	};

	//-------------------------------------------------------------
	// Periodic cleanup of older messages
	//-------------------------------------------------------------
	setInterval(() => {
		if (!t.ot_misc.server_is_closed()) {	// don't run during graceful shutoff
			pillow.tidy();						// run every xx hours
		}
	}, 1000 * 60 * 60 * 12);

	// increase back off delay when connections close and we reopen
	function bump_back_off() {
		if (!pillow.back_off_ms) {
			pillow.back_off_ms = 100;		// initial delay value
			return pillow.back_off_ms;
		}

		pillow.back_off_ms = (pillow.back_off_ms * 1.8).toFixed(0);
		if (pillow.back_off_ms > 1000 * 60 * 15) {	// cap the delay
			pillow.back_off_ms = 1000 * 60 * 15;
		}
		return pillow.back_off_ms;
	}

	pillow.tidy();							// run right now
	connect();								// go go gadget
	return pillow;
};
