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
import { OrdererRestApi } from '../../rest/OrdererRestApi';
import ActionsHelper from '../../utils/actionsHelper';
import Helper from '../../utils/helper';
import ImportOrdererModal from '../ImportOrdererModal/ImportOrdererModal';
import ItemContainer from '../ItemContainer/ItemContainer';
import Logger from '../Log/Logger';
import NodeStatus from '../../utils/status';
import emptyOrdererImage from '../../assets/images/empty_nodes.svg';
import ItemTileLabels from '../ItemContainerTile/ItemTileLabels/ItemTileLabels';
import { triggers, triggerSurvey } from '../../utils/medallia';
import * as constants from '../../utils/constants';

const SCOPE = 'orderers';
const Log = new Logger(SCOPE);
const naturalSort = require('javascript-natural-sort');
let secondaryOsStatusCheck = null;
let tooLongTimer = null;

class Orderers extends Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			loading: true,
			isMspDetailsView: this.props.filteredOrderers && this.props.filteredOrderers.length > 0,
		});
		this.getOrderers();

		// after x hours stop the secondary status checker
		clearTimeout(tooLongTimer);
		tooLongTimer = setTimeout(() => {
			clearInterval(secondaryOsStatusCheck);
		}, constants.SECONDARY_STATUS_TIMEOUT);
	}

	componentWillUnmount() {
		this.props.clearNotifications(SCOPE);
		this.props.clearNotifications(SCOPE + '_HELP');
		NodeStatus.cancel();
		this.props.updateState(SCOPE, {
			filteredOrderers: [],
			isMspDetailsView: false,
		});
	}

	getCertificateWarning(orderer) {
		let certificateWarning = undefined;
		const list = orderer.raft || [orderer];
		list.forEach(node => {
			const tls_root_certs = _.get(node, 'msp.tlsca.root_certs') || [];
			const admin_certs = _.get(node, 'node_ou.enabled') ? [] : _.get(node, 'msp.component.admin_certs') || [];
			const ecert = _.get(node, 'msp.component.ecert');
			const tls_cert = _.get(node, 'msp.component.tls_cert');
			const nodeCertificateWarning = Helper.getExpiryMulti([...tls_root_certs, ...admin_certs, ecert, tls_cert]);
			if (nodeCertificateWarning !== undefined) {
				if (certificateWarning === undefined || nodeCertificateWarning < certificateWarning) {
					certificateWarning = nodeCertificateWarning;
				}
			}
		});
		return certificateWarning;
	}

	getOrderers = () => {
		this.props.updateState(SCOPE, { loading: true });
		OrdererRestApi.getOrderers()
			.then(ordererList => {
				// loop slowly on peer status forever to keep status icon up to date...
				clearInterval(secondaryOsStatusCheck);
				secondaryOsStatusCheck = setInterval(() => {
					NodeStatus.getStatus(ordererList, SCOPE, 'ordererList', null, 1);
					this.props.updateState(SCOPE, { ordererList }); // ?
				}, constants.SECONDARY_STATUS_PERIOD); // very slow

				ordererList.forEach(orderer => {
					orderer.certificateWarning = this.getCertificateWarning(orderer);
				});
				this.props.updateState(SCOPE, {
					ordererList,
					loading: false,
				});
				NodeStatus.getStatus(ordererList, SCOPE, 'ordererList');
			})
			.catch(error => {
				Log.error(error);
				this.props.updateState(SCOPE, {
					ordererList: [],
					loading: false,
				});
				if (error.statusCode !== 404 && error.msg !== 'no components exist') {
					this.props.showError('error_orderers', {}, SCOPE);
				}
			});
	};

	openImportOrdererModal = () => {
		this.props.updateState(SCOPE, {
			showImportOrderer: true,
		});
	};

	closeImportOrdererModal = () => {
		this.props.updateState(SCOPE, {
			showImportOrderer: false,
		});
	};

	showNewsOrderers = newOrderers => {
		if (newOrderers.length === 0) {
			// no orderers were added, just raft nodes
			this.props.showSuccess('add_orderer_nodes_successful', {}, SCOPE);
			this.props.clearNotifications(SCOPE + '_HELP');
			return;
		}
		const orderers = newOrderers.map(orderer => orderer.display_name);
		this.props.showSuccess(
			newOrderers.length === 1 ? 'add_orderer_successful' : 'add_orderers_successful',
			{ ordererName: orderers.join() },
			SCOPE,
			newOrderers.length === 1 ? 'add_orderer_successful_description' : 'add_orderers_successful_description',
			10000
		);
		const ordererList = [];
		this.props.ordererList.forEach(orderer => {
			orderer.new = false;
			ordererList.push(orderer);
		});
		newOrderers.forEach(orderer => {
			orderer.new = true;
			ordererList.push(orderer);
		});
		ordererList.sort((a, b) => {
			return naturalSort(a.name, b.name);
		});
		this.props.updateState(SCOPE, { ordererList });
		NodeStatus.getStatus(newOrderers, SCOPE, 'ordererList');
		this.props.clearNotifications(SCOPE + '_HELP');
		triggerSurvey(triggers.CREATE_ORDERING_SERVICE);
	};

	openOrdererDetails = orderer => {
		this.props.history.push('/orderer/' + encodeURIComponent(orderer.cluster_id) + window.location.search);
	};

	buildCustomTile(orderer) {
		const isPatchAvailable = orderer.isUpgradeAvailable && orderer.location === 'ibm_saas' && ActionsHelper.canCreateComponent(this.props.userInfo);
		let status = orderer.status;
		if (status !== 'stopped' && status !== 'running' && status !== 'running_partial') {
			status = 'unknown';
		}
		return (
			<div className="ibp-node-peer-tile">
				<p className="ibp-node-orderer-tile-msp">{orderer.msp_id}</p>
				<ItemTileLabels
					location={orderer.location}
					pending={orderer.pending}
					isPatchAvailable={isPatchAvailable}
					type="orderer"
					certificateWarning={orderer.certificateWarning}
				/>
				{this.getOrdererStatus(orderer)}
			</div>
		);
	}

	getOrdererStatus = orderer => {
		let status = orderer.status;
		if (status === false) {
			status = 'unknown';
		}
		let className = 'ibp-node-status-skeleton';
		if (status === 'running' || status === 'stopped' || status === 'unknown') {
			className = 'ibp-node-status-' + status;
		}
		if (status === 'running_partial') {
			className = 'ibp-node-status-running-partial';
		}
		if (!orderer.operations_url) {
			className = 'ibp-node-status-unretrievable';
		}
		const translate = this.props.translate;
		return orderer && status ? (
			<div className="ibp-node-status-container"
				tabIndex="0"
			>
				<span className={`ibp-node-status ${className}`}
					tabIndex="0"
				/>
				<span className="ibp-node-status-label">{translate(orderer.operations_url ? status : 'status_undetected')}</span>
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

	getButtons() {
		let buttons = [];
		let importOption = ActionsHelper.canImportComponent(this.props.userInfo) || ActionsHelper.canCreateComponent(this.props.userInfo);
		if (importOption) {
			buttons.push({
				text: this.props.feature_flags?.import_only_enabled ? 'import_only_orderer' : 'add_orderer',
				fn: this.openImportOrdererModal,
			});
		}
		return buttons;
	}

	render() {
		let ordererList = [];
		if (this.props.isMspDetailsView && this.props.ordererList && this.props.filteredOrderers) {
			ordererList = this.props.ordererList.filter(orderer => this.props.filteredOrderers.includes(orderer.cluster_id));
		} else {
			ordererList = this.props.ordererList;
		}
		return (
			<div>
				<div>{this.props.showImportOrderer && <ImportOrdererModal onClose={this.closeImportOrdererModal}
					onComplete={this.showNewsOrderers}
				/>}</div>
				<div id="orderers-container"
					className="ibp__orderers--container"
				>
					<ItemContainer
						containerTitle={!this.props.isMspDetailsView ? 'orderers' : ''}
						containerTooltip={!this.props.isMspDetailsView ? 'orderers_tooltip' : ''}
						tooltipDirection="right"
						emptyMessage="empty_orderer_message"
						emptyImage={emptyOrdererImage}
						emptyTitle="no_orderer_warning"
						isLink
						itemId="orderers"
						id="test__orderers--add--tile"
						loading={this.props.loading}
						items={ordererList}
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
								custom: orderer => {
									let status = orderer.status;
									if (status === false) {
										status = 'unknown';
									}
									if (!status) {
										status = 'status_pending';
									}
									if (!orderer.operations_url) {
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
						select={this.openOrdererDetails}
						searchEnabled
					/>
				</div>
			</div>
		);
	}
}

const dataProps = {
	ordererList: PropTypes.array,
	showImportOrderer: PropTypes.bool,
	history: PropTypes.object,
	loading: PropTypes.bool,
	selected: PropTypes.object,
	isMspDetailsView: PropTypes.bool,
};

Orderers.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	clearNotifications: PropTypes.func,
	showError: PropTypes.func,
	showInfo: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['feature_flags'] = state['settings'] ? state['settings']['feature_flags'] : null;
		newProps['userInfo'] = state['userInfo'] ? state['userInfo'] : null;
		return newProps;
	},
	{
		clearNotifications,
		showError,
		showInfo,
		showSuccess,
		updateState,
	}
)(withLocalize(Orderers));
