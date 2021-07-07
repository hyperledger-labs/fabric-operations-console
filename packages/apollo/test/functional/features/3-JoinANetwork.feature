@saas @software @saas-minimal
Feature: Join a network feature

    Scenario: When creating a certificate authority for Org2
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'nodes' page
        And I clicked the button with title 'Add Certificate Authority'
        And I clicked Create a Certificate Authority
        And I clicked the button with text 'Next'
        And I provided 'Org2 CA' for the 'Enter a CA display name' input
        And I provided 'admin' for the 'Enter enroll ID' input
        And I provided 'adminpw' for the 'Enter enroll secret' input
        And I clicked the button with text 'Next'
        When I click the button with text 'Add Certificate Authority'
        Then I should see a success toast which says "Congratulations! You have successfully created 'Org2 CA'."
        And the certificate authority with name 'Org2 CA' should have started successfully

    Scenario: When associating and enrolling identities for Org2 CA
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'nodes' page
        And I clicked the 'Org2 CA' certificate authority
        And I clicked the button with text 'Associate identity'
        And I provided 'admin' for the 'Enter an ID' input
        And I provided 'adminpw' for the 'Enter a secret' input
        And I provided 'Org2 CA Admin' for the 'Enter a name' input
        And I clicked the Associate identity button
        And the CA admin is set as 'Org2 CA Admin'
        When the 'admin' user was enrolled with id 'org2admin' and secret 'org2adminpw'
        And the 'peer' user was enrolled with id 'peer2' and secret 'peer2pw'
        Then the 'admin' user with id 'org2admin' should be enrolled
        And the 'peer' user with id 'peer2' should be enrolled

    Scenario: When creating an organization MSP definition for Org2
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'organizations' page
        And I clicked the button with title 'Create MSP definition'
        And I provided 'Org2 MSP' for the 'Enter name for the MSP' input
        And I provided 'org2msp' for the 'Enter the MSP ID' input
        And I clicked the button with text 'Next'
        And I selected 'Org2 CA' from the 'div#generateMSP-root-selectedRootCA' dropdown
        And I clicked the button with text 'Next'
        And I selected 'org2admin' from the 'div#generateMSP-enroll_id' dropdown
        And I provided 'org2adminpw' for the 'Enter a secret' input
        And I provided 'Org2 MSP Admin' for the 'Enter name for the identity to be stored in your Wallet' input
        And I clicked the button with text 'Generate'
        And I clicked the button with text 'Export'
        And I clicked the button with text 'Next'
        When I click the button with text 'Create MSP definition'
        Then I should see a success toast which says "MSP Org2 MSP has been created successfully."

    Scenario: When creating a peer for Org2
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'nodes' page
        And I clicked the button with title 'Add peer'
        And I clicked Create a peer
        And I clicked the button with text 'Next'
        And I provided 'Peer Org2' for the 'Enter the Peer name' input
        And I clicked the button with text 'Next'
        And I selected 'Org2 CA' from the 'div#saasCA-saas_ca' dropdown
        And I selected 'peer2' from the 'div#saasCA-enroll_id' dropdown
        And I provided 'peer2pw' for the 'Enter a secret' input
        And I selected 'Org2 MSP' from the 'div#saasCA-admin_msp' dropdown
        And I selected '2.2' from the 'div#importPeerModal-version-version' dropdown
        And I clicked the button with text 'Next'
        And I selected 'Org2 MSP Admin' from the 'div#importPeerModal-identity-identity' dropdown
        And I clicked the button with text 'Next'
        When I click the button with text 'Add peer'
        Then I should see a success toast which says "Congratulations! You have successfully created 'Peer Org2'"
        And the peer with name 'Peer Org2' should have started successfully

    Scenario: Add Org2 to consortium
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'nodes' page
        And I clicked the 'Ordering Service' orderer
        And I clicked the button with title 'Add organization'
        And I selected 'Org2 MSP' from the 'div#orderer-add-msp-dropdown' dropdown
        When I click the button with text 'Add organization'
        Then wait "5" seconds
        Then a tile with title 'Org2 MSP' should have been created

