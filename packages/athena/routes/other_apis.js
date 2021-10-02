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
// Other API Routes
// - Random APIs that don't belong in other route files
//------------------------------------------------------------
module.exports = function (logger, ev, t) {
	const app = t.express.Router();

	//-----------------------------------------------------------------------------
	// Get non-sensitive settings for athena
	//-----------------------------------------------------------------------------
	app.get(['/api/v[123]/settings', '/ak/api/v[123]/settings'], t.middleware.public, (req, res) => {	// no auth on purpose
		const settings = t.other_apis_lib.get_ev_settings();
		if (req.path.indexOf('/ak/') === 0) {
			return res.status(200).json(settings);
		} else {
			res.setHeader('Content-Type', 'application/json');
			return res.status(200).send(JSON.stringify(settings, null, 2));
		}
	});

	//-----------------------------------------------------------------------------
	// Get sensitive settings for athena
	//-----------------------------------------------------------------------------
	app.get('/api/v[123]/private-settings', t.middleware.verify_settings_action_session, (req, res) => {
		return res.status(200).json(t.other_apis_lib.get_private_settings());
	});
	app.get('/ak/api/v[123]/private-settings', t.middleware.verify_settings_action_ak, (req, res) => {
		return res.status(200).json(t.other_apis_lib.get_private_settings());
	});

	//-----------------------------------------------------------------------------
	// Get all settings for athena
	//-----------------------------------------------------------------------------
	app.get('/api/v[123]/advanced-settings', t.middleware.verify_settings_action_session, (req, res) => {
		t.other_apis_lib.get_settings_breakdown((err, settings) => {
			return res.status(200).json(settings);
		});
	});
	app.get('/ak/api/v[123]/advanced-settings', t.middleware.verify_settings_action_ak, (req, res) => {
		t.other_apis_lib.get_settings_breakdown((err, settings) => {
			return res.status(200).json(settings);
		});
	});

	//-----------------------------------------------------------------------------
	// Edit all settings for athena
	//-----------------------------------------------------------------------------
	app.put('/api/v[123]/advanced-settings', t.middleware.verify_settings_action_session, (req, res) => {
		t.other_apis_lib.edit_settings(req, (err, settings) => {
			return res.status(200).json(settings);
		});
	});
	app.put('/ak/api/v[123]/advanced-settings', t.middleware.verify_settings_action_ak, (req, res) => {
		t.other_apis_lib.edit_settings(req, (err, settings) => {
			return res.status(200).json(settings);
		});
	});

	//-----------------------------------------------------------------------------
	// Get health information for athena
	//-----------------------------------------------------------------------------
	app.get('/api/v[123]/health', t.middleware.verify_logs_action_session, (req, res) => {
		res.setHeader('Content-Type', 'application/json');
		return res.status(200).send(JSON.stringify(t.other_apis_lib.get_health_info(), null, 2));
	});
	app.get('/ak/api/v[123]/health', t.middleware.verify_logs_action_ak, (req, res) => {
		return res.status(200).json(t.other_apis_lib.get_health_info());
	});

	//-----------------------------------------------------------------------------
	// Test if athena is running - public route (no tracking on this api, so don't use t.middleware.public)
	//-----------------------------------------------------------------------------
	app.get([ev.HEALTHCHECK_ROUTE, '/ak' + ev.HEALTHCHECK_ROUTE], /*don't use middleware on this api*/(req, res) => {
		return res.status(200).json({ message: 'ok', id: process.env.ATHENA_ID });
	});

	//--------------------------------------------------
	// Restart Athena
	//--------------------------------------------------
	app.post('/api/v[123]/restart', t.middleware.verify_restart_action_session, function (req, res) {
		restart(req, res);
	});
	app.post('/ak/api/v[123]/restart', t.middleware.verify_restart_action_ak, function (req, res) {
		restart(req, res);
	});
	app.post('/ak/api/v[123]/restart/force', t.middleware.verify_restart_action_ak, function (req, res) {
		res.status(200).json({ message: 'you got it' });
		t.ot_misc.restart_athena(t.middleware.getUuid(req));						// restart this instance right now, no db -> pillow talk
	});

	function restart(req, res) {
		res.status(200).json({ message: 'restarting - give me 5-30 seconds' });		// respond first, else we will restart w/o responding

		const msg = {
			message_type: 'restart',
			message: 'restarting application via restart api',
			by: t.misc.censorEmail(t.middleware.getEmail(req)),
			uuid: t.middleware.getUuid(req),
		};
		t.pillow.broadcast(msg);
	}

	//--------------------------------------------------
	// Stop Accepting HTTP/HTTPS Requests
	//--------------------------------------------------
	app.post('/api/v[23]/requests/stop', function (req, res, next) {
		local_stop(req, res, next);
	});
	app.get('/api/v[23]/requests/stop', function (req, res, next) {		// mihir wanted a GET method, so this was made
		local_stop(req, res, next);
	});
	function local_stop(req, res, next) {
		logger.debug('[*] ip:', req.ip);								// dsh todo remove this log in a month or so (once we know it works)
		if (!t.middleware.ip_is_localhost(req)) {
			return next();												// was not local, try next route
		} else {
			stop(req, res);
		}
	}

	app.post('/api/v[23]/requests/stop', t.middleware.verify_restart_action_session, function (req, res) {
		stop(req, res);
	});
	app.post('/ak/api/v[23]/requests/stop', t.middleware.verify_restart_action_ak, function (req, res) {
		stop(req, res);
	});
	function stop(req, res) {
		const notice = {
			status: 'success',
			message: 'stopping request processing - ' + process.env.ATHENA_ID,
			by: t.misc.censorEmail(t.middleware.getEmail(req)),
			severity: 'warning',
		};
		t.notifications.create(notice, () => {							// record notification
			t.ot_misc.start_graceful_shutoff(() => { });
		});
		res.status(200).json({ message: 'stopping request processing' });
	}

	//--------------------------------------------------
	// Start Accepting HTTP/HTTPS Requests
	//--------------------------------------------------
	app.post('/api/v[23]/requests/start', function (req, res, next) {
		local_start(req, res, next);
	});
	app.get('/api/v[23]/requests/start', function (req, res, next) {	// mihir wanted a GET method, so this was made
		local_start(req, res, next);
	});
	function local_start(req, res, next) {
		logger.debug('[*] ip:', req.ip);								// dsh todo remove this log in a month or so (once we know it works)
		if (!t.middleware.ip_is_localhost(req)) {
			return next();												// was not local, try next route
		} else {
			start(req, res);
		}
	}

	app.post('/api/v[23]/requests/start', t.middleware.verify_restart_action_session, function (req, res) {
		start(req, res);
	});
	app.post('/ak/api/v[23]/requests/start', t.middleware.verify_restart_action_ak, function (req, res) {
		start(req, res);
	});
	function start(req, res) {
		if (!t.ot_misc.server_is_closed()) {
			res.status(200).json({ message: 'requests processing is already started' });
		} else {
			const notice = {
				status: 'success',
				message: 'starting request processing - ' + process.env.ATHENA_ID,
				by: t.misc.censorEmail(t.middleware.getEmail(req)),
				severity: 'warning',
			};
			t.notifications.create(notice, () => {						// record notification
				t.ot_misc.open_server(() => { });
			});
			res.status(200).json({ message: 'starting request processing' });
		}
	}

	//-----------------------------------------------------------------------------
	// Delete all athena sessions
	//-----------------------------------------------------------------------------
	app.delete('/api/v[123]/sessions', t.middleware.verify_restart_action_session, (req, res) => {
		clear_sessions(req, (_, resp) => {
			res.status(202).json({ message: 'delete submitted' });
		});
	});
	app.delete('/ak/api/v[123]/sessions', t.middleware.verify_restart_action_ak, (req, res) => {
		clear_sessions(req, (_, resp) => {
			res.status(202).json({ message: 'delete submitted' });
		});
	});
	app.delete('/ak/api/v[123]/sessions/force', t.middleware.verify_restart_action_ak, (req, res) => {
		t.session_store.clear((_, resp) => {
			res.status(200).json({ message: 'ok', deleted: resp });
		});
	});

	function clear_sessions(req, cb) {
		const msg = {
			message_type: 'delete_sessions',
			message: 'deleting all sessions via restart api',
			by: t.misc.censorEmail(t.middleware.getEmail(req)),
			uuid: t.middleware.getUuid(req),
		};
		t.pillow.broadcast(msg);
		return cb();
	}

	//--------------------------------------------------
	// Can replace a single property in the settings doc - no input validation
	//--------------------------------------------------
	app.put(['/api/v[123]/authscheme/key', '/api/v1/settings/key'], t.middleware.verify_settings_action_session, (req, res) => {
		t.other_apis_lib.edit_single_property_from_doc(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Edit settings in the UI Settings panel - has input validation
	//--------------------------------------------------
	app.put('/api/v[123]/settings', t.middleware.verify_settings_action_session, (req, res) => {
		edit_settings(req, res);
	});
	app.put('/ak/api/v[123]/settings', t.middleware.verify_settings_action_ak, (req, res) => {
		edit_settings(req, res);
	});

	function edit_settings(req, res) {
		req._validate_path = '/ak/api/' + t.validate.pick_ver(req) + '/settings';
		logger.debug('[pre-flight] setting validate route:', req._validate_path);

		t.validate.request(req, res, null, () => {
			t.other_apis_lib.edit_ui_settings(req, (err, ret) => {
				if (err) {
					return res.status(t.ot_misc.get_code(err)).json(err);
				} else {
					return res.status(200).json(ret);
				}
			});
		});
	}

	//-----------------------------------------------------------------------------
	// Exchange api key for token
	//-----------------------------------------------------------------------------
	/*
		req.body: {
			unimportant_string: <api_key>,
			current_iam_url_index: <number> 	// start with zero and iterate through all the possible urls
		}
	 */
	app.post('/ak/api/v[123]/get-token', t.middleware.public, (req, res) => {
		if (typeof req.body === 'string') {
			try {
				req.body = JSON.parse(req.body);
			} catch (e) {
				logger.error('unable to parse request body');
			}
		}
		const get_token_settings = {
			api_key: req.body.unimportant_string,
		};
		t.other_apis_lib.get_token(get_token_settings, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	});

	//-----------------------------------------------------------------------------
	// Flush Cache
	//-----------------------------------------------------------------------------
	app.delete('/api/v[123]/cache', t.middleware.verify_restart_action_session, (req, res) => {
		flush_cache(req, (_, ret) => {
			return res.status(200).json(ret);
		});
	});
	app.delete('/ak/api/v[123]/cache', t.middleware.verify_restart_action_ak, (req, res) => {
		flush_cache(req, (_, ret) => {
			return res.status(200).json(ret);
		});
	});

	// use pillow talk to inform all athenas to flush their caches
	function flush_cache(req, cb) {
		const msg = {
			message_type: 'flush_cache',
			message: 'flushing all caches via flush api',
			by: t.misc.censorEmail(t.middleware.getEmail(req)),
			uuid: t.middleware.getUuid(req),
		};
		t.pillow.broadcast(msg);
		const ret = { message: 'ok', flushed: [] };
		if (ev.MEMORY_CACHE_ENABLED) {
			ret.flushed.push('couch_cache');
		}
		if (ev.IAM_CACHE_ENABLED) {
			ret.flushed.push('iam_cache');
		}
		if (ev.PROXY_CACHE_ENABLED) {
			ret.flushed.push('proxy_cache');
		}
		if (ev.SESSION_CACHE_ENABLED) {
			ret.flushed.push('session_cache');
		}

		setTimeout(() => {				// delay the callback enough for pillow talk to work (> 100ms)
			return cb(null, ret);
		}, 500);
	}

	//-----------------------------------------------------------------------------
	// Build a postman collection
	//-----------------------------------------------------------------------------
	app.get('/api/v[23]/postman', t.middleware.verify_view_action_session, (req, res) => {
		return serve_postman(req, res);
	});
	app.get('/ak/api/v[23]/postman', t.middleware.verify_view_action_ak, (req, res) => {
		return serve_postman(req, res);
	});

	function serve_postman(req, res) {
		const collection = build_postman(req);
		if (collection.errors) {
			return res.status(400).json(collection);
		} else {
			res.setHeader('Content-Disposition', 'attachment; filename=ibp_postman_collection.json');	// tell the browser to open a download prompt
			return res.status(200).json(collection);
		}
	}

	function build_postman(req) {
		if (!req.query) { req.query = {}; }
		const options = {
			input_collection_file: './json_docs/OpTools.master.postman_collection.json',
			auth_type: req.query.auth_type,
			debug: false,
			url: ev.HOST_URL
		};

		if (options.auth_type === ev.STR.BASIC) {
			options.username = req.query.username;
			options.password = req.query.password;
		}
		if (options.auth_type === ev.STR.BEARER) {
			options.token = req.query.token;
		}
		if (options.auth_type === ev.STR.KEY) {
			options.api_key = req.query.api_key;
		}
		return t.ot_misc.build_postman_collection(options);
	}

	//-----------------------------------------------------------------------------
	// Return swagger file
	//-----------------------------------------------------------------------------
	app.get('/api/v[23]/openapi', t.middleware.verify_view_action_session, (req, res, next) => {
		return serve_swagger(res, req, next);
	});
	app.get('/ak/api/v[23]/openapi', t.middleware.verify_view_action_ak, (req, res, next) => {
		return serve_swagger(res, req, next);
	});

	// serve the swagger file
	function serve_swagger(res, req, next) {
		const version = t.ot_misc.get_api_version(req);
		const swagger = t.other_apis_lib.get_swagger_file(version);
		if (!swagger || !version) {
			return next();
		} else {
			res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
			res.setHeader('Content-Disposition', 'attachment; filename=ibp_openapi_' + version + '.yaml');	// tell the browser to open a download prompt
			res.status(200).send(swagger);
		}
	}

	//-----------------------------------------------------------------------------
	// Add a new validator swagger file - must have unique version
	//-----------------------------------------------------------------------------
	app.post('/api/v[23]/openapi', t.middleware.verify_settings_action_session, (req, res, next) => {
		return store_swagger(res, req, next);
	});
	app.post('/ak/api/v[23]/openapi', t.middleware.verify_settings_action_ak, (req, res, next) => {
		return store_swagger(res, req, next);
	});

	// store a new swagger file
	function store_swagger(res, req) {
		t.other_apis_lib.store_swagger_file(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	}

	//-----------------------------------------------------------------------------
	// Delete a couch db - used in emergencies
	//-----------------------------------------------------------------------------
	app.delete('/api/v[3]/dbs/:db_name', t.middleware.verify_settings_action_session, (req, res) => {
		delete_db(req, res);
	});
	app.delete('/ak/api/v[3]/dbs/:db_name', t.middleware.verify_settings_action_ak, (req, res) => {
		delete_db(req, res);
	});

	function delete_db(req, res) {
		t.couch_lib.deleteDatabase(req.params.db_name, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	}

	//-----------------------------------------------------------------------------
	// Detect ip - used for debugging
	//-----------------------------------------------------------------------------
	app.get('/api/v3/debug/ip', t.middleware.verify_view_action_session, function (req, res, next) {
		res.status(200).json(debug_ip(req));
	});
	app.get('/ak/api/v3/debug/ip', t.middleware.verify_view_action_ak, function (req, res, next) {
		res.status(200).json(debug_ip(req));
	});

	function debug_ip(req) {
		if (!req || !req.ip) {
			return {};
		} else {
			return {
				ip_orig: req.ip,
				ip: t.misc.format_ip(req.ip),
				ip_hash: t.misc.format_ip(req.ip, true),
				headers: req.headers,
			};
		}
	}

	//-----------------------------------------------------------------------------
	// Manually run the orderer auto upgrade fabric auto check
	//-----------------------------------------------------------------------------
	app.post('/api/v[3]/components/manual/auto-upgrade-check', t.middleware.verify_settings_action_session, (req, res, next) => {
		return run_upgrade_check(res, req, next);
	});
	app.post('/ak/api/v[3]/components/manual/auto-upgrade-check', t.middleware.verify_settings_action_ak, (req, res, next) => {
		return run_upgrade_check(res, req, next);
	});

	// start a fabric upgrade check
	function run_upgrade_check(res, req) {
		t.patch_lib.auto_upgrade_orderers();
		return res.status(200).json({ message: 'ok', details: 'started' });
	}

	return app;
};
