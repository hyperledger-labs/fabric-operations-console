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
// notification_apis_lib.js - notification apis functions
//------------------------------------------------------------
module.exports = function (logger, ev, t) {
	const exports = {};

	//--------------------------------------------------
	// List all notifications
	//--------------------------------------------------
	/*
	* req: {}  // request object
	*/
	exports.list_all_notifications = (req, cb) => {
		const url_parts = typeof req.url === 'string' ? t.url.parse(req.url, true) : null;
		let opts = null;
		if (url_parts && url_parts.query) {
			opts = url_parts.query;					// pass all query params directly into options
		}
		opts.SKIP_CACHE = t.ot_misc.skip_cache(req);

		t.notifications.get(opts, (err, resp) => {
			if (err) {
				logger.error('[notification apis] - could not get notifications', err);
				err.statusCode = err.statusCode ? err.statusCode : 500;
				return cb(err);
			} else {
				return cb(null, resp);
			}
		});
	};

	//--------------------------------------------------
	// Delete all notifications
	//--------------------------------------------------
	/*
	* req: {}  // request object
	*/
	exports.delete_all_notifications = (req, cb) => {

		// build a notification doc
		const notice = { message: 'deleting all notifications' };
		t.notifications.procrastinate(req, notice);

		t.notifications.purge((err, resp) => {
			if (err) {
				logger.error('[notification apis] - could not delete all notifications', err);
				err.statusCode = err.statusCode ? err.statusCode : 500;
				return cb(err);
			} else {
				const ret = {
					message: 'ok',
					details: resp,
				};
				return cb(null, ret);
			}
		});
	};

	//--------------------------------------------------
	// Archive notifications
	//--------------------------------------------------
	/*
	* req: {}  // request object
	*/
	exports.archive_notification_docs = (req, cb) => {

		// build a notification doc
		const notice = { message: 'archiving notifications' };
		t.notifications.procrastinate(req, notice);

		t.notifications.archive_db_notifications(req.body.notification_ids, (err, res) => {
			if (err) {
				logger.error('[notification apis] - could not archive notifications', err);
				err.statusCode = err.statusCode ? err.statusCode : 500;
				return cb(err);
			} else {
				const ret = {
					message: 'ok',
					details: res,
				};
				return cb(null, ret);
			}
		});
	};

	return exports;
};
