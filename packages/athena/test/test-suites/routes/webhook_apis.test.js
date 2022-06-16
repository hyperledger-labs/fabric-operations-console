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
// webhook_apis.test.js - Test webhook apis
//------------------------------------------------------------
const common = require('../common-test-framework');
const chai = require('chai');
const expect = chai.expect;
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const tools = common.tools;
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);
const myutils = require('../../testing-lib/test-middleware');

let webhook_apis;
let deployer_lib;
tools.otcc = common.tools.otcc;
chai.use(chaiHttp);

const createStubs = () => {

	return {
		request: sinon.stub(tools, 'request'),
		safe_dot_nav: sinon.stub(tools.misc, 'safe_dot_nav'),
		getDoc: sinon.stub(tools.otcc, 'getDoc'),
		getDesignDocView: sinon.stub(tools.otcc, 'getDesignDocView'),
		offboard_component: sinon.stub(tools.component_lib, 'offboard_component'),
		get_code: sinon.stub(tools.ot_misc, 'get_code'),
		store_webhook_doc: sinon.stub(tools.webhook, 'store_webhook_doc'),
		uniqueRandomString: sinon.stub(tools.misc, 'uniqueRandomString').returns('test_id'),
		get_webhook_doc: sinon.stub(tools.webhook, 'get_webhook_doc'),
		writeDoc: sinon.stub(tools.otcc, 'writeDoc'),
	};
};

// order the json for a comparison
function fmt(obj) {
	return JSON.stringify(tools.misc.sortKeys(obj));
}

