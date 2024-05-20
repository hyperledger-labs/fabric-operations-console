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
import ChannelApi from '../../../src/rest/ChannelApi';
import IdentityApi from '../../../src/rest/IdentityApi';
import Helper from '../../../src/utils/helper';
import MspHelper from '../../../src/utils/msp';
import { MspRestApi } from '../../../src/rest/MspRestApi';
import { PeerRestApi } from '../../../src/rest/PeerRestApi';
import StitchApi from '../../../src/rest/StitchApi';
import Logger from '../../../src/components/Log/Logger';
// this is the component we're testing - import it wrapped in curly braces to get the version not connected to the redux store
import { ChaincodeModal } from '../../../src/components/ChaincodeModal/ChaincodeModal';

chai.should();
chai.use(sinonChai);
const should = chai.should();

jest.mock('../../../src/components/Form/Form', () => ({ id, fields }) => (
	<>
		{fields.map(field => (
			<div key={field.name}
				id={id + '-' + field.name}
			/>
		))}
	</>
));

jest.mock('../../../src/components/FileUploader/FileUploader', () => () => <></>);

jest.mock('../../../src/components/ImportantBox/ImportantBox', () => () => <></>);

jest.mock('../../../src/components/MSPAndIdentityPair/MSPAndIdentityPair', () => () => <div className="stub-msp-and-identity-pair" />);

jest.mock('../../../src/components/SidePanelWarning/SidePanelWarning', () => () => <></>);

jest.mock('../../../src/components/Wizard/Wizard', () => ({ children }) => <>{children}</>);

