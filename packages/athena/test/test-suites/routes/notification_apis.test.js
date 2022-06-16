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
// notification_apis.test.js - Test notification_apis
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
const notification_objects = require('../../docs/notifications_objects.json');

const opts = {
	url: 'http://127.0.0.1:5984',
	db_name: 'athena_networks'
};

common.ev.ACCESS_LIST = {
	'someone_else@us.ibm.com': { 'roles': ['manager'], }
};

common.ev.SUPPORT_KEY = 'admin';
common.ev.SUPPORT_PASSWORD = 'random';

tools.otcc = require('../../../libs/couchdb.js')(common.logger, tools, opts.url);
tools.middleware = common.tools.middleware;
const myutils = require('../../testing-lib/test-middleware');

let notification_apis;

chai.use(chaiHttp);

const createStubs = () => {
	return {
		notification_get: sinon.stub(tools.notifications, 'get'),
		notification_create: sinon.stub(tools.notifications, 'create'),
		notification_purge: sinon.stub(tools.notifications, 'purge'),
		repeatDelete: sinon.stub(tools.otcc, 'repeatDelete'),
		getDesignDocView: sinon.stub(tools.otcc, 'getDesignDocView'),
		bulkDatabase: sinon.stub(tools.couch_lib, 'bulkDatabase')
	};
};

