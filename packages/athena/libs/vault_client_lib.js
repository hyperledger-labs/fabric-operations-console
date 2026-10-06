const axios = require('axios');

const vaultConfigPath = '/server/conf/vault/vault-config.json';

class VaultClient {

	constructor({
		url,
		apiVersion = 'v1',
		username,
		password,
		vaultPath,
		vaultEnginePath,
		authMethodPath
	}, logger) {
		this.username = username;
		this.password = password;
		this.logger = logger;
		this.token = '';
		this.isInitialized = false;
		this.url = url;
		this.apiVersion = apiVersion;
		this.vaultIdentitiesPath = `${vaultEnginePath}/data/${vaultPath}`;
		this.vaultMetadataPath = `${vaultEnginePath}/metadata/${vaultPath}`;
		this.vaultDestroyPath = `${vaultEnginePath}/destroy/${vaultPath}`;
		this.loginPath = `${url}/${apiVersion}/auth/${authMethodPath}/login/${username}`;
	}

	getIsInitialized() {
		return this.isInitialized;
	}

	async init() {
		if (this.password && this.loginPath) {
			const passwordObject = { password: this.password };
			await axios.post(this.loginPath,
				passwordObject
			)
				.then(res => {
					this.token = res.data.auth.client_token;
					this.isInitialized = true;
				})
				.catch((error) => {
					this.logger.error('Unable to login, an error has ocurred!',
						error.response.status);
					throw error;
				});
		} else {
			this.logger.error('Unable to login, vault config is missing!');
		}
	}

	async listSecrets(isRetried = false) {
		return axios.get(
			`${this.url}/${this.apiVersion}/${this.vaultMetadataPath}?list=true`,
			{ headers: { 'X-Vault-Token': this.token } })
			.then(res => res.data.data.keys)
			.catch(async (error) => {
				if (!isRetried && error && error.response && (error.response.status
          === 401 || error.response.status === 403)) {
					this.logger.info('Token expired, reinitializing...');
					await this.init();
					return await this.listSecrets(true);
				}
				this.logger.error('Unable to list secrets! \n', getAxiosErrorString(error));
				throw error;
			});
	}

	async getSecretMetadata(secretName, isRetried = false) {
		return await axios.get(
			`${this.url}/${this.apiVersion}/${this.vaultMetadataPath}/${secretName}`,
			{ headers: { 'X-Vault-Token': this.token } })
			.then(res => res.data.data)
			.catch(async (error) => {
				if (!isRetried && error && error.response && (error.response.status
          === 401 || error.response.status === 403)) {
					this.logger.info('Token expired, reinitializing...');
					await this.init();
					return await this.getSecretMetadata(secretName, true);
				}
				this.logger.error('Unable to get secret metadata!\n', getAxiosErrorString(error));
				throw error;
			});
	}

	async deleteSecretMetadata(secretName, isRetried = false) {
		return axios.delete(
			`${this.url}/${this.apiVersion}/${this.vaultMetadataPath}/${secretName}`,
			{ headers: { 'X-Vault-Token': this.token } })
			.then(res => res)
			.catch(async (error) => {
				if (!isRetried && error && error.response && (error.response.status
          === 401 || error.response.status === 403)) {
					this.logger.info('Token expired, reinitializing...');
					await this.init();
					return await this.deleteSecretMetadata(secretName, true);
				}
				this.logger.error('Unable to delete secret metadata!\n', getAxiosErrorString(error));
				throw error;
			});
	}

	async destroySecretVersions(secretName, secretVersions = [],
		isRetried = false) {
		return axios.post(
			`${this.url}/${this.apiVersion}/${this.vaultDestroyPath}/${secretName}`,
			{ versions: secretVersions },
			{
				headers: { 'X-Vault-Token': this.token }
			})
			.then(res => res.data.data)
			.catch(async (error) => {
				if (!isRetried && error && error.response && (error.response.status
          === 401 || error.response.status === 403)) {
					this.logger.info('Token expired, reinitializing...');
					await this.init();
					return await this.destroySecretVersions(secretName, secretVersions,
						true);
				}
				this.logger.error(
					`Unable to destroy secret versions! Secret name [${secretName}] Versions [${secretVersions
          && secretVersions.join(', ')}] \n`, getAxiosErrorString(error));
				throw error;
			});

	}

	async readSecret(secretName, isRetried = false) {
		return axios.get(
			`${this.url}/${this.apiVersion}/${this.vaultIdentitiesPath}/${secretName}`,
			{ headers: { 'X-Vault-Token': this.token } })
			.then(res => res.data.data.data)
			.catch(async (error) => {
				if (!isRetried && error && error.response && (error.response.status
          === 401 || error.response.status === 403)) {
					this.logger.info('Token expired, reinitializing...');
					await this.init();
					return await this.readSecret(secretName, true);
				}
				this.logger.error('Unable to read secret! \n', getAxiosErrorString(error));
				throw error;
			});
	}

	async upsertSecret(secretName, data, isRetried = false) {
		return axios(
			{
				method: 'post',
				url: `${this.url}/${this.apiVersion}/${this.vaultIdentitiesPath}/${secretName}`,
				headers: { 'X-Vault-Token': this.token },
				data: { data }
			})
			.then(() => this.logger.debug('Successfully created!'))
			.catch(async (error) => {
				if (!isRetried && error && error.response && (error.response.status
          === 401 || error.response.status === 403)) {
					this.logger.info('Token expired, reinitializing...');
					await this.init();
					return await this.upsertSecret(secretName, data, true);
				}
				this.logger.error('Unable to create secret! \n', getAxiosErrorString(error));
				throw error;
			});
	}
}

const getAxiosErrorString = (error) => {
	const errors = [];
	if (error.config) {
		let config = error.config;
		if (config.headers) {
			config.headers['X-Vault-Token'] = '****';
		}
		errors.push(JSON.stringify(config));
	}

	if (error.response) {
		// The request was made and the server responded with a status code
		// that falls out of the range of 2xx
		errors.push(JSON.stringify(error.response.data));
		errors.push(error.response.status);
		errors.push(JSON.stringify(error.response.headers));
	} else if (error.request) {
		errors.push(error.request);
	} else {
		errors.push(error.message);
	}

	return errors.join('\n');
};

module.exports = function (logger, ev, t) {
	let vaultConfigurationAvailable = false;

	let vaultData = {};
	try {
		// check if module /server/conf/vault/vault-config.json is available for import
		require.resolve(vaultConfigPath);
		vaultConfigurationAvailable = true;
		vaultData = require(vaultConfigPath);
	} catch (error) {
		if (!vaultConfigurationAvailable) {
			logger.warn(
				`Vault configuration is not available at path: ${vaultConfigPath}. Vault API will return error response with 404 status code.`);
		} else {
			logger.error('Error while loading Vault configuration file! Error: ',
				error);
		}
	}

	// Vault initialisation
	const vaultClient = new VaultClient(vaultData, logger);
	vaultClient.init();
	return vaultClient;
};
