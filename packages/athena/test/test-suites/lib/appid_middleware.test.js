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
// appid_middleware.test.js - test for appid_middleware
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const tools = common.tools;
const appid_middleware = require('../../../libs/middleware/appid_middleware.js')(common.logger, common.ev, tools, tools.middleware);
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);

const req = {
	session: {
		passport: {
			user: {
				name: 'admin',
				email: 'admin@mail.com'
			}
		}
	}
};

describe('App_ID Middleware', () => {
	before(() => { });
	after(() => { });
	const testCollection = [
		// appid_middleware
		{
			suiteDescribe: 'isAuthenticated',
			mainDescribe: 'Run isAuthenticated',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid response - function given valid arguments test_id=ecyvtj',
							expectBlock: (done) => {
								const isAuthenticated = appid_middleware.isAuthenticated(req);
								expect(isAuthenticated).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should return undefined - no user session data passed in  test_id=jgvtsx',
							expectBlock: (done) => {
								const req = {};
								const isAuthenticated = appid_middleware.isAuthenticated(req);
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
							itStatement: 'should return a valid response - function given valid arguments  test_id=oyiosh',
							expectBlock: (done) => {
								const user = appid_middleware.getName(req);
								expect(user).to.equal('admin');
								done();
							}
						},
						{
							itStatement: 'should return a valid response - bypassed the "isAuthenticated" function - test_id=jblzig',
							callFunction: () => {
								sinon.stub(appid_middleware, 'isAuthenticated').returns(true);
								req.session.passport.user = null;
							},
							expectBlock: (done) => {
								const user = appid_middleware.getName(req);
								expect(user).to.equal(null);
								req.session.passport.user = {
									name: 'admin',
									email: 'admin@mail.com'
								};
								appid_middleware.isAuthenticated.restore();
								done();
							}
						},
						{
							itStatement: 'should return null - no user session data passed in  test_id=tqjnyr',
							expectBlock: (done) => {
								const req = {};
								const isAuthenticated = appid_middleware.getName(req);
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
							itStatement: 'should return a valid response - function given valid arguments  test_id=iybufd',
							expectBlock: (done) => {
								const email = appid_middleware.getEmail(req);
								expect(email).to.equal('admin@mail.com');
								done();
							}
						},
						{
							itStatement: 'should return null - no user session data passed in  test_id=atxerh',
							expectBlock: (done) => {
								const req = {};
								const isAuthenticated = appid_middleware.getEmail(req);
								expect(isAuthenticated).to.equal(null);
								done();
							}
						},
						{
							itStatement: 'should return null - bypass the "isAuthenticated" function to fully test the else condition test_id=vvguwe',
							callFunction: () => {
								sinon.stub(appid_middleware, 'isAuthenticated').returns(true);
							},
							expectBlock: (done) => {
								const req = {};
								const isAuthenticated = appid_middleware.getEmail(req);
								expect(isAuthenticated).to.equal(null);
								appid_middleware.isAuthenticated.restore();
								done();
							}
						},
						{
							itStatement: 'should return undefined for email - email property deleted  test_id=bwqddx',
							expectBlock: (done) => {
								delete req.session.passport.user.email;
								const email = appid_middleware.getEmail(req);
								expect(email).to.equal(undefined);
								req.session.passport.user.email = 'admin@mail.com';
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
							itStatement: 'should return a valid response - function given valid arguments test_id=iteqzk',
							expectBlock: (done) => {
								req.session = {
									passport: {
										user: {
											name: 'someone',
											email: 'someone_else@us.ibm.com'
										}
									}
								};
								const user = appid_middleware.getActions(req);
								expect(JSON.stringify(user)).to.equal(
									JSON.stringify([
										'blockchain.components.create', 'blockchain.components.delete', 'blockchain.components.remove',
										'blockchain.components.import', 'blockchain.components.export', 'blockchain.optools.restart',
										'blockchain.optools.logs', 'blockchain.optools.view', 'blockchain.users.manage',
										'blockchain.apikeys.manage', 'blockchain.notifications.manage'])
								);
								done();
							}
						},
						{
							itStatement: 'should return null - no user session data passed in test_id=nbwapn',
							expectBlock: (done) => {
								const req = {};
								const actions = appid_middleware.getActions(req);
								expect(JSON.stringify(actions)).to.equal(JSON.stringify([]));
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
