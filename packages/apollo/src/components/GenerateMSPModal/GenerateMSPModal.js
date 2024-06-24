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
import { TrashCan } from '@carbon/icons-react';
import { Button, CodeSnippet, ContentSwitcher, InlineLoading, Switch } from '@carbon/react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import { CertificateAuthorityRestApi } from '../../rest/CertificateAuthorityRestApi';
import ChannelApi from '../../rest/ChannelApi';
import IdentityApi from '../../rest/IdentityApi';
import { MspRestApi } from '../../rest/MspRestApi';
import StitchApi from '../../rest/StitchApi';
import Clipboard from '../../utils/clipboard';
import Helper from '../../utils/helper';
import NodeStatus from '../../utils/status';
import BlockchainTooltip from '../BlockchainTooltip/BlockchainTooltip';
import FocusComponent from '../FocusComponent/FocusComponent';
import Form from '../Form/Form';
import Logger from '../Log/Logger';
import SidePanel from '../SidePanel/SidePanel';
import SidePanelWarning from '../SidePanelWarning/SidePanelWarning';
import Timeline from '../Timeline/Timeline';
import RenderParamHTML from '../RenderHTML/RenderParamHTML';

const SCOPE = 'generateMSP';
const Log = new Logger(SCOPE);

class GenerateMSPModal extends Component {
	constructor(props) {
		super(props);
		this.sidePanel = React.createRef();
		this.timestamp = 0;
		this.completedSteps = [];
		this.buildCreateMSPTimeline();
	}

	componentDidMount() {
		this.props.updateState(SCOPE, {
			viewing: 'msp_details',
			identityType: 'new',
			selectedTimelineStep: {
				currentStepInsideOfGroupIndex: 0,
				currentStepIndex: 0,
			},
			timelineSteps: this.timelineSteps,
			loadingCert: false,
			loadingUsers: false,
			admins: [],
			cas: [],
			rootCerts: [],
			fabric_node_ous: {},
			tlsRootCerts: [],
			intermediate_certs: [],
			tls_intermediate_certs: [],
			generatedCert: {},
			enroll_id: '',
			users: [],
			enroll_secret: '',
			enroll_valid: false,
			identity_name: '',
			error: '',
			disableSubmit: false,
			invalidMspError: null,
			notAvailable: false,
			submitting: false,
			gettingRootCerts: false,
			duplicateMspError: false,
		});

		this.getCAs();
	}

	componentWillUnmount() {
		this.resetState();
	}

	async getIdentities(rootCerts) {
		const updatedRootCerts = rootCerts.filter((x) => x.cert !== '');
		let rootCertsToCheck = [];
		updatedRootCerts.map((rootCert) => rootCertsToCheck.push(rootCert.cert));
		this.props.intermediate_certs.forEach((icert) => rootCertsToCheck.push(icert));
		try {
			const rootCertIdentities = await IdentityApi.getIdentitiesForCerts(rootCertsToCheck);
			this.props.updateState(SCOPE, {
				rootCertIdentities: rootCertIdentities,
			});
		} catch (error) {
			Log.info('error:', error);
		}
	}

	resetState = () => {
		this.props.updateState(SCOPE, {
			loading: false,
			loadingCert: false,
			loadingUsers: false,
			viewing: 'msp_details',
			admins: [],
			ca: null,
			cas: [],
			rootCerts: [],
			fabric_node_ous: {},
			tlsRootCerts: [],
			intermediate_certs: [],
			tls_intermediate_certs: [],
			generatedCert: {},
			enroll_id: '',
			users: [],
			enroll_secret: '',
			enroll_valid: false,
			identity_name: '',
			error: '',
			disableSubmit: false,
			invalidMspError: null,
			notAvailable: false,
			submitting: false,
			gettingRootCerts: false,
			msp_name: '',
			msp_id: '',
			duplicateMspError: false,
		});
	};

	buildCreateMSPTimeline = () => {
		this.timelineSteps = [
			[
				{
					groupSteps: [
						{
							label: 'msp_details',
							isLink: true,
							onClick: () => this.setView('msp_details', 0),
						},
					],
				},
			],
			[
				{
					groupSteps: [
						{
							label: 'root_cert_details',
							isLink: false,
							onClick: () => this.setView('root_ca_details', 1),
						},
					],
				},
			],
			[
				{
					groupSteps: [
						{
							label: 'admin_certs',
							isLink: false,
							onClick: () => this.setView('additional_msp_admins', 2),
						},
					],
				},
			],
			[
				{
					groupSteps: [
						{
							label: 'summary',
							isLink: false,
							onClick: () => this.setView('summary', 3),
						},
					],
				},
			],
		];
	};

	getCAs = () => {
		this.props.updateState(SCOPE, { loading: true });
		CertificateAuthorityRestApi.getCAs()
			.then((caList) => {
				this.props.updateState(SCOPE, {
					cas: caList,
					loading: false,
				});
				this.addAdmin();
				return caList;
			})
			.then((caList) => {
				// this.loadUsersFromCA(caList[0].id);
				this.props.updateState(SCOPE, {
					loading: false,
				});
			});
	};

	onSelectIdentity = (value, valid) => {
		const { admins } = this.props;
		const selectedIdentityCert = {
			cert: value.existingSelectedIdentity.cert,
			isReadOnly: true,
		};
		if (this.props.identityType === 'existing') {
			let blank_admin = {
				cert: '',
			};
			this.props.updateState(SCOPE, {
				admins: admins ? [selectedIdentityCert, blank_admin] : [blank_admin],
				identity_name: value.existingSelectedIdentity.name,
			});
		}
	};

