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
			user: {
				email: null,
				uuid: null,
			},
			error: null,
			submitting: null,

			onClose: mySandBox.stub(),
			updateState: updateStateStub,
			t: translateStub,
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
				.find('default')
				.at(0)
				.props()
				.scope.should.deep.equal(SCOPE);
			component
				.find('default')
				.at(0)
				.props()
				.id.should.deep.equal(SCOPE + '-reset-password');
			component
				.find('default')
				.at(0)
				.props()
				.fields[0].name.should.deep.equal('username_label');
			component
				.find('default')
				.at(0)
				.props()
				.fields[0].default.should.deep.equal('an@email');
			component
				.find('default')
				.at(0)
				.props()
				.fields[0].disabled.should.deep.equal(true);
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
	// describe('ResetPasswordModal - componentDidMount()', () => {
	// 	let componentDidMountSpy;

	// 	beforeEach(() => {
	// 		componentDidMountSpy = mySandBox.spy(ResetPasswordModal.prototype, 'componentDidMount');
	// 		onResetStub = mySandBox.stub(ResetPasswordModal.prototype, 'onReset').resolves();
	// 	});

	// 	function genericResetAndStubs(instance) {
	// 		componentDidMountSpy.resetHistory();
	// 		updateStateStub.resetHistory();
	// 	}
	// });

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
			props.user = {
				email: 'an@email',
			};
			component.setProps(props);
			const instance = component.instance();
			genericResetAndStubs(instance);

			await instance.onReset();

			closeSidePanelStub.should.have.been.called;
			onResetSpy.should.have.been.called;
			updateStateStub.should.have.not.been.called;
			componentDidMountStub.should.have.been.calledOnce;
		});

		it('should log error if unable to reset password', async() => {
			const component = shallow(<ResetPasswordModal {...props} />);
			props.user = {
				email: 'an@email',
			};
			component.setProps(props);
			const instance = component.instance();
			genericResetAndStubs(instance);
			const error = new Error('some error');
			resetPasswordStub.rejects(error);

			await instance.onReset();

			onCompleteStub.should.have.not.been.called;
			closeSidePanelStub.should.have.not.been.called;
			onResetSpy.should.have.been.called;
			updateStateStub.should.have.not.been.called;
			componentDidMountStub.should.have.been.calledOnce;
		});
	});
});
