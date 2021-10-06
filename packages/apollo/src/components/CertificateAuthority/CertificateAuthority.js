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
import { CertificateAuthorityRestApi } from '../../rest/CertificateAuthorityRestApi';
import ActionsHelper from '../../utils/actionsHelper';
import Helper from '../../utils/helper';
import ImportCAModal from '../ImportCAModal/ImportCAModal';
import ItemContainer from '../ItemContainer/ItemContainer';
import Logger from '../Log/Logger';
import NodeStatus from '../../utils/status';
import emptyCAImage from '../../assets/images/empty_nodes.svg';
import ItemTileLabels from '../ItemContainerTile/ItemTileLabels/ItemTileLabels';
import { triggerSurvey, triggers } from '../../utils/medallia';
import * as constants from '../../utils/constants';

const SCOPE = 'cas';
const Log = new Logger(SCOPE);
const naturalSort = require('javascript-natural-sort');
let secondaryCaStatusCheck = null;
let tooLongTimer = null;

export class CertificateAuthority extends Component {
	componentDidMount() {
		this.getCAs();

		// after x hours stop the secondary status checker
		clearTimeout(tooLongTimer);
		tooLongTimer = setTimeout(() => {
			clearInterval(secondaryCaStatusCheck);
		}, constants.SECONDARY_STATUS_TIMEOUT);
	}

	componentWillUnmount() {
		this.props.clearNotifications(SCOPE);
		NodeStatus.cancel();
	}

	getCAs = () => {
		this.props.updateState(SCOPE, { loading: true });
		CertificateAuthorityRestApi.getCAs()
			.then(caList => {
				// loop slowly on peer status forever to keep status icon up to date...
				clearInterval(secondaryCaStatusCheck);
				secondaryCaStatusCheck = setInterval(() => {
					NodeStatus.getStatus(caList, SCOPE, 'caList', null, 1);
				}, constants.SECONDARY_STATUS_PERIOD); // very slow

				caList.forEach(ca => {
					ca.certificateWarning = Helper.getLongestExpiry([_.get(ca, '.msp.component.tls_cert')]);
				});
				this.props.updateState(SCOPE, {
					caList,
					loading: false,
				});
				NodeStatus.getStatus(caList, SCOPE, 'caList');
			})
			.catch(error => {
				Log.error(error);
				this.props.updateState(SCOPE, {
					caList: [],
					loading: false,
				});
				if (error.statusCode !== 404 && error.msg !== 'no components exist') {
					this.props.showError('error_cas', {}, SCOPE);
				}
			});
	};

	openImportCAModal = () => {
		this.props.updateState(SCOPE, {
			showImportCA: true,
		});
	};

	closeImportCAModal = () => {
		this.props.updateState(SCOPE, {
			showImportCA: false,
		});
	};

	openCADetails = ca => {
		this.props.history.push('/ca/' + encodeURIComponent(ca.id) + window.location.search);
	};

	handleComplete = newCAs => {
		this.showNewCAs(newCAs);
		this.props.onCreate(newCAs);
	};

	showNewCAs = newCAs => {
		const cas = newCAs.map(ca => ca.name);
		this.props.showSuccess(
			newCAs.length === 1 ? 'add_ca_successful' : 'add_cas_successful',
			{ caName: cas.join(', ') },
			SCOPE,
			newCAs.length === 1 ? 'add_ca_successful_description' : 'add_cas_successful_description',
			10000
		);
		const caList = [];
		this.props.caList.forEach(ca => {
			ca.new = false;
			caList.push(ca);
		});
		newCAs.forEach(ca => {
			ca.new = true;
			caList.push(ca);
		});
		caList.sort((a, b) => {
			return naturalSort(a.name, b.name);
		});
		this.props.updateState(SCOPE, { caList });
		NodeStatus.getStatus(newCAs, SCOPE, 'caList');
		this.props.clearNotifications('orderers_HELP');
		triggerSurvey(triggers.CREATE_CA);
	};

	buildCustomTile(ca) {
		const isPatchAvailable = ca.isUpgradeAvailable && ca.location === 'ibm_saas' && ActionsHelper.canCreateComponent(this.props.userInfo);
		let status = ca.status;
		if (status !== 'stopped' && status !== 'running') {
			status = 'unknown';
		}
		return (
			<div className="ibp-node-peer-tile">
				<ItemTileLabels location={ca.location}
					isPatchAvailable={isPatchAvailable}
					certificateWarning={ca.certificateWarning}
				/>
				{this.getCAStatus(ca)}
			</div>
		);
	}

	getCAStatus = ca => {
		let className = 'ibp-node-status-skeleton';
		if (ca && ca.status) {
			if (ca.status === 'running' || ca.status === 'stopped' || ca.status === 'unknown') {
				className = 'ibp-node-status-' + ca.status;
			}
		}
		const translate = this.props.translate;
		return ca && ca.status !== undefined ? (
			<div className="ibp-node-status-container">
				<span className={`ibp-node-status	${className}`}
					tabIndex="0"
				/>
				<span className="ibp-node-status-label">{translate(ca.status)}</span>
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
				text: this.props.feature_flags?.import_only_enabled ? 'import_only_ca' : 'add_ca',
				fn: this.openImportCAModal,
			});
		}
		return buttons;
	}

	render() {
		return (
			<div>
				<div>{this.props.showImportCA && <ImportCAModal onClose={this.closeImportCAModal}
					onComplete={this.handleComplete}
					parentScope={SCOPE}
				/>}</div>
				<div id="cas-container"
					className="ibp__cas--container"
				>
					<ItemContainer
						containerTitle="cas"
						containerTooltip="cas_tooltip"
						tooltipDirection="right"
						emptyMessage="empty_ca_message"
						emptyImage={emptyCAImage}
						emptyTitle="no_ca_warning"
						itemId="cas"
						id="test__ca--add--tile"
						isLink
						loading={this.props.loading}
						items={this.props.caList}
						select={this.openCADetails}
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
								header: 'location',
								attr: 'location',
								translate: true,
							},
							{
								header: 'ca_url',
								attr: 'api_url',
							},
							{
								header: 'status',
								custom: ca => {
									let status = 'status_pending';
									if (ca.status !== undefined) {
										status = ca.status;
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
						addItems={this.getButtons()}
						view="variableGrid"
						searchEnabled
					/>
				</div>
			</div>
		);
	}
}

const dataProps = {
	caList: PropTypes.array,
	showImportCA: PropTypes.bool,
	history: PropTypes.object,
	loading: PropTypes.bool,
};

CertificateAuthority.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	showError: PropTypes.func,
	showInfo: PropTypes.func,
	showSuccess: PropTypes.func,
	clearNotifications: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
	onCreate: PropTypes.func,
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
)(withLocalize(CertificateAuthority));
