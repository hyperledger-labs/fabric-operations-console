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
// Component Template API Routes
//------------------------------------------------------------

module.exports = (logger, ev, t) => {
	const app = t.express.Router();

	//--------------------------------------------------
	// Build each component in a template
	//--------------------------------------------------
	app.post('/api/v[123]/templates/build', t.middleware.verify_create_action_session, (req, res) => {
		t.template.build_template_and_respond(req, res);
	});
	app.post('/ak/api/v[123]/templates/build', t.middleware.verify_create_action_ak, (req, res) => {
		t.template.build_template_and_respond(req, res);
	});

	//--------------------------------------------------
	// Get all templates
	//--------------------------------------------------
	app.get('/api/v[123]/templates', t.middleware.verify_view_action_session_dep, (req, res) => {
		t.template.get_all_templates(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				res.status(200).json(ret);
			}
		});
	});
	app.get('/ak/api/v[123]/templates', t.middleware.verify_view_action_ak_dep, (req, res) => {
		t.template.get_all_templates(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				res.status(200).json(ret);
			}
		});
	});

	//--------------------------------------------------
	// Store a new template
	//--------------------------------------------------
	app.post('/api/v[123]/templates', t.middleware.verify_create_action_session, (req, res) => {
		t.template.store_template_doc(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				res.status(200).json(ret);
			}
		});
	});
	app.post('/ak/api/v[123]/templates', t.middleware.verify_create_action_ak, (req, res) => {
		t.template.store_template_doc(req, (errObj, ret) => {
			if (errObj) {
				res.status(t.ot_misc.get_code(errObj)).json(errObj);
			} else {
				res.status(200).json(ret);
			}
		});
	});

	return app;
};
