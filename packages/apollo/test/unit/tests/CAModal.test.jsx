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
import IdentityApi from '../../../src/rest/IdentityApi';
// this is the component we're testing - import it wrapped in curly braces to get the version not connected to the redux store
import { CAModal } from '../../../src/components/CAModal/CAModal';

chai.should();
chai.use(sinonChai);
const should = chai.should();

jest.mock('../../../src/utils/actionsHelper', () => {
	return {
		canCreateComponent: () => true,
	};
});

jest.mock('../../../src/components/BlockchainTooltip/BlockchainTooltip', () => () => <></>);

jest.mock('../../../src/components/ConfigOverride/ConfigOverride', () => () => <></>);

jest.mock('../../../src/components/Form/Form', () => ({ id, fields }) => (
	<>
		{fields.map(field => (
			<div key={field.name}
				id={id + '-' + field.name}
			/>
		))}
	</>
));

jest.mock('../../../src/components/HSMConfig/HSMConfig', () => () => <></>);

jest.mock('../../../src/components/TranslateLink/TranslateLink', () => () => <></>);

jest.mock('../../../src/components/Wizard/Wizard', () => ({ children }) => <>{children}</>);

describe('CAModal component', () => {
	const SCOPE = 'caModal';
	let mySandBox;
	let props;
	let ca = {
		id: 'ca1',
		display_name: 'ca 1',
		name: 'ca 1',
		location: 'ibm_saas',
		version: 'v1.0.0',
		tls_cert: 'pem',
	};
	// callbacks
	let onCloseStub;
	let onCompleteStub;
	// Translate
	let translateStub;
	// commonActions
	let updateStateStub;
	// IdentityApi
	let getIdentitiesStub;

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
		getIdentitiesStub = mySandBox.stub(IdentityApi, 'getIdentities').callsFake(() => {
			return Promise.resolve([
				{
					name: 'identity',
					cert: 'cert',
					private_key: 'private_key',
				},
			]);
		});
		// initial props
		props = {
			ca: {
				...ca,
			},
			onClose: onCloseStub,
			onComplete: onCompleteStub,
			updateState: updateStateStub,
			translate: translateStub,
		};
	});

	afterEach(() => {
		mySandBox.restore();
	});

	describe('CAAddUserModal - render details', () => {
		it('should render', async() => {
			const component = mount(<CAModal {...props} />);
			component.find('.ibp-wizard-step').should.have.lengthOf(1);
			component.find('#' + SCOPE + '-display_name').should.have.lengthOf(1);
			component.find('#' + SCOPE + '-tls_cert').should.have.lengthOf(1);
			component.find('#' + SCOPE + '-replica_set_cnt').should.have.lengthOf(0);
			component.find('#edit_config_override').should.have.lengthOf(1);
			component.find('#renew_tls_cert').should.have.lengthOf(1);
			component.find('#restart').should.have.lengthOf(1);
		});
	});

	describe('CAAddUserModal - render details with postgres db', () => {
		it('should render', async() => {
			props.ca_database = 'postgres';
			props.replica_set_cnt = 3;
			const component = mount(<CAModal {...props} />);
			component.find('#' + SCOPE + '-replica_set_cnt').should.have.lengthOf(1);
		});
	});

	describe('CAAddUserModal - render imported details', () => {
		it('should render', async() => {
			props.ca.location = 'ibm_cloud';
			const component = mount(<CAModal {...props} />);
			component.find('#edit_config_override').should.have.lengthOf(0);
			component.find('#renew_tls_cert').should.have.lengthOf(0);
			component.find('#restart').should.have.lengthOf(0);
		});
	});

	describe('CAAddUserModal - render details with free cluster', () => {
		it('should render', async() => {
			props.clusterType = 'free';
			const component = mount(<CAModal {...props} />);
			component.find('#edit_config_override').should.have.lengthOf(0);
		});
	});

	describe('CAAddUserModal - render delete', () => {
		it('should render', async() => {
			props.caModalType = 'delete';
			const component = mount(<CAModal {...props} />);
			component.find('.ibp-wizard-step').should.have.lengthOf(1);
			component.find('#' + SCOPE + '-remove').should.have.lengthOf(1);
		});
	});

	describe('CAAddUserModal - render upgrade', () => {
		it('should render', async() => {
			props.caModalType = 'upgrade';
			const component = mount(<CAModal {...props} />);
			component.find('.ibp-wizard-step').should.have.lengthOf(2);
			component.find('#' + SCOPE + '-new-version-new_version').should.have.lengthOf(1);
			component.find('#' + SCOPE + '-remove-confirm_upgrade_node_name').should.have.lengthOf(1);
		});
	});

	describe('CAAddUserModal - render associate new identity', () => {
		it('should render', async() => {
			props.caModalType = 'associate';
			props.identityType = 'none';
			const component = mount(<CAModal {...props} />);
			component.find('.ibp-wizard-step').should.have.lengthOf(1);
			component.find('#' + SCOPE + '-identity-enroll_id').should.have.lengthOf(1);
			component.find('#' + SCOPE + '-identity-enroll_secret').should.have.lengthOf(1);
			component.find('#' + SCOPE + '-identity-enroll_identity_name').should.have.lengthOf(1);
		});
	});

	describe('CAAddUserModal - render associate existing identity', () => {
		it('should render', async() => {
			props.caModalType = 'associate';
			props.identityType = 'existing';
			const component = mount(<CAModal {...props} />);
			component.find('.ibp-wizard-step').should.have.lengthOf(1);
			component.find('#' + SCOPE + '-associate').should.have.lengthOf(1);
		});
	});

	describe('CAAddUserModal - render config override', () => {
		it('should render', async() => {
			props.caModalType = 'config_override';
			const component = mount(<CAModal {...props} />);
			component.find('.ibp-wizard-step').should.have.lengthOf(1);
			component.find('#config_override-current_config_json').should.have.lengthOf(1);
		});
	});

	describe('CAAddUserModal - render renew tls certificate', () => {
		it('should render', async() => {
			props.caModalType = 'renew_tls_cert';
			const component = mount(<CAModal {...props} />);
			component.find('.ibp-wizard-step').should.have.lengthOf(1);
			component.find('.ibp-renew-tls-desc').should.have.lengthOf(1);
		});
	});

	describe('CAAddUserModal - render update tls certificate', () => {
		it('should render', async() => {
			props.caModalType = 'update_tls_cert';
			const component = mount(<CAModal {...props} />);
			component.find('.ibp-wizard-step').should.have.lengthOf(1);
			component.find('.ibp-update-tls-desc').should.have.lengthOf(1);
		});
	});

	describe('CAAddUserModal - render restart', () => {
		it('should render', async() => {
			props.caModalType = 'restart';
			const component = mount(<CAModal {...props} />);
			component.find('.ibp-wizard-step').should.have.lengthOf(1);
			component.find('.ibp-restart-ca-desc').should.have.lengthOf(1);
		});
	});
});
