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
// log_lib.test.js - Test log_lib functions
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const tools = common.tools;
const myutils = require('../../testing-lib/test-middleware');
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);

let logs;

const createStubs = () => {
	return {
		getDesignDocView: sinon.stub(tools.otcc, 'getDesignDocView'),
		bulkDatabase: sinon.stub(tools.couch_lib, 'bulkDatabase'),
		createNewDoc: sinon.stub(tools.otcc, 'createNewDoc'),
		broadcast: sinon.stub(tools.wss1_athena, 'broadcast').returns(true)
	};
};

describe('log_lib.js', () => {
	beforeEach(() => {
		tools.stubs = createStubs();
		logs = require('../../../libs/log_lib.js')(tools);
	});
	afterEach(() => {
		myutils.restoreStubs(tools.stubs);
	});
	const testCollection = [
		// get_log_base_name
		{
			suiteDescribe: 'get_log_base_name',
			mainDescribe: 'Run get_log_base_name',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return "test_server_server.log" - get_log_base_name: passed in "server" as the type test_id=dcgzqp',
							expectBlock: (done) => {
								process.env.SERVER_LOG_FILE_NAME = 'test_server_server.log';
								const result = logs.get_log_base_name('server');
								expect(result).to.equal('test_server_server.log');
								delete process.env.SERVER_LOG_FILE_NAME;
								done();
							}
						},
						{
							itStatement: 'should return "server.log" - get_log_base_name: "server", no SERVER_LOG_FILE_NAME  test_id=kfrtkz',
							expectBlock: (done) => {
								delete process.env.SERVER_LOG_FILE_NAME;
								const result = logs.get_log_base_name('server');
								expect(result).to.equal('server.log');
								done();
							}
						},
						{
							itStatement: 'should return "test_server_server.log" - get_log_base_name: passed in "server" as the type test_id=uyvzlr',
							expectBlock: (done) => {
								process.env.CLIENT_LOG_FILE_NAME = 'test_client_server.log';
								const result = logs.get_log_base_name('client');
								expect(result).to.equal('test_client_server.log');
								delete process.env.CLIENT_LOG_FILE_NAME;
								done();
							}
						},
						{
							itStatement: 'should return "client.log" - get_log_base_name: passed in "client" as the type  test_id=cohgsa',
							expectBlock: (done) => {
								delete process.env.SERVER_LOG_FILE_NAME;
								const result = logs.get_log_base_name('client');
								expect(result).to.equal('client.log');
								done();
							}
						},
						{
							itStatement: 'should return "uh_oh.log" - get_log_base_name: passed in no type  test_id=lhxwxh',
							expectBlock: (done) => {
								const result = logs.get_log_base_name();
								expect(result).to.equal('uh_oh.log');
								done();
							}
						}
					]
				}
			]
		},
		// get_log_path
		{
			suiteDescribe: 'get_log_path',
			mainDescribe: 'Run get_log_path',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the log path  test_id=faivqy',
							expectBlock: (done) => {
								process.env.LOG_PATH = './test_logs';
								const result = logs.get_log_path();
								expect(result).to.equal('./test_logs');
								delete process.env.LOG_PATH;
								done();
							}
						},
						{
							itStatement: 'should return the log path  test_id=hsvvpq',
							expectBlock: (done) => {
								delete process.env.LOG_PATH;
								const result = logs.get_log_path();
								expect(result.includes('logs')).to.equal(true);
								done();
							}
						}
					]
				}
			]
		},
		// build_server_logger
		{
			suiteDescribe: 'build_server_logger',
			mainDescribe: 'Run build_server_logger',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the server logger test_id=ybbnnr',
							expectBlock: (done) => {
								const result = logs.build_server_logger(common.ev);
								expect(result.transports.console.colorize).to.equal(true);
								expect(JSON.stringify(result.transports.console.stderrLevels)).to.equal(JSON.stringify({}));
								expect(result.transports.console.timestamp()).to.be.a('string');
								expect(result.transports.file.colorize).to.equal(false);
								expect(result.transports.file.timestamp()).to.be.a('string');
								expect(result).is.not.null;
								done();
							}
						}
					]
				}
			]
		},
		// build_client_logger
		{
			suiteDescribe: 'build_client_logger',
			mainDescribe: 'Run build_client_logger',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the client logger  test_id=sjexbo',
							expectBlock: (done) => {
								const result = logs.build_client_logger(common.ev);
								expect(result.transports.file.formatter({ message: 'some message' })).to.equal('some message');
								expect(result).is.not.null;
								done();
							}
						},
						{
							itStatement: 'should return null - logging not enabled  test_id=pcqzzz',
							expectBlock: (done) => {
								common.ev.FILE_LOGGING = { client: { enabled: false } };
								const result = logs.build_client_logger(common.ev);
								expect(result).to.equal(null);
								delete common.ev.FILE_LOGGING;
								done();
							}
						}
					]
				}
			]
		},
		// build_log_file_name
		{
			suiteDescribe: 'build_log_file_name',
			mainDescribe: 'Run build_log_file_name',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the name passed in - no ev.FILE_LOGGING  test_id=pzidlu',
							expectBlock: (done) => {
								const result = logs.build_log_file_name(common.ev, 'test_name', 'client');
								expect(result).to.equal('test_name');
								done();
							}
						},
						{
							itStatement: 'should return the name passed in - includes ev.FILE_LOGGING  test_id=zhcvzq',
							expectBlock: (done) => {
								common.ev.FILE_LOGGING = { client: { unique_name: true } };
								process.env.ATHENA_ID = 'test_athena_id';
								const result = logs.build_log_file_name(common.ev, 'server.log', 'client');
								expect(result).to.equal('server-test_athena_id.log');
								delete process.env.ATHENA_ID;
								delete common.ev.FILE_LOGGING;
								done();
							}
						}
					]
				}
			]
		},
		// get_logging_level
		{
			suiteDescribe: 'get_logging_level',
			mainDescribe: 'Run get_logging_level',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the default "debug" - no "ev.FILE_LOGGING" set  test_id=jvoixg',
							expectBlock: (done) => {
								const result = logs.get_logging_level(common.ev, 'client');
								expect(result).to.equal('debug');
								done();
							}
						},
						{
							itStatement: 'should return  - "ev.FILE_LOGGING" set  test_id=yjwtgx',
							expectBlock: (done) => {
								common.ev.FILE_LOGGING = { client: { level: 'info' } };
								const result = logs.get_logging_level(common.ev, 'client');
								expect(result).to.equal('info');
								delete common.ev.FILE_LOGGING;
								done();
							}
						}
					]
				}
			]
		},
		// simpleRandomStringLC
		{
			suiteDescribe: 'simpleRandomStringLC',
			mainDescribe: 'Run simpleRandomStringLC',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a random string test_id=dbhuzr',
							expectBlock: (done) => {
								const random = logs.simpleRandomStringLC(6);
								expect(random).to.be.a('string');
								done();
							}
						}
					]
				}
			]
		},
		// formatDate
		{
			suiteDescribe: 'formatDate',
			mainDescribe: 'Run formatDate',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid response - function given valid arguments: PM test_id=habjoc',
							expectBlock: (done) => {
								const decoded = logs.formatDate(1542109446, '%Y/%M/%d-%H:%m:%s.%r:%I:%p:%P:%q');
								expect(decoded).to.equal('1970/01/18-20:21:49.446:08:pm:PM:1542109446');
								done();
							}
						},
						{
							itStatement: 'should return a valid response - function given valid arguments: AM  test_id=fuqjuo',
							expectBlock: (done) => {
								const decoded = logs.formatDate(1642067200, '%Y/%M/%d-%H:%m:%s.%r:%I:%p:%P:%q');
								expect(decoded).to.equal('1970/01/20-00:07:47.200:12:am:AM:1642067200');
								done();
							}
						},
						{
							itStatement: 'should return a valid response - default condition  test_id=vwbsxi',
							expectBlock: (done) => {
								const decoded = logs.formatDate(1642067200, '%Z');
								expect(decoded).to.equal('1642067200');
								done();
							}
						},
					]
				}
			]
		},

		// validate_log_settings - green tests
		{
			suiteDescribe: 'validate_log_settings valid',
			mainDescribe: 'Run validate_log_settings valid',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return 0 errors - send all settings - test_id=yitirm',
							expectBlock: (done) => {
								const data = {
									'file_logging': {
										'client': {
											'enabled': true,
											'unique_name': true,
											'level': 'debug'
										},
										'server': {
											'enabled': true,
											'unique_name': true,
											'level': 'debug'
										}
									}
								};
								const error_array = logs.validate_log_settings(data);
								expect(error_array.length).to.equal(0);
								done();
							}
						},
						{
							itStatement: 'should return 0 errors - send nothing - test_id=pudhxz',
							expectBlock: (done) => {
								const data = {};
								const error_array = logs.validate_log_settings(data);
								expect(error_array.length).to.equal(0);
								done();
							}
						},
						{
							itStatement: 'should return 0 errors - send only logging a settings - test_id=bvcurb',
							expectBlock: (done) => {
								const data = {
									'file_logging': {
										'client': {
											'enabled': true,
											'unique_name': true,
											'level': 'debug'
										},
										'server': {
											'enabled': true,
											'unique_name': true,
											'level': 'debug'
										}
									}
								};
								const error_array = logs.validate_log_settings(data);
								expect(error_array.length).to.equal(0);
								done();
							}
						},
						{
							itStatement: 'should return 0 errors - send only logging b settings - test_id=gxqjoh',
							expectBlock: (done) => {
								const data = {
									'file_logging': {
										'client': {
											'enabled': true,
											'unique_name': true,
											'level': 'debug'
										}
									}
								};
								const error_array = logs.validate_log_settings(data);
								expect(error_array.length).to.equal(0);
								done();
							}
						},
						{
							itStatement: 'should return 0 errors - send only logging c settings - test_id=ykvwyh',
							expectBlock: (done) => {
								const data = {
									'file_logging': {
										'server': {
											'enabled': true,
											'unique_name': true,
											'level': 'debug'
										}
									}
								};
								const error_array = logs.validate_log_settings(data);
								expect(error_array.length).to.equal(0);
								done();
							}
						},
					]
				}
			]
		},
		// validate_log_settings - error tests
		{
			suiteDescribe: 'validate_log_settings invalid',
			mainDescribe: 'Run validate_log_settings invalid',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return 6 errors - send all bad - test_id=vtznpt',
							expectBlock: (done) => {
								const data = {
									'file_logging': {
										'client': {
											'enabled': 'bad',
											'unique_name': 'bad',
											'level': 'bad'
										},
										'server': {
											'enabled': 'bad',
											'unique_name': 'bad',
											'level': 'bad'
										}
									}
								};
								const error_array = logs.validate_log_settings(data);
								expect(error_array.length).to.equal(6);
								done();
							}
						},
						{
							itStatement: 'should return 2 errors - some bad some good - test_id=wypajq',
							expectBlock: (done) => {
								const data = {
									'file_logging': {
										'client': {
											'level': 'bad'
										},
										'server': {
											'enabled': 'bad',
											'unique_name': true,
											'level': 'debug'
										}
									}
								};
								const error_array = logs.validate_log_settings(data);
								expect(error_array.length).to.equal(2);
								done();
							}
						},
						{
							itStatement: 'should return 1 error - bad log level - test_id=taoczn',
							expectBlock: (done) => {
								const data = {
									'file_logging': {
										'server': {
											'level': 'something'
										}
									}
								};
								const error_array = logs.validate_log_settings(data);
								expect(error_array.length).to.equal(1);
								done();
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
