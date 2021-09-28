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

/* eslint-disable react/display-name */
import React from 'react';
import { mount } from 'enzyme';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Logger from '../../../src/components/Log/Logger';
import ChannelApi from '../../../src/rest/ChannelApi';
import { OrdererRestApi } from '../../../src/rest/OrdererRestApi';
// this is the component we're testing - import it wrapped in curly braces to get the version not connected to the redux store
import { AddAnchorPeerModal } from '../../../src/components/AddAnchorPeerModal/AddAnchorPeerModal';

chai.should();
chai.use(sinonChai);
const should = chai.should();

jest.mock('../../../src/components/SidePanel/SidePanel', () => ({ children }) => <>{children}</>);

jest.mock('../../../src/components/Form/Form', () => ({ id, fields }) => (
	<>
		{fields.map(field => (
			<div key={field.name}
				id={id + '-' + field.name}
			/>
		))}
	</>
));

jest.mock('../../../src/components/FocusComponent/FocusComponent', () => ({ children }) => <>{children}</>);

describe('AddAnchorPeerModal component', () => {
	const SCOPE = 'addAnchorPeerModal';
	let mySandBox;
	let props;
	let peers = [{ id: 'peer1' }, { id: 'peer2' }];
	let orderers = [
		{
			id: 'orderer1',
			raft: [{ id: 'orderer1_1' }, { id: 'orderer1_2' }],
		},
		{
			id: 'orderer2',
			raft: [{ id: 'orderer2_1' }, { id: 'orderer2_2' }],
		},
	];
	// callbacks
	let onCloseStub;
	let onCompleteStub;
	// Logger
	let logErrorStub;
	let logDebugStub;
	// ChannelApi
	let addChannelAnchorPeersStub;
	// OrdererRestApi
	let getOrderersStub;
	// Translate
	let translateStub;
	// commonActions
	let updateStateStub;

	beforeEach(() => {
		mySandBox = sinon.createSandbox();
		onCloseStub = mySandBox.stub();
		onCompleteStub = mySandBox.stub();
		logErrorStub = mySandBox.stub(Logger.prototype, 'error');
		logDebugStub = mySandBox.stub(Logger.prototype, 'debug');
		addChannelAnchorPeersStub = mySandBox.stub(ChannelApi, 'addChannelAnchorPeers').callsFake(() => {
			return Promise.resolve();
		});
		getOrderersStub = mySandBox.stub(OrdererRestApi, 'getOrderers').callsFake(() => {
			return Promise.resolve();
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
			onClose: onCloseStub,
			onComplete: onCompleteStub,
			channelId: 'channelId',
			orderers,
			peers,
			orderer: orderers[0],
			consenters: [],
			updateState: updateStateStub,
			translate: translateStub,
		};
	});

	afterEach(() => {
		mySandBox.restore();
	});

	describe('AddAnchorPeerModal - render with orderer', () => {
		it('should render', async() => {
			const component = mount(<AddAnchorPeerModal {...props} />);
			updateStateStub.should.have.been.calledWithExactly(SCOPE, {
				selectedOrderer: orderers[0],
				selectedPeers: null,
			});
			component
				.find('.ibp-anchor-peer-desc')
				.at(0)
				.text()
				.should.deep.equal('add_anchor_peer_desc');
			component.find('#' + SCOPE + '-peer-selectedOrderer').should.have.lengthOf(0);
			component.find('#' + SCOPE + '-peer-selectedPeers').should.have.lengthOf(1);
		});
	});

	describe('AddAnchorPeerModal - render without orderer', () => {
		it('should render', async() => {
			props.orderer = undefined;
			const component = mount(<AddAnchorPeerModal {...props} />);
			component.find('#' + SCOPE + '-peer-selectedOrderer').should.have.lengthOf(1);
			component.find('#' + SCOPE + '-peer-selectedPeers').should.have.lengthOf(1);
		});
	});
});
