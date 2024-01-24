@support @regression @runonconsole @apicases
Feature: Verify Console APIs works as expected

	Background: Login to console
		Given I go to the console
        And I am logged in
        And I am ready to get started
		And I am on the 'access' page

	Scenario: Verify User can create new API key for manager, writer and reader role
		When I clicked the button with text 'Create an API key'
		And I provided 'managerAPIKey' for the 'API key name' input
		And I click label with property "for" and value "role_manager"
		And I clicked the button with id 'add_new_users'
		Then the element div with text 'Below is your new API key and secret.' should be visible on page
		Then I should see button with id "api_key_secret_reveal"
		When I clicked the button with id 'api_key_secret_reveal'
		Then I should see table with id "table-apikeys"
		Then I should see api key row with text "managerAPIKey" and id "current_apikeys-apikey_description_label-0"

	Scenario: Verify User can create new API key for writer and reader role
		When I clicked the button with text 'Create an API key'
		And I provided 'writerAPIKey' for the 'API key name' input
		And I click label with property "for" and value "role_writer"
		And I clicked the button with id 'add_new_users'
		Then the element div with text 'Below is your new API key and secret.' should be visible on page
		Then I should see button with id "api_key_secret_reveal"
		When I clicked the button with id 'api_key_secret_reveal'
		Then I should see table with id "table-apikeys"
		Then the element div with text 'writerAPIKey' should be visible on page

	Scenario: Verify User can create new API key for reader role
		When I clicked the button with text 'Create an API key'
		And I provided 'readerAPIKey' for the 'API key name' input
		And I click label with property "for" and value "role_reader"
		And I clicked the button with id 'add_new_users'
		Then the element div with text 'Below is your new API key and secret.' should be visible on page
		Then I should see button with id "api_key_secret_reveal"
		When I clicked the button with id 'api_key_secret_reveal'
		Then I should see table with id "table-apikeys"
		Then the element div with text 'readerAPIKey' should be visible on page

	Scenario: Verify deleting API keys works as expected
		When I click label with property 'for' and value 'data-table-2__select-all'
		And I clicked the button with id 'btn-deleteApiKey'
		And I clicked the button with id 'delete'
		Then the element div with text 'There are no API keys yet' should be visible on page
		Then I should see a success toast with class '.bx--toast-notification__title' which says "The selected API keys have been successfully removed."
