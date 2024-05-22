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
import { Checkbox, CodeSnippet, TextInput } from 'carbon-components-react';
import _ from 'lodash';
import parse from 'parse-duration';
import PropTypes from 'prop-types';
import React from 'react';
import { withTranslation, Trans } from 'react-i18next';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import { CertificateAuthorityRestApi } from '../../rest/CertificateAuthorityRestApi';
import ChannelApi from '../../rest/ChannelApi';
import IdentityApi from '../../rest/IdentityApi';
import SignatureRestApi from '../../rest/SignatureRestApi';
import { EventsRestApi } from '../../rest/EventsRestApi';
import StitchApi from '../../rest/StitchApi';
import Clipboard from '../../utils/clipboard';
import Helper from '../../utils/helper';
import Form from '../Form/Form';
import Logger from '../Log/Logger';
import SidePanelWarning from '../SidePanelWarning/SidePanelWarning';
import Wizard from '../Wizard/Wizard';
import WizardStep from '../WizardStep/WizardStep';
import RenderParamHTML from '../RenderHTML/RenderParamHTML';
const semver = require('semver');

const SCOPE = 'signatureDetailModal';
const Log = new Logger(SCOPE);
const bytes = require('bytes');

class SignatureDetailModal extends React.Component {
	componentDidMount() {
		this.checkSignatures();
	}

	componentDidUpdate(prevProps) {
		if (prevProps.msps !== this.props.msps) {
			this.checkSignatures();
			return;
		}
		if (prevProps.request) {
			if (prevProps.request.orgs2sign !== this.props.request.orgs2sign || prevProps.request.orderers2sign !== this.props.request.orderers2sign) {
				this.checkSignatures();
				return;
			}
		}
	}

	async checkSignatures() {
		const orgs2sign = [];
		const orderers2sign = [];
		const optools_url = this.props.host_url;
		let signatureCount = 0;
		let member_msps = [];
		let orderer_msps = [];
		this.props.updateState(SCOPE, {
			loading: true,
			channel_warning_20: false,
			channel_warning_20_details: [],
		});
		let channel_config;
		try {
			let channelDetails = await ChannelApi.getChannel(this.props.request.channel);
			channel_config = await ChannelApi.getChannelConfig(channelDetails.peers[0].id, this.props.request.channel);
		} catch (err) {
			console.log('Channel info not found, so cannot filter out msps');
		}
		if (channel_config) {
			const app_groups = _.get(channel_config.config, 'channel_group.groups_map.Application.groups_map');
			const orderer_groups = _.get(channel_config.config, 'channel_group.groups_map.Orderer.groups_map');
			this.props.request.orgs2sign.forEach(org => {
				const msp = _.get(app_groups[org.msp_id], 'values_map.MSP.value');
				org.root_certs = msp.root_certs_list;
			});
			this.props.request.orderers2sign.forEach(org => {
				const msp = _.get(orderer_groups[org.msp_id], 'values_map.MSP.value');
				org.root_certs = msp.root_certs_list;
			});
		}
		for (let orgIdx in this.props.request.orgs2sign) {
			let entry = this.props.request.orgs2sign[orgIdx];
			if (entry.admin && Helper.urlsAreEqual(entry.optools_url, optools_url) && !entry.signature) {
				const identities = await this.getIdentitiesForEntry(entry);
				entry.identities = identities;
				orgs2sign.push(entry);
			}
			if (entry.signature && entry.admin) {
				signatureCount++;
			}
			member_msps = member_msps.concat(await this.getMSPsWithIdentity(entry.msp_id, entry.root_certs));
		}
		if (this.props.request.orderers2sign) {
			for (let orgIdx in this.props.request.orderers2sign) {
				let entry = this.props.request.orderers2sign[orgIdx];
				if (Helper.urlsAreEqual(entry.optools_url, optools_url) && !entry.signature) {
					const identities = await this.getIdentitiesForEntry(entry);
					entry.identities = identities;
					orderers2sign.push(entry);
				}
				orderer_msps = orderer_msps.concat(await this.getMSPsWithIdentity(entry.msp_id, entry.root_certs));
			}
			if (
				signatureCount === 0 &&
				this.props.request.current_policy.number_of_signatures === 1 &&
				this.props.request.json_diff &&
				Helper.checkIfOnlyOrdererSignatureRequired(this.props.request.json_diff)
			) {
				signatureCount++; // no signature required from channel admins
			}
		}
		const identities = await IdentityApi.getIdentities();
		if (_.has(this.props.request.json_diff, 'capabilities.updated')) {
			await this.checkNodesVersion();
		}
		this.props.updateState(SCOPE, {
			orgs2sign: signatureCount < this.props.request.current_policy.number_of_signatures ? orgs2sign : [],
			orderers2sign,
			member_msps,
			orderer_msps,
			loading: false,
			identities,
			signatureCount,
			signatureData: null,
			ordererData: null,
			submit_msp: null,
			submit_identity: null,
			submit_identity_options: [],
		});
	}

	// Returns list of matching msps, along with its identities
	async getMSPsWithIdentity(msp_id, root_certs) {
		const msps = [];
		for (let mspIdx in this.props.msps) {
			let msp = this.props.msps[mspIdx];
			if (msp.msp_id === msp_id) {
				let sameOrg = true;
				if (root_certs) {
					// If we have peer identities to pull channel config, then match mspid and ca root certs
					sameOrg = _.intersection(msp.root_certs, root_certs).length >= 1;
				}
				if (sameOrg) {
					const identities = await IdentityApi.getIdentitiesForMsp(msp);
					msp.identities = identities;
					msps.push(msp);
				}
			}
		}
		return msps;
	}

