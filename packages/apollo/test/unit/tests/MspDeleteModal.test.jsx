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
import { shallow } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Logger from '../../../src/components/Log/Logger';
import { OrdererRestApi } from '../../../src/rest/OrdererRestApi';
// this is the component we're testing - import it wrapped in curly braces to get the version not connected to the redux store
import { MspDeleteModal } from '../../../src/components/MspDeleteModal/MspDeleteModal';

chai.should();
chai.use(sinonChai);
const should = chai.should();

jest.mock('../../../src/components/SidePanel/SidePanel');

jest.mock('../../../src/components/Form/Form', () => {
	return {
		__esModule: true,
		default: () => {
			return <></>;
		},
	};
});

describe('MspDeleteModal component', () => {
	const SCOPE = 'mspDeleteModal';
	let mySandBox;
	let props;
	let closeDeleteMSPModalStub;
	let onCloseMSPModalStub;
	let logErrorStub;
	let deleteMSPStub;
	let translateStub;
	let updateStateStub;
	let componentDidMountSpy;

	beforeEach(() => {
		mySandBox = sinon.createSandbox();
		closeDeleteMSPModalStub = mySandBox.stub();
		onCloseMSPModalStub = mySandBox.stub();
		logErrorStub = mySandBox.stub(Logger.prototype, 'error');
		deleteMSPStub = mySandBox.stub(OrdererRestApi, 'deleteMSP');
		updateStateStub = mySandBox.stub().callsFake((scope, obj) => {
			scope.should.deep.equal(SCOPE);
			props.disableRemove = obj.disableRemove;
			props.submitting = obj.submitting;
			props.error = obj.error;
		});

		componentDidMountSpy = mySandBox.spy(MspDeleteModal.prototype, 'componentDidMount');
		translateStub = mySandBox.stub().callsFake(inputString => {
			return inputString;
		});

		// initial props taken from OrdererAdmin
		props = {
			ordererId: 'ordererId',
			configtxlator_url: 'configtxlator_url',
			selectedMember: {
				name: 'name',
				msp_id: 'msp_id',
			},
			ordererAdmin: true,
			onClose: closeDeleteMSPModalStub,
			onComplete: onCloseMSPModalStub,

			updateState: updateStateStub,
			translate: translateStub,
		};
	});

	afterEach(() => {
		mySandBox.restore();
	});

	describe('MspDeleteModal - render()', () => {
		it('should render', async() => {
			const renderRemoveStub = mySandBox.stub(MspDeleteModal.prototype, 'renderRemove');
			shallow(<MspDeleteModal {...props} />);
			updateStateStub.should.have.been.calledOnceWithExactly(SCOPE, {
				disableRemove: true,
				submitting: false,
				error: null,
			});
			props.disableRemove.should.equal(true);
			props.submitting.should.equal(false);
			should.equal(null, props.error);
			renderRemoveStub.should.have.been.calledOnce;
			componentDidMountSpy.should.have.been.calledOnce;
		});
	});

	describe('MspDeleteModal - removeMsp()', () => {
		let removeMspSpy;

		function genericResetAndStubs(instance) {
			componentDidMountSpy.resetHistory();
			updateStateStub.resetHistory();
			translateStub.resetHistory();
			closeDeleteMSPModalStub.resetHistory(),
			onCloseMSPModalStub.resetHistory(),
			logErrorStub.resetHistory(),
			(removeMspSpy = mySandBox.spy(instance, 'removeMsp'));
		}

		it('should complete and close if deleteMSP successful', async() => {
			const component = shallow(<MspDeleteModal {...props} />);
			const instance = component.instance();
			genericResetAndStubs(instance);
			deleteMSPStub.resolves();

			instance.removeMsp();
			await Promise.all([deleteMSPStub]);

			removeMspSpy.should.have.been.called;
			deleteMSPStub.should.have.been.calledOnceWithExactly({
				ordererId: props.ordererId,
				configtxlator_url: props.configtxlator_url,
				type: 'ordererAdmin',
				operation: 'delete',
				payload: {
					msp_id: props.selectedMember.msp_id,
				},
			});
			closeDeleteMSPModalStub.should.have.been.calledOnce;
			onCloseMSPModalStub.should.have.been.calledOnce;
			componentDidMountSpy.should.have.not.been.called;
			updateStateStub.should.have.been.calledOnce;
		});

		it('should error with error_delete_msps_policy when deleteMSP fails with error stitch_msg containing \'required 1 remaining\'', async() => {
			const component = shallow(<MspDeleteModal {...props} />);
			const instance = component.instance();
			genericResetAndStubs(instance);
			const error = new Error('some error');
			error.stitch_msg = 'required 1 remaining';
			deleteMSPStub.rejects(error);

			instance.removeMsp();
			await Promise.all([deleteMSPStub]);

			removeMspSpy.should.have.been.called;
			deleteMSPStub.should.have.been.calledOnceWithExactly({
				ordererId: props.ordererId,
				configtxlator_url: props.configtxlator_url,
				type: 'ordererAdmin',
				operation: 'delete',
				payload: {
					msp_id: props.selectedMember.msp_id,
				},
			});
			props.error.should.deep.equal({
				title: 'error_delete_msps_policy',
				translateOptions: {
					msp_id: props.selectedMember.name,
				},
				details: error,
			});
			closeDeleteMSPModalStub.should.have.not.been.called;
			onCloseMSPModalStub.should.have.not.been.called;
			logErrorStub.should.have.been.calledWith(error);
			props.submitting.should.equal(false);
			componentDidMountSpy.should.have.not.been.called;
			updateStateStub.should.have.been.calledTwice;
		});

		it('should error with error_delete_msps in all other cases of deleteMSP failure', async() => {
			const component = shallow(<MspDeleteModal {...props} />);
			const instance = component.instance();
			genericResetAndStubs(instance);
			const error = new Error('some error');
			deleteMSPStub.rejects(error);

			instance.removeMsp();
			await Promise.all([deleteMSPStub]);

			removeMspSpy.should.have.been.called;
			deleteMSPStub.should.have.been.calledOnceWithExactly({
				ordererId: props.ordererId,
				configtxlator_url: props.configtxlator_url,
				type: 'ordererAdmin',
				operation: 'delete',
				payload: {
					msp_id: props.selectedMember.msp_id,
				},
			});
			props.error.should.deep.equal({
				title: 'error_delete_msps',
				translateOptions: {
					msp_id: props.selectedMember.name,
				},
				details: error,
			});
			closeDeleteMSPModalStub.should.have.not.been.called;
			onCloseMSPModalStub.should.have.not.been.called;
			logErrorStub.should.have.been.calledWith(error);
			props.submitting.should.equal(false);
			componentDidMountSpy.should.have.not.been.called;
			updateStateStub.should.have.been.calledTwice;
		});
	});

	describe('MspDeleteModal - renderRemove()', () => {
		let renderRemoveSpy;

		beforeEach(() => {
			renderRemoveSpy = mySandBox.spy(MspDeleteModal.prototype, 'renderRemove');
		});

		it('should call renderRemove with remove_adminmsp_from_orderer', async() => {
			const component = shallow(<MspDeleteModal {...props} />);

			updateStateStub.should.have.been.calledOnceWithExactly(SCOPE, {
				disableRemove: true,
				submitting: false,
				error: null,
			});
			component
				.find('h1')
				.at(0)
				.text()
				.should.deep.equal('remove_adminmsp_from_orderer');
			component
				.find('.ibp-remove-msp-desc')
				.at(0)
				.text()
				.should.deep.equal('remove_adminmsp_from_orderer_desc');
			component
				.find('.ibp-remove-msp-confirm')
				.at(0)
				.text()
				.should.deep.equal('remove_msp_confirm');
			props.disableRemove.should.equal(true);
			props.submitting.should.equal(false);
			should.equal(null, props.error);
			renderRemoveSpy.should.have.been.calledOnce;
			componentDidMountSpy.should.have.been.calledOnce;
		});

		it('should call renderRemove with remove_msp_from_consortium', async() => {
			props.ordererAdmin = false;
			const component = shallow(<MspDeleteModal {...props} />);

			updateStateStub.should.have.been.calledOnceWithExactly(SCOPE, {
				disableRemove: true,
				submitting: false,
				error: null,
			});
			component
				.find('h1')
				.at(0)
				.text()
				.should.deep.equal('remove_msp_from_consortium');
			component
				.find('.ibp-remove-msp-desc')
				.at(0)
				.text()
				.should.deep.equal('remove_msp_from_consortium_desc');
			component
				.find('.ibp-remove-msp-confirm')
				.at(0)
				.text()
				.should.deep.equal('remove_msp_confirm');
			props.disableRemove.should.equal(true);
			props.submitting.should.equal(false);
			should.equal(null, props.error);
			renderRemoveSpy.should.have.been.calledOnce;
			componentDidMountSpy.should.have.been.calledOnce;
		});
	});
});
