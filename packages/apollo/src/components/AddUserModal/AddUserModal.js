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
import { Checkbox } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { clearNotifications, showError, updateState } from '../../redux/commonActions';
import ConfigureAuthApi from '../../rest/ConfigureAuthApi';
import Helper from '../../utils/helper';
import BlockchainTooltip from '../BlockchainTooltip/BlockchainTooltip';
import EmailChips from '../EmailChips/EmailChips';
import Form from '../Form/Form';
import ImportantBox from '../ImportantBox/ImportantBox';
import SidePanel from '../SidePanel/SidePanel';

const SCOPE = 'addUsers';

export class AddUserModal extends Component {
	cName = 'AddUserModal';

	componentDidMount() {
		this.props.updateState(SCOPE, {
			newUsers: [],
			isEditing: this.props.userDetails ? true : false,
			userEmail: this.props.userDetails ? this.props.userDetails.email : '',
			roles: this.props.userDetails ? this.props.userDetails.roles : [],
			disableSave: this.props.userDetails ? false : true,
			submitting: false,
		});
	}

	componentWillUnmount() {
		this.props.updateState(SCOPE, {
			error: '',
			submitting: false,
		});
	}

	validateEmail = chipText => {
		const separators = [' ', ','];
		const emails = chipText.split(new RegExp(separators.join('|'), 'g'));
		const chips = emails.filter(t => t.length > 0).map(t => t.trim());

		let isValid = true;
		chips.forEach(chip => {
			if (chip && this.props.existingUsers.includes(chip)) {
				this.props.updateState(SCOPE, {
					error: 'duplicate_user_not_allowed',
				});
				isValid = false;
			} else if (chip && !Helper.isEmail(chip)) {
				this.props.updateState(SCOPE, {
					error: 'invalid_email',
				});
				isValid = false;
			} else if (!Helper.validateCharacters(chip)) {
				this.props.updateState(SCOPE, {
					error: 'input_error_invalid_char',
				});
				isValid = false;
			}
		});
		if (isValid) {
			this.props.updateState(SCOPE, {
				error: '',
			});
		}
		return isValid;
	};

	handleAddChip = (...addedChips) => {
		let newUsers = this.props.newUsers ? [...this.props.newUsers, ...addedChips.filter(val => val !== undefined)] : [...addedChips];
		newUsers = newUsers.filter(user => !this.props.existingUsers.includes(user));
		this.props.updateState(SCOPE, {
			newUsers: newUsers,
			disableSave: false,
		});
	};

	handleDeleteChip = deletedChip => {
		let save = false;
		if (this.props.newUsers.length === 1 && this.props.newUsers.includes(deletedChip)) {
			save = true;
		}
		this.props.updateState(SCOPE, {
			newUsers: this.props.newUsers.filter(c => c !== deletedChip),
			disableSave: save,
		});
	};

	onChangeRole = (role, event) => {
		let roles = this.props.roles;
		if (event.target.checked) {
			roles = role === 'manager' ? ['manager', 'writer', 'reader'] : role === 'writer' ? ['writer', 'reader'] : ['reader'];
		} else {
			roles = roles.filter(r => r !== role);
		}
		this.props.updateState(SCOPE, {
			roles: roles,
		});
	};

	onSave = () => {
		this.props.updateState(SCOPE, { submitting: true, error: null });
		setTimeout(() => {
			if (this.props.isEditing) {
				let body = {
					uuids: {
						[this.props.userDetails.uuid]: {
							roles: this.props.roles,
						},
					},
				};
				this.props.updateState(SCOPE, { submitting: true });
				ConfigureAuthApi.editUsers(body).then(resp => {
					this.props.updateState(SCOPE, { submitting: false });
					if (resp.message === 'ok') {
						this.sidePanel.closeSidePanel();
						this.props.onComplete(this.props.userDetails.email);
					} else {
						this.props.showError('error_user_role_edit', {}, SCOPE);
					}
				});
			} else {
				let body = {
					users: {},
				};
				for (let i in this.props.newUsers) {
					body.users[this.props.newUsers[i]] = {
						roles: this.props.roles,
					};
				}

				const userEmails = [];
				Object.keys(body.users).map(email => {
					userEmails.push(email);
					return true;
				});

				this.props.updateState(SCOPE, { submitting: true });
				ConfigureAuthApi.addUsers(body)
					.then(resp => {
						this.props.updateState(SCOPE, { submitting: false });
						if (resp.message === 'ok') {
							this.sidePanel.closeSidePanel();
							this.props.onComplete(userEmails);
						} else {
							this.props.showError('error_add_users', {}, SCOPE);
						}
					})
					.catch(error => {
						this.props.updateState(SCOPE, {
							submitting: false,
							error: {
								title: 'error_add_users',
								details: error.msg ? error.msg : error,
							},
						});
					});
			}
		}, 250);
	};

