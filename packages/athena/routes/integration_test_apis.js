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
//------------------------------------------------------------
// INTEGRATION TEST API Routes
//------------------------------------------------------------
module.exports = (logger, ev, t) => {
	const app = t.express.Router();
	let integration_test_is_running = false;
	let temp = true;


	app.get('/ak/api/v[123]/integration_test', t.middleware.public, (req, res) => {
		if (test_is_allowed_to_run(req._start_time)) {
			if (temp) {
				res.sendFile(t.path.join(__dirname, '../', '/public/integration_test.html'));
			} else {
				res.status(500).json('setting not enabled to run integration test');
			}
		} else {
			const msg = 'test page not allowed to load from athena. change settings property to enable the test';
			logger.error(msg);
			res.status(400).send(msg);
		}
	});

	//--------------------------------------------------
	// Run Integration Test
	//--------------------------------------------------
	app.post('/ak/api/v[123]/integration_test', t.middleware.verify_create_action_ak, (req, res) => {
		if (!integration_test_is_running) {									// protect the test from being ran more than once at a time
			if (!req.body) {
				logger.error('Integration test cannot be ran - missing the body of the request and the test cannot be setup');
				return res.status(400).json({ msg: 'Integration test cannot be ran - missing the body of the request and the test cannot be setup' });
			} else {
				integration_test_is_running = true;							// lock test from being ran more than once simultaneously
				const Mocha = require('mocha');								// create mocha instance so we can call its run method
				const mocha = new Mocha({
					timeout: 200000											// timeout is high since we have to wait for some long api calls
				});

				// this script runs from the CLI as well as this api. to make it work regardless the args passed in are pushed in to the CLI's array
				delete_integration_test_process_argv_args();	// none of our arguments exist in the array. delete any that do to avoid duplicate entries
				add_process_argv_args(req);						// add the args we need access to in the test

				mocha.addFile(t.path.join(__dirname, '../test/integration_test/integration.test.js'));
				mocha.run((errs) => {
					logger.error(JSON.stringify(errs));
					const relative_path = '../test/integration_test/integration.test.js';
					delete require.cache[require.resolve(t.path.join(__dirname, relative_path))];	// needed for mocha to make consecutive runs
					integration_test_is_running = false;											// unlock so the test can be ran again
					delete_integration_test_process_argv_args();									// restore the process.argv array
					const file_path = t.path.join(__dirname, '..', '/logs/integration_test.log');
					const log_file_contents = t.fs.readFileSync(file_path);
					return res.status(200).json({
						statusCode: 200,
						msg: 'finished running integration test',
						errs: JSON.stringify(errs),
						log_file_contents: log_file_contents.toString()
					});
				});
			}
		} else {
			return res.status(409).json({ statusCode: 409, msg: 'test already in progress - try again later' });
		}
	});

	const add_process_argv_args = (req) => {
		const token = req.headers ? req.headers.authorization: null;
		if (token) {
			process.argv.push('--iam_token_for_integration_test:' + token);
		}
		if (req.body.path) {
			process.argv.push('--path_to_settings_for_integration_test:' + req.body.path) ;
		}
		if (req.body.print_docs) {
			process.argv.push('--print_docs_from_integration_test:' + req.body.print_docs);
		}
		if (req.body.bypassed_tests) {
			process.argv.push('--function_list:' + req.body.bypassed_tests);
		}
	};

	const delete_integration_test_process_argv_args = () => {
		for (let i = process.argv.length - 1; i >= 0; i--) {
			if (process.argv[i].indexOf('iam_token_for_integration_test') > -1) {
				process.argv.splice(i, 1);
				continue;
			}
			if (process.argv[i].indexOf('path_to_settings_for_integration_test') > -1) {
				process.argv.splice(i, 1);
				continue;
			}
			if (process.argv[i].indexOf('print_docs_from_integration_test') > -1) {
				process.argv.splice(i, 1);
				continue;
			}
			if (process.argv[i].indexOf('athena_ev_for_integration_test') > -1) {
				process.argv.splice(i, 1);
			}
		}
	};

	// the test can only be ran within one hour of being set as allowed
	const test_is_allowed_to_run = (timestamp) => {
		if (isNaN(timestamp)) {
			return false;
		} else {
			const hour_in_ms = 60 * 60 * 1000;
			const an_hour_ago = Math.round((Date.now() - hour_in_ms));
			return timestamp > an_hour_ago && ev.integration_test_enabled;
		}
	};

	return app;
};
