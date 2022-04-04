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
//import _ from 'lodash';
import Logger from '../components/Log/Logger';
//import Helper from '../utils/helper';
//import IdentityApi from './IdentityApi';
import { RestApi } from './RestApi';
//import StitchApi from './StitchApi';

const Log = new Logger('ConfigBlockApi');

class ConfigBlockApi {

	// get a specific config block doc
	static async get(tx_id) {
		return await RestApi.get('/api/v3/configblocks/' + tx_id);
	}

	// get all config block docs
	static async getAll() {
		return await RestApi.get('/api/v3/configblocks');
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
}

export default ConfigBlockApi;
