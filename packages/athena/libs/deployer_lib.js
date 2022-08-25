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
// deployer_lib.js - Library functions for deployer related tasks
//------------------------------------------------------------
module.exports = function (logger, ev, t) {
	const exports = {};
	const typeMapA2D = {
		'fabric-peer': 'peer',
		'fabric-ca': 'ca',
		'fabric-orderer': 'orderer',
		'peer': 'peer',						// legacy
		'ca': 'ca',							// legacy
		'orderer': 'orderer',				// legacy
		'raft': ev.STR.RAFT,				// orderer_type
		'solo': ev.STR.SOLO,				// orderer_type
	};
	exports.typeMapA2D = typeMapA2D;		// make a external copy for comp fmt to use

	// ------------------------------------------
	// copy headers except for some
	// ------------------------------------------
	exports.copy_headers = function (headers) {
		const ret = {
			'content-type': 'application/json',		// important to set this for deployer, else weird things happen
		};
		const skip = [			// don't copy these headers
			'accept-encoding',	// can't parse response
			'host',				// causes 404s
			'content-length',	// freaks out apps
			'authorization',	// athena's auth will be wrong for deployer
			'cookie',			// don't send the UI cookie data to deployer
			'content-security-policy', // junk deployer won't care about
			'transfer-encoding',	// cannot be combined with content-length. thinking express might set content length then if this one gets copied = problem
		];
		if (!headers) {
			return ret;
		} else {
			for (let name in headers) {
				const lc_name = name.toLowerCase();
				if (skip.indexOf(lc_name) === -1) {
					ret[name] = headers[name];
				}
			}
			return ret;
		}
	};

	// ------------------------------------------
	// handle the deployer operation (record it)
	// ------------------------------------------
	// dsh this is the worst, refactor it
	exports.record_deployer_operation = function (req2dep, req2athena, depRespBody, par, cb) {
		if (depRespBody && typeof depRespBody === 'string') {			// parse deployer's response if we can
			try {
				depRespBody = JSON.parse(depRespBody);
			} catch (e) { }
		}
		if (req2dep && req2dep.body) {
			try {
				req2dep.body = JSON.parse(req2dep.body);				// parse our request body if we can
			} catch (e) { }
		}
		if (!req2dep || !req2dep.body) {
			req2dep.body = {};
		}

		// --- Redact things --- //
		if (req2dep && req2dep.baseUrl) {
			req2dep.baseUrl = t.misc.redact_basic_auth(req2dep.baseUrl);// prevent basic auth from getting into db
		}
		if (req2dep) {
			delete req2dep.headers;										// prevent cookies from getting into db
		}
		const body2athena = (req2athena && req2athena.body) ? req2athena.body : {};

		if (!req2athena) {
			logger.error('[deployer lib]', par.debug_tx_id, ' bad usage of record_deployer_operation(). deployer request not passed in. 2nd param');
			return cb({ statusCode: 500, msg: 'bad usage of record_deployer_operation()' }, null);
		} else {
			if (par.OPERATION === null) {
				logger.debug('[deployer lib]', par.debug_tx_id, ' this deployer request does not need athena.', req2athena.path);
				// nothing to do for these calls
				return cb(null, null);
			} else {
				if (!depRespBody) {
					logger.error('[deployer lib]', par.debug_tx_id, 'unable to parse deployer response. [2]', par.OPERATION, par.iid,
						par.component_type, depRespBody);
					return cb({ statusCode: 500, msg: 'cannot parse deployer response' }, null);
				} else {

					// --- Create Component --- //
					if (par.OPERATION === 'add_component') {
						const build_body_opts = {
							req2dep: req2dep,
							req2athena: req2athena,
							depRespBody: depRespBody,

							debug_tx_id: par.debug_tx_id,
							component_type: par.component_type,
						};
						const incoming_body = req2athena ? req2athena.body : null;
						const athena_comp_type = (incoming_body && incoming_body.type) ? incoming_body.type.toLowerCase() : null;
						if (athena_comp_type === ev.STR.ORDERER) {
							build_body_opts.node_i = 0;
							if (t.ot_misc.is_systemless_req(incoming_body)) {			// nodes w/o the system channel should not have this flag set
								build_body_opts.consenter_proposal_fin = true;
							} else {
								build_body_opts.consenter_proposal_fin = false;
							}
						}
						const component_req = {
							path: req2athena.path,			// pass path so the response formatter knows what api version was called to pick the format
							session: req2athena.session,
							headers: req2athena.headers,
							body: t.comp_fmt.build_component_req_body(build_body_opts),
							_tx_id: par.debug_tx_id,
							_fmt_response: t.ot_misc.is_v3plus_route(req2athena) ? false : true,	// v2 had onboard format the response, v3 formats later
						};
						if (!component_req.body) {											// if body is null, we did not parse the component type
							logger.error('[deployer lib]', par.debug_tx_id, ' cannot onboard component, what the hell is this:', par.component_type,
								par.OPERATION, par.iid);
							return cb({ statusCode: 400, msg: 'unknown component type ' + par.component_type }, null);
						} else {
							logger.debug('[deployer lib]', par.debug_tx_id, ' onboarding component', par.OPERATION, par.iid, par.component_type);
							t.component_lib.onboard_component(component_req, (err, ret) => {
								t.notifications.merge_notices(req2athena, component_req);	// copy notifications up to the real request

								if (!err && t.ot_misc.is_v3plus_route(req2athena)) {		// if v3 api & no error, format the doc (v2 already formatted it)
									const fmt_opts = {
										deployer_data: depRespBody,
										component_doc: ret,
									};
									req2athena._include_deployment_attributes = true;
									ret = t.comp_fmt.fmt_comp_resp_with_deployer(req2athena, fmt_opts);		// reformat the response with the deployer data
									ret.crstatus = depRespBody.crstatus;
								}

								if (athena_comp_type === ev.STR.ORDERER) {
									return cb(err, { created: [ret] });						// pre-create orderers should use same resp as bulk OS create resp
								} else {
									return cb(err, ret);
								}
							});
						}
					}

					// --- Bulk Create Component (raft + regular bulk) --- //
					else if (par.OPERATION === 'bulk_add_components') {
						const component_req = {
							path: req2athena.path,			// pass path so the response formatter knows what api version was called to pick the format
							session: req2athena.session,
							headers: req2athena.headers,
							body: [],
							url: req2dep.url,				// needed later to detect if this was a v2 route or not
							_tx_id: par.debug_tx_id,
						};

						// an id that links all raft nodes of a single cluster
						const cluster_id = body2athena.cluster_id ? req2athena.body.cluster_id : t.misc.simpleRandomString(10).toLowerCase();
						for (let i in depRespBody) {
							const build_body_opts = {
								req2dep: req2dep,
								req2athena: req2athena,
								depRespBody: depRespBody[i],

								debug_tx_id: par.debug_tx_id,
								component_type: par.component_type,
								cluster_id: cluster_id, 			// pass id
								node_i: i,
								consenter_proposal_fin: true,
							};
							const component_body = t.comp_fmt.build_component_req_body(build_body_opts);
							if (!component_body) {												// if body is null, we did not parse the component type
								logger.error('[deployer lib]', par.debug_tx_id, ' cannot onboard component, what the hell is this:', par.component_type,
									par.OPERATION, par.iid);
							} else {
								component_req.body.push(component_body);
							}
						}

						if (!Array.isArray(depRespBody)) {
							logger.error('[deployer lib]', par.debug_tx_id, ' cannot onboard any components, expected array from deployer not',
								typeof depRespBody, par.OPERATION, par.iid);
							return cb({ statusCode: 500, msg: 'internal error with deployer\'s response' }, null);
						} else if (component_req.body.length === 0) {
							logger.error('[deployer lib]', par.debug_tx_id, ' cannot onboard any components, there are no bulk components to board',
								component_req.body.length, par.OPERATION, par.iid);
							return cb({ statusCode: 500, msg: 'could not parse deployer response for component: ' + par.component_type }, null);
						} else {
							logger.debug('[deployer lib]', par.debug_tx_id, ' onboarding component', par.OPERATION, par.iid, par.component_type);
							t.component_lib.add_bulk_components(component_req, (errs, ret_arr_objects) => {
								t.notifications.merge_notices(req2athena, component_req);			// copy notifications up to the real request
								if (errs && errs.length > 0) {
									return cb(errs, { created: ret_arr_objects });
								} else {
									return cb(null, { created: ret_arr_objects });
								}
							});
						}
					}

					// --- Delete Component --- //
					else if (par.OPERATION === 'delete_component') {
						const options = {
							path: req2athena.path,
							session: req2athena.session,
							headers: req2athena.headers,
							params: {
								component_id: par.component_id
							},
							_tx_id: par.debug_tx_id,
						};
						logger.debug('[deployer lib]', par.debug_tx_id, ' offboarding component', par.OPERATION, par.iid, par.component_type);
						t.component_lib.offboard_component(options, (err, ret) => {
							t.notifications.merge_notices(req2athena, options);					// copy notifications up to the real request
							return cb(err, ret);
						});
					}

					// --- Update Component --- //
					else if (par.OPERATION === 'update_component') {
						const options = {
							path: req2athena.path,
							session: req2athena.session,
							headers: req2athena.headers,
							params: {
								id: par.component_id											// put athena id here
							},
							_tx_id: par.debug_tx_id,
							_orig_body: body2athena,											// remember the orig body, gets stored in debug
							_update_body_to_dep: req2athena._update_body_to_dep,
							body: t.comp_fmt.conform_deployer_field_names(null, depRespBody),		// map deployer field names to athena field names
						};
						delete options.body.cr_status;				// transient info do not store

						// if deployer didn't respond w/the field, fall back to the field in the body to athena
						for (let fallback_field in body2athena) {								// iter on fields in athena's body
							if (body2athena[fallback_field] && options.body) {					// if field existed in athena's body, use it as a fallback
								options.body[fallback_field] = options.body[fallback_field] || body2athena[fallback_field];	// prefer deployer value, its truth
							}
						}

						logger.debug('[deployer lib]', par.debug_tx_id, ' editing component', par.OPERATION, par.iid, par.component_type);
						t.component_lib.edit_component(options, (err, ret) => {					// store the latest values from deployer in our db
							t.notifications.merge_notices(req2athena, options);					// copy notifications up to the real request
							return cb(err, ret);
						});
					}

					// --- code mihir --- // - this should not happen
					else {
						logger.error('[deployer lib]', par.debug_tx_id, ' I\'ve made a wrong turn somewhere. no code for this operation', par.OPERATION);
						return cb({ statusCode: 500, msg: 'OPERATION not understood: ' + par.OPERATION }, null);
					}
				}
			}
		}
	};

	// ------------------------------------------
	// provision/create a component
	// ------------------------------------------
	/*
	req: {
		headers: {},				// optional - forwarded to deployer
		session: {},				// needed to get email address
		body: {},
		_max_attempts: 2,			// optional - number of http req attempts to deployer
	}
	*/
	exports.provision_component = function (req, cb) {
		req.body.config_length = (req.body.crypto && Array.isArray(req.body.crypto)) ? req.body.crypto.length :
			((req.body.config && Array.isArray(req.body.config)) ? req.body.config.length : null);	// used for input v1 validation
		req.body.display_name = req.body.display_name || req.body.name || req.body.short_name;
		const athena_comp_type = (req.body && req.body.type) ? req.body.type.toLowerCase() : '-';
		const parsed = {
			iid: (ev.CRN && ev.CRN.instance_id) ? ev.CRN.instance_id : 'iid-not-set',
			component_type: (athena_comp_type && typeMapA2D[athena_comp_type]) ? typeMapA2D[athena_comp_type] : '?',
			OPERATION: 'add_component',
			debug_tx_id: t.ot_misc.buildTxId(req),
		};
		req._tx_id = parsed.debug_tx_id;

		t.async.parallel([

			// ---- Get tls ca's root cert if applicable ---- //
			(join) => {
				const incoming_body = req.body;
				const tls_ca_root_cert = t.misc.safe_dot_nav(incoming_body, [
					'incoming_body.tls_ca_root_cert',												// provided in body
					'incoming_body.crypto.msp.tlsca.root_certs', 									// 1 crypto obj [v3]
					'incoming_body.crypto.0.msp.tlsca.root_certs', 									// 2+ crypto objects (orderers do this) [v3]
					'incoming_body.config.msp.tls.cacerts', 										// 1 config obj [v2]
					'incoming_body.config.0.msp.tls.cacerts', 										// 2+ config objects (orderers do this) [v2]
				]);

				// create-orderer apis have an array, pick first one
				const tls_ca_root_cert_single = Array.isArray(tls_ca_root_cert) ? tls_ca_root_cert[0] : tls_ca_root_cert;
				const parsed_tls_root_cert = tls_ca_root_cert_single ? t.ot_misc.parseCertificate(tls_ca_root_cert_single) : null;
				if (parsed_tls_root_cert) {															// if a cert is already given, just use that one
					join(null, tls_ca_root_cert_single);											// send the original pem 64 pem, not the parsed cert object!
				} else if (req.body.crypto || req.body.config) {									// if is a crypto/config field, look up ca cert from the ca
					t.component_lib.get_root_cert_by_crypto(req, (err_cert, tls_ca_root_cert) => {
						if (err_cert) {
							logger.warn('[deployer lib] unable to get tls ca root cert, no big deal');
						}
						join(null, tls_ca_root_cert);
					});
				} else {																			// components like CAs take this route, no root cert needed
					join(null, null);
				}
			},

			// ---- Get all doc IDs ---- //
			(join) => {
				t.component_lib.getAllIds((_, taken_ids) => {										// get all component ids so we can make a unique id
					join(null, taken_ids);
				});
			},

			// ---- Get available fabric versions ---- //
			(join) => {
				exports.get_fabric_versions(req, (err, resp) => {
					if (err) {
						join(null, null);
					} else {
						const formatted = {};
						if (resp && resp.versions) {
							formatted[ev.STR.CA] = resp.versions.ca;
							formatted[ev.STR.PEER] = resp.versions.peer;
							formatted[ev.STR.ORDERER] = resp.versions.orderer;
						}
						join(null, formatted);
					}
				});
			}

		], (_, results) => {
			const tls_ca_root_cert = results[0];
			const taken_ids = results[1];
			const available_vers_by_type = results[2];
			req._tls_ca_root_cert = tls_ca_root_cert;												// store here, used later during onboard
			const existing_cluster_ids = taken_ids.cluster_ids;										// rename
			const fmt_body = t.comp_fmt.fmt_body_athena_to_dep(req, taken_ids, available_vers_by_type);	// translate athena spec to deployer here
			const is_appending = is_appending_a_raft_orderer(fmt_body, existing_cluster_ids);
			req._dep_component_id = fmt_body ? fmt_body.dep_component_id : null;					// store id we are using for cleanup incase provision fails
			req._component_display_name = (fmt_body && fmt_body.parameters) ? fmt_body.parameters.display_name : null;	// store name for activity tracker
			if (fmt_body.orderertype === ev.STR.RAFT) {
				// a systemless append should still use `bulk_add_components` b/c dep response will be an array of 1 orderer instead of object
				if (is_appending === false || t.ot_misc.is_systemless_req(fmt_body)) {				// new raft cluster
					parsed.OPERATION = 'bulk_add_components';
				} else {																			// appending to existing cluster
					parsed.OPERATION = 'add_component';
				}
			}
			logger.debug('[deployer lib]', req._tx_id, 'provisioning for iid', parsed.iid, 'component_type', parsed.component_type,
				'op:', parsed.OPERATION);

			let errObj = null;
			if (!t.ot_misc.is_v2plus_route(req)) {										// v2 was validated before here, skip legacy validator
				errObj = resource_validation(errObj, fmt_body);							// also check this
				errObj = t.component_lib.other_validation(errObj, fmt_body);			// also check this
			} else {
				const v2_errors = t.validate.valid_cluster_id(req, existing_cluster_ids, is_appending);
				if (v2_errors && v2_errors.length > 0) {
					logger.error('[deployer lib]', req._tx_id, 'v2 input error with provision component api', v2_errors);
					return cb(t.validate.fmt_input_error(req, v2_errors), null);		// bad v2 input, had an error
				}
			}

			if (errObj && errObj.errs && errObj.errs.length > 0) {
				logger.error('[deployer lib]', req._tx_id, 'v1 input error with provision component api', errObj);
				return cb({ statusCode: errObj.statusCode, msg: errObj.errs }, null);	// bad v1 input, had an error
			} else {
				const route2use = build_deployer_route(fmt_body, is_appending);

				// if we are appending to a cluster, we need fields like cluster id also deployer can't handle a config array
				if (fmt_body.orderertype === ev.STR.RAFT && is_appending) {
					const append_body = t.ot_misc.is_systemless_req(fmt_body) ? fmt_body : build_object_fields(fmt_body);	// legacy needs it as obj
					fill_in_existing_raft_details(append_body, (_, filled_body) => {
						call_deployer(filled_body, route2use);
					});
				} else {																// all other components go here
					call_deployer(fmt_body, route2use);
				}
			}
		});

		// deployer only supports certain fields as objects for pre-create - convert array fields to an object/string
		// (do not run this on a systemless appending flow)
		function build_object_fields(dep_body_fmt) {
			const fields = ['crypto', 'config', 'zone', 'region', 'configoverride'];	// these fields do not work as arrays for pre-create
			for (let i in fields) {
				const field = fields[i];
				if (dep_body_fmt[field] && Array.isArray(dep_body_fmt[field]) && dep_body_fmt[field][0]) {
					dep_body_fmt[field] = dep_body_fmt[field][0];			// convert the array of 1 to an object or string
				}
			}
			return dep_body_fmt;
		}

		// decide if this request is for appending a new orderer OR creating a new orderer cluster
		function is_appending_a_raft_orderer(formattedBody, existingClusterIds) {
			if (formattedBody.cluster_id) {
				return true;
			}
			if (formattedBody.append === true) {
				return true;
			}
			return false;
		}

		// build the right deployer url/route
		function build_deployer_route(fmt_body, is_appending_raft) {
			let url2use = '';
			if (fmt_body.orderertype === ev.STR.RAFT) {									// raft orderer clusters use different routes than other components
				if (!is_appending_raft) {												// creating new raft cluster
					logger.debug('[deployer lib]', req._tx_id, 'ordering-cluster creating we be. id:', fmt_body.dep_component_id);
					url2use = '/api/v3/instance/' + parsed.iid + '/type/orderer/component';
				} else if (t.ot_misc.is_systemless_req(fmt_body)) {				// appending to an existing raft cluster without system channel
					logger.debug('[deployer lib]', req._tx_id, 'systemless ordering-cluster appending we be. id:', fmt_body.dep_component_id);
					url2use = '/api/v3/instance/' + parsed.iid + '/type/orderer/component';
				} else {																// appending to an existing raft cluster with system channel
					logger.debug('[deployer lib]', req._tx_id, 'legacy ordering-cluster appending we be. id:', fmt_body.dep_component_id);
					url2use = '/api/v3/instance/' + parsed.iid + '/precreate/type/orderer/component';
				}
				if (fmt_body.dep_component_id) {										// only add if found, id is optional
					url2use += '/' + fmt_body.dep_component_id;
				}
			} else {																	// every other component uses this route
				logger.debug('[deployer lib]', req._tx_id, 'type:', fmt_body.type, 'id:', fmt_body.dep_component_id);
				url2use = '/api/v3/instance/' + parsed.iid + '/type/' + parsed.component_type + '/component';
				if (fmt_body.dep_component_id) {										// only add if found, id is optional
					url2use += '/' + fmt_body.dep_component_id;
				}
			}
			return url2use;
		}

		function call_deployer(formatted_body, url2use) {
			const opts = {
				method: 'POST',
				baseUrl: t.misc.format_url(ev.DEPLOYER_URL),								// url to deployer
				url: url2use,
				body: JSON.stringify(formatted_body),										// body for deployer
				headers: exports.copy_headers(req.headers),
				timeout: calc_timeout(formatted_body),
				_tx_id: req._tx_id,
				_max_attempts: req._max_attempts,											// optional
			};
			logger.debug('[deployer lib]', req._tx_id, 'sending deployer api w/route:', opts.url);
			send_dep_req(opts, (err, depRespBody) => {
				const { fmt_err, fmt_ret } = handle_dep_response(parsed, err, depRespBody);
				if (fmt_err) {																// error is already logged
					if (t.ot_misc.get_code(fmt_err) === 409) {								// don't call clean up on a 409 error code
						return cb(fmt_err, fmt_ret);
					} else {
						clean_up_deployer_component(req, fmt_ret, () => {					// remove component on deployer (might not exist but try anyway)
							return cb(fmt_err, fmt_ret);
						});
					}
				} else {
					exports.record_deployer_operation(opts, req, depRespBody, parsed, (athenaError, athenaResponse) => {
						if (athenaError) {													// if athena has an error don't send the deployer response
							logger.error('[deployer lib]', req._tx_id, 'athena had an error onboarding/offboarding the component', athenaError);
							clean_up_deployer_component(req, fmt_ret, () => {				// remove the component on deployer, prevents orphans
								return cb(athenaError, null);								// athena had an error
							});
						} else {
							return cb(null, { athena_fmt: athenaResponse, deployer_resp: fmt_ret, tx_id: req._tx_id });
						}
					});
				}
			});
		}

		// make a longer timeout based on the number of nodes deployer is waiting on
		function calc_timeout(formatted_body) {
			const MAX_TIMEOUT = 1000 * 60 * 5;		// exceeding 5 minutes is just dumb, something else will timeout and it'll be harder to know what
			let timeout_ms = ev.DEPLOYER_TIMEOUT;
			const arr_size = Array.isArray(formatted_body.crypto) ? formatted_body.crypto.length :
				(Array.isArray(formatted_body.config) ? formatted_body.config.length : 0);

			if (formatted_body && arr_size > 1) {
				// deployer is not spinning up components sequentially, it is in parallel.
				// however it still takes longer the more components you are trying to spin up at once.

				// an array length of 2 -> (1.8 * timeout), 3->2.2x, 4->2.6x, 5->3.0x
				timeout_ms = Math.floor(ev.DEPLOYER_TIMEOUT * (1 + (arr_size * 4 / 10)));
			}

			if (timeout_ms > MAX_TIMEOUT) {
				timeout_ms = MAX_TIMEOUT;
			}
			return timeout_ms;
		}

		// get data from the existing raft cluster from docs in database
		function fill_in_existing_raft_details(body2dep, cb_fmt) {
			t.component_lib.get_components_by_tag(body2dep.cluster_id, true, (err, component_docs) => {
				if (err || !component_docs || component_docs.length === 0) {
					logger.warn('[deploy lib] unable to find existing raft cluster doc by cluster id, will continue w/o.', body2dep.cluster_id);
					return cb_fmt(null, body2dep);
				} else {
					// do NOT copy `version`, the older version might not exist, and thus the user will be unable to add future nodes
					const copy_fields = ['cluster_name', 'resources', 'storage', /*'version',*/ 'display_name'];	// fields to copy from existing doc
					body2dep.cluster_name = null;															// in case users ignore doc, clear fields first

					for (let i in component_docs) {															// iter b/c single doc_might have field missing
						for (let x in copy_fields) {
							const field = copy_fields[x];
							if (body2dep[field] || component_docs[i][field]) {								// if it dne, don't add undefined
								body2dep[field] = body2dep[field] || component_docs[i][field];				// first value in wins
							}
						}
					}
					logger.debug('[deploy lib] found existing raft doc. cluster_name:', body2dep.cluster_name, 'cluster_id:', body2dep.cluster_id);
					return cb_fmt(null, body2dep);
				}
			});
		}
	};

	// check if the cpu/memory/storage values are okay
	function resource_validation(errorObj, c_obj) {
		const errors = [];
		if (c_obj && c_obj.resources) {				// its optional, update component won't always be changing these fields, so they won't always exist, np
			for (let name in c_obj.resources) {
				const cpu = t.misc.safe_dot_nav(c_obj, 'c_obj.resources.' + name + '.requests.cpu');
				const memory = t.misc.safe_dot_nav(c_obj, 'c_obj.resources.' + name + '.requests.memory');
				if (t.misc.invalid_cpu_value(cpu)) {
					errors.push('invalid value for "resources.' + t.misc.safe_str(name) + '.requests.cpu", try values similar to "250m" or "0.25".');
				}
				if (t.misc.invalid_bytes_value(memory)) {
					errors.push('invalid value for "resources.' + t.misc.safe_str(name) + '.requests.memory", try values similar to "1GiB", or "1024MiB".');
				}
			}
			for (let name in c_obj.storage) {
				const storage = t.misc.safe_dot_nav(c_obj, 'c_obj.storage.' + name + '.size');
				if (t.misc.invalid_bytes_value(storage)) {
					errors.push('invalid value for "storage.' + t.misc.safe_str(name) + '.size", try values similar to "100GiB", or "102400MiB".');
				}
			}
		}

		if (errors.length === 0) {									// if we do have numbers, make sure requests is less <= limits
			if (c_obj && c_obj.resources) {
				const fields = ['cpu', 'memory'];					// the fields that have to be checked
				for (let name in c_obj.resources) {
					for (let i in fields) {
						const resource_field = fields[i];
						let requests = t.misc.safe_dot_nav(c_obj, 'c_obj.resources.' + name + '.requests.' + resource_field);
						let limits = t.misc.safe_dot_nav(c_obj, 'c_obj.resources.' + name + '.limits.' + resource_field);

						if (resource_field === 'cpu') {				// convert to like units
							requests = t.misc.normalize_cpu(requests);
							limits = t.misc.normalize_cpu(limits);
						} else if (resource_field === 'memory') { 	// convert to like units
							requests = t.misc.normalize_bytes(requests);
							limits = t.misc.normalize_bytes(limits);
						} else {
							logger.warn('[deploy lib] unknown fields, cannot compare');			// not really an input error, let it go
							requests = 0;
							limits = 0;
						}

						if (requests > limits) {
							const input_err = ' "requests" must be <= "limits". requests: ' + requests + ', limits: ' + limits + '.';
							errors.push('invalid value for "resources.' + t.misc.safe_str(name) + '.requests.' + resource_field + '".' + input_err);
						}
					}
				}
			}
		}

		errorObj = t.misc.merge_other_input_errors(errorObj, errors);
		return errorObj;
	}

	// ------------------------------------------
	// remove/delete/deprovision a component without a doc
	// ------------------------------------------
	/*
	req: {
		url: "/ak/api/v2/kubernetes/components/type/:type/:dep_component_id"
		session: {},
		params: {
			component_id: "<deployer component id>"
			debug_tx_id: "asdf" 				// optional
		},
		headers: {},							// optional - forwarded to deployer
	}
	*/
	exports.deprovision_component_without_doc = function (req, cb) {
		const debug_tx_id = t.ot_misc.buildTxId(req);
		const opts = {
			dep_component_id: req.params.dep_component_id,
			type: req.params.type,
			debug_tx_id: debug_tx_id,
			req: req,
			CLEAN_UP: true,
		};
		send_deployer_delete_request(opts, cb);
	};

	// ------------------------------------------
	// remove/delete/deprovision a component
	// ------------------------------------------
	/*
	req: {
		url: "whatever?force=yes"				// optional. if FORCE === yes, ignore deployer resp and remove comp doc
		session: {},
		params: {
			component_id: "<athena component id>"
			debug_tx_id: "asdf" 				// optional
		},
		headers: {},							// optional - forwarded to deployer
	}
	*/
	exports.deprovision_component = function (req, cb) {
		const parts = t.url.parse(req.url, true);
		const opts = {
			req: req,
			id: req.params.component_id,
			skip_cache: true,
			log_msg: 'deprovision component',
			FORCE: (parts.query.force === 'yes')
		};
		const debug_tx_id = t.ot_misc.buildTxId(req);
		t.component_lib.load_component_by_id(opts, (err, doc) => {
			if (err) {
				// error already logged
				return cb(err);
			} else {
				req._component_display_name = doc ? doc.display_name : null;	// store name for activity tracker
				const options = {
					dep_component_id: doc.dep_component_id,
					type: doc.type,
					component_id: opts.id,
					req: req,
					debug_tx_id: debug_tx_id,
					FORCE: opts.FORCE
				};
				send_deployer_delete_request(options, cb);
			}
		});
	};

	// ------------------------------------------
	// remove/delete/deprovision all saas components
	// ------------------------------------------
	/*
	req: {
		url: "whatever?force=yes" 						// optional
		session: {}
	}
	*/
	exports.deprovision_all_components = function (req, cb) {

		// build a notification doc
		const notice = { message: 'deleting all components' };
		t.notifications.procrastinate(req, notice);

		get_all_components_to_del((err, components) => {
			if (err) {
				logger.error('[deployer lib] could not find components to remove. error:', err);
				return cb(err);
			} else {
				logger.debug('[deployer lib] removing ' + components.length + ' components');
				const removed = [];
				t.async.eachLimit(components, 2, (component, cb_deprovision) => {
					if (component.location !== ev.STR.LOCATION_IBP_SAAS) {
						logger.debug('[deployer lib] deprovision non-saas component', component._id);
						const opts = {
							session: req ? req.session : null,
							headers: req ? req.headers : null,
							params: {
								component_id: component._id
							}
						};
						t.component_lib.offboard_component(opts, (delErr) => {
							if (!delErr) {
								removed.push(t.component_lib.fmt_delete_resp(component));
							}
							return cb_deprovision();
						});
					} else {
						logger.debug('[deployer lib] deprovision a saas component', component._id);
						const b_req = {
							url: req ? req.url : null,
							session: req ? req.session : null,
							headers: req ? req.headers : null,
							params: {
								component_id: component._id					// build a fake req with our component id here
							},
						};
						exports.deprovision_component(b_req, (delErr) => {	// send athena's id
							if (!delErr) {
								removed.push(t.component_lib.fmt_delete_resp(component));
							}
							return cb_deprovision();						// don't return errors
						});
					}
				}, () => {
					logger.debug('[deployer lib] deprovision all complete');
					return cb(null, { deleted: removed });
				});
			}
		});

		function get_all_components_to_del(get_cb) {
			const keys = [
				ev.STR.MSP, ev.STR.MSP_EXTERNAL, ev.STR.CA, ev.STR.ORDERER, ev.STR.PEER,
				ev.STR.ENROLL_ID, ev.STR.TEMPLATE_DEBUG, ev.STR.SIG_COLLECTION, ev.STR.BLOCK,
			];
			const opts = {
				db_name: ev.DB_COMPONENTS,					// db for peers/cas/orderers/msps/etc docs
				_id: '_design/athena-v1',					// name of design doc
				view: '_doc_types',
				SKIP_CACHE: (req.query.skip_cache === 'yes'),
				query: t.misc.formatObjAsQueryParams({ include_docs: true, keys: keys }),
			};

			t.otcc.getDesignDocView(opts, (err, resp) => {
				if (err) {
					return get_cb(err);
				} else {
					const docs = [];
					if (resp) {								// format response into array of docs
						for (let i in resp.rows) {
							if (resp.rows[i] && resp.rows[i].doc) {
								docs.push(resp.rows[i].doc);
							}
						}
					}
					return get_cb(null, docs);
				}
			});
		}
	};

	// ------------------------------------------
	// Update component
	// ------------------------------------------
	/*
	req: {
		params: {},
		headers: {},				// optional - forwarded to deployer
		session: {},				// needed to get email address
		body: {}
	}
	*/
	exports.update_component = function (req, cb) {
		//return cb(null, { athena_fmt: {}, deployer_resp: {}, tx_id: '' });
		const opts = {
			req: req,
			id: req.params.athena_component_id,													// path has athena's component id
			skip_cache: true,
			log_msg: 'update component',
		};
		t.component_lib.load_component_by_id(opts, (err, doc) => {
			if (err || !doc) {
				logger.error('[deployer lib] cannot get component doc:', err);
				return cb(err, null);
			} else {
				req._component_display_name = doc ? doc.display_name : null;					// store name for activity tracker
				doc.type = doc.type ? doc.type.toLowerCase() : '?';
				const parsed = {
					iid: (ev.CRN && ev.CRN.instance_id) ? ev.CRN.instance_id : 'iid-not-set',
					component_id: req.params.athena_component_id,
					component_type: typeMapA2D[doc.type] ? typeMapA2D[doc.type] : '?',
					OPERATION: 'update_component',
					debug_tx_id: t.ot_misc.buildTxId(req),
				};
				req.body.id = req.body.id || doc.dep_component_id;
				logger.debug('[deployer lib]', parsed.debug_tx_id, 'updating component. iid', parsed.iid, 'component_type', parsed.component_type);
				const fmt_body = t.comp_fmt.fmt_body_athena_to_dep(req, null);					// translate athena spec to deployer here
				delete fmt_body.dep_component_id;												// delete artifacts from build that are for provision component
				delete fmt_body.parameters;
				if (!req.body.resources) {														// if we weren't changing this, remove the default values
					delete fmt_body.resources;
				}
				if (!req.body.storage) {														// if we weren't changing this, remove the default disk values
					delete fmt_body.storage;
				}
				const errObj = resource_validation(null, fmt_body);								// also check these fields
				if (errObj) {
					logger.error('[deployer lib]', parsed.debug_tx_id, 'input error with update component api', errObj);
					return cb(errObj, null);													// bad input, had an error
				} else {
					req._update_body_to_dep = t.comp_fmt.redact_enroll_details(fmt_body);		// store for debug, gets passed around then enters the doc
					const opts = {
						method: pick_method(fmt_body),
						baseUrl: t.misc.format_url(ev.DEPLOYER_URL),							// url to deployer
						url: '/api/v3/instance/' + parsed.iid + '/type/' + parsed.component_type + '/component/' + doc.dep_component_id,
						body: JSON.stringify(fmt_body),											// body for deployer
						headers: exports.copy_headers(req.headers),
						timeout: ev.DEPLOYER_TIMEOUT,
						_tx_id: parsed.debug_tx_id,
					};
					logger.debug('[deployer lib]', parsed.debug_tx_id, 'updating comp - sending deployer api w/route:', opts.method, opts.url);
					send_dep_req(opts, (err, depRespBody) => {
						const { fmt_err, fmt_ret } = handle_dep_response(parsed, err, depRespBody);
						if (fmt_err) {															// error is already logged
							return cb(fmt_err, fmt_ret);
						} else {
							exports.record_deployer_operation(opts, req, depRespBody, parsed, (athenaError, athenaResponse) => {
								if (athenaError) {												// if athena has an error don't send the deployer response
									logger.error('[deployer lib]', parsed.debug_tx_id, ' athena had an error updating the component', athenaError);
									return cb(athenaError, null);								// athena had an error
								} else {
									restart_comp_if_needed(() => {
										return cb(null, { athena_fmt: athenaResponse, deployer_resp: fmt_ret, tx_id: parsed.debug_tx_id });
									});
								}
							});
						}
					});
				}
			}
		});

		// pick the deployer method based on the keys in the body
		// return PUT if any of the keys match a known PUT key. else return PATCH. normally there is only 1 key, but internal can send admincerts && nodeou.
		function pick_method(dep_body) {
			// don't use PUT for crypto/config, need to use patch so we merge w/existing fields - dsh 10/23/2020
			const put_route_leafs = ['all', /*'config', 'crypto',*/ 'version', 'replicas', 'hsm', 'admincerts', 'genesis'];	// compare with deployer syntax
			const ignored_keys = ['parameters', 'dep_component_id'];
			for (let key in dep_body) {
				const lc_key = key.toLowerCase();				// compare with lowercase name
				if (typeof dep_body[key] !== 'undefined' && !ignored_keys.includes(lc_key)) {
					if (put_route_leafs.includes(lc_key)) {
						logger.debug('[deployer lib] detected put-body field:', lc_key, 'on update component api.');
						return 'PUT';
					}
				}
			}
			logger.debug('[deployer lib] did NOT detect a put-body field on update component api.');
			return 'PATCH';										// default
		}

		// depending on the body send a restart action now
		function restart_comp_if_needed(cb_action) {
			// removed auto restart here b/c of issue 4841
			return cb_action();									// no restart needed
		}

		// decide if this api needs a restart action
		/*function needs_to_restart() {
			// removed config_override and admin_certs from here b/c of issue 4841
			const restart_keys = ['node_ou'];					// array of keys (athena format) that will trigger a auto restart
			if (req && req.body) {
				for (let key in req.body) {						// check the body sent to athena
					const lc_key = key.toLowerCase();
					if (restart_keys.includes(lc_key)) {		// found a restart key, restart this component now
						return true;
					}
				}
			}
			return false;
		}*/
	};

	// send the request to the deployer and parse its response
	function send_dep_req(opts, cb) {
		if (ev.IMPORT_ONLY) {
			logger.warn('[deployer apis] import only mode, deployer data requested but there is no deployer to ask');
			return cb(400, { error: 'import only - deployer is not available' });	// an import only console cannot ask deployer, there isn't a deployer
		} else {
			opts._name = 'deployer';
			opts._retry_codes = opts._retry_codes || {											// list of codes we will retry
				'429': '429 rate limit exceeded aka too many reqs',
			};
			opts._max_attempts = opts._max_attempts || 2;
			opts._start_ts = Date.now();
			t.misc.retry_req(opts, (communication_err, resp) => {
				const elapsed = Date.now() - opts._start_ts;
				let ret = resp ? resp.body : null;
				let code = t.ot_misc.get_code(resp);
				const ts_str = '(took ' + t.misc.friendly_ms(elapsed) + ')';					// only used for logs, debug purposes
				if (communication_err) {
					// comm errors are already rolled into resp by retry_req(), so we don't need to use communication_err
					logger.error('[deployer apis]', opts._tx_id, '- [1] unable to contact deployer.', ts_str);	// error already logged
				} else {
					if (t.ot_misc.is_error_code(code)) {
						logger.error('[deployer apis]', opts._tx_id, '- [1] deployer responded with error code', code, resp.statusCode, ts_str, ret);
					} else {
						logger.info('[deployer apis]', opts._tx_id, '- [1] successful deployer response', code, ts_str);
					}
				}
				return cb(code, ret);
			});
		}
	}

	// ------------------------------------------
	// bulk remove/delete/deprovision saas components
	// ------------------------------------------
	/*
	req: {
		url: "whatever?force=yes"				// optional. if FORCE === yes, ignore deployer resp and remove comp doc
		session: {},
		headers: {},
	}
	*/
	exports.bulk_deprovision_components = function (req, cb) {
		const lc_tag = req.params.tag.toLowerCase();
		let deleted_components = [];
		let errors = 0;

		// build a notification doc
		const notice = {
			message: 'deleting components by tag: ' + lc_tag,
			tag: lc_tag,
		};
		t.notifications.procrastinate(req, notice);

		t.component_lib.get_components_by_tag(lc_tag, true, (err, components) => {
			if (err) {
				logger.error('[deployer lib] error finding components to remove by tag:', lc_tag, '. error:', err);
				return cb(err);
			} else {
				logger.debug('[deployer lib] removing ' + components.length + ' components with tag:', lc_tag);
				t.async.eachLimit(components, 3, (component, cb_deprovision) => {	// don't overload deployer, 3 at a time seems okay
					deprovision(component, () => {
						return cb_deprovision();
					});
				}, () => {
					logger.info('[deployer lib] deprovision by tag complete. tag:', lc_tag, 'total:', deleted_components.length);
					let ret = {
						statusCode: (errors > 0) ? 207 : 200,				// send 207 if 1+ went wrong
						deleted: deleted_components
					};
					if (!t.ot_misc.is_v2plus_route(req)) {					// legacy response
						ret = {
							statusCode: (errors > 0) ? 207 : 200,
							tag: lc_tag,
							deleted_components: deleted_components
						};
					}
					return cb(null, ret);
				});
			}
		});

		// offboard the component
		function deprovision(component, cb_work) {
			component.debug_tx_id = t.ot_misc.buildTxId(req);		// make an id that follows this deletes journey, gets logged
			if (component.location !== ev.STR.LOCATION_IBP_SAAS) {
				logger.debug('[deployer lib]', component.debug_tx_id, 'deprovision non-saas component', component._id);
				const opts = {
					session: req.session,
					headers: req.headers,
					params: {
						component_id: component._id,
						debug_tx_id: component.debug_tx_id,
					}
				};
				t.component_lib.offboard_component(opts, (delErr) => {
					if (delErr) {
						errors++;
						deleted_components.push(build_error_obj(delErr, component));
					} else {
						deleted_components.push(build_success_obj(component));
					}
					return cb_work();									// don't return errors
				});
			} else {
				logger.debug('[deployer lib]', component.debug_tx_id, ' deprovision a saas component', component._id);
				const b_req = {
					url: req.url,
					session: req.session,
					headers: req.headers,
					params: {
						component_id: component._id,				// build a fake req with our component id here
						debug_tx_id: component.debug_tx_id,
					},
				};
				exports.deprovision_component(b_req, (delErr) => {	// send athena's id
					if (delErr) {
						errors++;
						deleted_components.push(build_error_obj(delErr, component));
					} else {
						deleted_components.push(build_success_obj(component));
					}
					return cb_work();								// don't return errors
				});
			}
		}
	};

	// ------------------------------------------
	// bulk update saas components - used to upgrade fabric versions, resources, etc
	// ------------------------------------------
	/*
	req: {
		url: "whatever" 						// optional
		session: {}
	}
	*/
	exports.bulk_update_components = (req, cb) => {
		const lc_tag = req.params.tag.toLowerCase();
		let updated_components = [];
		let errors = 0;

		// build a notification doc
		const notice = {
			message: 'updating components by tag: ' + lc_tag,
			tag: lc_tag,
		};
		t.notifications.procrastinate(req, notice);

		t.component_lib.get_components_by_tag(lc_tag, true, (err, components) => {
			if (err) {
				logger.error('[deployer lib] error finding components to update by tag:', lc_tag, '. error:', err);
				return cb(err);
			} else {
				logger.debug('[deployer lib] updating ' + components.length + ' components with tag:', lc_tag);
				t.async.eachLimit(components, 3, (component, cb_edited) => {	// don't overload deployer, 3 at a time seems okay
					update_component(component, () => {
						return cb_edited();
					});
				}, () => {
					logger.info('[deployer lib] update by tag complete. tag:', lc_tag, 'total:', updated_components.length);
					const ret = {
						statusCode: (errors > 0) ? 207 : 200,			// send 207 if 1+ went wrong
						tag: lc_tag,
						updated_components: updated_components
					};
					return cb(null, ret);
				});
			}
		});

		// update the component
		function update_component(component, cb_work) {
			component.debug_tx_id = t.ot_misc.buildTxId(req);		// make an id that follows this deletes journey, gets logged
			if (component.location !== ev.STR.LOCATION_IBP_SAAS) {
				logger.warn('[deployer lib]', component.debug_tx_id, ' skipping - cannot update non-saas component: "' + component._id + '"');
				return cb_work();										// don't return errors
			} else {
				logger.debug('[deployer lib]', component.debug_tx_id, ' updating a saas component: "', component._id + '"');
				const b_req = {
					url: req.url,
					session: req.session,
					headers: req.headers,
					body: req.body,
					params: {
						athena_component_id: component._id,				// build a fake req with our component id here
						debug_tx_id: component.debug_tx_id,
					},
				};
				exports.update_component(b_req, (uError) => {			// send athena's id
					if (uError) {
						errors++;
						updated_components.push(build_error_obj(uError, component));
					} else {
						updated_components.push(build_success_obj(component));
					}
					return cb_work();									// don't return errors
				});
			}
		}
	};

	// build an object that describes the component that was deleted. users will see this
	function build_success_obj(component) {
		return {
			statusCode: 200,
			message: 'ok',
			id: component._id,
			dep_id: component.dep_component_id,
			tx_id: component.debug_tx_id,
		};
	}

	// build an object that describes the component. users will see this
	function build_error_obj(error, component) {
		return {
			statusCode: t.ot_misc.get_code(error),
			message: error.msg,
			id: component._id,
			dep_id: component.dep_component_id,
			tx_id: component.debug_tx_id,
		};
	}

	// ------------------------------------------
	// get all deployer & athena components - return each data source as a separate field
	// ------------------------------------------
	/*
	req: {
		params: {
			tag: "peers"					// optional
		},
		query:{
			deployment_attrs: "included", 	// optional
			parsed_certs: "included", 		// optional
		}
		headers: {}							// optional - forwarded to deployer
	}
	*/
	exports.get_all_components = (req, cb) => {
		t.async.parallel([

			// ---- [0] Athena docs ---- //
			(join) => {

				// --- By tag --- //
				if (req && req.params && req.params.tag) {							// get ONLY components with matching tag!
					const lc_tag = req.params.tag.toLowerCase();
					const SKIP_CACHE = t.ot_misc.skip_cache(req);
					t.component_lib.get_components_by_tag(lc_tag, SKIP_CACHE, (err2, arr) => {	// first get all athena docs
						join(err2, { components: arr });
					});
				}

				// --- By type --- //
				else if (req && req.params && req.params.type) {								// get ONLY components with matching type!
					const SKIP_CACHE = t.ot_misc.skip_cache(req);
					t.component_lib.get_components_by_type(req.params.type, SKIP_CACHE, (err2, arr) => {	// first get all athena docs
						join(err2, { components: arr });
					});
				}

				// --- All --- //
				else {																// get ALL components
					t.component_lib.get_all_components(req, (err1, resp) => {		// first get all athena docs
						if (err1 && err1.statusCode && err1.statusCode === 222) {
							join(null, err1);
						} else {
							join(err1, resp);
						}
					});
				}
			},

			// ---- [1] Deployer data ---- //
			(join) => {
				if (ev.IMPORT_ONLY) {
					join(null, null);			// an import only console cannot ask deployer, there isn't a deployer
				} else if (!t.component_lib.include_deployment_data(req)) {
					join(null, null);
				} else {
					exports.get_all_components_api(req, (err3, ret) => {
						join(err3, ret);
					});
				}
			}
		], (error, results) => {
			if (error) {
				logger.error('[deployer lib] unable to get component data:', error);
				return cb(error);
			} else {
				const athena_data = results[0];
				const deployer_data = results[1];

				const ret = {
					athena_docs: athena_data ? athena_data.components : null,		// pass athena docs on too, useful
					deployer_data: deployer_data,
				};
				if (deployer_data && !deployer_data._cached) {						// do not run sync w/cached deployer data
					batch_sync_deployer_attributes_with_couch(ret);					// we don't wait on batch sync... todo re-evaluate
				}
				return cb(null, ret);
			}
		});
	};

	// ------------------------------------------
	// get all deployer components - only deployer, no athena results - (cache used if possible)
	// ------------------------------------------
	/*
	req: {
		query: {
			cache: 'skip'
		}
		headers: {}				// optional - forwarded to deployer
	}
	*/
	exports.get_all_components_api = (req, cb) => {
		if (!req) { req = { params: {} }; }
		const SKIP_CACHE = t.ot_misc.skip_cache(req);
		req._key_src = ev.STR.GET_ALL_COMPONENTS_KEY;								// this builds the lookup key for the cache
		req._key = t.misc.hash_str(req._key_src);									// this is the lookup key in the cache

		if (SKIP_CACHE === false && ev.PROXY_CACHE_ENABLED === true) {				// check the cache first
			// dsh todo remove this call from proxy cache, use couch db's cache instead
			const hit = t.proxy_cache.get(req._key);
			if (hit && hit.resp && hit.key_src === req._key_src) {					// protect from hash collision
				hit.resp._cached_timestamp = hit.cached_ts;
				hit.resp._cached = true;
				hit.resp._cache_expires_in = t.misc.friendly_ms(t.proxy_cache.getTtl(req._key) - Date.now());
				logger.debug('[deployer lib] using cached value for the deployer api: get all components', hit.resp._cache_expires_in);
				return cb(hit.error, hit.resp);
			}
		}
		get_all_components_in_k8s_api((error, response) => {
			return cb(error, response);
		});

		function get_all_components_in_k8s_api(lc_cb) {
			const parsed = {
				iid: (ev.CRN && ev.CRN.instance_id) ? ev.CRN.instance_id : 'iid-not-set',
				debug_tx_id: t.ot_misc.buildTxId(req),
			};
			const opts = {
				method: 'GET',
				baseUrl: t.misc.format_url(ev.DEPLOYER_URL),					// url to deployer
				url: '/api/v3/instance/' + parsed.iid + '/type/all',
				headers: req ? exports.copy_headers(req.headers) : {},
				timeout: ev.DEPLOYER_TIMEOUT,
				_tx_id: parsed.debug_tx_id,
			};
			logger.debug('[deployer lib]', parsed.debug_tx_id, 'sending deployer api w/route:', opts.url);
			send_dep_req(opts, (err, depRespBody) => {							// then get deployer's docs
				let { fmt_err, fmt_ret } = handle_dep_response(parsed, err, depRespBody);
				fmt_ret = conform_to_legacy_fmt(fmt_ret);
				const component_len = (fmt_ret && typeof fmt_ret === 'object') ? Object.keys(fmt_ret).length : 0;
				logger.debug('[deployer lib]', parsed.debug_tx_id, 'received ' + component_len + ' components from deployer');

				if (fmt_err === null && fmt_ret && ev.PROXY_CACHE_ENABLED === true) {	// only cache success responses
					const data2cache = {
						error: fmt_err,
						resp: fmt_ret,											// fmt_ret is an object containing 1 component's data
						key_src: req._key_src,									// remember the orig key data to protect form hash collisions
						cached_ts: Date.now(),
					};
					t.proxy_cache.set(req._key, data2cache, 1 * 60 * 60);		// expiration is in sec
				}

				return lc_cb(fmt_required_data_err(req, fmt_err), fmt_ret);
			});
		}

		// if given array of component objects, convert to dictionary object. keys are the deployer component ids
		function conform_to_legacy_fmt(data) {
			if (!Array.isArray(data)) {
				return data;
			} else {
				const fmt = {};
				for (let i in data) {
					const id = data[i].name;		// deployer's component id becomes the key
					if (id) {
						fmt[id] = data[i];			// copy all the data
					}
				}
				return fmt;
			}
		}
	};

	// reformat the error if we required this data but cannot get it
	function fmt_required_data_err(req, fmt_err) {
		if (fmt_err && t.ot_misc.skip_cache(req) && t.component_lib.include_deployment_data(req)) {
			fmt_err = {
				statusCode: 503,
				msg: 'unable to retrieve non-cache data for deployment_attrs. enable cached responses and try again.',
				response: fmt_err.msg
			};
		} else if (fmt_err && !t.ot_misc.skip_cache(req) && t.component_lib.include_deployment_data(req)) {
			fmt_err = null;							// if we didn't require it, don't pass error on
		}
		return fmt_err;
	}

	// ------------------------------------------
	// get a deployer & athena component - aka get component - return each data source as a separate field
	// ------------------------------------------
	/*
	req: {
		headers: {}				// optional - forwarded to deployer
	}
	*/
	exports.get_component_data = (req, cb) => {
		let athena_doc = null;
		let deployer_data = null;
		t.async.waterfall([

			// ---- [0] Athena doc ---- //
			(callback) => {
				const get_opts = {
					req: req,
					id: req.params.athena_component_id || req.params.id,
					skip_cache: t.ot_misc.skip_cache(req),
					log_msg: 'get component',
				};
				t.component_lib.load_component_by_id(get_opts, (err1, doc) => {
					athena_doc = doc;
					callback(err1, doc);
				});
			},

			// ---- [1] Deployer data ---- //
			(doc, callback) => {
				if (ev.IMPORT_ONLY) {
					callback(null, null);			// an import only console cannot ask deployer, there isn't a deployer
				} else if (!t.component_lib.include_deployment_data(req)) {
					callback(null, null);
				} else {
					// load_component_by_id() will store the doc into req._component_doc
					exports.get_component_api(req, (err3, resp) => {
						deployer_data = resp;
						callback(err3, resp);
					});
				}
			}

		], (error, results) => {
			if (error) {
				logger.error('[deployer lib] unable to get component data:', error);
				return cb(error);
			} else {
				const ret = {
					athena_doc: athena_doc,
					deployer_data: deployer_data,
				};
				const sync_opts = {
					athena_docs: [ret.athena_doc],
					deployer_data: {}
				};
				if (ret.deployer_data && ret.deployer_data.name) {
					sync_opts.deployer_data[ret.deployer_data.name] = ret.deployer_data;
				}
				if (deployer_data && !deployer_data._cached) {						// do not run sync w/cached deployer data
					batch_sync_deployer_attributes_with_couch(sync_opts);			// we don't wait on batch sync... todo re-evaluate
				}
				return cb(null, ret);
			}
		});
	};

	// ------------------------------------------
	// get a component from deployer - includes certificate for a pre-created orderer node
	// ------------------------------------------
	/*
	req: {
		_component_doc: {} 			// required - component doc
		headers: {},				// [optional] - forwarded to deployer
		session: {},				// needed to get email address
		params: {
			athena_component_id: "",
			debug_tx_id: ""			// optional
		}
	}
	*/
	exports.get_component_api = function (req, cb) {
		if (!req) { req = { params: {} }; }
		const SKIP_CACHE = t.ot_misc.skip_cache(req);
		req._key_src = 'GET ' + req.path; 							// this builds the lookup key for the cache, do not use "url" b/c query params mess up key
		req._key = t.misc.hash_str(req._key_src);					// this is the lookup key in the cache

		if (SKIP_CACHE === false && ev.PROXY_CACHE_ENABLED === true) {	// check the cache first
			const hit = t.proxy_cache.get(req._key);
			if (hit && hit.resp && hit.key_src === req._key_src) {		// protect from hash collision
				hit.resp._cached_timestamp = hit.cached_ts;
				hit.resp._cached = true;
				hit.resp._cache_expires_in = t.misc.friendly_ms(t.proxy_cache.getTtl(req._key) - Date.now());
				logger.debug('[deployer lib] using cached value for the deployer api: get component', hit.resp._cache_expires_in);
				return cb(hit.error, hit.resp);
			}
		}
		get_component_k8s_api((error, response) => {
			return cb(error, response);
		});

		function get_component_k8s_api(lc_cb) {
			const doc = req._component_doc;
			doc.type = doc.type ? doc.type.toLowerCase() : '?';
			const parsed = {
				iid: (ev.CRN && ev.CRN.instance_id) ? ev.CRN.instance_id : 'iid-not-set',
				component_id: req.params.athena_component_id,
				component_type: typeMapA2D[doc.type] ? typeMapA2D[doc.type] : '?',
				debug_tx_id: t.ot_misc.buildTxId(req),
			};
			logger.debug('[deployer lib]', parsed.debug_tx_id, 'asking deployer for component doc.', parsed.component_type);

			let url2use = '/api/v3/instance/' + parsed.iid + '/type/' + parsed.component_type + '/component/' + doc.dep_component_id;
			const opts = {
				method: 'GET',
				baseUrl: t.misc.format_url(ev.DEPLOYER_URL),						// url to deployer
				url: url2use,
				headers: exports.copy_headers(req.headers),
				timeout: ev.DEPLOYER_TIMEOUT,
				_tx_id: parsed.debug_tx_id,
				_retry_codes: {														// list of codes we will retry
					'429': '429 rate limit exceeded aka too many reqs',
					'500': '500 internal server error'
				}
			};
			logger.debug('[deployer lib]', parsed.debug_tx_id, ' sending deployer api w/route:', opts.url);
			send_dep_req(opts, (err, depRespBody) => {
				let { fmt_err, fmt_ret } = handle_dep_response(parsed, err, depRespBody);
				if (fmt_err === null && fmt_ret && ev.PROXY_CACHE_ENABLED === true) {	// only cache success responses
					const data2cache = {
						error: fmt_err,
						resp: fmt_ret,											// fmt_ret is an object where field names are the id of the component
						key_src: req._key_src,									// remember the orig key data to protect form hash collisions
						cached_ts: Date.now(),
					};
					t.proxy_cache.set(req._key, data2cache, 1 * 60 * 60);		// expiration is in sec
				}

				return lc_cb(fmt_required_data_err(req, fmt_err), fmt_ret);
			});
		}
	};

	// ------------------------------------------
	// send config block to a pre-created orderer node - [note] this retries deployer many times
	// ------------------------------------------
	/*
	req: {
		headers: {},				// optional - forwarded to deployer
		session: {},				// needed to get email address
		body: {
			b64_block: "<base 64 encoded genesis/config block>"
		},
		params: {
			athena_component_id: "",
			debug_tx_id: ""			// optional
		}
	}
	*/
	exports.send_config_block = function (req, cb) {
		const opts = {
			db_name: ev.DB_COMPONENTS,
			_id: req.params.athena_component_id,												// path has athena's component id
			SKIP_CACHE: true,
		};
		t.otcc.getDoc(opts, (err, doc) => {
			if (err || !doc) {
				logger.error('[deployer lib] cannot get component doc:', err);
				return cb(err, null);
			} else {
				doc.type = doc.type ? doc.type.toLowerCase() : '?';
				const parsed = {
					iid: (ev.CRN && ev.CRN.instance_id) ? ev.CRN.instance_id : 'iid-not-set',
					component_id: req.params.athena_component_id,
					component_type: typeMapA2D[doc.type] ? typeMapA2D[doc.type] : '?',
					debug_tx_id: t.ot_misc.buildTxId(req),
				};
				logger.debug('[deployer lib]', parsed.debug_tx_id, 'sending config block. iid', parsed.iid, 'component_type', parsed.component_type);

				const opts = {
					method: 'PUT',
					baseUrl: t.misc.format_url(ev.DEPLOYER_URL),	// url to deployer
					url: '/api/v3/instance/' + parsed.iid + '/type/orderer/component/' + doc.dep_component_id + '/genesis',
					body: JSON.stringify({ genesis: { block: req.body.b64_block } }),
					headers: exports.copy_headers(req.headers),
					timeout: ev.DEPLOYER_TIMEOUT,
					_tx_id: parsed.debug_tx_id,
				};
				logger.debug('[deployer lib]', parsed.debug_tx_id, 'sending deployer api w/route:', opts.url);
				opts._retry_codes = {								// list of codes we will retry
					'429': '429 rate limit exceeded aka too many reqs',
					'408': '408 timeout',
					'502': '502 bad gateway',						// 502s happen if the component secret is not in k8s yet
				};
				opts._max_attempts = 4;
				opts._calc_retry_delay = (options, resp) => {		// calculate the delay to send the next request. _attempt is the attempt that failed
					const delays_secs = [9, 9, 14, 29];																// delay: n/a, 9-10, 14-15, 29-30
					return (delays_secs[options._attempt % delays_secs.length] * 1000) + Math.random() * 1000;		// total:  05,   15,   30,     60
				};
				send_dep_req(opts, (err, depRespBody) => {
					let { fmt_err, fmt_ret } = handle_dep_response(parsed, err, depRespBody);
					if (t.ot_misc.is_v3plus_route(req)) {
						const options = {
							deployer_data: fmt_ret,
							component_doc: doc
						};
						return cb(fmt_err, t.comp_fmt.fmt_comp_resp_with_deployer(req, options));
					} else if (t.ot_misc.is_v2plus_route(req)) {
						return cb(fmt_err, fmt_ret);				// v2 response does not nest the response data
					} else {
						return cb(fmt_err, { data: fmt_ret });		// v1 response nest component data under "data"
					}
				});
			}
		});
	};

	// generic handling of the send dep request - formats deployer's response as an object
	function handle_dep_response(parsed, statusCode, depRespBody) {
		try {
			depRespBody = JSON.parse(depRespBody);
		} catch (e) {
			logger.error('[deployer lib]', parsed.debug_tx_id, ' could not parse deployer response. might not be parsable json.',
				typeof depRespBody, depRespBody);
		}

		if (typeof depRespBody !== 'object') {						// make sure the body passed back is JSON
			const not_json_error = {
				statusCode: 500,
				msg: 'body received from deployer was not valid JSON'
			};
			return { fmt_err: not_json_error, fmt_ret: depRespBody };
		} else {
			if (t.ot_misc.is_error_code(statusCode)) {
				const athenaErrorObj = {
					statusCode: statusCode,
					msg: depRespBody
				};
				return { fmt_err: athenaErrorObj, fmt_ret: depRespBody };
			} else {
				return { fmt_err: null, fmt_ret: depRespBody };
			}
		}
	}

	// ------------------------------------------
	// prepare a new raft node - creates node and sends it genesis block at the same time
	// [do not use - use the pre-create raft api instead] (leaving code here for testing)
	// ------------------------------------------
	/*
	req: {
		headers: {},				// optional - forwarded to deployer
		session: {},				// needed to get email address
		body: {
			type: "fabric-orderer",
			orderer_type: "raft",
			msp_id: "msp1",
			display_name: "raft append d7",
			b64_block: "<base 64 encoded genesis block>",
			config : {}
		},
		params: {
			athena_component_id: "",
			debug_tx_id: ""			// optional
		}
	}
	*/
	exports.prepare_new_raft_node = function (req, cb) {
		const debug_tx_id = t.ot_misc.buildTxId(req);

		// --- 1. check if cluster id exists --- //
		req.body.cluster_id = req.params.cluster_id;
		req.params.debug_tx_id = debug_tx_id;
		t.component_lib.getAllIds((_, ids) => {
			if (!ids || !ids.cluster_ids || !ids.cluster_ids.includes(req.body.cluster_id)) {
				logger.error('[deployer lib]', debug_tx_id, 'cannot append raft node to this raft cluster id. id does not exist:', req.body.cluster_id);
				return cb({ statusCode: 400, msg: 'cannot append raft node to this cluster id. id does not exist: "' + req.body.cluster_id + '"' });
			} else {

				// --- 2. "pre-create" the orderer node --- //
				t.deployer.provision_component(req, (errObj2, resp) => {
					if (errObj2 || !resp) {
						logger.error('[deployer lib]', debug_tx_id, 'cannot append raft node to raft cluster. error during provision', errObj2, resp);
						return cb(errObj2);
					} else {
						const component_doc = resp.athena_fmt;
						logger.info('[deployer lib]', debug_tx_id, 'raft node 2 append is pre-created via deployer');

						// --- 3. Now send the "pre-create" orderer node its genesis block --- //
						logger.debug('[deployer lib]', debug_tx_id, 'sending the genesis block soon, delaying to wait for k8s');
						setTimeout(() => {																			// delay it a bit, won't be ready yet
							req.params.athena_component_id = component_doc.id;
							req.body = {
								b64_block: req.body.b64_block,
							};
							t.deployer.send_config_block(req, (errObj, config_response) => {
								if (errObj) {
									logger.error('[deployer lib]', debug_tx_id, 'could not send genesis block. deleting node.');	// error already logged
									undo(component_doc, () => {
										return cb(errObj);
									});
								} else {
									logger.info('[deployer lib]', debug_tx_id, 'sent genesis block to node. raft node 2 append is complete.');
									return cb(null, component_doc);
								}
							});
						}, resp.timeout_value || 5000);		// 5 seconds seems to be enough, but send config block will retry if not
					}										// "timeout_value" - set to 1ms, only by test, to avoid testing slow down
				});
			}
		});

		// delete the component
		function undo(component, cb_undo) {
			logger.warn('[deploy lib] removing failed raft node', component.id);
			const undo_opts = {
				url: '?force=yes',
				session: req.session,
				headers: req.headers,
				params: {
					component_id: component.id,					// build a fake req with athena's component id here
					debug_tx_id: debug_tx_id,
				},
			};
			exports.deprovision_component(undo_opts, (delErr) => {
				return cb_undo();
			});
		}
	};

	// ------------------------------------------
	// edit admin cert on filesystem - will not add duplicate or invalid certs
	// ------------------------------------------
	/*
	req: {
		headers: {},				// optional - forwarded to deployer
		session: {},				// needed to get email address
		body: {
			"append_admin_certs": ["base 64 encoded pem"],
			"remove_admin_certs": ["base 64 encoded pem"]
		},
		params: {
			athena_component_id: "",
			debug_tx_id: ""			// optional
		}
	}
	*/
	exports.edit_admin_certs = function (req, cb) {
		const debug_tx_id = t.ot_misc.buildTxId(req);
		req.params.debug_tx_id = debug_tx_id;
		req._include_deployment_attributes = true;
		req._skip_cache = true;

		// ----- Get current admin certs from deployer ----- //
		exports.get_component_data(req, (err, data) => {
			if (err || !data) {
				logger.error('[deployer lib]', debug_tx_id, 'unable to get component data from deployer:', err);
				return cb(err, null);
			} else {
				const obj = edit_admin_certs(data.deployer_data);							// do the work

				if (obj.changes_made === 0) {
					logger.warn('[deployer lib]', debug_tx_id, 'no admin cert changes were needed...');
					return cb(null, add_cert_details(obj));									// not an error
				} else {

					// ----- Perform the admin cert changes ---- //
					const comp_type = t.component_lib.get_type_from_doc(data.athena_doc);
					const parsed = {
						iid: (ev.CRN && ev.CRN.instance_id) ? ev.CRN.instance_id : 'iid-not-set',
						component_id: req.params.athena_component_id,
						component_type: typeMapA2D[comp_type] ? typeMapA2D[comp_type] : '?',
						debug_tx_id: t.ot_misc.buildTxId(req),
					};
					logger.debug('[deployer lib]', debug_tx_id, 'changing admin certs via deployer for component', req.params.athena_component_id);

					const opts = {
						method: 'PUT',
						baseUrl: t.misc.format_url(ev.DEPLOYER_URL),								// url to deployer
						url: '/api/v3/instance/' + parsed.iid + '/type/' + parsed.component_type + '/component/' + data.deployer_data.name + '/admincerts',
						body: JSON.stringify({ admincerts: obj.set_admin_certs }),
						headers: exports.copy_headers(req.headers),
						timeout: ev.DEPLOYER_TIMEOUT,
						_tx_id: parsed.debug_tx_id,
					};
					send_dep_req(opts, (err, depRespBody) => {
						const { fmt_err, fmt_ret } = handle_dep_response(parsed, err, depRespBody);
						if (fmt_err) {
							return cb(fmt_err, fmt_ret);											// error already logged
						} else {
							logger.debug('[deployer lib]', debug_tx_id, 'made', obj.changes_made, 'admin cert changes');
							return cb(null, add_cert_details(obj));
						}
					});
				}
			}

			// add cert fields to the response
			function add_cert_details(data) {
				const cert_details = [];
				for (let i in data.set_admin_certs) {
					const temp = t.ot_misc.parseCertificate(data.set_admin_certs[i]);
					cert_details.push(temp);
				}

				data.set_admin_certs = cert_details;			// overwrite
				return data;
			}
		});

		// do the actual edit cert work
		function edit_admin_certs(deployer_doc) {
			const existing_certs_obj = parse_cert_array('existing', deployer_doc.admincerts);
			const remove_admin_certs_obj = parse_cert_array('removing', req.body.remove_admin_certs);
			const append_admin_certs_obj = parse_cert_array('appending', req.body.append_admin_certs);

			const set = {
				b64_pems: [],																// init, start w/nothing
				serials: [],
				changes_made: 0,
				invalid_certs: remove_admin_certs_obj.invalid_certs.concat(append_admin_certs_obj.invalid_certs),
			};
			logger.debug('[deployer lib]', debug_tx_id, 'existing certs:', existing_certs_obj.b64_pems.length, ', to append:',
				append_admin_certs_obj.b64_pems.length, ', to remove:', remove_admin_certs_obj.b64_pems.length);

			// --- Rebuild the array of certs --- //
			// add back the existing certs but skip ones we are removing
			for (let i in existing_certs_obj.b64_pems) {
				const existing_serial = existing_certs_obj.serials[i];
				const existing_cert = existing_certs_obj.b64_pems[i];

				if (!remove_admin_certs_obj.serials.includes(existing_serial)) {			// do not add back the "to be removed" certs
					if (!set.serials.includes(existing_serial)) {							// prevent duplicate certs
						set.b64_pems.push(existing_cert);
						set.serials.push(existing_serial);
					} else {
						logger.warn('[deployer lib]', debug_tx_id, 'skipping duplicate existing cert in pos:', i, existing_serial);
						set.changes_made++;													// skipping one that is existing, is a change
					}
				} else {
					logger.warn('[deployer lib]', debug_tx_id, 'removing existing cert in pos:', i, existing_serial);
					set.changes_made++;														// removing a cert is a change
				}
			}

			// append the new certs
			for (let i in append_admin_certs_obj.b64_pems) {
				const appending_serial = append_admin_certs_obj.serials[i];
				const appending_cert = append_admin_certs_obj.b64_pems[i];

				if (!set.serials.includes(appending_serial)) {								// prevent duplicate certs
					logger.debug('[deployer lib]', debug_tx_id, 'appending cert in pos:', i, appending_serial);
					set.b64_pems.push(appending_cert);
					set.serials.push(appending_serial);
					set.changes_made++;
				} else {
					logger.warn('[deployer lib]', debug_tx_id, 'skipping the appending of a duplicate cert in pos:', i, appending_serial);
				}
			}

			const ret = {
				set_admin_certs: set.b64_pems,
				changes_made: set.changes_made,
				invalid_certs: set.invalid_certs
			};
			if (ret.invalid_certs && ret.invalid_certs.length === 0) {
				delete ret.invalid_certs;
			}
			return ret;
		}

		function parse_cert_array(log, certs) {
			const formatted = {
				b64_pems: [],
				serials: [],
				invalid_certs: [],
			};
			for (let i in certs) {
				if (certs[i]) {
					const parsed = t.ot_misc.parseCertificate(certs[i]);
					if (!parsed || !parsed.serial_number_hex) {
						logger.error('[deployer lib] unable to parse ' + log + ' cert in pos:', i);
						formatted.invalid_certs.push(certs[i]);
					} else {
						formatted.b64_pems.push(fmt_cert(parsed.base_64_pem));
						formatted.serials.push(parsed.serial_number_hex);
					}
				}
			}
			return formatted;
		}

		function fmt_cert(cert) {
			try {
				cert = t.misc.decodeb64(cert).replace(/\r\n/g, '\n').replace(/\n/g, '\r\n').trim();			// remove extra white space and fmt the rest
			} catch (e) { }
			return t.misc.b64(cert);
		}
	};

	// -------------------------------------------
	// find the component id in a path
	// ex "/deployer/api/v2/instance/$iid/type/peer/component/org1peer-leveldb-dal10/test" -> "org1peer-leveldb-dal10"
	// -------------------------------------------
	exports.get_id_in_path = function (str_path) {
		const id_in_path = /\/component\/([^/]+)\/?/i.exec(str_path);
		if (id_in_path && id_in_path[1]) {
			return id_in_path[1];
		} else {
			return null;
		}
	};

	// ------------------------------------------
	// Batch sync - copy deployer's k8s values into athena component docs (only if the values differ)
	// ------------------------------------------
	/*
	opts: {
		deployer_data: {							// optional
			"comp_id": {deployer doc},				// each component is keyed by the "deployer_component_id"
		},
		athena_docs: [{athena doc}]					// optional
	}
	*/
	function batch_sync_deployer_attributes_with_couch(opts, cb) {
		const bulk_edit = { docs: [] };
		if (!opts) { opts = {}; }					// init
		if (typeof cb !== 'function') {
			cb = () => { };							// init an empty cb so we don't have to check
		}

		for (let i in opts.athena_docs) {			// iter on components
			const athena_doc = opts.athena_docs[i];
			const deployer_component_id = athena_doc ? athena_doc.dep_component_id : null;

			if (athena_doc && deployer_component_id && opts.deployer_data) {		// we need to have athena and deployer data
				const deployer_data = opts.deployer_data[deployer_component_id] ? opts.deployer_data[deployer_component_id] : null;
				const conformed_deployer_data = t.comp_fmt.conform_deployer_field_names(null, deployer_data);

				// pass in the deployer data, and the athena doc for this component
				let fmt = exports.deployer_has_a_different_value(athena_doc, conformed_deployer_data);
				if (fmt.differences.length > 0) {
					fmt.doc.last_k8s_sync_ts = Date.now();							// track when this update happened, helps user see stale data
					logger.debug('[deployer lib - sync] updating', fmt.differences.length, 'fields in component doc: "' + fmt.doc._id + '"', fmt.differences);
					bulk_edit.docs.push(t.misc.sortKeys(fmt.doc));	// do NOT run through format_input_to_doc, it might change case of the comps _id & duplicate
				}
			}
		}

		if (bulk_edit.docs.length === 0) {
			//logger.debug('[deployer lib - sync] component docs in req are up to date');		// debug log
			return cb(null, null);
		} else {
			t.couch_lib.bulkDatabase({ db_name: ev.DB_COMPONENTS, }, bulk_edit, (err_bulk, bulk_resp) => {
				if (err_bulk) {
					// this might happen if the athena doc was pulled from cache, and another instance wrote to the doc already...
					logger.warn('[deployer lib - sync] problem syncing deployment attributes in 1+ docs (this is okay if code is 409)', err_bulk);
					return cb(err_bulk);
				} else {
					logger.debug('[deployer lib - sync] successfully synced deployment attributes. number:', bulk_edit.docs.length);
					return cb(null, bulk_resp);
				}
			});
		}
	}

	// returns a component doc with deployer values overwriting athena's iff deployer had differences
	// else returns null
	exports.deployer_has_a_different_value = (athena_data, deployer_data) => {
		const fields2check = [
			'admin_certs', 'resources', 'storage', 'version', 'zone', 'state_db', 'region', 'dep_component_id',
			'ca_name', 'tlsca_name', 'api_url', 'grpcwp_url', 'operations_url', 'tls_cert', 'config_override',
			'node_ou', 'ecert', 'tls_ca_root_certs', 'ca_root_certs', 'crypto',
			// do not check admin_certs_parsed, or tls_cert_parsed b/c we don't want that stuff stored in the db
			// do not check cr_status, resource_warnings, we don't want to store a temporary status in the db
		];
		const differences = [];
		for (let i in fields2check) {
			const field = fields2check[i];
			if (deployer_data[field] || deployer_data[field] === false) {				// if deployer has a value... (cannot be false/null/undefined)
				if (t.misc.is_different(athena_data[field], deployer_data[field])) { 	// it's different
					differences.push(field);
					athena_data[field] = deployer_data[field];							// copy deployer's value over
				}
			}
		}

		return {
			doc: athena_data,
			differences: differences
		};
	};

	// ------------------------------------------
	// Deployer delete request
	// ------------------------------------------
	/*
		opts: {
			dep_component_id: string	// deployer component id
			type: string,				// component type
			component_id: string,		// athena component id (optional)
			req: {},					// request object from the api calling
			debug_tx_id: string,
			FORCE: boolean,				// [optional] - if true any error from deployer is ignored
			CLEAN_UP: boolean			// [optional] - if true record_deployer_operation() will not be called
		}
	*/
	function send_deployer_delete_request(opts, cb) {
		const parsed = {
			iid: (ev.CRN && ev.CRN.instance_id) ? ev.CRN.instance_id : 'iid-not-set',
			component_id: opts.component_id || opts.dep_component_id,												// use athena's id here, if it exists
			component_type: (opts.type && typeMapA2D[opts.type]) ? typeMapA2D[opts.type] : '?',						// translate athena spec to deployer here
			OPERATION: 'delete_component',
			debug_tx_id: opts.debug_tx_id,
		};
		logger.debug('[deployer lib]', opts.debug_tx_id, 'deprovisioning. iid:', parsed.iid, 'component_type:', parsed.component_type, 'id:',
			parsed.component_id, 'force', opts.FORCE);

		const options = {
			method: 'DELETE',
			baseUrl: t.misc.format_url(ev.DEPLOYER_URL),																		// url to deployer
			url: '/api/v3/instance/' + parsed.iid + '/type/' + parsed.component_type + '/component/' + opts.dep_component_id, 	// use deployer id
			headers: exports.copy_headers(opts.req.headers),
			timeout: ev.DEPLOYER_TIMEOUT,
			_tx_id: parsed.debug_tx_id,
		};

		send_dep_req(options, (err, depRespBody) => {
			let { fmt_err, fmt_ret } = handle_dep_response(parsed, err, depRespBody);
			if (fmt_err && opts.FORCE === true) {
				logger.debug('[deployer lib]', opts.debug_tx_id, 'deployer resp has error, but force is set. will force del component:', parsed.component_id);
				fmt_err = null;												// if we are forcing del, we don't care about deployer errors
			}
			if (fmt_err && fmt_err.statusCode === 404) {					// auto force-delete on a 404 code
				logger.debug('[deployer lib]', opts.debug_tx_id, '404 deployer response to delete, will force delete component:', parsed.component_id);
				fmt_err = null;
			}
			if (!depRespBody) {
				depRespBody = {};											// init a blank response so next section can get through it
			}

			if (fmt_err) {
				// error is already logged
				return cb(fmt_err, fmt_ret);
			} else {
				// cache is stale so remove the deployer get-all-components and similar response from the cache
				t.caches.broadcast_evict_event(ev.STR.EVENT_COMP_DEL, { _id: opts.component_id });

				if (opts.CLEAN_UP === true) {
					logger.debug('[deployer lib]', opts.debug_tx_id, 'deployer clean up operation is complete');
					return cb(null);
				} else {
					exports.record_deployer_operation(options, opts.req, depRespBody, parsed, (athenaError, athenaResponse) => {
						if (athenaError) {																// if athena has error don't send deployer response
							logger.error('[deployer lib]', opts.debug_tx_id, 'athena had an error offboarding/deprovisioning ' +
								'the component', athenaError);
							return cb(athenaError, null);												// athena had an error
						} else {
							return cb(null, athenaResponse);
						}
					});
				}
			}
		});
	}

	// ------------------------------------------
	// Undo a deployer component creation by deleting it - typically we do this if deployer created a component w/errors or athena could not import it
	// ------------------------------------------
	function clean_up_deployer_component(req2athena, dep_resp_body, cb) {
		let dep_component_arr = [];
		const copy_dep_resp_body = JSON.parse(JSON.stringify(dep_resp_body));
		if (Array.isArray(copy_dep_resp_body)) {							// if already was an array, copy it as is
			dep_component_arr = copy_dep_resp_body;							// deployer response will be an array if we built a raft cluster, else object
		} else {
			dep_component_arr = [copy_dep_resp_body];						// if it is not an array, conform it to an array of one
		}
		logger.warn('[deployer lib] CLEAN UP - deployer create fail or athena import failure. deleting components:', dep_component_arr.length);

		t.async.eachLimit(dep_component_arr, 1, (dep_component, cb_deprovision) => {	// one at a time is easier to debug
			// if the deployer's "response" dne OR is an error object, set null
			let id = (!dep_component || dep_component instanceof Error) ? null : dep_component.name;
			if (!id) {														// if id from deployer response is unknown pull id from athena request
				id = req2athena._dep_component_id;
			}
			if (!id) {
				logger.error('[deployer lib] CLEAN UP - unable to clean up b/c cannot find id for comp in resp:', id, dep_component);
				logger.error('[deployer lib] CLEAN UP - orig deployer resp:', typeof dep_resp_body, dep_resp_body);
				return cb_deprovision();
			} else {
				logger.warn('[deployer lib] CLEAN UP - deployer create fail or athena import failure. deleting component on deployer:', id);
				const opts = {
					dep_component_id: id,									// deployer component id
					type: t.component_lib.find_type(req2athena),			// component type
					req: req2athena,
					debug_tx_id: t.ot_misc.buildTxId(req2athena),
					CLEAN_UP: true
				};
				send_deployer_delete_request(opts, () => {
					return cb_deprovision();
				});
			}
		}, () => {
			// we don't care about errors or successes
			return cb();
		});
	}

	// ------------------------------------------
	// get supported fabric versions from deployer
	// ------------------------------------------
	/*
	req: {
		query: {
			cache: 'skip'
		}
		headers: {}				// optional - forwarded to deployer
	}
	*/
	exports.get_fabric_versions = (req, cb) => {
		if (!req) { req = { params: {} }; }
		const SKIP_CACHE = t.ot_misc.skip_cache(req);
		req._key_src = ev.STR.GET_FAB_VERSIONS_KEY;									// this builds the lookup key for the cache
		req._key = t.misc.hash_str(req._key_src);									// this is the lookup key in the cache

		if (SKIP_CACHE === false && ev.PROXY_CACHE_ENABLED === true) {				// check the cache first
			const hit = t.proxy_cache.get(req._key);
			if (hit && hit.resp && hit.key_src === req._key_src) {					// protect from hash collision
				hit.resp._cached = true;
				logger.debug('[deployer lib] using cached value for the deployer api: get fabric versions', hit.resp._cache_expires_in);
				return cb(hit.error, hit.resp);
			}
		}
		get_fabric_versions_api((error, response) => {
			return cb(error, response);
		});

		function get_fabric_versions_api(lc_cb) {
			const parsed = {
				iid: (ev.CRN && ev.CRN.instance_id) ? ev.CRN.instance_id : 'iid-not-set',
				debug_tx_id: t.ot_misc.buildTxId(req),
			};
			const opts = {
				method: 'GET',
				baseUrl: t.misc.format_url(ev.DEPLOYER_URL),							// url to deployer
				url: '/api/v3/instance/' + parsed.iid + '/type/all/versions',
				headers: req ? exports.copy_headers(req.headers) : {},
				timeout: ev.DEPLOYER_TIMEOUT,
				_tx_id: parsed.debug_tx_id,
			};
			logger.debug('[deployer lib]', parsed.debug_tx_id, ' sending deployer api w/route:', opts.url);
			/*return lc_cb(null, {
				versions: {
					peer: {
						'2.4.3': {
							default: true,
							version: '2.4.3'
						},
						'1.4.12-11': {
							default: false,
							version: '1.4.12-11'
						}
					},
					orderer: {
						'2.4.3': {
							default: true,
							version: '2.4.3'
						},
						'1.4.12-11': {
							default: false,
							version: '1.4.12-11'
						}
					}
				}
			});*/
			send_dep_req(opts, (err, depRespBody) => {									// then get deployer's docs
				let { fmt_err, fmt_ret } = handle_dep_response(parsed, err, depRespBody);
				if (fmt_err === null && fmt_ret && ev.PROXY_CACHE_ENABLED === true) {	// only cache success responses
					const data2cache = {
						error: fmt_err,
						resp: fmt_ret,													// fmt_ret is an object
						key_src: req._key_src,											// remember the orig key data to protect from hash collisions
						cached_ts: Date.now(),
					};
					t.proxy_cache.set(req._key, data2cache, 1 * 60 * 60);				// expiration is in sec
				}

				return lc_cb(fmt_required_data_err(req, fmt_err), fmt_ret);
			});
		}
	};

	// ------------------------------------------
	// submit deployer action on a component (like restart and reenroll and enroll)
	// ------------------------------------------
	/*
	req: {
		headers: {},				// optional - forwarded to deployer
		session: {},				// needed to get email address
		body: { <action see doc> },
		params: {
			athena_component_id: "",
			debug_tx_id: ""			// optional
		}
	}
	*/
	exports.send_actions = function (req, cb) {
		const debug_tx_id = t.ot_misc.buildTxId(req);
		req.params.debug_tx_id = debug_tx_id;
		const iid = (ev.CRN && ev.CRN.instance_id) ? ev.CRN.instance_id : 'iid-not-set';
		const comp_type = t.component_lib.find_type(req);

		// ----- Get doc to get deployer component id ----- //
		const get_opts = {
			req: req,
			id: req.params.athena_component_id,
			skip_cache: t.ot_misc.skip_cache(req),
			log_msg: 'get component',
		};
		t.component_lib.load_component_by_id(get_opts, (err, doc) => {
			if (err || !doc) {
				logger.error('[deployer lib]', debug_tx_id, 'unable to get component data from deployer [2]:', err);
				return cb(err, null);
			} else {
				const dep_body_str = t.comp_fmt.build_action_body_str(req.body);
				const summary = build_actions(dep_body_str);

				// build a notification doc
				const notice = {
					message: 'sending actions: ' + JSON.stringify(summary) + ' to component',
					component_id: doc._id,
					component_type: doc.type || null,
					component_display_name: doc.display_name || null,
				};
				t.notifications.procrastinate(req, notice);

				const opts = {
					method: 'PATCH',
					baseUrl: t.misc.format_url(ev.DEPLOYER_URL),								// url to deployer
					url: '/api/v3/instance/' + iid + '/type/' + typeMapA2D[comp_type] + '/component/' + doc.dep_component_id + '/actions',
					body: dep_body_str,
					headers: exports.copy_headers(req.headers),
					timeout: ev.DEPLOYER_TIMEOUT,
					_tx_id: debug_tx_id,
				};
				logger.debug('[deployer lib]', debug_tx_id, 'sending action to component w/ deployer route:', opts.url);
				send_dep_req(opts, (err, depRespBody) => {
					const { fmt_err, fmt_ret } = handle_dep_response({ debug_tx_id: debug_tx_id }, err, depRespBody);
					if (fmt_err) {
						return cb(fmt_err, fmt_ret);											// error already logged
					} else {
						logger.debug('[deployer lib]', debug_tx_id, 'submitted action successfully. component:', doc._id);
						const ret = {
							message: 'accepted',
							id: doc._id,
							actions: summary,
							//response: fmt_ret,
						};
						return cb(null, ret);
					}
				});
			}
		});

		// build an array of actions that were called by parsing the body we sent to deployer
		function build_actions(body_str) {
			const actions = [];
			let body = {};
			try {
				body = JSON.parse(body_str);
			} catch (e) { }

			if (body && body.actions) {
				for (let root_key in body.actions) {
					if (typeof body.actions[root_key] === 'object') {
						const inner_keys = Object.keys(body.actions[root_key]);		// only going 1 layer deep b/c thats all we expect, see api docs
						for (let i in inner_keys) {
							actions.push(root_key + '.' + inner_keys[i]);
						}
					} else {
						actions.push(root_key);
					}
				}
			}
			return actions;
		}
	};

	// send a restart action api for the same component in api to athena
	/* Removed b/c of issue 4841
	function auto_restart(req2athena, cb_action) {
		if (!req2athena) {
			logger.error('[deployer lib] problem with the code... auto restart wasn\'t passed a request.');	// should not happen, comp to restart is not known!
			return cb_action();
		} else {
			const debug_tx_id = t.ot_misc.buildTxId(req2athena);
			logger.debug('[deployer lib]', debug_tx_id, 'sending restart api to restart this component.');
			req2athena.body = {														// overwrite body
				restart: true
			};
			exports.send_actions(req2athena, (err) => {
				logger.debug('[deployer lib]', debug_tx_id, 'auto restart job was submitted and api returned');
				if (err) {
					logger.error('[deployer lib]', debug_tx_id, 'auto restart responded with an error:', err);
				}
				return cb_action();
			});
		}
	}*/

	return exports;
};
