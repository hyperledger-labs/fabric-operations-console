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
// htp_metrics.test.js - test file for http metrics
//------------------------------------------------------------

const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const tools = common.tools;
tools.cryptoSuite = require('../../../libs/fabric_ca_services/create_crypto_suite.js')(common.logger, common.ev, common.tools).createCryptoSuite();
const myutils = require('../../testing-lib/test-middleware');
const metric_objects = require('../../docs/http_metrics_objects.json');
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);

// Create a request object
const firefox = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:69.0) Gecko/20100101 Firefox/69.0';
const edge = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36 Edge/18.18362';
const chrome = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36';
const postman = 'PostmanRuntime/7.17.1';

const req = {
	headers: {
		'content-type': 'application/json',
		'authorization': 'Basic YWRtaW46cmFuZG9t bearer',
		'user-agent': firefox
	},
	query: {
		'skip_cache': 'yes'
	},
	get: function () {
		return this.headers['user-agent'];
	}
};
function fmt(obj) {
	return JSON.stringify(tools.misc.sortKeys(obj));
}

let http_metrics;


const createStubs = () => {
	return {
		request: sinon.stub(tools, 'request'),
		retry_req: sinon.stub(tools.misc, 'retry_req')
	};
};

describe('Http Metrics Lib', () => {
	before(() => {
		tools.stubs = createStubs();
		http_metrics = require('../../../libs/http_metrics.js')(common.logger, tools);
	});
	after(() => {
		myutils.restoreStubs(tools.stubs);
	});
	const testCollection = [
		// record_user_agent
		{
			suiteDescribe: 'record_user_agent',
			mainDescribe: 'Run record_user_agent',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return deterministic hash for firefox test_id=iadlvj',
							expectBlock: (done) => {
								http_metrics.enable_http_metrics(true);
								const hash = http_metrics.record_user_agent(req);
								expect(hash).to.equal('efbd');
								done();
							}
						},
						{
							itStatement: 'should return deterministic hash for edge test_id=ppcjxg',
							expectBlock: (done) => {
								http_metrics.enable_http_metrics(true);
								req.headers['user-agent'] = edge;
								const hash = http_metrics.record_user_agent(req);
								expect(hash).to.equal('62a1');
								done();
							}
						},
						{
							itStatement: 'should return deterministic hash for chrome test_id=qpnknz',
							expectBlock: (done) => {
								http_metrics.enable_http_metrics(true);
								req.headers['user-agent'] = chrome;
								const hash = http_metrics.record_user_agent(req);
								expect(hash).to.equal('830c');
								done();
							}
						},
						{
							itStatement: 'should return deterministic hash for postman test_id=uqehbc',
							expectBlock: (done) => {
								http_metrics.enable_http_metrics(true);
								req.headers['user-agent'] = postman;
								const hash = http_metrics.record_user_agent(req);
								expect(hash).to.equal('d02f');
								done();
							}
						},
						{
							itStatement: 'should return 4 character hash from short agent test_id=xifhpk',
							expectBlock: (done) => {
								http_metrics.enable_http_metrics(true);
								req.headers['user-agent'] = ' ';
								const hash = http_metrics.record_user_agent(req);
								expect(hash).to.equal('0000');
								done();
							}
						},
						{
							itStatement: 'should return default hash if user agent header missing test_id=ujiqms',
							expectBlock: (done) => {
								http_metrics.enable_http_metrics(true);
								delete req.headers['user-agent'];
								const hash = http_metrics.record_user_agent(req);
								expect(hash).to.equal('0000');
								done();
							}
						},
						{
							itStatement: 'should return 4 character hash from long agent test_id=pnivnj',
							expectBlock: (done) => {
								http_metrics.enable_http_metrics(true);
								req.headers['user-agent'] = edge + edge + edge + edge;
								const hash = http_metrics.record_user_agent(req);
								expect(hash).to.equal('1200');
								done();
							}
						},
					]
				}
			]
		},
		// get_metrics
		{
			suiteDescribe: 'get_metrics',
			mainDescribe: 'Run get_metrics',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return metrics from nothing test_id=wwqwrd',
							expectBlock: (done) => {
								http_metrics.enable_http_metrics(true);
								http_metrics.clear_metrics();
								const metrics = http_metrics.get_metrics(req);
								delete metrics.http_access;		// has timestamp, untestable
								expect(fmt(metrics)).to.equal(JSON.stringify(metric_objects.get_metrics_resp));
								done();
							}
						},
						{
							itStatement: 'should return metrics from firefox call test_id=lwqwrr',
							expectBlock: (done) => {
								http_metrics.enable_http_metrics(true);
								http_metrics.clear_metrics();
								req.headers['user-agent'] = firefox;
								http_metrics.record_user_agent(req);
								const metrics = http_metrics.get_metrics(req);
								delete metrics.http_access;		// has timestamp, untestable
								expect(fmt(metrics)).to.equal(JSON.stringify(metric_objects.get_metrics_resp2));
								done();
							}
						},
						{
							itStatement: 'should return empty metrics b/c disabled test_id=dwqyre',
							expectBlock: (done) => {
								http_metrics.enable_http_metrics(false);
								http_metrics.clear_metrics();
								req.headers['user-agent'] = firefox;
								http_metrics.record_user_agent(req);
								const metrics = http_metrics.get_metrics(req);
								delete metrics.http_access;		// has timestamp, untestable
								expect(fmt(metrics)).to.equal(JSON.stringify(metric_objects.get_metrics_resp3));
								done();
							}
						}
					]
				}
			]
		},
		// get_raw_metrics
		{
			suiteDescribe: 'get_raw_metrics',
			mainDescribe: 'Run get_raw_metrics',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the raw metrics test_id=qxbohd',
							expectBlock: (done) => {
								const metrics = http_metrics.get_raw_metrics();
								expect(metrics).to.deep.equal({
									http_access_max_logs: 10000,
									http_access_format: '<response_date> <process_id> <username> <method> ' +
										'<route> HTTP/<http_version> <status_code> <user_agent_hash> <response_ms> <ip_hash>',
									seen_user_agents: {},
									last_x_days_metrics: { _days: 7, codes: {}, methods: {}, routes: {}, user_agents: {} }
								});
								done();
							}
						}
					]
				}
			]
		},
		// get_aggregated_metrics
		{
			suiteDescribe: 'get_aggregated_metrics',
			mainDescribe: 'Run get_aggregated_metrics',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return lots of metrics test_id=vfthcg',
							expectBlock: (done) => {
								http_metrics.clear_aggregated_metrics();
								http_metrics.append_aggregated_metrics(metric_objects.append_data);
								const data = http_metrics.get_aggregated_metrics(Number.MAX_SAFE_INTEGER);
								metric_objects.response.last_x_days_metrics._days = Number.MAX_SAFE_INTEGER;
								expect(data).to.deep.equal(metric_objects.response);
								done();
							}
						}
					]
				}
			]
		},
		// start
		{
			suiteDescribe: 'start',
			mainDescribe: 'Run start',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the raw metrics test_id=qxbohd',
							expectBlock: (done) => {
								const req = {}, res = {}, next = sinon.spy();
								http_metrics.start(req, res, next);
								sinon.assert.called(next);
								done();
							}
						}
					]
				}
			]
		},
		// get_dynamic_routes
		{
			suiteDescribe: 'get_dynamic_routes',
			mainDescribe: 'Run get_dynamic_routes',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return some routes test_id=ewfiyi',
							expectBlock: (done) => {
								const app = {											// mock an express app object
									stack: {
										something_a: {
											route: {
												methods: { get: true },
												path: ['/api/v1/something/:wildcard']	// should find this one
											}
										},
										something_b: {
											route: {
												methods: { get: true },
												path: ['/api/v1/something']				// should NOT find this one
											}
										},
										something_c: {
											route: {
												methods: { get: true },
												path: '/api/v1/something/here/:yes'		// should find this one
											}
										},
										something_d: {
											route: {
												methods: { _all: true },
												path: '/api/v1/something/optional/?yes'	// should find this one
											}
										},
										something_e: {
											route: {
												methods: { get: true, post: true },
												path: ['/api/v1/something/something/:wild']	// should find this one
											}
										}
									}
								};
								const routes = http_metrics.get_dynamic_routes(app);
								expect(fmt(routes)).to.equal(fmt({
									get: [
										'/api/v1/something/:wildcard',
										'/api/v1/something/here/:yes',
										'/api/v1/something/something/:wild'
									],
									post: [
										'/api/v1/something/something/:wild'
									],
									_all: [
										'/api/v1/something/optional/?yes'
									]
								}));
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
