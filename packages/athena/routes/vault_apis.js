var options = {
    apiVersion: 'v1',
    endpoint: 'https://vault.d1.test.senofi.net',
    token: ''
  };

var vault = require("node-vault")(options);

module.exports = function (logger, ev, t) {
	const app = t.express.Router();

	app.get('/ak/api/v[23]/test-vault', t.middleware.verify_view_action_ak, (req, res) => {
		vault.read('kvs/data/kvs-d1/an1/test_id4')
		.then((secret) => {
			const credentials = JSON.parse(secret.data.data.data)
			const secretInfo = {
				"cert": credentials.credentials.certificate,
				"name": credentials.mspId,
				"private_кey": credentials.credentials.privateKey,
				"type": credentials.type
			}
			res.status(200).json(secretInfo)
		}).catch((e) => {
			res.status(500).send(e)
		});
	});

	return app;
}
