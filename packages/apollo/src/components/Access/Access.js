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
import { Link, Loading, OverflowMenu, OverflowMenuItem, SkeletonText } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { clearNotifications, showBreadcrumb, showError, showSuccess, updateState } from '../../redux/commonActions';
import ConfigureAuthApi from '../../rest/ConfigureAuthApi';
import ActionsHelper from '../../utils/actionsHelper';
import Helper from '../../utils/helper';
import AddUserModal from '../AddUserModal/AddUserModal';
import BlockchainTooltip from '../BlockchainTooltip/BlockchainTooltip';
import EditAuthSettingsModal from '../EditAuthSettingsModal/EditAuthSettingsModal';
import EditAuthSchemePanel from '../EditAuthSchemePanel/EditAuthSchemePanel';
import ItemContainer from '../ItemContainer/ItemContainer';
import Logger from '../Log/Logger';
import PageContainer from '../PageContainer/PageContainer';
import PageHeader from '../PageHeader/PageHeader';
import ResetPasswordModal from '../ResetPasswordModal/ResetPasswordModal';
import SVGs from '../Svgs/Svgs';

const SCOPE = 'access';
const Log = new Logger(SCOPE);

// dsh todo rename to Access
export class Access extends Component {
	cName = 'Access';

	componentDidMount() {
		this.props.showBreadcrumb('users', {}, this.props.history.location.pathname, true);
		this.getAuthDetails();
	}

	getAuthDetails = () => {
		this.props.updateState(SCOPE, {
			loading: true,
		});
		ConfigureAuthApi.getAuthScheme().then(
			resp => {
				ConfigureAuthApi.listUsers().then(resp2 => {
					let all_users = [];
					for (const i in resp2.users) {
						all_users.push({
							uuid: i,
							id: resp2.users[i].email,
							email: resp2.users[i].email,
							created: new Date(resp2.users[i].created).toDateString(),
							roles: resp2.users[i].roles,
						});
					}

					// const loggedInUser = all_users.find(user => user.email.toLowerCase() === this.props.userInfo.loggedInAs.email.toLowerCase());
					this.props.updateState(SCOPE, {
						loading: false,
						oauth_url: resp.oauth_url,
						secret: resp.secret,
						tenant_id: resp.tenant_id,
						client_id: resp.client_id,
						adminContactEmail: resp.admin_contact_email ? resp.admin_contact_email : '',
						all_users: all_users,
						isManager: this.props.userInfo ? ActionsHelper.canRestartOpTools(this.props.userInfo) : false,
						auth_scheme: resp.auth_scheme,
					});
				});
			},
			error => {
				Log.error(error);
				this.props.updateState(SCOPE, {
					loading: false,
				});
				this.props.showError('error_getting_auth_details', {}, SCOPE);
			}
		);
	};

	openEditAuthModal = () => {
		this.props.updateState(SCOPE, {
			showEditSettingsModal: true,
		});
	};

	closeEditAuthModal = () => {
		this.props.updateState(SCOPE, {
			showEditSettingsModal: false,
		});
	};

	openAddUserModal = () => {
		this.props.updateState(SCOPE, {
			showAddUserModal: true,
		});
	};

	openEditUserModal = user => {
		this.props.updateState(SCOPE, {
			showAddUserModal: true,
			editMode: true,
			user: user,
		});
	};

	openResetPasswordModal = user => {
		this.props.updateState(SCOPE, {
			showResetPasswordModal: true,
			user: user,
		});
	};

	closeResetPasswordModal = () => {
		this.props.updateState(SCOPE, {
			showResetPasswordModal: false,
			user: null,
		});
	};

	closeAddUserModal = () => {
		this.props.updateState(SCOPE, {
			showAddUserModal: false,
			editMode: false,
			user: null,
		});
	};

