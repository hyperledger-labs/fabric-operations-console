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
// logging_apis.test.js - Test logging_apis
//------------------------------------------------------------
const common = require('../common-test-framework');
const chai = require('chai');
const expect = chai.expect;
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const tools = common.tools;
tools.misc = require('../../../libs/misc.js')(common.logger, common.tools);
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);
const athena_settings = require('../../docs/athena_settings.json');

const opts = {
	url: 'http://127.0.0.1:5984',
	db_name: 'athena_networks'
};

common.ev.ACCESS_LIST = {
	'someone_else@us.ibm.com': { 'roles': ['manager'], }
};

tools.otcc = require('../../../libs/couchdb.js')(common.logger, tools, opts.url);
tools.middleware = common.tools.middleware;
const myutils = require('../../testing-lib/test-middleware');

tools.client_logger = tools.log_lib.build_client_logger(common.ev);			// rebuild loggers using db settings

let logging_apis;

chai.use(chaiHttp);

const createStubs = () => {
	return {
		is_file_logging_enabled: sinon.stub(tools.log_lib, 'is_file_logging_enabled'),
		get_log_path: sinon.stub(tools.log_lib, 'get_log_path').returns('path'),
		lstatSync: sinon.stub(tools.fs, 'lstatSync').returns({ mtime: '1234:5678' }),
		getDoc: sinon.stub(tools.otcc, 'getDoc'),
		writeDoc: sinon.stub(tools.otcc, 'writeDoc')
	};
};

