@support @regression @runOnConsole
Feature: Update channel to add Org2

    Background: Login to console
        Given I go to the console
        And I am logged in
        And I am ready to get started
        And I am on the 'channels' page

    Scenario: When updating channel1
        And I clicked the div with text 'channel1'
        And I clicked the button with id 'channel1-sticky-settings-button'
        And I clicked the button with title 'Select the MSP'
        And I clicked the div with text 'Org1 MSP (org1msp)'
        And I clicked the button with title 'Select an identity'
        And I clicked the div with text 'Org1 MSP Admin'
        And I clicked the span with text 'Next'
        And I clicked the button with title 'Select MSP'
        And I clicked the div with text 'Org2 MSP (org2msp)'
        And I clicked the button with id 'btn-add-org'
        And I clicked the 'admin' role for 'org2msp'
        And I clicked the span with text 'Next'
        And I clicked the button with title 'Select policy'
        And I clicked the div with text '1 out of 2'
        And I clicked the span with text 'Next'
        And I clicked the span with text 'Next'
        And I clicked the span with text 'Next'
        And I clicked the span with text 'Next'
        And I clicked the span with text 'Next'
        And I clicked the span with text 'Next'
        And I clicked the span with text 'Update channel'
        Then I should see a success toast with class '.bx--toast-notification__title' which says "You have successfully initiated a request to update channel channel1."