	onDeleteUsers = users => {
		let managersSelected = users.filter(user => user.roles.includes('manager'));
		let currentManagers = this.props.all_users.filter(user => user.roles.includes('manager'));
		if (managersSelected.length === currentManagers.length) {
			this.props.showError('atleast_one_admin_required', {}, SCOPE);
		} else {
			let body = { uuids: users.map(user => `"${user.uuid}"`) };
			const emails = users.map(user => user.id);
			users.map(user => {
				const userIndex = users.findIndex(el => el.uuid === user.uuid);
				let userToUpdate = (users[users.findIndex(el => el.uuid === user.uuid)] = user);
				userToUpdate.deleting = true;
				users[userIndex] = userToUpdate;
				this.props.updateState(SCOPE, {
					all_users: [...this.props.all_users],
				});
				return true;
			});
			ConfigureAuthApi.deleteUsers(body).then(
				resp => {
					if (resp.message === 'ok') {
						this.props.showSuccess(emails.length === 1 ? 'user_removed_successful' : 'users_removed_successful', { email: emails.join() }, SCOPE);
						this.getAuthDetails();
					} else {
						this.props.showError('error_removing_users', { email: emails.join() }, SCOPE);
						this.props.updateState(SCOPE, {
							loading: false,
						});
					}
				},
				error => {
					Log.error(error);
					this.props.updateState(SCOPE, {
						loading: false,
					});
					this.props.showError('error_removing_users', { email: emails.join() }, SCOPE);
				}
			);
		}
	};

	checkRole = (user, role) => {
		if (user && user.roles && user.roles.includes(role)) {
			return (
				<div className="ibp-access-member-role-icon">
					<SVGs type="circleFilled"
						width="8px"
						height="8px"
					/>
				</div>
			);
		}
	};

	overflowMenu = user => {
		const translate = this.props.translate;
		let overflow = (
			<OverflowMenu id={`overflow-user-${user.id}`}
				flipped={true}
				ariaLabel={translate('actions')}
				iconDescription={translate('actions')}
			>
				<OverflowMenuItem
					id="update_role"
					itemText={translate('update_role')}
					onClick={() => {
						this.openEditUserModal(user);
					}}
				/>
				{this.props.auth_scheme && this.props.auth_scheme === 'couchdb' && this.props.isManager && (
					<OverflowMenuItem
						id="reset_user"
						itemText={translate('reset_password')}
						onClick={() => {
							this.openResetPasswordModal(user);
						}}
					/>
				)}
			</OverflowMenu>
		);
		return overflow;
	};

	openEditAuthSchemePanel = () => {
		console.log('fired opening');
		this.props.updateState(SCOPE, {
			showEditAuthSchemePanel: true,
		});
	};

	closeEditAuthSchemePanel = () => {
		console.log('fired closing');
		this.props.updateState(SCOPE, {
			showEditAuthSchemePanel: false,
		});
	};

	renderAuthTileSection = () => {
		const isIbmId = this.props.auth_scheme === 'ibmid';
		const isIam = this.props.auth_scheme === 'iam';
		const isCouchDb = this.props.auth_scheme === 'couchdb';
		const translate = this.props.translate;
		return (
			<div className="ibp-access-row">
				<h3 className="ibp-access-auth-services-label">
					{translate('authentication_services')}
				</h3>
				{/*dsh todo check the alt text for the other auth schemes*/}
				<div className="ibp-access-auth-services-container">
					{this.props.auth_scheme ? (
						<p className="ibp-access-app-id-label">
							{isIbmId ? translate('ibm_id') : isIam ? translate('identity_and_access_management') : isCouchDb ? translate('couchdb') : translate('app_id')}
							{this.props.isManager &&
								<button className="ibp-access-button"
									onClick={() => this.openEditAuthSchemePanel()}
									title={translate('access_gear_title')}
								>
									<SVGs type="settings"
										title={translate('access_gear_title')}
										extendClass={{ 'ibp-access-gear-icon': true }}
									/>
								</button>
							}
						</p>
					) : (
						<SkeletonText
							className="ibp-auth-skeleton-text"
							style={{
								marginTop: '.5rem',
								width: '8rem',
							}}
						/>
					)}
					<p className="ibp-access-cloud-service-label">
						<BlockchainTooltip direction="right"
							triggerText={isCouchDb ? translate('local') : translate('ibm_cloud_service')}
						>
							{translate(isCouchDb ? 'authentication_services_tooltip_icp' : 'authentication_services_tooltip_ibp')}
						</BlockchainTooltip>
					</p>
				</div>
			</div>
		);
	}

