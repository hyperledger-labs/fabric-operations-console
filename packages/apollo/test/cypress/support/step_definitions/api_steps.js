/*
 * Copyright contributors to the Hyperledger Fabric Operations Console project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

import { Given, Then, When } from "@badeball/cypress-cucumber-preprocessor";
import { until } from "async";

Cypress.on('uncaught:exception', (err, runnable) => {
	return false
})


/*
#*****************************************************************************
#* Wait for a component getting ready
#*----------------------------------------------------------------------------
#* This function waits for a component to get started by polling the
#* operations URL of the component.
#*
#* Input Parameters:
#*   - componentName - Name of the component to get started
#*
#* Output Parameters:
#*   - none
#*
#*****************************************************************************
*/
Then(/^Wait for (?:'|")(.*?)(?:'|") getting ready$/, (componentName) => {
	let i = 0

	function req() {
		cy
			.wait(3000)
			.exec(curl_request, { failOnNonZeroExit: false }
			).then((response) => {
				// alert(JSON.stringify(response))
				i++

				cy.log('response.code = ' + response.code)

				if (response.code == 0) {
					cy.log('duration = ' + i * 3 + ' seconds')
					respBody = JSON.parse(JSON.stringify(response))["stdout"]
					cy.log('respBody = ' + respBody)
					// cy.log('respBody.status = ' + respBody.status)
					cy.writeFile('fixtures/response.json', respBody)
					cy.readFile('fixtures/response.json').then((resp) => {
						cy.log('resp.status = ' + resp.status)
						expect(resp.status).to.eq("OK")
					})
					// break out of the recursive loop
					return
				}


				// else recurse
				req()
			})
	}
	cy.fixture("config.json").then((data) => {
		loginUrl = data.loginUrl
		cy.log('loginUrl = ' + loginUrl)

		nameSpace = loginUrl.substring(0, loginUrl.indexOf('-') + 1)
		cy.log('nameSpace = ' + nameSpace)

		domain = loginUrl.substring(loginUrl.indexOf(".") + 1)
		cy.log('domain = ' + domain)

		compName = componentName.replaceAll(' ', '')
		cy.log('compName = ' + compName)

		opUrl = 'https://ibp-' + compName + '-operations.' + domain + 'healthz'
		opUrl = nameSpace + compName + '-operations.' + domain + 'healthz'
		cy.log('opUrl = ' + opUrl)
		curl_request = `curl ${opUrl} -k`
		cy.log('curl_request = ' + curl_request)

		// now start the polling
		cy.then(req)
	})

});


/*
#*****************************************************************************
#* getUserId()
#*----------------------------------------------------------------------------
#* This function parses the response.json for a given user name.
#* The userId will be written to userId.json
#*
#* Input Parameters:
#*   - cUserName - Name of the user
#*
#*****************************************************************************
*/
function getUserId(cUserName) {

	cy.log('getUserId, entry')

	cy.log('cUserName = ' + cUserName)

	runCurl('GET', 'ak/api/v3/permissions/users')
//	cy.fixture('response.json').then((resp) => {
	cy.readFile('fixtures/response.json').then((resp) => {
		cy.log('resp = ' + resp)
		cy.log('resp.users = ' + resp.users)

		users = JSON.stringify(resp.users)
		//  users = '{' + users +'}'

		//  users = `[{"655ca382-035b-44fe-9e3f-750f8c5d56da":{"email":"test@xyz.com","roles":["manager","writer","reader"],"created":1713178351069}}]`
		cy.log('users = ' + users)
		idx1 = 1
		 idx2 = users.lastIndexOf('},', idx1 + 1)
		idx2 = users.indexOf('},', idx1)
		idxMax = users.length - 2
		cy.log('idxMax = ' + idxMax)

		user = undefined

		while (idx1 <= idxMax)
		// for (i = 0; i < 3; i++)
		{
			cy.log('idx1 = ' + idx1)
			cy.log('idx2 = ' + idx2)

			user = users.substring(idx1, idx2)
			cy.log('user = ' + user)

			if (user.includes(cUserName)) {
				idx1 = idxMax + 2
			}
			else {
				idx1 = idx2 + 2
				// idx2 = idx1 + users.lastIndexOf('},', idx1)
				idx2 = users.indexOf('}', idx1 + 2)

			}
		}

		userId = undefined
		if (user !== 'undefined') {
			userId = user.substring(0, user.indexOf(':'))
		}
		cy.log('userId = ' + userId)

		cy.writeFile('fixtures/userId.json', userId)
		cy.log('getUserId, exit')
	})

}


