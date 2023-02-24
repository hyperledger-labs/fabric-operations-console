import { RestApi } from '../rest/RestApi';

class VaultPersistenceProvider {
	static async save(key, data) {
		try{
			let url = '/api/v3/vault/identity/' + key;

			return await RestApi.put(url, data);
		} catch (error) {
			if (error.statusCode === 503) {
				return RestApi.get('/api/v3/components?deployment_attrs=included');
			} else {
				throw error;
			}
		}
	}

	static async get(key) {
		// const skip_cache = NodeRestApi.skip_cache;
		try {
			let url = '/api/v3/vault/identity/' + key;
			// 	if (skip_cache) {
			// 		url = url + '&skip_cache=yes';
			// 		NodeRestApi.skip_cache = false;
			// 	}
			const results = await RestApi.get(url);
			return results;
		} catch (error) {
			if (error.statusCode === 503) {
				return RestApi.get('/api/v3/components?deployment_attrs=included');
			} else {
				throw error;
			}
		}
	}
}

export default VaultPersistenceProvider;