	render() {
		const isIam = this.props.auth_scheme === 'iam';
		const translate = this.props.translate;
		return (
			<PageContainer>
				<div>
					<div>
						<div className="bx--row">
							<div className="bx--col-lg-13">
								<PageHeader
									history={this.props.history}
									headerName="access_title"
									staticHeader
								/>

								{/* general settings content */}
								<h3>{translate('access_settings_title')}</h3>
								<div>
									<Link className="ibp-access-configure-label"
										href="#"
										onClick={this.openEditAuthModal}
									>
										{translate(this.props.isManager ? 'update_configuration' : 'administrator_contact')}
									</Link>
									<div>
										<div className="access-setting-label">
											<BlockchainTooltip direction="left"
												triggerText='Console contact email:'
											>
												{translate('admin_contact_email_tooltip')}
											</BlockchainTooltip>
										</div>
										{/*dsh todo finish this section*/}
										<div className="access-setting-value">dshuffma@us.ibm.com</div>
									</div>

									<div>
										<div className="access-setting-label">
											<BlockchainTooltip direction="left"
												triggerText='Allow default password:'
											>
												{'bla bla bla'}
											</BlockchainTooltip>
										</div>
										<div className="access-setting-value">true</div>
									</div>
								</div>

								{/* auth scheme content */}
								<this.renderAuthTileSection />

								{/* users table content */}
								{!isIam && (
									<AuthenticatedUsers
										loading={this.props.loading}
										users={this.props.all_users}
										onAdd={this.openAddUserModal}
										onDelete={this.onDeleteUsers}
										isManager={this.props.isManager}
										checkRole={this.checkRole}
										overflowMenu={this.props.isManager ? this.overflowMenu : null}
										authScheme={this.props.auth_scheme}
									/>
								)}
							</div>
							<div>
								{this.props.showEditSettingsModal && (
									<EditAuthSettingsModal
										clientId={this.props.client_id}
										oauthServerUrl={this.props.oauth_url}
										secret={this.props.secret}
										tenantId={this.props.tenant_id}
										adminContactEmail={this.props.adminContactEmail}
										adminUsers={this.props.admin_list ? this.props.admin_list.map(user => user.email) : []}
										generalUsers={this.props.general_list ? this.props.general_list.map(user => user.email) : []}
										onClose={this.closeEditAuthModal}
										onComplete={this.getAuthDetails}
										authScheme={this.props.auth_scheme}
										isManager={this.props.isManager}
									/>
								)}
								{this.props.showAddUserModal && !this.props.editMode && (
									<AddUserModal
										isCouchBasedAuth={this.props.auth_scheme === 'couchdb'}
										existingUsers={this.props.all_users.map(details => details.id)}
										onClose={this.closeAddUserModal}
										onComplete={emails => {
											this.props.showSuccess(emails.length === 1 ? 'user_add_successful' : 'users_add_successful', { email: emails.join() }, SCOPE);
											this.getAuthDetails();
										}}
									/>
								)}
								{this.props.showAddUserModal && this.props.editMode && (
									<AddUserModal
										existingUsers={this.props.all_users.map(details => details.id)}
										userDetails={this.props.user}
										onClose={this.closeAddUserModal}
										onComplete={email => {
											this.props.showSuccess('user_update_successful', { email }, SCOPE);
											this.getAuthDetails();
										}}
									/>
								)}
								{this.props.showResetPasswordModal && (
									<ResetPasswordModal
										user={this.props.user}
										onClose={this.closeResetPasswordModal}
										onComplete={response => {
											this.props.showSuccess('reset_password_successful', { user: response.user }, SCOPE);
										}}
									/>
								)}
								{this.props.showEditAuthSchemePanel && (
									<EditAuthSchemePanel
										clientId={this.props.client_id}
										oauthServerUrl={this.props.oauth_url}
										secret={this.props.secret}
										tenantId={this.props.tenant_id}
										adminContactEmail={this.props.adminContactEmail}
										adminUsers={this.props.admin_list ? this.props.admin_list.map(user => user.email) : []}
										generalUsers={this.props.general_list ? this.props.general_list.map(user => user.email) : []}
										onClose={this.closeEditAuthSchemePanel}
										onComplete={this.getAuthDetails}
										authScheme={this.props.auth_scheme}
										isManager={this.props.isManager}
									/>
								)}
							</div>
						</div>
					</div>
				</div>
			</PageContainer>
		);
	}
}

