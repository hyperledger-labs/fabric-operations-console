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
import Logger from '../../../src/components/Log/Logger';
// this is the component we're testing - import it wrapped in curly braces to get the version not connected to the redux store
import { AddUserModal } from '../../../src/components/AddUserModal/AddUserModal';

chai.should();
chai.use(sinonChai);
const should = chai.should();

jest.mock('../../../src/components/SidePanel/SidePanel', () => ({ children }) => <>{children}</>);

jest.mock('../../../src/components/BlockchainTooltip/BlockchainTooltip', () => () => <></>);

jest.mock('../../../src/components/EmailChips/EmailChips', () => () => <div className="email_chips" />);

jest.mock('../../../src/components/Form/Form', () => ({ id, fields }) => (
	<>
		{fields.map(field => (
			<div key={field.name}
				id={id + '-' + field.name}
			/>
		))}
	</>
));

describe('AddUserModal component', () => {
	const SCOPE = 'addUsers';
	let mySandBox;
	let props;
	// callbacks
	let onCloseStub;
	let onCompleteStub;
	// Translate
	let translateStub;
	// commonActions
	let showErrorStub;
	let updateStateStub;

	beforeEach(() => {
		mySandBox = sinon.createSandbox();
		onCloseStub = mySandBox.stub();
		onCompleteStub = mySandBox.stub();
		translateStub = mySandBox.stub().callsFake(inputString => {
			return inputString;
		});
		showErrorStub = mySandBox.stub();
		updateStateStub = mySandBox.stub().callsFake((scope, obj) => {
			scope.should.deep.equal(SCOPE);
			for (let prop in obj) {
				props[prop] = obj[prop];
			}
		});
		// initial props
		props = {
			onClose: onCloseStub,
			onComplete: onCompleteStub,
			updateState: updateStateStub,
			showError: showErrorStub,
			translate: translateStub,
		};
	});

	afterEach(() => {
		mySandBox.restore();
	});

	describe('AddUserModal - render', () => {
		it('should render', async() => {
			const component = mount(<AddUserModal {...props} />);
			updateStateStub.should.have.been.calledWithExactly(SCOPE, {
				newUsers: [],
				isEditing: false,
				userEmail: '',
				roles: [],
				disableSave: true,
				submitting: false,
			});
			component.find('.email_chips').should.have.lengthOf(1);
			component.find('#' + SCOPE + '-userEmail').should.have.lengthOf(0);
			expect(
				component
					.find('#role_manager')
					.at(0)
					.props().checked
			).toEqual(undefined);
			expect(
				component
					.find('#role_writer')
					.at(0)
					.props().checked
			).toEqual(undefined);
			expect(
				component
					.find('#role_reader')
					.at(0)
					.props().checked
			).toEqual(undefined);
		});
	});

	describe('AddUserModal - render with user', () => {
		it('should render', async() => {
			props.userDetails = {
				email: 'test@ibm.com',
				roles: [],
			};
			props.isEditing = true;
			props.userEmail = 'test@ibm.com';
			props.roles = [];
			const component = mount(<AddUserModal {...props} />);
			updateStateStub.should.have.been.calledWithExactly(SCOPE, {
				newUsers: [],
				isEditing: true,
				userEmail: 'test@ibm.com',
				roles: [],
				disableSave: false,
				submitting: false,
			});
			component.find('.email_chips').should.have.lengthOf(0);
			component.find('#' + SCOPE + '-userEmail').should.have.lengthOf(1);
		});
	});

	describe('AddUserModal - render with manager role', () => {
		it('should render', async() => {
			props.roles = ['manager', 'writer', 'reader'];
			const component = mount(<AddUserModal {...props} />);
			expect(
				component
					.find('#role_manager')
					.at(0)
					.props().checked
			).toEqual(true);
			expect(
				component
					.find('#role_writer')
					.at(0)
					.props().checked
			).toEqual(true);
			expect(
				component
					.find('#role_reader')
					.at(0)
					.props().checked
			).toEqual(true);
		});
	});

	describe('AddUserModal - render with writer role', () => {
		it('should render', async() => {
			props.roles = ['writer', 'reader'];
			const component = mount(<AddUserModal {...props} />);
			expect(
				component
					.find('#role_manager')
					.at(0)
					.props().checked
			).toEqual(false);
			expect(
				component
					.find('#role_writer')
					.at(0)
					.props().checked
			).toEqual(true);
			expect(
				component
					.find('#role_reader')
					.at(0)
					.props().checked
			).toEqual(true);
		});
	});

	describe('AddUserModal - render with reader role', () => {
		it('should render', async() => {
			props.roles = ['reader'];
			const component = mount(<AddUserModal {...props} />);
			expect(
				component
					.find('#role_manager')
					.at(0)
					.props().checked
			).toEqual(false);
			expect(
				component
					.find('#role_writer')
					.at(0)
					.props().checked
			).toEqual(false);
			expect(
				component
					.find('#role_reader')
					.at(0)
					.props().checked
			).toEqual(true);
		});
	});
});
