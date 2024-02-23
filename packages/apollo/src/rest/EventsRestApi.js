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

	static async sendCreateChannelEvent(channel_id, msp_id, status) {
		try {
			EventsRestApi.recordActivity({
				status: status === 'error' ? 'error' : 'success',
				log: `creating channel "${channel_id}" - MSP "${msp_id}"`,
				code: 200
			});
		} catch (e) {
			console.error('unable to record channel creation', e);
		}
	}

	static async sendUpdateChannelEvent(channel_id, msp_id, status) {
		try {
			EventsRestApi.recordActivity({
				status: status === 'error' ? 'error' : 'success',
				log: `updating channel "${channel_id}" - MSP "${msp_id}" `,
				code: 200
			});
		} catch (e) {
			console.error('unable to record channel edit', e);
		}
	}

	static async sendJoinChannelEvent(channel_id, peers, status) {
		try {
			const peer_names = peers.map(peer => {
				return '"' + peer.display_name + '"';
			}).join(', ');
			EventsRestApi.recordActivity({
				status: status === 'error' ? 'error' : 'success',
				log: `${peers.length > 1 ? 'peers' : 'peer'} ${peer_names} ${peers.length > 1 ? 'have' : 'has'} ${status === 'error' ? 'failed to ' : ''}joined the channel "${channel_id}"`,
				code: status === 'error' ? 403 : 200
			});
		} catch (e) {
			console.error('unable to record channel join', e);
		}
	}

	static async sendUnJoinChannelEvent(channel_id, peers, status) {
		try {
			const peer_names = peers.map(peer => {
				return '"' + peer.display_name + '"';
			}).join(', ');
			EventsRestApi.recordActivity({
				status: status === 'error' ? 'error' : 'success',
				log: `${peers.length > 1 ? 'peers' : 'peer'} ${peer_names} ${peers.length > 1 ? 'have' : 'has'} ${status === 'error' ? 'failed to ' : ''}disconnect from the channel "${channel_id}"`,
				code: status === 'error' ? 403 : 200
			});
		} catch (e) {
			console.error('unable to record channel join', e);
		}
	}

	static async sendInstallCCEvent(cc_name, cc_version, peer, status) {
		try {
			EventsRestApi.recordActivity({
				status: status === 'error' ? 'error' : 'success',
				log: `installing chaincode "${cc_name}" @ "${cc_version}" on peer "${peer.display_name}"`,
				code: 200
			});
		} catch (e) {
			console.error('unable to record cc install', e);
		}
	}

	static async sendInstantiateCCEvent(cc_name, cc_version, channel_id, status) {
		try {
			EventsRestApi.recordActivity({
				status: status === 'error' ? 'error' : 'success',
				log: `instantiating chaincode "${cc_name}" @ "${cc_version}" on channel "${channel_id}"`,
				code: 200
			});
		} catch (e) {
			console.error('unable to record cc instantiate', e);
		}
	}

	static async sendRegisterUserEvent(identity, ca, status) {
		try {
			EventsRestApi.recordActivity({
				status: status === 'error' ? 'error' : 'success',
				log: `registering identity "${identity}" on CA "${(ca ? ca.id : '-')}"`,
				api: 'POST:/api/v1/identities',
				code: 200
			});
		} catch (e) {
			console.error('unable to record ca user registration', e);
		}
	}

	static async sendDeleteUserEvent(identity, ca, status) {
		try {
			EventsRestApi.recordActivity({
				status: status === 'error' ? 'error' : 'success',
				log: `removing identity "${identity}" on CA "${(ca ? ca.id : '-')}"`,
				api: 'DELETE:/api/v1/identities/{id}',
				code: 200
			});
		} catch (e) {
			console.error('unable to record ca user delete', e);
		}
	}

	static async sendEnrollUserEvent(identity, ca, status) {
		try {
			EventsRestApi.recordActivity({
				status: status === 'error' ? 'error' : 'success',
				log: `enrolling identity "${identity}" on CA "${(ca ? ca.id : '-')}"`,
				api: 'POST:/api/v1/enroll',
				code: 200
			});
		} catch (e) {
			console.error('unable to record ca user enroll', e);
		}
	}

	static async sendMustGatherEvent() {
		try {
			EventsRestApi.recordActivity({
				status: 'success',
				log: 'starting mustgather',
				code: 200
			});
		} catch (e) {
			console.error('unable to record the mustgather event', e);
		}
	}

	static async sendMustGatherDownloadEvent() {
		try {
			EventsRestApi.recordActivity({
				status: 'success',
				log: 'downloading mustgather data',
				code: 200
			});
		} catch (e) {
			console.error('unable to record the mustgather download event', e);
		}

	}
}

export { EventsRestApi };
