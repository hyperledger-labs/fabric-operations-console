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
// server_watcher.js - on file changes performs a server restart - a simpler nodemon
//------------------------------------------------------------
const { watch } = require('chokidar');
const { spawn } = require('child_process');
const winston = require('winston');
const { formatDate } = require('./libs/log_lib.js')({});
let child = null;
let restart_debounce = null;
//let first_run = true;
let file_count = 0;
let notice_crash_interval = null;
let crash_count = 0;

// make another winston logger
const d = new Date();
const timezoneOffset = d.getTimezoneOffset();
const logger = new (winston.Logger)({
	level: 'debug',
	transports: [
		new (winston.transports.Console)({
			colorize: true,
			stderrLevels: [],
			consoleWarnLevels: [],
			timestamp: function () {
				return formatDate(Date.now() - timezoneOffset * 60 * 1000, '%H:%m:%s');	// logs are timestamp local timezone!
			},
		}),
		new winston.transports.File({
			filename: './logs/watcher.log',
			maxsize: 1024 * 1024 * 1,
			maxFiles: 1,
			tailable: true,
			colorize: false,
			maxRetries: 20,
			json: false,
			timestamp: function () {
				return formatDate(Date.now(), '%Y/%M/%d-%H:%m:%s.%rZ');	// logs are timestamp w/UTC
			},
		}),
	]
});

// create the watcher
const watch_paths = [
	'app.js',
	'app_setup/',
	'json_docs/',
	'libs/',
	'logs/athena_restart.log',
	'routes/',
	'scripts/create_databases.js'
];
const watcher = watch(watch_paths, {
	ignored: [/(^|[/\\])\../],				// ignore .dot files, like .gitignore
	persistent: true,
	followSymlinks: true,
});

// setup the actions for our watcher
notice_crashes();
watcher.on('add', path => {
	//if (first_run === false) {				// don't spam logs on initial start
	//	logger.debug('[watcher] file:', path, 'has been added');
	//}
	file_count++;
	restart();
}).on('change', path => {
	logger.debug('[watcher] file:', path, 'has been changed');
	restart();
}).on('unlink', path => {
	logger.debug('[watcher] file:', path, 'has been removed');
	file_count--;
	restart();
});

// restart the server
function restart() {
	if (child) { child.kill(); }
	clearTimeout(restart_debounce);

	restart_debounce = setTimeout(() => {
		//first_run = false;
		logger.debug('[watcher] watching:', file_count, 'files');
		logger.info('[watcher] starting server');
		const opts = { env: process.env, stdio: 'inherit' };		// pass all env vars to child (why not?)
		child = spawn('node', ['--max-old-space-size=4096', '--max-http-header-size=16384', 'app.js'], opts);	// command, args, opts
	}, 200);
}

// restart athena process if it stops for any reason, poll to find if it stopped
function notice_crashes() {
	if (!notice_crash_interval) {					// we only need 1 interval
		notice_crash_interval = setInterval(() => {
			if (child && child.exitCode !== null) {
				crash_count++;
				if (process.env.OPTOOLS_CRASH_POLICY === 'restart') {
					logger.debug('[watcher] optools crashed, count: ' + crash_count + '\n');
					logger.info('[watcher] OpTools is down, restarting via defibrillator.... CLEAR');
					logger.debug('----- zap -----\n');
					restart();
				} else {
					logger.debug('[watcher] optools crashed, count: ' + crash_count + '\n');
					logger.info('[watcher] OpTools is down, all hope is lost, shutting off life support');
					process.exit(1);
				}
			}
		}, 20000);
	}
}
