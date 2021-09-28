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
import Logger from '../components/Log/Logger';
import { updateState } from '../redux/commonActions';
import Helper from '../utils/helper';
import ChannelApi from './ChannelApi';
import { EventsRestApi } from './EventsRestApi';
import IdentityApi from './IdentityApi';
import { RestApi } from './RestApi';
import StitchApi from './StitchApi';

const uuidv4 = require('uuid/v4');
const Log = new Logger('SignatureRequestApi');

class SignatureRestApi {
	static dispatch = null;
	static scope = null;
	static optools_url = null;

	static checkRequest(request) {
		let last = request.timestamp;
		let needsAttention = false;
		let signature_count = 0;
		let orderer_signature_count = 0;
		let isLegacyCreateChannelNotification =
			!_.has(request, 'consenters') && // Signature request for channels created before 2.1.3 wont have the consenter info
			request.status === 'open' &&
			!request.ccd &&
			!request.json_diff; // Old check
		if (isLegacyCreateChannelNotification) {
			// Need to continue showing pending tile for channels that were created before migrating to v2.1.3
			request.status = 'closed';
		}
		if (request.status !== 'closed' && request.orgs2sign) {
			let org_can_sign = false;
			request.orgs2sign.forEach(entry => {
				if (entry.timestamp > last) {
					last = entry.timestamp;
				}
				if ((entry.admin || request.ccd) && entry.signature) {
					signature_count++;
				}
				if ((entry.admin || request.ccd) && entry.optools_url === SignatureRestApi.optools_url && !entry.signature) {
					org_can_sign = true;
				}
			});
			if (org_can_sign && request.current_policy.number_of_signatures > signature_count) {
				needsAttention = true;
			}
		}
		if (request.status !== 'closed' && request.orderers2sign) {
			let orderer_can_sign = false;
			request.orderers2sign.forEach(entry => {
				if (entry.timestamp > last) {
					last = entry.timestamp;
				}
				if (entry.signature) {
					orderer_signature_count++;
				}
				if (entry.optools_url === SignatureRestApi.optools_url && !entry.signature) {
					orderer_can_sign = true;
				}
			});
			if (orderer_can_sign && request.orderers2sign.length > orderer_signature_count) {
				needsAttention = true;
			}
			if (
				signature_count === 0 &&
				request.current_policy.number_of_signatures === 1 &&
				request.json_diff &&
				Helper.checkIfOnlyOrdererSignatureRequired(request.json_diff)
			) {
				signature_count++; // no signature required from channel admins
			}
		}
		if (request.status !== 'closed') {
			if (request.current_policy.number_of_signatures <= signature_count || _.has(request.json_diff, 'msp')) {
				if (request.orderers2sign) {
					if (request.orderers2sign.length <= orderer_signature_count) {
						// required orgs and orderers have signed, need to submit now
						needsAttention = true;
					}
				} else {
					// required orgs have signed, need to submit now
					needsAttention = true;
				}
			}
		}

		if (request.distribution_responses) {
			request.distribution_responses.forEach(entry => {
				if (entry.timestamp > last) {
					last = entry.timestamp;
				}
			});
		}
		request.signature_count = signature_count;
		request.orderer_signature_count = orderer_signature_count;
		request.lastTimestamp = last;
		request.needsAttention = needsAttention;
		if (request.visibility === 'archive') {
			// Archived requests should not trigger the needs attention indicator
			// but we still need to keep the needs attention flag on the request
			needsAttention = false;
		}
		return needsAttention;
	}

	static async getCreateChannelRequests(includeArchived) {
		const requests = [];
		try {
			const resp = await RestApi.get('/api/v2/signature_collections?skip_cache=yes');
			if (resp && resp.signature_collections) {
				resp.signature_collections.forEach(sc => {
					if (!sc.ccd && !sc.json_diff && sc.status === 'closed') {
						if (includeArchived || sc.visibility !== 'archive') {
							requests.push(sc);
						}
					}
				});
			}
		} catch (error) {
			if (error.statusCode === 404 && (error.msg === 'no components exist' || error.msg === 'no transactions exist')) {
				// this is okay
			} else {
				throw error;
			}
		}
		return requests;
	}

