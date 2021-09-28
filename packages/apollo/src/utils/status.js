/*
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

import _ from 'lodash';
import { showError, clearNotifications, setNodeStatus } from '../redux/commonActions';
import ComponentApi from '../rest/ComponentApi';
import { NodeRestApi } from '../rest/NodeRestApi';
import { RestApi } from '../rest/RestApi';

const RETRY_LIMIT = 15; // takes 4 minutes to give up
const RETRY_FREQUENCY = 5000;
const SCOPE = 'node_status';

const NodeStatus = {
	dispatch: null,
	in_progress: {},

	initialize(dispatch) {
		this.dispatch = dispatch;
	},

	getStatusFromPhase(id, resp) {
		const phase = _.get(resp, 'status.phase');
		let status = undefined;
		if (phase === 'Running' || phase === 'Pending') {
			const conditions = _.get(resp, 'status.conditions');
			let current = null;
			if (conditions) {
				conditions.forEach(condition => {
					if (condition.type && condition.lastTransitionTime && condition.status === 'True') {
						if (current) {
							if (new Date(condition.lastTransitionTime).getTime() > new Date(current.lastTransitionTime)) {
								current = condition;
							}
						} else {
							current = condition;
						}
					}
				});
			}
			if (current) {
				status = {
					id,
					status: current.type.toLowerCase(),
				};
			}
		}
		return status;
	},

	checkResources(node) {
		return new Promise((resolve, reject) => {
			ComponentApi.getComponent(node)
				.then(resp => {
					if (resp && resp.resource_warnings !== 'none' && resp.resource_warnings !== 'unknown') {
						if (this.dispatch) {
							this.dispatch(
								showError(
									'error_node_resource',
									{
										name: resp.parameters.display_name,
									},
									SCOPE
								)
							);
						}
						resolve({
							id: node.id,
							status: 'stopped',
						});
					} else {
						if ((node.type === 'fabric-orderer' || node.type === 'orderer') && node.consenter_proposal_fin === false) {
							NodeRestApi.getNodeDetailsFromDeployer(node.id)
								.then(() => {
									resolve({
										id: node.id,
										status: 'running',
									});
								})
								.catch(() => {
									resolve(this.getStatusFromPhase(node.id, resp));
								});
						} else {
							resolve(this.getStatusFromPhase(node.id, resp));
						}
					}
				})
				.catch(() => {
					resolve();
				});
		});
	},

	isStatusSupported(node) {
		if (node.type === 'fabric-ca' && node.api_url) {
			return true;
		}
		if (node.type === 'fabric-orderer' && node.operations_url) {
			return true;
		}
		if (node.type === 'fabric-peer' && node.operations_url) {
			return true;
		}
		if (node.type === 'ca' && node.api_url) {
			return true;
		}
		if (node.type === 'orderer' && node.operations_url) {
			return true;
		}
		if (node.type === 'peer' && node.operations_url) {
			return true;
		}
		return false;
	},

	updateStatus(id, status, scope, prop, callback) {
		if (this.dispatch && scope && prop) {
			this.dispatch(setNodeStatus(id, status, scope, prop));
		}
		if (callback) {
			switch (status) {
				case 'initialized':
				case 'ready':
				case 'containersready':
				case 'podscheduled':
					// deployer states should not trigger callbacks
					break;
				default:
					callback(id, status);
			}
		}
	},

	findNode(id, list) {
		let res = null;
		list.forEach(node => {
			if (node.raft) {
				node.raft.forEach(raftNode => {
					if (raftNode.id === id) {
						res = raftNode;
					}
				});
				if (node.pending) {
					node.pending.forEach(pendingNode => {
						if (pendingNode.id === id) {
							res = pendingNode;
						}
					});
				}
			} else {
				if (node.id === id) {
					res = node;
				}
			}
		});
		return res;
	},

	calcRetryDelay(lastRetryDelay, attempt) {
		// wait 15% more each time
		return Math.floor(lastRetryDelay * 1.15);
	},

	// make wrapper around old getStatus interface
	getStatus(data, scope, prop, callback, retryLimit, retryFreq) {
		// call the new interface
		this.getStatusInternal(data, scope, prop, retryLimit, retryFreq, 1, (err, resp) => {
			if (callback) {
				return callback(err, resp);
			}
		});
	},

	getStatusInternal(data, scope, prop, retryLimit, lastRetryDelay, attempt, callback) {
		if (!data) {
			return;
		}
		if (!_.isArray(data)) {
			return this.getStatus([data], scope, prop, callback, retryLimit, lastRetryDelay);
		}
		if (!retryLimit) {
			retryLimit = RETRY_LIMIT;
		}
		if (!lastRetryDelay) {
			lastRetryDelay = RETRY_FREQUENCY;
		}

		const components = {};
		const complete = {};
		let count = 0;
		data.forEach(node => {
			if (this.isStatusSupported(node)) {
				if (node.raft) {
					// for a RAFT ordering service, get the status of all of the nodes
					node.raft.forEach(raftNode => {
						if (this.isStatusSupported(raftNode)) {
							components[raftNode.id] = {
								include_status_resp: true,
								skip_cache: node.skip_cache,
							};
							count++;
						} else {
							this.updateStatus(raftNode.id, 'unknown', scope, prop, callback);
							complete[raftNode.id] = true;
						}
					});
					if (node.pending) {
						node.pending.forEach(pendingNode => {
							if (this.isStatusSupported(pendingNode)) {
								components[pendingNode.id] = {
									include_status_resp: true,
									skip_cache: node.skip_cache,
								};
								count++;
							} else {
								this.updateStatus(pendingNode.id, 'unknown', scope, prop, callback);
								complete[pendingNode.id] = true;
							}
						});
					}
				} else {
					components[node.id] = {
						include_status_resp: true,
						skip_cache: node.skip_cache,
					};
					count++;
				}
			} else {
				this.updateStatus(node.id, 'unknown', scope, prop, callback);
				complete[node.id] = true;
			}
		});
		if (count === 0) {
			// no nodes to check, so just return
			return;
		}
		// create a unique id based on the current time (in milliseconds) for this request
		const id = new Date().getTime().toString();
		this.in_progress[id] = true;

		RestApi.post('/api/v2/components/status', { components })
			.then(results => {
				if (this.in_progress[id]) {
					const resource_checks = [];
					Object.keys(results).forEach(id => {
						const node = this.findNode(id, data);
						if (node) {
							const resp_status = results && results[id] ? results[id].status : null;
							let status = null;

							if (typeof resp_status === 'string') {
								// if no status, fall through to retry logic
								status = resp_status.toLowerCase() === 'ok' ? 'running' : null;
								// all good, so return status
							}
							if (status) {
								this.updateStatus(id, status, scope, prop, callback);
								complete[id] = true;
							}

							if (!complete[id]) {
								// if we can't get the status for a saas node, then
								// check for resource issues or precreate state
								if (node.location === 'ibm_saas') {
									resource_checks.push(this.checkResources(node));
								}
							}
						}
					});
					Promise.all(resource_checks).then(results_list => {
						if (this.in_progress[id]) {
							results_list.forEach(result => {
								if (result && result.id) {
									this.updateStatus(result.id, result.status, scope, prop, callback);
									switch (result.status) {
										case 'initialized':
										case 'ready':
										case 'containersready':
										case 'podscheduled':
											// deployer states should not be marked complete
											break;
										default:
											complete[result.id] = true;
									}
								}
							});
							const retry = [];
							data.forEach(node => {
								if (node.raft) {
									node.raft.forEach(raftNode => {
										if (!complete[raftNode.id]) {
											retry.push({
												...raftNode,
												skip_cache: node.skip_cache,
											});
										}
									});
									if (node.pending) {
										node.pending.forEach(pendingNode => {
											if (!complete[pendingNode.id]) {
												retry.push({
													...pendingNode,
													skip_cache: node.skip_cache,
												});
											}
										});
									}
								} else {
									if (!complete[node.id]) {
										retry.push(node);
									}
								}
							});
							if (retry.length > 0) {
								if (retryLimit - attempt > 1) {
									if (!window.statusApiRetries) {
										window.statusApiRetries = {};
									}

									// store the timeouts where we can clear them after a logout
									// helps avoid the a api lockout
									const thisDelayMs = this.calcRetryDelay(lastRetryDelay, attempt);
									window.statusApiRetries[scope] = window.setTimeout(() => {
										if (this.in_progress[id]) {
											this.getStatusInternal(retry, scope, prop, retryLimit, thisDelayMs, ++attempt, callback);
											delete this.in_progress[id];
										}
									}, thisDelayMs);
								} else {
									retry.forEach(failed => {
										this.updateStatus(failed.id, 'unknown', scope, prop, callback);
									});
									delete this.in_progress[id];
								}
							}
						}
					});
				}
			})
			.catch(err => {
				if (this.in_progress[id]) {
					// if we can't reach Athena then just mark as unknown
					Object.keys(components).forEach(id => {
						this.updateStatus(id, 'unknown', scope, prop, callback);
					});
					delete this.in_progress[id];
				}
			});
	},

	cancel() {
		this.in_progress = {};
		if (this.dispatch) {
			this.dispatch(clearNotifications(SCOPE));
		}
	},
};

export default NodeStatus;
