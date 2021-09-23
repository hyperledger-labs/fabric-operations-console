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
import { NodeRestApi } from './NodeRestApi';
import { RestApi } from './RestApi';

class ComponentApi {
	static async getComponent(component) {
		let l_type = component.type === 'fabric-ca' ? 'ca' : component.type === 'fabric-peer' ? 'peer' : 'orderer';
		const url = `/deployer/api/v3/instance/${NodeRestApi.siid}/type/${l_type}/component/${component.id}`;
		return RestApi.get(url);
	}

	static async getUsageInformation(component) {
		const data = await ComponentApi.getComponent(component);
		return {
			resources: data.individualResources,
			storage: data.storage,
			crstatus: {
				reason: data.crstatus ? data.crstatus.reason : null,
				type: data.crstatus ? data.crstatus.type : null,
			},
		};
	}
}

export default ComponentApi;
