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
import { Loading, OverflowMenu, OverflowMenuItem, SkeletonText } from '@carbon/react';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { clearNotifications, showBreadcrumb, showError, showSuccess, updateState } from '../../redux/commonActions';
import ConfigureAuthApi from '../../rest/ConfigureAuthApi';
import ActionsHelper from '../../utils/actionsHelper';
import Helper from '../../utils/helper';
import AddUserModal from '../AddUserModal/AddUserModal';
import BlockchainTooltip from '../BlockchainTooltip/BlockchainTooltip';
import EditAuthSchemePanel from '../EditAuthSchemePanel/EditAuthSchemePanel';
import ItemContainer from '../ItemContainer/ItemContainer';
import Logger from '../Log/Logger';
import PageContainer from '../PageContainer/PageContainer';
import PageHeader from '../PageHeader/PageHeader';
import ResetPasswordModal from '../ResetPasswordModal/ResetPasswordModal';
import SVGs from '../Svgs/Svgs';
import TranslateLink from '../TranslateLink/TranslateLink';
import DeleteAccessModal from '../DeleteAccessModal/DeleteAccessModal';
import SidePanel from '../SidePanel/SidePanel';
import Form from '../Form/Form';
import * as constants from '../../utils/constants';
import withRouter from '../../hoc/withRouter';

const SCOPE = 'access';
const Log = new Logger(SCOPE);
let login_interval = null;
let admin_count = 0;

export class Access extends Component {
	cName = 'Access';

	componentDidMount() {
		this.props.showBreadcrumb('users', {}, this.props.history.location.pathname, true);

		this.getAuthDetails();
		if (ActionsHelper.canManageUsers(this.props.userInfo)) {
			this.getApikeyDetails();
		}
	}

	getAuthDetails = (skip_cache) => {
		this.props.updateState(SCOPE, {
			loading: true,
		});
		ConfigureAuthApi.getAuthScheme(skip_cache).then(
			(resp) => {
				ConfigureAuthApi.listUsers(skip_cache).then((resp2) => {
					let all_users = [];

					// first find the current user and put them first
					for (const id in resp2.users) {
						if (this.props.userInfo && this.props.userInfo.loggedInAs && resp2.users[id].email === this.props.userInfo.loggedInAs.email) {
							all_users.push({
								uuid: id,
								id: resp2.users[id].email, // multi select items need an "id" field
								email: resp2.users[id].email,
								created: new Date(resp2.users[id].created).toDateString(),
								roles: resp2.users[id].roles,
								disabled: true,
							});
							if (resp2.users[id].roles.includes('manager')) {
								admin_count = admin_count + 1;
							}
							delete resp2.users[id];
							break;
						}
					}

					// second list the users that are pending
					for (const id in resp2.users) {
						if (resp2.users[id] && (!Array.isArray(resp2.users[id].roles) || resp2.users[id].roles.length === 0)) {
							all_users.push({
								uuid: id,
								id: resp2.users[id].email, // multi select items need an "id" field
								email: resp2.users[id].email,
								created: new Date(resp2.users[id].created).toDateString(),
								roles: resp2.users[id].roles,
							});
							delete resp2.users[id];
						}
					}

					// last list everyone else
					for (const id in resp2.users) {
						all_users.push({
							uuid: id,
							id: resp2.users[id].email, // multi select items need an "id" field
							email: resp2.users[id].email,
							created: new Date(resp2.users[id].created).toDateString(),
							roles: resp2.users[id].roles,
						});
						if (resp2.users[id].roles.includes('manager')) {
							admin_count = admin_count + 1;
						}
					}

					this.props.updateState(SCOPE, {
						loading: false,
						oauth_url: resp.oauth_url,
						secret: resp.secret,
						tenant_id: resp.tenant_id,
						client_id: resp.client_id,
						all_users: all_users,
						isManager: this.props.userInfo ? ActionsHelper.canManageUsers(this.props.userInfo) : false,
						isWriter: this.props.userInfo ? ActionsHelper.canManageApiKeys(this.props.userInfo) : false,
						auth_scheme: resp.auth_scheme,
						in_read_only_mode: resp.in_read_only_mode === true,
					});
				});
			},
			(error) => {
				Log.error(error);
				this.props.updateState(SCOPE, {
					loading: false,
				});
				this.props.showError('error_getting_auth_details', {}, SCOPE);
			}
		);
	};

