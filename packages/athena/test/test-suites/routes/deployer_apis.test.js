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
// deployer_apis.test.js - Test deployer_apis
//------------------------------------------------------------
const common = require('../common-test-framework');
const chai = require('chai');
const expect = chai.expect;
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const tools = common.tools;
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);
const myutils = require('../../testing-lib/test-middleware');
const deployer_objects = require('../../docs/deployer_objects.json');
const component_objects = require('../../docs/component_api_objects.json');

let deployer_apis;
let deployer_lib;

chai.use(chaiHttp);

const createStubs = () => {
	return {
		safe_dot_nav: sinon.stub(tools.misc, 'safe_dot_nav'),
		getDoc: sinon.stub(tools.otcc, 'getDoc'),
		getDesignDocView: sinon.stub(tools.otcc, 'getDesignDocView'),
		offboard_component: sinon.stub(tools.component_lib, 'offboard_component'),
		load_component_by_id: sinon.stub(tools.component_lib, 'load_component_by_id'),
		get_code: sinon.stub(tools.ot_misc, 'get_code'),
		store_webhook_doc: sinon.stub(tools.webhook, 'store_webhook_doc'),
		uniqueRandomString: sinon.stub(tools.misc, 'uniqueRandomString').returns('test_id'),
		get_webhook_doc: sinon.stub(tools.webhook, 'get_webhook_doc'),
		getAllIds: sinon.stub(tools.component_lib, 'getAllIds'),
		retry_req: sinon.stub(tools.misc, 'retry_req'),
		get_all_components: sinon.stub(tools.component_lib, 'get_all_components')
	};
};

