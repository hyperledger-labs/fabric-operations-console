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
// Component API Routes
//------------------------------------------------------------

module.exports = function (logger, ev, t) {
	const app = t.express.Router();

	//--------------------------------------------------
	// Import a component aka add a component
	//--------------------------------------------------
	app.post('/api/v[23]/components', t.middleware.verify_import_action_session, (req, res) => {
		add_component(req, res);
	});

	const component_urls = [
		'/ak/api/v[23]/components',							// this is the only one you need, but... lets
		'/ak/api/v[23]/components/msp',						// make a bunch of routes so we can doc each in its own swagger section
		'/ak/api/v[23]/components/msp-external',
		'/ak/api/v[23]/components/fabric-ca',				// more alternates...
		'/ak/api/v[23]/components/fabric-orderer',
		'/ak/api/v[23]/components/fabric-peer',
	];
	app.post(component_urls, t.middleware.verify_import_action_ak, (req, res) => {
		add_component(req, res);
	});

	function add_component(req, res) {
		req.body.type = t.component_lib.find_type(req);			// body cannot be null, dealt with in body parser
		if (!req.body.type) {
			return res.status(400).json(t.validate.fmt_input_error(req, [{ key: 'missing_type' }]));
		}
		req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/components/' + req.body.type;
		logger.debug('[pre-flight] setting validate route:', req._validate_path);

		t.validate.request(req, res, null, () => {
			req._fmt_response = true;
			t.component_lib.onboard_component(req, (err, ret) => {
				if (err) {
					return res.status(t.ot_misc.get_code(err)).json(err);
				} else {
					return res.status(200).json(ret);
				}
			});
		});
	}

	//--------------------------------------------------
	// Edit an existing component
	//--------------------------------------------------
	app.put('/api/v[23]/components/:id', t.middleware.verify_import_action_session, (req, res) => {
		edit_component(req, res);
	});
	const edit_component_urls = [
		'/ak/api/v[23]/components/:id',					// this is the only one you need, but... lets
		'/ak/api/v[23]/components/msp/:id',				// make a bunch of routes so we can doc each in its own swagger section
		'/ak/api/v[23]/components/msp-external/:id',
		'/ak/api/v[23]/components/fabric-ca/:id',
		'/ak/api/v[23]/components/fabric-orderer/:id',
		'/ak/api/v[23]/components/fabric-peer/:id',
	];
	app.put(edit_component_urls, t.middleware.verify_import_action_ak, (req, res) => {
		edit_component(req, res);
	});

	function edit_component(req, res) {
		const get_opts = {
			req: req,
			id: req.params.id,
			skip_cache: true,
			log_msg: 'edit component',
		};
		t.component_lib.load_component_by_id(get_opts, (err_getDoc, resp_getDoc) => {
			if (err_getDoc) {
				// error already logged
				return res.status(t.ot_misc.get_code(err_getDoc)).json(err_getDoc);
			} else {
				const type = t.component_lib.get_type_from_doc(req._component_doc);

				// we don't need to set type in body, in fact that is a bad idea, its not an editable field
				req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/components/' + type + '/{id}';
				logger.debug('[pre-flight] setting validate route:', req._validate_path);

				t.validate.request(req, res, null, () => {
					t.component_lib.edit_component(req, (err, ret) => {
						if (err) {
							return res.status(t.ot_misc.get_code(err)).json(err);
						} else {
							return res.status(200).json(ret);
						}
					});
				});
			}
		});
	}

	//--------------------------------------------------
	// Delete a component from the db
	//--------------------------------------------------
	app.delete('/api/v[123]/components/:component_id', t.middleware.verify_remove_action_session, (req, res) => {
		delete_component(req, res);
	});
	app.delete('/ak/api/v[123]/components/:component_id', t.middleware.verify_remove_action_ak, (req, res) => {
		delete_component(req, res);
	});

	function delete_component(req, res) {
		t.component_lib.offboard_component(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	}

	//--------------------------------------------------
	// Get the component for the id passed in
	//--------------------------------------------------
	app.get('/api/v[123]/components/:id', t.middleware.verify_view_action_session, (req, res) => {
		get_a_component(req, res);
	});
	app.get('/ak/api/v[123]/components/:id', t.middleware.verify_view_action_ak, (req, res) => {
		get_a_component(req, res);
	});

	function get_a_component(req, res) {
		if (t.ot_misc.is_v2plus_route(req)) {
			req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/components/{id}';
			logger.debug('[pre-flight] setting validate route:', req._validate_path);
		}

		t.validate.request(req, res, null, () => {
			t.deployer.get_component_data(req, (err, data) => {
				t.component_lib.get_each_cas_info(req, null, (_, all_ca_info) => {
					if (err) {
						return res.status(t.ot_misc.get_code(err)).json(err);
					} else {
						const raw_data = {
							deployer_data: data.deployer_data,
							component_doc: data.athena_doc,
							all_ca_info: all_ca_info,
						};
						const ret = t.comp_fmt.fmt_comp_resp_with_deployer(req, raw_data);			// format response
						return res.status(200).json(ret);
					}
				});
			});
		});
	}


	//--------------------------------------------------
	// Get all components (imported and provisioned)
	//--------------------------------------------------
	app.get('/api/v[23]/components', t.middleware.verify_view_action_session, (req, res) => {
		get_multiple_components(req, res);
	});
	app.get('/ak/api/v[23]/components', t.middleware.verify_view_action_ak, (req, res) => {
		get_multiple_components(req, res);
	});

	//--------------------------------------------------
	// Get components by a tag
	//--------------------------------------------------
	app.get('/api/v[123]/components/tags/:tag', t.middleware.verify_view_action_session, (req, res) => {
		get_multiple_components(req, res);
	});
	app.get('/ak/api/v[123]/components/tags/:tag', t.middleware.verify_view_action_ak, (req, res) => {
		get_multiple_components(req, res);
	});

	//--------------------------------------------------
	// Get components by type
	//--------------------------------------------------
	const valid_types = [ev.STR.CA, ev.STR.PEER, ev.STR.ORDERER, ev.STR.MSP];
	app.get('/api/v[23]/components/types/:type', t.middleware.verify_view_action_session, (req, res, next) => {
		if (!valid_types.includes(req.params.type)) {
			return next();						// if its not the right type, send it to another route (probably 404)
		} else {
			get_multiple_components(req, res);
		}
	});

	app.get('/ak/api/v[23]/components/types/:type', t.middleware.verify_view_action_ak, (req, res, next) => {
		if (!valid_types.includes(req.params.type)) {
			return next();						// if its not the right type, send it to another route (probably 404)
		} else {
			get_multiple_components(req, res);
		}
	});

	function get_multiple_components(req, res) {
		if (req.params.tag) {
			// the '/:tag' routes need swagger's route syntax (for validation matching)
			req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/components/tags/{tag}';
		} else if (req.params.type) {
			// the '/:type' routes need swagger's route syntax (for validation matching)
			req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/components/types/{type}';
		} else {
			req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/components';
		}
		logger.debug('[pre-flight] setting validate route:', req._validate_path);

		t.validate.request(req, res, t.validate.ca_attrs_unsupported, () => {
			t.deployer.get_all_components(req, (err, data) => {				// works on imported and provisioned components...
				t.component_lib.get_each_cas_info(req, (data ? data.athena_docs : null), (_, all_ca_info) => {
					if (err) {
						const code = t.ot_misc.get_code(err);
						if (err.statusCode === 222) {				// 222 is a special "error", should not look like an error to the client, delete statusCode
							delete err.statusCode;
						}
						return res.status(code).json(err);
					} else {
						const raw_data = {
							deployer_data: data.deployer_data,
							athena_docs: data.athena_docs,
							all_ca_info: all_ca_info,
						};
						const ret = t.comp_fmt.format_athena_component_data(req, raw_data);	// format response
						return res.status(200).json(ret);
					}
				});
			});
		});
	}

	//--------------------------------------------------
	// Add components in bulk
	//--------------------------------------------------
	app.post('/api/v[123]/components/bulk', t.middleware.verify_import_action_session, (req, res) => {
		add_components_in_bulk(req, res);
	});

	app.post('/ak/api/v[123]/components/bulk', t.middleware.verify_import_action_ak, (req, res) => {
		add_components_in_bulk(req, res);
	});

	function add_components_in_bulk(req, res) {
		t.component_lib.add_bulk_components(req, (errs, ret_objects) => {
			if (errs && errs.length > 0) {
				return res.status(207).json({ errors: errs, successes: ret_objects });
			} else {
				return res.status(200).json({ errors: errs, successes: ret_objects });
			}
		});
	}

	//--------------------------------------------------
	// Bulk delete components from db
	//--------------------------------------------------
	app.delete('/api/v[123]/components/tags/:tag', t.middleware.verify_remove_action_session, (req, res) => {
		bulk_delete_components(req, res);
	});
	app.delete('/ak/api/v[123]/components/tags/:tag', t.middleware.verify_remove_action_ak, (req, res) => {
		bulk_delete_components(req, res);
	});

	function bulk_delete_components(req, res) {
		req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/components/tags/{tag}';
		logger.debug('[pre-flight] setting validate route:', req._validate_path);

		t.validate.request(req, res, null, () => {
			t.component_lib.bulk_offboard_components(req, (errObj, ret) => {
				if (errObj) {
					if (errObj.statusCode === 222) {					// 222 -> 0 components found, this is an error for delete by tag
						errObj.statusCode = 404;
					}
					const code = t.ot_misc.get_code(errObj);
					res.status(code).json(errObj);
				} else {
					const code = t.ot_misc.get_code(ret);
					delete ret.statusCode;
					res.status(code).json(ret);
				}
			});
		});
	}

	//--------------------------------------------------
	// Bulk component status
	//--------------------------------------------------
	app.post('/api/v[123]/components/status', t.middleware.verify_view_action_session, (req, res) => {
		bulk_status_components(req, res);
	});
	app.post('/ak/api/v[123]/components/status', t.middleware.verify_view_action_ak, (req, res) => {
		bulk_status_components(req, res);
	});

	function bulk_status_components(req, res) {
		t.component_lib.bulk_component_status(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				res.status(207).json(ret);
			}
		});
	}

	return app;
};
