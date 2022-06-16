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
// webhook_lib.test.js - Test webhook_lib functions
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const tools = common.tools;
const myutils = require('../../testing-lib/test-middleware');
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);

let webhook_lib;

const createStubs = () => {
	return {
		getDesignDocView: sinon.stub(tools.otcc, 'getDesignDocView'),
		request: sinon.stub(tools, 'request')
	};
};

describe('webhook_lib.js', () => {
	beforeEach(() => {
		tools.stubs = createStubs();
		webhook_lib = require('../../../libs/webhook_lib.js')(common.logger, common.ev, tools);
	});
	afterEach(() => {
		myutils.restoreStubs(tools.stubs);
	});
	const testCollection = [
		/*
	opts = {
		statuses: ["pending"],		// the statuses you want returned
		SKIP_CACHE: false,			// defaults false
		skip: 0,					// number of docs to skip. defaults 0
		limit: 100,					// number of docs to include in response. defaults 100
	}
*/
		// get_all_webhook_docs
		{
			suiteDescribe: 'get_all_webhook_docs',
			mainDescribe: 'Run get_all_webhook_docs',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return one webhook test_id=ojizaa',
							callFunction: () => {
								const get_doc_resp = {
									rows: [{ doc: { status: 'pending' } }]
								};
								tools.stubs.getDesignDocView.callsArgWith(1, null, get_doc_resp);
							},
							expectBlock: (done) => {
								const options = {
									statuses: ['pending'],
									SKIP_CACHE: false,
									skip: 0,
									limits: 100
								};
								webhook_lib.get_all_webhook_docs(options, (err, resp) => {
									expect(err).to.equal(null);
									expect(resp).to.deep.equal({ matches: 1,
										total: undefined,
										webhooks: [ { status: 'pending' } ] });
									return done();
								});
							}
						}
					]
				}
			]
		},
		// get_all_webhooks
		{
			suiteDescribe: 'get_all_webhooks',
			mainDescribe: 'Run get_all_webhooks',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a webhook doc test_id=rcmzky',
							callFunction: () => {
								const get_doc_resp = {
									rows: [{ doc: { status: 'pending', athena_messages: ['sample message'] } }]
								};
								tools.stubs.getDesignDocView.callsArgWith(1, null, get_doc_resp);
							},
							expectBlock: (done) => {
								const options = {
									statuses: ['pending'],
									SKIP_CACHE: false,
									skip: 0,
									limits: 100
								};
								webhook_lib.get_all_webhooks(options, (err, resp) => {
									expect(err).to.equal(null);
									expect(resp).to.deep.equal({ matches: 1,
										total: undefined,
										webhooks:
											[ { athena_messages: [ 'sample message' ],
												message: 'sample message',
												status: 'pending' } ] });
									return done();
								});
							}
						}
					]
				}
			]
		},
		// get_all_template_webhooks
		{
			suiteDescribe: 'get_all_template_webhooks',
			mainDescribe: 'Run get_all_template_webhooks',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should  test_id=sgxegs',
							callFunction: () => {
								const get_doc_resp = {
									rows: [{ doc: { status: 'pending', athena_messages: ['sample message'], sub_type: 'template' } }]
								};
								tools.stubs.getDesignDocView.callsArgWith(1, null, get_doc_resp);
							},
							expectBlock: (done) => {
								const options = {
									statuses: ['pending'],
									SKIP_CACHE: false,
									skip: 0,
									limits: 100
								};
								const req = {
									url: 'https://some_url.com:443?' + JSON.stringify(options)
								};
								webhook_lib.get_all_template_webhooks(req, (err, resp) => {
									expect(err).to.equal(null);
									expect(resp).to.deep.equal({ template_webhooks:
											[ { athena_messages: [ 'sample message' ],
												client_webhook_url: null,
												status: 'pending',
												sub_type: 'template' } ] });
									return done();
								});
							}
						}
					]
				}
			]
		},
		// expire_old_webhooks
		{
			suiteDescribe: 'expire_old_webhooks',
			mainDescribe: 'Run expire_old_webhooks',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return undefined - webhook expired test_id=lzddus',
							callFunction: () => {
								const get_doc_resp = {
									rows: [{ doc: { status: 'pending', athena_messages: ['sample message'], sub_type: 'template' } }]
								};
								tools.stubs.getDesignDocView.callsArgWith(1, null, get_doc_resp);
							},
							expectBlock: (done) => {
								const options = {
									statuses: ['pending'],
									SKIP_CACHE: false,
									skip: 0,
									limits: 100
								};
								const req = {
									url: 'https://some_url.com:443?' + JSON.stringify(options)
								};
								const value = webhook_lib.expire_old_webhooks(req);
								expect(value).to.deep.equal(undefined);
								return done();
							}
						}
					]
				}
			]
		},
		// fetch_webhook_status
		{
			suiteDescribe: 'fetch_webhook_status',
			mainDescribe: 'Run fetch_webhook_status',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the status sent in the body test_id=vdzehr',
							callFunction: () => {
								const response = {
									statusCode: 200,
									msg: 'ok',
									body: JSON.stringify({ status: 'peachy' })
								};
								tools.stubs.request.callsArgWith(1, null, response);
							},
							expectBlock: (done) => {
								webhook_lib.fetch_webhook_status('dallas', (err, resp) => {
									expect(err).to.equal(null);
									expect(resp).to.deep.equal({ status: 'peachy' });
									return done();
								});
							}
						},
						{
							itStatement: 'should return the status sent in the body test_id=hvmoez',
							callFunction: () => {
								const response = {
									statusCode: 500,
									msg: 'not ok',
									body: { status: 'not peachy' }
								};
								tools.stubs.request.callsArgWith(1, null, response);
							},
							expectBlock: (done) => {
								webhook_lib.fetch_webhook_status('dallas', (err, resp) => {
									expect(err).to.deep.equal({ status:'not peachy' });
									expect(resp).to.equal(null);
									return done();
								});
							}
						},
						{
							itStatement: 'should return undefined - no body sent test_id=kasigv',
							callFunction: () => {
								const response = {
									statusCode: 500,
									msg: 'not ok',
									// body: { status: 'not peachy' }
								};
								tools.stubs.request.callsArgWith(1, null, response);
							},
							expectBlock: (done) => {
								webhook_lib.fetch_webhook_status('dallas', (err, resp) => {
									expect(err).to.deep.equal(undefined);
									expect(resp).to.equal(null);
									return done();
								});
							}
						},
					]
				}
			]
		},
	];
	// call main test function to run this test collection
	common.mainTestFunction(testCollection, path_to_current_file);
});