/*
#*****************************************************************************
#* runCurl()
#*----------------------------------------------------------------------------
#* This function runs a given curl request.
#* The response status will be written to respStatus.json
#* The response body will be written to response.json
#*
#* Input Parameters:
#*   - cRequest     - curl request
#*   - cUrl 	    - curl URL
#*   - cData	    - curl data
#*   - cUserName    - optional user name used for authentication (undefined if not used)
#*   - cAccessToken - optional access token used for authentication
#*
#*****************************************************************************
*/
function runCurl(cRequest, cUrl, cData, cUserName, cAccessToken) {

	cy.log('runCurl, entry')

	cy.log('cRequest = ' + cRequest)
	cy.log('cUrl = ' + cUrl)
	cy.log('cData = ' + cData)
	cy.log('cUserName = ' + cUserName)
	cy.log('cAccessToken = ' + cAccessToken)

	cy.fixture("config.json").then((data) => {
		consoleURL = data.loginUrl + cUrl
		cy.log('consoleURL = ' + consoleURL)

		userName = data.loginUserName
		password = data.loginPassword
		cy.log('userName = ' + userName)
		cy.log('password = ' + password)
		cAuth = `-u ${userName}:${password}`

		// cStatus = `--write-out '{http_code:%{http_code}} {exitcode:%{exitcode}}' --silent --show-error`
		cStatus = `-s -w '%{stderr}%{http_code} %{stdout} '`

		if (typeof (cUserName) !== 'undefined') {
			if (cUserName != 'writeruser@ibm.com' && cUserName != 'readeruser@ibm.com') {
				cUserName = data.loginUserName
			}

			cAuth = `-u ${cUserName}:${password}`
		}

		if (typeof (cAccessToken) !== 'undefined') {
			// cy.fixture('apiToken-' + cAccessToken + '.json').then((key) => {
			cy.readFile('fixtures/' + cAccessToken + '.json').then((key) => {
				api_token = key.access_token
				cy.log('api_token = ' + api_token)

				cAuth = `-H 'Authorization: Bearer '${api_token}`

				cy.log('cAuth = ' + cAuth)

				runCurl2(cRequest, cUrl, cData, cAuth)

			})

		}
		else {
			runCurl2(cRequest, cUrl, cData, cAuth)
		}
	})

	cy.log('runCurl, exit')

	function runCurl2(cRequest, cUrl, cData, cAuth) {
		cy.log('runCurl2, entry')

		cy.log('cAuth = ' + cAuth)

		if (typeof (cData) === 'undefined') {
			curl_request = `curl -X ${cRequest} ${consoleURL} ${cAuth} ${cStatus} -H 'Content-Type: application/json' -k`
		}
		else {
			// curl_request = `curl -X ${cRequest} ${consoleURL} ${cAuth} ${cStatus} -H 'Content-Type: application/json' -k -d ${cData}`
			curl_request = `curl -X ${cRequest} ${consoleURL} ${cAuth} ${cStatus} -H 'accept: application/json' -H 'Content-Type: application/json' -k -d ${cData}`

		}
		cy.log('curl_request = ' + curl_request)
		cy.exec(curl_request
		).then((response) => {
			// cy.exec(`curl -X ${request} ${consoleURL} -H 'Content-Type: application/json' -H 'Authorization: Bearer '${api_token} -k
			// `).then((response) => {
			const respStatus = JSON.parse(JSON.stringify(response))["stderr"]
			cy.log('respStatus = ' + respStatus)
			cy.writeFile('fixtures/respStatus.json', respStatus)
			// szRespStatus = String(respStatus)
			// cy.log('szRespStatus = ' + szRespStatus)
			// cy.writeFile('fixtures/respStatus.json', szRespStatus)

			const respBody = JSON.parse(JSON.stringify(response))["stdout"]
			cy.log('respBody = ' + respBody)
			cy.writeFile('fixtures/response.json', respBody)

			//expect(respBody).contains('"message":"ok"')
			// cy.readFile('fixtures/respStatus.json').then((iStatus) => {
			// 	cy.log('iStatus = ' + iStatus)

			// })
		})

		cy.log('runCurl2, exit')
	}

}


