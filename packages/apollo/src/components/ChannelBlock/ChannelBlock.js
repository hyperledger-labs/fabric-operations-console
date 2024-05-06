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
import { SkeletonPlaceholder } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { clearNotifications, showBreadcrumb, showError, updateState } from '../../redux/commonActions';
import ChannelApi from '../../rest/ChannelApi';
import Helper from '../../utils/helper';
import ItemContainer from '../ItemContainer/ItemContainer';
import Logger from '../Log/Logger';
import PageContainer from '../PageContainer/PageContainer';
import PageHeader from '../PageHeader/PageHeader';
import TransactionModal from '../TransactionModal/TransactionModal';
import emptyImage from '../../assets/images/empty_nodes.svg';
import withRouter from '../../hoc/withRouter';

const SCOPE = 'channelBlock';
const Log = new Logger(SCOPE);

class ChannelBlock extends Component {
	componentDidMount() {
		this.props.showBreadcrumb('block_title', { number: this.props.match.params.blockNumber }, this.props.history.location.pathname);
		this.props.updateState(SCOPE, {
			loading: true,
			block: null,
			transaction: null,
		});
		if (this.props.match.params.peerId) {
			this.getBlockData(this.props.match.params.peerId);
		} else {
			this.getPeerFromChannel();
		}
	}

	componentWillUnmount() {
		this.props.clearNotifications(SCOPE);
	}

	getPeerFromChannel() {
		ChannelApi.getChannel(this.props.match.params.channelId)
			.then(channel => {
				const peerId = channel.peers[0].id;
				this.getBlockData(peerId);
			})
			.catch(error => {
				Log.error(error);
				this.props.showError('error_channel_not_found', { channelId: this.props.match.params.channelId }, SCOPE);
				this.props.updateState(SCOPE, { loading: false });
			});
	}

	getBlockCreation(block) {
		// currently we only use the time for the first transaction
		const created = _.get(block, 'data.data_list[0].envelope.payload.header.channel_header.timestamp');
		if (created) {
			return new Date(created.seconds * 1000).toLocaleString();
		}
		return '';
	}

	getBlockData(peerId) {
		const id = Number(this.props.match.params.blockNumber);
		ChannelApi.getChannelBlock(peerId, this.props.match.params.channelId, id)
			.then(block => {
				const created = this.getBlockCreation(block);
				const txs = [];
				if (block.data.data_list) {
					block.data.data_list.forEach(tx => {
						const txId = _.get(tx, 'envelope.payload.header.channel_header.tx_id');
						const type = _.get(tx, 'envelope.payload.header.channel_header.type');
						const timestamp = _.get(tx, 'envelope.payload.header.channel_header.timestamp');
						const actions = [];
						const actionList = _.get(tx, 'envelope.payload.data.action_list');
						if (actionList) {
							actionList.forEach(action => {
								const chaincodeId = _.get(action, 'payload.action.proposal_response_payload.extension.chaincode_id');
								const inputs = [];
								const outputs = [];
								if (id > 0) {
									const argList = _.get(action, 'payload.chaincode_action_payload.chaincode_proposal_payload.input.chaincode_spec.input.args_list');
									if (argList) {
										argList.forEach(arg => {
											inputs.push(arg);
										});
									}
									const nsRwSet = _.get(action, 'payload.action.proposal_response_payload.extension.results.ns_rw_set');
									if (nsRwSet) {
										for (let idx in nsRwSet) {
											nsRwSet[idx].rwset.writes_list.forEach(write => {
												outputs.push(write);
											});
										}
									}
								}
								actions.push({
									chaincodeId,
									inputs,
									outputs,
								});
							});
						}
						if (txId) {
							txs.push({
								txId,
								created: timestamp ? new Date(timestamp.seconds * 1000).toLocaleString() : '',
								actions,
								type,
							});
						}
					});
				}
				this.props.updateState(SCOPE, {
					loading: false,
					block: {
						created,
						txs,
					},
				});
			})
			.catch(error => {
				Log.error(error);
				this.props.showError('error_block', {}, SCOPE);
				this.props.updateState(SCOPE, { loading: false });
			});
	}

	openTransaction = transaction => {
		this.props.updateState(SCOPE, { transaction });
	};

	closeTransaction = () => {
		this.props.updateState(SCOPE, { transaction: null });
	};

	render() {
		const translate = this.props.t;
		return (
			<PageContainer>
				<div className="bx--row">
					<div className="bx--col-lg-13">
						<div id="channel-block-container"
							className="ibp-channel-block"
						>
							<PageHeader history={this.props.history}
								headerName={translate('block_title', { number: this.props.match.params.blockNumber })}
							/>
							<div>
								{this.props.block ? (
									<p>{translate('block_created', { date: this.props.block.created })}</p>
								) : (
									<SkeletonPlaceholder
										style={{
											width: '14rem',
											height: '1.25rem',
										}}
									/>
								)}
							</div>
							<ItemContainer
								containerTitle="transactions"
								emptyImage={emptyImage}
								emptyMessage="empty_transactions"
								emptyTitle="empty_transactions_title"
								itemId="transactions"
								loading={this.props.loading}
								items={this.props.block ? this.props.block.txs : []}
								listMapping={[
									{
										header: 'transaction_id',
										attr: 'txId',
									},
									{
										header: 'created',
										attr: 'created',
									},
								]}
								select={this.openTransaction}
							/>
						</div>
						{this.props.transaction && <TransactionModal transaction={this.props.transaction}
							closed={this.closeTransaction}
							settings={this.props.settings}
						/>}
					</div>
				</div>
			</PageContainer>
		);
	}
}

const dataProps = {
	block: PropTypes.object,
	loading: PropTypes.bool,
	transaction: PropTypes.object,
};

ChannelBlock.propTypes = {
	...dataProps,
	showBreadcrumb: PropTypes.func,
	showError: PropTypes.func,
	clearNotifications: PropTypes.func,
	updateState: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['settings'] = state['settings'];
		return newProps;
	},
	{
		clearNotifications,
		showBreadcrumb,
		showError,
		updateState,
	}
)(withTranslation()(withRouter(ChannelBlock)));
