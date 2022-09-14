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
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import { EventsRestApi } from '../../rest/EventsRestApi';
import { PeerRestApi } from '../../rest/PeerRestApi';
import Helper from '../../utils/helper';
import FileUploader from '../FileUploader/FileUploader';
import Form from '../Form/Form';
import Logger from '../Log/Logger';
import SVGs from '../Svgs/Svgs';
import TranslateLink from '../TranslateLink/TranslateLink';
import Wizard from '../Wizard/Wizard';
import WizardStep from '../WizardStep/WizardStep';

const SCOPE = 'installChaincode';
const CHAINCODE_LIMIT_MB = 25;
const Log = new Logger(SCOPE);
const semver = require('semver');

class InstallChaincodeModal extends Component {
	isMultiPeerInstall = false; // Installing chaincode on multiple peers

	componentDidMount() {
		this.isMultiPeerInstall = this.props.peers.length > 1 ? true : false;
		this.resetState();
	}

	componentWillUnmount() {
		this.resetState();
	}

	setError(error) {
		this.props.updateState(SCOPE, { error });
		this.props.updateState('wizard', { error });
	}

	resetState() {
		this.props.updateState(SCOPE, {
			loading: false,
			uploadedFileDetails: null,
			disableInstall: true,
			disableUpload: false,
			peer: this.props.peers.length > 1 ? [] : [this.props.peers[0].id],
			alreadyInstalledPeers: [],
			parsing: false,
		});
		this.setError(null);
	}

	async v2FileUpload(file) {
		this.props.updateState(SCOPE, {
			disableUpload: true,
			parsing: true,
		});
		let pkg_id = null;
		let pkg_version = null;
		try {
			const data = await Helper.readLocalChaincodePackageFile(file);
			pkg_id = data.pkg_id;
			pkg_version = data.pkg_version;
			if (pkg_id) {
				this.props.updateState(SCOPE, {
					disableUpload: true,
					uploadedFileDetails: {
						name: pkg_id,
						version: pkg_version,
						file: data ? data.uint8 : null,
						v2: true,
					},
					parsing: false,
				});
				this.setError(null);
			} else {
				this.props.updateState(SCOPE, {
					disableUpload: false,
					parsing: false,
				});
				this.setError({
					title: 'error_cds_file',
				});
			}
		} catch (error) {
			this.setError({ title: error });
		}
	}

	onFileUpload = event => {
		const file = event.target.files[0];
		const v2_ext = /(\.tgz|\.tar\.gz)$/i;
		if (v2_ext.exec(file.name)) {
			return this.v2FileUpload(file);
		}
		if (file) {
			const reader = new FileReader();
			reader.onprogress = event => {
				if (event.loaded > CHAINCODE_LIMIT_MB * 1024 * 1024) {
					this.setError({
						title: 'input_error_file_too_big',
					});
					reader.abort();
				}
			};
			reader.onerror = event => {
				this.setError({
					title: 'input_error_file_too_big',
				});
				reader.abort();
			};
			reader.onload = e => {
				const packaged_cc_file = new Uint8Array(reader.result);
				if (packaged_cc_file.length > CHAINCODE_LIMIT_MB * 1024 * 1024) {
					this.setError({
						title: 'input_error_file_too_big',
					});
				} else {
					const details = PeerRestApi.parseChaincodePackage(packaged_cc_file);
					if (details.name && details.version) {
						this.props.updateState(SCOPE, {
							disableUpload: true,
							uploadedFileDetails: {
								name: details.name,
								version: details.version,
								file: packaged_cc_file,
							},
							v2: false,
						});
						this.setError(null);
						this.checkAlreadyInstalledPeers(details.name, details.version);
					} else {
						this.setError({
							title: 'error_cds_file',
						});
					}
				}
			};
			reader.readAsArrayBuffer(file);
		}
	};

	removeUploadedFile = () => {
		this.props.updateState(SCOPE, {
			uploadedFileDetails: null,
			disableUpload: false,
			error: null,
		});
		this.props.updateState('wizard', { error: null });
	};

	selectPeer = obj => {
		let disableInstall = true;
		if (obj && obj.peer && obj.peer.length) {
			obj.peer.forEach(peer => {
				let found = false;
				this.props.alreadyInstalledPeers.forEach(installedPeer => {
					if (installedPeer.id === peer.id) {
						found = true;
					}
				});
				if (!found) {
					disableInstall = false;
				}
			});
		}
		this.props.updateState(SCOPE, {
			disableInstall,
		});
	};