describe('ChaincodeModal component', () => {
	const SCOPE = 'chaincodeModal';
	let mySandBox;
	let props;
	let channelId = 'channel1';
	let ccd = {
		chaincode_id: 'chaincode_1',
		chaincode_version: '1.0',
		validation_parameter: '/Channel/Application/Endorsement',
	};
	let channelDetails;
	let channelMembers;
	let members = [
		{
			id: 'org1',
			org: 'org1',
			node_ou: true,
			admins: ['admin_cert'],
			root_certs: ['root_cert'],
		},
	];
	let channel = {
		id: channelId,
		peers: [
			{
				id: 'peer1',
			},
		],
	};
	// callbacks
	let onCloseStub;
	let onCompleteStub;
	// Translate
	let translateStub;
	// commonActions
	let updateStateStub;
	// ChannelApi
	let getChannelStub;
	let getChannelConfigStub;
	let getCommittedChaincodeApprovalsStub;
	let checkChaincodeReadinessStub;
	// IdentityApi
	let getAssociatedIdentityStub;
	// MspRestApi
	let getAllMspsStub;
	// PeerRestApi
	let downloadChaincodeStub;
	let getInstalledChaincodeStub;
	// StitchApi
	let lc_getAllChaincodeDefinitionsOnChannelStub;
	// MspHelper
	let getIdentitiesForMspsStub;
	// Logger
	let logErrorStub;
	let logDebugStub;

	beforeEach(() => {
		mySandBox = sinon.createSandbox();
		logErrorStub = mySandBox.stub(Logger.prototype, 'error');
		logDebugStub = mySandBox.stub(Logger.prototype, 'debug');
		onCloseStub = mySandBox.stub();
		onCompleteStub = mySandBox.stub();
		translateStub = mySandBox.stub().callsFake(inputString => {
			return inputString;
		});
		updateStateStub = mySandBox.stub().callsFake((scope, obj) => {
			scope.should.deep.equal(SCOPE);
			for (let prop in obj) {
				props[prop] = obj[prop];
			}
		});
		getChannelStub = mySandBox.stub(ChannelApi, 'getChannel').callsFake(() => {
			return Promise.resolve(channel);
		});
		getChannelConfigStub = mySandBox.stub(ChannelApi, 'getChannelConfig').callsFake(() => {
			let org1 = {
				values_map: {
					MSP: {
						value: {
							admins_list: ['admin_cert'],
							root_certs_list: ['root_cert'],
							fabric_node_ous: {
								enable: true,
							},
						},
					},
				},
			};
			let config_envelope = {
				config: {
					channel_group: {
						groups_map: {
							Application: {
								groups_map: {
									org1,
								},
							},
						},
					},
				},
			};
			return Promise.resolve(config_envelope);
		});
		getCommittedChaincodeApprovalsStub = mySandBox.stub(ChannelApi, 'getCommittedChaincodeApprovals').callsFake(() => {
			return Promise.resolve({
				org1: true,
			});
		});
		checkChaincodeReadinessStub = mySandBox.stub(ChannelApi, 'checkChaincodeReadiness').callsFake(() => {
			return Promise.resolve({
				org1: true,
			});
		});
		getAssociatedIdentityStub = mySandBox.stub(IdentityApi, 'getAssociatedIdentity').callsFake(() => {
			return Promise.resolve({
				name: 'identity',
				cert: 'cert',
				private_key: 'private_key',
			});
		});
		getAllMspsStub = mySandBox.stub(MspRestApi, 'getAllMsps').callsFake(() => {
			return Promise.resolve([
				{
					msp_id: 'org1',
					root_certs: ['root_cert'],
					host_url: 'host_url',
				},
			]);
		});
		downloadChaincodeStub = mySandBox.stub(PeerRestApi, 'downloadChaincode').callsFake(() => {
			return Promise.resolve({
				chaincodeInstallPackage: {},
			});
		});
		getInstalledChaincodeStub = mySandBox.stub(PeerRestApi, 'getInstalledChaincode').callsFake(() => {
			return Promise.resolve({
				v2data: {
					installedChaincodes: [],
				},
			});
		});
		lc_getAllChaincodeDefinitionsOnChannelStub = mySandBox.stub(StitchApi, 'lc_getAllChaincodeDefinitionsOnChannel').callsFake(() => {
			return Promise.resolve([]);
		});
		MspHelper.getIdentitiesForMsps = msps => {
			let resp = [];
			msps.forEach(msp => {
				resp.push({
					...msp,
					identities: [
						{
							name: 'identity',
							cert: 'cert',
							private_key: 'private_key',
						},
					],
				});
			});
			return Promise.resolve(resp);
		};
		Helper.renderFieldSummary = (translate, props, label, field) => {
			return <div className="summary-section"
				id={field || label}
			/>;
		};
		// initial props
		props = {
			channelId,
			ccd,
			channelDetails,
			channelMembers,
			onClose: onCloseStub,
			onComplete: onCompleteStub,
			updateState: updateStateStub,
			t: translateStub,
			members,
			channel,
			signature_requests: [],
			commited_approvals: [],
		};
	});

	afterEach(() => {
		mySandBox.restore();
	});

	describe('ChaincodeModal - render already committed', () => {
		it('should render', async() => {
			props.commited_approvals = [{ msp_id: 'org1' }];
			const component = mount(<ChaincodeModal {...props} />);
			component.find('.ibp-wizard-step').should.have.lengthOf(1);
			component.find('.ibp-chaincode-approval').should.have.lengthOf(1);
			component.find('.ibp-chaincode-approval-org').should.have.lengthOf(1);
			component.find('.summary-section#status').should.have.lengthOf(1);
			component.find('.summary-section#channelId').should.have.lengthOf(1);
			component.find('.summary-section#chaincode_id').should.have.lengthOf(1);
			component.find('.summary-section#chaincode_version').should.have.lengthOf(1);
			component.find('.summary-section#policy').should.have.lengthOf(1);
		});
	});

	describe('ChaincodeModal - render proposed', () => {
		it('should render', async() => {
			props.signatureRequest = {
				ccd,
				orgs2sign: [
					{
						msp_id: 'org1',
						root_certs: ['root_cert'],
					},
					{
						msp_id: 'org2',
						root_certs: ['root_cert'],
					},
				],
				current_policy: {
					number_of_signatures: 1,
				},
			};
			const component = mount(<ChaincodeModal {...props} />);
			component.find('.ibp-wizard-step').should.have.lengthOf(1);
			component.find('.ibp-chaincode-approval').should.have.lengthOf(1);
			component.find('.ibp-chaincode-approval-org').should.have.lengthOf(2);
			component.find('.summary-section#status').should.have.lengthOf(1);
			component.find('.summary-section#channelId').should.have.lengthOf(1);
			component.find('.summary-section#chaincode_id').should.have.lengthOf(1);
			component.find('.summary-section#chaincode_version').should.have.lengthOf(1);
			component.find('.summary-section#policy').should.have.lengthOf(1);
		});
	});

	describe('ChaincodeModal - render commit', () => {
		it('should render', async() => {
			props.signatureRequest = {
				ccd,
				orgs2sign: [
					{
						msp_id: 'org1',
						root_certs: ['root_cert'],
					},
					{
						msp_id: 'org2',
						root_certs: ['root_cert'],
					},
				],
				current_policy: {
					number_of_signatures: 1,
				},
			};
			props.show_commit = true;
			const component = mount(<ChaincodeModal {...props} />);
			component.find('.ibp-wizard-step').should.have.lengthOf(1);
			component.find('.stub-msp-and-identity-pair').should.have.lengthOf(1);
		});
	});

	describe('ChaincodeModal - render approve', () => {
		it('should render', async() => {
			props.signatureRequest = {
				ccd,
				orgs2sign: [
					{
						msp_id: 'org1',
						root_certs: ['root_cert'],
					},
					{
						msp_id: 'org2',
						root_certs: ['root_cert'],
					},
				],
				current_policy: {
					number_of_signatures: 1,
				},
			};
			props.selected = props.signatureRequest.orgs2sign[0];
			const component = mount(<ChaincodeModal {...props} />);
			component.find('.ibp-wizard-step').should.have.lengthOf(3);
			component.find('#proposal-identity-form-approve_identity').should.have.lengthOf(1);
			component.find('input#approve_with_pkg').should.have.lengthOf(1);
			component.find('.ibp-propose-chaincode-summary').should.have.lengthOf(1);
		});
	});

	describe('ChaincodeModal - render approve with pkg install', () => {
		it('should render', async() => {
			props.signatureRequest = {
				ccd,
				orgs2sign: [
					{
						msp_id: 'org1',
						root_certs: ['root_cert'],
					},
					{
						msp_id: 'org2',
						root_certs: ['root_cert'],
					},
				],
				current_policy: {
					number_of_signatures: 1,
				},
			};
			props.selected = props.signatureRequest.orgs2sign[0];
			props.approve_with_pkg = true;
			props.pkg = {};
			const component = mount(<ChaincodeModal {...props} />);
			component.find('.ibp-wizard-step').should.have.lengthOf(4);
			component.find('#proposal-identity-form-approve_identity').should.have.lengthOf(1);
			component.find('input#approve_with_pkg').should.have.lengthOf(1);
			component.find('input#toggle-install-all-peers').should.have.lengthOf(1);
			component.find('.ibp-propose-chaincode-summary').should.have.lengthOf(1);
		});
	});
});