	componentWillUnmount() {
		this.props.updateState(SCOPE, {
			orgs2sign: [],
			orderers2sign: [],
		});
	}

	async getIdentitiesForEntry(entry) {
		if (entry && entry.msp_id) {
			const caList = await CertificateAuthorityRestApi.getCAs();
			for (let caIdx in caList) {
				let ca = caList[caIdx];
				let rootCert = await CertificateAuthorityRestApi.getRootCertificate(ca);
				let isIdentityFromCert = await StitchApi.isIdentityFromRootCert({
					certificate_b64pem: entry.certificate,
					root_certs_b64pems: [rootCert],
				});
				if (isIdentityFromCert) {
					entry.cert = entry.certificate;
					entry.root_certs = [rootCert];
					const identities = await IdentityApi.getIdentitiesForMsp(entry);
					return identities;
				}
			}
			return;
		}
	}

	getMSPDisplayName(msp_id, root_certs) {
		let display = msp_id;
		this.props.msps.forEach(msp => {
			if (msp.msp_id === msp_id) {
				let sameOrg = true;
				if (root_certs) {
					// If we have peer identities to pull channel config, then match mspid and ca root certs
					sameOrg = _.intersection(msp.root_certs, root_certs).length >= 1;
				}
				if (sameOrg) {
					display = msp.display_name;
				}
			}
		});
		return display;
	}

	renderSignatures(translate) {
		if ((!this.props.orgs2sign || !this.props.orgs2sign.length) && (!this.props.orderers2sign || !this.props.orderers2sign.length)) {
			return;
		}
		if (this.props.request.status !== 'open') {
			return;
		}
		const msp_fields = [];
		this.props.orgs2sign.forEach(org => {
			msp_fields.push({
				name: org.msp_id,
				type: 'dropdown',
				options: org.identities || this.props.identities,
				label: RenderParamHTML(translate, 'signature_for_msp', {
					msp: (
						<CodeSnippet
							type="inline"
							ariaLabel={translate('copy_text', { copyText: this.getMSPDisplayName(org.msp_id, org.root_certs) })}
							light={false}
							onClick={() => Clipboard.copyToClipboard(this.getMSPDisplayName(org.msp_id, org.root_certs))}
						>
							{this.getMSPDisplayName(org.msp_id, org.root_certs)}
						</CodeSnippet>
					)
				}),
				labelOptions: {
					msp: (
						<CodeSnippet
							type="inline"
							ariaLabel={translate('copy_text', { copyText: this.getMSPDisplayName(org.msp_id, org.root_certs) })}
							light={false}
							onClick={() => Clipboard.copyToClipboard(this.getMSPDisplayName(org.msp_id, org.root_certs))}
						>
							{this.getMSPDisplayName(org.msp_id, org.root_certs)}
						</CodeSnippet>
					),
				},
				default: 'signature_for_msp_placeholder',
			});
		});
		const orderer_msp_fields = [];
		this.props.orderers2sign.forEach(orderer => {
			orderer_msp_fields.push({
				name: orderer.msp_id,
				type: 'dropdown',
				options: orderer.identities || this.props.identities,
				label: RenderParamHTML(translate, 'signature_for_msp',{
					msp: (
						<CodeSnippet
							type="inline"
							ariaLabel={translate('copy_text', { copyText: this.getMSPDisplayName(orderer.msp_id, orderer.root_certs) })}
							light={false}
							onClick={() => Clipboard.copyToClipboard(this.getMSPDisplayName(orderer.msp_id, orderer.root_certs))}
						>
							{this.getMSPDisplayName(orderer.msp_id, orderer.root_certs)}
						</CodeSnippet>
					),
				}),
				labelOptions: {
					msp: (
						<CodeSnippet
							type="inline"
							ariaLabel={translate('copy_text', { copyText: this.getMSPDisplayName(orderer.msp_id, orderer.root_certs) })}
							light={false}
							onClick={() => Clipboard.copyToClipboard(this.getMSPDisplayName(orderer.msp_id, orderer.root_certs))}
						>
							{this.getMSPDisplayName(orderer.msp_id, orderer.root_certs)}
						</CodeSnippet>
					),
				},
				default: 'signature_for_msp_placeholder',
			});
		});
		return (
			<div>
				{!!msp_fields.length && (
					<div className="ibp-msps-to-sign">
						<h2>{translate('msps_to_sign')}</h2>
						<p>{translate('msps_to_sign_desc')}</p>
						<Form
							id="msp_signatures"
							scope={SCOPE + '_msp_signatureData'}
							fields={msp_fields}
							onChange={signatureData => {
								this.props.updateState(SCOPE, {
									signatureData: {
										...this.props.signatureData,
										...signatureData,
									},
								});
							}}
						/>
					</div>
				)}
				{!!orderer_msp_fields.length && (
					<div className="ibp-msps-to-sign">
						<h2>{translate('orderer_msps_to_sign')}</h2>
						<p>{translate('orderer_msps_to_sign_desc')}</p>
						<Form
							id="orderer_msp_signatures"
							scope={SCOPE + '_orderer_signatureData'}
							fields={orderer_msp_fields}
							onChange={ordererData => {
								this.props.updateState(SCOPE, {
									ordererData: {
										...this.props.ordererData,
										...ordererData,
									},
								});
							}}
						/>
					</div>
				)}
				{!!this.props.channel_warning_20 && (
					<div className="ibp-channel20-warning">
						{!!this.props.channel_warning_20_details &&
							this.props.channel_warning_20_details.map((x, i) => {
								return (
									<div key={'channel_warning_' + i}>
										<SidePanelWarning
											title={translate(x.nodes.length === 1 ? `channel_warning_20_single_${x.type}` : `channel_warning_20_multi_${x.type}`, {
												nodes: x.nodes.map(node => node.name).join(', '),
											})}
										/>
									</div>
								);
							})}
					</div>
				)}
			</div>
		);
	}

