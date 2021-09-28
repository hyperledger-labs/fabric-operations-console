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
const { When, Given, Then } = require('cucumber');
const { browser, element, by, ExpectedConditions } = require('protractor');
const { clickButton } = require('../helpers/navigation');
const { enterInput, selectDropdownOption } = require('../helpers/input');

Given(/^I clicked the Associate identity button$/, async() => {
	await browser.sleep(2000);
	const associateIdentityButton = element(by.id('associate_identity'));

	await browser.wait(ExpectedConditions.elementToBeClickable(associateIdentityButton), 15000);
	await associateIdentityButton.click();
});

Given(/^the CA admin is set as (?:'|")(.*?)(?:'|")$/, async identityName => {
	const adminInfo = element(by.css('div.ibp-identity-information'));
	await browser.wait(ExpectedConditions.textToBePresentInElement(adminInfo, identityName), 15000);
	await browser.sleep(2000);
});

When(/^the (?:'|")(.*?)(?:'|") user was enrolled with id (?:'|")(.*?)(?:'|") and secret (?:'|")(.*?)(?:'|")$/, async(type, enrollId, enrollSecret) => {
	await clickButton('id', 'btn-ca_users-register_user');
	await enterInput(enrollId, 'Enter an ID');
	await enterInput(enrollSecret, 'Enter a secret');
	await selectDropdownOption(type, 'div#addUser-type');
	await clickButton('text', 'Next');
	// await clickButton('title', 'Register user');
	await clickButton('id', 'submit'); // Register user
	await browser.sleep(8000);
});

Then(/^the (?:'|")(.*?)(?:'|") user with id (?:'|")(.*?)(?:'|") should be enrolled$/, async(type, enrollId) => {
	let table = element.all(by.id('table-ca_users'));
	let rows = table.all(by.tagName('tr'));
	let _cells = rows.all(by.tagName('td'));

	let cells = await _cells.then(cellsArr => {
		return cellsArr;
	});

	for (let index = 0; index < cells.length; index++) {
		let text = await cells[index].getText();
		if (text === enrollId) {
			let nextCell = cells[index + 1];
			let nextText = await nextCell.getText();
			nextText.should.equal(type);
			break;
		}
	}
});
