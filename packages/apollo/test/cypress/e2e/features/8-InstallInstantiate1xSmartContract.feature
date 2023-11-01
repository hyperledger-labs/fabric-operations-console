@support @regression @runonconsole
Feature: 1.x Smart Contract flow

    Background: Login to console
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'smart_contracts' page

    Scenario: Install 1.x Smart Contract on Org1 and Org2 peers
        And I clicked the button with title 'Install smart contract'
        And I upload file 'fixtures/test_data/chaincodes/fabcar_go_2.1.1.cds' to 'file-uploader-cds' input
        And I clicked the button with text 'Next'
        And I click label with property 'for' and value 'installChaincode-peer-peerorg1'
        And I click label with property 'for' and value 'installChaincode-peer-peerorg2'
        And I clicked the button with id 'submit'
        Then wait "20" seconds
        Then I should see button with id 'overflow-installed-fabcar_2.1.1'

    Scenario: Instantiate 1.x Smart Contract on channel1
        And I clicked the button with id 'overflow-installed-fabcar_2.1.1'
        And I clicked the button with id 'instantiate_modal'
        And I clicked the button with title 'Select channel'
        And I clicked the div with text 'channel1'
        And I clicked the button with id 'next'
        And I clicked the button with id 'next'
        And I clicked the button with id 'next'
        And I clicked the button with text 'Instantiate smart contract'
        Then wait "10" seconds
        Then I should see button with id 'overflow-installed-fabcar_2.1.1'
		Then wait "5" seconds
        Then I should see a smart contract 'fabcar' with version '2.1.1' in channel 'channel1'