describe('Deployer APIs', () => {
	beforeEach((done) => {
		tools.stubs = createStubs();
		tools.middleware.verify_create_action_session = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_create_action_ak = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_delete_action_session = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_delete_action_ak = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_view_action_session = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_view_action_ak = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_manage_action_session = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_manage_action_ak = (req, res, next) => {
			return next();
		};

		tools.middleware.verify_manage_action_session_dep = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_manage_action_ak_dep = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_view_action_session_dep = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_view_action_ak_dep = (req, res, next) => {
			return next();
		};

		tools.component_lib.rebuildWhiteList = (req, cb) => {
			return cb();
		};

		deployer_lib = tools.deployer;
		tools.stubs.record_deployer_operation = sinon.stub(deployer_lib, 'record_deployer_operation').callsArgWith(4, null, { prop: 'something here' });
		tools.stubs.send_actions = sinon.stub(deployer_lib, 'send_actions').callsArgWith(1, null);
		deployer_apis = require('../../../routes/deployer_apis.js')(common.logger, common.ev, tools);
		this.app = common.expressApp(deployer_apis);
		done();
	});
	afterEach(() => {
		myutils.restoreStubs(tools.stubs);
	});

	// create component tests
	const provision_tests = () => {
		return [
			{
				itStatement: 'should return a 400 - empty body object test_id=cqxmov',
				callFunction: () => {
					tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [] });
					tools.stubs.safe_dot_nav.returns({});
					tools.stubs.retry_req.callsArgWith(1, null, {
						statusCode: 200,
						body: JSON.stringify(component_objects.single_node_response)
					});
					tools.stubs.record_deployer_operation.callsArgWith(4, null, component_objects.single_node_response);
				},
				expectBlock: (res, routeInfo) => {
					//console.log('sent', routeInfo.route, JSON.stringify(routeInfo.body));
					//console.log('\ngot', routeInfo.route, JSON.stringify(res.body));
					expect(res.status).to.equal(400);
					if (routeInfo.route.indexOf('/components/') >= 0) {	// the route with no component type does not have a slash near 'components' in route
						expect(JSON.stringify(res.body)).to.equal(JSON.stringify(deployer_objects.empty_body_error));
					} else {
						if (routeInfo.route.includes('/ak/')) {
							expect(JSON.stringify(res.body)).to.equal(JSON.stringify(deployer_objects.missing_type_error));
						} else {
							expect(JSON.stringify(res.body)).to.equal(JSON.stringify(deployer_objects.missing_type_error_apollo));
						}
					}
				}
			},
			{
				itStatement: 'should return 200 - stubs for a good response test_id=lcjqzq',
				callFunction: (routeInfo) => {
					tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [] });
					const route_parts = routeInfo.route.split('/');
					routeInfo.type = route_parts[route_parts.length - 1];
					const body_name = `${routeInfo.type}_body`;
					deployer_apis.str_raft = common.ev.STR.RAFT;
					routeInfo.body = JSON.parse(JSON.stringify(deployer_objects[body_name]));
					deployer_apis.conserve_CRN = common.ev.CRN;
					common.ev.CRN = { instance_id: 123 };
					tools.stubs.retry_req.callsArgWith(1, null, {
						statusCode: 200,
						body: JSON.stringify(component_objects.single_node_response)
					});
					tools.stubs.safe_dot_nav.returns({});
					tools.stubs.record_deployer_operation.callsArgWith(4, null, component_objects.single_node_response);
				},
				expectBlock: (res, routeInfo) => {
					expect(res.status).to.equal(200);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify(component_objects.single_node_response));
					common.ev.CRN = deployer_apis.conserve_CRN;
					delete deployer_apis.conserve_CRN;
					tools.stubs.safe_dot_nav.reset();
				}
			},
			{
				itStatement: 'should return an error and the error body - many component types - test_id=qbxjgt',
				callFunction: (routeInfo) => {
					tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [] });
					const route_parts = routeInfo.route.split('/');
					const type = route_parts[route_parts.length - 1];
					const invalid_body_name = `${type}_invalid_body`;
					const body = JSON.parse(JSON.stringify(deployer_objects[invalid_body_name]));
					tools.stubs.get_code.returns(400);
					tools.stubs.retry_req.callsArgWith(1, null, {
						statusCode: 200,
						body: body
					});
					body.type = common.ev.STR.PEER;
					routeInfo.body = body;
					deployer_apis.str_raft = common.ev.STR.RAFT;
					common.ev.STR.RAFT = 'something else';
				},
				expectBlock: (res, routeInfo) => {
					const route_parts = routeInfo.route.split('/');
					const type = route_parts[route_parts.length - 1];
					const invalid_resp_name = `${type}_invalid_response`;

					expect(res.status).to.equal(400);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify(deployer_objects[invalid_resp_name]));

					common.ev.STR.RAFT = deployer_apis.str_raft;
					delete deployer_apis.str_raft;
				}
			},
			{
				itStatement: 'should return an error - missing type in body - test_id=pbsamd',
				body: null,
				callFunction: (routeInfo) => {
					tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [] });
					const route_parts = routeInfo.route.split('/');
					const type = route_parts[route_parts.length - 1];
					const correct_body_name = `${type}_body`;
					const body = JSON.parse(JSON.stringify(deployer_objects[correct_body_name]));
					tools.stubs.get_code.returns(400);
					tools.stubs.retry_req.callsArgWith(1, null, {
						statusCode: 200,
						body: body
					});
					delete body.type;
					routeInfo.body = body;
					deployer_apis.str_raft = common.ev.STR.RAFT;
					common.ev.STR.RAFT = 'something else';
				},
				expectBlock: (res, routeInfo) => {
					//console.log('sent', routeInfo.route, JSON.stringify(routeInfo.body));
					//console.log('\ngot', routeInfo.route, JSON.stringify(res.body));
					const ignore_test = routeInfo.route.indexOf('fabric-') > -1;	// skip tests that have the type in the url, they will not error
					if (!ignore_test) {
						if (routeInfo.route.indexOf('/components/') >= 0) {	// the route with no component type does not have a slash near 'components' in route
							expect(res.status).to.equal(400);
							expect(JSON.stringify(res.body)).to.equal(JSON.stringify(deployer_objects.error_body));
						} else {
							expect(res.status).to.equal(400);
							if (routeInfo.route.includes('/ak/')) {
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify(deployer_objects.missing_type_error_apollo));
							}
						}
					}
					common.ev.STR.RAFT = deployer_apis.str_raft;
					delete deployer_apis.str_raft;
				}
			},
			{
				itStatement: 'should return an error and the error body - error sent to record_deployer_operation stub test_id=bynvub',
				callFunction: (routeInfo) => {
					tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [] });
					const route_parts = routeInfo.route.split('/');
					routeInfo.type = route_parts[route_parts.length - 1];
					const correct_body_name = `${routeInfo.type}_body`;
					const body = JSON.parse(JSON.stringify(deployer_objects[correct_body_name]));
					routeInfo.body = body;
					tools.stubs.get_code.restore();
					tools.stubs.safe_dot_nav.returns({});
					tools.stubs.retry_req.callsArgWith(1, null, {
						statusCode: 200,
						body: JSON.stringify(body)
					});
					tools.stubs.record_deployer_operation.callsArgWith(4, { statusCode: 500, msg: 'problem provisioning component' });
				},
				expectBlock: (res, routeInfo) => {
					expect(res.status).to.equal(500);
					const error_body = JSON.parse(JSON.stringify(deployer_objects.error_record_deployer_op_failed));
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify(error_body));
				}
			},
			{
				itStatement: 'should return error - error passed to request inside send_dep_req test_id=xpahau',
				callFunction: (routeInfo) => {
					const route_parts = routeInfo.route.split('/');
					routeInfo.type = route_parts[route_parts.length - 1];
					const correct_body_name = `${routeInfo.type}_body`;
					const body = JSON.parse(JSON.stringify(deployer_objects[correct_body_name]));
					routeInfo.body = body;
					tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [] });
					tools.stubs.get_code.restore();
					tools.stubs.safe_dot_nav.returns({});
					tools.stubs.retry_req.callsArgWith(1, null, {
						statusCode: 500,
						body: {
							statusCode: 500,
							msg: 'problem provisioning component'
						}
					});
				},
				expectBlock: (res, routeInfo) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({
						'statusCode': 500,
						'msg': { 'statusCode': 500, 'msg': 'problem provisioning component' }
					}));
				}
			},
			{
				itStatement: 'should return error - error passed to request inside send_dep_req test_id=nixnxg',
				body: JSON.stringify(deployer_objects.peer_body),
				callFunction: (routeInfo) => {
					const route_parts = routeInfo.route.split('/');
					routeInfo.type = route_parts[route_parts.length - 1];
					const correct_body_name = `${routeInfo.type}_body`;
					const body = JSON.parse(JSON.stringify(deployer_objects[correct_body_name]));
					routeInfo.body = body;
					tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [] });
					tools.stubs.get_code.restore();
					tools.stubs.safe_dot_nav.returns({});
					tools.stubs.retry_req.callsArgWith(1, null, {
						statusCode: 500,
						body: {}
					});
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'statusCode': 500, 'msg': {} }));
				}
			},
			{
				itStatement: 'should return an error - error passed to request inside send_dep_req is not json test_id=jthxha',
				body: JSON.stringify(deployer_objects.peer_body),
				callFunction: (routeInfo) => {
					const route_parts = routeInfo.route.split('/');
					routeInfo.type = route_parts[route_parts.length - 1];
					const correct_body_name = `${routeInfo.type}_body`;
					const body = JSON.parse(JSON.stringify(deployer_objects[correct_body_name]));
					routeInfo.body = body;
					tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [] });
					tools.stubs.get_code.restore();
					tools.stubs.safe_dot_nav.returns({});
					tools.stubs.retry_req.callsArgWith(1, null, {
						statusCode: 500,
						body: 'string response is a problem'
					});
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({ 'statusCode': 500, 'msg': 'body received from deployer was not valid JSON' })
					);
				}
			},
			{
				itStatement: 'should return an error and the error body - error passed to request inside send_dep_req test_id=sijjuj',
				body: JSON.stringify(deployer_objects.peer_body),
				callFunction: (routeInfo) => {
					const route_parts = routeInfo.route.split('/');
					routeInfo.type = route_parts[route_parts.length - 1];
					const correct_body_name = `${routeInfo.type}_body`;
					const body = JSON.parse(JSON.stringify(deployer_objects[correct_body_name]));
					routeInfo.body = body;
					tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [] });
					tools.stubs.get_code.restore();
					tools.stubs.safe_dot_nav.returns({});
					tools.stubs.retry_req.callsArgWith(1, null, { statusCode: 500, body: { message: 'there was an issue' } });
					tools.stubs.record_deployer_operation.callsArgWith(4, null, { prop: 'something here' });
				},
				expectBlock: (res, routeInfo) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ statusCode: 500, msg: { message: 'there was an issue' } }));
				}
			},
			{
				itStatement: 'should return 200 - id has underscores - test_id=oslucl',
				callFunction: (routeInfo) => {
					tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [] });
					const route_parts = routeInfo.route.split('/');
					routeInfo.type = route_parts[route_parts.length - 1];
					const body_name = `${routeInfo.type}_body`;
					deployer_apis.str_raft = common.ev.STR.RAFT;
					routeInfo.body = JSON.parse(JSON.stringify(deployer_objects[body_name]));
					routeInfo.body.id = 'test_with_underscores';
					deployer_apis.conserve_CRN = common.ev.CRN;
					common.ev.CRN = { instance_id: 123 };
					tools.stubs.retry_req.callsArgWith(1, null, {
						statusCode: 200,
						body: JSON.stringify(component_objects.single_node_response)
					});
					tools.stubs.safe_dot_nav.returns({});
					tools.stubs.record_deployer_operation.callsArgWith(4, null, component_objects.single_node_response);
				},
				expectBlock: (res, routeInfo) => {
					expect(res.status).to.equal(200);
					common.ev.CRN = deployer_apis.conserve_CRN;
					delete deployer_apis.conserve_CRN;
					tools.stubs.safe_dot_nav.reset();
				}
			},
			{
				itStatement: 'should return 200 - id has dashes - test_id=nsxhqk',
				callFunction: (routeInfo) => {
					tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [] });
					const route_parts = routeInfo.route.split('/');
					routeInfo.type = route_parts[route_parts.length - 1];
					const body_name = `${routeInfo.type}_body`;
					deployer_apis.str_raft = common.ev.STR.RAFT;
					routeInfo.body = JSON.parse(JSON.stringify(deployer_objects[body_name]));
					routeInfo.body.id = 'test-with-dashes';
					deployer_apis.conserve_CRN = common.ev.CRN;
					common.ev.CRN = { instance_id: 123 };
					tools.stubs.retry_req.callsArgWith(1, null, {
						statusCode: 200,
						body: JSON.stringify(component_objects.single_node_response)
					});
					tools.stubs.safe_dot_nav.returns({});
					tools.stubs.record_deployer_operation.callsArgWith(4, null, component_objects.single_node_response);
				},
				expectBlock: (res, routeInfo) => {
					expect(res.status).to.equal(200);
					common.ev.CRN = deployer_apis.conserve_CRN;
					delete deployer_apis.conserve_CRN;
					tools.stubs.safe_dot_nav.reset();
				}
			},
		];
	};

	const update_tests = () => {
		return [
			{
				itStatement: 'should return a 200 status - all passed params were okay to pass test_id=zjdfce',
				callFunction: () => {
					tools.stubs.load_component_by_id.restore();
					tools.stubs.getDoc.callsArgWith(1, null, component_objects.get_components_fabric_orderer_good_ak_response);
					tools.stubs.retry_req.callsArgWith(1, null, {
						statusCode: 200,
						body: JSON.stringify(component_objects.single_node_response)
					});
					tools.stubs.record_deployer_operation.callsArgWith(4, null, component_objects.single_node_response);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify(component_objects.single_node_response));
				}
			},
			{
				itStatement: 'should return an error - error passed to "getDoc" stub test_id=imvpxk',
				callFunction: () => {
					tools.stubs.load_component_by_id.restore();
					tools.stubs.getDoc.callsArgWith(1, { statusCode: 500, msg: 'problem updating component ' });
					tools.stubs.get_code.restore();
				},
				expectBlock: (res, routeInfo) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ msg: 'unable to look up component by id', statusCode: 500, }));
					tools.stubs.get_code = sinon.stub(tools.ot_misc, 'get_code');
				}
			},
			{
				itStatement: 'should return an error - error passed to "record_deployer_operation" stub test_id=urydrq',
				callFunction: () => {
					tools.stubs.load_component_by_id.restore();
					tools.stubs.getDoc.callsArgWith(1, null, component_objects.get_components_fabric_orderer_good_ak_response);
					tools.stubs.get_code.restore();
					tools.stubs.retry_req.callsArgWith(1, null, {
						statusCode: 200,
						body: JSON.stringify(component_objects.single_node_response)
					});
					tools.stubs.record_deployer_operation.callsArgWith(4, { statusCode: 500, msg: 'problem updating component ' });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ statusCode: 500, msg: 'problem updating component ' }));
					tools.stubs.get_code = sinon.stub(tools.ot_misc, 'get_code');

				}
			},
			{
				itStatement: 'should return an error and the error body - error passed to request inside send_dep_req test_id=sijjuj',
				body: JSON.stringify(deployer_objects.peer_body),
				callFunction: () => {
					tools.stubs.load_component_by_id.restore();
					tools.stubs.getDoc.callsArgWith(1, null, component_objects.get_components_fabric_orderer_good_ak_response);
					tools.stubs.get_code.returns(200);
					tools.stubs.retry_req.callsArgWith(1, null, { body: 'unexpected format here' });
					tools.stubs.record_deployer_operation.callsArgWith(4, null, { prop: 'something here' });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({
						'statusCode': 500,
						'msg': 'body received from deployer was not valid JSON'
					}));

				}
			}
		];
	};

	const send_genesis_block = () => {
		return [
			{
				itStatement: 'should return a 200 status and the correct response test_id=xsevnv',
				callFunction: () => {
					tools.stubs.getDoc.callsArgWith(1, null, component_objects.get_components_fabric_orderer_good_ak_response);
					tools.stubs.retry_req.callsArgWith(1, null, {
						statusCode: 200,
						body: JSON.stringify(component_objects.single_node_response)
					});
					tools.stubs.record_deployer_operation.callsArgWith(4, null, component_objects.single_node_response);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify(component_objects.single_node_response));
				}
			},
			{
				itStatement: 'should return an error - error passed to "getDoc" stub test_id=imvpxk',
				callFunction: () => {
					tools.stubs.getDoc.callsArgWith(1, { statusCode: 500, msg: 'problem updating component ' });
					tools.stubs.get_code.restore();
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ statusCode: 500, msg: 'problem updating component ' }));
					tools.stubs.get_code = sinon.stub(tools.ot_misc, 'get_code');
				}
			},
		];
	};

	const purge_components = () => {
		return [
			{
				itStatement: 'should return a 200 status and the correct response test_id=crfmbg',
				callFunction: () => {
					const full_response = JSON.parse(JSON.stringify(component_objects.get_nodes_full_response));
					tools.stubs.load_component_by_id.restore();
					tools.stubs.offboard_component.callsArgWith(1, null);
					tools.stubs.getDesignDocView.callsArgWith(1, null, full_response);
					tools.stubs.getDoc.callsArgWith(1, null, component_objects.get_components_fabric_orderer_good_ak_response);
					tools.stubs.retry_req.callsArgWith(1, null, {
						statusCode: 200,
						body: JSON.stringify(component_objects.single_node_response)
					});
				},
				expectBlock: (res, routeInfo) => {
					expect(res.status).to.equal(200);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({
							'deleted': [
								{ 'message': 'deleted', 'id': 'peer2020', 'display_name': 'peer2020', 'type': 'fabric-peer' },
								{ 'message': 'deleted', 'id': 'ca2020', 'display_name': 'ca2020', 'type': 'fabric-ca' }
							]
						})
					);
				}
			},
			{
				itStatement: 'should return an error - error passed to getDesignDocView test_id=eeeyty',
				callFunction: () => {
					const full_response = JSON.parse(JSON.stringify(component_objects.get_nodes_full_response));
					full_response.rows[0].doc = {};
					tools.stubs.get_code.returns(500);
					tools.stubs.getDesignDocView.callsArgWith(1, { statusCode: 500, 'msg': 'problem deleting all components' });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ statusCode: 500, 'msg': 'problem deleting all components' }));
				}
			},
			{
				itStatement: 'should return a 200 status and the correct response - location is "ibm_saas" test_id=bwjjfm',
				callFunction: () => {
					const full_response = JSON.parse(JSON.stringify(component_objects.get_nodes_full_response));
					tools.stubs.load_component_by_id.restore();
					full_response.rows[0].doc = { location: 'ibm_saas' };
					tools.stubs.offboard_component.callsArgWith(1, null);
					tools.stubs.getDesignDocView.callsArgWith(1, null, full_response);
					tools.stubs.getDoc.callsArgWith(1, null, component_objects.get_components_fabric_orderer_good_ak_response);
					tools.stubs.retry_req.callsArgWith(1, null, {
						statusCode: 200,
						body: JSON.stringify(component_objects.single_node_response)
					});
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({
							'deleted': [
								{ 'message': 'deleted', 'type': '???' },
								{ 'message': 'deleted', 'id': 'ca2020', 'display_name': 'ca2020', 'type': 'fabric-ca' }
							]
						})
					);
				}
			},
			{
				itStatement: 'should return should return an error - error passed to getDesignDocView - location is "ibm_saas" test_id=ryjvmy',
				callFunction: () => {
					const full_response = JSON.parse(JSON.stringify(component_objects.get_nodes_full_response));
					full_response.rows[0].doc = { location: 'ibm_saas' };
					tools.stubs.get_code.returns(500);
					tools.stubs.getDesignDocView.callsArgWith(1, { statusCode: 500, 'msg': 'problem deleting all components' });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ statusCode: 500, 'msg': 'problem deleting all components' }));
				}
			}
		];
	};

	const delete_component = () => {
		return [
			{
				itStatement: 'should return a 200 status and the correct response test_id=oomhot',
				callFunction: () => {
					tools.stubs.load_component_by_id.restore();
					tools.stubs.getDoc.callsArgWith(1, null, component_objects.get_components_fabric_orderer_good_ak_response);
					tools.stubs.retry_req.callsArgWith(1, null, {
						statusCode: 200,
						body: JSON.stringify(component_objects.single_node_response)
					});
					tools.stubs.record_deployer_operation.callsArgWith(4, null, component_objects.single_node_response);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify(component_objects.single_node_response));

				}
			},
			{
				itStatement: 'should return an error and the error body - error passed to request inside send_dep_req test_id=nkvxbo',
				callFunction: () => {
					tools.stubs.load_component_by_id.restore();
					tools.stubs.getDoc.callsArgWith(1, null, component_objects.get_components_fabric_orderer_good_ak_response);
					tools.stubs.get_code.returns(500);
					tools.stubs.retry_req.callsArgWith(1, null, {
						statusCode: 500,
						body: {
							error: 'problem provisioning component'
						}
					});
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({
						'statusCode': 500,
						'msg': { 'error': 'problem provisioning component' }
					}));

				}
			},
			{
				itStatement: 'should return a 200 status and the correct response - exercises the "force" query parameter test_id=bqkinh',
				query: { force: 'yes' },
				callFunction: () => {
					tools.stubs.load_component_by_id.restore();
					tools.stubs.getDoc.callsArgWith(1, null, component_objects.get_components_fabric_orderer_good_ak_response);
					tools.stubs.retry_req.callsArgWith(1, null, {
						statusCode: 200,
						body: JSON.stringify(component_objects.single_node_response)
					});
					tools.stubs.record_deployer_operation.callsArgWith(4, null, component_objects.single_node_response);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify(component_objects.single_node_response));

				}
			},
			{
				itStatement: 'should return an error - error passed to "getDoc" stub test_id=nyjymu',
				callFunction: () => {
					tools.stubs.getDoc.callsArgWith(1, { statusCode: 500, msg: 'problem deleting component ' });
					tools.stubs.load_component_by_id.restore();
					tools.stubs.get_code.restore();
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'msg': 'unable to look up component by id', 'statusCode': 500 }));
					tools.stubs.get_code = sinon.stub(tools.ot_misc, 'get_code');
				}
			},
			{
				itStatement: 'should return an error and the error body - error sent to record_deployer_operation stub test_id=aguntn',
				callFunction: () => {
					tools.stubs.load_component_by_id.restore();
					tools.stubs.getDoc.callsArgWith(1, null, component_objects.get_components_fabric_orderer_good_ak_response);
					tools.stubs.get_code.restore();
					tools.stubs.retry_req.callsArgWith(1, null, {
						statusCode: 200,
						body: JSON.stringify(component_objects.single_node_response)
					});

					tools.stubs.record_deployer_operation.callsArgWith(4, { statusCode: 500, msg: 'problem provisioning component' });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'statusCode': 500, 'msg': 'problem provisioning component' }));
					tools.stubs.get_code = sinon.stub(tools.ot_misc, 'get_code');

				}
			}
		];
	};

	const bulk_delete = () => {
		return [
			{
				itStatement: 'should return a 200 status and the correct response test_id=ijgbad',
				callFunction: () => {
					const full_response = JSON.parse(JSON.stringify(component_objects.get_nodes_full_response));
					full_response.rows[0].doc = {};
					tools.stubs.getDesignDocView.callsArgWith(1, null, full_response);
					tools.stubs.get_code.restore();
					tools.stubs.load_component_by_id.restore();
					tools.stubs.offboard_component.callsArgWith(1, null);

					tools.stubs.getDoc.callsArgWith(1, null, component_objects.get_components_fabric_orderer_good_ak_response);
					tools.stubs.retry_req.callsArgWith(1, null, {
						statusCode: 200,
						body: JSON.stringify(component_objects.single_node_response)
					});
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(res.body.deleted[0].statusCode).to.equal(200);
					expect(res.body.deleted[0].message).to.equal('ok');
					expect(typeof res.body.deleted[0].tx_id).to.equal('string');
					tools.stubs.get_code = sinon.stub(tools.ot_misc, 'get_code');
				}
			},
			{
				itStatement: 'should return a 200 and the correct response - not "ibm_saas" test_id=jmqdqa',
				callFunction: () => {
					tools.stubs.get_components_by_tag = sinon.stub(tools.component_lib, 'get_components_by_tag').callsArgWith(
						2, null, [{ location: 'ibm_saas' }]
					);
					const full_response = JSON.parse(JSON.stringify(component_objects.get_nodes_full_response));
					full_response.rows[0].doc = {};
					tools.stubs.getDesignDocView.callsArgWith(1, null, full_response);
					tools.stubs.get_code.restore();
					tools.stubs.offboard_component.callsArgWith(1, null);
					tools.stubs.deprovision_component = sinon.stub(deployer_lib, 'deprovision_component').callsArgWith(1, null);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(res.body.deleted[0].statusCode).to.equal(200);
					expect(res.body.deleted[0].message).to.equal('ok');
					expect(typeof res.body.deleted[0].tx_id).to.equal('string');
					tools.stubs.get_code = sinon.stub(tools.ot_misc, 'get_code');
					tools.stubs.get_components_by_tag.restore();
					tools.stubs.deprovision_component.restore();
				}
			},
			{
				itStatement: 'should return an error and message - error passed to "offboard_component" stub test_id=gnbkwl',
				callFunction: () => {
					tools.stubs.load_component_by_id.restore();
					const full_response = JSON.parse(JSON.stringify(component_objects.get_nodes_full_response));
					full_response.rows[0].doc = {};
					tools.stubs.getDesignDocView.callsArgWith(1, null, full_response);
					tools.stubs.get_code.restore();
					tools.stubs.offboard_component.callsArgWith(1, { statusCode: 500, msg: 'problem deprovisioning component' });

					tools.stubs.getDoc.callsArgWith(1, null, component_objects.get_components_fabric_orderer_good_ak_response);
					tools.stubs.retry_req.callsArgWith(1, null, {
						statusCode: 200,
						body: JSON.stringify(component_objects.single_node_response)
					});
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(207);
					expect(res.body.deleted[0].statusCode).to.equal(500);
					expect(res.body.deleted[0].message).to.equal('problem deprovisioning component');
					expect(typeof res.body.deleted[0].tx_id).to.equal('string');
					tools.stubs.get_code = sinon.stub(tools.ot_misc, 'get_code');
				}
			},
			{
				itStatement: 'should return an error and message - not "ibm_saas" and error passed to stub test_id=vvwoke',
				callFunction: () => {
					tools.stubs.get_components_by_tag = sinon.stub(tools.component_lib, 'get_components_by_tag').callsArgWith(
						2, null, [{ location: 'ibm_saas' }]
					);
					const full_response = JSON.parse(JSON.stringify(component_objects.get_nodes_full_response));
					full_response.rows[0].doc = {};
					tools.stubs.getDesignDocView.callsArgWith(1, null, full_response);
					tools.stubs.get_code.restore();
					tools.stubs.offboard_component.callsArgWith(1, null);
					tools.stubs.deprovision_component = sinon.stub(deployer_lib, 'deprovision_component').callsArgWith(
						1, { statusCode: 500, msg: 'problem deprovisioning component' }
					);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(207);
					expect(res.body.deleted[0].statusCode).to.equal(500);
					expect(res.body.deleted[0].message).to.equal('problem deprovisioning component');
					expect(typeof res.body.deleted[0].tx_id).to.equal('string');
					tools.stubs.get_code = sinon.stub(tools.ot_misc, 'get_code');
					tools.stubs.get_components_by_tag.restore();
					tools.stubs.deprovision_component.restore();
				}
			},
			{
				itStatement: 'should return an error - error sent to getDesignDocView stub test_id=nrcimx',
				callFunction: () => {
					const full_response = JSON.parse(JSON.stringify(component_objects.get_nodes_full_response));
					full_response.rows[0].doc = {};
					tools.stubs.get_code.restore();
					tools.stubs.getDesignDocView.callsArgWith(1, { statusCode: 500, msg: 'problem with bulk delete' });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({
						'statusCode': 500,
						'msg': 'problem with bulk delete',
					}));
					tools.stubs.get_code = sinon.stub(tools.ot_misc, 'get_code');
				}
			},
			{
				itStatement: 'should return error b/c no components 2 bulk delete - 0 comps sent through getDesignDocView stub test_id=dvedqf',
				callFunction: () => {
					tools.stubs.getDesignDocView.callsArgWith(1, null, []);
					tools.stubs.get_code.restore();
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(404);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({
						'statusCode': 404,
						'msg': 'no components by tag exist',
						'reason': 'missing',
						'components': [],
					}));
					tools.stubs.get_code = sinon.stub(tools.ot_misc, 'get_code');
				}
			}
		];
	};
	const bulk_edit = () => {
		return [
			{
				itStatement: 'should return a 200 and the expected response - stubbed a good response test_id=bvdmci',
				callFunction: () => {
					tools.stubs.get_components_by_tag = sinon.stub(tools.component_lib, 'get_components_by_tag').callsArgWith(
						2, null, [{ location: 'ibm_saas', }]
					);
					tools.stubs.update_component = sinon.stub(deployer_lib, 'update_component').callsArgWith(1, null);
					tools.stubs.get_code.returns(200);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					delete res.body.updated_components[0].tx_id;
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({ 'tag': 'test_tag', 'updated_components': [{ 'statusCode': 200, 'message': 'ok' }] })
					);
					tools.stubs.get_components_by_tag.restore();
					tools.stubs.update_component.restore();
				}
			},
			{
				itStatement: 'should return an error and message - error passed to "get_components_by_tag" stub test_id=puqqrw',
				callFunction: () => {
					tools.stubs.get_code.returns(500);
					tools.stubs.get_components_by_tag = sinon.stub(tools.component_lib, 'get_components_by_tag').callsArgWith(
						2, { statusCode: 500, msg: 'problem getting components' }
					);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({ 'statusCode': 500, 'msg': 'problem getting components' })
					);
					tools.stubs.get_components_by_tag.restore();
				}
			},
			{
				itStatement: 'should return an error and message - components length is 0 test_id=tvchha',
				callFunction: () => {
					tools.stubs.get_code.returns(404);
					tools.stubs.getDesignDocView.callsArgWith(1, null, []);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(404);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({ 'statusCode': 404, 'msg': 'no components by tag exist', 'reason': 'missing', 'components': [] })
					);
				}
			},
			{
				itStatement: 'should return an error and message - error sent to "update_component" stub test_id=eqxqsi',
				callFunction: () => {
					tools.stubs.get_code.returns(500);
					tools.stubs.get_components_by_tag = sinon.stub(tools.component_lib, 'get_components_by_tag').callsArgWith(
						2, null, [{ location: 'ibm_saas', }]
					);
					tools.stubs.update_component = sinon.stub(deployer_lib, 'update_component').callsArgWith(
						1, { statusCode: 500, msg: 'problems updating components' }
					);
				},
				expectBlock: (res) => {
					const tx_id = res.body.updated_components[0].tx_id;
					delete res.body.updated_components[0].tx_id;
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({ 'tag': 'test_tag', 'updated_components': [{ 'statusCode': 500, 'message': 'problems updating components' }] })
					);
					expect(typeof tx_id).to.equal('string');
					tools.stubs.get_components_by_tag.restore();
					tools.stubs.update_component.restore();
				}
			},
			{
				itStatement: 'should return an error - not "ibm_saas" test_id=hadcee',
				callFunction: () => {
					tools.stubs.get_code.returns(500);
					tools.stubs.get_components_by_tag = sinon.stub(tools.component_lib, 'get_components_by_tag').callsArgWith(
						2, null, [{ location: 'not_ibm_saas', }]
					);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'tag': 'test_tag', 'updated_components': [] }));
					tools.stubs.get_components_by_tag.restore();
				}
			}
		];
	};
	const get_all_components_with_dep = () => {
		return [
			{
				itStatement: 'should return a 200 and return all components from deployer (w/resources) test_id=neotnb',
				callFunction: () => {
					const body = JSON.stringify(deployer_objects.all_proxy_default_get_response);
					tools.stubs.get_all_components.callsArgWith(1, null, { components: [component_objects.single_node_response2] });
					tools.stubs.retry_req.callsArgWith(1, null, { status: 200, body: body });
					tools.stubs.safe_dot_nav.restore();
				},
				expectBlock: (res, routeInfo) => {
					expect(res.status).to.equal(200);
					res.body.components[0].last_k8s_sync_ts = 0;
					if (routeInfo.route.indexOf('/ak/') >= 0) {
						expect(JSON.stringify(res.body)).to.equal(JSON.stringify(deployer_objects.get_all_comps_deployer_ak_response));
					} else {
						expect(JSON.stringify(res.body)).to.equal(JSON.stringify(deployer_objects.get_all_comps_deployer_response));
					}
					tools.stubs.get_all_components.restore();
					tools.stubs.retry_req.restore();
				}
			},
			{
				itStatement: 'should return success b/c deployer data is not required - error passed to deployer retry_req - test_id=hpvoic',
				callFunction: () => {
					tools.stubs.get_code.returns(500);
					const resp = { statusCode: 500, body: { msg: 'problem getting all components - this call is from the test' } };
					tools.stubs.get_all_components.callsArgWith(1, null, { components: [component_objects.single_node_response] });
					tools.stubs.retry_req.callsArgWith(1, null, resp);
					tools.stubs.safe_dot_nav.restore();
				},
				expectBlock: (res, routeInfo) => {
					expect(res.status).to.equal(200);
					if (routeInfo.route.indexOf('/ak/') >= 0) {
						expect(JSON.stringify(res.body)).to.equal(JSON.stringify(component_objects.deployer_ak_response1));
					} else {
						expect(JSON.stringify(res.body)).to.equal(JSON.stringify(component_objects.deployer_response2));
					}
					tools.stubs.get_code.resetHistory();
				}
			}
		];
	};
	/* removed this api 01/29/2020 - might come back...
	const get_component_data = () => {
		return [
			{
				itStatement: 'should return a 200 and the correct response - same as the response passed into the "getDoc" stub test_id=vshmqv',
				callFunction: () => {
					tools.stubs.getDoc.callsArgWith(1, null, component_objects.single_node_response);
					const body = JSON.stringify(deployer_objects.proxy_default_get_response);
					tools.stubs.retry_req.callsArgWith(1, null, { status: 200, body: body });
				},
				expectBlock: (res, routeInfo) => {
					expect(res.status).to.equal(200);
					expect(JSON.stringify(tools.misc.sortItOut(res.body))).to.equal(
						JSON.stringify(tools.misc.sortItOut(component_objects.single_node_response))
					);
				}
			},
			{
				itStatement: 'should return  test_id=sdvkkv',
				callFunction: () => {
					const err = {
						statusCode: 500,
						msg: 'problem getting component'
					};
					tools.stubs.getDoc.callsArgWith(1, err);
					tools.stubs.get_code.restore();
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(tools.misc.sortItOut(res.body))).to.equal(JSON.stringify(tools.misc.sortItOut({
						'msg': 'unable to look up component by id',
						'statusCode': 500
					})));
					tools.stubs.get_code = sinon.stub(tools.ot_misc, 'get_code');
				}
			}
		];
	};*/
	const append_raft_node = () => {
		return [
			{
				itStatement: 'should return a 200 and the correct response - uses "timeout_value" to avoid waiting on setTimeout test_id=ymxmox',
				body: component_objects.append_raft_node_body,
				callFunction: () => {
					tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: ['cluster_one'], doc_ids: [] });
					const provision_component_response = JSON.parse(JSON.stringify(component_objects.provision_component_response));
					provision_component_response.timeout_value = 1;
					tools.stubs.provision_component = sinon.stub(deployer_lib, 'provision_component').callsArgWith(1, null, provision_component_response);
					tools.stubs.getDoc.callsArgWith(1, null, component_objects.get_components_fabric_orderer_good_ak_response);
					tools.stubs.retry_req.callsArgWith(1, null, {
						statusCode: 200,
						body: JSON.stringify(component_objects.single_node_response)
					});
					tools.stubs.record_deployer_operation.callsArgWith(4, null, component_objects.single_node_response);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(JSON.stringify(tools.misc.sortKeys(res.body))).to.equal(
						JSON.stringify(tools.misc.sortKeys(component_objects.provision_component_response.athena_fmt))
					);
					tools.stubs.provision_component.restore();
				}
			},
			{
				itStatement: 'should return an error - no id passed to the stub in "cluster_ids" test_id=kfcuug',
				callFunction: () => {
					tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [] });
					tools.stubs.get_code.restore();
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(400);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({ 'statusCode': 400, 'msg': 'cannot append raft node to this cluster id. id does not exist: "cluster_one"' })
					);
				}
			},
			{
				itStatement: 'should return an error - error passed to "provision_component" stub test_id=juxhmn',
				callFunction: () => {
					tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: ['cluster_one'], doc_ids: [] });
					tools.stubs.get_code.restore();
					const err = {
						statusCode: 500,
						msg: 'problem provisioning component'
					};
					tools.stubs.provision_component = sinon.stub(deployer_lib, 'provision_component').callsArgWith(1, err);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ statusCode: 500, msg: 'problem provisioning component' }));
					tools.stubs.provision_component.restore();
				}
			},
			{
				itStatement: 'should return an error - error passed to the "send_config_block" test_id=ibkvii',
				callFunction: () => {
					tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: ['cluster_one'], doc_ids: [] });
					const provision_component_response = JSON.parse(JSON.stringify(component_objects.provision_component_response));
					provision_component_response.timeout_value = 1;
					tools.stubs.provision_component = sinon.stub(deployer_lib, 'provision_component').callsArgWith(1, null, provision_component_response);
					tools.stubs.send_config_block = sinon.stub(deployer_lib, 'send_config_block').callsArgWith(1, {
						statusCode: 500, msg: 'problem sending' +
							' config block'
					});
					tools.stubs.deprovision_component = sinon.stub(deployer_lib, 'deprovision_component').callsArgWith(1, null);
					tools.stubs.get_code.restore();
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'statusCode': 500, 'msg': 'problem sending config block' }));
					tools.stubs.send_config_block.restore();
					tools.stubs.deprovision_component.restore();
				}
			},
		];
	};
	const edit_admin_certs = () => {
		return [
			{
				itStatement: 'should return a 200 and the correct response - no changes made - all data valid in body and passed to stub test_id=hiasfg',
				callFunction: (routeInfo) => {
					routeInfo.body = {
						append_admin_certs: JSON.parse(JSON.stringify(component_objects.admin_cert)),
						remove_admin_certs: []
					};
					const get_component_stub_response = JSON.parse(JSON.stringify(component_objects.get_component_stub_response));
					tools.stubs.get_component_data = sinon.stub(deployer_lib, 'get_component_data').callsArgWith(1, null, get_component_stub_response);
				},
				expectBlock: (res, routeInfo) => {
					//console.log('sent', routeInfo.route, JSON.stringify(routeInfo.body));
					//console.log('\ngot', routeInfo.route, JSON.stringify(res.body));
					const expected_properties = JSON.parse(JSON.stringify(component_objects.set_admin_certs_response));
					delete expected_properties.set_admin_certs[0].time_left;
					delete res.body.set_admin_certs[0].time_left;
					expect(res.status).to.equal(200);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify(expected_properties));
					tools.stubs.get_component_data.restore();
				}
			},
			{
				itStatement: 'should return an error - error sent to "get_component_data" stub test_id=kbogvt',
				callFunction: (routeInfo) => {
					routeInfo.body = {
						append_admin_certs: JSON.parse(JSON.stringify(component_objects.admin_cert)),
						remove_admin_certs: []
					};
					const err = {
						statusCode: 500,
						msg: 'problem getting component'
					};
					tools.stubs.get_component_data = sinon.stub(deployer_lib, 'get_component_data').callsArgWith(1, err);
					tools.stubs.get_code.restore();
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'statusCode': 500, 'msg': 'problem getting component' }));
					tools.stubs.get_component_data.restore();
				}
			},
			{
				itStatement: 'should return a 200 and the correct response - changes made - all data valid in body and passed to stub test_id=fgirfn',
				callFunction: (routeInfo) => {
					routeInfo.body = {
						append_admin_certs: JSON.parse(JSON.stringify(component_objects.admin_cert)),
						remove_admin_certs: JSON.parse(JSON.stringify(component_objects.admin_cert))
					};
					tools.stubs.get_component_data = sinon.stub(deployer_lib, 'get_component_data').callsArgWith(
						1, null, component_objects.get_component_stub_response
					);
					tools.stubs.retry_req.callsArgWith(1, null, {
						statusCode: 200,
						body: JSON.stringify(component_objects.single_node_response)
					});
					tools.stubs.record_deployer_operation.callsArgWith(4, null, component_objects.single_node_response);
					tools.stubs.get_code.restore();
				},
				expectBlock: (res) => {
					const expected_changes = JSON.parse(JSON.stringify(component_objects.set_admin_certs_response));
					delete expected_changes.set_admin_certs[0].time_left;
					delete res.body.set_admin_certs[0].time_left;
					expected_changes.changes_made = 2;
					expect(res.status).to.equal(200);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify(expected_changes));
					tools.stubs.get_component_data.restore();
				}
			},
			{
				itStatement: 'should return an error - error sent to bad admin cert - test_id=hthnmd',
				callFunction: (routeInfo) => {
					routeInfo.body = {
						append_admin_certs: JSON.parse(JSON.stringify(component_objects.bad_admin_cert1)),
						remove_admin_certs: JSON.parse(JSON.stringify(component_objects.admin_cert))
					};
					tools.stubs.get_component_data = sinon.stub(deployer_lib, 'get_component_data').callsArgWith(
						1, null, component_objects.get_component_stub_response
					);
					tools.stubs.retry_req.callsArgWith(1, null, {
						statusCode: 200,
						body: JSON.stringify(component_objects.single_node_response)
					});
					tools.stubs.record_deployer_operation.callsArgWith(4, null, component_objects.single_node_response);
					tools.stubs.get_code.restore();
				},
				expectBlock: (res, routeInfo) => {
					//console.log('sent', routeInfo.route, JSON.stringify(routeInfo.body));
					//console.log('\ngot', routeInfo.route, JSON.stringify(res.body));
					expect(res.status).to.equal(400);
					if (routeInfo.route.indexOf('/ak/') >= 0) {
						const expected_changes = JSON.parse(JSON.stringify(component_objects.invalid_certs_response_ak));
						expect(JSON.stringify(res.body)).to.equal(JSON.stringify(expected_changes));
					} else {
						const expected_changes = JSON.parse(JSON.stringify(component_objects.invalid_certs_response));
						expect(JSON.stringify(res.body)).to.equal(JSON.stringify(expected_changes));
					}
					tools.stubs.get_component_data.restore();
				}
			}
		];
	};
	const send_actions = () => {
		return [
			{
				itStatement: 'should send component action and return 202 - test_id=kzughh',
				callFunction: (routeInfo) => {
					routeInfo.body = {
						restart: true,
					};
					tools.stubs.load_component_by_id.callsArgWith(1, null, { _id: 'my-comp', dep_component_id: 'mycomp' });
					tools.stubs.retry_req.callsArgWith(1, null, {
						statusCode: 200,
						body: {}
					});
					tools.stubs.send_actions.restore();
				},
				expectBlock: (res, routeInfo) => {
					//console.log('sent', routeInfo.route, JSON.stringify(routeInfo.body));
					//console.log('\ngot', routeInfo.route, JSON.stringify(res.body));
					expect(res.status).to.equal(202);
					expect(res.body).to.deep.equal({
						message: 'accepted',
						id: 'my-comp',
						actions: ['restart']
					});
					tools.stubs.load_component_by_id.restore();
					tools.stubs.retry_req.restore();
				}
			}
		];
	};

	// -------------------------------------------------------------------------------------

	const testCollection = [
		// POST /api/saas/v2/components
		{
			suiteDescribe: 'POST /api/saas/v2/components',
			mainDescribe: 'Run POST /api/saas/v2/components ',
			arrayOfRoutes: ['/api/saas/v2/components'],
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
					arrayOfInfoToTest: provision_tests()
				}
			]
		},
		// POST /ak/api/saas/v2/components, etc..
		{
			suiteDescribe: 'POST /ak/api/saas/v2/components',
			mainDescribe: 'Run POST /ak/api/saas/v2/components ',
			arrayOfRoutes: [
				'/ak/api/v2/kubernetes/components',
				'/ak/api/v2/kubernetes/components/fabric-ca',
				'/ak/api/v2/kubernetes/components/fabric-orderer',
				'/ak/api/v2/kubernetes/components/fabric-peer'
			],
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
					arrayOfInfoToTest: provision_tests()
				}
			]
		},
		// PUT /api/saas/v2/components/:athena_component_id
		{
			suiteDescribe: 'PUT /api/saas/v2/components/:athena_component_id',
			mainDescribe: 'Run PUT /api/saas/v2/components/:athena_component_id ',
			arrayOfRoutes: ['/api/saas/v2/components/org1_peer'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.put(routeInfo.route)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: update_tests()
				}
			]
		},
		// PUT /ak/api/v2/kubernetes/components/org1_peer, etc..
		{
			suiteDescribe: 'PUT /ak/api/v2/kubernetes/components/org1_peer, etc..',
			mainDescribe: 'Run PUT /ak/api/v2/kubernetes/components/org1_peer, etc.. ',
			arrayOfRoutes: [
				'/ak/api/v2/kubernetes/components/org1_peer',
				'/ak/api/v2/kubernetes/components/fabric-ca/org1_peer',
				'/ak/api/v2/kubernetes/components/fabric-orderer/org1_peer',
				'/ak/api/v2/kubernetes/components/fabric-peer/org1_peer'
			],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.put(routeInfo.route)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: update_tests()
				}
			]
		},
		// PUT /api/saas/v2/components/:athena_component_id/config
		{
			suiteDescribe: 'PUT /api/saas/v2/components/:athena_component_id/config',
			mainDescribe: 'Run PUT /api/saas/v2/components/:athena_component_id/config ',
			arrayOfRoutes: ['/api/saas/v2/components/org1_peer/config'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.put(routeInfo.route)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: send_genesis_block()
				}
			]
		},
		// PUT /api/saas/v2/components/:athena_component_id/config
		{
			suiteDescribe: 'PUT /ak/api/v2/kubernetes/components/:athena_component_id/config',
			mainDescribe: 'Run PUT /ak/api/v2/kubernetes/components/:athena_component_id/config ',
			arrayOfRoutes: ['/ak/api/v2/kubernetes/components/org1_peer/config'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.put(routeInfo.route)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: send_genesis_block()
				}
			]
		},
		// DELETE /saas/api/v2/components/purge -  Delete all components (saas and non-saas)
		{
			suiteDescribe: 'DELETE /saas/api/v2/components/purge',
			mainDescribe: 'Run DELETE /saas/api/v2/components/purge ',
			arrayOfRoutes: ['/saas/api/v2/components/purge'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.delete(routeInfo.route)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: purge_components()
				}
			]
		},
		// DELETE /ak/saas/api/v2/components/purge -  Delete all components (saas and non-saas)
		{
			suiteDescribe: 'DELETE /ak/saas/api/v2/components/purge',
			mainDescribe: 'Run DELETE /ak/saas/api/v2/components/purge ',
			arrayOfRoutes: ['/ak/api/v2/kubernetes/components/purge'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.delete(routeInfo.route)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: purge_components()
				}
			]
		},
		// DELETE /api/saas/v2/components/:component_id -  Delete a component
		{
			suiteDescribe: 'DELETE /api/saas/v2/components/:component_id',
			mainDescribe: 'Run DELETE /api/saas/v2/components/:component_id ',
			arrayOfRoutes: ['/api/saas/v2/components/org1_peer'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.delete(routeInfo.route)
					.send(routeInfo.body)
					.query(routeInfo.query)
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
		// DELETE /ak/api/saas/v2/components/:component_id -  Delete a component
		{
			suiteDescribe: 'DELETE /ak/api/v2/kubernetes/components/:component_id',
			mainDescribe: 'Run DELETE /ak/api/v2/kubernetes/components/:component_id ',
			arrayOfRoutes: ['/ak/api/v2/kubernetes/components/org1_peer'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.delete(routeInfo.route)
					.send(routeInfo.body)
					.query(routeInfo.query)
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
		// DELETE /api/saas/v2/components/tags/:tag -  Bulk delete
		{
			suiteDescribe: 'DELETE /api/saas/v2/components/tags/:tag',
			mainDescribe: 'Run DELETE /api/saas/v2/components/tags/:tag ',
			arrayOfRoutes: ['/api/saas/v2/components/tags/org1_peer'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.delete(routeInfo.route)
					.send(routeInfo.body)
					.query(routeInfo.query)
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
		// DELETE /ak/api/v2/kubernetes/components/tags/:tag -  Bulk delete
		{
			suiteDescribe: 'DELETE /ak/api/v2/kubernetes/components/tags/:tag',
			mainDescribe: 'Run DELETE /ak/api/v2/kubernetes/components/tags/:tag ',
			arrayOfRoutes: ['/ak/api/v2/kubernetes/components/tags/org1_peer'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.delete(routeInfo.route)
					.send(routeInfo.body)
					.query(routeInfo.query)
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
		// GET /deployer/api/v3/instance/:siid/mustgather/download
		{
			suiteDescribe: 'GET /deployer/api/v3/instance/:siid/mustgather/download',
			mainDescribe: 'Run GET /deployer/api/v3/instance/:siid/mustgather/download',
			arrayOfRoutes: ['/deployer/api/v3/instance/:siid/mustgather/download'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a 200 status when download is called test_id=uhhxgc',
							callFunction: () => {
								tools.stubs.request = sinon.stub(tools, 'request');
								const pipe = (res) => res.status(200).send('body');
								tools.stubs.request.get = sinon.stub().returns({ pipe });

							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(res.text).to.equal('body');
								tools.stubs.request.restore();
							}
						},
					]
				}
			]
		},
		// USE /deployer/api/v*/* -  Proxy deployer requests
		{
			suiteDescribe: 'USE /deployer/api/v*/*',
			mainDescribe: 'Run USE /deployer/api/v*/* ',
			arrayOfRoutes: ['/deployer/api/v2/component1'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a 200 status and the correct response  - nothing sent at all to the proxy request test_id=bwlcxm',
							callFunction: () => {
								tools.stubs.request = sinon.stub(tools, 'request').callsArgWith(1, null, {
									statusCode: 200,
									body: JSON.stringify({ something: 'here' })
								});
								tools.stubs.get_code.restore();
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(res.text).to.equal(JSON.stringify({ something: 'here' }));
								tools.stubs.get_code = sinon.stub(tools.ot_misc, 'get_code');
								tools.stubs.request.restore();
							}
						},
						{
							itStatement: 'should return an error - route has an id and an error was sent to the "getDoc" stub test_id=esbbwm',
							callFunction: (routeInfo) => {
								routeInfo.route = '/deployer/api/v2/component/component1';
								tools.stubs.getDoc.callsArgWith(1, { statusCode: 500 });
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.text).to.equal(JSON.stringify({ 'statusCode': 500, 'msg': 'unable to lookup deployer component id' }));
							}
						},
						{
							itStatement: 'should return an error  - route has an id and "getDoc" stub response has no doc.dep_component_id test_id=lvbbhx',
							callFunction: (routeInfo) => {
								routeInfo.route = '/deployer/api/v2/component/component1';
								tools.stubs.getDoc.callsArgWith(1, null, { doc: {} });
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.text).to.equal(JSON.stringify({ 'statusCode': 500, 'msg': 'unable to lookup deployer component id' }));
							}
						},
						{
							itStatement: 'should return an error - route has an id and "getDoc" stub response has no doc.dep_component_id test_id=fgftkx',
							callFunction: (routeInfo) => {
								routeInfo.route = '/deployer/api/v2/component/component1';
								tools.stubs.getDoc.callsArgWith(1, null, { doc: {} });
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.text).to.equal(JSON.stringify({ 'statusCode': 500, 'msg': 'unable to lookup deployer component id' }));
							}
						}
					]
				}
			]
		},
		// PUT  /api/saas/v2/components/tags/:tag - Bulk edit components via a deployer request
		{
			suiteDescribe: 'PUT /api/saas/v2/components/tags/:tag',
			mainDescribe: 'Run PUT /api/saas/v2/components/tags/:tag ',
			arrayOfRoutes: ['/api/saas/v2/components/tags/test_tag'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.put(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: bulk_edit()
				}
			]
		},
		// PUT  /ak/api/v2/kubernetes/components/tags/:tag - Bulk edit components via a deployer request
		{
			suiteDescribe: 'PUT /ak/api/v2/kubernetes/components/tags/:tag',
			mainDescribe: 'Run PUT /ak/api/v2/kubernetes/components/tags/:tag ',
			arrayOfRoutes: ['/ak/api/v2/kubernetes/components/tags/test_tag'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.put(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: bulk_edit()
				}
			]
		},
		// GET /api/saas/v2/components
		{
			suiteDescribe: 'GET /api/saas/v2/components',
			mainDescribe: 'Run GET /api/saas/v2/components ',
			arrayOfRoutes: ['/api/saas/v2/components'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_all_components_with_dep()	// its w/deps b/c its the /saas/ route
				}
			]
		},
		// GET /ak/api/v2/kubernetes/components
		{
			suiteDescribe: 'GET /ak/api/v2/kubernetes/components',
			mainDescribe: 'Run GET /ak/api/v2/kubernetes/components ',
			arrayOfRoutes: ['/ak/api/v2/kubernetes/components'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_all_components_with_dep()	// its w/deps b/c its the /kubernetes/ route
				}
			]
		},
		/* removed api 01/29/2020 - might come back
		// GET /api/saas/v2/components/:athena_component_id
		{
			suiteDescribe: 'GET /api/saas/v2/components/:athena_component_id',
			mainDescribe: 'Run GET /api/saas/v2/components/:athena_component_id',
			arrayOfRoutes: ['/api/saas/v2/components/some_athena_component_id'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_component_data()
				}
			]
		},
		// GET /ak/api/v2/kubernetes/components/:athena_component_id
		{
			suiteDescribe: 'GET /ak/api/v2/kubernetes/components/:athena_component_id',
			mainDescribe: 'Run GET /ak/api/v2/kubernetes/components/:athena_component_id',
			arrayOfRoutes: ['/ak/api/v2/kubernetes/components/some_athena_component_id'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_component_data()
				}
			]
		},*/
		// POST /api/saas/v2/components/raft_clusters/:cluster_id/fabric-orderer
		{
			suiteDescribe: 'POST /api/saas/v2/components/raft_clusters/:cluster_id/fabric-orderer',
			mainDescribe: 'Run POST /api/saas/v2/components/raft_clusters/:cluster_id/fabric-orderer',
			arrayOfRoutes: ['/api/saas/v2/components/raft_clusters/cluster_one/fabric-orderer'],
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
					arrayOfInfoToTest: append_raft_node()
				}
			]
		},
		// POST /api/saas/v2/components/raft_clusters/:cluster_id/fabric-orderer
		{
			suiteDescribe: 'POST /ak/api/v2/kubernetes/components/raft_clusters/:cluster_id/fabric-orderer',
			mainDescribe: 'Run POST /ak/api/v2/kubernetes/components/raft_clusters/:cluster_id/fabric-orderer',
			arrayOfRoutes: ['/ak/api/v2/kubernetes/components/raft_clusters/cluster_one/fabric-orderer'],
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
					arrayOfInfoToTest: append_raft_node()
				}
			]
		},
		// PUT /api/saas/v2/components/:athena_component_id/certs
		{
			suiteDescribe: 'PUT /api/saas/v2/components/:athena_component_id/certs',
			mainDescribe: 'Run PUT /api/saas/v2/components/:athena_component_id/certs',
			arrayOfRoutes: ['/api/saas/v2/components/component_one/certs'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.put(routeInfo.route)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: edit_admin_certs()
				}
			]
		},
		// PUT /api/saas/v2/components/:athena_component_id/certs
		{
			suiteDescribe: 'PUT /ak/api/v2/kubernetes/components/:athena_component_id/certs',
			mainDescribe: 'Run PUT /ak/api/v2/kubernetes/components/:athena_component_id/certs',
			arrayOfRoutes: ['/ak/api/v2/kubernetes/components/component_one/certs'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.put(routeInfo.route)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: edit_admin_certs()
				}
			]
		},

		// POST /ak/api/v3/kubernetes/components/:type/:id/actions
		{
			suiteDescribe: 'POST /ak/api/v3/kubernetes/components/:type/:id/actions',
			mainDescribe: 'Run /ak/api/v3/kubernetes/components/:type/:id/actions',
			arrayOfRoutes: [
				'/ak/api/v3/kubernetes/components/fabric-ca/my-comp/actions',
				'/ak/api/v3/kubernetes/components/fabric-peer/my-comp/actions',
				'/ak/api/v3/kubernetes/components/fabric-orderer/my-comp/actions',
			],
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
					arrayOfInfoToTest: send_actions()
				}
			]
		},
	];

	// call main test function to run this test collection
	common.mainTestFunction(testCollection, path_to_current_file);
});
