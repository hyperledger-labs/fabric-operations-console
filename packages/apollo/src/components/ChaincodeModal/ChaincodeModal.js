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
import { ContentSwitcher, SkeletonText, Switch, TextArea, TextInput, Toggle } from 'carbon-components-react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import ChannelApi from '../../rest/ChannelApi';
import IdentityApi from '../../rest/IdentityApi';
import { MspRestApi } from '../../rest/MspRestApi';
import { PeerRestApi } from '../../rest/PeerRestApi';
import SignatureRestApi from '../../rest/SignatureRestApi';
import StitchApi from '../../rest/StitchApi';
import Helper from '../../utils/helper';
import { triggers, triggerSurvey } from '../../utils/medallia';
import MspHelper from '../../utils/msp';
import FileUploader from '../FileUploader/FileUploader';
import Form from '../Form/Form';
import ImportantBox from '../ImportantBox/ImportantBox';
import Logger from '../Log/Logger';
import MSPAndIdentityPair from '../MSPAndIdentityPair/MSPAndIdentityPair';
import SidePanelWarning from '../SidePanelWarning/SidePanelWarning';
import SVGs from '../Svgs/Svgs';
import Wizard from '../Wizard/Wizard';
import WizardStep from '../WizardStep/WizardStep';

const naturalSort = require('javascript-natural-sort');
const SCOPE = 'chaincodeModal';
const Log = new Logger(SCOPE);

export class ChaincodeModal extends React.Component {
	componentDidMount() {
		this.getData();
	}

	componentWillUnmount() {
		this.clearData();
	}

	clearData() {
		this.props.updateState(SCOPE, {
			id: null,
			version: null,
			sequence: null,
			channel: null,
			signatureRequest: null,
			approvals: null,
			selected: null,
			selected_identities: null,
			members: null,
			commit_org: null,
			commit_identity: null,
			msps_with_identities: null,
			upload_pkg: true,
			pkg: null,
			install_all_peers: true,
			selected_peers: [],
			existing_pkgs: null,
			loading_pkgs: false,
			committed: false,
			approve_with_pkg: true,
			show_commit: false,
			commited_approvals: [],
		});
	}

	async getData() {
		this.props.updateState(SCOPE, { loading: true });
		this.clearData();
		const channel = await this.getChannelInformation();
		if (channel) {
			const members = await this.getChannelMembers(channel);
			await this.getSignatureRequest(channel, members);
			await this.getMspInformation();
		}
		this.props.updateState(SCOPE, { loading: false });
	}

	async getChannelInformation() {
		let channel = null;
		if (this.props.channelDetails) {
			channel = this.props.channelDetails;
		} else {
			try {
				channel = await ChannelApi.getChannel(this.props.channelId);
				this.props.updateState(SCOPE, {
					channel,
				});
			} catch (error) {
				Log.error(error);
			}
		}
		this.props.updateState(SCOPE, {
			channel,
		});
		return channel;
	}

	async getMspInformation() {
		const msps_with_identities = await MspHelper.getIdentitiesForMsps(this.props.members);
		this.props.updateState(SCOPE, { msps_with_identities });
	}

	async getChannelMembers(channel) {
		let members = [];
		if (this.props.channelMembers) {
			members = this.props.channelMembers;
		} else {
			const config_envelop = await ChannelApi.getChannelConfig(channel.peers[0].id, channel.id);
			const config = config_envelop.config;
			const orgNodes = _.get(config, 'channel_group.groups_map.Application.groups_map');
			const orgs = Object.keys(orgNodes);
			orgs.forEach(id => {
				members.push({
					id,
					org: id,
					node_ou: _.get(orgNodes[id], 'values_map.MSP.value.fabric_node_ous.enable'),
					admins: _.get(orgNodes[id], 'values_map.MSP.value.admins_list'),
					root_certs: _.get(orgNodes[id], 'values_map.MSP.value.root_certs_list'),
				});
			});
		}
		this.props.updateState(SCOPE, { members });
		return members;
	}

