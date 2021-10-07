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
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { clearNotifications, showError, showInfo, showSuccess, updateState } from '../../redux/commonActions';
import IdentityApi from '../../rest/IdentityApi';
import { PeerRestApi } from '../../rest/PeerRestApi';
import ActionsHelper from '../../utils/actionsHelper';
import Helper from '../../utils/helper';
import ImportPeerModal from '../ImportPeerModal/ImportPeerModal';
import ItemContainer from '../ItemContainer/ItemContainer';
import Logger from '../Log/Logger';
import NodeStatus from '../../utils/status';
import emptyPeerImage from '../../assets/images/empty_nodes.svg';
import ItemTileLabels from '../ItemContainerTile/ItemTileLabels/ItemTileLabels';
import { triggers, triggerSurvey } from '../../utils/medallia';
import * as constants from '../../utils/constants';

const SCOPE = 'peers';
const Log = new Logger(SCOPE);
const naturalSort = require('javascript-natural-sort');
let secondaryPeerStatusCheck = null;
let tooLongTimer = null;

class Peers extends Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			loading: true,
			isMspDetailsView: this.props.filteredPeers && this.props.filteredPeers.length > 0,
		});
		this.getPeers();

		// after x hours stop the secondary status checker
		clearTimeout(tooLongTimer);
		tooLongTimer = setTimeout(() => {
			clearInterval(secondaryPeerStatusCheck);
		}, constants.SECONDARY_STATUS_TIMEOUT);
	}

	componentWillUnmount() {
		this.props.clearNotifications(SCOPE);
		this.props.clearNotifications(SCOPE + '_HELP');
		NodeStatus.cancel();
		this.props.updateState(SCOPE, {
			filteredPeers: [],
			isMspDetailsView: false,
		});
	}

	getPeers = () => {
		this.props.updateState(SCOPE, { loading: true });
		PeerRestApi.getPeers()
			.then(peerList => {
				// loop slowly on peer status forever to keep status icon up to date...
				clearInterval(secondaryPeerStatusCheck);
				secondaryPeerStatusCheck = setInterval(() => {
					NodeStatus.getStatus(peerList, SCOPE, 'peerList', null, 1);
				}, constants.SECONDARY_STATUS_PERIOD); // very slow

				peerList.forEach(peer => {
					const tls_root_certs = _.get(peer, 'msp.tlsca.root_certs') || [];
					const admin_certs = _.get(peer, 'node_ou.enabled') ? [] : _.get(peer, 'msp.component.admin_certs') || [];
					const ecert = _.get(peer, 'msp.component.ecert');
					const tls_cert = _.get(peer, 'msp.component.tls_cert');
					peer.certificateWarning = Helper.getExpiryMulti([...tls_root_certs, ...admin_certs, ecert, tls_cert]);
				});
				IdentityApi.getPeerAssociations()
					.then(associations => {
						this.updatePeerAssociations(peerList, associations);
						this.props.updateState(SCOPE, {
							peerList,
							associations,
							loading: false,
						});
						NodeStatus.getStatus(peerList, SCOPE, 'peerList');
					})
					.catch(error => {
						Log.error(error);
						this.props.showError('error_peers', {}, SCOPE);
						this.props.updateState(SCOPE, { loading: false });
					});
			})
			.catch(error => {
				Log.error(error);
				if (error.statusCode !== 404 && error.msg !== 'no components exist') {
					this.props.showError('error_peers', {}, SCOPE);
				}
				this.props.updateState(SCOPE, { loading: false });
			});
	};

	updatePeerAssociations(peerList, associations) {
		peerList.forEach(peer => {
			peer.identity = associations[peer.id];
		});
	}

	buildCustomTile(peer) {
		const isPatchAvailable = peer.isUpgradeAvailable && peer.location === 'ibm_saas' && ActionsHelper.canCreateComponent(this.props.userInfo);

		return (
			<div className="ibp-node-peer-tile">
				<p className="ibp-node-peer-tile-msp">{peer.msp_id}</p>
				<ItemTileLabels location={peer.location}
					isPatchAvailable={isPatchAvailable}
					certificateWarning={peer.certificateWarning}
				/>
				{this.getPeerStatus(peer)}
			</div>
		);
	}

	getPeerStatus = peer => {
		let status = peer.status;
		if (status === false) {
			status = 'unknown';
		}
		let className = 'ibp-node-status-skeleton';
		if (status === 'running' || status === 'stopped' || status === 'unknown') {
			className = 'ibp-node-status-' + status;
		}
		if (!peer.operations_url) {
			className = 'ibp-node-status-unretrievable';
		}
		const translate = this.props.translate;
		return peer && status ? (
			<div className="ibp-node-status-container">
				<span className={`ibp-node-status ${className}`}
					tabIndex="0"
				/>
				<span className="ibp-node-status-label">{translate(peer.operations_url ? status : 'status_undetected')}</span>
			</div>
		) : (
			<div className="ibp-node-status-container">
				<span className="ibp-node-status ibp-node-status-skeleton"
					tabIndex="0"
				/>
				<span className="ibp-node-status-label">{translate('status_pending')}</span>
			</div>
		);
	};

	openImportPeerModal = () => {
		this.props.updateState(SCOPE, {
			showImportPeer: true,
		});
	};

	closeImportPeerModal = () => {
		this.props.updateState(SCOPE, {
			showImportPeer: false,
		});
	};

	openPeerDetails = peer => {
		this.props.history.push('/peer/' + encodeURIComponent(peer.id) + window.location.search);
	};

	startPeer(peer) {
		peer.loading = true;
		this.props.updateState(SCOPE, { peerList: [...this.props.peerList] });
		PeerRestApi.startPeer(peer.id)
			.then(updatedPeer => {
				updatedPeer.loading = false;
				for (let i = 0; i < this.props.peerList.length; i++) {
					if (this.props.peerList[i].id === updatedPeer.id) {
						this.props.peerList.splice(i, 1, updatedPeer);
					}
				}
				this.props.updateState(SCOPE, { peerList: [...this.props.peerList] });
			})
			.catch(error => {
				Log.error(error);
				this.props.showError('error_start_peer', {}, SCOPE);
			});
	}

	stopPeer(peer) {
		peer.loading = true;
		this.props.updateState(SCOPE, { peerList: [...this.props.peerList] });
		PeerRestApi.stopPeer(peer.id)
			.then(updatedPeer => {
				updatedPeer.loading = false;
				for (let i = 0; i < this.props.peerList.length; i++) {
					if (this.props.peerList[i].id === updatedPeer.id) {
						this.props.peerList.splice(i, 1, updatedPeer);
					}
				}
				this.props.updateState(SCOPE, { peerList: [...this.props.peerList] });
			})
			.catch(error => {
				Log.error(error);
				this.props.showError('error_stop_peer', {}, SCOPE);
			});
	}

	showNewPeers = (newPeers, associations) => {
		const peers = newPeers.map(peer => peer.name);
		this.props.showSuccess(
			newPeers.length === 1 ? 'add_peer_successful' : 'add_peers_successful',
			{
				peerName: peers.join(', '),
				peerCloud: this.props.translate(newPeers[0].location),
			},
			SCOPE,
			newPeers.length === 1 ? 'add_peer_successful_description' : 'add_peers_successful_description',
			10000
		);
		const peerList = [];
		this.props.peerList.forEach(peer => {
			peer.new = false;
			peerList.push(peer);
		});
		newPeers.forEach(peer => {
			peer.new = true;
			peerList.push(peer);
		});
		peerList.sort((a, b) => {
			return naturalSort(a.name, b.name);
		});
		const data = { peerList };
		if (associations) {
			data['associations'] = associations;
		}
		this.props.updateState(SCOPE, data);
		NodeStatus.getStatus(newPeers, SCOPE, 'peerList');
		this.props.clearNotifications(SCOPE + '_HELP');
		triggerSurvey(triggers.CREATE_PEER);
	};

	getButtons() {
		let buttons = [];
		let importOption = ActionsHelper.canImportComponent(this.props.userInfo) || ActionsHelper.canCreateComponent(this.props.userInfo);
		if (importOption) {
			buttons.push({
				text: this.props.feature_flags?.import_only_enabled ? 'import_only_peer' : 'add_peer',
				fn: this.openImportPeerModal,
			});
		}
		return buttons;
	}

	render() {
		let peerList = [];
		if (this.props.isMspDetailsView && this.props.peerList && this.props.filteredPeers) {
			peerList = this.props.peerList.filter(peer => this.props.filteredPeers.includes(peer.id));
		} else {
			peerList = this.props.peerList;
		}
		return (
			<div>
				<div>{this.props.showImportPeer && <ImportPeerModal onClose={this.closeImportPeerModal}
					onComplete={this.showNewPeers}
					parentScope={SCOPE}
				/>}</div>
				<div id="peers-container"
					className="ibp__peers--container"
				>
					<ItemContainer
						containerTitle={!this.props.isMspDetailsView ? 'peers' : ''}
						containerTooltip={!this.props.isMspDetailsView ? 'peers_tooltip' : ''}
						tooltipDirection="right"
						emptyMessage="empty_peer_message"
						emptyImage={emptyPeerImage}
						emptyTitle="no_peer_warning"
						itemId="peers"
						id="test__peers--add--tile"
						isLink
						loading={this.props.loading}
						items={peerList}
						select={this.openPeerDetails}
						tileMapping={{
							title: 'display_name',
							custom: data => {
								return this.buildCustomTile(data);
							},
						}}
						listMapping={[
							{
								header: 'name',
								attr: 'display_name',
							},
							{
								header: 'msp_id',
								attr: 'msp_id',
							},
							{
								header: 'location',
								attr: 'location',
								translate: true,
							},
							{
								header: 'url',
								attr: 'api_url',
							},
							{
								header: 'status',
								custom: peer => {
									let status = peer.status;
									if (status === false) {
										status = 'unknown';
									}
									if (!status) {
										status = 'status_pending';
									}
									if (!peer.operations_url) {
										status = 'status_undetected';
									}
									return (
										<span>
											<div className={'ibp-table-status ibp-table-status-' + status} />
											{this.props.translate(status)}
										</span>
									);
								},
							},
						]}
						addItems={!this.props.isMspDetailsView ? this.getButtons() : null}
						searchEnabled
					/>
				</div>
			</div>
		);
	}
}

const dataProps = {
	peerList: PropTypes.array,
	showImportPeer: PropTypes.bool,
	history: PropTypes.object,
	loading: PropTypes.bool,
	associations: PropTypes.object,
	associatePeers: PropTypes.array,
	isMspDetailsView: PropTypes.bool,
};

Peers.propTypes = {
	...dataProps,
	showError: PropTypes.func,
	showInfo: PropTypes.func,
	updateState: PropTypes.func,
	clearNotifications: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['userInfo'] = state['userInfo'] ? state['userInfo'] : null;
		newProps['feature_flags'] = state['settings'] ? state['settings']['feature_flags'] : null;
		return newProps;
	},
	{
		clearNotifications,
		showError,
		showInfo,
		showSuccess,
		updateState,
	}
)(withLocalize(Peers));
