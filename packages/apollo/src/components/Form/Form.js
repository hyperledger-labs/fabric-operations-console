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
import { Button, Dropdown, InlineLoading, MultiSelect, RadioButton, SelectableTile, SkeletonText, TextArea, TextInput } from 'carbon-components-react';
import DropdownSkeleton from 'carbon-components-react/lib/components/Dropdown/Dropdown.Skeleton';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation, Trans } from 'react-i18next';
import { connect } from 'react-redux';
import PlusIcon from '../../assets/images/plus.svg';
import { updateState } from '../../redux/commonActions';
import Helper from '../../utils/helper';
import BlockchainSlider from '../BlockchainSlider/BlockchainSlider';
import BlockchainTooltip from '../BlockchainTooltip/BlockchainTooltip';
import FileUploader from '../FileUploader/FileUploader';
import GenericChips from '../GenericChips/GenericChips';
import SVGs from '../Svgs/Svgs';
import TranslateLink from '../TranslateLink/TranslateLink';
import VisibilityToggle from '../VisibilityToggle/VisibilityToggle';

const MAX_PEM_SIZE = 102400;

class Form extends Component {
	componentDidMount() {
		const formData = {};
		formData[this.props.id] = {};
		const data = {};
		this.props.fields.forEach(field => {
			if (field.type === 'dropdown' && field.format === 'object') {
				data[field.name] = { value: this.getDefaultValue(field) };		// some dropdown fields hold an object...
			} else {
				data[field.name] = this.getDefaultValue(field);
			}
			if (field.type === 'certificates') {
				const subfields = [];
				if (data[field.name] && data[field.name].length) {
					for (let i = 0; i < data[field.name].length; i++) {
						subfields.push(field.name + '_' + i);
						formData[this.props.id][field.name + '_' + i] = data[field.name][i];
					}
				}
				if (!field.readonly) {
					subfields.push(field.name + '_' + new Date().getTime());
				}
				formData[this.props.id][field.name] = {
					subfields,
				};
			}
		});
		this.props.updateState(this.props.scope, data);
		this.props.updateState('form', formData);
	}

	updateFormProp(field, data) {
		const formData = {};
		formData[this.props.id] = { ...this.props.formProps };
		formData[this.props.id][field.name] = data;
		this.props.updateState('form', formData);
		this.props.formProps[field.name] = data;
	}

	getDefaultValue(field) {
		let value = field.default;
		if (value === undefined) {
			switch (field.type) {
				case 'dropdown':
					value = field.options ? field.options[0] : null;
					break;
				case 'certificates':
				case 'chips':
					value = [];
					break;
				default:
					value = null;
					break;
			}
		}
		return value;
	}

	validateNameValuePairs(pairs) {
		let valid = true;
		if (pairs) {
			pairs.forEach(pair => {
				if (Helper.validateCharacters(pair.name)) {
					if (!Helper.validateCharacters(pair.value)) {
						valid = false;
					}
				} else {
					valid = false;
				}
			});
		}
		return valid;
	}

	isDropDownValid(field, data) {
		let value = data[field.name];
		let valid = false;
		if (value) {
			field.options.forEach(option => {
				if (typeof value === 'string') {
					if (option === value) {
						valid = true;
					}
				} else {
					if (option.name && value.name && option.name === value.name) {
						valid = true;
					}
				}
			});
		}
		return valid;
	}

	isFormValid(data) {
		let valid = true;
		let formProps = {};
		let subfields = [];
		let count = 0;
		let sub = null;
		let subValue = null;
		this.props.fields.forEach(field => {
			switch (field.type) {
				case 'dropdown':
					if (field.required && !this.isDropDownValid(field, data)) {
						valid = false;
					}
					break;
				case 'namevaluepairs':
					if (!this.validateNameValuePairs(data[field.name])) {
						valid = false;
					}
					break;
				case 'namevaluepair':
					if (field.required && (!data[field.name] || !data[field.name].length || !data[field.name][0].name || !data[field.name][0].value)) {
						valid = false;
					}
					if (!this.validateNameValuePairs(data[field.name])) {
						valid = false;
					}
					break;
				case 'multiselect':
				case 'multiselect2':
				case 'chips':
					if (field.required && (!data[field.name] || !data[field.name].length)) {
						valid = false;
					}
					if (data[field.name]) {
						data[field.name].forEach(chip => {
							if (!Helper.validateCharacters(chip)) {
								valid = false;
							}
						});
					}
					break;
				case 'certificates':
					formProps = this.props.formProps[field.name];
					subfields = formProps && formProps.subfields ? formProps.subfields : [];
					count = 0;
					sub = null;
					subValue = null;
					for (let i = 0; i < subfields.length; i++) {
						sub = subfields[i];
						subValue = data.formProps[sub];
						if (subValue) {
							if (subValue.file) {
								if (subValue.error) {
									valid = false;
								} else {
									count++;
								}
							}
							if (_.isString(subValue)) {
								if (!field.validate || field.validate(subValue)) {
									count++;
								} else {
									valid = false;
								}
							}
						}
					}
					if (field.required && !count) {
						valid = false;
					}
					break;
				case 'private_key':
				case 'certificate':
					if (!this.validatePEMField(field, data[field.name], true)) {
						valid = false;
					}
					break;
				case 'json_file':
					if (!this.validateJsonFileField(field, data[field.name], true)) {
						valid = false;
					}
					break;
				default:
					if (!this.validateTextField(field, data[field.name], true)) {
						valid = false;
					}
					break;
			}
		});
		return valid;
	}

