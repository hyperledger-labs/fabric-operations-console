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

/* eslint-disable no-undef */
const fs = require('fs');
const path = require('path');

exports.config = {
	framework: 'custom',
	frameworkPath: require.resolve('protractor-cucumber-framework'),
	specs: ['./features/**/*.feature'],
	cucumberOpts: {
		require: ['./steps/**/*.steps.js', './settings/*.js'],
		format: ['node_modules/cucumber-pretty', 'json:functional_tests.json'],
		'format-options': '{ "pretty": { "summary": true, "passed": true } }',
	},
	acceptInsecureCerts: true,
	capabilities: {
		browserName: 'chrome',

		chromeOptions: {
			args: [
				'--ignore-certificate-errors',
				'--window-size=1600x1000',
				`--user-data-dir=${process.env.HOME}/Library/Application Support/Google/Chrome`,
				'--profile-directory=Profile 1',
			],
		},
	},
	onPrepare: async() => {
		await browser.driver
			.manage()
			.window()
			.setSize(1600, 1000);
		await browser.waitForAngularEnabled(false);
		browser.ignoreSynchronization = true;
		browser.basePath = __dirname;
		browser.instanceName = process.env.INSTANCE_NAME ? process.env.INSTANCE_NAME : 'UI Auto - ' + Date.now();
		// browser.instanceName = 'UI Auto - 1614295448371';

		browser.automationUser = process.env.AUTOMATION_USER;
		browser.automationPassword = process.env.AUTOMATION_PASSWORD;
		let consoleUrlPath = path.join(__dirname, 'settings', 'console_url.txt');
		let consoleUrl;
		try {
			consoleUrl = fs.readFileSync(consoleUrlPath, 'utf-8');
		} catch (err) {
			console.log(`Unable to read console_url.txt file: ${err.message}`);
		}

		consoleUrl = consoleUrl ? consoleUrl : process.env.CONSOLE_URL ? process.env.CONSOLE_URL : 'http://localhost:4002/';
		console.log(`Initial Console URL is: ${consoleUrl}`);
		browser.consoleUrl = consoleUrl;

		browser.clusterName = 'paidcluster'; // default to staging
		browser.cloudURL = 'https://test.cloud.ibm.com'; // default to staging
		browser.blockchainService = 'blockchain-platform'; // default to staging

		// possible options dev/staging/prod
		let env = browser.params && browser.params.env ? browser.params.env : 'staging';
		if (env === 'dev' || env === 'prod') {
			browser.clusterName = 'openshift4x-ibpv2-test';
			browser.cloudURL = 'https://cloud.ibm.com';
		}
		if (env === 'dev') {
			browser.blockchainService = 'ibp-20---dev';
		}
	},
};
