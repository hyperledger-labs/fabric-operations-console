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
// user_preferences_apis.test.js - Test user_preferences_apis
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

const opts = {
	url: 'http://127.0.0.1:5984',
	db_name: 'athena_networks'
};

tools.otcc = require('../../../libs/couchdb.js')(common.logger, tools, opts.url);
tools.middleware = common.tools.middleware;
const myutils = require('../../testing-lib/test-middleware');
const user_preferences_objects = require('../../docs/user_preferences_objects.json');

let user_preferences_apis;

chai.use(chaiHttp);

const createStubs = () => {
	return {
		getDoc: sinon.stub(tools.otcc, 'getDoc'),
		writeDoc: sinon.stub(tools.otcc, 'writeDoc'),
		repeatWriteSafe: sinon.stub(tools.otcc, 'repeatWriteSafe'),
		getUuid: sinon.stub(tools.middleware, 'getUuid').returns('abcdef')
	};
};

describe('User Preferences APIs', () => {
	before((done) => {
		tools.stubs = createStubs();
		tools.middleware.verify_view_action_session = function (req, res, next) {
			return next();
		};
		tools.middleware.verify_view_action_ak = function (req, res, next) {
			return next();
		};
		user_preferences_apis = require('../../../routes/user_preferences_apis.js')(common.logger, common.ev, tools);
		this.app = common.expressApp(user_preferences_apis);
		done();
	});
	after(() => {
		myutils.restoreStubs(tools.stubs);
	});
	const testCollection = [
		// GET /api/v1/user/preferences/get
		{
			suiteDescribe: 'GET /api/v1/user/:user_id/preferences',
			mainDescribe: 'Run GET /api/v1/user/:user_id/preferences ',
			arrayOfRoutes: ['/api/v1/user/someone@mail.com/preferences'],
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
							itStatement: 'should return a status 200 and the correct response test_id=suovsn',
							body: { _id: 'someone@mail.com' },
							callFunction: () => {
								tools.stubs.getDoc.callsArgWith(1, null, user_preferences_objects.valid_post_body);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify(user_preferences_objects.valid_post_body));
							}
						},
						{
							itStatement: 'should return error code and message test_id=mgwepw',
							body: { _id: 'someone@mail.com' },
							callFunction: () => {
								const err = {};
								err.statusCode = 404;
								err.msg = 'could not find doc';
								tools.stubs.getDoc.callsArgWith(1, err);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(404);
								expect(res.body.statusCode).to.equal(404);
								expect(res.body.msg).to.equal('could not find doc');
								expect(res.body.backend_context).to.equal('problem getting the user preferences doc for someone@mail.com');
							}
						}
					]
				}
			]
		},
		// POST /api/v1/user/preferences
		{
			suiteDescribe: 'POST /api/v2/:user_id/preferences',
			mainDescribe: 'Run POST /api/v2/:user_id/preferences ',
			arrayOfRoutes: ['/api/v2/someone@mail.com/preferences'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post(routeInfo.route)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a status 200 and the correct response - everything passed in was valid test_id=gnakwy',
							body: user_preferences_objects.valid_post_body,
							callFunction: () => {
								tools.stubs.getDoc.callsArgWith(1, null, user_preferences_objects.valid_post_body);
								tools.stubs.writeDoc.callsArgWith(2, null, user_preferences_objects.valid_post_response);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify(user_preferences_objects.valid_post_response));
							}
						},
						{
							itStatement: 'should return a status 200 and the correct response - 404 sent so simulate doc creation test_id=tjrtiy',
							body: user_preferences_objects.valid_post_body,
							callFunction: () => {
								const err = {};
								err.statusCode = 404;
								err.msg = 'doc not found';
								tools.stubs.getDoc.callsArgWith(1, err);
								tools.stubs.writeDoc.callsArgWith(2, null, user_preferences_objects.valid_post_response);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify(user_preferences_objects.valid_post_response));
							}
						},
						{
							itStatement: 'should return a status 500 and the show an error getting the document - 500 sent to getDoc test_id=tcudtc',
							body: user_preferences_objects.valid_post_body,
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'problem getting document';
								tools.stubs.getDoc.callsArgWith(1, err);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.body.statusCode).to.equal(500);
								expect(res.body.msg).to.equal('problem getting document');
								expect(res.body.backend_context).to.equal(
									'problem getting preferences doc for someone@mail.com in POST user/preferences route'
								);
							}
						},
						{
							itStatement: 'should return a status 500 and the show an error getting the document - 500 sent to getDoc test_id=nnvezv',
							body: user_preferences_objects.valid_post_body,
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'problem writing the doc';
								tools.stubs.repeatWriteSafe.callsArgWith(2, err);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.body.msg).to.equal('problem getting document');
								expect(res.body.backend_context).to.equal(
									'problem getting preferences doc for someone@mail.com in POST user/preferences route'
								);
							}
						},
						{
							itStatement: 'should return error status and message - error passed to repeatWriteSafe test_id=eqsfcn',
							body: { _id: 'someone@mail.com' },
							callFunction: () => {
								const err = {};
								tools.stubs.getDoc.callsArgWith(1, null, user_preferences_objects.valid_post_body);
								tools.stubs.writeDoc.callsArgWith(2, err);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.body.backend_context).to.equal('problem updating user preferences in the PUT /api/v1/user/preferences route');
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
