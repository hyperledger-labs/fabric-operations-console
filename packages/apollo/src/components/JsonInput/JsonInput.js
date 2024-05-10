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
import { ContentSwitcher, Switch, TextInput } from 'carbon-components-react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import Helper from '../../utils/helper';
import BlockchainTooltip from '../BlockchainTooltip/BlockchainTooltip';
import FileUploader from '../FileUploader/FileUploader';
import Form from '../Form/Form';
import ImportantBox from '../ImportantBox/ImportantBox';
import SVGs from '../Svgs/Svgs';
import { WarningFilled20 } from '@carbon/icons-react/es';

const SCOPE = 'jsonInput';

export class JsonInput extends React.Component {
	constructor(props) {
		super(props);
		this.fileUploader = React.createRef();
		this.nextKey = 1;
	}

	updateJsonInputState(manualEntry, data) {
		const state = {};
		state[this.props.id] = {
			data,
			manualEntry,
		};
		this.props.updateState(SCOPE, state);
	}

	componentDidMount() {
		this.clearData(true);
	}

	componentWillUnmount() {
		const state = {};
		state[this.props.id] = null;
		this.props.updateState(SCOPE, state);
		const formState = {};
		this.props.definition.forEach(field => {
			formState[field.name] = null;
		});
		this.props.updateState(SCOPE + '-' + this.props.id, formState);
	}

	clearData(manualEntry) {
		const data = [];
		this.updateJsonInputState(manualEntry, data);
		if (this.props.onChange) {
			this.props.onChange(data, false);
		}
	}

	checkForAlias(json) {
		if (_.isArray(json)) {
			json.forEach(entry => {
				this.checkForAlias(entry);
			});
		} else {
			this.props.definition.forEach(field => {
				if (field.alias) {
					const list = _.isArray(field.alias) ? field.alias : [field.alias];
					list.forEach(alias => {
						if (!json[field.name] && json[alias]) {
							json[field.name] = json[alias];
							delete json[alias];
						}
					});
				}
			});
		}
	}

	cleanUpCertificates(json) {
		if (_.isArray(json)) {
			json.forEach(entry => {
				this.cleanUpCertificates(entry);
			});
		} else {
			this.props.definition.forEach(field => {
				if (field.type === 'certificate' || field.type === 'private_key') {
					json[field.name] = Helper.cleanUpCertificateFormat(json[field.name]);
				}
			});
		}
	}

	checkDefinition(json) {
		// todo why can't we just pass this component a validation function?  What if I need something this definition format doesn't provide, like alternative sets of params?
		// whoever wrote ^^, i agree! this flow bites
		const check = {
			key: json.key ? json.key : 'key_' + this.nextKey++,
			error: null,
		};
		this.props.definition.forEach(field => {
			check[field.name] = json[field.name];
			if (check.error === null) {
				if (field.required && !check[field.name]) {
					check.error = {
						message: 'error_required_field',
						opts: { field: field.name },
					};
				} else {
					if (check[field.name]) {
						switch (field.type) {
							case 'certificate':
								if (!Helper.isCertificate(check[field.name])) {
									check.error = {
										message: 'error_certificate',
										opts: { field: field.name },
									};
								}
								break;
							case 'private_key':
								if (!Helper.isPrivateKey(check[field.name])) {
									check.error = {
										message: 'error_private_key',
										opts: { field: field.name },
									};
								}
								break;
							case 'email':
								if (!Helper.isEmail(check[field.name])) {
									check.error = {
										message: 'error_email',
										opts: { field: field.name },
									};
								}
								break;
							case 'url':
								if (!Helper.isURL(check[field.name])) {
									check.error = {
										message: 'error_url',
										opts: { field: field.name },
									};
								}
								break;
							default:
								break;
						}
						if (check.error === null) {
							// check for special rules
							const err = Helper.checkSpecialRules(check[field.name], field.specialRules);
							if (err) {
								check.error = {
									message: 'json_' + err,
									opts: { field: field.name },
								};
							}
						}
						if (check.error === null) {
							// check for invalid characters
							let illegal = false;
							let list;
							let pairs;
							switch (field.type) {
								case 'namevaluepair':
								case 'namevaluepairs':
									pairs = check[field.name];
									pairs.forEach(pair => {
										if (!Helper.validateCharacters(pair.name)) {
											illegal = true;
										}
										if (!Helper.validateCharacters(pair.value)) {
											illegal = true;
										}
									});
									break;
								case 'multiselect':
								case 'chips':
									list = check[field.name];
									list.forEach(item => {
										if (!Helper.validateCharacters(item)) {
											illegal = true;
										}
									});
									break;
								default:
									if (!Helper.validateCharacters(check[field.name])) {
										illegal = true;
									}
									break;
							}
							if (illegal) {
								check.error = {
									message: 'error_invalid_json_char',
									opts: { field: field.name },
								};
							}
						}
						if (check.error === null) {
							if (field.validate) {
								if (!field.validate(check[field.name])) {
									check.error = {
										message: 'error_invalid_field_value',
										opts: { field: field.name },
									};
								}
							}
						}
					}
				}
			}
		});
		return check;
	}

