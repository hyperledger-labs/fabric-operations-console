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
// logging_apis_lib.js - logging apis functions
//------------------------------------------------------------
module.exports = function (logger, ev, t) {
	const exports = {};

	//--------------------------------------------------
	// Save client side logs somewhere
	//--------------------------------------------------
	/*
	* req: {}  // request object
	*/
	exports.save_client_side_logs = (req) => {
		if (!t.log_lib.is_file_logging_enabled(ev, 'client')) {					// if its disabled, do nothing
			//logger.debug('storing client side logging is disabled, this api does nothing');
			return { message: 'storing client side logs is disabled', statusCode: 202 };
			// res.status(202).json({ message: 'storing client side logs is disabled' });
		} else {
			if (!t.client_logger) {										// if the client logger doesn't exist, server log that
				logger.error('failed to store received client logs. client logger not found');
				return { message: 'client logger not found', statusCode: 400 };
			} else if (!req || !req.body || typeof req.body !== 'string') {			// if contents are missing, yell
				t.client_logger.debug('failed to receive client logs. might be empty or not the right "content-type". "text/plain"');
				return { message: 'body not found', statusCode: 400 };
			} else {															// else store the log messages
				t.client_logger.info(req.body);				// log at a high level so it always get stored. control log level verbosity elsewhere
				return { message: 'ok', statusCode: 200 };	// MUST BE A 200 for "loglevel-plugin-remote" - do not change this, i'll find you
			}
		}
	};

	//--------------------------------------------------
	// Get the latest log file
	//--------------------------------------------------
	exports.list_latest_log_files = (req) => {
		const path_name = t.log_lib.get_log_path();
		const entries = t.fs.readdirSync(path_name);
		const data = {};
		let list = '';
		for (let i in entries) {
			if (entries[i] !== 'README.md') {													// skip readme..
				const stats = t.fs.lstatSync(t.path.join(path_name, entries[i]));
				let size = '?';
				let date_time = '???';
				if (stats) {
					size = (stats.size / 1024 / 1024).toFixed(1) + 'MB';
					const pos = stats.mtime.toString().lastIndexOf(':');
					date_time = stats.mtime.toString().substring(0, pos);
					data[entries[i]] = { name: entries[i], size: size, date_time: date_time };
				}
			}
		}

		// alpha sort it then reverse so oldest is first
		let sorted = t.misc.sortItOut(data);
		if (sorted.length === 0) {
			list += '<p>no log files were found in ' + path_name + '</p>';
		}

		let prefix = '';										// choose the route prefix based on the route we used to get here
		if (req && req.path && req.path.includes('/ak/')) {
			prefix = '/ak';
		}

		for (let i in sorted) {
			list += `
					<p>
						<a href="` + prefix + '/api/v1/logs/' + sorted[i].name + '" target="_blank">' + sorted[i].name + `</a>
						 - ` + sorted[i].date_time + ' - (' + sorted[i].size + `)
					</p>`;
		}
		if (ev.HTTP_METRICS_ENABLED) {
			const metrics_route_no_wildcards = ev.HTTP_METRICS_ROUTE.replace('v[123]', 'v3');
			list += `
					<p>
						<a href="` + prefix + metrics_route_no_wildcards + `" target="_blank">http metrics (including access logs)</a>
					</p>`;
		}
		return `
				<html>
					<body>
						<h2>Log Files</h2>
						<h3>Athena Instance: ` + process.env.ATHENA_ID + `</h3>
						 ` + list + `
					</body>
				</html>
		`;
	};

	//--------------------------------------------------
	// Get a specific log file
	//--------------------------------------------------
	/*
	* req: {}  // request object
	*/
	exports.get_specific_log_file = (req) => {
		const path_name = t.log_lib.get_log_path();
		const path_2_file = t.path.join(path_name, req.params.logFile);
		let logs = 'instance_id - "' + process.env.ATHENA_ID + '"\n';
		logs += t.misc.formatDate(Date.now(), '%Y/%M/%d-%H:%m:%s.%rZ') + ' - accessed logs (this is the current server time)\n';
		logs += '-------------------------------------------------------------------------\n\n';

		try {
			logs += t.fs.readFileSync(path_2_file);
		} catch (e) {
			logger.warn(e);
			logs += 'error - could not load file. might not exist. \'' + path_2_file + '\'';
		}
		return logs;
	};

	//--------------------------------------------------
	// Change the logging settings - write the doc
	//--------------------------------------------------
	/*
	* req: {}  // request object
	*/
	exports.change_logging_settings = (req, cb) => {

		// build a notification doc
		const notice = { message: 'editing logging settings' };
		t.notifications.procrastinate(req, notice);

		exports.prepare_logging_setting_changes(req, (err, edited_doc) => {
			if (err) {
				return cb(err, edited_doc);				// error already logged
			} else {
				delete edited_doc.log_changes;			// this is only a flag during execution, don't write it to db

				// update the settings doc in the db
				t.otcc.writeDoc({ db_name: ev.DB_SYSTEM }, edited_doc, (err, updated_doc) => {
					if (err) {
						logger.error('[log lib] unable to change settings', err, updated_doc);
						return cb({ statusCode: 400, file_logging: updated_doc.file_logging });
					} else {
						logger.info('[log lib] changed file logging settings - success');
						cb(null, { statusCode: 200, file_logging: updated_doc.file_logging });	// don't return because we want to broadcast opts after the cb

						const msg = {
							message_type: 'restart',
							message: 'restarting application b/c edited log settings',
							by: t.ot_misc.get_username_for_log(req),
							uuid: t.middleware.getUuid(req),
						};
						t.pillow.broadcast(msg);
					}
				});
			}
		});
	};

	//--------------------------------------------------
	// Change the logging settings - do not write the doc
	//--------------------------------------------------
	/*
	* req: {}  // request object
	*/
	exports.prepare_logging_setting_changes = (req, cb) => {

		// get the Athena settings doc first
		t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, (err, doc) => {
			if (err) {
				logger.error('[logging] unable to get doc to edit file logging settings', err);
				return cb(err);
			} else {
				delete doc.log_changes;			// reset incase its already set, shouldn't be though
				const input_errors = t.log_lib.validate_log_settings(req.body);

				if (input_errors.length > 0) {
					logger.error('[logging] invalid logging settings', input_errors);
					const input_error = {
						statusCode: 400,
						error: 'invalid logging settings',
						details: input_errors,
					};
					return cb(input_error);
				} else {

					// now replace the logging settings
					const server_settings = t.misc.safe_dot_nav(req.body, ['body.file_logging.server', 'body.server']);
					doc = replace_settings(doc, server_settings, 'server');

					const client_settings = t.misc.safe_dot_nav(req.body, ['body.file_logging.client', 'body.client']);
					doc = replace_settings(doc, client_settings, 'client');

					return cb(null, doc);													// all good
				}
			}
		});

		// replace the setting in the doc object
		function replace_settings(doc, new_fields, type) {
			if (!doc.log_changes || isNaN(doc.log_changes)) {
				doc.log_changes = 0;
			}
			if (new_fields) {
				if (!doc.file_logging) {
					doc.file_logging = {};													// init
				}
				if (!doc.file_logging[type]) {
					doc.file_logging[type] = {};											// init
				}

				if (typeof new_fields.enabled !== 'undefined') {
					if (doc.file_logging[type].enabled !== new_fields.enabled) {
						doc.file_logging[type].enabled = new_fields.enabled;				// replace
						doc.log_changes++;
					}
				}

				if (typeof new_fields.unique_name !== 'undefined') {
					if (doc.file_logging[type].unique_name !== new_fields.unique_name) {
						doc.file_logging[type].unique_name = new_fields.unique_name;		// replace
						doc.log_changes++;
					}
				}

				if (typeof new_fields.level !== 'undefined') {
					const lc_new_level = new_fields.level.toLowerCase();
					if (t.log_lib.valid_levels[type].includes(lc_new_level)) {
						if (doc.file_logging[type].level !== lc_new_level) {
							doc.file_logging[type].level = lc_new_level;					// replace
							doc.log_changes++;
						}
					}
				}
			}
			return doc;
		}
	};

	return exports;
};