	async getSignatureRequest(channel, members) {
		let signatureRequest = null;
		let approvals = [];
		let committed = true;
		let all_msps = null;
		let readiness = null;
		let commited_approvals = [];
		if (this.props.signature_requests) {
			this.props.signature_requests.forEach(request => {
				if (
					request.ccd &&
					request.ccd.chaincode_sequence === this.props.ccd.chaincode_sequence &&
					request.ccd.chaincode_id === this.props.ccd.chaincode_id &&
					request.channel === channel.id
				) {
					signatureRequest = request;
				}
			});
		}
		if (signatureRequest) {
			for (let i = 0; i < members.length; i++) {
				const member = members[i];
				let test = signatureRequest.orgs2sign.filter(org => org.msp_id === member.id);
				if (test && test.length === 0) {
					if (!member.host_url) {
						if (!all_msps) {
							all_msps = await MspRestApi.getAllMsps();
						}
						for (let j = 0; j < all_msps.length; j++) {
							const msp = all_msps[j];
							if (msp.msp_id === member.id) {
								if (_.intersection(msp.root_certs, member.root_certs).length > 0) {
									member.host_url = msp.host_url;
								}
							}
						}
					}
					if (!readiness) {
						readiness = await ChannelApi.checkChaincodeReadiness({
							channel_id: signatureRequest.channel,
							...signatureRequest.ccd,
						});
					}
					const signature = readiness && readiness[member.id] ? 'approval_submitted' : undefined;
					signatureRequest.orgs2sign.push({
						certificate: member.admins[0],
						msp_id: member.id,
						optools_url: member.host_url ? member.host_url + '/api/v1' : undefined,
						peers: [],
						timestamp: new Date().getTime(),
						signature,
					});
					if (signature) {
						signatureRequest.signature_count++;
					}
				}
			}
			signatureRequest.orgs2sign.forEach(org => {
				approvals.push({
					msp_id: org.msp_id,
					approved: !!org.signature,
				});
			});
			let identity = await IdentityApi.getAssociatedIdentity(channel.peers[0]);
			committed = await this.isCommitted({
				msp_id: channel.peers[0].msp_id,
				client_cert_b64pem: identity.cert,
				client_prv_key_b64pem: identity.private_key,
				host: channel.peers[0].url2use,
				channel_id: channel.id,
			});
		} else {
			// no signature request, so get existing approvals
			const opts = {
				channel_id: channel.id,
				...this.props.ccd,
				peer: channel.peers[0],
			};
			const commited = await ChannelApi.getCommittedChaincodeApprovals(opts);
			all_msps = await MspRestApi.getAllMsps();
			for (let i = 0; i < members.length; i++) {
				const member = members[i];
				if (!member.host_url) {
					for (let j = 0; j < all_msps.length; j++) {
						const msp = all_msps[j];
						if (msp.msp_id === member.id) {
							if (_.intersection(msp.root_certs, member.root_certs).length > 0) {
								member.host_url = msp.host_url;
							}
						}
					}
				}
				const signature = commited[member.id] ? 'approval_submitted' : undefined;
				commited_approvals.push({
					certificate: member.admins[0],
					msp_id: member.id,
					optools_url: member.host_url ? member.host_url + '/api/v1' : undefined,
					peers: [],
					timestamp: new Date().getTime(),
					signature,
				});
			}
		}
		this.props.updateState(SCOPE, {
			signatureRequest,
			approvals,
			committed,
			commited_approvals,
		});
		return signatureRequest;
	}

	getIdentities(msp_id) {
		let identities = [];
		if (this.props.msps_with_identities) {
			this.props.msps_with_identities.forEach(msp => {
				if (msp.msp_id === msp_id && msp.identities && msp.identities.length) {
					identities = msp.identities;
				}
			});
		}
		return identities;
	}

	renderApprovals() {
		let committed = this.props.committed;
		let ready_to_commit = false;
		let orgs2sign = [];
		if (this.props.signatureRequest) {
			orgs2sign = this.props.signatureRequest.orgs2sign;
		} else {
			orgs2sign = this.props.commited_approvals;
		}
		let number_of_signatures = 0;
		orgs2sign.forEach(org2sign => {
			if (org2sign.signature) {
				number_of_signatures++;
			}
		});
		let required_signatures = 1;
		if (this.props.signatureRequest && !committed) {
			required_signatures = _.get(this.props, 'signatureRequest.current_policy.number_of_signatures', 1);
			if (number_of_signatures >= required_signatures) {
				ready_to_commit = true;
			}
		}
		return (
			<div className="ibp-chaincode-approval">
				{Helper.renderFieldSummary(
					this.props.translate,
					{
						status: this.props.translate(committed ? 'chaincode_committed' : ready_to_commit ? 'chaincode_ready' : 'proposed_with_policy', {
							n: required_signatures,
						}),
					},
					'status'
				)}
				{(committed || ready_to_commit) && orgs2sign && number_of_signatures < orgs2sign.length && <SidePanelWarning title=""
					subtitle="not_all_approved"
				/>}
				<table>
					<tbody>
						{orgs2sign &&
							orgs2sign.map(org => {
								let identities = org.optools_url ? this.getIdentities(org.msp_id) : [];
								return (
									<tr key={org.msp_id}>
										<td className="ibp-chaincode-approval-org">{org.msp_id}</td>
										<td>
											{org.signature ? (
												<span className="ibp-chaincode-approval-true">{this.props.translate('approved')}</span>
											) : (
												this.props.translate('pending_approval')
											)}
										</td>
										<td>
											{!!identities.length && (
												<button
													id={'update-approval-' + org.msp_id}
													className="bx--btn bx--btn--tertiary bx--btn--sm"
													onClick={() => {
														this.props.updateState(SCOPE, {
															selected: org,
															selected_identities: identities,
															selected_peers: this.props.channel.peers.filter(p => p.msp_id === org.msp_id),
															pkg: null,
															upload_pkg: true,
														});
														if (org.package_id) {
															this.getExistingPackages();
														}
													}}
												>
													{this.props.translate(org.signature ? 'update_proposal' : 'begin_approve')}
												</button>
											)}
										</td>
									</tr>
								);
							})}
					</tbody>
				</table>
			</div>
		);
	}

