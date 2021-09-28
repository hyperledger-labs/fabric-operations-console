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

/* eslint-disable new-cap */
/* eslint-disable quotes */
const { Given } = require('cucumber');
const { enterInput, selectDropdownOption, enterInputById, enterInputByPlaceholder } = require('../helpers/input');
const { browser } = require('protractor');
Given(/^I provided (?:'|")(.*?)(?:'|") for the (?:'|")(.*?)(?:'|") input$/, async(text, inputTitle) => {
	await browser.sleep(1000);
	await enterInput(text, inputTitle);
});

Given(/^I provided (?:'|")(.*?)(?:'|") for ID (?:'|")(.*?)(?:'|") input$/, async(text, inputTitle) => {
	await browser.sleep(1000);
	await enterInputById(text, inputTitle);
});

Given(/^I provided (?:'|")(.*?)(?:'|") for placeholder (?:'|")(.*?)(?:'|") input$/, async(text, inputTitle) => {
	await browser.sleep(1000);
	await enterInputByPlaceholder(text, inputTitle);
});

Given(/^I provided a name for the service$/, async() => {
	await browser.sleep(1000);
	await enterInputById(browser.instanceName, 'serviceName');
});

Given(/^I selected (?:'|")(.*?)(?:'|") from the (?:'|")(.*?)(?:'|") dropdown$/, async(element, selector) => {
	await browser.sleep(2000);
	try {
		await selectDropdownOption(element, selector);
	} catch (e) {
		try {
			await selectDropdownOption(element, selector);
		} catch (e) {
			//
		}
	}
});

Given(/^I selected my cluster$/, async() => {
	await browser.sleep(2000);
	let selector = 'div#hyperion-cluster-list-dropdown';
	let cluster = browser.clusterName;
	try {
		await selectDropdownOption(cluster, selector);
	} catch (e) {
		await selectDropdownOption(cluster, selector);
	}
});

Given(/^I upload file (?:'|")(.*?)(?:'|") to (?:'|")(.*?)(?:'|") input$/, async(text, inputId) => {
	await browser.sleep(1000);
	const absolutePath = browser.basePath + text;
	await enterInputById(absolutePath, inputId);
});
