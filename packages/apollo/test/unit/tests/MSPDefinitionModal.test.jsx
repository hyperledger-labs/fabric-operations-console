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
import { mount, shallow } from 'enzyme';
import _ from 'lodash';
import React from 'react';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Logger from '../../../src/components/Log/Logger';
// this is the component we're testing - import it wrapped in curly braces to get the version not connected to the redux store
import { MSPDefinitionModal } from '../../../src/components/MSPDefinitionModal/MSPDefinitionModal';
import { MspRestApi } from '../../../src/rest/MspRestApi';
import { NodeRestApi } from '../../../src/rest/NodeRestApi';
chai.should();
chai.use(sinonChai);

/**
 * these mocks are for the child components this component renders that also use redux
 * most of these mocks are done inline and return an empty fragment, as we shouldn't care about what the child components are rendering in this tes
 * the SidePanel mock is different, and is mocked using 'SidePanel/__mocks__/SidePanel.js
 */
jest.mock('../../../src/components/SidePanel/SidePanel');

jest.mock('../../../src/components/JsonInput/JsonInput', () => {
	return {
		__esModule: true,
		default: () => {
			return <></>;
		},
	};
});

jest.mock('../../../src/components/ImportantBox/ImportantBox', () => {
	return {
		__esModule: true,
		default: () => {
			return <></>;
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

describe('MSPDefinitionModal component', () => {
	const SCOPE = 'MSPDefinitionModal';
	let mySandBox;
	let onCloseStub;
	let onCompleteStub;
	let translateStub;
	let updateStateStub;
	let settingsModalProps;
	let deleteModalProps;
	let upgradeModalProps;
	let logDebugStub;
	let logInfoStub;
	let logWarnStub;
	let logErrorStub;
	let lodashGetStub;
	let getAllMsps;

	beforeEach(() => {
		mySandBox = sinon.createSandbox();

		lodashGetStub = mySandBox.stub(_, 'get').returns(true);
		onCloseStub = mySandBox.stub();
		onCompleteStub = mySandBox.stub();
		// this is to replace the translate function that gets passed to the component when it's connected to the redux store - it just returns whatever string that it's passed
		translateStub = mySandBox.stub().callsFake(inputString => {
			return inputString;
		});
		// this is the stub that will be called whenever this.props.updateState is called in the component code
		updateStateStub = mySandBox.stub();
		getAllMsps = mySandBox.stub(MspRestApi, 'getAllMsps');

		// declaring some initial props to pass to the component
		// these are based on the props passed to this component in Msps.js
		settingsModalProps = {
			mspModalType: 'settings',
			disableSubmit: true,
			disableRemove: true,

			onClose: onCloseStub,
			onComplete: onCompleteStub,
			translate: translateStub,
			updateState: updateStateStub,
		};

		// props for delete modal based on OrganizationDetails.js
		deleteModalProps = {
			mspModalType: 'delete',
			msp: {},
			associatedPeers: [],
			associatedOrderers: [],
			mspAdminCerts: {},
			selectedMsp: {},
			disableSubmit: true,
			disableRemove: true,

			onClose: onCloseStub,
			onComplete: onCompleteStub,
			translate: translateStub,
			updateState: updateStateStub,
		};

		// the upgrade modal doesn't seem to be used in the code but I've included some mock props for testing
		upgradeModalProps = {
			mspModalType: 'upgrade',
			disableSubmit: true,
			disableRemove: true,

			onClose: onCloseStub,
			onComplete: onCompleteStub,
			translate: translateStub,
			updateState: updateStateStub,
		};

		window.stitch = {
			parseCertificate: cert => {
				return {
					not_after_ts: new Date().getTime() + 10000,
					serial_number_hex: '0123456789',
				};
			},
		};

		logDebugStub = mySandBox.stub(Logger.prototype, 'debug');
		logInfoStub = mySandBox.stub(Logger.prototype, 'info');
		logWarnStub = mySandBox.stub(Logger.prototype, 'warn');
		logErrorStub = mySandBox.stub(Logger.prototype, 'error');
	});

	afterEach(() => {
		mySandBox.restore();
	});

	describe('MSPDefinitionModal - render()', () => {
		// this test isn't great - we're just trying to check that the modal shows up as expected by checking it has the strings we would expect
		it('should render settings modal', async() => {
			const component = mount(<MSPDefinitionModal {...settingsModalProps} />);
			updateStateStub.should.have.been.calledOnceWithExactly(SCOPE, {
				data: [],
				disableSubmit: undefined,
				duplicateMspError: false,
				disableRemove: true,
				enableOU: !lodashGetStub(),
				loading: false,
				submitting: false,
				error: null,
				isUpdate: false,
				remove: false,
				upgrade: false,
			});
			component
				.find('h1')
				.at(0)
				.text()
				.should.deep.equal('import_msp_definition');
			component
				.find('.ibp-modal-desc')
				.at(0)
				.text()
				.includes('import_msp_definition_desc')
				.should.deep.equal(true);
			component
				.find('.ibp-modal-desc > a')
				.at(0)
				.text()
				.should.deep.equal('find_more_here');
		});

		it('should render delete modal', async() => {
			const component = mount(<MSPDefinitionModal {...deleteModalProps} />);
			updateStateStub.should.have.been.calledOnceWithExactly(SCOPE, {
				data: [],
				disableSubmit: undefined,
				duplicateMspError: false,
				disableRemove: true,
				enableOU: !lodashGetStub(),
				loading: false,
				submitting: false,
				error: null,
				isUpdate: true,
				remove: true,
				upgrade: false,
			});
			component
				.find('h1')
				.at(0)
				.text()
				.should.deep.equal('remove_org');
			component
				.find('.ibp-remove-msp-desc')
				.at(0)
				.text()
				.should.deep.equal('remove_msp_desc');
			component
				.find('.ibp-remove-msp-confirm')
				.at(0)
				.text()
				.should.deep.equal('remove_msp_confirm');
		});

		// if type === upgrade nothing is rendered, so all we can test is that updateState was called correctly
		it('should render upgrade modal', async() => {
			mount(<MSPDefinitionModal {...upgradeModalProps} />);
			updateStateStub.should.have.been.calledOnceWithExactly(SCOPE, {
				data: [],
				disableSubmit: undefined,
				duplicateMspError: false,
				disableRemove: true,
				enableOU: !lodashGetStub(),
				loading: false,
				submitting: false,
				error: null,
				isUpdate: false,
				remove: false,
				upgrade: true,
			});
		});
	});

	describe('MSPDefinitionModal - validateMspid()', () => {
		it('should return true if provided mspid is valid', async() => {
			const mspid = 'mspid';
			const component = shallow(<MSPDefinitionModal {...settingsModalProps} />);
			const instance = component.instance();
			instance.validateMspid(mspid).should.deep.equal(true);
			logDebugStub.should.have.been.calledTwice;
			logDebugStub.getCall(0).should.have.been.calledWith('Validating mspid: ', mspid);
			logDebugStub.getCall(1).should.have.been.calledWith('Mspid has invalid characters: ', false);
		});

		it('should return true if no mspid is provided', async() => {
			const mspid = '';
			const component = shallow(<MSPDefinitionModal {...settingsModalProps} />);
			const instance = component.instance();
			instance.validateMspid(mspid).should.deep.equal(true);
			logDebugStub.should.not.have.been.called;
		});

		it('should return false if mspid contains invalid characters', async() => {
			const mspid = '~mspid~';
			const component = shallow(<MSPDefinitionModal {...settingsModalProps} />);
			const instance = component.instance();
			instance.validateMspid(mspid).should.deep.equal(false);
			logDebugStub.should.have.been.calledTwice;
			logDebugStub.getCall(0).should.have.been.calledWith('Validating mspid: ', mspid);
			logDebugStub.getCall(1).should.have.been.calledWith('Mspid has invalid characters: ', true);
		});

		it('should return false if mspid is longer than 250 characters', async() => {
			const mspid =
				'loremipsumdolorsitametconsecteturadipiscingelitseddoeiusmodtemporincididuntutlaboreetdoloremagnaaliquautenimadminimveniamquisnostrudexercitationullamcolaborisnisiutaliquipexeacommodoconsequatduisauteiruredolorinreprehenderitinvoluptatevelitessecillumdoloreeufugiatnullapariatur';
			const component = shallow(<MSPDefinitionModal {...settingsModalProps} />);
			const instance = component.instance();
			instance.validateMspid(mspid).should.deep.equal(false);
			logDebugStub.should.have.been.calledTwice;
			logDebugStub.getCall(0).should.have.been.calledWith('Validating mspid: ', mspid);
			logDebugStub.getCall(1).should.have.been.calledWith('Mspid has invalid characters: ', true);
		});

		it('should return false if mspid is the string \'.\'', async() => {
			const mspid = '.';
			const component = shallow(<MSPDefinitionModal {...settingsModalProps} />);
			const instance = component.instance();
			instance.validateMspid(mspid).should.deep.equal(false);
			logDebugStub.should.have.been.calledTwice;
			logDebugStub.getCall(0).should.have.been.calledWith('Validating mspid: ', mspid);
			logDebugStub.getCall(1).should.have.been.calledWith('Mspid has invalid characters: ', true);
		});

		it('should return false if mspid is the string \'..\'', async() => {
			const mspid = '..';
			const component = shallow(<MSPDefinitionModal {...settingsModalProps} />);
			const instance = component.instance();
			instance.validateMspid(mspid).should.deep.equal(false);
			logDebugStub.should.have.been.calledTwice;
			logDebugStub.getCall(0).should.have.been.calledWith('Validating mspid: ', mspid);
			logDebugStub.getCall(1).should.have.been.calledWith('Mspid has invalid characters: ', true);
		});

		it('should return false if mspid is only whitespace', async() => {
			const mspid = '       ';
			const component = shallow(<MSPDefinitionModal {...settingsModalProps} />);
			const instance = component.instance();
			instance.validateMspid(mspid).should.deep.equal(false);
			logDebugStub.should.have.been.calledTwice;
			logDebugStub.getCall(0).should.have.been.calledWith('Validating mspid: ', mspid);
			logDebugStub.getCall(1).should.have.been.calledWith('Mspid is empty');
		});
	});

	describe('MSPDefinitionModal - onUpload()', () => {
		it('should correctly update state when a basic msp definition is uploaded', async() => {
			const json = [
				{
					msp_id: 'mspid',
					name: 'my msp definition',
				},
			];

			const component = shallow(<MSPDefinitionModal {...settingsModalProps} />);
			const instance = component.instance();
			await instance.onUpload(json, true);

			updateStateStub.should.have.been.calledWith(SCOPE, {
				msp_id: json[0].msp_id,
				msp_name: json[0].name,
				rootCerts: [],
				intermediate_certs: undefined,
				admins: [],
				tls_root_certs: undefined,
				tls_intermediate_certs: undefined,
				revocation_list: undefined,
				organizational_unit_identifiers: undefined,
				fabric_node_ous: undefined,
				host_url: undefined,
				duplicateMspError: false,
				disableSubmit: false,
			});

			logDebugStub.should.have.been.calledWith('Uploaded json: ', json, true);
			logDebugStub.should.have.been.calledWith('Validating mspid: ', json[0].msp_id);
		});

		it('should correctly update state when the msp definition has a display name', async() => {
			const json = [
				{
					msp_id: 'mspid',
					display_name: 'my msp definition',
				},
			];

			const component = shallow(<MSPDefinitionModal {...settingsModalProps} />);
			const instance = component.instance();
			await instance.onUpload(json, true);

			updateStateStub.should.have.been.calledWith(SCOPE, {
				msp_id: json[0].msp_id,
				msp_name: json[0].display_name,
				rootCerts: [],
				intermediate_certs: undefined,
				admins: [],
				tls_root_certs: undefined,
				tls_intermediate_certs: undefined,
				revocation_list: undefined,
				organizational_unit_identifiers: undefined,
				fabric_node_ous: undefined,
				host_url: undefined,
				duplicateMspError: false,
				disableSubmit: false,
			});

			logDebugStub.should.have.been.calledWith('Uploaded json: ', json, true);
			logDebugStub.should.have.been.calledWith('Validating mspid: ', json[0].msp_id);
		});

		it('should have duplicateMspError true if there is a duplicate msp with with same root cert', async() => {
			const json = [
				{
					msp_id: 'mspid',
					display_name: 'my msp definition1',
					root_certs: ['some root cert1'],
				},
			];
			getAllMsps.resolves([
				{
					msp_id: 'mspid',
					display_name: 'my msp definition2',
					root_certs: ['some root cert1'],
				},
			]);
			const component = shallow(<MSPDefinitionModal {...settingsModalProps} />);
			const instance = component.instance();
			await instance.onUpload(json, true);

			updateStateStub.should.have.been.calledWith(SCOPE, {
				msp_id: json[0].msp_id,
				msp_name: json[0].display_name,
				rootCerts: [{ cert: 'some root cert1' }],
				intermediate_certs: undefined,
				admins: [],
				tls_root_certs: undefined,
				tls_intermediate_certs: undefined,
				revocation_list: undefined,
				organizational_unit_identifiers: undefined,
				fabric_node_ous: undefined,
				host_url: undefined,
				duplicateMspError: true,
				disableSubmit: false,
			});
		});

		it('should correctly update state when the msp definition contains root certs', async() => {
			const json = [
				{
					msp_id: 'mspid',
					name: 'my msp definition',
					root_certs: ['some root cert'],
				},
			];

			const component = shallow(<MSPDefinitionModal {...settingsModalProps} />);
			const instance = component.instance();
			await instance.onUpload(json, true);

			updateStateStub.should.have.been.calledWith(SCOPE, {
				msp_id: json[0].msp_id,
				msp_name: json[0].name,
				rootCerts: [{ cert: 'some root cert' }],
				intermediate_certs: undefined,
				admins: [],
				tls_root_certs: undefined,
				tls_intermediate_certs: undefined,
				revocation_list: undefined,
				organizational_unit_identifiers: undefined,
				fabric_node_ous: undefined,
				host_url: undefined,
				duplicateMspError: false,
				disableSubmit: false,
			});

			logDebugStub.should.have.been.calledWith('Uploaded json: ', json, true);
			logDebugStub.should.have.been.calledWith('Validating mspid: ', json[0].msp_id);
		});

		xit('should correctly update state when the msp definition contains admins', async() => {
			const json = [
				{
					msp_id: 'mspid',
					name: 'my msp definition',
					admins: ['some admin'],
				},
			];

			const component = shallow(<MSPDefinitionModal {...settingsModalProps} />);
			const instance = component.instance();
			await instance.onUpload(json, true);

			updateStateStub.should.have.been.calledWith(SCOPE, {
				msp_id: json[0].msp_id,
				msp_name: json[0].name,
				rootCerts: [],
				intermediate_certs: undefined,
				admins: [{ cert: 'some admin' }],
				tls_root_certs: undefined,
				tls_intermediate_certs: undefined,
				revocation_list: undefined,
				organizational_unit_identifiers: undefined,
				fabric_node_ous: undefined,
				host_url: undefined,
				duplicateMspError: false,
				disableSubmit: false,
			});

			logDebugStub.should.have.been.calledWith('Uploaded json: ', json, true);
			logDebugStub.should.have.been.calledWith('Validating mspid: ', json[0].msp_id);
		});

		it('should do nothing if data provided to onUpload is empty', async() => {
			const json = undefined;

			const component = shallow(<MSPDefinitionModal {...settingsModalProps} />);
			updateStateStub.resetHistory();
			const instance = component.instance();
			await instance.onUpload(json, true);

			updateStateStub.should.not.have.been.called;
			logDebugStub.should.have.been.calledWith('Uploaded json: ', json, true);
		});

		it('should correctly update state when an msp definition is uploaded and isUpdate is true', async() => {
			const json = [
				{
					msp_id: 'mspid',
					name: 'my msp definition',
				},
			];

			settingsModalProps.isUpdate = true;
			settingsModalProps.msp = {
				msp_id: json[0].msp_id,
			};

			const component = shallow(<MSPDefinitionModal {...settingsModalProps} />);
			updateStateStub.resetHistory();
			const instance = component.instance();
			await instance.onUpload(json, true);

			updateStateStub.should.have.been.calledTwice;
			updateStateStub.getCall(0).should.have.been.calledWith(SCOPE, { error: null });
			updateStateStub.getCall(1).should.have.been.calledWith(SCOPE, {
				msp_id: json[0].msp_id,
				msp_name: json[0].name,
				rootCerts: [],
				intermediate_certs: undefined,
				admins: [],
				tls_root_certs: undefined,
				tls_intermediate_certs: undefined,
				revocation_list: undefined,
				organizational_unit_identifiers: undefined,
				fabric_node_ous: undefined,
				host_url: undefined,
				duplicateMspError: false,
				disableSubmit: false,
			});

			logDebugStub.should.have.been.calledWith('Uploaded json: ', json, true);
		});

		it('should error if uploaded msp is not valid', async() => {
			const json = [
				{
					msp_id: '..',
					name: 'my msp definition',
				},
			];

			const component = shallow(<MSPDefinitionModal {...settingsModalProps} />);
			updateStateStub.resetHistory();
			const instance = component.instance();
			await instance.onUpload(json, true);

			updateStateStub.should.have.been.calledTwice;
			updateStateStub.getCall(0).should.have.been.calledWith(SCOPE, { error: { title: 'validation_mspid_invalid' } });
			updateStateStub.getCall(1).should.have.been.calledWith(SCOPE, {
				msp_id: json[0].msp_id,
				msp_name: json[0].name,
				rootCerts: [],
				intermediate_certs: undefined,
				admins: [],
				tls_root_certs: undefined,
				tls_intermediate_certs: undefined,
				revocation_list: undefined,
				organizational_unit_identifiers: undefined,
				fabric_node_ous: undefined,
				host_url: undefined,
				duplicateMspError: false,
				disableSubmit: true,
			});

			logDebugStub.should.have.been.calledWith('Uploaded json: ', json, true);
			logDebugStub.should.have.been.calledWith('Validating mspid: ', json[0].msp_id);
		});

		it('should error if uploaded msp is not the same as the msp in props', async() => {
			const json = [
				{
					msp_id: 'mspid',
					name: 'my msp definition',
				},
			];

			settingsModalProps.isUpdate = true;
			settingsModalProps.msp = {
				msp_id: 'some_id',
			};

			const component = shallow(<MSPDefinitionModal {...settingsModalProps} />);
			updateStateStub.resetHistory();
			const instance = component.instance();
			await instance.onUpload(json, true);

			updateStateStub.should.have.been.calledTwice;
			updateStateStub.getCall(0).should.have.been.calledWith(SCOPE, { error: { title: 'edit_msp_mspid_error' } });
			updateStateStub.getCall(1).should.have.been.calledWith(SCOPE, {
				msp_id: json[0].msp_id,
				msp_name: json[0].name,
				rootCerts: [],
				intermediate_certs: undefined,
				admins: [],
				tls_root_certs: undefined,
				tls_intermediate_certs: undefined,
				revocation_list: undefined,
				organizational_unit_identifiers: undefined,
				fabric_node_ous: undefined,
				host_url: undefined,
				duplicateMspError: false,
				disableSubmit: true,
			});

			logDebugStub.should.have.been.calledWith('Uploaded json: ', json, true);
		});
	});

	describe('MSPDefinitionModal - onSubmit()', () => {
		it('should successfully import msp on submit', async() => {
			const importMspResponse = { id: 'some_id' };
			const importMSPStub = mySandBox.stub(MspRestApi, 'importMSP').resolves(importMspResponse);
			const closeSidePanelStub = mySandBox.stub();

			const component = shallow(<MSPDefinitionModal {...settingsModalProps} />);

			// I'm having to manually set props here as this would have been done by the updateState function if the component was connected to a redux store for real
			// they're not very accurate to what would actually be passed but it's enough to get the code down the correct path
			component.setProps({
				msp_id: 'mspid',
				msp_name: 'my msp definition',
				rootCerts: ['some', 'root', 'certs'],
				admins: ['i', 'am', 'an', 'admin'],
				disableSubmit: false,
			});
			updateStateStub.resetHistory();

			// this line is needed to mock the ref to the SidePanel that is created when it's rendered
			// otherwise the code will error when it tries to call sidePanel.closeSidePanel
			component.instance().sidePanel = { closeSidePanel: closeSidePanelStub };
			await component.instance().onSubmit();

			updateStateStub.getCall(0).should.have.been.calledWith(SCOPE, {
				submitting: true,
				disableSubmit: true,
				error: null,
			});
			importMSPStub.should.have.been.calledOnce;
			closeSidePanelStub.should.have.been.calledOnce;
			onCompleteStub.should.have.been.calledOnce;
			logInfoStub.should.have.been.calledWith('Import msp response: ', importMspResponse);
			logErrorStub.should.not.have.been.called;
		});

		it('should error on submit if there are no root certs', async() => {
			const component = shallow(<MSPDefinitionModal {...settingsModalProps} />);
			component.setProps({
				msp_id: 'mspid',
				msp_name: 'my msp definition',
				rootCerts: [],
				disableSubmit: false,
			});

			updateStateStub.resetHistory();
			const instance = component.instance();
			await instance.onSubmit();

			updateStateStub.should.have.been.calledTwice;
			updateStateStub.getCall(0).should.have.been.calledWith(SCOPE, {
				submitting: true,
				disableSubmit: true,
				error: null,
			});
			updateStateStub.getCall(1).should.have.been.calledWith(SCOPE, {
				error: {
					title: 'error_required_fields',
				},
				submitting: false,
			});
		});

		it('should error on submit if there are no admins', async() => {
			const component = shallow(<MSPDefinitionModal {...settingsModalProps} />);
			component.setProps({
				msp_id: 'mspid',
				msp_name: 'my msp definition',
				rootCerts: ['some', 'root', 'certs'],
				admins: [],
				disableSubmit: false,
			});

			updateStateStub.resetHistory();
			const instance = component.instance();
			await instance.onSubmit();

			updateStateStub.getCall(0).should.have.been.calledWith(SCOPE, {
				submitting: true,
				disableSubmit: true,
				error: null,
			});
			updateStateStub.getCall(1).should.have.been.calledWith(SCOPE, {
				error: {
					title: 'error_required_fields',
				},
				submitting: false,
			});
		});

		it('should handle error from importMsp on submit', async() => {
			const importMspError = new Error('code go boom');
			const importMSPStub = mySandBox.stub(MspRestApi, 'importMSP').rejects(importMspError);
			const closeSidePanelStub = mySandBox.stub();

			const component = shallow(<MSPDefinitionModal {...settingsModalProps} />);

			// manually setting props
			component.setProps({
				msp_id: 'mspid',
				msp_name: 'my msp definition',
				rootCerts: ['some', 'root', 'certs'],
				admins: ['i', 'am', 'an', 'admin'],
				disableSubmit: false,
			});
			updateStateStub.resetHistory();

			// mocking ref to SidePanel close function
			component.instance().sidePanel = { closeSidePanel: closeSidePanelStub };
			await component.instance().onSubmit();

			updateStateStub.getCall(0).should.have.been.calledWith(SCOPE, {
				submitting: true,
				disableSubmit: true,
				error: null,
			});
			updateStateStub.getCall(1).should.have.been.calledWith(SCOPE, {
				submitting: false,
				error: importMspError,
			});

			importMSPStub.should.have.been.calledOnce;
			closeSidePanelStub.should.not.have.been.called;
			onCompleteStub.should.not.have.been.called;
			logErrorStub.should.have.been.calledOnceWithExactly(`Error occurred while importing msp ${importMspError}`);
		});

		it('should handle bad response from importMsp on submit', async() => {
			const importMspResponse = 'this is a bad response';
			const importMSPStub = mySandBox.stub(MspRestApi, 'importMSP').resolves(importMspResponse);
			const closeSidePanelStub = mySandBox.stub();

			const component = shallow(<MSPDefinitionModal {...settingsModalProps} />);

			// manually setting props
			component.setProps({
				msp_id: 'mspid',
				msp_name: 'my msp definition',
				rootCerts: ['some', 'root', 'certs'],
				admins: ['i', 'am', 'an', 'admin'],
				disableSubmit: false,
			});
			updateStateStub.resetHistory();

			// mocking ref to SidePanel close function
			component.instance().sidePanel = { closeSidePanel: closeSidePanelStub };
			await component.instance().onSubmit();

			updateStateStub.getCall(0).should.have.been.calledWith(SCOPE, {
				submitting: true,
				disableSubmit: true,
				error: null,
			});
			updateStateStub.getCall(1).should.have.been.calledWith(SCOPE, {
				submitting: false,
				error: {
					title: 'error_occurred_during_msp_import',
					details: importMspResponse,
				},
			});

			importMSPStub.should.have.been.calledOnce;
			closeSidePanelStub.should.not.have.been.called;
			onCompleteStub.should.not.have.been.called;
			logInfoStub.should.have.been.calledWith('Import msp response: ', importMspResponse);
			logErrorStub.should.not.have.been.called;
		});

		it('should successfully update msp on submit', async() => {
			const editMspResponse = { id: 'some_id' };
			const editMspStub = mySandBox.stub(MspRestApi, 'editMsp').resolves(editMspResponse);
			const closeSidePanelStub = mySandBox.stub();

			const component = shallow(<MSPDefinitionModal {...deleteModalProps} />);

			// I'm having to manually set props here as this would have been done by the updateState function if the component was connected to a redux store for real
			// they're not very accurate to what would actually be passed but it's enough to get the code down the correct path for now -  we can refine them later
			component.setProps({
				msp_id: 'mspid',
				msp_name: 'my msp definition',
				rootCerts: ['some', 'root', 'certs'],
				admins: ['i', 'am', 'an', 'admin'],
				disableSubmit: false,
				isUpdate: true,
			});
			updateStateStub.resetHistory();

			// this line is needed to mock the ref to the SidePanel that is created when it's rendered
			// otherwise the code will error when it tries to call sidePanel.closeSidePanel
			component.instance().sidePanel = { closeSidePanel: closeSidePanelStub };
			await component.instance().onSubmit();

			updateStateStub.getCall(0).should.have.been.calledWith(SCOPE, {
				submitting: true,
				disableSubmit: true,
				error: null,
			});
			editMspStub.should.have.been.calledOnce;
			closeSidePanelStub.should.have.been.calledOnce;
			logInfoStub.should.have.been.calledWith('Edit msp response: ', editMspResponse);
			onCompleteStub.should.have.been.calledOnce;
			logErrorStub.should.not.have.been.called;
		});

		it('should successfully update msp and update admin certs on submit', async() => {
			const editMspResponse = { id: 'some_id' };
			const editMspStub = mySandBox.stub(MspRestApi, 'editMsp').resolves(editMspResponse);
			const syncAdminCertsStub = mySandBox.stub(NodeRestApi, 'syncAdminCerts').resolves();
			const closeSidePanelStub = mySandBox.stub();

			deleteModalProps.associatedPeers = [{ who: 'cares' }];
			deleteModalProps.admins = [{ cert: 'some_cert' }];

			const component = shallow(<MSPDefinitionModal {...deleteModalProps} />);

			// manually setting props
			component.setProps({
				msp_id: 'mspid',
				msp_name: 'my msp definition',
				rootCerts: ['some', 'root', 'certs'],
				admins: ['i', 'am', 'an', 'admin'],
				disableSubmit: false,
				isUpdate: true,
			});
			updateStateStub.resetHistory();

			// mocking ref to SidePanel close function
			component.instance().sidePanel = { closeSidePanel: closeSidePanelStub };
			await component.instance().onSubmit();

			updateStateStub.getCall(0).should.have.been.calledWith(SCOPE, {
				submitting: true,
				disableSubmit: true,
				error: null,
			});
			editMspStub.should.have.been.calledOnce;
			syncAdminCertsStub.should.have.been.calledOnce;
			closeSidePanelStub.should.have.been.calledOnce;
			logInfoStub.should.have.been.calledWith('Edit msp response: ', editMspResponse);
			logInfoStub.should.have.been.calledWith('Updated admin certs on all peers successfully');
			onCompleteStub.should.have.been.calledOnce;
			logErrorStub.should.not.have.been.called;
		});

		it('should not admin certs if peers and orderers not provided in props', async() => {
			const editMspResponse = { id: 'some_id' };
			const editMspStub = mySandBox.stub(MspRestApi, 'editMsp').resolves(editMspResponse);
			const syncAdminCertsStub = mySandBox.stub(NodeRestApi, 'syncAdminCerts').resolves();
			const closeSidePanelStub = mySandBox.stub();

			deleteModalProps.admins = [{ cert: 'some_cert' }];
			delete deleteModalProps.associatedPeers;
			delete deleteModalProps.associatedOrderers;

			const component = shallow(<MSPDefinitionModal {...deleteModalProps} />);

			// manually setting props
			component.setProps({
				msp_id: 'mspid',
				msp_name: 'my msp definition',
				rootCerts: ['some', 'root', 'certs'],
				admins: ['i', 'am', 'an', 'admin'],
				disableSubmit: false,
				isUpdate: true,
			});
			updateStateStub.resetHistory();

			// mocking ref to SidePanel close function
			component.instance().sidePanel = { closeSidePanel: closeSidePanelStub };
			await component.instance().onSubmit();

			updateStateStub.getCall(0).should.have.been.calledWith(SCOPE, {
				submitting: true,
				disableSubmit: true,
				error: null,
			});

			editMspStub.should.have.been.calledOnce;
			syncAdminCertsStub.should.not.have.been.called;
			closeSidePanelStub.should.have.been.calledOnce;
			logInfoStub.should.have.been.calledWith('Edit msp response: ', editMspResponse);
			onCompleteStub.should.have.been.calledOnce;
			logErrorStub.should.not.have.been.called;
		});

		it('should handle error from editMsp on submit', async() => {
			const editMspError = new Error('code go boom');
			const editMspStub = mySandBox.stub(MspRestApi, 'editMsp').rejects(editMspError);
			const closeSidePanelStub = mySandBox.stub();

			const component = shallow(<MSPDefinitionModal {...deleteModalProps} />);

			// manually setting props
			component.setProps({
				msp_id: 'mspid',
				msp_name: 'my msp definition',
				rootCerts: ['some', 'root', 'certs'],
				admins: ['i', 'am', 'an', 'admin'],
				disableSubmit: false,
				isUpdate: true,
			});
			updateStateStub.resetHistory();

			// mocking ref to SidePanel close function
			component.instance().sidePanel = { closeSidePanel: closeSidePanelStub };
			await component.instance().onSubmit();

			updateStateStub.getCall(0).should.have.been.calledWith(SCOPE, {
				submitting: true,
				disableSubmit: true,
				error: null,
			});
			updateStateStub.getCall(1).should.have.been.calledWith(SCOPE, {
				submitting: false,
				error: {
					title: 'error_occurred_during_msp_edit',
					details: editMspError,
				},
			});

			editMspStub.should.have.been.calledOnce;
			closeSidePanelStub.should.not.have.been.called;
			onCompleteStub.should.not.have.been.called;
			logErrorStub.should.have.been.calledOnceWithExactly(`Error occurred while editing msp ${editMspError}`);
		});

		it('should handle bad response from editMsp on submit', async() => {
			const editMspResponse = 'this is a bad response';
			const editMspStub = mySandBox.stub(MspRestApi, 'editMsp').resolves(editMspResponse);
			const closeSidePanelStub = mySandBox.stub();

			const component = shallow(<MSPDefinitionModal {...deleteModalProps} />);

			// manually setting props
			component.setProps({
				msp_id: 'mspid',
				msp_name: 'my msp definition',
				rootCerts: ['some', 'root', 'certs'],
				admins: ['i', 'am', 'an', 'admin'],
				disableSubmit: false,
				isUpdate: true,
			});
			updateStateStub.resetHistory();

			// mocking ref to SidePanel close function
			component.instance().sidePanel = { closeSidePanel: closeSidePanelStub };
			await component.instance().onSubmit();

			updateStateStub.getCall(0).should.have.been.calledWith(SCOPE, {
				submitting: true,
				disableSubmit: true,
				error: null,
			});
			updateStateStub.getCall(1).should.have.been.calledWith(SCOPE, {
				submitting: false,
				error: {
					title: 'error_occurred_during_msp_edit',
					details: editMspResponse,
				},
			});

			editMspStub.should.have.been.calledOnce;
			closeSidePanelStub.should.not.have.been.called;
			onCompleteStub.should.not.have.been.called;
			logErrorStub.should.not.have.been.called;
		});

		it('should error from syncAdminCerts on submit', async() => {
			const editMspResponse = { id: 'some_id' };
			const editMspStub = mySandBox.stub(MspRestApi, 'editMsp').resolves(editMspResponse);
			const syncAdminCertsError = new Error('code go boom');
			const syncAdminCertsStub = mySandBox.stub(NodeRestApi, 'syncAdminCerts').rejects(syncAdminCertsError);
			const closeSidePanelStub = mySandBox.stub();

			deleteModalProps.associatedPeers = [{ who: 'cares' }];
			deleteModalProps.admins = [{ cert: 'some_cert' }];

			const component = shallow(<MSPDefinitionModal {...deleteModalProps} />);

			// manually setting props
			component.setProps({
				msp_id: 'mspid',
				msp_name: 'my msp definition',
				rootCerts: ['some', 'root', 'certs'],
				admins: ['i', 'am', 'an', 'admin'],
				disableSubmit: false,
				isUpdate: true,
			});
			updateStateStub.resetHistory();

			// mocking ref to SidePanel close function
			component.instance().sidePanel = { closeSidePanel: closeSidePanelStub };
			await component.instance().onSubmit();

			updateStateStub.getCall(0).should.have.been.calledWith(SCOPE, {
				submitting: true,
				disableSubmit: true,
				error: null,
			});
			updateStateStub.getCall(1).should.have.been.calledWith(SCOPE, {
				submitting: false,
				error: {
					title: 'error_occurred_during_sync_certs',
					details: syncAdminCertsError,
				},
			});

			editMspStub.should.have.been.calledOnce;
			syncAdminCertsStub.should.have.been.calledOnce;
			closeSidePanelStub.should.not.have.been.called;
			logInfoStub.should.have.been.calledWith('Edit msp response: ', editMspResponse);
			onCompleteStub.should.not.have.been.called;
			logErrorStub.should.not.have.been.called;
		});

		it('should succesfully submit when properties they have been removed during update', async() => {
			const editMspResponse = { id: 'some_id' };
			const editMspStub = mySandBox.stub(MspRestApi, 'editMsp').resolves(editMspResponse);
			const closeSidePanelStub = mySandBox.stub();

			const component = shallow(<MSPDefinitionModal {...deleteModalProps} />);

			// manually setting props
			const msp = {
				intermediate_certs: ['intermediate_certs'],
				tls_root_certs: ['tls_root_certs'],
				tls_intermediate_certs: ['tls_intermediate_certs'],
				revocation_list: ['revocation_list'],
				organizational_unit_identifiers: ['organizational_unit_identifiers'],
				fabric_node_ous: { x: 'fabric_node_ous' },
			};

			component.setProps({
				msp,
				intermediate_certs: [],
				tls_root_certs: [],
				tls_intermediate_certs: [],
				revocation_list: [],
				organizational_unit_identifiers: [],
				fabric_node_ous: {},
				msp_id: 'mspid',
				msp_name: 'my msp definition',
				rootCerts: ['some', 'root', 'certs'],
				admins: ['i', 'am', 'an', 'admin'],
				disableSubmit: false,
				isUpdate: true,
			});
			updateStateStub.resetHistory();

			// this line is needed to mock the ref to the SidePanel that is created when it's rendered
			// otherwise the code will error when it tries to call sidePanel.closeSidePanel
			component.instance().sidePanel = { closeSidePanel: closeSidePanelStub };
			await component.instance().onSubmit();

			updateStateStub.getCall(0).should.have.been.calledWith(SCOPE, {
				submitting: true,
				disableSubmit: true,
				error: null,
			});
			editMspStub.should.have.been.calledOnce;
			closeSidePanelStub.should.have.been.calledOnce;
			logInfoStub.should.have.been.calledWith('Edit msp response: ', editMspResponse);
			onCompleteStub.should.have.been.calledOnce;
			logErrorStub.should.not.have.been.called;
		});
	});

	describe('MSPDefinitionModal - deleteMsp', () => {
		it('should delete msp', async() => {
			const removeComponentStub = mySandBox.stub(NodeRestApi, 'removeComponent').resolves();
			const closeSidePanelStub = mySandBox.stub();

			const component = shallow(<MSPDefinitionModal {...deleteModalProps} />);

			// manually setting props
			component.setProps({
				selectedMsp: {
					id: 'msp_id',
				},
			});
			updateStateStub.resetHistory();

			// mocking ref to SidePanel close function
			component.instance().sidePanel = { closeSidePanel: closeSidePanelStub };
			await component.instance().deleteMsp();

			updateStateStub.should.have.been.calledTwice;
			updateStateStub.getCall(0).should.have.been.calledWith(SCOPE, { submitting: true });
			updateStateStub.getCall(1).should.have.been.calledWith(SCOPE, { submitting: false });
			removeComponentStub.should.have.been.calledOnce;
			onCompleteStub.should.have.been.calledOnce;
			closeSidePanelStub.should.have.been.calledOnce;
			logErrorStub.should.not.have.been.called;
		});

		it('should handle error from removeComponent when deleting msp', async() => {
			const removeComponentError = new Error('codoe go boom');
			const removeComponentStub = mySandBox.stub(NodeRestApi, 'removeComponent').rejects(removeComponentError);
			const closeSidePanelStub = mySandBox.stub();

			const component = shallow(<MSPDefinitionModal {...deleteModalProps} />);

			// manually setting props
			component.setProps({
				selectedMsp: {
					id: 'msp_id',
				},
			});
			updateStateStub.resetHistory();

			// mocking ref to SidePanel close function
			component.instance().sidePanel = { closeSidePanel: closeSidePanelStub };
			await component.instance().deleteMsp();

			updateStateStub.should.have.been.calledTwice;
			updateStateStub.getCall(0).should.have.been.calledWith(SCOPE, { submitting: true });
			updateStateStub.getCall(1).should.have.been.calledWith(SCOPE, { error: removeComponentError, submitting: false });
			removeComponentStub.should.have.been.calledOnce;
			onCompleteStub.should.not.have.been.called;
			closeSidePanelStub.should.not.have.been.called;
			logErrorStub.should.have.been.calledOnceWithExactly(`removing MSP: failed: ${removeComponentError}`);
		});
	});

	describe('MSPDefinitionModal - onComplete()', () => {
		it('should warn if onComplete is not a function', async() => {
			delete settingsModalProps.onComplete;

			const importMspResponse = { id: 'some_id' };
			const importMSPStub = mySandBox.stub(MspRestApi, 'importMSP').resolves(importMspResponse);
			const closeSidePanelStub = mySandBox.stub();

			const component = shallow(<MSPDefinitionModal {...settingsModalProps} />);

			// manually setting props
			component.setProps({
				msp_id: 'mspid',
				msp_name: 'my msp definition',
				rootCerts: ['some', 'root', 'certs'],
				admins: ['i', 'am', 'an', 'admin'],
				disableSubmit: false,
			});
			updateStateStub.resetHistory();

			// mocking ref to SidePanel close function
			component.instance().sidePanel = { closeSidePanel: closeSidePanelStub };
			await component.instance().onSubmit();

			updateStateStub.getCall(0).should.have.been.calledWith(SCOPE, {
				submitting: true,
				disableSubmit: true,
				error: null,
			});
			importMSPStub.should.have.been.calledOnce;
			closeSidePanelStub.should.have.been.calledOnce;
			onCompleteStub.should.not.have.been.called;
			logInfoStub.should.have.been.calledWith('Import msp response: ', importMspResponse);
			logWarnStub.should.have.been.calledOnceWithExactly(`${SCOPE} ${settingsModalProps.mspModalType}: onComplete() is not set`);
			logErrorStub.should.not.have.been.called;
		});
	});

	describe('MSPDefinitionModal - componentWillUnmount()', () => {
		// this test should be pretty similar across all components that have a componentWillUnmount function
		// we mount the component and then immediately unmount it so that componentWillUnmount will be called
		it('should clear state on unmount', async() => {
			const component = mount(<MSPDefinitionModal {...settingsModalProps} />);
			updateStateStub.resetHistory();
			component.unmount();
			updateStateStub.should.have.been.calledOnceWithExactly(SCOPE, {
				data: [],
				enableOU: false,
				host_url: '',
				isUpdate: false,
			});
		});
	});
});
