import EncryptedLocalStoragePersistenceProvider from './EncryptedIdentityLocalStorage';
import VaultPersistenceProvider from './VaultIdentityStorage';

// eslint-disable-next-line no-undef
const identityStoreType = process.env.REACT_APP_IDENTITY_STORE_TYPE;

class IdentityStoreFactory {
	static getInstance() {
		switch (identityStoreType) {
			case 'vault':
				return new VaultPersistenceProvider();
			case 'local':
				return new EncryptedLocalStoragePersistenceProvider();
			default:
				return new EncryptedLocalStoragePersistenceProvider();
		}
	}
}

export default IdentityStoreFactory;