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
		cy.wait(1000)
		cy.get(`input[id="${inputId}"]`,{ timeout: 180000 }).should('be.visible')
		cy.get(`input[id="${inputId}"]`).clear().type(text)
		} catch (err) {
		cy.log('Error: ', err)
	  }
});

Given(/^I provided (?:'|")(.*?)(?:'|") for input field with class (?:'|")(.*?)(?:'|")$/, (text, className) => {
	try {
		cy.wait(1000)
		cy.get(className,{ timeout: 180000 }).should('be.visible').click()
		cy.get(className,{ timeout: 180000 }).clear().type(text)
		cy.wait(2000)
		} catch (err) {
		cy.log('Error: ', err)
	  }
});

Given(/^I upload file (?:'|")(.*?)(?:'|") to (?:'|")(.*?)(?:'|") input$/, (filePath, inputId) => {
	cy.wait(1000)
	cy.get(`input[id="${inputId}"]`).selectFile(filePath, { force: true})
});

Given(/^I upload file (?:'|")(.*?)(?:'|")$/, (filePath) => {
	cy.wait(1000)
	//cy.get('#upload').selectFile(filePath)
	cy.get('input[type=file]').selectFile(filePath, { force: true })
	//cy.get('input[type=file]').invoke('show').selectFile(filePath)
});

Given(/^I click label with property (?:'|")(.*?)(?:'|") and value (?:'|")(.*?)(?:'|")$/, (property, propertyValue) => {
	cy.wait(500)
	cy.get(`label[${property}="${propertyValue}"]`).click()
});

Then(/^I should see (div|button) with id (?:'|")(.*?)(?:'|")$/, (controlType, propertyValue) => {
	cy.wait(500)
	cy.get(`${controlType}[id="${propertyValue}"]`, { timeout: 180000 }).should('be.visible')
});

Then(/^I should see table with id (?:'|")(.*?)(?:'|")$/, (propertyValue) => {
	cy.wait(500)
	cy.get(`table[id="${propertyValue}"]`, { timeout: 180000 }).should('be.visible')
});

Then(/^I should see audit log row with text (?:'|")(.*?)(?:'|") and id (?:'|")(.*?)(?:'|")$/, (rowText, propertyValue) => {
	cy.get("#table-audit_logs",{ timeout: 180000 }).find("tr").find("td").contains(rowText).should('be.visible');
});

Then(/^I should see api key row with text (?:'|")(.*?)(?:'|") and id (?:'|")(.*?)(?:'|")$/, (rowText, propertyValue) => {
	cy.get(`td[id="${propertyValue}"]`,{ timeout: 180000 }).first().contains(rowText).should('be.visible')
});
