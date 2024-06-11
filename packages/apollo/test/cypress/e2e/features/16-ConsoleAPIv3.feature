@support @regression @runonconsole @apicases
Feature: Verify Console APIs are working as expected

	Background: Login to console
		Given I go to the console
		And I am logged in
		And I am ready to get started
	# 	And I am on the 'access' page

	Scenario: Testing API keys for manager, writer and reader
		Given As 'manager' create API key for "manager" role with description "apiKey4manager" completes with '200'
		Then As 'manager' run curl command with userId for "GET" request with URL "ak/api/v3/permissions/keys" completes with '200'
		# https://github.ibm.com/ibp/OpTools/issues/6111
		# Then As 'writeruser@ibm.com' run curl command with userId for "GET" request with URL "ak/api/v3/permissions/keys" completes with '200'
		# Then As 'readeruser@ibm.com' run curl command with userId for "GET" request with URL "ak/api/v3/permissions/keys" completes with '200'
		Then I reload the page
		Given I am logged out from console
		Then wait "20" seconds
		Given I go to the console
		And I am logged in
		And I am ready to get started
		And I am on the 'access' page
		Then the element div with text 'apiKey4manager' should be visible on page
		Then As 'manager' delete API key for "manager" role with description "apiKey4manager" completes with '200'

		Given As 'manager' create API key for "writer" role with description "apiKey4writer" completes with '200'
		Then As 'manager' run curl command with userId for "GET" request with URL "ak/api/v3/permissions/keys" completes with '200'
		Then I reload the page
		Given I am logged out from console
		Then wait "20" seconds
		Given I go to the console
		And I am logged in
		And I am ready to get started
		And I am on the 'access' page
		Then the element div with text 'apiKey4writer' should be visible on page
		Then As 'manager' delete API key for "writer" role with description "apiKey4writer" completes with '200'

		Given As 'manager' create API key for "reader" role with description "apiKey4reader" completes with '200'
		Then I reload the page
		Given I am logged out from console
		Then wait "20" seconds
		Given I go to the console
		And I am logged in
		And I am ready to get started
		And I am on the 'access' page
		Then the element div with text 'apiKey4reader' should be visible on page
		Then As 'manager' delete API key for "reader" role with description "apiKey4reader" completes with '200'

		# Readers and writers are not allowed to create API keys
		Given As 'writeruser@ibm.com' create API key for "writer" role with description "apiKey4writer" completes with '403'
		Given As 'readeruser@ibm.com' create API key for "reader" role with description "apiKey4reader" completes with '403'

	Scenario: Testing access tokens for manager, writer and reader
		Given As 'manager' create API key for "manager" role with description "apiKey4manager" completes with '200'
		Then As 'manager' run curl command with userId for "GET" request with URL "ak/api/v3/permissions/keys" completes with '200'
		Then I send request to create an access token for "manager" role with description "apiToken4manager"
		Then As 'manager' I send request to "GET" access token for "manager" completes with '200'

		Given As 'manager' create API key for "writer" role with description "apiKey4writer" completes with '200'
		Then I send request to create an access token for "writer" role with description "apiToken4writer"
		#  https://github.ibm.com/ibp/OpTools/issues/6106
		#  Then I send request to "GET" access token for "writer" completes with '200'
		Then As 'writer' I send request to "DELETE" access token for "writer" completes with '403'

		Given As 'manager' create API key for "reader" role with description "apiKey4reader" completes with '200'
		Then I send request to create an access token for "reader" role with description "apiToken4reader"
		#  Then I send request to "GET" access token for "reader" completes with '200'
		Then As 'reader' I send request to "DELETE" access token for "reader" completes with '403'

	Scenario: Managing users using the APIs
		Then As 'manager' add user 'api-user@ibm.com' with role 'writer' completes with '200'
		Then As 'manager' add user 'api-user@ibm.com' with role 'writer' completes with '400'
		Then As 'manager' edit user 'api-user@ibm.com' with role 'reader' completes with '200'
		Then As 'manager' edit user 'api-user@ibm.com' with role 'writer' completes with '200'
		Then As 'manager' edit user 'api-user@ibm.com' with role 'manager' completes with '200'
		Then As 'manager' edit user 'api-user@ibm.com' with role 'reader","writer","manager' completes with '200'
		Then As 'writeruser@ibm.com' edit user 'api-user@ibm.com' with role 'reader' completes with '403'
		Then As 'readeruser@ibm.com' edit user 'api-user@ibm.com' with role 'reader' completes with '403'
		Then As 'admin' list users 'writeruser@ibm.com' with role 'writer' completes with '200'
		Then As 'writeruser@ibm.com' list users 'writeruser@ibm.com' with role 'writer' completes with '200'
		Then As 'readeruser@ibm.com' list users 'writeruser@ibm.com' with role 'writer' completes with '200'
		# https://github.ibm.com/ibp/OpTools/issues/6037
		Then As 'writeruser@ibm.com' remove user 'api-user@ibm.com' completes with '403'
		Then As 'readeruser@ibm.com' remove user 'api-user@ibm.com' completes with '403'
		Then As 'manager' remove user 'api-user@ibm.com' completes with '200'

    Scenario: Testing adding/updating/deleting components
        And I am on the 'nodes' page
		Then As 'readeruser@ibm.com' create CA with name '<componentName>' completes with '403'
		Then As 'writeruser@ibm.com' create CA with name '<componentName>' completes with '403'
		Then a tile with title '<componentName>' should not exist on page
		Then As 'manager' create CA with name '<componentName>' completes with '200'
		Then Wait for '<componentName>' getting ready
		Then As 'manager' run curl command for "GET" request with URL "ak/api/v3/components/<componentName>" completes with '200'
		Then As 'manager' update CA with name '<componentName>' to '<componentNameNew>' completes with '200'
		Then wait "5" seconds
        And I am on the 'organizations' page
        And I am on the 'nodes' page
        And I clicked the '<componentNameNew>' certificate authority
        And I am on the 'nodes' page
		Then As 'manager' update CA with name '<componentName>' to '<componentName>' completes with '200'
		Then wait "5" seconds
        And I am on the 'organizations' page
        And I am on the 'nodes' page
        And I clicked the '<componentName>' certificate authority
        And I am on the 'nodes' page
		Then As 'manager' run curl command for "DELETE" request with URL "ak/api/v3/kubernetes/components/<componentName>" completes with '200'
		Then wait "5" seconds
		# Refer to issue https://github.ibm.com/ibp/OpTools/issues/6027
		Then a tile with title '<componentName>' should not exist on page
        And I am on the 'nodes' page

    Examples:
      | componentTitle        | componentId | componentName   | componentNameNew  |
      | Certificate Authority | ca          | ca01            | ca01updated       |
      | Certificate Authority | ca          | ca02            | ca02updated       |

    Scenario: Deleting API keys and access tokens
		Then As 'manager' I send request to "DELETE" access token for "reader" completes with '200'
  	 	Then As 'manager' delete API key for "reader" role with description "apiKey4reader" completes with '200'
		Then As 'manager' I send request to "DELETE" access token for "writer" completes with '200'
  	 	Then As 'manager' delete API key for "writer" role with description "apiKey4writer" completes with '200'
		Then As 'manager' I send request to "DELETE" access token for "manager" completes with '200'
		Then As 'manager' I send request to "GET" access token for "manager" completes with '403'
		Then As 'manager' delete API key for "manager" role with description "apiKey4manager" completes with '200'
