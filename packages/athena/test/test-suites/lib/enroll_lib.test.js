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
// enroll_lib.js - test file for the enroll lib
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

let enroll_lib;


const createStubs = () => {
	return {
		request: sinon.stub(tools, 'request'),
		generateCSR: sinon.stub(tools.key_lib, 'generateCSR').returns(ca_objects.csr),
		generateKey: sinon.stub(tools.key_lib, 'generateKey'),
		getPublicKey: sinon.stub(tools.key_lib, 'getPublicKey').returns('abcdef')
	};
};

describe('Enroll Lib', () => {
	before(() => {
		tools.stubs = createStubs();
		enroll_lib = require('../../../libs/fabric_ca_services/enroll_lib.js')(common.logger, common.ev, tools);
		tools.stubs.doEnrollment = sinon.stub(enroll_lib, 'doEnrollment');
		// tools.stubs.generateKey = sinon.stub(tools.key_lib, 'generateKey');
	});
	after(() => {
		myutils.restoreStubs(tools.stubs);
	});
	const testCollection = [
		// enroll
		{
			suiteDescribe: 'enroll',
			mainDescribe: 'Run enroll',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid response - stub called with a valid response body test_id=tlfkyl',
							callFunction: () => {
								tools.stubs.generateKey.callsArgWith(0, null, ca_objects.sign_opts);
								tools.stubs.doEnrollment.callsArgWith(2, null, ca_objects.enroll_response);
							},
							expectBlock: (done) => {
								enroll_lib.enroll(ca_objects.enroll_request, (err) => {
									expect(err).to.equal(null);
									done();
								});
							}
						},
						{
							itStatement: 'should return an err - no request body test_id=cgzjaw',
							expectBlock: (done) => {
								enroll_lib.enroll(null, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('Problem enrolling CA Client - req was undefined or null');
									done();
								});
							}
						},
						{
							itStatement: 'should return an err - req.enrollmentID was not found test_id=hytdty',
							expectBlock: (done) => {
								const req = JSON.parse(JSON.stringify(ca_objects.enroll_request));
								delete req.enrollmentID;
								enroll_lib.enroll(req, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('Problem enrolling CA Client - req.enrollmentID was not found');
									done();
								});
							}
						},
						{
							itStatement: 'should return an err  - req.enrollmentSecret was not found test_id=fcckyj',
							expectBlock: (done) => {
								const req = JSON.parse(JSON.stringify(ca_objects.enroll_request));
								req.certificate = {};
								delete req.enrollmentSecret;
								enroll_lib.enroll(req, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('Problem enrolling CA Client - req.enrollmentSecret was not found');
									done();
								});
							}
						},
						{
							itStatement: 'should return an err - Invalid enroll request test_id=wwbhmm',
							expectBlock: (done) => {
								const req = JSON.parse(JSON.stringify(ca_objects.enroll_request));
								req.attr_reqs = {};
								enroll_lib.enroll(req, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('Invalid enroll request, attr_reqs must be an array of AttributeRequest objects');
									done();
								});
							}
						},
						{
							itStatement: 'should return an err  - Invalid enroll request, attr_reqs object is missing the name of the attribute test_id=jmcxyd',
							expectBlock: (done) => {
								const req = JSON.parse(JSON.stringify(ca_objects.enroll_request));
								req.attr_reqs = [{}];
								enroll_lib.enroll(req, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('Invalid enroll request, attr_reqs object is missing the name of the attribute');
									done();
								});
							}
						},
						{
							itStatement: 'should bypass enrollment and return the certs test_id=mrgvpb',
							expectBlock: (done) => {
								const req = JSON.parse(JSON.stringify(ca_objects.enroll_request));
								req.certificate = {};
								req.private_key = {};
								enroll_lib.enroll(req, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify({
										pvtkey: { _key: {} },
										public_key: { _key: 'abcdef' },
										pubKey: { _key: 'abcdef' },
										certificate: {}
									}));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error while bypassing enrollment to return the certs - err passed to csr test_id=qhrdmm',
							callFunction: () => {
								const csr = JSON.parse(JSON.stringify(ca_objects.csr));
								csr.statusCode = 500;
								tools.stubs.generateCSR.returns(csr);
							},
							expectBlock: (done) => {
								const req = JSON.parse(JSON.stringify(ca_objects.enroll_request));
								req.certificate = {};
								req.private_key = {};
								const csr = {
									statusCode: 500,
									msg: 'problem generating csr'
								};
								tools.stubs.generateCSR.returns(csr);
								enroll_lib.enroll(req, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('problem generating csr');
									tools.stubs.generateCSR.returns(ca_objects.csr);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error while generating certs - err passed to csr test_id=tsakdb',
							callFunction: () => {
								const csr = JSON.parse(JSON.stringify(ca_objects.csr));
								csr.statusCode = 500;
								tools.stubs.generateKey.callsArgWith(0, null, ca_objects.sign_opts);
								tools.stubs.generateCSR.returns(csr);
							},
							expectBlock: (done) => {
								const req = JSON.parse(JSON.stringify(ca_objects.enroll_request));
								const csr = {
									statusCode: 500,
									msg: 'problem generating csr'
								};
								tools.stubs.generateCSR.returns(csr);
								enroll_lib.enroll(req, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('problem generating csr');
									tools.stubs.generateCSR.returns(ca_objects.csr);
									done();
								});
							}
						},
						{
							itStatement: 'should return a error - error passed to doEnrollment stub test_id=nwufpv',
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'problem enrolling identity';
								tools.stubs.doEnrollment.callsArgWith(2, err);
							},
							expectBlock: (done) => {
								enroll_lib.enroll(ca_objects.enroll_request, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(resp).to.equal(undefined);
									done();
								});
							}
						},
						{
							itStatement: 'should return a error - error passed to generateKey stub test_id=wibtek',
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'problem enrolling identity';
								tools.stubs.doEnrollment.restore();
								tools.stubs.generateKey.callsArgWith(0, err);
								// sinon.stub(tools.key_lib, 'generateKey').callsArgWith(0, err);
							},
							expectBlock: (done) => {
								enroll_lib.enroll(ca_objects.enroll_request, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(resp).to.equal(undefined);
									// tools.key_lib.generateKey.restore();
									done();
								});
							}
						}
					]
				}
			]
		},
		// doEnrollment
		{
			suiteDescribe: 'doEnrollment',
			mainDescribe: 'Run doEnrollment',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the expected enroll response - valid request passed to the request stub test_id=mqcevm',
							callFunction: () => {
								tools.stubs.doEnrollment.restore();
								tools.stubs.request.callsArgWith(1, null, ca_objects.do_enrollment_response);
							},
							expectBlock: (done) => {
								const enroll_request = JSON.parse(JSON.stringify(ca_objects.enroll_request));
								enroll_request.profile = 'profile';
								enroll_request.attr_reqs = [];
								enroll_lib.doEnrollment(enroll_request, ca_objects.csr, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(ca_objects.enroll_response));
									done();
								});
							}
						},
						{
							itStatement: 'should return the expected enroll response - valid request passed - body is an object test_id=spqfhr',
							callFunction: () => {
								tools.stubs.doEnrollment.restore();
								tools.stubs.request.callsArgWith(1, null, ca_objects.do_enrollment_response_body_is_object);
							},
							expectBlock: (done) => {
								enroll_lib.doEnrollment(ca_objects.enroll_request, ca_objects.csr, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(ca_objects.enroll_response_body_is_object));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - error code passed into request stub test_id=pldgdy',
							callFunction: () => {
								const response = JSON.parse(JSON.stringify(ca_objects.do_enrollment_response));
								response.statusCode = 500;
								tools.stubs.doEnrollment.restore();
								tools.stubs.request.callsArgWith(1, null, response);
							},
							expectBlock: (done) => {
								const enroll_request = JSON.parse(JSON.stringify(ca_objects.enroll_request));
								enroll_request.profile = 'profile';
								enroll_request.attr_reqs = [];
								enroll_lib.doEnrollment(enroll_request, ca_objects.csr, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(JSON.stringify(JSON.parse(err.msg))).to.equal(JSON.stringify(ca_objects.enrollment_results));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - Buffer.from cannot parse the cert passed in test_id=ijsbvf',
							callFunction: () => {
								const response = JSON.parse(JSON.stringify(ca_objects.do_enrollment_response));
								const body = JSON.parse(response.body);
								body.result.Cert = 1;
								response.body = JSON.stringify(body);
								tools.stubs.doEnrollment.restore();
								tools.stubs.request.callsArgWith(1, null, response);
							},
							expectBlock: (done) => {
								const enroll_request = JSON.parse(JSON.stringify(ca_objects.enroll_request));
								enroll_request.profile = 'profile';
								enroll_request.attr_reqs = [];
								enroll_lib.doEnrollment(enroll_request, ca_objects.csr, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal(ca_objects.enrollment_result2);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - Buffer.from cannot parse the ServerInfo.CAChain passed in test_id=vbwbqo',
							callFunction: () => {
								const response = JSON.parse(JSON.stringify(ca_objects.do_enrollment_response));
								const body = JSON.parse(response.body);
								body.result.ServerInfo.CAChain = 1;
								response.body = JSON.stringify(body);
								tools.stubs.doEnrollment.restore();
								tools.stubs.request.callsArgWith(1, null, response);
							},
							expectBlock: (done) => {
								const enroll_request = JSON.parse(JSON.stringify(ca_objects.enroll_request));
								enroll_request.profile = 'profile';
								enroll_request.attr_reqs = [];
								enroll_lib.doEnrollment(enroll_request, ca_objects.csr, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal(ca_objects.enrollment_result3);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - passed error through the request stub test_id=vohrpz',
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'problem enrolling identity';
								tools.stubs.doEnrollment.restore();
								tools.stubs.request.callsArgWith(1, err);
							},
							expectBlock: (done) => {
								enroll_lib.doEnrollment(ca_objects.enroll_request, ca_objects.csr, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('could not make request to enroll');
									expect(resp).to.equal(undefined);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - no body in request passed to the request stub test_id=sihaxm',
							callFunction: () => {
								const do_enrollment = JSON.parse(JSON.stringify(ca_objects.do_enrollment_response));
								delete do_enrollment.body;
								tools.stubs.doEnrollment.restore();
								tools.stubs.request.callsArgWith(1, null, do_enrollment);
							},
							expectBlock: (done) => {
								enroll_lib.doEnrollment(ca_objects.enroll_request, ca_objects.csr, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('problem enrolling identity, missing response');
									expect(resp).to.equal(undefined);
									done();
								});
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
