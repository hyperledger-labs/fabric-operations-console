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
import { CertificateAuthorityRestApi } from '../../../src/rest/CertificateAuthorityRestApi';
import ComponentApi from '../../../src/rest/ComponentApi';
import { NodeRestApi } from '../../../src/rest/NodeRestApi';
// this is the component we're testing - import it wrapped in curly braces to get the version not connected to the redux store
import { CADetails } from '../../../src/components/CADetails/CADetails';

chai.should();
chai.use(sinonChai);
const should = chai.should();

jest.mock('../../../src/utils/actionsHelper', () => {
	return {
		canCreateComponent: () => true,
	};
});

jest.mock('../../../src/utils/status', () => {
	return {
		getStatus: (data, scope, attr, callback) => {
			data.status = 'running';
			if (callback) {
				callback();
			}
		},
	};
});

jest.mock('../../../src/components/Breadcrumb/Breadcrumb', () => () => <></>);

jest.mock('../../../src/components/CAAddUserModal/CAAddUserModal', () => () => <div className="stub-ca-add-user-modal" />);

jest.mock('../../../src/components/CAModal/CAModal', () => () => <div className="stub-ca-modal" />);

jest.mock('../../../src/components/CertificateList/CertificateList', () => () => <></>);

jest.mock('../../../src/components/DeleteCAUser/DeleteCAUserModal', () => () => <div className="stub-delete-ca-user-modal" />);

jest.mock('../../../src/components/GenerateCertificate/GenerateCertificateModal', () => () => <div className="stub-generate-certificate-modal" />);

jest.mock('../../../src/components/ItemContainer/ItemContainer', () => ({ id }) => <div id={id}
	className="stub-item-container"
/>);

jest.mock('../../../src/components/NodeDetails/NodeDetails', () => () => <></>);

jest.mock('../../../src/components/PageContainer/PageContainer', () => ({ children }) => <>{children}</>);

jest.mock('../../../src/components/PageHeader/PageHeader', () => () => <></>);

jest.mock('../../../src/components/ReallocateModal/ReallocateModal', () => () => <div className="stub-reallocate-modal" />);

jest.mock('../../../src/components/SidePanelWarning/SidePanelWarning', () => () => <></>);

jest.mock('../../../src/components/StickySection/StickySection', () => () => <></>);

jest.mock('../../../src/components/UserDetailsModal/UserDetailsModal', () => () => <div className="stub-user-details-modal" />);

describe('CADetails component', () => {
	const SCOPE = 'caDetails';
	let mySandBox;
	let props;
	let history = {
		location: {
			pathname: 'pathname',
		},
	};
	let match = {
		params: {
			caId: 'ca1',
		},
	};
	let ca = {
		id: 'ca1',
		display_name: 'ca 1',
		name: 'ca 1',
		location: 'ibm_saas',
		version: 'v1.0.0',
	};
	// Logger
	let logErrorStub;
	let logDebugStub;
	// CertificateAuthorityRestApi
	let getCADetailsStub;
	let getUsersStub;
	let getAffiliationsStub;
	// NodeRestApi
	let getCurrentConfigStub;
	// ComponentApi
	let getUsageInformationStub;
	// Translate
	let translateStub;
	// commonActions
	let updateStateStub;

	beforeEach(() => {
		mySandBox = sinon.createSandbox();
		logErrorStub = mySandBox.stub(Logger.prototype, 'error');
		logDebugStub = mySandBox.stub(Logger.prototype, 'debug');
		getCADetailsStub = mySandBox.stub(CertificateAuthorityRestApi, 'getCADetails').callsFake(() => {
			return Promise.resolve(ca);
		});
		getUsersStub = mySandBox.stub(CertificateAuthorityRestApi, 'getUsers').callsFake(() => {
			return Promise.resolve([]);
		});
		getAffiliationsStub = mySandBox.stub(CertificateAuthorityRestApi, 'getAffiliations').callsFake(() => {
			return Promise.resolve([]);
		});
		getCurrentConfigStub = mySandBox.stub(NodeRestApi, 'getCurrentNodeConfig').callsFake(() => {
			return Promise.resolve({});
		});
		getUsageInformationStub = mySandBox.stub(ComponentApi, 'getUsageInformation').callsFake(() => {
			return Promise.resolve({});
		});
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
			history,
			match,
			clearNotifications: mySandBox.stub(),
			showBreadcrumb: mySandBox.stub(),
			showError: mySandBox.stub(),
			showSuccess: mySandBox.stub(),
			updateBreadcrumb: mySandBox.stub(),
			updateState: updateStateStub,
			translate: translateStub,
		};
	});

	afterEach(() => {
		mySandBox.restore();
	});

	describe('CADetails - render', () => {
		it('should render', async() => {
			props.details = {
				...ca,
			};
			const component = mount(<CADetails {...props} />);
			component.find('.ibp-ca-no-identity').should.have.lengthOf(1);
			component.find('.stub-item-container#root-ca').should.have.lengthOf(0);
		});
	});

	describe('CADetails - render with associated identity', () => {
		it('should render', async() => {
			props.details = {
				...ca,
				associatedIdentity: 'identity',
			};
			const component = mount(<CADetails {...props} />);
			component.find('.ibp-ca-no-identity').should.have.lengthOf(0);
			component.find('.stub-item-container#root-ca').should.have.lengthOf(1);
			component.find('.version').should.have.lengthOf(0);
		});
	});

	describe('CADetails - add CA user modal', () => {
		it('should render', async() => {
			props.details = {
				...ca,
				associatedIdentity: 'identity',
			};
			props.showAddUser = true;
			const component = mount(<CADetails {...props} />);
			component.find('.stub-ca-add-user-modal').should.have.lengthOf(1);
		});
	});

	describe('CADetails - generate certificate modal', () => {
		it('should render', async() => {
			props.details = {
				...ca,
				associatedIdentity: 'identity',
			};
			props.showCertificate = true;
			const component = mount(<CADetails {...props} />);
			component.find('.stub-generate-certificate-modal').should.have.lengthOf(1);
		});
	});

	describe('CADetails - delete CA user modal', () => {
		it('should render', async() => {
			props.details = {
				...ca,
				associatedIdentity: 'identity',
			};
			props.showDeleteUser = true;
			const component = mount(<CADetails {...props} />);
			component.find('.stub-delete-ca-user-modal').should.have.lengthOf(1);
		});
	});

	describe('CADetails - ca mdoal', () => {
		it('should render', async() => {
			props.details = {
				...ca,
				associatedIdentity: 'identity',
			};
			props.showSettings = true;
			const component = mount(<CADetails {...props} />);
			component.find('.stub-ca-modal').should.have.lengthOf(1);
		});
	});

	describe('CADetails - reallocate mdoal', () => {
		it('should render', async() => {
			props.details = {
				...ca,
				associatedIdentity: 'identity',
			};
			props.usageModal = true;
			const component = mount(<CADetails {...props} />);
			component.find('.stub-reallocate-modal').should.have.lengthOf(1);
		});
	});

	describe('CADetails - render upgrade available', () => {
		it('should render', async() => {
			props.details = {
				...ca,
				isUpgradeAvailable: true,
				upgradable_versions: ['v2.0.0'],
			};
			const component = mount(<CADetails {...props} />);
			component.find('.ibp-new-version-actions').should.have.lengthOf(1);
		});
	});
});
