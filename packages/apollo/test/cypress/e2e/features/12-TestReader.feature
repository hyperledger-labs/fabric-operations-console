@support @runonconsole @regression @usermanagement
Feature: Verify allowed functions for Reader user

  Background: Login to console
    Given I go to the console
	And I am logged in as 'readeruser@ibm.com' user
    And I am ready to get started

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

	Scenario: Reader is not allowed to create Peers, CAs and Ordering Services
		And I am on the 'nodes' page
		Then Button should be disabled for title 'Add peer'
		Then Button should be disabled for title 'Add Certificate Authority'
		Then Button should be disabled for title 'Add ordering service'

	Scenario: Reader is not allowed to create or join channels
		And I am on the 'channels' page
		Then Button should be disabled for title 'Create channel'
		Then Button should be disabled for title 'Join channel'

	Scenario: Reader is not allowed to install smart contracts
		And I am on the 'smart_contracts' page
		Then Button should be disabled for title 'Install smart contract'

	Scenario: Reader is not allowed to create or import organizations
		And I am on the 'organizations' page
		Then Button should be disabled for title 'Create MSP definition'
		Then Button should be disabled for title 'Import MSP definition'

	Scenario: Reader is not allowed to modify Access
		And I am on the 'access' page
		Then Message should be displayed 'Contact a user with the "Manager" role'

	Scenario: On the Settings page Reader is allowed export data, import button should not be visible
		And I am on the 'settings' page
		Then Button should be enabled for id 'data_export_button'
		Then Text should not exist 'Import'

	Scenario: For Readers registering new user should be disabled
		And I am on the 'nodes' page
		And I clicked the 'Org1 CA' certificate authority
		Then Button should be disabled for id 'btn-ca_users-register_user'
		Then Button should be disabled for id 'btn-ca_users-reenroll'

	Scenario: For Readers updating chaincodes should not be enabled
		And I am on the 'channels' page
		And I clicked the div with id 'ibp-tile-channel2'
		Then wait "5" seconds
		And I clicked the div with text 'fabcar'
		Then Text should not exist 'Update package details'
		Then wait "10" seconds
		Then I clicked the button with id 'cancel'
