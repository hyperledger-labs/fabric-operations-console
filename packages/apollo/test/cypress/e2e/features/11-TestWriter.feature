@support @runonconsole @regression @usermanagement
Feature: Verify allowed functions for Writer user

  Background: Login to console
    Given I go to the console
	And I am logged in as 'writeruser@ibm.com' user
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

  	Scenario: Writer should be able to import components, writer is not allowed to create new components
		And I am ready to get started
		And I am on the 'nodes' page
		And I clicked the button with title 'Add peer'
		#Then Checkbox should not exist with 'Create a peer'
		Then Checkbox should be hidden with id 'deploy-id'
		Then Checkbox should be visible with 'Import an existing peer'
		And I clicked the button with text 'Cancel'
		And I am on the 'nodes' page
		And I clicked the button with title 'Add Certificate Authority'
		#Then Checkbox should not exist with 'Create a Certificate Authority'
		Then Checkbox should be hidden with id 'deploy-id'
		Then Checkbox should be visible with 'Import an existing Certificate Authority'
		And I clicked the button with text 'Cancel'
		And I am on the 'nodes' page
		And I clicked the button with title 'Add ordering service'
		#Then Checkbox should not exist with 'Create an ordering service'
		Then Checkbox should be hidden with id 'deploy-id'
		Then Checkbox should be visible with 'Import an existing ordering service'
		And I clicked the button with text 'Cancel'
		And I am on the 'nodes' page

	Scenario: Writer is not allowed to modify Access
		And I am on the 'access' page
		Then Message should be displayed 'Contact a user with the "Manager" role'

	Scenario: On the Settings page Writer is allowed import and export data
		And I am on the 'settings' page
		Then Button should be enabled for id 'data_export_button'
		Then Button should be enabled for id 'data_import_button'

	Scenario: For Writers registering new user should be enabled
		And I am on the 'nodes' page
		And I clicked the 'Org1 CA' certificate authority
		Then Button should be enabled for title 'Register user'
		Then Button should be enabled for id 'btn-ca_users-reenroll'

	# Writer is allowed to import Ordering Services and Ordering Nodes
	Scenario: Renaming 'Ordering Service' to 'Ordering Service Org'
		And I navigate to the 'nodes' page
		And I clicked the node 'Ordering Service'
		And I clicked the button with id 'orderingservicenode1-sticky-settings-button'
		And I provided 'Ordering Service Org' for input field with id 'ordererModal-display_name'
		And I clicked the button with id 'update_peer'

	Scenario: Importing Ordering Service
		And I navigate to the 'nodes' page
		And I clicked the button with title 'Add ordering service'
		And I clicked the div with text 'Import an existing ordering service'
		And I clicked the button with id 'next'
		And I clicked the div with text 'Add file'
		And I upload file 'fixtures/test_data/Import/Ordering_Service_orderer_to_import.json'
		Then wait "5" seconds
		And I clicked the button with id 'submit'
		Then wait "15" seconds

	Scenario: Deleting imported Ordering Service_1
		And I navigate to the 'nodes' page
		And I clicked the node 'Ordering Service'
		And I clicked the button with id 'ibp-orderer-nodes'
		And I clicked the node 'Ordering Service_1'
		And I clicked the button with id 'orderingservice_1-sticky-delete-button'
		And I provided 'Ordering Service_1' for the 'Type here' input
		And I clicked the button with id 'confirm_remove'

	Scenario: Importing Ordering Service_1
		And I navigate to the 'nodes' page
		And I clicked the node 'Ordering Service'
		And I clicked the button with id 'ibp-orderer-nodes'
		And I clicked the button with title 'Add another node'
		And I clicked the div with text 'Import an existing ordering node'
		And I clicked the button with id 'next'
		And I clicked the div with text 'Add file'
		And I upload file 'fixtures/test_data/Import/Ordering_Service_1_orderer_to_import.json'
		Then wait "5" seconds
		And I clicked the button with id 'submit'

	Scenario: Deleting imported Ordering Service
		And I navigate to the 'nodes' page
		And I clicked the 'Ordering Service' orderer
		And I clicked the button with id 'orderingservice_1-sticky-delete-button'
		And I provided 'Ordering Service' for the 'Type here' input
		And I clicked the button with id 'confirm_remove'

	Scenario: Renaming 'Ordering Service Org' to 'Ordering Service'
		And I navigate to the 'nodes' page
		And I clicked the node 'Ordering Service Org'
		And I clicked the button with id 'orderingservicenode1-sticky-settings-button'
		And I provided 'Ordering Service' for input field with id 'ordererModal-display_name'
		And I clicked the button with id 'update_peer'
		And I navigate to the 'nodes' page

	Scenario: Writer should be able to export, import and delete imported Peers or CAs
		And I navigate to the 'nodes' page
		And I clicked the node '<componentName>'
		And I clicked the button with id '<buttonPrefix>-sticky-download-button'

		# Scenario: Renaming Peer/CA
		And I navigate to the 'nodes' page
		And I clicked the node '<componentName>'
		And I clicked the button with id '<buttonPrefix>-sticky-settings-button'
		And I provided '<componentName> Org' for input field with id '<componentId>Modal-display_name'
		And I clicked the button with id 'update_<componentId>'

		# Scenario: Importing Peer/CA
		And I navigate to the 'nodes' page
		And I clicked the button with title 'Add <componentTitle>'
		And I clicked the div with text 'Import an existing <componentTitle>'
		And I clicked the button with id 'next'
		And I clicked the div with text 'Add file'
		And I upload file 'cypress/downloads/<componentName>_<componentId>.json'
		Then wait "5" seconds
		And I clicked the button with id 'submit'

		# Scenario: Deleting imported Peer/CA
		When I am logged in
		And I am ready to get started
		And I navigate to the 'nodes' page
		And I clicked the node '<componentName>'
		And I clicked the button with id '<buttonPrefix>_0-sticky-delete-button'
		And I provided '<componentName>' for the 'Type here' input
		And I clicked the button with id 'confirm_remove'

		# Scenario: Renaming Peer/CA
		And I navigate to the 'nodes' page
		And I clicked the node '<componentName> Org'
		And I clicked the button with id '<buttonPrefix>-sticky-settings-button'
		And I provided '<componentName>' for input field with id '<componentId>Modal-display_name'
		And I clicked the button with id 'update_<componentId>'
		And I navigate to the 'nodes' page

    # Components created by Cypress
    Examples:
      | componentTitle        | componentId | componentName   | buttonPrefix  |
      | Certificate Authority | ca          | Ordering Service CA | orderingserviceca |
      | Certificate Authority | ca          | Org1 CA         | org1ca        |
      | Certificate Authority | ca          | Org2 CA         | org2ca        |
      # | peer                  | peer        | Peer Org1       | peerorg1      |
      # | peer                  | peer        | Peer Org2       | peerorg2      |

	Scenario: For Writers updating chaincodes should be enabled
		And I am on the 'channels' page
		And I clicked the div with id 'ibp-tile-channel2'
		Then wait "5" seconds
		And I clicked the div with text 'fabcar'
		Then Text should exist 'Update package details'
		Then Button should be enabled for id 'update-approval-org1msp'
		Then wait "10" seconds
		Then I clicked the button with id 'cancel'
