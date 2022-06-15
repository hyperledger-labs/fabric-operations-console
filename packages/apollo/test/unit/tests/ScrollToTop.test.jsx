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
import { mount } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { ScrollToTop } from '../../../src/components/ScrollToTop/ScrollToTop';
chai.should();
chai.use(sinonChai);

describe('ScrollToTop component', () => {
	let mySandBox;
	let windowScrollToStub;
	let propsStub;
	let prevPropsStub;

	beforeEach(async() => {
		mySandBox = sinon.createSandbox();
		windowScrollToStub = mySandBox.stub(global.window, 'scrollTo').resolves();

		propsStub = {
			location: { x: 'x', y: 'y' },
			children: [],
		};

		prevPropsStub = {
			location: { x: 'x2', y: 'y2' },
			children: [],
		};
	});
	afterEach(async() => {
		mySandBox.restore();
	});

	it('should scroll to top if prevprops location is different', () => {
		const component = mount(<ScrollToTop {...prevPropsStub} />);
		component.setProps(propsStub);
		windowScrollToStub.should.have.been.calledOnce;
	});

	it('should not scroll to top if prevprops location is the same', () => {
		const component = mount(<ScrollToTop {...prevPropsStub} />);
		component.setProps(prevPropsStub);
		windowScrollToStub.should.have.not.been.called;
	});
});
