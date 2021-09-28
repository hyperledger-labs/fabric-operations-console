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
const { Then } = require('cucumber');
const { browser, element, by, ExpectedConditions } = require('protractor');
const { getCellText } = require('../helpers/navigation');

Then(/^I should see a success toast which says (?:'|")(.*?)(?:'|")$/, async expectedMessage => {
	let successElement;
	try {
		successElement = element(by.className('bx--toast-notification__title'));
		await browser.wait(ExpectedConditions.visibilityOf(successElement), 60000);
		let successText = await successElement.getText();
		successText.should.contain(expectedMessage);
	} catch (err) {
		successElement = element(by.className('bx--toast-notification__subtitle'));
		await browser.wait(ExpectedConditions.visibilityOf(successElement), 60000);
		let successText = await successElement.getText();
		successText.should.contain(expectedMessage);
	}
});

Then(/^I should see a button with id (?:'|")(.*?)(?:'|")$/, async id => {
	let elementId = element(by.id(id));
	await browser.wait(ExpectedConditions.visibilityOf(elementId), 5 * 60 * 1000);
	elementId.should.exist;
});

Then(/^I should see a button with text (?:'|")(.*?)(?:'|")$/, async text => {
	let elementId = element(by.buttonText(text));
	await browser.wait(ExpectedConditions.visibilityOf(elementId), 180000);
	elementId.should.exist;
});

Then(/^I should see an element with label (?:'|")(.*?)(?:'|")$/, async label => {
	let elementId = element(by.css(`[aria-label="${label}"]`));
	await browser.wait(ExpectedConditions.visibilityOf(elementId), 20000);
	elementId.should.exist;
});

Then(/^I should see a smart contract (?:'|")(.*?)(?:'|") with version (?:'|")(.*?)(?:'|") in channel (?:'|")(.*?)(?:'|")$/, async(name, version, channel) => {
	let contracts = [];
	try {
		for (let i = 0; i < 10; ++i) {
			let nameText = await getCellText(`instantiated-chaincode-contract_name-${i}`);
			let versionText = await getCellText(`instantiated-chaincode-version-${i}`);
			let channelText = await getCellText(`instantiated-chaincode-channel-${i}`);
			contracts.push(`${nameText}-${versionText}-${channelText}`);
		}
	} catch (e) {
		contracts.should.contain(`${name}-${version}-${channel}`);
	}
});
