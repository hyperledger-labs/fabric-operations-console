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
import _ from 'lodash';
import StitchApi from './StitchApi';
const Log = new Logger('ChannelParticipationApi');
import Logger from '../components/Log/Logger';

export class ChannelParticipationApi {
	// --------------------------------------------------------
	// returns the identity object that has a matching cert
	// --------------------------------------------------------
	/*
	opts: {
		identities: [{
			cert: "<base 64 PEM>",
		}],
		root_certs_b64pems: ["<base 64 PEM>"]
	}
	*/
	static async findMatchingIdentity(opts) {
		if (Array.isArray(opts.identities) && Array.isArray(opts.root_certs_b64pems)) {
			for (let i in opts.identities) {
				if (opts.identities[i].cert) {
					const match = await StitchApi.isIdentityFromRootCert({
						certificate_b64pem: opts.identities[i].cert,
						root_certs_b64pems: opts.root_certs_b64pems,
					});
					if (match) {
						return opts.identities[i];
					}
				}
			}
		}
		Log.error('unable to match any identities to a any provided root certs. 0 matches....', opts);
		return null;
	}

	// --------------------------------------------------------
	// Fabric's osnadmin get-channels request - hard coded in stitch to use the athena proxy route
	// --------------------------------------------------------
	// identities - list of possible identities for auth - array of identity objects
	// osn - the ordering service node to use - a optools node object
	static async _getChannels(identities, osn) {
		const identity4tls = await ChannelParticipationApi.findMatchingIdentity({
			identities: identities,
			root_certs_b64pems: _.get(osn, 'msp.tlsca.root_certs')
		});

		if (identity4tls !== null) {
			try {
				const opts = {
					host: osn.osnadmin_url,
					certificate_b64pem: identity4tls.cert,
					private_key_b64pem: identity4tls.private_key,
					root_cert_b64pem: _.get(osn, 'msp.tlsca.root_certs[0]'),
					skip_cache: true,
				};
				return await StitchApi.getOSNChannels(opts);
			} catch (error) {
				Log.error('req error - unable to get osn channels:', error);
			}
		}
		Log.error('unable to get osn channels data for node', osn.osnadmin_url);
		return null;
	}

	// --------------------------------------------------------
	// Iter over nodes and perform Fabric's osnadmin get-channels request - hard coded in stitch to use the athena proxy route
	// --------------------------------------------------------
	// identities - list of possible identities for auth - array of identity objects
	// osns - array of ordering service nodes to use
	static async getChannels(identities, osns) {
		let resp = {
			systemChannel: null,
			channels: []
		};
		if (!Array.isArray(osns)) {
			osns = [osns];
		}
		let at_least_one_resp = false;

		for (let i in osns) {
			const single_resp = await ChannelParticipationApi._getChannels(identities, osns[i]);
			if (single_resp && single_resp.channels) {
				at_least_one_resp = true;
				resp.channels = _.unionWith(resp.channels, single_resp.channels, _.isEqual);
				if (resp.systemChannel === null && single_resp.systemChannel !== undefined) {
					resp.systemChannel = single_resp.systemChannel;
				}
			}
		}
		return at_least_one_resp ? resp : null;
	}

	// --------------------------------------------------------
	// Fabric's osnadmin get-channel request - hard coded in stitch to use the athena proxy route
	// --------------------------------------------------------
	// identities - list of possible identities for auth - array of identity objects
	// osn - the ordering service node to use - a optools node object
	// channel - the name of the channel - string
	static async get1Channel(identities, osn, channel) {
		const identity4tls = await ChannelParticipationApi.findMatchingIdentity({
			identities: identities,
			root_certs_b64pems: _.get(osn, 'msp.tlsca.root_certs')
		});

		if (identity4tls !== null) {
			try {
				const opts = {
					channel: channel,
					host: osn.osnadmin_url,
					certificate_b64pem: identity4tls.cert,
					private_key_b64pem: identity4tls.private_key,
					root_cert_b64pem: _.get(osn, 'msp.tlsca.root_certs[0]'),
					skip_cache: true,
				};
				return await StitchApi.getOSNChannel(opts);
			} catch (error) {
				Log.error('req error - unable to get osn channel details:', error, osn.osnadmin_url);
			}
		}
		Log.error('unable to get osn channel data');
		return null;
	}

	// --------------------------------------------------------
	// Fabric's osnadmin join-channel request - hard coded in stitch to use the athena proxy route
	// --------------------------------------------------------
	// identities - list of possible identities for auth - array of identity objects
	// osn - the ordering service node to use - a optools node object
	// channel - the name of the channel - string
	static async joinChannel(identities, osn, b_config_block) {
		const identity4tls = await ChannelParticipationApi.findMatchingIdentity({
			identities: identities,
			root_certs_b64pems: _.get(osn, 'msp.tlsca.root_certs')
		});

		if (identity4tls !== null) {
			try {
				const opts = {
					host: osn.osnadmin_url,
					certificate_b64pem: identity4tls.cert,
					private_key_b64pem: identity4tls.private_key,
					root_cert_b64pem: _.get(osn, 'msp.tlsca.root_certs[0]'),
					b_config_block: b_config_block,
					skip_cache: true,
				};
				return await StitchApi.joinOSNChannel(opts);
			} catch (error) {
				Log.error('req error - unable to join osn to channel:', error);
			}
		}
		Log.error('unable to join osn to channel');
		return null;
	}