	onSelectRootCA = (value, valid) => {
		setTimeout(() => {
			this.props.updateState(SCOPE, {
				ca: value.selectedRootCA,
				enroll_id: value.selectedRootCA.enroll_id,
				enroll_secret: value.selectedRootCA.enroll_secret,
				rootCerts: [],
				tlsRootCerts: [],
				notAvailable: false,
				gettingRootCerts: true,
			});
			CertificateAuthorityRestApi.getRootCertificate(value.selectedRootCA, false)
				.then(async (cert) => {
					let rootCerts = [];
					let intermediateCerts = [];
					let certArray = Helper.getCertArray(cert);
					certArray.forEach((myCert) => {
						let parseCert = StitchApi.parseCertificate(myCert);
						if (parseCert) {
							if (parseCert.issuer === parseCert.subject) {
								rootCerts = [
									{
										cert: parseCert.base_64_pem,
										isReadOnly: true,
									},
								];
							} else {
								intermediateCerts.push(parseCert.base_64_pem);
							}
						}
					});

					const current_root_certs = _.size(rootCerts) > 0 ? [rootCerts[0].cert] : [];
					const current_intermediate_certs = _.size(intermediateCerts) > 0 ? [intermediateCerts[0].cert] : [];
					const duplicateMSPExists = await MspRestApi.checkIfMSPExists(this.props.msp_id, current_root_certs, current_intermediate_certs);
					if (duplicateMSPExists) {
						this.props.updateState(SCOPE, {
							duplicateMspError: true,
							loading: false,
							gettingRootCerts: false,
						});
					} else {
						if (intermediateCerts && intermediateCerts.length > 0) {
							this.addOUIdentifier(intermediateCerts[0]);
						} else {
							this.addOUIdentifier(rootCerts[0].cert);
						}
						this.props.updateState(SCOPE, { rootCerts, intermediate_certs: intermediateCerts });
						this.addRootCert(rootCerts);
						CertificateAuthorityRestApi.getRootCertificate(value.selectedRootCA, true)
							.then((cert) => {
								let tlsRootCerts = [];
								let tlsIntermediateCerts = [];
								let certArray = Helper.getCertArray(cert);
								certArray.forEach((myCert) => {
									let parseCert = StitchApi.parseCertificate(myCert);
									if (parseCert) {
										if (parseCert.issuer === parseCert.subject) {
											tlsRootCerts = [
												{
													cert: parseCert.base_64_pem,
													isReadOnly: true,
												},
											];
										} else {
											tlsIntermediateCerts.push(parseCert.base_64_pem);
										}
									}
								});
								this.props.updateState(SCOPE, {
									tlsRootCerts,
									tls_intermediate_certs: tlsIntermediateCerts,
									notAvailable: false,
									gettingRootCerts: false,
									duplicateMspError: false,
								});
								this.addTLSRootCert(tlsRootCerts);
							})
							.then(() => {
								this.loadUsersFromCA(value.selectedRootCA.id);
							})
							.catch((tls_error) => {
								Log.error('Error occurred while getting CA root cert from TLS CA ', tls_error);
								this.props.updateState(SCOPE, {
									loading: false,
									gettingRootCerts: false,
									duplicateMspError: false,
								});
								this.addTLSRootCert();
							});
					}
				})
				.catch((error) => {
					Log.error('Error occurred while getting CA root cert ', error);
					this.props.updateState(SCOPE, {
						loading: false,
						gettingRootCerts: false,
					});
					this.addRootCert();
				});
			this.checkCAHealth(value.selectedRootCA);
		}, 100);
	};

	loadUsersFromCA(ca_id) {
		this.props.updateState(SCOPE, { loadingUsers: true });
		return CertificateAuthorityRestApi.getUsersFromCAId(ca_id, 'ca')
			.then((all_users) => {
				if (!all_users) {
					all_users = [];
				}
				const users = all_users.filter((user) => user.type === 'admin');
				if (users && users.length) {
					this.props.updateState(SCOPE, {
						enroll_id: users[0].id,
						enroll_secret: '',
						enroll_valid: false,
						users,
					});
				}
				this.props.updateState(SCOPE, {
					loadingUsers: false,
				});
			})
			.catch((error) => {
				Log.error(error);
				this.props.updateState(SCOPE, {
					enroll_id: '',
					enroll_secret: '',
					enroll_valid: false,
					loadingUsers: false,
					users: [],
				});
			});
	}

	checkCAHealth = (ca) => {
		this.timestamp = new Date().getTime();
		setTimeout(() => {
			// after 5 seconds, if we still do not have a response, show
			// the not available message
			if (this.timestamp) {
				this.props.updateState(SCOPE, { notAvailable: true, gettingRootCerts: false });
			}
		}, 5000);
		NodeStatus.getStatus(ca, SCOPE, 'selectedCAStatus', (id, running) => {
			Log.debug('CA running status: ', id, running);
			this.timestamp = 0;
			this.props.updateState(SCOPE, { notAvailable: !running, gettingRootCerts: true });
		});
	};

