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
// lockout.test.js - test file for lockout
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const chaiHttp = require('chai-http');
//const sinon = require('sinon');
const tools = common.tools;
const myutils = require('../../testing-lib/test-middleware');
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);

let lockout_lib;

chai.use(chaiHttp);


const createStubs = () => {
	return {};
};

describe('Lockout Lib', () => {
	before(() => {
		tools.stubs = createStubs();
		lockout_lib = require('../../../libs/lockout.js')(common.logger, common.ev, tools);
	});
	after(() => {
		myutils.restoreStubs(tools.stubs);
	});
	const testCollection = [
		// track_api
		{
			suiteDescribe: 'track_api',
			mainDescribe: 'Run track_api',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should record two auth failures - test_id=yogalx',
							callFunction: () => { },
							expectBlock: (done) => {
								const fake_req = {
									ip: 'localhost',
									_tx_id: 'abcd',
									headers: {
										'user-agent': 'PostmanRuntime/7.26.5'
									}
								};
								const fake_res = {
									statusCode: 401,
								};
								lockout_lib.reset();
								lockout_lib.track_api(fake_req, fake_res);
								lockout_lib.track_api(fake_req, fake_res);
								const failures = lockout_lib.get_failures();
								const keys = Object.keys(failures);
								expect(keys.length).to.equal(1);							// key was added for client
								expect(failures[keys[0]].timestamps.length).to.equal(2);	// timestamps were added to first key in object
								done();
							}
						},
						{
							itStatement: 'should NOT record an auth failure - test_id=htfosg',
							callFunction: () => { },
							expectBlock: (done) => {
								const fake_req = {
									ip: 'localhost',
									_tx_id: 'abcd',
									headers: {
										'user-agent': 'PostmanRuntime/7.26.5'
									}
								};
								const fake_res = {
									statusCode: 400,
								};
								lockout_lib.reset();
								lockout_lib.track_api(fake_req, fake_res);
								const failures = lockout_lib.get_failures();
								const keys = Object.keys(failures);
								expect(keys.length).to.equal(0);							// key was added for client
								done();
							}
						},


						{
							itStatement: 'should respond with lockout message - test_id=gnvqhd',
							callFunction: () => { },
							expectBlock: (done) => {
								const fake_req = {
									ip: 'localhost',
									_tx_id: 'abcd',
									headers: {
										'user-agent': 'PostmanRuntime/7.26.5'
									}
								};
								const fake_res = {
									statusCode: 401,
									status: () => {
										return {
											json: (error) => {
												expect(error).to.deep.equal({
													error: 'too many auth failures. client is locked out. try again in 2.0 mins',
													failures: 8
												});
												done();
												return;
											}
										};
									}
								};
								lockout_lib.reset();
								lockout_lib.track_api(fake_req, fake_res);
								lockout_lib.track_api(fake_req, fake_res);
								lockout_lib.track_api(fake_req, fake_res);
								lockout_lib.track_api(fake_req, fake_res);
								lockout_lib.track_api(fake_req, fake_res);
								lockout_lib.track_api(fake_req, fake_res);
								lockout_lib.track_api(fake_req, fake_res);
								lockout_lib.track_api(fake_req, fake_res);		// send spam

								lockout_lib.reject_if_exceeded(fake_req, fake_res, () => {
									// the test should not enter here, since this is the `next()` callback.
								});
							}
						},

						{
							itStatement: 'should NOT respond with lockout message - test_id=xaypnm',
							callFunction: () => { },
							expectBlock: (done) => {
								const fake_req = {
									ip: 'localhost',
									_tx_id: 'abcd',
									headers: {
										'user-agent': 'PostmanRuntime/7.26.5'
									}
								};
								const fake_res = {
									statusCode: 401,
								};
								lockout_lib.reset();
								lockout_lib.track_api(fake_req, fake_res);
								lockout_lib.reject_if_exceeded(fake_req, fake_res, () => {
									done();			// getting here is the test! there is no output
								});
							}
						}
					]
				}
			]
		}
	];
	// call main test function to run this test collection
	common.mainTestFunction(testCollection, path_to_current_file);
});