	static async getFixedRequests() {
		const resp = await RestApi.get('/api/v2/signature_collections?skip_cache=yes');
		let defs = {};
		for (let i = 0; i < resp.signature_collections.length; i++) {
			const request = resp.signature_collections[i];
			if (request.ccd && request.status === 'open') {
				// check if the definition has been committed (even though it's open)
				if (!defs[request.channel]) {
					defs[request.channel] = [];
					try {
						const channel = await ChannelApi.getChannel(request.channel);
						const peer = channel && channel.peers && channel.peers.length ? channel.peers[0] : null;
						const identity = peer ? await IdentityApi.getAssociatedIdentity(peer) : null;
						const orderer = channel && channel.orderers && channel.orderers.length ? channel.orderers[0] : null;
						if (peer && identity && orderer) {
							const opts = {
								msp_id: peer.msp_id,
								client_cert_b64pem: identity.cert,
								client_prv_key_b64pem: identity.private_key,
								host: peer.url2use,
								channel_id: request.channel,
							};
							const resp2 = await StitchApi.lc_getAllChaincodeDefinitionsOnChannel(opts);
							defs[request.channel] = _.get(resp2, 'data.chaincodeDefinitions') || [];
						}
					} catch (error) {
						Log.error(error);
					}
				}
				for (let k = 0; k < defs[request.channel].length; k++) {
					const def = defs[request.channel][k];
					if (def.name === request.ccd.chaincode_id && def.version === request.ccd.chaincode_version && def.sequence === request.ccd.chaincode_sequence) {
						// chaincode is committed, so mark as closed
						request.status = 'closed';
						try {
							const channel2 = await ChannelApi.getChannel(request.channel);
							const peer2 = channel2 && channel2.peers && channel2.peers.length ? channel2.peers[0] : null;
							const identity2 = peer2 ? await IdentityApi.getAssociatedIdentity(peer2) : null;
							if (peer2 && identity2) {
								await SignatureRestApi.closeRequest({
									msp_id: peer2.msp_id,
									client_cert_b64pem: identity2.cert,
									client_prv_key_b64pem: identity2.private_key,
									tx_id: request.tx_id,
								});
							}
						} catch (error) {
							Log.error(error);
						}
					}
				}
				// use the commit readiness call to verify that the
				// approvals are ok
				const approvals = await ChannelApi.checkChaincodeReadiness({
					channel_id: request.channel,
					...request.ccd,
				});
				// there is a timing issue when a chaincode proposal is first created, that the originating
				// organization does not show as approved for a few seconds.  we can work around this issue
				// by always marking the originator as approved
				approvals[request.originator_msp] = true;
				for (let j = 0; j < request.orgs2sign.length; j++) {
					let org = request.orgs2sign[j];
					if (!approvals[org.msp_id] && org.signature) {
						delete org.signature;
					}
				}
			}
		}
		return resp;
	}

	static getAllRequests(scope, dispatch, optools_url) {
		if (scope) {
			SignatureRestApi.scope = scope;
		}
		if (dispatch) {
			SignatureRestApi.dispatch = dispatch;
		}
		if (optools_url) {
			SignatureRestApi.optools_url = optools_url;
		}
		return new Promise((resolve, reject) => {
			this.getFixedRequests()
				.then(resp => {
					const requests = resp.signature_collections;
					let needsAttention = 0;
					requests.forEach(request => {
						if (SignatureRestApi.checkRequest(request)) {
							needsAttention++;
						}
					});
					requests.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
					if (SignatureRestApi.scope && SignatureRestApi.dispatch) {
						SignatureRestApi.dispatch(
							updateState(SignatureRestApi.scope, {
								requests,
								needsAttention,
							})
						);
					}
					resolve(resp.signature_collections);
				})
				.catch(error => {
					if (error.statusCode === 404 && (error.msg === 'no components exist' || error.msg === 'no transactions exist')) {
						resolve([]);
					}
					reject(error);
				});
		});
	}

	static getRequest(tx_id) {
		return new Promise((resolve, reject) => {
			RestApi.get('/api/v2/signature_collections/' + tx_id)
				.then(result => {
					resolve(result);
				})
				.catch(error => {
					reject(error);
				});
		});
	}

	//	const data = {
	//		channel_name: 'test',
	//		number_of_signatures: 2,
	//		originator: {
	//			msp_id: '',
	//			signature: ''
	//		},
	//		orgs: {
	//			msp_id: {
	//				msp_id: '',
	//				host_url: '',
	//				admins: [],
	//				roles: [],
	//			}
	//		},
	//		orderers: [{
	//			msp_id: '',
	//			host url: '',

