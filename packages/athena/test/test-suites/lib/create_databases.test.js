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
//------------------------------------------------------------------------------------
// create_databases.js - script used to created all necessary database to run the app
//------------------------------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const chaiHttp = require('chai-http');
const sinon = require('sinon');

const opts = {
	url: 'http://127.0.0.1:5984'
};

const tools = common.tools;
let couch_lib = require('../../../libs/couchdb.js')(common.logger, tools, opts.url);
tools.misc = require('../../../libs/misc.js')(common.logger);
const myutils = require('../../testing-lib/test-middleware');
const config_doc = require('../../docs/config_doc.json');
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);

let db;

chai.use(chaiHttp);

const createStubs = () => {
	return {
		getDatabase: sinon.stub(couch_lib, 'getDatabase'),
		createDatabase: sinon.stub(couch_lib, 'createDatabase'),
		getDoc: sinon.stub(couch_lib, 'getDoc'),
		repeatWriteSafe: sinon.stub(couch_lib, 'repeatWriteSafe')
	};
};

describe('Create Databases', () => {
	beforeEach((done) => {
		tools.stubs = createStubs();
		tools.couch_lib = couch_lib;
		db = require('../../../scripts/create_databases.js')(common.logger, tools, opts.url);
		done();
	});
	afterEach((done) => {
		myutils.restoreStubs(tools.stubs);
		done();
	});
	const testCollection = [
		{
			suiteDescribe: 'create_database',
			mainDescribe: 'Run create_database',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return no errors - create databases and design documents test_id=wnxhbn',
							expectBlock: (done) => {
								tools.stubs.getDatabase.callsArgWith(1, null);
								tools.stubs.getDoc.callsArgWith(1, null, config_doc);
								tools.stubs.repeatWriteSafe.callsArgWith(2, null, config_doc);
								db.createDatabasesAndDesignDocs((errs) => {
									expect(JSON.stringify(errs)).to.equal(JSON.stringify([]));
									done();
								});
							}
						},
						{
							itStatement: 'should return  test_id=eyfnrwno errors - threw error that simply meant the database(s) already exist',
							expectBlock: (done) => {
								const err = {};
								err.statusCode = 412;
								tools.stubs.getDatabase.callsArgWith(1, new Error());
								tools.stubs.createDatabase.callsArgWith(1, err);
								tools.stubs.getDoc.callsArgWith(1, null, config_doc);
								tools.stubs.repeatWriteSafe.callsArgWith(2, null, config_doc);
								db.createDatabasesAndDesignDocs((errs) => {
									expect(JSON.stringify(errs)).to.equal(JSON.stringify([]));
									done();
								});
							}
						},
						{
							itStatement: 'should return 500 errors for all databases to be created - 500 passed through createDatabase stub test_id=ttaskb',
							expectBlock: (done) => {
								const err = {};
								err.statusCode = 500;
								tools.stubs.getDatabase.callsArgWith(1, new Error());
								tools.stubs.createDatabase.callsArgWith(1, err);
								tools.stubs.getDoc.callsArgWith(1, null, config_doc);
								tools.stubs.repeatWriteSafe.callsArgWith(2, null, config_doc);
								db.createDatabasesAndDesignDocs((errs) => {
									for (const i in errs) {
										expect(errs[i].statusCode).to.equal(500);
									}
									done();
								});
							}
						},
						{
							itStatement: 'should return no errors - error passed only to indicated that docs needed to be created test_id=ybzswa',
							expectBlock: (done) => {
								const err = {};
								err.statusCode = 404;
								tools.stubs.getDatabase.callsArgWith(1, null);
								tools.stubs.getDoc.callsArgWith(1, err);
								tools.stubs.repeatWriteSafe.callsArgWith(2, null, config_doc);
								db.createDatabasesAndDesignDocs((errs) => {
									expect(JSON.stringify(errs)).to.equal(JSON.stringify([]));
									done();
								});
							}
						},
						{
							itStatement: 'should return errors - writeDoc was passed errors through the stub test_id=adtees',
							expectBlock: (done) => {
								const get_err = {};
								get_err.statusCode = 404;
								const write_err = {};
								write_err.statusCode = 500;
								tools.stubs.getDatabase.callsArgWith(1, null);
								tools.stubs.getDoc.callsArgWith(1, get_err);
								tools.stubs.repeatWriteSafe.callsArgWith(2, write_err);
								db.createDatabasesAndDesignDocs((errs) => {
									for (const i in errs) {
										expect(errs[i].statusCode).to.equal(500);
									}
									done();
								});
							}
						},
						{
							itStatement: 'should return errors - non-404 errors passed to getDoc function test_id=ktuxaq',
							expectBlock: (done) => {
								const err = {};
								err.statusCode = 500;
								tools.stubs.getDatabase.callsArgWith(1, null);
								tools.stubs.getDoc.callsArgWith(1, err);
								db.createDatabasesAndDesignDocs((errs) => {
									for (const i in errs) {
										expect(errs[i].statusCode).to.equal(500);
									}
									done();
								});
							}
						},
						{
							itStatement: 'should return errors - getDoc allowed to pass but writeDoc was passed errors through the stub test_id=azlghv',
							expectBlock: (done) => {
								const write_err = {};
								write_err.statusCode = 500;
								tools.stubs.getDatabase.callsArgWith(1, null);
								tools.stubs.getDoc.callsArgWith(1, null, config_doc);
								tools.stubs.repeatWriteSafe.callsArgWith(2, write_err);
								db.createDatabasesAndDesignDocs((errs) => {
									for (const i in errs) {
										expect(errs[i].statusCode).to.equal(500);
									}
									done();
								});
							}
						},
					]
				}
			]
		},
		{
			suiteDescribe: 'checkDocs',
			mainDescribe: 'Run checkDocs',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return null for the errs and the response - exception thrown from fake json file test_id=ehvvnu',
							expectBlock: (done) => {
								db.checkDocs([], '', ['does_not_exist.json'], (errs, res) => {
									expect(errs).to.equal(null);
									expect(res).to.equal(null);
									done();
								});
							}
						},
						{
							itStatement: 'should return null for the errs and the response - exception thrown from fake yaml file test_id=ofbuut',
							expectBlock: (done) => {
								db.checkDocs([], '', ['does_not_exist'], (errs, res) => {
									expect(errs).to.equal(null);
									expect(res).to.equal(null);
									done();
								});
							}
						},
						{
							itStatement: 'should return  test_id=sdesdh',
							callFunction: () => {
								const doc = require('../../docs/create_database_check_docs.json');
								tools.stubs.getDoc.callsArgWith(1, null, doc);
							},
							expectBlock: (done) => {
								const doc_name = 'doc.json';
								const obj = {};
								obj[doc_name] = { _id: 'an id' };
								db.checkDocs([], '', ['../test/docs/create_database_check_docs.json'], (errs, res) => {
									expect(errs).to.equal(null);
									expect(res).to.equal(null);
									done();
								});
							}
						}
					]
				}
			]
		},
		{
			suiteDescribe: 'createDatabasesAndDesignDocs',
			mainDescribe: 'Run createDatabasesAndDesignDocs',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return no errors - testing if we can reassign custom names test_id=yivfzu',
							callFunction: () => {
								tools.stubs.retry_req = sinon.stub(tools.misc, 'retry_req').callsArgWith(1, null);
								tools.stubs.getDatabase.callsArgWith(1, null);
								tools.stubs.getDoc.callsArgWith(1, { statusCode: 404 });
								tools.stubs.repeatWriteSafe.callsArgWith(2, null);
							},
							expectBlock: (done) => {
								tools.config_file.db_custom_names = { DB_SYSTEM: 'db_system', DB_COMPONENTS: 'DB_COMPONENTS' };
								db.createDatabasesAndDesignDocs((res) => {
									expect(JSON.stringify(tools.misc.sortItOut(res))).to.equal(tools.misc.sortItOut(JSON.stringify([])));
									tools.stubs.retry_req.restore();
									done();
								});
							}
						}
					]
				}
			]
		},
		{
			suiteDescribe: 'detect_obj_changes',
			mainDescribe: 'Run detect_obj_changes',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'copy config over to settings doc - empty test_id=xbuzac',
							expectBlock: (done) => {
								const fake_config = {
									testing: 'nested 0 field',
									testing2: {
										nested1: 'nested 1 field'
									},
									testing3: {
										nested1: {
											nested2: 'nested 2 field'
										}
									},
								};
								const fake_settings_doc = {
									//empty
								};
								db.detect_obj_changes(fake_config, null, fake_settings_doc);
								expect(JSON.stringify(tools.misc.sortKeys(fake_settings_doc))).to.equal(JSON.stringify(tools.misc.sortKeys(fake_config)));
								done();
							}
						},
						{
							itStatement: 'copy config over to settings doc - override string test_id=srzstt',
							expectBlock: (done) => {
								const fake_config = {
									testing: 'i should override',
									testing2: {
										nested1: 'nested 1 field'
									},
									testing3: {
										nested1: {
											nested2: 'nested 2 field'
										}
									},
								};
								const fake_settings_doc = {
									testing: 'nested 0 field',
									testing2: {
										nested1: 'nested 1 field'
									},
									testing3: {
										nested1: {
											nested2: 'nested 2 field'
										}
									},
								};
								db.detect_obj_changes(fake_config, null, fake_settings_doc);
								expect(JSON.stringify(tools.misc.sortKeys(fake_settings_doc))).to.equal(JSON.stringify(tools.misc.sortKeys(fake_config)));
								done();
							}
						},
						{
							itStatement: 'copy config over to settings doc - override nested test_id=rayxtl',
							expectBlock: (done) => {
								const fake_config = {
									testing: 'i should override',
									testing2: {
										nested1: 'i should override'
									},
									testing3: {
										nested1: {
											nested2: 'i should override'
										}
									},
								};
								const fake_settings_doc = {
									testing: 'nested 0 field',
									testing2: {
										nested1: 'nested 1 field'
									},
									testing3: {
										nested1: {
											nested2: 'nested 2 field'
										}
									},
								};
								db.detect_obj_changes(fake_config, null, fake_settings_doc);
								expect(JSON.stringify(tools.misc.sortKeys(fake_settings_doc))).to.equal(JSON.stringify(tools.misc.sortKeys(fake_config)));
								done();
							}
						},

						{
							itStatement: 'copy config over to settings doc - override - missing field test_id=rqdcaj',
							expectBlock: (done) => {
								const fake_config = {
									testing2: {
										nested1: 'i should override'
									},
								};
								const fake_settings_doc = {
									testing: 'nested 0 field',
									testing2: {
										nested1: 'nested 1 field',
										nested2: 'i\'m also nested'
									},
								};
								const correct = {
									testing: 'nested 0 field',
									testing2: {
										nested1: 'i should override',
										nested2: 'i\'m also nested'
									},
								};
								db.detect_obj_changes(fake_config, null, fake_settings_doc);
								expect(JSON.stringify(tools.misc.sortKeys(fake_settings_doc))).to.equal(JSON.stringify(tools.misc.sortKeys(correct)));
								done();
							}
						},
						{
							itStatement: 'copy config over to settings doc - override - extra field test_id=rwvuxy',
							expectBlock: (done) => {
								const fake_config = {
									testing2: {
										nested3: 'i should override'
									},
								};
								const fake_settings_doc = {
									testing: 'nested 0 field',
									testing2: {
										nested1: 'nested 1 field',
										nested2: 'i\'m also nested'
									},
								};
								const correct = {
									testing: 'nested 0 field',
									testing2: {
										nested1: 'nested 1 field',
										nested2: 'i\'m also nested',
										nested3: 'i should override'
									},
								};
								db.detect_obj_changes(fake_config, null, fake_settings_doc);
								expect(JSON.stringify(tools.misc.sortKeys(fake_settings_doc))).to.equal(JSON.stringify(tools.misc.sortKeys(correct)));
								done();
							}
						},
						{
							itStatement: 'copy config over to settings doc - override nested null field test_id=djgval',
							expectBlock: (done) => {
								const fake_config = {
									testing2: {
										nested2: null
									},
								};
								const fake_settings_doc = {
									testing: 'nested 0 field',
									testing2: {
										nested1: 'nested 1 field',
										nested2: 'i\'m also nested'
									},
								};
								const correct = {
									testing: 'nested 0 field',
									testing2: {
										nested1: 'nested 1 field',
										nested2: null					// the null field copies over
									},
								};
								db.detect_obj_changes(fake_config, null, fake_settings_doc);
								expect(JSON.stringify(tools.misc.sortKeys(fake_settings_doc))).to.equal(JSON.stringify(tools.misc.sortKeys(correct)));
								done();
							}
						},
						{
							itStatement: 'copy config over to settings doc - override nested false field test_id=qyyewy',
							expectBlock: (done) => {
								const fake_config = {
									testing2: {
										nested2: false
									},
								};
								const fake_settings_doc = {
									testing: 'nested 0 field',
									testing2: {
										nested1: 'nested 1 field',
										nested2: 'i\'m also nested'
									},
								};
								const correct = {
									testing: 'nested 0 field',
									testing2: {
										nested1: 'nested 1 field',
										nested2: false
									},
								};
								db.detect_obj_changes(fake_config, null, fake_settings_doc);
								expect(JSON.stringify(tools.misc.sortKeys(fake_settings_doc))).to.equal(JSON.stringify(tools.misc.sortKeys(correct)));
								done();
							}
						},


						{
							itStatement: 'copy config over to settings doc - override primitive null field test_id=iviebc',
							expectBlock: (done) => {
								const fake_config = {
									testing2: null,
								};
								const fake_settings_doc = {
									testing: 'nested 0 field',
									testing2: 'i\'m also nested',
								};
								const correct = {
									testing: 'nested 0 field',
									testing2: null,					// the null field copies over
								};
								db.detect_obj_changes(fake_config, null, fake_settings_doc);
								expect(JSON.stringify(tools.misc.sortKeys(fake_settings_doc))).to.equal(JSON.stringify(tools.misc.sortKeys(correct)));
								done();
							}
						},
						{
							itStatement: 'copy config over to settings doc - override primitive false field test_id=akseuj',
							expectBlock: (done) => {
								const fake_config = {
									testing2: false,
								};
								const fake_settings_doc = {
									testing: 'nested 0 field',
									testing2: 'i\'m also nested',
								};
								const correct = {
									testing: 'nested 0 field',
									testing2: false,
								};
								db.detect_obj_changes(fake_config, null, fake_settings_doc);
								expect(JSON.stringify(tools.misc.sortKeys(fake_settings_doc))).to.equal(JSON.stringify(tools.misc.sortKeys(correct)));
								done();
							}
						},
						{
							itStatement: 'copy config over to settings doc - override default test_id=ksztbt',
							expectBlock: (done) => {
								const fake_config = {
									testing2: 'override',
								};
								const fake_settings_doc = {
									testing1: 'abc',
									testing2: 'def',
								};
								const fake_default = {
									testing1: 'one',
									testing2: 'two',
									testing3: 'three',
									nested: {
										options: true
									}
								};
								const correct = {
									testing1: 'abc',
									testing2: 'override',
									testing3: 'three',
									nested: {
										options: true
									}
								};
								db.detect_obj_changes(fake_config, fake_default, fake_settings_doc);
								expect(JSON.stringify(tools.misc.sortKeys(fake_settings_doc))).to.equal(JSON.stringify(tools.misc.sortKeys(correct)));
								done();
							}
						},
					]
				}
			]
		}
	];
	// call main test function to run this test collection
	common.mainTestFunction(testCollection, path_to_current_file);
});
