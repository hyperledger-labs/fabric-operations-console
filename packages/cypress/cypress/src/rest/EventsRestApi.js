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
import { RestApi } from './RestApi';

class EventsRestApi {
	static async sendEvent(eventOpts) {
		try {
			RestApi.post('/api/v2/events' + eventOpts.url, eventOpts);
		} catch (e) {
			// do nothing...
		}
	}

	static async sendCreateChannelEvent(channel_id, msp_id) {
		const at_event = {
			url: `/channels/${channel_id}`,
			action_verb: 'create',
			http_code: 200,
			client_details: {
				msp_id,
			},
		};
		EventsRestApi.sendEvent(at_event);
	}

	static async sendUpdateChannelEvent(channel_id, msp_id) {
		const at_event = {
			url: `/channels/${channel_id}`,
			action_verb: 'update',
			http_code: 200,
			client_details: {
				msp_id,
			},
		};
		EventsRestApi.sendEvent(at_event);
	}

	static async sendJoinChannelEvent(channel_id, peers) {
		const at_event = {
			url: `/peer/${channel_id}`,
			action_verb: 'enable',
			http_code: 200,
			client_details: {
				peers: peers.map(peer => {
					return { display_name: peer.display_name, msp_id: peer.msp_id };
				}),
			},
		};
		EventsRestApi.sendEvent(at_event);
	}

	static async sendInstallCCEvent(cc_name, cc_version, peer) {
		const at_event = {
			url: `/chaincode/${cc_name}_${cc_version}`,
			action_verb: 'create',
			http_code: 200,
			client_details: {
				peer: {
					display_name: peer.display_name,
					msp_id: peer.msp_id,
				},
			},
		};
		EventsRestApi.sendEvent(at_event);
	}

	static async sendInstantiateCCEvent(cc_name, cc_version, channel_id) {
		const at_event = {
			url: `/chaincode/${cc_name}_${cc_version}`,
			action_verb: 'update',
			http_code: 200,
			client_details: {
				channel: channel_id,
			},
		};
		EventsRestApi.sendEvent(at_event);
	}
}

export { EventsRestApi };