	//		}],
	//		ordererUrls: [],
	//		protobuf: 'proto',
	//		json_diff: {}
	//	}
	static createRequest(data) {
		return new Promise((resolve, reject) => {
			const orderers = data.ordererUrls;
			const tx_id = 'sc_' + uuidv4();
			const originator_msp = data.originator.msp_id;
			const originator_private_key = data.originator.client_prv_key_b64pem;
			const originator_certificate = data.originator.client_cert_b64pem;
			const request = {
				channel: data.channel_name,
				timestamp: new Date().getTime(),
				originator_msp,
				authorize: {
					msp_id: originator_msp,
					certificate: originator_certificate,
				},
				orgs2sign: [],
				orderers,
				tx_id,
				distribute: 'all',
				status: 'open',
			};
			if (data.number_of_signatures) {
				request.current_policy = {
					number_of_signatures: data.number_of_signatures,
				};
			}
			if (data.ccd) {
				request.ccd = data.ccd;
			} else {
				request.proposal = window.stitch.uint8ArrayToBase64(data.protobuf);
				request.consenters = data.consenters;
				if (data.json_diff) {
					request.json_diff = data.json_diff;
				} else {
					request.status = 'closed';
				}
				request.orderers2sign = [];
			}
			for (let msp_id in data.orgs) {
				const org = data.orgs[msp_id];
				const peers = [];
				if (data.installed_peers && org.msp_id === data.originator.msp_id) {
					data.installed_peers.forEach(peer => {
						peers.push(peer.grpcwp_url); // do NOT use "url2use", might result in CORS issues
					});
				}
				request.orgs2sign.push({
					msp_id: org.msp_id,
					optools_url: org.host_url ? org.host_url + '/api/v1' : undefined,
					certificate: org.admins[0],
					signature: org.msp_id === data.originator.msp_id ? data.originator.signature : undefined,
					admin: data.ccd ? undefined : org.roles.indexOf('admin') !== -1,
					package_id: data.ccd && org.msp_id === data.originator.msp_id ? data.ccd.package_id : undefined,
					timestamp: request.timestamp,
					peers,
				});
			}
			if (data.orderers) {
				data.orderers.forEach(orderer => {
					request.orderers2sign.push({
						msp_id: orderer.msp_id,
						optools_url: orderer.host_url ? orderer.host_url + '/api/v1' : undefined,
						certificate: orderer.admins[0],
						signature: orderer.msp_id === data.originator.msp_id ? data.originator.signature : undefined,
						timestamp: request.timestamp,
					});
				});
			}

			StitchApi.buildSigCollectionAuthHeader(request, originator_private_key).then((authorization) => {
				const header = { Authorization: authorization };
				RestApi.post('/api/v2/signature_collections', request, header)
					.then(resp => {
						request.distribution_responses = _.isArray(resp.distribution_responses) ? resp.distribution_responses : [resp.distribution_responses];
						SignatureRestApi.getAllRequests();
						resolve(request);
					})
					.catch(error => {
						reject(error);
					});
			}).catch(error => {
				reject(error);
			});
		});
	}

	static async signChaincodeDefinitionRequest(request, opts) {
		const body = {
			distribute: 'all',
			orgs2sign: [
				{
					msp_id: opts.msp_id,
					optools_url: opts.optools_url,
					certificate: opts.certificate,
					signature: opts.signature,
					package_id: opts.package_id,
					timestamp: new Date().getTime(),
					peers: opts.installed_peers,
				},
			],
			orderers2sign: [],
		};
		body.authorize = {
			msp_id: opts.msp_id,
			certificate: opts.certificate,
		};
		const header = {
			Authorization: await StitchApi.buildSigCollectionAuthHeader(body, opts.private_key),
		};
		await RestApi.put('/api/v2/signature_collections/' + request.tx_id, body, header);
		SignatureRestApi.getAllRequests();
		return;
	}

	static signRequest(request, data) {
		return new Promise((resolve, reject) => {
			const body = {
				distribute: 'all',
				orgs2sign: [],
				orderers2sign: [],
			};
			let pending = data.length;
			let error = null;
			data.forEach(entry => {
				const opts = {
					client_cert_b64pem: entry.identity.cert,
					client_prv_key_b64pem: entry.identity.private_key,
					protobuf: window.stitch.base64ToUint8Array(request.proposal),
					msp_id: entry.org.msp_id,
				};

				const signer_msp = opts.msp_id;
				const signer_certificate = opts.client_cert_b64pem;
				const signer_private_key = opts.client_prv_key_b64pem;

				window.stitch.signConfigUpdate(opts, async(err, resp) => {
					if (err || !resp) {
						error = err || 'signature failed';
					} else {
						let toPush = [];
						if (entry.type === 'orgs') {
							toPush = body.orgs2sign;
						} else {
							toPush = body.orderers2sign;
						}
						toPush.push({
							msp_id: entry.org.msp_id,
							admin: entry.org.admin,
							optools_url: entry.org.optools_url,
							certificate: entry.org.certificate,
							signature: resp,
							timestamp: new Date().getTime(),
						});
					}
					pending--;
					if (pending < 1) {
						if (error) {
							reject(error);
						} else {
							body.authorize = {
								msp_id: signer_msp,
								certificate: signer_certificate,
							};
							const header = {
								Authorization: await StitchApi.buildSigCollectionAuthHeader(body, signer_private_key),
							};

							RestApi.put('/api/v2/signature_collections/' + request.tx_id, body, header)
								.then(() => {
									SignatureRestApi.getAllRequests();
									resolve();
								})
								.catch(error => {
									reject(error);
								});
						}
					}
				});
			});
		});
	}

