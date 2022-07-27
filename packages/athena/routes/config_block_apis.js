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
// Config/Genesis Block API Routes
//------------------------------------------------------------
module.exports = (logger, ev, t) => {
	const app = t.express.Router();

	//--------------------------------------------------
	// Get config block docs
	//--------------------------------------------------
	app.get('/api/v[123]/configblocks', t.middleware.verify_view_action_session, (req, res) => {
		getConfigBlocks(req, res);
	});
	app.get('/ak/api/v[123]/configblocks', t.middleware.verify_view_action_ak, (req, res) => {
		getConfigBlocks(req, res);
	});

	function getConfigBlocks(req, res) {
		t.config_blocks_lib.getConfigBlocks(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json({ blocks: ret });
			}
		});
	}

	//--------------------------------------------------
	// Get a single config block tx
	//--------------------------------------------------
	app.get('/api/v[123]/configblocks/:tx_id', t.middleware.verify_view_action_session, (req, res) => {
		getConfigBlockById(req, res);
	});
	app.get('/ak/api/v[123]/configblocks/:tx_id', t.middleware.verify_view_action_ak, (req, res) => {
		getConfigBlockById(req, res);
	});

	function getConfigBlockById(req, res) {
		t.config_blocks_lib.getConfigBlockById(req.params.tx_id, t.ot_misc.skip_cache(req), (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	}

	//--------------------------------------------------
	// Store config block doc
	//--------------------------------------------------
	// dsh todo validation, make sure b_block is base64
	app.post('/api/v[123]/configblocks/:tx_id', t.middleware.verify_manage_action_session, (req, res) => {
		createConfigBlock(req, res);
	});
	app.post('/ak/api/v[123]/configblocks/:tx_id', t.middleware.verify_manage_action_ak, (req, res) => {
		createConfigBlock(req, res);
	});

	function createConfigBlock(req, res) {
		if (t.ot_misc.is_v2plus_route(req)) {
			req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/configblocks/{id}';
			logger.debug('[pre-flight] setting validate route:', req._validate_path);
		}
		t.validate.request(req, res, null, () => {
			t.config_blocks_lib.createConfigBlockDoc(req, (err, ret) => {
				if (err) {
					return res.status(t.ot_misc.get_code(err)).json(err);
				} else {
					return res.status(200).json(ret);
				}
			});
		});
	}

	//--------------------------------------------------
	// Delete a config block doc
	//--------------------------------------------------
	app.delete('/api/v[123]/configblocks/:tx_id', t.middleware.verify_manage_action_session, (req, res) => {
		deleteConfigBlock(req, res);
	});
	app.delete('/ak/api/v[123]/configblocks/:tx_id', t.middleware.verify_manage_action_ak, (req, res) => {
		deleteConfigBlock(req, res);
	});

	function deleteConfigBlock(req, res) {
		if (t.ot_misc.is_v2plus_route(req)) {
			req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/configblocks/{id}';
			logger.debug('[pre-flight] setting validate route:', req._validate_path);
		}

		t.validate.request(req, res, null, () => {
			t.config_blocks_lib.deleteBlockDoc(req, (err, ret) => {
				if (err) {
					return res.status(t.ot_misc.get_code(err)).json(err);
				} else {
					return res.status(200).json(ret);
				}
			});
		});
	}

	//--------------------------------------------------
	// Archive a config block doc
	//--------------------------------------------------
	app.put('/api/v[123]/configblocks/:tx_id', t.middleware.verify_manage_action_session, (req, res) => {
		archiveConfigBlock(req, res);
	});
	app.put('/ak/api/v[123]/configblocks/:tx_id', t.middleware.verify_manage_action_ak, (req, res) => {
		archiveConfigBlock(req, res);
	});

	function archiveConfigBlock(req, res) {
		if (t.ot_misc.is_v2plus_route(req)) {
			req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/configblocks/{id}';
			logger.debug('[pre-flight] setting validate route:', req._validate_path);
		}

		t.validate.request(req, res, null, () => {
			t.config_blocks_lib.archiveBlockDoc(req, (err, ret) => {
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
