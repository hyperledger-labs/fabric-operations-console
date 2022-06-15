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
const common = require('../../common-test-framework');
const chai = require('chai');
const expect = chai.expect;
const chaiHttp = require('chai-http');
const tools = common.tools;
tools.misc = require('../../../../libs/misc.js')(common.logger, common.tools);
tools.ca_lib = require('../../../../libs/ca_lib.js')(common.logger, common.ev, tools);
tools.cryptoSuite = require('../../../../libs/fabric_ca_services/create_crypto_suite.js')(common.logger, common.ev, common.tools).createCryptoSuite();
tools.enroll_lib = require('../../../../libs/fabric_ca_services/enroll_lib.js')(common.logger, common.ev, common.tools);
tools.signing_lib = require('../../../../libs/fabric_ca_services/signing_lib.js')(common.logger, common.ev, common.tools);
tools.fabric_utils = require('../../../../libs/fabric_ca_services/fabric_utils.js')(common.logger, common.ev, common.tools);
tools.key_lib = require('../../../../libs/fabric_ca_services/key_lib.js')(common.logger, common.ev, common.tools);
const jsrsa = require('jsrsasign');
tools.asn1 = jsrsa.asn1;
tools.KEYUTIL = jsrsa.KEYUTIL;
tools.ECDSA = jsrsa.ECDSA;
const elliptic = require('elliptic');
tools.EC = elliptic.ec;
const myutils = require('../../../testing-lib/test-middleware');
const env_test_data = require('../../../../env/test.json');
const ca_apis = require('../../../../routes/ca_apis.js')(common.logger, common.ev, tools);
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);

chai.use(chaiHttp);

const error_msg =
	'Error: fabric-ca request identities failed with errors code:52message:' +
	'Failed to add identity: Registration of \'user6\' failed: Identity \'user6\' is already registered';

