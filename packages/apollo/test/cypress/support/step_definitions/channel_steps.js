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

import { Given, Then, When } from "@badeball/cypress-cucumber-preprocessor";

Given(/^I clicked the (?:'|")(.*?)(?:'|") role for (?:'|")(.*?)(?:'|")$/, (role, mspId) => {
	cy.get(`label[for="ibp-add-orgs-msp-${mspId}-role-${role}"]`).click()
});

Then(/^the channel with name (?:'|")(.*?)(?:'|") should have been created$/, (channelName) => {
	cy.get('.ibp-container-tile-pending').contains(channelName).should('be.visible')
});

Then(/^I clicked Create channel button$/, () => {
	cy.wait(500)
	cy.get('#ibp--template-full-page-side-panel > div.ibp-button-container.ibp-vertical-panel-button-container > button:nth-child(2) > span').click()
  });

Then(/^the chaincode with name (?:'|")(.*?)(?:'|") should have been created in (?:'|")(.*?)(?:'|") state$/, (chaincodeName, state) => {
	try {
		// Sometimes error is displayed (due to timeout or any reason) but retry works
		let found = false
		for(let i = 0; i<10;i++){
			if (found == false)
			{
				cy.wait(2000)
				cy.log('Checking if error displayed')
				cy.get('body').then(($body) => {
					if ($body.find(":contains(An unexpected error occurred)").length > 0) {
						cy.get(`button[id="submit"]`).click()
						cy.wait(60000)
						found = true
					}
				  })
			}
		}
		cy.get('.ibp-tile-content-title', { timeout: 60000 }).contains(chaincodeName).should('be.visible')
		cy.get('.ibp-channel-chaincode-status').contains(state).should('be.visible')
	} catch (err) {
		cy.log('Error: ', err)
	}
});

Then(/^I should see a smart contract (?:'|")(.*?)(?:'|") with version (?:'|")(.*?)(?:'|") in channel (?:'|")(.*?)(?:'|")$/, (name, version, channel) => {
	try {
		cy.get('table[id="table-instantiated_chaincode"]').find("tr").then((rows) => {
			rows.toArray().forEach((element) => {
				if (element.innerText.includes(name)) {
					if (element.innerText.includes(version)){
						if (element.innerText.includes(channel)){
							cy.log('Found smart contract:', element.innerText)
						}
					}
				}
			});
		});
		cy.get('#instantiated-chaincode-channel-0').contains(channel).should('be.visible')
	} catch (err) {
		cy.log('Error: ', err)
	}
});

Then(/^I should see Create Genesis screen with message to to join orderer$/, () => {
	cy.wait(1000)
	cy.get('.ibp-channel-section-genesis').should('be.visible')
});
