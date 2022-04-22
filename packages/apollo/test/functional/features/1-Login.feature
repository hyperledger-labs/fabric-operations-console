@software
Feature: Login feature

    Scenario: When entering the default username and password
        Given I go to the console
        And I am on the login page
        When I am logged in for first time
        Then I should be asked to change the default password

    Scenario: When changing the default username and password
        Given I am on the change default password page
        When I change the password from default password
        Then I should be redirected to the login page again
