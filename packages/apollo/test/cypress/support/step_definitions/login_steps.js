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


Given(/^I am on the login page$/, () => {
    cy.wait(2000)
    cy.get('p').should(($div) => {
        expect($div.get(0).innerText).to.eq('Login to Fabric Operations Console')
        })
});

Then(/^I should be asked to change the default password$/, () => {
	try{
		cy.log('Verify change password page is shown')
		cy.wait(2000)
		cy.get('input[id="login-form-currentPassword"]').should('be.visible')
		cy.get('input[id="login-form-newPassword"]').should('be.visible')
		cy.get('input[id="login-form-confirmPassword"]').should('be.visible')
		cy.get('button[id="login"]').should('be.visible')
		cy.get('p').should(($div) => {
			expect($div.get(0).innerText).to.eq('Change password')
			})
	}catch (err){
		cy.log("Error: ", err)
	}
});

Given(/^I am on the change default password page$/, () => {
	cy.get('input[id="login-form-currentPassword"]').should('be.visible')
	cy.get('input[id="login-form-newPassword"]').should('be.visible')
	cy.get('input[id="login-form-confirmPassword"]').should('be.visible')
	cy.get('button[id="login"]').should('be.visible')
});

When(/^I change the password from default password$/, () => {
	cy.fixture("config.json").then((data) => {
		cy.get('input[id="login-form-currentPassword"]').type(data.loginDefaultPassword)
		cy.get('input[id="login-form-newPassword"]').type(data.loginPassword)
		cy.get('input[id="login-form-confirmPassword"]').type(data.loginPassword)
		cy.get('button[id="login"]').click()
		cy.wait(2000)
	})
});

Then(/^I should be redirected to the login page again$/, () => {
	try {
		cy.get('input[id="login-form-email"]').should('be.visible')
		cy.get('input[id="login-form-login_password"]').should('be.visible')
		cy.get('p').should(($div) => {
			expect($div.get(0).innerText).to.eq('Login to Fabric Operations Console')
			})
	} catch (err) {
		cy.log('Error: ', err)
		cy.reload()
		cy.get('input[id="login-form-email"]').should('be.visible')
		cy.get('input[id="login-form-login_password"]').should('be.visible')
		cy.get('p').should(($div) => {
			expect($div.get(0).innerText).to.eq('Login to Fabric Operations Console')
			})
	}
});

Given(/^I am logged in$/, () => {
	try {
		cy.wait(2000)
		cy.get('p').then(($div) => {
			if ($div.get(0).innerText == 'Login to Fabric Operations Console'){
				cy.fixture("config.json").then((data) => {
					cy.log('Logging into console as ', data.loginUserName)
					cy.loginToConsole(data.loginUserName,data.loginPassword)
					cy.wait(2000)
				})
			}else{
				cy.log('User is logged into console')
			}
		})
	} catch (err) {
		cy.log('Error: ', err)
	}
});

Given(/^I am logged in as (?:'|")(.*?)(?:'|") user$/, userName => {
	try {
		cy.wait(2000)
		cy.get('p').then(($div) => {
			if ($div.get(0).innerText == 'Login to Fabric Operations Console'){
				cy.fixture("config.json").then((data) => {
					cy.log('Logging into console as ', userName)
					cy.loginToConsole(userName,data.loginPassword)
					cy.wait(2000)
				})
			}else{
				cy.log('User is logged into console')
			}
		})
	} catch (err) {
		cy.log('Error: ', err)
	}
});


Given(/^I am logged in for first time$/, () => {
    cy.wait(1000);
    cy.get('p').should(($div) => {
        expect($div.get(0).innerText).to.eq('Login to Fabric Operations Console')
        })

	cy.fixture("config.json").then((data) => {
		cy.loginToConsole(data.loginUserName,data.loginDefaultPassword)
	})
});

Given(/^I am logged in for first time as (?:'|")(.*?)(?:'|") user$/, userName => {
    cy.wait(1000);
    cy.get('p').should(($div) => {
        expect($div.get(0).innerText).to.eq('Login to Fabric Operations Console')
        })

	cy.fixture("config.json").then((data) => {
		cy.loginToConsole(userName,data.loginDefaultPassword)
	})
});

Given(/^I am ready to get started$/, () => {
	try {
		cy.get('button[id="btn-peers-add_peer"]').should('be.visible')
		cy.get('button[id="btn-cas-add_ca"]').should('be.visible')
		cy.get('button[id="btn-orderers-add_orderer"]').should('be.visible')
		cy.get('h1[id="test__page--header"]').should('be.visible')
	} catch (err) {
		cy.log('Error: ', err)
	}
});

Then(/^wait (?:'|")(.*?)(?:'|") seconds$/, seconds => {
	cy.wait(seconds * 1000);
});

Given(/^I am logged out from console$/, () => {
    cy.wait(1000);
	cy.get('button[id="ibp-header-user-profile-icon"]').click()
	cy.get('button[id="logout"]').click()
	cy.get('a').contains('click here').click()
	cy.wait(1000)
    cy.get('p').should(($div) => {
        expect($div.get(0).innerText).to.eq('Login to Fabric Operations Console')
        })
});
