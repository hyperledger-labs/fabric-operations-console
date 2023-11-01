@support @regression @runonconsole
Feature: Verify miscellaneous cases of console works as expected

  Background: Login to console
    Given I go to the console
    And I am logged in
    And I am ready to get started
    And I am on the 'nodes' page

  Scenario: Run mustgather tool
    And I am on Help page
    Then wait "2" seconds
    And I clicked the button with text 'Start mustgather'
    Then wait "30" seconds
    And I clicked the div with text 'Download results'
    Then wait "10" seconds
    And I clicked the button with text 'Run again'
    Then wait "30" seconds
    And I clicked the div with text 'Delete mustgather pod and service'
    Then wait "5" seconds
    And I clicked the button with text 'Start mustgather'

  Scenario: Import peer, certificate authority, orderer and delete them
    And I am on the 'settings' page
    And I clicked the button with text 'Export'
    And I clicked the button with id 'export_button'
    Then wait "5" seconds
    And I clicked the button with text 'Import'
    And I upload file 'fixtures/test_data/Import/Node_Import.zip' to 'file-uploader' input
    And I clicked the button with id 'import_button'
    Then wait "30" seconds
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
