// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

//Login to Console
Cypress.Commands.add('loginToConsole', (loginUserName,loginPassword) => {
    cy.get('input[id="login-form-email"]').type(loginUserName)
    cy.get('input[id="login-form-login_password"]').type(loginPassword)
    cy.get('button[id="login"]').click()
  })

//Click Button
Cypress.Commands.add('clickButton', (property, attributeValue) => {
  try{
    cy.wait(1000)
	Cypress.on('uncaught:exception', (err, runnable) => {
		return false;
	  });
    if (property == "text"){
        cy.get('button',{ timeout: 180000 }).contains(attributeValue).scrollIntoView().should('be.visible').click()
    }else{
      cy.get(`button[${property}="${attributeValue}"]`,{ timeout: 180000 }).scrollIntoView().should('be.visible').click()
    }
  }catch (err)
  {
    cy.log('Error: ', err)
  }
})

//Enter text into input / text field
Cypress.Commands.add('enterInput', (text, inputTitle) => {
	try {
    cy.wait(500)
	cy.get(`input[title="${inputTitle}"]`,{ timeout: 180000 }).should('be.visible')
    cy.get(`input[title="${inputTitle}"]`).clear().type(text)
		//cy.get(`input[title="${inputTitle}"]`).type(text)
	} catch (err) {
    cy.log('Error: ', err)
  }
})

Cypress.Commands.add('selectDropdownOption', (item, dropdownSelector) => {
  try{
    cy.wait(500)
    cy.get(dropdownSelector).select(item)
  } catch (err){
    cy.log('Error: ', err)
  }

})
