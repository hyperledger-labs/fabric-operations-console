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

class ConfigureAuthApi {
	static async getAuthScheme(body) {
		return RestApi.get('/api/v2/authscheme');
	}

	static async configureAuthScheme(body) {
		return RestApi.put('/api/v2/authscheme', body);
	}

	static async listUsers(body) {
		return RestApi.get('/api/v2/permissions/users', body);
	}

	static async addUsers(body) {
		return RestApi.post('/api/v2/permissions/users', body);
	}

	static async editUsers(body) {
		return RestApi.put('/api/v2/permissions/users', body);
	}

	static async deleteUsers(body) {
		return RestApi.delete(`/api/v2/permissions/users?uuids=[${body.uuids}]`);
	}
}

export default ConfigureAuthApi;
