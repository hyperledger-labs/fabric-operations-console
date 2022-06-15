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
// component_apis.test.js - Test component_apis
//------------------------------------------------------------
const common = require('../common-test-framework');
const chai = require('chai');
const expect = chai.expect;
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const tools = common.tools;
const myutils = require('../../testing-lib/test-middleware.js');
let node_api_objects = require('../../docs/component_api_objects.json');
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);
common.ev.PROXY_TLS_FABRIC_REQS = true;

// replace all occurrences of $TEST-CERT with our testing certificate string (which is in the field TEST-CERT)
node_api_objects = JSON.parse(JSON.stringify(node_api_objects).replace(/\$TEST-CERT/g, node_api_objects['TEST-CERT']));

// Tools passed in
tools.misc = require('../../../libs/misc.js')(common.logger, common.tools);
tools.middleware = common.tools.middleware;
tools.otcc = common.tools.otcc;
tools.component_lib = common.tools.component_lib;

common.ev.ACCESS_LIST = {
	'someone_else@us.ibm.com': { 'roles': ['manager'], },
	'admin': {
		'roles': ['manager'],
		'salt': 'test-admin',
		'hashed_secret': 'test-admin'
	}
};

common.ev.SUPPORT_KEY = 'support_person';
common.ev.SUPPORT_PASSWORD = 'random';

// Will be initialized in the before block but should be defined here for global access
let component_apis;


chai.use(chaiHttp);

const createStubs = () => {
	return {
		getDoc: sinon.stub(tools.otcc, 'getDoc'),
		getDesignDocView: sinon.stub(tools.otcc, 'getDesignDocView'),
		createNewDoc: sinon.stub(tools.otcc, 'createNewDoc'),
		repeatDelete: sinon.stub(tools.otcc, 'repeatDelete'),
		writeDoc: sinon.stub(tools.otcc, 'writeDoc'),
		getUuid: sinon.stub(tools.middleware, 'getUuid').returns('abcdef'),
		getEnrollIdFromCert: sinon.stub(tools.misc, 'getEnrollIdFromCert'),
		request: sinon.stub(tools, 'request'),
		buildDoc: sinon.stub(tools.component_lib, 'buildDoc'),
		verify_secret: sinon.stub(tools.misc, 'verify_secret').returns(true),
		getAllIds: sinon.stub(tools.component_lib, 'getAllIds'),
		rebuildWhiteList: sinon.stub(tools.component_lib, 'rebuildWhiteList'),
		get_component_api: sinon.stub(tools.deployer, 'get_component_api'),
	};
};

