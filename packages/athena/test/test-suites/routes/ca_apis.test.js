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
// ca_apis.test.js - Test ca_apis
//------------------------------------------------------------
const common = require('../common-test-framework');
const chai = require('chai');
const expect = chai.expect;
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const tools = common.tools;
const fabric_objects = require('../../docs/ca_objects.json');
const fabric_ca_client_object = JSON.parse(JSON.stringify(fabric_objects.fabricCAClient));
const fabric_ca_client_with_enroll_id_to_delete = JSON.parse(JSON.stringify(fabric_objects.fabricCAClient));
fabric_ca_client_with_enroll_id_to_delete.enroll_id_to_delete = 'delete_me';
tools.misc = require('../../../libs/misc.js')(common.logger, common.tools);
tools.ca_lib = require('../../../libs/ca_lib.js')(common.logger, common.ev, tools);
const myutils = require('../../testing-lib/test-middleware');
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);

let ca_apis;

chai.use(chaiHttp);

const createStubs = () => {
	return {
		commonFabricCASetup: sinon.stub(tools.ca_lib, 'commonFabricCASetup'),
		getUsers: sinon.stub(tools.ca_lib, 'getUsers'),
		registerUser: sinon.stub(tools.ca_lib, 'registerUser'),
		getAffiliations: sinon.stub(tools.ca_lib, 'getAffiliations'),
		deleteCAIdentity: sinon.stub(tools.ca_lib, 'deleteCAIdentity'),
		toBytes: sinon.stub(tools.ca_lib, 'toBytes').returns('~enrollment~pvtkey'),
		getUuid: sinon.stub(tools.middleware, 'getUuid').returns('abcdef'),
		getEnrollIdFromCert: sinon.stub(tools.misc, 'getEnrollIdFromCert').returns('admin'),
		reenrollUser: sinon.stub(tools.ca_lib, 'reenrollUser')
	};
};

