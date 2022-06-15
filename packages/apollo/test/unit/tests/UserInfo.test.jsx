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

import React from 'react';
import { mount } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { UserInfo } from '../../../src/components/UserInfo/UserInfo';
import ConfigureAuthApi from '../../../src/rest/ConfigureAuthApi';
chai.should();
chai.use(sinonChai);

describe('UserInfo component', () => {
	let mySandBox;
	let listUsersStub;
	let props;

	beforeEach(async() => {
		mySandBox = sinon.createSandbox();
		listUsersStub = mySandBox.stub(ConfigureAuthApi, 'listUsers').resolves();
		props = {
			authScheme: 'couchdb',
			userInfo: {
				password_type: 'default',
				logged: true,
			},
			updateState: mySandBox.stub(),
		};
	});

	afterEach(async() => {
		mySandBox.restore();
	});

	it('Should return null with couchdb and default password type', () => {
		const component = mount(<UserInfo {...props} />);
		component.find('#user-profile-container').should.have.lengthOf(0);
		listUsersStub.should.have.been.calledOnce;
	});

	it('Should return the UserInfo component for the ibmid authentication scheme', () => {
		props.authScheme = 'ibmid';
		const component = mount(<UserInfo {...props} />);
		component.find('#user-profile-container').should.have.lengthOf(1);
		listUsersStub.should.have.been.calledOnce;
	});

	it('Should return the UserInfo component for the couchdb authentication scheme and not default password type ', () => {
		props.userInfo.password_type = 'not default';
		const component = mount(<UserInfo {...props} />);
		component.find('#user-profile-container').should.have.lengthOf(1);
		listUsersStub.should.have.been.calledOnce;
	});

	it('Should return null for the couchdb authentication scheme and default password type ', () => {
		props.userInfo.password_type = 'default';
		const component = mount(<UserInfo {...props} />);
		component.find('#user-profile-container').should.have.lengthOf(0);
		listUsersStub.should.have.been.calledOnce;
	});

	it('Should return null if userInfo is null', () => {
		props.userInfo = null;
		const component = mount(<UserInfo {...props} />);
		component.find('#user-profile-container').should.have.lengthOf(0);
		listUsersStub.should.have.been.calledOnce;
	});
});
