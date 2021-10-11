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
import async from 'async';
import _ from 'lodash';
import { promisify } from 'util';
import Logger from '../components/Log/Logger';
import Helper from '../utils/helper';
import ChannelApi from './ChannelApi';
import { NodeRestApi } from './NodeRestApi';
import StitchApi from './StitchApi';

const semver = require('semver');
const naturalSort = require('javascript-natural-sort');
const Log = new Logger('PeerRestApi');

const PEER_TYPE = 'fabric-peer';
const LEGACY_PEER_TYPE = 'peer';

class PeerRestApi {
	static async getPeers(skip_cache) {
		return NodeRestApi.getNodes('fabric-peer', skip_cache);
	}

	static async getPeersWithCerts(skip_cache) {
		let peers;
		try {
			peers = await PeerRestApi.getPeers(skip_cache);
		} catch (error) {
			Log.error(error);
			throw error;
		}

		try {
			await async.eachLimit(
				peers,
				6,
				// asyncify to get around babel converting these functions to non-async: https://caolan.github.io/async/v2/docs.html#asyncify
				async.asyncify(async peer => {
					const peerDetails = await PeerRestApi.getPeerDetails(peer.id, true);
					if (peerDetails && peerDetails.private_key) {
						peer.private_key = peerDetails.private_key;
						peer.cert = peerDetails.cert;
					}
				})
			);
		} catch (error) {
			Log.error(error);
			throw error;
		}
		return peers;
	}

	static async getPeerDetails(id, includePrivateKeyAndCert) {
		return NodeRestApi.getNodeDetails(id, includePrivateKeyAndCert);
	}

	static async startPeer(peerId) {
		throw new Error('Feature not supported yet');
	}

	static async stopPeer(peerId) {
		throw new Error('Feature not supported yet');
	}

	/**
	 * If the component was imported, the record is cleaned up.  If the component was created, the associated k8s resources and the component will both be
	 * removed.
	 * @param {Component} peer The peer to be removed.
	 * @param {boolean} [force] If true, the record will be removed regardless of whether the k8s resource was successfully removed.
	 * @return {Promise<DeleteComponentResponse|RestApiError>} A Promise the resolves with the response from the server or rejects with an error describing what
	 * went wrong.
	 */
	static async removePeer(peer, force) {
		if (NodeRestApi.isCreatedComponent(peer)) {
			return NodeRestApi.deleteComponent(peer.id, force);
		} else {
			return NodeRestApi.removeComponent(peer.id);
		}
	}

	static async getChannels(id) {
		const nodes = await NodeRestApi.getNodes();
		const peer = await PeerRestApi.getPeerDetails(id, true);
		const msp_id = peer.msp_id;
		const private_key = peer.private_key;
		const cert = peer.cert;
		const url = peer.url2use;

		if (!private_key) {
			// todo translate
			throw new Error('Unable to get channels from peer. Missing certificate.');
		}
		const opts = {
			msp_id: msp_id,
			client_cert_b64pem: cert,
			client_prv_key_b64pem: private_key,
			host: url,
		};

		let resp;
		try {
			const getChannelsOnPeer = promisify(window.stitch.getChannelsOnPeer);
			resp = await getChannelsOnPeer(opts);
		} catch (error) {
			Log.error(error);
			const statusMessage = _.get(error, 'grpc_resp.statusMessage');
			if (statusMessage && statusMessage.indexOf('access denied') !== -1) {
				error.message_key = 'channel_forbidden';
			}
			error.peerName = peer.name;
			throw error;
		}

		const channelList = [];
		try {
			await async.eachLimit(
				resp.data.channelsList,
				6,
				// asyncify to get around babel converting these functions to non-async: https://caolan.github.io/async/v2/docs.html#asyncify
				async.asyncify(async obj => {
					const newopts = {
						...opts,
						channel_id: obj.channelId,
					};

					let resp2;
					try {
						const getChannelInfoFromPeer = promisify(window.stitch.getChannelInfoFromPeer);
						resp2 = await getChannelInfoFromPeer(newopts);
					} catch (error) {
						Log.error(error);
						channelList.push({
							id: obj.channelId,
						});
						return;
					}
					const newopts2 = {
						...opts,
						channel_id: obj.channelId,
					};

					let resp3;
					try {
						const getChannelConfigFromPeer = promisify(window.stitch.getChannelConfigFromPeer);
						resp3 = await getChannelConfigFromPeer(newopts2);
					} catch (e3) {
						Log.error(e3);
						return;
					}
					let config_envelop = resp3.data.block.data.data_list[0].envelope.payload.data;
					const l_orderers = ChannelApi.getOrdererAddresses(config_envelop.config);
					let orderers = [];
					l_orderers.forEach(orderer => {
						nodes.forEach(node => {
							// Also check the raft nodes within the ordering service
							let matchingRaftNode = false;
							if (node.raft && node.raft.length > 0) {
								matchingRaftNode = node.raft.find(x => _.toLower(x.backend_addr) === _.toLower(orderer));
							}
							if (_.toLower(node.backend_addr) === _.toLower(orderer) || matchingRaftNode) {
								if (!orderers.find(x => x.id === node.id)) {
									orderers.push(node);
								}
							}
						});
					});
					channelList.push({
						id: obj.channelId,
						block_height: resp2.data.height,
						orderers: orderers,
					});
				})
			);
		} catch (error) {
			Log.error(error);
		}

		channelList.sort((a, b) => {
			return naturalSort(a.id, b.id);
		});
		resp.data.channelList = channelList;
		return resp.data;
	}

