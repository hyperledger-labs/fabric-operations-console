# Automated UI Functional Tests Using Cypress

Please follow below steps to setup / run Cucumber driven Cypress UI automated functional test cases.
1. Clone the repository and navigate to Cypress test directory (e.g. "{clone dir}/packages/cypress")
2. To install Cypress and other dependencies, run below command:<br> ```
"npm ci"```<br>
3. Update the config.json file in "fixtures" folder with your console URL and login details before running the test case.
4. In the package.json, below test suits are already defined. <br>
```
 "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "regression": "cypress run -e TAGS=\"@regression\" --headed --browser chrome --spec 'cypress/e2e/features/*.feature'",
    "regression-headless": "cypress run -e TAGS=\"@regression\" --browser chrome --spec 'cypress/e2e/features/*.feature'",
    "buildnetwork": "cypress run --headed --browser chrome --spec 'cypress/e2e/features/2-BuildNetwork.feature'"
  },
```
To execute all test cases / regression test suite, please run below command:
```
npm run regression
```

To execute all test cases / regression test suite in headless mode, please run below command:
```
npm run regression-headless
```

To run cases of specific feature file, you need to add new entry in package.json (as shown above).
```
npm run buildnetwork
```

To execute test cases on existing console, please run below command:
```
npm run runonexistingconsole
```


For more information about Cypress, please refer the steps mentioned [here](https://docs.cypress.io/guides/getting-started/installing-cypress).
