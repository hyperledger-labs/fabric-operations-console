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
import { WarningFilled16 } from '@carbon/icons-react/es';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import emptySmartContractImage from '../../assets/images/empty_installed.svg';
import { showError, updateState } from '../../redux/commonActions';
import ChannelApi from '../../rest/ChannelApi';
import SignatureRestApi from '../../rest/SignatureRestApi';
import StitchApi from '../../rest/StitchApi';
import Helper from '../../utils/helper';
import ChaincodeModal from '../ChaincodeModal/ChaincodeModal';
import ItemContainer from '../ItemContainer/ItemContainer';
import Logger from '../Log/Logger';
import ProposeChaincodeModal from '../ProposeChaincodeModal/ProposeChaincodeModal';
import ActionsHelper from '../../utils/actionsHelper';

const SCOPE = 'channelChaincode';
const Log = new Logger(SCOPE);
const naturalSort = require('javascript-natural-sort');

class ChannelChaincode extends Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			chaincodeDefs: null,
			showPropose: false,
			selectedChaincode: null,
		});
		this.getChaincodeDefinitions();
	}

	componentWillUnmount() {
		this.props.updateState(SCOPE, {
			chaincodeDefs: [],
			selectedChaincode: null,
		});
	}

	getChaincodeDefinitions = async() => {
		// NOTE: we set chaincodeDefs to null to force the render logic to remove the old container
		// and then create a new container that is "loading"
		this.props.updateState(SCOPE, { chaincodeDefs: null });
		this.props.updateState(SCOPE, {
			chaincodeDefs: [],
			loading: true,
		});
		const defs = {};
		const msps = {};
		const currentPeerID = _.get(this.props, 'match.params.peerId');
		const currentPeer = this.props.peerList.find(peer => peer.id === currentPeerID);
		const peerList = currentPeer ? [currentPeer] : this.props.peerList;
		// const peerList = this.props.peerList;
		for (let i = 0; i < peerList.length; i++) {
			const peer = peerList[i];
			if (peer.msp_id && peer.cert && peer.private_key && !msps[peer.msp_id]) {
				msps[peer.msp_id] = true;
				try {
					let committed = await StitchApi.lc_getAllChaincodeDefinitionsOnChannel({
						msp_id: peer.msp_id,
						client_cert_b64pem: peer.cert,
						client_prv_key_b64pem: peer.private_key,
						host: peer.url2use,
						channel_id: this.props.channel.id,
					});
					for (let j = 0; j < committed.data.chaincodeDefinitions.length; j++) {
						const def = committed.data.chaincodeDefinitions[j];
						let collections_obj = [];
						let configs = _.get(def, 'collections.config', []);
						for (let config of configs) {
							let collection = _.get(config, 'static_collection_config');
							if (collection) {
								let member_orgs_policy = _.get(collection, 'member_orgs_policy.signature_policy');
								if (member_orgs_policy) {
									delete collection.member_orgs_policy;
									collection.member_orgs_policy = member_orgs_policy;
								}
								let endorsement_policy = _.get(collection, 'endorsement_policy.signature_policy');
								if (endorsement_policy) {
									delete collection.endorsement_policy;
									collection.endorsement_policy = endorsement_policy;
								}
								collections_obj.push(collection);
							}
						}
						const id = def.name + '@' + def.version + '@' + def.sequence;
						if (!defs[id]) {
							const approvals = await ChannelApi.getCommittedChaincodeApprovals({
								channel_id: this.props.channel.id,
								chaincode_id: def.name,
								chaincode_sequence: def.sequence,
								chaincode_version: def.version,
								peer: peer,
							});
							let show_warning = false;
							for (let member_id in approvals) {
								if (!approvals[member_id]) {
									show_warning = true;
								}
							}
							defs[id] = {
								...def,
								id,
								collections_obj,
								committed: true,
								show_warning,
							};
						}
					}
				} catch (error) {
					Log.error(error);
				}
			}
		}
		const requests = await SignatureRestApi.getAllRequests();
		if (requests) {
			requests.forEach(request => {
				const ready_to_commit = request.signature_count >= request.current_policy.number_of_signatures;
				const show_warning = ready_to_commit && request.signature_count < request.orgs2sign.length;
				if (request.ccd && request.channel === this.props.channel.id) {
					if (request.status === 'open') {
						const id = request.ccd.chaincode_id + '@' + request.ccd.chaincode_version + '@' + request.ccd.chaincode_sequence;
						if (!defs[id]) {
							defs[id] = {
								name: request.ccd.chaincode_id,
								sequence: request.ccd.chaincode_sequence,
								version: request.ccd.chaincode_version,
								committed: false,
								ready_to_commit,
								show_warning,
								validationParameter: request.ccd.validation_parameter,
								initRequired: request.ccd.init_required,
								collections: request.ccd.collections_obj,
								collections_obj: request.ccd.collections_obj,
								id,
							};
						}
					}
				}
			});
		}
		const chaincodeDefs = Object.values(defs).sort((a, b) => {
			if (a.name === b.name) {
				return naturalSort(a.version, b.version);
			}
			return naturalSort(a.name, b.name);
		});
		this.props.updateState(SCOPE, {
			chaincodeDefs,
			loading: false,
		});
		return;
	};

	openProposeChaincodeModal = () => {
		this.props.updateState(SCOPE, { showPropose: true });
	};

	closeProposeChaincodeModal = () => {
		this.props.updateState(SCOPE, { showPropose: false });
	};

	openChaincodeModal = selectedChaincode => {
		this.props.updateState(SCOPE, { selectedChaincode });
	};

	closeChaincodeModal = () => {
		this.props.updateState(SCOPE, { selectedChaincode: null });
	};

	renderCustomTile = data => {
		const status = data.committed ? 'chaincode_committed' : data.ready_to_commit ? 'chaincode_ready' : 'chaincode_proposed';
		return (
			<>
				<div className="ibp-channel-chaincode-version">{data.version}</div>
				<div className="ibp-channel-chaincode-status">
					{data.show_warning && <WarningFilled16 className="ibp--item-location-icon ibp-item-location-icon-certificate-warning" />}
					{this.props.t(status)}
				</div>
			</>
		);
	};

	render() {
		if (this.props.refreshNeeded) {
			if (!this.refreshNeeded) {
				this.refreshNeeded = true;
				window.setTimeout(() => {
					this.props.updateState(SCOPE, { refreshNeeded: false });
					if (this.refreshNeeded) {
						this.refreshNeeded = false;
						this.getChaincodeDefinitions();
					}
				}, 1);
			}
		}
		//if (this.props.chaincodeDefs === null) {
		//	return (
		//		<div className="ibp-channel-details-chaincode">
		//		</div>
		//	);
		//}
		return (
			<div className="ibp-channel-details-chaincode">
				<ItemContainer
					id="channel_chaincode"
					containerTitle="chaincode_definitions"
					// containerDesc="chaincode_definitions_desc"
					item_id="channel_chaincode"
					items={this.props.chaincodeDefs || []}
					tileMapping={{
						title: 'name',
						custom: this.renderCustomTile,
					}}
					loading={this.props.loading}
					widerTiles
					emptyTitle="chaincode_empty_title"
					emptyMessage="chaincode_empty_desc"
					emptyImage={emptySmartContractImage}
					emptyCustom={() => {
						return (
							<div className="ibp-channel-chaincode-how-to-div">
								<button
									id="how-to-button"
									className="ibp-channel-chaincode-how-to bx--btn bx--btn--tertiary"
									onClick={() => {
										window.open(this.props.t('chaincode_how_to_link', { DOC_PREFIX: this.props.docPrefix }));
									}}
								>
									{this.props.t('chaincode_how_to')}
								</button>
							</div>
						);
					}}
					addItems={[
						{
							text: 'chaincode_propose',
							fn: this.openProposeChaincodeModal,
							disabled: !ActionsHelper.canManageComponent(this.props.userInfo, this.props.feature_flags)
						},
					]}
					select={this.openChaincodeModal}
				/>
				{this.props.showPropose && (
					<ProposeChaincodeModal
						channel={this.props.channel}
						members={this.props.members}
						onClose={this.closeProposeChaincodeModal}
						peerList={this.props.peerList}
						ordererList={this.props.ordererList}
						onComplete={this.getChaincodeDefinitions}
					/>
				)}
				{this.props.selectedChaincode && (
					<ChaincodeModal
						channelId={this.props.channel.id}
						ccd={{
							chaincode_id: this.props.selectedChaincode.name,
							chaincode_version: this.props.selectedChaincode.version,
							chaincode_sequence: this.props.selectedChaincode.sequence,
							validation_parameter: this.props.selectedChaincode.validationParameter,
							init_required: this.props.selectedChaincode.initRequired,
							collections_obj: this.props.selectedChaincode.collections_obj,
						}}
						onClose={this.closeChaincodeModal}
						onComplete={this.getChaincodeDefinitions}
						channelDetails={this.props.channel}
						channelMembers={this.props.members}
					/>
				)}
			</div>
		);
	}
}

const dataProps = {
	chaincodeDefs: PropTypes.array,
	match: PropTypes.object,
	loading: PropTypes.bool,
	showPropose: PropTypes.bool,
	selectedChaincode: PropTypes.object,
	refreshNeeded: PropTypes.bool,
};

ChannelChaincode.propTypes = {
	...dataProps,
	channel: PropTypes.object,
	members: PropTypes.array,
	peerList: PropTypes.array,
	showError: PropTypes.func,
	updateState: PropTypes.func,
	ordererList: PropTypes.array,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['docPrefix'] = state['settings'] ? state['settings']['docPrefix'] : null;
		newProps['feature_flags'] = state['settings'] ? state['settings']['feature_flags'] : null;
		newProps['userInfo'] = state['userInfo'] ? state['userInfo'] : null;
		return newProps;
	},
	{
		showError,
		updateState,
	}
)(withTranslation()(ChannelChaincode));
