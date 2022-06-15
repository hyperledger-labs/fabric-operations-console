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
// couchdb.test.js - Test couchdb functions
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const logger = common.logger;
const ev = common.ev;
const config_doc = require('../../docs/config_doc.json');
const couch_objects = require('../../docs/couch_objects.json');
const myutils = require('../../testing-lib/test-middleware');
const filename = common.tools.path.basename(__filename);
const path_to_current_file = common.tools.path.join(__dirname + '/' + filename);

const opts = {
	url: 'http://127.0.0.1:5984',
	db_name: 'athena_system'
};
const tools = {										// stateless util libs should go here
	url: require('url'),
	fs: require('fs'),
	path: require('path'),
	async: require('async'),
	request: require('request'),
};
tools.misc = require('../../../libs/misc.js')(logger, tools);

let couch;

const createStubs = (couch) => {
	return {
		getDoc: sinon.stub(couch, 'getDoc'),
		writeDoc: sinon.stub(couch, 'writeDoc'),
		getDesignDocView: sinon.stub(couch, 'getDesignDocView'),
		getDesignDocIndex: sinon.stub(couch, 'getDesignDocIndex'),
		deleteDoc: sinon.stub(couch, 'deleteDoc'),
		repeatDelete: sinon.stub(couch, 'repeatDelete'),
		createDatabase: sinon.stub(couch, 'createDatabase'),
		getDatabase: sinon.stub(couch, 'getDatabase'),
		retry_req: sinon.stub(tools.misc, 'retry_req')
	};
};

