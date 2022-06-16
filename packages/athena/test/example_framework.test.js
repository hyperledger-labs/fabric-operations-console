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
//----------------------------------------------------------------------
// example_framework.test.js - Example of how to use the test framework
//----------------------------------------------------------------------
const common = require('./test-suites/common-test-framework');
const myutils = {};
const chai = require('chai');
const expect = chai.expect;

/**
 * This is just to make it easier to create a test collection.
 * Below is the framework that needs to be copied. From there
 * just add or change the data to suite your needs. Follow the
 * other test examples to understand. This is more of a timesaver
 * than a learning tool but it should speed up the learning process.
 */
const testCollection = [
	// POST /deploy/daemonset/prepull/:cluster_name
	{
		suiteDescribe: 'POST /deploy/daemonset/prepull/:cluster_name',
		mainDescribe: 'Run POST /deploy/daemonset/prepull/:cluster_name ',
		executeRequest: (routeInfo, done) => {
			chai.request(this.app)
				.post('/deploy/daemonset/prepull/dev-blockchain-ibm-com')
				.end((err, res) => {
					myutils.handleResponse(err, res, routeInfo, done);
				});
		},
		testData: [
			{
				arrayOfInfoToTest: [
					{
						itStatement: 'should display a status code of 200 and an empty object',
						callFunction: () => {
							this.stubs.deployPrepullDaemonset.callsArgWith(1, null, null);
						},
						expectBlock: (res) => {
							expect(res.statusCode).to.equal(200);
							expect(res.text).to.equal(JSON.stringify({}));
						}
					}
				]
			},
			{
				arrayOfInfoToTest: [
					{
						itStatement: 'should return a status code of 500 and include error text',
						callFunction: () => {
							this.stubs.deployPrepullDaemonset.callsArgWith(1, new Error('Error created with stub'));
						},
						expectBlock: (res) => {
							const resObj = JSON.parse(res.text);
							expect(res).to.have.status(500);
							expect(resObj.message).to.equal('Error created with stub');
							expect(resObj.backend_context).to.equal('Failed to deploy prepull daemonset to dev-blockchain-ibm-com');
						}
					}
				]
			},
			{
				arrayOfInfoToTest: [
					{
						itStatement: 'should display a status code of 403 and error text',
						expectBlock: (res) => {
							expect(res.statusCode).to.equal(403);
							expect(res.text).to.equal('Only administrators can do module.exports');
						}
					}
				]
			},
			{
				arrayOfInfoToTest: [
					{
						itStatement: 'should display a status code of 403 and error text',
						expectBlock: (res) => {
							expect(res.statusCode).to.equal(403);
							expect(res.text).to.equal('Only administrators can do module.exports');
						}
					}
				]
			}
		]
	},
];
// call main test function to run this test collection
common.mainTestFunction(testCollection);
