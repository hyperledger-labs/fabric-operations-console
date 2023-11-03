@support @regression @runOnConsole
Feature: 2.0 Lifecycle Flow

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
		Then wait "2" seconds
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

	Scenario: Install and Propose 2.0 Smart Contract as Org1
		And I am on the 'channels' page
        And I clicked the div with id 'ibp-tile-channel2'
        Then wait "5" seconds
        And I clicked the button with title 'Propose smart contract definition'
        And I clicked the button with title 'Select an organization'
        And I clicked the div with text 'Org1 MSP (org1msp)'
        And I clicked the button with title 'Select an identity'
        And I clicked the div with text 'Org1 MSP Admin'
        And I clicked the button with id 'next'
        And I upload file 'fixtures/test_data/chaincodes/fabcar_1.0.0.tgz' to 'pkg-file-uploader' input
        And I clicked the button with id 'next'
        And I clicked the button with id 'next'
        # And I provided 'fabcar22' for the 'Enter the identifier' input
        # And I provided '1.0.0' for the 'Enter the version' input
        And I clicked the button with id 'next'
        And I clicked the button with id 'next'
        And I clicked the button with id 'next'
        And I clicked the button with id 'submit'
        Then wait "30" seconds
        Then the chaincode with name 'fabcar' should have been created in 'Proposed' state

    Scenario: Approve Smart Contact as Org2
		And I am on the 'channels' page
        And I clicked the div with id 'ibp-tile-channel2'
        Then wait "5" seconds
        And I clicked the div with text 'fabcar'
        And I clicked the button with text 'Begin approval process'
        And I clicked the button with title 'Select an identity'
        And I clicked the div with text 'Org2 MSP Admin'
        And I clicked the button with id 'next'
        And I upload file 'fixtures/test_data/chaincodes/fabcar_1.0.0.tgz' to 'pkg-file-uploader' input
        And I clicked the button with id 'next'
        And I clicked the button with id 'next'
        And I clicked the button with id 'submit'
        Then the chaincode with name 'fabcar' should have been created in 'Ready to commit' state

    Scenario: Commit Smart Contact as Org1
        And I am on the 'channels' page
        And I clicked the div with id 'ibp-tile-channel2'
        Then wait "5" seconds
        And I clicked the div with text 'fabcar'
        And I clicked the button with text 'Begin commit process'
        And I clicked the button with title 'Select an organization'
        And I clicked the div with text 'Org1 MSP (org1msp)'
        And I clicked the button with title 'Select an identity'
        And I clicked the div with text 'Org1 MSP Admin'
        And I clicked the button with text 'Commit smart contract'
        Then the chaincode with name 'fabcar' should have been created in 'Committed' state