	renderSubmit(translate) {
		if (this.props.request.status !== 'open') {
			return;
		}
		const isOrdererUpdate =
			_.has(this.props.request.json_diff, 'msp') ||
			(_.has(this.props.request.json_diff, 'consenters') && _.has(this.props.request.json_diff.consenters, 'mode'));
		const msp_options = isOrdererUpdate ? this.props.orderer_msps : this.props.member_msps;
		return (
			<div className="ibp-msps-to-sign">
				<h2>{translate('msps_to_submit')}</h2>
				<p>{translate('msps_to_submit_desc')}</p>
				<Form
					id="submitter"
					scope={SCOPE}
					fields={[
						{
							name: 'submit_msp',
							type: 'dropdown',
							options: msp_options,
							label: 'signature_for_submit_msp',
							default: 'select_msp_id',
						},
						{
							name: 'submit_identity',
							type: 'dropdown',
							options: this.props.submit_identity_options,
							label: 'signature_for_submit_identity',
							default: 'select_identity',
						},
					]}
					onChange={async (data, valid) => {
						if (data.submit_msp) {
							const submit_identity_options = await IdentityApi.getIdentitiesForMsp(data.submit_msp);
							this.props.updateState(SCOPE, {
								submit_identity_options,
								submit_identity: null,
							});
						}
					}}
				/>
			</div>
		);
	}

	getSubmitButtonLabel(approved, translate) {
		if (approved) {
			return this.props.request.json_diff ? 'submit_channel_update' : 'submit_channel_create';
		}
		return this.props.request.json_diff ? 'approve_channel_update' : 'approve_channel_create';
	}

	onSubmit = () => {
		return new Promise((resolve, reject) => {
			if (this.props.signatureData || this.props.ordererData) {
				const data = [];
				if (this.props.signatureData) {
					this.props.orgs2sign.forEach(org => {
						const identity = this.props.signatureData[org.msp_id];
						if (identity) {
							data.push({
								type: 'orgs',
								org,
								identity,
							});
						}
					});
				}
				if (this.props.ordererData) {
					this.props.orderers2sign.forEach(org => {
						const identity = this.props.ordererData[org.msp_id];
						if (identity) {
							data.push({
								type: 'orderers',
								org,
								identity,
							});
						}
					});
				}

				SignatureRestApi.signRequest(this.props.request, data)
					.then(() => {
						if (this.props.onComplete) {
							this.props.onComplete();
						}
						resolve();
					})
					.catch(error => {
						Log.error(error);
						let details = error;
						let title = 'error_signature_failed';
						if (_.has(error, 'stitch_msg') && _.includes(error.stitch_msg, 'no Raft leader')) {
							title = 'error_no_raft_leader';
							details = error.stitch_msg;
						}
						reject({
							title,
							details,
						});
					});
			} else {
				const member_diff = this.getMemberDifferences();
				const acl_diff = this.getACLDifferences();
				const block_params_diff = this.getBlockParameterDifferences();
				const raft_params_diff = this.getRaftParameterDifferences();
				const policy_diff = this.getPolicyDifferences();
				const capability_diff = this.getCapabilityDifferences();
				const consenter_diff = this.getConsenterDifferences();
				const msp_diff = this.getMSPDifferences();
				const orderer_msp_diff = this.getOrdererMSPDifferences();
				SignatureRestApi.submitRequest(this.props.request, this.props.submit_msp, this.props.submit_identity)
					.then(() => {
						this.buildMessage(member_diff, 'Member');
						this.buildMessage(acl_diff, 'ACL');
						this.buildMessage(block_params_diff, 'Block Params');
						this.buildMessage(raft_params_diff, 'Raft Params');
						this.buildMessage(policy_diff, 'Policy');
						this.buildMessage(capability_diff, 'Capability');
						this.buildMessage(consenter_diff, 'Consenter');
						this.buildMessage(msp_diff, 'MSP');
						this.buildMessage(orderer_msp_diff, 'Orderer MSP');
						if (this.props.onComplete) {
							this.props.onComplete(true);
						}
						resolve();
					})
					.catch(err => {
						Log.error(err);
						this.buildMessage(member_diff, 'Member', 'error');
						this.buildMessage(acl_diff, 'ACL', 'error');
						this.buildMessage(block_params_diff, 'Block Params', 'error');
						this.buildMessage(raft_params_diff, 'Raft Params', 'error');
						this.buildMessage(policy_diff, 'Policy', 'error');
						this.buildMessage(capability_diff, 'Capability', 'error');
						this.buildMessage(consenter_diff, 'Consenter', 'error');
						this.buildMessage(msp_diff, 'MSP', 'error');
						this.buildMessage(orderer_msp_diff, 'Orderer MSP', 'error');
						let details = err;
						let title = 'error_signature_failed';
						if (_.has(err, 'stitch_msg') && _.includes(err.stitch_msg, 'no Raft leader')) {
							title = 'error_no_raft_leader';
							details = err.stitch_msg;
						} else if (
							_.has(err, 'grpc_resp') &&
							(_.includes(err.grpc_resp.statusMessage, 'existing config does not contain element for') ||
								_.includes(err.grpc_resp.statusMessage, 'Attempted to include a member which is not in the consortium'))
						) {
							title = 'channel_error_nomember';
							details = err.stitch_msg;
						} else if (
							_.has(err, 'grpc_resp') &&
							_.includes(err.grpc_resp.statusMessage, 'error applying config update to existing channel') &&
							_.includes(err.grpc_resp.statusMessage, 'be at version 0, but it is currently at version 1')
						) {
							title = 'channel_exists';
							details = err.stitch_msg;
						}
						reject({
							title,
							details,
						});
					});
			}
		}).catch(e => {
			Log.error('unable to submit - caught error during signature submission');
			Log.error(e);
		});
	};

