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
// other_apis_lib.test.js - Test other_apis_lib functions
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const settings_objects = require('../../docs/settings_objects.json');
const tools = common.tools;
const myutils = require('../../testing-lib/test-middleware');
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);

let other;

const createStubs = () => {
	return {
		// getDesignDocView: sinon.stub(tools.otcc, 'getDesignDocView'),
		// bulkDatabase: sinon.stub(tools.couch_lib, 'bulkDatabase'),
		// createNewDoc: sinon.stub(tools.otcc, 'createNewDoc'),
		// broadcast: sinon.stub(tools.wss1_athena, 'broadcast').returns(true)
		readFileSync: sinon.stub(tools.fs, 'readFileSync')
	};
};

describe('other_apis_lib.js', () => {
	beforeEach(() => {
		tools.stubs = createStubs();
		other = require('../../../libs/other_apis_lib.js')(common.logger, common.ev, tools);
	});
	afterEach(() => {
		myutils.restoreStubs(tools.stubs);
	});
	const testCollection = [
		// get_settings_breakdown
		{
			suiteDescribe: 'get_settings_breakdown',
			mainDescribe: 'Run get_settings_breakdown',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the settings breakdown test_id=grzmee',
							callFunction: () => {
								tools.env_config_file = process.env.CONFIGURE_FILE;
								process.env.CONFIGURE_FILE = true;
								const settings = JSON.parse(JSON.stringify(settings_objects));
								tools.stubs.readFileSync.returns({
									'_id': 'test_config_doc',
									'should': 'work'
								});
								tools.stubs.getDoc = sinon.stub(tools.otcc, 'getDoc').callsArgWith(1, null, settings);
							},
							expectBlock: (done) => {
								other.get_settings_breakdown((err, resp) => {
									expect(err).to.equal(null);
									expect(resp.DB_COMPONENTS).to.deep.equal({ _defined_by: 'code', _value: 'athena_components' });
								});
								process.env.CONFIGURE_FILE = tools.env_config_file;
								tools.stubs.getDoc.restore();
								return done();
							}
						},
					]
				}
			]
		},
		// edit_settings
		{
			suiteDescribe: 'edit_settings',
			mainDescribe: 'Run edit_settings',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the settings breakdown test_id=grzmee',
							callFunction: () => {
								tools.env_config_file = process.env.CONFIGURE_FILE;
								process.env.CONFIGURE_FILE = true;
								const settings = JSON.parse(JSON.stringify(settings_objects));
								tools.stubs.readFileSync.returns({
									'_id': 'test_config_doc',
									'should': 'work'
								});
								tools.stubs.getDoc = sinon.stub(tools.otcc, 'getDoc').callsArgWith(1, null, settings);
							},
							expectBlock: (done) => {
								const req = {};
								other.edit_settings(req, (err, resp) => {
									expect(err).to.equal(null);
									expect(resp.DB_COMPONENTS).to.deep.equal({ _defined_by: 'code', _value: 'athena_components' });
								});
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
