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
/* eslint-disable react/display-name */
import chai from 'chai';
import { mount, shallow } from 'enzyme';
import React from 'react';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Logger from '../../../src/components/Log/Logger';
import { Login } from '../../../src/components/Login/Login';
import LoginApi from '../../../src/rest/LoginApi';

chai.should();
chai.use(sinonChai);

jest.mock('../../../src/components/Form/Form', () => {
	return {
		__esModule: true,
		default: () => {
			return <></>;
		},
	};
});

jest.mock('../../../src/components/TitleBar/TitleBar', () => {
	return {
		__esModule: true,
		default: () => {
			return <></>;
		},
	};
});

describe('Login component', () => {
	const SCOPE = 'login';
	let mySandBox;
	let translateStub;
	let updateStateStub;
	let validateConfirmPasswordStub;
	let renderStub;
	let props;
	let loginStub;
	let changePasswordStub;
	let logDebugStub;
	let logInfoStub;
	let logErrorStub;

	let originalLocation;

	beforeAll(async() => {
		// window.location is readonly, and it's property href is set
		// directly instead of through a setter. Therefore need to stub
		// the whole location, and replace it with the original at the end.
		originalLocation = window.location;
		Object.defineProperty(window, 'location', {
			value: {
				href: 'some.initial.url',
			},
		});
	});

	beforeEach(async() => {
		mySandBox = sinon.createSandbox();
		loginStub = mySandBox.stub(LoginApi, 'login').resolves('login response');
		changePasswordStub = mySandBox.stub(LoginApi, 'changePassword').resolves('changePassword response');
		logDebugStub = mySandBox.stub(Logger.prototype, 'debug');
		logInfoStub = mySandBox.stub(Logger.prototype, 'info');
		logErrorStub = mySandBox.stub(Logger.prototype, 'error');
		updateStateStub = mySandBox.stub().callsFake((scope, obj) => {
			scope.should.deep.equal(SCOPE);
			Object.keys(obj).forEach(function(key) {
				props[key] = obj[key];
			});
		});
		translateStub = mySandBox.stub().callsFake(inputString => {
			return inputString;
		});

		props = {
			email: undefined,
			login_password: undefined,
			currentPassword: undefined,
			newPassword: undefined,
			loginError: undefined,
			currentPasswordError: undefined,
			newPasswordError: undefined,
			confirmPasswordError: undefined,

			hostUrl: undefined,
			changePassword: undefined,
			confirmPassword: undefined,
			t: translateStub,
			updateState: updateStateStub,
		};
	});

	afterEach(async() => {
		if (renderStub) {
			renderStub.should.have.been.called;
		}
		mySandBox.restore();
	});

	afterAll(async() => {
		delete window.location;
		Object.defineProperty(window, 'location', {
			value: originalLocation,
		});
	});

	describe('Login - render()', () => {
		it('should render for login', () => {
			props.changePassword = false;
			props.email = 'an@email';
			props.login_password = 'password';

			const component = mount(<Login {...props} />);
			component
				.find('div')
				.at(0)
				.hasClass('ibp-login-main')
				.should.equal(true);
			component
				.find('div')
				.at(1)
				.hasClass('ibp-login-content ibp-user-login ')
				.should.equal(true);
			component
				.find('p')
				.at(0)
				.text()
				.should.equal('product_label_login');
			component
				.find('div')
				.at(2)
				.hasClass('ibp-login-form')
				.should.equal(true);
			component
				.find('div')
				.at(3)
				.hasClass('ibp-login-button')
				.should.equal(true);
			component
				.find('Button')
				.at(0)
				.hasClass('login-button')
				.should.equal(true);
			component
				.find('button')
				.at(0)
				.hasClass('login-button bx--btn bx--btn--primary')
				.should.equal(true);
			component
				.find('button')
				.at(0)
				.props()
				.disabled.should.equal(false);
			component
				.find('button')
				.at(0)
				.text()
				.should.deep.equal('login');
		});

		it('should render for changing password', () => {
			const newPass = 'iwenttothestoretobuymilk';		// dummy password please ignore
			props.changePassword = true;
			props.currentPassword = 'password';
			props.newPassword = newPass;
			props.confirmPassword = newPass;
			props.newPasswordError = '';

			const component = mount(<Login {...props} />);
			component
				.find('div')
				.at(0)
				.hasClass('ibp-login-main')
				.should.equal(true);
			component
				.find('div')
				.at(1)
				.hasClass('ibp-login-content ibp-change-password ')
				.should.equal(true);
			component
				.find('p')
				.at(0)
				.text()
				.should.deep.equal('change_your_password');
			component
				.find('div')
				.at(2)
				.hasClass('ibp-login-form')
				.should.equal(true);
			component
				.find('div')
				.at(3)
				.hasClass('ibp-login-button')
				.should.equal(true);
			component
				.find('Button')
				.at(0)
				.hasClass('login-button')
				.should.equal(true);
			component
				.find('button')
				.at(0)
				.hasClass('login-button bx--btn bx--btn--primary')
				.should.equal(true);
			component
				.find('button')
				.at(0)
				.props()
				.disabled.should.equal(false);
			component
				.find('button')
				.at(0)
				.text()
				.should.deep.equal('change_your_password');
		});

		it('should render when disableSubmit is false', () => {
			props.changePassword = false;
			props.email = 'an@email';

			const component = mount(<Login {...props} />);
			component
				.find('div')
				.at(0)
				.hasClass('ibp-login-main')
				.should.equal(true);
			component
				.find('div')
				.at(1)
				.hasClass('ibp-login-content ibp-user-login ')
				.should.equal(true);
			component
				.find('p')
				.at(0)
				.text()
				.should.equal('product_label_login');
			component
				.find('div')
				.at(2)
				.hasClass('ibp-login-form')
				.should.equal(true);
			component
				.find('div')
				.at(3)
				.hasClass('ibp-login-button')
				.should.equal(true);
			component
				.find('Button')
				.at(0)
				.hasClass('login-button')
				.should.equal(true);
			component
				.find('button')
				.at(0)
				.hasClass('login-button bx--btn bx--btn--primary')
				.should.equal(true);
			component
				.find('button')
				.at(0)
				.props()
				.disabled.should.equal(true);
			component
				.find('button')
				.at(0)
				.text()
				.should.deep.equal('login');
		});
	});

	describe('Login - onLogin()', () => {
		beforeEach(async() => {
			renderStub = mySandBox.stub(Login.prototype, 'render').returns();
		});

		it('should modify window.location.href if login successful', async() => {
			const onLogin = mySandBox.stub().returns(true);
			const component = shallow(<Login {...props} />);
			props.email = 'an@email';
			props.login_password = 'password';
			props.onLogin = onLogin;
			component.setProps(props);

			await component.instance().onLogin('unusedInput');

			logInfoStub.should.have.been.calledWithExactly(`Logging in as ${props.email}`);
			loginStub.should.have.been.calledWithExactly(props.email, props.login_password);
			logDebugStub.should.have.been.calledWithExactly(`Logged in as ${props.email}:`, 'login response');
			onLogin.should.have.been.calledOnce;
			// window.location.href.toString().should.equal('/nodes');
		});

		it('should log error if login fails', async() => {
			const component = shallow(<Login {...props} />);

			props.email = 'an@email';
			props.login_password = 'password';
			const error = new Error('login error');
			error.translation = {
				message: 'some translation',
			};
			loginStub.rejects(error);
			component.setProps(props);

			await component.instance().onLogin('unusedInput');

			logInfoStub.should.have.been.calledWithExactly(`Logging in as ${props.email}`);
			loginStub.should.have.been.calledWithExactly(props.email, props.login_password);
			logErrorStub.should.have.been.calledWithExactly(`Failed to log in as ${props.email}: ${error}`);
			props.loginError.should.deep.equal(error.translation && error.translation.message);
		});
	});

	describe('Login - onChangePassword()', () => {
		beforeEach(async() => {
			renderStub = mySandBox.stub(Login.prototype, 'render').returns();
		});

		it('should modify window.location.href if changePassword successful', async() => {
			const component = shallow(<Login {...props} />);
			props.currentPassword = 'password';
			props.newPassword = 'new_password';
			component.setProps(props);

			await component.instance().onChangePassword('unusedInput');

			logInfoStub.should.have.been.calledWithExactly('Changing password');
			changePasswordStub.should.have.been.calledWithExactly(props.currentPassword, props.newPassword);
			logInfoStub.should.have.been.calledWithExactly('Changed password:', 'changePassword response');
			window.location.href.toString().should.equal('/auth/logout');
		});

		it('should log error if changePassword fails with current password error', async() => {
			const component = shallow(<Login {...props} />);
			props.currentPassword = 'password';
			props.newPassword = 'new_password';
			component.setProps(props);
			const error = new Error('current password error');
			error.current_password_errors = [
				{
					translation: {
						message: 'some current password error translation message',
					},
				},
			];
			changePasswordStub.rejects(error);

			await component.instance().onChangePassword('unusedInput');

			logInfoStub.should.have.been.calledWithExactly('Changing password');
			changePasswordStub.should.have.been.calledWithExactly(props.currentPassword, props.newPassword);
			logErrorStub.should.have.been.calledWithExactly(`Password was not changed: ${error}`);
			props.currentPasswordError.should.deep.equal('some current password error translation message');
			props.newPasswordError.should.deep.equal('');
		});

		it('should log error if changePassword fails with new password error', async() => {
			const component = shallow(<Login {...props} />);
			props.currentPassword = 'password';
			props.newPassword = 'new_password';
			component.setProps(props);
			const error = new Error('new password error');
			error.new_password_errors = [
				{
					translation: {
						message: 'some new password error translation message',
					},
				},
			];
			changePasswordStub.rejects(error);

			await component.instance().onChangePassword('unusedInput');

			logInfoStub.should.have.been.calledWithExactly('Changing password');
			changePasswordStub.should.have.been.calledWithExactly(props.currentPassword, props.newPassword);
			logErrorStub.should.have.been.calledWithExactly(`Password was not changed: ${error}`);
			props.currentPasswordError.should.deep.equal('');
			props.newPasswordError.should.deep.equal('some new password error translation message');
		});
	});

	describe('Login - onLoginFormChange()', () => {
		beforeEach(async() => {
			renderStub = mySandBox.stub(Login.prototype, 'render').returns();
		});

		it('should do nothing if value.password not set', async() => {
			const component = shallow(<Login {...props} />);
			updateStateStub.resetHistory();
			const value = 'some value';
			await component.instance().onLoginFormChange(value);

			updateStateStub.should.have.not.been.called;
		});

		it('should reset loginError if value.password set', async() => {
			const component = shallow(<Login {...props} />);
			updateStateStub.resetHistory();
			const value = {
				login_password: 'password',
			};
			props.loginError = 'some old login error';
			component.setProps(props);

			await component.instance().onLoginFormChange(value);

			updateStateStub.should.have.been.called;
			props.loginError.should.deep.equal('');
		});
	});

	describe('Login - onPasswordChangeFormChangeDebounced()', () => {
		beforeEach(async() => {
			validateConfirmPasswordStub = mySandBox.stub(Login.prototype, 'validateConfirmPassword').returns();
			renderStub = mySandBox.stub(Login.prototype, 'render').returns();
		});

		it('should do nothing if no need for validate or reset error', async() => {
			const component = shallow(<Login {...props} />);
			updateStateStub.resetHistory();
			const value = 'some value';
			await component.instance().onPasswordChangeFormChangeDebounced(value);

			updateStateStub.should.have.not.been.called;
			validateConfirmPasswordStub.should.have.not.been.called;
		});

		it('should reset currentPasswordError if value.currentPassword set', async() => {
			const component = shallow(<Login {...props} />);
			updateStateStub.resetHistory();
			const value = {
				currentPassword: 'currentPassword',
			};
			props.currentPasswordError = 'some old current password error';
			component.setProps(props);

			await component.instance().onPasswordChangeFormChangeDebounced(value);

			updateStateStub.should.have.been.called;
			validateConfirmPasswordStub.should.have.not.been.called;
			props.currentPasswordError.should.deep.equal('');
		});

		it('should validateConfirmPassword if value.confirmPassword set', async() => {
			const component = shallow(<Login {...props} />);
			updateStateStub.resetHistory();
			const value = {
				confirmPassword: 'confirmPassword',
			};

			await component.instance().onPasswordChangeFormChangeDebounced(value);

			updateStateStub.should.have.not.been.called;
			validateConfirmPasswordStub.should.have.been.calledWithExactly(null, value.confirmPassword);
		});
	});

	describe('Login - validateConfirmPassword()', () => {
		beforeEach(async() => {
			renderStub = mySandBox.stub(Login.prototype, 'render').returns();
		});

		it('should use newPassword from props if not set', async() => {
			const component = shallow(<Login {...props} />);
			updateStateStub.resetHistory();
			props.newPassword = 'password_to_validate';
			props.confirmPasswordError = 'some old error';
			component.setProps(props);
			const newPassword = undefined;
			const confirmPassword = 'password_to_validate';

			await component.instance().validateConfirmPassword(newPassword, confirmPassword);

			updateStateStub.should.have.been.called;
			props.confirmPasswordError.should.deep.equal('');
		});

		it('should use confirmPassword from props if not set', async() => {
			const component = shallow(<Login {...props} />);
			updateStateStub.resetHistory();
			props.confirmPassword = 'password_to_validate';
			props.confirmPasswordError = 'some old error';
			component.setProps(props);
			const newPassword = 'password_to_validate';
			const confirmPassword = undefined;

			await component.instance().validateConfirmPassword(newPassword, confirmPassword);

			updateStateStub.should.have.been.called;
			props.confirmPasswordError.should.deep.equal('');
		});

		it('should update error if passwords don\'t match', async() => {
			const component = shallow(<Login {...props} />);
			updateStateStub.resetHistory();
			props.newPassword = 'password_to_validate';
			props.confirmPasswordError = 'some old error';
			component.setProps(props);
			const newPassword = 'password_to_validate';
			const confirmPassword = 'a_different_password';

			await component.instance().validateConfirmPassword(newPassword, confirmPassword);

			updateStateStub.should.have.been.called;
			props.confirmPasswordError.should.deep.equal('passwords_do_not_match');
		});
	});
});
