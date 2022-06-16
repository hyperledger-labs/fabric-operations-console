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
// auth_scheme_apis.test.js - Test auth_scheme_apis
//------------------------------------------------------------
const common = require('../common-test-framework');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const chaiHttp = require('chai-http');
const tools = common.tools;
tools.update_passport = () => { };
let ev = common.ev;
ev.update = () => { };
tools.misc = require('../../../libs/misc.js')(common.logger, common.tools);
tools.uuidv4 = () => { return 'abc'; };
const myutils = require('../../testing-lib/test-middleware');
const auth_scheme_objects = require('../../docs/auth_scheme_objects.json');
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);

chai.use(chaiHttp);

const createStubs = () => {
	return {
		getDesignDocView: sinon.stub(tools.otcc, 'getDesignDocView').callsArgWith(1, null, { rows: [{ doc: { api_secret: 'random', role: 'writer' } }] }),
		isAuthenticated: sinon.stub(tools.middleware, 'isAuthenticated'),
		getDoc: sinon.stub(tools.otcc, 'getDoc'),
		repeatWriteSafe: sinon.stub(tools.otcc, 'repeatWriteSafe'),
		getUuid: sinon.stub(tools.middleware, 'getUuid').returns('abcdef'),
		update: sinon.stub(ev, 'update')
	};
};

const setEvSettings = () => {
	ev.AUTH_SCHEME = 'initial';
	ev.HOST_URL = 'http://localhost:3000';
	ev.LOGIN_URI = 'http://localhost:3000';
	ev.LOGOUT_URI = 'http://localhost:3000';
	ev.CONFIGTXLATOR_URL = 'http://localhost:3000';
	ev.DB_SYSTEM = 'athena_system';
	ev.APP_ID = {};
	ev.ACCESS_LIST = {
		'someone_else@us.ibm.com': {
			uuid: '67ca95d2de57f06da27be3c9fc00e865',
			created: 1538651194801,
			roles: ['manager'],
		},
		'some_access_holder@us.ibm.com': {
			uuid: '67ca95d2de57f06da27be3c9fc00e864',
			created: 1538651194801,
			roles: ['reader'],
		}
	};
};

