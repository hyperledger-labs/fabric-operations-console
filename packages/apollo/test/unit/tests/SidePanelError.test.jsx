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
import _ from 'lodash';
import React from 'react';
import { mount } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Helper from '../../../src/utils/helper';
import { SidePanelError } from '../../../src/components/SidePanelError/SidePanelError';

chai.use(sinonChai);
const should = chai.should();

describe('SidePanelError component', () => {
	let mySandBox;
	let translateStub;
	let stateStub;
	let propsStub;
	let formatErrorDetailsStub;

	beforeEach(async() => {
		mySandBox = sinon.createSandbox();
		formatErrorDetailsStub = mySandBox.stub(Helper, 'formatErrorDetails').returns('some details');
		translateStub = mySandBox.stub().callsFake((inputString, options) => {
			return inputString;
		});

		stateStub = {
			showDetails: false,
		};

		propsStub = {
			error: new Error('some error'),

			translate: translateStub,
		};
	});

	afterEach(async() => {
		mySandBox.restore();
	});

	describe('SidePanelError - render()', () => {
		let getErrorTitleStub;
		let getSubtitleStub;

		beforeEach(async() => {
			getErrorTitleStub = mySandBox.stub(SidePanelError.prototype, 'getErrorTitle').returns('title');
			getSubtitleStub = mySandBox.stub(SidePanelError.prototype, 'getSubtitle').returns('subtitle');
		});

		it('should render button when props.error defined and this.showDetails undefined', () => {
			const component = mount(<SidePanelError {...propsStub} />);

			// Assertions
			component
				.find('div')
				.at(0)
				.hasClass('ibp-side-panel-error')
				.should.equal(true);

			component
				.find('button')
				.hasClass('ibp-link')
				.should.equal(true);

			component
				.find('button')
				.contains('show_details')
				.should.equal(true);

			getErrorTitleStub.should.have.been.calledOnce;
			getSubtitleStub.should.have.been.calledOnce;
			translateStub.should.have.been.calledOnce;
		});

		it('should render empty div when there is no props.error', () => {
			propsStub.error = undefined;
			const component = mount(<SidePanelError {...propsStub} />);

			// Assertions
			component
				.find('div')
				.at(0)
				.hasClass('ibp-side-panel-error')
				.should.equal(false);

			getErrorTitleStub.should.have.not.been.called;
			getSubtitleStub.should.have.not.been.called;
			translateStub.should.have.not.been.called;
		});

		it('should render button when props.error.details defined and this.showDetails undefined', () => {
			propsStub.error.details = 'details';
			const component = mount(<SidePanelError {...propsStub} />);

			// Assertions
			component
				.find('div')
				.at(0)
				.hasClass('ibp-side-panel-error')
				.should.equal(true);

			component
				.find('button')
				.hasClass('ibp-link')
				.should.equal(true);

			component
				.find('button')
				.contains('show_details')
				.should.equal(true);

			getErrorTitleStub.should.have.been.calledOnce;
			getSubtitleStub.should.have.been.calledOnce;
			translateStub.should.have.been.calledOnce;
		});

		it('should render button when details defined and this.showDetails true', () => {
			const component = mount(<SidePanelError {...propsStub} />);

			// Force render after modifying showDetails
			component.instance().showDetails = true;
			component.setProps(propsStub);

			// Assertions
			component
				.find('div')
				.at(0)
				.hasClass('ibp-side-panel-error')
				.should.equal(true);

			component
				.find('button')
				.hasClass('ibp-link')
				.should.equal(true);

			component
				.find('button')
				.contains('hide_details')
				.should.equal(true);

			getErrorTitleStub.should.have.been.calledTwice;
			getSubtitleStub.should.have.been.calledTwice;
			translateStub.should.have.been.calledTwice;
		});

		it('should not render button when there are no details', () => {
			formatErrorDetailsStub.returns();
			const component = mount(<SidePanelError {...propsStub} />);

			// Assertions
			component
				.find('div')
				.at(0)
				.hasClass('ibp-side-panel-error')
				.should.equal(true);

			component
				.find('button')
				.exists()
				.should.equal(false);

			getErrorTitleStub.should.have.been.calledOnce;
			getSubtitleStub.should.have.been.calledOnce;
			translateStub.should.have.not.been.called;
		});
	});

	describe('SidePanelError - button onclick()', () => {
		it('should toggle showDetails on click', () => {
			const component = mount(<SidePanelError {...propsStub} />);

			// Run command of interest
			component.find('button').simulate('click');

			// Assertions
			component.instance().showDetails.should.equal(true);
			component
				.find('button')
				.contains('hide_details')
				.should.equal(true);
		});
	});

	describe('SidePanelError - getErrorTitle()', () => {
		let isStringStub;
		let stringifyStub;
		let getErrorTitleSpy;

		beforeEach(async() => {
			isStringStub = mySandBox.stub(_, 'isString').returns(false);
			stringifyStub = mySandBox.stub(JSON, 'stringify').returns('stringified error');
		});

		function genericResetAndStubs(instance) {
			isStringStub.resetHistory();
			stringifyStub.resetHistory();
			translateStub.resetHistory();
			getErrorTitleSpy = mySandBox.spy(instance, 'getErrorTitle');
		}

		it('should use error.translation if defined', () => {
			const component = mount(<SidePanelError {...propsStub} />);

			// Set stubs and spies
			const instance = component.instance();
			genericResetAndStubs(instance);
			propsStub.error.translation = {
				title: 'some title',
				params: [],
			};

			// Run command of interest
			const result = instance.getErrorTitle(propsStub.translate);

			// Assertions
			getErrorTitleSpy.should.have.been.called;
			result.should.deep.equal(propsStub.error.translation.title);
			translateStub.should.have.been.calledOnceWithExactly(propsStub.error.translation.title, propsStub.error.translation.params);
			isStringStub.should.have.not.been.called;
			stringifyStub.should.have.not.been.called;
		});

		it('should use error.translation if defined without title', () => {
			const component = mount(<SidePanelError {...propsStub} />);

			// Set stubs and spies
			const instance = component.instance();
			genericResetAndStubs(instance);
			propsStub.error.translation = {};

			// Run command of interest
			const result = instance.getErrorTitle(propsStub.translate);

			// Assertions
			getErrorTitleSpy.should.have.been.called;
			result.should.deep.equal('error_unexpected');
			translateStub.should.have.been.calledOnceWithExactly('error_unexpected');
			isStringStub.should.have.not.been.called;
			stringifyStub.should.have.not.been.called;
		});

		it('should return error if it is a string', () => {
			const propsStubStringError = {
				error: 'error string',
				translate: translateStub,
			};
			const component = mount(<SidePanelError {...propsStubStringError} />);

			// Set stubs and spies
			const instance = component.instance();
			genericResetAndStubs(instance);
			isStringStub.returns(true);

			// Run command of interest
			const result = instance.getErrorTitle(propsStubStringError.translate);

			// Assertions
			getErrorTitleSpy.should.have.been.called;
			result.should.deep.equal('error string');
			translateStub.should.have.not.been.called;
			isStringStub.should.have.been.calledOnce;
			stringifyStub.should.have.not.been.called;
		});

		it('should use error.title if defined', () => {
			const component = mount(<SidePanelError {...propsStub} />);

			// Set stubs and spies
			const instance = component.instance();
			genericResetAndStubs(instance);
			propsStub.error.title = 'some title';
			propsStub.error.translateOptions = [];

			// Run command of interest
			const result = instance.getErrorTitle(propsStub.translate);

			// Assertions
			getErrorTitleSpy.should.have.been.called;
			result.should.deep.equal(propsStub.error.title);
			translateStub.should.have.been.calledOnceWithExactly(propsStub.error.title, propsStub.error.translateOptions);
			isStringStub.should.have.been.calledOnce;
			stringifyStub.should.have.not.been.called;
		});

		it('should stringify error when unable to do anything else', () => {
			const propsStubStringError = {
				error: 1,
				translate: translateStub,
			};
			const component = mount(<SidePanelError {...propsStubStringError} />);

			// Set stubs and spies
			const instance = component.instance();
			genericResetAndStubs(instance);

			// Run command of interest
			const result = instance.getErrorTitle(propsStubStringError.translate);

			// Assertions
			getErrorTitleSpy.should.have.been.called;
			result.should.deep.equal('stringified error');
			translateStub.should.have.not.been.called;
			isStringStub.should.have.been.calledOnce;
			stringifyStub.should.have.been.calledOnceWithExactly(1);
		});
	});

	describe('SidePanelError - getErrorTitle()', () => {
		let getSubtitleSpy;

		it('should return undefined if error.translation.message is undefined', () => {
			const component = mount(<SidePanelError {...propsStub} />);

			// Set stubs and spies
			const instance = component.instance();
			getSubtitleSpy = mySandBox.spy(instance, 'getSubtitle');

			// Run command of interest
			const result = instance.getSubtitle(propsStub.translate);

			// Assertions
			getSubtitleSpy.should.have.been.called;
			should.equal(undefined, result);
		});

		it('should return error.translation.message if defined', () => {
			const component = mount(<SidePanelError {...propsStub} />);

			// Set stubs and spies
			const instance = component.instance();
			getSubtitleSpy = mySandBox.spy(instance, 'getSubtitle');
			propsStub.error.translation = {
				message: 'some message',
				params: [],
			};

			// Run command of interest
			const result = instance.getSubtitle(propsStub.translate);

			// Assertions
			getSubtitleSpy.should.have.been.called;
			result.should.deep.equal(propsStub.error.translation.message);
		});
	});
});
