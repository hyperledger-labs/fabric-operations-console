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
import { AddIdentityModal } from '../../../src/components/AddIdentityModal/AddIdentityModal';

chai.should();
chai.use(sinonChai);
const should = chai.should();

jest.mock('../../../src/components/SidePanel/SidePanel', () => ({ children }) => <>{children}</>);

jest.mock('../../../src/components/JsonInput/JsonInput', () => ({ id, definition }) => (
	<>
		{definition.map(field => (
			<div key={field.name}
				id={id + '-' + field.name}
			/>
		))}
	</>
));

describe('AddIdentityModal component', () => {
	const SCOPE = 'addIdentityModal';
	let mySandBox;
	let props;
	// callbacks
	let onCloseStub;
	let onCompleteStub;
	// Logger
	let logErrorStub;
	let logDebugStub;
	// Translate
	let translateStub;
	// commonActions
	let updateStateStub;

	beforeEach(() => {
		mySandBox = sinon.createSandbox();
		onCloseStub = mySandBox.stub();
		onCompleteStub = mySandBox.stub();
		logErrorStub = mySandBox.stub(Logger.prototype, 'error');
		logDebugStub = mySandBox.stub(Logger.prototype, 'debug');
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
			onClose: onCloseStub,
			onComplete: onCompleteStub,
			updateState: updateStateStub,
			translate: translateStub,
		};
	});

	afterEach(() => {
		mySandBox.restore();
	});

	describe('AddIdentityModal - render', () => {
		it('should render', async() => {
			const component = mount(<AddIdentityModal {...props} />);
			updateStateStub.should.have.been.calledWithExactly(SCOPE, {
				data: [],
				disableSubmit: true,
				submitting: false,
				error: null,
				parsed: null,
			});
			component.find('#addIdentity-name').should.have.lengthOf(1);
			component.find('#addIdentity-cert').should.have.lengthOf(1);
			component.find('#addIdentity-private_key').should.have.lengthOf(1);
			component.find('.ibp-expiration-date').should.have.lengthOf(0);
		});
	});

	describe('AddIdentityModal - render with parsed cert', () => {
		it('should render', async() => {
			props.parsed = {
				not_after_ts: new Date().getTime(),
				subject_parsed: 'subject',
			};
			const component = mount(<AddIdentityModal {...props} />);
			component.find('#addIdentity-name').should.have.lengthOf(1);
			component.find('#addIdentity-cert').should.have.lengthOf(1);
			component.find('#addIdentity-private_key').should.have.lengthOf(1);
			component.find('.ibp-expiration-date').should.have.lengthOf(2);
		});
	});
});