	static async getChannelInfoFromPeer(id, channelId) {
		const peer = await PeerRestApi.getPeerDetails(id, true);
		const msp_id = peer.msp_id;
		const private_key = peer.private_key;
		const cert = peer.cert;
		const url = peer.url2use;

		if (!private_key) {
			// todo translate
			throw new Error('Unable to get channel information from peer. Missing certificate.');
		}
		const opts = {
			msp_id: msp_id,
			client_cert_b64pem: cert,
			client_prv_key_b64pem: private_key,
			host: url,
			channel_id: channelId,
		};
		try {
			const getChannelInfoFromPeer = promisify(window.stitch.getChannelInfoFromPeer);
			return (await getChannelInfoFromPeer(opts)).data;
		} catch (error) {
			Log.error(error);
			// todo shouldn't we throw this error?
		}
	}

	static async getInstalledChaincode(id) {
		const peer = await PeerRestApi.getPeerDetails(id, true);
		const msp_id = peer.msp_id;
		const private_key = peer.private_key;
		const cert = peer.cert;
		const url = peer.url2use;

		if (!private_key) {
			// todo translate
			throw new Error('Unable to get installed smart contracts from peer. Missing certificate.');
		}
		const opts = {
			msp_id: msp_id,
			client_cert_b64pem: cert,
			client_prv_key_b64pem: private_key,
			host: url,
		};

		try {
			const v1data = (await StitchApi.getInstalledChaincode(opts)).data;
			let v2data = undefined;
			if (peer.version && semver.gte(semver.coerce(peer.version), semver.coerce('2.0'))) {
				try {
					v2data = (await StitchApi.lc_getAllInstalledChaincodeData(opts)).data;
				} catch (e) {
					Log.error(e);
					v2data = {};
					v2data.error = e;
				}
			}
			return { v1data, v2data };
		} catch (error) {
			Log.error(error);
			const translation = {
				title: 'error_getting_chaincodes',
				translation_opts: {
					peerName: peer.display_name,
				},
				details: null,
			};
			if (
				error &&
				error.grpc_resp &&
				error.grpc_resp.statusMessage &&
				(error.grpc_resp.statusMessage.indexOf('This identity is not an admin') !== -1 ||
					error.grpc_resp.statusMessage.indexOf('Failed verifying that proposal\'s creator satisfies local MSP principal') !== -1)
			) {
				translation.details = 'error_chaincode2';
			}
			error.translation = translation;
			throw error;
		}
	}

	static async installChaincode(id, cc_package, v2_lifecycle) {
		const peer = await PeerRestApi.getPeerDetails(id, true);

		if (!peer.private_key) {
			// todo translate
			throw new Error('Unable to install smart contracts on peer. Missing certificate.');
		}
		const opts = {
			msp_id: peer.msp_id,
			client_cert_b64pem: peer.cert,
			client_prv_key_b64pem: peer.private_key,
			host: peer.url2use,
		};
		if (v2_lifecycle) {
			opts.chaincode_lifecycle_package = cc_package;
		} else {
			opts.chaincode_package = cc_package;
		}

		try {
			const lc_installChaincode = v2_lifecycle ? promisify(window.stitch.lc_installChaincode) : promisify(window.stitch.installChaincode);
			const installChaincode = await lc_installChaincode(opts);
			return installChaincode.data;
		} catch (error) {
			Log.error(error);
			if (error && error.grpc_resp && error.grpc_resp.statusMessage) {
				if (error.grpc_resp.statusMessage.indexOf('successfully installed') !== -1) {
					Log.info(`smart contract already installed on peer "${peer.display_name}"`);
					return {};
				} else {
					throw error;
				}
			}
			throw error;
		}
	}

