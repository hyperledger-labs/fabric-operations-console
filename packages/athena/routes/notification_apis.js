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
// Notification API Routes (aka activity logs, aka audit logs)
//------------------------------------------------------------
module.exports = (logger, ev, t) => {
	const app = t.express.Router();

	//--------------------------------------------------
	// Get all activity
	//--------------------------------------------------
	app.get('/api/v[123]/notifications', t.middleware.verify_view_action_session, (req, res) => {
		get_all(req, res);
	});
	app.get('/ak/api/v[123]/notifications', t.middleware.verify_view_action_ak, (req, res) => {
		get_all(req, res);
	});

	function get_all(req, res) {
		req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/notifications';
		logger.debug('[pre-flight] setting validate route:', req._validate_path);

		t.validate.request(req, res, null, () => {
			t.notifications.list_all(req, (err, ret) => {
				if (err) {
					return res.status(t.ot_misc.get_code(err)).json(err);
				} else {
					return res.status(200).json(ret);
				}
			});
		});
	}

	//--------------------------------------------------
	// Create an activity log (other/generic)
	//--------------------------------------------------
	app.post('/api/v[123]/notifications', t.middleware.verify_notifications_action_session, (req, res) => {
		t.notifications.createAlt(req, (err, resp) => {
			if (err) {
				logger.error('[activity apis] - could not create activity log', err);
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
	// Delete all activity logs (includes webhooks)
	//--------------------------------------------------
	app.delete('/api/v[123]/notifications/purge', t.middleware.verify_notifications_action_session, (req, res) => {
		delete_all(req, res);
	});
	app.delete('/ak/api/v[123]/notifications/purge', t.middleware.verify_notifications_action_ak, (req, res) => {
		delete_all(req, res);
	});

	function delete_all(req, res) {
		t.notifications.delete_all(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	}

	//--------------------------------------------------
	// Archive activity logs from an array of ids
	//--------------------------------------------------
	app.post('/api/v[23]/notifications/bulk', t.middleware.verify_notifications_action_session, (req, res) => {
		archive(req, res);
	});
	app.post('/ak/api/v[23]/notifications/bulk', t.middleware.verify_notifications_action_ak, (req, res) => {
		archive(req, res);
	});

	function archive(req, res) {
		req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/notifications/bulk';
		logger.debug('[pre-flight] setting validate route:', req._validate_path);

		t.validate.request(req, res, null, () => {
			t.notifications.archive(req, (err, ret) => {
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
