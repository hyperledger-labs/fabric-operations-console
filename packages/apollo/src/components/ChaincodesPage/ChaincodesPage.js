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
import async from 'async';
import { Button } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import RequiresAttentionImage from '../../assets/images/requires_attention.svg';
import { clearNotifications, showBreadcrumb, showError, updateState } from '../../redux/commonActions';
import ChaincodeApi from '../../rest/ChaincodeApi';
import ChannelApi from '../../rest/ChannelApi';
import { PeerRestApi } from '../../rest/PeerRestApi';
import Helper from '../../utils/helper';
import Chaincodes from '../Chaincodes/Chaincodes';
import InstantiatedChaincodes from '../InstantiatedChaincodes/InstantiatedChaincodes';
import Logger from '../Log/Logger';
import PageContainer from '../PageContainer/PageContainer';
import PageHeader from '../PageHeader/PageHeader';
import SVGs from '../Svgs/Svgs';
import withRouter from '../../hoc/withRouter';
const naturalSort = require('javascript-natural-sort');

const SCOPE = 'chaincodespage';
const Log = new Logger(SCOPE);

class ChaincodesPage extends Component {
	componentDidMount() {
		this.props.showBreadcrumb('chaincode', {}, this.props.history.location.pathname, true);
		this.refreshData();
	}

	componentWillUnmount() {
		this.props.clearNotifications(SCOPE);
	}

	async refreshData() {
		this.props.updateState(SCOPE, { loading: true });
		await this.getAllPeers();
		await this.getAllInstalled();
		await this.getAllInstantiated();
		this.props.updateState(SCOPE, { loading: false });
	}

	async getAllInstalled() {
		const result = await ChaincodeApi.getAllChaincodes();
		if (result.errors && result.errors.length) {
			result.errors.forEach(error => {
				Log.error(error);
				let msg = 'error_chaincode';
				let details = null;
				if (
					error &&
					error.grpc_resp &&
					error.grpc_resp.statusMessage &&
					(error.grpc_resp.statusMessage.indexOf('This identity is not an admin') !== -1 ||
						error.grpc_resp.statusMessage.indexOf('Failed verifying that proposal\'s creator satisfies local MSP principal') !== -1)
				) {
					details = 'error_chaincode2';
				}
				this.props.showError(msg, { peerName: error.name }, SCOPE, details);
			});
		}
		Log.debug(result);
		this.props.updateState(SCOPE, { chaincodeList: result.chaincodesList });
	}

	async getAllPeers() {
		try {
			const peers = await PeerRestApi.getPeers();
			this.props.updateState(SCOPE, { peers });
		} catch (error) {
			Log.error(error);
			this.props.showError('error_chaincode', {}, SCOPE);
			this.props.updateState(SCOPE, { peers: [] });
		}
	}

	async getAllInstantiated() {
		let channelResp;
		try {
			channelResp = await ChannelApi.getAllChannels();
		} catch (error) {
			Log.error(error);
			this.props.showError('error_chaincode', {}, SCOPE);
			return;
		}
		let channels = channelResp.channels;
		let instantiated_list = [];
		if (channelResp.errors) {
			channelResp.errors.forEach(error => {
				if (error.message_key) {
					this.props.showError(error.message_key, { peerName: error.name }, SCOPE);
				}
			});
		}
		await async.eachLimit(
			channels,
			6,
			// asyncify to get around babel converting these functions to non-async: https://caolan.github.io/async/v2/docs.html#asyncify
			async.asyncify(async channel => {
				let instantiated;
				try {
					instantiated = await ChannelApi.getInstantiatedChaincode(channel.id, channel.peers[0].id);
				} catch (error) {
					this.props.showError('error_get_instantiated', { channelName: channel.id, peerName: channel.peers[0].id }, SCOPE);
				}
				if (instantiated.chaincodesList && instantiated.chaincodesList.length !== 0) {
					for (let idx in instantiated.chaincodesList) {
						let { name, version } = instantiated.chaincodesList[idx];
						let key = name + '_' + version + '_' + channel.id;
						instantiated_list[key] = {
							id: key,
							name,
							version,
							peers: channel.peers,
							channel: channel.id,
						};
					}
				}
			})
		);
		const instantiated_array = Object.keys(instantiated_list).map(key => {
			return instantiated_list[key];
		});
		instantiated_array.sort((a, b) => {
			return naturalSort(a.name, b.name) || naturalSort(a.version, b.version);
		});
		instantiated_array.forEach((instantiatedCc, index) => {
			let upgradable_versions = this.props.chaincodeList
				? this.props.chaincodeList.filter(installedCC => installedCC.name === instantiatedCc.name && installedCC.version !== instantiatedCc.version)
				: [];
			// Cannot upgrade if no other version is available for given chaincode(name)
			instantiatedCc.disabled = upgradable_versions.length === 0;
		});
		this.props.updateState(SCOPE, { instantiated_array });
	}