	// when used with the JsonInput component, this will parse the json file and set "this.props.data" to only
	// have fields defined in the <JsonInput>'s "definition" field
	onFileUpload = event => {
		const all = [];
		for (let i = 0; i < event.target.files.length; i++) {
			all.push(Helper.readLocalJsonFile(event.target.files[i]));
		}
		Promise.all(all).then(results => {
			const data = [...this.props.data];
			results.forEach(result => {
				if (result.error) {
					data.push({
						name: result.file.name,
						readError: {
							message: result.error === 'file_too_big' ? 'input_error_file_too_big' : 'error_json_file',
							opts: {},
						},
					});
				} else {
					this.checkForAlias(result.json);
					this.cleanUpCertificates(result.json);
					if (Array.isArray(result.json)) {
						const raft = {};
						result.json.forEach(entry => {
							if (entry.cluster_id) {
								// this only returns fields from "entry" that are defined in the react component's "definition" variable
								const check = this.checkDefinition(entry);
								if (raft[entry.cluster_id]) {
									raft[entry.cluster_id].raft.push(entry);
									if (check.error && !raft[entry.cluster_id].error) {
										raft[entry.cluster_id].error = check.error;
									}
								} else {
									raft[entry.cluster_id] = {
										...check,
										name: entry.cluster_name || check.name,
										raft: [entry],
									};
									data.push(raft[entry.cluster_id]);
								}
							} else {
								// this only returns fields from "entry" that are defined in the react component's "definition" variable
								data.push(this.checkDefinition(entry));
							}
						});
					} else {
						/// this only returns fields from "entry" that are defined in the react component's "definition" variable
						data.push(this.checkDefinition(result.json));
					}
				}
			});
			this.checkData(data);
			this.updateJsonInputState(this.props.manualEntry, data);
		});
	};

	toggleManualEntry = event => {
		this.clearData(!this.props.manualEntry);
	};

	onFormChange = (change, valid) => {
		if (this.props.onChange) {
			let data = this.props.data.length ? { ...this.props.data[0] } : {};
			data.error = null;
			this.props.definition.forEach(field => {
				if (change[field.name] !== undefined) {
					data[field.name] = change[field.name];
				}
			});
			data = [data];
			this.updateJsonInputState(this.props.manualEntry, data);
			this.props.onChange(data, valid);
		}
	};

	checkData(data) {
		let valid = true;
		const names = {};
		let errorChanged = false;
		data.forEach(item => {
			if (item.readError) {
				item.error = item.readError;
				valid = false;
				return;
			}
			const check = this.checkDefinition(item);
			if (check.error) {
				if (!item.error) {
					errorChanged = true;
				} else {
					if (JSON.stringify(item.error) !== JSON.stringify(check.error)) {
						errorChanged = true;
					}
				}
				item.error = check.error;
				valid = false;
			} else {
				if (item.error) {
					errorChanged = true;
					item.error = null;
				}
				if (names[item.name]) {
					if (this.props.uniqueNames) {
						valid = false;
						item.error = {
							message: 'error_duplicate_names',
							opts: {},
						};
					}
				} else {
					names[item.name] = true;
				}
			}
		});
		if (this.props.singleInput && data.length > 1) {
			valid = false;
			for (let i = 1; i < data.length; i++) {
				if (!data[i].error) {
					data[i].error = {
						message: 'error_single_input',
						opts: {},
					};
				}
			}
		}
		if (errorChanged) {
			this.updateJsonInputState(this.props.manualEntry, [...data]);
		}
		if (this.props.onChange) {
			if (data.length === 0) {
				valid = false;
			}
			this.props.onChange(data, valid);
		}
	}

	removeData(key) {
		for (let i = 0; i < this.props.data.length; i++) {
			if (this.props.data[i].key === key) {
				this.props.data.splice(i, 1);
				i = this.props.data.length;
				this.updateJsonInputState(this.props.manualEntry, [...this.props.data]);
				this.checkData(this.props.data);
			}
		}
	}

	showErrorDetail(error, translate) {
		if (error) {
			return <div className="ibp-json-error-detail">{translate(error.message, error.opts)}</div>;
		}
	}

