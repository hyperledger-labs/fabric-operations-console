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
const { by, browser, ExpectedConditions } = require('protractor');
const { getCATiles, getPeerTiles, getOrdererTiles } = require('../helpers/nodes');

Then(/^the (certificate authority|peer|orderer) with name (?:'|")(.*?)(?:'|") should have started successfully$/, async(nodeType, name) => {
	let tiles;
	if (nodeType === 'certificate authority') {
		tiles = getCATiles();
	} else if (nodeType === 'peer') {
		tiles = getPeerTiles();
	} else if (nodeType === 'orderer') {
		tiles = getOrdererTiles();
	}

	let tile = tiles
		.filter(_tile => {
			return _tile
				.element(by.tagName('h4'))
				.getText()
				.then(text => {
					return text === name;
				});
		})
		.first();

	try {
		await browser.wait(ExpectedConditions.elementToBeClickable(tile), 10000);
		let isRunning = tile.element(by.className('ibp-node-status-running'));
		await browser.wait(ExpectedConditions.elementToBeClickable(isRunning), 5 * 60 * 1000);
	} catch (err) {
		console.log('Refreshing browser, retrying check to see if node is running');
		// If the status goes unknown, refresh and try again.
		await browser.refresh();
		await browser.wait(ExpectedConditions.elementToBeClickable(tile), 10000);
		let isRunning = tile.element(by.className('ibp-node-status-running'));
		await browser.wait(ExpectedConditions.elementToBeClickable(isRunning), 5 * 60 * 1000);
	}

	await tile.click();
});

Given(/^I clicked the (?:'|")(.*?)(?:'|") (certificate authority|orderer)$/, async(name, nodeType) => {
	if (nodeType === 'certificate authority') {
		const tiles = getCATiles();

		let tile = tiles
			.filter(_tile => {
				return _tile
					.element(by.tagName('h4'))
					.getText()
					.then(text => {
						return text === name;
					});
			})
			.first();

		await browser.wait(ExpectedConditions.elementToBeClickable(tile), 5000);

		let isRunning = tile.element(by.className('ibp-node-status-running'));
		await browser.wait(ExpectedConditions.elementToBeClickable(isRunning), 3000);

		await tile.click();
	} else if (nodeType === 'orderer') {
		const tiles = getOrdererTiles();

		let tile = tiles
			.filter(_tile => {
				return _tile
					.element(by.tagName('h4'))
					.getText()
					.then(text => {
						return text === name;
					});
			})
			.first();

		await browser.wait(ExpectedConditions.elementToBeClickable(tile), 5000);

		let isRunning = tile.element(by.className('ibp-node-status-running'));
		await browser.wait(ExpectedConditions.elementToBeClickable(isRunning), 3000);

		await tile.click();
	}
});