describe('CA APIs', () => {
	before((done) => {
		tools.stubs = createStubs();
		tools.middleware.verify_view_action_ak = function (req, res, next) {
			return next();
		};
		tools.middleware.verify_view_action_session = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_manage_action_ak = function (req, res, next) {
			return next();
		};
		tools.middleware.verify_manage_action_session = (req, res, next) => {
			return next();
		};
		ca_apis = require('../../../routes/ca_apis.js')(common.logger, common.ev, tools);
		this.app = common.expressApp(ca_apis);
		done();
	});
	after(() => {
		myutils.restoreStubs(tools.stubs);
	});
	const testCollection = [
		// POST /api/v1/cas/users/get
		{
			suiteDescribe: 'POST /api/v1/cas/users/get',
			mainDescribe: 'Run POST /api/v1/cas/users/get ',
			arrayOfRoutes: ['/api/v1/cas/users/get'],
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
							itStatement: 'should return a status of 200 and get all users for the current identity test_id=fasbga',
							body: fabric_objects.fabricCAClient,
							callFunction: () => {
								tools.stubs.commonFabricCASetup.callsArgWith(1, null, fabric_objects.fabricCAClient);
								tools.stubs.getUsers.callsArgWith(1, null, fabric_objects.get_users_resp);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify(fabric_objects.get_users_resp.result.identities));
							}
						},
						{
							itStatement: 'should return a status of 500 and an error message - error passed through commonFabricCASetup stub test_id=xepruh',
							body: fabric_objects.fabricCAClient,
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'error getting users';
								tools.stubs.commonFabricCASetup.callsArgWith(1, err);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(JSON.stringify(res.body.msg)).to.equal('"error getting users"');
							}
						},
						{
							itStatement: 'should return a status of 500 and an error message - error passed through getUsers stub test_id=ezerkn',
							body: fabric_objects.fabricCAClient,
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'error getting users';
								tools.stubs.commonFabricCASetup.callsArgWith(1, null, fabric_objects.fabricCAClient);
								tools.stubs.getUsers.callsArgWith(1, err);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(JSON.stringify(res.body.msg)).to.equal('"error getting users"');
							}
						},
						{
							itStatement: 'should return a status of 200 and get all users for the current identity - testing for no enroll id test_id=rvpztj',
							body: fabric_ca_client_object,
							callFunction: () => {
								delete fabric_ca_client_object.enroll_id;
								fabric_ca_client_object.certificate = 'cert';
								fabric_ca_client_object.private_key = 'pk';
								tools.stubs.commonFabricCASetup.callsArgWith(1, null, fabric_objects.fabricCAClient);
								tools.stubs.getUsers.callsArgWith(1, null, fabric_objects.get_users_resp);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify(fabric_objects.get_users_resp.result.identities));
								delete fabric_ca_client_object.certificate;
								delete fabric_ca_client_object.private_key;
								fabric_ca_client_object.enroll_id = fabric_objects.fabricCAClient.enroll_id;
							}
						},
						{
							itStatement: 'should return 200 and get all users for the current identity - testing for no enroll secret, no cert test_id=kbgiwf',
							body: fabric_ca_client_object,
							callFunction: () => {
								delete fabric_ca_client_object.enroll_secret;
								fabric_ca_client_object.private_key = 'pk';
								tools.stubs.commonFabricCASetup.callsArgWith(1, null, fabric_objects.fabricCAClient);
								tools.stubs.getUsers.callsArgWith(1, null, fabric_objects.get_users_resp);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(400);
								expect(res.body.msg).to.equal('missing part or all of the enroll credentials or the certificate');
								delete fabric_ca_client_object.private_key;
								fabric_ca_client_object.enroll_id = fabric_objects.fabricCAClient.enroll_secret;
							}
						},
						{
							itStatement: 'should return a 200 and get all users - testing no enroll secret or private key test_id=ttfsef',
							body: fabric_ca_client_object,
							callFunction: () => {
								delete fabric_ca_client_object.enroll_secret;
								fabric_ca_client_object.certificate = 'cert';
								tools.stubs.commonFabricCASetup.callsArgWith(1, null, fabric_objects.fabricCAClient);
								tools.stubs.getUsers.callsArgWith(1, null, fabric_objects.get_users_resp);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(400);
								expect(res.body.msg).to.equal(' and the private_key');
								delete fabric_ca_client_object.certificate;
								fabric_ca_client_object.enroll_id = fabric_objects.fabricCAClient.enroll_secret;
							}
						},
						{
							itStatement: 'should return a status of 200 and get all users - testing for no enroll secret or private key test_id=nzrmpu',
							body: fabric_ca_client_object,
							callFunction: () => {
								delete fabric_ca_client_object.enroll_secret;
								fabric_ca_client_object.certificate = 'cert';
								fabric_ca_client_object.private_key = 'pk';
								tools.stubs.commonFabricCASetup.callsArgWith(1, null, fabric_objects.fabricCAClient);
								tools.stubs.getUsers.callsArgWith(1, null, fabric_objects.get_users_resp);
								tools.stubs.getEnrollIdFromCert.returns(null);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(400);
								expect(res.body.msg).to.equal('passed certificate was invalid');
								delete fabric_ca_client_object.certificate;
								fabric_ca_client_object.enroll_id = fabric_objects.fabricCAClient.enroll_secret;
								tools.stubs.getEnrollIdFromCert.returns('admin');
							}
						}
					]
				}
			]
		},
		// POST /api/v1/cas/users/register
		{
			suiteDescribe: 'POST /api/v1/cas/users/register',
			mainDescribe: 'Run POST /api/v1/cas/users/register',
			arrayOfRoutes: ['/api/v1/cas/users/register'],
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
							itStatement: 'should return a status of 200 and register a new identity test_id=geurgm',
							body: fabric_objects.fabricCAClient,
							username: 'admin',
							password: 'random',
							callFunction: () => {
								tools.stubs.commonFabricCASetup.callsArgWith(1, null, fabric_objects.fabricCAClient);
								tools.stubs.registerUser.callsArgWith(2, null, 'user-secret');
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(res.text).to.equal('"user-secret"');
							}
						},
						{
							itStatement: 'should return a status of 500 and an error message - error passed through commonFabricCASetup stub test_id=rmdfxh',
							body: fabric_objects.fabricCAClient,
							username: 'admin',
							password: 'random',
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'error registering an identity';
								tools.stubs.commonFabricCASetup.callsArgWith(1, err);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(JSON.stringify(res.body.msg)).to.equal('"error registering an identity"');
							}
						},
						{
							itStatement: 'should return a status of 500 and an error message - error passed through registerUser stub test_id=msxnec',
							body: fabric_objects.fabricCAClient,
							username: 'admin',
							password: 'random',
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'error registering an identity';
								tools.stubs.commonFabricCASetup.callsArgWith(1, null, fabric_objects.fabricCAClient);
								tools.stubs.registerUser.callsArgWith(2, err);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(JSON.stringify(res.body.msg)).to.equal('{"statusCode":500,"msg":"error registering an identity"}');
							}
						},
						{
							itStatement: 'should return a status of 400 - testing for no enroll id test_id=mhspum',
							body: fabric_ca_client_object,
							username: 'admin',
							password: 'random',
							callFunction: () => {
								delete fabric_ca_client_object.enroll_id;
								fabric_ca_client_object.certificate = 'cert';
								fabric_ca_client_object.private_key = 'pk';
								tools.stubs.commonFabricCASetup.callsArgWith(1, null, fabric_objects.fabricCAClient);
								tools.stubs.getUsers.callsArgWith(1, null, fabric_objects.get_users_resp);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								delete fabric_ca_client_object.certificate;
								delete fabric_ca_client_object.private_key;
								fabric_ca_client_object.enroll_id = fabric_objects.fabricCAClient.enroll_id;
							}
						}
					]
				}
			]
		},
		// POST /api/v1/cas/users/affiliations/get
		{
			suiteDescribe: 'POST /api/v1/cas/users/affiliations/get',
			mainDescribe: 'Run POST /api/v1/cas/users/affiliations/get',
			arrayOfRoutes: ['/api/v1/cas/users/affiliations/get'],
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
							itStatement: 'should return a status of 200 and get all affiliations for the calling identity test_id=cyzmot',
							body: fabric_objects.fabricCAClient,
							callFunction: () => {
								tools.stubs.commonFabricCASetup.callsArgWith(1, null, fabric_objects.fabricCAClient);
								tools.stubs.getAffiliations.callsArgWith(1, null, fabric_objects.resp_affiliations);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify(fabric_objects.resp_affiliations.result.affiliations));
							}
						},
						{
							itStatement: 'should return a status of 500 and an error message - error passed through commonFabricCASetup stub test_id=rssnfw',
							body: fabric_objects.fabricCAClient,
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'error getting affiliations';
								tools.stubs.commonFabricCASetup.callsArgWith(1, err);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(JSON.stringify(res.body.msg)).to.equal('"error getting affiliations"');
							}
						},
						{
							itStatement: 'should return a status of 500 and an error message - error passed through getAffiliations stub test_id=porhhs',
							body: fabric_objects.fabricCAClient,
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'error getting affiliations';
								tools.stubs.commonFabricCASetup.callsArgWith(1, null, fabric_objects.fabricCAClient);
								tools.stubs.getAffiliations.callsArgWith(1, err);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(JSON.stringify(res.body.msg)).to.equal('"error getting affiliations"');
							}
						},
						{
							itStatement: 'should return a status of 400 - testing for no enroll id test_id=kudcpp',
							body: fabric_ca_client_object,
							callFunction: () => {
								delete fabric_ca_client_object.enroll_id;
								fabric_ca_client_object.certificate = 'cert';
								fabric_ca_client_object.private_key = 'pk';
								tools.stubs.commonFabricCASetup.callsArgWith(1, null, fabric_objects.fabricCAClient);
								tools.stubs.getUsers.callsArgWith(1, null, fabric_objects.get_users_resp);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								delete fabric_ca_client_object.certificate;
								delete fabric_ca_client_object.private_key;
								fabric_ca_client_object.enroll_id = fabric_objects.fabricCAClient.enroll_id;
							}
						}
					]
				}
			]
		},
		// POST /api/v1/cas/cert/get
		{
			suiteDescribe: 'POST /api/v1/cas/cert/get',
			mainDescribe: 'Run POST /api/v1/cas/cert/get ',
			arrayOfRoutes: ['/api/v1/cas/cert/get'],
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
							itStatement: 'should return a status of 200 and return the certs test_id=advtpv',
							callFunction: () => {
								tools.stubs.commonFabricCASetup.callsArgWith(1, null, fabric_objects.fabricCAClient);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify(fabric_objects.resp_certs));
							}
						},
						{
							itStatement: 'should return a status of 500 and an error message - error passed through commonFabricCASetup stub test_id=oceqtv',
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'error getting certs';
								tools.stubs.commonFabricCASetup.callsArgWith(1, err);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(JSON.stringify(res.body.msg)).to.equal('"error getting certs"');
							}
						},
						{
							itStatement: 'should return a status of 200 - testing for no enroll id test_id=idqhgi',
							body: fabric_ca_client_object,
							callFunction: () => {
								delete fabric_ca_client_object.enroll_id;
								fabric_ca_client_object.certificate = 'cert';
								fabric_ca_client_object.private_key = 'pk';
								tools.stubs.commonFabricCASetup.callsArgWith(1, null, fabric_objects.fabricCAClient);
								tools.stubs.getUsers.callsArgWith(1, null, fabric_objects.get_users_resp);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								delete fabric_ca_client_object.certificate;
								delete fabric_ca_client_object.private_key;
								fabric_ca_client_object.enroll_id = fabric_objects.fabricCAClient.enroll_id;
							}
						}
					]
				}
			]
		},
		// POST /api/v1/cas/users/delete
		{
			suiteDescribe: 'POST /api/v1/cas/users/delete',
			mainDescribe: 'Run POST /api/v1/cas/users/delete ',
			arrayOfRoutes: ['/api/v1/cas/users/delete'],
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
							itStatement: 'should return a status of 200 and delete the identity passed in test_id=jtbeny',
							body: fabric_ca_client_with_enroll_id_to_delete,
							callFunction: () => {
								tools.ca_lib.commonFabricCASetup.callsArgWith(1, null, fabric_objects.fabricCAClient);
								tools.ca_lib.deleteCAIdentity.callsArgWith(2, null, 'successfully deleted the ID user2');
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(res.text).to.equal('"successfully deleted the ID user2"');
							}
						},
						{
							itStatement: 'should return a status of 200 and delete the identity passed in - no censor id test_id=lyhbuk',
							body: fabric_objects.fabricCAClient,
							callFunction: () => {
								tools.ca_lib.commonFabricCASetup.callsArgWith(1, null, fabric_objects.fabricCAClient);
								tools.ca_lib.deleteCAIdentity.callsArgWith(2, null, 'successfully deleted the ID user2');
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(res.text).to.equal('"successfully deleted the ID user2"');
							}
						},
						{
							itStatement: 'should return a status of 500 and an error message - error passed through commonFabricCASetup stub test_id=thhore',
							body: fabric_objects.fabricCAClient,
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'error deleting identity';
								tools.stubs.commonFabricCASetup.callsArgWith(1, err);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(JSON.stringify(res.body.msg)).to.equal('"error deleting identity"');
							}
						},
						{
							itStatement: 'should return a status of 500 and an error message - error passed through deleteCAIdentity stub test_id=auuznm',
							body: fabric_objects.fabricCAClient,
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'error deleting identity';
								tools.stubs.commonFabricCASetup.callsArgWith(1, null, fabric_objects.fabricCAClient);
								tools.stubs.deleteCAIdentity.callsArgWith(2, err);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(JSON.stringify(res.body.msg)).to.equal('"error deleting identity"');
							}
						},
						{
							itStatement: 'should return a status of 400 - testing for no enroll id test_id=xtqmxe',
							body: fabric_ca_client_object,
							callFunction: () => {
								delete fabric_ca_client_object.enroll_id;
								fabric_ca_client_object.certificate = 'cert';
								fabric_ca_client_object.private_key = 'pk';
								tools.stubs.commonFabricCASetup.callsArgWith(1, null, fabric_objects.fabricCAClient);
								tools.stubs.getUsers.callsArgWith(1, null, fabric_objects.get_users_resp);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								delete fabric_ca_client_object.certificate;
								delete fabric_ca_client_object.private_key;
								fabric_ca_client_object.enroll_id = fabric_objects.fabricCAClient.enroll_id;
							}
						},
						{
							itStatement: 'should return a status of 200 perform delete - testing for no enroll secret or private key test_id=oygmmi',
							body: fabric_ca_client_object,
							callFunction: () => {
								delete fabric_ca_client_object.enroll_secret;
								fabric_ca_client_object.certificate = 'cert';
								fabric_ca_client_object.private_key = 'pk';
								tools.stubs.commonFabricCASetup.callsArgWith(1, null, fabric_objects.fabricCAClient);
								tools.stubs.getUsers.callsArgWith(1, null, fabric_objects.get_users_resp);
								tools.stubs.getEnrollIdFromCert.returns(null);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(400);
								expect(res.body.msg).to.equal('passed certificate was invalid');
								delete fabric_ca_client_object.certificate;
								fabric_ca_client_object.enroll_id = fabric_objects.fabricCAClient.enroll_secret;
								tools.stubs.getEnrollIdFromCert.returns('admin');
							}
						}
					]
				}
			]
		},
		// POST /api/v1/cas/users/reenroll
		{
			suiteDescribe: 'POST /api/v1/cas/users/reenroll',
			mainDescribe: 'Run POST /api/v1/cas/users/reenroll ',
			arrayOfRoutes: ['/api/v1/cas/users/reenroll'],
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
							itStatement: 'should return a status of 200 and the re-enroll return object test_id=iljeof',
							body: fabric_objects.reenroll_body,
							callFunction: () => {
								tools.stubs.commonFabricCASetup.callsArgWith(1, null, fabric_objects.fabricCAClient);
								tools.stubs.reenrollUser.callsArgWith(1, null, fabric_objects.reenroll_response);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify(fabric_objects.reenroll_return_object));
							}
						},
						{
							itStatement: 'should return a status of 500 and display an error - error passed to reenrollUser function test_id=wztxtf',
							body: fabric_objects.reenroll_body,
							callFunction: () => {
								fabric_objects.reenroll_body.enroll_id = 'admin';
								const err = {};
								err.statusCode = 500;
								err.msg = 'error re-enrolling user';
								tools.stubs.commonFabricCASetup.callsArgWith(1, null, fabric_objects.fabricCAClient);
								tools.stubs.reenrollUser.callsArgWith(1, err);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.body.msg).to.equal('error re-enrolling user');
								delete fabric_objects.reenroll_body.enroll_id;
							}
						},
						{
							itStatement: 'should return a status of 500 and display an error - error passed to commonFabricSetup function test_id=gthjej',
							body: fabric_objects.reenroll_body,
							callFunction: () => {
								fabric_objects.reenroll_body.enroll_id = 'admin';
								const err = {};
								err.statusCode = 500;
								err.msg = 'error re-enrolling user';
								tools.stubs.commonFabricCASetup.callsArgWith(1, err);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.body.msg).to.equal('error re-enrolling user');
								delete fabric_objects.reenroll_body.enroll_id;
							}
						},
						{
							itStatement: 'should return a status of 200 and perform re-enroll - testing for no enroll secret or private keyu test_id=jfcpjw',
							body: fabric_ca_client_object,
							callFunction: () => {
								delete fabric_ca_client_object.enroll_secret;
								fabric_ca_client_object.certificate = 'cert';
								fabric_ca_client_object.private_key = 'pk';
								tools.stubs.commonFabricCASetup.callsArgWith(1, null, fabric_objects.fabricCAClient);
								tools.stubs.getUsers.callsArgWith(1, null, fabric_objects.get_users_resp);
								tools.stubs.getEnrollIdFromCert.returns(null);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(400);
								expect(res.body.msg).to.equal('passed certificate was invalid');
								delete fabric_ca_client_object.certificate;
								fabric_ca_client_object.enroll_id = fabric_objects.fabricCAClient.enroll_secret;
								tools.stubs.getEnrollIdFromCert.returns('admin');
							}
						}
					]
				}
			]
		},
	];
	// call main test function to run this test collection
	common.mainTestFunction(testCollection, path_to_current_file);
});
