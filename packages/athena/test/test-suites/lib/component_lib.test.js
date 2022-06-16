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
// component_lib.test.js - Test component_lib functions
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const component_properties_to_test = require('../../docs/component_properties.json');
const myutils = require('../../testing-lib/test-middleware');
const tools = common.tools;
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);
const component_lib = require('../../../libs/component_lib.js')(common.logger, common.ev, tools);
const node_api_objects = require('../../docs/component_api_objects.json');
tools.otcc = common.tools.otcc;

// let node;
const createStubs = () => {
	return {
		getAllIds: sinon.stub(component_lib, 'getAllIds'),
		getDesignDocView: sinon.stub(tools.otcc, 'getDesignDocView'),
		getDoc: sinon.stub(tools.otcc, 'getDoc'),
	};
};

describe('component_lib.js', () => {
	beforeEach(() => {
		tools.stubs = createStubs();
		tools.request = sinon.stub(tools, 'request');
	});
	afterEach(() => {
		if (tools.request.isSinonProxy) { tools.request.restore(); }
		myutils.restoreStubs(tools.stubs);
	});
	const testCollection = [
		// buildDoc
		{
			suiteDescribe: 'buildDoc',
			mainDescribe: 'Run buildDoc',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should pass with no errors - fabric-ca: complete and correct node object sent test_id=kszcym',
							callFunction: () => {
								tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
							},
							expectBlock: (done) => {
								component_lib.buildDoc(JSON.parse(JSON.stringify(component_properties_to_test.fabric_ca_node_obj)), (err) => {
									expect(err).to.equal(null);
									done();
								});
							}
						},
						{
							itStatement: 'should pass with no errors - node object sent:  is fabric-orderer test_id=clrnxy',
							callFunction: () => {
								tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
							},
							expectBlock: (done) => {
								const obj = JSON.parse(JSON.stringify(component_properties_to_test.fabric_orderer_node_obj));
								component_lib.buildDoc(obj, (err) => {
									expect(err).to.equal(null);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - fabric-ca: no properties object was passed test_id=aztuub',
							callFunction: () => {
								tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
							},
							expectBlock: (done) => {
								component_lib.buildDoc({}, (error) => {
									expect(error.statusCode).to.equal(400);
									expect(error.msg[0]).to.equal('invalid component type or missing component data in body. type: undefined');
									done();
								});
							}
						},
						{
							itStatement: 'should pass with no errors - fabric-peer: complete and correct node object sent test_id=rgimjs',
							callFunction: () => {
								tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
							},
							expectBlock: (done) => {
								component_lib.buildDoc(component_properties_to_test.fabric_peer_node_obj, (err) => {
									expect(err).to.equal(null);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - fabric-peer: no properties object was passed test_id=rkvumw',
							callFunction: () => {
								tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
							},
							expectBlock: (done) => {
								component_lib.buildDoc({}, (error) => {
									expect(error.statusCode).to.equal(400);
									expect(error.msg[0]).to.equal('invalid component type or missing component data in body. type: undefined');
									done();
								});
							}
						},
						{
							itStatement: 'should pass with no errors - fabric-orderer: complete and correct node object sent test_id=bkwvrp',
							callFunction: () => {
								tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
							},
							expectBlock: (done) => {
								component_lib.buildDoc(component_properties_to_test.fabric_orderer_node_obj, (err) => {
									expect(err).to.equal(null);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - fabric-orderer: no properties object was passed test_id=ghaiyc',
							callFunction: () => {
								tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
							},
							expectBlock: (done) => {
								component_lib.buildDoc({}, (error) => {
									expect(error.statusCode).to.equal(400);
									expect(error.msg[0]).to.equal('invalid component type or missing component data in body. type: undefined');
									done();
								});
							}
						},
						{
							itStatement: 'should pass with no errors - fabric-orderer: complete and correct node object sent test_id=chpucz',
							callFunction: () => {
								tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
							},
							expectBlock: (done) => {
								component_lib.buildDoc(component_properties_to_test.msp_definition_request_body, (err) => {
									expect(err).to.equal(null);
									done();
								});
							}
						},

						{
							itStatement: 'should give back _id with no value - test_id=afwws',
							callFunction: () => {
								tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
							},
							expectBlock: (done) => {
								const data = JSON.parse(JSON.stringify(component_properties_to_test.fabric_ca_node_obj));
								data.body.short_name = 'something_that_is_too_long_here_like_this';

								component_lib.buildDoc(data, (err, doc) => {
									expect(doc._id).to.equal('something_that_is_too_long_here_');
									expect(doc.short_name).to.equal(undefined);
									done();
								});
							}
						},
						{
							itStatement: 'should give back _id with no spaces - test_id=afwws2',
							callFunction: () => {
								tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
							},
							expectBlock: (done) => {
								const data = JSON.parse(JSON.stringify(component_properties_to_test.fabric_ca_node_obj));
								data.body.short_name = 'something with spaces';

								component_lib.buildDoc(data, (err, doc) => {
									expect(doc._id).to.equal('somethingwithspaces');
									expect(doc.short_name).to.equal(undefined);
									done();
								});
							}
						},
						{
							itStatement: 'should give back _id with random characters - test_id=afwws3',
							callFunction: () => {
								tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
							},
							expectBlock: (done) => {
								const data = JSON.parse(JSON.stringify(component_properties_to_test.fabric_ca_node_obj));
								data.body.short_name = 'abc_def_';

								component_lib.buildDoc(data, (err, doc) => {
									expect(doc._id.length).to.equal(common.ev.MIN_SHORT_NAME_LENGTH);
									expect(doc.short_name).to.equal(undefined);
									done();
								});
							}
						},
						{
							itStatement: 'should give back _id starting with letter c - test_id=eegds',
							callFunction: () => {
								tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
							},
							expectBlock: (done) => {
								const data = JSON.parse(JSON.stringify(component_properties_to_test.fabric_ca_node_obj));
								data.body.display_name = '1twothree';
								delete data.body.short_name;

								component_lib.buildDoc(data, (err, doc) => {
									expect(doc._id).to.equal('c1twothree');
									done();
								});
							}
						},
						{
							itStatement: 'should give back _id starting with letter c -  test_id=mdrcgb',
							callFunction: () => {
								tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
							},
							expectBlock: (done) => {
								const data = JSON.parse(JSON.stringify(component_properties_to_test.fabric_ca_node_obj));
								data.body.display_name = '-dashboohiss';
								delete data.body.short_name;

								component_lib.buildDoc(data, (err, doc) => {
									expect(doc._id).to.equal('c-dashboohiss');
									done();
								});
							}
						},
						{
							itStatement: 'should make display name from display name - test_id=cftwap',
							callFunction: () => {
								tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
							},
							expectBlock: (done) => {
								const data = JSON.parse(JSON.stringify(component_properties_to_test.fabric_ca_node_obj));
								data.body.display_name = 'I\'m the Display Name!';
								data.body.name = 'I\'m the Name Name!';
								data.body.short_name = 'I\'m the Short Name!';

								component_lib.buildDoc(data, (err, doc) => {
									expect(doc.display_name).to.equal('I\'m the Display Name!');
									expect(doc.name).to.equal(undefined);
									expect(doc.short_name).to.equal(undefined);
									expect(doc._id).to.equal('imthedisplayname');		// yeah this is weird, but its legacy
									done();
								});
							}
						},
						{
							itStatement: 'should make display name from name name - test_id=nyrsmd',
							callFunction: () => {
								tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
							},
							expectBlock: (done) => {
								const data = JSON.parse(JSON.stringify(component_properties_to_test.fabric_ca_node_obj));
								data.body.display_name = null;
								data.body.name = 'I\'m the Name Name!';
								data.body.short_name = 'I\'m the Short Name!';

								component_lib.buildDoc(data, (err, doc) => {
									expect(doc.display_name).to.equal('I\'m the Name Name!');
									expect(doc.name).to.equal(undefined);
									expect(doc.short_name).to.equal(undefined);
									expect(doc._id).to.equal('imthenamename');		// yeah this is weird, but its legacy
									done();
								});
							}
						},
						{
							itStatement: 'should give make display name from short name - test_id=jluwws',
							callFunction: () => {
								tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
							},
							expectBlock: (done) => {
								const data = JSON.parse(JSON.stringify(component_properties_to_test.fabric_ca_node_obj));
								data.body.display_name = null;
								data.body.name = null;
								data.body.short_name = 'I\'m the Short Name!';

								component_lib.buildDoc(data, (err, doc) => {
									expect(doc.display_name).to.equal('I\'m the Short Name!');
									expect(doc.name).to.equal(undefined);
									expect(doc.short_name).to.equal(undefined);
									expect(doc._id).to.equal('imtheshortname');
									done();
								});
							}
						},
						{
							itStatement: 'should set display name w/chinese characters - test_id=raoopy',
							callFunction: () => {
								tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
							},
							expectBlock: (done) => {
								const data = JSON.parse(JSON.stringify(component_properties_to_test.fabric_ca_node_obj));
								data.body.display_name = '我的东西';
								delete data.body.short_name;

								component_lib.buildDoc(data, (err, doc) => {
									expect(doc._id).to.not.be.null;						// this string will be random, check that is not null
									expect(doc._id.length).to.be.greaterThan(3);
									expect(doc.display_name).to.equal('我的东西');
									done();
								});
							}
						},
						{
							itStatement: 'should append letter "c" to id when given str that starts with a number - test_id=yosota',
							callFunction: () => {
								tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
							},
							expectBlock: (done) => {
								const data = JSON.parse(JSON.stringify(component_properties_to_test.fabric_ca_node_obj));
								data.body.display_name = '0zero1two';
								delete data.body.short_name;

								component_lib.buildDoc(data, (err, doc) => {
									expect(doc._id).to.equal('c0zero1two');
									expect(doc.display_name).to.equal('0zero1two');
									done();
								});
							}
						},
						{
							itStatement: 'should not pass - msp id has underscores test_id=subgyi',
							callFunction: () => {
								tools.stubs.getAllIds.callsArgWith(0, null, { cluster_ids: [], doc_ids: [], comp_ids: [] });
							},
							expectBlock: (done) => {
								const data = JSON.parse(JSON.stringify(component_properties_to_test.fabric_ca_node_obj));
								data.body.msp_id = 'test_this';
								component_lib.buildDoc(data, (err, resp) => {
									expect(err).to.equal(null);
									expect(tools.misc.sortItOut(data)).to.deep.equal({
										body:
										{
											api_url: 'some url w/protocol and port here',
											ca_name: 'org1CA',
											enroll_id: 'admin',
											enroll_secret: 'secret',
											location: null,
											msp_id: 'test_this',
											short_name: 'some_name',
											type: 'fabric-ca'
										}
									});
									done();
								});
							}
						},
						{
							itStatement: 'should not pass - too many components test_id=gmuepx',
							callFunction: () => {
								common.ev.MAX_COMPONENTS = 9;
								tools.stubs.getAllIds.callsArgWith(0, null, {
									cluster_ids: [],
									doc_ids: [],
									comp_ids: ['myca1', 'myca2', 'myca3', 'myca4', 'myca5', 'myca6', 'myca7', 'myca8', 'myca9', 'myca10'],
								});
							},
							expectBlock: (done) => {
								const data = JSON.parse(JSON.stringify(component_properties_to_test.fabric_ca_node_obj));
								component_lib.buildDoc(data, (error, resp) => {
									expect(error.statusCode).to.equal(400);
									expect(error.msg[0]).to.equal('total component limit reached. delete a component to make space for this one.');
									common.ev.MAX_COMPONENTS = 250;
									done();
								});
							}
						},
						{
							itStatement: 'should pass - bad input to getAllIds, not an array, should default to allow - test_id=icbhtf',
							callFunction: () => {
								common.ev.MAX_COMPONENTS = 9;
								tools.stubs.getAllIds.callsArgWith(0, null, {
									cluster_ids: [],
									doc_ids: {},			// should be an array, test as is
									comp_ids: [],
								});
							},
							expectBlock: (done) => {
								const data = JSON.parse(JSON.stringify(component_properties_to_test.fabric_ca_node_obj));
								component_lib.buildDoc(data, (error, resp) => {
									expect(error).to.equal(null);
									expect(tools.misc.sortItOut(data)).to.deep.equal({
										body:
										{
											api_url: 'some url w/protocol and port here',
											ca_name: 'org1CA',
											enroll_id: 'admin',
											enroll_secret: 'secret',
											location: null,
											msp_id: 'PeerOrg1',
											short_name: 'some_name',
											type: 'fabric-ca'
										}
									});
									done();
								});
							}
						},
					]
				}
			]
		},

		// build_id
		{
			suiteDescribe: 'build_id',
			mainDescribe: 'Run build_id',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'build a unique id - is not taken - test_id=vjvvle',
							expectBlock: (done) => {
								const opts = {
									id_str: 'abcd',
									taken_ids: ['some_id'],
									safe_prefix: 'ibp',
									limit: common.ev.MAX_SHORT_NAME_LENGTH,
								};
								const id = component_lib.build_id(opts);
								expect(id).to.equal('abcd');
								done();
							}
						},
						{
							itStatement: 'build a unique id - is already taken - test_id=jkdzci',
							expectBlock: (done) => {
								const opts = {
									id_str: 'some_id',
									taken_ids: ['some_id'],
									safe_prefix: 'ibp',
									limit: common.ev.MAX_SHORT_NAME_LENGTH,
								};
								const id = component_lib.build_id(opts);
								expect(id).to.equal('some_id_0');
								done();
							}
						},
						{
							itStatement: 'build a unique id - many taken - test_id=abuqad',
							expectBlock: (done) => {
								const opts = {
									id_str: 'some_id',
									taken_ids: ['some_id', 'some_id_0', 'some_id_1', 'some_id_2', 'some_id_3', 'some_id_4', 'some_id_5',
										'some_id_6', 'some_id_7', 'some_id_8', 'some_id_9'],
									safe_prefix: 'ibp',
									limit: common.ev.MAX_SHORT_NAME_LENGTH,
								};
								const id = component_lib.build_id(opts);
								expect(id).to.equal('some_id_10');
								done();
							}
						},
						{
							itStatement: 'build a unique id - is too long - test_id=figpqh',
							expectBlock: (done) => {
								const opts = {
									id_str: 'some_id_12345678912345678912346789123456789',
									taken_ids: ['some_id'],
									safe_prefix: 'ibp',
									limit: common.ev.MAX_SHORT_NAME_LENGTH,
								};
								const id = component_lib.build_id(opts);
								expect(id).to.equal('some_id_123456789123456789123467');
								expect(id.length).to.equal(common.ev.MAX_SHORT_NAME_LENGTH);
								done();
							}
						},
						{
							itStatement: 'build a unique id - is short - test_id=verqyc',
							expectBlock: (done) => {
								const opts = {
									id_str: 'a',
									taken_ids: ['some_id'],
									safe_prefix: 'ibp',
									limit: common.ev.MAX_SHORT_NAME_LENGTH,
								};
								const id = component_lib.build_id(opts);
								expect(id).to.equal('a');
								done();
							}
						},
						{
							itStatement: 'build a unique id - starts w/number - test_id=bcjkac',
							expectBlock: (done) => {
								const opts = {
									id_str: '12345',
									taken_ids: ['some_id'],
									safe_prefix: 'ibp',
									limit: common.ev.MAX_SHORT_NAME_LENGTH,
								};
								const id = component_lib.build_id(opts);
								expect(id).to.equal('ibp12345');
								done();
							}
						},
						{
							itStatement: 'build a unique id - starts w/number & too long - test_id=nknohj',
							expectBlock: (done) => {
								const opts = {
									id_str: '123456789123456789123456789123467',
									taken_ids: ['some_id'],
									safe_prefix: 'ibp',
									limit: common.ev.MAX_SHORT_NAME_LENGTH,
								};
								const id = component_lib.build_id(opts);
								expect(id).to.equal('ibp12345678912345678912345678912');
								done();
							}
						},
						{
							itStatement: 'build a unique id - invalid chars - test_id=chyaze',
							expectBlock: (done) => {
								const opts = {
									id_str: '<script>alert(\'all your base`~"test"\');</script>',
									taken_ids: ['some_id'],
									safe_prefix: 'ibp',
									limit: common.ev.MAX_SHORT_NAME_LENGTH,
								};
								const id = component_lib.build_id(opts);
								expect(id).to.equal('scriptalertallyourbasetestscript');
								done();
							}
						},
						{
							itStatement: 'build a unique id - invalid chars - test_id=kzczou',
							expectBlock: (done) => {
								const opts = {
									id_str: '我的东西',
									taken_ids: ['some_id'],
									safe_prefix: 'ibp',
									limit: common.ev.MAX_SHORT_NAME_LENGTH,
								};
								const id = component_lib.build_id(opts);
								expect(id).to.not.equal('我的东西');
								expect(id.length).to.equal(common.ev.MIN_SHORT_NAME_LENGTH + 3);
								done();
							}
						},
						{
							itStatement: 'build a unique id - too long w/custom limit - test_id=pgzxkn',
							expectBlock: (done) => {
								const len = 16;
								const opts = {
									id_str: 'some_id_12345678912345678912346789123456789',
									taken_ids: ['some_id'],
									safe_prefix: 'ibp',
									limit: len,
								};
								const id = component_lib.build_id(opts);
								expect(id).to.equal('some_id_12345678');
								expect(id.length).to.equal(len);
								done();
							}
						},
						{
							itStatement: 'build a unique id - too long & not unique + roll over limit - test_id=nkvqiv',
							expectBlock: (done) => {
								const opts = {
									id_str: 'some_id_1234567891234567891024_900',
									taken_ids: ['some_id_1234567891234567891024_9'],
									safe_prefix: 'ibp',
									limit: common.ev.MAX_SHORT_NAME_LENGTH,
								};
								const id = component_lib.build_id(opts);
								expect(id).to.equal(null);
								done();
							}
						},
					]
				}
			]
		},

		// getAllIds
		{
			suiteDescribe: 'getAllIds',
			mainDescribe: 'Run getAllIds',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should respond with the ids sent given array - test_id=avasoe',
							callFunction: () => {
								const rows = [
									{
										key: ['cluster_id', '123']
									},
									{
										key: ['doc_id', 'abc']
									},
									{
										key: ['doc_id', 'def']
									}
								];
								const dep_resp1 = [
									{ name: 'myca' },
									{ name: 'my-peer' },
									{ name: 'my-os' },
								];
								tools.stubs.getDesignDocView.callsArgWith(1, null, { rows });
								tools.stubs.get_all_components_api = sinon.stub(tools.deployer, 'get_all_components_api').callsArgWith(1, null, dep_resp1);
							},
							expectBlock: (done) => {
								tools.stubs.getAllIds.restore();
								component_lib.getAllIds((err, resp) => {
									expect(err).to.equal(null);
									delete resp.comp_ids;
									expect(resp).to.deep.equal({ cluster_ids: ['123'], doc_ids: ['abc', 'def'], deployer_ids: ['myca', 'my-peer', 'my-os'] });
								});
								tools.stubs.getAllIds = sinon.stub(component_lib, 'getAllIds');
								tools.stubs.get_all_components_api.restore();
								done();
							}
						},
						{
							itStatement: 'should respond with the ids sent given object - test_id=avaso2',
							callFunction: () => {
								const rows = [
									{
										key: ['cluster_id', '123']
									},
									{
										key: ['doc_id', 'abc']
									},
									{
										key: ['doc_id', 'def']
									}
								];
								const dep_resp2 = {
									'myca': {},
									'my-peer': {},
									'my-os': {},
								};
								tools.stubs.getDesignDocView.callsArgWith(1, null, { rows });
								tools.stubs.get_all_components_api = sinon.stub(tools.deployer, 'get_all_components_api').callsArgWith(1, null, dep_resp2);
							},
							expectBlock: (done) => {
								tools.stubs.getAllIds.restore();
								component_lib.getAllIds((err, resp) => {
									expect(err).to.equal(null);
									delete resp.comp_ids;
									expect(resp).to.deep.equal({ cluster_ids: ['123'], doc_ids: ['abc', 'def'], deployer_ids: ['myca', 'my-peer', 'my-os'] });
								});
								tools.stubs.getAllIds = sinon.stub(component_lib, 'getAllIds');
								tools.stubs.get_all_components_api.restore();
								done();
							}
						}
					]
				}
			]
		},

		// get_component
		{
			suiteDescribe: 'get_component',
			mainDescribe: 'Run get_component',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return component information sent into stub test_id=bdijpx',
							expectBlock: (done) => {
								const req = {
									params: {
										id: '1234'
									},
									query: {
										cache: 'skip'
									}
								};
								const props = {
									ca_url: 'https://ca_url.com:443',
									display_name: 'my component',
									location: 'dallas',
									name: 'my component',
									node_type: 'ca',
									pem: 'some_cert',
									short_name: 'my_comp',
									tls_cert: 'some_tls_cert',
									type: 'fabric-ca'
								};
								tools.stubs.load_component_by_id = sinon.stub(component_lib, 'load_component_by_id');
								tools.stubs.load_component_by_id.callsArgWith(1, null, props);
								component_lib.get_component(req, (err, resp) => {
									expect(err).to.equal(null);
									expect(resp).to.deep.equal(props);
									tools.stubs.load_component_by_id.restore();
									return done();
								});
							}
						}
					]
				}
			]
		},
		// rebuildWhiteList
		{
			suiteDescribe: 'rebuildWhiteList',
			mainDescribe: 'Run rebuildWhiteList',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return no errors and the whitelist test_id=cyafmo',
							expectBlock: (done) => {
								const req = {
									params: {
										id: '1234'
									},
									query: {
										cache: 'skip'
									}
								};
								const components = { components: [{ display_name: 'component 1' }] };
								tools.stubs.get_all_components = sinon.stub(component_lib, 'get_all_components').callsArgWith(1, null, components);
								tools.stubs.repeatWriteSafe = sinon.stub(tools.otcc, 'repeatWriteSafe').callsArgWith(1, { statusCode: 200, msg: 'ok' });
								const white_list = component_lib.rebuildWhiteList(req);
								expect(white_list).to.equal(undefined);
								tools.stubs.get_all_components.restore();
								tools.stubs.repeatWriteSafe.restore();
								done();
							}
						}
					]
				}
			]
		},
		// get_components_by_type
		{
			suiteDescribe: 'get_components_by_type',
			mainDescribe: 'Run get_components_by_type',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the docs by type with no errors test_id=swnxxf',
							expectBlock: (done) => {
								const response = { rows: [{ doc: {} }] };
								tools.stubs.getDesignDocView.callsArgWith(1, null, response);
								component_lib.get_components_by_type('peer', 'skip', (err, resp) => {
									expect(err).to.equal(null);
									expect(resp).to.deep.equal([{}]);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error that no components exist test_id=mlhrtj',
							expectBlock: (done) => {
								const response = { rows: [{}], total_rows: 0 };
								tools.stubs.getDesignDocView.callsArgWith(1, null, response);
								component_lib.get_components_by_type('peer', 'skip', (err, resp) => {
									expect(err).to.deep.equal({
										components: [],
										msg: 'no components exist',
										reason: 'missing',
										statusCode: 222
									});
									expect(resp).to.deep.equal(undefined);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error that no components by type exist test_id=qcupab',
							expectBlock: (done) => {
								const response = {};
								tools.stubs.getDesignDocView.callsArgWith(1, null, response);
								component_lib.get_components_by_type('peer', 'skip', (err, resp) => {
									expect(err).to.deep.equal({
										components: [],
										msg: 'no components by type exist',
										reason: 'missing',
										statusCode: 222
									});
									expect(resp).to.deep.equal(undefined);
									done();
								});
							}
						},
						{
							itStatement: 'should return the error sent to the stub  test_id=saidzl',
							expectBlock: (done) => {
								tools.stubs.getDesignDocView.callsArgWith(1, { statusCode: 500, msg: 'problem getting components by type' });
								component_lib.get_components_by_type('peer', 'skip', (err, resp) => {
									expect(err).to.deep.equal({ msg: 'problem getting components by type', statusCode: 500 });
									expect(resp).to.deep.equal(undefined);
									done();
								});
							}
						}
					]
				}
			]
		},
		// get_ca_info_by_doc
		{
			suiteDescribe: 'get_ca_info_by_doc',
			mainDescribe: 'Run get_ca_info_by_doc',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return an error - missing input fields test_id=pfniqm',
							expectBlock: (done) => {
								const doc = {};
								component_lib.get_ca_info_by_doc(doc, false, (err, resp) => {
									expect(err).to.deep.equal({
										details: 'unable to lookup ca info. missing input fields: "api_url" or "ca_name"',
										statusCode: 500
									});
									expect(resp).to.deep.equal(undefined);
									done();
								});
							}
						},
						{
							itStatement: 'should  test_id=utlihn',
							expectBlock: (done) => {
								const doc = { api_url: 'https://api_url.com:443', ca_name: 'my_ca' };
								tools.stubs.get_ca_data = sinon.stub(component_lib, 'get_ca_data').callsArgWith(1, null, {});
								component_lib.get_ca_info_by_doc(doc, false, (err, resp) => {
									expect(err).to.deep.equal(null);
									expect(resp).to.deep.equal({});
									tools.stubs.get_ca_data.restore();
									done();
								});
							}
						}
					]
				}
			]
		},
		// get_all_runnable_components
		{
			suiteDescribe: 'get_all_runnable_components',
			mainDescribe: 'Run get_all_runnable_components',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the doc passed in and no errors test_id=nqycqr',
							expectBlock: (done) => {
								const req = { rows: [{ doc: {} }] };
								tools.stubs.getDesignDocView.callsArgWith(1, null, req);
								component_lib.get_all_runnable_components(req, (err, resp) => {
									expect(err).to.deep.equal(null);
									expect(resp).to.deep.equal([{}]);
									done();
								});
							}
						},
						{
							itStatement: 'should return the error passed to the stub test_id=zygpqx',
							expectBlock: (done) => {
								const error = { statusCode: 500, msg: 'problem getting all runnable components' };
								tools.stubs.getDesignDocView.callsArgWith(1, error);
								component_lib.get_all_runnable_components({ query: { skip_cache: 'yes' } }, (err, resp) => {
									expect(err).to.deep.equal({
										msg: 'problem getting all runnable components',
										statusCode: 500
									});
									expect(resp).to.deep.equal(undefined);
									done();
								});
							}
						}
					]
				}
			]
		},
		// get_all_runnable_components
		{
			suiteDescribe: 'get_all_runnable_components',
			mainDescribe: 'Run get_all_runnable_components',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the doc passed in and no errors test_id=nqycqr',
							expectBlock: (done) => {
								const req = { rows: [{ doc: {} }] };
								tools.stubs.getDesignDocView.callsArgWith(1, null, req);
								component_lib.get_all_runnable_components(req, (err, resp) => {
									expect(err).to.deep.equal(null);
									expect(resp).to.deep.equal([{}]);
									done();
								});
							}
						},
						{
							itStatement: 'should return the error passed to the stub test_id=zygpqx',
							expectBlock: (done) => {
								const error = { statusCode: 500, msg: 'problem getting all runnable components' };
								tools.stubs.getDesignDocView.callsArgWith(1, error);
								component_lib.get_all_runnable_components({ query: { skip_cache: 'yes' } }, (err, resp) => {
									expect(err).to.deep.equal({
										msg: 'problem getting all runnable components',
										statusCode: 500
									});
									expect(resp).to.deep.equal(undefined);
									done();
								});
							}
						}
					]
				}
			]
		},
		// bulk_component_status                 		if (comp_doc.type === ev.STR.CA && comp_doc.api_url) {       get_each_cas_info
		// 			options.url = comp_doc.api_url + '/cainfo';					// CA's use this route
		{
			suiteDescribe: 'bulk_component_status',
			mainDescribe: 'Run bulk_component_status',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the bulk component status information test_id=bpusgv',
							expectBlock: (done) => {
								const stub = {
									body: {
										_id: 'my_ca',
										type: common.ev.STR.CA,
										api_url: 'https://api_url.com:443'
									}
								};
								const req = {
									body: {
										components: {
											my_ca: 'my component'
										},
									}
								};
								tools.stubs.getDesignDocView.callsArgWith(1, null, stub);
								tools.stubs.get_all_runnable_components = sinon.stub(component_lib, 'get_all_runnable_components').callsArgWith(1, stub);
								tools.stubs.get_all_runnable_components.onCall(1).callsArgWith(1, null, stub);
								tools.stubs.retry_req = sinon.stub(tools.misc, 'retry_req').callsArgWith(1, null, { statusCode: 200, body: req.body });
								component_lib.bulk_component_status(req, (err, resp) => {
									expect(err).to.deep.equal(null);
									expect(resp).to.deep.equal({
										my_ca: {
											status: 'ok',
											status_url: 'https://api_url.com:443/cainfo'
										}
									});
									tools.stubs.get_all_runnable_components.restore();
									tools.stubs.retry_req.restore();
									done();
								});
							}
						}
					]
				}
			]
		},
		// get_each_cas_info
		{
			suiteDescribe: 'get_each_cas_info',
			mainDescribe: 'Run get_each_cas_info',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return an empty object since no info will be returned  test_id=jfvhxl',
							expectBlock: (done) => {
								const req = { query: { ca_attrs: 'included' } };
								const comp_docs = [
									{
										display_name: 'component_one',
										type: common.ev.STR.CA,
									}
								];
								component_lib.get_each_cas_info(req, comp_docs, (err, resp) => {
									expect(err).to.deep.equal(null);
									expect(resp).to.deep.equal({});
									done();
								});
							}
						}
					]
				}
			]
		},

		// davids tests
		{
			suiteDescribe: 'comparing get-all-components vs get-a-component',
			mainDescribe: 'comparing get-all-components vs get-a-component ',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'ak - first component in get-all-components should be the same as get-a-component - test_id=ziyrlw',
							callFunction: () => {
								const fullResponse = JSON.parse(JSON.stringify(node_api_objects.get_nodes_full_response_b));
								tools.stubs.getDesignDocView.callsArgWith(1, null, fullResponse);
							},
							expectBlock: (done) => {
								const req = {
									url: '/ak/api/v1/components',
									query: {},
									params: {}
								};
								component_lib.get_all_components(req, (err, resp) => {
									const component_docs = resp.components;
									expect(err).to.equal(null);
									expect(component_docs[0]._id).to.equal('myca');

									const single = JSON.parse(JSON.stringify(node_api_objects.get_single_node_response_body_b));
									tools.stubs.getDoc.callsArgWith(1, null, single);
									const req2 = {
										url: '/ak/api/v1/components/' + component_docs[0]._id,
										query: {},
										params: {
											id: component_docs[0].id
										}
									};
									component_lib.load_component_by_id(req2, (err2, component_doc) => {
										expect(err2).to.equal(null);
										expect(component_doc._id).to.equal('myca');
										expect(JSON.stringify(tools.misc.sortItOut(component_doc))).to.equal(
											JSON.stringify(tools.misc.sortItOut(component_docs[0]))
										);

										tools.stubs.getDesignDocView.restore();
										tools.stubs.getDoc.restore();
										done();
									});
								});
							}
						}
					]
				},
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'session - first component in get-all-components should be the same as get-a-component - test_id=gdghsp',
							callFunction: () => {
								const fullResponse = JSON.parse(JSON.stringify(node_api_objects.get_nodes_full_response_b));
								tools.stubs.getDesignDocView.callsArgWith(1, null, fullResponse);
							},
							expectBlock: (done) => {
								const req = {
									url: '/api/v1/components',
									query: {},
									params: {}
								};
								component_lib.get_all_components(req, (err, resp) => {
									const component_docs = resp.components;
									expect(err).to.equal(null);
									expect(component_docs[0]._id).to.equal('myca');

									const single = JSON.parse(JSON.stringify(node_api_objects.get_single_node_response_body_b));
									tools.stubs.getDoc.callsArgWith(1, null, single);
									const req2 = {
										url: '/api/v1/components/' + component_docs[0]._id,
										query: {},
										params: {
											id: component_docs[0]._id
										}
									};
									component_lib.load_component_by_id(req2, (err2, component_doc) => {
										expect(err2).to.equal(null);
										expect(component_doc._id).to.equal('myca');
										expect(JSON.stringify(tools.misc.sortItOut(component_doc))).to.equal(
											JSON.stringify(tools.misc.sortItOut(component_docs[0]))
										);

										tools.stubs.getDesignDocView.restore();
										tools.stubs.getDoc.restore();
										done();
									});
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

describe('find_type() - find component type in url', () => {
	it('should return component type from urls w/id', (done) => {

		// trailing slash
		const result1 = component_lib.find_type({ path: '/ak/api/v1/components/msp-external/asdf/' });	// test w/dash
		expect(result1).to.equal('msp-external');
		const result2 = component_lib.find_type({ path: '/ak/api/v1/components/msp/asdf/' });
		expect(result2).to.equal('msp');

		// no trailing slash
		const result3 = component_lib.find_type({ path: '/ak/api/v1/components/msp-external/asdf' });	// test w/dash
		expect(result3).to.equal('msp-external');
		const result4 = component_lib.find_type({ path: '/ak/api/v1/components/msp/asdf' });
		expect(result4).to.equal('msp');
		done();
	});
	it('should return component type from urls w/o id', (done) => {

		// trailing slash
		const result1 = component_lib.find_type({ path: '/ak/api/v1/components/msp-external/' });		// test w/dash
		expect(result1).to.equal('msp-external');
		const result2 = component_lib.find_type({ path: '/ak/api/v1/components/msp/' });
		expect(result2).to.equal('msp');

		// no trailing slash
		const result3 = component_lib.find_type({ path: '/ak/api/v1/components/msp-external' });		// test w/dash
		expect(result3).to.equal('msp-external');
		const result4 = component_lib.find_type({ path: '/ak/api/v1/components/msp' });
		expect(result4).to.equal('msp');
		done();
	});

	it('should return null', (done) => {

		// trailing slash
		const result1 = component_lib.find_type({ path: '/ak/api/v1/components/' });
		expect(result1).to.equal(null);

		// no trailing slash
		const result2 = component_lib.find_type({ path: '/ak/api/v1/components' });
		expect(result2).to.equal(null);
		done();
	});
});
