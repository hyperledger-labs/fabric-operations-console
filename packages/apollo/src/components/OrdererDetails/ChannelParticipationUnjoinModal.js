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
import { CodeSnippet, SkeletonPlaceholder } from 'carbon-components-react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { clearNotifications, showError, updateState } from '../../redux/commonActions';
import { ChannelParticipationApi } from '../../rest/ChannelParticipationApi';
import IdentityApi from '../../rest/IdentityApi';
import Helper from '../../utils/helper';
import Form from '../Form/Form';
import SidePanel from '../SidePanel/SidePanel';
import Clipboard from '../../utils/clipboard';
import SidePanelWarning from '../SidePanelWarning/SidePanelWarning';
import { OrdererRestApi } from '../../rest/OrdererRestApi';
import { NodeRestApi } from '../../rest/NodeRestApi';
import ImportantBox from '../ImportantBox/ImportantBox';
import ConfigBlockApi from '../../rest/ConfigBlockApi';
import { EventsRestApi } from '../../rest/EventsRestApi';
import RenderParamHTML from '../RenderHTML/RenderParamHTML';

const SCOPE = 'ChannelParticipationUnjoinModal';

class ChannelParticipationUnjoinModal extends Component {

	componentDidMount() {
		if (this.props.channelInfo.systemChannel) {
			this.props.updateState(SCOPE, {
				loading: true,
			});
			OrdererRestApi.getSystemChannelConfig({ cluster_id: this.props.details.cluster_id }, this.props.configtxlator_url)
				.then(resp => {
					let channel_state = _.get(resp, 'channel_group.groups.Orderer.values.ConsensusType.value.state');
					this.props.updateState(SCOPE, {
						channel_state
					});
				})
				.catch(error => {
					// ignore 404/503 since some of the nodes may not have system channel
					const status = _.get(error, 'grpc_resp.status');
					if (status !== 404 && status !== 503) {
						this.props.updateState(SCOPE, {
							error,
						});
					}
				});
			this.props.updateState(SCOPE, {
				loading: false,
			});
		}
		if (this.props.channelInfo.nodes !== undefined) {
			let nodesArray = Object.values(this.props.channelInfo.nodes);
			this.props.updateState(SCOPE, {
				myNodeList: nodesArray,
				error: '',
				nodeNotSelected: false,
				noConfirmMatch: true
			});
		}
	}

	onUnjoin = async () => {
		try {
			this.props.myNodeList.map(async osn => {
				let all_identities = await IdentityApi.getIdentities();
				let unjoinResp = await ChannelParticipationApi.unjoinChannel(all_identities, osn, this.props.channelInfo.name);
				// TODO: consolidate error handling
				// cannot remove: system channel exists
				// cannot remove: channel does not exist
				let errorStatus = '';
				if (_.get(unjoinResp, 'error') !== undefined) {
					this.props.updateState(SCOPE, { error: unjoinResp.error });
					errorStatus = 'error';
				} else {

					// update the orderer as systemless
					if (this.props.channelInfo.systemChannel) {
						try {
							await NodeRestApi.updateNode({ id: osn.id, systemless: true });
						} catch (e) {
							console.error(e);
						}
					}

					try {
						// first find all the local config blocks...
						const local_config_block_docs = await ConfigBlockApi.getAll({ cache: 'skip', visibility: 'all' });

						// filter the docs down to the ones that references this channel
						if (local_config_block_docs && local_config_block_docs.blocks) {
							const docs_with_channel = local_config_block_docs.blocks.filter(x => {
								return x.channel === this.props.channelInfo.name;
							});

							// filter the docs down to the ones that references this cluster id
							if (Array.isArray(docs_with_channel)) {
								const docs_with_OS = docs_with_channel.filter(x => {
									if (x.extra_consenter_data && osn) {
										for (let i in x.extra_consenter_data) {			// dsh todo - what if there are other clusters?
											return x.extra_consenter_data[i]._cluster_id === osn.cluster_id;
										}
									}
									return false;
								});

								let config_block_doc = null;
								for (let i in docs_with_OS) {
									config_block_doc = docs_with_OS[i];
									break;
								}

								// if we found the doc then un-archive it since the OS is leaving
								if (config_block_doc && config_block_doc.id) {

									// un-archive the local config block if one is found
									await ConfigBlockApi.unarchive(config_block_doc.id, osn.cluster_id);
									// re-pull all blocks to reload cache
									await ConfigBlockApi.getAll({ cache: 'skip', visibility: 'all' });
								}
							}
						}
					} catch (e) {
						console.error(e);
					}
					this.props.onComplete();
					this.props.onClose();
				}
				EventsRestApi.sendUnJoinChannelEvent(this.props.channelInfo.name, this.props.myNodeList, errorStatus);
			});
		} catch (e) {
			//error
			console.log('unable to unjoin', e);
		}
	}

