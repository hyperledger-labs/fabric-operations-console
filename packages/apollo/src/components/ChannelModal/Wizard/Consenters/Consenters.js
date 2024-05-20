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

import TrashCan20 from '@carbon/icons-react/lib/trash-can/20';
import { Button, Checkbox, Toggle } from 'carbon-components-react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { updateState } from '../../../../redux/commonActions';
import * as constants from '../../../../utils/constants';
import Helper from '../../../../utils/helper';
import Form from '../../../Form/Form';
import SidePanelWarning from '../../../SidePanelWarning/SidePanelWarning';
import TranslateLink from '../../../TranslateLink/TranslateLink';
const SCOPE = 'channelModal';
const bytes = require('bytes');

// This is step "consenter_set"
//
// panel allows setting which orderers should be consenters on this channel
// it also allows the raft params to be edited
class Consenters extends Component {
	onAddConsenter = option => {
		if (typeof this.props.selectedConsenter === 'object') {
			this.props.selectedConsenter._consenter = true;					// flip to true
		}
		const updatedConsenterSet = _.isEmpty(this.props.consenters) ? [this.props.selectedConsenter] : [...this.props.consenters, this.props.selectedConsenter];
		this.props.updateState(SCOPE, {
			consenters: updatedConsenterSet,
			selectedConsenter: null,
		});
	};

	onDeleteConsenter = index => {
		const updatedConsenterSet = this.props.consenters.filter((c, i) => i !== index);
		this.props.updateState(SCOPE, {
			consenters: updatedConsenterSet,
		});
		if (updatedConsenterSet.length === 0) {
			this.props.updateState(SCOPE, {
				overrideRaftDefaults: false,
			});
		}
		if (this.props.invalid_consenter) {
			this.checkForInvalidConsenter(updatedConsenterSet);
		}
	};

	onResetConsenter = () => {
		this.props.updateState(SCOPE, {
			consenters: this.props.existingConsenters,
		});
		this.checkForInvalidConsenter(this.props.existingConsenters);
	};

	onChangeOverrideRaftDefaults = event => {
		this.props.updateState(SCOPE, {
			overrideRaftDefaults: event.target.checked,
			snapshot_interval_size: bytes(constants.SNAPSHOT_INTERVAL_SIZE_DEFAULT),
		});
	};

	checkForInvalidConsenter(consenters) {
		const { orderer_orgs, raftNodes } = this.props;
		// check if there are any consenters that are not from the list of orderer orgs
		let allowed_raftNodes = raftNodes;
		if (orderer_orgs) {
			allowed_raftNodes = raftNodes.filter(x => {
				let find = orderer_orgs.find(y => x.msp_id === y.msp_id);
				return find ? true : false;
			});
		}

		// only nodes that are from the orderer admin msp on application channel are allowed
		let invalid_consenter = false;
		if (consenters) {
			consenters.forEach(consenter => {
				let found = allowed_raftNodes.filter(x => consenter.client_tls_cert === x.client_tls_cert && consenter.host === x.host);
				if (!found || !found.length) {
					invalid_consenter = true;
				}
			});
		}
		this.props.updateState(SCOPE, {
			invalid_consenter,
		});
	}

