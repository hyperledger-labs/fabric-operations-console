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

Then(/^the (certificate authority|peer|orderer) with name (?:'|")(.*?)(?:'|") should have started successfully$/, (nodeType, name) => {
    cy.wait(3 * 60000)
    cy.get('h4').contains(name).should('be.visible')
    cy.get(`div[id="ibp-tile-${name}"]`).parent().contains('Running')
});

Given(/^I clicked the (?:'|")(.*?)(?:'|") (certificate authority|orderer|peer)$/, (name, nodeType) => {
    try{
        cy.get(`div[id="ibp-tile-${name}"]`).should('be.visible')
        cy.get(`div[id="ibp-tile-${name}"]`).click()
    }catch (err){
        cy.log('Error: ', err)
    }
});

Given(/^I clicked the node (?:'|")(.*?)(?:'|")$/, (nodeName) => {
    try{
        cy.get(`div[id="ibp-tile-${nodeName}"]`).should('be.visible')
        cy.get(`div[id="ibp-tile-${nodeName}"]`).click()
    }catch (err){
        cy.log('Error: ', err)
    }
});
