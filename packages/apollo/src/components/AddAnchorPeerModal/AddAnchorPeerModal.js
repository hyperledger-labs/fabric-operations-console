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
import { clearNotifications, showError, updateState } from '../../redux/commonActions';
import ChannelApi from '../../rest/ChannelApi';
import { OrdererRestApi } from '../../rest/OrdererRestApi';
import Helper from '../../utils/helper';
import Form from '../Form/Form';
import Logger from '../Log/Logger';
import SidePanel from '../SidePanel/SidePanel';
import SidePanelWarning from '../SidePanelWarning/SidePanelWarning';
import FocusComponent from '../FocusComponent/FocusComponent';
import _ from 'lodash';

const SCOPE = 'addAnchorPeerModal';
const Log = new Logger(SCOPE);

export class AddAnchorPeerModal extends Component {
	cName = 'AddAnchorPeerModal';

	componentDidMount() {
		OrdererRestApi.getOrderers(true).then(l_orderers => {
			this.props.updateState(SCOPE, {
				orderers: l_orderers,
			});
		});

		if (this.props.orderer) {
			this.props.updateState(SCOPE, {
				selectedOrderer: this.props.orderer,
				selectedPeers: null,
			});
		}
		this.setFocus();
	}

	componentWillUnmount() {
		this.props.updateState(SCOPE, {
			error: null,
			submitting: false,
		});
	}

	setFocus = () => {
		// set focus to first item on step
		this.props.updateState(SCOPE, { setFocus: false });
		window.setTimeout(() => {
			this.props.updateState(SCOPE, { setFocus: true });
		}, 100);
	};

	async addAnchorPeers(org_anchor_peers, consenterUrl) {
		const all = [];
		for (let org in org_anchor_peers) {
			let opts = {
				channel_id: this.props.channelId,
				msp_id: org,
				configtxlator_url: this.props.configtxlator_url,
				orderer_host: consenterUrl ? consenterUrl : this.props.selectedOrderer.url2use,
				client_cert_b64pem: org_anchor_peers[org].client_cert_b64pem,
				client_prv_key_b64pem: org_anchor_peers[org].client_prv_key_b64pem,
				anchor_peers: org_anchor_peers[org].anchor_peers,
			};
			all.push(ChannelApi.addChannelAnchorPeers(opts));
		}
		return Promise.all(all);
	}

	onSave = async() => {
		let org_anchor_peers = {};
		this.props.selectedPeers.forEach(peer => {
			org_anchor_peers[peer.msp_id] = {
				anchor_peers: org_anchor_peers[peer.msp_id] ? [...org_anchor_peers[peer.msp_id].anchor_peers, peer.backend_addr] : [peer.backend_addr],
				client_cert_b64pem: peer.cert,
				client_prv_key_b64pem: peer.private_key,
			};
		});

		this.props.updateState(SCOPE, {
			submitting: true,
			error: null,
		});

		let consenterUrl;
		if (_.has(this.props.selectedOrderer, 'raft') && this.props.consenters) {
			// Use the orderer node that is in the channel consenter set
			const consenter_addresses = this.props.consenters.map(x => x.host + ':' + x.port);
			const orderer = this.props.selectedOrderer.raft.find(x => consenter_addresses.includes(_.toLower(x.backend_addr)));
			consenterUrl = orderer.url2use;
		}
		try {
			const resps = await this.addAnchorPeers(org_anchor_peers, consenterUrl);
			let error = false;
			resps.forEach(resp => {
				Log.debug('Add anchor peer response:', resp);
				if (resp.message !== 'ok') {
					error = true;
				}
			});
			if (!error) {
				let timeout = 0;
				if (resps.length > 1) {
					timeout = 2000;
				}
				setTimeout(() => {
					this.sidePanel.closeSidePanel();
					this.props.onComplete();
				}, timeout);
			} else {
				this.props.updateState(SCOPE, {
					submitting: false,
					error: {
						title: 'error_adding_anchor_peers',
						details: error.msg ? error.msg : error,
					},
				});
			}
		} catch (error) {
			Log.error(error);
			this.props.updateState(SCOPE, {
				submitting: false,
				error: {
					title: 'error_adding_anchor_peers',
					details: error.msg ? error.msg : error,
				},
			});
		}
	};

	onPeerChange = (change, valid) => {
		this.props.updateState(SCOPE, { peerValid: valid });
	};

	render = () => {
		const translate = this.props.translate;
		return (
			<div>
				<SidePanel
					disable_focus_trap={false}
					id="add-anchor-peers"
					closed={this.props.onClose}
					ref={sidePanel => (this.sidePanel = sidePanel)}
					buttons={[
						{
							id: 'cancel',
							text: translate('cancel'),
						},
						{
							id: 'add_anchor_peer',
							text: translate('add_anchor_peer'),
							onClick: this.onSave,
							disabled: !this.props.selectedOrderer || !this.props.selectedPeers || this.props.selectedPeers.length < 1 || !this.props.peerValid,
							type: 'submit',
						},
					]}
					error={this.props.error}
					submitting={this.props.submitting}
				>
					<FocusComponent setFocus={this.props.setFocus}>
						<div>
							<h1>{translate('add_anchor_peer')}</h1>
							<div className="ibp-anchor-peer-desc">
								<p>{translate('add_anchor_peer_desc')}</p>
							</div>
							{!this.props.orderer && this.props.peers && this.props.peers.length > 0 && (
								<Form
									scope={SCOPE}
									id={SCOPE + '-peer'}
									fields={[
										{
											name: 'selectedOrderer',
											type: 'dropdown',
											required: true,
											options: this.props.orderers,
										},
									]}
								/>
							)}
							{this.props.peers && this.props.peers.length > 0 && (
								<Form
									scope={SCOPE}
									id={SCOPE + '-peer'}
									fields={[
										{
											name: 'selectedPeers',
											tooltip: 'selectedPeers_tooltip',
											type: 'multiselect',
											options: this.props.peers,
											required: true,
										},
									]}
									onChange={this.onPeerChange}
								/>
							)}
							{!this.props.peers ||
								(this.props.peers.length < 1 && (
									<div className="ibp-error-panel">
										<SidePanelWarning title="no_more_peers" />
									</div>
								))}
						</div>
					</FocusComponent>
				</SidePanel>
			</div>
		);
	};
}

const dataProps = {
	submitting: PropTypes.bool,
	disableSave: PropTypes.bool,
	error: PropTypes.string,
	channelId: PropTypes.string,
	peers: PropTypes.array,
	peerValid: PropTypes.bool,
	selectedPeers: PropTypes.array,
	selectedOrderer: PropTypes.object,
	orderers: PropTypes.array,
	orderer: PropTypes.object,
	consenters: PropTypes.array,
	setFocus: PropTypes.bool,
};

AddAnchorPeerModal.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	onClose: PropTypes.func,
	onComplete: PropTypes.func,
	showError: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['configtxlator_url'] = state['settings']['configtxlator_url'];
		return newProps;
	},
	{
		clearNotifications,
		showError,
		updateState,
	}
)(withLocalize(AddAnchorPeerModal));