	validateTextField(field, value, checkOnly) {
		const e = document.getElementById(`${this.props.id}-${field.name}`);
		if (value && !_.isString(value)) {
			value = '' + value;
		}
		let valid = true;
		let error = null;
		if (field.type === 'url' && e && e.validity && !e.validity.valid) {
			valid = false;
			error = 'input_error_invalid_url';
		} else if (field.type === 'email' && e && e.validity && !e.validity.valid) {
			valid = false;
			error = 'input_error_invalid_email';
		} else if (field.type === 'number' && e && e.validity && !e.validity.valid) {
			valid = false;
			error = 'input_error_invalid';
		} else if (field.type === 'number' && !value.match(/^-?\d*\.?\d*$/)) {
			valid = false;
			error = 'input_error_invalid';
		} else if (field.required && !value) {
			valid = false;
		} else if (Helper.checkSpecialRules(value, field.specialRules)) {
			valid = false;
			error = 'input_error_' + Helper.checkSpecialRules(value, field.specialRules);
		} else if (!Helper.validateCharacters(value)) {
			valid = false;
			error = 'input_error_invalid_char';
		} else if (field.validate) {
			if (!field.validate(value)) {
				valid = false;
				error = field.validationErrorMsg ? field.validationErrorMsg : 'input_error_invalid';
			}
		}
		if (!checkOnly) {
			this.updateFormProp(field, {
				...this.props.formProps[field.name],
				error,
			});
		}
		return valid;
	}

	renderTextInput(field, value, translate) {
		const error = field.errorMsg || this.props.formProps[field.name].error;
		const decimal = Helper.formatNumber(0.1)[1];
		let field_type = field.type ? field.type : 'text';
		let formatted_value = value;
		if (field.type === 'number') {
			field_type = 'text';
			if (value && decimal !== '.') {
				formatted_value = value.toString().replace('.', decimal);
			}
		}
		if (field.loading) {
			return (
				<SkeletonText
					style={{
						paddingTop: '.5rem',
						width: '100%',
						height: '2.5rem',
					}}
				/>
			);
		}
		const markup = (
			<div className={field.type === 'password' ? 'ibp-input-field-password' : ''}>
				<TextInput
					className={field.type === 'password' ? ' ibp-form-password' : ''}
					id={this.props.id + '-' + field.name}
					name={field.name}
					type={field_type}
					value={formatted_value || ''}
					disabled={field.disabled}
					placeholder={field.placeholder ? translate(field.placeholder) : translate(field.name + '_placeholder')}
					onChange={evt => {
						const data = {};
						data[field.name] = evt.target.value;
						if (data[field.name] && field.type === 'number') {
							if (decimal !== '.') {
								data[field.name] = data[field.name].toString().replace(decimal, '.');
							}
						}
						this.props.updateState(this.props.scope, data);
						let valid = this.validateTextField(field, data[field.name]);
						if (this.props.onChange) {
							if (valid) {
								valid = this.isFormValid({
									...this.props,
									...data,
								});
							}
							this.props.onChange(data, valid, field, this.props.formProps);
						}
					}}
					min={field.min}
					max={field.max}
					step={field.step}
					readOnly={field.readonly}
					autoComplete={field.type === 'password' ? 'off' : 'on'}
					invalidText={error && translate(error, field.validationErrorMsgOptions)}
					invalid={error ? true : false}
					labelText={translate(field.label || field.name, field.labelOptions)}
					hideLabel={true}
					onFocus={field.onFocus}
				/>
				{field.type === 'password' && <VisibilityToggle idToToggle={this.props.id + '-' + field.name} />}
			</div>
		);
		if (field.type === 'password') {
			return <form onSubmit={e => e.preventDefault()}>{markup}</form>;
		}
		return markup;
	}

	renderTextAreaInput(field, value, translate) {
		const error = field.errorMsg || this.props.formProps[field.name].error;
		if (field.loading) {
			return (
				<SkeletonText
					style={{
						paddingTop: '.5rem',
						width: '100%',
						height: '7rem',
					}}
				/>
			);
		}
		if (field.readonly) {
			return (
				<TextArea
					id={this.props.id + '-' + field.name}
					name={field.name}
					className="bx--text__input ibm-label"
					value={value || ''}
					readOnly
					labelText={translate(field.label || field.name, field.labelOptions)}
					hideLabel={true}
				/>
			);
		}
		return (
			<TextArea
				id={this.props.id + '-' + field.name}
				name={field.name}
				className="bx--text__input ibm-label"
				value={value || ''}
				placeholder={field.placeholder ? translate(field.placeholder) : translate(field.name + '_placeholder')}
				onChange={evt => {
					const data = {};
					data[field.name] = evt.target.value;
					if (data[field.name].indexOf('\\n') > 1) {
						data[field.name] = data[field.name].replace(/\\n/g, '\n');
						evt.target.value = data[field.name];
					}
					this.props.updateState(this.props.scope, data);
					let valid = this.validateTextField(field, evt.target.value);
					if (this.props.onChange) {
						if (valid) {
							valid = this.isFormValid({
								...this.props,
								...data,
							});
						}
						this.props.onChange(data, valid, field, this.props.formProps);
					}
				}}
				invalid={error ? true : false}
				invalidText={error && translate(error, field.errorMsgOptions)}
				rows={field.rows ? field.rows : ''}
				labelText={translate(field.label || field.name, field.labelOptions)}
				hideLabel={true}
			/>
		);
	}

