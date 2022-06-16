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
// template.js - Library functions for template apis
//------------------------------------------------------------
module.exports = function (logger, ev, t) {
	const exports = {};
	const CA_TIMEOUT_MS = 5000;				// this is the timeout of a single CA status call, not to be confused with the overall ca timeout
	const NODE_TIMEOUT_MS = 5000;			// this is the timeout of a single node status call, not to be confused with the overall timeout
	const DEPTH_ERROR = '[DEPTH ERROR]';

	//--------------------------------------------------
	// check the template for errors before using it
	//--------------------------------------------------
	exports.inspect_template = function (json, cb) {
		const by_ref_id = {};
		const resolved_components = JSON.parse(JSON.stringify(json.create_components));	// deep copy
		let errors = [];
		const valid_types = [ev.STR.CA, ev.STR.ENROLL_ID, ev.STR.MSP, ev.STR.MSP_EXTERNAL, ev.STR.ORDERER, ev.STR.PEER];
		const valid_fields_map = {};
		valid_fields_map[ev.STR.CA] = [
			'_max_wait_ms', '_ref_id', 'ca_name', 'enroll_id', 'enroll_secret', 'resources', 'storage', 'hostname', 'id', 'tls_root_cert',
			'location', 'display_name', 'node_id', 'pem', 'port', 'root_cert', 'component_name', 'tls_cert', 'tlsca_name', 'type', 'api_url', 'tags'
		];
		valid_fields_map[ev.STR.ENROLL_ID] = [
			'_ref_id', 'ca_name', 'api_url', 'enroll_id', 'enroll_secret', 'certificate', 'private_key', 'max_enrollments', 'id', 'tags'
		];
		valid_fields_map[ev.STR.MSP] = [
			'_ref_id', 'msp_id', 'component_name', 'root_certs', 'admins', 'location', 'display_name', 'id', 'organizational_unit_identifiers',
			'fabric_node_ous', 'tls_root_certs', 'type', 'tags'
		];
		valid_fields_map[ev.STR.MSP_EXTERNAL] = valid_fields_map[ev.STR.MSP];
		valid_fields_map[ev.STR.ORDERER] = [
			'_max_wait_ms', '_ref_id', 'type', 'display_name', 'component_name', 'crypto', 'resources', 'storage', 'id', 'hostname',
			'port', 'location', 'tags'];
		valid_fields_map[ev.STR.PEER] = [
			'_max_wait_ms', '_ref_id', 'type', 'display_name', 'component_name', 'crypto', 'resources', 'storage', 'id', 'hostname',
			'port', 'location', 'tags'
		];
		valid_fields_map['definition'] = [];						// definitions can have any field

		json._id = json._id || json.id;								// copy field if it got moved by the fetch component logic
		const required_root_fields = ['_id', 'create_components', 'display_name', 'api_version'];
		for (let i in required_root_fields) {
			const field = required_root_fields[i];
			if (!json[field]) {
				errors.push('Missing field "' + field + '" in template JSON');
			}
		}
		if (json.api_version !== 'v1') {
			errors.push('Unsupported template api version. Must use "api_version" of "v1".');
		}
		if (!Array.isArray(json.create_components)) {
			errors.push('Missing the "create_components" array in template JSON');
			return cb(errors);
		} else {
			basic_checks();											// check for duplicate/missing ids

			// -- Load existing components from db -- //
			load_existing_components(json.existing_components, (_) => {

				// -- Check each create component -- //
				for (let c_ele in json.create_components) {
					const component = json.create_components[c_ele];
					for (let key in component) {
						if (key !== '_ref_id') {						// skip _ref_id
							check(c_ele, component[key]);
						}
						partially_resolve_component(c_ele, key, component[key]);	// resolve what we can

					}
					load_dummy_values(c_ele);							// load place holder values in component
				}

				const summary = resource_summary(resolved_components);	// catch errors with resources/storage inputs
				if (summary && summary.errors && summary.errors.length > 0) {
					errors = errors.concat(summary.errors);
				} else {
					if (summary) {
						delete summary.errors;
					}
				}

				normalized_resources(resolved_components);	// add normalized resources

				const ret = {
					by_ref_id: by_ref_id,
					resolved_components: resolved_components,
					resources: summary,
					total_steps: exports.count_steps(resolved_components)
				};
				return cb(errors, ret);
			});
		}

		// recursively check object/arrays for strings
		function check(c_ele, value) {
			if (typeof value === 'string' && value[0] === '$') {	// only validate fields w/value of $xxxx
				validate_references(c_ele, value);
			} else if (typeof value === 'object') {					// oh boy (object or array)
				for (let key in value) {
					check(c_ele, value[key]);						// here we go again
				}
			}
		}

		// check for basic errors
		function basic_checks() {
			for (let i in json.definitions) {						// add definitions to the by ref object
				const d_obj = json.definitions[i];
				if (!d_obj._ref_id) {
					errors.push('Definition element "' + i + '" is missing field "_ref_id".');		// check for "_ref_id"
				} else {
					if (by_ref_id[d_obj._ref_id]) {													// check for duplicate ids
						errors.push('Definition element "' + i + '" contains duplicate "_ref_id". "' + d_obj._ref_id + '".');
					} else {
						d_obj.type = 'definition';
						by_ref_id[d_obj._ref_id] = d_obj;											// reorganize
					}
				}
			}
			for (let i in json.create_components) {
				const c_obj = json.create_components[i];
				if (!c_obj._ref_id) {
					errors.push('Component element "' + i + '" is missing field "_ref_id".');		// check for "_ref_id"
				} else {
					if (by_ref_id[c_obj._ref_id]) {													// check for duplicate ids
						errors.push('Component element "' + i + '" contains duplicate "_ref_id". "' + c_obj._ref_id + '".');
					} else {
						by_ref_id[c_obj._ref_id] = c_obj;				// reorganize
					}
				}
				if (c_obj.type && typeof c_obj.type === 'string') {		// conform it to lowercase
					c_obj.type = c_obj.type.toLowerCase();
				}
				if (!valid_types.includes(c_obj.type)) {				// check "type" of component
					errors.push('Component element "' + i + '" is of unknown "type". Value "' + c_obj.type + '".');
				}
			}
		}

		// check reference value's, make sure they can be dereferenced
		function validate_references(c_ele, value) {
			if (value.includes('.')) {										// check if sub key exists
				const parts = value.split('.');
				if (parts && parts.length >= 2) {
					const id = parts[0];
					const sub_field = parts[1];
					if (!by_ref_id[id]) {									// check if component's ref id exists
						errors.push('Component element "' + c_ele + '" has an invalid value.: "' + value + '". No components have a "_ref_id" of "' +
							id + '".');
					} else {
						const ref_component = by_ref_id[id];
						const type = (ref_component && typeof ref_component.type === 'string') ? ref_component.type.toLowerCase() : null;
						if (!type || !valid_fields_map[type]) {
							// type errors are already detected and pushed via basic_checks()
						} else {
							if (!valid_fields_map[type].includes(sub_field) && type !== 'definition') {	// definitions can have w/e
								errors.push('Component element "' + c_ele + '" has an invalid value: "' + value +
									'". Value cannot be dereferenced b/c subfield does not exist.');
							}
						}
					}
				}
			} else {														// check if component ref id exists
				if (!by_ref_id[value]) {
					errors.push('Component element "' + c_ele + '" has an invalid value: "' + value + '". No components have a "_ref_id" of "' +
						value + '".');
				}
			}
		}

		// resolve this component as much as we can, for debug
		function partially_resolve_component(c_ele, key, value) {
			if (c_ele && key && resolved_components && resolved_components[c_ele]) {
				if (typeof resolved_components[c_ele].type === 'string') {
					resolved_components[c_ele].type = resolved_components[c_ele].type.toLowerCase();
				}

				if (resolved_components[c_ele].type === ev.STR.CA) {
					resolved_components[c_ele] = exports.build_ca_body(by_ref_id, resolved_components[c_ele]);
				} else if (resolved_components[c_ele].type === ev.STR.ENROLL_ID) {
					resolved_components[c_ele] = exports.build_enroll_body(by_ref_id, resolved_components[c_ele]);
				} else if (resolved_components[c_ele].type === ev.STR.MSP || resolved_components[c_ele].type === ev.STR.MSP_EXTERNAL) {
					resolved_components[c_ele] = exports.build_msp_body(by_ref_id, resolved_components[c_ele]);
				} else if (resolved_components[c_ele].type === ev.STR.PEER) {
					resolved_components[c_ele] = exports.build_peer_body(by_ref_id, resolved_components[c_ele]);
				} else if (resolved_components[c_ele].type === ev.STR.ORDERER) {
					resolved_components[c_ele] = exports.build_orderer_body(by_ref_id, resolved_components[c_ele]);
				} else {
					if (Array.isArray(value)) {
						resolved_components[c_ele][key] = resolve_array(by_ref_id, value); // return partially resolved component
						if (resolved_components[c_ele][key].includes(DEPTH_ERROR)) {
							errors.push('Component element "' + c_ele + '" has an invalid field. Cannot resolve field. "' + value + '" too deep or circular.');
						}
					} else {
						resolved_components[c_ele][key] = resolve_field(by_ref_id, value); // return partially resolved component
						if (resolved_components[c_ele][key] === DEPTH_ERROR) {
							errors.push('Component element "' + c_ele + '" has an invalid field. Cannot resolve field. "' + value + '" too deep or circular.');
						}
					}
				}
			}
		}

		// put placeholder strings on all values that will be resolvable later
		function load_dummy_values(c_ele) {
			if (resolved_components[c_ele].type && valid_fields_map[resolved_components[c_ele].type]) {
				let load_dummy_fields = valid_fields_map[resolved_components[c_ele].type];
				for (let i in load_dummy_fields) {								// set all valid fields with null, filled in later
					const dKey = load_dummy_fields[i];
					if (typeof resolved_components[c_ele][dKey] === 'undefined') {
						resolved_components[c_ele][dKey] = null;
					}

					// if its null but not null in the original original, copy from original
					if (resolved_components[c_ele][dKey] === null) {
						if (json.create_components[c_ele][dKey] !== null && typeof json.create_components[c_ele][dKey] !== 'undefined') {
							resolved_components[c_ele][dKey] = json.create_components[c_ele][dKey];
						}
					}

					if (Array.isArray(resolved_components[c_ele][dKey])) {
						for (let z in resolved_components[c_ele][dKey]) {
							if (typeof resolved_components[c_ele][dKey][z] === 'undefined') {
								resolved_components[c_ele][dKey][z] = null;
							}
						}
					}
				}
			}
			resolved_components[c_ele] = fill_in_place_holders(resolved_components[c_ele]);
		}

		// get existing components from db - async
		function load_existing_components(existing_array, cb_existing) {
			const keys = [];
			for (let i in existing_array) {											// build the keys for the view, 1 per component
				if (!existing_array[i]._ref_id) {
					errors.push('Existing component element "' + i + '" is missing the "_ref_id" field.');
				} else {
					keys.push(existing_array[i]._ref_id.substring(1));				// the first letter is bullshit
				}
			}

			if (keys.length === 0) {												// nothing to load
				return cb_existing();
			} else {
				const view_opts = {
					db_name: ev.DB_COMPONENTS,
					_id: '_all_docs',
					SKIP_CACHE: true,
					query: t.misc.formatObjAsQueryParams({ include_docs: true, keys: keys }),
				};
				t.otcc.getDoc(view_opts, (err_getDoc, resp) => {
					if (err_getDoc || !resp) {
						logger.error('[template] unable to load existing component docs:', err_getDoc, resp);
						errors.push('Unable to load existing component elements.');
					} else {
						if (resp.rows) {
							for (let i in resp.rows) {
								if (!resp.rows[i] || !resp.rows[i].doc) {				// inform user of the bad key
									const id = resp.rows[i] ? resp.rows[i].key : 'unknown_key';
									logger.warn('[template] unable to load existing component id:', id);
									errors.push('Existing component element "' + i + '" does not exist in db. id: "' + id + '"');
								} else {
									const doc = resp.rows[i].doc;
									logger.debug('[template] found and loaded existing component:', doc._id);
									doc._ref_id = '$' + doc._id;
									delete doc._id;
									delete doc._rev;
									delete doc.z_debug;
									by_ref_id[doc._ref_id] = doc;
								}
							}
						}
					}
					return cb_existing();
				});
			}
		}
	};

	// resolve the $field - recursive, sometimes
	function resolve_field(byRefId, val, depth) {
		if (!depth) { depth = 1; }
		if (depth >= 100) {												// upper bound on how recursive we are, don't want to loop forever...
			logger.error('[template] cannot resolve field. nested too deep or circular.', val, depth);
			return DEPTH_ERROR;											// all stop
		}
		if (typeof val !== 'string' || val[0] !== '$') {				// only look at fields w/value of $xxxx
			return val;
		} else {
			const parts = val.split('.');
			if (parts && parts.length >= 2) {

				// find the referenced key's value
				let prev = byRefId;										// contains the walked object so far
				for (let i in parts) {									// walk each dot
					const subField = parts[i];							// rename for readability
					if (prev[subField]) {
						prev = prev[subField];							// remember this spot
					}
				}
				const value = prev;										// rename for readability

				if (typeof value !== 'string') {						// if its not a string, this field does not exist yet, populated later
					return null;										// return null so that partially_resolve_component replaces it
				} else {
					if (value[0] === '$') {
						return resolve_field(byRefId, value, ++depth);	// recursive
					} else {
						return value;									// return the value in the reference object's key field
					}
				}
			}
			return val;													// default to returning exactly what it was
		}
	}

	// resolve the array of $fields
	function resolve_array(byRefId, array) {
		const ret = [];
		if (!Array.isArray(array)) {									// user screwed up, go ahead an make an array of 1
			ret.push(resolve_field(byRefId, array));
		} else {
			for (let i in array) {
				ret.push(resolve_field(byRefId, array[i]));
			}
		}
		return ret;
	}

	// resolve the $values of keys in an object
	function resolve_object(byRefId, obj) {
		if (obj && obj.constructor && obj.constructor.name === 'Object') {
			const ret = {};
			for (let key in obj) {
				ret[key] = resolve_object(byRefId, obj[key]);
			}
			return ret;
		} else if (!Array.isArray(obj)) {
			return resolve_array(byRefId, obj);
		} else {
			return resolve_field(byRefId, obj);
		}
	}

	// build a short name from display name
	function build_short_name(str) {
		if (str && typeof str === 'string') {
			str = str.replace(/[^a-zA-Z0-9-_]/g, '');
			if (str.length < ev.MIN_SHORT_NAME_LENGTH) {
				str += '_' + t.misc.simpleRandomString(ev.MIN_SHORT_NAME_LENGTH - str.length);	// append letters to get to x+ characters
			}
		} else {
			str = t.misc.simpleRandomString(ev.MIN_SHORT_NAME_LENGTH);
		}
		return str.substring(0, ev.MIN_SHORT_NAME_LENGTH * 2);				// cap short names
	}

	// parse the json for $RANDOM/$TIMESTAMP and replace strings with random characters
	function set_random_strings(json) {
		try {
			let str = JSON.stringify(json);
			if (str && typeof str === 'string') {
				str = str.replace(/\$RANDOM8/g, t.misc.simpleRandomString(8).toLowerCase());
				str = str.replace(/\$RANDOM16/g, t.misc.simpleRandomString(16).toLowerCase());
				str = str.replace(/\$RANDOM/g, t.misc.simpleRandomString(4).toLowerCase());
				str = str.replace(/\$TIMESTAMP/g, Date.now());
				json = JSON.parse(str);
			}
		} catch (e) { }
		return json;
	}

	// append the tx id as a tag, used to bulk delete later if we fail
	function append_tag(template, c_obj, tx_id) {
		let tags = resolve_array(template, c_obj.tags);
		tags.push(tx_id || 'template-auto');
		tags = t.component_lib.fmt_tags(tags);
		return tags;
	}

	// build a body to provision a ca
	exports.build_ca_body = function (template, c_obj, tx_id) {
		const display_name = resolve_field(template, c_obj.display_name);
		const ret = {
			type: c_obj.type,
			_associated_enroll_id: resolve_field(template, c_obj._associated_enroll_id || c_obj.enroll_id),
			enroll_id: resolve_field(template, c_obj.enroll_id),
			enroll_secret: resolve_field(template, c_obj.enroll_secret),
			display_name: display_name,
			component_name: build_short_name(display_name),
			resources: build_resources_field(['ca'], template, c_obj),
			storage: build_storage_field(['ca'], template, c_obj),
			tags: append_tag(template, c_obj, tx_id),
			zone: resolve_field(template, (c_obj.zone)),
			arch: resolve_field(template, (c_obj.arch)),
		};
		const merged = t.fmt_crypto.fill_in_default_resources(ret);
		ret.resources = merged ? merged.resources : null;
		ret.storage = merged ? merged.storage : null;
		return ret;
	};

	// build a body to register an enroll id
	exports.build_register_body = function (template, component) {
		return {
			api_url: resolve_field(template, component.api_url) || resolve_field(template, component.url),	// also pull from legacy url field
			ca_name: resolve_field(template, component.ca_name),
			enroll_id: resolve_field(template, component.create_using_enroll_id),
			enroll_secret: resolve_field(template, component.create_using_enroll_secret),
			new_enroll_id: resolve_field(template, component.enroll_id),
			new_enroll_secret: resolve_field(template, component.enroll_secret),
			affiliation: resolve_field(template, component.affiliation) || '',
			type: resolve_field(template, component.id_type) || 'client',
			max_enrollments: resolve_field(template, component.max_enrollments) || -1,
			// i'm not adding tags to this guy, we store the body of build_enroll not build_register
		};
	};

	// build a body to enroll an enroll id
	exports.build_enroll_body = function (template, component, tx_id) {
		return {
			api_url: resolve_field(template, component.api_url) || resolve_field(template, component.url),	// also pull from legacy url field
			ca_name: resolve_field(template, component.ca_name),
			enroll_id: resolve_field(template, component.enroll_id),
			enroll_secret: resolve_field(template, component.enroll_secret),
			tags: append_tag(template, component, tx_id),
		};
	};

	// build a body to generate a msp
	exports.build_msp_body = function (template, component, tx_id) {
		const display_name = resolve_field(template, component.display_name);
		return {
			type: component.type,
			msp_id: resolve_field(template, component.msp_id),
			display_name: display_name,
			component_name: build_short_name(display_name),
			root_certs: resolve_array(template, component.root_certs),
			tls_root_certs: resolve_array(template, component.tls_root_certs),
			admins: resolve_array(template, component.admins),
			tags: append_tag(template, component, tx_id),
			fabric_node_ous: resolve_object(template, component.fabric_node_ous),
		};
	};

	// build a body to provision an orderer
	// hey there - when editing this its helpful to open fmt_body_athena_to_dep() too. build_orderer_body() happens first.
	exports.build_orderer_body = function (template, c_obj, tx_id) {
		const display_name = resolve_field(template, c_obj.display_name);
		const ret = {											// this gets ugly b/c we allow deployer's format (no underscores) and athenas (w/underscores)
			type: c_obj.type,
			msp_id: resolve_field(template, c_obj.msp_id),
			display_name: display_name,
			component_name: build_short_name(display_name),
			resources: build_resources_field(['orderer', 'proxy'], template, c_obj),
			storage: build_storage_field(['orderer'], template, c_obj),
			crypto: [],															// maybe its raft so init an array. if its not raft it gets cleared/reset anyway
			tags: append_tag(template, c_obj, tx_id),
			zone: resolve_field(template, (c_obj.zone)),
			arch: resolve_field(template, (c_obj.arch)),
		};

		const merged = t.fmt_crypto.fill_in_default_resources(ret);
		ret.resources = merged ? merged.resources : null;
		ret.storage = merged ? merged.storage : null;

		if (t.misc.is_populated_array(c_obj.crypto)) {
			for (let i in c_obj.crypto) {
				const eObj = c_obj.crypto[i].enrollment;						// enrollment object. rename for sanity, only the last entry in array sticks
				ret.crypto.push(build_config_body(template, c_obj.crypto[i]));	// raft? build each one
				ret._associated_enroll_id = resolve_field(template, (c_obj._associated_enroll_id || eObj.component.enroll_id || eObj.component.enrollid));
			}
			ret.orderer_type = ev.STR.RAFT;
			ret.cluster_name = resolve_field(template, c_obj.cluster_name);
		} else {
			const eObj = c_obj.crypto.enrollment;								// enrollment object. rename for sanity
			ret.crypto = build_config_body(template, c_obj.crypto);
			ret._associated_enroll_id = resolve_field(template, (c_obj._associated_enroll_id || eObj.component.enroll_id || eObj.component.enrollid));
			ret.orderer_type = ev.STR.SOLO;
		}
		return ret;

		// build a "crypto" field for body to provision an orderer or peer
		function build_config_body(template, crypto) {
			const eObj = crypto.enrollment;										// enrollment object. rename for sanity
			return {
				enrollment: {
					component: {
						cahost: resolve_field(template, eObj.component.ca_host || eObj.component.cahost),
						caport: resolve_field(template, eObj.component.ca_port || eObj.component.caport),
						caname: resolve_field(template, eObj.component.ca_name || eObj.component.caname),
						catls: {
							cacert: resolve_field(template, t.misc.safe_dot_nav(eObj, ['eObj.component.ca_tls.ca_cert', 'eObj.component.catls.cacert']))
						},
						enrollid: resolve_field(template, eObj.component.enroll_id || eObj.component.enrollid),
						enrollsecret: resolve_field(template, eObj.component.enroll_secret || eObj.component.enrollsecret),
						admincerts: resolve_array(template, eObj.component.admin_certs || eObj.component.admincerts),
					},
					tls: {
						cahost: resolve_field(template, eObj.tls.ca_host || eObj.tls.cahost),
						caport: resolve_field(template, eObj.tls.ca_port || eObj.tls.caport),
						caname: resolve_field(template, eObj.tls.ca_name || eObj.tls.caname),
						catls: {
							cacert: resolve_field(template, t.misc.safe_dot_nav(eObj, ['eObj.tls.ca_tls.ca_cert', 'eObj.tls.catls.cacert']))
						},
						enrollid: resolve_field(template, eObj.tls.enroll_id || eObj.tls.enrollid),
						enrollsecret: resolve_field(template, eObj.tls.enroll_secret || eObj.tls.enrollsecret),
						admincerts: resolve_array(template, eObj.tls.admin_certs || eObj.tls.admincerts),
						csr: {
							hosts: resolve_array(template, eObj.tls.csr.hosts)
						}
					}
				}
			};
		}
	};

	//--------------------------------------------------
	// build a body to provision an peer
	//--------------------------------------------------
	exports.build_peer_body = function (template, c_obj) {
		const peer_booty = exports.build_orderer_body(template, c_obj);			// same as orderer, for ths most part
		peer_booty.statedb = resolve_field(template, c_obj.db_type || c_obj.state_db || c_obj.statedb || 'couchdb');

		const storage_components = ['peer'];
		const resource_components = ['peer', 'proxy', 'dind'];
		if (peer_booty.statedb === ev.STR.LEVEL_DB) {							// add level
			storage_components.push(ev.STR.LEVEL_DB);
			resource_components.push(ev.STR.LEVEL_DB);
		} else {
			storage_components.push(ev.STR.COUCH_DB);							// add couch
			resource_components.push(ev.STR.COUCH_DB);
		}
		peer_booty.resources = build_resources_field(resource_components, template, c_obj);	// replace ref fields
		peer_booty.storage = build_storage_field(storage_components, template, c_obj);		// replace ref fields

		const merged = t.fmt_crypto.fill_in_default_resources(peer_booty);
		peer_booty.resources = merged.resources;
		peer_booty.storage = merged.storage;

		delete peer_booty.orderer_type;
		return peer_booty;
	};

	// build the resources field  - need to resolve_field in case the user used a by-reference value
	function build_resources_field(sub_components, template, c_obj) {
		const resources = {};
		for (let i in sub_components) {
			const name = sub_components[i];
			if (!resources[name]) {											// safe init
				resources[name] = {};
			}
			if (!resources[name].requests) {
				resources[name].requests = {};
			}

			const cpu = resolve_field(template, t.misc.safe_dot_nav(c_obj, 'c_obj.resources.' + name + '.requests.cpu'));
			const memory = resolve_field(template, t.misc.safe_dot_nav(c_obj, 'c_obj.resources.' + name + '.requests.memory'));
			if (cpu) {														// only add if we actually found something, deployer_lib will add defaults later
				resources[name].requests.cpu = cpu;
			}
			if (memory) {
				resources[name].requests.memory = memory;
			}
		}
		return resources;
	}

	// build the storage fields - need to resolve_field in case the user used a by-reference value
	function build_storage_field(sub_components, template, c_obj) {
		const storage = {};
		for (let i in sub_components) {
			const name = sub_components[i];
			if (!storage[name]) {											// safe init
				storage[name] = {};
			}

			const size = resolve_field(template, t.misc.safe_dot_nav(c_obj, 'c_obj.storage.' + name + '.size'));
			const storage_class = resolve_field(template, t.misc.safe_dot_nav(c_obj, 'c_obj.storage.' + name + '.class'));
			if (size) {														// only add if we actually found something, deployer_lib will add defaults later
				storage[name].size = size;
			}
			if (storage_class) {
				storage[name].class = storage_class;
			}
		}
		return storage;
	}

	//--------------------------------------------------
	// build the url helper fields for a built component
	//--------------------------------------------------
	function build_url_helper_fields(template, component_ref_id, url) {
		if (url) {
			const url_parts = typeof url === 'string' ? t.url.parse(url) : null;	// create url helper fields
			if (url_parts) {
				template[component_ref_id].protocol = url_parts.protocol;
				template[component_ref_id].hostname = url_parts.hostname;
				template[component_ref_id].port = url_parts.port;
			}
		}
	}

	//--------------------------------------------------
	//  handle fabric provision
	//--------------------------------------------------
	/* opts = {
		session: {},
		tx_id: {},
		template: {},
		body2send: {},
		_ref_id: "",
		debug: {
			on_step: 1,
			sent_bodies: [],
			deployer_resp: [],
		}
	}*/
	function handle_provision(opts, cb) {
		opts.debug.sent_bodies.push(opts.body2send);
		let failed_request = null;

		// retry deployer calls on 500 errors and a few others
		// note that deployer.provision component() will also retry the http call, so this try is kinda redundant!
		t.async.retry({
			times: 2,																	// total attempts
			interval: function (retryCount) {											// time **between** calls, first is not delayed
				const delay_ms = 10000 * retryCount + (Math.random() * 5000);
				logger.debug('[template] deployer error w/provision, will try attempt', retryCount, 'in +' + t.misc.friendly_ms(delay_ms));
				return delay_ms;														// back off between attempts
			}
		}, (done) => {
			failed_request = null;														// reset
			const c_rid = opts._ref_id;													// component's reference id
			t.deployer.provision_component({ body: opts.body2send, session: opts.session, params: {}, _max_attempts: 3 }, (errObj, ret) => {
				if (errObj) {															// error is already logged
					if (errObj.statusCode >= 409) {										// on deployer errors, eg 500's, try the req again
						return done(errObj);
					} else {															// if deployer does not like our request, eg 400/401/403, don't retry
						failed_request = errObj;										// remember our error
						return done(null);												// but return null (aka success) to async.retry (so we quit retrying)
					}
				} else if (!ret) {
					logger.error('[template] the provisioning "' + opts.body2send.type + '" response is unexpected [1]', typeof ret, ret);
					errObj = {
						statusCode: 500,
						msg: 'the provisioning "' + opts.body2send.type + '" response is unexpected [1]'
					};
					return done(errObj);
				} else if (!ret.athena_fmt || typeof ret.athena_fmt !== 'object') {
					logger.error('[template] the provisioning "' + opts.body2send.type + '" response is unexpected [2]', typeof ret.athena_fmt, ret.athena_fmt);
					errObj = {
						statusCode: 500,
						msg: 'the provisioning "' + opts.body2send.type + '" response is unexpected [2]'
					};
					return done(errObj);
				} else {
					opts.debug.deployer_resp.push(ret.deployer_resp);					// store debug on what deployer responded with

					// copy all fields in response! (this sets the actual comp id, etc..)
					if (!Array.isArray(ret.athena_fmt)) {
						for (let key in ret.athena_fmt) { opts.template[c_rid][key] = ret.athena_fmt[key]; }
					} else {
						opts.template[c_rid].bulk = ret.athena_fmt;						// raft + bulk components come back in an array
						for (let key in ret.athena_fmt[0]) { opts.template[c_rid][key] = ret.athena_fmt[0][key]; }	// copy like normal on first pos to get id..
					}

					build_url_helper_fields(opts.template, c_rid, ret.athena_fmt.api_url);	// create url helper fields
					if (opts.template[c_rid].pem && !opts.template[c_rid].tls_cert) {
						opts.template[c_rid].tls_cert = opts.template[c_rid].pem;		// template engine looks for this field in a ca
					}
					opts.template[c_rid]._associated_enroll_id = opts.body2send._associated_enroll_id;
					logger.info('[template] provisioning "' + opts.body2send.type + '" was successful.', opts.template[c_rid].api_url);
					return done(null);
				}
			});
		}, (err) => {
			const errObj = err || failed_request;										// bring back the error if we had one
			if (errObj) {
				logger.error('[template] - could not provision component via deployer. giving up', errObj);
			}
			return cb(errObj);
		});
	}

	//--------------------------------------------------
	// wait for the fabric component to start
	//--------------------------------------------------
	/* opts: {
		type: 'fabric-ca',						// cosmetic, used in logs
		url: "",								// proto + hostname + port of status api
		path: "/holly-smokes"					// path to use for status api
		desired_max_ms: 10000,					// timeout for all retries of the status api check
		timeout: 5000,							// timeout for a single status api check
	}*/
	function wait_for_component(opts, cb) {
		if (!opts.desired_max_ms || opts.desired_max_ms <= 0) {
			logger.debug('[template] not waiting for component to start', opts.type);
			return cb(null);
		} else if (!opts.url) {
			logger.debug('[template] not waiting for component to start (no url to wait on)', opts.type, opts.url);
			return cb(null);
		} else {
			opts.desired_max_ms = isNaN(opts.desired_max_ms) ? 90000 : Number(opts.desired_max_ms);
			const attempts = calc_max_attempts(opts.desired_max_ms);
			logger.debug('[template] waiting for component to start... max attempts:', attempts, opts.type, opts.url);

			t.async.retry({
				times: attempts,
				interval: function (retryCount) {					// time **between** calls, first is not delayed
					const delay = calc_next_delay(retryCount);
					logger.debug('[template] fabric polling attempt ' + retryCount + '/' + attempts + ', retry in +' + t.misc.friendly_ms(delay));
					return delay;
				}
			}, (done) => {
				logger.debug('[template] polling on', opts.type, opts.url + opts.path);
				const options = {
					method: 'GET',
					baseUrl: opts.url,								// url to the thing
					url: opts.path,									// use a dummy route on orderers/peers (should not exist)
					timeout: opts.timeout,
					rejectUnauthorized: false,						// self signed certs are okay
				};
				t.request(options, (err, resp) => {
					let code = t.ot_misc.get_code(resp);
					if (err || t.ot_misc.is_error_code(code)) {
						if (err && err.toString().indexOf('TIMEDOUT') >= 0) {
							logger.warn('[template] - could not reach component (timeout)', options.timeout, opts.type, code);
							return done('cannot reach component');
						} else {
							if (opts.type === 'fabric-ca') {		// ca's need to respond 200
								logger.debug('[template] - ca is alive, but unhealthy response', opts.type, code, err);
								return done('unexpected response');
							} else {
								// doesn't matter if error code, its responding === good to go
								logger.debug('[template] - component is alive', opts.type, code);
								return done(null);
							}
						}
					} else {
						let ret = resp ? resp.body : null;
						if (ret && typeof ret === 'string') {		// parse response if we can
							try {
								ret = JSON.parse(ret);
							} catch (e) { }
						}
						logger.debug('[template] - component is alive status code:', code, opts.type);
						return done(null, ret);
					}
				});
			}, (err, body) => {
				if (err) {
					logger.warn('[template] - could not reach component. giving up', opts.type);
				}
				return cb(err, body);
			});
		}

		function calc_next_delay(retryCount) {
			return 7000 + retryCount * 3 * 1000;			// back off in larger and larger increments
		}

		// calculate, roughly, how many iterations it takes to get to the desired max wait. weird function
		function calc_max_attempts(desired_max_ms) {
			let delay = opts.timeout;
			for (let loop = 0; loop < 100; loop++) {		// 100 is an insane upper bound, no higher
				delay += calc_next_delay(loop) + loop * opts.timeout;
				if (delay >= desired_max_ms * 0.8) {		// if we are within 20%, call it a day
					return loop + 1;
				}
			}
			return 100;
		}
	}

	//--------------------------------------------------
	// Build a template and create formatted response
	//--------------------------------------------------
	exports.build_template_and_respond = function (req, res) {
		const orig_template = JSON.parse(JSON.stringify(req.body));
		req.body.create_components = set_random_strings(req.body.create_components);	// replace all instances of $RANDOM & similar before we do any real work
		t.template.inspect_template(req.body, (errors, obj) => {
			if (errors && errors.length > 0) {
				logger.error('[template] errors with template', errors);
				res.status(400).json({ errors: errors, valid_template: false });	// respond with validation error
			} else {
				if (req.body.only_validate === true) {
					logger.info('[template] finished template request. only_validate: true');
					const ret = {
						message: 'ok',
						only_validate: req.body.only_validate,
						valid_template: true,
						resolved_components: obj.resolved_components,
						total_resources: obj.resources,
						total_steps: obj.total_steps,
					};
					res.status(200).json(t.misc.sortKeys(ret));							// respond with validation success
				} else {
					req._tx_id = t.misc.simpleRandomString(12).toLowerCase();			// make an id to track it's progress in the logs

					// create a webhook doc
					const data = {
						tx_id: req._tx_id,
						url: ev.HOST_URL + '/ak/api/v1/webhooks/txs/' + req._tx_id,		// send GET here to see status
						description: 'building a template request',
						athena_msg: 'starting template',
						by: t.misc.censorEmail(t.middleware.getEmail(req)),
						uuid: t.middleware.getUuid(req),
						on_step: 1,
						total_steps: obj.total_steps,
						original_template: orig_template,			// clone what was sent in
						client_webhook_url: req.body.client_webhook_url,
						sub_type: 'template',
						timeout_ms: obj.total_steps * 75 * 1000,		// estimate a timeout at xx ms per step
						channel_work: {									// added for Matt's channel work, used to track channel progress
							added2consortium: [],
							channels: null,
							status: 'waiting'
						}
					};
					t.webhook.store_webhook_doc(data, () => {
						const ret = {
							message: 'ok',
							tx_id: req._tx_id,
							poll_url: data.url,
							poll_method: 'GET',
							valid_template: true,
							only_validate: req.body.only_validate,
							total_steps: obj.total_steps,
						};
						res.status(202).json(t.misc.sortKeys(ret));						// reply now, DO NOT RETURN

						// ------ Do the real work ------ //
						obj.original_template = data.original_template;					// pass some data along
						obj.total_steps = data.total_steps;
						t.template.build_components_in_template(req, obj, () => {
							logger.info('[template] finished template request\n');
						});
					});
				}
			}
		});
	};

	//--------------------------------------------------
	// Build each component in a template - iter through all components and build each one
	//--------------------------------------------------
	exports.build_components_in_template = function (req, obj, cb) {
		const type_to_build_map = {};												// make a dictionary of the build component functions
		type_to_build_map[ev.STR.CA] = build_ca;									// these are all functions
		type_to_build_map[ev.STR.ENROLL_ID] = build_enroll_id;
		type_to_build_map[ev.STR.MSP] = build_msp;
		type_to_build_map[ev.STR.MSP_EXTERNAL] = build_msp;
		type_to_build_map[ev.STR.ORDERER] = build_orderer;
		type_to_build_map[ev.STR.PEER] = build_peer;

		const template = obj.by_ref_id;
		const debug = {
			on_step: 1,
			total_steps: obj.total_steps,
			tx_id: req._tx_id,
			sent_bodies: [],
			deployer_resp: [],
			resolved_components: obj.resolved_components,	// this is an array of component elements
			processed_template: template,					// this is an object of components by ref id
			original_template: obj.original_template,
		};
		t.async.eachSeries(req.body.create_components, (component, cb_built_component) => {
			if (!component || !component.type || typeof component.type !== 'string') {
				logger.error('[template] component "type" is missing. skipping. this should not happen.');
				return cb_built_component();
			} else {
				logger.debug('[template] on component "' + component._ref_id + '",', component.type);
				template[component._ref_id].created = false;						// initial value
				const build_function = type_to_build_map[component.type.toLowerCase()];

				// --------- Unknown Type --------- //
				if (build_function === null) {
					logger.error('[template] component "type" is not understood. skipping. this should not happen. "' + component.type + '"');
					return cb_built_component();
				}

				// --------- Build Known Type --------- //
				else {
					build_function(component, (e, r) => {
						debug.on_step++;											// increment step after the thing is built

						const name = template[component._ref_id].display_name || template[component._ref_id].enroll_id || template[component._ref_id].id;
						if (e) {
							debug.athena_msg = 'failed to add ' + t.misc.safe_str(template[component._ref_id].type) + ': ' + t.misc.safe_str(name);
						} else {
							debug.athena_msg = 'added a new ' + t.misc.safe_str(template[component._ref_id].type) + ': ' + t.misc.safe_str(name);
						}
						update_wh(debug, template[component._ref_id].id, () => {	// store the progress/notification doc
							return cb_built_component(e, r);
						});
					});
				}
			}
		}, (err) => {

			// ----- Template Failure :( ----- //
			if (err) {
				logger.error('[template] error in template building. stopping at step:', debug.sent_bodies.length, req._tx_id, err);
				debug.error = err;
				debug.final_template = template;
				store_template_debug(req, debug);
				const updates = {
					status: 'error',
					athena_msg: 'unable to build template. check server logs.'
				};
				t.webhook.edit_webhook(req._tx_id, updates);	// edit webhook doc, update status

				// --- Cleanup --- //
				if (obj.original_template.delete_all_on_failure === true) {
					logger.warn('[template] - cleaning up after failure. deleting all built components...', req._tx_id);
					const purge_req = {
						url: '/?force=yes',
						session: req.session,
						headers: req.headers,			// I don't think this is needed, but it can be provided
						params: {
							tag: req._tx_id				// delete all with matching tag
						}
					};
					t.deployer.bulk_deprovision_components(purge_req, () => {
						// there's not much use for the callback, nothing is waiting on completion
						logger.info('[template] - clean up after failure complete', req._tx_id);
					});
				}
			}

			// ----- Template Success :) ----- //
			else {
				logger.info('[template] all components built', req._tx_id);
				setTimeout(() => {		// delay the callback just a bit so this edit webhook() does not interfere with the prev edit on the prev component
					t.webhook.edit_webhook(req._tx_id, { status: 'success', athena_msg: 'template finished successfully' });
					debug.error = null;
					debug.final_template = template;
					store_template_debug(req, debug);
					return cb(null, debug.sent_bodies);
				}, 200);				// dsh i don't know if this delay is still needed...
			}
		});

		// do w/e we need to build a ca
		function build_ca(component, cb_built) {
			const opts = {
				session: req.session,
				tx_id: req._tx_id,
				template: template,
				body2send: exports.build_ca_body(template, component, req._tx_id),
				_ref_id: component._ref_id,
				debug: debug,
			};
			handle_provision(opts, (err) => {
				if (err) {
					if (err && template[component._ref_id]._fail_build_on_error === true) {
						logger.error('[template] - could not build ca. stopping template...');
						return cb_built(err);
					} else {
						logger.warn('[template] - could not build ca but template setting indicates we should keep going...');
						return cb_built(null);
					}
				} else {

					// ------- get the root cert ------- //
					const options = {
						type: component.type,
						url: component.api_url || component.url,
						path: '/cainfo',
						desired_max_ms: component._max_wait_ms,
						timeout: CA_TIMEOUT_MS,
					};
					wait_for_component(options, (started_error, ca_resp_body) => {
						template[component._ref_id].created = !started_error;

						if (ca_resp_body && ca_resp_body.result) {				// parse the ca response, copy it into "root_cert"
							if (ca_resp_body.result.CAChain) {
								template[component._ref_id].root_cert = ca_resp_body.result.CAChain;
							}
						}

						if (started_error && template[component._ref_id]._fail_build_on_error === true) {
							logger.error('[template] - could not reach ca. stopping template...');
							return cb_built(started_error);
						} else {

							// ------- now get the TLS root cert ------- //
							const options = {
								type: component.type,
								url: component.api_url || component.url,
								path: '/cainfo?ca=' + component.tlsca_name,
								desired_max_ms: component._max_wait_ms,
								timeout: 10000,									// tls wait is fixed, should not have to wait
							};
							wait_for_component(options, (started_error, ca_resp_body) => {
								template[component._ref_id].created = !started_error;

								if (ca_resp_body && ca_resp_body.result) {		// parse the tls ca response, copy it into "tls_root_cert"
									if (ca_resp_body.result.CAChain) {
										template[component._ref_id].tls_root_cert = ca_resp_body.result.CAChain;
									}
								}

								if (started_error && template[component._ref_id]._fail_build_on_error === true) {
									logger.error('[template] - could not reach tls ca. stopping template...');
									return cb_built(started_error);
								} else {
									return cb_built(null);
								}
							});
						}
					});
				}
			});
		}

		// do things to build a peer
		function build_peer(component, cb_built) {
			const opts = {
				session: req.session,
				tx_id: req._tx_id,
				template: template,
				body2send: exports.build_peer_body(template, component, req._tx_id),
				_ref_id: component._ref_id,
				debug: debug,
			};
			handle_provision(opts, (err) => {
				if (err) {								// error is already logged
					if (err && template[component._ref_id]._fail_build_on_error === true) {
						logger.error('[template] - could not build peer. stopping template...');
						return cb_built(err);
					} else {
						logger.warn('[template] - could not build peer but template setting indicates we should keep going...');
						return cb_built(null);
					}
				} else {
					const options = {
						type: component.type,
						url: component.api_url || component.url,
						path: '/holly-smokes',			// use a fake path, 404 http code means the proxy is alive
						desired_max_ms: component._max_wait_ms,
						timeout: NODE_TIMEOUT_MS,
					};
					wait_for_component(options, (started_error) => {
						template[component._ref_id].created = !started_error;
						if (started_error && template[component._ref_id]._fail_build_on_error === true) {
							logger.error('[template] - could not reach peer. stopping template...');
							return cb_built(started_error);
						} else {
							return cb_built(null);
						}
					});
				}
			});
		}

		// do things to build an orderer
		function build_orderer(component, cb_built) {
			const opts = {
				session: req.session,
				tx_id: req._tx_id,
				template: template,
				body2send: exports.build_orderer_body(template, component, req._tx_id),
				_ref_id: component._ref_id,
				debug: debug,
			};
			handle_provision(opts, (err) => {
				if (err) {								// error is already logged
					if (err && template[component._ref_id]._fail_build_on_error === true) {
						logger.error('[template] - could not build orderer. stopping template...');
						return cb_built(err);
					} else {
						logger.warn('[template] - could not build orderer but template setting indicates we should keep going...');
						return cb_built(null);
					}
				} else {
					const options = {
						type: component.type,
						url: component.api_url || component.url,
						path: '/holly-smokes',			// use a fake path, 404 http code means the proxy is alive
						desired_max_ms: component._max_wait_ms,
						timeout: NODE_TIMEOUT_MS,
					};
					wait_for_component(options, (started_error) => {
						template[component._ref_id].created = !started_error;
						if (started_error && template[component._ref_id]._fail_build_on_error === true) {
							logger.error('[template] - could not reach orderer. stopping template...');
							return cb_built(started_error);
						} else {
							return cb_built(null);
						}
					});
				}
			});
		}

		// do things to build an id
		function build_enroll_id(component, cb_built) {

			// first register the id (if we need to)
			if (component.create_using_enroll_id !== null && component.create_using_enroll_secret !== null) {
				handle_register(req, debug, template, component, (regErr) => {
					if (regErr) {
						return cb_built(regErr);
					} else {
						// dsh removed 09/27/2019 - new slogan: 1 component 1 step
						//debug.on_step++; 	// register + enroll is two steps (other step counted in build_* callback)

						// next enroll the id
						handle_enroll(req, debug, template, component, (errObj) => {
							template[component._ref_id].created = !errObj;
							return cb_built(errObj);
						});
					}
				});
			} else {

				// if its already registered, just enroll it
				handle_enroll(req, debug, template, component, (errObj) => {
					template[component._ref_id].created = !errObj;
					return cb_built(errObj);
				});
			}
		}

		// do things to build a msp
		function build_msp(component, cb_built) {
			const body = exports.build_msp_body(template, component, req._tx_id);
			debug.sent_bodies.push(body);

			const opts = {
				session: req.session,
				body: body,
				url: req.url,									// needed later to detect if this was a v2 route or not
				_fmt_response: true,
			};
			t.component_lib.onboard_component(opts, (errObj, ret) => {
				if (errObj) {																// error is already logged
					return cb_built(errObj);
				} else if (!ret || typeof ret !== 'object') {
					logger.error('[template] the msp generation response is unexpected', typeof ret, ret);
					return cb_built(errObj);
				} else {
					logger.info('[template] msp generation was successful');
					for (let key in ret) { template[component._ref_id][key] = ret[key]; }	// copy all fields
					build_url_helper_fields(template, component._ref_id, ret.api_url || ret.url);			// create helper fields
					template[component._ref_id].created = !errObj;
					return cb_built(null);
				}
			});
		}
	};

	//--------------------------------------------------
	// register the enroll id
	//--------------------------------------------------
	function handle_register(req, debug, template, component, cb_done) {
		const body = exports.build_register_body(template, component);
		debug.sent_bodies.push(body);

		// retry registration requests on errors
		t.async.retry({
			times: 2,																		// total attempts
			interval: function (retryCount) {												// time **between** calls, first is not delayed
				const delay_ms = 10000 * retryCount + (Math.random() * 5000);
				logger.debug('[template] ca error w/registration, will try attempt', retryCount, 'in +' + t.misc.friendly_ms(delay_ms));
				return delay_ms;															// back off between attempts
			}
		}, (done) => {
			t.ca_lib.register_id({ body: body, session: req.session }, (errObj, ret) => {
				if (errObj) {																// error is already logged
					return done(errObj);
				} else if (!ret || typeof ret !== 'object') {
					logger.error('[template] the register id response is unexpected', typeof ret, ret);
					return done(errObj);
				} else {
					logger.info('[template] registration of id was successful');
					for (let key in ret) { template[component._ref_id][key] = ret[key]; }	// copy all fields
					build_url_helper_fields(template, component._ref_id, ret.api_url || ret.url);		// create helper fields
					return done(null);
				}
			});
		}, (err) => {
			return cb_done(err);
		});
	}

	//--------------------------------------------------
	// enroll the id
	//--------------------------------------------------
	function handle_enroll(req, debug, template, component, cb_done) {
		const body = exports.build_enroll_body(template, component, req._tx_id);
		debug.sent_bodies.push(body);

		// retry enrollment requests on errors
		t.async.retry({
			times: 2,																		// total attempts
			interval: function (retryCount) {												// time **between** calls, first is not delayed
				const delay_ms = 10000 * retryCount + (Math.random() * 5000);
				logger.debug('[template] ca error w/enrollment, will try attempt', retryCount, 'in +' + t.misc.friendly_ms(delay_ms));
				return delay_ms;															// back off between attempts
			}
		}, (done) => {
			t.ca_lib.enroll({ body: body, session: req.session }, (errObj, ret) => {
				if (errObj) {																// error is already logged
					return done(errObj);
				} else if (!ret || typeof ret !== 'object') {
					logger.error('[template] the enroll response is unexpected', typeof ret, ret);
					return done(errObj);
				} else {
					logger.info('[template] enrollment was successful');
					for (let key in ret) { template[component._ref_id][key] = ret[key]; }	// copy all fields

					// dsh todo - this should move out so retry doesn't retry this part
					store_enrollment(req, ret, body, (err, enroll_doc) => {					// store it as well
						if (!err) {
							template[component._ref_id].id = enroll_doc._id;				// get athena id from component doc
						}
						return done(null);
					});
				}
			});
		}, (err) => {
			return cb_done(err);
		});
	}

	//--------------------------------------------------
	// store enrollment information
	//--------------------------------------------------
	function store_enrollment(req, resp, body, cb) {
		const user_id = t.middleware.getUuid(req);
		const doc = {
			short_name: body.enroll_id,
			private_key: resp.private_key,
			cert: resp.certificate,
			api_url: body.api_url,				// optional
			ca_name: body.ca_name,				// optional
			enroll_id: body.enroll_id,			// optional
			enroll_secret: body.enroll_secret,	// optional
			timestamp: Date.now(),
			user_id: user_id,
			type: ev.STR.ENROLL_ID,
			tags: body.tags || [],
		};
		t.otcc.createNewDoc({ db_name: ev.DB_COMPONENTS }, doc, (err_writeDoc, resp_writeDoc) => {
			if (err_writeDoc) {
				logger.error('[template] creating the enrollment doc', err_writeDoc);
			} else {
				logger.info('[template] creating the enrollment doc - success');
			}
			return cb(null, resp_writeDoc);
		});
	}

	//--------------------------------------------------
	// store template results
	//--------------------------------------------------
	/* doc: {
		error: null
		original_template: {},
		tx_id: "",
		sent_bodies: [],
		deployer_resp: [],
		final_template: {}
	}*/
	function store_template_debug(req, doc) {
		const user_id = t.middleware.getUuid(req);
		doc.timestamp = Date.now();
		doc.user_id = user_id;
		doc.type = 'template_debug';

		// actually write the key doc to the database
		t.otcc.createNewDoc({ db_name: ev.DB_COMPONENTS }, doc, (err_writeDoc, resp_writeDoc) => {
			if (err_writeDoc) {
				logger.error('[template] could not store template debug results');
			}
		});
	}

	//--------------------------------------------------
	// count the number of steps in a template json
	//--------------------------------------------------
	exports.count_steps = function (create_components) {
		let steps = 0;
		for (let i in create_components) {
			if (create_components[i].type === ev.STR.ENROLL_ID && create_components[i].create_using_enroll_id !== null) {
				//steps += 2;		// dsh removed 09/27/2019 - new slogan: 1 component 1 step
				steps += 1;
			} else {
				steps += 1;
			}
		}
		return steps + 1;			// add 1 more for "template cleanup + template is finished" step
	};

	//--------------------------------------------------
	// get all templates - native cloudant docs
	//--------------------------------------------------
	exports.get_all_template_docs = function (req, cb) {
		const opts = {
			db_name: ev.DB_COMPONENTS,
			_id: '_design/athena-v1',
			view: '_doc_types',
			SKIP_CACHE: (req.query.skip_cache === 'yes'),
			query: t.misc.formatObjAsQueryParams({ include_docs: true, key: 'template' }),
		};
		t.otcc.getDesignDocView(opts, (err, resp) => {
			if (err) {
				logger.error('[template] could not get all template docs', err);
				return cb(err, null);
			} else {
				const docs = [];
				if (resp) {
					for (let i in resp.rows) {
						if (resp.rows[i] && resp.rows[i].doc) {
							docs.push(resp.rows[i].doc);
						}
					}
				}
				return cb(null, docs);
			}
		});
	};

	//--------------------------------------------------
	// get all templates - formatted response
	//--------------------------------------------------
	exports.get_all_templates = function (req, cb) {
		exports.get_all_template_docs(req, (err, docs) => {
			if (err) {
				return cb(err, null);			// error already logged in get_all_template_docs
			} else {
				const ret = {
					message: 'ok',
					templates: docs,
				};
				for (let i in ret.templates) {
					ret.templates[i].id = ret.templates[i]._id;		// remove cloudant things
					delete ret.templates[i]._id;
					delete ret.templates[i]._rev;
					delete ret.templates[i].type;
				}
				return cb(null, t.misc.sortKeys(ret));
			}
		});
	};

	//--------------------------------------------------
	// store a template JSON in db
	//--------------------------------------------------
	exports.store_template_doc = function (req, cb) {
		t.template.inspect_template(req.body, (errors, obj) => {
			if (errors && errors.length > 0) {
				logger.error('[template] validation errors found in template data', errors);
				return cb({ statusCode: 400, msg: errors, valid_template: false });		// respond with validation error
			} else {
				req.body.type = 'template';												// force default doc type

				t.otcc.createNewDoc({ db_name: ev.DB_COMPONENTS, }, req.body, (err, doc) => {
					if (err) {
						logger.error('[template] could not write template doc', err);
						return cb(err, null);
					} else {
						const ret = {
							message: 'ok',
							stored: doc._id,
							valid_template: true
						};
						return cb(null, ret);
					}
				});
			}
		});
	};

	// fill in missing fields with the disclaimer place holder
	function fill_in_place_holders(obj) {
		const PLACE_HOLDER = '[POPULATED-LATER]';
		for (let i in obj) {
			if (typeof obj[i] === 'object') {
				if (obj[i] === null) {
					obj[i] = PLACE_HOLDER;
				} else {
					obj[i] = fill_in_place_holders(obj[i]);		// drill down
				}
			}
		}
		return obj;
	}

	// update webhook - important to store id that we build in the "note" field
	function update_wh(debug, component_id, cb) {
		const wh_data = {
			silent: true,
			status: 'pending',
			athena_msg: debug.athena_msg,
			note: { component_id: component_id },							// set the newly created component id here
			original_template: debug.original_template,
			processed_template: debug.processed_template,					// we need the resolved components to do associations in the ui
			on_step: debug.on_step,
		};
		t.webhook.edit_webhook(debug.tx_id, wh_data, () => {				// edit webhook doc, update step
			return cb();
		});
	}

	// calculate the total vpc usage
	function resource_summary(resolved_components_array) {
		const total = {
			cpus: 0,
			memory_bytes: 0,
			storage_bytes: 0,
			errors: []
		};
		for (let i in resolved_components_array) {
			const c_obj = resolved_components_array[i];
			for (let name in c_obj.resources) {
				const cpu = t.misc.safe_dot_nav(c_obj, 'c_obj.resources.' + name + '.requests.cpu');
				const memory = t.misc.safe_dot_nav(c_obj, 'c_obj.resources.' + name + '.requests.memory');
				if (t.misc.invalid_cpu_value(cpu)) {
					total.errors.push('invalid value for "resources.' + t.misc.safe_str(name) + '.cpu", in component position: "' + i +
						'". Try values similar to "250m" or "0.25".');
				}
				if (t.misc.invalid_bytes_value(memory)) {
					total.errors.push('invalid value for "resources.' + t.misc.safe_str(name) + '.memory" in component position: "' + i +
						'". Try values similar to "1GiB", or "1024MiB".');
				}
				total.cpus += t.misc.normalize_cpu(cpu);
				total.memory_bytes += t.misc.normalize_bytes(memory);
			}
			for (let name in c_obj.storage) {
				const storage = t.misc.safe_dot_nav(c_obj, 'c_obj.storage.' + name + '.size');
				if (t.misc.invalid_bytes_value(storage)) {
					total.errors.push('invalid value for "storage.' + t.misc.safe_str(name) + '.size", in component position: "' + i +
						'". Try values similar to "100GiB", or "102400MiB".');
				}
				total.storage_bytes += t.misc.normalize_bytes(storage);
			}
		}
		total.cpus = Number((Math.round(total.cpus * 1000) / 1000).toFixed(3));		// return number, rounded to 3 decimals places, truncate float error
		total.memory_friendly_units = t.misc.friendly_bytes(total.memory_bytes);
		total.storage_friendly_units = t.misc.friendly_bytes(total.storage_bytes);
		return total;
	}

	// add a new field where all lke resources are normalized to the same unit (use units: bytes, and cpus)
	function normalized_resources(resolved_components_array) {
		for (let i in resolved_components_array) {
			const c_obj = resolved_components_array[i];
			for (let name in c_obj.resources) {
				const cpu = t.misc.safe_dot_nav(c_obj, 'c_obj.resources.' + name + '.requests.cpu');
				const memory = t.misc.safe_dot_nav(c_obj, 'c_obj.resources.' + name + '.requests.memory');
				if (!c_obj.resources[name]._normalized_requests) {
					c_obj.resources[name]._normalized_requests = {};
				}

				c_obj.resources[name]._normalized_requests.cpus = t.misc.normalize_cpu(cpu);
				c_obj.resources[name]._normalized_requests.memory_bytes = t.misc.normalize_bytes(memory);
			}
			for (let name in c_obj.storage) {
				const storage = t.misc.safe_dot_nav(c_obj, 'c_obj.storage.' + name + '.size');
				c_obj.storage[name]._normalized_storage_bytes = t.misc.normalize_bytes(storage);
			}
		}
	}

	return exports;
};
