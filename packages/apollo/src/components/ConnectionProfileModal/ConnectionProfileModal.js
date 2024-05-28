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
import { SkeletonText, Toggle } from 'carbon-components-react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { promisify } from 'util';
import { updateState } from '../../redux/commonActions';
import { CertificateAuthorityRestApi } from '../../rest/CertificateAuthorityRestApi';
import IdentityApi from '../../rest/IdentityApi';
import { PeerRestApi } from '../../rest/PeerRestApi';
import StitchApi from '../../rest/StitchApi';
import Helper from '../../utils/helper';
import BlockchainTooltip from '../BlockchainTooltip/BlockchainTooltip';
import Form from '../Form/Form';
import Logger from '../Log/Logger';
import SidePanelWarning from '../SidePanelWarning/SidePanelWarning';
import TranslateLink from '../TranslateLink/TranslateLink';
import Wizard from '../Wizard/Wizard';
import WizardStep from '../WizardStep/WizardStep';
import RenderParamHTML from '../RenderHTML/RenderParamHTML';

const naturalSort = require('javascript-natural-sort');

const SCOPE = 'connectionProfile';
const Log = new Logger(SCOPE);

class ConnectionProfileModal extends Component {
	async componentDidMount() {
		this.reset();
		await this.getCAs();
		await this.getPeers();
	}

	componentWillUnmount() {
		this.reset();
	}

	reset() {
		this.props.updateState(SCOPE, {
			includeCA: true,
			selectedCA: null,
			selectedPeers: [],
			channelData: {},
			channels: [],
			showAllChannels: false,
			showChannelWarning: false,
		});
	}

	async getCAs() {
		let cas = this.props.cas;
		this.props.updateState(SCOPE, { loadingCAs: true });
		if (!this.props.cas) {
			cas = [];
			try {
				cas = await CertificateAuthorityRestApi.getCAs();
				this.props.updateState(SCOPE, {
					cas,
				});
			} catch (error) {
				Log.error('An error occurred when getting list of available CAs: ', error);
				this.props.updateState(SCOPE, {
					cas: [],
				});
			}
		}
		let selectedCA = null;
		if (this.props.msp && this.props.msp.root_certs) {
			for (let i = 0; i < cas.length && !selectedCA; i++) {
				const ca = cas[i];
				let cert = null;
				try {
					cert = await CertificateAuthorityRestApi.getRootCertificate(ca, false);
				} catch (error) {
					Log.error('Unable to get root certificate: ', error);
				}
				if (cert) {
					const certArray = Helper.getCertArray(cert);
					if (certArray) {
						for (let j = 0; j < certArray.length; j++) {
							const parseCert = StitchApi.parseCertificate(certArray[j]);
							if (parseCert && parseCert.issuer === parseCert.subject) {
								const rootCert = parseCert.base_64_pem;
								for (let k = 0; k < this.props.msp.root_certs.length; k++) {
									if (rootCert === this.props.msp.root_certs[k]) {
										selectedCA = ca;
									}
								}
							}
						}
					}
				}
			}
		}
		this.props.updateState(SCOPE, {
			selectedCA,
			includeCA: !!selectedCA,
			loadingCAs: false,
		});
	}

	async getPeers() {
		if (!this.props.peers) {
			this.props.updateState(SCOPE, { loadingPeers: true });
			let peers = [];
			try {
				peers = await PeerRestApi.getPeers();
				this.props.updateState(SCOPE, {
					peers,
					loadingPeers: false,
				});
			} catch (error) {
				Log.error('An error occurred when getting list of available peers: ', error);
				this.props.updateState(SCOPE, {
					peers: [],
					loadingPeers: false,
				});
			}
		}
	}

