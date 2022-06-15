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
// fabric_utils.test.js - test file for fabric utils
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const ca_objects = require('../../docs/ca_objects.json');
const tools = common.tools;
tools.cryptoSuite = require('../../../libs/fabric_ca_services/create_crypto_suite.js')(common.logger, common.ev, common.tools).createCryptoSuite();
tools.signingIdentity = ca_objects.signing_identity_some_fake_properties;
tools.signing_lib = require('../../../libs/fabric_ca_services/signing_lib.js')(common.logger, common.ev, common.tools);
const myutils = require('../../testing-lib/test-middleware');
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);

let fabric_utils;


const createStubs = () => {
	return {
		sign: sinon.stub(tools.signing_lib, 'sign').returns(ca_objects.generate_auth_token_sig),
		getKey: sinon.stub(tools.KEYUTIL, 'getKey').returns('key')
	};
};

describe('Fabric Utils', () => {
	before(() => {
		tools.stubs = createStubs();
		tools.signingIdentity = {};
		tools.signingIdentity.certificate = '-----BEGIN CERTIFICATE-----certificate-----END CERTIFICATE-----';
		fabric_utils = require('../../../libs/fabric_ca_services/fabric_utils.js')(common.logger, common.ev, tools);
	});
	after(() => {
		myutils.restoreStubs(tools.stubs);
	});
	const testCollection = [
		// createFabricCAClient
		{
			suiteDescribe: 'createFabricCAClient',
			mainDescribe: 'createFabricCAClient',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the fabricCAClient object test_id=dfqbqs',
							expectBlock: (done) => {
								const fabricCAClient = fabric_utils.createFabricCAClient(ca_objects.createFabricCAClient_opts_body);
								expect(JSON.stringify(tools.misc.sortItOut(fabricCAClient))).to.equal(
									JSON.stringify({
										'baseAPI': '/api/v1/',
										'ca_name': 'test name',
										'enrollmentID': 'admin',
										'enrollmentSecret': 'secret',
										'hostname': 'some_url',
										'method': 'GET',
										'msp_id': 'test name',
										'port': '3000',
										'protocol': 'https:'
									})
								);
								done();
							}
						},
						{
							itStatement: 'should return the fabricCAClient object - no ca_url test_id=ibggfl',
							expectBlock: (done) => {
								const body = JSON.parse(JSON.stringify(ca_objects.createFabricCAClient_opts_body));
								body.ca_url = null;
								const fabricCAClient = fabric_utils.createFabricCAClient(body);
								expect(JSON.stringify(tools.misc.sortItOut(fabricCAClient))).to.equal(
									JSON.stringify({
										'baseAPI': '/api/v1/',
										'ca_name': 'test name',
										'enrollmentID': 'admin',
										'enrollmentSecret': 'secret',
										'hostname': 'some_url',
										'method': 'GET',
										'msp_id': 'test name',
										'port': '3000',
										'protocol': 'https:'
									})
								);
								done();
							}
						},
						{
							itStatement: 'should return the fabricCAClient object - has cert and private key test_id=bdooui',
							expectBlock: (done) => {
								const body = JSON.parse(JSON.stringify(ca_objects.createFabricCAClient_opts_body));
								body.certificate = 'cert';
								body.private_key = 'private key';
								const fabricCAClient = fabric_utils.createFabricCAClient(body);
								expect(JSON.stringify(tools.misc.sortItOut(fabricCAClient))).to.equal(
									JSON.stringify({
										'baseAPI': '/api/v1/',
										'ca_name': 'test name',
										'certificate': 'q��',
										'enrollmentID': 'admin',
										'enrollmentSecret': 'secret',
										'hostname': 'some_url',
										'method': 'GET',
										'msp_id': 'test name',
										'port': '3000',
										'private_key': 'key',
										'protocol': 'https:'
									})
								);
								done();
							}
						}
					]
				}
			]
		},
		// generateAuthToken
		{
			suiteDescribe: 'generateAuthToken',
			mainDescribe: 'Run generateAuthToken',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid response - function given valid arguments  test_id=atjnlp',
							expectBlock: (done) => {
								const auth_token = fabric_utils.generateAuthToken({});
								expect(auth_token).to.equal('LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tY2VydGlmaWNhdGUtLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0t.' +
									'MEUCIQCvo79r5n893d5rMY1xzazbyYRN00uQaFU0jSYJJtxJcAIgJB4NnK18/+oVsKU95v09pxdos9SySMOEFSdyF4uOe4A=');
								done();
							}
						},
						{
							itStatement: 'should return a valid response - no body sent test_id=jkoluf',
							expectBlock: (done) => {
								const auth_token = fabric_utils.generateAuthToken();
								expect(auth_token).to.equal('LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tY2VydGlmaWNhdGUtLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0t.' +
									'MEUCIQCvo79r5n893d5rMY1xzazbyYRN00uQaFU0jSYJJtxJcAIgJB4NnK18/+oVsKU95v09pxdos9SySMOEFSdyF4uOe4A=');
								done();
							}
						}
					]
				}
			]
		},
		// format_error_msg
		{
			suiteDescribe: 'format_error_msg',
			mainDescribe: 'Run format_error_msg',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid response - function given valid arguments test_id=mbngrm',
							expectBlock: (done) => {
								const errors = ['here is an error'];
								const auth_token = fabric_utils.format_error_msg(errors, 'test message');
								expect(JSON.stringify(auth_token)).to.equal(JSON.stringify({ 'parsed': 'test messagehere is an error', 'raw': {} }));
								done();
							}
						},
						{
							itStatement: 'should return a valid response - multiple errors passed in test_id=itvpua',
							expectBlock: (done) => {
								const errors = ['here is an error', 'here is another error'];
								const auth_token = fabric_utils.format_error_msg(errors, 'test message');
								expect(JSON.stringify(auth_token)).to.equal(JSON.stringify(['here is an error', 'here is another error']));
								done();
							}
						}
					]
				}
			]
		},
		// setTLSOptions
		{
			suiteDescribe: 'setTLSOptions',
			mainDescribe: 'Run setTLSOptions',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid response - function given valid arguments test_id=arujta',
							expectBlock: (done) => {
								const opts = {
									pem: 'pem'
								};
								const auth_token = fabric_utils.setTLSOptions(opts);
								expect(JSON.stringify(auth_token)).to.equal(JSON.stringify({ 'trustedRoots': 'pem', 'verify': false }));
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
