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
// pillow_talk.test.js - test file for pillow_talk_lib
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const tools = common.tools;
const myutils = require('../../testing-lib/test-middleware');
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);

let pillow;


const createStubs = () => {
	return {
		createNewDoc: sinon.stub(tools.couch_lib, 'createNewDoc'),
		getDesignDocView: sinon.stub(tools.couch_lib, 'getDesignDocView'),
		bulkDatabase: sinon.stub(tools.couch_lib, 'bulkDatabase')
	};
};

describe('Pillow Talk', () => {
	before(() => {
		tools.stubs = createStubs();
		pillow = require('../../../libs/pillow_talk.js')(common.logger, common.ev, tools, { db_name: common.ev.DB_COMPONENTS });
	});
	after(() => {
		myutils.restoreStubs(tools.stubs);
	});
	const testCollection = [
		// listen
		{
			suiteDescribe: 'listen',
			mainDescribe: 'Run listen',
			testData: [
				{
					arrayOfInfoToTest: [
						/*{
							itStatement: 'should return the doc passed into the request stub',
							callFunction: () => {
								tools.stubs.request = sinon.stub(pillow.http_mod, 'request').callsArgWith(1, {
									filters: 'some-filter',
									setEncoding: sinon.stub(),
									on: sinon.stub().callsArgWith(1, JSON.stringify({
										chunk1: 'chunk1',
										seq: 12,
										doc: { prop1: 'doc property' }
									}))
								});
							},
							expectBlock: (done) => {
								pillow.listen((err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify({ prop1: 'doc property' }));
									tools.stubs.request.restore();
									done();
								});
							}
						},
						{
							itStatement: 'should should return the doc passed into the request stub - no protocol provided',
							callFunction: () => {
								pillow.current_db_connection_string = common.ev.DB_CONNECTION_STRING;
								common.ev.DB_CONNECTION_STRING = '://127.0.0.1:5984';
								tools.stubs.request = sinon.stub(pillow.http_mod, 'request').callsArgWith(1, {
									filters: 'some-filter',
									setEncoding: sinon.stub(),
									on: sinon.stub().callsArgWith(1, JSON.stringify({
										chunk1: 'chunk1',
										seq: 12,
										doc: { prop1: 'doc property' }
									}))
								});
							},
							expectBlock: (done) => {
								pillow.listen((err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify({ prop1: 'doc property' }));
									tools.stubs.request.restore();
									common.ev.DB_CONNECTION_STRING = pillow.current_db_connection_string;
									delete pillow.current_db_connection_string;
									done();
								});
							}
						},
						{
							itStatement: 'should should return the doc passed into the request stub - protocol is https, no port, and has auth',
							callFunction: () => {
								pillow.current_db_connection_string = common.ev.DB_CONNECTION_STRING;
								common.ev.DB_CONNECTION_STRING = 'https://username:password@127.0.0.1';
								tools.stubs.request = sinon.stub(pillow.http_mod, 'request').callsArgWith(1, {
									filters: 'some-filter',
									setEncoding: sinon.stub(),
									on: sinon.stub().callsArgWith(1, JSON.stringify({
										chunk1: 'chunk1',
										seq: 12,
										doc: { prop1: 'doc property' }
									}))
								});
							},
							expectBlock: (done) => {
								pillow.listen((err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify({ prop1: 'doc property' }));
									tools.stubs.request.restore();
									common.ev.DB_CONNECTION_STRING = pillow.current_db_connection_string;
									delete pillow.current_db_connection_string;
									done();
								});
							}
						}*/
					]
				}
			]
		},
		// broadcast
		{
			suiteDescribe: 'broadcast',
			mainDescribe: 'Run broadcast',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should call the callback - no opts were sent test_id=vfonfp',
							expectBlock: (done) => {
								pillow.broadcast(null, () => {
									// if we made it this far then the callback was called, obviously.
									done();
								});
							}
						},
						{
							itStatement: 'should call the callback after attaching predictable values to the msg object  test_id=apackj',
							callFunction: () => {
								tools.stubs.createNewDoc.callsArgWith(2, null);
							},
							expectBlock: (done) => {
								const msg = {};
								pillow.broadcast(msg, () => {
									// these properties will be assigned to the msg object and the callback called
									expect(msg.type).to.equal('pillow_talk_doc');
									expect(typeof msg.timestamp === 'number').to.equal(true);
									expect(JSON.stringify(msg.athena)).to.equal(JSON.stringify(process.env.ATHENA_ID));
									done();
								});
							}
						}
					]
				}
			]
		},
		// tidy
		{
			suiteDescribe: 'tidy',
			mainDescribe: 'Run tidy',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should call callback - doc sent to be deleted test_id=kcimnt',
							callFunction: () => {
								tools.stubs.getDesignDocView.callsArgWith(1, null, {
									rows: [
										{
											doc: {}
										}
									]
								});
								tools.stubs.bulkDatabase.callsArgWith(2, null);
							},
							expectBlock: (done) => {
								pillow.tidy(null, () => {
									// if we're here then the callback was called
									done();
								});
							}
						},
						{
							itStatement: 'should call callback - no docs sent to be deleted test_id=buvjvm',
							callFunction: () => {
								tools.stubs.getDesignDocView.callsArgWith(1, null, {
									rows: []
								});
							},
							expectBlock: (done) => {
								pillow.tidy(null, () => {
									// if we're here then the callback was called
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - error passed to getDesignDocView stub test_id=giewzx',
							callFunction: () => {
								tools.stubs.getDesignDocView.callsArgWith(1, {
									statusCode: 500,
									msg: 'something is wrong'
								});
							},
							expectBlock: (done) => {
								pillow.tidy(null, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('something is wrong');
									done();
								});
							}
						},
						{
							itStatement: 'should return callback - error passed to bulkDatabase stub test_id=dthtvo',
							callFunction: () => {
								tools.stubs.bulkDatabase.callsArgWith(2, 'error');
								tools.stubs.getDesignDocView.callsArgWith(1, null, {
									rows: []
								});
							},
							expectBlock: (done) => {
								pillow.tidy(null, () => {
									// if we're here then the callback was called
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
