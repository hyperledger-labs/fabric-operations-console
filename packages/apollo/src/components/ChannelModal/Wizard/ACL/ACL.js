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

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { connect } from 'react-redux';
import Helper from '../../../../utils/helper';
import { updateState } from '../../../../redux/commonActions';
import { withTranslation } from 'react-i18next';
import TranslateLink from '../../../TranslateLink/TranslateLink';
import ImportantBox from '../../../ImportantBox/ImportantBox';
import SidePanelWarning from '../../../SidePanelWarning/SidePanelWarning';
import { Button, ContentSwitcher, Switch } from 'carbon-components-react';
import FileUploader from '../../../FileUploader/FileUploader';
import SVGs from '../../../Svgs/Svgs';
import Form from '../../../Form/Form';
import Logger from '../../../Log/Logger';

const SCOPE = 'channelModal';
const Log = new Logger(SCOPE);

// This is step "channel_acls"
//
// this panel allow selecting channel access-control-lists parameters in a channel
class ACL extends Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			manualAcl: true,
			jsonAclError: null,
		});
	}

	onAddACL = () => {
		const { selectedACLResource, selectedACLPolicy, selectedACLRole, acls, updateState } = this.props;
		let acl = {
			resource: selectedACLResource,
			definition:
				selectedACLPolicy === 'Application'
					? '/Channel/Application/' + selectedACLRole.type
					: '/Channel/Application/' + selectedACLPolicy + '/' + selectedACLRole.type,
		};
		updateState(SCOPE, {
			acls: acls ? [...acls, acl] : [acl],
		});
	};

	onDeleteACL = index => {
		Log.debug('Deleting acl: ', index);
		const { acls, aclErrors, updateState, verifyACLPolicyValidity } = this.props;
		let filteredAcls = acls.filter((c, i) => i !== index);
		updateState(SCOPE, {
			acls: filteredAcls,
		});

		if (aclErrors && aclErrors.length > 0) {
			verifyACLPolicyValidity(null, filteredAcls); // If invalid acls have been removed, hide the error message
		}
	};

	renderACLRoles = translate => {
		let ACLOptions = [
			{
				type: 'Admins',
				name: translate('Admins'),
			},
			{
				type: 'Readers',
				name: translate('Readers'),
			},
			{
				type: 'Writers',
				name: translate('Writers'),
			},
		];
		const { selectedACLRole } = this.props;
		return (
			<div className="ibp-add-acls-role">
				<Form
					scope={SCOPE}
					id={SCOPE + '-acl-role'}
					fields={[
						{
							name: 'selectedACLRole',
							default: selectedACLRole ? selectedACLRole : ACLOptions[0],
							type: 'dropdown',
							tooltip: 'acl_role_tooltip',
							options: ACLOptions,
						},
					]}
				/>
			</div>
		);
	};

	toggleManualEntry = () => {
		this.props.updateState(SCOPE, { manualAcl: !this.props.manualAcl });
	};

	onFileUpload = event => {
		const { acls, updateState } = this.props;
		Helper.readLocalJsonFile(event.target.files[0]).then(result => {
			let jsonAclError = null;
			let newAcls = [];
			if (result.error) {
				jsonAclError = result.error === 'file_too_big' ? 'input_error_file_too_big' : 'error_json_file';
			} else {
				for (let resource in result.json) {
					const definition = result.json[resource];
					if (_.isString(definition) && _.startsWith(definition, '/Channel/')) {
						newAcls.push({
							resource,
							definition,
						});
					} else {
						jsonAclError = 'input_error_invalid';
					}
				}
			}
			if (jsonAclError) {
				updateState(SCOPE, {
					jsonAclError,
				});
			} else {
				updateState(SCOPE, {
					acls: acls ? [...acls, ...newAcls] : newAcls,
					jsonAclError,
				});
			}
		});
	};

	render() {
		const { aclErrors, selectedACLResource, availableACLResources, selectedACLPolicy, availableACLPolicies, selectedACLRole, acls, t: translate } = this.props;
		return (
			<div className="ibp-channel-acls">
				<p className="ibp-channel-section-title">{translate('channel_acls')}</p>
				<TranslateLink text="channel_acl_desc"
					className="ibp-channel-section-desc-with-link"
				/>
				<ImportantBox text="acl_important_box_message" />
				<ContentSwitcher className="ibp-json-toggle"
					onChange={this.toggleManualEntry}
					selectedIndex={this.props.manualAcl ? 0 : 1}
				>
					<Switch kind="button"
						id="acl-manual-entry"
						name="manual"
						text={translate('manual_entry')}
					/>
					<Switch kind="button"
						id="acl--json-upload"
						name="json"
						text={translate('json_upload')}
					/>
				</ContentSwitcher>
				{this.props.manualAcl && (
					<div className="ibp-add-acls">
						<div className="ibp-add-acls-resource">
							<Form
								scope={SCOPE}
								id={SCOPE + '-acl-resources'}
								fields={[
									{
										name: 'selectedACLResource',
										default: selectedACLResource ? selectedACLResource : availableACLResources[0],
										type: 'dropdown',
										tooltip: 'acl_resource_tooltip',
										options: availableACLResources,
									},
								]}
							/>
						</div>
						<div className="ibp-add-acls-policy">
							<Form
								scope={SCOPE}
								id={SCOPE + '-acl-policy'}
								fields={[
									{
										name: 'selectedACLPolicy',
										default: selectedACLPolicy ? selectedACLPolicy : availableACLPolicies[0],
										type: 'dropdown',
										tooltip: 'acl_policy_tooltip',
										options: availableACLPolicies,
									},
								]}
							/>
						</div>
						{this.renderACLRoles(translate)}
						<Button
							id="btn-add-acl"
							kind="secondary"
							className="ibp-add-org"
							onClick={this.onAddACL}
							disabled={!selectedACLPolicy || !selectedACLResource || !selectedACLRole}
						>
							{translate('add')}
						</Button>
					</div>
				)}
				{!this.props.manualAcl && (
					<div className="ibp-acls-json">
						<FileUploader
							className="ibp-json-file-uploader"
							labelTitle={translate('upload_json')}
							labelDescription=""
							buttonLabel={translate('add_file')}
							accept={['.json']}
							name="file"
							multiple={false}
							onChange={this.onFileUpload}
							ref={fileUploader => (this.fileUploader = fileUploader)}
							id="alc-json-upload"
						/>
						{this.props.jsonAclError && <div className="ibp-json-error-detail">{translate(this.props.jsonAclError)}</div>}
					</div>
				)}
				{acls && acls.length > 0 && (
					<div role="grid"
						aria-label={translate('channel_acls')}
					>
						<div role="rowgroup">
							<div className="ibp-channel-table-headers"
								role="row"
								tabIndex="0"
							>
								<div className="ibp-add-acls-table-resource"
									role="gridcell"
								>
									{translate('resource')}
								</div>
								<div className="ibp-add-acls-table-definition"
									role="gridcell"
								>
									{translate('policy_definition')}
								</div>
							</div>
						</div>
						<div role="rowgroup">
							{acls.map((acl, i) => {
								return (
									<div key={'acl_' + i}
										className="ibp-add-channel-table"
										role="row"
										tabIndex="0"
									>
										<div role="gridcell"
											className="ibp-add-acls-table-resource"
										>
											{acl.resource}
										</div>
										<div role="gridcell"
											className="ibp-add-acls-table-definition"
										>
											{acl.definition}
										</div>
										<div id={'ibp-remove-acl-' + i}
											className="ibp-add-acls-remove"
											role="gridcell"
										>
											<DeleteButton
												onClick={() => {
													this.onDeleteACL(i);
												}}
												translate={translate}
											/>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}
				{aclErrors &&
					aclErrors.map((error, i) => {
						return (
							<div key={'acl_error_' + i}
								className="ibp-error-panel"
							>
								<SidePanelWarning
									title="acl_invalid"
									subtitle={translate('acl_invalid_desc', {
										invalidDef: error.definition,
										deletedOrg: error.org,
									})}
								/>
							</div>
						);
					})}
			</div>
		);
	}
}

const dataProps = {
	availableACLResources: PropTypes.array,
	availableACLPolicies: PropTypes.array,
	availableACLRoles: PropTypes.array,
	selectedACLResource: PropTypes.object,
	selectedACLPolicy: PropTypes.object,
	selectedACLRole: PropTypes.object,
	acls: PropTypes.array,
	aclErrors: PropTypes.array,
	manualAcl: PropTypes.bool,
	jsonAclError: PropTypes.string,
};

ACL.propTypes = {
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
)(withTranslation()(ACL));

function DeleteButton(props) {
	return (
		<div
			tabIndex="0"
			onClick={props.onClick}
			onKeyDown={evt => {
				if (evt.key === 'Enter') {
					props.onClick();
				}
			}}
			style={{ display: 'inline' }}
			aria-label={props.translate('delete_acl')}
		>
			<SVGs type={'trash'}
				width="16px"
				height="18px"
			/>
		</div>
	);
}

DeleteButton.propTypes = {
	onClick: PropTypes.func,
	t: PropTypes.func,
};
