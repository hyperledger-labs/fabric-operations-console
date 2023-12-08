@support @regression @runonconsole @usermanagement
Feature: Verify User Management functionality

  Background: Login to console
    Given I go to the console
    And I am logged in
    And I am ready to get started

  Scenario: Create new Writer user and set the passwowrd
	When I am on the 'access' page
	And I clicked the button with title 'Add new users'
	And I provided 'writeruser@ibm.com' for input field with id 'users'
	And I click label with property 'for' and value 'role_writer'
	And I clicked the button with id 'add_new_users'
	Then I should see a success toast with class '.bx--toast-notification__details' which says "User writeruser@ibm.com has been successfully added."
	Given I am logged out from console
	When I am on the login page
	And I am logged in for first time as 'writeruser@ibm.com' user
	Then I should be asked to change the default password
	When I am on the change default password page
	Then I change the password from default password
	Then I should be redirected to the login page again
	Given I am logged in as 'writeruser@ibm.com' user
	Then I am logged out from console

  Scenario: Create new Reader user and set the password
	When I am on the 'access' page
	And I clicked the button with title 'Add new users'
	And I provided 'readeruser@ibm.com' for input field with id 'users'
	And I click label with property 'for' and value 'role_reader'
	And I clicked the button with id 'add_new_users'
	Then I should see a success toast with class '.bx--toast-notification__details' which says "User readeruser@ibm.com has been successfully added."
	Given I am logged out from console
	When I am on the login page
	And I am logged in for first time as 'readeruser@ibm.com' user
	Then I should be asked to change the default password
	When I am on the change default password page
	Then I change the password from default password
	Then I should be redirected to the login page again
	Given I am logged in as 'readeruser@ibm.com' user
	Then I am logged out from console
