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
// signature_collection.test.js - Test signature_collection
//------------------------------------------------------------
const common = require('../common-test-framework');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const tools = common.tools;
tools.misc = require('../../../libs/misc.js')(common.logger, common.tools);
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);
const myutils = require('../../testing-lib/test-middleware');
const signature_collection_objects = require('../../docs/signature_collection_objects.json');
const httpMocks = require('node-mocks-http');
const res = httpMocks.createResponse();
const next = sinon.stub();
let signature_collection_lib;

const req = {
	body: JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body)),
	params: {}
};

const createStubs = () => {
	return {
		getDesignDocView: sinon.stub(tools.otcc, 'getDesignDocView'),
		getDoc: sinon.stub(tools.otcc, 'getDoc'),
		repeatWriteSafe: sinon.stub(tools.otcc, 'repeatWriteSafe'),
		repeatDelete: sinon.stub(tools.otcc, 'repeatDelete'),
		writeDoc: sinon.stub(tools.couch_lib, 'writeDoc'),
		keyFromPublic: sinon.stub(tools._ecdsa, 'keyFromPublic')
	};
};

describe('Signature Collection Lib', () => {
	before((done) => {
		tools.stubs = createStubs();
		common.ev.STR.SIG_OPEN = 'open';
		common.ev.STR.SIG_CLOSED = 'closed';
		common.ev.HOST_URL = 'http://localhost:3000';
		signature_collection_lib = require('../../../libs/signature_collection_lib.js')(common.logger, common.ev, tools);
		tools.stubs.getAllPartyData = sinon.stub(signature_collection_lib, 'getAllPartyData');
		done();
	});
	after((done) => {
		myutils.restoreStubs(tools.stubs);
		done();
	});
	const testCollection = [
		// createOrAppendSignature
		{
			suiteDescribe: 'createOrAppendSignature',
			mainDescribe: 'Run createOrAppendSignature',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return an error and message - error sent to "getAllPartyData" stub  test_id=imcxtf',
							callFunction: () => {
								tools.stubs.getDoc.callsArgWith(1, { statusCode: 404 });
								tools.stubs.getAllPartyData.callsArgWith(0, {});
							},
							expectBlock: (done) => {
								signature_collection_lib.createOrAppendSignature(req, false, (resp) => {
									expect(resp.statusCode).to.equal(500);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify({ statusCode: 500, msg: 'problem loading external parties' }));
									done();
								});
							}
						},
						{
							itStatement: 'should return null - no known root certs - test_id=ebcyfc',
							callFunction: () => {
								tools.stubs.getDoc.callsArgWith(1, { statusCode: 404 });
								tools.stubs.getAllPartyData.callsArgWith(0, null, {});
								tools.stubs.repeatWriteSafe.callsArgWith(2, null);
							},
							expectBlock: (done) => {
								signature_collection_lib.createOrAppendSignature(req, false, (resp) => {
									expect(resp.statusCode).to.equal(400);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify({
										statusCode: 400,
										msg: '["signature cannot be validated. no known root certs for msp_id: org1"]',
									}));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - malformed signature test_id=xheqrm',
							callFunction: () => {
								tools.stubs.getDoc.callsArgWith(1, { statusCode: 404 });
								tools.stubs.getAllPartyData.callsArgWith(0, null);
								tools.stubs.is_populated_array = sinon.stub(tools.misc, 'is_populated_array').returns(true);
							},
							expectBlock: (done) => {
								signature_collection_lib.createOrAppendSignature(req, false, (resp) => {
									expect(resp.statusCode).to.equal(400);
									expect(JSON.stringify(resp)).to.equal(
										JSON.stringify({
											'statusCode': 400,
											'msg': '["proposal\'s signature is malformed for msp_id: org1"]'
										})
									);
									tools.stubs.is_populated_array.restore();
									done();
								});
							}
						}
					]
				}
			]
		},
		// build_destinations
		{
			suiteDescribe: 'build_destinations',
			mainDescribe: 'Run build_destinations',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: '(create) send 2 in (duplicate), get 1 back',
							callFunction: () => {
							},
							expectBlock: (done) => {
								const body = {
									orderers2sign: [{
										msp_id: 'test1',
										optools_url: 'http://localhost:3001',
									},
									{
										msp_id: 'test1',
										optools_url: 'http://localhost:3001',
									}]
								};
								const ret = signature_collection_lib.build_destinations(body, null);
								const expected = {
									'http://localhost:3001': {
										msp_id: 'test1',
										optools_url: 'http://localhost:3001'
									}
								};
								expect(JSON.stringify(ret)).to.equal(JSON.stringify(expected));
								done();
							}
						},
						{
							itStatement: '(create) send url with self in, get 0 back',
							callFunction: () => {
							},
							expectBlock: (done) => {
								const body = {
									orderers2sign: [{
										msp_id: 'test0',
										optools_url: 'http://localhost:3000',
										signature: 'something'
									}]
								};
								const ret = signature_collection_lib.build_destinations(body, null);
								const expected = {};
								expect(JSON.stringify(ret)).to.equal(JSON.stringify(expected));
								done();
							}
						},
						{
							itStatement: '(append - no body) send url with self in, get 0 back - append w/ no body',
							callFunction: () => {
							},
							expectBlock: (done) => {
								const doc = {
									orderers2sign: [{
										msp_id: 'test',
										optools_url: 'http://localhost:3000'
									}]
								};
								const ret = signature_collection_lib.build_destinations(null, doc);
								const expected = {};
								expect(JSON.stringify(ret)).to.equal(JSON.stringify(expected));
								done();
							}
						},
						{
							itStatement: '(append - w/body) 1 via body, 2 via doc, get 1 back - append w/ body',
							expectBlock: (done) => {
								const body = {
									orderers2sign: [{
										msp_id: 'test1',
										optools_url: 'http://localhost:3001',
										signature: 'something'
									}]
								};
								const doc = {
									orderers2sign: [{
										msp_id: 'test2',
										optools_url: 'http://localhost:3002'
									}, {
										msp_id: 'test1',
										optools_url: 'http://localhost:3001'
									}]
								};
								const ret = signature_collection_lib.build_destinations(body, doc);
								const expected = {
									'http://localhost:3002': {
										msp_id: 'test2',
										optools_url: 'http://localhost:3002'
									},
								};
								expect(JSON.stringify(ret)).to.equal(JSON.stringify(expected));
								done();
							}
						},
						{
							itStatement: '(append - w/body) 1 via body, 3 via doc (2 w/sig), get 1 back - append w/body - some signatures already exist',
							expectBlock: (done) => {
								const body = {
									orderers2sign: [{
										msp_id: 'test1',
										optools_url: 'http://localhost:3001',
									}]
								};
								const doc = {
									orderers2sign: [{
										msp_id: 'test3',
										optools_url: 'http://localhost:3003',
										signature: 'something'
									}, {
										msp_id: 'test2',
										optools_url: 'http://localhost:3002'
									}, {
										msp_id: 'test1',
										optools_url: 'http://localhost:3001',
										signature: 'something'
									}]
								};
								const ret = signature_collection_lib.build_destinations(body, doc);
								const expected = {
									'http://localhost:3002': {
										msp_id: 'test2',
										optools_url: 'http://localhost:3002'
									},
								};
								expect(JSON.stringify(ret)).to.equal(JSON.stringify(expected));
								done();
							}
						},
						{
							itStatement: '(append - w/body) 3 via orderers2sign, 1 via orgs2sign, get 2 back - append w/body - sig already exist, 1 new sig',
							callFunction: () => {
							},
							expectBlock: (done) => {
								const body = {
									orgs2sign: [{
										msp_id: 'test1',
										optools_url: 'http://localhost:3000',
										signature: 'something'
									}]
								};
								const doc = {
									orderers2sign: [{
										msp_id: 'test3',
										optools_url: 'http://localhost:3003',
										signature: 'something'
									}, {
										msp_id: 'test2',
										optools_url: 'http://localhost:3002',
									}, {
										msp_id: 'test1',
										optools_url: 'http://localhost:3000',
									}],
									orgs2sign: [{
										msp_id: 'test4',
										optools_url: 'http://localhost:3004',
									}],
								};
								const ret = signature_collection_lib.build_destinations(body, doc);
								const expected = {
									'http://localhost:3002': {
										msp_id: 'test2',
										optools_url: 'http://localhost:3002'
									},
									'http://localhost:3004': {
										msp_id: 'test4',
										optools_url: 'http://localhost:3004'
									}
								};
								expect(JSON.stringify(ret)).to.equal(JSON.stringify(expected));
								done();
							}
						},
						{
							itStatement: '(append - w/body) distribute=all, get back 4 - append w/body - distribute is "all"',
							callFunction: () => {
							},
							expectBlock: (done) => {
								const body = {
									orgs2sign: [{
										msp_id: 'test1',
										optools_url: 'http://localhost:3000',
										signature: 'something',
									}],
									distribute: 'all',
								};
								const doc = {
									orderers2sign: [{
										msp_id: 'test3',
										optools_url: 'http://localhost:3003',
										signature: 'something'
									}, {
										msp_id: 'test2',
										optools_url: 'http://localhost:3002',
									}, {
										msp_id: 'test1',
										optools_url: 'http://localhost:3001',
									}],
									orgs2sign: [{
										msp_id: 'test4',
										optools_url: 'http://localhost:3004',
									}],
								};
								const ret = signature_collection_lib.build_destinations(body, doc);
								const expected = {
									'http://localhost:3003': {
										msp_id: 'test3',
										optools_url: 'http://localhost:3003',
										signature: 'something'
									},
									'http://localhost:3002': {
										msp_id: 'test2',
										optools_url: 'http://localhost:3002'
									},
									'http://localhost:3001': {
										msp_id: 'test1',
										optools_url: 'http://localhost:3001',
									},
									'http://localhost:3004': {
										msp_id: 'test4',
										optools_url: 'http://localhost:3004'
									}
								};
								expect(JSON.stringify(ret)).to.equal(JSON.stringify(expected));
								done();
							}
						},
					]
				}
			]
		},
		// build_orderer_hostnames
		{
			suiteDescribe: 'build_orderer_hostnames',
			mainDescribe: 'Run build_orderer_hostnames',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return an empty array of hostnames test_id=goxwsv',
							expectBlock: (done) => {
								const filter = 'some_orderer';
								const req = {
									query: {
										filter_orderers: JSON.stringify([filter])
									}
								};
								const value = tools.misc.fmt_arr_of_strings_query_param(req, 'filter_orderers');
								expect(value).to.deep.equal([filter]);
								done();
							}
						}
					]
				}
			]
		},
		// include_full_details
		{
			suiteDescribe: 'include_full_details',
			mainDescribe: 'Run include_full_details',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a false response - details were omitted test_id=mqpmrw',
							expectBlock: (done) => {
								const req = {
									query: {
										full_details: 'omitted'
									}
								};
								const value = signature_collection_lib.include_full_details(req);
								expect(value).to.equal(false);
								done();
							}
						}
					]
				}
			]
		},
		// detect_status_filter
		{
			suiteDescribe: 'detect_status_filter',
			mainDescribe: 'Run detect_status_filter',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a false response - status of "all" sent into query test_id=akdmdt',
							expectBlock: (done) => {
								const req = {
									query: {
										status: 'all'
									}
								};
								const value = signature_collection_lib.detect_status_filter(req);
								expect(value).to.equal(false);
								done();
							}
						},
						{
							itStatement: 'should return a false response - status of "not_all" sent into query and reflected back test_id=wnejbf',
							expectBlock: (done) => {
								const req = {
									query: {
										status: 'not_all'
									}
								};
								const value = signature_collection_lib.detect_status_filter(req);
								expect(value).to.equal('not_all');
								done();
							}
						}
					]
				}
			]
		},
		// group_query_param_is_set
		{
			suiteDescribe: 'group_query_param_is_set',
			mainDescribe: 'Run group_query_param_is_set',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a response of true - "group_by" set to "channels" test_id=ekzuml',
							expectBlock: (done) => {
								const req = {
									query: {
										group_by: 'channels'
									}
								};
								const value = signature_collection_lib.group_query_param_is_set(req);
								expect(value).to.equal(true);
								done();
							}
						}
					]
				}
			]
		},
		//editSignatureCollectionVisibilities
		{
			suiteDescribe: 'editSignatureCollectionVisibilities',
			mainDescribe: 'Run editSignatureCollectionVisibilities',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return an error - no "tx_ids" sent in request test_id=bdaotj',
							expectBlock: (done) => {
								const req = { body: {} };
								signature_collection_lib.editSignatureCollectionVisibilities(req, (err, resp) => {
									expect(err).to.deep.equal({
										msg: 'missing array of transaction ids: "tx_ids"',
										statusCode: 400
									});
									expect(resp).to.deep.equal(undefined);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - no "visibility" sent in request test_id=rfujks',
							expectBlock: (done) => {
								const req = { body: { tx_ids: [] } };
								signature_collection_lib.editSignatureCollectionVisibilities(req, (err, resp) => {
									expect(err).to.deep.equal({ msg: 'missing field "visibility"', statusCode: 400 });
									expect(resp).to.deep.equal(undefined);
									done();
								});
							}
						},
						{
							itStatement: 'should claim to have edited signiture collection visibilities test_id=swoits',
							expectBlock: (done) => {
								const req = {
									body: {
										tx_ids: ['id1'],
										visibility: common.ev.STR.TX_ARCHIVE
									}
								};
								const doc = {
									rows: [
										{
											doc: {
												type: common.ev.STR.SIG_COLLECTION
											}
										}
									],
									visibility: common.ev.STR.TX_ARCHIVE
								};
								tools.stubs.getDoc.callsArgWith(1, null, doc);
								tools.stubs.bulkDatabase = sinon.stub(tools.couch_lib, 'bulkDatabase').callsArgWith(2, null);
								signature_collection_lib.editSignatureCollectionVisibilities(req, (err, resp) => {
									tools.stubs.bulkDatabase.restore();
									expect(err).to.equal(null);
									expect(resp).to.deep.equal({ edited: 1, message: 'ok' });
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - incorrect value for "visibility" sent to function test_id=wveoyp',
							expectBlock: (done) => {
								const req = {
									body: {
										tx_ids: ['id1'],
										visibility: 'this is not correct'
									}
								};
								signature_collection_lib.editSignatureCollectionVisibilities(req, (err, resp) => {
									expect(err).to.deep.equal({
										msg: 'incorrect value for "visibility". try "inbox" or "archive".',
										statusCode: 400
									});
									expect(resp).to.equal(undefined);
									done();
								});
							}
						},
						{
							itStatement: 'should  test_id=xmmdjg',
							expectBlock: (done) => {
								const req = {
									body: {
										tx_ids: ['id1'],
										visibility: common.ev.STR.TX_ARCHIVE
									}
								};
								tools.stubs.getDoc.callsArgWith(1, { statusCode: 500, msg: 'problem getting doc' });
								signature_collection_lib.editSignatureCollectionVisibilities(req, (err, resp) => {
									expect(err).to.deep.equal({ msg: 'problem getting doc', statusCode: 500 });
									expect(resp).to.equal(undefined);
									done();
								});
							}
						},
					]
				}
			]
		},
		{
			suiteDescribe: 'validateApiSignature',
			mainDescribe: 'Run validateApiSignature',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: '(create) send 2 in (duplicate), get 1 back',
							callFunction: () => {
								tools.stubs.getAllPartyData.callsArgWith(0, null, signature_collection_objects.all_party_data);
								tools.stubs.keyFromPublic.returns({
									verify: () => { return true; }
								});
							},
							expectBlock: (done) => {
								req.headers = {
									authorization: 'Signature for test'
								};

								signature_collection_lib.validateApiSignature(req, res, next);
								expect(next.called).to.be.true;
								done();
							}
						},
						// {
						// 	itStatement: '(create) send url with self in, get 0 back',
						// 	callFunction: () => {
						// 	},
						// 	expectBlock: (done) => {
						// 		const body = {
						// 			orderers2sign: [{
						// 				msp_id: 'test0',
						// 				optools_url: 'http://localhost:3000',
						// 				signature: 'something'
						// 			}]
						// 		};
						// 		const ret = signature_collection_lib.build_destinations(body, null);
						// 		const expected = {};
						// 		expect(JSON.stringify(ret)).to.equal(JSON.stringify(expected));
						// 		done();
						// 	}
						// },
						// {
						// 	itStatement: '(append - no body) send url with self in, get 0 back - append w/ no body',
						// 	callFunction: () => {
						// 	},
						// 	expectBlock: (done) => {
						// 		const doc = {
						// 			orderers2sign: [{
						// 				msp_id: 'test',
						// 				optools_url: 'http://localhost:3000'
						// 			}]
						// 		};
						// 		const ret = signature_collection_lib.build_destinations(null, doc);
						// 		const expected = {};
						// 		expect(JSON.stringify(ret)).to.equal(JSON.stringify(expected));
						// 		done();
						// 	}
						// },
						// {
						// 	itStatement: '(append - w/body) 1 via body, 2 via doc, get 1 back - append w/ body',
						// 	callFunction: () => {
						// 	},
						// 	expectBlock: (done) => {
						// 		const body = {
						// 			orderers2sign: [{
						// 				msp_id: 'test1',
						// 				optools_url: 'http://localhost:3001',
						// 				signature: 'something'						// should not see test1 in response b/c signature is set
						// 			}]
						// 		};
						// 		const doc = {
						// 			orderers2sign: [{
						// 				msp_id: 'test2',
						// 				optools_url: 'http://localhost:3002'
						// 			}, {
						// 				msp_id: 'test1',
						// 				optools_url: 'http://localhost:3001'
						// 			}]
						// 		};
						// 		const ret = signature_collection_lib.build_destinations(body, doc);
						// 		const expected = {
						// 			'http://localhost:3002': {
						// 				msp_id: 'test2',
						// 				optools_url: 'http://localhost:3002'
						// 			},
						// 		};
						// 		expect(JSON.stringify(ret)).to.equal(JSON.stringify(expected));
						// 		done();
						// 	}
						// },
						// {
						// 	itStatement: '(append - w/body) 1 via body, 3 via doc (2 w/sig), get 1 back - append w/body - some signatures already exist',
						// 	expectBlock: (done) => {
						// 		const body = {
						// 			orderers2sign: [{
						// 				msp_id: 'test1',
						// 				optools_url: 'http://localhost:3001',
						// 			}]
						// 		};
						// 		const doc = {
						// 			orderers2sign: [{
						// 				msp_id: 'test3',
						// 				optools_url: 'http://localhost:3003',
						// 				signature: 'something'
						// 			}, {
						// 				msp_id: 'test2',
						// 				optools_url: 'http://localhost:3002'
						// 			}, {
						// 				msp_id: 'test1',
						// 				optools_url: 'http://localhost:3001',
						// 				signature: 'something'
						// 			}]
						// 		};
						// 		const ret = signature_collection_lib.build_destinations(body, doc);
						// 		const expected = {
						// 			'http://localhost:3002': {
						// 				msp_id: 'test2',
						// 				optools_url: 'http://localhost:3002'
						// 			},
						// 		};
						// 		expect(JSON.stringify(ret)).to.equal(JSON.stringify(expected));
						// 		done();
						// 	}
						// },
						// {
						// 	itStatement: '(append - w/body) 3 via orderers2sign, 1 via orgs2sign, get 2 back, 1 new sig in body',
						// 	callFunction: () => {
						// 	},
						// 	expectBlock: (done) => {
						// 		const body = {
						// 			orgs2sign: [{
						// 				msp_id: 'test1',
						// 				optools_url: 'http://localhost:3000',
						// 				signature: 'something'
						// 			}]
						// 		};
						// 		const doc = {
						// 			orderers2sign: [{
						// 				msp_id: 'test3',
						// 				optools_url: 'http://localhost:3003',
						// 				signature: 'something'
						// 			}, {
						// 				msp_id: 'test2',
						// 				optools_url: 'http://localhost:3002',
						// 			}, {
						// 				msp_id: 'test1',
						// 				optools_url: 'http://localhost:3000',
						// 			}],
						// 			orgs2sign: [{
						// 				msp_id: 'test4',
						// 				optools_url: 'http://localhost:3004',
						// 			}],
						// 		};
						// 		const ret = signature_collection_lib.build_destinations(body, doc);
						// 		const expected = {
						// 			'http://localhost:3002': {
						// 				msp_id: 'test2',
						// 				optools_url: 'http://localhost:3002'
						// 			},
						// 			'http://localhost:3004': {
						// 				msp_id: 'test4',
						// 				optools_url: 'http://localhost:3004'
						// 			}
						// 		};
						// 		expect(JSON.stringify(ret)).to.equal(JSON.stringify(expected));
						// 		done();
						// 	}
						// },
						// {
						// 	itStatement: '(append - w/body) distribute=all, get back 4 - append w/body - distribute is "all"',
						// 	callFunction: () => {
						// 	},
						// 	expectBlock: (done) => {
						// 		const body = {
						// 			orgs2sign: [{
						// 				msp_id: 'test1',
						// 				optools_url: 'http://localhost:3000',
						// 				signature: 'something',
						// 			}],
						// 			distribute: 'all',
						// 		};
						// 		const doc = {
						// 			orderers2sign: [{
						// 				msp_id: 'test3',
						// 				optools_url: 'http://localhost:3003',
						// 				signature: 'something'
						// 			}, {
						// 				msp_id: 'test2',
						// 				optools_url: 'http://localhost:3002',
						// 			}, {
						// 				msp_id: 'test1',
						// 				optools_url: 'http://localhost:3001',
						// 			}],
						// 			orgs2sign: [{
						// 				msp_id: 'test4',
						// 				optools_url: 'http://localhost:3004',
						// 			}],
						// 		};
						// 		const ret = signature_collection_lib.build_destinations(body, doc);
						// 		const expected = {
						// 			'http://localhost:3003': {
						// 				msp_id: 'test3',
						// 				optools_url: 'http://localhost:3003',
						// 				signature: 'something'
						// 			},
						// 			'http://localhost:3002': {
						// 				msp_id: 'test2',
						// 				optools_url: 'http://localhost:3002'
						// 			},
						// 			'http://localhost:3001': {
						// 				msp_id: 'test1',
						// 				optools_url: 'http://localhost:3001',
						// 			},
						// 			'http://localhost:3004': {
						// 				msp_id: 'test4',
						// 				optools_url: 'http://localhost:3004'
						// 			}
						// 		};
						// 		expect(JSON.stringify(ret)).to.equal(JSON.stringify(expected));
						// 		done();
						// 	}
						// },
					]
				}
			]
		}
	];

	// call main test function to run this test collection
	common.mainTestFunction(testCollection, path_to_current_file);
});