	buildMessage(diff, type, status = 'success') {
		const opt = {
			log: type,
			status,
			code: status === 'success' ? 200 : 500
		};
		if (diff.added) {
			if (status === 'success') {
				opt.log = `${opt.log} added to channel`;
			} else {
				opt.log = `${opt.log} failed to add in channel`;
			}
		} else if (diff.updated) {
			if (status === 'success') {
				opt.log = `${opt.log} updated to channel`;
			} else {
				opt.log = `${opt.log} failed to update in channel`;
			}
		} else if (diff.removed) {
			if (status === 'success') {
				opt.log = `${opt.log} removed from channel`;
			} else {
				opt.log = `${opt.log} failed to remove from channel`;
			}
		} else {
			return;
		}
		opt.log = `${opt.log} ${this.props.request.channel}`;
		EventsRestApi.recordActivity(opt);
	}

	getChannelRoles(data) {
		const roles = {};
		data.Admins.policy.value.identities.forEach(id => {
			const msp_id = id.principal.msp_identifier;
			if (!roles[msp_id]) {
				roles[msp_id] = '';
			}
			roles[msp_id] = roles[msp_id] + 'a';
		});
		data.Writers.policy.value.identities.forEach(id => {
			const msp_id = id.principal.msp_identifier;
			if (!roles[msp_id]) {
				roles[msp_id] = '';
			}
			roles[msp_id] = roles[msp_id] + 'w';
		});
		data.Readers.policy.value.identities.forEach(id => {
			const msp_id = id.principal.msp_identifier;
			if (!roles[msp_id]) {
				roles[msp_id] = '';
			}
			roles[msp_id] = roles[msp_id] + 'r';
		});
		return roles;
	}

	getMemberDifferences() {
		const diff = {};
		if (this.props?.request?.json_diff?.members) {
			const current_roles = this.getChannelRoles(this.props.request.json_diff.members.current);
			const updated_roles = this.getChannelRoles(this.props.request.json_diff.members.updated);
			for (let msp_id in updated_roles) {
				if (!current_roles[msp_id]) {
					if (!diff.added) {
						diff.added = {};
					}
					diff.added[msp_id] = updated_roles[msp_id];
				} else {
					if (current_roles[msp_id] !== updated_roles[msp_id]) {
						if (!diff.updated) {
							diff.updated = {};
						}
						diff.updated[msp_id] = updated_roles[msp_id];
					}
				}
			}
			for (let msp_id in current_roles) {
				if (!updated_roles[msp_id]) {
					if (!diff.removed) {
						diff.removed = {};
					}
					diff.removed[msp_id] = current_roles[msp_id];
				}
			}
		}
		return diff;
	}

	hasPermission(data, permission) {
		let p = -1;
		if (data.updated) {
			p = data.updated.indexOf(permission);
		} else {
			p = data.indexOf(permission);
		}
		return p > -1;
	}

