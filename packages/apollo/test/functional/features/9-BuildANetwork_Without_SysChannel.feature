@saas @software @saas-minimal
Feature: Build a network without system channel

	Scenario: When creating an ordering service without system channel
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'nodes' page
        And I clicked the button with title 'Add ordering service'
        And I clicked Create an ordering service
        And I clicked the button with text 'Next'
        Then wait "3" seconds
        And I provided 'No_SysCh_OS' for the 'Enter an ordering service display name' input
        And I select radio button with text "Without a system channel"
        Then wait "2" seconds
        And I clicked the button with text 'Next'
        Then wait "3" seconds
        And I selected 'Ordering Service CA' value from the 'div#saasCA-saas_ca' dropdown
        Then wait "3" seconds
        And I selected 'OS1' from the 'div#saasCA-enroll_id' dropdown
        And I provided 'OS1pw' for the 'Enter a secret' input
        And I selected 'Ordering Service MSP' value from the 'div#saasCA-admin_msp' dropdown
        And I selected '2.4' matching value from the 'div#importOrdererModal-version-version' dropdown
        And I clicked the button with text 'Next'
        Then wait "5" seconds
        And I selected 'Ordering Service MSP Admin' value from the 'div#importOrdererModal-identity' dropdown
        And I clicked the button with text 'Next'
        When I click the button with text 'Add ordering service'
        Then I should see a success toast which says "Congratulations! You have successfully created 'No_SysCh_OS'."
		Then wait "15" seconds
        And the orderer with name 'No_SysCh_OS' should have started successfully

	Scenario: When creating a channel using orderer without system channel (channel3)
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'channels' page
        And I clicked the button with title 'Create channel'
        And I clicked the checkbox with text 'Advanced channel configuration'
        And I clicked the button with text 'Next'
        And I provided 'channel3' for the 'Enter a name for your channel' input
		And I selected 'No_SysCh_OS' matching value from the 'div#channelModal-details-selectedOrderer' dropdown
        And I clicked the button with text 'Next'
        And I selected 'Org1 MSP' from the 'div#channelModal-msps-selectedOrg' dropdown
        And I clicked the button with text 'Add'
        And I clicked the 'admin' role for 'org1msp'
        And I selected 'Org2 MSP' from the 'div#channelModal-msps-selectedOrg' dropdown
        And I clicked the button with text 'Add'
        And I clicked the 'admin' role for 'org2msp'
        And I clicked the button with text 'Next'
        And I selected '1 out of 2' from the 'div#channelModal-custom-policy-customPolicy' dropdown
        And I clicked the button with text 'Next'
		And I selected 'Ordering Service MSP (osmsp)' matching value from the 'div#channelModal-msps-selectedOrg' dropdown
		Then wait "1" seconds
        And I clicked the button with text 'Add'
        And I clicked the 'admin' role for 'osmsp'
        And I clicked the button with text 'Next'
        And I selected '2.0.0' value from the 'div#channelModal-capabilities-application-selectedApplicationCapability' dropdown
        And I clicked the button with text 'Next'
        And I clicked the button with text 'Next'
        And I clicked the button with text 'Next'
        And I clicked the button with text 'Next'
        And I clicked the button with text 'Next'
        And I clicked the button with text 'Next'
        When I click the button with text 'Create channel'
		Then wait "3" seconds
		Then I should see Create Genesis screen with message to to join orderer
		And I clicked the button with text 'Continue'
		Then wait "3" seconds
        When I click the button with text 'Join channel'
		Then wait "5" seconds
		Then I should see a success toast which says "You have successfully joined channel3."

	Scenario: Verify Orderer without system channel has joined channel (channel3)
		Given I go to the console
		And I am logged in
		And I am ready to get started
		And I am on the 'nodes' page
		And I clicked the 'No_SysCh_OS' orderer
		Then wait "5" seconds
		And the channel tile with name 'channel3' should be available

	Scenario: When joining a channel (channel3)
		Given I go to the console
		And I am logged in
		And I am ready to get started
		And I am on the 'channels' page
		Then wait "5" seconds
		When I clicked the button with id 'btn-channels-join_channel'
		And I selected 'No_SysCh_OS' value from the 'div#joinChannelModal-orderer-orderer' dropdown
		And I clicked the button with text 'Next'
        And I provided 'channel3' for the 'Enter the channel name' input
		And I clicked the button with text 'Next'
        And I clicked the peer 'Peer Org1' select item
        And I clicked the peer 'Peer Org2' select item
        When I clicked the button with text 'Join channel'
        Then I should see a success toast which says "You have successfully joined channel3."

    Scenario: Install and Propose 2.0 Smart Contract as Org1
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'channels' page
        And I clicked the tile with title 'channel3'
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
        And I clicked the tile with title 'channel3'
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
        And I clicked the tile with title 'channel3'
        And I clicked the tile with title 'fabcar'
        And I clicked the button with text 'Begin commit process'
        And I selected 'Org1 MSP (org1msp)' value from the 'div#commit_chaincode-selected_msp' dropdown
        And I selected 'Org1 MSP Admin' value from the 'div#commit_chaincode-selected_identity' dropdown
        And I clicked the button with text 'Commit smart contract'
        Then the chaincode with name 'fabcar' should have been created in 'Committed' state