	renderDetails() {
		if (this.props.selected) {
			return;
		}
		if (this.props.show_commit) {
			return;
		}
		let committed = this.props.committed;
		let policy = this.props.ccd.validation_parameter;
		if (policy === '/Channel/Application/Endorsement') {
			policy = this.props.translate('use_default_policy');
		}

		return (
			<WizardStep
				type="WizardStep"
				title={this.props.translate(committed ? 'chaincode_definition' : 'chaincode_proposal')}
				nextButtonLabel={this.props.translate('begin_commit')}
			>
				{this.props.loading ? (
					<div className="ibp-chaincode-approval">
						<SkeletonText
							style={{
								paddingTop: '.5rem',
								width: '100%',
								height: '2.5rem',
							}}
						/>
					</div>
				) : this.props.channel ? (
					this.renderApprovals()
				) : (
					<div className="summary-section">
						<ImportantBox
							text={this.props.translate('approval_error_no_channel', {
								channelName: this.props.channelId,
							})}
						/>
					</div>
				)}
				{Helper.renderFieldSummary(this.props.translate, this.props, 'channel_name', 'channelId')}
				{Helper.renderFieldSummary(this.props.translate, this.props.ccd, 'pkg_id', 'chaincode_id')}
				{Helper.renderFieldSummary(this.props.translate, this.props.ccd, 'pkg_version', 'chaincode_version')}
				{Helper.renderFieldSummary(this.props.translate, this.props.ccd, 'init_required', 'init_required')}
				{Helper.renderFieldSummary(this.props.translate, { policy }, 'transaction_endorsement_policy', 'policy')}
				{this.props.ccd && this.props.ccd.collections_obj && (
					<div className="summary-section">
						<p className="summary-label">{this.props.translate('propose_private_data')}</p>
						<p className="summary-value">
							<TextArea
								id="private-data-collections"
								name="private-data-collections"
								className="bx--text__input ibm-label"
								value={JSON.stringify(this.props.ccd.collections_obj, null, 4)}
								readOnly
								labelText={this.props.translate('propose_private_data')}
								hideLabel={true}
							/>
						</p>
					</div>
				)}
			</WizardStep>
		);
	}

	async isCommitted(opts) {
		let committed = false;
		let defs = await StitchApi.lc_getAllChaincodeDefinitionsOnChannel(opts);
		for (let j = 0; j < defs.data.chaincodeDefinitions.length && !committed; j++) {
			const def = defs.data.chaincodeDefinitions[j];
			if (def.name === this.props.ccd.chaincode_id && def.version === this.props.ccd.chaincode_version && def.sequence === this.props.ccd.chaincode_sequence) {
				committed = true;
			}
		}
		return committed;
	}

	async verifyCommit(opts) {
		let verified = false;
		let retry = 5;
		while (!verified && retry > 0) {
			verified = await this.isCommitted({
				msp_id: opts.msp_id,
				client_cert_b64pem: opts.client_cert_b64pem,
				client_prv_key_b64pem: opts.client_prv_key_b64pem,
				host: opts.hosts[0],
				channel_id: opts.channel_id,
			});
			if (!verified) {
				retry--;
				if (retry >= 0) {
					await Helper.wait(3000); // 3 second delay between checks
				}
			}
		}
		return verified;
	}