	async onSubmit() {
		if (!this.props.msp_id || !this.props.msp_name || this.props.rootCerts.length === 0 || this.props.admins.length === 0) {
			this.props.updateState(SCOPE, {
				error: 'error_required_fields',
				submitting: false,
			});
		} else {
			if (this.props.submitting) {
				return;
			}
			this.props.updateState(SCOPE, {
				submitting: true,
			});
			const opts = {
				msp_id: this.props.msp_id,
				display_name: this.props.msp_name,
				root_certs: this.props.rootCerts.filter((x) => x.cert !== '').map((x) => x.cert),
				tls_root_certs: this.props.tlsRootCerts.filter((x) => x.cert !== '').map((x) => x.cert),
				admins: this.props.admins.filter((x) => x.cert !== '').map((x) => x.cert),
				intermediate_certs: this.props.intermediate_certs,
				tls_intermediate_certs: this.props.tls_intermediate_certs,
				revocation_list: this.props.revocation_list,
				organizational_unit_identifiers: this.props.organizational_unit_identifiers,
				fabric_node_ous: this.props.fabric_node_ous,
				host_url: this.props.host_url,
			};

			if (opts.fabric_node_ous && _.isEmpty(opts.fabric_node_ous)) {
				delete opts.fabric_node_ous;
			}

			Log.info('Sending request for generating msp: ', JSON.stringify(opts, null, 4));
			let resp;
			try {
				resp = await MspRestApi.importMSP(opts);
			} catch (error) {
				Log.error(`Error occurred while generating msp ${error}`);
				this.props.updateState(SCOPE, {
					submitting: false,
					error,
				});
			}
			Log.info('Generating msp response: ', resp);
			if (resp && resp.id) {
				this.props.onComplete(this.props.msp_name);
				this.sidePanel.closeSidePanel();
			} else {
				this.props.updateState(SCOPE, {
					submitting: false,
					error: {
						title: 'error_occurred_during_msp_generation',
						details: resp,
					},
				});
			}
		}
	}

	onError = (error) => {
		this.props.updateState(SCOPE, { error });
	};

	addIdentityToWallet = (cert) => {
		IdentityApi.createIdentity([
			{
				name: cert.name,
				cert: cert.certificate,
				private_key: cert.private_key,
			},
		])
			.then(() => {
				let new_admin = {
					cert: cert.certificate,
					isReadOnly: true,
				};
				let existing_admins = this.props.admins.filter((admin) => admin.cert !== '');
				const admins = existing_admins ? [...existing_admins, new_admin] : [new_admin];
				this.props.updateState(SCOPE, {
					generatedCert: cert,
					admins,
					loadingCert: false,
					error: '',
				});
				this.addAdmin(admins);
				Log.debug('Identity added to wallet', cert);
			})
			.catch((error) => {
				Log.error(error);
				this.props.updateState(SCOPE, {
					error: error.title
						? error
						: {
							title: 'error_add_identity',
							details: error.details ? error.details : error,
						},
					loadingCert: false,
				});
			});
	};

	onGenerateCert = () => {
		let opts = { ...this.props.ca };
		opts.enroll_id = this.props.enroll_id ? this.props.enroll_id : opts.enroll_id;
		opts.enroll_secret = this.props.enroll_secret ? this.props.enroll_secret : opts.enroll_secret;
		this.props.updateState(SCOPE, {
			loadingCert: true,
		});
		CertificateAuthorityRestApi.generateCertificate(opts)
			.then((resp) => {
				let cert = {
					name: this.props.identity_name,
					private_key: resp.private_key,
					certificate: resp.certificate,
					isDownloaded: false,
				};
				this.addIdentityToWallet(cert);
			})
			.catch((error) => {
				Log.error(error);
				let error_message = 'error_generate_cert';
				if (error && error.msg && typeof error.msg === 'string' && error.msg.indexOf('Authentication failure') >= 0) {
					error_message = 'invalid_enroll_id_secret';
				}
				this.props.updateState(SCOPE, {
					error: {
						title: error_message,
						details: error,
					},
					loadingCert: false,
				});
			});
	};

	onDownloadCert = () => {
		Helper.exportNode({
			name: this.props.generatedCert.name,
			cert: this.props.generatedCert.certificate,
			private_key: this.props.generatedCert.private_key,
			type: 'identity',
		});
		let generatedCert = { ...this.props.generatedCert };
		generatedCert.isDownloaded = true;
		this.props.updateState(SCOPE, {
			generatedCert: generatedCert,
		});
	};

	addRootCert = (rootCerts) => {
		if (!rootCerts) {
			rootCerts = this.props.rootCerts;
		}
		let hasBlankRow = rootCerts ? rootCerts.find((x) => x.cert === '') : false;
		if (!hasBlankRow) {
			let blank_cert = {
				cert: '',
			};
			const updated = rootCerts ? [...rootCerts, blank_cert] : [blank_cert];
			this.props.updateState(SCOPE, {
				rootCerts: updated,
			});
			this.getIdentities(updated);
		}
	};

	addTLSRootCert = (tlsRootCerts) => {
		if (!tlsRootCerts) {
			tlsRootCerts = this.props.tlsRootCerts;
		}
		let hasBlankRow = tlsRootCerts ? tlsRootCerts.find((x) => x.cert === '') : false;
		if (!hasBlankRow) {
			let blank_cert = {
				cert: '',
			};
			this.props.updateState(SCOPE, {
				tlsRootCerts: tlsRootCerts ? [...tlsRootCerts, blank_cert] : [blank_cert],
			});
		}
	};