	render() {
		const translate = this.props.t;
		return (
			<PageContainer setFocus={!this.props.loading}>
				<div className="bx--row">
					<div className="bx--col-lg-13">
						<PageHeader
							history={this.props.history}
							headerName="chaincode"
							staticHeader
						/>
						<div className="lifecycle-20-notice">
							<div>
								<h3>{translate('smart_contract_20_lifecycle_notice_title')}</h3>
								<p>{translate('smart_contract_20_lifecycle_notice_desc')}</p>
								<div>
									<button
										id="how-to-topic-button"
										className="how-to-topic-button bx--btn bx--btn--tertiary"
										onClick={() => {
											window.open(translate('chaincode_how_to_link', { DOC_PREFIX: this.props.docPrefix }));
										}}
									>
										{translate('how_to_topic')}
										<SVGs extendClass={{ 'ibp-container-list-add-button-img': true }}
											type={'launch'}
										/>
									</button>
									<Button
										id="go-to-channel-button"
										className="go-to-channel-button"
										onClick={() => {
											window.location.href = `${this.props.host_url}/channels`;
										}}
									>
										{translate('go_to_channel')}
										<SVGs type="arrowRight"
											width="16px"
											height="16px"
										/>
									</Button>
								</div>
							</div>
							<RequiresAttentionImage className="ibp-requires-attention-image" />
						</div>
						<div className="ibp-chaincodepage-component">
							<Chaincodes
								peers={this.props.peers}
								reload={() => this.refreshData()}
								loading={this.props.loading}
								installedChaincodeList={this.props.chaincodeList}
								instantiatedChaincodeList={this.props.instantiated_array}
								feature_flags={this.props.feature_flags}
							/>
						</div>

						<div className="ibp-chaincodepage-component">
							<InstantiatedChaincodes
								loading={this.props.loading}
								reload={() => this.refreshData()}
								installedChaincodeList={this.props.chaincodeList}
								instantiated_array={this.props.instantiated_array}
							/>
						</div>
					</div>
				</div>
			</PageContainer>
		);
	}
}

const dataProps = {
	chaincodeList: PropTypes.array,
	instantiated_array: PropTypes.array,
	peers: PropTypes.array,
	history: PropTypes.object,
	loading: PropTypes.bool,
};

ChaincodesPage.propTypes = {
	...dataProps,
	showBreadcrumb: PropTypes.func,
	showError: PropTypes.func,
	updateState: PropTypes.func,
	clearNotifications: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['host_url'] = state['settings'] ? state['settings']['host_url'] : null;
		newProps['docPrefix'] = state['settings'] ? state['settings']['docPrefix'] : null;
		newProps['feature_flags'] = state['settings'] ? state['settings']['feature_flags'] : null;
		return newProps;
	},
	{
		clearNotifications,
		showBreadcrumb,
		showError,
		updateState,
	}
)(withTranslation()(withRouter(ChaincodesPage)));
