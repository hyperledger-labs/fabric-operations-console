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
import { CLEAR_NOTIFICATIONS, SHOW_NOTIFICATION, UPDATE_STATE, SHOW_BREADCRUMB, UPDATE_BREADCRUMB, SET_NODE_STATUS } from './actions';

export const updateState = (scope, data) => {
	return {
		type: UPDATE_STATE,
		payload: {
			scope,
			data,
		},
	};
};

export const showError = (message, options, scope, details, autoClose) => {
	// Support showing translated `Error` instances with showError(error, scope, autoClose)
	if (message instanceof Error) {
		autoClose = !!scope;
		scope = options;

		return {
			type: SHOW_NOTIFICATION,
			payload: {
				type: 'error',
				error: message,
				scope,
				autoClose,
			},
		};
	}
	return {
		type: SHOW_NOTIFICATION,
		payload: {
			type: 'error',
			message,
			details,
			options,
			scope,
			autoClose,
		},
	};
};

export const showWarning = (message, options, scope, details, autoClose) => {
	return {
		type: SHOW_NOTIFICATION,
		payload: {
			type: 'warning',
			message,
			details,
			options,
			scope,
			autoClose,
		},
	};
};

export const showSuccess = (message, options, scope, details, autoClose) => {
	return {
		type: SHOW_NOTIFICATION,
		payload: {
			type: 'success',
			message,
			details,
			options,
			scope,
			autoClose: autoClose === undefined ? true : autoClose,
		},
	};
};

export const showInfo = (message, options, scope, details, autoClose, loading, customMessage) => {
	return {
		type: SHOW_NOTIFICATION,
		payload: {
			type: 'info',
			message,
			details,
			options,
			scope,
			autoClose,
			loading,
			customMessage,
		},
	};
};

export const clearNotifications = scope => {
	return {
		type: CLEAR_NOTIFICATIONS,
		payload: scope,
	};
};

export const showBreadcrumb = (message, options, path, root) => {
	return {
		type: SHOW_BREADCRUMB,
		payload: {
			message,
			options,
			path,
			root,
		},
	};
};

export const updateBreadcrumb = (message, options, path) => {
	return {
		type: UPDATE_BREADCRUMB,
		payload: {
			message,
			options,
			path,
		},
	};
};

export const setNodeStatus = (id, status, scope, prop) => {
	return {
		type: SET_NODE_STATUS,
		payload: {
			id,
			status,
			scope,
			prop,
		},
	};
};
