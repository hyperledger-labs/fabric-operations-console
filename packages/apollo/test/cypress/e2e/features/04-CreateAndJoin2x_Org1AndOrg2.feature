@support @regression @runonconsole
Feature: Create and Join a 2.x channel

    Background: Login to console
        Given I go to the console
        And I am logged in
        And I am ready to get started

    # Cypress launches new test runner / browser with clean state and that clears wallet that we store in browser local storage
    # https://github.com/cypress-io/cypress/issues/28186#issuecomment-1787344347
    # Hence, we need to import required identities in begining of each feature file
    Scenario: Setting up the identities
		# Associate identigies for CAs
        And I am on the 'nodes' page
        And I clicked the 'Org1 CA' certificate authority
        And I clicked the button with id 'no-identity-button'
        And I provided 'admin' for the 'Enter an ID' input
        And I provided 'adminpw' for the 'Enter a secret' input
        And I provided 'Org1 CA Admin' for the 'Enter a name' input
        And I clicked the button with id 'associate_identity'
        And the CA admin is set as 'Org1 CA Admin'
        Then the 'admin' user with id 'org1admin' should be enrolled
        And the 'peer' user with id 'peer1' should be enrolled
        When I am on the 'nodes' page
        And I clicked the 'Ordering Service CA' certificate authority
        And I clicked the button with text 'Associate identity'
        And I provided 'admin' for the 'Enter an ID' input
        And I provided 'adminpw' for the 'Enter a secret' input
        And I provided 'Ordering Service CA Admin' for the 'Enter a name' input
        And I clicked the button with id 'associate_identity'
        And the CA admin is set as 'Ordering Service CA Admin'
        Then the 'admin' user with id 'OSadmin' should be enrolled
        And the 'orderer' user with id 'OS1' should be enrolled
        And I enroll TLS identity for OS1 with secret 'OS1pw' and name 'TLSOS1'
        And I am on the 'nodes' page
        And I clicked the 'Org2 CA' certificate authority
        And I clicked the button with id 'no-identity-button'
        And I provided 'admin' for the 'Enter an ID' input
        And I provided 'adminpw' for the 'Enter a secret' input
        And I provided 'Org2 CA Admin' for the 'Enter a name' input
        And I clicked the button with id 'associate_identity'
        And the CA admin is set as 'Org2 CA Admin'
        Then the 'admin' user with id 'org2admin' should be enrolled
        And the 'peer' user with id 'peer2' should be enrolled
		# Import identity in wallet
		Given I am on the 'wallet' page
		And I clicked the button with title 'Add identity'
		And I clicked the button with id 'addIdentity-json-upload'
		And I upload file 'cypress/downloads/Org1 MSP Admin_identity.json' to 'addIdentity-upload' input
		And I clicked the button with id 'add_identity'
		And I clicked the button with title 'Add identity'
		And I clicked the button with id 'addIdentity-json-upload'
		And I upload file 'cypress/downloads/Ordering Service MSP Admin_identity.json' to 'addIdentity-upload' input
		And I clicked the button with id 'add_identity'
		And I clicked the button with title 'Add identity'
		And I clicked the button with id 'addIdentity-json-upload'
		And I upload file 'cypress/downloads/Org2 MSP Admin_identity.json' to 'addIdentity-upload' input
		And I clicked the button with id 'add_identity'
		Then wait "2" seconds
		# Associating identity for Peer and Ordering Nodes
		And I am on the 'nodes' page
		Given I clicked the div with id 'ibp-tile-Peer Org1'
		And I clicked the button with id 'no-identity-button'
		And I clicked the button with title 'Please select an identity from your wallet'
		And I clicked the div with text 'Org1 MSP Admin'
		And I clicked the button with id 'associate_identity'
		Then wait "2" seconds
		Given I am on the 'nodes' page
		And I clicked the div with id 'ibp-tile-Peer Org2'
		And I clicked the button with id 'no-identity-button'
		And I clicked the button with title 'Please select an identity from your wallet'
		And I clicked the div with text 'Org2 MSP Admin'
		And I clicked the button with id 'associate_identity'
		Then wait "2" seconds
		Given I am on the 'nodes' page
		And I clicked the div with id 'ibp-tile-Ordering Service'
		And I clicked the button with id 'no-identity-button'
		And I clicked the button with title 'Do not associate'
		And I clicked the div with text 'Ordering Service MSP Admin'
		And I clicked the button with id 'associate_identity'
		Then wait "2" seconds

    Scenario: When creating a channel (channel2)
        And I am on the 'channels' page
        And I clicked the button with title 'Create channel'
        And I clicked the checkbox with text 'Advanced channel configuration'
        And I clicked the span with text 'Next'
        And I provided 'channel2' for the 'Enter a name for your channel' input
        And I clicked the button with title 'Select from available ordering services'
        And I clicked the div with id 'downshift-0-item-0'
		Then wait "3" seconds
        And I clicked the span with text 'Next'
        And I clicked the button with title 'Select MSP'
        And I clicked the div with text 'Org1 MSP (org1msp)'
        And I clicked the button with text 'Add'
        And I clicked the 'admin' role for 'org1msp'
        And I clicked the button with title 'Select MSP'
        And I clicked the div with text 'Org2 MSP (org2msp)'
        And I clicked the button with text 'Add'
        And I clicked the 'admin' role for 'org2msp'
        And I clicked the span with text 'Next'
        And I clicked the button with title 'Select policy'
        And I clicked the div with text '1 out of 2'
        And I clicked the span with text 'Next'
        And I clicked the button with title 'Select the MSP'
        And I clicked the div with text 'Org1 MSP (org1msp)'
        And I clicked the button with title 'Select an identity'
        And I clicked the div with text 'Org1 MSP Admin'
        And I clicked the span with text 'Next'
        And I clicked the div with id 'selectedApplicationCapability'
        And I clicked the div with text '2.0.0'
        And I clicked the div with id 'selectedOrdererCapability'
		And I clicked element with class '#selectedOrdererCapability > div > div:nth-child(2)'
        And I clicked the span with text 'Next'
        And I clicked the span with text 'Next'
        And I clicked the span with text 'Next'
        And I clicked the span with text 'Next'
        And I clicked the span with text 'Next'
        And I clicked the button with title 'Select the MSP'
        And I clicked the div with text 'Ordering Service MSP (osmsp)'
		And I clicked the span with text 'Next'
		And I clicked the span with text 'Next'
        Then I clicked Create channel button
		Then wait "10" seconds
		Then I should see a success toast with class '.bx--toast-notification__title' which says "You have successfully initiated a request to create channel2. This request requires the signature of an ordering service MSP. After the request has been signed and submitted, you will see a pending channel tile. Clicking on this tile will allow you to join a peer to the channel."
		Then wait "5" seconds
		# Approving New channel request
		When I clicked the button with id 'ibp-header-signature-collection-icon'
		And I clicked element with class '.ibp-signature-collection-notification-link'
		Then wait "5" seconds
		And I clicked the button with title 'Select identity to sign with'
		And I clicked the div with text 'Ordering Service MSP Admin'
		Then I clicked the button with id 'submit'
		Then wait "5" seconds
		When I clicked element with class '.ibp-signature-collection-notification-link'
		Then wait "5" seconds
		And I clicked the button with title 'Select MSP'
		And I clicked the div with text 'Org2 MSP'
		And I clicked the button with title 'Select an identity'
		And I clicked the div with text 'Org2 MSP Admin'
		Then I clicked the button with id 'submit'
		Then wait "5" seconds
		Then the element div with text 'channel2' should be visible on page

    Scenario: When joining a channel (channel2)
        And I am on the 'channels' page
        And I clicked the div with id 'ibp-tile-channel2'
        Then wait "5" seconds
        And I clicked the span with text 'Peer Org1'
        And I clicked the span with text 'Peer Org2'
        When I clicked the button with id 'submit'
        Then I should see a success toast with class '.bx--toast-notification__title' which says "You have successfully joined channel2."
		Then the element div with text 'channel2' should be visible on page
