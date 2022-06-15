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
// ot_cache_couch.test.js - Test ot_cache_couch functions
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const logger = common.logger;
const config_doc = require('../../docs/config_doc.json');
const myutils = require('../../testing-lib/test-middleware');
const tools = common.tools;
const ev = common.ev;
const couch = require('../../../libs/couchdb.js')(logger, tools, ev.DB_CONNECTION_STRING);
const couch_docs = require('../../docs/couch_objects.json');
const otcc_objects = require('../../docs/otcc_objects.json');
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);

// ---------------
// Cache Setups
// ---------------
const NodeCache = require('node-cache');
const opts = {
	stdTTL: 15,				// the default expiration in seconds
	checkperiod: 15,		// the period in seconds for the delete check interval
	deleteOnExpire: true	// if true variables will be deleted automatically when they expire
};
const cl_cache = new NodeCache(opts);

let otcc;

const createStubs = () => {
	return {
		createNewDoc: sinon.stub(couch, 'createNewDoc'),
		writeDoc: sinon.stub(couch, 'writeDoc'),
		repeatWriteSafe: sinon.stub(couch, 'repeatWriteSafe'),
		repeatDelete: sinon.stub(couch, 'repeatDelete'),
		getDoc: sinon.stub(couch, 'getDoc'),
		get: sinon.stub(cl_cache, 'get'),
		set: sinon.stub(cl_cache, 'set'),
		getDesignDocView: sinon.stub(couch, 'getDesignDocView'),
		del: sinon.stub(cl_cache, 'del'),
		flushAll: sinon.stub(cl_cache, 'flushAll'),
		getStats: sinon.stub(cl_cache, 'getStats'),
		keys: sinon.stub(cl_cache, 'keys'),
		getDatabase: sinon.stub(couch, 'getDatabase')
	};
};