Then(/^As (?:'|")(.*?)(?:'|") run curl command for (?:'|")(.*?)(?:'|") request with URL (?:'|")(.*?)(?:'|") completes with (?:'|")(.*?)(?:'|")$/, (userName, request, url, statusExpected) => {

	cy.log('statusExpected = ' + statusExpected)
	const iStatusExpected = parseInt(statusExpected)
	cy.log('iStatusExpected = ' + iStatusExpected)

	// runCurl(request, url, undefined, userName)
	runCurl(request, url, undefined, userName, 'apiToken-' + userName)
	//cy.wait(3000)
	cy.readFile('fixtures/respStatus.json').then((iStatus) => {
		//cy.fixture('respStatus.json').then((iStatus) => {
		cy.log('iStatus = ' + iStatus)

		expect(iStatus).to.eq(iStatusExpected)

	})

});


Then(/^As (?:'|")(.*?)(?:'|") run curl command with userId for (?:'|")(.*?)(?:'|") request with URL (?:'|")(.*?)(?:'|") completes with (?:'|")(.*?)(?:'|")$/, (userName, request, url, statusExpected) => {

	cy.log('statusExpected = ' + statusExpected)
	const iStatusExpected = parseInt(statusExpected)
	cy.log('iStatusExpected = ' + iStatusExpected)

	// runCurl(request, url, undefined, userName)
	runCurl(request, url, undefined, userName)
	//cy.wait(3000)
	cy.readFile('fixtures/respStatus.json').then((iStatus) => {
		//cy.fixture('respStatus.json').then((iStatus) => {
		cy.log('iStatus = ' + iStatus)

		expect(iStatus).to.eq(iStatusExpected)

	})

});


Given(/^As (?:'|")(.*?)(?:'|") create API key for (?:'|")(.*?)(?:'|") role with description (?:'|")(.*?)(?:'|") completes with (?:'|")(.*?)(?:'|")$/, (userName, role, description, statusExpected) => {

	cy.log('role = ' + role)
	cy.log('description = ' + description)
	const iStatusExpected = parseInt(statusExpected)
	cy.log('iStatusExpected = ' + iStatusExpected)

	data = `'{
		"roles": ["${role}"],"description": "${description}"
		}'`

	cy.log('data  = ' + data)

	runCurl('POST', 'ak/api/v3/permissions/keys', data, userName)
	cy.readFile('fixtures/response.json').then((resp) => {
		cy.log('resp = ' + resp)
		if (userName != 'writeruser@ibm.com' && userName != 'readeruser@ibm.com') {
			cy.writeFile('fixtures/apiKey-' + role + '.json', resp)
			cy.readFile('fixtures/apiKey-' + role + '.json').then((key) => {
				api_key = key.api_key
				cy.log('api_key = ' + api_key)
				api_secret = key.api_secret
				cy.log('api_secret = ' + api_secret)
			})
		}

	})

	cy.readFile('fixtures/respStatus.json').then((iStatus) => {
		//cy.fixture('respStatus.json').then((iStatus) => {
		cy.log('iStatus = ' + iStatus)

		expect(iStatus).to.eq(iStatusExpected)
	})


});



Then(/^As (?:'|")(.*?)(?:'|") delete API key for (?:'|")(.*?)(?:'|") role with description (?:'|")(.*?)(?:'|") completes with (?:'|")(.*?)(?:'|")$/, (userName, role, description, statusExpected) => {

	cy.log('role = ' + role)
	cy.log('description = ' + description)
	const iStatusExpected = parseInt(statusExpected)
	cy.log('iStatusExpected = ' + iStatusExpected)

	cy.readFile('fixtures/apiKey-' + role + '.json').then((key) => {
		apiKey = key.api_key
		cy.log('apiKey = ' + apiKey)

		runCurl('DELETE', 'ak/api/v3/permissions/keys/' + apiKey, undefined, userName)
		// runCurl('DELETE', 'ak/api/v3/permissions/keys/' + apiKey, undefined, userName, 'apiToken-' + userName)

		cy.readFile('fixtures/respStatus.json').then((iStatus) => {
			//cy.fixture('respStatus.json').then((iStatus) => {
			cy.log('iStatus = ' + iStatus)

			expect(iStatus).to.eq(iStatusExpected)

			if (iStatusExpected == 200) {
				cy.readFile('fixtures/response.json').then((resp) => {
					cy.log('resp = ' + resp)
					cy.log('resp.deleted = ' + resp.deleted)

					expect(resp.deleted).to.eq(apiKey)
				})

			}


		})

	})



});