	onSubmit = () => {
		return new Promise((resolve, reject) => {
			this.props.updateState(SCOPE, {
				disableInstall: true,
				disableUpload: true,
			});
			this.setError(null);
			let alreadyInstalledPeersName = [];
			if (this.props.alreadyInstalledPeers) {
				this.props.alreadyInstalledPeers.forEach(peer => {
					alreadyInstalledPeersName.push(peer.name);
				});
			}
			let peers = [];
			if (this.isMultiPeerInstall) {
				peers = this.props.peer.filter(peer => {
					return !alreadyInstalledPeersName.includes(peer.name);
				});
			} else {
				peers = [this.props.peers[0]];
			}
			Log.debug('Installing on peers:', peers);
			if (peers.length === 0) {
				this.props.updateState(SCOPE, {
					error: {
						title: 'smart_contract_exists',
					},
				});
				reject('smart_contract_exists');
			} else {
				peers.forEach(peer => {
					Log.debug('Installing chaincode on ', peer.id, this.props.uploadedFileDetails.name, this.props.uploadedFileDetails.version);
					PeerRestApi.installChaincode(peer.id, this.props.uploadedFileDetails.file, this.props.uploadedFileDetails.v2)
						.then(resp => {
							Log.debug('Install chaincode on ', peer.id, ' response: ', resp);
							this.props.onComplete(this.props.uploadedFileDetails.name, this.props.uploadedFileDetails.version);
							if (window.trackEvent) {
								window.trackEvent('Started Process', {
									processType: 'Smart Contract',
									process: peer,
									tenantId: this.props.CRN.instance_id,
									successFlag: true,
									accountGuid: this.props.CRN.account_id,
									milestoneName: 'Install smart contract - Success',
									'user.email': this.props.userInfo.email,
								});
							}
							// send async event... don't wait
							EventsRestApi.sendInstallCCEvent(this.props.uploadedFileDetails.name, this.props.uploadedFileDetails.version, peer);
							resolve();
						})
						.catch(error => {
							Log.error(error);
							let error_msg = 'error_install_peer';
							if (error && error.grpc_resp && error.grpc_resp.statusMessage) {
								if (error.grpc_resp.statusMessage.indexOf('exists') !== -1 || error.grpc_resp.statusMessage.indexOf('successfully installed') !== -1) {
									error_msg = 'smart_contract_exists';
								}
							}
							if (error && error.grpc_resp && error.grpc_resp.statusMessage) {
								if (error.grpc_resp.statusMessage.indexOf('This identity is not an admin') !== -1) {
									error_msg = 'error_chaincode2';
								}
							}

							this.props.updateState(SCOPE, {
								error: {
									title: error_msg,
									translateOptions: {
										peerName: peer.display_name,
									},
									details: error,
								},
							});
							if (window.trackEvent) {
								window.trackEvent('Started Process', {
									processType: 'Smart Contract',
									process: peer,
									tenantId: this.props.CRN.instance_id,
									successFlag: false,
									accountGuid: this.props.CRN.account_id,
									milestoneName: 'Install smart contract - Fail',
									'user.email': this.props.userInfo.email,
								});
							}
							reject();
						});
				});
			}
		});
	};

	renderUploadPackage(translate) {
		let label = 'only_cds_packages';
		let accept = ['.out', '.cds', '.cdp'];
		if (this.props.peers && this.props.peers.length === 1) {
			const version = this.props.peers[0].version;
			if (version && semver.gte(semver.coerce(version), semver.coerce('2.0'))) {
				label = 'only_cds_or_tgz_packages';
				accept.push('.gz');
				accept.push('.tgz');
			}
		}
		return (
			<WizardStep
				type="WizardStep"
				title={translate('upload_package')}
				tooltip={translate('upload_package_tooltip')}
				disableSubmit={this.props.error || !this.props.disableUpload}
			>
				{!this.props.disableUpload && (
					<div className={this.props.loading ? 'hidden_section' : ''}>
						<FileUploader
							labelDescription={translate(label, { cc_limit: CHAINCODE_LIMIT_MB })}
							buttonLabel={translate('add_file')}
							accept={accept}
							name="file-uploader-cds"
							multiple={false}
							onChange={this.onFileUpload}
							id="file-uploader-cds"
						/>
					</div>
				)}
				{this.props.uploadedFileDetails && (
					<div className="ibp-json-file-details">
						<div className="ibp-json-file-name"
							id="chaincode-filename"
						>
							{this.props.uploadedFileDetails.name}
						</div>
						<div className="ibp-json-file-other-details">
							{this.props.uploadedFileDetails.version && (
								<div className="ibp-json-file-version"
									id="chaincode-version"
								>
									{this.props.uploadedFileDetails.version}
								</div>
							)}
							<button className="ibp-json-file-remove-icon"
								onClick={this.removeUploadedFile}
							>
								<SVGs type={'close'}
									width="10px"
									height="10px"
								/>
							</button>
						</div>
					</div>
				)}
			</WizardStep>
		);
	}

