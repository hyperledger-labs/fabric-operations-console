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
// other_apis.test.js - Test other_apis
//------------------------------------------------------------
const common = require('../common-test-framework');
const chai = require('chai');
const expect = chai.expect;
const chaiHttp = require('chai-http');
const tools = common.tools;
const sinon = require('sinon');
tools.misc = require('../../../libs/misc.js')(common.logger, common.tools);
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);
const auth_scheme_objects = require('../../docs/auth_scheme_objects.json');
const settings_objects = require('../../docs/settings_objects.json');
const athena_settings = require('../../docs/athena_settings.json');
let ev = common.ev;
ev.update = () => { };
common.ev.ACCESS_LIST = {
	'someone_else@us.ibm.com': { 'roles': ['manager'], }
};

const createStubs = () => {
	return {
		clear: sinon.stub(tools.session_store, 'clear'),
		getDoc: sinon.stub(tools.otcc, 'getDoc'),
		update: sinon.stub(ev, 'update'),
		writeDoc: sinon.stub(tools.otcc, 'writeDoc'),
		retry_req: sinon.stub(tools.misc, 'retry_req'),
	};
};

const myutils = require('../../testing-lib/test-middleware');
const other_apis_objects = require('../../docs/other_apis_objects.json');

let other_apis;

chai.use(chaiHttp);

