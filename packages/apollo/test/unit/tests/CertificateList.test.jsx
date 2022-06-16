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
import CertificateList from '../../../src/components/CertificateList/CertificateList';

chai.should();
chai.use(sinonChai);
const should = chai.should();

describe('CertificateList component', () => {
	let mySandBox;
	let props;
	let certs = ['cert1', 'cert2'];

	beforeEach(() => {
		mySandBox = sinon.createSandbox();
		// initial props
		props = {
			certs,
		};
		window.stitch = {
			parseCertificate: cert => {
				return {
					not_after_ts: new Date().getTime() + 10000,
					serial_number_hex: '0123456789',
				};
			},
		};
	});

	afterEach(() => {
		mySandBox.restore();
	});

	describe('CertificateList - render', () => {
		it('should render', async() => {
			props.details = {
				...certs,
			};
			const component = mount(<CertificateList {...props} />);
			component.find('.ibp-certificate-list').should.have.lengthOf(1);
			component.find('.ibp-certificate-details').should.have.lengthOf(2);
		});
	});
});
