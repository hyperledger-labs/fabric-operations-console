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
/* eslint-disable react/prop-types */
/* eslint-disable react/display-name */
import React from 'react';
import { mount } from 'enzyme';
import { act } from 'react-dom/test-utils';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
// this is the component we're testing - import it wrapped in curly braces to get the version not connected to the redux store
import { SidePanel } from '../../../src/components/SidePanel/SidePanel';
import FocusTrap from 'focus-trap-react';
chai.should();
chai.use(sinonChai);

describe('SidePanel component', () => {
	let mySandBox;
	let props;
	let buttons;
	let closedStub;
	let updateSidePanelStub;
	let refStub;

	beforeEach(() => {
		mySandBox = sinon.createSandbox();
		closedStub = mySandBox.stub();
		updateSidePanelStub = mySandBox.stub();
		refStub = mySandBox.stub();

		buttons = [
			{
				id: 'btn-1',
				text: 'button 1',
			},
			{
				id: 'btn-2',
				text: 'button 2',
			},
		];

		// initial props taken from MSPDetailsModal
		props = {
			id: 'my-side-panel',
			buttons,
			error: undefined,

			closed: closedStub,
			updateSidePanel: updateSidePanelStub,
			ref: refStub,
		};
	});

	afterEach(() => {
		mySandBox.restore();
	});

	describe('SidePanel - render()', () => {
		it('should apply opening transition style if isOpening === true', async() => {
			props.isOpening = true;
			const component = mount(<SidePanel {...props} />);
			component
				.find('.side__panel--outer--container')
				.hasClass('side__panel--transitioning--in')
				.should.equal(true);
		});

		it('should apply opening transition style if largePanel and isOpening === true', async() => {
			props.isOpening = true;
			props.largePanel = true;
			const component = mount(<SidePanel {...props} />);
			component
				.find('.side__panel--outer--container')
				.hasClass('side__panel--large--transitioning--in')
				.should.equal(true);
		});

		it('should apply opening transition style if verticalPanel and isOpening === true', async() => {
			props.isOpening = true;
			props.verticalPanel = true;
			const component = mount(<SidePanel {...props} />);
			component
				.find('.vertical__panel--outer--container')
				.hasClass('vertical__panel--transitioning--in')
				.should.equal(true);
		});

		it('should apply closing transition style if isClosing === true', async() => {
			props.isClosing = true;
			const component = mount(<SidePanel {...props} />);
			component
				.find('.side__panel--outer--container')
				.hasClass('side__panel--transitioning--out')
				.should.equal(true);
		});

		it('should apply closing transition style if largePanel and isClosing === true', async() => {
			props.isClosing = true;
			props.largePanel = true;
			const component = mount(<SidePanel {...props} />);
			component
				.find('.side__panel--outer--container')
				.hasClass('side__panel--large--transitioning--out')
				.should.equal(true);
		});

		it('should apply closing transition style if verticalPanel and isClosing === true', async() => {
			props.isClosing = true;
			props.verticalPanel = true;
			const component = mount(<SidePanel {...props} />);
			component
				.find('.vertical__panel--outer--container')
				.hasClass('vertical__panel--transitioning--out')
				.should.equal(true);
		});

		it('should apply large error style if largePanel and received an error', async() => {
			props.error = 'code go boom';
			props.largePanel = true;
			const component = mount(<SidePanel {...props} />);
			component
				.find('.side__panel--outer--container')
				.hasClass('ibp-large-panel-error')
				.should.equal(true);
		});

		it('should apply style if largePanel and submitting', async() => {
			props.submitting = true;
			props.largePanel = true;
			const component = mount(<SidePanel {...props} />);
			component
				.find('.ibp-side-panel-submitting-overlay')
				.at(0)
				.hasClass('ibp-large-side-panel-overlay')
				.should.deep.equal(true);
		});

		it('should apply style if verticalPanel and submitting', async() => {
			props.submitting = true;
			props.verticalPanel = true;
			const component = mount(<SidePanel {...props} />);
			component
				.find('.ibp-side-panel-submitting-overlay')
				.at(0)
				.hasClass('ibp-vertical-panel-overlay')
				.should.deep.equal(true);
		});

		it('should disable FocusTrap', async() => {
			props.disable_focus_trap = true;
			const component = mount(<SidePanel {...props} />);
			component
				.find(FocusTrap)
				.prop('active')
				.should.deep.equal(false);
		});

		it('should set zIndex on close button', async() => {
			const component = mount(<SidePanel {...props} />);
			component
				.find('.ibp-panel--close-icon-button')
				.at(0)
				.prop('style')
				.should.deep.equal({ zIndex: 6000 });
		});

		it('should set zIndex on close button to 0 if showRequests and toBeArchivedList are defined', async() => {
			props.showRequests = true;
			props.toBeArchivedList = ['listItem'];
			const component = mount(<SidePanel {...props} />);
			component
				.find('.ibp-panel--close-icon-button')
				.at(0)
				.prop('style')
				.should.deep.equal({ zIndex: 0 });
		});
	});

	describe('SidePanel - renderButtons()', () => {
		it('should render a side panel using provided button info', async() => {
			const component = mount(<SidePanel {...props} />);
			updateSidePanelStub.should.have.been.calledWith({ isOpening: true, rgbaVal: 0 });
			component
				.find('button')
				.at(1)
				.text()
				.should.deep.equal(buttons[0].text);
			component
				.find('button')
				.at(2)
				.text()
				.should.deep.equal(buttons[1].text);
		});

		it('should not render buttons if none are provided', async() => {
			delete props.buttons;
			const component = mount(<SidePanel {...props} />);
			component.find('.ibp-button-container').length.should.equal(0);
		});

		it('should render submit button', async() => {
			buttons[0].type = 'submit';
			props.buttons = buttons;
			props.submitting = true;
			const component = mount(<SidePanel {...props} />);
			updateSidePanelStub.should.have.been.calledWith({ isOpening: true, rgbaVal: 0 });
			component
				.find('button')
				.at(1)
				.text()
				.includes(buttons[0].text)
				.should.deep.equal(true);
			component
				.find('button')
				.at(1)
				.text()
				.includes('Active loading indicator')
				.should.deep.equal(true);
			component
				.find('button')
				.at(2)
				.text()
				.should.deep.equal(buttons[1].text);
			component
				.find('.ibp-side-panel-submitting-spinner')
				.at(0)
				.text()
				.includes('Active loading indicator')
				.should.deep.equal(true);
		});

		it('should render button with icon', async() => {
			buttons[1].icon = 'icon';
			props.butotns = buttons;
			const component = mount(<SidePanel {...props} />);
			component
				.find('button')
				.at(1)
				.text()
				.should.deep.equal(buttons[0].text);
			component
				.find('button')
				.at(2)
				.text()
				.includes(buttons[1].text)
				.should.deep.equal(true);
			component
				.find('button')
				.at(2)
				.text()
				.includes(buttons[1].icon)
				.should.deep.equal(true);
		});

		it('should apply largePanel style to button container', async() => {
			props.largePanel = true;
			const component = mount(<SidePanel {...props} />);
			component
				.find('.ibp-button-container')
				.at(0)
				.hasClass('ibp-large-panel-button-container')
				.should.equal(true);
		});

		it('should apply extraLargePanel style to button container', async() => {
			props.extraLargePanel = true;
			const component = mount(<SidePanel {...props} />);
			component
				.find('.ibp-button-container')
				.at(0)
				.hasClass('ibp-extra-large-panel-button-container')
				.should.equal(true);
		});

		it('should apply verticalPanel style to button container', async() => {
			props.verticalPanel = true;
			const component = mount(<SidePanel {...props} />);
			component
				.find('.ibp-button-container')
				.at(0)
				.hasClass('ibp-vertical-panel-button-container')
				.should.equal(true);
		});
	});

	describe('SidePanel - renderFooter()', () => {
		it('should render footer if provided', async() => {
			const footerString = 'I am a footer';
			props.footer = <h1>{footerString}</h1>;
			const component = mount(<SidePanel {...props} />);
			component
				.find('.ibp-panel-footer > h1')
				.at(0)
				.text()
				.should.deep.equal(footerString);
		});
	});

	describe('SidePanel - renderErrors()', () => {
		it('should render a provided error', async() => {
			const errorMsg = 'code go boom';
			props.error = errorMsg;
			const component = mount(<SidePanel {...props} />);
			const renderedErrors = component.instance().renderErrors();
			renderedErrors.props.error.should.deep.equal(errorMsg);
		});

		it('should render an array of errors', async() => {
			const errorMsg = 'code go boom';
			props.error = errorMsg; // renderErrors needs this.props.error to be defined otherwise it just returns out
			props.errors = [errorMsg, errorMsg];
			const component = mount(<SidePanel {...props} />);
			const renderedErrors = component.instance().renderErrors();
			const errorArray = renderedErrors.props.children;
			errorArray[0].props.error.should.deep.equal(errorMsg);
			errorArray[1].props.error.should.deep.equal(errorMsg);
		});
	});

	describe('SidePanel - openSidePanel()', () => {
		it('should update sidePanel to finish opening after allocated timeout', async() => {
			// using jest's fake timers to simulate the timeouts
			jest.useFakeTimers();
			mount(<SidePanel {...props} />);
			updateSidePanelStub.should.have.been.calledWith({ isOpening: true, rgbaVal: 0 });
			act(() => jest.runAllTimers());
			updateSidePanelStub.should.have.been.calledWith({ isOpening: false, rgbaVal: 0.5 });
		});

		it('should update large sidePanel to finish opening after allocated timeout', async() => {
			// using jest's fake timers to simulate the timeouts
			jest.useFakeTimers();
			props.largePanel = true;
			mount(<SidePanel {...props} />);
			updateSidePanelStub.should.have.been.calledWith({ isOpening: true, rgbaVal: 0 });
			act(() => jest.runAllTimers());
			updateSidePanelStub.should.have.been.calledWith({ isOpening: false, rgbaVal: 0.5 });
		});
	});

	describe('SidePanel - closeSidePanel()', () => {
		it('should update large sidePanel to finish closing after allocated timeout', async() => {
			// using jest's fake timers to simulate the timeouts
			jest.useFakeTimers();
			props.largePanel = true;
			const component = mount(<SidePanel {...props} />);
			component
				.find('button')
				.at(1)
				.simulate('click');
			updateSidePanelStub.should.have.been.calledWith({
				isClosing: true,
				rgbaVal: 0,
				needsToClose: false,
			});
			act(() => jest.runAllTimers());
			updateSidePanelStub.should.have.been.calledWith({ isClosing: false });
			closedStub.should.have.been.calledOnce;
		});

		it('should close after time out and not call closed function', async() => {
			// using jest's fake timers to simulate the timeouts
			jest.useFakeTimers();
			delete props.closed;
			const component = mount(<SidePanel {...props} />);
			component
				.find('button')
				.at(1)
				.simulate('click');
			updateSidePanelStub.should.have.been.calledWith({
				isClosing: true,
				rgbaVal: 0,
				needsToClose: false,
			});
			act(() => jest.runAllTimers());
			updateSidePanelStub.should.have.been.calledWith({ isClosing: false });
			closedStub.should.not.have.been.called;
		});

		it('should close panel when clicking elsewhere if this.props.clickAway === true', async() => {
			// using jest's fake timers to simulate the timeouts
			jest.useFakeTimers();
			props.clickAway = true;
			const component = mount(<SidePanel {...props} />);
			component
				.find('.ibp-panel--container')
				.at(0)
				.simulate('click');
			updateSidePanelStub.should.have.been.calledWith({
				isClosing: true,
				rgbaVal: 0,
				needsToClose: false,
			});
			act(() => jest.runAllTimers());
			updateSidePanelStub.should.have.been.calledWith({ isClosing: false });
			closedStub.should.have.been.calledOnce;
		});

		it('should write to local storage on close if diagramWizard passed in props', async() => {
			// using jest's fake timers to simulate the timeouts
			jest.useFakeTimers();
			const setItemStub = mySandBox.stub().resolves();
			Object.defineProperty(window, 'localStorage', {
				value: {
					setItem: setItemStub,
				},
				writable: true,
			});

			props.diagramWizard = true; // It's hard to tell in the code what type diagramWizard should be, I *think* it's a boolean

			const component = mount(<SidePanel {...props} />);
			component
				.find('button')
				.at(1)
				.simulate('click');
			updateSidePanelStub.should.have.been.calledWith({
				isClosing: true,
				rgbaVal: 0,
				needsToClose: false,
			});
			setItemStub.should.have.been.calledOnceWithExactly('showDiagram', 'false');
			act(() => jest.runAllTimers());
			updateSidePanelStub.should.have.been.calledWith({ isClosing: false });
			closedStub.should.have.been.calledOnce;
		});
	});

	describe('SidePanel - button onClick', () => {
		it('should run button\'s onClick function', async() => {
			const onClickStub = mySandBox.stub();
			buttons[0].onClick = onClickStub;
			props.buttons = buttons;
			const component = mount(<SidePanel {...props} />);
			component
				.find('button')
				.at(1)
				.simulate('click');
			onClickStub.should.have.been.calledOnce;
		});

		it('should close side panel when button is clicked if no onClick handler provided', async() => {
			// using jest's fake timers to simulate the timeouts
			jest.useFakeTimers();
			const component = mount(<SidePanel {...props} />);
			component
				.find('button')
				.at(1)
				.simulate('click');
			updateSidePanelStub.should.have.been.calledWith({
				isClosing: true,
				rgbaVal: 0,
				needsToClose: false,
			});
			act(() => jest.runAllTimers());
			updateSidePanelStub.should.have.been.calledWith({ isClosing: false });
			closedStub.should.have.been.calledOnce;
		});
	});

	describe('SidePanel = componentWillUnmount()', () => {
		it('should reset overflow style to \'auto\' on unmount', async() => {
			const component = mount(<SidePanel {...props} />);
			component.unmount();
			const body = document.querySelector('body');
			body.style.overflow.should.deep.equal('auto');
		});
	});
});
