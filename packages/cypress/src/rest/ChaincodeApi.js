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
import async from 'async';
import { promisify } from 'util';
import Logger from '../components/Log/Logger';
import { PeerRestApi } from './PeerRestApi';
const naturalSort = require('javascript-natural-sort');

const Log = new Logger('ChaincodeApi');

class ChaincodeApi {
	static async getAllChaincodes() {
		Log.info('Getting a list of peers to scan for installed chaincodes');
		const peers = await PeerRestApi.getPeersWithCerts();
		Log.info(`Got ${peers.length} peers to query for installed chaincodes`);
		const o_chaincodesList = {};
		const errors = [];

		await async.eachLimit(
			peers,
			6,
			// asyncify to get around babel converting these functions to non-async: https://caolan.github.io/async/v2/docs.html#asyncify
			async.asyncify(async peer => {
				if (!peer.private_key) {
					return;
				}
				const opts = {
					msp_id: peer.msp_id,
					client_cert_b64pem: peer.cert,
					client_prv_key_b64pem: peer.private_key,
					host: peer.url2use,
				};
				let resp;
				try {
					Log.info(`Getting installed chaincodes on peer ${peer.display_name}`);
					const getInstalledChaincode = promisify(window.stitch.getInstalledChaincode);
					resp = await getInstalledChaincode(opts);
					Log.info(`Got ${resp.data.chaincodesList.length} installed chaincode on peer ${peer.display_name}`);
					Log.info(`Installed chaincode on peer ${peer.display_name}:`, resp.data.chaincodesList); //todo change to debug
				} catch (error) {
					error.name = peer.display_name;
					error.id = peer.id;
					errors.push(error);
					return;
				}
				if (resp && resp.data && resp.data.chaincodesList) {
					for (let idx in resp.data.chaincodesList) {
						let chaincodeName = resp.data.chaincodesList[idx].name;
						let chaincodeVersion = resp.data.chaincodesList[idx].version;
						let cc_key = `${chaincodeName}_${chaincodeVersion}`;
						if (!o_chaincodesList[cc_key]) {
							o_chaincodesList[cc_key] = {
								id: cc_key,
								name: chaincodeName,
								version: chaincodeVersion,
								peers: [],
							};
						}
						o_chaincodesList[cc_key].peers.push({
							grpcwp_url: peer.grpcwp_url,
							url2use: peer.url2use,
							display_name: peer.display_name,
							id: peer.id,
							msp_id: peer.msp_id,
							backend_addr: peer.backend_addr,
							short_name: peer.short_name,
						});
					}
				}
			})
		);
		if (errors.length > 0) {
			Log.error('Could not get installed chaincodes on some peers:', errors);
		}
		let chaincodesList = [];
		let keys = Object.keys(o_chaincodesList);
		for (let idx in keys) {
			let ch = keys[idx];
			o_chaincodesList[ch].peerDisplay = o_chaincodesList[ch].peers.map(peer => peer.display_name).join(', ');
			chaincodesList.push(o_chaincodesList[ch]);
		}

		chaincodesList.sort((a, b) => {
			return naturalSort(a.name, b.name) || naturalSort(a.version, b.version);
		});

		Log.info('Collected installed chaincodes:', chaincodesList, '\nerrors:', errors);
		return {
			chaincodesList,
			errors,
		};
	}
}

export default ChaincodeApi;
