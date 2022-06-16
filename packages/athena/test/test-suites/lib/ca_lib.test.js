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
// ca_lib.test.js - test for the ca lib
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const ca_objects = require('../../docs/ca_objects.json');
const tools = common.tools;
tools.enroll_lib = require('../../../libs/fabric_ca_services/enroll_lib.js')(common.logger, common.ev, common.tools);
tools.signing_lib = require('../../../libs/fabric_ca_services/signing_lib.js')(common.logger, common.ev, common.tools);
tools.fabric_utils = require('../../../libs/fabric_ca_services/fabric_utils.js')(common.logger, common.ev, common.tools);
tools.key_lib = require('../../../libs/fabric_ca_services/key_lib.js')(common.logger, common.ev, common.tools);
const myutils = require('../../testing-lib/test-middleware');
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);

let ca_lib;

const opts = {
	ca_url: 'https://nb040a579035e462496dcb3651c784394-org1-ca.us01.blockchain.ibm.com:31011',
	ca_name: 'org1CA',				//'org1CA',
	ca_tls_opts: {
		pem: null
	},
	enroll_id: 'admin',				//'admin',
	enroll_secret: 'secret',		//'secret',
	method: 'POST'
};

tools.ECDSA = function () {
	this.setPublicKeyHex = () => { return true; };
};

tools.asn1.csr.CSRUtil.newCSRPEM = () => {
	return {
		subject: 'subject',
		sbjpubkey: 'sbjpubkey',
		sigalg: 'SHA256withECDSA',
		sbjprvkey: ca_objects.key_pair
	};
};

const failed_msg = 'Failed to add identity: Registration of \'user6\' failed: Identity \'user6\' is already registered';

const createStubs = () => {
	return {
		enroll: sinon.stub(tools.enroll_lib, 'enroll'),
		generateAuthToken: sinon.stub(tools.fabric_utils, 'generateAuthToken').returns('valid-token'),
		request: sinon.stub(tools, 'request'),
		generateKey: sinon.stub(tools.key_lib, 'generateKey'),
		toBytes: sinon.stub(tools.key_lib, 'toBytes').returns('12345')
	};
};