describe('Other APIs', () => {
	beforeEach((done) => {
		tools.stubs = createStubs();
		tools.middleware.verify_settings_action_session = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_settings_action_ak = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_restart_action_session = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_restart_action_ak = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_logs_action_session = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_logs_action_ak = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_view_action_session = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_view_action_ak = (req, res, next) => {
			return next();
		};
		other_apis = require('../../../routes/other_apis.js')(common.logger, common.ev, tools);
		this.app = common.expressApp(other_apis);
		done();
	});
	afterEach(() => {
		myutils.restoreStubs(tools.stubs);
	});

	const get_private_settings = () => {
		return [
			{
				itStatement: 'should return a status 200 and the private settings test_id=yjhzyz',
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(JSON.stringify(res.body.DEPLOYER_URL)).to.equal('"?"');
				}
			}
		];
	};

	const get_health_check = () => {
		return [
			{
				itStatement: 'should return a status 200 and the message ok test_id=yqbxuz',
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(res.body.message).to.equal('ok');
				}
			}
		];
	};

	const reset_athena = () => {
		return [
			{
				itStatement: 'should return a status 200 and the correct response test_id=vijqoc',
				username: 'admin',
				password: 'random',
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(JSON.stringify(res.body.message)).to.equal(JSON.stringify('restarting - give me 5-30 seconds'));
				}
			}
		];
	};

	const delete_sessions = () => {
		return [
			{
				itStatement: 'should  test_id=wrxjyd',
				username: 'admin',
				password: 'random',
				callFunction: () => {
					tools.stubs.clear.callsArgWith(0, null, { status: 'ok' });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(202);
					expect(JSON.stringify(res.body.message)).to.equal(JSON.stringify('delete submitted'));
				}
			}
		];
	};

	const edit_settings = () => {
		return [
			{
				itStatement: 'should return a 200 with the correct response of "ok" - all valid input test_id=uxywbj',
				callFunction: (routeInfo) => {
					routeInfo.body = {
						inactivity_timeouts: { enabled: false, max_idle_time: 100000 },
						file_logging: {
							client: {
								enabled: true
							}
						}
					};
					tools.stubs.getDoc.callsArgWith(1, null, athena_settings);
					tools.stubs.writeDoc.callsArgWith(2, null);
					tools.stubs.update.callsArgWith(1, null);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(res.body.FILE_LOGGING.client.enabled).to.equal(true);
				}
			},
			{
				itStatement: 'should return an error sent to "getDoc" stub test_id=bsyffd',
				callFunction: (routeInfo) => {
					routeInfo.body = {
						inactivity_timeouts: { enabled: false, max_idle_time: 100000 },
						file_logging: {
							client: {
								enabled: true
							}
						}
					};
					const err = {
						statusCode: 500,
						msg: 'problem preparing logging setting changes'
					};
					tools.stubs.getDoc.callsArgWith(1, err);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(res.body.msg).to.equal('problem preparing logging setting changes');
				}
			},
			{
				itStatement: 'should return an error - all properties to change are wrong test_id=avkwgm',
				callFunction: (routeInfo) => {
					routeInfo.body = {
						inactivity_timeouts: { enabled: false, max_idle_time: 100000 },
						file_logging: {
							server: {
								enabled: 'i should be a boolean, not a string',
								unique_name: 'i should be a boolean, not a string',
								level: 'i should be a specific string - i am no good'
							},
							client: {
								enabled: 'i should be a boolean, not a string',
								unique_name: 'i should be a boolean, not a string',
								level: { msg: 'i should been a string and i should have been a specific string - i am no good' }
							}
						}
					};
					tools.stubs.getDoc.callsArgWith(1, null, athena_settings);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(400);
					expect(res.body).to.deep.equal(other_apis_objects.edit_settings_error);
				}
			},
			{
				itStatement: 'should return error - error passed to "writeDoc" stub and filters back to the local "writeSettingsDoc" test_id=cibxdi',
				callFunction: (routeInfo) => {
					routeInfo.body = {
						inactivity_timeouts: { enabled: false, max_idle_time: 100000 },
						file_logging: {
							client: {
								enabled: true
							}
						}
					};
					const err = {
						statusCode: 500,
						msg: 'fabricated write error'
					};
					tools.stubs.getDoc.callsArgWith(1, null, athena_settings);
					tools.stubs.writeDoc.callsArgWith(2, err);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({ 'statusCode': 500, 'err': { 'statusCode': 500, 'msg': 'fabricated write error' } })
					);
				}
			},
			{
				itStatement: 'should return a 200 and no errors - exercises the logic dealing with log changes test_id=zqhnhx',
				callFunction: (routeInfo) => {
					routeInfo.body = {
						inactivity_timeouts: { enabled: false, max_idle_time: 100000 },
						file_logging: {
							client: {
								enabled: true
							}
						}
					};
					tools.broadcast_spy = sinon.stub(tools.pillow, 'broadcast');
					tools.stubs.prepare_logging_setting_changes = sinon.stub(tools.logging_apis_lib, 'prepare_logging_setting_changes').callsArgWith(
						1, null, { log_changes: 5 }
					);
					tools.stubs.writeDoc.callsArgWith(2, null);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					sinon.assert.calledWithMatch(tools.broadcast_spy, {
						message_type: 'restart',
						message: 'restarting application b/c edited log settings'
					});
					tools.broadcast_spy.restore();
					delete tools.broadcast_spy;
				}
			},
			{
				itStatement: 'should return an error - error passed to "ev.update" stub test_id=xgtnxk',
				callFunction: (routeInfo) => {
					routeInfo.body = {
						inactivity_timeouts: { enabled: false, max_idle_time: 100000 },
						file_logging: {
							client: {
								enabled: true
							}
						}
					};
					tools.stubs.getDoc.callsArgWith(1, null, athena_settings);
					tools.stubs.writeDoc.callsArgWith(2, null);
					tools.stubs.update.callsArgWith(1, null);
					tools.stubs.update.callsArgWith(1, { 'something': 'horrible' });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({ 'statusCode': 500, 'msg': 'unable to update settings', 'details': { 'something': 'horrible' } })
					);
				}
			},
			{
				itStatement: 'should return an error - invalid timeout values - test_id=zywbuk',
				callFunction: (routeInfo) => {
					routeInfo.body = {
						fabric_get_block_timeout_ms: 'bummer',
						fabric_instantiate_timeout_ms: {},
						fabric_join_channel_timeout_ms: ['bummer'],
						fabric_install_cc_timeout_ms: 'bummer',
						fabric_general_timeout_ms: 'bummer',
					};
					tools.stubs.getDoc.callsArgWith(1, null, athena_settings);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(400);
					expect(res.body).to.deep.equal({
						'statusCode': 400,
						'msgs': ['Expected parameter \'fabric_get_block_timeout_ms\' to be of type: \'number\', but instead was: \'string\'.',
							'Expected parameter \'fabric_instantiate_timeout_ms\' to be of type: \'number\', but instead was: \'object\'.',
							'Expected parameter \'fabric_join_channel_timeout_ms\' to be of type: \'number\', but instead was: \'array\'.',
							'Expected parameter \'fabric_install_cc_timeout_ms\' to be of type: \'number\', but instead was: \'string\'.',
							'Expected parameter \'fabric_general_timeout_ms\' to be of type: \'number\', but instead was: \'string\'.'
						]
					});
				}
			},
			{
				itStatement: 'should return an error - invalid timeout values - test_id=qgcvqs',
				callFunction: (routeInfo) => {
					routeInfo.body = {
						fabric_get_block_timeout_ms: 'Infinity',
						fabric_instantiate_timeout_ms: -1,
						fabric_join_channel_timeout_ms: 9147483647,
					};
					tools.stubs.getDoc.callsArgWith(1, null, athena_settings);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(400);
					expect(res.body).to.deep.equal({
						statusCode: 400,
						msgs: [
							'Parameter \'fabric_get_block_timeout_ms\' is out of range. Must be <= 36000000.',
							'Parameter \'fabric_instantiate_timeout_ms\' is out of range. Must be >= 1000.',
							'Parameter \'fabric_join_channel_timeout_ms\' is out of range. Must be <= 36000000.'
						]
					});
				}
			},
			{
				itStatement: 'should return ok - valid timeout values test_id=dhjhfb',
				callFunction: (routeInfo) => {
					routeInfo.body = {
						fabric_get_block_timeout_ms: '1000',
						fabric_instantiate_timeout_ms: 2000,
						fabric_join_channel_timeout_ms: 20001,
						fabric_install_cc_timeout_ms: '1001',
						fabric_general_timeout_ms: '1000',
					};
					tools.stubs.getDoc.callsArgWith(1, null, athena_settings);
					tools.stubs.writeDoc.callsArgWith(2, null);
					tools.stubs.update.callsArgWith(1, null);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
				}
			},
			{
				itStatement: 'should return input error - valid timeout values test_id=ybtqwv',
				callFunction: (routeInfo) => {
					routeInfo.body = {
						fabric_get_block_timeout_ms: '999',
					};
					tools.stubs.getDoc.callsArgWith(1, null, athena_settings);
					tools.stubs.writeDoc.callsArgWith(2, null);
					tools.stubs.update.callsArgWith(1, null);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(400);
				}
			},
		];
	};

	const get_token = () => {
		return [
			{
				itStatement: 'should return a 200 and the correct response - request module stubbed and forced into cooperation test_id=kpznyb',
				callFunction: (routeInfo) => {
					common.ev.IBM_ID = {
						URL: 'https://i_will_not_work.com'
					};
					const body = JSON.stringify({ access_token: 'i represent an access token' });
					routeInfo.body = body;
					tools.stubs.request = sinon.stub(tools, 'request').callsArgWith(1, null, { statusCode: 200, body: body });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(res.body).to.equal('i represent an access token');
					tools.stubs.request.restore();
				}
			},
			{
				itStatement: 'should return an error - no body was sent test_id=fviauq',
				callFunction: () => {
					common.ev.IBM_ID = {
						URL: 'https://i_will_not_work.com'
					};
					tools.stubs.request = sinon.stub(tools, 'request').callsArgWith(1, null);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ statusCode: 500 }));
					tools.stubs.request.restore();
				}
			},
			{
				itStatement: 'should return  test_id=zppbjb',
				callFunction: () => {
					common.ev.IBM_ID = {
						URL: 'https://i_will_not_work.com'
					};
					const err = {
						statusCode: 500,
						msg: 'problem with request'
					};
					tools.stubs.request = sinon.stub(tools, 'request').callsArgWith(1, err);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ statusCode: 500 }));
					tools.stubs.request.restore();
				}
			},
			{
				itStatement: 'should return  test_id=dbpcdz',
				callFunction: () => {
					common.ev.IBM_ID = {
						URL: 'https://i_will_not_work.com'
					};
					const body = JSON.stringify({ access_token: 'i represent an access token' });
					tools.stubs.request = sinon.stub(tools, 'request').callsArgWith(1, null, { statusCode: 400, body: body });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ statusCode: 500 }));
					tools.stubs.request.restore();
				}
			},
		];
	};

	const testCollection = [
		// GET /api/v1/private-settings
		{
			suiteDescribe: 'GET /api/v1/private-settings',
			mainDescribe: 'Run GET /api/v1/private-settings ',
			arrayOfRoutes: ['/api/v1/private-settings'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_private_settings()
				}
			]
		},

		// GET /ak/api/v1/private-settings
		{
			suiteDescribe: 'GET /ak/api/v1/private-settings',
			mainDescribe: 'Run GET /ak/api/v1/private-settings ',
			arrayOfRoutes: ['/ak/api/v1/private-settings'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_private_settings()
				}
			]
		},

		// GET /ak/api/v3/healthcheck
		{
			suiteDescribe: 'GET /api/v3/healthcheck',
			mainDescribe: 'Run GET /api/v3/healthcheck',
			arrayOfRoutes: ['/api/v3/healthcheck', '/ak/api/v3/healthcheck'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_health_check()
				}
			]
		},

		// GET /api/v1/settings
		{
			suiteDescribe: 'GET /api/v1/settings',
			mainDescribe: 'Run GET /api/v1/settings ',
			arrayOfRoutes: ['/api/v1/settings'],
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
							// Values aren't important for this test and could cause it to fail if an ev gets changed while
							// this test is running. If the keys have been returned then we can assume the API works.
							itStatement: 'should return a status 200 and the correct response - keys of the ev objects test_id=mvyina',
							callFunction: () => {
								tools.stubs.readFileSync = sinon.stub(tools.fs, 'readFileSync').returns('version:1\n' +
									'version:2');
							},
							expectBlock: (res) => {
								const responseKeys = Object.keys(res.body);
								expect(res.status).to.equal(200);
								expect(other_apis_objects.ev_settings_keys_subset.sort()).to.deep.equal(responseKeys.sort());

								const responseKeys2 = Object.keys(res.body.TIMEOUTS);
								expect(other_apis_objects.ev_settings_keys_subset2.sort()).to.deep.equal(responseKeys2.sort());
								tools.stubs.readFileSync.restore();
							}
						}
					]
				}
			]
		},
		// GET /ak/api/v1/settings
		{
			suiteDescribe: 'GET /ak/api/v1/settings',
			mainDescribe: 'Run GET /ak/api/v1/settings ',
			arrayOfRoutes: ['/ak/api/v1/settings'],
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
							// Values aren't important for this test and could cause it to fail if an ev gets changed while
							// this test is running. If the keys have been returned then we can assume the API works.
							itStatement: 'should return a status 200 and the correct response - keys of the ev objects test_id=mvyina',
							callFunction: () => {
								tools.stubs.readFileSync = sinon.stub(tools.fs, 'readFileSync').returns('version:1\n' +
									'version:2');
							},
							expectBlock: (res) => {
								const responseKeys = Object.keys(tools.misc.sortItOut(res.body));
								const has_keys = array_contains_another_array(other_apis_objects.ev_settings_keys_subset, responseKeys);
								expect(res.status).to.equal(200);
								expect(has_keys).to.equal(true);
								tools.stubs.readFileSync.restore();
							}
						}
					]
				}
			]
		},
		// GET /api/v1/health && /ak/api/v1/health
		{
			suiteDescribe: 'GET /api/v1/health',
			mainDescribe: 'Run GET /api/v1/health ',
			arrayOfRoutes: ['/api/v1/health'],
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
							itStatement: 'should return the health statistics test_id=kmrddk',
							callFunction: () => {
								tools.stubs.arch = sinon.stub(tools.os, 'arch').returns(-1);
							},
							expectBlock: (res) => {
								const keys = Object.keys(res.body);
								const expected_keys = Object.keys(other_apis_objects.health_response_valid);
								expect(res.status).to.equal(200);
								expect(JSON.stringify(keys)).to.equal(JSON.stringify(expected_keys));
								tools.stubs.arch.restore();
							}
						}
					]
				}
			]
		},
		// GET /ak/api/v1/health
		{
			suiteDescribe: 'GET /ak/api/v1/health',
			mainDescribe: 'Run GET /ak/api/v1/health ',
			arrayOfRoutes: ['/ak/api/v1/health'],
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
							itStatement: 'should return the health statistics test_id=fckukn',
							callFunction: () => {
								tools.stubs.arch = sinon.stub(tools.os, 'arch').returns(-1);
							},
							expectBlock: (res) => {
								const keys = Object.keys(res.body);
								const expected_keys = Object.keys(other_apis_objects.health_response_valid);
								expect(res.status).to.equal(200);
								expect(JSON.stringify(keys)).to.equal(JSON.stringify(expected_keys));
								tools.stubs.arch.restore();
							}
						},
						{
							itStatement: 'should return the health statistics - ev.PROXY_CACHE_ENABLED set true  test_id=lbpvrt',
							callFunction: () => {
								tools.stubs.arch = sinon.stub(tools.os, 'arch').returns(-1);
								common.ev.PROXY_CACHE_ENABLED = true;
							},
							expectBlock: (res) => {
								const keys = Object.keys(res.body);
								const expected_keys = Object.keys(other_apis_objects.health_response_valid);
								common.ev.PROXY_CACHE_ENABLED = undefined;
								expect(res.status).to.equal(200);
								expect(JSON.stringify(keys)).to.equal(JSON.stringify(expected_keys));
								tools.stubs.arch.restore();
							}
						}
					]
				}
			]
		},
		// POST /api/v1/restart
		{
			suiteDescribe: 'POST /api/v1/restart',
			mainDescribe: 'Run POST /api/v1/restart ',
			arrayOfRoutes: ['/api/v1/restart'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: reset_athena()
				}
			]
		},
		// POST /ak/api/v1/restart
		{
			suiteDescribe: 'POST /ak/api/v1/restart',
			mainDescribe: 'Run POST /ak/api/v1/restart ',
			arrayOfRoutes: ['/ak/api/v1/restart'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: reset_athena()
				}
			]
		},
		// POST /ak/api/v1/restart/force
		{
			suiteDescribe: 'POST /ak/api/v1/restart/force',
			mainDescribe: 'Run POST /ak/api/v1/restart/force ',
			arrayOfRoutes: ['/ak/api/v1/restart/force'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a status 200 and the correct response test_id=qzmyjp',
							username: 'admin',
							password: 'random',
							callFunction: () => {
								tools.stubs.restart_athena = sinon.stub(tools.ot_misc, 'restart_athena').returns(null);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(JSON.stringify(res.body.message)).to.equal(JSON.stringify('you got it'));
								tools.stubs.restart_athena.restore();
							}
						}
					]
				}
			]
		},
		// DELETE /api/v1/sessions
		{
			suiteDescribe: 'DELETE /api/v1/sessions',
			mainDescribe: 'Run DELETE /api/v1/sessions ',
			arrayOfRoutes: ['/api/v1/sessions'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.delete(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: delete_sessions()
				}
			]
		},
		// DELETE /ak/api/v1/sessions
		{
			suiteDescribe: 'DELETE /ak/api/v1/sessions',
			mainDescribe: 'Run DELETE /ak/api/v1/sessions ',
			arrayOfRoutes: ['/ak/api/v1/sessions'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.delete(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: delete_sessions()
				}
			]
		},
		// DELETE /ak/api/v1/sessions/force
		{
			suiteDescribe: 'DELETE /ak/api/v1/sessions/force',
			mainDescribe: 'Run DELETE /ak/api/v1/sessions/force ',
			arrayOfRoutes: ['/ak/api/v1/sessions/force'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.delete(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return 200 - simulated delete to get past middleware and exercise response test_id=rwidlz',
							callFunction: () => {
								tools.stubs.clear.callsArgWith(0, null, 'ok');
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ message: 'ok', deleted: 'ok' }));
							}
						}
					]
				}
			]
		},
		// PUT /ak/api/v1/sessions
		{
			suiteDescribe: 'PUT /ak/api/v1/settings',
			mainDescribe: 'Run PUT /ak/api/v1/settings ',
			arrayOfRoutes: ['/ak/api/v1/settings'],
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
					arrayOfInfoToTest: edit_settings()
				}
			]
		},
		// POST /ak/api/v1/get-token
		{
			suiteDescribe: 'POST /ak/api/v1/get-token',
			mainDescribe: 'Run POST /ak/api/v1/get-token ',
			arrayOfRoutes: ['/ak/api/v1/get-token'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.set('content-type', 'text/plain')
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_token()
				}
			]
		},

		// PUT /api/v1/settings/key && /ak/api/v1/settings/key
		{
			suiteDescribe: 'PUT /api/v1/settings/key',
			mainDescribe: 'Run PUT /api/v1/settings/key',
			arrayOfRoutes: ['/api/v1/settings/key'],
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
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a status of 200 and a message of ok - all params passed were correct test_id=aaaand',
							body: {
								configtxlators: {
									'1.0.0': 'http://oauth_url.com',
								}
							},
							username: 'admin',
							password: 'random',
							callFunction: () => {
								const settings = JSON.parse(JSON.stringify(auth_scheme_objects.athena_system));
								tools.stubs.getDoc.callsArgWith(1, null, settings);
								tools.stubs.writeDoc.callsArgWith(2, null);
								tools.stubs.update.callsArgWith(1, null);
							},
							expectBlock: (res) => {
								expect(res.statusCode).to.equal(200);
								expect(res.body).to.deep.equal({ message: 'ok' });
							}
						},
						{
							itStatement: 'should return an error when a user attempts to change from ibmid - only works for "/ak/" routes test_id=xehvva',
							body: {
								auth_scheme: 'appid'
							},
							username: 'admin',
							password: 'random',
							callFunction: () => {
								common.ev.AUTH_SCHEME = 'ibmid';
								const settings = JSON.parse(JSON.stringify(auth_scheme_objects.athena_system));
								tools.stubs.getDoc.callsArgWith(1, null, settings);
								tools.stubs.writeDoc.callsArgWith(2, null);
								tools.stubs.update.callsArgWith(1, null);
							},
							expectBlock: (res) => {
								if (res.body.statusCode) { expect(res.body.statusCode).to.equal(400); }
								if (res.body.msg) { expect(res.body.msg).to.equal('Your auth_scheme is \'ibmid\'. You are not allowed to change this'); }
								common.ev.AUTH_SCHEME = 'initial';
							}
						},
						{
							itStatement: 'should return an error when a user attempts to change from ibmid - only works for "/ak/" routes test_id=sfhiex',
							body: {
								auth_scheme: 'appid'
							},
							username: 'admin',
							password: 'random',
							callFunction: () => {
								common.ev.AUTH_SCHEME = 'iam';
								const settings = JSON.parse(JSON.stringify(auth_scheme_objects.athena_system));
								tools.stubs.getDoc.callsArgWith(1, null, settings);
								tools.stubs.writeDoc.callsArgWith(2, null);
								tools.stubs.update.callsArgWith(1, null);
							},
							expectBlock: (res) => {
								if (res.body.statusCode) { expect(res.body.statusCode).to.equal(400); }
								if (res.body.msg) { expect(res.body.msg).to.equal('Your auth_scheme is \'ibmid\'. You are not allowed to change this'); }
								common.ev.AUTH_SCHEME = 'initial';
							}
						},
						{
							itStatement: 'should return an error - passed error to get doc stub test_id=xmuvfk',
							username: 'admin',
							password: 'random',
							callFunction: () => {
								const err = {};
								err.statusCode = 404;
								err.msg = 'problem getting doc';
								tools.stubs.getDoc.callsArgWith(1, err);
							},
							expectBlock: (res) => {
								expect(res.statusCode).to.equal(404);
								expect(res.body.statusCode).to.equal(404);
								expect(res.body.msg).to.equal('problem getting doc');
							}
						},
						{
							itStatement: 'should return 200 and a message of ok - simple property change and all params passed were correct test_id=rxyxvc',
							body: {
								support_key: 'user1'
							},
							username: 'admin',
							password: 'random',
							callFunction: () => {
								const settings = JSON.parse(JSON.stringify(auth_scheme_objects.athena_system));
								tools.stubs.getDoc.callsArgWith(1, null, settings);
								tools.stubs.writeDoc.callsArgWith(2, null);
								tools.stubs.update.callsArgWith(1, null);
							},
							expectBlock: (res) => {
								expect(res.statusCode).to.equal(200);
								expect(res.body).to.deep.equal({ message: 'ok' });
							}
						},
						{
							itStatement: 'should return an error - error passed to writeDoc stub test_id=jagsbg',
							body: {
								support_key: 'user1'
							},
							username: 'admin',
							password: 'random',
							callFunction: () => {
								const settings = JSON.parse(JSON.stringify(auth_scheme_objects.athena_system));
								const err = {};
								err.statusCode = 500;
								err.msg = 'problem writing doc';
								tools.stubs.getDoc.callsArgWith(1, null, settings);
								tools.stubs.writeDoc.callsArgWith(2, err);
								tools.stubs.update.callsArgWith(1, err);
							},
							expectBlock: (res) => {
								expect(res.body.statusCode).to.equal(500);
							}
						},
						{
							itStatement: 'should return a status of 500 and an error message - error passed to tools.stubs.update stub test_id=wmhpnc',
							body: {
								support_key: 'user1'
							},
							username: 'admin',
							password: 'random',
							callFunction: () => {
								const settings = JSON.parse(JSON.stringify(auth_scheme_objects.athena_system));
								const err = {};
								err.statusCode = 500;
								err.msg = 'problem updating settings';
								tools.stubs.getDoc.callsArgWith(1, null, settings);
								tools.stubs.writeDoc.callsArgWith(2, null);
								tools.stubs.update.callsArgWith(1, err);
							},
							expectBlock: (res) => {
								expect(res.body.statusCode).to.equal(500);
							}
						}
					]
				}
			]
		},

		// DELETE /api/v1/cache
		{
			suiteDescribe: 'DELETE /api/v1/cache',
			mainDescribe: 'Run DELETE /api/v1/cache ',
			arrayOfRoutes: ['/api/v1/cache'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.delete(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a status 200 and the correct response - exercising flush cache logic test_id=chexlv',
							callFunction: () => {
								common.ev.MEMORY_CACHE_ENABLED = 'ok';
								common.ev.IAM_CACHE_ENABLED = 'ok';
								common.ev.PROXY_CACHE_ENABLED = 'ok';
								common.ev.SESSION_CACHE_ENABLED = 'ok';
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
							}
						}
					]
				}
			]
		},
		// DELETE /ak/api/v1/cache
		{
			suiteDescribe: 'DELETE /ak/api/v1/cache',
			mainDescribe: 'Run DELETE /ak/api/v1/cache ',
			arrayOfRoutes: ['/ak/api/v1/cache'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.delete(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a status 200 and the correct response - exercising flush cache logic test_id=khomzv',
							callFunction: () => {
								common.ev.MEMORY_CACHE_ENABLED = 'ok';
								common.ev.IAM_CACHE_ENABLED = 'ok';
								common.ev.PROXY_CACHE_ENABLED = 'ok';
								common.ev.SESSION_CACHE_ENABLED = 'ok';
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
							}
						}
					]
				}
			]
		},
		// GET /ak/api/v2/advanced-settings
		{
			suiteDescribe: 'GET /ak/api/v2/advanced-settings',
			mainDescribe: 'Run GET /ak/api/v2/advanced-settings ',
			arrayOfRoutes: ['/ak/api/v2/advanced-settings'],
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
							itStatement: 'should return a status 200  test_id=sydksb',
							callFunction: () => {
								tools.env_config_file = process.env.CONFIGURE_FILE;
								process.env.CONFIGURE_FILE = true;
								const settings = JSON.parse(JSON.stringify(settings_objects));
								tools.stubs.readFileSync = sinon.stub(tools.fs, 'readFileSync').returns({
									'_id': 'test_config_doc',
									'should': 'work'
								});
								tools.stubs.getDoc.callsArgWith(1, null, settings);
							},
							expectBlock: (res) => {
								expect(res.statusCode).to.equal(200);
								process.env.CONFIGURE_FILE = tools.env_config_file;
								tools.stubs.readFileSync.restore();
							}
						}
					]
				}
			]
		},
		// GET /ak/api/v2/postman
		{
			suiteDescribe: 'GET /ak/api/v2/postman',
			mainDescribe: 'Run GET /ak/api/v2/postman ',
			arrayOfRoutes: ['/ak/api/v2/postman'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.query(routeInfo.query)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a status 200 and the correct schema test_id=fwpqcy',
							callFunction: (routeInfo) => {
								routeInfo.query = {
									auth_type: 'basic',
									username: 'admin',
									password: 'secret'
								};
							},
							expectBlock: (res) => {
								expect(res.statusCode).to.equal(200);
								expect(res.body.info.schema).to.equal('https://schema.getpostman.com/json/collection/v2.1.0/collection.json');
							}
						}
					]
				}
			]
		},
		// POST /ak/api/v2/requests/stop
		{
			suiteDescribe: 'POST /ak/api/v2/requests/stop',
			mainDescribe: 'Run POST /ak/api/v2/requests/stop ',
			arrayOfRoutes: ['/ak/api/v2/requests/stop'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return 200 - stopping request processing test_id=uknivl',
							callFunction: () => {
								tools.ot_misc.open_server();
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(res.body).to.deep.equal({ message: 'stopping request processing' });
							}
						}
					]
				}
			]
		},

		// POST /ak/api/v2/requests/start
		{
			suiteDescribe: 'POST /ak/api/v2/requests/start',
			mainDescribe: 'Run POST /ak/api/v2/requests/start ',
			arrayOfRoutes: ['/ak/api/v2/requests/start'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return 200 - start request processing test_id=wferky',
							callFunction: () => {
								tools.ot_misc.close_server();
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(res.body).to.deep.equal({ message: 'starting request processing' });
							}
						}
					]
				}
			]
		},

		// POST /ak/api/v2/requests/start
		{
			suiteDescribe: 'POST /ak/api/v2/requests/start',
			mainDescribe: 'Run POST /ak/api/v2/requests/start ',
			arrayOfRoutes: ['/ak/api/v2/requests/start'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return 200 - start request (already started) processing test_id=meadrn',
							callFunction: () => {
								tools.ot_misc.open_server();
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(res.body).to.deep.equal({ message: 'requests processing is already started' });
							}
						}
					]
				}
			]
		},

		// DELETE /ak/api/v3/dbs/:db_name
		{
			suiteDescribe: 'DELETE /ak/api/v3/dbs/:db_name',
			mainDescribe: 'Run DELETE /ak/api/v3/dbs/:db_name ',
			arrayOfRoutes: ['/ak/api/v3/dbs/database_to_delete'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.delete(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return 200 - delete a database test_id=uzzchq',
							callFunction: () => {
								tools.stubs.retry_req.callsArgWith(1, null, {
									statusCode: 200, body: JSON.stringify({ msg: 'ok', deleted: 'database_to_delete' })
								});
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(res.body).to.deep.equal({ deleted: 'database_to_delete', msg: 'ok' });
							}
						}
					]
				},
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return an error - passed error in stub test_id=amsixw',
							callFunction: () => {
								tools.stubs.retry_req.callsArgWith(1, null, { statusCode: 500, body: { msg: 'not ok' } });
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.body.msg).to.deep.equal('not ok');
							}
						}
					]
				}
			]
		},
	];
	// call main test function to run this test collection
	common.mainTestFunction(testCollection, path_to_current_file);
});

function array_contains_another_array(subset_array, superset_array) {
	for (let i = 0; i < subset_array.length; i++) {
		if (!superset_array.includes(subset_array[i])) {
			return false;
		}
	}
	return true;
}
