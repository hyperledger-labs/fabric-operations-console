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
import { mount } from 'enzyme';
import React from 'react';
import { Provider } from 'react-redux';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { AuthenticatedUsers, AuthenticationServices, DeleteButton, Members } from '../../../src/components/Members/Members';
import store from '../../../src/redux/Store';
chai.should();
chai.use(sinonChai);

const WrappedMembers = props => {
	return (
		<Provider store={store}>
			<Members {...props} />
		</Provider>
	);
};

const WrappedAuthenticationServices = props => {
	return (
		<Provider store={store}>
			<AuthenticationServices {...props} />
		</Provider>
	);
};

jest.mock('../../../src/components/AddUserModal/AddUserModal', () => {
	return {
		__esModule: true,
		default: () => {
			return <div id="AddUserModal"></div>;
		},
	};
});

jest.mock('../../../src/components/BlockchainTooltip/BlockchainTooltip', () => {
	return {
		__esModule: true,
		default: () => {
			return <></>;
		},
	};
});

jest.mock('../../../src/components/Breadcrumb/Breadcrumb', () => {
	return {
		__esModule: true,
		default: () => {
			return <></>;
		},
	};
});

jest.mock('../../../src/components/EditAuthSettingsModal/EditAuthSettingsModal', () => {
	return {
		__esModule: true,
		default: () => {
			return <div id="EditAuthSettingsModal"></div>;
		},
	};
});

jest.mock('../../../src/components/ItemContainer/ItemContainer', () => {
	return {
		__esModule: true,
		default: () => {
			return <div id="ItemContainer"></div>;
		},
	};
});

jest.mock('../../../src/components/ResetPasswordModal/ResetPasswordModal', () => {
	return {
		__esModule: true,
		default: () => {
			return <div id="ResetPasswordModal"></div>;
		},
	};
});

describe('Members component', () => {
	let mySandBox;
	let props;
	let translateStub;

	beforeEach(async() => {
		mySandBox = sinon.createSandbox();

		translateStub = mySandBox.stub().callsFake(inputString => {
			return inputString;
		});

		props = {
			loading: false,
			oauth_url: 'auth_url',
			secret: 'secret',
			tenant_id: 'tenant_id',
			client_id: 'client_id',
			adminContactEmail: 'adminContactEmail',
			admin_list: [],
			general_list: [],
			all_users: [],
			showEditSettingsModal: true,
			showAddUserModal: true,
			showResetPasswordModal: true,
			userInfo: {},
			isManager: true,
			auth_scheme: 'ibmid',
			user: {},
			editMode: true,
			history: { location: { pathname: 'path' }, listen: mySandBox.stub() },
			translate: translateStub,
			updateState: () => mySandBox.stub(),
			showError: () => mySandBox.stub(),
			showBreadcrumb: mySandBox.stub(),
		};
	});

	afterEach(async() => {
		mySandBox.restore();
	});

	it('Should return the members component for manager with everything enabled', () => {
		const component = mount(<WrappedMembers {...props} />);
		component.find('#ItemContainer').should.have.lengthOf(1);
		component.find('#EditAuthSettingsModal').should.have.lengthOf(1);
		component.find('#AddUserModal').should.have.lengthOf(1);
		component.find('#ResetPasswordModal').should.have.lengthOf(1);
	});

	it('Should return the members component for non manager without admin and general lists', () => {
		props.isManager = false;
		props.admin_list = null;
		props.general_list = null;
		const component = mount(<WrappedMembers {...props} />);
		component.find('#ItemContainer').should.have.lengthOf(1);
		component.find('#EditAuthSettingsModal').should.have.lengthOf(1);
		component.find('#AddUserModal').should.have.lengthOf(1);
		component.find('#ResetPasswordModal').should.have.lengthOf(1);
	});

	it('Should return the members component for manager with iam scheme and edit mode disabled', () => {
		props.auth_scheme = 'iam';
		props.editMode = false;
		const component = mount(<WrappedMembers {...props} />);
		component.find('#ItemContainer').should.have.lengthOf(0);
		component.find('#EditAuthSettingsModal').should.have.lengthOf(1);
		component.find('#AddUserModal').should.have.lengthOf(1);
		component.find('#ResetPasswordModal').should.have.lengthOf(1);
	});
});

