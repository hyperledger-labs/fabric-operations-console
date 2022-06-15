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
// auth_header_lib.test.js - test for authorization header parsing
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const tools = common.tools;
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);


describe('Auth Header Lib', () => {
	before(() => { });
	after(() => { });
	const testCollection = [
		// parse_auth
		{
			suiteDescribe: 'parse_auth',
			mainDescribe: 'Run valid inputs for parse_auth',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'test upper case Authorization - basic auth test_id=pbesqv',
							expectBlock: (done) => {
								const req = {
									headers: {
										'Authorization': 'Basic ' + tools.misc.b64('username:password'),
									}
								};
								const parsed = tools.auth_header_lib.parse_auth(req);
								expect(parsed.type).to.equal('basic');
								expect(parsed.name).to.equal('username');
								expect(parsed.pass).to.equal('password');
								done();
							}
						},
						{
							itStatement: 'test lower case Authorization - basic auth test_id=rlbxud',
							expectBlock: (done) => {
								const req = {
									headers: {
										'authorization': 'Basic ' + tools.misc.b64('username:password'),
									}
								};
								const parsed = tools.auth_header_lib.parse_auth(req);
								expect(parsed.type).to.equal('basic');
								expect(parsed.name).to.equal('username');
								expect(parsed.pass).to.equal('password');
								done();
							}
						},
						{
							itStatement: 'test excessive spaces - basic auth test_id=rcfokd',
							expectBlock: (done) => {
								const req = {
									headers: {
										'authorization': '    Basic ' + tools.misc.b64('username:password') + '   ',
									}
								};
								const parsed = tools.auth_header_lib.parse_auth(req);
								expect(parsed.type).to.equal('basic');
								expect(parsed.name).to.equal('username');
								expect(parsed.pass).to.equal('password');
								done();
							}
						},
						{
							itStatement: 'test weird basic auth - password contains colon test_id=ihkleq',
							expectBlock: (done) => {
								const req = {
									headers: {
										'authorization': 'Basic ' + tools.misc.b64('username:pass:word'), // fyi - usernames cannot contain a colon
									}
								};
								const parsed = tools.auth_header_lib.parse_auth(req);
								expect(parsed.type).to.equal('basic');
								expect(parsed.name).to.equal('username');
								expect(parsed.pass).to.equal('pass:word');
								done();
							}
						},



						// other auth...
						{
							itStatement: 'test lowercase basic auth test_id=zobqvb',
							expectBlock: (done) => {
								const req = {
									headers: {
										'authorization': 'basic ' + tools.misc.b64('username:password'),
									}
								};
								const parsed = tools.auth_header_lib.parse_auth(req);
								expect(parsed.type).to.equal('basic');
								expect(parsed.name).to.equal('username');
								expect(parsed.pass).to.equal('password');
								done();
							},
						},
						{
							itStatement: 'test uppercase Basic auth test_id=hwwtum',
							expectBlock: (done) => {
								const req = {
									headers: {
										'authorization': 'Basic ' + tools.misc.b64('username:password'),
									}
								};
								const parsed = tools.auth_header_lib.parse_auth(req);
								expect(parsed.type).to.equal('basic');
								expect(parsed.name).to.equal('username');
								expect(parsed.pass).to.equal('password');
								done();
							}
						},
						{
							itStatement: 'test lowercase bearer auth test_id=xgqvej',
							expectBlock: (done) => {
								const req = {
									headers: {
										'authorization': 'bearer something-here',
									}
								};
								const parsed = tools.auth_header_lib.parse_auth(req);
								expect(parsed.type).to.equal('bearer');
								expect(parsed.token).to.equal('something-here');
								done();
							},
						},
						{
							itStatement: 'test uppercase Bearer auth test_id=phmczk',
							expectBlock: (done) => {
								const req = {
									headers: {
										'authorization': 'Bearer something-here',
									}
								};
								const parsed = tools.auth_header_lib.parse_auth(req);
								expect(parsed.type).to.equal('bearer');
								expect(parsed.token).to.equal('something-here');
								done();
							}
						},
						{
							itStatement: 'test lowercase signature auth test_id=lcpnjx',
							expectBlock: (done) => {
								const req = {
									headers: {
										'authorization': 'signature something-here-too',
									}
								};
								const parsed = tools.auth_header_lib.parse_auth(req);
								expect(parsed.type).to.equal('signature');
								expect(parsed.signature).to.equal('something-here-too');
								done();
							},
						},
						{
							itStatement: 'test uppercase Signature auth test_id=awtwtt',
							expectBlock: (done) => {
								const req = {
									headers: {
										'authorization': 'Signature something-here-too',
									}
								};
								const parsed = tools.auth_header_lib.parse_auth(req);
								expect(parsed.type).to.equal('signature');
								expect(parsed.signature).to.equal('something-here-too');
								done();
							}
						},
						{
							itStatement: 'test lowercase apikey auth test_id=ybenim',
							expectBlock: (done) => {
								const req = {
									headers: {
										'authorization': 'apikey key is here',
									}
								};
								const parsed = tools.auth_header_lib.parse_auth(req);
								expect(parsed.type).to.equal('api_key');
								expect(parsed.api_key).to.equal('key is here');
								done();
							},
						},
						{
							itStatement: 'test uppercase ApiKey auth test_id=ivwvhe',
							expectBlock: (done) => {
								const req = {
									headers: {
										'authorization': 'ApiKey key is here',
									}
								};
								const parsed = tools.auth_header_lib.parse_auth(req);
								expect(parsed.type).to.equal('api_key');
								expect(parsed.api_key).to.equal('key is here');
								done();
							}
						}
					]
				}
			]
		},
		// parse_auth
		{
			suiteDescribe: 'parse_auth',
			mainDescribe: 'Run invalid inputs for parse_auth',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'test unknown authorization str test_id=cmeomj',
							expectBlock: (done) => {
								const req = {
									headers: {
										'Authorization': 'gibberish',
									}
								};
								const parsed = tools.auth_header_lib.parse_auth(req);
								expect(parsed).to.equal(null);
								done();
							}
						},
						{
							itStatement: 'test missing authorization header test_id=ckumnv',
							expectBlock: (done) => {
								const req = {
									headers: {}
								};
								const parsed = tools.auth_header_lib.parse_auth(req);
								expect(parsed).to.equal(null);
								done();
							}
						},
						{
							itStatement: 'test malformed basic auth - missing colon test_id=enqkcd',
							expectBlock: (done) => {
								const req = {
									headers: {
										'authorization': 'Basic ' + tools.misc.b64('username password'), // its missing the colon
									}
								};
								const parsed = tools.auth_header_lib.parse_auth(req);
								expect(parsed.type).to.equal('basic');
								expect(parsed.name).to.equal(null);
								expect(parsed.pass).to.equal(null);
								done();
							}
						},
						{
							itStatement: 'test malformed basic auth - not base 64 test_id=tbwsda',
							expectBlock: (done) => {
								const req = {
									headers: {
										'authorization': 'Basic username:password', 				// its not base64
									}
								};
								const parsed = tools.auth_header_lib.parse_auth(req);
								expect(parsed.type).to.equal('basic');
								expect(parsed.name).to.equal(null);
								expect(parsed.pass).to.equal(null);
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
