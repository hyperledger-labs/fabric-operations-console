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
// Logging API Routes
//------------------------------------------------------------
module.exports = (logger, ev, t) => {
	const app = t.express.Router();

	//--------------------------------------------------
	// Save client side logs somewhere
	//--------------------------------------------------
	app.post('/api/v[123]/logs', t.middleware.verify_view_action_session, (req, res) => {
		const save_logs = t.logging_apis_lib.save_client_side_logs(req);
		return res.status(t.ot_misc.get_code(save_logs)).json(save_logs);
	});

	//--------------------------------------------------
	// Save client side event for event tracker
	//--------------------------------------------------
	app.post('/api/v[123]/events/:resource/:resource_id', t.middleware.verify_view_action_session, (req, res) => {
		req._client_event = true;						// set flag for activity tracker

		const notice = {
			message: 'client side event',
			code: isNaN(req.body.http_code) ? null : Number(req.body.http_code),
			action_verb: req.body.action_verb,
			client_details: req.body.client_details,
		};
		t.notifications.procrastinate(req, notice);

		return res.status(202).json(ev.API_SUCCESS_RESPONSE);	// use 202 b/c the event generates when the request closes
	});

	//--------------------------------------------------
	// Get the latest log files - this returns an html page!
	//--------------------------------------------------
	app.get('/api/v[123]/logs', t.middleware.verify_view_action_session, function (req, res) {
		const latest_log_file = t.logging_apis_lib.list_latest_log_files(req);
		res.status(200).send(latest_log_file);
	});
	app.get('/ak/api/v[123]/logs', t.middleware.verify_view_action_ak, function (req, res) {
		const latest_log_file = t.logging_apis_lib.list_latest_log_files(req);
		res.status(200).send(latest_log_file);
	});

	//--------------------------------------------------
	// Get the desired log file
	//--------------------------------------------------
	app.get('/api/v[123]/logs/:logFile', t.middleware.verify_view_action_session, function (req, res) {
		const logs = t.logging_apis_lib.get_specific_log_file(req);
		res.set({ 'Content-Disposition': 'inline; filename="athena.log"' });
		res.set({ 'content-type': 'text/plain' });
		res.status(200).send(logs);
	});
	app.get('/ak/api/v[123]/logs/:logFile', t.middleware.verify_view_action_ak, function (req, res) {
		const logs = t.logging_apis_lib.get_specific_log_file(req);
		res.set({ 'Content-Disposition': 'inline; filename="athena.log"' });
		res.set({ 'content-type': 'text/plain' });
		res.status(200).send(logs);
	});

	//--------------------------------------------------
	// Change the file logging settings
	//--------------------------------------------------
	app.put('/api/v[123]/logs/file_settings', t.middleware.verify_logs_action_session, function (req, res) {
		change_logging_settings(req, res);
	});
	app.put('/ak/api/v[123]/logs/file_settings', t.middleware.verify_logs_action_ak, function (req, res) {
		change_logging_settings(req, res);
	});

	function change_logging_settings(req, res) {
		req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/logs/file_settings';
		logger.debug('[pre-flight] setting validate route:', req._validate_path);

		t.validate.request(req, res, null, () => {
			t.logging_apis_lib.change_logging_settings(req, (err, ret) => {
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