	onCommit = async() => {
		let orderer = null;
		for (let o = 0; o < this.props.channel.orderers.length && !orderer; o++) {
			if (this.props.channel.orderers[o].msp_id === this.props.commit_org.msp_id) {
				orderer = this.props.channel.orderers[o];
			}
		}
		if (!orderer) {
			orderer = this.props.channel.orderers[0];
		}
		const hosts = [];
		const orgs2sign = _.get(this.props, 'signatureRequest.orgs2sign');
		if (orgs2sign) {
			orgs2sign.forEach(org => {
				if (org.peers) {
					org.peers.forEach(peer_url => {
						hosts.push(peer_url);
					});
				}
			});
		}
		let opts = {
			msp_id: this.props.commit_org.msp_id,
			client_cert_b64pem: this.props.commit_identity.cert,
			client_prv_key_b64pem: this.props.commit_identity.private_key,
			hosts,
			orderer_host: orderer.url2use,
			channel_id: this.props.channel.id,
			chaincode_id: this.props.ccd.chaincode_id,
			chaincode_sequence: this.props.ccd.chaincode_sequence,
			init_required: this.props.ccd.init_required,
			chaincode_version: this.props.ccd.chaincode_version,
			validation_parameter: this.props.ccd.validation_parameter,
			collections_obj: this.props.ccd.collections_obj,
			proxy_route: this.props.host_url + '/grpcwp', // route to our local proxy route (optools)
		};
		const resp = await StitchApi.lc_commitChaincodeDefinition(opts);
		if (resp.error) {
			Log.error(resp);
			throw Error(resp);
		}
		const org_peers = this.props.channel.peers.filter(p => p.msp_id === this.props.commit_org.msp_id);
		opts.hosts = [org_peers[0].url2use];
		const verified = await this.verifyCommit(opts);
		if (verified) {
			await SignatureRestApi.closeRequest({
				msp_id: this.props.commit_org.msp_id,
				client_cert_b64pem: this.props.commit_identity.cert,
				client_prv_key_b64pem: this.props.commit_identity.private_key,
				tx_id: this.props.signatureRequest.tx_id,
			});
		} else {
			throw new Error();
		}
		SignatureRestApi.getAllRequests(); // refresh signature requests
		if (this.props.onComplete) {
			this.props.onComplete();
		}
		triggerSurvey(triggers.INSTALL_OR_COMMIT_SMART_CONTRACT);
		return;
	};

	async getSelectedChaincodePackage() {
		let cc_pkg = null;
		if (this.props.pkg && this.props.pkg.name) {
			if (this.props.upload_pkg) {
				// uploaded .tar.gz file
				cc_pkg = this.pkg_uint8;
			} else {
				// existing package
				if (this.props.pkg) {
					// download from peer
					const pkg_data = await PeerRestApi.downloadChaincode(this.props.pkg.peers[0].id, this.props.pkg.packageId);
					cc_pkg = pkg_data.chaincodeInstallPackage;
				}
			}
		}
		return cc_pkg;
	}

	async installChaincodePackageOnSelectedPeers(cc_pkg) {
		if (!cc_pkg) {
			return null;
		}
		const all = [];
		let package_id = this.props.upload_pkg ? null : _.get(this.props, 'pkg.packageId');
		let calc_pkg_id = null;
		try {
			const hash = await Helper.calculateFileHash(cc_pkg);
			calc_pkg_id = `${this.props.pkg_id}:${hash}`;
		} catch (error) {
			console.error('unable to calculate package id (hash)', error);
		}
		this.props.selected_peers.forEach(peer => {
			if (!this.isAlreadyInstalledOnPeer(peer)) {
				all.push(PeerRestApi.installChaincode(peer.id, cc_pkg, true));
			}
		});
		if (all.length) {
			const resp = await Promise.all(all);
			package_id = resp[0].packageId;
		}
		// if we don't get the package id from the new install, calculate the package id.
		// calc_pkg_id is when the peer has the smart contract already installed (and installing again would result in error)
		// TODO: use calculated package id to decide whether or not to install on the peer
		if (!package_id) package_id = calc_pkg_id;
		return package_id;
	}

	isAlreadyInstalledOnPeer(peer) {
		let installed = false;
		if (!this.props.upload_pkg && this.props.pkg && this.props.pkg.peers && this.props.pkg.peers.length) {
			for (let i = 0; i < this.props.pkg.peers.length && !installed; i++) {
				if (this.props.pkg.peers[i].id === peer.id) {
					installed = true;
				}
			}
		}
		return installed;
	}

