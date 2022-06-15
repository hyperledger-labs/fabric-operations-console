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
// db_backup_apis.test.js - Test db backup apis
//------------------------------------------------------------
const common = require('../common-test-framework');
const chai = require('chai');
const expect = chai.expect;
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const tools = common.tools;
tools.misc = require('../../../libs/misc.js')(common.logger, common.tools);
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);
tools.middleware = common.tools.middleware;
const myutils = require('../../testing-lib/test-middleware');
let db_backup_apis = null;
const db_objects = require('../../docs/db_backup_objects.json');

chai.use(chaiHttp);

const createStubs = () => {
	return {
		repeatWriteSafe: sinon.stub(tools.couch_lib, 'repeatWriteSafe'),
		get_changes: sinon.stub(tools.couch_lib, 'get_changes'),
		bulk_get: sinon.stub(tools.couch_lib, 'bulk_get'),
		getDoc: sinon.stub(tools.couch_lib, 'getDoc'),
		bulkDatabase: sinon.stub(tools.couch_lib, 'bulkDatabase'),
		add_attachment: sinon.stub(tools.couch_lib, 'add_attachment'),
		getDesignDocView: sinon.stub(tools.couch_lib, 'getDesignDocView'),
		retry_req: sinon.stub(tools.misc, 'retry_req'),
		store_webhook_doc: sinon.stub(tools.webhook, 'store_webhook_doc'),
	};
};

