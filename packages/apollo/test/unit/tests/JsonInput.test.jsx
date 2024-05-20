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
import { mount, shallow } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
// this is the component we're testing - import it wrapped in curly braces to get the version not connected to the redux store
import { JsonInput } from '../../../src/components/JsonInput/JsonInput';
import Helper from '../../../src/utils/helper';
const should = chai.should();
chai.use(sinonChai);

jest.mock('../../../src/components/BlockchainTooltip/BlockchainTooltip', () => {
	return {
		__esModule: true,
		default: () => {
			return <>BlockchainTooltip component goes here</>;
		},
	};
});

jest.mock('../../../src/components/Form/Form', () => {
	return {
		__esModule: true,
		default: () => {
			return <>Form component goes here</>;
		},
	};
});

jest.mock('../../../src/components/ImportantBox/ImportantBox', () => {
	return {
		__esModule: true,
		default: () => {
			return <>ImportantBox component goes here</>;
		},
	};
});

// mocked out the carbon components as the TextInput component was complaining about missing certain properties
jest.mock('carbon-components-react', () => {
	return {
		__esModule: true,
		ContentSwitcher: () => {
			return <></>;
		},
		Switch: () => {
			return <></>;
		},
		TextInput: () => {
			return <></>;
		},
	};
});

describe('JsonInput component', () => {
	const SCOPE = 'jsonInput';
	let mySandBox;
	let onChangeStub;
	let onErrorStub;
	let translateStub;
	let updateStateStub;
	let props;

	beforeEach(() => {
		mySandBox = sinon.createSandbox();

		onChangeStub = mySandBox.stub();
		onErrorStub = mySandBox.stub();
		// this is to replace the translate function that gets passed to the component when it's connected to the redux store - it just returns whatever string that it's passed
		translateStub = mySandBox.stub().callsFake(inputString => {
			return inputString;
		});
		// this is the stub that will be called whenever this.props.updateState is called in the component code
		updateStateStub = mySandBox.stub();

		props = {
			id: 'testJsonInput',
			definition: [{ name: 'some_field' }],
			uniqueNames: true,
			singleInput: true,
			manualEntry: true,
			onChange: onChangeStub,
			onError: onErrorStub,
			t: translateStub,
			updateState: updateStateStub,
		};
	});

	afterEach(() => {
		mySandBox.restore();
	});

	describe('JsonInput - render()', () => {
		it('should render for JSON upload as expected if onlyFileUpload is true', async() => {
			props.onlyFileUpload = true;
			const component = mount(<JsonInput {...props} />);
			component
				.find('div')
				.at(1)
				.hasClass('ibp-json-file-container')
				.should.deep.equal(true);

			const fileUploaderJSX = component.find('.ibp-file-uploader').at(0);
			fileUploaderJSX.contains('upload_json').should.deep.equal(true);
			fileUploaderJSX
				.find('label')
				.at(0)
				.contains('add_file')
				.should.deep.equal(true);
		});

		it('should render as expected if manualEntry is false', async() => {
			props.manualEntry = false;
			const component = mount(<JsonInput {...props} />);
			component
				.find('div')
				.at(1)
				.props()
				.id.should.deep.equal(props.id);
			component.find('.ibp-json-file-container').length.should.deep.equal(1);

			const fileUploaderJSX = component.find('.ibp-file-uploader').at(0);
			fileUploaderJSX.contains('upload_json').should.deep.equal(true);
			fileUploaderJSX
				.find('label')
				.at(0)
				.contains('add_file')
				.should.deep.equal(true);
		});

		it('should render as expected if manualEntry is true', async() => {
			const component = mount(<JsonInput {...props} />);
			component
				.find('div')
				.at(1)
				.props()
				.id.should.deep.equal(props.id);
			component
				.find('.ibp-json-form')
				.at(0)
				.contains('Form component goes here')
				.should.deep.equal(true);
		});
	});

	describe('JsonInput - renderFileUploader()', () => {
		it('should render file uploader as expected', async() => {
			const component = shallow(<JsonInput {...props} />);
			const fileUploaderJSX = mount(component.instance().renderFileUploader(translateStub));
			fileUploaderJSX.contains('upload_json').should.deep.equal(true);
			fileUploaderJSX
				.find('label')
				.at(0)
				.contains('add_file')
				.should.deep.equal(true);
		});

		it('should render a file uploader with a provided tooltip', async() => {
			props.fileUploadTooltip = 'some tooltip';
			const component = shallow(<JsonInput {...props} />);
			const fileUploaderJSX = mount(component.instance().renderFileUploader(translateStub));
			fileUploaderJSX
				.find('div')
				.at(0)
				.hasClass('ibp-file-upload-title-with-tooltip')
				.should.deep.equal(true);
			fileUploaderJSX
				.find('label')
				.at(0)
				.contains('add_file')
				.should.deep.equal(true);
		});

		it('should render a file uploader with a provided description', async() => {
			props.description = 'some description';
			const component = shallow(<JsonInput {...props} />);
			const fileUploaderJSX = mount(component.instance().renderFileUploader(translateStub));
			fileUploaderJSX.contains('upload_json').should.deep.equal(true);
			fileUploaderJSX
				.find('p')
				.at(0)
				.contains(props.description)
				.should.deep.equal(true);
			fileUploaderJSX
				.find('label')
				.at(0)
				.contains('add_file')
				.should.deep.equal(true);
		});

		it('should render a file uploader with with \'add files\' button label', async() => {
			props.singleInput = false;
			const component = shallow(<JsonInput {...props} />);
			const fileUploaderJSX = mount(component.instance().renderFileUploader(translateStub));
			fileUploaderJSX.contains('upload_json').should.deep.equal(true);
			fileUploaderJSX
				.find('label')
				.at(0)
				.contains('add_files')
				.should.deep.equal(true);
		});

		it('should return out if there should only be a single input but multiple are provided', async() => {
			props.data = [
				{
					name: 'alice',
					key: 'key1',
				},
				{
					name: 'bob',
					key: 'key2',
				},
			];
			const component = shallow(<JsonInput {...props} />);
			const fileUploaderJSX = component.instance().renderFileUploader(translateStub);
			should.not.exist(fileUploaderJSX);
		});
	});

	describe('JsonInput - renderJSONUpload()', () => {
		it('should only render file uploader if no data provided in props ', async() => {
			const renderFileUploaderSpy = mySandBox.spy(JsonInput.prototype, 'renderFileUploader');
			const component = shallow(<JsonInput {...props} />);
			const jsonUploadJSX = mount(component.instance().renderJSONUpload(translateStub));
			jsonUploadJSX.contains('upload_json').should.deep.equal(true);
			jsonUploadJSX
				.find('label')
				.at(0)
				.contains('add_file')
				.should.deep.equal(true);
			renderFileUploaderSpy.should.have.been.calledOnce;
		});

		it('should render text input if data is provided', async() => {
			delete props.singleInput;
			props.data = [
				{
					name: 'alice',
					key: 'key1',
				},
				{
					name: 'bob',
					key: 'key2',
				},
			];
			const component = shallow(<JsonInput {...props} />);
			const jsonUploadJSX = mount(component.instance().renderJSONUpload(translateStub));
			jsonUploadJSX.find('.ibp-json-item').length.should.deep.equal(2);
			jsonUploadJSX
				.find(`#${props.id}-json-name-0`)
				.at(0)
				.props()
				.defaultValue.should.deep.equal(props.data[0].name);
			jsonUploadJSX
				.find(`#${props.id}-json-name-1`)
				.at(0)
				.props()
				.defaultValue.should.deep.equal(props.data[1].name);
		});

		it('should include an error message if there should only be one input but multiple are provided', async() => {
			props.data = [
				{
					name: 'alice',
					key: 'key1',
				},
				{
					name: 'bob',
					key: 'key2',
				},
			];
			const component = shallow(<JsonInput {...props} />);
			const jsonUploadJSX = mount(component.instance().renderJSONUpload(translateStub));
			jsonUploadJSX
				.find('default')
				.at(0)
				.props()
				.text.should.deep.equal('error_single_input_box');
			jsonUploadJSX
				.find('default')
				.at(0)
				.contains('ImportantBox component goes here')
				.should.deep.equal(true);
			jsonUploadJSX.find('.ibp-json-item').length.should.deep.equal(2);
			jsonUploadJSX
				.find(`#${props.id}-json-name-0`)
				.at(0)
				.props()
				.defaultValue.should.deep.equal(props.data[0].name);
			jsonUploadJSX
				.find(`#${props.id}-json-name-1`)
				.at(0)
				.props()
				.defaultValue.should.deep.equal(props.data[1].name);
		});

		it('should include error styling if provided data contains an error', async() => {
			props.data = [
				{
					name: 'alice',
					key: 'key1',
					error: 'code go boom',
				},
			];
			const component = shallow(<JsonInput {...props} />);
			const jsonUploadJSX = mount(component.instance().renderJSONUpload(translateStub));
			jsonUploadJSX
				.find('div')
				.at(2)
				.hasClass('ibp-json-error')
				.should.deep.equal(true);
			jsonUploadJSX.find('.ibp-json-error-detail').length.should.deep.equal(1);
			jsonUploadJSX.find('.ibp-json-item').length.should.deep.equal(1);
			jsonUploadJSX
				.find(`#${props.id}-json-name-0`)
				.at(0)
				.props()
				.defaultValue.should.deep.equal(props.data[0].name);
		});

		it('should call removeData if button is clicked', async() => {
			const removeDataStub = mySandBox.stub(JsonInput.prototype, 'removeData');
			props.data = [
				{
					name: 'alice',
					key: 'key1',
				},
			];
			const component = shallow(<JsonInput {...props} />);
			const jsonUploadJSX = mount(component.instance().renderJSONUpload(translateStub));
			jsonUploadJSX
				.find('button')
				.at(0)
				.simulate('click');
			removeDataStub.should.have.been.calledOnceWithExactly(props.data[0].key);
		});

		it('should update name field if new value is provided', async() => {
			const updateJsonInputStateStub = mySandBox.stub(JsonInput.prototype, 'updateJsonInputState');
			const checkDataStub = mySandBox.stub(JsonInput.prototype, 'checkData');

			props.onlyFileUpload = true;
			const event = {
				target: {
					value: 'bob',
				},
			};
			props.data = [{ name: 'alice' }];
			const component = shallow(<JsonInput {...props} />);
			component
				.find('div')
				.at(3)
				.children()
				.at(0)
				.simulate('change', event);
			updateJsonInputStateStub.getCall(1).should.have.been.calledWith(props.manualEntry, [{ name: 'bob' }]);
			checkDataStub.should.have.been.calledOnceWithExactly([{ name: 'bob' }]);
		});

		it('should update display_name field if new value is provided', async() => {
			const updateJsonInputStateStub = mySandBox.stub(JsonInput.prototype, 'updateJsonInputState');
			const checkDataStub = mySandBox.stub(JsonInput.prototype, 'checkData');

			props.onlyFileUpload = true;
			const event = {
				target: {
					value: 'bob',
				},
			};
			props.data = [{ display_name: 'alice' }];
			const component = shallow(<JsonInput {...props} />);
			component
				.find('div')
				.at(3)
				.children()
				.at(0)
				.simulate('change', event);
			updateJsonInputStateStub.getCall(1).should.have.been.calledWith(props.manualEntry, [{ display_name: 'bob' }]);
			checkDataStub.should.have.been.calledOnceWithExactly([{ display_name: 'bob' }]);
		});

		it('should update cluster_name field if new value is provided', async() => {
			const updateJsonInputStateStub = mySandBox.stub(JsonInput.prototype, 'updateJsonInputState');
			const checkDataStub = mySandBox.stub(JsonInput.prototype, 'checkData');

			props.onlyFileUpload = true;
			const event = {
				target: {
					value: 'bob',
				},
			};
			props.data = [{ cluster_name: 'alice' }];
			const component = shallow(<JsonInput {...props} />);
			component
				.find('div')
				.at(3)
				.children()
				.at(0)
				.simulate('change', event);
			updateJsonInputStateStub.getCall(1).should.have.been.calledWith(props.manualEntry, [{ cluster_name: 'bob' }]);
			checkDataStub.should.have.been.calledOnceWithExactly([{ cluster_name: 'bob' }]);
		});

		it('should update cluster_name field if new value is provided', async() => {
			const updateJsonInputStateStub = mySandBox.stub(JsonInput.prototype, 'updateJsonInputState');
			const checkDataStub = mySandBox.stub(JsonInput.prototype, 'checkData');

			props.onlyFileUpload = true;
			const event = {
				target: {
					value: 'bob',
				},
			};
			props.data = [{ cluster_name: 'alice' }];
			const component = shallow(<JsonInput {...props} />);
			component
				.find('div')
				.at(3)
				.children()
				.at(0)
				.simulate('change', event);
			updateJsonInputStateStub.getCall(1).should.have.been.calledWith(props.manualEntry, [{ cluster_name: 'bob' }]);
			checkDataStub.should.have.been.calledOnceWithExactly([{ cluster_name: 'bob' }]);
		});

		it('should update nodes in raft orderer clusters if provided', async() => {
			const updateJsonInputStateStub = mySandBox.stub(JsonInput.prototype, 'updateJsonInputState');
			const checkDataStub = mySandBox.stub(JsonInput.prototype, 'checkData');

			props.onlyFileUpload = true;
			const event = {
				target: {
					value: 'bob',
				},
			};
			props.data = [
				{
					cluster_name: 'alice',
					raft: [
						{
							cluster_name: 'alice',
						},
					],
				},
			];
			const component = shallow(<JsonInput {...props} />);
			component
				.find('div')
				.at(3)
				.children()
				.at(0)
				.simulate('change', event);
			updateJsonInputStateStub.getCall(1).should.have.been.calledWith(props.manualEntry, [
				{
					cluster_name: 'bob',
					raft: [
						{
							cluster_name: 'bob',
						},
					],
				},
			]);
			checkDataStub.should.have.been.calledOnceWithExactly([
				{
					cluster_name: 'bob',
					raft: [
						{
							cluster_name: 'bob',
						},
					],
				},
			]);
		});
	});

	describe('JsonInput - componentDidMount()', () => {
		it('should call clearData function when mounted', async() => {
			const clearDataStub = mySandBox.stub(JsonInput.prototype, 'clearData');
			shallow(<JsonInput {...props} />);
			clearDataStub.should.have.been.calledOnceWithExactly(true);
		});
	});

	describe('JsonInput - clearData', () => {
		it('should clear data in state and call onChange function', async() => {
			const clearDataSpy = mySandBox.spy(JsonInput.prototype, 'clearData');
			shallow(<JsonInput {...props} />);
			clearDataSpy.should.have.been.calledOnceWithExactly(true);
			onChangeStub.should.have.been.calledOnceWithExactly([], false);
		});

		it('should clear data in state and not call onChange if not provided in props', async() => {
			delete props.onChange;
			const clearDataSpy = mySandBox.spy(JsonInput.prototype, 'clearData');
			shallow(<JsonInput {...props} />);
			clearDataSpy.should.have.been.calledOnceWithExactly(true);
			onChangeStub.should.not.have.been.called;
		});
	});

	describe('JsonInput - updateJsonInputState()', () => {
		it('should update redux state with provided data', async() => {
			const component = shallow(<JsonInput {...props} />);
			updateStateStub.resetHistory();
			const data = { some: 'data' };
			component.instance().updateJsonInputState(true, data);
			updateStateStub.should.have.been.calledOnceWithExactly(SCOPE, {
				testJsonInput: {
					data,
					manualEntry: true,
				},
			});
		});
	});

	describe('JsonInput - componentWillUnmount', () => {
		it('should clear state before unmounting', async() => {
			const component = shallow(<JsonInput {...props} />);
			updateStateStub.resetHistory();
			component.unmount();
			updateStateStub.should.have.been.calledTwice;
			updateStateStub.getCall(0).should.have.been.calledWith(SCOPE, { testJsonInput: null });
			updateStateStub.getCall(1).should.have.been.calledWith(`${SCOPE}-${props.id}`, { some_field: null });
		});
	});

	describe('JsonInput - checkForAlias()', () => {
		beforeEach(() => {
			props.definition = [
				{
					name: 'display_name',
					alias: 'name',
				},
			];
		});

		it('should update json if it uses an alias for the field name', async() => {
			const json = { name: 'alice' };
			const component = shallow(<JsonInput {...props} />);
			component.instance().checkForAlias(json);
			json.should.deep.equal({ display_name: 'alice' });
		});

		it('should not update json if it already has a field.name field', async() => {
			const json = { name: 'alice', display_name: 'bob' };
			const component = shallow(<JsonInput {...props} />);
			component.instance().checkForAlias(json);
			json.should.deep.equal({ name: 'alice', display_name: 'bob' });
		});

		it('should not update json if the definition contains no aliases', async() => {
			delete props.definition[0].alias;
			const json = { name: 'alice' };
			const component = shallow(<JsonInput {...props} />);
			component.instance().checkForAlias(json);
			json.should.deep.equal({ name: 'alice' });
		});

		it('should recursively call function if provided json is an array', async() => {
			const checkForAliasSpy = mySandBox.spy(JsonInput.prototype, 'checkForAlias');
			const json = [{ name: 'alice' }];
			const component = shallow(<JsonInput {...props} />);
			component.instance().checkForAlias(json);
			json.should.deep.equal([{ display_name: 'alice' }]);
			checkForAliasSpy.should.have.been.calledTwice;
		});

		it('should handle definition alias being an array', async() => {
			props.definition[0].alias = ['short_name', 'name'];
			const json = { name: 'alice' };
			const component = shallow(<JsonInput {...props} />);
			component.instance().checkForAlias(json);
			json.should.deep.equal({ display_name: 'alice' });
		});
	});

	describe('JsonInput - cleanUpCertificates()', () => {
		let cleanUpCertificateFormatStub;

		beforeEach(() => {
			cleanUpCertificateFormatStub = mySandBox.stub(Helper, 'cleanUpCertificateFormat');
			props.definition = [
				{
					name: 'cert',
					type: 'certificate',
				},
			];
		});

		it('should attempt to clean up certificates of a certificate field', async() => {
			const json = { cert: 'some_cert' };
			const component = shallow(<JsonInput {...props} />);
			component.instance().cleanUpCertificates(json);
			cleanUpCertificateFormatStub.should.have.been.calledOnceWithExactly('some_cert');
		});

		it('should attempt to clean up certificates of a private key field', async() => {
			props.definition[0].type = 'private_key';
			const json = { cert: 'some_cert' };
			const component = shallow(<JsonInput {...props} />);
			component.instance().cleanUpCertificates(json);
			cleanUpCertificateFormatStub.should.have.been.calledOnceWithExactly('some_cert');
		});

		it('should not attempt to clean up certificates on other field types', async() => {
			props.definition[0].type = 'whatever';
			const json = { cert: 'some_cert' };
			const component = shallow(<JsonInput {...props} />);
			component.instance().cleanUpCertificates(json);
			cleanUpCertificateFormatStub.should.not.have.been.called;
		});

		it('should recursively call function if provided json is an array', async() => {
			const cleanUpCertificatesSpy = mySandBox.spy(JsonInput.prototype, 'cleanUpCertificates');
			const json = [{ cert: 'some_cert' }];
			const component = shallow(<JsonInput {...props} />);
			component.instance().cleanUpCertificates(json);
			cleanUpCertificatesSpy.should.have.been.calledTwice;
			cleanUpCertificateFormatStub.should.have.been.calledOnceWithExactly('some_cert');
		});
	});

	describe('JsonInput - checkDefinition()', () => {
		let checkSpecialRulesStub;
		let validateCharactersStub;

		beforeEach(() => {
			checkSpecialRulesStub = mySandBox.stub(Helper, 'checkSpecialRules').returns();
			validateCharactersStub = mySandBox.stub(Helper, 'validateCharacters').returns(true);
		});

		it('should check definition if provided json contains a key field and return without error', async() => {
			const json = {
				some_field: 'flower field',
				key: 'myKey_1',
			};
			const component = shallow(<JsonInput {...props} />);
			const check = component.instance().checkDefinition(json);
			should.not.exist(check.error);
			checkSpecialRulesStub.should.have.been.calledOnce;
			validateCharactersStub.should.have.been.calledOnce;
		});

		it('should check the definition of a generic field and return without error', async() => {
			const json = { some_field: 'flower field' };
			const component = shallow(<JsonInput {...props} />);
			const check = component.instance().checkDefinition(json);
			should.not.exist(check.error);
			checkSpecialRulesStub.should.have.been.calledOnce;
			validateCharactersStub.should.have.been.calledOnce;
		});

		it('should return with error if required field is not provided in json', async() => {
			props.definition[0].required = true;
			const json = { some: 'value' };
			const component = shallow(<JsonInput {...props} />);
			const check = component.instance().checkDefinition(json);
			check.error.should.deep.equal({
				message: 'error_required_field',
				opts: { field: props.definition[0].name },
			});
			checkSpecialRulesStub.should.not.have.been.called;
			validateCharactersStub.should.not.have.been.called;
		});

		it('should do nothing if the definition is missing the name of the field', async() => {
			props.definition = [
				{
					some: 'value',
				},
			];
			const json = {
				some_field: 'flower field',
				key: 'myKey_1',
			};
			const component = shallow(<JsonInput {...props} />);
			const check = component.instance().checkDefinition(json);
			should.not.exist(check.error);
			checkSpecialRulesStub.should.not.have.been.called;
			validateCharactersStub.should.not.have.been.called;
		});

		it('should check the definition of a certificate field and return without error', () => {
			mySandBox.stub(Helper, 'isCertificate').returns(true);
			props.definition = [
				{
					name: 'cert',
					type: 'certificate',
				},
			];
			const json = { cert: 'some_cert' };
			const component = shallow(<JsonInput {...props} />);
			const check = component.instance().checkDefinition(json);
			should.not.exist(check.error);
			checkSpecialRulesStub.should.have.been.calledOnce;
			validateCharactersStub.should.have.been.calledOnce;
		});

		it('should return with error if the value of the certificate field is not a valid certificate', async() => {
			mySandBox.stub(Helper, 'isCertificate').returns(false);
			props.definition = [
				{
					name: 'cert',
					type: 'certificate',
				},
			];
			const json = { cert: 'some_cert' };
			const component = shallow(<JsonInput {...props} />);
			const check = component.instance().checkDefinition(json);
			check.error.should.deep.equal({
				message: 'error_certificate',
				opts: { field: props.definition[0].name },
			});
			checkSpecialRulesStub.should.not.have.been.called;
			validateCharactersStub.should.not.have.been.called;
		});

		it('should check the definition of a private key field and return without error', async() => {
			mySandBox.stub(Helper, 'isPrivateKey').returns(true);
			props.definition = [
				{
					name: 'private_key',
					type: 'private_key',
				},
			];
			const json = { private_key: 'myPrivateKey' }; // pragma: allowlist secret
			const component = shallow(<JsonInput {...props} />);
			const check = component.instance().checkDefinition(json);
			should.not.exist(check.error);
			checkSpecialRulesStub.should.have.been.calledOnce;
			validateCharactersStub.should.have.been.calledOnce;
		});

		it('should return with error if the value of the private key field is not a valid private key', async() => {
			mySandBox.stub(Helper, 'isPrivateKey').returns(false);
			props.definition = [
				{
					name: 'private_key',
					type: 'private_key',
				},
			];
			const json = { private_key: 'myPrivateKey' }; // pragma: allowlist secret
			const component = shallow(<JsonInput {...props} />);
			const check = component.instance().checkDefinition(json);
			check.error.should.deep.equal({
				message: 'error_private_key',
				opts: { field: props.definition[0].name },
			});
			checkSpecialRulesStub.should.not.have.been.called;
			validateCharactersStub.should.not.have.been.called;
		});

		it('should check the definition of an email field and return without error', async() => {
			mySandBox.stub(Helper, 'isEmail').returns(true);
			props.definition = [
				{
					name: 'email',
					type: 'email',
				},
			];
			const json = { email: 'some-guy@email.com' };
			const component = shallow(<JsonInput {...props} />);
			const check = component.instance().checkDefinition(json);
			should.not.exist(check.error);
			checkSpecialRulesStub.should.have.been.calledOnce;
			validateCharactersStub.should.have.been.calledOnce;
		});

		it('should return with error if the value of the email field is not a valid email address', async() => {
			mySandBox.stub(Helper, 'isEmail').returns(false);
			props.definition = [
				{
					name: 'email',
					type: 'email',
				},
			];
			const json = { email: 'some-guy@email.com' };
			const component = shallow(<JsonInput {...props} />);
			const check = component.instance().checkDefinition(json);
			check.error.should.deep.equal({
				message: 'error_email',
				opts: { field: props.definition[0].name },
			});
			checkSpecialRulesStub.should.not.have.been.called;
			validateCharactersStub.should.not.have.been.called;
		});

		it('should check the definition of a url field and return without error', async() => {
			mySandBox.stub(Helper, 'isURL').returns(true);
			props.definition = [
				{
					name: 'url',
					type: 'url',
				},
			];
			const json = { url: 'https://some-url.com' };
			const component = shallow(<JsonInput {...props} />);
			const check = component.instance().checkDefinition(json);
			should.not.exist(check.error);
			checkSpecialRulesStub.should.have.been.calledOnce;
			validateCharactersStub.should.have.been.calledOnce;
		});

		it('should return with error if the value of the url field is not a valid url', async() => {
			mySandBox.stub(Helper, 'isURL').returns(false);
			props.definition = [
				{
					name: 'url',
					type: 'url',
				},
			];
			const json = { url: 'https://some-url.com' };
			const component = shallow(<JsonInput {...props} />);
			const check = component.instance().checkDefinition(json);
			check.error.should.deep.equal({
				message: 'error_url',
				opts: { field: props.definition[0].name },
			});
			checkSpecialRulesStub.should.not.have.been.called;
			validateCharactersStub.should.not.have.been.called;
		});

		it('should return without error if value complies with special rules', async() => {
			checkSpecialRulesStub.callThrough();
			props.definition[0].specialRules = { maxLength64: true };
			const json = { some_field: 'flower field' };
			const component = shallow(<JsonInput {...props} />);
			const check = component.instance().checkDefinition(json);
			should.not.exist(check.error);
			checkSpecialRulesStub.should.have.been.calledOnce;
			validateCharactersStub.should.have.been.calledOnce;
		});

		it('should return with error if value does not meet special rules', async() => {
			checkSpecialRulesStub.callThrough();
			props.definition[0].specialRules = { maxLength30: true };
			const json = { some_field: 'this value is longer than 30 characters' };
			const component = shallow(<JsonInput {...props} />);
			const check = component.instance().checkDefinition(json);
			check.error.should.deep.equal({
				message: 'json_max_length_30',
				opts: { field: props.definition[0].name },
			});
			checkSpecialRulesStub.should.have.been.calledOnce;
			validateCharactersStub.should.not.have.been.called;
		});

		it('should return with error if value contains invalid characters', async() => {
			// as far as I can tell the validateCharacters function will always return true? so we'll have to stub this for the time being
			validateCharactersStub.returns(false);
			const json = { some_field: 'flower field' };
			const component = shallow(<JsonInput {...props} />);
			const check = component.instance().checkDefinition(json);
			check.error.should.deep.equal({
				message: 'error_invalid_json_char',
				opts: { field: props.definition[0].name },
			});
			checkSpecialRulesStub.should.have.been.calledOnce;
			validateCharactersStub.should.have.been.calledOnce;
		});

		it('check the definition of a name value pair and return without error', async() => {
			props.definition = [
				{
					name: 'pairs',
					type: 'namevaluepair',
				},
			];
			const json = {
				pairs: [
					{
						name: 'value',
					},
				],
			};
			const component = shallow(<JsonInput {...props} />);
			const check = component.instance().checkDefinition(json);
			should.not.exist(check.error);
			checkSpecialRulesStub.should.have.been.calledOnce;
			validateCharactersStub.should.have.been.calledTwice;
		});

		it('should check definition of a name value pair if the field is named \'namevaluepairs\'', async() => {
			props.definition = [
				{
					name: 'pairs',
					type: 'namevaluepairs',
				},
			];
			const json = {
				pairs: [
					{
						name: 'value',
					},
				],
			};
			const component = shallow(<JsonInput {...props} />);
			const check = component.instance().checkDefinition(json);
			should.not.exist(check.error);
			checkSpecialRulesStub.should.have.been.calledOnce;
			validateCharactersStub.should.have.been.calledTwice;
		});

		it('should return with error if the name or value of the name value pair contains invalid characters', async() => {
			props.definition = [
				{
					name: 'pairs',
					type: 'namevaluepairs',
				},
			];
			const json = {
				pairs: [
					{
						name: 'value',
					},
				],
			};
			validateCharactersStub.returns(false);

			const component = shallow(<JsonInput {...props} />);
			const check = component.instance().checkDefinition(json);
			check.error.should.deep.equal({
				message: 'error_invalid_json_char',
				opts: { field: props.definition[0].name },
			});
			checkSpecialRulesStub.should.have.been.calledOnce;
			validateCharactersStub.should.have.been.calledTwice;
		});

		it('check the definition of a multiselect field and return without error', async() => {
			props.definition = [
				{
					name: 'list',
					type: 'multiselect',
				},
			];
			const json = {
				list: ['apple', 'cherry', 'orange'],
			};
			const component = shallow(<JsonInput {...props} />);
			const check = component.instance().checkDefinition(json);
			should.not.exist(check.error);
			checkSpecialRulesStub.should.have.been.calledOnce;
			validateCharactersStub.should.have.been.calledThrice;
		});

		it('should check definition of a chips field and return without error', async() => {
			props.definition = [
				{
					name: 'list',
					type: 'chips',
				},
			];
			const json = {
				list: ['apple', 'cherry', 'orange'],
			};
			const component = shallow(<JsonInput {...props} />);
			const check = component.instance().checkDefinition(json);
			should.not.exist(check.error);
			checkSpecialRulesStub.should.have.been.calledOnce;
			validateCharactersStub.should.have.been.calledThrice;
		});

		it('should return with error if items in multiselect list contain invalid characters', async() => {
			props.definition = [
				{
					name: 'list',
					type: 'chips',
				},
			];
			const json = {
				list: ['apple', 'cherry', 'orange'],
			};
			validateCharactersStub.returns(false);

			const component = shallow(<JsonInput {...props} />);
			const check = component.instance().checkDefinition(json);
			check.error.should.deep.equal({
				message: 'error_invalid_json_char',
				opts: { field: props.definition[0].name },
			});
			checkSpecialRulesStub.should.have.been.calledOnce;
			validateCharactersStub.should.have.been.calledThrice;
		});

		it('should run field validation function and return without error', async() => {
			const validateFunc = mySandBox.stub().returns(true);
			props.definition[0].validate = validateFunc;
			const json = { some_field: 'flower field' };
			const component = shallow(<JsonInput {...props} />);
			const check = component.instance().checkDefinition(json);
			should.not.exist(check.error);
			checkSpecialRulesStub.should.have.been.calledOnce;
			validateCharactersStub.should.have.been.calledOnce;
			validateFunc.should.have.been.calledOnce;
		});

		it('should return with error if value fails the validation function of the field', async() => {
			const validateFunc = mySandBox.stub().returns(false);
			props.definition[0].validate = validateFunc;
			const json = { some_field: 'flower field' };
			const component = shallow(<JsonInput {...props} />);
			const check = component.instance().checkDefinition(json);
			check.error.should.deep.equal({
				message: 'error_invalid_field_value',
				opts: { field: props.definition[0].name },
			});
			checkSpecialRulesStub.should.have.been.calledOnce;
			validateCharactersStub.should.have.been.calledOnce;
			validateFunc.should.have.been.calledOnce;
		});
	});

	describe('JsonInput - onFileUpload()', () => {
		let readLocalJsonFileStub;
		let checkForAliasStub;
		let cleanUpCertificatesStub;
		let checkDefinitionStub;
		let checkDataStub;
		let updateJsonInputStateStub;
		let jsonFile;
		let event;
		let promises;

		beforeEach(() => {
			readLocalJsonFileStub = mySandBox.stub(Helper, 'readLocalJsonFile');
			jsonFile = {
				file: {
					name: 'myFile1',
				},
				json: {
					some_field: 'flower field',
				},
				error: null,
			};
			const readJsonPromise = new Promise(resolve => resolve(jsonFile));
			readLocalJsonFileStub.returns(readJsonPromise);

			checkForAliasStub = mySandBox.stub(JsonInput.prototype, 'checkForAlias');
			cleanUpCertificatesStub = mySandBox.stub(JsonInput.prototype, 'cleanUpCertificates');
			checkDefinitionStub = mySandBox.stub(JsonInput.prototype, 'checkDefinition').returns(jsonFile.json);
			checkDataStub = mySandBox.stub(JsonInput.prototype, 'checkData');
			updateJsonInputStateStub = mySandBox.stub(JsonInput.prototype, 'updateJsonInputState');

			event = {
				target: {
					files: ['myFile1'],
				},
			};
			promises = [];
		});

		function genericResetAndStubs() {
			checkForAliasStub.resetHistory();
			cleanUpCertificatesStub.resetHistory();
			checkDefinitionStub.resetHistory();
			checkDataStub.resetHistory();
			updateJsonInputStateStub.resetHistory();
		}

		it('should handle uploading a json file', async() => {
			props.data = [];
			const component = shallow(<JsonInput {...props} />);
			genericResetAndStubs();
			const instance = component.instance();
			promises.push(new Promise(resolve => resolve(instance.onFileUpload(event))));
			await Promise.all(promises);

			readLocalJsonFileStub.should.have.been.calledOnceWithExactly(event.target.files[0]);
			checkForAliasStub.should.have.been.calledOnceWithExactly(jsonFile.json);
			cleanUpCertificatesStub.should.have.been.calledOnceWithExactly(jsonFile.json);
			checkDefinitionStub.should.have.been.calledOnceWithExactly(jsonFile.json);
			checkDataStub.should.have.been.calledOnceWithExactly([jsonFile.json]);
			updateJsonInputStateStub.should.have.been.calledOnceWithExactly(props.manualEntry, [jsonFile.json]);
		});

		it('should handle an error in the uploaded file', async() => {
			jsonFile.error = 'code go boom';
			readLocalJsonFileStub.returns(new Promise(resolve => resolve(jsonFile)));
			props.data = [];

			const component = shallow(<JsonInput {...props} />);
			genericResetAndStubs();
			const instance = component.instance();
			promises.push(new Promise(resolve => resolve(instance.onFileUpload(event))));
			await Promise.all(promises);

			readLocalJsonFileStub.should.have.been.calledOnceWithExactly(event.target.files[0]);
			checkForAliasStub.should.not.have.been.called;
			cleanUpCertificatesStub.should.not.have.been.called;
			checkDefinitionStub.should.not.have.been.called;
			checkDataStub.should.have.been.calledOnceWithExactly([
				{
					name: 'myFile1',
					readError: {
						message: 'error_json_file',
						opts: {},
					},
				},
			]);
			updateJsonInputStateStub.should.have.been.calledOnceWithExactly(props.manualEntry, [
				{
					name: 'myFile1',
					readError: {
						message: 'error_json_file',
						opts: {},
					},
				},
			]);
		});

		it('should handle the uploaded file being too big', async() => {
			jsonFile.error = 'file_too_big';
			readLocalJsonFileStub.returns(new Promise(resolve => resolve(jsonFile)));
			props.data = [];

			const component = shallow(<JsonInput {...props} />);
			genericResetAndStubs();
			const instance = component.instance();
			promises.push(new Promise(resolve => resolve(instance.onFileUpload(event))));
			await Promise.all(promises);

			readLocalJsonFileStub.should.have.been.calledOnceWithExactly(event.target.files[0]);
			checkForAliasStub.should.not.have.been.called;
			cleanUpCertificatesStub.should.not.have.been.called;
			checkDefinitionStub.should.not.have.been.called;
			checkDataStub.should.have.been.calledOnceWithExactly([
				{
					name: 'myFile1',
					readError: {
						message: 'input_error_file_too_big',
						opts: {},
					},
				},
			]);
			updateJsonInputStateStub.should.have.been.calledOnceWithExactly(props.manualEntry, [
				{
					name: 'myFile1',
					readError: {
						message: 'input_error_file_too_big',
						opts: {},
					},
				},
			]);
		});

		it('should handle the json containing cluster information', async() => {
			jsonFile.json = [
				{
					cluster_id: 'cluster1',
					cluster_name: 'my cluster',
				},
			];
			readLocalJsonFileStub.returns(new Promise(resolve => resolve(jsonFile)));
			checkDefinitionStub.returns(jsonFile.json[0]);
			props.data = [];

			const component = shallow(<JsonInput {...props} />);
			genericResetAndStubs();
			const instance = component.instance();
			promises.push(new Promise(resolve => resolve(instance.onFileUpload(event))));
			await Promise.all(promises);

			readLocalJsonFileStub.should.have.been.calledOnceWithExactly(event.target.files[0]);
			checkForAliasStub.should.have.been.calledOnceWithExactly(jsonFile.json);
			cleanUpCertificatesStub.should.have.been.calledOnceWithExactly(jsonFile.json);
			checkDefinitionStub.should.have.been.calledOnceWithExactly(jsonFile.json[0]);
			checkDataStub.should.have.been.calledOnceWithExactly([
				{
					cluster_id: 'cluster1',
					cluster_name: 'my cluster',
					name: 'my cluster',
					raft: [{ cluster_id: 'cluster1', cluster_name: 'my cluster' }],
				},
			]);
			updateJsonInputStateStub.should.have.been.calledOnceWithExactly(props.manualEntry, [
				{
					cluster_id: 'cluster1',
					cluster_name: 'my cluster',
					name: 'my cluster',
					raft: [
						{
							cluster_id: 'cluster1',
							cluster_name: 'my cluster',
						},
					],
				},
			]);
		});

		it('should handle the json containing cluster information without a cluster name', async() => {
			jsonFile.json = [
				{
					cluster_id: 'cluster1',
				},
				{
					cluster_id: 'cluster1',
				},
			];
			readLocalJsonFileStub.returns(new Promise(resolve => resolve(jsonFile)));
			checkDefinitionStub.returns({ name: 'my cluster' });
			props.data = [];

			const component = shallow(<JsonInput {...props} />);
			genericResetAndStubs();
			const instance = component.instance();
			promises.push(new Promise(resolve => resolve(instance.onFileUpload(event))));
			await Promise.all(promises);

			readLocalJsonFileStub.should.have.been.calledOnceWithExactly(event.target.files[0]);
			checkForAliasStub.should.have.been.calledOnceWithExactly(jsonFile.json);
			cleanUpCertificatesStub.should.have.been.calledOnceWithExactly(jsonFile.json);
			checkDefinitionStub.should.have.been.calledTwice;
			checkDataStub.should.have.been.calledOnceWithExactly([
				{
					name: 'my cluster',
					raft: [
						{
							cluster_id: 'cluster1',
						},
						{
							cluster_id: 'cluster1',
						},
					],
				},
			]);
			updateJsonInputStateStub.should.have.been.calledOnceWithExactly(props.manualEntry, [
				{
					name: 'my cluster',
					raft: [
						{
							cluster_id: 'cluster1',
						},
						{
							cluster_id: 'cluster1',
						},
					],
				},
			]);
		});

		it('should handle the json containing clusters with the same cluster_id', async() => {
			jsonFile.json = [
				{
					cluster_id: 'cluster1',
					cluster_name: 'my cluster',
				},
				{
					cluster_id: 'cluster1',
					cluster_name: 'my other cluster',
				},
			];
			readLocalJsonFileStub.returns(new Promise(resolve => resolve(jsonFile)));
			checkDefinitionStub.returns(jsonFile.json[0]);
			props.data = [];

			const component = shallow(<JsonInput {...props} />);
			genericResetAndStubs();
			const instance = component.instance();
			promises.push(new Promise(resolve => resolve(instance.onFileUpload(event))));
			await Promise.all(promises);

			readLocalJsonFileStub.should.have.been.calledOnceWithExactly(event.target.files[0]);
			checkForAliasStub.should.have.been.calledOnceWithExactly(jsonFile.json);
			cleanUpCertificatesStub.should.have.been.calledOnceWithExactly(jsonFile.json);
			checkDefinitionStub.should.have.been.calledTwice;
			checkDataStub.should.have.been.calledOnceWithExactly([
				{
					cluster_id: 'cluster1',
					cluster_name: 'my cluster',
					name: 'my cluster',
					raft: [
						{
							cluster_id: 'cluster1',
							cluster_name: 'my cluster',
						},
						{
							cluster_id: 'cluster1',
							cluster_name: 'my other cluster',
						},
					],
				},
			]);
			updateJsonInputStateStub.should.have.been.calledOnceWithExactly(props.manualEntry, [
				{
					cluster_id: 'cluster1',
					cluster_name: 'my cluster',
					name: 'my cluster',
					raft: [
						{
							cluster_id: 'cluster1',
							cluster_name: 'my cluster',
						},
						{
							cluster_id: 'cluster1',
							cluster_name: 'my other cluster',
						},
					],
				},
			]);
		});

		it('should handle an error when the json contains cluster information', async() => {
			jsonFile.json = [
				{
					cluster_id: 'cluster1',
					cluster_name: 'my cluster',
				},
				{
					cluster_id: 'cluster1',
					cluster_name: 'my other cluster',
				},
			];
			readLocalJsonFileStub.returns(new Promise(resolve => resolve(jsonFile)));
			checkDefinitionStub.onSecondCall().returns({ error: 'code go boom' });
			props.data = [];

			const component = shallow(<JsonInput {...props} />);
			genericResetAndStubs();
			const instance = component.instance();
			promises.push(new Promise(resolve => resolve(instance.onFileUpload(event))));
			await Promise.all(promises);

			readLocalJsonFileStub.should.have.been.calledOnceWithExactly(event.target.files[0]);
			checkForAliasStub.should.have.been.calledOnceWithExactly(jsonFile.json);
			cleanUpCertificatesStub.should.have.been.calledOnceWithExactly(jsonFile.json);
			checkDefinitionStub.should.have.been.calledTwice;
			checkDataStub.should.have.been.calledOnceWithExactly([
				{
					error: 'code go boom',
					name: 'my cluster',
					raft: [
						{
							cluster_id: 'cluster1',
							cluster_name: 'my cluster',
						},
						{
							cluster_id: 'cluster1',
							cluster_name: 'my other cluster',
						},
					],
					some_field: 'flower field',
				},
			]);
			updateJsonInputStateStub.should.have.been.calledOnceWithExactly(props.manualEntry, [
				{
					error: 'code go boom',
					name: 'my cluster',
					raft: [
						{
							cluster_id: 'cluster1',
							cluster_name: 'my cluster',
						},
						{
							cluster_id: 'cluster1',
							cluster_name: 'my other cluster',
						},
					],
					some_field: 'flower field',
				},
			]);
		});

		it('should handle the json being an array', async() => {
			jsonFile.json = [{ some_field: 'rice field' }];
			readLocalJsonFileStub.returns(new Promise(resolve => resolve(jsonFile)));
			checkDefinitionStub.returns(jsonFile.json[0]);

			props.data = [];
			const component = shallow(<JsonInput {...props} />);
			genericResetAndStubs();
			const instance = component.instance();
			promises.push(new Promise(resolve => resolve(instance.onFileUpload(event))));
			await Promise.all(promises);

			readLocalJsonFileStub.should.have.been.calledOnceWithExactly(event.target.files[0]);
			checkForAliasStub.should.have.been.calledOnceWithExactly(jsonFile.json);
			cleanUpCertificatesStub.should.have.been.calledOnceWithExactly(jsonFile.json);
			checkDefinitionStub.should.have.been.calledOnceWithExactly(jsonFile.json[0]);
			checkDataStub.should.have.been.calledOnceWithExactly([{ some_field: 'rice field' }]);
			updateJsonInputStateStub.should.have.been.calledOnceWithExactly(props.manualEntry, [{ some_field: 'rice field' }]);
		});
	});

	describe('JsonInput - toggleManualEntry()', () => {
		it('should toggle manualEntry on receiving an event', async() => {
			const clearDataStub = mySandBox.stub(JsonInput.prototype, 'clearData');
			const event = {
				target: {
					value: 'some_event',
				},
			};
			const component = shallow(<JsonInput {...props} />);
			clearDataStub.resetHistory();
			component.instance().toggleManualEntry(event);
			clearDataStub.should.have.been.calledOnceWithExactly(!props.manualEntry);
		});
	});

	describe('JsonInput - onFormChange()', () => {
		it('should do nothing if there is no onChange function provided in props', async() => {
			delete props.onChange;
			const component = shallow(<JsonInput {...props} />);
			updateStateStub.resetHistory();
			component.instance().onFormChange({}, true);
			updateStateStub.should.not.have.been.called;
			onChangeStub.should.not.have.been.called;
		});

		it('should handle data provided in props', async() => {
			props.data = [{ some_field: 'rice field' }];
			const change = { some_field: 'flower field' };
			const component = shallow(<JsonInput {...props} />);
			updateStateStub.resetHistory();
			onChangeStub.resetHistory();
			component.instance().onFormChange(change, true);
			updateStateStub.should.have.been.calledOnceWithExactly(SCOPE, {
				testJsonInput: {
					data: [
						{
							some_field: 'flower field',
							error: null,
						},
					],
					manualEntry: true,
				},
			});
			onChangeStub.should.have.been.calledOnceWithExactly(
				[
					{
						some_field: 'flower field',
						error: null,
					},
				],
				true
			);
		});

		it('should handle no data in props', async() => {
			props.data = [];
			const change = { some_field: 'flower field' };
			const component = shallow(<JsonInput {...props} />);
			updateStateStub.resetHistory();
			onChangeStub.resetHistory();
			component.instance().onFormChange(change, true);
			updateStateStub.should.have.been.calledOnceWithExactly(SCOPE, {
				testJsonInput: {
					data: [
						{
							some_field: 'flower field',
							error: null,
						},
					],
					manualEntry: true,
				},
			});
			onChangeStub.should.have.been.calledOnceWithExactly(
				[
					{
						some_field: 'flower field',
						error: null,
					},
				],
				true
			);
		});

		it('should handle no changed data for the provided field', async() => {
			props.data = [{ some_field: 'rice field' }];
			const change = {};
			const component = shallow(<JsonInput {...props} />);
			updateStateStub.resetHistory();
			onChangeStub.resetHistory();
			component.instance().onFormChange(change, true);
			updateStateStub.should.have.been.calledOnceWithExactly(SCOPE, {
				testJsonInput: {
					data: [
						{
							some_field: 'rice field',
							error: null,
						},
					],
					manualEntry: true,
				},
			});
			onChangeStub.should.have.been.calledOnceWithExactly(
				[
					{
						some_field: 'rice field',
						error: null,
					},
				],
				true
			);
		});
	});

	describe('JsonInput - checkData()', () => {
		let checkDefinitionStub;

		beforeEach(() => {
			checkDefinitionStub = mySandBox.stub(JsonInput.prototype, 'checkDefinition').returns({ error: null });
		});

		it('should check that provided data is valid', async() => {
			const data = [{ name: 'alice' }];
			const component = shallow(<JsonInput {...props} />);
			updateStateStub.resetHistory();
			onChangeStub.resetHistory();

			component.instance().checkData(data);
			checkDefinitionStub.should.have.been.calledOnce;
			updateStateStub.should.not.have.been.called;
			onChangeStub.should.have.been.calledOnceWithExactly(data, true);
		});

		it('should handle data being empty', async() => {
			const data = [];
			const component = shallow(<JsonInput {...props} />);
			updateStateStub.resetHistory();
			onChangeStub.resetHistory();

			component.instance().checkData(data);
			checkDefinitionStub.should.not.have.been.called;
			updateStateStub.should.not.have.been.called;
			onChangeStub.should.have.been.calledOnceWithExactly(data, false);
		});

		it('should return with error if an object in the provided data has an error', async() => {
			const data = [
				{
					name: 'alice',
					error: 'code go boom',
				},
			];
			const component = shallow(<JsonInput {...props} />);
			updateStateStub.resetHistory();
			onChangeStub.resetHistory();

			component.instance().checkData(data);
			checkDefinitionStub.should.have.been.calledOnce;
			updateStateStub.should.have.been.calledOnceWithExactly(SCOPE, {
				testJsonInput: {
					data: [
						{
							error: null,
							name: 'alice',
						},
					],
					manualEntry: true,
				},
			});
			onChangeStub.should.have.been.calledOnceWithExactly(data, true);
		});

		it('should return with error if an object in the provided data has a readError', async() => {
			const data = [
				{
					name: 'alice',
					readError: 'code go boom',
				},
			];
			const component = shallow(<JsonInput {...props} />);
			updateStateStub.resetHistory();
			onChangeStub.resetHistory();

			component.instance().checkData(data);
			checkDefinitionStub.should.not.have.been.called;
			updateStateStub.should.not.have.been.called;
			onChangeStub.should.have.been.calledOnceWithExactly(data, false);
		});

		it('should return with error if the definition contains an error', async() => {
			checkDefinitionStub.returns({ error: 'code go boom' });
			const data = [{ name: 'alice' }];
			const component = shallow(<JsonInput {...props} />);
			updateStateStub.resetHistory();
			onChangeStub.resetHistory();

			component.instance().checkData(data);
			checkDefinitionStub.should.have.been.calledOnce;
			updateStateStub.should.have.been.calledOnceWithExactly(SCOPE, {
				testJsonInput: {
					data: [
						{
							error: 'code go boom',
							name: 'alice',
						},
					],
					manualEntry: true,
				},
			});
			onChangeStub.should.have.been.calledOnceWithExactly(data, false);
		});

		it('should return with error if the definition and the data both contain the same errors', async() => {
			checkDefinitionStub.returns({ error: 'code go boom' });
			const data = [{ name: 'alice', error: 'code go boom' }];
			const component = shallow(<JsonInput {...props} />);
			updateStateStub.resetHistory();
			onChangeStub.resetHistory();

			component.instance().checkData(data);
			checkDefinitionStub.should.have.been.calledOnce;
			updateStateStub.should.not.have.been.called;
			onChangeStub.should.have.been.calledOnceWithExactly(data, false);
		});

		it('should return with error if the definition and the data both contain different errors', async() => {
			checkDefinitionStub.returns({ error: 'code go boom' });
			const data = [{ name: 'alice', error: 'computer says no' }];
			const component = shallow(<JsonInput {...props} />);
			updateStateStub.resetHistory();
			onChangeStub.resetHistory();

			component.instance().checkData(data);
			checkDefinitionStub.should.have.been.calledOnce;
			updateStateStub.should.have.been.calledOnceWithExactly(SCOPE, {
				testJsonInput: {
					data: [
						{
							error: 'code go boom',
							name: 'alice',
						},
					],
					manualEntry: true,
				},
			});
			onChangeStub.should.have.been.calledOnceWithExactly(data, false);
		});

		it('should handle names not being unique if uniqueNames is true', async() => {
			delete props.singleInput;
			props.definition = [{ name: 'first_name' }, { name: 'last_name' }];
			const data = [{ name: 'alice' }, { name: 'alice' }];

			const component = shallow(<JsonInput {...props} />);
			updateStateStub.resetHistory();
			onChangeStub.resetHistory();

			component.instance().checkData(data);
			checkDefinitionStub.should.have.been.calledTwice;
			updateStateStub.should.not.have.been.called;
			onChangeStub.should.have.been.calledOnceWithExactly(data, false);
		});

		it('should do nothing if names are not unique but uniqueNames is false', async() => {
			delete props.singleInput;
			delete props.uniqueNames;
			props.definition = [{ name: 'first_name' }, { name: 'last_name' }];
			const data = [{ name: 'alice' }, { name: 'alice' }];

			const component = shallow(<JsonInput {...props} />);
			updateStateStub.resetHistory();
			onChangeStub.resetHistory();

			component.instance().checkData(data);
			checkDefinitionStub.should.have.been.calledTwice;
			updateStateStub.should.not.have.been.called;
			onChangeStub.should.have.been.calledOnceWithExactly(data, true);
		});

		it('should not update state if there should only be one input but several are provided', async() => {
			props.definition = [{ name: 'name' }];
			const data = [{ name: 'alice' }, { name: 'bob' }];

			const component = shallow(<JsonInput {...props} />);
			updateStateStub.resetHistory();
			onChangeStub.resetHistory();

			component.instance().checkData(data);
			checkDefinitionStub.should.have.been.calledTwice;
			updateStateStub.should.not.have.been.called;
			onChangeStub.should.have.been.calledOnceWithExactly(data, false);
		});

		it('should return with error if there should only be one input but there are multiple and they contain errors', async() => {
			checkDefinitionStub.returns({ error: 'code go boom' });
			props.definition = [{ name: 'name' }];
			const data = [{ name: 'alice' }, { name: 'bob' }];

			const component = shallow(<JsonInput {...props} />);
			updateStateStub.resetHistory();
			onChangeStub.resetHistory();

			component.instance().checkData(data);
			checkDefinitionStub.should.have.been.calledTwice;
			updateStateStub.should.have.been.calledOnceWithExactly(SCOPE, {
				testJsonInput: {
					data: [
						{
							name: 'alice',
							error: 'code go boom',
						},
						{
							name: 'bob',
							error: 'code go boom',
						},
					],
					manualEntry: true,
				},
			});
			onChangeStub.should.have.been.calledOnceWithExactly(data, false);
		});

		it('should not attempt to run onChange function if not provided in props', async() => {
			delete props.onChange;
			const data = [{ name: 'alice' }];
			const component = shallow(<JsonInput {...props} />);
			updateStateStub.resetHistory();
			onChangeStub.resetHistory();

			component.instance().checkData(data);
			checkDefinitionStub.should.have.been.calledOnce;
			updateStateStub.should.not.have.been.called;
			onChangeStub.should.not.have.been.called;
		});
	});

	describe('JsonInput - removeData()', () => {
		it('should remove a data entry', async() => {
			const checkDataStub = mySandBox.stub(JsonInput.prototype, 'checkData');
			props.data = [{ key: 'key1' }, { key: 'key2' }, { key: 'key3' }];

			const component = shallow(<JsonInput {...props} />);
			updateStateStub.resetHistory();
			component.instance().removeData('key2');
			props.data.should.deep.equal([{ key: 'key1' }, { key: 'key3' }]);
			updateStateStub.should.have.been.calledOnceWithExactly(SCOPE, {
				testJsonInput: {
					data: props.data,
					manualEntry: true,
				},
			});
			checkDataStub.should.have.been.calledOnce;
		});
	});

	describe('JsonInput - showErrorDetail()', () => {
		it('should render an error', async() => {
			const error = { message: 'code go boom' };
			const component = shallow(<JsonInput {...props} />);
			const errorJSX = shallow(component.instance().showErrorDetail(error, translateStub));
			errorJSX
				.find('div')
				.at(0)
				.hasClass('ibp-json-error-detail')
				.should.deep.equal(true);
			errorJSX
				.find('div')
				.at(0)
				.contains(error.message)
				.should.deep.equal(true);
		});

		it('should render nothing if no error', async() => {
			const error = null;
			const component = shallow(<JsonInput {...props} />);
			const errorJSX = component.instance().showErrorDetail(error, translateStub);
			should.not.exist(errorJSX);
		});
	});
});
