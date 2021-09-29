/*
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
// Backup API Routes
//------------------------------------------------------------
module.exports = function (logger, ev, t) {
	const app = t.express.Router();

	//-----------------------------------------------------------------------------
	// Start database backup
	//-----------------------------------------------------------------------------
	app.post('/api/v[123]/backups', t.middleware.verify_settings_action_session, (req, res) => {
		backup(req, res);
	});
	app.post('/ak/api/v[123]/backups', t.middleware.verify_settings_action_ak, (req, res) => {
		backup(req, res);
	});
	function backup(req, res) {
		if (t.ot_misc.is_v2plus_route(req)) {
			req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/backups';
			logger.debug('[pre-flight] setting validate route:', req._validate_path);
		}

		t.validate.request(req, res, null, () => {
			t.dbs.athena_backup(req, (err, ret) => {
				if (err) {
					return res.status(t.ot_misc.get_code(err)).json(err);
				} else {
					return res.status(202).json(ret);
				}
			});
		});
	}

	//-----------------------------------------------------------------------------
	//  Start a database restore by sending the backup data
	//-----------------------------------------------------------------------------
	app.put('/api/v[123]/backups', t.middleware.verify_settings_action_session, (req, res) => {
		restore(req, res);
	});
	app.put('/ak/api/v[123]/backups', t.middleware.verify_settings_action_ak, (req, res) => {
		restore(req, res);
	});
	function restore(req, res) {
		if (t.ot_misc.is_v2plus_route(req)) {
			req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/backups';
			logger.debug('[pre-flight] setting validate route:', req._validate_path);
		}

		t.validate.request(req, res, null, () => {
			t.dbs.athena_restore(req, req.body, (err, ret) => {
				if (err) {
					return res.status(t.ot_misc.get_code(err)).json(err);
				} else {
					return res.status(202).json(ret);
				}
			});
		});
	}

	//-----------------------------------------------------------------------------
	// Start a database restore by sending a backup doc id
	//-----------------------------------------------------------------------------
	app.put('/api/v[123]/backups/:backup_id', t.middleware.verify_settings_action_session, (req, res) => {
		restore_by_id(req, res);
	});
	app.put('/ak/api/v[123]/backups/:backup_id', t.middleware.verify_settings_action_ak, (req, res) => {
		restore_by_id(req, res);
	});
	function restore_by_id(req, res) {
		if (t.ot_misc.is_v2plus_route(req)) {
			req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/backups/{id}';
			logger.debug('[pre-flight] setting validate route:', req._validate_path);
		}

		t.validate.request(req, res, null, () => {
			t.dbs.athena_restore_by_doc(req, req.params.backup_id, (err, ret) => {
				if (err) {
					return res.status(t.ot_misc.get_code(err)).json(err);
				} else {
					return res.status(202).json(ret);
				}
			});
		});
	}

	//-----------------------------------------------------------------------------
	// Append attachment data to a backup doc
	//-----------------------------------------------------------------------------
	app.put('/api/v[123]/backups/:backup_id/attachments/:att_name', t.middleware.verify_settings_action_session, (req, res) => {
		append_backup(req, res);
	});
	app.put('/ak/api/v[123]/backups/:backup_id/attachments/:att_name', t.middleware.verify_settings_action_ak, (req, res) => {
		append_backup(req, res);
	});
	function append_backup(req, res) {
		if (t.ot_misc.is_v2plus_route(req)) {
			req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/backups/{id}/attachments/{att_name}';
			logger.debug('[pre-flight] setting validate route:', req._validate_path);
		}

		t.validate.request(req, res, null, () => {
			t.dbs.append_backup_doc(req, (err, ret) => {
				if (err) {
					return res.status(t.ot_misc.get_code(err)).json(err);
				} else {
					return res.status(200).json(ret);
				}
			});
		});
	}

	//-----------------------------------------------------------------------------
	// Get backup data
	//-----------------------------------------------------------------------------
	app.get('/api/v[123]/backups/:backup_id', t.middleware.verify_settings_action_session, (req, res) => {
		get_backup(req, res);
	});
	app.get('/ak/api/v[123]/backups/:backup_id', t.middleware.verify_settings_action_ak, (req, res) => {
		get_backup(req, res);
	});

	function get_backup(req, res) {
		if (t.ot_misc.is_v2plus_route(req)) {
			req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/backups/{id}';
			logger.debug('[pre-flight] setting validate route:', req._validate_path);
		}

		t.validate.request(req, res, null, () => {
			t.dbs.get_backup(req.params.backup_id, (err, ret) => {
				if (err) {
					return res.status(t.ot_misc.get_code(err)).json(err);
				} else {
					return res.status(200).json(ret);
				}
			});
		});
	}

	//-----------------------------------------------------------------------------
	// Get all backup ids
	//-----------------------------------------------------------------------------
	app.get('/api/v[123]/backups', t.middleware.verify_settings_action_session, (req, res) => {
		get_backup_ids(req, res);
	});
	app.get('/ak/api/v[123]/backups', t.middleware.verify_settings_action_ak, (req, res) => {
		get_backup_ids(req, res);
	});

	function get_backup_ids(req, res) {
		if (t.ot_misc.is_v2plus_route(req)) {
			req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/backups';
			logger.debug('[pre-flight] setting validate route:', req._validate_path);
		}

		t.validate.request(req, res, null, () => {
			t.dbs.get_backup_ids((err, ret) => {
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
