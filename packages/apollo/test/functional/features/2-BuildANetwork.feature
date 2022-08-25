@saas @software @saas-minimal
Feature: Build a network feature

    Scenario: When creating a certificate authority for Org1
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'nodes' page
        And I clicked the button with title 'Add Certificate Authority'
        And I clicked Create a Certificate Authority
        And I clicked the button with text 'Next'
        And I provided 'Org1 CA' for the 'Enter a CA display name' input
        And I provided 'admin' for the 'Enter enroll ID' input
        And I provided 'adminpw' for the 'Enter enroll secret' input
        And I clicked the button with text 'Next'
        When I click the button with text 'Add Certificate Authority'
        Then I should see a success toast which says "Congratulations! You have successfully created 'Org1 CA'."
        And the certificate authority with name 'Org1 CA' should have started successfully

    Scenario: When associating and enrolling identities for Org1 CA
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'nodes' page
        And I clicked the 'Org1 CA' certificate authority
        And I clicked the button with text 'Associate identity'
        And I provided 'admin' for the 'Enter an ID' input
        And I provided 'adminpw' for the 'Enter a secret' input
        And I provided 'Org1 CA Admin' for the 'Enter a name' input
        And I clicked the Associate identity button
        And the CA admin is set as 'Org1 CA Admin'
        When the 'admin' user was enrolled with id 'org1admin' and secret 'org1adminpw'
        Then wait "3" seconds
        And the 'peer' user was enrolled with id 'peer1' and secret 'peer1pw'
        Then wait "3" seconds
        Then the 'admin' user with id 'org1admin' should be enrolled
        And the 'peer' user with id 'peer1' should be enrolled

    Scenario: When creating an organization MSP definition for Org1
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'organizations' page
        And I clicked the button with title 'Create MSP definition'
        And I provided 'Org1 MSP' for the 'Enter name for the MSP' input
        And I provided 'org1msp' for the 'Enter the MSP ID' input
        And I clicked the button with text 'Next'
        And I selected 'Org1 CA' from the 'div#generateMSP-root-selectedRootCA' dropdown
        And I clicked the button with text 'Next'
        And I selected 'org1admin' from the 'div#generateMSP-enroll_id' dropdown
        And I provided 'org1adminpw' for the 'Enter a secret' input
        And I provided 'Org1 MSP Admin' for the 'Enter name for the identity to be stored in your Wallet' input
        And I clicked the button with text 'Generate'
        And I clicked the button with text 'Export'
        And I clicked the button with text 'Next'
        When I click the button with text 'Create MSP definition'
        Then I should see a success toast which says "MSP Org1 MSP has been created successfully."

    Scenario: When creating a peer for Org1
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'nodes' page
        And I clicked the button with title 'Add peer'
        And I clicked Create a peer
        And I clicked the button with text 'Next'
        And I provided 'Peer Org1' for the 'Enter the Peer name' input
        And I clicked the button with text 'Next'
        And I selected 'Org1 CA' from the 'div#saasCA-saas_ca' dropdown
        And I selected 'peer1' from the 'div#saasCA-enroll_id' dropdown
        And I provided 'peer1pw' for the 'Enter a secret' input
        And I selected 'Org1 MSP' from the 'div#saasCA-admin_msp' dropdown
        And I selected '2.4' matching value from the 'div#importPeerModal-version-version' dropdown
        And I clicked the button with text 'Next'
        And I selected 'Org1 MSP Admin' from the 'div#importPeerModal-identity-identity' dropdown
        And I clicked the button with text 'Next'
        When I click the button with text 'Add peer'
        Then I should see a success toast which says "Congratulations! You have successfully created 'Peer Org1'"
        And the peer with name 'Peer Org1' should have started successfully

    Scenario: When creating a certificate authority for the Ordering Service
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'nodes' page
        And I clicked the button with title 'Add Certificate Authority'
        And I clicked Create a Certificate Authority
        And I clicked the button with text 'Next'
        And I provided 'Ordering Service CA' for the 'Enter a CA display name' input
        And I provided 'admin' for the 'Enter enroll ID' input
        And I provided 'adminpw' for the 'Enter enroll secret' input
        And I clicked the button with text 'Next'
        When I click the button with text 'Add Certificate Authority'
        Then I should see a success toast which says "Congratulations! You have successfully created 'Ordering Service CA'."
        And the certificate authority with name 'Ordering Service CA' should have started successfully

    Scenario: When associating and enrolling identities for Ordering Service CA
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'nodes' page
        And I clicked the 'Ordering Service CA' certificate authority
        And I clicked the button with text 'Associate identity'
        And I provided 'admin' for the 'Enter an ID' input
        And I provided 'adminpw' for the 'Enter a secret' input
        And I provided 'Ordering Service CA Admin' for the 'Enter a name' input
        And I clicked the Associate identity button
        And the CA admin is set as 'Ordering Service CA Admin'
        Then wait "5" seconds
        When the 'admin' user was enrolled with id 'OSadmin' and secret 'OSadminpw'
        Then wait "2" seconds
        And the 'orderer' user was enrolled with id 'OS1' and secret 'OS1pw'
        Then wait "2" seconds
        Then the 'admin' user with id 'OSadmin' should be enrolled
        And the 'orderer' user with id 'OS1' should be enrolled
		Then wait "2" seconds
        And I enroll TLS identity for OS1 with secret 'OS1pw' and name 'OS1_TLS'
		Then wait "2" seconds

    Scenario: When creating an organization MSP definition for Ordering Service
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'organizations' page
        And I clicked the button with title 'Create MSP definition'
        And I provided 'Ordering Service MSP' for the 'Enter name for the MSP' input
        And I provided 'osmsp' for the 'Enter the MSP ID' input
        And I clicked the button with text 'Next'
        Then wait "5" seconds
        And I selected 'Ordering Service CA' value from the 'div#generateMSP-root-selectedRootCA' dropdown
        And I clicked the button with text 'Next'
        And I selected 'OSadmin' from the 'div#generateMSP-enroll_id' dropdown
        And I provided 'OSadminpw' for the 'Enter a secret' input
        And I provided 'Ordering Service MSP Admin' for the 'Enter name for the identity to be stored in your Wallet' input
        And I clicked the button with text 'Generate'
        Then wait "5" seconds
        And I clicked the button with text 'Export'
        Then wait "5" seconds
        And I clicked the button with text 'Next'
        Then wait "5" seconds
        When I click the button with text 'Create MSP definition'
        Then I should see a success toast which says "MSP Ordering Service MSP has been created successfully."

    Scenario: When creating an ordering service with system channel
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'nodes' page
        And I clicked the button with title 'Add ordering service'
        And I clicked Create an ordering service
        And I clicked the button with text 'Next'
        Then wait "3" seconds
        And I provided 'Ordering Service' for the 'Enter an ordering service display name' input
        And I select radio button with text "With a system channel"
        Then wait "2" seconds
        And I clicked the button with text 'Next'
        Then wait "5" seconds
        And I selected 'Ordering Service CA' value from the 'div#saasCA-saas_ca' dropdown
        Then wait "5" seconds
        And I selected 'OS1' from the 'div#saasCA-enroll_id' dropdown
        And I provided 'OS1pw' for the 'Enter a secret' input
        And I selected 'Ordering Service MSP' value from the 'div#saasCA-admin_msp' dropdown
        And I selected '2.4' matching value from the 'div#importOrdererModal-version-version' dropdown
        And I clicked the button with text 'Next'
        Then wait "5" seconds
        And I selected 'Ordering Service MSP Admin' value from the 'div#importOrdererModal-identity' dropdown
        And I clicked the button with text 'Next'
        When I click the button with text 'Add ordering service'
        Then I should see a success toast which says "Congratulations! You have successfully created 'Ordering Service'."
        And the orderer with name 'Ordering Service' should have started successfully

    Scenario: Add Org1 to consortium
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'nodes' page
        And I clicked the 'Ordering Service' orderer
        Then wait "10" seconds
        And I clicked the button with title 'Add organization'
        And I selected 'Org1 MSP' from the 'div#orderer-add-msp-dropdown' dropdown
        When I click the button with text 'Add organization'
        Then wait "10" seconds
        Then a tile with title 'Org1 MSP' should have been created
