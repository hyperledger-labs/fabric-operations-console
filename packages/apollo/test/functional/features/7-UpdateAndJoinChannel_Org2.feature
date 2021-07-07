@saas @software @saas-minimal
Feature: Update channel to add Org2
    Scenario: When updating channel1
        Given I go to the console
        And I am logged in
        And I am on the 'channels' page
        And I clicked the tile with title 'channel1'
        When I click the button with text 'Settings'
        And I selected 'Org1 MSP' from the 'div#channelModal-signature-selectedChannelCreator' dropdown
        And I selected 'Org1 MSP Admin' from the 'div#channelModal-signature-selectedIdentity' dropdown
        And I clicked the button with text 'Next'
        And I selected 'Org2 MSP' from the 'div#channelModal-msps-selectedOrg' dropdown
        And I clicked the button with text 'Add'
        And I clicked the 'admin' role for 'org2msp'
        And I clicked the button with text 'Next'
        And I selected '1 out of 2' from the 'div#channelModal-custom-policy-customPolicy' dropdown
        And I clicked the button with text 'Next'
        And I clicked the button with text 'Next'
        And I clicked the button with text 'Next'
        And I clicked the button with text 'Next'
        And I clicked the button with text 'Next'
        And I clicked the button with text 'Next'
        When I click the button with text 'Update channel'
        Then I should see a success toast which says "You have successfully initiated a request to update channel channel1."
