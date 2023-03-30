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
// ot_misc_test.js - test for the ot_misc lib
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const tools = common.tools;
const ot_misc = require('../../../libs/ot_misc.js')(common.logger, tools);
const postman_collection = require('../../../json_docs/OpTools.master.postman_collection.json');
const myutils = require('../../testing-lib/test-middleware');
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);
const objects = require('../../docs/ot_misc.json');

const createStubs = () => {
	return {
		writeFileSync: sinon.stub(tools.fs, 'writeFileSync')
	};
};

describe('ot_misc.js', () => {
	before((done) => {
		tools.stubs = createStubs();
		done();
	});
	after((done) => {
		myutils.restoreStubs(tools.stubs);
		done();
	});
	const testCollection = [
		// gen_api_key
		{
			suiteDescribe: 'gen_api_key',
			mainDescribe: 'Run gen_api_key',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return key and secret  test_id=mxzono',
							expectBlock: (done) => {
								ot_misc.gen_api_key('abcdef', (err, resp) => {
									expect(err).to.equal(null);
									expect(resp.api.key).to.equal('abcdef');
									expect(resp.api.secret).to.not.equal(null);
									done();
								});
							}
						}
					]
				}
			]
		},
		// isIbmEmail
		{
			suiteDescribe: 'isIbmEmail',
			mainDescribe: 'Run isIbmEmail',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return true - is an IBM email - @us.ibm.com  test_id=uwwgoa',
							expectBlock: (done) => {
								const isIbmEmail = ot_misc.isIbmEmail('someone@us.ibm.com');
								expect(isIbmEmail).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should return true - is an IBM email - @ibm.com  test_id=wikavu',
							expectBlock: (done) => {
								const isIbmEmail = ot_misc.isIbmEmail('someone@ibm.com');
								expect(isIbmEmail).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should return false - is not an IBM email  test_id=nrhnzk',
							expectBlock: (done) => {
								const isIbmEmail = ot_misc.isIbmEmail('someone@us.bmi.com');
								expect(isIbmEmail).to.equal(false);
								done();
							}
						}
					]
				}
			]
		},
		// has_delete_flag
		{
			suiteDescribe: 'has_delete_flag',
			mainDescribe: 'Run has_delete_flag',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return true - object has delete flag - obj.deleted  test_id=jbgewk',
							expectBlock: (done) => {
								const obj = { deleted: true };
								const hasDeleteFlag = ot_misc.has_delete_flag(obj);
								expect(hasDeleteFlag).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should return true - object has delete flag - obj.DELETED  test_id=rjyiab',
							expectBlock: (done) => {
								const obj = { DELETED: true };
								const hasDeleteFlag = ot_misc.has_delete_flag(obj);
								expect(hasDeleteFlag).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should return false - object does not have delete flag  test_id=ettzrz',
							expectBlock: (done) => {
								const obj = {};
								const hasDeleteFlag = ot_misc.has_delete_flag(obj);
								expect(hasDeleteFlag).to.equal(false);
								done();
							}
						}
					]
				}
			]
		},
		// is_disabled
		{
			suiteDescribe: 'is_disabled',
			mainDescribe: 'Run is_disabled',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return true - no object passed  test_id=lkpbws',
							expectBlock: (done) => {
								const isDisabled = ot_misc.is_disabled();
								expect(isDisabled).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should return true - object has disabled flag - obj.disabled  test_id=qxghjp',
							expectBlock: (done) => {
								const obj = { disabled: true };
								const hasDeleteFlag = ot_misc.is_disabled(obj);
								expect(hasDeleteFlag).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should return true - object has disabled flag - obj.DISABLED  test_id=jvneux',
							expectBlock: (done) => {
								const obj = { DISABLED: true };
								const hasDeleteFlag = ot_misc.is_disabled(obj);
								expect(hasDeleteFlag).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should return false - object does not have disabled flag  test_id=gnmlri',
							expectBlock: (done) => {
								const obj = {};
								const hasDeleteFlag = ot_misc.is_disabled(obj);
								expect(hasDeleteFlag).to.equal(false);
								done();
							}
						}
					]
				}
			]
		},
		// restart_athena
		{
			suiteDescribe: 'restart_athena',
			mainDescribe: 'Run restart_athena',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should show that stub was called  test_id=ckmdma',
							expectBlock: (done) => {
								ot_misc.restart_athena('some_uuid');
								expect(tools.stubs.writeFileSync.called).to.equal(true);
								done();
							}
						}
					]
				}
			]
		},
		// get_code
		{
			suiteDescribe: 'get_code',
			mainDescribe: 'Run get_code',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return status code of 200  test_id=fosmhw',
							expectBlock: (done) => {
								const obj = { statusCode: 200 };
								const code = ot_misc.get_code(obj);
								expect(code).to.equal(200);
								done();
							}
						},
						{
							itStatement: 'should return status code of 500  test_id=gxmwjd',
							expectBlock: (done) => {
								const obj = {};
								const code = ot_misc.get_code(obj);
								expect(code).to.equal(500);
								done();
							}
						}
					]
				}
			]
		},
		// is_error_code
		{
			suiteDescribe: 'is_error_code',
			mainDescribe: 'Run is_error_code',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return false - number passed is not an error code  test_id=nlxsrg',
							expectBlock: (done) => {
								const isErrorCode = ot_misc.is_error_code('200');
								expect(isErrorCode).to.equal(false);
								done();
							}
						},
						{
							itStatement: 'should return true - number passed in is an error code  test_id=ebsuio',
							expectBlock: (done) => {
								const isErrorCode = ot_misc.is_error_code('500');
								expect(isErrorCode).to.equal(true);
								done();
							}
						}
					]
				}
			]
		},
		// formatResponse
		{
			suiteDescribe: 'formatResponse',
			mainDescribe: 'Run formatResponse',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the formatted response - no error code  test_id=pszeio',
							expectBlock: (done) => {
								const body = JSON.stringify({ prop1: 'prop1' });
								const resp = {
									statusCode: 200,
									body: body
								};
								const response = ot_misc.formatResponse(resp);
								expect(JSON.stringify(response)).to.equal(JSON.stringify({ prop1: 'prop1' }));
								done();
							}
						},
						{
							itStatement: 'should return the formatted response - error code  test_id=ofzxpm',
							expectBlock: (done) => {
								const body = JSON.stringify({ prop1: 'prop1' });
								const resp = {
									statusCode: 500,
									body: body
								};
								const response = ot_misc.formatResponse(resp);
								expect(JSON.stringify(tools.misc.sortItOut(response))).to.equal(
									JSON.stringify(tools.misc.sortItOut({ prop1: 'prop1', statusCode: 500 }))
								);
								done();
							}
						},
						{
							itStatement: 'should return an error - undefined sent into function when a string was expected test_id=dfsgip',
							expectBlock: (done) => {
								const resp = {
									statusCode: 200,
									body: undefined
								};
								const response = ot_misc.formatResponse(resp);
								expect(JSON.stringify(response)).to.equal(JSON.stringify({}));
								done();
							}
						},
					]
				}
			]
		},
		// validateUrl
		{
			suiteDescribe: 'validateUrl',
			mainDescribe: 'Run validateUrl',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return true - ip is in safe list test_id=gtvvoj',
							expectBlock: (done) => {
								const list = ['169.51.206.63:31040'];
								expect(ot_misc.validateUrl('https://169.51.206.63:31040/', list)).to.equal(true);
								expect(ot_misc.validateUrl('https://169.51.206.63:31040', list)).to.equal(true);
								expect(ot_misc.validateUrl('169.51.206.63:31040', list)).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should return false - ip is NOT in safe list test_id=ovzapx',
							expectBlock: (done) => {
								const list = ['169.51.206.63:31040'];
								expect(ot_misc.validateUrl('https://169.51.206.99:31040', list)).to.equal(false);
								expect(ot_misc.validateUrl('https://169.51.206.63:31041', list)).to.equal(false);
								done();
							}
						},
						{
							itStatement: 'should return true - url is in safe list test_id=plfimy',
							expectBlock: (done) => {
								const list = ['n26da6a-ca1-ca.us-south.containers.appdomain.cloud:443'];
								expect(ot_misc.validateUrl('https://n26da6a-ca1-ca.us-south.containers.appdomain.cloud:443/stuff', list)).to.equal(true);
								expect(ot_misc.validateUrl('https://n26da6a-ca1-ca.us-south.containers.appdomain.cloud', list)).to.equal(true);
								expect(ot_misc.validateUrl('n26da6a-ca1-ca.us-south.containers.appdomain.cloud', list)).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should return false - url is NOT in safe list test_id=iscaye',
							expectBlock: (done) => {
								const list = ['n26da6a-ca1-ca.us-south.containers.appdomain.cloud:443'];
								expect(ot_misc.validateUrl('https://xxx-ca1-ca.us-south.containers.appdomain.cloud:443/stuff', list)).to.equal(false);
								expect(ot_misc.validateUrl('https://n26da6a-ca1-ca.us-south.containers.appdomain.cloud:8080', list)).to.equal(false);
								expect(ot_misc.validateUrl('http://n26da6a-ca1-ca.us-south.containers.appdomain.cloud', list)).to.equal(false);
								done();
							}
						},
					]
				}
			]
		},
		// use_tls_webserver
		{
			suiteDescribe: 'use_tls_webserver',
			mainDescribe: 'Run use_tls_webserver',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return true - host url is "https" test_id=igwldv',
							expectBlock: (done) => {
								const settings = {
									HOST_URL: 'https://i.am.valid'
								};
								const response = ot_misc.use_tls_webserver(settings);
								expect(response).to.equal(true);
								done();
							}
						}
					]
				}
			]
		},
		// build_configtxlator_url
		{
			suiteDescribe: 'build_configtxlator_url',
			mainDescribe: 'Run build_configtxlator_url',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a formatted url - url in settings is "http" test_id=uzaoub',
							expectBlock: (done) => {
								const settings = {
									HOST_URL: 'https://i.am.a.valid.host.url',
									CONFIGTXLATOR_URL_ORIGINAL: 'http://i.am.a.valid.configtxlator_url'
								};
								const response = ot_misc.build_configtxlator_url(settings);
								expect(response).to.equal('https://i.am.a.valid.host.url:443/configtxlator');
								done();
							}
						}
					]
				}
			]
		},
		// parseCertificate
		{
			suiteDescribe: 'parseCertificate',
			mainDescribe: 'Run parseCertificate',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return "null" - no "base64_pem_cert" passed in caused an exception to be thrown and caught test_id=qvbfji',
							expectBlock: (done) => {
								const response = ot_misc.parseCertificate();
								expect(response).to.equal(null);
								done();
							}
						},
						{
							itStatement: 'should return parsed certificate given b64 pem test_id=ndoxki',
							expectBlock: (done) => {
								const response = ot_misc.parseCertificate(objects.certAsB64);
								delete response.time_left;
								expect(response).to.deep.equal(objects.parsed1);
								done();
							}
						},
						{
							itStatement: 'should return parsed certificate given pem test_id=tvewom',
							expectBlock: (done) => {
								const response = ot_misc.parseCertificate(tools.misc.decodeb64(objects.certAsB64));
								delete response.time_left;
								expect(response).to.deep.equal(objects.parsed1);
								done();
							}
						},
						{
							itStatement: 'should return parsed certificate w/ subject alt names test_id=zdgsim',
							expectBlock: (done) => {
								const response = ot_misc.parseCertificate(objects.certWithSubjectAltNames);
								delete response.time_left;
								expect(response).to.deep.equal(objects.parsed2);
								done();
							}
						},
						{
							itStatement: 'should return null b/c its a private key test_id=hvfffd',
							expectBlock: (done) => {
								const response = ot_misc.parseCertificate(objects.prvKeyAsB64);
								expect(response).to.deep.equal(null);
								done();
							}
						}
					]
				}
			]
		},
		// parseProxyUrl
		{
			suiteDescribe: 'parseProxyUrl',
			mainDescribe: 'Run parseProxyUrl',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a properly parsed grpcwp url  test_id=rbofdr',
							expectBlock: (done) => {
								const paths = ot_misc.parseProxyUrl('/grpcwp/https://example.com/', { default_proto: 'http', prefix: '/grpcwp/' });
								expect(JSON.stringify(tools.misc.sortItOut(paths))).to.equal(
									JSON.stringify(tools.misc.sortItOut({ base2use: 'https://example.com', path2use: '/' }))
								);
								done();
							}
						}, {
							itStatement: 'should return a properly parsed grpcwp url test_id=bdhttx',
							expectBlock: (done) => {
								const paths = ot_misc.parseProxyUrl(
									'/grpcwp/http%3A%2F%2Fistillneedthisvm.rtp.raleigh.ibm.com%3A8081/test', { default_proto: 'http', prefix: '/grpcwp/' }
								);
								expect(JSON.stringify(tools.misc.sortItOut(paths))).to.equal(
									JSON.stringify(tools.misc.sortItOut({ base2use: 'http://istillneedthisvm.rtp.raleigh.ibm.com:8081', path2use: '/test' }))
								);
								done();
							}
						}
					]
				}
			]
		},
		// build_postman_collection
		{
			suiteDescribe: 'build_postman_collection',
			mainDescribe: 'Run build_postman_collection',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the postman collection  test_id=xzkqop',
							expectBlock: (done) => {
								const opts = {
									url: 'https://build_postman_collection.com:443',
									auth_type: 'basic',
									input_collection_file: {},
									username: 'admin',
									password: 'secret',
								};
								tools.stubs.readFileSync = sinon.stub(tools.fs, 'readFileSync').returns(JSON.stringify(postman_collection));
								const collection = ot_misc.build_postman_collection(opts);
								expect(collection.info.schema).to.equal('https://schema.getpostman.com/json/collection/v2.1.0/collection.json');
								tools.stubs.readFileSync.restore();
								done();
							}
						}
					]
				}
			]
		},
		// is_fabric_v2
		{
			suiteDescribe: 'is_fabric_v2',
			mainDescribe: 'Run is_fabric_v2',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should match fabric v2.0.0 test_id=ummtqm',
							expectBlock: (done) => {
								const comp = { version: 'v2.0.0' };
								expect(ot_misc.is_fabric_v2(comp)).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should match fabric 2.0.0 test_id=zvmepp',
							expectBlock: (done) => {
								const comp = { version: '2.0.0' };
								expect(ot_misc.is_fabric_v2(comp)).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should match fabric 2.3.1 test_id=uvstwu',
							expectBlock: (done) => {
								const comp = { version: '2.3.1' };
								expect(ot_misc.is_fabric_v2(comp)).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should match fabric 2.111.333 test_id=uvstwu',
							expectBlock: (done) => {
								const comp = { version: '2.111.333' };
								expect(ot_misc.is_fabric_v2(comp)).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should not match fabric 1.4.5 test_id=pjexuz',
							expectBlock: (done) => {
								const comp = { version: '1.4.5' };
								expect(ot_misc.is_fabric_v2(comp)).to.equal(false);
								done();
							}
						},
						{
							itStatement: 'should not match fabric v1.4.5 test_id=htqooo',
							expectBlock: (done) => {
								const comp = { version: 'v1.4.5' };
								expect(ot_misc.is_fabric_v2(comp)).to.equal(false);
								done();
							}
						},
						{
							itStatement: 'should not match bad input test_id=oxtzjw',
							expectBlock: (done) => {
								const comp = { invalid: true };
								expect(ot_misc.is_fabric_v2(comp)).to.equal(null);
								done();
							}
						}
					]
				}
			]
		},

		// open_server
		{
			suiteDescribe: 'open_server',
			mainDescribe: 'Run open_server',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should set server as open - test_id=lrnudn',
							expectBlock: (done) => {
								ot_misc.open_server();
								expect(ot_misc.server_is_closed()).to.equal(false);
								done();
							}
						}
					]
				}
			]
		},

		// close_server
		{
			suiteDescribe: 'open_server',
			mainDescribe: 'Run open_server',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should set server as closed - test_id=ovshpn',
							expectBlock: (done) => {
								ot_misc.close_server();
								expect(ot_misc.server_is_closed()).to.equal(true);
								done();
							}
						}
					]
				}
			]
		},

		// build swagger id
		{
			suiteDescribe: 'build_swagger_id',
			mainDescribe: 'Run build_swagger_id',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should build correct swagger doc id test_id=sqetsv',
							expectBlock: (done) => {
								const ver = '2.5.0';
								const swagger = {
									info: {
										version: ver
									}
								};
								expect(ot_misc.build_swagger_id(swagger)).to.equal('01_validation_ibp_openapi_' + ver);
								done();
							}
						},
						{
							itStatement: 'should build null swagger doc id test_id=rvyioy',
							expectBlock: (done) => {
								const swagger = {
									info: {
										version: null
									}
								};
								expect(ot_misc.build_swagger_id(swagger)).to.equal(null);
								done();
							}
						},
						{
							itStatement: 'should build null swagger doc id test_id=aezqmv',
							expectBlock: (done) => {
								const swagger = {};
								expect(ot_misc.build_swagger_id(swagger)).to.equal(null);
								done();
							}
						}
					]
				}
			]
		},

		// get the api version in the route/path
		{
			suiteDescribe: 'get_api_version',
			mainDescribe: 'Run get_api_version',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should pull out api version from v2 saas a route test_id=uscqth',
							expectBlock: (done) => {
								const ver = 'v2';
								expect(ot_misc.get_api_version({ path: '/api/' + ver + '/components' })).to.equal(ver);
								done();
							}
						},
						{
							itStatement: 'should pull out api version from v2 saas b route test_id=bjsraw',
							expectBlock: (done) => {
								const ver = 'v2';
								expect(ot_misc.get_api_version({ path: '/api/saas/' + ver + '/components' })).to.equal(ver);
								done();
							}
						},
						{
							itStatement: 'should pull out api version from v2 ak route test_id=vmxgak',
							expectBlock: (done) => {
								const ver = 'v2';
								expect(ot_misc.get_api_version({ path: '/ak/api/' + ver + '/components' })).to.equal(ver);
								done();
							}
						},
						{
							itStatement: 'should pull out api version from v1 ak route test_id=rhlrjb',
							expectBlock: (done) => {
								const ver = 'v1';
								expect(ot_misc.get_api_version({ path: '/ak/api/' + ver + '/components' })).to.equal(ver);
								done();
							}
						},
						{
							itStatement: 'should pull out api version from v10 ak route test_id=zqjacf',
							expectBlock: (done) => {
								const ver = 'v10';
								expect(ot_misc.get_api_version({ path: '/ak/api/' + ver + '/components' })).to.equal(ver);
								done();
							}
						},
					]
				}
			]
		},

		// detect v2+ routes
		{
			suiteDescribe: 'is_v2plus_route',
			mainDescribe: 'Run is_v2plus_route',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should detect v1 route as not v2+ test_id=zatnmm+',
							expectBlock: (done) => {
								expect(ot_misc.is_v2plus_route({ path: '/api/v1/components' })).to.equal(false);
								done();
							}
						},
						{
							itStatement: 'should detect v2 route as v2+ test_id=ioycie+',
							expectBlock: (done) => {
								expect(ot_misc.is_v2plus_route({ path: '/api/v2/components' })).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should detect v3 route as v2+ test_id=qdgntm+',
							expectBlock: (done) => {
								expect(ot_misc.is_v2plus_route({ path: '/api/v3/components' })).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should detect v10 route as v2+ test_id=rneuaq+',
							expectBlock: (done) => {
								expect(ot_misc.is_v2plus_route({ path: '/api/v10/components' })).to.equal(true);
								done();
							}
						},
					]
				}
			]
		},
		// detect v3+ routes
		{
			suiteDescribe: 'is_v3plus_route',
			mainDescribe: 'Run is_v3plus_route',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should detect v1 route as not v3+ test_id=yfupqf+',
							expectBlock: (done) => {
								expect(ot_misc.is_v3plus_route({ path: '/api/v1/components' })).to.equal(false);
								done();
							}
						},
						{
							itStatement: 'should detect v2 route as not v3+ test_id=qcvmko+',
							expectBlock: (done) => {
								expect(ot_misc.is_v3plus_route({ path: '/api/v2/components' })).to.equal(false);
								done();
							}
						},
						{
							itStatement: 'should detect v2 route as v3+ test_id=kmaiou+',
							expectBlock: (done) => {
								expect(ot_misc.is_v2plus_route({ path: '/api/v3/components' })).to.equal(true);
								done();
							}
						},
					]
				}
			]
		},

		// parse_versions
		{
			suiteDescribe: 'parse_versions',
			mainDescribe: 'Run parse_versions',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should find version in package.json test_id=jvmfskw',
							expectBlock: (done) => {
								const versions = ot_misc.parse_versions();
								let athena_package = null;
								try {
									athena_package = tools.fs.readFileSync(tools.path.join(__dirname, '../../../package.json'));
									athena_package = JSON.parse(athena_package);
								} catch (e) { }
								expect(versions).to.not.equal(null);
								expect(versions.tag).to.equal(athena_package.version);
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
