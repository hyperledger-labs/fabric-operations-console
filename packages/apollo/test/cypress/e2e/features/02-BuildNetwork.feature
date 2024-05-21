@support @regression @runonconsole
Feature: Build a network feature

    Background: Login to console
        Given I go to the console
        And I am logged in
        And I am ready to get started

    Scenario: When creating a certificate authority for Org1
        And I am on the 'nodes' page
        And I clicked the button with title 'Add Certificate Authority'
        And I clicked Create a Certificate Authority
        And I clicked the button with id 'next'
        And I provided 'Org1 CA' for the 'Enter a CA display name' input
        And I provided 'admin' for the 'Enter enroll ID' input
        And I provided 'adminpw' for the 'Enter enroll secret' input
        And I clicked the button with id 'next'
        And I clicked the button with id 'submit'
        Then wait "5" seconds
        Then I should see a success toast with class '.bx--toast-notification__subtitle' which says "Congratulations! You have successfully created 'Org1 CA'."
        And the certificate authority with name 'Org1 CA' should have started successfully

    Scenario: When associating and enrolling identities for Org1 CA
        And I am on the 'nodes' page
        And I clicked the 'Org1 CA' certificate authority
        And I clicked the button with id 'no-identity-button'
        And I provided 'admin' for the 'Enter an ID' input
        And I provided 'adminpw' for the 'Enter a secret' input
        And I provided 'Org1 CA Admin' for the 'Enter a name' input
        And I clicked the button with id 'associate_identity'
        And the CA admin is set as 'Org1 CA Admin'
        Then wait "3" seconds
        When the 'admin' user was enrolled with id 'org1admin' and secret 'org1adminpw'
        Then wait "3" seconds
        And the 'peer' user was enrolled with id 'peer1' and secret 'peer1pw'
        Then wait "10" seconds
        Then the 'admin' user with id 'org1admin' should be enrolled
        And the 'peer' user with id 'peer1' should be enrolled

    Scenario: When creating an organization MSP definition for Org1
        And I am on the 'organizations' page
        And I clicked the button with title 'Create MSP definition'
        And I provided 'Org1 MSP' for the 'Enter name for the MSP' input
        And I provided 'org1msp' for the 'Enter the MSP ID' input
        And I clicked the span with text 'Next'
        And I clicked the button with title 'Select a root Certificate Authority'
        And I clicked the div with text 'Org1 CA'
        And wait "3" seconds
        And I clicked the span with text 'Next'
        And I clicked the button with title 'org1admin'
        And I clicked the div with text 'org1admin'
        And I provided 'org1adminpw' for the 'Enter a secret' input
        And I provided 'Org1 MSP Admin' for the 'Enter name for the identity to be stored in your Wallet' input
        And I clicked the button with text 'Generate'
		Then I should see button with id "btn-export-certificate"
        And I clicked the button with text 'Export'
        And I clicked the button with text 'Next'
        And I click Create MSP definition button
        Then I should see a success toast with class '.bx--toast-notification__title' which says "MSP Org1 MSP has been created successfully."

    Scenario: When creating a peer for Org1
        And I am on the 'nodes' page
        And I clicked the button with title 'Add peer'
        And I clicked Create a peer
        And I clicked the button with id 'next'
        And I provided 'Peer Org1' for the 'Enter the Peer name' input
        And I clicked the button with id 'next'
        And I clicked the button with title 'Select CA'
        And I clicked the dropdown item 'Org1 CA' with class '.bx--list-box__menu-item__option'
        Then wait "2" seconds
        And I clicked the button with title 'peer1'
        And I clicked the div with text 'peer1'
        And I provided 'peer1pw' for the 'Enter a secret' input
        And I clicked the button with title 'Select an MSP'
        And I clicked the div with text 'Org1 MSP'
        And I clicked the button with title 'Select a Fabric version'
        And I clicked the div with text '2.5'
        And I clicked the button with id 'next'
        And I clicked the button with title 'Please select an identity from your wallet'
        And I clicked the div with text 'Org1 MSP Admin'
        And I clicked the button with id 'next'
        When I clicked the button with id 'submit'
        Then wait "6" seconds
        Then I should see a success toast with class '.bx--toast-notification__subtitle' which says "Congratulations! You have successfully created 'Peer Org1'"
        And the peer with name 'Peer Org1' should have started successfully

    Scenario: When creating a certificate authority for the Ordering Service
        And I am on the 'nodes' page
        And I clicked the button with title 'Add Certificate Authority'
        And I clicked Create a Certificate Authority
        And I clicked the button with id 'next'
        And I provided 'Ordering Service CA' for the 'Enter a CA display name' input
        And I provided 'admin' for the 'Enter enroll ID' input
        And I provided 'adminpw' for the 'Enter enroll secret' input
        And I clicked the button with id 'next'
        And I clicked the button with id 'submit'
        Then wait "3" seconds
        Then I should see a success toast with class '.bx--toast-notification__subtitle' which says "Congratulations! You have successfully created 'Ordering Service CA'."
        And the certificate authority with name 'Ordering Service CA' should have started successfully

    Scenario: When associating and enrolling identities for Ordering Service CA
        And I am on the 'nodes' page
        And I clicked the 'Ordering Service CA' certificate authority
        And I clicked the button with text 'Associate identity'
        And I provided 'admin' for the 'Enter an ID' input
        And I provided 'adminpw' for the 'Enter a secret' input
        And I provided 'Ordering Service CA Admin' for the 'Enter a name' input
        And I clicked the button with id 'associate_identity'
        And the CA admin is set as 'Ordering Service CA Admin'
        Then wait "3" seconds
        When the 'admin' user was enrolled with id 'OSadmin' and secret 'OSadminpw'
        Then wait "2" seconds
        And the 'orderer' user was enrolled with id 'OS1' and secret 'OS1pw'
        Then wait "10" seconds
        Then the 'admin' user with id 'OSadmin' should be enrolled
        And the 'orderer' user with id 'OS1' should be enrolled
        Then wait "2" seconds
        And I enroll TLS identity for OS1 with secret 'OS1pw' and name 'TLSOS1'
        Then wait "2" seconds

    Scenario: When creating an organization MSP definition for Ordering Service
        And I am on the 'organizations' page
        And I clicked the button with title 'Create MSP definition'
        And I provided 'Ordering Service MSP' for the 'Enter name for the MSP' input
        And I provided 'osmsp' for the 'Enter the MSP ID' input
        Then wait "3" seconds
        And I clicked the Next button in Create MSP definition screen
        And I clicked the button with title 'Select a root Certificate Authority'
        And I clicked the div with text 'Ordering Service CA'
        Then wait "5" seconds
        And I clicked the Next button in Create MSP definition screen
        And I clicked the button with title 'OSadmin'
        And I clicked the div with text 'OSadmin'
        And I provided 'OSadminpw' for the 'Enter a secret' input
        And I provided 'Ordering Service MSP Admin' for the 'Enter name for the identity to be stored in your Wallet' input
        And I clicked the button with text 'Generate'
        And I clicked the button with text 'Export'
        And I clicked the Next button in Create MSP definition screen
        And I click Create MSP definition button
        Then I should see a success toast with class '.bx--toast-notification__title' which says "MSP Ordering Service MSP has been created successfully."

    Scenario: When creating an ordering service with system channel
        And I am on the 'nodes' page
        And I clicked the button with title 'Add ordering service'
        And I clicked Create a Ordering Service
        And I clicked the button with id 'next'
        Then wait "3" seconds
        And I provided 'Ordering Service' for the 'Enter an ordering service display name' input
        And I clicked the span with text 'With a system channel'
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
        Then wait "2" seconds
        And I clicked the button with title 'Please select an identity from your wallet'
        And I clicked the dropdown item 'Ordering Service MSP Admin' with class '.bx--list-box__menu-item__option'
        And I clicked the button with id 'next'
        When I clicked the button with id 'submit'
        Then wait "6" seconds
        Then I should see a success toast with class '.bx--toast-notification__subtitle' which says "Congratulations! You have successfully created 'Ordering Service'."
        And the orderer with name 'Ordering Service' should have started successfully

    Scenario: Add Org1 to consortium
        And I am on the 'nodes' page
        And I clicked the 'Ordering Service' orderer
        Then wait "10" seconds
        And I clicked the button with title 'Add organization'
        And I clicked the button with title 'Ordering Service MSP (osmsp)'
        And I clicked the dropdown item 'Org1 MSP (org1msp)' with class '.bx--list-box__menu-item__option'
        When I clicked the button with id 'submit'
        Then wait "10" seconds
        Then a tile with title 'Org1 MSP' should have been created
