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
// Keys API Routes - [These are unused apis 09/2020]
//------------------------------------------------------------
module.exports = (logger, ev, t) => {
	const app = t.express.Router();

	//--------------------------------------------------
	// Store a key in the database
	//--------------------------------------------------
	app.post('/api/v[123]/keys', t.middleware.verify_apiKey_action_session, (req, res) => {
		t.keys_lib.store_key(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Get all keys from the db for the current user
	//--------------------------------------------------
	app.get('/api/v[123]/keys', t.middleware.verify_view_action_session, (req, res) => {
		t.keys_lib.get_all_keys(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Edit a key in the database
	//--------------------------------------------------
	app.put('/api/v[123]/keys/:key_id', t.middleware.verify_apiKey_action_session, (req, res) => {
		t.keys_lib.edit_key(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Delete a key doc
	//--------------------------------------------------
	app.delete('/api/v[123]/keys/:key_id', t.middleware.verify_apiKey_action_session, (req, res) => {
		t.keys_lib.delete_key_doc(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});

	return app;
};