	// this is weird, why do we have this.... - dsh todo rework
	fixStringOptions(options) {
		const opts = [];
		if (options) {
			options.forEach(option => {
				if (typeof option === 'string') {
					opts.push({ value: option, name: option });
				} else if (option.display_name) {
					opts.push({ ...option, value: option.display_name });	// fabric component dropdown options don't set "value"...
				} else if (option.version) {
					opts.push({ ...option, value: option.version });		// fabric version dropdown options don't set "value"...
				} else {
					opts.push(option);
				}
			});
		}
		return opts;
	}

	// this function will return the selected dropdown option object (or string if applicable).
	// this is weird, why do we have this mess.... - dsh todo rework
	// some dropdowns have options that are an array of strings, others are an array of objects like:
	// 		{name: <field name>, value: <value>}
	// there are also options that seem to have custom objects, that have a "name" field....
	fixSelectedItem(data, options) {
		if (data) {
			const value = (typeof data === 'string') ? data : data.value;
			for (let i in options) {
				if (typeof options[i] === 'string') {
					if (options[i] === value) {
						return options[i];
					}
				} else {
					if (value !== undefined) {
						if (options[i] && options[i].value === value) {
							return options[i];
						}
					} else {			// if there is no "value" field... look for name
						if (data && data.name && options[i] && options[i].name === data.name) {
							return options[i];
						}
					}
				}
			}
		}
		return null;
	}

	fixChangedItem(options, item) {
		let ret = item;
		if (options) {
			options.forEach(option => {
				if (typeof option === 'string' && item.name === option) {
					ret = option;
				}
			});
		}
		return ret;
	}

	renderDropDown(field, value, translate) {
		const fixed_options = this.fixStringOptions(field.options);
		const fixed_value = this.fixSelectedItem(value, fixed_options);
		// set initial value to state
		const formProps = this.props.formProps && this.props.formProps[field.name] ? this.props.formProps[field.name] : {};
		// const data = {};
		// data[field.name] = this.fixChangedItem(field.options, fixed_value);
		// this.props.updateState(this.props.scope, data);
		const error = field.errorMsg || formProps.error;
		return (
			<div id={this.props.id + '-' + field.name}>
				{field.loading ? (
					<DropdownSkeleton />
				) : (
					<div
						className="ibp-drop-down-container"
						onMouseOver={evt => {
							let target = evt.target;
							if (target.className === 'bx--list-box__label') {
								if (value && value.tooltip) {
									target.title = value.tooltip;
								} else {
									if (target.scrollWidth > target.offsetWidth) {
										target.title = target.textContent;
									}
								}
							}
							if (target.className === 'bx--list-box__menu-item__option') {
								let id = target.parentNode.id;
								if (id) {
									while (id.indexOf('-') > -1) {
										id = id.substring(id.indexOf('-') + 1);
									}
									const index = Number(id);
									if (!isNaN(id)) {
										const item = fixed_options[index];
										if (item.tooltip) {
											target.parentNode.title = item.tooltip;
										}
									}
								}
							}
						}}
					>
						<Dropdown
							label={field.name}
							id={field.name}
							name={field.name}
							ariaLabel={translate(field.label || field.name, field.labelOptions)}
							items={fixed_options}
							selectedItem={fixed_value ? fixed_value : field.default}
							disabled={field.disabled}
							invalid={error ? true : false}
							invalidText={error && translate(error, field.errorMsgOptions)}
							itemToString={item => {
								if (item) {
									if (item.display_name) {
										if (field.translateOptions) {
											return translate(item.display_name);
										}
										return item.display_name;
									}
									if (item.name) {
										if (field.translateOptions) {
											return translate(item.name);
										}
										return item.name;
									}
									if (_.isString(item)) {
										return translate(item);
									}
									if (item.version) {
										return item.version;
									}
								}
								return '';
							}}
							onChange={item => {
								const data = {};
								data[field.name] = this.fixChangedItem(field.options, item.selectedItem);
								this.props.updateState(this.props.scope, data);
								if (this.props.onChange) {
									const valid = this.isFormValid({
										...this.props,
										...data,
									});
									this.props.onChange(data, valid, field, this.props.formProps);
								}
							}}
						/>
						{field.inlineLoading && <InlineLoading className="ibp-inline-loading-icon" />}
					</div>
				)}
			</div>
		);
	}

	renderRadioButtons(field, value, translate) {
		if (!value) {
			value = field.options[0].id;
		}
		return (
			<div
				id={this.props.id + '-' + field.name}
				role="radiogroup"
				aria-label={translate(field.label || field.name, field.labelOptions)}
				className={field.horizontal ? 'ibp-horizontal-radio' : 'ibp-vertical-radio'}
			>
				{field.options.map(opt => {
					return (
						<RadioButton
							key={opt.id || opt}
							id={opt.id || opt}
							labelText={opt.label || opt.id || opt}
							name={field.name}
							checked={value === (opt.id || opt)}
							onChange={() => {
								const data = {};
								data[field.name] = opt.id || opt;
								this.props.updateState(this.props.scope, data);
								if (this.props.onChange) {
									const valid = this.isFormValid({
										...this.props,
										...data,
									});
									this.props.onChange(data, valid, field, this.props.formProps);
								}
							}}
							disabled={field.disabled}
						/>
					);
				})}
			</div>
		);
	}

