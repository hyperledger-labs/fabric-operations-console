@saas @software @saas-minimal
Feature: Create and Join a 2.x channel
    Scenario: When creating a channel (channel2)
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'channels' page
        And I clicked the button with title 'Create channel'
        And I clicked the checkbox with text 'Advanced channel configuration'
        And I clicked the button with text 'Next'
        And I provided 'channel2' for the 'Enter a name for your channel' input
        And I selected 'Ordering Service' from the 'div#channelModal-details-selectedOrderer' dropdown
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
        And I selected 'Org1 MSP (org1msp)' value from the 'div#channelModal-signature-selectedChannelCreator' dropdown
        And I selected 'Org1 MSP Admin' value from the 'div#channelModal-signature-selectedIdentity' dropdown
        And I clicked the button with text 'Next'
        And I selected '2.0.0' value from the 'div#channelModal-capabilities-application-selectedApplicationCapability' dropdown
        And I clicked the button with text 'Next'
        And I clicked the button with text 'Next'
        And I clicked the button with text 'Next'
        And I clicked the button with text 'Next'
        And I clicked the button with text 'Next'
        And I clicked the button with text 'Next'
        When I click the button with text 'Create channel'
        Then I should see a success toast which says "You have successfully initiated a request to create channel2. Join a peer to this channel by clicking the pending channel tile below."
        And the channel with name 'channel2' should have been created

    Scenario: When joining a channel (channel2)
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'channels' page
        And I clicked on the 'channel2' channel
        Then wait "5" seconds
        And I clicked the peer 'Peer Org1' select item
        And I clicked the peer 'Peer Org2' select item
        When I click the button with text 'Join channel'
        Then I should see a success toast which says "You have successfully joined channel2."
