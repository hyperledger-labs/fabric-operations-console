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
import React from 'react';
import { mount, shallow } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { VisibilityToggle } from '../../../src/components/VisibilityToggle/VisibilityToggle';

chai.use(sinonChai);
const should = chai.should();

// Unable to test node.focus() - which are the 2 lines not covered
describe('VisibilityToggle component', () => {
	let mySandBox;
	let translateStub;
	let propsStub;

	beforeEach(async() => {
		mySandBox = sinon.createSandbox();
		translateStub = mySandBox.stub().callsFake(inputString => {
			return inputString;
		});

		propsStub = {
			idToToggle: 'exampleId',
			text: 'some text',
			hidden: 'some hidden content',

			translate: translateStub,
		};
	});

	afterEach(async() => {
		mySandBox.restore();
	});

	describe('VisibilityToggle - render()', () => {
		let isVisibleStub;

		beforeEach(async() => {
			isVisibleStub = mySandBox.stub(VisibilityToggle.prototype, 'isVisible').returns(true);
		});

		it('should shallow render with visible === true', () => {
			const component = shallow(<VisibilityToggle {...propsStub} />);
			component
				.find('button')
				.at(0)
				.hasClass('ibp-visibility-toggle')
				.should.equal(true);
		});

		it('should shallow render with visible === false', () => {
			isVisibleStub.returns(false);
			const component = shallow(<VisibilityToggle {...propsStub} />);
			component
				.find('button')
				.at(0)
				.hasClass('ibp-visibility-toggle')
				.should.equal(true);
		});
	});

	describe('VisibilityToggle - isVisible()', () => {
		let getElementByIdStub;
		let isVisibleSpy;
		let nodeStub;

		beforeEach(async() => {
			getElementByIdStub = mySandBox.stub(global.document, 'getElementById').returns();
			nodeStub = undefined;
		});

		function genericResetAndStubs(instance) {
			getElementByIdStub.resetHistory();
			isVisibleSpy = mySandBox.spy(instance, 'isVisible');
		}

		it('should return true if unable to retrieve element by id', () => {
			const component = mount(<VisibilityToggle {...propsStub} />);

			// Set stubs and spies
			const instance = component.instance();
			genericResetAndStubs(instance);

			// Run command of interest
			instance.isVisible();

			// Assertions
			getElementByIdStub.should.have.been.calledOnce;
			isVisibleSpy.should.have.been.calledOnce;
			isVisibleSpy.getCall(0).should.have.returned(true);
			component
				.find('button')
				.at(0)
				.hasClass('ibp-visibility-toggle')
				.should.equal(true);
		});

		it('should return false if element type is password', () => {
			const component = mount(<VisibilityToggle {...propsStub} />);

			// Set stubs and spies
			const instance = component.instance();
			genericResetAndStubs(instance);
			nodeStub = {
				type: 'password',
			};
			getElementByIdStub.returns(nodeStub);

			// Run command of interest
			instance.isVisible();

			// Assertions
			getElementByIdStub.should.have.been.calledOnce;
			isVisibleSpy.should.have.been.calledOnce;
			isVisibleSpy.getCall(0).should.have.returned(false);
			component
				.find('button')
				.at(0)
				.hasClass('ibp-visibility-toggle')
				.should.equal(true);
		});

		it('should return true if element type is text', () => {
			const component = mount(<VisibilityToggle {...propsStub} />);

			// Set stubs and spies
			const instance = component.instance();
			genericResetAndStubs(instance);
			nodeStub = {
				type: 'text',
			};
			getElementByIdStub.returns(nodeStub);

			// Run command of interest
			instance.isVisible();

			// Assertions
			getElementByIdStub.should.have.been.calledOnce;
			isVisibleSpy.should.have.been.calledOnce;
			isVisibleSpy.getCall(0).should.have.returned(true);
			component
				.find('button')
				.at(0)
				.hasClass('ibp-visibility-toggle')
				.should.equal(true);
		});

		it('should return false if element textContent equals props.hidden', () => {
			const component = mount(<VisibilityToggle {...propsStub} />);

			// Set stubs and spies
			const instance = component.instance();
			genericResetAndStubs(instance);
			nodeStub = {
				textContent: propsStub.hidden,
			};
			getElementByIdStub.returns(nodeStub);

			// Run command of interest
			instance.isVisible();

			// Assertions
			getElementByIdStub.should.have.been.calledOnce;
			isVisibleSpy.should.have.been.calledOnce;
			isVisibleSpy.getCall(0).should.have.returned(false);
			component
				.find('button')
				.at(0)
				.hasClass('ibp-visibility-toggle')
				.should.equal(true);
		});

		it('should return true if element textContent is different from props.hidden', () => {
			const component = mount(<VisibilityToggle {...propsStub} />);

			// Set stubs and spies
			const instance = component.instance();
			genericResetAndStubs(instance);
			nodeStub = {
				textContent: 'different text',
			};
			getElementByIdStub.returns(nodeStub);

			// Run command of interest
			instance.isVisible();

			// Assertions
			getElementByIdStub.should.have.been.calledOnce;
			isVisibleSpy.should.have.been.calledOnce;
			isVisibleSpy.getCall(0).should.have.returned(true);
			component
				.find('button')
				.at(0)
				.hasClass('ibp-visibility-toggle')
				.should.equal(true);
		});
	});

	describe('VisibilityToggle - toggle()', () => {
		let getElementByIdStub;
		let toggleSpy;
		let setStateStub;
		let setStateFake;
		let nodeStub;
		let stateStub;
		let removeChildStub;
		let appendChildStub;

		beforeEach(async() => {
			getElementByIdStub = mySandBox.stub(global.document, 'getElementById').returns();
			appendChildStub = mySandBox.stub(Node.prototype, 'appendChild').returns();
			removeChildStub = mySandBox.stub(Node.prototype, 'removeChild').callsFake(() => {
				if (nodeStub.firstChild) {
					nodeStub.firstChild = undefined;
				}
			});
			setStateFake = inputObj => {
				stateStub.visible = inputObj.visible;
			};

			nodeStub = undefined;
			stateStub = { visible: undefined };
		});

		function genericResetAndStubs(instance) {
			appendChildStub.resetHistory();
			removeChildStub.resetHistory();
			getElementByIdStub.resetHistory();
			toggleSpy = mySandBox.spy(instance, 'toggle');
			setStateStub = mySandBox.stub(instance, 'setState').callsFake(setStateFake);
		}

		it('should do nothing if it cannot get element by id', () => {
			const component = mount(<VisibilityToggle {...propsStub} />);

			// Set stubs and spies
			const instance = component.instance();
			genericResetAndStubs(instance);

			// Run command of interest
			instance.toggle();

			// Assertions
			toggleSpy.should.have.been.calledOnce;
			setStateStub.should.have.not.been.called;
			component
				.find('button')
				.at(0)
				.hasClass('ibp-visibility-toggle')
				.should.equal(true);
		});

		it('should toggle element type from password to text', () => {
			const component = mount(<VisibilityToggle {...propsStub} />);

			// Set stubs and spies
			const instance = component.instance();
			genericResetAndStubs(instance);
			nodeStub = {
				type: 'password',
			};
			getElementByIdStub.returns(nodeStub);

			// Run command of interest
			instance.toggle();

			// Assertions
			toggleSpy.should.have.been.calledOnce;
			setStateStub.should.have.been.called;
			nodeStub.type.should.deep.equal('text');
			stateStub.visible.should.equal(true);
			component
				.find('button')
				.at(0)
				.hasClass('ibp-visibility-toggle')
				.should.equal(true);
		});

		it('should toggle element type from text to password', () => {
			const component = mount(<VisibilityToggle {...propsStub} />);

			// Set stubs and spies
			const instance = component.instance();
			genericResetAndStubs(instance);
			nodeStub = {
				type: 'text',
			};
			getElementByIdStub.returns(nodeStub);

			// Run command of interest
			instance.toggle();

			// Assertions
			toggleSpy.should.have.been.calledOnce;
			setStateStub.should.have.been.called;
			nodeStub.type.should.deep.equal('password');
			stateStub.visible.should.equal(false);
			component
				.find('button')
				.at(0)
				.hasClass('ibp-visibility-toggle')
				.should.equal(true);
		});

		it('should handle element textContent equal to props.text and undefined firstChild', () => {
			const component = mount(<VisibilityToggle {...propsStub} />);

			// Set stubs and spies
			const instance = component.instance();
			genericResetAndStubs(instance);
			nodeStub = {
				textContent: propsStub.text,
				removeChild: removeChildStub,
				appendChild: appendChildStub,
			};
			getElementByIdStub.returns(nodeStub);

			// Run command of interest
			instance.toggle();

			// Assertions
			toggleSpy.should.have.been.calledOnce;
			removeChildStub.should.have.not.been.called;
			appendChildStub.should.have.been.called;
			setStateStub.should.have.been.called;
			stateStub.visible.should.equal(false);
			component
				.find('button')
				.at(0)
				.hasClass('ibp-visibility-toggle')
				.should.equal(true);
		});

		it('should handle element textContent equal to props.text and defined firstChild', () => {
			const component = mount(<VisibilityToggle {...propsStub} />);

			// Set stubs and spies
			const instance = component.instance();
			genericResetAndStubs(instance);
			nodeStub = {
				textContent: propsStub.text,
				firstChild: 'first child',
				removeChild: removeChildStub,
				appendChild: appendChildStub,
			};
			getElementByIdStub.returns(nodeStub);

			// Run command of interest
			instance.toggle();

			// Assertions
			toggleSpy.should.have.been.calledOnce;
			removeChildStub.should.have.been.called;
			appendChildStub.should.have.been.called;
			setStateStub.should.have.been.called;
			stateStub.visible.should.equal(false);
			component
				.find('button')
				.at(0)
				.hasClass('ibp-visibility-toggle')
				.should.equal(true);
		});

		it('should handle element textContent equal to props.hidden and undefined firstChild', () => {
			const component = mount(<VisibilityToggle {...propsStub} />);

			// Set stubs and spies
			const instance = component.instance();
			genericResetAndStubs(instance);
			nodeStub = {
				textContent: propsStub.hidden,
				removeChild: removeChildStub,
				appendChild: appendChildStub,
			};
			getElementByIdStub.returns(nodeStub);

			// Run command of interest
			instance.toggle();

			// Assertions
			toggleSpy.should.have.been.calledOnce;
			removeChildStub.should.have.not.been.called;
			appendChildStub.should.have.been.called;
			setStateStub.should.have.been.called;
			stateStub.visible.should.equal(true);
			component
				.find('button')
				.at(0)
				.hasClass('ibp-visibility-toggle')
				.should.equal(true);
		});

		it('should handle element textContent equal to props.hidden and defined firstChild', () => {
			const component = mount(<VisibilityToggle {...propsStub} />);

			// Set stubs and spies
			const instance = component.instance();
			genericResetAndStubs(instance);

			nodeStub = {
				textContent: propsStub.hidden,
				firstChild: 'first child',
				removeChild: removeChildStub,
				appendChild: appendChildStub,
			};
			getElementByIdStub.returns(nodeStub);

			// Run command of interest
			instance.toggle();

			// Assertions
			toggleSpy.should.have.been.calledOnce;
			removeChildStub.should.have.been.called;
			appendChildStub.should.have.been.called;
			setStateStub.should.have.been.called;
			stateStub.visible.should.equal(true);
			component
				.find('button')
				.at(0)
				.hasClass('ibp-visibility-toggle')
				.should.equal(true);
		});

		it('should handle element textContent different from props.hidden and props.text', () => {
			const component = mount(<VisibilityToggle {...propsStub} />);

			// Set stubs and spies
			const instance = component.instance();
			genericResetAndStubs(instance);
			nodeStub = {
				textContent: 'some different content',
			};
			getElementByIdStub.returns(nodeStub);

			// Run command of interest
			instance.toggle();

			// Assertions
			toggleSpy.should.have.been.calledOnce;
			removeChildStub.should.have.not.been.called;
			appendChildStub.should.have.not.been.called;
			setStateStub.should.have.not.been.called;
			should.equal(undefined, stateStub.visible);
			component
				.find('button')
				.at(0)
				.hasClass('ibp-visibility-toggle')
				.should.equal(true);
		});
	});
});
