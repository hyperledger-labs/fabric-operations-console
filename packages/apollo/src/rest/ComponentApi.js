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