Then(/^I send request to create an access token for (?:'|")(.*?)(?:'|") role with description (?:'|")(.*?)(?:'|")$/, (role, description) => {
	cy.readFile('fixtures/apiKey-' + role + '.json').then((key) => {
		api_key = key.api_key
		cy.log('api_key = ' + api_key)
		api_secret = key.api_secret
		cy.log('api_secret = ' + api_secret)
	})
	cy.fixture("config.json").then((data) => {
		consoleURL = data.loginUrl + 'ak/api/v3/identity/token'
		userName = data.loginUserName
		password = data.loginPassword
		curl_request = `curl --insecure -X POST ${consoleURL} -H 'Accept: application/json' -H 'Content-Type:application/json' --data-raw '{"apikey": "${api_key}:${api_secret}"}'`
		cy.log('curl_request = ' + curl_request)
		cy.exec(curl_request
		).then((response) => {
			//  alert(JSON.stringify(response))
			const respBody = JSON.parse(JSON.stringify(response))["stdout"]
			cy.log('respBody = ' + respBody)
			cy.writeFile('fixtures/apiToken-' + role + '.json', respBody)
			cy.readFile('fixtures/apiToken-' + role + '.json').then((key) => {
				api_token = key.access_token
				cy.log('api_token = ' + api_token)
			})
		}
		)
	}
	)
});




Then(/^As (?:'|")(.*?)(?:'|") I send request to (?:'|")(.*?)(?:'|") access token for (?:'|")(.*?)(?:'|") completes with (?:'|")(.*?)(?:'|")$/, (userName, request, role, statusExpected) => {
	cy.log('userName = ' + userName)
	cy.log('request = ' + request)
	cy.log('role = ' + role)
	const iStatusExpected = parseInt(statusExpected)
	cy.log('iStatusExpected = ' + iStatusExpected)

	cy.readFile('fixtures/apiToken-' + role + '.json').then((key) => {
		api_token = key.access_token
		cy.log('api_token = ' + api_token)

		runCurl(request, 'ak/api/v3/identity/token/' + api_token, undefined, undefined, 'apiToken-' + userName)

		cy.readFile('fixtures/respStatus.json').then((iStatus) => {
			//cy.fixture('respStatus.json').then((iStatus) => {
			cy.log('iStatus = ' + iStatus)

			expect(iStatus).to.eq(iStatusExpected)
		})
	})

});


Then(/^Get users (?:'|")(.*?)(?:'|")$/, (userName) => {

	cy.log('userName = ' + userName)

	runCurl('GET', 'ak/api/v3/permissions/users')
	cy.readFile('fixtures/response.json').then((resp) => {
		cy.log('resp = ' + resp)
		cy.log('resp.users = ' + resp.users)

		users = JSON.stringify(resp.users)
		cy.log('users = ' + users)

		userId = users.substring(
			users.indexOf("},") + 2,
			users.lastIndexOf(`:{"email":"${userName}"`)
		);
		cy.log('userId = ' + userId
		)

		myData = `'{ "uuids": [ ${userId} ] }'`
		cy.log('myData  = ' + myData)

	})

});


Then(/^As (?:'|")(.*?)(?:'|") add user (?:'|")(.*?)(?:'|") with role (?:'|")(.*?)(?:'|") completes with (?:'|")(.*?)(?:'|")$/, (userName, newUser, role, statusExpected) => {

	cy.log('userName = ' + userName)
	cy.log('newUser = ' + newUser)
	cy.log('role = ' + role)
	const iStatusExpected = parseInt(statusExpected)
	cy.log('iStatusExpected = ' + iStatusExpected)

	data = `'{ \
			 "users": { \
			 	 "${newUser}": { \
			  	"roles": ["${role}"] \
				} \
			  } \
			}'`

	cy.log('data  = ' + data)

	runCurl('POST', 'ak/api/v3/permissions/users', data)
	cy.readFile('fixtures/response.json').then((resp) => {
		// cy.log('resp.status = ' + resp.status)
		// respBody = {"message":"ok"}
		cy.log('resp.message = ' + resp.message)
		// expect(resp.message[0]).contains(expectedMsg)
	})
	cy.readFile('fixtures/respStatus.json').then((iStatus) => {
		//cy.fixture('respStatus.json').then((iStatus) => {
		cy.log('iStatus = ' + iStatus)

		expect(iStatus).to.eq(iStatusExpected)

	})


});