	validateNameValuePairInput(field, data, pair) {
		let valid = Helper.validateCharacters(pair.name);
		let error = null;
		if (valid) {
			valid = Helper.validateCharacters(pair.value);
			if (valid) {
				valid = this.isFormValid({
					...this.props,
					...data,
				});
			} else {
				error = 'input_error_invalid_char';
			}
		} else {
			error = 'input_error_invalid_char';
		}
		const pairData = { ...this.props.formProps[field.name] };
		pairData[pair.key] = { error };
		this.updateFormProp(field, {
			...this.props.formProps[field.name],
			pairData,
		});
		if (this.props.onChange) {
			this.props.onChange(data, valid, field, this.props.formProps);
		}
	}

	renderNameValuePair(field, index, value, translate) {
		let pair = value[index];
		if (field.readonly) {
			return (
				<div className="ibp-name-value-pair"
					key={pair.key}
				>
					<TextInput
						className="ibp-name-value-name"
						defaultValue={pair.name}
						readOnly={true}
						aria-label={`${translate(field.label || field.name)} ${translate('label_name')}`}
					/>
					<span>=</span>
					<TextInput
						className="ibp-name-value-value"
						defaultValue={pair.value}
						readOnly={true}
						aria-label={`${translate(field.label || field.name)} ${translate('label_value')}`}
					/>
				</div>
			);
		}
		const id = field.name + '-' + pair.key;
		return (
			<div id={id}
				className={this.props.formProps[field.name][pair.key] && this.props.formProps[field.name][pair.key].error ? 'input_error' : ''}
			>
				<div className="ibp-name-value-pair"
					key={pair.key}
				>
					<TextInput
						className="ibp-name-value-name"
						defaultValue={pair.name}
						placeholder={translate(field.attribute_placeholder || 'attribute_name_placeholder')}
						aria-label={`${translate(field.label || field.name)} ${translate('label_name')}`}
						onChange={evt => {
							pair.name = evt.target.value;
							const data = {};
							data[field.name] = [...value];
							this.props.updateState(this.props.scope, data);
							this.validateNameValuePairInput(field, data, pair);
						}}
					/>
					<span>=</span>
					<TextInput
						className="ibp-name-value-value"
						defaultValue={pair.value}
						placeholder={translate(field.value_placeholder || 'attribute_value_placeholder')}
						aria-label={`${translate(field.label || field.name)} ${translate('label_value')}`}
						onChange={evt => {
							pair.value = evt.target.value;
							const data = {};
							data[field.name] = [...value];
							this.props.updateState(this.props.scope, data);
							this.validateNameValuePairInput(field, data, pair);
						}}
					/>
					{field.type !== 'namevaluepair' && (
						<div
							id={'name-value-delete-button-' + index}
							className="ibp-name-value-delete"
							title={translate('remove')}
							onClick={() => {
								value.splice(index, 1);
								const data = {};
								data[field.name] = [...value];
								this.props.updateState(this.props.scope, data);
							}}
						>
							<SVGs type="trash" />
						</div>
					)}
				</div>
				{this.props.formProps[field.name][pair.key] && this.props.formProps[field.name][pair.key].error && (
					<div className="ibp-text-input-error">
						<p>{translate(this.props.formProps[field.name][pair.key].error)}</p>
					</div>
				)}
			</div>
		);
	}

	renderNameValuePairs(field, value, translate) {
		let index = 0;
		if (field.type === 'namevaluepair' && !(value && value.length)) {
			value = [
				{
					key: 'key_' + new Date().getTime(),
					name: '',
					value: '',
				},
			];
		}
		return (
			<div className="ibp-name-value-list">
				{value.map(pair => {
					return this.renderNameValuePair(field, index++, value, translate);
				})}
				{!field.readonly && field.type !== 'namevaluepair' && (
					<Button
						id={this.props.id + '-add-' + field.name}
						className="ibp-name-value-add"
						kind="primary"
						title={translate('add')}
						onClick={() => {
							const newValue = [
								...value,
								{
									key: 'key_' + new Date().getTime(),
									name: '',
									value: '',
								},
							];
							const data = {};
							data[field.name] = newValue;
							this.props.updateState(this.props.scope, data);
						}}
					>
						{translate(field.addText || 'add')}
						<PlusIcon className="ibp-name-value-add-button-img"
							role="presentation"
							alt=""
						/>
					</Button>
				)}
			</div>
		);
	}

	findOption(option, selected) {
		let index = -1;
		const id = option.id || option;
		for (let i = 0; i < selected.length && index === -1; i++) {
			const test = selected[i].id || selected[i];
			if (id === test) {
				index = i;
			}
		}
		return index;
	}

	onMultiSelectChange = (field, option) => {
		const selected = this.props[field.name] || [];
		const index = this.findOption(option, selected);
		if (index < 0) {
			selected.push(option);
		} else {
			selected.splice(index, 1);
		}
		const data = {};
		data[field.name] = selected;
		this.props.updateState(this.props.scope, data);
		if (this.props.onChange) {
			const valid = this.isFormValid({
				...this.props,
				...data,
			});
			this.props.onChange(data, valid, field, this.props.formProps);
		}
	};

	onMultiSelect2Change = (field, selected) => {
		const data = {};
		data[field.name] = selected;
		this.props.updateState(this.props.scope, data);
		if (this.props.onChange) {
			const valid = this.isFormValid({
				...this.props,
				...data,
			});
			this.props.onChange(data, valid, field, this.props.formProps);
		}
	};

