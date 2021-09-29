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
const { Given, Then } = require('cucumber');
const { browser, element, by, ExpectedConditions } = require('protractor');
const { clickCheckboxWithId } = require('../helpers/navigation');

Then(/^the channel with name (?:'|")(.*?)(?:'|") should have been created$/, async channelName => {
	await browser.sleep(10000);
	await browser.refresh();
	let channel = element(by.cssContainingText('.ibp-container-tile-pending', channelName));
	await browser.wait(ExpectedConditions.elementToBeClickable(channel), 30000);
});

Given(/^I clicked on the (?:'|")(.*?)(?:'|") channel$/, async channelName => {
	let channel = element(by.cssContainingText('.ibp-container-tile-pending', channelName));
	await browser.wait(ExpectedConditions.elementToBeClickable(channel), 60000);
	await channel.click();
});

Given(/^I clicked the (?:'|")(.*?)(?:'|") role for (?:'|")(.*?)(?:'|")$/, async(role, mspId) => {
	await clickCheckboxWithId(`ibp-add-orgs-msp-${mspId}-role-${role}`);
});