	// --------------------------------------------------------
	// Fabric's osnadmin remove-node-from-channel request - hard coded in stitch to use the athena proxy route
	// --------------------------------------------------------
	// identities - list of possible identities for auth - array of identity objects
	// osn - the ordering service node to use - a optools node object
	// channel - the name of the channel - string
	static async unjoinChannel(identities, osn, channel) {
		const identity4tls = await ChannelParticipationApi.findMatchingIdentity({
			identities: identities,
			root_certs_b64pems: _.get(osn, 'msp.tlsca.root_certs')
		});

		if (identity4tls !== null) {
			try {
				const opts = {
					channel: channel,
					host: osn.osnadmin_url,
					certificate_b64pem: identity4tls.cert,
					private_key_b64pem: identity4tls.private_key,
					root_cert_b64pem: _.get(osn, 'msp.tlsca.root_certs[0]'),
					skip_cache: true,
				};
				return await StitchApi.unjoinOSNChannel(opts);
			} catch (error) {
				Log.error('req error - unable to remove osn from channel:', error);
			}
		}
		Log.error('unable to remove osn from channel');
		return null;
	}

	// --------------------------------------------------------
	// Map Channels using osnadmin requests - take in a bunch of ordering nodes and find all known details about all channels
	// --------------------------------------------------------
	// iter on many ordering nodes
	//	- find all channels for each node
	// 	- returns a array of channels and its' details:
	/* {
			systemChannel: {see output of map1Channel()},
			channels: [{see output of map1Channel()}]
		}
	*/
	// identities - list of ALL known identities - array of identity objects
	// osns - many ordering service nodes to scan - array of a optools node objects
	// [usage restriction] - unique channels must have a unique name across all osns passed
	//		...so if two osns have a different channel yet both of them are named "test", this function will only scan the first "test" it sees
	static async mapChannels(identities, osns) {
		const mapped_channel_names = [];								// track which channels we've mapped already

		if (Array.isArray(osns)) {
			const ret = {
				systemChannel: null,									// populated below
				channels: [],											// populated below
			};
			let last_ch_list_resp = null;
			let last_osn = null;
			let at_least_one_resp = false;

			// iter on each osn in input
			for (let i in osns) {
				const resp = await ChannelParticipationApi.getChannels(identities, osns[i]);
				if (resp && resp.systemChannel) {
					last_ch_list_resp = resp;							// remember this, used below for system
					last_osn = osns[i];
				}

				if (resp && Array.isArray(resp.channels)) {
					at_least_one_resp = true;

					// iter on each channel in channel list
					for (let z in resp.channels) {
						const ch = resp.channels[z];
						if (!mapped_channel_names.includes(ch.name)) {
							mapped_channel_names.push(ch.name);
							ret.channels.push(await ChannelParticipationApi.map1Channel(identities, osns, ch.name));
						}
					}
				}
			}

			// use the last channel response data and the last osn to get the system channel details
			if (last_ch_list_resp && last_ch_list_resp.systemChannel) {
				const sys_name = last_ch_list_resp.systemChannel.name;
				ret.systemChannel = await ChannelParticipationApi.map1Channel(identities, [last_osn], sys_name);
			}

			return at_least_one_resp ? ret : null;
		}

		Log.error('unable to create channels map with osnadmin data');
		return null;
	}

	// --------------------------------------------------------
	// Map A Channel using osnadmin requests - take in a bunch of ordering nodes and find all known details about **1** channel
	// --------------------------------------------------------
	// iter on many ordering nodes, returns channel details across all the osns
	/* returns: {
			name: "",
			height: 0,
			status: "",
			nodes: {
				"OPTOOLS-NODE-ID-HERE": {
					...node-obj,
					_channel_resp: {			// field contains error obj if we got an error response
						name: "",
						url: "",
						status: "",
						consensusRelation: "",
						height: 0,
					}
				}
			}
		}
	*/
	// identities - list of ALL known identities - array of identity objects
	// osns - many ordering service nodes to scan - array of a optools node objects
	// channel - the name of the channel - string
	// [usage restriction] - unique channels must have a unique name across all osns passed
	//		...so if two osns have a different channel yet both of them are named "test", this function return data from 1 osn's "test" && you won't know which!!
	static async map1Channel(identities, osns, channel) {
		if (Array.isArray(osns)) {
			const details = {
				name: channel,
				height: 0,								// populated below
				status: '',								// populated below
				nodes: {},								// populated below
			};

			let reqs = osns.map(async osn => {
				const ch_resp = await ChannelParticipationApi.get1Channel(identities, osn, channel);
				const node = JSON.parse(JSON.stringify(osn));
				node._channel_resp = ch_resp;									// store full response under the optools node obj
				details.nodes[node.id] = node;

				if (ch_resp && !isNaN(ch_resp.height)) {
					details.height = ch_resp.height;
					details.status = ch_resp.status;
				}
				return ch_resp;													// not used atm
			});

			// limit number of parallel requests by shortening the reqs array, iter till done
			/*console.log('dsh here 1:', typeof reqs, reqs.length);
			while (reqs.length) {
				console.log('dsh here 2:', typeof reqs, reqs.length);
				await Promise.all(reqs.splice(0, 2).map(f => f()));		// send 4 reqs at a time
			}*/
			await Promise.all(reqs);		// dsh todo - limit number of requests at a time

			// done
			return details;
		}

		Log.error('unable to create a channel map with osnadmin data');
		return null;
	}
}
