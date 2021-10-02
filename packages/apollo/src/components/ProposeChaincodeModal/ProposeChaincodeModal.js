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
import { ContentSwitcher, Switch, TextArea, TextInput, Toggle } from 'carbon-components-react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { promisify } from 'util';
import { updateState } from '../../redux/commonActions';
import ChannelApi from '../../rest/ChannelApi';
import { OrdererRestApi } from '../../rest/OrdererRestApi';
import { PeerRestApi } from '../../rest/PeerRestApi';
import SignatureRestApi from '../../rest/SignatureRestApi';
import Helper from '../../utils/helper';
import PolicyHelper from '../../utils/policy';
import BlockchainTooltip from '../BlockchainTooltip/BlockchainTooltip';
import FileUploader from '../FileUploader/FileUploader';
import Form from '../Form/Form';
import ImportantBox from '../ImportantBox/ImportantBox';
import Logger from '../Log/Logger';
import MSPAndIdentityPair from '../MSPAndIdentityPair/MSPAndIdentityPair';
import SidePanelWarning from '../SidePanelWarning/SidePanelWarning';
import SVGs from '../Svgs/Svgs';
import TranslateLink from '../TranslateLink/TranslateLink';
import Wizard from '../Wizard/Wizard';
import WizardStep from '../WizardStep/WizardStep';

const naturalSort = require('javascript-natural-sort');
const SCOPE = 'proposeChaincodeModal';
const Log = new Logger(SCOPE);

class ProposeChaincodeModal extends React.Component {
	componentDidMount() {
		this.pkg_uint8 = null;
		this.props.updateState(SCOPE, {
			propose_org: null,
			propose_identity: null,
			upload_pkg: true,
			pkg: null,
			pkg_id: null,
			pkg_version: null,
			parsing: false,
			init_required: false,
			install_all_peers: true,
			selected_peers: [...this.props.peerList],
			policy: 'explicit',
			implicit_policy: 'majority',
			explicit_specific_num: '1',
			explicit_policy: [],
			existing_pkgs: null,
			loading_pkgs: false,
			advanced_policy: '',
			advanced_policy_error: false,
			private_data_json: null,
			private_data_filename: null,
			lifecycle_policy: null,
			policy_default: true,
			endorsement_policy: null,
			pkg_error: null,
			existing_proposals: null,
		});
		this.getChannelInformation();
		this.getExisingProposals();
	}

	componentWillUnmount() {}

	async getChannelInformation() {
		try {
			let options = {
				channelId: this.props.channel.id,
				ordererId: this.props.ordererList[0].id,
				configtxlator_url: this.props.configtxlator_url,
			};
			const block = await OrdererRestApi.getChannelConfigBlock(options);
			const _block_binary2json = promisify(ChannelApi._block_binary2json);
			const resp = await _block_binary2json(block, this.props.configtxlator_url);
			let endorsement_policy = _.get(resp, 'data.data[0].payload.data.config.channel_group.groups.Application.policies.Endorsement.policy');
			if (endorsement_policy) {
				let rule = null;
				if (endorsement_policy.type === 3) {
					rule = _.get(endorsement_policy, 'value.rule');
				}
				if (rule === 'MAJORITY' || rule === 'ALL' || rule === 'ANY') {
					endorsement_policy = rule.toLowerCase();
				} else {
					endorsement_policy = null;
				}
			}
			const lifecycle_policy = _.get(resp, 'data.data[0].payload.data.config.channel_group.groups.Application.policies.LifecycleEndorsement.policy');
			this.props.updateState(SCOPE, {
				endorsement_policy,
				lifecycle_policy,
			});
		} catch (error) {
			Log.error(error);
		}
	}

	async getExisingProposals() {
		this.props.updateState(SCOPE, {
			existing_proposals: null,
		});
		const existing_proposals = {};
		const requests = await SignatureRestApi.getAllRequests();
		if (requests) {
			requests.forEach(request => {
				if (request.ccd && request.status === 'open' && request.channel === this.props.channel.id) {
					existing_proposals[request.ccd.chaincode_id] = {
						...request.ccd,
						tx_id: request.tx_id,
					};
				}
			});
		}
		this.props.updateState(SCOPE, {
			existing_proposals,
		});
	}

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

