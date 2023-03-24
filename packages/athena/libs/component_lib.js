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
// component_lib.js - Node processing/managing functions
//------------------------------------------------------------

module.exports = function (logger, ev, t) {
	const exports = {};

	// dsh todo split this into a init_default_doc_fields and legacy builder

	// format an incoming component body
	exports.format_input_to_doc = (component_obj, taken_doc_ids_arr) => {
		const regex_name = new RegExp(/[<>`]/g);

		if (component_obj) {
			const component_doc = JSON.parse(JSON.stringify(component_obj));			// deep copy just b/c
			if (component_doc.location) {
				component_doc.location = component_doc.location.replace(regex_name, '');	// safer
			}

			// ---------- build display_name & id ---------- //
			component_doc.display_name = component_doc.display_name || component_doc.name || component_doc.short_name;
			if (component_doc.display_name) {
				component_doc.display_name = component_doc.display_name.replace(regex_name, '');
			}
			if (component_doc.id) {
				component_doc._id = component_doc.id;			// do not edit or generate the id if provided - ansible needs this, UI won't use it
				delete component_doc.id;
			} else {
				// 07/17/2019 - took out ability to build id from "short_name", if backend has full control then apis and ui build comp ids consistently
				component_doc._id = exports.build_id({
					id_str: component_doc.dep_component_id || component_doc.display_name, // prefer deployer component id so that they match
					taken_ids: taken_doc_ids_arr
				});
			}
			logger.debug('[component lib] settling on athena id for component:', component_doc._id);

			// ---------- other legacy builders ---------- //
			component_doc.type = exports.get_type_from_doc(component_doc);				// build type from legacy field
			component_doc.tls_cert = t.misc.safe_dot_nav(component_doc, [
				'component_doc.msp.component.tls_cert',									// v3
				'component_doc.tls_cert',												// v2/internal
				'component_doc.pem'														// legacy
			]) || undefined;
			delete component_doc.pem;													// pem is legacy field, use tls_cert

			// map the msp section to the internal field names
			if (component_doc.type !== ev.STR.MSP) {				// msp's do not get any extra formatting
				component_doc.ca_root_certs = t.misc.safe_dot_nav(component_doc, [
					'component_doc.msp.ca.root_certs',										// v3
					'component_doc.ca_root_certs',											// internal
				]) || undefined;
				component_doc.tls_ca_root_certs = t.misc.forced_array(t.misc.safe_dot_nav(component_doc, [
					'component_doc.msp.tlsca.root_certs',									// v3
					'component_doc.tls_ca_root_cert',										// v2
					'component_doc.tls_ca_root_certs',										// internal
				])) || undefined;
				component_doc.ecert = t.misc.safe_dot_nav(component_doc, [
					'component_doc.msp.component.ecert',									// v3
					'component_doc.ecert.cert',												// v2 deployer
					'component_doc.ecert',													// internal
				]) || undefined;
				component_doc.admin_certs = t.misc.safe_dot_nav(component_doc, [
					'component_doc.msp.component.admin_certs',								// v3
					'component_doc.admin_certs'												// v2/internal
				]) || undefined;
				delete component_doc.tls_ca_root_cert;										// remove old v2 singular version

				component_doc.tlsca_name = t.misc.safe_dot_nav(component_doc, [
					'component_doc.msp.tlsca.name',											// v3
					'component_doc.tlsca_name'												// v2/internal
				]) || undefined;
				component_doc.ca_name = t.misc.safe_dot_nav(component_doc, [
					'component_doc.msp.ca.name',											// v3
					'component_doc.ca_name'													// v2/internal
				]) || undefined;

				component_doc.intermediate_certs = t.misc.safe_dot_nav(component_doc, [
					'component_doc.msp.intermediate_ca.root_certs',							// v3
					'component_doc.intermediate_certs',										// internal
				]) || undefined;
				component_doc.tls_intermediate_certs = t.misc.safe_dot_nav(component_doc, [
					'component_doc.msp.intermediate_tlsca.root_certs',						// v3
					'component_doc.tls_intermediate_certs',									// internal
				]) || undefined;
			}

			component_doc.config_override = component_doc.config_override || component_doc.configoverride;
			delete component_doc.configoverride;										// configoverride is legacy field, use config_override

			if (!component_doc.tags || !Array.isArray(component_doc.tags)) {			// if did not provide tags, init
				component_doc.tags = [];
			}
			component_doc.scheme_version = component_doc.scheme_version || 'v1';		// use version sent if available, else use v1
			if (!component_doc.timestamp) {
				component_doc.timestamp = Date.now();									// add timestamp if its not there already (think edit)
			}

			delete component_doc.node_type;			// remove legacy field from db doc, less confusing, i hope
			delete component_doc.name;				// remove legacy field from db doc, less confusing, i hope
			delete component_doc.short_name;		// remove legacy field from db doc, less confusing, i hope
			delete component_doc.node_id;			// remove legacy field from db doc, less confusing, i hope

			// ---------------------------------------------------------
			// ---------- now do things specific to each type ----------
			// ---------------------------------------------------------
			if (component_doc.type === ev.STR.CA) {
				component_doc.api_url = component_doc.api_url || component_doc.ca_url || component_doc.url;	// ca_url and url are legacy
				component_doc.tags.push(ev.STR.CA);
			} else if (component_doc.type === ev.STR.PEER) {								// future stub for peers
				component_doc.grpcwp_url = component_doc.grpcwp_url || component_doc.url;	// url is legacy
				component_doc.tags.push(ev.STR.PEER);

			} else if (component_doc.type === ev.STR.ORDERER) { 							// future stub for orderers
				if (component_doc.cluster_name) {											// if its a raft cluster, format cluster_name
					component_doc.cluster_name = component_doc.cluster_name.replace(regex_name, '');
				}
				if (!component_doc.cluster_name) {											// default name
					component_doc.cluster_name = 'My OS';
				}
				if (component_doc.cluster_id) {
					// cannot add any randomness to cluster_id, b/c each raft doc's cluster_id needs to be the same value
					component_doc.cluster_id = exports.build_id({ id_str: component_doc.cluster_id });	// cluster ids can be re-used (like a new raft node)
				}
				component_doc.grpcwp_url = component_doc.grpcwp_url || component_doc.url;	// url is legacy
				component_doc.tags.push(ev.STR.ORDERER);
				component_doc.consenter_proposal_fin = (component_doc.consenter_proposal_fin === false) ? false : true;	// legacy docs should be `true`
				if (component_doc.system_channel_id) {		// if it exists, copy, if not skip or else will trigger needless multi edit for raft
					component_doc.system_channel_id = (typeof component_doc.system_channel_id === 'string') ?
						component_doc.system_channel_id : ev.SYSTEM_CHANNEL_ID;
				}
			} else if (component_doc.type === ev.STR.MSP || component_doc.type === ev.STR.MSP_EXTERNAL) {
				component_doc.tags.push(component_doc.type);
				if (!component_doc.admins) { component_doc.admins = []; }					// init if dne
				if (!component_doc.tls_root_certs) { component_doc.tls_root_certs = []; }	// init if dne
			}
			component_doc.tags = exports.fmt_tags(component_doc.tags);						// format tags, remove duplicates

			// make safer inputs (the ui displays these)
			if (component_doc.api_url) { component_doc.api_url = t.misc.safe_url(component_doc.api_url); }
			if (component_doc.operations_url) { component_doc.operations_url = t.misc.safe_url(component_doc.operations_url); }
			if (component_doc.grpcwp_url) { component_doc.grpcwp_url = t.misc.safe_url(component_doc.grpcwp_url); }
			if (component_doc.osnadmin_url) { component_doc.osnadmin_url = t.misc.safe_url(component_doc.osnadmin_url); }

			delete component_doc.url;			// remove legacy field from db doc, less confusing, i hope
			delete component_doc.ca_url;		// remove legacy field from db doc, less confusing, i hope
			delete component_doc.msp;			// remove external field name

			// delete fields that apollo should not be sending (seems to happen during edit component)
			delete component_doc.url2use;
			delete component_doc.upgradable_versions;
			delete component_doc.isUpgradeAvailable;
			delete component_doc.backend_addr;

			// delete deployer response fields that we should not store in db
			delete component_doc.resource_warnings; 	// transient info do not store
			delete component_doc.cr_status;				// transient info do not store
			delete component_doc.crstatus;				// transient info do not store

			return component_doc;
		}
		return null;
	};

	// get the component type from the url/path or request body
	exports.find_type = function (req) {
		const matches = /components\/([^/]*)/g.exec(req.path);					// see if component type is in the url
		if (matches && matches[1]) {
			const type = exports.fmt_type(matches[1]);
			if (type) {
				logger.debug('[pre-flight] detected component type in url.', matches[1], 'setting type in body:', type);
				return type;													// set the type, ie 'fabric-peer'
			}
		}
		if (req && req._component_doc) {
			const doc_type = exports.get_type_from_doc(req._component_doc);		// else try doc in requests for type
			if (doc_type) {
				return doc_type;
			}
		}
		if (req && req.body) {
			return exports.get_type_from_doc(req.body);							// else use type field in body (legacy)
		}
		return null;															// else give up
	};

	// get component type from doc (including legacy name)
	exports.get_type_from_doc = (doc) => {
		const type = doc ? (doc.type || doc.node_type) : null;	// build type from legacy field node_type
		return exports.fmt_type(type);
	};

	// get component type (including legacy name)
	exports.fmt_type = (type) => {
		if (!type || typeof type !== 'string') {
			return null;
		}
		const uc_type = type.toUpperCase();						// convert type to all caps so it can match ev.STR keys
		if (!ev.STR[uc_type]) {
			return null;
		} else {
			return ev.STR[uc_type];								// set the type, ie 'fabric-peer'
		}
	};

	// build a unique id to athena, increment if we have to
	/*
		opts: {
			id_str: "desired id here",			// the initial desired id
			taken_ids: ["taken id here"],		// [optional] array of taken ids
			safe_prefix: "ibp",					// [optional] if id does not start with a number, add this prefix, defaults to "c"
			limit: 32,							// [optional] max length of a valid id
		}
	*/
	exports.build_id = (opts) => {
		const regex_id = new RegExp(/[^a-zA-Z0-9-_]/g);									// no symbols or white space, the field gets used in url
		const regex_letter = new RegExp(/[a-zA-Z]/);
		const prefix = opts.safe_prefix ? opts.safe_prefix : 'c';						// why not a c chris
		const MAX_ID_LENGTH = Number(opts.limit) || ev.MAX_SHORT_NAME_LENGTH;

		if (!opts.id_str || typeof opts.id_str !== 'string') {
			opts.id_str = 'id1' + t.misc.simpleRandomString(ev.MIN_SHORT_NAME_LENGTH); 			// init field
			logger.warn('[comp lib] a random id is being created b/c its empty:', opts.id_str);
		}

		opts.id_str = opts.id_str.replace(regex_id, '').toLowerCase();					// remove invalid characters
		if (!opts.id_str || opts.id_str.length === 0) {									// check if we removed all characters!
			opts.id_str = 'id2' + t.misc.simpleRandomString(ev.MIN_SHORT_NAME_LENGTH).toLowerCase(); // re-init
			logger.warn('[comp lib] a random id is being created b/c its empty:', opts.id_str);
		}
		if (!regex_letter.test(opts.id_str[0])) {										// first char must be a letter
			opts.id_str = prefix + opts.id_str;											// add the safer prefix
		}
		if (opts.id_str.length > MAX_ID_LENGTH) {										// field is too long, truncate it, prevent long/slow indexes
			opts.id_str = opts.id_str.substring(0, MAX_ID_LENGTH);
		}

		if (opts.taken_ids) {															// is this id taken? [skip if editing doc, b/c taken_ids will be empty]
			opts.id_str = build_unique_id(opts);
		}
		if (opts.id_str.length > MAX_ID_LENGTH) {										// if its still too long, screw it, delete and have couch handle it
			opts.id_str = null;															// if missing couch db will pick a valid doc id
		}

		return opts.id_str;

		// recursively build a unique id
		function build_unique_id(options) {
			options._iter = options._iter ? ++options._iter : 1;
			if (options._iter >= 1000) {												// monitor loop count, all stop after excessive loops
				logger.warn('[component lib] yikes, recursive loop exceeded trying to build unique id:', options.id_str, options._iter);
				return null;
			}

			if (Array.isArray(options.taken_ids) && options.taken_ids.includes(options.id_str)) {		// is this id taken?
				const regex_last_numb = RegExp(/(\d*)$/);								// find the last number in a string
				const matches = options.id_str.match(regex_last_numb);
				const last_number = (matches && matches[1]) ? Number(matches[1]) : null;

				if (last_number === null) {												// no suffix delim... but we found a number, increment last pos by 1
					options.id_str += '_0';
					logger.warn('[component lib] id is already taken, appending id suffix:', options.id_str);
				} else {
					options.id_str = options.id_str.replace(regex_last_numb, Number(last_number) + 1);
					logger.warn('[component lib] id is already taken, incrementing id suffix:', options.id_str);
				}
				return build_unique_id(options);										// repeat, check if its still taken...
			}

			return options.id_str;
		}
	};

	//--------------------------------------------------
	// validate the input data + build the component doc
	//--------------------------------------------------
	exports.buildDoc = (opts, cb) => {
		let fmt_component_obj = null;

		exports.getAllIds((_, taken_ids) => {
			if (taken_ids.comp_ids.length > ev.MAX_COMPONENTS) {
				logger.error('[component lib] component limit reached. the component count is too damn high', taken_ids.comp_ids.length);
				return cb({ statusCode: 400, msg: ['total component limit reached. delete a component to make space for this one.'] }, null);
			}

			if (opts && opts.body) {
				fmt_component_obj = exports.format_input_to_doc(opts.body, taken_ids.doc_ids);
			}
			if (!fmt_component_obj || !fmt_component_obj.type) {
				const type = fmt_component_obj ? fmt_component_obj.type : 'undefined';
				logger.error('[component lib] invalid component type or missing component data in body. type:', type, fmt_component_obj);
				return cb({ statusCode: 400, msg: ['invalid component type or missing component data in body. type: ' + type] }, null);
			} else {
				return cb(null, t.misc.sortKeys(fmt_component_obj));
			}
		});
	};

	// validate other fields in the body - ones we can't perform with validate properties()
	exports.other_validation = (errorObj, fmt_body) => {
		const errors = [];
		if (fmt_body && fmt_body.msp_id) {
			if (/[^a-zA-Z\d-.]/g.test(fmt_body.msp_id)) {
				errors.push('The field "msp_id" can only contain alphanumerics characters, dashes, and dots.');
			}

			if (fmt_body && fmt_body.msp_id && fmt_body.msp_id.length > 250) {
				errors.push('The field "msp_id" must be shorter than 250 characters.');
			}

			if (fmt_body && fmt_body.msp_id && (fmt_body.msp_id === '.' || fmt_body.msp_id === '..')) {
				errors.push('The field "msp_id" cannot be "." or "..".');
			}
		}

		errorObj = t.misc.merge_other_input_errors(errorObj, errors);
		return errorObj;
	};

	//--------------------------------------------------
	// get all taken doc ids (including non-component docs)
	//--------------------------------------------------
	exports.getAllIds = (cb) => {
		logger.debug('[component lib] getting all ids from db and deployer...');
		t.async.parallel([

			// ---- Get athena doc ids ---- //
			(join) => {
				const view_opts = {
					db_name: ev.DB_COMPONENTS,
					_id: '_design/athena-v1',
					view: 'all_ids',
					SKIP_CACHE: true,				// must skip cache when provisioning a raft cluster, each node gets added back 2 back
					query: t.misc.formatObjAsQueryParams({ group: true }),
				};
				t.otcc.getDesignDocView(view_opts, (err_getDoc, resp) => {
					if (err_getDoc || !resp) {
						logger.error('[component lib] unable to load existing component ids:', err_getDoc, resp);
					}
					join(null, resp);
				});
			},

			// ---- Get deployer IDs ---- //
			(join) => {
				t.deployer.get_all_components_api(null, (err_dep_docs, dep_docs) => {		// get all ids from deployer so we can make a unique id
					if (!dep_docs) {
						logger.warn('[component lib] unable to load existing deployer component ids:', err_dep_docs, dep_docs);
						join(null, []);
					} else {
						if (Array.isArray(dep_docs)) {				// latest deployers use array, component ids are in each object
							join(null, dep_docs);
						} else {
							let ret = [];
							if (dep_docs) {
								const tmp = Object.keys(dep_docs);	// past deployers used an object, the keys are component ids
								for (let i in tmp) {
									ret[i] = { name: tmp[i] };		// rebuild response as an array of objects with name field
								}
							}
							join(null, ret);
						}
					}
				});
			},

			// ---- Get athena *component* ids ---- // (no msps, no cluster ids, no sig collections)
			(join) => {
				const opts = {
					db_name: ev.DB_COMPONENTS,		// db for peers/cas/orderers/msps/etc docs
					_id: '_design/athena-v1',		// name of design doc
					view: '_doc_types',
					SKIP_CACHE: true,
					query: t.misc.formatObjAsQueryParams({ keys: [ev.STR.CA, ev.STR.ORDERER, ev.STR.PEER] }),
				};

				t.otcc.getDesignDocView(opts, (err, resp) => {
					if (err) {
						logger.error('[component lib] error getting all deployed components:', err);
						join(null, []);
					} else {
						const ids = [];
						if (resp && resp.rows) {
							for (let i in resp.rows) {
								if (resp.rows[i] && resp.rows[i].key) {
									ids.push(resp.rows[i].key);
								}
							}
						}
						join(null, ids);
					}
				});
			},

		], (_, results) => {
			const ret = { cluster_ids: [], doc_ids: [], deployer_ids: [], comp_ids: [] };
			const athena_resp = results[0];
			const deployer_resp = results[1];
			const athena_comp_ids = results[2];
			if (athena_resp && athena_resp.rows) {
				for (let i in athena_resp.rows) {
					if (athena_resp.rows[i] && athena_resp.rows[i].key) {
						if (athena_resp.rows[i].key[0] === 'cluster_id') {
							ret.cluster_ids.push(athena_resp.rows[i].key[1]);		// the value of the cluster id is in the 2nd position
						} else if (athena_resp.rows[i].key[0] === 'doc_id') {
							ret.doc_ids.push(athena_resp.rows[i].key[1]);			// the value of the doc id is in the 2nd position
						}
					}
				}
			}

			if (deployer_resp && Array.isArray(deployer_resp)) {
				for (let i in deployer_resp) {
					if (deployer_resp[i] && deployer_resp[i].name) {
						ret.deployer_ids.push(deployer_resp[i].name);
					}
				}
			}

			ret.comp_ids = athena_comp_ids;		// only includes cas, peers, orderers (excludes msps, OS clusters)

			return cb(null, ret);
		});
	};

	//--------------------------------------------------
	// Add the address of the actual component, get it from the grpc web proxy (grpcwp)
	//--------------------------------------------------
	/* 01/09/2020 - dsh removed
	- legacy function
	- "api_url" is now required during component onboarding
	- legacy field "backend_addr" will be populated with "api_url"'s value

	exports.addBackendAddressesToNodes = (docs, cb) => {
		const errs = [];
		const ret = [];
		t.async.eachLimit(docs, 16, (doc, cb_request) => {
			if (!doc) {
				return cb_request();
			} else if (doc.type !== ev.STR.PEER && doc.type !== ev.STR.ORDERER) {	// wrong type of node (only care about peers and orderers)
				ret.push(doc);
				return cb_request();
			} else if (doc.api_url) {												// if we already have it in doc, no need to ask grpcwp
				doc.backend_addr = doc.api_url;
				ret.push(doc);
				return cb_request();
			} else {																// we need to look it up, ask the grpcwp
				const options = {
					method: 'GET',
					url: doc.grpcwp_url + '/settings',
					headers: {
						'Accept': 'application/json'
					},
					timeout: ev.BACKEND_ADDRESS_TIMEOUT_MS								// give up quickly, proxies are fast if up
				};
				return t.request(options, (err_settings, resp_settings) => {
					doc.backend_addr = null;															// init
					if (err_settings || t.ot_misc.is_error_code(t.ot_misc.get_code(resp_settings))) {	// if error leave the property as null and keep going
						logger.error('could not get backend address from grpc web proxy:', doc.grpcwp_url);
						errs.push(err_settings);
						ret.push(t.misc.sortKeys(doc));
						return cb_request();
					} else {
						if (resp_settings && resp_settings.body) {
							if (typeof resp_settings.body === 'string') {								// parse it if we need to
								try {
									resp_settings.body = JSON.parse(resp_settings.body);
								} catch (e) { }
							}
							doc.backend_addr = resp_settings.body.external_addr || resp_settings.body.backend_addr;
						}
						ret.push(t.misc.sortKeys(doc));
						return cb_request();
					}
				});
			}
		}, () => {
			if (errs.length > 0) {					// print any errors here
				for (const err of errs) {
					logger.error(`problem getting the grpcwp backend address - ${err}`);
				}
				return cb(errs, ret);
			}
			return cb(null, ret);
		});
	};*/

	//-------------------------------------------------------------------------
	// Bulk add components to the database - returns filtered docs to callback
	//-------------------------------------------------------------------------
	/*
	 *  req: {}  // request object
	*/
	exports.add_bulk_components = (req, add_bulk_cb) => {
		logger.info('[component lib] attempting to add bulk components');
		const components = JSON.parse(JSON.stringify(req.body));
		const errs = [];
		const ret_objects = [];
		t.async.eachLimit(components, 1, (component, onboard_cb) => {	// 1 at a time avoids white list 409s, and doc._id 409s (this is a must for raft)
			req.body = component;
			req.attempt = 0;											// reset b/c will call this more than once, each component gets x attempts
			req._fmt_response = true;
			t.component_lib.onboard_component(req, (err, ret) => {
				if (err) {
					logger.error('[component lib] problem adding component', err);
					errs.push(err);
					return onboard_cb();
				} else {
					ret_objects.push(ret);
					return onboard_cb();
				}
			});
		}, () => {
			return add_bulk_cb(errs, ret_objects);
		});
	};

	//--------------------------------------------------
	// Add this component to the database - returns filtered doc to callback
	//--------------------------------------------------
	/*
	 *  req: {							  // request object
			attempt: 0,
			_fmt_response: true || false
		}
	*/
	exports.onboard_component = function (req, cb) {
		if (!req.attempt) { req.attempt = 0; }
		req.attempt++;
		logger.info('[component lib] attempting to add a component. attempt', req.attempt);

		// collect the entire request body and the short name to send to the post builder function
		const options = {
			session_user_id: t.middleware.getUuid(req),					// the UUID of the current user
			session_email: t.middleware.getEmail(req),
			body: req.body,
			req: req,
		};

		// build the post body
		exports.buildDoc(options, (errs, comp_doc) => {
			if (errs) {
				let msg = errs.msg ? errs.msg : errs;
				if (Array.isArray(errs)) {
					msg = '';
					for (const err in errs) {
						msg += errs[err] && errs[err].msg ? errs[err].msg : errs[err];
						logger.error('[component lib] could not build doc for component', errs[err]);
					}
				}
				return cb({ statusCode: 500, msg: msg }, null);
			} else {
				// get the doc ready to write
				logger.debug('[component lib] creating the component in database DB_COMPONENTS', comp_doc._id);
				const wr_opts = {
					db_name: ev.DB_COMPONENTS,
				};

				// build a notification doc
				const notice = {
					message: 'adding a new ' + comp_doc.type + ': ' + (comp_doc.display_name || comp_doc._id),
					component_id: comp_doc._id,
					component_type: comp_doc.type || null,
					component_display_name: comp_doc.display_name || null,
				};
				t.notifications.procrastinate(req, notice);

				// actually write the component to the database
				t.otcc.createNewDoc(wr_opts, comp_doc, (err_createNewDoc, resp_createNewDoc) => {
					if (err_createNewDoc || !resp_createNewDoc) {
						const code = t.ot_misc.get_code(err_createNewDoc);
						logger.error('[component lib] error creating component doc:', code, err_createNewDoc);
						if (code === 409 || code === 400) {
							if (req.attempt > 3) {
								logger.error('[component lib] ' + code + ' writing component doc, out of attempts, giving up.', req.attempt);
								if (code === 409) {
									return cb({ statusCode: code, msg: 'unable to onboard component b/c of id conflict. use a different component id.' });
								} else {
									return cb({ statusCode: code, msg: 'unable to onboard component. all retries failed.' });
								}
							} else {
								req.body._id = comp_doc._id + t.misc.simpleRandomString(2);			// make a more unique id to use
								logger.warn('[component lib] ' + code + ' writing component doc, trying again with different doc id. new:', req.body._id,
									req.attempt);
								return exports.onboard_component(req, cb);							// try again
							}
						} else {
							return cb({ statusCode: 500, msg: (err_createNewDoc && err_createNewDoc.msg) ? err_createNewDoc.msg : null }, null);
						}
					} else {
						// cache is stale so remove the deployer get-all-components and similar response from the cache
						t.caches.broadcast_evict_event(ev.STR.EVENT_COMP_ADD);

						exports.rebuildWhiteList(req, () => {				// add the new component to the white list
							logger.info('[component lib] adding component - success');
							req.attempt = 0;								// reset
							const ret = (req._fmt_response === true) ? t.comp_fmt.fmt_component_resp(req, resp_createNewDoc) : resp_createNewDoc;
							return cb(null, t.misc.sortItOut(ret));
						});
					}
				});
			}
		});
	};

	//--------------------------------------------------
	// Edit this component and then write back to the database - it is not possible for the client to delete fields in the doc, can make it null
	//--------------------------------------------------
	/*
	 * req: {}  // request object
	*/
	exports.edit_component = (req, cb) => {
		const prevent_edit_keys = ['type', 'cluster_id', '_id', '_rev', 'id', 'timestamp', 'edited_timestamp'];
		const prevent_null_val_keys = [
			'display_name', 'version', 'storage', 'resources', 'state_db', 'tags', 'region', 'zone', 'arch',
			'replicas', 'resource_warnings', 'config_override',
			'tls_cert', 'ca_root_certs', 'tls_ca_root_certs', 'ecert', 'admin_certs', 'tlsca_name', 'ca_name'
		];
		const keys_for_multi_raft_node_edit = ['cluster_name', 'system_channel_id', 'system_channel_data'];
		const edits = [];

		const get_opts = {
			db_name: ev.DB_COMPONENTS,
			_id: req.params.id,
			SKIP_CACHE: true
		};
		t.otcc.getDoc(get_opts, (err_getDoc, resp_getDoc) => {
			if (err_getDoc) {
				logger.error('[edit comp] unable to get comp doc to edit', err_getDoc);
				return cb(err_getDoc);
			}
			logger.info(`[edit comp] successfully got the component doc ${get_opts._id}`);

			// order of name is tricky, brian IS setting display_name but its wrong (its not he name the user entered)
			if (req.body.name || req.body.display_name || req.body.short_name) {
				req.body.display_name = req.body.name || req.body.display_name || req.body.short_name;
			}
			for (let i in prevent_null_val_keys) {							// do not edit field if it's value is missing/null/undefined
				const key = prevent_null_val_keys[i];						// need "replicas" field to allow value of 0, so can't use falsy check
				if (req.body[key] === null || req.body[key] === '' || typeof req.body[key] === 'undefined') {
					delete req.body[key];
				}
			}
			for (let i in prevent_edit_keys) {								// lets not let them change some fields (redundant v2 apis & validator, 01/27/2020)
				const key = prevent_edit_keys[i];
				delete req.body[key];
			}
			for (let key in req.body) {
				if (t.misc.is_different(resp_getDoc[key], req.body[key])) { // log the differences for debugging
					edits.push(t.misc.safe_str(key));
				}
				resp_getDoc[key] = req.body[key];							// make the changes the client wants done
			}

			const fmt_doc = exports.format_input_to_doc(resp_getDoc, null);
			fmt_doc.edited_timestamp = Date.now();
			fmt_doc._id = req.params.id;									// put the id back (typically not needed, fail safe incase format() touched it)

			if (!fmt_doc.z_debug) { fmt_doc.z_debug = {}; }					// init debug object
			fmt_doc.z_debug.req_edit_body_to_athena = req.body;				// record edit-component body, its for debug
			fmt_doc.z_debug.req_update_body_to_athena = req._orig_body;		// record the original body in an update k8s api
			fmt_doc.z_debug.req_update_body_to_dep = req._update_body_to_dep;	// same same, record for debug
			if (fmt_doc.z_debug.req_edit_body_to_athena) {
				fmt_doc.z_debug.req_edit_body_to_athena._timestamp = Date.now();
			}
			if (fmt_doc.z_debug.req_update_body_to_athena) {
				fmt_doc.z_debug.req_update_body_to_athena._timestamp = Date.now();
			}

			logger.debug('[edit comp] editing component in db "' + req.params.id + '" edits:', edits.length, 'w/keys:', edits);
			const wr_opts = {
				db_name: ev.DB_COMPONENTS,
			};

			// build a notification doc
			const notice = {
				message: 'editing component: ' + (fmt_doc.display_name || fmt_doc._id),
				component_id: fmt_doc._id,
				component_type: fmt_doc.type,
				component_display_name: fmt_doc.display_name,
			};
			t.notifications.procrastinate(req, notice);

			t.otcc.writeDoc(wr_opts, t.misc.sortKeys(fmt_doc), (err_writeDoc, resp_writeDoc) => {	// edit the doc now
				if (err_writeDoc) {
					logger.error('[edit comp] could not write doc', JSON.stringify(err_writeDoc, null, 2));
					return cb(err_writeDoc);
				} else {
					// cache is stale so remove the deployer get-all-components and similar response from the cache
					t.caches.broadcast_evict_event(ev.STR.EVENT_COMP_EDT, { _id: fmt_doc._id, });

					logger.info('[edit comp] edit component - success', fmt_doc._id);
					req._include_deployment_attributes = true;			// let dep fields return in response, like 'version'
					const ret = t.comp_fmt.fmt_component_resp(req, resp_writeDoc);
					ret.message = 'ok';

					// edit other orderer node docs of the same cluster
					if (fmt_doc.cluster_id && is_multi_edit(fmt_doc)) {	// need to edit multiple docs
						multi_raft_node_edit(fmt_doc, () => {			// I don't care if it errors
							return cb(null, t.misc.sortKeys(ret));
						});
					} else {
						return cb(null, t.misc.sortKeys(ret));
					}
				}
			});
		});

		// do we need to edit all raft node docs?
		function is_multi_edit(input) {
			for (let i in keys_for_multi_raft_node_edit) {
				const key = keys_for_multi_raft_node_edit[i];
				if (input[key]) {
					return true;
				}
			}
			return false;
		}

		// edit all raft docs that share this cluster id
		function multi_raft_node_edit(fmt_doc, cb_multi) {
			const cluster_id = fmt_doc.cluster_id;
			const view_opts = {
				db_name: ev.DB_COMPONENTS,
				_id: '_design/athena-v1',									// name of design doc
				view: 'by_cluster_id',
				SKIP_CACHE: true,
				query: t.misc.formatObjAsQueryParams({ include_docs: true, key: cluster_id }),
			};
			t.otcc.getDesignDocView(view_opts, (err_getDoc, resp) => {
				if (err_getDoc || !resp) {
					logger.warn('[edit comp] (multi-edit) could not get all docs by cluster id', cluster_id, err_getDoc);
					return cb_multi(err_getDoc);
				} else {
					const bulk_edit = { docs: [] };
					for (let i in resp.rows) {
						const doc = resp.rows[i] ? resp.rows[i].doc : null;
						if (doc) {
							for (let i in keys_for_multi_raft_node_edit) {
								const key = keys_for_multi_raft_node_edit[i];
								if (value_is_different(fmt_doc[key], doc[key])) {	// if its different, replace it
									doc[key] = fmt_doc[key];						// replace name
									bulk_edit.docs.push(doc);
								}
							}
						}
					}
					if (bulk_edit.docs.length === 0) {
						logger.debug('[edit comp] (multi-edit) all comp docs are up to date, no further edits to perform w/cluster id:', cluster_id);
						return cb_multi(null, null);
					} else {
						t.couch_lib.bulkDatabase({ db_name: ev.DB_COMPONENTS, }, bulk_edit, (err_bulk, bulk_resp) => {
							if (err_bulk) {
								logger.error('[edit comp] (multi-edit) problem editing the other components w/cluster id:', cluster_id, err_bulk);
								return cb(err_bulk);
							} else {
								logger.info('[edit comp] (multi-edit) successfully edited the other components w/custer id:', cluster_id, err_bulk);
								return cb_multi(null, bulk_resp);
							}
						});
					}
				}
			});
		}

		// return true if each value is the same - handle objects too
		function value_is_different(value_master, value_slave) {
			let master = null;
			let slave = null;
			if (typeof master === 'object') {
				master = JSON.stringify(t.misc.sortKeys(value_master));
				slave = JSON.stringify(t.misc.sortKeys(value_slave));
			} else {
				master = value_master;
				slave = value_slave;
			}
			return master !== slave;
		}
	};

	//--------------------------------------------------
	// Remove this component from the database
	//--------------------------------------------------
	/*
	req: {
		params: {
			component_id: "",
		}
		session: {}
	}
	*/
	exports.offboard_component = function (req, cb) {
		const get_opts = {
			req: req,
			id: req.params.component_id,
			skip_cache: true,
			log_msg: 'offboard component',
		};
		exports.load_component_by_id(get_opts, (err, doc) => {
			if (err) {
				// error already logged
				return cb(err);
			} else {
				const delete_opts = {
					_id: req.params.component_id,
					db_name: ev.DB_COMPONENTS,
					session_user_id: t.middleware.getUuid(req),					// the UUID of the current user
					session_email: t.middleware.getEmail(req)
				};
				logger.info('[remove comp] attempting to offboard component', delete_opts._id);

				// build a notification doc
				const type = exports.get_type_from_doc(doc) || 'component';		// try to get the component type from the doc
				const name = doc.display_name || doc.short_name || doc._id;
				const notice = {
					message: 'deleting ' + type + ': ' + name,
					component_id: doc._id,
					component_type: doc.type,
					component_display_name: doc.display_name,
				};
				t.notifications.procrastinate(req, notice);

				t.otcc.repeatDelete(delete_opts, 1, (err, resp) => {
					if (err) {
						if (t.ot_misc.get_code(err) === 404) {
							const ret = {
								message: 'id no longer exists. already deleted?',
								id: delete_opts._id
							};
							return cb(null, ret);
						} else {
							logger.error('[remove comp] delete error with component:', t.ot_misc.get_code(err), err);
							return cb(err, null);
						}
					} else {
						// cache is stale so remove the couch db data from cache
						t.caches.broadcast_evict_event(ev.STR.EVENT_COMP_RMV, resp ? resp.doc : {});

						exports.rebuildWhiteList(req, () => {			// remove the component from the white list
							logger.info('[remove comp] deleting node - success', delete_opts._id);
							const ret = exports.fmt_delete_resp(resp ? resp.doc : {});
							return cb(null, ret);
						});
					}
				});
			}
		});
	};

	// build an object that describes the component that was deleted. user will get this
	exports.fmt_delete_resp = function (comp_doc) {
		return {
			message: 'deleted',
			id: comp_doc ? (comp_doc._id || comp_doc.id) : '???',
			display_name: comp_doc ? (comp_doc.display_name || comp_doc.short_name) : '???',
			type: exports.get_type_from_doc(comp_doc) || '???',
		};
	};

	//--------------------------------------------------
	// Get component doc from the db - format doc response
	//--------------------------------------------------
	/*
	 *  req: {}  // request object
	*/
	exports.get_component = (req, cb) => {
		const get_opts = {
			req: req,
			id: req.params.id,
			skip_cache: t.ot_misc.skip_cache(req),
			log_msg: 'get component',
		};
		exports.load_component_by_id(get_opts, (err, doc) => {
			if (err) {
				// error already logged
				return cb(err);
			} else {
				doc = t.comp_fmt.fmt_component_resp(req, doc);
				return cb(null, t.misc.sortKeys(doc));
			}
		});
	};

	//--------------------------------------------------
	// Load component doc from db into req if not already there - raw doc format
	//--------------------------------------------------
	/*
		opts = {
			req: {},
			id: "component id",
			skip_cache: true | false,
			log_msg: "edit component",
		}
	*/
	exports.load_component_by_id = (opts, cb) => {
		if (!opts) { opts = { req: {} }; }				// safe init
		if (!opts.req) { opts.req = {}; }

		// --- if we already have the doc, return that one ---
		// if skip_cache is true make sure we don't return a doc that was from the cache
		// thus: if doc is already in req AND (skip_cache is true in request OR skip_cache is false in input)
		if (opts.req._component_doc && (opts.req._component_doc_skip_cache || (opts.skip_cache === false))) {
			if (opts.req._component_doc._id === opts.id) {		// double check its for the right id!
				return cb(null, opts.req._component_doc);
			}
		}

		const get_opts = {
			db_name: ev.DB_COMPONENTS,
			_id: opts.id,
			SKIP_CACHE: opts.skip_cache === true
		};
		t.otcc.getDoc(get_opts, (err_getDoc, resp_getDoc) => {
			if (err_getDoc) {
				const error_code = t.ot_misc.get_code(err_getDoc);
				if (error_code === 404) {
					logger.error('[component lib] cannot find doc by id for ' + opts.log_msg + ':', err_getDoc);
					const e_ret = { statusCode: 404, msg: 'no components by this id exist' };		// 404s generate single msg
					if (err_getDoc && err_getDoc.reason) {
						e_ret.reason = err_getDoc.reason;		// reason might hold "deleted" or "missing"
					}
					return cb(t.misc.sortKeys(e_ret));
				} else {
					logger.error('[component lib] error getting doc by id for ' + opts.log_msg + ':', err_getDoc, resp_getDoc);
					const e_ret = { statusCode: 500, msg: 'unable to look up component by id' };	// 500s generate single msg
					if (err_getDoc && err_getDoc.reason) {
						e_ret.reason = err_getDoc.reason;
					}
					return cb(t.misc.sortKeys(e_ret));
				}
			} else {
				resp_getDoc = build_url_2_use_in_doc(resp_getDoc);
				opts.req._component_doc = resp_getDoc;
				opts.req._component_doc_skip_cache = get_opts.SKIP_CACHE;
				return cb(null, resp_getDoc);
			}
		});
	};

	//--------------------------------------------------
	// Get all components from the database - docs are not formatted!
	//--------------------------------------------------
	/*
	 *  req: {}  // request object
	*/
	exports.get_all_components = (req, cb) => {
		const opts = {
			db_name: ev.DB_COMPONENTS,		// db for peers/cas/orderers/msps/etc docs
			_id: '_design/athena-v1',		// name of design doc
			view: '_doc_types',
			SKIP_CACHE: t.ot_misc.skip_cache(req),
			query: t.misc.formatObjAsQueryParams({ include_docs: true, keys: [ev.STR.MSP, ev.STR.MSP_EXTERNAL, ev.STR.CA, ev.STR.ORDERER, ev.STR.PEER] }),
		};

		t.otcc.getDesignDocView(opts, (err, resp) => {
			if (err) {
				logger.error('[component] error getting all nodes:', err);
				return cb(err);
			} else {
				const ret = { components: [] };
				if (resp) {
					for (let i in resp.rows) {
						if (resp.rows[i] && resp.rows[i].doc) {
							let doc = resp.rows[i].doc;
							doc = build_url_2_use_in_doc(doc);
							// do not format docs here... do it outside.
							ret.components.push(t.misc.sortKeys(doc));
						}
					}
				}

				if (ret.components.length === 0) {
					return cb({ statusCode: 222, msg: 'no components exist', reason: 'missing', components: [] });
				} else {
					logger.debug('[component] success getting all component docs:', ret.components.length);
					return cb(null, ret);
				}
			}
		});
	};

	// build a url that should be used to talk to this component - accounts for the component's tls situation and ui settings
	// works on peers, orderers, and CAs
	function build_url_2_use_in_doc(doc) {
		if (!doc) {
			return doc;
		} else {
			let doc_with_fmt_urls = t.comp_fmt.fmt_component_resp({}, JSON.parse(JSON.stringify(doc)));			// format it to pickup the correct api_url value
			doc.url2use = (doc.type === ev.STR.CA) ? doc_with_fmt_urls.api_url : doc_with_fmt_urls.grpcwp_url;	// copy the default

			// override the component's api url with a proxy route url to avoid self-signed issues in the browser
			if (should_proxy_url(doc.url2use)) {
				if (doc.type === ev.STR.ORDERER) {									// orderers use WS url
					doc.url2use = ev.PROXY_TLS_WS_URL + '/grpcwp/' + encodeURIComponent(doc_with_fmt_urls.grpcwp_url);
				} else if (doc.type === ev.STR.PEER) {								// peers use the http url
					doc.url2use = ev.PROXY_TLS_HTTP_URL + '/grpcwp/' + encodeURIComponent(doc_with_fmt_urls.grpcwp_url);
				}
			}
			if (doc.type === ev.STR.CA) {											// cas always proxy, use the http url w/its own route
				if (doc.disable_ca_proxy === true) {								// unless component has override flag
					doc.url2use = doc_with_fmt_urls.api_url;
				} else {
					doc.url2use = ev.PROXY_TLS_HTTP_URL + '/caproxy/' + encodeURIComponent(doc_with_fmt_urls.api_url);
				}
			}

			if (!doc.url2use) {
				delete doc.url2use;													// cleanup if its not a peer/ca/orderer at all
			}
			return t.misc.sortKeys(doc);
		}
	}

	// returns true if the url is ipv4 && tls OR PROXY_TLS_FABRIC_REQS is set to "always"
	function should_proxy_url(url) {
		return url && ((ev.PROXY_TLS_FABRIC_REQS === true && contains_ip_and_tls(url)) || ev.PROXY_TLS_FABRIC_REQS === 'always');
	}

	// returns true if the url contains an ip with TLS (urls w/hostname or http should return false)
	function contains_ip_and_tls(url) {
		const regex = RegExp(/https:\/\/\d+\.\d+\.\d+\.\d+/);				// tls + ip format
		if (url && typeof url === 'string') {
			return regex.test(url);
		}
		return false;
	}

	//-------------------------------------------------------------
	// Rebuild ips/domains on whitelist aka safelist (legacy name was HOST_WHITE_LIST)
	//-------------------------------------------------------------
	exports.rebuildWhiteList = (req, cb) => {
		req._skip_cache = true;

		t.async.parallel([

			// ---- [0] Get all component docs ---- //
			(join) => {
				exports.get_all_components(req, (err, resp) => {
					if (err) {
						logger.warn('[comp lib] could not get component docs to rebuild url safelist', err);
					}
					join(err, resp);
				});
			},

			// ---- [1] Get all signature collection docs ---- //
			(join) => {
				t.signature_collection_lib.getSignatureCollectionsDocs(req, (err, resp) => {
					if (err) {
						logger.warn('[comp lib] could not get signature collections to rebuild url safelist', err);
					}
					join(null, resp);						// don't care if we can't get these
				});
			},

		], (a_err, results) => {
			if (a_err) {
				logger.error('[comp lib] cannot update url safelist, could not get components'); // error details already logged
				return cb(a_err);
			} else {
				const components_arr = results[0] ? results[0].components : [];
				const sig_docs_arr = results[1];
				process_data(components_arr, sig_docs_arr, (errors, response) => {
					return cb(errors, response);
				});
			}
		});

		// now that we have the data, rebuild the white list
		function process_data(components, sig_docs, cb_built) {
			const urls2add = {};									// grab all the urls we might add for any component, use map to avoid duplicates

			for (let i in components) {								// add urls from component docs
				const comp_doc = components[i];
				if (comp_doc.api_url) {
					urls2add[t.misc.fmt_url(comp_doc.api_url)] = true;
				}
				if (comp_doc.ca_url) {								// ca_url is legacy
					urls2add[t.misc.fmt_url(comp_doc.ca_url)] = true;
				}
				if (comp_doc.grpcwp_url) {
					urls2add[t.misc.fmt_url(comp_doc.grpcwp_url)] = true;
				}
				if (comp_doc.operations_url) {
					urls2add[t.misc.fmt_url(comp_doc.operations_url)] = true;
				}
				if (comp_doc.osnadmin_url) {
					urls2add[t.misc.fmt_url(comp_doc.osnadmin_url)] = true;
				}
				if (comp_doc.api_url_saas) {
					urls2add[t.misc.fmt_url(comp_doc.api_url_saas)] = true;
				}
				if (comp_doc.operations_url_saas) {
					urls2add[t.misc.fmt_url(comp_doc.operations_url_saas)] = true;
				}
				if (comp_doc.osnadmin_url_saas) {
					urls2add[t.misc.fmt_url(comp_doc.osnadmin_url_saas)] = true;
				}
			}

			for (let i in sig_docs) {								// also add urls from signature collection docs
				for (let x in sig_docs[i].orgs2sign) {
					for (let y in sig_docs[i].orgs2sign[x].peers) {
						const url_str = t.misc.fmt_url(sig_docs[i].orgs2sign[x].peers[y]);
						if (url_str) {
							urls2add[url_str] = true;
						}
					}
				}
			}

			const opts = {
				db_name: ev.DB_SYSTEM,
				_id: process.env.SETTINGS_DOC_ID
			};
			const new_list = Object.keys(urls2add);

			if (t.misc.is_equal_arr(ev.URL_SAFE_LIST, new_list)) {	// if its the same, don't make a new write, would be pointless churn
				logger.debug('[comp lib] url safelist has not changed, skipping a settings doc update');
				return cb_built(null, new_list);
			} else {
				ev.URL_SAFE_LIST = new_list;
				t.otcc.repeatWriteSafe(opts, (settings_doc) => {		// don't use wr_doc in callback, use "doc" passed into writeDoc
					settings_doc.url_safe_list = new_list;
					return { doc: settings_doc };						// doc has the right _rev
				}, (err) => {
					if (err) {
						logger.error('[comp lib] error editing settings doc for safelist 1', err);
						return cb_built(err, new_list);
					} else {
						return cb_built(null, new_list);
					}
				});
			}
		}
	};

	// bring all tags to lower case and squish duplicates
	exports.fmt_tags = function (tags) {
		let parsed = {};												// use dictionary to control duplicates
		if (!tags || !Array.isArray(tags)) {
			tags = [];													// init
		}
		for (let i in tags) {
			if (typeof tags[i] === 'string') {
				const tag = tags[i].toLowerCase().replace(/[^a-z0-9-_+!@#$*?:,']/g, '').substring(0, 32);	// limit string size
				parsed[tag] = true;
			}
		}

		const ret = Object.keys(parsed);
		return ret.sort();
	};

	// detect if kubernetes attributes should be shown - from query param or manual parameter
	exports.include_deployment_data = function (req) {
		if (req && req.query && req.query.deployment_attrs === 'included') {	// query param way
			return true;
		}
		if (req && req._include_deployment_attributes === true) {				// the override/manual way
			return true;
		}
		return false;
	};

	// detect if we should return parsed certificates or not - from query param or manual parameter
	exports.include_parsed_certs = function (req) {
		if (req && req.query && req.query.parsed_certs === 'included') {		// query param way
			return true;
		}
		if (req && req._include_parsed_certs === true) {						// the override/manual way
			return true;
		}
		return false;
	};

	// detect if ca attributes should be shown - from query param or manual parameter
	exports.include_ca_data = function (req) {
		if (req && req.query && req.query.ca_attrs === 'included') {	// query param way
			return true;
		}
		if (req && req._include_ca_attrs === true) {					// the override/manual way
			return true;
		}
		return false;
	};

	// ------------------------------------------
	// bulk remove/delete/deprovision imported components
	// ------------------------------------------
	/*
	req: {
		url: "whatever?force=yes" 						// optional
		session: {}
	}
	*/
	exports.bulk_offboard_components = function (req, cb) {
		const lc_tag = req.params.tag.toLowerCase();
		let deleted_components = [];
		let errors = 0;

		// build a notification doc
		const notice = {
			message: 'deleting components by tag: ' + lc_tag,
			tag: lc_tag,
		};
		t.notifications.procrastinate(req, notice);

		exports.get_components_by_tag(lc_tag, true, (err, components) => {
			if (err) {
				logger.error('[component lib] error finding components to remove by tag:', lc_tag, '. error:', err);
				return cb(err);
			} else {
				logger.debug('[component lib] removing ' + components.length + ' components with tag:', lc_tag);
				t.async.eachLimit(components, 8, (component, cb_off) => {
					offboard(component, () => {
						return cb_off();
					});
				}, () => {
					logger.info('[component lib] offboarding by tag complete. tag:', lc_tag, 'total:', deleted_components.length);
					const ret = {
						statusCode: (errors > 0) ? 207 : 200,			// send 207 if 1+ went wrong
						removed: deleted_components
					};
					return cb(null, ret);
				});
			}
		});

		// offboard the component
		function offboard(component, cb_work) {
			component.debug_tx_id = t.misc.simpleRandomString(6);		// make an id that follows this deletes journey, gets logged
			logger.debug('[component lib]', component.debug_tx_id, 'offboarding component', component._id);
			const opts = {
				session: req ? req.session : null,
				headers: req ? req.headers : null,
				params: {
					component_id: component._id,
					debug_tx_id: component.debug_tx_id,
				}
			};
			exports.offboard_component(opts, (delErr) => {
				if (delErr) {
					errors++;
					deleted_components.push(build_error_obj(delErr, component));
				} else {
					deleted_components.push(exports.fmt_delete_resp(component));
				}
				return cb_work();									// don't return errors
			});
		}

		// build an object that describes the component. users will see this
		function build_error_obj(error, component) {
			return {
				statusCode: t.ot_misc.get_code(error),
				message: error.msg,
				id: component ? (component._id || component.id) : '???',
				tx_id: component.debug_tx_id,
				type: exports.get_type_from_doc(component) || '???',
			};
		}
	};

	// get all components by tag
	exports.get_components_by_tag = function (lc_tag, skip_cache, get_cb) {
		const opts = {
			db_name: ev.DB_COMPONENTS,
			_id: '_design/athena-v1',					// name of design doc
			view: 'by_tag',
			SKIP_CACHE: skip_cache,
			query: t.misc.formatObjAsQueryParams({ include_docs: true, key: lc_tag }),
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

				if (docs.length === 0) {
					if (resp && resp.total_rows === 0) {
						return get_cb({ statusCode: 222, msg: 'no components exist', reason: 'missing', components: [] });
					} else {
						return get_cb({ statusCode: 222, msg: 'no components by tag exist', reason: 'missing', components: [] });
					}
				} else {
					return get_cb(null, docs);
				}
			}
		});
	};

	// get all components by their fabric type
	exports.get_components_by_type = function (type, skip_cache, cb) {
		const opts = {
			db_name: ev.DB_COMPONENTS,
			_id: '_design/athena-v1',
			view: '_doc_types',
			SKIP_CACHE: skip_cache,
			query: t.misc.formatObjAsQueryParams({ include_docs: true, keys: [type] }),
			expires: 1000 * 60 * 2,
		};

		t.otcc.getDesignDocView(opts, (err, resp) => {
			if (err) {
				logger.error('[component] error getting components of type:', type, err);
				return cb(err);
			} else {
				const docs = [];
				if (resp) {
					for (let i in resp.rows) {
						if (resp.rows[i] && resp.rows[i].doc) {
							docs.push(resp.rows[i].doc);
						}
					}
				}

				if (docs.length === 0) {
					if (resp && resp.total_rows === 0) {
						return cb({ statusCode: 222, msg: 'no components exist', reason: 'missing', components: [] });
					} else {
						return cb({ statusCode: 222, msg: 'no components by type exist', reason: 'missing', components: [] });
					}
				} else {
					logger.debug('[component] success getting components of type:', type, docs.length);
					return cb(null, docs);
				}
			}
		});
	};

	//--------------------------------------------------
	// Get a root cert from a CA - lookup the ca url via the deployment's crypto object
	//--------------------------------------------------
	exports.get_root_cert_by_crypto = (incoming_req, cb) => {
		const incoming_crypto = incoming_req.body.crypto || incoming_req.body.config;			// legacy field name was "config", new name in v3 is "crypto"
		const crypto = Array.isArray(incoming_crypto) ? incoming_crypto[0] : incoming_crypto;	// raft's crypto is an array, pick the first one, all the same
		const ca_host = t.misc.safe_dot_nav(crypto, ['crypto.enrollment.ca.host', 'crypto.enrollment.tls.cahost']);
		const ca_port = t.misc.safe_dot_nav(crypto, ['crypto.enrollment.ca.port', 'crypto.enrollment.tls.caport']);
		const ca_name = t.misc.safe_dot_nav(crypto, ['crypto.enrollment.ca.name', 'crypto.enrollment.tls.caname']) || 'tlsca';

		if (!ca_host || !ca_port) {
			if (t.ot_misc.get_api_version(incoming_req) === 'v2') {
				logger.warn('[component lib] missing ca host and/or ca port in "config". thus unable to fetch root cert');
				return cb({ statusCode: 400, details: 'unable to lookup tls cert. missing fields in "config"' });
			} else {
				logger.warn('[component lib] missing ca host and/or ca port in "crypto". thus unable to fetch root cert');
				return cb({ statusCode: 400, details: 'unable to lookup tls cert. missing fields in "crypto"' });
			}
		} else {
			const opts = {
				baseUrl: 'https://' + ca_host + ':' + ca_port,
				url: '/cainfo?ca=' + ca_name,
			};
			exports.get_ca_data(opts, (err, caInfo) => {
				let cert = caInfo ? caInfo.CAChain : null;
				return cb(err, cert);
			});
		}
	};

	//--------------------------------------------------
	// Get a root cert from a CA - lookup the ca url via doc
	//--------------------------------------------------
	exports.get_ca_info_by_doc = (component_doc, use_tlsca, cb) => {
		if (!component_doc || !component_doc.api_url || !component_doc.ca_name) {
			logger.warn('[component lib] missing ca api url and/or ca name in "doc". thus unable to fetch ca info...');
			return cb({ statusCode: 500, details: 'unable to lookup ca info. missing input fields: "api_url" or "ca_name"' });
		} else {
			const opts = {
				baseUrl: component_doc.api_url,
				url: '/cainfo?ca=' + (use_tlsca ? component_doc.tlsca_name : component_doc.ca_name),
			};
			exports.get_ca_data(opts, (err, caInfo) => {
				return cb(err, caInfo);
			});
		}
	};

	//--------------------------------------------------
	// Get a root cert from a CA - dsh todo add caching!
	//--------------------------------------------------
	exports.get_ca_data = (options, cb) => {
		const opts = {
			method: 'GET',
			baseUrl: options.baseUrl,
			url: options.url,
			body: null,
			timeout: 2000,
			rejectUnauthorized: false,
			_name: 'root_cert',
			_max_attempts: 2,
			_calc_retry_timeout: (r_options, resp) => {
				r_options.timeout += 5000;						// increase timeout on each attempt
				return r_options.timeout;
			}
		};
		t.misc.retry_req(opts, (err, ca_resp) => {
			if (err) {											// error already logged
				return cb(err, null);
			} else {
				let body = null;
				try {
					body = ca_resp ? JSON.parse(ca_resp.body) : null;
				} catch (e) {
					logger.error('[component lib] unable to parse ca response.', options.baseUrl, e);
				}

				if (!body || !body.result) {
					// already logged above
					return cb({ statusCode: 500, msg: 'unable to parse ca response' }, body);
				} else {
					//logger.debug('[component lib] able to retrieved ca info data', options.baseUrl);
					return cb(null, body.result);
				}
			}
		});
	};

	//--------------------------------------------------
	// Get all peer, ca and orderer docs - from db or cache (use w/caution - cache expiration is much longer than normal)
	//--------------------------------------------------
	exports.get_all_runnable_components = (req, cb) => {
		const opts = {
			db_name: ev.DB_COMPONENTS,		// db for peers/cas/orderers/msps/etc docs
			_id: '_design/athena-v1',		// name of design doc
			view: '_doc_types',
			SKIP_CACHE: t.ot_misc.skip_cache(req),
			query: t.misc.formatObjAsQueryParams({ include_docs: true, keys: [ev.STR.CA, ev.STR.ORDERER, ev.STR.PEER] }),
			expires: 1000 * 60 * 5,
		};

		t.otcc.getDesignDocView(opts, (err, resp) => {
			if (err) {
				logger.error('[component] error getting all runnable components:', err);
				return cb(err);
			} else {
				const docs = [];
				if (resp) {
					for (let i in resp.rows) {
						if (resp.rows[i] && resp.rows[i].doc) {
							docs.push(resp.rows[i].doc);
						}
					}
				}
				logger.debug('[component] success getting all runnable components:', docs.length);
				return cb(null, docs);
			}
		});
	};

	//--------------------------------------------------
	// Get the status of multiple components at a time
	//--------------------------------------------------
	exports.bulk_component_status = (req, cb) => {
		safe_get_runnable_components(req, (err, docs) => {
			if (err) {
				return cb(err);												// error already logged
			} else if (!req || !req.body || !req.body.components || Object.keys(req.body.components).length === 0) {
				logger.error('[component] unable to get bulk component status, missing or empty "components" field');
				return cb({ statusCode: 400, msg: 'missing or empty "components" field' });
			} else {
				const ret = {};

				t.async.eachOfLimit(req.body.components, 32, (opts, id, cb_a_request) => {	// the individual request options "opt" is in the body
					const comp_doc = find_doc(id, docs);
					if (!comp_doc) {										// there is no doc by that id... add error resp
						logger.error('[component] unable to get component status b/c doc not found for component id:', id);
						ret[id] = {
							status_url: '?',
							status: null,
							error: 'unknown component id'
						};
						if (opts && opts.include_status_resp === true) {
							ret[id].status_resp = null;
						}
						return cb_a_request();								// never return an error, it will stop async
					} else {
						exports.get_status(comp_doc, opts, (response) => {	// go get the status
							const code = t.ot_misc.get_code(response);
							let log_it_as_cached = 'the real ';
							ret[id] = {
								status_url: response.status_url,
								status: t.ot_misc.is_error_code(code) ? ev.STR.STATUS_NOT_GREAT : ev.STR.STATUS_ALL_GOOD,
							};
							if (opts && opts.include_status_resp === true) {
								ret[id].status_resp = response.body;
							}
							if (response._cache_expires_in) {
								ret[id]._cache_expires_in = response._cache_expires_in;
								log_it_as_cached = 'cached ';
							}
							logger.debug('[component] got ' + log_it_as_cached + 'component status. code:', code, 'component id:', id);

							return cb_a_request();							// never return an error, it will stop async
						});
					}
				}, () => {
					logger.debug('[component] returning bulk statuses for', Object.keys(ret).length, 'components');
					return cb(null, t.misc.sortKeys(ret));
				});
			}
		});

		// get the doc for this component
		function find_doc(id, docs) {
			for (let i in docs) {
				if (docs[i]._id === id) {
					return docs[i];
				}
			}
			return null;
		}

		// Get all peer/orderer/ca docs - NOT recursive
		// iter through all component ids in request and make sure the cached hit has a doc for each id
		// if not, disregard cache and fetch fresh component docs from db
		// why do this? b/c if the request is asking for a component the cache doesn't know it might be a brand new component
		function safe_get_runnable_components(req, cb) {
			let try_again = false;
			if (!req) { req = {}; }												// init
			if (!req.query) { req.query = {}; }

			req.query.skip_cache = null;										// the first time is always false
			exports.get_all_runnable_components(req, (err1, docs1) => {
				if (req.body) {
					for (let id in req.body.components) {						// iter through component ids in body
						if (!find_doc(id, docs1)) {								// if it doesn't exist... we need to try again w/o cache
							try_again = true;
							break;												// it only takes one
						}
					}
				}

				if (try_again) {
					req.query.skip_cache = 'yes';								// skip cache this time
					exports.get_all_runnable_components(req, (err2, docs2) => {
						return cb(err2, docs2);
					});
				} else {
					return cb(err1, docs1);
				}
			});
		}
	};

	//--------------------------------------------------
	// Get the status of a component by trying to reach its status endpoint
	//--------------------------------------------------
	/*
		opts: {
			timeout_ms: 0,		// [optional] http timeout for asking the component
			skip_cache: true	// [optional] if we should **not** use the in-memory cache
			_max_attempts: 2	// [optional] max number of http reqs to send including orig and retries
		}
	*/
	exports.get_status = (comp_doc, opts, cb) => {
		if (!opts) { opts = {}; }
		const options = {
			method: 'GET',
			baseUrl: null,
			url: exports.build_status_url(comp_doc),
			headers: { 'Accept': 'application/json' },
			timeout: !isNaN(opts.timeout_ms) ? Number(opts.timeout_ms) : ev.HTTP_STATUS_TIMEOUT, // give up quickly b/c we don't want status api to hang
			rejectUnauthorized: false,									// self signed certs are okay
			_name: 'status_req',
			_max_attempts: opts._max_attempts || 2,
			_retry_codes: {												// list of codes we will retry
				'429': '429 rate limit exceeded aka too many reqs',
				//'408': '408 timeout',									// status calls should not retry a timeout, takes too long
				'500': '500 internal error',
			}
		};

		if (options.url === null) {										// no url to hit... error out
			logger.error('[component] unable to get component status b/c url to use in doc is missing... id:', comp_doc._id);
			return cb({
				statusCode: 500,
				body: 'unable to get component status b/c url to use in doc is missing',
				status_url: null
			});
		} else {

			// check the cache first (proxy status calls get cached if they were successful)
			const c = t.proxy_lib.check_cache({ body: { method: 'GET', query: null, url: options.url } });
			if (opts.skip_cache !== true && c && c.cached) {			// if we have a hit, send the cached data
				return cb({
					statusCode: c.cached.code,
					body: c.cached.data,
					status_url: options.url,
					_cache_expires_in: t.misc.friendly_ms(t.proxy_cache.getTtl(c.key) - Date.now()),
				});
			} else {													// else perform the proxy req
				t.misc.retry_req(options, (err, resp) => {
					const code = t.ot_misc.get_code(resp);
					const body = format_body(resp);
					if (!t.ot_misc.is_error_code(code)) {				// only cache successful responses
						t.proxy_lib.cache_data(c.key, c.key_src, { statusCode: code, headers: null, response: body });
					}

					return cb({
						statusCode: code,
						body: body,
						status_url: options.url
					});
				});
			}
		}

		// json parse the body if asked for
		function format_body(resp) {
			let body = null;
			if (resp && resp.body) {								// parse body to JSON
				if (typeof resp.body === 'string') {
					try { body = JSON.parse(resp.body); }
					catch (e) {
						logger.error('[component] unable to format status response as JSON for component id', comp_doc._id, e);
						return null;
					}
				} else {
					return resp.body;
				}
			}
			return body;
		}
	};

	//--------------------------------------------------
	// build a status url for the component, from a component doc
	//--------------------------------------------------
	exports.build_status_url = (comp_doc) => {
		let ret = null;
		if (comp_doc) {
			if (comp_doc.type === ev.STR.CA && comp_doc.api_url) {
				ret = comp_doc.api_url + '/cainfo';					// CA's use this route
			} else if (comp_doc.operations_url && (comp_doc.type === ev.STR.ORDERER || comp_doc.type === ev.STR.PEER)) {
				ret = comp_doc.operations_url + '/healthz';			// peers and orderers use this route
			}
		}
		return ret;
	};

	//--------------------------------------------------
	// Get /cainfo data from all the CAs in the components array
	//--------------------------------------------------
	exports.get_each_cas_info = (req, component_docs, cb) => {
		if (!t.component_lib.include_ca_data(req)) {					// do not need ca info, b/c it wasn't asked for
			return cb(null, null);
		} else {

			// we don't have the ca & msp docs if the get-a-component was called... so get them
			if (!component_docs) {										// if we don't have all component docs yet, get them
				logger.debug('[component lib] getting component docs to build ca info...');
				t.deployer.get_all_components(req, (_, data) => {		// works on imported and provisioned components...
					build_ca_data((data ? data.athena_docs : null), (err, response) => {
						return cb(err, response);
					});
				});
			} else {													// if we already have all component docs, just go
				build_ca_data(component_docs, (err, response) => {
					return cb(err, response);
				});
			}
		}

		// iter on the docs and build the ca data
		function build_ca_data(comp_docs, cb_build) {
			const ret = {};
			const possible_root_certs = {};

			t.async.eachLimit(comp_docs, 16, (comp, cb_comp) => {				// iter on the component docs, look for CA's
				if (comp.type !== ev.STR.CA) {
					cb_comp(null, null);										// wrong component type, skip
				} else {
					logger.debug('[component lib] getting ca info data for ca:', comp._id);
					exports.get_ca_info_by_doc(comp, false, (err3, caInfo) => {
						if (caInfo) {
							ret[comp._id] = caInfo;								// populate the ca info into key that is the ca's athena id
							if (caInfo.CAChain) {
								possible_root_certs[comp._id] = caInfo.CAChain;	// build list of known ca root certs, used later w/MSPs
							}
						}
						cb_comp(null, null);
					});
				}
			}, (_) => {
				logger.debug('[component lib] finished getting each CAs info...');

				// --- find out what CA issued each MSP root-cert --- //
				for (let i in comp_docs) {
					if (comp_docs[i].type === ev.STR.MSP) {						// only look at MSPs
						const opts = {
							msp_root_cert: comp_docs[i].root_certs[0],
							root_certs_by_ca: possible_root_certs
						};
						const ca_id = t.ot_misc.find_ca_for_msp(opts);			// get the athena ca id that issued this MSP's root cert
						if (!ca_id) {
							logger.warn('[component lib] issuer of this msp\'s root cert is unknown:', comp_docs[i]._id);
						} else {
							if (ret[ca_id]) {									// look for athena id, should have been populated above
								if (!ret[ca_id]._issued_msps) {
									ret[ca_id]._issued_msps = [];				// safe init
								}
								const obj = {
									id: comp_docs[i]._id,						// athena's component id for the msp...
									msp_id: comp_docs[i].msp_id,
									display_name: comp_docs[i].display_name,
								};
								ret[ca_id]._issued_msps.push(obj);				// add to ca's data
							}
						}
					}
				}
				return cb_build(null, ret);
			});
		}
	};

	return exports;
};
