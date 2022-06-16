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
/* eslint-disable new-cap */
const { Given, Then, When } = require('cucumber');
const { browser, element, by, ExpectedConditions } = require('protractor');
const { clickButton, clickCheckbox, clickSelectItem } = require('../helpers/navigation');

Given(/^I go to the console$/, async() => {
	await browser.waitForAngularEnabled(false);
	await browser.driver.get(browser.consoleUrl);
});

Given(/^I go to IBM Cloud$/, async() => {
	await browser.waitForAngularEnabled(false);
	await browser.driver.get(browser.cloudURL);

	try {
		let iframeElement = await element(by.css('iframe[title="TrustArc Cookie Consent Manager"]'));
		await browser.wait(ExpectedConditions.visibilityOf(iframeElement), 10000);
		let webElement = await iframeElement.getWebElement();
		await browser.switchTo().frame(webElement); // switch to iframe so we can actually find the element within
		let defaultCookiesBtn = element(by.linkText('Accept Default'));
		await browser.wait(ExpectedConditions.elementToBeClickable(defaultCookiesBtn), 10000);
		await defaultCookiesBtn.click();
	} catch (err) {
		// Continue
	}
});

Given(/^I go to Blockchain catalog in IBM Cloud$/, async() => {
	await browser.waitForAngularEnabled(false);
	let catalogURL = `${browser.cloudURL}/catalog/services/${browser.blockchainService}`;
	await browser.driver.get(catalogURL);
});

Given(/^I clicked the button with (text|title|id) (?:'|")(.*?)(?:'|")$/, async(property, value) => {
	await clickButton(property, value);
});

Given(/^I clicked the checkbox with (text) (?:'|")(.*?)(?:'|")$/, async(property, value) => {
	await clickCheckbox(property, value);
});

Given(/^I clicked the (?:'|")(.*?)(?:'|") select item from (?:'|")(.*?)(?:'|")$/, async(value, selector) => {
	await clickSelectItem(selector, value);
});

Given(/^I click on (?:'|")(.*?)(?:'|") twisty$/, async twisty => {
	const item = element(by.cssContainingText('.group-name', twisty));
	await browser.wait(ExpectedConditions.visibilityOf(item), 5000);
	let parent = await item.element(by.xpath('../..'));
	let expCarot = await parent.element(by.tagName('button'));
	let isExpanded = await expCarot.getAttribute('data-is-expanded');
	if (isExpanded === 'false') {
		expCarot.click();
	}
});

Given(/^I clicked the peer (?:'|")(.*?)(?:'|") select item$/, async peerName => {
	// not ideal! but have to work around chrome driver click behavior with overlayed items
	// let peerId = peerName.toLowerCase().replace(/\s/g, '');
	// await clickCheckboxWithId(`joinChannelModal-peer-${peerId}`);
	await clickSelectItem(peerName);
	// ensure Join channel button is clickable - to ensure the peer info is loaded
	// let button = element(by.buttonText('Join channel'));
	// let button = element(by.buttonText('Install smart contract'));
	let button = element(by.id('submit'));
	await browser.wait(ExpectedConditions.elementToBeClickable(button), 30000);
});

When(/^I click the button with text (?:'|")(.*?)(?:'|")$/, async text => {
	let button = element(by.buttonText(text));

	await browser.wait(ExpectedConditions.elementToBeClickable(button), 30000);
	await button.click();
});

When(/^I click the (?:'|")(.*?)(?:'|") button inside (?:'|")(.*?)(?:'|")$/, async(text, containerId) => {
	let container = element(by.css(containerId));
	let button = container.element(by.buttonText(text));

	await browser.wait(ExpectedConditions.elementToBeClickable(button), 30000);
	await button.click();
});

Then(/^the page title should equal '(.*?)'$/, async title => {
	let actualTitle = await browser.getTitle();
	title.should.equal(actualTitle);
});

Given(/^I am on the (?:'|")(.*?)(?:'|") page$/, async page => {
	let navElement = element(by.id(`test__navigation--item--${page}`));

	await browser.wait(ExpectedConditions.elementToBeClickable(navElement), 10000);
	await navElement.click();
	await browser.sleep(5000);
});

Then(/^I should be on the (?:'|")(.*?)(?:'|") page$/, async page => {
	let pageTitleElement = element(by.css('h1'));
	await browser.wait(ExpectedConditions.visibilityOf(pageTitleElement), 5000);
	let pageTitle = await pageTitleElement.getText();
	pageTitle.should.equal(page);
});

When(/^I clicked the tile with title (?:'|")(.*?)(?:'|")$/, async title => {
	let navElement = element(by.id(`ibp-tile-${title}`));
	await browser.wait(ExpectedConditions.elementToBeClickable(navElement), 20000);
	await navElement.click();
});

When(/^I click on my service name$/, async() => {
	let navElement = element(by.linkText(browser.instanceName));
	await browser.wait(ExpectedConditions.elementToBeClickable(navElement), 10000);
	await navElement.click();
	let elementId = element(by.css('[aria-label="Service Details - IBM Cloud"]'));
	await browser.wait(ExpectedConditions.visibilityOf(elementId), 20000);
	elementId.should.exist;
});

When(/^I switch context to Blockchain iframe$/, async() => {
	await browser.sleep(2000);
	await browser.switchTo().frame(element(by.css('[title="manage"]')).getWebElement());
});

When(/^I switch context to parent iframe$/, async() => {
	await browser.switchTo().defaultContent();
});

When(/^I clicked anchor with text (?:'|")(.*?)(?:'|")$/, async text => {
	let navElement = element(by.linkText(text));
	await browser.wait(ExpectedConditions.elementToBeClickable(navElement), 10000);
	await navElement.click();
});

When(/^I clicked anchor with title (?:'|")(.*?)(?:'|")$/, async title => {
	let navElement = element(by.css(`a[title="${title}"]`));
	await browser.wait(ExpectedConditions.elementToBeClickable(navElement), 10000);
	await navElement.click();
});

Then(/^I should click on the element with selector (?:'|")(.*?)(?:'|")$/, async selector => {
	let elementId = element(by.css(selector));
	await browser.wait(ExpectedConditions.visibilityOf(elementId), 20000);
	await elementId.click();
});

Then(/^a tile with title (?:'|")(.*?)(?:'|") should have been created$/, async tileTitle => {
	await browser.sleep(2000);
	try {
		let tile = element(by.cssContainingText('.ibp-tile-content-title', tileTitle));
		await browser.wait(ExpectedConditions.visibilityOf(tile), 20000);
	} catch (e) {
		browser.refresh();
		let tile = element(by.cssContainingText('.ibp-tile-content-title', tileTitle));
		await browser.wait(ExpectedConditions.visibilityOf(tile), 20000);
	}
});

Then(/^I get the URL for console$/, async() => {
	await browser.sleep(2000);
	let handles = await browser.getAllWindowHandles();
	await browser.switchTo().window(handles[1]);
	let consoleUrl = await browser.getCurrentUrl();
	await browser.close();
	await browser.switchTo().window(handles[0]);
	browser.consoleUrl = consoleUrl;
	console.log(`Switched console URL to: ${browser.consoleUrl}`);
});
