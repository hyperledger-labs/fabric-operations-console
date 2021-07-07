@saas
Feature: Delete a Service Instance in Cloud

    Scenario: Delete Service Instance
        Given I go to IBM Cloud
        And I am logged in to IBM Cloud
        And I clicked anchor with title 'Resource List'
        And I provided 'UI' for placeholder 'Filter by name or IP address...' input
        And I click on 'Services' twisty
        And I click on my service name
        Then I should click on the element with selector 'button.pal--actions-panel'
        When I clicked the button with title 'Delete service'
        When I clicked the button with text 'OK'