	static async downloadChaincode(id, package_id) {
		const peer = await PeerRestApi.getPeerDetails(id, true);

		if (!peer.private_key) {
			// todo translate
			throw new Error('Unable to install smart contracts on peer. Missing certificate.');
		}
		const opts = {
			msp_id: peer.msp_id,
			client_cert_b64pem: peer.cert,
			client_prv_key_b64pem: peer.private_key,
			host: peer.url2use,
			package_id,
		};

		try {
			return (await StitchApi.lc_getInstalledChaincodePackage(opts)).data;
		} catch (error) {
			Log.error(error);
			throw error;
		}
	}
	static b64toBlob(b64Data, contentType = '', sliceSize = 512) {
		const byteCharacters = atob(b64Data);
		const byteArrays = [];
		for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
			const slice = byteCharacters.slice(offset, offset + sliceSize);
			const byteNumbers = new Array(slice.length);
			for (let i = 0; i < slice.length; i++) {
				byteNumbers[i] = slice.charCodeAt(i);
			}

			const byteArray = new Uint8Array(byteNumbers);
			byteArrays.push(byteArray);
		}
		const blob = new Blob(byteArrays, { type: contentType });
		return blob;
	}
	/*
	 * Export data as a text .tar.gz file
	 */
	static exportZip(name, data) {
		let fileName = name + '.tar.gz';
		let blob = PeerRestApi.b64toBlob(data, 'application/octet-stream');
		const createTarget = document.querySelector('.side__panel--outer--container') || document.body;
		let link = document.createElement('a');
		if (link.download !== undefined) {
			let url = URL.createObjectURL(blob);
			link.setAttribute('href', url);
			link.setAttribute('download', fileName);
			link.style.visibility = 'hidden';
			createTarget.appendChild(link);
			link.click();
			createTarget.removeChild(link);
		}
	}

	static parseChaincodePackage(cc_package) {
		return window.stitch.parseChaincodePackage(cc_package);
	}

	static async joinChannel(peers, orderer, channel) {
		const details = peers.map(async peer => {
			return PeerRestApi.getPeerDetails(peer.id, true);
		});
		const peerDetails = await Promise.all(details);

		const join = peerDetails.map(async pd => {
			if (pd.cert && pd.private_key) {
				const opts = {
					msp_id: pd.msp_id,
					client_cert_b64pem: pd.cert,
					client_prv_key_b64pem: pd.private_key,
					host: pd.url2use,
					orderer_host: orderer.url2use,
					channel_id: channel,
				};
				try {
					const joinPeerToChannel = promisify(window.stitch.joinPeerToChannel);
					return await joinPeerToChannel(opts);
				} catch (error) {
					Log.error(error);
					const e = new Error('joinPeerToChannel failed');
					e.error = error;
					e.peer = pd;
					throw e;
				}
			} else {
				const message = pd.name.concat(' is not associated with an identity.');
				const error = new Error(message);
				error.error = message;
				error.peer = pd;
				throw error;
			}
		});
		await Promise.all(join);
	}

	/**
	 * Imports the given Peers.
	 * @param {ExportedPeer[]|FabricPeer[]} exported_peers A list of Peers to be imported.
	 * @return {Promise<FabricPeer[]>} A Promise that resolves with the list of imported Peer records.
	 */
	static async importPeer(exported_peers) {
		const all = exported_peers.map(async some_peer_record => {
			const exportedPeer = {
				type: 'fabric-peer',
				display_name: some_peer_record.display_name,
				api_url: some_peer_record.api_url,
				operations_url: some_peer_record.operations_url,
				location: some_peer_record.location,
				grpcwp_url: Helper.normalizeHttpURL(some_peer_record.grpcwp_url),
				msp_id: some_peer_record.msp_id,
				msp: some_peer_record.msp,
			};
			if (!_.get(exportedPeer, 'msp.component.tls_cert')) {
				_.set(exportedPeer, 'msp.component.tls_cert', some_peer_record.tls_cert);
			}
			if (!_.get(exportedPeer, 'msp.tlsca.root_certs')) {
				_.set(exportedPeer, 'msp.tlsca.root_certs', [some_peer_record.tls_ca_root_cert || some_peer_record.pem]);
			}
			return NodeRestApi.importComponent(exportedPeer);
		});
		return Promise.all(all);
	}

	static buildConfigOverride(data) {
		const config_override = {};
		if (data.hsm) {
			let bccsp = {
				Default: 'PKCS11',
				PKCS11: {
					Label: data.hsm.label,
					Pin: data.hsm.pin,
				},
			};
			_.set(config_override, 'peer.BCCSP', bccsp);
		}
		return config_override;
	}

	static async updateConfigOverride(peer) {
		return NodeRestApi.updateConfigOverride(peer);
	}

	static async updatePeer(peer) {
		peer.grpcwp_url = Helper.fixURL(peer.grpcwp_url);
		await NodeRestApi.updateNode(peer);
		return this.getPeerDetails(peer.id, false);
	}

	static async createPeer(data) {
		let node = {
			display_name: data.display_name,
			type: 'fabric-peer',
			msp_id: data.admin_msp.msp_id,
			crypto: data.saas_ca
				? {
					enrollment: {
						ca: {
							host: Helper.getHostname(data.saas_ca.api_url),
							port: Helper.getPort(data.saas_ca.api_url),
							name: data.saas_ca.msp.ca.name,
							tls_cert: data.saas_ca.msp.component.tls_cert,
							enroll_id: data.enroll_id,
							enroll_secret: data.enroll_secret,
						},
						tlsca: {
							host: Helper.getHostname(data.tls_saas_ca.api_url),
							port: Helper.getPort(data.tls_saas_ca.api_url),
							name: _.get(data.tls_saas_ca, 'msp.tlsca.name') || data.tls_saas_ca.msp.ca.name,
							tls_cert: data.tls_saas_ca.msp.component.tls_cert,
							enroll_id: data.tls_enroll_id,
							enroll_secret: data.tls_enroll_secret,
							csr_hosts: data.tls_csr_hostname ? [data.tls_csr_hostname] : [],
						},
						component: {
							admin_certs: data.admin_msp.admins,
						},
					},
				  }
				: {
					msp: {
						ca: {
							root_certs: data.admin_msp.root_certs,
							intermediate_certs: data.admin_msp.intermediate_certs ? data.admin_msp.intermediate_certs : [],
						},
						tlsca: {
							root_certs: data.admin_msp.tls_root_certs,
							intermediate_certs: data.admin_msp.tls_intermediate_certs ? data.admin_msp.tls_intermediate_certs : [],
						},
						component: {
							ekey: data.saas_ca_private_key,
							ecert: data.saas_ca_cert,
							tls_key: data.tls_ca_private_key,
							tls_cert: data.tls_ca_cert,
							admin_certs: data.admin_msp.admins,
						},
					},
				  },
		};
		if (data.clusterType === 'paid') {
			node.resources = {
				peer: {
					requests: {
						cpu: data.usage.peer.cpu,
						memory: data.usage.peer.memory + 'M',
					},
				},
				couchdb: {
					requests: {
						cpu: data.usage.couchdb.cpu,
						memory: data.usage.couchdb.memory + 'M',
					},
				},
				proxy: {
					requests: {
						cpu: data.usage.proxy.cpu,
						memory: data.usage.proxy.memory + 'M',
					},
				},
			};

			if (data.usage.dind && data.usage.dind.cpu) {
				node.resources.dind = {
					requests: {
						cpu: data.usage.dind.cpu,
						memory: data.usage.dind.memory + 'M',
					},
				};
			}

			if (data.usage.chaincodelauncher && data.usage.chaincodelauncher.cpu) {
				node.resources.chaincodelauncher = {
					requests: {
						cpu: data.usage.chaincodelauncher.cpu,
						memory: data.usage.chaincodelauncher.memory + 'M',
					},
				};
			}

			node.storage = {
				peer: {
					size: data.usage.peer.storage + 'Gi',
				},
			};
			if (data.statedb === 'leveldb') {
				node.storage.couchdb = {
					size: data.usage.leveldb.storage + 'Gi',
				};
			} else {
				node.storage.couchdb = {
					size: data.usage.couchdb.storage + 'Gi',
				};
			}
		}
		if (data.version) {
			node.version = data.version;
		}
		if (data.zone) node.zone = data.zone;
		if (data.statedb) node.state_db = data.statedb;
		_.set(node, 'config_override', data.config_override ? data.config_override : PeerRestApi.buildConfigOverride(data));
		if (data.hsm && data.hsm.pkcs11endpoint) {
			_.set(node, 'hsm.pkcs11endpoint', data.hsm.pkcs11endpoint);
		}
		return NodeRestApi.createSaasNode(node);
	}

	static async checkHealth(peer) {
		return NodeRestApi.checkHealth(peer);
	}
}

export { PeerRestApi, PEER_TYPE, LEGACY_PEER_TYPE };