describe('Notification APIs', () => {
	before((done) => {
		tools.stubs = createStubs();
		tools.middleware.verify_notifications_action_session = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_notifications_action_ak = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_view_action_session = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_view_action_ak = (req, res, next) => {
			return next();
		};
		notification_apis = require('../../../routes/notification_apis.js')(common.logger, common.ev, tools);
		this.app = common.expressApp(notification_apis);
		done();
	});
	after(() => {
		myutils.restoreStubs(tools.stubs);
	});
	const testCollection = [
		// GET /api/v1/notifications
		{
			suiteDescribe: 'GET /api/v1/notifications && /ak/api/v1/notifications',
			mainDescribe: 'Run GET /api/v1/notifications && /ak/api/v1/notifications ',
			arrayOfRoutes: ['/api/v1/notifications', '/ak/api/v1/notifications'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a status 200 and the correct response test_id=znzssk',
							username: 'admin',
							password: 'random',
							callFunction: () => {
								tools.stubs.notification_get.callsArgWith(1, null, notification_objects.get_response);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(JSON.stringify(tools.misc.sortItOut(res.body))).to.equal(
									JSON.stringify(tools.misc.sortItOut(notification_objects.get_response))
								);
							}
						},
						{
							itStatement: 'should return a status 200 and the correct response - admin is false for access list email test_id=jsozgr',
							username: 'admin',
							password: 'random',
							callFunction: () => {
								common.ev.ACCESS_LIST['someone_else@us.ibm.com'].admin = false;
								tools.stubs.notification_get.callsArgWith(1, null, notification_objects.get_response);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(JSON.stringify(tools.misc.sortItOut(res.body))).to.equal(
									JSON.stringify(tools.misc.sortItOut(notification_objects.get_response))
								);
								common.ev.ACCESS_LIST['someone_else@us.ibm.com'].admin = true;
							}
						},
						{
							itStatement: 'should return an error - error passed to notifications.get stub test_id=ivfhoo',
							username: 'admin',
							password: 'random',
							callFunction: () => {
								const err = {
									statusCode: 500,
									msg: 'problem getting notifications'
								};
								tools.stubs.notification_get.callsArgWith(1, err);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.body.statusCode).to.equal(500);
								expect(res.body.msg).to.equal('problem getting notifications');
							}
						},
						{
							itStatement: 'should return an error - error without statusCode passed to notifications.get stub test_id=vzkyqz',
							username: 'admin',
							password: 'random',
							callFunction: () => {
								const err = {
									msg: 'problem getting notifications'
								};
								tools.stubs.notification_get.callsArgWith(1, err);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.body.msg).to.equal('problem getting notifications');
							}
						}
					]
				}
			]
		},
		// POST /api/v1/notifications
		{
			suiteDescribe: 'POST /api/v1/notifications',
			mainDescribe: 'Run POST /api/v1/notifications ',
			arrayOfRoutes: ['/api/v1/notifications'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a status 200 and the correct response test_id=mbhnyy',
							callFunction: () => {
								tools.stubs.notification_create.callsArgWith(1, null, notification_objects.create_body_valid_message);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(res.body.message).to.equal('ok');
							}
						},
						{
							itStatement: 'should return an error - error passed to create stub test_id=tsgqqw',
							callFunction: () => {
								const err = {
									statusCode: 500,
									msg: 'problem creating a notification'
								};
								tools.stubs.notification_create.callsArgWith(1, err);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.body.msg).to.equal('problem creating a notification');
							}
						},
						{
							itStatement: 'should return an error - error without statusCode passed to create stub test_id=ejnhes',
							callFunction: () => {
								const err = {
									msg: 'problem creating a notification'
								};
								tools.stubs.notification_create.callsArgWith(1, err);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.body.msg).to.equal('problem creating a notification');
							}
						}
					]
				}
			]
		},
		// DELETE /api/v1/notifications/purge && /ak/api/v1/notifications/purge
		{
			suiteDescribe: 'DELETE /api/v1/notifications/purge && /ak/api/v1/notifications/purge',
			mainDescribe: 'Run DELETE /api/v1/notifications/purge && /ak/api/v1/notifications/purge ',
			arrayOfRoutes: ['/api/v1/notifications/purge', '/ak/api/v1/notifications/purge'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.delete(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a status 200 and the correct response test_id=xmewei',
							username: 'admin',
							password: 'random',
							callFunction: () => {
								tools.stubs.notification_purge.callsArgWith(0, null, 'deleted 2 notification(s)');
								tools.notifications.create = function () { };
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(res.body.message).to.equal('ok');
								expect(res.body.details).to.equal('deleted 2 notification(s)');
							}
						},
						{
							itStatement: 'should return an error - error passed to create stub test_id=uvohpp',
							username: 'admin',
							password: 'random',
							callFunction: () => {
								const err = {
									statusCode: 500,
									message: 'problem deleting notification(s)'
								};
								tools.stubs.notification_purge.callsArgWith(0, err);
								tools.notifications.create = function () { };
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.body.message).to.equal('problem deleting notification(s)');
							}
						},
						{
							itStatement: 'should return an error - error without statusCode passed to create stub test_id=hqwijv',
							username: 'admin',
							password: 'random',
							callFunction: () => {
								const err = {
									message: 'problem deleting notification(s)'
								};
								tools.stubs.notification_purge.callsArgWith(0, err);
								tools.notifications.create = function () { };
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.body.message).to.equal('problem deleting notification(s)');
							}
						}
					]
				}
			]
		},
		// POST /api/v2/notifications/bulk && /ak/api/v2/notifications/:notification_id
		{
			suiteDescribe: 'POST /api/v2/notifications/bulk && /ak/api/v2/notifications/bulk',
			mainDescribe: 'Run POST /api/v2/notifications/bulk && /ak/api/v2/notifications/bulk ',
			arrayOfRoutes: ['/api/v2/notifications/bulk', '/ak/api/v2/notifications/bulk'],
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
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a status 200 and the correct response test_id=qldpwd',
							callFunction: (routeInfo) => {
								routeInfo.body = { notification_ids: ['c88180380a7ae3d355ffff438500291f', 'not_valid'] };
								tools.stubs.getDesignDocView.callsArgWith(1, null, notification_objects.populated_rows);
								tools.stubs.bulkDatabase.callsArgWith(2, null);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(JSON.stringify(res.body)).to.equal('{"message":"ok","details":"archived 2 notification(s)"}');
							}
						},
						{
							itStatement: 'should an error and message - error sent through getDesignDocView stub test_id=tgekhf',
							callFunction: (routeInfo) => {
								routeInfo.body = { notification_ids: ['c88180380a7ae3d355ffff438500291f', 'not_valid'] };
								const err = {
									statusCode: 500,
									message: 'error sent from stub'
								};
								tools.stubs.getDesignDocView.callsArgWith(1, err);
								tools.stubs.bulkDatabase.callsArgWith(2, null);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(JSON.stringify(res.body)).to.equal('{"statusCode":500,"message":"error sent from stub"}');
							}
						},
						{
							itStatement: 'should return a response that no notifications were archived - 400 no ids were sent in the body test_id=ebxchk',
							callFunction: (routeInfo) => {
								routeInfo.body = {};
								tools.stubs.bulkDatabase.callsArgWith(2, null);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(400);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify({
									statusCode: 400,
									msgs: ['Expected parameter \'notification_ids\' to exist.']
								}));
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