	// get all the api keys
	getApikeyDetails = async (skip_cache) => {
		this.props.updateState(SCOPE, {
			api_keys_loading: true,
			all_apikeys: [],
		});
		try {
			const resp = await ConfigureAuthApi.listApiKeys(skip_cache);
			const all_keys = [];
			for (const id in resp.keys) {
				all_keys.push({
					id: resp.keys[id].api_key, // multi select items need an "id" field
					api_key: resp.keys[id].api_key,
					description: resp.keys[id].description,
					created: new Date(resp.keys[id].ts_created).toDateString(),
					roles: resp.keys[id].roles,
				});
			}
			this.props.updateState(SCOPE, {
				api_keys_loading: false,
				all_apikeys: all_keys,
			});
		} catch (e) {
			console.error('unable to load api keys, error', e);
		}
	};

	openAddUserModal = (type) => {
		this.props.updateState(SCOPE, {
			showAddUserModal: true,
			addModalType: type,
		});
	};

	openEditUserModal = (user) => {
		if (admin_count < 2 && user.roles.includes('manager')) {
			this.props.updateState(SCOPE, {
				showAddUserModal: true,
				editMode: true,
				user: user,
				disableUpdate: true,
			});
		} else {
			this.props.updateState(SCOPE, {
				showAddUserModal: true,
				editMode: true,
				user: user,
				disableUpdate: false,
			});
		}
	};