	onApprove = async() => {
		let package_id = this.props.selected.package_id;
		let selected_peers = this.props.selected_peers;
		const cc_pkg = await this.getSelectedChaincodePackage();
		if (cc_pkg) {
			package_id = await this.installChaincodePackageOnSelectedPeers(cc_pkg);
		} else {
			const org_peers = this.props.channel.peers.filter(p => p.msp_id === this.props.selected.msp_id);
			selected_peers = [org_peers[0]];
		}
		if (!selected_peers.length) {
			let installed_peers = [];
			if (this.props.pkg && this.props.pkg.peers) {
				installed_peers = this.props.pkg.peers.filter(p => p.msp_id === this.props.selected.msp_id);
			}
			selected_peers = [installed_peers[0]];
		}
		const opts = {
			channel_id: this.props.channel.id,
			msp_id: this.props.selected.msp_id,
			cert: this.props.approve_identity.cert,
			private_key: this.props.approve_identity.private_key,
			package_id,
			id: this.props.signature_request ? this.props.signatureRequest.ccd.chaincode_id : this.props.ccd.chaincode_id,
			version: this.props.signatureRequest ? this.props.signatureRequest.ccd.chaincode_version : this.props.ccd.chaincode_version,
			sequence: this.props.signatureRequest ? this.props.signatureRequest.ccd.chaincode_sequence : this.props.ccd.chaincode_sequence,
			init_required: this.props.signatureRequest ? this.props.signatureRequest.ccd.init_required : this.props.ccd.init_required,
			endorsement_policy: this.props.signatureRequest ? this.props.signatureRequest.ccd.validation_parameter : this.props.ccd.validation_parameter,
			members: this.props.channel.members,
			number_of_signatures: this.props.signatureRequest ? this.props.signatureRequest.current_policy.number_of_signatures : 1,
			private_data_json: this.props.signatureRequest ? this.props.signatureRequest.ccd.collections_obj : this.props.ccd.collections_obj,
			signature_request: this.props.signatureRequest ? this.props.signatureRequest : {},
			selected_peers,
			configtxlator_url: this.props.configtxlator_url,
		};
		await ChannelApi.createOrApproveChaincodeProposal(opts);

		if (this.props.onComplete) {
			this.props.onComplete();
		}
		return;
	};

	renderCommit() {
		if (this.props.selected) {
			return;
		}
		if (!this.props.show_commit) {
			return;
		}

		return (
			<WizardStep
				type="WizardStep"
				title={this.props.translate('commit_proposal')}
				disableSubmit={!this.props.commit_org || !this.props.commit_identity}
				onCancel={() => {
					this.props.updateState(SCOPE, { show_commit: false });
				}}
			>
				<p className="ibp-modal-text">{this.props.translate('commit_proposal_desc')}</p>
				<MSPAndIdentityPair
					id="commit_chaincode"
					scope={SCOPE}
					msp_field={{
						name: 'commit_org',
						required: true,
					}}
					identity_field={{
						name: 'commit_identity',
						required: true,
					}}
					msps={this.props.members}
				/>
			</WizardStep>
		);
	}

	renderApprove() {
		if (!this.props.selected) {
			return;
		}
		if (this.props.show_commit) {
			return;
		}

		const peers = this.props.channel.peers.filter(p => p.msp_id === this.props.selected.msp_id);
		return (
			<WizardStep
				type="WizardStep"
				title={this.props.translate(this.props.selected.signature ? 'update_proposal' : 'approve_proposal')}
				disableSubmit={!peers.length || !_.isObject(this.props.approve_identity)}
				onCancel={() => {
					this.props.updateState(SCOPE, {
						selected: null,
						selected_identities: null,
					});
				}}
			>
				<p className="ibp-modal-text">{this.props.translate(this.props.selected.signature ? 'update_chaincode_desc' : 'approve_chaincode_desc_1')}</p>
				{Helper.renderFieldSummary(this.props.translate, this.props, 'approve_org', 'selected.msp_id')}
				<Form
					id="proposal-identity-form"
					scope={SCOPE}
					fields={[
						{
							name: 'approve_identity',
							default: 'select_identity',
							tooltip: 'approve_identity_tooltip',
							type: 'dropdown',
							options: this.props.selected_identities,
						},
					]}
				/>
				{!peers.length && (
					<div className="ibp-error-panel">
						<SidePanelWarning title=""
							kind="error"
							subtitle="approve_no_peers"
						/>
					</div>
				)}
			</WizardStep>
		);
	}

	async parsePackage(pkg) {
		const data = await Helper.readLocalChaincodePackageFile(pkg);
		this.pkg_uint8 = data ? data.uint8 : null;
		this.props.updateState(SCOPE, {
			pkg_id: data.pkg_id,
		});
	}

