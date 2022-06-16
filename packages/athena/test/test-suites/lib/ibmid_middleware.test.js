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
// ibmid_middleware.test.js - test for ibmid_middleware
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const tools = common.tools;
const ibmid_middleware = require('../../../libs/middleware/ibmid_middleware.js')(common.logger, common.ev, tools);
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);
tools.stubs = {};
// const createStubs = () => {
// 	return {
// 		isAuthenticated: sinon.stub()
// 	};
// };

const req = {
	session: {
		passport_profile: {
			name: 'admin',
			email: 'admin@mail.com',
			authorized_actions: ['blockchain.optools.view'],
			iam_id: 'iam-test-id'
		}
	}
};

describe('IBM_ID Middleware', () => {
	before(() => { });
	after(() => { });
	const testCollection = [
		// isAuthenticated
		{
			suiteDescribe: 'isAuthenticated',
			mainDescribe: 'Run isAuthenticated',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid response - function given valid arguments  test_id=xtptes',
							expectBlock: (done) => {
								const isAuthenticated = ibmid_middleware.isAuthenticated(req);
								expect(isAuthenticated).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should return undefined - no user session data passed in  test_id=djehhq',
							expectBlock: (done) => {
								const req = {};
								const isAuthenticated = ibmid_middleware.isAuthenticated(req);
								expect(isAuthenticated).to.equal(false);
								done();
							}
						}
					]
				}
			]
		},
		// getName
		{
			suiteDescribe: 'getName',
			mainDescribe: 'Run getName',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid response - function given valid arguments  test_id=vhtyua',
							expectBlock: (done) => {
								const user = ibmid_middleware.getName(req);
								expect(user).to.equal('admin');
								done();
							}
						},
						{
							itStatement: 'should return null - no user session data passed in  test_id=kuhznl',
							expectBlock: (done) => {
								const req = {};
								const isAuthenticated = ibmid_middleware.getName(req);
								expect(isAuthenticated).to.equal(null);
								done();
							}
						}
					]
				}
			]
		},
		// getEmail
		{
			suiteDescribe: 'getEmail',
			mainDescribe: 'Run getEmail',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid response - function given valid arguments  test_id=fpgtht',
							expectBlock: (done) => {
								const email = ibmid_middleware.getEmail(req);
								expect(email).to.equal('admin@mail.com');
								done();
							}
						},
						{
							itStatement: 'should return null - no user session data passed in  test_id=cnzmfk',
							expectBlock: (done) => {
								const req = {};
								const isAuthenticated = ibmid_middleware.getEmail(req);
								expect(isAuthenticated).to.equal(null);
								done();
							}
						}
					]
				}
			]
		},
		// getUuid
		{
			suiteDescribe: 'getUuid',
			mainDescribe: 'Run getUuid',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the users iam_id - iam_id exists test_id=caklrh',
							callFunction: () => {
								tools.stubs.isAuthenticated = sinon.stub(ibmid_middleware, 'isAuthenticated').returns(true);
							},
							expectBlock: (done) => {
								const uuid = ibmid_middleware.getUuid(req);
								expect(uuid).to.equal('iam-test-id');
								tools.stubs.isAuthenticated.restore();
								done();
							}
						},
						{
							itStatement: 'should return the users id - no iam_id but an id exists test_id=sasxrm',
							callFunction: () => {
								tools.stubs.isAuthenticated = sinon.stub(ibmid_middleware, 'isAuthenticated').returns(true);
							},
							expectBlock: (done) => {
								const req_clone = JSON.parse(JSON.stringify(req));
								delete req_clone.session.passport_profile.iam_id;
								req_clone.session.passport_profile.id = 'user-test-id';
								const uuid = ibmid_middleware.getUuid(req_clone);
								expect(uuid).to.equal('user-test-id');
								tools.stubs.isAuthenticated.restore();
								done();
							}
						},
						{
							itStatement: 'should return null - "isAuthenticated" stub returns false test_id=fuykhe',
							callFunction: () => {
								tools.stubs.isAuthenticated = sinon.stub(ibmid_middleware, 'isAuthenticated').returns(false);
							},
							expectBlock: (done) => {
								const uuid = ibmid_middleware.getUuid(req);
								expect(uuid).to.equal(null);
								tools.stubs.isAuthenticated.restore();
								done();
							}
						}
					]
				}
			]
		},
		// getActions
		{
			suiteDescribe: 'getActions',
			mainDescribe: 'Run getActions',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid response - empty actions, valid arguments test_id=cfvqyz',
							expectBlock: (done) => {
								const user = ibmid_middleware.getActions(req);
								expect(JSON.stringify(user)).to.equal(JSON.stringify(['blockchain.optools.view']));
								done();
							}
						},
						{
							itStatement: 'should return a valid response - ev.REGION set to "local" test_id=bpndrt',
							expectBlock: (done) => {
								common.ev.REGION = 'local';
								const user = ibmid_middleware.getActions(req);
								expect(JSON.stringify(user)).to.equal(JSON.stringify([common.ev.STR.VIEW_ACTION]));
								common.ev.REGION = undefined;
								done();
							}
						},
						{
							itStatement: 'should return an empty array - authorized_actions does not contain the correct value test_id=nrhziz',
							expectBlock: (done) => {
								req.session.passport_profile.authorized_actions = null;
								const user = ibmid_middleware.getActions(req);
								expect(JSON.stringify(user)).to.equal(JSON.stringify([]));
								req.session.passport_profile.authorized_actions = common.ev.STR.VIEW_ACTION;
								done();
							}
						},
						{
							itStatement: 'should return an empty array - no user session data passed in test_id=uzbkcx',
							expectBlock: (done) => {
								const req = {};
								const isAuthenticated = ibmid_middleware.getActions(req);
								expect(JSON.stringify(isAuthenticated)).to.equal(JSON.stringify([]));
								done();
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
