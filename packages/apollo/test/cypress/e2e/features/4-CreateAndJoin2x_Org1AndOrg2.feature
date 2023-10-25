@support @regression
Feature: Create and Join a 2.x channel

    Background: Login to console
        Given I go to the console
        And I am logged in
        And I am ready to get started
    
    Scenario: When creating a channel (channel2)
        And I am on the 'channels' page
        And I clicked the button with title 'Create channel'
        And I clicked the checkbox with text 'Advanced channel configuration'
        And I clicked the span with text 'Next'
        And I provided 'channel2' for the 'Enter a name for your channel' input
        And I clicked the button with title 'Select from available ordering services'
        And I clicked the div with id 'downshift-0-item-0'
        And I clicked the span with text 'Next'
        And I clicked the button with title 'Select MSP'
        And I clicked the div with text 'Org1 MSP (org1msp)'
        And I clicked the button with text 'Add'
        And I clicked the 'admin' role for 'org1msp'
        And I clicked the button with title 'Select MSP'
        And I clicked the div with text 'Org2 MSP (org2msp)'
        And I clicked the button with text 'Add'
        And I clicked the 'admin' role for 'org2msp'
        And I clicked the span with text 'Next'
        And I clicked the button with title 'Select policy'
        And I clicked the div with text '1 out of 2'
        And I clicked the span with text 'Next'
        And I clicked the button with title 'Select the MSP'
        And I clicked the div with text 'Org1 MSP (org1msp)'
        And I clicked the button with title 'Select an identity'
        And I clicked the div with text 'Org1 MSP Admin'
        And I clicked the span with text 'Next'
        And I clicked the div with id 'selectedApplicationCapability'
        And I clicked the div with text '2.0.0'
        And I clicked the span with text 'Next'
        And I clicked the span with text 'Next'
        And I clicked the span with text 'Next'
        And I clicked the span with text 'Next'
        And I clicked the span with text 'Next'
        And I clicked the span with text 'Next'
        Then I clicked Create channel button
        # And I clicked the button with text 'Create channel'
        Then I should see a success toast with class '.bx--toast-notification__title' which says "You have successfully initiated a request to create channel2. Join a peer to this channel by clicking the pending channel tile below."
        And the channel with name 'channel2' should have been created

    Scenario: When joining a channel (channel2)
        And I am on the 'channels' page
        And I clicked the div with id 'ibp-tile-channel2'
        Then wait "5" seconds
        And I clicked the span with text 'Peer Org1'
        And I clicked the span with text 'Peer Org2'
        When I clicked the button with id 'submit'
        Then I should see a success toast with class '.bx--toast-notification__title' which says "You have successfully joined channel2."
