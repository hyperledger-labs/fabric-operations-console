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
import helper from '../utils/helper';

class EventsRestApi {

	// get all activity logs
	static async getLogs(opts) {
		if (!isNaN(opts.limit)) {
			opts.limit = Number(opts.limit);
		}
		if (!isNaN(opts.skip)) {
			opts.skip = Number(opts.skip);
		}
		opts.timezoneOffset = new Date().getTimezoneOffset();
		return RestApi.get('/api/v3/notifications' + helper.formatObjAsQueryParams(opts));
	}

	/* create a new activity log
	{
		status: 'success'
		log: 'export a component'
	}
	*/
	static async recordActivity(opts) {
		return RestApi.post('/api/v3/notifications', opts);
	}

	static async sendCreateChannelEvent(channel_id, msp_id) {
		try {
			EventsRestApi.recordActivity({ status: 'success', log: `MSP "${msp_id}" has created channel "${channel_id}"`, code: 200 });
		} catch (e) {
			console.error('unable to record channel creation', e);
		}
	}

	static async sendUpdateChannelEvent(channel_id, msp_id) {
		try {
			EventsRestApi.recordActivity({ status: 'success', log: `MSP "${msp_id}" has updated channel "${channel_id}"`, code: 200 });
		} catch (e) {
			console.error('unable to record channel edit', e);
		}
	}

	static async sendJoinChannelEvent(channel_id, peers) {
		try {
			const peer_names = peers.map(peer => {
				return '"' + peer.display_name + '"';
			});
			EventsRestApi.recordActivity({
				status: 'success',
				log: (peer_names.length > 1 ? 'peers' : 'peer') + `${peer_names.join(', ')} ` + (peer_names.length > 1 ? 'have' : 'has') + `joined the channel "${channel_id}"`,
				code: 200
			});
		} catch (e) {
			console.error('unable to record channel join', e);
		}
	}

	static async sendInstallCCEvent(cc_name, cc_version, peer) {
		try {
			EventsRestApi.recordActivity({ status: 'success', log: `installed chaincode "${cc_name}" @ "${cc_version}" on peer "${peer.display_name}"`, code: 200 });
		} catch (e) {
			console.error('unable to record cc install', e);
		}
	}

	static async sendInstantiateCCEvent(cc_name, cc_version, channel_id) {
		try {
			EventsRestApi.recordActivity({ status: 'success', log: `instantiated chaincode "${cc_name}" @ "${cc_version}" on channel "${channel_id}"`, code: 200 });
		} catch (e) {
			console.error('unable to record cc install', e);
		}
	}
}

export { EventsRestApi };
