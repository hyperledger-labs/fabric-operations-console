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
// LEGACY Deployer API Routes
//------------------------------------------------------------
module.exports = (logger, ev, t) => {
	const app = t.express.Router();

	//--------------------------------------------------
	// Create a component via a deployer request
	//--------------------------------------------------
	app.post('/api/saas/v1/components', t.middleware.verify_create_action_session, (req, res) => {
		provision(req, res);
	});

	const component_urls = [
		'/ak/api/v1/kubernetes/components',
		'/ak/api/v1/kubernetes/components/ca',
		'/ak/api/v1/kubernetes/components/orderer',
		'/ak/api/v1/kubernetes/components/peer',
		'/ak/api/v1/kubernetes/components/fabric-ca',
		'/ak/api/v1/kubernetes/components/fabric-orderer',
		'/ak/api/v1/kubernetes/components/fabric-peer',
	];
	app.post(component_urls, t.middleware.verify_create_action_ak, (req, res) => {
		provision(req, res);
	});

	function provision(req, res) {
		t.ot_misc.legacy_warning(req);
		req.body.type = t.component_lib.find_type(req);

		t.deployer.provision_component(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				res.status(200).json(ret.athena_fmt);
			}
		});
	}

	//--------------------------------------------------
	// Update a component via a deployer request (can update fabric versions or resources)
	//--------------------------------------------------
	app.put('/api/saas/v1/components/:athena_component_id', t.middleware.verify_create_action_session, (req, res) => {
		update(req, res);
	});
	const ak_component_urls = [
		'/ak/api/v1/kubernetes/components/:athena_component_id',
		'/ak/api/v1/kubernetes/components/ca/:athena_component_id',
		'/ak/api/v1/kubernetes/components/orderer/:athena_component_id',
		'/ak/api/v1/kubernetes/components/peer/:athena_component_id',
		'/ak/api/v1/kubernetes/components/fabric-ca/:athena_component_id',				// more alternates...
		'/ak/api/v1/kubernetes/components/fabric-orderer/:athena_component_id',
		'/ak/api/v1/kubernetes/components/fabric-peer/:athena_component_id',
	];
	app.put(ak_component_urls, t.middleware.verify_create_action_ak, (req, res) => {
		update(req, res);
	});

	function update(req, res) {
		t.ot_misc.legacy_warning(req);
		t.deployer.update_component(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				res.status(200).json(ret.athena_fmt);
			}
		});
	}

	//--------------------------------------------------
	// Get deployer data on a component - via a deployer request
	//--------------------------------------------------
	app.get('/api/saas/v1/components/:athena_component_id', t.middleware.verify_view_action_session_dep, (req, res) => {
		get_comp_data(req, res);
	});
	app.get('/ak/api/v1/kubernetes/components/:athena_component_id', t.middleware.verify_view_action_ak_dep, (req, res) => {
		get_comp_data(req, res);
	});

	function get_comp_data(req, res) {
		t.ot_misc.legacy_warning(req);
		req._include_deployment_attributes = true;
		req._include_parsed_certs = true;

		t.deployer.get_component_data(req, (errObj, data) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				const raw_data = {
					deployer_data: data.deployer_data,
					component_doc: data.athena_doc,
				};
				res.status(200).json(t.comp_fmt.fmt_comp_resp_with_deployer(req, raw_data));
			}
		});
	}

	return app;
};
