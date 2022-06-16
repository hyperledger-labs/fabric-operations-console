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
// key_lib.test.js - test file for key_lib
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const tools = common.tools;
const myutils = require('../../testing-lib/test-middleware');
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);
const localStubs = {};

let key_lib;

const createStubs = () => {
	return {
		generateKeypair: sinon.stub(tools.KEYUTIL, 'generateKeypair'),
		getPEM: sinon.stub(tools.KEYUTIL, 'getPEM').returns('some pem')
	};
};

describe('Key Lib', () => {
	before(() => {
		tools.stubs = createStubs();
		key_lib = require('../../../libs/fabric_ca_services/key_lib.js')(common.logger, common.ev, tools);
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
							itStatement: 'should return a valid response - function given valid arguments test_id=fsoeto',
							callFunction: () => {
								tools.stubs.generateKeypair.returns({
									prvKeyObj: {},
									pubKeyObj: {}
								});
							},
							expectBlock: (done) => {
								key_lib.generateKey((err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify({ 'prvKeyObj': {}, 'pubKeyObj': {} }));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - no prvKeyObj passed to stub test_id=jkyxvp',
							callFunction: () => {
								tools.stubs.generateKeypair.returns({
									pubKeyObj: {}
								});
							},
							expectBlock: (done) => {
								key_lib.generateKey((err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('Problem with KEYUTIL.generateKeypair');
									expect(resp).to.equal(undefined);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - no pubKeyObj passed to stub test_id=qkdkgz',
							callFunction: () => {
								tools.stubs.generateKeypair.returns({
									prvKeyObj: {}
								});
							},
							expectBlock: (done) => {
								key_lib.generateKey((err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('Problem with KEYUTIL.generateKeypair');
									expect(resp).to.equal(undefined);
									done();
								});
							}
						}
					]
				}
			]
		},
		// generateCSR
		{
			suiteDescribe: 'generateCSR',
			mainDescribe: 'Run generateCSR',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a CSRPEM object - all stubs passed valid params test_id=yhrktv',
							callFunction: () => {
								localStubs.ldapToOneline = sinon.stub(tools.asn1.x509.X500Name, 'ldapToOneline').returns('abc');
								localStubs.getPublicKey = sinon.stub(key_lib, 'getPublicKey').returns('public_key');
								localStubs.newCSRPEM = sinon.stub(tools.asn1.csr.CSRUtil, 'newCSRPEM').returns({
									subject: 'subject',
									sbjpubkey: 'sbjpubkey',
									sigalg: 'SHA256withECDSA',
									sbjprvkey: 'key'
								});
							},
							expectBlock: (done) => {
								const csr = key_lib.generateCSR('subjectDN', 'key');
								expect(JSON.stringify(csr)).to.equal(
									JSON.stringify({ 'subject': 'subject', 'sbjpubkey': 'sbjpubkey', 'sigalg': 'SHA256withECDSA', 'sbjprvkey': 'key' })
								);
								localStubs.ldapToOneline.restore();
								localStubs.getPublicKey.restore();
								localStubs.newCSRPEM.restore();
								done();
							}
						},
						{
							itStatement: 'should return an error - false returned from "isPrivate" function test_id=zrnqck',
							callFunction: () => {
								localStubs.isPrivate = sinon.stub(key_lib, 'isPrivate').returns(false);
							},
							expectBlock: (done) => {
								const csr = key_lib.generateCSR('subjectDN', 'key');
								expect(csr.statusCode).to.equal(500);
								expect(csr.msg).to.equal('A CSR cannot be generated from a public key');
								localStubs.isPrivate.restore();
								done();
							}
						},
						{
							itStatement: 'should throw an error - allowed getPublicKey to fail test_id=bmfoyn',
							callFunction: () => {
								localStubs.ldapToOneline = sinon.stub(tools.asn1.x509.X500Name, 'ldapToOneline').returns('abc');
							},
							expectBlock: (done) => {
								expect(key_lib.generateCSR.bind()).to.throw('Cannot read properties of undefined (reading \'curveName\')');
								localStubs.ldapToOneline.restore();
								done();
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
							itStatement: 'should return the stubbed value for getPEM - isPrivate returns false test_id=hiyxce',
							callFunction: () => {
								localStubs.isPrivate = sinon.stub(key_lib, 'isPrivate').returns(false);
							},
							expectBlock: (done) => {
								const bytes = key_lib.toBytes('key');
								expect(bytes).to.equal('some pem');
								localStubs.isPrivate.restore();
								done();
							}
						},
						{
							itStatement: 'should return the stubbed value for getPEM - isPrivate returns true test_id=wogqsa',
							expectBlock: (done) => {
								const bytes = key_lib.toBytes('key');
								expect(bytes).to.equal('some pem');
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
