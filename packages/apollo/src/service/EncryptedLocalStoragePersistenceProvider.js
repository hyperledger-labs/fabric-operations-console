import StitchApi from '../rest/StitchApi';

class EncryptedLocalStoragePersistenceProvider {
	static async save(key, data) {
		const encrypted = await StitchApi.encrypt(data);
		localStorage.setItem(key, encrypted);
	}

	static async get(key) {
		console.log("Getting identity keys ==========================")
		const data = localStorage.getItem(key);
		console.log("Encrypted identities ===============")
		console.log(data)
		if (data) {
			const decrypted = await StitchApi.decrypt(data);
			console.log("Decrypted identities =======================")
			console.log(decrypted)
			return decrypted;
		}
		return {};
	}
}

export default EncryptedLocalStoragePersistenceProvider;