	onSubmit = () => {
		return new Promise((resolve, reject) => {
			let certificateAuthorities = {};
			if (this.props.includeCA) {
				let url_key = this.props.selectedCA.api_url.replace('https://', '');
				url_key = url_key.replace('http://', '');
				certificateAuthorities[url_key] = {
					url: this.props.selectedCA.api_url,
					caName: this.props.selectedCA.msp.ca.name,
					tlsCACerts: {
						pem: [atob(this.props.selectedCA.msp.component.tls_cert)],
					},
				};
			}

			let peers = {};
			this.props.selectedPeers.forEach(peer => {
				let tlsRoot = peer.msp.tlsca.root_certs[0];
				let l_peer_backend_addr = peer.backend_addr;
				if (l_peer_backend_addr && l_peer_backend_addr.indexOf('://') !== -1) {
					l_peer_backend_addr = l_peer_backend_addr.slice(l_peer_backend_addr.indexOf('://') + 3);
				}
				if (tlsRoot) {
					tlsRoot = atob(tlsRoot);
				}
				peers[l_peer_backend_addr] = {
					url: 'grpcs://' + l_peer_backend_addr,
					tlsCACerts: {
						pem: tlsRoot,
					},
					grpcOptions: {
						'ssl-target-name-override': l_peer_backend_addr.slice(0, l_peer_backend_addr.indexOf(':')),
					},
				};
			});

			let organizations = {};
			organizations[this.props.msp.msp_id] = {
				mspid: this.props.msp.msp_id,
				certificateAuthorities: Object.keys(certificateAuthorities) || [],
				peers: Object.keys(peers) || [],
			};

			let profile = {
				name: this.props.msp.msp_id + 'profile',
				description: 'Network on IBP v2',
				version: '1.0.0',
				client: {
					organization: this.props.msp.msp_id,
				},
				organizations,
				peers,
				certificateAuthorities,
			};

			let filename = this.props.msp.msp_id + '_profile.json';
			let file = JSON.stringify(profile, null, '\t');
			const createTarget = document.querySelector('.side__panel--outer--container') || document.body;
			let link = document.createElement('a');
			if (link.download !== undefined) {
				let blob = new Blob([file], { type: 'application/json;' });
				let url = URL.createObjectURL(blob);
				link.setAttribute('download', filename);
				link.setAttribute('href', url);
				link.style.visibility = 'hidden';
				createTarget.appendChild(link);
				link.click();
				createTarget.removeChild(link);
			}

			resolve();
		});
	};

	renderSelectCA(translate) {
		let include_ca = translate('connection_profile_include_ca');
		if (this.props.selectedCA) {
			include_ca = RenderParamHTML(translate, 'connection_profile_include_ca_2', {
				ca: <span className="ibp-ca-name">{this.props.selectedCA.display_name}</span>
			});
		}
		return (
			<>
				<div className="ibp-form">
					<div className="ibp-form-field">
						<label className="ibp-form-label">
							<BlockchainTooltip type="definition"
								tooltipText={translate('connection_profile_include_ca_tooltip')}
							>
								{include_ca} *
							</BlockchainTooltip>
						</label>
						{this.props.loadingCAs ? (
							<div>
								<SkeletonText
									style={{
										width: '100%',
										height: '2rem',
									}}
								/>
							</div>
						) : (
							<div className="ibp-form-input">
								<Toggle
									id="connection-profile-include-ca"
									toggled={this.props.includeCA}
									onToggle={() => {
										this.props.updateState(SCOPE, {
											includeCA: !this.props.includeCA,
										});
									}}
									onChange={() => { }}
									aria-label={translate('connection_profile_include_ca')}
									labelA={translate('no')}
									labelB={translate('yes')}
									disabled={!this.props.selectedCA}
								/>
							</div>
						)}
					</div>
					{!this.props.loadingCAs && !this.props.selectedCA && (
						<div>
							<SidePanelWarning
								title=""
								subtitle={
									<div>
										{translate('connection_profile_ca_warning')}
										<a
											href={translate('connection_profile_ca_link', { DOC_PREFIX: this.props.docPrefix })}
											target="_blank"
											rel="noopener noreferrer"
											className="tl-link ibp-important-link"
										>
											{translate('find_out_more')}
										</a>
									</div>
								}
							/>
						</div>
					)}
				</div>
			</>
		);
	}

	async updateChannels(peers) {
		let showChannelWarning = false;
		this.props.updateState(SCOPE, {
			loadingChannels: true,
			showChannelWarning,
		});
		let channels = {};
		for (let i = 0; i < peers.length; i++) {
			const peer = peers[i];
			let channelList;
			if (this.props.channelData[peer.node_id] === undefined) {
				const id = await IdentityApi.getAssociatedIdentity(peer);
				if (id) {
					try {
						const opts = {
							msp_id: peer.msp_id,
							client_cert_b64pem: id.cert,
							client_prv_key_b64pem: id.private_key,
							host: peer.url2use,
						};
						const getChannelsOnPeer = promisify(window.stitch.getChannelsOnPeer);
						const resp = await getChannelsOnPeer(opts);
						channelList = _.get(resp, 'data.channelsList') || [];
						this.props.channelData[peer.node_id] = channelList;
					} catch (error) {
						Log.error('An error occurred when getting channels: ', error);
						this.props.channelData[peer.node_id] = null;
					}
				} else {
					this.props.channelData[peer.node_id] = null;
				}
			}
			channelList = this.props.channelData[peer.node_id];
			if (channelList) {
				for (let j = 0; j < channelList.length; j++) {
					channels[channelList[j].channelId] = true;
				}
			} else {
				showChannelWarning = true;
			}
		}
		channels = Object.keys(channels);
		channels = channels
			? channels.sort((a, b) => {
				return naturalSort(a, b);
			})
			: [];
		this.props.updateState(SCOPE, {
			channelData: this.props.channelData,
			channels,
			loadingChannels: false,
			showChannelWarning,
		});
	}

