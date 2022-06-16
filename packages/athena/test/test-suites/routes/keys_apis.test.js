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
const keys_objects = require('../../docs/crypto_keys_objects.json');

let keys_apis;

chai.use(chaiHttp);

const createStubs = () => {
	return {
		createNewDoc: sinon.stub(tools.otcc, 'createNewDoc'),
		getDesignDocView: sinon.stub(tools.otcc, 'getDesignDocView'),
		getUuid: sinon.stub(tools.middleware, 'getUuid').returns('admin'),
		getDoc: sinon.stub(tools.otcc, 'getDoc'),
		repeatDelete: sinon.stub(tools.otcc, 'repeatDelete')
		// getUuid: sinon.stub(tools.middleware, 'getUuid').returns('abcdef')
	};
};

describe('Crypto Keys APIs', () => {
	before((done) => {
		tools.stubs = createStubs();
		tools.middleware.verify_apiKey_action_session = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_view_action_session = (req, res, next) => {
			return next();
		};
		keys_apis = require('../../../routes/keys_apis.js')(common.logger, common.ev, tools);
		this.app = common.expressApp(keys_apis);
		done();
	});
	after(() => {
		myutils.restoreStubs(tools.stubs);
	});
	const testCollection = [
		// POST /api/v1/keys
		{
			suiteDescribe: 'POST /api/v1/keys',
			mainDescribe: 'Run POST /api/v1/keys ',
			arrayOfRoutes: ['/api/v1/keys'],
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
							itStatement: 'should return a status 200 and the correct response test_id=gvkdng',
							body: keys_objects.store_doc_body_valid,
							callFunction: () => {
								tools.stubs.createNewDoc.callsArgWith(2, null, keys_objects.create_doc_valid_body);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(res.body.message).to.equal('ok');
							}
						},
						{
							itStatement: 'should return an error - no private key passed in test_id=buzgfz',
							body: keys_objects.create_doc_no_private_key,
							callFunction: () => {
								tools.stubs.createNewDoc.callsArgWith(2, null, keys_objects.create_doc_no_private_key);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.body.statusCode).to.equal(500);
								expect(res.body.msg).to.equal('the required property \'private key\' was not sent in the request');
							}
						},
						{
							itStatement: 'should return an error - error passed to create stub test_id=gggjoj',
							body: keys_objects.create_doc_valid_body,
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'problem creating key doc';
								tools.stubs.createNewDoc.callsArgWith(2, err);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.body.statusCode).to.equal(500);
								expect(res.body.msg).to.equal('problem creating key doc');
							}
						}
					]
				}
			]
		},
		// GET /api/v1/keys
		{
			suiteDescribe: 'GET /api/v1/keys',
			mainDescribe: 'Run GET /api/v1/keys ',
			arrayOfRoutes: ['/api/v1/keys'],
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
							itStatement: 'should return a status 200 and the correct response test_id=exbzqx',
							callFunction: () => {
								keys_objects.keys_valid.rows[0].value.private_key = tools.misc.encrypt('private key', 'admin');
								tools.stubs.getDesignDocView.callsArgWith(1, null, keys_objects.keys_valid);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(JSON.stringify(tools.misc.sortItOut(res.body))).to.equal(
									JSON.stringify(tools.misc.sortItOut(keys_objects.get_doc_return_object))
								);
							}
						},
						{
							itStatement: 'should return an error - error passed to getDesignDocView stub test_id=wtbruq',
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'problem getting crypto keys';
								tools.stubs.getDesignDocView.callsArgWith(1, err);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.body.statusCode).to.equal(500);
								expect(res.body.msg).to.equal('problem getting crypto keys');
							}
						}
					]
				}
			]
		},
		// PUT /api/v1/keys/:key_id
		{
			suiteDescribe: 'PUT /api/v1/keys/:key_id',
			mainDescribe: 'Run PUT /api/v1/keys/:key_id ',
			arrayOfRoutes: ['/api/v1/keys/crypto_key_id'],
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
							itStatement: 'should return a status 200 and the correct response test_id=mkxoim',
							callFunction: () => {
								tools.stubs.getDoc.callsArgWith(1, null, keys_objects.get_doc_return_object_with_uuid);
								tools.stubs.createNewDoc.callsArgWith(2, null, keys_objects.create_doc_no_private_key);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(res.body._id).to.equal('crypto_key_id');
								expect(res.body.message).to.equal('ok');
							}
						},
						{
							itStatement: 'should return an error - error passed to getDoc stub test_id=dtetpk',
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'problem getting key doc';
								tools.stubs.getDoc.callsArgWith(1, err);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.body.statusCode).to.equal(500);
								expect(res.body.msg).to.equal('problem getting key doc');
							}
						},
						{
							itStatement: 'should return an error - current user is undefined test_id=idbylr',
							callFunction: () => {
								tools.stubs.getDoc.callsArgWith(1, null, keys_objects.get_doc_return_object);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(403);
								expect(res.body.statusCode).to.equal(403);
								expect(res.body.msg).to.equal(
									'key doc undefined was not found for the current user. If it exists then it is associated with another user'
								);
							}
						},
						{
							itStatement: 'should return an error - error passed to createNewDoc stub test_id=dewjpm',
							body: keys_objects.store_doc_body_valid,
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'problem creating key doc';
								tools.stubs.getDoc.callsArgWith(1, null, keys_objects.get_doc_return_object_with_uuid);
								tools.stubs.createNewDoc.callsArgWith(2, err);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.body.statusCode).to.equal(500);
								expect(res.body.msg).to.equal('problem creating key doc');
							}
						}
					]
				}
			]
		},
		// DELETE /api/v1/keys/:key_id
		{
			suiteDescribe: 'DELETE /api/v1/keys/:key_id',
			mainDescribe: 'Run DELETE /api/v1/keys/:key_id ',
			arrayOfRoutes: ['/api/v1/keys/crypto_key_id'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.delete(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a status 200 and the correct response test_id=dcjzzo',
							callFunction: () => {
								tools.stubs.getDesignDocView.callsArgWith(1, null, keys_objects.get_doc_return_object_with_uuid);
								tools.stubs.repeatDelete.callsArgWith(2, null, keys_objects.delete_response_valid);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(res.body.name).to.equal('crypto_key_1');
							}
						},
						{
							itStatement: 'should return an error - error passed to getDoc stub test_id=pmaybv',
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'problem getting key doc';
								tools.stubs.getDesignDocView.callsArgWith(1, err);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.body.statusCode).to.equal(500);
								expect(res.body.msg).to.equal('problem getting key doc');
							}
						},
						{
							itStatement: 'should return an error - current user is undefined test_id=hrckhi',
							callFunction: () => {
								tools.stubs.getDesignDocView.callsArgWith(1, null, keys_objects.get_doc_return_object);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(403);
								expect(res.body.statusCode).to.equal(403);
								expect(res.body.msg).to.equal(
									'key doc undefined was not found for the current user. If it exists then it is associated with another user'
								);
							}
						},
						{
							itStatement: 'should return an error - error passed to createNewDoc stub test_id=aznrdj',
							body: keys_objects.store_doc_body_valid,
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'problem deleting key doc';
								tools.stubs.getDesignDocView.callsArgWith(1, null, keys_objects.get_doc_return_object_with_uuid);
								tools.stubs.repeatDelete.callsArgWith(2, err);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.body.statusCode).to.equal(500);
								expect(res.body.msg).to.equal('problem deleting key doc');
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
