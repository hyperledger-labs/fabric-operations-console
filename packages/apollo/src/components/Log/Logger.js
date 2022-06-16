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

import _ from 'lodash';
import debug from 'debug';

const BASE = 'optools';
const COLOURS = {
	trace: 'green',
	info: 'blue',
	warn: 'purple',
	error: 'red',
};

class Logger {
	source = null;

	constructor(source) {
		this.source = source;
	}

	debugMessage(level, message) {
		if (window.log) {
			window.log[level](this.source ? this.source + ':' + message : message);
		}

		const debugLevel = level === 'log' ? 'debug' : level;

		const namespace = `${BASE}:${this.source}:${debugLevel}`;
		const createDebug = debug(namespace);

		createDebug.color = COLOURS[debugLevel];

		if (this.source) {
			createDebug(this.source, message);
		} else {
			createDebug(message);
		}
	}

	handleArgs(args) {
		const output = [];
		args.forEach(arg => {
			if (arg instanceof Error) {
				output.push(arg.toString());		// you can't stringify an error object, results in {}
			} else if (_.isString(arg)) {
				output.push(arg);
			} else {
				try {
					output.push(JSON.stringify(arg, null, 4));
				} catch (error) {
					console.log(error, arg);
				}
			}
		});
		return output.join(' ');
	}

	trace(...args) {
		return this.debugMessage('trace', this.handleArgs(args));
	}

	debug(...args) {
		return this.debugMessage('debug', this.handleArgs(args));
	}

	log(...args) {
		return this.debugMessage('log', this.handleArgs(args));
	}

	info(...args) {
		return this.debugMessage('info', this.handleArgs(args));
	}

	warn(...args) {
		return this.debugMessage('warn', this.handleArgs(args));
	}

	error(...args) {
		return this.debugMessage('error', this.handleArgs(args));
	}

	enable(source) {
		debug.enable(source);
	}

	// set the logging level
	setLogLevel(desired_level) {
		if (window.log) {
			// <--			<--			<--			<--			<--			<--			<--			<--
			const valid_levels = ['error', 'warn', 'info', 'debug']; // official "loglevel" levels, log levels that match and are left of match
			let level = 'warn'; // default is warn + error

			if (typeof desired_level !== 'string') {
				console.warn('this is not a valid logging level:', desired_level, 'try one of:', valid_levels);
			} else {
				const lc_level = desired_level.toLowerCase(); // sanitize to lowercase
				if (valid_levels.indexOf(lc_level) === -1) {
					console.warn('not a valid logging level:', lc_level, 'try one of:', valid_levels);
				} else {
					level = lc_level;
				}
			}

			window.log.setLevel(level);
			if (level === 'debug' && window.stitch) {
				// turn debug on for stitch
				window.stitch.setDebug(true);
			}
		}
	}

	// get the current logging level
	getLogLevel() {
		if (!window.log) {
			return null;
		} else {
			return window.log.getLevel();
		}
	}
}

export default Logger;
