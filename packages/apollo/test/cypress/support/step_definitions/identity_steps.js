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

Given(/^the CA admin is set as (?:'|")(.*?)(?:'|")$/, identityName => {
	// Sometimes it takes time to associate identity after clicking button
	cy.wait(60000)
    cy.get('.ibp-identity-information',{ timeout: 120000 }).contains(identityName)
});

When(/^the (?:'|")(.*?)(?:'|") user was enrolled with id (?:'|")(.*?)(?:'|") and secret (?:'|")(.*?)(?:'|")$/, (type, enrollId, enrollSecret) => {
    try{
		cy.wait(1000)
		cy.clickButton('id', 'btn-ca_users-register_user')
		cy.enterInput(enrollId, 'Enter an ID')
		cy.enterInput(enrollSecret, 'Enter a secret')
		cy.get('.bx--list-box__field').click()
		cy.wait(500)
		cy.get('.bx--list-box__menu-item__option').contains(type).should('be.visible').click()
		cy.clickButton('id', 'next')
		cy.wait(500)
		cy.clickButton('id', 'submit')
		cy.wait(1000)
	} catch (err){
		cy.log('Error: ', err)
	}
});

Then(/^the (?:'|")(.*?)(?:'|") user with id (?:'|")(.*?)(?:'|") should be enrolled$/, (type, enrollId) => {
	try {
		cy.get('table[id="table-ca_users"]').find("tr").then((rows) => {
			rows.toArray().forEach((element) => {
				if (element.innerText.includes(type)) {
					if (element.innerText.includes(enrollId)){
						cy.log('Found user id in table: ',type + ":" + element.innerText)
					}
				}
			});
		});
		cy.get('.ibp-table-list-cell-container').contains(type).should('be.visible')
	} catch (err){
		cy.log('Error: ', err)
	}
});

When(/^I click Create MSP definition button$/, () => {
	cy.get('.ibp-button.ibm-label').contains('Create MSP definition').click()
	cy.get('h4').contains('Org1 MSP').should('be.visible')
});

When(/^I enroll TLS identity for OS1 with secret (?:'|")(.*?)(?:'|") and name (?:'|")(.*?)(?:'|")$/, (enrollSecret, enrollName) => {
	cy.get('.bx--overflow-menu.bx--overflow-menu--md').first().should('be.visible').click()
	cy.wait(500)
	cy.clickButton('id','generate_cert--menu--item')
	cy.wait(1000)
	cy.clickButton('title','Root Certificate Authority')
	cy.wait(1000)
	cy.get('.bx--list-box__menu-item__option').contains('TLS Certificate Authority').click()
	cy.enterInput(enrollSecret, 'Enter a secret');
	cy.clickButton('id', 'next')
	cy.wait(60000)
	cy.get(`input[title="Enter a name"]`,{ timeout: 180000 }).should('be.visible')
	cy.enterInput(enrollName, 'Enter a name');
	cy.clickButton('id', 'submit'); //Add identity to Wallet
	cy.wait(2000)
});
