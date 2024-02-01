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

class UserSettingsRestApi {
	static async getUserInfo() {
		return RestApi.get('/api/v3/users/info?preventCache=' + new Date().getTime());
	}

	static async getUsersIAMInfo() {
		return RestApi.get('/api/v3/users/iam/info');
	}

	static async getApplicationSettings() {
		return RestApi.get('/api/v3/settings');
	}

	static async getDefaultPassword() {
		return RestApi.get('/api/v3/private-settings');
	}

	static async recordIdentityExport() {
		return RestApi.post('/api/v3/exported/identities');
	}

	static async registerSelf() {
		return RestApi.post('/api/v3/permissions/users/registrations');
	}
}

export default UserSettingsRestApi;