describe('CA APIs', function () {
	this.timeout(17000);
	before((done) => {
		this.app = common.expressApp(ca_apis);
		done();
	});
	after(() => { });
	const testCollection = [
		// POST /api/v1/cas/users/get
		{
			suiteDescribe: 'POST /api/v1/cas/users/get',
			mainDescribe: 'Run POST /api/v1/cas/users/get ',
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post('/api/v1/cas/users/get')
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a status of 200 and get all users for the current identity',
							body: {
								ca_url: env_test_data.ca_url,
								ca_name: env_test_data.ca_name,
								enroll_id: env_test_data.enroll_id,
								enroll_secret: env_test_data.enroll_secret
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
							}
						},
						{
							itStatement: 'should return a status of 200 and get all users for the current identity - certs and key provided',
							body: {
								ca_url: env_test_data.ca_url,
								ca_name: env_test_data.ca_name,
								enroll_id: env_test_data.enroll_id,
								enroll_secret: env_test_data.enroll_secret,
								certificate: env_test_data.certificate,
								private_key: env_test_data.private_key
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
							}
						},
						{
							itStatement: 'should return a status of 500 and error messages - sent bad password and will fail on enrollment',
							body: {
								ca_url: env_test_data.ca_url,
								ca_name: env_test_data.ca_name,
								enroll_id: env_test_data.enroll_id,
								enroll_secret: 'abc'
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(JSON.stringify(res.body.faultyArgument)).to.equal(JSON.stringify({}));
							}
						},
						{
							itStatement: 'should return a status of 500 and error messages - sent bad url and will fail on enrollment',
							body: {
								ca_url: '',
								ca_name: env_test_data.ca_name,
								enroll_id: env_test_data.enroll_id,
								enroll_secret: env_test_data.enroll_secret
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.body.backend_context).to.equal('problem with "enrollCA" function of the "commonFabricCASetup" function');
							}
						}
					]
				}
			]
		},
		// POST /api/v1/cas/users/register
		{
			suiteDescribe: 'POST /api/v1/cas/users/register',
			mainDescribe: 'Run POST /api/v1/cas/users/register ',
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post('/api/v1/cas/users/register')
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a status of 200 and register a new identity',
							body: {
								ca_url: env_test_data.ca_url,
								ca_name: env_test_data.ca_name,
								enroll_id: env_test_data.enroll_id,
								enroll_secret: env_test_data.enroll_secret,
								new_enroll_id: 'user6',
								new_enroll_secret: 'passwd',
								affiliation: 'org1',
								max_enrollments: -1,
								signing_identity: 'signing_identity'
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								const err = JSON.stringify({
									parsed: error_msg,
									raw: {}
								});
								expect(JSON.stringify(res.body)).to.equal(err);
							}
						},
						{
							itStatement: 'should return a status of 200 and register a new identity - cert and key provided',
							body: {
								ca_url: env_test_data.ca_url,
								ca_name: env_test_data.ca_name,
								enroll_id: env_test_data.enroll_id,
								enroll_secret: env_test_data.enroll_secret,
								new_enroll_id: 'user6',
								new_enroll_secret: 'passwd',
								affiliation: 'org1',
								max_enrollments: -1,
								signing_identity: 'signing_identity',
								certificate: env_test_data.certificate,
								private_key: env_test_data.private_key
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								const err = JSON.stringify({
									parsed: error_msg,
									raw: {}
								});
								expect(JSON.stringify(res.body)).to.equal(err);
							}
						},
						{
							itStatement: 'should return a status of 500 and an error message - invalid ca_url',
							body: {
								ca_url: '',
								ca_name: env_test_data.ca_name,
								enroll_id: env_test_data.enroll_id,
								enroll_secret: env_test_data.enroll_secret
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.body.backend_context).to.equal('problem with "enrollCA" function of the "commonFabricCASetup" function');
							}
						}
					]
				}
			]
		},
		// POST /api/v1/cas/users/affiliations/get
		{
			suiteDescribe: 'POST /api/v1/cas/users/affiliations/get',
			mainDescribe: 'Run POST /api/v1/cas/users/affiliations/get ',
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post('/api/v1/cas/users/affiliations/get')
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a status of 200 and get all affiliations for the calling identity',
							body: {
								ca_url: env_test_data.ca_url,
								ca_name: env_test_data.ca_name,
								enroll_id: env_test_data.enroll_id,
								enroll_secret: env_test_data.enroll_secret
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
							}
						},
						{
							itStatement: 'should return a status of 200 and get all affiliations for the calling identity - cert and key provided',
							body: {
								ca_url: env_test_data.ca_url,
								ca_name: env_test_data.ca_name,
								enroll_id: env_test_data.enroll_id,
								enroll_secret: env_test_data.enroll_secret,
								certificate: env_test_data.certificate,
								private_key: env_test_data.private_key
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(JSON.stringify(res.body)).to.equal(
									JSON.stringify([{
										'name': 'org1', 'affiliations': [{ 'name': 'org1.department1' }, { 'name': 'org1.department2' }]
									}, { 'name': 'org2', 'affiliations': [{ 'name': 'org2.department1' }] }])
								);
							}
						},
						{
							itStatement: 'should return a status of 500 and an error message - invalid ca_url',
							body: {
								ca_url: '',
								ca_name: env_test_data.ca_name,
								enroll_id: env_test_data.enroll_id,
								enroll_secret: env_test_data.enroll_secret
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.body.backend_context).to.equal('problem with "enrollCA" function of the "commonFabricCASetup" function');
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
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post('/api/v1/cas/cert/get')
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a status of 200 and return the certs',
							body: {
								ca_url: env_test_data.ca_url,
								ca_name: env_test_data.ca_name,
								enroll_id: env_test_data.enroll_id,
								enroll_secret: env_test_data.enroll_secret
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
							}
						},
						{
							itStatement: 'should return a status of 500 and an error message - invalid ca_url',
							body: {
								ca_url: '',
								ca_name: env_test_data.ca_name,
								enroll_id: env_test_data.enroll_id,
								enroll_secret: env_test_data.enroll_secret
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.body.backend_context).to.equal('problem with "enrollCA" function of the "commonFabricCASetup" function');
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
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post('/api/v1/cas/users/delete')
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a status of 500 and an error message - delete does not work yet',
							body: {
								ca_url: env_test_data.ca_url,
								ca_name: env_test_data.ca_name,
								enroll_id: env_test_data.enroll_id,
								enroll_secret: env_test_data.enroll_secret,
								enroll_id_to_delete: 'user2'
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.text).to.equal(
									JSON.stringify({
										'parsed': 'Error: fabric-ca request identities failed with errors code:56message:Identity removal is disabled',
										'raw': {}
									})
								);
							}
						},
						{
							itStatement: 'should return a status of 500 and an error message - delete does not work yet - cert and private key provided',
							body: {
								ca_url: env_test_data.ca_url,
								ca_name: env_test_data.ca_name,
								enroll_id: env_test_data.enroll_id,
								enroll_secret: env_test_data.enroll_secret,
								enroll_id_to_delete: 'user2',
								certificate: env_test_data.certificate,
								private_key: env_test_data.private_key
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.text).to.equal(
									JSON.stringify({
										'parsed': 'Error: fabric-ca request identities failed with errors code:56message:Identity removal is disabled',
										'raw': {}
									})
								);
							}
						},
						{
							itStatement: 'should return a status of 500 and an error message - invalid ca_url',
							body: {
								ca_url: '',
								ca_name: env_test_data.ca_name,
								enroll_id: env_test_data.enroll_id,
								enroll_secret: env_test_data.enroll_secret
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.body.backend_context).to.equal('problem with "enrollCA" function of the "commonFabricCASetup" function');
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
