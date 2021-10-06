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
import { connect } from 'react-redux';
import emptyImage from '../../assets/images/empty_msps.svg';
import { clearNotifications, showBreadcrumb, showError, showSuccess, updateState } from '../../redux/commonActions';
import { MspRestApi } from '../../rest/MspRestApi';
import ActionsHelper from '../../utils/actionsHelper';
import Helper from '../../utils/helper';
import GenerateMSPModal from '../GenerateMSPModal/GenerateMSPModal';
import ItemContainer from '../ItemContainer/ItemContainer';
import ItemTileLabels from '../ItemContainerTile/ItemTileLabels/ItemTileLabels';
import Logger from '../Log/Logger';
import MSPDefinitionModal from '../MSPDefinitionModal/MSPDefinitionModal';
import PageContainer from '../PageContainer/PageContainer';
import PageHeader from '../PageHeader/PageHeader';

const SCOPE = 'msps';
const Log = new Logger(SCOPE);

class Msps extends Component {
	componentDidMount() {
		this.props.showBreadcrumb('msp', {}, this.props.history.location.pathname, true);
		this.props.updateState(SCOPE, {
			msps: [],
			createMSPModal: false,
			importMSPModal: false,
		});
		this.getMsps();
	}

	componentWillUnmount() {
		this.props.clearNotifications(SCOPE);
	}

	getMsps = () => {
		this.props.updateState(SCOPE, { loading: true });
		MspRestApi.getAllMsps()
			.then(msps => {
				msps.forEach(msp => {
					const admin_certs = _.get(msp, 'fabric_node_ous.enable') ? [] : _.get(msp, 'admins') || [];
					msp.certificateWarning = Helper.getLongestExpiry(admin_certs);
				});
				this.props.updateState(SCOPE, {
					msps,
					loading: false,
				});
			})
			.catch(error => {
				Log.error(error);
				this.props.updateState(SCOPE, { loading: false });
				if (error.statusCode !== 404 && error.msg !== 'no components exist') {
					this.props.showError('error_msps', {}, SCOPE);
				}
			});
	};

	createMSP = () => {
		this.props.updateState(SCOPE, { createMSPModal: true });
	};

	hideCreateMSPModal = () => {
		this.props.updateState(SCOPE, { createMSPModal: false });
	};

	openMspDetails = msp => {
		this.props.history.push('/organization/' + encodeURIComponent(msp.id) + window.location.search);
	};

	importMSP = () => {
		this.props.updateState(SCOPE, { importMSPModal: true });
	};

	hideImportMSPModal = () => {
		this.props.updateState(SCOPE, { importMSPModal: false });
	};

	onImportMspCompleted = (msp_name, isUpdate) => {
		if (isUpdate) {
			this.props.showSuccess('msp_updated', { msp_name: msp_name }, SCOPE);
		} else {
			this.props.showSuccess('msp_imported', { msp_name: msp_name }, SCOPE);
		}
		setTimeout(() => {
			this.getMsps();
		}, 1000);
	};

	onGenerateMspCompleted = msp_name => {
		this.props.showSuccess('msp_created', { msp_name: msp_name }, SCOPE);
		setTimeout(() => {
			this.getMsps();
		}, 1000);
	};

	buildCustomTile(msp) {
		return (
			<div>
				<div>
					<p className="ibp-node-msp-tile-name-sub">{msp.msp_id}</p>
					<ItemTileLabels certificateWarning={msp.certificateWarning}
						nodeOU={_.get(msp, 'fabric_node_ous.enable', false)}
					/>
				</div>
			</div>
		);
	}

	getButtons() {
		let buttons = [];
		if (ActionsHelper.canCreateComponent(this.props.userInfo)) {
			buttons.push({
				id: 'create_msp_definition',
				text: 'create_msp_definition',
				fn: this.createMSP,
				icon: 'plus',
			});
		}

		if (ActionsHelper.canImportComponent(this.props.userInfo)) {
			buttons.push({
				id: 'import_msp_definition_button',
				text: 'import_msp_definition',
				fn: this.importMSP,
				icon: 'import',
			});
		}
		return buttons;
	}
	render() {
		return (
			<PageContainer>
				<div className="bx--row">
					<div className="bx--col-lg-13">
						<PageHeader headerName="msp_heading"
							staticHeader
						/>
						<div id="msps-container"
							className="ibp__msps--container"
						>
							<ItemContainer
								containerTitle="available_msps"
								containerTooltip="msp_heading_tooltip"
								tooltipDirection="right"
								emptyImage={emptyImage}
								emptyTitle="empty_msps_title"
								emptyMessage="empty_msps_text"
								id="msps--add--tile"
								itemId="msps"
								isLink
								loading={this.props.loading}
								items={this.props.msps}
								select={this.openMspDetails}
								tileMapping={{
									title: 'display_name',
									custom: data => {
										return this.buildCustomTile(data);
									},
								}}
								listMapping={[
									{
										header: 'msp_name',
										attr: 'display_name',
									},
									{
										header: 'msp_id',
										attr: 'msp_id',
									},
								]}
								widerTiles
								addItems={this.getButtons()}
								multiAction
								maxTilesPerPagination={6}
								view="variableGrid"
							/>
						</div>
						{this.props.createMSPModal && <GenerateMSPModal onClose={this.hideCreateMSPModal}
							onComplete={this.onGenerateMspCompleted}
						/>}
						{this.props.importMSPModal && (
							<MSPDefinitionModal onClose={this.hideImportMSPModal}
								onComplete={this.onImportMspCompleted}
								mspModalType="settings"
							/>
						)}
					</div>
				</div>
			</PageContainer>
		);
	}
}

const dataProps = {
	loading: PropTypes.bool,
	msps: PropTypes.array,
	createMSPModal: PropTypes.bool,
	importMSPModal: PropTypes.bool,
};

Msps.propTypes = {
	...dataProps,
	clearNotifications: PropTypes.func,
	showBreadcrumb: PropTypes.func,
	showError: PropTypes.func,
	updateState: PropTypes.func,
	showSuccess: PropTypes.func,
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
		showBreadcrumb,
		showError,
		updateState,
		showSuccess,
	}
)(Msps);
