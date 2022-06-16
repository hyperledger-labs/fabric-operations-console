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
// notifications_lib.test.js - Test notifications_lib functions
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const notification_objects = require('../../docs/notifications_objects.json');
const tools = common.tools;
const myutils = require('../../testing-lib/test-middleware');
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);

let notifications;

const createStubs = () => {
	return {
		getDesignDocView: sinon.stub(tools.otcc, 'getDesignDocView'),
		bulkDatabase: sinon.stub(tools.couch_lib, 'bulkDatabase'),
		createNewDoc: sinon.stub(tools.otcc, 'createNewDoc'),
		broadcast: sinon.stub(tools.wss1_athena, 'broadcast').returns(true)
	};
};

describe('notifications_lib.js', () => {
	beforeEach(() => {
		tools.stubs = createStubs();
		notifications = require('../../../libs/notifications_lib.js')(common.logger, common.ev, tools);
	});
	afterEach(() => {
		myutils.restoreStubs(tools.stubs);
	});
	const testCollection = [
		// purge
		{
			suiteDescribe: 'purge',
			mainDescribe: 'Run purge',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should pass with no errors - purge: simulated deletion of 2 documents test_id=uxekyu',
							callFunction: () => {
								tools.stubs.getDesignDocView.callsArgWith(1, null, notification_objects.populated_rows);
								tools.stubs.bulkDatabase.callsArgWith(2, null);
							},
							expectBlock: (done) => {
								notifications.purge((err, resp) => {
									expect(err).to.equal(null);
									expect(resp).to.equal('deleted 2 notification(s)');
									done();
								});
							}
						},
						{
							itStatement: 'should pass with no errors - purge: simulated deletion of 0 documents test_id=ioxsha',
							callFunction: () => {
								tools.stubs.getDesignDocView.callsArgWith(1, null, notification_objects.non_populated_rows);
							},
							expectBlock: (done) => {
								notifications.purge((err, resp) => {
									expect(err).to.equal(null);
									expect(resp).to.equal('deleted 0 notification(s)');
									done();
								});
							}
						},
						{
							itStatement: 'should show an error - error passed to bulkDatabase  test_id=fwouji',
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'problem purging the database';
								tools.stubs.getDesignDocView.callsArgWith(1, null, notification_objects.populated_rows);
								tools.stubs.bulkDatabase.callsArgWith(2, err);
							},
							expectBlock: (done) => {
								notifications.purge((err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('problem purging the database');
									done();
								});
							}
						},
						{
							itStatement: 'should show an error - error passed to getDesignDocView test_id=ivmjow',
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'problem purging the database';
								tools.stubs.getDesignDocView.callsArgWith(1, err);
							},
							expectBlock: (done) => {
								notifications.purge((err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('problem purging the database');
									expect(resp).to.equal(null);
									done();
								});
							}
						}
					]
				}
			]
		},
		// create
		{
			suiteDescribe: 'create',
			mainDescribe: 'Run create',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return an error - create: empty body sent  test_id=qritfs',
							expectBlock: (done) => {
								notifications.create({}, (err, resp) => {
									expect(err.statusCode).to.equal(400);
									expect(err.error).to.equal('not a valid value for status: "null"');
									expect(resp).to.equal(null);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - create: invalid message type  test_id=wtzzqz',
							expectBlock: (done) => {
								const message = JSON.parse(JSON.stringify(notification_objects.create_body_invalid_message_property));
								notifications.create(message, (err, resp) => {
									expect(err.statusCode).to.equal(400);
									expect(err.error).to.equal('not a valid value for "message". message must be a string.');
									expect(resp).to.equal(null);
									done();
								});
							}
						},
						{
							itStatement: 'should return the doc passed in - everything is valid  test_id=coaybi',
							callFunction: () => {
								tools.stubs.createNewDoc.callsArgWith(2, null, tools.misc.sortItOut(notification_objects.create_body_valid_message));
							},
							expectBlock: (done) => {
								const body = tools.misc.sortItOut(JSON.parse(JSON.stringify(notification_objects.create_body_valid_message)));
								notifications.create(body, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify(tools.misc.sortItOut(notification_objects.create_body_valid_message)));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - error passed to createNewDoc stub  test_id=dtezww',
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'problem creating document';
								tools.stubs.createNewDoc.callsArgWith(2, err);
							},
							expectBlock: (done) => {
								const body = tools.misc.sortItOut(JSON.parse(JSON.stringify(notification_objects.create_body_valid_message)));
								delete body.ts_display;
								delete body.by;
								delete body.tag;
								notifications.create(body, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('problem creating document');
									expect(resp).to.equal(undefined);
									done();
								});
							}
						}
					]
				}
			]
		},
		// get
		{
			suiteDescribe: 'get',
			mainDescribe: 'Run get',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid response - get: all parameters valid  test_id=fixrxz',
							callFunction: () => {
								tools.stubs.getDesignDocView.callsArgWith(1, null, tools.misc.sortItOut(notification_objects.populated_rows));
							},
							expectBlock: (done) => {
								notifications.get(tools.misc.sortItOut(notification_objects.populated_rows), (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(tools.misc.sortItOut(resp))).to.equal(
										JSON.stringify(tools.misc.sortItOut(notification_objects.get_response))
									);
									done();
								});
							}
						},
						{
							itStatement: 'should return a valid response - get: pass null in response of getDesignDocView  test_id=gspiwj',
							callFunction: () => {
								tools.stubs.getDesignDocView.callsArgWith(1, null, null);
							},
							expectBlock: (done) => {
								notifications.get(tools.misc.sortItOut(notification_objects.populated_rows), (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(tools.misc.sortItOut(resp))).to.equal(
										JSON.stringify(tools.misc.sortItOut({ notifications: [], total: 0, returning: 0 }))
									);
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - get: error passed to getDesignDocView  test_id=zkiljw',
							callFunction: () => {
								const err = {};
								err.statusCode = 500;
								err.msg = 'problem with get';
								tools.stubs.getDesignDocView.callsArgWith(1, err);
							},
							expectBlock: (done) => {
								notifications.get(tools.misc.sortItOut(notification_objects.populated_rows), (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('problem with get');
									expect(resp).to.equal(null);
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
