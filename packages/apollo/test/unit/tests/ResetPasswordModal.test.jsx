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
/* eslint-disable react/display-name */
import React from 'react';
import { mount, shallow } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Logger from '../../../src/components/Log/Logger';
import UserSettingsRestApi from '../../../src/rest/UserSettingsRestApi';
import LoginApi from '../../../src/rest/LoginApi';

// this is the component we're testing - import it wrapped in curly braces to get the version not connected to the redux store
import { ResetPasswordModal } from '../../../src/components/ResetPasswordModal/ResetPasswordModal';

chai.should();
chai.use(sinonChai);
const should = chai.should();

jest.mock('../../../src/components/SidePanel/SidePanel');

jest.mock('../../../src/components/Form/Form', () => {
	return {
		__esModule: true,
		default: () => {
			return <></>;
		},
	};
});

describe('ResetPasswordModal component', () => {
	const SCOPE = 'resetPasswordModal';
	let mySandBox;
	let props;
	let logInfoStub;
	let logErrorStub;
	let onResetStub;
	let componentDidMountStub;
	let updateStateStub;
	let translateStub;
	let onCompleteStub;

	beforeEach(() => {
		mySandBox = sinon.createSandbox();
		logInfoStub = mySandBox.stub(Logger.prototype, 'info');
		logErrorStub = mySandBox.stub(Logger.prototype, 'error');

		onCompleteStub = mySandBox.stub();
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
			loading: null,
			user: {
				email: null,
				uuid: null,
			},
			defaultPassword: null,
			error: null,
			submitting: null,

			onClose: mySandBox.stub(),
			updateState: updateStateStub,
			translate: translateStub,
			onComplete: onCompleteStub,
		};
	});

	afterEach(() => {
		mySandBox.restore();
	});

	describe('ResetPasswordModal - render()', () => {
		beforeEach(() => {
			componentDidMountStub = mySandBox.stub(ResetPasswordModal.prototype, 'componentDidMount').resolves();
			onResetStub = mySandBox.stub(ResetPasswordModal.prototype, 'onReset').resolves();
		});

		it('should render', async() => {
			props.loading = false;
			props.submitting = false;
			props.user.email = 'an@email';
			const component = mount(<ResetPasswordModal {...props} />);

			component
				.find('SidePanel')
				.at(0)
				.props()
				.id.should.deep.equal('reset-password');
			component
				.find('SidePanel')
				.at(0)
				.props()
				.submitting.should.deep.equal(props.submitting);
			component
				.find('SidePanel')
				.at(0)
				.props()
				.buttons[0].id.should.deep.equal('cancel');
			component
				.find('SidePanel')
				.at(0)
				.props()
				.buttons[1].id.should.deep.equal('reset_password');
			component
				.find('div')
				.at(2)
				.hasClass('ibp-modal-title')
				.should.equal(true);
			component
				.find('h1')
				.at(0)
				.hasClass('ibm-light')
				.should.equal(true);
			component
				.find('h1')
				.at(0)
				.text()
				.should.deep.equal('reset_password');
			component
				.find('p')
				.at(0)
				.hasClass('ibp-modal-desc')
				.should.equal(true);
			component
				.find('p')
				.at(0)
				.text()
				.should.deep.equal('reset_password_desc');
			component
				.find('_default')
				.at(0)
				.props()
				.scope.should.deep.equal(SCOPE);
			component
				.find('_default')
				.at(0)
				.props()
				.id.should.deep.equal(SCOPE + '-reset-password');
			component
				.find('_default')
				.at(0)
				.props()
				.fields[0].name.should.deep.equal('username');
			component
				.find('_default')
				.at(0)
				.props()
				.fields[0].default.should.deep.equal('an@email');
			component
				.find('_default')
				.at(0)
				.props()
				.fields[0].disabled.should.deep.equal(true);
			component
				.find('_default')
				.at(0)
				.props()
				.fields[1].name.should.deep.equal('defaultPassword');
			component
				.find('_default')
				.at(0)
				.props()
				.fields[1].placeholder.should.deep.equal('defaultPassword_placeholder');
			component
				.find('_default')
				.at(0)
				.props()
				.fields[1].default.should.deep.equal('');
			component
				.find('_default')
				.at(0)
				.props()
				.fields[1].disabled.should.deep.equal(true);
			onResetStub.should.have.not.been.called;
		});

		it('should run onReset when clicked', async() => {
			const component = mount(<ResetPasswordModal {...props} />);

			component
				.find('SidePanel')
				.at(0)
				.props()
				.buttons[1].onClick();
			onResetStub.should.have.been.calledOnce;
		});
	});

	/*
	 * componentDidMount is async and not being stubbed,
	 * so added wait before shallow and instance.componentDidMount().
	 */
	describe('ResetPasswordModal - componentDidMount()', () => {
		let componentDidMountSpy;
		let getDefaultPasswordStub;

		beforeEach(() => {
			componentDidMountSpy = mySandBox.spy(ResetPasswordModal.prototype, 'componentDidMount');
			onResetStub = mySandBox.stub(ResetPasswordModal.prototype, 'onReset').resolves();
			getDefaultPasswordStub = mySandBox.stub(UserSettingsRestApi, 'getDefaultPassword').resolves();
		});

		function genericResetAndStubs(instance) {
			componentDidMountSpy.resetHistory();
			updateStateStub.resetHistory();
		}

		it('should set default password to null if no valid response', async() => {
			const component = await shallow(<ResetPasswordModal {...props} />);
			props.defaultPassword = 'dummyDefaultPassword'; // pragma: allowlist secret
			component.setProps(props);
			const instance = component.instance();
			genericResetAndStubs(instance);

			await instance.componentDidMount();

			props.loading.should.equal(false);
			should.equal(null, props.defaultPassword);
			componentDidMountSpy.should.have.been.called;
			updateStateStub.should.have.been.calledTwice;
		});

		it('should set default password to response password if valid', async() => {
			const component = await shallow(<ResetPasswordModal {...props} />);
			props.defaultPassword = 'dummyDefaultPassword'; // pragma: allowlist secret
			component.setProps(props);
			const instance = component.instance();
			genericResetAndStubs(instance);
			const newpassword = 'newDummyPassword'; // pragma: allowlist secret
			getDefaultPasswordStub.resolves({ DEFAULT_USER_PASSWORD: newpassword }); // pragma: allowlist secret

			await instance.componentDidMount();

			props.loading.should.equal(false);
			props.defaultPassword.should.equal(newpassword);
			componentDidMountSpy.should.have.been.called;
			updateStateStub.should.have.been.calledTwice;
		});

		it('should log error if error thrown by getDefaultPassword', async() => {
			const component = await shallow(<ResetPasswordModal {...props} />);
			props.defaultPassword = 'dummyDefaultPassword'; // pragma: allowlist secret
			component.setProps(props);
			const instance = component.instance();
			genericResetAndStubs(instance);
			const error = new Error('some error');
			getDefaultPasswordStub.rejects(error);

			await instance.componentDidMount();
			Promise.all([getDefaultPasswordStub, instance.componentDidMount]);

			logErrorStub.should.have.been.calledWithExactly('Failed to get default password:', error); // pragma: allowlist secret
			props.loading.should.equal(false);
			props.defaultPassword.should.equal('dummyDefaultPassword');

			componentDidMountSpy.should.have.been.called;
			updateStateStub.should.have.been.calledTwice;
		});
	});

	describe('ResetPasswordModal - onReset()', () => {
		let resetPasswordStub;
		let closeSidePanelStub;
		let onResetSpy;
		let response;

		beforeEach(() => {
			componentDidMountStub = mySandBox.stub(ResetPasswordModal.prototype, 'componentDidMount').resolves();
			onResetSpy = mySandBox.spy(ResetPasswordModal.prototype, 'onReset');
			response = 'some response';
			resetPasswordStub = mySandBox.stub(LoginApi, 'resetPassword').resolves(response);
			closeSidePanelStub = mySandBox.stub();
		});

		function genericResetAndStubs(instance) {
			onResetSpy.resetHistory();
			instance.sidePanel = { closeSidePanel: closeSidePanelStub };
		}

		it('should log success if able to reset password', async() => {
			const component = shallow(<ResetPasswordModal {...props} />);
			props.defaultPassword = 'dummyDefaultPassword'; // pragma: allowlist secret
			props.user = {
				email: 'an@email',
			};
			component.setProps(props);
			const instance = component.instance();
			genericResetAndStubs(instance);

			await instance.onReset();

			logInfoStub.should.have.been.calledWith('Resetting password');
			logInfoStub.should.have.been.calledWith('Password reset successfully:', response);
			onCompleteStub.should.have.been.calledWithExactly({
				user: props.user.email,
				password: props.defaultPassword, // pragma: allowlist secret
			});
			closeSidePanelStub.should.have.been.called;
			onResetSpy.should.have.been.called;
			updateStateStub.should.have.not.been.called;
			componentDidMountStub.should.have.been.calledOnce;
		});

		it('should log error if unable to reset password', async() => {
			const component = shallow(<ResetPasswordModal {...props} />);
			props.defaultPassword = 'dummyDefaultPassword'; // pragma: allowlist secret
			props.user = {
				email: 'an@email',
			};
			component.setProps(props);
			const instance = component.instance();
			genericResetAndStubs(instance);
			const error = new Error('some error');
			resetPasswordStub.rejects(error);

			await instance.onReset();

			logInfoStub.should.have.been.calledWith('Resetting password');
			logErrorStub.should.have.been.calledWith(`Could not reset password: ${error}`); // pragma: allowlist secret
			onCompleteStub.should.have.not.been.called;
			closeSidePanelStub.should.have.not.been.called;
			onResetSpy.should.have.been.called;
			updateStateStub.should.have.not.been.called;
			componentDidMountStub.should.have.been.calledOnce;
		});
	});
});
