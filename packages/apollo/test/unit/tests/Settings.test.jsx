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
import { Settings } from '../../../src/components/Settings/Settings';
import store from '../../../src/redux/Store';
chai.should();
chai.use(sinonChai);

const WrappedSettings = props => {
	return (
		<Provider store={store}>
			<Settings {...props} />
		</Provider>
	);
};

jest.mock('../../../src/components/Breadcrumb/Breadcrumb', () => {
	return {
		__esModule: true,
		default: () => {
			return <></>;
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

jest.mock('../../../src/components/ExportModal/ExportModal', () => {
	return {
		__esModule: true,
		default: () => {
			return <div id="ExportModal"></div>;
		},
	};
});

jest.mock('../../../src/components/Form/Form', () => {
	return {
		__esModule: true,
		default: () => {
			return <></>;
		},
	};
});

jest.mock('../../../src/components/ImportModal/ImportModal', () => {
	return {
		__esModule: true,
		default: () => {
			return <div id="ImportModal"></div>;
		},
	};
});

jest.mock('../../../src/utils/actionsHelper', () => {
	return {
		canImportComponent: userInfo => !!(userInfo && userInfo.canImportComponent),
		canManageComponent: () => true,
	};
});

describe('Settings component', () => {
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
			isAdmin: true,
			userInfo: { canImportComponent: true },
			history: { location: { pathname: 'path' }, listen: mySandBox.stub() },
			t: translateStub,
			showExportModal: false,
			showImportModal: false,
			updateState: () => mySandBox.stub(),
			showError: () => mySandBox.stub(),
			showBreadcrumb: mySandBox.stub(),
			clearNotifications: mySandBox.stub(),
			showSuccess: mySandBox.stub(),
		};
	});

	afterEach(async() => {
		mySandBox.restore();
	});

	it('Should return the settings component for admin', () => {
		const component = mount(<WrappedSettings {...props} />);
		component.find('#ExportModal').should.have.lengthOf(0);
		component.find('#ImportModal').should.have.lengthOf(0);
		component.find('input#toggle-client-logging').should.have.lengthOf(1);
		component.find('input#toggle-server-logging').should.have.lengthOf(1);
		component.find('input#toggle-inactivity-timeouts').should.have.lengthOf(1);
		component.find('button#data_export_button').should.have.lengthOf(1);
		component.find('button#data_import_button').should.have.lengthOf(1);
		component
			.find('input#toggle-client-logging')
			.at(0)
			.props()
			['disabled'].should.deep.equal(false);
		component
			.find('input#toggle-server-logging')
			.at(0)
			.props()
			['disabled'].should.deep.equal(false);
	});

	it('Should return the settings component for admin with export modal showing', () => {
		props.showExportModal = true;
		const component = mount(<WrappedSettings {...props} />);
		component.find('#ExportModal').should.have.lengthOf(1);
		component.find('#ImportModal').should.have.lengthOf(0);
	});

	it('Should return the settings component for admin with import modal showing', () => {
		props.showImportModal = true;
		const component = mount(<WrappedSettings {...props} />);
		component.find('#ExportModal').should.have.lengthOf(0);
		component.find('#ImportModal').should.have.lengthOf(1);
	});

	it('Should return the settings component for non admin', () => {
		props.isAdmin = false;
		const component = mount(<WrappedSettings {...props} />);
		component.find('#ExportModal').should.have.lengthOf(0);
		component.find('#ImportModal').should.have.lengthOf(0);
		component.find('input#toggle-client-logging').should.have.lengthOf(1);
		component.find('input#toggle-server-logging').should.have.lengthOf(1);
		component
			.find('input#toggle-client-logging')
			.at(0)
			.props()
			['disabled'].should.deep.equal(true);
		component
			.find('input#toggle-server-logging')
			.at(0)
			.props()
			['disabled'].should.deep.equal(true);
		component.find('button#data_export_button').should.have.lengthOf(1);
		component.find('button#data_import_button').should.have.lengthOf(1);
	});

	it('Should return the settings component for non admin that cannot import', () => {
		props.isAdmin = false;
		props.userInfo = { canImportComponent: false };
		const component = mount(<WrappedSettings {...props} />);
		component.find('button#data_export_button').should.have.lengthOf(1);
		component.find('button#data_import_button').should.have.lengthOf(0);
	});
});
