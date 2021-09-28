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
const { browser, element, by, ExpectedConditions } = require('protractor');

async function clickButton(property, value) {
	let button;
	if (property === 'text') {
		button = element(by.buttonText(value));
	} else if (property === 'title') {
		button = element(by.css(`button[title="${value}"]`));
	} else if (property === 'id') {
		button = element(by.id(value));
	} else {
		throw new Error('Property not supported');
	}

	await browser.wait(ExpectedConditions.elementToBeClickable(button), 60000);
	await button.click();
}

async function clickCheckbox(property, value) {
	let checkbox;
	if (property === 'text') {
		// Wouldn't handle multiple instances of a class with the same text!
		checkbox = element(by.cssContainingText('.bx--checkbox-label-text', value));
	} else {
		throw new Error('Property not supported');
	}

	await browser.wait(ExpectedConditions.elementToBeClickable(checkbox), 30000);
	await checkbox.click();
}

async function clickCheckboxWithId(id) {
	const checkbox = element(by.css(`label[for="${id}"]`));

	await browser.wait(ExpectedConditions.elementToBeClickable(checkbox), 30000);
	await checkbox.click();
}

async function clickSelectItem(value) {
	const peerItem = element(by.css(`input[name="${value}"]`));
	await browser.wait(ExpectedConditions.elementToBeClickable(peerItem), 30000);
	const clickableItem = element(by.cssContainingText('.bx--tile-content', value));
	await browser.sleep(3000);
	await clickableItem.click();
}

async function getCellText(id) {
	let container = element(by.id(id));
	let cell = container.element(by.className('ibp-table-list-cell-container'));
	await browser.wait(ExpectedConditions.visibilityOf(cell), 10000);
	let cellText = await cell.getText();
	return cellText;
}

module.exports = {
	clickButton,
	clickCheckbox,
	clickSelectItem,
	clickCheckboxWithId,
	getCellText,
};
