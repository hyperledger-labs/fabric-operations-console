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
const { Given, Then } = require('cucumber');
const { element, by, browser, ExpectedConditions } = require('protractor');

Given(/^I clicked Create an ordering service$/, async() => {
	const createOrderingServiceElement = element(by.css('label[for="ibm_saas"]'));

	await browser.wait(ExpectedConditions.elementToBeClickable(createOrderingServiceElement), 5000);
	await createOrderingServiceElement.click();
});

Then(/^the consortium member (?:'|")(.*?)(?:'|") should exist$/, async mspName => {
	await browser.sleep(5000);
	let container = element(by.className('ibp-orderer-member-container'));
	await browser.wait(ExpectedConditions.visibilityOf(container), 20000);

	let _title = element(by.id(`ibp-tile-${mspName}`));
	let title = await _title.getText();
	title.should.equal(mspName);
});
