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
// Signature Collection API Routes
//------------------------------------------------------------
module.exports = (logger, ev, t) => {
	const app = t.express.Router();

	const sigMiddle = [t.middleware.public, t.signature_collection_lib.validateApiSignature];

	//--------------------------------------------------
	// Get signature collection txs
	//--------------------------------------------------
	app.get('/api/v[123]/signature_collections', t.middleware.verify_view_action_session, (req, res) => {
		getSigCollections(req, res);
	});
	app.get('/ak/api/v[123]/signature_collections', t.middleware.verify_view_action_ak, (req, res) => {
		getSigCollections(req, res);
	});

	function getSigCollections(req, res) {
		if (t.ot_misc.is_v2plus_route(req)) {
			req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/signature_collections';
			logger.debug('[pre-flight] setting validate route:', req._validate_path);
		}

		t.validate.request(req, res, t.validate.query_filter_orderers, () => {
			t.signature_collection_lib.getSignatureCollections(req, (err, ret) => {
				if (err) {
					return res.status(t.ot_misc.get_code(err)).json(err);
				} else {
					let code = 200;
					if (t.signature_collection_lib.group_query_param_is_set(req)) {
						code = 210;				// the group by channels param uses a different response format, identified by the 210 code
					}
					return res.status(code).json(ret);
				}
			});
		});
	}

	//--------------------------------------------------
	// Get a single signature collection tx
	//--------------------------------------------------
	app.get('/api/v[123]/signature_collections/:tx_id', t.middleware.verify_view_action_session, (req, res) => {
		t.signature_collection_lib.getSignatureCollectionById(req.params.tx_id, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});
	app.get('/ak/api/v[123]/signature_collections/:tx_id', t.middleware.verify_view_action_ak, (req, res) => {
		t.signature_collection_lib.getSignatureCollectionById(req.params.tx_id, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Store signature collection tx
	//--------------------------------------------------
	const createRoutes = ['/api/v[123]/signature_collections', '/ak/api/v[123]/signature_collections'];
	app.post(createRoutes, sigMiddle, (req, res) => {
		if (t.ot_misc.is_v2plus_route(req)) {
			req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/signature_collections';
			logger.debug('[pre-flight] setting validate route:', req._validate_path);
		}

		t.validate.request(req, res, null, () => {
			t.signature_collection_lib.createOrAppendSignature(req, false, (err, ret) => {
				if (err) {
					return res.status(t.ot_misc.get_code(err)).json(err);
				} else {
					return res.status(200).json(ret);
				}
			});
		});
	});

	//--------------------------------------------------
	// Append signature(s) to signature collection tx OR redistribute tx OR close tx
	//--------------------------------------------------
	const appendRoutes = ['/api/v[123]/signature_collections/:tx_id', '/ak/api/v[123]/signature_collections/:tx_id'];
	app.put(appendRoutes, sigMiddle, (req, res) => {			// v1 & v2 takes signature auth
		createOrAppend(req, res);
	});

	function createOrAppend(req, res) {
		if (t.ot_misc.is_v2plus_route(req)) {
			req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/signature_collections/{id}';
			logger.debug('[pre-flight] setting validate route:', req._validate_path);
		}

		t.validate.request(req, res, null, () => {
			t.signature_collection_lib.createOrAppendSignature(req, true, (err, ret) => {
				if (err) {
					return res.status(t.ot_misc.get_code(err)).json(err);
				} else {
					return res.status(200).json(ret);
				}
			});
		});
	}

	//--------------------------------------------------
	// Test api version availability
	// this is a OPTIONS request, use this api to see if /v1/ or /v2/ edit/create/delete apis are available
	// (don't need to concat deleteRoutes b/c atm they are the same as appendRoutes)
	//--------------------------------------------------
	app.options(createRoutes.concat(appendRoutes), t.middleware.public, (req, res) => {
		const obj = {
			routes: ['v3', 'v2', 'v1'],			// order indicates preference
		};
		res.status(200).json({
			methods: {
				'get': obj,
				'post': obj,
				'put': obj,
				'delete': obj
			}
		});
	});

	//--------------------------------------------------
	// Resend signature collection txs
	//--------------------------------------------------
	app.put('/api/v[123]/signature_collections/:tx_id/resend', t.middleware.verify_sigCollections_action_session, (req, res) => {	// takes session auth!!
		resend(req, res);
	});
	app.put('/ak/api/v[123]/signature_collections/:tx_id/resend', t.middleware.verify_sigCollections_action_ak, (req, res) => {	// takes session auth!!
		resend(req, res);
	});

	function resend(req, res) {
		if (t.ot_misc.is_v2plus_route(req)) {
			req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/signature_collections/{id}/resend';
			logger.debug('[pre-flight] setting validate route:', req._validate_path);
		}

		t.validate.request(req, res, null, () => {
			t.signature_collection_lib.resendFailedDistributionTxs(req, (err, ret) => {
				if (err) {
					return res.status(t.ot_misc.get_code(err)).json(err);
				} else {
					const code = (ret && ret._status_code) ? ret._status_code : 500;
					if (ret) { delete ret._status_code; }
					return res.status(code).json(ret);
				}
			});
		});
	}

	//--------------------------------------------------
	// Delete signature(s) collection tx
	//--------------------------------------------------
	app.delete('/api/v[123]/signature_collections/:tx_id', t.middleware.verify_sigCollections_action_session, (req, res) => {
		delete_tx(req, res);
	});
	app.delete('/ak/api/v[123]/signature_collections/:tx_id', t.middleware.verify_sigCollections_action_ak, (req, res) => {
		delete_tx(req, res);
	});
	app.put('/api/v[123]/signature_collections/:tx_id/terminate', t.middleware.verify_sigCollections_action_session, (req, res) => {
		delete_tx(req, res);
	});
	app.put('/ak/api/v[123]/signature_collections/:tx_id/terminate', t.middleware.verify_sigCollections_action_ak, (req, res) => {
		delete_tx(req, res);
	});

	function delete_tx(req, res) {
		if (t.ot_misc.is_v2plus_route(req)) {
			req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/signature_collections/{id}';
			logger.debug('[pre-flight] setting validate route:', req._validate_path);
		}

		t.validate.request(req, res, null, () => {
			t.signature_collection_lib.deleteSignatureCollection(req, (err, ret) => {
				if (err) {
					return res.status(t.ot_misc.get_code(err)).json(err);
				} else {
					return res.status(200).json(ret);
				}
			});
		});
	}

	//--------------------------------------------------
	// Register external athenas
	//--------------------------------------------------
	app.post('/api/v[123]/parties', t.middleware.verify_sigCollections_action_session, (req, res) => {
		t.signature_collection_lib.registerExternalAthenas(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});
	app.post('/ak/api/v[123]/parties', t.middleware.verify_sigCollections_action_ak, (req, res) => {
		t.signature_collection_lib.registerExternalAthenas(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// List external & internal athenas/msps
	//--------------------------------------------------
	app.get('/api/v[123]/parties', t.middleware.verify_view_action_session, (req, res) => {
		t.signature_collection_lib.getAllPartyData((err, resp) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				resp = t.signature_collection_lib.buildListMspResponse(resp);
				return res.status(200).json(resp);
			}
		});
	});
	app.get('/ak/api/v[123]/parties', t.middleware.verify_view_action_ak, (req, res) => {
		t.signature_collection_lib.getAllPartyData((err, resp) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				resp = t.signature_collection_lib.buildListMspResponse(resp);
				return res.status(200).json(resp);
			}
		});
	});

	//--------------------------------------------------
	// Remove external athenas/msps
	//--------------------------------------------------
	app.delete('/api/v[123]/parties', t.middleware.verify_sigCollections_action_session, (req, res) => {
		t.signature_collection_lib.removeExternalAthenas(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(t.ot_misc.get_code(ret)).json(ret);
			}
		});
	});
	app.delete('/ak/api/v[123]/parties', t.middleware.verify_sigCollections_action_ak, (req, res) => {
		t.signature_collection_lib.removeExternalAthenas(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(t.ot_misc.get_code(ret)).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Get msp's certificate
	//--------------------------------------------------
	app.get(['/api/v[123]/components/msps/:msp_id', '/ak/api/v[123]/components/msps/:msp_id'], t.middleware.public, (req, res) => {
		t.signature_collection_lib.getMspsCertificate(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Edit visibility of multiple signature collection txs (aka dismiss tx)
	//--------------------------------------------------
	app.put('/api/v[123]/signature_collections/bulk/visibility', t.middleware.verify_sigCollections_action_session, (req, res) => {
		t.signature_collection_lib.editSignatureCollectionVisibilities(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});
	app.put('/ak/api/v[123]/signature_collections/bulk/visibility', t.middleware.verify_sigCollections_action_ak, (req, res) => {
		t.signature_collection_lib.editSignatureCollectionVisibilities(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});
	return app;
};
