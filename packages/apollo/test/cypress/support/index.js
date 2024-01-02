import './commands'
Cypress.on('uncaught:exception', (err, runnable, promise) => {
	return false;
  })