	isOptionSelected(option, value) {
		const id = option.id || option;
		if (value) {
			for (let i = 0; i < value.length; i++) {
				const test = value[i].id || value[i];
				if (id === test) {
					return true;
				}
			}
		}
		return false;
	}

	renderMultiSelect(field, value, translate) {
		return (
			<div className="ibp-multi-select"
				role="group"
				aria-label={translate(field.label || field.name)}
			>
				{field.loading ? (
					<DropdownSkeleton />
				) : (
					field.options.map(option => {
						const optionId = option.id || option;
						const optionValue = option.display_name || option.name;
						const disabled = field.disabledIds && field.disabledIds.length > 0 && field.disabledIds.includes(optionId);
						return (
							<SelectableTile
								key={optionId}
								id={this.props.id + '-' + optionId}
								name={optionValue}
								className={`ibp-multi-select-item ${disabled ? 'ibp-multi-select-item-disabled' : ''}`}
								handleClick={() => {
									this.onMultiSelectChange(field, option);
								}}
								handleKeyDown={evt => {
									if (evt.which === null) {
										this.onMultiSelectChange(field, option);
									}
								}}
								selected={this.isOptionSelected(option, value)}
								ref={selectableTileComponent => {
									if (selectableTileComponent && disabled) {
										selectableTileComponent.handleKeyDown = function () { };
									}
								}}
							>
								{disabled && field.disabledTooltip && !field.readonly ? (
									<BlockchainTooltip noIcon
										triggerText={<span>{option.display_name || option.name || option.id || translate(option)}</span>}
									>
										{translate(field.disabledTooltip)}
									</BlockchainTooltip>
								) : (
									<>{option.display_name || option.name || option.id || translate(option)}</>
								)}
							</SelectableTile>
						);
					})
				)}
			</div>
		);
	}

	renderMultiSelect2(field, value, translate) {
		if (!value) {
			value = [];
		}
		const formProps = this.props.formProps && this.props.formProps[field.name] ? this.props.formProps[field.name] : {};
		const error = field.errorMsg || formProps.error;
		return (
			<div className="ibp-multi-select-2">
				{field.loading ? (
					<DropdownSkeleton />
				) : (
					<MultiSelect
						id={this.props.id + '-' + field.name}
						items={field.options}
						itemToString={option => {
							return ' ' + (option.display_name || option.name || option.id || option);
						}}
						selectionFeedback="fixed"
						label={field.placeholder ? translate(field.placeholder) : translate(field.name + '_placeholder')}
						titleText={`${translate(field.label || field.name, field.labelOptions)} ${field.required ? ' *' : ''}`}
						direction="bottom"
						onChange={event => {
							const selected = event.selectedItems;
							this.onMultiSelect2Change(field, selected);
						}}
						initialSelectedItems={value}
						invalid={error ? true : false}
						invalidText={error && translate(error, field.errorMsgOptions)}
						disabled={field.disabled}
					/>
				)}
			</div>
		);
	}

	renderHostnamesInput(field, value, translate) {
		const id = this.props.id + '-' + field.name;
		return (
			<div id={id}>
				<GenericChips
					id={`${id}-chips`}
					placeholder={field.placeholder ? translate(field.placeholder) : translate(field.name + '_placeholder')}
					value={value}
					handleBeforeAddChip={chipText => {
						return true;
					}}
					handleAddChip={(...addedChips) => {
						const oldChips = this.props[field.name] || [];
						const data = {};
						data[field.name] = [...oldChips, ...addedChips];
						this.props.updateState(this.props.scope, data);
						if (this.props.onChange) {
							let valid = true;
							let cn = '';
							data[field.name].forEach(chip => {
								if (!Helper.validateCharacters(chip)) {
									valid = false;
									cn = 'input_error invalid_char';
								}
							});
							document.getElementById(id).className = cn;
							if (valid) {
								valid = this.isFormValid({
									...this.props,
									...data,
								});
							}
							this.props.onChange(data, valid, field, this.props.formProps);
						}
					}}
					handleDeleteChip={deletedChip => {
						const oldChips = this.props[field.name] || [];
						const data = {};
						data[field.name] = oldChips.filter(c => c !== deletedChip);
						this.props.updateState(this.props.scope, data);
						if (this.props.onChange) {
							let valid = true;
							let cn = '';
							data[field.name].forEach(chip => {
								if (!Helper.validateCharacters(chip)) {
									valid = false;
									cn = 'input_error invalid_char';
								}
							});
							document.getElementById(id).className = cn;
							if (valid) {
								valid = this.isFormValid({
									...this.props,
									...data,
								});
							}
							this.props.onChange(data, valid, field, this.props.formProps);
						}
					}}
				/>
				<div className="ibp-text-input-error">
					<div className="ibp-invalid-char">{translate('input_error_invalid_char')}</div>
				</div>
			</div>
		);
	}

	renderComponent(field, value, translate) {
		return (
			<div id={field}>
				{value}
			</div>
		);
	}

	validatePEMField(field, value, checkOnly) {
		let error = null;
		let valid = true;
		if (field.required && !value) {
			valid = false;
		} else if (Helper.checkSpecialRules(value, field.specialRules)) {
			valid = false;
			error = 'input_error_' + Helper.checkSpecialRules(value, field.specialRules);
		} else if (!Helper.validateCharacters(value)) {
			valid = false;
			error = 'input_error_invalid_char';
		} else if (field.validate) {
			if (!field.validate(value)) {
				valid = false;
				error = field.errorMsg ? field.errorMsg : 'input_error_invalid';
			}
		}
		if (!checkOnly) {
			this.updateFormProp(field, {
				...this.props.formProps[field.name],
				error,
			});
		}
		return valid;
	}

