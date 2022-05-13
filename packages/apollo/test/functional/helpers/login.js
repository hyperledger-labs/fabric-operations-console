/*
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
const { browser, element, by, ExpectedConditions } = require('protractor');

async function login(email, password) {
	if (!email || !password) {
		email = browser.automationUser;
		password = browser.automationPassword;
	}
    console.log('login: Logging in as %s', email);
	let emailInput = element(by.name('email'));
	await browser.wait(ExpectedConditions.visibilityOf(emailInput), 6000);
	await emailInput.sendKeys(email);

	let passwordInput = element(by.name('login_password'));
	await browser.wait(ExpectedConditions.visibilityOf(passwordInput), 6000);
	await passwordInput.sendKeys(password);

	const loginButton = element(by.css('button[id="login"]'));
	await browser.wait(ExpectedConditions.elementToBeClickable(loginButton), 8000);
	await loginButton.click();
}

async function cloudLogin(email, password) {
    console.log('cloudLogin: Logging in as %s', email);
	let emailInput = element(by.id('userid'));
	await browser.wait(ExpectedConditions.visibilityOf(emailInput), 6000);
	await browser.sleep(1000);
	await emailInput.sendKeys(email);
	await browser.sleep(500);

	let userContainer = element(by.css('.login-form__realm-user-id-row'));
	let loginButton = userContainer.element(by.name('login'));
	await browser.wait(ExpectedConditions.elementToBeClickable(loginButton), 8000);
	await browser.sleep(1000);
	await loginButton.click();
	await browser.sleep(500);

	let passwordInput = element(by.name('password'));
	await browser.wait(ExpectedConditions.visibilityOf(passwordInput), 6000);
	await browser.sleep(1000);
	await passwordInput.sendKeys(password);
	await browser.sleep(500);

	let passwordContainer = element(by.css('.login-form__user-id-wrapper--password'));
	loginButton = passwordContainer.element(by.name('login'));
	await browser.wait(ExpectedConditions.elementToBeClickable(loginButton), 8000);
	await browser.sleep(1000);
	await loginButton.click();
	await browser.sleep(500);
}

async function iamLogin(email, password) {
    console.log('iamLogin: Logging in as %s', email);
	let emailInput = element(by.id('username'));
	await browser.wait(ExpectedConditions.visibilityOf(emailInput), 6000);
	await emailInput.sendKeys(email);

	let loginButton = element(by.id('continue-button'));
	await browser.wait(ExpectedConditions.elementToBeClickable(loginButton), 8000);
	await loginButton.click();

	// Check if Sign in with w3id is displayed or not
	try{
        console.log('Checking if Sign in with w3id text is displayed or not');
        await browser.sleep(10000);
        let signInw3IdElement = element(by.id('credentialSignin'));
        await browser.wait(ExpectedConditions.visibilityOf(signInw3IdElement), 8000);
        let signInw3IdText = await signInw3IdElement.getText();
        console.log('signInw4Text = %s'. signInw3IdText);
        if (signInw3IdText.includes('w3id Credentials')) {
            console.log('Sign in with w3id Credentials link is displayed');
            let signInw3IdLink = element(by.id('credentialSignin'));
            signInw3IdElement.click();
            await browser.sleep(3000);

            console.log('Entering user name')
            let w3EmailInput = element(by.id('user-name-input'));
            await browser.wait(ExpectedConditions.visibilityOf(w3EmailInput), 6000);
            await w3EmailInput.sendKeys(email);
        }
    } catch (err)
    {
        console.log('Error %s', err);
    }

	let passwordInput = element(by.name('password'));
	await browser.wait(ExpectedConditions.visibilityOf(passwordInput), 6000);
	await passwordInput.sendKeys(password);

	loginButton = element(by.id('login-button'));
	await browser.wait(ExpectedConditions.elementToBeClickable(loginButton), 8000);
	await loginButton.click();
	console.log('Clicked on Sign In button');
}

module.exports = {
	login,
	cloudLogin,
	iamLogin,
};
