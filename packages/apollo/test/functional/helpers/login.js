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
const { browser, element, by, ExpectedConditions } = require('protractor');
const https = require('https');

async function get2FACode() {
	// for 2FA we need the key to use to reference the 'account' of the ID in use
	let ibptest2fa = process.env['IBPTEST_2FA_KEY'];
	if (!ibptest2fa) {
		throw new Error('Need to have IBPTEST_2FA_KEY');
	}

	console.log(`cloud login - getting 2fa code`);
	return new Promise((resolve, reject) => {
		const url = `https://newrelictotp.mybluemix.net/generatePassCode/${ibptest2fa}`;
		console.log('Request URL: %s', url)
		https.get(url, res => {
			let data = [];
			const headerDate = res.headers && res.headers.date ? res.headers.date : 'no response date';
			console.log('Status Code:', res.statusCode);
			console.log('Date in Response header:', headerDate);

			res.on('data', chunk => {
				data.push(chunk);
			});

			res.on('end', () => {
				console.log('Login 2FA - Response ended: ');
				const response = JSON.parse(Buffer.concat(data).toString());
				console.log(response)
				resolve(response.passcode)
			});
		}).on('error', err => {
			reject('Login 2FA - HTTP Error: ', err.message);
		});
	})

}

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
	await browser.sleep(3000);
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
        if (signInw3IdText.includes('w3id Credentials')) {
            console.log('Sign in with w3id Credentials link is displayed');
            let signInw3IdLink = element(by.id('credentialSignin'));
            await signInw3IdElement.click();
            await browser.sleep(5000);

            let w3EmailInput = element(by.id('user-name-input'));
            await browser.wait(ExpectedConditions.visibilityOf(w3EmailInput), 6000);
            await w3EmailInput.sendKeys(email);
        }
    } catch (err)
    {
        console.log('iamLogin: Error %s', err);
    }

	let passwordInput = element(by.name('password'));
	await browser.wait(ExpectedConditions.visibilityOf(passwordInput), 6000);
	console.log('Entering password')
	await passwordInput.sendKeys(password);

	loginButton = element(by.id('login-button'));
	await browser.wait(ExpectedConditions.elementToBeClickable(loginButton), 8000);
	await loginButton.click();
	console.log('Clicked on Sign In button');
	await browser.sleep(10000);

	//Check to see if user is logged in or waiting for 2FA OTP
	console.log('Checking if user is logged in OR 2FA OTP is required');
	let dashboard = element(by.css('[aria-label="Select dashboard"]'));
	if (await dashboard.isPresent()) {
		console.log('Found the dashboard - exit early');
		return; // all is good
	}

	console.log('cloud login - checking for 2FA');
	try{
		// need to approach the 2FA now
		let totp = element(by.id('totp'));
		await browser.wait(ExpectedConditions.elementToBeClickable(totp), 8000);
		console.log('cloud login OTP - is clickable');
		await browser.sleep(1000);
		await totp.click();
		await browser.sleep(3000);

		// we need to at this point get the 2FA key, from the pretend authenticator app
		console.log('Calling 2FA method');
		let otp = await get2FACode();
		console.log(`otp code is ${otp}`);
		// get the input area
		let otpInput = element(by.id('otp-input'));

		await browser.wait(ExpectedConditions.visibilityOf(otpInput), 2000);
		await browser.sleep(1000);
		await otpInput.sendKeys(otp);
		let submitOtpButton = element(by.id('submit_btn'));
		await browser.wait(ExpectedConditions.elementToBeClickable(submitOtpButton), 1000);
		await browser.sleep(1000);
		await submitOtpButton.click();
		await browser.sleep(5000);
	} catch(errorMsg){
		console.log('TOTP not needed...user might have logged in without 2fa');
	}
}

module.exports = {
	login,
	cloudLogin,
	iamLogin,
};