	renderPolicyMemberTable(data, translate) {
		if (!data) {
			return;
		}
		return (
			<div>
				<h3>{translate('channel_organizations')}</h3>
				<div className="ibp-policy-table">
					<div className="ibp-policy-table-row">
						<div className="ibp-policy-table-cell">{translate('organizations')}</div>
						<div className="ibp-policy-table-cell">{translate('permissions')}</div>
					</div>
					{Object.keys(data).map(msp_id => {
						return (
							<div className="ibp-policy-table-row"
								key={msp_id}
							>
								<div className="ibp-policy-table-cell">
									<div className="ibp-policy-org">
										<TextInput readOnly={true}
											disabled
											value={msp_id}
										/>
									</div>
								</div>
								<div className="ibp-policy-table-cell">
									<div className="ibp-permission">
										<Checkbox
											defaultChecked={this.hasPermission(data[msp_id], 'a')}
											labelText={translate('operator')}
											disabled={true}
											hideLabel={false}
											id={msp_id + '_operator'}
										/>
									</div>
									<div className="ibp-permission">
										<Checkbox
											defaultChecked={this.hasPermission(data[msp_id], 'w')}
											labelText={translate('writer')}
											disabled={true}
											hideLabel={false}
											id={msp_id + '_writer'}
										/>
									</div>
									<div className="ibp-permission">
										<Checkbox
											defaultChecked={this.hasPermission(data[msp_id], 'r')}
											labelText={translate('reader')}
											disabled={true}
											hideLabel={false}
											id={msp_id + '_reader'}
										/>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		);
	}

	renderPolicyACLTable(data, translate) {
		if (!data) {
			return;
		}
		return (
			<div>
				<h3>{translate('channel_acls')}</h3>
				<div className="ibp-policy-table">
					<div className="ibp-policy-table-row">
						<div className="ibp-policy-table-cell">{translate('resource')}</div>
						<div className="ibp-policy-table-cell">{translate('policy_ref')}</div>
					</div>
					{Object.keys(data).map(res => {
						return (
							<div className="ibp-policy-table-row"
								key={res}
							>
								<div className="ibp-policy-table-cell">{res}</div>
								<div className="ibp-policy-table-cell">
									<span>{data[res]}</span>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		);
	}

	getACLDifferences() {
		const diff = {};
		if (this.props?.request?.json_diff?.acl) {
			let current = this.props.request.json_diff.acl.current;
			if (!current) {
				current = {};
			}
			let updated = this.props.request.json_diff.acl.updated;
			if (!updated) {
				updated = {};
			}
			for (let resource in updated) {
				if (!current[resource]) {
					if (!diff.added) {
						diff.added = {};
					}
					diff.added[resource] = updated[resource].policy_ref;
				} else {
					if (current[resource].policy_ref !== updated[resource].policy_ref) {
						if (!diff.updated) {
							diff.updated = {};
						}
						diff.updated[resource] = updated[resource].policy_ref;
					}
				}
			}
			for (let resource in current) {
				if (!updated[resource]) {
					if (!diff.removed) {
						diff.removed = {};
					}
					diff.removed[resource] = current[resource].policy_ref;
				}
			}
		}
		return diff;
	}

	getBlockParameterDifferences() {
		const diff = {};
		if (this.props?.request?.json_diff?.block_params) {
			let current = this.props.request.json_diff.block_params.current;
			if (!current) {
				current = {};
			}
			let updated = this.props.request.json_diff.block_params.updated;
			if (!updated) {
				updated = {};
			}
			if (bytes.parse(current.absolute_max_bytes) !== bytes.parse(updated.absolute_max_bytes)) {
				if (!diff.updated) {
					diff.updated = {};
				}
				diff.updated.absolute_max_bytes = updated.absolute_max_bytes;
			}
			if (current.max_message_count !== updated.max_message_count) {
				if (!diff.updated) {
					diff.updated = {};
				}
				diff.updated.max_message_count = updated.max_message_count;
			}
			if (bytes.parse(current.preferred_max_bytes) !== bytes.parse(updated.preferred_max_bytes)) {
				if (!diff.updated) {
					diff.updated = {};
				}
				diff.updated.preferred_max_bytes = updated.preferred_max_bytes;
			}
			if (parse(current.timeout) !== parse(updated.timeout)) {
				if (!diff.updated) {
					diff.updated = {};
				}
				diff.updated.timeout = updated.timeout;
			}
		}
		return diff;
	}

	getRaftParameterDifferences() {
		const diff = {};
		if (this.props?.request?.json_diff?.raft_params) {
			let current = this.props.request.json_diff.raft_params.current;
			if (!current) {
				current = {};
			}
			let updated = this.props.request.json_diff.raft_params.updated;
			if (!updated) {
				updated = {};
			}
			if (bytes.parse(current.snapshot_interval_size) !== bytes.parse(updated.snapshot_interval_size)) {
				if (!diff.updated) {
					diff.updated = {};
				}
				diff.updated.snapshot_interval_size = updated.snapshot_interval_size;
			}
			if (current.election_tick !== updated.election_tick) {
				if (!diff.updated) {
					diff.updated = {};
				}
				diff.updated.election_tick = updated.election_tick;
			}
			if (current.heartbeat_tick !== updated.heartbeat_tick) {
				if (!diff.updated) {
					diff.updated = {};
				}
				diff.updated.heartbeat_tick = updated.heartbeat_tick;
			}
			if (current.max_inflight_blocks !== updated.max_inflight_blocks) {
				if (!diff.updated) {
					diff.updated = {};
				}
				diff.updated.max_inflight_blocks = updated.max_inflight_blocks;
			}
			if (parse(current.tick_interval) !== parse(updated.tick_interval)) {
				if (!diff.updated) {
					diff.updated = {};
				}
				diff.updated.tick_interval = updated.tick_interval;
			}
		}
		return diff;
	}

	getPolicyDifferences() {
		const diff = {};
		if (this.props?.request?.json_diff?.policy) {
			let current = this.props.request.json_diff.policy.current;
			if (!current) {
				current = {};
			}
			let updated = this.props.request.json_diff.policy.updated;
			if (!updated) {
				updated = {};
			}
			if (current.n !== updated.n || current.outOf !== updated.outOf) {
				diff.updated = {
					policy: updated,
				};
			}
		}
		return diff;
	}

	getCapabilityDifferences() {
		const diff = {};
		if (this.props?.request?.json_diff?.capabilities) {
			let currentCapabilities = this.props.request.json_diff.capabilities.current;
			let current = {
				channel: Helper.getCapabilityHighestVersion(currentCapabilities.channel),
				orderer: Helper.getCapabilityHighestVersion(currentCapabilities.orderer),
				application: Helper.getCapabilityHighestVersion(currentCapabilities.application),
			};

			let updatedCapabilities = this.props.request.json_diff.capabilities.updated;
			let updated = {
				channel: Helper.getCapabilityHighestVersion(updatedCapabilities.channel),
				orderer: Helper.getCapabilityHighestVersion(updatedCapabilities.orderer),
				application: Helper.getCapabilityHighestVersion(updatedCapabilities.application),
			};

			if (semver.neq(semver.coerce(current.channel), semver.coerce(updated.channel))) {
				if (!diff.updated) {
					diff.updated = {};
				}
				diff.updated.channel = updated.channel;
			}
			if (semver.neq(semver.coerce(current.orderer), semver.coerce(updated.orderer))) {
				if (!diff.updated) {
					diff.updated = {};
				}
				diff.updated.orderer = updated.orderer;
			}
			if (semver.neq(semver.coerce(current.application), semver.coerce(updated.application))) {
				if (!diff.updated) {
					diff.updated = {};
				}
				diff.updated.application = updated.application;
			}
		}
		return diff;
	}

	checkNodesVersion = async data => {
		const updatedApplicationCapability = Helper.getCapabilityHighestVersion(this.props.request.json_diff.capabilities.updated.application);
		const updatedOrdererCapability = Helper.getCapabilityHighestVersion(this.props.request.json_diff.capabilities.updated.orderer);
		const updatedChannelCapability = Helper.getCapabilityHighestVersion(this.props.request.json_diff.capabilities.updated.channel);

		if (updatedApplicationCapability.indexOf('V2') === 0 || updatedOrdererCapability.indexOf('V2') === 0 || updatedChannelCapability.indexOf('V2') === 0) {
			// Block signature if updating capability to 2.0 but node binaries are not at version 2.0
			try {
				const channel = await ChannelApi.getChannel(this.props.request.channel);
				const channelOrderers = [];
				channel.orderers.forEach(x => x.raft.forEach(node => channelOrderers.push(node)));
				const { channel_warning_20, channel_warning_20_details } = Helper.validateCapability20Update(
					updatedApplicationCapability,
					updatedOrdererCapability,
					updatedChannelCapability,
					channel.peers,
					channelOrderers
				);
				this.props.updateState(SCOPE, {
					channel_warning_20,
					channel_warning_20_details,
				});
			} catch (err) {
				console.log('Channel info not found, so cannot check if node binaries are at correct level');
			}
		}
	};

	getConsenterDifferences() {
		const diff = {};
		if (this.props?.request?.json_diff?.consenters) {
			let current = {};
			this.props.request.json_diff.consenters.current.forEach(x => {
				current[x.host + ':' + x.port] = x;
			});

			let updated = {};
			this.props.request.json_diff.consenters.updated.forEach(x => {
				updated[x.host + ':' + x.port] = x;
			});

			for (let consenter in updated) {
				if (!current[consenter]) {
					if (!diff.added) {
						diff.added = {};
					}
					diff.added[consenter] = updated[consenter];
				}
			}
			for (let consenter in current) {
				if (!updated[consenter]) {
					if (!diff.removed) {
						diff.removed = {};
					}
					diff.removed[consenter] = current[consenter];
				}
			}
			for (let consenter in updated) {
				if (current[consenter] && current[consenter].client_tls_cert !== updated[consenter].client_tls_cert) {
					if (!diff.updated) {
						diff.updated = {};
					}
					diff.updated.consenter = {
						name: updated[consenter].host + ':' + updated[consenter].port,
						cert: updated[consenter].client_tls_cert,
					};
				}
			}
		}
		return diff;
	}

	getOrdererMSPDifferences() {
		const diff = {};
		if (this.props?.request?.json_diff?.orderer_msps) {
			const current = this.props.request.json_diff.orderer_msps.current;
			const updated = this.props.request.json_diff.orderer_msps.updated;
			for (let msp_id in updated) {
				if (!current[msp_id]) {
					if (!diff.added) {
						diff.added = {};
					}
					diff.added[msp_id] = updated[msp_id];
				}
			}
			for (let msp_id in current) {
				if (!updated[msp_id]) {
					if (!diff.removed) {
						diff.removed = {};
					}
					diff.removed[msp_id] = current[msp_id];
				}
			}
		}
		return diff;
	}

	getMSPDifferences() {
		const diff = {};
		if (this.props?.request?.json_diff?.msp) {
			diff.updated = [];
			let current = this.props.request.json_diff.msp.current;
			if (!current) {
				current = {};
			}
			let updated = this.props.request.json_diff.msp.updated;
			if (!updated) {
				updated = {};
			}
			if (current.display_name !== updated.display_name) {
				diff.updated.push('display_name');
			}
			if (_.xor(current.root_certs, updated.root_certs).length > 0) {
				diff.updated.push('root_certs');
			}
			if (_.xor(current.admins, updated.admins).length > 0) {
				diff.updated.push('admins');
			}
			if (_.xor(current.intermediate_certs, updated.intermediate_certs).length > 0) {
				diff.updated.push('intermediate_certs');
			}
			if (_.xor(current.tls_root_certs, updated.tls_root_certs).length > 0) {
				diff.updated.push('tls_root_certs');
			}
			if (_.xor(current.tls_intermediate_certs, updated.tls_intermediate_certs).length > 0) {
				diff.updated.push('tls_intermediate_certs');
			}
			if (_.xor(current.organizational_unit_identifiers, updated.organizational_unit_identifiers).length > 0) {
				diff.updated.push('organizational_unit_identifiers');
			}
			if (current.fabric_node_ous !== updated.fabric_node_ous) {
				diff.updated.push('fabric_node_ous');
			}
			if (_.xor(current.revocation_list, updated.revocation_list).length > 0) {
				diff.updated.push('revocation_list');
			}
		}
		return diff;
	}

	renderPolicyUpdate(data, translate) {
		if (!data) {
			return;
		}
		return (
			<div>
				<h3>{translate('channel_update_policy')}</h3>
				<div className="ibp-channel-policy-update">
					{translate('channel_specific_policy', {
						count: data.policy.n,
						total: data.policy.outOf,
					})}
				</div>
			</div>
		);
	}

	renderBlockParameterUpdate(data, translate) {
		if (!data || (!data.absolute_max_bytes && !data.max_message_count && !data.preferred_max_bytes && !data.timeout)) {
			return;
		}
		const fields = [];
		if (data.max_message_count) {
			fields.push({
				name: 'max_message_count',
				default: data.max_message_count,
				readonly: true,
			});
		}
		if (data.absolute_max_bytes) {
			fields.push({
				name: 'absolute_max_bytes',
				default: data.absolute_max_bytes,
				readonly: true,
			});
		}
		if (data.preferred_max_bytes) {
			fields.push({
				name: 'preferred_max_bytes',
				default: data.preferred_max_bytes,
				readonly: true,
			});
		}
		if (data.timeout) {
			fields.push({
				name: 'timeout',
				default: data.timeout,
				readonly: true,
			});
		}
		return (
			<div>
				<h3>{translate('block_cutting_params')}</h3>
				<div>
					<Form id="block_params"
						scope={SCOPE + '_block_params'}
						fields={fields}
					/>
				</div>
			</div>
		);
	}

	renderRaftParameterUpdate(data, translate) {
		if (!data || (!data.tick_interval && !data.election_tick && !data.heartbeat_tick && !data.max_inflight_blocks && !data.snapshot_interval_size)) {
			return;
		}
		const fields = [];
		if (data.tick_interval) {
			fields.push({
				name: 'tick_interval',
				default: data.tick_interval,
				readonly: true,
			});
		}
		if (data.election_tick) {
			fields.push({
				name: 'election_tick',
				default: data.election_tick,
				readonly: true,
			});
		}
		if (data.heartbeat_tick) {
			fields.push({
				name: 'heartbeat_tick',
				default: data.heartbeat_tick,
				readonly: true,
			});
		}
		if (data.max_inflight_blocks) {
			fields.push({
				name: 'max_inflight_blocks',
				default: data.max_inflight_blocks,
				readonly: true,
			});
		}
		if (data.snapshot_interval_size) {
			fields.push({
				name: 'snapshot_interval_size',
				default: data.snapshot_interval_size,
				readonly: true,
			});
		}
		return (
			<div>
				<h3>{translate('raft_params')}</h3>
				<div>
					<Form id="raft_params"
						scope={SCOPE + '_raft_params'}
						fields={fields}
					/>
				</div>
			</div>
		);
	}

	renderCapabilityUpdate(data, translate) {
		if (!data || (!data.channel && !data.orderer && !data.application)) {
			return;
		}
		const fields = [];
		if (data.channel) {
			fields.push({
				name: 'channel_capability',
				default: data.channel,
				readonly: true,
			});
		}
		if (data.application) {
			fields.push({
				name: 'application_capability',
				default: data.application,
				readonly: true,
			});
		}
		if (data.orderer) {
			fields.push({
				name: 'orderer_capability',
				default: data.orderer,
				readonly: true,
			});
		}
		return (
			<div>
				<h3>{translate('channel_capabilities')}</h3>
				<div>
					<Form id="channel_capabilities"
						scope={SCOPE + '_capabilities'}
						fields={fields}
					/>
				</div>
			</div>
		);
	}

	renderMSPUpdate(data, translate) {
		if (!data || data.length === 0) {
			return;
		}
		return (
			<div>
				<h3>{translate('msp_definition')}</h3>
				<br />
				<div>
					{translate('msp_definition_updates', {
						channel: this.props.request.channel,
						fields: data,
					})}
				</div>
			</div>
		);
	}

	renderConsenterUpdate(data, translate) {
		if (!data || data.length === 0) {
			return;
		}
		return (
			<div>
				<h3>{translate('consenter_certs')}</h3>
				<br />
				<div>
					{translate('consenter_updates', {
						channel: this.props.request.channel,
					})}
				</div>
			</div>
		);
	}

	renderConsenterTable(data, translate) {
		if (!data) {
			return;
		}
		return (
			<div>
				<h3>{translate('channel_consenter')}</h3>
				<div className="ibp-policy-table">
					<div className="ibp-policy-table-row">
						<div className="ibp-policy-table-cell">{translate('host')}</div>
						<div className="ibp-policy-table-cell">{translate('port')}</div>
					</div>
					{Object.keys(data).map(res => {
						return (
							<div className="ibp-policy-table-row"
								key={res}
							>
								<div className="ibp-policy-table-cell">{data[res].host}</div>
								<div className="ibp-policy-table-cell">{data[res].port}</div>
							</div>
						);
					})}
				</div>
			</div>
		);
	}

	renderOrdererMspTable(data, translate) {
		if (!data) {
			return;
		}
		return (
			<div>
				<h3>{translate('orderer_admin_set')}</h3>
				<div className="ibp-policy-table">
					{Object.keys(data).map(res => {
						return (
							<div className="ibp-policy-table-row"
								key={res}
							>
								<div className="ibp-policy-table-cell">{res}</div>
							</div>
						);
					})}
				</div>
			</div>
		);
	}

	renderChannelUpdate(translate) {
		if (!this.props.request.json_diff) {
			return;
		}
		const member_diff = this.getMemberDifferences();
		const acl_diff = this.getACLDifferences();
		const block_params_diff = this.getBlockParameterDifferences();
		const raft_params_diff = this.getRaftParameterDifferences();
		const policy_diff = this.getPolicyDifferences();
		const capability_diff = this.getCapabilityDifferences();
		const consenter_diff = this.getConsenterDifferences();
		const msp_diff = this.getMSPDifferences();
		const orderer_msp_diff = this.getOrdererMSPDifferences();
		const added = !!(member_diff.added || acl_diff.added || consenter_diff.added || orderer_msp_diff.added);
		const updated = !!(
			member_diff.updated ||
			acl_diff.updated ||
			block_params_diff.updated ||
			policy_diff.updated ||
			capability_diff.updated ||
			raft_params_diff.updated ||
			msp_diff.updated ||
			consenter_diff.updated
		);
		const removed = !!(member_diff.removed || acl_diff.removed || consenter_diff.removed || orderer_msp_diff.removed);
		return (
			<WizardStep type="WizardStep">
				{added && (
					<div className="ibp-policy-added">
						{translate('added_to_channel_policy')}
						<div className="ibp-policy-box">
							{this.renderPolicyMemberTable(member_diff.added, translate)}
							{this.renderPolicyACLTable(acl_diff.added, translate)}
							{this.renderConsenterTable(consenter_diff.added, translate)}
							{this.renderOrdererMspTable(orderer_msp_diff.added, translate)}
						</div>
					</div>
				)}
				{updated && (
					<div className="ibp-policy-updated">
						{translate('updated_in_channel_policy')}
						<div className="ibp-policy-box">
							{this.renderPolicyMemberTable(member_diff.updated, translate)}
							{this.renderPolicyUpdate(policy_diff.updated, translate)}
							{this.renderPolicyACLTable(acl_diff.updated, translate)}
							{this.renderBlockParameterUpdate(block_params_diff.updated, translate)}
							{this.renderRaftParameterUpdate(raft_params_diff.updated, translate)}
							{this.renderCapabilityUpdate(capability_diff.updated, translate)}
							{this.renderMSPUpdate(msp_diff.updated, translate)}
							{this.renderConsenterUpdate(consenter_diff.updated, translate)}
						</div>
					</div>
				)}
				{removed && (
					<div className="ibp-policy-removed">
						{translate('removed_from_channel_policy')}
						<div className="ibp-policy-box">
							{this.renderPolicyMemberTable(member_diff.removed, translate)}
							{this.renderPolicyACLTable(acl_diff.removed, translate)}
							{this.renderConsenterTable(consenter_diff.removed, translate)}
							{this.renderOrdererMspTable(orderer_msp_diff.removed, translate)}
						</div>
					</div>
				)}
			</WizardStep>
		);
	}

	render() {
		// For Orderer MSP update, only orderer signature matters
		const approved = _.has(this.props.request.json_diff, 'msp') ? true : this.props.signatureCount >= this.props.request.current_policy.number_of_signatures;
		const ordererApproved = _.size(this.props.request.orderers2sign) === 0 ? true : _.some(this.props.request.orderers2sign, orderer => orderer.signature);

		let onSubmit = undefined;
		const pendingSignature = _.size(this.props.orgs2sign) > 0 || _.size(this.props.orderers2sign) > 0;
		const waitForOrdererSignature =
			!pendingSignature && // If no signatures needed from this console,
			_.size(this.props.request.orderers2sign) > 0 && // but an orderer signature is required for this request,
			!ordererApproved; // and no orderer has signed yet, it means we are waiting for orderer from different console to sign
		if (this.props.request.status === 'open') {
			if (waitForOrdererSignature) {
				console.log('Pending signature from orderer that is imported from another console');
			} else if (pendingSignature || approved) {
				onSubmit = this.onSubmit;
			}
		}
		let title = 'new_channel_request';
		let desc = 'new_channel_request_desc';
		if (this.props.request.json_diff) {
			title = 'channel_policy_update';
			desc = 'channel_policy_update_desc';
			if (approved) {
				desc = 'channel_policy_update_approved';
			}
		} else if (waitForOrdererSignature) {
			title = 'new_channel_pending_request';
			desc = 'new_channel_pending_request_desc';
		}
		const translate = this.props.t;
		let disableSubmit = false;
		if (!approved || !ordererApproved) {
			if (!this.props.signatureData && !this.props.ordererData) {
				disableSubmit = true;
			}
		} else {
			if (!_.isObject(this.props.submit_msp) || !_.isObject(this.props.submit_identity)) {
				disableSubmit = true;
			}
		}
		if (this.props.channel_warning_20) {
			disableSubmit = true;
		}
		return (
			<Wizard
				title={title}
				largePanel={true}
				onClose={this.props.closed}
				loading={this.props.loading}
				onSubmit={onSubmit}
				submitButtonLabel={translate(this.getSubmitButtonLabel(approved && ordererApproved))}
				cancelButtonId="close"
				cancelButtonLabel={translate('close')}
			>
				<p>
					<Trans>{translate(desc, {
						org: this.props.request.originator_msp,
						channel: this.props.request.channel,
						number_of_signatures: this.props.request.current_policy.number_of_signatures,
					})}</Trans>
				</p>
				{this.renderChannelUpdate(translate)}
				{!!onSubmit && (
					<WizardStep type="WizardStep"
						disableSubmit={disableSubmit}
					>
						{(!approved || !ordererApproved) && this.renderSignatures(translate)}
						{approved && ordererApproved && this.renderSubmit(translate)}
					</WizardStep>
				)}
			</Wizard>
		);
	}
}

const dataProps = {
	orgs2sign: PropTypes.array,
	loading: PropTypes.bool,
	signatureCount: PropTypes.number,
	signatureData: PropTypes.object,
	submit_msp: PropTypes.object,
	identities: PropTypes.object,
	submit_identity: PropTypes.object,
	submit_identity_options: PropTypes.object,
	member_msps: PropTypes.array,
	orderer_msps: PropTypes.array,
	ordererData: PropTypes.object,
	orderers2sign: PropTypes.array,
	channel_warning_20: PropTypes.bool,
	channel_warning_20_details: PropTypes.array,
};

SignatureDetailModal.propTypes = {
	...dataProps,
	msps: PropTypes.array,
	request: PropTypes.object,
	onClose: PropTypes.func,
	onComplete: PropTypes.func,
	updateState: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['host_url'] = state['settings'] ? state['settings']['host_url'] : null;
		newProps['onClose'] = state['signatureCollection'] ? state['signatureCollection']['onClose'] : null;
		return newProps;
	},
	{
		updateState,
	},
	null,
	{
		forwardRef: true,
	}
)(withTranslation()(SignatureDetailModal));
