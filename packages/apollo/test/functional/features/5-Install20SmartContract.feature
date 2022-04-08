@saas @software @saas-minimal
Feature: 2.0 Lifecycle Flow

    Scenario: Install and Propose 2.0 Smart Contract as Org1
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'channels' page
        And I clicked the tile with title 'channel2'
        Then wait "2" seconds
        And I clicked the button with title 'Propose smart contract definition'
        And I selected 'Org1 MSP (org1msp)' value from the 'div#propose_chaincode-selected_msp' dropdown
        And I selected 'Org1 MSP Admin' value from the 'div#propose_chaincode-selected_identity' dropdown
        And I clicked the button with text 'Next'
        And I upload file '/assets/chaincodes/fabcar_1.0.0.tgz' to 'pkg-file-uploader' input
        And I clicked the button with text 'Next'
        And I clicked the button with text 'Next'
        And I clicked the button with text 'Next'
        And I clicked the button with text 'Next'
        And I clicked the button with text 'Next'
        And I clicked the button with text 'Propose'
        Then the chaincode with name 'fabcar' should have been created in 'Proposed' state

    Scenario: Approve Smart Contact as Org2
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'channels' page
        And I clicked the tile with title 'channel2'
        And I clicked the tile with title 'fabcar'
        And I clicked the button with text 'Begin approval process'
        And I selected 'Org2 MSP Admin' from the 'div#proposal-identity-form' dropdown
        And I clicked the button with text 'Next'
        And I upload file '/assets/chaincodes/fabcar_1.0.0.tgz' to 'pkg-file-uploader' input
        And I clicked the button with text 'Next'
        And I clicked the button with text 'Next'
        And I clicked the button with text 'Approve smart contract'
        Then the chaincode with name 'fabcar' should have been created in 'Ready to commit' state

    Scenario: Commit Smart Contact as Org1
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'channels' page
        And I clicked the tile with title 'channel2'
        And I clicked the tile with title 'fabcar'
        And I clicked the button with text 'Begin commit process'
        And I selected 'Org1 MSP (org1msp)' value from the 'div#commit_chaincode-selected_msp' dropdown
        And I selected 'Org1 MSP Admin' value from the 'div#commit_chaincode-selected_identity' dropdown
        And I clicked the button with text 'Commit smart contract'
        Then the chaincode with name 'fabcar' should have been created in 'Committed' state
