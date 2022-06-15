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
// validation_lib.test.js - Test validation_lib functions
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const component_objects = require('../../docs/component_api_objects.json');
const tools = common.tools;
const myutils = require('../../testing-lib/test-middleware');
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);

const createStubs = () => {
	return {
		readFileSync: sinon.stub(tools.fs, 'readFileSync')
	};
};

describe('validation_lib.js', () => {
	beforeEach(() => {
		tools.stubs = createStubs();
	});
	afterEach(() => {
		myutils.restoreStubs(tools.stubs);
	});
	const testCollection = [
		// resource_validation
		{
			suiteDescribe: 'resource_validation',
			mainDescribe: 'Run resource_validation',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return no errors test_id=rmicdj',
							expectBlock: (done) => {
								const req = {
									body: JSON.parse(JSON.stringify(component_objects.get_single_node_response_body_b))
								};
								const errors = tools.validate.resource_validation(req);
								expect(errors).to.deep.equal([]);
								return done();
							}
						},
						{
							itStatement: 'should return no errors - "limits" removed test_id=cbbbkb',
							expectBlock: (done) => {
								const req = {
									body: JSON.parse(JSON.stringify(component_objects.get_single_node_response_body_b))
								};
								delete req.body.resources.ca.limits;
								req.body.resources.ca.requests.bad_field = '1023Mb';
								const errors = tools.validate.resource_validation(req);
								expect(errors).to.deep.equal([]);
								return done();
							}
						},
						{
							itStatement: 'should return an error - requests exceed limits test_id=cmqzod',
							expectBlock: (done) => {
								const req = {
									body: JSON.parse(JSON.stringify(component_objects.get_single_node_response_body_b))
								};
								req.body.resources.ca.requests.memory = '5023M';
								const errors = tools.validate.resource_validation(req);
								expect(errors).to.deep.equal([{
									key: 'invalid_requests_for_limits',
									symbols:
									{
										'$LIMITS': '3.8 GiB',
										'$PROPERTY_NAME': 'resources.ca.requests.memory',
										'$REQUESTS': '4.7 GiB'
									}
								}]);
								return done();
							}
						}
					]
				}
			]
		},
		{
			suiteDescribe: 'request_inline',
			mainDescribe: 'Run request_inline',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should conform input to correct case test_id=wjychm',
							expectBlock: (done) => {
								const req = {
									_validate_path: '/ak/api/v2/kubernetes/components/fabric-ca',
									method: 'POST',
									body: {
										display_name: 'My CA attrs',
										config_override: {
											ca: {
												reGistry: {
													maxEnrollments: -1,
													identities: [
														{
															nAmE: 'admin',
															PASS: 'admin',
															type: 'client',
															affiliation: '',
															attrs: {
																'HF.REGISTRAR.ROLES': '*',
																'hf.registrar.delegateroles': '*',
																'hf.Revoker': true,
																'hf.IntermediateCA': true,
																'hf.GenCRL': true,
																'hf.Registrar.Attributes': '*',
																'hf.AffiliationMgr': true
															}
														}
													]
												}
											}
										},
										resources: {
											ca: {
												requests: {
													cpu: '101m',
													memory: '201Mi'
												}
											}
										}
									}
								};
								const expect_lc_keys = {
									display_name: 'My CA attrs',
									config_override: {
										ca: {
											registry: {
												maxenrollments: -1,
												identities: [{
													name: 'admin',
													pass: 'admin',
													type: 'client',
													affiliation: '',
													attrs: {
														'hf.Registrar.Roles': '*',
														'hf.Registrar.DelegateRoles': '*',
														'hf.Revoker': true,
														'hf.IntermediateCA': true,
														'hf.GenCRL': true,
														'hf.Registrar.Attributes': '*',
														'hf.AffiliationMgr': true
													}
												}]
											}
										}
									},
									resources: {
										ca: {
											requests: {
												cpu: '101m',
												memory: '201Mi'
											}
										}
									}
								};
								const errors = tools.validate.request_inline(req, null);
								expect(errors).to.deep.equal(null);
								expect(req.body).to.deep.equal(expect_lc_keys);
								return done();
							}
						}
					]
				}
			]
		},

		{
			suiteDescribe: 'pick_ver',
			mainDescribe: 'Run pick_ver',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should pick version v2 route test_id=qsbeje',
							expectBlock: (done) => {
								let req = { path: '/ak/api/v2/kubernetes/components/fabric-ca' };
								expect(tools.validate.pick_ver(req)).to.equal('v2');

								req = { path: '/api/v2/kubernetes/components/fabric-ca' };
								expect(tools.validate.pick_ver(req)).to.equal('v2');

								req = { path: '/api/saas/v2/kubernetes/components/fabric-ca' };
								expect(tools.validate.pick_ver(req)).to.equal('v2');
								return done();
							}
						},
						{
							itStatement: 'should pick version v3 route test_id=pafiux',
							expectBlock: (done) => {
								let req = { path: '/ak/api/v3/kubernetes/components/fabric-ca' };
								expect(tools.validate.pick_ver(req)).to.equal('v3');

								req = { path: '/api/v3/kubernetes/components/fabric-ca' };
								expect(tools.validate.pick_ver(req)).to.equal('v3');

								req = { path: '/api/saas/v3/kubernetes/components/fabric-ca' };
								expect(tools.validate.pick_ver(req)).to.equal('v3');
								return done();
							}
						},
						{
							itStatement: 'should pick version v3 route b/c default test_id=vkocan',
							expectBlock: (done) => {
								let req = { path: '/ak/api/v9/kubernetes/components/fabric-ca' };
								expect(tools.validate.pick_ver(req)).to.equal('v3');

								req = { path: '/api/v9/kubernetes/components/fabric-ca' };
								expect(tools.validate.pick_ver(req)).to.equal('v3');

								req = { path: '/api/saas/v9/kubernetes/components/fabric-ca' };
								expect(tools.validate.pick_ver(req)).to.equal('v3');
								return done();
							}
						},
					]
				}
			]
		},

		{
			suiteDescribe: 'pick_openapi_file',
			mainDescribe: 'Run pick_openapi_file',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should pick open api v2 test_id=iuhpco',
							expectBlock: (done) => {
								let req = { _validate_path: '/ak/api/v2/kubernetes/components/fabric-ca' };
								const open_api = tools.validate.pick_openapi_file(req);
								expect(open_api.version[0]).to.equal('2');
								return done();
							}
						},
						{
							itStatement: 'should pick open api v3 test_id=mewwro',
							expectBlock: (done) => {
								let req = { _validate_path: '/ak/api/v3/kubernetes/components/fabric-ca' };
								const open_api = tools.validate.pick_openapi_file(req);
								expect(open_api.version[0]).to.equal('3');
								return done();
							}
						},
						{
							itStatement: 'should pick open api v3 b/c default test_id=yfktig',
							expectBlock: (done) => {
								let req = { _validate_path: '/ak/api/v9/kubernetes/components/fabric-ca' };
								const open_api = tools.validate.pick_openapi_file(req);
								expect(open_api.version[0]).to.equal('3');
								return done();
							}
						},
					]
				}
			]
		},
	];
	// call main test function to run this test collection
	common.mainTestFunction(testCollection, path_to_current_file);
});
