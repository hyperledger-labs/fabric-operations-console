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
		get_all_components_api: sinon.stub(tools.deployer, 'get_all_components_api'),
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
		component_apis = require('../../../routes/component_apis.js')(common.logger, common.ev, tools);
		this.app = common.expressApp(component_apis);
		done();
	});
	afterEach(() => {
		myutils.restoreStubs(tools.stubs);
	});

	// aka import component
	const add_component = () => {
		return [
			{
				itStatement: 'should return a status 200 and the correct response test_id=qygmxb',
				body: node_api_objects.fabric_ca_body,
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
					expect(res.statusCode).to.equal(200);
					res.body = tools.misc.sortItOut(res.body);
					node_api_objects.write_node_response = tools.misc.sortItOut(node_api_objects.write_node_response);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify(node_api_objects.write_node_response));
				}
			},
			/* no more legacy support
			{
				itStatement: 'given legacy input should return a status 200 - test_id=nelslg',
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
					console.log('sent', routeInfo.route, JSON.stringify(routeInfo.body));
					console.log('\ngot', routeInfo.route, JSON.stringify(res.body));
					expect(res.statusCode).to.equal(200);
					res.body = tools.misc.sortItOut(res.body);
					node_api_objects.write_node_response = tools.misc.sortItOut(node_api_objects.write_node_response);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify(node_api_objects.write_node_response));
					tools.stubs.buildDoc = sinon.stub(tools.component_lib, 'buildDoc');
				}
			},
			*/
			{
				itStatement: 'should return a status 200 and the correct response - no short name or type test_id=eqbree',
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

					if (res.req.path.includes('/ak/')) {
						const write_node_response = tools.misc.sortItOut(node_api_objects.write_node_response);
						write_node_response.display_name = 'ca_node';
						expect(JSON.stringify(res.body)).to.equal(JSON.stringify(write_node_response));
					} else {
						const write_node_response_session = tools.misc.sortItOut(node_api_objects.write_node_response_session);
						write_node_response_session.display_name = 'ca_node';
						expect(JSON.stringify(res.body)).to.equal(JSON.stringify(write_node_response_session));
					}
				}
			},
			{
				itStatement: 'should return a status of 500 - sinon passed error to createNewDoc test_id=aqztca',
				body: node_api_objects.fabric_ca_body,
				username: 'admin',
				password: 'random',
				callFunction: () => {
					const err = {};
					err.statusCode = 500;
					err.msg = 'problem creating the node';
					tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
					tools.stubs.createNewDoc.callsArgWith(2, err);
					tools.stubs.buildDoc.restore();
				},
				expectBlock: (res, routeInfo) => {
					//console.log('sent', routeInfo.route, JSON.stringify(routeInfo.body));
					//console.log('\ngot', routeInfo.route, JSON.stringify(res.body));
					expect(res.status).to.equal(500);
				}
			},
			/*{
				itStatement: 'should return a status of 500 and an error message - no url was passed test_id=xcivlv',
				body: node_api_objects.fabric_ca_body,
				username: 'admin',
				password: 'random',
				callFunction: (routeInfo) => {
					routeInfo.body.api_url = null;
					tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
					tools.stubs.buildDoc.restore();
				},
				expectBlock: (res) => {
					expect(res.statusCode).to.equal(500);
					expect(res.body.msg[0]).to.equal('Expected "api_url" to be String but got undefined');
					node_api_objects.fabric_ca_body.url = 'https://url.looking.thingy.com';
					tools.stubs.buildDoc = sinon.stub(tools.component_lib, 'buildDoc');
				}
			},*/
		];
	};

	// comment
	const edit_component = () => {
		return [
			{
				itStatement: 'should return a status of 200 and the correctly edited version of the node doc test_id=vwktsa',
				body: node_api_objects.edit_node_request_body,
				username: 'admin',
				password: 'random',
				callFunction: () => {
					tools.stubs.getDoc.callsArgWith(1, null, node_api_objects.get_single_node_response_body);
					tools.stubs.writeDoc.callsArgWith(2, null, node_api_objects.edited_node_response_body);
				},
				expectBlock: (res, routeInfo) => {
					//console.log('sent', routeInfo.route, JSON.stringify(routeInfo.body));
					//console.log('\ngot', routeInfo.route, JSON.stringify(res.body));
					expect(res.status).to.equal(200);
					res.body = tools.misc.sortItOut(res.body);
					node_api_objects.edited_node_response_body = tools.misc.sortItOut(node_api_objects.edited_node_response_body);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify(node_api_objects.edited_node_response_body));
				}
			},
			{
				itStatement: 'should return a status of 200 and the correctly edited version of the node doc test_id=qropwa',
				body: node_api_objects.edit_node_request_body,
				username: 'admin',
				password: 'random',
				callFunction: () => {
					const get_response = JSON.parse(JSON.stringify(node_api_objects.get_single_node_response_body));
					get_response.cluster_id = 1;
					get_response.cluster_name = 'my cluster';
					const rows = [
						{
							key: ['cluster_id', '1']
						},
						{
							key: ['doc_id', '2']
						}
					];
					tools.stubs.getDesignDocView.callsArgWith(1, null, { rows });
					tools.stubs.getDoc.callsArgWith(1, null, get_response);
					tools.stubs.writeDoc.callsArgWith(2, null, node_api_objects.edited_node_response_body);
				},
				expectBlock: (res, routeInfo) => {
					//console.log('sent', routeInfo.route, JSON.stringify(routeInfo.body));
					//console.log('\ngot', routeInfo.route, JSON.stringify(res.body));
					expect(res.status).to.equal(200);
					res.body = tools.misc.sortItOut(res.body);
					node_api_objects.edited_node_response_body = tools.misc.sortItOut(node_api_objects.edited_node_response_body);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify(node_api_objects.edited_node_response_body));
				}
			},
			{
				itStatement: 'should return a status of 400 - edited extra key error -  test_id=aimxnt',
				body: node_api_objects.invalid_edit_node_request_body2,
				username: 'admin',
				password: 'random',
				callFunction: () => {
					tools.stubs.getDoc.callsArgWith(1, null, node_api_objects.get_single_node_response_body);
					tools.stubs.writeDoc.callsArgWith(2, null, node_api_objects.edited_node_response_body);
				},
				expectBlock: (res, routeInfo) => {
					expect(res.status).to.equal(400);
					res.body = tools.misc.sortItOut(res.body);

					if (res.req.path.includes('/ak/')) {
						node_api_objects.invalid_edit_node_response2 = tools.misc.sortItOut(node_api_objects.invalid_edit_node_response2);
						expect(JSON.stringify(res.body)).to.equal(JSON.stringify(node_api_objects.invalid_edit_node_response2));
					} else {
						const invalid_edit_node_response_apollo = tools.misc.sortItOut(node_api_objects.invalid_edit_node_response_apollo);
						expect(JSON.stringify(res.body)).to.equal(JSON.stringify(invalid_edit_node_response_apollo));
					}
				}
			},
			{
				itStatement: 'should return a status of 400 -  test_id=rqpqgp',
				body: node_api_objects.invalid_edit_node_request_body,
				username: 'admin',
				password: 'random',
				callFunction: () => {
					tools.stubs.getDoc.callsArgWith(1, null, node_api_objects.get_single_node_response_body);
					tools.stubs.writeDoc.callsArgWith(2, null, node_api_objects.edited_node_response_body);
				},
				expectBlock: (res, routeInfo) => {
					expect(res.status).to.equal(400);
					res.body = tools.misc.sortItOut(res.body);

					if (res.req.path.includes('/ak/')) {
						node_api_objects.invalid_edit_response = tools.misc.sortItOut(node_api_objects.invalid_edit_response);
						expect(JSON.stringify(res.body)).to.equal(JSON.stringify(node_api_objects.invalid_edit_response));
					} else {
						const invalid_edit_response_apollo = tools.misc.sortItOut(node_api_objects.invalid_edit_response_apollo);
						expect(JSON.stringify(res.body)).to.equal(JSON.stringify(invalid_edit_response_apollo));
					}
				}
			},
			{
				itStatement: 'should return an error while getting the doc to edit - stub passed an error to getDoc test_id=anucej',
				body: node_api_objects.edit_node_request_body,
				username: 'admin',
				password: 'random',
				callFunction: () => {
					const err = {};
					err.statusCode = 404;
					err.msg = 'problem getting doc';
					tools.stubs.getDoc.callsArgWith(1, err);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(404);
					expect(res.body.statusCode).to.equal(404);
					expect(res.body.msg).to.equal('no components by this id exist');
				}
			},
			{
				itStatement: 'should return an error while writing the edited doc back to the db - stub passed error test_id=fksvzq',
				body: node_api_objects.edit_node_request_body,
				username: 'admin',
				password: 'random',
				callFunction: () => {
					const err = {};
					err.statusCode = 500;
					err.msg = 'problem writing doc';
					tools.stubs.getDoc.callsArgWith(1, null, node_api_objects.get_single_node_response_body);
					tools.stubs.writeDoc.callsArgWith(2, err);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(res.body.msg).to.equal('problem writing doc');
				}
			}
		];
	};

	const delete_component = () => {
		return [
			{
				itStatement: 'should return a status 200 and the correct response test_id=zhkpxg',
				body: node_api_objects.fabric_ca_body,
				username: 'admin',
				password: 'random',
				callFunction: () => {
					const doc = JSON.parse(JSON.stringify(node_api_objects.fabric_ca_body));
					tools.stubs.getDoc.callsArgWith(1, null, doc);
					const fullResponse = JSON.parse(JSON.stringify(node_api_objects.get_nodes_full_response));
					tools.stubs.getDesignDocView.callsArgWith(1, fullResponse, null);
					tools.stubs.rebuildWhiteList.callsArgWith(1, null);
					tools.stubs.repeatDelete.callsArgWith(2, null, {
						ok: true,
						id: 'peer2020-import',
						rev: '2-df6c0a1fef6cc913773a86ae3209e924',
						doc:
						{
							_id: 'peer2020-import',
							_rev: '1-a450b68701b5902934ada9851379d2e6',
							display_name: 'peer2020-import',
							location: 'ibmcloud',
							msp_id: 'msp1',
							scheme_version: 'v1',
							timestamp: 1579615609063,
							tls_cert: 'pem here',
							type: 'fabric-peer'
						}
					});
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify(
						{ message: 'deleted', id: 'peer2020-import', display_name: 'peer2020-import', 'type': 'fabric-peer' }
					));
					sinon.assert.calledWith(tools.stubs.repeatDelete, sinon.match(node_api_objects.delete_opts));
				}
			},
			{
				itStatement: 'should return an error and the correct error message test_id=geavzs',
				body: node_api_objects.fabric_ca_body,
				username: 'admin',
				password: 'random',
				callFunction: () => {
					const doc = JSON.parse(JSON.stringify(node_api_objects.fabric_ca_body));
					tools.stubs.getDoc.callsArgWith(1, null, doc);
					const err = {};
					err.statusCode = 500;
					err.msg = 'problem deleting the node';
					tools.stubs.repeatDelete.callsArgWith(2, err);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(res.body.statusCode).to.equal(500);
					expect(res.body.msg).to.equal('problem deleting the node');
				}
			},
			{
				itStatement: 'should return a 200 and the correct error message test_id=mtcvpj',
				body: node_api_objects.fabric_ca_body,
				username: 'admin',
				password: 'random',
				callFunction: () => {
					const doc = JSON.parse(JSON.stringify(node_api_objects.fabric_ca_body));
					tools.stubs.getDoc.callsArgWith(1, null, doc);
					const err = {};
					err.statusCode = 404;
					err.msg = 'problem deleting the node';
					tools.stubs.repeatDelete.callsArgWith(2, err);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(res.body.message).to.equal('id no longer exists. already deleted?');
					// expect(res.body.id).to.equal('test_id');
				}
			}
		];
	};

	const get_component = () => {
		return [
			{
				itStatement: 'should return a status of 200 and the node requested test_id=tyzonv',
				callFunction: () => {
					const doc = JSON.parse(JSON.stringify(node_api_objects.fabric_ca_body));
					tools.stubs.getDoc.callsArgWith(1, null, doc);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					res.body = tools.misc.sortItOut(res.body);

					if (res.req.path === '/api/v1/components/test-id') {
						const session_response = tools.misc.sortItOut(node_api_objects.single_node_response);
						expect(JSON.stringify(res.body)).to.equal(JSON.stringify(session_response));
					} else if (res.req.path === '/ak/api/v1/components/test-id') {
						const ak_response = tools.misc.sortItOut(node_api_objects.single_node_ak_response);
						expect(JSON.stringify(res.body)).to.equal(JSON.stringify(ak_response));
					}
				}
			},
			{
				itStatement: 'should return a status of 404 and the node requested test_id=klofdu',
				callFunction: () => {
					const err = {};
					err.statusCode = 404;
					err.msg = 'problem getting node';
					tools.stubs.getDoc.callsArgWith(1, err);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(404);
					expect(res.body.statusCode).to.equal(404);
					expect(res.body.msg).to.equal('no components by this id exist');
				}
			}
		];
	};

	const get_component_with_resources = () => {
		return [
			{
				itStatement: 'should return a status 200 and the component doc with resources test_id=mvgyvo',
				callFunction: () => {
					const doc = JSON.parse(JSON.stringify(node_api_objects.fabric_ca_body));
					tools.stubs.getDoc.callsArgWith(1, null, doc);
					tools.stubs.get_component_api.callsArgWith(1, null, node_api_objects.deployer_mock_response);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					res.body = tools.misc.sortItOut(res.body);
					res.body.last_k8s_sync_ts = 0;
					if (res.req.path === '/api/v2/components/test-id?deployment_attrs=included') {
						const session_response = tools.misc.sortItOut(node_api_objects.single_node_response3);
						expect(res.body).to.deep.equal(session_response);
					} else {
						const ak_response = tools.misc.sortItOut(node_api_objects.single_node_ak_response3);
						expect(res.body).to.deep.equal(ak_response);
					}
				}
			},
		];
	};

	const get_component_without_resources = () => {
		return [
			{
				itStatement: 'should return a status 200 and the component doc with resources test_id=mvgyv1',
				callFunction: () => {
					const doc = JSON.parse(JSON.stringify(node_api_objects.fabric_ca_body));
					tools.stubs.getDoc.callsArgWith(1, null, doc);
					tools.stubs.get_component_api.callsArgWith(1, null, node_api_objects.deployer_mock_response);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					res.body = tools.misc.sortItOut(res.body);
					if (res.req.path === '/api/v2/components/test-id?include=invalid_value') {
						const session_response = tools.misc.sortItOut(node_api_objects.single_node_response);
						expect(JSON.stringify(res.body)).to.equal(JSON.stringify(session_response));
					} else {
						const ak_response = tools.misc.sortItOut(node_api_objects.single_node_ak_response);
						expect(JSON.stringify(res.body)).to.equal(JSON.stringify(ak_response));
					}
				}
			},
		];
	};

	const get_all_components = () => {
		return [
			{
				itStatement: 'should return a status 200 and the correct response test_id=cvdttl',
				body: node_api_objects.fabric_ca_body,
				username: 'admin',
				password: 'random',
				callFunction: () => {
					const fullResponse = JSON.parse(JSON.stringify(node_api_objects.get_nodes_full_response));
					tools.stubs.getDesignDocView.callsArgWith(1, null, fullResponse);
				},
				expectBlock: (res, routeInfo) => {
					//console.log('sent', routeInfo.route, JSON.stringify(routeInfo.body));
					//console.log('\ngot', routeInfo.route, JSON.stringify(res.body));
					expect(res.status).to.equal(200);
					res.body = tools.misc.sortKeys(res.body);

					if (res.req.path === '/ak/api/v1/components') {
						let ak_result = JSON.parse(JSON.stringify(node_api_objects.get_components_all_response_ak));
						ak_result = tools.misc.sortKeys(ak_result);
						expect(JSON.stringify(res.body)).to.equal(JSON.stringify(ak_result));
					} else if (res.req.path === '/api/v1/components') {
						let result = JSON.parse(JSON.stringify(node_api_objects.get_components_all_response_session));
						result = tools.misc.sortKeys(result);
						expect(JSON.stringify(res.body)).to.equal(JSON.stringify(result));
					}
				}
			},
			{
				itStatement: 'should return an error test_id=zbzimf',
				body: node_api_objects.fabric_ca_body,
				username: 'admin',
				password: 'random',
				callFunction: () => {
					const err = {};
					err.statusCode = 404;
					err.msg = 'problem getting nodes';
					tools.stubs.getDesignDocView.callsArgWith(1, err, null);
				},
				expectBlock: (res) => {
					expect(res.body.statusCode).to.equal(404);
					expect(res.body.msg).to.equal('problem getting nodes');
				}
			}
		];
	};

	const get_all_components_dsh = () => {
		return [
			{
				itStatement: 'should return all components types formatted correctly [v2] (no dep data) test_id=wspsdw',
				body: null,
				username: 'admin',
				password: 'random',
				callFunction: () => {
					const fullResponse = JSON.parse(JSON.stringify(node_api_objects.couchdb_full_resp_all_comp_types_v2));
					tools.stubs.getDesignDocView.callsArgWith(1, null, fullResponse);
				},
				expectBlock: (res, routeInfo) => {
					tools.stubs.getDesignDocView.restore();
					//console.log('sent', routeInfo.route, JSON.stringify(routeInfo.body));
					//console.log('\ngot', routeInfo.route, JSON.stringify(res.body));
					expect(res.status).to.equal(200);

					if (res.req.path.includes('/ak/api/v2/components')) {
						let ak_result = JSON.parse(JSON.stringify(node_api_objects.get_all_comp_types_resp_ak));
						expect(res.body).to.deep.equal(ak_result);
					} else {
						let result = JSON.parse(JSON.stringify(node_api_objects.get_all_comp_types_resp_saas));
						expect(res.body).to.deep.equal(result);
					}
				}
			}
		];
	};

	const get_all_components_dsh_dep = () => {
		return [{
			itStatement: 'should return all components types formatted correctly [v2] (include dep data) test_id=afpdwf',
			body: null,
			username: 'admin',
			password: 'random',
			callFunction: () => {
				const fullResponse = JSON.parse(JSON.stringify(node_api_objects.couchdb_full_resp_all_comp_types_v2));
				tools.stubs.getDesignDocView.callsArgWith(1, null, fullResponse);
				tools.stubs.get_all_components_api.callsArgWith(1, null, {});
			},
			expectBlock: (res, routeInfo) => {
				tools.stubs.getDesignDocView.restore();
				tools.stubs.get_all_components_api.restore();
				//console.log('sent', routeInfo.route, JSON.stringify(routeInfo.body));
				//console.log('\ngot', routeInfo.route, JSON.stringify(res.body));
				expect(res.status).to.equal(200);

				if (res.req.path.includes('/ak/api/v2/components')) {
					let ak_result = JSON.parse(JSON.stringify(node_api_objects.get_all_comp_types_resp_ak_include_dep));
					expect(res.body).to.deep.equal(ak_result);
				} else {
					let result = JSON.parse(JSON.stringify(node_api_objects.get_all_comp_types_resp_saas_include_dep));
					expect(res.body).to.deep.equal(result);
				}
			}
		}, {
			itStatement: 'should return all components types formatted correctly [v2] (include dep data) *ecert str* test_id=cofdbv',
			body: null,
			username: 'admin',
			password: 'random',
			callFunction: () => {
				const fullResponse = JSON.parse(JSON.stringify(node_api_objects.couchdb_full_resp_ecert_v2));
				tools.stubs.getDesignDocView.callsArgWith(1, null, fullResponse);
				tools.stubs.get_all_components_api.callsArgWith(1, null, {});
			},
			expectBlock: (res, routeInfo) => {
				tools.stubs.getDesignDocView.restore();
				tools.stubs.get_all_components_api.restore();
				//console.log('sent', routeInfo.route, JSON.stringify(routeInfo.body));
				//console.log('\ngot', routeInfo.route, JSON.stringify(res.body));
				expect(res.status).to.equal(200);

				if (res.req.path.includes('/ak/api/v2/components')) {
					let ak_result = JSON.parse(JSON.stringify(node_api_objects.get_all_comp_types_resp_ak_include_dep));
					expect(res.body).to.deep.equal(ak_result);
				} else {
					let result = JSON.parse(JSON.stringify(node_api_objects.get_all_comp_types_resp_saas_include_dep));
					expect(res.body).to.deep.equal(result);
				}
			}
		}];
	};

	const get_all_components_dsh_v3 = () => {
		return [
			{
				itStatement: 'should return all components types formatted correctly [v3] (no dep data) test_id=qlkdws',
				body: null,
				username: 'admin',
				password: 'random',
				callFunction: () => {
					const fullResponse = JSON.parse(JSON.stringify(node_api_objects.couchdb_full_resp_all_comp_types_v2));
					tools.stubs.getDesignDocView.callsArgWith(1, null, fullResponse);
				},
				expectBlock: (res, routeInfo) => {
					tools.stubs.getDesignDocView.restore();
					//console.log('sent', routeInfo.route, JSON.stringify(routeInfo.body));
					//console.log('\ngot', routeInfo.route, JSON.stringify(res.body));
					expect(res.status).to.equal(200);

					if (res.req.path.includes('/ak/api/v3/components')) {
						let ak_result = JSON.parse(JSON.stringify(node_api_objects.get_all_comp_types_resp_ak_v3));
						expect(res.body).to.deep.equal(ak_result);
					} else {
						let result = JSON.parse(JSON.stringify(node_api_objects.get_all_comp_types_resp_saas_v3));
						expect(res.body).to.deep.equal(result);
					}
				}
			}
		];
	};

	const get_all_components_dsh_dep_v3 = () => {
		return [{
			itStatement: 'should return all components types formatted correctly [v3] (include dep data) test_id=dlwdfe',
			body: null,
			username: 'admin',
			password: 'random',
			callFunction: () => {
				const fullResponse = JSON.parse(JSON.stringify(node_api_objects.couchdb_full_resp_all_comp_types_v2));
				tools.stubs.getDesignDocView.callsArgWith(1, null, fullResponse);
				tools.stubs.get_all_components_api.callsArgWith(1, null, {});
			},
			expectBlock: (res, routeInfo) => {
				tools.stubs.getDesignDocView.restore();
				tools.stubs.get_all_components_api.restore();
				//console.log('sent', routeInfo.route, JSON.stringify(routeInfo.body));
				//console.log('\ngot', routeInfo.route, JSON.stringify(res.body));
				expect(res.status).to.equal(200);

				if (res.req.path.includes('/ak/api/v3/components')) {
					let ak_result = JSON.parse(JSON.stringify(node_api_objects.get_all_comp_types_resp_ak_include_dep_v3));
					expect(res.body).to.deep.equal(ak_result);
				}
			}
		}];
	};

	const add_bulk_components = () => {
		return [
			{
				itStatement: 'should return a status 200 and the correct response test_id=cajbpw',
				username: 'admin',
				password: 'random',
				body: node_api_objects.add_bulk_components,
				callFunction: () => {
					const fullResponse = JSON.parse(JSON.stringify(node_api_objects.get_nodes_full_response));
					tools.stubs.getDesignDocView.callsArgWith(1, fullResponse, null);
					tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
					tools.stubs.createNewDoc.callsArgWith(2, null, node_api_objects.write_node_response);
					tools.stubs.rebuildWhiteList.callsArgWith(1, null);
					tools.stubs.buildDoc.restore();
				},
				expectBlock: (res) => {
					const respArray = [];
					const singleResponse = tools.misc.sortItOut(node_api_objects.write_node_response);
					res.body = tools.misc.sortItOut(res.body);
					for (let i = 0; i < node_api_objects.add_bulk_components.length; i++) {
						respArray.push(JSON.parse(JSON.stringify(singleResponse)));
					}
					expect(res.status).to.equal(200);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ errors: [], successes: respArray }));
					tools.stubs.buildDoc = sinon.stub(tools.component_lib, 'buildDoc');
				}
			},
			{
				itStatement: 'should return a status of 500 - sinon passed error to createNewDoc test_id=ljvctm',
				username: 'admin',
				password: 'random',
				body: node_api_objects.add_bulk_components,
				callFunction: () => {
					const err = {};
					err.statusCode = 500;
					err.msg = 'problem creating the node';
					tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
					tools.stubs.createNewDoc.callsArgWith(2, err);
					tools.stubs.buildDoc.restore();
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(207);
					tools.stubs.buildDoc = sinon.stub(tools.component_lib, 'buildDoc');
				}
			}
		];
	};

	const bulk_delete = () => {
		return [
			{
				itStatement: 'should return a status of 200 and the correct message - valid responses from stubbed callbacks test_id=gxhkze',
				callFunction: () => {
					tools.stubs.getDesignDocView.callsArgWith(1, null, { rows: [{ doc: { prop1: 'value1', type: 'fabric-ca' } }] });
					tools.stubs.offboard_component = sinon.stub(tools.component_lib, 'offboard_component').callsArgWith(1, null);
				},
				expectBlock: (res, routeInfo) => {
					expect(res.status).to.equal(200);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({
						'removed': [{ 'message': 'deleted', type: 'fabric-ca' }]
					}));
				}
			},
			{
				itStatement: 'should return an error and message - error passed to "offboard_component" stub test_id=zdhynz',
				callFunction: () => {
					tools.stubs.getDesignDocView.callsArgWith(1, null, { rows: [{ doc: { prop1: 'value1', type: 'fabric-ca' } }] });
					tools.stubs.offboard_component = sinon.stub(tools.component_lib, 'offboard_component').callsArgWith(1, {
						statusCode: 500,
						msg: 'problem offboarding one or more components'
					});
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(207);
					expect(typeof res.body.removed[0].tx_id).to.equal('string');
					delete res.body.removed[0].tx_id;
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({
						'removed': [{ 'statusCode': 500, 'message': 'problem offboarding one or more components', 'type': 'fabric-ca' }]
					}));
				}
			},
			{
				itStatement: 'should return an error and message - error passed to "get_components_by_tag" stub test_id=tymprq',
				callFunction: () => {
					tools.stubs.get_components_by_tag = sinon.stub(tools.component_lib, 'get_components_by_tag').callsArgWith(2, {
						statusCode: 500,
						msg: 'problem getting components by tag'
					});
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({
						'statusCode': 500,
						'msg': 'problem getting components by tag',
					}));
				}
			},
			{
				itStatement: 'should return error b/c no components to delete - 0 comps passed to "get_components_by_tag" stub test_id=bhhbfk',
				callFunction: () => {
					tools.stubs.getDesignDocView.callsArgWith(1, null, []);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(404);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({
						'statusCode': 404,
						'msg': 'no components by tag exist',
						'reason': 'missing',
						'components': [],
					}));
				}
			},
			{
				itStatement: 'should return an error and message - error passed to "getDesignDocView" stub test_id=mblmwy',
				callFunction: () => {
					tools.stubs.getDesignDocView.callsArgWith(1, { statusCode: 500, msg: 'problem getting components' });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({
						'statusCode': 500,
						'msg': 'problem getting components',
					}));
				}
			},
		];
	};

	const testCollection = [
		// POST /api/v2/components - Add/import a component
		{
			suiteDescribe: 'POST /api/v2/components',
			mainDescribe: 'Run POST /api/v2/components',
			arrayOfRoutes: ['/api/v2/components'],
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
					arrayOfInfoToTest: add_component()
				}
			]
		},
		// POST /ak/api/v2/components - Add/import  a component
		{
			suiteDescribe: 'POST /ak/api/v2/components?skip_cache=yes',
			mainDescribe: 'Run POST /ak/api/v2/components?skip_cache=yes',
			arrayOfRoutes: ['/ak/api/v2/components?skip_cache=yes'],
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
					arrayOfInfoToTest: add_component()
				}
			]
		},
		// PUT /api/v2/components/fabric-ca/:id - Edit a component
		{
			suiteDescribe: 'PUT /api/v2/components/:id',
			mainDescribe: 'PUT Run /api/v2/components/:id',
			arrayOfRoutes: ['/api/v2/components/test-component'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.put(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: edit_component()
				}
			]
		},
		// PUT /ak/api/v2/components/fabric-ca/:id - Edit a component
		{
			suiteDescribe: 'PUT /ak/api/v2/components/fabric-ca/:id',
			mainDescribe: 'PUT Run /ak/api/v2/components/fabric-ca/:id',
			arrayOfRoutes: ['/ak/api/v2/components/fabric-ca/test-component'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.put(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: edit_component()
				}
			]
		},
		// DELETE /api/v1/components/:component_id - Delete component
		{
			suiteDescribe: 'DELETE /api/v1/components/:component_id',
			mainDescribe: 'Run DELETE /api/v1/components/:component_id ',
			arrayOfRoutes: ['/api/v1/components/test_id'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.delete(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: delete_component()
				}
			]
		},
		// DELETE /ak/api/v1/components/:component_id - Delete component
		{
			suiteDescribe: 'DELETE /ak/api/v1/components/:component_id',
			mainDescribe: 'Run DELETE /ak/api/v1/components/:component_id ',
			arrayOfRoutes: ['/ak/api/v1/components/test_id'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.delete(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: delete_component()
				}
			]
		},
		// GET /api/v1/components/:id - Get the component for the id passed in
		{
			suiteDescribe: 'GET /api/v1/components/:id',
			mainDescribe: 'Run GET /api/v1/components/:id',
			arrayOfRoutes: ['/api/v1/components/test-id'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_component()
				}
			]
		},
		// GET /ak/api/v1/components/:id - Get the component for the id passed in
		{
			suiteDescribe: 'GET /ak/api/v1/components/:id',
			mainDescribe: 'Run GET /ak/api/v1/components/:id',
			arrayOfRoutes: ['/ak/api/v1/components/test-id'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_component()
				}
			]
		},
		// GET /api/v2/components/:id - Get the component for the id passed in with resources
		{
			suiteDescribe: 'GET /api/v2/components/:id?deployment_attrs=included',
			mainDescribe: 'Run GET /api/v2/components/:id?deployment_attrs=included',
			arrayOfRoutes: ['/api/v2/components/test-id?deployment_attrs=included'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_component_with_resources()
				}
			]
		},
		// GET /ak/api/v2/components/:id - Get the component for the id passed in with resources
		{
			suiteDescribe: 'GET /ak/api/v2/components/:id?deployment_attrs=included',
			mainDescribe: 'Run GET /ak/api/v2/components/:id?deployment_attrs=included',
			arrayOfRoutes: ['/ak/api/v2/components/test-id?deployment_attrs=included'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_component_with_resources()
				}
			]
		},
		// GET /ak/api/v2/components/:id - Get the component for the id passed in without resources b/c bad parameter value
		{
			suiteDescribe: 'GET /ak/api/v2/components/:id?include=incorrect_value',
			mainDescribe: 'Run GET /ak/api/v2/components/:id?include=incorrect_value',
			arrayOfRoutes: ['/ak/api/v2/components/test-id?include=incorrect_value'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_component_without_resources()
				}
			]
		},
		// GET /api/v2/components - Get all components
		{
			suiteDescribe: 'GET /api/v2/components',
			mainDescribe: 'Run GET /api/v2/components ',
			arrayOfRoutes: ['/api/v2/components'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_all_components()
				}
			]
		},
		// GET /ak/api/v2/components - Get all components
		{
			suiteDescribe: 'GET /ak/api/v2/components',
			mainDescribe: 'Run GET /ak/api/v2/components ',
			arrayOfRoutes: ['/ak/api/v2/components'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_all_components()
				}
			]
		},

		// GET /api/v2/components - Get all components - dsh version (apollo)
		{
			suiteDescribe: 'GET /api/v2/components',
			mainDescribe: 'Run GET /api/v2/components ',
			arrayOfRoutes: ['/api/v2/components'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_all_components_dsh()
				}
			]
		},
		// GET /ak/api/v2/components - Get all components - dsh version (ak)
		{
			suiteDescribe: 'GET /ak/api/v2/components',
			mainDescribe: 'Run GET /ak/api/v2/components',
			arrayOfRoutes: ['/ak/api/v2/components'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_all_components_dsh()
				}
			]
		},

		// GET /api/v2/components - Get all components w/dep data - dsh version (apollo)
		{
			suiteDescribe: 'GET /api/v2/components?deployment_attrs=included',
			mainDescribe: 'Run GET /api/v2/components?deployment_attrs=included',
			arrayOfRoutes: ['/api/v2/components?deployment_attrs=included'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_all_components_dsh_dep()
				}
			]
		},
		// GET /ak/api/v2/components - Get all components w/dep data - dsh version (ak)
		{
			suiteDescribe: 'GET /ak/api/v2/components?deployment_attrs=included',
			mainDescribe: 'Run GET /ak/api/v2/components?deployment_attrs=included',
			arrayOfRoutes: ['/ak/api/v2/components?deployment_attrs=included'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_all_components_dsh_dep()
				}
			]
		},

		// GET /api/v3/components - Get all components - dsh version (apollo) [v3]
		{
			suiteDescribe: 'GET /api/v3/components',
			mainDescribe: 'Run GET /api/v3/components ',
			arrayOfRoutes: ['/api/v3/components'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_all_components_dsh_v3()
				}
			]
		},
		// GET /ak/api/v3/components - Get all components - dsh version (ak) [v3]
		{
			suiteDescribe: 'GET /ak/api/v3/components',
			mainDescribe: 'Run GET /ak/api/v3/components',
			arrayOfRoutes: ['/ak/api/v3/components'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_all_components_dsh_v3()
				}
			]
		},

		// GET /ak/api/v3/components - Get all components w/dep data - dsh version (ak) [v3]
		{
			suiteDescribe: 'GET /ak/api/v3/components?deployment_attrs=included',
			mainDescribe: 'Run GET /ak/api/v3/components?deployment_attrs=included',
			arrayOfRoutes: ['/ak/api/v3/components?deployment_attrs=included'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_all_components_dsh_dep_v3()
				}
			]
		},

		// POST /api/v1/components/bulk - Add bulk components
		{
			suiteDescribe: 'POST /api/v1/components/bulk',
			mainDescribe: 'Run POST /api/v1/components/bulk',
			arrayOfRoutes: ['/api/v1/components/bulk'],
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
					arrayOfInfoToTest: add_bulk_components()
				}
			]
		},
		// POST /ak/api/v1/components/bulk - Add bulk components
		{
			suiteDescribe: 'POST /ak/api/v1/components/bulk',
			mainDescribe: 'Run POST /ak/api/v1/components/bulk',
			arrayOfRoutes: ['/ak/api/v1/components/bulk'],
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
					arrayOfInfoToTest: add_bulk_components()
				}
			]
		},

		// DELETE /api/v1/components/:component_id - Bulk delete components
		{
			suiteDescribe: 'DELETE /api/v1/components/tags/:tag',
			mainDescribe: 'Run DELETE /api/v1/components/tags/:tag ',
			arrayOfRoutes: ['/api/v1/components/tags/test-tag'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.delete(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: bulk_delete()
				}
			]
		},
		// DELETE /ak/api/v1/components/:component_id - Bulk delete components
		{
			suiteDescribe: 'DELETE /ak/api/v1/components/tags/:tag',
			mainDescribe: 'Run DELETE /ak/api/v1/components/tags/:tag ',
			arrayOfRoutes: ['/ak/api/v1/components/tags/test-tag'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.delete(routeInfo.route)
					.auth(routeInfo.username, routeInfo.password)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: bulk_delete()
				}
			]
		},
	];
	// call main test function to run this test collection
	common.mainTestFunction(testCollection, path_to_current_file);
});
