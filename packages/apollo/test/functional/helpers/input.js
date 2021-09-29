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

async function enterInput(text, inputTitle) {
	let inputElement;
	try {
		inputElement = element(by.css(`input[title="${inputTitle}"]`));
		await browser.wait(ExpectedConditions.elementToBeClickable(inputElement), 5000);
	} catch (err) {
		inputElement = element(by.css(`input[title="${inputTitle}"]`));
		await browser.wait(ExpectedConditions.elementToBeClickable(inputElement), 5000);
	}

	await inputElement.clear(); // Clear any existing text
	await browser.sleep(1000);
	await inputElement.sendKeys(text);
	await browser.sleep(500);
}

async function selectDropdownOption(item, dropdownSelector) {
	await browser.sleep(1000);
	let dropdown;
	try {
		dropdown = element(by.css(dropdownSelector));
		await browser.wait(ExpectedConditions.visibilityOf(dropdown), 11000);
		await dropdown.click();
	} catch (err) {
		dropdown = element(by.css(dropdownSelector));
		await browser.wait(ExpectedConditions.visibilityOf(dropdown), 11000);
		await dropdown.click();
	}
	let regex = new RegExp(`^${item}.*$`, 'g');
	const chosenOption = dropdown.all(by.cssContainingText('div[id^="downshift"]', regex)).first();
	await browser.wait(ExpectedConditions.elementToBeClickable(chosenOption), 15000);
	await chosenOption.click();
}

async function enterInputById(text, inputId) {
	let inputElement;
	try {
		inputElement = element(by.css(`input[id='${inputId}']`));
	} catch (err) {
		inputElement = element(by.css(`input[id='${inputId}']`));
	}
	await browser.sleep(1000);
	await browser.wait(ExpectedConditions.visibilityOf(inputElement), 6000);
	await inputElement.clear();
	await inputElement.sendKeys(text);
	await browser.sleep(500);
}

async function enterInputByPlaceholder(text, inputId) {
	let inputElement;
	try {
		inputElement = element(by.css(`input[placeholder='${inputId}']`));
	} catch (err) {
		inputElement = element(by.css(`input[placeholder='${inputId}']`));
	}
	await browser.sleep(1000);
	await inputElement.clear();
	await inputElement.sendKeys(text);
	await browser.sleep(500);
}

module.exports = {
	enterInput,
	selectDropdownOption,
	enterInputById,
	enterInputByPlaceholder,
};