	renderPeerSelection(translate) {
		let alreadyInstalledPeersId = [];
		if (this.props.alreadyInstalledPeers) {
			this.props.alreadyInstalledPeers.forEach(peer => {
				alreadyInstalledPeersId.push(peer.id);
			});
		}
		if (this.isMultiPeerInstall) {
			return (
				<WizardStep title={translate('select_peers')}
					tooltip={translate('select_peers_tooltip')}
					type="WizardStep"
					disableSubmit={this.props.disableInstall}
				>
					<div className="ibp-install-peer-container">
						{this.props.peers.length > 0 && (
							<div>
								<Form
									scope={SCOPE}
									id={SCOPE + '-peer'}
									fields={[
										{
											name: 'peer',
											type: 'multiselect',
											options: this.props.peers,
											required: true,
											disabledIds: alreadyInstalledPeersId,
											disabledTooltip: 'smc_already_installed',
										},
									]}
									onChange={this.selectPeer}
								/>
							</div>
						)}
					</div>
				</WizardStep>
			);
		}
	}

	// Select check box if smart contract(same name and version) is already installed on given peer
	checkAlreadyInstalledPeers(name, version) {
		let alreadyInstalledPeers = [];
		let matchingChaincode = null;
		if (this.props.installedChaincodeList && this.props.installedChaincodeList.length) {
			matchingChaincode = this.props.installedChaincodeList.find(cc => {
				return cc.name === name && cc.version === version;
			});
		}
		if (matchingChaincode) {
			let installedPeerNames = [];
			matchingChaincode.peers.forEach(peer => {
				installedPeerNames.push(peer.id);
			});
			alreadyInstalledPeers = this.props.peers.filter(peer => {
				return installedPeerNames.includes(peer.id);
			});
		}
		this.props.updateState(SCOPE, {
			alreadyInstalledPeers: [...alreadyInstalledPeers],
			peer: [...alreadyInstalledPeers],
		});
		if (this.props.peers.length === 1 && alreadyInstalledPeers.length) {
			// There is only one peer and the chaincode is already installed
			this.props.updateState('wizard', { error: 'smart_contract_exists' });
			this.props.updateState(SCOPE, { error: 'smart_contract_exists' });
		}
	}

	render() {
		const translate = this.props.translate;
		return (
			<Wizard
				error={this.props.error}
				onClose={this.props.onClose}
				onSubmit={this.onSubmit}
				submitButtonLabel={translate('install_chaincode')}
				title="install_chaincode"
			>
				<p className="ibp-modal-desc">
					{translate('install_chaincode_desc')}
					<a
						className="ibp-chaincode-modal-learn-more"
						href={translate('smart_contracts_docs', { DOC_PREFIX: this.props.docPrefix })}
						target="_blank"
						rel="noopener noreferrer"
					>
						{translate('find_more_here')}
					</a>
				</p>
				<TranslateLink text="smart_contract_subtext" />
				{this.renderUploadPackage(translate)}
				{this.renderPeerSelection(translate)}
			</Wizard>
		);
	}
}

const dataProps = {
	peers: PropTypes.array,
	loading: PropTypes.bool,
	error: PropTypes.string,
	peer: PropTypes.array,
	alreadyInstalledPeers: PropTypes.array,
	disableInstall: PropTypes.bool,
	disableUpload: PropTypes.bool,
	uploadedFileDetails: PropTypes.object,
	installedChaincodeList: PropTypes.array,
	parsing: PropTypes.bool,
};

InstallChaincodeModal.propTypes = {
	...dataProps,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
	updateState: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['CRN'] = state['settings'] ? state['settings']['CRN'] : null;
		newProps['userInfo'] = state['userInfo'] ? state['userInfo']['loggedInAs'] : null;
		newProps['docPrefix'] = state['settings'] ? state['settings']['docPrefix'] : null;
		return newProps;
	},
	{
		updateState,
	}
)(withLocalize(InstallChaincodeModal));
