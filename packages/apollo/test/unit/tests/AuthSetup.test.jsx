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
import { mount } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import store from '../../../src/redux/Store';
import { Provider } from 'react-redux';
// this is the component we're testing - import it wrapped in curly braces to get the version not connected to the redux store
import { AuthSetup } from '../../../src/components/AuthSetup/AuthSetup';

chai.should();
chai.use(sinonChai);

jest.mock('../../../src/components/BlockchainTooltip/BlockchainTooltip', () => () => <></>);

jest.mock('../../../src/components/AuthDetails/AuthDetails', () => () => <div id="authDetails" />);

jest.mock('../../../src/components/Form/Form', () => ({ id, fields }) => (
	<>
		{fields.map(field => (
			<div key={field.name}
				id={id + '-' + field.name}
			/>
		))}
	</>
));

describe('AuthSetup component', () => {
	const SCOPE = 'authSetup';
	let mySandBox;
	let props;
	// Translate
	let translateStub;
	// commonActions
	let showErrorStub;

	beforeEach(() => {
		mySandBox = sinon.createSandbox();
		translateStub = mySandBox.stub().callsFake(inputString => {
			return inputString;
		});
		showErrorStub = mySandBox.stub();
		// initial props
		props = {
			scope: SCOPE,
			showError: showErrorStub,
			translate: translateStub,
		};
	});

	afterEach(() => {
		mySandBox.restore();
	});

	describe('AuthSetup - render AuthSetupAuthentication', () => {
		it('should render', async() => {
			const component = mount(
				<Provider store={store}>
					<AuthSetup {...props} />
				</Provider>
			);
			component.find('.ibp__auth-proceed-button-link').should.have.lengthOf(1);
			component.find('.ibp__auth-proceed-to-config').should.have.lengthOf(1);
			component.find('#btn-continue').should.have.lengthOf(1);
		});
	});

	describe('AuthSetup - render AuthSetupConfiguration', () => {
		it('should render', async() => {
			const component = mount(
				<Provider store={store}>
					<AuthSetup {...props} />
				</Provider>
			);
			component.find(AuthSetup).setState({ currentStep: 2 });
			component.find('#authDetails').should.have.lengthOf(1);
			component.find('#auth-back-btn').should.have.lengthOf(1);
			component.find('#auth-submit-btn').should.have.lengthOf(1);
		});
	});

	describe('AuthSetup - render AuthSetupAddUsers', () => {
		it('should render', async() => {
			const component = mount(
				<Provider store={store}>
					<AuthSetup {...props} />
				</Provider>
			);
			component.find(AuthSetup).setState({ currentStep: 3 });
			component.find('.ibp-admin-contact-email').should.have.lengthOf(1);
			component.find('#auth-back-btn').should.have.lengthOf(1);
			component.find('#auth-submit-btn').should.have.lengthOf(1);
		});
	});

	describe('AuthSetup - render AuthSetupSuccess', () => {
		it('should render', async() => {
			const component = mount(
				<Provider store={store}>
					<AuthSetup {...props} />
				</Provider>
			);
			component.find(AuthSetup).setState({ currentStep: 4 });
			component.find('#ibp__proceed_to_login_btn').should.have.lengthOf(1);
		});
	});
});
