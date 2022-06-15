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
// settings.test.js - Test settings.js functions
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const tools = common.tools;
const myutils = require('../../testing-lib/test-middleware');
const settings_doc = require('../../../json_docs/default_settings_doc.json');
settings_doc.crn_string = 'crn:v1:staging:public:blockchain:us-south:a/df663f1351e50279adcc6be42918ae07:789418fa-7ce2-4b28-869c-dcf76d1b73db::';
let settings;
const settings_objects = require('../../docs/settings_objects.json');
const filename = common.tools.path.basename(__filename);
const path_to_current_file = common.tools.path.join(__dirname + '/' + filename);

const createStubs = () => {
	return {
		getDoc: sinon.stub(tools.couch_lib, 'getDoc'),
		getDesignDocView: sinon.stub(tools.couch_lib, 'getDesignDocView'),
	};
};

describe('Settings from libs', () => {
	beforeEach(() => {
		tools.stubs = createStubs();
		settings = require('../../../libs/settings.js')(common.logger, common.tools, true, true);
		settings.getIAMEndpoints = (cb) => {
			const defaults = {												// production defaults
				'issuer': 'https://iam.cloud.ibm.com/identity',
				'authorization_endpoint': 'https://identity-2.us-south.iam.cloud.ibm.com/identity/authorize',
				'token_endpoint': 'https://identity-2.us-south.iam.cloud.ibm.com/identity/token',
				'passcode_endpoint': 'https://identity-2.us-south.iam.cloud.ibm.com/identity/passcode',
				'userinfo_endpoint': 'https://identity-2.us-south.iam.cloud.ibm.com/identity/userinfo'
			};
			return cb(null, defaults);
		};
	});
	afterEach(() => {
		myutils.restoreStubs(tools.stubs);
	});
	const testCollection = [
		// // update
		// {
		// 	suiteDescribe: 'update ',
		// 	mainDescribe: 'update ',
		// 	testData: [
		// 		{
		// 			arrayOfInfoToTest: [
		// 				{
		// 					itStatement: 'should call update_settings function test_id=rfdwvd',
		// 					expectBlock: (done) => {
		// 						const clock = sinon.useFakeTimers();
		// 						const spy = sinon.spy(settings, 'update_debounce');
		// 						settings.update({ exitIfError: true }, (err, resp) => {
		// 							clock.tick(15000);
		// 							expect(spy).to.not.have.been.called;
		// 						});
		// 						const settings_doc = JSON.parse(JSON.stringify(settings_objects.settings_doc));
		// 						settings.parse_crn_data(settings_doc);
		// 						const correct =
		// 'crn:v1:staging:public:blockchain:us-south:a/df663f1351e50279adcc6be42918ae07:388410b9-fb38-41d8-8352-ebe6b32eac78::';
		// 						expect(settings_doc.crn_string).to.equal(correct);
		// 						done();
		// 					}
		// 				}
		// 			]
		// 		}
		// 	]
		// },
		// update_settings
		{
			suiteDescribe: 'update_settings ',
			mainDescribe: 'update_settings ',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return ok - basic test to get settings test_id=cdwrnc',
							callFunction: () => {
								tools.stubs.getDoc.callsArgWith(1, null, settings_doc);
								tools.stubs.getDesignDocView.callsArgWith(1, null, null);
							},
							expectBlock: (done) => {
								settings.update_settings({}, (err, resp) => {
									expect(err).to.equal(null);
									expect(resp.message).to.equal('ok');
									done();
								});
							}
						},
						{
							itStatement: 'should call process.exit - no DESIGN_DOC test_id=lrtvse',
							callFunction: () => {
								delete process.env.DESIGN_DOC;
								tools.stubs.getDoc.callsArgWith(1, null, settings_doc);
								tools.stubs.getDesignDocView.callsArgWith(1, null, null);
								tools.stubs.exit = sinon.stub(process, 'exit');
							},
							expectBlock: (done) => {
								settings.update_settings({}, (err, resp) => {
									expect(err).to.equal(null);
									expect(resp.message).to.equal('ok');
									sinon.assert.called(process.exit);
									process.env.DESIGN_DOC = 'athena-v1';
									tools.stubs.exit.restore();
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - error passed to getDoc stub test_id=vtmrpt',
							callFunction: () => {
								tools.stubs.getDoc.callsArgWith(1, { statusCode: 500, 'msg': 'problem getting settings doc' });
								tools.stubs.getDesignDocView.callsArgWith(1, null, null);
							},
							expectBlock: (done) => {
								settings.update_settings({}, (err, resp) => {
									expect(err.err.statusCode).to.equal(500);
									expect(err.err.msg).to.equal('problem getting settings doc');
									expect(resp).to.equal(undefined);
									done();
								});
							}
						},
						// {
						// 	itStatement: 'should call process.exit - error with "exitIfError" set to true',
						// 	callFunction: () => {
						// 		tools.stubs.getDoc.callsArgWith(1, { statusCode: 500, 'msg': 'problem getting settings doc' });
						// 		tools.stubs.exit = sinon.stub(process, 'exit');
						// 	},
						// 	expectBlock: (done) => {
						// 		settings.update_settings({ exitIfError: true }, (err, resp) => {
						// 			expect(err.err.statusCode).to.equal(500);
						// 			expect(err.err.msg).to.equal('problem getting settings doc');
						// 			sinon.assert.called(process.exit);
						// 			expect(resp).to.equal(undefined);
						// 			tools.stubs.exit.restore();
						// 			done();
						// 		});
						// 	}
						// },
						{
							itStatement: 'should return ok - basic test to get settings - AUTH_SCHEME is iam test_id=jntfcg',
							callFunction: () => {
								tools.stubs.retry_req = sinon.stub(tools.misc, 'retry_req').callsArgWith(1, null, { body: { prop1: 'value1' } });
								process.env.AUTH_SCHEME = 'iam';
								tools.stubs.getDoc.callsArgWith(1, null, settings_doc);
								tools.stubs.getDesignDocView.callsArgWith(1, null, null);
							},
							expectBlock: (done) => {
								settings.update_settings({}, (err, resp) => {
									expect(err).to.equal(null);
									expect(resp.message).to.equal('ok');
									process.env.AUTH_SCHEME = 'initial';
									tools.stubs.retry_req.restore();
									done();
								});
							}
						}
					]
				}
			]
		},
		// parse_crn_data
		{
			suiteDescribe: 'parse_crn_data ',
			mainDescribe: 'parse_crn_data ',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'given crn object return a valid crn string  test_id=ffftkz',
							expectBlock: (done) => {
								const settings_doc = JSON.parse(JSON.stringify(settings_objects.settings_doc));
								settings.parse_crn_data(settings_doc);
								const correct =
									'crn:v1:staging:public:blockchain:us-south:a/df663f1351e50279adcc6be42918ae07:388410b9-fb38-41d8-8352-ebe6b32eac78::';
								expect(settings_doc.crn_string).to.equal(correct);
								done();
							}
						},
						{
							itStatement: 'given crn string should return a valid crn obj  test_id=1ff51e',
							expectBlock: (done) => {
								const settings_doc = {
									crn_string:
										'crn:v1:staging:public:blockchain:us-south:a/df663f1351e50279adcc6be42918ae07:388410b9-fb38-41d8-8352-ebe6b32eac78::'
								};
								settings.parse_crn_data(settings_doc);
								const correct = JSON.parse(JSON.stringify(settings_objects.settings_doc.crn));
								expect(JSON.stringify(common.tools.misc.sortItOut(settings_doc.crn))).to.equal(
									JSON.stringify(common.tools.misc.sortItOut(correct))
								);
								done();
							}
						},
						{
							itStatement: 'given env vars, settings should return them test_id=dserew',
							expectBlock: (done) => {
								process.env['DB_CONNECTION_STRING'] = 'testing';
								process.env['DB_SYSTEM'] = 'testing2';
								let settings2 = require('../../../libs/settings.js')(common.logger, common.tools, true, true);
								expect(settings2.DB_CONNECTION_STRING).to.equal('testing');
								expect(settings2.DB_SYSTEM).to.equal('testing2');
								done();
							}
						}
					]
				}
			]
		},
		// compact_all_dbs
		{
			suiteDescribe: 'compact_all_dbs ',
			mainDescribe: 'compact_all_dbs ',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should call the functions that would normally compact the dbs in couchdb test_id=hoyuvm',
							expectBlock: (done) => {
								tools.stubs.start_compaction = sinon.spy(tools.couch_lib, 'startCompaction');
								const auth_scheme = settings.AUTH_SCHEME;
								settings.AUTH_SCHEME = 'couchdb';
								tools.stubs.eachLimit = sinon.stub(tools.async, 'eachLimit').callsArgWith(2, 'db1', () => {});
								settings.compact_all_dbs();
								sinon.assert.called(tools.stubs.start_compaction);
								tools.stubs.start_compaction.restore();
								tools.stubs.eachLimit.restore();
								settings.AUTH_SCHEME = auth_scheme;
								done();
							}
						}
					]
				}
			]
		},
		// update
		{
			suiteDescribe: 'update',
			mainDescribe: 'update ',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should fake updating the settings test_id=ciixkd',
							expectBlock: (done) => {
								tools.stubs.update_settings = sinon.stub(settings, 'update_settings').callsArgWith(1, null, { msg: 'ok' });
								settings.update({}, (err, resp) => {
									expect(err).to.equal(null);
									expect(resp).to.deep.equal({ msg: 'ok' });
									tools.stubs.update_settings.restore();
									done();
								});
							}
						}
					]
				}
			]
		},
		// validation docs
		{
			suiteDescribe: 'validation docs',
			mainDescribe: 'validation docs ',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return ok - basic test to get settings test_id=cdwrnc',
							callFunction: () => {
								const extra_settings = {
									rows: [{ id: '01_validation_ibp_openapi_', doc: { info: { version: '2.0.0' } } }]
								};
								tools.stubs.getDoc.callsArgWith(1, null, settings_doc);
								tools.stubs.getDesignDocView.callsArgWith(1, null, extra_settings);
							},
							expectBlock: (done) => {
								settings.update_settings({}, (err, resp) => {
									expect(err).to.equal(null);
									expect(resp.message).to.equal('ok');
									expect(settings.OPEN_API_DOCS.v2.info.version).to.equal('2.0.0');
									done();
								});
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
