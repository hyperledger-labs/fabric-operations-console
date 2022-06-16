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
// comp_formatting_lib.test.js - Test component_lib functions
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const myutils = require('../../testing-lib/test-middleware');
const tools = common.tools;
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);
const comp_fmt_lib = require('../../../libs/comp_formatting_lib.js')(common.logger, common.ev, tools);

const createStubs = () => {
	return {

	};
};

describe('comp_formatting_lib.js', () => {
	beforeEach(() => {
		tools.stubs = createStubs();
	});
	afterEach(() => {
		myutils.restoreStubs(tools.stubs);
	});
	const testCollection = [
		{
			suiteDescribe: 'testing stuff',
			mainDescribe: '',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'resources test (couch db on v3 api) -',
							callFunction: () => { },
							expectBlock: (done) => {
								const incoming_req = {
									path: '/api/v3/components/fabric-peer',
									body: {
										id: 'component',
										statedb: 'couchdb',
										type: 'fabric-peer',
										resources: {
											couchdb: {					// <--- here
												requests: {
													cpu: '100m',
													memory: '200MiB',	// MiB should become Mi
												}
											},
											peer: {
												requests: {
													cpu: '300m',
													memory: '400Mi',	// should stay as Mi
												}
											}
										},
										storage: {
											statedb: {
												size: '500G',			// should stay as G
												class: 'mine'			// should be in resp as is
											}
										}
									}
								};
								const output_body = {
									dep_component_id: 'component',
									parameters: {},
									statedb: 'couchdb',
									resources: {
										couchdb: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											},
										},
										dind: {
											limits: {
												cpu: '500m',
												memory: '1000Mi'
											},
											requests: {
												cpu: '500m',
												memory: '1000Mi'
											}
										},
										fluentd: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											}
										},
										peer: {
											limits: {
												cpu: '300m',
												memory: '400Mi'
											},
											requests: {
												cpu: '300m',
												memory: '400Mi'
											}
										},
										proxy: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											}
										}
									},
									storage: {
										peer: {
											size: '100Gi',
										},
										statedb: {
											size: '500G',
											class: 'mine'
										}
									},
									type: 'fabric-peer'
								};

								const dep_body = comp_fmt_lib.fmt_body_athena_to_dep(incoming_req, null);
								expect(dep_body).to.deep.equal(output_body);
								done();
							}
						},
						{
							itStatement: 'resources test (level db on v3 api) -',
							callFunction: () => { },
							expectBlock: (done) => {
								const incoming_req = {
									path: '/api/v3/components/fabric-peer',
									body: {
										id: 'component',
										statedb: 'leveldb',
										type: 'fabric-peer',
										resources: {
											leveldb: {					// <--- here
												requests: {
													cpu: '100m',
													memory: '200MiB',	// MiB should become Mi
												}
											},
											peer: {
												requests: {
													cpu: '300m',
													memory: '400Mi',	// should stay as Mi
												}
											}
										},
										storage: {
											statedb: {
												size: '500G',			// should stay as G
												class: 'mine'			// should be in resp as is
											}
										}
									}
								};
								const output_body = {
									dep_component_id: 'component',
									parameters: {},
									statedb: 'leveldb',
									resources: {
										leveldb: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											},
										},
										dind: {
											limits: {
												cpu: '500m',
												memory: '1000Mi'
											},
											requests: {
												cpu: '500m',
												memory: '1000Mi'
											}
										},
										fluentd: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											}
										},
										peer: {
											limits: {
												cpu: '300m',
												memory: '400Mi'
											},
											requests: {
												cpu: '300m',
												memory: '400Mi'
											}
										},
										proxy: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											}
										}
									},
									storage: {
										peer: {
											size: '100Gi',
										},
										statedb: {
											size: '500G',
											class: 'mine'
										}
									},
									type: 'fabric-peer'
								};

								const dep_body = comp_fmt_lib.fmt_body_athena_to_dep(incoming_req, null);
								expect(dep_body).to.deep.equal(output_body);
								done();
							}
						},
						{
							itStatement: 'resources test (state db on v3 api) - test_id=asdf',
							callFunction: () => { },
							expectBlock: (done) => {
								const incoming_req = {
									path: '/api/v3/components/fabric-peer',
									body: {
										id: 'component',
										statedb: 'couchdb',
										type: 'fabric-peer',
										resources: {
											statedb: {					// <--- here
												requests: {
													cpu: '100m',
													memory: '200MiB',	// MiB should become Mi
												}
											},
											peer: {
												requests: {
													cpu: '300m',
													memory: '400Mi',	// should stay as Mi
												}
											}
										},
										storage: {
											statedb: {
												size: '500G',			// should stay as G
												class: 'mine'			// should be in resp as is
											}
										}
									}
								};
								const output_body = {
									dep_component_id: 'component',
									parameters: {},
									statedb: 'couchdb',
									resources: {
										couchdb: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											},
										},
										dind: {
											limits: {
												cpu: '500m',
												memory: '1000Mi'
											},
											requests: {
												cpu: '500m',
												memory: '1000Mi'
											}
										},
										fluentd: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											}
										},
										peer: {
											limits: {
												cpu: '300m',
												memory: '400Mi'
											},
											requests: {
												cpu: '300m',
												memory: '400Mi'
											}
										},
										proxy: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											}
										}
									},
									storage: {
										peer: {
											size: '100Gi',
										},
										statedb: {
											size: '500G',
											class: 'mine'
										}
									},
									type: 'fabric-peer'
								};

								const dep_body = comp_fmt_lib.fmt_body_athena_to_dep(incoming_req, null);
								expect(dep_body).to.deep.equal(output_body);
								done();
							}
						},
						{
							itStatement: 'storage test (storage.statedb) -',
							callFunction: () => { },
							expectBlock: (done) => {
								const incoming_req = {
									path: '/api/v3/components/fabric-peer',
									body: {
										id: 'component',
										statedb: 'couchdb',
										type: 'fabric-peer',
										resources: {
											couchdb: {
												requests: {
													cpu: '100m',
													memory: '200Mi'
												}
											},
											peer: {
												requests: {
													cpu: '300m',
													memory: '400Mi'
												}
											}
										},
										storage: {
											statedb: {
												size: '300G',
											}
										}
									}
								};
								const output_body = {
									dep_component_id: 'component',
									parameters: {},
									statedb: 'couchdb',
									resources: {
										couchdb: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											},
										},
										dind: {
											limits: {
												cpu: '500m',
												memory: '1000Mi'
											},
											requests: {
												cpu: '500m',
												memory: '1000Mi'
											}
										},
										fluentd: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											}
										},
										peer: {
											limits: {
												cpu: '300m',
												memory: '400Mi'
											},
											requests: {
												cpu: '300m',
												memory: '400Mi'
											}
										},
										proxy: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											}
										}
									},
									storage: {
										peer: {
											size: '100Gi',
										},
										statedb: {
											size: '300G',
										}
									},
									type: 'fabric-peer'
								};

								const dep_body = comp_fmt_lib.fmt_body_athena_to_dep(incoming_req, null);
								expect(dep_body).to.deep.equal(output_body);
								done();
							}
						},
						{
							itStatement: 'storage test (storage.couchdb) -',
							callFunction: () => { },
							expectBlock: (done) => {
								const incoming_req = {
									path: '/api/v3/components/fabric-peer',
									body: {
										id: 'component',
										statedb: 'couchdb',
										type: 'fabric-peer',
										resources: {
											couchdb: {
												requests: {
													cpu: '100m',
													memory: '200Mi'
												}
											},
											peer: {
												requests: {
													cpu: '300m',
													memory: '400Mi'
												}
											}
										},
										storage: {
											couchdb: {							// wrong key should change
												size: '300G',
											}
										}
									}
								};
								const output_body = {
									dep_component_id: 'component',
									parameters: {},
									statedb: 'couchdb',
									resources: {
										couchdb: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											},
										},
										dind: {
											limits: {
												cpu: '500m',
												memory: '1000Mi'
											},
											requests: {
												cpu: '500m',
												memory: '1000Mi'
											}
										},
										fluentd: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											}
										},
										peer: {
											limits: {
												cpu: '300m',
												memory: '400Mi'
											},
											requests: {
												cpu: '300m',
												memory: '400Mi'
											}
										},
										proxy: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											}
										}
									},
									storage: {
										peer: {
											size: '100Gi',
										},
										statedb: {
											size: '300G',
										}
									},
									type: 'fabric-peer'
								};

								const dep_body = comp_fmt_lib.fmt_body_athena_to_dep(incoming_req, null);
								expect(dep_body).to.deep.equal(output_body);
								done();
							}
						},
						{
							itStatement: 'storage test (storage.leveldb) -',
							callFunction: () => { },
							expectBlock: (done) => {
								const incoming_req = {
									path: '/api/v3/components/fabric-peer',
									body: {
										id: 'component',
										statedb: 'leveldb',
										type: 'fabric-peer',
										resources: {
											leveldb: {
												requests: {
													cpu: '100m',
													memory: '200Mi'
												}
											},
											peer: {
												requests: {
													cpu: '300m',
													memory: '400Mi'
												}
											}
										},
										storage: {
											leveldb: {					// wrong key should change
												size: '300G',
											}
										}
									}
								};
								const output_body = {
									dep_component_id: 'component',
									parameters: {},
									statedb: 'leveldb',
									resources: {
										leveldb: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											},
										},
										dind: {
											limits: {
												cpu: '500m',
												memory: '1000Mi'
											},
											requests: {
												cpu: '500m',
												memory: '1000Mi'
											}
										},
										fluentd: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											}
										},
										peer: {
											limits: {
												cpu: '300m',
												memory: '400Mi'
											},
											requests: {
												cpu: '300m',
												memory: '400Mi'
											}
										},
										proxy: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											}
										}
									},
									storage: {
										peer: {
											size: '100Gi',
										},
										statedb: {
											size: '300G',
										}
									},
									type: 'fabric-peer'
								};

								const dep_body = comp_fmt_lib.fmt_body_athena_to_dep(incoming_req, null);
								expect(dep_body).to.deep.equal(output_body);
								done();
							}
						},
						{
							itStatement: 'storage test (storage.statedb w/class) -',
							callFunction: () => { },
							expectBlock: (done) => {
								const incoming_req = {
									path: '/api/v3/components/fabric-peer',
									body: {
										id: 'component',
										statedb: 'couchdb',
										type: 'fabric-peer',
										resources: {
											couchdb: {
												requests: {
													cpu: '100m',
													memory: '200Mi'
												}
											},
											peer: {
												requests: {
													cpu: '300m',
													memory: '400Mi'
												}
											}
										},
										storage: {
											statedb: {
												size: '500G',
												class: 'some-class'
											}
										}
									}
								};
								const output_body = {
									dep_component_id: 'component',
									parameters: {},
									statedb: 'couchdb',
									resources: {
										couchdb: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											},
										},
										dind: {
											limits: {
												cpu: '500m',
												memory: '1000Mi'
											},
											requests: {
												cpu: '500m',
												memory: '1000Mi'
											}
										},
										fluentd: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											}
										},
										peer: {
											limits: {
												cpu: '300m',
												memory: '400Mi'
											},
											requests: {
												cpu: '300m',
												memory: '400Mi'
											}
										},
										proxy: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											}
										}
									},
									storage: {
										peer: {
											size: '100Gi',
										},
										statedb: {
											size: '500G',
											class: 'some-class'
										}
									},
									type: 'fabric-peer'
								};

								const dep_body = comp_fmt_lib.fmt_body_athena_to_dep(incoming_req, null);
								expect(dep_body).to.deep.equal(output_body);
								done();
							}
						},
						{
							itStatement: 'resources/storage test (defaults, empty) -',
							callFunction: () => { },
							expectBlock: (done) => {
								const incoming_req = {
									path: '/api/v3/components/fabric-peer',
									body: {
										id: 'component',
										statedb: 'couchdb',
										type: 'fabric-peer',
										resources: {},
										storage: {}
									}
								};
								const output_body = {
									dep_component_id: 'component',
									parameters: {},
									statedb: 'couchdb',
									resources: {
										couchdb: {
											limits: {
												cpu: '200m',
												memory: '400Mi'
											},
											requests: {
												cpu: '200m',
												memory: '400Mi'
											},
										},
										dind: {
											limits: {
												cpu: '500m',
												memory: '1000Mi'
											},
											requests: {
												cpu: '500m',
												memory: '1000Mi'
											}
										},
										fluentd: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											}
										},
										peer: {
											limits: {
												cpu: '200m',
												memory: '400Mi'
											},
											requests: {
												cpu: '200m',
												memory: '400Mi'
											}
										},
										proxy: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											}
										}
									},
									storage: {
										peer: {
											size: '100Gi',
										},
										statedb: {
											size: '100Gi',
										}
									},
									type: 'fabric-peer'
								};

								const dep_body = comp_fmt_lib.fmt_body_athena_to_dep(incoming_req, null);
								expect(dep_body).to.deep.equal(output_body);
								done();
							}
						},
						{
							itStatement: 'resources/storage test (defaults, dne) -',
							callFunction: () => { },
							expectBlock: (done) => {
								const incoming_req = {
									path: '/api/v3/components/fabric-peer',
									body: {
										id: 'component',
										statedb: 'couchdb',
										type: 'fabric-peer'
									}
								};
								const output_body = {
									dep_component_id: 'component',
									parameters: {},
									statedb: 'couchdb',
									resources: {
										couchdb: {
											limits: {
												cpu: '200m',
												memory: '400Mi'
											},
											requests: {
												cpu: '200m',
												memory: '400Mi'
											},
										},
										dind: {
											limits: {
												cpu: '500m',
												memory: '1000Mi'
											},
											requests: {
												cpu: '500m',
												memory: '1000Mi'
											}
										},
										fluentd: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											}
										},
										peer: {
											limits: {
												cpu: '200m',
												memory: '400Mi'
											},
											requests: {
												cpu: '200m',
												memory: '400Mi'
											}
										},
										proxy: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											}
										}
									},
									storage: {
										peer: {
											size: '100Gi',
										},
										statedb: {
											size: '100Gi',
										}
									},
									type: 'fabric-peer'
								};

								const dep_body = comp_fmt_lib.fmt_body_athena_to_dep(incoming_req, null);
								expect(dep_body).to.deep.equal(output_body);
								done();
							}
						},

						{
							itStatement: 'resources/storage CA (defaults, empty) -',
							callFunction: () => { },
							expectBlock: (done) => {
								const incoming_req = {
									path: '/api/v3/components/fabric-ca',
									body: {
										id: 'myca',
										type: 'fabric-ca',
										resources: {},
										storage: {}
									}
								};
								const output_body = {
									dep_component_id: 'myca',
									parameters: {},
									resources: {
										ca: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											},
										},
									},
									storage: {
										ca: {
											size: '20Gi',
										}
									},
									type: 'fabric-ca',
									cname: 'ca',
									cnametls: 'ca-tls'
								};

								const dep_body = comp_fmt_lib.fmt_body_athena_to_dep(incoming_req, null);
								expect(dep_body).to.deep.equal(output_body);
								done();
							}
						},

						{
							itStatement: 'resources/storage Orderer (defaults, empty) -',
							callFunction: () => { },
							expectBlock: (done) => {
								const incoming_req = {
									path: '/api/v3/components/fabric-orderer',
									body: {
										id: 'myorderer',
										type: 'fabric-orderer',
										resources: {},
										storage: {}
									}
								};
								const output_body = {
									dep_component_id: 'myorderer',
									parameters: {},
									resources: {
										orderer: {
											limits: {
												cpu: '250m',
												memory: '500Mi'
											},
											requests: {
												cpu: '250m',
												memory: '500Mi'
											},
										},
										proxy: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											}
										},
									},
									storage: {
										orderer: {
											size: '100Gi',
										}
									},
									type: 'fabric-orderer'
								};

								const dep_body = comp_fmt_lib.fmt_body_athena_to_dep(incoming_req, null);
								expect(dep_body).to.deep.equal(output_body);
								done();
							}
						},

						{
							itStatement: 'resources test Orderer (set requests and limits) -',
							callFunction: () => { },
							expectBlock: (done) => {
								const incoming_req = {
									path: '/api/v3/components/fabric-orderer',
									body: {
										id: 'myorderer',
										type: 'fabric-orderer',
										resources: {
											orderer: {
												limits: {
													cpu: '200m',
													memory: '300Mi'
												},
												requests: {
													cpu: '400m',
													memory: '500Mi'
												},
											},
										},
										storage: {}
									}
								};
								const output_body = {
									dep_component_id: 'myorderer',
									parameters: {},
									resources: {
										orderer: {
											limits: {
												cpu: '200m',
												memory: '300Mi'
											},
											requests: {
												cpu: '400m',
												memory: '500Mi'
											},
										},
										proxy: {
											limits: {
												cpu: '100m',
												memory: '200Mi'
											},
											requests: {
												cpu: '100m',
												memory: '200Mi'
											}
										},
									},
									storage: {
										orderer: {
											size: '100Gi',
										}
									},
									type: 'fabric-orderer'
								};

								const dep_body = comp_fmt_lib.fmt_body_athena_to_dep(incoming_req, null);
								expect(dep_body).to.deep.equal(output_body);
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
