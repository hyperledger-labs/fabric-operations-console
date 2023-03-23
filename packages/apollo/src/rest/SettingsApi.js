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
import { RestApi } from './RestApi';

class SettingsApi {
	static feature_flags = {};
	static async getVersionInformation() {
		let res;
		try {
			res = await fetch('version.txt?preventCache=' + new Date().getTime());
			await RestApi.simulateNetworkDelay();
		} catch (error) {
			await RestApi.simulateNetworkDelay();
			throw error;
		}
		if (!res.ok) throw res.statusText;

		const body = await res.text();
		const info = {};
		const parts = body.split('\n');
		parts.forEach(part => {
			const data = part.split(':');
			if (data[0]) {
				info[data[0]] = data[1];
			}
		});
		return info;
	}

	static async getReleaseNotes() {
		let res;
		try {
			res = await fetch('releaseNotes.json?preventCache=' + new Date().getTime());
			await RestApi.simulateNetworkDelay();
		} catch (error) {
			await RestApi.simulateNetworkDelay();
			throw error;
		}
		if (!res.ok) throw res.statusText;

		return res.json();
	}

	static async getSettings() {
		return RestApi.get('/api/v2/settings?preventCache=' + new Date().getTime());
	}

	static async getFeatureFlags() {
		if (!_.isEmpty(SettingsApi.feature_flags) && !SettingsApi.feature_flags.promise) {
			return SettingsApi.feature_flags;
		} else {
			await this._getFeatureFlags();
			if (!SettingsApi.feature_flags) {
				SettingsApi.feature_flags = {};
			}
			return SettingsApi.feature_flags;
		}
	}

	static _getFeatureFlags() {
		if (SettingsApi.feature_flags.promise) {
			return SettingsApi.feature_flags.promise;
		}
		const promise = new Promise(resolve => {
			const url = '/api/v2/settings?preventCache=' + new Date().getTime();
			const headers = {
				'cache-control': 'no-cache',
			};
			RestApi.get(url, headers)
				.then(resp => {
					SettingsApi.feature_flags = resp.FEATURE_FLAGS;
				})
				.catch(error => {
					SettingsApi.feature_flags = {};
				})
				.finally(() => {
					resolve(SettingsApi.feature_flags);
				});
		});
		SettingsApi.feature_flags.promise = promise;
		return promise;
	}

	// update w/e settings are in data, has input validation
	static async updateSettings(data) {
		return RestApi.put('/api/v3/settings', data);
	}

	// will update one setting, no input validation, don't use unless you don't have a way
	static async updateOneSetting(key, value) {
		return RestApi.put('/api/v3/authscheme/key', {
			[key]: value,
		});
	}
}

export default SettingsApi;
