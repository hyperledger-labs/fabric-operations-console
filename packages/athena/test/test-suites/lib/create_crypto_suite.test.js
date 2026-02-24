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
// create_crypto_suite.test.js - test file for create crypto
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const crypto_suite_objects = require('../../docs/create_crypto_suite_objects.json');
const tools = common.tools;
const BN = require('bn.js');
const crypto_lib = require('../../../libs/fabric_ca_services/create_crypto_suite.js')(common.logger, common.ev, tools);
const crypto_suite = crypto_lib.createCryptoSuite();

describe('create_crypto_suite.js', () => {
	before(() => { });
	after(() => { });
	const testCollection = [
		// createCryptoSuite
		{
			suiteDescribe: 'createCryptoSuite',
			mainDescribe: 'Run createCryptoSuite',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the keys from the created crypto_suite',
							expectBlock: (done) => {
								const crypto_suite = crypto_lib.createCryptoSuite();
								expect(JSON.stringify(Object.keys(crypto_suite))).to.equal(JSON.stringify(crypto_suite_objects.crypto_suite_keys));
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
							itStatement: 'should return a valid big number response for the digest passed in',
							expectBlock: (done) => {
								const key = {
									_key: {
										prvKeyHex: 'abcdef',
										ecparams: {
											name: 'secp256r1',
											n: new BN('FFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551', 16)
										}
									}
								};
								const digest = 'ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789';
								const sign = crypto_suite.sign(key, digest);
								expect(JSON.stringify(sign)).to.equal(JSON.stringify(crypto_suite_objects.sign_valid_response));
								done();
							}
						},
						{
							itStatement: 'should throw an error - no key passed into the sign function',
							expectBlock: (done) => {
								const key = null;
								expect(crypto_suite.sign.bind(crypto_suite, key)).to.throw('A valid key is required to sign');
								done();
							}
						},
						{
							itStatement: 'should throw an error - no digest passed in',
							expectBlock: (done) => {
								const key = {
									_key: {
										prvKeyHex: 'abcdef',
										ecparams: {
											name: 'secp256r1',
											n: new BN('FFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551', 16)
										}
									}
								};
								const digest = null;
								expect(crypto_suite.sign.bind(crypto_suite, key, digest)).to.throw('A valid message is required to sign');
								done();
							}
						},
						{
							itStatement: 'should throw an error - invalid name passed in',
							expectBlock: (done) => {
								const key = {
									_key: {
										prvKeyHex: 'abcdef',
										ecparams: {
											name: null,
											n: new BN('FFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551', 16)
										}
									}
								};
								const digest = 'ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789';
								expect(crypto_suite.sign.bind(crypto_suite, key, digest)).to.throw(
									'Can not find the half order needed to calculate "s" value for immalleable signatures. Unsupported curve name: null'
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
	common.mainTestFunction(testCollection);
});
