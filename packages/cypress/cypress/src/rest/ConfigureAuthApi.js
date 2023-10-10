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
	static async getAuthScheme(skip_cache) {
		return RestApi.get('/api/v3/authscheme' + (skip_cache ? '?cache=skip' : ''));
	}

	static async configureAuthScheme(body) {
		return RestApi.put('/api/v3/authscheme', body);
	}

	static async listUsers(skip_cache) {
		return RestApi.get('/api/v3/permissions/users' + (skip_cache ? '?cache=skip' : ''));
	}

	static async addUsers(body) {
		return RestApi.post('/api/v3/permissions/users', body);
	}

	static async editUsers(body) {
		return RestApi.put('/api/v3/permissions/users', body);
	}

	static async deleteUsers(body) {
		return RestApi.delete(`/api/v3/permissions/users?uuids=[${body.uuids}]`);
	}

	static async listApiKeys(skip_cache) {
		return RestApi.get('/api/v3/permissions/keys' + (skip_cache ? '?cache=skip' : ''));
	}

	static async addApiKey(body) {
		return RestApi.post('/api/v3/permissions/keys', body);
	}

	static async deleteApiKey(apikey) {
		return RestApi.delete('/api/v3/permissions/keys/' + apikey);
	}
}

export default ConfigureAuthApi;