describe('Webhook APIs', () => {
	beforeEach((done) => {
		tools.stubs = createStubs();
		tools.middleware.verify_create_action_session = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_create_action_ak = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_delete_action_session = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_delete_action_ak = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_view_action_session = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_view_action_ak = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_notifications_action_session = (req, res, next) => {
			return next();
		};
		deployer_lib = tools.deployer;
		tools.stubs.record_deployer_operation = sinon.stub(deployer_lib, 'record_deployer_operation').callsArgWith(4, null, { prop: 'something here' });
		webhook_apis = require('../../../routes/webhook_apis.js')(common.logger, common.ev, tools);
		this.app = common.expressApp(webhook_apis);
		done();
	});
	afterEach(() => {
		myutils.restoreStubs(tools.stubs);
	});

	const testCollection = [
		// POST /api/v1/webhooks/txs - Create a Deployer Webhook Request
		{
			suiteDescribe: 'POST /api/v1/webhooks/txs',
			mainDescribe: 'Run POST /api/v1/webhooks/txs ',
			arrayOfRoutes: ['/api/v1/webhooks/txs'],
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
							itStatement: 'only test api - stub lib - return success resp - test_id=jtpqls',
							body: {
								body2send: { property1: 'property 1' }
							},
							callFunction: () => {
								tools.stubs.request.callsArgWith(1, null, { statusCode: 200 });
								tools.stubs.store_webhook_doc.callsArgWith(1, null, { tx_id: 'test_id' });
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(res.body.tx_id).to.equal('test_id');
							}
						},
						{
							itStatement: 'only test api - stub lib - return error resp - test_id=mywjwh',
							body: {
								body2send: { property1: 'property 1' }
							},
							callFunction: () => {
								tools.stubs.get_code.restore();
								tools.stubs.store_webhook_doc.callsArgWith(1, { statusCode: 409, msg: 'problem creating webhook request' }, null);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(409);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ statusCode: 409, msg: 'problem creating webhook request' }));
							}
						},
						{
							itStatement: 'test lib  - return success resp - test_id=fdwasd',
							body: {
								tx_id: 'abcd',
								description: 'hello',
								on_step: 1,
								total_steps: 99,
								athena_msg: 'this is message',
								timeout_ms: 10000
							},
							callFunction: () => {
								tools.stubs.store_webhook_doc.restore();
								tools.otcc.writeDoc = (opts, doc, cb) => {
									return cb(null, doc);
								};
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								delete res.body.ts_last_updated;
								delete res.body.ts_started;
								expect(fmt(res.body)).to.equal(
									fmt({
										'athena_messages': ['this is message'],
										'by': '-',
										'uuid': '-',
										'description': 'hello',
										'message': 'this is message',
										'on_step': 1,
										'status': 'pending',
										'total_steps': 99,
										'tx_id': 'abcd'
									})
								);
							}
						}
					]
				}
			]
		},
		// GET /api/v1/webhooks/txs/:tx_id - Get webhook status (aka get webhook doc)
		{
			suiteDescribe: 'GET /api/v1/webhooks/txs/:tx_id',
			mainDescribe: 'Run GET /api/v1/webhooks/txs/:tx_id ',
			arrayOfRoutes: ['/api/v1/webhooks/txs/test_transaction'],
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
							itStatement: 'only test api - stub lib - should return good response - test_id=adwbtf',
							callFunction: () => {
								tools.stubs.get_code.returns(200);
								tools.stubs.get_webhook = sinon.stub(tools.webhook, 'get_webhook').callsArgWith(1, null, { statusCode: 200, msg: 'ok' });
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ statusCode: 200, msg: 'ok' }));
								tools.stubs.get_webhook.restore();
							}
						},
						{
							itStatement: 'only test api - stub lib - should return an error - test_id=ufqfzw',
							callFunction: () => {
								tools.stubs.get_code.returns(500);
								tools.stubs.get_webhook = sinon.stub(tools.webhook, 'get_webhook').callsArgWith(1, { statusCode: 500, msg: 'not ok' });
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								tools.stubs.get_webhook.restore();
							}
						}
					]
				}
			]
		},
		// GET /ak/api/v1/webhooks/txs/:tx_id - Get webhook status (aka get webhook doc)
		{
			suiteDescribe: 'GET /ak/api/v1/webhooks/txs/:tx_id',
			mainDescribe: 'Run GET /ak/api/v1/webhooks/txs/:tx_id ',
			arrayOfRoutes: ['/ak/api/v1/webhooks/txs/test_transaction'],
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
							itStatement: 'only test api - stub lib - should return good response - test_id=rwcvjn',
							callFunction: () => {
								tools.stubs.get_code.returns(200);
								tools.stubs.get_webhook = sinon.stub(tools.webhook, 'get_webhook').callsArgWith(1, null, { msg: 'ok' });
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ msg: 'ok' }));
								tools.stubs.get_webhook.restore();
							}
						},
						{
							itStatement: 'only test api - stub lib - should return an error - test_id=ccrhxc',
							callFunction: () => {
								tools.stubs.get_code.returns(500);
								tools.stubs.get_webhook = sinon.stub(tools.webhook, 'get_webhook').callsArgWith(1, { statusCode: 500, msg: 'not ok' });
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ statusCode: 500, msg: 'not ok' }));
								tools.stubs.get_webhook.restore();
							}
						},
						{
							itStatement: 'test lib too - should return template webhook doc - test_id=vcqmty',
							callFunction: () => {
								tools.stubs.get_code.restore();
								tools.stubs.get_webhook_doc.restore();
								tools.stubs.getDoc.restore();
								const wh_doc = {
									status: 'success',
									sub_type: 'template',
									notes: [{ component_id: 'test' }]
								};
								tools.stubs.get_webhook_doc = sinon.stub(tools.webhook, 'get_webhook_doc').callsArgWith(1, null, wh_doc);
								tools.stubs.getDoc = sinon.stub(tools.otcc, 'getDoc').callsArgWith(1, null, {
									'_id': 'MyPeer',
									'_rev': '9-5c9e889c12a2802b20c9b6e058e9c569',
									'api_url': 'grpcs://n3a3ec3-mypeertb.ibpv2-test-cluster.us-south.containers.appdomain.cloud:7051',
									'dep_component_id': 'mypeertb',
									'display_name': 'My Peer',
									'grpcwp_url': 'https://n3a3ec3-mypeertb-proxy.ibpv2-test-cluster.us-south.containers.appdomain.cloud',
									'location': 'ibm_saas',
									'msp_id': 'org1',
									'operations_url': 'https://n3a3ec3-mypeertb.ibpv2-test-cluster.us-south.containers.appdomain.cloud:9443',
									'region': 'us-south',
									'resource_warnings': 'none',
									'resources': {},
									'type': 'peer'			// legacy name
								});
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(res.body).to.deep.equal(
									{
										'built': {
											'test': {
												'admin_certs': [],
												'api_url': 'grpcs://n3a3ec3-mypeertb.ibpv2-test-cluster.us-south.containers.appdomain.cloud:7051',
												'dep_component_id': 'mypeertb',
												'display_name': 'My Peer',
												'grpcwp_url': 'https://n3a3ec3-mypeertb-proxy.ibpv2-test-cluster.us-south.containers.appdomain.cloud',
												'id': 'MyPeer',
												'location': 'ibm_saas',
												'msp_id': 'org1',
												'operations_url': 'https://n3a3ec3-mypeertb.ibpv2-test-cluster.us-south.containers.appdomain.cloud:9443',
												'region': 'us-south',
												'resource_warnings': 'none',
												'resources': {
												},
												'scheme_version': 'v0',
												'type': 'fabric-peer'
											}
										},
										'client_webhook_url': null,
										'notes': [
											{
												'component_id': 'test'
											}
										],
										'status': 'success',
										'sub_type': 'template'
									}
								);
								tools.stubs.get_webhook_doc.restore();
								tools.stubs.getDoc.restore();
							}
						},
						// expired
						{
							itStatement: 'test lib too - should return expired template webhook doc - test_id=ssbipk',
							callFunction: () => {
								tools.stubs.get_code.restore();
								tools.stubs.get_webhook_doc.restore();
								tools.stubs.getDoc.restore();
								sinon.stub(tools.otcc, 'getDoc').onFirstCall().callsArgWith(1, null, {
									'status': 'pending',
									'ts_last_updated': 1,
								}).onSecondCall().callsArgWith(1, null, {
									'status': 'pending',
									'ts_last_updated': 1,
								}).onThirdCall().callsArgWith(1, null, {
									'_id': 'MyPeer',
									'_rev': '9-5c9e889c12a2802b20c9b6e058e9c569',
									'api_url': 'grpcs://n3a3ec3-mypeertb.ibpv2-test-cluster.us-south.containers.appdomain.cloud:7051',
									'dep_component_id': 'mypeertb',
									'display_name': 'My Peer',
									'grpcwp_url': 'https://n3a3ec3-mypeertb-proxy.ibpv2-test-cluster.us-south.containers.appdomain.cloud',
									'location': 'ibm_saas',
									'msp_id': 'org1',
									'operations_url': 'https://n3a3ec3-mypeertb.ibpv2-test-cluster.us-south.containers.appdomain.cloud:9443',
									'region': 'us-south',
									'resource_warnings': 'none',
									'resources': {},
								});
								tools.otcc.repeatWriteSafe = (opts, modify_logic, cb) => {
									const resp = modify_logic(opts.doc);
									return cb(null, resp.doc);
								};
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(typeof res.body.ts_last_updated).to.equal('number');
								expect(typeof res.body.ts_completed).to.equal('number');
								delete res.body.ts_last_updated;
								delete res.body.ts_completed;
								expect(fmt(res.body)).to.equal(
									fmt({
										'athena_messages': ['this transaction has timed out'],
										'message': 'this transaction has timed out',
										'status': 'error'
									})
								);
								tools.stubs.getDoc.restore();
							}
						},
					]
				}
			]
		},
		// GET /api/v1/webhooks - Get all webhook statuses
		{
			suiteDescribe: 'GET /api/v1/webhooks',
			mainDescribe: 'Run GET /api/v1/webhooks ',
			arrayOfRoutes: ['/api/v1/webhooks'],
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
							itStatement: 'only test api - stub lib - should return good response - test_id=whxdih',
							callFunction: () => {
								tools.stubs.get_all_webhooks = sinon.stub(tools.webhook, 'get_all_webhooks').callsArgWith(1, null, { msg: 'ok' });
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ msg: 'ok' }));
								tools.stubs.get_all_webhooks.restore();
							}
						},
						{
							itStatement: 'only test api - stub lib - should return an error - test_id=oqrndk',
							callFunction: () => {
								tools.stubs.get_code.returns(500);
								tools.stubs.get_all_webhooks = sinon.stub(tools.webhook, 'get_all_webhooks').callsArgWith(1, {
									statusCode: 500,
									msg: 'not ok'
								});
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ statusCode: 500, msg: 'not ok' }));
								tools.stubs.get_all_webhooks.restore();
							}
						}
					]
				}
			]
		},
		// GET /ak/api/v1/webhooks - Get all webhook statuses
		{
			suiteDescribe: 'GET /ak/api/v1/webhooks',
			mainDescribe: 'Run GET /ak/api/v1/webhooks ',
			arrayOfRoutes: ['/ak/api/v1/webhooks'],
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
							itStatement: 'only test api - stub lib - should return a good response - test_id=qwmncd',
							callFunction: () => {
								tools.stubs.get_all_webhooks = sinon.stub(tools.webhook, 'get_all_webhooks').callsArgWith(1, null, { msg: 'ok' });
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ msg: 'ok' }));
								tools.stubs.get_all_webhooks.restore();
							}
						},
						{
							itStatement: 'only test api - stub lib - should return an error - test_id=sqtndb',
							callFunction: () => {
								tools.stubs.get_code.returns(500);
								tools.stubs.get_all_webhooks = sinon.stub(tools.webhook, 'get_all_webhooks').callsArgWith(
									1, { statusCode: 500, msg: 'not ok' }
								);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ statusCode: 500, msg: 'not ok' }));
								tools.stubs.get_all_webhooks.restore();
							}
						}
					]
				}
			]
		},
		// GET /api/v1/webhooks/templates  - Get all template webhooks
		{
			suiteDescribe: 'GET /api/v1/webhooks/templates',
			mainDescribe: 'Run GET /api/v1/webhooks/templates ',
			arrayOfRoutes: ['/api/v1/webhooks/templates'],
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
							itStatement: 'only test api - stub lib - should return a good response - test_id=vuwwnn',
							callFunction: () => {
								tools.stubs.get_all_template_webhooks = sinon.stub(tools.webhook, 'get_all_template_webhooks').callsArgWith(
									1, null, { msg: 'ok' }
								);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ msg: 'ok' }));
								tools.stubs.get_all_template_webhooks.restore();
							}
						},
						{
							itStatement: 'only test api - stub lib - should return an error - test_id=jgtnwv',
							callFunction: () => {
								tools.stubs.get_code.returns(500);
								tools.stubs.get_all_template_webhooks = sinon.stub(tools.webhook, 'get_all_template_webhooks').callsArgWith(
									1, { statusCode: 500, msg: 'not ok' }
								);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ statusCode: 500, msg: 'not ok' }));
								tools.stubs.get_all_template_webhooks.restore();
							}
						}
					]
				}
			]
		},
		// GET /api/v1/webhooks/templates  - Get all template webhooks
		{
			suiteDescribe: 'GET /ak/api/v1/webhooks/templates',
			mainDescribe: 'Run GET /ak/api/v1/webhooks/templates ',
			arrayOfRoutes: ['/ak/api/v1/webhooks/templates'],
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
							itStatement: 'only test api - stub lib - should return a good response - test_id=ggewgs',
							callFunction: () => {
								tools.stubs.get_all_template_webhooks = sinon.stub(tools.webhook, 'get_all_template_webhooks').callsArgWith(
									1, null, { msg: 'ok' }
								);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ msg: 'ok' }));
								tools.stubs.get_all_template_webhooks.restore();
							}
						},
						{
							itStatement: 'only test api - stub lib - should return an error - test_id=seqrfw',
							callFunction: () => {
								tools.stubs.get_code.returns(500);
								tools.stubs.get_all_template_webhooks = sinon.stub(tools.webhook, 'get_all_template_webhooks').callsArgWith(
									1, { statusCode: 500, msg: 'not ok' }
								);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ statusCode: 500, msg: 'not ok' }));
								tools.stubs.get_all_template_webhooks.restore();
							}
						}
					]
				}
			]
		},
		// PUT  /api/v1/webhooks/txs/:tx_id - Update webhook status (aka set webhook status)
		{
			suiteDescribe: 'PUT /api/v1/webhooks/txs/:tx_id',
			mainDescribe: 'Run PUT /api/v1/webhooks/txs/:tx_id ',
			arrayOfRoutes: ['/api/v1/webhooks/txs/test_transaction1'],
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
					arrayOfInfoToTest: [
						{
							itStatement: 'only test api - stub lib - should return a good response - test_id=cjznps',
							callFunction: () => {
								tools.stubs.get_code.returns(200);
								tools.stubs.edit_webhook = sinon.stub(tools.webhook, 'edit_webhook').callsArgWith(2, null);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'message': 'ok', 'tx_id': 'test_transaction1' }));
								tools.stubs.edit_webhook.restore();
							}
						},
						{
							itStatement: 'only test api - stub lib - should return an error - test_id=emurmx',
							callFunction: () => {
								tools.stubs.get_code.returns(500);
								tools.stubs.edit_webhook = sinon.stub(tools.webhook, 'edit_webhook').callsArgWith(2, { statusCode: 500, msg: 'not ok' });
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ statusCode: 500, msg: 'not ok' }));
								tools.stubs.edit_webhook.restore();
							}
						},
						{
							itStatement: 'test lib - return success resp - test_id=wefwss',
							body: {
								tx_id: 'abcd',
								status: 'pending',
								on_step: 5,
								total_steps: 99,
								athena_msg: 'this is message 2',
								timeout_ms: 123456
							},
							callFunction: () => {
								tools.stubs.getDoc.restore();
								tools.stubs.store_webhook_doc.restore();
								tools.stubs.getDoc = sinon.stub(tools.otcc, 'getDoc').callsArgWith(1, null, {});
								tools.otcc.repeatWriteSafe = (opts, modify_logic, cb) => {
									const resp = modify_logic(opts.doc);
									return cb(null, resp.doc);
								};
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								delete res.body.ts_last_updated;
								delete res.body.ts_started;
								expect(fmt(res.body)).to.equal(fmt({ 'message': 'ok', 'tx_id': 'test_transaction1' }));
							}
						},
						{
							itStatement: 'test lib - invalid status - return error resp - test_id=wipsbp',
							body: {
								tx_id: 'abcd',
								status: 'not going to work',
								on_step: 5,
								total_steps: 99,
								athena_msg: 'this is message 2',
								timeout_ms: 123456
							},
							callFunction: () => {
								tools.stubs.get_code.restore();
								tools.stubs.getDoc.restore();
								tools.stubs.store_webhook_doc.restore();
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(400);
								expect(fmt(res.body)).to.equal(
									fmt({
										'error': 'not a valid value for status: "not going to work"',
										'statusCode': 400,
										'valid': ['pending', 'error', 'success', 'undoing']
									})
								);
							}
						},
						{
							itStatement: 'test lib - missing message - return success resp - test_id=aipaba',
							body: {
								tx_id: 'abcd',
								status: 'error',
								on_step: 5,
							},
							callFunction: () => {
								tools.stubs.get_code.restore();
								tools.stubs.getDoc.restore();
								tools.stubs.store_webhook_doc.restore();
								tools.stubs.getDoc = sinon.stub(tools.otcc, 'getDoc').callsArgWith(1, null, {});
								tools.otcc.repeatWriteSafe = (opts, modify_logic, cb) => {
									const resp = modify_logic(opts.doc);
									return cb(null, resp.doc);
								};
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(fmt(res.body)).to.equal(fmt({ 'message': 'ok', 'tx_id': 'test_transaction1' }));
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
