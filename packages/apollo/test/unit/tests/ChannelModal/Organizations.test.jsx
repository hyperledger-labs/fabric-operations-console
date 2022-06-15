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
*//* eslint-disable max-len */
/* eslint-disable react/display-name */

import chai from 'chai';
import { shallow } from 'enzyme';
import React from 'react';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { Organizations } from '../../../../src/components/ChannelModal/Wizard/Organizations/Organizations';
chai.should();
chai.use(sinonChai);

describe('Organizations component', () => {
	let mySandBox;
	let props;
	let translateStub;
	let updateStateStub;

	beforeEach(async() => {
		mySandBox = sinon.createSandbox();
		updateStateStub = mySandBox.stub();
		translateStub = mySandBox.stub().callsFake(inputString => {
			return inputString;
		});
		props = {
			updateState: updateStateStub,
			translate: translateStub,
		};
	});

	afterEach(async() => {
		mySandBox.restore();
	});

	it('Should return noOperatorError from checkOperatorCount', () => {
		const SCOPE = 'channelModal';
		props.orgs = [
			{
				msp: 'Org1MSP',
				roles: ['writer', 'reader'],
				admins: ['admincert'],
				root_certs: ['rootcert'],
			},
		];
		const component = shallow(<Organizations {...props} />);
		const instance = component.instance();
		instance.checkOperatorCount();
		updateStateStub.should.have.been.calledWith(SCOPE, {
			noOperatorError: 'no_operator_error',
		});
	});

	it('Should not return noOperatorError from checkOperatorCount', () => {
		const SCOPE = 'channelModal';
		props.orgs = [
			{
				msp: 'Org1MSP',
				roles: ['admin', 'writer', 'reader'],
				admins: ['admincert'],
				root_certs: ['rootcert'],
			},
			{
				msp: 'Org2MSP',
				roles: ['admin', 'writer', 'reader'],
				admins: ['admincert'],
				root_certs: ['rootcert'],
			},
		];
		const component = shallow(<Organizations {...props} />);
		const instance = component.instance();
		instance.checkOperatorCount();
		updateStateStub.should.have.been.calledWith(SCOPE, {
			noOperatorError: null,
		});
	});
});
