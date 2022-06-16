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
// authentication_lib.test.js - Test authentication_lib functions
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
const myutils = require('../../testing-lib/test-middleware');
const httpMocks = require('node-mocks-http');
const req = httpMocks.createRequest();
let res = httpMocks.createResponse();
const next = sinon.stub();
common.ev.LOGIN_URI = '/auth/login';
const passport = tools.passport;

tools.AppIdWebAppStrategy = {
	STRATEGY_NAME: 'a name'
};

let authentication_lib;

chai.use(chaiHttp);

const createStubs = () => {
	return {
		authenticate: sinon.stub(passport, 'authenticate').returns(function () { }),
		verify_secret: sinon.stub(tools.misc, 'verify_secret'),
	};
};

describe('Authentication Lib', () => {
	before((done) => {
		tools.stubs = createStubs();
		tools.middleware.verify_view_action_ak = function (req, res, next) {
			return next();
		};
		authentication_lib = require('../../../libs/authentication_lib.js')(common.logger, common.ev, tools, passport);
		done();
	});
	after(() => {
		myutils.restoreStubs(tools.stubs);
	});
	const testCollection = [
		// Handle SSO authentication
		{
			suiteDescribe: 'Handle SSO authentication',
			mainDescribe: 'Run Handle SSO authentication ',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a 200 - AUTH_SCHEME is appid test_id=dddygb',
							callFunction: () => {
								common.ev.AUTH_SCHEME = 'appid';
								tools.stubs.authenticate.restore();
							},
							expectBlock: (done) => {
								authentication_lib.sso_login(req, res, next, passport);
								expect(res.statusCode).to.equal(200);
								common.ev.AUTH_SCHEME = 'iam';
								tools.stubs.authenticate = sinon.stub(passport, 'authenticate').returns(function () { });
								done();
							}
						},
						{
							itStatement: 'should return a redirect code and the expected redirect url - all parameters good test_id=tjbkid',
							callFunction: () => {
								common.ev.AUTH_SCHEME = 'iam';
								common.ev.LANDING_URL = 'testing';
								common.ev.IAM = {
									STRATEGY_NAME: 'test_strategy'
								};
								req.session = {
									cookie_test: true,
									save: (cb) => { return cb(); }
								};
								req.url = 'http://127.0.0.1:54000/auth/testing?code=abc';
								tools.stubs.authenticate.callsArgWith(1, null, {});
							},
							expectBlock: (done) => {
								authentication_lib.sso_login(req, res, next, passport);
								expect(res.statusCode).to.equal(302);
								let port = req.url.split(':')[2];
								port = port.split('/')[0];
								const presumed_redirect_url = `http://127.0.0.1:${port}/auth/testing?code=abc`;
								expect(req.url).to.equal(presumed_redirect_url);
								expect(res.statusCode).to.equal(302);
								req.url = null;
								done();
							}
						},
						{
							itStatement: 'should return an error - error passed to authenticate stub - query.code sent test_id=xurgok',
							callFunction: () => {
								common.ev.AUTH_SCHEME = 'iam';
								common.ev.LANDING_URL = 'testing';
								common.ev.IAM = {
									STRATEGY_NAME: 'test_strategy'
								};
								req.session = {
									cookie_test: true,
									save: (cb) => { return cb(); }
								};
								req.url = 'http://127.0.0.1:54000/auth/testing?code=abc';
								tools.stubs.authenticate.callsArgWith(1, {});
							},
							expectBlock: (done) => {
								authentication_lib.sso_login(req, res, next, passport);
								expect(res.statusCode).to.equal(400);
								done();
							}
						},
						{
							itStatement: 'should return an error - error passed to authenticate stub - no query test_id=xcfkbt',
							callFunction: () => {
								common.ev.AUTH_SCHEME = 'iam';
								common.ev.LANDING_URL = 'testing';
								common.ev.IAM = {
									STRATEGY_NAME: 'test_strategy'
								};
								req.session = {
									save: (cb) => { return cb(); }
								};
								req.url = 'http://127.0.0.1:54000/auth/testing';
								tools.stubs.authenticate.callsArgWith(1, {});

							},
							expectBlock: (done) => {
								authentication_lib.sso_login(req, res, next, passport);
								expect(res.statusCode).to.equal(500);
								done();
							}
						},
						{
							itStatement: 'should return an error when the session cannot be set test_id=umpwln',
							callFunction: () => {
								common.ev.AUTH_SCHEME = 'iam';
								common.ev.LANDING_URL = 'testing';
								common.ev.IAM = {
									STRATEGY_NAME: 'test_strategy'
								};
								req.session = {};
								req.url = 'http://127.0.0.1:54000/auth/testing?code=abc';
								tools.stubs.authenticate.callsArgWith(1, { statusCode: 400 });
							},
							expectBlock: (done) => {
								authentication_lib.sso_login(req, res, next, passport);
								expect(res.statusCode).to.equal(500);
								req.url = null;
								done();
							}
						},
						{
							itStatement: 'should return a 200 - AUTH_SCHEME is couchdb test_id=aokygc',
							callFunction: () => {
								common.ev.AUTH_SCHEME = 'couchdb';
								req.url = 'http://127.0.0.1:54000/auth/testing?code=abc';
							},
							expectBlock: (done) => {
								authentication_lib.sso_login(req, res, next, passport);
								expect(res.statusCode).to.equal(302);
								let port = req.url.split(':')[2];
								port = port.split('/')[0];
								const presumed_redirect_url = `http://127.0.0.1:${port}/auth/testing?code=abc`;
								expect(req.url).to.equal(presumed_redirect_url);
								expect(res.statusCode).to.equal(302);
								common.ev.AUTH_SCHEME = 'iam';
								done();
							}
						}
					]
				}
			]
		},
		// Handle local login
		{
			suiteDescribe: 'Handle local login',
			mainDescribe: 'Run Handle local login ',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return redirect and the redirect url should be what was expected - AUTH_SCHEME is not couchdb test_id=vcgwlp',
							callFunction: () => {
								common.ev.AUTH_SCHEME = 'appid';
							},
							expectBlock: (done) => {
								authentication_lib.alt_login(req, res);
								let port = req.url.split(':')[2];
								port = port.split('/')[0];
								const presumed_redirect_url = `http://127.0.0.1:${port}/auth/testing?code=abc`;
								expect(req.url).to.equal(presumed_redirect_url);
								expect(res.statusCode).to.equal(302);
								common.ev.AUTH_SCHEME = 'couchdb';
								done();
							}
						},
						{
							itStatement: 'should return a statusCode of 401 when DEFAULT_USER_PASSWORD is missing - test_id=cwlqsi',
							callFunction: () => {
								common.ev.AUTH_SCHEME = 'couchdb';
								common.ev.DEFAULT_USER_PASSWORD = null;
								req.body = {
									email: 'someone_else@us.ibm.com'
								};
								tools.stubs.verify_secret.returns(true);
							},
							expectBlock: (done) => {
								authentication_lib.alt_login(req, res);
								expect(res.statusCode).to.equal(401);
								done();
							}
						},
						{
							itStatement: 'should return a statusCode of 200 and a statusMessage of "OK" - verify_secret returns true test_id=nuzdzq',
							callFunction: () => {
								common.ev.AUTH_SCHEME = 'couchdb';
								common.ev.DEFAULT_USER_PASSWORD = 'password';
								req.body = {
									email: 'someone_else@us.ibm.com'
								};
								req.session = {
									save: (cb) => { return cb(); }
								};
								tools.stubs.verify_secret.returns(true);
							},
							expectBlock: (done) => {
								authentication_lib.alt_login(req, res);
								expect(res.statusCode).to.equal(200);
								expect(res.statusMessage).to.equal('OK');
								done();
							}
						},
						{
							itStatement: 'should return an error code and a statusMessage of "OK" - verify_secret returns false test_id=tbmawg',
							callFunction: () => {
								common.ev.AUTH_SCHEME = 'couchdb';
								common.ev.DEFAULT_USER_PASSWORD = 'abc';
								req.body = {
									email: 'someone_else@us.ibm.com'
								};
								tools.stubs.verify_secret.returns(false);
							},
							expectBlock: (done) => {
								authentication_lib.alt_login(req, res);
								expect(res.statusCode).to.equal(401);
								expect(res.statusMessage).to.equal('OK');
								done();
							}
						},
						{
							itStatement: 'should return an error - email address not in access list test_id=kzcjmn',
							callFunction: () => {
								common.ev.AUTH_SCHEME = 'couchdb';
								common.ev.DEFAULT_USER_PASSWORD = 'abc';
								req.body = {
									email: 'someonee@us.ibm.com'
								};
								tools.stubs.verify_secret.returns(false);
							},
							expectBlock: (done) => {
								authentication_lib.alt_login(req, res);
								expect(res.statusCode).to.equal(401);
								expect(res.statusMessage).to.equal('OK');
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