const dataProps = {
	loading: PropTypes.bool,
	oauth_url: PropTypes.string,
	secret: PropTypes.string,
	tenant_id: PropTypes.string,
	client_id: PropTypes.string,
	adminContactEmail: PropTypes.string,
	admin_list: PropTypes.array,
	general_list: PropTypes.array,
	all_users: PropTypes.array,
	showEditSettingsModal: PropTypes.bool,
	showAddUserModal: PropTypes.bool,
	showResetPasswordModal: PropTypes.bool,
	userInfo: PropTypes.object,
	isManager: PropTypes.bool,
	auth_scheme: PropTypes.string,
	user: PropTypes.object,
	editMode: PropTypes.bool,
	showEditAuthSchemePanel: PropTypes.bool,
};

Access.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	showError: PropTypes.func,
	showBreadcrumb: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};
export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['userInfo'] = state['userInfo'];
		newProps['docPrefix'] = state['settings'] ? state['settings']['docPrefix'] : null;
		return newProps;
	},
	{
		clearNotifications,
		showBreadcrumb,
		showError,
		showSuccess,
		updateState,
	}
)(withLocalize(Access));

export function AuthenticatedUsers(props) {
	return (
		<div className="bx--row">
			<div id="page-container"
				className="bx--col-lg-13"
			>
				<div
					style={{
						width: '100%',
					}}
				>
					<ItemContainer
						containerTitle="authenticated_users"
						containerTooltip={props.authScheme === 'couchdb' ? 'authenticated_users_tooltip_icp' : 'authenticated_users_tooltip_ibp'}
						tooltipDirection="right"
						containerDesc={props.authScheme === 'couchdb' ? 'user_roles_find_more' : ''}
						containerDescLink={props.authScheme === 'couchdb' ? 'user_roles_find_more_link' : ''}
						autoWidthButton
						buttonText="add_new_users"
						id="authenticated_members"
						itemId="users"
						loading={props.loading}
						items={props.users}
						listMapping={[
							{
								header: props.authScheme === 'couchdb' ? 'user_id' : 'email_address',
								attr: 'email',
							},
							{
								header: 'date_added',
								attr: 'created',
							},
							{
								header: 'manager',
								custom: data => {
									return props.checkRole(data, 'manager');
								},
							},
							{
								header: 'writer',
								custom: data => {
									return props.checkRole(data, 'writer');
								},
							},
							{
								header: 'reader',
								custom: data => {
									return props.checkRole(data, 'reader');
								},
							},
							{
								header: 'empty',
								custom: user => {
									if (user.deleting) {
										return <Loading withOverlay={false}
											small
											className="ibp-deleting-spinner"
										/>;
									}
									if (props.overflowMenu) {
										return props.overflowMenu(user);
									}
								},
							},
						]}
						addItems={
							props.isManager
								? [
									{
										text: 'add_new_users',
										fn: props.onAdd,
									},
								]
								: []
						}
						selectItem={
							props.isManager
								? {
									id: 'deleteUser',
									text: 'delete_users',
									fn: props.onDelete,
									image: <DeleteButton />,
									multiSelect: true,
								} /* prettier-ignore */
								: null
						}
						disableAddItem={!props.isManager}
					/>
				</div>
			</div>
		</div>
	);
}
AuthenticatedUsers.propTypes = {
	loading: PropTypes.bool,
	users: PropTypes.array,
	onAdd: PropTypes.func,
	onDelete: PropTypes.func,
	isManager: PropTypes.bool,
	checkRole: PropTypes.func,
	overflowMenu: PropTypes.func,
	authScheme: PropTypes.string,
};

export function DeleteButton() {
	return <SVGs type={'trash'}
		width="16px"
		height="18px"
	/>;
}