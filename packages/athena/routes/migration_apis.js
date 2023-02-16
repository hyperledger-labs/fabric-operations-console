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
// Migration API Routes
//------------------------------------------------------------
module.exports = (logger, ev, t) => {
	const app = t.express.Router();

	//--------------------------------------------------
	// Get the overall migration status
	//--------------------------------------------------
	app.get('/api/v[3]/migration/status', t.middleware.verify_view_action_session, (req, res) => {
		get_status(req, res);
	});

	app.get('/ak/api/v[3]/migration/status', t.middleware.verify_view_action_ak, (req, res) => {
		get_status(req, res);
	});

	function get_status(req, res) {
		t.migration_lib.get_status(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	}


	//--------------------------------------------------
	// Validate every node's fabric version
	//--------------------------------------------------
	app.get('/api/v[3]/migration/fabric/versions', t.middleware.verify_view_action_session, (req, res) => {
		validate_fabric_versions(req, res);
	});

	app.get('/ak/api/v[3]/migration/fabric/versions', t.middleware.verify_view_action_ak, (req, res) => {
		validate_fabric_versions(req, res);
	});

	function validate_fabric_versions(req, res) {
		t.migration_lib.validate_fabric_versions(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	}

	//--------------------------------------------------
	// Validate the cluster's kubernetes version
	//--------------------------------------------------
	app.get('/api/v[3]/migration/kubernetes/versions', t.middleware.verify_view_action_session, (req, res) => {
		validate_k8s_versions(req, res);
	});

	app.get('/ak/api/v[3]/migration/kubernetes/versions', t.middleware.verify_view_action_ak, (req, res) => {
		validate_k8s_versions(req, res);
	});

	function validate_k8s_versions(req, res) {
		t.migration_lib.validate_k8s_versions(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	}

	//--------------------------------------------------
	// Start the migration!
	//--------------------------------------------------
	app.post('/api/v[3]/migration/start', t.middleware.verify_manage_action_session_dep, (req, res) => {
		start_migration(req, res);
	});

	app.post('/ak/api/v[3]/migration/start', t.middleware.verify_manage_action_ak_dep, (req, res) => {
		start_migration(req, res);
	});

	function start_migration(req, res) {
		t.migration_lib.migrate_ingress(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	}

	//--------------------------------------------------
	// Toggle if migration is enabled (the feature flag) - OK these really shouldn't be GETs, but it makes it easier - todo remove these apis
	//--------------------------------------------------
	app.get('/api/v[3]/migration/enabled', t.middleware.verify_settings_action_session, (req, res) => {
		set_migration_feature_flag(req, res, true);
	});

	app.get('/ak/api/v[3]/migration/enabled', t.middleware.verify_settings_action_ak, (req, res) => {
		set_migration_feature_flag(req, res, true);
	});

	app.get('/api/v[3]/migration/disabled', t.middleware.verify_settings_action_session, (req, res) => {
		set_migration_feature_flag(req, res, false);
	});

	app.get('/ak/api/v[3]/migration/disabled', t.middleware.verify_settings_action_ak, (req, res) => {
		set_migration_feature_flag(req, res, false);
	});

	function set_migration_feature_flag(req, res, value) {
		t.migration_lib.set_migration_feature_flag(value, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	}

	//--------------------------------------------------
	// For debug - reset migration steps
	//--------------------------------------------------
	app.get('/api/v[3]/migration/reset', t.middleware.verify_settings_action_session, (req, res) => {
		reset_steps(req, res);
	});

	function reset_steps(req, res) {
		t.migration_lib.clear_migration_status((err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ev.API_SUCCESS_RESPONSE);
			}
		});
	}

	return app;
};
