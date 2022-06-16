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
//  couchdb_middleware.test.js - test for  couchdb_middleware
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const tools = common.tools;
const couchdb_middleware = require('../../../libs/middleware/couchdb_middleware.js')(common.logger, common.ev, tools, tools.middleware);
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);
const json_doc = require('../../docs/middleware.json');

const req = {
	session: {
		couchdb_profile: {
			name: 'admin',
			email: 'admin@mail.com'
		}
	}
};

describe('CouchDB Middleware', () => {
	before(() => {
	});
	after(() => {
	});
	const testCollection = [
		//  couchdb_middleware
		{
			suiteDescribe: 'isAuthenticated',
			mainDescribe: 'Run isAuthenticated',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid response - function given valid arguments test_id=ihsbzv',
							expectBlock: (done) => {
								const isAuthenticated = couchdb_middleware.isAuthenticated(req);
								expect(isAuthenticated).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should return undefined - no user session data passed in test_id=cmtckh',
							expectBlock: (done) => {
								const req = {};
								const isAuthenticated = couchdb_middleware.isAuthenticated(req);
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
							itStatement: 'should return a valid response - function given valid arguments  test_id=qrieuc',
							expectBlock: (done) => {
								const user = couchdb_middleware.getName(req);
								expect(user).to.equal('admin');
								done();
							}
						},
						{
							itStatement: 'should return a valid response  test_id=basdnw',
							callFunction: () => {
								sinon.stub(couchdb_middleware, 'isAuthenticated').returns(true);
								req.session.couchdb_profile = null;
							},
							expectBlock: (done) => {
								const user = couchdb_middleware.getName(req);
								expect(user).to.equal(null);
								req.session.couchdb_profile = {
									name: 'admin',
									email: 'admin@mail.com'
								};
								couchdb_middleware.isAuthenticated.restore();
								done();
							}
						},
						{
							itStatement: 'should return null - no user session data passed in  test_id=zggqmk',
							expectBlock: (done) => {
								const req = {};
								const isAuthenticated = couchdb_middleware.getName(req);
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
							itStatement: 'should return a valid response - function given valid arguments  test_id=pygwjr',
							expectBlock: (done) => {
								const email = couchdb_middleware.getEmail(req);
								expect(email).to.equal('admin@mail.com');
								done();
							}
						},
						{
							itStatement: 'should return null - no user session data passed in  test_id=xsiohj',
							expectBlock: (done) => {
								const req = {};
								const isAuthenticated = couchdb_middleware.getEmail(req);
								expect(isAuthenticated).to.equal(null);
								done();
							}
						},
						{
							itStatement: 'should return undefined for email - email property deleted  test_id=shjjcy',
							expectBlock: (done) => {
								delete req.session.couchdb_profile.email;
								const email = couchdb_middleware.getEmail(req);
								expect(email).to.equal(undefined);
								req.session.couchdb_profile.email = 'admin@mail.com';
								done();
							}
						},
						{
							itStatement: 'should return the value of "using_api_key" test_id=vgiahm',
							callFunction: () => {
								sinon.stub(couchdb_middleware, 'isAuthenticated').returns(false);
							},
							expectBlock: (done) => {
								req.using_api_key = true;
								const email = couchdb_middleware.getEmail(req);
								expect(email).to.equal(true);
								couchdb_middleware.isAuthenticated.restore();
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
							itStatement: 'should return a valid response - function given valid arguments test_id=fermiv',
							expectBlock: (done) => {
								req.session = {
									couchdb_profile: {
										name: 'someone',
										email: 'someone_else@us.ibm.com'
									}
								};
								const user = couchdb_middleware.getActions(req);
								expect(JSON.stringify(user)).to.equal(JSON.stringify(json_doc.actions));
								done();
							}
						},
						{
							itStatement: 'should return an empty array of actions - email is not in "ev.ACCESS_LIST" test_id=hqwoxw',
							expectBlock: (done) => {
								req.session = {
									couchdb_profile: {
										name: 'someone',
										email: 'someone_else_else@us.ibm.com'
									}
								};
								const user = couchdb_middleware.getActions(req);
								expect(JSON.stringify(user)).to.equal(JSON.stringify([]));
								done();
							}
						},
						{
							itStatement: 'should return an empty array of actions - no roles property for the session email "ev.ACCESS_LIST" test_id=xxmwlc',
							expectBlock: (done) => {
								req.session = {
									couchdb_profile: {
										name: 'someone',
										email: 'someone_else@us.ibm.com'
									}
								};
								const email = req.session.couchdb_profile.email;
								const roles = JSON.parse(JSON.stringify(common.ev.ACCESS_LIST[email].roles));
								common.ev.ACCESS_LIST[email].roles = null;
								const user = couchdb_middleware.getActions(req);
								expect(JSON.stringify(user)).to.equal(JSON.stringify([]));
								common.ev.ACCESS_LIST[email].roles = roles;
								done();
							}
						},
						{
							itStatement: 'should return null - no user session data passed in test_id=fmslmv',
							expectBlock: (done) => {
								const req = {};
								const actions = couchdb_middleware.getActions(req);
								expect(JSON.stringify(actions)).to.equal(JSON.stringify([]));
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
							itStatement: 'should return the uuid - function given valid arguments test_id=aktzsk',
							expectBlock: (done) => {
								req.session = {
									couchdb_profile: {
										name: 'someone',
										email: 'someone_else@us.ibm.com'
									}
								};
								common.ev.ACCESS_LIST[req.session.couchdb_profile.email].uuid = 'test-uuid';
								const uuid = couchdb_middleware.getUuid(req);
								expect(uuid).to.equal('test-uuid');
								done();
							}
						},
						{
							itStatement: 'should return null - no user session data passed in test_id=phgxpn',
							expectBlock: (done) => {
								const req = {};
								const uuid = couchdb_middleware.getUuid(req);
								expect(uuid).to.equal(null);
								done();
							}
						}
					]
				}
			]
		},
		// getPasswordType
		{
			suiteDescribe: 'getPasswordType',
			mainDescribe: 'Run getPasswordType',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the password type - function given valid arguments test_id=mfxsxc',
							expectBlock: (done) => {
								req.session = {
									couchdb_profile: {
										name: 'someone',
										email: 'someone_else@us.ibm.com',
										password_type: 'admin'
									}
								};
								const password_type = couchdb_middleware.getPasswordType(req);
								expect(password_type).to.equal('admin');
								done();
							}
						},
						{
							itStatement: 'should return null - no password_type field in "req.session.couchdb_profile" test_id=vdwrfj',
							expectBlock: (done) => {
								req.session = {
									couchdb_profile: {
										name: 'someone',
										email: 'someone_else@us.ibm.com'
									}
								};
								const password_type = couchdb_middleware.getPasswordType(req);
								expect(password_type).to.equal(null);
								done();
							}
						},
						{
							itStatement: 'should return null - no user session data passed in test_id=mryequ',
							expectBlock: (done) => {
								const req = {};
								const password_type = couchdb_middleware.getPasswordType(req);
								expect(password_type).to.equal(null);
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
