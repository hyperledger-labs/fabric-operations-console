const nodeVault = require('node-vault');

module.exports = function (logger, ev, t) {
	const app = t.express.Router();
	const {
		VAULT_URL,
		VAULT_API_VERSION,
		VAULT_USERNAME,
		VAULT_PASSWORD,
		VAULT_ORG_NAME,
		VAULT_PATH
	} = process.env;

	const vaultIdentitiesPath = `${VAULT_ORG_NAME}/data/${VAULT_PATH}`;
	const vaultFolderContentPath = `${VAULT_ORG_NAME}/metadata/${VAULT_PATH}`;

	// Vault initialisation
	let vault;
	let isVaultInitialised = false;

	const initVaultClient = async () => {
		const options = {
			apiVersion: VAULT_API_VERSION,
			endpoint: VAULT_URL
		};

		try {
			vault = nodeVault(options);
			await vault.userpassLogin({
				username: VAULT_USERNAME,
				password: VAULT_PASSWORD
			});
			isVaultInitialised = true;
		} catch (error) {
			const msg = 'Error while establishing connection to Vault!';
			logger.error(`${msg} Error: ${error}`);
		}
	};

	initVaultClient();

	// Check if Vault client initialised middleware
	const checkIfVaultInitialisedMiddleware = (req, res, next) => {
		if (isVaultInitialised) {
			return next();
		}
		const msg = 'Vault client not initialised!';
		logger.error(msg);
		return res.status(404).json({
			msg,
			reason:
        'Vault client is not initialised. This could be due failed login, failed initialisation, wrong Vault url, Vault server down, etc.'
		});
	};

	// Definition of requests handling functions
	const getIdentitySecretByNameHandler = async (req, res) => {
		const name = req.params.name;
		const identity = {};
		try {
			const secret = await vault
				.read(`${vaultIdentitiesPath}/test_org_lyubo2/` + name)
				.then((response) => response.data.data);
			identity[name] = JSON.parse(secret.data);
		} catch (error) {
			const msg = `Error while fetching identity with key ${name} from Vault!`;
			logger.error(`${msg} Error: ${error}`);
			res.status(t.ot_misc.get_code(error)).json({
				msg,
				reason: error
			});
			return;
		}

		res.json(identity);
	};

	const getAllIdentitiesFromVaultHandler = async (req, res) => {
		let secretsNames = [];

		try {
			secretsNames = await vault
				.read(`${vaultFolderContentPath}/test_org_lyubo2?list=true`)
				.then((response) => response.data.keys);
		} catch (error) {
			const msg = 'Error while fetching identities\' secrets names from Vault!';
			logger.error(`${msg} Error: ${error}`);
			res.status(t.ot_misc.get_code(error)).json({
				msg,
				reason: error
			});
			return;
		}

		const secrets = {};
		try {
			for (const secretName of secretsNames) {
				const secret = await vault
					.read(`${vaultIdentitiesPath}/test_org_lyubo2/${secretName}`)
					.then((response) => response.data.data);
				const { data, id } = secret;
				const identity = JSON.parse(data);

				secrets[id] = identity;
			}
		} catch (error) {
			const msg = 'Error while fetching/parsing identities from Vault!';
			logger.error(`${msg} Error: ${error}`);
			res.status(t.ot_misc.get_code(error)).json({
				msg,
				reason: error
			});
			return;
		}

		res.json(secrets);
	};

	const upsertIdentitiesToVaultHandler = async (req, res) => {
		if (!req.body) {
			return res
				.status(400)
				.json(t.validate.fmt_input_error(req, [{ key: 'missing_type' }]));
		}

		const identities = req.body;
		const errors = [];

		for (let key in identities) {
			const identityValue = identities[key];
			const secretIdentity = {
				data: JSON.stringify(identityValue),
				id: key
			};

			await vault
				.write(
					`${vaultIdentitiesPath}/test_org_lyubo2/${key}`,
					{ data: secretIdentity },
					{}
				)
				.catch((e) => {
					errors.push(key);
				});
		}

		res.status(200).json({ errors });
	};

	const deleteIdentityFromVaultHandler = async (req, res) => {
		const name = req.params.name;

		try {
			await vault.delete(`${vaultIdentitiesPath}/test_org_lyubo2/${name}`);
		} catch (error) {
			const msg = `Error while deleting identity secret with name ${name} in Vault!`;
			logger.error(`${msg} Error: ${error}`);
			res.status(t.ot_misc.get_code(error)).json({
				msg,
				reason: error
			});
			return;
		}

		res.status(204).send();
	};

	// Routes definition

	app.get(
		'/api/v[23]/vault/identity/:name',
		t.middleware.verify_view_action_ak,
		checkIfVaultInitialisedMiddleware,
		getIdentitySecretByNameHandler
	);

	app.get(
		'/api/v[23]/vault/identity',
		t.middleware.verify_view_action_ak,
		checkIfVaultInitialisedMiddleware,
		getAllIdentitiesFromVaultHandler
	);

	app.put(
		'/api/v[23]/vault/identity',
		t.middleware.verify_view_action_ak,
		checkIfVaultInitialisedMiddleware,
		upsertIdentitiesToVaultHandler
	);

	app.delete(
		'/api/v[23]/vault/identity/:name',
		t.middleware.verify_view_action_ak,
		checkIfVaultInitialisedMiddleware,
		deleteIdentityFromVaultHandler
	);
	return app;
};