describe('node.js', () => {
	before(() => {
		tools.stubs = createStubs();
		ca_lib = require('../../../libs/ca_lib.js')(common.logger, common.ev, tools);
	});
	after(() => {
		myutils.restoreStubs(tools.stubs);
	});
	const testCollection = [
		// commonFabricCASetup
		{
			suiteDescribe: 'commonFabricCASetup',
			mainDescribe: 'Run commonFabricCASetup',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the expected fabricCAClient object for the enroll response passed in test_id=nkwawa',
							callFunction: () => {
								tools.stubs.enroll.callsArgWith(1, null, ca_objects.enroll_resp);
							},
							expectBlock: (done) => {
								ca_lib.commonFabricCASetup(opts, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(ca_objects.common_setup_return));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - error thrown by createFabricCAClient stub test_id=cxgxnw',
							callFunction: () => {
								tools.fabric_utils.createFabricCAClient = sinon.stub(tools.fabric_utils, 'createFabricCAClient').throws();
							},
							expectBlock: (done) => {
								ca_lib.commonFabricCASetup(opts, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(JSON.stringify(err.msg)).to.equal(JSON.stringify({}));
									expect(resp).to.equal(undefined);
									tools.fabric_utils.createFabricCAClient.restore();
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - error passed to enroll stub test_id=jbrtpl',
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'problem enrolling identity';
								tools.stubs.enroll.callsArgWith(1, err);
							},
							expectBlock: (done) => {
								ca_lib.commonFabricCASetup(opts, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('problem enrolling identity');
									expect(err.backend_context).to.equal('problem with "enrollCA" function of the "commonFabricCASetup" function');
									expect(resp).to.equal(undefined);
									done();
								});
							}
						}
					]
				}
			]
		},
		// getUsers
		{
			suiteDescribe: 'getUsers',
			mainDescribe: 'Run getUsers',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the correct get_users_resp object when the stub returns a valid getUsers response test_id=mlbpqe',
							callFunction: () => {
								tools.stubs.request.callsArgWith(1, null, ca_objects.request_resp_get_users);
							},
							expectBlock: (done) => {
								ca_lib.getUsers(ca_objects.fabricCAClient, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(ca_objects.get_users_resp));
									done();
								});
							}
						},
						{
							itStatement: 'should return the correct get_users_resp when the stub returns a valid response - body is array test_id=vexwsr',
							callFunction: () => {
								tools.stubs.request.callsArgWith(1, null, ca_objects.request_resp_get_users_body_is_array);
							},
							expectBlock: (done) => {
								ca_lib.getUsers(ca_objects.fabricCAClient, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(ca_objects.get_users_resp));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - passed error through the request for getUsers in the response test_id=uvtuxu',
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.body = 'problem getting users';
								tools.stubs.request.callsArgWith(1, null, err);
							},
							expectBlock: (done) => {
								ca_lib.getUsers(ca_objects.fabricCAClient, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('problem getting users');
									expect(resp).to.equal(undefined);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - passed error without body through the request for getUsers in the response test_id=ivqafo',
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								tools.stubs.request.callsArgWith(1, null, err);
							},
							expectBlock: (done) => {
								ca_lib.getUsers(ca_objects.fabricCAClient, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal(undefined);
									expect(resp).to.equal(undefined);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - passed error through the request for getUsers test_id=hktszx',
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'problem getting users';
								tools.stubs.request.callsArgWith(1, err);
							},
							expectBlock: (done) => {
								ca_lib.getUsers(ca_objects.fabricCAClient, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('problem getting users');
									expect(resp).to.equal(undefined);
									done();
								});
							}
						},
						{
							itStatement: 'should return the error - no body in getUsers response test_id=ikrytd',
							callFunction: () => {
								const resp_copy = JSON.parse(JSON.stringify(ca_objects.request_resp_get_users));
								delete resp_copy.body;
								tools.stubs.request.callsArgWith(1, null, resp_copy);
							},
							expectBlock: (done) => {
								ca_lib.getUsers(ca_objects.fabricCAClient, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('problem getting all identities');
									done();
								});
							}
						}
					]
				}
			]
		},
		// registerUser
		{
			suiteDescribe: 'registerUser',
			mainDescribe: 'Run registerUser',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the correct get_users_resp object when the stub returns a valid registerUser response test_id=cifmon',
							callFunction: () => {
								tools.stubs.request.callsArgWith(1, null, ca_objects.request_resp_register_identity);
							},
							expectBlock: (done) => {
								ca_lib.registerUser(ca_objects.fabricCAClient, 'user6', (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(ca_objects.register_identity_resp));
									done();
								});
							}
						},
						{
							itStatement: 'should return the correct get_users_resp when the stub returns a valid registerUser - body is array test_id=ccxmfn',
							callFunction: () => {
								tools.stubs.request.callsArgWith(1, null, ca_objects.request_resp_register_identity_body_is_array);
							},
							expectBlock: (done) => {
								ca_lib.registerUser(ca_objects.fabricCAClient, 'user6', (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(ca_objects.register_identity_resp));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - passed error through the request for registerUser test_id=eflkbx',
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'problem registering identity';
								tools.stubs.request.callsArgWith(1, err);
							},
							expectBlock: (done) => {
								ca_lib.registerUser(ca_objects.fabricCAClient, 'user6', (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('problem registering identity');
									expect(resp).to.equal(undefined);
									done();
								});
							}
						},
						{
							itStatement: 'should return the error - no body in registerUsers response test_id=cheuvn',
							callFunction: () => {
								const resp_copy = JSON.parse(JSON.stringify(ca_objects.request_resp_register_identity));
								delete resp_copy.body;
								tools.stubs.request.callsArgWith(1, null, resp_copy);
							},
							expectBlock: (done) => {
								ca_lib.registerUser(ca_objects.fabricCAClient, 'user6', (err) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('problem enrolling identity');
									done();
								});
							}
						},
						{
							itStatement: 'should return the error - no body in registerUsers response test_id=aozfru',
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'problem registering user';
								tools.stubs.request.callsArgWith(1, err);
							},
							expectBlock: (done) => {
								ca_lib.getUsers(ca_objects.fabricCAClient, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('problem registering user');
									expect(resp).to.equal(undefined);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - body passed in through request for registerUser has an error test_id=hmkpns',
							callFunction: () => {
								tools.stubs.request.callsArgWith(1, null, ca_objects.request_resp_register_identity_body_with_errors);
							},
							expectBlock: (done) => {
								ca_lib.registerUser(ca_objects.fabricCAClient, 'user6', (err, resp) => {
									expect(JSON.stringify(err)).to.equal(
										JSON.stringify({
											'parsed': 'Error: fabric-ca request identities failed with errors code:52message:' + failed_msg,
											'raw': {}
										})
									);
									expect(resp).to.equal(null);
									done();
								});
							}
						},
						{
							itStatement: 'should return error - body passed in through request for registerUser has status code less than 400 test_id=eoptfr',
							callFunction: () => {
								const obj_copy = JSON.parse(JSON.stringify(ca_objects.request_resp_register_identity_body_with_errors));
								obj_copy.body = JSON.parse(obj_copy.body);
								obj_copy.statusCode = 400;
								obj_copy.body.statusCode = 400;
								tools.stubs.request.callsArgWith(1, null, obj_copy);
							},
							expectBlock: (done) => {
								ca_lib.registerUser(ca_objects.fabricCAClient, 'user6', (err, resp) => {
									expect(JSON.stringify(err)).to.equal(
										JSON.stringify({
											'statusCode': 400,
											'msg': {
												'result': '',
												'errors': [{ 'code': 52, 'message': failed_msg }],
												'messages': [],
												'success': false,
												'statusCode': 400
											}
										})
									);
									expect(resp).to.equal(undefined);
									done();
								});
							}
						}
					]
				}
			]
		},
		// getAffiliations
		{
			suiteDescribe: 'getAffiliations',
			mainDescribe: 'Run getAffiliations',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the correct get_users_resp when the stub returns a valid getAffiliations test_id=wqvraj',
							callFunction: () => {
								tools.stubs.request.callsArgWith(1, null, ca_objects.request_resp_get_affiliations);
							},
							expectBlock: (done) => {
								ca_lib.getAffiliations(ca_objects.fabricCAClient, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(ca_objects.get_affiliations_resp));
									done();
								});
							}
						},
						{
							itStatement: 'should return the correct get_users_resp when the stub returns a valid getAffiliations - test_id=neoqnc',
							callFunction: () => {
								tools.stubs.request.callsArgWith(1, null, ca_objects.request_resp_get_affiliations_body_is_array);
							},
							expectBlock: (done) => {
								ca_lib.getAffiliations(ca_objects.fabricCAClient, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(ca_objects.get_affiliations_resp));
									done();
								});
							}
						},
						{
							itStatement: 'should return the error - no body in getAffiliations response test_id=mmxiza',
							callFunction: () => {
								const resp_copy = JSON.parse(JSON.stringify(ca_objects.request_resp_get_affiliations));
								delete resp_copy.body;
								tools.stubs.request.callsArgWith(1, null, resp_copy);
							},
							expectBlock: (done) => {
								ca_lib.getAffiliations(ca_objects.fabricCAClient, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('problem getting affiliations');
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - passed error through the request for getAffiliations test_id=yawitp',
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'problem getting affiliations';
								tools.stubs.request.callsArgWith(1, err);
							},
							expectBlock: (done) => {
								ca_lib.getAffiliations(ca_objects.fabricCAClient, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('problem getting affiliations');
									expect(resp).to.equal(undefined);
									done();
								});
							}
						}
					]
				}
			]
		},
		// reenrollUser
		{
			suiteDescribe: 'reenrollUser',
			mainDescribe: 'Run reenrollUser',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the correct the response test_id=hswrvg',
							callFunction: () => {
								tools.stubs.generateKey.callsArgWith(0, null, ca_objects.key_pair);
								tools.stubs.request.callsArgWith(1, null, ca_objects.request_resp_register_identity);
							},
							expectBlock: (done) => {
								ca_lib.reenrollUser(ca_objects.fabricCAClient, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(ca_objects.reenroll_resp));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - passed error through the generateKey stub test_id=mknnpg',
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'problem registering identity';
								tools.stubs.generateKey.callsArgWith(0, err);
							},
							expectBlock: (done) => {
								ca_lib.reenrollUser(ca_objects.fabricCAClient, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('problem generating key pair [object Object]');
									expect(resp).to.equal(undefined);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - passed error through the request for reenrollUser test_id=nprseq',
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'problem registering identity';
								tools.stubs.generateKey.callsArgWith(0, null, ca_objects.key_pair);
								tools.stubs.request.callsArgWith(1, err);
							},
							expectBlock: (done) => {
								ca_lib.reenrollUser(ca_objects.fabricCAClient, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('problem registering identity');
									expect(resp).to.equal(undefined);
									done();
								});
							}
						},
						{
							itStatement: 'should return the error - no body in reenrollUsers response test_id=oatxrc',
							callFunction: () => {
								const resp_copy = JSON.parse(JSON.stringify(ca_objects.request_resp_register_identity));
								delete resp_copy.body;
								tools.stubs.generateKey.callsArgWith(0, null, ca_objects.key_pair);
								tools.stubs.request.callsArgWith(1, null, resp_copy);
							},
							expectBlock: (done) => {
								ca_lib.reenrollUser(ca_objects.fabricCAClient, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('problem re-enrolling user');
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - body passed in through request for reenrollUser has an error test_id=xuzhmk',
							callFunction: () => {
								tools.stubs.generateKey.callsArgWith(0, null, ca_objects.key_pair);
								tools.stubs.request.callsArgWith(1, null, ca_objects.request_resp_register_identity_body_with_errors);
							},
							expectBlock: (done) => {
								ca_lib.reenrollUser(ca_objects.fabricCAClient, (err, resp) => {
									expect(JSON.stringify(err)).to.equal(
										JSON.stringify({
											'parsed': 'Error: fabric-ca re-enroll user failed with errors code:52message:' + failed_msg,
											'raw': {}
										})
									);
									expect(resp).to.equal(null);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - body passed in through request for reenrollUser has an error test_id=iukhjb',
							callFunction: () => {
								const resp = JSON.parse(JSON.stringify(ca_objects.request_resp_register_identity_body_with_errors));
								resp.body = JSON.parse(resp.body);
								tools.stubs.generateKey.callsArgWith(0, null, ca_objects.key_pair);
								tools.stubs.request.callsArgWith(1, null, resp);
							},
							expectBlock: (done) => {
								ca_lib.reenrollUser(ca_objects.fabricCAClient, (err, resp) => {
									expect(JSON.stringify(err)).to.equal(
										JSON.stringify({
											'parsed': 'Error: fabric-ca re-enroll user failed with errors code:52message:' + failed_msg,
											'raw': {}
										}));
									expect(resp).to.equal(null);
									done();
								});
							}
						},
						{
							itStatement: 'should return error - reenrollUser has an error with status code less than 400 test_id=jbswnc',
							callFunction: () => {
								const obj_copy = JSON.parse(JSON.stringify(ca_objects.request_resp_register_identity_body_with_errors));
								obj_copy.body = JSON.parse(obj_copy.body);
								obj_copy.statusCode = 400;
								obj_copy.body.statusCode = 400;
								tools.stubs.generateKey.callsArgWith(0, null, ca_objects.key_pair);
								tools.stubs.request.callsArgWith(1, null, obj_copy);
							},
							expectBlock: (done) => {
								ca_lib.reenrollUser(ca_objects.fabricCAClient, (err, resp) => {
									expect(JSON.stringify(err)).to.equal(
										JSON.stringify({
											'statusCode': 400,
											'msg': {
												'result': '',
												'errors': [{
													'code': 52,
													'message': failed_msg
												}],
												'messages': [],
												'success': false,
												'statusCode': 400
											}
										})
									);
									expect(resp).to.equal(undefined);
									done();
								});
							}
						}
					]
				}
			]
		},
		// deleteCAIdentity
		{
			suiteDescribe: 'deleteCAIdentity',
			mainDescribe: 'Run deleteCAIdentity',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the correct get_users_resp when the stub returns a valid deleteCAIdentity test_id=hjxqrt',
							callFunction: () => {
								tools.stubs.request.callsArgWith(1, null, ca_objects.delete_ca_identity_request_body);
							},
							expectBlock: (done) => {
								ca_lib.getAffiliations(ca_objects.fabricCAClient, (resp) => {
									expect(resp.statusCode).to.equal(403);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(ca_objects.success_output1));
									done();
								});
							}
						},
						{
							itStatement: 'should return the correct get_users_resp when the stub returns a valid deleteCAIdentity - test_id=vhknkc',
							callFunction: () => {
								tools.stubs.request.callsArgWith(1, null, ca_objects.delete_ca_identity_request_body_is_array);
							},
							expectBlock: (done) => {
								ca_lib.deleteCAIdentity(ca_objects.fabricCAClient, 'user2', (resp) => {
									expect(resp.statusCode).to.equal(403);
									expect(JSON.stringify(resp)).to.equal(
										JSON.stringify({
											'statusCode': 403,
											'msg': {
												'result': '',
												'errors': [],
												'messages': [{ 'message': 'successfully deleted user2' }], 'success': true
											}
										}));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - body passed in through request for deleteCAIdentity has an error test_id=gpbimb',
							callFunction: () => {
								tools.stubs.request.callsArgWith(1, null, ca_objects.delete_ca_identity_body_had_errors);
							},
							expectBlock: (done) => {
								ca_lib.deleteCAIdentity(ca_objects.fabricCAClient, 'user2', (err, resp) => {
									expect(JSON.stringify(err)).to.equal(JSON.stringify(ca_objects.error_output2));
									expect(resp).to.equal(undefined);
									done();
								});
							}
						},
						{
							itStatement: 'should return the error - no body in deleteCAIdentity response test_id=szlkwm',
							callFunction: () => {
								const resp_copy = JSON.parse(JSON.stringify(ca_objects.delete_ca_identity_request_body));
								delete resp_copy.body;
								tools.stubs.request.callsArgWith(1, null, resp_copy);
							},
							expectBlock: (done) => {
								ca_lib.deleteCAIdentity(ca_objects.fabricCAClient, 'user2', (err) => {
									expect(err.statusCode).to.equal(403);
									expect(err.msg).to.equal(undefined);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - passed error through the request for deleteCAIdentity test_id=utwudy',
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'problem getting affiliations';
								tools.stubs.request.callsArgWith(1, err);
							},
							expectBlock: (done) => {
								ca_lib.deleteCAIdentity(ca_objects.fabricCAClient, 'user2', (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(resp).to.equal(undefined);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - body passed in through request for deleteCAIdentity has an error test_id=omdcws',
							callFunction: () => {
								tools.stubs.generateKey.callsArgWith(0, null, ca_objects.key_pair);
								tools.stubs.request.callsArgWith(1, null, ca_objects.request_resp_register_identity_body_with_errors);
							},
							expectBlock: (done) => {
								ca_lib.deleteCAIdentity(ca_objects.fabricCAClient, 'user6', (err, resp) => {
									expect(JSON.stringify(err)).to.equal(
										JSON.stringify({
											'parsed': 'Error: fabric-ca request identities failed with errors code:52message:' + failed_msg,
											'raw': {}
										})
									);
									expect(resp).to.equal(null);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - body passed in through request for deleteCAIdentity has an error test_id=jnrnoc',
							callFunction: () => {
								const resp = JSON.parse(JSON.stringify(ca_objects.request_resp_register_identity_body_with_errors));
								resp.body = JSON.parse(resp.body);
								tools.stubs.generateKey.callsArgWith(0, null, ca_objects.key_pair);
								tools.stubs.request.callsArgWith(1, null, resp);
							},
							expectBlock: (done) => {
								ca_lib.deleteCAIdentity(ca_objects.fabricCAClient, 'user6', (err, resp) => {
									expect(JSON.stringify(err)).to.equal(
										JSON.stringify({
											'parsed': 'Error: fabric-ca request identities failed with errors code:52message:' + failed_msg,
											'raw': {}
										})
									);
									expect(resp).to.equal(null);
									done();
								});
							}
						},
						{
							itStatement: 'should return no errors - body passed in through request for deleteCAIdentity has no errors test_id=ptqskf',
							callFunction: () => {
								const resp = JSON.parse(JSON.stringify(ca_objects.request_resp_register_identity_body_with_errors));
								resp.body = JSON.parse(resp.body);
								resp.body.errors = null;
								tools.stubs.request.callsArgWith(1, null, resp);
							},
							expectBlock: (done) => {
								ca_lib.deleteCAIdentity(ca_objects.fabricCAClient, 'user6', (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify({ 'result': '', 'errors': null, 'messages': [], 'success': false }));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - no body passed in through request for deleteCAIdentity test_id=sjhfwq',
							callFunction: () => {
								const resp = JSON.parse(JSON.stringify(ca_objects.request_resp_register_identity_body_with_errors));
								resp.body = null;
								tools.stubs.request.callsArgWith(1, null, resp);
							},
							expectBlock: (done) => {
								ca_lib.deleteCAIdentity(ca_objects.fabricCAClient, 'user6', (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('problem deleting identity');
									done();
								});
							}
						}
					]
				}
			]
		},
		// toBytes
		{
			suiteDescribe: 'toBytes',
			mainDescribe: 'Run toBytes',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the PEM formated key test_id=pojdjs',
							expectBlock: (done) => {
								const key = ca_lib.toBytes(ca_objects.fabricCAClient.enrollment.key._key);
								expect(key).to.equal('12345');
								sinon.assert.calledWith(tools.stubs.toBytes, ca_objects.fabricCAClient.enrollment.key._key);
								done();
							}
						}
					]
				}
			]
		},
		// invalidIdOrSecret
		{
			suiteDescribe: 'invalidIdOrSecret',
			mainDescribe: 'Run invalidIdOrSecret',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return false test_id=tcvrza',
							expectBlock: (done) => {
								const key = ca_lib.invalidIdOrSecret('good_one', 'good_one');
								expect(key).to.equal(false);
								done();
							}
						},
						{
							itStatement: 'should return the space errors test_id=vacbkk',
							expectBlock: (done) => {
								const key = ca_lib.invalidIdOrSecret('bad one', 'bad one');
								expect(JSON.stringify(key)).to.equal(
									JSON.stringify({
										'statusCode': 400,
										'msg': 'The enroll id cannot contain spaces or double quotes. The enroll secret cannot contain spaces or double quotes'
									})
								);
								done();
							}
						},
						{
							itStatement: 'should return the quote errors test_id=xfqwhs',
							expectBlock: (done) => {
								const key = ca_lib.invalidIdOrSecret('bad.one"', 'bad.one"');
								expect(JSON.stringify(key)).to.equal(
									JSON.stringify({
										'statusCode': 400,
										'msg': 'The enroll id cannot contain spaces or double quotes. The enroll secret cannot contain spaces or double quotes'
									})
								);
								done();
							}
						},
						{
							itStatement: 'should return the string errors test_id=mhxwle',
							expectBlock: (done) => {
								const key = ca_lib.invalidIdOrSecret(true, false);
								expect(JSON.stringify(key)).to.equal(
									JSON.stringify({ 'statusCode': 400, 'msg': 'The enroll id must be a string. The enroll secret must be a string' })
								);
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
