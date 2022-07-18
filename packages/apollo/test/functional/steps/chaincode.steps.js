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
/* eslint-disable quotes */
const { Then } = require('cucumber');
const { browser, element, by, ExpectedConditions } = require('protractor');

Then(/^the chaincode with name (?:'|")(.*?)(?:'|") should have been created in (?:'|")(.*?)(?:'|") state$/, async(chaincodeName, state) => {
	await browser.sleep(10 * 1000);
	let tileTitleEl;
	try {
		tileTitleEl = element(by.cssContainingText('.ibp-tile-content-title', chaincodeName));
		await browser.wait(ExpectedConditions.elementToBeClickable(tileTitleEl), 10 * 60 * 1000);
	} catch (e) {
		await browser.sleep(60 * 1000);
		await browser.refresh();
		tileTitleEl = element(by.cssContainingText('.ibp-tile-content-title', chaincodeName));
		await browser.wait(ExpectedConditions.elementToBeClickable(tileTitleEl), 10 * 60 * 1000);
	}
	let tile = await tileTitleEl.element(by.xpath('../..'));
	let stateEl = await tile.element(by.css('.ibp-channel-chaincode-status'));
	browser.wait(ExpectedConditions.textToBePresentInElement(stateEl, state), 10 * 60 * 1000);
	let stateText = await stateEl.getText();
	stateText.should.equal(state);
});