	renderFileUploader(translate) {
		if (this.props.singleInput && this.props.data && this.props.data.length) {
			return;
		}
		return (
			<>
				{this.props.fileUploadTooltip && (
					<div className="ibp-file-upload-title-with-tooltip">
						<BlockchainTooltip triggerText={translate('upload_json')}>{translate(this.props.fileUploadTooltip)}</BlockchainTooltip>
					</div>
				)}
				<FileUploader
					className="ibp-json-file-uploader"
					labelTitle={!this.props.fileUploadTooltip ? translate('upload_json') : ''}
					labelDescription={this.props.description ? translate(this.props.description) : ''}
					buttonLabel={this.props.singleInput ? translate('add_file') : translate('add_files')}
					accept={['.json']}
					name="file"
					multiple={!this.props.singleInput}
					onChange={this.onFileUpload}
					ref={fileUploader => (this.fileUploader = fileUploader)}
					id={this.props.id + '-upload'}
				/>
			</>
		);
	}

	render() {
		const translate = this.props.t;
		return (
			<div>
				{this.props.onlyFileUpload && this.renderJSONUpload(translate)}
				{!this.props.onlyFileUpload && (
					<div id={this.props.id}
						className="ibp-json-input-component"
					>
						<ContentSwitcher className="ibp-json-toggle"
							onChange={this.toggleManualEntry}
							selectedIndex={this.props.manualEntry ? 0 : 1}
						>
							<Switch kind="button"
								id={this.props.id + '-manual-entry'}
								name="manual"
								text={translate('manual_entry')}
							/>
							<Switch kind="button"
								id={this.props.id + '-json-upload'}
								name="json"
								text={translate('json_upload')}
							/>
						</ContentSwitcher>
						{!this.props.manualEntry && this.renderJSONUpload(translate)}
						{this.props.manualEntry && this.renderManualEntry(translate)}
					</div>
				)}
			</div>
		);
	}

	renderJSONUpload = translate => {
		return (
			<div className="ibp-json-file-container">
				{this.renderFileUploader(translate)}
				{this.props.data && this.props.data.length > 0 && (
					<div>
						{this.props.data.length > 1 && this.props.singleInput && <ImportantBox text="error_single_input_box" />}
						{this.props.data.map((item, i) => {
							return (
								<div key={item.key}
									className={!item.error ? 'ibp-json-item' : 'ibp-json-item ibp-json-error'}
								>
									<TextInput
										id={this.props.id + '-json-name-' + i}
										defaultValue={item.cluster_name || item.display_name || item.name}
										onChange={evt => {
											// Identities use `name`, while components use `display_name`, and orderer raft objects use both display_name and
											// cluster-name.  Change whichever you find.
											item.name && (item.name = evt.target.value);
											item.display_name && (item.display_name = evt.target.value);
											item.cluster_name && (item.cluster_name = evt.target.value);

											// Raft orderer clusters also have the cluster name on all the nodes, so we need to update those in addition to the
											// name on the raft object we grouped them into.
											if (item.raft && item.raft.length) {
												item.raft.forEach(item => {
													item.cluster_name && (item.cluster_name = evt.target.value);
												});
											}
											this.updateJsonInputState(this.props.manualEntry, this.props.data);
											this.checkData(this.props.data);
										}}
										aria-label={translate('name')}
										readOnly={this.props.readOnly}
									/>
									{item.error ? <WarningFilled20 className="ibp-file-uploader-error-icon" /> : null}
									{this.showErrorDetail(item.error, translate)}
									<button
										id={this.props.id + '-json-delete-' + i}
										className="ibp-json-delete"
										title={translate('remove')}
										onClick={() => {
											this.removeData(item.key);
										}}
									>
										<SVGs type="close"
											extendClass={{ 'ibp-json-delete-icon': true }}
										/>
									</button>
								</div>
							);
						})}
					</div>
				)}
			</div>
		);
	};

	renderManualEntry = translate => {
		return (
			<div className="ibp-json-form">
				<Form scope={SCOPE + '-' + this.props.id}
					id={this.props.id + '-form'}
					fields={this.props.definition}
					onChange={this.onFormChange}
				/>
			</div>
		);
	};
}

const dataProps = {
	id: PropTypes.string,
	data: PropTypes.array,
	description: PropTypes.string,
	definition: PropTypes.array,
	manualEntry: PropTypes.bool,
	uniqueNames: PropTypes.bool,
	singleInput: PropTypes.bool,
	onlyFileUpload: PropTypes.bool,
	fileUploadTooltip: PropTypes.string,
};

JsonInput.propTypes = {
	...dataProps,
	onChange: PropTypes.func,
	updateState: PropTypes.func,
	readOnly: PropTypes.bool,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	(state, props) => {
		return Helper.mapStateToProps(state[SCOPE] ? state[SCOPE][props.id] : {}, dataProps);
	},
	{
		updateState,
	}
)(withTranslation()(JsonInput));
