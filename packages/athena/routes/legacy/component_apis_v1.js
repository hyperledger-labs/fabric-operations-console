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
// LEGACY Component API Routes
//------------------------------------------------------------

module.exports = function (logger, ev, t) {
	const app = t.express.Router();

	//--------------------------------------------------
	// Import a component aka add a component
	//--------------------------------------------------
	app.post('/api/v1/components', t.middleware.verify_import_action_session, (req, res) => {
		add_component(req, res);
	});

	const component_urls = [
		'/ak/api/v1/components',							// this is the only one you need, but... lets
		'/ak/api/v1/components/ca',							// make a bunch of routes so we can doc each in its own swagger section
		'/ak/api/v1/components/orderer',
		'/ak/api/v1/components/peer',
		'/ak/api/v1/components/msp',
		'/ak/api/v1/components/msp-external',
		'/ak/api/v1/components/fabric-ca',					// more alternates...
		'/ak/api/v1/components/fabric-orderer',
		'/ak/api/v1/components/fabric-peer',
	];
	app.post(component_urls, t.middleware.verify_import_action_ak, (req, res) => {
		add_component(req, res);
	});

	function add_component(req, res) {
		t.ot_misc.legacy_warning(req);
		req.body.type = t.component_lib.find_type(req);
		req._fmt_response = true;
		t.component_lib.onboard_component(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	}

	//--------------------------------------------------
	// All components GET requests
	//--------------------------------------------------
	app.get('/api/v1/components', t.middleware.verify_view_action_session, (req, res) => {
		get_all_components_v1(req, res);
	});
	app.get('/ak/api/v1/components', t.middleware.verify_view_action_ak, (req, res) => {
		get_all_components_v1(req, res);
	});

	function get_all_components_v1(req, res) {
		t.ot_misc.legacy_warning(req);
		t.component_lib.get_all_components(req, (err, ret) => {
			if (t.ot_misc.get_code(err) === 222) {				// put it back to how the v1 response was, 200 code, empty array
				err = null;
				ret = {
					components: []
				};
			}

			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				for (let i in ret.components) {
					ret.components[i] = t.misc.sortKeys(t.comp_fmt.fmt_component_resp(req, ret.components[i]));
				}
				return res.status(200).json(ret.components);	// v1 expects a naked array response
			}
		});
	}

	//--------------------------------------------------
	// Edit an existing component
	//--------------------------------------------------
	app.put('/api/v1/components/:id', t.middleware.verify_import_action_session, (req, res) => {
		edit_component(req, res);
	});
	const edit_component_urls = [
		'/ak/api/v1/components/:id',					// this is the only one you need, but... lets
		'/ak/api/v1/components/ca/:id',					// make a bunch of routes so we can doc each in its own swagger section
		'/ak/api/v1/components/orderer/:id',
		'/ak/api/v1/components/peer/:id',
		'/ak/api/v1/components/msp/:id',
		'/ak/api/v1/components/msp-external/:id',
		'/ak/api/v1/components/fabric-ca/:id',			// more alternates...
		'/ak/api/v1/components/fabric-orderer/:id',
		'/ak/api/v1/components/fabric-peer/:id',
	];
	app.put(edit_component_urls, t.middleware.verify_import_action_ak, (req, res) => {
		edit_component(req, res);
	});

	function edit_component(req, res) {
		t.ot_misc.legacy_warning(req);
		t.component_lib.edit_component(req, (err, ret) => {
			if (err) {
				return res.status(t.ot_misc.get_code(err)).json(err);
			} else {
				return res.status(200).json(ret);
			}
		});
	}

	return app;
};
