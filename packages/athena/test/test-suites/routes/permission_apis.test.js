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
// permission_api.test.js - Test permission apis
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
		getDesignDocView: sinon.stub(tools.otcc, 'getDesignDocView'),
		isAuthenticated: sinon.stub(tools.middleware, 'isAuthenticated'),
		getDoc: sinon.stub(tools.otcc, 'getDoc'),
		createNewDoc: sinon.stub(tools.otcc, 'createNewDoc'),
		repeatWriteSafe: sinon.stub(tools.otcc, 'repeatWriteSafe'),
		repeatDelete: sinon.stub(tools.otcc, 'repeatDelete'),
		update: sinon.stub(ev, 'update')
	};
};

const setEvSettings = () => {
	ev.AUTH_SCHEME = 'appid';
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
			roles: ['manager']
		},
		'some_access_holder@us.ibm.com': {
			uuid: '67ca95d2de57f06da27be3c9fc00e864',
			created: 1538651194801,
			roles: ['reader']
		}
	};
};

describe('Permission APIs', () => {
	beforeEach((done) => {
		tools.stubs = createStubs();
		tools.middleware = require('../../../libs/middleware/middleware.js')(common.logger, ev, tools);
		tools.middleware.verify_view_action_session = function (req, res, next) {
			return next();
		};
		tools.middleware.verify_view_action_ak = function (req, res, next) {
			return next();
		};
		tools.middleware.verify_users_action_init_session = function (req, res, next) {
			return next();
		};
		tools.middleware.verify_users_action_init_ak = function (req, res, next) {
			return next();
		};
		tools.middleware.verify_settings_action_session = function (req, res, next) {
			return next();
		};
		tools.middleware.verify_users_action_ak = function (req, res, next) {
			return next();
		};
		tools.middleware.verify_apiKey_action_ak = function (req, res, next) {
			return next();
		};
		tools.middleware.checkAuthentication = function (req, res, next) {
			return next();
		};
		tools.middleware.verify_users_action_session = function (req, res, next) {
			return next();
		};
		tools.middleware.verify_users_action_ak = function (req, res, next) {
			return next();
		};
		tools.session_store._destroySessionByUuid = sinon.stub().callsArgWith(1, null);
		const permission_apis = require('../../../routes/permission_apis.js')(common.logger, ev, tools);
		this.app = common.expressApp(permission_apis);
		setEvSettings();
		done();
	});
	afterEach((done) => {
		myutils.restoreStubs(tools.stubs);
		delete tools.session_store._destroySessionByUuid;
		ev.AUTH_SCHEME = 'appid';
		done();
	});
	const get_permissions = () => {
		return [
			{
				itStatement: 'should return a status of 200 and the correct body test_id=czozhq',
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify(
							{
								'users': {
									'67ca95d2de57f06da27be3c9fc00e865': {
										'email': 'someone_else@us.ibm.com', 'roles': ['manager'], 'created': 1538651194801
									},
									'67ca95d2de57f06da27be3c9fc00e864': {
										'email': 'some_access_holder@us.ibm.com', 'roles': ['reader'], 'created': 1538651194801
									}
								}
							}
						)
					);
				}
			}
		];
	};

	const add_users = () => {
		return [
			{
				itStatement: 'should return a status of 200 and a message of ok test_id=ysbarj',
				body: {
					users: {
						'person1@us.ibm.com': {
							roles: ['reader']
						},
						'person2@us.ibm.com': {
							roles: ['reader']
						}
					},
				},
				username: 'admin',
				password: 'random',
				callFunction: () => {
					common.ev.AUTH_SCHEME = 'appid';
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
				itStatement: 'should return error - user already exists test_id=sovpva',
				body: {
					users: {
						'someone_else@us.ibm.com': {
							roles: ['reader']
						},
						'person2@us.ibm.com': {
							roles: ['reader']
						}
					},
				},
				username: 'admin',
				password: 'random',
				callFunction: () => {
					common.ev.AUTH_SCHEME = 'appid';
					const settings = JSON.parse(JSON.stringify(auth_scheme_objects.athena_system));
					tools.stubs.getDoc.callsArgWith(1, null, settings);
					tools.stubs.repeatWriteSafe.callsArgWith(2, null);
					tools.stubs.update.callsArgWith(1, null);
				},
				expectBlock: (res) => {
					expect(res.statusCode).to.equal(400);
				}
			},
			{
				itStatement: 'should return an error - error passed to getDoc stub test_id=xkjeim',
				body: {
					users: {
						'person1@us.ibm.com': {
							roles: ['reader']
						}
					},
				},
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
				itStatement: 'should return an error and message - error sent to "repeatWriteSafe" stub test_id=atcwpy',
				body: {
					users: {
						'person1@us.ibm.com': {
							roles: ['reader']
						},
						'person2@us.ibm.com': {
							roles: ['reader']
						}
					},
				},
				username: 'admin',
				password: 'random',
				callFunction: () => {
					common.ev.AUTH_SCHEME = 'appid';
					const settings = JSON.parse(JSON.stringify(auth_scheme_objects.athena_system));
					tools.stubs.getDoc.callsArgWith(1, null, settings);
					tools.stubs.repeatWriteSafe.callsArgWith(2, { statusCode: 500, msg: 'problem adding users' });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({
							'statusCode': 500,
							'msg': 'could not update settings doc',
							'details': { 'statusCode': 500, 'msg': 'problem adding users' }
						})
					);
				}
			},
			{
				itStatement: 'should return an error and message - error sent to update stub test_id=zwwhvt',
				body: {
					users: {
						'person1@us.ibm.com': {
							roles: ['reader']
						},
						'person2@us.ibm.com': {
							roles: ['reader']
						}
					},
				},
				username: 'admin',
				password: 'random',
				callFunction: () => {
					common.ev.AUTH_SCHEME = 'appid';
					const settings = JSON.parse(JSON.stringify(auth_scheme_objects.athena_system));
					tools.stubs.getDoc.callsArgWith(1, null, settings);
					tools.stubs.repeatWriteSafe.callsArgWith(2, null);
					tools.stubs.update.callsArgWith(1, { statusCode: 500, msg: 'problem updating' });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'statusCode': 500, 'msg': 'could not update config settings' }));
				}
			},
			{
				itStatement: 'should return errors for bad usernames - test_id=ljybei',
				body: {
					users: {
						'this-is-okay': {
							roles: ['reader']
						},
						'this:is:invalid': {		// has colon
							roles: ['reader']
						},
						'bad': {					// too short
							roles: ['reader']
						},
						'invalid-invalid-invalid-invalid-invalid-invalid-invalid-invalid-invalid': {		// too long
							roles: ['reader']
						},
						'<script>': {				// too ugly
							roles: ['reader']
						},
					},
				},
				username: 'admin',
				password: 'random',
				callFunction: () => {
					common.ev.AUTH_SCHEME = 'appid';
					const settings = JSON.parse(JSON.stringify(auth_scheme_objects.athena_system));
					tools.stubs.getDoc.callsArgWith(1, null, settings);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(400);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({
						'statusCode': 400, 'msg': [
							'username cannot contain a colon: this:is:invalid',
							'username cannot be less than 6 characters: bad',
							'username cannot be greater than 64 characters: invalid-invalid-...',
							'username cannot contain a "<" or ">" character: %3Cscript%3E'
						]
					}));
				}
			}
		];
	};

	const edit_users = () => {
		return [
			{
				itStatement: 'should return a status of 200 and a message of ok test_id=thwrmm',
				body: {
					uuids: {
						'646674f9-1c57-42bd-9b05-33a858a4ff2e': {
							roles: ['reader', 'manager']
						},
					},
				},
				username: 'admin',
				password: 'random',
				callFunction: () => {
					common.ev.AUTH_SCHEME = 'appid';
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
				itStatement: 'should return error - user does not exist test_id=sovpva',
				body: {
					uuids: {
						'adasdfsf-1c57-42bd-9b05-33a858a4ff2e': {
							roles: ['reader']
						}
					},
				},
				username: 'admin',
				password: 'random',
				callFunction: () => {
					common.ev.AUTH_SCHEME = 'appid';
					const settings = JSON.parse(JSON.stringify(auth_scheme_objects.athena_system));
					tools.stubs.getDoc.callsArgWith(1, null, settings);
					tools.stubs.repeatWriteSafe.callsArgWith(2, null);
					tools.stubs.update.callsArgWith(1, null);
				},
				expectBlock: (res) => {
					expect(res.statusCode).to.equal(400);
				}
			},
			{
				itStatement: 'should return an error - error passed to getDoc stub test_id=ylytxm',
				body: {
					uuids: {
						'adasdfsf-1c57-42bd-9b05-33a858a4ff2e': {
							roles: ['reader']
						}
					},
				},
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
				itStatement: 'should return an error and message - error sent to "repeatWriteSafe" stub test_id=hbuyfi',
				body: {
					uuids: {
						'646674f9-1c57-42bd-9b05-33a858a4ff2e': {
							roles: ['reader', 'manager']
						},
					},
				},
				username: 'admin',
				password: 'random',
				callFunction: () => {
					common.ev.AUTH_SCHEME = 'appid';
					const settings = JSON.parse(JSON.stringify(auth_scheme_objects.athena_system));
					tools.stubs.getDoc.callsArgWith(1, null, settings);
					tools.stubs.repeatWriteSafe.callsArgWith(2, { statusCode: 500, msg: 'problem editing users' });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({
							'statusCode': 500,
							'msg': 'could not update settings doc',
							'details': { 'statusCode': 500, 'msg': 'problem editing users' }
						})
					);
				}
			},
			{
				itStatement: 'should return an error and message - error sent to update stub test_id=uwxvkw',
				body: {
					uuids: {
						'646674f9-1c57-42bd-9b05-33a858a4ff2e': {
							roles: ['reader', 'manager']
						},
					},
				},
				username: 'admin',
				password: 'random',
				callFunction: () => {
					common.ev.AUTH_SCHEME = 'appid';
					const settings = JSON.parse(JSON.stringify(auth_scheme_objects.athena_system));
					tools.stubs.getDoc.callsArgWith(1, null, settings);
					tools.stubs.repeatWriteSafe.callsArgWith(2, null);
					tools.stubs.update.callsArgWith(1, { statusCode: 500, msg: 'problem updating' });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'statusCode': 500, 'msg': 'could not update config settings' }));
				}
			}
		];
	};

	const delete_users = () => {
		return [
			{
				itStatement: 'should return ok and delete the user - test_id=rokbmt',
				query: {
					uuids: '["abcdef"]'
				},
				username: 'admin',
				password: 'random',
				callFunction: () => {
					const settings = JSON.parse(JSON.stringify(auth_scheme_objects.athena_system));
					settings.access_list = [
						{
							'email': 'lcsharp@us.ibm.com',
							'uuid': '67ca95d2de57f06da27be3c9fc00e865',
							'created': 1538651194801
						},
						{
							'email': 'dude@us.ibm.com',
							'uuid': 'abcdef',
							'created': 1538651194801
						}
					];
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
				itStatement: 'should stop user from deleting self - test_id=xijznz',
				query: {
					uuids: '["67ca95d2de57f06da27be3c9fc00e865"]'
				},
				username: 'admin',
				password: 'random',
				callFunction: () => {
					const settings = JSON.parse(JSON.stringify(auth_scheme_objects.athena_system));
					settings.access_list = [
						{
							'email': 'lcsharp@us.ibm.com',
							'uuid': '67ca95d2de57f06da27be3c9fc00e865',
							'created': 1538651194801
						}
					];
					tools.stubs.getDoc.callsArgWith(1, null, settings);
					tools.stubs.repeatWriteSafe.callsArgWith(2, null);
					tools.stubs.update.callsArgWith(1, null);
				},
				expectBlock: (res) => {
					expect(res.statusCode).to.equal(400);
					expect(res.body).to.deep.equal({
						statusCode: 400,
						msg: ['cannot delete self: 67ca95d2de57f06da27be3c9fc00e865']
					});
				}
			},
			{
				itStatement: 'should return an error if user does not exist  test_id=csdofe',
				query: {
					uuids: '["adfasdfas"]'
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
					expect(res.statusCode).to.equal(400);
				}
			},
			{
				itStatement: 'should return an error - error passed to getDoc stub test_id=qcnvnk',
				query: {
					uuids: '[\'adfasdfas\']'
				},
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
				itStatement: 'should return an error and message - error sent to "repeatWriteSafe" stub test_id=mwxpff',
				query: {
					uuids: '[\'646674f9-1c57-42bd-9b05-33a858a4ff2e\']'
				},
				username: 'admin',
				password: 'random',
				callFunction: () => {
					common.ev.AUTH_SCHEME = 'appid';
					const settings = JSON.parse(JSON.stringify(auth_scheme_objects.athena_system));
					tools.stubs.getDoc.callsArgWith(1, null, settings);
					tools.stubs.repeatWriteSafe.callsArgWith(2, { statusCode: 500, msg: 'problem adding users' });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({
							'statusCode': 500,
							'msg': 'could not update settings doc',
							'details': { 'statusCode': 500, 'msg': 'problem adding users' }
						})
					);
				}
			},
			{
				itStatement: 'should return an error and message - error sent to update stub test_id=vqbatg',
				query: {
					uuids: '["646674f9-1c57-42bd-9b05-33a858a4ff2e"]'
				},
				username: 'admin',
				password: 'random',
				callFunction: () => {
					common.ev.AUTH_SCHEME = 'appid';
					const settings = JSON.parse(JSON.stringify(auth_scheme_objects.athena_system));
					tools.stubs.getDoc.callsArgWith(1, null, settings);
					tools.stubs.repeatWriteSafe.callsArgWith(2, null);
					tools.stubs.update.callsArgWith(1, { statusCode: 500, msg: 'problem updating' });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'statusCode': 500, 'msg': 'could not update config settings' }));
				}
			}
		];
	};

	const store_api_key = () => {
		return [
			{
				itStatement: 'should return a status of 200 and a message of ok test_id=suwviw',
				body: {
					'roles': ['writer', 'manager'],
					'description': 'batman\'s key'
				},
				username: 'admin',
				password: 'random',
				callFunction: () => {
					common.ev.AUTH_SCHEME = 'appid';
					tools.stubs.createNewDoc.callsArgWith(2, null, { _id: 'something', roles: ['writer', 'manager'] });
				},
				expectBlock: (res) => {
					expect(res.statusCode).to.equal(200);
					expect(res.body.message).to.equal('ok');
					expect(res.body.api_key).to.equal('something');
					expect(res.body.api_secret).to.not.be.null;
					expect(JSON.stringify(res.body.roles)).to.equal(JSON.stringify(['writer', 'manager']));
				}
			},
			{
				itStatement: 'should return an error and message - invalid role in body test_id=kyfcuy',
				body: {
					'roles': ['invalid_role'],
					'description': 'batman\'s key'
				},
				username: 'admin',
				password: 'random',
				callFunction: () => {
					common.ev.AUTH_SCHEME = 'appid';
					tools.stubs.createNewDoc.callsArgWith(2, null, { _id: 'something', roles: ['writer', 'manager'] });
				},
				expectBlock: (res) => {
					expect(res.statusCode).to.equal(400);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({
							'statusCode': 400,
							'msg': ['invalid roles for api key. valid roles: ["manager","writer","reader"]']
						})
					);
				}
			},
			{
				itStatement: 'should return an error and message - no roles in body test_id=wrzvni',
				body: {
					'roles': [],
					'description': 'batman\'s key'
				},
				username: 'admin',
				password: 'random',
				callFunction: () => {
					common.ev.AUTH_SCHEME = 'appid';
					tools.stubs.createNewDoc.callsArgWith(2, null, { _id: 'something', roles: ['writer', 'manager'] });
				},
				expectBlock: (res) => {
					expect(res.statusCode).to.equal(400);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({ 'statusCode': 400, 'msg': ['must have at least 1 role for key.'] })
					);
				}
			}
		];
	};

	const get_all_api_keys = () => {
		return [
			{
				itStatement: 'should return a status of 200 and a message of ok test_id=uszxic',
				username: 'admin',
				password: 'random',
				callFunction: () => {
					common.ev.AUTH_SCHEME = 'appid';
					const stub_view = auth_scheme_objects.stub_view;
					tools.stubs.getDesignDocView.callsArgWith(1, null, stub_view);
				},
				expectBlock: (res) => {
					expect(res.statusCode).to.equal(200);
					expect(res.body.message).to.equal('ok');
					expect(JSON.stringify(res.body.keys)).to.equal(JSON.stringify(auth_scheme_objects.some_response));
				}
			},
			{
				itStatement: 'should return an error and message - error passed to getDesignDocView stub test_id=aveslj',
				username: 'admin',
				password: 'random',
				callFunction: () => {
					common.ev.AUTH_SCHEME = 'appid';
					tools.stubs.getDesignDocView.callsArgWith(1, { statusCode: 500, message: 'problem getting all api keys' });
				},
				expectBlock: (res) => {
					expect(res.statusCode).to.equal(500);
					expect(res.body.message).to.equal('problem getting all api keys');
				}
			}
		];
	};

	const delete_api_key_doc = () => {
		return [
			{
				itStatement: 'should return a status of 200 test_id=ehidfg',
				username: 'admin',
				password: 'random',
				callFunction: () => {
					common.ev.AUTH_SCHEME = 'appid';
					const stub_doc = auth_scheme_objects.some_response;
					tools.stubs.repeatDelete.callsArgWith(2, null, stub_doc);
				},
				expectBlock: (res) => {
					expect(res.statusCode).to.equal(200);
					expect(res.body.deleted).to.equal('V_b_M5eEPCaEfERE');
				}
			},
			{
				itStatement: 'should return an error and message - error past to repeatDelete stub test_id=cdgvnp',
				username: 'admin',
				password: 'random',
				callFunction: () => {
					common.ev.AUTH_SCHEME = 'appid';
					tools.stubs.repeatDelete.callsArgWith(2, { statusCode: 500, msg: 'problem deleting api key doc' });
				},
				expectBlock: (res) => {
					expect(res.statusCode).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'statusCode': 500, 'msg': 'problem deleting api key doc' }));
				}
			}
		];
	};

	const change_password = () => {
		return [
			{
				itStatement: 'should return a 200 - good *passphrase* test_id=ixxnfq',
				callFunction: (routeInfo) => {
					routeInfo.body = {
						desired_pass: 'iwenttothestoretobuymilk'		// dummy password please ignore
					};
					common.ev.AUTH_SCHEME = 'couchdb';
					const doc = {};
					doc.access_list = { 'someone_else@us.ibm.com': { uuid: 'adasdfsf-1c57-42bd-9b05-33a858a4ff2e' } };
					doc.desired_pass = 'iwenttothestoretobuymilk';		// dummy password please ignore
					tools.stubs.getDoc.callsArgWith(1, null, doc);
					tools.stubs.getUuid = sinon.stub(tools.middleware, 'getUuid').returns('adasdfsf-1c57-42bd-9b05-33a858a4ff2e');
					tools.stubs.verify_secret = sinon.stub(tools.misc, 'verify_secret').returns(true);
					tools.stubs.repeatWriteSafe.callsArgWith(2, null);
					tools.stubs.update.callsArgWith(1, null);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'message': 'ok', 'details': 'password updated' }));
					tools.stubs.getUuid.restore();
					tools.stubs.verify_secret.restore();
				}
			},
			{
				itStatement: 'should return a 200 - good password - test_id=ocjafz',
				callFunction: (routeInfo) => {
					routeInfo.body = {
						desired_pass: 'HiThere123!'					// dummy password please ignore
					};
					common.ev.AUTH_SCHEME = 'couchdb';
					const doc = {};
					doc.access_list = { 'someone_else@us.ibm.com': { uuid: 'adasdfsf-1c57-42bd-9b05-33a858a4ff2e' } };
					doc.desired_pass = 'iwenttothestoretobuymilk';	// dummy password please ignore
					tools.stubs.getDoc.callsArgWith(1, null, doc);
					tools.stubs.getUuid = sinon.stub(tools.middleware, 'getUuid').returns('adasdfsf-1c57-42bd-9b05-33a858a4ff2e');
					tools.stubs.verify_secret = sinon.stub(tools.misc, 'verify_secret').returns(true);
					tools.stubs.repeatWriteSafe.callsArgWith(2, null);
					tools.stubs.update.callsArgWith(1, null);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'message': 'ok', 'details': 'password updated' }));
					tools.stubs.getUuid.restore();
					tools.stubs.verify_secret.restore();
				}
			},
			{
				itStatement: 'should return an error and message - AUTH_SCHEME is not "couchdb" test_id=felajy',
				callFunction: () => {
					common.ev.AUTH_SCHEME = 'not_couchdb';
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(400);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({ 'statusCode': 400, 'msg': 'cannot edit passwords when auth scheme is not_couchdb' })
					);
				}
			},
			{
				itStatement: 'should return an error and message - error sent to "getDoc" stub test_id=dmycas',
				callFunction: () => {
					common.ev.AUTH_SCHEME = 'couchdb';
					tools.stubs.getDoc.callsArgWith(1, { statusCode: 500, msg: 'problem getting doc' });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ statusCode: 500, msg: 'problem getting doc' }));
				}
			},
			{
				itStatement: 'should return an error and message - no emails in access list test_id=esaifn',
				callFunction: () => {
					common.ev.AUTH_SCHEME = 'couchdb';
					const doc = {};
					tools.stubs.getDoc.callsArgWith(1, null, doc);
					tools.stubs.getUuid = sinon.stub(tools.middleware, 'getUuid').returns('adasdfsf-1c57-42bd-9b05-33a858a4ff2e');
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(400);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({ 'statusCode': 400, 'msg': ['user by uuid does not exist: adasdfsf-1c57-42bd-9b05-33a858a4ff2e'] })
					);
					tools.stubs.getUuid.restore();
				}
			},
			{
				itStatement: 'should return an error and message - password is not long enough test_id=wsefxc',
				callFunction: (routeInfo) => {
					routeInfo.body = {
						desired_pass: 'hiThere!0'					// dummy password please ignore
					};
					common.ev.AUTH_SCHEME = 'couchdb';
					const doc = {};
					doc.access_list = { 'someone_else@us.ibm.com': { uuid: 'adasdfsf-1c57-42bd-9b05-33a858a4ff2e' } };
					tools.stubs.getDoc.callsArgWith(1, null, doc);
					tools.stubs.getUuid = sinon.stub(tools.middleware, 'getUuid').returns('adasdfsf-1c57-42bd-9b05-33a858a4ff2e');
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(400);
					expect(res.body).to.deep.equal({ 'statusCode': 400, 'msg': ['The password must be at least 10 characters long.'] });
					tools.stubs.getUuid.restore();
				}
			},
			{
				itStatement: 'should return an error and message - password is not complex long enough test_id=ngcwaz',
				callFunction: (routeInfo) => {
					routeInfo.body = {
						desired_pass: 'iwenttothestore'					// dummy password please ignore
					};
					common.ev.AUTH_SCHEME = 'couchdb';
					const doc = {};
					doc.access_list = { 'someone_else@us.ibm.com': { uuid: 'adasdfsf-1c57-42bd-9b05-33a858a4ff2e' } };
					tools.stubs.getDoc.callsArgWith(1, null, doc);
					tools.stubs.getUuid = sinon.stub(tools.middleware, 'getUuid').returns('adasdfsf-1c57-42bd-9b05-33a858a4ff2e');
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(400);
					expect(res.body).to.deep.equal({
						'statusCode': 400, 'msg': [
							'The password must contain at least one uppercase letter.',
							'The password must contain at least one number.',
							'The password must contain at least one special character.'
						]
					});
					tools.stubs.getUuid.restore();
				}
			},
			{
				itStatement: 'should return a 200 and the correct message - exercises default password code test_id=kfcggj',
				callFunction: (routeInfo) => {
					routeInfo.body = {
						desired_pass: 'iwenttothestoretobuymilk'			// dummy password please ignore
					};
					common.ev.AUTH_SCHEME = 'couchdb';
					common.ev.DEFAULT_USER_PASSWORD = 'default_password';
					const doc = {};
					doc.access_list = { 'someone_else@us.ibm.com': { uuid: 'adasdfsf-1c57-42bd-9b05-33a858a4ff2e' } };
					doc.desired_pass = 'iwenttothestoretobuymilk';			// dummy password please ignore
					tools.stubs.getDoc.callsArgWith(1, null, doc);
					tools.stubs.getUuid = sinon.stub(tools.middleware, 'getUuid').returns('adasdfsf-1c57-42bd-9b05-33a858a4ff2e');
					tools.stubs.verify_secret = sinon.stub(tools.misc, 'verify_secret').returns(true);
					tools.stubs.repeatWriteSafe.callsArgWith(2, null);
					tools.stubs.update.callsArgWith(1, null);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'message': 'ok', 'details': 'password updated' }));
					tools.stubs.getUuid.restore();
					tools.stubs.verify_secret.restore();
				}
			},
			{
				itStatement: 'should return an error and message - allowing the old password check to fail test_id=ajsske',
				callFunction: (routeInfo) => {
					routeInfo.body = {
						desired_pass: 'iwenttothestoretobuymilk'			// dummy password please ignore
					};
					common.ev.AUTH_SCHEME = 'couchdb';
					const doc = {};
					doc.access_list = { 'someone_else@us.ibm.com': { uuid: 'adasdfsf-1c57-42bd-9b05-33a858a4ff2e' } };
					tools.stubs.getDoc.callsArgWith(1, null, doc);
					tools.stubs.getUuid = sinon.stub(tools.middleware, 'getUuid').returns('adasdfsf-1c57-42bd-9b05-33a858a4ff2e');
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(400);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'statusCode': 400, 'msg': ['old password is invalid'] }));
					tools.stubs.getUuid.restore();
				}
			},
			{
				itStatement: 'should return an error and message - error sent to "repeatWriteSafe" stub test_id=zqisvr',
				callFunction: (routeInfo) => {
					routeInfo.body = {
						desired_pass: 'iwenttothestoretobuymilk'			// dummy password please ignore
					};
					common.ev.AUTH_SCHEME = 'couchdb';
					const doc = {};
					doc.access_list = { 'someone_else@us.ibm.com': { uuid: 'adasdfsf-1c57-42bd-9b05-33a858a4ff2e' } };
					doc.desired_pass = 'iwenttothestoretobuymilk';			// dummy password please ignore
					tools.stubs.getDoc.callsArgWith(1, null, doc);
					tools.stubs.getUuid = sinon.stub(tools.middleware, 'getUuid').returns('adasdfsf-1c57-42bd-9b05-33a858a4ff2e');
					tools.stubs.verify_secret = sinon.stub(tools.misc, 'verify_secret').returns(true);
					tools.stubs.repeatWriteSafe.callsArgWith(2, { statusCode: 500, msg: 'problem writing new password' });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({
							'statusCode': 500,
							'msg': 'could not update settings doc',
							'details': { 'statusCode': 500, 'msg': 'problem writing new password' }
						})
					);
					tools.stubs.getUuid.restore();
					tools.stubs.verify_secret.restore();
				}
			},
			{
				itStatement: 'should return an error and message - error sent to update stub test_id=ecrxrk',
				callFunction: (routeInfo) => {
					routeInfo.body = {
						desired_pass: 'iwenttothestoretobuymilk'			// dummy password please ignore
					};
					common.ev.AUTH_SCHEME = 'couchdb';
					const doc = {};
					doc.access_list = { 'someone_else@us.ibm.com': { uuid: 'adasdfsf-1c57-42bd-9b05-33a858a4ff2e' } };
					doc.desired_pass = 'iwenttothestoretobuymilk';			// dummy password please ignore
					tools.stubs.getDoc.callsArgWith(1, null, doc);
					tools.stubs.getUuid = sinon.stub(tools.middleware, 'getUuid').returns('adasdfsf-1c57-42bd-9b05-33a858a4ff2e');
					tools.stubs.verify_secret = sinon.stub(tools.misc, 'verify_secret').returns(true);
					tools.stubs.repeatWriteSafe.callsArgWith(2, null);
					tools.stubs.update.callsArgWith(1, { statusCode: 500, msg: 'problem updating' });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'statusCode': 500, 'msg': 'could not update config settings' }));
					tools.stubs.getUuid.restore();
					tools.stubs.verify_secret.restore();
				}
			}
		];
	};

	const reset_password = () => {
		return [
			{
				itStatement: 'should  test_id=rzdagk',
				callFunction: (routeInfo) => {
					common.ev.AUTH_SCHEME = 'couchdb';
					routeInfo.body = {
						users: ['adasdfsf-1c57-42bd-9b05-33a858a4ff2e']
					};
					const doc = {};
					doc.access_list = { 'someone_else@us.ibm.com': { uuid: 'adasdfsf-1c57-42bd-9b05-33a858a4ff2e' } };
					doc.desired_pass = 'iwenttothestoretobuymilk';		// dummy password please ignore
					tools.stubs.getDoc.callsArgWith(1, null, doc);
					tools.stubs.repeatWriteSafe.callsArgWith(2, null);
					tools.stubs.update.callsArgWith(1, null);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'message': 'ok', 'uuids': ['adasdfsf-1c57-42bd-9b05-33a858a4ff2e'] }));
				}
			},
			{
				itStatement: 'should return an error and message - AUTH_SCHEME is not "couchdb" test_id=xahzhl',
				callFunction: () => {
					common.ev.AUTH_SCHEME = 'not_couchdb';
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(400);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({ 'statusCode': 400, 'msg': 'cannot reset passwords when auth scheme is not_couchdb' })
					);
				}
			},
			{
				itStatement: 'should return an error and message - error sent to "getDoc" stub test_id=dmycas',
				callFunction: () => {
					common.ev.AUTH_SCHEME = 'couchdb';
					tools.stubs.getDoc.callsArgWith(1, { statusCode: 500, msg: 'problem getting doc' });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ statusCode: 500, msg: 'problem getting doc' }));
				}
			},
			{
				itStatement: 'should return an error and message - no emails in access list test_id=esaifn',
				callFunction: () => {
					common.ev.AUTH_SCHEME = 'couchdb';
					const doc = {};
					tools.stubs.getDoc.callsArgWith(1, null, doc);
					tools.stubs.getUuid = sinon.stub(tools.middleware, 'getUuid').returns('adasdfsf-1c57-42bd-9b05-33a858a4ff2e');
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(400);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({ 'statusCode': 400, 'msg': ['the field "users" is missing or not an array or empty'] })
					);
					tools.stubs.getUuid.restore();
				}
			},
			{
				itStatement: 'should return an error and message - no matching users in access list test_id=ukdavr',
				callFunction: (routeInfo) => {
					common.ev.AUTH_SCHEME = 'couchdb';
					routeInfo.body = {
						users: ['abc']
					};
					const doc = {};
					doc.access_list = { 'someone_else@us.ibm.com': { uuid: 'adasdfsf-1c57-42bd-9b05-33a858a4ff2e' } };
					doc.desired_pass = 'iwenttothestoretobuymilk';				// dummy password please ignore
					tools.stubs.getDoc.callsArgWith(1, null, doc);
					tools.stubs.repeatWriteSafe.callsArgWith(2, null);
					tools.stubs.update.callsArgWith(1, null);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(400);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({ 'statusCode': 400, 'msg': ['user does not exist: abc'] })
					);
				}
			},
			{
				itStatement: 'should return an error and message - error sent to "repeatWriteSafe" stub test_id=zqisvr',
				callFunction: (routeInfo) => {
					common.ev.AUTH_SCHEME = 'couchdb';
					routeInfo.body = {
						users: ['adasdfsf-1c57-42bd-9b05-33a858a4ff2e']
					};
					const doc = {};
					doc.access_list = { 'someone_else@us.ibm.com': { uuid: 'adasdfsf-1c57-42bd-9b05-33a858a4ff2e' } };
					doc.desired_pass = 'iwenttothestoretobuymilk';				// dummy password please ignore
					tools.stubs.getDoc.callsArgWith(1, null, doc);
					tools.stubs.repeatWriteSafe.callsArgWith(2, { statusCode: 500, msg: 'problem resetting password' });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({
							'statusCode': 500,
							'msg': 'could not update settings doc',
							'details': { 'statusCode': 500, 'msg': 'problem resetting password' }
						})
					);
				}
			},
			{
				itStatement: 'should return an error and message - error sent to update stub test_id=ecrxrk',
				callFunction: (routeInfo) => {
					common.ev.AUTH_SCHEME = 'couchdb';
					routeInfo.body = {
						users: ['adasdfsf-1c57-42bd-9b05-33a858a4ff2e']
					};
					const doc = {};
					doc.access_list = { 'someone_else@us.ibm.com': { uuid: 'adasdfsf-1c57-42bd-9b05-33a858a4ff2e' } };
					doc.desired_pass = 'iwenttothestoretobuymilk';			// dummy password please ignore
					tools.stubs.getDoc.callsArgWith(1, null, doc);
					tools.stubs.repeatWriteSafe.callsArgWith(2, null);
					tools.stubs.update.callsArgWith(1, { statusCode: 500, msg: 'problem updating' });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'statusCode': 500, 'msg': 'could not update config settings' }));
				}
			}
		];
	};

	const get_user_information = () => {
		return [
			{
				itStatement: 'should return a status of 200 and the expected response test_id=cdmtsf',
				expectBlock: (res) => {
					const expected_keys = Object.keys(auth_scheme_objects.get_users_information_response);
					expect(res.status).to.equal(200);
					expect(JSON.stringify(Object.keys(res.body))).to.equal(JSON.stringify(expected_keys));
				}
			}
		];
	};
	const testCollection = [
		// GET /api/v2/permissions/users - Get users
		{
			suiteDescribe: 'GET /api/v2/permissions/users',
			mainDescribe: 'Run GET /api/v2/permissions/users',
			arrayOfRoutes: ['/api/v2/permissions/users'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_permissions()
				}
			]
		},
		// GET /ak/api/v2/permissions/users - Get users
		{
			suiteDescribe: 'GET /ak/api/v2/permissions/users',
			mainDescribe: 'Run GET /ak/api/v2/permissions/users',
			arrayOfRoutes: ['/ak/api/v2/permissions/users'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_permissions()
				}
			]
		},
		// POST /api/v2/permissions/users && /ak/api/v2/permissions/users
		{
			suiteDescribe: 'POST /api/v2/permissions/users',
			mainDescribe: 'Run POST /api/v2/permissions/users ',
			arrayOfRoutes: ['/api/v2/permissions/users'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: add_users()
				}
			]
		},
		// POST /ak/api/v2/permissions/users
		{
			suiteDescribe: 'POST /ak/api/v2/permissions/users',
			mainDescribe: 'Run POST /ak/api/v2/permissions/users',
			arrayOfRoutes: ['/ak/api/v2/permissions/users'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: add_users()
				}
			]
		},
		// PUT /api/v2/permissions/users
		{
			suiteDescribe: 'PUT /api/v2/permissions/users',
			mainDescribe: 'Run PUT /api/v2/permissions/users',
			arrayOfRoutes: ['/api/v2/permissions/users'],
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
					arrayOfInfoToTest: edit_users()
				}
			]
		},
		// PUT /ak/api/v2/permissions/users
		{
			suiteDescribe: 'PUT /ak/api/v2/permissions/users',
			mainDescribe: 'Run PUT /ak/api/v2/permissions/users ',
			arrayOfRoutes: ['/ak/api/v2/permissions/users'],
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
					arrayOfInfoToTest: edit_users()
				}
			]
		},
		// DELETE /api/v2/permissions/users
		{
			suiteDescribe: 'DELETE /api/v2/permissions/users',
			mainDescribe: 'Run DELETE /api/v2/permissions/users ',
			arrayOfRoutes: ['/api/v2/permissions/users'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.delete(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.query(routeInfo.query)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: delete_users()
				}
			]
		},
		// DELETE /ak/api/v2/permissions/users
		{
			suiteDescribe: 'DELETE /ak/api/v2/permissions/users',
			mainDescribe: 'Run DELETE /ak/api/v2/permissions/users ',
			arrayOfRoutes: ['/ak/api/v2/permissions/users'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.delete(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.query(routeInfo.query)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: delete_users()
				}
			]
		},
		// POST /api/v2/permissions/keys - Store an api key in the database
		{
			suiteDescribe: 'POST /api/v2/permissions/keys',
			mainDescribe: 'Run POST /api/v2/permissions/keys',
			arrayOfRoutes: ['/api/v2/permissions/keys'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: store_api_key()
				}
			]
		},
		// POST /ak/api/v2/permissions/keys - Store an api key in the database
		{
			suiteDescribe: 'POST /ak/api/v2/permissions/keys',
			mainDescribe: 'Run POST /ak/api/v2/permissions/keys',
			arrayOfRoutes: ['/ak/api/v2/permissions/keys'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: store_api_key()
				}
			]
		},
		// GET /api/v2/permissions/keys - Get all api keys from the db
		{
			suiteDescribe: 'GET /api/v2/permissions/keys',
			mainDescribe: 'Run GET /api/v2/permissions/keys',
			arrayOfRoutes: ['/api/v2/permissions/keys'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_all_api_keys()
				}
			]
		},
		// GET /ak/api/v2/permissions/keys - Get all api keys from the db
		{
			suiteDescribe: 'GET /ak/api/v2/permissions/keys',
			mainDescribe: 'Run GET /ak/api/v2/permissions/keys',
			arrayOfRoutes: ['/ak/api/v2/permissions/keys'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_all_api_keys()
				}
			]
		},
		// DELETE /api/v2/permissions/keys - Delete an api key doc
		{
			suiteDescribe: 'DELETE /api/v2/permissions/keys/:key_id',
			mainDescribe: 'Run DELETE /api/v2/permissions/keys/:key_id ',
			arrayOfRoutes: ['/api/v2/permissions/keys/V_b_M5eEPCaEfERE'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.delete(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: delete_api_key_doc()
				}
			]
		},
		// DELETE /ak/api/v2/permissions/keys - Delete an api key doc
		{
			suiteDescribe: 'DELETE /ak/api/v2/permissions/keys/:key_id',
			mainDescribe: 'Run DELETE /ak/api/v2/permissions/keys/:key_id ',
			arrayOfRoutes: ['/ak/api/v2/permissions/keys/V_b_M5eEPCaEfERE'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.delete(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: delete_api_key_doc()
				}
			]
		},
		// PUT /api/v2/permissions/users/password - Change password
		{
			suiteDescribe: 'PUT /api/v2/permissions/users/password',
			mainDescribe: 'Run PUT /api/v2/permissions/users/password ',
			arrayOfRoutes: ['/api/v2/permissions/users/password'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.put(routeInfo.route)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: change_password()
				}
			]
		},
		// PUT /api/v2/permissions/users/password/reset - Reset password
		{
			suiteDescribe: 'PUT /api/v2/permissions/users/password/reset',
			mainDescribe: 'Run PUT /api/v2/permissions/users/password/reset ',
			arrayOfRoutes: ['/api/v2/permissions/users/password/reset'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.put(routeInfo.route)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: reset_password()
				}
			]
		},
		// PUT /ak/api/v2/permissions/users/password/reset - Reset password
		{
			suiteDescribe: 'PUT /ak/api/v2/permissions/users/password/reset',
			mainDescribe: 'Run PUT /ak/api/v2/permissions/users/password/reset ',
			arrayOfRoutes: ['/ak/api/v2/permissions/users/password/reset'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.put(routeInfo.route)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: reset_password()
				}
			]
		},
		// GET /api/v2/users/info - Get user information
		{
			suiteDescribe: 'GET /api/v2/users/info',
			mainDescribe: 'Run GET /api/v2/users/info ',
			arrayOfRoutes: ['/api/v2/users/info'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_user_information()
				}
			]
		},
		// GET /ak/api/v2/users/info - Get user information
		{
			suiteDescribe: 'GET /ak/api/v2/users/info',
			mainDescribe: 'Run GET /ak/api/v2/users/info ',
			arrayOfRoutes: ['/ak/api/v2/users/info'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_user_information()
				}
			]
		}
	];
	// call main test function to run this test collection
	common.mainTestFunction(testCollection, path_to_current_file);
});
