@support @regression
Feature: 2.0 Lifecycle Flow

    Background: Login to console
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'channels' page
        And I clicked the div with id 'ibp-tile-channel2'
        Then wait "5" seconds

    Scenario: Install and Propose 2.0 Smart Contract as Org1
        And I clicked the button with title 'Propose smart contract definition'
        And I clicked the button with title 'Select an organization'
        And I clicked the div with text 'Org1 MSP (org1msp)'
        And I clicked the button with title 'Select an identity'
        And I clicked the div with text 'Org1 MSP Admin'
        And I clicked the button with id 'next'
        And I upload file 'cypress/fixtures/test_data/chaincodes/fabcar_1.0.0.tgz' to 'pkg-file-uploader' input
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
        And I clicked the div with text 'fabcar'
        And I clicked the button with text 'Begin approval process'
        And I clicked the button with title 'Select an identity'
        And I clicked the div with text 'Org2 MSP Admin'
        And I clicked the button with id 'next'
        And I upload file 'cypress/fixtures/test_data/chaincodes/fabcar_1.0.0.tgz' to 'pkg-file-uploader' input
        And I clicked the button with id 'next'
        And I clicked the button with id 'next'
        And I clicked the button with id 'submit'
        Then the chaincode with name 'fabcar' should have been created in 'Ready to commit' state

    Scenario: Commit Smart Contact as Org1
        And I clicked the div with text 'fabcar'
        And I clicked the button with text 'Begin commit process'
        And I clicked the button with title 'Select an organization'
        And I clicked the div with text 'Org1 MSP (org1msp)'
        And I clicked the button with title 'Select an identity'
        And I clicked the div with text 'Org1 MSP Admin'
        And I clicked the button with text 'Commit smart contract'
        Then the chaincode with name 'fabcar' should have been created in 'Committed' state
