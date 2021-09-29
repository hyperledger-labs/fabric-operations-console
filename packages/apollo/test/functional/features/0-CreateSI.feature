@saas
Feature: Create a Service Instance in Cloud

    Scenario: Create a Service Instance
        Given I go to IBM Cloud
        And I am logged in to IBM Cloud
        And I go to Blockchain catalog in IBM Cloud
        Then wait "5" seconds
        And I provided a name for the service
        When I click the 'Create' button inside 'div.pal--order-summary-v2__button-group'
        Then wait "10" seconds

    Scenario: Link Service Instance
        Given I go to IBM Cloud
        And I am logged in to IBM Cloud
        And I clicked anchor with title 'Resource List'
        And I provided 'UI' for placeholder 'Filter by name or IP address...' input
        And I click on 'Services' twisty
        Then wait "10" seconds
        And I click on my service name
        And I switch context to Blockchain iframe
        When I click the button with text 'Let's get setup!'
        When I click the button with text 'Next'
        And I selected my cluster
        When I click the button with text 'Next'
        Then I should see a button with text 'Launch the IBM Blockchain Platform console'
        Then I switch context to parent iframe

    Scenario: Open Instance and Save the URL
        Given I go to IBM Cloud
        And I am logged in to IBM Cloud
        And I clicked anchor with title 'Resource List'
        And I provided 'UI' for placeholder 'Filter by name or IP address...' input
        And I click on 'Services' twisty
        And I click on my service name
        And I switch context to Blockchain iframe
        And I clicked the button with text 'Launch the IBM Blockchain Platform console'
        Then I get the URL for console


    @saas-minimal
    Scenario: Open Instance and Save the URL
        Given I go to IBM Cloud
        And I am logged in to IBM Cloud