describe('Signature Collection APIs', () => {
	before((done) => {
		tools.stubs = createStubs();
		tools.middleware.verify_settings_action_session = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_settings_action_ak = (req, res, next) => {
			return next();
		};
		db_backup_apis = require('../../../routes/db_backups_apis.js')(common.logger, common.ev, tools);
		this.app = common.expressApp(db_backup_apis);
		done();
	});
	after(() => {
		myutils.restoreStubs(tools.stubs);
	});

	// remove timestamp from id and url fields
	function trim_timestamps(obj) {
		if (obj) {
			if (obj.id) {
				obj.id = obj.id.substring(0, 17);
			}
			if (obj.url) {
				obj.url = obj.url.substring(0, 57);
			}
		}
		return obj;
	}

	const testCollection = [

		// POST /api/v2/backups
		{
			suiteDescribe: 'POST /api/v2/backups',
			mainDescribe: 'Run POST /api/v2/backups',
			arrayOfRoutes: ['/api/v2/backups'],
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
					arrayOfInfoToTest: [
						{
							itStatement: 'should start a backup test_id=hdcwip',
							callFunction: () => {
								tools.ot_misc.open_server();
								tools.stubs.get_changes.callsArgWith(2, null, JSON.parse(JSON.stringify(db_objects._changes)));
								tools.stubs.bulk_get.callsArgWith(2, null, JSON.parse(JSON.stringify(db_objects._bulk_get)));
								tools.stubs.repeatWriteSafe.callsFake((opts, mod, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
									return cb(null, opts.doc);
								});
								tools.stubs.retry_req.callsArgWith(1, null);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(202);
								res.body = trim_timestamps(res.body);
								expect(res.body).to.deep.equal({
									id: '03_ibp_db_backup_',
									message: 'in-progress',
									url: 'http://localhost:3000/ak/api/v3/backups/03_ibp_db_backup_'
								});
								tools.stubs.retry_req.resetHistory();
							}
						}
					]
				}
			]
		},

		// PUT /api/v2/backups/asdf/attachments/my-attachment
		{
			suiteDescribe: 'PUT /api/v2/backups/asdf/attachments/my-attachment',
			mainDescribe: 'Run PUT /api/v2/backups/asdf/attachments/my-attachment',
			arrayOfRoutes: ['/api/v2/backups/asdf/attachments/my-attachment'],
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
					arrayOfInfoToTest: [
						{
							itStatement: 'should add attachment to backup - test_id=wtorse',
							body: { attachment: 'my attachment data' },
							callFunction: () => {
								tools.stubs.getDoc.callsArgWith(1, null, { id: 'asdf' });
								tools.stubs.add_attachment.callsArgWith(1, null, {});
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(res.body).to.deep.equal({
									message: 'ok',
									att_name: 'my-attachment'
								});
							}
						},
						{
							itStatement: 'should error, missing attachment test_id=ierwxl',
							body: { invalid: 'my attachment data' },
							callFunction: () => {
								tools.stubs.getDoc.callsArgWith(1, null, { id: 'asdf' });
								tools.stubs.add_attachment.callsArgWith(1, null, {});
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(400);
								expect(res.body).to.deep.equal({
									msgs: [
										'Expected parameter \'attachment\' to exist.',
										'Parameter \'invalid\' is an unknown key for object.'
									],
									raw: [
										{
											key: 'missing_required',
											symbols: {
												$PROPERTY_NAME: 'attachment'
											}
										},
										{
											key: 'no_extra_keys',
											symbols: {
												$PROPERTY_NAME: 'invalid'
											}
										}
									],
									statusCode: 400
								});
							}
						}
					]
				}
			]
		},

		// PUT /api/v2/backups/:backup_id
		{
			suiteDescribe: 'PUT /api/v2/backups/:backup_id',
			mainDescribe: 'Run PUT /api/v2/backups/:backup_id',
			arrayOfRoutes: ['/api/v2/backups/03_ibp_db_backup_1592920976989'],
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
					arrayOfInfoToTest: [
						{
							itStatement: 'should start restore of backup - test_id=davdsa',
							callFunction: () => {
								tools.stubs.getDoc.callsArgWith(1, null, JSON.parse(JSON.stringify(db_objects.backup_doc)));
								tools.stubs.bulkDatabase.callsArgWith(2, null, {});
								tools.stubs.bulk_get.callsArgWith(2, null, JSON.parse(JSON.stringify(db_objects._bulk_get)));
								tools.stubs.store_webhook_doc.callsArgWith(1, null, {});
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(202);
								res.body.url = res.body.url.substring(0, 45);
								expect(res.body).to.deep.equal({
									message: 'in-progress',
									url: 'http://localhost:3000/ak/api/v1/webhooks/txs/'
								});
							}
						},
						{
							itStatement: 'should error, backup id not found test_id=hjecfh',
							callFunction: () => {
								tools.stubs.getDoc.callsArgWith(1, {
									statusCode: 404,
									error: 'not_found',
									reason: 'missing'
								});
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(400);
								expect(res.body).to.deep.equal({ statusCode: 400, message: 'cannot restore, could not load backup doc.' });
							}
						}
					]
				}
			]
		},

		// GET /api/v2/backups/:backup_id
		{
			suiteDescribe: 'GET /api/v2/backups/:backup_id',
			mainDescribe: 'Run GET /api/v2/backups/:backup_id',
			arrayOfRoutes: ['/api/v2/backups/03_ibp_db_backup_1592920976989'],
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
							itStatement: 'should get a backup - test_id=pjtypc',
							callFunction: () => {
								tools.stubs.getDoc.callsArgWith(1, null, JSON.parse(JSON.stringify(db_objects.backup_doc)));
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(res.body).to.deep.equal(db_objects.backup_format);
							}
						},
						{
							itStatement: 'should error, backup id not found - test_id=gcwrqp',
							callFunction: () => {
								tools.stubs.getDoc.callsArgWith(1, {
									statusCode: 404,
									error: 'not_found',
									reason: 'missing'
								});
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(404);
								expect(res.body).to.deep.equal({
									statusCode: 404,
									error: 'not_found',
									reason: 'missing'
								});
							}
						}
					]
				}
			]
		},

		// GET /api/v2/backups
		{
			suiteDescribe: 'GET /api/v2/backups',
			mainDescribe: 'Run GET /api/v2/backups',
			arrayOfRoutes: ['/api/v2/backups'],
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
							itStatement: 'should get backup ids - test_id=kkejxx',
							callFunction: () => {
								tools.stubs.getDesignDocView.callsArgWith(1, null, JSON.parse(JSON.stringify(db_objects.backups_view)));
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(res.body).to.deep.equal({
									ids: [
										'03_ibp_db_backup_1592920976989',
										'03_ibp_db_backup_1592922855871',
										'03_ibp_db_backup_1592924104038',
										'03_ibp_db_backup_1593009512271',
									]
								});
							}
						},
						{
							itStatement: 'should error, view not found - test_id=vnmhnm',
							callFunction: () => {
								tools.stubs.getDesignDocView.callsArgWith(1, {
									statusCode: 404,
									error: 'not_found',
									reason: 'missing'
								});
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(404);
								expect(res.body).to.deep.equal({
									statusCode: 404,
									error: 'not_found',
									reason: 'missing'
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
