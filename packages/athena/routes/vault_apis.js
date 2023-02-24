const nodeVault = require('node-vault');

const options = {
	apiVersion: 'v1',
	endpoint: ''
};

let vault = nodeVault(options);
vault.userpassLogin({
	username: '',
	password: ''
});

module.exports = function (logger, ev, t) {
	const app = t.express.Router();

	app.get(
		'/api/v[23]/vault/identity/:key',
		t.middleware.verify_view_action_ak,
		(req, res) => {
			const key = req.params.key;
			vault
				.read('kvs/data/kvs-d1/test_org_lyubo/' + key)
				.then((response) => {
					logger.debug('Response: ', response);
					const data = response.data.data;
					const result = {};

					for (let key in data) {
						result[key] = JSON.parse(data[key]);
					}
					// const credentials = JSON.parse(response.data.data.data);
					// const secretInfo = {
					// 	cert: credentials.credentials.certificate,
					// 	name: credentials.mspId,
					// 	private_кey: credentials.credentials.privateKey,
					// 	type: credentials.type
					// };
					res.status(200).json(result);
				})
				.catch((e) => {
					logger.debug('error ', e);
					logger.debug('error response ', e.response);
					logger.debug('error response status code ', e.response.statusCode);
					logger.debug('errors ', !e.response.errors);
					if (e && e.response && e.response.statusCode && e.response.statusCode === 404 && !e.response.errors) {
						res.status(200).json({});
						return;
					}
					res.status(500).send(e);
				});
		}
	);

	app.put(
		'/api/v[23]/vault/identity',
		t.middleware.verify_view_action_ak,
		async (req, res) => {
			if (!req.body) {
				return res
					.status(400)
					.json(t.validate.fmt_input_error(req, [{ key: 'missing_type' }]));
			}

			console.log('Request body: ', req.body);
			const identities = req.body;

			for (let key in identities) {
				const identityValue = identities[key];
				const secretIdentity = {
					data: JSON.stringify(identityValue),
					id: key
				};

				await vault
					.write(
						'kvs/data/kvs-d1/test_org_lyubo/' + key,
						{ data: secretIdentity },
						{}
					)
					.then((response) => {

						res.status(200).json([response]);
					})
					.catch((e) => {
						res.status(500).send(e);
					});
			}
		}
	);

	return app;
};
