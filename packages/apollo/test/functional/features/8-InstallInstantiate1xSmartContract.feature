@saas @software @saas-minimal
Feature: 1.x Smart Contract flow
    Scenario: Install 1.x Smart Contract on Org1 and Org2 peers
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'smart_contracts' page
        And I clicked the button with title 'Install smart contract'
        And I upload file '/assets/chaincodes/fabcar_go_2.1.1.cds' to 'file-uploader-cds' input
        And I clicked the button with text 'Next'
        And I clicked the peer 'Peer Org1' select item
        And I clicked the peer 'Peer Org2' select item
        And I clicked the button with text 'Install smart contract'
        Then wait "10" seconds
        Then I should see a button with id 'overflow-installed-fabcar_2.1.1'

    Scenario: Instantiate 1.x Smart Contract on channel1
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'smart_contracts' page
        Then wait "5" seconds
        And I clicked the button with id 'overflow-installed-fabcar_2.1.1'
        And I clicked the button with id 'instantiate_modal'
        And I selected 'channel1' value from the 'div#chaincodeModal-channel-selectedChannel' dropdown
        And I clicked the button with text 'Next'
        And I clicked the button with text 'Next'
        And I clicked the button with text 'Next'
        And I clicked the button with text 'Instantiate smart contract'
        Then wait "10" seconds
        Then I should see a button with id 'overflow-installed-fabcar_2.1.1'
		Then wait "5" seconds
        Then I should see a smart contract 'fabcar' with version '2.1.1' in channel 'channel1'