describe('AuthenticationServices function', () => {
	let mySandBox;
	let props;

	beforeEach(async() => {
		mySandBox = sinon.createSandbox();
		props = {
			onConfigure: mySandBox.stub(),
			isManager: false,
			authScheme: 'ibmid',
			translate: mySandBox.stub().callsFake(text => {
				return text;
			}),
		};
	});

	afterEach(async() => {
		mySandBox.restore();
	});

	it('should return AuthenticationServices with ibmId for non manager', () => {
		const component = mount(<WrappedAuthenticationServices {...props} />);
		sinon.assert.callCount(props.translate, 5);
		component
			.find('.ibp-members-app-id-label')
			.text()
			.should.equal('ibm_id');
		component
			.find('.ibp-members-cloud-service-label')
			.text()
			.should.equal('ibm_cloud_service');
		component
			.find('Link .ibp-members-configure-label')
			.text()
			.should.equal('administrator_contact');
	});

	it('should return AuthenticationServices with iam for non manager', () => {
		props.authScheme = 'iam';
		const component = mount(<WrappedAuthenticationServices {...props} />);
		sinon.assert.callCount(props.translate, 5);
		component
			.find('.ibp-members-app-id-label')
			.text()
			.should.equal('identity_and_access_management');
		component
			.find('.ibp-members-cloud-service-label')
			.text()
			.should.equal('ibm_cloud_service');
		component
			.find('Link .ibp-members-configure-label')
			.text()
			.should.equal('administrator_contact');
	});

	it('should return AuthenticationServices with couchdb for non manager', () => {
		props.authScheme = 'couchdb';
		const component = mount(<WrappedAuthenticationServices {...props} />);
		sinon.assert.callCount(props.translate, 5);
		component
			.find('.ibp-members-app-id-label')
			.text()
			.should.equal('couchdb');
		component
			.find('.ibp-members-cloud-service-label')
			.text()
			.should.equal('local');
		component
			.find('Link .ibp-members-configure-label')
			.text()
			.should.equal('administrator_contact');
	});

	it('should return AuthenticationServices with an authentication scheme not from the list for non manager', () => {
		props.authScheme = 'something else';
		const component = mount(<WrappedAuthenticationServices {...props} />);
		sinon.assert.callCount(props.translate, 5);
		component.find('.ibp-members-app-id-label').should.have.lengthOf(1);
		component.find('SkeletonText .ibp-auth-skeleton-text').should.have.lengthOf(0);
		component
			.find('.ibp-members-cloud-service-label')
			.text()
			.should.equal('ibm_cloud_service');
		component
			.find('Link .ibp-members-configure-label')
			.text()
			.should.equal('administrator_contact');
	});

	it('should return AuthenticationServices with no authentication scheme for non manager', () => {
		props.authScheme = '';
		const component = mount(<WrappedAuthenticationServices {...props} />);
		sinon.assert.callCount(props.translate, 4);
		component.find('.ibp-members-app-id-label').should.have.lengthOf(0);
		component.find('SkeletonText .ibp-auth-skeleton-text').should.have.lengthOf(1);
		component
			.find('.ibp-members-cloud-service-label')
			.text()
			.should.equal('ibm_cloud_service');
		component
			.find('Link .ibp-members-configure-label')
			.text()
			.should.equal('administrator_contact');
	});

	it('should return AuthenticationServices with ibmd scheme for manager', () => {
		props.isManager = true;
		const component = mount(<WrappedAuthenticationServices {...props} />);
		sinon.assert.callCount(props.translate, 5);
		component
			.find('.ibp-members-app-id-label')
			.text()
			.should.equal('ibm_id');
		component
			.find('.ibp-members-cloud-service-label')
			.text()
			.should.equal('ibm_cloud_service');
		component
			.find('Link .ibp-members-configure-label')
			.text()
			.should.equal('update_configuration');
	});
});

describe('AuthenticatedUsers function', () => {
	let mySandBox;
	let props;

	beforeEach(async() => {
		mySandBox = sinon.createSandbox();
		props = {
			authScheme: 'couchdb',
		};
	});

	afterEach(async() => {
		mySandBox.restore();
	});

	it('should return AuthenticatedUsers with couchdb for non manager', () => {
		const component = mount(<AuthenticatedUsers {...props} />);
		component.find('#ItemContainer').should.have.lengthOf(1);
	});

	it('should return AuthenticatedUsers without couchdb for non manager', () => {
		props.authScheme = 'ibmid';
		const component = mount(<AuthenticatedUsers {...props} />);
		component.find('#ItemContainer').should.have.lengthOf(1);
	});
});

describe('AuthenticatedUsers function', () => {
	let mySandBox;

	beforeEach(async() => {
		mySandBox = sinon.createSandbox();
	});

	afterEach(async() => {
		mySandBox.restore();
	});

	it('should return AuthenticatedUsers with couchdb for non manager', () => {
		const component = mount(<DeleteButton />);
		component.find('SVGs').should.have.lengthOf(1);
	});
});
