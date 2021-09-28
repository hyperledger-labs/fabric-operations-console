/*
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
// activity_tracker.test.js
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const tools = common.tools;
const myutils = require('../../testing-lib/test-middleware');
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);

const createStubs = () => {
	return {};
};

describe('Fabric Utils', () => {
	before(() => {
		tools.stubs = createStubs();
	});
	after(() => {
		myutils.restoreStubs(tools.stubs);
	});
	const testCollection = [
		// track_api
		{
			suiteDescribe: 'track_api',
			mainDescribe: 'Run track_api',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid successful create component event - test_id=eunbpw',
							expectBlock: (done) => {
								const component_id = 'UpperCaseId';
								const req = {
									method: 'POST',
									path: '/api/v2/components',
									actions: [common.ev.STR.CREATE_ACTION],
									_notifications: [
										{
											component_id: component_id,
											type: common.ev.STR.PEER
										}
									]
								};
								const res = {
									statusCode: 200
								};
								const response = {
									'debug': 'data here'
								};
								const event = tools.activity_tracker.track_api(req, res, response);
								expect(event).to.not.equal(null);
								expect(event.outcome).to.equal('success');
								expect(event.action).to.equal(common.ev.STR.SERVICE_NAME + '.components.create');
								expect(event.reason.reasonCode).to.equal(res.statusCode);
								expect(event.reason.reasonType).to.equal('OK');
								expect(event.target.id).to.equal('crn:v1:bluemix:public:blockchain:us-south:null:null:' +
									common.ev.STR.PEER + ':' + component_id.toLowerCase());
								expect(event.target.name).to.equal(component_id);
								expect(event.target.typeURI).to.equal(common.ev.STR.SERVICE_NAME + '/components');
								expect(event.observer.name).to.equal('ActivityTracker');
								done();
							}
						},
						{
							itStatement: 'should return a failed user create event - test_id=dmujzy',
							expectBlock: (done) => {
								const resource = 'users';
								const req = {
									method: 'POST',
									path: '/api/v2/permissions/' + resource,
									actions: [common.ev.STR.USERS_ACTION],
									_notifications: []
								};
								const res = {
									statusCode: 401
								};
								const response = {
									'debug': 'data here'
								};
								const event = tools.activity_tracker.track_api(req, res, response);
								expect(event).to.not.equal(null);
								expect(event.outcome).to.equal('failure');
								expect(event.action).to.equal(common.ev.STR.SERVICE_NAME + '.' + resource + '.create');
								expect(event.reason.reasonCode).to.equal(res.statusCode);
								expect(event.reason.reasonType).to.equal('NOT OK');
								expect(event.target.id).to.equal('crn:v1:bluemix:public:blockchain:us-south:null:null:' + resource + ':');
								expect(event.target.name).to.equal('users');
								expect(event.target.typeURI).to.equal(common.ev.STR.SERVICE_NAME + '/' + resource);
								expect(event.observer.name).to.equal('ActivityTracker');
								expect(JSON.stringify(event.responseData.response)).to.equal(JSON.stringify(response));
								done();
							}
						},
						{
							itStatement: 'should return a successful read user event - test_id=fmvcdh',
							expectBlock: (done) => {
								const resource = 'users';
								const req = {
									method: 'GET',
									path: '/api/v2/permissions/' + resource,
									actions: [common.ev.STR.USERS_ACTION],
									_notifications: []
								};
								const res = {
									statusCode: 201
								};
								const response = {
									'debug': 'data here'
								};
								const event = tools.activity_tracker.track_api(req, res, response);
								expect(event).to.not.equal(null);
								expect(event.outcome).to.equal('success');
								expect(event.action).to.equal(common.ev.STR.SERVICE_NAME + '.' + resource + '.read');
								expect(event.reason.reasonCode).to.equal(res.statusCode);
								expect(event.reason.reasonType).to.equal('OK');
								expect(event.target.id).to.equal('crn:v1:bluemix:public:blockchain:us-south:null:null:' + resource + ':');
								expect(event.target.name).to.equal('users');
								expect(event.target.typeURI).to.equal(common.ev.STR.SERVICE_NAME + '/' + resource);
								expect(event.observer.name).to.equal('ActivityTracker');
								done();
							}
						},
						{
							itStatement: 'should return a successful client event - test_id=uewidi',
							expectBlock: (done) => {
								const resource = 'channels';
								const resource_id = 'MyChannel';
								const event_code = '202';
								const action_verb = 'custom';
								const client_details = {
									'some': 'example'
								};
								const req = {
									_client_event: true,
									method: 'POST',
									path: '/api/v2/events/' + resource + '/' + resource_id,
									params: {
										resource: resource,
										resource_id: resource_id,
									},
									actions: [common.ev.STR.VIEW_ACTION],
									_notifications: [],
									body: {
										action_verb: action_verb,
										http_code: event_code,
										client_details: client_details
									}
								};
								const res = {
									statusCode: 200
								};
								const response = {};

								const event = tools.activity_tracker.track_api(req, res, response);
								console.log('event', event);
								expect(event).to.not.equal(null);
								expect(event.outcome).to.equal('success');
								expect(event.action).to.equal(common.ev.STR.SERVICE_NAME + '.' + resource + '.' + action_verb);
								expect(event.reason.reasonCode).to.equal(Number(event_code));
								expect(event.reason.reasonType).to.equal('OK');
								expect(event.target.id).to.equal('crn:v1:bluemix:public:blockchain:us-south:null:null:' +
									resource.toLowerCase() + ':' + resource_id.toLocaleLowerCase());
								expect(event.target.name).to.equal(resource_id);
								expect(event.target.typeURI).to.equal(common.ev.STR.SERVICE_NAME + '/' + resource);
								expect(event.observer.name).to.equal('ActivityTracker');
								expect(JSON.stringify(event.responseData.client_details)).to.equal(JSON.stringify(client_details));
								done();
							}
						},
						{
							itStatement: 'should return a successful create component (deployer) event -',
							expectBlock: (done) => {
								common.ev.CRN.account_id = 'a/01234';
								common.ev.CRN.instance_id = 'abcd-abcd';
								const component_id = 'myCa01';
								const component_display_name = 'My CA!';
								const severity = 'warning';
								const req = {
									method: 'POST',
									path: '/api/saas/components',
									actions: [common.ev.STR.CREATE_ACTION],
									_notifications: [
										{
											component_id: component_id,
											component_display_name: component_display_name,
											type: common.ev.STR.PEER,
											severity: severity
										}
									]
								};
								const res = {
									statusCode: 200
								};
								const response = {};

								const event = tools.activity_tracker.track_api(req, res, response);
								console.log('event', event);
								expect(event).to.not.equal(null);
								expect(event.outcome).to.equal('success');
								expect(event.action).to.equal(common.ev.STR.SERVICE_NAME + '.components.create');
								expect(event.reason.reasonCode).to.equal(res.statusCode);
								expect(event.reason.reasonType).to.equal('OK');
								expect(event.target.id).to.equal('crn:v1:bluemix:public:blockchain:us-south:' + common.ev.CRN.account_id +
									':' + common.ev.CRN.instance_id + ':' + common.ev.STR.PEER + ':' + component_id.toLocaleLowerCase());
								expect(event.target.name).to.equal(component_display_name);
								expect(event.target.typeURI).to.equal(common.ev.STR.SERVICE_NAME + '/components');
								expect(event.observer.name).to.equal('ActivityTracker');
								expect(event.severity).to.equal(severity);
								done();
							}
						},
						{
							itStatement: 'should return a failed create component (deployer) event -',
							expectBlock: (done) => {
								common.ev.CRN.account_id = 'a/01234';
								common.ev.CRN.instance_id = 'abcd-abcd';
								//const component_id = 'myCa01';
								const component_display_name = 'My CA!';
								const req = {
									method: 'POST',
									path: '/api/saas/components',
									actions: [common.ev.STR.CREATE_ACTION],
									_notifications: [],
									_component_display_name: component_display_name,
								};
								const res = {
									statusCode: 500
								};
								const response = {
									statusCode: 500,
									msg: 'body received from deployer was not valid JSON'
								};

								const event = tools.activity_tracker.track_api(req, res, response);
								console.log('event', event);
								expect(event).to.not.equal(null);
								expect(event.outcome).to.equal('failure');
								expect(event.action).to.equal(common.ev.STR.SERVICE_NAME + '.components.create');
								expect(event.reason.reasonCode).to.equal(res.statusCode);
								expect(event.reason.reasonType).to.equal('NOT OK');
								expect(event.target.id).to.equal('crn:v1:bluemix:public:blockchain:us-south:' + common.ev.CRN.account_id +
									':' + common.ev.CRN.instance_id + ':components:');
								expect(event.target.name).to.equal(component_display_name);
								expect(event.target.typeURI).to.equal(common.ev.STR.SERVICE_NAME + '/components');
								expect(event.observer.name).to.equal('ActivityTracker');
								expect(event.severity).to.equal('normal');
								done();
							}
						},
						{
							itStatement: 'should return a success sig collection event (no iam auth) -',
							expectBlock: (done) => {
								common.ev.CRN.account_id = 'a/01234';
								common.ev.CRN.instance_id = 'abcd-abcd';
								const req = {
									method: 'POST',
									path: '/api/v2/signature_collections',
									actions: [],
									_notifications: [],
								};
								const res = {
									statusCode: 200
								};
								const response = {
									statusCode: 200,
									msg: 'created'
								};

								const event = tools.activity_tracker.track_api(req, res, response);
								console.log('event', event);
								expect(event).to.not.equal(null);
								expect(event.outcome).to.equal('success');
								expect(event.action).to.equal(common.ev.STR.SERVICE_NAME + '.signature_collections.create');
								expect(event.reason.reasonCode).to.equal(res.statusCode);
								expect(event.reason.reasonType).to.equal('OK');
								expect(event.target.id).to.equal('crn:v1:bluemix:public:blockchain:us-south:' + common.ev.CRN.account_id +
									':' + common.ev.CRN.instance_id + ':signature_collections:');
								expect(event.target.name).to.equal('signature_collections');
								expect(event.target.typeURI).to.equal(common.ev.STR.SERVICE_NAME + '/signature_collections');
								expect(event.observer.name).to.equal('ActivityTracker');
								expect(event.severity).to.equal('normal');
								done();
							}
						},
						{
							itStatement: 'should return a success logs event (public/no auth) -',	// this event is not possible, but it still exercises code
							expectBlock: (done) => {
								common.ev.CRN.account_id = 'a/01234';
								common.ev.CRN.instance_id = 'abcd-abcd';
								const req = {
									method: 'GET',
									path: '/api/v2/logs',
									actions: [],
									_notifications: [],
								};
								const res = {
									statusCode: 200
								};
								const response = {
									statusCode: 200,
									msg: 'viewed'
								};

								const event = tools.activity_tracker.track_api(req, res, response);
								console.log('event', event);
								expect(event).to.not.equal(null);
								expect(event.outcome).to.equal('success');
								expect(event.action).to.equal(common.ev.STR.SERVICE_NAME + '.logs.read');
								expect(event.reason.reasonCode).to.equal(res.statusCode);
								expect(event.reason.reasonType).to.equal('OK');
								expect(event.target.id).to.equal('crn:v1:bluemix:public:blockchain:us-south:' + common.ev.CRN.account_id +
									':' + common.ev.CRN.instance_id + ':logs:');
								expect(event.target.name).to.equal('logs');
								expect(event.target.typeURI).to.equal(common.ev.STR.SERVICE_NAME + '/logs');
								expect(event.observer.name).to.equal('ActivityTracker');
								expect(event.severity).to.equal('normal');
								done();
							}
						}
					]
				}
			]
		},
	];
	// call main test function to run this test collection
	common.mainTestFunction(testCollection, path_to_current_file);
});
