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
// Notification API Routes
//------------------------------------------------------------
module.exports = (logger, ev, t) => {
	const app = t.express.Router();

	//--------------------------------------------------
	// Get all notifications
	//--------------------------------------------------
	app.get('/api/v[123]/notifications', t.middleware.verify_view_action_session, (req, res) => {
		get_notifications(req, res);
	});
	app.get('/ak/api/v[123]/notifications', t.middleware.verify_view_action_ak, (req, res) => {
		get_notifications(req, res);
	});

	function get_notifications(req, res) {
		req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/notifications';
		logger.debug('[pre-flight] setting validate route:', req._validate_path);

		t.validate.request(req, res, null, () => {
			t.notification_apis_lib.list_all_notifications(req, (err, ret) => {
				if (err) {
					return res.status(t.ot_misc.get_code(err)).json(err);
				} else {
					return res.status(200).json(ret);
				}
			});
		});
	}

	//--------------------------------------------------
	// Create a notification (other/generic)
	//--------------------------------------------------
	app.post('/api/v[123]/notifications', t.middleware.verify_notifications_action_session, (req, res) => {
		t.notifications.create(req.body, (err, resp) => {
			if (err) {
				logger.error('[notification apis] - could not create notification', err);
				res.status(err.statusCode || 500).json(err);
			} else {
				const ret = {
					message: 'ok',
					id: resp._id
				};
				res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Delete all notifications (includes webhooks)
	//--------------------------------------------------
	app.delete('/api/v[123]/notifications/purge', t.middleware.verify_notifications_action_session, (req, res) => {
		delete_notifications(req, res);
	});
	app.delete('/ak/api/v[123]/notifications/purge', t.middleware.verify_notifications_action_ak, (req, res) => {
		delete_notifications(req, res);
	});

	function delete_notifications(req, res) {
		t.notification_apis_lib.delete_all_notifications(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	}

	//--------------------------------------------------
	// Archive notification from an array of ids
	//--------------------------------------------------
	app.post('/api/v[23]/notifications/bulk', t.middleware.verify_notifications_action_session, (req, res) => {
		archive_notifications(req, res);
	});
	app.post('/ak/api/v[23]/notifications/bulk', t.middleware.verify_notifications_action_ak, (req, res) => {
		archive_notifications(req, res);
	});

	function archive_notifications(req, res) {
		req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/notifications/bulk';
		logger.debug('[pre-flight] setting validate route:', req._validate_path);

		t.validate.request(req, res, null, () => {
			t.notification_apis_lib.archive_notification_docs(req, (err, ret) => {
				if (err) {
					return res.status(t.ot_misc.get_code(err)).json(err);
				} else {
					return res.status(200).json(ret);
				}
			});
		});
	}

	return app;
};