	addAdmin = (admins) => {
		if (!admins) {
			admins = this.props.admins;
		}
		let hasBlankRow = admins ? admins.find((x) => x.cert === '') : false;
		if (!hasBlankRow) {
			let blank_admin = {
				cert: '',
			};
			this.props.updateState(SCOPE, {
				admins: admins ? [...admins, blank_admin] : [blank_admin],
			});
		}
	};

	onDeleteRootCert = (index) => {
		let updated = this.props.rootCerts.filter((c, i) => i !== index);
		let hasBlankRow = updated.find((x) => x.cert === '');
		if (!hasBlankRow) {
			updated.push({
				cert: '',
			});
		}
		this.props.updateState(SCOPE, {
			rootCerts: updated,
		});
		this.getIdentities(updated);
	};

	onDeleteTLSRootCert = (index) => {
		let updated = this.props.tlsRootCerts.filter((c, i) => i !== index);
		let hasBlankRow = updated.find((x) => x.cert === '');
		if (!hasBlankRow) {
			updated.push({
				cert: '',
			});
		}
		this.props.updateState(SCOPE, {
			tlsRootCerts: updated,
		});
	};

	onDeleteAdmin = (index) => {
		let updated = this.props.admins.filter((c, i) => i !== index);
		let hasBlankRow = updated.find((x) => x.cert === '');
		if (!hasBlankRow) {
			updated.push({
				cert: '',
			});
		}
		this.props.updateState(SCOPE, {
			admins: updated,
		});
	};

	onChangeRootCert = (index, value) => {
		let rootCert = this.props.rootCerts[index];
		rootCert.cert = value;
		const rootCerts = Object.assign([...this.props.rootCerts], { i: rootCert });
		this.props.updateState(SCOPE, { rootCerts });
		if (value) {
			this.addRootCert(rootCerts);
		}
	};

	onChangeTLSRootCert = (index, value) => {
		let rootCert = this.props.tlsRootCerts[index];
		rootCert.cert = value;
		const tlsRootCerts = Object.assign([...this.props.tlsRootCerts], { i: rootCert });
		this.props.updateState(SCOPE, { tlsRootCerts });
		if (value) {
			this.addTLSRootCert(tlsRootCerts);
		}
	};

	onChangeAdmin = (index, value) => {
		let admin = this.props.admins[index];
		admin.cert = value;
		const admins = Object.assign([...this.props.admins], { i: admin });
		this.props.updateState(SCOPE, { admins });
		if (value) {
			this.addAdmin(admins);
		}
	};

	validateMspid = (value) => {
		let mspid = value.msp_id;
		if (mspid) {
			let invalidCharacters = false;
			let isEmpty = false;
			Log.debug('Validating mspid: ', mspid);
			if (mspid.trim() !== '') {
				// Restrictions on MSPID
				//1. Contain only ASCII alphanumerics, dots '.', dashes '-'
				if (/[^a-zA-Z\d-.]/g.test(mspid)) {
					//check for invalid characters
					invalidCharacters = true;
				}
				//2. Are shorter than 250 characters.
				if (mspid.length > 250) {
					invalidCharacters = true;
				}
				//3. Are not the strings "." or "..".
				if (mspid === '.' || mspid === '..') {
					invalidCharacters = true;
				}
				Log.debug('Mspid has invalid characters: ', invalidCharacters);
			} else {
				isEmpty = true;
				Log.debug('Mspid is empty');
			}
			if (invalidCharacters || isEmpty) {
				this.props.updateState(SCOPE, {
					invalidMspError: invalidCharacters ? 'validation_mspid_invalid' : 'mspid_required',
				});
			} else {
				this.props.updateState(SCOPE, {
					invalidMspError: null,
				});
			}
		} else {
			this.props.updateState(SCOPE, {
				invalidMspError: null,
			});
		}
		this.props.updateState(SCOPE, {
			ca: null,
			selectedRootCA: 'select_ca',
			duplicateMspError: false,
		});
	};

	renderMSPDetails = (translate) => {
		const { msp_name, msp_id } = this.props;
		return (
			<div>
				<Form
					scope={SCOPE}
					id={SCOPE + '-details'}
					fields={[
						{
							name: 'msp_name',
							tooltip: 'generate_msp_name_tooltip',
							required: true,
							specialRules: Helper.SPECIAL_RULES_DISPLAY_NAME,
							default: msp_name,
						},
						{
							name: 'msp_id',
							tooltip: 'generate_msp_id_tooltip',
							required: true,
							specialRules: Helper.SPECIAL_RULES_MSP_ID,
							errorMsg: this.props.invalidMspError,
							default: msp_id,
						},
					]}
					onChange={(data, valid, fieldChanged) => {
						this.validateMspid(data);
						let updateState = {
							msp_name_valid: valid,
						};
						let fieldName = _.get(fieldChanged, 'name');
						if (fieldName === 'msp_name') {
							updateState.identity_name = `${data.msp_name} ${translate('admin')}`;
						}
						this.props.updateState(SCOPE, updateState);
					}}
				/>
			</div>
		);
	};