Then(/^As (?:'|")(.*?)(?:'|") edit user (?:'|")(.*?)(?:'|") with role (?:'|")(.*?)(?:'|") completes with (?:'|")(.*?)(?:'|")$/, (userName, userToEdit, roles, statusExpected) => {

	cy.log('userName = ' + userName)
	cy.log('userToEdit = ' + userToEdit)
	cy.log('roles = ' + roles)
	const iStatusExpected = parseInt(statusExpected)
	cy.log('iStatusExpected = ' + iStatusExpected)

	userId = getUserId(userToEdit)

	cy.readFile('fixtures/userId.json').then((userId) => {
		cy.log('userId = ' + userId)


		data = `'{ \
 			 "uuids": { \
					"${userId}": { \
			  	"roles": ["${roles}"] \
				} \
			  } \
			}'`

		cy.log('data  = ' + data)

		runCurl('PUT', 'ak/api/v3/permissions/users', data, userName)
		cy.readFile('fixtures/respStatus.json').then((iStatus) => {
			//cy.fixture('respStatus.json').then((iStatus) => {
			cy.log('iStatus = ' + iStatus)

			expect(iStatus).to.eq(iStatusExpected)

		})

	})

});


Then(/^As (?:'|")(.*?)(?:'|") remove user (?:'|")(.*?)(?:'|") completes with (?:'|")(.*?)(?:'|")$/, (userName, userToDelete, statusExpected) => {

	cy.log('userName = ' + userName)
	cy.log('userToDelete = ' + userToDelete)
	const iStatusExpected = parseInt(statusExpected)
	cy.log('iStatusExpected = ' + iStatusExpected)

	userId = getUserId(userToDelete)

	cy.readFile('fixtures/userId.json').then((userId) => {
		cy.log('userId = ' + userId)

		userId = undefined
		if (user !== 'undefined') {
			userId = user.substring(0, user.indexOf(':'))
		}
		cy.log('userId = ' + userId)

		runCurl('DELETE', 'ak/api/v3/permissions/users?\'uuids=\\[' + userId + '\\]\'', undefined, userName)

		cy.readFile('fixtures/respStatus.json').then((iStatus) => {
			//cy.fixture('respStatus.json').then((iStatus) => {
			cy.log('iStatus = ' + iStatus)

			expect(iStatus).to.eq(iStatusExpected)

		})

		// cy.fixture('response.json').then((resp) => {
		// 	cy.log('resp.status = ' + resp.status)
		// 	// respBody = {"message":"ok"}
		// 	expect(resp.message).to.eq("ok")
		// })


	})

});



Then(/^As (?:'|")(.*?)(?:'|") list users (?:'|")(.*?)(?:'|") with role (?:'|")(.*?)(?:'|") completes with (?:'|")(.*?)(?:'|")$/, (userName, newUser, role, statusExpected) => {
	cy.fixture("config.json").then((data) => {
		if (userName != 'writeruser@ibm.com' && userName != 'readeruser@ibm.com') {
			userName = data.loginUserName
		}
	})
	const iStatusExpected = parseInt(statusExpected)
	cy.log('iStatusExpected = ' + iStatusExpected)

	runCurl('GET', 'ak/api/v3/permissions/users', undefined, userName)

	cy.readFile('fixtures/response.json').then((resp) => {
		cy.log('resp.status = ' + resp.status)


	})
	cy.readFile('fixtures/respStatus.json').then((iStatus) => {
		//cy.fixture('respStatus.json').then((iStatus) => {
		cy.log('iStatus = ' + iStatus)

		expect(iStatus).to.eq(iStatusExpected)

	})


});