	onSubmit = async() => {
		const cc_pkg = await this.getSelectedChaincodePackage();
		const package_id = await this.installChaincodePackageOnSelectedPeers(cc_pkg);

		let endorsement_policy = null;
		if (!this.props.policy_default) {
			if (this.props.policy === 'explicit') {
				endorsement_policy = this.getPolicyText();
			}
			if (this.props.policy === 'advanced') {
				endorsement_policy = this.props.advanced_policy;
			}
		}
		const number_of_signatures = PolicyHelper.getApprovalCountForPolicy(this.props.lifecycle_policy, this.props.members.length);
		const opts = {
			channel_id: this.props.channel.id,
			msp_id: this.props.propose_org.msp_id,
			cert: this.props.propose_identity.cert,
			private_key: this.props.propose_identity.private_key,
			package_id,
			id: this.props.pkg_id,
			version: this.props.pkg_version,
			endorsement_policy,
			members: this.props.members,
			number_of_signatures,
			private_data_json: this.props.private_data_json,
			selected_peers: this.props.selected_peers,
			configtxlator_url: this.props.configtxlator_url,
			init_required: this.props.init_required ? this.props.init_required : false,
		};
		if (this.props.existing_proposals && this.props.existing_proposals[this.props.pkg_id]) {
			opts.tx_id = this.props.existing_proposals[this.props.pkg_id].tx_id;
		}
		await ChannelApi.createOrApproveChaincodeProposal(opts);

		if (this.props.onComplete) {
			this.props.onComplete();
		}
		return;
	};

	getPeersForOrg = async() => {
		const orgPeerList = [];
		if (this.props.peerList) {
			this.props.peerList.forEach(peer => {
				if (peer.msp_id === this.props.propose_org.msp_id) {
					orgPeerList.push(peer);
				}
			});
		}
		this.props.updateState(SCOPE, {
			orgPeerList,
			selected_peers: [...orgPeerList],
		});
		if (orgPeerList.length < 1) {
			throw String('propose_no_peers');
		}
	};

	renderSelectOrg() {
		return (
			<WizardStep
				type="WizardStep"
				title="select_your_org"
				disableSubmit={!(this.props.propose_org && this.props.propose_identity)}
				onNext={this.getPeersForOrg}
			>
				<p className="ibp-modal-text">{this.props.translate('propose_chaincode_desc_1')}</p>
				<p className="ibp-modal-text">{this.props.translate('propose_chaincode_desc_2')}</p>
				<MSPAndIdentityPair
					id="propose_chaincode"
					scope={SCOPE}
					msp_field={{
						name: 'propose_org',
						label: 'propose_org',
						tooltip: 'propose_org_tooltip',
						required: true,
					}}
					identity_field={{
						name: 'propose_identity',
						label: 'propose_identity',
						tooltip: 'propose_identity_tooltip',
						required: true,
					}}
					msps={this.props.members}
				/>
			</WizardStep>
		);
	}