	renderUploadPackage() {
		return (
			<div className="ibp-upload-pkg">
				<FileUploader
					id="pkg-file-uploader"
					className="ibp-pkg-file-uploader"
					labelTitle={this.props.translate('chaincode_package')}
					labelDescription={this.props.translate('chaincode_package_desc')}
					buttonLabel={this.props.translate('add_file')}
					accept={['.gz']}
					name="file"
					multiple={false}
					onChange={event => {
						const pkg = event.target.files[0];
						this.props.updateState(SCOPE, { pkg });
						this.parsePackage(pkg);
					}}
					disabled={!!this.props.pkg}
				/>
				{this.props.pkg && (
					<div className="ibp-pkg-item">
						<TextInput
							id="chaincode-pkg"
							defaultValue={this.props.pkg.name}
							labelText={this.props.translate('chaincode_package')}
							aria-label={this.props.translate('chaincode_package')}
							readOnly={true}
						/>
						<button
							id="chaincode-pkg-delete"
							className="ibp-pkg-delete"
							title={this.props.translate('remove')}
							onClick={() => {
								this.props.updateState(SCOPE, { pkg: null });
							}}
						>
							<SVGs type="close"
								extendClass={{ 'ibp-pkg-delete-icon': true }}
							/>
						</button>
					</div>
				)}
			</div>
		);
	}

	async getExistingPackages() {
		this.props.updateState(SCOPE, { loading_pkgs: true });
		const existing = {};
		if (this.props.channel.peers) {
			for (let i = 0; i < this.props.channel.peers.length; i++) {
				const peer = this.props.channel.peers[i];
				const data = await PeerRestApi.getInstalledChaincode(peer.id);
				if (data.v2data && data.v2data.installedChaincodes) {
					for (let j = 0; j < data.v2data.installedChaincodes.length; j++) {
						const pkg = data.v2data.installedChaincodes[j];
						if (existing[pkg.packageId]) {
							existing[pkg.packageId].peers.push(peer);
						} else {
							existing[pkg.packageId] = {
								...pkg,
								peers: [peer],
							};
						}
					}
				}
			}
		}
		const existing_pkgs = [];
		const ids = Object.keys(existing);
		ids.forEach(id => {
			let name = id;
			let label = null;
			let hash = null;
			let tooltip = null;
			const sep = id.indexOf(':');
			if (sep > -1) {
				label = id.substring(0, sep);
				hash = id.substring(sep + 1);
				if (hash.length > 8) {
					name = label + ':' + hash.substring(0, 4) + '...' + hash.substring(hash.length - 4);
					tooltip = id;
				}
			}
			const pkg = existing[id];
			existing_pkgs.push({
				...pkg,
				name,
				tooltip,
				label,
				hash,
				peer: pkg.peers[0],
			});
		});
		existing_pkgs.sort((a, b) => {
			return naturalSort(a.tooltip || a.name, b.tooltip || b.name);
		});
		this.props.updateState(SCOPE, {
			loading_pkgs: false,
			existing_pkgs,
		});
	}

	renderExistingPackage(pkg) {
		return (
			<div className="ibp-existing-pkg">
				{this.props.existing_pkgs && !this.props.existing_pkgs.length && !this.props.loading_pkgs ? (
					<p>{this.props.translate('no_existing_packages')}</p>
				) : (
					<Form
						scope={SCOPE}
						id={SCOPE + '-existing-pkgs'}
						fields={[
							{
								name: 'pkg',
								label: 'existing_pkgs_installed',
								type: 'dropdown',
								required: true,
								options: this.props.existing_pkgs,
								loading: this.props.loading_pkgs,
								default: pkg ? pkg : 'choose_a_pkg',
							},
						]}
					/>
				)}
			</div>
		);
	}

	selectDefaultPeers(pkg) {
		const org_peers = this.props.channel.peers.filter(p => p.msp_id === this.props.selected.msp_id);
		let selected_peers = pkg && pkg.peers ? pkg.peers.filter(p => p.msp_id === this.props.selected.msp_id) : [];
		if (!selected_peers.length) {
			selected_peers = [...org_peers];
		}
		this.props.updateState(SCOPE, {
			selected_peers,
			install_all_peers: selected_peers.length === org_peers.length,
		});
	}

