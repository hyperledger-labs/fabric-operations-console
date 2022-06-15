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
// proxy_apis.test.js - Test proxy_apis
//------------------------------------------------------------
const common = require('../common-test-framework');
const chai = require('chai');
const expect = chai.expect;
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const tools = common.tools;
tools.misc = require('../../../libs/misc.js')(common.logger, common.tools);
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);

const opts = {
	url: 'http://127.0.0.1:5984',
	db_name: 'athena_networks'
};

tools.otcc = require('../../../libs/couchdb.js')(common.logger, tools, opts.url);
tools.middleware = common.tools.middleware;
const myutils = require('../../testing-lib/test-middleware');
// const user_preferences_objects = require('../../docs/user_preferences_objects.json');

const proxy_response = {
	some_property: 'some value',
	some_object: {
		some_array: ['one', 'two']
	},
	another_property: 'some value',
	body: {
		body_prop: 'prop inside the body'
	},
	headers: {
		contentType: 'application/json'
	}
};
const generic_proxy_response = {
	statusCode: 200,
	response: {
		body_prop: 'prop inside the body'
	},
	headers: {
		contentType: 'application/json'
	}
};
const generic_proxy_err_response = {
	statusCode: 500,
	response: {
		msg: 'you messed up bad'
	},
	headers: {
		contentType: 'application/json'
	}
};


let proxy_apis;

chai.use(chaiHttp);

const createStubs = () => {
	return {
		generic_proxy_call: sinon.stub(tools.proxy_lib, 'generic_proxy_call'),
		request: sinon.stub(tools, 'request'),
		retry_req: sinon.stub(tools.misc, 'retry_req')
	};
};

describe('Proxy APIs', () => {
	beforeEach((done) => {
		tools.stubs = createStubs();
		tools.middleware.verify_view_action_session = (req, res, next) => {
			return next();
		};
		proxy_apis = require('../../../routes/proxy_apis.js')(common.logger, common.ev, tools);
		this.app = common.expressApp(proxy_apis);
		done();
	});
	afterEach(() => {
		myutils.restoreStubs(tools.stubs);
	});
	const testCollection = [
		// POST /api/v1/proxy
		{
			suiteDescribe: 'POST /api/v1/proxy',
			mainDescribe: 'Run POST /api/v1/proxy ',
			arrayOfRoutes: ['/api/v1/proxy'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post(routeInfo.route)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a status 200 and the correct response test_id=adjups',
							body: {
								url: 'http://some_url.com',
								query: '?my_query',
								method: 'POST',
								body: {}
							},
							callFunction: () => {
								tools.stubs.generic_proxy_call.callsArgWith(1, generic_proxy_response);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify(generic_proxy_response.response));
							}
						},
						{
							itStatement: 'should return an error - error passed to generic_proxy_call stub test_id=clkcms',
							body: {
								url: 'http://some_url.com',
								query: '?my_query',
								method: 'POST',
								body: { test: '' }
							},
							callFunction: () => {
								tools.stubs.generic_proxy_call.callsArgWith(1, generic_proxy_err_response);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify(generic_proxy_err_response.response));
							}
						}
					]
				}
			]
		},
		// USE /grpcwp/*
		{
			suiteDescribe: 'USE /grpcwp/*',
			mainDescribe: 'Run USE /grpcwp/* ',
			arrayOfRoutes: ['/grpcwp/http%3A%2F%2Fistillneedthisvm.rtp.raleigh.ibm.com%3A8081/test'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post(routeInfo.route)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a status 200 and the correct response test_id=rhgzgw',
							callFunction: () => {
								proxy_response.statusCode = 200;
								tools.stubs.retry_req.callsArgWith(1, null, proxy_response);
							},
							expectBlock: (res) => {
								expect(res.statusCode).to.equal(200);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify(proxy_response.body));
							}
						},
						{
							itStatement: 'should return an error - error passed but no body passed in proxy_response test_id=zuwtjp',
							callFunction: () => {
								proxy_response.statusCode = 500;
								const proxy_response_copy = JSON.parse(JSON.stringify(proxy_response));
								delete proxy_response_copy.body;
								tools.stubs.retry_req.callsArgWith(1, null, proxy_response_copy);
							},
							expectBlock: (res) => {
								expect(res.statusCode).to.equal(500);
								expect(res.status).to.equal(500);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify({}));
							}
						},
						{
							itStatement: 'should return an error - error passed to request stub test_id=ygopfm',
							callFunction: () => {
								const err = {
									statusCode: 500,
									msg: 'problem with request'
								};
								tools.stubs.retry_req.callsArgWith(1, err);
							},
							expectBlock: (res) => {
								expect(res.statusCode).to.equal(500);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify({}));
							}
						}
					]
				}
			]
		},
		// USE /caproxy/*
		{
			suiteDescribe: 'USE /caproxy/*',
			mainDescribe: 'Run USE /caproxy/* ',
			arrayOfRoutes: ['/caproxy/http%3A%2F%2Fistillneedthisvm.rtp.raleigh.ibm.com%3A8081/test'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post(routeInfo.route)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a status 200 and the correct response test_id=xxqpwy',
							callFunction: () => {
								proxy_response.statusCode = 200;
								tools.stubs.retry_req.callsArgWith(1, null, proxy_response);
							},
							expectBlock: (res) => {
								expect(res.statusCode).to.equal(200);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify(proxy_response.body));
							}
						},
						{
							itStatement: 'should return an error - error passed but no body passed in proxy_response test_id=zuwtjp',
							callFunction: () => {
								proxy_response.statusCode = 500;
								const proxy_response_copy = JSON.parse(JSON.stringify(proxy_response));
								delete proxy_response_copy.body;
								tools.stubs.retry_req.callsArgWith(1, null, proxy_response_copy);
							},
							expectBlock: (res) => {
								expect(res.statusCode).to.equal(500);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify({}));
							}
						},
						{
							itStatement: 'should return an error - error passed to request stub test_id=ygopfm',
							callFunction: () => {
								const err = {
									statusCode: 500,
									msg: 'problem with request'
								};
								tools.stubs.retry_req.callsArgWith(1, err);
							},
							expectBlock: (res) => {
								expect(res.statusCode).to.equal(500);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify({}));
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
