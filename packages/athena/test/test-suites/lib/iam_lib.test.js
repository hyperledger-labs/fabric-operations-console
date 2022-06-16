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
// iam_lib.test.js - test file for iam_lib
//------------------------------------------------------------

const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const iam_objects = require('../../docs/iam_objects.json');
const tools = common.tools;
tools.cryptoSuite = require('../../../libs/fabric_ca_services/create_crypto_suite.js')(common.logger, common.ev, common.tools).createCryptoSuite();
const myutils = require('../../testing-lib/test-middleware');
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);
const nextSpy = sinon.spy();
const httpMocks = require('node-mocks-http');
const res = httpMocks.createResponse();

// Create a request object
const req = {
	headers: {
		'content-type': 'application/json',
		'authorization': 'Basic YWRtaW46cmFuZG9t bearer '
	},
	query: {
		'skip_cache': 'yes'
	}
};

// create a nodejsCache object
const nodejsCache = {
	get: sinon.stub(),
	set: sinon.stub(),
	del: sinon.stub(),
	flushAll: sinon.spy(),
	getStats: sinon.spy(),
	keys: sinon.stub()
};

common.ev.IAM = {};
common.ev.IAM.URL = 'test_url';
common.ev.IAM_API_KEY = 'secret';

let iam_lib;

const createStubs = () => {
	return {
		request: sinon.stub(tools, 'request'),
		retry_req: sinon.stub(tools.misc, 'retry_req')
	};
};