	renderSelectPackage() {
		if (!this.props.selected) {
			return;
		}
		if (this.props.show_commit) {
			return;
		}

		let pkg = null;
		let pkg_required = true;
		if (this.props.selected.package_id && this.props.existing_pkgs) {
			pkg = this.props.existing_pkgs.find(p => p.packageId === this.props.selected.package_id);
			pkg_required = false;
		}
		if (!this.props.selected.signature && !this.props.approve_with_pkg) {
			pkg_required = false;
		}

		let desc = this.props.translate('approve_install_desc');
		if (!this.props.selected.signature) {
			desc = desc + ' ' + this.props.translate('approve_install_desc_2');
		}

		return (
			<WizardStep
				type="WizardStep"
				title={this.props.translate('install_chaincode')}
				tooltip={this.props.translate('upload_package_tooltip2')}
				disableSubmit={pkg_required && !_.isObject(this.props.pkg)}
				onNext={() => {
					if (_.isObject(this.props.pkg)) {
						this.selectDefaultPeers(this.props.pkg);
					}
					if (pkg && !_.isObject(this.props.pkg)) {
						this.props.updateState(SCOPE, {
							pkg,
							upload_pkg: false,
						});
						this.selectDefaultPeers(pkg);
					}
					return Promise.resolve();
				}}
			>
				<p className="ibp-modal-text">{desc}</p>
				{pkg && (
					<div className="summary-section">
						<p className="summary-label">{this.props.translate('chaincode_package')}</p>
						<p className="summary-value"
							title={pkg.tooltip}
						>
							{pkg.name}
						</p>
					</div>
				)}
				{!this.props.selected.signature && (
					<div className="ibp-form">
						<div className="ibp-form-field">
							<div>
								<label className="ibp-form-label">{this.props.translate('approve_with_install')}</label>
							</div>
							<Toggle
								id="approve_with_pkg"
								toggled={this.props.approve_with_pkg}
								onToggle={() => {
									const approve_with_pkg = !this.props.approve_with_pkg;
									this.props.updateState(SCOPE, {
										approve_with_pkg,
										upload_pkg: true,
										pkg: null,
									});
								}}
								onChange={() => {}}
								aria-label={this.props.translate('approve_with_install')}
								labelA={this.props.translate('no')}
								labelB={this.props.translate('yes')}
							/>
						</div>
					</div>
				)}
				{(pkg || this.props.approve_with_pkg) && (
					<>
						<ContentSwitcher
							className="ibp-upload-toggle"
							onChange={data => {
								if (!this.props.existing_pkgs) {
									this.getExistingPackages();
								}
								this.props.updateState(SCOPE, {
									upload_pkg: !this.props.upload_pkg,
									pkg: null,
								});
							}}
							selectedIndex={this.props.upload_pkg ? 0 : 1}
						>
							<Switch kind="button"
								id="propose-upload"
								name="upload"
								text={this.props.translate('upload')}
							/>
							<Switch kind="button"
								id="propose-existing"
								name="existing"
								text={this.props.translate('existing_package')}
							/>
						</ContentSwitcher>
						{this.props.upload_pkg ? this.renderUploadPackage() : this.renderExistingPackage(pkg)}
					</>
				)}
			</WizardStep>
		);
	}

	renderInstall() {
		if (!this.props.selected) {
			return;
		}
		if (!this.props.pkg) {
			return;
		}
		if (this.props.show_commit) {
			return;
		}

		const org_peers = this.props.channel.peers.filter(p => p.msp_id === this.props.selected.msp_id);
		let installed_peers = [];
		if (this.props.pkg && this.props.pkg.peers) {
			installed_peers = this.props.pkg.peers.filter(p => p.msp_id === this.props.selected.msp_id);
		}

		let disableSubmit = false;
		if (!this.props.install_all_peers) {
			disableSubmit = true;
			if ((this.props.selected_peers && this.props.selected_peers.length) || (installed_peers && installed_peers.length)) {
				disableSubmit = false;
			}
		}

		return (
			<WizardStep type="WizardStep"
				title="install_chaincode"
				disableSubmit={disableSubmit}
			>
				<p className="ibp-modal-text">{this.props.translate('propose_install_desc')}</p>
				<ImportantBox kind="informational"
					text="propose_install_important"
					link="propose_install_important_link"
				/>
				{!!installed_peers.length && (
					<div className="summary-section">
						<p className="summary-label">{this.props.translate('peers_installed_on')}</p>
						<p className="summary-value">{installed_peers.map(p => p.display_name).join(', ')}</p>
					</div>
				)}
				<div className="ibp-form">
					<div className="ibp-form-field">
						<div>
							<label className="ibp-form-label">{this.props.translate('propose_install_all_peers')}</label>
						</div>
						<Toggle
							id="toggle-install-all-peers"
							toggled={this.props.install_all_peers}
							onToggle={() => {
								const data = {
									install_all_peers: !this.props.install_all_peers,
								};
								if (data.install_all_peers) {
									data.selected_peers = [...org_peers];
								}
								this.props.updateState(SCOPE, data);
							}}
							onChange={() => {}}
							aria-label={this.props.translate('propose_install_all_peers')}
							labelA={this.props.translate('no')}
							labelB={this.props.translate('yes')}
						/>
					</div>
				</div>
				{this.props.install_all_peers ? (
					<Form
						scope={SCOPE}
						id={SCOPE + '_select_all_peers'}
						fields={[
							{
								name: 'all_selected_peers',
								label: 'select_peers',
								type: 'multiselect2',
								options: org_peers,
								placeholder: 'peers',
								required: true,
								disabled: true,
								hideLabel: true,
								default: org_peers,
							},
						]}
					/>
				) : (
					<Form
						scope={SCOPE}
						id={SCOPE + '_select_peers'}
						fields={[
							{
								name: 'selected_peers',
								label: 'select_peers',
								type: 'multiselect2',
								options: org_peers,
								placeholder: 'peers',
								required: true,
								hideLabel: true,
								default: this.props.selected_peers,
							},
						]}
					/>
				)}
			</WizardStep>
		);
	}

