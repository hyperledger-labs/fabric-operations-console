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

Cypress.on('uncaught:exception', (err, runnable) => {
	return false
  })

Given("I go to the console", () => {
    cy.fixture("config.json").then((data) => {
      cy.visit(data.loginUrl)
    })
  });

Given(/^I clicked the button with (text|title|id|xpath) (?:'|")(.*?)(?:'|")$/, (property, value) => {
  cy.clickButton(property, value);
});

Given(/^I clicked the div with (title|id|xpath) (?:'|")(.*?)(?:'|")$/, (property, value) => {
  cy.wait(500)
  cy.get(`div[${property}="${value}"]`).first().click()
});

Given(/^I clicked the (div|span) with text (?:'|")(.*?)(?:'|")$/, (property, value) => {
  cy.wait(1000)
  cy.get(property,{ timeout: 180000 }).contains(value).first().click()
});

Given(/^I clicked the dropdown item (?:'|")(.*?)(?:'|") with class (?:'|")(.*?)(?:'|")$/, (selectItemText, className) => {
  cy.wait(1000)
  cy.get(className).contains(selectItemText).should('be.visible').click()
});

Given(/^I am on the (?:'|")(.*?)(?:'|") page$/, page => {
	cy.get(`div[id="test__navigation--item--${page}"]`).click()
  cy.get(1000)
});

Then(/^a tile with title (?:'|")(.*?)(?:'|") should have been created$/, tileTitle => {
	cy.wait(2000);
	try {
    cy.get('.ibp-tile-content-title').contains(tileTitle).should('be.visible')
	} catch (err) {
    cy.log("Error: ", err)
	}
});

Given(/^I clicked Create a (peer|Certificate Authority|Ordering Service)$/, () => {
  cy.wait(500)
  cy.get('label[for="deploy-id"]').click();
});

Given(/^I clicked the Next button in Create MSP definition screen$/, () => {
  cy.wait(500)
  cy.get('#generateMSPModal > div.ibp-button-container.ibp-vertical-panel-button-container > button:nth-child(2)').click()
});

Given(/^I clicked the (button|div) with class (?:'|")(.*?)(?:'|") contains text (?:'|")(.*?)(?:'|")$/, (className, buttonText) => {
  cy.wait(500)
  cy.get(className).contains(buttonText).should('be.visible').click()
});

Given(/^I clicked the checkbox with (text) (?:'|")(.*?)(?:'|")$/, (property, value) => {
  cy.wait(500)
  cy.get('label').contains(value).click()
});

Then(/^I am on Help page$/, () => {
  cy.get('#title_bar > header > div > button:nth-child(1)').click()
  cy.wait(1000)
});

Then(/^the div with id (?:'|")(.*?)(?:'|") does not exist on page$/, value => {
	cy.wait(1000)
	cy.get(`div[id="${value}"]`).should('not.exist');
  });

Given(/^the element (div|span) with text (?:'|")(.*?)(?:'|") should be visible on page$/, (property, value) => {
	cy.wait(500)
	cy.get(property).contains(value).should('be.visible')
});

Given(/^I clicked element with class (?:'|")(.*?)(?:'|")$/, (className) => {
	cy.wait(500)
	cy.get(className).first().should('be.visible').click()
  });

Then(/^the table row with id (?:'|")(.*?)(?:'|") does not exist on page$/, value => {
cy.wait(1000)
cy.get(`tr[id="${value}"]`).should('not.exist');
});

Then("I reload the page", () => {
	cy.reload()
});

Then(/^Button should be enabled for (text|title|id|xpath) (?:'|")(.*?)(?:'|")$/, (property, value) => {
//cy.clickButton(property, value);
cy.log('property = ' + property)
cy.log('value = ' + value)
cy.get('button[' + property + '="' + value + '"]').should('be.enabled')

});

Then(/^Button should be disabled for (text|title|id|xpath) (?:'|")(.*?)(?:'|")$/, (property, value) => {
//cy.clickButton(property, value);
cy.log('property = ' + property)
cy.log('value = ' + value)
cy.get('button[' + property + '="' + value + '"]').should('be.disabled')

});

Then(/^Button should be visible for (text|title|id|xpath) (?:'|")(.*?)(?:'|")$/, (property, value) => {
//cy.clickButton(property, value);
cy.log('property = ' + property)
cy.log('value = ' + value)
cy.get('button[' + property + '="' + value + '"]').should('be.visible')

});

Then(/^Button should not be visible for (text|title|id|xpath) (?:'|")(.*?)(?:'|")$/, (property, value) => {
//cy.clickButton(property, value);
cy.log('property = ' + property)
cy.log('value = ' + value)
cy.get('button[' + property + '="' + value + '"]').should('not.be.visible')

});

Then(/^Checkbox should be visible with (?:'|")(.*?)(?:'|")$/, (value) => {
cy.get('label').contains(value).should('be.visible')
});

Then(/^Checkbox should be hidden with id (?:'|")(.*?)(?:'|")$/, (value) => {
//  cy.get('label').contains(value).should('be.hidden')
cy.get('input[id="deploy-id"]').should('be.hidden')
});

Then(/^Checkbox should not be visible with (?:'|")(.*?)(?:'|")$/, (value) => {
cy.get('label').contains(value).should('not.be.visible')
});

Then(/^Checkbox should not exist with (?:'|")(.*?)(?:'|")$/, (value) => {
cy.get('label').contains(value).should('not.exist')
});

Then(/^Message should be displayed (?:'|")(.*?)(?:'|")$/, (msg) => {
cy.contains(msg)
});

Then(/^Text should not exist (?:'|")(.*?)(?:'|")$/, (text) => {
cy.contains(text).should('not.exist')
});

Then(/^Text should exist (?:'|")(.*?)(?:'|")$/, (text) => {
cy.contains(text).should('exist')
});

Given(/^I navigate to the (?:'|")(.*?)(?:'|") page$/, page => {
cy.fixture("config.json").then((data) => {
	cy.log('loginUrl = ' + data.loginUrl)
	cy.log('page = ' + page)
	cy.visit(data.loginUrl + '/' + page)
})
cy.get(1000)
});
