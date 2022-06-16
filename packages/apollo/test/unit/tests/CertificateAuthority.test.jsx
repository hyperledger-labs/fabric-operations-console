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
// this is the component we're testing - import it wrapped in curly braces to get the version not connected to the redux store
import { CertificateAuthority } from '../../../src/components/CertificateAuthority/CertificateAuthority';

chai.should();
chai.use(sinonChai);
const should = chai.should();

jest.mock('../../../src/utils/actionsHelper', () => {
	return {
		canCreateComponent: () => true,
		canImportComponent: () => true,
	};
});

jest.mock('../../../src/utils/status', () => {
	return {
		getStatus: (data, scope, attr, callback) => {
			let list = Array.isArray(data) ? data : [data];
			list.forEach(node => {
				node.status = 'running';
			});
			if (callback) {
				callback();
			}
		},
	};
});

jest.mock('../../../src/components/ItemContainer/ItemContainer', () => ({ id, items, tileMapping }) => {
	return (
		<div id={id}
			className="stub-item-container"
		>
			{items &&
				items.map(item => {
					return (
						<div key={item.id}
							className="stub-item-container-item"
						>
							{tileMapping && tileMapping.custom && tileMapping.custom(item)}
						</div>
					);
				})}
		</div>
	);
});

jest.mock('../../../src/components/ItemContainerTile/ItemTileLabels/ItemTileLabels', () => () => <></>);

jest.mock('../../../src/components/ImportCAModal/ImportCAModal', () => () => {
	return <div className="stub-import-ca-modal" />;
});

describe('CertificateAuthority component', () => {
	const SCOPE = 'cas';
	let mySandBox;
	let props;
	let history = {
		push: () => {},
		location: {
			pathname: 'pathname',
		},
	};
	let caList = [
		{
			id: 'ca1',
			display_name: 'ca 1',
			name: 'ca 1',
			location: 'ibm_saas',
			version: 'v1.0.0',
		},
		{
			id: 'ca2',
			display_name: 'ca 2',
			name: 'ca 2',
			location: 'ibm_saas',
			version: 'v1.0.0',
		},
	];
	// Logger
	let logErrorStub;
	// CertificateAuthorityRestApi
	let getCAsStub;
	// Translate
	let translateStub;
	// commonActions
	let updateStateStub;

	beforeEach(() => {
		mySandBox = sinon.createSandbox();
		logErrorStub = mySandBox.stub(Logger.prototype, 'error');
		getCAsStub = mySandBox.stub(CertificateAuthorityRestApi, 'getCAs').callsFake(() => {
			return Promise.resolve(caList);
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
			caList,
			history,
			clearNotifications: mySandBox.stub(),
			showInfo: mySandBox.stub(),
			showError: mySandBox.stub(),
			showSuccess: mySandBox.stub(),
			updateState: updateStateStub,
			translate: translateStub,
		};
	});

	afterEach(() => {
		mySandBox.restore();
	});

	describe('CADetails - render', () => {
		it('should render', async() => {
			const component = mount(<CertificateAuthority {...props} />);
			component.find('.stub-item-container#test__ca--add--tile').should.have.lengthOf(1);
			component.find('.stub-item-container-item').should.have.lengthOf(2);
			component.find('.stub-import-ca-modal').should.have.lengthOf(0);
		});
	});

	describe('CADetails - render import', () => {
		it('should render', async() => {
			props.showImportCA = true;
			const component = mount(<CertificateAuthority {...props} />);
			component.find('.stub-import-ca-modal').should.have.lengthOf(1);
		});
	});
});
