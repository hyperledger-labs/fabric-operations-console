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
import * as constants from './constants';

const ActionsHelper = {
	canEditComponent(feature_flags) {
		const in_read_only_mode = feature_flags ? feature_flags.read_only_enabled : false;
		return !in_read_only_mode;
	},

	canCreateComponent(user, feature_flags) {
		const in_read_only_mode = feature_flags ? feature_flags.read_only_enabled : false;
		return ActionsHelper._actionCheck(user, constants.ACTION_COMPONENT_CREATE) && !in_read_only_mode;
	},

	// not in use
	/*canRemoveComponent(user, feature_flags) {
		const in_read_only_mode = feature_flags ? feature_flags.read_only_enabled : false;
		return ActionsHelper._actionCheck(user, constants.ACTION_COMPONENT_REMOVE) && !in_read_only_mode;
	},*/

	canDeleteComponent(user, feature_flags) {
		const in_read_only_mode = feature_flags ? feature_flags.read_only_enabled : false;
		return ActionsHelper._actionCheck(user, constants.ACTION_COMPONENT_DELETE) && !in_read_only_mode;
	},

	canImportComponent(user, feature_flags) {
		const in_read_only_mode = feature_flags ? feature_flags.read_only_enabled : false;
		return ActionsHelper._actionCheck(user, constants.ACTION_COMPONENT_IMPORT) && !in_read_only_mode;
	},

	canExportComponent(user) {
		return ActionsHelper._actionCheck(user, constants.ACTION_COMPONENT_EXPORT);
	},

	canRestartOpTools(user) {
		return ActionsHelper._actionCheck(user, constants.ACTION_OPTOOLS_RESTART);
	},

	canViewOpTools(user) {
		return ActionsHelper._actionCheck(user, constants.ACTION_OPTOOLS_VIEW);
	},

	canManageOpToolsSettings(user) {
		return ActionsHelper._actionCheck(user, constants.ACTION_OPTOOLS_SETTINGS);
	},

	canManageNotifications(user) {
		return ActionsHelper._actionCheck(user, constants.ACTION_NOTIFICATIONS_MANAGE);
	},

	canManageUsers(user) {
		return ActionsHelper._actionCheck(user, constants.ACTION_USERS_MANAGE);
	},

	_actionCheck(user, action) {
		if (user && user.authorized_actions) {
			return user.authorized_actions.includes(action);
		} else {
			return false;
		}
	},
};

export default ActionsHelper;