Then(/^As (?:'|")(.*?)(?:'|") create CA with name (?:'|")(.*?)(?:'|") completes with (?:'|")(.*?)(?:'|")$/, (userName, caName, statusExpected) => {

	cy.log('statusExpected = ' + statusExpected)
	const iStatusExpected = parseInt(statusExpected)
	cy.log('iStatusExpected = ' + iStatusExpected)

	data = `'{
		\"display_name\": \"${caName}\",
		\"config_override\":{
			\"ca\":{
			  \"registry\":{
				\"maxenrollments\": -1,
				\"identities\": [{
				  \"name\": \"admin\",
				  \"pass\": \"password\",
				  \"type\": \"client\",
				  \"affiliation\": \"\",
				  \"attrs\":{
						\"hf.Registrar.Roles\": \"*\",
						\"hf.Registrar.DelegateRoles\": \"*\",
						\"hf.Revoker\": true,
						\"hf.IntermediateCA\": true,
						\"hf.GenCRL\": true,
						\"hf.Registrar.Attributes\": \"*\",
						\"hf.AffiliationMgr\": true
				  }
				}]
			  }
			}
			}
		}'`

	cy.log('data  = ' + data)

	runCurl('POST', 'ak/api/v3/kubernetes/components/fabric-ca', data, userName)
	cy.readFile('fixtures/respStatus.json').then((iStatus) => {
		//cy.fixture('respStatus.json').then((iStatus) => {
		cy.log('iStatus = ' + iStatus)

		expect(iStatus).to.eq(iStatusExpected)

	})


});


Then(/^As (?:'|")(.*?)(?:'|") update CA with name (?:'|")(.*?)(?:'|") to (?:'|")(.*?)(?:'|") completes with (?:'|")(.*?)(?:'|")$/, (userName, caName, caNameNew, statusExpected) => {

	cy.log('caNameNew = ' + caNameNew)
	cy.log('statusExpected = ' + statusExpected)
	const iStatusExpected = parseInt(statusExpected)
	cy.log('iStatusExpected = ' + iStatusExpected)

	data = `'{
		\"display_name\": \"${caNameNew}\"
		}'`

	cy.log('data  = ' + data)

	// runCurl('PUT', 'ak/api/v3/kubernetes/components/fabric-ca/' + caName, data, userName, 'apiToken-' + userName)
	runCurl('PUT', 'ak/api/v3/components/fabric-ca/' + caName, data, userName, 'apiToken-' + userName)

	cy.readFile('fixtures/respStatus.json').then((iStatus) => {
		//cy.fixture('respStatus.json').then((iStatus) => {
		cy.log('iStatus = ' + iStatus)

		expect(iStatus).to.eq(iStatusExpected)

	})


});



function checkHealth(componentName) {

	function req() {
		cy
			.exec(curl_request, { failOnNonZeroExit: false }
			).then((response) => {
				// alert(JSON.stringify(response))

				cy.log('response.code = ' + response.code)

				if (response.code == 0) {
					respBody = JSON.parse(JSON.stringify(response))["stdout"]
					cy.log('respBody = ' + respBody)
					cy.log('respBody len = ' + respBody.length)

					//return respBody
					// expect(respBody.length).to.eq(0)

					//body = '{"len":"' + respBody.length +'"}'
					body = '{"len":' + respBody.length + '}'
					//body = '{"len":"55"}'
					cy.writeFile('fixtures/health.json', body)
					// cy.fixture('health.json').then((resp) => {
					// 	cy.log('resp.status = ' + resp.status)
					// 	expect(resp.status).to.eq("OK")
					// })

				}
			})

	}

	cy.log('checkHealth(), entry')

	cy.log('componentName = ' + componentName)
	cy.fixture("config.json").then((data) => {
		loginUrl = data.loginUrl
		domain = loginUrl.substring(loginUrl.indexOf(".") + 1)
		cy.log('domain = ' + domain)

		opUrl = 'https://ibp-' + componentName + '-operations.' + domain + 'healthz'
		cy.log('opUrl = ' + opUrl)
		curl_request = `curl ${opUrl} -k`
		cy.log('curl_request = ' + curl_request)

		// now start the requests
		cy.then(req)
	})

	cy.log('checkHealth(), exit')

}


Then(/^a tile with title (?:'|")(.*?)(?:'|") should not exist on page$/, tileTitle => {
	// cy.wait(2000);
	// try {
	// cy.get('.ibp-tile-content-title').contains(tileTitle).should('not.exist')
	// } catch (err) {
	// cy.log("Error: ", err)
	// }

	checkHealth(tileTitle)
	cy.fixture('health.json').then((resp) => {
		cy.log('resp.len = ' + resp.len)
		expect(resp.len).to.eq(0)
	})


});
