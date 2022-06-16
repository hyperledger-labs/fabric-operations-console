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
// Deployer API Routes
//------------------------------------------------------------
module.exports = (logger, ev, t) => {
	const app = t.express.Router();

	//--------------------------------------------------
	// Create a component via a deployer request
	//--------------------------------------------------
	app.post('/api/saas/v[23]/components', t.middleware.verify_create_action_session, (req, res) => {
		provision(req, res);
	});

	const component_urls = [
		'/ak/api/v[23]/kubernetes/components',							// this is the only one you need, but... lets
		'/ak/api/v[23]/kubernetes/components/fabric-ca',				// make a bunch of routes so we can doc each in its own swagger section
		'/ak/api/v[23]/kubernetes/components/fabric-orderer',			// pre-create and normal create
		'/ak/api/v[23]/kubernetes/components/fabric-peer',
	];
	app.post(component_urls, t.middleware.verify_create_action_ak, (req, res) => {
		provision(req, res);
	});

	function provision(req, res) {
		req.body.type = t.component_lib.find_type(req);					// body cannot be null, dealt with in body parser
		if (!req.body.type) {
			return res.status(400).json(t.validate.fmt_input_error(req, [{ key: 'missing_type' }]));
		}
		req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/kubernetes/components/' + req.body.type;
		logger.debug('[pre-flight] setting validate route:', req._validate_path);

		t.component_lib.rebuildWhiteList(req, (error, whitelist) => {	// get up to date whitelist
			req._whitelist = whitelist;

			t.validate.request(req, res, t.validate.valid_create_component, () => {
				t.deployer.provision_component(req, (errObj, ret) => {
					if (errObj) {
						res.status(t.ot_misc.get_code(errObj)).json(errObj);
					} else {
						res.status(200).json(ret.athena_fmt);
					}
				});
			});
		});
	}

	//--------------------------------------------------
	// Update a component via a deployer request (can update fabric versions, resources, etc)
	//--------------------------------------------------
	app.put('/api/saas/v[23]/components/:athena_component_id', t.middleware.verify_create_action_session, (req, res) => {
		update(req, res);
	});
	const ak_component_urls = [
		'/ak/api/v[23]/kubernetes/components/:athena_component_id',
		'/ak/api/v[23]/kubernetes/components/fabric-ca/:athena_component_id',				// more alternates...
		'/ak/api/v[23]/kubernetes/components/fabric-orderer/:athena_component_id',
		'/ak/api/v[23]/kubernetes/components/fabric-peer/:athena_component_id',
	];
	app.put(ak_component_urls, t.middleware.verify_create_action_ak, (req, res) => {
		update(req, res);
	});

	function update(req, res) {
		const get_opts = {
			req: req,
			id: req.params.athena_component_id,
			skip_cache: true,
			log_msg: 'update k8s component',
		};
		t.component_lib.load_component_by_id(get_opts, (err_getDoc, resp_getDoc) => {
			if (err_getDoc) {
				// error already logged
				return res.status(t.ot_misc.get_code(err_getDoc)).json(err_getDoc);
			} else {
				const type = t.component_lib.get_type_from_doc(req._component_doc);

				// we don't need to set type in body, in fact that is a bad idea, its not an editable field
				req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/kubernetes/components/' + type + '/{id}';
				logger.debug('[pre-flight] setting validate route:', req._validate_path);

				t.component_lib.rebuildWhiteList(req, (error, whitelist) => {	// get up to date whitelist
					req._whitelist = whitelist;

					t.validate.request(req, res, t.validate.resource_validation, () => {
						if (req.body && req.body.dry_run_mode === true) {
							logger.debug('[dry run] this is a dry run request, the component will not be edited. the request was valid.');
							const ret = JSON.parse(JSON.stringify(ev.API_SUCCESS_RESPONSE));
							ret.dry_run_mode = true;
							res.status(200).json(ret);
							return;
						}

						t.deployer.update_component(req, (errObj, ret) => {
							if (errObj) {
								res.status(t.ot_misc.get_code(errObj)).json(errObj);
							} else {
								res.status(200).json(ret.athena_fmt);
							}
						});
					});
				});
			}
		});
	}

	//--------------------------------------------------
	// Delete all components (saas and non-saas)
	//--------------------------------------------------
	app.delete('/saas/api/v[123]/components/purge', t.middleware.verify_delete_action_session, (req, res) => {
		t.deployer.deprovision_all_components(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				res.status(200).json(ret);
			}
		});
	});
	app.delete('/ak/api/v[123]/kubernetes/components/purge', t.middleware.verify_delete_action_ak, (req, res) => {
		t.deployer.deprovision_all_components(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Delete a component via a deployer request
	//--------------------------------------------------
	app.delete('/api/saas/v[123]/components/:component_id', t.middleware.verify_delete_action_session, (req, res) => {
		t.deployer.deprovision_component(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				res.status(200).json(ret);
			}
		});
	});
	app.delete('/ak/api/v[123]/kubernetes/components/:component_id', t.middleware.verify_delete_action_ak, (req, res) => {
		t.deployer.deprovision_component(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Delete a component via a deployer request - does not need doc to be in athena db
	//--------------------------------------------------
	app.delete('/ak/api/v[23]/kubernetes/components/type/:type/:dep_component_id', t.middleware.verify_delete_action_ak, (req, res) => {
		t.deployer.deprovision_component_without_doc(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Bulk Delete components via a deployer request
	//--------------------------------------------------
	app.delete('/api/saas/v[123]/components/tags/:tag', t.middleware.verify_delete_action_session, (req, res) => {
		bulk_delete_components(req, res);
	});
	app.delete('/ak/api/v[123]/kubernetes/components/tags/:tag', t.middleware.verify_delete_action_ak, (req, res) => {
		bulk_delete_components(req, res);
	});

	function bulk_delete_components(req, res) {
		req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/kubernetes/components/tags/{tag}';
		logger.debug('[pre-flight] setting validate route:', req._validate_path);

		t.validate.request(req, res, null, () => {
			t.deployer.bulk_deprovision_components(req, (errObj, ret) => {
				if (errObj) {
					if (errObj.statusCode === 222) {			// 222 -> 0 components found, this is an error for delete by tag
						errObj.statusCode = 404;
					}
					const code = t.ot_misc.get_code(errObj);
					res.status(code).json(errObj);
				} else {
					const code = t.ot_misc.get_code(ret);		// multi status response
					delete ret.statusCode;
					res.status(code).json(ret);
				}
			});
		});
	}

	//--------------------------------------------------
	// Bulk edit components via a deployer request
	//--------------------------------------------------
	app.put('/api/saas/v[123]/components/tags/:tag', t.middleware.verify_create_action_session, (req, res) => {
		bulk_edit(req, res);
	});
	app.put('/ak/api/v[123]/kubernetes/components/tags/:tag', t.middleware.verify_create_action_ak, (req, res) => {
		bulk_edit(req, res);
	});

	function bulk_edit(req, res) {
		t.deployer.bulk_update_components(req, (errObj, ret) => {
			if (errObj) {
				if (errObj.statusCode === 222) {			// 222 -> 0 components found, this is an error for edit by tag
					errObj.statusCode = 404;
				}
				const code = t.ot_misc.get_code(errObj);
				res.status(code).json(errObj);
			} else {
				const code = t.ot_misc.get_code(ret);		// multi status response
				delete ret.statusCode;
				res.status(code).json(ret);
			}
		});
	}

	//--------------------------------------------------
	// Get all k8s deployments (aka get all components) - (only returns provisioned components, will not list imported components)
	//--------------------------------------------------
	app.get('/api/saas/v[123]/components', t.middleware.verify_view_action_session_dep, (req, res) => {
		get_all_components(req, res);
	});
	app.get('/ak/api/v[123]/kubernetes/components', t.middleware.verify_view_action_ak_dep, (req, res) => {
		get_all_components(req, res);
	});

	function get_all_components(req, res) {
		if (t.ot_misc.is_v2plus_route(req)) {
			req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/kubernetes/components';
			logger.debug('[pre-flight] setting validate route:', req._validate_path);
		}

		t.validate.request(req, res, null, () => {
			req._include_deployment_attributes = true;
			t.deployer.get_all_components(req, (err, ret) => {
				if (err) {
					return res.status(t.ot_misc.get_code(err)).json(err);
				} else {
					return res.status(200).json(t.comp_fmt.format_deployer_component_data(req, ret));
				}
			});
		});
	}

	//--------------------------------------------------
	// Send/submit genesis or config block to an orderer node (aka finish raft append)
	//--------------------------------------------------
	app.put('/api/saas/v[123]/components/:athena_component_id/config', t.middleware.verify_view_action_session_dep, (req, res) => {
		t.deployer.send_config_block(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				delete ret.statusCode;
				res.status(200).json(ret);
			}
		});
	});
	app.put('/ak/api/v[123]/kubernetes/components/:athena_component_id/config', t.middleware.verify_view_action_ak_dep, (req, res) => {
		t.deployer.send_config_block(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				delete ret.statusCode;
				res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Proxy mustgather file download through to deployer
	//--------------------------------------------------
	app.get('/deployer/api/v3/instance/:siid/mustgather/download', t.middleware.verify_create_action_session, (req, res) => {
		const downloadUrl = `${encodeURI(t.misc.format_url(ev.DEPLOYER_URL))}/api/v3/instance/${req.params.siid}/mustgather/download`;
		t.request.get(downloadUrl).pipe(res);
	});

	//--------------------------------------------------
	// Proxy Deployer Requests
	//--------------------------------------------------
	app.all('/deployer/api/v*/*', t.middleware.verify_create_action_session, (req, res) => {
		req.path2use = req.originalUrl.substring(9);								// strip off the "/deployer" part
		req._key_src = req.path2use;
		req._key = t.misc.hash_str(req._key_src);
		const cached_routes = [
			'/api/v1/instance/$iid/type/all/versions', '/api/v1/instance/$iid/status',
			'/api/v2/instance/$iid/type/all/versions', '/api/v2/instance/$iid/status',
			'/api/v3/instance/$iid/type/all/versions', '/api/v3/instance/$iid/status',
		];

		if (ev.PROXY_CACHE_ENABLED === true && req.method === 'GET' && cached_routes.includes(req.path2use)) {
			const hit = t.proxy_cache.get(req._key);
			req._cache_this_req = true;
			if (hit && hit.data && hit.key_src === req._key_src) {					// protect from hash collision
				if (!hit.headers) { hit.headers = {}; }
				hit.headers['X-Cached-Timestamp'] = hit.cached_ts;					// let it be known, for this data might be old, but it is surly fast
				hit.headers['X-Cache-Expires-In'] = t.misc.friendly_ms(t.proxy_cache.getTtl(req._key) - Date.now());
				return proxy_reply(res, hit.code, hit.headers, hit.data);
			}
		}
		return proxy(req, res);
	});
	app.get('/ak/deployer/api/v*/*', t.middleware.verify_view_action_ak_dep, (req, res) => {
		req.path2use = req.originalUrl.substring(12);								// strip off the "/ak/deployer" part
		req._key_src = req.path2use;
		req._key = t.misc.hash_str(req._key_src);
		return proxy(req, res);
	});

	// wrapper on actual proxy code - first look for athena id in path
	function proxy(req, res) {
		const id_in_path = t.deployer.get_id_in_path(req.path2use);

		if (req.method === 'POST' || !id_in_path) {									// test if athena id was provided, change it for deployer's
			return do_proxy(req, res);
		} else {
			const athena_id = id_in_path;
			const opts = {
				db_name: ev.DB_COMPONENTS,
				_id: athena_id,
			};
			t.otcc.getDoc(opts, (err, doc) => {
				if (err || !doc.dep_component_id) {
					logger.error('[deployer apis] unable to lookup deployer component id from doc before proxying call to deployer:', err);
					return res.status(500).json({ statusCode: 500, msg: 'unable to lookup deployer component id' });
				} else {
					req.path2use = req.path2use.replace(id_in_path, doc.dep_component_id); // replace athena id with deployer id
					return do_proxy(req, res);
				}
			});
		}
	}

	// send the same req to deployer
	function do_proxy(req, res) {
		req.path2use = req.path2use.replace(/\$iid/gi, (ev.CRN.instance_id || 'iid-not-set'));	// replace placeholder iid with the real iid
		logger.info('[deployer apis] - attempting a deployer proxy request', req.method, t.misc.get_host(ev.DEPLOYER_URL), req.path2use);

		const opts = {
			method: req.method,
			baseUrl: encodeURI(t.misc.format_url(ev.DEPLOYER_URL)),								// url to deployer
			url: encodeURI(req.path2use),
			body: req.body ? JSON.stringify(req.body) : null,									// body for deployer
			headers: t.deployer.copy_headers(req.headers),
			timeout: ev.DEPLOYER_TIMEOUT
		};

		t.request(opts, (err, resp) => {
			let ret = resp ? resp.body : null;
			let dep_resp_headers = resp ? resp.headers : null;
			let code = t.ot_misc.get_code(resp);
			if (err) {
				logger.error('[deployer apis] - [2] unable to contact deployer', err);
				if (err.toString().indexOf('TIMEDOUT') >= 0) {
					code = 408;
					logger.error('[deployer apis] - [1] timeout was:', opts.timeout);
				}
				return proxy_reply(res, code, dep_resp_headers, err);
			} else {
				if (t.ot_misc.is_error_code(code)) {
					logger.error('[deployer apis] - [2] deployer responded with error code', code, ret);
					return proxy_reply(res, code, dep_resp_headers, ret);
				} else {
					logger.info('[deployer apis] - [2] successful deployer response', code);

					// running the deployer response through parse/stringify will decode unicode characters
					// (seen in the ldap.URL field of a "/type/ca" response)
					try {
						ret = JSON.stringify(JSON.parse(ret));
					} catch (e) {
						// ignore parsing errors
					}

					// redact CA enroll id/secret data if not a manager
					const lc_authorized_actions = t.middleware.getActions(req);
					if (req.path.includes('/type/ca/') && (!lc_authorized_actions || !lc_authorized_actions.includes(ev.STR.C_MANAGE_ACTION))) {
						try {
							const obj = JSON.parse(ret);
							// only redact the inner registry fields, else other (non-sensitive) fields will get redacted
							obj.configs.ca.registry = t.comp_fmt.redact_enroll_details(obj.configs.ca.registry);
							obj.configs.tlsca.registry = t.comp_fmt.redact_enroll_details(obj.configs.tlsca.registry);
							ret = JSON.stringify(obj);
						} catch (e) {
							// ignore parsing or dot nav errors
						}
					}

					// store response in cache
					if (ev.PROXY_CACHE_ENABLED === true && req._cache_this_req === true) {
						const data2cache = {
							code: code,
							headers: dep_resp_headers,
							data: ret,
							key_src: req._key_src,
							cached_ts: Date.now(),
						};
						t.proxy_cache.set(req._key, data2cache, 10 * 60);	// expiration is in sec
					}
					return proxy_reply(res, code, dep_resp_headers, ret);
				}
			}
		});
	}

	// send deployer's response back
	function proxy_reply(res, code, headers, ret) {
		if (headers) {
			res.set(t.deployer.copy_headers(headers));					// copy headers for our response
		}
		if (!ret) {
			return res.status(code).send();
		} else {
			return res.status(code).send(ret);
		}
	}

	//--------------------------------------------------
	// Append a new raft node to an existing raft cluster (pre-create + send genesis at once )
	// [do not use - use the pre-create raft api instead] (leaving code here for testing)
	//--------------------------------------------------
	const session_paths = [
		'/api/saas/v1/components/raft_clusters/:cluster_id/orderer',					// legacy path
		'/api/saas/v[123]/components/raft_clusters/:cluster_id/fabric-orderer'			// normal path
	];
	const ak_paths = [
		'/ak/api/v1/kubernetes/components/raft_clusters/:cluster_id/orderer',			// legacy path
		'/ak/api/v[123]/kubernetes/components/raft_clusters/:cluster_id/fabric-orderer'	// normal path
	];
	app.post(session_paths, t.middleware.verify_create_action_session, (req, res) => {
		t.deployer.prepare_new_raft_node(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				res.status(200).json(ret);
			}
		});
	});
	app.post(ak_paths, t.middleware.verify_create_action_ak, (req, res) => {
		t.deployer.prepare_new_raft_node(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Edit admin certs
	//--------------------------------------------------
	app.put('/api/saas/v[123]/components/:athena_component_id/certs', t.middleware.verify_manage_action_session_dep, (req, res) => {
		edit_admin_certs(req, res);
	});
	app.put('/ak/api/v[123]/kubernetes/components/:athena_component_id/certs', t.middleware.verify_manage_action_ak_dep, (req, res) => {
		edit_admin_certs(req, res);
	});

	function edit_admin_certs(req, res) {
		if (t.ot_misc.is_v2plus_route(req)) {
			req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/kubernetes/components/{id}/certs';
			logger.debug('[pre-flight] setting validate route:', req._validate_path);
		}

		t.validate.request(req, res, null, () => {
			t.deployer.edit_admin_certs(req, (errObj, ret) => {
				if (errObj) {
					res.status(t.ot_misc.get_code(errObj)).json(errObj);
				} else {
					res.status(200).json(ret);
				}
			});
		});
	}

	//--------------------------------------------------
	// Get fabric versions supported by deployer
	//--------------------------------------------------
	app.get('/api/saas/v[123]/fabric/versions', t.middleware.verify_view_action_session_dep, (req, res) => {
		get_fab_versions(req, res);
	});
	app.get('/ak/api/v[123]/kubernetes/fabric/versions', t.middleware.verify_view_action_ak_dep, (req, res) => {
		get_fab_versions(req, res);
	});

	function get_fab_versions(req, res) {
		if (t.ot_misc.is_v2plus_route(req)) {
			req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/kubernetes/fabric/versions';
			logger.debug('[pre-flight] setting validate route:', req._validate_path);
		}

		t.validate.request(req, res, null, () => {
			t.deployer.get_fabric_versions(req, (err, ret) => {
				if (err) {
					return res.status(t.ot_misc.get_code(err)).json(err);
				} else {
					return res.status(200).json(ret);
				}
			});
		});
	}

	//--------------------------------------------------
	// Submit action to a component (like restart or reenroll)
	//--------------------------------------------------
	const action_urls_ses = [
		'/api/saas/v[3]/components/fabric-ca/:athena_component_id/actions',
		'/api/saas/v[3]/components/fabric-orderer/:athena_component_id/actions',
		'/api/saas/v[3]/components/fabric-peer/:athena_component_id/actions',
	];
	const action_urls_ak = [
		'/ak/api/v[3]/kubernetes/components/fabric-ca/:athena_component_id/actions',
		'/ak/api/v[3]/kubernetes/components/fabric-orderer/:athena_component_id/actions',
		'/ak/api/v[3]/kubernetes/components/fabric-peer/:athena_component_id/actions',
	];
	app.post(action_urls_ses, t.middleware.verify_manage_action_session_dep, (req, res) => {
		perform_action(req, res);
	});
	app.post(action_urls_ak, t.middleware.verify_manage_action_ak_dep, (req, res) => {
		perform_action(req, res);
	});

	function perform_action(req, res) {
		if (t.ot_misc.is_v2plus_route(req)) {
			const type = t.component_lib.find_type(req);
			req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/kubernetes/components/' + type + '/{id}/actions';
			logger.debug('[pre-flight] setting validate route:', req._validate_path);
		}

		const get_opts = {
			req: req,
			id: req.params.athena_component_id,
			log_msg: 'component action',
		};
		t.component_lib.load_component_by_id(get_opts, (err_getDoc, resp_getDoc) => {	// load comp before calling validation, checking if its imported
			t.validate.request(req, res, null, () => {
				t.deployer.send_actions(req, (err, ret) => {
					if (err) {
						return res.status(t.ot_misc.get_code(err)).json(err);
					} else {
						return res.status(202).json(ret);
					}
				});
			});
		});
	}

	return app;
};