	render() {
		const {
			consenterUpdateCount,
			raftNodes,						// contains all known orderer nodes
			consenters,
			updateOrdererDefError,
			selectedConsenter,
			invalid_consenter,
			isChannelUpdate,
			isTLSUnavailable,
			overrideRaftDefaults,
			updateState,
			snapshot_interval_size,
			t: translate,
			use_default_consenters,
			use_osnadmin,
		} = this.props;
		let availableConsenters = [];
		let allowed_raftNodes = raftNodes;

		// filter nodes out of "raftNodes" that do NOT have msp ids found in "orderer_orgs"
		if (this.props.orderer_orgs) {
			allowed_raftNodes = raftNodes.filter(x => {
				let find = this.props.orderer_orgs.find(y => x.msp_id === y.msp_id);
				return find ? true : false;
			});
		}

		// if we are not using a system channel then filter out nodes that are *not* systemless
		if (this.props.use_osnadmin) {
			allowed_raftNodes = raftNodes.filter(x => {
				return x._systemless;
			});
		}

		// else filter out nodes that *are* systemless
		else {
			allowed_raftNodes = raftNodes.filter(x => {
				return !x._systemless;
			});
		}

		// remove consenter options that have already been selected, match on host + port
		if (allowed_raftNodes) {
			if (consenters) {
				availableConsenters = allowed_raftNodes.filter(x => !consenters.find(y => Number(y.port) === Number(x.port) && y.host === x.host));
			} else {
				availableConsenters = allowed_raftNodes;
			}
		}

		return (
			<div className="ibp-channel-consenters">
				<p className="ibp-channel-section-title">{translate('consenter_set')}</p>
				<TranslateLink
					text={use_osnadmin ? 'create_channel_consenter_set_desc2' : (isChannelUpdate ? 'update_channel_consenter_set_desc' : 'create_channel_consenter_set_desc')}
					className="ibp-channel-section-desc-with-link"
				/>
				{allowed_raftNodes.length >= 1 && (
					<div>
						{!updateOrdererDefError && (
							<div>
								{!isChannelUpdate && (
									<>
										<div className="ibp-channel-section-desc-with-link">
											<label>{translate(use_osnadmin ? 'use_default_consenters2' : 'use_default_consenters')}</label>
										</div>
										<Toggle
											id="use_default_consenters_toggle"
											toggled={use_default_consenters}
											onToggle={() => {
												this.props.updateState(SCOPE, {
													use_default_consenters: !use_default_consenters,
												});
											}}
											onChange={() => { }}
											aria-label={translate(use_osnadmin ? 'use_default_consenters2' : 'use_default_consenters')}
											labelA={translate('no')}
											labelB={translate('yes')}
										/>
									</>
								)}
								{!use_default_consenters && (
									<>
										<div className="ibp-add-consenters">
											<div className="ibp-add-consenters-select-box">
												{!!allowed_raftNodes && (
													<div>
														<Form
															scope={SCOPE}
															id={SCOPE + '-consenters'}
															fields={[
																{
																	name: 'selectedConsenter',
																	label: 'channel_consenter',
																	type: 'dropdown',
																	options: availableConsenters,
																	default: 'select_consenter',
																},
															]}
														/>
													</div>
												)}
											</div>
											{!!selectedConsenter && (
												<Button
													id="btn-add-consenter"
													kind="secondary"
													className="ibp-add-consenter"
													onClick={this.onAddConsenter}
													disabled={selectedConsenter === 'select_consenter'}
												>
													{translate('add')}
												</Button>
											)}

											{isChannelUpdate && (consenterUpdateCount > 1 || _.isEmpty(this.props.consenters)) && (
												<Button id="btn-reset-consenter"
													kind="secondary"
													className="ibp-reset-consenter"
													onClick={this.onResetConsenter}
												>
													{translate('reset')}
												</Button>
											)}
										</div>
										{!_.isEmpty(consenters) && (
											<div className="ibp-channel-table-headers">
												<div className="ibp-add-consenter-table-name">{translate('name')}</div>
											</div>
										)}
										{!_.isEmpty(consenters) &&
											consenters.map((consenter, i) => {
												let name = consenter.name ? consenter.name : consenter.host;
												return (
													<div key={'consenter_' + i}
														className="ibp-add-channel-table"
													>
														<div className="ibp-add-consenter-table-name">
															<input className="bx--text-input"
																value={name}
																disabled={true}
																aria-label={translate('name') + ' ' + name}
															/>
														</div>
														<Button
															hasIconOnly
															type="button"
															renderIcon={TrashCan20}
															kind="secondary"
															id={'ibp-remove-consenter-' + i}
															iconDescription={translate('remove_consenter')}
															tooltipAlignment="center"
															tooltipPosition="bottom"
															className="ibp-consenters-remove"
															size="default"
															onClick={() => {
																this.onDeleteConsenter(i);
															}}
														/>
													</div>
												);
											})}
										{isChannelUpdate && consenterUpdateCount > 1 && (
											<div className="ibp-error-panel">
												<SidePanelWarning title=""
													subtitle="consenter_count_error"
												/>
											</div>
										)}
										{!this.props.use_default_consenters && _.isEmpty(this.props.consenters) && (
											<div className="ibp-error-panel">
												<SidePanelWarning title=""
													subtitle="consenter_empty_error"
												/>
											</div>
										)}
										{invalid_consenter && (
											<div className="ibp-error-panel">
												<SidePanelWarning title=""
													subtitle="invalid_consenter_error"
												/>
											</div>
										)}
										{!_.isEmpty(consenters) && (
											<div className="ibp-raft-params">
												{!isChannelUpdate && (
													<div className="ibp-override-defaults-checkbox">
														<Checkbox
															id={'override-raft-defaults'}
															labelText={translate('override_raft_defaults')}
															checked={overrideRaftDefaults}
															onClick={event => {
																this.onChangeOverrideRaftDefaults(event);
															}}
														/>
													</div>
												)}
												{(isChannelUpdate || overrideRaftDefaults) && (
													<Form
														scope={SCOPE}
														id={SCOPE + '-raft-params'}
														onChange={data => {
															if (data.snapshot_interval_size_mb !== undefined) {
																// convert from MB to bytes
																updateState(SCOPE, {
																	snapshot_interval_size: Math.floor(data.snapshot_interval_size_mb * 1024 * 1024),
																});
															}
															/* if (data.tick_interval_ms !== undefined) {
																this.props.updateState(SCOPE, {
																	tick_interval: data.tick_interval_ms + 'ms',
																});
															} */
														}}
														fields={[
															/* {
																name: 'tick_interval_ms',
																label: 'tick_interval',
																placeholder: 'tick_interval_placeholder',
																tooltip: 'tick_interval_tooltip',
																tooltipOptions: { timeout_min: constants.TICK_INTERVAL_MIN, timeout_max: constants.TICK_INTERVAL_MAX },
																default: parse(this.props.existingRaftParams.tick_interval),
																type: 'slider',
																min: parse(constants.TICK_INTERVAL_MIN),
																max: parse(constants.TICK_INTERVAL_MAX),
																unit: translate('millisecond'),
															},
															{
																name: 'election_tick',
																placeholder: 'election_tick_placeholder',
																tooltip: 'election_tick_tooltip',
																tooltipOptions: {
																	max_message_count_min: constants.ELECTION_TICK_MIN,
																	max_message_count_max: constants.ELECTION_TICK_MAX
																},
																default: this.props.existingRaftParams.election_tick,
																type: 'slider',
																min: constants.ELECTION_TICK_MIN,
																max: constants.ELECTION_TICK_MAX,
															},
															{
																name: 'heartbeat_tick',
																placeholder: 'heartbeat_tick_placeholder',
																tooltip: 'heartbeat_tick_tooltip',
																tooltipOptions: {
																	heartbeat_tick_min: constants.HEARTBEAT_TICK_MIN,
																	heartbeat_tick_max: constants.HEARTBEAT_TICK_MAX
																},
																default: this.props.existingRaftParams.heartbeat_tick,
																type: 'slider',
																min: constants.HEARTBEAT_TICK_MIN,
																max: constants.HEARTBEAT_TICK_MAX,
															},
															{
																name: 'max_inflight_blocks',
																placeholder: 'max_inflight_blocks_placeholder',
																tooltip: 'max_inflight_blocks_tooltip',
																tooltipOptions: {
																	max_inflight_blocks_min: constants.MAX_INFLIGHT_BLOCKS_MIN,
																	max_inflight_blocks_max: constants.MAX_INFLIGHT_BLOCKS_MAX
																},
																default: this.props.existingRaftParams.max_inflight_blocks,
																type: 'slider',
																min: constants.MAX_INFLIGHT_BLOCKS_MIN,
																max: constants.MAX_INFLIGHT_BLOCKS_MAX,
															}, */
															{
																name: 'snapshot_interval_size_mb',
																label: 'snapshot_interval_size',
																placeholder: 'snapshot_interval_size_placeholder',
																tooltip: 'snapshot_interval_size_tooltip',
																tooltipOptions: { snapshot_interval_size_max: constants.SNAPSHOT_INTERVAL_SIZE_MAX },
																default: snapshot_interval_size
																	? Math.floor(snapshot_interval_size / (1024 * 1024))
																	: bytes(constants.SNAPSHOT_INTERVAL_SIZE_DEFAULT),
																type: 'slider',
																min: bytes(constants.SNAPSHOT_INTERVAL_SIZE_MIN) / (1024 * 1024),
																max: bytes(constants.SNAPSHOT_INTERVAL_SIZE_MAX) / (1024 * 1024),
																step: 1,
																unit: translate('megabyte'),
															},
														]}
													/>
												)}
											</div>
										)}
									</>
								)}
							</div>
						)}
						{updateOrdererDefError && (
							<div className="ibp-error-panel">
								<SidePanelWarning title="update_orderer_def_error_title"
									subtitle="update_orderer_def_error_desc"
								/>
							</div>
						)}
					</div>
				)}
				{isTLSUnavailable && (
					<div className="ibp-missing-definition-error">
						<SidePanelWarning title={translate('orderer_tls_error')} />
					</div>
				)}
			</div>
		);
	}
}

const dataProps = {
	raftNodes: PropTypes.object,
	updateOrdererDefError: PropTypes.bool,
	isTLSUnavailable: PropTypes.bool,
	orderer_orgs: PropTypes.array,
	consenters: PropTypes.array,
	selectedConsenter: PropTypes.object,
	isChannelUpdate: PropTypes.bool,
	existingRaftParams: PropTypes.object,
	snapshot_interval_size: PropTypes.number,
	overrideRaftDefaults: PropTypes.bool,
	invalid_consenter: PropTypes.bool,
	use_default_consenters: PropTypes.bool,
	use_osnadmin: PropTypes.bool,
};

Consenters.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
	}
)(withTranslation()(Consenters));