describe('CouchDB from libs', () => {
	before(() => {
		this.stubs = createStubs();
		otcc = require('../../../libs/ot_cache_couch.js')(common.logger, common.ev, tools, this.stubs, this.stubs);
	});
	afterEach(() => {
		myutils.restoreStubs(this.stubs);
	});
	const testCollection = [
		// cache_couch.createNewDoc
		{
			suiteDescribe: 'cache_couch.createNewDoc',
			mainDescribe: 'Run cache_couch.createNewDoc',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid response - stub passed valid response test_id=hpbbah',
							expectBlock: (done) => {
								this.stubs.createNewDoc.callsArgWith(2, null, couch_docs.valid_create_or_delete_response);
								const opts = {
									url: 'http://127.0.0.1:5984',
									db_name: 'athena_system'
								};
								const doc = JSON.parse(JSON.stringify(config_doc));
								const options = {
									expires: 10000,
									DO_NOT_WRITE_THROUGH: false,
									EXCLUDE_CACHE: false,
								};
								otcc.createNewDoc(opts, doc, options, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(couch_docs.valid_create_or_delete_response));
									myutils.restoreStubs(this.stubs);
									done();
								});
							}
						},
						{
							itStatement: 'should return a valid response - stub passed valid response but EXCLUDE_CACHE is set to true test_id=oifrjw',
							expectBlock: (done) => {
								this.stubs.createNewDoc.callsArgWith(2, null, couch_docs.valid_create_or_delete_response);
								const opts = {
									url: 'http://127.0.0.1:5984',
									db_name: 'athena_system'
								};
								const doc = JSON.parse(JSON.stringify(config_doc));
								const options = {
									expires: 10000,
									DO_NOT_WRITE_THROUGH: false,
									EXCLUDE_CACHE: true,
								};
								otcc.createNewDoc(opts, doc, options, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(couch_docs.valid_create_or_delete_response));
									myutils.restoreStubs(this.stubs);
									done();
								});
							}
						},
						{
							itStatement: 'should write to cache but not db and return doc passed in test_id=zcwdtw',
							expectBlock: (done) => {
								const opts = {
									url: 'http://127.0.0.1:5984',
									db_name: 'athena_system'
								};
								const doc = JSON.parse(JSON.stringify(config_doc));
								const options = {
									expires: 10000,
									DO_NOT_WRITE_THROUGH: true,
									EXCLUDE_CACHE: false,
								};
								otcc.createNewDoc(opts, doc, options, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(doc));
									done();
								});
							}
						},
						{
							itStatement: 'should not write to cache or db but return doc passed in test_id=eausub',
							expectBlock: (done) => {
								const opts = {
									url: 'http://127.0.0.1:5984',
									db_name: 'athena_system'
								};
								const doc = JSON.parse(JSON.stringify(config_doc));
								const options = {
									expires: 10000,
									DO_NOT_WRITE_THROUGH: true,
									EXCLUDE_CACHE: true,
								};
								otcc.createNewDoc(opts, doc, options, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(doc));
									done();
								});
							}
						},
						{
							itStatement: 'should return a valid response - removed options argument - 3 argument call test_id=dsgcri',
							expectBlock: (done) => {
								const opts = {
									url: 'http://127.0.0.1:5984',
									db_name: 'athena_system'
								};
								const doc = JSON.parse(JSON.stringify(config_doc));
								otcc.createNewDoc(opts, doc, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(couch_docs.valid_create_or_delete_response));
									done();
								});
							}
						}
					]
				}
			]
		},
		// cache_couch.writeDoc
		{
			suiteDescribe: 'cache_couch.writeDoc',
			mainDescribe: 'Run cache_couch.writeDoc',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the doc passed in - does not write to cache test_id=zvswas',
							expectBlock: (done) => {
								this.stubs.writeDoc.callsArgWith(2, null, config_doc);
								const doc = JSON.parse(JSON.stringify(config_doc));
								// write the doc
								const opts = {
									url: 'http://127.0.0.1:5984',
									db_name: 'athena_system'
								};
								const options = {
									expires: 10000,
									DO_NOT_WRITE_THROUGH: false,
									EXCLUDE_CACHE: false,
								};
								otcc.writeDoc(opts, doc, options, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(doc));
									myutils.restoreStubs(this.stubs);
									done();
								});
							}
						},
						{
							itStatement: 'should return the doc passed in - options not sent into the function test_id=bfymkv',
							expectBlock: (done) => {
								this.stubs.writeDoc.callsArgWith(2, null, config_doc);
								const doc = JSON.parse(JSON.stringify(config_doc));
								// write the doc
								const opts = {
									url: 'http://127.0.0.1:5984',
									db_name: 'athena_system'
								};
								otcc.writeDoc(opts, doc, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(doc));
									myutils.restoreStubs(this.stubs);
									done();
								});
							}
						},
						{
							itStatement: 'should return the doc passed in - EXCLUDE_CACHE set to true test_id=dqxifj',
							expectBlock: (done) => {
								this.stubs.writeDoc.callsArgWith(2, null, config_doc);
								const doc = JSON.parse(JSON.stringify(config_doc));
								// write the doc
								const opts = {
									url: 'http://127.0.0.1:5984',
									db_name: 'athena_system'
								};
								const options = {
									expires: 10000,
									DO_NOT_WRITE_THROUGH: false,
									EXCLUDE_CACHE: true,
								};
								otcc.writeDoc(opts, doc, options, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(doc));
									myutils.restoreStubs(this.stubs);
									done();
								});
							}
						},
						{
							itStatement: 'should return doc passed in and exercise calling otcc.writeDoc with 3 args - no options object test_id=bqsvae',
							expectBlock: (done) => {
								this.stubs.writeDoc.callsArgWith(2, null, config_doc);
								const doc = JSON.parse(JSON.stringify(config_doc));
								const opts = {
									url: 'http://127.0.0.1:5984',
									db_name: 'athena_system'
								};
								otcc.writeDoc(opts, doc, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(doc));
									myutils.restoreStubs(this.stubs);
									done();
								});
							},
						},
						{
							itStatement: 'should not write to either the db cache cache and return whatever doc that was passed in test_id=wfgcop',
							expectBlock: (done) => {
								this.stubs.writeDoc.callsArgWith(2, null, config_doc);
								const doc = { prop: 'a prop' };
								const opts = {
									url: 'http://127.0.0.1:5984',
									db_name: 'athena_system'
								};
								const options = {
									expires: 10000,
									DO_NOT_WRITE_THROUGH: true,
									EXCLUDE_CACHE: true,
								};
								otcc.writeDoc(opts, doc, options, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify({ prop: 'a prop' }));
									myutils.restoreStubs(this.stubs);
									done();
								});
							},
						},
						{
							itStatement: 'should write to cache but not to the db and return whatever doc that was passed in test_id=qwioio',
							expectBlock: (done) => {
								this.stubs.writeDoc.callsArgWith(2, null, config_doc);
								const doc = { prop: 'a prop' };
								const opts = {
									url: 'http://127.0.0.1:5984',
									db_name: 'athena_system'
								};
								const options = {
									expires: 10000,
									DO_NOT_WRITE_THROUGH: true,
									EXCLUDE_CACHE: false,
								};
								otcc.writeDoc(opts, doc, options, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify({ prop: 'a prop' }));
									myutils.restoreStubs(this.stubs);
									done();
								});
							}
						},
						{
							itStatement: 'should write to cache but fail to write to the db and return whatever doc that was passed in test_id=woxsxe',
							expectBlock: (done) => {
								this.stubs.writeDoc.callsArgWith(2, null, config_doc);
								const doc = JSON.parse(JSON.stringify(config_doc));
								const opts = {
									url: 'http://127.0.0.1:5984',
									db_name: 'athena_system'
								};
								const options = {};
								otcc.writeDoc(opts, doc, options, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(doc));
									myutils.restoreStubs(this.stubs);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error stating the doc id was not passed - stub throws error test_id=eoarny',
							expectBlock: (done) => {
								this.stubs.writeDoc.callsArgWith(2, 400, { error: 'doc id not passed' });
								const doc = JSON.parse(JSON.stringify(config_doc));
								const opts = {
									url: 'http://127.0.0.1:5984',
									db_name: 'athena_system'
								};
								const options = {};
								otcc.writeDoc(opts, doc, options, (err, resp) => {
									expect(err).to.equal(400);
									expect(resp.error).to.equal('doc id not passed');
									myutils.restoreStubs(this.stubs);
									done();
								});
							}
						}
					]
				}
			]
		},
		{
			suiteDescribe: 'cache_couch.repeatWriteSafe',
			mainDescribe: 'Run cache_couch.repeatWriteSafe',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'Should return no errors and the doc passed in - stub passed in valid parameters test_id=bvrxkj',
							expectBlock: (done) => {
								const doc = JSON.parse(JSON.stringify(config_doc));
								const opts = {
									url: 'http://127.0.0.1:5984',
									db_name: 'athena_system'
								};
								this.stubs.repeatWriteSafe.callsArgWith(2, null, doc);
								otcc.repeatWriteSafe(opts, () => {
								}, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(doc));
									done();
								});
							}
						},
						{
							itStatement: 'Should return no error - stub passed in an error test_id=rymjjf',
							expectBlock: (done) => {
								const errorResponse = { error: 'resp is null' };
								const opts = {
									url: 'http://127.0.0.1:5984',
									db_name: 'athena_system'
								};
								this.stubs.repeatWriteSafe.callsArgWith(2, 400, errorResponse);
								otcc.repeatWriteSafe(opts, () => {
								}, (err, resp) => {
									expect(err).to.equal(400);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(errorResponse));
									myutils.restoreStubs(this.stubs);
									done();
								});
							}
						}
					]
				}
			]
		},
		// cache_couch.repeatDelete
		{
			suiteDescribe: 'cache_couch.repeatDelete',
			mainDescribe: 'Run cache_couch.repeatDelete ',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid delete response - valid response passed by stub test_id=szmayp',
							expectBlock: (done) => {
								this.stubs.repeatDelete.callsArgWith(2, null, couch_docs.valid_create_or_delete_response);
								const opts = {
									url: 'http://127.0.0.1:5984',
									db_name: 'athena_system'
								};
								otcc.repeatDelete(opts, 1, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(couch_docs.valid_create_or_delete_response));
									myutils.restoreStubs(this.stubs);
									done();
								});
							}
						},
						{
							itStatement: 'should return error code - error code passed by stub test_id=ztnacf',
							expectBlock: (done) => {
								this.stubs.repeatDelete.callsArgWith(2, 400);
								const opts = {
									url: 'http://127.0.0.1:5984',
									db_name: 'athena_system'
								};
								otcc.repeatDelete(opts, 1, (err, resp) => {
									expect(err).to.equal(400);
									expect(resp).to.equal(undefined);
									myutils.restoreStubs(this.stubs);
									done();
								});
							}
						}
					]
				}
			]
		},
		// couch_cache.getDoc
		{
			suiteDescribe: 'couch_cache.getDoc',
			mainDescribe: 'Run couch_cache.getDoc',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return doc that was passed to the "nodeCache.get" function test_id=klmyae',
							expectBlock: (done) => {
								this.stubs.get.returns(otcc_objects.get_response_body);
								ev.MEMORY_CACHE_ENABLED = true;
								const opts = {
									_id: 'test_id',
									url: 'http://127.0.0.1:5984',
									db_name: 'athena_system',
									query: 'some_query',
									view: config_doc
								};
								otcc.getDoc(opts, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(otcc_objects.get_response_body));
									myutils.restoreStubs(this.stubs);
									done();
								});
							}
						},
						{
							itStatement: 'should return doc that was passed to the "nodeCache.get" function from cache test_id=lgirwh',
							expectBlock: (done) => {
								this.stubs.getDoc.callsArgWith(1, null, otcc_objects.get_response_body);
								this.stubs.set.returns('success');
								this.stubs.get.returns(otcc_objects.get_response_body);
								ev.MEMORY_CACHE_ENABLED = true;
								const opts = {
									_id: 'test_id',
									url: 'http://127.0.0.1:5984',
									db_name: 'athena_system',
									query: 'some_query',
									SKIP_CACHE: true
								};
								otcc.getDoc(opts, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(otcc_objects.get_response_body));
									myutils.restoreStubs(this.stubs);
									done();
								});
							}
						},
						{
							itStatement: 'should return doc that was passed to the "nodeCache.get" function test_id=rzzkca',
							expectBlock: (done) => {
								this.stubs.getDoc.callsArgWith(1, null, otcc_objects.get_response_body);
								this.stubs.set.returns('success');
								this.stubs.get.returns(otcc_objects.get_response_body);
								ev.MEMORY_CACHE_ENABLED = true;
								const opts = {
									_id: 'test_id',
									url: 'http://127.0.0.1:5984',
									db_name: 'athena_system',
									query: 'some_query',
									SKIP_CACHE: true
								};
								otcc.getDoc(opts, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(otcc_objects.get_response_body));
									myutils.restoreStubs(this.stubs);
									done();
								});
							}
						},
						{
							itStatement: 'should return status of 404 and an error that the key could not be built - no opts object passed test_id=huwrvt',
							expectBlock: (done) => {
								this.stubs.getDoc.callsArgWith(1, null, otcc_objects.get_response_body);
								this.stubs.set.returns('success');
								this.stubs.get.returns(otcc_objects.get_response_body);
								ev.MEMORY_CACHE_ENABLED = true;
								otcc.getDoc({}, (err, resp) => {
									expect(err).to.equal(404);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify({ error: 'unable to build key' }));
									myutils.restoreStubs(this.stubs);
									done();
								});
							}
						},
						{
							itStatement: 'should the doc that was passed in - stub passes null response to nodeCache.get test_id=vudwdg',
							expectBlock: (done) => {
								this.stubs.getDoc.callsArgWith(1, null, otcc_objects.get_response_body);
								this.stubs.get.returns(null);
								ev.MEMORY_CACHE_ENABLED = true;
								const opts = {
									_id: 'test_id',
									url: 'http://127.0.0.1:5984',
									db_name: 'athena_system',
									query: 'some_query',
									doc: {}
								};
								otcc.getDoc(opts, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(otcc_objects.get_response_body));
									myutils.restoreStubs(this.stubs);
									done();
								});
							}
						},
						{
							itStatement: 'should return the doc that was passed in - MEMORY_CACHE_ENABLED = false test_id=uqgyis',
							expectBlock: (done) => {
								ev.MEMORY_CACHE_ENABLED = false;
								otcc.getDoc(opts, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(otcc_objects.get_response_body));
									ev.MEMORY_CACHE_ENABLED = true;
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - error passed to the getDoc stub test_id=atlcne',
							callFunction: () => {
								this.stubs.getDoc.callsArgWith(1, { statusCode: 500, msg: 'problem reading from couchdb' });
							},
							expectBlock: (done) => {
								this.stubs.get.returns(otcc_objects.get_response_body);
								ev.MEMORY_CACHE_ENABLED = false;
								otcc.getDoc({}, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('problem reading from couchdb');
									expect(resp).to.equal(undefined);
									myutils.restoreStubs(this.stubs);
									done();
								});
							}
						},
					]
				}
			]
		},
		// couch_cache.getDesignDocView
		{
			suiteDescribe: 'couch_cache.getDesignDocView',
			mainDescribe: 'Run couch_cache.getDesignDocView',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return doc that was passed to the "nodeCache.get" function test_id=oalgvi',
							expectBlock: (done) => {
								this.stubs.getDesignDocView.callsArgWith(1, null, otcc_objects.get_response_body);
								ev.MEMORY_CACHE_ENABLED = true;
								const opts = {
									_id: 'test_id',
									url: 'http://127.0.0.1:5984',
									db_name: 'athena_system',
									query: 'some_query',
									view: config_doc,
									SKIP_CACHE: true
								};
								otcc.getDesignDocView(opts, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(otcc_objects.get_response_body));
									myutils.restoreStubs(this.stubs);
									done();
								});
							}
						}
					]
				}
			]
		},
		// couch_cache.evict
		{
			suiteDescribe: 'couch_cache.evict',
			mainDescribe: 'Run couch_cache.evict',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return null for err and resp - MEMORY_CACHE_ENABLED = false test_id=jbmhca',
							expectBlock: (done) => {
								ev.MEMORY_CACHE_ENABLED = false;
								const opts = {
									_id: 'test_id',
									url: 'http://127.0.0.1:5984',
									db_name: 'athena_system',
									query: 'some_query',
									view: config_doc,
									SKIP_CACHE: true
								};
								otcc.evict(opts, (err, resp) => {
									expect(err).to.equal(null);
									expect(resp).to.equal(null);
									ev.MEMORY_CACHE_ENABLED = true;
									done();
								});
							}
						},
						{
							itStatement: 'should return nothing - stub passed null test_id=mhhqyi',
							expectBlock: (done) => {
								this.stubs.del.returns(null);
								ev.MEMORY_CACHE_ENABLED = true;
								const opts = {
									_id: 'test_id',
									url: 'http://127.0.0.1:5984',
									db_name: 'athena_system',
									query: 'some_query',
									view: config_doc,
									SKIP_CACHE: true
								};
								otcc.evict(opts, (err) => {
									expect(err).to.equal(null);
									done();
								});
							}
						}
					]
				}
			]
		},
		// couch_cache.evict_manual
		{
			suiteDescribe: 'couch_cache.evict_manual',
			mainDescribe: 'Run couch_cache.evict_manual',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return null for err and resp - MEMORY_CACHE_ENABLED = false test_id=qnhfsv',
							expectBlock: (done) => {
								ev.MEMORY_CACHE_ENABLED = false;
								const opts = {
									_id: 'test_id',
									url: 'http://127.0.0.1:5984',
									db_name: 'athena_system',
									query: 'some_query',
									view: config_doc,
									SKIP_CACHE: true
								};
								otcc.evict_manual(opts, (err) => {
									expect(err).to.equal(null);
									ev.MEMORY_CACHE_ENABLED = true;
									done();
								});
							}
						},
						{
							itStatement: 'should return null - MEMORY_CACHE_ENABLED = true test_id=armnbt',
							expectBlock: (done) => {
								this.stubs.del.returns(null);
								ev.MEMORY_CACHE_ENABLED = true;
								const opts = {
									_id: 'test_id',
									url: 'http://127.0.0.1:5984',
									db_name: 'athena_system',
									query: 'some_query',
									view: config_doc,
									SKIP_CACHE: true
								};
								otcc.evict_manual(opts, (err) => {
									expect(err).to.equal(null);
									done();
								});
							}
						}
					]
				}
			]
		},
		{
			suiteDescribe: 'cache_couch.write2cache',
			mainDescribe: 'Run cache_couch.write2cache',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a message of value  test_id=vmtdal',
							expectBlock: (done) => {
								this.stubs.set.returns('success');
								const key = 'test-key', value = 'test-value', expires = 20;
								otcc.write2cache(key, value, expires, (err, resp) => {
									expect(err).to.equal(null);
									expect(resp).to.equal('test-value');
									done();
								});
							}
						},
						{
							itStatement: 'should return a status an error and the value passed in - key not passed test_id=eefwyx',
							expectBlock: (done) => {
								const key = null, value = 'test-value', expires = 20;
								otcc.write2cache(key, value, expires, (err, resp) => {
									expect(err).to.equal(500);
									expect(resp).to.equal('test-value');
									done();
								});
							}
						}
					]
				}
			]
		},
		{
			suiteDescribe: 'cache_couch.flushAll',
			mainDescribe: 'Run cache_couch.flushAll',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should do nothing - this test simply proves that the function gets called test_id=tswhkd',
							expectBlock: (done) => {
								ev.MEMORY_CACHE_ENABLED = true;
								otcc.flush_cache();
								expect(this.stubs.flushAll.called).to.be.true;
								this.stubs.flushAll.resetHistory();
								done();
							}
						},
						{
							itStatement: 'should do nothing - this test simply proves that the function does not get called test_id=pexkpp',
							expectBlock: (done) => {
								ev.MEMORY_CACHE_ENABLED = false;
								otcc.flush_cache();
								expect(this.stubs.flushAll.called).to.be.false;
								this.stubs.flushAll.resetHistory();
								done();
							}
						}
					]
				}
			]
		},
		{
			suiteDescribe: 'cache_couch.get_stats',
			mainDescribe: 'Run cache_couch.get_stats',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should do nothing - test proves that the "getStats" function is called when memory cache is enabled test_id=wdadav',
							expectBlock: (done) => {
								ev.MEMORY_CACHE_ENABLED = true;
								this.stubs.getStats.returns('was called');
								otcc.get_stats();
								done();
							}
						},
						{
							itStatement: 'should do nothing - test proves that the "getStats" is not called when memory cache is disabled test_id=fjlptf',
							expectBlock: (done) => {
								ev.MEMORY_CACHE_ENABLED = false;
								this.stubs.getStats.returns('was called');
								otcc.get_stats();
								ev.MEMORY_CACHE_ENABLED = true;
								done();
							}
						}
					]
				}
			]
		},
		{
			suiteDescribe: 'cache_couch.get_keys',
			mainDescribe: 'cache_couch.get_keys',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return null for both error and response - memory cache disabled test_id=ouajwz',
							expectBlock: (done) => {
								ev.MEMORY_CACHE_ENABLED = false;
								otcc.get_keys((err, resp) => {
									expect(err).to.equal(null);
									expect(resp).to.equal(null);
									ev.MEMORY_CACHE_ENABLED = true;
									done();
								});
							}
						},
						{
							itStatement: 'should call the nodeCache.keys function - no callback passed to "get_keys" test_id=cjjrgz',
							expectBlock: (done) => {
								ev.MEMORY_CACHE_ENABLED = true;
								otcc.get_keys();
								expect(this.stubs.keys.called).to.be.true;
								done();
							}
						},
						{
							itStatement: 'should return an array of keys - stub called with array of keys test_id=ritjbu',
							expectBlock: (done) => {
								ev.MEMORY_CACHE_ENABLED = true;
								this.stubs.keys.returns(['key1', 'key2']);
								otcc.get_keys((err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(['key1', 'key2']));
									done();
								});
							}
						}
					]
				}
			]
		},
		{
			suiteDescribe: 'cache_couch.getDatabase',
			mainDescribe: 'cache_couch.getDatabase',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid response from couch.getDatabase test_id=wgfpic',
							callFunction: () => {
								this.stubs.getDatabase.callsArgWith(1, null, { prop: 'some property' });
							},
							expectBlock: (done) => {
								otcc.getDatabase({}, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify({ prop: 'some property' }));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error from couch.getDatabase test_id=zwlhqg',
							callFunction: () => {
								const err = {
									statusCode: 500,
									msg: 'problem getting database'
								};
								this.stubs.getDatabase.callsArgWith(1, err);
							},
							expectBlock: (done) => {
								otcc.getDatabase({}, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('problem getting database');
									expect(resp).to.equal(undefined);
									ev.MEMORY_CACHE_ENABLED = true;
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
