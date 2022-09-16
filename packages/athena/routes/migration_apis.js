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
	// Start database migration
	//--------------------------------------------------
	app.post('/api/v[3]/migration/databases', t.middleware.verify_view_action_session, (req, res) => {
		migrate_dbs(req, res);
	});

	app.post('/ak/api/v[3]/migration/databases', t.middleware.verify_view_action_ak, (req, res) => {
		migrate_dbs(req, res);
	});

	function migrate_dbs(req, res) {
		t.migration_lib.migrate_dbs(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	}

	return app;
};