	renderRootCertDetails = (translate) => {
		const { ca, loading } = this.props;
		return (
			<div>
				<p className="ibp-accordion-desc">{translate('tls_root_cert_auth_details_desc')}</p>
				{this.props.cas && (
					<div className="ibp-root-cert-details">
						<Form
							scope={SCOPE}
							id={SCOPE + '-root'}
							fields={[
								{
									name: 'selectedRootCA',
									type: 'dropdown',
									tooltip: 'generate_msp_rootca_tooltip',
									default: ca ? ca : 'select_ca',
									required: true,
									options: this.props.cas,
									loading: loading,
								},
							]}
							onChange={this.onSelectRootCA}
						/>
						{this.props.notAvailable && <SidePanelWarning title="ca_not_available_title" subtitle="ca_not_available_text" />}
						<div className="ibp-generate-msp-cert-section">
							{!loading && this.props.selectedRootCA && this.props.selectedRootCA.type === 'fabric-ca' && this.renderRootCerts(translate)}
							{!loading && this.props.selectedRootCA && this.props.selectedRootCA.type === 'fabric-ca' && this.renderTLSRootCerts(translate)}
						</div>
						{this.props.duplicateMspError && (
							<div className="ibp-root-cert-details">
								<SidePanelWarning title="duplicate_mspid_error_title" subtitle={translate('duplicate_mspid_error_desc')} />
							</div>
						)}
					</div>
				)}
			</div>
		);
	};

	renderRootCerts = (translate) => {
		return (
			<div className="ibp-generate-msp-cert-section-root">
				<div className="ibp-tooltip-wrap ibp-msp-tooltip">
					<BlockchainTooltip triggerText={translate('root_certs')}>{translate('generate_msp_rootcert_tooltip')}</BlockchainTooltip>
				</div>
				<div>
					{this.props.rootCerts.map((rootCert, i) => {
						return (
							<div key={'rootCert_' + i} className="ibp-msp-row">
								<div className="ibp-msp-input">
									<input
										id={'ibp-root-cert-' + i}
										type="text"
										className="cds--text-input"
										placeholder={translate('root_cert_placeholder')}
										value={rootCert.cert}
										onChange={(event) => {
											this.onChangeRootCert(i, event.target.value);
										}}
										disabled={rootCert.isReadOnly}
										aria-label={translate('root_certificate')}
									/>
								</div>
								{!rootCert.isReadOnly && (
									<Button
										hasIconOnly
										type="button"
										renderIcon={() => <TrashCan size={20} />}
										kind="secondary"
										id={'ibp-remove-root-cert-' + i}
										iconDescription={translate('remove_cert')}
										tooltipAlignment="center"
										tooltipPosition="bottom"
										className="ibp-msp-remove"
										size="lg"
										onClick={() => {
											this.onDeleteRootCert(i);
										}}
									/>
								)}
							</div>
						);
					})}
					{this.props.gettingRootCerts && <InlineLoading />}
				</div>
			</div>
		);
	};

	renderTLSRootCerts = (translate) => {
		return (
			<div className="ibp-generate-msp-cert-section-tls">
				<div className="ibp-tooltip-wrap ibp-msp-tooltip">
					<BlockchainTooltip triggerText={translate('tls_root_certs')}>{translate('generate_msp_tls_rootcert_tooltip')}</BlockchainTooltip>
				</div>
				<div>
					{this.props.tlsRootCerts.map((tlsRootCert, i) => {
						return (
							<div key={'tlsRootCert_' + i} className="ibp-msp-row">
								<div className="ibp-msp-input">
									<input
										id={'ibp-tls-root-cert-' + i}
										type="text"
										className="cds--text-input"
										placeholder={translate('tls_root_cert_placeholder')}
										value={tlsRootCert.cert}
										onChange={(event) => {
											this.onChangeTLSRootCert(i, event.target.value);
										}}
										disabled={tlsRootCert.isReadOnly}
										aria-label={translate('tls_root_certificate')}
									/>
								</div>
								{!tlsRootCert.isReadOnly && (
									<Button
										hasIconOnly
										type="button"
										renderIcon={() => <TrashCan size={20} />}
										kind="secondary"
										id={'ibp-remove-tls-root-cert-' + i}
										className="ibp-msp-remove"
										iconDescription={translate('remove_cert')}
										tooltipAlignment="center"
										tooltipPosition="bottom"
										size="lg"
										onClick={() => {
											this.onDeleteTLSRootCert(i);
										}}
									/>
								)}
							</div>
						);
					})}
				</div>
			</div>
		);
	};

	addOUIdentifier = (certificate) => {
		let state = {};
		if (this.props.feature_flags && this.props.feature_flags.enable_ou_identifier) {
			state.fabric_node_ous = ChannelApi.getNodeOUIdentifier(certificate);
		} else {
			state.fabric_node_ous = {};
		}
		this.props.updateState(SCOPE, {
			...state,
		});
	};

