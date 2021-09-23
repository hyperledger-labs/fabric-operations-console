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
// middleware.test.js - test for middleware
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const tools = common.tools;
const express_session = require('express-session');
const myutils = require('../../testing-lib/test-middleware.js');
const CouchdbStore = require('../../../libs/couchdb_session_store.js')(express_session, tools, common.logger);	// Session Store
tools.session_store = new CouchdbStore({
	name: 'test',
	DB_CONNECTION_STRING: 'test',
	DB_SESSIONS: 'db_sessions',
	expire_ms: 8 * 60 * 60 * 1000,				// sessions expire client side every xx hours
	destroy_expired_ms: 2 * 60 * 60 * 1000,		// destroy old session in db every xx hours
	throttle_ms: 5 * 60 * 60 * 1000,			// resave sessions after activity every xx minutes
	enable_session_cache: true,
	skip_auto_startup: true,
});
let middleware = require('../../../libs/middleware/middleware.js')(common.logger, common.ev, tools);
const middleware_objects = require('../../docs/middleware.json');
const httpMocks = require('node-mocks-http');
const nextSpy = sinon.spy();
const res = httpMocks.createResponse();
common.ev.SUPPORT_KEY = 'admin';
common.ev.SUPPORT_PASSWORD = 'random';
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);
const POS_ALLOW = 2;
const POS_PERMIT = 3;

const POS_ALLOW_b = 3;
const POS_PERMIT_b = 4;

const req = {
	headers: {
		'content-type': 'application/json',
		'authorization': 'Basic YWRtaW46cmFuZG9t'
	},
	session: undefined,
	roles: [
		'writer'
	]
};

const session = {
	passport: {
		user: {
			name: 'admin',
			email: 'admin@mail.com'
		}
	}
};

const createStubs = () => {
	return {
		unauthorizedSpy: sinon.spy(middleware, 'unauthorized'),
		forbiddenSpy: sinon.spy(middleware, 'forbidden'),
		getDoc: sinon.stub(tools.otcc, 'getDoc')
	};
};