	validateJsonFileField(field, value, checkOnly) {
		let error = null;
		let valid = true;
		if (field.required && !value) {
			valid = false;
		} else if (field.validate) {
			if (!field.validate(value)) {
				valid = false;
				error = field.errorMsg ? field.errorMsg : 'input_error_invalid';
			}
		}
		if (!checkOnly) {
			this.updateFormProp(field, {
				...this.props.formProps[field.name],
				error,
			});
		}
		return valid;
	}

	renderFileDelete(field, translate, overrideOnChange) {
		const onChange = overrideOnChange || this.props.onChange;
		return (
			<button
				id={this.props.id + '-' + field.name + '-delete'}
				className="ibp-pem-delete"
				title={translate(`remove_${field.type}`)}
				onClick={() => {
					const data = {};
					data[field.name] = '';
					this.props.updateState(this.props.scope, data);
					this.updateFormProp(field, {});
					let valid = this.validatePEMField(field, '');
					if (onChange) {
						if (valid) {
							valid = this.isFormValid({
								...this.props,
								...data,
							});
						}
						onChange(data, valid, field, this.props.formProps);
					}
				}}
				disabled={field.disabled}
			>
				<SVGs type="trash"
					width="20px"
					height="20px"
				/>
			</button>
		);
	}

	renderPemExport(field, value, translate) {
		return (
			<button
				id={this.props.id + '-' + field.name + '-export'}
				className="ibp-pem-export"
				title={translate(field.type === 'private_key' ? 'export_private_key_as_pem' : 'export_cert_as_pem')}
				onClick={() => {
					Helper.exportPem(field.type, value);
				}}
			>
				<SVGs type="download"
					width="20px"
					height="20px"
					title={translate(field.type === 'private_key' ? 'export_private_key_as_pem' : 'export_cert_as_pem')}
				/>
			</button>
		);
	}

	renderPEMInput(field, value, translate, overrideOnChange) {
		const onChange = overrideOnChange || this.props.onChange;
		const formProps = this.props.formProps && this.props.formProps[field.name] ? this.props.formProps[field.name] : {};
		const error = field.errorMsg || formProps.error;
		if (formProps.file) {
			return (
				<div className="ibp-pem-file">
					<div className="ibp-pem-value">
						<TextInput
							id={this.props.id + '-' + field.name}
							name={field.name}
							type="text"
							className="bx--text__input ibm-label"
							value={this.props.formProps[field.name].file.name}
							readOnly={field.readonly}
							aria-label={translate(field.label || field.name, field.labelOptions)}
							invalid={error ? true : false}
							invalidText={error && translate(error, field.errorMsgOptions)}
						/>
						{!field.readonly && this.renderFileDelete(field, translate, onChange)}
					</div>
				</div>
			);
		}
		if (value && _.isString(value)) {
			return (
				<div>
					<div className="ibp-pem-value">
						<TextInput
							id={this.props.id + '-' + field.name}
							name={field.name}
							type="text"
							className="bx--text__input ibm-label"
							value={value}
							readOnly={true}
							aria-label={translate(field.label || field.name, field.labelOptions)}
							disabled={field.disabled}
						/>
						{!field.readonly && this.renderFileDelete(field, translate, onChange)}
						{field.export && this.renderPemExport(field, value, translate)}
					</div>
				</div>
			);
		}
		return (
			<div className="ibp-pem-input">
				<FileUploader
					className="ibp-pem-file-uploader"
					labelTitle={field.type && translate(field.type)}
					labelDescription={field.tooltip && translate(field.tooltip)}
					buttonLabel={translate(`add_${field.type}`)}
					name="file"
					multiple={false}
					onChange={event => {
						const file = event.target.files[0];
						this.updateFormProp(field, { file });
						Helper.readLocalTextFile(file, MAX_PEM_SIZE)
							.then(text => {
								let pem = Helper.cleanUpCertificateFormat(text);
								if (/^-----BEGIN/m.exec(pem)) {
									pem = btoa(pem);
								}
								const data = {};
								data[field.name] = pem;
								this.props.updateState(this.props.scope, data);
								let valid = this.validatePEMField(field, pem);
								if (onChange) {
									if (valid) {
										valid = this.isFormValid({
											...this.props,
											...data,
										});
									}
									onChange(data, valid, field, this.props.formProps);
								}
							})
							.catch(error => {
								const data = {};
								data[field.name] = '';
								this.props.updateState(this.props.scope, data);
								let valid = this.validatePEMField(field, '');
								if (onChange) {
									if (valid) {
										valid = this.isFormValid({
											...this.props,
											...data,
										});
									}
									onChange(data, valid, field, this.props.formProps);
								}
								let errorMsg = 'input_error_file_reader';
								if (error === 'file_too_big') {
									errorMsg = 'input_error_file_too_big';
								}
								this.updateFormProp(field, {
									file,
									error: errorMsg,
								});
							});
					}}
					id={this.props.id + '-' + field.name}
				/>
			</div>
		);
	}

