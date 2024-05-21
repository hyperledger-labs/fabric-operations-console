@support @regression @runonconsole
Feature: Build a network without system channel

    Background: Login to console
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'nodes' page

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

#   Scenario: Upgrading Peer and Ordering Service node to latest
#       And I clicked the 'Peer Org1' peer
#       And I clicked the button with id 'ibp-peer-usage'
#       And I clicked the button with id 'patch_node'
#       And I clicked the checkbox with text 'I understand this is a potentially breaking change. Upgrade anyway.'
#       And I clicked the button with id 'next'
#       And I provided 'Peer Org1' for the 'Type node name here' input
#       And I clicked the button with text 'Upgrade Fabric version'
#       Then wait "20" seconds
#       And I am on the 'nodes' page
#       And I clicked the 'Ordering Service' orderer
#       Then wait "10" seconds
#       And I clicked the button with id 'ibp-orderer-nodes'
#       And I clicked the div with id 'ibp-tile-Ordering Service_1'
#       And I clicked the button with text 'Upgrade version'
#       And I clicked the button with id 'next'
#       And I provided 'Ordering Service_1' for the 'Type node name here' input
#       And I clicked the button with text 'Upgrade Fabric version'
#       Then wait "10" seconds
#       And I am on the 'nodes' page

  Scenario: When creating an ordering service without system channel
        And I clicked the button with title 'Add ordering service'
        And I clicked the button with id 'next'
        Then wait "3" seconds
        And I provided 'No_SysCh_OS' for the 'Enter an ordering service display name' input
        And I clicked the span with text 'Without a system channel'
        Then wait "2" seconds
        And I clicked the button with id 'next'
        Then wait "3" seconds
        And I clicked the button with title 'Select CA'
        And I clicked the dropdown item 'Ordering Service CA' with class '.bx--list-box__menu-item__option'
        Then wait "3" seconds
        And I clicked the button with text 'OS1'
        And I clicked the dropdown item 'OS1' with class '.bx--list-box__menu-item__option'
        And I provided 'OS1pw' for the 'Enter a secret' input
        And I clicked the button with title 'Select an MSP'
        And I clicked the dropdown item 'Ordering Service MSP' with class '.bx--list-box__menu-item__option'
        And I clicked the button with title 'Select a Fabric version'
        And I clicked the dropdown item '2.5' with class '.bx--list-box__menu-item__option'
        And I clicked the button with id 'next'
        Then wait "3" seconds
        And I clicked the button with title 'Please select an identity from your wallet'
        And I clicked the dropdown item 'Ordering Service MSP Admin' with class '.bx--list-box__menu-item__option'
        And I clicked the button with id 'next'
        When I clicked the button with id 'submit'
        Then wait "6" seconds
        Then I should see a success toast with class '.bx--toast-notification__subtitle' which says "Congratulations! You have successfully created 'No_SysCh_OS'."
        And the orderer with name 'Ordering Service' should have started successfully

	Scenario: When creating a channel using orderer without system channel
        And I am on the 'channels' page
        And I clicked the button with title 'Create channel'
        And I clicked the checkbox with text 'Advanced channel configuration'
        And I clicked the span with text 'Next'
        And I provided 'channel5' for the 'Enter a name for your channel' input
        And I clicked the button with title 'Select from available ordering services'
        And I clicked the div with id 'downshift-0-item-0'
		Then wait "5" seconds
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
        And I clicked the div with id 'selectedOrg'
        And I clicked the div with text 'Ordering Service MSP (osmsp)'
        And I clicked the button with text 'Add'
        And I clicked the 'admin' role for 'osmsp'
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
        And I clicked the span with text 'Next'
        Then I clicked Create channel button
		Then wait "3" seconds
		Then I should see Create Genesis screen with message to to join orderer
		And I clicked the button with text 'Continue'
		Then wait "3" seconds
        When I clicked the button with id 'submit'
		Then wait "5" seconds
        Then I should see a success toast with class '.bx--toast-notification__title' which says "You have successfully joined channel5."
		Then wait "3" seconds

	Scenario: Verify Orderer without system channel has joined channel
		And I clicked the 'No_SysCh_OS' orderer
		Then wait "5" seconds
        Then I should see div with id 'ibp-tile-channel5'

	Scenario: When joining a channel
		And I am on the 'channels' page
		Then wait "5" seconds
		When I clicked the button with id 'btn-channels-join_channel'
		And I clicked the button with id 'next'
        And I provided 'channel5' for the 'Enter the channel name' input
		And I clicked the button with id 'next'
        And I clicked the span with text 'Peer Org1'
        And I clicked the span with text 'Peer Org2'
        When I clicked the button with id 'submit'
        Then I should see a success toast with class '.bx--toast-notification__title' which says "You have successfully joined channel5."

    Scenario: Install and Propose 2.0 Smart Contract as Org1
        And I am on the 'channels' page
        And I clicked the div with id 'ibp-tile-channel5'
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
        And I clicked the button with id 'next'
        And I clicked the button with id 'next'
        And I clicked the button with id 'next'
        And I clicked the button with id 'submit'
        Then wait "30" seconds
        Then the chaincode with name 'fabcar' should have been created in 'Proposed' state

    Scenario: Approve Smart Contact as Org2
        And I am on the 'channels' page
        And I clicked the div with id 'ibp-tile-channel5'
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
        And I clicked the div with id 'ibp-tile-channel5'
        Then wait "5" seconds
        And I clicked the div with text 'fabcar'
        And I clicked the button with text 'Begin commit process'
        And I clicked the button with title 'Select an organization'
        And I clicked the div with text 'Org1 MSP (org1msp)'
        And I clicked the button with title 'Select an identity'
        And I clicked the div with text 'Org1 MSP Admin'
        And I clicked the button with text 'Commit smart contract'
        Then the chaincode with name 'fabcar' should have been created in 'Committed' state

	Scenario: Updating channel5 as Org2
        And I am on the 'channels' page
		And I clicked the div with id 'ibp-tile-channel5'
		Then wait "5" seconds
        And I clicked the button with id 'channel5-sticky-settings-button'
        And I clicked the button with title 'Select the MSP'
        And I clicked the div with text 'Org2 MSP (org2msp)'
		And I clicked the button with title 'Select an identity'
		And I clicked the div with text 'Org2 MSP Admin'
		Then wait "1" seconds
        And I clicked the span with text 'Next'
        And I clicked the span with text 'Next'
        And I clicked the span with text 'Next'
        And I clicked the span with text 'Next'
        And I clicked the span with text 'Next'
        And I clicked the span with text 'Next'
		And I provided '13' for input field with id 'channelModal-block-params-absolute_max_bytes_mb-input-for-slider'
		And I provided '510' for input field with id 'channelModal-block-params-max_message_count-input-for-slider'
        And I clicked the span with text 'Next'
        And I clicked the button with title 'Select the MSP'
        And I clicked the div with text 'Ordering Service MSP (osmsp)'
        And I clicked the span with text 'Next'
        And I clicked the span with text 'Next'
        And I clicked the span with text 'Update channel'
        Then I should see a success toast with class '.bx--toast-notification__title' which says 'You have successfully initiated a request to update channel channel5.'
		# View channel configuration updates
		When I clicked the button with id 'ibp-header-signature-collection-icon'
		And I clicked element with class '.ibp-signature-collection-notification-link-text'
		Then the element div with text 'Updated in channel configuration' should be visible on page
		Then the element div with text 'Block cutting parameters' should be visible on page
		And I clicked the button with id 'next'
		And I clicked the button with title 'Select identity to sign with'
		And I clicked the div with text 'Ordering Service MSP Admin'
		And I clicked the button with id 'submit'
		# Review and update channel configuration
		And I clicked element with class '.ibp-signature-collection-notification-link-text'
		Then the element div with text 'Updated in channel configuration' should be visible on page
		Then the element div with text 'Block cutting parameters' should be visible on page
		And I clicked the button with id 'next'
		And I clicked the button with title 'Select MSP'
		And I clicked the div with text 'Org2 MSP'
		Then wait "1" seconds
		And I clicked the button with title 'Select an identity'
		And I clicked the div with text 'Org2 MSP Admin'
		And I clicked the button with id 'submit'
		Then the element div with text 'No approval notifications' should be visible on page
