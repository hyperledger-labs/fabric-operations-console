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

class ConfigBlockApi {

	// get a specific config block doc
	static async get(tx_id, opts) {
		const queryTxt = (opts && opts.cache === 'skip') ? '?cache=skip' : '';
		return await RestApi.get('/api/v3/configblocks/' + tx_id + queryTxt);
	}

	// get all config block docs
	static async getAll(opts) {
		let queryTxt = (opts && opts.cache === 'skip') ? '?cache=skip' : '';
		if (opts && opts.visibility) {
			if (queryTxt) {
				queryTxt += '&';
			} else {
				queryTxt = '?';
			}
			queryTxt += 'visibility=' + opts.visibility;
		}
		return await RestApi.get('/api/v3/configblocks' + queryTxt);
	}

	// store a new config block
	/*
	opts: {
		b_block: <bin>,
		extra_consenter_data: [()],
		tx_id: '<hex string>',
		channel_id: '<channel>',
	}
	*/
	static async store(opts) {
		const body = {
			channel: opts.channel_id,
			block_b64: window.stitch.uint8ArrayToBase64(opts.b_block),
			extra_consenter_data: opts.extra_consenter_data,
		};
		return await RestApi.post('/api/v3/configblocks/' + opts.tx_id, body);
	}

	// delete a config block
	static async delete(tx_id) {
		return await RestApi.delete('/api/v3/configblocks/' + tx_id);
	}

	// archive a config block
	static async archive(tx_id) {
		return await RestApi.put('/api/v3/configblocks/' + tx_id);
	}
}

export default ConfigBlockApi;
