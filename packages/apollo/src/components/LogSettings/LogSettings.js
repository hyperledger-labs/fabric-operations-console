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
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { ContentSwitcher, Dropdown, Switch, TextInput } from 'carbon-components-react';
import BlockchainTooltip from '../BlockchainTooltip/BlockchainTooltip';
import Form from '../Form/Form';
import Helper from '../../utils/helper';
import SVGs from '../Svgs/Svgs';
import { updateState } from '../../redux/commonActions';

const SCOPE = 'logSettings';
const LOG_LEVELS = ['fatal', 'panic', 'error', 'warning', 'info', 'debug'];
const INVALID_LOGGER_REGEX = /[=\s,:/<>#{}%`[\]\\^~|]/;

class LogSettings extends Component {
	componentDidMount() {
		this.nextKey = new Date().getTime();
		this.initData();
	}

	componentDidUpdate(prevProps) {
		if (prevProps.log_spec !== this.props.log_spec) {
			this.initData();
		}
	}

	getKey(logger) {
		let key = null;
		if (this.props.override_log_levels) {
			this.props.override_log_levels.forEach(override => {
				if (override.logger === logger) {
					key = override.key;
				}
			});
		}
		if (!key) {
			key = '' + this.nextKey;
			this.nextKey++;
		}
		return key;
	}

	initData() {
		const new_log_spec = this.props.log_spec || 'info';
		const { default_log_level, override_log_levels } = this.parseLogSpec(new_log_spec);
		this.props.updateState(SCOPE, {
			new_log_spec,
			default_log_level,
			override_log_levels,
			view: 0,
		});
	}

	validateLogOverrides(overrides) {
		if (!overrides) {
			overrides = this.props.override_log_levels || [];
		}
		let valid = true;
		overrides.forEach((override, index) => {
			override.error = false;
			if (override.logger) {
				if (INVALID_LOGGER_REGEX.test(override.logger)) {
					override.error = true;
					valid = false;
				}
			} else {
				if (index < overrides.length - 1) {
					override.error = true;
					valid = false;
				}
			}
		});
		return valid;
	}

	parseLogSpec(spec) {
		let default_log_level = 'info';
		let override_log_levels = [];
		let data = spec ? spec.toLowerCase().split(':') : [];
		data.forEach(level => {
			if (level === 'warn') level = 'warning';
			if (LOG_LEVELS.indexOf(level) !== -1) {
				default_log_level = level;
			} else {
				let i = level.indexOf('=');
				if (i > 0) {
					let loggers = level.substring(0, i);
					let level2 = level.substring(i + 1);
					if (level2 === 'warn') {
						level2 = 'warning';
					}
					if (LOG_LEVELS.indexOf(level2) !== -1) {
						loggers = loggers.split(',');
						loggers.forEach(logger => {
							override_log_levels.push({
								logger,
								level: level2,
								key: this.getKey(logger),
							});
						});
					}
				}
			}
		});
		return {
			default_log_level,
			override_log_levels,
		};
	}

	buildLogSpec(default_log_level, overrides) {
		if (!default_log_level) {
			default_log_level = this.props.default_log_level;
		}
		if (!overrides) {
			overrides = this.props.override_log_levels || [];
		}
		let log_spec = default_log_level;
		LOG_LEVELS.forEach(level => {
			const loggers = [];
			overrides.forEach(data => {
				if (data.logger && data.level === level) {
					loggers.push(data.logger);
				}
			});
			if (loggers.length > 0) {
				log_spec = log_spec + ':' + loggers.join(',') + '=' + level;
			}
		});
		return log_spec;
	}

	validateLogSpec(log_spec) {
		if (!log_spec) {
			return false;
		}
		let default_log_level = null;
		let valid = true;
		let data = log_spec.toLowerCase().split(':');
		let back;
		let front;
		data.forEach(item => {
			let i = item.indexOf('=');
			switch (i) {
				case -1:
					if (default_log_level) {
						valid = false;
					} else {
						default_log_level = item;
						if (LOG_LEVELS.indexOf(item) === -1) {
							valid = false;
						}
					}
					break;
				case 0:
					valid = false;
					break;
				default:
					back = item.substring(i + 1);
					if (LOG_LEVELS.indexOf(back) === -1) {
						valid = false;
					} else {
						if (item.charAt(i - 1) === ',') {
							valid = false;
						}
						front = item.substring(0, i).split(',');
						front.forEach(logger => {
							if (logger) {
								if (INVALID_LOGGER_REGEX.test(logger)) {
									valid = false;
								}
							} else {
								valid = false;
							}
						});
					}
					break;
			}
		});
		return valid;
	}

	sendChange(data) {
		let change = null;
		if (data.view === undefined) {
			data.view = this.props.view;
		}
		if (data.view === 0) {
			if (this.validateLogOverrides(data.override_log_levels)) {
				change = this.buildLogSpec(data.default_log_level, data.override_log_levels);
			}
		}
		if (data.view === 1) {
			if (this.validateLogSpec(data.new_log_spec)) {
				change = data.new_log_spec;
			}
		}
		if (this.props.onChange) {
			this.props.onChange(change);
		}
	}

	update(data) {
		this.sendChange(data);
		this.props.updateState(SCOPE, data);
	}

	renderSimple() {
		const overrides = this.props.override_log_levels ? [...this.props.override_log_levels] : [];
		if (overrides.length === 0 || overrides[overrides.length - 1].logger) {
			overrides.push({
				key: this.getKey(),
			});
		}
		return (
			<div className="ibp-simple-log-settings">
				<Form
					scope={SCOPE}
					id={SCOPE + '-simple'}
					fields={[
						{
							name: 'default_log_level',
							type: 'dropdown',
							options: LOG_LEVELS,
							translateOptions: {},
							required: true,
							default: this.props.default_log_level,
						},
					]}
					onChange={data => {
						this.sendChange({
							...data,
							view: this.props.view,
						});
					}}
				/>
				<div className="ibp-form">
					<div className="ibp-form-field">
						<label className="ibp-form-label">
							<BlockchainTooltip type="definition"
								tooltipText={this.props.t('logger_overrides_tooltip')}
							>
								{this.props.t('logger_overrides')}
							</BlockchainTooltip>
						</label>
					</div>
					<table>
						<tbody>
							{overrides.map((override, index) => {
								return (
									<tr key={override.key}>
										<td>
											<TextInput
												id={override.key}
												defaultValue={override.logger}
												placeholder={this.props.t('logger_placeholder')}
												aria-label={this.props.t('logger_name')}
												invalid={override.error ? true : false}
												invalidText={override.error ? this.props.t('input_error_invalid') : undefined}
												onChange={evt => {
													overrides[index].logger = evt.target.value;
													if (!overrides[index].level) {
														overrides[index].level = this.props.default_log_level;
													}
													this.update({
														override_log_levels: overrides,
													});
												}}
											/>
										</td>
										<td>{index < overrides.length - 1 && <div className="ibp-log-settings-equal">=</div>}</td>
										<td>
											{index < overrides.length - 1 && (
												<Dropdown
													label={this.props.t('log_level_override', { logger: override.logger })}
													id={override.key}
													name={override.key}
													ariaLabel={this.props.t('log_level_override', { logger: override.logger })}
													items={LOG_LEVELS}
													selectedItem={override.level || this.props.default_log_level}
													itemToString={item => this.props.t(item)}
													onChange={change => {
														overrides[index].level = change.selectedItem;
														this.update({
															override_log_levels: overrides,
														});
													}}
												/>
											)}
										</td>
										<td>
											{index < overrides.length - 1 && (
												<button
													id={'logger-delete-button-' + index}
													className="ibp-logger-delete"
													title={this.props.t('remove')}
													onClick={() => {
														overrides.splice(index, 1);
														this.update({
															override_log_levels: overrides,
														});
													}}
												>
													<SVGs type="trash" />
												</button>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>
		);
	}

	renderAdvanced() {
		return (
			<div className="ibp-advaced-log-settings">
				<Form
					scope={SCOPE}
					id={SCOPE + '-advanced'}
					fields={[
						{
							name: 'new_log_spec',
							required: true,
							label: 'log_spec',
							placeholder: 'log_spec_placeholder',
							default: this.props.new_log_spec,
							validate: Helper.validateLogSpec,
							tooltip: 'log_spec_tooltip',
						},
					]}
					onChange={(data, valid) => {
						let change = valid ? data.new_log_spec : null;
						if (this.props.onChange) {
							this.props.onChange(change);
						}
					}}
				/>
			</div>
		);
	}

	render() {
		return (
			<div className="ibp-log-settings">
				<ContentSwitcher
					className="ibp-mode-toggle"
					onChange={() => {
						let data = {};
						if (this.props.view === 1) {
							data = this.parseLogSpec(this.props.new_log_spec);
						} else {
							const new_log_spec = this.buildLogSpec(this.props.default_log_level, this.props.override_log_levels);
							data = { new_log_spec };
						}
						data.view = 1 - this.props.view;
						this.update(data);
					}}
					selectedIndex={this.props.view}
				>
					<Switch kind="button"
						id="ibp-log-settings-simple"
						name="simple"
						text={this.props.t('simple')}
					/>
					<Switch kind="button"
						id="ibp-log-settings-advanced"
						name="advanced"
						text={this.props.t('advanced')}
					/>
				</ContentSwitcher>
				{this.props.view === 0 && this.renderSimple()}
				{this.props.view === 1 && this.renderAdvanced()}
			</div>
		);
	}
}

const dataProps = {
	new_log_spec: PropTypes.string,
	default_log_level: PropTypes.any,
	override_log_levels: PropTypes.array,
	view: PropTypes.number,
};

LogSettings.propTypes = {
	...dataProps,
	log_spec: PropTypes.string,
	onChange: PropTypes.func,
	t: PropTypes.func,
	updateState: PropTypes.func,
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		return newProps;
	},
	{
		updateState,
	}
)(withTranslation()(LogSettings));