	onChannelChange = (change, valid) => {
		this.props.updateState(SCOPE, {
			myNodeList: change.nodeList,
			nodeNotSelected: change.nodeList.length === 0
		});
	};

	renderUnjoin = (translate) => {
		let nodesArray = [];
		if (this.props.channelInfo.nodes !== undefined) {
			nodesArray = Object.values(this.props.channelInfo.nodes).filter(node => {
				return node && node._channel_resp && node._channel_resp.consensusRelation !== undefined;
			});
		}

		return (
			<div>
				{this.props.loading ? (
					<SkeletonPlaceholder
						style={{
							cursor: 'pointer',
							height: '2rem',
							width: '10rem',
						}}
					/>
				) : (
					<div>
						<div className="ibp-modal-title">
							<h1 className="ibm-light">{this.props.channelInfo.name}</h1>
							<div className="ibp-remove-orderer-confirm">
								{RenderParamHTML(translate, 'remove_orderer_channel_desc', {
									name: (
										<CodeSnippet
											type="inline"
											ariaLabel={translate('copy_text', { copyText: this.props.channelInfo.name })}
											light={false}
											onClick={() => Clipboard.copyToClipboard(this.props.channelInfo.name)}
										>
											{this.props.channelInfo.name}
										</CodeSnippet>
									),
								})}
							</div>
							<Form
								scope={SCOPE}
								id={SCOPE + '-channel'}
								fields={[
									{
										name: 'nodeList',
										type: 'multiselect',
										options: nodesArray,
										default: nodesArray,
										label: 'unjoin_orderer',
										required: false,
									},
								]}
								onChange={this.onChannelChange}
							/>
							<div className="ibp-remove-orderer-confirm">
								{translate('remove_orderer_channel_confirm')}
								<Form
									scope={SCOPE}
									id={SCOPE + '-remove'}
									fields={[
										{
											name: 'confirm_orderer_channel_name',
											tooltip: 'confirm_orderer_channel_tooltip',
											label: 'confirm_orderer_channel_name',
										},
									]}
									onChange={data => {
										this.props.updateState(SCOPE, {
											noConfirmMatch: data.confirm_orderer_channel_name !== this.props.channelInfo.name,
										});
									}}
								/>
								{this.props.channelInfo.systemChannel && (
									<ImportantBox kind="informational"
										text="remove_system_channel_1_text"
										link="remove_system_channel_important_link"
									/>
								)}
								{this.props.channelInfo.systemChannel && this.props.channel_state === 'STATE_NORMAL' && (
									<SidePanelWarning title="remove_system_channel_2_title"
										subtitle="remove_system_channel_2_text"
									/>
								)}
							</div>
						</div>
					</div>
				)}
			</div>
		);
	}

	render() {
		const translate = this.props.t;
		return (
			<div>
				<SidePanel
					id="ChannelParticipationUnjoinModal"
					closed={this.props.onClose}
					buttons={[
						{
							id: 'close',
							text: translate('close'),
							onClick: this.props.onClose,
						},
						{
							id: 'unjoin',
							text: translate('unjoin_channel'),
							onClick: this.onUnjoin,
							disabled: this.props.nodeNotSelected || this.props.noConfirmMatch,
						}
					]}
					error={this.props.error}
				>
					{this.props.channelInfo && this.renderUnjoin(translate)}
				</SidePanel>
			</div>
		);
	}
}

const dataProps = {
	loading: PropTypes.bool,
	details: PropTypes.object,
	myNodeList: PropTypes.object,
	channelInfo: PropTypes.object,
	channel_state: PropTypes.string,
	error: PropTypes.string,
	nodeNotSelected: PropTypes.bool,
	noConfirmMatch: PropTypes.bool,
};

ChannelParticipationUnjoinModal.propTypes = {
	...dataProps,
	onClose: PropTypes.func,
	onComplete: PropTypes.func,
	t: PropTypes.func,
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['configtxlator_url'] = state['settings']['configtxlator_url'];
		return newProps;
	},
	{
		updateState,
		showError,
		clearNotifications,
	}
)(withTranslation()(ChannelParticipationUnjoinModal));
