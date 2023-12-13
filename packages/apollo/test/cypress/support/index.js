import './commands'
Cypress.on('uncaught:exception', (err, runnable) => {
	if (err.message.includes('member defines an octet string of length 31 bytes but should be 32')) {
	  return false
	}
	// we still want to ensure there are no other unexpected
	// errors, so we let them fail the test
  })
