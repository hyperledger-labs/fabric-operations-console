/*
 * Copyright contributors to the Hyperledger Fabric Operations Console project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

//------------------------------------------------------------
// Webhook API Routes
//------------------------------------------------------------
module.exports = (logger, ev, t) => {
	const app = t.express.Router();

	// interval to find expired webhooks and change their status to expired
	setInterval(() => {
		if (!t.ot_misc.server_is_closed()) {				// don't run during graceful shutoff
			logger.debug('[webhook apis] - checking for expired webhooks');
			t.webhook.expire_old_webhooks();
		}
	}, 12 * 60 * 60 * 1000 + (Math.random() * 30000));		// add some randomness to minimize write conflicts

	//--------------------------------------------------
	// Get webhook status (aka get webhook doc)
	//--------------------------------------------------
	app.get('/api/v[123]/webhooks/txs/:tx_id', t.middleware.verify_view_action_session, (req, res) => {
		t.webhook.get_webhook(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				res.status(200).json(ret);
			}
		});
	});
	app.get('/ak/api/v[123]/webhooks/txs/:tx_id', t.middleware.verify_view_action_ak, (req, res) => {
		t.webhook.get_webhook(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Get all webhook statuses
	//--------------------------------------------------
	app.get('/api/v[123]/webhooks', t.middleware.verify_view_action_session, (req, res) => {
		t.webhook.get_all_webhooks(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				res.status(200).json(ret);
			}
		});
	});
	app.get('/ak/api/v[123]/webhooks', t.middleware.verify_view_action_ak, (req, res) => {
		t.webhook.get_all_webhooks(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Get all template webhooks
	//--------------------------------------------------
	app.get('/api/v[123]/webhooks/templates', t.middleware.verify_view_action_session, (req, res) => {
		t.webhook.get_all_template_webhooks(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				res.status(200).json(ret);
			}
		});
	});
	app.get('/ak/api/v[123]/webhooks/templates', t.middleware.verify_view_action_ak, (req, res) => {
		t.webhook.get_all_template_webhooks(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Create a webhook tx
	//--------------------------------------------------
	app.post('/api/v[123]/webhooks/txs', t.middleware.verify_notifications_action_session, (req, res) => {
		t.webhook.store_webhook_doc(req.body, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Update webhook tx's status (aka set webhook status)
	//--------------------------------------------------
	app.put('/api/v[123]/webhooks/txs/:tx_id', t.middleware.verify_notifications_action_session, (req, res) => {
		t.webhook.edit_webhook(req.params.tx_id, req.body, (errObj) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				const ret = {
					message: 'ok',
					tx_id: req.params.tx_id
				};
				res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Dummy route for webhook "finished" notification (our example template will post here, just humor it)
	//--------------------------------------------------
	app.post('/api/v[123]/webhooks/txs/:tx_id', t.middleware.public, (req, res) => {
		logger.debug('[webhook api] received webhook notification on the dummy route, probably from the example template');
		res.status(200).json({ message: 'ok' });
	});

	return app;
};
