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
// activity_tracker_lib.js - Library functions for generating Activity Tracker events
// IBM Cloud doc: https://test.cloud.ibm.com/docs/service-framework?topic=service-framework-architecture-arch-
// Getting started doc: https://test.cloud.ibm.com/docs/services/Activity-Tracker-with-LogDNA?topic=logdnaat-getting-started#getting-started
// Old Event format spec: https://test.cloud.ibm.com/docs/services/Activity-Tracker-with-LogDNA?topic=logdnaat-ibm_event_fields
// New Event format spec: https://test.cloud.ibm.com/docs/observability?topic=observability-at_req_fields
// test validator: http://eventlinter.mybluemix.net/
//------------------------------------------------------------

module.exports = function (logger, ev, t) {
	const exports = {};
	const routes_2_ignore = prepare_routes_2_ignore();									// array of regular expressions of paths to ignore
	const AT_FILENAME = 'activity.log';
	const AT_FILENAME_ROTATED = 'activity1.log';
	const path2file = ev.ACTIVITY_TRACKER_PATH ? t.path.join(ev.ACTIVITY_TRACKER_PATH, AT_FILENAME) : '';
	let atLogger = {};

	// init the log file
	if (ev.ACTIVITY_TRACKER_PATH && path2file) {
		t.misc.check_dir_sync({ file_path: path2file, create: true });					// check if the path exists, create it if not
		if (!t.fs.existsSync(path2file)) {
			try {
				t.fs.writeFileSync(path2file, '');										// init file
				logger.debug('[activity tracker] init log file:', path2file);
			} catch (e) {
				logger.error('[activity tracker] unable to write log file:', path2file);
				logger.error(e);
			}
		}

		// build symbolic links if activity tracker log files are outside the athena log folder
		build_sym_links();

		// make a winston logger for the activity tracker logs
		atLogger = new (t.winston.Logger)({
			level: 'debug',
			transports: [
				new t.winston.transports.File({
					filename: path2file,
					maxsize: 1024 * 1024 * 1,		// unsure of size, we want it smaller than logDNA's rotate, dsh todo
					maxFiles: 2,					// only need bare minimum to rotate (2 files)
					tailable: true,
					colorize: false,
					maxRetries: 10,
					json: true,						// I _believe_ AT requires JSON logs
					timestamp: function () {
						return undefined;
					},
				}),
			]
		});
	}

	//-------------------------------------------------------------
	// build & track the event for activity tracker - (events are http requests but its not all requests, just the ones we want)
	//-------------------------------------------------------------
	exports.track_api = (req, res, json_resp) => {
		if (ev.ACTIVITY_TRACKER_PATH) {
			const at_event = build_event(req, res, json_resp);	// create event, strict format!
			logger.debug('[activity tracker] generated event for req:', t.ot_misc.buildTxId(req));
			atLogger.info(at_event);							// track the event by logging it to this file, logDNA will pick up file and send onward
			return at_event;									// return it for tests
		}
		return null;
	};

	// ------------------------------------------
	// build a activity tracker event JSON that their validator can stomach w/o shitting the bed
	// ------------------------------------------
	const build_event = function (req, res, json_resp) {
		const first_notification = (Array.isArray(req._notifications) && req._notifications[0]) ? req._notifications[0] : {};
		const authTypeMap = {							// map athena auth types to available activity tracker credential.type strings
			bearer: 'token',
			apikey: 'apikey',
			basic: 'user',
			signature: 'certificate',
			session: 'user'
		};
		const bulk_api = (Array.isArray(req._notifications) && req._notifications.length > 1) ? 'bulk' : null;

		let ip = t.misc.format_ip(req.ip, false);		// must be an ip,
		if (!ip || ip === 'localhost' || ip === '127.0.0.1') {	// god forbid if this says localhost, the event will be rejected and lost
			ip = '169.1.1.1'; //'127.0.0.1';			// switch it to anything else so event is not lost. wtf is wrong with this tool, it won't accept 127*
		}
		const httpCode = get_code(req, res);			// get code from either athena's http response, or if its a client event, from the body

		// format the action = <service name>.<object descriptor>.<action verb>
		const action_str = formatAction(req);
		const actionParts = action_str.split('.');												// split the 3 words up
		const resource = (actionParts && actionParts[1]) ? actionParts[1] : '-';				// get the middle word
		const verb = (actionParts && actionParts[2]) ? actionParts[2] : '-';					// get the far right word
		const resource_id = (req._client_event && req.params && req.params.resource_id) ? req.params.resource_id : null;

		// this object structure is a mess - the format is super strict, wordy, and dumb
		const ret = {

			// [required] - <service name>.<object descriptor>.<action verb>
			action: action_str,

			// [optional] id to identity this event (across services) (not really applicable for us)
			correlationId: t.ot_misc.buildTxId(req),

			// [optional] set to true if the event reads or modifies resource data, false if.. I have no idea what the description in the companion doc means
			dataEvent: (req.method === 'POST' || req.method === 'DELETE'),

			// [optional] this field is undocumented... i think it can be anything
			id: t.ot_misc.buildTxId(req),

			// [required] - assuming all nested fields all required (doc doesn't mention it)
			initiator: {

				// the ibm id - usually starts with "IBMid-" prefix, the doc recommends the "iam_id" field in access_token
				// (should not require a login session)
				id: t.middleware.getIamId(req) || '-',

				// the username - doc recommends "sub" field in access_token
				// (should not require a login session)
				name: t.middleware.getIamSub(req) || t.middleware.getName(req) || '-', // the "sub" is an email for me

				// id of user that logged into ibm cloud
				// (will require a login session)
				authnId: t.middleware.getUuid(req) || '-',

				// username of user that logged into ibm cloud
				// (will require a login session)
				authnName: t.middleware.getName(req) || '-',

				// string describing how the initiator has access to do this request - must be 1 of the supported strings in doc
				typeURI: 'service/security/account/user',

				// the type of credentials that were provided - options: "token", "user", "apikey", "certificate", "public-access"
				credential: {
					type: authTypeMap[t.middleware.getAuthType(req)] || 'public-access'
				},

				host: {

					// useragent of browser
					agent: req.headers ? req.headers['user-agent'] : undefined,

					// the ip of the initiator of this request (aka user)
					address: ip,

					// valid values IPv4, IPv6, CSE
					addressType: 'IPv4'
				}
			},

			// [optional] IBM Cloud CRN string, including account id and service instance id
			logSourceCRN: ev.CRN_STRING,

			// [optional] complicated string about the event
			message: '', 						// populated below

			// [optional] custom data defined by service - required for events that modify resources. adds data to clarify this event.
			requestData: {
				method: req.method,
				originalUrl: req.originalUrl,
			},

			// [optional] custom data defined by service. adds data to clarify this event.
			responseData: {
				notifications: req._notifications,
				client_details: (req._client_event && req.body && req.body.client_details) ? req.body.client_details : undefined,
				response: t.ot_misc.is_error_code(httpCode) ? json_resp : undefined,		// include error response
			},

			// [required] meaningless hard coded string
			observer: {
				name: 'ActivityTracker'			// hard coded to meet spec
			},

			// [required] result of the action
			outcome: t.ot_misc.is_error_code(httpCode) ? 'failure' : 'success',

			// [required] http stuff
			reason: {

				// [optional]
				reasonCode: httpCode,

				// [required]
				reasonType: t.ot_misc.is_error_code(httpCode) ? 'NOT OK' : 'OK',		// they said I could set any message...

				// [?]
				reasonForFailure: build_failure_msg(httpCode),
			},

			// [optional] if true a copy of the event will be set in the service's account (ambiguous if this means the service instance or the service owner)
			saveServiceCopy: true,

			// [optional] valid values are "normal", "warning", and "critical"
			severity: first_notification.severity || 'normal',

			// [required]
			target: {
				id: build_obj_crn_str((first_notification.type || resource), (first_notification.component_id || resource_id), bulk_api),
				name: get_target_name(req, first_notification),
				typeURI: (req._client_event === true) ? formatActionURiClient(resource) : formatActionURI(req),

				// [optional]
				//alias : undefined,
			},

			// [optional] UTC time of the event - YYYY-MM-DDTHH:mm:ss.SS+0000
			// I have no idea why, but the activity tracker validator rejects my events if this is not last, wtf man
			eventTime: t.misc.formatDate(Date.now(), '%Y-%M-%dT%H:%m:%s.%R+0000'),
		};

		// message is a ridiculous field (excessively complex and duplicate information)
		// doc on structure: https://test.cloud.ibm.com/docs/services/Activity-Tracker-with-LogDNA?topic=logdnaat-ibm_event_fields#message
		const target_name = ret.target.name === '-' ? '' : (' ' + ret.target.name);			// don't include target.name if is not known
		const outcome = ret.outcome === 'success' ? '' : (' -' + ret.outcome);				// don't include outcome if its success

		// format:      "serviceName: actionVerb actionObjectDescriptor targetName? -outcome?"
		ret.message = `${ev.STR.SERVICE_NAME}: ${verb} ${resource}` + target_name + outcome;

		return ret;
	};

	// build a failure message
	function build_failure_msg(httpCode) {
		if (httpCode === 400) {
			return 'Invalid request, bad input.';
		}
		if (httpCode === 403 || httpCode === 401) {
			// this is a hard coded sentence they want
			return 'Your access token is invalid or does not have the necessary permissions to perform this task.';
		}
		if (t.ot_misc.is_error_code(httpCode)) {
			return 'Could not process request.';
		}
		return undefined;
	}

	// get the status code from the http request if its a normal event (normal athena api)
	// else get it from the body if its a client event (apollo generated event)
	function get_code(req, res) {
		if (req._client_event === true && req.body) {
			return !isNaN(req.body.http_code) ? Number(req.body.http_code) : 500;
		} else {
			return t.ot_misc.get_code(res);								// normal requests end up here
		}
	}

	// return the component display name if we have it
	// else get the last path in the URL
	function get_target_name(req, first_notification) {
		if (first_notification && first_notification.component_display_name) {	// display name is what we want
			return first_notification.component_display_name;
		} else if (req._component_display_name) {								// raw name is okay
			return req._component_display_name;
		} else if (first_notification && first_notification.component_id) {		// component id is okay
			return first_notification.component_id;
		} else {
			return get_last_word_in_path(req);									// default. grab the resource from URL path
		}
	}

	// get the last word in the URL  (so "/api/v[123]/logs" -> "logs")
	function get_last_word_in_path(req) {
		const parts = req.path ? req.path.split('/') : [];					// grab the last word in the request's path
		return parts[parts.length - 1] || '-';								// return '-' when we can't find it
	}

	// build a detailed crn string for this event - resource_id can be null
	function build_obj_crn_str(resource_type, resource_id, bulk) {
		if (bulk) {
			return ev.CRN_STRING = 'crn:' + ev.CRN.version +
				':' + ev.CRN.c_name +
				':' + ev.CRN.c_type +
				':' + ev.CRN.service_name +
				':' + ev.CRN.location +
				':' + ev.CRN.account_id +
				':' + ev.CRN.instance_id +
				':bulk' +												// type
				':';													// there is no id
		} else {
			return ev.CRN_STRING = 'crn:' + ev.CRN.version +
				':' + ev.CRN.c_name +
				':' + ev.CRN.c_type +
				':' + ev.CRN.service_name +
				':' + ev.CRN.location +
				':' + ev.CRN.account_id +
				':' + ev.CRN.instance_id +
				':' + simpleStr(resource_type).toLowerCase() +						// type
				':' + (resource_id ? simpleStr(resource_id) : '').toLowerCase();	// leave component id off if we don't have it
		}
	}

	// sanitize the string so activity tracker can handle it
	function simpleStr(str) {
		return (typeof str === 'string') ? str.replace(/[^\w-]/g, '') : '-';
	}

	// get the first iam action on the request
	function getFirstAction(req) {
		return Array.isArray(req.actions) ? req.actions[0] : null;		// pull the first iam action on the request. its always an array of 1.
	}

	// format the activity action according to the doc
	// this is kind of bullshit, the iam action needs to be translated to an activity tracker action.
	// activity tracker actions have a white list of supported verbs (verb is the last word in the action string)
	// https://test.cloud.ibm.com/docs/services/Activity-Tracker-with-LogDNA?topic=logdnaat-ibm_event_fields#action
	function formatAction(req) {
		const iam_action = getFirstAction(req);							// get the iam action on the request

		if (req._client_event === true) {
			const resource = (req.params && req.params.resource) ? simpleStr(req.params.resource) : '-';
			const verb = (req.body && req.body.action_verb) ? req.body.action_verb : pickVerb(req);
			const str = ev.STR.SERVICE_NAME + '.' + resource + '.' + verb;
			return str.toLowerCase();
		} else {
			let str = '';												// populated below
			if (!iam_action) {											// no action b/c its public
				str = get_last_word_in_path(req) + '.' + pickVerb(req);
			} else if (iam_action === ev.STR.CREATE_ACTION) {
				str = 'components.create';
			} else if (iam_action === ev.STR.DELETE_ACTION) {
				str = 'components.delete';
			} else if (iam_action === ev.STR.REMOVE_ACTION) {
				str = 'components.remove';
			} else if (iam_action === ev.STR.IMPORT_ACTION) {
				str = 'components.import';
			} else if (iam_action === ev.STR.EXPORT_ACTION) {
				str = 'components.export';
			} else if (iam_action === ev.STR.RESTART_ACTION) {
				if (req && req.path.includes('/sessions')) {
					str = 'sessions.delete';
				} else if (req && req.path.includes('/cache')) {
					str = 'cache.delete';
				} else {
					str = 'ibp_console.start';
				}
			} else if (iam_action === ev.STR.LOGS_ACTION) {
				str = 'logs.read';
			} else if (iam_action === ev.STR.VIEW_ACTION) {
				if (req && req.path.includes('/notifications')) {
					str = 'notifications.read';
				} else if (req && req.path.includes('/signature_collections')) {
					str = 'signature_collections.read';
				} else if (req && req.path.includes('/components')) {
					str = 'components.read';
				} else {
					str = 'ibp_console.read';
				}
			} else if (iam_action === ev.STR.SETTINGS_ACTION) {
				str = 'ibp_console.' + pickVerb(req);
			} else if (iam_action === ev.STR.USERS_ACTION) {
				str = 'users.' + pickVerb(req);
			} else if (iam_action === ev.STR.API_KEY_ACTION) {
				str = 'api_keys.' + pickVerb(req);
			} else if (iam_action === ev.STR.NOTIFICATIONS_ACTION) {
				if (req && req.path.includes('/bulk')) {
					str = 'notifications.delete';
				} else {
					str = 'notifications.' + pickVerb(req);
				}
			} else if (iam_action === ev.STR.SIG_COLLECTION_ACTION) {
				str = 'signature_collections.' + pickVerb(req);
			} else if (iam_action === ev.STR.C_MANAGE_ACTION) {
				if (req && req.path.includes('/actions')) {
					str = 'components.configure';
				} else {
					str = 'components.' + pickVerb(req);
				}
			} else {
				logger.warn('[act track] unknown iam action, please add it to activity_tracker_lib:', iam_action, req.actions);
				str = 'unknown.' + pickVerb(req);
			}

			// end format is <service name>.<object descriptor>.<action verb>
			return (ev.STR.SERVICE_NAME + '.' + str).toLowerCase();			// pre-append the service name and we are done
		}

		// pick a action verb from the request method for this crud call
		function pickVerb(req) {
			const methodMap = {
				GET: 'read',
				DELETE: 'delete',
				POST: 'create',
				PUT: 'update',
				PATCH: 'configure',
				HEAD: 'connect',
				OPTIONS: 'allow',
				VIEW: 'monitor',
			};

			if (req.method && methodMap[req.method]) {
				return methodMap[req.method];
			} else {
				return 'monitor';
			}
		}
	}

	// format the action URI according to the doc
	// https://test.cloud.ibm.com/docs/services/Activity-Tracker-with-LogDNA?topic=logdnaat-ibm_event_fields#target.typeURI
	function formatActionURI(req) {
		const str = getFirstAction(req);
		if (str) {
			const parts = str.split('.');
			if (parts && parts.length >= 2) {
				return (parts[0] + '/' + parts[1]).toLowerCase();
			}
		}
		return ev.STR.SERVICE_NAME + '/' + get_last_word_in_path(req);			// fallback
	}

	// format the action URI for a client event
	function formatActionURiClient(resource) {
		return (ev.STR.SERVICE_NAME + '/' + resource).toLowerCase();
	}

	//-------------------------------------------------------------
	// do not track some requests
	//-------------------------------------------------------------
	exports.ignore_req = (req, res) => {
		const exceptions = [								// we want to track login and logout requests
			ev.LOGIN_URI,
			ev.LOGOUT_URI,
		];
		if (req && req.path) {								// use req.path instead of req.url, path omits query params

			// ignore UI GET methods - sometimes
			if (req.method === 'GET' && (req.path.indexOf('/api/') === 0 || req.path.indexOf('/deployer/') === 0)) {
				if (!exceptions.includes(req.path)) {
					return true;							// ignore GET requests from the UI - too noisy
				}
			}

			// ignore redirects - sometimes
			if (res.statusCode === 302) {
				if (!exceptions.includes(req.path)) {		// don't ignore login/logout redirects
					return true;
				}
			}

			// ignore noisy routes
			for (let i in routes_2_ignore) {
				if (RegExp(routes_2_ignore[i]).test(req.path)) {
					return true;
				}
			}
		}
		return false;
	};

	//-------------------------------------------------------------
	// make regex from express route syntax on routes we don't want tracked
	// (warning - this is not method specific)
	//-------------------------------------------------------------
	function prepare_routes_2_ignore() {
		const ignore_routes = [														// add noisy/useless event routes here
			'/api/v[123]/proxy',
			'/grpcwp/*',
			'/configtxlator/*',
			'/api/v[123]/components/status',
			'/api/v1/logs',
		];
		const ret = [];
		for (let i in ignore_routes) {												// if path ends with an optional param, make two paths, 1 without and 1 with
			if (ignore_routes[i][ignore_routes[i].length - 1] === '?') {			// must be an optional param at the end of the route
				ret.push(ignore_routes[i].replace(/\/:[^/]+\?/g, ''));
			}
			let reg = ignore_routes[i];
			reg = reg.replace(/:[^/]+/g, '.+');										// replace wildcard word express syntax
			reg = reg.replace(/\*/g, '.*');											// replace wildcard express syntax
			reg = reg.replace(/\$/g, '\\$');										// replace any literal $ characters with escape char
			ret.push('^' + reg + '$');
		}
		return ret;
	}

	//-------------------------------------------------------------
	// build symbolic links in the log folder to the activity tracker files (iff the activity file is outside our log folder)
	//-------------------------------------------------------------
	function build_sym_links() {
		const log_folder = t.log_lib.get_log_path();
		if (!path2file.includes(log_folder)) {										// test if this file is outside the log folder
			build_link(t.path.join(ev.ACTIVITY_TRACKER_PATH, AT_FILENAME));
			build_link(t.path.join(ev.ACTIVITY_TRACKER_PATH, AT_FILENAME_ROTATED));
		}

		function build_link(pathToFile) {
			if (t.fs.existsSync(pathToFile)) {										// build the link if the file exists
				const file_name = t.path.basename(pathToFile);						// get the filename from the path
				try {
					const path2link = t.path.join(log_folder, file_name);
					t.fs.symlink(pathToFile, path2link, 'file', err => {
						logger.debug('[activity tracker] symbolic link created', path2link);
					});
				} catch (e) {
					logger.error('[activity tracker] unable to create symbolic link:', pathToFile);
					logger.error(e);
				}
			}
		}
	}

	return exports;
};