	renderGenerateCertificate = (translate) => {
		const { enroll_id, enroll_secret, identity_name } = this.props;
		return (
			<div>
				<p className="cds--type-delta ibp-generate-cert-label">{translate('generate_certificate')}</p>
				<Form
					scope={SCOPE}
					id={SCOPE}
					fields={[
						{
							name: 'enroll_id',
							type: this.props.users.length ? 'dropdown' : undefined,
							options: this.props.users.length ? this.props.users.map((user) => user.id) : [],
							tooltip: 'generate_msp_enroll_id_tooltip',
							required: true,
							specialRules: Helper.SPECIAL_RULES_ENROLL_ID,
							loading: this.props.loadingUsers ? true : false,
							default: enroll_id && enroll_id,
						},
						{
							name: 'enroll_secret',
							type: 'password',
							tooltip: 'generate_msp_enroll_secret_tooltip',
							required: true,
							specialRules: Helper.SPECIAL_RULES_ENROLL_SECRET,
							default: enroll_secret && enroll_secret,
						},
						{
							name: 'identity_name',
							tooltip: 'generate_msp_identity_name_tooltip',
							required: true,
							default: identity_name && identity_name,
							specialRules: Helper.SPECIAL_RULES_IDENTITY_NAME,
						},
					]}
					onChange={(data, enroll_valid) => {
						this.props.updateState(SCOPE, { enroll_valid });
					}}
				/>
				<div className="ibp-generate-cert-button">
					{!this.props.generatedCert.certificate && (
						<Button
							id="btn-generate-certificate"
							kind="primary"
							className="ibp-generate-certificate"
							onClick={this.onGenerateCert}
							disabled={this.props.loadingCert || this.props.selectedRootCA === 'select_ca' || !this.props.enroll_valid}
						>
							{translate('generate')}
						</Button>
					)}
					{this.props.loadingCert && <InlineLoading />}
					{this.props.generatedCert.certificate && (
						<div>
							{!this.props.generatedCert.isDownloaded && (
								<div className="ibp-error-panel">
									<SidePanelWarning title="please_note" subtitle="download_cert_first" />
								</div>
							)}
							<Button id="btn-export-certificate" kind="secondary" className="ibp-generate-certificate" onClick={this.onDownloadCert}>
								{translate('export_node_config')}
							</Button>
						</div>
					)}
				</div>
			</div>
		);
	};

	toggleIdentityType = (translate) => {
		const { msp_name } = this.props;
		this.props.updateState(SCOPE, {
			admins: [],
		});
		if (this.props.identityType === 'new') {
			this.props.updateState(SCOPE, {
				identityType: 'existing',
				identity: null,
				identityValid: false,
				admins: [],
			});
		} else {
			const generatedCertAdmin = this.props.generatedCert.certificate
				? [
					{
						cert: this.props.generatedCert.certificate,
						isReadOnly: true,
					},
				]
				: [];
			this.props.updateState(SCOPE, {
				identityType: 'new',
				identity: null,
				identityValid: false,
				identity_name: `${msp_name} ${translate('admin')}`,
				admins: generatedCertAdmin,
			});
		}
	};

