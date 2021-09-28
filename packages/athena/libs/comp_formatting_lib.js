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
// comp_formatting_lib.js - Library functions for component formatting related tasks
//------------------------------------------------------------
module.exports = function (logger, ev, t) {
	const exports = {};
	const typeMap = {
		peer: ev.STR.PEER,
		ca: ev.STR.CA,
		orderer: ev.STR.ORDERER
	};

	//--------------------------------------------------
	// Format the component response (final formatting)
	//--------------------------------------------------
	exports.fmt_component_resp = function (req, doc, all_ca_info) {
		if (doc) {
			delete doc._rev;							// remove couch info

			if (doc._id) {
				doc.id = doc._id;						// copy id before delete
				doc.node_id = doc.id;					// copy for legacy field -.-
				delete doc._id;							// remove couch info
			}

			doc.type = t.component_lib.get_type_from_doc(doc);	// use legacy field -.-
			doc.node_type = doc.type;					// set legacy field ??
			doc.name = doc.name || doc.display_name || doc.short_name;	// "name" is another legacy field
			doc.display_name = doc.display_name || doc.name;
			doc.short_name = doc.short_name || doc.id;	// copy doc id to short name, [04/22/2019 short name and doc id are the same now]

			doc.tls_cert = doc.tls_cert || doc.pem;		// "pem" is legacy, tls_cert is the TLS certificate as b64 pem, needed for apollo
			doc.backend_addr = doc.api_url;				// build legacy field for apollo

			if (doc.type === ev.STR.CA) {
				doc.ca_url = doc.api_url || doc.ca_url;	// build legacy field for apollo

				if (t.ot_misc.is_v2plus_route(req) && t.component_lib.include_ca_data(req)) {
					if (all_ca_info && doc.id) {			// overwrite or append data that came from the CA
						const ca_info = all_ca_info[doc.id];
						if (ca_info) {
							doc.ca_name = ca_info.CAName;
							doc.root_cert = ca_info.CAChain;
							doc.fabric_version = ca_info.Version;
							doc.issuer_public_key = ca_info.IssuerPublicKey;
							doc.issued_known_msps = ca_info._issued_msps;
						}
					}
				}
			}

			//delete doc.dep_component_id;				// delete deployer field if found (07/17/2019 - lets let users see this, its helpful to map to k8s)
			delete doc.z_debug;							// delete deployer debug field if found
			delete doc.debug;							// delete deployer debug field if found (older field name)
			delete doc.prefix;							// delete deployer field if found

			if (!doc.scheme_version) { doc.scheme_version = 'v0'; } // unknown doc scheme
			doc.location = doc.location || '-';			// init field if dne
			if (doc.type === ev.STR.ORDERER) {
				doc.consenter_proposal_fin = (doc.consenter_proposal_fin === false) ? false : true;	// legacy docs should be set to `true`
				doc.system_channel_id = doc.system_channel_id || ev.SYSTEM_CHANNEL_ID;
			}

			if (t.ot_misc.detect_ak_route(req)) {
				if (doc.configoverride) {
					doc.config_override = JSON.parse(JSON.stringify(doc.configoverride));	// copy to rename it
					delete doc.configoverride;			// remove legacy name
				}
				doc = exports.redact_ak(req, doc);
			}

			// redact enroll id/secret (legacy code stored these fields, new code does not)
			delete doc.enroll_id;
			delete doc.enroll_secret;
			delete doc.tls_enroll_id;
			delete doc.tls_enroll_secret;

			// handle legacy singular field, its now plural
			doc.tls_ca_root_certs = t.misc.forced_array(doc.tls_ca_root_certs || doc.tls_ca_root_cert);
			delete doc.tls_ca_root_cert;

			parse_certs();											// adds parsed fields to the doc

			if (doc.ecert && doc.ecert.cert) {						// move "cert" up (legacy) - do this move before v3/v2 fmt logic
				doc.ecert = doc.ecert.cert;
			}
			if (t.ot_misc.is_v3plus_route(req)) {
				fmt_v3();											// v3 response format
			} else if (t.ot_misc.is_v2plus_route(req)) {
				fmt_v2();											// v2 response format
			} else {
				fmt_v1();											// v2 response format
			}

			// remove fields that deployer is managing unless they were asked for (common v2 & v3)
			if (t.ot_misc.is_v2plus_route(req) && !t.component_lib.include_deployment_data(req)) {
				delete doc.resources;
				delete doc.resource_warnings;
				delete doc.storage;
				delete doc.version;
				delete doc.zone;
				delete doc.state_db;
				delete doc.region;
				delete doc.dep_component_id;
				delete doc.certs;
				delete doc.last_k8s_sync_ts;
				delete doc.node_ou;
				delete doc.crypto;
			}

			// add to the doc the CA that issued this MSP
			if (doc.type === ev.STR.MSP) {
				if (all_ca_info && t.ot_misc.is_v2plus_route(req) && t.component_lib.include_ca_data(req)) {
					doc.issued_by_ca_id = find_ca_id();
				}
			}
		}
		return doc;										// don't sort here, sort right before responding


		// parse fields for certs details, each field is an array of strings - puts parsed data in doc
		function parse_certs() {
			if (t.component_lib.include_parsed_certs(req)) {		// parse msp certificate array fields if they were asked for
				doc.tls_cert_parsed = t.ot_misc.parseCertificate(doc.tls_cert);

				const cert_array_names = ['admin_certs', 'ca_root_certs', 'tls_ca_root_certs'];
				for (let i in cert_array_names) {
					const field_name = cert_array_names[i];
					if (doc[field_name]) {
						doc[field_name + '_parsed'] = [];
						for (let i in doc[field_name]) {
							doc[field_name + '_parsed'].push(t.ot_misc.parseCertificate(doc[field_name][i]));
						}
					}
				}
			}
		}

		// find the ca id that issued this msp's root cert
		function find_ca_id() {
			if (all_ca_info && doc.id) {
				for (let id in all_ca_info) {
					for (let pos in all_ca_info[id]._issued_msps) {
						if (all_ca_info[id]._issued_msps[pos] && all_ca_info[id]._issued_msps[pos].id === doc.id) {
							return id;
						}
					}
				}
			}
			return 'unknown';
		}

		// format changes unique to a v1 response
		function fmt_v1() {
			if (!Array.isArray(doc.admin_certs)) {
				if (doc.type === ev.STR.PEER || doc.type === ev.STR.ORDERER) {
					doc.admin_certs = [];							// init to show we attempted to return this field
				}
			}
		}

		// format changes unique to a v2 response
		function fmt_v2() {
			if (t.component_lib.include_parsed_certs(req)) {		// add the parsed data if asked for
				doc.root_certs_parsed = doc.ca_root_certs_parsed;
				doc.tls_root_certs_parsed = doc.tls_ca_root_certs_parsed;
				doc.admins_parsed = doc.admin_certs_parsed;
			} else {
				delete doc.tls_cert_parsed;
			}

			// parse tls certificate if parsed certs was asked for (v2)
			if (doc.tls_cert && doc.tls_cert_parsed) {
				delete doc.tls_cert_parsed.base_64_pem;				// remove b/c it's now redundant
			}

			// undefined values will not make it to our json response, so make it undefined if you don't want to see it
			if (doc.type !== ev.STR.MSP) {
				doc.tls_ca_root_cert = Array.isArray(doc.tls_ca_root_certs) ? doc.tls_ca_root_certs[0] : undefined;
			}

			// delete the internal field names (they are duplicates now)
			delete doc.ca_root_certs_parsed;
			delete doc.tls_ca_root_certs_parsed;
			delete doc.admin_certs_parsed;
			delete doc.tls_ca_root_certs;
			delete doc.ca_root_certs;

			// remove fields that deployer is managing unless they were asked for (v2)
			if (!t.component_lib.include_deployment_data(req)) {
				delete doc.admin_certs;
				delete doc.admin_certs_parsed;
				delete doc.ecert;
			} else {
				if (typeof doc.ecert === 'string') {
					doc.ecert = { cert: doc.ecert };				// put it back to legacy format
				}
				if (!Array.isArray(doc.admin_certs)) {
					if (doc.type === ev.STR.PEER || doc.type === ev.STR.ORDERER) {
						doc.admin_certs = [];						// init to show we attempted to return this field
					}
				}
			}
		}

		// format changes unique to a v3 response
		function fmt_v3() {
			if (doc.type === ev.STR.MSP) {				// msp's do not get any extra formatting, yet
				return;
			}

			doc.msp = {
				ca: {
					root_certs: doc.ca_root_certs,
				},
				tlsca: {
					root_certs: doc.tls_ca_root_certs,
				},
				component: {
					tls_cert: doc.tls_cert,
					ecert: doc.ecert,
					admin_certs: doc.admin_certs,
				}
			};

			if (doc.tlsca_name) {						// move internal field to v3 location
				doc.msp.tlsca.name = doc.tlsca_name;
				delete doc.tlsca_name;
			}
			if (doc.ca_name) {							// move internal field to v3 location
				doc.msp.ca.name = doc.ca_name;
				delete doc.ca_name;
			}

			if (!doc.msp.ca.root_certs && !doc.msp.ca.name) {	// remove empty fields
				delete doc.msp.ca;
			}
			if (!doc.msp.tlsca.root_certs && !doc.msp.tlsca.name) {
				delete doc.msp.tlsca;							// remove empty fields
			}

			if (t.component_lib.include_parsed_certs(req)) {
				doc.msp.ca.root_certs_parsed = doc.ca_root_certs_parsed;
				doc.msp.tlsca.root_certs_parsed = doc.tls_ca_root_certs_parsed;
				doc.msp.component.admin_certs_parsed = doc.admin_certs_parsed;
				doc.msp.component.tls_cert_parsed = doc.tls_cert_parsed;
			}

			// delete the internal field names (they are duplicates now)
			delete doc.tls_ca_root_certs;
			delete doc.ca_root_certs;
			delete doc.tls_cert;
			delete doc.ecert;
			delete doc.admin_certs;
			delete doc.ca_root_certs_parsed;
			delete doc.tls_ca_root_certs_parsed;
			delete doc.admin_certs_parsed;
			delete doc.tls_cert_parsed;

			if (doc.type !== ev.STR.PEER && doc.type !== ev.STR.ORDERER) {	// only peers and orderers have an ecert
				delete doc.msp.component.ecert;
			}
			if (doc.type === ev.STR.CA) {									// CA's do not have admin certs
				delete doc.msp.component.admin_certs;
			}

			// remove fields that deployer is managing unless they were asked for (v3)
			if (!t.component_lib.include_deployment_data(req)) {
				delete doc.msp.component.admin_certs;
				delete doc.msp.component.admin_certs_parsed;
				delete doc.msp.component.ecert;
			} else {
				if (!Array.isArray(doc.msp.component.admin_certs)) {
					if (doc.type === ev.STR.PEER || doc.type === ev.STR.ORDERER) {
						doc.msp.component.admin_certs = [];					// init to show we attempted to return this field
					}
				}
			}
		}
	};

	// ---------------------------------------
	// build the request data to onboard a component to athena - (rename, init & build fields)
	// (this is not the doc format, yet, its gathering all the data to work with the onboard component api logic)
	// ---------------------------------------
	/*
		opts: {
			req2dep: {},
			req2athena: {},
			depRespBody: {},

			debug_tx_id: "",
			component_type: "peer" || "ca" || "orderer"
			cluster_id: "",
			node_i: 1,
			consenter_proposal_fin: true
		}
	*/
	exports.build_component_req_body = (opts) => {
		opts = opts ? opts : {};													// init
		const req2dep = opts.req2dep;												// rename var (easier refactor)
		const req2athena = opts.req2athena;											// rename var (easier refactor)
		const dep_resp_body = opts.depRespBody;										// rename var (easier refactor)
		const incoming_body = req2athena ? req2athena.body : null;					// the request body to athena
		const outgoing_body = req2dep ? req2dep.body : null;						// the request body to deployer

		// don't use the raw dep_resp_body after this line, use the conformed field names
		const conformed_dep_resp = exports.conform_deployer_field_names(null, dep_resp_body);

		// strip secrets and conform the override field
		incoming_body.config_override = exports.redact_enroll_details(incoming_body.config_override || incoming_body.configoverride);

		const component_doc = {														// common fields to all nodes go here
			type: typeMap[opts.component_type],
			display_name: req2dep.body.parameters ? req2dep.body.parameters.display_name : null,
			location: ev.STR.LOCATION_IBP_SAAS,
			msp_id: req2dep.body.orgname,
			api_url: conformed_dep_resp.api_url,									// the real url to interact w/the component
			operations_url: conformed_dep_resp.operations_url,						// fabric's ops url
			grpcwp_url: conformed_dep_resp.grpcwp_url,								// grpc web proxy url
			dep_component_id: conformed_dep_resp.dep_component_id,					// need this when we delete the component
			admin_certs: conformed_dep_resp.admin_certs,
			resources: conformed_dep_resp.resources,
			storage: conformed_dep_resp.storage,
			version: conformed_dep_resp.version,									// fabric version
			resource_warnings: conformed_dep_resp.resource_warnings,				// warnings from kubernetes
			tags: [typeMap[opts.component_type], ev.STR.LOCATION_IBP_SAAS],
			arch: conformed_dep_resp.arch || outgoing_body.arch || incoming_body.arch,
			tls_ca_root_certs: [req2athena._tls_ca_root_cert] || conformed_dep_resp.tls_ca_root_certs,
			tls_cert: conformed_dep_resp.tls_cert,									// do not overwrite this w/body input, only deployer has the right value
			node_ou: conformed_dep_resp.node_ou,
			ecert: conformed_dep_resp.ecert,
			ca_root_certs: conformed_dep_resp.conformed_dep_resp,

			//config: incoming_body.config,											// athena doesn't need the field, its private
			//crypto: incoming_body.crypto,											// athena doesn't need the field, its private
			config_override: incoming_body.config_override,
			zone: conformed_dep_resp.zone || outgoing_body.zone || incoming_body.zone,			// modified below if array
			region: conformed_dep_resp.region || outgoing_body.region || incoming_body.region,	// modified below if array
			hsm: incoming_body.hsm,													// this outer hsm field holds the proxy endpoint

			z_debug: {
				// store for debug
				req_body_to_athena: exports.redact_enroll_details(req2athena ? req2athena.body : null), // only body, do not store headers (b/c cookies)
				req_to_dep: exports.redact_enroll_details(req2dep),
				resp_from_dep: exports.redact_enroll_details(dep_resp_body),
				tx_id: opts.debug_tx_id,
			}
		};

		// grab this component's data from the array. applies to fields: zone, region, config_override
		const array_fields = ['zone', 'region', 'config_override'];
		for (let i in array_fields) {
			const field_name = array_fields[i];
			if (Array.isArray(incoming_body[field_name])) {							// zone is an array for raft orderers
				if (opts.node_i && component_doc[field_name][opts.node_i]) {		// if index exists, copy it, this entry is this guy's data
					component_doc[field_name] = incoming_body[field_name][opts.node_i];
				} else if (component_doc[field_name][0]) {							// else default to first entry
					component_doc[field_name] = incoming_body[field_name][0];
				}
			}
		}

		// add ca specific fields here
		if (opts.component_type === 'ca') {
			component_doc.ca_name = conformed_dep_resp.ca_name;
			component_doc.tlsca_name = conformed_dep_resp.tlsca_name;
			//component_doc.enroll_id = req2dep.body.caadmin ? req2dep.body.caadmin.user : null;			// removed 08/15 - security reasons
			//component_doc.enroll_secret = req2dep.body.caadmin ? req2dep.body.caadmin.password : null;	// removed 08/15 - security reasons
			component_doc.replicas = incoming_body.replicas;
			delete component_doc.tls_ca_root_cert;	// ca's root cert is not in req2athena. user can use ca_attrs=included to see root cert on a GET
			delete component_doc.tls_ca_root_certs;	// ca's root cert is not in req2athena. user can use ca_attrs=included to see root cert on a GET
		}

		// add peer specific fields here
		else if (opts.component_type === 'peer') {
			component_doc.state_db = incoming_body.db_type || incoming_body.state_db || incoming_body.statedb;
		}

		// add orderer specific fields here
		else if (opts.component_type === 'orderer') {
			component_doc.orderer_type = req2dep.body.orderertype || req2dep.body.orderer_type;
			if (!component_doc.orderer_type) {
				component_doc.orderer_type = ev.STR.SOLO;							// default
			}
			if (opts.node_i) {														// if its a multi node raft cluster..
				// node_i is 0 index, increment by 1 b/c end users don't like 0 indexes...
				const display_name_root = component_doc.display_name || (incoming_body ? incoming_body.cluster_name : 'Unnamed');
				component_doc.display_name = display_name_root + ev.STR.SUFFIX_DELIMITER + (Number(opts.node_i) + 1);	// make individual raft id unique
			}
			if (incoming_body.cluster_id || opts.cluster_id) {
				component_doc.cluster_id = incoming_body.cluster_id || opts.cluster_id;	// its in body if appending, generated when making a new cluster
			}
			if (opts.consenter_proposal_fin === false || opts.consenter_proposal_fin === true) {	// add if found
				component_doc.consenter_proposal_fin = opts.consenter_proposal_fin;
			}
			component_doc.system_channel_id = incoming_body.system_channel_id;

			// simon doesn't like that the value was "raft" in the input body, and is "etcdraft" in get responses, put it back
			component_doc.orderer_type = (component_doc.orderer_type === ev.STR.RAFT) ? ev.STR.ATHENA_RAFT : component_doc.orderer_type;
		} else {
			return null;															// unknown component_type
		}

		// build tags
		if (incoming_body && t.misc.is_populated_array(incoming_body.tags)) {		// add custom tags if present
			component_doc.tags = component_doc.tags.concat(incoming_body.tags);
		}
		if (component_doc.cluster_id) {
			component_doc.tags.push(component_doc.cluster_id);						// always add this tag
		}
		component_doc.tags = t.component_lib.fmt_tags(component_doc.tags);			// format and remove duplicates

		// capture other body fields
		if (outgoing_body) {
			if (outgoing_body.cluster_name) {
				component_doc.cluster_name = outgoing_body.cluster_name;
			}
		}

		return component_doc;
	};

	// ------------------------------------------
	// format body for deployer - translates the athena spec to the deployer spec
	// check deployer's wiki: https://github.ibm.com/IBM-Blockchain/blockchain-deployer/blob/master/docs/ibp2.0_apis.md#add-component
	// ------------------------------------------
	exports.fmt_body_athena_to_dep = function (incoming_req, taken_ids, available_vers_by_type) {
		const incoming_body = incoming_req ? incoming_req.body : null;

		if (!incoming_body) {
			return null;
		} else {
			logger.debug('[deployer lib] formatting athena body for a deployer component api');
			const ret = {
				type: incoming_body.type,								// not needed by deployer, but cleaner for us if its in here
				orgname: incoming_body.orgname || incoming_body.msp_id,	// convert "msp_id" to "orgname"
				crypto: exports.fmt_crypto(incoming_body.crypto || incoming_body.config),
				parameters: incoming_body.parameters || {},				// pass through field to deployer, fields set here will be in deployer response
			};

			if (incoming_body.name || incoming_body.display_name) {		// replace "name" with "parameters.display_name"
				ret.parameters.display_name = incoming_body.display_name || incoming_body.name;
			}

			let crypto_len = null;
			if (incoming_body.crypto && Array.isArray(incoming_body.crypto)) {
				crypto_len = incoming_body.crypto.length;
			} else if (incoming_body.config && Array.isArray(incoming_body.config)) {	// "config" is a legacy field name
				crypto_len = incoming_body.config.length;
			}

			// if we set dep_component_id we will use it in the API route to deployer, and dep will name the component w/this id
			// if we don't, deployer will make up its own id
			const comp_id = make_subdomain(incoming_body.component_name || ret.parameters.display_name, incoming_body.id);
			if (comp_id) { ret.dep_component_id = comp_id; }			// only add it if we built one

			// merge default and desired resource/storage values
			const merged = exports.fill_in_default_resources(incoming_body, available_vers_by_type);
			ret.resources = merged ? merged.resources : null;			// (optional) add if found
			ret.storage = merged ? merged.storage : null;				// (optional) add if found
			for (let sub_component in ret.resources) {					// copy "requests" to "limits" - the UI does not let users customize each
				if (!ret.resources[sub_component].limits) {				// if limits not provided, copy requests (this will trip on 0 too, thats fine)
					ret.resources[sub_component].limits = ret.resources[sub_component].requests;
				}
			}
			if (ret.resources) {
				ret.resources = t.misc.conform_bytes(ret.resources);
			}
			if (ret.storage) {
				ret.storage = t.misc.conform_bytes(ret.storage);
			}

			if (incoming_body.enroll_id) {								// replace "enroll_id" with "caadmin.user"
				ret.caadmin = {
					user: incoming_body.enroll_id,
					password: incoming_body.enroll_secret
				};
			}

			if (incoming_body.db_type || incoming_body.state_db || incoming_body.statedb) {	// (optional) add if found
				ret.statedb = incoming_body.db_type || incoming_body.state_db || incoming_body.statedb;
			}
			if (incoming_body.system_channel_name || incoming_body.systemchannelname) {		// (optional) add if found
				ret.systemchannelname = incoming_body.system_channel_name || incoming_body.systemchannelname;
			}
			if (incoming_body.version) {									// (optional) add if found
				ret.version = incoming_body.version;
			}
			ret.hsm = incoming_body.hsm || undefined;

			// raft fields
			if (incoming_body.orderer_type || incoming_body.orderertype || incoming_body.ordererType) {	// (optional) add if found
				ret.orderertype = incoming_body.orderer_type || incoming_body.orderertype || incoming_body.ordererType;
				if (t.deployer.typeMapA2D[ret.orderertype]) {
					ret.orderertype = t.deployer.typeMapA2D[ret.orderertype];	// if it matches, convert athena type to deployer
				}

				if (incoming_body.cluster_id) {
					ret.cluster_id = incoming_body.cluster_id;				// deployer doesn't care about this field, but provision_component needs it
				}
				if (incoming_body.cluster_name) {
					ret.cluster_name = incoming_body.cluster_name;			// deployer doesn't care about field, but provision_component should send it
				}
				if (incoming_body.append === true || incoming_body.external_append === true) {
					ret.append = true;
				}
				ret.system_channel_id = incoming_body.system_channel_id;
			}

			if (crypto_len !== null) {
				ret.number = crypto_len;
			}
			if (incoming_body.zone) {													// might be array if multi cluster && raft node
				ret.zone = incoming_body.zone;
				if (crypto_len !== null) {
					ret.zone = build_array(crypto_len, ret.zone);						// build array of zones
				}
			}
			if (incoming_body.region) {													// might be array if multi cluster && raft node
				ret.region = incoming_body.region;
				if (crypto_len !== null) {
					ret.region = build_array(crypto_len, ret.region);					// build array of regions
				}
			}
			if (incoming_body.arch) {													// dhyey says still a string 08/02/19
				ret.arch = incoming_body.arch;
			}
			if (incoming_body.node_ou) {
				ret.nodeou = {															// deployer can now handle booleans...
					enabled: (incoming_body.node_ou.enabled === true || incoming_body.node_ou.enabled === 'true') ? true : false
				};
			}

			// these only apply to CA's
			if (incoming_body.type === ev.STR.CA) {
				ret.cname = incoming_body.c_name || incoming_body.cname || ret.parameters.display_name || 'ca';		// common name
				ret.cnametls = incoming_body.cname_tls || incoming_body.cnametls || (ret.cname + '-tls');
				const regex_ws = new RegExp(/[\s]/g);
				ret.cname = ret.cname.replace(regex_ws, '');
				ret.cnametls = ret.cnametls.replace(regex_ws, '');

				// received legacy input format, build config override from enroll id/secret
				if (incoming_body.enroll_id && incoming_body.enroll_secret) {
					incoming_body.config_override = build_ca_config_override_from_legacy();
				}
			}

			if (incoming_body.config_override || incoming_body.configoverride) {			// fabric's config yaml override (its still json)
				ret.configoverride = incoming_body.config_override || incoming_body.configoverride;
				if (ret.configoverride.ca && !ret.configoverride.tlsca) {					// copy user input from ca to tlsca if not already available
					ret.configoverride.tlsca = ret.configoverride.ca;
				}
			}

			if (incoming_body.msp) {
				ret.msp = incoming_body.msp;
			}
			if (incoming_body.replicas >= 0) {
				ret.replicas = !isNaN(incoming_body.replicas) ? Number(incoming_body.replicas) : 0;
			}
			if (Array.isArray(incoming_body.admin_certs)) {
				ret.admincerts = incoming_body.admin_certs;
			}

			return JSON.parse(JSON.stringify(ret));												// deep copy to get rid of undefined fields
		}

		// legacy - build config override safely from enroll_id && enroll_secret
		function build_ca_config_override_from_legacy() {
			logger.warn('[legacy warning] legacy input detected, building config override from enroll_id and enroll_secret');
			let config_override = incoming_body.config_override || incoming_body.configoverride;

			if (!config_override) {									// safely init config override all the way down to identities
				config_override = {};
			}
			if (!config_override.ca) {
				config_override.ca = {};
			}
			if (!config_override.ca.registry) {
				config_override.ca.registry = {};
			}
			if (!config_override.ca.registry.identities) {
				config_override.ca.registry.identities = [];
			}
			if (!config_override.ca.registry.maxenrollments) {
				config_override.ca.registry.maxenrollments = -1;
			}

			config_override.ca.registry.identities.push({			// assuming user wants the provided id and secret to work, so append it
				name: incoming_body.enroll_id,						// user's input goes here
				pass: incoming_body.enroll_secret,					// user's input goes here
				type: 'client',
				affiliation: '',
				attrs: {
					'hf.Registrar.Roles': '*',
					'hf.Registrar.DelegateRoles': '*',
					'hf.Revoker': true,
					'hf.IntermediateCA': true,
					'hf.GenCRL': true,
					'hf.Registrar.Attributes': '*',
					'hf.AffiliationMgr': true
				}
			});

			return config_override;
		}

		// build an array that is the same length as "crypto" (as long as crypto is an array)
		function build_array(size, array_field) {
			if (typeof array_field === 'string') {							// convert to array of 1 string
				array_field = [array_field];
			}
			if (!Array.isArray(array_field) || array_field.length === 0) {	// give up, return nothing to get defaults
				return null;
			}
			if (size === null) {											// give up, return unchanged value
				return array_field;
			}

			const ret = [];
			let index2copy = 0;
			for (let i = 0; i < size; i++) {
				if (array_field[i]) {								// if this index exist, copy that index
					index2copy = i;
				}													// if it dne, use the last index that did
				ret.push(array_field[index2copy]);
			}
			return ret;
		}

		// make a subdomain that deployer can use (it will form part of the hostname for the component) - do not pad it
		function make_subdomain(display_name, id) {
			if (id) {
				return id;											// do not edit or generate the id if provided - ansible needs this, UI won't use it
			}

			const regex_dep_id = new RegExp(/[^a-zA-Z0-9]/g);		// deployer cannot handle underscores or dashes
			let combined_taken_ids = (taken_ids && Array.isArray(taken_ids.deployer_ids)) ? taken_ids.deployer_ids : [];
			if (taken_ids && Array.isArray(taken_ids.doc_ids)) {
				combined_taken_ids = combined_taken_ids.concat(taken_ids.doc_ids);
			}
			const opts = {
				id_str: typeof display_name === 'string' ? display_name.toLowerCase() : null,	// check as lowercase, (lc makes a cleaner url)
				taken_ids: combined_taken_ids,
				safe_prefix: 'ibp',
				limit: 64											// 64 limit is made up, seems like a good idea - dsh
			};
			let deployer_id = t.component_lib.build_id(opts);		// build a athena unique id
			if (!deployer_id) { return null; }						// if there were no valid characters give up and let deployer pick something
			deployer_id = deployer_id.replace(regex_dep_id, '');	// remove symbols
			deployer_id = deployer_id.toLowerCase().trim();			// lowercase again incase build_id did something, lc makes a cleaner url

			if (opts && opts.taken_ids && opts.taken_ids.includes(deployer_id)) {			// if its still taken, screw it
				deployer_id = null;
			}

			if (!deployer_id) {
				return t.misc.simpleRandomString(ev.MIN_SHORT_NAME_LENGTH).toLowerCase();	// fail safe, always return some id
			} else {
				return deployer_id;
			}
		}
	};

	// ------------------------------------------
	// format the crypto field to deployer spec - works with v2 and v3 athena spec
	// ------------------------------------------
	exports.fmt_crypto = (crypto) => {
		if (Array.isArray(crypto)) {						// orderers apis will set crypto as an array, iter and format each
			for (let i in crypto) {
				crypto[i] = format_obj(crypto[i]);
			}
		} else {
			crypto = format_obj(crypto);					// peer apis will not set crypto as an array
		}
		return crypto;

		// format the athena spec to the deployer spec for the field "crypto" aka config
		function format_obj(obj) {
			if (!obj) {
				return obj;
			} else if (obj.msp) {
				return JSON.parse(JSON.stringify({
					msp: {
						component: {						// the first path in safe_dot_nav is for v3 spec, the 2nd is for v2
							keystore: t.misc.safe_dot_nav(obj, ['obj.msp.component.ekey', 'obj.msp.component.keystore']) || '',
							signcerts: t.misc.safe_dot_nav(obj, ['obj.msp.component.ecert', 'obj.msp.component.signcerts']) || '',
							admincerts: t.misc.safe_dot_nav(obj, ['obj.msp.component.admin_certs', 'obj.msp.component.admincerts']) || [],
							cacerts: t.misc.safe_dot_nav(obj, ['obj.msp.ca.root_certs', 'obj.msp.component.cacerts']) || [],
							intermediatecerts: t.misc.safe_dot_nav(obj, ['obj.msp.ca.intermediate_certs', 'obj.msp.component.intermediatecerts']) || [],
						},
						tls: {
							keystore: t.misc.safe_dot_nav(obj, ['obj.msp.component.tls_key', 'obj.msp.tls.keystore']) || '',
							signcerts: t.misc.safe_dot_nav(obj, ['obj.msp.component.tls_cert', 'obj.msp.tls.signcerts']) || '',
							cacerts: t.misc.safe_dot_nav(obj, ['obj.msp.tlsca.root_certs', 'obj.msp.tls.cacerts']) || [],
							intermediatecerts: t.misc.safe_dot_nav(obj, ['obj.msp.tlsca.intermediate_certs', 'obj.msp.tls.intermediatecerts']) || [],
						},
						clientauth: build_client_auth_obj(obj)
					}
				}));
			} else if (obj.enrollment) {
				const port = t.misc.safe_dot_nav(obj, ['obj.enrollment.ca.port', 'obj.enrollment.component.caport']);
				const tls_caport = t.misc.safe_dot_nav(obj, ['obj.enrollment.tlsca.port', 'obj.enrollment.tls.caport']);
				return JSON.parse(JSON.stringify({
					enrollment: {							// the first path in safe_dot_nav is for v3 spec, the 2nd is for v2
						component: {
							cahost: t.misc.safe_dot_nav(obj, ['obj.enrollment.ca.host', 'obj.enrollment.component.cahost']),
							caport: port ? port.toString() : null,						// deployer wants the number as a string
							caname: t.misc.safe_dot_nav(obj, ['obj.enrollment.ca.name', 'obj.enrollment.component.caname']),
							catls: {
								cacert: t.misc.safe_dot_nav(obj, ['obj.enrollment.ca.tls_cert', 'obj.enrollment.component.catls.cacert']) || '',
							},
							enrollid: t.misc.safe_dot_nav(obj, ['obj.enrollment.ca.enroll_id', 'obj.enrollment.component.enrollid']),
							enrollsecret: t.misc.safe_dot_nav(obj, ['obj.enrollment.ca.enroll_secret', 'obj.enrollment.component.enrollsecret']),
							admincerts: t.misc.safe_dot_nav(obj, ['obj.enrollment.component.admin_certs', 'obj.enrollment.component.admincerts']) || [],
						},
						tls: {
							cahost: t.misc.safe_dot_nav(obj, ['obj.enrollment.tlsca.host', 'obj.enrollment.tls.cahost']),
							caport: tls_caport ? tls_caport.toString() : null,			// deployer wants the number as a string
							caname: t.misc.safe_dot_nav(obj, ['obj.enrollment.tlsca.name', 'obj.enrollment.tls.caname']),
							catls: {
								cacert: t.misc.safe_dot_nav(obj, ['obj.enrollment.tlsca.tls_cert', 'obj.enrollment.tls.catls.cacert']) || '',
							},
							enrollid: t.misc.safe_dot_nav(obj, ['obj.enrollment.tlsca.enroll_id', 'obj.enrollment.tls.enrollid']),
							enrollsecret: t.misc.safe_dot_nav(obj, ['obj.enrollment.tlsca.enroll_secret', 'obj.enrollment.tls.enrollsecret']),
							csr: {
								hosts: t.misc.safe_dot_nav(obj, ['obj.enrollment.tlsca.csr_hosts', 'obj.enrollment.tls.csr.hosts']) || [],
							}
						}
					}
				}));
			} else {
				logger.warn('[deployer lib] "crypto" format not understood. one of these fields should be found: "crypto.msp", "crypto.enrollment"');
				return obj;
			}
		}

		// only return the client object if one of the two fields is set
		function build_client_auth_obj(obj) {
			let client_auth_obj = undefined;
			const client_auth_type = t.misc.safe_dot_nav(obj, ['obj.msp.component.client_auth.type', 'obj.msp.clientauth.type']);
			const client_auth_tls_certs = t.misc.safe_dot_nav(obj, ['obj.msp.component.client_auth.tls_certs', 'obj.msp.clientauth.certfiles']) || [];

			if (client_auth_type || (Array.isArray(client_auth_tls_certs) && client_auth_tls_certs.length > 0)) {	// one must be set
				client_auth_obj = {
					type: client_auth_type || undefined,
					certfiles: client_auth_tls_certs
				};
			}
			return client_auth_obj;
		}
	};

	// ------------------------------------------
	// build default resource values for components if input does not have a desired value
	// ------------------------------------------
	exports.fill_in_default_resources = (orig, available_vers_by_type) => {
		const type_to_bundle_map = {
			'fabric-ca': ['ca'],
			'fabric-orderer': ['orderer', ev.STR.C_PROXY],
			'fabric-peer': ['peer', ev.STR.C_PROXY] /*'couchdb', 'leveldb', 'dind', 'chaincodelauncher', 'fluentd' */	// couch or level gets added lower
		};

		const lc_type = (orig && orig.type) ? orig.type.toLowerCase() : '?';
		if (!orig || !type_to_bundle_map[lc_type]) {
			return orig;
		} else {
			const incoming_body = JSON.parse(JSON.stringify(orig));

			// add the sub-component names to the bundle map for this type of component
			if (lc_type === ev.STR.PEER) {
				const state_db = incoming_body.state_db || incoming_body.statedb;
				if (state_db && state_db.toLowerCase() === ev.STR.LEVEL_DB) {						// add level or couch db to array if peer
					type_to_bundle_map['fabric-peer'].push(ev.STR.LEVEL_DB);
				} else {
					type_to_bundle_map['fabric-peer'].push(ev.STR.COUCH_DB);
				}

				// init version to the one in body
				// if version dne, use the default version in the available versions from deployer
				let version_to_use = t.misc.safe_dot_nav(incoming_body, ['orig.version']);
				if (!version_to_use) {
					version_to_use = t.ot_misc.find_default_version(available_vers_by_type, lc_type);
					if (version_to_use) {
						logger.debug('[defaults] using default fabric version for creation:', version_to_use, lc_type);
					}
				}

				if (t.ot_misc.is_fabric_v2({ version: version_to_use })) {							// add cc launcher if its fabric v2 or higher
					logger.debug('[defaults] detecting v2 fabric comp, adding defaults');
					type_to_bundle_map['fabric-peer'].push(ev.STR.C_CC_LAUNCHER);
				} else {
					logger.debug('[defaults] detecting v1 fabric comp, adding defaults');
					type_to_bundle_map['fabric-peer'].push(ev.STR.C_DIND);
					type_to_bundle_map['fabric-peer'].push(ev.STR.C_FLUENTD);
				}

				// resources
				// deployer doesn't want "statedb" in the resources field
				if (incoming_body.resources && incoming_body.resources.statedb) {
					if (state_db && state_db.toLowerCase() === ev.STR.LEVEL_DB) {
						incoming_body.resources[ev.STR.LEVEL_DB] = JSON.parse(JSON.stringify(incoming_body.resources.statedb));	// rename & break reference
					} else {
						incoming_body.resources[ev.STR.COUCH_DB] = JSON.parse(JSON.stringify(incoming_body.resources.statedb));	// rename & break reference
					}
					delete incoming_body.resources.statedb;
				}
			}

			// iter on bundle map and fill in defaults for each sub-component field
			for (let i in type_to_bundle_map[lc_type]) {											// iter on each sub-component
				const comp_abr = type_to_bundle_map[lc_type][i];									// get the abbreviation of the component

				if (!ev.THE_DEFAULT_RESOURCES_MAP[comp_abr]) {
					logger.error('[defaults] woa this should not happen. field in default resources dne:', comp_abr);
					continue;
				}

				const cpu_resources = t.misc.safe_dot_nav(incoming_body, 'incoming_body.resources.' + comp_abr + '.requests.cpu');
				const memory_resources = t.misc.safe_dot_nav(incoming_body, 'incoming_body.resources.' + comp_abr + '.requests.memory');
				const storage_resources = t.misc.safe_dot_nav(incoming_body, 'incoming_body.storage.' + comp_abr + '.size');
				if (cpu_resources === null || memory_resources === null) {
					if (!incoming_body.resources) {													// safe init
						incoming_body.resources = {};
					}
					if (!incoming_body.resources[comp_abr]) {
						incoming_body.resources[comp_abr] = {};
					}
					if (!incoming_body.resources[comp_abr].requests) {
						incoming_body.resources[comp_abr].requests = {};
					}

					if (ev.THE_DEFAULT_RESOURCES_MAP[comp_abr].cpu && cpu_resources === null) {			// make sure sub-comp has a default cpu field first
						incoming_body.resources[comp_abr].requests.cpu = ev.THE_DEFAULT_RESOURCES_MAP[comp_abr].cpu;
					}
					if (ev.THE_DEFAULT_RESOURCES_MAP[comp_abr].memory && memory_resources === null) {	// make sure sub-comp has a default memory field first
						incoming_body.resources[comp_abr].requests.memory = ev.THE_DEFAULT_RESOURCES_MAP[comp_abr].memory;
					}
				}

				if (ev.THE_DEFAULT_RESOURCES_MAP[comp_abr].storage && storage_resources === null) { 	// make sure sub-comp has a default disk field first
					if (!incoming_body.storage) {														// safe init
						incoming_body.storage = {};
					}
					if (!incoming_body.storage[comp_abr]) {
						incoming_body.storage[comp_abr] = {};
					}
					incoming_body.storage[comp_abr].size = ev.THE_DEFAULT_RESOURCES_MAP[comp_abr].storage;
				}
			}

			// storage
			// dep doesn't want storage to use `couchdb` or `leveldb` keys... only `statedb`! (unlike `resources`)
			if (incoming_body.storage && incoming_body.storage[ev.STR.COUCH_DB]) {
				if (!incoming_body.storage.statedb) {						// if its already set, don't use the defaults
					incoming_body.storage.statedb = JSON.parse(JSON.stringify(incoming_body.storage[ev.STR.COUCH_DB]));	// rename & break reference
				}
				delete incoming_body.storage[ev.STR.COUCH_DB];
			}
			if (incoming_body.storage && incoming_body.storage[ev.STR.LEVEL_DB]) {
				if (!incoming_body.storage.statedb) {						// if its already set, don't use the defaults
					incoming_body.storage.statedb = JSON.parse(JSON.stringify(incoming_body.storage[ev.STR.LEVEL_DB]));	// rename & break reference
				}
				delete incoming_body.storage[ev.STR.LEVEL_DB];
			}

			return incoming_body;
		}
	};

	// ------------------------------------------
	// format component's data - includes deployer's component data if available (which contains deployment attributes)
	// ------------------------------------------
	/*
		opts: {
			deployer_data: {}, 				// [optional] - deployer data on the component
			component_doc: {} 				// [required] - athena component doc
			all_ca_info: {					// [optional]
				ca1: {
					CAName: "",
					CAChain: "",
					IssuerPublicKey: "",
					_issued_msps: [{}]		// not from the CA itself.. athena built this field
				}
			}
		}
	*/
	// dsh todo - you can't run this back to back, which sucks, it would be helpful to not care how many times this runs
	exports.fmt_comp_resp_with_deployer = function (req, opts) {
		if (!opts) { opts = {}; }		// init
		let doc2use = opts.component_doc;

		if (opts.deployer_data) {
			const deployersData = exports.conform_deployer_field_names(req, opts.deployer_data);
			let fmt = t.deployer.deployer_has_a_different_value(opts.component_doc, deployersData);
			if (fmt.differences.length > 0) {
				doc2use = fmt.doc; 													// fmt.differences is empty if deployer had the same data as athena
			}
		}

		doc2use = exports.fmt_component_resp(req, doc2use, opts.all_ca_info);		// format athena's doc

		// parse and format admin certs
		if (doc2use && doc2use.admin_certs && t.component_lib.include_parsed_certs(req)) {
			const admin_certs_parsed = [];
			const fmt_admin_certs = [];

			for (let i in doc2use.admin_certs) {					// augment cert array with more cert data
				const temp = t.ot_misc.parseCertificate(doc2use.admin_certs[i]);
				if (!temp) {
					// malformed error already logged
				} else {
					fmt_admin_certs.push(temp.base_64_pem);
					if (t.ot_misc.is_v2plus_route(req)) {
						delete temp.base_64_pem;					// remove b/c it's now redundant
					}
					admin_certs_parsed.push(temp);
				}
			}

			if (t.ot_misc.is_v2plus_route(req)) {					// v2 puts the parsed cert data in a different field
				doc2use.admin_certs = fmt_admin_certs;
				doc2use.admin_certs_parsed = admin_certs_parsed;
			} else {
				doc2use.admin_certs = admin_certs_parsed;			// v1 puts the parsed certs in the normal field
			}
		}

		return t.misc.sortKeys(doc2use);
	};

	// ------------------------------------------
	// take a deployer response and make it use athena field names
	// find current field names in deployer code: https://github.ibm.com/ibp/deployer/blob/release-2.5.0/deployer/components/orderer/api/api.go#L73
	// ------------------------------------------
	exports.conform_deployer_field_names = (req, dep_data) => {
		const ret = {};
		if (dep_data) {
			const dep_api_url = t.misc.safe_dot_nav(dep_data, ['dep_data.endpoints.api']);
			const dep_grpcwp_url = t.misc.safe_dot_nav(dep_data, ['dep_data.endpoints.grpcweb']);
			const dep_operations_url = t.misc.safe_dot_nav(dep_data, ['dep_data.endpoints.operations']);
			const dep_tls_ca_root_certs = t.misc.safe_dot_nav(dep_data, ['dep_data.msp.tls.cacerts']);		// array
			const dep_ca_root_certs = t.misc.safe_dot_nav(dep_data, ['dep_data.msp.component.cacerts']);	// array
			const dep_admin_certs = t.misc.safe_dot_nav(dep_data, ['dep_data.msp.component.admincerts', 'dep_data.admincerts']);

			let dep_tls_cert = t.misc.safe_dot_nav(dep_data, [
				'dep_data.msp.tls.signcerts',					// v3 deployer api spec
				'dep_data.tls.cert',							// v2 deployer api spec
				'dep_data.certs.tls.signcerts'					// legacy - very old deployers
			]);
			if (Array.isArray(dep_tls_cert) && dep_tls_cert[0]) {
				dep_tls_cert = dep_tls_cert[0];					// legacy deployer field had it as an array, but lets conform it to just 1 certificate...
			}

			ret.resources = t.misc.safe_dot_nav(dep_data, [
				'dep_data.individualResources',				// this one list "resources" by a key also, (by sub-components name) (in new and old deployer)
				'dep_data.deployed_individualResources',	// this one list "resources" by a key, (by sub-components name) (this is only in the old deployer)
				'dep_data.resource_details.individualResources',	// this one might be legacy, unsure, cannot find example in the wild
				'dep_data.resources',						// this one does not have sub-component keys (in new and old deployer)
			]);
			ret.resource_warnings = dep_data.resource_warnings;
			ret.storage = t.misc.safe_dot_nav(dep_data, ['dep_data.storage', 'dep_data.resource_details.storage']);
			ret.version = t.misc.safe_dot_nav(dep_data, ['dep_data.version', 'dep_data.resource_details.version']);
			ret.zone = dep_data.zone;
			ret.state_db = dep_data.statedb;
			ret.region = dep_data.region;
			ret.dep_component_id = dep_data.name;
			//ret.certs = dep_data.certs;		// 02/11/2020 legacy field, old get-tls cert from the pre-created orderer api `certs.tls.signcerts["cert here"]`
			ret.ca_name = dep_data.ca_name;
			ret.tlsca_name = dep_data.tlsca_name;
			ret.replicas = t.misc.safe_dot_nav(dep_data, ['dep_data.replicas', 'dep_data.resource_details.replicas']) || undefined;
			ret.config_override = dep_data.configoverride;
			ret.cr_status = dep_data.crstatus;
			ret.arch = dep_data.arch;
			ret.node_ou = dep_data.nodeou;
			ret.tls_ca_root_certs = t.misc.forced_array(dep_tls_ca_root_certs);
			ret.ca_root_certs = t.misc.forced_array(dep_ca_root_certs);
			ret.ecert = t.misc.safe_dot_nav(dep_data, [
				'dep_data.msp.component.signcerts',				// v3 deployer api spec
				'dep_data.ecert.cert',							// v2 deployer api spec
			]) || undefined;									// ca's won't have one, set to undefined to have the field removed
			ret.crypto = dep_data.crypto;

			// undefined values will not make it to our json response, so make it undefined if you don't want to see it
			ret.admin_certs = (Array.isArray(dep_admin_certs) && dep_admin_certs.length > 0) ? dep_admin_certs : undefined;

			if (dep_api_url) { ret.api_url = dep_api_url; }
			if (dep_grpcwp_url) { ret.grpcwp_url = dep_grpcwp_url; }
			if (dep_operations_url) { ret.operations_url = dep_operations_url; }
			if (dep_tls_cert) { ret.tls_cert = dep_tls_cert; }
		}

		return remap_resources_and_storage(ret);		// last but not least, map the resource and storage fields to athena spec
	};

	// ------------------------------------------
	// format deployer data - do NOT add all athena data to deployer data (a few athena fields will be copied)
	// ------------------------------------------
	/*
		opts: {
			deployer_data: {							// required
				"comp_id": {deployer doc},
			},
			athena_docs: [{athena doc}]					// optional
		}
	*/
	exports.format_deployer_component_data = function (req, opts) {
		const ret = { components: [] };
		if (opts) {
			for (let id in opts.deployer_data) {		// iter on DEPLOYER components
				const athena_doc = find_athena_doc(id, opts.athena_docs);

				// pass in the deployer doc data for this component, and some athena data
				const options = {
					deployer_data: opts.deployer_data[id],		// deployer data
					component_doc: {							// only copy minimal fields (this api responds with few athena  details)
						_id: athena_doc ? athena_doc._id : undefined,
						display_name: athena_doc ? athena_doc.display_name : undefined,
						type: t.component_lib.get_type_from_doc(athena_doc) || undefined,
						_error: athena_doc ? undefined : 'Unknown component to the IBP Console. This indicates an orphaned kubernetes deployment.',
					},
				};
				ret.components.push(exports.fmt_comp_resp_with_deployer(req, options));
			}
		}

		// alpha sort components
		ret.components.sort(sortComponents);
		return ret;

		function find_athena_doc(id, athena_docs) {
			for (let i in athena_docs) {
				if (athena_docs[i].dep_component_id === id) {
					return athena_docs[i];
				}
			}
			return null;
		}
	};

	// ------------------------------------------
	// format athena docs - add deployer data to athena docs if we have it
	// ------------------------------------------
	/*
		opts: {
			deployer_data: {						// optional
				"comp_id": {deployer doc},
			},
			athena_docs: [{athena doc}]				// required
			all_ca_info: {							// optional
				"comp_id": <ca info results>,
			}
		}
	*/
	exports.format_athena_component_data = function (req, opts) {
		const ret = { components: [] };
		if (opts) {
			for (let i in opts.athena_docs) {			// iter on ATHENA components
				const athena_doc = opts.athena_docs[i];
				const deployer_component_id = athena_doc ? athena_doc.dep_component_id : null;

				// pass in the deployer data, and the athena doc for this component
				if (athena_doc) {
					const options = {
						deployer_data: opts.deployer_data ? opts.deployer_data[deployer_component_id] : null,
						component_doc: athena_doc,
						all_ca_info: opts.all_ca_info,
					};
					ret.components.push(exports.fmt_comp_resp_with_deployer(req, options));
				}
			}
		}

		// alpha sort components
		ret.components.sort(sortComponents);
		return ret;
	};

	// alpha sort components
	function sortComponents(a, b) {		// a & b are guaranteed to exist chris
		const a_name = a.display_name ? a.display_name : '?';
		const a_id = a.id ? a.id : a.dep_component_id;

		const b_name = b.display_name ? b.display_name : '?';
		const b_id = b.id ? b.id : b.dep_component_id;

		const textA = (a_name + a_id).toUpperCase();
		const textB = (b_name + b_id).toUpperCase();
		return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
	}

	// ------------------------------------------
	// remove all occurrences of enroll ids and enroll secrets from a json object - (no matter how deep they are)
	// ------------------------------------------
	exports.redact_enroll_details = (obj) => {
		if (!obj || typeof obj !== 'object') {											// its not json, nothing to redact
			return null;
		}

		try {
			let str = JSON.stringify(obj);
			str = str.replace(/"enrollid":"[^"]+"/g, '"enrollid": "[redacted]"');		// deployer peers/orderers use enrollid and enrollsecret
			str = str.replace(/"enrollsecret":"[^"]+"/g, '"enrollsecret": "[redacted]"');
			str = str.replace(/"enroll_id":"[^"]+"/g, '"enroll_id": "[redacted]"');		// athena peers/orderers use enrollid and enrollsecret
			str = str.replace(/"enroll_secret":"[^"]+"/g, '"enroll_secret": "[redacted]"');
			str = str.replace(/"name":"[^"]+"/g, '"name": "[redacted]"');				// CAs use name and pass....
			str = str.replace(/"pass":"[^"]+"/g, '"pass": "[redacted]"');
			return JSON.parse(str);
		} catch (e) {
			logger.warn('[deployer lib] error when redacting secrets from json... returning nothing', e);
			return null;
		}
	};

	// un-map resource fields names from deployer spec to athena spec
	function remap_resources_and_storage(dep_body) {
		if (!dep_body) {
			return null;
		} else {
			if (dep_body.resources && dep_body.resources.couchdb) {										// if given couchdb, create statedb
				dep_body.resources.statedb = JSON.parse(JSON.stringify(dep_body.resources.couchdb));	// copy it, athena response contains resources.statedb
				if (typeof dep_body.resources.couchdb === 'object') {									// add warning msg on get-component responses
					dep_body.resources.couchdb.msg = 'legacy field, reference "statedb" instead';
				}
			}

			if (dep_body.storage && dep_body.storage.couchdb) {											// if given couchdb, create statedb
				dep_body.storage.statedb = JSON.parse(JSON.stringify(dep_body.storage.couchdb));		// copy it, athena response contains storage.statedb
				if (typeof dep_body.storage.couchdb === 'object') {										// add warning msg on get-component responses
					dep_body.storage.couchdb.msg = 'legacy field, reference "statedb" instead';
				}
			}
		}
		return dep_body;
	}

	// ---------------------------------------
	// remove fields that are confusing users and only apollo needs
	// ---------------------------------------
	exports.redact_ak = function (req, component) {
		if (component) {
			delete component.url2use;
			delete component.short_name;
			delete component.node_type;
			delete component.node_id;
			delete component.backend_addr;
			delete component.ca_url;
			delete component.pem;
			delete component.name;
			delete component.db_type;
			delete component.configoverride;
			delete component.system_channel_data;
			delete component.crypto;

			if (!t.ot_misc.is_v2plus_route(req)) {
				delete component.config_override;			// let users see this in v2 - users can set it now
			}
		}
		return component;
	};

	// ------------------------------------------
	// build an action body for deployer - athena spec to deployer
	// ------------------------------------------
	exports.build_action_body_str = (obj) => {
		const actions = {
			restart: (obj.restart === true) ? true : undefined,
			renew: {
				tlscert: (obj.renew && obj.renew.tls_cert === true) ? true : undefined,
			},
			reenroll: {
				tlscert: (obj.reenroll && obj.reenroll.tls_cert === true) ? true : undefined,
				ecert: (obj.reenroll && obj.reenroll.ecert === true) ? true : undefined,
			},
			enroll: {
				ecert: (obj.enroll && obj.enroll.ecert === true) ? true : undefined,
				tlscert: (obj.enroll && obj.enroll.tls_cert === true) ? true : undefined,
			},
			upgradedbs: (obj.upgrade_dbs === true) ? true : undefined,
		};
		if (!actions.renew.tlscert) {
			delete actions.renew;
		}
		if (!actions.reenroll.tlscert && !actions.reenroll.ecert) {
			delete actions.reenroll;
		}
		if (!actions.enroll.ecert && !actions.enroll.tlscert) {
			delete actions.enroll;
		}
		return JSON.stringify({ actions: actions });		// when we stringify it we will drop the `undefined` fields
	};

	return exports;
};
