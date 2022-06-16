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
// signing_lib.test.js - test file for singing_lib
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const ca_objects = require('../../docs/ca_objects.json');
const tools = common.tools;
tools.cryptoSuite = require('../../../libs/fabric_ca_services/create_crypto_suite.js')(common.logger, common.ev, common.tools).createCryptoSuite();
const myutils = require('../../testing-lib/test-middleware');
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);

let signing_lib;


const createStubs = () => {
	return {
		sign: sinon.stub(tools.cryptoSuite, 'sign')
	};
};

describe('Signing Lib', () => {
	before(() => {
		tools.stubs = createStubs();
		signing_lib = require('../../../libs/fabric_ca_services/signing_lib.js')(common.logger, common.ev, tools);
	});
	after(() => {
		myutils.restoreStubs(tools.stubs);
	});
	const testCollection = [
		// createSigningIdEntity
		{
			suiteDescribe: 'createSigningIdEntity',
			mainDescribe: 'Run createSigningIdEntity',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid response - function given valid arguments  test_id=wseotl',
							expectBlock: (done) => {
								const signingIdEntity = signing_lib.createSigningIdEntity(ca_objects.signing_identity_opts);
								expect(JSON.stringify(signingIdEntity)).to.equal(JSON.stringify(ca_objects.signing_identity_some_fake_properties));
								done();
							}
						},
						{
							itStatement: 'should return an error - no enrollment key passed in so signerKey cannot be made test_id=ndwtox',
							expectBlock: (done) => {
								const opts = JSON.parse(JSON.stringify(ca_objects.signing_identity_opts));
								delete opts._enrollment_key;
								const signingIdEntity = signing_lib.createSigningIdEntity(opts);
								expect(signingIdEntity.statusCode).to.equal(500);
								expect(signingIdEntity.msg).to.equal('Missing required parameter "key" for private key');
								done();
							}
						},
						{
							itStatement: 'should return an error - no certificate passed in test_id=yztjku',
							expectBlock: (done) => {
								const opts = JSON.parse(JSON.stringify(ca_objects.signing_identity_opts));
								delete opts.certificate;
								const signingIdEntity = signing_lib.createSigningIdEntity(opts);
								expect(signingIdEntity.statusCode).to.equal(500);
								expect(signingIdEntity.msg).to.equal('Missing required parameter "certificate".');
								done();
							}
						},
						{
							itStatement: 'should return an error - no public key passed in test_id=fibtfl',
							expectBlock: (done) => {
								const opts = JSON.parse(JSON.stringify(ca_objects.signing_identity_opts));
								delete opts.public_key;
								const signingIdEntity = signing_lib.createSigningIdEntity(opts);
								expect(signingIdEntity.statusCode).to.equal(500);
								expect(signingIdEntity.msg).to.equal('Missing required parameter "publicKey".');
								done();
							}
						},
						{
							itStatement: 'should return an error - no msp_id passed in test_id=sewnwu',
							expectBlock: (done) => {
								const opts = JSON.parse(JSON.stringify(ca_objects.signing_identity_opts));
								delete opts.msp_id;
								const signingIdEntity = signing_lib.createSigningIdEntity(opts);
								expect(signingIdEntity.statusCode).to.equal(500);
								expect(signingIdEntity.msg).to.equal('Missing required parameter "mspId".');
								done();
							}
						}
					]
				}
			]
		},
		// sign
		{
			suiteDescribe: 'sign',
			mainDescribe: 'Run sign',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid response - function given valid arguments  test_id=yxykpb',
							expectBlock: (done) => {
								tools.stubs.sign.returns('abcdef');
								const signingIdEntity = signing_lib.sign(ca_objects.sign_msg, ca_objects.sign_opts);
								expect(JSON.stringify(signingIdEntity)).to.equal(JSON.stringify('abcdef'));
								done();
							}
						},
						{
							itStatement: 'should return a valid response - use hash function test_id=uzjmvm',
							expectBlock: (done) => {
								tools.stubs.sign.returns('abcdef');
								const opts = JSON.parse(JSON.stringify(ca_objects.sign_opts));
								opts.hashFunction = () => { return 'abcdef'; };
								const signingIdEntity = signing_lib.sign(ca_objects.sign_msg, opts);
								expect(JSON.stringify(signingIdEntity)).to.equal(JSON.stringify('abcdef'));
								done();
							}
						},
						{
							itStatement: 'should return an error - hash function is not a function test_id=elyexp',
							expectBlock: (done) => {
								const opts = JSON.parse(JSON.stringify(ca_objects.sign_opts));
								opts.hashFunction = {};
								const signingIdEntity = signing_lib.sign(ca_objects.sign_msg, opts);
								expect(signingIdEntity.statusCode).to.equal(500);
								expect(signingIdEntity.msg).to.equal('The "hashFunction" field must be a function');
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