	renderJsonFileInput(field, value, translate) {
		const error = field.errorMsg || this.props.formProps[field.name].error;
		if (this.props.formProps[field.name] && this.props.formProps[field.name].file) {
			return (
				<div className="ibp-pem-file">
					<div className="ibp-pem-value">
						<input
							id={this.props.id + '-' + field.name}
							name={field.name}
							type="text"
							className="bx--text__input ibm-label bx--text-input"
							value={this.props.formProps[field.name].file.name}
							readOnly={field.readonly}
							aria-label={translate(field.label || field.name, field.labelOptions)}
						/>
						{!field.readonly && this.renderFileDelete(field, translate)}
					</div>
					{error && (
						<div className="ibp-pem-error">
							<p>{translate(error, field.errorMsgOptions)}</p>
						</div>
					)}
				</div>
			);
		}
		if (value) {
			return (
				<div className="ibp-pem-value">
					<input
						id={this.props.id + '-' + field.name}
						name={field.name}
						type="text"
						className="bx--text__input ibm-label"
						value={value}
						readOnly={true}
						aria-label={translate(field.label || field.name, field.labelOptions)}
					/>
					{!field.readonly && this.renderFileDelete(field, translate)}
				</div>
			);
		}
		return (
			<div className="ibp-pem-input">
				<FileUploader
					className="ibp-pem-file-uploader"
					labelTitle=""
					labelDescription=""
					buttonLabel={translate('add_file')}
					name="file"
					multiple={false}
					disabled={field.disabled}
					onChange={event => {
						const file = event.target.files[0];
						this.updateFormProp(field, { file });
						Helper.readLocalJsonFile(file, MAX_PEM_SIZE).then(resp => {
							if (resp.error) {
								const data = {};
								data[field.name] = null;
								this.props.updateState(this.props.scope, data);
								if (this.props.onChange) {
									let valid = this.isFormValid({
										...this.props,
										...data,
									});
									this.props.onChange(data, valid, field, this.props.formProps);
								}
								let errorMsg = 'input_error_file_reader';
								if (resp.error === 'file_too_big') {
									errorMsg = 'input_error_file_too_big';
								}
								this.updateFormProp(field, {
									file,
									error: errorMsg,
								});
							} else {
								const data = {};
								data[field.name] = resp.json;
								this.props.updateState(this.props.scope, data);
								let valid = this.validateJsonFileField(field, resp.json);
								if (this.props.onChange) {
									if (valid) {
										valid = this.isFormValid({
											...this.props,
											...data,
										});
									}
									this.props.onChange(data, valid, field, this.props.formProps);
								}
							}
						});
					}}
					id={this.props.id + '-' + field.name}
				/>
			</div>
		);
	}

	renderSlider(field, value, translate) {
		const min = field.min === undefined ? 0 : field.min;
		const max = field.max === undefined ? Number.MAX_SAFE_INTEGER : field.max;
		if (!value) {
			value = min;
		}
		if (field.loading) {
			return <DropdownSkeleton />;
		}
		return (
			<div className="ibp-form-slider">
				<BlockchainSlider
					id={this.props.id + '-' + field.name}
					value={value}
					min={min}
					max={max}
					step={field.step}
					minLabel={field.unit}
					maxLabel={field.unit}
					ariaLabelInput={translate(field.label || field.name, field.labelOptions)}
					labelText={translate(field.label || field.name, field.labelOptions)}
					onChange={change => {
						const data = {};
						data[field.name] = change.value;
						this.props.updateState(this.props.scope, data);
						if (this.props.onChange) {
							const valid = this.isFormValid({
								...this.props,
								...data,
							});
							this.props.onChange(data, valid, field, this.props.formProps);
						}
					}}
					formatLabel={(value, unit) => {
						return Helper.formatNumber(value) + (unit ? unit : '');
					}}
				/>
			</div>
		);
	}

	updatePemList(field, subfields, data, formProps) {
		const list = [];
		const filenames = [];
		subfields.forEach(sub => {
			let value = data[sub] || this.props[sub];
			if (value) {
				list.push(value);
				filenames.push(_.get(formProps[sub], 'file.name'));
			} else {
				value = this.props.formProps[sub];
				if (value && _.isString(value)) {
					list.push(value);
				}
			}
		});
		this.updateFormProp(field, {
			file: {
				name: filenames,
			},
			subfields,
		});
		return list;
	}

	getSubfieldValue(sub) {
		let value = this.props[sub] || this.props.formProps[sub];
		return value;
	}

	renderPEMList(field, value, translate) {
		const formProps = this.props.formProps[field.name];
		const subfields = formProps && formProps.subfields ? formProps.subfields : [];
		return (
			<div>
				{subfields.map(sub => {
					return (
						<div key={sub}>
							{this.renderPEMInput(
								{
									name: sub,
									label: field.label,
									labelOptions: field.labelOptions,
									validate: field.validate,
									type: 'certificate',
									readonly: field.readonly,
								},
								this.props[sub] || this.props.formProps[sub],
								translate,
								(newData, valid, updatedField, formProps) => {
									// on change override
									const key = Object.keys(newData)[0];
									const newValue = newData[key];
									const subProps = this.props.formProps[sub];
									let data = {};
									if (newValue || subProps.file) {
										data[field.name] = this.updatePemList(field, subfields, newData, formProps);
										this.props.updateState(this.props.scope, data);
										if (this.props.onChange) {
											const valid = this.isFormValid({
												...this.props,
												...newData,
												...data,
											});
											this.props.onChange(data, valid, field, formProps);
										}
										subfields.push(field.name + '_' + new Date().getTime());
										this.updateFormProp(field, {
											...this.props.formProps[field.name],
											subfields,
										});
									} else {
										// pem removed
										const index = subfields.indexOf(key);
										subfields.splice(index, 1);
										if (subfields.length < 1 && !field.readonly) {
											subfields.push(field.name + '_' + new Date().getTime());
										}
										this.updateFormProp(field, {
											...this.props.formProps[field.name],
											subfields,
										});
										data[field.name] = this.updatePemList(field, subfields, {}, formProps);
										data[key] = null;
										this.props.updateState(this.props.scope, data);
										if (this.props.onChange) {
											const valid = this.isFormValid({
												...this.props,
												...data,
											});
											this.props.onChange(data, valid, field, formProps);
										}
									}
								}
							)}
						</div>
					);
				})}
			</div>
		);
	}