	renderAdmins = (translate) => {
		const { admins, ca, identity, identityType } = this.props;
		const caName = ca.name;
		return (
			<div>
				<p className="ibp-generate-msp-wizard-desc">{translate('admins_desc')}</p>
				<ContentSwitcher
					className="ibp-identity-type-toggle"
					onChange={() => this.toggleIdentityType(translate)}
					selectedIndex={identityType === 'existing' ? 1 : 0}
				>
					<Switch kind="button" id="ibp-use-new-identity" name="new" text={translate('use_new_identity')} />
					<Switch kind="button" id="ibp-use-existing-identity" name="existing" text={translate('use_existing_identity')} />
				</ContentSwitcher>
				{identityType === 'new' ? (
					this.renderGenerateCertificate(translate)
				) : (
					<>
						<p className="ibp-generate-msp-selected-ca-text">
							{RenderParamHTML(translate, 'identities_from_chosen_ca', {
								name: (
									<CodeSnippet
										type="inline"
										ariaLabel={translate('copy_text', { copyText: caName })}
										onClick={() => Clipboard.copyToClipboard(caName)}
										light={false}
									>
										{caName}
									</CodeSnippet>
								),
							})}
						</p>
						<Form
							scope={SCOPE}
							id={SCOPE + '-root'}
							fields={[
								{
									name: 'existingSelectedIdentity',
									type: 'dropdown',
									tooltip: 'generate_msp_identity_tooltip',
									default: identity ? identity : 'select_identity',
									required: true,
									options: this.props.rootCertIdentities,
								},
							]}
							onChange={this.onSelectIdentity}
						/>
					</>
				)}
				{admins && admins.length > 0 && admins[0].cert.length > 0 && (
					<div>
						<div className="ibp-tooltip-wrap">
							{translate('admin_certificate')}
							<span className="ibp-msp-tooltip">
								<BlockchainTooltip>{translate('generate_msp_admin_tooltip')}</BlockchainTooltip>
							</span>
						</div>
						<div>
							{admins.map((admin, i) => {
								return (
									<div key={'admin_' + i} className="ibp-msp-row">
										<div className="ibp-msp-input">
											<input
												id={'ibp-msp-admin-' + i}
												type="text"
												className="cds--text-input"
												placeholder={translate('admin_certificate_placeholder')}
												value={admin.cert}
												onChange={(event) => {
													this.onChangeAdmin(i, event.target.value);
												}}
												disabled={admin.isReadOnly}
												aria-label={translate('admin_certificate')}
											/>
										</div>
										{!admin.isReadOnly && (
											<Button
												hasIconOnly
												type="button"
												renderIcon={() => <TrashCan size={20} />}
												kind="secondary"
												id={'ibp-remove-admin-' + i}
												iconDescription={translate('remove_cert')}
												tooltipAlignment="center"
												tooltipPosition="bottom"
												className="ibp-msp-remove"
												size="lg"
												onClick={() => {
													this.onDeleteAdmin(i);
												}}
											/>
										)}
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		);
	};

	renderMSPTimeline(translate) {
		const { onClose, timelineSteps, timelineLoading, selectedTimelineStep } = this.props;
		if (!timelineSteps || timelineLoading) return;
		return (
			<Timeline
				steps={timelineSteps}
				onClose={onClose}
				selectedTimelineStep={selectedTimelineStep}
				header={translate('create_msp_definition')}
				estTime={''}
				progressWithChecks={false}
			/>
		);
	}

	renderSummary = (translate, key, value, isCert = false) => {
		const multipleValues = _.isArray(value);
		return (
			<div>
				{multipleValues ? (
					<div className="ibp-summary-section">
						<div className="ibp-summary-section-key">{translate(key)}</div>
						<div className="ibp-summary-section-array-value">
							{value.map((item, i) => {
								return (
									<div key={'item_' + i} className="ibp-summary-section-value">
										{isCert && item.cert.length ? (
											<input
												id={`ibp-msp-admin-${key}-${i}`}
												type="text"
												className="cds--text-input"
												value={item.cert}
												disabled={true}
												aria-label={translate('admin_certificate')}
											/>
										) : (
											!isCert && (item.value || item)
										)}
									</div>
								);
							})}
						</div>
					</div>
				) : (
					<div className="ibp-summary-section">
						<div className="ibp-summary-section-key">{translate(key)}</div>
						<div className="ibp-summary-section-value">{value}</div>
					</div>
				)}
			</div>
		);
	};

	renderSection = (translate, section) => {
		const { admins, ca, identity_name, msp_id, msp_name, rootCerts, tlsRootCerts, viewing } = this.props;
		const caName = ca && ca.display_name;
		if (viewing !== section) return;
		return (
			<FocusComponent setFocus={this.props.setFocus}>
				<div className="ibp-generate-msp-modal-content">
					{viewing === 'msp_details' && (
						<>
							<h2>{translate('msp_def_details')}</h2>
							<p className="ibp-modal-desc">{translate('generate_msp_desc1')}</p>
							<p className="ibp-modal-desc">{translate('generate_msp_desc2')}</p>
							{this.renderMSPDetails(translate)}
						</>
					)}
					{viewing === 'root_ca_details' && (
						<>
							<h2>{translate('root_cert_details')}</h2>
							{this.renderRootCertDetails(translate)}
						</>
					)}
					{viewing === 'additional_msp_admins' && (
						<>
							<h2>{translate('admin_certs')}</h2>
							{this.renderAdmins(translate)}
						</>
					)}
					{viewing === 'summary' && (
						<>
							<h2>{translate('review_msp_information')}</h2>
							{this.renderSummary(translate, 'msp_name', msp_name)}
							{this.renderSummary(translate, 'msp_id', msp_id)}
							{this.renderSummary(translate, 'admin_cert', identity_name)}
							{this.renderSummary(translate, 'selected_ca', caName)}
							{rootCerts && rootCerts.filter((x) => x.cert !== '').length > 1 && this.renderSummary(translate, 'root_certs', rootCerts, true)}
							{this.props.intermediate_certs &&
								this.props.intermediate_certs.length > 0 &&
								this.renderSummary(translate, 'intermediate_ca', this.props.intermediate_certs)}
							{tlsRootCerts && tlsRootCerts.filter((x) => x.cert !== '').length > 1 && this.renderSummary(translate, 'tls_root_certs', tlsRootCerts, true)}
							{this.props.tls_intermediate_certs &&
								this.props.tls_intermediate_certs.length > 0 &&
								this.renderSummary(translate, 'tls_intermediate_ca', this.props.tls_intermediate_certs)}
							{admins && admins.filter((x) => x.cert !== '').length > 1 && this.renderSummary(translate, 'admins', admins, true)}
						</>
					)}
				</div>
			</FocusComponent>
		);
	};

	setView = (view, nextStepIndex) => {
		this.props.updateState(SCOPE, {
			viewing: view,
			selectedTimelineStep: {
				currentStepInsideOfGroupIndex: 0,
				currentStepIndex: nextStepIndex,
			},
		});
		this.enableNavigationLinks(view, nextStepIndex, 0);
		// set focus to first item on step
		this.props.updateState(SCOPE, { setFocus: false });
		window.setTimeout(() => {
			this.props.updateState(SCOPE, { setFocus: true });
		}, 100);
	};

	enableNavigationLinks = (view, group, step) => {
		const { invalidMspError, msp_id, msp_name, msp_name_valid, selectedCA } = this.props;
		const isRootCertNavItemEnabled = msp_id || !invalidMspError || msp_name || msp_name_valid;
		const isAdminCertNavItemEnabled = !_.isEmpty(selectedCA);
		if (isRootCertNavItemEnabled) {
			// update timeline steps
			this.updateTimelineSteps(true, false, group, step);
		} else if (isAdminCertNavItemEnabled) {
			// update timeline steps
			this.updateTimelineSteps(true, false, group, step);
		}
	};

	updateTimelineSteps = (enable, all, currentGroup, currentStep) => {
		let updatedSteps = [];
		this.props.timelineSteps.forEach((group, index) => {
			group.forEach((subGroup) => {
				if (all) {
					subGroup.groupSteps.forEach((step) => {
						step.isLink = enable;
					});
				} else {
					subGroup.groupSteps.forEach((step, stepIndex) => {
						if (index < currentGroup || (index === currentGroup && stepIndex <= currentStep)) {
							step.isLink = enable;
						} else if (this.completedSteps.includes(step.label)) {
							step.isLink = enable;
						} else {
							step.isLink = false;
						}
					});
				}
			});
			updatedSteps.push(group);
		});
		this.props.updateState(SCOPE, {
			timelineSteps: updatedSteps,
		});
	};

	isStepCompleted = (step) => {
		const { invalidMspError, msp_name_valid, msp_name, msp_id } = this.props;
		let haveNoAdminCert = !this.props.admins || this.props.admins.filter((x) => x.cert !== '').length === 0;
		let complete;
		if (step === 'msp_details') {
			complete = msp_id && !invalidMspError && msp_name && msp_name_valid;
		} else if (step === 'root_ca_details') {
			complete = this.props.rootCerts && this.props.rootCerts.filter((x) => x.cert !== '').length !== 0;
		} else if (step === 'additional_msp_admins' || step === 'summary') {
			complete =
				!this.props.loading &&
				!this.props.loadingCert &&
				this.props.msp_id &&
				!this.props.invalidMspError &&
				this.props.msp_name &&
				this.props.msp_name_valid &&
				this.props.rootCerts &&
				this.props.rootCerts.filter((x) => x.cert !== '').length !== 0 &&
				!haveNoAdminCert;
		}
		if (complete && !this.completedSteps.includes(step)) {
			this.completedSteps.push(step);
		} else if (!complete && this.completedSteps.includes(step)) {
			let copy = JSON.parse(JSON.stringify(this.completedSteps));
			let filteredSteps = copy.filter((x) => x !== step);
			this.completedSteps = filteredSteps;
		}
		return complete;
	};

	getButtons = (translate) => {
		let buttons = [];
		let back;
		let next;
		let isComplete;
		const { submitting, viewing } = this.props;
		switch (viewing) {
			case 'msp_details':
				isComplete = this.isStepCompleted('msp_details');
				next = () => this.setView('root_ca_details', 1);
				break;
			case 'root_ca_details':
				isComplete = this.isStepCompleted('root_ca_details');
				back = () => this.setView('msp_details', 0);
				next = () => this.setView('additional_msp_admins', 2);
				break;
			case 'additional_msp_admins':
				isComplete = this.isStepCompleted('additional_msp_admins');
				back = () => this.setView('root_ca_details', 1);
				next = () => this.setView('summary', 3);
				break;
			case 'summary':
				isComplete = this.isStepCompleted('summary');
				back = () => this.setView('additional_msp_admins', 2);
				next = () => {
					if (isComplete) {
						this.onSubmit();
					}
				};
				break;
			default:
				next = () => this.showStep('msp_details', 0);
				break;
		}
		buttons.push(
			{
				text: translate('back'),
				onClick: back,
			},
			{
				text: viewing === 'summary' ? translate('generate_msp') : translate('next'),
				onClick: viewing === 'summary' ? () => this.onSubmit() : next,
				disabled: !isComplete || submitting,
				type: viewing === 'summary' ? 'submit' : '',
			}
		);
		return buttons;
	};

	render() {
		// let haveNoAdminOU = !this.props.fabric_node_ous || !this.props.fabric_node_ous.admin_ou_identifier;
		const translate = this.props.t;
		return (
			<SidePanel
				id="generateMSPModal"
				closed={this.props.onClose}
				ref={(sidePanel) => (this.sidePanel = sidePanel)}
				buttons={this.getButtons(translate)}
				error={this.props.error}
				submitting={this.props.submitting}
				verticalPanel
			>
				{this.renderMSPTimeline(translate)}
				{this.renderSection(translate, 'msp_details')}
				{this.renderSection(translate, 'root_ca_details')}
				{this.renderSection(translate, 'additional_msp_admins')}
				{this.renderSection(translate, 'summary')}
			</SidePanel>
		);
	}
}

const dataProps = {
	ca: PropTypes.object,
	loading: PropTypes.bool,
	submitting: PropTypes.bool,
	loadingCert: PropTypes.bool,
	loadingUsers: PropTypes.bool,
	msp_id: PropTypes.string,
	msp_name: PropTypes.string,
	rootCerts: PropTypes.array,
	tlsRootCerts: PropTypes.array,
	admins: PropTypes.array,
	cas: PropTypes.array,
	generatedCert: PropTypes.object,
	users: PropTypes.array,
	enroll_id: PropTypes.string,
	enroll_secret: PropTypes.string,
	identity_name: PropTypes.string,
	error: PropTypes.string,
	disableSubmit: PropTypes.bool,
	intermediate_certs: PropTypes.array,
	tls_intermediate_certs: PropTypes.array,
	certificate: PropTypes.object,
	tls_root_certs: PropTypes.array,
	revocation_list: PropTypes.array,
	organizational_unit_identifiers: PropTypes.array,
	fabric_node_ous: PropTypes.array,
	selectedRootCA: PropTypes.oneOfType([PropTypes.object, PropTypes.string]).isRequired,
	invalidMspError: PropTypes.string,
	notAvailable: PropTypes.bool,
	msp_name_valid: PropTypes.bool,
	enroll_valid: PropTypes.bool,
	gettingRootCerts: PropTypes.bool,
	viewing: PropTypes.string,
	timelineSteps: PropTypes.array,
	selectedTimelineStep: PropTypes.object,
	identityValid: PropTypes.bool,
	identityType: PropTypes.string,
	identity: PropTypes.object,
	rootCertIdentities: PropTypes.array,
	setFocus: PropTypes.bool,
	duplicateMspError: PropTypes.bool,
};

GenerateMSPModal.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	closed: PropTypes.func,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	(state) => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['host_url'] = state['settings'] ? state['settings']['host_url'] : null;
		newProps['feature_flags'] = state['settings'] ? state['settings']['feature_flags'] : null;
		return newProps;
	},
	{
		updateState,
	}
)(withTranslation()(GenerateMSPModal));
