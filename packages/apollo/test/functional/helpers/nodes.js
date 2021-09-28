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

const { element, by } = require('protractor');

function getCATiles() {
	const container = getCAContainer();
	const cas = container.all(by.css('div.ibp-container-tile'));
	return cas.filter(ca => {
		return ca.getAttribute('id').then(value => {
			return value !== 'test__ca--add--tile';
		});
	});
}

function getCAContainer() {
	return getContainer('cas');
}

function getContainer(comp) {
	const container = element(by.css('div#' + comp + '-container'));
	return container;
}

function getPeersContainer() {
	return getContainer('peers');
}

function getPeerTiles() {
	const container = getPeersContainer();
	const peers = container.all(by.css('div.ibp-container-tile'));
	return peers.filter(peer => {
		return peer.getAttribute('id').then(value => {
			return value !== 'test__peers--add--tile';
		});
	});
}

function getOrderersContainer() {
	return getContainer('orderers');
}

function getOrdererTiles() {
	const container = getOrderersContainer();
	const orderers = container.all(by.css('div.ibp-container-tile'));
	return orderers.filter(orderer => {
		return orderer.getAttribute('id').then(value => {
			return value !== 'test__orderers--add--tile';
		});
	});
}

module.exports = {
	getCATiles,
	getCAContainer,
	getContainer,
	getPeersContainer,
	getPeerTiles,
	getOrdererTiles,
	getOrderersContainer,
};