describe('Middleware', () => {
	before((done) => {
		tools.stubs = createStubs();
		tools.stubs.isAuthorizedWithIBP = (req, res, next) => {
			return next();
		};
		done();
	});
	after((done) => {
		myutils.restoreStubs(tools.stubs);
		done();
	});
	const testCollection = [
		//
		{
			suiteDescribe: 'test verify_api_key',
			mainDescribe: 'test verify_api_key',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should call next - "user.name" equals "ev.SUPPORT_KEY", support key is valid -  test_id=pnlgaj',
							expectBlock: (done) => {
								const store_auth_scheme = common.ev.AUTH_SCHEME;
								common.ev.AUTH_SCHEME = 'not initial';
								middleware['verify_users_action_init_ak'][POS_ALLOW](req, res, nextSpy);
								expect(nextSpy.called).to.be.true;
								nextSpy.resetHistory();
								common.ev.AUTH_SCHEME = store_auth_scheme;
								done();
							}
						},
						{
							itStatement: 'should call next - "user.name" equals "ev.SUPPORT_KEY" and the support key is valid test_id=phjzhr',
							expectBlock: (done) => {
								middleware['verify_create_action_ak'][POS_ALLOW_b](req, res, nextSpy);
								expect(nextSpy.called).to.be.true;
								nextSpy.resetHistory();
								done();
							}
						},
						{
							itStatement: 'should call forbidden - "user.name" equals "ev.SUPPORT_KEY" but "validSupportKey" is unauthorized test_id=ykptsq',
							expectBlock: (done) => {
								req.actions = ['abc'];
								middleware['verify_create_action_ak'][POS_ALLOW_b](req, res, nextSpy);
								expect(nextSpy.called).to.be.false;
								expect(tools.stubs.forbiddenSpy.called).to.be.true;
								tools.stubs.forbiddenSpy.resetHistory();
								nextSpy.resetHistory();
								done();
							}
						},
						{
							itStatement: 'should call unauthorized spy - "user.name" does not equal "ev.SUPPORT_KEY" - fails basic auth check test_id=pqehaa',
							expectBlock: (done) => {
								const store_support_key = common.ev.SUPPORT_KEY;
								const store_access_list = JSON.parse(JSON.stringify(common.ev.ACCESS_LIST));
								common.ev.ACCESS_LIST = {
									'admin': {}
								};
								common.ev.SUPPORT_KEY = 'this is not a valid support key';
								middleware['verify_create_action_ak'][POS_ALLOW_b](req, res, nextSpy);
								expect(tools.stubs.unauthorizedSpy.called).to.be.true;
								expect(nextSpy.called).to.be.false;
								tools.stubs.unauthorizedSpy.resetHistory();
								nextSpy.resetHistory();
								common.ev.SUPPORT_KEY = store_support_key;
								common.ev.ACCESS_LIST = JSON.parse(JSON.stringify(store_access_list));
								done();
							}
						},
						{
							itStatement: 'should call next - user is authorized test_id=yetzfx',
							callFunction: () => {
								tools.stubs.verify_secret = sinon.stub(tools.misc, 'verify_secret').returns(true);
							},
							expectBlock: (done) => {
								const store_support_key = common.ev.SUPPORT_KEY;
								const store_access_list = JSON.parse(JSON.stringify(common.ev.ACCESS_LIST));
								const store_actions = JSON.parse(JSON.stringify(req.actions));
								common.ev.ACCESS_LIST = {
									'admin': {
										hashed_secret: 'secret'
									}
								};
								req.actions = null;
								common.ev.SUPPORT_KEY = 'this is not a valid support key';
								middleware['verify_create_action_ak'][POS_ALLOW_b](req, res, nextSpy);
								expect(nextSpy.called).to.be.true;
								tools.stubs.unauthorizedSpy.resetHistory();
								nextSpy.resetHistory();
								common.ev.SUPPORT_KEY = store_support_key;
								common.ev.ACCESS_LIST = JSON.parse(JSON.stringify(store_access_list));
								req.actions = JSON.parse(JSON.stringify(store_actions));
								tools.stubs.verify_secret.restore();
								done();
							}
						},
						{
							itStatement: 'should call unauthorized - verify_secret is false - test_id=mofsck',
							callFunction: () => {
								tools.stubs.verify_secret = sinon.stub(tools.misc, 'verify_secret').returns(false);
							},
							expectBlock: (done) => {
								const store_support_key = common.ev.SUPPORT_KEY;
								const store_access_list = JSON.parse(JSON.stringify(common.ev.ACCESS_LIST));
								const store_actions = JSON.parse(JSON.stringify(req.actions));
								common.ev.ACCESS_LIST = {
									'admin': {
										hashed_secret: 'secret'
									}
								};
								req.actions = null;
								common.ev.SUPPORT_KEY = 'this is not a valid support key';
								middleware['verify_create_action_ak'][POS_ALLOW_b](req, res, nextSpy);
								expect(tools.stubs.unauthorizedSpy.called).to.be.true;
								expect(nextSpy.called).to.be.false;
								tools.stubs.unauthorizedSpy.resetHistory();
								nextSpy.resetHistory();
								common.ev.SUPPORT_KEY = store_support_key;
								common.ev.ACCESS_LIST = JSON.parse(JSON.stringify(store_access_list));
								req.actions = JSON.parse(JSON.stringify(store_actions));
								tools.stubs.verify_secret.restore();
								done();
							}
						},
						{
							itStatement: 'should call authorized - verify_secret is true - test_id=ahvtyc',
							callFunction: () => {
								tools.stubs.verify_secret = sinon.stub(tools.misc, 'verify_secret').returns(true);
							},
							expectBlock: (done) => {
								const store_support_key = common.ev.SUPPORT_KEY;
								const store_access_list = JSON.parse(JSON.stringify(common.ev.ACCESS_LIST));
								const store_actions = JSON.parse(JSON.stringify(req.actions));
								common.ev.ACCESS_LIST = {
									'admin': {
										hashed_secret: 'secret'
									}
								};
								req.actions = null;
								common.ev.SUPPORT_KEY = 'this is not a valid support key';
								middleware['verify_create_action_ak'][POS_ALLOW_b](req, res, nextSpy);
								expect(tools.stubs.unauthorizedSpy.called).to.be.false;
								expect(nextSpy.called).to.be.true;
								tools.stubs.unauthorizedSpy.resetHistory();
								nextSpy.resetHistory();
								common.ev.SUPPORT_KEY = store_support_key;
								common.ev.ACCESS_LIST = JSON.parse(JSON.stringify(store_access_list));
								req.actions = JSON.parse(JSON.stringify(store_actions));
								tools.stubs.verify_secret.restore();
								done();
							}
						},
						{
							itStatement: 'should call next  - valid doc sent to "getDoc" stub test_id=nnhwkq',
							callFunction: () => {
								tools.stubs.verify_secret = sinon.stub(tools.misc, 'verify_secret').returns(true);
								tools.stubs.getDoc.callsArgWith(1, null, {});
							},
							expectBlock: (done) => {
								const store_support_key = common.ev.SUPPORT_KEY;
								const store_actions = JSON.parse(JSON.stringify(req.actions));
								common.ev.SUPPORT_KEY = 'this is not a valid support key';
								req.actions = null;
								middleware['verify_create_action_ak'][POS_ALLOW_b](req, res, nextSpy);
								expect(nextSpy.called).to.be.true;
								nextSpy.resetHistory();
								common.ev.SUPPORT_KEY = store_support_key;
								req.actions = JSON.parse(JSON.stringify(store_actions));
								tools.stubs.verify_secret.restore();
								done();
							}
						},
						{
							itStatement: 'should call unauthorized - actions not permitted stub test_id=qisijx',
							callFunction: () => {
								tools.stubs.verify_secret = sinon.stub(tools.misc, 'verify_secret').returns(true);
								tools.stubs.getDoc.callsArgWith(1, null, {});
							},
							expectBlock: (done) => {
								const store_support_key = common.ev.SUPPORT_KEY;
								common.ev.SUPPORT_KEY = 'this is not a valid support key';
								middleware['verify_create_action_ak'][POS_ALLOW_b](req, res, nextSpy);
								expect(nextSpy.called).to.be.false;
								nextSpy.resetHistory();
								common.ev.SUPPORT_KEY = store_support_key;
								tools.stubs.verify_secret.restore();
								done();
							}
						},
						{
							itStatement: 'should call unauthorized - error sent to "getDoc" stub test_id=wuhama',
							callFunction: () => {
								tools.stubs.verify_secret = sinon.stub(tools.misc, 'verify_secret').returns(true);
								tools.stubs.getDoc.callsArgWith(1, { statusCode: 500, msg: 'problem getting api key' });
							},
							expectBlock: (done) => {
								const store_support_key = common.ev.SUPPORT_KEY;
								common.ev.SUPPORT_KEY = 'this is not a valid support key';
								middleware['verify_create_action_ak'][POS_ALLOW_b](req, res, nextSpy);
								expect(tools.stubs.unauthorizedSpy.called).to.be.true;
								expect(nextSpy.called).to.be.false;
								tools.stubs.unauthorizedSpy.resetHistory();
								tools.stubs.unauthorizedSpy.resetHistory();
								nextSpy.resetHistory();
								common.ev.SUPPORT_KEY = store_support_key;
								tools.stubs.verify_secret.restore();
								done();
							}
						},
						{
							itStatement: 'should call unauthorized - secret not valid test_id=rwewye',
							callFunction: () => {
								tools.stubs.verify_secret = sinon.stub(tools.misc, 'verify_secret').returns(false);
								tools.stubs.getDoc.callsArgWith(1, null, {});
							},
							expectBlock: (done) => {
								const store_support_key = common.ev.SUPPORT_KEY;
								common.ev.SUPPORT_KEY = 'this is not a valid support key';
								middleware['verify_create_action_ak'][POS_ALLOW_b](req, res, nextSpy);
								expect(tools.stubs.unauthorizedSpy.called).to.be.true;
								expect(nextSpy.called).to.be.false;
								tools.stubs.unauthorizedSpy.resetHistory();
								nextSpy.resetHistory();
								common.ev.SUPPORT_KEY = store_support_key;
								tools.stubs.verify_secret.restore();
								done();
							}
						},
						{
							itStatement: 'should call unauthorized - do not permit actions in req test_id=brtcia',
							callFunction: () => {
								tools.stubs.verify_secret = sinon.stub(tools.misc, 'verify_secret').returns(true);
								tools.stubs.getDoc.callsArgWith(1, null, {});
								req.actions = ['abc'];
							},
							expectBlock: (done) => {
								const store_support_key = common.ev.SUPPORT_KEY;
								common.ev.SUPPORT_KEY = 'this is not a valid support key';
								middleware['verify_create_action_ak'][POS_ALLOW_b](req, res, nextSpy);
								expect(tools.stubs.unauthorizedSpy.called).to.be.true;
								expect(nextSpy.called).to.be.false;
								tools.stubs.unauthorizedSpy.resetHistory();
								nextSpy.resetHistory();
								common.ev.SUPPORT_KEY = store_support_key;
								tools.stubs.verify_secret.restore();
								done();
							}
						},
						{
							itStatement: 'should call next - tests return true leg of "permitAction test_id=dgciew',
							callFunction: () => {
								tools.stubs.isAuthorized = sinon.stub(middleware, 'isAuthorized').returns(true);
							},
							expectBlock: (done) => {
								middleware['verify_apiKey_action_session'][POS_PERMIT](req, res, nextSpy);
								expect(tools.stubs.unauthorizedSpy.called).to.be.false;
								expect(nextSpy.called).to.be.true;
								tools.stubs.isAuthorized.restore();
								done();
							}
						},
						{
							itStatement: 'should call next - tests return true leg of "permitActionInit" - ev.AUTH_SCHEME is set to "initial" test_id=mkzqcx',
							callFunction: () => {
								tools.stubs.isAuthorized = sinon.stub(middleware, 'isAuthorized').returns(true);
							},
							expectBlock: (done) => {
								common.ev.AUTH_SCHEME = 'initial';
								middleware['verify_users_action_init_session'][POS_ALLOW](req, res, nextSpy);
								expect(tools.stubs.unauthorizedSpy.called).to.be.false;
								expect(nextSpy.called).to.be.true;
								tools.stubs.isAuthorized.restore();
								done();
							}
						},
						{
							itStatement: 'should call next - ev.AUTH_SCHEME is set to "not initial" test_id=whhyta',
							callFunction: () => {
								tools.stubs.isAuthorized = sinon.stub(middleware, 'isAuthorized').returns(true);
							},
							expectBlock: (done) => {
								common.ev.AUTH_SCHEME = 'not initial';
								middleware['verify_users_action_init_session'][POS_ALLOW](req, res, nextSpy);
								expect(tools.stubs.unauthorizedSpy.called).to.be.false;
								expect(nextSpy.called).to.be.true;
								tools.stubs.isAuthorized.restore();
								done();
							}
						},
						{
							itStatement: 'should call next - case insensitive test_id=shouij',
							callFunction: () => {
								tools.stubs.verify_secret = sinon.stub(tools.misc, 'verify_secret').returns(true);
							},
							expectBlock: (done) => {
								const store_access_list = JSON.parse(JSON.stringify(common.ev.ACCESS_LIST));
								const store_support_key = common.ev.SUPPORT_KEY;
								const store_auth = req.headers.authorization;
								common.ev.SUPPORT_KEY = 'something';
								common.ev.ACCESS_LIST = {
									'admin': {
										hashed_secret: 'secret',
										salt: 'abcd',
									}
								};
								req.headers.authorization = 'Basic ' + tools.misc.b64('ADMIN:random');	// all caps to test case insensitivity
								middleware['verify_create_action_ak'][POS_ALLOW_b](req, res, nextSpy);
								expect(nextSpy.called).to.be.true;
								nextSpy.resetHistory();
								tools.stubs.verify_secret.restore();
								common.ev.ACCESS_LIST = store_access_list;
								common.ev.SUPPORT_KEY = store_support_key;
								req.headers.authorization = store_auth;
								done();
							}
						},
					]
				}
			]
		},

		// create saas components
		{
			suiteDescribe: 'create saas components',
			mainDescribe: 'Run create saas components ',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should verify that next was called for needCreateAction - req.method is GET test_id=byjtyf',
							expectBlock: (done) => {
								req.method = 'GET';
								middleware.verify_create_action_ak[1](req, res, nextSpy);
								expect(nextSpy.called).to.be.true;
								nextSpy.resetHistory();
								req.method = null;
								done();
							}
						},
						{
							itStatement: 'should verify that next was called for allowAkToDoAction req.headers has bearer test_id=lvsgdz',
							callFunction: () => {
								tools.stubs.isAuthorized = sinon.stub(middleware, 'isAuthorized').returns(true);
								tools.stubs.isAuthorizedWithIBP = sinon.stub(tools.iam_lib, 'isAuthorizedWithIBP').callsArgWith(2);
							},
							expectBlock: (done) => {
								const current_authorization = req.headers.authorization;
								req.headers.authorization = 'bearer test';
								middleware.verify_create_action_ak[POS_ALLOW_b](req, res, nextSpy);
								expect(nextSpy.called).to.be.true;
								nextSpy.resetHistory();
								tools.stubs.isAuthorized.restore();
								tools.stubs.isAuthorizedWithIBP.restore();
								req.headers.authorization = current_authorization;
								done();
							}
						},
						{
							itStatement: 'should verify that next was not called for allowAkToDoAction - no user passed so auth will fail test_id=dkqymf',
							expectBlock: (done) => {
								const current_authorization = req.headers.authorization;
								req.headers.authorization = 'not-good-enough';
								middleware.verify_create_action_ak[POS_ALLOW_b](req, res, nextSpy);
								expect(nextSpy.called).to.be.false;
								nextSpy.resetHistory();
								req.headers.authorization = current_authorization;
								done();
							}
						},
						{
							itStatement: 'should verify that next was not called for allowAkToDoAction - no support pass so auth will fail test_id=guypyr',
							expectBlock: (done) => {
								const current_support_password = common.ev.SUPPORT_PASSWORD;
								common.ev.SUPPORT_PASSWORD = 'not good enough';
								middleware.verify_create_action_ak[POS_ALLOW_b](req, res, nextSpy);
								expect(nextSpy.called).to.be.false;
								nextSpy.resetHistory();
								common.ev.SUPPORT_PASSWORD = current_support_password;
								done();
							}
						},
						{
							itStatement: 'should verify that next was called for allowAkToDoAction - no valid secret test_id=doehah',
							callFunction: () => {
								tools.stubs.getDoc.callsArgWith(1, null, {});
							},
							expectBlock: (done) => {
								const current_support_password = common.ev.SUPPORT_PASSWORD;
								common.ev.SUPPORT_PASSWORD = 'not good enough';
								middleware.verify_create_action_ak[POS_ALLOW_b](req, res, nextSpy);
								expect(nextSpy.called).to.be.false;
								expect(tools.stubs.unauthorizedSpy.called).to.be.true;
								nextSpy.resetHistory();
								common.ev.SUPPORT_PASSWORD = current_support_password;
								tools.stubs.unauthorizedSpy.resetHistory();
								done();
							}
						},
						{
							itStatement: 'should verify that next was called for allowAkToDoAction - permit_actions_in_req fails test_id=yoguxw',
							callFunction: () => {
								tools.stubs.getDoc.callsArgWith(1, null, {});
								tools.stubs.verify_secret.returns(true);
							},
							expectBlock: (done) => {
								const current_support_password = common.ev.SUPPORT_PASSWORD;
								common.ev.SUPPORT_PASSWORD = 'not good enough';
								middleware.verify_create_action_ak[POS_ALLOW_b](req, res, nextSpy);
								expect(nextSpy.called).to.be.false;
								expect(tools.stubs.unauthorizedSpy.called).to.be.true;
								nextSpy.resetHistory();
								common.ev.SUPPORT_PASSWORD = current_support_password;
								tools.stubs.verify_secret.restore();
								tools.stubs.unauthorizedSpy.resetHistory();
								done();
							}
						},
						{
							itStatement: 'should verify that next was called for allowAkToDoAction - actions built and auth achieved test_id=plhxhr',
							callFunction: () => {
								tools.stubs.getDoc.callsArgWith(1, null, {});
								tools.stubs.verify_secret = sinon.stub(tools.misc, 'verify_secret').returns(true);
								tools.stubs.buildActionsFromRoles = sinon.stub(middleware, 'buildActionsFromRoles').returns(true);
							},
							expectBlock: (done) => {
								const current_support_password = common.ev.SUPPORT_PASSWORD;
								common.ev.SUPPORT_PASSWORD = 'not good enough';
								middleware.verify_create_action_ak[POS_ALLOW_b](req, res, nextSpy);
								expect(nextSpy.called).to.be.false;
								nextSpy.resetHistory();
								common.ev.SUPPORT_PASSWORD = current_support_password;
								tools.stubs.verify_secret.restore();
								tools.stubs.buildActionsFromRoles.restore();
								done();
							}
						}
					]
				}
			]
		},
		// allowAkToDoActionInit
		{
			suiteDescribe: 'allowAkToDoActionInit',
			mainDescribe: 'Run allowAkToDoActionInit ',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should verify that next was called for allowAkToDoActionInit - ev.AUTH_SCHEME is initial test_id=czlgrn',
							expectBlock: (done) => {
								const current_auth_scheme = common.ev.AUTH_SCHEME;
								common.ev.AUTH_SCHEME = 'initial';
								middleware.verify_users_action_init_ak[POS_ALLOW](req, res, nextSpy);
								expect(nextSpy.called).to.be.true;
								nextSpy.resetHistory();
								common.ev.AUTH_SCHEME = current_auth_scheme;
								done();
							}
						}
					]
				}
			]
		},
		// checkAuthentication
		{
			suiteDescribe: 'checkAuthentication',
			mainDescribe: 'Run checkAuthentication',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a status code of 401 - AUTH_SCHEME is set to initial  test_id=donicg',
							expectBlock: (done) => {
								common.ev.AUTH_SCHEME = 'initial';
								middleware.checkAuthentication(req, res, nextSpy);
								expect(res.statusCode).to.equal(401);
								expect(res.statusMessage).to.equal('OK');
								expect(nextSpy.called).to.be.false;
								common.ev.AUTH_SCHEME = 'appid';
								nextSpy.resetHistory();
								done();
							}
						},
						{
							itStatement: 'should return a status code of 401 - AUTH_SCHEME is set to appid but not authorized  test_id=whxpnt',
							expectBlock: (done) => {
								middleware.checkAuthentication(req, res, nextSpy);
								expect(res.statusCode).to.equal(401);
								expect(res.statusMessage).to.equal('OK');
								expect(nextSpy.called).to.be.false;
								nextSpy.resetHistory();
								done();
							}
						},
						{
							itStatement: 'should return a status code of 401 - AUTH_SCHEME is set to ibmid but not authorized  test_id=nepgvo',
							expectBlock: (done) => {
								common.ev.AUTH_SCHEME = 'ibmid';
								middleware.checkAuthentication(req, res, nextSpy);
								expect(res.statusCode).to.equal(401);
								expect(res.statusMessage).to.equal('OK');
								expect(nextSpy.called).to.be.false;
								common.ev.AUTH_SCHEME = 'appid';
								nextSpy.resetHistory();
								done();
							}
						},
						{
							itStatement: 'should call next - verified because we use a sinon spy for "next" and verify that it was called  test_id=eghvyx',
							expectBlock: (done) => {
								req.session = session;
								middleware.checkAuthentication(req, res, nextSpy);
								expect(nextSpy.called).to.be.true;
								req.session = undefined;
								nextSpy.resetHistory();
								done();
							}
						}
					]
				}
			]
		},
		// isAuthenticated
		{
			suiteDescribe: 'isAuthenticated',
			mainDescribe: 'Run isAuthenticated',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return an authentication status of false - not authenticated  test_id=zbivgd',
							expectBlock: (done) => {
								const req2 = {
									session: undefined,
								};
								const authenticationStatus = middleware.isAuthenticated(req2);
								expect(authenticationStatus).to.equal(false);
								done();
							}
						},
						{
							itStatement: 'should return an authentication status of true - authenticated  test_id=ygrptr',
							expectBlock: (done) => {
								req.session = {
									passport_profile: {
										name: 'admin',
										email: 'admin@mail.com'
									}
								};
								common.ev.AUTH_SCHEME = 'ibmid';
								const authenticationStatus = middleware.isAuthenticated(req);
								expect(authenticationStatus).to.equal(true);
								req.session = undefined;
								common.ev.AUTH_SCHEME = 'appid';
								done();
							}
						},
						{
							itStatement: 'should return null - no req object passed in  test_id=pxjcmu',
							expectBlock: (done) => {
								const authenticationStatus = middleware.isAuthenticated();
								expect(authenticationStatus).to.equal(null);
								done();
							}
						},
					]
				}
			]
		},
		// isAuthorized
		{
			suiteDescribe: 'isAuthorized',
			mainDescribe: 'Run isAuthorized',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return true - user is authorized test_id=zhikft',
							expectBlock: (done) => {
								const actions_store = JSON.parse(JSON.stringify(req.actions));
								req.actions = [];
								req.session = JSON.parse(JSON.stringify(session));
								const isAuthorized = middleware.isAuthorized(req);
								expect(isAuthorized).to.equal(true);
								req.session = null;
								req.actions = actions_store;
								done();
							}
						},
						{
							itStatement: 'should return false - missing some actions test_id=jwmrwg',
							expectBlock: (done) => {
								const actions_store = JSON.parse(JSON.stringify(req.actions));
								req.actions = ['not enough actions here'];
								req.session = JSON.parse(JSON.stringify(session));
								const isAuthorized = middleware.isAuthorized(req);
								expect(isAuthorized).to.equal(false);
								req.session = null;
								req.actions = actions_store;
								done();
							}
						},
						{
							itStatement: 'should return false - user is not authorized using ibmid test_id=qjsiev',
							expectBlock: (done) => {
								common.ev.AUTH_SCHEME = 'ibmid';
								const req2 = {
									session: undefined,
								};
								const isAuthorized = middleware.isAuthorized(req2);
								expect(isAuthorized).to.equal(null);
								common.ev.AUTH_SCHEME = 'appid';
								done();
							}
						},
						{
							itStatement: 'should return false - user is not authorized test_id=regeah',
							expectBlock: (done) => {
								const req2 = {
									session: undefined,
								};
								const isAuthorized = middleware.isAuthorized(req2);
								expect(isAuthorized).to.equal(null);
								done();
							}
						},
						{
							itStatement: 'should return null - req not sent test_id=jtaldt',
							expectBlock: (done) => {
								const isAuthorized = middleware.isAuthorized();
								expect(isAuthorized).to.equal(null);
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
							itStatement: 'should return a valid response - function given valid arguments test_id=etofaj',
							expectBlock: (done) => {
								req.session = {
									passport: {
										user: {
											name: 'someone',
											email: 'someone_else@us.ibm.com'
										}
									}
								};
								const actions = middleware.getActions(req);
								expect(JSON.stringify(actions)).to.equal(JSON.stringify([
									'blockchain.apikeys.manage', 'blockchain.components.create', 'blockchain.components.delete',
									'blockchain.components.export', 'blockchain.components.import', 'blockchain.components.remove',
									'blockchain.notifications.manage', 'blockchain.optools.logs', 'blockchain.optools.restart',
									'blockchain.optools.view', 'blockchain.users.manage'].sort()));
								req.session = undefined;
								done();
							}
						},
						{
							itStatement: 'should return a valid response - function given valid arguments - ibmid test_id=emdpoe',
							expectBlock: (done) => {
								common.ev.AUTH_SCHEME = 'ibmid';
								req.session = {
									passport_profile: {
										name: 'admin',
										email: 'admin@mail.com'
									}
								};
								const user = middleware.getActions(req);
								expect(JSON.stringify(user)).to.equal(JSON.stringify([]));
								common.ev.AUTH_SCHEME = 'appid';
								req.session = undefined;
								done();
							}
						},
						{
							itStatement: 'should return null - no req passed in test_id=jefvsm',
							expectBlock: (done) => {
								const actions = middleware.getActions();
								expect(actions).to.equal(null);
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
							itStatement: 'should return a valid response - function given valid arguments  test_id=tobhik',
							expectBlock: (done) => {
								req.session = session;
								const user = middleware.getName(req);
								expect(user).to.equal('admin');
								req.session = undefined;
								done();
							}
						},
						{
							itStatement: 'should return a valid response - function given valid arguments - ibmid  test_id=bqtnoa',
							expectBlock: (done) => {
								common.ev.AUTH_SCHEME = 'ibmid';
								req.session = {
									passport_profile: {
										name: 'admin',
										email: 'admin@mail.com'
									}
								};
								const user = middleware.getName(req);
								expect(user).to.equal('admin');
								common.ev.AUTH_SCHEME = 'appid';
								req.session = undefined;
								done();
							}
						},
						{
							itStatement: 'should return null - no req passed in  test_id=briyyi',
							expectBlock: (done) => {
								const isAuthenticated = middleware.getName();
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
							itStatement: 'should return null - no req passed in  test_id=jznvft',
							expectBlock: (done) => {
								const email = middleware.getEmail();
								expect(email).to.equal(null);
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
							itStatement: 'should return the correct uuid  test_id=jfejza',
							expectBlock: (done) => {
								req.session = session;
								common.ev.ACCESS_LIST = {
									'admin@mail.com': { admin: false, uuid: 'uuid' }
								};
								const uuid = middleware.getUuid(req);
								expect(uuid).to.equal('uuid');
								req.session = undefined;
								common.ev.ACCESS_LIST = undefined;
								done();
							},
						},
						{
							itStatement: 'should return user.name - not found in access list test_id=brbfbb',
							expectBlock: (done) => {
								req.session = session;
								const uuid = middleware.getUuid(req);
								expect(uuid).to.equal('admin');
								req.session = undefined;
								common.ev.ACCESS_LIST = undefined;
								done();
							},
						},
						{
							itStatement: 'should return null - not in access list and no req.headers test_id=ezapdo',
							expectBlock: (done) => {
								const store_headers = JSON.parse(JSON.stringify(req.headers));
								req.headers = null;
								req.session = session;
								const uuid = middleware.getUuid(req);
								expect(uuid).to.equal(null);
								req.session = undefined;
								common.ev.ACCESS_LIST = undefined;
								req.headers = JSON.parse(JSON.stringify(store_headers));
								done();
							},
						},
						{
							itStatement: 'should return null - no req passed in  test_id=awtsnm',
							expectBlock: (done) => {
								const email = middleware.getUuid();
								expect(email).to.equal(null);
								done();
							}
						}
					]
				}
			]
		},
		//getPartialSessionId
		{
			suiteDescribe: 'getPartialSessionId',
			mainDescribe: 'Run getPartialSessionId',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a partial session id - all good params passed in  test_id=fvmqfg',
							expectBlock: (done) => {
								req.session = session;
								req.session.sid = 'abcdefghijklmnopqurstuvwxyz';
								const partialSessionId = middleware.getPartialSessionId(req);
								expect(partialSessionId).to.equal('sabcd');
								req.session = undefined;
								done();
							},
						},
						{
							itStatement: 'should return a question mark - no session data passed in  test_id=flblbk',
							expectBlock: (done) => {
								req.session = session;
								req.session.sid = null;
								const partialSessionId = middleware.getPartialSessionId(req);
								expect(partialSessionId).to.equal('-');
								done();
							},
						},
						{
							itStatement: 'should return a question mark - no req object passed in  test_id=hnyvkb',
							expectBlock: (done) => {
								const partialSessionId = middleware.getPartialSessionId();
								expect(partialSessionId).to.equal('-');
								done();
							},
						}
					]
				}
			]
		},
		//getPasswordType
		{
			suiteDescribe: 'getPasswordType',
			mainDescribe: 'Run getPasswordType',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return null - scheme has "getPasswordType" test_id=tjvocy',
							expectBlock: (done) => {
								const store_auth_scheme = common.ev.AUTH_SCHEME;
								common.ev.AUTH_SCHEME = 'couchdb';
								const password_type = middleware.getPasswordType(req);
								expect(password_type).to.equal(null);
								common.ev.AUTH_SCHEME = store_auth_scheme;
								done();
							}
						},
						{
							itStatement: 'should return null - scheme has null test_id=yeifpr',
							expectBlock: (done) => {
								const store_auth_scheme = common.ev.AUTH_SCHEME;
								common.ev.AUTH_SCHEME = null;
								const password_type = middleware.getPasswordType(req);
								expect(password_type).to.equal(null);
								common.ev.AUTH_SCHEME = store_auth_scheme;
								done();
							}
						},
						{
							itStatement: 'should return null - no req passed in test_id=wwaswm',
							expectBlock: (done) => {
								const password_type = middleware.getPasswordType();
								expect(password_type).to.equal(null);
								done();
							}
						}
					]
				}
			]
		},
		//emailIsAdmin
		{
			suiteDescribe: 'emailIsAdmin',
			mainDescribe: 'Run emailIsAdmin',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return true - is an admin test_id=zygcem',
							expectBlock: (done) => {
								common.ev.ACCESS_LIST = { 'someone@mail.com': { admin: true } };
								const email = 'someone@mail.com';
								const isAdmin = middleware.emailIsAdmin(email);
								expect(isAdmin).to.equal(true);
								common.ev.ACCESS_LIST = null;
								done();
							}
						},
						{
							itStatement: 'should return true - is a manager test_id=aswyvi',
							expectBlock: (done) => {
								common.ev.ACCESS_LIST = { 'someone@mail.com': { roles: 'manager' } };
								const email = 'someone@mail.com';
								const isAdmin = middleware.emailIsAdmin(email);
								expect(isAdmin).to.equal(true);
								common.ev.ACCESS_LIST = null;
								done();
							}
						},
						{
							itStatement: 'should return false - not authorized test_id=gxymeu',
							expectBlock: (done) => {
								common.ev.ACCESS_LIST = { 'someone@mail.com': { roles: 'not authorized' } };
								const email = 'someone@mail.com';
								const isAdmin = middleware.emailIsAdmin(email);
								expect(isAdmin).to.equal(false);
								common.ev.ACCESS_LIST = null;
								done();
							}
						},
						{
							itStatement: 'should return false - no ev.ACCESS_LIST test_id=ybqvva',
							expectBlock: (done) => {
								const email = 'someone@mail.com';
								const isAdmin = middleware.emailIsAdmin(email);
								expect(isAdmin).to.equal(false);
								done();
							}
						}
					]
				}
			]
		},

		//ip_is_localhost
		{
			suiteDescribe: 'ip_is_localhost',
			mainDescribe: 'Run ip_is_localhost',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should detect ip as localhost - test_id=bkmffj',
							expectBlock: (done) => {
								expect(middleware.ip_is_localhost({ ip: '127.0.0.1' })).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should detect ip as NOT localhost - test_id=epakuk',
							expectBlock: (done) => {
								expect(middleware.ip_is_localhost({ ip: '192.168.0.1' })).to.equal(false);
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