	static redistributeRequest(request) {
		return new Promise((resolve, reject) => {
			const body = {};
			RestApi.put('/api/v2/signature_collections/' + request.tx_id + '/resend', body)
				.then(resp => {
					resolve(request);
				})
				.catch(error => {
					reject(error);
				});
		});
	}

	static async deleteRequest(request) {
		const body = {
			tx_id: request.tx_id,
			authorize: {
				msp_id: request.msp_id,
				certificate: request.client_cert_b64pem,
			},
		};
		const header = {
			Authorization: await StitchApi.buildSigCollectionAuthHeader(body, request.client_prv_key_b64pem),
		};
		return new Promise((resolve, reject) => {
			RestApi.delete('/api/v2/signature_collections/' + request.tx_id, body, header)
				.then(resp => {
					resolve(request);
				})
				.catch(error => {
					reject(error);
				});
		});
	}

	static closeRequest(request) {
		return new Promise((resolve, reject) => {
			const body = {
				distribute: 'all',
				orgs2sign: [],
				status: 'closed',
			};
			body.authorize = {
				msp_id: request.msp_id,
				certificate: request.client_cert_b64pem,
			};

			StitchApi.buildSigCollectionAuthHeader(body, request.client_prv_key_b64pem).then((authorization) => {
				const header = { Authorization: authorization };
				RestApi.put('/api/v2/signature_collections/' + request.tx_id, body, header)
					.then(resp => {
						SignatureRestApi.getAllRequests();
						resolve();
					})
					.catch(error => {
						reject(error);
					});
			}).catch(error => {
				reject(error);
			});
		});
	}

	static toggleVisibility(requestBody) {
		return new Promise((resolve, reject) => {
			RestApi.put('/api/v2/signature_collections/bulk/visibility', requestBody)
				.then(() => {
					resolve(requestBody);
				})
				.catch(error => {
					reject(error);
				});
		});
	}

	static submitRequest(request, msp, identity) {
		const signatures = [];
		request.orgs2sign.forEach(entry => {
			if (entry.admin && entry.signature) {
				signatures.push(entry.signature);
			}
		});
		request.orderers2sign.forEach(entry => {
			if (entry.signature) {
				signatures.push(entry.signature);
			}
		});
		return new Promise((resolve, reject) => {
			const opts = {
				msp_id: msp.msp_id,
				client_cert_b64pem: identity.cert,
				client_prv_key_b64pem: identity.private_key,
				orderer_host: request.orderers[0],
				config_update: window.stitch.base64ToUint8Array(request.proposal),
				config_update_signatures: signatures,
			};
			const submitter_msp = opts.msp_id;
			const submitter_certificate = opts.client_cert_b64pem;
			const submitter_private_key = opts.client_prv_key_b64pem;
			window.stitch.submitConfigUpdate(opts, async(err, resp) => {
				if (err || !resp) {
					reject(err);
				} else {
					const body = {
						distribute: 'all',
						orgs2sign: [],
						status: 'closed',
					};
					body.authorize = {
						msp_id: submitter_msp,
						certificate: submitter_certificate,
					};
					const header = {
						Authorization: await StitchApi.buildSigCollectionAuthHeader(body, submitter_private_key),
					};

					// send async event... don't wait
					EventsRestApi.sendUpdateChannelEvent(opts.channel_id, opts.msp_id);
					RestApi.put('/api/v2/signature_collections/' + request.tx_id, body, header)
						.then(resp => {
							SignatureRestApi.getAllRequests();
							resolve();
							if (SignatureRestApi.scope && SignatureRestApi.dispatch) {
								SignatureRestApi.dispatch(
									updateState('channelDetails', {
										updatedChannel: request.channel,
									})
								);
							}
						})
						.catch(error => {
							reject(error);
						});
				}
			});
		});
	}
}

export default SignatureRestApi;
