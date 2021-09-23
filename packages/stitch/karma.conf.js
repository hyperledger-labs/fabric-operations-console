/*
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
// Karma configuration
// Generated on Mon Nov 26 2018 21:25:04 GMT-0500 (EST)

module.exports = function (config) {
	config.set({

		// base path that will be used to resolve all patterns (e.g. files, exclude)
		basePath: '',

		// frameworks to use
		// available frameworks: https://npmjs.org/browse/keyword/karma-adapter
		frameworks: ['mocha', 'chai'],

		// list of files / patterns to load in the browser
		files: [
			{ pattern: 'dist/v2.0-protobuf-bundle.json', watched: false, served: true, included: false },
			{ pattern: 'dist/stitch-dependencies.min.js', watched: false },
			{ pattern: 'dist/stitch-main.js', watched: false },
			{ pattern: 'test/index.test.js', watched: true },
			'test/stitch.test.js',
			'test/lifecycle.1.0.test.js',
			'test/lifecycle.2.0.test.js',
		],

		// list of files / patterns to exclude
		exclude: [],

		// preprocess matching files before serving them to the browser
		// available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
		preprocessors: {
			'**/test/index.test.js': ['coverage']
		},

		// test results reporter to use
		// possible values: 'dots', 'progress'
		// available reporters: https://npmjs.org/browse/keyword/karma-reporter
		reporters: ['progress', 'coverage'],

		// web server port
		port: 9876,

		// enable / disable colors in the output (reporters and logs)
		colors: true,

		// level of logging
		// possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
		logLevel: config.LOG_INFO,

		// enable / disable watching file and executing tests whenever any file changes
		autoWatch: true,

		// start these browsers
		// available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
		browserDisconnectTimeout: 10000,
		browserDisconnectTolerance: 3,
		browserNoActivityTimeout: 60000,
		browsers: ['Chrome', 'ChromeHeadless', 'ChromeHeadlessNoSandbox'],
		customLaunchers: {
			ChromeHeadlessNoSandbox: {
				base: 'ChromeHeadless',
				flags: ['--no-sandbox']
			}
		},

		// Continuous Integration mode
		// if true, Karma captures browsers, runs the tests and exits
		singleRun: true,

		// Concurrency level
		// how many browser should be started simultaneous
		concurrency: Infinity,

		// optionally, configure the reporter
		coverageReporter: {
			type: 'html',
			dir: 'coverage/'
		},

		// Socket.io pingTimeout in ms
		pingTimeout: 10000
	});
};