	renderSelectPeers(translate) {
		let channels = this.props.channels || [];
		let showMore = 0;
		let showLess = false;
		if (channels.length > 4) {
			if (this.props.showAllChannels) {
				showLess = true;
			} else {
				showMore = channels.length - 4;
				channels = channels.slice(0, 4);
			}
		}
		let text = channels.length ? channels[0] : translate('empty_peer_channels_title');
		for (let i = 1; i < channels.length; i++) {
			text = text + ', ' + channels[i];
		}
		if (showMore) {
			text = text + ', ...';
		}
		const peers = this.props.peers ? this.props.peers.filter(peer => peer.msp_id === this.props.msp.msp_id) : [];
		return (
			<>
				{this.props.loadingCAs ? (
					<div>
						<SkeletonText
							style={{
								width: '100%',
								height: '2rem',
							}}
						/>
					</div>
				) : (
					<Form
						scope={SCOPE}
						id={SCOPE + '_selectPeers'}
						fields={[
							{
								name: 'selectedPeers',
								label: 'connection_profile_peers',
								type: 'multiselect2',
								options: peers,
								placeholder: 'peers',
								required: true,
								errorMsg: peers && peers.length ? null : 'no_peers_available',
							},
						]}
						onChange={data => {
							this.updateChannels(data.selectedPeers);
						}}
					/>
				)}
				<div className="ibp-form">
					<div className="ibp-form-field">
						<label className="ibp-form-label">{translate('connection_profile_channels')}</label>
						<div className="ibp-form-input">
							{this.props.loadingChannels ? (
								<SkeletonText
									style={{
										width: '100%',
										height: '2rem',
									}}
								/>
							) : (
								<>
									<div className="ibp-channel-list">{text}</div>
									{!!showMore && (
										<div>
											<button
												className="ibp-see-more ibp-button-link ibp-link"
												onClick={() => {
													this.props.updateState(SCOPE, { showAllChannels: true });
												}}
											>
												{translate('see_more', { count: showMore })}
											</button>
										</div>
									)}
									{showLess && (
										<div>
											<button
												className="ibp-see-less ibp-button-link ibp-link"
												onClick={() => {
													this.props.updateState(SCOPE, { showAllChannels: false });
												}}
											>
												{translate('see_less')}
											</button>
										</div>
									)}
									{this.props.showChannelWarning && (
										<div>
											<SidePanelWarning title=""
												subtitle="connection_profile_channel_warning"
											/>
										</div>
									)}
								</>
							)}
						</div>
					</div>
				</div>
			</>
		);
	}

	isDetailsValid() {
		let valid = true;
		if (!this.props.selectedPeers || !this.props.selectedPeers.length) {
			valid = false;
		}
		return valid;
	}

	renderDetails(translate) {
		return (
			<WizardStep type="WizardStep"
				disableSubmit={this.props.loadingCAs || this.props.loadingPeers || !this.isDetailsValid()}
			>
				<div className="ibp-connection-profile">
					<TranslateLink className="ibp-header-subtext"
						text="connection_profile_subtext"
					/>
					{this.renderSelectCA(translate)}
					{this.renderSelectPeers(translate)}
				</div>
			</WizardStep>
		);
	}

	render() {
		const translate = this.props.t;
		return (
			<Wizard
				title="create_connection_profile"
				onClose={this.props.onClose}
				onSubmit={this.onSubmit}
				submitButtonLabel={translate('download_connection_profile')}
			>
				{this.renderDetails(translate)}
			</Wizard>
		);
	}
}

const dataProps = {
	includeCA: PropTypes.bool,
	loadingCAs: PropTypes.bool,
	loadingPeers: PropTypes.bool,
	cas: PropTypes.array,
	selectedCA: PropTypes.any,
	peers: PropTypes.array,
	selectedPeers: PropTypes.array,
	channelData: PropTypes.object,
	channels: PropTypes.array,
	loadingChannels: PropTypes.bool,
	showAllChannels: PropTypes.bool,
	showChannelWarning: PropTypes.bool,
};

ConnectionProfileModal.propTypes = {
	...dataProps,
	docPrefix: PropTypes.string,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
	updateState: PropTypes.func,
	msp: PropTypes.object,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		if (state['cas'] && state['cas']['caList']) {
			newProps['cas'] = state['cas']['caList'];
		}
		if (state['peers'] && state['peers']['peerList']) {
			newProps['peers'] = state['peers']['peerList'];
		}
		newProps['docPrefix'] = state['settings'] ? state['settings']['docPrefix'] : null;
		return newProps;
	},
	{
		updateState,
	}
)(withTranslation()(ConnectionProfileModal));