describe('Auth Scheme APIs', () => {
	beforeEach((done) => {
		tools.stubs = createStubs();
		tools.middleware = require('../../../libs/middleware/middleware.js')(common.logger, ev, tools);
		tools.middleware.verify_users_action_init_session = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_users_action_init_ak = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_settings_action_session = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_settings_action_ak = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_users_action_ak = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_view_action_ak = (req, res, next) => {
			return next();
		};
		const auth_scheme_apis = require('../../../routes/auth_scheme_apis.js')(common.logger, ev, tools);
		this.app = common.expressApp(auth_scheme_apis);
		setEvSettings();
		done();
	});
	afterEach((done) => {
		myutils.restoreStubs(tools.stubs);
		ev.AUTH_SCHEME = 'appid';
		done();
	});
	const testCollection = [
		// GET /api/v1/authscheme
		{
			suiteDescribe: 'GET /api/v1/authscheme',
			mainDescribe: 'Run GET /api/v1/authscheme',
			arrayOfRoutes: ['/api/v1/authscheme'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get('/api/v1/authscheme')
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the default auth_scheme settings test_id=zdsrhq',
							expectBlock: (res) => {
								expect(res.statusCode).to.equal(200);
								expect(JSON.stringify(tools.misc.sortItOut(res.body))).to.equal(
									JSON.stringify(tools.misc.sortItOut(auth_scheme_objects.default_get_response))
								);
							}
						},
						{
							itStatement: 'should return populate auth_scheme settings  test_id=mpdxmc',
							callFunction: () => {
								ev.AUTH_SCHEME = 'appid';
								ev.APP_ID = { id: 1 };
								tools.stubs.isAuthenticated.returns(true);
							},
							expectBlock: (res) => {
								expect(res.statusCode).to.equal(200);
								expect(JSON.stringify(tools.misc.sortItOut(res.body))).to.equal(
									JSON.stringify(tools.misc.sortItOut(auth_scheme_objects.populated_get_response))
								);
								ev.AUTH_SCHEME = 'initial';
							}
						}
					]
				}
			]
		},
		// GET /ak/api/v1/authscheme
		{
			suiteDescribe: 'GET /ak/api/v1/authscheme',
			mainDescribe: 'Run GET /ak/api/v1/authscheme',
			arrayOfRoutes: ['/ak/api/v1/authscheme'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get('/ak/api/v1/authscheme')
					.auth(routeInfo.username, routeInfo.password)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return ev settings test_id=njohrt',
							username: 'admin',
							password: 'random',
							expectBlock: (res) => {
								expect(res.statusCode).to.equal(200);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify(auth_scheme_objects.ev_settings));
							}
						},
						{
							itStatement: 'should return the ev settings coupled with the app id settings test_id=zyihcw',
							username: 'admin',
							password: 'random',
							callFunction: () => {
								ev.AUTH_SCHEME = 'appid';
								ev.APP_ID = auth_scheme_objects.app_id;
							},
							expectBlock: (res) => {
								expect(res.statusCode).to.equal(200);
								expect(JSON.stringify(tools.misc.sortItOut(res.body))).to.equal(
									JSON.stringify(tools.misc.sortItOut(auth_scheme_objects.ev_settings_with_app_id))
								);
							}
						}
					]
				}
			]
		},
		// PUT /api/v1/authscheme && /ak/api/v1/authscheme
		{
			suiteDescribe: 'PUT /api/v1/authscheme',
			mainDescribe: 'RUN /api/v1/authscheme',
			arrayOfRoutes: ['/api/v1/authscheme'],
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
							itStatement: 'should return a status of 200 and the message "ok" - valid params sent through stubs test_id=nqsnxc',
							body: {
								admin_list: auth_scheme_objects.app_id.admin_list,
								auth_scheme: 'ibmid'
							},
							username: 'admin',
							password: 'random',
							callFunction: () => {
								const settings = JSON.parse(JSON.stringify(auth_scheme_objects.athena_system));
								tools.stubs.getDoc.callsArgWith(1, null, settings);
								tools.stubs.repeatWriteSafe.callsArgWith(2, null);
								tools.stubs.update.callsArgWith(1, null);
							},
							expectBlock: (res) => {
								expect(res.statusCode).to.equal(200);
								expect(res.body.message).to.equal('ok');
							}
						},
						{
							itStatement: 'should return error when user attempts to change ibmid - only works for "/ak/" routes test_id=aqkhmd',
							body: {
								admin_list: auth_scheme_objects.app_id.admin_list,
								auth_scheme: 'appid'
							},
							username: 'admin',
							password: 'random',
							callFunction: () => {
								common.ev.AUTH_SCHEME = 'ibmid';
								const settings = JSON.parse(JSON.stringify(auth_scheme_objects.athena_system));
								tools.stubs.getDoc.callsArgWith(1, null, settings);
								tools.stubs.repeatWriteSafe.callsArgWith(2, null);
								tools.stubs.update.callsArgWith(1, null);
							},
							expectBlock: (res) => {
								if (res.body.statusCode) { expect(res.body.statusCode).to.equal(400); }
								if (res.body.msg) { expect(res.body.msg).to.equal('Your auth_scheme is "ibmid". You are not allowed to change it to "appid"'); }
								common.ev.AUTH_SCHEME = 'initial';
							}
						},
						{
							itStatement: 'should return error when a user attempts to change from iam - only works for "/ak/" routes test_id=bzyodu',
							body: {
								admin_list: auth_scheme_objects.app_id.admin_list,
								auth_scheme: 'appid'
							},
							username: 'admin',
							password: 'random',
							callFunction: () => {
								common.ev.AUTH_SCHEME = 'iam';
								const settings = JSON.parse(JSON.stringify(auth_scheme_objects.athena_system));
								tools.stubs.getDoc.callsArgWith(1, null, settings);
								tools.stubs.repeatWriteSafe.callsArgWith(2, null);
								tools.stubs.update.callsArgWith(1, null);
							},
							expectBlock: (res) => {
								if (res.body.statusCode) { expect(res.body.statusCode).to.equal(400); }
								if (res.body.msg) { expect(res.body.msg).to.equal('Your auth_scheme is "ibmid". You are not allowed to change it to "appid"'); }
								common.ev.AUTH_SCHEME = 'initial';
							}
						},
						{
							itStatement: 'should return an error - error passed to getDoc stub test_id=evuaoq',
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
							itStatement: 'should return a status of 200 and the message "ok". all params correct and uses "appid" test_id=ocdfpn',
							body: {
								admin_list: auth_scheme_objects.app_id.admin_list,
								auth_scheme: 'appid',
								admin_contact_email: 'admin@us.ibm.com'
							},
							username: 'admin',
							password: 'random',
							callFunction: () => {
								const settings = JSON.parse(JSON.stringify(auth_scheme_objects.athena_system));
								tools.stubs.getDoc.callsArgWith(1, null, settings);
								tools.stubs.repeatWriteSafe.callsArgWith(2, null);
								tools.stubs.update.callsArgWith(1, null);
							},
							expectBlock: (res) => {
								expect(res.statusCode).to.equal(200);
								expect(res.body.message).to.equal('ok');
							}
						},
						{
							itStatement: 'should return a status of 200 and the message "ok" - valid params sent through stubs test_id=nvrisi',
							body: {
								admin_list: auth_scheme_objects.app_id.admin_list,
								auth_scheme: 'reset',
								admin_contact_email: 'someone@mail.com',
								users: ['user@mail.com', 'someone_else@us.ibm.com']
							},
							username: 'admin',
							password: 'random',
							callFunction: () => {
								const settings = JSON.parse(JSON.stringify(auth_scheme_objects.athena_system));
								tools.stubs.getDoc.callsArgWith(1, null, settings);
								tools.stubs.repeatWriteSafe.callsArgWith(2, null);
								tools.stubs.update.callsArgWith(1, null);
							},
							expectBlock: (res) => {
								expect(res.statusCode).to.equal(200);
								expect(res.body.message).to.equal('ok');
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