describe('Logging APIs', () => {
	before((done) => {
		tools.stubs = createStubs();
		tools.client_logger = sinon.stub(tools, 'client_logger');
		tools.fs.readdirSync = sinon.stub(tools.fs, 'readdirSync');
		tools.middleware.verify_logs_action_session = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_logs_action_ak = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_view_action_session = function (req, res, next) {
			return next();
		};
		tools.middleware.verify_view_action_ak = function (req, res, next) {
			return next();
		};
		logging_apis = require('../../../routes/logging_apis.js')(common.logger, common.ev, tools);
		this.app = common.expressApp(logging_apis);
		done();
	});
	after(() => {
		myutils.restoreStubs(tools.stubs);
	});

	const get_latest_log_files = (route) => {
		return [
			{
				itStatement: 'should return a status of 200 and the correct response - logs sent test_id=mabban',
				body: 'some string',
				callFunction: () => {
					tools.fs.readdirSync.returns(['server.log', 'client.log', 'README.md']);
				},
				expectBlock: (res) => {
					const received_text = res.text.replace(/\s/g, '');
					let html = '<html><body><h2>LogFiles</h2><h3>AthenaInstance:undefined</h3><p><ahref="/api/v1/logs/client.log"target="_blank">';
					html += 'client.log</a>-1234-(NaNMB)</p><p><ahref="/api/v1/logs/server.log"target="_blank">server.log</a>-1234-(NaNMB)</p></body></html>';
					expect(res.status).to.equal(200);
					expect(received_text).to.equal(html);
				}
			},
			{
				itStatement: 'should return a status of 200 and the correct response - no logs sent test_id=gvfjqc',
				body: 'some string',
				callFunction: () => {
					tools.fs.readdirSync.returns([]);
				},
				expectBlock: (res) => {
					const received_text = res.text.replace(/\s/g, '');
					const html = '<html><body><h2>LogFiles</h2><h3>AthenaInstance:undefined</h3></body></html>';
					expect(res.status).to.equal(200);
					expect(received_text).to.equal(html);
				}
			}
		];
	};

	const change_log_file_settings = () => {
		return [
			{
				itStatement: 'should return a status of 200 and the correct response - client logging enabled test_id=gyjjvw',
				body: { client: { enabled: true, unique_name: true, level: 'warn' } },
				username: 'admin',
				password: 'random',
				callFunction: () => {
					tools.stubs.getDoc.callsArgWith(1, null, athena_settings.before_logging);
					tools.stubs.writeDoc.callsArgWith(2, null, athena_settings.after_logging);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(JSON.stringify(tools.misc.sortItOut(res.body.file_logging))).to.include(
						JSON.stringify(tools.misc.sortItOut(athena_settings.after_logging.file_logging))
					);
				}
			},
			{
				itStatement: 'should return a status of 200 and the correct response - server logging enabled test_id=psqcpu',
				body: { server: { enabled: false, unique_name: false, level: 'debug' } },
				username: 'admin',
				password: 'random',
				callFunction: () => {
					tools.stubs.getDoc.callsArgWith(1, null, athena_settings.before_logging);
					tools.stubs.writeDoc.callsArgWith(2, null, athena_settings.after_logging);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(JSON.stringify(tools.misc.sortItOut(res.body.file_logging))).to.equal(
						JSON.stringify(tools.misc.sortItOut(athena_settings.after_logging.file_logging))
					);
				}
			},
			{
				itStatement: 'should return an error - error passed to the getDoc stub test_id=ttcipu',
				body: { server: { enabled: false, unique_name: false, level: 'warn' } },
				username: 'admin',
				password: 'random',
				callFunction: () => {
					const err = {};
					err.statusCode = 500;
					err.msg = 'problem changing the logging settings';
					tools.stubs.getDoc.callsArgWith(1, err);
					tools.stubs.writeDoc.callsArgWith(2, null, athena_settings.after_logging);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(res.body.msg).to.equal('problem changing the logging settings');
				}
			},
			{
				itStatement: 'should return an error - error passed to the writeDoc stub test_id=yhdnwb',
				body: { server: { enabled: false, unique_name: false, level: 'debug' } },
				username: 'admin',
				password: 'random',
				callFunction: () => {
					const err = {};
					err.statusCode = 500;
					err.msg = 'problem changing the logging settings';
					tools.stubs.getDoc.callsArgWith(1, null, athena_settings.after_logging);
					tools.stubs.writeDoc.callsArgWith(2, err, athena_settings.after_logging);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(400);
					expect(JSON.stringify(tools.misc.sortItOut(res.body.file_logging))).to.equal(
						JSON.stringify(tools.misc.sortItOut(athena_settings.after_logging.file_logging))
					);
				}
			},
			{
				itStatement: 'should return a status of 400 - invalid log level test_id=qwrfqf',
				body: { client: { enabled: true, unique_name: true, level: 'invalid' } },
				username: 'admin',
				password: 'random',
				callFunction: () => {
					tools.stubs.getDoc.callsArgWith(1, null, athena_settings.before_logging);
					tools.stubs.writeDoc.callsArgWith(2, null, athena_settings.after_logging);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(400);
				}
			},
		];
	};

	const testCollection = [
		// POST /api/v1/logs
		{
			suiteDescribe: 'POST /api/v1/logs',
			mainDescribe: 'Run POST /api/v1/logs ',
			arrayOfRoutes: ['/api/v1/logs'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post(routeInfo.route)
					.set('content-type', 'text/plain')
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a status of 202 and the correct response - client side logging is disabled test_id=ohaxfc',
							body: 'some string',
							callFunction: () => {
								tools.stubs.is_file_logging_enabled.returns(false);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(202);
								expect(JSON.stringify(res.body.message)).to.equal('"storing client side logs is disabled"');
								common.ev.FILE_LOGGING = undefined;
								tools.stubs.is_file_logging_enabled.returns(true);
							}
						},
						{
							itStatement: 'should return an error - no client logger test_id=rsvfak',
							callFunction: () => {
								tools.client_logger = null;
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(400);
								expect(res.body.message).to.equal('client logger not found');
								tools.client_logger = sinon.stub(tools, 'client_logger');
							}
						},
						{
							itStatement: 'should return an error - no body passed in test_id=mxuhnn',
							callFunction: () => {
								tools.client_logger.debug = function () { return true; };							// bypass debug function
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(400);
								expect(JSON.stringify(res.body.message)).to.equal('"body not found"');
							}
						},
						{
							itStatement: 'should return a status of 200 and the correct response - logger setup properly test_id=scbrcn',
							body: 'some string',
							callFunction: () => {
								tools.client_logger.info = function () { return true; };							// bypass info function
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(JSON.stringify(res.body.message)).to.equal('"ok"');
							}
						}
					]
				}
			]
		},
		// GET /api/v1/logs - Get the latest log files
		{
			suiteDescribe: 'GET /api/v1/logs',
			mainDescribe: 'Run GET /api/v1/logs ',
			arrayOfRoutes: ['/api/v1/logs'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_latest_log_files('/api/v1/logs')
				}
			]
		},
		// GET /api/v1/logs/:logFile - Get the desired log file
		{
			suiteDescribe: 'GET /api/v1/logs/:logFile',
			mainDescribe: 'Run GET /api/v1/logs/:logFile ',
			arrayOfRoutes: ['/api/v1/logs/logFile'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a status of 200 and the correct response test_id=kfyplp',
							expectBlock: (res) => {
								expect(res.statusCode).to.equal(200);
								expect(res.text).to.include('this is the current server time');
							}
						}
					]
				}
			]
		},
		// GET /ak/api/v1/logs/:logFile - Get the desired log file
		{
			suiteDescribe: 'GET /ak/api/v1/logs/:logFile',
			mainDescribe: 'Run GET /ak/api/v1/logs/:logFile ',
			arrayOfRoutes: ['/ak/api/v1/logs/logFile'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a status of 200 and the correct response test_id=kfyplp',
							expectBlock: (res) => {
								expect(res.statusCode).to.equal(200);
								expect(res.text).to.include('this is the current server time');
							}
						}
					]
				}
			]
		},
		// PUT /api/v1/logs/file_settings - Change the file logging settings
		{
			suiteDescribe: 'PUT /api/v1/logs/file_settings',
			mainDescribe: 'PUT /api/v1/logs/file_settings ',
			arrayOfRoutes: ['/api/v1/logs/file_settings'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.put(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: change_log_file_settings()
				}
			]
		},
		// PUT /ak/api/v1/logs/file_settings - Change the file logging settings
		{
			suiteDescribe: 'PUT /ak/api/v1/logs/file_settings',
			mainDescribe: 'PUT /ak/api/v1/logs/file_settings ',
			arrayOfRoutes: ['/ak/api/v1/logs/file_settings'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.put(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: change_log_file_settings()
				}
			]
		}
	];
	// call main test function to run this test collection
	common.mainTestFunction(testCollection, path_to_current_file);
});
