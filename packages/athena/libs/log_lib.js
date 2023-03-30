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
// log_lib.js - Miscellaneous log functions that do NOT use logger (b/c they can't)
//------------------------------------------------------------

module.exports = function (t) {
	const exports = {};
	const winston = t.winston;
	exports.valid_levels = {
		'server': ['error', 'warn', 'info', 'verbose', 'debug', 'silly'],		// official winston levels
		'client': ['error', 'warn', 'info', 'debug'],							// official loglevel levels
	};

	//------------------------------------------------------------
	// get the log file's base name (no suffix)
	//------------------------------------------------------------
	exports.get_log_base_name = function (type) {
		if (type === 'server') {
			return process.env.SERVER_LOG_FILE_NAME || 'server.log';
		}
		if (type === 'client') {
			return process.env.CLIENT_LOG_FILE_NAME || 'client.log';
		}
		console.error('cannot find log file name for invalid type:', type);			// cannot use "logger" here, use console
		return 'uh_oh.log';
	};

	//------------------------------------------------------------
	// get the log file's path
	//------------------------------------------------------------
	exports.get_log_path = function () {
		return process.env.LOG_PATH || t.path.join(__dirname, '../logs');
	};

	//------------------------------------------------------------
	// make a winston logger for client side logs
	//------------------------------------------------------------
	exports.build_server_logger = function (ev) {
		const LOG_PATH = exports.get_log_path();
		const LOG_FILE_BASE = exports.get_log_base_name('server');
		const LOG_FILE_NAME = exports.build_log_file_name(ev, LOG_FILE_BASE, 'server');
		const d = new Date();
		const timezoneOffset = d.getTimezoneOffset();

		let transports = [												// we always have the console transport
			new (winston.transports.Console)({
				colorize: true,
				stderrLevels: [],
				consoleWarnLevels: [],
				timestamp: function () {
					return exports.formatDate(Date.now() - timezoneOffset * 60 * 1000, '%H:%m:%s');	// logs are timestamp local timezone!
				},
			})
		];

		if (exports.is_file_logging_enabled(ev, 'server')) {			// add the file transport if its enabled
			transports.push(
				new winston.transports.File({
					filename: t.path.join(LOG_PATH, LOG_FILE_NAME),
					maxsize: 1024 * 1024 * 2,
					maxFiles: 12,
					tailable: true,
					colorize: false,
					maxRetries: 20,
					timestamp: function () {
						return exports.formatDate(Date.now(), '%Y/%M/%d-%H:%m:%s.%rZ');	// logs are timestamp w/UTC
					},
					json: false,
				})
			);
		}

		return new (winston.Logger)({
			level: exports.get_logging_level(ev, 'server'),
			transports: transports
		});
	};

	//------------------------------------------------------------
	// make a winston logger for client side logs
	//------------------------------------------------------------
	exports.build_client_logger = function (ev) {
		if (!exports.is_file_logging_enabled(ev, 'client')) {
			return null;
		} else {
			const LOG_PATH = exports.get_log_path();
			const LOG_FILE_BASE = exports.get_log_base_name('client');
			const LOG_FILE_NAME = exports.build_log_file_name(ev, LOG_FILE_BASE, 'client');

			return new (winston.Logger)({
				level: exports.get_logging_level(ev, 'client'),
				transports: [
					new winston.transports.File({
						filename: t.path.join(LOG_PATH, exports.build_log_file_name(ev, LOG_FILE_NAME, 'client')),
						maxsize: 1024 * 1024 * 2,
						maxFiles: 12,
						tailable: true,
						colorize: false,
						maxRetries: 20,
						json: false,
						formatter: function (options) {
							return options.message;
						}
					}),
				]
			});
		}
	};

	//------------------------------------------------------------
	// make log file name
	//------------------------------------------------------------
	exports.build_log_file_name = function (ev, name, type) {
		if (ev && ev.FILE_LOGGING && ev.FILE_LOGGING[type]) {
			if (ev.FILE_LOGGING[type].unique_name === true) {
				const pos = name.lastIndexOf('.');		// find the dot. ie the dot in athena.log
				return name.substring(0, pos) + '-' + process.env.ATHENA_ID + name.substring(pos);
			}
		}
		return name;				// defaults to original name
	};

	//------------------------------------------------------------
	// make log file name
	//------------------------------------------------------------
	exports.is_file_logging_enabled = function (ev, type) {
		if (ev && ev.FILE_LOGGING && ev.FILE_LOGGING[type]) {
			return (ev.FILE_LOGGING[type].enabled === true);
		}
		return true;				// defaults true
	};

	//------------------------------------------------------------
	// get logging level
	//------------------------------------------------------------
	exports.get_logging_level = function (ev, type) {
		if (ev && ev.FILE_LOGGING && ev.FILE_LOGGING[type]) {
			if (ev.FILE_LOGGING[type].level && typeof ev.FILE_LOGGING[type].level === 'string') {
				const lc_level = ev.FILE_LOGGING[type].level.toLowerCase();					// sanitize to lowercase

				let use_levels = exports.valid_levels[type];
				if (use_levels && use_levels.includes(lc_level)) {
					return lc_level;
				}
			}
		}
		return 'debug';									// defaults to "debug"
	};

	//------------------------------------------------------------
	// generate random lower case string of length "size" - fast (1sec/million)
	//------------------------------------------------------------
	exports.simpleRandomStringLC = function (size) {
		let ret = '';
		const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'm', 'n', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
			'0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
		for (let i = 0; i < size; i++) {
			let id = ids[Math.floor(Math.random() * ids.length) % ids.length];
			ret += id;
		}
		return ret;
	};

	//------------------------------------------------------------
	// format a date from timestamp
	//------------------------------------------------------------
	exports.formatDate = (date, fmt) => {
		date = new Date(date);

		// left pad number with "0" if needed
		function pad(value, desired) {
			let str = value.toString();
			for (let i = str.length; i < desired; i++) {
				str = '0' + str;
			}
			return str;
		}

		return fmt.replace(/%([a-zA-Z])/g, function (_, fmtCode) {
			let tmp;
			switch (fmtCode) {
				case 'Y':
					return date.getUTCFullYear();
				case 'M':								//Month 0 padded
					return pad(date.getUTCMonth() + 1, 2);
				case 'd':								//Date 0 padded
					return pad(date.getUTCDate(), 2);
				case 'H':								//24 Hour 0 padded
					return pad(date.getUTCHours(), 2);
				case 'I':								//12 Hour 0 padded
					tmp = date.getUTCHours();
					if (tmp === 0) {
						tmp = 12;
					}		//00:00 should be seen as 12:00am
					else if (tmp > 12) {
						tmp -= 12;
					}
					return pad(tmp, 2);
				case 'p':								//am / pm
					tmp = date.getUTCHours();
					if (tmp >= 12) {
						return 'pm';
					}
					return 'am';
				case 'P':								//AM / PM
					tmp = date.getUTCHours();
					if (tmp >= 12) {
						return 'PM';
					}
					return 'AM';
				case 'm':								//Minutes 0 padded
					return pad(date.getUTCMinutes(), 2);
				case 's':								//Seconds 0 padded
					return pad(date.getUTCSeconds(), 2);
				case 'r':								//Milliseconds 0 padded
					return pad(date.getUTCMilliseconds(), 3);
				case 'q':								//UTC timestamp
					return date.getTime();
				default:
					console.error('unsupported fmt for formatDate()', fmt);
					return date.getTime();
			}
		});
	};

	//------------------------------------------------------------
	// check if the log settings are okay
	//------------------------------------------------------------
	exports.validate_log_settings = (settings) => {
		let errors = [];

		// now replace the logging settings
		const server_settings = t.misc.safe_dot_nav(settings, ['settings.server', 'settings.file_logging.server']);
		check_settings(server_settings, 'server');

		const client_settings = t.misc.safe_dot_nav(settings, ['settings.client', 'settings.file_logging.client']);
		check_settings(client_settings, 'client');

		return errors;

		// replace the setting in the doc object
		function check_settings(settings, type) {
			if (settings) {											// it is optional to have each server/client field
				if (typeof settings.enabled !== 'undefined') {
					if (typeof settings.enabled !== 'boolean') {
						errors.push('the ' + type + ' log setting "enabled" must be a boolean');
					}
				}
				if (typeof settings.unique_name !== 'undefined') {
					if (typeof settings.unique_name !== 'boolean') {
						errors.push('the ' + type + ' log setting "unique_name" must be a boolean');
					}
				}
				if (typeof settings.level !== 'undefined') {
					if (typeof settings.level !== 'string') {
						errors.push('the ' + type + ' log setting "level" must be a string');
					} else {
						const lc_new_level = settings.level.toLowerCase();
						if (!exports.valid_levels[type].includes(lc_new_level)) {
							errors.push('the ' + type + ' log setting "level" must be one of:' + JSON.stringify(exports.valid_levels[type]));
						}
					}
				}
			}
		}
	};

	return exports;
};
