
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
//=======================================================================================================
// Track api auth failures and lockout client if too many occur - uses a rolling window
//=======================================================================================================
module.exports = function (logger, ev, t) {
	const lockout = {};
	let failures = {};												// keep track of all failures here
	const options = {
		reset_window_ms: 1000 * 60 * 2,								// api auth failures older than this are ignored
		lockout_limit: ev.LOCKOUT_LIMIT,							// once this athena see's this many failures, it reject further reqs from the client
	};

	// ----------------------------------------
	// Track api auth failures for client
	// ----------------------------------------
	lockout.track_api = function (req, res) {
		const key = make_key(req);

		if (res && (res.statusCode === 401 || res.statusCode === 403)) {
			if (options.lockout_limit >= 1) {						// -1 means lockout is disabled
				add_failure(key);									// now add our latest failure
				logger.warn('[lockout]', req._tx_id, 'incrementing count towards a lockout:', failures[key].timestamps.length + '/' + options.lockout_limit);
			}
		}
		if (res && !t.ot_misc.is_error_code(res.statusCode)) {
			if (failures[key] && failures[key].timestamps && failures[key].timestamps.length > 0) {
				failures[key] = {
					timestamps: []									// reset failures dictionary with client's key
				};
				logger.debug('[lockout]', req._tx_id, 'resetting count towards a lockout:', failures[key].timestamps.length + '/' + options.lockout_limit);
			}
		}
	};

	// ----------------------------------------
	// Reject api if lockout is reached
	// ----------------------------------------
	lockout.reject_if_exceeded = function (req, res, next) {
		const key = make_key(req);

		if (failures[key] && failures[key].timestamps && failures[key].timestamps.length > 0) {
			failures[key].timestamps = prune_failures(failures[key].timestamps);	// prune out old ones

			if (failures[key].timestamps.length >= options.lockout_limit) {
				logger.error('[lockout] limit reached', req._tx_id, failures[key].timestamps.length + '/' + options.lockout_limit);
				add_failure(key);													// add another failure
				return res.status(402).json({
					error: 'too many auth failures. client is locked out. try again in ' + t.misc.friendly_ms(options.reset_window_ms),
					failures: failures[key].timestamps.length - 1,
				});
			}
		}

		return next();
	};

	// ----------------------------------------
	// Getter - added for testing
	// ----------------------------------------
	lockout.get_failures = function () {
		return failures;
	};

	// ----------------------------------------
	// Setter - added for testing
	// ----------------------------------------
	lockout.reset = function () {
		failures = {};
	};

	// add a failure record
	function add_failure(client_key) {
		if (!failures[client_key]) {
			failures[client_key] = {
				timestamps: []													// init failures dictionary with client's key
			};
		}
		failures[client_key].timestamps.push(Date.now());
	}

	// remove past failures that are too old
	function prune_failures(failed_apis_ts) {
		let keep = [];

		if (Array.isArray(failed_apis_ts)) {
			failed_apis_ts.sort((a, b) => { return b - a; });						// sort to descending order to keep the newest if we have excessive entries

			for (let i in failed_apis_ts) {
				if ((Date.now() - failed_apis_ts[i]) <= options.reset_window_ms) {	// auth failures younger than this still count, skip the rest
					keep.push(failed_apis_ts[i]);									// still good, copy it forward
				}

				if (keep.length >= options.lockout_limit * 4) {
					break;															// we have more than enough, stop
				}
			}
		}
		return keep;
	}

	// make a key to identify this client
	// ip is not good enough b/c in saas it will probably always be an internal ip
	function make_key(req) {
		const ip = t.misc.format_ip(req ? req.ip : '', false);
		return ip + req.headers['user-agent'];									// same id/key used by our rate limiter
	}

	// prune all the failures every few hours (not needed, but seems like a good idea)
	setInterval(() => {
		for (let key in failures) {
			if (failures[key] && failures[key].timestamps) {
				failures[key].timestamps = prune_failures(failures[key].timestamps);
			}
		}
	}, 1000 * 60 * 60 * 24);		// very slow interval

	return lockout;
};