	render = () => {
		let disableSubmit = this.props.disableSave || this.props.submitting || !this.props.roles || !this.props.roles.length;
		disableSubmit = this.props.isEditing ? disableSubmit : disableSubmit || !this.props.newUsers || !this.props.newUsers.length;
		const translate = this.props.translate;
		return (
			<div>
				<SidePanel
					id="add-users"
					closed={this.props.onClose}
					ref={sidePanel => (this.sidePanel = sidePanel)}
					buttons={[
						{
							id: 'cancel',
							text: translate('cancel'),
						},
						{
							id: 'add_new_users',
							text: this.props.isEditing ? translate('update') : translate('add_new_users'),
							onClick: this.onSave,
							disabled: disableSubmit,
							type: 'submit',
						},
					]}
					error={this.props.error}
					submitting={this.props.submitting}
				>
					<div>
						<h1 className="ibp-auth-settings-modal-title">{translate('add_new_users')}</h1>
						{!this.props.isEditing && (
							<div>
								<p className="ibp-auth-settings-email-title ibp-tooltip-wrap">
									<span className="ibp-user-tooltip">
										<BlockchainTooltip
											tooltipText={translate(this.props.isCouchBasedAuth ? 'user_ids_tooltip' : 'user_email_address_tooltip')}
											type="definition"
										>
											{translate(this.props.isCouchBasedAuth ? 'specify_user_ids' : 'specify_email_address')}
										</BlockchainTooltip>
									</span>
								</p>
								<div className="ibp-auth-settings-user-type">
									<EmailChips
										id="users"
										placeholder={translate(this.props.isCouchBasedAuth ? 'users_placeholder_couch' : 'users_placeholder')}
										value={this.props.newUsers}
										handleBeforeAddChip={!this.props.isCouchBasedAuth ? this.validateEmail : () => true}
										handleAddChip={this.handleAddChip}
										handleDeleteChip={this.handleDeleteChip}
									/>
								</div>
							</div>
						)}

						{this.props.isEditing && (
							<div className="ibp-user-email">
								<Form
									scope={SCOPE}
									id={SCOPE}
									fields={[
										{
											name: 'userEmail',
											required: true,
											default: this.props.userDetails ? this.props.userDetails.email : '',
											readonly: true,
										},
									]}
								/>
							</div>
						)}

						<p className="ibp-auth-settings-roles-title ibp-tooltip-wrap">
							<span className="ibp-user-tooltip">
								<BlockchainTooltip type="definition"
									tooltipText={translate('user_role_tooltip')}
								>
									{translate('specify_roles')}
								</BlockchainTooltip>
							</span>
						</p>
						<div className="ibp-auth-settings-role">
							<Checkbox
								id={'role_manager'}
								className="ibp-auth-settings-role-label"
								labelText={translate('manager')}
								checked={this.props.roles && this.props.roles.includes('manager')}
								onClick={event => {
									this.onChangeRole('manager', event);
								}}
							/>
							<p className="ibp-auth-settings-roles-desc">{translate('manager_role_desc')}</p>
						</div>

						<div className="ibp-auth-settings-role">
							<Checkbox
								id={'role_writer'}
								className="ibp-auth-settings-role-label"
								labelText={translate('writer')}
								checked={this.props.roles && this.props.roles.includes('writer')}
								disabled={this.props.roles && this.props.roles.includes('manager')}
								onClick={event => {
									this.onChangeRole('writer', event);
								}}
							/>
							<p className="ibp-auth-settings-roles-desc">{translate('writer_role_desc')}</p>
						</div>

						<div className="ibp-auth-settings-role">
							<Checkbox
								id={'role_reader'}
								className="ibp-auth-settings-role-label"
								labelText={translate('reader')}
								checked={this.props.roles && this.props.roles.includes('reader')}
								disabled={this.props.roles && this.props.roles.includes('writer')}
								onClick={event => {
									this.onChangeRole('reader', event);
								}}
							/>
							<p className="ibp-auth-settings-roles-desc">{translate('reader_role_desc')}</p>
						</div>
						{this.props.isCouchBasedAuth && <ImportantBox text="couch_add_user_info_message" />}
					</div>
				</SidePanel>
			</div>
		);
	};
}

const dataProps = {
	submitting: PropTypes.bool,
	disableSave: PropTypes.bool,
	error: PropTypes.string,
	newUsers: PropTypes.array,
	existingUsers: PropTypes.array,
	user_type: PropTypes.string,
	roles: PropTypes.array,
	isEditing: PropTypes.bool,
	userEmail: PropTypes.string,
	isCouchBasedAuth: PropTypes.bool,
};

AddUserModal.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	onClose: PropTypes.func,
	onComplete: PropTypes.func,
	showError: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		clearNotifications,
		showError,
		updateState,
	}
)(withLocalize(AddUserModal));
