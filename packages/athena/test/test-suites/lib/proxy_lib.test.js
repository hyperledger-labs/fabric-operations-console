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
// proxy_lib.js - test for the proxy lib
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const tools = common.tools;
const myutils = require('../../testing-lib/test-middleware.js');
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);

let proxy;

const createStubs = () => {
	return {
		request: sinon.stub(tools, 'request'),
		retry_req: sinon.stub(tools.misc, 'retry_req')
	};
};

describe('proxy_lib.js', () => {
	beforeEach((done) => {
		tools.stubs = createStubs();
		proxy = require('../../../libs/proxy_lib.js')(common.logger, common.ev, tools);
		done();
	});
	afterEach((done) => {
		myutils.restoreStubs(tools.stubs);
		done();
	});
	const testCollection = [
		// generic_proxy_call
		{
			suiteDescribe: 'generic_proxy_call',
			mainDescribe: 'Run generic_proxy_call',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should proxy call and return body from response - no query test_id=lecgqt',
							callFunction: () => {
								const body = JSON.stringify({ prop1: 'prop1' });
								tools.stubs.retry_req.callsArgWith(1, null, { statusCode: 200, body: body });
							},
							expectBlock: (done) => {
								const req = {
									body: {
										method: 'POST',
										url: 'https://somewhere.com',
										prop1: 'prop1'
									}
								};
								proxy.generic_proxy_call(req, (ret) => {
									expect(ret).to.not.equal(null);
									expect(ret.statusCode).to.equal(200);
									expect(ret.response).to.equal(JSON.stringify({ prop1: 'prop1' }));
									done();
								});
							}
						},
						{
							itStatement: 'should proxy call and return error message from response - error sent to stub test_id=fgwhsy',
							callFunction: () => {
								tools.stubs.retry_req.callsArgWith(1, null, { statusCode: 500, body: JSON.stringify({ details: 'jumanji' }) });
							},
							expectBlock: (done) => {
								const req = {
									body: {
										method: 'POST',
										url: 'https://somewhere.com',
										prop1: 'prop15'
									}
								};
								proxy.generic_proxy_call(req, (ret) => {
									expect(ret).to.not.equal(null);
									expect(ret.statusCode).to.equal(500);
									expect(ret.response).to.equal(JSON.stringify({ details: 'jumanji' }));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error and message - no url sent in request test_id=tuhzcp',
							expectBlock: (done) => {
								const req = {
									body: {
										method: 'POST',
										prop1: 'prop1'
									}
								};
								proxy.generic_proxy_call(req, (err) => {
									expect(err.statusCode).to.equal(400);
									expect(JSON.stringify(err)).to.equal(JSON.stringify({ 'statusCode': 400, 'response': 'invalid url' }));
									done();
								});
							}
						},
						{
							itStatement: 'should return error and message - error sent to "validateUrl" stub test_id=gurcor',
							callFunction: () => {
								tools.stubs.validateUrl = sinon.stub(tools.ot_misc, 'validateUrl').returns(false);
							},
							expectBlock: (done) => {
								const req = {
									body: {
										method: 'POST',
										url: 'https://somewhere.com',
										prop1: 'prop1'
									}
								};
								proxy.generic_proxy_call(req, (err) => {
									expect(err.statusCode).to.equal(400);
									expect(JSON.stringify(err)).to.equal(
										JSON.stringify({ 'statusCode': 400, 'response': 'unsafe url. will not send request' })
									);
									done();
								});
							}
						}
					]
				}
			]
		},
		// generic_proxy_call
		{
			suiteDescribe: 'generic_proxy_call',
			mainDescribe: 'Run generic_proxy_call',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return error and message - error sent to "validateUrl" stub test_id=btocoj',
							callFunction: () => {
								tools.stubs.validateUrl = sinon.stub(tools.ot_misc, 'validateUrl').returns(false);
							},
							expectBlock: (done) => {
								const req = {
									body: {
										method: 'POST',
										url: 'https://somewhere.com',
										prop1: 'prop1'
									}
								};
								proxy.grpc_proxy_proxy_call(req, (err) => {
									expect(err.statusCode).to.equal(400);
									expect(JSON.stringify(err)).to.equal(
										JSON.stringify({ 'statusCode': 400, 'response': 'unsafe url. will not send grpcwp request' })
									);
									done();
								});
							}
						},
						{
							itStatement: 'should return error and message - type error sent to "request" stub test_id=ecfxnc',
							callFunction: () => {
								const err = new TypeError('ETIMEDOUT');
								tools.stubs.retry_req.callsArgWith(1, err, { statusCode: 408, etimedout: 'ETIMEDOUT' });
							},
							expectBlock: (done) => {
								const req = {};
								proxy.grpc_proxy_proxy_call(req, (err) => {
									expect(err.statusCode).to.equal(408);
									expect(JSON.stringify(err)).to.equal(JSON.stringify({ 'statusCode': 408 }));
									done();
								});
							}
						}
					]
				}
			]
		},
		// ca_proxy_call
		{
			suiteDescribe: 'ca_proxy_call',
			mainDescribe: 'Run ca_proxy_call',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return no errors and a message of "ok" test_id=dgwwrs',
							callFunction: () => {
								tools.stubs.validateUrl = sinon.stub(tools.ot_misc, 'validateUrl').returns(true);
								tools.stubs.retry_req.callsArgWith(1, null, { body: { statusCode: 200, msg: 'ok' } });
							},
							expectBlock: (done) => {
								const req = {
									body: {
										method: 'POST',
										url: 'https://somewhere.com',
										prop1: 'prop1'
									}
								};
								proxy.ca_proxy_call(req, (resp) => {
									expect(resp).to.deep.equal({ headers: undefined,
										response: { msg: 'ok', statusCode: 200 },
										statusCode: 500 });
									tools.stubs.validateUrl.restore();
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
