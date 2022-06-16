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
// this is the component we're testing - import it wrapped in curly braces to get the version not connected to the redux store
import { CAAddUserModal } from '../../../src/components/CAAddUserModal/CAAddUserModal';

chai.should();
chai.use(sinonChai);
const should = chai.should();

jest.mock('../../../src/components/BlockchainTooltip/BlockchainTooltip', () => () => <></>);

jest.mock('../../../src/components/Form/Form', () => ({ id, fields }) => (
	<>
		{fields.map(field => (
			<div key={field.name}
				id={id + '-' + field.name}
			/>
		))}
	</>
));

jest.mock('../../../src/components/Wizard/Wizard', () => ({ children }) => <>{children}</>);

describe('CAAddUserModal component', () => {
	const SCOPE = 'addUser';
	let mySandBox;
	let props;
	// callbacks
	let onCloseStub;
	let onCompleteStub;
	// Translate
	let translateStub;
	// commonActions
	let updateStateStub;

	beforeEach(() => {
		mySandBox = sinon.createSandbox();
		onCloseStub = mySandBox.stub();
		onCompleteStub = mySandBox.stub();
		translateStub = mySandBox.stub().callsFake(inputString => {
			return inputString;
		});
		updateStateStub = mySandBox.stub().callsFake((scope, obj) => {
			scope.should.deep.equal(SCOPE);
			for (let prop in obj) {
				props[prop] = obj[prop];
			}
		});
		// initial props
		props = {
			ca: {},
			affiliations: [],
			onClose: onCloseStub,
			onComplete: onCompleteStub,
			updateState: updateStateStub,
			translate: translateStub,
		};
	});

	afterEach(() => {
		mySandBox.restore();
	});

	describe('CAAddUserModal - render', () => {
		it('should render', async() => {
			const component = mount(<CAAddUserModal {...props} />);
			updateStateStub.should.have.been.calledWithExactly(SCOPE, {
				enrollValid: false,
				attributesValid: true,
				rootAffil: true,
			});
			component.find('.ibp-wizard-step').should.have.lengthOf(2);
			component.find('#' + SCOPE + '-enrollUser-enroll_id').should.have.lengthOf(1);
			component.find('#' + SCOPE + '-enrollUser-enroll_secret').should.have.lengthOf(1);
			component.find('#' + SCOPE + '-type').should.have.lengthOf(1);
			component.find('.ibp-affiliation-form').should.have.lengthOf(0);
			component.find('#' + SCOPE + '-affiliation-affiliation').should.have.lengthOf(0);
			component.find('#' + SCOPE + '-max_enrollments-max_enrollments').should.have.lengthOf(1);
			component.find('#' + SCOPE + '-attrs-attributes').should.have.lengthOf(1);
		});
	});

	describe('CAAddUserModal - render with affilations', () => {
		it('should render', async() => {
			props.affiliations = ['affiliation'];
			const component = mount(<CAAddUserModal {...props} />);
			updateStateStub.should.have.been.calledWithExactly(SCOPE, {
				enrollValid: false,
				attributesValid: true,
				rootAffil: true,
			});
			component.find('.ibp-wizard-step').should.have.lengthOf(2);
			component.find('#' + SCOPE + '-enrollUser-enroll_id').should.have.lengthOf(1);
			component.find('#' + SCOPE + '-enrollUser-enroll_secret').should.have.lengthOf(1);
			component.find('#' + SCOPE + '-type').should.have.lengthOf(1);
			component.find('.ibp-affiliation-form').should.have.lengthOf(1);
			component.find('#' + SCOPE + '-affiliation-affiliation').should.have.lengthOf(1);
			component.find('#' + SCOPE + '-max_enrollments-max_enrollments').should.have.lengthOf(1);
			component.find('#' + SCOPE + '-attrs-attributes').should.have.lengthOf(1);
		});
	});
});
