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
const { Given } = require('cucumber');
const { element, by, browser, ExpectedConditions } = require('protractor');

Given(/^I clicked Create a Certificate Authority$/, async() => {
	const createCaElement = element(by.css('label[for="ibm_saas"]'));

	await browser.wait(ExpectedConditions.elementToBeClickable(createCaElement), 5000);
	await createCaElement.click();
});

Given(/^I selected the (?:'|")(.*?)(?:'|") certificate authority$/, async caName => {
	const caDropdown = element(by.css('div#saasCA-saas_ca'));
	await browser.wait(ExpectedConditions.elementToBeClickable(caDropdown), 11000);
	await caDropdown.click();
	const chosenCa = caDropdown.all(by.cssContainingText('div[id^="downshift"]', caName)).first();
	await browser.wait(ExpectedConditions.elementToBeClickable(chosenCa), 15000);
	await chosenCa.click();
});
