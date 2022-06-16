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
// deployer_lib.test.js - Test deployer_lib functions
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const deployer_objects = require('../../docs/deployer_objects.json');
const tools = common.tools;
const myutils = require('../../testing-lib/test-middleware');
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);

let deployer, comp_fmt;

const createStubs = () => {
	return {
		onboard_component: sinon.stub(tools.component_lib, 'onboard_component'),
		add_bulk_components: sinon.stub(tools.component_lib, 'add_bulk_components'),
		offboard_component: sinon.stub(tools.component_lib, 'offboard_component'),
		edit_component: sinon.stub(tools.component_lib, 'edit_component'),
		getDoc: sinon.stub(tools.otcc, 'getDoc'),
		retry_req: sinon.stub(tools.misc, 'retry_req'),
	};
};

describe('deployer_lib.js', () => {
	beforeEach(() => {
		tools.stubs = createStubs();
		deployer = require('../../../libs/deployer_lib.js')(common.logger, common.ev, tools);
		comp_fmt = require('../../../libs/comp_formatting_lib.js')(common.logger, common.ev, tools);
	});
	afterEach(() => {
		myutils.restoreStubs(tools.stubs);
	});
	const testCollection = [
		//  copy_headers
		{
			suiteDescribe: 'copy_headers',
			mainDescribe: 'Run copy_headers',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return an object containing  headers - valid headers sent test_id=hkcewr',
							expectBlock: (done) => {
								const resp = deployer.copy_headers({ 'test-header': 'test-value', 'test-header2': 'test-value2' });
								expect(JSON.stringify(resp)).to.equal(JSON.stringify({
									'content-type': 'application/json',
									'test-header': 'test-value',
									'test-header2': 'test-value2'
								}));
								done();
							}
						},
						{
							itStatement: 'should return an object containing the "content-type" header - no other headers sent to the function test_id=azdxup',
							expectBlock: (done) => {
								const resp = deployer.copy_headers();
								expect(JSON.stringify(resp)).to.equal(JSON.stringify({ 'content-type': 'application/json' }));
								done();
							}
						}
					]
				}
			]
		},
		//  record_deployer_operation
		{
			suiteDescribe: 'record_deployer_operation',
			mainDescribe: 'Run record_deployer_operation',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a 200 and an "ok" message - operation is "add_component" and all checks pass test_id=mhaxgi',
							callFunction: () => {
								tools.stubs.onboard_component.callsArgWith(1, null, { status: 200, msg: 'ok' });
							},
							expectBlock: (done) => {
								const req2dep = {
									baseUrl: 'http://blockchain.com'
								};
								const req2athena = {
									body: {
										cluster_name: 'cluster 1',
									},
									session: {},
									headers: {}
								};
								const depRespBody = '{}';
								const par = {
									debug_tx_id: {},
									OPERATION: 'add_component',
									component_type: 'ca'
								};
								deployer.record_deployer_operation(req2dep, req2athena, depRespBody, par, (err, resp) => {
									expect(resp.status).to.equal(200);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify({ status: 200, msg: 'ok' }));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error and message - no "req2athena" object sent test_id=nsfvzn',
							callFunction: () => {
								tools.stubs.onboard_component.callsArgWith(1, null, { status: 200, msg: 'ok' });
							},
							expectBlock: (done) => {
								const req2dep = {
									baseUrl: 'http://blockchain.com'
								};
								const depRespBody = '{}';
								const par = {
									debug_tx_id: {},
									OPERATION: 'add_component',
									component_type: 'ca'
								};
								deployer.record_deployer_operation(req2dep, null, depRespBody, par, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(JSON.stringify(err)).to.equal(
										JSON.stringify({ 'statusCode': 500, 'msg': 'bad usage of record_deployer_operation()' })
									);
									done();
								});
							}
						},
						{
							itStatement: 'should return null for both error and response - par.OPERATION is null test_id=fwjuxo',
							expectBlock: (done) => {
								const req2dep = {};
								const req2athena = {};
								const depRespBody = {};
								const par = {
									OPERATION: null
								};
								deployer.record_deployer_operation(req2dep, req2athena, depRespBody, par, (err, resp) => {
									expect(err).to.equal(null);
									expect(resp).to.equal(null);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error and message - no depRespBody sent test_id=kpnjki',
							callFunction: () => {
								tools.stubs.onboard_component.callsArgWith(1, null, { status: 200, msg: 'ok' });
							},
							expectBlock: (done) => {
								const req2dep = {};
								const req2athena = {};
								const par = {};
								deployer.record_deployer_operation(req2dep, req2athena, null, par, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(JSON.stringify(err)).to.equal(JSON.stringify({ 'statusCode': 500, 'msg': 'cannot parse deployer response' }));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error and message - "add_component" but no component body - unknown type test_id=owzxla',
							callFunction: () => {
								tools.stubs.onboard_component.callsArgWith(1, null, { status: 200, msg: 'ok' });
							},
							expectBlock: (done) => {
								const req2dep = {};
								const req2athena = {
									body: {
										cluster_name: 'cluster 1',
									},
									session: {},
									headers: {}
								};
								const depRespBody = {};
								const par = {
									debug_tx_id: {},
									OPERATION: 'add_component',
									component_type: 'abc'
								};
								deployer.record_deployer_operation(req2dep, req2athena, depRespBody, par, (err) => {
									expect(err.statusCode).to.equal(400);
									expect(JSON.stringify(err)).to.equal(JSON.stringify({ 'statusCode': 400, 'msg': 'unknown component type abc' }));
									done();
								});
							}
						},
						{
							itStatement: 'should return a 200 and an "ok" message - "bulk_add_components" and all checks pass test_id=aoegdf',
							callFunction: () => {
								tools.stubs.add_bulk_components.callsArgWith(1, null, [{ status: 200, msg: 'ok' }]);
							},
							expectBlock: (done) => {
								const req2dep = {};
								const req2athena = {
									body: {
										cluster_name: 'cluster 1',
									},
									session: {},
									headers: {}
								};
								const depRespBody = [{}, {}];
								const par = {
									debug_tx_id: {},
									OPERATION: 'bulk_add_components',
									component_type: 'ca'
								};
								deployer.record_deployer_operation(req2dep, req2athena, depRespBody, par, (err, resp) => {
									expect(resp).to.deep.equal({ created: [{ status: 200, msg: 'ok' }] });
									done();
								});
							}
						},
						{
							itStatement: 'should return an error and message - operation is "bulk_add_components" but an error passed to stub test_id=tsanbs',
							callFunction: () => {
								tools.stubs.add_bulk_components.callsArgWith(1, [{ status: 500, msg: 'not ok' }]);
							},
							expectBlock: (done) => {
								const req2dep = {};
								const req2athena = {
									body: {
										cluster_name: 'cluster 1',
									},
									session: {},
									headers: {}
								};
								const depRespBody = [{}];
								const par = {
									debug_tx_id: {},
									OPERATION: 'bulk_add_components',
									component_type: 'ca'
								};
								deployer.record_deployer_operation(req2dep, req2athena, depRespBody, par, (err) => {
									expect(err[0].status).to.equal(500);
									expect(err[0].msg).to.equal('not ok');
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - "bulk_add_components" but no req2athena body and an error passed to stub test_id=sormne',
							callFunction: () => {
								tools.stubs.add_bulk_components.callsArgWith(1, [{ status: 500, msg: 'not ok' }]);
							},
							expectBlock: (done) => {
								const req2dep = {
									body: {
										parameters: {},
										caadmin: {
											user: 'user1'
										}
									},
								};
								const req2athena = {
									session: {},
									headers: {}
								};
								const depRespBody = [];
								const par = {
									debug_tx_id: {},
									OPERATION: 'bulk_add_components',
									component_type: 'ca'
								};
								deployer.record_deployer_operation(req2dep, req2athena, depRespBody, par, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(JSON.stringify(err)).to.equal(
										JSON.stringify({ 'statusCode': 500, 'msg': 'could not parse deployer response for component: ca' })
									);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - operation is "bulk_add_components" but "desRespBody is not an array test_id=tfmxze',
							callFunction: () => {
								tools.stubs.add_bulk_components.callsArgWith(1, null, [{ status: 200, msg: 'ok' }]);
							},
							expectBlock: (done) => {
								const req2dep = {};
								const req2athena = {
									body: {
										cluster_name: 'cluster 1',
									},
									session: {},
									headers: {}
								};
								const depRespBody = {};
								const par = {
									debug_tx_id: {},
									OPERATION: 'bulk_add_components',
									component_type: 'ca'
								};
								deployer.record_deployer_operation(req2dep, req2athena, depRespBody, par, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('internal error with deployer\'s response');
									done();
								});
							}
						},
						{
							itStatement: 'should return an error and message - operation is "bulk_add_components" but component type is unknown test_id=shfgqm',
							callFunction: () => {
								tools.stubs.add_bulk_components.callsArgWith(1, null, [{ status: 200, msg: 'ok' }]);
							},
							expectBlock: (done) => {
								const req2dep = {};
								const req2athena = {
									body: {
										cluster_name: 'cluster 1',
										config: [{ config_prop: 'config_value' }]
									},
									session: {},
									headers: {}
								};
								const depRespBody = [];
								const par = {
									debug_tx_id: {},
									OPERATION: 'bulk_add_components',
									component_type: 'ca'
								};
								deployer.record_deployer_operation(req2dep, req2athena, depRespBody, par, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(JSON.stringify(err)).to.equal(
										JSON.stringify({ 'statusCode': 500, 'msg': 'could not parse deployer response for component: ca' })
									);
									done();
								});
							}
						},
						{
							itStatement: 'should return a 200 and an "ok" message - operation is "delete_component" and all checks pass test_id=sugiyk',
							callFunction: () => {
								tools.stubs.offboard_component.callsArgWith(1, null, { status: 200, msg: 'ok' });
							},
							expectBlock: (done) => {
								const req2dep = {};
								const req2athena = {
									body: {
										cluster_name: 'cluster 1',
									},
									session: {},
									headers: {}
								};
								const depRespBody = [];
								const par = {
									debug_tx_id: {},
									OPERATION: 'delete_component',
									component_type: 'ca'
								};
								deployer.record_deployer_operation(req2dep, req2athena, depRespBody, par, (err, resp) => {
									expect(resp.status).to.equal(200);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify({ status: 200, msg: 'ok' }));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - operation is "delete_component" but error was passed test_id=dnpyra',
							callFunction: () => {
								tools.stubs.offboard_component.callsArgWith(1, { statusCode: 500, msg: 'not ok' });
							},
							expectBlock: (done) => {
								const req2dep = {};
								const req2athena = {
									body: {
										cluster_name: 'cluster 1',
									},
									session: {},
									headers: {}
								};
								const depRespBody = [];
								const par = {
									debug_tx_id: {},
									OPERATION: 'delete_component',
									component_type: 'ca'
								};
								deployer.record_deployer_operation(req2dep, req2athena, depRespBody, par, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(JSON.stringify(err)).to.equal(JSON.stringify({ 'statusCode': 500, 'msg': 'not ok' }));
									done();
								});
							}
						},
						{
							itStatement: 'should return a 200 and an "ok" message - operation is "update_component" and all checks pass test_id=brfiaz',
							callFunction: () => {
								tools.stubs.edit_component.callsArgWith(1, null, { status: 200, msg: 'ok' });
							},
							expectBlock: (done) => {
								const req2dep = {};
								const req2athena = {
									body: {
										cluster_name: 'cluster 1',
									},
									session: {},
									headers: {}
								};
								const depRespBody = [];
								const par = {
									debug_tx_id: {},
									OPERATION: 'update_component',
									component_type: 'ca'
								};
								deployer.record_deployer_operation(req2dep, req2athena, depRespBody, par, (err, resp) => {
									expect(resp.status).to.equal(200);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify({ status: 200, msg: 'ok' }));
									done();
								});
							}
						},
						{
							itStatement: 'should return a 200 and an "ok" - "update_component" but error was passed to "edit_component" test_id=kdcxme',
							callFunction: () => {
								tools.stubs.edit_component.callsArgWith(1, { statusCode: 500, msg: 'not ok' });
							},
							expectBlock: (done) => {
								const req2dep = {};
								const req2athena = {
									body: {
										cluster_name: 'cluster 1',
									},
									session: {},
									headers: {}
								};
								const depRespBody = [];
								const par = {
									debug_tx_id: {},
									OPERATION: 'update_component',
									component_type: 'ca'
								};
								deployer.record_deployer_operation(req2dep, req2athena, depRespBody, par, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(JSON.stringify(err)).to.equal(JSON.stringify({ 'statusCode': 500, 'msg': 'not ok' }));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error and message - operation is unknown test_id=jjocah',
							callFunction: () => {
								tools.stubs.edit_component.callsArgWith(1, null, { status: 200, msg: 'ok' });
							},
							expectBlock: (done) => {
								const req2dep = {};
								const req2athena = {
									body: {
										cluster_name: 'cluster 1',
									},
									session: {},
									headers: {}
								};
								const depRespBody = [];
								const par = {
									debug_tx_id: {},
									OPERATION: 'unknown',
									component_type: 'ca'
								};
								deployer.record_deployer_operation(req2dep, req2athena, depRespBody, par, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(JSON.stringify(err)).to.equal(JSON.stringify({ 'statusCode': 500, 'msg': 'OPERATION not understood: unknown' }));
									done();
								});
							}
						},
						{
							itStatement: 'should return a 200 and an "ok" message - component type is orderer test_id=vbhqav',
							callFunction: () => {
								tools.stubs.add_bulk_components.callsArgWith(1, null, [{ status: 200, msg: 'ok' }]);
							},
							expectBlock: (done) => {
								const req2dep = {};
								const req2athena = {
									body: {
										cluster_name: 'cluster 1',
									},
									session: {},
									headers: {}
								};
								const depRespBody = [];
								const par = {
									debug_tx_id: {},
									OPERATION: 'bulk_add_components',
									component_type: 'orderer'
								};
								deployer.record_deployer_operation(req2dep, req2athena, depRespBody, par, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(JSON.stringify(err)).to.equal(
										JSON.stringify({ 'statusCode': 500, 'msg': 'could not parse deployer response for component: orderer' })
									);
									done();
								});
							}
						},
					]
				}
			]
		},
		//  fmt_body_athena_to_dep
		{
			suiteDescribe: 'fmt_body_athena_to_dep',
			mainDescribe: 'Run fmt_body_athena_to_dep',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return null - no "incoming_body" sent to function test_id=rknzva',
							expectBlock: (done) => {
								const resp = comp_fmt.fmt_body_athena_to_dep();
								expect(resp).to.equal(null);
								done();
							}
						},
						{
							itStatement: 'should return the correct response - sending 2 fake configs test_id=ifamtg',
							callFunction: () => {
								tools.stubs.safe_dot_nav = sinon.stub(tools.misc, 'safe_dot_nav').returns('test value');
							},
							expectBlock: (done) => {
								const incoming_body = {
									name: 'test-name',
									short_name: 'test-short-name',
									component_name: 'test',
									resources: {
										sub_component: {}
									},
									storage: {},
									enroll_id: 'test-id',
									state_db: 'A+',
									system_channel_name: 'channel 1',
									version: 1,
									orderer_type: 'orderer',
									config: [{}, {}],
									zone: 'mine1',
									region: 'somewhere'
								};
								common.ev.MIN_SHORT_NAME_LENGTH = 5;
								const resp = comp_fmt.fmt_body_athena_to_dep({ body: incoming_body });
								resp.dep_component_id = 'test';
								delete resp.config;		// dsh temp while we are setting both config and crypto...
								expect(JSON.stringify(resp)).to.equal(JSON.stringify(deployer_objects.fmt_body_athena_to_dep_generic_response_1));
								done();
							}
						},
						{
							itStatement: 'should return the correct response - sending 2 fake crypto test_id=eieoxo',
							callFunction: () => {
								tools.stubs.safe_dot_nav = sinon.stub(tools.misc, 'safe_dot_nav').returns('test value');
							},
							expectBlock: (done) => {
								const incoming_body = {
									name: 'test-name',
									short_name: 'test-short-name',
									component_name: 'test',
									resources: {
										sub_component: {}
									},
									storage: {},
									enroll_id: 'test-id',
									state_db: 'A+',
									system_channel_name: 'channel 1',
									version: 1,
									orderer_type: 'orderer',
									crypto: [{}, {}],
									zone: 'mine1',
									region: 'somewhere'
								};
								common.ev.MIN_SHORT_NAME_LENGTH = 5;
								const resp = comp_fmt.fmt_body_athena_to_dep({ body: incoming_body });
								resp.dep_component_id = 'test';
								delete resp.config;		// dsh temp while we are setting both config and crypto...
								expect(JSON.stringify(resp)).to.equal(JSON.stringify(deployer_objects.fmt_body_athena_to_dep_generic_response_1));
								done();
							}
						},
						{
							itStatement: 'should return the correct response - sending 1 fake crypto test_id=mryxdm',
							callFunction: () => {
								tools.stubs.safe_dot_nav = sinon.stub(tools.misc, 'safe_dot_nav').returns('test value');
							},
							expectBlock: (done) => {
								const incoming_body = {
									display_name: 'test-name',
									short_name: 'test-short-name',
									resources: {
										sub_component: {}
									},
									storage: {},
									enroll_id: 'test-id',
									statedb: 'A+',
									systemchannelname: 'channel 1',
									version: 1,
									ordererType: 'orderer',
									crypto: [{}],
									zone: 'theirs',
									region: 'somewhere'
								};
								common.ev.MIN_SHORT_NAME_LENGTH = 5;
								const resp = comp_fmt.fmt_body_athena_to_dep({ body: incoming_body });
								resp.dep_component_id = 'test';
								delete resp.config;		// dsh temp while we are setting both config and crypto...
								expect(JSON.stringify(resp)).to.equal(JSON.stringify(deployer_objects.fmt_body_athena_to_dep_generic_response_2));
								done();
							}
						},
						{
							itStatement: 'should return the correct response - sending zone as string test_id=higidh',
							callFunction: () => {
								tools.stubs.safe_dot_nav = sinon.stub(tools.misc, 'safe_dot_nav').returns('test value');
							},
							expectBlock: (done) => {
								const incoming_body = {
									display_name: 'test-name',
									short_name: 'test-short-name',
									resources: {
										sub_component: {}
									},
									storage: {},
									enroll_id: 'test-id',
									statedb: 'A+',
									systemchannelname: 'channel 1',
									version: 1,
									ordererType: 'orderer',
									crypto: {},
									zone: 'single'
								};
								common.ev.MIN_SHORT_NAME_LENGTH = 5;
								const resp = comp_fmt.fmt_body_athena_to_dep({ body: incoming_body });
								resp.dep_component_id = 'test';
								delete resp.config;		// dsh temp while we are setting both config and crypto...
								expect(JSON.stringify(resp)).to.equal(JSON.stringify(deployer_objects.fmt_body_athena_to_dep_generic_response_3));
								done();
							}
						},
						{
							itStatement: 'should return replicas as a number - sending string test_id=zpyjvu',
							callFunction: () => {
								tools.stubs.safe_dot_nav = sinon.stub(tools.misc, 'safe_dot_nav').returns('test value');
							},
							expectBlock: (done) => {
								const incoming_body = {
									replicas: '3'
								};
								const resp = comp_fmt.fmt_body_athena_to_dep({ body: incoming_body });
								expect(resp.replicas).to.equal(3);
								done();
							}
						},
						{
							itStatement: 'should return the statedb - sending statedb state_db and db_type test_id=thauli',
							callFunction: () => {
								tools.stubs.safe_dot_nav = sinon.stub(tools.misc, 'safe_dot_nav').returns('test value');
							},
							expectBlock: (done) => {
								let incoming_body = {
									statedb: 'coudhdb'
								};
								let resp = comp_fmt.fmt_body_athena_to_dep({ body: incoming_body });
								expect(resp.statedb).to.equal('coudhdb');

								incoming_body = {
									db_type: 'coudhdb'
								};
								resp = comp_fmt.fmt_body_athena_to_dep({ body: incoming_body });
								expect(resp.statedb).to.equal('coudhdb');

								incoming_body = {
									state_db: 'coudhdb'
								};
								resp = comp_fmt.fmt_body_athena_to_dep({ body: incoming_body });
								expect(resp.statedb).to.equal('coudhdb');
								done();
							}
						},
					]
				}
			]
		},

		//  get_id_in_path
		{
			suiteDescribe: 'get_id_in_path',
			mainDescribe: 'Run get_id_in_path',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return correct id - regular id and trailing slash test_id=smcwib',
							expectBlock: (done) => {
								let id1 = deployer.get_id_in_path('/deployer/api/v2/instance/$iid/type/peer/component/org1peerLevelDbDal10');
								let id2 = deployer.get_id_in_path('/deployer/api/v2/instance/$iid/type/peer/component/org1peerLevelDbDal10/');
								expect(id1).to.equal('org1peerLevelDbDal10');
								expect(id2).to.equal('org1peerLevelDbDal10');
								done();
							}
						},
						{
							itStatement: 'should return correct id - id with dashes and trailing slash test_id=wyajbr',
							expectBlock: (done) => {
								let id1 = deployer.get_id_in_path('/deployer/api/v2/instance/$iid/type/peer/component/org1peer-leveldb-dal10');
								let id2 = deployer.get_id_in_path('/deployer/api/v2/instance/$iid/type/peer/component/org1peer-leveldb-dal10/');
								expect(id1).to.equal('org1peer-leveldb-dal10');
								expect(id2).to.equal('org1peer-leveldb-dal10');
								done();
							}
						},
						{
							itStatement: 'should return correct id - regular id and 2nd param and trailing slash test_id=waxyzd',
							expectBlock: (done) => {
								let id1 = deployer.get_id_in_path('/deployer/api/v2/instance/$iid/type/peer/component/org1peerLevelDbDal10/test');
								let id2 = deployer.get_id_in_path('/deployer/api/v2/instance/$iid/type/peer/component/org1peerLevelDbDal10/test/');
								expect(id1).to.equal('org1peerLevelDbDal10');
								expect(id2).to.equal('org1peerLevelDbDal10');
								done();
							}
						},
						{
							itStatement: 'should return correct id - id with dashes and 2nd param and trailing slash test_id=eqfltg',
							expectBlock: (done) => {
								let id1 = deployer.get_id_in_path('/deployer/api/v2/instance/$iid/type/peer/component/org1peer-leveldb-dal10/test');
								let id2 = deployer.get_id_in_path('/deployer/api/v2/instance/$iid/type/peer/component/org1peer-leveldb-dal10/test/');
								expect(id1).to.equal('org1peer-leveldb-dal10');
								expect(id2).to.equal('org1peer-leveldb-dal10');
								done();
							}
						},
						{
							itStatement: 'should return correct id - id with dashes and 3rd param and trailing slash test_id=ndfdse',
							expectBlock: (done) => {
								let id1 = deployer.get_id_in_path('/deployer/api/v2/instance/$iid/type/peer/component/org1peer-leveldb-dal10/test/again');
								let id2 = deployer.get_id_in_path('/deployer/api/v2/instance/$iid/type/peer/component/org1peer-leveldb-dal10/test/again/');
								expect(id1).to.equal('org1peer-leveldb-dal10');
								expect(id2).to.equal('org1peer-leveldb-dal10');
								done();
							}
						},
						{
							itStatement: 'should return correct id - id with dots, underscores, dashes, etc test_id=ubzywx',
							expectBlock: (done) => {
								let id1 = deployer.get_id_in_path('/deployer/api/v2/instance/$iid/type/peer/component/org1-peer_LEVEL%Db.Dal^10');
								expect(id1).to.equal('org1-peer_LEVEL%Db.Dal^10');
								done();
							}
						},
						{
							itStatement: 'should return null test_id=yvbwky',
							expectBlock: (done) => {
								let id1 = deployer.get_id_in_path('/deployer/api/v2/instance/$iid/type/peer/components/noMatch');	// wrong route
								let id2 = deployer.get_id_in_path('/deployer/api/v2/instance/$iid/type/peer/component/');			// missing id
								let id3 = deployer.get_id_in_path('/deployer/api/v2/instance/$iid/type/peer/component');			// missing id
								expect(id1).to.equal(null);
								expect(id2).to.equal(null);
								expect(id3).to.equal(null);
								done();
							}
						},
						{
							itStatement: 'should return route with id replaced - test_id=iydalo',
							expectBlock: (done) => {
								const str = '/deployer/api/v2/instance/$iid/type/peer/component/org1-peer1-leveldb';
								let id1 = deployer.get_id_in_path(str);
								const dep_id = 'hope-this-works';
								const changed = str.replace(id1, dep_id);
								expect(changed).to.equal('/deployer/api/v2/instance/$iid/type/peer/component/hope-this-works');
								done();
							}
						},
					]
				}
			]
		},

		//  fmt_crypto
		{
			suiteDescribe: 'fmt_crypto',
			mainDescribe: 'Run fmt_crypto',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return deployer format from v2 msp athena format test_id=fwetmw',
							expectBlock: (done) => {
								const fmt = comp_fmt.fmt_crypto(deployer_objects.athena_config_spec_v2_msp);
								expect(fmt).to.deep.equal(deployer_objects.deployer_crypto_spec_v3_msp);
								done();
							}
						},
						{
							itStatement: 'should return deployer format from v3 msp athena format test_id=owheyb',
							expectBlock: (done) => {
								const fmt = comp_fmt.fmt_crypto(deployer_objects.athena_config_spec_v3_msp);
								expect(fmt).to.deep.equal(deployer_objects.deployer_crypto_spec_v3_msp);
								done();
							}
						},
						{
							itStatement: 'should return deployer format from v3 msp athena format (empty fields) test_id=omkolr',
							expectBlock: (done) => {
								const fmt = comp_fmt.fmt_crypto(deployer_objects.athena_config_spec_v3_missing_msp);
								expect(fmt).to.deep.equal(deployer_objects.deployer_crypto_spec_v3_missing_msp);
								done();
							}
						},


						{
							itStatement: 'should return deployer format from v2 enrollment athena format test_id=kzemed',
							expectBlock: (done) => {
								const fmt = comp_fmt.fmt_crypto(deployer_objects.athena_config_spec_v2_enrollment);
								expect(fmt).to.deep.equal(deployer_objects.deployer_crypto_spec_v3_enrollment);
								done();
							}
						},
						{
							itStatement: 'should return deployer format from v3 enrollment athena format test_id=hasphq',
							expectBlock: (done) => {
								const fmt = comp_fmt.fmt_crypto(deployer_objects.athena_config_spec_v3_enrollment);
								expect(fmt).to.deep.equal(deployer_objects.deployer_crypto_spec_v3_enrollment);
								done();
							}
						},

						{
							itStatement: 'should return deployer format from v2 enrollment (array) athena format test_id=mrpfdc',
							expectBlock: (done) => {
								const fmt = comp_fmt.fmt_crypto([deployer_objects.athena_config_spec_v2_enrollment]);
								expect(fmt).to.deep.equal([deployer_objects.deployer_crypto_spec_v3_enrollment]);
								done();
							}
						},
						{
							itStatement: 'should return deployer format from v3 enrollment (array) athena format test_id=emsrxk',
							expectBlock: (done) => {
								const fmt = comp_fmt.fmt_crypto([deployer_objects.athena_config_spec_v3_enrollment]);
								expect(fmt).to.deep.equal([deployer_objects.deployer_crypto_spec_v3_enrollment]);
								done();
							}
						},
					]
				}
			]
		},

		//  fill_in_default_resources
		{
			suiteDescribe: 'fill_in_default_resources',
			mainDescribe: 'Run fill_in_default_resources',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return default resource for peer - test_id=eolkxs',
							expectBlock: (done) => {
								expect(comp_fmt.fill_in_default_resources({ type: 'fabric-peer' })).to.deep.equal(deployer_objects.peer_default_resources);
								done();
							}
						},
						{
							itStatement: 'should return default resource for orderer - test_id=ayqoho',
							expectBlock: (done) => {
								const obj = { type: 'fabric-orderer' };
								expect(comp_fmt.fill_in_default_resources(obj)).to.deep.equal(deployer_objects.orderer_default_resources);
								done();
							}
						},
						{
							itStatement: 'should return default resource for ca - test_id=faxfjh',
							expectBlock: (done) => {
								console.log('?', JSON.stringify(comp_fmt.fill_in_default_resources({ type: 'fabric-ca' })));
								expect(comp_fmt.fill_in_default_resources({ type: 'fabric-ca' })).to.deep.equal(deployer_objects.ca_default_resources);
								done();
							}
						},
					]
				}
			]
		},

		//  fmt_comp_resp_with_deployer
		{
			suiteDescribe: 'fmt_comp_resp_with_deployer',
			mainDescribe: 'Run fmt_comp_resp_with_deployer',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return formatted comp response w/dep data test_id=oryaqz',
							expectBlock: (done) => {
								const req = {
									path: '/ak/api/v3/components/fabric-peer',
									query: {
										deployment_attrs: 'included'
									}
								};
								const opts = {
									component_doc: deployer_objects.peer_doc,
									deployer_data: deployer_objects.peer_dep_response,
								};
								const response = comp_fmt.fmt_comp_resp_with_deployer(req, opts);
								delete response.last_k8s_sync_ts;
								expect(response).to.deep.equal(deployer_objects.peer_v3_response);
								done();
							}
						},
					]
				}
			]
		},

		//  build_action_body_str
		{
			suiteDescribe: 'build_action_body_str',
			mainDescribe: 'Run build_action_body_str',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return single formatted action body from athena spec - test_id=kdjgoo',
							expectBlock: (done) => {
								let response = comp_fmt.build_action_body_str({ restart: true });
								expect(response).to.deep.equal(JSON.stringify({ actions: { restart: true } }));

								response = comp_fmt.build_action_body_str({ renew: { tls_cert: true } });
								expect(response).to.deep.equal(JSON.stringify({ actions: { renew: { tlscert: true } } }));

								response = comp_fmt.build_action_body_str({ reenroll: { tls_cert: true } });
								expect(response).to.deep.equal(JSON.stringify({ actions: { reenroll: { tlscert: true } } }));

								response = comp_fmt.build_action_body_str({ reenroll: { ecert: true } });
								expect(response).to.deep.equal(JSON.stringify({ actions: { reenroll: { ecert: true } } }));

								response = comp_fmt.build_action_body_str({ enroll: { tls_cert: true } });
								expect(response).to.deep.equal(JSON.stringify({ actions: { enroll: { tlscert: true } } }));

								response = comp_fmt.build_action_body_str({ enroll: { ecert: true } });
								expect(response).to.deep.equal(JSON.stringify({ actions: { enroll: { ecert: true } } }));

								response = comp_fmt.build_action_body_str({ upgrade_dbs: true });
								expect(response).to.deep.equal(JSON.stringify({ actions: { upgradedbs: true } }));
								done();
							}
						},

						{
							itStatement: 'should return multi action formatted action body from athena spec - test_id=jgahqp',
							expectBlock: (done) => {
								const actions = {
									restart: true,
									renew: { tls_cert: true },
									reenroll: { tls_cert: true },
									enroll: {
										ecert: true,
										tls_cert: true
									},
									upgrade_dbs: true
								};
								let response = comp_fmt.build_action_body_str(actions);
								expect(response).to.equal(JSON.stringify({
									actions: {
										restart: true,
										renew: { tlscert: true },
										reenroll: { tlscert: true },
										enroll: {
											ecert: true,
											tlscert: true
										},
										upgradedbs: true
									}
								}));
								done();
							}
						},
					]
				}
			]
		},

		//  update_component
		{
			suiteDescribe: 'update_component',
			mainDescribe: 'Run update_component',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							// this is a weird test. i'm trying to see if it formatted the api to deployer correctly.
							// so i'm overwriting retry_req to return its input. then i run expect on that.
							itStatement: 'should build PUT api for deployer from athena spec -  test_id=wrkvyp',
							callFunction: () => {
								tools.stubs.getDoc.callsArgWith(1, null, { type: 'fabric-peer', id: 'mypeer', dep_component_id: 'mypeer2' });
								tools.stubs.retry_req.callsFake((opts, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
									const ret = {
										statusCode: 500,					// setting an error code allows us to get out of retry_req quicker
										body: opts							// shove the settings here
									};
									return cb(null, ret);
								});
								common.ev.CRN = { instance_id: 'abc' };
							},
							expectBlock: (done) => {
								const req = {
									params: {
										athena_component_id: 'mypeer'
									},
									method: 'PUT',
									body: {
										admin_certs: ['asdf', '1234'],
										node_ou: {
											enabled: true
										}
									}
								};
								deployer.update_component(req, (error, dep_opts) => {
									expect(dep_opts.method).to.equal('PUT');
									expect(dep_opts.url).to.equal('/api/v3/instance/abc/type/peer/component/mypeer2');
									expect(dep_opts.body).to.equal('{"nodeou":{"enabled":true},"admincerts":["asdf","1234"]}');
									done();
								});
							}
						},

						{
							// this is a weird test. i'm trying to see if it formatted the api to deployer correctly.
							// so i'm overwriting retry_req to return its input. then i run expect on that.
							itStatement: 'should build PATCH api for deployer from athena spec - test_id=ydvngz',
							callFunction: () => {
								tools.stubs.getDoc.callsArgWith(1, null, { type: 'fabric-peer', id: 'mypeer', dep_component_id: 'mypeer2' });
								tools.stubs.retry_req.callsFake((opts, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
									const ret = {
										statusCode: 500,					// setting an error code allows us to get out of retry_req quicker
										body: opts							// shove the settings here
									};
									return cb(null, ret);
								});
								common.ev.CRN = { instance_id: 'abc' };
							},
							expectBlock: (done) => {
								const req = {
									params: {
										athena_component_id: 'mypeer'
									},
									method: 'PUT',
									body: {
										resources: {
											peer: {
												requests: {
													cpu: '234m',
													memory: '456Mi'
												}
											}
										},
									}
								};
								const expected = '{"resources":{"peer":{"requests":{"cpu":"234m","memory":"456Mi"},"limits":{"cpu":"234m","memory":"456Mi"}}}}';
								deployer.update_component(req, (error, dep_opts) => {
									expect(dep_opts.method).to.equal('PATCH');
									expect(dep_opts.url).to.equal('/api/v3/instance/abc/type/peer/component/mypeer2');
									expect(dep_opts.body).to.equal(expected);
									done();
								});
							}
						}
					]
				}
			]
		},

		//  deployer_has_a_different_value
		{
			suiteDescribe: 'deployer_has_a_different_value',
			mainDescribe: 'Run deployer_has_a_different_value',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should detect difference - missing fields - test_id=ekwfuc',
							callFunction: () => {
							},
							expectBlock: (done) => {
								const obj1 = {
									admin_certs: 'thing',
								};
								const obj2 = {
									admin_certs: 'thing',
									resources: 'thing',
									storage: 'thing',
								};
								const ret = deployer.deployer_has_a_different_value(obj1, obj2);
								expect(ret.differences).to.deep.equal(['resources', 'storage']);
								expect(ret.doc).to.deep.equal(obj2);
								done();
							}
						},
						{
							itStatement: 'should detect difference - different fields - test_id=foxxrf',
							callFunction: () => {
							},
							expectBlock: (done) => {
								const obj1 = {
									admin_certs: 'thing',
									resources: 'thing-a',
									storage: 'thing-a',
								};
								const obj2 = {
									admin_certs: 'thing',
									resources: 'thing-b',
									storage: 'thing-b',
								};
								const ret = deployer.deployer_has_a_different_value(obj1, obj2);
								expect(ret.differences).to.deep.equal(['resources', 'storage']);
								expect(ret.doc).to.deep.equal(obj2);
								done();
							}
						},
						{
							itStatement: 'should detect no difference - test_id=pjvzuz',
							callFunction: () => {
							},
							expectBlock: (done) => {
								const obj1 = {
									admin_certs: 'thing1',
									resources: 'thing2',
									storage: 'thing3',
								};
								const obj2 = {
									admin_certs: 'thing1',
									resources: 'thing2',
									storage: 'thing3',
								};
								const ret = deployer.deployer_has_a_different_value(obj1, obj2);
								expect(ret.differences).to.deep.equal([]);
								expect(ret.doc).to.deep.equal(obj2);
								done();
							}
						},
						{
							itStatement: 'should detect differences and merge left - different fields - test_id=ddgloh',
							callFunction: () => {
							},
							expectBlock: (done) => {
								const obj1 = {
									admin_certs: 'thing1',
									resources: 'thing2',
									storage: 'thing3',
									version: 'version'
								};
								const obj2 = {
									admin_certs: 'thing1',
									resources: 'thing20',
									storage: 'thing30',
								};
								const expected = {
									admin_certs: 'thing1',
									resources: 'thing20',
									storage: 'thing30',
									version: 'version'
								};
								const ret = deployer.deployer_has_a_different_value(obj1, obj2);
								expect(ret.differences).to.deep.equal(['resources', 'storage']);
								expect(ret.doc).to.deep.equal(expected);
								done();
							}
						},
						{
							itStatement: 'should NOT detect empty differences - test_id=kesbnc',
							callFunction: () => {
							},
							expectBlock: (done) => {
								const obj1 = {
									admin_certs: 'thing1',
									resources: 'thing2',
									storage: 'thing3',
								};
								const obj2 = {
									admin_certs: 'thing10',
									resources: '',
									storage: undefined,
								};
								const expected = {
									admin_certs: 'thing10',
									resources: 'thing2',
									storage: 'thing3',
								};
								const ret = deployer.deployer_has_a_different_value(obj1, obj2);
								expect(ret.differences).to.deep.equal(['admin_certs']);
								expect(ret.doc).to.deep.equal(expected);
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
