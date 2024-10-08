import { RestApi } from '../rest/RestApi';

class VaultIdentityStorage {
	async save(key, data) {
		let url = '/api/v3/vault/identity';

		return await RestApi.put(url, data);
	}

	async get() {
		let url = '/api/v3/vault/identity';
		const results = await RestApi.get(url);
		return results;
	}

	async removeIdentity(name) {
		let url = `/api/v3/vault/identity/${name}`;
		const results = await RestApi.delete(url);
		return results;
	}

	canRemoveIdentity() {
		return true;
	}
}

export default VaultIdentityStorage;
