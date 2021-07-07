/*
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
import { BrowserRouter as Router } from 'react-router-dom';
import { NotFound } from '../../../src/components/NotFound/NotFound';
chai.should();
chai.use(sinonChai);

describe('NotFound component', () => {
	let mySandBox;
	let props;

	beforeEach(async() => {
		mySandBox = sinon.createSandbox();
		props = {
			platform: 'ibmcloud',
			docPrefix: 'prefix',
			translate: mySandBox.stub(),
		};
	});

	afterEach(async() => {
		mySandBox.restore();
	});

	it('should return IBM mysupport link if platform is other than ibmcloud ', () => {
		props.platform = 'other';
		// NotFound uses a Link which needs to be wrapped in a Router
		const component = mount(
			<Router>
				<NotFound {...props} />
			</Router>
		);
		component
			.find('a')
			.filterWhere(item => {
				return item.prop('href') === 'https://www.ibm.com/mysupport';
			})
			.should.have.lengthOf(1);
	});

	it('should return IBM cloud support link if platform is ibmcloud ', () => {
		// NotFound uses a Link which needs to be wrapped in a Router
		const component = mount(
			<Router>
				<NotFound {...props} />
			</Router>
		);
		component
			.find('a')
			.filterWhere(item => {
				return item.prop('href') === 'https://cloud.ibm.com/unifiedsupport/supportcenter';
			})
			.should.have.lengthOf(1);
	});

	it('should open 404 error page ', () => {
		const windowOpenStub = mySandBox.stub(window, 'open');
		// NotFound uses a Link which needs to be wrapped in a Router
		const component = mount(
			<Router>
				<NotFound {...props} />
			</Router>
		);
		component
			.find('button')
			.filterWhere(item => {
				return item.props('onClick');
			})
			.simulate('click');
		sinon.assert.callCount(props.translate, 7);
		windowOpenStub.should.have.been.calledOnce;
	});
});
