@support @regression @runonconsole
Feature: Join a network feature

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
        Then wait "3" seconds
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
        Then wait "3" seconds
        Then the 'admin' user with id 'OSadmin' should be enrolled
        And the 'orderer' user with id 'OS1' should be enrolled
        And I enroll TLS identity for OS1 with secret 'OS1pw' and name 'TLSOS1'
        Then wait "2" seconds
		# Import identity in wallet
        Given I am on the 'wallet' page
        And I clicked the button with title 'Add identity'
        And I clicked the button with id 'addIdentity-json-upload'
        Then wait "2" seconds
        And I upload file 'cypress/downloads/Org1 MSP Admin_identity.json' to 'addIdentity-upload' input
        And I clicked the button with id 'add_identity'
        And I clicked the button with title 'Add identity'
        And I clicked the button with id 'addIdentity-json-upload'
        And I upload file 'cypress/downloads/Ordering Service MSP Admin_identity.json' to 'addIdentity-upload' input
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
        And I clicked the div with id 'ibp-tile-Ordering Service'
        And I clicked the button with id 'no-identity-button'
        And I clicked the button with title 'Do not associate'
        And I clicked the div with text 'Ordering Service MSP Admin'
        And I clicked the button with id 'associate_identity'
        Then wait "2" seconds

    Scenario: When creating a certificate authority for Org2
        And I am on the 'nodes' page
        And I clicked the button with title 'Add Certificate Authority'
        And I clicked Create a Certificate Authority
        And I clicked the button with id 'next'
        And I provided 'Org2 CA' for the 'Enter a CA display name' input
        And I provided 'admin' for the 'Enter enroll ID' input
        And I provided 'adminpw' for the 'Enter enroll secret' input
        And I clicked the button with id 'next'
        And I clicked the button with id 'submit'
        Then wait "5" seconds
        Then I should see a success toast with class '.bx--toast-notification__subtitle' which says "Congratulations! You have successfully created 'Org2 CA'."
        And the certificate authority with name 'Org2 CA' should have started successfully

    Scenario: When associating and enrolling identities for Org2 CA
        And I am on the 'nodes' page
        And I clicked the 'Org2 CA' certificate authority
        And I clicked the button with id 'no-identity-button'
        And I provided 'admin' for the 'Enter an ID' input
        And I provided 'adminpw' for the 'Enter a secret' input
        And I provided 'Org2 CA Admin' for the 'Enter a name' input
        And I clicked the button with id 'associate_identity'
        And the CA admin is set as 'Org2 CA Admin'
        Then wait "3" seconds
        When the 'admin' user was enrolled with id 'org2admin' and secret 'org2adminpw'
        Then wait "3" seconds
        And the 'peer' user was enrolled with id 'peer2' and secret 'peer2pw'
        Then wait "10" seconds
        Then the 'admin' user with id 'org2admin' should be enrolled
        And the 'peer' user with id 'peer2' should be enrolled

    Scenario: When creating an organization MSP definition for Org2
        And I am on the 'organizations' page
        And I clicked the button with title 'Create MSP definition'
        And I provided 'Org2 MSP' for the 'Enter name for the MSP' input
        And I provided 'org2msp' for the 'Enter the MSP ID' input
        And I clicked the span with text 'Next'
        And I clicked the button with title 'Select a root Certificate Authority'
        And I clicked the div with text 'Org2 CA'
        And wait "3" seconds
        And I clicked the span with text 'Next'
        And I clicked the button with title 'org2admin'
        And I clicked the div with text 'org2admin'
        And I provided 'org2adminpw' for the 'Enter a secret' input
        And I provided 'Org2 MSP Admin' for the 'Enter name for the identity to be stored in your Wallet' input
        And I clicked the button with text 'Generate'
        And I clicked the button with text 'Export'
        And I clicked the span with text 'Next'
        And I click Create MSP definition button
        Then I should see a success toast with class '.bx--toast-notification__title' which says "MSP Org2 MSP has been created successfully."

    Scenario: When creating a peer for Org2
        And I am on the 'nodes' page
        And I clicked the button with title 'Add peer'
        And I clicked Create a peer
        And I clicked the button with id 'next'
        And I provided 'Peer Org2' for the 'Enter the Peer name' input
        And I clicked the button with id 'next'
        And I clicked the button with title 'Select CA'
        And I clicked the dropdown item 'Org2 CA' with class '.bx--list-box__menu-item__option'
        Then wait "2" seconds
        And I clicked the button with title 'peer2'
        And I clicked the div with text 'peer2'
        And I provided 'peer2pw' for the 'Enter a secret' input
        And I clicked the button with title 'Select an MSP'
        And I clicked the div with text 'Org2 MSP'
        And I clicked the button with title 'Select a Fabric version'
        And I clicked the div with text '2.5'
        And I clicked the button with id 'next'
        And I clicked the button with title 'Please select an identity from your wallet'
        And I clicked the div with text 'Org2 MSP Admin'
        And I clicked the button with id 'next'
        When I clicked the button with id 'submit'
        Then wait "6" seconds
        Then I should see a success toast with class '.bx--toast-notification__subtitle' which says "Congratulations! You have successfully created 'Peer Org2'"
        And the peer with name 'Peer Org2' should have started successfully

    Scenario: Add Org2 to consortium
        And I am on the 'nodes' page
        And I clicked the 'Ordering Service' orderer
        Then wait "10" seconds
        And I clicked the button with title 'Add organization'
        And I clicked the button with title 'Ordering Service MSP (osmsp)'
        And I clicked the dropdown item 'Org2 MSP (org2msp)' with class '.bx--list-box__menu-item__option'
        When I clicked the button with id 'submit'
        Then wait "10" seconds
        Then a tile with title 'Org2 MSP' should have been created
