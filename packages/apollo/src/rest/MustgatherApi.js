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
import { RestApi } from './RestApi';

class MustgatherApi {
	static siid = '$iid'; // use $iid placeholder so that the proxy can fill in the correct id

	static async startGather() {
		try {
			await RestApi.post(`deployer/api/v3/instance/${MustgatherApi.siid}/mustgather`);
		} catch (error) {
			console.log(error);
		}
	}

	static async getStatus() {
		try {
			const res = await RestApi.get(`deployer/api/v3/instance/${MustgatherApi.siid}/mustgather`);
			return res;
		} catch (error) {
			return {
				clusterRole: false,
				namespaceCreated: false,
				podRunning: false,
				mustgather: {},
				status: undefined,
			};
		}
	}

	static async stopGather() {
		try {
			await RestApi.delete(`deployer/api/v3/instance/${MustgatherApi.siid}/mustgather`);
		} catch (error) {
			console.log(error);
		}
	}
}

export default MustgatherApi;
