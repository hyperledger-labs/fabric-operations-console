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
import 'cypress-file-upload';


Given(/^I provided (?:'|")(.*?)(?:'|") for the (?:'|")(.*?)(?:'|") input$/, (text, inputTitle) => {
	cy.wait(500)
	cy.enterInput(text, inputTitle);
});

Given(/^I provided (?:'|")(.*?)(?:'|") for input field with id (?:'|")(.*?)(?:'|")$/, (text, inputId) => {
	try {
		cy.wait(500)
		cy.get(`input[id="${inputId}"]`).clear().type(text)
		} catch (err) {
		cy.log('Error: ', err)
	  }
});

Given(/^I upload file (?:'|")(.*?)(?:'|") to (?:'|")(.*?)(?:'|") input$/, (filePath, inputId) => {
	cy.wait(1000)
	cy.get(`input[id="${inputId}"]`).selectFile(filePath, { force: true})
});

Given(/^I click label with property (?:'|")(.*?)(?:'|") and value (?:'|")(.*?)(?:'|")$/, (property, propertyValue) => {
	cy.wait(500)
	cy.get(`label[${property}="${propertyValue}"]`).click()
});

Then(/^I should see (div|button) with id (?:'|")(.*?)(?:'|")$/, (controlType, propertyValue) => {
	cy.wait(500)
	cy.get(`${controlType}[id="${propertyValue}"]`).should('be.visible')
});

Then(/^I should see table with id (?:'|")(.*?)(?:'|")$/, (propertyValue) => {
	cy.wait(500)
	cy.get(`table[id="${propertyValue}"]`).should('be.visible')
});

Then(/^I should see audit log row with text (?:'|")(.*?)(?:'|") and id (?:'|")(.*?)(?:'|")$/, (rowText, propertyValue) => {
	cy.get(`td[id="${propertyValue}"]`).first().contains(rowText).should('be.visible')
});
