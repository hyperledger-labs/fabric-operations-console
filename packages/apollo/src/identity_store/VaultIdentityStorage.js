import { RestApi } from '../rest/RestApi';

class VaultIdentityStorage {
	async save(key, data) {
		try {
			let url = '/api/v3/vault/identity';

			return await RestApi.put(url, data);
		} catch (error) {
			if (error.statusCode === 503) {
				return RestApi.get('/api/v3/components?deployment_attrs=included');
			} else {
				throw error;
			}
		}
	}

	async get() {
		try {
			let url = '/api/v3/vault/identity';
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

	async removeIdentity(name) {
		try {
			let url = `/api/v3/vault/identity/${name}`;
			await RestApi.delete(url);
		} catch (error) {
			if (error.statusCode === 503) {
				return RestApi.get('/api/v3/components?deployment_attrs=included');
			} else {
				throw error;
			}
		}
	}
}

export default VaultIdentityStorage;