	renderSummary() {
		if (!this.props.selected) {
			return;
		}
		if (this.props.show_commit) {
			return;
		}
		return (
			<WizardStep type="WizardStep"
				title="summary"
			>
				<div className="ibp-propose-chaincode-summary">
					{Helper.renderFieldSummary(this.props.translate, this.props, 'approve_org', 'selected.msp_id')}
					{Helper.renderFieldSummary(this.props.translate, this.props, 'approve_identity', 'approve_identity.name')}
					{Helper.renderFieldSummary(this.props.translate, this.props, 'chaincode_package', 'pkg.name')}
					{Helper.renderFieldSummary(this.props.translate, this.props.signatureRequest.ccd, 'init_required', 'init_required')}
					{this.props.pkg &&
						this.props.pkg.name &&
						this.props.selected_peers &&
						!!this.props.selected_peers.length &&
						Helper.renderFieldSummary(this.props.translate, this.props, 'install_on', 'selected_peers')}
				</div>
			</WizardStep>
		);
	}

	render() {
		let button = undefined;
		let onSubmit = undefined;
		if (this.props.signatureRequest) {
			if (!this.props.committed) {
				if (this.props.signatureRequest.signature_count >= this.props.signatureRequest.current_policy.number_of_signatures) {
					button = this.props.translate(this.props.show_commit ? 'commit_proposal' : 'begin_commit');
					onSubmit = this.props.show_commit
						? this.onCommit
						: () => {
							this.props.updateState(SCOPE, { show_commit: true });
							return Promise.reject();
						  };
				}
			}
		}
		if (this.props.selected) {
			button = this.props.translate(this.props.selected.signature ? 'update_proposal' : 'approve_proposal');
			onSubmit = this.onApprove;
		}
		return (
			<Wizard onClose={this.props.onClose}
				onSubmit={onSubmit}
				submitButtonLabel={button}
			>
				{this.renderDetails()}
				{this.renderCommit()}
				{this.renderApprove()}
				{this.renderSelectPackage()}
				{this.renderInstall()}
				{this.renderSummary()}
			</Wizard>
		);
	}
}

const dataProps = {
	loading: PropTypes.bool,
	id: PropTypes.string,
	version: PropTypes.string,
	sequence: PropTypes.number,
	channel: PropTypes.object,
	signatureRequest: PropTypes.object,
	approvals: PropTypes.array,
	selected: PropTypes.object,
	members: PropTypes.array,
	commit_org: PropTypes.object,
	commit_identity: PropTypes.object,
	msps_with_identities: PropTypes.array,
	approve_identity: PropTypes.object,
	selected_identities: PropTypes.array,
	upload_pkg: PropTypes.bool,
	pkg: PropTypes.any,
	pkg_id: PropTypes.string,
	pkg_version: PropTypes.string,
	host_url: PropTypes.string,
	install_all_peers: PropTypes.bool,
	selected_peers: PropTypes.array,
	existing_pkgs: PropTypes.array,
	loading_pkgs: PropTypes.bool,
	committed: PropTypes.bool,
	approve_with_pkg: PropTypes.bool,
	show_commit: PropTypes.bool,
	commited_approvals: PropTypes.array,
};

ChaincodeModal.propTypes = {
	...dataProps,
	channelId: PropTypes.string,
	ccd: PropTypes.object,
	onClose: PropTypes.func,
	onComplete: PropTypes.func,
	updateState: PropTypes.func,
	translate: PropTypes.func,
	channelDetails: PropTypes.object,
	channelMembers: PropTypes.array,
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['configtxlator_url'] = state['settings']['configtxlator_url'];
		newProps['host_url'] = state['settings'] ? state['settings']['host_url'] : null;
		newProps['signature_requests'] = state['signatureCollection'] ? state['signatureCollection']['requests'] : null;
		return newProps;
	},
	{
		updateState,
	}
)(withLocalize(ChaincodeModal));