describe('CouchDB from libs', () => {
	beforeEach(() => {
		tools.ot_misc = require('../../../libs/ot_misc.js')(logger, tools);
		couch = require('../../../libs/couchdb.js')(logger, tools, opts.url);
		tools.stubs = createStubs(couch);
	});
	afterEach(() => {
		myutils.restoreStubs(tools.stubs);
	});
	const testCollection = [
		// couch.createNewDoc
		{
			suiteDescribe: 'couch.createNewDoc ',
			mainDescribe: 'Run couch.createNewDoc ',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return doc passed in - stub called with valid response body test_id=dgduum',
							expectBlock: (done) => {
								const doc = JSON.parse(JSON.stringify(config_doc));
								const opts = {
									db_name: ev.DB_COMPONENTS
								};
								tools.stubs.retry_req.callsArgWith(1, null, couch_objects.response);
								couch.createNewDoc(opts, doc, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(doc));
									done();
								});
							}
						},
						{
							itStatement: 'should return error and no response - stub called with 500 error test_id=chocmu',
							expectBlock: (done) => {
								const doc = JSON.parse(JSON.stringify(config_doc));
								const opts = {
									db_name: ev.DB_COMPONENTS
								};
								tools.stubs.retry_req.callsArgWith(1, 500);
								couch.createNewDoc(opts, doc, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(resp).to.equal(null);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - doc not passed test_id=tpispy',
							expectBlock: (done) => {
								couch.createNewDoc({}, null, (err, resp) => {
									expect(err).to.equal(400);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify({ error: 'doc not passed' }));
									done();
								});
							}
						}
					]
				}
			]
		},
		// writeDoc
		{
			suiteDescribe: 'writeDoc',
			mainDescribe: 'Run writeDoc',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the doc passed in - valid params test_id=mncgmh',
							expectBlock: (done) => {
								const doc = JSON.parse(JSON.stringify(config_doc));
								const opts = {
									db_name: 'athena_testing'
								};
								tools.stubs.retry_req.callsArgWith(1, null, couch_objects.response);
								tools.stubs.writeDoc.restore();		// need to restore this function to use it
								couch.writeDoc(opts, doc, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(doc));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - doc._id removed test_id=efraue',
							expectBlock: (done) => {
								const doc = JSON.parse(JSON.stringify(config_doc));
								delete doc._id;
								const opts = {
									db_name: 'athena_testing'
								};
								tools.stubs.retry_req.callsArgWith(1, null, couch_objects.response);
								tools.stubs.writeDoc.restore();		// need to restore this function to use it
								couch.writeDoc(opts, doc, (err, resp) => {
									expect(err).to.equal(400);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify({ 'error': 'doc id not passed' }));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - faulty input into function test_id=yensjg',
							expectBlock: (done) => {
								const doc = JSON.parse(JSON.stringify(config_doc));
								const opts = {
									db_name: 'athena_testing'
								};
								tools.stubs.retry_req.callsArgWith(1, 500);
								tools.stubs.writeDoc.restore();		// need to restore this function to use it
								couch.writeDoc(opts, doc, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(resp).to.equal(null);
									done();
								});
							}
						}
					]
				}
			]
		},
		// repeatWriteSafe
		{
			suiteDescribe: 'repeatWriteSafe',
			mainDescribe: 'Run repeatWriteSafe',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return doc - valid path to the bottom of the function but no doc in opts object test_id=olpokk',
							expectBlock: (done) => {
								const doc = JSON.parse(JSON.stringify(config_doc));
								tools.stubs.getDoc.callsArgWith(1, null, couch_objects.response);
								tools.stubs.writeDoc.callsArgWith(2, null, doc);
								const opts = {};
								couch.repeatWriteSafe(opts, (doc) => {
									return { doc: doc };
								}, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(doc));
									done();
								});
							}
						},
						{
							itStatement: 'should return the doc that was passed in - opts object included doc test_id=eqbbsi',
							expectBlock: (done) => {
								const doc = JSON.parse(JSON.stringify(config_doc));
								tools.stubs.getDoc.callsArgWith(1, null, couch_objects.response);
								tools.stubs.writeDoc.callsArgWith(2, null, doc);
								const opts = {
									attempt: 'this is not a number so the function will change the value of attempt to 1',
									doc: doc
								};
								couch.repeatWriteSafe(opts, (doc) => {
									return { doc: doc };
								}, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(doc));
									done();
								});
							}
						},
						{
							itStatement: 'should return the doc that was passed in - opts object included doc - attempts set = 2 test_id=yibqhg',
							expectBlock: (done) => {
								const doc = JSON.parse(JSON.stringify(config_doc));
								tools.stubs.getDoc.callsArgWith(1, null, couch_objects.response);
								tools.stubs.writeDoc.callsArgWith(2, null, doc);
								const opts = {
									attempt: 2,
									doc: doc
								};
								couch.repeatWriteSafe(opts, (doc) => {
									return { doc: doc };
								}, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(doc));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - error passed to getDoc function via sinon stub  test_id=jopbyl',
							expectBlock: (done) => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'problem getting doc';
								tools.stubs.getDoc.callsArgWith(1, err);
								couch.repeatWriteSafe(opts, (doc) => {
									return { doc: doc };
								}, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('problem getting doc');
									expect(resp).to.equal(null);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - error sent to modify_doc_logic_sync function test_id=xhfaue',
							expectBlock: (done) => {
								const doc = JSON.parse(JSON.stringify(config_doc));
								tools.stubs.getDoc.callsArgWith(1, null, couch_objects.response);
								tools.stubs.writeDoc.callsArgWith(2, null, doc);
								const opts = {};
								couch.repeatWriteSafe(opts, () => {
									return { error: { statusCode: 500, msg: 'error sent to function' } };
								}, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('error sent to function');
									expect(resp).to.equal(null);
									done();
								});
							}
						},
						{
							itStatement: 'should return an invalid use error - empty string sent to modify_doc_logic_sync function test_id=tmiprm',
							expectBlock: (done) => {
								const doc = JSON.parse(JSON.stringify(config_doc));
								tools.stubs.getDoc.callsArgWith(1, null, couch_objects.response);
								tools.stubs.writeDoc.callsArgWith(2, null, doc);
								const opts = {};
								couch.repeatWriteSafe(opts, () => {
									return '';
								}, (err, resp) => {
									expect(err.statusCode).to.equal(400);
									expect(err.error).to.equal('invalid use of repeatWriteSafe()');
									expect(resp).to.equal(null);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error with a status code of 409 - error sent from writeDoc stub and attempts set > 7 test_id=ocnzgg',
							expectBlock: (done) => {
								const err = {};
								err.statusCode = 409;
								err.msg = 'error writing doc';
								tools.stubs.getDoc.callsArgWith(1, null, couch_objects.response);
								tools.stubs.writeDoc.callsArgWith(2, err, null);
								const opts = {
									attempt: 8,
									doc: {
										_id: 'test_id'
									}
								};
								couch.repeatWriteSafe(opts, (doc) => {
									return { doc: doc };
								}, (err, resp) => {
									expect(err.statusCode).to.equal(409);
									expect(err.msg).to.equal('error writing doc');
									expect(resp).to.equal(null);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error with a status code of 409 - error sent from writeDoc stub and attempts set = 6 test_id=mbkztg',
							expectBlock: (done) => {
								const err = {};
								err.statusCode = 409;
								err.msg = 'error writing doc';
								tools.stubs.getDoc.callsArgWith(1, null, couch_objects.response);
								tools.stubs.writeDoc.callsArgWith(2, err, null);
								const opts = {
									attempt: 6,
									doc: {
										_id: 'test_id'
									}
								};
								couch.repeatWriteSafe(opts, (doc) => {
									return { doc: doc };
								}, (err, resp) => {
									expect(err.statusCode).to.equal(409);
									expect(err.msg).to.equal('error writing doc');
									expect(resp).to.equal(null);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error with a status code of 500 - error sent from writeDoc stub test_id=ofrhla',
							expectBlock: (done) => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'error writing doc';
								tools.stubs.getDoc.callsArgWith(1, null, couch_objects.response);
								tools.stubs.writeDoc.callsArgWith(2, err, null);
								const opts = {};
								couch.repeatWriteSafe(opts, (doc) => {
									return { doc: doc };
								}, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('error writing doc');
									expect(resp).to.equal(null);
									done();
								});
							}
						}
					]
				}
			]
		},
		// getDoc
		{
			suiteDescribe: 'getDoc',
			mainDescribe: 'Run getDoc',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the doc passed in through the stub test_id=xbkyar',
							expectBlock: (done) => {
								tools.stubs.getDoc.restore();
								tools.stubs.retry_req.callsArgWith(1, null, couch_objects.response);
								const opts = {
									url: 'http://localhost:3000',
									db_name: 'test-db',
									_id: 'test-id',
									query: 'test-query'
								};
								couch.getDoc(opts, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(JSON.parse(JSON.stringify(resp)))).to.equal(JSON.stringify(JSON.parse(couch_objects.response.body)));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - 500 passed through request stub test_id=miycot',
							expectBlock: (done) => {
								tools.stubs.getDoc.restore();
								tools.stubs.retry_req.callsArgWith(1, 500);
								couch.getDoc(opts, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(resp).to.equal(null);
									done();
								});
							}
						}
					]
				}
			]
		},
		// getDesignDocView
		{
			suiteDescribe: 'getDesignDocView',
			mainDescribe: 'Run getDesignDocView',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the doc passed in through the stub test_id=pztloq',
							expectBlock: (done) => {
								tools.stubs.getDesignDocView.restore();
								tools.stubs.retry_req.callsArgWith(1, null, couch_objects.response);
								const opts = {
									db_name: 'test-db',
									_id: 'test-id',
									view: 'test-view',
									query: 'test-query'
								};
								couch.getDesignDocView(opts, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(JSON.parse(JSON.stringify(resp)))).to.equal(JSON.stringify(JSON.parse(couch_objects.response.body)));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - 500 passed through request stub test_id=wqpsgq',
							expectBlock: (done) => {
								tools.stubs.getDesignDocView.restore();
								tools.stubs.retry_req.callsArgWith(1, 500);
								couch.getDesignDocView(opts, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(resp).to.equal(null);
									done();
								});
							}
						}
					]
				}
			]
		},
		// getDesignDocIndex
		{
			suiteDescribe: 'getDesignDocIndex',
			mainDescribe: 'Run getDesignDocIndex',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the doc passed in through the stub test_id=irnoat',
							expectBlock: (done) => {
								tools.stubs.getDesignDocIndex.restore();
								tools.stubs.retry_req.callsArgWith(1, null, couch_objects.response);
								const opts = {
									db_name: 'test-db'
								};
								couch.getDesignDocIndex(opts, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(JSON.parse(JSON.stringify(resp)))).to.equal(JSON.stringify(JSON.parse(couch_objects.response.body)));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - 500 passed through request stub test_id=bkzkry',
							expectBlock: (done) => {
								tools.stubs.getDesignDocIndex.restore();
								tools.stubs.retry_req.callsArgWith(1, 500);
								const opts = {
									db_name: 'test-db'
								};
								couch.getDesignDocIndex(opts, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(resp).to.equal(null);
									done();
								});
							}
						}
					]
				}
			]
		},
		{
			suiteDescribe: 'deleteDoc',
			mainDescribe: 'Run deleteDoc',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the correct response - all valid params passed in test_id=naysqb',
							expectBlock: (done) => {
								tools.stubs.deleteDoc.restore();
								tools.stubs.retry_req.callsArgWith(1, null, couch_objects.response);
								const opts = {
									_id: 'test-id',
									_rev: 'test-rev',
									db_name: 'test-db'
								};
								couch.deleteDoc(opts, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(JSON.parse(JSON.stringify(resp)))).to.equal(JSON.stringify(JSON.parse(couch_objects.response.body)));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - error passed to the retry_req stub test_id=mmfkov',
							expectBlock: (done) => {
								tools.stubs.deleteDoc.restore();
								tools.stubs.retry_req.callsArgWith(1, 500);
								const opts = {
									_id: 'test-id',
									_rev: 'test-rev',
									db_name: 'test-db'
								};
								couch.deleteDoc(opts, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(resp).to.equal(null);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - no opts object passed test_id=qwnrth',
							expectBlock: (done) => {
								tools.stubs.deleteDoc.restore();
								couch.deleteDoc(null, (err, resp) => {
									expect(err).to.equal(400);
									expect(resp.error).to.equal('no opts provided to delete');
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - no doc passed and no opts._id passed test_id=mxsuqe',
							expectBlock: (done) => {
								tools.stubs.deleteDoc.restore();
								const opts = {
									_rev: 'test-rev',
									db_name: 'test-db'
								};
								couch.deleteDoc(opts, (err, resp) => {
									expect(err).to.equal(400);
									expect(resp.error).to.equal('no _id provided to delete');
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - no doc passed and no opts._rev passed test_id=qxfkpu',
							expectBlock: (done) => {
								tools.stubs.deleteDoc.restore();
								const opts = {
									_id: 'test-id',
									db_name: 'test-db'
								};
								couch.deleteDoc(opts, (err, resp) => {
									expect(err).to.equal(400);
									expect(resp.error).to.equal('no _rev provided to delete');
									done();
								});
							}
						},
					]
				}
			]
		},
		// repeatDelete
		{
			suiteDescribe: 'repeatDelete',
			mainDescribe: 'Run repeatDelete',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid response and no errors - all params are valid as well as the response test_id=tpmwka',
							expectBlock: (done) => {
								tools.stubs.repeatDelete.restore();
								tools.stubs.getDoc.restore();
								tools.stubs.deleteDoc.callsArgWith(1, null, couch_objects.valid_create_or_delete_response);
								const opts = {
									_id: 'test-id',
									_rev: 'test-rev',
								};
								couch.repeatDelete(opts, 1, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(couch_objects.valid_create_or_delete_response));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - opts object had no id test_id=ivxeqm',
							expectBlock: (done) => {
								tools.stubs.repeatDelete.restore();
								tools.stubs.getDoc.restore();
								tools.stubs.deleteDoc.restore();
								const opts = {
									_rev: 'test-rev',
								};
								couch.repeatDelete(opts, 1, (err, resp) => {
									expect(err).to.equal(400);
									expect(resp).to.equal('problem');
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - no opts object passed test_id=xvzrhw',
							expectBlock: (done) => {
								tools.stubs.repeatDelete.restore();
								tools.stubs.getDoc.restore();
								tools.stubs.deleteDoc.restore();
								couch.repeatDelete(null, 1, (err, resp) => {
									expect(err).to.equal(400);
									expect(resp).to.equal('problem');
									done();
								});
							}
						},
						{
							itStatement: 'should return a valid response - no _rev in opts so getDoc passes a doc and gets the _rev from there test_id=pcbqsx',
							expectBlock: (done) => {
								const doc = JSON.parse(JSON.stringify(config_doc));
								tools.stubs.repeatDelete.restore();
								tools.stubs.getDoc.callsArgWith(1, null, doc);
								tools.stubs.deleteDoc.callsArgWith(1, null, couch_objects.valid_create_or_delete_response);
								const opts = {
									_id: 'test-id'
								};
								couch.repeatDelete(opts, 1, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(couch_objects.valid_create_or_delete_response));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error and the retrieved from getDoc - error passed to getDoc stub test_id=hlcbgo',
							expectBlock: (done) => {
								const doc = JSON.parse(JSON.stringify(config_doc));
								const err = {};
								err.statusCode = 500;
								tools.stubs.repeatDelete.restore();
								tools.stubs.getDoc.callsArgWith(1, err, doc);
								tools.stubs.deleteDoc.restore();
								const opts = {
									_id: 'test-id'
								};
								couch.repeatDelete(opts, 1, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(doc));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error and the appropriate response body - error passed to deleteDoc stub test_id=kbrmch',
							expectBlock: (done) => {
								const err = {};
								err.statusCode = 500;
								tools.stubs.repeatDelete.restore();
								tools.stubs.getDoc.restore();
								tools.stubs.deleteDoc.callsArgWith(1, err, couch_objects.error_create_or_delete_response);
								const opts = {
									_id: 'test-id',
									_rev: 'test-rev',
								};
								couch.repeatDelete(opts, 1, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(couch_objects.error_create_or_delete_response));
									done();
								});
							}
						},
						{
							itStatement: 'should return a 409 error - 409 error passed to deleteDoc stub and attempts > 5 test_id=zgumrf',
							expectBlock: (done) => {
								const doc = JSON.parse(JSON.stringify(config_doc));
								const err = {};
								err.statusCode = 409;
								tools.stubs.repeatDelete.restore();
								tools.stubs.getDoc.callsArgWith(1, null, doc);
								tools.stubs.deleteDoc.callsArgWith(1, 409, couch_objects.error_create_or_delete_response);
								const opts = {
									_id: 'test-id',
									_rev: 'test-rev',
								};
								couch.repeatDelete(opts, 6, (err, resp) => {
									expect(err).to.equal(409);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(couch_objects.error_create_or_delete_response));
									done();
								});
							}
						},
						{
							itStatement: 'should return a 409 error - 409 error passed to deleteDoc stub and attempts = 5 test_id=eregql',
							expectBlock: (done) => {
								const doc = JSON.parse(JSON.stringify(config_doc));
								const err = {};
								err.statusCode = 409;
								tools.stubs.repeatDelete.restore();
								tools.stubs.getDoc.callsArgWith(1, null, doc);
								tools.stubs.deleteDoc.callsArgWith(1, 409, couch_objects.error_create_or_delete_response);
								const opts = {
									_id: 'test-id',
									_rev: 'test-rev',
								};
								couch.repeatDelete(opts, 5, (err, resp) => {
									expect(err).to.equal(409);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(couch_objects.error_create_or_delete_response));
									done();
								});
							}
						}
					]
				}
			]
		},
		// createDatabase
		{
			suiteDescribe: 'createDatabase',
			mainDescribe: 'Run createDatabase',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return no errors and a valid response - everything passed was correct test_id=gqjfrk',
							expectBlock: (done) => {
								tools.stubs.createDatabase.restore();
								tools.stubs.retry_req.callsArgWith(1, null, couch_objects.response);
								const opts = {
									db_name: 'test-db'
								};
								couch.createDatabase(opts, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(JSON.parse(JSON.stringify(resp)))).to.equal(JSON.stringify(JSON.parse(couch_objects.response.body)));
									done();
								});

							}
						},
						{
							itStatement: 'should return an error - error passed through request stub test_id=msjfzx',
							expectBlock: (done) => {
								const err = {};
								err.statusCode = 500;
								tools.stubs.createDatabase.restore();
								tools.stubs.retry_req.callsArgWith(1, err);
								const opts = {
									db_name: 'test-db'
								};
								couch.createDatabase(opts, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(resp).to.equal(null);
									done();
								});

							}
						}
					]
				}
			]
		},
		// getDatabase
		{
			suiteDescribe: 'getDatabase',
			mainDescribe: 'Run getDatabase',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return no errors and a valid response - everything passed was correct test_id=xpvyjw',
							expectBlock: (done) => {
								tools.stubs.getDatabase.restore();
								tools.stubs.retry_req.callsArgWith(1, null, couch_objects.response);
								const opts = {
									db_name: 'test-db',
									query: 'test-query'
								};
								couch.getDatabase(opts, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(JSON.parse(JSON.stringify(resp)))).to.equal(JSON.stringify(JSON.parse(couch_objects.response.body)));
									done();
								});

							}
						},
						{
							itStatement: 'should return an error - error passed through request stub test_id=vhsods',
							expectBlock: (done) => {
								const err = {};
								err.statusCode = 500;
								tools.stubs.getDatabase.restore();
								tools.stubs.retry_req.callsArgWith(1, err);
								couch.getDatabase(opts, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(resp).to.equal(null);
									done();
								});

							}
						}
					]
				}
			]
		},
		// bulkDatabase
		{
			suiteDescribe: 'bulkDatabase',
			mainDescribe: 'Run bulkDatabase',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return no errors and a valid response - everything passed was correct test_id=vhidmp',
							expectBlock: (done) => {
								tools.stubs.getDatabase.restore();
								tools.stubs.retry_req.callsArgWith(1, null, couch_objects.response);
								const opts = {
									db_name: 'test-db',
									query: 'test-query'
								};
								couch.bulkDatabase(opts, couch_objects.payload, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(JSON.parse(JSON.stringify(resp)))).to.equal(JSON.stringify(JSON.parse(couch_objects.response.body)));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - no payload was passed test_id=bmocwa',
							expectBlock: (done) => {
								tools.stubs.getDatabase.restore();
								tools.stubs.retry_req.callsArgWith(1, null, couch_objects.response);
								const opts = {
									db_name: 'test-db',
									query: 'test-query'
								};
								couch.bulkDatabase(opts, null, (err, resp) => {
									expect(err).to.equal(400);
									expect(JSON.stringify(JSON.parse(JSON.stringify(resp)))).to.equal(
										JSON.stringify({ 'error': '"payload" argument not passed or its missing the "docs" field' })
									);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - error passed to request stub test_id=erapfk',
							expectBlock: (done) => {
								tools.stubs.getDatabase.restore();
								const err = {
									statusCode: 500,
									body: JSON.stringify({ message: 'unable to perform req' })
								};
								tools.stubs.retry_req.callsArgWith(1, null, err);
								const opts = {
									db_name: 'test-db',
									query: 'test-query'
								};
								couch.bulkDatabase(opts, couch_objects.payload, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(err.message).to.equal('unable to perform req');
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - error passed to request stub test_id=xrasfk',
							expectBlock: (done) => {
								tools.stubs.getDatabase.restore();
								const err = 'oh hell ETIMEDOUT something something something';
								tools.stubs.retry_req.callsArgWith(1, err);
								const opts = {
									db_name: 'test-db',
									query: 'test-query'
								};
								couch.bulkDatabase(opts, couch_objects.payload, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(err.error).to.equal('resp is null');
									done();
								});
							}
						}
					]
				}
			]
		},
		// startCompaction
		{
			suiteDescribe: 'startCompaction',
			mainDescribe: 'Run startCompaction',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return no errors and a valid response - everything passed was correct test_id=ajzqnx',
							expectBlock: (done) => {
								tools.stubs.getDatabase.restore();
								tools.stubs.retry_req.callsArgWith(1, null, couch_objects.response);
								const opts = {
									db_name: 'test-db',
									query: 'test-query'
								};
								couch.startCompaction(opts, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(JSON.parse(JSON.stringify(resp)))).to.equal(JSON.stringify(JSON.parse(couch_objects.response.body)));
									done();
								});

							}
						},
						{
							itStatement: 'should return an error - error passed to request stub test_id=sbjgmq',
							expectBlock: (done) => {
								tools.stubs.getDatabase.restore();
								tools.stubs.retry_req.callsArgWith(1, null, null);
								const opts = {
									db_name: 'test-db',
									query: 'test-query'
								};
								couch.startCompaction(opts, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(err.error).to.equal('resp is null');
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
