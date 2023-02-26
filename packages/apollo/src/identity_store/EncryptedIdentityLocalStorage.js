import StitchApi from '../rest/StitchApi';

class EncryptedIdentityLocalStorage {
	async save(key, data) {
		const encrypted = await StitchApi.encrypt(data);
		localStorage.setItem(key, encrypted);
	}

	async get(key) {
		const data = localStorage.getItem(key);
		console.log(data)
		if (data) {
			const decrypted = await StitchApi.decrypt(data);
			console.log(decrypted)
			return decrypted;
		}
		return {};
	}

	async removeIdentity(name, key, data) {
		console.log('removeIdentity', name, key, data);
		delete data[name];
		return this.save(key, data);
	}
}

export default EncryptedIdentityLocalStorage;