describe('IAM Lib', () => {
	before(() => {
		tools.stubs = createStubs();
		iam_lib = require('../../../libs/iam_lib.js')(common.logger, common.ev, tools, nodejsCache);
		tools.stubs.getAccessTokenHttp = sinon.stub(iam_lib, 'getAccessTokenHttp');
		tools.stubs.isAuthorizedHttp = sinon.stub(iam_lib, 'isAuthorizedHttp');
		tools.stubs.verifyToken = sinon.stub(iam_lib, 'verifyToken');
		tools.stubs.getIAMPublicCertsHttp = sinon.stub(iam_lib, 'getIAMPublicCertsHttp');
	});
	after(() => {
		myutils.restoreStubs(tools.stubs);
	});
	const testCollection = [
		// isAuthorizedWithIBP
		{
			suiteDescribe: 'isAuthorizedWithIBP',
			mainDescribe: 'Run isAuthorizedWithIBP',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should call next - everything passed in is either valid or stubbed test_id=tcynxv',
							callFunction: () => {
								sinon.stub(iam_lib, 'getAccessToken').callsArgWith(1, null, {});
								sinon.stub(iam_lib, 'isAuthorized').callsArgWith(1, null, {});
							},
							expectBlock: (done) => {
								iam_lib.isAuthorizedWithIBP(req, res, nextSpy);
								expect(nextSpy.called).to.be.true;
								iam_lib.getAccessToken.restore();
								iam_lib.isAuthorized.restore();
								done();
							}
						},
						{
							itStatement: 'should return an error - no headers passed in the req object test_id=rynyob',
							expectBlock: (done) => {
								const req_copy = JSON.parse(JSON.stringify(req));
								delete req_copy.headers;
								iam_lib.isAuthorizedWithIBP(req_copy, res, nextSpy);
								expect(res.statusCode).to.equal(400);
								done();
							}
						},
						{
							itStatement: 'should return an error - error passed to to isAuthorized stub test_id=ewlikb',
							callFunction: () => {
								const err = {};
								sinon.stub(iam_lib, 'getAccessToken').callsArgWith(1, null, {});
								sinon.stub(iam_lib, 'isAuthorized').callsArgWith(1, err);
							},
							expectBlock: (done) => {
								const req_copy = JSON.parse(JSON.stringify(req));
								delete req_copy.query.skip_cache;
								iam_lib.isAuthorizedWithIBP(req_copy, res, nextSpy);
								expect(res.statusCode).to.equal(500);
								iam_lib.getAccessToken.restore();
								iam_lib.isAuthorized.restore();
								done();
							}
						}
					]
				}
			]
		},
		// getAccessToken
		{
			suiteDescribe: 'getAccessToken',
			mainDescribe: 'Run getAccessToken',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid response - everything passed in is either valid or stubbed test_id=jzrwyq',
							callFunction: () => {
								common.ev.IAM_CACHE_ENABLED = true;
								nodejsCache.get.returns({ prop: 'some prop' });
							},
							expectBlock: (done) => {
								iam_lib.getAccessToken({}, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify({ prop: 'some prop' }));
									common.ev.IAM_CACHE_ENABLED = false;
									done();
								});
							}
						},
						{
							itStatement: 'should return an error and an empty string for the response - ev.IAM_CACHE_ENABLED is set to false test_id=kasuye',
							callFunction: () => {
								nodejsCache.get.returns({ prop: 'some prop' });
								tools.stubs.getAccessTokenHttp.callsArgWith(1, {}, '');
							},
							expectBlock: (done) => {
								iam_lib.getAccessToken({}, (err, resp) => {
									expect(JSON.stringify(err)).to.equal(JSON.stringify({}));
									expect(resp).to.equal('');
									done();
								});
							}
						},
						{
							itStatement: 'should return an empty string - no response passed to the nodejsCache.get stub test_id=gdctur',
							callFunction: () => {
								common.ev.IAM_CACHE_ENABLED = true;
								nodejsCache.get.returns(null);
							},
							expectBlock: (done) => {
								iam_lib.getAccessToken({}, (err, resp) => {
									expect(JSON.stringify(err)).to.equal('{}');
									expect(resp).to.equal('');
									common.ev.IAM_CACHE_ENABLED = false;
									done();
								});
							}
						},
						{
							itStatement: 'should call the write2cache function - no response passed to nodejsCache.get test_id=dokzov',
							callFunction: () => {
								common.ev.IAM_CACHE_ENABLED = true;
								nodejsCache.get.returns(null);
								tools.stubs.getAccessTokenHttp.callsArgWith(1, null);
								sinon.spy(iam_lib, 'write2cache');
							},
							expectBlock: (done) => {
								iam_lib.getAccessToken({}, (err) => {
									expect(err).to.equal(null);
									expect(iam_lib.write2cache.called).to.be.true;
									iam_lib.getAccessTokenHttp.restore();
									iam_lib.write2cache.restore();
									common.ev.IAM_CACHE_ENABLED = false;
									done();
								});
							}
						},
						{
							itStatement: 'should return no error - SKIP_CACHE set to true test_id=ijswoz',
							callFunction: () => {
								common.ev.IAM_CACHE_ENABLED = true;
								req.query.skip_cache = true;
								sinon.stub(iam_lib, 'getAccessTokenHttp').callsArgWith(1, null, {});
								sinon.spy(iam_lib, 'write2cache');
							},
							expectBlock: (done) => {
								iam_lib.getAccessToken({ SKIP_CACHE: true }, (err) => {
									expect(err).to.equal(null);
									expect(iam_lib.write2cache.called).to.be.true;
									iam_lib.getAccessTokenHttp.restore();
									iam_lib.write2cache.restore();
									common.ev.IAM_CACHE_ENABLED = false;
									done();
								});
							}
						}
					]
				}
			]
		},
		// getAccessTokenHttp
		{
			suiteDescribe: 'getAccessTokenHttp',
			mainDescribe: 'Run getAccessTokenHttp',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid response - all params passed in are valid test_id=abvqre',
							callFunction: () => {
								tools.stubs.retry_req.callsArgWith(1, null, { statusCode: 200, body: JSON.stringify({ prop: 'some prop' }) });
							},
							expectBlock: (done) => {
								iam_lib.getAccessTokenHttp({}, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify({ prop: 'some prop' }));
									done();
								});
							}
						}
					]
				}
			]
		},
		// isAuthorized
		{
			suiteDescribe: 'isAuthorized',
			mainDescribe: 'Run isAuthorized',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return an error and an empty string for the response - ev.IAM_CACHE_ENABLED is set to false test_id=ysnvgu',
							callFunction: () => {
								common.ev.IAM_CACHE_ENABLED = false;
								tools.stubs.verifyToken.callsArgWith(1, null);
								tools.stubs.isAuthorizedHttp.callsArgWith(1, { statusCode: 500, authorized: false, error: {} });
							},
							expectBlock: (done) => {
								const opts = {
									users_iam_token: iam_objects.users_iam_token,
									SKIP_CACHE: true,
								};
								iam_lib.isAuthorized(opts, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.authorized).to.equal(false);
									expect(JSON.stringify(err.error)).to.equal(JSON.stringify({}));
									expect(resp).to.equal(undefined);
									done();
								});
							}
						},
						{
							itStatement: 'should return no error - SKIP_CACHE set to true test_id=gyobsr',
							callFunction: () => {
								common.ev.IAM_CACHE_ENABLED = true;
								tools.stubs.verifyToken.callsArgWith(1, null);
								tools.stubs.isAuthorizedHttp.callsArgWith(1, null, {});
								sinon.spy(iam_lib, 'write2cache');
							},
							expectBlock: (done) => {
								const opts = {
									SKIP_CACHE: true,
									users_iam_token: iam_objects.users_iam_token,
									authorizations: [{
										id: 'some random id, string',
										action: common.ev.STR.CREATE_ACTION,
									}],
								};
								iam_lib.isAuthorized(opts, (err) => {
									expect(err).to.equal(null);
									expect(iam_lib.write2cache.called).to.be.true;
									iam_lib.write2cache.restore();
									common.ev.IAM_CACHE_ENABLED = false;
									done();
								});
							}
						},
						{
							itStatement: 'should return a valid response - all params passed in are valid test_id=hnskrf',
							callFunction: () => {
								common.ev.IAM_CACHE_ENABLED = true;
								tools.stubs.verifyToken.callsArgWith(1, null);
								nodejsCache.get.returns({ prop: 'some prop' });
							},
							expectBlock: (done) => {
								const opts = {
									users_iam_token: iam_objects.users_iam_token,
									authorizations: [{
										id: 'some random id, string',									// [optional]
										action: common.ev.STR.CREATE_ACTION,								// IAM_service_name.noun.verb
									}],
								};
								iam_lib.isAuthorized(opts, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify({ prop: 'some prop' }));
									common.ev.IAM_CACHE_ENABLED = false;
									iam_lib.verifyToken.restore();
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - error passed to verifyToken stub test_id=qdigok',
							callFunction: () => {
								common.ev.IAM_CACHE_ENABLED = true;
								const err = {
									statusCode: 500,
									msg: 'problem verifying the token'
								};
								sinon.stub(iam_lib, 'verifyToken').callsArgWith(1, err);
								nodejsCache.get.returns({ prop: 'some prop' });
							},
							expectBlock: (done) => {
								const opts = {
									users_iam_token: iam_objects.users_iam_token
								};
								iam_lib.isAuthorized(opts, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.msg).to.equal('problem verifying the token');
									expect(resp).to.equal(null);
									common.ev.IAM_CACHE_ENABLED = false;
									iam_lib.verifyToken.restore();
									done();
								});
							}
						}
					]
				}
			]
		},
		// isAuthorizedHttp
		{
			suiteDescribe: 'isAuthorizedHttp',
			mainDescribe: 'Run isAuthorizedHttp',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid response - everything passed in is either valid or stubbed test_id=tbaioc',
							callFunction: () => {
								const body = JSON.stringify({
									responses: [
										{
											authorizationDecision: {
												permitted: true,
												obligation: {
													actions: [true]
												}
											}
										}
									]
								});
								tools.stubs.retry_req.callsArgWith(1, null, { statusCode: 200, body: body });
								tools.stubs.isAuthorizedHttp.restore();
							},
							expectBlock: (done) => {
								const store_crn = JSON.parse(JSON.stringify(common.ev.CRN));
								common.ev.CRN = {};
								common.ev.CRN.instance_id = 'instance_id';
								const opts = {
									users_iam_token: iam_objects.users_iam_token_no_account,
									authorizations: [1],
									SKIP_CACHE: true
								};
								iam_lib.isAuthorizedHttp(opts, (err, resp) => {
									expect(err).to.equal(null);
									expect(resp.authorized).to.equal(true);
									common.ev.CRN = JSON.parse(JSON.stringify(store_crn));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - invalid body passed to request stub test_id=hexsjv',
							callFunction: () => {
								const body = 'invalid body';
								tools.stubs.retry_req.callsArgWith(1, null, { statusCode: 200, body: body });
							},
							expectBlock: (done) => {
								const store_crn = JSON.parse(JSON.stringify(common.ev.CRN));
								common.ev.CRN = {};
								common.ev.CRN.instance_id = 'instance_id';
								const opts = {
									users_iam_token: iam_objects.users_iam_token_will_crash,
									authorizations: [1],
									SKIP_CACHE: true
								};
								tools.stubs.isAuthorizedHttp.restore();
								iam_lib.isAuthorizedHttp(opts, (err, resp) => {
									expect(err.statusCode).to.equal(401);
									expect(err.authorized).to.equal(false);
									expect(err.error).to.equal('cannot parse bearer token. cannot authorize your request with iam');
									expect(resp).to.equal(null);
									common.ev.CRN = JSON.parse(JSON.stringify(store_crn));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - no body passed to request stub test_id=wqrdul',
							callFunction: () => {
								const body = null;
								tools.stubs.retry_req.callsArgWith(1, null, { statusCode: 200, body: body });
							},
							expectBlock: (done) => {
								const store_crn = JSON.parse(JSON.stringify(common.ev.CRN));
								common.ev.CRN = {};
								common.ev.CRN.instance_id = 'instance_id';
								const opts = {
									users_iam_token: iam_objects.users_iam_token,
									SKIP_CACHE: true
								};
								iam_lib.isAuthorizedHttp(opts, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.authorized).to.equal(false);
									expect(err.error).to.equal('parse error. could not understand iam');
									expect(resp).to.equal(null);
									common.ev.CRN = JSON.parse(JSON.stringify(store_crn));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - authorizationDecision not permitted test_id=netydb',
							callFunction: () => {
								const body = JSON.stringify({
									responses: [
										{
											authorizationDecision: {
												permitted: false
											}
										},
										{
											authorizationDecision: {
												permitted: false
											}
										}
									]
								});
								tools.stubs.retry_req.callsArgWith(1, null, { statusCode: 200, body: body });
							},
							expectBlock: (done) => {
								const store_crn = JSON.parse(JSON.stringify(common.ev.CRN));
								common.ev.CRN = {};
								common.ev.CRN.instance_id = 'instance_id';
								const opts = {
									url: 'http://localhost:3000',
									authorizations: [{ action: common.ev.STR.CREATE_ACTION, id: 'abcd' }],
									users_iam_token: iam_objects.users_iam_token,
									SKIP_CACHE: true
								};
								iam_lib.isAuthorizedHttp(opts, (err, resp) => {
									expect(err.statusCode).to.equal(403);
									expect(err.authorized).to.equal(false);
									expect(err.error).to.equal('token is not authorized for these action(s)');
									expect(resp).to.equal(null);
									common.ev.CRN = JSON.parse(JSON.stringify(store_crn));
									done();
								});
							}
						},
						{
							itStatement: 'should return with no errors - there were multiple actions which were permitted test_id=uktlse',
							callFunction: () => {
								const body = JSON.stringify({
									responses: [
										{
											authorizationDecision: {
												permitted: false
											}
										},
										{
											authorizationDecision: {
												permitted: true
											}
										}
									]
								});
								tools.stubs.retry_req.callsArgWith(1, null, { statusCode: 200, body: body });
							},
							expectBlock: (done) => {
								const store_crn = JSON.parse(JSON.stringify(common.ev.CRN));
								common.ev.CRN = {};
								common.ev.CRN.instance_id = 'instance_id';
								const opts = {
									url: 'http://localhost:3000',
									authorizations: [{ action: common.ev.STR.CREATE_ACTION, id: 'abcd' }],
									users_iam_token: iam_objects.users_iam_token,
									SKIP_CACHE: true
								};
								iam_lib.isAuthorizedHttp(opts, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify({ 'authorized': true, 'permitted_actions': [] }));
									common.ev.CRN = JSON.parse(JSON.stringify(store_crn));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error and message - error sent to request stub inside isAuthorizedHttp test_id=bgvskm',
							callFunction: () => {
								tools.stubs.retry_req.callsArgWith(1, { statusCode: 500, msg: 'problem with "isAuthorizedHttp" request' });
							},
							expectBlock: (done) => {
								const store_crn = JSON.parse(JSON.stringify(common.ev.CRN));
								common.ev.CRN = {};
								common.ev.CRN.instance_id = 'instance_id';
								const opts = {
									url: 'http://localhost:3000',
									authorizations: [{ action: common.ev.STR.CREATE_ACTION, id: 'abcd' }],
									users_iam_token: iam_objects.users_iam_token,
									SKIP_CACHE: true
								};
								iam_lib.isAuthorizedHttp(opts, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.error).to.equal('problem authenticating user with IAM. check logs for details.');
									common.ev.CRN = JSON.parse(JSON.stringify(store_crn));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error and message - 429 error sent to request stub inside "isAuthorizedHttp" test_id=gtiohm',
							callFunction: () => {
								tools.stubs.retry_req.callsArgWith(1, null, { statusCode: 429 });
							},
							expectBlock: (done) => {
								const store_crn = JSON.parse(JSON.stringify(common.ev.CRN));
								common.ev.CRN = {};
								common.ev.CRN.instance_id = 'instance_id';
								const opts = {
									url: 'http://localhost:3000',
									authorizations: [{ action: common.ev.STR.CREATE_ACTION, id: 'abcd' }],
									users_iam_token: iam_objects.users_iam_token,
									SKIP_CACHE: true,
								};
								iam_lib.isAuthorizedHttp(opts, (err, resp) => {
									expect(err.statusCode).to.equal(429);
									expect(JSON.stringify(err)).to.equal(
										JSON.stringify({ 'statusCode': 429, 'error': 'problem authenticating user with IAM. check logs for details.' })
									);
									expect(resp).to.equal(undefined);
									common.ev.CRN = JSON.parse(JSON.stringify(store_crn));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error and message - 400 error sent to request stub inside "isAuthorizedHttp" test_id=yjneci',
							callFunction: () => {
								tools.stubs.retry_req.callsArgWith(1, null, { statusCode: 400, statusMessage: 'something is not right here' });
							},
							expectBlock: (done) => {
								const store_crn = JSON.parse(JSON.stringify(common.ev.CRN));
								common.ev.CRN = {};
								common.ev.CRN.instance_id = 'instance_id';
								const opts = {
									url: 'http://localhost:3000',
									authorizations: [{ action: common.ev.STR.CREATE_ACTION, id: 'abcd' }],
									users_iam_token: iam_objects.users_iam_token,
									SKIP_CACHE: true,
								};
								iam_lib.isAuthorizedHttp(opts, (err, resp) => {
									expect(err.statusCode).to.equal(400);
									expect(JSON.stringify(err)).to.equal(
										JSON.stringify({ 'statusCode': 400, 'error': 'problem authenticating user with IAM. check logs for details.' })
									);
									expect(resp).to.equal(undefined);
									common.ev.CRN = JSON.parse(JSON.stringify(store_crn));
									done();
								});
							}
						}
					]
				}
			]
		},
		// getIAMPublicCertsHttp
		{
			suiteDescribe: 'getIAMPublicCertsHttp',
			mainDescribe: 'Run getIAMPublicCertsHttp',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the formated cert data for a specific kid- test_id=ykmfzt',
							callFunction: () => {
								tools.stubs.request.callsArgWith(1, null, { body: JSON.stringify(iam_objects.iam_resp) });
								tools.stubs.getIAMPublicCertsHttp.restore();
							},
							expectBlock: (done) => {
								iam_lib.getIAMPublicCertsHttp('20190724', (err, resp) => {
									const cert =
										`-----BEGIN PUBLIC KEY-----
										MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAugd1zopEPNw3ulo7r/Tp
										1izYSAHqpTRzF7iBLPeZWWIO6wy18RiuAIXFL18EBqWqxvUmAOMrnogN27r6hCFp
										FICNN14nRy86Oy+mYYd93QLag/NjSIs7FH0lDIDLgP4UKFij2cfc2RspzR+MywYL
										qeLzbFtVEv2Q7RHhtvdSInY4KI/55SLNtdQDQqyYAZM6SnZEiYKTO2z59cbxnLVN
										NRcMZZgEKw1t0FbZsal8Ny+t8HN8fn4hoM+XQRlC4C7L1I77zqd3nw9wncaaNjSf
										HYs2lzIoaKHmxnV+KHxiFRJZ2fEb0SefiaaXwMzkizpxt6a++2JfxRUP+QnWV3KO
										1QIDAQAB
										-----END PUBLIC KEY-----`;
									expect(resp.x5c).to.equal(iam_objects.x5c);
									expect(resp.publicKey.replace(/\s/g, '')).to.equal(cert.replace(/\s/g, ''));
									expect(resp.alg).to.equal('RS256');
									done();
								});
							}
						},
						{
							itStatement: 'should return null, bad iam response -  test_id=ojkzyt',
							callFunction: () => {
								const iam_resp_blank = [];
								tools.stubs.request.callsArgWith(1, null, { body: JSON.stringify(iam_resp_blank) });
								tools.stubs.getIAMPublicCertsHttp.restore();
							},
							expectBlock: (done) => {
								iam_lib.getIAMPublicCertsHttp('20190724', (err, resp) => {
									expect(err).to.equal(null);
									expect(resp).to.equal(null);
									done();
								});
							}
						}
					]
				}
			]
		},
		// verifyToken
		{
			suiteDescribe: 'verifyToken',
			mainDescribe: 'Run verifyToken',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should validate a valid iam access token - test_id=cnmpas',
							callFunction: () => {
								tools.stubs.request.callsArgWith(1, null, { body: JSON.stringify(iam_objects.iam_resp) });
								nodejsCache.get.returns(null);
								tools.stubs.verifyToken.restore();
								tools.stubs.getIAMPublicCertsHttp.restore();
							},
							expectBlock: (done) => {
								iam_lib._check_expiration = false;									// skip expiration check, only validate signature
								iam_lib.verifyToken(iam_objects.token0, (err, resp) => {			// this is a real token, but its expired, its fine chris
									expect(err).to.equal(null);
									expect(resp).to.equal(null);
									iam_lib._check_expiration = true;
									done();
								});
							}
						},
						{
							itStatement: 'should error on expired iam access token - test_id=uxrjvp',
							callFunction: () => {
								tools.stubs.request.callsArgWith(1, null, { body: JSON.stringify(iam_objects.iam_resp) });
								nodejsCache.get.returns(null);
								tools.stubs.verifyToken.restore();
								tools.stubs.getIAMPublicCertsHttp.restore();
							},
							expectBlock: (done) => {
								iam_lib.verifyToken(iam_objects.token1, (err, resp) => {
									expect(err.statusCode).to.equal(403);
									expect(err.error).to.equal('identity access/bearer token is expired');
									done();
								});
							}
						},
						{
							itStatement: 'should error on expired iam access token that had its expiration edited! - test_id=uommsg',
							callFunction: () => {
								nodejsCache.get.returns(null);
								tools.stubs.verifyToken.restore();
								tools.stubs.getIAMPublicCertsHttp.restore();
								tools.stubs.request.callsArgWith(1, null, { body: JSON.stringify(iam_objects.iam_resp) });
							},
							expectBlock: (done) => {
								const parts2 = iam_objects.token3.split('.');								// decode the token
								const tokenParts2 = [];
								for (let i in parts2) {
									const decoded = tools.misc.decodeb64(parts2[i]);
									try {
										tokenParts2.push(JSON.parse(decoded));
									} catch (e) { }
								}

								tokenParts2[1].exp = (Date.now() / 1000).toFixed(0);			// bump the date

								parts2[1] = tools.misc.b64(JSON.stringify(tokenParts2[1]));
								const editedToken = parts2.join('.');							// repackage the token

								iam_lib.verifyToken(editedToken, (err, resp) => {
									expect(err.statusCode).to.equal(401);
									expect(err.error).to.equal('identity access/bearer token is invalid');
									done();
								});
							}
						},
						{
							itStatement: 'should error on malformed iam access token - test_id=csyofy',
							callFunction: () => {
								tools.stubs.request.callsArgWith(1, null, { body: JSON.stringify(iam_objects.iam_resp) });
								nodejsCache.get.returns(null);
								tools.stubs.verifyToken.restore();
								tools.stubs.getIAMPublicCertsHttp.restore();
							},
							expectBlock: (done) => {
								const token = 'eyJraWQiOiIyMDDcyNCIsImFsZjU2In0-zPOjDd1yJMALji67WhYQxxJd0-sLtaae0_sSQnNt2_Do618Y9mlV--jjz9XIaVzgZW8LZs-';

								iam_lib.verifyToken(token, (err, resp) => {
									expect(err.statusCode).to.equal(400);
									expect(err.error).to.equal('identity access/bearer token is malformed');
									done();
								});
							}
						},
						{
							itStatement: 'should return an error or response - error sent to getIAMPublicCertsHttp stub test_id=oycdmx',
							callFunction: () => {
								tools.stubs.getIAMPublicCertsHttp.callsArgWith(1, {});
								tools.stubs.verifyToken.restore();
							},
							expectBlock: (done) => {
								iam_lib.verifyToken(iam_objects.jwt_access_token, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(err.error).to.equal('unable to get IAM cert from IAM to validate bearer token [2]');
									done();
								});
							}
						},
						{
							itStatement: 'should return an error or response - token has expired test_id=mjyfns',
							expectBlock: (done) => {
								tools.stubs.verifyToken.restore();
								iam_lib.verifyToken(iam_objects.jwt_access_token_expired, (err) => {
									expect(err.statusCode).to.equal(403);
									expect(err.error).to.equal('identity access/bearer token is expired');
									done();
								});
							}
						},
						{
							itStatement: 'should return an error or response - token has no kid test_id=juhjcw',
							expectBlock: (done) => {
								tools.stubs.verifyToken.restore();
								iam_lib.verifyToken(iam_objects.jwt_access_token_no_kid, (err) => {
									expect(err.statusCode).to.equal(400);
									expect(err.error).to.equal('identity access/bearer token is malformed');
									done();
								});
							}
						},
						{
							itStatement: 'should return an error or response - no token passed test_id=wxxqyr',
							expectBlock: (done) => {
								tools.stubs.verifyToken.restore();
								iam_lib.verifyToken(null, (err) => {
									expect(err.statusCode).to.equal(401);
									expect(err.error).to.equal('identity access/bearer token is missing');
									done();
								});
							}
						}
					]
				}
			]
		},

		// getPermittedActionsHttp
		{
			suiteDescribe: 'getPermittedActionsHttp',
			mainDescribe: 'Run getPermittedActionsHttp',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return no error or response - user is authorized test_id=ezthpv',
							callFunction: () => {
								sinon.stub(iam_lib, 'getAccessToken').callsArgWith(1, null, {});
								const body = JSON.stringify(
									{
										'responses': [{
											'requestId': 'MdnQDoOO',
											'status': '200',
											'attributes': null,
											'subjectId': {
												'userId': 'IBMid-310000JP5T'
											},
											'roleActions': [],
											'platformExtensions': {
												'roleActions': []
											},
											'error': null
										},
										{
											'requestId': 'TuSWHtkN',
											'status': '200',
											'attributes': null,
											'subjectId': {
												'userId': 'IBMid-310000JP5T'
											},
											'roleActions': [{
												'role': {
													'crn': 'crn:v1:bluemix:public:iam::::serviceRole:Manager',
													'displayName': 'Manager',
												},
												'actions': [{
													'action': 'blockchain.optools.view'
												}]
											}]
										}]
									}
								);
								tools.stubs.retry_req.callsArgWith(1, null, { statusCode: 200, body: body });
							},
							expectBlock: (done) => {
								iam_lib.getAccessToken.restore();
								const store_crn = JSON.parse(JSON.stringify(common.ev.CRN));
								common.ev.CRN = {};
								common.ev.CRN.instance_id = 'instance_id';
								iam_lib.getPermittedActionsHttp(null, (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify({ permitted_actions: ['blockchain.optools.view'] }));
									common.ev.CRN = JSON.parse(JSON.stringify(store_crn));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - error passed to getAccessToken stub test_id=yousxi',
							callFunction: () => {
								sinon.stub(iam_lib, 'getAccessToken').callsArgWith(1, {});
							},
							expectBlock: (done) => {

								iam_lib.getPermittedActionsHttp({}, (err) => {
									expect(err.statusCode).to.equal(500);
									expect(err.error).to.equal('problem getting access token');
									iam_lib.getAccessToken.restore();
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - not permitted is true test_id=kufsec',
							callFunction: () => {
								const body = JSON.stringify({
									responses: [
										{}
									]
								});
								tools.stubs.retry_req.callsArgWith(1, null, { statusCode: 200, body: body });
							},
							expectBlock: (done) => {
								const store_crn = JSON.parse(JSON.stringify(common.ev.CRN));
								common.ev.CRN = {};
								common.ev.CRN.instance_id = 'instance_id';
								iam_lib.getPermittedActionsHttp({}, (err, resp) => {
									expect(err.statusCode).to.equal(401);
									expect(err.error).to.equal('the user was not authorized for this action');
									expect(resp).to.equal(null);
									common.ev.CRN = JSON.parse(JSON.stringify(store_crn));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - error passed to request stub test_id=lunrjg',
							callFunction: () => {
								const body = JSON.stringify({
									responses: [
										{}
									]
								});
								sinon.stub(iam_lib, 'getAccessToken').callsArgWith(1, null, {});
								tools.stubs.retry_req.callsArgWith(1, { statusCode: 200, body: body });
							},
							expectBlock: (done) => {
								iam_lib.getPermittedActionsHttp(null, (err, resp) => {
									const store_crn = JSON.parse(JSON.stringify(common.ev.CRN));
									common.ev.CRN = {};
									common.ev.CRN.instance_id = 'instance_id';
									expect(err.statusCode).to.equal(500);
									expect(err.error).to.equal('problem authenticating user with IAM. check logs for details.');
									iam_lib.getAccessToken.restore();
									common.ev.CRN = JSON.parse(JSON.stringify(store_crn));
									done();
								});
							}
						},
						{
							itStatement: 'should return error - body is invalid test_id=ifkmbn',
							callFunction: () => {
								tools.stubs.retry_req.callsArgWith(1, null, { statusCode: 200, body: 'invalid' });
							},
							expectBlock: (done) => {
								const store_crn = JSON.parse(JSON.stringify(common.ev.CRN));
								common.ev.CRN = {};
								common.ev.CRN.instance_id = 'instance_id';
								iam_lib.getPermittedActionsHttp({}, (err, resp) => {
									expect(err.statusCode).to.equal(500);
									expect(err.error).to.equal('problem getting access token');
									common.ev.CRN = JSON.parse(JSON.stringify(store_crn));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error and message - 429 error sent to request stub inside "getPermittedActionsHttp" test_id=ekkzra',
							callFunction: () => {
								sinon.stub(iam_lib, 'getAccessToken').callsArgWith(1, null, {});
								tools.stubs.retry_req.callsArgWith(1, null, { statusCode: 429 });
							},
							expectBlock: (done) => {
								const store_crn = JSON.parse(JSON.stringify(common.ev.CRN));
								common.ev.CRN = {};
								common.ev.CRN.instance_id = 'instance_id';
								const opts = {
									url: 'http://localhost:3000',
									authorizations: [{ action: common.ev.STR.CREATE_ACTION, id: 'abcd' }],
									users_iam_token: iam_objects.users_iam_token,
									SKIP_CACHE: true,
								};
								iam_lib.getPermittedActionsHttp(opts, (err, resp) => {
									iam_lib.getAccessToken.restore();
									expect(err.statusCode).to.equal(429);
									expect(JSON.stringify(err)).to.equal(
										JSON.stringify({ 'statusCode': 429, 'error': 'problem authenticating user with IAM. check logs for details.' })
									);
									expect(resp).to.equal(undefined);
									common.ev.CRN = JSON.parse(JSON.stringify(store_crn));
									done();
								});
							}
						},
						{
							itStatement: 'should return an error and message - 400 error sent to request stub inside "getPermittedActionsHttp" test_id=xuxnri',
							callFunction: () => {
								sinon.stub(iam_lib, 'getAccessToken').callsArgWith(1, null, {});
								tools.stubs.retry_req.callsArgWith(1, null, { statusCode: 400, statusMessage: 'something is not right here' });
							},
							expectBlock: (done) => {
								const store_crn = JSON.parse(JSON.stringify(common.ev.CRN));
								common.ev.CRN = {};
								common.ev.CRN.instance_id = 'instance_id';
								const opts = {
									url: 'http://localhost:3000',
									authorizations: [{ action: common.ev.STR.CREATE_ACTION, id: 'abcd' }],
									users_iam_token: iam_objects.users_iam_token,
									SKIP_CACHE: true,
								};
								iam_lib.getPermittedActionsHttp(opts, (err, resp) => {
									iam_lib.getAccessToken.restore();
									expect(err.statusCode).to.equal(400);
									expect(JSON.stringify(err)).to.equal(
										JSON.stringify({ 'statusCode': 400, 'error': 'problem authenticating user with IAM. check logs for details.' })
									);
									expect(resp).to.equal(undefined);
									common.ev.CRN = JSON.parse(JSON.stringify(store_crn));
									done();
								});
							}
						}
					]
				}
			]
		},
		// write2cache
		{
			suiteDescribe: 'write2cache',
			mainDescribe: 'Run write2cache',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a message of success - stub passes params that satisfy conditions test_id=zgdbuz',
							expectBlock: (done) => {
								common.ev.IAM_CACHE_ENABLED = true;
								nodejsCache.set.returns('success');
								const key = 'test-key', value = 'test-value', expires = 20;
								iam_lib.write2cache(key, value, expires, (err, resp) => {
									expect(err).to.equal(null);
									expect(resp).to.equal(value);
									common.ev.IAM_CACHE_ENABLED = false;
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - key not passed test_id=uekrwa',
							expectBlock: (done) => {
								common.ev.IAM_CACHE_ENABLED = true;
								const key = null, value = 'test-value', expires = 20;
								iam_lib.write2cache(key, value, expires, (err, resp) => {
									expect(err).to.equal(500);
									expect(resp).to.equal('test-value');
									common.ev.IAM_CACHE_ENABLED = false;
									done();
								});
							}
						},
						{
							itStatement: 'should return an error - ev.IAM_CACHE_ENABLED is false test_id=mrpkur',
							expectBlock: (done) => {
								const key = null, value = 'test-value', expires = 20;
								iam_lib.write2cache(key, value, expires, (err, resp) => {
									expect(err).to.equal(null);
									expect(resp).to.equal('test-value');
									done();
								});
							}
						}
					]
				}
			]
		},
		// evict
		{
			suiteDescribe: 'evict',
			mainDescribe: 'Run evict',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a good response - ev.IAM_CACHE_ENABLED and nodejsCache.del passed a valid property test_id=npseds',
							callFunction: () => {
								nodejsCache.del.returns({ prop: 'some property' });
							},
							expectBlock: (done) => {
								common.ev.IAM_CACHE_ENABLED = true;
								iam_lib.evict('key', (err, resp) => {
									expect(err).to.equal(null);
									expect(JSON.stringify(resp)).to.equal(JSON.stringify({ prop: 'some property' }));
									common.ev.IAM_CACHE_ENABLED = false;
									done();
								});
							}
						},
						{
							itStatement: 'should return null for the err and resp - ev.IAM_CACHE_ENABLED is false test_id=eswikw',
							callFunction: () => {
								nodejsCache.del.returns(null);
							},
							expectBlock: (done) => {
								iam_lib.evict('key', (err, resp) => {
									expect(err).to.equal(null);
									expect(resp).to.equal(null);
									done();
								});
							}
						}
					]
				}
			]
		},
		// flush_cache
		{
			suiteDescribe: 'flush_cache',
			mainDescribe: 'Run flush_cache',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should call "flushAll" - ev.IAM_CACHE_ENABLED is true test_id=fjzgxq',
							expectBlock: (done) => {
								common.ev.IAM_CACHE_ENABLED = true;
								iam_lib.flush_cache();
								expect(nodejsCache.flushAll.called).to.be.true;
								common.ev.IAM_CACHE_ENABLED = false;
								nodejsCache.flushAll.resetHistory();
								done();
							}
						},
						{
							itStatement: 'should not call "flushAll" - ev.IAM_CACHE_ENABLED is false test_id=kwcbdy',
							expectBlock: (done) => {
								iam_lib.flush_cache();
								expect(nodejsCache.flushAll.called).to.be.false;
								nodejsCache.flushAll.resetHistory();
								done();
							}
						}
					]
				}
			]
		},
		// get_stats
		{
			suiteDescribe: 'get_stats',
			mainDescribe: 'Run get_stats',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should call "getStats" - ev.IAM_CACHE_ENABLED is true test_id=kkkqju',
							expectBlock: (done) => {
								common.ev.IAM_CACHE_ENABLED = true;
								const stats = iam_lib.get_stats();
								expect(stats).to.equal(undefined);
								expect(nodejsCache.getStats.called).to.be.true;
								common.ev.IAM_CACHE_ENABLED = false;
								nodejsCache.getStats.resetHistory();
								done();
							}
						},
						{
							itStatement: 'should not call "getStats" - ev.IAM_CACHE_ENABLED is false test_id=yapkfs',
							expectBlock: (done) => {
								const stats = iam_lib.get_stats();
								expect(JSON.stringify(stats)).to.equal(JSON.stringify(null));
								expect(nodejsCache.flushAll.called).to.be.false;
								nodejsCache.getStats.resetHistory();
								done();
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