describe('Component APIs', () => {
	beforeEach((done) => {
		tools.stubs = createStubs(); // add stubs to the tools objects that gets passed to the apis we're testing
		tools.middleware.verify_view_action_session = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_view_action_ak = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_create_action_session = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_import_action_ak = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_create_action_ak = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_remove_action_session = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_remove_action_ak = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_delete_action_session = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_delete_action_ak = (req, res, next) => {
			return next();
		};
		component_apis = require('../../../routes/legacy/component_apis_v1.js')(common.logger, common.ev, tools);
		this.app = common.expressApp(component_apis);
		done();
	});
	afterEach(() => {
		myutils.restoreStubs(tools.stubs);
	});


	// v1
	const add_component_legacy = () => {
		return [
			{
				itStatement: 'test v1 - should return a status 200 and the correct response test_id test_id=erremz',
				body: node_api_objects.fabric_ca_body_legacy,
				username: 'admin',
				password: 'random',
				callFunction: () => {
					const fullResponse = JSON.parse(JSON.stringify(node_api_objects.get_nodes_full_response));
					tools.stubs.getDesignDocView.callsArgWith(1, fullResponse, null);
					tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
					tools.stubs.createNewDoc.callsArgWith(2, null, node_api_objects.write_node_response);
					tools.stubs.rebuildWhiteList.callsArgWith(1, null);
					tools.stubs.buildDoc.restore();
				},
				expectBlock: (res, routeInfo) => {
					//console.log('sent', routeInfo.route, JSON.stringify(routeInfo.body));
					//console.log('\ngot', routeInfo.route, JSON.stringify(res.body));
					expect(res.statusCode).to.equal(200);
					res.body = tools.misc.sortItOut(res.body);
					node_api_objects.write_node_response_legacy = tools.misc.sortItOut(node_api_objects.write_node_response_legacy);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify(node_api_objects.write_node_response_legacy));
				}
			},
			{
				itStatement: 'should return a status 200 and the correct response - no short name or type test_id=pvydud',
				body: node_api_objects.fabric_ca_node_body_with_enroll_info_no_short_name_or_type,
				username: 'admin',
				password: 'random',
				callFunction: () => {
					const full_response = JSON.parse(JSON.stringify(node_api_objects.get_nodes_full_response));
					const write_response = JSON.parse(JSON.stringify(node_api_objects.write_node_response));
					tools.stubs.getDesignDocView.callsArgWith(1, full_response, null);
					tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
					tools.stubs.createNewDoc.callsArgWith(2, null, write_response);
					tools.stubs.rebuildWhiteList.callsArgWith(1, null);
					tools.stubs.buildDoc.restore();
				},
				expectBlock: (res, routeInfo) => {
					//console.log('sent', routeInfo.route, JSON.stringify(routeInfo.body));
					//console.log('\ngot', routeInfo.route, JSON.stringify(res.body));
					expect(res.status).to.equal(200);
					res.body = tools.misc.sortItOut(res.body);
					const write_node_response = tools.misc.sortItOut(node_api_objects.write_node_response);
					write_node_response.display_name = 'ca_node';
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({
						'additional_property': 'some additional property',
						'api_url': '<some url w/protocol and port here>',
						'backend_addr': '<some url w/protocol and port here>',
						'ca_name': 'org1CA',
						'ca_url': '<some url w/protocol and port here>',
						'display_name': 'ca_node',
						'id': '6e08fe0e990f73593300df411f013036',
						'location': '<geo location description>',
						'msp_id': 'PeerOrg1',
						'name': 'ca_node',
						'node_type': 'fabric-ca',
						'scheme_version': 'v0',
						'short_name': '6e08fe0e990f73593300df411f013036',
						'timestamp': 1537262855753,
						'type': 'fabric-ca',
						'users': [{ 'affiliation': 'org1', 'enroll_id': 'admin', 'enroll_secret': 'bla' }] }
					));
				}
			},
			{
				itStatement: 'no enroll id/secret should still return a success response test_id=xagizh',
				body: node_api_objects.fabric_ca_node_body_with_enroll_info,
				username: 'admin',
				password: 'random',
				callFunction: () => {
					tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
					tools.stubs.rebuildWhiteList.callsArgWith(1, null);
					delete node_api_objects.fabric_ca_node_body_with_enroll_info.enroll_id;
					delete node_api_objects.fabric_ca_node_body_with_enroll_info.enroll_secret;
					node_api_objects.fabric_ca_node_body_with_enroll_info.body_type = 'fabric-ca';
					node_api_objects.fabric_ca_node_body_with_enroll_info.certificate = 'cert';
					node_api_objects.fabric_ca_node_body_with_enroll_info.private_key = 'pk';
					tools.stubs.createNewDoc.callsArgWith(2, null, node_api_objects.write_node_response);
					tools.stubs.getEnrollIdFromCert.returns(undefined);
					tools.stubs.buildDoc.restore();
				},
				expectBlock: (res, routeInfo) => {
					expect(res.status).to.equal(200);
					node_api_objects.fabric_ca_node_body_with_enroll_info.enroll_id = 'admin';
					node_api_objects.fabric_ca_node_body_with_enroll_info.enroll_secret = 'secret';
					delete node_api_objects.fabric_ca_node_body_with_enroll_info.body_type;
					delete node_api_objects.fabric_ca_node_body_with_enroll_info.certificate;
					delete node_api_objects.fabric_ca_node_body_with_enroll_info.private_key;
				}
			},
			{
				itStatement: 'no cert/private key should still return a success response test_id=tssjww',
				body: node_api_objects.fabric_ca_node_body_with_enroll_info,
				username: 'admin',
				password: 'random',
				callFunction: () => {
					tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
					tools.stubs.rebuildWhiteList.callsArgWith(1, null);
					delete node_api_objects.fabric_ca_node_body_with_enroll_info.enroll_id;
					delete node_api_objects.fabric_ca_node_body_with_enroll_info.enroll_secret;
					node_api_objects.fabric_ca_node_body_with_enroll_info.body_type = 'fabric-ca';
					tools.stubs.createNewDoc.callsArgWith(2, null, node_api_objects.write_node_response);
					tools.stubs.getEnrollIdFromCert.returns(undefined);
					tools.stubs.buildDoc.restore();
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					node_api_objects.fabric_ca_node_body_with_enroll_info.enroll_id = 'admin';
					node_api_objects.fabric_ca_node_body_with_enroll_info.enroll_secret = 'secret';
					delete node_api_objects.fabric_ca_node_body_with_enroll_info.body_type;
				}
			},
			{
				itStatement: 'should return no errors - no enroll id passed but one is generated from cert test_id=qetars',
				body: node_api_objects.fabric_ca_node_body_with_enroll_info_no_enroll_id,
				username: 'admin',
				password: 'random',
				callFunction: () => {
					const fullResponse = JSON.parse(JSON.stringify(node_api_objects.get_nodes_full_response));
					tools.stubs.getDesignDocView.callsArgWith(1, fullResponse, null);
					tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
					tools.stubs.createNewDoc.callsArgWith(2, null, node_api_objects.write_node_response);
					tools.stubs.getEnrollIdFromCert.returns('enroll id');
					tools.stubs.rebuildWhiteList.callsArgWith(1, null);
					tools.stubs.buildDoc.restore();
				},
				expectBlock: (res, routeInfo) => {
					expect(res.status).to.equal(200);
					expect(res.body.msg).to.equal(undefined);
				}
			},
			{
				itStatement: 'should return a 500 error - build doc stubbed and returns an error test_id=pvoseg',
				body: node_api_objects.fabric_ca_node_body_with_enroll_info,
				username: 'admin',
				password: 'random',
				callFunction: () => {
					const err = {};
					err.statusCode = 500;
					err.msg = 'problem building doc';
					tools.stubs.buildDoc.callsArgWith(1, err);
					tools.component_lib.buildDoc.restore();
					sinon.stub(tools.component_lib, 'buildDoc').callsArgWith(1, err);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(res.body.statusCode).to.equal(500);
					expect(res.body.msg).to.equal('problem building doc');
					tools.component_lib.buildDoc.restore();
				}
			},
			{
				itStatement: 'should return a 500 error - createNewDoc returns an error test_id=yrcyqo',
				body: node_api_objects.fabric_ca_node_body_with_enroll_info,
				username: 'admin',
				password: 'random',
				callFunction: () => {
					const err = {};
					err.statusCode = 500;
					err.msg = 'problem building doc';
					tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
					tools.stubs.createNewDoc.callsArgWith(2, err);
					tools.stubs.buildDoc.restore();
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(res.body.statusCode).to.equal(500);
				}
			}
		];
	};

	const testCollection = [
		// POST /api/v1/components - Add/import a component
		{
			suiteDescribe: 'POST /api/v1/components',
			mainDescribe: 'Run POST /api/v1/components',
			arrayOfRoutes: ['/api/v1/components'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: add_component_legacy()
				}
			]
		},
	];
	// call main test function to run this test collection
	common.mainTestFunction(testCollection, path_to_current_file);
});
