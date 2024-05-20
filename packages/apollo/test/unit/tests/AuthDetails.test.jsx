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
// import Logger from '../../../src/components/Log/Logger';
// this is the component we're testing - import it wrapped in curly braces to get the version not connected to the redux store
import { AuthDetails } from '../../../src/components/AuthDetails/AuthDetails';

chai.should();
chai.use(sinonChai);
// const should = chai.should();

jest.mock('../../../src/components/Form/Form', () => ({ id, fields }) => (
	<>
		{fields.map(field => (
			<div key={field.name}
				id={id + '-' + field.name}
			/>
		))}
	</>
));

describe('AuthDetails component', () => {
	const SCOPE = 'AuthDetails';
	let mySandBox;
	let props;
	// Translate
	let translateStub;
	// commonActions
	let updateStateStub;

	beforeEach(() => {
		mySandBox = sinon.createSandbox();
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
			scope: SCOPE,
			updateState: updateStateStub,
			t: translateStub,
		};
	});

	afterEach(() => {
		mySandBox.restore();
	});

	describe('AuthDetails - render', () => {
		it('should render', async() => {
			const component = mount(<AuthDetails {...props} />);
			component.find('#' + SCOPE + '-configJson').should.have.lengthOf(1);
			component.find('.ibp__auth-auth-manual').should.have.lengthOf(0);
			component.find('.bx--inline-notification').should.have.lengthOf(0);
		});
	});

	describe('AuthDetails - render with manual entry', () => {
		it('should render', async() => {
			const component = mount(<AuthDetails {...props} />);
			component.find(".ibp__auth-configuration--manual").simulate('click');
			component.find('#' + SCOPE + '-configJson').should.have.lengthOf(0);
			component.find('.ibp__auth-auth-manual').should.have.lengthOf(1);
			component.find('#' + SCOPE + '-clientId').should.have.lengthOf(1);
			component.find('#' + SCOPE + '-oauthServerUrl').should.have.lengthOf(1);
			component.find('#' + SCOPE + '-secret').should.have.lengthOf(1);
			component.find('#' + SCOPE + '-tenantId').should.have.lengthOf(1);
		});
	});

	describe('AuthDetails - render with error', () => {
		it('should render', async() => {
			props.error = 'error';
			const component = mount(<AuthDetails {...props} />);
			component.find('.bx--inline-notification').should.have.lengthOf(1);
		});
	});
});