	renderFieldInput(field, translate) {
		let value = this.props[field.name];
		if (value === undefined || value === null) {
			value = this.getDefaultValue(field);
		}
		switch (field.type) {
			case 'dropdown':
				return this.renderDropDown(field, value, translate);
			case 'radio':
				return this.renderRadioButtons(field, value, translate);
			case 'namevaluepair':
			case 'namevaluepairs':
				return this.renderNameValuePairs(field, value, translate);
			case 'certificates':
				return this.renderPEMList(field, value, translate);
			case 'certificate':
			case 'private_key':
				return this.renderPEMInput(field, value, translate);
			case 'json_file':
				return this.renderJsonFileInput(field, value, translate);
			case 'textarea':
				return this.renderTextAreaInput(field, value, translate);
			case 'multiselect':
				return this.renderMultiSelect(field, value, translate);
			case 'multiselect2':
				return this.renderMultiSelect2(field, value, translate);
			case 'chips':
				return this.renderHostnamesInput(field, value, translate);
			case 'slider':
				return this.renderSlider(field, value, translate);
			case 'component':
				return this.renderComponent(field, value, translate);
			default:
				return this.renderTextInput(field, value, translate);
		}
	}

	getFieldClassName(field) {
		let className = 'ibp-form-field';
		if (field.skipLabel) {
			className = className + ' ibp-no-label';
		}
		if (this.props.formProps[field.name] && this.props.formProps[field.name].error) {
			className = className + ' input_error';
		}
		if (field.errorMsg) {
			className = className + ' input_error';
		}
		if (field.disabled) {
			className = className + ' ibp-form-field-disabled';
		}
		return className;
	}

	render() {
		const translate = (value) => {
			if(typeof value === 'string') {
				return this.props.t(value);
			} else {
				return value;
			}
		};
		try {
			return (
				<div className={(this.props.className ? this.props.className + ' ' : '') + 'ibp-form'}
					id={this.props.id}
				>
					{this.props.fields.map(field => {
						if (field.hidden) {
							return <div key={field.name} />;
						}
						let noLabelFor = false;
						switch (field.type) {
							case 'chips':
								break;
							default:
								noLabelFor = true;
								break;
						}
						let label = translate(field.label || field.name, field.labelOptions);
						if (field.required) {
							label = label + ' *';
						}
						if (field.type === 'multiselect2') {
							field.hideLabel = true;
						}
						return (
							<div className={this.getFieldClassName(field)}
								key={field.name}
							>
								{field.description && (
									<div className="ibp-form-description">
										<p>
											<TranslateLink text={field.description} />
										</p>
									</div>
								)}
								{!field.hideLabel && (
									<label
										htmlFor={noLabelFor ? undefined : this.props.id + '-' + field.name}
										className={field.disabled ? 'ibp-form-label-disabled' : 'ibp-form-label'}
									>
										{field.tooltip ? (
											<BlockchainTooltip direction={field.tooltipDirection}
												type="definition"
												tooltipText={<Trans>{translate(field.tooltip, field.tooltipOptions)}</Trans>}
											>
												{label}
											</BlockchainTooltip>
										) : (
											label
										)}
									</label>
								)}
								<div className="ibp-form-input">{this.renderFieldInput(field, translate)}</div>
							</div>
						);
					})}
				</div>
			);
		} catch (err) {
			console.log('err=', err);
		}
	}
}

Form.propTypes = {
	id: PropTypes.string,
	updateState: PropTypes.func,
	scope: PropTypes.string,
	fields: PropTypes.array,
	onChange: PropTypes.func,
	formProps: PropTypes.object,
	className: PropTypes.string,
	hideLabel: PropTypes.bool,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	(state, props) => {
		const res = {};
		if (state[props.scope]) {
			props.fields.forEach(field => {
				if (state[props.scope][field.name] !== undefined) {
					res[field.name] = state[props.scope][field.name];
				}
			});
		}
		if (state.form && state.form[props.id]) {
			res.formProps = state.form[props.id];
		} else {
			res.formProps = {};
		}
		props.fields.forEach(field => {
			if (!res.formProps[field.name]) {
				res.formProps[field.name] = {};
			}
			if (res.formProps[field.name].subfields) {
				res.formProps[field.name].subfields.forEach(sub => {
					if (state[props.scope][sub] !== undefined) {
						res[sub] = state[props.scope][sub];
					}
					if (!res.formProps[sub]) {
						res.formProps[sub] = {};
					}
				});
			}
		});
		return res;
	},
	{
		updateState,
	}
)(withTranslation()(Form));
