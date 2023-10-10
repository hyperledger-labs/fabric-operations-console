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
import Logger from '../components/Log/Logger';
import { NodeRestApi } from './NodeRestApi';
import { RestApi } from './RestApi';
const Log = new Logger('ServiceInstanceRestApi');

class ServiceInstanceRestApi {
	static async getClusterStatus() {
		const url = `/deployer/api/v3/instance/${NodeRestApi.siid}/status`;
		try {
			return await RestApi.get(url);
		} catch (error) {
			Log.error(error);
			throw error;
		}
	}
	static async getClusterVersion() {
		const url = `/deployer/api/v3/instance/${NodeRestApi.siid}/k8s/cluster/version`;
		try {
			return await RestApi.get(url);
		} catch (error) {
			Log.error(error);
			throw error;
		}
	}
}

export default ServiceInstanceRestApi;
