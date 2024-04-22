@support @regression @runonconsole @auditlog
Feature: Verify Audit Log functionality works as expected

  Background: Login to console
    Given I go to the console
    And I am logged in
    And I am ready to get started

  Scenario: Search activity log with manager user
    When I clicked the div with id 'test__navigation--item--audit_logs'
	Then I should see table with id 'table-audit_logs'
	#Login entry
	And I provided 'user logging in - local' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'user logging in - local' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'POST:/api/v3/auth/login' and id 'audit-logs-api_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	#Change password entry
	When I provided 'user is changing their password' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'user is changing their password' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'PUT:/api/v3/permissions/users/password' and id 'audit-logs-api_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'

  Scenario: Search activity log for adding CA
    When I clicked the div with id 'test__navigation--item--audit_logs'
	Then I should see table with id 'table-audit_logs'
	Then I reload the page
	#Adding Org1 CA and Org2 CA
	When I provided 'adding new fabric-ca "org2ca"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'adding new fabric-ca "org2ca"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	When I provided 'adding new fabric-ca "org1ca"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'adding new fabric-ca "org1ca"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'

  Scenario: Search activity log for adding Peer
    When I clicked the div with id 'test__navigation--item--audit_logs'
	Then I should see table with id 'table-audit_logs'
	Then I reload the page
	# adding new fabric-peer "peerorg1"
	Then I reload the page
	When I provided 'adding new fabric-peer "peerorg1"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'adding new fabric-peer "peerorg1"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'

  Scenario: Search activity log for identity and Ordering Service
    When I clicked the div with id 'test__navigation--item--audit_logs'
	Then I should see table with id 'table-audit_logs'
	Then I reload the page
	# adding identity to user's wallet
	When I provided "adding identity to user's wallet" for input field with class ".bx--search-input"
	Then I should see audit log row with text "adding identity to user's wallet" and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	# registering identity "org1admin" on CA "org1ca"
	When I provided 'registering identity "org1admin" on CA "org1ca"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'registering identity "org1admin" on CA "org1ca"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	# registering identity "peer1" on CA "org1ca" -- POST:/api/v1/identities
	When I provided 'registering identity "peer1" on CA "org1ca"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'registering identity "peer1" on CA "org1ca"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'POST:/api/v1/identities' and id 'audit-logs-api_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	# exporting component "Org1 MSP Admin" --
	Then I reload the page
	When I provided 'exporting component "Org1 MSP Admin"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'exporting component "Org1 MSP Admin"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	# adding new msp "org1msp" -- POST:/api/v3/components
	When I provided 'adding new msp "org1msp"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'adding new msp "org1msp"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'POST:/api/v3/components' and id 'audit-logs-api_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	# adding new fabric-orderer "orderingservicenode1"
	When I provided 'adding new fabric-orderer "orderingservicenode1"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'adding new fabric-orderer "orderingservicenode1"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	Then I am logged out from console

  Scenario: Search activity log for creating channel and joining channel
    When I clicked the div with id 'test__navigation--item--audit_logs'
	Then I should see table with id 'table-audit_logs'
	# peers"Peer Org1", "Peer Org2" havejoined the channel "channel2"
	When I provided 'peers "Peer Org1", "Peer Org2" have joined the channel "channel2"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'peers "Peer Org1", "Peer Org2" have joined the channel "channel2"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	Then I reload the page
	# updating channel "testchainid" - MSP "osmsp"
	When I provided 'updating channel "testchainid" - MSP "osmsp"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'updating channel "testchainid" - MSP "osmsp"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	# creating channel "channel2" - MSP "org1msp"
	When I provided 'creating channel "channel1" - MSP "org1msp"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'creating channel "channel1" - MSP "org1msp"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	Then I reload the page
	# creating channel "channel1" - MSP "org1msp"
	When I provided 'creating channel "channel1" - MSP "org1msp"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'creating channel "channel1" - MSP "org1msp"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	Then I reload the page
	# creating a config block doc - channel "channel5" - POST:/api/v3/configblocks
	When I provided 'creating a config block doc - channel "channel5"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'creating a config block doc - channel "channel5"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'POST:/api/v3/configblocks' and id 'audit-logs-api_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	# archiving a config block doc - channel "channel5" -- PUT:/api/v3/configblocks/8df504bac7bf7f9616627e91470a0253
	When I provided 'archiving a config block doc - channel "channel5"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'archiving a config block doc - channel "channel5"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'

  Scenario: Search activity log for updating channel and installing chaincode
    When I clicked the div with id 'test__navigation--item--audit_logs'
	Then I should see table with id 'table-audit_logs'
	# creating a signature collection for channel "channel2" -- POST:/api/v3/signature_collections
	When I provided 'creating a signature collection for channel "channel2" ' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'creating a signature collection for channel "channel2"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'POST:/api/v3/signature_collections' and id 'audit-logs-api_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	Then I reload the page
	# editing a signature collection for channel "channel2" -- PUT:/api/v3/signature_collections/sc_7bc9843a-02d7-4f04-94ac-763241c1a949
	When I provided 'editing a signature collection for channel "channel2"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'editing a signature collection for channel "channel2"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'PUT:/api/v3/signature_collections' and id 'audit-logs-api_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	Then I reload the page
	# updating channel "channel2" - MSP "org2msp"
	When I provided 'updating channel "channel2" - MSP "org2msp"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'updating channel "channel2" - MSP "org2msp"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	# installing chaincode "fabcar" @ "2.1.1" on peer
	When I provided 'installing chaincode "fabcar" @ "2.1.1" on peer' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'installing chaincode "fabcar" @ "2.1.1" on peer' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	Then I reload the page
	# instantiating chaincode "fabcar" @ "2.1.1" on channel "channel1"
	When I provided 'instantiating chaincode "fabcar" @ "2.1.1" on channel "channel1"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'instantiating chaincode "fabcar" @ "2.1.1" on channel "channel1"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	# editing component "peerorg1" - "version", "replicas", "ignore_warnings"
	When I provided 'editing component "peerorg1" - "version", "replicas", "ignore_warnings"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'editing component "peerorg1" - "version", "replicas", "ignore_warnings"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	# editing component "orderingservicenode1" - "version", "replicas"
	Then I reload the page
	When I provided 'editing component "orderingservicenode1" - "version", "replicas"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'editing component "orderingservicenode1" - "version", "replicas"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'

  Scenario: Search activity log for export and import
    When I clicked the div with id 'test__navigation--item--audit_logs'
	Then I should see table with id 'table-audit_logs'
	# bulk export of 10 components
	When I provided 'bulk export of 10 components' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'bulk export of 10 components' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	# importing 4 items from zip
	When I provided 'importing 4 items from zip' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'importing 4 items from zip' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'

  Scenario: Search activity log for importing CA, Peer and Ordering Service node
    When I clicked the div with id 'test__navigation--item--audit_logs'
	Then I should see table with id 'table-audit_logs'
	# adding new msp "ca_importmsp" - POST:/api/v3/components
	When I provided 'adding new msp "ca_importmsp"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'adding new msp "ca_importmsp"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'POST:/api/v3/components' and id 'audit-logs-api_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	# adding new fabric-peer "peer_import" -- POST:/api/v3/components
	When I provided 'adding new fabric-peer "peer_import"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'adding new fabric-peer "peer_import"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'POST:/api/v3/components' and id 'audit-logs-api_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	# adding new fabric-orderer "os_import_1"-- POST:/api/v3/components
	When I provided 'adding new fabric-orderer "os_import_1"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'adding new fabric-orderer "os_import_1"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'POST:/api/v3/components' and id 'audit-logs-api_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	# adding new fabric-ca "ca_import" -- POST:/api/v3/components
	When I provided 'adding new fabric-ca "ca_import"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'adding new fabric-ca "ca_import"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'POST:/api/v3/components' and id 'audit-logs-api_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'

  Scenario: Search activity log for deleting CA, Peer and Ordering Service node
    When I clicked the div with id 'test__navigation--item--audit_logs'
	Then I should see table with id 'table-audit_logs'
	# deleting fabric-orderer "os_import_1" - DELETE:/api/v3/components/os_import_1
	When I provided 'removing fabric-orderer "os_import_1"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'removing fabric-orderer "os_import_1"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'DELETE:/api/v3/components/os_import_1' and id 'audit-logs-api_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	# deleting fabric-ca "ca_import" - DELETE:/api/v3/components/ca_import
	When I provided 'removing fabric-ca "ca_import"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'removing fabric-ca "ca_import"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'DELETE:/api/v3/components/ca_import' and id 'audit-logs-api_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	Then I reload the page
	# deleting fabric-peer "peer_import" =- DELETE:/api/v3/components/peer_import
	When I provided 'removing fabric-peer "peer_import"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'removing fabric-peer "peer_import"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	Then I should see audit log row with text 'DELETE:/api/v3/components/peer_import' and id 'audit-logs-api_title-0'
	#delete org1ca
	When I provided 'removing fabric-ca "org1ca"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'removing fabric-ca "org1ca"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	#delete peerOrg1
	Then I reload the page
	When I provided 'removing fabric-peer "peerorg1"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'removing fabric-peer "peerorg1"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	#delete ordering service
	When I provided 'deleting ordering service: "Ordering Service"' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'deleting ordering service: "Ordering Service"' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	Then I should see audit log row with text 'DELETE:/api/v3/kubernetes/components/tags' and id 'audit-logs-api_title-0'

  Scenario: Search activity log for adding user
    When I clicked the div with id 'test__navigation--item--audit_logs'
	Then I should see table with id 'table-audit_logs'
	#adding new user - adding new user w********r@ibm.com
	When I provided 'adding new user w********r@ibm.com' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'adding new user w********r@ibm.com' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	Then I should see audit log row with text 'POST:/api/v3/permissions/users' and id 'audit-logs-api_title-0'
	#adding new user - adding new user adding new user r********r@ibm.com
	When I provided 'adding new user r********r@ibm.com' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'adding new user r********r@ibm.com' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	Then I should see audit log row with text 'POST:/api/v3/permissions/users' and id 'audit-logs-api_title-0'

  Scenario: Export button works fine
	When I clicked the div with id 'test__navigation--item--audit_logs'
	Then I should see table with id 'table-audit_logs'
	When I clicked the button with title 'Export current page'
	And I clicked the button with title 'Export all'

  Scenario: Search activity log is not visible to writer user
	When I am logged out from console
	Given I am logged in as 'writeruser@ibm.com' user
    And I am ready to get started
	Then the div with id 'test__navigation--item--audit_logs' does not exist on page

  Scenario: Search activity log is not visible to reader user
	When I am logged out from console
	Given I am logged in as 'readeruser@ibm.com' user
	And I am ready to get started
	Then the div with id 'test__navigation--item--audit_logs' does not exist on page

  Scenario: Delete Writer and Reader user
	Given I am logged out from console
    When I go to the console
    And I am logged in
    And I am ready to get started
	When I am on the 'access' page
	And I click label with property 'for' and value 'data-table-1__select-row-writeruser@ibm.com'
	And I click label with property 'for' and value 'data-table-1__select-row-readeruser@ibm.com'
	And I clicked the button with id 'btn-deleteUser'
	And I clicked the button with id 'delete'
	Then the table row with id 'authenticated_members-row-1' does not exist on page
	Then the table row with id 'authenticated_members-row-2' does not exist on page

  Scenario: Search activity log for deleting user
    When I clicked the div with id 'test__navigation--item--audit_logs'
	Then I should see table with id 'table-audit_logs'
	#delete user - deleting users w********r@ibm.com, r********r@ibm.com
	When I provided 'deleting users w********r@ibm.com, r********r@ibm.com' for input field with class ".bx--search-input"
	Then I should see audit log row with text 'deleting users w********r@ibm.com, r********r@ibm.com' and id 'audit-logs-log_title-0'
	Then I should see audit log row with text 'success' and id 'audit-logs-outcome_title-0'
	Then I should see audit log row with text 'DELETE:/api/v3/permissions/users' and id 'audit-logs-api_title-0'
