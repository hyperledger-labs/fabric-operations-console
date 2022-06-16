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
// user_preferences_lib.js - user preferences functions
//------------------------------------------------------------
module.exports = function (logger, ev, t) {
	const exports = {};

	//--------------------------------------------------
	// Get user preferences
	//--------------------------------------------------
	/*
	* req: {}  // request object
	*/
	exports.get_user_preferences = (req, cb) => {

		// gather the properties that we need to read the doc
		const wr_opts = {
			_id: req.params.user_id,
			db_name: ev.DB_SYSTEM
		};

		// get the doc
		t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: wr_opts._id, SKIP_CACHE: true }, (err, resp) => {
			if (err) {
				err.backend_context = `problem getting the user preferences doc for ${wr_opts._id}`;
				logger.error('[user] unable to get user preferences doc', err);
				return cb(err);
			}
			return cb(null, resp);
		});
	};

	//--------------------------------------------------
	// Post user preferences
	//--------------------------------------------------
	/*
	* req: {}  // request object
	*/
	exports.post_user_preferences = (req, cb) => {

		// all fields optional except _id
		const body = {
			_id: req.params.user_id,
			email_notifications: req.body.email_notifications,
			auto_logout_interval: req.body.auto_logout_interval,
			preferences: req.body.preferences
		};

		// gather the properties that we need to read and write the doc
		const wr_opts = {
			_id: req.params.user_id,
			db_name: ev.DB_SYSTEM,
			doc: body
		};

		// check to see if the doc already exists - if so then get the _rev and update. otherwise create a new doc
		t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: wr_opts._id, SKIP_CACHE: true }, (err_prefsGet, resp_prefsGet) => {
			// an error here hopefully means that the doc doesn't exist yet
			if (err_prefsGet) {
				// doc didn't exist. we'll create it
				if (err_prefsGet.statusCode === 404) {
					// this is 'info' on purpose since this failure is expected if the doc is being written for the first time
					logger.info(`preferences doc for ${wr_opts._id} doesn't exist. attempting to write it to ${ev.DB_SYSTEM}`);

					writeDoc(wr_opts);
				} else {
					// there actually was a problem with the GET!!!
					err_prefsGet.backend_context = `problem getting preferences doc for ${wr_opts._id} in POST user/preferences route`;
					logger.error('[user] changing user preferences - failure', err_prefsGet);
					return cb(err_prefsGet);
				}
			} else {
				// we got the doc and we need to copy over the _rev so we can merge our properties with ones in the doc in the database
				logger.info(`attempting to update the user preferences for ${wr_opts._id}`);
				wr_opts.doc = mergeDoc(wr_opts.doc, resp_prefsGet);
				writeDoc(wr_opts);
			}
		});

		// merge doc and new properties
		function mergeDoc(wr_doc, db_doc) {
			for (const prop in wr_doc) {
				db_doc[prop] = wr_doc[prop];
			}
			return db_doc;
		}

		// actually write user preferences doc to the database
		function writeDoc(wr_opts) {
			t.otcc.writeDoc(wr_opts, wr_opts.doc, (err, resp) => {
				if (err) {
					err.backend_context = 'problem updating user preferences in the PUT /api/v1/user/preferences route';
					logger.error('[user] changing user preferences - failure', err);
					return cb(err);
				} else {
					logger.info('[user] changing user preferences - success');
					return cb(null, resp);
				}
			});
		}
	};
	return exports;
};
