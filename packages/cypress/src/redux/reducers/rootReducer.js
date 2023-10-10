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
import { SHOW_NOTIFICATION, UPDATE_STATE, CLEAR_NOTIFICATIONS, SHOW_BREADCRUMB, SET_NODE_STATUS, UPDATE_BREADCRUMB } from '../actions';
import _ from 'lodash';

function getRaftStatus(node) {
	if (!node.raft) {
		return false;
	}
	let status = false;
	let first = true;
	node.raft.forEach(raftNode => {
		if (first) {
			status = raftNode.status;
			first = false;
		} else {
			if (raftNode.status !== status) {
				if (raftNode.status === 'running') {
					status = 'running_partial';
				} else {
					if (status === 'running') {
						status = 'running_partial';
					}
				}
			}
		}
	});
	if (node.pending) {
		node.pending.forEach(pendingNode => {
			if (first) {
				status = pendingNode.status;
				first = false;
			} else {
				if (pendingNode.status !== status) {
					if (pendingNode.status === 'running') {
						status = 'running_partial';
					} else {
						if (status === 'running') {
							status = 'running_partial';
						}
					}
				}
			}
		});
	}
	return status;
}

export default function rootReducer(state = {}, action) {
	let newState;
	switch (action.type) {
		case UPDATE_STATE:
			newState = {
				...state,
			};
			if (action.payload && action.payload.scope) {
				newState[action.payload.scope] = {
					...newState[action.payload.scope],
					...action.payload.data,
				};
			}
			return newState;
		case SHOW_NOTIFICATION:
			newState = {
				...state,
			};
			if (action.payload.type && (action.payload.message || action.payload.error)) {
				let newList = [];
				if (!newState.notifications) {
					newState.notifications = {};
				}
				if (newState.notifications.list) {
					newList = [...newState.notifications.list];
				}
				newList.push({
					id: new Date().getTime(),
					...action.payload,
				});
				newState.notifications.list = newList;
			}
			return newState;
		case CLEAR_NOTIFICATIONS:
			newState = {
				...state,
			};
			if (!newState.notifications) {
				newState.notifications = {};
			}
			if (action.payload) {
				const list = [];
				if (newState.notifications.list) {
					newState.notifications.list.forEach(notify => {
						if (notify.scope !== action.payload) {
							list.push(notify);
						}
					});
				}
				newState.notifications.list = list;
			} else {
				newState.notifications.list = [];
			}
			return newState;
		case SHOW_BREADCRUMB:
			newState = {
				...state,
			};
			if (!newState.breadcrumb || action.payload.root) {
				newState.breadcrumb = {
					list: [],
				};
			}
			if (newState.breadcrumb.list.length > 1) {
				const prev = newState.breadcrumb.list[newState.breadcrumb.list.length - 2];
				if (prev.path === action.payload.path) {
					// the new breadcrumb matches the previous breadcrumb, so this is
					// probably the user clicking the back button (and we just need to remove
					// the last entry)
					newState.breadcrumb.list.pop();
					newState.breadcrumb.list = [...newState.breadcrumb.list];
					return newState;
				}
			}
			if (newState.breadcrumb.list.length > 0) {
				const last = newState.breadcrumb.list[newState.breadcrumb.list.length - 1];
				if (last.path === action.payload.path) {
					// the new breadcrumb matchs the last breadcrumb, so we need to
					// remove the old entry and use the new one (in case something changed)
					newState.breadcrumb.list.pop();
				} else if (last.path.indexOf(action.payload.path) === 0) {
					// the last breadcrumb appears to be a "child" of the new breadcrumb,
					// so this is probably a case of the user reloading the page and then
					// hitting the back button (so we should remove the child entry before
					// adding the new breadcrumb)
					newState.breadcrumb.list.splice(newState.breadcrumb.length - 1, 1);
				}
			}
			newState.breadcrumb.list = [...newState.breadcrumb.list, action.payload];
			return newState;
		case UPDATE_BREADCRUMB:
			newState = {
				...state,
			};
			if (newState.breadcrumb && newState.breadcrumb.list) {
				newState.breadcrumb.list.forEach(crumb => {
					if (crumb.path === action.payload.path) {
						crumb.message = action.payload.message;
						crumb.options = action.payload.options;
					}
				});
				newState.breadcrumb.list = [...newState.breadcrumb.list];
			}
			return newState;
		case SET_NODE_STATUS:
			newState = {
				...state,
			};
			if (action.payload && action.payload.scope && action.payload.prop) {
				let data = _.get(state, action.payload.scope + '.' + action.payload.prop);
				if (data) {
					if (_.isArray(data)) {
						let found = false;
						data.forEach(node => {
							if (node.raft) {
								node.raft.forEach(raftNode => {
									if (raftNode.id === action.payload.id) {
										raftNode.status = action.payload.status;
										found = true;
										node.status = getRaftStatus(node);
									}
								});
								if (node.pending) {
									node.pending.forEach(pendingNode => {
										if (pendingNode.id === action.payload.id) {
											pendingNode.status = action.payload.status;
											found = true;
											node.status = getRaftStatus(node);
										}
									});
								}
							} else {
								if (node.id === action.payload.id) {
									node.status = action.payload.status;
									found = true;
								}
							}
						});
						if (found) {
							newState[action.payload.scope][action.payload.prop] = [...data];
						}
					} else {
						if (data.raft) {
							data.raft.forEach(raftNode => {
								if (raftNode.id === action.payload.id) {
									raftNode.status = action.payload.status;
									newState[action.payload.scope][action.payload.prop] = {
										...data,
										status: getRaftStatus(data),
									};
								}
							});
							if (data.pending) {
								data.pending.forEach(pendingNode => {
									if (pendingNode.id === action.payload.id) {
										pendingNode.status = action.payload.status;
										newState[action.payload.scope][action.payload.prop] = {
											...data,
											status: getRaftStatus(data),
										};
									}
								});
							}
						} else {
							if (data.id === action.payload.id) {
								newState[action.payload.scope][action.payload.prop] = {
									...data,
									status: action.payload.status,
								};
							}
						}
					}
				}
			}
			return newState;
		default:
			return state;
	}
}
