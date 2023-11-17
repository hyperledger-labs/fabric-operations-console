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
import { Given, Then, When } from "@badeball/cypress-cucumber-preprocessor";
import { exit } from "process";

Then(/^I should see a success toast with class (?:'|")(.*?)(?:'|") which says (?:'|")(.*?)(?:'|")$/, (className, expectedMessage) => {
	// Retry logic as sometimes timeout error is displayed while creating peer and retry works
	if (expectedMessage.includes('Peer'))
	{
		let found = false
		for(let i = 0; i<10;i++){
			if (found == false)
			{
				cy.wait(2000)
				cy.log('Checking if error displayed')
				cy.get('body').then(($body) => {
					if ($body.find('.ibp-side-panel-error-details').length) {
						cy.get(`button[id="submit"]`).click()
						cy.wait(6000)
						cy.get(className, { timeout: 60000 }).contains(expectedMessage).should('be.visible')
						found = true
					}
				})
				cy.log('Checking for success toast')
				cy.get('body').then(($body) => {
					if ($body.find(className).length) {
						cy.get(className, { timeout: 60000 }).contains(expectedMessage).should('be.visible')
						found = true
					}
				})
			}
		}
	}else{
		cy.get(className, { timeout: 60000 }).contains(expectedMessage).should('be.visible')
	}
});
