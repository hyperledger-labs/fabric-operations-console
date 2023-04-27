@saas @software @saas-minimal @mustgather
Feature: Verify mustgather tool works as expected


  Scenario: Run mustgather tool
    Given I go to the console
    And I am logged in
    And I am ready to get started
    And I am on Help page
    Then wait "2" seconds
    And I clicked the button with text 'Start mustgather'
    Then wait "30" seconds
    And I clicked anchor with text 'Download results'
    Then wait "10" seconds
    And I clicked the button with text 'Run again'
    Then wait "30" seconds
    And I clicked the button with xpath "//div[text()='Delete mustgather pod and service']"
    Then wait "20" seconds
    And I clicked the button with text 'Start mustgather'