	async parsePackage(pkg) {
		let pkg_id = null;
		let pkg_version = null;
		let pkg_error = null;
		let data = null;
		this.props.updateState(SCOPE, {
			pkg_id,
			pkg_version,
			pkg_error,
			parsing: true,
		});
		try {
			data = await Helper.readLocalChaincodePackageFile(pkg);
		} catch (error) {
			pkg_error = error;
		}

		this.pkg_uint8 = data ? data.uint8 : null;
		this.props.updateState(SCOPE, {
			pkg_id: data.pkg_id,
			pkg_version: data.pkg_version,
			pkg_error,
			parsing: false,
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
					accept={['.gz', '.tgz']}
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
							invalidText={this.props.pkg_error && this.props.translate(this.props.pkg_error)}
							invalid={this.props.pkg_error ? true : false}
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
				{this.props.pkg && !this.props.parsing && !this.props.pkg_id && !this.props.pkg_error && (
					<div className="ibp-error-panel">
						<SidePanelWarning title=""
							subtitle="propose_parsing_error_txt"
						/>
					</div>
				)}
			</div>
		);
	}

	async getExistingPackages() {
		this.props.updateState(SCOPE, { loading_pkgs: true });
		const existing = {};
		if (this.props.peerList) {
			for (let i = 0; i < this.props.peerList.length; i++) {
				const peer = this.props.peerList[i];
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

	renderExistingPackage() {
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
								default: 'choose_a_pkg',
							},
						]}
						onChange={data => {
							let pkg_id = null;
							let pkg_version = null;
							if (data.pkg.label) {
								let parts = data.pkg.label.split('_');
								if (parts.length > 0) pkg_id = parts[0];
								if (parts.length > 1) pkg_version = parts[1];
							}
							this.props.updateState(SCOPE, {
								pkg_id,
								pkg_version,
							});
						}}
					/>
				)}
			</div>
		);
	}

	renderSelectPackage() {
		return (
			<WizardStep
				type="WizardStep"
				title={this.props.translate('install_chaincode')}
				tooltip={this.props.translate('upload_package_tooltip2')}
				disableSubmit={!_.isObject(this.props.pkg) || this.props.pkg_error}
			>
				<p className="ibp-modal-text">{this.props.translate('propose_chaincode_pkg_desc')}</p>
				<ContentSwitcher
					className="ibp-upload-toggle"
					onChange={() => {
						if (!this.props.existing_pkgs) {
							this.getExistingPackages();
						}
						this.props.updateState(SCOPE, {
							upload_pkg: !this.props.upload_pkg,
							pkg: null,
							pkg_error: null,
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
				{this.props.upload_pkg ? this.renderUploadPackage() : this.renderExistingPackage()}
			</WizardStep>
		);
	}

	renderPackageInformation() {
		let existing = null;
		const loading = this.props.existing_proposals === null;
		if (this.props.pkg_id && this.props.pkg_version && !loading) {
			existing = this.props.existing_proposals[this.props.pkg_id];
		}
		return (
			<WizardStep type="WizardStep"
				title="chaincode_details"
				disableSubmit={!this.props.pkg_id || !this.props.pkg_version || loading}
			>
				<p className="ibp-modal-text">{this.props.translate('propose_package_info')}</p>
				{existing && <ImportantBox text="propose_existing_important"
					opts={existing}
				/>}
				<Form
					scope={SCOPE}
					id={SCOPE + '-pkg-info'}
					fields={[
						{
							name: 'pkg_id',
							tooltip: 'pkg_id_tooltip',
							required: true,
							default: this.props.pkg_id,
							loading,
						},
						{
							name: 'pkg_version',
							tooltip: 'pkg_version_tooltip',
							required: true,
							default: this.props.pkg_version,
							loading,
						},
					]}
				/>
				<div className="ibp-form">
					<div className="ibp-form-field">
						<BlockchainTooltip noIcon
							type="definition"
							tooltipText={<span>{this.props.translate('init_required')}</span>}
						>
							{this.props.translate('init_required')}
						</BlockchainTooltip>
						<Toggle
							id="toggle-init-required"
							toggled={this.props.init_required}
							onToggle={() => {
								this.props.updateState(SCOPE, {
									init_required: !this.props.init_required,
								});
							}}
							onChange={() => {}}
							aria-label={this.props.translate('init_required')}
							labelA={this.props.translate('no')}
							labelB={this.props.translate('yes')}
						/>
					</div>
				</div>
			</WizardStep>
		);
	}

	renderInstall() {
		let disableSubmit = false;
		if (!_.isObject(this.props.pkg)) {
			return;
		}

		if (!this.props.install_all_peers) {
			disableSubmit = true;
			if (this.props.selected_peers && this.props.selected_peers.length) {
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
									data.selected_peers = this.props.orgPeerList ? [...this.props.orgPeerList] : [];
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
				{this.props.orgPeerList && this.props.orgPeerList.length && (
					<>
						{this.props.install_all_peers ? (
							<Form
								scope={SCOPE}
								id={SCOPE + '_select_all_peers'}
								fields={[
									{
										name: 'all_selected_peers',
										label: 'select_peers',
										type: 'multiselect2',
										options: this.props.orgPeerList || [],
										placeholder: 'peers',
										required: true,
										disabled: true,
										hideLabel: true,
										default: this.props.orgPeerList,
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
										options: this.props.orgPeerList || [],
										placeholder: 'peers',
										required: true,
										hideLabel: true,
										default: this.props.selected_peers,
									},
								]}
							/>
						)}
					</>
				)}
			</WizardStep>
		);
	}

	renderImplicitPolicy() {
		if (this.props.policy !== 'implicit') return;
		const fields = [
			{
				name: 'implicit_policy',
				label: 'transaction_endorsement_policy',
				default: this.props.implicit_policy,
				type: 'radio',
				required: true,
				options: [
					{
						id: 'majority',
						label: this.props.translate('majority_orgs_must_endorse'),
					},
					{
						id: 'all',
						label: this.props.translate('all_orgs_must_endorse'),
					},
					{
						id: 'any',
						label: this.props.translate('any_orgs_must_endorse'),
					},
				],
			},
		];
		return <Form scope={SCOPE}
			id={SCOPE + '_implicit_policy'}
			fields={fields}
		/>;
	}

	renderExplicitPolicy() {
		if (this.props.policy !== 'explicit') return;
		const options = [];
		const max = this.props.explicit_policy ? this.props.explicit_policy.length : 1;
		for (let i = 1; i <= max; i++) {
			options.push(String(i));
		}
		return (
			<div className="ibp-explicit-policy-div">
				<Form
					scope={SCOPE}
					id={SCOPE + '_explicit_policy'}
					fields={[
						{
							name: 'explicit_policy',
							label: 'transaction_endorsement_policy',
							type: 'multiselect2',
							options: this.props.members,
							placeholder: 'select_organizations',
							required: true,
							default: this.props.explicit_policy,
						},
						{
							name: 'explicit_specific_num',
							label: 'num_orgs_must_endorse',
							type: 'dropdown',
							default: '1',
							options,
						},
					]}
					onChange={data => {
						if (data.explicit_policy) {
							const num = Number(this.props.explicit_specific_num);
							if (num > data.explicit_policy.length) {
								this.props.updateState(SCOPE, {
									explicit_specific_num: '' + data.explicit_policy.length,
								});
							}
						}
					}}
				/>
			</div>
		);
	}

	retrievePolicyFromJson = event => {
		try {
			let data = JSON.parse(event.target.value);
			this.props.updateState(SCOPE, {
				advanced_policy: JSON.stringify(data, null, 4),
				advanced_policy_error: false,
			});
		} catch (err) {
			this.props.updateState(SCOPE, {
				advanced_policy: null,
				advanced_policy_error: true,
			});
			return;
		}
	};

	renderAdvancedPolicy() {
		if (this.props.policy !== 'advanced') return;
		return (
			<div className="ibp-propose-advanced-policy-div">
				<Form
					scope={SCOPE}
					id={`${SCOPE}-adv-policy-json-textarea`}
					fields={[
						{
							name: 'advanced_policy',
							label: 'manual_policy',
							placeholder: 'manual_policy_placeholder',
							type: 'textarea',
							rows: 8,
							required: true,
							default: this.props.advanced_policy,
							errorMsg: this.props.advanced_policy_error ? 'error_manual_policy_json' : undefined,
						},
					]}
					onChange={data => {
						let advanced_policy_error = false;
						if (data.advanced_policy) {
							// Do we need to do validation?
						}
						this.props.updateState(SCOPE, {
							advanced_policy_error,
						});
					}}
				/>
				<TranslateLink text="manual_policy_reference"
					className="ibp-propose-advanced-policy-learn-more"
				/>
			</div>
		);
	}

	isPolicyValid() {
		if (!this.props.policy_default) {
			if (this.props.policy === 'explicit' && this.props.explicit_policy.length < 1) {
				return false;
			}
			if (this.props.policy === 'advanced' && (!this.props.advanced_policy || this.props.advanced_policy_error)) {
				return false;
			}
		}
		return true;
	}

	getPolicyText() {
		const list = [];
		if (this.props.explicit_policy && this.props.explicit_policy.length) {
			this.props.explicit_policy.forEach(org => {
				if (org.node_ou) {
					list.push('\'' + org.id + '.peer\'');
				} else {
					list.push('\'' + org.id + '.member\'');
				}
			});
		} else {
			this.props.members.forEach(org => {
				if (org.node_ou) {
					list.push('\'' + org.id + '.peer\'');
				} else {
					list.push('\'' + org.id + '.member\'');
				}
			});
		}
		const advanced_policy = 'OutOf(' + this.props.explicit_specific_num + ', ' + list.join(', ') + ')';
		this.props.updateState(SCOPE, {
			advanced_policy,
		});
		return advanced_policy;
	}

	getDefaultPolicyText() {
		let key = 'use_default_policy';
		if (this.props.endorsement_policy) {
			key = key + '_' + this.props.endorsement_policy;
		}
		return this.props.translate(key);
	}

	renderPolicy() {
		const policies = [/*'implicit',*/ 'explicit', 'advanced'];
		let policy_index = this.props.policy ? policies.indexOf(this.props.policy) : 0;
		return (
			<WizardStep type="WizardStep"
				title="propose_policy"
				disableSubmit={!this.isPolicyValid()}
			>
				<p className="ibp-modal-text">{this.props.translate('propose_policy_desc')}</p>
				<ImportantBox kind="informational"
					text="propose_policy_important"
					link="propose_policy_important_link"
				/>
				<div className="ibp-form">
					<div className="ibp-form-field">
						<div>
							<label className="ibp-form-label">{this.getDefaultPolicyText()}</label>
						</div>
						<Toggle
							id="toggle-default-policy"
							toggled={this.props.policy_default}
							onToggle={() => {
								this.props.updateState(SCOPE, {
									policy_default: !this.props.policy_default,
								});
							}}
							onChange={() => {}}
							aria-label={this.props.translate('use_default_policy')}
							labelA={this.props.translate('no')}
							labelB={this.props.translate('yes')}
						/>
					</div>
				</div>
				{!this.props.policy_default && (
					<>
						<ContentSwitcher
							className="ibp-policy-switch"
							selectedIndex={policy_index}
							onChange={evt => {
								this.getPolicyText();
								this.props.updateState(SCOPE, { policy: evt.name });
							}}
						>
							{policies.map(policy => {
								return <Switch kind="button"
									key={policy}
									id={policy}
									name={policy}
									text={this.props.translate(policy)}
								/>;
							})}
						</ContentSwitcher>
						{this.renderImplicitPolicy()}
						{this.renderExplicitPolicy()}
						{this.renderAdvancedPolicy()}
					</>
				)}
			</WizardStep>
		);
	}

	renderPrivateData() {
		return (
			<WizardStep type="WizardStep"
				title="propose_private_data"
				disableSubmit={this.props.private_data_filename && !this.props.private_data_json}
			>
				<p className="ibp-modal-text">{this.props.translate('propose_private_data_desc')}</p>
				<Form
					scope={SCOPE}
					id={SCOPE + '-private-data'}
					fields={[
						{
							name: 'private_data_json',
							type: 'json_file',
						},
					]}
					onChange={(data, valid, field, formProps) => {
						const private_data_filename = _.get(formProps, 'private_data_json.file.name');
						this.props.updateState(SCOPE, { private_data_filename });
					}}
				/>
			</WizardStep>
		);
	}

	renderSummary() {
		let policy = '';
		if (this.props.policy === 'implicit') {
			let key = null;
			if (this.props.implicit_policy === 'majority') {
				key = 'majority_orgs_must_endorse';
			}
			if (this.props.implicit_policy === 'all') {
				key = 'all_orgs_must_endorse';
			}
			if (this.props.implicit_policy === 'any') {
				key = 'any_orgs_must_endorse';
			}
			if (key) {
				policy = this.props.translate(key);
			}
		}
		if (this.props.policy === 'explicit') {
			let orgs = [];
			this.props.explicit_policy.forEach(org => {
				orgs.push(org.id);
			});
			if (orgs.length > 1) {
				const orgs_list = orgs.join(', ');
				policy = this.props.translate('n_orgs_of_must_endorse', {
					n: this.props.explicit_specific_num,
					orgs_list,
				});
			} else {
				policy = this.props.translate('org_must_endorse', {
					org: orgs[0],
				});
			}
		}
		if (this.props.policy === 'advanced') {
			policy = '';
			if (this.props.advanced_policy && !this.props.advanced_policy_error) {
				policy = (
					<TextArea
						name="advanced_policy"
						className="bx--text__input ibm-label"
						value={this.props.advanced_policy}
						readOnly
						labelText={this.props.translate('manual_policy')}
						hideLabel={true}
					/>
				);
			}
		}
		if (this.props.policy_default) {
			policy = this.getDefaultPolicyText();
		}

		const send_to = [];
		if (this.props.members) {
			this.props.members.forEach(member => {
				if (this.props.propose_org && this.props.propose_org.msp_id !== member.id) {
					send_to.push(member.id);
				}
			});
		}

		return (
			<WizardStep type="WizardStep"
				title="summary"
			>
				<div className="ibp-propose-chaincode-summary">
					{Helper.renderFieldSummary(this.props.translate, this.props, 'propose_org', 'propose_org.display_name')}
					{Helper.renderFieldSummary(this.props.translate, this.props, 'propose_identity', 'propose_identity.name')}
					{Helper.renderFieldSummary(this.props.translate, this.props, 'chaincode_package', 'pkg.name')}
					{Helper.renderFieldSummary(this.props.translate, this.props, 'pkg_id')}
					{Helper.renderFieldSummary(this.props.translate, this.props, 'pkg_version')}
					{this.props.pkg &&
						this.props.pkg.name &&
						this.props.selected_peers &&
						!!this.props.selected_peers.length &&
						Helper.renderFieldSummary(this.props.translate, this.props, 'install_on', 'selected_peers')}
					<div className="summary-section">
						<p className="summary-label">{this.props.translate('transaction_endorsement_policy')}</p>
						<p className="summary-value">{policy}</p>
					</div>
					{Helper.renderFieldSummary(this.props.translate, this.props, 'private_data_json', 'private_data_filename')}
					<div className="summary-section">
						<p className="summary-label">{this.props.translate('lifecycle_endorsement_policy')}</p>
						<p className="summary-value">{PolicyHelper.getTextForPolicy(this.props.lifecycle_policy, this.props.translate)}</p>
					</div>
					{Helper.renderFieldSummary(this.props.translate, this.props, 'init_required')}
					<ImportantBox
						data={
							<>
								{send_to.length > 0 && (
									<>
										{this.props.translate('proposal_will_be_sent')}
										<div className="ibp-highlight-msp">{send_to.join(', ')}</div>
									</>
								)}
								{this.props.translate('this_proposal', {
									org: this.props.propose_org ? <span className="ibp-highlight-msp">{this.props.propose_org.msp_id}</span> : null,
								})}
							</>
						}
					/>
				</div>
			</WizardStep>
		);
	}

	render() {
		return (
			<Wizard onClose={this.props.onClose}
				onSubmit={this.onSubmit}
				showSubmitSpinner={this.props.parsing}
				submitButtonLabel={this.props.translate('propose')}
			>
				{this.renderSelectOrg()}
				{this.renderSelectPackage()}
				{this.renderInstall()}
				{this.renderPackageInformation()}
				{this.renderPolicy()}
				{this.renderPrivateData()}
				{this.renderSummary()}
			</Wizard>
		);
	}
}

const dataProps = {
	propose_org: PropTypes.object,
	propose_identity: PropTypes.object,
	upload_pkg: PropTypes.bool,
	pkg: PropTypes.any,
	pkg_id: PropTypes.string,
	pkg_version: PropTypes.string,
	parsing: PropTypes.bool,
	install_all_peers: PropTypes.bool,
	selected_peers: PropTypes.array,
	policy: PropTypes.string,
	implicit_policy: PropTypes.string,
	explicit_specific_num: PropTypes.string,
	explicit_policy: PropTypes.array,
	existing_pkgs: PropTypes.array,
	loading_pkgs: PropTypes.bool,
	advanced_policy: PropTypes.string,
	advanced_policy_error: PropTypes.bool,
	private_data_json: PropTypes.string,
	private_data_filename: PropTypes.string,
	lifecycle_policy: PropTypes.object,
	policy_default: PropTypes.bool,
	init_required: PropTypes.bool,
	endorsement_policy: PropTypes.string,
	orgPeerList: PropTypes.array,
	existing_proposals: PropTypes.object,
	install_radio: PropTypes.string,
	pkg_error: PropTypes.any,
};

ProposeChaincodeModal.propTypes = {
	...dataProps,
	channel: PropTypes.object,
	members: PropTypes.array,
	onClose: PropTypes.func,
	onComplete: PropTypes.func,
	updateState: PropTypes.func,
	peerList: PropTypes.array,
	ordererList: PropTypes.array,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['configtxlator_url'] = state['settings']['configtxlator_url'];
		return newProps;
	},
	{
		updateState,
	}
)(withLocalize(ProposeChaincodeModal));
