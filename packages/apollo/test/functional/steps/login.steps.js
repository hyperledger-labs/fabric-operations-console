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

/* eslint-disable new-cap */
/* eslint-disable quotes */
const { Given, Then, When } = require('cucumber');
const { browser, element, by, ExpectedConditions } = require('protractor');
const { login, iamLogin, cloudLogin } = require('../helpers/login');

Given(/^I am on the login page$/, async() => {
	let header = element(by.css('.ibp-login-content-title'));
	await browser.wait(ExpectedConditions.visibilityOf(header), 5000);
	await browser.sleep(5000);
	let text = await header.getText();
	text.should.equal('Login to IBM Blockchain Platform');
});

When(/^I login with the email '(.*?)' and password '(.*?)'$/, async(email, password) => {
	await login(email, password);
});

Then(/^I should be asked to change the default password$/, async() => {
	try{
		await browser.sleep(10000);
		let currentPasswordInput = element(by.name('currentPassword'));
		await browser.wait(ExpectedConditions.visibilityOf(currentPasswordInput), 50000);
		await browser.sleep(5000);
		let isDisplayed = await currentPasswordInput.isDisplayed();
		isDisplayed.should.equal(true);
		console.log('Reset password page is loaded');
	}catch (err) {
		//Check if user is still on login page with error message displayed
		let errorText = element(by.id('login-form-login_password-error-msg'));
		await browser.wait(ExpectedConditions.visibilityOf(errorText), 5000);
		let loginErrorText = await errorText.getText();
		console.log('User is on login page. Error message displayed: %s', loginErrorText);
		console.log('User is not on change the default password page %s', err);
	}
});

Given(/^I am on the change default password page$/, async() => {
	let currentPasswordInput = element(by.name('currentPassword'));
	await browser.wait(ExpectedConditions.visibilityOf(currentPasswordInput), 20000);
	let isDisplayed = await currentPasswordInput.isDisplayed();
	isDisplayed.should.equal(true);
});

When(/^I change the password from '(.*?)' to '(.*?)'$/, async(currentPassword, newPassword) => {
	let currentPasswordInput = element(by.name('currentPassword'));
	await browser.wait(ExpectedConditions.elementToBeClickable(currentPasswordInput), 5000);
	await currentPasswordInput.sendKeys(currentPassword);
	let newPasswordInput = element(by.name('newPassword'));
	await browser.wait(ExpectedConditions.visibilityOf(newPasswordInput), 5000);
	await newPasswordInput.sendKeys(newPassword);
	let confirmPasswordInput = element(by.name('confirmPassword'));
	await browser.wait(ExpectedConditions.elementToBeClickable(confirmPasswordInput), 5000);
	await confirmPasswordInput.sendKeys(newPassword);

	const changePwButton = element(by.css("button[type = 'submit']"));

	await browser.wait(ExpectedConditions.elementToBeClickable(changePwButton), 5000);
	await changePwButton.click();

	await browser.sleep(5000);
});

When(/^I change the password from default password$/, async() => {
	let currentPasswordInput = element(by.name('currentPassword'));
	await browser.wait(ExpectedConditions.elementToBeClickable(currentPasswordInput), 5000);
	await currentPasswordInput.sendKeys(browser.automationDefaultPassword);
	let newPasswordInput = element(by.name('newPassword'));
	await browser.wait(ExpectedConditions.visibilityOf(newPasswordInput), 5000);
	await newPasswordInput.sendKeys(browser.automationPassword);
	let confirmPasswordInput = element(by.name('confirmPassword'));
	await browser.wait(ExpectedConditions.elementToBeClickable(confirmPasswordInput), 5000);
	await confirmPasswordInput.sendKeys(browser.automationPassword);

	const changePwButton = element(by.css("button[type = 'submit']"));

	await browser.wait(ExpectedConditions.elementToBeClickable(changePwButton), 5000);
	await changePwButton.click();

	await browser.sleep(5000);
});

Then(/^I should be redirected to the login page again$/, async() => {
	let emailInput = element(by.name('email'));
	await browser.wait(ExpectedConditions.visibilityOf(emailInput), 10000);
	emailInput.should.not.equal(undefined);

	let header = element(by.css('.ibp-login-content-title'));
	await browser.wait(ExpectedConditions.visibilityOf(header), 10000);
	await browser.sleep(10000);
	let text = await header.getText();
	text.should.equal('Login to IBM Blockchain Platform');
});

Then(/^I should see a welcome modal$/, async() => {
	let welcomeTitle = element(by.className('ibp-template-header'));
	await browser.wait(ExpectedConditions.visibilityOf(welcomeTitle), 5000);

	let welcomeMessage = await welcomeTitle.getText();
	welcomeMessage.should.equal('Welcome to the IBM Blockchain Platform');
});

Given(/^I am logged in$/, async() => {
	try {
		await browser.sleep(5000);
		let header = element(by.css('.ibp-login-content-title'));
		await browser.wait(ExpectedConditions.visibilityOf(header), 2000);
		let text = await header.getText();
		if (text.includes('Login to IBM Blockchain Platform')) {
			await login();
		}
	} catch (err) {
		try {
			// let loginContainer = element(by.css('.login'));
			let header = element(by.css('.heading-container'));
            await browser.sleep(5000);
            await browser.wait(ExpectedConditions.visibilityOf(header), 2000);
			let text = await header.getText();
			if (text.includes('Log in to IBM')) {
				await iamLogin(browser.automationUser, browser.automationPassword);
			}
		} catch (loginError) {
			let current_url = await browser.getCurrentUrl();
			console.log('Current page is %s', current_url);
			console.log('User is already logged in');
		}
	}
});

Given(/^I am logged in for first time$/, async() => {
	try {
		await browser.sleep(3000);
		let header = element(by.css('.ibp-login-content-title'));
		await browser.wait(ExpectedConditions.visibilityOf(header), 2000);
		await browser.sleep(5000);
		let text = await header.getText();
		if (text.includes('Login to IBM Blockchain Platform')) {
			await login(browser.automationUser, browser.automationDefaultPassword);
		}
	} catch (err) {
		console.log('Error logging into IBM Blockchain Platform for the first time.', err);
	}
});


Given(/^I am logged in to IBM Cloud$/, async() => {
	try {
		let header = element(by.css('.login-form__title'));
		await browser.wait(ExpectedConditions.visibilityOf(header), 2000);
		let text = await header.getText();
		if (text.includes('Log in to IBM')) {
			await cloudLogin(browser.automationUser, browser.automationPassword);
		}
	} catch (err) {
		console.log('Error logging into IBM Cloud', err);
		// no op
	}
	let elementId = element(by.css('[aria-label="Select dashboard"]'));
	await browser.wait(ExpectedConditions.visibilityOf(elementId), 30000);
	elementId.should.exist;
});

Given(/^I am ready to get started$/, async() => {
	try {
		let welcomeTitle = element(by.className('ibp-template-header'));
		await browser.wait(ExpectedConditions.visibilityOf(welcomeTitle), 10000);
		let welcomeMessage = await welcomeTitle.getText();
		welcomeMessage.should.equal('Welcome to the IBM Blockchain Platform');

		await browser.sleep(1000);
		let getStartedButton = await element(by.buttonText(`Let's get started`));
		await browser.wait(ExpectedConditions.elementToBeClickable(getStartedButton), 20000);
		await getStartedButton.click();
		await browser.sleep(1000);
	} catch (err) {
		// Already on nodes page
	}
});