	openResetPasswordModal = (user) => {
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

	openDeleteModal = (type, things) => {
		this.props.updateState(SCOPE, {
			showDeleteModal: true,
			delModalType: type,
			delThings: things,
		});
	};

	closeDeleteModal = (type) => {
		this.props.updateState(SCOPE, {
			showDeleteModal: false,
		});
	};

	checkRole = (user, role) => {
		if (user && user.roles && user.roles.includes(role)) {
			return (
				<div className="ibp-access-member-role-icon">
					<SVGs type="circleFilled" width="8px" height="8px" />
				</div>
			);
		}
	};

	// build the cell contents for the attention column
	buildAttentionCell = (user) => {
		const translate = this.props.t;

		// is a new registered user
		if (!Array.isArray(user.roles) || user.roles.length === 0) {
			return <div className="ibp-access-member-new-icon">{translate('pending_user_icon_txt')}</div>;
		}

		// this row if for the currently logged in user
		else if (this.props.userInfo && this.props.userInfo.loggedInAs && user.id === this.props.userInfo.loggedInAs.email) {
			return <div className="ibp-access-member-you-icon">{translate('current_user_icon_txt')}</div>;
		}
	};

	overflowMenu = (user) => {
		const translate = this.props.t;
		let overflow = (
			<OverflowMenu id={`overflow-user-${user.id}`} flipped={true} ariaLabel={translate('actions')} iconDescription={translate('actions')}>
				<OverflowMenuItem
					id="update_role"
					itemText={translate('update_role')}
					onClick={() => {
						this.openEditUserModal(user);
					}}
				/>
				{this.props.auth_scheme && this.props.auth_scheme === constants.AUTH_COUCHDB && this.props.isManager && (
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
		if (this.props.isManager) {
			this.props.updateState(SCOPE, {
				showEditAuthSchemePanel: true,
			});
		}
	};

	closeEditAuthSchemePanel = () => {
		this.props.updateState(SCOPE, {
			showEditAuthSchemePanel: false,
		});
	};

	renderAuthTileSection = () => {
		const isIbmId = this.props.auth_scheme === 'ibmid';
		const isIam = this.props.auth_scheme === constants.AUTH_IAM;
		const isCouchDb = this.props.auth_scheme === constants.AUTH_COUCHDB;
		const translate = this.props.t;
		const inReadOnlyMode = this.props.in_read_only_mode;
		return (
			<div className="ibp-access-row">
				<h3 className="ibp-access-auth-services-label">{translate('authentication_services')}</h3>

				<div className="ibp-access-auth-services-container">
					{this.props.auth_scheme ? (
						<div className="ibp-access-app-id-label">
							{isIbmId ? translate('ibm_id') : isIam ? translate('identity_and_access_management') : isCouchDb ? translate('couchdb') : translate('oauth')}
							{!isIam && this.props.isManager && !inReadOnlyMode && (
								<button className="ibp-access-button" onClick={() => this.openEditAuthSchemePanel()} title={translate('access_gear_title')}>
									<SVGs type="settings" title={translate('access_gear_title')} extendClass={{ 'ibp-access-gear-icon': true }} />
								</button>
							)}
						</div>
					) : (
						<SkeletonText
							className="ibp-auth-skeleton-text"
							style={{
								marginTop: '.5rem',
								width: '8rem',
							}}
						/>
					)}
					{this.props.auth_scheme && (
						<div className="ibp-access-cloud-service-label">
							{/* the authentication line*/}
							<BlockchainTooltip
								direction="right"
								triggerText={
									isIbmId ? translate('ibm_cloud_desc') : isIam ? translate('ibm_cloud_desc') : isCouchDb ? translate('local_desc') : translate('oauth_desc')
								}
							>
								{isIbmId
									? translate('authentication_services_tooltip_ibp')
									: isIam
										? translate('authentication_services_tooltip_ibp')
										: isCouchDb
											? translate('authentication_services_tooltip_local')
											: translate('authentication_services_tooltip_oauth')}
							</BlockchainTooltip>

							{/* the authorization line*/}
							<BlockchainTooltip
								direction="right"
								triggerText={
									isIbmId
										? translate('ibm_cloud_perm_desc')
										: isIam
											? translate('ibm_cloud_perm_desc')
											: isCouchDb
												? translate('local_perm_desc')
												: translate('oauth_perm_desc')
								}
							>
								{isIbmId
									? translate('authorize_services_tooltip_ibp')
									: isIam
										? translate('authorize_services_tooltip_ibp')
										: isCouchDb
											? translate('authorize_services_tooltip_oauth')
											: translate('authorize_services_tooltip_local')}
							</BlockchainTooltip>
						</div>
					)}
				</div>
			</div>
		);
	};

	render() {
		const isIam = this.props.auth_scheme === constants.AUTH_IAM;
		const translate = this.props.t;
		const hasPendingUsers =
			Array.isArray(this.props.all_users) &&
			this.props.all_users.filter((x) => {
				// see if any usernames are pending (have no roles)
				return !Array.isArray(x.roles) || x.roles.length === 0;
			}).length > 0;
		const inReadOnlyMode = this.props.in_read_only_mode;

		return (
			<PageContainer>
				{/* <div className="cds-row">
					<div className="cds--col-lg-13"> */}
				<PageHeader history={this.props.history} headerName="access_title" staticHeader />

				{/* auth scheme tile content */}
				{!this.props.loading && <this.renderAuthTileSection />}

				{/* doc links */}
				{!this.props.loading && !isIam && <TranslateLink text="access_doc_links" />}

				{/* users table content */}
				{!isIam && this.props.isManager && (
					<div>
						<AuthenticatedUsers
							loading={this.props.loading}
							users={this.props.all_users}
							onAdd={this.openAddUserModal}
							onDelete={(users) => {
								this.openDeleteModal('user', users);
							}}
							isManager={this.props.isManager}
							checkRole={this.checkRole}
							buildAttentionCell={this.buildAttentionCell}
							overflowMenu={this.props.isManager && !inReadOnlyMode ? this.overflowMenu : null}
							authScheme={this.props.auth_scheme}
							inReadOnlyMode={this.props.in_read_only_mode}
						/>

						{hasPendingUsers && <p className="tinyTextWhite">{translate('pending_user_title')}</p>}
					</div>
				)}

				{/* apikey table content */}
				{!isIam && this.props.isManager && (
					<div>
						<ApiKeys
							loading={this.props.loading}
							apikeys={this.props.all_apikeys}
							onAdd={() => {
								this.openAddUserModal('apikey');
							}}
							onDelete={(keys) => {
								this.openDeleteModal('apikey', keys);
							}}
							isManager={this.props.isManager}
							isWriter={this.props.isWriter}
							checkRole={this.checkRole}
							inReadOnlyMode={this.props.in_read_only_mode}
						/>
						{Array.isArray(this.props.all_apikeys) && this.props.all_apikeys.length > 0 && <p className="tinyTextWhite">{translate('api_key_warning_txt')}</p>}
					</div>
				)}

				{/* non-manager description */}
				{!this.props.loading && !isIam && !this.props.isManager && (
					<div>
						<br />
						<br />
						{translate('access_not_a_manager')}
					</div>
				)}
				{/* </div>
					<div> */}

				{/* add user modal */}
				{this.props.showAddUserModal && !this.props.editMode && (
					<AddUserModal
						isCouchBasedAuth={this.props.auth_scheme === constants.AUTH_COUCHDB}
						existingUsers={this.props.all_users.map((details) => details.id)}
						onClose={this.closeAddUserModal}
						modalType={this.props.addModalType}
						onComplete={(data) => {
							if (this.props.addModalType === 'apikey') {
								this.getApikeyDetails(true);
								this.props.updateState(SCOPE, {
									showApiSecret: true,
									apikey_reveal: data.api_key,
									api_secret_reveal: data.api_secret,
								});
							} else {
								const emails = data;
								this.props.showSuccess(emails.length === 1 ? 'user_add_successful' : 'users_add_successful', { email: emails.join(', ') }, SCOPE);
								admin_count = 0;
								this.getAuthDetails(true);
							}
						}}
					/>
				)}

				{/* edit user roles modal */}
				{this.props.showAddUserModal && this.props.editMode && (
					<AddUserModal
						existingUsers={this.props.all_users.map((details) => details.id)}
						userDetails={this.props.user}
						onClose={this.closeAddUserModal}
						disableUpdate={this.props.disableUpdate}
						onComplete={(email) => {
							this.props.showSuccess('user_update_successful', { email }, SCOPE);
							admin_count = 0;
							this.getAuthDetails(true);
						}}
					/>
				)}

				{/* reset user password modal */}
				{this.props.showResetPasswordModal && (
					<ResetPasswordModal
						user={this.props.user}
						onClose={this.closeResetPasswordModal}
						onComplete={(response) => {
							this.props.showSuccess('reset_password_successful', { user: response.user }, SCOPE);
						}}
					/>
				)}

				{/* change auth scheme modal */}
				{this.props.showEditAuthSchemePanel && (
					<EditAuthSchemePanel
						clientId={this.props.client_id}
						oauthServerUrl={this.props.oauth_url}
						secret={this.props.secret}
						tenantId={this.props.tenant_id}
						adminUsers={this.props.admin_list ? this.props.admin_list.map((user) => user.email) : []}
						generalUsers={this.props.general_list ? this.props.general_list.map((user) => user.email) : []}
						onClose={this.closeEditAuthSchemePanel}
						onComplete={(type) => {
							this.props.updateState(SCOPE, {
								showLoginTimer: true,
								showLoginType: type,
								loginTimeRemaining_s: 120, // time in seconds to threaten user with
							});

							if (type === constants.AUTH_OAUTH) {
								clearInterval(login_interval);
								login_interval = setInterval(() => {
									this.props.updateState(SCOPE, {
										loginTimeRemaining_s: this.props.loginTimeRemaining_s > 0 ? this.props.loginTimeRemaining_s - 1 : 0,
									});

									if (this.props.loginTimeRemaining_s <= 0) {
										// reload the page if they waited this long
										window.location.href = '/auth/logout';
									}
								}, 1000);
							}
						}}
						authScheme={this.props.auth_scheme}
						isManager={this.props.isManager}
					/>
				)}

				{/* delete user or api key modal */}
				{this.props.showDeleteModal && (
					<DeleteAccessModal
						deleteArr={this.props.delThings}
						modalType={this.props.delModalType}
						onClose={this.closeDeleteModal}
						onComplete={(removedItems) => {
							if (this.props.delModalType === 'apikey') {
								this.props.showSuccess(
									Array.isArray(removedItems) && removedItems.length > 1 ? 'apikeys_removed_successful' : 'apikey_removed_successful',
									SCOPE
								);
								this.getApikeyDetails(true);
							} else {
								this.props.showSuccess(
									Array.isArray(removedItems) && removedItems.length > 1 ? 'users_removed_successful' : 'user_removed_successful',
									{ email: removedItems.join(', ') },
									SCOPE
								);
								admin_count = 0;
								this.getAuthDetails(true);
							}
						}}
					/>
				)}

				{/* api key & secret reveal content */}
				{this.props.showApiSecret && (
					<SidePanel
						id="ibp--template-full-page-side-panel"
						closed={() => {
							this.props.updateState(SCOPE, {
								showApiSecret: false,
							});
						}}
						ref={(sidePanel) => (this.sidePanel = sidePanel)}
						buttons={[
							{
								id: 'api_key_secret_reveal',
								text: translate('i_understand'),
								type: 'submit',
							},
						]}
						fullPageCenter
						hideClose={true}
					>
						<div className="ibp-full-page-center-panel-container">
							<h1>{translate('success')}</h1>
							<br />
							<p>{translate('api_secret_reveal_txt1')}</p>
							<p>{translate('api_secret_reveal_txt2')}</p>
							<br />
							<Form
								scope={SCOPE}
								className="access-form-apikey-secret"
								id={SCOPE}
								fields={[
									{
										name: 'apikey_name',
										label: 'apikey_label',
										placeholder: 'apikey_label',
										readonly: true,
										default: this.props.apikey_reveal,
									},
									{
										name: 'api_secret',
										label: 'api_secret_label',
										placeholder: 'api_secret_label',
										readonly: true,
										default: this.props.api_secret_reveal,
									},
								]}
							/>
						</div>
					</SidePanel>
				)}

				{/* oauth logout/login timer content */}
				{this.props.showLoginTimer && (
					<SidePanel
						id="ibp--template-full-page-side-panel"
						closed={() => {
							this.props.updateState(SCOPE, {
								showLoginTimer: false,
								loading: true,
							});
							window.location.href = '/auth/logout';
						}}
						ref={(sidePanel) => (this.sidePanel = sidePanel)}
						buttons={[
							{
								id: 'access-logout-butt',
								text: translate('logout'),
								type: 'submit',
							},
						]}
						fullPageCenter
						hideClose={true}
					>
						{this.props.showLoginType === constants.AUTH_OAUTH && (
							<div className="ibp-full-page-center-panel-container">
								<h1>{translate('login_req_header')}</h1>
								<br />
								<br />
								<p>{translate('login_required_txt1')}</p>
								<br />
								<h3>{this.props.loginTimeRemaining_s} secs remaining</h3>
								<br />
								<p>{translate('login_required_txt2')}</p>
							</div>
						)}
						{this.props.showLoginType === constants.AUTH_COUCHDB && (
							<div className="ibp-full-page-center-panel-container">
								<h1>{translate('logout_header')}</h1>
								<br />
								<br />
								<p>{translate('logout_required_txt1')}</p>
								<br />
								<p>{translate('logout_required_txt2')}</p>
							</div>
						)}
					</SidePanel>
				)}
				{/* </div>
				</div> */}
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
	admin_list: PropTypes.array,
	general_list: PropTypes.array,
	all_users: PropTypes.array,
	showAddUserModal: PropTypes.bool,
	showResetPasswordModal: PropTypes.bool,
	userInfo: PropTypes.object,
	isManager: PropTypes.bool,
	isWriter: PropTypes.bool,
	disableUpdate: PropTypes.bool,
	auth_scheme: PropTypes.string,
	user: PropTypes.object,
	editMode: PropTypes.bool,
	showEditAuthSchemePanel: PropTypes.bool,
	all_apikeys: PropTypes.array,
	addModalType: PropTypes.string,
	delModalType: PropTypes.string,
	showDeleteModal: PropTypes.bool,
	delThings: PropTypes.array,
	showApiSecret: PropTypes.bool,
	api_secret_reveal: PropTypes.string,
	apikey_reveal: PropTypes.string,
	showLoginTimer: PropTypes.bool,
	loginTimeRemaining_s: PropTypes.number,
	showLoginType: PropTypes.string,
	in_read_only_mode: PropTypes.bool,
};

Access.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	showError: PropTypes.func,
	showBreadcrumb: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};
export default connect(
	(state) => {
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
)(withTranslation()(withRouter(Access)));

export function AuthenticatedUsers(props) {
	return (
		// <div className="cds-row">
		// 	<div id="page-container"
		// 		className="cds--col-lg-13"
		// 	>
		// 		<div
		// 			style={{
		// 				width: '100%',
		// 			}}
		// 		>
		<ItemContainer
			containerTitle="user_table_header"
			containerTooltip={props.authScheme === constants.AUTH_COUCHDB ? 'authenticated_users_tooltip_icp' : 'authenticated_users_tooltip_ibp'}
			tooltipDirection="right"
			// autoWidthButton
			buttonText="add_new_users"
			id="authenticated_members"
			itemId="users"
			loading={props.loading}
			items={props.users}
			pageSize={50}
			listMapping={[
				{
					header: '',
					custom: (data) => {
						return props.buildAttentionCell(data);
					},
				},
				{
					header: 'username_label',
					attr: 'email',
					width: 4,
				},
				{
					header: 'date_added',
					attr: 'created',
					width: 2,
				},
				{
					header: 'manager',
					custom: (data) => {
						return props.checkRole(data, 'manager');
					},
				},
				{
					header: 'writer',
					custom: (data) => {
						return props.checkRole(data, 'writer');
					},
				},
				{
					header: 'reader',
					custom: (data) => {
						return props.checkRole(data, 'reader');
					},
				},
				{
					header: 'empty',
					custom: (user) => {
						if (user.deleting) {
							return <Loading withOverlay={false} small className="ibp-deleting-spinner" />;
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
				props.isManager && !props.inReadOnlyMode
					? {
						id: 'deleteUser',
						text: 'delete_users',
						fn: props.onDelete,
						image: <DeleteButton />,
						multiSelect: true,
					} /* prettier-ignore */
					: null
			}
			disableAddItem={!props.isManager || props.inReadOnlyMode}
		/>
		// 		</div>
		// 	</div>
		// </div>
	);
}
AuthenticatedUsers.propTypes = {
	loading: PropTypes.bool,
	users: PropTypes.array,
	onAdd: PropTypes.func,
	onDelete: PropTypes.func,
	isManager: PropTypes.bool,
	isWriter: PropTypes.bool,
	checkRole: PropTypes.func,
	buildAttentionCell: PropTypes.func,
	overflowMenu: PropTypes.func,
	authScheme: PropTypes.string,
	userInfo: PropTypes.object,
	inReadOnlyMode: PropTypes.bool,
};

export function ApiKeys(props) {
	return (
		// <div className="cds--row">
		// 	<div id="page-container"
		// 		className="cds--col-lg-13"
		// 	>
		// 		<div
		// 			style={{
		// 				width: '100%',
		// 			}}
		// 		>
		<ItemContainer
			containerTitle="apikey_table_header"
			tooltipDirection="right"
			autoWidthButton
			id="current_apikeys"
			itemId="apikeys"
			loading={props.loading}
			items={props.apikeys}
			emptyMessage={'no_api_keys_msg'}
			pageSize={5}
			listMapping={[
				{
					header: 'apikey_description_label',
					attr: 'description',
					width: 3,
				},
				{
					header: 'date_added',
					attr: 'created',
					width: 2,
				},
				{
					header: 'apikey_label',
					attr: 'api_key',
					width: 2,
				},
				{
					header: 'manager',
					custom: (data) => {
						return props.checkRole(data, 'manager');
					},
				},
				{
					header: 'writer',
					custom: (data) => {
						return props.checkRole(data, 'writer');
					},
				},
				{
					header: 'reader',
					custom: (data) => {
						return props.checkRole(data, 'reader');
					},
				},
				{
					header: 'empty',
					custom: (user) => {
						if (user.deleting) {
							return <Loading withOverlay={false} small className="ibp-deleting-spinner" />;
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
							text: 'add_new_apikey',
							fn: props.onAdd,
						},
					]
					: []
			}
			selectItem={
				props.isManager && !props.inReadOnlyMode
					? {
						id: 'deleteApiKey',
						text: 'delete',
						fn: props.onDelete,
						image: <DeleteButton />,
						multiSelect: true,
					} /* prettier-ignore */
					: null
			}
			disableAddItem={!props.isManager || props.inReadOnlyMode}
		/>
		// 		</div>
		// 	</div>
		// </div>
	);
}
ApiKeys.propTypes = {
	loading: PropTypes.bool,
	apikeys: PropTypes.array,
	onAdd: PropTypes.func,
	onDelete: PropTypes.func,
	isManager: PropTypes.bool,
	isWriter: PropTypes.bool,
	checkRole: PropTypes.func,
	buildAttentionCell: PropTypes.func,
	overflowMenu: PropTypes.func,
	userInfo: PropTypes.object,
	inReadOnlyMode: PropTypes.bool,
};

export function DeleteButton() {
	return <SVGs type={'trash'} width="16px" height="18px" />;
}
