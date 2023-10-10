@support @regression
Feature: Create and Join a 1.x channel

    Background: Login to console
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'channels' page
        
    Scenario: When creating a channel
        And I clicked the button with title 'Create channel'        
        And I clicked the span with text 'Next'
        And I provided 'channel1' for the 'Enter a name for your channel' input
        And I clicked the button with title 'Select from available ordering services'
        And I clicked the div with id 'downshift-0-item-0'
        And I clicked the span with text 'Next'
        And I clicked the button with title 'Select MSP'
        And I clicked the div with text 'Org1 MSP (org1msp)'
        And I clicked the button with text 'Add'
        And I clicked the 'admin' role for 'org1msp'
        And I clicked the span with text 'Next'
        And I clicked the span with text 'Next'
        And I clicked the button with title 'Select the MSP'
        And I clicked the div with text 'Org1 MSP (org1msp)'
        And I clicked the button with title 'Select an identity'
        And I clicked the div with text 'Org1 MSP Admin'
        And I clicked the span with text 'Next'
        Then I clicked Create channel button
        Then I should see a success toast with class '.bx--toast-notification__title' which says "You have successfully initiated a request to create channel1. Join a peer to this channel by clicking the pending channel tile below."
        And the channel with name 'channel1' should have been created

    Scenario: When joining a channel
        And I clicked the div with text 'channel1'
        Then wait "5" seconds
        And I clicked the span with text 'Peer Org1'
        When I clicked the button with id 'submit'
        Then I should see a success toast with class '.bx--toast-notification__title' which says "You have successfully joined channel1."
