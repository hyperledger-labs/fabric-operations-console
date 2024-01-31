@support @regression @runonconsole
Feature: Verify miscellaneous cases of console works as expected

  Background: Login to console
    Given I go to the console
    And I am logged in
    And I am ready to get started
    And I am on the 'nodes' page

  Scenario: Run mustgather tool
    And I am on Help page
    Then wait "5" seconds
    And I clicked the button with text 'Start mustgather'
    Then wait "60" seconds
    And I clicked the div with text 'Download results'
    Then wait "10" seconds
    And I clicked the button with text 'Run again'
    Then wait "60" seconds
    And I clicked the div with text 'Delete mustgather pod and service'
    Then wait "5" seconds

  Scenario: Import peer, certificate authority, orderer and delete them
    And I am on the 'settings' page
    And I clicked the button with text 'Export'
    And I clicked the button with id 'export_button'
    Then wait "5" seconds
    And I clicked the button with text 'Import'
    And I upload file 'fixtures/test_data/Import/Node_Import.zip' to 'file-uploader' input
    And I clicked the button with id 'import_button'
    Then wait "60" seconds
    And I am on the 'nodes' page
    Then a tile with title 'Peer_Import' should have been created
    Then a tile with title 'CA_Import' should have been created
    Then a tile with title 'OS_Import' should have been created
    And I clicked the div with id 'ibp-tile-Peer_Import'
    And I clicked the button with id 'peer_import-sticky-delete-button'
    And I provided 'Peer_Import' for the 'Type here' input
    And I clicked the button with text 'Remove peer'
    Then wait "5" seconds
    And I clicked the div with id 'ibp-tile-CA_Import'
    And I clicked the button with id 'ca_import-sticky-delete-button'
    And I provided 'CA_Import' for the 'Type here' input
    And I clicked the button with text 'Remove Certificate Authority'
    Then wait "5" seconds
    And I clicked the div with id 'ibp-tile-OS_Import'
    And I clicked the button with id 'os_import_1-sticky-delete-button'
    And I provided 'OS_Import' for the 'Type here' input
    And I clicked the button with text 'Remove ordering service'
    Then wait "5" seconds

  Scenario: Deleting Peer Org1
	When I clicked the div with id 'ibp-tile-Peer Org1'
    And I clicked the button with id 'peerorg1-sticky-delete-button'
    And I provided 'Peer Org1' for the 'Type here' input
    And I clicked the button with id 'confirm_remove'
    Then wait "10" seconds
	And I am on the 'nodes' page
	Then the div with id 'ibp-tile-Peer Org1' does not exist on page

  Scenario: Deleting Org1 CA
	When I clicked the div with id 'ibp-tile-Org1 CA'
    And I clicked the button with id 'org1ca-sticky-delete-button'
    And I provided 'Org1 CA' for the 'Type here' input
    And I clicked the button with id 'confirm_remove'
    Then wait "10" seconds
    And I am on the 'nodes' page
	Then the div with id 'ibp-tile-Org1 CA' does not exist on page

  Scenario: Deleting Ordering Service
	When I clicked the div with id 'ibp-tile-Ordering Service'
    And I clicked the button with id 'orderingservicenode1-sticky-delete-button'
    And I provided 'Ordering Service' for the 'Type here' input
    And I clicked the button with id 'confirm_remove'
	#Force delete
	And I clicked the button with id 'confirm_remove'
    Then wait "10" seconds
    And I am on the 'nodes' page
	Then the div with id 'ibp-tile-Ordering Service' does not exist on page

  Scenario: Verify Version summary button
    And I am on the 'settings' page
    Then the element div with text 'Version summary' should be visible on page
    Then I clicked the button with id 'version_export_button'
