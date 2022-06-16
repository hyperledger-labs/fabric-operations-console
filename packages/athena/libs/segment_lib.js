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
//=======================================================================================================
// A simplistic segment lib - api tracking
//=======================================================================================================
module.exports = (logger, ev, t) => {
	const exports = {};

	//-------------------------------------------------------------
	// send a 'Track' event to segment -  see: https://segment.com/docs/connections/sources/catalog/libraries/server/http-api/#track
	//-------------------------------------------------------------
	const track_action_http = (data, cb) => {
		const options = {
			method: 'POST',
			baseUrl: 'https://api.segment.io',
			url: '/v1/track',
			timeout: 15000,
			body: JSON.stringify(data),
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Basic ' + t.misc.b64(ev.SEGMENT_WRITE_KEY + ':'),
			}
		};
		t.request(options, (_, resp) => {
			if (t.ot_misc.is_error_code(t.ot_misc.get_code(resp))) {
				logger.error('[segment] error sending tracking data', t.ot_misc.get_code(resp));
				return cb(t.ot_misc.formatResponse(resp), null);
			} else {
				return cb(null, t.ot_misc.formatResponse(resp));
			}
		});
	};

	//-------------------------------------------------------------
	// build & send a 'Track' event
	//-------------------------------------------------------------
	exports.track_api = (req, res, json_resp, cb) => {
		const ip = (!req.ip || req.ip === '::1' || req.ip === '::ffff:127.0.0.1') ? 'localhost' : req.ip;
		const incoming_body = req.body ? req.body : {};						// init
		const lc_method = req.method ? req.method.toLowerCase() : '';		// FINE CHRIS

		if (!json_resp || typeof json_resp === 'string') {
			return cb();													// not a json response, skip segment tracking
		}

		// all data gets stringified, so anything with 'undefined' will be removed
		// check for schema validation with IBM's guidelines: https://segment-standards.w3bmix.ibm.com/events/read-object
		const base = {
			anonymousId: t.middleware.getUuid(req),				// segment-> requires "anonymousId" or "userId", passing our uuid of the guy performing the api
			properties: {																		// segment-> optional - free form data
				productTitle: 'Blockchain Platform v2',											// ibm->optional - name of our data
				tenantId: (ev.CRN && ev.CRN.instance_id) ? ev.CRN.instance_id : undefined,		// ibm->optional - IBM Cloud siid that owns this OpTools
				accountGuid: (ev.CRN && ev.CRN.account_id) ? ev.CRN.account_id : undefined,		// ibm->optional - IBM Cloud account id that owns this OpTools
				path: req._wildcard_path || req.path,											// ibm->optional - the http route that was called
				'meta.region': ev.REGION,														// ibm->optional - IBM Cloud region IBP is using to host OpTools
			},
			context: {										// segment-> optional - see https://segment.com/docs/connections/spec/common/#context
				ip: ip,										// the ip address of the client
				library: {
					name: 'ibp-segment',
					version: 'v1'
				},
				app: {

					// field name doesn't make sense b/c its mapped to ones we can use
					// (see: https://github.ibm.com/IBM-Blockchain/OpTools/issues/3821)
					name: t.ot_misc.detect_ak_route(req) ? 'user-api' : 'ui-api', 		// true if its a user api, false if its from the UI

					// field name doesn't make sense b/c its mapped to ones we can use
					// (see: https://github.ibm.com/IBM-Blockchain/OpTools/issues/3821)
					version: t.ot_misc.get_api_version(req),									// the OpTools api version that was called
				}

			},
			timestamp: new Date().toISOString()				// segment-> optional
		};

		let data = null;									// build the rest of the body for this type of action
		if (lc_method === 'post') {
			data = create_component(base, incoming_body);
		} else if (lc_method === 'delete') {
			data = delete_component(base, incoming_body);
		} else if (lc_method === 'put') {
			data = update_component(base, incoming_body);
		} else if (lc_method === 'get') {
			data = get_component(base, incoming_body);
		}

		// ---- Send the Track API ---- //
		track_action_http(data, (err, resp) => {
			return cb();
		});

		// -- Body builders -- //
		function create_component(base, body) {
			const component_type = t.component_lib.find_type(req) || undefined;
			base.event = 'Created Object';						// required - string
			base.properties.milestoneName = component_type ? ('Create ' + component_type) : undefined;
			base.properties.objectType = component_type || undefined;
			base.properties.object = build_obj_str(component_type, get_an_id());

			// field name doesn't make sense b/c its mapped to ones we can use
			// (see: https://github.ibm.com/IBM-Blockchain/OpTools/issues/3821)
			if (component_type === ev.STR.CA) {
				base.properties.category = t.misc.safe_dot_nav(body, [
					'body.configoverride.ca.db.type',
					'body.config_override.ca.db.type',
				]) || ev.STR.SQL_DB;									// ca's w/o config override default w/sqlite3
			} else if (component_type === ev.STR.PEER) {
				base.properties.category = t.misc.safe_dot_nav(body, [
					'body.state_db',
					'body.statedb',
				]) || ev.STR.COUCH_DB;									// peer's default state db is couch
			}

			// field name doesn't make sense b/c its mapped to ones we can use
			// (see: https://github.ibm.com/IBM-Blockchain/OpTools/issues/3821)
			base.properties.resultValue = t.misc.safe_dot_nav(body, ['body.replicas']) || 1;
			base.properties.resultValue = `replica-${base.properties.resultValue}`;

			// field name doesn't make sense b/c its mapped to ones we can use
			// (see: https://github.ibm.com/IBM-Blockchain/OpTools/issues/3821)
			base.properties.environment = Array.isArray(body.crypto) ? body.crypto.length :
				(Array.isArray(body.config) ? body.config.length : undefined);
			base.properties.environment = `raft-${base.properties.environment}`;

			// field name doesn't make sense b/c its mapped to ones we can use
			// (see: https://github.ibm.com/IBM-Blockchain/OpTools/issues/3825)
			base.properties.productId = (body && body.hsm && body.hsm.pkcs11endpoint) ? 'hsm-enabled' : 'hsm-disabled';

			return base;
		}

		function delete_component(base, body) {
			const component_type = build_comp_type();
			base.event = 'Deleted Object';						// required - string
			base.properties.milestoneName = component_type ? ('Delete ' + component_type) : undefined;
			base.properties.objectType = component_type || undefined;
			base.properties.object = build_obj_str(component_type, get_an_id());
			return base;
		}

		function update_component(base, body) {
			const component_type = build_comp_type();
			base.event = 'Updated Object';						// required - string
			base.properties.milestoneName = component_type ? ('Update ' + component_type) : undefined;
			base.properties.objectType = component_type || undefined;
			base.properties.object = build_obj_str(component_type, get_an_id());
			return base;
		}

		function get_component(base, body) {
			const component_type = build_comp_type();
			base.event = 'Read Object';							// required - string
			base.properties.milestoneName = component_type ? ('Get ' + component_type) : undefined;
			base.properties.objectType = component_type || undefined;
			base.properties.object = build_obj_str(component_type, get_an_id());
			return base;
		}

		// build the crn string as far as we can, it should describe the object that was created/read for segment
		function build_obj_str(type, id) {
			if (type === 'multiple components') {
				return ev.CRN_STRING = 'crn:' + ev.CRN.version +
					':' + ev.CRN.c_name +
					':' + ev.CRN.c_type +
					':' + ev.CRN.service_name +
					':' + ev.CRN.location +
					':' + ev.CRN.account_id +
					':' + ev.CRN.instance_id +
					'::';
			} else {
				return ev.CRN_STRING = 'crn:' + ev.CRN.version +
					':' + ev.CRN.c_name +
					':' + ev.CRN.c_type +
					':' + ev.CRN.service_name +
					':' + ev.CRN.location +
					':' + ev.CRN.account_id +
					':' + ev.CRN.instance_id +
					':' + type +
					':' + Math.abs(t.misc.hash_str(id));							// obscure the component ids
			}
		}

		function build_comp_type() {
			let type = null;
			if (json_resp && Array.isArray(json_resp.components)) {					// if its an array, its for multiple components
				type = 'multiple components';
			} else if (Array.isArray(json_resp)) {									// if its an array, its for multiple components
				type = 'multiple components';
			} else if (json_resp.deleted && Array.isArray(json_resp.deleted)) {
				type = 'multiple components';
			} else {
				type = t.component_lib.get_type_from_doc(json_resp) || undefined;	// single component, find the type
			}
			return type;
		}

		// get either the component id or the raft cluster's display name
		function get_an_id() {
			let id = json_resp ? json_resp.id : null;								// use component's id if its a single component
			if (json_resp && Array.isArray(json_resp) && json_resp[0]) {			// if its an array, its a raft cluster, get display name
				id = json_resp[0].display_name;										// use first orderer, all are the same
			}
			return id;
		}
	};

	return exports;
};
