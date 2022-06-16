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
// Performance API Routes - used to debug performance issues on host machine
//------------------------------------------------------------

module.exports = function (logger, ev, t) {
	const app = t.express.Router();

	//--------------------------------------------------
	// Test performance with static string
	//--------------------------------------------------
	app.get('/api/v[23]/performance/1', t.middleware.verify_view_action_session, (req, res) => {
		req._start = Date.now();
		t.perf.static_test(req, res);
	});

	app.get('/ak/api/v[23]/performance/1', t.middleware.verify_view_action_ak, (req, res) => {
		req._start = Date.now();
		t.perf.static_test(req, res);
	});

	//--------------------------------------------------
	// Test performance with large random string
	//--------------------------------------------------
	app.get('/api/v[23]/performance/2/:len?', t.middleware.verify_view_action_session, (req, res) => {
		req._start = Date.now();
		t.perf.random_test(req, res);
	});

	app.get('/ak/api/v[23]/performance/2/:len?', t.middleware.verify_view_action_ak, (req, res) => {
		req._start = Date.now();
		t.perf.random_test(req, res);
	});

	//--------------------------------------------------
	// Test performance with large random string
	//--------------------------------------------------
	app.get('/api/v[23]/performance/3/:len?', t.middleware.verify_view_action_session, (req, res) => {
		req._start = Date.now();
		t.perf.random_sorted_test(req, res);
	});

	app.get('/ak/api/v[23]/performance/3/:len?', t.middleware.verify_view_action_ak, (req, res) => {
		req._start = Date.now();
		t.perf.random_sorted_test(req, res);
	});

	//--------------------------------------------------
	// Test performance writing to disk
	//--------------------------------------------------
	app.get('/api/v[23]/performance/4/:len?', t.middleware.verify_view_action_session, (req, res) => {
		req._start = Date.now();
		t.perf.disk_write(req, res);
	});

	app.get('/ak/api/v[23]/performance/4/:len?', t.middleware.verify_view_action_ak, (req, res) => {
		req._start = Date.now();
		t.perf.disk_write(req, res);
	});

	//--------------------------------------------------
	// Test performance reading from disk
	//--------------------------------------------------
	app.get('/api/v[23]/performance/5', t.middleware.verify_view_action_session, (req, res) => {
		req._start = Date.now();
		t.perf.disk_read(req, res);
	});

	app.get('/ak/api/v[23]/performance/5', t.middleware.verify_view_action_ak, (req, res) => {
		req._start = Date.now();
		t.perf.disk_read(req, res);
	});

	//--------------------------------------------------
	// Clean up disk tests by deleting the file
	//--------------------------------------------------
	app.delete('/api/v[23]/performance/4', t.middleware.verify_view_action_session, (req, res) => {
		req._start = Date.now();
		t.perf.disk_clean(req, res);
	});

	app.delete('/ak/api/v[23]/performance/4', t.middleware.verify_view_action_ak, (req, res) => {
		req._start = Date.now();
		t.perf.disk_clean(req, res);
	});

	return app;
};
