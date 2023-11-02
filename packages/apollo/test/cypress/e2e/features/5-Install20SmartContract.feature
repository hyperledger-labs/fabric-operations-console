@support @regression @runonconsole
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
		# Create MSP definition for Org1, Ordering Service and Org2
        And I am on the 'organizations' page
        And I clicked the button with title 'Create MSP definition'
        And I provided 'Ordering Service MSP' for the 'Enter name for the MSP' input
        And I provided 'osmsp' for the 'Enter the MSP ID' input
        Then wait "3" seconds
        And I clicked the Next button in Create MSP definition screen
        And I clicked the button with title 'Select a root Certificate Authority'
        And I clicked the div with text 'Ordering Service CA'
        Then wait "5" seconds
        And I clicked the Next button in Create MSP definition screen
        And I clicked the button with title 'OSadmin'
        And I clicked the div with text 'OSadmin'
        And I provided 'OSadminpw' for the 'Enter a secret' input
        And I provided 'Ordering Service MSP Admin' for the 'Enter name for the identity to be stored in your Wallet' input
        And I clicked the button with text 'Generate'
        And I clicked the button with text 'Export'
        And I clicked the Next button in Create MSP definition screen
        And I click Create MSP definition button
		Then wait "2" seconds
        And I clicked the button with title 'Create MSP definition'
        And I provided 'Org1 MSP' for the 'Enter name for the MSP' input
        And I provided 'org1msp' for the 'Enter the MSP ID' input
        And I clicked the span with text 'Next'
        And I clicked the button with title 'Select a root Certificate Authority'
        And I clicked the div with text 'Org1 CA'
        And wait "3" seconds
        And I clicked the span with text 'Next'
        And I clicked the button with title 'org1admin'
        And I clicked the div with text 'org1admin'
        And I provided 'org1adminpw' for the 'Enter a secret' input
        And I provided 'Org1 MSP Admin' for the 'Enter name for the identity to be stored in your Wallet' input
        And I clicked the button with text 'Generate'
        And I clicked the button with text 'Export'
        And I clicked the button with text 'Next'
        And I click Create MSP definition button
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
		Then wait "3" seconds
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
