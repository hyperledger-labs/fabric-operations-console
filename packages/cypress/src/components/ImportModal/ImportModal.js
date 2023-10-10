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
import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import { CA_TYPE, CertificateAuthorityRestApi } from '../../rest/CertificateAuthorityRestApi';
import IdentityApi from '../../rest/IdentityApi';
import { MspRestApi, MSP_TYPE } from '../../rest/MspRestApi';
import { OrdererRestApi, ORDERER_TYPE } from '../../rest/OrdererRestApi';
import { PeerRestApi, PEER_TYPE } from '../../rest/PeerRestApi';
import Helper from '../../utils/helper';
import FileUploader from '../FileUploader/FileUploader';
import Logger from '../Log/Logger';
import SVGs from '../Svgs/Svgs';
import Wizard from '../Wizard/Wizard';
import WizardStep from '../WizardStep/WizardStep';
const JSZip = require('jszip');

const SCOPE = 'importModal';
const Log = new Logger(SCOPE);

class ImportModal extends React.Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			dataValid: false,
			errorMsg: null,
			disableUpload: false,
			uploadedFileDetails: null,
			filenames: {},
			identityData: {},
			orderers: [],
		});
		IdentityApi.load()
			.then(identityData => {
				this.props.updateState(SCOPE, { identityData });
			})
			.catch(error => {
				Log.error(error);
			});
		OrdererRestApi.getOrderers()
			.then(orderers => {
				this.props.updateState(SCOPE, { orderers });
			})
			.catch(error => {
				Log.error(error);
			});
	}

	async createItems(items) {
		let newItems;
		let newItem;
		while (items.length > 0) {
			const item = items.pop();
			newItem = null;
			switch (item.type) {
				case CA_TYPE:
					newItems = await CertificateAuthorityRestApi.importCA([item]);
					newItem = newItems[0];
					break;
				case ORDERER_TYPE:
					if (item.cluster_id) {
						let raft = null;
						// Find the cluster if it already exists
						this.props.orderers.forEach(orderer => {
							if (orderer.cluster_id === item.cluster_id) {
								raft = orderer.raft;
							}
						});
						if (raft) {
							// Update to existing cluster, so check if this
							// ordering node should be ignored (because is already
							// exists)
							let ignore = false;
							raft.forEach(node => {
								if (node.api_url === item.api_url) {
									ignore = true;
								}
							});
							if (!ignore) {
								// New ordering node for existing cluster
								newItems = await OrdererRestApi.importOrderer([item]);
								newItem = newItems[0];
							}
						} else {
							// Ordering node for new cluster
							newItems = await OrdererRestApi.importOrderer([item]);
							newItem = newItems[0];
						}
					}
					break;
				case PEER_TYPE:
					newItems = await PeerRestApi.importPeer([item]);
					newItem = newItems[0];
					break;
				case MSP_TYPE:
					newItem = await MspRestApi.importMSP(item);
					break;
				default:
					break;
			}
			if (newItem && item.associatedIdentityName) {
				const identity = await IdentityApi.getIdentity(item.associatedIdentityName);
				if (identity) {
					switch (item.type) {
						case CA_TYPE:
							await IdentityApi.associateCertificateAuthority(item.associatedIdentityName, newItem.id);
							break;
						case ORDERER_TYPE:
							await IdentityApi.associateOrderer(item.associatedIdentityName, item.cluster_id, item.msp_id);
							break;
						case PEER_TYPE:
							await IdentityApi.associatePeer(item.associatedIdentityName, newItem.id);
							break;
						default:
							break;
					}
				}
			}
		}
		return;
	}

	async onSubmit() {
		const ids = [];
		const items = [];
		this.props.uploadedFileDetails.file.forEach(item => {
			if (item.type === 'identity') {
				ids.push(item);
			} else {
				items.push(item);
			}
		});
		if (ids.length > 0) {
			await IdentityApi.createIdentity(ids);
		}
		await this.createItems(items);
		return;
	}

	validatePeer(peer) {
		if (!peer.display_name) {
			peer.display_name = peer.name || peer.short_name;
		}
		if (!peer.msp) {
			peer.msp = {};
		}
		if (!peer.msp.tlsca) {
			peer.msp.tlsca = {};
		}
		if (!peer.msp.component) {
			peer.msp.component = {};
		}
		if (!peer.msp.tlsca.root_certs) {
			peer.msp.tlsca.root_certs = [peer.tls_ca_root_cert || peer.pem];
		}
		if (!peer.msp.component.tls_cert) {
			peer.msp.component.tls_cert = peer.tls_cert;
		}
		delete peer.name;
		delete peer.short_name;
		delete peer.tls_cert;
		delete peer.tls_ca_root_cert;
		delete peer.pem;
		if (!peer.display_name || Helper.checkSpecialRules(peer.display_name, Helper.SPECIAL_RULES_DISPLAY_NAME)) {
			return 'error_import_invalid_name';
		}
		if (!peer.msp.component.tls_cert) {
			return 'error_required_fields';
		}
		peer.msp.component.tls_cert = Helper.cleanUpCertificateFormat(peer.msp.component.tls_cert);
		if (!Helper.isCertificate(peer.msp.component.tls_cert)) {
			return 'error_certificate';
		}
		if (!peer.msp.tlsca.root_certs || !peer.msp.tlsca.root_certs.length) {
			return 'error_required_fields';
		}
		for (let i = 0; i < peer.msp.tlsca.root_certs.length; i++) {
			if (!Helper.isCertificate(peer.msp.tlsca.root_certs[i])) {
				return 'error_certificate';
			}
		}
		if (!peer.msp_id) {
			return 'error_required_fields';
		}
		if (!peer.api_url) {
			peer.api_url = peer.url;
			delete peer.url;
		}
		if (!peer.grpcwp_url || !peer.api_url || !peer.operations_url) {
			return 'error_required_fields';
		}
		if (!Helper.isURL(peer.grpcwp_url)) {
			return 'error_url';
		}
		if (!Helper.isURL(peer.api_url)) {
			return 'error_url';
		}
		if (!Helper.isURL(peer.operations_url)) {
			return 'error_url';
		}
		return null;
	}

	validateOrderer(orderer) {
		if (!orderer.display_name) {
			orderer.display_name = orderer.name || orderer.short_name;
		}
		if (!orderer.msp) {
			orderer.msp = {};
		}
		if (!orderer.msp.tlsca) {
			orderer.msp.tlsca = {};
		}
		if (!orderer.msp.component) {
			orderer.msp.component = {};
		}
		if (!orderer.msp.tlsca.root_certs) {
			orderer.msp.tlsca.root_certs = [orderer.tls_ca_root_cert || orderer.pem];
		}
		if (!orderer.msp.component.tls_cert) {
			orderer.msp.component.tls_cert = orderer.tls_cert || orderer.server_tls_cert;
		}
		delete orderer.name;
		delete orderer.short_name;
		delete orderer.tls_cert;
		delete orderer.tls_ca_root_cert;
		delete orderer.pem;
		if (!orderer.display_name || Helper.checkSpecialRules(orderer.display_name, Helper.SPECIAL_RULES_DISPLAY_NAME)) {
			return 'error_import_invalid_name';
		}
		if (!orderer.msp.component.tls_cert) {
			return 'error_required_fields';
		}
		orderer.msp.component.tls_cert = Helper.cleanUpCertificateFormat(orderer.msp.component.tls_cert);
		if (!Helper.isCertificate(orderer.msp.component.tls_cert)) {
			return 'error_certificate';
		}
		if (!orderer.msp.tlsca.root_certs || !orderer.msp.tlsca.root_certs.length) {
			return 'error_required_fields';
		}
		for (let i = 0; i < orderer.msp.tlsca.root_certs.length; i++) {
			if (!Helper.isCertificate(orderer.msp.tlsca.root_certs[i])) {
				return 'error_certificate';
			}
		}
		if (!orderer.operations_url) {
			orderer.operations_url = orderer.operations;
			delete orderer.operations;
		}
		if (!orderer.api_url) {
			orderer.api_url = orderer.url;
			delete orderer.url;
		}
		if (!orderer.grpcwp_url || !orderer.api_url || !orderer.operations_url) {
			return 'error_required_fields';
		}
		if (!Helper.isURL(orderer.grpcwp_url)) {
			return 'error_url';
		}
		if (!Helper.isURL(orderer.api_url)) {
			return 'error_url';
		}
		if (!Helper.isURL(orderer.operations_url)) {
			return 'error_url';
		}
		if (orderer.osnadmin_url && !Helper.isURL(orderer.osnadmin_url)) {
			return 'error_url';
		}
		return null;
	}

	validateCA(ca) {
		// convert legacy fields to current format
		if (!ca.display_name) {
			ca.display_name = ca.name || ca.short_name;
		}
		if (!ca.msp) {
			ca.msp = {};
		}
		if (!ca.msp.ca) {
			ca.msp.ca = {};
		}
		if (!ca.msp.tlsca) {
			ca.msp.tlsca = {};
		}
		if (!ca.msp.component) {
			ca.msp.component = {};
		}
		if (!ca.msp.ca.name) {
			ca.msp.ca.name = ca.ca_name;
		}
		if (!ca.msp.tlsca.name) {
			ca.msp.tlsca.name = ca.tlsca_name;
		}
		if (!ca.msp.component.tls_cert) {
			ca.msp.component.tls_cert = ca.tls_cert || ca.pem;
		}
		delete ca.name;
		delete ca.short_name;
		delete ca.ca_name;
		delete ca.tlsca_name;
		delete ca.tls_cert;
		delete ca.pem;
		// validate fields
		if (!ca.display_name || Helper.checkSpecialRules(ca.display_name, Helper.SPECIAL_RULES_DISPLAY_NAME)) {
			return 'error_import_invalid_name';
		}
		if (!ca.msp.ca.name || !ca.msp.tlsca.name || !ca.msp.component.tls_cert) {
			return 'error_required_fields';
		}
		if (!ca.operations_url) {
			ca.operations_url = ca.operations;
			delete ca.operations;
		}
		if (!ca.api_url) {
			ca.api_url = ca.ca_url || ca.url;
			delete ca.ca_url;
			delete ca.url;
		}
		if (!ca.api_url || !ca.operations_url) {
			return 'error_required_fields';
		}
		if (!Helper.isURL(ca.api_url)) {
			return 'error_url';
		}
		if (!Helper.isURL(ca.operations_url)) {
			return 'error_url';
		}
		ca.msp.component.tls_cert = Helper.cleanUpCertificateFormat(ca.msp.component.tls_cert);
		if (!Helper.isCertificate(ca.msp.component.tls_cert)) {
			return 'error_certificate';
		}
		return null;
	}

	validateMsp(msp) {
		if (!msp.display_name) {
			msp.display_name = msp.name || msp.short_name;
			delete msp.name;
			delete msp.short_name;
		}
		if (!msp.display_name || Helper.checkSpecialRules(msp.display_name, Helper.SPECIAL_RULES_DISPLAY_NAME)) {
			return 'error_import_invalid_name';
		}
		const fields = Helper.getMSPFields();
		let errorMsg = null;
		fields.forEach(field => {
			if (field.required && !msp[field.name]) {
				errorMsg = 'error_required_fields';
			}
		});
		return errorMsg;
	}

	validateIdentity(id) {
		if (!id.name || Helper.checkSpecialRules(id.name, Helper.SPECIAL_RULES_IDENTITY_NAME)) {
			return 'error_import_invalid_name';
		}
		if (this.props.identityData[id.name]) {
			return 'error_identity_already_exists';
		}
		id.cert = Helper.cleanUpCertificateFormat(id.cert);
		if (!id.cert || !Helper.isCertificate(id.cert)) {
			return 'error_certificate';
		}
		id.private_key = Helper.cleanUpCertificateFormat(id.private_key);
		if (!id.private_key || !Helper.isPrivateKey(id.private_key)) {
			return 'error_private_key';
		}
		return null;
	}

	validateJSON = json => {
		let errorMsg = null;
		let item;
		if (!_.isArray(json)) {
			errorMsg = 'error_import_json_array';
		} else {
			for (let i = 0; !errorMsg && i < json.length; i++) {
				item = json[i];
				switch (item.type) {
					case 'fabric-ca':
						errorMsg = this.validateCA(item);
						break;
					case 'fabric-orderer':
						errorMsg = this.validateOrderer(item);
						break;
					case 'fabric-peer':
						errorMsg = this.validatePeer(item);
						break;
					case 'msp':
						errorMsg = this.validateMsp(item);
						break;
					case 'identity':
						errorMsg = this.validateIdentity(item);
						break;
					default:
						errorMsg = 'error_import_invalid_type';
						break;
				}
			}
		}
		this.setError({
			title: errorMsg,
		});

		return errorMsg ? false : true;
	};

	setError(error) {
		this.props.updateState(SCOPE, { error });
		this.props.updateState('wizard', { error });
	}

	onFileUpload = event => {
		const file = event.target.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onprogress = event => {
				if (event.loaded > 1024 * 1024) {
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
				const zip_file = reader.result;
				if (zip_file.length > 1024 * 1024) {
					this.setError({
						title: 'input_error_file_too_big',
					});
				} else {
					let jsonArray = [];
					let allFiles = [];
					let valid = true;
					JSZip.loadAsync(zip_file).then(
						zip => {
							zip.forEach((relativePath, zipEntry) => {
								if (zipEntry.dir === false && zipEntry.name.indexOf('__MACOS') === -1) {
									allFiles.push(zipEntry.async('string'));
								}
							});
							Promise.all(allFiles).then(results => {
								results.forEach(result => {
									try {
										jsonArray.push(JSON.parse(result));
									} catch (error) {
										Log.log('Error parsing', error);
										valid = false;
									}
								});
								if (!valid) {
									this.setError({
										title: 'error_parsing_json',
									});
								}
								valid = valid && this.validateJSON(jsonArray);
								if (valid) {
									this.props.updateState(SCOPE, {
										disableUpload: true,
										uploadedFileDetails: {
											file: jsonArray,
											name: file.name,
										},
									});
									this.setError(null);
								}
							});
						},
						error => {
							Log.info('this is not a zip... let\'s try JSON');
							Helper.readLocalJsonFile(file).then(resp => {
								jsonArray = resp.json;
								valid = this.validateJSON(jsonArray);
								if (valid) {
									this.props.updateState(SCOPE, {
										disableUpload: true,
										uploadedFileDetails: {
											file: jsonArray,
											name: file.name,
										},
									});
									this.setError(null);
								}
							});
						}
					);
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

	render() {
		const translate = this.props.translate;
		return (
			<Wizard
				title="import"
				onClose={this.props.onClose}
				onSubmit={() => this.onSubmit()}
				submitButtonLabel={translate('import')}
				submitButtonId="import_button"
			>
				<WizardStep type="WizardStep"
					disableSubmit={!this.props.uploadedFileDetails || !this.props.uploadedFileDetails.file}
				>
					<p className="ibp-import-modal-desc">{translate('import_modal_desc1')}</p>
					<p className="ibp-import-modal-desc">{translate('import_modal_desc2')}</p>
					<div>
						{!this.props.disableUpload && (
							<div className={this.props.loading ? 'hidden_section' : ''}>
								<FileUploader
									labelDescription={translate('zip_or_json')}
									buttonLabel={translate('add_file')}
									accept={['.zip', '.json']}
									name="file-uploader"
									multiple={false}
									onChange={this.onFileUpload}
									id="file-uploader"
								/>
							</div>
						)}
						{this.props.uploadedFileDetails && (
							<div className="ibp-import-file-details">
								<div className="ibp-import-file-name"
									id="import-filename"
								>
									{this.props.uploadedFileDetails.name}
								</div>
								<div className="ibp-import-file-other-details">
									<button className="ibp-import-file-remove-icon"
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
					</div>
				</WizardStep>
			</Wizard>
		);
	}
}

const dataProps = {
	dataValid: PropTypes.bool,
	disableUpload: PropTypes.bool,
	errorMsg: PropTypes.string,
	filenames: PropTypes.object,
	uploadedFileDetails: PropTypes.object,
	identityData: PropTypes.object,
	orderers: PropTypes.array,
};

ImportModal.propTypes = {
	...dataProps,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
	updateState: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
	}
)(withLocalize(ImportModal));
