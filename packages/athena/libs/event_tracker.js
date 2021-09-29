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
// A event tracker middleware - api tracking (this is a unified place to handle segment + IBM activity tracker + athena-notifications)
//=======================================================================================================
module.exports = (logger, ev, t) => {
	const exports = {};

	// --------------------------------------------------
	// track this request - [middleware syntax] (it "intercepts" the response by temporarily overriding the outgoing http method)
	// --------------------------------------------------
	exports.trackViaIntercept = (req, res, next) => {
		const end = res.end;														// store the real end(), going to put it back later
		const json = res.json;														// store the real json(), going to put it back later
		let sent = null;

		res.json = (obj) => {														// intercept the "json" method to grab the response data
			sent = obj;																// get a handle on the json we will be sending back
			res.json = json;														// put her back
			res.json(obj);															// now call it to let the real one go
		};

		res.end = (chunk, encoding) => {											// intercept the "end" method to catch when the request ended
			res.end = end;															// put her back
			res.end(chunk, encoding);												// let the real one go (http response should be sending now)
			track_event(req, res, sent);											// do tracking at the very end, api already responded
		};

		return next();																// intercepts are set, return to next middleware
	};

	// decide if activity tracker is enabled
	function activity_tracker_enabled() {
		return ev.ACTIVITY_TRACKER_PATH;
	}

	//-------------------------------------------------------------
	// build & send the event for each thing
	//-------------------------------------------------------------
	const track_event = (req, res, json_resp) => {

		// send to segment lib to track w/api
		if (ev.SEGMENT_WRITE_KEY) {
			if (!t.ot_misc.is_error_code(res.statusCode)) {							// segment is only tracking success activity
				if (req.path.indexOf('/components' >= 0)) {							// segment is only tracking component activity
					t.segment_lib.track_api(req, res, json_resp, () => { });
				}
			}
		}

		// send to notification lib to track w/db doc
		if (Array.isArray(req._notifications) && req._notifications.length > 0) {	// only build athena notifications for some events
			t.notifications.end_procrastination(req, res);
		}

		// send to activity tracker to track w/log
		if (activity_tracker_enabled() && t.activity_tracker.ignore_req(req, res) === false) {
			t.activity_tracker.track_api(req, res, json_resp);
		}

		// send it to the lockout lib to see if we should stop accepting requests from this client
		t.lockout.track_api(req, res);
	};

	//-------------------------------------------------------------
	// log the current state of event tracker
	//-------------------------------------------------------------
	if (ev.SEGMENT_WRITE_KEY) {
		logger.info('[event tracker] enabled segment tracking of APIs');
	} else {
		logger.info('[event tracker] disabled segment tracking of APIs');
	}
	if (activity_tracker_enabled()) {
		logger.info('[event tracker] enabled logging for activity tracker:', ev.ACTIVITY_TRACKER_PATH);
	} else {
		logger.info('[event tracker] disabled logging for activity tracker');
	}

	return exports;
};
