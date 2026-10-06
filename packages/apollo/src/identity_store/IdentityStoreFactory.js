import EncryptedLocalStoragePersistenceProvider
  from './EncryptedIdentityLocalStorage';
import VaultPersistenceProvider from './VaultIdentityStorage';

class IdentityStoreFactory {

  static getInstance(identityStoreType) {
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
